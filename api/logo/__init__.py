import azure.functions as func
import json
import os
import base64
import msal
import requests


LOGO_KEY = "site_logo"
IMAGE_COL = "dl_logo"


def _env_candidates():
    items = []
    for setting_name in ("DV_DEFAULT_URL", "DV_DEV_URL"):
        url = os.environ.get(setting_name, "").strip()
        if url and not any(x[1] == url for x in items):
            items.append((setting_name, url))
    if not items:
        items.append(("DV_DEV_URL", "https://org392a4789.crm16.dynamics.com"))
    return items


def get_token(url_setting_name="DV_DEFAULT_URL"):
    tenant_id = os.environ.get("DV_TENANT_ID", "acfaedd4-c403-43b7-9544-fdb2b150124e")
    client_id = os.environ.get("DV_CLIENT_ID", "137b2df6-be83-459a-ac89-9efd0bdf51c4")
    client_secret = os.environ.get("DV_CLIENT_SECRET", "")
    target_url = os.environ.get(url_setting_name, "https://org392a4789.crm16.dynamics.com")
    if not client_secret:
        return None
    try:
        a = msal.ConfidentialClientApplication(
            client_id,
            authority=f"https://login.microsoftonline.com/{tenant_id}",
            client_credential=client_secret,
        )
        r = a.acquire_token_for_client(scopes=[f"{target_url}/.default"])
        return r.get("access_token")
    except Exception:
        return None


def get_headers(url_setting_name="DV_DEFAULT_URL"):
    token = get_token(url_setting_name)
    return {
        "Authorization": f"Bearer {token}",
        "OData-MaxVersion": "4.0",
        "OData-Version": "4.0",
        "Accept": "application/json",
    }


def get_cors_headers():
    return {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, POST, DELETE, OPTIONS",
        "Access-Control-Allow-Headers": "*",
        "Access-Control-Max-Age": "86400",
        "Content-Type": "application/json; charset=utf-8",
    }


def _resolve_entity_set(base_url, headers):
    for es in ["dl_seiteninhalts", "dl_seiteninhalt"]:
        probe = f"{base_url}/api/data/v9.2/{es}?$top=1"
        try:
            r = requests.get(probe, headers=headers, timeout=30)
            if r.status_code == 200:
                return es
        except Exception:
            pass
    return None


def _find_env():
    for env_name, base_url in _env_candidates():
        headers = get_headers(env_name)
        entity_set = _resolve_entity_set(base_url, headers)
        if entity_set:
            return base_url, headers, entity_set
    return None, None, None


def _find_or_create_logo_record(base_url, headers, entity_set):
    filter_url = f"{base_url}/api/data/v9.2/{entity_set}?$filter=dl_schluessel eq '{LOGO_KEY}'"
    r = requests.get(filter_url, headers=headers, timeout=30)
    items = (r.json() or {}).get("value", []) if r.status_code == 200 else []
    if items:
        return items[0].get("dl_seiteninhaltid")
    payload = {"dl_schluessel": LOGO_KEY, "dl_bezeichnung": "Site Logo"}
    post_headers = {**headers, "Content-Type": "application/json"}
    cr = requests.post(f"{base_url}/api/data/v9.2/{entity_set}", headers=post_headers, json=payload, timeout=30)
    if cr.status_code in (200, 201):
        return (cr.json() or {}).get("dl_seiteninhaltid")
    if cr.status_code == 204:
        eid = cr.headers.get("OData-EntityId", "")
        if "(" in eid:
            return eid.split("(")[-1].rstrip(")")
    return None


