"""Prueft die Fortschreibung von ``ueblich``/``bestellungen`` (Getraenke).

Spec: specs/getraenke-ueblich-lernen/spec.md

Zwei Ebenen:
  1. Die reine Ableitung ``statistik_aktualisieren`` (F2, F4, F6).
  2. Die Verdrahtung: ``_senden`` schreibt den Katalog nach (F1, F3, F5).

Dataverse und Mailversand werden durch Attrappen ersetzt - kein Azure noetig.

Aufruf::

    python tools/getraenke_ueblich_test.py
"""
import json
import os
import sys
import types

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
API = os.path.join(ROOT, "api")

# ── Azure-Attrappe, damit die Module ohne Runtime laden ────────────────
if "azure.functions" not in sys.modules:
    az = types.ModuleType("azure")
    fn = types.ModuleType("azure.functions")

    class HttpResponse:
        def __init__(self, body="", status_code=200, headers=None, mimetype=None):
            self.body = body
            self.status_code = status_code
            self.headers = headers or {}

        def get_body(self):
            return self.body if isinstance(self.body, bytes) else str(self.body).encode()

    class HttpRequest:
        def __init__(self, method="GET", params=None, route_params=None, body=None,
                     headers=None):
            self.method = method
            self.params = params or {}
            self.route_params = route_params or {}
            self.headers = headers or {}
            self._body = body

        def get_json(self):
            if self._body is None:
                raise ValueError("kein Rumpf")
            return self._body

    fn.HttpResponse = HttpResponse
    fn.HttpRequest = HttpRequest
    az.functions = fn
    sys.modules["azure"] = az
    sys.modules["azure.functions"] = fn

sys.path.insert(0, API)
sys.path.insert(0, os.path.join(API, "getraenke-order"))
import getraenke_store as store  # noqa: E402

FEHLER = []


def pruefe(name, bedingung, hinweis=""):
    if bedingung:
        print(f"  ok   {name}")
    else:
        print(f"  FEHL {name} {hinweis}")
        FEHLER.append(name)


def bestellung(datum, positionen, status=store.STATUS_GESENDET):
    return {"datum": datum, "status": status, "positionen": positionen}


def pos(nummer, menge, zusatz=False, name=None):
    return {"nummer": nummer, "name": name or nummer, "menge": menge, "zusatz": zusatz}


def artikel(nummer, bestellungen=0, ueblich=None, zusatz=False):
    return {"nummer": nummer, "name": nummer, "gebinde": "20 x 0,5 l",
            "preis": 10.0, "bestellungen": bestellungen, "ueblich": ueblich,
            "zusatz": zusatz, "aktiv": True}


# ── Ebene 1: reine Ableitung ───────────────────────────────────────────
print("statistik_aktualisieren (reine Ableitung)")

# TC-F2-01: Median ueber das Fenster
kat = [artikel("A")]
hist = [bestellung("2026-01-01", [pos("A", 2)]),
        bestellung("2026-02-01", [pos("A", 4)]),
        bestellung("2026-03-01", [pos("A", 4)]),
        bestellung("2026-04-01", [pos("A", 10)])]
store.statistik_aktualisieren(kat, hist)
pruefe("TC-F2-01 Median 4, bestellungen 4",
       kat[0]["ueblich"] == 4 and kat[0]["bestellungen"] == 4,
       f"-> ueblich={kat[0]['ueblich']} bestellungen={kat[0]['bestellungen']}")

# TC-F2-02: Rundung bei gerader Anzahl (3,6 -> 5, kaufmaennisch)
kat = [artikel("A")]
store.statistik_aktualisieren(kat, [bestellung("2026-01-01", [pos("A", 3)]),
                                    bestellung("2026-02-01", [pos("A", 6)])])
pruefe("TC-F2-02 round(4.5)=5", kat[0]["ueblich"] == 5,
       f"-> {kat[0]['ueblich']}")

# TC-F2-03: Fenster begrenzt alte Werte (aelteste 99 faellt raus)
kat = [artikel("A")]
hist = [bestellung(f"2026-{m:02d}-01", [pos("A", 2)]) for m in range(1, 9)]
hist.append(bestellung("2025-01-01", [pos("A", 99)]))     # aelteste
store.statistik_aktualisieren(kat, hist)
pruefe("TC-F2-03 Fenster K=8 -> 2", kat[0]["ueblich"] == 2,
       f"-> {kat[0]['ueblich']}")

# TC-F4-01: Zusatzposition zaehlt nicht
kat = [artikel("A"), artikel("Z", zusatz=True)]
store.statistik_aktualisieren(kat, [bestellung("2026-01-01", [pos("A", 3),
                                                pos("Z", 5, zusatz=True)])])
z = next(a for a in kat if a["nummer"] == "Z")
a = next(a for a in kat if a["nummer"] == "A")
pruefe("TC-F4-01 Zusatz zaehlt nicht",
       a["bestellungen"] == 1 and z["bestellungen"] == 0 and z["ueblich"] is None,
       f"-> A={a['bestellungen']} Z={z['bestellungen']}/{z['ueblich']}")

# TC-F6-01: reproduzierbar aus der Historie, unabhaengig vom Altwert
kat = [artikel("A", bestellungen=99, ueblich=77)]
store.statistik_aktualisieren(kat, [bestellung("2026-01-01", [pos("A", 2)]),
                                    bestellung("2026-02-01", [pos("A", 4)]),
                                    bestellung("2026-03-01", [pos("A", 9)])])
