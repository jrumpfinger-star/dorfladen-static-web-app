import azure.functions as func
import json
import os
import io
import logging
import msal
import requests
import base64
import time


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


_graph_msal_app = None

def get_graph_token():
    global _graph_msal_app
    tenant_id = os.environ.get("DV_TENANT_ID", "acfaedd4-c403-43b7-9544-fdb2b150124e")
    client_id = os.environ.get("DV_CLIENT_ID", "137b2df6-be83-459a-ac89-9efd0bdf51c4")
    client_secret = os.environ.get("DV_CLIENT_SECRET", "")
    if not client_secret:
        return None
    try:
        if not _graph_msal_app:
            _graph_msal_app = msal.ConfidentialClientApplication(
                client_id,
                authority=f"https://login.microsoftonline.com/{tenant_id}",
                client_credential=client_secret,
            )
        r = _graph_msal_app.acquire_token_for_client(scopes=["https://graph.microsoft.com/.default"])
        return r.get("access_token")
    except:
        return None


def _put_with_retry(url, headers, data, timeout=60, attempts=4):
    response = None
    for attempt in range(attempts):
        response = requests.put(url, headers=headers, data=data, timeout=timeout)
        if response.status_code not in (429, 500, 502, 503, 504):
            return response
        if attempt >= attempts - 1:
            return response
        retry_after = (response.headers.get("Retry-After") or "").strip()
        try:
            delay = max(1, min(10, int(retry_after)))
        except Exception:
            delay = min(8, 2 ** attempt)
        logging.warning(f"[werbebilder] retrying SharePoint upload after {response.status_code}, attempt {attempt + 1}/{attempts}, wait={delay}s")
        time.sleep(delay)
    return response


def _download_as_base64(dl_url):
    """Download image from SharePoint and return as data-URI base64 string."""
    if not dl_url:
        return ""
    try:
        img_r = requests.get(dl_url, timeout=30)
        if img_r.status_code == 200:
            ct = img_r.headers.get("Content-Type", "image/jpeg")
            return f"data:{ct};base64," + base64.b64encode(img_r.content).decode("ascii")
    except Exception:
        pass
    return ""


def _load_sharepoint_urls(article_infos):
    """Get SharePoint images via Graph $batch API, returned as base64 data-URIs.
    Werbebilder folder uses edeka_nr, StrichcodeBilder uses strichcode.
    Graph allows max 20 subrequests per $batch, so larger sets are chunked.
    Tries jpg, png, jpeg extensions per article."""
    token = get_graph_token()
    if not token:
        return []
    batch_requests = []
    id_to_artnr = {}
    idx = 0
    for info in article_infos[:24]:
        enr = (info.get("edeka_nr") or "").strip()
        sc = (info.get("strichcode") or "").strip()
        artnr = info.get("artikelnummer", enr or sc)
        for ext in ("jpg", "png", "jpeg"):
            if sc:
                idx += 1
                rid = str(idx)
                batch_requests.append({"id": rid, "method": "GET", "url": f"/drives/{SP_DRIVE}/items/{SP_BARCODE_FOLDER}:/{sc}.{ext}"})
                id_to_artnr[rid] = artnr
            if enr:
                idx += 1
                rid = str(idx)
                batch_requests.append({"id": rid, "method": "GET", "url": f"/drives/{SP_DRIVE}/items/{SP_FOLDER}:/{enr}.{ext}"})
                id_to_artnr[rid] = artnr
    if not batch_requests:
        return []
    result = []
    found = set()
    headers = {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}
    for start in range(0, len(batch_requests), 20):
        chunk = batch_requests[start:start + 20]
        r = requests.post(
            "https://graph.microsoft.com/v1.0/$batch",
            headers=headers,
            json={"requests": chunk},
            timeout=30
        )
        if r.status_code != 200:
            logging.warning(f"[werbebilder] $batch failed: {r.status_code}")
            continue
        for resp in r.json().get("responses", []):
            if resp.get("status") == 200:
                artnr = id_to_artnr.get(resp.get("id", ""))
                dl = resp.get("body", {}).get("@microsoft.graph.downloadUrl", "")
                if artnr and dl and artnr not in found:
                    found.add(artnr)
                    b64 = _download_as_base64(dl)
                    result.append({
                        "dl_artikelnummer": artnr,
                        "dl_bild_base64": b64,
                        "dl_download_url": dl,
                        "source": "sharepoint"
                    })
    logging.info(f"[werbebilder] SP batch: {len(result)}/{len(article_infos)} found")
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


SP_DRIVE = "b!bwUha0ab4EeiA3xXHK-Oobhv5tJbeYJDiF9pTB-f1kC-Mp-AY0brRrr2WigdYK4A"
SP_FOLDER = "01USAQ6ERA5Q2V5M2I2BCKYOFVH2WWICOC"
SP_BARCODE_FOLDER = "01USAQ6ESD7NCQ4ZM6GRHK5IRCMJMSRSVH"
_graph_msal_app = None

