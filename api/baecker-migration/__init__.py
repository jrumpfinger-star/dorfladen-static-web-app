"""Einmalige Uebernahme des Baecker-Bestands auf die neuen Schluessel.

Vor der Umstellung auf zwei Baeckereien lagen Katalog und Bestellungen unter
Schluesseln ohne Baeckerei-Kennung. Sie gehoeren **Freundl** und werden hier
umgezogen:

    baecker_artikel              -> baecker_artikel_freundl
    baecker_order_JJJJ-MM-TT     -> baecker_order_freundl_JJJJ-MM-TT

Die Einstellungen werden **nicht** verschoben: ``baecker_config`` behaelt seinen
Schluessel und wird beim ersten Speichern im CMS ohnehin in die neue Form
gebracht. ``store.load_config`` bringt die Bruecke dafuer mit.

Dieser Umzug ist **nicht** kritisch fuer den Betrieb: ``store.py`` liest
fehlende neue Schluessel aus den alten (Lesebruecke). Der Umzug raeumt lediglich
auf. Genau deshalb darf er in Ruhe und bewusst ausgeloest werden.

    GET  /api/baecker-migration                 Bericht (nichts wird geschrieben)
    POST /api/baecker-migration {modus:"test"}  dasselbe, ausdruecklich
    POST /api/baecker-migration {modus:"echt"}  fuehrt den Umzug aus

Altschluessel bleiben stehen, damit der Schritt umkehrbar ist.
"""
import json
import logging
import os
import sys

import azure.functions as func

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
sys.path.insert(0, os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
                                "baecker-order"))

from shared.auth import admin_auth_guard  # noqa: E402
import store  # noqa: E402

# read_many liefert hoechstens so viele Datensaetze. Wird die Grenze erreicht,
# ist unklar, ob noch mehr existiert -> lieber abbrechen als still abschneiden.
LESEGRENZE = 400


def _err(msg, status=400, extra=None):
    body = {"success": False, "error": msg}
    if extra:
        body.update(extra)
    return func.HttpResponse(json.dumps(body, ensure_ascii=False),
                             status_code=status, headers=store.cors_headers())


def _ok(payload):
    body = {"success": True}
    body.update(payload)
    return func.HttpResponse(json.dumps(body, ensure_ascii=False),
                             status_code=200, headers=store.cors_headers())


def _positionen(daten):
    return len((daten or {}).get("positionen") or [])


def _bestandsaufnahme(url, hdrs):
    """Was liegt unter welchen Schluesseln? Schreibt nichts."""
    roh = store.read_many(url, hdrs, store.KEY_ORDER, top=LESEGRENZE)
    alt, neu = {}, {}
    unbekannt = []
    for key, daten in roh:
        bk, datum, ist_alt = store.schluessel_deuten(key)
        if not bk or not datum:
            unbekannt.append(key)
            continue
        (alt if ist_alt else neu).setdefault((bk, datum), daten)

    _, alt_katalog = store.read_json(url, hdrs, store.KEY_ARTIKEL)
    _, neu_katalog = store.read_json(
        url, hdrs, store.artikel_store_key(store.ALT_BAECKEREI))

    return {
        "gelesen": len(roh),
        "lesegrenze_erreicht": len(roh) >= LESEGRENZE,
        "alt": alt,
        "neu": neu,
        "unbekannte_schluessel": unbekannt,
        "alt_katalog": (alt_katalog or {}).get("artikel") or [],
        "neu_katalog": (neu_katalog or {}).get("artikel") or [],
    }


def _bericht(auf):
    offen = [d for (bk, d) in auf["alt"] if (bk, d) not in auf["neu"]]
    schon = [d for (bk, d) in auf["alt"] if (bk, d) in auf["neu"]]
    return {
        "bestellungen_alt": len(auf["alt"]),
        "bestellungen_neu": len(auf["neu"]),
        "umzuziehen": sorted(offen),
        "bereits_umgezogen": sorted(schon),
        "positionen_alt": sum(_positionen(d) for d in auf["alt"].values()),
        "positionen_neu": sum(_positionen(d) for d in auf["neu"].values()),
        "katalog_alt": len(auf["alt_katalog"]),
        "katalog_neu": len(auf["neu_katalog"]),
        "unbekannte_schluessel": auf["unbekannte_schluessel"],
    }


