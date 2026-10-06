"""Gleicht den Drax-Artikelstamm mit einer Preisliste der Muehle ab.

Die Muehle schickt gelegentlich eine Preisliste als PDF. Sie ist die
verlaesslichste Quelle fuer Bezeichnung, Einheit und Strichcode - genauer
als der Kassen-Export und vollstaendiger als die Rechnungen, denn sie
enthaelt auch, was der Laden noch nie bestellt hat.

Was dabei geschieht:

1. **Bezeichnung und Einheit angleichen.** Es gilt die Schreibweise der
   Muehle - genau so steht sie auf dem Bestellblatt. Die Gebindegroesse
   wird aus dem Namen geloest; auf dem Blatt hat sie eine eigene Spalte,
   im Namen waere sie doppelt.
2. **Neue Artikel aufnehmen**, mit Warengruppe aus dem Nummernkreis.
3. **Entfallene ausblenden**, nicht loeschen: Ohne Bezeichnung stuende im
   Verlauf nur noch die Artikelnummer.

**Preise werden bewusst nicht uebernommen** (Spec drax-bestellung, F3):
Der Laden bestellt nach Bedarf, nicht nach Budget.

Aufruf::

    py -3.12 tools/drax_katalog_aus_preisliste.py          # nur berichten
    py -3.12 tools/drax_katalog_aus_preisliste.py --schreiben
"""
import glob
import io
import json
import os
import re
import sys

import fitz   # PyMuPDF

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from drax_katalog_aus_xlsx import GRUPPEN, drax_name, gruppe_von  # noqa: E402

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
MUSTER = os.path.join(ROOT, "Drax", "Preisliste*.pdf")
JSON_ZIEL = os.path.join(ROOT, "api", "drax-order", "vorlage",
                         "katalog-drax.json")
JS_ZIEL = os.path.join(ROOT, "mockups", "drax-katalog.js")

EURO = "\u20ac"
GELD = re.compile(r"-?[\d.]+,\d{2}\s*" + EURO)

# ── Strichcode-Schrift entschluesseln ────────────────────────────────────
# Die Preisliste gibt den EAN in einer Strichcode-Schrift aus:
# "4CPACTQ*gabdfb+" steht fuer 4250296601351. Aufbau eines EAN-13:
# erste Ziffer wie gedruckt, dann sechs Ziffern der linken Gruppe, dann
# sechs der rechten. Die linke Gruppe nutzt je Stelle einen von zwei
# Zeichensaetzen; welchen, bestimmt die erste Ziffer (Paritaetsmuster).
LINKS_A = "ABCDEFGHIJ"      # Zeichensatz L: 0..9
LINKS_B = "KLMNOPQRST"      # Zeichensatz G: 0..9
RECHTS = "abcdefghij"       # rechte Gruppe: 0..9
PARITAET = {
    "0": "LLLLLL", "1": "LLGLGG", "2": "LLGGLG", "3": "LLGGGL",
    "4": "LGLLGG", "5": "LGGLLG", "6": "LGGGLL", "7": "LGLGLG",
    "8": "LGLGGL", "9": "LGGLGL",
}


def ean_entschluesseln(roh):
    """Aus "4CPACTQ*gabdfb+" wird "4250296601351"; sonst leer.

    Ein unlesbarer Strichcode ist kein Grund zum Abbruch - der EAN ist
    Beiwerk, bestellt wird ueber die Artikelnummer.
    """
    m = re.fullmatch(r"(\d)([A-T]{6})\*([a-j]{6})\+", (roh or "").strip())
    if not m:
        return ""
    erste, links, rechts = m.group(1), m.group(2), m.group(3)
    muster = PARITAET.get(erste)
    if not muster:
        return ""
    ziffern = [erste]
    for zeichen, art in zip(links, muster):
        satz = LINKS_A if art == "L" else LINKS_B
        if zeichen not in satz:
            return ""
        ziffern.append(str(satz.index(zeichen)))
    for zeichen in rechts:
        ziffern.append(str(RECHTS.index(zeichen)))
    return "".join(ziffern)


