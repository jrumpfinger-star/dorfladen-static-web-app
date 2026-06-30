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
import sys
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
    2: "Beim Metzger",  # legacy, nicht mehr aktiv genutzt
    3: "Abgeholt",
    4: "Storniert"
}

STATUS_LABELS_KUNDE = {
    0: "Neu",
    1: "Bestätigt",
    2: "Bestätigt",  # legacy, nicht mehr aktiv genutzt
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


def _phone_variants(phone):
    """Return set of all plausible phone formats for OData or-filter.
    Given any input, returns the normalized 0-prefix form plus +49 and 0049 variants.
    """
    norm = _normalize_phone(phone)
    variants = {norm}
    if norm.startswith('0') and not norm.startswith('00'):
        variants.add('+49' + norm[1:])
        variants.add('0049' + norm[1:])
    orig = (phone or "").strip()
    if orig:
        variants.add(orig)
    return variants


def _phone_odata_filter(field, phone):
    """Build OData filter clause that matches any phone variant."""
    variants = _phone_variants(phone)
    if len(variants) == 1:
        return f"{field} eq '{next(iter(variants))}'"
    clauses = " or ".join(f"{field} eq '{v}'" for v in variants)
    return f"({clauses})"


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
    """Calculate the next two delivery days for display (legacy)."""
    return _calc_liefertage_voraus(now, liefertage, bestellschluss_h, max_termine=2)


def _calc_liefertage_voraus(now, liefertage, bestellschluss_h, max_termine=10):
    """Calculate upcoming delivery days for the next ~2 weeks.

    Returns all bestellbare Liefertage with their Bestellschluss.
    """
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
            if len(results) >= max_termine:
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
    gewuenschter_liefertag = (body.get("liefertag") or "").strip()

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
    if gewuenschter_liefertag:
        # Validate requested delivery date against available dates
        alle = _calc_liefertage_voraus(now, cfg["liefertage"], cfg["bestellschluss_h"])
        match = [t for t in alle if t["liefertag"] == gewuenschter_liefertag and t["noch_bestellbar"]]
        if match:
            liefertag = datetime.strptime(gewuenschter_liefertag, "%Y-%m-%d")
            schluss_tag = _prev_werktag(liefertag)
            bestellschluss = schluss_tag.replace(hour=cfg["bestellschluss_h"], minute=0, second=0, microsecond=0)
        else:
            return func.HttpResponse(
                json.dumps({"success": False, "error": "Gewuenschter Liefertag ist nicht verfuegbar"}, ensure_ascii=False),
                status_code=400, headers=get_cors_headers()
            )
    else:
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

    # ── Bestätigungs-E-Mail an Kunden (best-effort) ──
    liefertag_label = _format_date_de(liefertag)
    if email:
        try:
            api_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
            if api_dir not in sys.path:
                sys.path.insert(0, api_dir)
            from importlib import import_module
            notify_mod = import_module("shop-notify")
            ci = notify_mod.get_contact_info()
            laden_name = ci["name"]
            anrede = f"Liebe/r {name}" if name else "Liebe Kundin, lieber Kunde"

            def _fmt_kg(v):
                s = f"{v:.2f}".replace(".", ",")
                return s + " kg"

            def _fmt_eur(v):
                return f"{v:,.2f}".replace(",", "X").replace(".", ",").replace("X", ".") + " €"

            email_subject = f"{laden_name} – Fleisch-Vorbestellung {bestellnummer}"
            email_body = (
                f"{anrede},\n\n"
                f"vielen Dank für Ihre Fleisch-Vorbestellung! "
                f"Wir haben folgende Bestellung erhalten:\n\n"
                f"[info:clipboard-list] Bestellnummer: {bestellnummer}\n"
                f"[info:calendar] Abholung: {liefertag_label}\n"
                f"[info:map-pin] Ort: {laden_name}, {ci['adresse']}\n"
            )
            if anmerkung:
                email_body += f"\n[info:message-square] Ihre Anmerkung: {anmerkung}\n"
            email_body += (
                f"\nSie erhalten ggf. eine weitere Benachrichtigung, "
                f"sobald Ihre Bestellung zur Abholung bereitsteht.\n\n"
                f"Bei Fragen erreichen Sie uns unter {ci['telefon']} oder "
                f"per E-Mail an {ci['email']}.\n\n"
                f"Herzliche Grüße\n"
                f"Ihr {laden_name}-Team"
            )
            # Positions-Tabelle
            rows = ""
            for p in validated_positionen:
                rows += (
                    f'<tr>'
                    f'<td style="padding:8px 10px;border-bottom:1px solid #f3f4f6;color:#1f2937">{p.get("bezeichnung","")}</td>'
                    f'<td style="padding:8px 6px;border-bottom:1px solid #f3f4f6;text-align:center;color:#6b7280">{_fmt_kg(p.get("menge_kg",0))}</td>'
                    f'<td style="padding:8px 10px;border-bottom:1px solid #f3f4f6;text-align:right;color:#1f2937;white-space:nowrap">{_fmt_eur(p.get("rabattpreis",0))}</td>'
                    f'</tr>'
                )
            positions_html = (
                f'<div style="margin-top:16px;border:1px solid #e5e7eb;border-radius:10px;overflow:hidden">'
                f'<div style="background:#fef3c7;padding:10px 14px;font-size:12px;font-weight:700;color:#92400e;border-bottom:1px solid #e5e7eb">'
                f'{notify_mod._icon("shopping-bag", "#92400e", 14)} Ihre Fleisch-Vorbestellung</div>'
                f'<table style="width:100%;border-collapse:collapse;font-size:13px">'
                f'<thead><tr style="background:#f9fafb">'
                f'<th style="padding:8px 10px;text-align:left;font-size:11px;font-weight:600;color:#6b7280">Artikel</th>'
                f'<th style="padding:8px 6px;text-align:center;font-size:11px;font-weight:600;color:#6b7280">Menge</th>'
                f'<th style="padding:8px 10px;text-align:right;font-size:11px;font-weight:600;color:#6b7280">Preis</th>'
                f'</tr></thead>'
                f'<tbody>{rows}</tbody>'
                f'<tfoot><tr style="background:#fef3c7">'
                f'<td colspan="2" style="padding:10px;font-weight:700;color:#92400e;font-size:14px">Gesamt (ca.)</td>'
                f'<td style="padding:10px;text-align:right;font-weight:700;color:#92400e;font-size:14px">{_fmt_eur(gesamtsumme)}</td>'
                f'</tr></tfoot>'
                f'</table></div>'
            )
            if rabatt_summe > 0:
                positions_html += (
                    f'<div style="margin-top:8px;padding:8px 12px;background:#f0fdf4;border:1px solid #86efac;border-radius:8px;font-size:12px;color:#166534">'
                    f'💰 Sie sparen {_fmt_eur(rabatt_summe)} durch den Mengenrabatt!</div>'
                )
            notify_mod.send_email(email, name, email_subject, email_body, positions_html)
            logging.info(f"[fleisch-order] Confirmation email sent to {email}")
        except Exception as ne:
            logging.warning(f"[fleisch-order] Confirmation email failed (non-blocking): {ne}")

    return func.HttpResponse(
        json.dumps({
            "success": True,
            "bestellnummer": bestellnummer,
            "liefertag": liefertag.strftime("%Y-%m-%d"),
            "liefertag_label": liefertag_label,
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
        alle_termine = _calc_liefertage_voraus(now, cfg["liefertage"], cfg["bestellschluss_h"])
        return func.HttpResponse(
            json.dumps({
                "success": True,
                "aktiv": cfg["aktiv"],
                "rabatt_prozent": cfg["rabatt_prozent"],
                "mindestmenge_kg": cfg["mindestmenge_kg"],
                "bestellschluss_h": cfg["bestellschluss_h"],
                "termine": termine,
                "alle_termine": alle_termine,
            }, ensure_ascii=False),
            status_code=200, headers=get_cors_headers()
        )

    # Single order lookup by Bestellnummer + Telefon
    if nr and telefon:
        tel_filter = _phone_odata_filter("dl_telefon", telefon)
        odata_filter = f"dl_bestellnummer eq '{nr}' and {tel_filter}"
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

        # List ALL individual positions (no aggregation!) because each
        # order is vacuum-packed separately for its customer.
        einzelpositionen = []
        for best in bestellungen:
            for pos in best.get("positionen", []):
                einzelpositionen.append({
                    "strichcode": pos.get("strichcode", ""),
                    "artikelnummer": pos.get("artikelnummer", ""),
                    "bezeichnung": pos.get("bezeichnung", ""),
                    "menge_kg": pos.get("menge_kg", 0),
                    "zuschnitt": pos.get("zuschnitt", ""),
                    "bestellt": bool(pos.get("bestellt")),
                    "gesendet": bool(pos.get("gesendet")),
                    "kunde": best.get("name", ""),
                    "bestellnummer": best.get("bestellnummer", ""),
                    "order_id": best.get("id", ""),
                })

        return func.HttpResponse(
            json.dumps({
                "success": True,
                "liefertag": liefertag,
                "bestellungen": bestellungen,
                "einzelpositionen": einzelpositionen,
                "gesamt_bestellungen": len(bestellungen),
            }, ensure_ascii=False),
            status_code=200, headers=get_cors_headers()
        )

    # Customer mode: my orders (active or all for history)
    email_param = (req.params.get("email") or "").strip().lower()
    if mode in ("my", "my_history") and (telefon or email_param):
        if telefon:
            id_filter = _phone_odata_filter("dl_telefon", telefon)
        else:
            id_filter = f"dl_email eq '{email_param}'"
        if mode == "my":
            odata_filter = f"{id_filter} and dl_status lt {STATUS_ABGEHOLT}"
            order_by = "dl_liefertag asc"
            top = "10"
        else:
            odata_filter = id_filter
            order_by = "dl_liefertag desc"
            top = "20"
        url = f"{base_url}/api/data/v9.2/{ENTITY_SET}"
        r = requests.get(url, headers=hdrs, timeout=30, params={"$filter": odata_filter, "$orderby": order_by, "$top": top})
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

    # Kiosk history: completed/cancelled orders (last 30 days)
    if mode == "kiosk_history":
        odata_filter = f"dl_status ge {STATUS_ABGEHOLT}"
        url = f"{base_url}/api/data/v9.2/{ENTITY_SET}?$filter={odata_filter}&$orderby=dl_liefertag desc,dl_bestelldatum desc&$top=100"
        r = requests.get(url, headers=hdrs, timeout=30)
        if r.status_code != 200:
            logging.error(f"[kiosk_history] Dataverse error {r.status_code}: {r.text[:500]}")
            return func.HttpResponse(
                json.dumps({"success": False, "error": f"Dataverse {r.status_code}"}, ensure_ascii=False),
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
    storno_grund = body.get("storno_grund")

    if not record_id:
        return func.HttpResponse(
            json.dumps({"success": False, "error": "Bestell-ID erforderlich"}, ensure_ascii=False),
            status_code=400, headers=get_cors_headers()
        )

    # Customer self-cancellation: only allowed when order is still Neu (0)
    kunde_storno = body.get("kunde_storno", False)
    if kunde_storno and new_status is not None and int(new_status) == STATUS_STORNIERT:
        check_url = f"{base_url}/api/data/v9.2/{ENTITY_SET}({record_id})?$select=dl_status"
        check_r = requests.get(check_url, headers=hdrs, timeout=15)
        if check_r.status_code != 200:
            return func.HttpResponse(
                json.dumps({"success": False, "error": "Bestellung konnte nicht geprüft werden"}, ensure_ascii=False),
                status_code=500, headers=get_cors_headers()
            )
        current_status = check_r.json().get("dl_status", -1)
        if current_status != STATUS_NEU:
            return func.HttpResponse(
                json.dumps({"success": False, "error": "Stornierung nicht mehr möglich – die Bestellung wurde bereits weitergeleitet"}, ensure_ascii=False),
                status_code=400, headers=get_cors_headers()
            )

    # Per-item status update (e.g. marking individual items as "bestellt")
    positionen_update = body.get("positionen")

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
    if storno_grund is not None:
        patch_data["dl_storno_grund"] = storno_grund.strip()
    if positionen_update is not None:
        if not isinstance(positionen_update, list) or \
           not all(isinstance(p, dict) for p in positionen_update):
            return func.HttpResponse(
                json.dumps({"success": False, "error": "positionen muss ein Array von Objekten sein"}, ensure_ascii=False),
                status_code=400, headers=get_cors_headers()
            )
        patch_data["dl_positionen_json"] = json.dumps(positionen_update, ensure_ascii=False)

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
        "status_label_kunde": STATUS_LABELS_KUNDE.get(item.get("dl_status", 0), ""),
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
