"""Baut den Metzger-Artikelkatalog fuer den Kiosk.

Grundlage sind zwei Quellen:

* das handschriftliche Bestellformular (``Metzger Mair/Document_*.pdf``) - es
  liefert **Bezeichnung und Reihenfolge**, so wie die Verkaeuferinnen sie
  kennen. Die Reihenfolge bleibt unveraendert, damit der gewohnte Blick erhalten
  bleibt.
* die Rechnungen - sie liefern **Artikelnummer, offizielle Bezeichnung und
  Preis** (siehe ``metzger_rechnung_extract.py``).

Die Zuordnung Formularzeile -> Metzger-Artikelnummer steht unten in ``ZUORDNUNG``
und ist von Hand geprueft. Zeilen ohne Eintrag bleiben bewusst offen; sie sind im
Kiosk normal bestellbar, tragen aber keine Nummer und keinen Preis.

Rechnungsartikel, die auf dem Formular fehlen, werden hinten angehaengt und sind
**inaktiv** vorbelegt - erreichbar ueber ``Alle Artikel``.

Aufruf::

    python tools/metzger_rechnung_extract.py
    python tools/metzger_formular_katalog.py
"""
import json
import os

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
VORLAGE = os.path.join(ROOT, "api", "metzger-order", "vorlage")
QUELLE = os.path.join(VORLAGE, "rechnungsartikel.json")
ZIEL = os.path.join(VORLAGE, "katalog.json")

# Warengruppen des Formulars - reine Lesehilfe im Kiosk, sie erscheinen nicht
# im Dokument an den Metzger.
GRUPPEN = [
    ("Fleisch frisch", 0),
    ("Brät & Leberkäse", 13),
    ("Schinken & Speck", 18),
    ("Salami", 27),
    ("Würste frisch", 34),
    ("Aufschnitt & Wurstwaren", 42),
    ("Beilagen", 72),
    ("Verpackung & Sonstiges", 81),
]

# Formularzeilen in der Reihenfolge des Papiers.
# (Bezeichnung, Metzger-Artikelnummer oder None)
ZUORDNUNG = [
    ("Lende Schwein", 2),
    ("Oberschalenschnitzel", None),
    ("Wammerl o. Kno.", 12),
    ("Halsgrat o. Knochen", 15),
    ("Wammerl geräuchert", 70),
    ("Putenschnitzel", 360),
    ("Hähnchenbrust", 367),
    ("Lende Rind", None),
    ("Braten Rind", 109),
    ("Rouladen", 121),
    ("Tafelspitz", None),
    ("Hackfleisch Rind", None),
    ("Hackfleisch gemischt", 142),
    ("Leberkäse z. selberbacken", 402),
    ("Milzwurst", 407),
    ("Lüngerl küchenfertig", None),
    ("Blutwürste", None),
    ("Leberwürste", None),
    ("Putenschinken", 373),
    ("Hinterschinken", 500),
    ("Gebratener Schinken", 501),
    ("Schwarzgeräuchertes Stück", 505),
    ("Gewürzlende", 532),
    ("Gewürzwammerl", 518),
    ("Farmerschinken", 537),
    ("Wacholderschinken", None),
    ("Lachsschinken", None),
    ("Kantsalami", None),
    ("Hausmachersalami", 557),
    ("hausgem. Salami ital. Art", 560),
    ("Rindersalami", 574),
    ("Salami mit Zwiebelrand/Käserand", None),
    ("Sportsalami", 565),
    ("Mailänder (scharf)", None),
    ("Debreziner", 585),
    ("Polnische", 586),
    ("Landjäger", 588),
    ("Weißwurst", 600),
    ("Wollwürste", 602),
    ("Schweinswürstl", 605),
    ("Rindsbratwürste", None),
    ("Kalbsbratwürste", None),
    ("Currywurst", 613),
    ("Lyoner", 615),
    ("Dicke", 616),
    ("Regensburger", 617),
    ("Wiener", 620),
    ("Fleischkäs altbayrisch", None),
    ("Leberkäse", 640),
    ("Kalbskäs", 641),
    ("Fleischwurst", 658),
    ("Gelbwurst", 660),
    ("Schweinebauch gefüllt", 669),
    ("Göttinger", None),
    ("Kochsalami im Stück", 694),
    ("Kochsalami mit Käse", None),
    ("Knoblauchstangerl", 914),
    ("Mettwurst", 744),
    ("Streichwurst geräuchert", None),
    ("Leberwurst gold", 718),
    ("Leberwurst grob", 719),
    ("Pfälzer Leberwurst", None),
    ("Eierpastete", 723),
    ("Pressack schwarz", 726),
    ("Bauernpressack", 727),
    ("Berliner Zungenwurst", None),
    ("Putenschinkenwurst", None),
    ("Schinkenwurst", 761),
    ("Paprikawurst", 764),
    ("Paprikaschinkenwurst", None),
    ("Champignonschinkenwurst", 763),
    ("Tiroler", None),
    ("Sauerkraut fertig gekocht", 917),
    ("Bratensoße", 919),
    ("Gulaschsuppe", 924),
    ("Käsegriller klein", None),
    ("Käseknacker", 628),
    ("Rauchsalami", 592),
    ("Pfeffersalami", 564),
    ("Paprikasalami", 556),
    ("Bratensülz Schalen", 1008),
    ("Papier 28x27 / 18,5x24,5 / groß", None),
    ("Tüten 30x20", None),
    ("Gewürze", None),
]

