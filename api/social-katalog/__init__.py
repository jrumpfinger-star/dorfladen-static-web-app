import azure.functions as func
import json
import os
import msal
import requests
import base64
import uuid
from datetime import datetime

# ---------- config ----------
TENANT_ID = os.environ.get("DV_TENANT_ID", "acfaedd4-c403-43b7-9544-fdb2b150124e")
CLIENT_ID = os.environ.get("DV_CLIENT_ID", "137b2df6-be83-459a-ac89-9efd0bdf51c4")
CLIENT_SECRET = os.environ.get("DV_CLIENT_SECRET", "")

# SharePoint drive + root folder for Daily images (same drive as gallery)
SP_DRIVE = "b!bwUha0ab4EeiA3xXHK-Oobhv5tJbeYJDiF9pTB-f1kC-Mp-AY0brRrr2WigdYK4A"
# We store everything under a "SocialMedia" folder in SP
SP_SOCIAL_FOLDER_NAME = "SocialMedia"

DEFAULT_KATEGORIEN = [
    {"name": "Mittagessen", "icon": "utensils"},
    {"name": "Kuchen", "icon": "cake-slice"},
    {"name": "Obst & Gemuese", "icon": "apple"},
    {"name": "Aufstriche", "icon": "sandwich"},
    {"name": "Salate", "icon": "salad"},
]
KATALOG_FILE = "katalog.json"
MITTAGSTISCH_BILDER_FILE = "mittagstisch-bilder.json"


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


# ---------- SharePoint helpers ----------

def ensure_social_folder(token):
    """Find or create the SocialMedia root folder. Returns item id."""
    h = graph_headers(token)
    # Check if folder exists
    url = f"https://graph.microsoft.com/v1.0/drives/{SP_DRIVE}/root/children?$filter=name eq '{SP_SOCIAL_FOLDER_NAME}'&$select=id,name,folder"
    r = requests.get(url, headers=h, timeout=15)
    if r.status_code == 200:
        for child in r.json().get("value", []):
            if child.get("folder") is not None:
                return child["id"]
    # Create it
    r2 = requests.post(
        f"https://graph.microsoft.com/v1.0/drives/{SP_DRIVE}/root/children",
        headers={**h, "Content-Type": "application/json"},
        json={"name": SP_SOCIAL_FOLDER_NAME, "folder": {}, "@microsoft.graph.conflictBehavior": "fail"},
        timeout=15,
    )
    if r2.status_code in (200, 201):
        return r2.json().get("id")
    # Maybe already exists (conflict)
    if r2.status_code == 409:
        r3 = requests.get(url, headers=h, timeout=15)
        if r3.status_code == 200:
            for child in r3.json().get("value", []):
                if child.get("folder") is not None:
                    return child["id"]
    return None


def load_katalog(token, folder_id):
    """Load katalog.json from the SocialMedia folder."""
    h = graph_headers(token)
    url = f"https://graph.microsoft.com/v1.0/drives/{SP_DRIVE}/items/{folder_id}:/{KATALOG_FILE}:/content"
    r = requests.get(url, headers=h, timeout=15)
    if r.status_code == 200:
        try:
            return json.loads(r.text)
        except:
            return []
    return []


def save_katalog(token, folder_id, data):
    """Save katalog.json to the SocialMedia folder."""
    h = {**graph_headers(token), "Content-Type": "application/json"}
    url = f"https://graph.microsoft.com/v1.0/drives/{SP_DRIVE}/items/{folder_id}:/{KATALOG_FILE}:/content"
    content = json.dumps(data, ensure_ascii=False, indent=2)
    r = requests.put(url, headers=h, data=content.encode("utf-8"), timeout=15)
    return r.status_code in (200, 201)


def upload_image(token, folder_id, filename, image_bytes, content_type="image/jpeg"):
    """Upload an image to SocialMedia folder, return download URL."""
    h = {**graph_headers(token), "Content-Type": content_type}
    url = f"https://graph.microsoft.com/v1.0/drives/{SP_DRIVE}/items/{folder_id}:/{filename}:/content"
    r = requests.put(url, headers=h, data=image_bytes, timeout=30)
    if r.status_code in (200, 201):
        item = r.json()
        return item.get("@microsoft.graph.downloadUrl", ""), item.get("id", "")
    return None, None


