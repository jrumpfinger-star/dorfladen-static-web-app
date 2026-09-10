"""Getränke-Bestellung: der Weg durch die API (Spec specs/getraenke-bestellung).

Prüft die beiden Endpunkte ``getraenke-order`` und ``getraenke-artikel``
gegen einen Dataverse-Ersatz im Speicher. Damit ist der ganze Rundgang
abgedeckt: Übersicht, Entwurf, Senden, Korrektur, Verlauf, Artikelpflege.

Die Playwright-Tests in ``tests/kiosk-getraenke.spec.js`` decken die
Oberfläche ab und arbeiten mit erfundenen Antworten. Hier läuft der echte
Servercode — beide zusammen ergeben die Abnahme.

Ausführen:  python tests/test_getraenke_order.py
"""
import importlib.util
import json
import os
import sys

HIER = os.path.dirname(os.path.abspath(__file__))
API = os.path.abspath(os.path.join(HIER, "..", "api"))
sys.path.insert(0, API)

import azure.functions as func  # noqa: E402


def lade(pfad, name):
    spec = importlib.util.spec_from_file_location(
        name, os.path.join(API, *pfad.split("/")))
    modul = importlib.util.module_from_spec(spec)
    sys.modules[name] = modul
    spec.loader.exec_module(modul)
    return modul


store = lade("getraenke-order/getraenke_store.py", "getraenke_store")
sys.modules["getraenke_store"] = store
order_api = lade("getraenke-order/__init__.py", "getraenke_order_fn")
artikel_api = lade("getraenke-artikel/__init__.py", "getraenke_artikel_fn")


def pruefe(name, bedingung, hinweis=""):
    if not bedingung:
        raise AssertionError(f"{name}{(' — ' + hinweis) if hinweis else ''}")
    print(f"  ok  {name}")


# ──────────────────────────────────────────────────────────────────────
#  Dataverse im Speicher
# ──────────────────────────────────────────────────────────────────────

class Antwort:
    def __init__(self, status, daten=None):
        self.status_code = status
        self._daten = daten if daten is not None else {}
        self.text = json.dumps(self._daten)

    def json(self):
        return self._daten


class FakeDataverse:
    """Ein Ersatz für ``requests``, der die Tabelle im Speicher hält.

    Nachgebildet wird nur, was der Store wirklich aufruft: Filter auf
    ``dl_schluessel eq`` und ``startswith``, sowie POST und PATCH.
    """

    def __init__(self):
        self.zeilen = {}          # rec_id -> record
        self._zaehler = 0
        self.schreibvorgaenge = 0

    # -- Hilfen --
    def _neu_id(self):
        self._zaehler += 1
        return f"rec-{self._zaehler}"

    def _finde(self, schluessel):
        for rid, r in self.zeilen.items():
            if r["dl_schluessel"] == schluessel:
                return rid, r
        return None, None

    # -- requests-Schnittstelle --
    def get(self, url, headers=None, timeout=None):
        if "dl_schluessel eq" in url:
            schluessel = url.split("dl_schluessel eq '")[1].split("'")[0]
            rid, r = self._finde(schluessel)
            if not r:
                return Antwort(200, {"value": []})
            return Antwort(200, {"value": [{"dl_seiteninhaltid": rid,
                                            "dl_wert": r["dl_wert"]}]})
        if "startswith(dl_schluessel," in url:
            praefix = url.split("startswith(dl_schluessel,'")[1].split("'")[0]
            treffer = [{"dl_schluessel": r["dl_schluessel"], "dl_wert": r["dl_wert"]}
                       for r in self.zeilen.values()
                       if r["dl_schluessel"].startswith(praefix)]
            return Antwort(200, {"value": treffer})
        return Antwort(404)

    def post(self, url, headers=None, json=None, timeout=None):
        self.schreibvorgaenge += 1
        self.zeilen[self._neu_id()] = dict(json)
        return Antwort(201)

    def patch(self, url, headers=None, json=None, timeout=None):
        self.schreibvorgaenge += 1
        rid = url.split("(")[-1].rstrip(")")
        if rid not in self.zeilen:
            return Antwort(404)
        self.zeilen[rid].update(json)
        return Antwort(204)


