import azure.functions as func
import json
import os
import msal
import requests

app = func.FunctionApp(http_auth_level=func.AuthLevel.ANONYMOUS)

# Dataverse Config
TENANT_ID = os.environ.get("DV_TENANT_ID", "acfaedd4-c403-43b7-9544-fdb2b150124e")
DATVERSE_URL = os.environ.get("DV_DEFAULT_URL", "https://org392a4789.crm16.dynamics.com")
CLIENT_ID = os.environ.get("DV_CLIENT_ID", "137b2df6-be83-459a-ac89-9efd0bdf51c4")
CLIENT_SECRET = os.environ.get("DV_CLIENT_SECRET", "")

def get_token():
    """Get Dataverse token via client credentials."""
    a = msal.ConfidentialClientApplication(
        CLIENT_ID,
        authority=f"https://login.microsoftonline.com/{TENANT_ID}",
        client_credential=CLIENT_SECRET,
    )
    r = a.acquire_token_for_client(scopes=[f"{DATVERSE_URL}/.default"])
    return r.get("access_token")

def get_headers():
    """Get headers with Bearer token."""
    token = get_token()
    return {
        "Authorization": f"Bearer {token}",
        "OData-MaxVersion": "4.0",
        "OData-Version": "4.0",
        "Accept": "application/json",
        "Content-Type": "application/json; charset=utf-8"
    }

def get_cors_headers():
    """Get CORS headers for cross-origin requests."""
    return {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
        "Access-Control-Allow-Headers": "*",
        "Access-Control-Max-Age": "86400"
    }

def create_response(data, status_code=200):
    """Create HTTP response with CORS headers."""
    response = func.HttpResponse(
        json.dumps(data, ensure_ascii=False),
        status_code=status_code,
        mimetype="application/json; charset=utf-8",
        headers=get_cors_headers()
    )
    return response

@app.route(route="test", methods=["GET"])
def test(req: func.HttpRequest) -> func.HttpResponse:
    """Simple test endpoint."""
    return create_response({"status": "ok", "message": "Azure Function is working mit Umlauten: äöüß"}, 200)

@app.route(route="cms/angebote", methods=["GET"])
def cms_angebote(req: func.HttpRequest) -> func.HttpResponse:
    """Angebote endpoint with Dataverse access."""
    try:
        headers = get_headers()
        # Fetch active offers from dl_angebotes
        url = f"{DATVERSE_URL}/api/data/v9.2/dl_angebotes?$filter=dl_status eq 101001&$orderby=dl_produkt asc"
        r = requests.get(url, headers=headers)
        
        if r.status_code == 200:
            data = r.json()
            angebote = []
            for item in data.get("value", []):
                angebote.append({
                    "id": item.get("dl_angeboteid"),
                    "name": item.get("dl_produkt", ""),
                    "price": item.get("dl_preis", 0),
                    "old_price": item.get("dl_statt_preis", 0),
                    "valid_from": item.get("dl_gueltig_von"),
                    "valid_to": item.get("dl_gueltig_bis")
                })
            return create_response({"success": True, "data": angebote}, 200)
        else:
            return create_response({"success": False, "error": f"Dataverse error: {r.status_code}", "details": r.text}, r.status_code)
    except Exception as e:
        return create_response({"success": False, "error": str(e)}, 500)

@app.route(route="angebote", methods=["GET"])
def angebote(req: func.HttpRequest) -> func.HttpResponse:
    """Angebote endpoint for public site (alias for cms/angebote)."""
    return cms_angebote(req)

@app.route(route="wochenplan", methods=["GET"])
def wochenplan(req: func.HttpRequest) -> func.HttpResponse:
    """Wochenplan endpoint with Dataverse access."""
    try:
        headers = get_headers()
        # Fetch active wochenplan from dl_wochenplans
        url = f"{DATVERSE_URL}/api/data/v9.2/dl_wochenplans?$filter=dl_status eq 101001&$orderby=dl_datum asc"
        r = requests.get(url, headers=headers)
        
        if r.status_code == 200:
            data = r.json()
            wochenplan = []
            for item in data.get("value", []):
                wochenplan.append({
                    "id": item.get("dl_wochenplansid"),
                    "gericht": item.get("dl_gericht", ""),
                    "wochentag": item.get("dl_wochentag"),
                    "kalenderwoche": item.get("dl_kalenderwoche"),
                    "jahr": item.get("dl_jahr"),
                    "datum": item.get("dl_datum"),
                    "preis": item.get("dl_preis", 0),
                    "beschreibung": item.get("dl_beschreibung", "")
                })
            return create_response({"success": True, "data": wochenplan}, 200)
        else:
            return create_response({"success": False, "error": f"Dataverse error: {r.status_code}", "details": r.text}, r.status_code)
    except Exception as e:
        return create_response({"success": False, "error": str(e)}, 500)

