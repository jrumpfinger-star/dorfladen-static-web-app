"""Erzeugt eine Musterdatei des neuen Getraenke-Bestellformulars (.xlsx).

Aus dem Laden: „erstelle eine Mockup Datei."

Hintergrund ist die Beschwerde des Lieferanten:

    „diese Uebersicht ist fuer uns sehr unguenstig. Bitte nehmen Sie
     zukuenftig unsere Bestellliste inkl. Bestell-Nr."

Bisher ging reiner Text ohne Artikelnummern. Die Musterdatei zeigt, wie die
Bestellung kuenftig aussieht - mit echten Kratzer-Nummern aus dem Formular,
das der Lieferant selbst geschickt hat.

Aufruf:
    python tools/getraenke_mockup_xlsx.py
    python tools/getraenke_mockup_xlsx.py --ziel Getraenke/Muster.xlsx
"""
import argparse
import json
import os
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.join(ROOT, "api", "getraenke-order"))
sys.path.insert(0, os.path.join(ROOT, "api"))

import getraenke_xlsx as X          # noqa: E402
import getraenke_store as store     # noqa: E402

VORGABE = os.path.join(ROOT, "Getr\u00e4nke",
                       "Muster-Bestellformular-Kratzer.xlsx")

# Eine Bestellung, wie sie im Laden entsteht: ein paar uebliche Artikel in
# ganzen Kisten. Die Mengen stammen aus dem Feld `ueblich` des Katalogs -
# so wirkt das Muster wie eine echte Woche, nicht wie erfundene Zahlen.
WIE_VIELE = 9


def katalog():
    pfad = os.path.join(ROOT, "api", "getraenke-order", "vorlage",
                        "katalog.json")
    with open(pfad, encoding="utf-8") as fh:
        return json.load(fh)["artikel"]


def muster_positionen():
    aus = []
    for a in katalog():
        menge = int(a.get("ueblich") or 0)
        if menge <= 0:
            continue
        aus.append({
            "nummer": a.get("nummer"),
            "name": a.get("name"),
            "bestelltext": a.get("bestelltext"),
            "gebinde": a.get("gebinde"),
            "gruppe": a.get("gruppe"),
            "menge": menge,
        })
        if len(aus) >= WIE_VIELE:
            break
    # Nach Artikelnummer, wie die Liste des Lieferanten.
    aus.sort(key=lambda p: X._nummer_kurz(p["nummer"]) or "zzz")
    return aus


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--ziel", default=VORGABE)
    args = ap.parse_args()

    pos = muster_positionen()
    cfg = dict(store.DEFAULT_CONFIG)
    daten = X.build_xlsx(
        pos,
        datum_de="29.09.2026",
        wochentag="Dienstag",
        kd_nr=cfg.get("kd_nr", ""),
        tour=cfg.get("tour", ""),
        notiz="Bitte die Leergutkisten wie besprochen mitnehmen.",
        erstellt="24.09.2026 14:30",
        cfg=cfg,
    )
    os.makedirs(os.path.dirname(args.ziel), exist_ok=True)
    with open(args.ziel, "wb") as fh:
        fh.write(daten)

    ohne = [p for p in pos if not X._nummer_kurz(p["nummer"])]
    print(f"geschrieben: {args.ziel}  ({len(daten)} Bytes)")
    print(f"{len(pos)} Positionen, davon {len(ohne)} ohne Artikelnummer")
    for p in pos:
        nr = X._nummer_kurz(p["nummer"]) or "(keine)"
        print(f"   {nr:<8} {p['menge']:>3}  {p.get('bestelltext') or p['name']}")
    if ohne:
        print("\nAchtung - diese Artikel haben keine Kratzer-Nummer:")
        for p in ohne:
            print(f"   {p.get('name')} {p.get('gebinde')}")


if __name__ == "__main__":
    main()
