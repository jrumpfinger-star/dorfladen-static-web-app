"""
Shop Notify API – Send push/email notification when order is ready for pickup.
Called from CMS when order status changes to "Abholbereit" (status 2).

POST: {order_id, bestellnummer, kunde_email, kunde_name}
Uses existing push-send infrastructure for web push.
"""
import azure.functions as func
import json
import os
import msal
import requests


DEFAULT_URL_SETTING = "DV_DEFAULT_URL"
DEFAULT_URL_FALLBACK = "https://orgab4e2f00.crm16.dynamics.com"

# Fallback contact info (overridden by Dataverse config key "shop_kontakt")
CONTACT_DEFAULTS = {
    "name": "Dorfladen Oberornau",
    "adresse": "Dorfplatz 1 · 84419 Obertaufkirchen",
    "telefon": "08082 / 622 99 91",
    "telefon_link": "+4980826229991",
    "email": "bestellung@dorfladen-oberornau.de",
    "website": "www.dorfladen-oberornau.de",
    "website_url": "https://www.dorfladen-oberornau.de",
    "shop_url": "https://www.dorfladen-oberornau.de/shop.html",
    "logo_url": "https://www.dorfladen-oberornau.de/images/dorfladen-logo.png",
    "mailbox": "info@dorfladenoberornau.onmicrosoft.com",
    "reply_to": "bestellung@dorfladen-oberornau.de",
    "slogan": "Ihr Nahversorger"
}

# Cache for Dataverse config (loaded once per function cold start)
_contact_cache = None


def get_contact_info():
    """Load shop contact info from Dataverse (key: shop_kontakt), fallback to defaults."""
    global _contact_cache
    if _contact_cache is not None:
        return _contact_cache

    import logging
    try:
        token = get_token()
        if not token:
            raise Exception("No Dataverse token")

        base_url = os.environ.get(DEFAULT_URL_SETTING, DEFAULT_URL_FALLBACK)
        headers = {
            "Authorization": f"Bearer {token}",
            "OData-MaxVersion": "4.0",
            "OData-Version": "4.0",
            "Accept": "application/json",
        }

        url = f"{base_url}/api/data/v9.2/dl_seiteninhalts?$filter=dl_schluessel eq 'shop_kontakt'&$select=dl_wert"
        r = requests.get(url, headers=headers, timeout=15)
        if r.status_code == 200:
            items = (r.json() or {}).get("value", [])
            if items and items[0].get("dl_wert"):
                dv_config = json.loads(items[0]["dl_wert"])
                merged = {**CONTACT_DEFAULTS, **dv_config}
                _contact_cache = merged
                logging.info("[shop-notify] Contact info loaded from Dataverse")
                return merged
    except Exception as e:
        logging.warning(f"[shop-notify] Could not load contact from Dataverse: {e}")

    _contact_cache = CONTACT_DEFAULTS.copy()
    return _contact_cache


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


def get_graph_token():
    """Get Microsoft Graph token for sending emails."""
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


