"""Bestellungen loeschen — Serverseite (Spec specs/bestellung-loeschen).

Aus dem Laden: „Es sollte auch moeglich sein, bei Baecker und Metzger
bestehende Bestellungen zu loeschen, da dies z. B. nur Testbestellungen
waren."

Geprueft wird der ECHTE Weg beider Endpunkte, nicht nur ihr Quelltext:
Dataverse wird unterhalb ersetzt, sodass sichtbar wird, WELCHE Datensaetze
wirklich geloescht wuerden.

Der heikelste Punkt ist der Baecker: Ein Liefertag kann unter ZWEI
Schluesseln liegen (neuer Schluessel mit Baeckerei, Altschluessel ohne).
Bliebe der Altschluessel liegen, taeuchte der Eintrag beim naechsten
Laden wieder auf — der Loeschvorgang waere scheinbar erfolgreich und doch
wirkungslos. (Spec F5, TC-D12)

Ausfuehren:  python tests/test_bestellung_loeschen.py
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
os.environ.setdefault("DV_URL", "https://test.crm4.dynamics.com")
# Die Admin-Sperre haengt an einem Kennwort; ohne gesetztes Kennwort
# laesst der Waechter durch. Hier bewusst nicht setzen.
os.environ.pop("CMS_PASSWORD", None)
os.environ.pop("ADMIN_PASSWORD", None)


def pruefe(name, bedingung, hinweis=""):
    if not bedingung:
        raise AssertionError(f"{name}{(' — ' + hinweis) if hinweis else ''}")
    print(f"  ok  {name}")


class Antwort:
    def __init__(self, status=200, daten=None):
        self.status_code = status
        self._daten = daten if daten is not None else {}
        self.text = json.dumps(self._daten)

    def json(self):
        return self._daten


class Dataverse:
    """Ersatz-Speicher. Merkt sich, was gelesen und was geloescht wurde."""

    def __init__(self, datensaetze=None):
        # Schluessel -> (record_id, daten)
        self.saetze = dict(datensaetze or {})
        self.geloescht = []
        self.delete_status = 204

    # ── Lesen ────────────────────────────────────────────────────────
    def get(self, url, **kw):
        if "dl_schluessel eq " in url:
            key = url.split("dl_schluessel eq '")[1].split("'")[0]
            treffer = self.saetze.get(key)
            if not treffer:
                return Antwort(200, {"value": []})
            rec_id, daten = treffer
            return Antwort(200, {"value": [{
                "dl_seiteninhaltid": rec_id,
                "dl_wert": json.dumps(daten, ensure_ascii=False),
            }]})
        if "startswith(dl_schluessel" in url:
            praefix = url.split("startswith(dl_schluessel,'")[1].split("'")[0]
            werte = [{"dl_schluessel": k,
                      "dl_wert": json.dumps(v[1], ensure_ascii=False)}
                     for k, v in self.saetze.items() if k.startswith(praefix)]
            return Antwort(200, {"value": werte})
        return Antwort(404, {})

    # ── Schreiben ────────────────────────────────────────────────────
    def post(self, url, **kw):
        return Antwort(201, {})

    def patch(self, url, **kw):
        return Antwort(204, {})

    def delete(self, url, **kw):
        rec_id = url.split("(")[-1].split(")")[0]
        self.geloescht.append(rec_id)
        for key, (rid, _daten) in list(self.saetze.items()):
            if rid == rec_id:
                del self.saetze[key]
        return Antwort(self.delete_status, {})


class Anfrage:
    """Schlanker Ersatz fuer func.HttpRequest."""

    def __init__(self, method="POST", route=None, params=None, body=None,
                 headers=None):
        self.method = method
        self.route_params = route or {}
        self.params = params or {}
        self.headers = headers or {}
        self._body = body if body is not None else {}

    def get_json(self):
        return self._body


def lade(pfad, name):
    spec = importlib.util.spec_from_file_location(
        name, os.path.join(API, *pfad.split("/")))
    modul = importlib.util.module_from_spec(spec)
    sys.modules[name] = modul
    spec.loader.exec_module(modul)
    # Die Anmeldung an Dataverse wird nicht geprueft - sie wuerde hier
    # nach aussen gehen. Ersetzt wird nur der Token-Abruf; alles Weitere
    # laeuft durch den echten Code.
    if hasattr(modul, "store"):
        modul.store.get_token = lambda: "test-token"
    return modul


def rumpf(antwort):
    roh = antwort.get_body()
    if isinstance(roh, bytes):
        roh = roh.decode("utf-8")
    try:
        return json.loads(roh)
    except Exception:
        return {}


# ══════════════════════════════════════════════════════════════════════
#  Metzger
# ══════════════════════════════════════════════════════════════════════

def metzger_tests():
    print("Metzger")
    metzger = lade("metzger-order/__init__.py", "metzger_order_test")

    def lauf(dv, datum, aktion="loeschen"):
        requests.get, requests.post = dv.get, dv.post
        requests.patch, requests.delete = dv.patch, dv.delete
        return metzger.main(Anfrage(route={"datum": datum, "aktion": aktion}))

    # TC-D04: vorhandene Bestellung verschwindet wirklich
    dv = Dataverse({
        "metzger_order_2026-09-10": ("rec-m1", {"datum": "2026-09-10", "status": 1}),
    })
    antwort = lauf(dv, "2026-09-10")
    pruefe("TC-D04  Loeschen meldet Erfolg", antwort.status_code == 200,
           f"war {antwort.status_code}: {rumpf(antwort)}")
    pruefe("TC-D04  der Datensatz ist weg", dv.geloescht == ["rec-m1"],
           f"geloescht: {dv.geloescht}")
    pruefe("TC-D04  nichts bleibt liegen", not dv.saetze, f"Rest: {list(dv.saetze)}")

    # TC-D09: unbekannter Tag -> 404, kein stiller Erfolg
    dv = Dataverse()
    antwort = lauf(dv, "2026-09-11")
    pruefe("TC-D09  unbekannter Tag gibt 404", antwort.status_code == 404,
           f"war {antwort.status_code}")
    pruefe("TC-D09  und loescht nichts", dv.geloescht == [])

    # TC-D10: unsinniges Datum -> 400
    dv = Dataverse()
    antwort = lauf(dv, "irgendwas")
    pruefe("TC-D10  unsinniges Datum gibt 400", antwort.status_code == 400,
           f"war {antwort.status_code}")
    pruefe("TC-D10  und loescht nichts", dv.geloescht == [])

    # Der Speicher streikt -> 502, keine falsche Erfolgsmeldung
    dv = Dataverse({
        "metzger_order_2026-09-10": ("rec-m2", {"datum": "2026-09-10", "status": 1}),
    })
    dv.delete_status = 500
    antwort = lauf(dv, "2026-09-10")
    pruefe("Streik  gibt 502 statt Erfolg", antwort.status_code == 502,
           f"war {antwort.status_code}")


# ══════════════════════════════════════════════════════════════════════
#  Baecker
# ══════════════════════════════════════════════════════════════════════

def baecker_tests():
    print("Baecker")
    baecker = lade("baecker-order/__init__.py", "baecker_order_test")

    def lauf(dv, datum, body=None, aktion="loeschen"):
        requests.get, requests.post = dv.get, dv.post
        requests.patch, requests.delete = dv.patch, dv.delete
        return baecker.main(Anfrage(route={"datum": datum, "aktion": aktion},
                                    body=body if body is not None
                                    else {"baeckerei": "freundl"}))

    # TC-D12: Alt- UND Neuschluessel muessen weg.
    dv = Dataverse({
        "baecker_order_freundl_2026-09-10": ("rec-neu", {"datum": "2026-09-10", "status": 1}),
        "baecker_order_2026-09-10": ("rec-alt", {"datum": "2026-09-10", "status": 1}),
    })
    antwort = lauf(dv, "2026-09-10")
    pruefe("TC-D12  Loeschen meldet Erfolg", antwort.status_code == 200,
           f"war {antwort.status_code}: {rumpf(antwort)}")
    pruefe("TC-D12  BEIDE Datensaetze sind weg",
           sorted(dv.geloescht) == ["rec-alt", "rec-neu"],
           f"geloescht: {dv.geloescht}")
    pruefe("TC-D12  nichts bleibt liegen", not dv.saetze, f"Rest: {list(dv.saetze)}")

    # Nur der neue Schluessel liegt vor: Der Altschluessel darf nicht stoeren.
    dv = Dataverse({
        "baecker_order_freundl_2026-09-11": ("rec-neu2", {"datum": "2026-09-11", "status": 1}),
    })
    antwort = lauf(dv, "2026-09-11")
    pruefe("Nur neu  Loeschen meldet Erfolg", antwort.status_code == 200,
           f"war {antwort.status_code}")
    pruefe("Nur neu  genau ein Datensatz weg", dv.geloescht == ["rec-neu2"])

    # Die zweite Baeckerei hat KEINEN Altschluessel - der darf nicht
    # mitgeloescht werden, er gehoert Freundl.
    dv = Dataverse({
        "baecker_order_martins_2026-09-12": ("rec-mar", {"datum": "2026-09-12", "status": 1}),
        "baecker_order_2026-09-12": ("rec-fremd", {"datum": "2026-09-12", "status": 1}),
    })
    antwort = lauf(dv, "2026-09-12", body={"baeckerei": "martins"})
    pruefe("Martins  nur der eigene Datensatz weg", dv.geloescht == ["rec-mar"],
           f"geloescht: {dv.geloescht}")
    pruefe("Martins  der Altbestand bleibt unberuehrt",
           "baecker_order_2026-09-12" in dv.saetze)

    # TC-D09: unbekannter Tag -> 404
    dv = Dataverse()
    antwort = lauf(dv, "2026-09-13")
    pruefe("TC-D09  unbekannter Tag gibt 404", antwort.status_code == 404,
           f"war {antwort.status_code}")
    pruefe("TC-D09  und loescht nichts", dv.geloescht == [])

    # TC-D11: fehlende und unbekannte Baeckerei -> 400
    dv = Dataverse({
        "baecker_order_freundl_2026-09-10": ("rec-x", {"datum": "2026-09-10", "status": 1}),
    })
    antwort = lauf(dv, "2026-09-10", body={})
    pruefe("TC-D11  ohne Baeckerei gibt 400", antwort.status_code == 400,
           f"war {antwort.status_code}")
    antwort = lauf(dv, "2026-09-10", body={"baeckerei": "gibtsnicht"})
    pruefe("TC-D11  unbekannte Baeckerei gibt 400", antwort.status_code == 400,
           f"war {antwort.status_code}")
    pruefe("TC-D11  und loescht nichts", dv.geloescht == [])


# ══════════════════════════════════════════════════════════════════════
#  Getraenke
# ══════════════════════════════════════════════════════════════════════

def getraenke_tests():
    print("Getraenke")
    getraenke = lade("getraenke-order/__init__.py", "getraenke_order_test")

    def lauf(dv, datum, aktion="loeschen"):
        requests.get, requests.post = dv.get, dv.post
        requests.patch, requests.delete = dv.patch, dv.delete
        return getraenke.main(Anfrage(route={"datum": datum, "aktion": aktion}))

    # TC-D20: vorhandene Bestellung verschwindet wirklich
    dv = Dataverse({
        "getraenke_order_2026-09-14": ("rec-g1", {"datum": "2026-09-14", "status": 1}),
    })
    antwort = lauf(dv, "2026-09-14")
    pruefe("TC-D20  Loeschen meldet Erfolg", antwort.status_code == 200,
           f"war {antwort.status_code}: {rumpf(antwort)}")
    pruefe("TC-D20  der Datensatz ist weg", dv.geloescht == ["rec-g1"],
           f"geloescht: {dv.geloescht}")
    pruefe("TC-D20  nichts bleibt liegen", not dv.saetze, f"Rest: {list(dv.saetze)}")

    # TC-D22: unbekannter Termin -> 404, kein stiller Erfolg
    dv = Dataverse()
    antwort = lauf(dv, "2026-09-15")
    pruefe("TC-D22  unbekannter Termin gibt 404", antwort.status_code == 404,
           f"war {antwort.status_code}")
    pruefe("TC-D22  und loescht nichts", dv.geloescht == [])

    # TC-D23: unsinniges Datum -> 400
    dv = Dataverse()
    antwort = lauf(dv, "irgendwas")
    pruefe("TC-D23  unsinniges Datum gibt 400", antwort.status_code == 400,
           f"war {antwort.status_code}")
    pruefe("TC-D23  und loescht nichts", dv.geloescht == [])

    # Der Speicher streikt -> 502, keine falsche Erfolgsmeldung
    dv = Dataverse({
        "getraenke_order_2026-09-14": ("rec-g2", {"datum": "2026-09-14", "status": 1}),
    })
    dv.delete_status = 500
    antwort = lauf(dv, "2026-09-14")
    pruefe("Streik  gibt 502 statt Erfolg", antwort.status_code == 502,
           f"war {antwort.status_code}")

    # TC-D18/F14: Der Verlauf traegt die Positionen mit - ohne sie koennte
    # der Kiosk beim Aufklappen nichts zeigen.
    dv = Dataverse({
        "getraenke_order_2026-09-14": ("rec-g3", {
            "datum": "2026-09-14", "status": 2,
            "positionen": [
                {"nummer": "101", "name": "Spezi", "gebinde": "20x0,5", "menge": 3},
                {"nummer": "102", "name": "Wasser", "gebinde": "12x1,0", "menge": 0},
            ],
        }),
    })
    requests.get, requests.post = dv.get, dv.post
    requests.patch, requests.delete = dv.patch, dv.delete
    antwort = getraenke.main(Anfrage(method="GET", params={"mode": "verlauf"}))
    daten = rumpf(antwort)
    eintraege = daten.get("verlauf", [])
    pruefe("TC-D18  Verlauf liefert einen Eintrag", len(eintraege) == 1,
           f"waren {len(eintraege)}")
    pos = eintraege[0].get("positionen", []) if eintraege else []
    pruefe("TC-D18  nur wirklich Bestelltes ist dabei", len(pos) == 1,
           f"Positionen: {pos}")
    pruefe("TC-D18  mit Nummer, Name, Gebinde und Menge",
           pos and pos[0].get("name") == "Spezi" and pos[0].get("menge") == 3
           and pos[0].get("gebinde") == "20x0,5",
           f"Position: {pos}")


# ══════════════════════════════════════════════════════════════════════
#  Mittagstisch: telefonische Bestellung loeschen
# ══════════════════════════════════════════════════════════════════════
# Aus dem Laden: „Telefonbestellung sollen auch geloescht werden koennen
# und nicht nur storniert."
#
# Der heikle Punkt ist die Abgrenzung: Eine ONLINE-Bestellung gehoert dem
# Kunden - er sieht sie in seiner Uebersicht. Wuerde sie hier still
# verschwinden, koennte er sich das nicht erklaeren. Geprueft wird
# deshalb vor allem, dass der Server das selbst sicherstellt und sich
# nicht auf einen fehlenden Knopf im Kiosk verlaesst.

class Mittagsspeicher:
    """Ersatz-Dataverse fuer dl_mittagsbestellungs."""

    def __init__(self, saetze=None):
        self.saetze = dict(saetze or {})   # record_id -> Felder
        self.geloescht = []
        self.delete_status = 204

    def get(self, url, **kw):
        rec = url.split("(")[-1].split(")")[0]
        daten = self.saetze.get(rec)
        if daten is None:
            return Antwort(404, {})
        return Antwort(200, dict(daten))

    def post(self, url, **kw):
        return Antwort(201, {})

    def patch(self, url, **kw):
        return Antwort(204, {})

    def delete(self, url, **kw):
        rec = url.split("(")[-1].split(")")[0]
        self.geloescht.append(rec)
        self.saetze.pop(rec, None)
        return Antwort(self.delete_status, {})


def mittagstisch_tests():
    print("\nMittagstisch")
    lunch = lade("lunch-order/__init__.py", "lunch_order_test")
    # Dieses Modul meldet sich selbst an, nicht ueber shared.store.
    lunch.get_token = lambda: "test-token"

    def lauf(dv, rec_id):
        requests.get, requests.post = dv.get, dv.post
        requests.patch, requests.delete = dv.patch, dv.delete
        return lunch.main(Anfrage(method="DELETE", route={"id": rec_id}))

    # TC-TL-S1: telefonische Bestellung verschwindet wirklich
    dv = Mittagsspeicher({"rec-tel": {"dl_quelle": 1, "dl_name": "Anruf",
                                      "dl_bestellnummer": "B-1"}})
    antwort = lauf(dv, "rec-tel")
    pruefe("TC-TL-S1  Loeschen meldet Erfolg", antwort.status_code == 200,
           f"war {antwort.status_code}: {rumpf(antwort)}")
    pruefe("TC-TL-S1  der Datensatz ist weg", dv.geloescht == ["rec-tel"],
           f"geloescht: {dv.geloescht}")

    # TC-TL-S2: am Tresen aufgenommen — dasselbe Recht
    dv = Mittagsspeicher({"rec-tresen": {"dl_quelle": 2, "dl_name": "Tresen"}})
    antwort = lauf(dv, "rec-tresen")
    pruefe("TC-TL-S2  Personal-Aufnahme ist loeschbar",
           antwort.status_code == 200, f"war {antwort.status_code}")
    pruefe("TC-TL-S2  der Datensatz ist weg", dv.geloescht == ["rec-tresen"])

    # TC-TL-S3: Online-Bestellung NICHT — der Kunde sieht sie
    dv = Mittagsspeicher({"rec-online": {"dl_quelle": 0, "dl_name": "Online"}})
    antwort = lauf(dv, "rec-online")
    pruefe("TC-TL-S3  Online-Bestellung wird abgewiesen",
           antwort.status_code == 403, f"war {antwort.status_code}")
    pruefe("TC-TL-S3  und bleibt bestehen", dv.geloescht == [],
           f"geloescht: {dv.geloescht}")
    pruefe("TC-TL-S3  mit einer Begruendung fuer den Menschen",
           "storniert" in rumpf(antwort).get("error", ""),
           f"Antwort: {rumpf(antwort)}")

    # TC-TL-S4: unbekannte Bestellung gilt als erledigt, nicht als Fehler.
    # Zwei Personen am selben Tablet duerfen sich nicht gegenseitig eine
    # Fehlermeldung erzeugen, wenn beide dasselbe wegraeumen wollen.
    dv = Mittagsspeicher()
    antwort = lauf(dv, "gibt-es-nicht")
    pruefe("TC-TL-S4  bereits geloescht gilt als Erfolg",
           antwort.status_code == 200, f"war {antwort.status_code}")
    pruefe("TC-TL-S4  und loescht nichts", dv.geloescht == [])

    # TC-TL-S5: Streikt Dataverse, darf kein Erfolg gemeldet werden.
    dv = Mittagsspeicher({"rec-tel": {"dl_quelle": 1}})
    dv.delete_status = 500
    antwort = lauf(dv, "rec-tel")
    pruefe("TC-TL-S5  Fehler wird durchgereicht", antwort.status_code == 500,
           f"war {antwort.status_code}")

    # TC-TL-S6: Ohne Kennung wird gar nichts geloescht.
    dv = Mittagsspeicher({"rec-tel": {"dl_quelle": 1}})
    requests.get, requests.post = dv.get, dv.post
    requests.patch, requests.delete = dv.patch, dv.delete
    antwort = lunch.main(Anfrage(method="DELETE", route={}))
    pruefe("TC-TL-S6  ohne Kennung kein Loeschen", dv.geloescht == [],
           f"geloescht: {dv.geloescht}")
    pruefe("TC-TL-S6  und eine klare Absage", antwort.status_code == 405,
           f"war {antwort.status_code}")


if __name__ == "__main__":
    metzger_tests()
    baecker_tests()
    getraenke_tests()
    mittagstisch_tests()
    print("\nAlle Pruefungen bestanden.")
