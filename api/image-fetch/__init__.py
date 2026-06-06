"""
Image Fetch API – Finds and downloads product images from the internet
for articles that have been sold in the last 6 months but have no image
in SharePoint StrichcodeBilder.

GET ?mode=list   → Returns list of articles without images (dry run)
POST {mode:"fetch", limit:N}  → Actually fetches and uploads images
"""
import azure.functions as func
import json
import os
import logging
import msal
import requests
import base64
import re
import time
from datetime import datetime, timedelta


DEFAULT_URL_SETTING = "DV_DEFAULT_URL"
DEFAULT_URL_FALLBACK = "https://orgab4e2f00.crm16.dynamics.com"
SP_DRIVE = "b!bwUha0ab4EeiA3xXHK-Oobhv5tJbeYJDiF9pTB-f1kC-Mp-AY0brRrr2WigdYK4A"
SP_BARCODE_FOLDER = "01USAQ6ESD7NCQ4ZM6GRHK5IRCMJMSRSVH"
SP_FOLDER = "01USAQ6ERA5Q2V5M2I2BCKYOFVH2WWICOC"


def get_dv_token():
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


_graph_app = None

def get_graph_token():
    global _graph_app
    tenant_id = os.environ.get("DV_TENANT_ID", "acfaedd4-c403-43b7-9544-fdb2b150124e")
    client_id = os.environ.get("DV_CLIENT_ID", "137b2df6-be83-459a-ac89-9efd0bdf51c4")
    client_secret = os.environ.get("DV_CLIENT_SECRET", "")
    if not client_secret:
        return None
    if not _graph_app:
        _graph_app = msal.ConfidentialClientApplication(
            client_id,
            authority=f"https://login.microsoftonline.com/{tenant_id}",
            client_credential=client_secret,
        )
    r = _graph_app.acquire_token_for_client(scopes=["https://graph.microsoft.com/.default"])
    return r.get("access_token")


def _dv_headers(token):
    return {
        "Authorization": f"Bearer {token}",
        "OData-MaxVersion": "4.0",
        "OData-Version": "4.0",
        "Accept": "application/json",
        "Content-Type": "application/json; charset=utf-8"
    }


def _base_url():
    return os.environ.get(DEFAULT_URL_SETTING, DEFAULT_URL_FALLBACK)


def get_cors_headers():
    return {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
        "Access-Control-Allow-Headers": "*",
        "Content-Type": "application/json; charset=utf-8"
    }


def _fetch_all_pages(url, headers, max_pages=20):
    """Fetch all pages from Dataverse OData endpoint."""
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


def _sp_image_exists(graph_token, strichcode, edeka_nr):
    """Check if image already exists in SharePoint (StrichcodeBilder or Werbebilder)."""
    hdrs = {"Authorization": f"Bearer {graph_token}"}
    # Check StrichcodeBilder by strichcode
    if strichcode:
        for ext in ("jpg", "png", "jpeg"):
            url = f"https://graph.microsoft.com/v1.0/drives/{SP_DRIVE}/items/{SP_BARCODE_FOLDER}:/{strichcode}.{ext}"
            r = requests.get(url, headers=hdrs, timeout=15)
            if r.status_code == 200:
                return True
    # Check Werbebilder by edeka_nr
    if edeka_nr:
        for ext in ("jpg", "png", "jpeg"):
            url = f"https://graph.microsoft.com/v1.0/drives/{SP_DRIVE}/items/{SP_FOLDER}:/{edeka_nr}.{ext}"
            r = requests.get(url, headers=hdrs, timeout=15)
            if r.status_code == 200:
                return True
    return False


