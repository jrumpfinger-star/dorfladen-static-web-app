"""
Shop Order API
POST: Place a new order (requires JWT)
GET: Fetch orders (customer: own orders; CMS: all orders)
PATCH: Update order status (CMS only)

Abholtermin: Wird vom Frontend als Slot (Datum + Zeitfenster) mitgesendet.
Die Slots basieren auf den Öffnungszeiten aus /api/hours.
Fallback: _calc_abholdatum() mit BESTELLSCHLUSS_HOUR (nur für ältere Clients).
Mindestbestellwert: Aus CMS-Config (dl_seiteninhalt, Schlüssel 'shop_mindestbestellwert'),
Fallback MINDESTBESTELLWERT_DEFAULT.
"""
import azure.functions as func
import json
import os
import sys
import uuid
import logging
import msal
import requests
import jwt
from datetime import datetime, timedelta


DEFAULT_URL_SETTING = "DV_DEFAULT_URL"
DEFAULT_URL_FALLBACK = "https://orgab4e2f00.crm16.dynamics.com"
ENTITY_SET = "dl_shopbestellungs"
JWT_SECRET = os.environ.get("SHOP_JWT_SECRET", "dorfladen-shop-secret-change-in-production-2026")

# Order statuses
STATUS_NEU = 0
STATUS_IN_BEARBEITUNG = 1
STATUS_ABHOLBEREIT = 2
STATUS_ABGEHOLT = 3
STATUS_STORNIERT = 4

STATUS_LABELS = {0: "Neu", 1: "In Bearbeitung", 2: "Abholbereit", 3: "Abgeholt", 4: "Storniert"}
BESTELLSCHLUSS_HOUR = 16  # Fallback, nur verwendet wenn Frontend keinen Slot sendet
MINDESTBESTELLWERT_DEFAULT = 10.0  # Fallback – wird aus CMS-Config überschrieben


def _load_mindestbestellwert(base_url, headers):
    """Load shop_mindestbestellwert from CMS-Config (dl_seiteninhalt). Returns float."""
    try:
        url = f"{base_url}/api/data/v9.2/dl_seiteninhalts?$filter=dl_schluessel eq 'shop_mindestbestellwert'&$select=dl_wert&$top=1"
        r = requests.get(url, headers=headers, timeout=10)
        if r.status_code == 200:
            items = r.json().get("value", [])
            if items:
                val = items[0].get("dl_wert", "")
                return float(val)
    except Exception as e:
        logging.debug(f"[shop-order] CMS-Config load failed: {e}")
    return MINDESTBESTELLWERT_DEFAULT


def get_token():
    tenant_id = os.environ.get("DV_TENANT_ID", "acfaedd4-c403-43b7-9544-fdb2b150124e")
    client_id = os.environ.get("DV_CLIENT_ID", "137b2df6-be83-459a-ac89-9efd0bdf51c4")
    client_secret = os.environ.get("DV_CLIENT_SECRET", "")
    target_url = os.environ.get(DEFAULT_URL_SETTING, DEFAULT_URL_FALLBACK)
    if not client_secret:
        return None
    try:
        a = msal.ConfidentialClientApplication(
            client_id,
            authority=f"https://login.microsoftonline.com/{tenant_id}",
            client_credential=client_secret,
        )
        r = a.acquire_token_for_client(scopes=[f"{target_url}/.default"])
        return r.get("access_token")
    except:
        return None


def get_cors_headers():
    return {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, POST, PATCH, OPTIONS",
        "Access-Control-Allow-Headers": "*",
        "Content-Type": "application/json; charset=utf-8"
    }


def _base_url():
    return os.environ.get(DEFAULT_URL_SETTING, DEFAULT_URL_FALLBACK)


def _headers(token):
    return {
        "Authorization": f"Bearer {token}",
        "OData-MaxVersion": "4.0",
        "OData-Version": "4.0",
        "Accept": "application/json",
        "Content-Type": "application/json; charset=utf-8"
    }


