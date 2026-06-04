import azure.functions as func
import json
import os
import msal
import requests
from datetime import datetime, timedelta


DEFAULT_URL_SETTING = "DV_DEFAULT_URL"
DEFAULT_URL_FALLBACK = "https://orgab4e2f00.crm16.dynamics.com"
ENTITY_SET = "dl_shopbestellungs"

STATUS_LABELS = {
    0: "Neu",
    1: "In Bearbeitung",
    2: "Abholbereit",
    3: "Abgeholt",
    4: "Storniert",
}


def get_token():
    tenant_id = os.environ.get("DV_TENANT_ID", "acfaedd4-c403-43b7-9544-fdb2b150124e")
    client_id = os.environ.get("DV_CLIENT_ID", "137b2df6-be83-459a-ac89-9efd0bdf51c4")
    client_secret = os.environ.get("DV_CLIENT_SECRET", "")
    target_url = os.environ.get(DEFAULT_URL_SETTING, DEFAULT_URL_FALLBACK)
    if not client_secret:
        return None
    try:
        app = msal.ConfidentialClientApplication(
            client_id,
            authority=f"https://login.microsoftonline.com/{tenant_id}",
            client_credential=client_secret,
        )
        result = app.acquire_token_for_client(scopes=[f"{target_url}/.default"])
        return result.get("access_token")
    except Exception:
        return None


def get_cors_headers():
    return {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, PATCH, OPTIONS",
        "Access-Control-Allow-Headers": "*",
        "Content-Type": "application/json; charset=utf-8",
    }


def _base_url():
    return os.environ.get(DEFAULT_URL_SETTING, DEFAULT_URL_FALLBACK)


def _headers(token):
    return {
        "Authorization": f"Bearer {token}",
        "OData-MaxVersion": "4.0",
        "OData-Version": "4.0",
        "Accept": "application/json",
        "Content-Type": "application/json; charset=utf-8",
    }


def _safe_json(value, default):
    try:
        if not value:
            return default
        return json.loads(value)
    except Exception:
        return default


def _order_from_dv(item, include_pack=True):
    positionen = _safe_json(item.get("dl_positionen_json"), [])
    pack_data = _safe_json(item.get("dl_pack_json"), {}) if include_pack else {}
    status = item.get("dl_status", 0)
    return {
        "id": item.get("dl_shopbestellungid", ""),
        "bestellnummer": item.get("dl_bestellnummer", ""),
        "kunde_email": item.get("dl_kunde_email", ""),
        "kunde_name": item.get("dl_kunde_name", ""),
        "bestelldatum": item.get("dl_bestelldatum", ""),
        "abholdatum": item.get("dl_abholdatum", ""),
        "status": status,
        "status_text": STATUS_LABELS.get(status, "Unbekannt"),
        "gesamtsumme": item.get("dl_gesamtsumme", 0),
        "anmerkungen": item.get("dl_anmerkungen", ""),
        "positionen": positionen,
        "pack_data": pack_data,
        "positionen_count": len(positionen) if isinstance(positionen, list) else 0,
    }


def _select_fields():
    return "dl_shopbestellungid,dl_bestellnummer,dl_kunde_email,dl_kunde_name,dl_bestelldatum,dl_abholdatum,dl_status,dl_gesamtsumme,dl_anmerkungen,dl_positionen_json,dl_pack_json,createdon"


def _list_orders(req, base_url, headers):
    status = req.params.get("status")
    query = (req.params.get("q") or "").strip().replace("'", "''")
    limit = req.params.get("limit", "200")
    try:
        limit_int = max(1, min(int(limit), 500))
    except Exception:
        limit_int = 200

    filters = []
    if status not in (None, "", "all"):
        try:
            filters.append(f"dl_status eq {int(status)}")
        except Exception:
            pass
    if query:
        filters.append(
            "(contains(dl_bestellnummer,'{0}') or contains(dl_kunde_name,'{0}') or contains(dl_kunde_email,'{0}'))".format(query)
        )
    filter_part = ("&$filter=" + " and ".join(filters)) if filters else ""
    url = f"{base_url}/api/data/v9.2/{ENTITY_SET}?$select={_select_fields()}{filter_part}&$orderby=createdon desc&$top={limit_int}"
    r = requests.get(url, headers=headers, timeout=60)
    if r.status_code != 200:
        return func.HttpResponse(
            json.dumps({"success": False, "error": f"Dataverse {r.status_code}", "detail": r.text[:800]}, ensure_ascii=False),
            status_code=r.status_code,
            headers=get_cors_headers(),
        )
    orders = [_order_from_dv(item) for item in r.json().get("value", [])]
    summary = {"count": len(orders), "summe": round(sum(float(o.get("gesamtsumme") or 0) for o in orders), 2), "status": {}}
    for order in orders:
        key = str(order.get("status", 0))
        summary["status"][key] = summary["status"].get(key, 0) + 1
    return func.HttpResponse(
        json.dumps({"success": True, "orders": orders, "summary": summary, "status_labels": STATUS_LABELS}, ensure_ascii=False),
        status_code=200,
        headers=get_cors_headers(),
    )


