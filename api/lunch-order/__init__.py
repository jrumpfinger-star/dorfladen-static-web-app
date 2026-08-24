"""
Lunch Order API – Mittagstisch-Bestellungen
POST   /api/lunch-order           → Bestellung anlegen
GET    /api/lunch-order            → Alle Bestellungen (für Personal, filtered by date)
GET    /api/lunch-order/{id}       → Einzelne Bestellung
PATCH  /api/lunch-order/{id}       → Status ändern / bestätigen (für Personal)
"""
import azure.functions as func
import json
import logging
import os
import uuid
from datetime import datetime, timedelta

import sys
import msal
import requests


ENTITY_SET = "dl_mittagsbestellungs"
DEFAULT_URL_SETTING = "DV_DEFAULT_URL"
DEFAULT_URL_FALLBACK = "https://orgab4e2f00.crm16.dynamics.com"


def get_token():
    from shared.dataverse import get_tenant_id, get_client_id
    tenant_id = get_tenant_id()
    client_id = get_client_id()
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


def _base_url():
    return os.environ.get(DEFAULT_URL_SETTING, DEFAULT_URL_FALLBACK)


def _headers(token):
    return {
        "Authorization": f"Bearer {token}",
        "OData-MaxVersion": "4.0",
        "OData-Version": "4.0",
        "Accept": "application/json",
        "Content-Type": "application/json; charset=utf-8",
    }


def get_cors_headers():
    return {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, POST, PATCH, OPTIONS",
        "Access-Control-Allow-Headers": "*",
        "Access-Control-Max-Age": "86400",
        "Content-Type": "application/json; charset=utf-8",
    }


STATUS_NEU = 0
STATUS_BESTAETIGT = 1
STATUS_STORNIERT = 2
STATUS_ABGEHOLT = 3


# Bestellquellen
QUELLE_ONLINE = 0
QUELLE_TELEFON = 1
QUELLE_PERSONAL = 2
QUELLE_LABELS = {0: "Online", 1: "Telefon", 2: "Personal"}


def _parse_verlauf(raw):
    """Parse the stored chat thread JSON into a list of message dicts."""
    if not raw:
        return []
    try:
        v = json.loads(raw)
        if isinstance(v, list):
            return v
    except Exception:
        pass
    return []


def _verlauf_or_legacy(item):
    """Return the chat thread. For orders created before dl_chatverlauf existed,
    synthesize a best-effort thread from the single legacy fields so nothing is lost."""
    v = _parse_verlauf(item.get("dl_chatverlauf"))
    if v:
        return v
    out = []
    bt = item.get("dl_bestaetigung_text")
    kk = item.get("dl_kunde_kommentar")
    pa = item.get("dl_personal_antwort")
    if bt:
        out.append({"who": "dorfladen", "text": bt})
    if kk:
        out.append({"who": "kunde", "text": kk})
    if pa:
        out.append({"who": "dorfladen", "text": pa})
    return out


def _serialize(item):
    return {
        "id": item.get("dl_mittagsbestellungid", ""),
        "name": item.get("dl_name", ""),
        "email": item.get("dl_email", ""),
        "telefon": item.get("dl_telefon", ""),
        "gericht": item.get("dl_gericht", ""),
        "gericht_id": item.get("dl_gericht_id", ""),
        "menge": item.get("dl_menge", 1),
        "preis": item.get("dl_preis", 0),
        "datum": (item.get("dl_datum") or "").split("T")[0],
        "anmerkung": item.get("dl_anmerkung", ""),
        "status": item.get("dl_status", STATUS_NEU),
        "bestaetigung_text": item.get("dl_bestaetigung_text", ""),
        "kunde_kommentar": item.get("dl_kunde_kommentar", ""),
        "personal_antwort": item.get("dl_personal_antwort", ""),
        "verlauf": _verlauf_or_legacy(item),
        "kommentar_gelesen": bool(item.get("dl_kommentar_gelesen", False)),
        "bestellt_am": item.get("createdon", ""),
        "wochentag_label": item.get("dl_wochentag_label", ""),
        "quelle": item.get("dl_quelle", QUELLE_ONLINE),
        "quelle_label": QUELLE_LABELS.get(item.get("dl_quelle", QUELLE_ONLINE), "Online"),
        "stammkunde_id": item.get("dl_stammkunde_id", ""),
        "erfasst_von": item.get("dl_erfasst_von", ""),
    }


def _send_push(email, title, body_text, tag="lunch", bestellnr="", origin=""):
    """Best-effort push notification to customer (Kategorie 'bestellung')."""
    try:
        from shared.urls import get_public_origin
        # origin: Basis-URL der ausloesenden Umgebung; Fallback auf Env-Hosts.
        if not origin:
            origin = get_public_origin(None)
        internal_url = f"{origin}/api/push-send"
        push_url = "/bestellstatus"
        if bestellnr:
            push_url += f"?nr={bestellnr}"
        payload = {
            "title": title,
            "message": body_text,
            "url": push_url,
            "origin": origin,
            "target_email": email,
            "category": "bestellung",
            "tag": tag,
        }
        r = requests.post(internal_url, json=payload, timeout=10)
        if r.status_code in (200, 201):
            return True
    except Exception as e:
        logging.warning(f"[lunch-order] Push failed: {e}")
    return False