def _get_graph_token():
    global _graph_msal_app
    tenant_id = os.environ.get("DV_TENANT_ID", "acfaedd4-c403-43b7-9544-fdb2b150124e")
    client_id = os.environ.get("DV_CLIENT_ID", "137b2df6-be83-459a-ac89-9efd0bdf51c4")
    client_secret = os.environ.get("DV_CLIENT_SECRET", "")
    if not client_secret:
        return None
    if not _graph_msal_app:
        _graph_msal_app = msal.ConfidentialClientApplication(
            client_id,
            authority=f"https://login.microsoftonline.com/{tenant_id}",
            client_credential=client_secret,
        )
    r = _graph_msal_app.acquire_token_for_client(scopes=["https://graph.microsoft.com/.default"])
    return r.get("access_token")

def _find_sp_image(token, folder_id, key):
    if not token or not key:
        return None
    hdrs = {"Authorization": f"Bearer {token}"}
    for ext in ("jpg", "png", "jpeg", "gif"):
        url = f"https://graph.microsoft.com/v1.0/drives/{SP_DRIVE}/items/{folder_id}:/{key}.{ext}"
        r = requests.get(url, headers=hdrs, timeout=20)
        if r.status_code == 200:
            body = r.json()
            return {"name": body.get("name", f"{key}.{ext}"), "dl_download_url": body.get("@microsoft.graph.downloadUrl", "")}
    return None

