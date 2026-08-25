"""
Kontakt-Bild-Upload: nimmt ein (bereits clientseitig verkleinertes) Bild entgegen,
verkleinert es serverseitig nochmals sicher (max ~1600px) und legt es im
SharePoint-Ordner "SocialMedia" mit Praefix "kontakt_" ab. Rueckgabe: Dateiname.

Anzeige der Bilder erfolgt ueber den bestehenden Proxy /api/tagesbild?datei=<name>.

POST /api/contact-upload  { device_id, image: "data:image/...;base64,..." | base64 }
  → { success, datei }
"""
import azure.functions as func
import json
import os
import re
import time
import base64
import uuid
import threading

import msal
import requests

from shared.dataverse import get_tenant_id, get_client_id

TENANT_ID = get_tenant_id()
CLIENT_ID = get_client_id()
CLIENT_SECRET = os.environ.get("DV_CLIENT_SECRET", "")

SP_DRIVE = "b!bwUha0ab4EeiA3xXHK-Oobhv5tJbeYJDiF9pTB-f1kC-Mp-AY0brRrr2WigdYK4A"
SP_SOCIAL_FOLDER_NAME = "SocialMedia"

MAX_BYTES = 8 * 1024 * 1024   # 8 MB Rohgrenze
MAX_WIDTH = 1600

# ── Rate-Limit pro device_id (best effort) ──
_rate = {}
_rate_lock = threading.Lock()
RATE_MAX = 20
RATE_WINDOW = 300


def _rate_ok(device_id):
    if not device_id:
        return True
    now = time.time()
    with _rate_lock:
        arr = [t for t in _rate.get(device_id, []) if now - t < RATE_WINDOW]
        if len(arr) >= RATE_MAX:
            _rate[device_id] = arr
            return False
        arr.append(now)
        _rate[device_id] = arr
        return True


def _cors():
    return {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "*",
        "Access-Control-Max-Age": "86400",
        "Content-Type": "application/json; charset=utf-8",
    }


def _graph_token():
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
    h = {"Authorization": f"Bearer {token}", "Accept": "application/json"}
    url = (f"https://graph.microsoft.com/v1.0/drives/{SP_DRIVE}/root/children"
           f"?$filter=name eq '{SP_SOCIAL_FOLDER_NAME}'&$select=id,name,folder")
    r = requests.get(url, headers=h, timeout=15)
    if r.status_code == 200:
        for c in r.json().get("value", []):
            if c.get("folder") is not None:
                return c["id"]
    return None


def _err(msg, code):
    return func.HttpResponse(json.dumps({"success": False, "error": msg}, ensure_ascii=False),
                             status_code=code, headers=_cors())


def main(req: func.HttpRequest) -> func.HttpResponse:
    if req.method == "OPTIONS":
        return func.HttpResponse(status_code=200, headers=_cors())

    try:
        body = req.get_json()
    except Exception:
        return _err("Invalid JSON", 400)

    device_id = (body.get("device_id") or "").strip()[:100]
    if not _rate_ok(device_id):
        return _err("Zu viele Uploads. Bitte kurz warten.", 429)

    raw_img = body.get("image") or ""
    if not raw_img:
        return _err("Kein Bild übergeben.", 400)
    # data:-URI oder reines base64
    if raw_img.startswith("data:"):
        raw_img = raw_img.split(",", 1)[-1]
    try:
        data = base64.b64decode(raw_img)
    except Exception:
        return _err("Bild konnte nicht dekodiert werden.", 400)
    if len(data) > MAX_BYTES:
        return _err("Bild zu groß (max. 8 MB).", 413)

    # Serverseitig sicher verkleinern + als JPEG normalisieren.
    try:
        from PIL import Image
        import io
        im = Image.open(io.BytesIO(data))
        if im.width > MAX_WIDTH:
            ratio = MAX_WIDTH / float(im.width)
            im = im.resize((MAX_WIDTH, int(im.height * ratio)), Image.LANCZOS)
        if im.mode in ("RGBA", "P", "LA"):
            im = im.convert("RGB")
        buf = io.BytesIO()
        im.save(buf, format="JPEG", quality=82, optimize=True)
        data = buf.getvalue()
    except Exception:
        # Kein PIL/kein Bild: nur echte Bildtypen zulassen (magic bytes).
        if not (data[:3] == b"\xff\xd8\xff" or data[:8] == b"\x89PNG\r\n\x1a\n"):
            return _err("Ungültiges Bildformat.", 400)

    token = _graph_token()
    if not token:
        return _err("Auth fehlgeschlagen", 500)
    folder_id = _find_folder(token)
    if not folder_id:
        return _err("Ordner nicht gefunden", 404)

    fname = "kontakt_" + uuid.uuid4().hex[:12] + ".jpg"
    up_url = f"https://graph.microsoft.com/v1.0/drives/{SP_DRIVE}/items/{folder_id}:/{fname}:/content"
    up = requests.put(
        up_url,
        headers={"Authorization": f"Bearer {token}", "Content-Type": "image/jpeg"},
        data=data, timeout=60,
    )
    if up.status_code in (200, 201):
        return func.HttpResponse(json.dumps({"success": True, "datei": fname}, ensure_ascii=False),
                                 status_code=200, headers=_cors())
    return _err(f"Upload fehlgeschlagen ({up.status_code})", 502)
