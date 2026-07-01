import azure.functions as func
import json
import os
import msal
import requests
import base64
import time
import threading
from datetime import datetime, timezone, timedelta

# ---------- cache (5 min TTL) ----------
_cache = {}
_cache_lock = threading.Lock()
CACHE_TTL = 300  # 5 minutes

def cache_get(key):
    with _cache_lock:
        entry = _cache.get(key)
        if entry and (time.time() - entry["ts"]) < CACHE_TTL:
            return entry["data"]
    return None

def cache_set(key, data):
    with _cache_lock:
        _cache[key] = {"data": data, "ts": time.time()}

def invalidate_cache():
    """Clear tagespost cache. Call after saving new posts."""
    with _cache_lock:
        _cache.clear()

# ---------- config ----------
TENANT_ID = os.environ.get("DV_TENANT_ID", "acfaedd4-c403-43b7-9544-fdb2b150124e")
CLIENT_ID = os.environ.get("DV_CLIENT_ID", "137b2df6-be83-459a-ac89-9efd0bdf51c4")
CLIENT_SECRET = os.environ.get("DV_CLIENT_SECRET", "")

SP_DRIVE = "b!bwUha0ab4EeiA3xXHK-Oobhv5tJbeYJDiF9pTB-f1kC-Mp-AY0brRrr2WigdYK4A"
SP_SOCIAL_FOLDER_NAME = "SocialMedia"
POSTS_FILE = "posts.json"
KATALOG_FILE = "katalog.json"
MITTAGSTISCH_BILDER_FILE = "mittagstisch-bilder.json"


def get_cors():
    return {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, OPTIONS",
        "Access-Control-Allow-Headers": "*",
        "Access-Control-Max-Age": "86400",
        "Content-Type": "application/json; charset=utf-8",
    }


def ok(data, code=200):
    return func.HttpResponse(
        json.dumps(data, ensure_ascii=False), status_code=code,
        mimetype="application/json", headers=get_cors(),
    )


def err(msg, code=400):
    return func.HttpResponse(
        json.dumps({"success": False, "error": msg}, ensure_ascii=False),
        status_code=code, mimetype="application/json", headers=get_cors(),
    )


def get_graph_token():
    if not CLIENT_SECRET:
        return None
    try:
        app = msal.ConfidentialClientApplication(
            CLIENT_ID,
            authority=f"https://login.microsoftonline.com/{TENANT_ID}",
            client_credential=CLIENT_SECRET,
        )
        r = app.acquire_token_for_client(scopes=["https://graph.microsoft.com/.default"])
        return r.get("access_token")
    except:
        return None


def graph_headers(token):
    return {"Authorization": f"Bearer {token}", "Accept": "application/json"}


def find_social_folder(token):
    h = graph_headers(token)
    url = f"https://graph.microsoft.com/v1.0/drives/{SP_DRIVE}/root/children?$filter=name eq '{SP_SOCIAL_FOLDER_NAME}'&$select=id,name,folder"
    r = requests.get(url, headers=h, timeout=15)
    if r.status_code == 200:
        for child in r.json().get("value", []):
            if child.get("folder") is not None:
                return child["id"]
    return None


def load_json_file(token, folder_id, filename):
    h = graph_headers(token)
    url = f"https://graph.microsoft.com/v1.0/drives/{SP_DRIVE}/items/{folder_id}:/{filename}:/content"
    r = requests.get(url, headers=h, timeout=15)
    if r.status_code == 200:
        try:
            return json.loads(r.text)
        except:
            pass
    return None


def load_posts(token, folder_id):
    return load_json_file(token, folder_id, POSTS_FILE) or []


def download_as_data_uri(url, max_width=200):
    """Download an image URL, resize to thumbnail, return as base64 data URI."""
    if not url or url.startswith("data:"):
        return url or ""
    try:
        r = requests.get(url, timeout=10)
        if r.status_code == 200:
            img_bytes = r.content
            try:
                from PIL import Image
                import io
                img = Image.open(io.BytesIO(img_bytes))
                if img.width > max_width:
                    ratio = max_width / img.width
                    new_h = int(img.height * ratio)
                    img = img.resize((max_width, new_h), Image.LANCZOS)
                if img.mode in ("RGBA", "P"):
                    img = img.convert("RGB")
                buf = io.BytesIO()
                img.save(buf, format="JPEG", quality=60, optimize=True)
                img_bytes = buf.getvalue()
            except Exception:
                pass  # fallback: use original bytes
            b64 = base64.b64encode(img_bytes).decode("ascii")
            return f"data:image/jpeg;base64,{b64}"
    except:
        pass
    return ""


