import azure.functions as func
import json
import os
import msal
import requests

app = func.FunctionApp(http_auth_level=func.AuthLevel.ANONYMOUS)

DAY_LABELS = {
    101000: "Montag",
    101001: "Dienstag",
    101002: "Mittwoch",
    101003: "Donnerstag",
    101004: "Freitag",
    101005: "Samstag",
    101006: "Sonntag",
}

# --- CORS PREFLIGHT HANDLER ---
@app.route(route="{*path}", methods=["OPTIONS"])
def cors_preflight(req: func.HttpRequest) -> func.HttpResponse:
    return func.HttpResponse(status_code=200, headers=get_cors_headers())

# --- GLOBALE CONFIG & TOKENS ---
def get_token(url_setting_name="DV_DEV_URL"):
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

def get_headers(url_setting_name="DV_DEV_URL"):
    token = get_token(url_setting_name)
    return {
        "Authorization": f"Bearer {token}",
        "OData-MaxVersion": "4.0",
        "OData-Version": "4.0",
        "Accept": "application/json",
        "Content-Type": "application/json; charset=utf-8"
    }

SP_DRIVE = "b!bwUha0ab4EeiA3xXHK-Oobhv5tJbeYJDiF9pTB-f1kC-Mp-AY0brRrr2WigdYK4A"
SP_FOLDER = "01USAQ6ERA5Q2V5M2I2BCKYOFVH2WWICOC"
SP_BARCODE_FOLDER = "01USAQ6ESD7NCQ4ZM6GRHK5IRCMJMSRSVH"
_graph_msal_app = None

def get_graph_token():
    global _graph_msal_app
    tenant_id = os.environ.get("DV_TENANT_ID", "acfaedd4-c403-43b7-9544-fdb2b150124e")
    client_id = os.environ.get("DV_CLIENT_ID", "137b2df6-be83-459a-ac89-9efd0bdf51c4")
    client_secret = os.environ.get("DV_CLIENT_SECRET", "")
    if not client_secret:
        return None
    if not _graph_msal_app:
        _graph_msal_app = msal.ConfidentialClientApplication(
            client_id,
            authority=f"https://login.microsoftonline.com/{tenant_id}",
            client_credential=client_secret,
        )
    r = _graph_msal_app.acquire_token_for_client(scopes=["https://graph.microsoft.com/.default"])
    return r.get("access_token")

def find_sharepoint_image(token, folder_id, key):
    if not token or not key:
        return None
    headers = {"Authorization": f"Bearer {token}"}
    for ext in ("jpg", "png", "jpeg", "gif"):
        url = f"https://graph.microsoft.com/v1.0/drives/{SP_DRIVE}/items/{folder_id}:/{key}.{ext}"
        r = requests.get(url, headers=headers, timeout=20)
        if r.status_code == 200:
            body = r.json()
            return {
                "name": body.get("name", f"{key}.{ext}"),
                "dl_download_url": body.get("@microsoft.graph.downloadUrl", "")
            }
    return None

def lookup_sharepoint_images(article_infos):
    token = get_graph_token()
    result = []
    for info in article_infos[:20]:
        artnr = (info.get("edeka_nr") or info.get("artikelnummer") or "").strip()
        sc = (info.get("strichcode") or "").strip()
        result_key = sc or artnr
        hit = find_sharepoint_image(token, SP_BARCODE_FOLDER, sc) if sc else None
        if not hit and artnr:
            hit = find_sharepoint_image(token, SP_FOLDER, artnr)
        if hit and hit.get("dl_download_url"):
            result.append({
                "dl_artikelnummer": result_key,
                "dl_download_url": hit["dl_download_url"],
                "source": "sharepoint",
                "name": hit.get("name", "")
            })
    return result

def get_cors_headers():
    return {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, POST, OPTIONS, DELETE, PATCH",
        "Access-Control-Allow-Headers": "*",
        "Access-Control-Max-Age": "86400",
        "Content-Type": "application/json; charset=utf-8"
    }

