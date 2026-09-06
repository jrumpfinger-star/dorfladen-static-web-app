"""Extrahiert die docx-Vorlage aus den Baecker-Mails und analysiert ihre Struktur.

Einmalig genutztes Analyse-/Extraktionsskript fuer specs/baecker-bestellung.
"""
import email
import glob
import os
import zipfile
from email import policy
from xml.etree import ElementTree as ET

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
BASE = os.path.join(ROOT, "B\u00e4cker")
OUT = os.path.join(ROOT, "api", "baecker-order", "vorlage")
W = "{http://schemas.openxmlformats.org/wordprocessingml/2006/main}"


def cell(tc):
    return " ".join("".join(t.text or "" for t in tc.iter(W + "t")).split())


def extract(src_name, target):
    path = os.path.join(BASE, src_name)
    with open(path, "rb") as fh:
        msg = email.message_from_binary_file(fh, policy=policy.default)
    for p in msg.walk():
        if (p.get_filename() or "").endswith(".docx"):
            os.makedirs(os.path.dirname(target), exist_ok=True)
            with open(target, "wb") as o:
                o.write(p.get_payload(decode=True))
            return target
    return None


def analyse(path, label):
    print("\n" + "=" * 78)
    print(label, "->", os.path.basename(path), os.path.getsize(path), "Bytes")
    with zipfile.ZipFile(path) as z:
        names = z.namelist()
        xml = z.read("word/document.xml")
    print("ZIP-Eintraege:", len(names))
    for n in names:
        print("   ", n)
    root = ET.fromstring(xml)
    body = root.find(W + "body")

    print("\n-- Absaetze im Body --")
    for i, p in enumerate(body.findall(W + "p")):
        txt = "".join(t.text or "" for t in p.iter(W + "t"))
        if txt.strip():
            print(f"  [{i}] {' '.join(txt.split())!r}")

    for ti, tbl in enumerate(body.iter(W + "tbl")):
        rows = tbl.findall(W + "tr")
        print(f"\n-- Tabelle {ti + 1}: {len(rows)} Zeilen --")
        for ri, tr in enumerate(rows):
            cells = tr.findall(W + "tc")
            vals = [cell(c) for c in cells]
            # Wie viele w:t-Knoten hat die Mengenzelle? (fuer das Befuellen wichtig)
            info = ""
            if len(cells) >= 3:
                ts = cells[2].findall(".//" + W + "t")
                info = f" | Mengenzelle: {len(ts)} w:t"
            print(f"  [{ri:2}] {len(cells)} Zellen: {vals}{info}")


if __name__ == "__main__":
    # Werktagsvariante (10 von 13 Mails nutzen sie) und Samstagsvariante
    a = extract("Bestellung 04.09.eml", os.path.join(OUT, "freundl-werktag.docx"))
    b = extract("Bestellung f\u00fcr Samstag 08.08.2026.eml", os.path.join(OUT, "freundl-samstag.docx"))
    if a:
        analyse(a, "WERKTAG")
    if b:
        analyse(b, "SAMSTAG")
