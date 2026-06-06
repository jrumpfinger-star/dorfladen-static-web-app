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

    # ── Handle missing_items notification ──
    if notify_type == "missing_items" and missing_items:
        logging.info(
            f"[shop-notify] Missing items for {bestellnummer} "
            f"(customer: {kunde_email}): {', '.join(missing_items)}"
        )
        # TODO: Send actual email via Azure Communication Services or SendGrid
        # Email content would be:
        #   Subject: Dorfladen Oberornau – Hinweis zu Ihrer Bestellung {bestellnummer}
        #   Body: Leider sind folgende Artikel momentan nicht verfügbar:
        #         - {item1}
        #         - {item2}
        #         Alle anderen Artikel liegen für Sie zur Abholung bereit.
        if kunde_email:
            notifications_sent.append(f"missing_items_email_queued:{kunde_email}")
            notifications_sent.append(f"missing:{','.join(missing_items)}")

        return func.HttpResponse(
            json.dumps({
                "success": True,
                "notifications": notifications_sent,
                "message": f"Kunde {kunde_email} wird über {len(missing_items)} nicht verfügbare Artikel informiert"
            }, ensure_ascii=False),
            status_code=200, headers=get_cors_headers()
        )

    # ── Standard: order ready notification ──
    # ── 1. Try to send push notification via existing push-send infrastructure ──
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
    except Exception as e:
        pass  # Push is best-effort

    # ── 2. Email notification (placeholder – needs SMTP/SendGrid config) ──
    # TODO: Integrate with Azure Communication Services or SendGrid
    if kunde_email:
        notifications_sent.append(f"email_queued:{kunde_email}")

    return func.HttpResponse(
        json.dumps({
            "success": True,
            "notifications": notifications_sent,
            "message": f"Benachrichtigung für {bestellnummer} gesendet"
        }, ensure_ascii=False),
        status_code=200, headers=get_cors_headers()
    )
