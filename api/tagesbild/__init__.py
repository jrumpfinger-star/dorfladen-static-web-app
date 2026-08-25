"""
Tagesbild – Full-Resolution-Bildproxy fuer die TagesInfo-Lightbox.

GET /api/tagesbild?datei=<dateiname>

Die TagesInfo speichert im Post nur kleine 200px-Thumbnails (als data:-URI),
damit die Liste schnell laedt. Fuer die Lightbox (Bild anklicken = vergroessern)
liefert dieser Endpoint das Original aus dem SharePoint-Ordner "SocialMedia"
in voller Aufloesung. Der Dateiname stammt aus dem Feld `bild_datei` des Items.

Robust: kein base64-Ballast im Haupt-Payload; das grosse Bild wird erst beim
Klick geladen. Kurzer In-Memory-Cache reduziert Graph-Aufrufe.
"""
import azure.functions as func
import os
import re
import time
import threading

import msal
import requests

from shared.dataverse import get_tenant_id, get_client_id

TENANT_ID = get_tenant_id()
CLIENT_ID = get_client_id()
CLIENT_SECRET = os.environ.get("DV_CLIENT_SECRET", "")

SP_DRIVE = "b!bwUha0ab4EeiA3xXHK-Oobhv5tJbeYJDiF9pTB-f1kC-Mp-AY0brRrr2WigdYK4A"
SP_SOCIAL_FOLDER_NAME = "SocialMedia"

# ---- kleiner Cache (Folder-ID lange, Download-URL kurz) ----
_cache = {}
_cache_lock = threading.Lock()
FOLDER_TTL = 3600      # 1 h
URL_TTL = 600          # 10 min (Graph-downloadUrl haelt ~1 h)


def _cache_get(key, ttl):
    with _cache_lock:
        e = _cache.get(key)
        if e and (time.time() - e["ts"]) < ttl:
            return e["val"]
    return None


def _cache_set(key, val):
    with _cache_lock:
        _cache[key] = {"val": val, "ts": time.time()}


def _cors():
    return {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, OPTIONS",
        "Access-Control-Allow-Headers": "*",
        "Access-Control-Max-Age": "86400",
    }


def _get_token():
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
    except Exception:
        return None


def _find_folder(token):
    cached = _cache_get("folder_id", FOLDER_TTL)
    if cached:
        return cached
    h = {"Authorization": f"Bearer {token}", "Accept": "application/json"}
    url = (f"https://graph.microsoft.com/v1.0/drives/{SP_DRIVE}/root/children"
           f"?$filter=name eq '{SP_SOCIAL_FOLDER_NAME}'&$select=id,name,folder")
    r = requests.get(url, headers=h, timeout=15)
    if r.status_code == 200:
        for child in r.json().get("value", []):
            if child.get("folder") is not None:
                _cache_set("folder_id", child["id"])
                return child["id"]
    return None


def _download_url(token, folder_id, filename):
    key = "url:" + filename
    cached = _cache_get(key, URL_TTL)
    if cached:
        return cached
    h = {"Authorization": f"Bearer {token}", "Accept": "application/json"}
    url = f"https://graph.microsoft.com/v1.0/drives/{SP_DRIVE}/items/{folder_id}:/{filename}"
    r = requests.get(url, headers=h, timeout=15)
    if r.status_code == 200:
        dl = r.json().get("@microsoft.graph.downloadUrl", "")
        if dl:
            _cache_set(key, dl)
        return dl
    return ""


_MIME = {
    "jpg": "image/jpeg", "jpeg": "image/jpeg", "png": "image/png",
    "gif": "image/gif", "webp": "image/webp", "bmp": "image/bmp",
}


def _mime_for(filename):
    ext = filename.rsplit(".", 1)[-1].lower() if "." in filename else ""
    return _MIME.get(ext, "application/octet-stream")


def _err(msg, code):
    return func.HttpResponse(msg, status_code=code, headers=_cors())


def main(req: func.HttpRequest) -> func.HttpResponse:
    if req.method == "OPTIONS":
        return func.HttpResponse(status_code=200, headers=_cors())

    datei = (req.params.get("datei") or "").strip()
    if not datei:
        return _err("datei fehlt", 400)
    # Pfad-Traversal verhindern: nur einfache Dateinamen erlauben.
    if not re.match(r"^[A-Za-z0-9._-]+$", datei):
        return _err("ungueltiger Dateiname", 400)

    token = _get_token()
    if not token:
        return _err("Auth fehlgeschlagen", 500)

    folder_id = _find_folder(token)
    if not folder_id:
        return _err("Ordner nicht gefunden", 404)

    dl = _download_url(token, folder_id, datei)
    if not dl:
        return _err("Bild nicht gefunden", 404)

    try:
        r = requests.get(dl, timeout=20)
        if r.status_code != 200:
            return _err("Bild-Download fehlgeschlagen", 502)
        content = r.content
        ctype = _mime_for(datei)
        # Auf Lightbox-taugliche Groesse verkleinern (Originale koennen 10-20 MB
        # gross sein). Ergebnis ~100-300 KB statt viele MB -> schnell auf Mobil.
        try:
            from PIL import Image
            import io
            im = Image.open(io.BytesIO(content))
            max_w = 1400
            if im.width > max_w:
                ratio = max_w / float(im.width)
                im = im.resize((max_w, int(im.height * ratio)), Image.LANCZOS)
            if im.mode in ("RGBA", "P", "LA"):
                im = im.convert("RGB")
            buf = io.BytesIO()
            im.save(buf, format="JPEG", quality=82, optimize=True)
            content = buf.getvalue()
            ctype = "image/jpeg"
        except Exception:
            pass  # PIL fehlt/Fehler: Original unveraendert ausliefern
        headers = _cors()
        headers["Content-Type"] = ctype
        # Bild darf gecacht werden (Inhalt aendert sich pro Dateiname nicht).
        headers["Cache-Control"] = "public, max-age=86400"
        return func.HttpResponse(content, status_code=200, headers=headers)
    except Exception:
        return _err("Bild-Download fehlgeschlagen", 502)