pruefe("TC-F6-01 reproduzierbar (3, Median 4)",
       kat[0]["bestellungen"] == 3 and kat[0]["ueblich"] == 4,
       f"-> {kat[0]['bestellungen']}/{kat[0]['ueblich']}")

# Kein Vorkommen -> ueblich None
kat = [artikel("A")]
store.statistik_aktualisieren(kat, [])
pruefe("Ohne Historie ueblich None",
       kat[0]["ueblich"] is None and kat[0]["bestellungen"] == 0)


# ── Ebene 2: Verdrahtung ueber _senden ─────────────────────────────────
print("_senden schreibt den Katalog nach")

ABLAGE = {}


def fake_read(url, hdrs, key):
    return (key if key in ABLAGE else ""), json.loads(ABLAGE.get(key, "{}"))


def fake_write(url, hdrs, key, rec_id, data, bezeichnung="Getraenke"):
    ABLAGE[key] = json.dumps(data, ensure_ascii=False)
    return True


def fake_read_many(url, hdrs, prefix, top=400):
    return [(k, json.loads(v)) for k, v in ABLAGE.items() if k.startswith(prefix)]


store.read_json = fake_read
store.write_json = fake_write
store.read_many = fake_read_many

import importlib.util  # noqa: E402


def lade(pfad, name):
    spec = importlib.util.spec_from_file_location(name, pfad)
    mod = importlib.util.module_from_spec(spec)
    sys.modules[name] = mod
    spec.loader.exec_module(mod)
    return mod


fn_mod = lade(os.path.join(API, "getraenke-order", "__init__.py"), "getraenke_order_fn")
fn_mod.store = store
fn_mod._send_mail = lambda *a, **k: True

CFG = {"empfaenger": "test@example.de", "empfaenger_name": "Test",
       "name": "Getr\u00e4nke Kratzer", "kd_nr": "15554"}


def seed_katalog(liste):
    store.save_artikel("x", {}, "", liste)


def kat_lesen():
    _, a = store.load_artikel("x", {})
    return {x["nummer"]: x for x in a}


def senden(datum, positionen, korrektur=False):
    body = {"positionen": positionen}
    return fn_mod._senden("x", {}, CFG, datum, body, korrektur=korrektur)


# TC-F1-01: Senden schreibt bestellungen und ueblich fort
ABLAGE.clear()
seed_katalog([artikel("A", bestellungen=2, ueblich=3)])
# zwei fruehere Bestellungen in der Historie
store.save_order("x", {}, "", bestellung("2026-01-01", [pos("A", 3)]))
store.save_order("x", {}, "", bestellung("2026-02-01", [pos("A", 5)]))
r = senden("2026-03-01", [pos("A", 7)])
a = kat_lesen()["A"]
pruefe("TC-F1-01 Senden -> bestellungen 3, ueblich 5 (Median 3,5,7)",
       getattr(r, "status_code", 0) == 200
       and a["bestellungen"] == 3 and a["ueblich"] == 5,
       f"-> status={getattr(r, 'status_code', '?')} {a['bestellungen']}/{a['ueblich']}")

# TC-F1-02: Gescheiterter Versand laesst den Katalog unberuehrt
ABLAGE.clear()
seed_katalog([artikel("A", bestellungen=2, ueblich=3)])
fn_mod._send_mail = lambda *a, **k: False
r = senden("2026-03-01", [pos("A", 7)])
a = kat_lesen()["A"]
pruefe("TC-F1-02 Versand scheitert -> Katalog unveraendert",
       getattr(r, "status_code", 0) >= 400
       and a["bestellungen"] == 2 and a["ueblich"] == 3,
       f"-> status={getattr(r, 'status_code', '?')} {a['bestellungen']}/{a['ueblich']}")
fn_mod._send_mail = lambda *a, **k: True

# TC-F3-01: Neuer Artikel waechst nach zwei Bestellungen hinein
ABLAGE.clear()
seed_katalog([artikel("N", bestellungen=0, ueblich=None)])
senden("2026-01-05", [pos("N", 4)])
senden("2026-02-05", [pos("N", 4)])
a = kat_lesen()["N"]
pruefe("TC-F3-01 neuer Artikel -> bestellungen 2, ueblich 4",
       a["bestellungen"] == 2 and a["ueblich"] == 4,
       f"-> {a['bestellungen']}/{a['ueblich']}")

# TC-F5-01: Korrektur ersetzt statt zu addieren
ABLAGE.clear()
seed_katalog([artikel("A")])
senden("2026-01-05", [pos("A", 3)])
senden("2026-02-05", [pos("A", 5)])                 # zweiter Termin
senden("2026-02-05", [pos("A", 8)], korrektur=True)  # Korrektur desselben Termins
a = kat_lesen()["A"]
# Termine bleiben zwei; ueblich rechnet mit 8 statt 5: Median(8,3)=5,5 -> 6
pruefe("TC-F5-01 Korrektur ersetzt (bestellungen 2, ueblich 6)",
       a["bestellungen"] == 2 and a["ueblich"] == 6,
       f"-> {a['bestellungen']}/{a['ueblich']}")


print()
if FEHLER:
    print(f"FEHLGESCHLAGEN: {len(FEHLER)} - {', '.join(FEHLER)}")
    sys.exit(1)
print("Alle Pruefungen bestanden.")