def create_response(data, status_code=200):
    return func.HttpResponse(
        json.dumps(data, ensure_ascii=False),
        status_code=status_code,
        mimetype="application/json",
        headers=get_cors_headers()
    )

def parse_config_value(value):
    if not isinstance(value, str):
        return value

    stripped = value.strip()
    if not stripped:
        return ""

    if stripped.startswith("{") or stripped.startswith("["):
        try:
            return json.loads(stripped)
        except json.JSONDecodeError:
            return value

    return value

# --- ROUTEN ---

@app.route(route="test", methods=["GET"])
def test(req: func.HttpRequest) -> func.HttpResponse:
    return create_response({"status": "ok", "message": "V4-Zentrale online!"}, 200)

@app.route(route="wochenplan", methods=["GET"])
def wochenplan(req: func.HttpRequest) -> func.HttpResponse:
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
            return create_response({"success": True, "data": wochenplan_list}, 200)
        return create_response({"success": False, "error": f"Dataverse error: {r.status_code}"}, r.status_code)
    except Exception as e:
        return create_response({"success": False, "error": str(e)}, 500)

@app.route(route="hours", methods=["GET"])
def hours(req: func.HttpRequest) -> func.HttpResponse:
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
            return create_response({"success": True, "data": hours_list}, 200)
        return create_response({"success": False, "error": f"Dataverse error: {r.status_code}"}, r.status_code)
    except Exception as e:
        return create_response({"success": False, "error": str(e)}, 500)

@app.route(route="news", methods=["GET"])
def news(req: func.HttpRequest) -> func.HttpResponse:
    try:
        headers = get_headers("DV_DEFAULT_URL")
        default_url = os.environ.get("DV_DEFAULT_URL", "https://orgab4e2f00.crm16.dynamics.com")
        # CMS passes ?all=true to get all news including inactive
        show_all = req.params.get("all", "").lower() == "true"
        filter_clause = "" if show_all else "&$filter=dl_status eq 101001"
        url = (
            f"{default_url}/api/data/v9.2/dl_news"
            f"?$select=dl_titel,dl_kurztext,dl_inhalt,dl_datum,createdon,dl_status"
            f"{filter_clause}"
            f"&$orderby=dl_datum desc"
        )
        r = requests.get(url, headers=headers)
        if r.status_code == 200:
            data = r.json()
            news_list = []
            for item in data.get("value", []):
                news_list.append({
                    "id": item.get("dl_newsid"),
                    "dl_newsid": item.get("dl_newsid"),
                    "titel": item.get("dl_titel", ""),
                    "dl_titel": item.get("dl_titel", ""),
                    "beschreibung": item.get("dl_kurztext", ""),
                    "dl_kurztext": item.get("dl_kurztext", ""),
                    "dl_inhalt": item.get("dl_inhalt", ""),
                    "datum": item.get("dl_datum") or item.get("createdon"),
                    "dl_datum": item.get("dl_datum"),
                    "createdon": item.get("createdon"),
                    "status": item.get("dl_status")
                })
            return create_response({"success": True, "data": news_list}, 200)
        return create_response({"success": False, "error": f"Dataverse error: {r.status_code}"}, r.status_code)
    except Exception as e:
        return create_response({"success": False, "error": str(e)}, 500)

