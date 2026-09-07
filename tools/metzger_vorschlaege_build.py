"""Leitet je Artikel die Vorschlagsliste fuer den Portions-Editor ab.

Grundlage sind die Liefermengen aus den Rechnungen (siehe
``metzger_rechnung_extract.py``). Je Artikel und Liefertag ergibt sich daraus
eine Portionsangabe:

* Zahl der Rechnungszeilen  -> ``anzahl`` (der Metzger wiegt je Portion einmal)
* Gewicht je Zeile          -> ``menge``, gerundet auf VIERTEL_KG

Gleiche Angaben werden gezaehlt und nach Punkten sortiert. Die Punkte sind
**zeitgewichtet**: eine Lieferung von gestern zaehlt voll, eine ein halbes Jahr
alte kaum noch (Halbwertszeit HALBWERTSZEIT_TAGE). Dadurch passt sich die Liste
von selbst an, wenn sich die Bestellgewohnheit aendert.

Spaeter im Betrieb kommen die **gesendeten Bestellungen** als zweite Quelle
hinzu; sie wiegen schwerer als eine Lieferung (GEWICHT). Diese Datei ist der
Startbestand, damit die Vorschlaege ab dem ersten Tag stehen.

Ausgabe:

* ``api/metzger-order/vorlage/vorschlaege.json`` - je Metzger-Artikelnummer
* ``mockups/metzger-vorschlaege.js``             - dieselben Daten je
  Artikelbezeichnung fuer das Mockup

Aufruf::

    python tools/metzger_rechnung_extract.py
    python tools/metzger_formular_katalog.py
    python tools/metzger_vorschlaege_build.py
"""
import json
import os
from collections import defaultdict
from datetime import datetime

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
VORLAGE = os.path.join(ROOT, "api", "metzger-order", "vorlage")
MOCKUPS = os.path.join(ROOT, "mockups")

MAX_VORSCHLAEGE = 5
VIERTEL_KG = 0.25          # Rundungsschritt der Portionsgroesse
HALBWERTSZEIT_TAGE = 56    # nach acht Wochen zaehlt ein Beleg nur noch halb
GEWICHT = {"bestellung": 1.0, "lieferung": 0.4}

# Verpackung ist keine Bestellzeile - die Beutel entstehen aus den Portionen.
KEINE_VORSCHLAEGE = {980, 981, 982}


def runde(kg):
    """Auf ein Viertelkilo runden, aber nie auf null."""
    return max(VIERTEL_KG, round(kg / VIERTEL_KG) * VIERTEL_KG)


def als_datum(text):
    return datetime.strptime(text, "%d.%m.%Y")


def schluessel(portionen):
    return "|".join(f"{p['anzahl']}x{p['menge']}{p['einheit']}" for p in portionen)


