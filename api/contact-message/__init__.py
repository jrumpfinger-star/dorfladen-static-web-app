"""
Kundenkontakt-Messaging (WhatsApp-artig) – 1:1-Chat Homepage <-> Kiosk.

Routes (route: contact-message/{id?}):
  POST   /api/contact-message            → Kunde: Nachricht senden (Thread pro device_id)
  GET    /api/contact-message?mode=my&device_id=…  → Kunde: eigenen Verlauf lesen
  GET    /api/contact-message?mode=list  → Kiosk: alle Konversationen
  GET    /api/contact-message?mode=unread→ Kiosk: Anzahl ungelesener Konversationen
  PATCH  /api/contact-message/{id}       → Kiosk: Antwort/Status/gelesen

Speicher: Dataverse-Tabelle dl_kontaktnachricht (ein Thread pro Gerät).
Verlauf als JSON-Array in dl_chatverlauf: [{t, who, typ, text?, datei?}].
"""
import azure.functions as func
import json
import logging
import os
import sys
import time
import threading
from datetime import datetime

import msal
import requests


ENTITY_SET = "dl_kontaktnachrichts"
DEFAULT_URL_SETTING = "DV_DEFAULT_URL"
DEFAULT_URL_FALLBACK = "https://orgab4e2f00.crm16.dynamics.com"

STATUS_NEU = 0
STATUS_BEANTWORTET = 1
STATUS_ERLEDIGT = 2

MAX_TEXT = 1000
NO_REPLY_ADDRESS = "no-reply@dorfladen-oberornau.de"

# ── einfacher In-Memory Rate-Limit pro device_id (best effort) ──
_rate = {}
_rate_lock = threading.Lock()
RATE_MAX = 10          # max. Nachrichten
RATE_WINDOW = 300      # pro 5 Minuten


def _rate_ok(device_id):
    if not device_id:
        return True
    now = time.time()
    with _rate_lock:
        arr = [t for t in _rate.get(device_id, []) if now - t < RATE_WINDOW]
        if len(arr) >= RATE_MAX:
            _rate[device_id] = arr
            return False
        arr.append(now)
        _rate[device_id] = arr
        return True


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


def get_cors_headers():
    return {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, POST, PATCH, DELETE, OPTIONS",
        "Access-Control-Allow-Headers": "*",
        "Access-Control-Max-Age": "86400",
        "Content-Type": "application/json; charset=utf-8",
    }


def _odata_str(s):
    return (s or "").replace("'", "''")


def _parse_verlauf(raw):
    if not raw:
        return []
    try:
        v = json.loads(raw)
        return v if isinstance(v, list) else []
    except Exception:
        return []


def _serialize(item, include_email=False):
    o = {
        "id": item.get("dl_kontaktnachrichtid", ""),
        "name": item.get("dl_name", ""),
        "betreff": item.get("dl_betreff", ""),
        "device_id": item.get("dl_device_id", ""),
        "geraet": item.get("dl_geraet", ""),
        "status": item.get("dl_status", STATUS_NEU),
        "kommentar_gelesen": bool(item.get("dl_kommentar_gelesen", False)),
        "notify_email": bool(item.get("dl_notify_email", False)),
        "verlauf": _parse_verlauf(item.get("dl_chatverlauf")),
        "created": item.get("createdon", ""),
        "modified": item.get("modifiedon", ""),
    }
    # E-Mail nur intern (Kiosk) preisgeben, nicht an fremde Kunden-Lookups.
    if include_email:
        o["email"] = item.get("dl_email", "")
    return o


def _now_iso():
    return datetime.utcnow().isoformat() + "Z"


def _send_push(email, device_id, title, body_text, tag="kontakt", origin=""):
    """Push an den Kunden (Kategorie 'kontakt').
    Adressierung bevorzugt ueber die Geraete-ID (eindeutig, gehoert genau zu
    diesem Chat-Thread) – so trifft der Push genau das eine Geraet. Die E-Mail
    ist nur Fallback (und kann mehrere Geraete umfassen)."""
    try:
        from shared.urls import get_public_origin
        if not origin:
            origin = get_public_origin(None)
        payload = {
            "title": title,
            "message": body_text,
            "url": "/?chat=1",
            "origin": origin,
            "category": "kontakt",
            "tag": tag,
        }
        if device_id:
            payload["target_device_id"] = device_id
        elif email:
            payload["target_email"] = email
        else:
            return False
        r = requests.post(f"{origin}/api/push-send", json=payload, timeout=10)
        return r.status_code in (200, 201)
    except Exception as e:
        logging.warning(f"[contact-message] push failed: {e}")
    return False


