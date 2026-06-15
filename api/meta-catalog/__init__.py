import azure.functions as func
import json
import os
import requests
import logging
import msal
import base64
from urllib.parse import quote

# ---------- Config ----------
META_ACCESS_TOKEN = os.environ.get("META_ACCESS_TOKEN", "")
META_CATALOG_ID = os.environ.get("META_CATALOG_ID", "27188960997392965")
META_GRAPH_URL = "https://graph.facebook.com/v20.0"

# The public base URL of this SWA – used to build image URLs that Meta can fetch
SWA_BASE_URL = os.environ.get("SWA_BASE_URL", "")

# SharePoint / Graph config (same as social-katalog)
TENANT_ID = os.environ.get("DV_TENANT_ID", "acfaedd4-c403-43b7-9544-fdb2b150124e")
CLIENT_ID = os.environ.get("DV_CLIENT_ID", "137b2df6-be83-459a-ac89-9efd0bdf51c4")
CLIENT_SECRET = os.environ.get("DV_CLIENT_SECRET", "")
SP_DRIVE = "b!bwUha0ab4EeiA3xXHK-Oobhv5tJbeYJDiF9pTB-f1kC-Mp-AY0brRrr2WigdYK4A"
SP_SOCIAL_FOLDER_NAME = "SocialMedia"
MITTAGSTISCH_BILDER_FILE = "mittagstisch-bilder.json"

# ---------- Helpers ----------
def ok(data, status=200):
    return func.HttpResponse(
        json.dumps(data, ensure_ascii=False),
        status_code=status,
        mimetype="application/json",
        headers={"Access-Control-Allow-Origin": "*"}
    )

def err(msg, status=400):
    return ok({"error": msg}, status)

def cors_preflight():
    return func.HttpResponse(
        "", status_code=204,
        headers={
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "GET,POST,DELETE,OPTIONS",
            "Access-Control-Allow-Headers": "Content-Type"
        }
    )

# ---------- Meta Graph API helpers ----------
def meta_headers():
    return {"Authorization": f"Bearer {META_ACCESS_TOKEN}"}

def meta_create_product(product):
    """Create or update a product in the Meta catalog."""
    url = f"{META_GRAPH_URL}/{META_CATALOG_ID}/products"
    data = {
        "retailer_id": product["retailer_id"],
        "name": product["name"],
        "description": product.get("description", ""),
        "availability": product.get("availability", "in stock"),
        "price": product["price"],  # price in cents
        "currency": product.get("currency", "EUR"),
        "url": product.get("url", "https://www.dorfladen-oberornau.de"),
    }
    if product.get("image_url"):
        data["image_url"] = product["image_url"]
    
    r = requests.post(url, headers=meta_headers(), data=data, timeout=30)
    logging.info(f"[MetaCatalog] Create product '{product['name']}': {r.status_code} {r.text[:200]}")
    return r.status_code, r.json() if r.text else {}

def meta_delete_product(retailer_id):
    """Delete a product from the Meta catalog by retailer_id."""
    url = f"{META_GRAPH_URL}/{META_CATALOG_ID}/products"
    data = {
        "requests": json.dumps([{
            "method": "DELETE",
            "retailer_id": retailer_id
        }])
    }
    r = requests.post(url, headers=meta_headers(), data=data, timeout=30)
    logging.info(f"[MetaCatalog] Delete product '{retailer_id}': {r.status_code} {r.text[:200]}")
    return r.status_code, r.json() if r.text else {}

def meta_list_products():
    """List all products in the catalog."""
    url = f"{META_GRAPH_URL}/{META_CATALOG_ID}/products"
    params = {"fields": "id,retailer_id,name,price,availability,image_url", "limit": 100}
    r = requests.get(url, headers=meta_headers(), params=params, timeout=30)
    if r.status_code == 200:
        return r.json().get("data", [])
    logging.error(f"[MetaCatalog] List products failed: {r.status_code} {r.text[:200]}")
    return []

# ---------- Build products from Mittagessen data ----------
def build_meal_products(meals, base_url):
    """Convert meal items to Meta catalog product format."""
    products = []
    for meal in meals:
        gericht = meal.get("gericht", "").strip()
        preis = meal.get("preis")
        if not gericht or not preis:
            continue
        
        # Price in cents for Meta
        try:
            price_cents = int(round(float(preis) * 100))
        except:
            continue
        
        # Build a unique retailer_id from the meal
        safe_id = gericht.lower().replace(" ", "_").replace("/", "_")[:60]
        retailer_id = f"mt_{safe_id}"
        
        # Image URL: use the proxy endpoint on our SWA
        image_url = ""
        if base_url and meal.get("has_image"):
            image_url = f"{base_url}/api/meta-catalog?action=image&gericht={quote(gericht)}"
        
        products.append({
            "retailer_id": retailer_id,
            "name": f"Mittagessen: {gericht}",
            "description": f"Heute im Dorfladen Oberornau: {gericht} - Jetzt vorbestellen! Tel: 08082 / 622 99 91",
            "price": price_cents,
            "currency": "EUR",
            "availability": "in stock",
            "image_url": image_url,
            "url": "https://www.dorfladen-oberornau.de"
        })
    return products

