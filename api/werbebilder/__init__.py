import azure.functions as func
import json
import os
import msal
import requests
import base64


DEFAULT_URL_SETTING = "DV_DEFAULT_URL"
DEFAULT_URL_FALLBACK = "https://orgab4e2f00.crm16.dynamics.com"
ENTITY_SET = "dl_werbebilds"
SP_DRIVE = "b!bwUha0ab4EeiA3xXHK-Oobhv5tJbeYJDiF9pTB-f1kC-Mp-AY0brRrr2WigdYK4A"
SP_FOLDER = "01USAQ6ERA5Q2V5M2I2BCKYOFVH2WWICOC"
SP_BARCODE_FOLDER = "01USAQ6ESD7NCQ4ZM6GRHK5IRCMJMSRSVH"


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


def get_graph_token():
    tenant_id = os.environ.get("DV_TENANT_ID", "acfaedd4-c403-43b7-9544-fdb2b150124e")
    client_id = os.environ.get("DV_CLIENT_ID", "137b2df6-be83-459a-ac89-9efd0bdf51c4")
    client_secret = os.environ.get("DV_CLIENT_SECRET", "")
    if not client_secret:
        return None
    try:
        a = msal.ConfidentialClientApplication(
            client_id,
            authority=f"https://login.microsoftonline.com/{tenant_id}",
            client_credential=client_secret,
        )
        r = a.acquire_token_for_client(scopes=["https://graph.microsoft.com/.default"])
        return r.get("access_token")
    except:
        return None


def _sp_image_for_key(token, folder_id, key):
    if not token or not key:
        return None
    gh = {"Authorization": f"Bearer {token}"}
    for ext in ("jpg", "png", "gif", "jpeg"):
        meta_url = f"https://graph.microsoft.com/v1.0/drives/{SP_DRIVE}/items/{folder_id}:/{key}.{ext}"
        meta = requests.get(meta_url, headers=gh, timeout=12)
        if meta.status_code != 200:
            continue
        item = meta.json()
        item_id = item.get("id")
        if not item_id:
            continue
        content = requests.get(f"https://graph.microsoft.com/v1.0/drives/{SP_DRIVE}/items/{item_id}/content", headers=gh, timeout=20)
        if content.status_code != 200:
            continue
        mime = "image/png" if ext == "png" else "image/gif" if ext == "gif" else "image/jpeg"
        return "data:" + mime + ";base64," + base64.b64encode(content.content).decode("ascii")
    return None


def _load_sharepoint_images(keys):
    token = get_graph_token()
    if not token:
        return []
    result = []
    for key in keys[:30]:
        img = _sp_image_for_key(token, SP_BARCODE_FOLDER, key) or _sp_image_for_key(token, SP_FOLDER, key)
        if img:
            result.append({
                "id": "sharepoint:" + key,
                "dl_werbebildid": "",
                "dl_artikelnummer": key,
                "dl_bild_base64": img,
                "dl_download_url": "",
                "source": "sharepoint"
            })
    return result


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
            found_keys = {x.get("dl_artikelnummer", "") for x in result}
            missing = [x for x in nr_list if x not in found_keys]
            if missing:
                result.extend(_load_sharepoint_images(missing))
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