# Vakuumbeutel werden vom Metzger stueckweise berechnet. Sie entstehen im Kiosk
# automatisch aus den Portionsbloecken und sind deshalb keine Bestellzeile.
BEUTEL = {980: "klein", 981: "mittel", 982: "groß"}


def gruppe_fuer(index):
    name = GRUPPEN[0][0]
    for g, ab in GRUPPEN:
        if index >= ab:
            name = g
    return name


def main():
    with open(QUELLE, encoding="utf-8") as fh:
        rechnung = {a["nummer"]: a for a in json.load(fh)["artikel"]}

    artikel = []
    benutzt = set()
    for i, (name, nr) in enumerate(ZUORDNUNG):
        quelle = rechnung.get(nr) if nr else None
        if quelle:
            benutzt.add(nr)
        artikel.append({
            "name": name,
            "nummer": nr,
            "metzger_name": quelle["name"] if quelle else None,
            "preis": quelle["preis"] if quelle else None,
            "einheit": quelle["einheit"] if quelle else "kg",
            "gruppe": gruppe_fuer(i),
            "aktiv": True,
            "auf_formular": True,
        })

    # Rechnungsartikel ohne Formularzeile: hinten anhaengen, inaktiv.
    for nr in sorted(rechnung):
        if nr in benutzt or nr in BEUTEL:
            continue
        a = rechnung[nr]
        artikel.append({
            "name": a["name"],
            "nummer": nr,
            "metzger_name": a["name"],
            "preis": a["preis"],
            "einheit": a["einheit"],
            "gruppe": "Nicht auf dem Formular",
            "aktiv": False,
            "auf_formular": False,
        })

    beutel = [{
        "nummer": nr,
        "groesse": BEUTEL[nr],
        "preis": rechnung[nr]["preis"] if nr in rechnung else None,
    } for nr in sorted(BEUTEL)]

    with open(ZIEL, "w", encoding="utf-8") as fh:
        json.dump({"artikel": artikel, "vakuumbeutel": beutel}, fh,
                  ensure_ascii=False, indent=2)

    formular = [a for a in artikel if a["auf_formular"]]
    zugeordnet = [a for a in formular if a["nummer"]]
    print(f"Formularzeilen: {len(formular)}   davon zugeordnet: {len(zugeordnet)}"
          f"   offen: {len(formular) - len(zugeordnet)}")
    print(f"Zusaetzlich aus Rechnungen: {len(artikel) - len(formular)} (inaktiv)")
    print("->", ZIEL)
    print()
    print("Offene Zuordnungen (im Kiosk ohne Nummer und Preis):")
    for a in formular:
        if not a["nummer"]:
            print("  -", a["name"])


if __name__ == "__main__":
    main()
