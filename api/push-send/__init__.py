import azure.functions as func
import json
import os
import msal
import requests
from pywebpush import webpush, WebPushException


DEFAULT_URL_SETTING = "DV_DEFAULT_URL"
DEFAULT_URL_FALLBACK = "https://orgab4e2f00.crm16.dynamics.com"

PUSH_KEY_PREFIX = "push_sub_"
LEGACY_CAT_MAP = {"mittagstisch": "tagesinfo", "angebote": "tagesinfo"}


def _migrate_cats(cats):
    """Map old category names to new ones and deduplicate."""
    migrated = []
    for c in cats:
        mapped = LEGACY_CAT_MAP.get(c, c)
        if mapped not in migrated:
            migrated.append(mapped)
    return migrated


def get_token(url_setting_name="DV_DEFAULT_URL"):
    from shared.dataverse import get_tenant_id, get_client_id
    tenant_id = get_tenant_id()
    client_id = get_client_id()
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
                raw = json.loads(item.get("dl_wert", "{}"))
                # New format: {"subscription": {...}, "categories": [...]}
                # Old format: {"endpoint": "...", "keys": {...}}
                if "subscription" in raw:
                    sub = raw["subscription"]
                    cats = _migrate_cats(raw.get("categories", ["tagesinfo", "news"]))
                    email = raw.get("email", "")
                elif raw.get("endpoint"):
                    sub = raw
                    cats = ["tagesinfo", "news"]
                    email = ""
                else:
                    continue
                subs.append({
                    "record_id": item.get("dl_seiteninhaltid"),
                    "subscription": sub,
                    "categories": cats,
                    "email": email
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
    from shared.auth import admin_auth_guard
    _auth = admin_auth_guard(req)
    if _auth is not None:
        return _auth
    if req.method == "OPTIONS":
        return func.HttpResponse(status_code=200, headers=get_cors_headers())

    # GET = debug: show subscriber count
    if req.method == "GET":
        try:
            base_url = os.environ.get(DEFAULT_URL_SETTING, "").strip() or DEFAULT_URL_FALLBACK
            hdrs = get_headers(DEFAULT_URL_SETTING)
            entity_set = _resolve_entity_set(base_url, hdrs)
            if not entity_set:
                return func.HttpResponse(
                    json.dumps({"error": "Dataverse not reachable"}),
                    status_code=500, mimetype="application/json", headers=get_cors_headers()
                )
            all_subs = _fetch_all_subscriptions(base_url, hdrs, entity_set)
            info = []
            for s in all_subs:
                sub = s["subscription"]
                ep = sub.get("endpoint", "")
                keys = sub.get("keys", {})
                cats = s.get("categories", [])
                has_p256dh = bool(keys.get("p256dh", ""))
                has_auth = bool(keys.get("auth", ""))
                info.append({
                    "record_id": s.get("record_id", ""),
                    "endpoint_short": ep[-60:] if len(ep) > 60 else ep,
                    "endpoint_domain": ep.split("/")[2] if ep.count("/") >= 2 else "",
                    "has_p256dh": has_p256dh,
                    "has_auth": has_auth,
                    "categories": cats,
                    "email": s.get("email", "")
                })
            # If ?test=1, try sending a test push without deleting on failure
            if req.params.get("test") == "1" and all_subs:
                vapid_priv = os.environ.get("VAPID_PRIVATE_KEY", "")
                vapid_contact_val = os.environ.get("VAPID_CONTACT", "mailto:info@dorfladen-oberornau.de")
                test_results = []
                for s in all_subs:
                    try:
                        ep_test = s["subscription"].get("endpoint", "")
                        from urllib.parse import urlparse
                        parsed_test = urlparse(ep_test)
                        aud_test = f"{parsed_test.scheme}://{parsed_test.netloc}"
                        claims_test = {"sub": vapid_contact_val}
                        if aud_test:
                            claims_test["aud"] = aud_test
                        webpush(
                            subscription_info=s["subscription"],
                            data=json.dumps({"title": "Test", "body": "Diagnose-Push", "url": "/"}),
                            vapid_private_key=vapid_priv,
                            vapid_claims=claims_test
                        )
                        test_results.append({"status": "OK"})
                    except WebPushException as wex:
                        resp_obj = getattr(wex, "response", None)
                        st = resp_obj.status_code if resp_obj else 0
                        rt = ""
                        if resp_obj:
                            try: rt = resp_obj.text[:500]
                            except: pass
                        test_results.append({"status": st, "response": rt, "exception": str(wex)[:500]})
                    except Exception as ex2:
                        test_results.append({"status": "error", "exception": str(ex2)[:300]})
                return func.HttpResponse(
                    json.dumps({"total": len(all_subs), "test_results": test_results, "vapid_key_len": len(vapid_priv)}),
                    status_code=200, mimetype="application/json", headers=get_cors_headers()
                )

            return func.HttpResponse(
                json.dumps({"total": len(all_subs), "subscribers": info}),
                status_code=200, mimetype="application/json", headers=get_cors_headers()
            )
        except Exception as ex:
            return func.HttpResponse(
                json.dumps({"error": str(ex)}),
                status_code=500, mimetype="application/json", headers=get_cors_headers()
            )

    # DELETE – remove a subscription by record_id
    if req.method == "DELETE":
        try:
            body_del = req.get_json()
            record_id = body_del.get("record_id", "")
            if not record_id:
                return func.HttpResponse(
                    json.dumps({"success": False, "error": "record_id required"}),
                    status_code=400, mimetype="application/json", headers=get_cors_headers()
                )
            base_url = os.environ.get(DEFAULT_URL_SETTING, "").strip() or DEFAULT_URL_FALLBACK
            hdrs = get_headers(DEFAULT_URL_SETTING)
            entity_set = _resolve_entity_set(base_url, hdrs)
            _delete_subscription(base_url, hdrs, entity_set, record_id)
            return func.HttpResponse(
                json.dumps({"success": True}),
                status_code=200, mimetype="application/json", headers=get_cors_headers()
            )
        except Exception as ex:
            return func.HttpResponse(
                json.dumps({"success": False, "error": str(ex)}),
                status_code=500, mimetype="application/json", headers=get_cors_headers()
            )

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
    origin = (body.get("origin", "") or "").strip()
    tag = body.get("tag", "dorfladen")
    image = body.get("image", "")
    category = body.get("category", "")
    target_email = (body.get("target_email", "") or "").lower().strip()
    target_endpoint = (body.get("target_endpoint", "") or "").strip()

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

    # Filter by category if specified
    if category:
        all_subs = [s for s in all_subs if category in s.get("categories", [])]

    # Filter by target email if specified (for customer-specific notifications)
    if target_email:
        all_subs = [s for s in all_subs if s.get("email", "").lower() == target_email]

    # Filter by target endpoint if specified (for "only this device" test sends).
    # This targets exactly one browser subscription (e.g. the admin's own device),
    # so a test push in production only reaches that single endpoint.
    if target_endpoint:
        all_subs = [s for s in all_subs if s["subscription"].get("endpoint", "") == target_endpoint]

    if not all_subs:
        return func.HttpResponse(
            json.dumps({"success": True, "sent": 0, "failed": 0, "removed": 0, "total": 0,
                         "message": "No subscribers" + (f" for category '{category}'" if category else "")}),
            status_code=200, mimetype="application/json", headers=get_cors_headers()
        )

    # Build absolute base URL. Prefer the origin passed by the triggering
    # request (so the notification links to the environment it was triggered
    # from), fall back to this function's own request URL.
    req_url = req.url or ""
    site_origin = origin
    if not site_origin and "/api/" in req_url:
        site_origin = req_url.split("/api/")[0]

    # Klick-Ziel absolut machen, damit die Notification immer in der
    # ausloesenden Umgebung oeffnet (nicht in einer fest verdrahteten).
    if url and url.startswith("/") and site_origin:
        url = site_origin + url

    payload_data = {
        "title": title,
        "body": message,
        "url": url,
        "tag": tag,
        "icon": site_origin + "/images/icon-192.png",
        "badge": site_origin + "/images/icon-192.png"
    }
    if image:
        # Make image URL absolute if relative
        if image.startswith("/"):
            image = site_origin + image
        payload_data["image"] = image
    notification_payload = json.dumps(payload_data, ensure_ascii=False)

    sent = 0
    failed = 0
    removed = 0
    errors_detail = []

    for entry in all_subs:
        sub = entry["subscription"]
        ep = sub.get("endpoint", "")
        # Build aud (audience) from endpoint origin – required by push services
        try:
            from urllib.parse import urlparse
            parsed = urlparse(ep)
            aud = f"{parsed.scheme}://{parsed.netloc}"
        except Exception:
            aud = ""
        vapid_claims = {"sub": vapid_contact}
        if aud:
            vapid_claims["aud"] = aud
        try:
            webpush(
                subscription_info=sub,
                data=notification_payload,
                vapid_private_key=vapid_private_key,
                vapid_claims=vapid_claims,
                ttl=86400
            )
            sent += 1
        except WebPushException as ex:
            resp = getattr(ex, "response", None)
            status = resp.status_code if resp else 0
            resp_text = ""
            if resp is not None:
                try:
                    resp_text = resp.text[:300] if hasattr(resp, "text") else ""
                except Exception:
                    pass
            # pywebpush sometimes has status=0 but the real code is in the response body
            if status == 0 and resp_text:
                try:
                    resp_json = json.loads(resp_text)
                    status = resp_json.get("code", 0)
                except Exception:
                    pass
            # Also try to extract from exception string as last resort
            if status == 0:
                ex_str_check = str(ex)
                if "410" in ex_str_check and "Gone" in ex_str_check:
                    status = 410
                elif "404" in ex_str_check and ("Not Found" in ex_str_check or "not found" in ex_str_check):
                    status = 404
            ex_str = str(ex)
            ep_short = entry['subscription'].get('endpoint','')[:80]
            errors_detail.append(f"status={status} resp={resp_text[:200]} endpoint_domain={ep_short}")
            if status == 404:
                _delete_subscription(base_url, hdrs, entity_set, entry["record_id"])
                removed += 1
            elif status == 410:
                # 410 Gone – endpoint confirmed dead, delete
                _delete_subscription(base_url, hdrs, entity_set, entry["record_id"])
                removed += 1
            else:
                failed += 1
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
