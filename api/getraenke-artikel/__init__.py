"""Artikelpflege der Getraenke-Bestellung (Spec F7, F11).

    GET   /api/getraenke-artikel     Katalog in Warengruppenreihenfolge
    POST  /api/getraenke-artikel     Artikel dauerhaft anlegen
    PATCH /api/getraenke-artikel     Aendern, aus-/einblenden

Geloescht wird nie, nur ausgeblendet: Ein geloeschter Artikel risse Luecken in
Vorbelegung und Verlauf (Spec F11.3).

Anders als beim Metzger sind die Artikelnummern **Zeichenketten** (``KA40015``)
und duerfen fehlen - sechs Artikel wurden nie abgerechnet und haben deshalb
keine Nummer.
"""
import json
import os
import sys

import azure.functions as func

_API = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, _API)
sys.path.insert(0, os.path.join(_API, "getraenke-order"))

from shared.auth import admin_auth_guard  # noqa: E402
import getraenke_store as store            # noqa: E402


def _err(msg, status=400):
    return func.HttpResponse(
        json.dumps({"success": False, "error": msg}, ensure_ascii=False),
        status_code=status, headers=store.cors_headers(),
    )


def _ok(payload, status=200):
    body = {"success": True}
    body.update(payload)
    return func.HttpResponse(
        json.dumps(body, ensure_ascii=False),
        status_code=status, headers=store.cors_headers(),
    )


def _norm(text):
    """Fuer den Aehnlichkeitsvergleich: klein, ohne Leer- und Sonderzeichen."""
    return "".join(c for c in (text or "").lower() if c.isalnum())


def _nummer(wert):
    text = str(wert or "").strip().upper()
    return text or None


def _preis(wert):
    if wert in (None, ""):
        return None
    try:
        return round(float(str(wert).replace(",", ".")), 2)
    except (TypeError, ValueError):
        return None


def _finde(artikel, name=None, nummer=None):
    for i, a in enumerate(artikel):
        if nummer is not None and _nummer(a.get("nummer")) == nummer:
            return i
        if name is not None and (a.get("name") or "") == name:
            return i
    return -1


def _hausnummer(artikel):
    """Stabiler Schluessel fuer selbst angelegte Artikel.

    Kratzers Nummern beginnen mit ``KA``; eine Hausnummer ``DL-3`` ist davon
    klar zu unterscheiden. Ohne Nummer waere der Name der Schluessel - eine
    spaetere Umbenennung risse dann die Verbindung zu Vorbelegung und
    Verlauf ab, genau das, was Spec F11.3 verhindern will.
    """
    hoechste = 0
    for a in artikel:
        nr = str(a.get("nummer") or "")
        if nr.startswith("DL-") and nr[3:].isdigit():
            hoechste = max(hoechste, int(nr[3:]))
    return f"DL-{hoechste + 1}"


def main(req: func.HttpRequest) -> func.HttpResponse:
    if req.method == "OPTIONS":
        return func.HttpResponse("", status_code=204, headers=store.cors_headers())

    blocked = admin_auth_guard(req)
    if blocked:
        return blocked

    token = store.get_token()
    if not token:
        return _err("Die Verbindung zum Bestellsystem steht gerade nicht zur "
                    "Verf\u00fcgung. Bitte sp\u00e4ter erneut versuchen.", 503)
    url, hdrs = store.base_url(), store.headers(token)
    rec_id, artikel = store.load_artikel(url, hdrs)

    if req.method == "GET":
        return _ok({"artikel": artikel, "gruppen": store.gruppen(),
                    "pfand": store.pfandsaetze()})

    try:
        body = req.get_json()
    except ValueError:
        return _err("Die Angaben konnten nicht gelesen werden.")

    name = (body.get("name") or "").strip()
    nummer = _nummer(body.get("nummer"))

    # ── Anlegen ──────────────────────────────────────────────────────
    if req.method == "POST":
        if not name:
            return _err("Bitte eine Bezeichnung eintragen.")
        if nummer is not None and _finde(artikel, nummer=nummer) >= 0:
            return _err(f"Die Nummer {nummer} ist bereits vergeben. Zwei "
                        f"Artikel mit derselben Nummer w\u00fcrden in "
                        f"Vorbelegung und Verlauf verschmelzen.")
        aehnlich = next((a for a in artikel
                         if _norm(a.get("name")) == _norm(name)), None)
        if aehnlich and not body.get("trotzdem"):
            return _err(f"\u201e{aehnlich.get('name')}\u201c gibt es schon. "
                        f"Wirklich noch einmal anlegen?", 409)
        gebinde = (body.get("gebinde") or "").strip()
        gruppen = store.gruppen()
        artikel.append({
            "nummer": nummer or _hausnummer(artikel),
            "name": name,
            # Fehlt eine gewachsene Schreibweise, bilden Bezeichnung und
            # Gebinde die Mailzeile - so, wie sie im Kiosk vorgeschaut wurde.
            "bestelltext": (body.get("bestelltext") or "").strip()
                           or f"{name} {gebinde}".strip(),
            "gebinde": gebinde,
            "gruppe": (body.get("gruppe") or "").strip()
                      or (gruppen[-1] if gruppen else ""),
            "preis": _preis(body.get("preis")),
            "pfand": store.pfandsaetze().get(gebinde),
            "bestellungen": 0,
            "ueblich": None,
            "zuletzt": 0,
            "aktiv": True,
        })
        if not store.save_artikel(url, hdrs, rec_id, artikel):
            return _err("Der Artikel konnte nicht gespeichert werden.", 502)
        return _ok({"artikel": artikel}, 201)

    # ── Aendern ──────────────────────────────────────────────────────
    alt_nummer = _nummer(body.get("alt_nummer"))
    alt_name = (body.get("alt_name") or "").strip() or None
    i = _finde(artikel, name=alt_name, nummer=alt_nummer)
    if i < 0:
        return _err("Dieser Artikel wurde nicht gefunden.", 404)

    if "aktiv" in body:
        artikel[i]["aktiv"] = bool(body["aktiv"])

    if name:
        artikel[i]["name"] = name

    if "nummer" in body and nummer != _nummer(artikel[i].get("nummer")):
        if nummer is not None:
            doppelt = _finde(artikel, nummer=nummer)
            if doppelt >= 0 and doppelt != i:
                return _err(f"Die Nummer {nummer} ist bereits vergeben.")
        artikel[i]["nummer"] = nummer

    if "preis" in body:
        artikel[i]["preis"] = _preis(body["preis"])

    for feld in ("bestelltext", "gebinde", "gruppe"):
        if feld in body:
            artikel[i][feld] = (body[feld] or "").strip()

    if "gebinde" in body:
        artikel[i]["pfand"] = store.pfandsaetze().get(artikel[i]["gebinde"])

    if not store.save_artikel(url, hdrs, rec_id, artikel):
        return _err("Die \u00c4nderung konnte nicht gespeichert werden.", 502)
    return _ok({"artikel": artikel})
