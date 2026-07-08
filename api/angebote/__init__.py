import azure.functions as func
import json
import os
import msal
import requests


DEFAULT_URL_SETTING = "DV_DEFAULT_URL"
DEFAULT_URL_FALLBACK = "https://orgab4e2f00.crm16.dynamics.com"
ENTITY_SET = "dl_angebotes"


def get_token():
    from shared.dataverse import get_tenant_id, get_client_id
    tenant_id = get_tenant_id()
    client_id = get_client_id()
    client_secret = os.environ.get("DV_CLIENT_SECRET", "")
    target_url = os.environ.get(DEFAULT_URL_SETTING, DEFAULT_URL_FALLBACK)
    if not client_secret:
        return "FEHLER_SECRET_FEHLT"
    try:
        a = msal.ConfidentialClientApplication(
            client_id,
            authority=f"https://login.microsoftonline.com/{tenant_id}",
            client_credential=client_secret,
        )
        r = a.acquire_token_for_client(scopes=[f"{target_url}/.default"])
        return r.get("access_token")
    except Exception as e:
        return f"FEHLER: {str(e)}"


def _base_url():
    return os.environ.get(DEFAULT_URL_SETTING, DEFAULT_URL_FALLBACK)


def get_headers():
    token = get_token()
    return {
        "Authorization": f"Bearer {token}",
        "OData-MaxVersion": "4.0",
        "OData-Version": "4.0",
        "Accept": "application/json",
        "Content-Type": "application/json; charset=utf-8"
    }


def _build_offer_payload(body):
    payload = {
        "dl_produkt": body.get("dl_produkt") or body.get("name") or body.get("produkt") or "",
        "dl_details": body.get("dl_details") if body.get("dl_details") is not None else body.get("details"),
        "dl_preis": body.get("dl_preis") if body.get("dl_preis") is not None else body.get("price") or body.get("preis"),
        "dl_statt_preis": body.get("dl_statt_preis") if body.get("dl_statt_preis") is not None else body.get("old_price") or body.get("statt_preis"),
        "dl_aktion_titel": body.get("dl_aktion_titel") or body.get("aktion_titel"),
        "dl_aktion_id": body.get("dl_aktion_id") or body.get("aktion_id"),
        "dl_artikelnummer": body.get("dl_artikelnummer") or body.get("artikelnummer"),
        "dl_gueltig_von": body.get("dl_gueltig_von") or body.get("valid_from") or body.get("gueltig_von"),
        "dl_gueltig_bis": body.get("dl_gueltig_bis") or body.get("valid_to") or body.get("gueltig_bis"),
        # dl_bild_base64 field does not exist in Dataverse dl_angebote table - skip it
        "dl_sortierung": body.get("dl_sortierung") if body.get("dl_sortierung") is not None else body.get("sortierung"),
        "dl_status": body.get("dl_status") if body.get("dl_status") is not None else body.get("status")
    }

    if payload.get("dl_status") is None:
        payload["dl_status"] = 101001

    clean = {}
    for key, value in payload.items():
        if value is not None and value != "":
            clean[key] = value
    return clean

def get_cors_headers():
    return {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, POST, PATCH, OPTIONS, DELETE",
        "Access-Control-Allow-Headers": "*",
        "Access-Control-Max-Age": "86400",
        "Content-Type": "application/json; charset=utf-8"
    }

