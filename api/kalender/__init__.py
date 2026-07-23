"""
Kiosk-Kalender API – zentrale Aufgaben-/Reservierungs-/Vorbestellungs-Liste
===========================================================================
Löst den Papierkalender der Verkäuferinnen ab. Einträge sind ganztägig oder
mit Uhrzeit, optional mit Kunde verknüpft, optional wiederkehrend, und lassen
sich als erledigt kennzeichnen (Historie bleibt erhalten).

GET    /api/kalender?von=YYYY-MM-DD&bis=YYYY-MM-DD  → Einträge im Bereich
                                                       (inkl. Serien-Vorkommen)
POST   /api/kalender                                → Eintrag/Serie anlegen
PATCH  /api/kalender/{id}                            → Eintrag ändern (inkl. status)
POST   /api/kalender/{id}?override=YYYY-MM-DD        → Serien-Vorkommen erledigen/löschen
DELETE /api/kalender/{id}                            → Einzeleintrag löschen

Dataverse Entities:
  dl_kalendereintrag  (Set: dl_kalendereintrags)
    dl_titel, dl_datum (Date), dl_ganztags (bool), dl_uhrzeit (Text HH:MM),
    dl_kategorie (Text), dl_wiederholung (Text), dl_stammkundeid (Text/GUID),
    dl_kunde_freitext (Text), dl_status (Text), dl_erledigt_am (DateTime),
    dl_notiz (Text)
  dl_kalender_override  (Set: dl_kalender_overrides)
    dl_serie_id (Text/GUID), dl_datum (Date), dl_status (Text), dl_erledigt_am

HINWEIS (T002): Die konkreten dl_*-Feldnamen sind beim ersten Lauf gegen die
reale Dataverse-Umgebung zu verifizieren; Choice-artige Felder sind hier
bewusst als Text modelliert (neue, selbst kontrollierte Entität).
"""
import json
import logging
import os
from datetime import date, datetime

import azure.functions as func
import msal
import requests

try:  # Als Package (Azure Functions) oder als loses Modul lauffähig
    from . import serien
except ImportError:  # pragma: no cover
    import serien  # type: ignore[no-redef]

ENTITY_SET = "dl_kalendereintrags"
OVERRIDE_SET = "dl_kalender_overrides"
PK = "dl_kalendereintragid"
OV_PK = "dl_kalender_overrideid"
DEFAULT_URL_SETTING = "DV_DEFAULT_URL"
DEFAULT_URL_FALLBACK = "https://orgab4e2f00.crm16.dynamics.com"

KATEGORIEN = ("aufgabe", "reservierung", "vorbestellung", "lieferung", "info")
STATUS_WERTE = ("offen", "erledigt")


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


def _err(message, status=400):
    return func.HttpResponse(
        json.dumps({"success": False, "error": message}, ensure_ascii=False),
        status_code=status, headers=get_cors_headers(),
    )


def _ok(payload, status=200):
    body = {"success": True}
    body.update(payload)
    return func.HttpResponse(
        json.dumps(body, ensure_ascii=False),
        status_code=status, headers=get_cors_headers(),
    )


def _serialize(item):
    """Dataverse-Datensatz → API-Objekt (Klartext + Roh-Felder)."""
    raw_recur = item.get("dl_wiederholung", "") or ""
    if raw_recur.startswith("weekdays:"):
        wiederholung, wochentage = "weekdays", raw_recur.split(":", 1)[1]
    else:
        wiederholung, wochentage = raw_recur, ""
    return {
        "id": item.get(PK, ""),
        "titel": item.get("dl_titel", ""),
        "datum": (item.get("dl_datum") or "")[:10],
        "ganztags": bool(item.get("dl_ganztags", False)),
        "uhrzeit": item.get("dl_uhrzeit", "") or "",
        "kategorie": item.get("dl_kategorie", "aufgabe") or "aufgabe",
        "wiederholung": wiederholung,
        "wochentage": wochentage,
        "kunde_id": item.get("dl_stammkundeid", "") or "",
        "kunde_freitext": item.get("dl_kunde_freitext", "") or "",
        "status": item.get("dl_status", "offen") or "offen",
        "erledigt_am": item.get("dl_erledigt_am", "") or "",
        "notiz": item.get("dl_notiz", "") or "",
    }


