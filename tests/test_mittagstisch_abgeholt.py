"""Abgeholte Bestellungen bleiben den Tag ueber sichtbar.

Spec: specs/mittagstisch-abgeholt-sichtbar/spec.md (TC-A01 … TC-A05)

Aus dem Laden: „Das ist das Problem, abgeholt. Die heutigen Bestellungen
sollten den ganzen Tag angezeigt werden, aber dann auch mit Status
abgeholt. So hat der Kunde die Moeglichkeit, weiterhin zu dieser
Bestellung mit uns zu chatten."

Geprueft wird die ECHTE Abfrage, die an Dataverse ginge: Der HTTP-Aufruf
wird abgefangen und die gebaute OData-Abfrage untersucht. So faellt auf,
wenn der Statusfilter oder der Tagesfilter nicht stimmt - beides waere
von aussen nur schwer zu sehen.

Ausfuehren:  python tests/test_mittagstisch_abgeholt.py
"""
import importlib.util
import json
import os
import sys
from datetime import datetime, timedelta

HIER = os.path.dirname(os.path.abspath(__file__))
API = os.path.abspath(os.path.join(HIER, "..", "api"))
sys.path.insert(0, API)

import requests      # noqa: E402

os.environ.setdefault("DV_TENANT_ID", "00000000-0000-0000-0000-000000000000")
os.environ.setdefault("DV_CLIENT_ID", "00000000-0000-0000-0000-000000000001")
os.environ["DV_CLIENT_SECRET"] = "test"
os.environ.setdefault("DV_DEFAULT_URL", "https://test.crm4.dynamics.com")


def pruefe(name, bedingung, hinweis=""):
    if not bedingung:
        raise AssertionError(f"{name}{(' — ' + hinweis) if hinweis else ''}")
    print(f"  ok  {name}")


class Antwort:
    def __init__(self, status=200, daten=None):
        self.status_code = status
        self._daten = daten if daten is not None else {"value": []}
        self.text = json.dumps(self._daten)

    def json(self):
        return self._daten


class Spion:
    """Faengt jeden Dataverse-Aufruf ab und merkt sich die Adressen."""

    def __init__(self):
        self.aufrufe = []

    def get(self, url, **kw):
        self.aufrufe.append(url)
        return Antwort(200, {"value": []})

    def post(self, url, **kw):
        return Antwort(201, {})

    @property
    def abfrage(self):
        """Die Abfrage auf die Bestelltabelle (nicht die Konfiguration)."""
        for u in self.aufrufe:
            if "mittagsbestellung" in u and "$filter=" in u:
                return u
        return ""


class Anfrage:
    def __init__(self, method="GET", params=None, route=None, headers=None):
        self.method = method
        self.params = params or {}
        self.route_params = route or {}
        self.headers = headers or {}

    def get_json(self):
        return {}


def lade():
    spec = importlib.util.spec_from_file_location(
        "lunch_order_test", os.path.join(API, "lunch-order", "__init__.py"))
    modul = importlib.util.module_from_spec(spec)
    sys.modules["lunch_order_test"] = modul
    spec.loader.exec_module(modul)
    # Die Anmeldung wuerde nach aussen gehen - nur sie wird ersetzt.
    modul.get_token = lambda: "test-token"
    return modul


def berlin_heute():
    try:
        from zoneinfo import ZoneInfo
        tz = ZoneInfo("Europe/Berlin")
    except Exception:
        from datetime import timezone
        tz = timezone(timedelta(hours=2))
    return datetime.now(tz).strftime("%Y-%m-%d")


def main():
    lunch = lade()
    spion = Spion()
    requests.get, requests.post = spion.get, spion.post

    lunch.main(Anfrage(params={"mode": "my", "device_id": "geraet-abc"}))
    q = spion.abfrage
    pruefe("Abfrage auf die Bestelltabelle gebaut", bool(q),
           f"Aufrufe: {spion.aufrufe}")

    print("\nStatusfilter")
    # TC-A01: Abgeholt (3) muss dabei sein - das war der gemeldete Fehler.
    pruefe("TC-A01  Abgeholt (3) ist enthalten", "dl_status eq 3" in q, q)
    # TC-A02: die bisherigen drei bleiben unveraendert.
    for nr, name in ((0, "Neu"), (1, "Bestaetigt"), (2, "Storniert")):
        pruefe(f"TC-A02  {name} ({nr}) weiterhin enthalten",
               f"dl_status eq {nr}" in q, q)
    # TC-A04: genau diese vier, kein weiterer.
    anzahl = q.count("dl_status eq ")
    pruefe("TC-A04  genau vier Status im Filter", anzahl == 4,
           f"waren {anzahl}: {q}")

    print("\nTagesfilter")
    heute = berlin_heute()
    pruefe("TC-A03  filtert auf heute oder spaeter",
           f"dl_datum ge '{heute}'" in q, q)

    # TC-A05: Berliner Kalendertag, nicht UTC. Der Unterschied faellt nur
    # nachts auf - deshalb wird die Quelle geprueft, nicht die Uhrzeit.
    quelle = open(os.path.join(API, "lunch-order", "__init__.py"),
                  encoding="utf-8-sig").read()
    zweig = quelle.split('req.params.get("mode") == "my"')[1][:900]
    pruefe("TC-A05  kein utcnow() im mode=my-Zweig",
           "utcnow()" not in zweig, zweig[:200])
    pruefe("TC-A05  nutzt den Berlin-Helfer", "_heute_lokal()" in zweig)
    # Die Rechnung selbst steht seit der projektweiten Umstellung in
    # shared/zeit.py. Geprueft wird deshalb dort - und vor allem am
    # Verhalten eine Zeile weiter unten, das ueberdauert jeden Umbau.
    gemeinsam = open(os.path.join(API, "shared", "zeit.py"),
                     encoding="utf-8-sig").read()
    pruefe("TC-A05  Helfer kennt Europe/Berlin",
           'ZoneInfo("Europe/Berlin")' in gemeinsam)

    # Der Helfer muss auch wirklich den Berliner Tag liefern.
    pruefe("TC-A05  Helfer liefert den Berliner Tag",
           lunch._heute_lokal() == heute,
           f"{lunch._heute_lokal()} statt {heute}")

    print("\nAlle Pruefungen bestanden.")


if __name__ == "__main__":
    main()