@app.route(route="news-save", methods=["POST", "OPTIONS"])
def news_save(req: func.HttpRequest) -> func.HttpResponse:
    if req.method == "OPTIONS":
        return func.HttpResponse(status_code=204, headers=get_cors_headers())
    try:
        body = req.get_json()
        headers = get_headers("DV_DEFAULT_URL")
        default_url = os.environ.get("DV_DEFAULT_URL", "https://orgab4e2f00.crm16.dynamics.com")
        record_id = body.get("id")
        payload = {
            "dl_titel": body.get("titel", ""),
            "dl_kurztext": body.get("kurztext", ""),
            "dl_inhalt": body.get("inhalt", ""),
            "dl_status": body.get("status", 101001)
        }
        if body.get("datum"):
            payload["dl_datum"] = body["datum"]
        if record_id:
            # Update existing
            url = f"{default_url}/api/data/v9.2/dl_news({record_id})"
            r = requests.patch(url, headers=headers, json=payload)
            if r.status_code == 204:
                return create_response({"success": True, "id": record_id}, 200)
            return create_response({"success": False, "error": f"Dataverse error: {r.status_code} {r.text}"}, r.status_code)
        else:
            # Create new
            from datetime import date
            if "dl_datum" not in payload:
                payload["dl_datum"] = date.today().isoformat()
            url = f"{default_url}/api/data/v9.2/dl_news"
            r = requests.post(url, headers=headers, json=payload)
            if r.status_code in (200, 201, 204):
                new_id = None
                if r.headers.get("OData-EntityId"):
                    import re
                    m = re.search(r'\(([^)]+)\)', r.headers["OData-EntityId"])
                    if m:
                        new_id = m.group(1)
                return create_response({"success": True, "id": new_id}, 200)
            return create_response({"success": False, "error": f"Dataverse error: {r.status_code} {r.text}"}, r.status_code)
    except Exception as e:
        return create_response({"success": False, "error": str(e)}, 500)

@app.route(route="news-delete", methods=["DELETE", "OPTIONS"])
def news_delete(req: func.HttpRequest) -> func.HttpResponse:
    if req.method == "OPTIONS":
        return func.HttpResponse(status_code=204, headers=get_cors_headers())
    try:
        record_id = req.params.get("id")
        if not record_id:
            return create_response({"success": False, "error": "Fehlender Parameter 'id'"}, 400)
        headers = get_headers("DV_DEFAULT_URL")
        default_url = os.environ.get("DV_DEFAULT_URL", "https://orgab4e2f00.crm16.dynamics.com")
        url = f"{default_url}/api/data/v9.2/dl_news({record_id})"
        r = requests.delete(url, headers=headers)
        if r.status_code == 204:
            return create_response({"success": True}, 200)
        return create_response({"success": False, "error": f"Dataverse error: {r.status_code}"}, r.status_code)
    except Exception as e:
        return create_response({"success": False, "error": str(e)}, 500)

