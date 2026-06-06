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

SENDER_EMAIL = os.environ.get("SHOP_SENDER_EMAIL", "dorfladen@oberornau.de")


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


def send_email(to_email, to_name, subject, body_text):
    """Send email via Microsoft Graph API."""
    import logging
    token = get_graph_token()
    if not token:
        logging.warning("[shop-notify] No Graph token – cannot send email")
        return False, "No Graph token available"

    # Convert plain text to HTML for nicer formatting
    body_html = body_text.replace("\n", "<br>").replace("  •", "&nbsp;&nbsp;•")

    mail_payload = {
        "message": {
            "subject": subject,
            "body": {
                "contentType": "HTML",
                "content": (
                    f'<div style="font-family:Segoe UI,system-ui,sans-serif;font-size:14px;'
                    f'color:#1f2937;line-height:1.6;max-width:600px">{body_html}</div>'
                )
            },
            "toRecipients": [{
                "emailAddress": {"address": to_email, "name": to_name or to_email}
            }]
        },
        "saveToSentItems": "true"
    }

    url = f"https://graph.microsoft.com/v1.0/users/{SENDER_EMAIL}/sendMail"
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
    abholdatum = body.get("abholdatum", "")
    notify_type = body.get("type", "ready")
    missing_items = body.get("missing_items", [])

    notifications_sent = []
    import logging

    storno_grund = body.get("storno_grund", "")
    anrede = f"Liebe/r {kunde_name}" if kunde_name else "Liebe Kundin, lieber Kunde"

    # ── Build email subject + body based on notification type ──
    email_subject = ""
    email_body = ""

    if notify_type == "cancelled":
        email_subject = f"Dorfladen Oberornau – Ihre Bestellung {bestellnummer} wurde storniert"
        email_body = (
            f"{anrede},\n\n"
            f"leider müssen wir Ihnen mitteilen, dass Ihre Bestellung {bestellnummer} "
            f"storniert werden musste.\n\n"
            f"Grund: {storno_grund}\n\n"
            f"Selbstverständlich wurde Ihnen nichts berechnet.\n\n"
            f"Wir bitten um Ihr Verständnis und freuen uns, Sie bald wieder "
            f"im Dorfladen Oberornau begrüßen zu dürfen!\n\n"
            f"Herzliche Grüße\n"
            f"Ihr Dorfladen-Team Oberornau\n"
            f"Dorfstraße · 84416 Taufkirchen (Vils)\n"
            f"dorfladen@oberornau.de"
        )

    elif notify_type == "missing_items" and missing_items:
        items_list = "\n".join(f"  • {item}" for item in missing_items)
        email_subject = f"Dorfladen Oberornau – Hinweis zu Ihrer Bestellung {bestellnummer}"
        email_body = (
            f"{anrede},\n\n"
            f"vielen Dank für Ihre Bestellung {bestellnummer}!\n\n"
            f"Leider sind folgende Artikel momentan nicht verfügbar:\n\n"
            f"{items_list}\n\n"
            f"Diese Artikel werden Ihnen selbstverständlich nicht berechnet. "
            f"Alle anderen Artikel Ihrer Bestellung liegen für Sie zur Abholung bereit.\n\n"
            f"Abholung: {abholdatum} vormittags im Dorfladen Oberornau.\n\n"
            f"Wir bitten um Ihr Verständnis und freuen uns auf Ihren Besuch!\n\n"
            f"Herzliche Grüße\n"
            f"Ihr Dorfladen-Team Oberornau\n"
            f"Dorfstraße · 84416 Taufkirchen (Vils)\n"
            f"dorfladen@oberornau.de"
        )

    elif notify_type == "ready":
        email_subject = f"Dorfladen Oberornau – Ihre Bestellung {bestellnummer} ist abholbereit! 🏪"
        email_body = (
            f"{anrede},\n\n"
            f"gute Nachrichten! Ihre Bestellung {bestellnummer} wurde sorgfältig "
            f"zusammengestellt und liegt für Sie zur Abholung bereit.\n\n"
            f"📅 Abholung: {abholdatum} vormittags\n"
            f"📍 Ort: Dorfladen Oberornau, Dorfstraße, 84416 Taufkirchen (Vils)\n\n"
            f"Bitte holen Sie Ihre Bestellung bis 12:00 Uhr mittags ab.\n\n"
            f"Wir freuen uns auf Ihren Besuch!\n\n"
            f"Herzliche Grüße\n"
            f"Ihr Dorfladen-Team Oberornau\n"
            f"dorfladen@oberornau.de"
        )

    else:
        email_subject = f"Dorfladen Oberornau – Bestellung {bestellnummer}"
        email_body = (
            f"{anrede},\n\n"
            f"es gibt Neuigkeiten zu Ihrer Bestellung {bestellnummer}.\n"
            f"Bitte schauen Sie in Ihrem Kundenkonto nach oder kontaktieren "
            f"Sie uns bei Fragen.\n\n"
            f"Herzliche Grüße\n"
            f"Ihr Dorfladen-Team Oberornau\n"
            f"dorfladen@oberornau.de"
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
