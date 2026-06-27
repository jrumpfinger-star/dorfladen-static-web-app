"""
Fleisch-Vorbestellung API
POST:  Place a meat pre-order (no JWT required, Name+Telefon only)
GET:   Fetch orders (mode=kiosk: all open; nr+telefon: single lookup; liefertag: by date)
PATCH: Update order status (kiosk/CMS)

Liefertage: Montag + Donnerstag (configurable via CMS)
Bestellschluss: Werktag davor bis 10:00 (configurable via CMS)
Rabatt: 15% ab 1 kg (configurable via CMS)
"""
import azure.functions as func
import json
import os
import uuid
import logging
import msal
import requests
from datetime import datetime, timedelta


DEFAULT_URL_SETTING = "DV_DEFAULT_URL"
DEFAULT_URL_FALLBACK = "https://orgab4e2f00.crm16.dynamics.com"
ENTITY_SET = "dl_fleischbestellungs"

# Status values
STATUS_NEU = 0
STATUS_BEIM_METZGER = 1
STATUS_EINGETROFFEN = 2
STATUS_ABGEHOLT = 3
STATUS_STORNIERT = 4

STATUS_LABELS = {
    0: "Neu",
    1: "Beim Metzger",
    2: "Eingetroffen",
    3: "Abgeholt",
    4: "Storniert"
}

# Defaults (overridden by CMS config)
DEFAULT_RABATT_PROZENT = 15
DEFAULT_MINDESTMENGE_KG = 1.0
DEFAULT_LIEFERTAGE = [0, 3]  # 0=Monday, 3=Thursday (Python weekday())
DEFAULT_BESTELLSCHLUSS_H = 10
FLEISCH_WURST_KEYWORDS = ["fleisch", "wurst", "metzger", "aufschnitt", "schinken", "salami"]


def _normalize_phone(phone):
    """Normalize phone number to consistent format for storage and lookup.
    Strips whitespace, dashes, slashes. Converts 0049/+49 prefix to 0.
    Example: '+49 173 707 1811' -> '01737071811'
    """
    import re
    phone = (phone or "").strip()
    # Remove all non-digit characters except leading +
    cleaned = re.sub(r'[^\d+]', '', phone)
    # Convert +49 or 0049 to 0
    if cleaned.startswith('+49'):
        cleaned = '0' + cleaned[3:]
    elif cleaned.startswith('0049'):
        cleaned = '0' + cleaned[4:]
    return cleaned or phone


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
    except Exception:
        return None


