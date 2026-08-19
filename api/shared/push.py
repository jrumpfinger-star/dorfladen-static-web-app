"""In-Process Web-Push-Versand.

Grund: In Azure Static Web Apps kann der Functions-Backend seine eigene
oeffentliche ``/api/push-send``-URL per HTTP i. d. R. NICHT erreichen. Der
fruehere Auto-Push (social-post/news-save/shop-notify) rief push-send jedoch
per ``requests.post`` gegen genau diese oeffentliche URL auf -> der Aufruf lief
in eine Exception (verschluckt, fire-and-forget) -> es wurde KEINE Push
versendet.

Diese Modul kapselt die identische Versand-Logik wie ``push-send`` und wird von
den Auto-Push-Aufrufern DIREKT im selben Prozess aufgerufen (kein HTTP, keine
Auth-Huerde, kein Self-Call). Der HTTP-Endpunkt ``/api/push-send`` bleibt
unveraendert fuer den manuellen CMS-Versand.
"""
import os
import json
import requests
import msal
from pywebpush import webpush, WebPushException

DEFAULT_URL_SETTING = "DV_DEFAULT_URL"
DEFAULT_URL_FALLBACK = "https://orgab4e2f00.crm16.dynamics.com"
PUSH_KEY_PREFIX = "push_sub_"
LEGACY_CAT_MAP = {"mittagstisch": "tagesinfo", "angebote": "tagesinfo"}


def _migrate_cats(cats):
    migrated = []
    for c in cats:
        mapped = LEGACY_CAT_MAP.get(c, c)
        if mapped not in migrated:
            migrated.append(mapped)
    return migrated


def _get_token(url_setting_name=DEFAULT_URL_SETTING):
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


def _get_headers(url_setting_name=DEFAULT_URL_SETTING):
    token = _get_token(url_setting_name)
    return {
        "Authorization": f"Bearer {token}",
        "OData-MaxVersion": "4.0",
        "OData-Version": "4.0",
        "Accept": "application/json",
        "Content-Type": "application/json; charset=utf-8",
    }


def _resolve_entity_set(base_url, headers):
    for es in ["dl_seiteninhalts", "dl_seiteninhalt"]:
        try:
            r = requests.get(f"{base_url}/api/data/v9.2/{es}?$top=1", headers=headers, timeout=30)
            if r.status_code == 200:
                return es
        except Exception:
            pass
    return None


def _fetch_all_subscriptions(base_url, hdrs, entity_set):
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
                    "email": email,
                })
            except (json.JSONDecodeError, TypeError):
                pass
        url = data.get("@odata.nextLink")
    return subs


def _delete_subscription(base_url, hdrs, entity_set, record_id):
    try:
        requests.delete(
            f"{base_url}/api/data/v9.2/{entity_set}({record_id})",
            headers=hdrs, timeout=15
        )
    except Exception:
        pass


def send_push_notification(title, message, url="/", origin="", tag="dorfladen",
                           image="", category="", target_email=""):
    """Versendet eine Web-Push an alle passenden Abonnenten. Gibt ein dict mit
    ``{success, sent, failed, removed, total, error?}`` zurueck. Best-effort:
    wirft keine Exception nach aussen.
    """
    result = {"success": False, "sent": 0, "failed": 0, "removed": 0, "total": 0}
    try:
        if not message:
            result["error"] = "message required"
            return result

        vapid_private_key = os.environ.get("VAPID_PRIVATE_KEY", "")
        vapid_public_key = os.environ.get("VAPID_PUBLIC_KEY", "")
        vapid_contact = os.environ.get("VAPID_CONTACT", "mailto:info@dorfladen-oberornau.de")
        if not vapid_private_key or not vapid_public_key:
            result["error"] = "VAPID keys not configured"
            return result

        base_url = os.environ.get(DEFAULT_URL_SETTING, "").strip() or DEFAULT_URL_FALLBACK
        hdrs = _get_headers(DEFAULT_URL_SETTING)
        entity_set = _resolve_entity_set(base_url, hdrs)
        if not entity_set:
            result["error"] = "Dataverse not reachable"
            return result

        all_subs = _fetch_all_subscriptions(base_url, hdrs, entity_set)
        if category:
            all_subs = [s for s in all_subs if category in s.get("categories", [])]
        if target_email:
            tl = target_email.lower().strip()
            all_subs = [s for s in all_subs if s.get("email", "").lower() == tl]

        result["total"] = len(all_subs)
        if not all_subs:
            result["success"] = True
            result["message"] = "No subscribers"
            return result

        site_origin = (origin or "").strip()
        link = url or "/"
        if link.startswith("/") and site_origin:
            link = site_origin + link
        payload_data = {
            "title": title or "Dorfladen Oberornau",
            "body": message,
            "url": link,
            "tag": tag,
        }
        if site_origin:
            payload_data["icon"] = site_origin + "/images/icon-192.png"
            payload_data["badge"] = site_origin + "/images/icon-192.png"
        if image:
            if image.startswith("/") and site_origin:
                image = site_origin + image
            payload_data["image"] = image
        notification_payload = json.dumps(payload_data, ensure_ascii=False)

        sent = failed = removed = 0
        for entry in all_subs:
            sub = entry["subscription"]
            ep = sub.get("endpoint", "")
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
                    ttl=86400,
                )
                sent += 1
            except WebPushException as ex:
                resp = getattr(ex, "response", None)
                status = resp.status_code if resp else 0
                if status == 0:
                    ex_str_check = str(ex)
                    if "410" in ex_str_check:
                        status = 410
                    elif "404" in ex_str_check:
                        status = 404
                if status in (404, 410):
                    _delete_subscription(base_url, hdrs, entity_set, entry["record_id"])
                    removed += 1
                else:
                    failed += 1
            except Exception:
                failed += 1

        result.update({"success": True, "sent": sent, "failed": failed, "removed": removed})
        return result
    except Exception as ex:  # best-effort: nie den Aufrufer blockieren
        result["error"] = str(ex)[:200]
        return result
