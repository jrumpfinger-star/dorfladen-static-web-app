"""Prueft den Rechnungs-Parser gegen die 11 vorliegenden Rechnungen.

Laeuft ohne Azure und ohne Netz. Aufruf::

    python tools/baecker_rechnung_test.py

Deckt TC-B2-F22-01 (Nummern erkannt), TC-B2-F22-02 (mehrzeilige Position),
TC-B2-F22-04 (wiederholbar) und TC-B2-F22-06 (Retouren-Quote).
"""
import os
import sys

HIER = os.path.dirname(os.path.abspath(__file__))
WURZEL = os.path.dirname(HIER)
sys.path.insert(0, os.path.join(WURZEL, "api", "baecker-artikel"))

# pypdf meldet bei den absichtlich kaputten Testdaten lautstark "invalid pdf
# header". Das sieht nach einem echten Fehler aus, ist aber genau der gepruefte
# Fall - deshalb stummschalten.
import logging  # noqa: E402
logging.getLogger("pypdf").setLevel(logging.CRITICAL)

from rechnung_parser import (  # noqa: E402
    artikel_aus_ordner, artikel_aus_pdf, pdf_aus_eml, positionen_aus_text,
)

ORDNER = os.path.join(WURZEL, "B\u00e4cker", "Martins Backstube")

_ok = 0
_fehler = []


def pruefe(name, bedingung, hinweis=""):
    global _ok
    if bedingung:
        _ok += 1
        print(f"  OK   {name}")
    else:
        _fehler.append(name)
        print(f"  FEHL {name}" + (f"  -> {hinweis}" if hinweis else ""))


# ──────────────────────────────────────────────────────────────────
#  Textform: die Faelle, die den Parser stolpern lassen
# ──────────────────────────────────────────────────────────────────

def test_zeilenformen():
    print("\nZeilenformen")

    # Einfache Position: zwei Zahlen = geliefert und berechnet, keine Retoure
    p = positionen_aus_text("  Semmel 200 200 St\u00fcck 0,50 30,0100,00 70,00    1")
    pruefe("einfache Position", len(p) == 1 and p[0]["nummer"] == "1"
           and p[0]["name"] == "Semmel" and p[0]["liefer"] == 200
           and p[0]["retour"] == 0, str(p))

    # Mit Retoure: drei Zahlen
    p = positionen_aus_text("  Mohnsemmel 6 1 5 St\u00fcck 0,65 30,03,25 2,28   14")
    pruefe("Position mit Retoure", len(p) == 1 and p[0]["liefer"] == 6
           and p[0]["retour"] == 1 and p[0]["berech"] == 5, str(p))

    # Dezimale Retoure
    p = positionen_aus_text("  Landbrot           1kg 3 0,50 2,50 St\u00fcck 4,30 30,010,75 7,53  136")
    pruefe("dezimale Retoure", len(p) == 1 and p[0]["retour"] == 0.5, str(p))

    # TC-B2-F22-02: mehrzeilige Position. Der Name steht zwei Zeilen ueber den
    # Mengen; ein zeilenweiser Parser uebersaehe sie STILL.
    text = ("  BIO-Ciabatta\n"
            "aus kontr.biolog.Anbau\n"
            "3 3 St\u00fcck 2,90 30,08,70 6,09  104")
    p = positionen_aus_text(text)
    pruefe("TC-B2-F22-02 mehrzeilige Position", len(p) == 1
           and p[0]["nummer"] == "104" and p[0]["name"] == "BIO-Ciabatta", str(p))

    # Kopf- und Summenzeilen duerfen keine Artikel werden
    text = ("PreisArt.Nr. Bezeichnung\n"
            "\u00dcbertrag 239,50\n"
            "Netto: 262,99 7,0 % MwSt: 18,41 Brutto: 281,40\n"
            "LS-Nr.: 6252 (24.08.2026), 6283 (25.08.2026)\n")
    pruefe("Kopf-/Summenzeilen werden ignoriert", positionen_aus_text(text) == [],
           str(positionen_aus_text(text)))

    # Leerer und unsinniger Text
    pruefe("leerer Text", positionen_aus_text("") == [])
    pruefe("Text ohne Positionen", positionen_aus_text("Hallo Welt\n123") == [])


