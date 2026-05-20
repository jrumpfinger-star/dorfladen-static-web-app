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
        probe_url = f"{base_url}/api/data/v9.2/{entity_set}?$select={logical_names[0]}id&$top=1"
        r = requests.get(probe_url, headers=headers, timeout=30)
        if r.status_code == 200:
            return entity_set
    return None


def _pick_env_and_entity_set():
    logical_names = ["dl_angebot", "dl_angebote"]
    fallback_entity_sets = ["dl_angebotes", "dl_angebots", "dl_angebot"]
    for env_name, base_url in _env_candidates():
        headers = get_headers(env_name)
        entity_set = _resolve_entity_set(base_url, headers, logical_names, fallback_entity_sets)
        if entity_set:
            return env_name, base_url, headers, entity_set
    return None, None, None, None


def _build_offer_payload(body):
    payload = {
        "dl_produkt": body.get("dl_produkt") or body.get("name") or body.get("produkt") or "",
        "dl_details": body.get("dl_details") if body.get("dl_details") is not None else body.get("details"),
        "dl_preis": body.get("dl_preis") if body.get("dl_preis") is not None else body.get("price") or body.get("preis"),
        "dl_statt_preis": body.get("dl_statt_preis") if body.get("dl_statt_preis") is not None else body.get("old_price") or body.get("statt_preis"),
        "dl_aktion_titel": body.get("dl_aktion_titel") or body.get("aktion_titel"),
        "dl_aktion_id": body.get("dl_aktion_id") or body.get("aktion_id"),
        "dl_artikelnummer": body.get("dl_artikelnummer") or body.get("artikelnummer"),
        "dl_gueltig_von": body.get("dl_gueltig_von") or body.get("valid_from") or body.get("gueltig_von"),
        "dl_gueltig_bis": body.get("dl_gueltig_bis") or body.get("valid_to") or body.get("gueltig_bis"),
        "dl_bild_base64": body.get("dl_bild_base64") or body.get("bild_data") or body.get("dl_bild_base64"),
        "dl_sortierung": body.get("dl_sortierung") if body.get("dl_sortierung") is not None else body.get("sortierung"),
        "dl_status": body.get("dl_status") if body.get("dl_status") is not None else body.get("status")
    }

    if payload.get("dl_status") is None:
        payload["dl_status"] = 101001

    clean = {}
    for key, value in payload.items():
        if value is not None and value != "":
            clean[key] = value
    return clean

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
        method = req.method.upper()
        offer_id = req.route_params.get("id")

        if method == "GET":
            query = "?$filter=dl_status eq 101001&$orderby=dl_aktion_id desc,dl_sortierung asc,dl_produkt asc"
            logical_names = ["dl_angebot", "dl_angebote"]
            fallback_entity_sets = ["dl_angebotes", "dl_angebots", "dl_angebot"]
            r = None

            for env_name, base_url in _env_candidates():
                headers = get_headers(env_name)
                entity_set = _resolve_entity_set(base_url, headers, logical_names, fallback_entity_sets)
                if not entity_set:
                    continue

                url = f"{base_url}/api/data/v9.2/{entity_set}{query}"
                candidate = requests.get(url, headers=headers, timeout=30)
                if candidate.status_code == 200:
                    # Bevorzuge eine Umgebung mit echten Datensätzen
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
                angebote_list = []
                for item in data.get("value", []):
                    angebote_list.append({
                        "id": item.get("dl_angeboteid"),
                        "dl_angeboteid": item.get("dl_angeboteid"),
                        "name": item.get("dl_produkt", ""),
                        "produkt": item.get("dl_produkt", ""),
                        "dl_produkt": item.get("dl_produkt", ""),
                        "details": item.get("dl_details", "") or item.get("dl_beschreibung", ""),
                        "dl_details": item.get("dl_details", "") or item.get("dl_beschreibung", ""),
                        "price": item.get("dl_preis", 0),
                        "preis": item.get("dl_preis", 0),
                        "dl_preis": item.get("dl_preis", 0),
                        "old_price": item.get("dl_statt_preis", 0),
                        "statt_preis": item.get("dl_statt_preis", 0),
                        "dl_statt_preis": item.get("dl_statt_preis", 0),
                        "aktion_titel": item.get("dl_aktion_titel", ""),
                        "dl_aktion_titel": item.get("dl_aktion_titel", ""),
                        "aktion_id": item.get("dl_aktion_id", ""),
                        "dl_aktion_id": item.get("dl_aktion_id", ""),
                        "artikelnummer": item.get("dl_artikelnummer", ""),
                        "dl_artikelnummer": item.get("dl_artikelnummer", ""),
                        "valid_from": item.get("dl_gueltig_von"),
                        "gueltig_von": item.get("dl_gueltig_von"),
                        "dl_gueltig_von": item.get("dl_gueltig_von"),
                        "valid_to": item.get("dl_gueltig_bis"),
                        "gueltig_bis": item.get("dl_gueltig_bis"),
                        "dl_gueltig_bis": item.get("dl_gueltig_bis"),
                        "sortierung": item.get("dl_sortierung", 0),
                        "dl_sortierung": item.get("dl_sortierung", 0),
                        "status": item.get("dl_status"),
                        "dl_status": item.get("dl_status"),
                        "bild_data": item.get("dl_bild_base64", "") or item.get("dl_bild_url", ""),
                        "dl_bild_base64": item.get("dl_bild_base64", "") or item.get("dl_bild_url", "")
                    })
                # Optional date filter: ?filter=today returns only currently valid offers
                filter_param = req.params.get("filter", "").lower()
                if filter_param == "today":
                    from datetime import datetime, timedelta, timezone
                    cet = timezone(timedelta(hours=2))
                    today = datetime.now(cet).strftime("%Y-%m-%d")
                    filtered = []
                    for a in angebote_list:
                        von = (a.get("dl_gueltig_von") or "")[:10]
                        bis = (a.get("dl_gueltig_bis") or "")[:10]
                        if von and von > today:
                            continue  # not yet valid
                        if bis and bis < today:
                            continue  # expired
                        filtered.append(a)
                    angebote_list = filtered

                return func.HttpResponse(
                    json.dumps({"success": True, "data": angebote_list}, ensure_ascii=False),
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

        if method == "POST":
            body = req.get_json()
            payload = _build_offer_payload(body)

            env_name, base_url, headers, entity_set = _pick_env_and_entity_set()
            if not entity_set:
                return func.HttpResponse(
                    json.dumps({"success": False, "error": "Dataverse entity set not found"}, ensure_ascii=False),
                    status_code=500,
                    mimetype="application/json",
                    headers=get_cors_headers()
                )

            r = requests.post(
                f"{base_url}/api/data/v9.2/{entity_set}",
                headers=headers,
                json=payload,
                timeout=30
            )
            if r.status_code in (200, 201, 204):
                return func.HttpResponse(
                    json.dumps({"success": True}, ensure_ascii=False),
                    status_code=200,
                    mimetype="application/json",
                    headers=get_cors_headers()
                )

            return func.HttpResponse(
                json.dumps({"success": False, "error": f"Dataverse error: {r.status_code}", "details": r.text}, ensure_ascii=False),
                status_code=r.status_code,
                mimetype="application/json",
                headers=get_cors_headers()
            )

        if method == "PATCH":
            if not offer_id:
                return func.HttpResponse(
                    json.dumps({"success": False, "error": "Missing offer id"}, ensure_ascii=False),
                    status_code=400,
                    mimetype="application/json",
                    headers=get_cors_headers()
                )

            body = req.get_json()
            payload = _build_offer_payload(body)

            logical_names = ["dl_angebot", "dl_angebote"]
            fallback_entity_sets = ["dl_angebotes", "dl_angebots", "dl_angebot"]
            last_response = None
            for env_name, base_url in _env_candidates():
                headers = get_headers(env_name)
                entity_set = _resolve_entity_set(base_url, headers, logical_names, fallback_entity_sets)
                if not entity_set:
                    continue
                r = requests.patch(
                    f"{base_url}/api/data/v9.2/{entity_set}({offer_id})",
                    headers=headers,
                    json=payload,
                    timeout=30
                )
                last_response = r
                if r.status_code in (200, 204):
                    return func.HttpResponse(
                        json.dumps({"success": True}, ensure_ascii=False),
                        status_code=200,
                        mimetype="application/json",
                        headers=get_cors_headers()
                    )
                if r.status_code not in (404,):
                    break

            code = last_response.status_code if last_response is not None else 500
            txt = last_response.text if last_response is not None else "Dataverse request failed"
            return func.HttpResponse(
                json.dumps({"success": False, "error": f"Dataverse error: {code}", "details": txt}, ensure_ascii=False),
                status_code=code,
                mimetype="application/json",
                headers=get_cors_headers()
            )

        if method == "DELETE":
            if not offer_id:
                return func.HttpResponse(
                    json.dumps({"success": False, "error": "Missing offer id"}, ensure_ascii=False),
                    status_code=400,
                    mimetype="application/json",
                    headers=get_cors_headers()
                )

            logical_names = ["dl_angebot", "dl_angebote"]
            fallback_entity_sets = ["dl_angebotes", "dl_angebots", "dl_angebot"]
            last_response = None
            for env_name, base_url in _env_candidates():
                headers = get_headers(env_name)
                entity_set = _resolve_entity_set(base_url, headers, logical_names, fallback_entity_sets)
                if not entity_set:
                    continue
                r = requests.delete(
                    f"{base_url}/api/data/v9.2/{entity_set}({offer_id})",
                    headers=headers,
                    timeout=30
                )
                last_response = r
                if r.status_code in (200, 204):
                    return func.HttpResponse(
                        json.dumps({"success": True}, ensure_ascii=False),
                        status_code=200,
                        mimetype="application/json",
                        headers=get_cors_headers()
                    )
                if r.status_code not in (404,):
                    break

            code = last_response.status_code if last_response is not None else 500
            txt = last_response.text if last_response is not None else "Dataverse request failed"
            return func.HttpResponse(
                json.dumps({"success": False, "error": f"Dataverse error: {code}", "details": txt}, ensure_ascii=False),
                status_code=code,
                mimetype="application/json",
                headers=get_cors_headers()
            )

        return func.HttpResponse(
            json.dumps({"success": False, "error": f"Unsupported method: {method}"}, ensure_ascii=False),
            status_code=405,
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
