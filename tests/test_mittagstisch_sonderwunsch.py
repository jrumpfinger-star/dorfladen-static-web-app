"""Telefonisch erfasster Sonderwunsch ist keine ungelesene Kundennachricht.

Spec: specs/mittagstisch-sonderwunsch/spec.md (TC-SW-09 … TC-SW-11)

Aus dem Laden: „Bei telefonischer Bestellung kann es eigentlich keine
Nachricht vom Kunden geben. Warum blinkt es trotzdem auf?" — und als
Vorschlag hinterher: „Evtl. kann die Nachricht gleich beim Erfassen auf
gelesen gesetzt werden."

Genau das prueft dieser Waechter: Was der Server beim Anlegen wirklich
nach Dataverse schreibt. Der HTTP-Aufruf wird abgefangen und der Rumpf
untersucht - von aussen waere das Feld nicht zu sehen.

Ausfuehren:  python tests/test_mittagstisch_sonderwunsch.py
"""
import importlib.util
import json
import os
import sys

HIER = os.path.dirname(os.path.abspath(__file__))
API = os.path.abspath(os.path.join(HIER, "..", "api"))
sys.path.insert(0, API)

import requests      # noqa: E402

os.environ.setdefault("DV_TENANT_ID", "00000000-0000-0000-0000-000000000000")
os.environ.setdefault("DV_CLIENT_ID", "00000000-0000-0000-0000-000000000001")
os.environ["DV_CLIENT_SECRET"] = "test"
os.environ.setdefault("DV_DEFAULT_URL", "https://test.crm4.dynamics.com")

fehler = []


def pruefe(name, bedingung, hinweis=""):
    print(("  ok    " if bedingung else "  FEHL  ") + name
          + ((" — " + hinweis) if hinweis and not bedingung else ""))
    if not bedingung:
        fehler.append(name)


class Antwort:
    def __init__(self, status=200, daten=None):
        self.status_code = status
        self._daten = daten if daten is not None else {"value": []}
        self.text = json.dumps(self._daten)

    def json(self):
        return self._daten


class Spion:
    """Faengt die Anlage ab und merkt sich den geschriebenen Rumpf."""

    def __init__(self):
        self.angelegt = None

    def get(self, url, **kw):
        return Antwort(200, {"value": []})

    def post(self, url, **kw):
        if "mittagsbestellung" in url.lower():
            self.angelegt = kw.get("json") or {}
            # Der Server liest die Antwort zurueck und serialisiert sie.
            return Antwort(201, dict(self.angelegt,
                                     dl_mittagsbestellungid="neu-1"))
        return Antwort(201, {})

    def patch(self, url, **kw):
        return Antwort(204, {})


class Anfrage:
    def __init__(self, method="POST", rumpf=None, params=None):
        self.method = method
        self.params = params or {}
        self.route_params = {}
        self.headers = {}
        self._rumpf = rumpf or {}

    def get_json(self):
        return self._rumpf


def lade():
    spec = importlib.util.spec_from_file_location(
        "lunch_order_sw", os.path.join(API, "lunch-order", "__init__.py"))
    modul = importlib.util.module_from_spec(spec)
    sys.modules["lunch_order_sw"] = modul
    spec.loader.exec_module(modul)
    modul.get_token = lambda: "test-token"
    return modul


def anlegen(lunch, quelle, anmerkung="ohne Beilage", datum=None):
    spion = Spion()
    requests.get, requests.post, requests.patch = spion.get, spion.post, spion.patch
    lunch.main(Anfrage(rumpf={
        "name": "Testkunde",
        "gericht": "Schaschlikpfanne",
        "menge": 1,
        "preis": 8.8,
        "datum": datum or lunch._heute_lokal(),
        "anmerkung": anmerkung,
        "quelle": quelle,
    }))
    return spion.angelegt


def morgen(lunch):
    """Online-Bestellungen fuer *heute* scheitern nach Bestellschluss.

    Der Waechter liefe dann je nach Tageszeit mal durch und mal nicht -
    und schlimmer: Er pruefte stillschweigend gar nichts. Deshalb legt der
    Online-Fall auf morgen an.
    """
    from datetime import date, timedelta as td
    return (date.fromisoformat(lunch._heute_lokal()) + td(days=1)).isoformat()


def main():
    lunch = lade()
    print("Quellen:", lunch.QUELLE_ONLINE, lunch.QUELLE_TELEFON, lunch.QUELLE_PERSONAL)

    print("\n1) Telefonisch erfasst: der eigene Wunsch gilt als gelesen")
    tel = anlegen(lunch, lunch.QUELLE_TELEFON)
    pruefe("TC-SW-09  Anlage erfolgt", bool(tel))
    if tel:
        pruefe("TC-SW-09  dl_kommentar_gelesen ist True",
               tel.get("dl_kommentar_gelesen") is True,
               f"war {tel.get('dl_kommentar_gelesen')!r}")
        pruefe("TC-SW-09  der Wunsch wird trotzdem gespeichert",
               tel.get("dl_anmerkung") == "ohne Beilage",
               f"war {tel.get('dl_anmerkung')!r}")

    print("\n2) Am Tresen erfasst: dasselbe")
    pers = anlegen(lunch, lunch.QUELLE_PERSONAL)
    pruefe("TC-SW-10  Anlage erfolgt", bool(pers))
    if pers:
        pruefe("TC-SW-10  dl_kommentar_gelesen ist True",
               pers.get("dl_kommentar_gelesen") is True,
               f"war {pers.get('dl_kommentar_gelesen')!r}")

    print("\n3) Online bestellt: der Kunde hat selbst geschrieben")
    onl = anlegen(lunch, lunch.QUELLE_ONLINE, datum=morgen(lunch))
    pruefe("TC-SW-11  Anlage erfolgt",
           bool(onl), "Online-Anlage abgelehnt - der Fall bliebe ungeprueft")
    if onl:
        pruefe("TC-SW-11  dl_kommentar_gelesen bleibt False",
               onl.get("dl_kommentar_gelesen") is False,
               f"war {onl.get('dl_kommentar_gelesen')!r}")

    print("\n4) Ohne Wunsch bleibt es unauffaellig")
    leer = anlegen(lunch, lunch.QUELLE_TELEFON, anmerkung="")
    pruefe("TC-SW-11  Anlage erfolgt", bool(leer))
    if leer:
        pruefe("TC-SW-11  auch ohne Anmerkung gesetzt (kein Sonderfall)",
               leer.get("dl_kommentar_gelesen") is True,
               f"war {leer.get('dl_kommentar_gelesen')!r}")

    print()
    if fehler:
        print(f"{len(fehler)} Pruefung(en) fehlgeschlagen.")
        raise SystemExit(1)
    print("Alle Pruefungen bestanden.")


if __name__ == "__main__":
    main()
