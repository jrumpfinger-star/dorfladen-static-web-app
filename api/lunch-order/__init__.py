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

import msal
import requests


ENTITY_SET = "dl_mittagsbestellungs"
DEFAULT_URL_SETTING = "DV_DEFAULT_URL"
DEFAULT_URL_FALLBACK = "https://orgab4e2f00.crm16.dynamics.com"


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
        "bestellt_am": item.get("createdon", ""),
        "wochentag_label": item.get("dl_wochentag_label", ""),
        "quelle": item.get("dl_quelle", QUELLE_ONLINE),
        "quelle_label": QUELLE_LABELS.get(item.get("dl_quelle", QUELLE_ONLINE), "Online"),
        "stammkunde_id": item.get("dl_stammkunde_id", ""),
        "erfasst_von": item.get("dl_erfasst_von", ""),
    }


def _send_push(email, title, body_text, tag="lunch", bestellnr=""):
    """Best-effort push notification to customer."""
    try:
        # Use SWA_HOSTNAME for the public URL, fallback to WEBSITE_HOSTNAME
        swa_host = os.environ.get("SWA_HOSTNAME", "")
        if not swa_host:
            swa_host = os.environ.get("WEBSITE_HOSTNAME", "localhost:7071")
        protocol = "https" if "azurestaticapps" in swa_host or "azure" in swa_host else "http"
        internal_url = f"{protocol}://{swa_host}/api/push-send"
        push_url = "/bestellstatus"
        if bestellnr:
            push_url += f"?nr={bestellnr}"
        payload = {
            "title": title,
            "message": body_text,
            "url": push_url,
            "target_email": email,
            "tag": tag,
        }
        r = requests.post(internal_url, json=payload, timeout=10)
        if r.status_code in (200, 201):
            return True
    except Exception as e:
        logging.warning(f"[lunch-order] Push failed: {e}")
    return False


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
                "$select": "dl_mittagsbestellungid,dl_name,dl_email,dl_telefon,dl_gericht,dl_gericht_id,dl_menge,dl_preis,dl_datum,dl_anmerkung,dl_status,dl_bestaetigung_text,dl_bestellnummer,dl_wochentag_label,dl_mitnehmen,dl_quelle,dl_stammkunde_id,dl_erfasst_von,dl_kunde_kommentar,dl_personal_antwort,createdon",
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
            # Staff reply
            personal_antwort = body.get("personal_antwort")
            if personal_antwort is not None:
                patch_data["dl_personal_antwort"] = personal_antwort.strip()

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
                        _send_push(customer_email, "✅ Mittagessen bestätigt", push_body, f"lunch-{bestellnr}", bestellnr)
                    elif int(new_status) == STATUS_STORNIERT:
                        push_body = f"Ihre Bestellung ({gericht_name}) wurde leider storniert."
                        if bestaetigung_text:
                            push_body += f" {bestaetigung_text}"
                        _send_push(customer_email, "❌ Bestellung storniert", push_body, f"lunch-{bestellnr}", bestellnr)
                    elif int(new_status) == STATUS_ABGEHOLT:
                        _send_push(customer_email, "🍽 Guten Appetit!", f"Ihr Mittagessen ({gericht_name}) wurde abgeholt. Guten Appetit!", f"lunch-{bestellnr}", bestellnr)

                # Push to customer when staff sends a reply
                if customer_email and personal_antwort:
                    _send_push(customer_email, "💬 Nachricht vom Dorfladen", personal_antwort, f"lunch-reply-{bestellnr}", bestellnr)

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