def einheit_normal(roh):
    """„500g" und „2,5 kg" auf eine Schreibweise bringen."""
    e = (roh or "").strip()
    m = re.fullmatch(r"([\d.,]+)\s*([A-Za-z\u00fc]+)", e)
    return f"{m.group(1)} {m.group(2)}" if m else e


def preisliste_lesen(pfad):
    """Die Preisliste in Datensaetze zerlegen.

    Der Textauszug liefert je Artikel neun Zeilen in fester Folge: Nummer,
    Bezeichnung, Einheit, Hersteller, VK, MwSt-Satz, EK, VPE, Strichcode.
    Erkannt wird ein Artikel an der fuenfstelligen Nummer **plus** zwei
    Geldbetraegen an der erwarteten Stelle - die Kopfzeilen jeder Seite
    (darunter die Kundennummer 11225) fallen damit von selbst weg.
    """
    zeilen = []
    for seite in fitz.open(pfad):
        zeilen += [z.strip() for z in seite.get_text().split("\n") if z.strip()]

    aus, i = [], 0
    while i < len(zeilen):
        if re.fullmatch(r"\d{5}", zeilen[i]) and i + 8 < len(zeilen):
            b = zeilen[i:i + 9]
            if GELD.fullmatch(b[4]) and GELD.fullmatch(b[6]):
                aus.append({
                    "nr": b[0],
                    "name": drax_name(b[1]),
                    "einheit": einheit_normal(b[2]),
                    "hersteller": b[3],
                    "ean": ean_entschluesseln(b[8]),
                })
                i += 9
                continue
        i += 1
    return aus


def abgleichen(katalog, liste):
    """Den Katalog an der Preisliste ausrichten. Gibt einen Bericht."""
    je_nr = {a["nr"]: a for a in liste}
    alt = {str(a.get("nr")): a for a in katalog["artikel"]}

    bericht = {"geaendert": [], "neu": [], "ausgeblendet": [],
               "behalten": [], "ean": 0}

    for p in liste:
        a = alt.get(p["nr"])
        if a is None:
            neu = {
                "nr": p["nr"],
                "name": p["name"],
                "einheit": p["einheit"],
                "ean": p["ean"],
                "gruppe": gruppe_von(p["nr"]),
                "haeufigkeit": 0,
                "lieferungen": 0,
                "aktiv": True,
                "quelle": "Preisliste",
            }
            katalog["artikel"].append(neu)
            alt[p["nr"]] = neu
            bericht["neu"].append((p["nr"], p["name"]))
            continue

        was = []
        if a.get("name") != p["name"]:
            was.append(f"Name: {a.get('name')} -> {p['name']}")
            a["name"] = p["name"]
        if p["einheit"] and a.get("einheit") != p["einheit"]:
            was.append(f"Einheit: {a.get('einheit')} -> {p['einheit']}")
            a["einheit"] = p["einheit"]
        if p["ean"] and a.get("ean") != p["ean"]:
            # Nur melden, nicht aufzaehlen - der EAN steht nirgends am Schirm.
            bericht["ean"] += 1
            a["ean"] = p["ean"]
        # Wer in der Preisliste steht, stammt nicht mehr nur aus Rechnungen.
        a.pop("nur_rechnung", None)
        # Ein Artikel, der wieder gelistet ist, war vielleicht ausgeblendet,
        # weil er fehlte. Die Entscheidung des Ladens hat aber Vorrang -
        # nur eine von DIESEM Werkzeug gesetzte Ausblendung wird aufgehoben.
        if a.pop("nicht_gelistet", False):
            a["aktiv"] = True
        if was:
            bericht["geaendert"].append((p["nr"], was))

    for nr, a in alt.items():
        if nr in je_nr:
            continue
        if a.get("aktiv") is False:
            continue
        # Wer schon einmal bestellt oder geliefert wurde, bleibt sichtbar,
        # auch wenn er in dieser Preisliste fehlt. Aus dem Laden kam der
        # Einwand am Beispiel Vanillezucker: 26 Verkaeufe, aber nicht
        # gelistet. Entweder hat die Muehle ihn ausgelistet - dann faellt
        # es bei der naechsten Bestellung auf und jemand entscheidet - oder
        # die Preisliste fuehrt schlicht nicht das ganze Sortiment. Ein
        # Laeufer, der stillschweigend aus dem Bestellschirm verschwindet,
        # faellt dagegen erst im leeren Regal auf.
        if (a.get("haeufigkeit") or 0) or (a.get("lieferungen") or 0):
            bericht["behalten"].append((nr, a.get("name"),
                                        a.get("haeufigkeit") or 0,
                                        a.get("lieferungen") or 0))
            continue
        a["aktiv"] = False
        a["nicht_gelistet"] = True
        bericht["ausgeblendet"].append((nr, a.get("name")))

    reihe = {gid: i for i, (gid, _) in enumerate(GRUPPEN)}

    def schluessel(a):
        nr = str(a.get("nr") or "")
        # Rein numerische Nummern numerisch sortieren, sonst stuende "9"
        # hinter "40401". (Spec drax-bestellung, F4)
        return (reihe.get(a.get("gruppe"), 99),
                0 if nr.isdigit() else 1,
                int(nr) if nr.isdigit() else 0,
                nr.lower())

    katalog["artikel"].sort(key=schluessel)
    return bericht