def _verify_jwt(req):
    """Extract and verify JWT from X-Shop-Token header.
    Note: Azure SWA replaces the Authorization header with its own internal token,
    so we use a custom header instead.
    """
    token_str = req.headers.get("X-Shop-Token", "")
    if not token_str:
        # Fallback: try Authorization header (for local dev)
        auth = req.headers.get("Authorization", "")
        if auth.startswith("Bearer "):
            token_str = auth[7:]
    if not token_str:
        return None
    try:
        return jwt.decode(token_str, JWT_SECRET, algorithms=["HS256"])
    except Exception as e:
        logging.error(f"JWT verify failed: {type(e).__name__}: {e}")
        return None



def _ostern(year):
    """Gauss-Osterformel: Ostersonntag berechnen."""
    a = year % 19
    b, c = divmod(year, 100)
    d, e = divmod(b, 4)
    f = (b + 8) // 25
    g = (b - f + 1) // 3
    h = (19 * a + b - d - g + 15) % 30
    i, k = divmod(c, 4)
    l = (32 + 2 * e + 2 * i - h - k) % 7
    m = (a + 11 * h + 22 * l) // 451
    month = (h + l - 7 * m + 114) // 31
    day = ((h + l - 7 * m + 114) % 31) + 1
    return datetime(year, month, day)


def _bayern_feiertage(year):
    """Alle gesetzlichen Feiertage in Bayern für ein Jahr."""
    o = _ostern(year)
    feiertage = [
        datetime(year, 1, 1),    # Neujahr
        datetime(year, 1, 6),    # Hl. Drei Könige
        o + timedelta(days=-2),  # Karfreitag
        o + timedelta(days=1),   # Ostermontag
        datetime(year, 5, 1),    # Tag der Arbeit
        o + timedelta(days=39),  # Christi Himmelfahrt
        o + timedelta(days=50),  # Pfingstmontag
        o + timedelta(days=60),  # Fronleichnam
        datetime(year, 8, 15),   # Mariä Himmelfahrt
        datetime(year, 10, 3),   # Tag der dt. Einheit
        datetime(year, 11, 1),   # Allerheiligen
        datetime(year, 12, 25),  # 1. Weihnachtstag
        datetime(year, 12, 26),  # 2. Weihnachtstag
    ]
    return {d.strftime("%Y-%m-%d") for d in feiertage}


_feiertag_cache = {}

def _is_feiertag(d):
    """Prüft ob ein Datum ein bayerischer Feiertag ist."""
    y = d.year
    if y not in _feiertag_cache:
        _feiertag_cache[y] = _bayern_feiertage(y)
    return d.strftime("%Y-%m-%d") in _feiertag_cache[y]


def _is_closed(d):
    """Prüft ob der Laden an diesem Tag geschlossen ist (Sonntag oder Feiertag)."""
    return d.weekday() == 6 or _is_feiertag(d)


def _calc_abholdatum():
    """Calculate pickup date based on order time.
    Before 16:00 → next business day morning
    After 16:00 → day after next business day morning
    Skip Sundays and Bavarian public holidays
    """
    now = datetime.utcnow() + timedelta(hours=2)  # CET/CEST approximation
    hour = now.hour

    if hour < BESTELLSCHLUSS_HOUR:
        abhol = now + timedelta(days=1)
    else:
        abhol = now + timedelta(days=2)

    # Skip Sundays and Feiertage
    while _is_closed(abhol):
        abhol += timedelta(days=1)

    return abhol.strftime("%Y-%m-%d")


def _parse_zeitslot(raw):
    """Parse dl_abhol_zeitslot JSON string into dict, with fallback."""
    if not raw:
        return {"period": "vm", "label": "Vormittag", "von": "", "bis": ""}
    try:
        return json.loads(raw)
    except Exception:
        return {"period": "vm", "label": "Vormittag", "von": "", "bis": ""}


def _generate_bestellnummer():
    """Generate unique order number: DL-YYYYMMDD-XXXX"""
    now = datetime.utcnow() + timedelta(hours=2)
    return f"DL-{now.strftime('%Y%m%d')}-{uuid.uuid4().hex[:4].upper()}"