def _search_product_image(bezeichnung, strichcode, edeka_nr):
    """Search for a product image on the internet.
    Strategy:
    1. Try EAN/barcode lookup on well-known product sites
    2. Fall back to web search with product name
    Returns (image_bytes, content_type) or (None, None).
    """
    user_agent = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
    headers = {"User-Agent": user_agent}

    # Strategy 1: Try known product image sources by EAN
    if strichcode and len(strichcode) >= 8:
        sources = [
            # Barcoo / various EAN lookup
            f"https://www.eandata.com/lookup/{strichcode}/",
            # German product database
            f"https://www.barcodelookup.com/{strichcode}",
        ]

        # Try Open Food Facts first (reliable, open license)
        try:
            off_url = f"https://world.openfoodfacts.org/api/v2/product/{strichcode}.json?fields=image_url,image_front_url,image_front_small_url"
            r = requests.get(off_url, headers=headers, timeout=10)
            if r.status_code == 200:
                data = r.json()
                product = data.get("product", {})
                img_url = product.get("image_front_url") or product.get("image_url") or ""
                if img_url:
                    img_r = requests.get(img_url, headers=headers, timeout=15)
                    if img_r.status_code == 200 and len(img_r.content) > 2000:
                        ct = img_r.headers.get("Content-Type", "image/jpeg")
                        logging.info(f"[image-fetch] Found via OpenFoodFacts: {strichcode}")
                        return img_r.content, ct
        except Exception as e:
            logging.debug(f"[image-fetch] OFF failed for {strichcode}: {e}")

    # Strategy 2: Try Bing Image Search (no API key needed, scrape first result)
    search_queries = []
    if strichcode:
        search_queries.append(f"{strichcode} produkt")
    if bezeichnung:
        # Clean up product name for search
        clean_name = re.sub(r'\d+\s*(x\s*)?\d+\s*(g|kg|ml|l|stk|stück)\b', '', bezeichnung, flags=re.IGNORECASE).strip()
        search_queries.append(f"{clean_name} produkt lebensmittel")
        search_queries.append(f"{bezeichnung}")

    for query in search_queries:
        try:
            # Use Bing image search
            search_url = f"https://www.bing.com/images/search?q={requests.utils.quote(query)}&first=1&count=5&qft=+filterui:photo-photo"
            r = requests.get(search_url, headers=headers, timeout=10)
            if r.status_code == 200:
                # Extract image URLs from murl parameter
                img_urls = re.findall(r'murl&quot;:&quot;(https?://[^&]+?\.(?:jpg|jpeg|png))&quot;', r.text, re.IGNORECASE)
                if not img_urls:
                    # Try alternative pattern
                    img_urls = re.findall(r'"murl":"(https?://[^"]+?\.(?:jpg|jpeg|png))"', r.text, re.IGNORECASE)
                for img_url in img_urls[:3]:
                    try:
                        img_r = requests.get(img_url, headers=headers, timeout=10, allow_redirects=True)
                        if img_r.status_code == 200 and len(img_r.content) > 3000:
                            ct = img_r.headers.get("Content-Type", "image/jpeg")
                            if "image" in ct:
                                logging.info(f"[image-fetch] Found via Bing for '{query}': {img_url[:80]}")
                                return img_r.content, ct
                    except:
                        continue
        except Exception as e:
            logging.debug(f"[image-fetch] Bing search failed for '{query}': {e}")
        time.sleep(0.5)  # Be polite

    return None, None


def _upload_to_sharepoint(graph_token, strichcode, img_bytes, content_type):
    """Upload image to SharePoint StrichcodeBilder folder."""
    ext = "jpg"
    if "png" in content_type:
        ext = "png"
    filename = f"{strichcode}.{ext}"
    upload_url = f"https://graph.microsoft.com/v1.0/drives/{SP_DRIVE}/items/{SP_BARCODE_FOLDER}:/{filename}:/content"
    r = requests.put(
        upload_url,
        headers={"Authorization": f"Bearer {graph_token}", "Content-Type": content_type},
        data=img_bytes,
        timeout=60
    )
    if r.status_code in (200, 201):
        dl_url = r.json().get("@microsoft.graph.downloadUrl", "")
        logging.info(f"[image-fetch] Uploaded {filename} to SharePoint")
        return dl_url
    else:
        logging.warning(f"[image-fetch] SP upload failed for {filename}: {r.status_code}")
        return None