@app.route(route="cms-config-save", methods=["POST", "OPTIONS"])
def cms_config_save(req: func.HttpRequest) -> func.HttpResponse:
    if req.method == "OPTIONS":
        return func.HttpResponse(status_code=204, headers=get_cors_headers())
    try:
        body = req.get_json()
        headers = get_headers("DV_DEV_URL")
        dev_url = os.environ.get("DV_DEV_URL", "https://org392a4789.crm16.dynamics.com")
        errors = []

        # Support shorthand: {schluessel: "key", wert: "value"} → upsert by dl_schluessel
        if "schluessel" in body and "wert" in body:
            schluessel = body["schluessel"]
            wert = body["wert"]
            if isinstance(wert, (dict, list)):
                wert = json.dumps(wert, ensure_ascii=False)
            # Find existing record by dl_schluessel
            find_url = f"{dev_url}/api/data/v9.2/dl_seiteninhalts?$filter=dl_schluessel eq '{schluessel}'&$select=dl_seiteninhaltid&$top=1"
            fr = requests.get(find_url, headers=headers, timeout=10)
            existing = fr.json().get("value", []) if fr.status_code == 200 else []
            if existing:
                record_id = existing[0]["dl_seiteninhaltid"]
                url = f"{dev_url}/api/data/v9.2/dl_seiteninhalts({record_id})"
                r = requests.patch(url, headers=headers, json={"dl_wert": str(wert)})
                if r.status_code != 204:
                    errors.append(f"{schluessel}: {r.status_code}")
            else:
                url = f"{dev_url}/api/data/v9.2/dl_seiteninhalts"
                r = requests.post(url, headers=headers, json={"dl_schluessel": schluessel, "dl_wert": str(wert)})
                if r.status_code not in (200, 201, 204):
                    errors.append(f"{schluessel}: {r.status_code}")
            if errors:
                return create_response({"success": False, "error": "; ".join(errors)}, 500)
            return create_response({"success": True}, 200)

        # Standard format: {items: [{id, name, wert}, ...]}
        items = body.get("items", [])
        for item in items:
            record_id = item.get("id")
            wert = item.get("wert", "")
            if isinstance(wert, (dict, list)):
                wert = json.dumps(wert, ensure_ascii=False)
            payload = {"dl_wert": str(wert)}
            if record_id:
                url = f"{dev_url}/api/data/v9.2/dl_seiteninhalts({record_id})"
                r = requests.patch(url, headers=headers, json=payload)
                if r.status_code != 204:
                    errors.append(f"{item.get('name','?')}: {r.status_code}")
            else:
                payload["dl_name"] = item.get("name", "")
                url = f"{dev_url}/api/data/v9.2/dl_seiteninhalts"
                r = requests.post(url, headers=headers, json=payload)
                if r.status_code not in (200, 201, 204):
                    errors.append(f"{item.get('name','?')}: {r.status_code}")
        if errors:
            return create_response({"success": False, "error": "; ".join(errors)}, 500)
        return create_response({"success": True}, 200)
    except Exception as e:
        return create_response({"success": False, "error": str(e)}, 500)

@app.route(route="cms-config", methods=["GET"])
def cms_config(req: func.HttpRequest) -> func.HttpResponse:
    try:
        headers = get_headers("DV_DEV_URL")
        dev_url = os.environ.get("DV_DEV_URL", "https://org392a4789.crm16.dynamics.com")
        url = f"{dev_url}/api/data/v9.2/dl_seiteninhalts"
        r = requests.get(url, headers=headers)
        if r.status_code == 200:
            data = r.json()
            # If ?full=true, return items with IDs for editing
            if req.params.get("full", "").lower() == "true":
                items = []
                for item in data.get("value", []):
                    if item.get("dl_name"):
                        items.append({
                            "id": item.get("dl_seiteninhaltsid") or item.get("dl_seiteninhaltheid"),
                            "name": item.get("dl_name", ""),
                            "wert": parse_config_value(item.get("dl_wert", ""))
                        })
                return create_response({"success": True, "data": items}, 200)
            config = {
                item.get("dl_name", ""): parse_config_value(item.get("dl_wert", ""))
                for item in data.get("value", [])
                if item.get("dl_name")
            }
            return create_response({"success": True, "data": config}, 200)
        return create_response({"success": False, "error": f"Dataverse error: {r.status_code}"}, r.status_code)
    except Exception as e:
        return create_response({"success": False, "error": str(e)}, 500)

@app.route(route="angebote", methods=["GET"])
def angebote(req: func.HttpRequest) -> func.HttpResponse:
    try:
        headers = get_headers("DV_DEV_URL")
        dev_url = os.environ.get("DV_DEV_URL", "https://org392a4789.crm16.dynamics.com")
        url = f"{dev_url}/api/data/v9.2/dl_angebotes?$filter=dl_status eq 101001&$orderby=dl_produkt asc"
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
            return create_response({"success": True, "data": angebote_list}, 200)
        return create_response({"success": False, "error": f"Dataverse error: {r.status_code}"}, r.status_code)
    except Exception as e:
        return create_response({"success": False, "error": str(e)}, 500)