DEFAULT_BESTELLSCHLUSS = 10.5  # 10:30 Uhr – Fallback wenn CMS-Config nicht verfügbar


def _get_bestellschluss(base_url, headers):
    """Read bestellschluss_uhr from CMS config (Dataverse dl_seiteninhalt).
    Returns float hours (e.g. 10.5 for 10:30). Falls back to DEFAULT_BESTELLSCHLUSS."""
    try:
        url = (
            f"{base_url}/api/data/v9.2/dl_seiteninhalts"
            f"?$filter=dl_schluessel eq 'bestellschluss_uhr'"
            f"&$select=dl_wert"
        )
        r = requests.get(url, headers=headers, timeout=10)
        if r.status_code == 200:
            items = r.json().get("value", [])
            if items:
                raw = items[0].get("dl_wert", "")
                if raw:
                    parts = str(raw).split(":")
                    h = int(parts[0])
                    m = int(parts[1]) if len(parts) > 1 else 0
                    return h + m / 60.0
    except Exception as e:
        logging.debug(f"[lunch-order] CMS bestellschluss_uhr load failed: {e}")
    return DEFAULT_BESTELLSCHLUSS


# ── Archivierung: Bestellungen aelter als ~1 Monat werden zu dauerhaften
#    Tages-Aggregaten verdichtet (Zahlen fuer die Statistik bleiben erhalten),
#    die Detaildatensaetze werden geloescht. ────────────────────────────────
ARCHIVE_CONFIG_KEY = "lunch_stats_archive"
ARCHIVE_AFTER_DAYS = 31  # ~1 Monat


def _read_config_json(base_url, headers, key):
    """Liest einen JSON-Config-Wert (dl_seiteninhalts). Gibt (record_id, dict)."""
    try:
        url = (
            f"{base_url}/api/data/v9.2/dl_seiteninhalts"
            f"?$filter=dl_schluessel eq '{key}'&$select=dl_seiteninhaltid,dl_wert"
        )
        r = requests.get(url, headers=headers, timeout=15)
        if r.status_code == 200:
            items = r.json().get("value", [])
            if items:
                rec_id = items[0].get("dl_seiteninhaltid", "")
                try:
                    data = json.loads(items[0].get("dl_wert", "") or "{}")
                except Exception:
                    data = {}
                return rec_id, (data if isinstance(data, dict) else {})
    except Exception as e:
        logging.debug(f"[lunch-order] read config {key} failed: {e}")
    return "", {}


def _write_config_json(base_url, headers, key, rec_id, data):
    """Speichert einen JSON-Config-Wert (dl_seiteninhalts)."""
    try:
        payload = {
            "dl_schluessel": key,
            "dl_bezeichnung": "Lunch Stats Archive",
            "dl_wert": json.dumps(data, ensure_ascii=False),
        }
        if rec_id:
            ph = {**headers, "If-Match": "*"}
            requests.patch(
                f"{base_url}/api/data/v9.2/dl_seiteninhalts({rec_id})",
                headers=ph, json=payload, timeout=20,
            )
        else:
            requests.post(
                f"{base_url}/api/data/v9.2/dl_seiteninhalts",
                headers=headers, json=payload, timeout=20,
            )
        return True
    except Exception as e:
        logging.warning(f"[lunch-order] write config {key} failed: {e}")
        return False