def get_cors_headers():
    return {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, POST, PATCH, OPTIONS",
        "Access-Control-Allow-Headers": "*",
        "Access-Control-Max-Age": "86400",
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


# ── CMS Config loading ──

def _load_cms_config(base_url, headers):
    """Load fleisch-related config values from dl_seiteninhalt."""
    config = {}
    keys = [
        "fleisch_rabatt_prozent",
        "fleisch_mindestmenge_kg",
        "fleisch_liefertage",
        "fleisch_bestellschluss_h",
        "fleisch_aktiv",
    ]
    try:
        filter_parts = " or ".join(f"dl_schluessel eq '{k}'" for k in keys)
        url = f"{base_url}/api/data/v9.2/dl_seiteninhalts?$filter={filter_parts}&$select=dl_schluessel,dl_wert"
        r = requests.get(url, headers=headers, timeout=10)
        if r.status_code == 200:
            for item in r.json().get("value", []):
                config[item.get("dl_schluessel", "")] = item.get("dl_wert", "")
    except Exception as e:
        logging.debug(f"[fleisch-order] CMS config load failed: {e}")
    return config


def _get_config_values(config):
    """Parse CMS config into typed values with defaults."""
    try:
        rabatt = float(config.get("fleisch_rabatt_prozent", DEFAULT_RABATT_PROZENT))
    except (ValueError, TypeError):
        rabatt = DEFAULT_RABATT_PROZENT

    try:
        mindestmenge = float(config.get("fleisch_mindestmenge_kg", DEFAULT_MINDESTMENGE_KG))
    except (ValueError, TypeError):
        mindestmenge = DEFAULT_MINDESTMENGE_KG

    try:
        bestellschluss_h = int(config.get("fleisch_bestellschluss_h", DEFAULT_BESTELLSCHLUSS_H))
    except (ValueError, TypeError):
        bestellschluss_h = DEFAULT_BESTELLSCHLUSS_H

    # Liefertage: "1,4" -> Monday=0, Thursday=3 (Python weekday, where 0=Monday)
    # CMS uses ISO: 1=Monday, 4=Thursday -> convert to Python: subtract 1
    liefertage_str = config.get("fleisch_liefertage", "")
    if liefertage_str:
        try:
            liefertage = [int(x.strip()) - 1 for x in liefertage_str.split(",") if x.strip()]
        except (ValueError, TypeError):
            liefertage = DEFAULT_LIEFERTAGE
    else:
        liefertage = DEFAULT_LIEFERTAGE

    aktiv_str = config.get("fleisch_aktiv", "1")
    aktiv = aktiv_str not in ("0", "false", "nein")

    return {
        "rabatt_prozent": rabatt,
        "mindestmenge_kg": mindestmenge,
        "liefertage": liefertage,
        "bestellschluss_h": bestellschluss_h,
        "aktiv": aktiv,
    }


# ── Feiertag logic (same as shop-order) ──

def _ostern(year):
    """Gauss-Osterformel: Ostersonntag berechnen."""
    a = year % 19
    b, c = divmod(year, 100)
    d, e = divmod(b, 4)
    f = (b + 8) // 25
    g = (b - f + 1) // 3
    h = (19 * a + b - d - g + 15) % 30
    i, k = divmod(c, 4)
    l_val = (32 + 2 * e + 2 * i - h - k) % 7
    m = (a + 11 * h + 22 * l_val) // 451
    month = (h + l_val - 7 * m + 114) // 31
    day = ((h + l_val - 7 * m + 114) % 31) + 1
    return datetime(year, month, day)


def _bayern_feiertage(year):
    """Alle gesetzlichen Feiertage in Bayern."""
    o = _ostern(year)
    feiertage = [
        datetime(year, 1, 1),    # Neujahr
        datetime(year, 1, 6),    # Hl. Drei Koenige
        o + timedelta(days=-2),  # Karfreitag
        o + timedelta(days=1),   # Ostermontag
        datetime(year, 5, 1),    # Tag der Arbeit
        o + timedelta(days=39),  # Christi Himmelfahrt
        o + timedelta(days=50),  # Pfingstmontag
        o + timedelta(days=60),  # Fronleichnam
        datetime(year, 8, 15),   # Mariae Himmelfahrt
        datetime(year, 10, 3),   # Tag der dt. Einheit
        datetime(year, 11, 1),   # Allerheiligen
        datetime(year, 12, 25),  # 1. Weihnachtstag
        datetime(year, 12, 26),  # 2. Weihnachtstag
    ]
    return {d.strftime("%Y-%m-%d") for d in feiertage}


_feiertag_cache = {}


def _is_feiertag(d):
    y = d.year
    if y not in _feiertag_cache:
        _feiertag_cache[y] = _bayern_feiertage(y)
    return d.strftime("%Y-%m-%d") in _feiertag_cache[y]


def _is_werktag(d):
    """Monday-Saturday, not a Feiertag."""
    return d.weekday() < 6 and not _is_feiertag(d)


def _prev_werktag(d):
    """Find the previous workday before d."""
    d = d - timedelta(days=1)
    while not _is_werktag(d):
        d -= timedelta(days=1)
    return d


# ── Liefertag calculation ──

def _calc_liefertag(now, liefertage, bestellschluss_h):
    """Calculate the next delivery day and order deadline.

    liefertage: list of Python weekday() values (0=Mon, 3=Thu)
    bestellschluss_h: hour of deadline on the workday before delivery

    Returns: (liefertag_date, bestellschluss_datetime)
    """
    if not liefertage:
        liefertage = DEFAULT_LIEFERTAGE

    # Try each day starting from tomorrow up to 14 days ahead
    for offset in range(1, 15):
        candidate = now + timedelta(days=offset)
        if candidate.weekday() in liefertage and not _is_feiertag(candidate):
            # Check if we can still order for this delivery day
            schluss_tag = _prev_werktag(candidate)
            schluss_dt = schluss_tag.replace(hour=bestellschluss_h, minute=0, second=0, microsecond=0)
            if now < schluss_dt:
                return candidate, schluss_dt

    # If none found within 14 days, look further
    for offset in range(15, 30):
        candidate = now + timedelta(days=offset)
        if candidate.weekday() in liefertage and not _is_feiertag(candidate):
            schluss_tag = _prev_werktag(candidate)
            schluss_dt = schluss_tag.replace(hour=bestellschluss_h, minute=0, second=0, microsecond=0)
            return candidate, schluss_dt

    # Absolute fallback
    return now + timedelta(days=7), now + timedelta(days=5)


def _calc_next_two_liefertage(now, liefertage, bestellschluss_h):
    """Calculate the next two delivery days for display."""
    results = []
    for offset in range(1, 30):
        candidate = now + timedelta(days=offset)
        if candidate.weekday() in liefertage and not _is_feiertag(candidate):
            schluss_tag = _prev_werktag(candidate)
            schluss_dt = schluss_tag.replace(hour=bestellschluss_h, minute=0, second=0, microsecond=0)
            results.append({
                "liefertag": candidate.strftime("%Y-%m-%d"),
                "liefertag_label": _format_date_de(candidate),
                "bestellschluss": schluss_dt.isoformat(),
                "bestellschluss_label": _format_date_de(schluss_tag) + f" {bestellschluss_h:02d}:00",
                "noch_bestellbar": now < schluss_dt,
            })
            if len(results) >= 2:
                break
    return results


WOCHENTAGE = ["Montag", "Dienstag", "Mittwoch", "Donnerstag", "Freitag", "Samstag", "Sonntag"]


def _format_date_de(d):
    return f"{WOCHENTAGE[d.weekday()]}, {d.strftime('%d.%m.%Y')}"


# ── Bestellnummer ──

def _generate_bestellnummer():
    """Generate order number: FM-YYYYMMDD-XXXX"""
    now = datetime.utcnow() + timedelta(hours=2)
    tag = now.strftime("%Y%m%d")
    suffix = uuid.uuid4().hex[:4].upper()
    return f"FM-{tag}-{suffix}"


# ── Fleisch/Wurst article identification ──

def is_fleisch_wurst(wg):
    wg_lower = (wg or "").lower()
    return any(kw in wg_lower for kw in FLEISCH_WURST_KEYWORDS)


# ── POST: Place order ──

def _handle_post(req, token, base_url, hdrs):
    try:
        body = req.get_json()
    except Exception:
        return func.HttpResponse(
            json.dumps({"success": False, "error": "Ungueltige Anfrage"}, ensure_ascii=False),
            status_code=400, headers=get_cors_headers()
        )

    name = (body.get("name") or "").strip()
    telefon = _normalize_phone(body.get("telefon") or "")
    email = (body.get("email") or "").strip()
    positionen = body.get("positionen") or []
    anmerkung = (body.get("anmerkung") or "").strip()

    if not name:
        return func.HttpResponse(
            json.dumps({"success": False, "error": "Name ist erforderlich"}, ensure_ascii=False),
            status_code=400, headers=get_cors_headers()
        )
    if not telefon:
        return func.HttpResponse(
            json.dumps({"success": False, "error": "Telefonnummer ist erforderlich"}, ensure_ascii=False),
            status_code=400, headers=get_cors_headers()
        )
    if not positionen:
        return func.HttpResponse(
            json.dumps({"success": False, "error": "Mindestens ein Artikel erforderlich"}, ensure_ascii=False),
            status_code=400, headers=get_cors_headers()
        )

    # Load CMS config
    config = _load_cms_config(base_url, hdrs)
    cfg = _get_config_values(config)

    if not cfg["aktiv"]:
        return func.HttpResponse(
            json.dumps({"success": False, "error": "Fleisch-Vorbestellung ist derzeit nicht verfuegbar"}, ensure_ascii=False),
            status_code=400, headers=get_cors_headers()
        )

    # Calculate delivery day
    now = datetime.utcnow() + timedelta(hours=2)  # CET approximation
    liefertag, bestellschluss = _calc_liefertag(now, cfg["liefertage"], cfg["bestellschluss_h"])

    # Validate and calculate prices
    rabatt_faktor = 1 - (cfg["rabatt_prozent"] / 100)
    gesamtsumme = 0.0
    rabatt_summe = 0.0
    validated_positionen = []

    for pos in positionen:
        menge_kg = float(pos.get("menge_kg") or 0)
        preis_kg = float(pos.get("preis_kg") or 0)
        bezeichnung = pos.get("bezeichnung", "")
        artikelnummer = pos.get("artikelnummer", "")
        strichcode = pos.get("strichcode", "")

        if menge_kg <= 0 or preis_kg <= 0:
            continue

        normalpreis = round(preis_kg * menge_kg, 2)
        if menge_kg >= cfg["mindestmenge_kg"]:
            rabattpreis = round(preis_kg * rabatt_faktor * menge_kg, 2)
            ersparnis = round(normalpreis - rabattpreis, 2)
        else:
            rabattpreis = normalpreis
            ersparnis = 0.0

        gesamtsumme += rabattpreis
        rabatt_summe += ersparnis

        validated_positionen.append({
            "artikelnummer": artikelnummer,
            "bezeichnung": bezeichnung,
            "strichcode": strichcode,
            "menge_kg": menge_kg,
            "preis_kg": preis_kg,
            "normalpreis": normalpreis,
            "rabattpreis": rabattpreis,
            "ersparnis": ersparnis,
            "rabatt_angewendet": menge_kg >= cfg["mindestmenge_kg"],
        })

    if not validated_positionen:
        return func.HttpResponse(
            json.dumps({"success": False, "error": "Keine gueltigen Positionen"}, ensure_ascii=False),
            status_code=400, headers=get_cors_headers()
        )

    gesamtsumme = round(gesamtsumme, 2)
    rabatt_summe = round(rabatt_summe, 2)
    bestellnummer = _generate_bestellnummer()

    # Save to Dataverse
    payload = {
        "dl_bestellnummer": bestellnummer,
        "dl_name": name,
        "dl_telefon": telefon,
        "dl_email": email,
        "dl_liefertag": liefertag.strftime("%Y-%m-%d"),
        "dl_bestelldatum": now.isoformat(),
        "dl_positionen_json": json.dumps(validated_positionen, ensure_ascii=False),
        "dl_gesamtsumme": gesamtsumme,
        "dl_rabatt_summe": rabatt_summe,
        "dl_status": STATUS_NEU,
        "dl_anmerkung": anmerkung,
    }

    url = f"{base_url}/api/data/v9.2/{ENTITY_SET}"
    r = requests.post(url, headers=hdrs, json=payload, timeout=30)

    if r.status_code not in (200, 201, 204):
        logging.error(f"[fleisch-order] Dataverse POST failed: {r.status_code} {r.text[:500]}")
        return func.HttpResponse(
            json.dumps({"success": False, "error": "Bestellung konnte nicht gespeichert werden"}, ensure_ascii=False),
            status_code=500, headers=get_cors_headers()
        )

    return func.HttpResponse(
        json.dumps({
            "success": True,
            "bestellnummer": bestellnummer,
            "liefertag": liefertag.strftime("%Y-%m-%d"),
            "liefertag_label": _format_date_de(liefertag),
            "gesamtsumme": gesamtsumme,
            "rabatt_summe": rabatt_summe,
            "positionen": validated_positionen,
            "name": name,
        }, ensure_ascii=False),
        status_code=201, headers=get_cors_headers()
    )


# ── GET: Fetch orders ──

def _handle_get(req, token, base_url, hdrs):
    mode = req.params.get("mode", "")
    nr = req.params.get("nr", "")
    telefon = req.params.get("telefon", "")
    liefertag = req.params.get("liefertag", "")
    info = req.params.get("info", "")

    # Info mode: return config + next delivery dates
    if info == "1":
        config = _load_cms_config(base_url, hdrs)
        cfg = _get_config_values(config)
        now = datetime.utcnow() + timedelta(hours=2)
        termine = _calc_next_two_liefertage(now, cfg["liefertage"], cfg["bestellschluss_h"])
        return func.HttpResponse(
            json.dumps({
                "success": True,
                "aktiv": cfg["aktiv"],
                "rabatt_prozent": cfg["rabatt_prozent"],
                "mindestmenge_kg": cfg["mindestmenge_kg"],
                "bestellschluss_h": cfg["bestellschluss_h"],
                "termine": termine,
            }, ensure_ascii=False),
            status_code=200, headers=get_cors_headers()
        )

    # Single order lookup by Bestellnummer + Telefon
    if nr and telefon:
        tel_norm = _normalize_phone(telefon)
        tel_orig = (telefon or "").strip()
        # Build filter that matches both normalized and original phone formats
        if tel_norm != tel_orig:
            odata_filter = f"dl_bestellnummer eq '{nr}' and (dl_telefon eq '{tel_norm}' or dl_telefon eq '{tel_orig}')"
        else:
            odata_filter = f"dl_bestellnummer eq '{nr}' and dl_telefon eq '{tel_norm}'"
        logging.info(f"[fleisch-order] Lookup filter: {odata_filter}")
        url = f"{base_url}/api/data/v9.2/{ENTITY_SET}"
        r = requests.get(url, headers=hdrs, timeout=30, params={"$filter": odata_filter, "$top": "1"})
        if r.status_code != 200:
            return func.HttpResponse(
                json.dumps({"success": False, "error": "Fehler beim Laden"}, ensure_ascii=False),
                status_code=500, headers=get_cors_headers()
            )
        items = r.json().get("value", [])
        if not items:
            return func.HttpResponse(
                json.dumps({"success": False, "error": "Bestellung nicht gefunden"}, ensure_ascii=False),
                status_code=404, headers=get_cors_headers()
            )
        return func.HttpResponse(
            json.dumps({"success": True, "bestellung": _serialize(items[0])}, ensure_ascii=False),
            status_code=200, headers=get_cors_headers()
        )

    # By delivery day (for Sammelbestellung)
    if liefertag:
        odata_filter = f"dl_liefertag eq '{liefertag}' and dl_status ne {STATUS_STORNIERT}"
        url = f"{base_url}/api/data/v9.2/{ENTITY_SET}?$filter={odata_filter}&$orderby=dl_bestelldatum asc"
        r = requests.get(url, headers=hdrs, timeout=30)
        if r.status_code != 200:
            return func.HttpResponse(
                json.dumps({"success": False, "error": "Fehler beim Laden"}, ensure_ascii=False),
                status_code=500, headers=get_cors_headers()
            )
        items = r.json().get("value", [])
        bestellungen = [_serialize(it) for it in items]

        # Aggregate positions across all orders – group by strichcode (barcode)
        # as the unique product identifier; fallback to bezeichnung
        aggregiert = {}
        for best in bestellungen:
            for pos in best.get("positionen", []):
                key = (pos.get("strichcode") or pos.get("bezeichnung") or pos.get("artikelnummer") or "?").strip()
                if key not in aggregiert:
                    aggregiert[key] = {
                        "strichcode": pos.get("strichcode", ""),
                        "artikelnummer": pos.get("artikelnummer", ""),
                        "bezeichnung": pos.get("bezeichnung", key),
                        "gesamt_kg": 0,
                        "anzahl_bestellungen": 0,
                        "einheit": "kg",
                    }
                aggregiert[key]["gesamt_kg"] = round(aggregiert[key]["gesamt_kg"] + pos.get("menge_kg", 0), 2)
                aggregiert[key]["anzahl_bestellungen"] += 1

        return func.HttpResponse(
            json.dumps({
                "success": True,
                "liefertag": liefertag,
                "bestellungen": bestellungen,
                "aggregiert": list(aggregiert.values()),
                "gesamt_bestellungen": len(bestellungen),
            }, ensure_ascii=False),
            status_code=200, headers=get_cors_headers()
        )

    # Customer mode: my active orders (for homepage widget)
    if mode == "my" and telefon:
        tel_norm = _normalize_phone(telefon)
        tel_orig = (telefon or "").strip()
        if tel_norm != tel_orig:
            odata_filter = f"(dl_telefon eq '{tel_norm}' or dl_telefon eq '{tel_orig}') and dl_status lt {STATUS_ABGEHOLT}"
        else:
            odata_filter = f"dl_telefon eq '{tel_norm}' and dl_status lt {STATUS_ABGEHOLT}"
        url = f"{base_url}/api/data/v9.2/{ENTITY_SET}"
        r = requests.get(url, headers=hdrs, timeout=30, params={"$filter": odata_filter, "$orderby": "dl_liefertag asc", "$top": "10"})
        if r.status_code != 200:
            return func.HttpResponse(
                json.dumps({"success": False, "error": "Fehler beim Laden"}, ensure_ascii=False),
                status_code=500, headers=get_cors_headers()
            )
        items = r.json().get("value", [])
        return func.HttpResponse(
            json.dumps({
                "success": True,
                "bestellungen": [_serialize(it) for it in items],
            }, ensure_ascii=False),
            status_code=200, headers=get_cors_headers()
        )

    # Kiosk mode: all open orders
    if mode == "kiosk":
        odata_filter = f"dl_status lt {STATUS_ABGEHOLT}"
        url = f"{base_url}/api/data/v9.2/{ENTITY_SET}?$filter={odata_filter}&$orderby=dl_liefertag asc,dl_bestelldatum asc"
        r = requests.get(url, headers=hdrs, timeout=30)
        if r.status_code != 200:
            return func.HttpResponse(
                json.dumps({"success": False, "error": "Fehler beim Laden"}, ensure_ascii=False),
                status_code=500, headers=get_cors_headers()
            )
        items = r.json().get("value", [])
        return func.HttpResponse(
            json.dumps({
                "success": True,
                "bestellungen": [_serialize(it) for it in items],
            }, ensure_ascii=False),
            status_code=200, headers=get_cors_headers()
        )

    # Count unread customer messages (for tab badge)
    if mode == "unread_messages":
        msg_url = (
            f"{base_url}/api/data/v9.2/{ENTITY_SET}"
            f"?$filter=dl_kunde_kommentar ne null"
            f" and dl_kunde_kommentar ne ''"
            f" and dl_kommentar_gelesen ne true"
            f" and dl_status ne {STATUS_STORNIERT}"
            f"&$select=dl_fleischbestellungid"
            f"&$top=50"
        )
        mr = requests.get(msg_url, headers=hdrs, timeout=30)
        msg_count = 0
        if mr.status_code == 200:
            msg_count = len(mr.json().get("value", []))
        return func.HttpResponse(
            json.dumps({"success": True, "unread_count": msg_count}, ensure_ascii=False),
            status_code=200, headers=get_cors_headers()
        )

    # Full message orders (for Kiosk Nachrichten-Bereich in Metzger tab)
    if mode == "messages":
        msg_url = (
            f"{base_url}/api/data/v9.2/{ENTITY_SET}"
            f"?$filter=dl_kunde_kommentar ne null"
            f" and dl_kunde_kommentar ne ''"
            f" and dl_status ne {STATUS_STORNIERT}"
            f"&$orderby=createdon desc"
            f"&$top=50"
        )
        mr = requests.get(msg_url, headers=hdrs, timeout=30)
        msg_orders = []
        if mr.status_code == 200:
            for item in mr.json().get("value", []):
                msg_orders.append(_serialize(item))
        return func.HttpResponse(
            json.dumps({"success": True, "orders": msg_orders, "count": len(msg_orders)}, ensure_ascii=False),
            status_code=200, headers=get_cors_headers()
        )

    # All orders (CMS mode with optional filters)
    status_filter = req.params.get("status", "")
    odata_parts = []
    if status_filter:
        odata_parts.append(f"dl_status eq {status_filter}")
    odata_filter = " and ".join(odata_parts) if odata_parts else ""
    filter_q = f"$filter={odata_filter}&" if odata_filter else ""
    url = f"{base_url}/api/data/v9.2/{ENTITY_SET}?{filter_q}$orderby=dl_bestelldatum desc&$top=200"
    r = requests.get(url, headers=hdrs, timeout=30)
    if r.status_code != 200:
        return func.HttpResponse(
            json.dumps({"success": False, "error": "Fehler beim Laden"}, ensure_ascii=False),
            status_code=500, headers=get_cors_headers()
        )
    items = r.json().get("value", [])
    return func.HttpResponse(
        json.dumps({
            "success": True,
            "bestellungen": [_serialize(it) for it in items],
        }, ensure_ascii=False),
        status_code=200, headers=get_cors_headers()
    )


# ── PATCH: Update status / comments ──

def _handle_patch(req, token, base_url, hdrs):
    try:
        body = req.get_json()
    except Exception:
        return func.HttpResponse(
            json.dumps({"success": False, "error": "Ungueltige Anfrage"}, ensure_ascii=False),
            status_code=400, headers=get_cors_headers()
        )

    record_id = body.get("id", "")
    new_status = body.get("status")
    kunde_kommentar = body.get("kunde_kommentar")
    personal_antwort = body.get("personal_antwort")
    kommentar_gelesen = body.get("kommentar_gelesen")

    if not record_id:
        return func.HttpResponse(
            json.dumps({"success": False, "error": "Bestell-ID erforderlich"}, ensure_ascii=False),
            status_code=400, headers=get_cors_headers()
        )

    patch_data = {}
    if new_status is not None:
        patch_data["dl_status"] = int(new_status)
    if kunde_kommentar is not None:
        patch_data["dl_kunde_kommentar"] = kunde_kommentar.strip()
        patch_data["dl_kommentar_gelesen"] = False  # new comment → unread
    if personal_antwort is not None:
        patch_data["dl_personal_antwort"] = personal_antwort.strip()
    if kommentar_gelesen is not None:
        patch_data["dl_kommentar_gelesen"] = bool(kommentar_gelesen)

    if not patch_data:
        return func.HttpResponse(
            json.dumps({"success": False, "error": "Keine Aenderung angegeben"}, ensure_ascii=False),
            status_code=400, headers=get_cors_headers()
        )

    url = f"{base_url}/api/data/v9.2/{ENTITY_SET}({record_id})"
    patch_hdrs = dict(hdrs)
    patch_hdrs["If-Match"] = "*"
    r = requests.patch(url, headers=patch_hdrs, json=patch_data, timeout=30)

    if r.status_code not in (200, 204):
        logging.error(f"[fleisch-order] PATCH failed: {r.status_code} {r.text[:500]}")
        return func.HttpResponse(
            json.dumps({"success": False, "error": "Aktualisierung fehlgeschlagen"}, ensure_ascii=False),
            status_code=500, headers=get_cors_headers()
        )

    # Send push notification on relevant status changes
    if new_status is not None and int(new_status) in (STATUS_EINGETROFFEN, STATUS_STORNIERT):
        _try_send_notification(record_id, base_url, hdrs, int(new_status), req)

    # Push to customer when staff sends a reply
    if personal_antwort is not None and personal_antwort.strip():
        _try_send_reply_push(record_id, base_url, hdrs, personal_antwort.strip(), req)

    resp = {"success": True, "message": "Aktualisiert"}
    if new_status is not None:
        resp["status"] = int(new_status)
        resp["status_label"] = STATUS_LABELS.get(int(new_status), "")
    return func.HttpResponse(
        json.dumps(resp, ensure_ascii=False),
        status_code=200, headers=get_cors_headers()
    )


# ── Notification helper ──

def _try_send_notification(record_id, base_url, hdrs, status, req):
    """Send push notification when order status changes to EINGETROFFEN or STORNIERT.
    Targets the specific customer by email if available."""
    try:
        url = f"{base_url}/api/data/v9.2/{ENTITY_SET}({record_id})?$select=dl_bestellnummer,dl_name,dl_email,dl_telefon"
        r = requests.get(url, headers=hdrs, timeout=10)
        if r.status_code != 200:
            return
        data = r.json()
        name = data.get("dl_name", "")
        nr = data.get("dl_bestellnummer", "")
        email = (data.get("dl_email") or "").strip().lower()

        if status == STATUS_EINGETROFFEN:
            title = "Fleischbestellung abholbereit! 🥩"
            message = f"Hallo {name}, Ihre Bestellung {nr} ist eingetroffen und kann abgeholt werden."
        elif status == STATUS_STORNIERT:
            title = "Bestellung storniert"
            message = f"Hallo {name}, Ihre Bestellung {nr} wurde leider storniert. Bitte kontaktieren Sie uns bei Fragen."
        else:
            return

        req_url = req.url or ""
        push_url = ""
        if "/api/" in req_url:
            push_url = req_url.split("/api/")[0] + "/api/push-send"

        if push_url:
            push_payload = {
                "title": title,
                "message": message,
                "url": f"/bestellstatus?nr={nr}",
                "tag": f"fleisch-{nr}",
                "category": "fleisch"
            }
            if email:
                push_payload["target_email"] = email
            try:
                pr = requests.post(push_url, json=push_payload, timeout=15)
                logging.info(f"[fleisch-order] Push sent for {nr} (target={email or 'broadcast'}): {pr.status_code}")
            except Exception as pe:
                logging.debug(f"[fleisch-order] Push send failed: {pe}")

        logging.info(f"[fleisch-order] Notification for {nr} status={STATUS_LABELS.get(status, status)}")
    except Exception as e:
        logging.debug(f"[fleisch-order] Notification failed: {e}")


def _try_send_reply_push(record_id, base_url, hdrs, reply_text, req):
    """Send push notification when staff replies to a customer comment.
    Targets the specific customer by email if available."""
    try:
        url = f"{base_url}/api/data/v9.2/{ENTITY_SET}({record_id})?$select=dl_bestellnummer,dl_name,dl_email"
        r = requests.get(url, headers=hdrs, timeout=10)
        if r.status_code != 200:
            return
        data = r.json()
        name = data.get("dl_name", "")
        nr = data.get("dl_bestellnummer", "")
        email = (data.get("dl_email") or "").strip().lower()

        title = "Nachricht vom Dorfladen 💬"
        message = f"Hallo {name}, neue Nachricht zu Ihrer Bestellung {nr}: {reply_text[:120]}"

        req_url = req.url or ""
        push_url = ""
        if "/api/" in req_url:
            push_url = req_url.split("/api/")[0] + "/api/push-send"

        if push_url:
            push_payload = {
                "title": title,
                "message": message,
                "url": f"/bestellstatus?nr={nr}",
                "tag": f"fleisch-reply-{nr}",
                "category": "fleisch"
            }
            if email:
                push_payload["target_email"] = email
            try:
                pr = requests.post(push_url, json=push_payload, timeout=15)
                logging.info(f"[fleisch-order] Reply push sent for {nr} (target={email or 'broadcast'}): {pr.status_code}")
            except Exception as pe:
                logging.debug(f"[fleisch-order] Reply push send failed: {pe}")
    except Exception as e:
        logging.debug(f"[fleisch-order] Reply push failed: {e}")


# ── Serializer ──

def _serialize(item):
    """Serialize Dataverse record to API response."""
    positionen = []
    pos_json = item.get("dl_positionen_json", "")
    if pos_json:
        try:
            positionen = json.loads(pos_json)
        except (json.JSONDecodeError, TypeError):
            pass

    return {
        "id": item.get(f"{ENTITY_SET.rstrip('s')}id", item.get("dl_fleischbestellungid", "")),
        "bestellnummer": item.get("dl_bestellnummer", ""),
        "name": item.get("dl_name", ""),
        "telefon": item.get("dl_telefon", ""),
        "email": item.get("dl_email", ""),
        "liefertag": item.get("dl_liefertag", ""),
        "bestelldatum": item.get("dl_bestelldatum", ""),
        "positionen": positionen,
        "gesamtsumme": item.get("dl_gesamtsumme"),
        "rabatt_summe": item.get("dl_rabatt_summe"),
        "status": item.get("dl_status", 0),
        "status_label": STATUS_LABELS.get(item.get("dl_status", 0), ""),
        "anmerkung": item.get("dl_anmerkung", ""),
        "kunde_kommentar": item.get("dl_kunde_kommentar", ""),
        "personal_antwort": item.get("dl_personal_antwort", ""),
        "kommentar_gelesen": item.get("dl_kommentar_gelesen", False),
    }


# ── Main handler ──

def main(req: func.HttpRequest) -> func.HttpResponse:
    # CORS preflight
    if req.method == "OPTIONS":
        return func.HttpResponse("", status_code=204, headers=get_cors_headers())

    token = get_token()
    if not token:
        return func.HttpResponse(
            json.dumps({"success": False, "error": "Server-Konfigurationsfehler"}, ensure_ascii=False),
            status_code=500, headers=get_cors_headers()
        )

    base_url = _base_url()
    hdrs = _headers(token)

    try:
        if req.method == "POST":
            return _handle_post(req, token, base_url, hdrs)
        elif req.method == "GET":
            return _handle_get(req, token, base_url, hdrs)
        elif req.method == "PATCH":
            return _handle_patch(req, token, base_url, hdrs)
        else:
            return func.HttpResponse(
                json.dumps({"success": False, "error": "Method not allowed"}, ensure_ascii=False),
                status_code=405, headers=get_cors_headers()
            )
    except Exception as e:
        logging.exception("[fleisch-order] Unexpected error")
        return func.HttpResponse(
            json.dumps({"success": False, "error": str(e)}, ensure_ascii=False),
            status_code=500, headers=get_cors_headers()
        )