def _lookup_sp_images(article_infos):
    token = _get_graph_token()
    result = []
    for info in article_infos[:20]:
        artnr = (info.get("edeka_nr") or info.get("artikelnummer") or "").strip()
        sc = (info.get("strichcode") or "").strip()
        result_key = sc or artnr
        hit = _find_sp_image(token, SP_BARCODE_FOLDER, sc) if sc else None
        if not hit and artnr:
            hit = _find_sp_image(token, SP_FOLDER, artnr)
        if hit and hit.get("dl_download_url"):
            b64 = _download_as_base64(hit["dl_download_url"])
            result.append({"dl_artikelnummer": result_key, "dl_bild_base64": b64, "dl_download_url": hit["dl_download_url"], "source": "sharepoint", "name": hit.get("name", "")})
    return result


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

    # --- POST: shop image lookup or CMS upsert ---
    if req.method == "POST":
        try:
            body = req.get_json()
        except:
            return func.HttpResponse(
                body=json.dumps({"success": False, "error": "Invalid JSON"}),
                status_code=400, headers=get_cors_headers()
            )
        # Shop image lookup: POST {articles: [{artikelnummer, edeka_nr, strichcode}, ...]}
        if "articles" in body:
            article_infos = body["articles"][:20]
            nr_list = [a.get("artikelnummer", "") for a in article_infos if a.get("artikelnummer")]
            result = []
            if nr_list:
                filter_parts = [f"dl_artikelnummer eq '{nr}'" for nr in nr_list]
                odata_filter = " or ".join(filter_parts)
                url = f"{base_url}/api/data/v9.2/{ENTITY_SET}?$select=dl_werbebildid,dl_artikelnummer,dl_bild_base64,dl_download_url&$filter={odata_filter}"
                r = requests.get(url, headers=headers, timeout=30)
                if r.status_code == 200:
                    for item in r.json().get("value", []):
                        result.append({
                            "dl_artikelnummer": item.get("dl_artikelnummer", ""),
                            "dl_bild_base64": item.get("dl_bild_base64", ""),
                            "dl_download_url": item.get("dl_download_url", "")
                        })
            include_sp = (req.params.get("sharepoint") or "").lower() in ("1", "true", "yes")
            if include_sp:
                sp_rows = _load_sharepoint_urls(article_infos)
                if sp_rows:
                    sp_map = {r["dl_artikelnummer"]: r for r in sp_rows}
                    # SP base64 wins over Dataverse, but keep Dataverse base64 if SP has none
                    for row in result:
                        key = row.get("dl_artikelnummer", "")
                        if key in sp_map:
                            sp = sp_map[key]
                            if sp.get("dl_bild_base64"):
                                row["dl_bild_base64"] = sp["dl_bild_base64"]
                            row["dl_download_url"] = sp.get("dl_download_url", "")
                            del sp_map[key]
                    result.extend(sp_map.values())
            return func.HttpResponse(body=json.dumps(result), status_code=200, headers=get_cors_headers())


        artnr = (body.get("dl_artikelnummer") or "").strip()
        bild = (body.get("dl_bild_base64") or "").strip()
        if not artnr:
            return func.HttpResponse(
                body=json.dumps({"success": False, "error": "dl_artikelnummer required"}),
                status_code=400, headers=get_cors_headers()
            )

        try:
            # 1) Upload image to SharePoint StrichcodeBilder folder
            dl_url = ""
            sp_b64 = ""
            if bild:
                graph_token = get_graph_token()
                if not graph_token:
                    return func.HttpResponse(
                        body=json.dumps({"success": False, "error": "Graph token unavailable"}),
                        status_code=500, headers=get_cors_headers()
                    )
                # Decode base64 data URI → binary
                if "," in bild:
                    header_part, b64_data = bild.split(",", 1)
                else:
                    header_part, b64_data = "", bild
                img_bytes = base64.b64decode(b64_data)
                # Always upload as PNG to SharePoint (consistent with fetch-product-images)
                from PIL import Image as PILImage
                pil_img = PILImage.open(io.BytesIO(img_bytes))
                pil_img = pil_img.convert("RGBA")
                buf = io.BytesIO()
                pil_img.save(buf, format="PNG", optimize=True)
                img_bytes = buf.getvalue()
                ext = "png"
                content_type = "image/png"
                filename = f"{artnr}.{ext}"
                # Delete stale .jpg if it exists
                for old_ext in ("jpg", "jpeg"):
                    old_url = f"https://graph.microsoft.com/v1.0/drives/{SP_DRIVE}/items/{SP_BARCODE_FOLDER}:/{artnr}.{old_ext}"
                    old_r = requests.get(old_url, headers={"Authorization": f"Bearer {graph_token}"}, timeout=10)
                    if old_r.status_code == 200:
                        old_id = old_r.json().get("id", "")
                        if old_id:
                            requests.delete(f"https://graph.microsoft.com/v1.0/drives/{SP_DRIVE}/items/{old_id}",
                                            headers={"Authorization": f"Bearer {graph_token}"}, timeout=10)
                            logging.info(f"[werbebilder] deleted stale {artnr}.{old_ext}")
                # Upload via Graph API PUT (create or overwrite)
                upload_url = f"https://graph.microsoft.com/v1.0/drives/{SP_DRIVE}/items/{SP_BARCODE_FOLDER}:/{filename}:/content"
                sp_r = _put_with_retry(
                    upload_url,
                    headers={"Authorization": f"Bearer {graph_token}", "Content-Type": content_type},
                    data=img_bytes,
                    timeout=60
                )
                if sp_r.status_code in (200, 201):
                    dl_url = sp_r.json().get("@microsoft.graph.downloadUrl", "")
                    sp_b64 = bild  # keep for Dataverse thumbnail
                    logging.info(f"[werbebilder] uploaded {filename} to SharePoint")
                else:
                    logging.warning(f"[werbebilder] SP upload failed: {sp_r.status_code} {sp_r.text[:200]}")
                    return func.HttpResponse(
                        body=json.dumps({"success": False, "error": f"SharePoint upload failed: {sp_r.status_code}"}),
                        status_code=sp_r.status_code, headers=get_cors_headers()
                    )

            # 2) Upsert Dataverse record with download URL (no large base64)
            check_url = f"{base_url}/api/data/v9.2/{ENTITY_SET}?$select=dl_werbebildid,dl_artikelnummer&$filter=dl_artikelnummer eq '{artnr}'"
            check = requests.get(check_url, headers=headers, timeout=30)
            if check.status_code != 200:
                return func.HttpResponse(
                    body=json.dumps({"success": False, "error": f"Dataverse check failed: {check.status_code}"}),
                    status_code=check.status_code, headers=get_cors_headers()
                )
            existing = check.json().get("value", [])

            payload = {"dl_artikelnummer": artnr}
            if dl_url:
                payload["dl_download_url"] = dl_url
                payload["dl_bild_base64"] = ""  # clear cached base64 – SP is source of truth

            if existing:
                record_id = existing[0]["dl_werbebildid"]
                patch_url = f"{base_url}/api/data/v9.2/{ENTITY_SET}({record_id})"
                r = requests.patch(patch_url, headers=headers, json=payload, timeout=30)
            else:
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
                    body=json.dumps({"success": True, "id": record_id, "dl_download_url": dl_url}),
                    status_code=200, headers=get_cors_headers()
                )
            else:
                return func.HttpResponse(
                    body=json.dumps({"success": False, "error": f"Dataverse {r.status_code}", "details": r.text[:300]}),
                    status_code=r.status_code, headers=get_cors_headers()
                )
        except Exception as e:
            logging.error(f"[werbebilder] upload error: {e}")
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
            include_sp = (req.params.get("sharepoint") or "").lower() in ("1", "true", "yes")
            if include_sp:
                found_keys = {x.get("dl_artikelnummer", "") for x in result if x.get("dl_bild_base64")}
                missing = [{"artikelnummer": x, "strichcode": x} for x in nr_list if x not in found_keys]
                if missing:
                    result.extend(_lookup_sp_images(missing))
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