def delete_sp_item(token, item_id):
    """Delete a SharePoint item by id."""
    h = graph_headers(token)
    url = f"https://graph.microsoft.com/v1.0/drives/{SP_DRIVE}/items/{item_id}"
    r = requests.delete(url, headers=h, timeout=15)
    return r.status_code in (200, 204)


def get_download_url(token, folder_id, filename):
    """Get fresh download URL for an image."""
    h = graph_headers(token)
    url = f"https://graph.microsoft.com/v1.0/drives/{SP_DRIVE}/items/{folder_id}:/{filename}"
    r = requests.get(url, headers=h, timeout=15)
    if r.status_code == 200:
        return r.json().get("@microsoft.graph.downloadUrl", "")
    return ""


# ---------- handlers ----------

def _normalize_kategorien(raw):
    """Ensure kategorien is a list of {name, icon} objects.
    Handles legacy string arrays and new object arrays."""
    if not isinstance(raw, list) or not raw:
        return DEFAULT_KATEGORIEN
    # Build icon lookup from defaults
    icon_map = {k["name"]: k["icon"] for k in DEFAULT_KATEGORIEN}
    result = []
    for item in raw:
        if isinstance(item, str):
            result.append({"name": item, "icon": icon_map.get(item, "tag")})
        elif isinstance(item, dict) and item.get("name"):
            if not item.get("icon"):
                item["icon"] = icon_map.get(item["name"], "tag")
            result.append(item)
    return result if result else DEFAULT_KATEGORIEN


def load_kategorien():
    """Load categories from cms-config (Dataverse). Fallback to DEFAULT_KATEGORIEN."""
    try:
        dv_url = os.environ.get("DV_DEFAULT_URL", "") or os.environ.get("DV_DEV_URL", "")
        if not dv_url:
            return DEFAULT_KATEGORIEN
        tenant_id = os.environ.get("DV_TENANT_ID", "")
        client_id = os.environ.get("DV_CLIENT_ID", "")
        client_secret = os.environ.get("DV_CLIENT_SECRET", "")
        if not client_secret:
            return DEFAULT_KATEGORIEN
        import msal as _msal
        app = _msal.ConfidentialClientApplication(
            client_id,
            authority=f"https://login.microsoftonline.com/{tenant_id}",
            client_credential=client_secret,
        )
        tok = app.acquire_token_for_client(scopes=[f"{dv_url}/.default"])
        access_token = tok.get("access_token")
        if not access_token:
            return DEFAULT_KATEGORIEN
        h = {
            "Authorization": f"Bearer {access_token}",
            "OData-MaxVersion": "4.0", "OData-Version": "4.0",
            "Accept": "application/json",
        }
        url = f"{dv_url}/api/data/v9.2/dl_seiteninhalts?$filter=dl_schluessel eq 'katalog_kategorien'&$select=dl_wert&$top=1"
        r = requests.get(url, headers=h, timeout=10)
        if r.status_code == 200:
            items = r.json().get("value", [])
            if items:
                import json as _json
                val = items[0].get("dl_wert", "")
                parsed = _json.loads(val) if val.strip().startswith("[") else None
                if isinstance(parsed, list) and len(parsed) > 0:
                    return _normalize_kategorien(parsed)
    except Exception:
        pass
    return DEFAULT_KATEGORIEN


def handle_get(req, token, folder_id):
    """GET: Return full katalog with image URLs refreshed.
    If ?base64=1, download each image and return as data:URI (avoids CORS)."""
    katalog = load_katalog(token, folder_id)
    # Always refresh download URLs (they expire after ~1h)
    changed = False
    for item in katalog:
        if item.get("bild_datei"):
            fresh_url = get_download_url(token, folder_id, item["bild_datei"])
            if fresh_url and fresh_url != item.get("bild_url", ""):
                item["bild_url"] = fresh_url
                changed = True
    if changed:
        save_katalog(token, folder_id, katalog)
    # Convert images to base64 data URIs if requested
    want_base64 = req.params.get("base64", "") == "1"
    if want_base64:
        for item in katalog:
            dl_url = item.get("bild_url", "")
            if dl_url and not dl_url.startswith("data:"):
                try:
                    r = requests.get(dl_url, timeout=15)
                    if r.status_code == 200:
                        ct = r.headers.get("Content-Type", "image/jpeg")
                        b64 = base64.b64encode(r.content).decode("ascii")
                        item["bild_url"] = f"data:{ct};base64,{b64}"
                except:
                    pass
    kategorien = load_kategorien()
    return ok({"success": True, "kategorien": kategorien, "items": katalog})


