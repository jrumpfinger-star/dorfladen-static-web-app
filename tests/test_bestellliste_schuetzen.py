"""Die Bestellliste ist kein oeffentliches Verzeichnis.

Spec: specs/bestellliste-schuetzen/spec.md

Befund vom 27.09.2026: ``GET /api/lunch-order`` **ohne einen einzigen
Parameter** lieferte 200 Datensaetze mit Namen, E-Mail-Adressen und
Telefonnummern - offen aus dem Internet.

Aufgefallen ist das nicht bei der Suche danach, sondern beim Absichern
der E-Mail-Abfrage: Dort wurde der Filter geleert, und die Anfrage fiel
bis in den Listenzweig durch. Ein Waechter zeigte statt einer leeren
Liste die Namen aller Kunden.

Der gefaehrlichere Teil dieser Aenderung ist nicht die Sperre, sondern
was sie mitreissen koennte. Am selben Endpunkt haengen drei
Kundenwege, die WEITER ohne Kiosk-Token funktionieren muessen:

  * ``mode=my`` mit Geraete-Kennung  - die Kachel auf der Startseite
  * ``mode=my`` mit Anmeldezeichen   - dasselbe auf anderen Geraeten
  * ``nr=...`` mit E-Mail/Kennung    - die Statusseite

Faellt einer davon, merkt es der Laden am naechsten Morgen.

Ausfuehren:  python tests/test_bestellliste_schuetzen.py
"""
import importlib.util
import json
import os
import sys
from datetime import datetime, timedelta

HIER = os.path.dirname(os.path.abspath(__file__))
API = os.path.abspath(os.path.join(HIER, "..", "api"))
sys.path.insert(0, API)

import jwt as pyjwt      # noqa: E402
import requests          # noqa: E402

JWT_SECRET = "dorfladen-shop-secret-change-in-production-2026"
TOKEN = "geheimes-kiosk-token"

_fehler = []


def pruefe(name, bedingung, hinweis=""):
    if bedingung:
        print(f"  ok  {name}")
    else:
        print(f"  FEHLER  {name}" + (f"  -> {hinweis}" if hinweis else ""))
        _fehler.append(name)


def lade(pfad, name):
    spec = importlib.util.spec_from_file_location(
        name, os.path.join(API, *pfad.split("/")))
    modul = importlib.util.module_from_spec(spec)
    sys.modules[name] = modul
    spec.loader.exec_module(modul)
    return modul


def zeichen(email):
    jetzt = datetime.utcnow()
    return pyjwt.encode({"sub": "k1", "email": email, "name": "Test",
                         "iat": jetzt, "exp": jetzt + timedelta(days=90)},
                        JWT_SECRET, algorithm="HS256")


class Antwort:
    def __init__(self, code, rumpf):
        self.status_code = code
        self._rumpf = rumpf
        self.text = json.dumps(rumpf)

    def json(self):
        return self._rumpf


class Anfrage:
    def __init__(self, method="GET", params=None, headers=None, route=None):
        self.method = method
        self.params = params or {}
        self.headers = headers or {}
        self.route_params = route or {}
        self.url = "https://test/api/lunch-order"

    def get_json(self):
        return {}


class Speicher:
    """Wertet den OData-Filter aus, damit die Kundenwege echt gepruefte
    Ergebnisse liefern und nicht nur irgendetwas."""

    def __init__(self, saetze):
        self.saetze = saetze

    def get(self, url, **kw):
        if "$filter=" not in url:
            return Antwort(200, {"value": list(self.saetze)})
        f = url.split("$filter=")[1].split("&")[0]
        treffer = []
        for s in self.saetze:
            if "dl_email eq '" in f:
                w = f.split("dl_email eq '")[1].split("'")[0]
                if (s.get("dl_email") or "").lower() != w.lower():
                    continue
            if "dl_device_id eq '" in f:
                w = f.split("dl_device_id eq '")[1].split("'")[0]
                if (s.get("dl_device_id") or "") != w:
                    continue
            if "dl_bestellnummer eq '" in f:
                w = f.split("dl_bestellnummer eq '")[1].split("'")[0]
                if (s.get("dl_bestellnummer") or "") != w:
                    continue
            treffer.append(s)
        return Antwort(200, {"value": treffer})

    def post(self, url, **kw):
        return Antwort(201, {})

    def patch(self, url, **kw):
        return Antwort(204, {})

    def delete(self, url, **kw):
        return Antwort(204, {})


