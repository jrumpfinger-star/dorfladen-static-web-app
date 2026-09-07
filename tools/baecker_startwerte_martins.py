"""Startwerte für Martin's Backstube aus den Rechnungen ableiten.

Für Martins liegen — anders als bei Freundl — **keine Bestellzettel** vor,
sondern nur Rechnungen. Daraus lässt sich keine wochentaggenaue Vorlage
gewinnen: Jede Rechnung fasst eine ganze Woche (Mo–Sa) zusammen und nennt je
Artikel nur die Summe über alle Liefertage. Eine Aufschlüsselung je Tag oder
Lieferschein enthalten die Dokumente nicht.

Was sich gewinnen lässt, ist ein **Durchschnitt je Liefertag**. Grundlage ist
bewusst die *berechnete* Menge (geliefert minus Retoure), also das tatsächlich
Verkaufte — nicht das Gelieferte. Sonst würde eine zu hohe Bestellung aus der
Vergangenheit einfach fortgeschrieben.

Aufruf:
    python tools/baecker_startwerte_martins.py            nur anzeigen
    python tools/baecker_startwerte_martins.py --schreiben  Datei erzeugen
"""
import argparse
import email
import glob
import io
import json
import os
import re
import sys
from datetime import datetime
from email import policy

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.join(ROOT, "api", "baecker-artikel"))

import rechnung_parser  # noqa: E402

ORDNER = os.path.join(ROOT, "B\u00e4cker", "Martins Backstube")
ZIEL = os.path.join(ROOT, "api", "baecker-order", "vorlage", "startwerte-martins.json")
ZEITRAUM = re.compile(r"Lieferungen vom (\d{2}\.\d{2}\.\d{4}) bis (\d{2}\.\d{2}\.\d{4})")


def pdf_aus_mail(pfad):
    with open(pfad, "rb") as fh:
        msg = email.message_from_binary_file(fh, policy=policy.default)
    for teil in msg.walk():
        if (teil.get_filename() or "").lower().endswith(".pdf"):
            return teil.get_payload(decode=True)
    return None


def liefertage(text):
    """Anzahl der Liefertage, die eine Rechnung abdeckt (Sonntag zaehlt nicht)."""
    m = ZEITRAUM.search(text)
    if not m:
        return 0
    a = datetime.strptime(m.group(1), "%d.%m.%Y").date()
    b = datetime.strptime(m.group(2), "%d.%m.%Y").date()
    tage = 0
    d = a
    while d <= b:
        if d.weekday() != 6:  # Sonntag wird nicht geliefert
            tage += 1
        d = d.fromordinal(d.toordinal() + 1)
    return tage


def sammeln():
    summen, tage_gesamt, namen, rechnungen = {}, 0, {}, 0
    for datei in sorted(glob.glob(os.path.join(ORDNER, "*.eml"))):
        roh = pdf_aus_mail(datei)
        if not roh:
            continue
        text = rechnung_parser.text_aus_pdf(roh) if hasattr(rechnung_parser, "text_aus_pdf") else None
        if text is None:
            from pypdf import PdfReader
            text = "\n".join((s.extract_text() or "") for s in PdfReader(io.BytesIO(roh)).pages)
        n = liefertage(text)
        if not n:
            print(f"  \u26a0 {os.path.basename(datei)}: Zeitraum unlesbar \u2013 uebersprungen")
            continue
        gelesen = rechnung_parser.artikel_aus_pdf(roh)
        if not gelesen:
            print(f"  \u26a0 {os.path.basename(datei)}: keine Positionen \u2013 uebersprungen")
            continue
        rechnungen += 1
        tage_gesamt += n
        for nummer, e in gelesen.items():
            namen[nummer] = e["name"]
            # Berechnete Menge = geliefert minus Retoure (tatsaechlich verkauft)
            verkauft = e["liefer"] - e["retour"]
            summen[nummer] = summen.get(nummer, 0) + max(0, verkauft)
    return summen, namen, tage_gesamt, rechnungen


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--schreiben", action="store_true", help="Datei erzeugen")
    args = ap.parse_args()

    summen, namen, tage, rechnungen = sammeln()
    if not summen:
        print("Keine Rechnungen ausgewertet.")
        return 1

    print(f"{rechnungen} Rechnungen \u00b7 {tage} Liefertage \u00b7 {len(summen)} Artikel\n")
    wochen = tage / 6.0 if tage else 1  # sechs Liefertage je Woche
    eintraege = []
    for nummer in sorted(summen, key=rechnung_parser.sort_nr if hasattr(rechnung_parser, "sort_nr") else (lambda n: (len(n), n))):
        schnitt = summen[nummer] / tage
        menge = int(schnitt + 0.5)
        je_woche = round(summen[nummer] / wochen, 1)
        eintraege.append({"nummer": nummer, "name": namen[nummer],
                          "menge": menge, "je_woche": je_woche})
        print(f"  {nummer:>4}  {namen[nummer][:34]:34} {summen[nummer]:>7.1f} / {tage} = "
              f"{schnitt:5.2f}  -> {menge}   (\u00d8 {je_woche}/Woche)")

    mit = [e for e in eintraege if e["menge"] > 0]
    print(f"\n{len(mit)} von {len(eintraege)} Artikeln bekommen einen Startwert > 0.")
    print("Artikel unter einem halben Stueck je Tag bleiben bei 0 - vor allem Brote, "
          "die nur zwei- bis dreimal die Woche bestellt werden. Fuer sie ist der "
          "Wochenschnitt die brauchbare Angabe.")

    if args.schreiben:
        daten = {
            "hinweis": ("Durchschnitt je Liefertag aus den Rechnungen, Grundlage ist die "
                        "verkaufte Menge (geliefert minus Retoure). Keine wochentaggenaue "
                        "Vorlage - die Rechnungen fassen je eine ganze Woche zusammen."),
            "rechnungen": rechnungen,
            "liefertage": tage,
            "artikel": eintraege,
        }
        with open(ZIEL, "w", encoding="utf-8") as fh:
            json.dump(daten, fh, ensure_ascii=False, indent=2)
            fh.write("\n")
        print(f"\nGeschrieben: {os.path.relpath(ZIEL, ROOT)}")
    else:
        print("\n(Nur Anzeige \u2013 mit --schreiben wird die Datei erzeugt.)")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
