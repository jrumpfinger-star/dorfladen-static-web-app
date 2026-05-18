import azure.functions as func
import json
import os
import msal
import requests

def get_token(url_setting_name="DV_DEFAULT_URL"):
    tenant_id = os.environ.get("DV_TENANT_ID", "acfaedd4-c403-43b7-9544-fdb2b150124e")
    client_id = os.environ.get("DV_CLIENT_ID", "137b2df6-be83-459a-ac89-9efd0bdf51c4")
    client_secret = os.environ.get("DV_CLIENT_SECRET", "")
    target_url = os.environ.get("DV_DEV_URL", "https://org392a4789.crm16.dynamics.com")
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
    token = get_token("DV_DEV_URL")
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
        "Access-Control-Allow-Methods": "GET, POST, OPTIONS, DELETE",
        "Access-Control-Allow-Headers": "*",
        "Access-Control-Max-Age": "86400",
        "Content-Type": "application/json; charset=utf-8"
    }

DAY_LABELS = {101000: "Montag", 101001: "Dienstag", 101002: "Mittwoch", 101003: "Donnerstag", 101004: "Freitag", 101005: "Samstag", 101006: "Sonntag"}

def main(req: func.HttpRequest) -> func.HttpResponse:
    if req.method == "OPTIONS":
        return func.HttpResponse(status_code=200, headers=get_cors_headers())
    try:
        headers = get_headers("DV_DEFAULT_URL")
        default_url = os.environ.get("DV_DEFAULT_URL", "https://orgab4e2f00.crm16.dynamics.com")
        url = (
            f"{default_url}/api/data/v9.2/dl_oeffnungszeits"
            f"?$select=dl_name,dl_wochentag,dl_geschlossen,dl_vormittag_von,dl_vormittag_bis,"
            f"dl_nachmittag_von,dl_nachmittag_bis,dl_sortierung,dl_hinweis"
            f"&$orderby=dl_sortierung asc"
        )
        r = requests.get(url, headers=headers)
        if r.status_code == 200:
            data = r.json()
            hours_list = []
            for item in data.get("value", []):
                wochentag = item.get("dl_wochentag")
                hours_list.append({
                    "id": item.get("dl_oeffnungszeitsid"),
                    "dl_oeffnungszeitsid": item.get("dl_oeffnungszeitsid"),
                    "dl_oeffnungszeitid": item.get("dl_oeffnungszeitsid"),
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
