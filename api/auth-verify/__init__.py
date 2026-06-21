"""
Auth Verify API – Verify customer email address via token link.
GET: ?token=<verify_token>&email=<email>
Sets dl_email_verifiziert=True on the customer record.
"""
import azure.functions as func
import json
import logging
import os
import msal
import requests


DEFAULT_URL_SETTING = "DV_DEFAULT_URL"
DEFAULT_URL_FALLBACK = "https://orgab4e2f00.crm16.dynamics.com"
ENTITY_SET = "dl_shopkundes"


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
    except Exception:
        return None


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


def main(req: func.HttpRequest) -> func.HttpResponse:
    if req.method == "OPTIONS":
        return func.HttpResponse(
            status_code=200,
            headers={
                "Access-Control-Allow-Origin": "*",
                "Access-Control-Allow-Methods": "GET, OPTIONS",
                "Access-Control-Allow-Headers": "*",
            },
        )

    verify_token = (req.params.get("token") or "").strip()
    email = (req.params.get("email") or "").strip().lower()

    if not verify_token or not email:
        return _html_response(
            "Ungültiger Link",
            "Der Bestätigungslink ist ungültig. Bitte prüfen Sie den Link aus der E-Mail.",
            success=False,
        )

    dv_token = get_token()
    if not dv_token:
        return _html_response(
            "Serverfehler",
            "Authentifizierung fehlgeschlagen. Bitte versuchen Sie es später erneut.",
            success=False,
        )

    base_url = _base_url()
    headers = _headers(dv_token)

    # Find customer by email + verify_token
    filter_url = (
        f"{base_url}/api/data/v9.2/{ENTITY_SET}"
        f"?$filter=dl_email eq '{email}' and dl_verify_token eq '{verify_token}'"
        f"&$select=dl_shopkundeid,dl_email_verifiziert,dl_vorname"
    )

    try:
        r = requests.get(filter_url, headers=headers, timeout=30)
        if r.status_code != 200:
            logging.error(f"[auth-verify] Dataverse error: {r.status_code}")
            return _html_response(
                "Serverfehler",
                "Datenbankfehler. Bitte versuchen Sie es später erneut.",
                success=False,
            )

        records = r.json().get("value", [])
        if not records:
            return _html_response(
                "Link ungültig",
                "Der Bestätigungslink ist ungültig oder abgelaufen. "
                "Möglicherweise wurde Ihre E-Mail bereits bestätigt.",
                success=False,
            )

        kunde = records[0]
        kunde_id = kunde["dl_shopkundeid"]
        vorname = kunde.get("dl_vorname", "")
        already_verified = kunde.get("dl_email_verifiziert", False)

        if already_verified:
            return _html_response(
                "Bereits bestätigt",
                f"Hallo {vorname}! Ihre E-Mail-Adresse wurde bereits bestätigt. "
                "Sie können sich jetzt im Shop anmelden.",
                success=True,
            )

        # Set email as verified and clear verify_token
        patch_headers = {**headers, "If-Match": "*"}
        patch_url = f"{base_url}/api/data/v9.2/{ENTITY_SET}({kunde_id})"
        patch_data = {
            "dl_email_verifiziert": True,
            "dl_verify_token": "",
        }
        pr = requests.patch(patch_url, headers=patch_headers, json=patch_data, timeout=30)

        if pr.status_code in (200, 204):
            logging.info(f"[auth-verify] Email verified for {email}")
            return _html_response(
                "E-Mail bestätigt! ✅",
                f"Hallo {vorname}! Ihre E-Mail-Adresse wurde erfolgreich bestätigt. "
                "Sie können sich jetzt im Shop anmelden und bestellen.",
                success=True,
            )
        else:
            logging.error(f"[auth-verify] Patch failed: {pr.status_code} {pr.text[:200]}")
            return _html_response(
                "Fehler",
                "Die Bestätigung konnte nicht gespeichert werden. Bitte versuchen Sie es erneut.",
                success=False,
            )

    except Exception as e:
        logging.error(f"[auth-verify] Exception: {e}")
        return _html_response(
            "Fehler",
            "Ein unerwarteter Fehler ist aufgetreten. Bitte versuchen Sie es später erneut.",
            success=False,
        )


def _html_response(title, message, success=True):
    """Return a branded HTML page for the verification result."""
    color = "#2e7d4f" if success else "#dc2626"
    icon = "✅" if success else "❌"
    btn_html = ""
    if success:
        btn_html = (
            '<a href="/shop.html" style="display:inline-block;margin-top:20px;'
            "padding:12px 32px;background:#2e7d4f;color:#fff;text-decoration:none;"
            'border-radius:10px;font-weight:700;font-size:15px">Zum Shop →</a>'
        )

    html = f"""<!DOCTYPE html>
<html lang="de">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>{title} – Dorfladen Oberornau</title>
<style>
body{{font-family:'Segoe UI',system-ui,sans-serif;background:#f5f5f5;margin:0;padding:20px;display:flex;align-items:center;justify-content:center;min-height:100vh}}
.card{{background:#fff;border-radius:16px;box-shadow:0 4px 20px rgba(0,0,0,.1);max-width:420px;width:100%;padding:40px 32px;text-align:center}}
.icon{{font-size:48px;margin-bottom:16px}}
h1{{font-size:22px;color:{color};margin-bottom:12px}}
p{{font-size:15px;color:#4b5563;line-height:1.6}}
.logo{{margin-bottom:20px}}
</style>
</head>
<body>
<div class="card">
<div class="logo"><img src="/images/logo.png" alt="Dorfladen" style="height:50px" onerror="this.style.display='none'"></div>
<div class="icon">{icon}</div>
<h1>{title}</h1>
<p>{message}</p>
{btn_html}
</div>
</body>
</html>"""

    return func.HttpResponse(
        html,
        status_code=200,
        headers={"Content-Type": "text/html; charset=utf-8"},
    )
