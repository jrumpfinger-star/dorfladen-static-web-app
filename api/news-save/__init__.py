import azure.functions as func
import json
import os
import msal
import requests
from datetime import datetime


def _env_candidates():
    items = []
    for setting_name in ("DV_DEFAULT_URL", "DV_DEV_URL"):
        url = os.environ.get(setting_name, "").strip()
        if url and not any(x[1] == url for x in items):
            items.append((setting_name, url))
    if not items:
        items.append(("DV_DEFAULT_URL", "https://orgab4e2f00.crm16.dynamics.com"))
    return items


def get_token(url_setting_name="DV_DEFAULT_URL"):
    tenant_id = os.environ.get("DV_TENANT_ID", "acfaedd4-c403-43b7-9544-fdb2b150124e")
    client_id = os.environ.get("DV_CLIENT_ID", "137b2df6-be83-459a-ac89-9efd0bdf51c4")
    client_secret = os.environ.get("DV_CLIENT_SECRET", "")
    target_url = os.environ.get(url_setting_name, "https://orgab4e2f00.crm16.dynamics.com")
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
        probe_url = f"{base_url}/api/data/v9.2/{entity_set}?$select=dl_newsid&$top=1"
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


def main(req: func.HttpRequest) -> func.HttpResponse:
    if req.method == "OPTIONS":
        return func.HttpResponse(status_code=200, headers=get_cors_headers())

    try:
        body = req.get_json()
    except Exception:
        return func.HttpResponse(
            json.dumps({"success": False, "error": "Invalid JSON body"}, ensure_ascii=False),
            status_code=400, mimetype="application/json", headers=get_cors_headers()
        )

    titel = body.get("titel", "").strip()
    kurztext = body.get("kurztext", "")
    inhalt = body.get("inhalt", "")
    status = body.get("status", 101001)
    laufband = body.get("dl_laufband", False)
    record_id = body.get("id")

    if not titel:
        return func.HttpResponse(
            json.dumps({"success": False, "error": "titel is required"}, ensure_ascii=False),
            status_code=400, mimetype="application/json", headers=get_cors_headers()
        )

    logical_names = ["dl_news"]
    fallback_entity_sets = ["dl_news", "dl_newses"]

    for env_name, base_url in _env_candidates():
        headers = get_headers(env_name)
        entity_set = _resolve_entity_set(base_url, headers, logical_names, fallback_entity_sets)
        if not entity_set:
            continue

        payload = {
            "dl_titel": titel,
            "dl_kurztext": kurztext,
            "dl_inhalt": inhalt,
            "dl_status": status,
            "dl_laufband": laufband,
        }

        if record_id:
            # Update existing record
            patch_url = f"{base_url}/api/data/v9.2/{entity_set}({record_id})"
            patch_headers = {**headers, "If-Match": "*"}
            r = requests.patch(patch_url, headers=patch_headers, json=payload, timeout=30)
            if r.status_code in (200, 204):
                return func.HttpResponse(
                    json.dumps({"success": True, "action": "updated", "id": record_id}, ensure_ascii=False),
                    status_code=200, mimetype="application/json", headers=get_cors_headers()
                )
            return func.HttpResponse(
                json.dumps({"success": False, "error": f"PATCH failed: {r.status_code} {r.text[:300]}"}, ensure_ascii=False),
                status_code=r.status_code, mimetype="application/json", headers=get_cors_headers()
            )
        else:
            # Create new record — also set datum to now
            payload["dl_datum"] = datetime.utcnow().strftime("%Y-%m-%dT%H:%M:%SZ")
            create_url = f"{base_url}/api/data/v9.2/{entity_set}"
            create_headers = {**headers, "Prefer": "return=representation"}
            r = requests.post(create_url, headers=create_headers, json=payload, timeout=30)
            if r.status_code in (200, 201, 204):
                new_id = ""
                # Try response body first
                if r.status_code != 204:
                    try:
                        new_id = (r.json() or {}).get("dl_newsid", "")
                    except Exception:
                        pass
                # Fallback: extract from OData-EntityId header
                if not new_id:
                    eid = r.headers.get("OData-EntityId", "")
                    if "(" in eid and ")" in eid:
                        new_id = eid.split("(")[-1].rstrip(")")
                return func.HttpResponse(
                    json.dumps({"success": True, "action": "created", "id": new_id}, ensure_ascii=False),
                    status_code=200, mimetype="application/json", headers=get_cors_headers()
                )
            return func.HttpResponse(
                json.dumps({"success": False, "error": f"POST failed: {r.status_code} {r.text[:300]}"}, ensure_ascii=False),
                status_code=r.status_code, mimetype="application/json", headers=get_cors_headers()
            )

    return func.HttpResponse(
        json.dumps({"success": False, "error": "No Dataverse environment found"}, ensure_ascii=False),
        status_code=500, mimetype="application/json", headers=get_cors_headers()
    )