def build_email_html(body_text, subject=""):
    """Build a branded HTML email with logo, header, styled body, and footer.
    All contact details are loaded from Dataverse (key: shop_kontakt)."""
    ci = get_contact_info()

    # Convert plain text lines to HTML paragraphs
    lines = body_text.split("\n")
    body_parts = []
    for line in lines:
        stripped = line.strip()
        if not stripped:
            body_parts.append('<div style="height:12px"></div>')
        elif stripped.startswith("•") or stripped.startswith("  •"):
            item_text = stripped.lstrip("• ").strip()
            body_parts.append(
                f'<div style="padding:6px 0 6px 16px;border-left:3px solid #2e7d4f">'
                f'<span style="color:#2e7d4f;font-weight:600">•</span> {item_text}</div>'
            )
        elif stripped.startswith("Grund:"):
            body_parts.append(
                f'<div style="background:#fef3c7;border:1px solid #fbbf24;border-radius:8px;'
                f'padding:10px 14px;margin:8px 0;font-weight:600;color:#92400e">'
                f'📋 {stripped}</div>'
            )
        elif stripped.startswith("Herzliche Grüße"):
            body_parts.append(
                f'<div style="margin-top:20px;color:#374151">{stripped}</div>'
            )
        elif stripped.startswith("Ihr Dorfladen") or stripped.startswith("Ihr " + ci["name"]):
            body_parts.append(
                f'<div style="font-weight:700;color:#2e7d4f;font-size:15px">{stripped}</div>'
            )
        else:
            body_parts.append(f'<div style="margin:4px 0;color:#1f2937">{stripped}</div>')

    body_html = "\n".join(body_parts)

    # Determine accent color based on subject
    accent_color = "#2e7d4f"
    icon = "📦"
    if "storniert" in subject.lower() or "storno" in subject.lower():
        accent_color = "#dc2626"
        icon = "❌"
    elif "abholbereit" in subject.lower() or "bereit" in subject.lower():
        accent_color = "#059669"
        icon = "✅"
    elif "nicht verfügbar" in subject.lower() or "fehlende" in subject.lower():
        accent_color = "#d97706"
        icon = "⚠️"

    return f'''<!DOCTYPE html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#f3f4f6;font-family:'Segoe UI',system-ui,-apple-system,sans-serif">
<div style="max-width:600px;margin:0 auto;padding:20px 16px">

  <!-- Header with logo -->
  <div style="background:#fff;border-radius:16px 16px 0 0;padding:24px 28px 16px;text-align:center;border-bottom:4px solid {accent_color}">
    <a href="{ci['website_url']}" style="text-decoration:none">
      <img src="{ci['logo_url']}" alt="{ci['name']}" style="height:60px;max-width:200px;margin-bottom:8px" />
    </a>
    <div style="font-size:11px;color:#6b7280;letter-spacing:1px;text-transform:uppercase;font-weight:600">
      {ci['name']} &middot; {ci['slogan']}
    </div>
  </div>

  <!-- Subject banner -->
  <div style="background:{accent_color};padding:14px 28px;color:#fff;font-size:16px;font-weight:700">
    {icon} {subject}
  </div>

  <!-- Body content -->
  <div style="background:#fff;padding:24px 28px;font-size:14px;line-height:1.7;color:#1f2937">
    {body_html}
  </div>

  <!-- CTA Button -->
  <div style="background:#fff;padding:0 28px 24px;text-align:center">
    <a href="{ci['shop_url']}" style="display:inline-block;padding:12px 28px;background:{accent_color};color:#fff;
       text-decoration:none;border-radius:10px;font-weight:700;font-size:14px;margin-top:8px">
      🛒 Zum Dorfladen-Shop
    </a>
  </div>

  <!-- Footer -->
  <div style="background:#1f2937;border-radius:0 0 16px 16px;padding:20px 28px;color:#d1d5db;font-size:12px;line-height:1.6">
    <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px">
      <span style="font-size:18px">🏪</span>
      <span style="font-weight:700;color:#fff;font-size:13px">{ci['name']}</span>
    </div>
    <div>{ci['adresse']}</div>
    <div>Tel: <a href="tel:{ci['telefon_link']}" style="color:#93c5fd;text-decoration:none">{ci['telefon']}</a></div>
    <div>
      <a href="mailto:{ci['email']}" style="color:#93c5fd;text-decoration:none">{ci['email']}</a>
      &middot;
      <a href="{ci['website_url']}" style="color:#93c5fd;text-decoration:none">{ci['website']}</a>
    </div>
    <div style="margin-top:12px;padding-top:10px;border-top:1px solid #374151;font-size:11px;color:#9ca3af">
      Diese E-Mail wurde automatisch erstellt. Bei Fragen antworten Sie einfach auf diese Mail.
    </div>
  </div>

</div>
</body></html>'''


