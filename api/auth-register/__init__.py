"""
Auth Register API – Customer registration with SEPA mandate.
POST: {email, passwort, vorname, nachname, telefon, strasse, plz, ort, iban, kontoinhaber, sepa_zustimmung, dsgvo_zustimmung, agb_zustimmung}
"""
import azure.functions as func
import json
import logging
import os
import re
import uuid
import msal
import requests
import bcrypt
from datetime import datetime


DEFAULT_URL_SETTING = "DV_DEFAULT_URL"
DEFAULT_URL_FALLBACK = "https://orgab4e2f00.crm16.dynamics.com"
ENTITY_SET = "dl_shopkundes"

# SEPA-Gläubigerdaten
GLAEUBIGER_ID = "DE98ZZZ09999999999"  # Gläubiger-Identifikationsnummer (bei Bundesbank beantragt)
GLAEUBIGER_NAME = "Dorfladen Oberornau UG (haftungsbeschränkt)"
GLAEUBIGER_ADRESSE = "Dorfstraße 1, 84166 Adlkofen"
MANDAT_VERFALL_MONATE = 36  # SEPA-Mandat verfällt nach 36 Monaten Inaktivität


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


def _validate_iban(iban):
    """Basic IBAN validation (format + check digits)."""
    iban = iban.replace(" ", "").upper()
    if len(iban) < 15 or len(iban) > 34:
        return False
    if not re.match(r'^[A-Z]{2}\d{2}[A-Z0-9]+$', iban):
        return False
    # Move first 4 chars to end, convert letters to numbers
    rearranged = iban[4:] + iban[:4]
    numeric = ""
    for ch in rearranged:
        if ch.isdigit():
            numeric += ch
        else:
            numeric += str(ord(ch) - 55)
    return int(numeric) % 97 == 1


