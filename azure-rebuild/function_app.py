import azure.functions as func
import json
import os
import msal
import requests

app = func.FunctionApp(http_auth_level=func.AuthLevel.ANONYMOUS)

# Dataverse Config
TENANT_ID = os.environ.get("TENANT_ID", "acfaedd4-c403-43b7-9544-fdb2b150124e")
DATVERSE_URL = os.environ.get("DATVERSE_URL", "https://org392a4789.crm16.dynamics.com")
CLIENT_ID = os.environ.get("CLIENT_ID", "137b2df6-be83-459a-ac89-9efd0bdf51c4")
CLIENT_SECRET = os.environ.get("CLIENT_SECRET", "")

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

@app.route(route="test", methods=["GET"])
def test(req: func.HttpRequest) -> func.HttpResponse:
    """Simple test endpoint."""
    return func.HttpResponse(
        json.dumps({"status": "ok", "message": "Azure Function is working mit Umlauten: äöüß"}, ensure_ascii=False),
        status_code=200,
        mimetype="application/json; charset=utf-8"
    )

@app.route(route="cms/angebote", methods=["GET"])
def cms_angebote(req: func.HttpRequest) -> func.HttpResponse:
    """Angebote endpoint with Dataverse access."""
    try:
        headers = get_headers()
        # Fetch active offers from dl_angebotes
        url = f"{DATVERSE_URL}/api/data/v9.2/dl_angebotes?$filter=dl_status eq 101001&$orderby=dl_name asc"
        r = requests.get(url, headers=headers)
        
        if r.status_code == 200:
            data = r.json()
            angebote = []
            for item in data.get("value", []):
                angebote.append({
                    "id": item.get("dl_angebotesid"),
                    "name": item.get("dl_name", ""),
                    "price": item.get("dl_preis", 0),
                    "old_price": item.get("dl_alter_preis", 0),
                    "valid_from": item.get("dl_gueltig_von"),
                    "valid_to": item.get("dl_gueltig_bis")
                })
            return func.HttpResponse(
                json.dumps({"success": True, "data": angebote}, ensure_ascii=False),
                status_code=200,
                mimetype="application/json; charset=utf-8"
            )
        else:
            return func.HttpResponse(
                json.dumps({"success": False, "error": f"Dataverse error: {r.status_code}", "details": r.text}, ensure_ascii=False),
                status_code=r.status_code,
                mimetype="application/json; charset=utf-8"
            )
    except Exception as e:
        return func.HttpResponse(
            json.dumps({"success": False, "error": str(e)}, ensure_ascii=False),
            status_code=500,
            mimetype="application/json; charset=utf-8"
        )
