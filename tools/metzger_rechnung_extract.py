"""Wertet die Rechnungen von Metzger Mair aus.

Die Rechnungen sind maschinenlesbar und nennen je Position Artikelnummer,
Bezeichnung, Stueck bzw. Gewicht, Preis und - ueber die Lieferschein-Zeile -
das Lieferdatum. Daraus entstehen zwei Dateien:

* ``rechnungsartikel.json`` - Artikelstamm mit Nummer, Bezeichnung, letztem Preis
  und Standardeinheit (Gewichts- oder Stueckware).
* ``lieferhistorie.json``   - Lieferhistorie je Liefertag als Grundlage fuer die
  Vorbelegung und die Haeufig-Vorschlaege im Kiosk.

Aufruf::

    python tools/metzger_rechnung_extract.py
"""
import glob
import json
import os
import re
from collections import defaultdict

import fitz

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
BASE = os.path.join(ROOT, "Metzger Mair")
OUT_DIR = os.path.join(ROOT, "api", "metzger-order", "vorlage")

# Spaltengrenzen in PDF-Punkten, aus dem Layout der Rechnungen abgelesen.
X_NR = (120, 152)
X_NAME = (152, 320)
X_STUECK = (320, 366)
X_GEWICHT = (366, 440)
X_PREIS = (440, 500)
X_SUMME = (500, 556)

LIEFERSCHEIN = re.compile(
    r"Lieferschein-Nr\.:\s*(\d+),\s*Lieferdatum:\s*(\d{2}\.\d{2}\.\d{4})")
ABBRUCH = ("Zwischensumme", "Rechnungsbetrag", "Warenwert", "Uebertrag", "Übertrag")
# Kopf- und Bonzeilen stehen in derselben Spalte wie die Artikelnamen und
# wuerden sonst als Fortsetzung an die letzte Position angehaengt.
KEIN_ARTIKEL = ("Bon-Nr.:", "Filial-Nr.:", "Abt.-Nr.:", "Waage:", "Bediener-Nr.:",
                "Artikelbezeichnung", "Kunden-Nr:", "Rechnungsdatum:", "Bearbeiter:")

# Die Rechnung kuerzt lange Bezeichnungen in der Spalte ab.
KORREKTUR = {
    763: "Champignonschinkenwurst",
}


def zahl(text):
    """'1,572' -> 1.572 ; '' -> None"""
    text = (text or "").replace(".", "").replace(",", ".")
    try:
        return float(text)
    except ValueError:
        return None


def zeilen(page):
    """Woerter der Seite nach Zeilen gruppiert, jeweils nach x sortiert."""
    gruppen = defaultdict(list)
    for x0, y0, _x1, _y1, wort, *_ in page.get_text("words"):
        gruppen[round(y0 / 4)].append((x0, wort))
    return [sorted(gruppen[k]) for k in sorted(gruppen)]


def spalte(zeile, grenzen):
    lo, hi = grenzen
    return [w for x, w in zeile if lo <= x < hi]


def positionen(pfad):
    """Liefert alle Rechnungspositionen als Liste von dicts."""
    doc = fitz.open(pfad)
    out = []
    lieferdatum = None
    for page in doc:
        for zeile in zeilen(page):
            text = " ".join(w for _x, w in zeile)
            treffer = LIEFERSCHEIN.search(text)
            if treffer:
                lieferdatum = treffer.group(2)
                continue
            if any(a in text for a in ABBRUCH):
                continue
            if any(a in text for a in KEIN_ARTIKEL):
                continue

            nr = spalte(zeile, X_NR)
            name = spalte(zeile, X_NAME)
            name_x = next((x for x, _w in zeile if X_NAME[0] <= x < X_NAME[1]), None)
            gewicht = spalte(zeile, X_GEWICHT)
            stueck = spalte(zeile, X_STUECK)
            preis = spalte(zeile, X_PREIS)

            if nr and nr[0].isdigit() and name:
                out.append({
                    "nummer": int(nr[0]),
                    "name": " ".join(name),
                    "stueck": zahl(stueck[0]) if stueck else None,
                    "gewicht": zahl(gewicht[0]) if gewicht else None,
                    "preis": zahl(preis[0]) if preis else None,
                    "lieferdatum": lieferdatum,
                })
            elif out and name and not nr and name_x and name_x < 200:
                # Fortsetzungszeile: der Name lief in die naechste Zeile.
                # Nur linksbuendige Fortsetzungen zaehlen - der umgebrochene
                # Bearbeitername der Lieferscheinzeile steht weiter rechts.
                out[-1]["name"] += " " + " ".join(name)
            elif out and (gewicht or stueck) and not name:
                # Gewicht/Stueck stehen bei langen Namen eine Zeile tiefer.
                if gewicht and out[-1]["gewicht"] is None:
                    out[-1]["gewicht"] = zahl(gewicht[0])
                if stueck and out[-1]["stueck"] is None:
                    out[-1]["stueck"] = zahl(stueck[0])
    doc.close()
    return out


