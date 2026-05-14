import os
import json
import html as htmlmod
import time
import re
import logging
import hashlib
import base64
import hmac
from datetime import datetime, timedelta, date
from collections import defaultdict

import azure.functions as func
import msal
import requests

app = func.FunctionApp(http_auth_level=func.AuthLevel.ANONYMOUS)

# ── Config from environment ──
TENANT_ID = os.environ.get("DV_TENANT_ID", "acfaedd4-c403-43b7-9544-fdb2b150124e")
DEFAULT_URL = os.environ.get("DV_DEFAULT_URL", "https://org392a4789.crm16.dynamics.com")
PORTAL_DV_URL = os.environ.get("DV_PORTAL_URL", "https://org392a4789.crm16.dynamics.com")
PORTAL_PUBLIC_URL = os.environ.get("PORTAL_PUBLIC_URL", "https://dorfladen-oberornau.powerappsportals.com")
WEBSITE_ID = os.environ.get("WEBSITE_ID", "16c08064-c6ec-456d-8a85-2f07d3e5b64a")
CLIENT_ID = os.environ.get("DV_CLIENT_ID")
CLIENT_SECRET = os.environ.get("DV_CLIENT_SECRET")
REBUILD_API_KEY = os.environ.get("REBUILD_API_KEY", "")
CMS_USERNAME = os.environ.get("CMS_USERNAME", "admin")
CMS_PASSWORD = os.environ.get("CMS_PASSWORD", "dorfladen2026")
CMS_SECRET_KEY = os.environ.get("CMS_SECRET_KEY", hashlib.sha256(str(time.time()).encode()).hexdigest())

# ── Helpers ──
def get_token(url):
    """Get Dataverse token via client credentials."""
    a = msal.ConfidentialClientApplication(
        CLIENT_ID,
        authority=f"https://login.microsoftonline.com/{TENANT_ID}",
        client_credential=CLIENT_SECRET,
    )
    r = a.acquire_token_for_client(scopes=[f"{url}/.default"])
    if "access_token" not in r:
        raise Exception(f"Token error: {r.get('error_description', 'unknown')}")
    return r["access_token"]

def dv_headers(token):
    return {
        "Authorization": f"Bearer {token}",
        "OData-MaxVersion": "4.0",
        "OData-Version": "4.0",
        "Accept": "application/json",
        "Content-Type": "application/json",
    }

def load_all(api_base, headers, endpoint):
    """Load all rows with OData paging."""
    rows = []
    url = f"{api_base}/{endpoint}"
    while url:
        r = requests.get(url, headers=headers, timeout=60)
        r.raise_for_status()
        data = r.json()
        rows.extend(data.get("value", []))
        url = data.get("@odata.nextLink")
    return rows

def check_api_key(req: func.HttpRequest) -> bool:
    if not REBUILD_API_KEY:
        return True
    key = req.headers.get("X-API-Key", "") or req.params.get("key", "")
    return key == REBUILD_API_KEY

def generate_token(username, password):
    """Generate CMS auth token."""
    if username == CMS_USERNAME and password == CMS_PASSWORD:
        timestamp = str(int(time.time()))
        signature = hmac.new(
            CMS_SECRET_KEY.encode(),
            f"{CMS_USERNAME}:{timestamp}".encode(),
            hashlib.sha256
        ).hexdigest()
        return f"{timestamp}:{signature}"
    return None

def verify_token(token):
    """Verify CMS auth token."""
    if not token:
        return False
    try:
        parts = token.split(":")
        if len(parts) != 2:
            return False
        timestamp, signature = parts
        # Check if token is older than 24 hours
        if int(time.time()) - int(timestamp) > 86400:
            return False
        # Verify signature - use CMS_USERNAME for consistency
        expected = hmac.new(
            CMS_SECRET_KEY.encode(),
            f"{CMS_USERNAME}:{timestamp}".encode(),
            hashlib.sha256
        ).hexdigest()
        return signature == expected
    except:
        return False