def _get_order(req, base_url, headers):
    order_id = (req.params.get("id") or "").strip()
    if not order_id:
        return func.HttpResponse(
            json.dumps({"success": False, "error": "id erforderlich"}, ensure_ascii=False),
            status_code=400,
            headers=get_cors_headers(),
        )
    url = f"{base_url}/api/data/v9.2/{ENTITY_SET}({order_id})?$select={_select_fields()}"
    r = requests.get(url, headers=headers, timeout=30)
    if r.status_code != 200:
        return func.HttpResponse(
            json.dumps({"success": False, "error": f"Dataverse {r.status_code}", "detail": r.text[:800]}, ensure_ascii=False),
            status_code=r.status_code,
            headers=get_cors_headers(),
        )
    return func.HttpResponse(
        json.dumps({"success": True, "order": _order_from_dv(r.json())}, ensure_ascii=False),
        status_code=200,
        headers=get_cors_headers(),
    )


def _dashboard(req, base_url, headers):
    today = datetime.utcnow().date().isoformat()
    future = (datetime.utcnow().date() + timedelta(days=14)).isoformat()
    url = f"{base_url}/api/data/v9.2/{ENTITY_SET}?$select={_select_fields()}&$filter=dl_abholdatum ge '{today}' and dl_abholdatum le '{future}'&$orderby=dl_abholdatum asc,createdon desc&$top=300"
    r = requests.get(url, headers=headers, timeout=60)
    if r.status_code != 200:
        return func.HttpResponse(
            json.dumps({"success": False, "error": f"Dataverse {r.status_code}", "detail": r.text[:800]}, ensure_ascii=False),
            status_code=r.status_code,
            headers=get_cors_headers(),
        )
    orders = [_order_from_dv(item) for item in r.json().get("value", [])]
    by_date = {}
    open_count = 0
    ready_count = 0
    revenue = 0
    for order in orders:
        date_key = order.get("abholdatum") or "ohne Datum"
        by_date.setdefault(date_key, {"count": 0, "summe": 0, "status": {}})
        by_date[date_key]["count"] += 1
        by_date[date_key]["summe"] = round(by_date[date_key]["summe"] + float(order.get("gesamtsumme") or 0), 2)
        status_key = str(order.get("status", 0))
        by_date[date_key]["status"][status_key] = by_date[date_key]["status"].get(status_key, 0) + 1
        revenue += float(order.get("gesamtsumme") or 0)
        if order.get("status") in (0, 1):
            open_count += 1
        if order.get("status") == 2:
            ready_count += 1
    return func.HttpResponse(
        json.dumps({
            "success": True,
            "orders": orders,
            "summary": {
                "count": len(orders),
                "open": open_count,
                "ready": ready_count,
                "summe": round(revenue, 2),
                "by_date": by_date,
            },
            "status_labels": STATUS_LABELS,
        }, ensure_ascii=False),
        status_code=200,
        headers=get_cors_headers(),
    )


def _patch_order(req, base_url, headers):
    try:
        body = req.get_json()
    except Exception:
        body = {}
    order_id = (body.get("id") or "").strip()
    if not order_id:
        return func.HttpResponse(
            json.dumps({"success": False, "error": "id erforderlich"}, ensure_ascii=False),
            status_code=400,
            headers=get_cors_headers(),
        )
    patch_payload = {}
    if "status" in body:
        patch_payload["dl_status"] = int(body.get("status"))
    if "pack_json" in body:
        pack_json = body.get("pack_json")
        patch_payload["dl_pack_json"] = json.dumps(pack_json, ensure_ascii=False) if isinstance(pack_json, (dict, list)) else str(pack_json)
    if "anmerkungen" in body:
        patch_payload["dl_anmerkungen"] = str(body.get("anmerkungen") or "")
    if not patch_payload:
        return func.HttpResponse(
            json.dumps({"success": False, "error": "Keine Änderung übergeben"}, ensure_ascii=False),
            status_code=400,
            headers=get_cors_headers(),
        )
    patch_headers = {**headers, "If-Match": "*"}
    r = requests.patch(f"{base_url}/api/data/v9.2/{ENTITY_SET}({order_id})", headers=patch_headers, json=patch_payload, timeout=30)
    if r.status_code not in (200, 204):
        return func.HttpResponse(
            json.dumps({"success": False, "error": f"Dataverse {r.status_code}", "detail": r.text[:800]}, ensure_ascii=False),
            status_code=r.status_code,
            headers=get_cors_headers(),
        )
    return func.HttpResponse(
        json.dumps({"success": True, "updated": patch_payload, "status_text": STATUS_LABELS.get(patch_payload.get("dl_status"), "")}, ensure_ascii=False),
        status_code=200,
        headers=get_cors_headers(),
    )


def main(req: func.HttpRequest) -> func.HttpResponse:
    if req.method == "OPTIONS":
        return func.HttpResponse(status_code=200, headers=get_cors_headers())

    token = get_token()
    if not token:
        return func.HttpResponse(
            json.dumps({"success": False, "error": "Server-Auth-Fehler"}, ensure_ascii=False),
            status_code=500,
            headers=get_cors_headers(),
        )

    base_url = _base_url()
    headers = _headers(token)

    if req.method == "PATCH":
        return _patch_order(req, base_url, headers)

    action = (req.params.get("action") or "dashboard").strip().lower()
    if action == "dashboard":
        return _dashboard(req, base_url, headers)
    if action == "orders":
        return _list_orders(req, base_url, headers)
    if action == "order":
        return _get_order(req, base_url, headers)
    if action == "status-labels":
        return func.HttpResponse(
            json.dumps({"success": True, "status_labels": STATUS_LABELS}, ensure_ascii=False),
            status_code=200,
            headers=get_cors_headers(),
        )
    return func.HttpResponse(
        json.dumps({"success": False, "error": "Unbekannte Aktion"}, ensure_ascii=False),
        status_code=400,
        headers=get_cors_headers(),
    )
