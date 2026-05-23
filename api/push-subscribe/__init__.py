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
        "Access-Control-Allow-Methods": "GET, POST, PATCH, DELETE, OPTIONS",
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


ALL_CATEGORIES = ["mittagstisch", "angebote", "news"]


def main(req: func.HttpRequest) -> func.HttpResponse:
    if req.method == "OPTIONS":
        return func.HttpResponse(status_code=200, headers=get_cors_headers())

    base_url = os.environ.get(DEFAULT_URL_SETTING, "").strip() or DEFAULT_URL_FALLBACK
    hdrs = get_headers(DEFAULT_URL_SETTING)
    entity_set = _resolve_entity_set(base_url, hdrs)
    if not entity_set:
        return func.HttpResponse(
            json.dumps({"success": False, "error": "Dataverse not reachable"}),
            status_code=500, mimetype="application/json", headers=get_cors_headers()
        )

    # GET – return current categories for an endpoint
    if req.method == "GET":
        endpoint = req.params.get("endpoint", "")
        if not endpoint:
            return func.HttpResponse(
                json.dumps({"success": False, "error": "endpoint required"}),
                status_code=400, mimetype="application/json", headers=get_cors_headers()
            )
        sub_key = PUSH_KEY_PREFIX + _sub_hash(endpoint)
        filter_url = (
            f"{base_url}/api/data/v9.2/{entity_set}"
            f"?$filter=dl_schluessel eq '{sub_key}'"
            f"&$select=dl_wert"
        )
        r = requests.get(filter_url, headers=hdrs, timeout=30)
        items = (r.json() or {}).get("value", []) if r.status_code == 200 else []
        if not items:
            return func.HttpResponse(
                json.dumps({"success": False, "error": "Subscription not found"}),
                status_code=404, mimetype="application/json", headers=get_cors_headers()
            )
        try:
            data = json.loads(items[0].get("dl_wert", "{}"))
            cats = data.get("categories", ALL_CATEGORIES[:])
        except Exception:
            cats = ALL_CATEGORIES[:]
        return func.HttpResponse(
            json.dumps({"success": True, "categories": cats}),
            status_code=200, mimetype="application/json", headers=get_cors_headers()
        )

    try:
        body = req.get_json()
    except Exception:
        return func.HttpResponse(
            json.dumps({"success": False, "error": "Invalid JSON"}),
            status_code=400, mimetype="application/json", headers=get_cors_headers()
        )

    # PATCH – update categories only
    if req.method == "PATCH":
        endpoint = body.get("endpoint", "")
        categories = body.get("categories", ALL_CATEGORIES[:])
        if not endpoint:
            return func.HttpResponse(
                json.dumps({"success": False, "error": "endpoint required"}),
                status_code=400, mimetype="application/json", headers=get_cors_headers()
            )
        sub_key = PUSH_KEY_PREFIX + _sub_hash(endpoint)
        filter_url = (
            f"{base_url}/api/data/v9.2/{entity_set}"
            f"?$filter=dl_schluessel eq '{sub_key}'"
            f"&$select=dl_seiteninhaltid,dl_wert"
        )
        r = requests.get(filter_url, headers=hdrs, timeout=30)
        items = (r.json() or {}).get("value", []) if r.status_code == 200 else []
        if not items:
            return func.HttpResponse(
                json.dumps({"success": False, "error": "Subscription not found"}),
                status_code=404, mimetype="application/json", headers=get_cors_headers()
            )
        rec_id = items[0].get("dl_seiteninhaltid", "")
        try:
            data = json.loads(items[0].get("dl_wert", "{}"))
        except Exception:
            data = {}
        data["categories"] = categories
        patch_hdrs = {**hdrs, "If-Match": "*"}
        r = requests.patch(
            f"{base_url}/api/data/v9.2/{entity_set}({rec_id})",
            headers=patch_hdrs,
            json={"dl_wert": json.dumps(data, ensure_ascii=False)},
            timeout=30
        )
        if r.status_code in (200, 204):
            return func.HttpResponse(
                json.dumps({"success": True, "categories": categories}),
                status_code=200, mimetype="application/json", headers=get_cors_headers()
            )
        return func.HttpResponse(
            json.dumps({"success": False, "error": f"Dataverse {r.status_code}"}),
            status_code=500, mimetype="application/json", headers=get_cors_headers()
        )

    subscription = body.get("subscription", body)
    endpoint = subscription.get("endpoint", "")
    categories = body.get("categories", ALL_CATEGORIES[:])
    if not endpoint:
        return func.HttpResponse(
            json.dumps({"success": False, "error": "endpoint required"}),
            status_code=400, mimetype="application/json", headers=get_cors_headers()
        )

    sub_key = PUSH_KEY_PREFIX + _sub_hash(endpoint)

    if req.method == "DELETE":
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

    # POST – save subscription with categories
    sub_data = {
        "subscription": subscription,
        "categories": categories
    }
    sub_json = json.dumps(sub_data, ensure_ascii=False)

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
        # If validate=true, test if endpoint is actually alive
        validate = body.get("validate", False)
        if validate:
            try:
                from pywebpush import webpush, WebPushException
                from urllib.parse import urlparse
                vapid_priv = os.environ.get("VAPID_PRIVATE_KEY", "")
                vapid_contact_val = os.environ.get("VAPID_CONTACT", "mailto:info@dorfladen-oberornau.de")
                if vapid_priv:
                    parsed = urlparse(endpoint)
                    aud = f"{parsed.scheme}://{parsed.netloc}"
                    webpush(
                        subscription_info=subscription,
                        data=json.dumps({"title": "Dorfladen Oberornau", "body": "Push aktiviert! \u2705", "url": "/"}),
                        vapid_private_key=vapid_priv,
                        vapid_claims={"sub": vapid_contact_val, "aud": aud},
                        ttl=86400
                    )
            except Exception as ve:
                resp_obj = getattr(ve, "response", None)
                st = resp_obj.status_code if resp_obj else 0
                if st in (404, 410):
                    # Endpoint dead – delete from Dataverse, tell frontend
                    filt = f"{base_url}/api/data/v9.2/{entity_set}?$filter=dl_schluessel eq '{sub_key}'&$select=dl_seiteninhaltid"
                    dr = requests.get(filt, headers=hdrs, timeout=30)
                    for di in (dr.json() or {}).get("value", []):
                        requests.delete(f"{base_url}/api/data/v9.2/{entity_set}({di['dl_seiteninhaltid']})", headers=hdrs, timeout=30)
                    return func.HttpResponse(
                        json.dumps({"success": False, "endpoint_invalid": True, "error": f"Push endpoint dead ({st})"}),
                        status_code=200, mimetype="application/json", headers=get_cors_headers()
                    )
        return func.HttpResponse(
            json.dumps({"success": True, "action": action, "categories": categories}),
            status_code=200, mimetype="application/json", headers=get_cors_headers()
        )

    return func.HttpResponse(
        json.dumps({"success": False, "error": f"Dataverse {r.status_code}: {r.text[:200]}"}),
        status_code=500, mimetype="application/json", headers=get_cors_headers()
    )
