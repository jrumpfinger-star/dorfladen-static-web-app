"""Der Archivlauf loescht nichts mehr.

Spec: specs/archivlauf-abschalten/spec.md

Der Lauf sollte Online-Bestellungen aelter als 31 Tage zu Tagessummen
verdichten und die Detaildatensaetze loeschen. Er hat es nie getan: Sein
OData-Filter vergleicht dl_datum ohne Anfuehrungszeichen, und weil das
ein Textfeld ist, weist Dataverse mit 400 ab. Das `break` bricht still
ab - seit es diesen Code gibt.

Nachgemessen, was eine Korrektur heute ausloesen wuerde:

    90 Online-Bestellungen wuerden geloescht, 26 Kundinnen betroffen,
    13 davon mit Nachrichtenverlauf, 3 mit Storno-Grund.

Deshalb wurde der Lauf abgeschaltet statt repariert. Dieser Waechter
haelt die Entscheidung fest - und vor allem, dass sie nicht versehentlich
zurueckgenommen wird.

Ausfuehren:  python tests/test_archivlauf.py
"""
import importlib.util
import json
import os
import sys

HIER = os.path.dirname(os.path.abspath(__file__))
API = os.path.abspath(os.path.join(HIER, "..", "api"))
sys.path.insert(0, API)

import requests      # noqa: E402

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


class Antwort:
    def __init__(self, code, rumpf):
        self.status_code = code
        self._rumpf = rumpf
        self.text = json.dumps(rumpf)

    def json(self):
        return self._rumpf


class Speicher:
    """Ersatz-Dataverse, der jedes Loeschen mitschreibt.

    Der Filter wird hier ABSICHTLICH nicht nachgebildet: Geprueft wird,
    dass gar nicht erst gesucht und geloescht wird. Ein Mock, der den
    kaputten Filter nachstellt, wuerde denselben Befund auch dann
    liefern, wenn die Abschaltung fehlt - und damit nichts beweisen.
    """

    def __init__(self, bestand):
        self.bestand = bestand
        self.geloescht = []
        self.gefragt = []

    def get(self, url, **kw):
        self.gefragt.append(url)
        if "dl_seiteninhalts" in url:
            # Das vorhandene Archiv mit alten Tageszahlen.
            return Antwort(200, {"value": [{
                "dl_seiteninhaltid": "rec-archiv",
                "dl_wert": json.dumps({
                    "2026-06-01": {"total": 7, "0": 5, "1": 2, "2": 0, "3": 0, "menge": 9},
                    "_meta": {"last_run": "2026-06-02"},
                }),
            }]})
        return Antwort(200, {"value": list(self.bestand)})

    def post(self, url, **kw):
        return Antwort(201, {})

    def patch(self, url, **kw):
        return Antwort(204, {})

    def delete(self, url, **kw):
        rec = url.split("(")[-1].split(")")[0]
        self.geloescht.append(rec)
        return Antwort(204, {})


def alte_bestellung(nr):
    return {
        "dl_mittagsbestellungid": f"alt-{nr}",
        "dl_status": 1, "dl_datum": "2026-06-22", "dl_menge": 1,
        "dl_quelle": 0, "dl_name": f"Kundin {nr}",
        "dl_kunde_kommentar": "Bitte ohne Zwiebeln",
    }


def main():
    print("Archivlauf abgeschaltet\n")
    lunch = lade("lunch-order/__init__.py", "lunch_archiv_test")
    lunch.get_token = lambda: "test-token"

    bestand = [alte_bestellung(i) for i in range(1, 6)]

    # ── TC-AR-01: Der Schalter steht auf aus
    print("TC-AR-01  Der Schalter")
    pruefe("TC-AR-01  ARCHIVE_ENABLED ist False",
           lunch.ARCHIVE_ENABLED is False,
           f"war {lunch.ARCHIVE_ENABLED!r}")

    # ── TC-AR-02: Es wird nichts geloescht - der Kern
    print("\nTC-AR-02  Nichts wird geloescht")
    dv = Speicher(bestand)
    requests.get, requests.post = dv.get, dv.post
    requests.patch, requests.delete = dv.patch, dv.delete
    lunch._archive_old_orders("https://test", {})
    pruefe("TC-AR-02  keine einzige Loeschung",
           dv.geloescht == [], f"geloescht: {dv.geloescht}")
    pruefe("TC-AR-02  es wird gar nicht erst nach Bestellungen gesucht",
           not any("dl_mittagsbestellungs" in u for u in dv.gefragt),
           f"gefragt: {dv.gefragt}")

    # ── TC-AR-03: Die alten Zahlen bleiben - sonst verschwaende die
    # Statistik rueckwirkend.
    print("\nTC-AR-03  Die bereits verdichteten Zahlen bleiben lesbar")
    dv = Speicher(bestand)
    requests.get, requests.post = dv.get, dv.post
    requests.patch, requests.delete = dv.patch, dv.delete
    archiv = lunch._archive_old_orders("https://test", {})
    pruefe("TC-AR-03  das Archiv wird zurueckgegeben",
           isinstance(archiv, dict) and "2026-06-01" in archiv,
           f"bekam: {str(archiv)[:120]}")
    pruefe("TC-AR-03  mit den alten Tageszahlen",
           (archiv.get("2026-06-01") or {}).get("total") == 7,
           f"bekam: {archiv.get('2026-06-01')}")

    # ── TC-AR-04: Der Schalter allein genuegt nicht.
    # Wer ihn umlegt, ohne den Filter zu reparieren, loescht trotzdem
    # nichts - Dataverse weist den unquotierten Textvergleich ab. Dieser
    # Fall haelt fest, dass der kaputte Filter noch dort steht, damit
    # niemand den Schalter fuer eine vollstaendige Reparatur haelt.
    print("\nTC-AR-04  Der Filter ist weiterhin der alte")
    quelle = open(os.path.join(API, "lunch-order", "__init__.py"),
                  encoding="utf-8-sig").read()
    zweig = quelle.split("def _archive_old_orders")[1][:2000]
    pruefe("TC-AR-04  der Filter vergleicht dl_datum ohne Anfuehrungszeichen",
           "dl_datum lt {cutoff_iso}T00:00:00Z" in zweig,
           "der Filter wurde veraendert - dann bitte auch die Spec nachziehen")

    # ── TC-AR-05: Die Begruendung steht im Code, nicht nur in der Spec.
    print("\nTC-AR-05  Die Entscheidung ist im Code nachlesbar")
    kopf = quelle.split("ARCHIVE_ENABLED")[0][-2200:]
    for wort, was in (("90", "die Zahl der betroffenen Bestellungen"),
                      ("Nachrichtenverlauf", "der Hinweis auf die Verlaeufe")):
        pruefe(f"TC-AR-05  {was} steht dabei", wort in kopf)

    print()
    if _fehler:
        print(f"{len(_fehler)} Pruefung(en) fehlgeschlagen:")
        for f in _fehler:
            print(f"  - {f}")
        sys.exit(1)
    print("Alle Pruefungen bestanden.")


if __name__ == "__main__":
    main()
