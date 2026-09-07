"""Artikelpflege der Metzger-Bestellung (Spec F9).

    GET   /api/metzger-artikel     Katalog in Formularreihenfolge
    POST  /api/metzger-artikel     Artikel anlegen
    PATCH /api/metzger-artikel     Aendern, aus-/einblenden, Nummer umziehen

Geloescht wird nie, nur ausgeblendet: Ein geloeschter Artikel risse Luecken in
Vorbelegung und Verlauf.
"""
import json
import logging
import os
import sys

import azure.functions as func

_API = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, _API)
sys.path.insert(0, os.path.join(_API, "metzger-order"))

from shared.auth import admin_auth_guard  # noqa: E402
import metzger_store as store              # noqa: E402


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
    try:
        return int(str(wert).strip()) if str(wert).strip() else None
    except (TypeError, ValueError):
        return None


def _finde(artikel, name=None, nummer=None):
    for i, a in enumerate(artikel):
        if nummer is not None and a.get("nummer") == nummer:
            return i
        if name is not None and (a.get("name") or "") == name:
            return i
    return -1


def _nummer_umziehen(url, hdrs, alt, neu):
    """Frueher erfasste Positionen und Vorschlaege auf die neue Nummer ziehen.

    Ohne das verloere der Artikel seine Vorbelegung, und die alte Nummer
    tauchte im Verlauf als fremde Position auf (Spec F9).
    """
    for order in store.bestellungen(url, hdrs):
        geaendert = False
        for p in order.get("positionen", []):
            if p.get("nummer") == alt:
                p["nummer"] = neu
                geaendert = True
        if geaendert:
            rec_id, _ = store.load_order(url, hdrs, order.get("datum", ""))
            store.save_order(url, hdrs, rec_id, order)

    v_id, vorschlaege = store.load_vorschlaege(url, hdrs)
    if str(alt) in vorschlaege:
        vorschlaege[str(neu)] = vorschlaege.pop(str(alt))
        store.save_vorschlaege(url, hdrs, v_id, vorschlaege)


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
        return _ok({"artikel": artikel})

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
        artikel.append({
            "name": name,
            "nummer": nummer,
            "metzger_name": None,
            "preis": body.get("preis"),
            "einheit": body.get("einheit") or "kg",
            "gruppe": body.get("gruppe") or "Nicht auf dem Formular",
            "aktiv": True,
            "auf_formular": bool(body.get("auf_formular", True)),
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

    if "nummer" in body and nummer != artikel[i].get("nummer"):
        if nummer is not None:
            doppelt = _finde(artikel, nummer=nummer)
            if doppelt >= 0 and doppelt != i:
                return _err(f"Die Nummer {nummer} ist bereits vergeben.")
        vorher = artikel[i].get("nummer")
        artikel[i]["nummer"] = nummer
        if vorher is not None and nummer is not None:
            try:
                _nummer_umziehen(url, hdrs, vorher, nummer)
            except Exception as e:
                logging.error(f"[metzger] Nummernumzug fehlgeschlagen: {e}")

    for feld in ("preis", "einheit", "gruppe"):
        if feld in body:
            artikel[i][feld] = body[feld]

    if not store.save_artikel(url, hdrs, rec_id, artikel):
        return _err("Die \u00c4nderung konnte nicht gespeichert werden.", 502)
    return _ok({"artikel": artikel})
