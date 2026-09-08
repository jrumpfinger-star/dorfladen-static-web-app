"""
Tagesbild – Full-Resolution-Bildproxy fuer die TagesInfo-Lightbox.

GET /api/tagesbild?datei=<dateiname>
GET /api/tagesbild?sp_id=<sharepoint-item-id>
GET /api/tagesbild?...&max=<breite>   (optional, 64..2000, Standard 1400)

Die TagesInfo speichert im Post nur kleine 200px-Thumbnails (als data:-URI),
damit die Liste schnell laedt. Fuer die Lightbox (Bild anklicken = vergroessern)
liefert dieser Endpoint das Original aus dem SharePoint-Ordner "SocialMedia"
in voller Aufloesung. Der Dateiname stammt aus dem Feld `bild_datei` des Items.

Zweiter Einsatzzweck: stabile Bildquelle fuer Katalog- und Mittagstisch-Bilder.
Die in SharePoint gespeicherten `download.aspx`-URLs tragen ein befristetes
`tempauth`-Token und sind nach Ablauf tot (401); ausserdem sind sie
cross-origin und wuerden ein Canvas "tainten", sodass der Social-Poster das
Bild nicht exportieren kann. Ueber diesen Proxy kommen die Bilder
gleich-origin, ohne Ablaufdatum und ohne Canvas-Verunreinigung.

`sp_id` ist dabei der robusteste Weg: die SharePoint-Item-Id bleibt auch dann
gueltig, wenn die Datei umbenannt wird, und umgeht Sonderzeichen im Namen.

Robust: kein base64-Ballast im Haupt-Payload; das grosse Bild wird erst beim
Klick geladen. Kurzer In-Memory-Cache reduziert Graph-Aufrufe.
"""
import azure.functions as func
import os
import re
import time
import threading
from urllib.parse import quote

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
IMG_TTL = 1800         # 30 min fertig verkleinerte Bilddaten
IMG_MAX = 24           # Obergrenze, damit der Speicher nicht unbegrenzt waechst

STD_BREITE = 1400      # Lightbox-tauglich
MIN_BREITE = 64        # kleinste sinnvolle Vorschau
MAX_BREITE = 2000


def _cache_get(key, ttl):
    with _cache_lock:
        e = _cache.get(key)
        if e and (time.time() - e["ts"]) < ttl:
            return e["val"]
    return None


def _cache_set(key, val):
    with _cache_lock:
        _cache[key] = {"val": val, "ts": time.time()}


def _img_get(key):
    return _cache_get(key, IMG_TTL)


def _img_set(key, val):
    """Fertig verkleinertes Bild merken und den Speicher begrenzen.

    Ohne diesen Zwischenspeicher laedt jeder Aufruf das 2-20 MB grosse Original
    erneut von SharePoint und verkleinert es neu (gemessen 5-20 s je Bild).
    """
    with _cache_lock:
        _cache[key] = {"val": val, "ts": time.time()}
        bilder = [(k, v["ts"]) for k, v in _cache.items() if k.startswith("img:")]
        if len(bilder) > IMG_MAX:
            bilder.sort(key=lambda x: x[1])
            for k, _ in bilder[:len(bilder) - IMG_MAX]:
                _cache.pop(k, None)


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
    url = (f"https://graph.microsoft.com/v1.0/drives/{SP_DRIVE}/items/"
           f"{folder_id}:/{quote(filename, safe='')}")
    r = requests.get(url, headers=h, timeout=15)
    if r.status_code == 200:
        dl = r.json().get("@microsoft.graph.downloadUrl", "")
        if dl:
            _cache_set(key, dl)
        return dl
    return ""


def _download_url_by_id(token, sp_id):
    """Download-URL + Dateiname ueber die SharePoint-Item-Id aufloesen.

    Unabhaengig vom Dateinamen und damit immun gegen Sonderzeichen und
    spaetere Umbenennungen. Rueckgabe: (download_url, name).
    """
    key = "id:" + sp_id
    cached = _cache_get(key, URL_TTL)
    if cached:
        return cached
    h = {"Authorization": "Bearer " + token, "Accept": "application/json"}
    url = f"https://graph.microsoft.com/v1.0/drives/{SP_DRIVE}/items/{sp_id}"
    r = requests.get(url, headers=h, timeout=15)
    if r.status_code == 200:
        data = r.json()
        dl = data.get("@microsoft.graph.downloadUrl", "")
        if dl:
            val = (dl, data.get("name", ""))
            _cache_set(key, val)
            return val
    return ("", "")