@app.route(route="hours", methods=["GET"])
def hours(req: func.HttpRequest) -> func.HttpResponse:
    """Öffnungszeiten endpoint with Dataverse access."""
    try:
        headers = get_headers()
        # Fetch hours from dl_oeffnungszeits
        url = f"{DATVERSE_URL}/api/data/v9.2/dl_oeffnungszeits?$orderby=dl_sortierung asc"
        r = requests.get(url, headers=headers)
        
        if r.status_code == 200:
            data = r.json()
            hours = []
            for item in data.get("value", []):
                hours.append({
                    "id": item.get("dl_oeffnungszeitsid"),
                    "name": item.get("dl_name", ""),
                    "wochentag": item.get("dl_wochentag"),
                    "vormittag_von": item.get("dl_vormittag_von"),
                    "vormittag_bis": item.get("dl_vormittag_bis"),
                    "nachmittag_von": item.get("dl_nachmittag_von"),
                    "nachmittag_bis": item.get("dl_nachmittag_bis"),
                    "geschlossen": item.get("dl_geschlossen"),
                    "sortierung": item.get("dl_sortierung"),
                    "hinweis": item.get("dl_hinweis", "")
                })
            return create_response({"success": True, "data": hours}, 200)
        else:
            return create_response({"success": False, "error": f"Dataverse error: {r.status_code}", "details": r.text}, r.status_code)
    except Exception as e:
        return create_response({"success": False, "error": str(e)}, 500)

@app.route(route="news", methods=["GET"])
def news(req: func.HttpRequest) -> func.HttpResponse:
    """News endpoint with Dataverse access."""
    try:
        headers = get_headers()
        # Fetch active news from dl_news
        url = f"{DATVERSE_URL}/api/data/v9.2/dl_news?$filter=dl_status eq 101001&$orderby=dl_datum desc"
        r = requests.get(url, headers=headers)
        
        if r.status_code == 200:
            data = r.json()
            news = []
            for item in data.get("value", []):
                news.append({
                    "id": item.get("dl_newsid"),
                    "titel": item.get("dl_titel", ""),
                    "datum": item.get("dl_datum"),
                    "kurztext": item.get("dl_kurztext", ""),
                    "inhalt": item.get("dl_inhalt", "")
                })
            return create_response({"success": True, "data": news}, 200)
        else:
            return create_response({"success": False, "error": f"Dataverse error: {r.status_code}", "details": r.text}, r.status_code)
    except Exception as e:
        return create_response({"success": False, "error": str(e)}, 500)

@app.route(route="cms-config", methods=["GET"])
def cms_config(req: func.HttpRequest) -> func.HttpResponse:
    """CMS configuration endpoint."""
    try:
        headers = get_headers()
        # Fetch CMS config from dl_seiteninhalts
        url = f"{DATVERSE_URL}/api/data/v9.2/dl_seiteninhalts"
        r = requests.get(url, headers=headers)
        
        if r.status_code == 200:
            data = r.json()
            config = {}
            for item in data.get("value", []):
                config[item.get("dl_name", "")] = item.get("dl_wert", "")
            return create_response({"success": True, "data": config}, 200)
        else:
            return create_response({"success": False, "error": f"Dataverse error: {r.status_code}", "details": r.text}, r.status_code)
    except Exception as e:
        return create_response({"success": False, "error": str(e)}, 500)

@app.route(route="preisliste", methods=["GET"])
def preisliste(req: func.HttpRequest) -> func.HttpResponse:
    """Preisliste endpoint with Dataverse access."""
    try:
        headers = get_headers()
        # Fetch preisliste from cr5d4_artikelstamm (default environment)
        DEFAULT_URL = os.environ.get("DV_DEFAULT_URL", "https://org392a4789.crm16.dynamics.com")
        url = f"{DEFAULT_URL}/api/data/v9.2/cr5d4_artikelstamms?$select=cr5d4_artikelnummer,cr5d4_bezeichnung,cr5d4_preis&$orderby=cr5d4_bezeichnung asc"
        r = requests.get(url, headers=headers)
        
        if r.status_code == 200:
            data = r.json()
            preisliste = []
            for item in data.get("value", []):
                preisliste.append({
                    "artikelnummer": item.get("cr5d4_artikelnummer"),
                    "bezeichnung": item.get("cr5d4_bezeichnung", ""),
                    "preis": item.get("cr5d4_preis", 0)
                })
            return create_response({"success": True, "data": preisliste}, 200)
        else:
            return create_response({"success": False, "error": f"Dataverse error: {r.status_code}", "details": r.text}, r.status_code)
    except Exception as e:
        return create_response({"success": False, "error": str(e)}, 500)