def satz(name, email, device, nr, datum):
    return {
        "dl_mittagsbestellungid": f"id-{name}", "dl_name": name,
        "dl_email": email, "dl_device_id": device, "dl_bestellnummer": nr,
        "dl_gericht": "Dampfnudeln", "dl_datum": datum, "dl_status": 1,
        "dl_quelle": 0, "dl_menge": 1, "dl_preis": 7.8,
    }


def main():
    print("Bestellliste schuetzen\n")
    lunch = lade("lunch-order/__init__.py", "lunch_schutz_test")
    lunch.get_token = lambda: "test-token"

    heute = lunch._heute_lokal()
    ANNA = "anna@example.com"
    bestand = [
        satz("Anna", ANNA, "geraet-anna", "ML-1", heute),
        satz("Bert", "bert@example.com", "geraet-bert", "ML-2", heute),
        satz("Gast", "", "geraet-gast", "ML-3", heute),
    ]

    os.environ["CMS_AUTH_TOKEN"] = TOKEN

    def hole(params=None, kopf=None, erzwingen=True):
        os.environ["CMS_AUTH_ENFORCE"] = "true" if erzwingen else ""
        os.environ["LUNCH_LIST_ENFORCE"] = ""
        dv = Speicher(bestand)
        requests.get, requests.post = dv.get, dv.post
        requests.patch, requests.delete = dv.patch, dv.delete
        antwort = lunch.main(Anfrage(params=params or {}, headers=kopf or {}))
        try:
            daten = json.loads(antwort.get_body().decode("utf-8"))
        except Exception:
            daten = {}
        return antwort, daten

    def namen(d):
        aus = d.get("orders", [])
        if not isinstance(aus, list):
            return []
        return sorted(o.get("name", "") for o in aus)

    # ── TC-BL-01: Der gemeldete Fall
    print("TC-BL-01  Die blanke Liste ohne alles")
    antwort, d = hole()
    pruefe("TC-BL-01  wird abgewiesen", antwort.status_code == 401,
           f"war {antwort.status_code}, Namen: {namen(d)}")
    pruefe("TC-BL-01  und gibt keine Namen preis", namen(d) == [],
           f"bekam {namen(d)}")

    # ── TC-BL-02: Auch mit Datum - das ist der uebliche Kiosk-Aufruf
    print("\nTC-BL-02  Auch mit Datum")
    antwort, d = hole(params={"datum": heute})
    pruefe("TC-BL-02  wird abgewiesen", antwort.status_code == 401,
           f"war {antwort.status_code}")

    # ── TC-BL-03: Mit Kiosk-Token geht es
    print("\nTC-BL-03  Mit Kiosk-Token")
    antwort, d = hole(params={"datum": heute},
                      kopf={"X-CMS-Auth": TOKEN})
    pruefe("TC-BL-03  der Kiosk kommt durch", antwort.status_code == 200,
           f"war {antwort.status_code}: {d}")
    pruefe("TC-BL-03  und sieht alle drei", len(namen(d)) == 3,
           f"bekam {namen(d)}")

    antwort, d = hole(params={"datum": heute},
                      kopf={"X-CMS-Auth": "falsches-token"})
    pruefe("TC-BL-03  falsches Token hilft nicht", antwort.status_code == 401,
           f"war {antwort.status_code}")

    # ── TC-BL-04 bis 06: Die Kundenwege muessen OHNE Token bleiben.
    # Das ist der Teil, der den Laden am naechsten Morgen trifft.
    print("\nTC-BL-04  Kachel ueber die Geraete-Kennung (ohne Token)")
    antwort, d = hole(params={"mode": "my", "device_id": "geraet-gast"})
    pruefe("TC-BL-04  der Gast sieht seine Bestellung",
           antwort.status_code == 200 and namen(d) == ["Gast"],
           f"war {antwort.status_code}, bekam {namen(d)}")

    print("\nTC-BL-05  Kachel ueber das Anmeldezeichen (ohne Token)")
    antwort, d = hole(params={"mode": "my"},
                      kopf={"X-Shop-Token": zeichen(ANNA)})
    pruefe("TC-BL-05  Anna sieht ihre Bestellung",
           antwort.status_code == 200 and namen(d) == ["Anna"],
           f"war {antwort.status_code}, bekam {namen(d)}")

    print("\nTC-BL-06  Statusseite ueber die Bestellnummer (ohne Token)")
    antwort, d = hole(params={"nr": "ML-1", "email": ANNA})
    pruefe("TC-BL-06  die Bestellung wird gefunden",
           antwort.status_code == 200 and bool(d.get("order")),
           f"war {antwort.status_code}: {str(d)[:120]}")

    # ── TC-BL-07: Ohne Erzwingung bleibt alles wie bisher.
    # Das ist die Sicherung fuer den Rollout: Der Code darf ausgeliefert
    # werden, bevor der Kiosk das Token nachweislich mitschickt.
    print("\nTC-BL-07  Ohne CMS_AUTH_ENFORCE bleibt alles offen")
    antwort, d = hole(params={"datum": heute}, erzwingen=False)
    pruefe("TC-BL-07  die Liste kommt wie bisher",
           antwort.status_code == 200 and len(namen(d)) == 3,
           f"war {antwort.status_code}, bekam {namen(d)}")

    # ── TC-BL-08 bis 10: Der EIGENE Schalter.
    # CMS_AUTH_ENFORCE gilt fuer 25 Endpunkte auf einmal. Wer nur diese
    # Liste schliessen will, muesste den gesamten Schreibbetrieb von CMS
    # und Kiosk mit umlegen - eine Entscheidung, die niemand nebenbei
    # trifft. Genau daran hing der Schutz monatelang fest.
    def hole2(cms, eigen, kopf=None, params=None):
        os.environ["CMS_AUTH_ENFORCE"] = cms
        os.environ["LUNCH_LIST_ENFORCE"] = eigen
        dv = Speicher(bestand)
        requests.get, requests.post = dv.get, dv.post
        requests.patch, requests.delete = dv.patch, dv.delete
        antwort = lunch.main(Anfrage(params=params or {"datum": heute},
                                     headers=kopf or {}))
        try:
            daten = json.loads(antwort.get_body().decode("utf-8"))
        except Exception:
            daten = {}
        return antwort, daten

    print("\nTC-BL-08  LUNCH_LIST_ENFORCE allein schliesst die Liste")
    antwort, d = hole2("", "1")
    pruefe("TC-BL-08  ohne Token abgewiesen", antwort.status_code == 401,
           f"war {antwort.status_code}, Namen: {namen(d)}")
    antwort, d = hole2("", "1", kopf={"X-CMS-Auth": TOKEN})
    pruefe("TC-BL-08  mit Token kommt der Kiosk durch",
           antwort.status_code == 200 and len(namen(d)) == 3,
           f"war {antwort.status_code}, bekam {namen(d)}")

    print("\nTC-BL-09  Der eigene Schalter laesst die Kundenwege in Ruhe")
    # Das ist der Punkt, an dem die Entkopplung sich beweisen muss: Wer
    # nur die Liste schliesst, darf niemandem die Kachel nehmen.
    antwort, d = hole2("", "1", params={"mode": "my", "device_id": "geraet-gast"})
    pruefe("TC-BL-09  der Gast sieht seine Bestellung weiterhin",
           antwort.status_code == 200 and namen(d) == ["Gast"],
           f"war {antwort.status_code}, bekam {namen(d)}")
    antwort, d = hole2("", "1", params={"nr": "ML-1", "email": ANNA})
    pruefe("TC-BL-09  die Statusseite arbeitet weiter",
           antwort.status_code == 200, f"war {antwort.status_code}")

    print("\nTC-BL-10  Beide Schalter zusammen und einzeln")
    antwort, _ = hole2("1", "", kopf={})
    pruefe("TC-BL-10  CMS_AUTH_ENFORCE allein wirkt weiterhin",
           antwort.status_code == 401, f"war {antwort.status_code}")
    antwort, _ = hole2("1", "1", kopf={})
    pruefe("TC-BL-10  beide zusammen ebenso",
           antwort.status_code == 401, f"war {antwort.status_code}")
    antwort, d = hole2("", "", kopf={})
    pruefe("TC-BL-10  keiner von beiden - alles offen wie bisher",
           antwort.status_code == 200 and len(namen(d)) == 3,
           f"war {antwort.status_code}")
    # Unsinnige Werte zaehlen als "aus" - ein Tippfehler im Portal darf
    # nicht versehentlich sperren.
    antwort, d = hole2("", "vielleicht", kopf={})
    pruefe("TC-BL-10  ein unsinniger Wert sperrt nicht",
           antwort.status_code == 200, f"war {antwort.status_code}")

    os.environ["CMS_AUTH_ENFORCE"] = ""
    os.environ["LUNCH_LIST_ENFORCE"] = ""

    print()
    if _fehler:
        print(f"{len(_fehler)} Pruefung(en) fehlgeschlagen:")
        for f in _fehler:
            print(f"  - {f}")
        sys.exit(1)
    print("Alle Pruefungen bestanden.")


if __name__ == "__main__":
    main()
