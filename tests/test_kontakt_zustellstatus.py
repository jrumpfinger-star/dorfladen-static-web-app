"""Kontakt-Chat: Zustell- und Lesequittung (Spec specs/kontakt-zustellstatus).

Aus dem Laden: „Kann auch angezeigt werden, ob eine ausgehende Nachricht
geliefert und gelesen wurde wie in WhatsApp?"

Geprueft wird der ECHTE Weg durch `mode=my`, nicht nur die Hilfsfunktion:
Dataverse wird unterhalb ersetzt, sodass sichtbar wird, WAS wirklich
zurueckgeschrieben wuerde — und vor allem, WANN gar nicht geschrieben wird.
Der letzte Punkt ist der heikle: Die Startseite fragt alle 45 Sekunden ab.
Ein PATCH je Abruf waere ein Dauerfeuer auf Dataverse.

Ausfuehren:  python tests/test_kontakt_zustellstatus.py
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
    """Ersatz-Speicher fuer genau einen Thread. Merkt sich jeden PATCH."""

    def __init__(self, verlauf=None, vorhanden=True):
        self.rec_id = "thread-1"
        self.verlauf = verlauf if verlauf is not None else []
        self.vorhanden = vorhanden
        self.patches = []

    def get(self, url, **kw):
        if not self.vorhanden:
            return Antwort(200, {"value": []})
        return Antwort(200, {"value": [{
            "dl_kontaktnachrichtid": self.rec_id,
            "dl_name": "Testkunde",
            "dl_device_id": "dev-1",
            "dl_email": "kunde@example.com",
            "dl_status": 0,
            "dl_kommentar_gelesen": False,
            "dl_chatverlauf": json.dumps(self.verlauf, ensure_ascii=False),
        }]})

    def patch(self, url, **kw):
        koerper = (kw.get("json") or {})
        self.patches.append(koerper)
        if "dl_chatverlauf" in koerper:
            self.verlauf = json.loads(koerper["dl_chatverlauf"])
        return Antwort(204, {})

    def post(self, url, **kw):
        return Antwort(201, {})

    def delete(self, url, **kw):
        return Antwort(204, {})


class Anfrage:
    def __init__(self, method="GET", route=None, params=None, body=None,
                 headers=None):
        self.method = method
        self.route_params = route or {}
        self.params = params or {}
        self.headers = headers or {}
        self.url = "https://test/api/contact-message"
        self._body = body if body is not None else {}

    def get_json(self):
        return self._body


def lade():
    spec = importlib.util.spec_from_file_location(
        "contact_message_test",
        os.path.join(API, "contact-message", "__init__.py"))
    modul = importlib.util.module_from_spec(spec)
    sys.modules["contact_message_test"] = modul
    spec.loader.exec_module(modul)
    # Die Anmeldung an Dataverse wuerde nach aussen gehen — nur sie wird
    # ersetzt, alles Weitere laeuft durch den echten Code.
    modul.get_token = lambda: "test-token"
    return modul


def rumpf(antwort):
    roh = antwort.get_body()
    if isinstance(roh, bytes):
        roh = roh.decode("utf-8")
    try:
        return json.loads(roh)
    except Exception:
        return {}


MODUL = lade()


def abruf(dv, gelesen=False):
    requests.get, requests.patch = dv.get, dv.patch
    requests.post, requests.delete = dv.post, dv.delete
    params = {"mode": "my", "device_id": "dev-1"}
    if gelesen:
        params["gelesen"] = "1"
    return MODUL.main(Anfrage(params=params))


def antworten(dv):
    return [m for m in dv.verlauf if m.get("who") == "dorfladen"]


def tests():
    print("Kontakt-Chat — Zustell- und Lesequittung")

    # ── TC-KZ-S1: Der Abruf quittiert die Zustellung ──────────────────
    dv = Dataverse([
        {"t": "2026-09-24T08:00:00Z", "who": "kunde", "text": "Habt ihr Brot?"},
        {"t": "2026-09-24T09:00:00Z", "who": "dorfladen", "text": "Ja, frisch da."},
    ])
    a = abruf(dv)
    pruefe("TC-KZ-S1  Abruf gelingt", a.status_code == 200, f"war {a.status_code}")
    pruefe("TC-KZ-S1  die Antwort traegt einen Zustellstempel",
           bool(antworten(dv)[0].get("zug")), f"Verlauf: {dv.verlauf}")
    pruefe("TC-KZ-S1  und wurde wirklich geschrieben",
           len(dv.patches) == 1, f"PATCHes: {dv.patches}")
    pruefe("TC-KZ-S1  der Kunde sieht den Stempel auch in der Antwort",
           bool(rumpf(a)["thread"]["verlauf"][1].get("zug")),
           f"Rumpf: {rumpf(a)}")

    # ── TC-KZ-S2: Ohne gelesen=1 bleibt der Lesestempel offen ─────────
    pruefe("TC-KZ-S2  ohne gelesen=1 kein Lesestempel",
           not antworten(dv)[0].get("gel"), f"Verlauf: {dv.verlauf}")

    # ── TC-KZ-S4: Zweiter Abruf schreibt nicht noch einmal ────────────
    vorher = list(dv.patches)
    zug_vorher = antworten(dv)[0]["zug"]
    a = abruf(dv)
    pruefe("TC-KZ-S4  der zweite Abruf schreibt nicht",
           dv.patches == vorher, f"PATCHes: {dv.patches}")
    pruefe("TC-KZ-S5  der Zustellstempel bleibt der erste",
           antworten(dv)[0]["zug"] == zug_vorher,
           f"war {zug_vorher}, jetzt {antworten(dv)[0]['zug']}")

    # ── TC-KZ-S3: Mit gelesen=1 kommt der Lesestempel dazu ────────────
    a = abruf(dv, gelesen=True)
    pruefe("TC-KZ-S3  gelesen=1 setzt den Lesestempel",
           bool(antworten(dv)[0].get("gel")), f"Verlauf: {dv.verlauf}")
    pruefe("TC-KZ-S3  und schreibt genau einmal nach",
           len(dv.patches) == 2, f"PATCHes: {dv.patches}")
    pruefe("TC-KZ-S3  der Zustellstempel bleibt unberuehrt",
           antworten(dv)[0]["zug"] == zug_vorher)

    # Auch der Lesestempel wird nicht ueberschrieben.
    gel_vorher = antworten(dv)[0]["gel"]
    abruf(dv, gelesen=True)
    pruefe("TC-KZ-S5  auch der Lesestempel bleibt der erste",
           antworten(dv)[0]["gel"] == gel_vorher and len(dv.patches) == 2,
           f"PATCHes: {dv.patches}")

    # ── TC-KZ-S3b: Ein Chat, der nie im Hintergrund lief ──────────────
    # gelesen=1 muss beide Stempel auf einen Schlag setzen.
    dv = Dataverse([
        {"t": "2026-09-24T09:00:00Z", "who": "dorfladen", "text": "Hallo"},
    ])
    abruf(dv, gelesen=True)
    m = antworten(dv)[0]
    pruefe("TC-KZ-S3  gelesen=1 setzt beide Stempel zugleich",
           bool(m.get("zug")) and bool(m.get("gel")), f"Eintrag: {m}")

    # ── TC-KZ-S6: Kundennachrichten bleiben unberuehrt ────────────────
    dv = Dataverse([
        {"t": "2026-09-24T08:00:00Z", "who": "kunde", "text": "Frage"},
        {"t": "2026-09-24T09:00:00Z", "who": "dorfladen", "text": "Antwort"},
        {"t": "2026-09-24T10:00:00Z", "who": "kunde", "text": "Danke"},
    ])
    abruf(dv, gelesen=True)
    kunden = [m for m in dv.verlauf if m.get("who") == "kunde"]
    pruefe("TC-KZ-S6  Kundennachrichten bekommen keinen Zustellstempel",
           all(not m.get("zug") for m in kunden), f"Verlauf: {dv.verlauf}")
    pruefe("TC-KZ-S6  und keinen Lesestempel",
           all(not m.get("gel") for m in kunden), f"Verlauf: {dv.verlauf}")

    # ── TC-KZ-S7: Kein Thread -> kein Absturz, kein Schreiben ─────────
    dv = Dataverse(vorhanden=False)
    a = abruf(dv, gelesen=True)
    pruefe("TC-KZ-S7  ohne Thread bleibt es bei 200",
           a.status_code == 200, f"war {a.status_code}")
    pruefe("TC-KZ-S7  und thread ist leer",
           rumpf(a).get("thread") is None, f"Rumpf: {rumpf(a)}")
    pruefe("TC-KZ-S7  geschrieben wird nichts", dv.patches == [])

    # ── Ein kaputter Verlauf legt den Abruf nicht lahm ────────────────
    dv = Dataverse()
    dv.verlauf = []
    requests.get = lambda url, **kw: Antwort(200, {"value": [{
        "dl_kontaktnachrichtid": "thread-1",
        "dl_chatverlauf": "{kein json",
    }]})
    requests.patch = dv.patch
    a = MODUL.main(Anfrage(params={"mode": "my", "device_id": "dev-1"}))
    pruefe("TC-KZ-S7  unlesbarer Verlauf stuerzt nicht ab",
           a.status_code == 200, f"war {a.status_code}")
    pruefe("TC-KZ-S7  und loest kein Schreiben aus", dv.patches == [])

    print("\nAlle Pruefungen bestanden.")


if __name__ == "__main__":
    tests()
