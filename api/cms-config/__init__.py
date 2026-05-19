import azure.functions as func
import json
import os
import msal
import requests


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
        return "FEHLER_SECRET_FEHLT"
    try:
        a = msal.ConfidentialClientApplication(
            client_id,
            authority=f"https://login.microsoftonline.com/{tenant_id}",
            client_credential=client_secret,
        )
        r = a.acquire_token_for_client(scopes=[f"{target_url}/.default"])
        return r.get("access_token")
    except Exception as e:
        return f"FEHLER: {str(e)}"

def get_headers(url_setting_name="DV_DEFAULT_URL"):
    token = get_token(url_setting_name)
    return {
        "Authorization": f"Bearer {token}",
        "OData-MaxVersion": "4.0",
        "OData-Version": "4.0",
        "Accept": "application/json",
        "Content-Type": "application/json; charset=utf-8"
    }


def _resolve_entity_set(base_url, headers, logical_names, fallback_entity_sets):
    for logical_name in logical_names:
        meta_url = f"{base_url}/api/data/v9.2/EntityDefinitions(LogicalName='{logical_name}')?$select=EntitySetName"
        r = requests.get(meta_url, headers=headers, timeout=30)
        if r.status_code == 200:
            entity_set = (r.json() or {}).get("EntitySetName")
            if entity_set:
                return entity_set
        elif r.status_code not in (404,):
            break

    for entity_set in fallback_entity_sets:
        probe_url = f"{base_url}/api/data/v9.2/{entity_set}?$select=dl_name&$top=1"
        r = requests.get(probe_url, headers=headers, timeout=30)
        if r.status_code == 200:
            return entity_set
    return None

def get_cors_headers():
    return {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, POST, OPTIONS, DELETE",
        "Access-Control-Allow-Headers": "*",
        "Access-Control-Max-Age": "86400",
        "Content-Type": "application/json; charset=utf-8"
    }

def parse_config_value(value):
    if not isinstance(value, str):
        return value
    stripped = value.strip()
    if not stripped:
        return ""
    if stripped.startswith("{") or stripped.startswith("["):
        try:
            return json.loads(stripped)
        except json.JSONDecodeError:
            return value
    return value

def _find_env_and_entity_set():
    """Find working environment and entity set, return (env_name, base_url, headers, entity_set) or None."""
    logical_names = ["dl_seiteninhalt"]
    fallback_entity_sets = ["dl_seiteninhalts", "dl_seiteninhalt"]
    for env_name, base_url in _env_candidates():
        headers = get_headers(env_name)
        entity_set = _resolve_entity_set(base_url, headers, logical_names, fallback_entity_sets)
        if entity_set:
            return env_name, base_url, headers, entity_set
    return None


def _handle_post(req):
    """Save a config entry: {name, wert} → upsert in dl_seiteninhalt."""
    body = req.get_json()
    name = body.get("name", "").strip()
    wert = body.get("wert", "")
    if not name:
        return func.HttpResponse(
            json.dumps({"success": False, "error": "name is required"}, ensure_ascii=False),
            status_code=400, mimetype="application/json", headers=get_cors_headers()
        )
    wert_str = json.dumps(wert, ensure_ascii=False) if isinstance(wert, (dict, list)) else str(wert)

    env = _find_env_and_entity_set()
    if not env:
        return func.HttpResponse(
            json.dumps({"success": False, "error": "No Dataverse environment found"}, ensure_ascii=False),
            status_code=500, mimetype="application/json", headers=get_cors_headers()
        )
    env_name, base_url, headers, entity_set = env

    # Check if entry with this key already exists
    filter_url = f"{base_url}/api/data/v9.2/{entity_set}?$filter=dl_schluessel eq '{name}'&$select=dl_seiteninhaltid,dl_schluessel"
    existing = requests.get(filter_url, headers=headers, timeout=30)
    existing_items = (existing.json() or {}).get("value", []) if existing.status_code == 200 else []

    payload = {"dl_schluessel": name, "dl_bezeichnung": name, "dl_wert": wert_str}

    if existing_items:
        # Update existing record
        rec_id = existing_items[0].get("dl_seiteninhaltid", "")
        patch_url = f"{base_url}/api/data/v9.2/{entity_set}({rec_id})"
        patch_headers = {**headers, "If-Match": "*"}
        r = requests.patch(patch_url, headers=patch_headers, json=payload, timeout=30)
        if r.status_code in (200, 204):
            return func.HttpResponse(
                json.dumps({"success": True, "action": "updated", "id": rec_id}, ensure_ascii=False),
                status_code=200, mimetype="application/json", headers=get_cors_headers()
            )
        return func.HttpResponse(
            json.dumps({"success": False, "error": f"PATCH failed: {r.status_code} {r.text[:200]}"}, ensure_ascii=False),
            status_code=r.status_code, mimetype="application/json", headers=get_cors_headers()
        )
    else:
        # Create new record
        create_url = f"{base_url}/api/data/v9.2/{entity_set}"
        r = requests.post(create_url, headers=headers, json=payload, timeout=30)
        if r.status_code in (200, 201, 204):
            new_id = (r.json() or {}).get("dl_seiteninhaltid", "") if r.status_code != 204 else ""
            return func.HttpResponse(
                json.dumps({"success": True, "action": "created", "id": new_id}, ensure_ascii=False),
                status_code=200, mimetype="application/json", headers=get_cors_headers()
            )
        return func.HttpResponse(
            json.dumps({"success": False, "error": f"POST failed: {r.status_code} {r.text[:200]}"}, ensure_ascii=False),
            status_code=r.status_code, mimetype="application/json", headers=get_cors_headers()
        )