@app.route(route="angebote-write", methods=["POST", "OPTIONS"])
def angebote_write(req: func.HttpRequest) -> func.HttpResponse:
    if req.method == "OPTIONS":
        return func.HttpResponse(status_code=204, headers=get_cors_headers())
    try:
        body = req.get_json()
        headers = get_headers("DV_DEV_URL")
        dev_url = os.environ.get("DV_DEV_URL", "https://org392a4789.crm16.dynamics.com")
        url = f"{dev_url}/api/data/v9.2/dl_angebotes"
        r = requests.post(url, headers=headers, json=body)
        if r.status_code in (200, 201, 204):
            return create_response({"success": True}, 200)
        return create_response({"success": False, "error": f"Dataverse error: {r.status_code} {r.text[:500]}"}, r.status_code)
    except Exception as e:
        return create_response({"success": False, "error": str(e)}, 500)

@app.route(route="angebote-update", methods=["PATCH", "OPTIONS"])
def angebote_update(req: func.HttpRequest) -> func.HttpResponse:
    if req.method == "OPTIONS":
        return func.HttpResponse(status_code=204, headers=get_cors_headers())
    try:
        record_id = req.params.get("id")
        if not record_id:
            return create_response({"success": False, "error": "Fehlender Parameter 'id'"}, 400)
        body = req.get_json()
        headers = get_headers("DV_DEV_URL")
        dev_url = os.environ.get("DV_DEV_URL", "https://org392a4789.crm16.dynamics.com")
        url = f"{dev_url}/api/data/v9.2/dl_angebotes({record_id})"
        r = requests.patch(url, headers=headers, json=body)
        if r.status_code in (200, 204):
            return create_response({"success": True}, 200)
        return create_response({"success": False, "error": f"Dataverse error: {r.status_code} {r.text[:500]}"}, r.status_code)
    except Exception as e:
        return create_response({"success": False, "error": str(e)}, 500)

@app.route(route="angebote-delete", methods=["DELETE", "OPTIONS"])
def angebote_delete(req: func.HttpRequest) -> func.HttpResponse:
    if req.method == "OPTIONS":
        return func.HttpResponse(status_code=204, headers=get_cors_headers())
    try:
        record_id = req.params.get("id")
        if not record_id:
            return create_response({"success": False, "error": "Fehlender Parameter 'id'"}, 400)
        headers = get_headers("DV_DEV_URL")
        dev_url = os.environ.get("DV_DEV_URL", "https://org392a4789.crm16.dynamics.com")
        url = f"{dev_url}/api/data/v9.2/dl_angebotes({record_id})"
        r = requests.delete(url, headers=headers)
        if r.status_code == 204:
            return create_response({"success": True}, 200)
        return create_response({"success": False, "error": f"Dataverse error: {r.status_code}"}, r.status_code)
    except Exception as e:
        return create_response({"success": False, "error": str(e)}, 500)

@app.route(route="werbebilder", methods=["GET", "POST"])
def werbebilder(req: func.HttpRequest) -> func.HttpResponse:
    if req.method == "POST":
        try:
            body = req.get_json()
        except Exception:
            return create_response({"success": False, "error": "Invalid JSON"}, 400)
        article_infos = body.get("articles") or []
        include_sp = (req.params.get("sharepoint") or "").lower() in ("1", "true", "yes")
        if include_sp and article_infos:
            return create_response(lookup_sharepoint_images(article_infos), 200)
        return create_response([], 200)

    artnrs = req.params.get("artnrs", "")
    if not artnrs.strip():
        return create_response([], 200)
    article_infos = [{"artikelnummer": x.strip(), "edeka_nr": x.strip(), "strichcode": ""} for x in artnrs.split(",") if x.strip()]
    include_sp = (req.params.get("sharepoint") or "").lower() in ("1", "true", "yes")
    if include_sp:
        return create_response(lookup_sharepoint_images(article_infos), 200)
    return create_response([], 200)

