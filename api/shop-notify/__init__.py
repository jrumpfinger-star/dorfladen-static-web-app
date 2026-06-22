"""
Shop Notify API – Send push/email notification when order is ready for pickup.
Called from CMS when order status changes to "Abholbereit" (status 2).

POST: {order_id, bestellnummer, kunde_email, kunde_name}
Uses existing push-send infrastructure for web push.
"""
import azure.functions as func
import json
import os
import re
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


# ── Lucide-style inline SVG icons for email (16x16, stroke-based) ──
_LUCIDE_ICONS = {
    "clipboard-list": '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="8" height="4" x="8" y="2" rx="1" ry="1"/><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><path d="M12 11h4"/><path d="M12 16h4"/><path d="M8 11h.01"/><path d="M8 16h.01"/></svg>',
    "calendar": '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M8 2v4"/><path d="M16 2v4"/><rect width="18" height="18" x="3" y="4" rx="2"/><path d="M3 10h18"/></svg>',
    "map-pin": '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 10c0 4.993-5.539 10.193-7.399 11.799a1 1 0 0 1-1.202 0C9.539 20.193 4 14.993 4 10a8 8 0 0 1 16 0"/><circle cx="12" cy="10" r="3"/></svg>',
    "credit-card": '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="20" height="14" x="2" y="5" rx="2"/><line x1="2" x2="22" y1="10" y2="10"/></svg>',
    "message-square": '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>',
    "alert-triangle": '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3"/><path d="M12 9v4"/><path d="M12 17h.01"/></svg>',
    "shopping-bag": '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z"/><path d="M3 6h18"/><path d="M16 10a4 4 0 0 1-8 0"/></svg>',
    "circle-check": '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="m9 12 2 2 4-4"/></svg>',
    "circle-x": '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="m15 9-6 6"/><path d="m9 9 6 6"/></svg>',
    "store": '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m2 7 4.41-4.41A2 2 0 0 1 7.83 2h8.34a2 2 0 0 1 1.42.59L22 7"/><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/><path d="M15 22v-4a2 2 0 0 0-2-2h-2a2 2 0 0 0-2 2v4"/><path d="M2 7h20"/><path d="M22 7v3a2 2 0 0 1-2 2a2.7 2.7 0 0 1-1.59-.63.7.7 0 0 0-.82 0A2.7 2.7 0 0 1 16 12a2.7 2.7 0 0 1-1.59-.63.7.7 0 0 0-.82 0A2.7 2.7 0 0 1 12 12a2.7 2.7 0 0 1-1.59-.63.7.7 0 0 0-.82 0A2.7 2.7 0 0 1 8 12a2.7 2.7 0 0 1-1.59-.63.7.7 0 0 0-.82 0A2.7 2.7 0 0 1 4 12a2 2 0 0 1-2-2V7"/></svg>',
    "phone": '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>',
    "mail": '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="20" height="16" x="2" y="4" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/></svg>',
    "globe": '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20"/><path d="M2 12h20"/></svg>',
    "package-check": '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m16 16 2 2 4-4"/><path d="M21 10V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l2-1.14"/><path d="m7.5 4.27 9 5.15"/><polyline points="3.29 7 12 12 20.71 7"/><line x1="12" x2="12" y1="22" y2="12"/></svg>',
}


def _icon(name, color="#2e7d4f", size=16):
    """Return an inline SVG icon for use in HTML emails.
    Falls back to empty string if icon name is unknown."""
    svg = _LUCIDE_ICONS.get(name, "")
    if not svg:
        return ""
    svg = svg.replace('width="16"', f'width="{size}"').replace('height="16"', f'height="{size}"')
    svg = svg.replace('stroke="currentColor"', f'stroke="{color}"')
    return f'<span style="display:inline-block;vertical-align:middle;line-height:0;margin-right:6px">{svg}</span>'


def _info_row(icon_name, text, color="#2e7d4f"):
    """Build a styled info row with icon for email body."""
    return (
        f'<div style="display:flex;align-items:center;padding:8px 12px;margin:4px 0;'
        f'background:#f0fdf4;border-radius:8px;font-size:14px;color:#1f2937">'
        f'{_icon(icon_name, color, 18)}'
        f'<span>{text}</span></div>'
    )


