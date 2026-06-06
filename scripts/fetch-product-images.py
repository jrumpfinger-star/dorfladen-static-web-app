"""
Sucht Produktbilder für Artikel ohne Bild in SharePoint StrichcodeBilder.
Primäre Quelle: EDEKA sellyorder (C+C Großmarkt) – Suche per ArtikelnummerEdeka.
Sekundär: Open Food Facts (per EAN).
Bilder werden freigestellt (Hintergrund entfernt) und als PNG gespeichert.
Key = Strichcode (EAN).
"""
import json
import os
import sys
import re
import io
import time
import logging
import msal
import requests
from PIL import Image
from rembg import remove

logging.basicConfig(level=logging.INFO, format="%(asctime)s  %(message)s")
log = logging.getLogger(__name__)

# ── Credentials aus local.settings.json ──
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
SETTINGS_PATH = os.path.join(SCRIPT_DIR, "..", "api", "local.settings.json")
with open(SETTINGS_PATH) as f:
    settings = json.load(f).get("Values", {})

TENANT_ID = settings.get("DV_TENANT_ID", "acfaedd4-c403-43b7-9544-fdb2b150124e")
CLIENT_ID = settings.get("DV_CLIENT_ID", "137b2df6-be83-459a-ac89-9efd0bdf51c4")
CLIENT_SECRET = settings.get("DV_CLIENT_SECRET", "")
DV_URL = settings.get("DV_DEFAULT_URL", "https://orgab4e2f00.crm16.dynamics.com")

SP_DRIVE = "b!bwUha0ab4EeiA3xXHK-Oobhv5tJbeYJDiF9pTB-f1kC-Mp-AY0brRrr2WigdYK4A"
SP_BARCODE_FOLDER = "01USAQ6ESD7NCQ4ZM6GRHK5IRCMJMSRSVH"

if not CLIENT_SECRET:
    print("ERROR: DV_CLIENT_SECRET nicht gefunden in local.settings.json")
    sys.exit(1)


# ── Token-Helfer ──
def get_dv_token():
    app = msal.ConfidentialClientApplication(CLIENT_ID, authority=f"https://login.microsoftonline.com/{TENANT_ID}", client_credential=CLIENT_SECRET)
    return app.acquire_token_for_client(scopes=[f"{DV_URL}/.default"]).get("access_token")

def get_graph_token():
    app = msal.ConfidentialClientApplication(CLIENT_ID, authority=f"https://login.microsoftonline.com/{TENANT_ID}", client_credential=CLIENT_SECRET)
    return app.acquire_token_for_client(scopes=["https://graph.microsoft.com/.default"]).get("access_token")


# ── Dataverse: Alle Artikel der letzten 6 Monate ──
def fetch_all_pages(url, headers):
    items = []
    cur = url
    for _ in range(30):
        r = requests.get(cur, headers=headers, timeout=60)
        if r.status_code != 200:
            break
        data = r.json()
        items.extend(data.get("value", []))
        nxt = data.get("@odata.nextLink")
        if not nxt:
            break
        cur = nxt
    return items


# ── SharePoint: Batch-Prüfung ob Bilder existieren ──
def sp_batch_check(graph_token, strichcodes):
    """Prüft per Graph $batch API welche Strichcodes bereits ein Bild haben.
    Gibt ein Set der Strichcodes MIT Bild zurück."""
    found = set()
    hdrs = {"Authorization": f"Bearer {graph_token}", "Content-Type": "application/json"}

    # Baue Batch-Requests: für jeden Strichcode prüfe .png und .jpg
    all_reqs = []
    id_to_sc = {}
    idx = 0
    for sc in strichcodes:
        for ext in ("png", "jpg"):
            idx += 1
            rid = str(idx)
            all_reqs.append({"id": rid, "method": "GET",
                             "url": f"/drives/{SP_DRIVE}/items/{SP_BARCODE_FOLDER}:/{sc}.{ext}"})
            id_to_sc[rid] = sc

    # Graph $batch erlaubt max 20 pro Batch
    for start in range(0, len(all_reqs), 20):
        chunk = all_reqs[start:start + 20]
        try:
            r = requests.post("https://graph.microsoft.com/v1.0/$batch",
                              headers=hdrs, json={"requests": chunk}, timeout=30)
            if r.status_code == 200:
                for resp in r.json().get("responses", []):
                    if resp.get("status") == 200:
                        sc = id_to_sc.get(resp.get("id", ""))
                        if sc:
                            found.add(sc)
        except Exception as e:
            log.warning(f"  Batch-Fehler: {e}")

    return found


