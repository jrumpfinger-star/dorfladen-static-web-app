"""Artikelpflege der Drax-Bestellung (Spec F10).

    GET   /api/drax-artikel     Katalog nach Warengruppe und Haeufigkeit
    POST  /api/drax-artikel     Artikel anlegen
    PATCH /api/drax-artikel     Aendern, aus-/einblenden

Geloescht wird nie, nur ausgeblendet: Ein geloeschter Artikel risse Luecken in
Vorbelegung und Verlauf.

**Die Artikelnummer ist unveraenderlich.** Sie ist der Schluessel, unter dem
die Muehle ihr Sortiment fuehrt - und sie traegt die Gebindegroesse: 40401,
40402, 40405 und 40408 sind dasselbe Weizenmehl in 1 / 2,5 / 5 / 12,5 kg.
Eine Nummer zu aendern hiesse, einen anderen Artikel zu bestellen. Deshalb
gibt es hier - anders als beim Metzger - keinen Nummernumzug.
"""
import json
import os
import sys

import azure.functions as func

_API = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, _API)
sys.path.insert(0, os.path.join(_API, "drax-order"))

from shared.auth import admin_auth_guard  # noqa: E402
import drax_store as store                # noqa: E402

NUMMER_LAENGE = 5


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


def _finde(artikel, nr):
    for i, a in enumerate(artikel):
        if str(a.get("nr") or "").strip() == nr:
            return i
    return -1


def _gruppen_ids():
    return {g.get("id") for g in store.vorlage_gruppen() if g.get("id")}


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
        return _ok({
            "artikel": store.nach_gruppe_und_haeufigkeit(artikel),
            "gruppen": store.vorlage_gruppen(),
        })

    try:
        body = req.get_json()
    except ValueError:
        return _err("Die Angaben konnten nicht gelesen werden.")

    name = (body.get("name") or "").strip()
    nr = str(body.get("nr") or "").strip()

    # ── Anlegen ──────────────────────────────────────────────────────
    if req.method == "POST":
        if not name:
            return _err("Bitte eine Bezeichnung eintragen.")
        if not nr.isdigit() or len(nr) != NUMMER_LAENGE:
            return _err(f"Die Artikelnummer der M\u00fchle hat "
                        f"{NUMMER_LAENGE} Ziffern, zum Beispiel 40401.")
        if _finde(artikel, nr) >= 0:
            return _err(f"Die Nummer {nr} ist bereits vergeben. Zwei Artikel "
                        f"mit derselben Nummer w\u00fcrden in Vorbelegung und "
                        f"Verlauf verschmelzen.")
        aehnlich = next((a for a in artikel
                         if _norm(a.get("name")) == _norm(name)), None)
        if aehnlich and not body.get("trotzdem"):
            return _err(f"\u201e{aehnlich.get('name')}\u201c gibt es schon "
                        f"unter der Nummer {aehnlich.get('nr')}. "
                        f"Wirklich noch einmal anlegen?", 409)
        gruppe = (body.get("gruppe") or "").strip()
        if gruppe and gruppe not in _gruppen_ids():
            return _err("Diese Warengruppe gibt es nicht.")
        artikel.append({
            "nr": nr,
            "name": name,
            "einheit": (body.get("einheit") or "").strip(),
            "ean": (body.get("ean") or "").strip(),
            "gruppe": gruppe or "sonstiges",
            "haeufigkeit": 0,
            "lieferungen": 0,
            "aktiv": True,
            "quelle": "von Hand angelegt",
        })
        if not store.save_artikel(url, hdrs, rec_id, artikel):
            return _err("Der Artikel konnte nicht gespeichert werden.", 502)
        return _ok({"artikel": store.nach_gruppe_und_haeufigkeit(artikel)}, 201)

    # ── Aendern ──────────────────────────────────────────────────────
    if not nr:
        return _err("Ohne Artikelnummer l\u00e4sst sich der Artikel nicht "
                    "zuordnen.")
    i = _finde(artikel, nr)
    if i < 0:
        return _err("Dieser Artikel wurde nicht gefunden.", 404)

    if "aktiv" in body:
        artikel[i]["aktiv"] = bool(body["aktiv"])

    if name:
        # Die Schreibweise der Muehle - sie steht auf dem Formular, das die
        # Muehle liest. Deshalb ist sie aenderbar, die Nummer nicht.
        artikel[i]["name"] = name

    if "einheit" in body:
        artikel[i]["einheit"] = (body.get("einheit") or "").strip()

    if "gruppe" in body:
        gruppe = (body.get("gruppe") or "").strip()
        if gruppe and gruppe not in _gruppen_ids():
            return _err("Diese Warengruppe gibt es nicht.")
        artikel[i]["gruppe"] = gruppe or "sonstiges"

    if not store.save_artikel(url, hdrs, rec_id, artikel):
        return _err("Die \u00c4nderung konnte nicht gespeichert werden.", 502)
    return _ok({"artikel": store.nach_gruppe_und_haeufigkeit(artikel)})
