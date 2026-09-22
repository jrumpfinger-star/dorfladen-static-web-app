"""Startwerte fuer die Baeckerei Freundl aus den alten Bestellzetteln.

Anlass aus dem Laden: „Bei Freundl Baecker werden keine historischen Daten
angezeigt, bzw. keine Tageswerte vorgeblendet."

Die Vorbelegung im Kiosk stammt sonst aus der letzten **gesendeten**
Bestellung desselben Wochentags. Im System liegt davon bislang nur eine
einzige (Freitag, 18.09.). Fuer Mittwoch, Donnerstag und Samstag gab es
deshalb nichts vorzublenden — alle Mengen standen auf 0.

Im Ordner ``Baecker/Freundl`` liegen aber 19 alte Bestellzettel als
Word-Anhang in den versendeten Mails. Anders als bei Martin's Backstube
(dort gibt es nur Rechnungen, die je eine ganze Woche zusammenfassen)
tragen diese Zettel ein **Datum** — daraus laesst sich der Wochentag
bestimmen und eine **wochentaggenaue** Vorlage gewinnen. Genau das macht
dieses Werkzeug.

ENTSCHEIDUNGEN, die hier getroffen wurden:

* **Median statt Durchschnitt.** Ein einzelner Feiertag oder ein Fest
  wuerde den Durchschnitt nach oben ziehen und dauerhaft zu grosse
  Bestellungen vorschlagen. Der Median bleibt davon unberuehrt.

* **Median ueber ALLE Zettel des Wochentags, auch die mit 0.** Ein Artikel,
  der nur einmal von acht Malen bestellt wurde, soll nicht vorbelegt
  werden — sein Median ist dann 0, und das ist richtig.

* **Grundlage ist die Bestellmenge.** Das Feld „Retouren Menge" ist in
  allen 19 Zetteln durchgehend leer (nachgemessen: 0 von 1660 Stueck).
  Eine Rechnung „geliefert minus Retoure" wie bei Martins ginge hier
  mangels Daten ins Leere.

* **Das Datum kommt aus dem Dokument, nicht aus dem Dateinamen.** Zwei
  Dateinamen weichen nachweislich ab („Bestellung fuer 20.9.26" enthaelt
  den 20.08., „...7.8.26" den 06.08.).

Aufruf:
    python tools/baecker_startwerte_freundl.py              nur anzeigen
    python tools/baecker_startwerte_freundl.py --schreiben  Datei erzeugen
"""
import argparse
import email
import glob
import io
import json
import os
import re
import statistics
import sys
import zipfile
from collections import defaultdict
from datetime import datetime
from email import policy
from xml.etree import ElementTree as ET

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ORDNER = os.path.join(ROOT, "B\u00e4cker", "Freundl")
ZIEL = os.path.join(ROOT, "api", "baecker-order", "vorlage", "startwerte-freundl.json")

W = "{http://schemas.openxmlformats.org/wordprocessingml/2006/main}"
TAGE = ["Montag", "Dienstag", "Mittwoch", "Donnerstag", "Freitag", "Samstag", "Sonntag"]
DATUM = re.compile(r"Datum:\s*(\d{1,2})\.(\d{1,2})\.(\d{2,4})")


def zelle(tc):
    return " ".join("".join(t.text or "" for t in tc.iter(W + "t")).split())


def dokument_lesen(rohdaten):
    """Kopftext und Tabellenzeilen eines .docx."""
    with zipfile.ZipFile(io.BytesIO(rohdaten)) as z:
        wurzel = ET.fromstring(z.read("word/document.xml"))
    koerper = wurzel.find(W + "body")
    text = " ".join("".join(t.text or "" for t in p.iter(W + "t"))
                    for p in koerper.iter(W + "p"))
    zeilen = []
    for tbl in koerper.iter(W + "tbl"):
        for tr in tbl.findall(W + "tr"):
            tcs = tr.findall(W + "tc")
            if len(tcs) >= 4:
                zeilen.append(tuple(zelle(t) for t in tcs[:4]))
    return text, zeilen


def anhang(pfad):
    """Der Word-Anhang einer Bestellmail, sonst None (Rechnungen tragen PDF)."""
    with open(pfad, "rb") as fh:
        msg = email.message_from_binary_file(fh, policy=policy.default)
    for teil in msg.walk():
        if (teil.get_filename() or "").lower().endswith(".docx"):
            return teil.get_payload(decode=True)
    return None


def zahl(s):
    s = (s or "").strip()
    return int(s) if s.isdigit() else 0