def _payload_from_body(body):
    """Baut das Dataverse-Payload aus einem Request-Body und validiert."""
    titel = (body.get("titel") or "").strip()
    ganztags = bool(body.get("ganztags", False))
    uhrzeit = (body.get("uhrzeit") or "").strip()
    datum = (body.get("datum") or "").strip()
    kategorie = (body.get("kategorie") or "aufgabe").strip().lower()
    wiederholung = (body.get("wiederholung") or "").strip().lower()
    wochentage = "".join(c for c in (body.get("wochentage") or "") if c in "1234567")

    errors = []
    if not titel:
        errors.append("Bitte einen Titel eingeben.")
    if not datum:
        errors.append("Bitte ein Datum wählen.")
    if not ganztags and not uhrzeit:
        errors.append("Bitte eine Uhrzeit angeben oder „Ganztags“ wählen.")
    if kategorie not in KATEGORIEN:
        kategorie = "aufgabe"
    # Wiederholung: feste Intervalle ODER Wochentage (weekdays:<ISO-Ziffern>)
    if wiederholung == "weekdays":
        if not wochentage:
            errors.append("Bitte mindestens einen Wochentag wählen.")
        recur_store = "weekdays:" + wochentage
    elif wiederholung in serien.RECURRENCES:
        recur_store = wiederholung
    else:
        recur_store = ""

    payload = {
        "dl_titel": titel,
        "dl_datum": datum,
        "dl_ganztags": ganztags,
        "dl_uhrzeit": "" if ganztags else uhrzeit,
        "dl_kategorie": kategorie,
        "dl_wiederholung": recur_store,
        "dl_stammkundeid": (body.get("kunde_id") or "").strip(),
        "dl_kunde_freitext": (body.get("kunde_freitext") or "").strip(),
        "dl_status": "offen",
        "dl_notiz": (body.get("notiz") or "").strip(),
    }
    return payload, errors


def _fetch_all(base_url, headers):
    """Alle Kalendereinträge laden (Dorfladen-Skala: kleine Menge)."""
    url = f"{base_url}/api/data/v9.2/{ENTITY_SET}"
    params = {"$orderby": "dl_datum asc", "$top": "1000"}
    r = requests.get(url, headers=headers, params=params, timeout=30)
    if r.status_code != 200:
        raise RuntimeError(f"Dataverse GET {r.status_code}")
    return r.json().get("value", [])


def _fetch_overrides(base_url, headers):
    url = f"{base_url}/api/data/v9.2/{OVERRIDE_SET}"
    params = {"$top": "5000"}
    r = requests.get(url, headers=headers, params=params, timeout=30)
    if r.status_code != 200:
        return {}
    grouped = {}
    for ov in r.json().get("value", []):
        sid = ov.get("dl_serie_id", "")
        d = (ov.get("dl_datum") or "")[:10]
        if not sid or not d:
            continue
        grouped.setdefault(sid, {})[d] = {
            "status": ov.get("dl_status", ""),
            "erledigt_am": ov.get("dl_erledigt_am", "") or "",
        }
    return grouped


def _in_range(iso_datum, von, bis):
    return von <= iso_datum[:10] <= bis


def _sort_key(entry):
    # Ganztägige zuerst (0), dann terminierte (1) nach Uhrzeit
    if entry.get("ganztags"):
        return (0, "", entry.get("titel", ""))
    return (1, entry.get("uhrzeit", "99:99"), entry.get("titel", ""))