def _handle_post(req, dv_token, base_url, headers):
    """Place a new order."""
    user = _verify_jwt(req)
    if not user:
        return func.HttpResponse(
            json.dumps({"success": False, "error": "Bitte melden Sie sich an."}, ensure_ascii=False),
            status_code=401, headers=get_cors_headers()
        )

    try:
        body = req.get_json()
    except:
        return func.HttpResponse(
            json.dumps({"success": False, "error": "Ungültiger JSON-Body"}),
            status_code=400, headers=get_cors_headers()
        )

    positionen = body.get("positionen", [])
    anmerkungen = (body.get("anmerkungen") or "").strip()
    abholslot = body.get("abholslot")  # {datum, period, label, abhol_von, abhol_bis}

    if not positionen:
        return func.HttpResponse(
            json.dumps({"success": False, "error": "Warenkorb ist leer."}, ensure_ascii=False),
            status_code=400, headers=get_cors_headers()
        )

    # Validate positions and calculate total
    gesamtsumme = 0
    clean_positionen = []
    for pos in positionen:
        artnr = (pos.get("artikelnummer") or "").strip()
        bezeichnung = (pos.get("bezeichnung") or "").strip()
        menge = pos.get("menge", 0)
        einheit = (pos.get("einheit") or "Stück").strip()
        einzelpreis = pos.get("einzelpreis", 0)

        if not bezeichnung or menge <= 0:
            continue

        positionspreis = round(einzelpreis * menge, 2)
        gesamtsumme += positionspreis
        strichcode = (pos.get("strichcode") or "").strip()
        clean_positionen.append({
            "artikelnummer": artnr,
            "bezeichnung": bezeichnung,
            "menge": menge,
            "einheit": einheit,
            "einzelpreis": einzelpreis,
            "positionspreis": positionspreis,
            "strichcode": strichcode,
            "gepackt": False,
            "gepackt_menge": 0
        })

    if not clean_positionen:
        return func.HttpResponse(
            json.dumps({"success": False, "error": "Keine gültigen Positionen im Warenkorb."}, ensure_ascii=False),
            status_code=400, headers=get_cors_headers()
        )

    # Mindestbestellwert prüfen (aus CMS-Config oder Default)
    mindestbestellwert = _load_mindestbestellwert(base_url, headers)
    if gesamtsumme < mindestbestellwert:
        return func.HttpResponse(
            json.dumps({"success": False, "error": f"Der Mindestbestellwert beträgt {mindestbestellwert:.2f} €. Aktueller Warenkorbwert: {gesamtsumme:.2f} €.", "mindestbestellwert": mindestbestellwert, "aktuell": round(gesamtsumme, 2)}, ensure_ascii=False),
            status_code=400, headers=get_cors_headers()
        )

    bestellnummer = _generate_bestellnummer()
    now_str = datetime.utcnow().strftime("%Y-%m-%dT%H:%M:%SZ")

    # Abholslot: vom Kunden gewählt, Fallback auf altes System
    if abholslot and isinstance(abholslot, dict) and abholslot.get("datum"):
        abholdatum = abholslot["datum"]
        abhol_period = abholslot.get("period", "vm")
        abhol_label = abholslot.get("label", "Vormittag")
        abhol_von = abholslot.get("abhol_von", "")
        abhol_bis = abholslot.get("abhol_bis", "")
        abhol_display = f"Abholung: {abholdatum} {abhol_label} ({abhol_von}–{abhol_bis} Uhr)"
    else:
        abholdatum = _calc_abholdatum()
        abhol_period = "vm"
        abhol_label = "Vormittag"
        abhol_von = "07:30"
        abhol_bis = "14:00"
        abhol_display = f"Abholung: {abholdatum} vormittags"

    # Load customer IBAN + Kontoinhaber for Beipackzettel
    iban_masked = ""
    kontoinhaber = ""
    try:
        import base64
        cust_email = user["email"]
        cust_url = f"{base_url}/api/data/v9.2/dl_shopkundes?$filter=dl_email eq '{cust_email}'&$select=dl_iban_encrypted,dl_kontoinhaber&$top=1"
        cr = requests.get(cust_url, headers=headers, timeout=15)
        if cr.status_code == 200:
            cust_items = cr.json().get("value", [])
            if cust_items:
                kontoinhaber = cust_items[0].get("dl_kontoinhaber", "")
                enc_iban = cust_items[0].get("dl_iban_encrypted", "")
                if enc_iban and enc_iban.startswith("ENC:"):
                    raw_iban = base64.b64decode(enc_iban[4:]).decode()
                    iban_masked = raw_iban[:4] + " **** **** **** " + raw_iban[-4:] if len(raw_iban) >= 8 else raw_iban
    except Exception as e:
        logging.warning(f"[shop-order] Could not load customer IBAN: {e}")

    payload = {
        "dl_bestellnummer": bestellnummer,
        "dl_kunde_email": user["email"],
        "dl_kunde_name": user.get("name", ""),
        "dl_kunde_id": user["sub"],
        "dl_bestelldatum": now_str,
        "dl_abholdatum": abholdatum,
        "dl_abhol_zeitslot": json.dumps({"period": abhol_period, "label": abhol_label, "von": abhol_von, "bis": abhol_bis}, ensure_ascii=False),
        "dl_status": STATUS_NEU,
        "dl_gesamtsumme": round(gesamtsumme, 2),
        "dl_anmerkungen": anmerkungen,
        "dl_positionen_json": json.dumps(clean_positionen, ensure_ascii=False),
    }
    # IBAN/Kontoinhaber: nur setzen wenn Felder in Dataverse existieren
    # Werden vorerst im Kundenstamm (dl_shopkundes) abgerufen statt in der Bestellung gespeichert

    logging.info(f"[shop-order] POST payload keys: {list(payload.keys())}")
    logging.info(f"[shop-order] POST payload: {json.dumps(payload, ensure_ascii=False, default=str)[:2000]}")

    try:
        post_headers = {**headers, "Prefer": "return=representation"}
        r = requests.post(f"{base_url}/api/data/v9.2/{ENTITY_SET}", headers=post_headers, json=payload, timeout=30)
        if r.status_code in (200, 201, 204):
            # Send confirmation email (best-effort, direct import)
            try:
                api_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
                if api_dir not in sys.path:
                    sys.path.insert(0, api_dir)
                from importlib import import_module
                notify_mod = import_module("shop-notify")
                ci = notify_mod.get_contact_info()
                laden_name = ci["name"]
                kunde_name = user.get("name", "")
                anrede = f"Liebe/r {kunde_name}" if kunde_name else "Liebe Kundin, lieber Kunde"
                slot_display = f"{abhol_label} ({abhol_von}–{abhol_bis} Uhr)" if abhol_von else abhol_label
                # Format date to German dd.mm.yyyy
                abholdatum_de = abholdatum
                try:
                    dp = abholdatum[:10].split("-")
                    if len(dp) == 3:
                        abholdatum_de = f"{dp[2]}.{dp[1]}.{dp[0]}"
                except Exception:
                    pass
                zahlungsart = "Lastschrift" if iban_masked else "Bar bei Abholung"
                email_subject = f"{laden_name} – Bestellbestätigung {bestellnummer}"
                zahlung_text = zahlungsart
                if iban_masked:
                    zahlung_text += f" ({iban_masked})"
                email_body = (
                    f"{anrede},\n\n"
                    f"vielen Dank für Ihre Bestellung! Wir haben folgende Bestellung erhalten "
                    f"und beginnen in Kürze mit der Zusammenstellung.\n\n"
                    f"[info:clipboard-list] Bestellnummer: {bestellnummer}\n"
                    f"[info:calendar] Abholung: {abholdatum_de}, {slot_display}\n"
                    f"[info:map-pin] Ort: {laden_name}, {ci['adresse']}\n"
                    f"[info:credit-card] Zahlung: {zahlung_text}\n"
                )
                if anmerkungen:
                    email_body += f"\n[info:message-square] Ihre Anmerkung: {anmerkungen}\n"
                email_body += (
                    f"\nSie erhalten eine weitere E-Mail, sobald Ihre Bestellung zur "
                    f"Abholung bereitsteht.\n\n"
                    f"[warn] Bitte holen Sie Ihre Bestellung zum gewählten Abholtermin ab. "
                    f"Verderbliche Ware, die nicht abgeholt wird und nicht mehr verkaufbar ist, "
                    f"wird in Rechnung gestellt.\n\n"
                    f"Bei Fragen erreichen Sie uns unter {ci['telefon']} oder "
                    f"per E-Mail an {ci['email']}.\n\n"
                    f"Herzliche Grüße\n"
                    f"Ihr {laden_name}-Team"
                )
                # Build positions table
                def _fmt_price(v):
                    try:
                        return f"{float(v):,.2f}".replace(",", "X").replace(".", ",").replace("X", ".") + " €"
                    except (ValueError, TypeError):
                        return ""
                rows = ""
                for p in clean_positionen:
                    rows += (
                        f'<tr>'
                        f'<td style="padding:8px 10px;border-bottom:1px solid #f3f4f6;color:#1f2937">{p.get("bezeichnung","")}</td>'
                        f'<td style="padding:8px 6px;border-bottom:1px solid #f3f4f6;text-align:center;color:#6b7280">{p.get("menge","")} {p.get("einheit","")}</td>'
                        f'<td style="padding:8px 10px;border-bottom:1px solid #f3f4f6;text-align:right;color:#1f2937;white-space:nowrap">{_fmt_price(p.get("positionspreis",0))}</td>'
                        f'</tr>'
                    )
                positions_html = (
                    f'<div style="margin-top:16px;border:1px solid #e5e7eb;border-radius:10px;overflow:hidden">'
                    f'<div style="background:#f0fdf4;padding:10px 14px;font-size:12px;font-weight:700;color:#166534;border-bottom:1px solid #e5e7eb">'
                    f'{notify_mod._icon("clipboard-list", "#166534", 14)} Ihre Bestellung im Überblick</div>'
                    f'<table style="width:100%;border-collapse:collapse;font-size:13px">'
                    f'<thead><tr style="background:#f9fafb">'
                    f'<th style="padding:8px 10px;text-align:left;font-size:11px;font-weight:600;color:#6b7280">Artikel</th>'
                    f'<th style="padding:8px 6px;text-align:center;font-size:11px;font-weight:600;color:#6b7280">Menge</th>'
                    f'<th style="padding:8px 10px;text-align:right;font-size:11px;font-weight:600;color:#6b7280">Preis</th>'
                    f'</tr></thead>'
                    f'<tbody>{rows}</tbody>'
                    f'<tfoot><tr style="background:#f0fdf4">'
                    f'<td colspan="2" style="padding:10px;font-weight:700;color:#166534;font-size:14px">Gesamt (ca.)</td>'
                    f'<td style="padding:10px;text-align:right;font-weight:700;color:#166534;font-size:14px">{_fmt_price(gesamtsumme)}</td>'
                    f'</tr></tfoot>'
                    f'</table></div>'
                )
                notify_mod.send_email(user["email"], kunde_name, email_subject, email_body, positions_html)
                logging.info(f"[shop-order] Confirmation email sent to {user['email']}")
            except Exception as ne:
                logging.warning(f"[shop-order] Confirmation email failed (non-blocking): {ne}")

            # Send push notification to customer (best-effort)
            try:
                push_payload = {
                    "title": "✅ Bestellung bestätigt",
                    "message": f"Ihre Bestellung {bestellnummer} wurde aufgenommen. Abholung: {abhol_display}.",
                    "url": "/shop.html",
                    "target_email": user["email"],
                    "tag": f"order-{bestellnummer}",
                }
                swa_host = os.environ.get("SWA_HOSTNAME", "") or os.environ.get("WEBSITE_HOSTNAME", "localhost:7071")
                protocol = "https" if "azurestaticapps" in swa_host or "azure" in swa_host else "http"
                internal_url = f"{protocol}://{swa_host}/api/push-send"
                requests.post(internal_url, json=push_payload, timeout=10)
            except Exception:
                pass

            return func.HttpResponse(
                json.dumps({
                    "success": True,
                    "bestellnummer": bestellnummer,
                    "abholdatum": abholdatum,
                    "gesamtsumme": round(gesamtsumme, 2),
                    "positionen": len(clean_positionen),
                    "abhol_display": abhol_display,
                    "message": f"Bestellung {bestellnummer} aufgegeben! {abhol_display}"
                }, ensure_ascii=False),
                status_code=201, headers=get_cors_headers()
            )
        else:
            detail = r.text[:1000]
            logging.error(f"[shop-order] Dataverse POST {r.status_code}: {detail}")
            return func.HttpResponse(
                json.dumps({"success": False, "error": f"Dataverse {r.status_code}", "detail": detail}),
                status_code=500, headers=get_cors_headers()
            )
    except Exception as e:
        return func.HttpResponse(
            json.dumps({"success": False, "error": str(e)}),
            status_code=500, headers=get_cors_headers()
        )