def send_email(to_email, to_name, subject, body_text):
    """Send email via Microsoft Graph API. Contact info from Dataverse."""
    import logging
    token = get_graph_token()
    if not token:
        logging.warning("[shop-notify] No Graph token – cannot send email")
        return False, "No Graph token available"

    ci = get_contact_info()
    sender_mailbox = ci["mailbox"]
    sender_name = ci["name"]
    reply_to = ci["reply_to"]

    # Build branded HTML email
    email_html = build_email_html(body_text, subject)

    mail_payload = {
        "message": {
            "subject": subject,
            "body": {
                "contentType": "HTML",
                "content": email_html
            },
            "from": {
                "emailAddress": {
                    "address": sender_mailbox,
                    "name": sender_name
                }
            },
            "toRecipients": [{
                "emailAddress": {"address": to_email, "name": to_name or to_email}
            }],
            "replyTo": [{
                "emailAddress": {
                    "address": reply_to,
                    "name": sender_name
                }
            }]
        },
        "saveToSentItems": "true"
    }

    url = f"https://graph.microsoft.com/v1.0/users/{sender_mailbox}/sendMail"
    r = requests.post(
        url,
        json=mail_payload,
        headers={
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json"
        },
        timeout=30
    )

    if r.status_code in (200, 202):
        logging.info(f"[shop-notify] Email sent to {to_email}: {subject}")
        return True, "sent"
    else:
        err = r.text[:200] if r.text else str(r.status_code)
        logging.error(f"[shop-notify] Email failed ({r.status_code}): {err}")
        return False, f"Graph API error {r.status_code}: {err}"


def get_cors_headers():
    return {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "*",
        "Content-Type": "application/json; charset=utf-8"
    }


