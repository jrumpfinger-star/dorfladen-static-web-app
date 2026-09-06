"""Baecker-Artikelstamm – Katalog lesen und pflegen.

GET   /api/baecker-artikel            Katalog, aufsteigend nach Artikelnummer
POST  /api/baecker-artikel            Artikel anlegen (mit Dublettenpruefung)
PATCH /api/baecker-artikel            Artikel aendern oder aus-/einblenden

Artikel werden nie geloescht, sondern nur ausgeblendet – sonst wuerden alte
Bestellungen im Verlauf unvollstaendig (Spec F5).
"""
import json
import logging
import os
import re
import sys
from datetime import datetime
from difflib import SequenceMatcher

import azure.functions as func

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
sys.path.insert(0, os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
                                "baecker-order"))

from shared.auth import admin_auth_guard  # noqa: E402
import store  # noqa: E402


def _err(msg, status=400, extra=None):
    body = {"success": False, "error": msg}
    if extra:
        body.update(extra)
    return func.HttpResponse(
        json.dumps(body, ensure_ascii=False),
        status_code=status, headers=store.cors_headers(),
    )


def _ok(payload, status=200):
    body = {"success": True}
    body.update(payload)
    return func.HttpResponse(
        json.dumps(body, ensure_ascii=False),
        status_code=status, headers=store.cors_headers(),
    )


def _normalisiert(name):
    """Vergleichsform fuer die Aehnlichkeitspruefung: klein, ohne Sonderzeichen.
    So faellt 'Sonnenblumenkernbot' neben 'Sonnenblumenkernbrot' auf."""
    s = (name or "").lower()
    for a, b in (("\u00e4", "ae"), ("\u00f6", "oe"), ("\u00fc", "ue"), ("\u00df", "ss")):
        s = s.replace(a, b)
    return re.sub(r"[^a-z0-9]", "", s)


def _aehnlich(a, b):
    """True, wenn zwei Namen sich nur in wenigen Zeichen unterscheiden.

    Reines Enthaltensein reicht nicht: Bei
    'Sonnenblumenkern**b**rot' vs. 'Sonnenblumenkernbot' fehlt der Buchstabe in
    der Wortmitte. Deshalb wird die Aehnlichkeitsquote gemessen.
    """
    x, y = _normalisiert(a), _normalisiert(b)
    if not x or not y:
        return False
    if x == y:
        return True
    if abs(len(x) - len(y)) > 3:
        return False
    return SequenceMatcher(None, x, y).ratio() >= 0.93


def _gruppe(nummer, cfg):
    """Warengruppe anhand der Artikelnummer – reine Anzeigehilfe im Kiosk."""
    gruppen = cfg.get("gruppen") or store.DEFAULT_CONFIG["gruppen"]
    s = str(nummer or "").strip()
    if not s.isdigit():
        return gruppen[-1].get("titel", "Sonstiges")
    n = int(s)
    for g in gruppen:
        bis = g.get("bis")
        if bis is None or n <= bis:
            return g.get("titel", "")
    return ""


