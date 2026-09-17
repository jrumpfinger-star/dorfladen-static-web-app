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


if __name__ == "__main__":
    metzger_tests()
    baecker_tests()
    print("\nAlle Pruefungen bestanden.")