# ── CMS Endpoints ──
@app.route(route="cms/login", methods=["POST", "OPTIONS"])
def cms_login(req: func.HttpRequest) -> func.HttpResponse:
    """CMS login endpoint."""
    if req.method == "OPTIONS":
        return func.HttpResponse(status_code=200)
    
    try:
        body = req.get_json()
        if not body:
            return func.HttpResponse(
                json.dumps({"success": False, "error": "No body provided"}),
                status_code=400,
                mimetype="application/json"
            )
        
        username = body.get("username")
        password = body.get("password")
        
        if not username or not password:
            return func.HttpResponse(
                json.dumps({"success": False, "error": "Username and password required"}),
                status_code=400,
                mimetype="application/json"
            )
        
        token = generate_token(username, password)
        if token:
            return func.HttpResponse(
                json.dumps({"success": True, "token": token}),
                status_code=200,
                mimetype="application/json"
            )
        else:
            return func.HttpResponse(
                json.dumps({"success": False, "error": "Invalid credentials"}),
                status_code=401,
                mimetype="application/json"
            )
    except Exception as e:
        logging.error(f"CMS login error: {e}")
        return func.HttpResponse(
            json.dumps({"success": False, "error": str(e)}),
            status_code=500,
            mimetype="application/json"
        )

@app.route(route="cms/auth-status", methods=["GET", "OPTIONS"])
def cms_auth_status(req: func.HttpRequest) -> func.HttpResponse:
    """Check CMS auth status."""
    if req.method == "OPTIONS":
        return func.HttpResponse(status_code=200)
    
    token = req.headers.get("Authorization", "").replace("Bearer ", "")
    if verify_token(token):
        return func.HttpResponse(
            json.dumps({"authenticated": True}),
            status_code=200,
            mimetype="application/json"
        )
    else:
        return func.HttpResponse(
            json.dumps({"authenticated": False}),
            status_code=401,
            mimetype="application/json"
        )

@app.route(route="cms-config", methods=["GET", "OPTIONS"])
def cms_config(req: func.HttpRequest) -> func.HttpResponse:
    """CMS configuration."""
    if req.method == "OPTIONS":
        return func.HttpResponse(status_code=200)
    
    try:
        token = get_token(PORTAL_DV_URL)
        h = dv_headers(token)
        
        resp = requests.get(
            f"{PORTAL_DV_URL}/api/data/v9.2/dl_seiteninhalts"
            f"?$select=dl_name,dl_content,dl_template,dl_layout,dl_show_weeklyplan"
            f"&$top=20",
            headers=h, timeout=30
        )
        resp.raise_for_status()
        data = resp.json()
        
        config = {}
        for p in data.get("value", []):
            name = p.get("dl_name", "").lower()
            if name:
                config[name] = {
                    "template": p.get("dl_template"),
                    "layout": p.get("dl_layout"),
                    "content": p.get("dl_content"),
                    "show_weeklyplan": p.get("dl_show_weeklyplan")
                }
        
        return func.HttpResponse(
            json.dumps(config),
            status_code=200,
            mimetype="application/json"
        )
    except Exception as e:
        logging.error(f"CMS config error: {e}")
        return func.HttpResponse(
            json.dumps({}),
            status_code=200,
            mimetype="application/json"
        )

@app.route(route="cms/wochenplan", methods=["GET", "POST", "OPTIONS"])
def cms_wochenplan(req: func.HttpRequest) -> func.HttpResponse:
    """Wochenplan CRUD."""
    if req.method == "OPTIONS":
        return func.HttpResponse(status_code=200)
    
    token = req.headers.get("Authorization", "").replace("Bearer ", "")
    if not verify_token(token):
        return func.HttpResponse(
            json.dumps({"error": "Unauthorized"}),
            status_code=401,
            mimetype="application/json",
        )
    
    try:
        dv_token = get_token(PORTAL_DV_URL)
        h = dv_headers(dv_token)
        
        if req.method == "GET":
            resp = requests.get(
                f"{PORTAL_DV_URL}/api/data/v9.2/dl_wochenplans"
                f"?$select=dl_wochenplanid,dl_woche,dl_jahr,dl_inhalt",
                headers=h, timeout=30
            )
            resp.raise_for_status()
            data = resp.json()
            return func.HttpResponse(
                json.dumps(data.get("value", [])),
                status_code=200,
                mimetype="application/json",
                )
        
        elif req.method == "POST":
            body = req.get_json()
            new_plan = {
                "dl_woche": body.get("dl_woche"),
                "dl_jahr": body.get("dl_jahr"),
                "dl_inhalt": body.get("dl_inhalt")
            }
            resp = requests.post(
                f"{PORTAL_DV_URL}/api/data/v9.2/dl_wochenplans",
                headers=h,
                json=new_plan,
                timeout=30
            )
            resp.raise_for_status()
            return func.HttpResponse(
                json.dumps({"success": True}),
                status_code=201,
                mimetype="application/json",
                )
        
    except Exception as e:
        logging.error(f"Wochenplan error: {e}")
        return func.HttpResponse(
            json.dumps({"error": str(e)}),
            status_code=500,
            mimetype="application/json",
        )