@app.route(route="preisliste", methods=["GET"])
def preisliste(req: func.HttpRequest) -> func.HttpResponse:
    try:
        headers = get_headers("DV_DEFAULT_URL")
        default_url = os.environ.get("DV_DEFAULT_URL", "https://orgab4e2f00.crm16.dynamics.com")
        
        # ArtikelStamm mit UVP laden (mit Paging)
        url = f"{default_url}/api/data/v9.2/cr5d4_tables?$select=cr5d4_artikelnummeredeka,cr5d4_artikelbezeichnung,cr5d4_vk_dorf,cr5d4_warengruppebez,cr5d4_uvp_total,cr5d4_strichcode&$orderby=cr5d4_artikelbezeichnung asc"
        all_items = []
        while url:
            r = requests.get(url, headers=headers)
            if r.status_code != 200:
                return create_response({"success": False, "error": f"Dataverse error: {r.status_code}"}, r.status_code)
            data = r.json()
            all_items.extend(data.get("value", []))
            url = data.get("@odata.nextLink", None)
        
        # Aktive Angebote laden
        ang_url = f"{default_url}/api/data/v9.2/dl_angebotes?$filter=dl_status eq 101001&$select=dl_artikelnummer,dl_produkt,dl_preis,dl_statt_preis"
        angebote_map = {}
        try:
            ar = requests.get(ang_url, headers=headers)
            if ar.status_code == 200:
                for ang in ar.json().get("value", []):
                    artnr = ang.get("dl_artikelnummer", "")
                    if artnr:
                        angebote_map[artnr] = {
                            "preis": ang.get("dl_preis", 0),
                            "statt": ang.get("dl_statt_preis", 0)
                        }
        except:
            pass
        
        # Warengruppen-Mapping
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
            "Cafeteria": "Cafeteria",
            "Cafeteria 1": "Cafeteria",
            "Cafeteria 2": "Cafeteria",
            "Tabakwaren": "Tabakwaren"
        }
            
        # Gruppieren nach Warengruppen
        groups = {}
        rp_count = 0
        ang_count = 0
        
        for item in all_items:
            artikelnummer = item.get("cr5d4_artikelnummeredeka", "")
            bezeichnung = item.get("cr5d4_artikelbezeichnung", "")
            preis = item.get("cr5d4_vk_dorf", 0)
            uvp_preis = item.get("cr5d4_uvp_total")
            warengruppe_bez = item.get("cr5d4_warengruppebez", "")
            
            if warengruppe_bez:
                warengruppe = wg_name_mapping.get(warengruppe_bez, warengruppe_bez)
            else:
                warengruppe = "Sonstiges"
            
            if warengruppe not in groups:
                groups[warengruppe] = []
            
            # Roter Punkt: VK < UVP with meaningful discount (>= 5% and <= 70%)
            is_rp = False
            discount = 0
            if uvp_preis and uvp_preis > 0 and preis > 0 and preis < uvp_preis:
                discount = round((uvp_preis - preis) / uvp_preis * 100)
                if discount >= 5 and discount <= 70:
                    is_rp = True
                    rp_count += 1
            
            # Angebot-Status prüfen
            ang_info = angebote_map.get(artikelnummer)
            is_angebot = ang_info is not None
            ang_preis = ang_info["preis"] if ang_info else None
            ang_statt = ang_info["statt"] if ang_info else None
            if is_angebot:
                ang_count += 1
            
            strichcode = item.get("cr5d4_strichcode", "")
            groups[warengruppe].append({
                "artikelnummer": artikelnummer,
                "bezeichnung": bezeichnung,
                "vk": preis,
                "uvp": uvp_preis,
                "discount": discount,
                "rp": is_rp,
                "angebot": is_angebot,
                "angebot_statt": ang_statt,
                "angebot_preis": ang_preis,
                "strichcode": strichcode
            })
        
        total_items = sum(len(v) for v in groups.values())
        from datetime import datetime
        result = {
            "groups": groups,
            "total": total_items,
            "warengruppen": len(groups),
            "rp_count": rp_count,
            "ang_count": ang_count,
            "generated": datetime.now().isoformat()
        }
        return create_response(result, 200)
    except Exception as e:
        return create_response({"success": False, "error": str(e)}, 500)

