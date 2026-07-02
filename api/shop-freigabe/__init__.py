"""
Shop-Freigabe API – Manages which articles (by Strichcode) are enabled for the order shop.
Stored in dl_shopfreigabes, separate from cr5d4_tables (which gets overwritten externally).

GET    /api/shop-freigabe                → list all Freigaben
GET    /api/shop-freigabe?articles=1     → list all Artikelstamm articles (for selection UI)
POST   /api/shop-freigabe                → upsert Freigabe(n): {items: [{strichcode, gueltig_bis?, ...}]}
DELETE /api/shop-freigabe?strichcode=X   → remove Freigabe
"""
import azure.functions as func
import json
import os
from datetime import datetime, timedelta
import logging
import msal
import requests


DEFAULT_URL_SETTING = "DV_DEFAULT_URL"
DEFAULT_URL_FALLBACK = "https://orgab4e2f00.crm16.dynamics.com"
FREIGABE_ENTITY = "dl_shopfreigabes"
ARTICLE_ENTITY = "cr5d4_tables"


def get_token():
    tenant_id = os.environ.get("DV_TENANT_ID", "acfaedd4-c403-43b7-9544-fdb2b150124e")
    client_id = os.environ.get("DV_CLIENT_ID", "137b2df6-be83-459a-ac89-9efd0bdf51c4")
    client_secret = os.environ.get("DV_CLIENT_SECRET", "")
    target_url = os.environ.get(DEFAULT_URL_SETTING, DEFAULT_URL_FALLBACK)
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
    except:
        return None


def _base_url():
    return os.environ.get(DEFAULT_URL_SETTING, DEFAULT_URL_FALLBACK)


def _headers(token):
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
        "Access-Control-Allow-Methods": "GET, POST, DELETE, OPTIONS",
        "Access-Control-Allow-Headers": "*",
        "Access-Control-Max-Age": "86400",
        "Content-Type": "application/json; charset=utf-8"
    }


def _fetch_all_pages(url, headers, max_pages=20):
    items = []
    current_url = url
    for _ in range(max_pages):
        r = requests.get(current_url, headers=headers, timeout=60)
        if r.status_code != 200:
            return items
        data = r.json()
        items.extend(data.get("value", []))
        next_link = data.get("@odata.nextLink")
        if not next_link:
            break
        current_url = next_link
    return items


def _load_freigaben(base_url, headers):
    """Load all Freigaben from Dataverse."""
    url = f"{base_url}/api/data/v9.2/{FREIGABE_ENTITY}?$select=dl_shopfreigabeid,dl_strichcode,dl_aktiv,dl_gueltig_bis,dl_warengruppe,dl_bezeichnung,dl_edeka_nr,dl_freigegeben_von,dl_kurzfristig,dl_verfuegbare_tage"
    return _fetch_all_pages(url, headers)


_FLEISCH_KW = ["fleisch", "wurst", "metzger", "aufschnitt", "schinken", "salami"]

def _is_fleisch_wurst(wg):
    wg_lower = (wg or "").lower()
    return any(kw in wg_lower for kw in _FLEISCH_KW)