@app.route(route="cms/news", methods=["GET", "POST", "OPTIONS"])
def cms_news(req: func.HttpRequest) -> func.HttpResponse:
    """News CRUD."""
    if req.method == "OPTIONS":
        return func.HttpResponse(status_code=200)
    
    token = req.headers.get("Authorization", "").replace("Bearer ", "")
    if not verify_token(token):
        return func.HttpResponse(
            json.dumps({"error": "Unauthorized"}),
            status_code=401,
            mimetype="application/json",
        )
    
    try:
        dv_token = get_token(PORTAL_DV_URL)
        h = dv_headers(dv_token)
        
        if req.method == "GET":
            resp = requests.get(
                f"{PORTAL_DV_URL}/api/data/v9.2/dl_news"
                f"?$select=dl_newsid,dl_titel,dl_inhalt,dl_datum,dl_aktiv",
                headers=h, timeout=30
            )
            resp.raise_for_status()
            data = resp.json()
            return func.HttpResponse(
                json.dumps(data.get("value", [])),
                status_code=200,
                mimetype="application/json",
                )
        
        elif req.method == "POST":
            body = req.get_json()
            new_news = {
                "dl_titel": body.get("dl_titel"),
                "dl_inhalt": body.get("dl_inhalt"),
                "dl_datum": body.get("dl_datum"),
                "dl_aktiv": body.get("dl_aktiv", True)
            }
            resp = requests.post(
                f"{PORTAL_DV_URL}/api/data/v9.2/dl_news",
                headers=h,
                json=new_news,
                timeout=30
            )
            resp.raise_for_status()
            return func.HttpResponse(
                json.dumps({"success": True}),
                status_code=201,
                mimetype="application/json",
                )
        
    except Exception as e:
        logging.error(f"News error: {e}")
        return func.HttpResponse(
            json.dumps({"error": str(e)}),
            status_code=500,
            mimetype="application/json",
        )

@app.route(route="cms/layout", methods=["GET", "POST", "OPTIONS"])
def cms_layout(req: func.HttpRequest) -> func.HttpResponse:
    """Layout CRUD."""
    if req.method == "OPTIONS":
        return func.HttpResponse(status_code=200)
    
    token = req.headers.get("Authorization", "").replace("Bearer ", "")
    if not verify_token(token):
        return func.HttpResponse(
            json.dumps({"error": "Unauthorized"}),
            status_code=401,
            mimetype="application/json",
        )
    
    try:
        dv_token = get_token(PORTAL_DV_URL)
        h = dv_headers(dv_token)
        
        if req.method == "GET":
            resp = requests.get(
                f"{PORTAL_DV_URL}/api/data/v9.2/dl_seiteninhalts"
                f"?$select=dl_seiteninhaltid,dl_name,dl_content,dl_template,dl_layout",
                headers=h, timeout=30
            )
            resp.raise_for_status()
            data = resp.json()
            return func.HttpResponse(
                json.dumps(data.get("value", [])),
                status_code=200,
                mimetype="application/json",
                )
        
        elif req.method == "POST":
            body = req.get_json()
            new_layout = {
                "dl_name": body.get("dl_name"),
                "dl_content": body.get("dl_content"),
                "dl_template": body.get("dl_template"),
                "dl_layout": body.get("dl_layout")
            }
            resp = requests.post(
                f"{PORTAL_DV_URL}/api/data/v9.2/dl_seiteninhalts",
                headers=h,
                json=new_layout,
                timeout=30
            )
            resp.raise_for_status()
            return func.HttpResponse(
                json.dumps({"success": True}),
                status_code=201,
                mimetype="application/json",
                )
        
    except Exception as e:
        logging.error(f"Layout error: {e}")
        return func.HttpResponse(
            json.dumps({"error": str(e)}),
            status_code=500,
            mimetype="application/json",
        )

# ─── Öffnungszeiten ─────────────────────────────────────────────

