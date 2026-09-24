"""Das Getraenke-Bestellformular als Excel-Mappe.

Spec: specs/getraenke-excel/spec.md (TC-GX-01 … TC-GX-10)

Aus der Beschwerde des Lieferanten:

    „diese Uebersicht ist fuer uns sehr unguenstig. Bitte nehmen Sie
     zukuenftig unsere Bestellliste inkl. Bestell-Nr."

Bisher ging reiner Text ohne Artikelnummern. Geprueft wird deshalb vor
allem: Steht die Bestell-Nr. drin, und ist die Mappe ueberhaupt lesbar?

Die Datei wird ohne ``openpyxl`` geschrieben - eine .xlsx ist ein ZIP mit
XML darin. Gerade deshalb muss ein Waechter sie wieder aufmachen: Ein
selbstgebautes Format faellt sonst erst auf, wenn der Lieferant es nicht
oeffnen kann.

Ausfuehren:  python tools/getraenke_xlsx_test.py
"""
import os
import sys
import zipfile
import xml.etree.ElementTree as ET
from io import BytesIO

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.join(ROOT, "api", "getraenke-order"))
sys.path.insert(0, os.path.join(ROOT, "api"))

import getraenke_xlsx as X          # noqa: E402
import getraenke_store as store     # noqa: E402

NS = "{http://schemas.openxmlformats.org/spreadsheetml/2006/main}"
fehler = []


def pruefe(bedingung, text):
    print(("  OK   " if bedingung else "  FEHL ") + text)
    if not bedingung:
        fehler.append(text)


POSITIONEN = [
    {"nummer": "KA40015", "name": "Augustiner Hell", "gebinde": "20x0,50",
     "bestelltext": "Augustiner hell 0,5l", "menge": 25},
    {"nummer": "KA50071", "name": "Aho Limette PET", "gebinde": "12x0,50",
     "bestelltext": "Adelh. Limette 0,5l", "menge": 3},
    # Ohne echte Nummer - darf keinen Platzhalter zeigen.
    {"nummer": "AHO-ORANGE-SPORT", "name": "Aho Orange Sport Isotonisch PET",
     "gebinde": "12x0,50", "menge": 2},
    # Menge 0 gehoert nicht auf die Bestellung.
    {"nummer": "KA40349", "name": "Tegernseer Hell", "gebinde": "20x0,50",
     "menge": 0},
]

CFG = dict(store.DEFAULT_CONFIG)


def mappe(**kw):
    vorgabe = dict(positionen=POSITIONEN, datum_de="29.09.2026",
                   wochentag="Dienstag", kd_nr=CFG["kd_nr"],
                   tour=CFG["tour"], cfg=CFG)
    vorgabe.update(kw)
    return X.build_xlsx(**vorgabe)


def zellen(daten):
    """Das Blatt als Liste von Zeilen, jede eine Liste von Texten."""
    z = zipfile.ZipFile(BytesIO(daten))
    root = ET.fromstring(z.read("xl/worksheets/sheet1.xml"))
    raus = []
    for row in root.iter(NS + "row"):
        werte = []
        for c in row.findall(NS + "c"):
            isn = c.find(NS + "is")
            if isn is not None:
                werte.append("".join(t.text or "" for t in isn.iter(NS + "t")))
            else:
                v = c.find(NS + "v")
                werte.append(v.text if v is not None else "")
        raus.append(werte)
    return raus


print("1) Die Mappe ist eine gueltige Datei")
daten = mappe()
pruefe(isinstance(daten, bytes) and len(daten) > 1000, f"{len(daten)} Bytes")
z = zipfile.ZipFile(BytesIO(daten))
pruefe(z.testzip() is None, "ZIP ohne Fehler")
noetig = ["[Content_Types].xml", "_rels/.rels", "xl/workbook.xml",
          "xl/_rels/workbook.xml.rels", "xl/styles.xml",
          "xl/worksheets/sheet1.xml"]
fehlt = [n for n in noetig if n not in z.namelist()]
pruefe(not fehlt, f"alle Pflichtteile vorhanden{(' - fehlt: ' + str(fehlt)) if fehlt else ''}")
for n in z.namelist():
    try:
        ET.fromstring(z.read(n))
    except ET.ParseError as e:
        pruefe(False, f"{n} ist kein gueltiges XML: {e}")
