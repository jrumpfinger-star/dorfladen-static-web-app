"""Ruft die Metzger-Endpunkte ohne Azure auf (Spec F1, F9, F11).

Prueft genau das, was live schiefgegangen ist: dass die Funktionen ueberhaupt
starten, wenn der Baecker-Endpunkt im selben Prozess bereits geladen wurde.
Beide legten frueher ein Modul namens ``store`` an - in Azure teilen sich alle
Funktionen einen Python-Prozess, also gewann das zuerst geladene und der
Metzger-Endpunkt lief in einen AttributeError (HTTP 500).

Dataverse wird durch einen kleinen Attrappen-Speicher ersetzt, der Mailversand
unterbunden. Aufruf::

    python tools/metzger_endpunkt_test.py
"""
import json
import os
import sys
import types

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
API = os.path.join(ROOT, "api")

# Azure-Attrappe, damit die Module ohne installierte Runtime laden.
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

# Der Baecker wird in Azure zuerst geladen - genau so hier.
sys.path.insert(0, os.path.join(API, "baecker-order"))
import store as baecker_store  # noqa: E402

sys.path.insert(0, os.path.join(API, "metzger-order"))
import metzger_store  # noqa: E402

FEHLER = []


def pruefe(name, bedingung, hinweis=""):
    if bedingung:
        print(f"  ok   {name}")
    else:
        print(f"  FEHL {name} {hinweis}")
        FEHLER.append(name)


print("Modul-Trennung (Ursache des HTTP 500)")
pruefe("Baecker- und Metzger-Speicher sind getrennt",
       metzger_store is not baecker_store)
pruefe("Metzger-Speicher kommt aus metzger-order",
       os.path.basename(os.path.dirname(metzger_store.__file__)) == "metzger-order")

# ── Dataverse durch einen Attrappen-Speicher ersetzen ──────────────────
ABLAGE = {}


def fake_token():
    return "test-token"


def fake_read(url, hdrs, key):
    return (key if key in ABLAGE else ""), json.loads(ABLAGE.get(key, "{}"))


def fake_write(url, hdrs, key, rec_id, data, bezeichnung="Metzger"):
    ABLAGE[key] = json.dumps(data, ensure_ascii=False)
    return True


def fake_read_many(url, hdrs, prefix, top=400):
    return [(k, json.loads(v)) for k, v in ABLAGE.items() if k.startswith(prefix)]


metzger_store.get_token = fake_token
metzger_store.read_json = fake_read
metzger_store.write_json = fake_write
metzger_store.read_many = fake_read_many

import importlib.util  # noqa: E402


def lade(pfad, name):
    spec = importlib.util.spec_from_file_location(name, pfad)
    mod = importlib.util.module_from_spec(spec)
    sys.modules[name] = mod
    spec.loader.exec_module(mod)
    return mod


order = lade(os.path.join(API, "metzger-order", "__init__.py"), "metzger_order_fn")
artikel = lade(os.path.join(API, "metzger-artikel", "__init__.py"), "metzger_artikel_fn")
order.store = metzger_store
artikel.store = metzger_store
order._send_mail = lambda *a, **k: True      # kein echter Versand im Test

import azure.functions as func  # noqa: E402


def ruf(mod, method="GET", route=None, body=None, params=None):
    req = func.HttpRequest(method=method, route_params=route or {},
                           body=body, params=params or {})
    r = mod.main(req)
    roh = r.get_body().decode("utf-8", "replace")
    try:
        return r.status_code, json.loads(roh)
    except Exception:
        return r.status_code, roh


print()
print("F1  Uebersicht")
code, d = ruf(order)
pruefe("HTTP 200", code == 200, f"-> {code} {str(d)[:120]}")
pruefe("Tagesleiste ueber 14 Tage", isinstance(d, dict) and len(d.get("tage", [])) == 14)
pruefe("naechster Bestelltag gesetzt", bool(d.get("aktiv")))
pruefe("Testbetrieb ausgewiesen", d.get("testbetrieb") is True)
pruefe("Empfaenger ist die Testadresse",
       d.get("config", {}).get("empfaenger") == "jrumpfinger@t-online.de")

datum = d.get("aktiv")

