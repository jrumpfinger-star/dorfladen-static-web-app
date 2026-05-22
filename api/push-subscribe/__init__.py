import azure.functions as func
import json
import os
import hashlib
import msal
import requests


DEFAULT_URL_SETTING = "DV_DEFAULT_URL"
DEFAULT_URL_FALLBACK = "https://orgab4e2f00.crm16.dynamics.com"

PUSH_KEY_PREFIX = "push_sub_"


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
        "Access-Control-Allow-Methods": "POST, DELETE, OPTIONS",
        "Access-Control-Allow-Headers": "*",
        "Access-Control-Max-Age": "86400",
        "Content-Type": "application/json; charset=utf-8"
    }


def _resolve_entity_set(base_url, headers):
    for es in ["dl_seiteninhalts", "dl_seiteninhalt"]:
        r = requests.get(f"{base_url}/api/data/v9.2/{es}?$top=1", headers=headers, timeout=30)
        if r.status_code == 200:
            return es
    return None


def _sub_hash(endpoint):
    return hashlib.sha256(endpoint.encode()).hexdigest()[:16]


def main(req: func.HttpRequest) -> func.HttpResponse:
    if req.method == "OPTIONS":
        return func.HttpResponse(status_code=200, headers=get_cors_headers())

    try:
        body = req.get_json()
    except Exception:
        return func.HttpResponse(
            json.dumps({"success": False, "error": "Invalid JSON"}),
            status_code=400, mimetype="application/json", headers=get_cors_headers()
        )

    subscription = body.get("subscription", body)
    endpoint = subscription.get("endpoint", "")
    if not endpoint:
        return func.HttpResponse(
            json.dumps({"success": False, "error": "endpoint required"}),
            status_code=400, mimetype="application/json", headers=get_cors_headers()
        )

    base_url = os.environ.get(DEFAULT_URL_SETTING, "").strip() or DEFAULT_URL_FALLBACK
    hdrs = get_headers(DEFAULT_URL_SETTING)
    entity_set = _resolve_entity_set(base_url, hdrs)
    if not entity_set:
        return func.HttpResponse(
            json.dumps({"success": False, "error": "Dataverse not reachable"}),
            status_code=500, mimetype="application/json", headers=get_cors_headers()
        )

    sub_key = PUSH_KEY_PREFIX + _sub_hash(endpoint)

    if req.method == "DELETE":
        # Find and delete the subscription record
        filter_url = (
            f"{base_url}/api/data/v9.2/{entity_set}"
            f"?$filter=dl_schluessel eq '{sub_key}'"
            f"&$select=dl_seiteninhaltid"
        )
        r = requests.get(filter_url, headers=hdrs, timeout=30)
        items = (r.json() or {}).get("value", []) if r.status_code == 200 else []
        for item in items:
            rec_id = item.get("dl_seiteninhaltid", "")
            requests.delete(
                f"{base_url}/api/data/v9.2/{entity_set}({rec_id})",
                headers=hdrs, timeout=30
            )
        return func.HttpResponse(
            json.dumps({"success": True, "action": "unsubscribed"}),
            status_code=200, mimetype="application/json", headers=get_cors_headers()
        )

    # POST – save subscription
    sub_json = json.dumps(subscription, ensure_ascii=False)

    # Check if already exists
    filter_url = (
        f"{base_url}/api/data/v9.2/{entity_set}"
        f"?$filter=dl_schluessel eq '{sub_key}'"
        f"&$select=dl_seiteninhaltid"
    )
    r = requests.get(filter_url, headers=hdrs, timeout=30)
    existing = (r.json() or {}).get("value", []) if r.status_code == 200 else []

    payload = {
        "dl_schluessel": sub_key,
        "dl_bezeichnung": "Push Subscription",
        "dl_wert": sub_json
    }

    if existing:
        rec_id = existing[0].get("dl_seiteninhaltid", "")
        patch_hdrs = {**hdrs, "If-Match": "*"}
        r = requests.patch(
            f"{base_url}/api/data/v9.2/{entity_set}({rec_id})",
            headers=patch_hdrs, json=payload, timeout=30
        )
        action = "updated"
    else:
        r = requests.post(
            f"{base_url}/api/data/v9.2/{entity_set}",
            headers=hdrs, json=payload, timeout=30
        )
        action = "created"

    if r.status_code in (200, 201, 204):
        return func.HttpResponse(
            json.dumps({"success": True, "action": action}),
            status_code=200, mimetype="application/json", headers=get_cors_headers()
        )

    return func.HttpResponse(
        json.dumps({"success": False, "error": f"Dataverse {r.status_code}: {r.text[:200]}"}),
        status_code=500, mimetype="application/json", headers=get_cors_headers()
    )