def main():
    # Windows matcht Globs ohne Ruecksicht auf Gross-/Kleinschreibung, daher
    # wuerde ``R_*.PDF`` plus ``R_*.pdf`` jede Datei doppelt liefern.
    gefunden = {
        os.path.normcase(p): p
        for p in glob.glob(os.path.join(BASE, "R_*.PDF"))
        + glob.glob(os.path.join(BASE, "R_*.pdf"))
    }
    dateien = sorted(gefunden.values())
    if not dateien:
        raise SystemExit(f"Keine Rechnungen gefunden in {BASE}")

    alle = []
    for f in dateien:
        alle.extend(positionen(f))

    # ---- Artikelstamm -------------------------------------------------
    artikel = {}
    for p in alle:
        a = artikel.setdefault(p["nummer"], {
            "nummer": p["nummer"], "name": p["name"],
            "preis": None, "einheit": None,
            "lieferungen": 0, "gewicht_summe": 0.0, "stueck_summe": 0.0,
            "namen": defaultdict(int),
        })
        a["namen"][p["name"]] += 1
        a["lieferungen"] += 1
        if p["gewicht"]:
            a["gewicht_summe"] += p["gewicht"]
        if p["stueck"]:
            a["stueck_summe"] += p["stueck"]
        if p["preis"]:
            a["preis"] = p["preis"]  # letzte Rechnung gewinnt

    katalog = []
    for nr in sorted(artikel):
        a = artikel[nr]
        a["name"] = KORREKTUR.get(nr, max(a["namen"].items(), key=lambda kv: kv[1])[0])
        del a["namen"]
        a["einheit"] = "St" if a["stueck_summe"] and not a["gewicht_summe"] else "kg"
        a["gewicht_summe"] = round(a["gewicht_summe"], 3)
        katalog.append(a)

    # ---- Lieferhistorie -----------------------------------------------
    tage = defaultdict(list)
    for p in alle:
        if p["lieferdatum"]:
            tage[p["lieferdatum"]].append({
                "nummer": p["nummer"],
                "stueck": p["stueck"],
                "gewicht": p["gewicht"],
            })

    def sortier(d):
        t, m, j = d.split(".")
        return (j, m, t)

    historie = [{"datum": d, "positionen": tage[d]} for d in sorted(tage, key=sortier)]

    os.makedirs(OUT_DIR, exist_ok=True)
    with open(os.path.join(OUT_DIR, "rechnungsartikel.json"), "w", encoding="utf-8") as fh:
        json.dump({"artikel": katalog}, fh, ensure_ascii=False, indent=2)
    with open(os.path.join(OUT_DIR, "lieferhistorie.json"), "w", encoding="utf-8") as fh:
        json.dump({"lieferungen": historie}, fh, ensure_ascii=False, indent=2)

    print(f"Rechnungen: {len(dateien)}   Positionen: {len(alle)}")
    print(f"Artikel:    {len(katalog)}   Liefertage: {len(historie)}")
    print("->", OUT_DIR)
    print()
    print(f"{'Nr':>6}  {'Artikel':<38}{'Einh':<6}{'Preis':>8}{'Lief.':>7}{'kg ges.':>10}")
    print("-" * 78)
    for a in katalog:
        print(f"{a['nummer']:>6}  {a['name'][:36]:<38}{a['einheit']:<6}"
              f"{(a['preis'] or 0):>8.2f}{a['lieferungen']:>7}{a['gewicht_summe']:>10.3f}")


if __name__ == "__main__":
    main()
