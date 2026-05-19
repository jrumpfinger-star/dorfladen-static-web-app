import azure.functions as func
import json
import os
import msal
import requests


def get_token(url_setting_name="DV_DEFAULT_URL"):
    tenant_id = os.environ.get("DV_TENANT_ID", "acfaedd4-c403-43b7-9544-fdb2b150124e")
    client_id = os.environ.get("DV_CLIENT_ID", "137b2df6-be83-459a-ac89-9efd0bdf51c4")
    client_secret = os.environ.get("DV_CLIENT_SECRET", "")
    target_url = os.environ.get(url_setting_name, "https://org392a4789.crm16.dynamics.com")
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
        "Access-Control-Allow-Methods": "GET, OPTIONS",
        "Access-Control-Allow-Headers": "*",
        "Access-Control-Max-Age": "86400",
        "Content-Type": "application/json; charset=utf-8"
    }


def main(req: func.HttpRequest) -> func.HttpResponse:
    if req.method == "OPTIONS":
        return func.HttpResponse(status_code=200, headers=get_cors_headers())

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

    # Query Dataverse for werbebilder matching the requested article numbers
    for env_name in ("DV_DEFAULT_URL", "DV_DEV_URL"):
        base_url = os.environ.get(env_name, "").strip()
        if not base_url:
            continue

        headers = get_headers(env_name)

        # Build OData filter for multiple article numbers
        filter_parts = [f"dl_artikelnummer eq '{nr}'" for nr in nr_list[:50]]
        odata_filter = " or ".join(filter_parts)
        url = f"{base_url}/api/data/v9.2/dl_werbebilds?$select=dl_artikelnummer,dl_bild_base64,dl_download_url&$filter={odata_filter}"

        try:
            r = requests.get(url, headers=headers, timeout=30)
            if r.status_code == 200:
                items = r.json().get("value", [])
                result = []
                for item in items:
                    result.append({
                        "dl_artikelnummer": item.get("dl_artikelnummer", ""),
                        "dl_bild_base64": item.get("dl_bild_base64", ""),
                        "dl_download_url": item.get("dl_download_url", "")
                    })
                return func.HttpResponse(
                    body=json.dumps(result),
                    status_code=200,
                    headers=get_cors_headers()
                )
        except:
            continue

    # Fallback: return empty list if no environment has the table
    return func.HttpResponse(
        body=json.dumps([]),
        status_code=200,
        headers=get_cors_headers()
    )