def main(req: func.HttpRequest) -> func.HttpResponse:
    if req.method == "OPTIONS":
        return func.HttpResponse(status_code=200, headers=get_cors_headers())

    try:
        body = req.get_json()
    except:
        return func.HttpResponse(
            json.dumps({"success": False, "error": "Invalid JSON"}),
            status_code=400, headers=get_cors_headers()
        )

    bestellnummer = body.get("bestellnummer", "")
    kunde_email = body.get("kunde_email", "")
    kunde_name = body.get("kunde_name", "")
    abholdatum_raw = body.get("abholdatum", "")
    # Format date to German dd.mm.yyyy
    abholdatum = abholdatum_raw
    if abholdatum_raw and len(abholdatum_raw) >= 10:
        try:
            parts = abholdatum_raw[:10].split("-")
            if len(parts) == 3:
                abholdatum = f"{parts[2]}.{parts[1]}.{parts[0]}"
        except Exception:
            pass
    notify_type = body.get("type", "ready")
    missing_items = body.get("missing_items", [])

    notifications_sent = []
    import logging

    storno_grund = body.get("storno_grund", "")
    anrede = f"Liebe/r {kunde_name}" if kunde_name else "Liebe Kundin, lieber Kunde"

    # Load contact info from Dataverse for dynamic email content
    ci = get_contact_info()
    laden_name = ci["name"]

    # ── Build email subject + body based on notification type ──
    email_subject = ""
    email_body = ""

    if notify_type == "cancelled":
        email_subject = f"{laden_name} – Ihre Bestellung {bestellnummer} wurde storniert"
        email_body = (
            f"{anrede},\n\n"
            f"leider müssen wir Ihnen mitteilen, dass Ihre Bestellung {bestellnummer} "
            f"storniert werden musste.\n\n"
            f"Grund: {storno_grund}\n\n"
            f"Selbstverständlich wurde Ihnen nichts berechnet.\n\n"
            f"Wir bitten um Ihr Verständnis und freuen uns, Sie bald wieder "
            f"im {laden_name} begrüßen zu dürfen!\n\n"
            f"Herzliche Grüße\n"
            f"Ihr {laden_name}-Team"
        )

    elif notify_type == "missing_items" and missing_items:
        items_list = "\n".join(f"  • {item}" for item in missing_items)
        email_subject = f"{laden_name} – Hinweis zu Ihrer Bestellung {bestellnummer}"
        email_body = (
            f"{anrede},\n\n"
            f"vielen Dank für Ihre Bestellung {bestellnummer}!\n\n"
            f"Leider sind folgende Artikel momentan nicht verfügbar:\n\n"
            f"{items_list}\n\n"
            f"Diese Artikel werden Ihnen selbstverständlich nicht berechnet. "
            f"Alle anderen Artikel Ihrer Bestellung liegen für Sie zur Abholung bereit.\n\n"
            f"Abholung: {abholdatum} vormittags im {laden_name}.\n\n"
            f"Wir bitten um Ihr Verständnis und freuen uns auf Ihren Besuch!\n\n"
            f"Herzliche Grüße\n"
            f"Ihr {laden_name}-Team"
        )

    elif notify_type == "ready":
        email_subject = f"{laden_name} – Ihre Bestellung {bestellnummer} ist abholbereit! 🏪"
        email_body = (
            f"{anrede},\n\n"
            f"gute Nachrichten! Ihre Bestellung {bestellnummer} wurde sorgfältig "
            f"zusammengestellt und liegt für Sie zur Abholung bereit.\n\n"
            f"📅 Abholung: {abholdatum} vormittags\n"
            f"📍 Ort: {laden_name}, {ci['adresse']}\n\n"
            f"Bitte holen Sie Ihre Bestellung bis 12:00 Uhr mittags ab.\n\n"
            f"Wir freuen uns auf Ihren Besuch!\n\n"
            f"Herzliche Grüße\n"
            f"Ihr {laden_name}-Team"
        )

    else:
        email_subject = f"{laden_name} – Bestellung {bestellnummer}"
        email_body = (
            f"{anrede},\n\n"
            f"es gibt Neuigkeiten zu Ihrer Bestellung {bestellnummer}.\n"
            f"Bitte schauen Sie in Ihrem Kundenkonto nach oder kontaktieren "
            f"Sie uns bei Fragen.\n\n"
            f"Herzliche Grüße\n"
            f"Ihr {laden_name}-Team"
        )

    logging.info(
        f"[shop-notify] type={notify_type} order={bestellnummer} "
        f"customer={kunde_email} subject={email_subject}"
    )

    # ── Send push notification for 'ready' type ──
    if notify_type == "ready":
        try:
            push_payload = {
                "title": "🏪 Bestellung abholbereit!",
                "body": f"Ihre Bestellung {bestellnummer} liegt für Sie bereit. Abholung: {abholdatum} vormittags.",
                "url": "/shop.html"
            }
            base_host = os.environ.get("WEBSITE_HOSTNAME", "localhost:7071")
            protocol = "https" if "azurestaticapps" in base_host or "azure" in base_host else "http"
            internal_url = f"{protocol}://{base_host}/api/push-send"
            r = requests.post(internal_url, json=push_payload, timeout=15)
            if r.status_code in (200, 201):
                notifications_sent.append("push")
        except Exception:
            pass  # Push is best-effort

    # ── Send email via Microsoft Graph ──
    email_sent = False
    email_error = ""
    if kunde_email and email_subject:
        try:
            email_sent, email_error = send_email(
                kunde_email, kunde_name, email_subject, email_body
            )
            if email_sent:
                notifications_sent.append(f"email_sent:{kunde_email}")
            else:
                notifications_sent.append(f"email_failed:{email_error}")
                logging.warning(f"[shop-notify] Email to {kunde_email} failed: {email_error}")
        except Exception as e:
            email_error = str(e)
            notifications_sent.append(f"email_error:{email_error}")
            logging.error(f"[shop-notify] Email exception: {e}")

    return func.HttpResponse(
        json.dumps({
            "success": True,
            "notifications": notifications_sent,
            "email_subject": email_subject,
            "email_body": email_body,
            "message": f"Benachrichtigung ({notify_type}) für {bestellnummer} gesendet"
        }, ensure_ascii=False),
        status_code=200, headers=get_cors_headers()
    )