def handle_post(req, token, folder_id):
    """POST: Add new katalog item. Supports multipart (with image) or JSON."""
    content_type = req.headers.get("Content-Type", "")

    if "multipart" in content_type:
        # Multipart upload with image
        files = req.files
        name = req.form.get("name", "").strip()
        kategorie = req.form.get("kategorie", "").strip()
        preis = req.form.get("preis", "")
        if not name or not kategorie:
            return err("name und kategorie sind erforderlich")
        # Upload image if present
        bild_url = ""
        bild_datei = ""
        bild_sp_id = ""
        if "bild" in files:
            f = files["bild"]
            ext = os.path.splitext(f.filename)[1] or ".jpg"
            bild_datei = f"{uuid.uuid4().hex[:8]}_{kategorie}{ext}"
            img_bytes = f.read()
            bild_url, bild_sp_id = upload_image(token, folder_id, bild_datei, img_bytes, f.content_type or "image/jpeg")
            if not bild_url:
                return err("Bild-Upload fehlgeschlagen", 500)
    else:
        # JSON body (image as base64)
        try:
            body = req.get_json()
        except:
            return err("Ungültiger Request-Body")
        name = body.get("name", "").strip()
        kategorie = body.get("kategorie", "").strip()
        preis = body.get("preis", "")
        if not name or not kategorie:
            return err("name und kategorie sind erforderlich")
        bild_url = ""
        bild_datei = ""
        bild_sp_id = ""
        bild_base64 = body.get("bild_base64", "")
        if bild_base64:
            # Remove data URL prefix if present
            if "," in bild_base64:
                bild_base64 = bild_base64.split(",", 1)[1]
            img_bytes = base64.b64decode(bild_base64)
            ext = ".jpg"
            bild_datei = f"{uuid.uuid4().hex[:8]}_{kategorie}{ext}"
            bild_url, bild_sp_id = upload_image(token, folder_id, bild_datei, img_bytes)
            if not bild_url:
                return err("Bild-Upload fehlgeschlagen", 500)

    # Build katalog entry
    item_id = str(uuid.uuid4())
    try:
        preis_val = float(str(preis).replace(",", ".")) if preis else 0
    except:
        preis_val = 0

    entry = {
        "id": item_id,
        "name": name,
        "kategorie": kategorie,
        "preis": preis_val,
        "bild_url": bild_url,
        "bild_datei": bild_datei,
        "bild_sp_id": bild_sp_id,
        "aktiv": True,
        "erstellt": datetime.utcnow().strftime("%Y-%m-%dT%H:%M:%SZ"),
    }

    katalog = load_katalog(token, folder_id)
    katalog.append(entry)
    if not save_katalog(token, folder_id, katalog):
        return err("Katalog konnte nicht gespeichert werden", 500)

    return ok({"success": True, "item": entry})