pruefe(True, "jeder Teil ist lesbares XML")

print("\n2) Die Bestell-Nr. steht drin - darum ging die Beschwerde")
tab = zellen(daten)
flach = [w for zeile in tab for w in zeile]
pruefe("40015" in flach, "Nummer 40015 als eigene Zelle")
pruefe("50071" in flach, "Nummer 50071 als eigene Zelle")
kopf = [i for i, zeile in enumerate(tab) if "Art.-Nr." in zeile]
pruefe(bool(kopf), "Spaltenkopf 'Art.-Nr.' vorhanden")

print("\n3) Das Praefix KA gehoert uns, nicht dem Lieferanten")
pruefe(not any(str(w).startswith("KA") for w in flach),
       "kein KA im Blatt")
pruefe("AHO-ORANGE-SPORT" not in flach,
       "kein Platzhalter als Nummer - er saehe wie eine echte aus")

print("\n4) Die Bezeichnung ist die des Lieferanten")
# Auf seinem Formular steht „Augustiner Hell 20x0,50" - Name + Gebinde.
pruefe("Augustiner Hell 20x0,50" in flach,
       "Schreibweise des Lieferanten, nicht unser Bestelltext")
pruefe("Augustiner hell 0,5l 20x0,50" not in flach,
       "das Gebinde steht nicht doppelt drin")

print("\n5) Nur Bestelltes steht auf der Liste")
pruefe(not any("Tegernseer" in str(w) for w in flach),
       "Menge 0 faellt weg")

print("\n6) Der Kopf sagt, von wem die Bestellung kommt")
# Gemeldet: „bau auch einen sinnvollen Header, so dass der Kunde weiss,
# von wem die Bestellung stammt."
for erwartet in ("Dorfladen Oberornau UG", "Dorfplatz 1",
                 "84419 Obertaufkirchen", "01578-5234667"):
    pruefe(erwartet in flach, f"Absender: {erwartet}")
pruefe(str(CFG["kd_nr"]) in flach, f"Kd.-Nr. {CFG['kd_nr']}")
pruefe("Getr\u00e4nke Kratzer" in flach or CFG["name"] in flach,
       "Empfaenger genannt")
pruefe(CFG["lieferant_fax"] in flach, "Fax des Lieferanten")
pruefe(any("Dienstag" in str(w) and "29.09.2026" in str(w) for w in flach),
       "Liefertag im Kopf")

print("\n7) Die Summe stimmt")
pruefe("Summe Kisten" in flach, "Summenzeile vorhanden")
# 25 + 3 + 2 = 30; die Null zaehlt nicht mit.
pruefe("30" in flach, "Summe 30 Kisten")

print("\n8) Korrektur ist als solche erkennbar")
k = zellen(mappe(korrektur=True))
pruefe(any("Korrektur" in str(w) for zeile in k for w in zeile),
       "Titel nennt die Korrektur")

print("\n9) Ein Hinweis des Ladens kommt mit")
h = zellen(mappe(notiz="Bitte Leergut mitnehmen."))
flach_h = [w for zeile in h for w in zeile]
pruefe("Bitte Leergut mitnehmen." in flach_h, "Hinweis im Blatt")

print("\n10) Randfaelle stuerzen nicht ab")
leer = X.build_xlsx([], "29.09.2026", "Dienstag")
pruefe(len(leer) > 500, "leere Bestellung erzeugt trotzdem eine Mappe")
pruefe(zipfile.ZipFile(BytesIO(leer)).testzip() is None, "und sie ist gueltig")
heikel = X.build_xlsx(
    [{"nummer": "KA1", "name": 'Zeichen & "Sonder" <Test>', "menge": 1}],
    "29.09.2026", "Dienstag")
tabh = [w for zeile in zellen(heikel) for w in zeile]
pruefe('Zeichen & "Sonder" <Test>' in tabh,
       "spitze Klammern und Anfuehrungszeichen ueberstehen das XML")

