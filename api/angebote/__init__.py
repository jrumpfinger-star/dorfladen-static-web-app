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
        "Access-Control-Allow-Methods": "GET, POST, OPTIONS, DELETE",
        "Access-Control-Allow-Headers": "*",
        "Access-Control-Max-Age": "86400",
        "Content-Type": "application/json; charset=utf-8"
    }

def main(req: func.HttpRequest) -> func.HttpResponse:
    if req.method == "OPTIONS":
        return func.HttpResponse(status_code=200, headers=get_cors_headers())
    try:
        headers = get_headers("DV_DEFAULT_URL")
        default_url = os.environ.get("DV_DEFAULT_URL", "https://orgab4e2f00.crm16.dynamics.com")
        url = f"{default_url}/api/data/v9.2/dl_angebotes?$filter=dl_status eq 101001&$orderby=dl_produkt asc"
        r = requests.get(url, headers=headers)
        if r.status_code == 200:
            data = r.json()
            angebote_list = []
            for item in data.get("value", []):
                angebote_list.append({
                    "id": item.get("dl_angeboteid"),
                    "dl_angeboteid": item.get("dl_angeboteid"),
                    "name": item.get("dl_produkt", ""),
                    "dl_produkt": item.get("dl_produkt", ""),
                    "details": item.get("dl_details", "") or item.get("dl_beschreibung", ""),
                    "dl_details": item.get("dl_details", "") or item.get("dl_beschreibung", ""),
                    "price": item.get("dl_preis", 0),
                    "dl_preis": item.get("dl_preis", 0),
                    "old_price": item.get("dl_statt_preis", 0),
                    "dl_statt_preis": item.get("dl_statt_preis", 0),
                    "aktion_titel": item.get("dl_aktion_titel", ""),
                    "dl_aktion_titel": item.get("dl_aktion_titel", ""),
                    "aktion_id": item.get("dl_aktion_id", ""),
                    "dl_aktion_id": item.get("dl_aktion_id", ""),
                    "artikelnummer": item.get("dl_artikelnummer", ""),
                    "dl_artikelnummer": item.get("dl_artikelnummer", ""),
                    "valid_from": item.get("dl_gueltig_von"),
                    "dl_gueltig_von": item.get("dl_gueltig_von"),
                    "valid_to": item.get("dl_gueltig_bis"),
                    "dl_gueltig_bis": item.get("dl_gueltig_bis"),
                    "bild_data": item.get("dl_bild_base64", ""),
                    "dl_bild_base64": item.get("dl_bild_base64", "")
                })
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
    except Exception as e:
        return func.HttpResponse(
            json.dumps({"success": False, "error": str(e)}, ensure_ascii=False),
            status_code=500,
            mimetype="application/json",
            headers=get_cors_headers()
        )