def zettel_einlesen():
    """Alle Bestellzettel als Liste (datum, {schluessel: menge}, {schluessel: name})."""
    raus = []
    namen = {}
    for pfad in sorted(glob.glob(os.path.join(ORDNER, "*.eml"))):
        rohdaten = anhang(pfad)
        if not rohdaten:
            continue                      # Rechnung, kein Bestellzettel
        try:
            text, zeilen = dokument_lesen(rohdaten)
        except Exception as e:
            print(f"  ! {os.path.basename(pfad)}: nicht lesbar ({e})")
            continue
        treffer = DATUM.search(text)
        if not treffer:
            print(f"  ! {os.path.basename(pfad)}: kein Datum im Kopf – uebersprungen")
            continue
        tag, monat, jahr = (int(treffer.group(1)), int(treffer.group(2)),
                            int(treffer.group(3)))
        if jahr < 100:
            jahr += 2000
        try:
            datum = datetime(jahr, monat, tag).date()
        except ValueError:
            print(f"  ! {os.path.basename(pfad)}: ungueltiges Datum – uebersprungen")
            continue
        mengen = {}
        for nr, name, menge, _retoure in zeilen:
            if not name or name.lower().startswith("artikelbez"):
                continue
            schluessel = (nr or "").strip() or name.strip().lower()
            if not schluessel:
                continue
            namen[schluessel] = name.strip()
            mengen[schluessel] = zahl(menge)
        if mengen:
            raus.append((datum, mengen, os.path.basename(pfad)))
    return raus, namen


def startwerte_bilden(zettel, namen):
    """Median je Wochentag und Artikel."""
    je_tag = defaultdict(lambda: defaultdict(list))
    quellen = defaultdict(list)
    for datum, mengen, datei in zettel:
        wd = datum.weekday()
        quellen[wd].append(datum.isoformat())
        # Alle Artikel des Zettels erfassen — auch die mit 0, sonst
        # verschiebt sich der Median nach oben.
        for schluessel, menge in mengen.items():
            je_tag[wd][schluessel].append(menge)

    ergebnis = {}
    for wd, artikel in sorted(je_tag.items()):
        zahl_zettel = len(quellen[wd])
        liste = []
        for schluessel, werte in artikel.items():
            # Fehlt ein Artikel auf einem Zettel ganz, zaehlt das als 0:
            # Er stand zur Auswahl und wurde nicht bestellt.
            voll = werte + [0] * (zahl_zettel - len(werte))
            med = int(round(statistics.median(voll)))
            if med <= 0:
                continue
            liste.append({
                "nummer": schluessel if schluessel.isdigit() else "",
                "name": namen.get(schluessel, schluessel),
                "menge": med,
                "aus": len(werte),
            })
        liste.sort(key=lambda a: (int(a["nummer"]) if a["nummer"].isdigit() else 9999,
                                  a["name"]))
        ergebnis[str(wd)] = {
            "wochentag": TAGE[wd],
            "zettel": zahl_zettel,
            "quellen": sorted(quellen[wd], reverse=True),
            "artikel": liste,
        }
    return ergebnis


def main():
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument("--schreiben", action="store_true",
                   help="Datei erzeugen statt nur anzeigen")
    args = p.parse_args()

    if not os.path.isdir(ORDNER):
        print(f"Ordner nicht gefunden: {ORDNER}")
        return 1

    zettel, namen = zettel_einlesen()
    if not zettel:
        print("Keine Bestellzettel gefunden.")
        return 1
    print(f"{len(zettel)} Bestellzettel gelesen.\n")

    werte = startwerte_bilden(zettel, namen)
    for wd in sorted(werte, key=int):
        e = werte[wd]
        print(f"=== {e['wochentag']} ({e['zettel']} Zettel: "
              f"{', '.join(e['quellen'][:4])}{' …' if len(e['quellen']) > 4 else ''}) ===")
        summe = sum(a["menge"] for a in e["artikel"])
        print(f"    {len(e['artikel'])} Artikel, {summe} Stueck")
        for a in e["artikel"][:8]:
            print(f"      {a['nummer']:>5}  {a['name'][:36]:<36} {a['menge']:>3}")
        if len(e["artikel"]) > 8:
            print(f"      … {len(e['artikel']) - 8} weitere")
        print()

    if not args.schreiben:
        print("Nur angezeigt. Mit --schreiben wird die Datei erzeugt:")
        print(f"  {ZIEL}")
        return 0

    daten = {
        "hinweis": ("Median je Wochentag aus den alten Bestellzetteln (Word-Anhang "
                    "der versendeten Mails). Grundlage ist die Bestellmenge; das Feld "
                    "Retoure ist in allen Zetteln leer. Dient nur als erste "
                    "Vorbelegung, solange fuer den Wochentag keine gesendete "
                    "Bestellung vorliegt - sobald eine da ist, hat sie Vorrang."),
        "erzeugt_von": "tools/baecker_startwerte_freundl.py",
        "zettel": len(zettel),
        "tage": werte,
    }
    with open(ZIEL, "w", encoding="utf-8") as fh:
        json.dump(daten, fh, ensure_ascii=False, indent=2)
        fh.write("\n")
    print(f"geschrieben: {ZIEL}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
