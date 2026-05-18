import azure.functions as func
import json
import os
import msal
import requests
from datetime import datetime

def get_token(url_setting_name="DV_DEFAULT_URL"):
    tenant_id = os.environ.get("DV_TENANT_ID", "acfaedd4-c403-43b7-9544-fdb2b150124e")
    client_id = os.environ.get("DV_CLIENT_ID", "137b2df6-be83-459a-ac89-9efd0bdf51c4")
    client_secret = os.environ.get("DV_CLIENT_SECRET", "")
    target_url = os.environ.get(url_setting_name, "https://orgab4e2f00.crm16.dynamics.com")
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
        url = f"{default_url}/api/data/v9.2/cr5d4_tables?$select=cr5d4_artikelnummeredeka,cr5d4_artikelbezeichnung,cr5d4_vk_dorf,cr5d4_warengruppebez,cr5d4_uvp_total&$orderby=cr5d4_artikelbezeichnung asc"
        r = requests.get(url, headers=headers)
        if r.status_code == 200:
            data = r.json()
            items = data.get("value", [])
            
            groups = {}
            for item in items:
                artikelnummer = item.get("cr5d4_artikelnummeredeka", "")
                bezeichnung = item.get("cr5d4_artikelbezeichnung", "")
                preis = item.get("cr5d4_vk_dorf", 0)
                uvp_preis = item.get("cr5d4_uvp_total")
                warengruppe_bez = item.get("cr5d4_warengruppebez", "")
                
                if warengruppe_bez:
                    wg_name_mapping = {
                        "Obst": "Obst",
                        "Gemüse": "Gemüse",
                        "Obst & Gemüse": "Obst",
                        "Gemüse & Obst": "Obst",
                        "Sonstiges": "Sonstiges",
                        "Sonstiges 19%": "Sonstiges",
                        "Sonstiges 7%": "Sonstiges",
                        "Mittagessen": "Mittagessen",
                        "Mittagessen 7%": "Mittagessen",
                        "Mittagessen 7% MwSt": "Mittagessen",
                        "Kuchen": "Kuchen",
                        "Honig & Marmelade": "Honig & Marmelade",
                        "Papier & Schreibwaren": "Papier & Schreibwaren",
                        "Haushalt": "Haushalt",
                        "Getränke": "Getränke",
                        "Molkerei": "Molkerei",
                        "Backwaren": "Backwaren",
                        "Fleisch": "Fleisch",
                        "Trockenwaren": "Trockenwaren",
                        "Süßwaren": "Süßwaren",
                        "Gewürze": "Gewürze",
                        "Effektive Mikroorganismen": "Effektive Mikroorganismen",
                        "EM": "Effektive Mikroorganismen",
                        "EM Keramik": "Effektive Mikroorganismen",
                        "Tabakwaren": "Tabakwaren"
                    }
                    warengruppe = wg_name_mapping.get(warengruppe_bez, warengruppe_bez)
                else:
                    warengruppe = "Sonstiges"
                
                if warengruppe not in groups:
                    groups[warengruppe] = []
                
                discount = 0
                if uvp_preis and uvp_preis > 0 and preis > 0:
                    discount = ((uvp_preis - preis) / uvp_preis) * 100
                
                groups[warengruppe].append({
                    "artikelnummer": artikelnummer,
                    "bezeichnung": bezeichnung,
                    "vk": preis,
                    "uvp": uvp_preis,
                    "discount": discount,
                    "angebot": False,
                    "angebot_statt": None,
                    "angebot_preis": None
                })
            
            result = {
                "groups": groups,
                "total": len(items),
                "warengruppen": len(groups),
                "generated": datetime.now().isoformat()
            }
            return func.HttpResponse(
                json.dumps(result, ensure_ascii=False),
                status_code=200,
                mimetype="application/json",
                headers=get_cors_headers()
            )
        return func.HttpResponse(
            json.dumps({"error": f"Dataverse error: {r.status_code}"}, ensure_ascii=False),
            status_code=r.status_code,
            mimetype="application/json",
            headers=get_cors_headers()
        )
    except Exception as e:
        return func.HttpResponse(
            json.dumps({"error": str(e)}, ensure_ascii=False),
            status_code=500,
            mimetype="application/json",
            headers=get_cors_headers()
        )