# ---------- SharePoint helpers (for image proxy) ----------
def get_graph_token():
    if not CLIENT_SECRET:
        return None
    try:
        app = msal.ConfidentialClientApplication(
            CLIENT_ID,
            authority=f"https://login.microsoftonline.com/{TENANT_ID}",
            client_credential=CLIENT_SECRET,
        )
        r = app.acquire_token_for_client(scopes=["https://graph.microsoft.com/.default"])
        return r.get("access_token")
    except:
        return None

def graph_headers(token):
    return {"Authorization": f"Bearer {token}", "Accept": "application/json"}

def ensure_social_folder(token):
    h = graph_headers(token)
    url = f"https://graph.microsoft.com/v1.0/drives/{SP_DRIVE}/root/children?$filter=name eq '{SP_SOCIAL_FOLDER_NAME}'&$select=id,name,folder"
    r = requests.get(url, headers=h, timeout=15)
    if r.status_code == 200:
        for child in r.json().get("value", []):
            if child.get("folder") is not None:
                return child["id"]
    return None

def load_mt_bilder(token, folder_id):
    h = graph_headers(token)
    url = f"https://graph.microsoft.com/v1.0/drives/{SP_DRIVE}/items/{folder_id}:/{MITTAGSTISCH_BILDER_FILE}:/content"
    r = requests.get(url, headers=h, timeout=15)
    if r.status_code == 200:
        try:
            return json.loads(r.text)
        except:
            return {}
    return {}

# ---------- Image proxy for Meta ----------
def serve_image(req):
    """Serve a Mittagstisch image so Meta can fetch it (they need a public URL)."""
    gericht = req.params.get("gericht", "")
    if not gericht:
        return err("gericht parameter required")
    
    try:
        token = get_graph_token()
        if not token:
            return func.HttpResponse("Graph token failed", status_code=500)
        folder_id = ensure_social_folder(token)
        if not folder_id:
            return func.HttpResponse("Social folder not found", status_code=500)
        bilder = load_mt_bilder(token, folder_id)
        
        info = bilder.get(gericht)
        if not info or not info.get("bild_sp_id"):
            return func.HttpResponse("Image not found", status_code=404)
        
        sp_id = info["bild_sp_id"]
        h = graph_headers(token)
        dl_url = f"https://graph.microsoft.com/v1.0/drives/{SP_DRIVE}/items/{sp_id}/content"
        r = requests.get(dl_url, headers=h, timeout=20)
        if r.status_code == 200:
            ct = r.headers.get("Content-Type", "image/png")
            return func.HttpResponse(
                r.content,
                status_code=200,
                mimetype=ct,
                headers={
                    "Cache-Control": "public, max-age=3600",
                    "Access-Control-Allow-Origin": "*"
                }
            )
        return func.HttpResponse("Image download failed", status_code=502)
    except Exception as e:
        logging.error(f"[MetaCatalog] Image proxy error: {e}")
        return func.HttpResponse(f"Error: {str(e)}", status_code=500)

# ---------- Main handler ----------
def main(req: func.HttpRequest) -> func.HttpResponse:
    if req.method == "OPTIONS":
        return cors_preflight()
    
    if not META_ACCESS_TOKEN:
        return err("META_ACCESS_TOKEN not configured", 500)
    
    action = req.params.get("action", "")
    
    # Image proxy endpoint (GET)
    if action == "image" and req.method == "GET":
        return serve_image(req)
    
    # List products (GET)
    if req.method == "GET" and action != "image":
        products = meta_list_products()
        return ok({"success": True, "products": products, "count": len(products)})
    
    # Sync meals to catalog (POST)
    if req.method == "POST":
        try:
            body = req.get_json()
        except:
            return err("Invalid JSON body")
        
        meals = body.get("meals", [])
        if not meals:
            return err("No meals provided")
        
        # Determine base URL for image proxy
        base_url = SWA_BASE_URL
        if not base_url:
            # Try to detect from request
            host = req.headers.get("X-Forwarded-Host") or req.headers.get("Host", "")
            proto = req.headers.get("X-Forwarded-Proto", "https")
            if host:
                base_url = f"{proto}://{host}"
        
        products = build_meal_products(meals, base_url)
        
        results = []
        for p in products:
            status, resp = meta_create_product(p)
            results.append({
                "name": p["name"],
                "retailer_id": p["retailer_id"],
                "status": status,
                "success": 200 <= status < 300,
                "response": resp
            })
        
        success_count = sum(1 for r in results if r["success"])
        return ok({
            "success": True,
            "total": len(results),
            "succeeded": success_count,
            "failed": len(results) - success_count,
            "results": results
        })
    
    # Delete product (DELETE)
    if req.method == "DELETE":
        retailer_id = req.params.get("retailer_id", "")
        if not retailer_id:
            try:
                body = req.get_json()
                retailer_id = body.get("retailer_id", "")
            except:
                pass
        if not retailer_id:
            return err("retailer_id required")
        
        status, resp = meta_delete_product(retailer_id)
        return ok({"success": 200 <= status < 300, "response": resp})
    
    return err("Unknown request")