def main(req: func.HttpRequest) -> func.HttpResponse:
    if req.method == "OPTIONS":
        return func.HttpResponse(status_code=200, headers=get_cors_headers())
    try:
        method = req.method.upper()
        offer_id = req.route_params.get("id")
        base_url = _base_url()
        headers = get_headers()

        if method == "GET":
            # Expand linked werbebild to include image data
            expand = "&$expand=dl_WerbebildId($select=dl_werbebildid,dl_artikelnummer,dl_bild_base64,dl_download_url)"
            url = f"{base_url}/api/data/v9.2/{ENTITY_SET}?$filter=dl_status eq 101001&$orderby=dl_aktion_id desc,dl_sortierung asc,dl_produkt asc{expand}"
            r = requests.get(url, headers=headers, timeout=30)

            if r.status_code == 200:
                data = r.json()
                angebote_list = []
                for item in data.get("value", []):
                    wb = item.get("dl_WerbebildId") or {}
                    angebote_list.append({
                        "id": item.get("dl_angeboteid"),
                        "dl_angeboteid": item.get("dl_angeboteid"),
                        "name": item.get("dl_produkt", ""),
                        "produkt": item.get("dl_produkt", ""),
                        "dl_produkt": item.get("dl_produkt", ""),
                        "details": item.get("dl_details", "") or item.get("dl_beschreibung", ""),
                        "dl_details": item.get("dl_details", "") or item.get("dl_beschreibung", ""),
                        "price": item.get("dl_preis", 0),
                        "preis": item.get("dl_preis", 0),
                        "dl_preis": item.get("dl_preis", 0),
                        "old_price": item.get("dl_statt_preis", 0),
                        "statt_preis": item.get("dl_statt_preis", 0),
                        "dl_statt_preis": item.get("dl_statt_preis", 0),
                        "aktion_titel": item.get("dl_aktion_titel", ""),
                        "dl_aktion_titel": item.get("dl_aktion_titel", ""),
                        "aktion_id": item.get("dl_aktion_id", ""),
                        "dl_aktion_id": item.get("dl_aktion_id", ""),
                        "artikelnummer": item.get("dl_artikelnummer", ""),
                        "dl_artikelnummer": item.get("dl_artikelnummer", ""),
                        "valid_from": item.get("dl_gueltig_von"),
                        "gueltig_von": item.get("dl_gueltig_von"),
                        "dl_gueltig_von": item.get("dl_gueltig_von"),
                        "valid_to": item.get("dl_gueltig_bis"),
                        "gueltig_bis": item.get("dl_gueltig_bis"),
                        "dl_gueltig_bis": item.get("dl_gueltig_bis"),
                        "sortierung": item.get("dl_sortierung", 0),
                        "dl_sortierung": item.get("dl_sortierung", 0),
                        "status": item.get("dl_status"),
                        "dl_status": item.get("dl_status"),
                        "bild_data": wb.get("dl_download_url", "") or wb.get("dl_bild_base64", ""),
                        "dl_bild_base64": wb.get("dl_bild_base64", ""),
                        "dl_download_url": wb.get("dl_download_url", ""),
                        "dl_werbebildid": wb.get("dl_werbebildid", "") or item.get("_dl_werbebildid_value", ""),
                    })
                # Optional date filter: ?filter=today returns only currently valid offers
                filter_param = req.params.get("filter", "").lower()
                if filter_param == "today":
                    from datetime import datetime, timedelta, timezone
                    cet = timezone(timedelta(hours=2))
                    today = datetime.now(cet).strftime("%Y-%m-%d")
                    filtered = []
                    for a in angebote_list:
                        von = (a.get("dl_gueltig_von") or "")[:10]
                        bis = (a.get("dl_gueltig_bis") or "")[:10]
                        if von and von > today:
                            continue
                        if bis and bis < today:
                            continue
                        filtered.append(a)
                    angebote_list = filtered

                return func.HttpResponse(
                    json.dumps({"success": True, "data": angebote_list}, ensure_ascii=False),
                    status_code=200,
                    mimetype="application/json",
                    headers=get_cors_headers()
                )

            return func.HttpResponse(
                json.dumps({"success": False, "error": f"Dataverse error: {r.status_code}"}, ensure_ascii=False),
                status_code=r.status_code,
                mimetype="application/json",
                headers=get_cors_headers()
            )

        if method == "POST":
            body = req.get_json()
            payload = _build_offer_payload(body)

            # Optionally bind werbebild lookup
            werbebild_id = body.get("dl_werbebildid") or body.get("werbebildid")
            if werbebild_id:
                payload["dl_WerbebildId@odata.bind"] = f"/dl_werbebilds({werbebild_id})"

            post_headers = {**headers, "Prefer": "return=representation"}
            r = requests.post(
                f"{base_url}/api/data/v9.2/{ENTITY_SET}",
                headers=post_headers,
                json=payload,
                timeout=30
            )
            if r.status_code in (200, 201, 204):
                new_id = ""
                if r.status_code != 204:
                    try:
                        new_id = r.json().get("dl_angeboteid", "")
                    except:
                        pass
                if not new_id:
                    eid = r.headers.get("OData-EntityId", "")
                    if "(" in eid:
                        new_id = eid.split("(")[-1].rstrip(")")
                return func.HttpResponse(
                    json.dumps({"success": True, "id": new_id}, ensure_ascii=False),
                    status_code=200,
                    mimetype="application/json",
                    headers=get_cors_headers()
                )

            return func.HttpResponse(
                json.dumps({"success": False, "error": f"Dataverse error: {r.status_code}", "details": r.text[:300]}, ensure_ascii=False),
                status_code=r.status_code,
                mimetype="application/json",
                headers=get_cors_headers()
            )

        if method == "PATCH":
            if not offer_id:
                return func.HttpResponse(
                    json.dumps({"success": False, "error": "Missing offer id"}, ensure_ascii=False),
                    status_code=400,
                    mimetype="application/json",
                    headers=get_cors_headers()
                )

            body = req.get_json()
            payload = _build_offer_payload(body)

            # Optionally bind or unbind werbebild lookup
            werbebild_id = body.get("dl_werbebildid") or body.get("werbebildid")
            if werbebild_id:
                payload["dl_WerbebildId@odata.bind"] = f"/dl_werbebilds({werbebild_id})"

            patch_headers = {**headers, "If-Match": "*"}
            r = requests.patch(
                f"{base_url}/api/data/v9.2/{ENTITY_SET}({offer_id})",
                headers=patch_headers,
                json=payload,
                timeout=30
            )
            if r.status_code in (200, 204):
                return func.HttpResponse(
                    json.dumps({"success": True}, ensure_ascii=False),
                    status_code=200,
                    mimetype="application/json",
                    headers=get_cors_headers()
                )

            return func.HttpResponse(
                json.dumps({"success": False, "error": f"Dataverse error: {r.status_code}", "details": r.text[:300]}, ensure_ascii=False),
                status_code=r.status_code,
                mimetype="application/json",
                headers=get_cors_headers()
            )

        if method == "DELETE":
            if not offer_id:
                return func.HttpResponse(
                    json.dumps({"success": False, "error": "Missing offer id"}, ensure_ascii=False),
                    status_code=400,
                    mimetype="application/json",
                    headers=get_cors_headers()
                )

            del_headers = {**headers, "If-Match": "*"}
            r = requests.delete(
                f"{base_url}/api/data/v9.2/{ENTITY_SET}({offer_id})",
                headers=del_headers,
                timeout=30
            )
            if r.status_code in (200, 204):
                return func.HttpResponse(
                    json.dumps({"success": True}, ensure_ascii=False),
                    status_code=200,
                    mimetype="application/json",
                    headers=get_cors_headers()
                )

            return func.HttpResponse(
                json.dumps({"success": False, "error": f"Dataverse error: {r.status_code}", "details": r.text[:300]}, ensure_ascii=False),
                status_code=r.status_code,
                mimetype="application/json",
                headers=get_cors_headers()
            )

        return func.HttpResponse(
            json.dumps({"success": False, "error": f"Unsupported method: {method}"}, ensure_ascii=False),
            status_code=405,
            mimetype="application/json",
            headers=get_cors_headers()
        )
    except Exception as e:
        return func.HttpResponse(
            json.dumps({"success": False, "error": str(e)}, ensure_ascii=False),
            status_code=500,
            mimetype="application/json",
            headers=get_cors_headers()
        )
