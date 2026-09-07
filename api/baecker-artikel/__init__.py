"""Baecker-Artikelstamm – Katalog lesen und pflegen.

GET   /api/baecker-artikel?baeckerei=..            Katalog, aufsteigend nach Nummer
POST  /api/baecker-artikel                         Artikel anlegen (mit Dublettenpruefung)
POST  /api/baecker-artikel {aktion:"rechnung"}     Stamm aus einer Rechnung aktualisieren
PATCH /api/baecker-artikel                         Artikel aendern oder aus-/einblenden

Die Baeckerei ist Pflicht: Beide Haeuser vergeben eigene Artikelnummern, ein
gemeinsamer Katalog waere unbrauchbar.

Artikel werden nie geloescht, sondern nur ausgeblendet – sonst wuerden alte
Bestellungen im Verlauf unvollstaendig (Spec F5).
"""
import base64
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
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from shared.auth import admin_auth_guard  # noqa: E402
import store  # noqa: E402
import rechnung_parser  # noqa: E402


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
    gruppen = cfg.get("gruppen") or []
    s = str(nummer or "").strip()
    if not s.isdigit():
        return gruppen[-1].get("titel", "Sonstiges") if gruppen else "Sonstiges"
    n = int(s)
    for g in gruppen:
        bis = g.get("bis")
        if bis is None or n <= bis:
            return g.get("titel", "")
    return ""


