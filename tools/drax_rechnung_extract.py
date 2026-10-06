"""Wertet die Rechnungen der Drax Muehle aus.

Die Rechnungen sind maschinenlesbar und fuehren je Position einen festen Block
aus sieben Zeilen::

    40405        Art. Nr.
       3         Anzahl
    5 kg         Einheit
    Weizenmehl Type 405 * 5 kg      Bezeichnung
    5,60         Einzelpreis
    16,80        Gesamtpreis
         7       MwSt-Satz

Daraus entstehen drei Dateien:

* ``rechnungsartikel.json`` - Artikelstamm **aus Sicht der Muehle**: Nummer,
  Bezeichnung und Einheit genau so, wie Drax sie schreibt. Das ist die
  verlaessliche Quelle fuer das Bestellformular, denn dieses Blatt liest Drax.
* ``lieferhistorie.json``   - je Liefertag die bestellten Mengen. Grundlage fuer
  die Vorbelegung der naechsten Bestellung.
* ``startwerte-drax.json``  - die Mengen der letzten Lieferung als Vorbelegung.

Das Lieferdatum steht entweder in der Zeile ``LS vom TT.MM.JJJJ`` oder - wenn
die fehlt - im Rechnungsdatum; die Rechnung vermerkt dazu ausdruecklich
„Lieferdatum entspricht Rechnungsdatum".

Aufruf::

    python tools/drax_rechnung_extract.py
"""
import glob
import json
import os
import re
from collections import defaultdict

import pymupdf

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
BASE = os.path.join(ROOT, "Drax")
OUT_DIR = os.path.join(ROOT, "api", "drax-order", "vorlage")
KATALOG = os.path.join(OUT_DIR, "katalog-drax.json")

ART_NR = re.compile(r"^\d{5}$")
ANZAHL = re.compile(r"^\s*(\d+)\s*$")
PREIS = re.compile(r"^\s*-?\d{1,3}(?:\.\d{3})*,\d{2}\s*$")
RECHNUNG_NR = re.compile(r"Rechnung Nr\.\s*(\d+)")
RECH_DATUM = re.compile(r"Datum:\s*(\d{2}\.\d{2}\.\d{4})")
LIEFERSCHEIN = re.compile(r"LS vom\s*(\d{2}\.\d{2}\.\d{4})")
ENDE = ("% MwSt auf", "Summe Rechnung", "Vielen Dank")

WOCHENTAGE = ["Montag", "Dienstag", "Mittwoch", "Donnerstag",
              "Freitag", "Samstag", "Sonntag"]


def iso(deutsch):
    """'06.08.2026' -> '2026-08-06'"""
    t, m, j = deutsch.split(".")
    return "%s-%s-%s" % (j, m, t)


def wochentag(iso_datum):
    import datetime
    j, m, t = (int(x) for x in iso_datum.split("-"))
    return WOCHENTAGE[datetime.date(j, m, t).weekday()]


def zahl(text):
    try:
        return float(str(text).strip().replace(".", "").replace(",", "."))
    except ValueError:
        return 0.0


def lies_rechnung(pfad):
    """Eine Rechnung -> (nummer, lieferdatum_iso, [positionen])."""
    doc = pymupdf.open(pfad)
    zeilen = []
    for seite in doc:
        zeilen.extend(seite.get_text().splitlines())
    doc.close()

    text = "\n".join(zeilen)
    m = RECHNUNG_NR.search(text)
    nummer = m.group(1) if m else os.path.basename(pfad)
    m = LIEFERSCHEIN.search(text)
    if not m:
        m = RECH_DATUM.search(text)
    datum = iso(m.group(1)) if m else None

    positionen = []
    i = 0
    while i < len(zeilen):
        z = zeilen[i].strip()
        if any(e in z for e in ENDE):
            break
        # Eine Position beginnt mit der Artikelnummer, gefolgt von der Anzahl.
        # Die Hinweiszeile „LS vom …" hat keine Nummer und faellt so heraus.
        if ART_NR.match(z) and i + 6 < len(zeilen) and ANZAHL.match(zeilen[i + 1]):
            block = [x.strip() for x in zeilen[i:i + 7]]
            nr, anzahl, einheit, name, einzel, gesamt, mwst = block
            # Preisspalten pruefen: so faellt auf, wenn das Layout abweicht.
            if not (PREIS.match(einzel) and PREIS.match(gesamt)):
                i += 1
                continue
            positionen.append({
                "nr": nr,
                "menge": int(anzahl),
                "einheit": einheit,
                "name": name,
                "ek": zahl(einzel),
            })
            i += 7
            continue
        i += 1
    return nummer, datum, positionen