def _handle_get(req, dv_token, base_url, headers):
    """Fetch orders. ?mode=cms → all orders. Otherwise: customer's own orders."""
    mode = req.params.get("mode", "")

    user = _verify_jwt(req)

    if mode == "pack":
        # Pack mode: single order for packing
        order_id = req.params.get("id", "")
        if not order_id:
            return func.HttpResponse(
                json.dumps({"success": False, "error": "Bestell-ID erforderlich"}),
                status_code=400, headers=get_cors_headers()
            )
        url = f"{base_url}/api/data/v9.2/{ENTITY_SET}({order_id})?$select=dl_shopbestellungid,dl_bestellnummer,dl_kunde_email,dl_kunde_name,dl_bestelldatum,dl_abholdatum,dl_abhol_zeitslot,dl_status,dl_gesamtsumme,dl_anmerkungen,dl_positionen_json,dl_pack_json"
        try:
            r = requests.get(url, headers=headers, timeout=30)
            if r.status_code == 200:
                item = r.json()
                positionen = json.loads(item.get("dl_positionen_json", "[]"))
                pack_data = json.loads(item.get("dl_pack_json") or "{}")
                return func.HttpResponse(
                    json.dumps({"success": True, "order": {
                        "id": item.get("dl_shopbestellungid", ""),
                        "bestellnummer": item.get("dl_bestellnummer", ""),
                        "kunde_name": item.get("dl_kunde_name", ""),
                        "kunde_email": item.get("dl_kunde_email", ""),
                        "abholdatum": item.get("dl_abholdatum", ""),
                        "abhol_zeitslot": _parse_zeitslot(item.get("dl_abhol_zeitslot", "")),
                        "status": item.get("dl_status", 0),
                        "gesamtsumme": item.get("dl_gesamtsumme", 0),
                        "anmerkungen": item.get("dl_anmerkungen", ""),
                        "positionen": positionen,
                        "pack_data": pack_data
                    }}, ensure_ascii=False),
                    status_code=200, headers=get_cors_headers()
                )
            return func.HttpResponse(
                json.dumps({"success": False, "error": f"Dataverse {r.status_code}"}),
                status_code=r.status_code, headers=get_cors_headers()
            )
        except Exception as e:
            return func.HttpResponse(
                json.dumps({"success": False, "error": str(e)}),
                status_code=500, headers=get_cors_headers()
            )

    if mode == "cms":
        # CMS mode: return all orders (no JWT required for now, add admin check later)
        url = f"{base_url}/api/data/v9.2/{ENTITY_SET}?$select=dl_shopbestellungid,dl_bestellnummer,dl_kunde_email,dl_kunde_name,dl_bestelldatum,dl_abholdatum,dl_abhol_zeitslot,dl_status,dl_gesamtsumme,dl_anmerkungen,dl_positionen_json,dl_pack_json&$orderby=createdon desc&$top=200"
    elif user:
        # Customer mode: own orders
        email = user["email"]
        url = f"{base_url}/api/data/v9.2/{ENTITY_SET}?$filter=dl_kunde_email eq '{email}'&$select=dl_shopbestellungid,dl_bestellnummer,dl_bestelldatum,dl_abholdatum,dl_abhol_zeitslot,dl_status,dl_gesamtsumme,dl_anmerkungen,dl_positionen_json&$orderby=createdon desc&$top=50"
    else:
        return func.HttpResponse(
            json.dumps({"success": False, "error": "Bitte melden Sie sich an."}),
            status_code=401, headers=get_cors_headers()
        )

    try:
        r = requests.get(url, headers=headers, timeout=30)
        if r.status_code == 200:
            items = r.json().get("value", [])
            orders = []
            for item in items:
                positionen = []
                try:
                    positionen = json.loads(item.get("dl_positionen_json", "[]"))
                except:
                    pass
                pack_data = None
                try:
                    raw = item.get("dl_pack_json")
                    if raw:
                        pack_data = json.loads(raw)
                except:
                    pass
                orders.append({
                    "id": item.get("dl_shopbestellungid", ""),
                    "bestellnummer": item.get("dl_bestellnummer", ""),
                    "kunde_email": item.get("dl_kunde_email", ""),
                    "kunde_name": item.get("dl_kunde_name", ""),
                    "bestelldatum": item.get("dl_bestelldatum", ""),
                    "abholdatum": item.get("dl_abholdatum", ""),
                    "abhol_zeitslot": _parse_zeitslot(item.get("dl_abhol_zeitslot", "")),
                    "status": item.get("dl_status", 0),
                    "status_text": STATUS_LABELS.get(item.get("dl_status", 0), "Unbekannt"),
                    "gesamtsumme": item.get("dl_gesamtsumme", 0),
                    "anmerkungen": item.get("dl_anmerkungen", ""),
                    "positionen": positionen,
                    "gepackt": bool(pack_data)
                })
            return func.HttpResponse(
                json.dumps({"success": True, "orders": orders}, ensure_ascii=False),
                status_code=200, headers=get_cors_headers()
            )
        return func.HttpResponse(
            json.dumps({"success": False, "error": f"Dataverse {r.status_code}"}),
            status_code=r.status_code, headers=get_cors_headers()
        )
    except Exception as e:
        return func.HttpResponse(
            json.dumps({"success": False, "error": str(e)}),
            status_code=500, headers=get_cors_headers()
        )


