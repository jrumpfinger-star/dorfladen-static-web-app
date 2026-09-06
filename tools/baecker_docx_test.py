"""Prueft den docx-Fueller gegen die Originale aus den Bestellmails.

Erzeugt das Formular mit denselben Mengen wie eine echte Bestellung und
vergleicht Kopfdaten, Zeilenzahl und alle Mengenspalten mit dem Original.
"""
import email
import glob
import os
import sys
import zipfile
from email import policy
from xml.etree import ElementTree as ET

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.join(ROOT, "api", "baecker-order"))
from docx_fill import fill_form, tour_fuer  # noqa: E402

BASE = os.path.join(ROOT, "B\u00e4cker")
VORLAGE = os.path.join(ROOT, "api", "baecker-order", "vorlage", "freundl-werktag.docx")
W = "{http://schemas.openxmlformats.org/wordprocessingml/2006/main}"


def cell(tc):
    return " ".join("".join(t.text or "" for t in tc.iter(W + "t")).split())


def parse(data):
    """Kopftext und Tabellenzeilen eines .docx auslesen."""
    with zipfile.ZipFile(__import__("io").BytesIO(data)) as z:
        root = ET.fromstring(z.read("word/document.xml"))
    body = root.find(W + "body")
    kopf = " | ".join(
        "".join(t.text or "" for t in p.iter(W + "t"))
        for p in body.findall(W + "p")
        if "".join(t.text or "" for t in p.iter(W + "t")).strip()
    )
    zeilen = []
    for tbl in body.iter(W + "tbl"):
        for tr in tbl.findall(W + "tr"):
            tcs = tr.findall(W + "tc")
            if len(tcs) >= 4:
                zeilen.append(tuple(cell(t) for t in tcs[:4]))
    return kopf, zeilen


def original(mail):
    with open(os.path.join(BASE, mail), "rb") as fh:
        msg = email.message_from_binary_file(fh, policy=policy.default)
    for p in msg.walk():
        if (p.get_filename() or "").endswith(".docx"):
            return p.get_payload(decode=True)
    return None


def pruefe(mail, datum_iso, datum_de):
    print("\n" + "=" * 78)
    print("PRUEFUNG:", mail)
    orig = original(mail)
    o_kopf, o_zeilen = parse(orig)

    # Positionen aus dem Original uebernehmen
    positionen = []
    for nr, name, menge, retoure in o_zeilen:
        if not name or name.lower().startswith("artikelbez"):
            continue
        if menge or retoure:
            positionen.append({
                "nummer": nr, "name": name,
                "menge": int(menge) if menge.isdigit() else 0,
                "retoure": int(retoure) if retoure.isdigit() else 0,
            })

    with open(VORLAGE, "rb") as fh:
        vorlage = fh.read()
    neu = fill_form(vorlage, datum_de, positionen, tour_nr=tour_fuer(datum_iso))
    n_kopf, n_zeilen = parse(neu)

    ok = True

    # 1) Gueltiges Dokument
    with zipfile.ZipFile(__import__("io").BytesIO(neu)) as z:
        teile_neu = set(z.namelist())
        bad = z.testzip()
    with zipfile.ZipFile(__import__("io").BytesIO(vorlage)) as z:
        teile_alt = set(z.namelist())
    print(f"  ZIP gueltig            : {'OK' if bad is None else 'FEHLER ' + str(bad)}")
    print(f"  Teile vollstaendig     : {'OK' if teile_neu == teile_alt else 'FEHLT ' + str(teile_alt - teile_neu)}")
    ok &= bad is None and teile_neu == teile_alt

    # 2) Kopfdaten
    print(f"  Kopf erzeugt           : {n_kopf[:70]}")
    print(f"  Kopf Original          : {o_kopf[:70]}")
    hat_datum = datum_de in n_kopf
    tour = tour_fuer(datum_iso)
    hat_tour = f"Tour-Nr. {tour}" in n_kopf.replace("  ", " ")
    print(f"  Datum gesetzt          : {'OK' if hat_datum else 'FEHLER'}")
    print(f"  Tour-Nr. {tour:<3}           : {'OK' if hat_tour else 'FEHLER'}")
    ok &= hat_datum and hat_tour

    # 3) Zeilenzahl
    gleich = len(n_zeilen) == len(o_zeilen)
    print(f"  Zeilen  neu/original   : {len(n_zeilen)} / {len(o_zeilen)} {'OK' if gleich else 'ABWEICHUNG'}")
    ok &= gleich

    # 4) Mengen und Retouren Zeile fuer Zeile
    #    Ausgenommen: Kopfzeilen (die leere Mengenspalte wird bewusst mit
    #    "Bestell Menge" beschriftet) und Freitext-Mengen wie "1x", die es im
    #    neuen System nicht mehr gibt.
    fehler = []
    for i, (o, n) in enumerate(zip(o_zeilen, n_zeilen)):
        if o[0] != n[0] or o[1] != n[1]:
            fehler.append(f"Zeile {i}: Artikel {o[:2]} != {n[:2]}")
            continue
        ist_kopf = (o[1].lower().startswith("artikelbez")
                    or "retouren menge" in o[3].lower()
                    or "bestell menge" in o[2].lower())
        if ist_kopf:
            continue
        if o[2] and not o[2].isdigit():
            continue  # Freitext-Menge im Original, z.B. "1x"
        if o[2] != n[2] or o[3] != n[3]:
            fehler.append(f"Zeile {i} ({o[1]}): Menge {o[2]!r}/{o[3]!r} != {n[2]!r}/{n[3]!r}")
    if fehler:
        ok = False
        print(f"  Mengen/Retouren        : {len(fehler)} ABWEICHUNGEN")
        for f in fehler[:12]:
            print("     ", f)
    else:
        print(f"  Mengen/Retouren        : OK ({len(positionen)} Positionen)")

    print("  ERGEBNIS               :", "BESTANDEN" if ok else "FEHLGESCHLAGEN")
    return ok


