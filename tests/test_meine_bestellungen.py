"""Meine Mittagessen-Bestellungen auf allen Geraeten.

Spec: specs/meine-bestellungen-geraete/spec.md

Der Kern ist eine Sicherheitsregel, und die gehoert auf den Server: Eine
E-Mail-Adresse darf Bestellungen nur zeigen, wenn nachgewiesen ist, dass
sie der anfragenden Person gehoert. Vorher genuegte die blosse Adresse in
der Adresszeile.

Der gefaehrlichste Fall ist nicht "gar kein Nachweis", sondern "gueltiger
Nachweis, aber fuer jemand anderen" (TC-MG-03). Er faellt nur auf, wenn
man mit ZWEI verschiedenen Konten prueft.

Der zweite Schwerpunkt ist der Schaden, den die Absicherung selbst
anrichten koennte: Wer ohne Konto bestellt, findet seine Bestellung ueber
die Geraete-Kennung. Faellt die weg, verliert jeder heutige Kunde seine
Kachel (TC-MG-04).

Ausfuehren:  python tests/test_meine_bestellungen.py
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


def zeichen(email, abgelaufen=False):
    """Ein Anmeldezeichen, wie es api/auth-login ausstellt."""
    jetzt = datetime.utcnow()
    nutz = {
        "sub": "kunde-1",
        "email": email,
        "name": "Test Kunde",
        "iat": jetzt - timedelta(days=1),
        "exp": (jetzt - timedelta(hours=1)) if abgelaufen else (jetzt + timedelta(days=90)),
    }
    return pyjwt.encode(nutz, JWT_SECRET, algorithm="HS256")


class Antwort:
    def __init__(self, code, rumpf):
        self.status_code = code
        self._rumpf = rumpf
        self.text = json.dumps(rumpf)

    def json(self):
        return self._rumpf


class Anfrage:
    """Nachbildung von func.HttpRequest."""

    def __init__(self, method="GET", params=None, headers=None, route=None, body=None):
        self.method = method
        self.params = params or {}
        self.headers = headers or {}
        self.route_params = route or {}
        self._body = body or {}
        self.url = "https://test/api/lunch-order"

    def get_json(self):
        return self._body


class Speicher:
    """Ersatz-Dataverse, der den OData-Filter WIRKLICH auswertet.

    Ein Mock, der jede Anfrage gleich beantwortet, wuerde hier nichts
    pruefen: Die ganze Aenderung besteht darin, WELCHER Filter gestellt
    wird. Deshalb wird der Filter zerlegt und angewandt.
    """

    def __init__(self, saetze):
        self.saetze = saetze
        self.filter_verlauf = []

    def get(self, url, **kw):
        if "$filter=" not in url:
            return Antwort(200, {"value": list(self.saetze)})
        roh = url.split("$filter=")[1].split("&")[0]
        f = requests.utils.unquote(roh) if hasattr(requests, "utils") else roh
        self.filter_verlauf.append(f)

        treffer = []
        for s in self.saetze:
            if "dl_email eq '" in f:
                wert = f.split("dl_email eq '")[1].split("'")[0]
                if (s.get("dl_email") or "").lower() != wert.lower():
                    continue
            if "dl_device_id eq '" in f:
                wert = f.split("dl_device_id eq '")[1].split("'")[0]
                if (s.get("dl_device_id") or "") != wert:
                    continue
            treffer.append(s)
        return Antwort(200, {"value": treffer})

    def post(self, url, **kw):
        return Antwort(201, {})

    def patch(self, url, **kw):
        return Antwort(204, {})

    def delete(self, url, **kw):
        return Antwort(204, {})


def satz(email, device, name, datum):
    return {
        "dl_mittagsbestellungid": f"id-{name}",
        "dl_name": name,
        "dl_email": email,
        "dl_device_id": device,
        "dl_gericht": "Dampfnudeln mit Vanillesosse",
        "dl_datum": datum,
        "dl_status": 1,
        "dl_quelle": 0,
        "dl_menge": 1,
        "dl_preis": 7.8,
        "dl_bestellnummer": f"B-{name}",
    }


def main():
    print("Meine Bestellungen auf allen Geraeten\n")
    lunch = lade("lunch-order/__init__.py", "lunch_mg_test")
    lunch.get_token = lambda: "test-token"

    heute = lunch._heute_lokal()

    ANNA = "anna@example.com"
    BERT = "bert@example.com"
    bestand = [
        satz(ANNA, "geraet-anna", "Anna", heute),
        satz(BERT, "geraet-bert", "Bert", heute),
        satz("", "geraet-gast", "Gast", heute),
    ]

    def hole(kopf=None, params=None):
        dv = Speicher(bestand)
        requests.get, requests.post = dv.get, dv.post
        requests.patch, requests.delete = dv.patch, dv.delete
        p = {"mode": "my"}
        p.update(params or {})
        antwort = lunch.main(Anfrage(params=p, headers=kopf or {}))
        try:
            daten = json.loads(antwort.get_body().decode("utf-8"))
        except Exception:
            daten = {}
        return antwort, daten, dv

    def namen(daten):
        return sorted(o.get("name", "") for o in daten.get("orders", []))

    # ── TC-MG-01: angemeldet -> eigene Bestellung, ohne dass die Adresse
    #    in der Adresszeile steht. Das ist der eigentliche Wunsch.
    print("TC-MG-01  Angemeldet auf einem fremden Geraet")
    _, d, dv = hole(kopf={"X-Shop-Token": zeichen(ANNA)})
    pruefe("TC-MG-01  Anna sieht ihre Bestellung", namen(d) == ["Anna"],
           f"bekam {namen(d)}")
    pruefe("TC-MG-01  gefiltert wurde ueber die E-Mail",
           any("dl_email eq" in f for f in dv.filter_verlauf),
           f"Filter: {dv.filter_verlauf}")

    # ── TC-MG-02: blanke Adresse ohne Nachweis -> nichts.
    #    Genau das war vorher moeglich.
    print("\nTC-MG-02  Fremde Adresse OHNE Nachweis")
    antwort, d, dv = hole(params={"email": BERT})
    pruefe("TC-MG-02  keine fremden Bestellungen", namen(d) == [],
           f"bekam {namen(d)}")
    pruefe("TC-MG-02  es wurde gar nicht erst nach der Adresse gesucht",
           not any("dl_email eq" in f for f in dv.filter_verlauf),
           f"Filter: {dv.filter_verlauf}")

    # ── TC-MG-03: der gefaehrlichere Fall - gueltiges Zeichen, aber fuer
    #    jemand anderen. Wer das uebersieht, baut eine Luecke ein, die mit
    #    nur einem Konto nie auffaellt.
    print("\nTC-MG-03  Gueltiger Nachweis, aber fremde Adresse angefragt")
    _, d, dv = hole(kopf={"X-Shop-Token": zeichen(ANNA)}, params={"email": BERT})
    pruefe("TC-MG-03  Bert bleibt verborgen", "Bert" not in namen(d),
           f"bekam {namen(d)}")
    pruefe("TC-MG-03  Anna bekommt ihre eigenen", namen(d) == ["Anna"],
           f"bekam {namen(d)}")

    # ── TC-MG-04: Der Waechter gegen den eigenen Schaden.
    print("\nTC-MG-04  Ohne Konto, nur mit Geraete-Kennung")
    _, d, _ = hole(params={"device_id": "geraet-gast"})
    pruefe("TC-MG-04  der Gast sieht seine Bestellung weiterhin",
           namen(d) == ["Gast"], f"bekam {namen(d)}")

    _, d, _ = hole(params={"device_id": "geraet-anna"})
    pruefe("TC-MG-04  das gilt auch fuer Bestellungen MIT Adresse",
           namen(d) == ["Anna"], f"bekam {namen(d)}")

    # ── TC-MG-06: Ein abgelaufenes Zeichen ist kein Nachweis.
    print("\nTC-MG-06  Abgelaufener oder gefaelschter Nachweis")
    _, d, _ = hole(kopf={"X-Shop-Token": zeichen(ANNA, abgelaufen=True)})
    pruefe("TC-MG-06  abgelaufen zaehlt nicht", namen(d) == [],
           f"bekam {namen(d)}")

    gefaelscht = pyjwt.encode({"email": ANNA}, "falsches-geheimnis", algorithm="HS256")
    _, d, _ = hole(kopf={"X-Shop-Token": gefaelscht})
    pruefe("TC-MG-06  fremd unterschrieben zaehlt nicht", namen(d) == [],
           f"bekam {namen(d)}")

    _, d, _ = hole(kopf={"X-Shop-Token": "kein-echtes-zeichen"})
    pruefe("TC-MG-06  Unsinn bringt den Server nicht aus dem Tritt",
           namen(d) == [], f"bekam {namen(d)}")

    # ── Zusammenspiel: angemeldet UND Geraete-Kennung. Die Adresse des
    #    Kontos hat Vorrang, sonst saehe Anna am Ladentablett die
    #    Bestellung der letzten Kundin.
    print("\nZusammenspiel")
    _, d, _ = hole(kopf={"X-Shop-Token": zeichen(ANNA)},
                   params={"device_id": "geraet-bert"})
    pruefe("Konto sticht die Geraete-Kennung", namen(d) == ["Anna"],
           f"bekam {namen(d)}")

    # ── Die Statusseite (Bestellnummer + Adresse) bleibt unberuehrt:
    #    Dort ist die Bestellnummer das Geheimnis, nicht die Adresse.
    print("\nAbgrenzung")
    dv = Speicher(bestand)
    requests.get, requests.post = dv.get, dv.post
    requests.patch, requests.delete = dv.patch, dv.delete
    antwort = lunch.main(Anfrage(params={"nr": "B-Anna", "email": ANNA}))
    pruefe("Statusseite arbeitet weiterhin mit Bestellnummer + Adresse",
           antwort.status_code == 200, f"war {antwort.status_code}")

    # ── Der Storno-Grund darf nicht verlorengehen ──
    # Er wird beim Stornieren VERLANGT und ging trotzdem verloren:
    # gespeichert, aber von _serialize nie zurueckgegeben. In Dataverse
    # lagen 12 von 12 stornierten Bestellungen mit Grund, darunter
    # Kundengruende wie "Freitag wos anders" - niemand hat sie gesehen.
    print("\nStorno-Grund")
    dv = Speicher([dict(bestand[0], dl_status=2,
                        dl_storno_grund="Kundengrund: Freitag wos anders")])
    requests.get, requests.post = dv.get, dv.post
    requests.patch, requests.delete = dv.patch, dv.delete
    antwort = lunch.main(Anfrage(params={"mode": "my", "device_id": "geraet-anna"}))
    d = json.loads(antwort.get_body().decode("utf-8"))
    aus = (d.get("orders") or [{}])[0]
    pruefe("Storno-Grund  wird zurueckgegeben",
           aus.get("storno_grund") == "Kundengrund: Freitag wos anders",
           f"bekam: {aus.get('storno_grund')!r}")

    # Und er muss auch ANGEFORDERT werden - Dataverse liefert nur, was
    # im $select steht. Derselbe Fallstrick wie beim Loeschen (TC-TL-S8).
    quelle = open(os.path.join(API, "lunch-order", "__init__.py"),
                  encoding="utf-8-sig").read()
    listen = [z for z in quelle.split("\n") if "dl_mittagsbestellungid,dl_name" in z]
    pruefe("Storno-Grund  steht in jeder Feldauswahl",
           bool(listen) and all("dl_storno_grund" in z for z in listen),
           f"{sum(1 for z in listen if 'dl_storno_grund' not in z)} von {len(listen)} ohne")

    # ── Der Rueckblick: tage_zurueck ──
    # Ohne den Parameter zeigt mode=my nur ab HEUTE - das ist der Fall
    # der Kachel und darf sich nicht aendern. Mit ihm oeffnet sich der
    # Blick nach hinten, fuer den Reiter "Frueher" in der Uebersicht.
    print("\nRueckblick")

    def filter_von(params):
        dv = Speicher(bestand)
        requests.get, requests.post = dv.get, dv.post
        requests.patch, requests.delete = dv.patch, dv.delete
        p = {"mode": "my", "device_id": "geraet-anna"}
        p.update(params)
        lunch.main(Anfrage(params=p))
        for f in dv.filter_verlauf:
            if "dl_datum ge" in f:
                return f.split("dl_datum ge '")[1].split("'")[0]
        return ""

    von_ohne = filter_von({})
    pruefe("Rueckblick  ohne Parameter bleibt es bei heute",
           von_ohne == heute, f"war {von_ohne}, erwartet {heute}")

    von_7 = filter_von({"tage_zurueck": "7"})
    erwartet7 = (lunch.heute_lokal() - __import__("datetime").timedelta(days=7)).isoformat()
    pruefe("Rueckblick  tage_zurueck=7 geht sieben Tage zurueck",
           von_7 == erwartet7, f"war {von_7}, erwartet {erwartet7}")

    pruefe("Rueckblick  unsinniger Wert faellt auf heute zurueck",
           filter_von({"tage_zurueck": "viele"}) == heute)
    pruefe("Rueckblick  negative Werte gehen nicht in die Zukunft",
           filter_von({"tage_zurueck": "-30"}) == heute)

    # Obergrenze: Niemand soll versehentlich die ganze Historie ziehen.
    von_gross = filter_von({"tage_zurueck": "99999"})
    grenze = (lunch.heute_lokal() - __import__("datetime").timedelta(days=400)).isoformat()
    pruefe("Rueckblick  die Obergrenze greift",
           von_gross == grenze, f"war {von_gross}, erwartet {grenze}")

    print()
    if _fehler:
        print(f"{len(_fehler)} Pruefung(en) fehlgeschlagen:")
        for f in _fehler:
            print(f"  - {f}")
        sys.exit(1)
    print("Alle Pruefungen bestanden.")


if __name__ == "__main__":
    main()