def handle_patch(req, token, folder_id):
    """PATCH: Update existing katalog item."""
    try:
        body = req.get_json()
    except:
        return err("Ungültiger Request-Body")

    item_id = body.get("id")
    if not item_id:
        return err("id ist erforderlich")

    katalog = load_katalog(token, folder_id)
    found = None
    for i, item in enumerate(katalog):
        if item.get("id") == item_id:
            found = i
            break
    if found is None:
        return err("Eintrag nicht gefunden", 404)

    # Update fields
    for key in ("name", "kategorie", "preis", "aktiv"):
        if key in body:
            val = body[key]
            if key == "preis":
                try:
                    val = float(str(val).replace(",", "."))
                except:
                    pass
            katalog[found][key] = val

    # Handle new image (base64)
    bild_base64 = body.get("bild_base64", "")
    if bild_base64:
        # Delete old image from SP
        old_sp_id = katalog[found].get("bild_sp_id", "")
        if old_sp_id:
            delete_sp_item(token, old_sp_id)
        # Upload new
        if "," in bild_base64:
            bild_base64 = bild_base64.split(",", 1)[1]
        img_bytes = base64.b64decode(bild_base64)
        bild_datei = f"{uuid.uuid4().hex[:8]}_{katalog[found].get('kategorie', 'img')}.jpg"
        bild_url, bild_sp_id = upload_image(token, folder_id, bild_datei, img_bytes)
        if bild_url:
            katalog[found]["bild_url"] = bild_url
            katalog[found]["bild_datei"] = bild_datei
            katalog[found]["bild_sp_id"] = bild_sp_id

    if not save_katalog(token, folder_id, katalog):
        return err("Katalog konnte nicht gespeichert werden", 500)

    return ok({"success": True, "item": katalog[found]})


def handle_delete(req, token, folder_id):
    """DELETE: Remove katalog item and its image."""
    item_id = req.params.get("id", "")
    if not item_id:
        try:
            body = req.get_json()
            item_id = body.get("id", "")
        except:
            pass
    if not item_id:
        return err("id ist erforderlich")

    katalog = load_katalog(token, folder_id)
    new_katalog = []
    deleted = None
    for item in katalog:
        if item.get("id") == item_id:
            deleted = item
        else:
            new_katalog.append(item)

    if not deleted:
        return err("Eintrag nicht gefunden", 404)

    # Delete image from SharePoint
    sp_id = deleted.get("bild_sp_id", "")
    if sp_id:
        delete_sp_item(token, sp_id)

    if not save_katalog(token, folder_id, new_katalog):
        return err("Katalog konnte nicht gespeichert werden", 500)

    return ok({"success": True, "deleted": item_id})


# ---------- Mittagstisch-Bilder handlers ----------

def load_mt_bilder(token, folder_id):
    """Load mittagstisch-bilder.json from the SocialMedia folder."""
    h = graph_headers(token)
    url = f"https://graph.microsoft.com/v1.0/drives/{SP_DRIVE}/items/{folder_id}:/{MITTAGSTISCH_BILDER_FILE}:/content"
    r = requests.get(url, headers=h, timeout=15)
    if r.status_code == 200:
        try:
            return json.loads(r.text)
        except:
            return {}
    return {}


def save_mt_bilder(token, folder_id, data):
    """Save mittagstisch-bilder.json."""
    h = {**graph_headers(token), "Content-Type": "application/json"}
    url = f"https://graph.microsoft.com/v1.0/drives/{SP_DRIVE}/items/{folder_id}:/{MITTAGSTISCH_BILDER_FILE}:/content"
    content = json.dumps(data, ensure_ascii=False, indent=2)
    r = requests.put(url, headers=h, data=content.encode("utf-8"), timeout=15)
    return r.status_code in (200, 201)


def handle_mt_bilder_get(req, token, folder_id):
    """GET ?action=mt-bilder: Return all Mittagstisch images.
    If ?base64=1, download each image from SharePoint and return as data:URI
    so the browser can use them on canvas without CORS issues."""
    bilder = load_mt_bilder(token, folder_id)
    want_base64 = req.params.get("base64", "") == "1"
    if want_base64 and bilder:
        h = graph_headers(token)
        for gericht, info in bilder.items():
            sp_id = info.get("bild_sp_id")
            if not sp_id:
                continue
            try:
                dl_url = f"https://graph.microsoft.com/v1.0/drives/{SP_DRIVE}/items/{sp_id}/content"
                r = requests.get(dl_url, headers=h, timeout=20)
                if r.status_code == 200:
                    ct = r.headers.get("Content-Type", "image/png")
                    b64 = base64.b64encode(r.content).decode("ascii")
                    info["bild_base64"] = f"data:{ct};base64,{b64}"
            except:
                pass
    return ok({"success": True, "bilder": bilder})