print()
print("F7  Entwurf mit Katalog und Vorschlaegen")
code, d = ruf(order, route={"datum": datum})
pruefe("HTTP 200", code == 200, f"-> {code} {str(d)[:120]}")
pruefe("Katalog geliefert", len(d.get("artikel", [])) > 80)
pruefe("Vorschlaege geliefert", len(d.get("vorschlaege", {})) > 50)
pruefe("Bestellung leer, weil ohne Historie", d.get("bestellung", {}).get("positionen") == [])

print()
print("F9  Artikelkatalog")
code, d = ruf(artikel)
pruefe("HTTP 200", code == 200, f"-> {code} {str(d)[:120]}")
pruefe("102 Artikel", len(d.get("artikel", [])) == 102)

print()
print("F1  Entwurf speichern")
POS = [{"nummer": 360, "name": "Putenschnitzel",
        "portionen": [{"anzahl": 2, "menge": 4, "einheit": "St", "vakuum": True}],
        "hinweis": ""}]
code, d = ruf(order, "POST", {"datum": datum, "aktion": "speichern"},
              body={"positionen": POS})
pruefe("HTTP 200", code == 200, f"-> {code} {str(d)[:120]}")
code, d = ruf(order, route={"datum": datum})
pruefe("Positionen sind gespeichert",
       len(d.get("bestellung", {}).get("positionen", [])) == 1)

print()
print("F11 Senden")
code, d = ruf(order, "POST", {"datum": datum, "aktion": "senden"},
              body={"positionen": POS, "wer": "Test"})
pruefe("HTTP 200", code == 200, f"-> {code} {str(d)[:160]}")
pruefe("Status gesendet", d.get("status") == 1)
pruefe("Testbetrieb gemeldet", d.get("testbetrieb") is True)
pruefe("Protokoll geschrieben", len(d.get("protokoll", [])) == 1)

print()
print("F11 Leere Bestellung wird abgefangen")
code, d = ruf(order, "POST", {"datum": "2026-12-24", "aktion": "senden"},
              body={"positionen": []})
pruefe("HTTP 400", code == 400, f"-> {code}")
pruefe("freundliche Meldung ohne Technik",
       "nichts bestellt" in str(d.get("error", "")).lower())

print()
print("F12 Zweiter Versand wird blockiert")
code, d = ruf(order, "POST", {"datum": datum, "aktion": "senden"}, body={"positionen": POS})
pruefe("HTTP 409", code == 409, f"-> {code}")
pruefe("verweist auf Korrektur", "Korrektur" in str(d.get("error", "")))

print()
print("F12 Korrektur ist moeglich")
code, d = ruf(order, "POST", {"datum": datum, "aktion": "korrektur"},
              body={"positionen": POS, "wer": "Test"})
pruefe("HTTP 200", code == 200, f"-> {code} {str(d)[:120]}")
pruefe("Status korrigiert", d.get("status") == 2)
pruefe("Protokoll hat zwei Eintraege", len(d.get("protokoll", [])) == 2)

print()
print("F14 Verlauf und Dokument")
code, d = ruf(order, params={"mode": "verlauf"})
pruefe("HTTP 200", code == 200, f"-> {code}")
pruefe("ein Eintrag", len(d.get("verlauf", [])) == 1)
pruefe("Dokument vorhanden", d.get("verlauf", [{}])[0].get("hat_dokument") is True)
code, roh = ruf(order, route={"datum": datum, "aktion": "dokument"})
pruefe("PDF ausgeliefert", code == 200)

print()
print("F4  Vorschlaege haben gelernt")
code, d = ruf(order, route={"datum": datum})
v = d.get("vorschlaege", {}).get("360", [])
pruefe("Bestell-Vorschlag steht vorn",
       bool(v) and v[0].get("quelle") == "bestellung",
       f"-> {[x.get('quelle') for x in v]}")

print()
print("F15 Einstellungen")
code, d = ruf(order, "POST", {"datum": "config"},
              body={"config": {"empfaenger": "abc"}})
pruefe("ungueltige Adresse abgelehnt", code == 400, f"-> {code}")
code, d = ruf(order, "POST", {"datum": "config"},
              body={"config": {"bestelltage": []}})
pruefe("ohne Bestelltag abgelehnt", code == 400, f"-> {code}")

print()
if FEHLER:
    print(f"FEHLGESCHLAGEN: {len(FEHLER)} -> {', '.join(FEHLER)}")
    sys.exit(1)
print("Alle Pruefungen bestanden.")
