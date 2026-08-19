import azure.functions as func
import json
import os
import msal
import requests
import base64
import uuid
from datetime import datetime, timezone, timedelta

# ---------- config ----------
from shared.dataverse import get_tenant_id, get_client_id
TENANT_ID = get_tenant_id()
CLIENT_ID = get_client_id()
CLIENT_SECRET = os.environ.get("DV_CLIENT_SECRET", "")

SP_DRIVE = "b!bwUha0ab4EeiA3xXHK-Oobhv5tJbeYJDiF9pTB-f1kC-Mp-AY0brRrr2WigdYK4A"
SP_SOCIAL_FOLDER_NAME = "SocialMedia"
POSTS_FILE = "posts.json"


def get_cors():
    return {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, POST, PATCH, DELETE, OPTIONS",
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


def ensure_social_folder(token):
    h = graph_headers(token)
    url = f"https://graph.microsoft.com/v1.0/drives/{SP_DRIVE}/root/children?$filter=name eq '{SP_SOCIAL_FOLDER_NAME}'&$select=id,name,folder"
    r = requests.get(url, headers=h, timeout=15)
    if r.status_code == 200:
        for child in r.json().get("value", []):
            if child.get("folder") is not None:
                return child["id"]
    r2 = requests.post(
        f"https://graph.microsoft.com/v1.0/drives/{SP_DRIVE}/root/children",
        headers={**h, "Content-Type": "application/json"},
        json={"name": SP_SOCIAL_FOLDER_NAME, "folder": {}, "@microsoft.graph.conflictBehavior": "fail"},
        timeout=15,
    )
    if r2.status_code in (200, 201):
        return r2.json().get("id")
    return None


def load_posts(token, folder_id):
    h = graph_headers(token)
    url = f"https://graph.microsoft.com/v1.0/drives/{SP_DRIVE}/items/{folder_id}:/{POSTS_FILE}:/content"
    r = requests.get(url, headers=h, timeout=15)
    if r.status_code == 200:
        try:
            return json.loads(r.text)
        except:
            return []
    return []


def save_posts(token, folder_id, data):
    h = {**graph_headers(token), "Content-Type": "application/json"}
    url = f"https://graph.microsoft.com/v1.0/drives/{SP_DRIVE}/items/{folder_id}:/{POSTS_FILE}:/content"
    content = json.dumps(data, ensure_ascii=False, indent=2)
    r = requests.put(url, headers=h, data=content.encode("utf-8"), timeout=15)
    ok = r.status_code in (200, 201)
    if ok:
        # Invalidate tagespost cache so next request gets fresh data
        try:
            from tagespost import invalidate_cache
            invalidate_cache()
        except Exception:
            pass
    return ok


def upload_image(token, folder_id, filename, image_bytes, content_type="image/png"):
    h = {**graph_headers(token), "Content-Type": content_type}
    url = f"https://graph.microsoft.com/v1.0/drives/{SP_DRIVE}/items/{folder_id}:/{filename}:/content"
    r = requests.put(url, headers=h, data=image_bytes, timeout=30)
    if r.status_code in (200, 201):
        item = r.json()
        return item.get("@microsoft.graph.downloadUrl", ""), item.get("id", "")
    return None, None


# ---------- auto-push ----------

def _send_auto_push(req, post_titel, category="tagesinfo"):
    """Fire-and-forget push notification after publishing a post.

    Ruft den Versand IN-PROCESS auf (shared.push). Ein HTTP-Self-Call gegen die
    eigene oeffentliche /api/push-send-URL funktioniert in Azure Static Web Apps
    nicht zuverlaessig und wuerde still fehlschlagen.
    """
    try:
        from shared.urls import get_public_origin
        from shared.push import send_push_notification
        origin = get_public_origin(req)
        message = ("Die heutige TagesInfo ist da! Mittagstisch, Theke & mehr."
                   if category == "tagesinfo" else post_titel)
        send_push_notification(
            title=post_titel or "Dorfladen Oberornau",
            message=message,
            url="/tagesinfo",
            origin=origin,
            category=category,
            tag="dorfladen-tagesinfo",
        )
    except Exception:
        pass  # Push is best-effort, never block the main response


# ---------- handlers ----------

PRUNE_DAYS = 7


def _parse_dt(s):
    """Parst einen ISO-Zeitstempel (auch mit 'Z') zu einem tz-bewussten datetime."""
    if not s:
        return None
    try:
        dt = datetime.fromisoformat(str(s).strip().replace("Z", "+00:00"))
        if dt.tzinfo is None:
            dt = dt.replace(tzinfo=timezone.utc)
        return dt
    except Exception:
        return None


def _delete_poster_image(token, sp_id):
    """Loescht ein Poster-Bild aus SharePoint (best effort)."""
    if not sp_id:
        return
    try:
        requests.delete(
            f"https://graph.microsoft.com/v1.0/drives/{SP_DRIVE}/items/{sp_id}",
            headers=graph_headers(token), timeout=15,
        )
    except Exception:
        pass


def _split_old_posts(posts, days=PRUNE_DAYS):
    """Teilt Posts in (behalten, veraltet) anhand des Datums (aelter als `days` Tage)."""
    cutoff = datetime.now(timezone.utc) - timedelta(days=days)
    keep, old = [], []
    for p in posts:
        dt = _parse_dt(p.get("datum", ""))
        if dt is not None and dt < cutoff:
            old.append(p)
        else:
            keep.append(p)
    return keep, old


def _handle_prune(token, folder_id, days=PRUNE_DAYS, delete_all=False):
    """Wartung: entfernt veraltete Posts (aelter als `days` Tage) oder alle."""
    posts = load_posts(token, folder_id)
    if delete_all:
        keep, old = [], list(posts)
    else:
        keep, old = _split_old_posts(posts, days)
    for p in old:
        _delete_poster_image(token, p.get("poster_sp_id", ""))
    if old and not save_posts(token, folder_id, keep):
        return err("Posts konnten nicht gespeichert werden", 500)
    return ok({"success": True, "removed": len(old), "remaining": len(keep)})


def handle_get(req, token, folder_id):
    """GET: Return all posts, newest first. Optional ?limit=N"""
    posts = load_posts(token, folder_id)
    changed = False
    # Auto-Aufraeumen: Posts aelter als PRUNE_DAYS Tage automatisch entfernen,
    # damit die Ablage nicht unbegrenzt waechst. Laeuft bei jedem Laden mit.
    keep, old = _split_old_posts(posts)
    if old:
        for p in old:
            _delete_poster_image(token, p.get("poster_sp_id", ""))
        posts = keep
        changed = True
    # Self-healing: backfill missing ids on legacy posts so they stay deletable.
    for p in posts:
        if not p.get("id"):
            p["id"] = str(uuid.uuid4())
            changed = True
    if changed:
        save_posts(token, folder_id, posts)
    posts.sort(key=lambda p: p.get("datum", ""), reverse=True)
    limit = req.params.get("limit", "")
    if limit:
        try:
            posts = posts[:int(limit)]
        except:
            pass
    return ok({"success": True, "posts": posts})


def handle_post(req, token, folder_id):
    """POST: Create a new social post.
    Body: { titel, text, items: [{id, name, kategorie, preis, bild_url}], bild_base64? }
    """
    try:
        body = req.get_json()
    except:
        return err("Ungültiger Request-Body")

    # Fallback-Routing: Einige deployte Function-Instanzen registrieren nur
    # GET/POST (PATCH/DELETE liefern dort einen leeren 404). Damit Löschen,
    # Aktualisieren und Veröffentlichen zuverlässig funktionieren, können diese
    # Aktionen auch per POST mit dem Feld "_action" ausgelöst werden.
    _action = body.get("_action", "") if isinstance(body, dict) else ""
    if _action == "delete":
        return handle_delete(req, token, folder_id)
    if _action in ("patch", "update"):
        return handle_patch(req, token, folder_id)
    if _action == "prune":
        try:
            days = int(body.get("days", PRUNE_DAYS))
        except Exception:
            days = PRUNE_DAYS
        return _handle_prune(token, folder_id, days=days)
    if _action == "delete_all":
        return _handle_prune(token, folder_id, delete_all=True)

    titel = body.get("titel", "").strip()
    text = body.get("text", "").strip()
    items = body.get("items", [])

    if not titel and not items:
        return err("titel oder items sind erforderlich")

    # Save generated poster image if provided
    poster_url = ""
    poster_sp_id = ""
    bild_base64 = body.get("bild_base64", "")
    if bild_base64:
        if "," in bild_base64:
            bild_base64 = bild_base64.split(",", 1)[1]
        img_bytes = base64.b64decode(bild_base64)
        filename = f"post_{datetime.utcnow().strftime('%Y%m%d_%H%M%S')}.png"
        poster_url, poster_sp_id = upload_image(token, folder_id, filename, img_bytes)

    post_id = str(uuid.uuid4())
    wochentag = ["Montag", "Dienstag", "Mittwoch", "Donnerstag", "Freitag", "Samstag", "Sonntag"]

    # Tages-Zuordnung nach LOKALER Zeit (Europe/Berlin): Die TagesInfo (tagespost)
    # matcht Posts anhand des Berliner Kalendertags. Wuerde hier UTC verwendet,
    # bekaeme ein kurz nach Mitternacht erstellter Post das Datum von "gestern"
    # (UTC hinkt der Berliner Zeit 1-2h hinterher) und erschiene nicht.
    try:
        from zoneinfo import ZoneInfo
        _tz = ZoneInfo("Europe/Berlin")
    except Exception:
        _tz = timezone(timedelta(hours=2))  # Fallback CEST
    now_local = datetime.now(_tz)

    # Optional: ziel_datum (ISO date, e.g. "2026-07-01") for scheduling posts
    ziel_datum = body.get("ziel_datum", "").strip()
    if ziel_datum:
        try:
            zd = datetime.strptime(ziel_datum, "%Y-%m-%d")
            now = zd.strftime("%Y-%m-%dT") + now_local.strftime("%H:%M:%SZ")
            tag = wochentag[zd.weekday()]
        except ValueError:
            now = now_local.strftime("%Y-%m-%dT%H:%M:%SZ")
            tag = wochentag[now_local.weekday()]
    else:
        now = now_local.strftime("%Y-%m-%dT%H:%M:%SZ")
        tag = wochentag[now_local.weekday()]

    # Upload inline base64 images from items as files
    for idx, it in enumerate(items):
        bild = it.get("bild_url", "")
        if bild and bild.startswith("data:"):
            try:
                # Parse data URI: data:image/png;base64,xxxxx
                header, b64data = bild.split(",", 1)
                ct = "image/png"
                if "image/jpeg" in header:
                    ct = "image/jpeg"
                    ext = "jpg"
                elif "image/webp" in header:
                    ct = "image/webp"
                    ext = "webp"
                else:
                    ext = "png"
                img_bytes = base64.b64decode(b64data)
                safe_name = (it.get("name") or f"item_{idx}").replace(" ", "_").replace("/", "_")[:30]
                fname = f"item_{safe_name}_{post_id[:8]}.{ext}"
                dl_url, _ = upload_image(token, folder_id, fname, img_bytes, ct)
                if dl_url:
                    it["bild_url"] = dl_url
                else:
                    it["bild_url"] = ""
            except Exception:
                it["bild_url"] = ""

    # Optional: status (entwurf or veroeffentlicht)
    req_status = body.get("status", "veroeffentlicht").strip()
    if req_status not in ("entwurf", "veroeffentlicht"):
        req_status = "veroeffentlicht"

    # Optional: notify (Push an Abonnenten). Default False -> KEINE Push beim
    # normalen Speichern/Teilen. Push nur, wenn der Nutzer sie im CMS aktiv
    # anfordert (Checkbox). Sichtbarkeit auf /tagesinfo bleibt davon unberuehrt.
    req_notify = bool(body.get("notify", False))

    post = {
        "id": post_id,
        "titel": titel or f"{'Morgen' if ziel_datum else 'Heute'} im Dorfladen – {tag}",
        "text": text,
        "items": items,
        "poster_url": poster_url,
        "poster_sp_id": poster_sp_id,
        "datum": now,
        "wochentag": tag,
        "status": req_status,
    }

    posts = load_posts(token, folder_id)
    posts.append(post)
    if not save_posts(token, folder_id, posts):
        return err("Post konnte nicht gespeichert werden", 500)

    # Auto-push nur wenn ausdruecklich angefordert (notify) UND veroeffentlicht.
    if req_status == "veroeffentlicht" and req_notify:
        _send_auto_push(req, post.get("titel", ""), "tagesinfo")

    return ok({"success": True, "post": post})


def handle_patch(req, token, folder_id):
    """PATCH: Update an existing post. Supports status, titel, text/freitext, items."""
    try:
        body = req.get_json()
    except:
        return err("Ungültiger Request-Body")

    post_id = body.get("id", "").strip()
    if not post_id:
        return err("id ist erforderlich")

    new_status = body.get("status", "").strip() if body.get("status") else ""
    if new_status and new_status not in ("entwurf", "veroeffentlicht"):
        return err("status muss 'entwurf' oder 'veroeffentlicht' sein")

    posts = load_posts(token, folder_id)
    found = None
    old_status = None
    for p in posts:
        if p.get("id") == post_id:
            old_status = p.get("status", "veroeffentlicht")
            if new_status:
                p["status"] = new_status
            if "titel" in body:
                p["titel"] = body["titel"]
            if "text" in body:
                p["text"] = body["text"]
            if "freitext" in body:
                p["text"] = body["freitext"]
            if "items" in body:
                p["items"] = body["items"]
            found = p
            break

    if not found:
        return err("Post nicht gefunden", 404)

    if not save_posts(token, folder_id, posts):
        return err("Posts konnten nicht gespeichert werden", 500)

    # Auto-push when draft is published
    if new_status == "veroeffentlicht" and old_status == "entwurf":
        _send_auto_push(req, found.get("titel", ""), "tagesinfo")

    return ok({"success": True, "post": found})


def handle_delete(req, token, folder_id):
    """DELETE: Remove a post."""
    post_id = req.params.get("id", "")
    if not post_id:
        try:
            body = req.get_json()
            post_id = body.get("id", "")
        except:
            pass
    if not post_id:
        return err("id ist erforderlich")

    posts = load_posts(token, folder_id)
    new_posts = []
    deleted = None
    for p in posts:
        if p.get("id") == post_id:
            deleted = p
        else:
            new_posts.append(p)

    if not deleted:
        return err("Post nicht gefunden", 404)

    # Delete poster image from SP
    sp_id = deleted.get("poster_sp_id", "")
    if sp_id:
        h = graph_headers(token)
        requests.delete(f"https://graph.microsoft.com/v1.0/drives/{SP_DRIVE}/items/{sp_id}", headers=h, timeout=15)

    if not save_posts(token, folder_id, new_posts):
        return err("Posts konnten nicht gespeichert werden", 500)

    return ok({"success": True, "deleted": post_id})


# ---------- main ----------

def main(req: func.HttpRequest) -> func.HttpResponse:
    from shared.auth import admin_auth_guard
    _auth = admin_auth_guard(req)
    if _auth is not None:
        return _auth
    if req.method == "OPTIONS":
        return func.HttpResponse(status_code=200, headers=get_cors())

    token = get_graph_token()
    if not token:
        return err("Graph-Token konnte nicht abgerufen werden", 500)

    folder_id = ensure_social_folder(token)
    if not folder_id:
        return err("SocialMedia-Ordner konnte nicht erstellt werden", 500)

    if req.method == "GET":
        return handle_get(req, token, folder_id)
    elif req.method == "POST":
        return handle_post(req, token, folder_id)
    elif req.method == "PATCH":
        return handle_patch(req, token, folder_id)
    elif req.method == "DELETE":
        return handle_delete(req, token, folder_id)

    return err("Method not allowed", 405)