print("\n11) Der Dateiname nennt Tag und Art")
pruefe(X.dateiname("2026-09-29") == "Bestellung-Dorfladen-Oberornau-2026-09-29.xlsx",
       X.dateiname("2026-09-29"))
pruefe(X.dateiname("2026-09-29", True).startswith("Korrektur"),
       X.dateiname("2026-09-29", True))

print("\n12) Zelltypen: Mengen rechenbar, Nummern als Text")
# Die Menge muss eine ZAHL sein, sonst laesst sich in Excel nichts
# summieren. Die Artikelnummer bleibt Text - sonst fielen fuehrende
# Nullen weg, und Kratzer sucht eine Nummer, die es so nicht gibt.
z = zipfile.ZipFile(BytesIO(daten))
blatt = z.read("xl/worksheets/sheet1.xml").decode("utf-8")
root = ET.fromstring(blatt)
zahl, text = [], []
for row in root.iter(NS + "row"):
    for c in row.findall(NS + "c"):
        if c.get("t") == "inlineStr":
            wert = "".join(t.text or "" for t in c.iter(NS + "t"))
            text.append(wert)
        elif c.find(NS + "v") is not None:
            zahl.append(c.find(NS + "v").text)
pruefe("25" in zahl, f"Menge 25 als Zahl (Zahlen: {zahl})")
pruefe("30" in zahl, "Summe als Zahl")
pruefe("40015" in text, "Artikelnummer als Text - fuehrende Nullen blieben so erhalten")
pruefe("40015" not in zahl, "und nicht als Zahl")


# ══════════════════════════════════════════════════════════════════════
# 13) Der Kopf: kompakt und nicht fixiert
#
# Aus dem Laden: „Der Header der Excelliste verbraucht zu viele Spalten
# (16). Bitte Daten horizontal verteilen. Ausserdem sollte der Header der
# Liste nicht fixiert sein."
#
# Gemeint waren die sechzehn ZEILEN, die der Kopf untereinander belegte -
# die Artikelliste begann erst in Zeile 16, und genau diese sechzehn
# Zeilen blieben beim Rollen stehen.
# (Spec specs/getraenke-excel-kopf/spec.md)
# ══════════════════════════════════════════════════════════════════════
print("\n13) Kopf kompakt und nicht fixiert")

daten13 = mappe()
tab13 = zellen(daten13)

kopfzeile = next(i for i, z in enumerate(tab13) if "Art.-Nr." in z)
# Vorher stand der Spaltenkopf in Zeile 16 (Index 15).
pruefe(kopfzeile <= 10,
       f"die Artikelliste beginnt in Zeile {kopfzeile + 1} (vorher 16)")

# Horizontal verteilt heisst: im Kopf stehen Angaben auch rechts der
# Bezeichnungsspalte, nicht alles untereinander in A und B.
kopfbereich = tab13[:kopfzeile]
rechts = [z[3:] for z in kopfbereich if len(z) > 3]
gefuellt = [w for z in rechts for w in z if str(w).strip()]
pruefe(len(gefuellt) >= 4,
       f"der Kopf nutzt auch die rechten Spalten ({len(gefuellt)} Angaben)")

# Der Liefertag ist die wichtigste Angabe - er steht ganz oben.
pruefe(any("29.09.2026" in str(w) for w in tab13[0]),
       "der Liefertag steht in der ersten Zeile")

# Und nichts ist eingefroren.
with zipfile.ZipFile(BytesIO(daten13)) as z13:
    blatt = z13.read("xl/worksheets/sheet1.xml").decode("utf-8")
pruefe("state=\"frozen\"" not in blatt, "kein eingefrorener Bereich")
pruefe("<pane " not in blatt, "und gar keine Fensterteilung")

# Trotz Umbau muss jede Kopfangabe erhalten geblieben sein.
flach13 = [str(w) for z in tab13 for w in z]
for erwartet in (CFG["lieferant_fax"], str(CFG["kd_nr"]),
                 CFG["absender_telefon"], CFG["absender_strasse"]):
    pruefe(erwartet in flach13, f"Kopfangabe erhalten: {erwartet}")


print()
if fehler:
    print(f"{len(fehler)} Pruefung(en) fehlgeschlagen.")
    raise SystemExit(1)
print("Alle Pruefungen bestanden.")