def main(req: func.HttpRequest) -> func.HttpResponse:
    if req.method == "OPTIONS":
        return func.HttpResponse(status_code=200, headers=get_cors_headers())

    # Auth
    dv_token = get_dv_token()
    graph_token = get_graph_token()
    if not dv_token or not graph_token:
        return func.HttpResponse(
            json.dumps({"success": False, "error": "Token unavailable"}),
            status_code=500, headers=get_cors_headers()
        )

    base_url = _base_url()
    dv_hdrs = _dv_headers(dv_token)

    # Load all articles sold in last 6 months
    cutoff = (datetime.utcnow() - timedelta(days=180)).strftime("%Y-%m-%dT00:00:00Z")
    url = (f"{base_url}/api/data/v9.2/cr5d4_tables"
           f"?$select=cr5d4_artikelnummeredeka,cr5d4_artikelbezeichnung,cr5d4_strichcode,cr5d4_warengruppebez,cr5d4_artikelletzterverkauf"
           f"&$filter=cr5d4_artikelletzterverkauf gt {cutoff}"
           f"&$orderby=cr5d4_artikelbezeichnung asc")
    articles = _fetch_all_pages(url, dv_hdrs)

    # Determine mode
    mode = req.params.get("mode", "list")
    if req.method == "POST":
        try:
            body = req.get_json()
            mode = body.get("mode", mode)
            limit = body.get("limit", 20)
        except:
            limit = 20
    else:
        limit = int(req.params.get("limit", "50"))

    # Find articles without images
    missing = []
    checked = 0
    for art in articles:
        strichcode = (art.get("cr5d4_strichcode") or "").strip()
        edeka_nr = (art.get("cr5d4_artikelnummeredeka") or "").strip()
        bezeichnung = (art.get("cr5d4_artikelbezeichnung") or "").strip()
        warengruppe = (art.get("cr5d4_warengruppebez") or "").strip()

        if not strichcode and not edeka_nr:
            continue

        key = strichcode or edeka_nr

        # Check if image exists in SharePoint (batch-style, skip if found)
        has_image = _sp_image_exists(graph_token, strichcode, edeka_nr)
        checked += 1

        if not has_image:
            missing.append({
                "strichcode": strichcode,
                "edeka_nr": edeka_nr,
                "bezeichnung": bezeichnung,
                "warengruppe": warengruppe,
                "letzter_verkauf": art.get("cr5d4_artikelletzterverkauf", "")
            })

        # Limit SharePoint checks to avoid timeout (each check = multiple Graph calls)
        if checked >= 500:
            break

    if mode == "list":
        return func.HttpResponse(
            json.dumps({
                "success": True,
                "total_articles": len(articles),
                "checked": checked,
                "missing_images": len(missing),
                "articles": missing[:200]
            }, ensure_ascii=False),
            status_code=200, headers=get_cors_headers()
        )

    # mode == "fetch": actually download and upload images
    results = []
    fetched = 0
    failed = 0
    skipped = 0

    for art in missing[:limit]:
        strichcode = art["strichcode"]
        edeka_nr = art["edeka_nr"]
        bezeichnung = art["bezeichnung"]
        key = strichcode or edeka_nr

        if not key:
            skipped += 1
            continue

        img_bytes, content_type = _search_product_image(bezeichnung, strichcode, edeka_nr)

        if img_bytes:
            dl_url = _upload_to_sharepoint(graph_token, key, img_bytes, content_type)
            if dl_url:
                results.append({
                    "strichcode": strichcode,
                    "bezeichnung": bezeichnung,
                    "status": "uploaded",
                    "size_kb": round(len(img_bytes) / 1024, 1)
                })
                fetched += 1
            else:
                results.append({
                    "strichcode": strichcode,
                    "bezeichnung": bezeichnung,
                    "status": "upload_failed"
                })
                failed += 1
        else:
            results.append({
                "strichcode": strichcode,
                "bezeichnung": bezeichnung,
                "status": "not_found"
            })
            failed += 1

        time.sleep(1)  # Rate limiting

    return func.HttpResponse(
        json.dumps({
            "success": True,
            "total_missing": len(missing),
            "processed": len(results),
            "fetched": fetched,
            "failed": failed,
            "skipped": skipped,
            "results": results
        }, ensure_ascii=False),
        status_code=200, headers=get_cors_headers()
    )
