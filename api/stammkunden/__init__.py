"""
Stammkunden API – Verwaltung von Telefon-/Ladenkunden
=====================================================
Separate Kundenverwaltung für Kunden die nicht online bestellen.
Erweiterbar für allgemeine Telefonbestellverwaltung.

POST   /api/stammkunden           → Neuen Stammkunden anlegen
GET    /api/stammkunden            → Liste (mit Suche)
GET    /api/stammkunden/{id}       → Einzelner Kunde
PATCH  /api/stammkunden/{id}       → Daten aktualisieren
DELETE /api/stammkunden/{id}       → Kunde deaktivieren (soft-delete)

Dataverse Entity: dl_stammkundens
Felder: dl_name, dl_vorname, dl_nachname, dl_telefon, dl_email,
        dl_adresse, dl_notiz, dl_aktiv, dl_bevorzugt_mitnehmen,
        dl_stammkunde_nr
"""
import azure.functions as func
import json
import logging
import os
import uuid
from datetime import datetime

import msal
import requests


ENTITY_SET = "dl_stammkundes"
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
        "Access-Control-Allow-Methods": "GET, POST, PATCH, DELETE, OPTIONS",
        "Access-Control-Allow-Headers": "*",
        "Access-Control-Max-Age": "86400",
        "Content-Type": "application/json; charset=utf-8",
    }