def main(req: func.HttpRequest) -> func.HttpResponse:
    if req.method == "OPTIONS":
        return func.HttpResponse(status_code=200, headers=get_cors_headers())
    try:
        if req.method == "POST":
            return _handle_post(req)

        # GET
        r = None
        env = _find_env_and_entity_set()
        if env:
            env_name, base_url, headers, entity_set = env
            url = f"{base_url}/api/data/v9.2/{entity_set}"
            r = requests.get(url, headers=headers, timeout=30)

        # Debug mode: return raw Dataverse response
        if req.params.get("debug", "").lower() in ("true", "1"):
            raw = r.json() if r and r.status_code == 200 else None
            env_info = {"env": env_name, "entity_set": entity_set, "url": url} if env else {"env": None}
            return func.HttpResponse(
                json.dumps({"env_info": env_info, "status": r.status_code if r else None, "raw_count": len((raw or {}).get("value", [])), "raw_sample": (raw or {}).get("value", [])[:3]}, ensure_ascii=False, default=str),
                status_code=200, mimetype="application/json", headers=get_cors_headers()
            )

        if r is not None and r.status_code == 200:
            data = r.json()
            full = req.params.get("full", "").lower() in ("true", "1", "yes")

            def _item_name(item):
                """Get the display/key name from whichever field exists."""
                return item.get("dl_bezeichnung") or item.get("dl_name") or item.get("dl_schluessel") or ""

            def _item_key(item):
                """Get the unique key (slug) from whichever field exists."""
                return item.get("dl_schluessel") or item.get("dl_name") or ""

            if full:
                items = []
                for item in data.get("value", []):
                    name = _item_name(item)
                    if not name:
                        continue
                    items.append({
                        "id": item.get("dl_seiteninhaltid", ""),
                        "name": name,
                        "key": _item_key(item),
                        "seite": item.get("dl_seite", ""),
                        "wert": parse_config_value(item.get("dl_wert", ""))
                    })
                return func.HttpResponse(
                    json.dumps({"success": True, "data": items}, ensure_ascii=False),
                    status_code=200,
                    mimetype="application/json",
                    headers=get_cors_headers()
                )
            else:
                config = {}
                for item in data.get("value", []):
                    key = _item_key(item)
                    if key:
                        config[key] = parse_config_value(item.get("dl_wert", ""))
                return func.HttpResponse(
                    json.dumps({"success": True, "data": config}, ensure_ascii=False),
                    status_code=200,
                    mimetype="application/json",
                    headers=get_cors_headers()
                )

        if r is None:
            return func.HttpResponse(
                json.dumps({"success": False, "error": "Dataverse request failed"}, ensure_ascii=False),
                status_code=500,
                mimetype="application/json",
                headers=get_cors_headers()
            )

        return func.HttpResponse(
            json.dumps({"success": False, "error": f"Dataverse error: {r.status_code}"}, ensure_ascii=False),
            status_code=r.status_code,
            mimetype="application/json",
            headers=get_cors_headers()
        )
    except Exception as e:
        return func.HttpResponse(
            json.dumps({"success": False, "error": str(e)}, ensure_ascii=False),
            status_code=500,
            mimetype="application/json",
            headers=get_cors_headers()
        )
