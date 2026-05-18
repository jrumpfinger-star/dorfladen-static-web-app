import azure.functions as func
import json
import os
import msal
import requests

def get_token(url_setting_name="DV_DEV_URL"):
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

def get_headers(url_setting_name="DV_DEV_URL"):
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
        headers = get_headers("DV_DEV_URL")
        dev_url = os.environ.get("DV_DEV_URL", "https://org392a4789.crm16.dynamics.com")
        url = f"{dev_url}/api/data/v9.2/dl_wochenplans?$filter=dl_status eq 101001&$orderby=dl_datum asc"
        r = requests.get(url, headers=headers)
        if r.status_code == 200:
            data = r.json()
            wochenplan_list = []
            for item in data.get("value", []):
                wochenplan_list.append({
                    "id": item.get("dl_wochenplansid"),
                    "dl_wochenplanid": item.get("dl_wochenplansid"),
                    "dl_wochenplansid": item.get("dl_wochenplansid"),
                    "gericht": item.get("dl_gericht", ""),
                    "dl_gericht": item.get("dl_gericht", ""),
                    "wochentag": item.get("dl_wochentag"),
                    "dl_wochentag": item.get("dl_wochentag"),
                    "_dl_wochentag_label": DAY_LABELS.get(item.get("dl_wochentag"), ""),
                    "preis": item.get("dl_preis", 0),
                    "dl_preis": item.get("dl_preis", 0),
                    "beschreibung": item.get("dl_beschreibung", ""),
                    "dl_beschreibung": item.get("dl_beschreibung", ""),
                    "datum": item.get("dl_datum"),
                    "dl_datum": item.get("dl_datum"),
                    "kalenderwoche": item.get("dl_kalenderwoche"),
                    "dl_kalenderwoche": item.get("dl_kalenderwoche"),
                    "jahr": item.get("dl_jahr"),
                    "dl_jahr": item.get("dl_jahr"),
                    "status": item.get("dl_status"),
                    "dl_status": item.get("dl_status")
                })
            return func.HttpResponse(
                json.dumps({"success": True, "data": wochenplan_list}, ensure_ascii=False),
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