def _load_articles(base_url, headers):
    """Load articles from Artikelstamm sold in the last 6 weeks for the selection UI.
    Fleisch & Wurst articles are loaded without the date filter (they are pre-ordered, not sold at register)."""
    cutoff = (datetime.utcnow() - timedelta(weeks=6)).strftime("%Y-%m-%dT00:00:00Z")
    select = "cr5d4_strichcode,cr5d4_artikelnummeredeka,cr5d4_artikelbezeichnung,cr5d4_warengruppebez,cr5d4_vk_dorf,cr5d4_mengentyp,cr5d4_mengeneinheit,cr5d4_tableid"
    filt = f"cr5d4_artikelletzterverkauf ge {cutoff}"
    url = f"{base_url}/api/data/v9.2/{ARTICLE_ENTITY}?$select={select}&$filter={filt}&$orderby=cr5d4_warengruppebez asc,cr5d4_artikelbezeichnung asc"
    items = _fetch_all_pages(url, headers)
    # Also load Fleisch & Wurst articles without date filter
    fleisch_filt = "contains(cr5d4_warengruppebez,'Fleisch') or contains(cr5d4_warengruppebez,'Wurst')"
    fleisch_url = f"{base_url}/api/data/v9.2/{ARTICLE_ENTITY}?$select={select}&$filter={fleisch_filt}&$orderby=cr5d4_artikelbezeichnung asc"
    fleisch_items = _fetch_all_pages(fleisch_url, headers)
    # Merge & deduplicate by strichcode
    seen = {(item.get("cr5d4_strichcode") or "").strip() for item in items}
    for fi in fleisch_items:
        sc = (fi.get("cr5d4_strichcode") or "").strip()
        if sc and sc not in seen:
            items.append(fi)
            seen.add(sc)
    result = []
    for item in items:
        sc = (item.get("cr5d4_strichcode") or "").strip()
        bez = (item.get("cr5d4_artikelbezeichnung") or "").strip()
        if not sc or not bez:
            continue
        preis = item.get("cr5d4_vk_dorf")
        try:
            preis = float(preis) if preis else 0
        except:
            preis = 0
        if preis <= 0:
            continue
        result.append({
            "strichcode": sc,
            "edeka_nr": (item.get("cr5d4_artikelnummeredeka") or "").strip(),
            "bezeichnung": bez,
            "warengruppe": (item.get("cr5d4_warengruppebez") or "Sonstige").strip(),
            "preis": preis,
            "mengentyp": (item.get("cr5d4_mengentyp") or "").strip(),
            "mengeneinheit": item.get("cr5d4_mengeneinheit"),
        })
    return result


def _upsert_freigabe(base_url, headers, item):
    """Create or update a Freigabe by strichcode."""
    sc = (item.get("strichcode") or "").strip()
    if not sc:
        return {"strichcode": sc, "status": "error", "error": "strichcode required"}

    # Check if exists
    check_url = f"{base_url}/api/data/v9.2/{FREIGABE_ENTITY}?$select=dl_shopfreigabeid&$filter=dl_strichcode eq '{sc}'"
    check = requests.get(check_url, headers=headers, timeout=30)
    existing = check.json().get("value", []) if check.status_code == 200 else []

    payload = {"dl_strichcode": sc, "dl_aktiv": item.get("aktiv", True)}
    if item.get("gueltig_bis"):
        payload["dl_gueltig_bis"] = item["gueltig_bis"]
    if item.get("warengruppe"):
        payload["dl_warengruppe"] = item["warengruppe"]
    if item.get("bezeichnung"):
        payload["dl_bezeichnung"] = item["bezeichnung"]
    if item.get("edeka_nr"):
        payload["dl_edeka_nr"] = item["edeka_nr"]
    if item.get("freigegeben_von"):
        payload["dl_freigegeben_von"] = item["freigegeben_von"]
    if "kurzfristig" in item:
        payload["dl_kurzfristig"] = bool(item["kurzfristig"])
    if "verfuegbare_tage" in item:
        payload["dl_verfuegbare_tage"] = item["verfuegbare_tage"] or ""

    if existing:
        record_id = existing[0]["dl_shopfreigabeid"]
        url = f"{base_url}/api/data/v9.2/{FREIGABE_ENTITY}({record_id})"
        r = requests.patch(url, headers=headers, json=payload, timeout=30)
        return {"strichcode": sc, "status": "updated" if r.status_code in (200, 204) else "error", "code": r.status_code}
    else:
        url = f"{base_url}/api/data/v9.2/{FREIGABE_ENTITY}"
        r = requests.post(url, headers=headers, json=payload, timeout=30)
        return {"strichcode": sc, "status": "created" if r.status_code in (200, 201, 204) else "error", "code": r.status_code}


