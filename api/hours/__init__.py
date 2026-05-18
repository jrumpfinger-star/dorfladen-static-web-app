import azure.functions as func
import json
import os
import msal
import requests

def get_token(url_setting_name="DV_DEFAULT_URL"):
    tenant_id = os.environ.get("DV_TENANT_ID", "acfaedd4-c403-43b7-9544-fdb2b150124e")
    client_id = os.environ.get("DV_CLIENT_ID", "137b2df6-be83-459a-ac89-9efd0bdf51c4")
    client_secret = os.environ.get("DV_CLIENT_SECRET", "")
    target_url = os.environ.get(url_setting_name, "https://org392a4789.crm16.dynamics.com")
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

def get_headers(url_setting_name="DV_DEFAULT_URL"):
    token = get_token(url_setting_name)
    return {
        "Authorization": f"Bearer {token}",
        "OData-MaxVersion": "4.0",
        "OData-Version": "4.0",
        "Accept": "application/json",
        "Content-Type": "application/json; charset=utf-8"
    }

def get_cors_headers():
    return {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, POST, PATCH, OPTIONS, DELETE",
        "Access-Control-Allow-Headers": "*",
        "Access-Control-Max-Age": "86400",
        "Content-Type": "application/json; charset=utf-8"
    }

DAY_LABELS = {101000: "Montag", 101001: "Dienstag", 101002: "Mittwoch", 101003: "Donnerstag", 101004: "Freitag", 101005: "Samstag", 101006: "Sonntag"}

def main(req: func.HttpRequest) -> func.HttpResponse:
    if req.method == "OPTIONS":
        return func.HttpResponse(status_code=200, headers=get_cors_headers())

    record_id = req.route_params.get("id")

    if req.method == "PATCH":
        try:
            headers = get_headers("DV_DEFAULT_URL")
            default_url = os.environ.get("DV_DEFAULT_URL", "https://orgab4e2f00.crm16.dynamics.com")
            body = req.get_json()
            resolved_id = record_id

            if not resolved_id:
                day = body.get("dl_wochentag")
                name = body.get("dl_name")
                if day is not None and name:
                    safe_name = str(name).replace("'", "''")
                    lookup_url = (
                        f"{default_url}/api/data/v9.2/dl_oeffnungszeits"
                        f"?$filter=dl_wochentag eq {int(day)} and dl_name eq '{safe_name}'"
                        f"&$top=1"
                    )
                    lr = requests.get(lookup_url, headers=headers)
                    if lr.status_code == 200:
                        vals = lr.json().get("value", [])
                        if vals:
                            rec = vals[0]
                            resolved_id = rec.get("dl_oeffnungszeitid") or rec.get("dl_oeffnungszeitsid")
                            if not resolved_id:
                                for key, value in rec.items():
                                    lk = key.lower()
                                    if lk.startswith("dl_oeffnungszeit") and lk.endswith("id") and value:
                                        resolved_id = value
                                        break

            if not resolved_id:
                return func.HttpResponse(
                    json.dumps({"success": False, "error": "No record id resolved for opening hours update"}, ensure_ascii=False),
                    status_code=400,
                    mimetype="application/json",
                    headers=get_cors_headers()
                )

            patch_url = f"{default_url}/api/data/v9.2/dl_oeffnungszeits({resolved_id})"
            patch_headers = {**headers, "If-Match": "*"}
            r = requests.patch(patch_url, headers=patch_headers, json=body)
            if r.status_code in (200, 204):
                return func.HttpResponse(
                    json.dumps({"success": True}, ensure_ascii=False),
                    status_code=200,
                    mimetype="application/json",
                    headers=get_cors_headers()
                )
            return func.HttpResponse(
                json.dumps({"success": False, "error": f"Dataverse error: {r.status_code}", "detail": r.text}, ensure_ascii=False),
                status_code=r.status_code,
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

    try:
        headers = get_headers("DV_DEFAULT_URL")
        default_url = os.environ.get("DV_DEFAULT_URL", "https://orgab4e2f00.crm16.dynamics.com")
        url = (
            f"{default_url}/api/data/v9.2/dl_oeffnungszeits"
            f"?$orderby=dl_sortierung asc"
        )
        r = requests.get(url, headers=headers)
        if r.status_code == 200:
            data = r.json()
            hours_list = []
            for item in data.get("value", []):
                wochentag = item.get("dl_wochentag")
                record_id = item.get("dl_oeffnungszeitid") or item.get("dl_oeffnungszeitsid")
                if not record_id:
                    for key, value in item.items():
                        lk = key.lower()
                        if lk.startswith("dl_oeffnungszeit") and lk.endswith("id") and value:
                            record_id = value
                            break
                hours_list.append({
                    "id": record_id,
                    "dl_oeffnungszeitsid": record_id,
                    "dl_oeffnungszeitid": record_id,
                    "name": item.get("dl_name", ""),
                    "dl_name": item.get("dl_name", ""),
                    "wochentag": wochentag,
                    "dl_wochentag": wochentag,
                    "_dl_wochentag_label": DAY_LABELS.get(wochentag, ""),
                    "geschlossen": item.get("dl_geschlossen", False),
                    "dl_geschlossen": item.get("dl_geschlossen", False),
                    "vormittag_von": item.get("dl_vormittag_von") or "",
                    "dl_vormittag_von": item.get("dl_vormittag_von") or "",
                    "vormittag_bis": item.get("dl_vormittag_bis") or "",
                    "dl_vormittag_bis": item.get("dl_vormittag_bis") or "",
                    "nachmittag_von": item.get("dl_nachmittag_von") or "",
                    "dl_nachmittag_von": item.get("dl_nachmittag_von") or "",
                    "nachmittag_bis": item.get("dl_nachmittag_bis") or "",
                    "dl_nachmittag_bis": item.get("dl_nachmittag_bis") or "",
                    "sortierung": item.get("dl_sortierung"),
                    "dl_sortierung": item.get("dl_sortierung"),
                    "hinweis": item.get("dl_hinweis", ""),
                    "dl_hinweis": item.get("dl_hinweis", "")
                })
            return func.HttpResponse(
                json.dumps({"success": True, "data": hours_list}, ensure_ascii=False),
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
    except Exception as e:
        return func.HttpResponse(
            json.dumps({"success": False, "error": str(e)}, ensure_ascii=False),
            status_code=500,
            mimetype="application/json",
            headers=get_cors_headers()
        )
