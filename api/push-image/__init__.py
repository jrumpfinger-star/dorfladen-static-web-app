import azure.functions as func
import json
import os
import base64
import hashlib
import msal
import requests


DEFAULT_URL_SETTING = "DV_DEFAULT_URL"
DEFAULT_URL_FALLBACK = "https://orgab4e2f00.crm16.dynamics.com"

PUSH_IMG_PREFIX = "push_img_"


def get_token(url_setting_name="DV_DEFAULT_URL"):
    tenant_id = os.environ.get("DV_TENANT_ID", "acfaedd4-c403-43b7-9544-fdb2b150124e")
    client_id = os.environ.get("DV_CLIENT_ID", "137b2df6-be83-459a-ac89-9efd0bdf51c4")
    client_secret = os.environ.get("DV_CLIENT_SECRET", "")
    target_url = os.environ.get(url_setting_name, DEFAULT_URL_FALLBACK)
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
        "Content-Type": "application/json; charset=utf-8"
    }


def get_cors_headers():
    return {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
        "Access-Control-Allow-Headers": "*",
        "Access-Control-Max-Age": "86400"
    }


def _resolve_entity_set(base_url, headers):
    for es in ["dl_seiteninhalts", "dl_seiteninhalt"]:
        r = requests.get(f"{base_url}/api/data/v9.2/{es}?$top=1", headers=headers, timeout=30)
        if r.status_code == 200:
            return es
    return None


def main(req: func.HttpRequest) -> func.HttpResponse:
    if req.method == "OPTIONS":
        return func.HttpResponse(status_code=200, headers={**get_cors_headers(), "Content-Type": "text/plain"})

    base_url = os.environ.get(DEFAULT_URL_SETTING, "").strip() or DEFAULT_URL_FALLBACK
    hdrs = get_headers(DEFAULT_URL_SETTING)
    entity_set = _resolve_entity_set(base_url, hdrs)
    if not entity_set:
        return func.HttpResponse(
            json.dumps({"error": "Dataverse not reachable"}),
            status_code=500, mimetype="application/json", headers=get_cors_headers()
        )

    if req.method == "GET":
        # Serve image by name
        name = req.params.get("name", "").strip()
        if not name:
            return func.HttpResponse("name required", status_code=400, headers=get_cors_headers())

        img_key = PUSH_IMG_PREFIX + name
        filter_url = (
            f"{base_url}/api/data/v9.2/{entity_set}"
            f"?$filter=dl_schluessel eq '{img_key}'"
            f"&$select=dl_wert,dl_bezeichnung"
        )
        r = requests.get(filter_url, headers=hdrs, timeout=30)
        items = (r.json() or {}).get("value", []) if r.status_code == 200 else []
        if not items:
            return func.HttpResponse("Not found", status_code=404, headers=get_cors_headers())

        data_url = items[0].get("dl_wert", "")
        mime_type = items[0].get("dl_bezeichnung", "image/jpeg")

        # data_url is base64 string
        try:
            img_bytes = base64.b64decode(data_url)
        except Exception:
            return func.HttpResponse("Invalid image data", status_code=500, headers=get_cors_headers())

        return func.HttpResponse(
            img_bytes,
            status_code=200,
            mimetype=mime_type,
            headers={
                **get_cors_headers(),
                "Content-Type": mime_type,
                "Cache-Control": "public, max-age=86400"
            }
        )

    # POST – upload image
    try:
        body = req.get_json()
    except Exception:
        return func.HttpResponse(
            json.dumps({"error": "Invalid JSON"}),
            status_code=400, mimetype="application/json", headers=get_cors_headers()
        )

    data_url = body.get("data", "")
    if not data_url:
        return func.HttpResponse(
            json.dumps({"error": "data required (base64)"}),
            status_code=400, mimetype="application/json", headers=get_cors_headers()
        )

    # Extract mime type and raw base64
    mime_type = "image/jpeg"
    raw_b64 = data_url
    if data_url.startswith("data:"):
        parts = data_url.split(",", 1)
        if len(parts) == 2:
            mime_part = parts[0]  # e.g. data:image/jpeg;base64
            raw_b64 = parts[1]
            if "image/" in mime_part:
                mime_type = mime_part.split(":")[1].split(";")[0]

    # Generate a short name from hash
    img_hash = hashlib.md5(raw_b64[:100].encode()).hexdigest()[:10]
    img_key = PUSH_IMG_PREFIX + img_hash

    # Store in Dataverse (dl_wert = raw base64, dl_bezeichnung = mime type)
    filter_url = (
        f"{base_url}/api/data/v9.2/{entity_set}"
        f"?$filter=dl_schluessel eq '{img_key}'"
        f"&$select=dl_seiteninhaltid"
    )
    r = requests.get(filter_url, headers=hdrs, timeout=30)
    existing = (r.json() or {}).get("value", []) if r.status_code == 200 else []

    payload = {
        "dl_schluessel": img_key,
        "dl_bezeichnung": mime_type,
        "dl_wert": raw_b64
    }

    if existing:
        rec_id = existing[0].get("dl_seiteninhaltid", "")
        patch_hdrs = {**hdrs, "If-Match": "*"}
        r = requests.patch(
            f"{base_url}/api/data/v9.2/{entity_set}({rec_id})",
            headers=patch_hdrs, json=payload, timeout=30
        )
    else:
        r = requests.post(
            f"{base_url}/api/data/v9.2/{entity_set}",
            headers=hdrs, json=payload, timeout=30
        )

    if r.status_code in (200, 201, 204):
        image_url = f"/api/push-image?name={img_hash}"
        return func.HttpResponse(
            json.dumps({"success": True, "url": image_url, "name": img_hash}),
            status_code=200, mimetype="application/json", headers=get_cors_headers()
        )

    return func.HttpResponse(
        json.dumps({"error": f"Dataverse {r.status_code}: {r.text[:200]}"}),
        status_code=500, mimetype="application/json", headers=get_cors_headers()
    )