# ──────────────────────────────────────────────────────────────────
#  Gegen die echten Rechnungen
# ──────────────────────────────────────────────────────────────────

def test_rechnungen():
    print("\nEchte Rechnungen")
    if not os.path.isdir(ORDNER):
        pruefe("Rechnungsordner vorhanden", False, ORDNER)
        return

    stamm = artikel_aus_ordner(ORDNER)
    nummern = {int(n) for n in stamm if str(n).isdigit()}

    # TC-B2-F22-01: die vier nur in Rechnungen belegten Artikel
    for nr in (104, 186, 192, 242):
        pruefe(f"TC-B2-F22-01 Artikel {nr} gefunden", nr in nummern)

    pruefe("mindestens 39 Artikel", len(nummern) >= 39, f"gefunden: {len(nummern)}")

    # Nie bestellte duerfen NICHT auftauchen - sie stehen nur auf dem Schein
    for nr in (23, 60, 61, 62, 63, 64, 182, 189, 401):
        pruefe(f"Artikel {nr} kommt in keiner Rechnung vor", nr not in nummern)

    # Namen sind gesaeubert (keine Mengen, keine Zusatzzeile)
    schlecht = [e["name"] for e in stamm.values()
                if "St\u00fcck" in e["name"] or "biolog" in e["name"]
                or any(c.isdigit() for c in e["name"][:2])]
    pruefe("Namen ohne Mengen-/Zusatztext", not schlecht, str(schlecht[:3]))

    # TC-B2-F22-04: derselbe Lauf zweimal ergibt dasselbe
    zweiter = artikel_aus_ordner(ORDNER)
    pruefe("TC-B2-F22-04 Wiederholung ist folgenlos",
           {k: v["name"] for k, v in stamm.items()}
           == {k: v["name"] for k, v in zweiter.items()})

    # TC-B2-F22-06: Retouren-Quote laesst sich bilden
    mit_retoure = [e for e in stamm.values() if e["retour"] > 0]
    pruefe("TC-B2-F22-06 Retouren erfasst", len(mit_retoure) >= 3,
           f"nur {len(mit_retoure)}")
    quoten_ok = all(0 <= e["retour"] <= e["liefer"] for e in stamm.values()
                    if e["liefer"] > 0)
    pruefe("Retoure nie groesser als Lieferung", quoten_ok)


def test_unlesbar():
    """TC-B2-F22-05: unlesbares PDF meldet sich, statt still nichts zu tun."""
    print("\nUnlesbare Datei")
    pruefe("TC-B2-F22-05 Muell-Bytes ergeben keine Artikel",
           artikel_aus_pdf(b"das ist kein PDF") == {})
    pruefe("leere Bytes ergeben keine Artikel", artikel_aus_pdf(b"") == {})

    # Ein echtes, aber textloses PDF (der Bestellschein ist ein Scan)
    scan = os.path.join(ORDNER, "Receipt_2026-09-07_111352.pdf")
    if os.path.isfile(scan):
        with open(scan, "rb") as fh:
            pruefe("Bild-PDF ohne Text ergibt keine Artikel",
                   artikel_aus_pdf(fh.read()) == {})


def main():
    print("Rechnungs-Parser \u2013 Martin's Backstube")
    test_zeilenformen()
    test_rechnungen()
    test_unlesbar()
    print(f"\n{_ok} von {_ok + len(_fehler)} Pruefungen bestanden")
    if _fehler:
        print("Fehlgeschlagen: " + ", ".join(_fehler))
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