_MIME = {
    "jpg": "image/jpeg", "jpeg": "image/jpeg", "png": "image/png",
    "gif": "image/gif", "webp": "image/webp", "bmp": "image/bmp",
}


def _mime_for(filename):
    ext = filename.rsplit(".", 1)[-1].lower() if "." in filename else ""
    return _MIME.get(ext, "application/octet-stream")


def _err(msg, code):
    return func.HttpResponse(msg, status_code=code, headers=_cors())


def _valid_datei(name):
    """Dateiname ohne Pfadanteil.

    Umlaute und andere Nicht-ASCII-Zeichen sind ausdruecklich erlaubt: Die
    Bilder werden nach dem Gericht benannt (z. B.
    "mt_..._champignonsrahmsosse_ae3590.png" mit scharfem S), und eine reine
    ASCII-Pruefung hat solche Dateien faelschlich abgewiesen. Verboten bleibt
    alles, womit man den Ordner verlassen koennte.
    """
    if not name or len(name) > 300:
        return False
    if any(c in name for c in ("/", "\\", ":", "?", "#", "%")):
        return False
    if ".." in name:
        return False
    return not any(ord(c) < 32 for c in name)


def main(req: func.HttpRequest) -> func.HttpResponse:
    if req.method == "OPTIONS":
        return func.HttpResponse(status_code=200, headers=_cors())

    datei = (req.params.get("datei") or "").strip()
    sp_id = (req.params.get("sp_id") or "").strip()
    if not datei and not sp_id:
        return _err("datei oder sp_id fehlt", 400)
    if sp_id and not re.match(r"^[A-Za-z0-9!._-]{1,200}$", sp_id):
        return _err("ungueltige sp_id", 400)
    if datei and not _valid_datei(datei):
        return _err("ungueltiger Dateiname", 400)

    # Gewuenschte Breite: 44px-Vorschaubilder brauchen kein 1400px-Bild.
    try:
        breite = int(req.params.get("max") or STD_BREITE)
    except ValueError:
        breite = STD_BREITE
    breite = max(MIN_BREITE, min(MAX_BREITE, breite))

    # Fertiges Bild schon da? Dann ohne Graph-Aufruf und ohne Verkleinern
    # ausliefern - das spart pro Aufruf mehrere Sekunden.
    schluessel = "img:" + (("id:" + sp_id) if sp_id else ("datei:" + datei)) + ":" + str(breite)
    fertig = _img_get(schluessel)
    if fertig:
        kopf = _cors()
        kopf["Content-Type"] = fertig[1]
        kopf["Cache-Control"] = "public, max-age=86400"
        return func.HttpResponse(fertig[0], status_code=200, headers=kopf)

    token = _get_token()
    if not token:
        return _err("Auth fehlgeschlagen", 500)

    if sp_id:
        dl, name = _download_url_by_id(token, sp_id)
        if dl:
            return _liefere(dl, name or datei or "bild.jpg", schluessel, breite)
        # Item-Id loest nicht mehr auf (Bild ersetzt/verschoben) -> ueber den
        # mitgegebenen Dateinamen weiterversuchen statt aufzugeben.
        if not datei:
            return _err("Bild nicht gefunden", 404)

    folder_id = _find_folder(token)
    if not folder_id:
        return _err("Ordner nicht gefunden", 404)

    dl = _download_url(token, folder_id, datei)
    if not dl:
        return _err("Bild nicht gefunden", 404)

    return _liefere(dl, datei, schluessel, breite)


def _liefere(dl, datei, schluessel=None, breite=STD_BREITE):
    """Bild herunterladen, verkleinern und mit CORS-Kopfzeilen ausliefern."""
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
            max_w = breite
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
        if schluessel:
            _img_set(schluessel, (content, ctype))
        headers = _cors()
        headers["Content-Type"] = ctype
        # Bild darf gecacht werden (Inhalt aendert sich pro Dateiname nicht).
        headers["Cache-Control"] = "public, max-age=86400"
        return func.HttpResponse(content, status_code=200, headers=headers)
    except Exception:
        return _err("Bild-Download fehlgeschlagen", 502)