def main():
    dateien = sorted(glob.glob(os.path.join(BASE, "Rechnung*.pdf")))
    if not dateien:
        raise SystemExit("Keine Rechnungen in %s gefunden." % BASE)

    lieferungen = []
    artikel = {}
    for pfad in dateien:
        nummer, datum, positionen = lies_rechnung(pfad)
        if not positionen:
            print("  ! ohne Positionen:", os.path.basename(pfad))
            continue
        lieferungen.append({
            "rechnung": nummer,
            "datum": datum,
            "wochentag": wochentag(datum) if datum else "",
            "positionen": [{"nr": p["nr"], "menge": p["menge"]} for p in positionen],
        })
        for p in positionen:
            a = artikel.setdefault(p["nr"], {
                "nr": p["nr"], "name": p["name"], "einheit": p["einheit"],
                "ek": p["ek"], "lieferungen": 0, "menge_gesamt": 0,
                "zuletzt": datum,
            })
            a["lieferungen"] += 1
            a["menge_gesamt"] += p["menge"]
            # Die juengste Rechnung gewinnt bei Name, Einheit und Preis.
            if datum and (not a["zuletzt"] or datum >= a["zuletzt"]):
                a["zuletzt"] = datum
                a["name"] = p["name"]
                a["einheit"] = p["einheit"]
                a["ek"] = p["ek"]

    lieferungen.sort(key=lambda l: l["datum"] or "")
    liste = sorted(artikel.values(),
                   key=lambda a: (-a["lieferungen"], -a["menge_gesamt"], a["nr"]))

    os.makedirs(OUT_DIR, exist_ok=True)

    def schreib(name, daten):
        pfad = os.path.join(OUT_DIR, name)
        with open(pfad, "w", encoding="utf-8") as f:
            json.dump(daten, f, ensure_ascii=False, indent=2)
            f.write("\n")
        return pfad

    schreib("rechnungsartikel.json", {
        "quelle": "Drax/Rechnung*.pdf",
        "rechnungen": len(lieferungen),
        "artikel": liste,
    })
    schreib("lieferhistorie.json", {
        "quelle": "Drax/Rechnung*.pdf",
        "lieferungen": lieferungen,
    })
    # Vorbelegung: die letzte Lieferung. Weicht eine Woche stark ab, korrigiert
    # der Laden das im Kiosk — die Vorbelegung soll nur das Tippen sparen.
    letzte = lieferungen[-1] if lieferungen else {"positionen": []}
    schreib("startwerte-drax.json", {
        "grundlage": letzte.get("datum"),
        "mengen": {p["nr"]: p["menge"] for p in letzte["positionen"]},
    })

    # Dieselben Daten noch einmal als Skript fuer das Mockup. Eine HTML-Datei,
    # die per Doppelklick aufgeht, darf kein JSON nachladen — `file://` blockt
    # jedes `fetch`.
    js_pfad = os.path.join(ROOT, "mockups", "drax-historie.js")
    os.makedirs(os.path.dirname(js_pfad), exist_ok=True)
    with open(js_pfad, "w", encoding="utf-8") as f:
        f.write("// Erzeugt von tools/drax_rechnung_extract.py"
                " – nicht von Hand aendern.\n")
        f.write("window.DRAX_HISTORIE = ")
        json.dump({"lieferungen": lieferungen}, f, ensure_ascii=False, indent=2)
        f.write(";\n")

    # ── Abgleich mit dem Kassen-Export ───────────────────────────────────
    # Beide Quellen fuehren dieselbe Nummer. Wo die Bezeichnungen auseinander
    # laufen, ist Vorsicht geboten: Auf dem Bestellformular muss stehen, was
    # die Muehle unter der Nummer fuehrt.
    abweichungen = []
    fehlen = []
    if os.path.exists(KATALOG):
        with open(KATALOG, encoding="utf-8") as f:
            kat = json.load(f)
        kat_nr = {a["nr"]: a for a in kat["artikel"]}
        for a in liste:
            k = kat_nr.get(a["nr"])
            if not k:
                fehlen.append(a)
                continue
            kurz_k = re.sub(r"[^a-zäöüß0-9]", "", k["name"].lower())[:10]
            kurz_a = re.sub(r"[^a-zäöüß0-9]", "", a["name"].lower())[:10]
            if kurz_k[:6] != kurz_a[:6]:
                abweichungen.append((a["nr"], k["name"], a["name"]))

    print("%d Rechnungen, %d Liefertage, %d verschiedene Artikel"
          % (len(dateien), len(lieferungen), len(liste)))
    for l in lieferungen:
        print("  %s %-11s %2d Positionen (Rechnung %s)"
              % (l["datum"], l["wochentag"], len(l["positionen"]), l["rechnung"]))
    if fehlen:
        print("\nNicht im Kassen-Export (neue Artikel):")
        for a in fehlen:
            print("  %-6s %-10s %s" % (a["nr"], a["einheit"], a["name"]))
    if abweichungen:
        print("\nAbweichende Bezeichnung – bitte pruefen:")
        for nr, k, a in abweichungen:
            print("  %-6s Kasse: %-38s Drax: %s" % (nr, k, a))
    print("\n->", OUT_DIR)


if __name__ == "__main__":
    main()
