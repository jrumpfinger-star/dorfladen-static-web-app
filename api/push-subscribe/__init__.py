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


def _load_sub_value(base_url, hdrs, entity_set, sub_key):
    """Liest den gespeicherten JSON-Wert eines Abos anhand seines Schluessels.
    Gibt ``{}`` zurueck, wenn es keinen (gueltigen) Datensatz gibt."""
    try:
        url = (
            f"{base_url}/api/data/v9.2/{entity_set}"
            f"?$filter=dl_schluessel eq '{sub_key}'"
            f"&$select=dl_seiteninhaltid,dl_wert"
        )
        r = requests.get(url, headers=hdrs, timeout=30)
        if r.status_code != 200:
            return {}
        items = (r.json() or {}).get("value", [])
        if not items:
            return {}
        val = json.loads(items[0].get("dl_wert", "{}") or "{}")
        return val if isinstance(val, dict) else {}
    except Exception:
        return {}


def _dedupe_by_device(base_url, hdrs, entity_set, device_id, keep_sub_key):
    """Entfernt veraltete Subscriptions DESSELBEN Geraets.

    Beim erneuten Abonnieren (Endpoint-Refresh, Service-Worker-Neuregistrierung,
    "Push erneuern") vergibt der Push-Dienst einen NEUEN Endpoint -> neuer
    Datensatz, waehrend der alte in Dataverse bestehen bleibt und weiter pusht
    (= doppelte Benachrichtigung). Anhand der stabilen, im Browser gespeicherten
    ``device_id`` werden alle anderen Eintraege dieses Geraets entfernt, sodass
    pro Geraet genau eine aktive Subscription verbleibt.
    """
    if not device_id:
        return 0
    removed = 0
    try:
        url = (
            f"{base_url}/api/data/v9.2/{entity_set}"
            f"?$filter=startswith(dl_schluessel,'{PUSH_KEY_PREFIX}')"
            f"&$select=dl_seiteninhaltid,dl_schluessel,dl_wert&$top=5000"
        )
        while url:
            r = requests.get(url, headers=hdrs, timeout=30)
            if r.status_code != 200:
                break
            data = r.json()
            for item in data.get("value", []):
                if item.get("dl_schluessel") == keep_sub_key:
                    continue
                try:
                    raw = json.loads(item.get("dl_wert", "{}"))
                except (ValueError, TypeError):
                    continue
                if raw.get("device_id") and raw["device_id"] == device_id:
                    rec_id = item.get("dl_seiteninhaltid", "")
                    if rec_id:
                        try:
                            requests.delete(
                                f"{base_url}/api/data/v9.2/{entity_set}({rec_id})",
                                headers=hdrs, timeout=30,
                            )
                            removed += 1
                        except Exception:
                            pass
            url = data.get("@odata.nextLink")
    except Exception:
        pass
    return removed


ALL_CATEGORIES = ["tagesinfo", "news", "bestellung", "kontakt"]
# Migrate legacy category names from existing subscribers
LEGACY_MAP = {"mittagstisch": "tagesinfo", "angebote": "tagesinfo"}


def _migrate_cats(cats):
    """Map old category names to new ones and deduplicate."""
    migrated = []
    for c in cats:
        mapped = LEGACY_MAP.get(c, c)
        if mapped not in migrated:
            migrated.append(mapped)
    return migrated