def _delete_freigabe(base_url, headers, strichcode):
    """Delete a Freigabe by strichcode."""
    check_url = f"{base_url}/api/data/v9.2/{FREIGABE_ENTITY}?$select=dl_shopfreigabeid&$filter=dl_strichcode eq '{strichcode}'"
    check = requests.get(check_url, headers=headers, timeout=30)
    existing = check.json().get("value", []) if check.status_code == 200 else []
    if not existing:
        return {"strichcode": strichcode, "status": "not_found"}
    record_id = existing[0]["dl_shopfreigabeid"]
    url = f"{base_url}/api/data/v9.2/{FREIGABE_ENTITY}({record_id})"
    r = requests.delete(url, headers=headers, timeout=30)
    return {"strichcode": strichcode, "status": "deleted" if r.status_code in (200, 204) else "error", "code": r.status_code}


def main(req: func.HttpRequest) -> func.HttpResponse:
    if req.method == "OPTIONS":
        return func.HttpResponse(status_code=200, headers=get_cors_headers())

    token = get_token()
    if not token:
        return func.HttpResponse(
            json.dumps({"success": False, "error": "Auth failed"}),
            status_code=500, headers=get_cors_headers()
        )

    base_url = _base_url()
    headers = _headers(token)

    # ── GET: list freigaben or articles ──
    if req.method == "GET":
        if req.params.get("articles") == "1":
            articles = _load_articles(base_url, headers)
            return func.HttpResponse(
                json.dumps({"success": True, "articles": articles}, ensure_ascii=False),
                status_code=200, headers=get_cors_headers()
            )
        freigaben = _load_freigaben(base_url, headers)
        result = []
        for f in freigaben:
            result.append({
                "id": f.get("dl_shopfreigabeid", ""),
                "strichcode": f.get("dl_strichcode", ""),
                "aktiv": f.get("dl_aktiv", True),
                "gueltig_bis": f.get("dl_gueltig_bis"),
                "warengruppe": f.get("dl_warengruppe", ""),
                "bezeichnung": f.get("dl_bezeichnung", ""),
                "edeka_nr": f.get("dl_edeka_nr", ""),
                "freigegeben_von": f.get("dl_freigegeben_von", ""),
                "kurzfristig": bool(f.get("dl_kurzfristig")),
                "verfuegbare_tage": f.get("dl_verfuegbare_tage") or "",
            })
        return func.HttpResponse(
            json.dumps({"success": True, "freigaben": result}, ensure_ascii=False),
            status_code=200, headers=get_cors_headers()
        )

    # ── POST: upsert freigabe(n) ──
    if req.method == "POST":
        try:
            body = req.get_json()
        except:
            return func.HttpResponse(
                json.dumps({"success": False, "error": "Invalid JSON"}),
                status_code=400, headers=get_cors_headers()
            )
        items = body.get("items", [])
        if not items and body.get("strichcode"):
            items = [body]
        results = []
        for item in items:
            results.append(_upsert_freigabe(base_url, headers, item))
        return func.HttpResponse(
            json.dumps({"success": True, "results": results}, ensure_ascii=False),
            status_code=200, headers=get_cors_headers()
        )

    # ── DELETE: remove freigabe ──
    if req.method == "DELETE":
        sc = req.params.get("strichcode", "").strip()
        if not sc:
            try:
                body = req.get_json()
                sc = (body.get("strichcode") or "").strip()
            except:
                pass
        if not sc:
            return func.HttpResponse(
                json.dumps({"success": False, "error": "strichcode required"}),
                status_code=400, headers=get_cors_headers()
            )
        result = _delete_freigabe(base_url, headers, sc)
        return func.HttpResponse(
            json.dumps({"success": True, "result": result}, ensure_ascii=False),
            status_code=200, headers=get_cors_headers()
        )

    return func.HttpResponse(
        json.dumps({"success": False, "error": "Method not allowed"}),
        status_code=405, headers=get_cors_headers()
    )