def _handle_patch(req, dv_token, base_url, headers):
    """Update order status (CMS) or customer cancellation."""
    try:
        body = req.get_json()
    except:
        return func.HttpResponse(
            json.dumps({"success": False, "error": "Ung?ltiger JSON-Body"}),
            status_code=400, headers=get_cors_headers()
        )

    order_id = (body.get("id") or "").strip()
    new_status = body.get("status")
    customer_action = (body.get("customer_action") or "").strip().lower()
    pack_json = body.get("pack_json")

    if not order_id or (new_status is None and pack_json is None and not customer_action):
        return func.HttpResponse(
            json.dumps({"success": False, "error": "id und status erforderlich"}),
            status_code=400, headers=get_cors_headers()
        )

    if customer_action == "cancel":
        user = _verify_jwt(req)
        if not user:
            return func.HttpResponse(
                json.dumps({"success": False, "error": "Bitte melden Sie sich an."}, ensure_ascii=False),
                status_code=401, headers=get_cors_headers()
            )
        check_url = f"{base_url}/api/data/v9.2/{ENTITY_SET}({order_id})?$select=dl_kunde_email,dl_status,dl_abholdatum,dl_abhol_zeitslot"
        cr = requests.get(check_url, headers=headers, timeout=30)
        if cr.status_code != 200:
            return func.HttpResponse(
                json.dumps({"success": False, "error": "Bestellung nicht gefunden"}, ensure_ascii=False),
                status_code=404, headers=get_cors_headers()
            )
        order = cr.json()
        if (order.get("dl_kunde_email") or "").lower() != (user.get("email") or "").lower():
            return func.HttpResponse(
                json.dumps({"success": False, "error": "Diese Bestellung gehört nicht zu Ihrem Konto."}, ensure_ascii=False),
                status_code=403, headers=get_cors_headers()
            )
        status = order.get("dl_status", 0)
        abholdatum = order.get("dl_abholdatum", "")
        now_local = datetime.utcnow() + timedelta(hours=2)
        today = now_local.strftime("%Y-%m-%d")

        # Storno-Frist: 1h vor Öffnungszeit des gewählten Zeitslots am Abholtag
        # Shop hours: Mo-Fr VM 06:30, Sa 07:00; NM 16:30
        STORNO_VOR_H = 1
        cancel_allowed = True
        cancel_reason = ""
        if status >= STATUS_ABHOLBEREIT:
            cancel_allowed = False
            cancel_reason = "Die Bestellung ist bereits in der Pack-/Abholphase."
        elif abholdatum and today > abholdatum:
            cancel_allowed = False
            cancel_reason = "Der Abholtag ist bereits vorbei."
        elif abholdatum and today == abholdatum:
            # Check time-based deadline: 1h before opening time of the slot's period
            zeitslot = _parse_zeitslot(order.get("dl_abhol_zeitslot", ""))
            open_time_str = zeitslot.get("von", "")
            if open_time_str:
                # open_time_str is like "07:30" (Abholzeit start), but we need opening time
                # Opening time = Abholzeit - ABHOL_OFFSET_H (1h), stored as openFrom in frontend
                # Actually, slot.von = abholVon, opening = von - 1h offset
                # Better: use openFrom if available, otherwise derive from period defaults
                pass
            # Derive opening time from period and weekday
            period = zeitslot.get("period", "vm")
            try:
                abhol_date = datetime.strptime(abholdatum, "%Y-%m-%d")
                dow = abhol_date.weekday()  # 0=Mo ... 6=So
                # Shop hours indexed by ISO weekday
                SHOP_HRS = {0: (6.5, 16.5), 1: (6.5, None), 2: (6.5, 16.5), 3: (6.5, 16.5), 4: (6.5, 16.5), 5: (7, None)}
                hrs = SHOP_HRS.get(dow, (6.5, 16.5))
                if period == "nm" and hrs[1]:
                    open_h = hrs[1]
                else:
                    open_h = hrs[0]
                storno_deadline_h = open_h - STORNO_VOR_H
                now_h = now_local.hour + now_local.minute / 60.0
                if now_h >= storno_deadline_h:
                    storno_uhr = f"{int(storno_deadline_h)}:{int((storno_deadline_h % 1) * 60):02d}"
                    cancel_allowed = False
                    cancel_reason = f"Die Stornierungsfrist ({storno_uhr} Uhr) ist abgelaufen."
            except Exception as e:
                logging.warning(f"[shop-order] Error parsing cancel deadline: {e}")

        if not cancel_allowed:
            return func.HttpResponse(
                json.dumps({"success": False, "error": cancel_reason or "Diese Bestellung kann nicht mehr storniert werden."}, ensure_ascii=False),
                status_code=400, headers=get_cors_headers()
            )
        new_status = STATUS_STORNIERT

    patch_url = f"{base_url}/api/data/v9.2/{ENTITY_SET}({order_id})"
    patch_payload = {}
    if new_status is not None:
        patch_payload["dl_status"] = new_status
    if pack_json is not None:
        patch_payload["dl_pack_json"] = json.dumps(pack_json, ensure_ascii=False) if isinstance(pack_json, dict) else str(pack_json)
    if not patch_payload:
        return func.HttpResponse(
            json.dumps({"success": False, "error": "Nichts zu aktualisieren"}),
            status_code=400, headers=get_cors_headers()
        )
    patch_headers = {**headers, "If-Match": "*"}

    try:
        r = requests.patch(patch_url, headers=patch_headers, json=patch_payload, timeout=30)
        if r.status_code in (200, 204):
            return func.HttpResponse(
                json.dumps({"success": True, "status": new_status, "status_text": STATUS_LABELS.get(new_status, "")}, ensure_ascii=False),
                status_code=200, headers=get_cors_headers()
            )
        return func.HttpResponse(
            json.dumps({"success": False, "error": f"Dataverse {r.status_code}"}),
            status_code=r.status_code, headers=get_cors_headers()
        )
    except Exception as e:
        return func.HttpResponse(
            json.dumps({"success": False, "error": str(e)}),
            status_code=500, headers=get_cors_headers()
        )


def main(req: func.HttpRequest) -> func.HttpResponse:
    if req.method == "OPTIONS":
        return func.HttpResponse(status_code=200, headers=get_cors_headers())

    dv_token = get_token()
    if not dv_token:
        return func.HttpResponse(
            json.dumps({"success": False, "error": "Server-Auth-Fehler"}),
            status_code=500, headers=get_cors_headers()
        )

    base_url = _base_url()
    headers = _headers(dv_token)

    if req.method == "POST":
        return _handle_post(req, dv_token, base_url, headers)
    elif req.method == "GET":
        return _handle_get(req, dv_token, base_url, headers)
    elif req.method == "PATCH":
        return _handle_patch(req, dv_token, base_url, headers)

    return func.HttpResponse(
        json.dumps({"success": False, "error": "Methode nicht unterstützt"}),
        status_code=405, headers=get_cors_headers()
    )