# ── Hilfsfunktion: Ist es eine echte EAN? ──
def is_real_ean(code):
    """Echte EANs haben mindestens 8 Stellen und bestehen nur aus Ziffern."""
    return bool(code) and code.isdigit() and len(code) >= 8


# ── Bildvalidierung ──
def validate_image(img_bytes):
    """Prüft ob das Bild ein sinnvolles Produktbild sein könnte."""
    try:
        img = Image.open(io.BytesIO(img_bytes))
        w, h = img.size
        # Zu klein = wahrscheinlich Icon/Platzhalter
        if w < 100 or h < 100:
            return False
        # Extrem breites/hohes Bild = wahrscheinlich Banner/Screenshot
        ratio = max(w, h) / max(min(w, h), 1)
        if ratio > 4:
            return False
        return True
    except:
        return False


# ── sellyorder Session ──
SELLY_BASE = "https://home.sellyorder.de"
SELLY_USER = "Dorfladen Oberornau"
SELLY_PASS = "Edeka2024!"

_selly_session = None

def _get_selly_session():
    """Login bei sellyorder und Session-Cookie zurückgeben."""
    global _selly_session
    if _selly_session:
        return _selly_session

    s = requests.Session()
    s.headers["User-Agent"] = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0"

    # Login-Seite laden (JSESSIONID Cookie holen)
    r = s.get(f"{SELLY_BASE}/webapp/apps/Home.faces", timeout=30)
    if r.status_code != 200:
        log.error(f"sellyorder Login-Seite Fehler: {r.status_code}")
        return None

    html = r.text
    vs_match = re.search(r'name="javax\.faces\.ViewState"[^>]*value="([^"]*)"', html)
    form_match = re.search(r'name="(subview1:[^"]*loginpane:form1)"', html)
    if not vs_match or not form_match:
        log.error("sellyorder Login-Form nicht gefunden")
        return None

    form_name = form_match.group(1)
    view_state = vs_match.group(1)

    # Login POST – Feldnamen: usrname, usrpwd
    data = {
        form_name: form_name,
        "usrname": SELLY_USER,
        "usrpwd": SELLY_PASS,
        "task": "login",
        f"{form_name}:button1": f"{form_name}:button1",
        "javax.faces.ViewState": view_state,
    }
    r = s.post(f"{SELLY_BASE}/webapp/apps/Home.faces", data=data, timeout=30, allow_redirects=True)
    if "Sign out" not in r.text and "Abmelden" not in r.text and "logout" not in r.text.lower():
        log.error("sellyorder Login fehlgeschlagen")
        return None

    log.info("sellyorder Login erfolgreich")
    _selly_session = s
    return s


_selly_wst_loaded = False

def _search_selly(session, edeka_nr):
    """Sucht einen Artikel per EDEKA-Artikelnummer in sellyorder.
    Gibt (picid, ean) zurück oder (None, None)."""
    global _selly_wst_loaded

    # WST-Seite laden (nur beim ersten Mal oder bei Fehler)
    if not _selly_wst_loaded:
        r = session.get(f"{SELLY_BASE}/webapp/apps/order/WST.faces", timeout=30)
        _selly_wst_loaded = True
    else:
        r = session.get(f"{SELLY_BASE}/webapp/apps/order/WST.faces", timeout=30)

    html = r.text

    vs_match = re.search(r'name="javax\.faces\.ViewState"[^>]*value="([^"]*)"', html)
    form_match = re.search(r'name="(subview1:[^"]*wstsearchpane[^"]*)"[^>]*value="\1"', html)
    search_input_match = re.search(r'name="(subview1:[^"]*in_wstSrch)"', html)
    search_btn_match = re.search(r'id="(subview1:[^"]*cl_doWSTSearch)"', html)

    if not vs_match or not search_input_match:
        log.warning("sellyorder Suchformular nicht gefunden")
        return None, None

    form_name = form_match.group(1) if form_match else ""
    search_input = search_input_match.group(1)
    search_btn = search_btn_match.group(1) if search_btn_match else ""

    data = {
        form_name: form_name,
        search_input: edeka_nr,
        search_btn: search_btn,
        "javax.faces.ViewState": vs_match.group(1),
    }
    try:
        r = session.post(f"{SELLY_BASE}/webapp/apps/order/WST.faces", data=data, timeout=30)
    except Exception as e:
        log.warning(f"sellyorder Suche Fehler: {e}")
        return None, None

    html = r.text

    if "could not find any results" in html or "keine Treffer" in html.lower():
        return None, None

    # picid extrahieren (erstes Produktbild)
    picid_match = re.search(r'picid=(\d+)', html)
    # EAN extrahieren
    ean_match = re.search(r'EAN:\s*</span>\s*(\d{8,14})', html)

    picid = picid_match.group(1) if picid_match else None
    ean = ean_match.group(1) if ean_match else None

    return picid, ean


