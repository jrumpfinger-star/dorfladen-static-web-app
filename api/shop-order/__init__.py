"""
Shop Order API
POST: Place a new order (requires JWT)
GET: Fetch orders (customer: own orders; CMS: all orders)
PATCH: Update order status (CMS only)

Bestellschluss: 16:00 Uhr → Abholung nächster Tag vormittags
Nach 16 Uhr → Abholung übernächster Tag vormittags
"""
import azure.functions as func
import json
import os
import uuid
import msal
import requests
import jwt
from datetime import datetime, timedelta


DEFAULT_URL_SETTING = "DV_DEFAULT_URL"
DEFAULT_URL_FALLBACK = "https://orgab4e2f00.crm16.dynamics.com"
ENTITY_SET = "dl_shopbestellungs"
JWT_SECRET = os.environ.get("SHOP_JWT_SECRET", "dorfladen-shop-secret-change-in-production-2026")

# Order statuses
STATUS_NEU = 0
STATUS_IN_BEARBEITUNG = 1
STATUS_ABHOLBEREIT = 2
STATUS_ABGEHOLT = 3
STATUS_STORNIERT = 4

STATUS_LABELS = {0: "Neu", 1: "In Bearbeitung", 2: "Abholbereit", 3: "Abgeholt", 4: "Storniert"}
BESTELLSCHLUSS_HOUR = 16  # 16:00 Uhr


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


def get_cors_headers():
    return {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, POST, PATCH, OPTIONS",
        "Access-Control-Allow-Headers": "*",
        "Content-Type": "application/json; charset=utf-8"
    }


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


def _verify_jwt(req):
    """Extract and verify JWT from Authorization header."""
    auth = req.headers.get("Authorization", "")
    if not auth.startswith("Bearer "):
        return None
    try:
        return jwt.decode(auth[7:], JWT_SECRET, algorithms=["HS256"])
    except:
        return None


def _calc_abholdatum():
    """Calculate pickup date based on order time.
    Before 16:00 → next business day morning
    After 16:00 → day after next business day morning
    Skip Sundays (Dorfladen closed)
    """
    now = datetime.utcnow() + timedelta(hours=2)  # CET/CEST approximation
    hour = now.hour

    if hour < BESTELLSCHLUSS_HOUR:
        # Before cutoff: pickup tomorrow
        abhol = now + timedelta(days=1)
    else:
        # After cutoff: pickup day after tomorrow
        abhol = now + timedelta(days=2)

    # Skip Sunday (6 = Sunday)
    if abhol.weekday() == 6:
        abhol += timedelta(days=1)

    return abhol.strftime("%Y-%m-%d")


def _generate_bestellnummer():
    """Generate unique order number: DL-YYYYMMDD-XXXX"""
    now = datetime.utcnow() + timedelta(hours=2)
    return f"DL-{now.strftime('%Y%m%d')}-{uuid.uuid4().hex[:4].upper()}"