def main(req: func.HttpRequest) -> func.HttpResponse:
    guard = admin_auth_guard(req)
    if guard:
        return guard
    if req.method == "OPTIONS":
        return func.HttpResponse(status_code=200, headers=store.cors_headers())

    token = store.get_token()
    if not token:
        return _err("Verbindung zum Datenspeicher nicht m\u00f6glich.", 500)
    url, hdrs = store.base_url(), store.headers(token)
    cfg = store.load_config(url, hdrs)

    try:
        artikel = store.load_artikel(url, hdrs)

        if req.method == "GET":
            nur_aktive = (req.params.get("aktiv") or "").lower() in ("1", "true")
            liste = [a for a in artikel if a.get("aktiv")] if nur_aktive else artikel
            return _ok({
                "artikel": [dict(a, gruppe=_gruppe(a.get("nummer"), cfg)) for a in liste],
                "gruppen": cfg.get("gruppen"),
                "anzahl_aktiv": sum(1 for a in artikel if a.get("aktiv")),
                "anzahl_gesamt": len(artikel),
            })

        body = req.get_json()
        rec_id, _ = store.read_json(url, hdrs, store.KEY_ARTIKEL)

        # ── Anlegen ──
        if req.method == "POST":
            name = (body.get("name") or "").strip()
            nummer = str(body.get("nummer") or "").strip()
            if not name:
                return _err("Bitte eine Bezeichnung angeben.")

            if not body.get("bestaetigt"):
                if nummer:
                    treffer = next((a for a in artikel
                                    if str(a.get("nummer") or "").strip() == nummer), None)
                    if treffer:
                        return _err(
                            f"Die Nummer {nummer} geh\u00f6rt bereits zu "
                            f"\u201e{treffer.get('name')}\u201c.",
                            409, {"konflikt": "nummer", "vorhanden": treffer})
                treffer = next((a for a in artikel if _aehnlich(a.get("name"), name)), None)
                if treffer:
                    return _err(
                        f"\u201e{treffer.get('name')}\u201c gibt es bereits \u2013 "
                        f"bitte pr\u00fcfen, ob es derselbe Artikel ist.",
                        409, {"konflikt": "name", "vorhanden": treffer})

            neu = {
                "nummer": nummer,
                "name": name,
                "aktiv": bool(body.get("aktiv", True)),
                "bestellt_in": 0,
                "summe": 0,
                "angelegt_am": datetime.now().date().isoformat(),
                "angelegt_von": (body.get("wer") or "Kiosk").strip(),
            }
            if body.get("nur_wochentag") not in (None, ""):
                neu["nur_wochentag"] = body["nur_wochentag"]

            artikel = store.sort_artikel(artikel + [neu])
            if not store.write_json(url, hdrs, store.KEY_ARTIKEL, rec_id,
                                    {"artikel": artikel}, "Baecker-Artikel"):
                return _err("Der Artikel konnte nicht gespeichert werden.", 500)
            return _ok({"artikel": neu, "meldung": f"\u201e{name}\u201c angelegt."}, 201)

        # ── Aendern / aus- und einblenden ──
        if req.method == "PATCH":
            key = str(body.get("key") or body.get("nummer") or "").strip()
            name_key = (body.get("name_key") or "").strip().lower()
            ziel = None
            for a in artikel:
                if key and str(a.get("nummer") or "").strip() == key:
                    ziel = a
                    break
                if name_key and (a.get("name") or "").strip().lower() == name_key:
                    ziel = a
                    break
            if ziel is None:
                return _err("Der Artikel wurde nicht gefunden.", 404)

            if "aktiv" in body:
                ziel["aktiv"] = bool(body["aktiv"])
            if (body.get("name") or "").strip():
                ziel["name"] = body["name"].strip()
            if "nummer" in body:
                ziel["nummer"] = str(body["nummer"] or "").strip()
            if "nur_wochentag" in body:
                if body["nur_wochentag"] in (None, ""):
                    ziel.pop("nur_wochentag", None)
                else:
                    ziel["nur_wochentag"] = body["nur_wochentag"]

            artikel = store.sort_artikel(artikel)
            if not store.write_json(url, hdrs, store.KEY_ARTIKEL, rec_id,
                                    {"artikel": artikel}, "Baecker-Artikel"):
                return _err("Die \u00c4nderung konnte nicht gespeichert werden.", 500)
            return _ok({"artikel": ziel, "meldung": "Artikel gespeichert."})

        return _err("Nicht unterst\u00fctzte Anfrage.", 405)

    except ValueError:
        return _err("Die Anfrage konnte nicht gelesen werden.")
    except Exception as e:
        logging.error(f"[baecker-artikel] {e}")
        return _err("Es ist ein Fehler aufgetreten. Bitte erneut versuchen.", 500)
