"""Prueft die Bestell- und Erinnerungslogik der Baecker-Bestellung.

Kernregel: Bestellt wird fuer einen Liefertag, spaetestens am letzten
Arbeitstag davor. Faellt der Vortag auf einen Sonntag oder Feiertag, rueckt
der Bestellschluss entsprechend vor.

Aufruf: python tools/baecker_bestellrhythmus_test.py
"""
import os
import sys
from datetime import date, timedelta

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.join(ROOT, "api"))
sys.path.insert(0, os.path.join(ROOT, "api", "baecker-order"))

import store  # noqa: E402
from shared import feiertage  # noqa: E402

# Konfiguration wie im Betrieb: Freundl Mi-Sa, Martins Mo/Di/Sa
CFG = {
    "baeckereien": {
        "freundl": {"name": "Freundl", "bestelltage": [2, 3, 4, 5], "bestellschluss": "12:00"},
        "martins": {"name": "Martins", "bestelltage": [0, 1, 5], "bestellschluss": "12:00"},
    }
}
WT = ["Montag", "Dienstag", "Mittwoch", "Donnerstag", "Freitag", "Samstag", "Sonntag"]

fehler = []


def pruefe(ok, text):
    print(("  OK   " if ok else "  FEHL ") + text)
    if not ok:
        fehler.append(text)


print("1) Feiertage nach der Gaussschen Osterformel")
# Ostersonntag 2026 war der 05.04.2026
pruefe(feiertage.ostersonntag(2026) == date(2026, 4, 5), "Ostersonntag 2026 = 05.04.")
pruefe(feiertage.ist_feiertag("2026-04-03"), "Karfreitag 2026 (03.04.) erkannt")
pruefe(feiertage.ist_feiertag("2026-06-04"), "Fronleichnam 2026 (04.06.) erkannt")
pruefe(feiertage.ist_feiertag("2026-08-15"), "Maria Himmelfahrt (15.08.) erkannt")
pruefe(feiertage.ist_feiertag("2026-11-01"), "Allerheiligen (01.11.) erkannt")
pruefe(not feiertage.ist_feiertag("2026-09-08"), "ein normaler Dienstag ist kein Feiertag")
pruefe(len(feiertage.feiertage_bayern(2026)) == 13, "13 gesetzliche Feiertage in Bayern")

print("\n2) Arbeitstag und Bestellschluss")
pruefe(not feiertage.ist_werktag("2026-09-13"), "Sonntag ist kein Arbeitstag")
pruefe(not feiertage.ist_werktag("2026-11-01"), "Allerheiligen ist kein Arbeitstag")
pruefe(feiertage.ist_werktag("2026-09-12"), "Samstag ist ein Arbeitstag")
# Montag 14.09.2026 -> Bestellschluss Samstag 12.09.
pruefe(store.bestellschluss_tag("2026-09-14") == date(2026, 9, 12),
       "Montags-Lieferung wird am Samstag bestellt (Sonntag uebersprungen)")
# Dienstag 15.09. -> Montag 14.09.
pruefe(store.bestellschluss_tag("2026-09-15") == date(2026, 9, 14),
       "Dienstags-Lieferung wird am Montag bestellt")
# Samstag 12.09. -> Freitag 11.09.
pruefe(store.bestellschluss_tag("2026-09-12") == date(2026, 9, 11),
       "Samstags-Lieferung wird am Freitag bestellt")

print("\n3) An Feiertagen wird nicht geliefert")
mcfg = store.cfg_von(CFG, "martins")
# 01.01.2027 ist ein Freitag - Martins liefert freitags ohnehin nicht.
# Pruefen wir Allerheiligen 01.11.2026: ein Sonntag. Nehmen wir 06.01.2026 (Dienstag).
pruefe(feiertage.ist_feiertag("2026-01-06"), "06.01.2026 ist Heilige Drei Koenige (Dienstag)")
pruefe(not store.ist_bestelltag(mcfg, "2026-01-06"),
       "Martins liefert an Heilige Drei Koenige NICHT, obwohl Dienstag")
pruefe(store.ist_bestelltag(mcfg, "2026-01-13"), "am Dienstag darauf wieder ja")

print("\n4) Jeder Liefertag hat genau einen Bestellschluss-Tag, und der ist ein Arbeitstag")
start = date(2026, 1, 1)
ohne = []
for i in range(365):
    tag = start + timedelta(days=i)
    iso = tag.isoformat()
    wer = store.liefert_am(CFG, iso)
    if not wer:
        continue
    bs = store.bestellschluss_tag(iso)
    if not feiertage.ist_werktag(bs):
        ohne.append((iso, bs))
pruefe(not ohne, f"alle Bestellschluss-Tage sind Arbeitstage ({len(ohne)} Ausreisser)")

print("\n5) Kein Liefertag faellt durch die Erinnerung (ganzes Jahr)")
# Nachbau der Erinnerungslogik: an jedem Arbeitstag werden die Lieferungen
# angemahnt, deren Bestellschluss-Tag heute ist.
# Der Vorlauf beginnt bewusst zwei Wochen frueher: die Lieferung am 02.01.
# wird schon am 31.12. bestellt (01.01. ist Neujahr).
angemahnt = set()
vorlauf = start - timedelta(days=14)
for i in range(365 + 14):
    heute = vorlauf + timedelta(days=i)
    if not feiertage.ist_werktag(heute):
        continue          # geschlossen - niemand sieht die Erinnerung
    for j in range(1, 9):
        tag = heute + timedelta(days=j)
        if store.bestellschluss_tag(tag.isoformat()) != heute:
            continue
        for bk in store.liefert_am(CFG, tag.isoformat()):
            angemahnt.add((tag.isoformat(), bk))

luecken = []
for i in range(365):
    tag = start + timedelta(days=i)
    iso = tag.isoformat()
    for bk in store.liefert_am(CFG, iso):
        if (iso, bk) not in angemahnt:
            luecken.append((iso, WT[tag.weekday()], bk))

pruefe(not luecken, f"jede Lieferung wird an einem Arbeitstag angemahnt ({len(luecken)} Luecken)")
for iso, wt, bk in luecken[:8]:
    print(f"       Luecke: {wt} {iso} {bk}")

print()
if fehler:
    print(f"{len(fehler)} Pruefung(en) fehlgeschlagen.")
    raise SystemExit(1)
print("Alle Pruefungen bestanden.")