def _handle_post(req, dv_token, base_url, headers):
    """Place a new order."""
    user = _verify_jwt(req)
    if not user:
        return func.HttpResponse(
            json.dumps({"success": False, "error": "Bitte melden Sie sich an."}, ensure_ascii=False),
            status_code=401, headers=get_cors_headers()
        )

    try:
        body = req.get_json()
    except:
        return func.HttpResponse(
            json.dumps({"success": False, "error": "Ungültiger JSON-Body"}),
            status_code=400, headers=get_cors_headers()
        )

    positionen = body.get("positionen", [])
    anmerkungen = (body.get("anmerkungen") or "").strip()

    if not positionen:
        return func.HttpResponse(
            json.dumps({"success": False, "error": "Warenkorb ist leer."}, ensure_ascii=False),
            status_code=400, headers=get_cors_headers()
        )

    # Validate positions and calculate total
    gesamtsumme = 0
    clean_positionen = []
    for pos in positionen:
        artnr = (pos.get("artikelnummer") or "").strip()
        bezeichnung = (pos.get("bezeichnung") or "").strip()
        menge = pos.get("menge", 0)
        einheit = (pos.get("einheit") or "Stück").strip()
        einzelpreis = pos.get("einzelpreis", 0)

        if not bezeichnung or menge <= 0:
            continue

        positionspreis = round(einzelpreis * menge, 2)
        gesamtsumme += positionspreis
        clean_positionen.append({
            "artikelnummer": artnr,
            "bezeichnung": bezeichnung,
            "menge": menge,
            "einheit": einheit,
            "einzelpreis": einzelpreis,
            "positionspreis": positionspreis
        })

    if not clean_positionen:
        return func.HttpResponse(
            json.dumps({"success": False, "error": "Keine gültigen Positionen im Warenkorb."}, ensure_ascii=False),
            status_code=400, headers=get_cors_headers()
        )

    bestellnummer = _generate_bestellnummer()
    abholdatum = _calc_abholdatum()
    now_str = (datetime.utcnow() + timedelta(hours=2)).strftime("%Y-%m-%d %H:%M")

    payload = {
        "dl_bestellnummer": bestellnummer,
        "dl_kunde_email": user["email"],
        "dl_kunde_name": user.get("name", ""),
        "dl_kunde_id": user["sub"],
        "dl_bestelldatum": now_str,
        "dl_abholdatum": abholdatum,
        "dl_status": STATUS_NEU,
        "dl_gesamtsumme": round(gesamtsumme, 2),
        "dl_anmerkungen": anmerkungen,
        "dl_positionen_json": json.dumps(clean_positionen, ensure_ascii=False)
    }

    try:
        post_headers = {**headers, "Prefer": "return=representation"}
        r = requests.post(f"{base_url}/api/data/v9.2/{ENTITY_SET}", headers=post_headers, json=payload, timeout=30)
        if r.status_code in (200, 201):
            record = r.json()
            return func.HttpResponse(
                json.dumps({
                    "success": True,
                    "bestellnummer": bestellnummer,
                    "abholdatum": abholdatum,
                    "gesamtsumme": round(gesamtsumme, 2),
                    "positionen": len(clean_positionen),
                    "message": f"Bestellung {bestellnummer} aufgegeben! Abholung am {abholdatum} vormittags."
                }, ensure_ascii=False),
                status_code=201, headers=get_cors_headers()
            )
        elif r.status_code == 204:
            return func.HttpResponse(
                json.dumps({
                    "success": True,
                    "bestellnummer": bestellnummer,
                    "abholdatum": abholdatum,
                    "gesamtsumme": round(gesamtsumme, 2),
                    "message": f"Bestellung {bestellnummer} aufgegeben!"
                }, ensure_ascii=False),
                status_code=201, headers=get_cors_headers()
            )
        else:
            return func.HttpResponse(
                json.dumps({"success": False, "error": f"Dataverse {r.status_code}", "detail": r.text[:300]}),
                status_code=500, headers=get_cors_headers()
            )
    except Exception as e:
        return func.HttpResponse(
            json.dumps({"success": False, "error": str(e)}),
            status_code=500, headers=get_cors_headers()
        )