def build_email_html(body_text, subject="", extra_html=""):
    """Build a branded HTML email with logo, header, styled body, and footer.
    All contact details are loaded from Dataverse (key: shop_kontakt).
    extra_html is inserted after the body text (for tables etc.)."""
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
                f'{_icon("package-check", "#2e7d4f", 14)} {item_text}</div>'
            )
        elif stripped.startswith("Grund:"):
            body_parts.append(
                f'<div style="background:#fef3c7;border:1px solid #fbbf24;border-radius:8px;'
                f'padding:10px 14px;margin:8px 0;font-weight:600;color:#92400e">'
                f'{_icon("clipboard-list", "#92400e", 16)} {stripped}</div>'
            )
        elif stripped.startswith("[info:"):
            # Parse structured info lines: [info:icon_name] text
            m = re.match(r'\[info:(\w[\w-]*)\]\s*(.*)', stripped)
            if m:
                body_parts.append(_info_row(m.group(1), m.group(2)))
            else:
                body_parts.append(f'<div style="margin:4px 0;color:#1f2937">{stripped}</div>')
        elif stripped.startswith("[warn]"):
            warn_text = stripped.replace("[warn]", "").strip()
            body_parts.append(
                f'<div style="display:flex;align-items:flex-start;gap:8px;background:#fef3c7;'
                f'border:1px solid #fbbf24;border-radius:8px;padding:10px 14px;margin:12px 0;'
                f'font-size:13px;color:#92400e">'
                f'{_icon("alert-triangle", "#d97706", 18)}'
                f'<span>{warn_text}</span></div>'
            )
        elif stripped.startswith("Herzliche"):
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

    # Determine accent color and header icon based on subject
    accent_color = "#2e7d4f"
    header_icon = _icon("package-check", "#fff", 22)
    if "storniert" in subject.lower() or "storno" in subject.lower():
        accent_color = "#dc2626"
        header_icon = _icon("circle-x", "#fff", 22)
    elif "abholbereit" in subject.lower() or "bereit" in subject.lower():
        accent_color = "#059669"
        header_icon = _icon("circle-check", "#fff", 22)
    elif "bestellbest" in subject.lower():
        accent_color = "#2e7d4f"
        header_icon = _icon("shopping-bag", "#fff", 22)
    elif "nicht verf" in subject.lower() or "fehlende" in subject.lower():
        accent_color = "#d97706"
        header_icon = _icon("alert-triangle", "#fff", 22)

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
  <div style="background:{accent_color};padding:14px 28px;color:#fff;font-size:16px;font-weight:700;display:flex;align-items:center;gap:8px">
    {header_icon} {subject}
  </div>

  <!-- Body content -->
  <div style="background:#fff;padding:24px 28px;font-size:14px;line-height:1.7;color:#1f2937">
    {body_html}
    {extra_html}
  </div>

  <!-- CTA Button -->
  <div style="background:#fff;padding:0 28px 24px;text-align:center">
    <a href="{ci['shop_url']}" style="display:inline-block;padding:12px 28px;background:{accent_color};color:#fff;
       text-decoration:none;border-radius:10px;font-weight:700;font-size:14px;margin-top:8px">
      {_icon('shopping-bag', '#fff', 16)} Zum Dorfladen-Shop
    </a>
  </div>

  <!-- Footer -->
  <div style="background:#1f2937;border-radius:0 0 16px 16px;padding:20px 28px;color:#d1d5db;font-size:12px;line-height:1.6">
    <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px">
      {_icon('store', '#93c5fd', 20)}
      <span style="font-weight:700;color:#fff;font-size:13px">{ci['name']}</span>
    </div>
    <div style="margin-left:2px">
      <div>{_icon('map-pin', '#93c5fd', 13)}{ci['adresse']}</div>
      <div>{_icon('phone', '#93c5fd', 13)}<a href="tel:{ci['telefon_link']}" style="color:#93c5fd;text-decoration:none">{ci['telefon']}</a></div>
      <div>{_icon('mail', '#93c5fd', 13)}<a href="mailto:{ci['email']}" style="color:#93c5fd;text-decoration:none">{ci['email']}</a></div>
      <div>{_icon('globe', '#93c5fd', 13)}<a href="{ci['website_url']}" style="color:#93c5fd;text-decoration:none">{ci['website']}</a></div>
    </div>
    <div style="margin-top:12px;padding-top:10px;border-top:1px solid #374151;font-size:11px;color:#9ca3af">
      Diese E-Mail wurde automatisch erstellt. Bei Fragen antworten Sie einfach auf diese Mail.
    </div>
  </div>