class Request:
    """Nachbau von ``func.HttpRequest`` — die echte Klasse ist umständlich
    zu füllen, gebraucht werden nur fünf Eigenschaften."""

    def __init__(self, method="GET", route=None, params=None, body=None,
                 headers=None):
        self.method = method
        self.route_params = route or {}
        self.params = params or {}
        self._body = body
        self.headers = headers or {"X-CMS-Auth": "pruefung"}
        self.url = "http://localhost/api/getraenke-order"

    def get_json(self):
        if self._body is None:
            raise ValueError("kein Rumpf")
        return self._body


def antwort(res):
    return json.loads(res.get_body().decode("utf-8"))


# ──────────────────────────────────────────────────────────────────────
#  Aufbau
# ──────────────────────────────────────────────────────────────────────

MAILS = []


def baue_umgebung():
    dv = FakeDataverse()
    for modul in (store, order_api, artikel_api):
        if hasattr(modul, "requests"):
            modul.requests = dv
    store.get_token = lambda: "token-fuer-die-pruefung"
    # Der Auth-Wächter wird an anderer Stelle geprüft (tests/test_auth.py).
    order_api.admin_auth_guard = lambda req: None
    artikel_api.admin_auth_guard = lambda req: None
    MAILS.clear()

    def kein_versand(to_email, to_name, subject, body_text):
        MAILS.append({"an": to_email, "betreff": subject, "text": body_text})
        return True

    order_api._send_mail = kein_versand
    return dv


def in_zukunft(tage=7):
    from datetime import date, timedelta
    return (date.today() + timedelta(days=tage)).isoformat()


# ──────────────────────────────────────────────────────────────────────
#  Prüfungen
# ──────────────────────────────────────────────────────────────────────

def test_uebersicht_kommt_aus_der_vorlage():
    baue_umgebung()
    d = antwort(order_api.main(Request()))
    pruefe("Übersicht antwortet", d.get("success") is True)
    pruefe("Vorschlagstermin liegt in der Zukunft", d["termin"] > "2020-01-01")
    pruefe("Kalenderwoche ist gesetzt", isinstance(d["kw"], int) and 1 <= d["kw"] <= 53)
    pruefe("Testbetrieb ist aktiv, solange keine Lieferantenadresse steht",
           d["testbetrieb"] is True)
    pruefe("Die letzte Bestellung stammt aus der Vorlage",
           d["letzte"] and d["letzte"]["aus_vorlage"] is True)
    pruefe("Die Vorlage enthält Positionen", len(d["letzte"]["positionen"]) > 0)
    pruefe("Kundennummer ist vorbelegt", d["config"]["kd_nr"] == "15554")


def test_tagesabruf_liefert_katalog():
    baue_umgebung()
    tag = in_zukunft()
    d = antwort(order_api.main(Request(route={"datum": tag})))
    pruefe("Tagesabruf antwortet", d.get("success") is True)
    pruefe("Der Katalog ist gefüllt", len(d["artikel"]) >= 40)
    pruefe("Acht Warengruppen", len(d["gruppen"]) == 8)
    pruefe("Pfandsätze sind dabei", len(d["pfand"]) >= 4)
    pruefe("Ein neuer Entwurf ist leer (F5.4)", d["bestellung"]["positionen"] == [])
    pruefe("Der Termin ist bestellbar", d["bestellbar"] is True)
    nummern = {a["nummer"] for a in d["artikel"]}
    pruefe("Augustiner Hell steht im Katalog", "KA40015" in nummern)
    ohne_preis = [a for a in d["artikel"] if a.get("preis") in (None, 0)]
    pruefe("Artikel ohne belegten Preis bleiben bestellbar (F2.3)",
           len(ohne_preis) > 0, f"{len(ohne_preis)} ohne Preis")