def _download_selly_image(session, picid, size=400):
    """Lädt ein Produktbild von sellyorder per picid herunter."""
    url = f"{SELLY_BASE}/portal/ImageServlet?width={size}&height={size}&fwidth={size+10}&fheight={size+10}&picid={picid}"
    r = session.get(url, timeout=20)
    if r.status_code == 200 and len(r.content) > 1000:
        ct = r.headers.get("Content-Type", "")
        if "image" in ct and validate_image(r.content):
            return r.content
    return None


# ── Hintergrund entfernen + PNG ──
def remove_background(img_bytes):
    """Entfernt den Hintergrund und gibt freigestelltes PNG zurück."""
    result = remove(img_bytes)
    img = Image.open(io.BytesIO(result))
    img = img.convert("RGBA")
    buf = io.BytesIO()
    img.save(buf, format="PNG", optimize=True)
    return buf.getvalue()


# ── Bild suchen ──
def search_product_image(bezeichnung, strichcode, edeka_nr, selly_session):
    ua = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0"
    hdrs = {"User-Agent": ua}
    ean = strichcode if is_real_ean(strichcode) else ""

    # 1) PRIMÄR: sellyorder per EDEKA-Artikelnummer
    if selly_session and edeka_nr and len(edeka_nr) >= 3:
        picid, selly_ean = _search_selly(selly_session, edeka_nr)
        if picid:
            img_bytes = _download_selly_image(selly_session, picid)
            if img_bytes:
                return img_bytes, "sellyorder"
        time.sleep(0.5)

    # 2) Open Food Facts (per echte EAN)
    if ean:
        try:
            r = requests.get(
                f"https://world.openfoodfacts.org/api/v2/product/{ean}.json?fields=image_front_url,image_url",
                headers=hdrs, timeout=10
            )
            if r.status_code == 200:
                p = r.json().get("product", {})
                img = p.get("image_front_url") or p.get("image_url") or ""
                if img:
                    ir = requests.get(img, headers=hdrs, timeout=15)
                    if ir.status_code == 200 and len(ir.content) > 2000 and validate_image(ir.content):
                        return ir.content, "openfoodfacts"
        except:
            pass

    return None, None


# ── Upload nach SharePoint ──
def upload_to_sp(graph_token, strichcode, png_bytes):
    filename = f"{strichcode}.png"
    url = f"https://graph.microsoft.com/v1.0/drives/{SP_DRIVE}/items/{SP_BARCODE_FOLDER}:/{filename}:/content"
    r = requests.put(
        url,
        headers={"Authorization": f"Bearer {graph_token}", "Content-Type": "image/png"},
        data=png_bytes,
        timeout=60
    )
    return r.status_code in (200, 201)


CACHE_FILE = os.path.join(SCRIPT_DIR, "missing-images-cache.json")


def scan_missing(dv_hdrs, graph_token):
    """Scannt SharePoint und speichert fehlende Artikel in Cache-Datei."""
    from datetime import datetime, timedelta

    cutoff = (datetime.utcnow() - timedelta(days=180)).strftime("%Y-%m-%dT00:00:00Z")
    url = (f"{DV_URL}/api/data/v9.2/cr5d4_tables"
           f"?$select=cr5d4_artikelnummeredeka,cr5d4_artikelbezeichnung,cr5d4_strichcode,cr5d4_warengruppebez"
           f"&$filter=cr5d4_artikelletzterverkauf gt {cutoff}"
           f"&$orderby=cr5d4_artikelbezeichnung asc")
    articles = fetch_all_pages(url, dv_hdrs)
    log.info(f"Artikel geladen: {len(articles)} (letzte 6 Monate)")

    with_sc = [a for a in articles if (a.get("cr5d4_strichcode") or "").strip()]
    log.info(f"Davon mit Strichcode: {len(with_sc)}")

    all_sc = [a["cr5d4_strichcode"].strip() for a in with_sc]
    log.info(f"Prüfe SharePoint per Batch ({len(all_sc)} Strichcodes)...")

    has_image = set()
    for start in range(0, len(all_sc), 10):
        chunk = all_sc[start:start + 10]
        found = sp_batch_check(graph_token, chunk)
        has_image.update(found)
        if (start + 10) % 100 == 0:
            log.info(f"  ... {min(start+10, len(all_sc))}/{len(all_sc)} geprüft")

    missing = []
    for a in with_sc:
        sc = a["cr5d4_strichcode"].strip()
        if sc not in has_image:
            missing.append({
                "strichcode": sc,
                "bezeichnung": (a.get("cr5d4_artikelbezeichnung") or "").strip(),
                "warengruppe": (a.get("cr5d4_warengruppebez") or "").strip(),
                "edeka_nr": (a.get("cr5d4_artikelnummeredeka") or "").strip()
            })

    log.info(f"Artikel OHNE Bild: {len(missing)}")
    with open(CACHE_FILE, "w", encoding="utf-8") as f:
        json.dump(missing, f, ensure_ascii=False, indent=2)
    log.info(f"Cache gespeichert: {CACHE_FILE}")
    return missing