def main():
    with open(os.path.join(VORLAGE, "lieferhistorie.json"), encoding="utf-8") as fh:
        lieferungen = json.load(fh)["lieferungen"]
    with open(os.path.join(VORLAGE, "katalog.json"), encoding="utf-8") as fh:
        katalog = json.load(fh)["artikel"]

    stand = max(als_datum(l["datum"]) for l in lieferungen)

    # (nummer, schluessel) -> {portionen, punkte, belege, zuletzt}
    roh = defaultdict(lambda: {"punkte": 0.0, "belege": 0, "zuletzt": None})

    for lieferung in lieferungen:
        datum = als_datum(lieferung["datum"])
        alter = (stand - datum).days
        faktor = 0.5 ** (alter / HALBWERTSZEIT_TAGE)

        # Zeilen je Artikel dieses Liefertags sammeln
        je_artikel = defaultdict(list)
        for p in lieferung["positionen"]:
            if p["nummer"] in KEINE_VORSCHLAEGE or not p["gewicht"]:
                continue
            je_artikel[p["nummer"]].append(p["gewicht"])

        for nummer, gewichte in je_artikel.items():
            anzahl = len(gewichte)
            menge = runde(sum(gewichte) / anzahl)
            portionen = [{"anzahl": anzahl, "menge": menge, "einheit": "kg"}]
            eintrag = roh[(nummer, schluessel(portionen))]
            eintrag["portionen"] = portionen
            eintrag["punkte"] += GEWICHT["lieferung"] * faktor
            eintrag["belege"] += 1
            if eintrag["zuletzt"] is None or datum > eintrag["zuletzt"]:
                eintrag["zuletzt"] = datum

    # Je Artikel die besten MAX_VORSCHLAEGE
    je_nummer = defaultdict(list)
    for (nummer, _key), e in roh.items():
        je_nummer[nummer].append(e)

    vorschlaege = {}
    for nummer, liste in je_nummer.items():
        liste.sort(key=lambda e: (-e["punkte"], -e["zuletzt"].toordinal()))
        vorschlaege[str(nummer)] = [{
            "portionen": e["portionen"],
            "punkte": round(e["punkte"], 4),
            "belege": e["belege"],
            "zuletzt": e["zuletzt"].strftime("%d.%m.%Y"),
            "quelle": "lieferung",
        } for e in liste[:MAX_VORSCHLAEGE]]

    ergebnis = {
        "stand": stand.strftime("%d.%m.%Y"),
        "max_vorschlaege": MAX_VORSCHLAEGE,
        "halbwertszeit_tage": HALBWERTSZEIT_TAGE,
        "gewicht": GEWICHT,
        "artikel": vorschlaege,
    }
    with open(os.path.join(VORLAGE, "vorschlaege.json"), "w", encoding="utf-8") as fh:
        json.dump(ergebnis, fh, ensure_ascii=False, indent=2)

    # Dieselben Daten je Bezeichnung, damit das Mockup ohne Server auskommt.
    nach_name = {}
    for a in katalog:
        if a["nummer"] and str(a["nummer"]) in vorschlaege:
            nach_name[a["name"]] = vorschlaege[str(a["nummer"])]
    os.makedirs(MOCKUPS, exist_ok=True)
    with open(os.path.join(MOCKUPS, "metzger-vorschlaege.js"), "w", encoding="utf-8") as fh:
        fh.write("// Erzeugt von tools/metzger_vorschlaege_build.py - nicht von Hand aendern.\n")
        fh.write("window.METZGER_VORSCHLAEGE = ")
        json.dump({"stand": ergebnis["stand"], "max": MAX_VORSCHLAEGE,
                   "artikel": nach_name}, fh, ensure_ascii=False, indent=1)
        fh.write(";\n")

    mit = sum(1 for v in vorschlaege.values() if v)
    anzahl = [len(v) for v in vorschlaege.values()]
    print(f"Stand: {ergebnis['stand']}   Artikel mit Vorschlaegen: {mit}"
          f"   davon im Mockup: {len(nach_name)}")
    print(f"Vorschlaege je Artikel: min {min(anzahl)}, max {max(anzahl)}, "
          f"Schnitt {sum(anzahl)/len(anzahl):.1f}")
    print("->", os.path.join(VORLAGE, "vorschlaege.json"))
    print("->", os.path.join(MOCKUPS, "metzger-vorschlaege.js"))
    print()

    namen = {a["nummer"]: a["name"] for a in katalog if a["nummer"]}
    print("Beispiele:")
    for nummer in (2, 142, 360, 402, 500, 600, 620):
        if str(nummer) not in vorschlaege:
            continue
        text = "   ".join(
            f"{v['portionen'][0]['anzahl']}x{v['portionen'][0]['menge']:g}kg"
            f" ({v['belege']})" for v in vorschlaege[str(nummer)])
        print(f"  {nummer:>5} {namen.get(nummer, '')[:26]:<28}{text}")


if __name__ == "__main__":
    main()
