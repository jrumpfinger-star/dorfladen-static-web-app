"""
Shop Favorites API
GET:  Load favorites for authenticated user
PUT:  Save favorites for authenticated user

Stores favorites as JSON array of article numbers in dl_seiteninhalt
with key: shop_favs_{user_sub}
"""
import azure.functions as func
import json
import os
import logging
import msal
import requests
import jwt as pyjwt


DEFAULT_URL_SETTING = "DV_DEFAULT_URL"
DEFAULT_URL_FALLBACK = "https://orgab4e2f00.crm16.dynamics.com"
JWT_SECRET = os.environ.get("SHOP_JWT_SECRET", "dorfladen-shop-secret-change-in-production-2026")
FAV_KEY_PREFIX = "shop_favs_"
MAX_FAVORITES = 200


def get_token():
    from shared.dataverse import get_tenant_id, get_client_id
    tenant_id = get_tenant_id()
    client_id = get_client_id()
    client_secret = os.environ.get("DV_CLIENT_SECRET", "")
    base_url = os.environ.get(DEFAULT_URL_SETTING, DEFAULT_URL_FALLBACK).rstrip("/")
    authority = f"https://login.microsoftonline.com/{tenant_id}"
    scope = [f"{base_url}/.default"]
    app = msal.ConfidentialClientApplication(client_id, authority=authority, client_credential=client_secret)
    result = app.acquire_token_for_client(scopes=scope)
    return result.get("access_token", "")


def get_cors_headers():
    return {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, PUT, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, X-Shop-Token",
    }


def _verify_jwt(req):
    token = req.headers.get("X-Shop-Token", "")
    if not token:
        return None
    try:
        payload = pyjwt.decode(token, JWT_SECRET, algorithms=["HS256"])
        return payload
    except Exception:
        return None


def _resolve_entity_set(base_url, headers):
    for es in ["dl_seiteninhalts", "dl_seiteninhalt"]:
        r = requests.get(f"{base_url}/api/data/v9.2/{es}?$top=1", headers=headers, timeout=30)
        if r.status_code == 200:
            return es
    return "dl_seiteninhalts"


def main(req: func.HttpRequest) -> func.HttpResponse:
    # CORS preflight
    if req.method == "OPTIONS":
        return func.HttpResponse("", status_code=204, headers=get_cors_headers())

    # Auth
    user = _verify_jwt(req)
    if not user:
        return func.HttpResponse(
            json.dumps({"success": False, "error": "Nicht angemeldet"}),
            status_code=401, mimetype="application/json", headers=get_cors_headers()
        )

    user_sub = user.get("sub", "")
    if not user_sub:
        return func.HttpResponse(
            json.dumps({"success": False, "error": "Ungültiger Token"}),
            status_code=401, mimetype="application/json", headers=get_cors_headers()
        )

    fav_key = f"{FAV_KEY_PREFIX}{user_sub}"

    try:
        access_token = get_token()
        base_url = os.environ.get(DEFAULT_URL_SETTING, DEFAULT_URL_FALLBACK).rstrip("/")
        headers = {
            "Authorization": f"Bearer {access_token}",
            "Content-Type": "application/json",
            "Accept": "application/json",
            "OData-MaxVersion": "4.0",
            "OData-Version": "4.0",
        }
        entity_set = _resolve_entity_set(base_url, headers)

        if req.method == "GET":
            return _handle_get(base_url, headers, entity_set, fav_key)
        elif req.method == "PUT":
            return _handle_put(req, base_url, headers, entity_set, fav_key)
        else:
            return func.HttpResponse(
                json.dumps({"success": False, "error": "Method not allowed"}),
                status_code=405, mimetype="application/json", headers=get_cors_headers()
            )

    except Exception as e:
        logging.error(f"[shop-favorites] Error: {e}")
        return func.HttpResponse(
            json.dumps({"success": False, "error": str(e)}),
            status_code=500, mimetype="application/json", headers=get_cors_headers()
        )


def _handle_get(base_url, headers, entity_set, fav_key):
    url = (
        f"{base_url}/api/data/v9.2/{entity_set}"
        f"?$filter=dl_schluessel eq '{fav_key}'"
        f"&$select=dl_wert"
        f"&$top=1"
    )
    r = requests.get(url, headers=headers, timeout=15)
    favs = []
    if r.status_code == 200:
        items = (r.json() or {}).get("value", [])
        if items:
            try:
                favs = json.loads(items[0].get("dl_wert", "[]"))
            except Exception:
                favs = []

    return func.HttpResponse(
        json.dumps({"success": True, "favorites": favs}),
        status_code=200, mimetype="application/json", headers=get_cors_headers()
    )


def _handle_put(req, base_url, headers, entity_set, fav_key):
    try:
        body = req.get_json()
    except Exception:
        return func.HttpResponse(
            json.dumps({"success": False, "error": "Invalid JSON"}),
            status_code=400, mimetype="application/json", headers=get_cors_headers()
        )

    favs = body.get("favorites", [])
    if not isinstance(favs, list):
        favs = []
    # Limit and deduplicate
    seen = set()
    clean = []
    for f in favs:
        s = str(f).strip()
        if s and s not in seen and len(clean) < MAX_FAVORITES:
            seen.add(s)
            clean.append(s)
    favs = clean

    payload = {
        "dl_schluessel": fav_key,
        "dl_wert": json.dumps(favs, ensure_ascii=False),
    }

    # Check if record exists
    filter_url = (
        f"{base_url}/api/data/v9.2/{entity_set}"
        f"?$filter=dl_schluessel eq '{fav_key}'"
        f"&$select=dl_seiteninhaltid"
        f"&$top=1"
    )
    r = requests.get(filter_url, headers=headers, timeout=15)
    existing = (r.json() or {}).get("value", []) if r.status_code == 200 else []

    if existing:
        rec_id = existing[0].get("dl_seiteninhaltid", "")
        patch_headers = {**headers, "If-Match": "*"}
        r = requests.patch(
            f"{base_url}/api/data/v9.2/{entity_set}({rec_id})",
            headers=patch_headers, json=payload, timeout=15
        )
        if r.status_code not in (200, 204):
            logging.error(f"[shop-favorites] PATCH failed: {r.status_code} {r.text[:500]}")
            return func.HttpResponse(
                json.dumps({"success": False, "error": "Speichern fehlgeschlagen"}),
                status_code=500, mimetype="application/json", headers=get_cors_headers()
            )
    else:
        r = requests.post(
            f"{base_url}/api/data/v9.2/{entity_set}",
            headers=headers, json=payload, timeout=15
        )
        if r.status_code not in (200, 201, 204):
            logging.error(f"[shop-favorites] POST failed: {r.status_code} {r.text[:500]}")
            return func.HttpResponse(
                json.dumps({"success": False, "error": "Speichern fehlgeschlagen"}),
                status_code=500, mimetype="application/json", headers=get_cors_headers()
            )

    return func.HttpResponse(
        json.dumps({"success": True, "favorites": favs, "count": len(favs)}),
        status_code=200, mimetype="application/json", headers=get_cors_headers()
    )