def handle_mt_bilder_post(req, token, folder_id):
    """POST ?action=mt-bild: Upload a Mittagstisch image for a specific gericht."""
    content_type = req.headers.get("Content-Type", "")
    if "multipart" in content_type:
        gericht = req.form.get("gericht", "").strip()
        if not gericht:
            return err("gericht ist erforderlich")
        if "bild" not in req.files:
            return err("bild ist erforderlich")
        f = req.files["bild"]
        ext = os.path.splitext(f.filename)[1] or ".jpg"
        safe_name = gericht.lower().replace(" ", "_").replace("/", "_")[:40]
        bild_datei = f"mt_{safe_name}_{uuid.uuid4().hex[:6]}{ext}"
        img_bytes = f.read()
        bild_url, bild_sp_id = upload_image(token, folder_id, bild_datei, img_bytes, f.content_type or "image/jpeg")
        if not bild_url:
            return err("Bild-Upload fehlgeschlagen", 500)
    else:
        try:
            body = req.get_json()
        except:
            return err("Ungültiger Request-Body")
        gericht = body.get("gericht", "").strip()
        if not gericht:
            return err("gericht ist erforderlich")
        bild_base64 = body.get("bild_base64", "")
        if not bild_base64:
            return err("bild_base64 ist erforderlich")
        if "," in bild_base64:
            bild_base64 = bild_base64.split(",", 1)[1]
        img_bytes = base64.b64decode(bild_base64)
        safe_name = gericht.lower().replace(" ", "_").replace("/", "_")[:40]
        bild_datei = f"mt_{safe_name}_{uuid.uuid4().hex[:6]}.jpg"
        bild_url, bild_sp_id = upload_image(token, folder_id, bild_datei, img_bytes)
        if not bild_url:
            return err("Bild-Upload fehlgeschlagen", 500)

    # Save to mapping
    bilder = load_mt_bilder(token, folder_id)
    # Delete old image if exists
    old = bilder.get(gericht)
    if old and old.get("bild_sp_id"):
        delete_sp_item(token, old["bild_sp_id"])
    bilder[gericht] = {
        "bild_url": bild_url,
        "bild_datei": bild_datei,
        "bild_sp_id": bild_sp_id,
        "aktualisiert": datetime.utcnow().strftime("%Y-%m-%dT%H:%M:%SZ"),
    }
    save_mt_bilder(token, folder_id, bilder)
    return ok({"success": True, "gericht": gericht, "bild_url": bild_url})


def handle_mt_bilder_delete(req, token, folder_id):
    """DELETE ?action=mt-bild&gericht=X: Remove Mittagstisch image."""
    gericht = req.params.get("gericht", "")
    if not gericht:
        return err("gericht ist erforderlich")
    bilder = load_mt_bilder(token, folder_id)
    old = bilder.pop(gericht, None)
    if old and old.get("bild_sp_id"):
        delete_sp_item(token, old["bild_sp_id"])
    save_mt_bilder(token, folder_id, bilder)
    return ok({"success": True})


# ---------- main ----------

def main(req: func.HttpRequest) -> func.HttpResponse:
    if req.method == "OPTIONS":
        return func.HttpResponse(status_code=200, headers=get_cors())

    token = get_graph_token()
    if not token:
        return err("Graph-Token konnte nicht abgerufen werden", 500)

    folder_id = ensure_social_folder(token)
    if not folder_id:
        return err("SocialMedia-Ordner konnte nicht erstellt werden", 500)

    # Mittagstisch-Bilder routes (via ?action= parameter)
    action = req.params.get("action", "")
    if action == "mt-bilder" and req.method == "GET":
        return handle_mt_bilder_get(req, token, folder_id)
    if action == "mt-bild" and req.method == "POST":
        return handle_mt_bilder_post(req, token, folder_id)
    if action == "mt-bild" and req.method == "DELETE":
        return handle_mt_bilder_delete(req, token, folder_id)

    # Standard Katalog routes
    if req.method == "GET":
        return handle_get(req, token, folder_id)
    elif req.method == "POST":
        return handle_post(req, token, folder_id)
    elif req.method == "PATCH":
        return handle_patch(req, token, folder_id)
    elif req.method == "DELETE":
        return handle_delete(req, token, folder_id)

    return err("Method not allowed", 405)