def test_retouren():
    """Retouren werden in Spalte 4 geschrieben."""
    print("\n" + "=" * 78)
    print("PRUEFUNG: Retouren-Spalte")
    with open(VORLAGE, "rb") as fh:
        vorlage = fh.read()
    pos = [{"nummer": "1", "name": "Kaisersemmel", "menge": 52, "retoure": 3}]
    neu = fill_form(vorlage, "10.09.2026", pos, tour_nr="87")
    _, zeilen = parse(neu)
    treffer = [z for z in zeilen if z[1] == "Kaisersemmel"]
    ok = bool(treffer) and treffer[0][2] == "52" and treffer[0][3] == "3"
    print(f"  Zeile: {treffer[0] if treffer else '-'}")
    print("  ERGEBNIS               :", "BESTANDEN" if ok else "FEHLGESCHLAGEN")
    return ok


def test_zusatz():
    """Position ohne Katalogeintrag wird als neue Zeile angehaengt."""
    print("\n" + "=" * 78)
    print("PRUEFUNG: Zusatzposition ohne Vorlagenzeile")
    with open(VORLAGE, "rb") as fh:
        vorlage = fh.read()
    pos = [
        {"nummer": "1", "name": "Kaisersemmel", "menge": 40, "retoure": 0},
        {"nummer": "", "name": "Brezen fuer Feuerwehrfest", "menge": 40, "retoure": 0},
    ]
    neu = fill_form(vorlage, "10.09.2026", pos, tour_nr="87")
    _, zeilen = parse(neu)
    treffer = [z for z in zeilen if "Feuerwehrfest" in z[1]]
    ok = bool(treffer) and treffer[0][2] == "40" and zeilen[-1][1] == treffer[0][1]
    print(f"  Zeile: {treffer[0] if treffer else '-'}")
    print(f"  Steht am Ende          : {'OK' if treffer and zeilen[-1][1] == treffer[0][1] else 'FEHLER'}")
    print("  ERGEBNIS               :", "BESTANDEN" if ok else "FEHLGESCHLAGEN")
    return ok


def test_samstag():
    """Samstag nutzt Tour-Nr. 8."""
    print("\n" + "=" * 78)
    print("PRUEFUNG: Tour-Nr. am Samstag")
    with open(VORLAGE, "rb") as fh:
        vorlage = fh.read()
    neu = fill_form(vorlage, "12.09.2026",
                    [{"nummer": "1", "name": "Kaisersemmel", "menge": 30, "retoure": 0}],
                    tour_nr=tour_fuer("2026-09-12"))
    kopf, _ = parse(neu)
    ok = "Tour-Nr. 8" in kopf.replace("  ", " ") and "Tour-Nr. 87" not in kopf.replace("  ", " ")
    print(f"  Kopf: {kopf[:80]}")
    print("  ERGEBNIS               :", "BESTANDEN" if ok else "FEHLGESCHLAGEN")
    return ok


if __name__ == "__main__":
    ergebnisse = [
        pruefe("Bestellung 04.09.eml", "2026-09-04", "04.09.2026"),
        pruefe("Bestellung 19.08.2026.eml", "2026-08-19", "19.08.2026"),
        pruefe("Bestellung f\u00fcr 27.8.26.eml", "2026-08-27", "27.08.2026"),
        test_retouren(),
        test_zusatz(),
        test_samstag(),
    ]
    print("\n" + "=" * 78)
    print(f"GESAMT: {sum(ergebnisse)}/{len(ergebnisse)} bestanden")
    sys.exit(0 if all(ergebnisse) else 1)
