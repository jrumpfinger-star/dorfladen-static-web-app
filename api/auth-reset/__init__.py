"""
Auth Reset API – Password reset flow.

Two actions via POST:
1. action=request: {email} → generates reset token, sends email with reset link
2. action=confirm: {token, passwort} → validates token, updates password hash

Admin action via POST:
3. action=admin-reset: {kunde_id, passwort} → directly sets new password (no token needed)
"""
import azure.functions as func
import json
import logging
import os
import secrets
import msal
import requests
import bcrypt
from datetime import datetime, timedelta


DEFAULT_URL_SETTING = "DV_DEFAULT_URL"
DEFAULT_URL_FALLBACK = "https://orgab4e2f00.crm16.dynamics.com"
ENTITY_SET = "dl_shopkundes"
TOKEN_EXPIRY_MINUTES = 60  # Reset token valid for 1 hour


def get_token():
    from shared.dataverse import get_tenant_id, get_client_id
    tenant_id = get_tenant_id()
    client_id = get_client_id()
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
    except Exception:
        return None


def get_cors_headers():
    return {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "*",
        "Content-Type": "application/json; charset=utf-8",
    }


def _base_url():
    return os.environ.get(DEFAULT_URL_SETTING, DEFAULT_URL_FALLBACK)


def _headers(token):
    return {
        "Authorization": f"Bearer {token}",
        "OData-MaxVersion": "4.0",
        "OData-Version": "4.0",
        "Accept": "application/json",
        "Content-Type": "application/json; charset=utf-8",
    }