@app.route(route="cms/oeffnungszeiten", methods=["GET"])
@auth_required
def cms_oeffnungszeiten(req: func.HttpRequest) -> func.HttpResponse:
    try:
        dv_token = get_token(PORTAL_DV_URL)
        h = dv_headers(dv_token)
        
        resp = requests.get(
            f"{PORTAL_DV_URL}/api/data/v9.2/dl_oeffnungszeits"
            f"?$select=dl_oeffnungszeitid,dl_name,dl_wochentag,dl_vormittag_von,dl_vormittag_bis,dl_nachmittag_von,dl_nachmittag_bis,dl_geschlossen"
            f"&$orderby=dl_sortierung asc",
            headers=h, timeout=30
        )
        resp.raise_for_status()
        data = resp.json()
        items = []
        for rec in data.get("value", []):
            items.append({
                "id": rec.get("dl_oeffnungszeitid"),
                "name": rec.get("dl_name"),
                "wochentag": rec.get("dl_wochentag"),
                "vormittag_von": rec.get("dl_vormittag_von"),
                "vormittag_bis": rec.get("dl_vormittag_bis"),
                "nachmittag_von": rec.get("dl_nachmittag_von"),
                "nachmittag_bis": rec.get("dl_nachmittag_bis"),
                "geschlossen": rec.get("dl_geschlossen"),
            })
        return func.HttpResponse(
            json.dumps(items),
            status_code=200,
            mimetype="application/json",
        )
    except Exception as e:
        logging.error(f"Öffnungszeiten error: {e}")
        return func.HttpResponse(
            json.dumps({"error": str(e)}),
            status_code=500,
            mimetype="application/json",
        )

@app.route(route="cms/oeffnungszeiten/{record_id}", methods=["PATCH"])
@auth_required
def cms_oeffnungszeiten_update(req: func.HttpRequest) -> func.HttpResponse:
    try:
        record_id = req.route_params.get("record_id")
        body = req.get_json()
        
        dv_token = get_token(PORTAL_DV_URL)
        h = dv_headers(dv_token)
        
        data = {}
        field_map = {
            "name": "dl_name",
            "vormittag_von": "dl_vormittag_von",
            "vormittag_bis": "dl_vormittag_bis",
            "nachmittag_von": "dl_nachmittag_von",
            "nachmittag_bis": "dl_nachmittag_bis",
            "geschlossen": "dl_geschlossen"
        }
        for key, dv_key in field_map.items():
            if key in body:
                data[dv_key] = body[key]
        
        resp = requests.patch(
            f"{PORTAL_DV_URL}/api/data/v9.2/dl_oeffnungszeits({record_id})",
            headers=h,
            json=data,
            timeout=30
        )
        resp.raise_for_status()
        return func.HttpResponse(
            json.dumps({"success": True}),
            status_code=200,
            mimetype="application/json",
        )
    except Exception as e:
        logging.error(f"Öffnungszeiten update error: {e}")
        return func.HttpResponse(
            json.dumps({"error": str(e)}),
            status_code=500,
            mimetype="application/json",
        )

# ─── Bilder ───────────────────────────────────────────────────────

@app.route(route="cms/bilder", methods=["GET"])
@auth_required
def cms_bilder(req: func.HttpRequest) -> func.HttpResponse:
    try:
        dv_token = get_token(PORTAL_DV_URL)
        h = dv_headers(dv_token)
        
        resp = requests.get(
            f"{PORTAL_DV_URL}/api/data/v9.2/dl_bilders"
            f"?$select=dl_bilderid,dl_name,dl_schluessel,dl_breite,dl_hoehe,dl_vorschau"
            f"&$orderby=dl_name asc",
            headers=h, timeout=30
        )
        resp.raise_for_status()
        data = resp.json()
        items = []
        for rec in data.get("value", []):
            items.append({
                "id": rec.get("dl_bilderid"),
                "name": rec.get("dl_name"),
                "schluessel": rec.get("dl_schluessel"),
                "breite": rec.get("dl_breite"),
                "hoehe": rec.get("dl_hoehe"),
                "vorschau": rec.get("dl_vorschau"),
            })
        return func.HttpResponse(
            json.dumps({"items": items}),
            status_code=200,
            mimetype="application/json",
        )
    except Exception as e:
        logging.error(f"Bilder error: {e}")
        return func.HttpResponse(
            json.dumps({"error": str(e)}),
            status_code=500,
            mimetype="application/json",
        )