def _apply_previous(prev, categories, categories_explicit, merge, email, device_id, renewed):
    """Verrechnet einen bestehenden bzw. bei einer Abo-Erneuerung uebernommenen
    Datensatz (``prev``) mit den neu gemeldeten Angaben.

    Gibt ``(categories, email, device_id)`` zurueck.
    """
    final_categories = list(categories)
    if prev:
        prev_cats = _migrate_cats(prev.get("categories", []))
        if merge:
            merged = list(prev_cats)
            for c in categories:
                if c not in merged:
                    merged.append(c)
            final_categories = merged
        elif renewed and not categories_explicit and prev_cats:
            # Erneuerung ohne Kategorie-Angabe: bisherige Auswahl beibehalten.
            final_categories = prev_cats
        # Bestehende E-Mail/Geraete-ID erhalten, wenn jetzt keine mitgeschickt wird.
        if not email and prev.get("email"):
            email = prev.get("email")
        if not device_id and prev.get("device_id"):
            device_id = prev.get("device_id")
    return final_categories, email, device_id


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
            cats = _migrate_cats(data.get("categories", ALL_CATEGORIES[:]))
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
    # Nur eine tatsaechlich mitgeschickte Liste gilt als Angabe – eine leere
    # Liste bedeutet "alle Kategorien abgewaehlt" und darf nicht auf den
    # Standard zurueckfallen.
    categories_explicit = isinstance(body.get("categories"), list)
    categories = body["categories"] if categories_explicit else ALL_CATEGORIES[:]
    email = body.get("email", "")
    device_id = (body.get("device_id", "") or "").strip()[:64]
    # Bei einer Abo-Erneuerung (Service-Worker 'pushsubscriptionchange') aendert
    # sich der Endpoint und damit der Schluessel. Der alte Endpoint erlaubt es,
    # E-Mail, Geraete-ID und Kategorien zu uebernehmen.
    old_endpoint = (body.get("old_endpoint", "") or "").strip()
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

    # POST – save subscription with categories and optional email
    # merge=True: neue Kategorien zu den bestehenden HINZUFUEGEN (z.B. Bestellformular
    # fuegt 'bestellung' hinzu, ohne 'tagesinfo'/'news' zu verlieren). Ohne merge
    # werden die Kategorien exakt gesetzt (Benachrichtigungs-Menue).
    merge = bool(body.get("merge", False))

    filter_url = (
        f"{base_url}/api/data/v9.2/{entity_set}"
        f"?$filter=dl_schluessel eq '{sub_key}'"
        f"&$select=dl_seiteninhaltid,dl_wert"
    )
    r = requests.get(filter_url, headers=hdrs, timeout=30)
    existing = (r.json() or {}).get("value", []) if r.status_code == 200 else []

    prev = {}
    renewed = False
    if existing:
        try:
            prev = json.loads(existing[0].get("dl_wert", "{}") or "{}")
        except Exception:
            prev = {}
        if not isinstance(prev, dict):
            prev = {}
    elif old_endpoint and old_endpoint != endpoint:
        # Abo-Erneuerung: Datensatz zum alten Endpoint als Vorlage heranziehen,
        # sonst verliert das Geraet seine Zuordnung und 1:1-Pushes
        # (Bestell-/Kontakt-Chat) kaemen nie wieder an.
        prev = _load_sub_value(base_url, hdrs, entity_set, PUSH_KEY_PREFIX + _sub_hash(old_endpoint))
        renewed = bool(prev)

    final_categories, email, device_id = _apply_previous(
        prev, categories, categories_explicit, merge, email, device_id, renewed
    )

    sub_data = {
        "subscription": subscription,
        "categories": final_categories
    }
    if email:
        sub_data["email"] = email.lower().strip()
    if device_id:
        sub_data["device_id"] = device_id
    sub_json = json.dumps(sub_data, ensure_ascii=False)

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
        # Veraltete Subscriptions desselben Geraets entfernen (Doppel-Push-Fix).
        deduped = _dedupe_by_device(base_url, hdrs, entity_set, device_id, sub_key)
        return func.HttpResponse(
            json.dumps({"success": True, "action": action, "categories": categories, "deduped": deduped}),
            status_code=200, mimetype="application/json", headers=get_cors_headers()
        )

    return func.HttpResponse(
        json.dumps({"success": False, "error": f"Dataverse {r.status_code}: {r.text[:200]}"}),
        status_code=500, mimetype="application/json", headers=get_cors_headers()
    )