def test_entwurf_senden_korrektur():
    dv = baue_umgebung()
    tag = in_zukunft()
    positionen = [
        {"nummer": "KA40015", "name": "Augustiner Hell",
         "bestelltext": "Augustiner hell 0,5l", "gebinde": "20x0,50",
         "gruppe": "Bier", "menge": 20, "preis": 13.75},
        {"nummer": "KA50120", "name": "Aho Individual Sanft Glas",
         "bestelltext": "Adelh. MIWA sanft Glas 0,75l", "gebinde": "12x0,75",
         "gruppe": "Mineralwasser Glas 0,75 l", "menge": 1, "preis": 7.30},
    ]

    d = antwort(order_api.main(Request("POST", {"datum": tag, "aktion": "speichern"},
                                       body={"positionen": positionen})))
    pruefe("Der Entwurf wird gespeichert", d.get("success") is True)
    pruefe("Status bleibt Entwurf", d["status"] == store.STATUS_ENTWURF)

    d = antwort(order_api.main(Request(route={"datum": tag})))
    pruefe("Der Entwurf wird wiedergefunden",
           len(d["bestellung"]["positionen"]) == 2)
    pruefe("Die Summe stimmt", round(d["summen"]["wert"], 2) == 282.30,
           str(d["summen"]))
    pruefe("21 Kisten", d["summen"]["kisten"] == 21)

    # Leere Bestellung wird abgewiesen (F9.5).
    res = order_api.main(Request("POST", {"datum": tag, "aktion": "senden"},
                                 body={"positionen": []}))
    pruefe("Ohne Position wird nicht gesendet", res.status_code == 400)
    pruefe("Es ging keine Mail hinaus", len(MAILS) == 0)

    # Ein Termin in der Vergangenheit wird abgewiesen (F1.4).
    res = order_api.main(Request("POST", {"datum": "2020-01-06", "aktion": "senden"},
                                 body={"positionen": positionen}))
    pruefe("Vergangene Termine werden abgewiesen", res.status_code == 409)

    d = antwort(order_api.main(Request("POST", {"datum": tag, "aktion": "senden"},
                                       body={"positionen": positionen,
                                             "wer": "Pr\u00fcfung"})))
    pruefe("Die Bestellung wird gesendet", d.get("success") is True)
    pruefe("Status ist gesendet", d["status"] == store.STATUS_GESENDET)
    pruefe("Genau eine Mail", len(MAILS) == 1)

    text = MAILS[0]["text"]
    pruefe("Betreff nennt die Kalenderwoche",
           MAILS[0]["betreff"].startswith("Bestellung f\u00fcr Dorfladen Oberornau KW"),
           MAILS[0]["betreff"])
    pruefe("20 Kisten in gewachsener Schreibweise",
           "20 Kisten Augustiner hell 0,5l" in text)
    pruefe("Singular bei einer Kiste (F9.3)",
           "1 Kiste Adelh. MIWA sanft Glas 0,75l" in text)
    pruefe("Kein „1 Kisten“", "1 Kisten" not in text)
    pruefe("Warengruppen sind durch Leerzeilen getrennt (F9.4)",
           "20 Kisten Augustiner hell 0,5l\n\n1 Kiste" in text)
    pruefe("Kundennummer und Tour stehen darunter",
           "Kd.-Nr. 15554, Tour 1" in text)
    pruefe("Kein Pfand- oder Preisgerede in der Mail",
           "Warenwert" not in text and "Pfand" not in text)

    # Erneut senden ist gesperrt (F10.2).
    res = order_api.main(Request("POST", {"datum": tag, "aktion": "senden"},
                                 body={"positionen": positionen}))
    pruefe("Zweimal senden ist gesperrt", res.status_code == 409)
    res = order_api.main(Request("POST", {"datum": tag, "aktion": "speichern"},
                                 body={"positionen": positionen}))
    pruefe("Nach dem Senden wird nicht still überschrieben", res.status_code == 409)

    # Korrektur (F10.3).
    geaendert = [dict(positionen[0], menge=25)]
    d = antwort(order_api.main(Request("POST", {"datum": tag, "aktion": "korrektur"},
                                       body={"positionen": geaendert})))
    pruefe("Die Korrektur geht hinaus", d.get("success") is True)
    pruefe("Status ist korrigiert", d["status"] == store.STATUS_KORRIGIERT)
    pruefe("Zwei Mails insgesamt", len(MAILS) == 2)
    pruefe("Die Korrektur ist als solche betitelt",
           MAILS[1]["betreff"].startswith("Korrektur der Bestellung"))
    pruefe("Die Korrektur nennt die vollständige Liste",
           "bitte korrigieren Sie unsere Bestellung" in MAILS[1]["text"])
    pruefe("25 Kisten in der Korrektur",
           "25 Kisten Augustiner hell 0,5l" in MAILS[1]["text"])

    # Verlauf (F10.4).
    d = antwort(order_api.main(Request(params={"mode": "verlauf"})))
    pruefe("Der Verlauf führt die Bestellung", len(d["verlauf"]) == 1)
    pruefe("Der Verlauf zeigt den Korrekturstand",
           d["verlauf"][0]["status"] == store.STATUS_KORRIGIERT)
    pruefe("Der Verlauf nennt die Summen", d["verlauf"][0]["summen"]["kisten"] == 25)
    pruefe("Das Protokoll führt beide Vorgänge",
           len(d["verlauf"][0]["protokoll"]) == 2)

    # Die gesendete Bestellung wird zur Vorlage der nächsten (F5.1).
    d = antwort(order_api.main(Request()))
    pruefe("Die gesendete Bestellung ist die neue Vorlage",
           d["letzte"]["aus_vorlage"] is False and d["letzte"]["datum"] == tag)
    pruefe("Die Vorlage nennt 25 Kisten Augustiner",
           d["letzte"]["mengen"]["KA40015"] == 25)
    pruefe("Es wurde geschrieben", dv.schreibvorgaenge > 0)