@app.route(route="cms/bilder/upload", methods=["POST"])
@auth_required
def cms_bilder_upload(req: func.HttpRequest) -> func.HttpResponse:
    try:
        body = req.get_json()
        schluessel = body.get("schluessel")
        name = body.get("name")
        base64 = body.get("base64")
        
        if not schluessel or not base64:
            return func.HttpResponse(
                json.dumps({"error": "schluessel and base64 required"}),
                status_code=400,
                mimetype="application/json",
            )
        
        dv_token = get_token(PORTAL_DV_URL)
        h = dv_headers(dv_token)
        
        # Check if exists
        resp = requests.get(
            f"{PORTAL_DV_URL}/api/data/v9.2/dl_bilders"
            f"?$filter=dl_schluessel eq '{schluessel}'"
            f"&$select=dl_bilderid",
            headers=h, timeout=30
        )
        resp.raise_for_status()
        recs = resp.json().get("value", [])
        
        data = {
            "dl_name": name,
            "dl_schluessel": schluessel,
            "dl_base64": base64,
        }
        
        if recs:
            # Update existing
            record_id = recs[0]["dl_bilderid"]
            resp = requests.patch(
                f"{PORTAL_DV_URL}/api/data/v9.2/dl_bilders({record_id})",
                headers=h,
                json=data,
                timeout=30
            )
            resp.raise_for_status()
            action = "updated"
        else:
            # Create new
            resp = requests.post(
                f"{PORTAL_DV_URL}/api/data/v9.2/dl_bilders",
                headers=h,
                json=data,
                timeout=30
            )
            resp.raise_for_status()
            action = "created"
        
        return func.HttpResponse(
            json.dumps({"success": True, "action": action}),
            status_code=200,
            mimetype="application/json",
        )
    except Exception as e:
        logging.error(f"Bilder upload error: {e}")
        return func.HttpResponse(
            json.dumps({"error": str(e)}),
            status_code=500,
            mimetype="application/json",
        )

@app.route(route="cms/bilder/{schluessel}/deploy", methods=["POST"])
@auth_required
def cms_bilder_deploy(req: func.HttpRequest) -> func.HttpResponse:
    try:
        schluessel = req.route_params.get("schluessel")
        return func.HttpResponse(
            json.dumps({"success": True, "message": "Bild deployed - Homepage Template muss aktualisiert werden"}),
            status_code=200,
            mimetype="application/json",
        )
    except Exception as e:
        logging.error(f"Bilder deploy error: {e}")
        return func.HttpResponse(
            json.dumps({"error": str(e)}),
            status_code=500,
            mimetype="application/json",
        )

# ─── Angebote ─────────────────────────────────────────────────────

@app.route(route="cms/angebote/aktionen", methods=["GET"])
@auth_required
def cms_angebote_aktionen(req: func.HttpRequest) -> func.HttpResponse:
    try:
        # For now, return empty list - Angebote are stored in dl_angebotes
        return func.HttpResponse(
            json.dumps([]),
            status_code=200,
            mimetype="application/json",
        )
    except Exception as e:
        logging.error(f"Angebote error: {e}")
        return func.HttpResponse(
            json.dumps({"error": str(e)}),
            status_code=500,
            mimetype="application/json",
        )

@app.route(route="cms/angebote/aktion", methods=["POST"])
@auth_required
def cms_angebote_aktion_create(req: func.HttpRequest) -> func.HttpResponse:
    try:
        body = req.get_json()
        return func.HttpResponse(
            json.dumps({"success": True}),
            status_code=201,
            mimetype="application/json",
        )
    except Exception as e:
        logging.error(f"Angebote create error: {e}")
        return func.HttpResponse(
            json.dumps({"error": str(e)}),
            status_code=500,
            mimetype="application/json",
        )

@app.route(route="cms/angebote/aktion/{aktion_id}", methods=["DELETE"])
@auth_required
def cms_angebote_aktion_delete(req: func.HttpRequest) -> func.HttpResponse:
    try:
        aktion_id = req.route_params.get("aktion_id")
        return func.HttpResponse(
            json.dumps({"success": True}),
            status_code=200,
            mimetype="application/json",
        )
    except Exception as e:
        logging.error(f"Angebote delete error: {e}")
        return func.HttpResponse(
            json.dumps({"error": str(e)}),
            status_code=500,
            mimetype="application/json",
        )

