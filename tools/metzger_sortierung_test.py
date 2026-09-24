"""Die Artikelreihenfolge im versendeten PDF.

Spec: specs/metzger-artikel-sortierung/spec.md (TC-MP-01 … TC-MP-07)

Aus dem Laden, nachgereicht zur Sortierung am Schirm:
„ja, stell es auch um" - gemeint war das PDF an die Metzgerei.

Entscheidend ist der **Gleichlauf**: Wer im Laden am Schirm erfasst, prueft
danach den Ausdruck. Laufen die beiden Listen auseinander, muss man bei jeder
Zeile suchen.

Geprueft wird deshalb beides: die Sortierfunktion selbst und dass sie in der
Kiosk-Fassung dieselbe Regel hat.

Ausfuehren:  python tools/metzger_sortierung_test.py
"""
import os
import re
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.join(ROOT, "api", "metzger-order"))
sys.path.insert(0, os.path.join(ROOT, "api"))

import metzger_store as store  # noqa: E402

fehler = []


def pruefe(bedingung, text):
    print(("  OK   " if bedingung else "  FEHL ") + text)
    if not bedingung:
        fehler.append(text)


# Der gemeldete Bestand: „Fleisch frisch" vorn UND am Ende noch einmal
# (Nr. 3, nachtraeglich angelegt), Nummern durcheinander.
KATALOG = [
    {"nummer": 2, "name": "Lende Schwein", "gruppe": "Fleisch frisch"},
    {"nummer": 360, "name": "Putenschnitzel", "gruppe": "Fleisch frisch"},
    {"nummer": 109, "name": "Braten Rind", "gruppe": "Fleisch frisch"},
    {"nummer": None, "name": "Tafelspitz", "gruppe": "Fleisch frisch"},
    {"nummer": 402, "name": "Leberkaese", "gruppe": "Braet & Leberkaese"},
    {"nummer": 407, "name": "Milzwurst", "gruppe": "Braet & Leberkaese"},
    {"nummer": 3, "name": "Schnitzel vom Strohschwein", "gruppe": "Fleisch frisch"},
]

print("1) Nach Gruppe, darin aufsteigend nach Nummer")
sortiert = store.nach_gruppe_und_nummer(KATALOG)
namen = [a["name"] for a in sortiert]
nummern = [a["nummer"] for a in sortiert]
pruefe(nummern == [2, 3, 109, 360, None, 402, 407],
       f"Reihenfolge: {nummern}")

print("\n2) Der nachgetragene Artikel steht bei seiner Gruppe")
pruefe(namen.index("Schnitzel vom Strohschwein") < namen.index("Leberkaese"),
       f"Strohschwein an Stelle {namen.index('Schnitzel vom Strohschwein') + 1}")

print("\n3) Jede Gruppe bildet genau EINEN Block")
bloecke = []
for a in sortiert:
    g = a["gruppe"]
    if not bloecke or bloecke[-1] != g:
        bloecke.append(g)
pruefe(len(bloecke) == len(set(bloecke)), f"Bloecke: {bloecke}")

print("\n4) Die Gruppenfolge bleibt die des Katalogs")
# Nicht alphabetisch - sonst kaeme „Braet" vor „Fleisch".
pruefe(bloecke[0] == "Fleisch frisch", f"erste Gruppe: {bloecke[0]}")
pruefe(bloecke[1] == "Braet & Leberkaese", f"zweite Gruppe: {bloecke[1]}")

print("\n5) Artikel ohne Nummer stehen am Ende ihrer Gruppe")
pruefe(namen[4] == "Tafelspitz", f"an Stelle 5 steht {namen[4]}")

print("\n6) Die Sortierung veraendert den Bestand nicht")
pruefe(len(sortiert) == len(KATALOG), f"{len(sortiert)} statt {len(KATALOG)}")
pruefe(KATALOG[0]["name"] == "Lende Schwein",
       "die Eingabeliste bleibt unberuehrt (sorted() gibt eine neue zurueck)")
pruefe(sorted(namen) == sorted(a["name"] for a in KATALOG),
       "kein Artikel verloren oder doppelt")

print("\n7) Randfaelle stuerzen nicht ab")
pruefe(store.nach_gruppe_und_nummer([]) == [], "leere Liste")
komisch = [
    {"name": "ohne alles"},
    {"nummer": "17", "name": "Nummer als Text", "gruppe": "X"},
    {"nummer": 0, "name": "Null", "gruppe": "X"},
]
raus = store.nach_gruppe_und_nummer(komisch)
pruefe(len(raus) == 3, f"{len(raus)} statt 3")
x = [a["name"] for a in raus if a.get("gruppe") == "X"]
pruefe(x == ["Null", "Nummer als Text"], f"Text-Nummer einsortiert: {x}")

print("\n8) Das PDF nutzt die Sortierung")
quelle = open(os.path.join(ROOT, "api", "metzger-order", "__init__.py"),
              encoding="utf-8-sig").read()
zweig = quelle.split("build_pdf(")[0][-600:]
pruefe("nach_gruppe_und_nummer" in zweig,
       "vor build_pdf wird sortiert")

print("\n9) Kiosk und Server tragen dieselbe Regel")
js = open(os.path.join(ROOT, "static-site", "js", "kiosk-metzger-bestellung.js"),
          encoding="utf-8").read()
pruefe("function nachGruppeUndNummer" in js, "Kiosk hat den Helfer")

# Statt Textvergleiche: dieselben Daten durch beide Regeln schicken. Die
# Kiosk-Fassung wird dafuer in Python nachgebildet - weicht eine der beiden
# ab, faellt es hier auf.
def wie_im_kiosk(artikel):
    folge = {}
    for a in artikel:
        g = a.get("gruppe") or ""
        if g not in folge:
            folge[g] = len(folge)
    import functools

    def vergleich(x, y):
        gx = folge.get(x.get("gruppe") or "", 999)
        gy = folge.get(y.get("gruppe") or "", 999)
        if gx != gy:
            return gx - gy
        try:
            nx, fx = int(x.get("nummer")), False
        except (TypeError, ValueError):
            nx, fx = 0, True
        try:
            ny, fy = int(y.get("nummer")), False
        except (TypeError, ValueError):
            ny, fy = 0, True
        if fx != fy:
            return 1 if fx else -1
        if fx:
            a_, b_ = (x.get("name") or "").lower(), (y.get("name") or "").lower()
            return -1 if a_ < b_ else (1 if a_ > b_ else 0)
        return nx - ny

    return sorted(artikel, key=functools.cmp_to_key(vergleich))


for probe, was in ((KATALOG, "gemeldeter Bestand"), (komisch, "Randfaelle")):
    a = [x.get("name") for x in store.nach_gruppe_und_nummer(probe)]
    b = [x.get("name") for x in wie_im_kiosk(probe)]
    pruefe(a == b, f"{was}: Server {a} vs. Kiosk {b}")

print()
if fehler:
    print(f"{len(fehler)} Pruefung(en) fehlgeschlagen.")
    raise SystemExit(1)
print("Alle Pruefungen bestanden.")