def test_einmalige_artikel_bleiben_draussen():
    baue_umgebung()
    tag = in_zukunft()
    positionen = [
        {"nummer": "KA40015", "name": "Augustiner Hell",
         "bestelltext": "Augustiner hell 0,5l", "gebinde": "20x0,50",
         "gruppe": "Bier", "menge": 2, "preis": 13.75},
        {"nummer": "NEU-1", "name": "Adelh. Rhabarber PET 0,5l",
         "bestelltext": "Adelh. Rhabarber PET 0,5l", "gebinde": "12x0,50",
         "gruppe": "Erfrischungsgetr\u00e4nke PET 0,5 l", "menge": 3,
         "preis": None, "zusatz": True},
    ]
    order_api.main(Request("POST", {"datum": tag, "aktion": "senden"},
                           body={"positionen": positionen}))
    pruefe("Der einmalige Artikel steht in der Mail (F7.5)",
           "3 Kisten Adelh. Rhabarber PET 0,5l" in MAILS[0]["text"])

    d = antwort(order_api.main(Request(route={"datum": tag})))
    nummern = {a["nummer"] for a in d["artikel"]}
    pruefe("Er ist nicht in den Katalog gerutscht (F7.6)", "NEU-1" not in nummern)
    d = antwort(order_api.main(Request()))
    pruefe("Und nicht in die Vorlage (F5.2)",
           "NEU-1" not in d["letzte"]["mengen"])