def _validate_email(email):
    return bool(re.match(r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$', email))


def _generate_mandatsreferenz():
    """Generate unique SEPA mandate reference: DL-YYYY-XXXXX"""
    now = datetime.utcnow()
    return f"DL-{now.year}-{uuid.uuid4().hex[:5].upper()}"


def _encrypt_iban(iban):
    """Simple reversible obfuscation for IBAN storage.
    In production, use proper AES-256 with a key from Azure Key Vault.
    For now: base64 + prefix marker so we know it's encrypted."""
    import base64
    clean = iban.replace(" ", "").upper()
    encoded = base64.b64encode(clean.encode()).decode()
    return f"ENC:{encoded}"


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

    # Extract and validate fields
    email = (body.get("email") or "").strip().lower()
    passwort = (body.get("passwort") or "").strip()
    vorname = (body.get("vorname") or "").strip()
    nachname = (body.get("nachname") or "").strip()
    telefon = (body.get("telefon") or "").strip()
    strasse = (body.get("strasse") or "").strip()
    plz = (body.get("plz") or "").strip()
    ort = (body.get("ort") or "").strip()
    iban = (body.get("iban") or "").strip()
    kontoinhaber = (body.get("kontoinhaber") or "").strip()
    sepa_zustimmung = body.get("sepa_zustimmung", False)
    dsgvo_zustimmung = body.get("dsgvo_zustimmung", False)
    agb_zustimmung = body.get("agb_zustimmung", False)

    errors = []
    if not _validate_email(email):
        errors.append("Bitte geben Sie eine gültige E-Mail-Adresse ein.")
    if len(passwort) < 8:
        errors.append("Das Passwort muss mindestens 8 Zeichen lang sein.")
    if not vorname:
        errors.append("Vorname ist erforderlich.")
    if not nachname:
        errors.append("Nachname ist erforderlich.")
    if not telefon:
        errors.append("Telefonnummer ist erforderlich.")
    if not strasse or not plz or not ort:
        errors.append("Vollständige Adresse ist erforderlich.")
    if not _validate_iban(iban):
        errors.append("Bitte geben Sie eine gültige IBAN ein.")
    if not kontoinhaber:
        errors.append("Kontoinhaber ist erforderlich.")
    if not sepa_zustimmung:
        errors.append("Bitte stimmen Sie dem SEPA-Lastschriftmandat zu.")
    if not dsgvo_zustimmung:
        errors.append("Bitte stimmen Sie der Datenschutzerklärung zu.")
    if not agb_zustimmung:
        errors.append("Bitte akzeptieren Sie die AGB.")

    if errors:
        return func.HttpResponse(
            json.dumps({"success": False, "errors": errors}, ensure_ascii=False),
            status_code=400, headers=get_cors_headers()
        )

    token = get_token()
    if not token:
        return func.HttpResponse(
            json.dumps({"success": False, "error": "Server-Authentifizierung fehlgeschlagen"}),
            status_code=500, headers=get_cors_headers()
        )

    base_url = _base_url()
    headers = _headers(token)

    # Check if email already registered
    check_url = f"{base_url}/api/data/v9.2/{ENTITY_SET}?$filter=dl_email eq '{email}'&$select=dl_shopkundeid,dl_email"
    try:
        check_r = requests.get(check_url, headers=headers, timeout=30)
        if check_r.status_code == 200:
            existing = check_r.json().get("value", [])
            if existing:
                return func.HttpResponse(
                    json.dumps({"success": False, "errors": ["Diese E-Mail-Adresse ist bereits registriert. Bitte melden Sie sich an."]}, ensure_ascii=False),
                    status_code=409, headers=get_cors_headers()
                )
    except:
        pass

    # Hash password
    pw_hash = bcrypt.hashpw(passwort.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

    # Generate verification token
    verify_token = uuid.uuid4().hex

    # Generate SEPA mandate reference
    mandatsreferenz = _generate_mandatsreferenz()

    # Encrypt IBAN
    iban_encrypted = _encrypt_iban(iban)

    # Create customer record
    now = datetime.utcnow()
    mandatsdatum = now.strftime("%Y-%m-%d")
    mandatsdatum_display = now.strftime("%d.%m.%Y")

    # Collect signing metadata for legal compliance
    client_ip = req.headers.get("X-Forwarded-For", req.headers.get("X-Real-IP", "unknown"))
    user_agent = req.headers.get("User-Agent", "unknown")

    # SEPA Mandate JSON with all legally required data
    sepa_mandat_json = json.dumps({
        "glaeubiger_id": GLAEUBIGER_ID,
        "glaeubiger_name": GLAEUBIGER_NAME,
        "glaeubiger_adresse": GLAEUBIGER_ADRESSE,
        "mandatsreferenz": mandatsreferenz,
        "mandatsdatum": mandatsdatum,
        "mandatstyp": "RCUR",  # Wiederkehrende Lastschrift
        "mandatsstatus": "aktiv",
        "kontoinhaber": kontoinhaber,
        "iban_masked": iban.replace(' ', '').upper()[:4] + '****' + iban.replace(' ', '').upper()[-4:],
        "unterschrift_digital": True,
        "unterschrift_ip": client_ip,
        "unterschrift_useragent": user_agent,
        "unterschrift_zeitpunkt": now.strftime("%Y-%m-%dT%H:%M:%SZ"),
        "vorabankuendigung_tage": 5,
        "letzte_lastschrift": None,
        "verfall_monate": MANDAT_VERFALL_MONATE,
    }, ensure_ascii=False)

    payload = {
        "dl_email": email,
        "dl_vorname": vorname,
        "dl_nachname": nachname,
        "dl_passwort_hash": pw_hash,
        "dl_telefon": telefon,
        "dl_strasse": strasse,
        "dl_plz": plz,
        "dl_ort": ort,
        "dl_iban_encrypted": iban_encrypted,
        "dl_kontoinhaber": kontoinhaber,
        "dl_mandatsreferenz": mandatsreferenz,
        "dl_mandatsdatum": mandatsdatum,
        "dl_mandatstyp": "RCUR",
        "dl_mandatsstatus": "aktiv",
        "dl_sepa_mandat_json": sepa_mandat_json,
        "dl_email_verifiziert": False,
        "dl_aktiv": True,
        "dl_verify_token": verify_token,
    }

    try:
        post_headers = {**headers, "Prefer": "return=representation"}
        r = requests.post(f"{base_url}/api/data/v9.2/{ENTITY_SET}", headers=post_headers, json=payload, timeout=30)
        if r.status_code in (200, 201):
            record = r.json()
            record_id = record.get("dl_shopkundeid", "")
            # TODO: Send verification email with verify_token
            return func.HttpResponse(
                json.dumps({
                    "success": True,
                    "message": "Registrierung erfolgreich! Bitte bestätigen Sie Ihre E-Mail-Adresse.",
                    "id": record_id,
                    "mandatsreferenz": mandatsreferenz,
                    "mandatsdatum": mandatsdatum_display,
                    "glaeubiger_id": GLAEUBIGER_ID,
                    "glaeubiger_name": GLAEUBIGER_NAME,
                    "verify_token": verify_token  # In production: only send via email
                }, ensure_ascii=False),
                status_code=201, headers=get_cors_headers()
            )
        elif r.status_code == 204:
            return func.HttpResponse(
                json.dumps({"success": True, "message": "Registrierung erfolgreich!", "mandatsreferenz": mandatsreferenz}, ensure_ascii=False),
                status_code=201, headers=get_cors_headers()
            )
        else:
            logging.error(f"Dataverse final error {r.status_code}: {r.text[:500]}")
            return func.HttpResponse(
                json.dumps({"success": False, "error": f"Dataverse-Fehler: {r.status_code}", "detail": r.text[:500]}, ensure_ascii=False),
                status_code=500, headers=get_cors_headers()
            )
    except Exception as e:
        return func.HttpResponse(
            json.dumps({"success": False, "error": str(e)}),
            status_code=500, headers=get_cors_headers()
        )