def _hash_password(pw):
    return bcrypt.hashpw(pw.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def _send_reset_email(to_email, to_name, reset_link):
    """Send password reset email via shop-notify's send_email."""
    try:
        from shop_notify_helper import send_email, get_contact_info
        ci = get_contact_info()
        laden_name = ci["name"]
    except Exception:
        laden_name = "Dorfladen Oberornau"

    subject = f"{laden_name} – Passwort zurücksetzen"
    anrede = f"Liebe/r {to_name}" if to_name else "Liebe Kundin, lieber Kunde"
    body_text = (
        f"{anrede},\n\n"
        f"Sie haben angefordert, Ihr Passwort zurückzusetzen.\n\n"
        f"Klicken Sie auf den folgenden Link, um ein neues Passwort festzulegen:\n\n"
        f"  • {reset_link}\n\n"
        f"Dieser Link ist {TOKEN_EXPIRY_MINUTES} Minuten gültig.\n\n"
        f"Falls Sie diese Anfrage nicht gestellt haben, können Sie diese E-Mail ignorieren. "
        f"Ihr Passwort bleibt unverändert.\n\n"
        f"Herzliche Grüße\n"
        f"Ihr {laden_name}-Team"
    )

    # Use Microsoft Graph directly (same as shop-notify)
    from datetime import datetime as dt

    def _get_graph_token():
        from shared.dataverse import get_tenant_id, get_client_id
        tenant_id = get_tenant_id()
        client_id = get_client_id()
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
        except Exception:
            return None

    graph_token = _get_graph_token()
    if not graph_token:
        logging.warning("[auth-reset] No Graph token for email")
        return False

    # Import build_email_html from shop-notify if possible, otherwise simple HTML
    try:
        import importlib.util
        spec = importlib.util.spec_from_file_location(
            "shop_notify",
            os.path.join(os.path.dirname(__file__), "..", "shop-notify", "__init__.py")
        )
        mod = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(mod)
        email_html = mod.build_email_html(body_text, subject)
    except Exception:
        # Fallback simple HTML
        email_html = f"<html><body><h2>{subject}</h2><p>{body_text.replace(chr(10), '<br>')}</p></body></html>"

    sender_mailbox = os.environ.get("SHOP_SENDER_MAILBOX", "info@dorfladenoberornau.onmicrosoft.com")
    sender_name = laden_name

    mail_payload = {
        "message": {
            "subject": subject,
            "body": {"contentType": "HTML", "content": email_html},
            "from": {"emailAddress": {"address": sender_mailbox, "name": sender_name}},
            "toRecipients": [{"emailAddress": {"address": to_email, "name": to_name or to_email}}],
            "replyTo": [{"emailAddress": {"address": os.environ.get("SHOP_REPLY_TO", "bestellung@dorfladen-oberornau.de"), "name": sender_name}}],
        },
        "saveToSentItems": "true",
    }

    url = f"https://graph.microsoft.com/v1.0/users/{sender_mailbox}/sendMail"
    r = requests.post(url, json=mail_payload, headers={"Authorization": f"Bearer {graph_token}", "Content-Type": "application/json"}, timeout=30)
    if r.status_code in (200, 202):
        logging.info(f"[auth-reset] Reset email sent to {to_email}")
        return True
    else:
        logging.error(f"[auth-reset] Email failed ({r.status_code}): {r.text[:200]}")
        return False


def _request_reset(body, base_url, headers):
    """Generate reset token, store in Dataverse, send email."""
    email = (body.get("email") or "").strip().lower()
    if not email:
        return func.HttpResponse(
            json.dumps({"success": False, "error": "E-Mail erforderlich"}, ensure_ascii=False),
            status_code=400, headers=get_cors_headers(),
        )

    # Always return success to prevent email enumeration
    success_response = func.HttpResponse(
        json.dumps({"success": True, "message": "Falls ein Konto mit dieser E-Mail existiert, erhalten Sie in Kürze eine E-Mail mit einem Link zum Zurücksetzen."}, ensure_ascii=False),
        status_code=200, headers=get_cors_headers(),
    )

    # Find customer
    find_url = f"{base_url}/api/data/v9.2/{ENTITY_SET}?$filter=dl_email eq '{email}'&$select=dl_shopkundeid,dl_vorname,dl_nachname,dl_email,dl_aktiv"
    try:
        r = requests.get(find_url, headers=headers, timeout=30)
        if r.status_code != 200:
            return success_response
        customers = r.json().get("value", [])
        if not customers:
            return success_response  # Don't reveal if email exists
        kunde = customers[0]
        if not kunde.get("dl_aktiv", True):
            return success_response  # Don't reveal if account is inactive
    except Exception:
        return success_response

    # Generate secure token: timestamp|random (URL-safe)
    token = secrets.token_urlsafe(32)
    expiry = (datetime.utcnow() + timedelta(minutes=TOKEN_EXPIRY_MINUTES)).isoformat() + "Z"
    reset_value = json.dumps({"token": token, "expiry": expiry})

    # Store token in Dataverse
    kunde_id = kunde["dl_shopkundeid"]
    patch_headers = {**headers, "If-Match": "*"}
    try:
        requests.patch(
            f"{base_url}/api/data/v9.2/{ENTITY_SET}({kunde_id})",
            headers=patch_headers,
            json={"dl_reset_token": reset_value},
            timeout=30,
        )
    except Exception as e:
        logging.error(f"[auth-reset] Failed to store token: {e}")
        return success_response

    # Build reset link
    host = os.environ.get("SWA_HOSTNAME", "") or os.environ.get("WEBSITE_HOSTNAME", "www.dorfladen-oberornau.de")
    protocol = "https" if "azurestaticapps" in host or "azure" in host or "dorfladen" in host else "http"
    reset_link = f"{protocol}://{host}/shop.html?reset_token={token}&email={email}"

    # Send email
    vorname = kunde.get("dl_vorname", "")
    nachname = kunde.get("dl_nachname", "")
    name = f"{vorname} {nachname}".strip()
    _send_reset_email(email, name, reset_link)

    return success_response


def _confirm_reset(body, base_url, headers):
    """Validate reset token and set new password."""
    token = (body.get("token") or "").strip()
    email = (body.get("email") or "").strip().lower()
    passwort = (body.get("passwort") or "").strip()

    if not token or not email or not passwort:
        return func.HttpResponse(
            json.dumps({"success": False, "error": "Token, E-Mail und neues Passwort erforderlich"}, ensure_ascii=False),
            status_code=400, headers=get_cors_headers(),
        )

    if len(passwort) < 8:
        return func.HttpResponse(
            json.dumps({"success": False, "error": "Passwort muss mindestens 8 Zeichen haben"}, ensure_ascii=False),
            status_code=400, headers=get_cors_headers(),
        )

    # Find customer by email
    find_url = f"{base_url}/api/data/v9.2/{ENTITY_SET}?$filter=dl_email eq '{email}'&$select=dl_shopkundeid,dl_reset_token,dl_aktiv"
    try:
        r = requests.get(find_url, headers=headers, timeout=30)
        if r.status_code != 200:
            return func.HttpResponse(
                json.dumps({"success": False, "error": "Server-Fehler"}, ensure_ascii=False),
                status_code=500, headers=get_cors_headers(),
            )
        customers = r.json().get("value", [])
        if not customers:
            return func.HttpResponse(
                json.dumps({"success": False, "error": "Ungültiger oder abgelaufener Link"}, ensure_ascii=False),
                status_code=400, headers=get_cors_headers(),
            )
    except Exception:
        return func.HttpResponse(
            json.dumps({"success": False, "error": "Server-Fehler"}, ensure_ascii=False),
            status_code=500, headers=get_cors_headers(),
        )

    kunde = customers[0]
    kunde_id = kunde["dl_shopkundeid"]

    # Validate token
    stored_raw = kunde.get("dl_reset_token", "")
    if not stored_raw:
        return func.HttpResponse(
            json.dumps({"success": False, "error": "Ungültiger oder abgelaufener Link"}, ensure_ascii=False),
            status_code=400, headers=get_cors_headers(),
        )

    try:
        stored = json.loads(stored_raw)
    except Exception:
        return func.HttpResponse(
            json.dumps({"success": False, "error": "Ungültiger oder abgelaufener Link"}, ensure_ascii=False),
            status_code=400, headers=get_cors_headers(),
        )

    # Check token match
    if not secrets.compare_digest(stored.get("token", ""), token):
        return func.HttpResponse(
            json.dumps({"success": False, "error": "Ungültiger oder abgelaufener Link"}, ensure_ascii=False),
            status_code=400, headers=get_cors_headers(),
        )

    # Check expiry
    try:
        expiry = datetime.fromisoformat(stored["expiry"].replace("Z", "+00:00")).replace(tzinfo=None)
        if datetime.utcnow() > expiry:
            return func.HttpResponse(
                json.dumps({"success": False, "error": "Der Link ist abgelaufen. Bitte fordern Sie einen neuen an."}, ensure_ascii=False),
                status_code=400, headers=get_cors_headers(),
            )
    except Exception:
        pass  # If expiry parsing fails, allow the reset (token was valid)

    # Update password and clear reset token
    pw_hash = _hash_password(passwort)
    patch_headers = {**headers, "If-Match": "*"}
    try:
        rp = requests.patch(
            f"{base_url}/api/data/v9.2/{ENTITY_SET}({kunde_id})",
            headers=patch_headers,
            json={"dl_passwort_hash": pw_hash, "dl_reset_token": ""},
            timeout=30,
        )
        if rp.status_code not in (200, 204):
            return func.HttpResponse(
                json.dumps({"success": False, "error": "Fehler beim Speichern"}, ensure_ascii=False),
                status_code=500, headers=get_cors_headers(),
            )
    except Exception as e:
        return func.HttpResponse(
            json.dumps({"success": False, "error": str(e)}, ensure_ascii=False),
            status_code=500, headers=get_cors_headers(),
        )

    logging.info(f"[auth-reset] Password reset successful for {email}")
    return func.HttpResponse(
        json.dumps({"success": True, "message": "Passwort erfolgreich geändert. Sie können sich jetzt anmelden."}, ensure_ascii=False),
        status_code=200, headers=get_cors_headers(),
    )


def _admin_reset(body, base_url, headers):
    """Admin sets new password directly for a customer."""
    kunde_id = (body.get("kunde_id") or "").strip()
    passwort = (body.get("passwort") or "").strip()

    if not kunde_id or not passwort:
        return func.HttpResponse(
            json.dumps({"success": False, "error": "kunde_id und passwort erforderlich"}, ensure_ascii=False),
            status_code=400, headers=get_cors_headers(),
        )

    if len(passwort) < 8:
        return func.HttpResponse(
            json.dumps({"success": False, "error": "Passwort muss mindestens 8 Zeichen haben"}, ensure_ascii=False),
            status_code=400, headers=get_cors_headers(),
        )

    pw_hash = _hash_password(passwort)
    patch_headers = {**headers, "If-Match": "*"}
    try:
        rp = requests.patch(
            f"{base_url}/api/data/v9.2/{ENTITY_SET}({kunde_id})",
            headers=patch_headers,
            json={"dl_passwort_hash": pw_hash, "dl_reset_token": ""},
            timeout=30,
        )
        if rp.status_code not in (200, 204):
            return func.HttpResponse(
                json.dumps({"success": False, "error": f"Dataverse {rp.status_code}"}, ensure_ascii=False),
                status_code=rp.status_code, headers=get_cors_headers(),
            )
    except Exception as e:
        return func.HttpResponse(
            json.dumps({"success": False, "error": str(e)}, ensure_ascii=False),
            status_code=500, headers=get_cors_headers(),
        )

    logging.info(f"[auth-reset] Admin password reset for kunde {kunde_id}")
    return func.HttpResponse(
        json.dumps({"success": True, "message": "Passwort wurde zurückgesetzt"}, ensure_ascii=False),
        status_code=200, headers=get_cors_headers(),
    )


def main(req: func.HttpRequest) -> func.HttpResponse:
    if req.method == "OPTIONS":
        return func.HttpResponse(status_code=200, headers=get_cors_headers())

    try:
        body = req.get_json()
    except Exception:
        return func.HttpResponse(
            json.dumps({"success": False, "error": "Ungültiger JSON-Body"}, ensure_ascii=False),
            status_code=400, headers=get_cors_headers(),
        )

    action = (body.get("action") or "").strip().lower()
    if action not in ("request", "confirm", "admin-reset"):
        return func.HttpResponse(
            json.dumps({"success": False, "error": "action muss 'request', 'confirm' oder 'admin-reset' sein"}, ensure_ascii=False),
            status_code=400, headers=get_cors_headers(),
        )

    dv_token = get_token()
    if not dv_token:
        return func.HttpResponse(
            json.dumps({"success": False, "error": "Server-Auth-Fehler"}, ensure_ascii=False),
            status_code=500, headers=get_cors_headers(),
        )

    base_url = _base_url()
    headers = _headers(dv_token)

    if action == "request":
        return _request_reset(body, base_url, headers)
    elif action == "confirm":
        return _confirm_reset(body, base_url, headers)
    elif action == "admin-reset":
        return _admin_reset(body, base_url, headers)