def _pruefen(auf):
    """Gibt eine Warnung zurueck oder None."""
    if auf["lesegrenze_erreicht"]:
        return (f"Es wurden {LESEGRENZE} Datens\u00e4tze gelesen \u2013 die "
                "Obergrenze. M\u00f6glicherweise gibt es weitere, die hier nicht "
                "auftauchen. Der Umzug wird abgebrochen, damit nichts still "
                "verlorengeht.")
    if auf["unbekannte_schluessel"]:
        return ("Diese Schl\u00fcssel passen in kein bekanntes Muster: "
                + ", ".join(auf["unbekannte_schluessel"][:5])
                + ". Bitte zuerst pr\u00fcfen.")
    return None


def _umziehen(url, hdrs, auf):
    """Fuehrt den Umzug aus. Ueberspringt bereits vorhandene Ziele."""
    kopiert, uebersprungen, fehler = [], [], []

    for (bk, datum), daten in sorted(auf["alt"].items(), key=lambda kv: kv[0][1]):
        if (bk, datum) in auf["neu"]:
            # Dort liegt bereits ein neuerer Stand - der gilt.
            uebersprungen.append(datum)
            continue
        ziel = store.order_key(bk, datum)
        kopie = dict(daten or {})
        kopie.setdefault("datum", datum)
        kopie["baeckerei"] = bk
        if store.write_json(url, hdrs, ziel, None, kopie,
                            f"Baecker-Bestellung {bk} {datum}"):
            kopiert.append(datum)
        else:
            fehler.append(datum)

    katalog = {"kopiert": False, "artikel": 0}
    if auf["alt_katalog"] and not auf["neu_katalog"]:
        ziel = store.artikel_store_key(store.ALT_BAECKEREI)
        if store.write_json(url, hdrs, ziel, None,
                            {"artikel": auf["alt_katalog"]}, "Baecker-Artikel"):
            katalog = {"kopiert": True, "artikel": len(auf["alt_katalog"])}
        else:
            fehler.append("Katalog")

    return {"kopiert": kopiert, "uebersprungen": uebersprungen,
            "fehler": fehler, "katalog": katalog}


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

    try:
        modus = "test"
        if req.method == "POST":
            try:
                modus = ((req.get_json() or {}).get("modus") or "test").strip().lower()
            except ValueError:
                modus = "test"

        auf = _bestandsaufnahme(url, hdrs)
        bericht = _bericht(auf)
        warnung = _pruefen(auf)

        if modus != "echt":
            bericht["meldung"] = (
                f"Testlauf: {len(bericht['umzuziehen'])} Bestellungen w\u00fcrden "
                f"umgezogen, {len(bericht['bereits_umgezogen'])} sind schon da. "
                + ("Der Katalog w\u00fcrde mitgenommen."
                   if auf["alt_katalog"] and not auf["neu_katalog"]
                   else "Der Katalog braucht nichts."))
            if warnung:
                bericht["warnung"] = warnung
            return _ok(bericht)

        if warnung:
            return _err(warnung, 409, bericht)

        ergebnis = _umziehen(url, hdrs, auf)
        nachher = _bericht(_bestandsaufnahme(url, hdrs))

        # Gegenprobe: Nach dem Umzug muss jede alte Bestellung ein neues
        # Gegenstueck haben. Sonst ist unterwegs etwas verlorengegangen.
        fehlend = [d for d in nachher["umzuziehen"]]
        bericht.update({
            "ergebnis": ergebnis,
            "nachher": nachher,
            "meldung": (f"{len(ergebnis['kopiert'])} Bestellungen umgezogen, "
                        f"{len(ergebnis['uebersprungen'])} \u00fcbersprungen "
                        "(dort lag bereits ein neuerer Stand)."),
        })
        if ergebnis["fehler"] or fehlend:
            bericht["warnung"] = (
                "Nicht alles konnte umgezogen werden: "
                + ", ".join(sorted(set(ergebnis["fehler"] + fehlend))[:10])
                + ". Die Altschl\u00fcssel bleiben unver\u00e4ndert stehen \u2013 "
                "der Betrieb l\u00e4uft \u00fcber die Lesebr\u00fccke weiter.")
        return _ok(bericht)

    except Exception as e:
        logging.error(f"[baecker-migration] {e}")
        return _err("Es ist ein Fehler aufgetreten. Der Bestand wurde nicht "
                    "ver\u00e4ndert.", 500)