def _send_reply_email(email, name, reply_text, origin):
    """No-Reply-E-Mail an den Kunden mit Link zum Chat."""
    try:
        api_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
        if api_dir not in sys.path:
            sys.path.insert(0, api_dir)
        from importlib import import_module
        notify_mod = import_module("shop-notify")
        ci = notify_mod.get_contact_info()
        laden_name = ci["name"]
        anrede = f"Hallo {name}" if name else "Hallo"
        base = (origin or "").rstrip("/")
        chat_link = f"{base}/?chat=1"
        body_text = (
            f"{anrede},\n\n"
            f"Sie haben eine neue Nachricht vom Dorfladen erhalten:\n\n"
            f"„{reply_text}“\n\n"
            f"Bitte antworten Sie NICHT direkt auf diese E-Mail – sie wird nicht gelesen.\n"
            f"Zum Antworten öffnen Sie bitte den Chat auf unserer Website:\n{chat_link}\n\n"
            f"Ihr {laden_name}-Team"
        )
        extra_html = (
            f'<div style="margin-top:16px">'
            f'<a href="{chat_link}" style="display:inline-block;background:#2e7d4f;color:#fff;'
            f'text-decoration:none;padding:12px 20px;border-radius:8px;font-weight:600">'
            f'💬 Zum Chat &amp; antworten</a></div>'
            f'<p style="margin-top:14px;font-size:12px;color:#6b7280">Diese E-Mail wurde '
            f'automatisch versendet. Bitte antworten Sie nicht direkt darauf.</p>'
        )
        subject = f"{laden_name} – Neue Nachricht"
        notify_mod.send_email(email, name, subject, body_text, extra_html, reply_to=NO_REPLY_ADDRESS)
        return True
    except Exception as e:
        logging.warning(f"[contact-message] reply email failed: {e}")
    return False


def _find_thread_by_device(base_url, headers, device_id):
    url = (
        f"{base_url}/api/data/v9.2/{ENTITY_SET}"
        f"?$filter=dl_device_id eq '{_odata_str(device_id)}'"
        f"&$orderby=createdon desc&$top=1"
    )
    r = requests.get(url, headers=headers, timeout=30)
    if r.status_code == 200:
        items = r.json().get("value", [])
        return items[0] if items else None
    return None