def test_artikelpflege():
    baue_umgebung()
    d = antwort(artikel_api.main(Request()))
    pruefe("Artikel-API antwortet", d.get("success") is True)
    vorher = len(d["artikel"])

    neu = {"name": "Adelh. Rhabarber PET 0,5l",
           "bestelltext": "Adelh. Rhabarber PET 0,5l",
           "gebinde": "12x0,50", "gruppe": "Erfrischungsgetr\u00e4nke PET 0,5 l",
           "preis": 6.69}
    res = artikel_api.main(Request("POST", body=neu))
    d = antwort(res)
    pruefe("Ein Artikel wird angelegt (F7.2)", res.status_code == 201)
    pruefe("Der Katalog ist einen länger", len(d["artikel"]) == vorher + 1)
    angelegt = [a for a in d["artikel"] if a["name"] == neu["name"]][0]
    pruefe("Er bekommt eine Nummer", bool(angelegt["nummer"]))
    pruefe("Das Gebinde bleibt erhalten", angelegt["gebinde"] == "12x0,50")
    pruefe("Er steht in seiner Warengruppe",
           angelegt["gruppe"] == "Erfrischungsgetr\u00e4nke PET 0,5 l")

    res = artikel_api.main(Request("POST", body=neu))
    pruefe("Die Dublette wird gemeldet (F7.4)", res.status_code == 409)
    pruefe("Die Meldung nennt den Artikel",
           neu["name"] in antwort(res).get("error", ""))

    res = artikel_api.main(Request("POST", body=dict(neu, trotzdem=True)))
    pruefe("Mit „trotzdem“ geht es doch", res.status_code == 201)

    # Ohne Bezeichnung wird nichts angelegt.
    res = artikel_api.main(Request("POST", body={"gebinde": "12x0,50"}))
    pruefe("Ohne Bezeichnung wird abgewiesen", res.status_code == 400)

    # Ausblenden statt Löschen (F11.2, F11.3).
    d = antwort(artikel_api.main(Request(
        "PATCH", body={"alt_nummer": "KA40015", "aktiv": False})))
    aus = [a for a in d["artikel"] if a["nummer"] == "KA40015"][0]
    pruefe("Der Artikel ist ausgeblendet", aus["aktiv"] is False)
    pruefe("Er steht weiter im Katalog (F11.3)",
           "KA40015" in {a["nummer"] for a in d["artikel"]})

    d = antwort(artikel_api.main(Request(
        "PATCH", body={"alt_nummer": "KA40015", "aktiv": True})))
    ein = [a for a in d["artikel"] if a["nummer"] == "KA40015"][0]
    pruefe("Und lässt sich wieder einblenden", ein["aktiv"] is True)

    d = antwort(artikel_api.main(Request(
        "PATCH", body={"alt_nummer": "KA40015", "preis": 14.50,
                       "bestelltext": "Augustiner hell 0,5l NEU"})))
    geaendert = [a for a in d["artikel"] if a["nummer"] == "KA40015"][0]
    pruefe("Preis und Bestelltext lassen sich pflegen",
           geaendert["preis"] == 14.50
           and geaendert["bestelltext"] == "Augustiner hell 0,5l NEU")


def test_einstellungen():
    baue_umgebung()
    d = antwort(order_api.main(Request(route={"datum": "config"})))
    pruefe("Die Einstellungen lassen sich lesen", d.get("success") is True)
    pruefe("Keine internen Felder nach draußen",
           not any(k.startswith("_") for k in d["config"]))

    res = order_api.main(Request("POST", {"datum": "config"},
                                 body={"config": {"empfaenger": "kaputt@kratzer"}}))
    pruefe("Eine unvollständige Adresse wird abgewiesen (F12.2)",
           res.status_code == 400)

    res = order_api.main(Request("POST", {"datum": "config"},
                                 body={"config": {"empfaenger": "a@b.de",
                                                  "kd_nr": ""}}))
    pruefe("Ohne Kundennummer wird abgewiesen", res.status_code == 400)

    d = antwort(order_api.main(Request(
        "POST", {"datum": "config"},
        body={"config": {"empfaenger": "bestellung@getraenke-kratzer.de",
                         "lieferant_mail": "bestellung@getraenke-kratzer.de",
                         "kd_nr": "15554"}})))
    pruefe("Gültige Einstellungen werden gespeichert", d.get("success") is True)

    d = antwort(order_api.main(Request()))
    pruefe("Mit der echten Adresse endet der Testbetrieb (F13)",
           d["testbetrieb"] is False)


def test_kalenderwoche_und_termin():
    pruefe("KW nach ISO-8601", store.kw("2026-09-14") == 38)
    pruefe("Jahreswechsel: 1.1.2027 gehört in KW 53", store.kw("2027-01-01") == 53)
    pruefe("Ein Montag ist bestellbar", store.bestellbar(in_zukunft(14)) is True)
    pruefe("Heute ist nicht mehr bestellbar",
           store.bestellbar(in_zukunft(0)) is False)
    pruefe("Der Vorschlagstermin ist ein Montag",
           store.wochentag(store.vorschlagstermin()) == "Montag")


def main():
    print("Getr\u00e4nke-Bestellung \u2014 API")
    for name, fn in list(globals().items()):
        if name.startswith("test_") and callable(fn):
            print(f"\n{name}")
            fn()
    print("\nAlles in Ordnung.")


if __name__ == "__main__":
    main()