def _handle_get(req, dv_token, base_url, headers):
    """Fetch orders. ?mode=cms → all orders. Otherwise: customer's own orders."""
    mode = req.params.get("mode", "")
    user = _verify_jwt(req)

    if mode == "cms":
        # CMS mode: return all orders (no JWT required for now, add admin check later)
        url = f"{base_url}/api/data/v9.2/{ENTITY_SET}?$select=dl_shopbestellungid,dl_bestellnummer,dl_kunde_email,dl_kunde_name,dl_bestelldatum,dl_abholdatum,dl_status,dl_gesamtsumme,dl_anmerkungen,dl_positionen_json&$orderby=createdon desc&$top=200"
    elif user:
        # Customer mode: own orders
        email = user["email"]
        url = f"{base_url}/api/data/v9.2/{ENTITY_SET}?$filter=dl_kunde_email eq '{email}'&$select=dl_shopbestellungid,dl_bestellnummer,dl_bestelldatum,dl_abholdatum,dl_status,dl_gesamtsumme,dl_anmerkungen,dl_positionen_json&$orderby=createdon desc&$top=50"
    else:
        return func.HttpResponse(
            json.dumps({"success": False, "error": "Bitte melden Sie sich an."}),
            status_code=401, headers=get_cors_headers()
        )

    try:
        r = requests.get(url, headers=headers, timeout=30)
        if r.status_code == 200:
            items = r.json().get("value", [])
            orders = []
            for item in items:
                positionen = []
                try:
                    positionen = json.loads(item.get("dl_positionen_json", "[]"))
                except:
                    pass
                orders.append({
                    "id": item.get("dl_shopbestellungid", ""),
                    "bestellnummer": item.get("dl_bestellnummer", ""),
                    "kunde_email": item.get("dl_kunde_email", ""),
                    "kunde_name": item.get("dl_kunde_name", ""),
                    "bestelldatum": item.get("dl_bestelldatum", ""),
                    "abholdatum": item.get("dl_abholdatum", ""),
                    "status": item.get("dl_status", 0),
                    "status_text": STATUS_LABELS.get(item.get("dl_status", 0), "Unbekannt"),
                    "gesamtsumme": item.get("dl_gesamtsumme", 0),
                    "anmerkungen": item.get("dl_anmerkungen", ""),
                    "positionen": positionen
                })
            return func.HttpResponse(
                json.dumps({"success": True, "orders": orders}, ensure_ascii=False),
                status_code=200, headers=get_cors_headers()
            )
        return func.HttpResponse(
            json.dumps({"success": False, "error": f"Dataverse {r.status_code}"}),
            status_code=r.status_code, headers=get_cors_headers()
        )
    except Exception as e:
        return func.HttpResponse(
            json.dumps({"success": False, "error": str(e)}),
            status_code=500, headers=get_cors_headers()
        )


def _handle_patch(req, dv_token, base_url, headers):
    """Update order status (CMS)."""
    try:
        body = req.get_json()
    except:
        return func.HttpResponse(
            json.dumps({"success": False, "error": "Ungültiger JSON-Body"}),
            status_code=400, headers=get_cors_headers()
        )

    order_id = (body.get("id") or "").strip()
    new_status = body.get("status")

    if not order_id or new_status is None:
        return func.HttpResponse(
            json.dumps({"success": False, "error": "id und status erforderlich"}),
            status_code=400, headers=get_cors_headers()
        )

    patch_url = f"{base_url}/api/data/v9.2/{ENTITY_SET}({order_id})"
    patch_payload = {"dl_status": new_status}
    patch_headers = {**headers, "If-Match": "*"}

    try:
        r = requests.patch(patch_url, headers=patch_headers, json=patch_payload, timeout=30)
        if r.status_code in (200, 204):
            return func.HttpResponse(
                json.dumps({"success": True, "status": new_status, "status_text": STATUS_LABELS.get(new_status, "")}, ensure_ascii=False),
                status_code=200, headers=get_cors_headers()
            )
        return func.HttpResponse(
            json.dumps({"success": False, "error": f"Dataverse {r.status_code}"}),
            status_code=r.status_code, headers=get_cors_headers()
        )
    except Exception as e:
        return func.HttpResponse(
            json.dumps({"success": False, "error": str(e)}),
            status_code=500, headers=get_cors_headers()
        )


def main(req: func.HttpRequest) -> func.HttpResponse:
    if req.method == "OPTIONS":
        return func.HttpResponse(status_code=200, headers=get_cors_headers())

    dv_token = get_token()
    if not dv_token:
        return func.HttpResponse(
            json.dumps({"success": False, "error": "Server-Auth-Fehler"}),
            status_code=500, headers=get_cors_headers()
        )

    base_url = _base_url()
    headers = _headers(dv_token)

    if req.method == "POST":
        return _handle_post(req, dv_token, base_url, headers)
    elif req.method == "GET":
        return _handle_get(req, dv_token, base_url, headers)
    elif req.method == "PATCH":
        return _handle_patch(req, dv_token, base_url, headers)

    return func.HttpResponse(
        json.dumps({"success": False, "error": "Methode nicht unterstützt"}),
        status_code=405, headers=get_cors_headers()
    )