</div>
</body></html>'''


def send_email(to_email, to_name, subject, body_text, extra_html=""):
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
    email_html = build_email_html(body_text, subject, extra_html)

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

    positionen = body.get("positionen", [])
    gesamtsumme = body.get("gesamtsumme", "")

    # ── Build email subject + body based on notification type ──
    email_subject = ""
    email_body = ""

    abhol_zeitslot = body.get("abhol_zeitslot", {})
    zahlungsart = body.get("zahlungsart", "")
    iban_masked = body.get("iban_masked", "")

    if notify_type == "confirmation":
        # ── Bestellbestätigung nach Aufgabe ──
        slot_label = abhol_zeitslot.get("label", "Vormittag") if abhol_zeitslot else "Vormittag"
        slot_von = abhol_zeitslot.get("von", "") if abhol_zeitslot else ""
        slot_bis = abhol_zeitslot.get("bis", "") if abhol_zeitslot else ""
        slot_display = f"{slot_label} ({slot_von}–{slot_bis} Uhr)" if slot_von else slot_label

        email_subject = f"{laden_name} – Bestellbestätigung {bestellnummer}"
        email_body = (
            f"{anrede},\n\n"
            f"vielen Dank für Ihre Bestellung! Wir haben folgende Bestellung erhalten "
            f"und beginnen in Kürze mit der Zusammenstellung.\n\n"
            f"[info:clipboard-list] Bestellnummer: {bestellnummer}\n"
            f"[info:calendar] Abholung: {abholdatum}, {slot_display}\n"
            f"[info:map-pin] Ort: {laden_name}, {ci['adresse']}\n"
        )
        if zahlungsart:
            zahlung_text = zahlungsart
            if iban_masked:
                zahlung_text += f" ({iban_masked})"
            email_body += f"[info:credit-card] Zahlung: {zahlung_text}\n"
        if body.get("anmerkungen"):
            email_body += f"\n[info:message-square] Ihre Anmerkung: {body['anmerkungen']}\n"
        email_body += (
            f"\nSie erhalten eine weitere E-Mail, sobald Ihre Bestellung zur "
            f"Abholung bereitsteht.\n\n"
            f"[warn] Bitte holen Sie Ihre Bestellung zum gewählten Abholtermin ab. "
            f"Verderbliche Ware, die nicht abgeholt wird und nicht mehr verkaufbar ist, "
            f"wird in Rechnung gestellt.\n\n"
            f"Bei Fragen erreichen Sie uns unter {ci['telefon']} oder "
            f"per E-Mail an {ci['email']}.\n\n"
            f"Herzliche Grüße\n"
            f"Ihr {laden_name}-Team"
        )

    elif notify_type == "cancelled":
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
            f"[info:calendar] Abholung: {abholdatum} vormittags im {laden_name}\n\n"
            f"Wir bitten um Ihr Verständnis und freuen uns auf Ihren Besuch!\n\n"
            f"Herzliche Grüße\n"
            f"Ihr {laden_name}-Team"
        )

    elif notify_type == "ready":
        email_subject = f"{laden_name} – Ihre Bestellung {bestellnummer} ist abholbereit!"
        anmerkungen = body.get("anmerkungen", "")
        email_body = (
            f"{anrede},\n\n"
            f"gute Nachrichten! Ihre Bestellung {bestellnummer} wurde sorgfältig "
            f"zusammengestellt und liegt für Sie zur Abholung bereit.\n\n"
            f"[info:calendar] Abholung: {abholdatum} vormittags\n"
            f"[info:map-pin] Ort: {laden_name}, {ci['adresse']}\n\n"
            f"Bitte holen Sie Ihre Bestellung bis 12:00 Uhr mittags ab."
        )
        if anmerkungen:
            email_body += f"\n\n[info:message-square] Ihre Anmerkung: {anmerkungen}"
        email_body += (
            f"\n\nWir freuen uns auf Ihren Besuch!\n\n"
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

    # ── Send push notification to specific customer ──
    push_messages = {
        "confirmation": {
            "title": "✅ Bestellung bestätigt",
            "body": f"Ihre Bestellung {bestellnummer} wurde aufgenommen. Abholung: {abholdatum}.",
        },
        "ready": {
            "title": "🏪 Bestellung abholbereit!",
            "body": f"Ihre Bestellung {bestellnummer} liegt für Sie bereit. Abholung: {abholdatum} vormittags.",
        },
        "cancelled": {
            "title": "❌ Bestellung storniert",
            "body": f"Ihre Bestellung {bestellnummer} wurde storniert.",
        },
        "missing_items": {
            "title": "ℹ️ Bestellung aktualisiert",
            "body": f"Einige Artikel Ihrer Bestellung {bestellnummer} sind leider nicht verfügbar.",
        },
    }
    push_msg = push_messages.get(notify_type)
    if push_msg and kunde_email:
        try:
            push_payload = {
                "title": push_msg["title"],
                "message": push_msg["body"],
                "url": "/shop.html",
                "target_email": kunde_email,
                "tag": f"order-{bestellnummer}",
            }
            swa_host = os.environ.get("SWA_HOSTNAME", "") or os.environ.get("WEBSITE_HOSTNAME", "localhost:7071")
            protocol = "https" if "azurestaticapps" in swa_host or "azure" in swa_host else "http"
            internal_url = f"{protocol}://{swa_host}/api/push-send"
            r = requests.post(internal_url, json=push_payload, timeout=15)
            if r.status_code in (200, 201):
                resp_data = r.json() if r.text else {}
                if resp_data.get("sent", 0) > 0:
                    notifications_sent.append("push")
        except Exception:
            pass  # Push is best-effort

    # ── Build positions table HTML for confirmation and ready emails ──
    positions_html = ""
    if notify_type in ("confirmation", "ready") and positionen:
        def _fmt_price(v):
            try:
                return f"{float(v):,.2f}".replace(",", "X").replace(".", ",").replace("X", ".") + " €"
            except (ValueError, TypeError):
                return ""
        rows = ""
        for p in positionen:
            bez = p.get("bezeichnung", "")
            menge = p.get("menge", "")
            einheit = p.get("einheit", "")
            ep = p.get("einzelpreis", "")
            pp = p.get("positionspreis", "")
            rows += (
                f'<tr>'
                f'<td style="padding:8px 10px;border-bottom:1px solid #f3f4f6;color:#1f2937">{bez}</td>'
                f'<td style="padding:8px 6px;border-bottom:1px solid #f3f4f6;text-align:center;color:#6b7280">{menge} {einheit}</td>'
                f'<td style="padding:8px 10px;border-bottom:1px solid #f3f4f6;text-align:right;color:#1f2937;white-space:nowrap">{_fmt_price(pp)}</td>'
                f'</tr>'
            )
        total_str = _fmt_price(gesamtsumme) if gesamtsumme else ""
        positions_html = (
            f'<div style="margin-top:16px;border:1px solid #e5e7eb;border-radius:10px;overflow:hidden">'
            f'<div style="background:#f0fdf4;padding:10px 14px;font-size:12px;font-weight:700;color:#166534;border-bottom:1px solid #e5e7eb">'
            f'{_icon("clipboard-list", "#166534", 14)} Ihre Bestellung im Überblick</div>'
            f'<table style="width:100%;border-collapse:collapse;font-size:13px">'
            f'<thead><tr style="background:#f9fafb">'
            f'<th style="padding:8px 10px;text-align:left;font-size:11px;font-weight:600;color:#6b7280">Artikel</th>'
            f'<th style="padding:8px 6px;text-align:center;font-size:11px;font-weight:600;color:#6b7280">Menge</th>'
            f'<th style="padding:8px 10px;text-align:right;font-size:11px;font-weight:600;color:#6b7280">Preis</th>'
            f'</tr></thead>'
            f'<tbody>{rows}</tbody>'
            f'<tfoot><tr style="background:#f0fdf4">'
            f'<td colspan="2" style="padding:10px;font-weight:700;color:#166534;font-size:14px">Gesamt (ca.)</td>'
            f'<td style="padding:10px;text-align:right;font-weight:700;color:#166534;font-size:14px">{total_str}</td>'
            f'</tr></tfoot>'
            f'</table></div>'
        )

    # ── Send email via Microsoft Graph ──
    email_sent = False
    email_error = ""
    if kunde_email and email_subject:
        try:
            email_sent, email_error = send_email(
                kunde_email, kunde_name, email_subject, email_body, positions_html
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
