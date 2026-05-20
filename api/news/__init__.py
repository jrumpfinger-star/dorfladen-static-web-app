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
        items.append(("DV_DEFAULT_URL", "https://orgab4e2f00.crm16.dynamics.com"))
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
        show_all = req.params.get("all", "").lower() in ("true", "1", "yes")
        status_filter = "" if show_all else "&$filter=(dl_status eq 101001 or dl_status eq null)"
        query = (
            "?$select=dl_newsid,dl_titel,dl_kurztext,dl_inhalt,dl_datum,createdon,dl_status,dl_laufband"
            f"{status_filter}"
            "&$orderby=dl_datum desc"
        )
        logical_names = ["dl_news"]
        fallback_entity_sets = ["dl_news", "dl_newses"]
        r = None

        for env_name, base_url in _env_candidates():
            headers = get_headers(env_name)
            entity_set = _resolve_entity_set(base_url, headers, logical_names, fallback_entity_sets)
            if not entity_set:
                continue

            url = f"{base_url}/api/data/v9.2/{entity_set}{query}"
            candidate = requests.get(url, headers=headers, timeout=30)
            if candidate.status_code == 200:
                if (candidate.json() or {}).get("value"):
                    r = candidate
                    break
                if r is None:
                    r = candidate
            elif candidate.status_code not in (404,):
                if r is None:
                    r = candidate

        if r is None:
            return func.HttpResponse(
                json.dumps({"success": False, "error": "Dataverse request failed"}, ensure_ascii=False),
                status_code=500,
                mimetype="application/json",
                headers=get_cors_headers()
            )

        if r.status_code == 200:
            data = r.json()
            news_list = []
            for item in data.get("value", []):
                news_list.append({
                    "id": item.get("dl_newsid"),
                    "dl_newsid": item.get("dl_newsid"),
                    "titel": item.get("dl_titel", ""),
                    "dl_titel": item.get("dl_titel", ""),
                    "beschreibung": item.get("dl_kurztext", ""),
                    "dl_kurztext": item.get("dl_kurztext", ""),
                    "dl_inhalt": item.get("dl_inhalt", ""),
                    "datum": item.get("dl_datum") or item.get("createdon"),
                    "dl_datum": item.get("dl_datum"),
                    "createdon": item.get("createdon"),
                    "status": item.get("dl_status"),
                    "dl_laufband": item.get("dl_laufband", False)
                })
            return func.HttpResponse(
                json.dumps({"success": True, "data": news_list}, ensure_ascii=False),
                status_code=200,
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