def get_download_url(token, folder_id, filename):
    h = graph_headers(token)
    url = f"https://graph.microsoft.com/v1.0/drives/{SP_DRIVE}/items/{folder_id}:/{filename}"
    r = requests.get(url, headers=h, timeout=15)
    if r.status_code == 200:
        return r.json().get("@microsoft.graph.downloadUrl", "")
    return ""


def merge_day_posts(day_posts):
    """Merge multiple posts from the same day into one combined post.
    Uses the newest post's titel/freitext, but combines all items (deduplicated)."""
    if not day_posts:
        return None
    if len(day_posts) == 1:
        return day_posts[0]

    # Sort newest first
    day_posts.sort(key=lambda p: p.get("datum", ""), reverse=True)
    merged = dict(day_posts[0])  # base: newest post

    # Collect all items from all posts, deduplicate by name
    seen_names = set()
    all_items = []
    for post in day_posts:
        for it in post.get("items") or []:
            name = (it.get("name") or "").strip().lower()
            if name and name not in seen_names:
                seen_names.add(name)
                all_items.append(it)
            elif not name:
                all_items.append(it)
    merged["items"] = all_items

    # Combine freitext if different
    freitexte = []
    seen_texts = set()
    for post in day_posts:
        ft = (post.get("freitext") or "").strip()
        if ft and ft not in seen_texts:
            seen_texts.add(ft)
            freitexte.append(ft)
    if len(freitexte) > 1:
        merged["freitext"] = "\n\n".join(freitexte)

    return merged


def resize_data_uri(data_uri, max_width=200):
    """Shrink an existing data: URI image to thumbnail size."""
    try:
        from PIL import Image
        import io
        # Parse data:image/jpeg;base64,xxxxx
        header, b64data = data_uri.split(",", 1)
        img_bytes = base64.b64decode(b64data)
        img = Image.open(io.BytesIO(img_bytes))
        if img.width <= max_width:
            return data_uri  # already small enough
        ratio = max_width / img.width
        new_h = int(img.height * ratio)
        img = img.resize((max_width, new_h), Image.LANCZOS)
        if img.mode in ("RGBA", "P"):
            img = img.convert("RGB")
        buf = io.BytesIO()
        img.save(buf, format="JPEG", quality=60, optimize=True)
        b64 = base64.b64encode(buf.getvalue()).decode("ascii")
        return f"data:image/jpeg;base64,{b64}"
    except Exception:
        return data_uri


def enrich_post_images(post, token, folder_id):
    """Fill missing bild_url or convert non-data-URI bild_url to inline base64."""
    items = post.get("items")
    if not items:
        return

    # Compress oversized existing data: URIs (>50 KB)
    for it in items:
        bild = it.get("bild_url", "")
        if bild.startswith("data:") and len(bild) > 50000:
            it["bild_url"] = resize_data_uri(bild)

    # Items that need image enrichment: no bild_url, or bild_url is a
    # SharePoint/HTTP URL (not a data: URI) which expires and won't load
    # on external clients like mobile browsers.
    needs_images = [it for it in items
                    if not it.get("bild_url")
                    or (it.get("bild_url", "").startswith("http"))]
    if not needs_images:
        return

    # Build lookup maps from katalog and mt-bilder
    katalog_by_name = {}
    mt_bilder = {}
    try:
        katalog = load_json_file(token, folder_id, KATALOG_FILE) or []
        for k in katalog:
            if k.get("name"):
                katalog_by_name[k["name"].lower()] = k
    except:
        pass
    try:
        mt_bilder = load_json_file(token, folder_id, MITTAGSTISCH_BILDER_FILE) or {}
    except:
        pass

    for it in needs_images:
        name = (it.get("name") or "").strip()
        name_lower = name.lower()
        kat = (it.get("kategorie") or "").lower()
        bild_url = ""

        # 0) If item already has an HTTP URL, convert it to data URI directly
        existing = it.get("bild_url", "")
        if existing.startswith("http"):
            converted = download_as_data_uri(existing)
            if converted:
                it["bild_url"] = converted
                continue

        # 1) Try katalog match by name
        if name_lower in katalog_by_name:
            ki = katalog_by_name[name_lower]
            if ki.get("bild_datei"):
                dl = get_download_url(token, folder_id, ki["bild_datei"])
                if dl:
                    bild_url = download_as_data_uri(dl)

        # 2) Try mt-bilder match for Mittagessen
        if not bild_url and "mittag" in kat and name in mt_bilder:
            mi = mt_bilder[name]
            if mi.get("bild_datei"):
                dl = get_download_url(token, folder_id, mi["bild_datei"])
                if dl:
                    bild_url = download_as_data_uri(dl)

        if bild_url:
            it["bild_url"] = bild_url


