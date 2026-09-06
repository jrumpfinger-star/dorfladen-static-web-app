"""Importiert die vorhandenen Baecker-Bestellmails als Historie.

Liest die .eml-Dateien im Ordner ``Bäcker/``, wandelt jedes angehaengte
Bestellformular in eine gesendete Bestellung um und schreibt sie nach
Dataverse. Dadurch greift die Vorbelegung im Kiosk ab dem ersten Tag.

Aufruf:
    python tools/baecker_historie_import.py --dry-run     nur anzeigen
    python tools/baecker_historie_import.py               schreiben

Benoetigt beim Schreiben dieselben App-Settings wie die API
(DV_TENANT_ID, DV_CLIENT_ID, DV_CLIENT_SECRET, DV_DEFAULT_URL).
"""
import argparse
import email
import glob
import json
import os
import re
import sys
import zipfile
from datetime import datetime
from email import policy
from xml.etree import ElementTree as ET

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.join(ROOT, "api"))
sys.path.insert(0, os.path.join(ROOT, "api", "baecker-order"))

BASE = os.path.join(ROOT, "B\u00e4cker")
W = "{http://schemas.openxmlformats.org/wordprocessingml/2006/main}"

# Gleiche Bereinigung wie beim Katalogaufbau
KORREKTUR = {
    "Sonnenblumenkernbot 750g": "Sonnenblumenkernbrot 750g",
    "Himbermarmelade": "Himbeermarmelade",
    "Schlo\u00dfbr\u00e4\u00fc Kruste": "Schlossbr\u00e4u Kruste",
    "Wallnussbaguette": "Walnussbaguette",
    "Kaiserschmarn": "Kaiserschmarrn",
}


def cell(tc):
    return " ".join("".join(t.text or "" for t in tc.iter(W + "t")).split())


def lese_formular(data):
    """Kopfdaten und Positionen eines Bestellformulars auslesen."""
    with zipfile.ZipFile(__import__("io").BytesIO(data)) as z:
        root = ET.fromstring(z.read("word/document.xml"))
    body = root.find(W + "body")

    # Text ohne Trennzeichen zusammenfuehren: Word verteilt ihn auf mehrere Runs
    kopf = " | ".join("".join(t.text or "" for t in p.iter(W + "t"))
                      for p in body.findall(W + "p"))
    datum = None
    m = re.search(r"Datum:\s*(\d{1,2}\.\d{1,2}\.\d{2,4})", kopf)
    if m:
        for fmt in ("%d.%m.%Y", "%d.%m.%y"):
            try:
                datum = datetime.strptime(m.group(1), fmt).date()
                break
            except ValueError:
                continue

    positionen = []
    for tbl in body.iter(W + "tbl"):
        for tr in tbl.findall(W + "tr"):
            tcs = tr.findall(W + "tc")
            if len(tcs) < 4:
                continue
            nr, name = cell(tcs[0]), cell(tcs[1])
            menge, retoure = cell(tcs[2]), cell(tcs[3])
            if not name or name.lower().startswith("artikelbez"):
                continue
            if "retouren menge" in retoure.lower():
                continue  # Zwischenkopfzeile
            name = KORREKTUR.get(name, name)
            if menge.isdigit() and int(menge) > 0:
                positionen.append({
                    "nummer": nr, "name": name,
                    "menge": int(menge),
                    "retoure": int(retoure) if retoure.isdigit() else 0,
                })
    return datum, positionen


def sammle():
    """Alle Bestellungen aus den Mails, juengere gewinnt bei gleichem Datum."""
    gefunden = {}
    for f in sorted(glob.glob(os.path.join(BASE, "*.eml"))):
        with open(f, "rb") as fh:
            msg = email.message_from_binary_file(fh, policy=policy.default)
        gesendet = msg.get("Date", "")
        for p in msg.walk():
            if not (p.get_filename() or "").endswith(".docx"):
                continue
            datum, positionen = lese_formular(p.get_payload(decode=True))
            if not datum or not positionen:
                continue
            iso = datum.isoformat()
            eintrag = {
                "datum": iso,
                "status": 1,  # gesendet
                "positionen": positionen,
                "protokoll": [{
                    "zeit": gesendet,
                    "art": "gesendet",
                    "wer": "Import aus E-Mail",
                    "positionen": len(positionen),
                    "stueck": sum(p["menge"] for p in positionen),
                    "quelle": os.path.basename(f),
                }],
            }
            # Bei doppeltem Liefertag (Datumsfehler in den Mails) gewinnt die
            # zuletzt gesendete Fassung.
            if iso not in gefunden or gesendet > gefunden[iso]["protokoll"][0]["zeit"]:
                gefunden[iso] = eintrag
    return dict(sorted(gefunden.items()))


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--dry-run", action="store_true", help="nur anzeigen")
    args = ap.parse_args()

    bestellungen = sammle()
    kopf_stueck = "St\u00fcck"
    print(f"Gefundene Bestellungen: {len(bestellungen)}\n")
    print(f"{'Liefertag':<13}{'Wochentag':<12}{'Pos.':>5}{kopf_stueck:>7}  Quelle")
    print("-" * 78)
    TAGE = ["Montag", "Dienstag", "Mittwoch", "Donnerstag", "Freitag", "Samstag", "Sonntag"]
    for iso, b in bestellungen.items():
        wd = TAGE[datetime.strptime(iso, "%Y-%m-%d").weekday()]
        p = b["protokoll"][0]
        print(f"{iso:<13}{wd:<12}{p['positionen']:>5}{p['stueck']:>7}  {p['quelle'][:34]}")

    # Wochentagsverteilung – zeigt, ob die Vorbelegung greifen wird
    from collections import Counter
    verteilung = Counter(TAGE[datetime.strptime(i, "%Y-%m-%d").weekday()]
                         for i in bestellungen)
    print("\nJe Wochentag:", ", ".join(f"{k} {v}\u00d7" for k, v in verteilung.most_common()))

    if args.dry_run:
        print("\n--dry-run: nichts geschrieben.")
        return 0

    import store
    token = store.get_token()
    if not token:
        print("\nFEHLER: Kein Dataverse-Token. Bitte DV_*-App-Settings setzen.")
        return 1
    url, hdrs = store.base_url(), store.headers(token)

    geschrieben = 0
    for iso, b in bestellungen.items():
        rec_id, vorhanden = store.load_order(url, hdrs, iso)
        if vorhanden.get("positionen"):
            print(f"  {iso}: bereits vorhanden, uebersprungen")
            continue
        if store.write_json(url, hdrs, store.order_key(iso), rec_id, b,
                            f"Baecker-Bestellung {iso}"):
            geschrieben += 1
            print(f"  {iso}: importiert")
        else:
            print(f"  {iso}: FEHLER beim Schreiben")

    # Artikelkatalog mitschreiben, falls noch nicht gepflegt
    rec_id, vorhanden = store.read_json(url, hdrs, store.KEY_ARTIKEL)
    if not (vorhanden or {}).get("artikel"):
        kat = os.path.join(ROOT, "api", "baecker-order", "vorlage", "katalog.json")
        with open(kat, encoding="utf-8") as fh:
            store.write_json(url, hdrs, store.KEY_ARTIKEL, rec_id,
                             json.load(fh), "Baecker-Artikel")
        print("  Artikelkatalog angelegt")

    print(f"\nFertig: {geschrieben} Bestellungen importiert.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
