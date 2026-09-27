"""
Auth Profile API – Eigenes Profil ansehen und ändern.

GET   (X-Shop-Token): liefert Vorname, Nachname, E-Mail, Telefon.
PATCH (X-Shop-Token): ändert Vorname/Nachname/Telefon frei; E-Mail und
                      Passwort nur mit Bestätigung des aktuellen Passworts.

Aus dem Laden: "Es muss auch hier möglich sein, sein Profil (Konto) zu
bearbeiten und zu ändern, wie es Standard ist in Online-Anwendungen."
Bisher gab es nur "Abmelden" - keinen einzigen Weg, Name, E-Mail oder
Passwort zu ändern. (Spec konto-profil-bearbeiten)

Die Kundenkennung kommt AUSSCHLIESSLICH aus dem Anmeldezeichen, nie aus
dem Anfragetext - sonst könnte jeder ein fremdes Profil ändern, indem er
dessen ID einträgt. Derselbe Grundsatz wie in lunch-order._konto_mail().
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
import jwt as pyjwt
from datetime import datetime, timedelta


DEFAULT_URL_SETTING = "DV_DEFAULT_URL"
DEFAULT_URL_FALLBACK = "https://orgab4e2f00.crm16.dynamics.com"
ENTITY_SET = "dl_shopkundes"
JWT_SECRET = os.environ.get("SHOP_JWT_SECRET", "dorfladen-shop-secret-change-in-production-2026")
JWT_EXPIRY_HOURS = 24 * 90


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
        "Access-Control-Allow-Methods": "GET, PATCH, OPTIONS",
        "Access-Control-Allow-Headers": "*",
        "Content-Type": "application/json; charset=utf-8",
    }


def _base_url():
    return os.environ.get(DEFAULT_URL_SETTING, DEFAULT_URL_FALLBACK)


def _headers(dv_token):
    return {
        "Authorization": f"Bearer {dv_token}",
        "OData-MaxVersion": "4.0",
        "OData-Version": "4.0",
        "Accept": "application/json",
        "Content-Type": "application/json; charset=utf-8",
    }


def _validate_email(email):
    return bool(re.match(r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$', email))


def _angemeldeter_kunde(req):
    """Kundenkennung (id, email) aus dem Anmeldezeichen - oder None.

    Dieselbe Kopfzeile wie überall im Shop: ``X-Shop-Token``, weil Azure
    Static Web Apps ``Authorization`` unterwegs durch ein eigenes Zeichen
    ersetzt. (Spec meine-bestellungen-geraete, F3)
    """
    zeichen = req.headers.get("X-Shop-Token", "")
    if not zeichen:
        kopf = req.headers.get("Authorization", "")
        if kopf.startswith("Bearer "):
            zeichen = kopf[7:]
    if not zeichen:
        return None
    try:
        daten = pyjwt.decode(zeichen, JWT_SECRET, algorithms=["HS256"])
        kunde_id = daten.get("sub") or ""
        email = (daten.get("email") or "").strip().lower()
        if not kunde_id or not email:
            return None
        return {"id": kunde_id, "email": email}
    except Exception:
        return None


def _create_jwt(kunde_id, email, vorname, nachname):
    payload = {
        "sub": kunde_id,
        "email": email,
        "name": f"{vorname} {nachname}",
        "iat": datetime.utcnow(),
        "exp": datetime.utcnow() + timedelta(hours=JWT_EXPIRY_HOURS),
    }
    return pyjwt.encode(payload, JWT_SECRET, algorithm="HS256")


def _sende_bestaetigungsmail(base_url, headers, kunde_id, email, vorname):
    """Neuen Bestätigungslink erzeugen und verschicken - dieselbe Mail wie
    bei der Registrierung, nur mit der NEUEN Adresse. Schlägt der Versand
    fehl, bleibt das Ändern der Adresse trotzdem gültig; nur blockierend
    darf ein Mailausfall hier nicht sein (Erfahrung aus der
    Mail-Diagnose: Zustellprobleme liegen oft ausserhalb der eigenen
    Kontrolle)."""
    try:
        verify_token = uuid.uuid4().hex
        patch_url = f"{base_url}/api/data/v9.2/{ENTITY_SET}({kunde_id})"
        patch_headers = {**headers, "If-Match": "*"}
        requests.patch(patch_url, headers=patch_headers,
                        json={"dl_verify_token": verify_token, "dl_email_verifiziert": False},
                        timeout=15)

        import sys
        api_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
        if api_dir not in sys.path:
            sys.path.insert(0, api_dir)
        from importlib import import_module
        notify_mod = import_module("shop-notify")

        swa_host = os.environ.get("SWA_HOSTNAME", "") or os.environ.get(
            "WEBSITE_HOSTNAME_STATIC", "witty-island-064f9d903.7.azurestaticapps.net")
        protocol = "https" if "azurestaticapps" in swa_host or "azure" in swa_host else "http"
        verify_url = f"{protocol}://{swa_host}/api/auth-verify?token={verify_token}&email={email}"
        body = (
            f"Hallo {vorname},\n\n"
            f"Sie haben Ihre E-Mail-Adresse geändert. Bitte bestätigen Sie die neue "
            f"Adresse über den folgenden Link:\n\n{verify_url}\n\n"
            f"Herzliche Grüße\nIhr Dorfladen-Team"
        )
        btn = (
            f'<div style="text-align:center;margin:24px 0">'
            f'<a href="{verify_url}" style="display:inline-block;padding:14px 36px;'
            f'background:#2e7d4f;color:#fff;text-decoration:none;border-radius:10px;'
            f'font-weight:700;font-size:15px">E-Mail bestätigen ✓</a></div>'
        )
        notify_mod.send_email(email, vorname,
                               "Neue E-Mail-Adresse bestätigen – Dorfladen Oberornau",
                               body, btn)
    except Exception as e:
        logging.warning(f"[auth-profile] Bestätigungsmail fehlgeschlagen (nicht blockierend): {e}")


def main(req: func.HttpRequest) -> func.HttpResponse:
    if req.method == "OPTIONS":
        return func.HttpResponse(status_code=200, headers=get_cors_headers())

    kunde = _angemeldeter_kunde(req)
    if not kunde:
        return func.HttpResponse(
            json.dumps({"success": False, "error": "Bitte melden Sie sich an."}, ensure_ascii=False),
            status_code=401, headers=get_cors_headers(),
        )

    dv_token = get_token()
    if not dv_token:
        return func.HttpResponse(
            json.dumps({"success": False, "error": "Server-Fehler"}),
            status_code=500, headers=get_cors_headers(),
        )
    base_url = _base_url()
    headers = _headers(dv_token)
    select = "dl_shopkundeid,dl_vorname,dl_nachname,dl_email,dl_telefon,dl_email_verifiziert,dl_mandatsstatus"

    if req.method == "GET":
        try:
            r = requests.get(
                f"{base_url}/api/data/v9.2/{ENTITY_SET}({kunde['id']})?$select={select}",
                headers=headers, timeout=30,
            )
        except Exception as e:
            return func.HttpResponse(
                json.dumps({"success": False, "error": str(e)}),
                status_code=500, headers=get_cors_headers(),
            )
        if r.status_code != 200:
            return func.HttpResponse(
                json.dumps({"success": False, "error": "Konto nicht gefunden."}, ensure_ascii=False),
                status_code=404, headers=get_cors_headers(),
            )
        d = r.json()
        return func.HttpResponse(
            json.dumps({
                "success": True,
                "profil": {
                    "vorname": d.get("dl_vorname", ""),
                    "nachname": d.get("dl_nachname", ""),
                    "email": d.get("dl_email", ""),
                    "telefon": d.get("dl_telefon", ""),
                    "email_verifiziert": bool(d.get("dl_email_verifiziert")),
                    "hat_bankdaten": (d.get("dl_mandatsstatus") or "") == "aktiv",
                },
            }, ensure_ascii=False),
            status_code=200, headers=get_cors_headers(),
        )

    if req.method == "PATCH":
        try:
            body = req.get_json()
        except Exception:
            return func.HttpResponse(
                json.dumps({"success": False, "error": "Ungültiger JSON-Body"}),
                status_code=400, headers=get_cors_headers(),
            )

        vorname = body.get("vorname")
        nachname = body.get("nachname")
        telefon = body.get("telefon")
        neue_email = (body.get("email") or "").strip().lower()
        neues_passwort = (body.get("neues_passwort") or "").strip()
        aktuelles_passwort = (body.get("aktuelles_passwort") or "").strip()

        errors = []
        if vorname is not None and not vorname.strip():
            errors.append("Vorname darf nicht leer sein.")
        if nachname is not None and not nachname.strip():
            errors.append("Nachname darf nicht leer sein.")

        email_wird_geaendert = bool(neue_email) and neue_email != kunde["email"]
        passwort_wird_geaendert = bool(neues_passwort)

        if email_wird_geaendert and not _validate_email(neue_email):
            errors.append("Bitte geben Sie eine gültige E-Mail-Adresse ein.")
        if passwort_wird_geaendert and len(neues_passwort) < 8:
            errors.append("Das neue Passwort muss mindestens 8 Zeichen lang sein.")
        # E-Mail und Passwort sind sicherheitsrelevant - hierfür wird das
        # aktuelle Passwort verlangt. Name und Telefon nicht: Wer bereits
        # das Anmeldezeichen besitzt, darf harmlose Angaben ohne
        # zusätzliche Hürde ändern.
        if (email_wird_geaendert or passwort_wird_geaendert) and not aktuelles_passwort:
            errors.append("Bitte geben Sie Ihr aktuelles Passwort ein, um E-Mail oder Passwort zu ändern.")

        if errors:
            return func.HttpResponse(
                json.dumps({"success": False, "errors": errors}, ensure_ascii=False),
                status_code=400, headers=get_cors_headers(),
            )

        try:
            r = requests.get(
                f"{base_url}/api/data/v9.2/{ENTITY_SET}({kunde['id']})"
                f"?$select=dl_shopkundeid,dl_vorname,dl_nachname,dl_email,dl_passwort_hash",
                headers=headers, timeout=30,
            )
        except Exception as e:
            return func.HttpResponse(
                json.dumps({"success": False, "error": str(e)}),
                status_code=500, headers=get_cors_headers(),
            )
        if r.status_code != 200:
            return func.HttpResponse(
                json.dumps({"success": False, "error": "Konto nicht gefunden."}, ensure_ascii=False),
                status_code=404, headers=get_cors_headers(),
            )
        vorhanden = r.json()

        if email_wird_geaendert or passwort_wird_geaendert:
            gespeicherter_hash = vorhanden.get("dl_passwort_hash", "")
            if not gespeicherter_hash or not bcrypt.checkpw(
                aktuelles_passwort.encode("utf-8"), gespeicherter_hash.encode("utf-8")
            ):
                return func.HttpResponse(
                    json.dumps({"success": False, "error": "Das aktuelle Passwort stimmt nicht."}, ensure_ascii=False),
                    status_code=401, headers=get_cors_headers(),
                )

        if email_wird_geaendert:
            pruef_url = (
                f"{base_url}/api/data/v9.2/{ENTITY_SET}?$filter=dl_email eq '{neue_email}'"
                f"&$select=dl_shopkundeid"
            )
            try:
                pr = requests.get(pruef_url, headers=headers, timeout=30)
                if pr.status_code == 200:
                    treffer = [x for x in pr.json().get("value", []) if x.get("dl_shopkundeid") != kunde["id"]]
                    if treffer:
                        return func.HttpResponse(
                            json.dumps({"success": False, "errors": [
                                "Diese E-Mail-Adresse wird bereits verwendet."]}, ensure_ascii=False),
                            status_code=409, headers=get_cors_headers(),
                        )
            except Exception:
                pass

        patch_payload = {}
        if vorname is not None and vorname.strip():
            patch_payload["dl_vorname"] = vorname.strip()
        if nachname is not None and nachname.strip():
            patch_payload["dl_nachname"] = nachname.strip()
        if telefon is not None:
            patch_payload["dl_telefon"] = telefon.strip()
        if email_wird_geaendert:
            patch_payload["dl_email"] = neue_email
        if passwort_wird_geaendert:
            patch_payload["dl_passwort_hash"] = bcrypt.hashpw(
                neues_passwort.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")

        if patch_payload:
            try:
                patch_headers = {**headers, "If-Match": "*"}
                pr2 = requests.patch(
                    f"{base_url}/api/data/v9.2/{ENTITY_SET}({kunde['id']})",
                    headers=patch_headers, json=patch_payload, timeout=30,
                )
                if pr2.status_code not in (200, 204):
                    logging.error(f"[auth-profile] Dataverse-Fehler {pr2.status_code}: {pr2.text[:300]}")
                    return func.HttpResponse(
                        json.dumps({"success": False, "error": "Änderung konnte nicht gespeichert werden."}, ensure_ascii=False),
                        status_code=500, headers=get_cors_headers(),
                    )
            except Exception as e:
                return func.HttpResponse(
                    json.dumps({"success": False, "error": str(e)}),
                    status_code=500, headers=get_cors_headers(),
                )

        endgueltiger_vorname = patch_payload.get("dl_vorname", vorhanden.get("dl_vorname", ""))
        endgueltiger_nachname = patch_payload.get("dl_nachname", vorhanden.get("dl_nachname", ""))
        endgueltige_email = neue_email if email_wird_geaendert else kunde["email"]

        if email_wird_geaendert:
            _sende_bestaetigungsmail(base_url, headers, kunde["id"], endgueltige_email, endgueltiger_vorname)

        # Ein neues Zeichen ist nur zwingend, wenn E-Mail oder Name sich
        # geändert haben - beide stehen im Zeichen selbst. Es kostenlos
        # bei jeder Änderung mitzuschicken ist trotzdem einfacher als zu
        # unterscheiden, und macht nichts kaputt: Der Kunde bleibt
        # angemeldet, nur mit einem taufrischen Ablaufdatum.
        neues_zeichen = _create_jwt(kunde["id"], endgueltige_email, endgueltiger_vorname, endgueltiger_nachname)

        return func.HttpResponse(
            json.dumps({
                "success": True,
                "token": neues_zeichen,
                "email_bestaetigung_gesendet": email_wird_geaendert,
                "kunde": {
                    "id": kunde["id"],
                    "vorname": endgueltiger_vorname,
                    "nachname": endgueltiger_nachname,
                    "email": endgueltige_email,
                },
            }, ensure_ascii=False),
            status_code=200, headers=get_cors_headers(),
        )

    return func.HttpResponse(
        json.dumps({"success": False, "error": "Methode nicht erlaubt."}, ensure_ascii=False),
        status_code=405, headers=get_cors_headers(),
    )
