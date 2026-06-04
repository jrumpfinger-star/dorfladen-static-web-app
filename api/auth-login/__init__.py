"""
Auth Login API – Customer login with JWT token.
POST: {email, passwort}
Returns: {success, token, kunde: {id, vorname, nachname, email}}
"""
import azure.functions as func
import json
import os
import msal
import requests
import bcrypt
import jwt
from datetime import datetime, timedelta


DEFAULT_URL_SETTING = "DV_DEFAULT_URL"
DEFAULT_URL_FALLBACK = "https://orgab4e2f00.crm16.dynamics.com"
ENTITY_SET = "dl_shopkundes"
JWT_SECRET = os.environ.get("SHOP_JWT_SECRET", "dorfladen-shop-secret-change-in-production-2026")
JWT_EXPIRY_HOURS = 24


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
        "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
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


def _create_jwt(kunde_id, email, vorname, nachname):
    payload = {
        "sub": kunde_id,
        "email": email,
        "name": f"{vorname} {nachname}",
        "iat": datetime.utcnow(),
        "exp": datetime.utcnow() + timedelta(hours=JWT_EXPIRY_HOURS)
    }
    return jwt.encode(payload, JWT_SECRET, algorithm="HS256")


def verify_jwt(token_str):
    """Verify and decode a JWT token. Returns payload or None."""
    try:
        return jwt.decode(token_str, JWT_SECRET, algorithms=["HS256"])
    except:
        return None


def main(req: func.HttpRequest) -> func.HttpResponse:
    if req.method == "OPTIONS":
        return func.HttpResponse(status_code=200, headers=get_cors_headers())

    try:
        body = req.get_json()
    except:
        return func.HttpResponse(
            json.dumps({"success": False, "error": "Ungültiger JSON-Body"}),
            status_code=400, headers=get_cors_headers()
        )

    email = (body.get("email") or "").strip().lower()
    passwort = (body.get("passwort") or "").strip()

    if not email or not passwort:
        return func.HttpResponse(
            json.dumps({"success": False, "error": "E-Mail und Passwort erforderlich."}, ensure_ascii=False),
            status_code=400, headers=get_cors_headers()
        )

    dv_token = get_token()
    if not dv_token:
        return func.HttpResponse(
            json.dumps({"success": False, "error": "Server-Fehler"}),
            status_code=500, headers=get_cors_headers()
        )

    base_url = _base_url()
    headers = _headers(dv_token)

    # Find customer by email
    find_url = f"{base_url}/api/data/v9.2/{ENTITY_SET}?$filter=dl_email eq '{email}'&$select=dl_shopkundeid,dl_email,dl_vorname,dl_nachname,dl_passwort_hash,dl_email_verifiziert,dl_aktiv"
    try:
        r = requests.get(find_url, headers=headers, timeout=30)
        if r.status_code != 200:
            return func.HttpResponse(
                json.dumps({"success": False, "error": "Server-Fehler bei der Suche"}),
                status_code=500, headers=get_cors_headers()
            )

        customers = r.json().get("value", [])
        if not customers:
            return func.HttpResponse(
                json.dumps({"success": False, "error": "E-Mail oder Passwort ungültig."}, ensure_ascii=False),
                status_code=401, headers=get_cors_headers()
            )

        kunde = customers[0]

        # Check if account is active
        if not kunde.get("dl_aktiv", True):
            return func.HttpResponse(
                json.dumps({"success": False, "error": "Ihr Konto wurde deaktiviert. Bitte kontaktieren Sie den Dorfladen."}, ensure_ascii=False),
                status_code=403, headers=get_cors_headers()
            )

        # Verify password
        stored_hash = kunde.get("dl_passwort_hash", "")
        if not stored_hash or not bcrypt.checkpw(passwort.encode('utf-8'), stored_hash.encode('utf-8')):
            return func.HttpResponse(
                json.dumps({"success": False, "error": "E-Mail oder Passwort ungültig."}, ensure_ascii=False),
                status_code=401, headers=get_cors_headers()
            )

        # Check email verification
        email_verified = kunde.get("dl_email_verifiziert", False)

        # Create JWT
        kunde_id = kunde["dl_shopkundeid"]
        vorname = kunde.get("dl_vorname", "")
        nachname = kunde.get("dl_nachname", "")
        token = _create_jwt(kunde_id, email, vorname, nachname)

        return func.HttpResponse(
            json.dumps({
                "success": True,
                "token": token,
                "kunde": {
                    "id": kunde_id,
                    "vorname": vorname,
                    "nachname": nachname,
                    "email": email,
                    "email_verifiziert": email_verified
                }
            }, ensure_ascii=False),
            status_code=200, headers=get_cors_headers()
        )

    except Exception as e:
        return func.HttpResponse(
            json.dumps({"success": False, "error": str(e)}),
            status_code=500, headers=get_cors_headers()
        )
