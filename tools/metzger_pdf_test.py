"""Prueft die beiden Fehler im gedruckten Metzger-Formular.

    python tools/metzger_pdf_test.py
"""
import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "api", "metzger-order"))

import metzger_portionen as P          # noqa: E402
import metzger_pdf as PDF              # noqa: E402


def block(anzahl, menge, einheit, vak=False):
    return {"anzahl": anzahl, "menge": menge, "einheit": einheit, "vakuum": vak}


fehler = 0


def pruefe(name, bedingung, hinweis=""):
    global fehler
    if bedingung:
        print(f"  ok   {name}")
    else:
        fehler += 1
        print(f"  FEHL {name} {hinweis}")


print("Vakuum kurz (V) statt (vakuumiert)")
pos = P.normalisiere_position({
    "nummer": 121, "name": "Rouladen",
    "portionen": [block(1, 2, "kg", True), block(1, 4, "St", True)],
})
lang = P.position_text(pos)
kurz = P.position_text(pos, kurz_vakuum=True)
pruefe("Mail schreibt es aus", "(vakuumiert)" in lang, lang)
pruefe("Druck kuerzt auf V", kurz == "1 \u00d7 2 kg V, 1 \u00d7 4 St V", kurz)

print("\nKeine Position geht verloren")
# Sieben Groessen - frueher schnitt die Spalte nach 70 Zeichen ab.
viele = P.normalisiere_position({
    "nummer": 121, "name": "Rouladen",
    "portionen": [
        block(1, 2, "kg", True), block(1, 4, "St", True),
        block(1, 2, "St", True), block(2, 2, "kg", True),
        block(2, 5, "kg", True), block(3, 250, "g", True),
        block(4, 750, "g", True),
    ],
})
text = P.position_text(viele, kurz_vakuum=True)
pruefe("Text enthaelt alle sieben Bloecke", text.count("\u00d7") == 7, text)

artikel = [{"nummer": 121, "name": "Rouladen", "auf_formular": True},
           {"nummer": 109, "name": "Braten Rind", "auf_formular": True}]
roh = [{"nummer": 121, "name": "Rouladen",
        "portionen": [dict(b) for b in viele["portionen"]]}]
daten = PDF.build_pdf(artikel, roh, "2026-09-10", kd_nr="87")
pruefe("PDF entsteht", isinstance(daten, bytes) and len(daten) > 800, len(daten))

print("\nUmbruch statt Abschneiden")


class Messhilfe:
    """Nur die Breitenmessung, ohne echtes PDF."""
    def get_string_width(self, s):
        return len(s) * 1.6


zeilen = PDF._umbrechen(Messhilfe(), text, 60)
pruefe("mehrere Zeilen", len(zeilen) > 1, len(zeilen))
pruefe("nichts verloren", " ".join(zeilen).split() == text.split(),
       " ".join(zeilen))

print("\nDer letzte Block steht wirklich im PDF")
# Ohne Kompression laesst sich im Dateiinhalt nachsehen. Frueher schnitt die
# Spalte nach 70 Zeichen ab - der letzte Block fehlte dort.
pdf = PDF.Formular("Pruefung")
pdf.compress = False
pdf.alias_nb_pages()
pdf.add_page()
PDF._zeile(pdf, 121, "Rouladen", viele)
roh_pdf = pdf.output(dest="S")
inhalt = roh_pdf if isinstance(roh_pdf, str) else roh_pdf.decode("latin-1")
pruefe("erster Block enthalten", "2 kg V" in inhalt)
# Der Umbruch kann mitten in einem Block liegen; gesucht wird deshalb der
# Wert, der frueher hinter der 70-Zeichen-Grenze verschwand.
pruefe("letzter Block enthalten", "750" in inhalt,
       "im PDF fehlt der letzte Block")
pruefe("alle sieben Bloecke gesetzt", inhalt.count(" V") >= 7,
       inhalt.count(" V"))

print()
if fehler:
    print(f"{fehler} Pruefung(en) fehlgeschlagen.")
    sys.exit(1)
print("Alle Pruefungen bestanden.")