# ══════════════════════════════════════════
#  MAIN
# ══════════════════════════════════════════
def main():
    args = sys.argv[1:]
    force_scan = "--scan" in args
    limit = 9999
    for a in args:
        if a.isdigit():
            limit = int(a)

    log.info(f"=== Produktbild-Suche (Limit: {limit}) ===")

    graph_token = get_graph_token()
    if not graph_token:
        log.error("Graph-Token-Fehler!")
        sys.exit(1)

    # Cache laden oder neu scannen
    if not force_scan and os.path.exists(CACHE_FILE):
        with open(CACHE_FILE, "r", encoding="utf-8") as f:
            missing = json.load(f)
        log.info(f"Cache geladen: {len(missing)} Artikel ohne Bild ({CACHE_FILE})")
    else:
        dv_token = get_dv_token()
        if not dv_token:
            log.error("DV-Token-Fehler!")
            sys.exit(1)
        dv_hdrs = {
            "Authorization": f"Bearer {dv_token}",
            "OData-MaxVersion": "4.0", "OData-Version": "4.0",
            "Accept": "application/json", "Content-Type": "application/json; charset=utf-8"
        }
        missing = scan_missing(dv_hdrs, graph_token)

    if not missing:
        log.info("Alle Artikel haben bereits Bilder!")
        return

    # Sortiere: Artikel MIT edeka_nr zuerst (sellyorder-fähig)
    missing.sort(key=lambda a: (0 if a.get("edeka_nr", "").strip() else 1))
    with_enr = sum(1 for a in missing if a.get("edeka_nr", "").strip())
    log.info(f"Davon mit Edeka-Nr (sellyorder-fähig): {with_enr}")

    # sellyorder Login
    selly_session = _get_selly_session()
    if not selly_session:
        log.warning("sellyorder nicht verfügbar – nur Open Food Facts wird genutzt")

    # Bilder suchen und hochladen
    uploaded = 0
    not_found = 0
    errors = 0
    remaining = []

    total = min(limit, len(missing))
    for i, art in enumerate(missing[:limit]):
        sc = art["strichcode"]
        bez = art["bezeichnung"]
        wg = art["warengruppe"]
        enr = art.get("edeka_nr", "")
        log.info(f"[{i+1}/{total}] {bez}  (EAN: {sc}, Edeka-Nr: {enr}, WG: {wg})")

        img_bytes, source = search_product_image(bez, sc, enr, selly_session)
        if not img_bytes:
            log.info(f"  - Kein Bild gefunden")
            not_found += 1
            remaining.append(art)
            continue

        log.info(f"  Bild gefunden: {len(img_bytes)//1024} KB ({source})")

        try:
            log.info(f"  Freistellen...")
            png_bytes = remove_background(img_bytes)
            log.info(f"  Freigestellt: {len(png_bytes)//1024} KB PNG")
        except Exception as e:
            log.error(f"  FEHLER Freistellen: {e}")
            errors += 1
            remaining.append(art)
            continue

        if upload_to_sp(graph_token, sc, png_bytes):
            log.info(f"  OK Hochgeladen: {sc}.png")
            uploaded += 1
        else:
            log.error(f"  FEHLER Upload fehlgeschlagen")
            errors += 1
            remaining.append(art)

        time.sleep(1)

    # Cache aktualisieren: nur noch nicht-verarbeitete + Rest behalten
    remaining.extend(missing[limit:])
    with open(CACHE_FILE, "w", encoding="utf-8") as f:
        json.dump(remaining, f, ensure_ascii=False, indent=2)

    log.info(f"\n=== FERTIG ===")
    log.info(f"Verarbeitet:      {total}")
    log.info(f"Hochgeladen:      {uploaded}")
    log.info(f"Nicht gefunden:   {not_found}")
    log.info(f"Fehler:           {errors}")
    log.info(f"Verbleibend:      {len(remaining)}")


if __name__ == "__main__":
    main()
