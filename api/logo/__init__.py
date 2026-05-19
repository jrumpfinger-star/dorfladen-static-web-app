import azure.functions as func
import json
import os
import base64
import msal
import requests


def get_token():
    tenant_id = os.environ.get("DV_TENANT_ID", "acfaedd4-c403-43b7-9544-fdb2b150124e")
    client_id = os.environ.get("DV_CLIENT_ID", "137b2df6-be83-459a-ac89-9efd0bdf51c4")
    client_secret = os.environ.get("DV_CLIENT_SECRET", "")
    target_url = os.environ.get("DV_DEFAULT_URL", os.environ.get("DV_DEV_URL", "https://org392a4789.crm16.dynamics.com"))
    if not client_secret:
        return None, target_url
    try:
        a = msal.ConfidentialClientApplication(
            client_id,
            authority=f"https://login.microsoftonline.com/{tenant_id}",
            client_credential=client_secret,
        )
        r = a.acquire_token_for_client(scopes=[f"{target_url}/.default"])
        return r.get("access_token"), target_url
    except Exception:
        return None, target_url


def get_cors_headers():
    return {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, POST, DELETE, OPTIONS",
        "Access-Control-Allow-Headers": "*",
        "Access-Control-Max-Age": "86400",
    }


ENTITY_SET = "dl_seiteninhalts"
LOGO_KEY = "site_logo"
IMAGE_COL = "dl_logo"


def _find_or_create_logo_record(base_url, headers):
    """Find the logo record by key, create if missing. Returns record ID."""
    filter_url = f"{base_url}/api/data/v9.2/{ENTITY_SET}?$filter=dl_schluessel eq '{LOGO_KEY}'&$select=dl_seiteninhaltid"
    r = requests.get(filter_url, headers=headers, timeout=30)
    items = (r.json() or {}).get("value", []) if r.status_code == 200 else []
    if items:
        return items[0].get("dl_seiteninhaltid")
    # Create placeholder record
    payload = {"dl_schluessel": LOGO_KEY, "dl_bezeichnung": "Site Logo"}
    cr = requests.post(f"{base_url}/api/data/v9.2/{ENTITY_SET}", headers={**headers, "Content-Type": "application/json"}, json=payload, timeout=30)
    if cr.status_code in (200, 201):
        return (cr.json() or {}).get("dl_seiteninhaltid")
    # Try to get ID from OData-EntityId header
    eid = cr.headers.get("OData-EntityId", "")
    if "(" in eid:
        return eid.split("(")[-1].rstrip(")")
    return None


def _handle_get(base_url, headers):
    """Return logo image as base64 data URL."""
    rec_id = _find_or_create_logo_record(base_url, headers)
    if not rec_id:
        return func.HttpResponse(
            json.dumps({"success": False, "error": "Logo record not found"}),
            status_code=404, mimetype="application/json", headers=get_cors_headers()
        )
    # Download image column data
    img_url = f"{base_url}/api/data/v9.2/{ENTITY_SET}({rec_id})/{IMAGE_COL}/$value?size=full"
    img_headers = {**headers, "Accept": "application/octet-stream"}
    r = requests.get(img_url, headers=img_headers, timeout=30)
    if r.status_code == 200 and len(r.content) > 0:
        # Detect content type
        content = r.content
        ct = r.headers.get("Content-Type", "image/png")
        if ct == "application/octet-stream":
            # Detect from magic bytes
            if content[:4] == b'\x89PNG':
                ct = "image/png"
            elif content[:3] == b'\xff\xd8\xff':
                ct = "image/jpeg"
            elif content[:4] == b'RIFF':
                ct = "image/webp"
            elif content[:5] == b'<?xml' or content[:4] == b'<svg':
                ct = "image/svg+xml"
            else:
                ct = "image/png"
        b64 = base64.b64encode(content).decode("ascii")
        data_url = f"data:{ct};base64,{b64}"
        return func.HttpResponse(
            json.dumps({"success": True, "logo": data_url}),
            status_code=200, mimetype="application/json", headers=get_cors_headers()
        )
    return func.HttpResponse(
        json.dumps({"success": True, "logo": ""}),
        status_code=200, mimetype="application/json", headers=get_cors_headers()
    )


def _handle_post(req, base_url, headers):
    """Upload logo image. Expects JSON: {data: "base64string", contentType: "image/png"}"""
    body = req.get_json()
    data_b64 = body.get("data", "")
    content_type = body.get("contentType", "image/png")
    filename = body.get("filename", "logo.png")

    if not data_b64:
        return func.HttpResponse(
            json.dumps({"success": False, "error": "No image data provided"}),
            status_code=400, mimetype="application/json", headers=get_cors_headers()
        )

    # Strip data URL prefix if present
    if "," in data_b64 and data_b64.startswith("data:"):
        header_part = data_b64.split(",")[0]
        data_b64 = data_b64.split(",", 1)[1]
        if "image/" in header_part:
            content_type = header_part.split(";")[0].replace("data:", "")

    try:
        image_bytes = base64.b64decode(data_b64)
    except Exception as e:
        return func.HttpResponse(
            json.dumps({"success": False, "error": f"Invalid base64: {str(e)}"}),
            status_code=400, mimetype="application/json", headers=get_cors_headers()
        )

    rec_id = _find_or_create_logo_record(base_url, headers)
    if not rec_id:
        return func.HttpResponse(
            json.dumps({"success": False, "error": "Could not find/create logo record"}),
            status_code=500, mimetype="application/json", headers=get_cors_headers()
        )

    # Upload image to Dataverse Image column
    upload_url = f"{base_url}/api/data/v9.2/{ENTITY_SET}({rec_id})/{IMAGE_COL}"
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


def _handle_delete(base_url, headers):
    """Remove logo image."""
    rec_id = _find_or_create_logo_record(base_url, headers)
    if not rec_id:
        return func.HttpResponse(
            json.dumps({"success": True}),
            status_code=200, mimetype="application/json", headers=get_cors_headers()
        )
    del_url = f"{base_url}/api/data/v9.2/{ENTITY_SET}({rec_id})/{IMAGE_COL}"
    r = requests.delete(del_url, headers={**headers}, timeout=30)
    return func.HttpResponse(
        json.dumps({"success": True}),
        status_code=200, mimetype="application/json", headers=get_cors_headers()
    )


def main(req: func.HttpRequest) -> func.HttpResponse:
    if req.method == "OPTIONS":
        return func.HttpResponse(status_code=200, headers=get_cors_headers())
    try:
        token, base_url = get_token()
        if not token:
            return func.HttpResponse(
                json.dumps({"success": False, "error": "Auth failed"}),
                status_code=500, mimetype="application/json", headers=get_cors_headers()
            )
        headers = {
            "Authorization": f"Bearer {token}",
            "OData-MaxVersion": "4.0",
            "OData-Version": "4.0",
            "Accept": "application/json",
        }
        if req.method == "GET":
            return _handle_get(base_url, headers)
        elif req.method == "POST":
            return _handle_post(req, base_url, headers)
        elif req.method == "DELETE":
            return _handle_delete(base_url, headers)
        return func.HttpResponse(
            json.dumps({"success": False, "error": "Method not allowed"}),
            status_code=405, mimetype="application/json", headers=get_cors_headers()
        )
    except Exception as e:
        return func.HttpResponse(
            json.dumps({"success": False, "error": str(e)}),
            status_code=500, mimetype="application/json", headers=get_cors_headers()
        )