def schreiben(katalog):
    with io.open(JSON_ZIEL, "w", encoding="utf-8", newline="\n") as f:
        json.dump(katalog, f, ensure_ascii=False, indent=2)
        f.write("\n")
    if os.path.exists(JS_ZIEL):
        with io.open(JS_ZIEL, "w", encoding="utf-8", newline="\n") as f:
            f.write("// Erzeugt von tools/drax_katalog_aus_preisliste.py"
                    " - nicht von Hand aendern.\n")
            f.write("window.DRAX_KATALOG = ")
            json.dump(katalog, f, ensure_ascii=False, indent=2)
            f.write(";\n")


def main():
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    treffer = sorted(glob.glob(MUSTER))
    if not treffer:
        print("Keine Preisliste unter", MUSTER)
        return 1
    pfad = treffer[-1]
    liste = preisliste_lesen(pfad)
    print("Preisliste:", os.path.basename(pfad))
    print("  Artikel:", len(liste),
          "| Strichcode entschluesselt:",
          sum(1 for a in liste if a["ean"]))
    if not liste:
        print("  Nichts erkannt - Aufbau der Datei geaendert?")
        return 1

    with io.open(JSON_ZIEL, encoding="utf-8") as f:
        katalog = json.load(f)
    vorher = len(katalog["artikel"])

    b = abgleichen(katalog, liste)
    katalog["stand"] = "2026-10-06"
    katalog["quelle"] = ("Drax/Preisliste 06.10.2026 "
                         "(zuvor data (10).xlsx + Rechnung*.pdf)")

    print("\nKatalog:", vorher, "->", len(katalog["artikel"]), "Artikel")
    print("  neu aufgenommen:", len(b["neu"]))
    for nr, name in b["neu"]:
        print("     +", nr, name)
    print("  Bezeichnung oder Einheit angeglichen:", len(b["geaendert"]))
    for nr, was in b["geaendert"][:12]:
        print("     ~", nr, "|", " | ".join(was))
    if len(b["geaendert"]) > 12:
        print("     ... und", len(b["geaendert"]) - 12, "weitere")
    print("  Strichcode berichtigt:", b["ean"])
    print("  nicht mehr gelistet, ausgeblendet:", len(b["ausgeblendet"]))
    for nr, name in b["ausgeblendet"]:
        print(f"     - {nr} {name}")
    print("  nicht gelistet, aber bestellt \u2013 bleiben sichtbar:",
          len(b["behalten"]))
    for nr, name, wie_oft, lief in b["behalten"]:
        print(f"     ! {nr} {name}  (verkauft {wie_oft}, geliefert {lief})")

    if "--schreiben" in sys.argv:
        schreiben(katalog)
        print("\ngeschrieben:", JSON_ZIEL)
    else:
        print("\nNur berichtet. Zum Uebernehmen: --schreiben")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