@app.route(route="roterpunkt", methods=["GET"])
def roterpunkt(req: func.HttpRequest) -> func.HttpResponse:
    try:
        headers = get_headers("DV_DEFAULT_URL")
        default_url = os.environ.get("DV_DEFAULT_URL", "https://orgab4e2f00.crm16.dynamics.com")
        # Load all items from table (exactly like the working 'preisliste' endpoint to prevent OData filter errors)
        url = f"{default_url}/api/data/v9.2/cr5d4_tables?$select=cr5d4_artikelnummeredeka,cr5d4_artikelbezeichnung,cr5d4_vk_dorf,cr5d4_warengruppebez,cr5d4_uvp_total&$orderby=cr5d4_artikelbezeichnung asc"

        # Paging: alle Ergebnisse laden
        all_items = []
        while url:
            r = requests.get(url, headers=headers)
            if r.status_code != 200:
                return create_response({"success": False, "error": f"Dataverse error: {r.status_code}"}, r.status_code)
            data = r.json()
            all_items.extend(data.get("value", []))
            url = data.get("@odata.nextLink", None)

        # Gruppieren nach Warengruppen (basierend auf cr5d4_warengruppebez)
        groups = {}
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

        for item in all_items:
            artikelnummer = item.get("cr5d4_artikelnummeredeka", "")
            bezeichnung = item.get("cr5d4_artikelbezeichnung", "")
            preis = item.get("cr5d4_vk_dorf", 0)
            uvp_preis = item.get("cr5d4_uvp_total")
            warengruppe_bez = item.get("cr5d4_warengruppebez", "")

            # Warengruppe aus WarengruppeBez verwenden, falls vorhanden
            if warengruppe_bez:
                warengruppe = wg_name_mapping.get(warengruppe_bez, warengruppe_bez)
            else:
                warengruppe = "Sonstiges"

            # Discount berechnen: ((uvp - vk) / uvp) * 100
            discount = 0
            if uvp_preis and uvp_preis > 0 and preis > 0:
                discount = ((uvp_preis - preis) / uvp_preis) * 100

            # Nur Artikel mit mindestens 5% Ersparnis aufnehmen
            if discount < 5:
                continue

            if warengruppe not in groups:
                groups[warengruppe] = []

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

        total_items = sum(len(v) for v in groups.values())
        from datetime import datetime
        result = {
            "groups": groups,
            "total": total_items,
            "warengruppen": len(groups),
            "generated": datetime.now().isoformat()
        }
        return create_response(result, 200)
    except Exception as e:
        return create_response({"success": False, "error": str(e)}, 500)

# ENTSCHÄRFTER LÖSCH-ENDPUNKT: Keine URL-Parameter mehr!
@app.route(route="delete-angebot", methods=["DELETE", "OPTIONS"])
def delete_angebot_safe(req: func.HttpRequest) -> func.HttpResponse:
    if req.method == "OPTIONS":
        return func.HttpResponse(status_code=204, headers=get_cors_headers())
    try:
        # Die ID holen wir uns jetzt einfach aus dem Query-String (z.B. ?id=XXXX)
        record_id = req.params.get("id")
        if not record_id:
            return create_response({"success": False, "error": "Fehlender Parameter 'id' im Query-String"}, 400)

        headers = get_headers("DV_DEV_URL")
        dev_url = os.environ.get("DV_DEV_URL", "https://org392a4789.crm16.dynamics.com")
        url = f"{dev_url}/api/data/v9.2/dl_angebotes({record_id})"
        r = requests.delete(url, headers=headers)
        if r.status_code == 204:
            return create_response({"success": True}, 200)
        return create_response({"success": False, "error": f"Dataverse error: {r.status_code}"}, r.status_code)
    except Exception as e:
        return create_response({"success": False, "error": str(e)}, 500)