def _serialize(item):
    return {
        "id": item.get("dl_stammkundeid", ""),
        "name": item.get("dl_name", ""),
        "vorname": item.get("dl_vorname", ""),
        "nachname": item.get("dl_nachname", ""),
        "telefon": item.get("dl_telefon", ""),
        "email": item.get("dl_email", ""),
        "adresse": item.get("dl_adresse", ""),
        "notiz": item.get("dl_notiz", ""),
        "aktiv": item.get("dl_aktiv", True),
        "bevorzugt_mitnehmen": item.get("dl_bevorzugt_mitnehmen", False),
        "stammkunde_nr": item.get("dl_stammkunde_nr", ""),
        "erstellt_am": item.get("createdon", ""),
    }


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
        # ── POST: Create customer ──
        if req.method == "POST":
            body = req.get_json()

            vorname = (body.get("vorname") or "").strip()
            nachname = (body.get("nachname") or "").strip()
            name = (body.get("name") or "").strip()
            telefon = (body.get("telefon") or "").strip()
            email = (body.get("email") or "").strip().lower()
            adresse = (body.get("adresse") or "").strip()
            notiz = (body.get("notiz") or "").strip()
            bevorzugt_mitnehmen = body.get("bevorzugt_mitnehmen", False)

            # Auto-compose display name
            if not name and (vorname or nachname):
                name = f"{vorname} {nachname}".strip()

            errors = []
            if not name:
                errors.append("Name ist erforderlich.")
            if not telefon and not email:
                errors.append("Telefon oder E-Mail erforderlich.")
            if errors:
                return func.HttpResponse(
                    json.dumps({"success": False, "errors": errors}, ensure_ascii=False),
                    status_code=400, headers=get_cors_headers(),
                )

            # Check for duplicate (same name + telefon)
            dup_filter = f"dl_name eq '{name}'"
            if telefon:
                dup_filter += f" and dl_telefon eq '{telefon}'"
            dup_r = requests.get(
                f"{base_url}/api/data/v9.2/{ENTITY_SET}",
                headers=headers,
                params={"$filter": dup_filter, "$top": "1", "$select": "dl_stammkundeid,dl_name"},
                timeout=15,
            )
            if dup_r.status_code == 200:
                dups = dup_r.json().get("value", [])
                if dups:
                    existing = _serialize(dups[0])
                    return func.HttpResponse(
                        json.dumps({
                            "success": False,
                            "error": "Kunde existiert bereits",
                            "existing": existing,
                        }, ensure_ascii=False),
                        status_code=409, headers=get_cors_headers(),
                    )

            sk_nr = f"SK-{uuid.uuid4().hex[:6].upper()}"

            payload = {
                "dl_name": name,
                "dl_vorname": vorname,
                "dl_nachname": nachname,
                "dl_telefon": telefon,
                "dl_email": email,
                "dl_adresse": adresse,
                "dl_notiz": notiz,
                "dl_aktiv": True,
                "dl_bevorzugt_mitnehmen": bevorzugt_mitnehmen,
                "dl_stammkunde_nr": sk_nr,
            }

            post_headers = {**headers, "Prefer": "return=representation"}
            r = requests.post(
                f"{base_url}/api/data/v9.2/{ENTITY_SET}",
                headers=post_headers, json=payload, timeout=30,
            )

            if r.status_code in (200, 201):
                record = r.json()
                customer = _serialize(record)
                logging.info(f"[stammkunden] Created {sk_nr}: {name}")
                return func.HttpResponse(
                    json.dumps({"success": True, "customer": customer}, ensure_ascii=False),
                    status_code=201, headers=get_cors_headers(),
                )
            else:
                logging.error(f"[stammkunden] Create failed: {r.status_code} {r.text[:300]}")
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
                        json.dumps({"success": True, "customer": _serialize(r.json())}, ensure_ascii=False),
                        status_code=200, headers=get_cors_headers(),
                    )
                return func.HttpResponse(
                    json.dumps({"success": False, "error": "Nicht gefunden"}, ensure_ascii=False),
                    status_code=404, headers=get_cors_headers(),
                )

            # List with search
            search = req.params.get("q", "").strip()
            show_inactive = req.params.get("inactive", "") == "1"

            odata_filters = []
            if not show_inactive:
                odata_filters.append("dl_aktiv eq true")
            if search:
                # Search in name, telefon
                odata_filters.append(
                    f"(contains(dl_name,'{search}') or contains(dl_telefon,'{search}'))"
                )

            url = f"{base_url}/api/data/v9.2/{ENTITY_SET}"
            params = {
                "$select": "dl_stammkundeid,dl_name,dl_vorname,dl_nachname,dl_telefon,dl_email,dl_adresse,dl_notiz,dl_aktiv,dl_bevorzugt_mitnehmen,dl_stammkunde_nr,createdon",
                "$orderby": "dl_name asc",
                "$top": "200",
            }
            if odata_filters:
                params["$filter"] = " and ".join(odata_filters)

            r = requests.get(url, headers=headers, params=params, timeout=30)
            if r.status_code == 200:
                items = r.json().get("value", [])
                customers = [_serialize(item) for item in items]
                return func.HttpResponse(
                    json.dumps({"success": True, "customers": customers, "count": len(customers)}, ensure_ascii=False),
                    status_code=200, headers=get_cors_headers(),
                )
            return func.HttpResponse(
                json.dumps({"success": False, "error": f"Fehler ({r.status_code})"}, ensure_ascii=False),
                status_code=500, headers=get_cors_headers(),
            )

        # ── PATCH: Update customer ──
        if req.method == "PATCH" and record_id:
            body = req.get_json()
            patch_data = {}
            for field_map in [
                ("name", "dl_name"), ("vorname", "dl_vorname"), ("nachname", "dl_nachname"),
                ("telefon", "dl_telefon"), ("email", "dl_email"), ("adresse", "dl_adresse"),
                ("notiz", "dl_notiz"),
            ]:
                if field_map[0] in body:
                    patch_data[field_map[1]] = (body[field_map[0]] or "").strip()
            if "aktiv" in body:
                patch_data["dl_aktiv"] = bool(body["aktiv"])
            if "bevorzugt_mitnehmen" in body:
                patch_data["dl_bevorzugt_mitnehmen"] = bool(body["bevorzugt_mitnehmen"])

            if not patch_data:
                return func.HttpResponse(
                    json.dumps({"success": False, "error": "Keine Änderung"}, ensure_ascii=False),
                    status_code=400, headers=get_cors_headers(),
                )

            # Auto-compose name if vorname/nachname changed
            if "dl_vorname" in patch_data or "dl_nachname" in patch_data:
                vn = patch_data.get("dl_vorname", "")
                nn = patch_data.get("dl_nachname", "")
                if vn or nn:
                    patch_data["dl_name"] = f"{vn} {nn}".strip()

            patch_headers = {**headers, "If-Match": "*"}
            r = requests.patch(
                f"{base_url}/api/data/v9.2/{ENTITY_SET}({record_id})",
                headers=patch_headers, json=patch_data, timeout=30,
            )

            if r.status_code in (200, 204):
                return func.HttpResponse(
                    json.dumps({"success": True, "message": "Kunde aktualisiert"}, ensure_ascii=False),
                    status_code=200, headers=get_cors_headers(),
                )
            return func.HttpResponse(
                json.dumps({"success": False, "error": f"Update fehlgeschlagen ({r.status_code})"}, ensure_ascii=False),
                status_code=500, headers=get_cors_headers(),
            )

        # ── DELETE: Soft-delete (deactivate) ──
        if req.method == "DELETE" and record_id:
            patch_headers = {**headers, "If-Match": "*"}
            r = requests.patch(
                f"{base_url}/api/data/v9.2/{ENTITY_SET}({record_id})",
                headers=patch_headers, json={"dl_aktiv": False}, timeout=30,
            )
            if r.status_code in (200, 204):
                return func.HttpResponse(
                    json.dumps({"success": True, "message": "Kunde deaktiviert"}, ensure_ascii=False),
                    status_code=200, headers=get_cors_headers(),
                )
            return func.HttpResponse(
                json.dumps({"success": False, "error": f"Fehler ({r.status_code})"}, ensure_ascii=False),
                status_code=500, headers=get_cors_headers(),
            )

        return func.HttpResponse(
            json.dumps({"success": False, "error": "Method not allowed"}, ensure_ascii=False),
            status_code=405, headers=get_cors_headers(),
        )

    except Exception as e:
        logging.error(f"[stammkunden] Exception: {e}")
        return func.HttpResponse(
            json.dumps({"success": False, "error": str(e)}, ensure_ascii=False),
            status_code=500, headers=get_cors_headers(),
        )