def main(req: func.HttpRequest) -> func.HttpResponse:
    # Auth: mutierende Methoden immer, Lesen (GET) staged für diesen Endpunkt.
    from shared.auth import admin_auth_guard, read_auth_guard
    guard = admin_auth_guard(req) or read_auth_guard(req)
    if guard is not None:
        return guard

    if req.method == "OPTIONS":
        return func.HttpResponse(status_code=200, headers=get_cors_headers())

    record_id = req.route_params.get("id")

    token = get_token()
    if not token:
        return _err("Verbindung zum Datenspeicher nicht möglich.", 500)

    base_url = _base_url()
    headers = _headers(token)

    try:
        # ── GET: Bereich laden (inkl. Serien-Expansion) ──
        if req.method == "GET":
            von = (req.params.get("von") or "").strip()
            bis = (req.params.get("bis") or "").strip()
            if not von or not bis:
                # Default: aktuelle ISO-Woche (Mo–So)
                today = date.today()
                monday = today.fromordinal(today.toordinal() - today.weekday())
                von = monday.isoformat()
                bis = (monday.fromordinal(monday.toordinal() + 6)).isoformat()

            raw = _fetch_all(base_url, headers)
            overrides = _fetch_overrides(base_url, headers)

            result = []
            for item in raw:
                entry = _serialize(item)
                if entry["wiederholung"]:
                    ov = overrides.get(entry["id"], {})
                    result.extend(serien.expand_entry(entry, von, bis, ov))
                elif entry["datum"] and _in_range(entry["datum"], von, bis):
                    result.append(entry)

            result.sort(key=_sort_key)
            return _ok({"data": result, "von": von, "bis": bis})

        # ── POST: Anlegen ODER Serien-Override ──
        if req.method == "POST":
            override_datum = (req.params.get("override") or "").strip()

            # Override für ein Serien-Vorkommen (erledigen/löschen)
            if record_id and override_datum:
                body = req.get_json() if req.get_body() else {}
                status = (body.get("status") or "erledigt").strip().lower()
                if status not in ("erledigt", "geloescht", "offen"):
                    return _err("Ungültiger Status.")
                # „offen“ = bestehendes Override entfernen (Rückgängig)
                if status == "offen":
                    _delete_override(base_url, headers, record_id, override_datum)
                    return _ok({"message": "Vorkommen zurückgesetzt."})
                ov_payload = {
                    "dl_serie_id": record_id,
                    "dl_datum": override_datum,
                    "dl_status": status,
                    "dl_erledigt_am": datetime.utcnow().isoformat() if status == "erledigt" else None,
                }
                # Bestehendes Override für dieses Datum ersetzen
                _delete_override(base_url, headers, record_id, override_datum)
                r = requests.post(
                    f"{base_url}/api/data/v9.2/{OVERRIDE_SET}",
                    headers={**headers, "Prefer": "return=representation"},
                    json=ov_payload, timeout=30,
                )
                if r.status_code in (200, 201, 204):
                    return _ok({"message": "Vorkommen aktualisiert."}, 201)
                logging.error(f"[kalender] Override failed: {r.status_code} {r.text[:200]}")
                return _err("Speichern fehlgeschlagen.", 500)

            # Normales Anlegen
            body = req.get_json()
            payload, errors = _payload_from_body(body)
            if errors:
                return func.HttpResponse(
                    json.dumps({"success": False, "errors": errors}, ensure_ascii=False),
                    status_code=400, headers=get_cors_headers(),
                )
            r = requests.post(
                f"{base_url}/api/data/v9.2/{ENTITY_SET}",
                headers={**headers, "Prefer": "return=representation"},
                json=payload, timeout=30,
            )
            if r.status_code in (200, 201):
                created = _serialize(r.json()) if r.text else {}
                return _ok({"eintrag": created}, 201)
            logging.error(f"[kalender] Create failed: {r.status_code} {r.text[:200]}")
            return _err("Speichern fehlgeschlagen.", 500)

        # ── PATCH: Eintrag ändern (inkl. Erledigt-Status) ──
        if req.method == "PATCH" and record_id:
            body = req.get_json()
            patch = {}
            for src, dst in (
                ("titel", "dl_titel"), ("datum", "dl_datum"), ("uhrzeit", "dl_uhrzeit"),
                ("kategorie", "dl_kategorie"), ("wiederholung", "dl_wiederholung"),
                ("kunde_id", "dl_stammkundeid"), ("kunde_freitext", "dl_kunde_freitext"),
                ("notiz", "dl_notiz"),
            ):
                if src in body:
                    patch[dst] = (body[src] or "").strip()
            if "ganztags" in body:
                patch["dl_ganztags"] = bool(body["ganztags"])
            if "status" in body:
                status = (body["status"] or "offen").strip().lower()
                if status not in STATUS_WERTE:
                    return _err("Ungültiger Status.")
                patch["dl_status"] = status
                patch["dl_erledigt_am"] = (
                    datetime.utcnow().isoformat() if status == "erledigt" else None
                )
            if not patch:
                return _err("Keine Änderung übergeben.")
            r = requests.patch(
                f"{base_url}/api/data/v9.2/{ENTITY_SET}({record_id})",
                headers={**headers, "If-Match": "*"}, json=patch, timeout=30,
            )
            if r.status_code in (200, 204):
                return _ok({"message": "Gespeichert."})
            logging.error(f"[kalender] Update failed: {r.status_code} {r.text[:200]}")
            return _err("Speichern fehlgeschlagen.", 500)

        # ── DELETE: Einzeleintrag löschen ──
        if req.method == "DELETE" and record_id:
            r = requests.delete(
                f"{base_url}/api/data/v9.2/{ENTITY_SET}({record_id})",
                headers=headers, timeout=30,
            )
            if r.status_code in (200, 204):
                return _ok({"message": "Gelöscht."})
            return _err("Löschen fehlgeschlagen.", 500)

        return _err("Methode nicht erlaubt.", 405)

    except Exception as e:  # pragma: no cover
        logging.error(f"[kalender] Exception: {e}")
        return _err("Unerwarteter Fehler.", 500)


def _delete_override(base_url, headers, serie_id, datum):
    """Bestehendes Override (serie_id + datum) entfernen, falls vorhanden."""
    try:
        flt = f"dl_serie_id eq '{serie_id}' and dl_datum eq {datum}"
        r = requests.get(
            f"{base_url}/api/data/v9.2/{OVERRIDE_SET}",
            headers=headers, params={"$filter": flt, "$select": OV_PK, "$top": "5"},
            timeout=20,
        )
        if r.status_code == 200:
            for ov in r.json().get("value", []):
                oid = ov.get(OV_PK)
                if oid:
                    requests.delete(
                        f"{base_url}/api/data/v9.2/{OVERRIDE_SET}({oid})",
                        headers=headers, timeout=20,
                    )
    except Exception:  # pragma: no cover
        pass