def _build_response():
    """Build the tagespost response (expensive: Graph API + image downloads)."""
    token = get_graph_token()
    if not token:
        return None, "Graph-Token konnte nicht abgerufen werden"

    folder_id = find_social_folder(token)
    if not folder_id:
        return {"success": True, "post": None}, None

    posts = load_posts(token, folder_id)
    if not posts:
        return {"success": True, "post": None}, None

    # CET/CEST timezone (UTC+1 / UTC+2)
    try:
        from zoneinfo import ZoneInfo
        cet = ZoneInfo("Europe/Berlin")
    except:
        cet = timezone(timedelta(hours=2))  # fallback CEST

    now_local = datetime.now(cet)
    today = now_local.strftime("%Y-%m-%d")
    tomorrow = (now_local + timedelta(days=1)).strftime("%Y-%m-%d")
    current_hour = now_local.hour

    # Find published posts for today and tomorrow (exclude drafts)
    published = [p for p in posts if p.get("status", "veroeffentlicht") != "entwurf"]
    today_posts = [p for p in published if p.get("datum", "")[:10] == today]
    tomorrow_posts = [p for p in published if p.get("datum", "")[:10] == tomorrow]

    # Build today post
    today_post = None
    if today_posts:
        today_post = merge_day_posts(today_posts)
        enrich_post_images(today_post, token, folder_id)

    # Build tomorrow post
    tomorrow_post = None
    if tomorrow_posts:
        tomorrow_post = merge_day_posts(tomorrow_posts)
        enrich_post_images(tomorrow_post, token, folder_id)

    # After 18:00 (store closed), prefer tomorrow's post as primary
    if current_hour >= 18 and tomorrow_post:
        return {
            "success": True,
            "post": tomorrow_post, "is_tomorrow": True,
            "today_post": today_post, "tomorrow_post": tomorrow_post,
        }, None

    if not today_post and tomorrow_post:
        return {
            "success": True,
            "post": tomorrow_post, "is_tomorrow": True,
            "today_post": None, "tomorrow_post": tomorrow_post,
        }, None

    if not today_post and not tomorrow_post:
        return {"success": True, "post": None}, None

    return {
        "success": True,
        "post": today_post, "is_tomorrow": False,
        "today_post": today_post, "tomorrow_post": tomorrow_post,
    }, None


def main(req: func.HttpRequest) -> func.HttpResponse:
    if req.method == "OPTIONS":
        return func.HttpResponse(status_code=200, headers=get_cors())

    # Cache key: date + hour-bucket (before/after 18:00)
    try:
        from zoneinfo import ZoneInfo
        cet = ZoneInfo("Europe/Berlin")
    except:
        cet = timezone(timedelta(hours=2))
    now_local = datetime.now(cet)
    hour_bucket = "evening" if now_local.hour >= 18 else "day"
    cache_key = f"tagespost_{now_local.strftime('%Y-%m-%d')}_{hour_bucket}"

    # ?refresh=1 to force cache invalidation
    if req.params.get("refresh") == "1":
        invalidate_cache()
    else:
        cached = cache_get(cache_key)
        if cached is not None:
            return ok(cached)

    data, error = _build_response()
    if error:
        return err(error, 500)

    cache_set(cache_key, data)
    return ok(data)