def _handle_get(base_url, headers, entity_set):
    rec_id = _find_or_create_logo_record(base_url, headers, entity_set)
    if not rec_id:
        return func.HttpResponse(
            json.dumps({"success": False, "error": "Could not find/create logo record"}),
            status_code=500, mimetype="application/json", headers=get_cors_headers()
        )
    img_url = f"{base_url}/api/data/v9.2/{entity_set}({rec_id})/{IMAGE_COL}/$value?size=full"
    img_headers = {**headers, "Accept": "application/octet-stream", "Content-Type": "application/octet-stream"}
    r = requests.get(img_url, headers=img_headers, timeout=30)
    if r.status_code == 200 and len(r.content) > 100:
        content = r.content
        ct = r.headers.get("Content-Type", "image/png")
        if ct == "application/octet-stream":
            if content[:4] == b'\x89PNG':
                ct = "image/png"
            elif content[:3] == b'\xff\xd8\xff':
                ct = "image/jpeg"
            elif content[:4] == b'RIFF':
                ct = "image/webp"
            elif b'<svg' in content[:200]:
                ct = "image/svg+xml"
            else:
                ct = "image/png"
        b64 = base64.b64encode(content).decode("ascii")
        return func.HttpResponse(
            json.dumps({"success": True, "logo": f"data:{ct};base64,{b64}"}),
            status_code=200, mimetype="application/json", headers=get_cors_headers()
        )
    return func.HttpResponse(
        json.dumps({"success": True, "logo": ""}),
        status_code=200, mimetype="application/json", headers=get_cors_headers()
    )


def _handle_post(req, base_url, headers, entity_set):
    body = req.get_json()
    data_b64 = body.get("data", "")
    filename = body.get("filename", "logo.png")
    if not data_b64:
        return func.HttpResponse(
            json.dumps({"success": False, "error": "No image data provided"}),
            status_code=400, mimetype="application/json", headers=get_cors_headers()
        )
    if "," in data_b64 and data_b64.startswith("data:"):
        data_b64 = data_b64.split(",", 1)[1]
    try:
        image_bytes = base64.b64decode(data_b64)
    except Exception as e:
        return func.HttpResponse(
            json.dumps({"success": False, "error": f"Invalid base64: {str(e)}"}),
            status_code=400, mimetype="application/json", headers=get_cors_headers()
        )
    rec_id = _find_or_create_logo_record(base_url, headers, entity_set)
    if not rec_id:
        return func.HttpResponse(
            json.dumps({"success": False, "error": "Could not find/create logo record"}),
            status_code=500, mimetype="application/json", headers=get_cors_headers()
        )
    upload_url = f"{base_url}/api/data/v9.2/{entity_set}({rec_id})/{IMAGE_COL}"
    upload_headers = {
        "Authorization": headers["Authorization"],
        "Content-Type": "application/octet-stream",
        "x-ms-file-name": filename,
    }
    r = requests.put(upload_url, headers=upload_headers, data=image_bytes, timeout=60)
    if r.status_code in (200, 204):
        return func.HttpResponse(
            json.dumps({"success": True, "size": len(image_bytes)}),
            status_code=200, mimetype="application/json", headers=get_cors_headers()
        )
    return func.HttpResponse(
        json.dumps({"success": False, "error": f"Upload failed: {r.status_code} {r.text[:300]}"}),
        status_code=r.status_code, mimetype="application/json", headers=get_cors_headers()
    )


def _handle_delete(base_url, headers, entity_set):
    rec_id = _find_or_create_logo_record(base_url, headers, entity_set)
    if not rec_id:
        return func.HttpResponse(json.dumps({"success": True}), status_code=200, mimetype="application/json", headers=get_cors_headers())
    del_url = f"{base_url}/api/data/v9.2/{entity_set}({rec_id})/{IMAGE_COL}"
    requests.delete(del_url, headers=headers, timeout=30)
    return func.HttpResponse(json.dumps({"success": True}), status_code=200, mimetype="application/json", headers=get_cors_headers())


def main(req: func.HttpRequest) -> func.HttpResponse:
    if req.method == "OPTIONS":
        return func.HttpResponse(status_code=200, headers=get_cors_headers())
    try:
        base_url, headers, entity_set = _find_env()
        if not entity_set:
            return func.HttpResponse(
                json.dumps({"success": False, "error": "No Dataverse environment found"}),
                status_code=500, mimetype="application/json", headers=get_cors_headers()
            )
        if req.method == "GET":
            return _handle_get(base_url, headers, entity_set)
        elif req.method == "POST":
            return _handle_post(req, base_url, headers, entity_set)
        elif req.method == "DELETE":
            return _handle_delete(base_url, headers, entity_set)
        return func.HttpResponse(
            json.dumps({"success": False, "error": "Method not allowed"}),
            status_code=405, mimetype="application/json", headers=get_cors_headers()
        )
    except Exception as e:
        return func.HttpResponse(
            json.dumps({"success": False, "error": str(e)}),
            status_code=500, mimetype="application/json", headers=get_cors_headers()
        )
