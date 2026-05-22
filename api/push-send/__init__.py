import azure.functions as func
import json
import os
import msal
import requests
from pywebpush import webpush, WebPushException


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
        "Access-Control-Allow-Methods": "POST, OPTIONS",
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


def _fetch_all_subscriptions(base_url, hdrs, entity_set):
    """Fetch all push subscription records from Dataverse."""
    subs = []
    url = (
        f"{base_url}/api/data/v9.2/{entity_set}"
        f"?$filter=startswith(dl_schluessel,'{PUSH_KEY_PREFIX}')"
        f"&$select=dl_seiteninhaltid,dl_schluessel,dl_wert"
        f"&$top=5000"
    )
    while url:
        r = requests.get(url, headers=hdrs, timeout=60)
        if r.status_code != 200:
            break
        data = r.json()
        for item in data.get("value", []):
            try:
                sub = json.loads(item.get("dl_wert", "{}"))
                if sub.get("endpoint"):
                    subs.append({
                        "record_id": item.get("dl_seiteninhaltid"),
                        "subscription": sub
                    })
            except (json.JSONDecodeError, TypeError):
                pass
        url = data.get("@odata.nextLink")
    return subs


def _delete_subscription(base_url, hdrs, entity_set, record_id):
    """Remove an expired/invalid subscription from Dataverse."""
    try:
        requests.delete(
            f"{base_url}/api/data/v9.2/{entity_set}({record_id})",
            headers=hdrs, timeout=15
        )
    except Exception:
        pass


def main(req: func.HttpRequest) -> func.HttpResponse:
    if req.method == "OPTIONS":
        return func.HttpResponse(status_code=200, headers=get_cors_headers())

    # Read VAPID keys
    vapid_private_key = os.environ.get("VAPID_PRIVATE_KEY", "")
    vapid_public_key = os.environ.get("VAPID_PUBLIC_KEY", "")
    vapid_contact = os.environ.get("VAPID_CONTACT", "mailto:info@dorfladen-oberornau.de")

    if not vapid_private_key or not vapid_public_key:
        return func.HttpResponse(
            json.dumps({"success": False, "error": "VAPID keys not configured"}),
            status_code=500, mimetype="application/json", headers=get_cors_headers()
        )

    try:
        body = req.get_json()
    except Exception:
        return func.HttpResponse(
            json.dumps({"success": False, "error": "Invalid JSON"}),
            status_code=400, mimetype="application/json", headers=get_cors_headers()
        )

    title = body.get("title", "Dorfladen Oberornau")
    message = body.get("message", "")
    url = body.get("url", "/")
    tag = body.get("tag", "dorfladen")
    image = body.get("image", "")

    if not message:
        return func.HttpResponse(
            json.dumps({"success": False, "error": "message required"}),
            status_code=400, mimetype="application/json", headers=get_cors_headers()
        )

    # Fetch all subscriptions from Dataverse
    base_url = os.environ.get(DEFAULT_URL_SETTING, "").strip() or DEFAULT_URL_FALLBACK
    hdrs = get_headers(DEFAULT_URL_SETTING)
    entity_set = _resolve_entity_set(base_url, hdrs)
    if not entity_set:
        return func.HttpResponse(
            json.dumps({"success": False, "error": "Dataverse not reachable"}),
            status_code=500, mimetype="application/json", headers=get_cors_headers()
        )

    all_subs = _fetch_all_subscriptions(base_url, hdrs, entity_set)
    if not all_subs:
        return func.HttpResponse(
            json.dumps({"success": True, "sent": 0, "failed": 0, "removed": 0, "message": "No subscribers"}),
            status_code=200, mimetype="application/json", headers=get_cors_headers()
        )

    payload_data = {
        "title": title,
        "body": message,
        "url": url,
        "tag": tag,
        "icon": "/images/icon-192.png",
        "badge": "/images/icon-192.png"
    }
    if image:
        payload_data["image"] = image
    notification_payload = json.dumps(payload_data, ensure_ascii=False)

    vapid_claims = {
        "sub": vapid_contact
    }

    sent = 0
    failed = 0
    removed = 0
    errors_detail = []

    for entry in all_subs:
        sub = entry["subscription"]
        try:
            webpush(
                subscription_info=sub,
                data=notification_payload,
                vapid_private_key=vapid_private_key,
                vapid_claims=vapid_claims
            )
            sent += 1
        except WebPushException as ex:
            resp = getattr(ex, "response", None)
            status = resp.status_code if resp else 0
            if status in (404, 410):
                # Subscription expired or unsubscribed – clean up
                _delete_subscription(base_url, hdrs, entity_set, entry["record_id"])
                removed += 1
            else:
                failed += 1
                errors_detail.append(f"WebPush {status}: {str(ex)[:200]}")
        except Exception as ex:
            failed += 1
            errors_detail.append(f"Error: {str(ex)[:200]}")

    return func.HttpResponse(
        json.dumps({
            "success": True,
            "sent": sent,
            "failed": failed,
            "removed": removed,
            "total": len(all_subs),
            "errors": errors_detail[:5]
        }),
        status_code=200, mimetype="application/json", headers=get_cors_headers()
    )