def _archive_old_orders(base_url, headers):
    """Verdichtet Online-Bestellungen aelter als ~1 Monat zu Tages-Aggregaten
    und loescht die Detaildatensaetze. Best-effort, hoechstens 1x pro Tag.

    Gibt das (aktualisierte) Archiv-dict zurueck, damit die Statistik es sofort
    mit den Live-Zahlen zusammenfuehren kann.
    """
    rec_id, archive = _read_config_json(base_url, headers, ARCHIVE_CONFIG_KEY)
    if not isinstance(archive, dict):
        archive = {}
    meta = archive.get("_meta") or {}
    today_local = (datetime.utcnow() + timedelta(hours=2)).date()
    # Gate: nur einmal pro Tag den (teureren) Loesch-/Aggregationslauf machen.
    if str(meta.get("last_run", ""))[:10] == today_local.isoformat():
        return archive

    cutoff_iso = (today_local - timedelta(days=ARCHIVE_AFTER_DAYS)).isoformat()
    url = (
        f"{base_url}/api/data/v9.2/{ENTITY_SET}"
        f"?$filter=dl_quelle eq {QUELLE_ONLINE} and dl_datum lt {cutoff_iso}T00:00:00Z"
        f"&$select=dl_mittagsbestellungid,dl_status,dl_datum,dl_menge&$top=5000"
    )
    processed = 0
    while url:
        try:
            r = requests.get(url, headers=headers, timeout=40)
        except Exception:
            break
        if r.status_code != 200:
            break
        body = r.json()
        for item in body.get("value", []):
            oid = item.get("dl_mittagsbestellungid", "")
            if not oid:
                continue
            # Erst loeschen, nur bei Erfolg zaehlen -> kein Doppelzaehlen bei
            # teilweise fehlgeschlagenen Laeufen.
            try:
                dr = requests.delete(
                    f"{base_url}/api/data/v9.2/{ENTITY_SET}({oid})",
                    headers=headers, timeout=20,
                )
            except Exception:
                continue
            if dr.status_code not in (200, 204):
                continue
            day = (item.get("dl_datum") or "").split("T")[0]
            if not day:
                continue
            st = item.get("dl_status", STATUS_NEU)
            slot = archive.get(day)
            if not isinstance(slot, dict):
                slot = {"total": 0, "0": 0, "1": 0, "2": 0, "3": 0, "menge": 0}
                archive[day] = slot
            slot["total"] = slot.get("total", 0) + 1
            slot[str(st)] = slot.get(str(st), 0) + 1
            if st != STATUS_STORNIERT:
                try:
                    slot["menge"] = slot.get("menge", 0) + int(item.get("dl_menge", 1) or 1)
                except (TypeError, ValueError):
                    slot["menge"] = slot.get("menge", 0) + 1
            processed += 1
        url = body.get("@odata.nextLink")

    meta["last_run"] = datetime.utcnow().isoformat() + "Z"
    meta["archived_through"] = cutoff_iso
    meta["last_archived_count"] = processed
    archive["_meta"] = meta
    _write_config_json(base_url, headers, ARCHIVE_CONFIG_KEY, rec_id, archive)
    return archive


