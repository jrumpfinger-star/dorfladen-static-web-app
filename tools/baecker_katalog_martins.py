"""Erzeugt den Startkatalog fuer Martin's Backstube.

Quellen:
  * der ausgefuellte Bestellschein vom 12.06.2026 (gedruckte Artikel, abgelesen)
  * die 11 Rechnungen aus ``Baecker/Martins Backstube`` (maschinell gelesen)

Artikel, die auf dem Schein stehen, aber in keiner Rechnung vorkommen, werden
als ``aktiv: false`` angelegt: Sie wurden nachweislich nie bestellt und wuerden
die taegliche Erfassung nur verstopfen. Ueber "Alle Artikel" bleiben sie
erreichbar.

Aufruf:
    python tools/baecker_katalog_martins.py

Schreibt ``api/baecker-order/vorlage/katalog-martins.json``.
"""
import io
import json
import os
import sys

HIER = os.path.dirname(os.path.abspath(__file__))
WURZEL = os.path.dirname(HIER)
sys.path.insert(0, os.path.join(WURZEL, "api", "baecker-artikel"))

from rechnung_parser import artikel_aus_ordner  # noqa: E402

RECHNUNGEN = os.path.join(WURZEL, "B\u00e4cker", "Martins Backstube")
ZIEL = os.path.join(WURZEL, "api", "baecker-order", "vorlage", "katalog-martins.json")

# Gedruckte Artikel des Bestellscheins, in Formularreihenfolge abgelesen.
# Die Namen folgen dem Schein; wo die Rechnung ausfuehrlicher ist, gewinnt sie
# spaeter (der Rechnungs-Import haelt den Stamm aktuell).
SCHEIN = [
    (1, "Semmel"),
    (3, "Doppelte"),
    (4, "Spitzerl"),
    (6, "BIO-Mini-Ciabatta"),
    (8, "Knackies"),
    (12, "Roggensemmel m. K\u00fcmmel"),
    (13, "Roggensemmel oh. K\u00fcmmel"),
    (14, "Mohnsemmel"),
    (15, "Sesamsemmel"),
    (20, "Buttermilchdinkelweckerl"),
    (23, "Gew\u00fcrzstangerl"),
    (27, "Bio-Dinkel-K\u00e4se-K\u00fcrbiskern"),
    (29, "Bio-Dinkelkr\u00fcstchen"),
    (40, "Bio-Kornstangerl"),
    (41, "Bio-Mehrkornsemmel"),
    (47, "Bio-K\u00fcrbiskern-Semmel"),
    (60, "Brezen"),
    (61, "BIO-Brezensemmel"),
    (62, "Brezenz\u00f6pferl"),
    (63, "Bio-Vollkornbrezen"),
    (64, "Laugenstangerl m. K\u00e4se"),
    (71, "Bio-K\u00fcrbiskern-Ring"),
    (74, "S\u00fc\u00dfkartoffelsemmel"),
    (101, "Kastenwei\u00dfbrot"),
    (127, "BIO-Tagwerk-Brot 500 g"),
    (130, "Helles Mischbrot 500 g"),
    (131, "Helles Mischbrot 1 kg"),
    (134, "Franken Laib 1 kg"),
    (135, "Steinmetzbrot 1 kg"),
    (136, "Landbrot 1 kg"),
    (137, "Landbrot gew\u00fcrzt"),
    (138, "Buttermilchbrot 1 kg"),
    (140, "BIO-Sauerteigweckerl 500 g"),
    (141, "BIO-Weltmeister-Brot 750 g"),
    (146, "BIO-Vollkorn Sonne 500 g"),
    (151, "BIO-Mehrkornbrot 500 g"),
    (154, "BIO-Krustenbrot 500 g"),
    (162, "BIO-Roggenvollkorn 100 % 500 g"),
    (182, "BIO-Schrot & Saat"),
    (189, "BIO-Olivenbrot 500 g"),
    (208, "Landbrot 500 g"),
    (238, "Bio-Dinkel-Ernte"),
    (240, "Dorfener Naturlaib-BIO"),
    (401, "Nu\u00dfh\u00f6rnchen"),
]

# Lesbare Namen fuer Artikel, die nur in Rechnungen vorkommen. Die
# Rechnungsschreibweise ist dort haeufig zusammengequetscht
# ("BIOVollkorn-Nuss-Brot500g"), weil die Spaltenbreite begrenzt ist.
NUR_RECHNUNG = {
    104: "BIO-Ciabatta",
    186: "BIO-Vollkorn-Nu\u00df-Brot 500 g",
    192: "Bio-Brot des Monats",
    242: "Bio Bergbauern 500 g",
}


def main():
    aus_rechnung = artikel_aus_ordner(RECHNUNGEN)
    if not aus_rechnung:
        print("FEHLER: keine Rechnungen gelesen \u2013 Pfad pruefen:", RECHNUNGEN)
        return 1

    # Der Parser liefert die Nummern als Zeichenkette, der Schein als Zahl.
    # Ohne Angleichung waere die Schnittmenge still leer und JEDER Artikel
    # landete auf "ausgeblendet".
    bestellt = {int(n) for n in aus_rechnung if str(n).isdigit()}
    if len(bestellt) < 20:
        print(f"FEHLER: nur {len(bestellt)} Artikel aus den Rechnungen gelesen \u2013 "
              "erwartet werden rund 39. Parser pruefen.")
        return 1
    schein_nummern = {nr for nr, _ in SCHEIN}

    artikel = []
    for nr, name in SCHEIN:
        artikel.append({
            "nummer": str(nr),
            "name": name,
            # Nie bestellt -> ausgeblendet. Nachweis: 11 Rechnungen ueber
            # rund vier Monate ohne einen einzigen Posten.
            "aktiv": nr in bestellt,
        })
    for nr, name in sorted(NUR_RECHNUNG.items()):
        if nr in schein_nummern:
            continue
        artikel.append({"nummer": str(nr), "name": name, "aktiv": True})

    artikel.sort(key=lambda a: int(a["nummer"]))

    aus = {
        "baeckerei": "martins",
        "quelle": "Bestellschein 12.06.2026 + 11 Rechnungen (Mai\u2013Aug 2026)",
        "artikel": artikel,
    }
    os.makedirs(os.path.dirname(ZIEL), exist_ok=True)
    with io.open(ZIEL, "w", encoding="utf-8", newline="\n") as fh:
        json.dump(aus, fh, ensure_ascii=False, indent=2)
        fh.write("\n")

    inaktiv = [a["nummer"] for a in artikel if not a["aktiv"]]
    print(f"geschrieben: {ZIEL}")
    print(f"  Artikel gesamt   : {len(artikel)}")
    print(f"  davon aktiv      : {len(artikel) - len(inaktiv)}")
    print(f"  ausgeblendet ({len(inaktiv)}): {', '.join(inaktiv)}")
    print(f"  nur aus Rechnung : {', '.join(str(n) for n in sorted(NUR_RECHNUNG))}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
