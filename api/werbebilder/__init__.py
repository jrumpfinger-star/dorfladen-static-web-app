import azure.functions as func
import json
import os
import msal
import requests


DEFAULT_URL_SETTING = "DV_DEFAULT_URL"
DEFAULT_URL_FALLBACK = "https://orgab4e2f00.crm16.dynamics.com"
ENTITY_SET = "dl_werbebilds"


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


def get_headers():
    token = get_token()
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
        "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
        "Access-Control-Allow-Headers": "*",
        "Access-Control-Max-Age": "86400",
        "Content-Type": "application/json; charset=utf-8"
    }


def main(req: func.HttpRequest) -> func.HttpResponse:
    if req.method == "OPTIONS":
        return func.HttpResponse(status_code=200, headers=get_cors_headers())

    base_url = _base_url()
    headers = get_headers()

    # --- POST: upsert a werbebild for a given artikelnummer, return record id ---
    if req.method == "POST":
        try:
            body = req.get_json()
        except:
            return func.HttpResponse(
                body=json.dumps({"success": False, "error": "Invalid JSON"}),
                status_code=400, headers=get_cors_headers()
            )
        artnr = (body.get("dl_artikelnummer") or "").strip()
        bild = (body.get("dl_bild_base64") or "").strip()
        if not artnr:
            return func.HttpResponse(
                body=json.dumps({"success": False, "error": "dl_artikelnummer required"}),
                status_code=400, headers=get_cors_headers()
            )

        try:
            # Check if record already exists for this artikelnummer
            check_url = f"{base_url}/api/data/v9.2/{ENTITY_SET}?$select=dl_werbebildid,dl_artikelnummer&$filter=dl_artikelnummer eq '{artnr}'"
            check = requests.get(check_url, headers=headers, timeout=30)
            if check.status_code != 200:
                return func.HttpResponse(
                    body=json.dumps({"success": False, "error": f"Dataverse check failed: {check.status_code}"}),
                    status_code=check.status_code, headers=get_cors_headers()
                )
            existing = check.json().get("value", [])

            payload = {"dl_artikelnummer": artnr}
            if bild:
                payload["dl_bild_base64"] = bild

            if existing:
                # PATCH existing record
                record_id = existing[0]["dl_werbebildid"]
                patch_url = f"{base_url}/api/data/v9.2/{ENTITY_SET}({record_id})"
                r = requests.patch(patch_url, headers=headers, json=payload, timeout=30)
            else:
                # POST new record, request id back
                post_headers = {**headers, "Prefer": "return=representation"}
                post_url = f"{base_url}/api/data/v9.2/{ENTITY_SET}"
                r = requests.post(post_url, headers=post_headers, json=payload, timeout=30)
                if r.status_code in (200, 201):
                    try:
                        record_id = r.json().get("dl_werbebildid", "")
                    except:
                        record_id = ""
                elif r.status_code == 204:
                    eid = r.headers.get("OData-EntityId", "")
                    record_id = eid.split("(")[-1].rstrip(")") if "(" in eid else ""

            if r.status_code in (200, 201, 204):
                return func.HttpResponse(
                    body=json.dumps({"success": True, "id": record_id}),
                    status_code=200, headers=get_cors_headers()
                )
            else:
                return func.HttpResponse(
                    body=json.dumps({"success": False, "error": f"Dataverse {r.status_code}", "details": r.text[:300]}),
                    status_code=r.status_code, headers=get_cors_headers()
                )
        except Exception as e:
            return func.HttpResponse(
                body=json.dumps({"success": False, "error": str(e)}),
                status_code=500, headers=get_cors_headers()
            )

    # --- GET: fetch werbebilder by artikelnummern ---
    artnrs = req.params.get("artnrs", "").strip()
    if not artnrs:
        return func.HttpResponse(
            body=json.dumps([]),
            status_code=200,
            headers=get_cors_headers()
        )

    nr_list = [n.strip() for n in artnrs.split(",") if n.strip()]
    if not nr_list:
        return func.HttpResponse(
            body=json.dumps([]),
            status_code=200,
            headers=get_cors_headers()
        )

    try:
        # Build OData filter for multiple article numbers
        filter_parts = [f"dl_artikelnummer eq '{nr}'" for nr in nr_list[:50]]
        odata_filter = " or ".join(filter_parts)
        url = f"{base_url}/api/data/v9.2/{ENTITY_SET}?$select=dl_werbebildid,dl_artikelnummer,dl_bild_base64,dl_download_url&$filter={odata_filter}"
        r = requests.get(url, headers=headers, timeout=30)
        if r.status_code == 200:
            items = r.json().get("value", [])
            result = []
            for item in items:
                result.append({
                    "id": item.get("dl_werbebildid", ""),
                    "dl_werbebildid": item.get("dl_werbebildid", ""),
                    "dl_artikelnummer": item.get("dl_artikelnummer", ""),
                    "dl_bild_base64": item.get("dl_bild_base64", ""),
                    "dl_download_url": item.get("dl_download_url", "")
                })
            return func.HttpResponse(
                body=json.dumps(result),
                status_code=200,
                headers=get_cors_headers()
            )
        return func.HttpResponse(
            body=json.dumps({"success": False, "error": f"Dataverse {r.status_code}"}),
            status_code=r.status_code,
            headers=get_cors_headers()
        )
    except Exception as e:
        return func.HttpResponse(
            body=json.dumps([]),
            status_code=200,
            headers=get_cors_headers()
        )