def main(req: func.HttpRequest) -> func.HttpResponse:
    if req.method == "OPTIONS":
        return func.HttpResponse(status_code=200, headers=get_cors_headers())

    record_id = req.route_params.get("id")

    dv_token = get_token()
    if not dv_token:
        return func.HttpResponse(
            json.dumps({"success": False, "error": "Auth failed"}, ensure_ascii=False),
            status_code=500, headers=get_cors_headers(),
        )

    base_url = _base_url()
    headers = _headers(dv_token)

    # Oeffentliche Origin der ausloesenden Umgebung (fuer Push-Links).
    from shared.urls import get_public_origin
    _push_origin = get_public_origin(req)

    try:
        # ── POST: Create order ──
        if req.method == "POST":
            body = req.get_json()

            name = (body.get("name") or "").strip()
            email = (body.get("email") or "").strip().lower()
            telefon = (body.get("telefon") or "").strip()
            gericht = (body.get("gericht") or "").strip()
            gericht_id = (body.get("gericht_id") or "").strip()
            menge = int(body.get("menge", 1))
            preis = float(body.get("preis", 0))
            datum = (body.get("datum") or "").strip()
            # Normalize: "2026-06-22T00:00:00Z" → "2026-06-22"
            if "T" in datum:
                datum = datum.split("T")[0]
            anmerkung = (body.get("anmerkung") or "").strip()
            wochentag_label = (body.get("wochentag_label") or "").strip()
            mitnehmen = body.get("mitnehmen", False)
            notify_email = bool(body.get("notify_email", False))
            quelle = int(body.get("quelle", QUELLE_ONLINE))
            stammkunde_id = (body.get("stammkunde_id") or "").strip()
            erfasst_von = (body.get("erfasst_von") or "").strip()

            errors = []
            if not name:
                errors.append("Name ist erforderlich.")
            # E-Mail nur bei Online-Bestellungen pflicht
            if quelle == QUELLE_ONLINE and not email:
                errors.append("E-Mail ist erforderlich.")
            if not gericht:
                errors.append("Kein Gericht ausgewählt.")
            if menge < 1 or menge > 99:
                errors.append("Menge muss zwischen 1 und 99 liegen.")
            if not datum:
                errors.append("Datum fehlt.")
            if errors:
                return func.HttpResponse(
                    json.dumps({"success": False, "errors": errors}, ensure_ascii=False),
                    status_code=400, headers=get_cors_headers(),
                )

            # ── Bestellzeitsperre: Online-Bestellungen für heute nur bis Bestellschluss ──
            if quelle == QUELLE_ONLINE and datum:
                now_local = datetime.utcnow() + timedelta(hours=2)  # CET/CEST approximation
                today_str = now_local.strftime("%Y-%m-%d")
                if datum == today_str:
                    now_h = now_local.hour + now_local.minute / 60.0
                    bs_h = _get_bestellschluss(base_url, headers)
                    if now_h >= bs_h:
                        bs_hh = int(bs_h)
                        bs_mm = int((bs_h - bs_hh) * 60)
                        bs_label = f"{bs_hh}:{bs_mm:02d}"
                        return func.HttpResponse(
                            json.dumps({
                                "success": False,
                                "errors": [f"Der Bestellschluss für heute ({bs_label} Uhr) ist leider überschritten."]
                            }, ensure_ascii=False),
                            status_code=400, headers=get_cors_headers(),
                        )

            bestellnr = f"MT-{datetime.utcnow().strftime('%y%m%d')}-{uuid.uuid4().hex[:5].upper()}"

            # Telefonbestellungen werden sofort als bestätigt gespeichert
            initial_status = STATUS_BESTAETIGT if quelle in (QUELLE_TELEFON, QUELLE_PERSONAL) else STATUS_NEU

            payload = {
                "dl_name": name,
                "dl_email": email,
                "dl_telefon": telefon,
                "dl_gericht": gericht,
                "dl_gericht_id": gericht_id,
                "dl_menge": menge,
                "dl_preis": preis,
                "dl_datum": datum,
                "dl_anmerkung": anmerkung,
                "dl_status": initial_status,
                "dl_bestellnummer": bestellnr,
                "dl_wochentag_label": wochentag_label,
                "dl_mitnehmen": mitnehmen,
                "dl_quelle": quelle,
                "dl_stammkunde_id": stammkunde_id,
                "dl_erfasst_von": erfasst_von,
            }

            post_headers = {**headers, "Prefer": "return=representation"}
            r = requests.post(
                f"{base_url}/api/data/v9.2/{ENTITY_SET}",
                headers=post_headers, json=payload, timeout=30,
            )

            if r.status_code in (200, 201):
                record = r.json()
                order = _serialize(record)
                order["bestellnummer"] = bestellnr

                logging.info(f"[lunch-order] Created {bestellnr} for {name} ({gericht} x{menge})")

                # ── Bestätigungs-E-Mail an Kunden – NUR wenn ausdrücklich gewünscht ──
                if email and notify_email:
                    try:
                        api_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
                        if api_dir not in sys.path:
                            sys.path.insert(0, api_dir)
                        from importlib import import_module
                        notify_mod = import_module("shop-notify")
                        ci = notify_mod.get_contact_info()
                        laden_name = ci["name"]
                        anrede = f"Liebe/r {name}" if name else "Liebe Kundin, lieber Kunde"
                        # Datum formatieren
                        datum_de = datum
                        try:
                            dp = datum[:10].split("-")
                            if len(dp) == 3:
                                datum_de = f"{dp[2]}.{dp[1]}.{dp[0]}"
                        except Exception:
                            pass
                        wt = wochentag_label or datum_de
                        mitnehmen_text = "Zum Mitnehmen" if mitnehmen else "Vor Ort essen"
                        preis_str = f"{preis:.2f}".replace(".", ",") + " €" if preis else ""
                        email_subject = f"{laden_name} – Mittagstisch-Bestellung {bestellnr}"
                        email_body = (
                            f"{anrede},\n\n"
                            f"vielen Dank für Ihre Mittagstisch-Bestellung! "
                            f"Wir haben folgende Bestellung erhalten:\n\n"
                            f"[info:clipboard-list] Bestellnummer: {bestellnr}\n"
                            f"[info:utensils] Gericht: {gericht}\n"
                            f"[info:hash] Menge: {menge}x\n"
                        )
                        if preis_str:
                            email_body += f"[info:coins] Preis: {preis_str}\n"
                        email_body += (
                            f"[info:calendar] Datum: {wt} ({datum_de})\n"
                            f"[info:package] {mitnehmen_text}\n"
                        )
                        if anmerkung:
                            email_body += f"\n[info:message-square] Ihre Anmerkung: {anmerkung}\n"
                        email_body += (
                            f"\nBitte holen Sie Ihr Essen zwischen 11:30 und 13:00 Uhr ab.\n\n"
                            f"Bei Fragen erreichen Sie uns unter {ci['telefon']} oder "
                            f"per E-Mail an {ci['email']}.\n\n"
                            f"Guten Appetit!\n"
                            f"Ihr {laden_name}-Team"
                        )
                        notify_mod.send_email(email, name, email_subject, email_body)
                        logging.info(f"[lunch-order] Confirmation email sent to {email}")
                    except Exception as ne:
                        logging.warning(f"[lunch-order] Confirmation email failed (non-blocking): {ne}")

                return func.HttpResponse(
                    json.dumps({
                        "success": True,
                        "message": f"Bestellung {bestellnr} aufgenommen!",
                        "order": order,
                        "bestellnummer": bestellnr,
                    }, ensure_ascii=False),
                    status_code=201, headers=get_cors_headers(),
                )
            else:
                logging.error(f"[lunch-order] Create failed: {r.status_code} {r.text[:300]}")
                return func.HttpResponse(
                    json.dumps({"success": False, "error": f"Speicherfehler ({r.status_code})"}, ensure_ascii=False),
                    status_code=500, headers=get_cors_headers(),
                )

        # ── GET: List or single ──
        if req.method == "GET":
            if record_id:
                url = f"{base_url}/api/data/v9.2/{ENTITY_SET}({record_id})"
                r = requests.get(url, headers=headers, timeout=30)
                if r.status_code == 200:
                    return func.HttpResponse(
                        json.dumps({"success": True, "order": _serialize(r.json())}, ensure_ascii=False),
                        status_code=200, headers=get_cors_headers(),
                    )
                return func.HttpResponse(
                    json.dumps({"success": False, "error": "Nicht gefunden"}, ensure_ascii=False),
                    status_code=404, headers=get_cors_headers(),
                )

            # Lookup by bestellnummer (for customer status page)
            nr_filter = req.params.get("nr", "").strip()
            email_filter = req.params.get("email", "").strip().lower()

            # All active orders for a customer (homepage widget)
            if email_filter and not nr_filter and req.params.get("mode") == "my":
                today_str = datetime.utcnow().strftime("%Y-%m-%d")
                lookup_url = (
                    f"{base_url}/api/data/v9.2/{ENTITY_SET}"
                    f"?$filter=dl_email eq '{email_filter}'"
                    f" and (dl_status eq {STATUS_NEU} or dl_status eq {STATUS_BESTAETIGT})"
                    f" and dl_datum ge '{today_str}'"
                    f"&$orderby=dl_datum asc"
                    f"&$top=20"
                )
                logging.info(f"[lunch-order] mode=my email={email_filter} today={today_str} url={lookup_url}")
                lr = requests.get(lookup_url, headers=headers, timeout=30)
                logging.info(f"[lunch-order] mode=my response={lr.status_code} body={lr.text[:300]}")
                if lr.status_code == 200:
                    items = lr.json().get("value", [])
                    orders_list = []
                    for item in items:
                        o = _serialize(item)
                        o["bestellnummer"] = item.get("dl_bestellnummer", "")
                        o["mitnehmen"] = item.get("dl_mitnehmen", False)
                        orders_list.append(o)
                    return func.HttpResponse(
                        json.dumps({"success": True, "orders": orders_list, "count": len(orders_list)}, ensure_ascii=False),
                        status_code=200, headers=get_cors_headers(),
                    )
                return func.HttpResponse(
                    json.dumps({"success": True, "orders": [], "count": 0}, ensure_ascii=False),
                    status_code=200, headers=get_cors_headers(),
                )

            # Count unread customer messages across all dates (for tab badge)
            if req.params.get("mode") == "unread_messages":
                msg_url = (
                    f"{base_url}/api/data/v9.2/{ENTITY_SET}"
                    f"?$filter=dl_kunde_kommentar ne null"
                    f" and dl_kunde_kommentar ne ''"
                    f" and dl_kommentar_gelesen ne true"
                    f" and dl_status ne {STATUS_STORNIERT}"
                    f"&$select=dl_mittagsbestellungid"
                    f"&$top=50"
                )
                mr = requests.get(msg_url, headers=headers, timeout=30)
                msg_count = 0
                if mr.status_code == 200:
                    msg_count = len(mr.json().get("value", []))
                return func.HttpResponse(
                    json.dumps({"success": True, "unread_count": msg_count}, ensure_ascii=False),
                    status_code=200, headers=get_cors_headers(),
                )

            # Full message orders across all dates (for Nachrichten tab)
            if req.params.get("mode") == "messages":
                select_fields = "dl_mittagsbestellungid,dl_name,dl_email,dl_telefon,dl_gericht,dl_gericht_id,dl_menge,dl_preis,dl_datum,dl_anmerkung,dl_status,dl_bestaetigung_text,dl_bestellnummer,dl_wochentag_label,dl_mitnehmen,dl_quelle,dl_stammkunde_id,dl_erfasst_von,dl_kunde_kommentar,dl_personal_antwort,dl_kommentar_gelesen,dl_chatverlauf,createdon"
                msg_url = (
                    f"{base_url}/api/data/v9.2/{ENTITY_SET}"
                    f"?$filter=dl_kunde_kommentar ne null"
                    f" and dl_kunde_kommentar ne ''"
                    f" and dl_status ne {STATUS_STORNIERT}"
                    f"&$select={select_fields}"
                    f"&$orderby=createdon desc"
                    f"&$top=50"
                )
                mr = requests.get(msg_url, headers=headers, timeout=30)
                msg_orders = []
                if mr.status_code == 200:
                    for item in mr.json().get("value", []):
                        o = _serialize(item)
                        o["bestellnummer"] = item.get("dl_bestellnummer", "")
                        o["mitnehmen"] = item.get("dl_mitnehmen", False)
                        msg_orders.append(o)
                return func.HttpResponse(
                    json.dumps({"success": True, "orders": msg_orders, "count": len(msg_orders)}, ensure_ascii=False),
                    status_code=200, headers=get_cors_headers(),
                )

            # Aggregierte Statistik: Internet-Bestellungen (quelle=online) nach Status
            if req.params.get("mode") == "stats":
                try:
                    days = int(req.params.get("days", "30"))
                except ValueError:
                    days = 30
                if days < 1:
                    days = 30
                from_dt = (datetime.utcnow() - timedelta(days=days)).strftime("%Y-%m-%dT00:00:00Z")
                stats_url = (
                    f"{base_url}/api/data/v9.2/{ENTITY_SET}"
                    f"?$filter=dl_quelle eq {QUELLE_ONLINE} and createdon ge {from_dt}"
                    f"&$select=dl_status,dl_datum,dl_menge"
                    f"&$top=5000"
                )
                by_status = {STATUS_NEU: 0, STATUS_BESTAETIGT: 0, STATUS_STORNIERT: 0, STATUS_ABGEHOLT: 0}
                # Tageswerte nach Mittagstisch-Tag (dl_datum): pro Tag Status-Aufschluesselung
                by_day = {}
                total = 0
                next_url = stats_url
                while next_url:
                    sr = requests.get(next_url, headers=headers, timeout=30)
                    if sr.status_code != 200:
                        break
                    body = sr.json()
                    for item in body.get("value", []):
                        st = item.get("dl_status", STATUS_NEU)
                        by_status[st] = by_status.get(st, 0) + 1
                        total += 1
                        day = (item.get("dl_datum") or "").split("T")[0]
                        if day:
                            slot = by_day.get(day)
                            if slot is None:
                                slot = {"total": 0, "0": 0, "1": 0, "2": 0, "3": 0, "menge": 0}
                                by_day[day] = slot
                            slot["total"] += 1
                            slot[str(st)] = slot.get(str(st), 0) + 1
                            # Portionen nur fuer aktive Bestellungen (ohne Storno) zaehlen
                            if st != STATUS_STORNIERT:
                                try:
                                    slot["menge"] += int(item.get("dl_menge", 1) or 1)
                                except (TypeError, ValueError):
                                    slot["menge"] += 1
                    next_url = body.get("@odata.nextLink")

                # Archiv (dauerhafte Zahlen aelterer Bestellungen) einmischen.
                # Loest zugleich den taeglichen Archivierungslauf aus (best-effort).
                try:
                    archive = _archive_old_orders(base_url, headers)
                except Exception:
                    try:
                        _, archive = _read_config_json(base_url, headers, ARCHIVE_CONFIG_KEY)
                    except Exception:
                        archive = {}
                window_from = (datetime.utcnow() - timedelta(days=days)).date().isoformat()
                if isinstance(archive, dict):
                    for aday, aslot in archive.items():
                        if aday == "_meta" or not isinstance(aslot, dict):
                            continue
                        if aday < window_from:
                            continue  # ausserhalb des angefragten Zeitraums
                        a_total = int(aslot.get("total", 0) or 0)
                        total += a_total
                        for stk in ("0", "1", "2", "3"):
                            cnt = int(aslot.get(stk, 0) or 0)
                            if cnt:
                                ik = int(stk)
                                by_status[ik] = by_status.get(ik, 0) + cnt
                        d = by_day.get(aday)
                        if d is None:
                            d = {"total": 0, "0": 0, "1": 0, "2": 0, "3": 0, "menge": 0}
                            by_day[aday] = d
                        d["total"] += a_total
                        for stk in ("0", "1", "2", "3"):
                            d[stk] = d.get(stk, 0) + int(aslot.get(stk, 0) or 0)
                        d["menge"] = d.get("menge", 0) + int(aslot.get("menge", 0) or 0)

                # Nach Mittagstisch-Tag absteigend sortieren (kommende/aktuelle Tage oben)
                by_day_list = [dict(datum=d, **v) for d, v in sorted(by_day.items(), reverse=True)]
                return func.HttpResponse(
                    json.dumps({
                        "success": True,
                        "quelle": "online",
                        "days": days,
                        "total": total,
                        "by_status": {str(k): v for k, v in by_status.items()},
                        "by_day": by_day_list,
                        "status_labels": {"0": "Neu", "1": "Bestätigt", "2": "Storniert", "3": "Abgeholt"},
                    }, ensure_ascii=False),
                    status_code=200, headers=get_cors_headers(),
                )

            if nr_filter and email_filter:
                lookup_url = (
                    f"{base_url}/api/data/v9.2/{ENTITY_SET}"
                    f"?$filter=dl_bestellnummer eq '{nr_filter}' and dl_email eq '{email_filter}'"
                    f"&$top=1"
                )
                lr = requests.get(lookup_url, headers=headers, timeout=30)
                if lr.status_code == 200:
                    items = lr.json().get("value", [])
                    if items:
                        o = _serialize(items[0])
                        o["bestellnummer"] = items[0].get("dl_bestellnummer", "")
                        o["mitnehmen"] = items[0].get("dl_mitnehmen", False)
                        return func.HttpResponse(
                            json.dumps({"success": True, "order": o}, ensure_ascii=False),
                            status_code=200, headers=get_cors_headers(),
                        )
                return func.HttpResponse(
                    json.dumps({"success": False, "error": "Bestellung nicht gefunden"}),
                    status_code=404, headers=get_cors_headers(),
                )

            # List: filter by date (default: today)
            filter_date = req.params.get("datum", "")
            status_filter = req.params.get("status", "")

            odata_filter_parts = []
            if filter_date:
                # Match both "2026-06-22" and "2026-06-22T00:00:00Z"
                odata_filter_parts.append(f"startswith(dl_datum,'{filter_date}')")
            if status_filter:
                odata_filter_parts.append(f"dl_status eq {status_filter}")

            odata_filter = " and ".join(odata_filter_parts) if odata_filter_parts else ""

            url = f"{base_url}/api/data/v9.2/{ENTITY_SET}"
            params = {
                "$select": "dl_mittagsbestellungid,dl_name,dl_email,dl_telefon,dl_gericht,dl_gericht_id,dl_menge,dl_preis,dl_datum,dl_anmerkung,dl_status,dl_bestaetigung_text,dl_bestellnummer,dl_wochentag_label,dl_mitnehmen,dl_quelle,dl_stammkunde_id,dl_erfasst_von,dl_kunde_kommentar,dl_personal_antwort,dl_kommentar_gelesen,dl_chatverlauf,createdon",
                "$orderby": "createdon desc",
                "$top": "200",
            }
            if odata_filter:
                params["$filter"] = odata_filter

            r = requests.get(url, headers=headers, params=params, timeout=30)
            if r.status_code == 200:
                items = r.json().get("value", [])
                orders = []
                for item in items:
                    o = _serialize(item)
                    o["bestellnummer"] = item.get("dl_bestellnummer", "")
                    o["mitnehmen"] = item.get("dl_mitnehmen", False)
                    orders.append(o)
                return func.HttpResponse(
                    json.dumps({"success": True, "orders": orders, "count": len(orders)}, ensure_ascii=False),
                    status_code=200, headers=get_cors_headers(),
                )
            return func.HttpResponse(
                json.dumps({"success": False, "error": f"Fehler ({r.status_code})"}, ensure_ascii=False),
                status_code=500, headers=get_cors_headers(),
            )

        # ── PATCH: Confirm / cancel / update status ──
        if req.method == "PATCH" and record_id:
            body = req.get_json()
            new_status = body.get("status")
            bestaetigung_text = (body.get("bestaetigung_text") or "").strip()
            new_menge = body.get("menge")
            new_anmerkung = body.get("anmerkung")

            # Customer self-cancellation: only allowed when order is still Eingegangen (0)
            kunde_storno = body.get("kunde_storno", False)
            if kunde_storno and new_status is not None and int(new_status) == STATUS_STORNIERT:
                check_url = f"{base_url}/api/data/v9.2/{ENTITY_SET}({record_id})?$select=dl_status"
                check_r = requests.get(check_url, headers=headers, timeout=15)
                if check_r.status_code != 200:
                    return func.HttpResponse(
                        json.dumps({"success": False, "error": "Bestellung konnte nicht geprüft werden"}, ensure_ascii=False),
                        status_code=500, headers=get_cors_headers(),
                    )
                current_status = check_r.json().get("dl_status", -1)
                if current_status != STATUS_NEU:
                    return func.HttpResponse(
                        json.dumps({"success": False, "error": "Stornierung nicht mehr möglich – die Bestellung wurde bereits bestätigt"}, ensure_ascii=False),
                        status_code=400, headers=get_cors_headers(),
                    )

            # Fetch existing order for push notification
            fetch_url = f"{base_url}/api/data/v9.2/{ENTITY_SET}({record_id})"
            fetch_r = requests.get(fetch_url, headers=headers, timeout=15)
            existing = fetch_r.json() if fetch_r.status_code == 200 else {}

            patch_data = {}
            if new_status is not None:
                patch_data["dl_status"] = int(new_status)
            if bestaetigung_text:
                patch_data["dl_bestaetigung_text"] = bestaetigung_text
            if new_menge is not None:
                m = int(new_menge)
                if 1 <= m <= 99:
                    patch_data["dl_menge"] = m
            if new_anmerkung is not None:
                patch_data["dl_anmerkung"] = new_anmerkung.strip()

            # Customer comment
            kunde_kommentar = body.get("kunde_kommentar")
            if kunde_kommentar is not None:
                patch_data["dl_kunde_kommentar"] = kunde_kommentar.strip()
                patch_data["dl_kommentar_gelesen"] = False  # new comment → unread
            # Staff reply
            personal_antwort = body.get("personal_antwort")
            if personal_antwort is not None:
                patch_data["dl_personal_antwort"] = personal_antwort.strip()
            # Mark comment as read
            kommentar_gelesen = body.get("kommentar_gelesen")
            if kommentar_gelesen is not None:
                patch_data["dl_kommentar_gelesen"] = bool(kommentar_gelesen)
            # Storno reason
            storno_grund = body.get("storno_grund")
            if storno_grund is not None:
                patch_data["dl_storno_grund"] = storno_grund.strip()

            # ── Fortlaufender Nachrichtenverlauf (dl_chatverlauf) ──
            # Jede neue Nachricht wird mit Zeitstempel an ein JSON-Array angehaengt.
            thread = _parse_verlauf(existing.get("dl_chatverlauf"))
            if not thread:
                # Einmalige Migration: bestehende Einzelfelder in den Verlauf uebernehmen,
                # damit kein alter Text verloren geht. Neue Nachrichten werden danach angehaengt.
                if existing.get("dl_bestaetigung_text"):
                    thread.append({"who": "dorfladen", "text": existing.get("dl_bestaetigung_text")})
                if existing.get("dl_kunde_kommentar"):
                    thread.append({"who": "kunde", "text": existing.get("dl_kunde_kommentar")})
                if existing.get("dl_personal_antwort"):
                    thread.append({"who": "dorfladen", "text": existing.get("dl_personal_antwort")})
            _now_iso = datetime.utcnow().isoformat() + "Z"
            _thread_changed = False
            if bestaetigung_text:
                thread.append({"t": _now_iso, "who": "dorfladen", "text": bestaetigung_text})
                _thread_changed = True
            if kunde_kommentar is not None and kunde_kommentar.strip():
                thread.append({"t": _now_iso, "who": "kunde", "text": kunde_kommentar.strip()})
                _thread_changed = True
            if personal_antwort is not None and personal_antwort.strip():
                thread.append({"t": _now_iso, "who": "dorfladen", "text": personal_antwort.strip()})
                _thread_changed = True
            if _thread_changed:
                patch_data["dl_chatverlauf"] = json.dumps(thread, ensure_ascii=False)

            if not patch_data:
                return func.HttpResponse(
                    json.dumps({"success": False, "error": "Keine Änderung angegeben"}, ensure_ascii=False),
                    status_code=400, headers=get_cors_headers(),
                )

            patch_headers = {**headers, "If-Match": "*"}
            pr = requests.patch(
                f"{base_url}/api/data/v9.2/{ENTITY_SET}({record_id})",
                headers=patch_headers, json=patch_data, timeout=30,
            )

            if pr.status_code in (200, 204):
                # Send push notification on confirm/cancel
                customer_email = existing.get("dl_email", "")
                gericht_name = existing.get("dl_gericht", "Mittagessen")
                bestellnr = existing.get("dl_bestellnummer", "")

                if customer_email and new_status is not None:
                    if int(new_status) == STATUS_BESTAETIGT:
                        push_body = f"Ihre Bestellung ({gericht_name}) wurde bestätigt!"
                        if bestaetigung_text:
                            push_body += f" {bestaetigung_text}"
                        _send_push(customer_email, "✅ Mittagessen bestätigt", push_body, f"lunch-{bestellnr}", bestellnr, _push_origin)
                    elif int(new_status) == STATUS_STORNIERT:
                        push_body = f"Ihre Bestellung ({gericht_name}) wurde leider storniert."
                        if bestaetigung_text:
                            push_body += f" {bestaetigung_text}"
                        _send_push(customer_email, "❌ Bestellung storniert", push_body, f"lunch-{bestellnr}", bestellnr, _push_origin)
                    elif int(new_status) == STATUS_ABGEHOLT:
                        _send_push(customer_email, "🍽 Guten Appetit!", f"Ihr Mittagessen ({gericht_name}) wurde abgeholt. Guten Appetit!", f"lunch-{bestellnr}", bestellnr, _push_origin)

                # Push to customer when staff sends a reply
                if customer_email and personal_antwort:
                    _send_push(customer_email, "💬 Nachricht vom Dorfladen", personal_antwort, f"lunch-reply-{bestellnr}", bestellnr, _push_origin)

                return func.HttpResponse(
                    json.dumps({"success": True, "message": "Status aktualisiert"}, ensure_ascii=False),
                    status_code=200, headers=get_cors_headers(),
                )

            return func.HttpResponse(
                json.dumps({"success": False, "error": f"Update fehlgeschlagen ({pr.status_code})"}, ensure_ascii=False),
                status_code=500, headers=get_cors_headers(),
            )

        return func.HttpResponse(
            json.dumps({"success": False, "error": "Method not allowed"}, ensure_ascii=False),
            status_code=405, headers=get_cors_headers(),
        )

    except Exception as e:
        logging.error(f"[lunch-order] Exception: {e}")
        return func.HttpResponse(
            json.dumps({"success": False, "error": str(e)}, ensure_ascii=False),
            status_code=500, headers=get_cors_headers(),
        )