def _rechnung(url, hdrs, bk, rec_id, artikel, body):
    """Artikelstamm aus einem Rechnungs-PDF aktualisieren (Spec F22).

    Uebernommen werden **nur Nummer und Bezeichnung**. Mengen taugen nicht,
    weil eine Rechnung mehrere Liefertage zusammenfasst; Preise werden bewusst
    nicht gefuehrt.

    Ohne ``uebernehmen: true`` wird nur eine Vorschau geliefert – der Katalog
    bleibt dann unberuehrt.
    """
    roh = body.get("datei") or ""
    if not roh:
        return _err("Bitte eine Rechnung als PDF ausw\u00e4hlen.")
    try:
        # Der Kiosk schickt die Datei als Base64, ggf. mit data:-Vorspann.
        if "," in roh[:64] and roh[:5].lower() == "data:":
            roh = roh.split(",", 1)[1]
        daten = base64.b64decode(roh)
    except Exception:
        return _err("Die Datei konnte nicht gelesen werden. "
                    "Bitte die Rechnung noch einmal ausw\u00e4hlen.")

    gelesen = rechnung_parser.artikel_aus_pdf(daten)
    if not gelesen:
        return _err(
            "Aus dieser Datei lie\u00dfen sich keine Artikel lesen. "
            "Handelt es sich wirklich um eine Rechnung von "
            f"{store.cfg_von(store.load_config(url, hdrs), bk).get('name') or bk}? "
            "Eingescannte Belege ohne Text k\u00f6nnen nicht ausgewertet werden.")

    vorhanden = {str(a.get("nummer") or "").strip(): a for a in artikel
                 if str(a.get("nummer") or "").strip()}
    neu, geaendert, unveraendert, retouren = [], [], [], []

    for nummer, eintrag in sorted(gelesen.items(), key=lambda kv: store.sort_nr(kv[0])):
        name = eintrag["name"]
        alt = vorhanden.get(nummer)
        if alt is None:
            neu.append({"nummer": nummer, "name": name})
        elif (alt.get("name") or "").strip() != name:
            geaendert.append({"nummer": nummer, "name": name,
                              "bisher": alt.get("name", "")})
        else:
            unveraendert.append({"nummer": nummer, "name": name})

        liefer, retour = eintrag["liefer"], eintrag["retour"]
        if liefer:
            quote = round(retour / liefer * 100)
            retouren.append({
                "nummer": nummer, "name": name,
                "liefer": liefer, "retour": retour, "quote": quote,
                # Ab einem Viertel Ruecklauf lohnt ein Blick auf die Menge.
                "auffaellig": quote >= 25,
            })
    retouren.sort(key=lambda r: r["quote"], reverse=True)

    zusammenfassung = {
        "neu": neu, "geaendert": geaendert,
        "unveraendert_anzahl": len(unveraendert),
        "gelesen": len(gelesen),
        "retouren": retouren,
    }

    if not body.get("uebernehmen"):
        zusammenfassung["meldung"] = (
            f"{len(gelesen)} Positionen gelesen \u2013 "
            f"{len(neu)} neu, {len(geaendert)} mit ge\u00e4nderter Bezeichnung.")
        return _ok(zusammenfassung)

    if not neu and not geaendert:
        zusammenfassung["meldung"] = "Alle Artikel sind bereits aktuell."
        return _ok(zusammenfassung)

    heute = datetime.now().date().isoformat()
    wer = (body.get("wer") or "Rechnung").strip()
    liste = list(artikel)
    for eintrag in geaendert:
        ziel = vorhanden.get(eintrag["nummer"])
        if ziel is not None:
            ziel["name"] = eintrag["name"]
    for eintrag in neu:
        liste.append({
            "nummer": eintrag["nummer"],
            "name": eintrag["name"],
            # Der Artikel wurde nachweislich geliefert -> sofort verwendbar.
            "aktiv": True,
            "bestellt_in": 0,
            "summe": 0,
            "angelegt_am": heute,
            "angelegt_von": wer,
        })

    liste = store.sort_artikel(liste)
    if not store.write_json(url, hdrs, store.artikel_store_key(bk), rec_id,
                            {"artikel": liste}, "Baecker-Artikel"):
        return _err("Die \u00c4nderungen konnten nicht gespeichert werden.", 500)

    zusammenfassung["artikel"] = liste
    zusammenfassung["meldung"] = (
        f"{len(neu)} Artikel neu aufgenommen, "
        f"{len(geaendert)} Bezeichnungen aktualisiert.")
    return _ok(zusammenfassung)


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
    voll_cfg = store.load_config(url, hdrs)

    try:
        # Die Baeckerei ist Pflicht: Beide Haeuser vergeben dieselben Nummern
        # fuer verschiedene Artikel. Ohne Angabe stillschweigend Freundl
        # anzunehmen wuerde frueher oder spaeter den falschen Katalog treffen.
        body = {}
        if req.method in ("POST", "PATCH", "PUT"):
            try:
                body = req.get_json() or {}
            except ValueError:
                return _err("Die Anfrage konnte nicht gelesen werden.")

        bk = ((req.params.get("baeckerei") or "")
              or ((req.route_params or {}).get("baeckerei") or "")
              or (body.get("baeckerei") or "")).strip().lower()
        if not bk:
            return _err("Bitte angeben, um welche B\u00e4ckerei es geht "
                        f"({' oder '.join(store.BAECKEREIEN)}).")
        if not store.baeckerei_gueltig(bk):
            return _err(f"Unbekannte B\u00e4ckerei \u201e{bk}\u201c.")

        cfg = store.cfg_von(voll_cfg, bk)
        artikel = store.load_artikel(url, hdrs, bk)

        if req.method == "GET":
            nur_aktive = (req.params.get("aktiv") or "").lower() in ("1", "true")
            liste = [a for a in artikel if a.get("aktiv")] if nur_aktive else artikel
            return _ok({
                "baeckerei": bk,
                "baeckerei_name": cfg.get("name") or bk,
                "artikel": [dict(a, gruppe=_gruppe(a.get("nummer"), cfg)) for a in liste],
                "gruppen": cfg.get("gruppen"),
                "anzahl_aktiv": sum(1 for a in artikel if a.get("aktiv")),
                "anzahl_gesamt": len(artikel),
            })

        rec_id, _ = store.read_json(url, hdrs, store.artikel_store_key(bk))

        # ── Artikelstamm aus einer Rechnung aktualisieren (Spec F22) ──
        if req.method == "POST" and (body.get("aktion") or "") == "rechnung":
            return _rechnung(url, hdrs, bk, rec_id, artikel, body)

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
            if not store.write_json(url, hdrs, store.artikel_store_key(bk), rec_id,
                                    {"artikel": artikel}, "Baecker-Artikel"):
                return _err("Der Artikel konnte nicht gespeichert werden.", 500)
            return _ok({"artikel": neu, "meldung": f"\u201e{name}\u201c angelegt."}, 201)

        # ── Aendern / aus- und einblenden ──
        if req.method == "PATCH":
            key = str(body.get("key") or body.get("nummer_alt")
                      or body.get("nummer") or "").strip()
            name_key = (body.get("name_key") or "").strip().lower()
            # Erst ueber die Nummer suchen, dann ueber den Namen. Beides in
            # einer Schleife zu pruefen kann den falschen Artikel treffen,
            # wenn ein anderer Eintrag denselben Namen traegt.
            ziel = None
            if key:
                ziel = next((a for a in artikel
                             if str(a.get("nummer") or "").strip() == key), None)
            if ziel is None and name_key:
                ziel = next((a for a in artikel
                             if (a.get("name") or "").strip().lower() == name_key), None)
            if ziel is None:
                return _err("Der Artikel wurde nicht gefunden.", 404)

            alt_nummer = str(ziel.get("nummer") or "").strip()
            neu_nummer = alt_nummer
            if "nummer" in body:
                neu_nummer = str(body["nummer"] or "").strip()
            neu_name = (body.get("name") or "").strip() or ziel.get("name")

            if neu_nummer != alt_nummer and neu_nummer:
                belegt = next((a for a in artikel
                               if a is not ziel
                               and str(a.get("nummer") or "").strip() == neu_nummer), None)
                if belegt:
                    return _err(
                        f"Die Nummer {neu_nummer} geh\u00f6rt bereits zu "
                        f"\u201e{belegt.get('name')}\u201c.",
                        409, {"konflikt": "nummer", "vorhanden": belegt})

            if (neu_name or "").strip().lower() != (ziel.get("name") or "").strip().lower() \
                    and not body.get("bestaetigt"):
                aehnlich = next((a for a in artikel
                                 if a is not ziel and _aehnlich(a.get("name"), neu_name)), None)
                if aehnlich:
                    return _err(
                        f"\u201e{aehnlich.get('name')}\u201c gibt es bereits \u2013 "
                        f"bitte pr\u00fcfen, ob es derselbe Artikel ist.",
                        409, {"konflikt": "name", "vorhanden": aehnlich})

            if "aktiv" in body:
                ziel["aktiv"] = bool(body["aktiv"])
            ziel["name"] = neu_name
            if "nummer" in body:
                ziel["nummer"] = neu_nummer
            if "nur_wochentag" in body:
                if body["nur_wochentag"] in (None, ""):
                    ziel.pop("nur_wochentag", None)
                else:
                    ziel["nur_wochentag"] = body["nur_wochentag"]

            artikel = store.sort_artikel(artikel)
            if not store.write_json(url, hdrs, store.artikel_store_key(bk), rec_id,
                                    {"artikel": artikel}, "Baecker-Artikel"):
                return _err("Die \u00c4nderung konnte nicht gespeichert werden.", 500)

            meldung = "Artikel gespeichert."
            if neu_nummer != alt_nummer and alt_nummer and neu_nummer:
                mit = store.nummer_umziehen(url, hdrs, bk, alt_nummer, neu_nummer)
                if mit:
                    meldung = (f"Artikel gespeichert \u2013 {mit} fr\u00fchere "
                               f"Bestellung{'en' if mit != 1 else ''} mit angepasst.")
            return _ok({"artikel": ziel, "meldung": meldung})

        return _err("Nicht unterst\u00fctzte Anfrage.", 405)

    except ValueError:
        return _err("Die Anfrage konnte nicht gelesen werden.")
    except Exception as e:
        logging.error(f"[baecker-artikel] {e}")
        return _err("Es ist ein Fehler aufgetreten. Bitte erneut versuchen.", 500)
