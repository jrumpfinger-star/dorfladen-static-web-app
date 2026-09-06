"""Prueft die Fachlogik der Baecker-Bestellung ohne Dataverse-Zugriff."""
import json
import os
import sys
from datetime import date, datetime, timedelta

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.join(ROOT, "api"))
sys.path.insert(0, os.path.join(ROOT, "api", "baecker-order"))
import store  # noqa: E402

# Aehnlichkeitspruefung aus dem Artikel-Endpunkt nachbauen (dort inline)
sys.path.insert(0, os.path.join(ROOT, "api", "baecker-artikel"))
import importlib.util  # noqa: E402
spec = importlib.util.spec_from_file_location(
    "bart", os.path.join(ROOT, "api", "baecker-artikel", "__init__.py"))

ergebnisse = []


def pruefe(name, ist, soll):
    ok = ist == soll
    ergebnisse.append(ok)
    status = "OK    " if ok else "FEHLER"
    print(f"  [{status}] {name}")
    if not ok:
        print(f"           erwartet: {soll!r}")
        print(f"           erhalten: {ist!r}")
    return ok


print("\n== Sortierung nach Artikelnummer (Spec F3) ==")
artikel = [
    {"nummer": "1183", "name": "K\u00f6nig-Ludwig-Brot"},
    {"nummer": "", "name": "Pfefferpaste"},
    {"nummer": "1", "name": "Kaisersemmel"},
    {"nummer": "126", "name": "Baguette"},
    {"nummer": "33", "name": "Mohnsemmel"},
]
sortiert = [a["nummer"] for a in store.sort_artikel(artikel)]
pruefe("aufsteigend, ohne Nummer ans Ende", sortiert, ["1", "33", "126", "1183", ""])

print("\n== Tour-Nummer je Wochentag (Spec F6/F11) ==")
cfg = dict(store.DEFAULT_CONFIG)
pruefe("Donnerstag -> 87", store.tour_nr(cfg, "2026-09-10"), "87")
pruefe("Freitag    -> 87", store.tour_nr(cfg, "2026-09-11"), "87")
pruefe("Samstag    -> 8", store.tour_nr(cfg, "2026-09-12"), "8")
pruefe("Mittwoch   -> 87", store.tour_nr(cfg, "2026-09-09"), "87")

print("\n== Bestelltage (Spec F1) ==")
pruefe("Mittwoch ist Bestelltag", store.ist_bestelltag(cfg, "2026-09-09"), True)
pruefe("Samstag ist Bestelltag", store.ist_bestelltag(cfg, "2026-09-12"), True)
pruefe("Sonntag ist kein Bestelltag", store.ist_bestelltag(cfg, "2026-09-13"), False)
pruefe("Montag ist kein Bestelltag", store.ist_bestelltag(cfg, "2026-09-14"), False)
pruefe("naechster nach Sonntag = Mittwoch",
       store.naechster_bestelltag(cfg, ab=date(2026, 9, 13)), "2026-09-16")

print("\n== Vorbelegung ignoriert Zusatzpositionen (Spec F4) ==")
order = {"positionen": [
    {"nummer": "1", "name": "Kaisersemmel", "menge": 48},
    {"nummer": "", "name": "Brezen f\u00fcr Fest", "menge": 40, "zusatz": True},
]}
pruefe("nur Katalogpositionen", store.positionen_map(order), {"1": 48})

print("\n== Datums-Hilfen ==")
pruefe("ISO -> deutsch", store.datum_de("2026-09-10"), "10.09.2026")
pruefe("Wochentag", store.wochentag("2026-09-10"), "Donnerstag")
pruefe("Samstag erkannt", store.wochentag("2026-09-12"), "Samstag")

print("\n== Startkatalog ==")
kat = os.path.join(ROOT, "api", "baecker-order", "vorlage", "katalog.json")
with open(kat, encoding="utf-8") as fh:
    daten = json.load(fh)["artikel"]
aktiv = [a for a in daten if a["aktiv"]]
pruefe("60 Artikel insgesamt", len(daten), 60)
pruefe("34 aktiv vorbelegt", len(aktiv), 34)
nummern = [int(a["nummer"]) for a in daten if str(a["nummer"]).isdigit()]
pruefe("Katalog ist aufsteigend sortiert", nummern, sorted(nummern))
namen = [a["name"] for a in daten]
pruefe("Tippfehler bereinigt", "Sonnenblumenkernbot 750g" in namen, False)
pruefe("korrigierter Name vorhanden", "Sonnenblumenkernbrot 750g" in namen, True)
pruefe("Dublette entfernt", sum(1 for n in namen if n == "Butterzopf 400g"), 1)

print("\n== Aehnlichkeitspruefung (Spec F5) ==")
mod = importlib.util.module_from_spec(spec)
try:
    spec.loader.exec_module(mod)
    pruefe("Tippfehler erkannt",
           mod._aehnlich("Sonnenblumenkernbrot 750g", "Sonnenblumenkernbot 750g"), True)
    pruefe("Umlaut-Varianten erkannt", mod._aehnlich("Schr\u00f6tlisemmel", "Schroetlisemmel"), True)
    pruefe("verschiedene Artikel nicht verwechselt",
           mod._aehnlich("Mohnsemmel", "Sesamsemmel"), False)
    pruefe("Gruppe nach Nummer (Semmeln)", mod._gruppe("1", cfg), "Semmeln & Kleingeb\u00e4ck")
    pruefe("Gruppe nach Nummer (Brote)", mod._gruppe("160", cfg), "Brote & Baguettes")
    pruefe("Gruppe nach Nummer (Sonstiges)", mod._gruppe("1183", cfg), "S\u00fc\u00dfes & Sonstiges")
    pruefe("ohne Nummer -> letzte Gruppe", mod._gruppe("", cfg), "S\u00fc\u00dfes & Sonstiges")
except ImportError as e:
    print(f"  [UEBERSPRUNGEN] Artikel-Modul benoetigt azure.functions: {e}")

print("\n" + "=" * 60)
print(f"GESAMT: {sum(ergebnisse)}/{len(ergebnisse)} bestanden")
sys.exit(0 if all(ergebnisse) else 1)