def main(req: func.HttpRequest) -> func.HttpResponse:
    if req.method == "OPTIONS":
        return func.HttpResponse(status_code=200, headers=get_cors_headers())

    record_id = req.route_params.get("id")

    token = get_token()
    if not token:
        return func.HttpResponse(
            json.dumps({"success": False, "error": "Auth failed"}, ensure_ascii=False),
            status_code=500, headers=get_cors_headers(),
        )
    base_url = _base_url()
    headers = _headers(token)

    from shared.urls import get_public_origin
    _origin = get_public_origin(req)

    try:
        # ── POST: Kunde sendet Nachricht ──
        if req.method == "POST":
            body = req.get_json()
            # Honeypot: verstecktes Feld muss leer sein.
            if (body.get("website") or body.get("hp") or "").strip():
                return func.HttpResponse(
                    json.dumps({"success": True, "message": "ok"}, ensure_ascii=False),
                    status_code=200, headers=get_cors_headers(),
                )
            device_id = (body.get("device_id") or "").strip()[:100]
            name = (body.get("name") or "").strip()[:200]
            email = (body.get("email") or "").strip().lower()[:320]
            betreff = (body.get("betreff") or "").strip()[:300]
            text = (body.get("text") or "").strip()[:MAX_TEXT]
            bild_datei = (body.get("bild_datei") or "").strip()[:200]
            notify_email = bool(body.get("notify_email", False))
            geraet = (body.get("geraet") or "").strip()[:200]

            if not device_id:
                return func.HttpResponse(
                    json.dumps({"success": False, "error": "device_id fehlt"}, ensure_ascii=False),
                    status_code=400, headers=get_cors_headers(),
                )
            if not text and not bild_datei:
                return func.HttpResponse(
                    json.dumps({"success": False, "error": "Bitte eine Nachricht oder ein Bild senden."}, ensure_ascii=False),
                    status_code=400, headers=get_cors_headers(),
                )
            if not _rate_ok(device_id):
                return func.HttpResponse(
                    json.dumps({"success": False, "error": "Zu viele Nachrichten in kurzer Zeit. Bitte versuchen Sie es in ein paar Minuten erneut."}, ensure_ascii=False),
                    status_code=429, headers=get_cors_headers(),
                )

            msg = {"t": _now_iso(), "who": "kunde", "typ": "bild" if (bild_datei and not text) else "text"}
            if text:
                msg["text"] = text
            if bild_datei:
                msg["datei"] = bild_datei
                if text:
                    msg["typ"] = "text"  # Text + Bild: als Text-Eintrag mit Bild

            existing = _find_thread_by_device(base_url, headers, device_id)
            if existing:
                thread = _parse_verlauf(existing.get("dl_chatverlauf"))
                thread.append(msg)
                patch = {
                    "dl_chatverlauf": json.dumps(thread, ensure_ascii=False),
                    "dl_status": STATUS_NEU,
                    "dl_kommentar_gelesen": False,
                }
                if name:
                    patch["dl_name"] = name
                if email:
                    patch["dl_email"] = email
                if betreff:
                    patch["dl_betreff"] = betreff
                if geraet:
                    patch["dl_geraet"] = geraet
                patch["dl_notify_email"] = notify_email
                rid = existing.get("dl_kontaktnachrichtid")
                pr = requests.patch(
                    f"{base_url}/api/data/v9.2/{ENTITY_SET}({rid})",
                    headers={**headers, "If-Match": "*"}, json=patch, timeout=30,
                )
                ok = pr.status_code in (200, 204)
            else:
                thread = [msg]
                payload = {
                    "dl_name": name or "Website-Besucher",
                    "dl_email": email,
                    "dl_device_id": device_id,
                    "dl_betreff": betreff,
                    "dl_geraet": geraet,
                    "dl_chatverlauf": json.dumps(thread, ensure_ascii=False),
                    "dl_status": STATUS_NEU,
                    "dl_kommentar_gelesen": False,
                    "dl_notify_email": notify_email,
                }
                pr = requests.post(
                    f"{base_url}/api/data/v9.2/{ENTITY_SET}",
                    headers=headers, json=payload, timeout=30,
                )
                ok = pr.status_code in (200, 201, 204)

            if ok:
                return func.HttpResponse(
                    json.dumps({"success": True, "message": "Nachricht gesendet", "verlauf": thread}, ensure_ascii=False),
                    status_code=200, headers=get_cors_headers(),
                )
            logging.error(f"[contact-message] save failed: {pr.status_code} {pr.text[:300]}")
            return func.HttpResponse(
                json.dumps({"success": False, "error": f"Speicherfehler ({pr.status_code})"}, ensure_ascii=False),
                status_code=500, headers=get_cors_headers(),
            )

        # ── GET ──
        if req.method == "GET":
            mode = req.params.get("mode", "")

            # Kunde: eigenen Thread
            if mode == "my":
                device_id = (req.params.get("device_id") or "").strip()
                if not device_id:
                    return func.HttpResponse(
                        json.dumps({"success": True, "thread": None}, ensure_ascii=False),
                        status_code=200, headers=get_cors_headers(),
                    )
                item = _find_thread_by_device(base_url, headers, device_id)
                return func.HttpResponse(
                    json.dumps({"success": True, "thread": _serialize(item) if item else None}, ensure_ascii=False),
                    status_code=200, headers=get_cors_headers(),
                )

            # Kiosk: Ungelesen-Zaehler
            if mode == "unread":
                url = (
                    f"{base_url}/api/data/v9.2/{ENTITY_SET}"
                    f"?$filter=dl_kommentar_gelesen ne true and dl_status ne {STATUS_ERLEDIGT}"
                    f"&$select=dl_kontaktnachrichtid&$top=200"
                )
                r = requests.get(url, headers=headers, timeout=30)
                cnt = len(r.json().get("value", [])) if r.status_code == 200 else 0
                return func.HttpResponse(
                    json.dumps({"success": True, "unread_count": cnt}, ensure_ascii=False),
                    status_code=200, headers=get_cors_headers(),
                )

            # Kiosk: Liste aller Konversationen (Filter optional)
            if mode == "list":
                status_filter = req.params.get("status", "")
                filt = ""
                if status_filter == "neu":
                    filt = f"?$filter=dl_status eq {STATUS_NEU}"
                elif status_filter == "erledigt":
                    filt = f"?$filter=dl_status eq {STATUS_ERLEDIGT}"
                sep = "&" if filt else "?"
                url = (
                    f"{base_url}/api/data/v9.2/{ENTITY_SET}{filt}"
                    f"{sep}$orderby=modifiedon desc&$top=200"
                )
                r = requests.get(url, headers=headers, timeout=30)
                threads = []
                if r.status_code == 200:
                    for it in r.json().get("value", []):
                        threads.append(_serialize(it, include_email=True))
                return func.HttpResponse(
                    json.dumps({"success": True, "threads": threads, "count": len(threads)}, ensure_ascii=False),
                    status_code=200, headers=get_cors_headers(),
                )

            # Einzel-Record (Kiosk)
            if record_id:
                r = requests.get(f"{base_url}/api/data/v9.2/{ENTITY_SET}({record_id})", headers=headers, timeout=30)
                if r.status_code == 200:
                    return func.HttpResponse(
                        json.dumps({"success": True, "thread": _serialize(r.json(), include_email=True)}, ensure_ascii=False),
                        status_code=200, headers=get_cors_headers(),
                    )
                return func.HttpResponse(
                    json.dumps({"success": False, "error": "Nicht gefunden"}, ensure_ascii=False),
                    status_code=404, headers=get_cors_headers(),
                )

            return func.HttpResponse(
                json.dumps({"success": False, "error": "mode fehlt"}, ensure_ascii=False),
                status_code=400, headers=get_cors_headers(),
            )

        # ── PATCH: Kiosk antwortet / Status / gelesen ──
        if req.method == "PATCH":
            if not record_id:
                return func.HttpResponse(
                    json.dumps({"success": False, "error": "id fehlt"}, ensure_ascii=False),
                    status_code=400, headers=get_cors_headers(),
                )
            body = req.get_json()
            fetch = requests.get(f"{base_url}/api/data/v9.2/{ENTITY_SET}({record_id})", headers=headers, timeout=30)
            existing = fetch.json() if fetch.status_code == 200 else {}

            patch = {}
            thread = _parse_verlauf(existing.get("dl_chatverlauf"))
            reply = body.get("personal_antwort")
            bild_datei = (body.get("bild_datei") or "").strip()[:200]
            thread_changed = False
            if (reply and reply.strip()) or bild_datei:
                m = {"t": _now_iso(), "who": "dorfladen", "typ": "bild" if (bild_datei and not (reply or "").strip()) else "text"}
                if reply and reply.strip():
                    m["text"] = reply.strip()[:MAX_TEXT]
                if bild_datei:
                    m["datei"] = bild_datei
                thread.append(m)
                thread_changed = True
                patch["dl_status"] = STATUS_BEANTWORTET
                patch["dl_kommentar_gelesen"] = True

            if body.get("kommentar_gelesen") is not None:
                patch["dl_kommentar_gelesen"] = bool(body.get("kommentar_gelesen"))
            if body.get("status") is not None:
                patch["dl_status"] = int(body.get("status"))
            if thread_changed:
                patch["dl_chatverlauf"] = json.dumps(thread, ensure_ascii=False)

            if not patch:
                return func.HttpResponse(
                    json.dumps({"success": False, "error": "Keine Änderung"}, ensure_ascii=False),
                    status_code=400, headers=get_cors_headers(),
                )

            pr = requests.patch(
                f"{base_url}/api/data/v9.2/{ENTITY_SET}({record_id})",
                headers={**headers, "If-Match": "*"}, json=patch, timeout=30,
            )
            if pr.status_code in (200, 204):
                # Benachrichtigung an den Kunden bei Antwort
                if thread_changed:
                    cust_email = existing.get("dl_email", "")
                    cust_device = existing.get("dl_device_id", "")
                    cust_name = existing.get("dl_name", "")
                    preview = (reply.strip() if (reply and reply.strip()) else "📷 Foto")
                    if cust_email or cust_device:
                        _send_push(cust_email, cust_device, "💬 Nachricht vom Dorfladen", preview, f"kontakt-{record_id}", _origin)
                    if cust_email and bool(existing.get("dl_notify_email", False)):
                        _send_reply_email(cust_email, cust_name, preview, _origin)
                return func.HttpResponse(
                    json.dumps({"success": True, "message": "Aktualisiert", "verlauf": thread}, ensure_ascii=False),
                    status_code=200, headers=get_cors_headers(),
                )
            return func.HttpResponse(
                json.dumps({"success": False, "error": f"Update fehlgeschlagen ({pr.status_code})"}, ensure_ascii=False),
                status_code=500, headers=get_cors_headers(),
            )

        # ── DELETE: Kiosk löscht eine Konversation ──
        if req.method == "DELETE":
            if not record_id:
                return func.HttpResponse(
                    json.dumps({"success": False, "error": "id fehlt"}, ensure_ascii=False),
                    status_code=400, headers=get_cors_headers(),
                )
            dr = requests.delete(
                f"{base_url}/api/data/v9.2/{ENTITY_SET}({record_id})",
                headers=headers, timeout=30,
            )
            if dr.status_code in (200, 204):
                return func.HttpResponse(
                    json.dumps({"success": True, "message": "Gelöscht"}, ensure_ascii=False),
                    status_code=200, headers=get_cors_headers(),
                )
            return func.HttpResponse(
                json.dumps({"success": False, "error": f"Löschen fehlgeschlagen ({dr.status_code})"}, ensure_ascii=False),
                status_code=500, headers=get_cors_headers(),
            )

        return func.HttpResponse(
            json.dumps({"success": False, "error": "Method not allowed"}, ensure_ascii=False),
            status_code=405, headers=get_cors_headers(),
        )

    except Exception as e:
        logging.error(f"[contact-message] Exception: {e}")
        return func.HttpResponse(
            json.dumps({"success": False, "error": str(e)}, ensure_ascii=False),
            status_code=500, headers=get_cors_headers(),
        )
