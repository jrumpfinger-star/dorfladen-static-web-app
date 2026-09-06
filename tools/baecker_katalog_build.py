"""Erzeugt den bereinigten Baecker-Artikelkatalog aus den vorhandenen Bestellmails.

Fuehrt beide Formularvarianten zusammen, bereinigt Dubletten und Tippfehler und
ermittelt je Artikel, wie oft er bestellt wurde. Ergebnis: katalog.json als
Startbestand fuer die Artikelverwaltung.
"""
import email
import glob
import json
import os
import zipfile
from email import policy
from xml.etree import ElementTree as ET

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
BASE = os.path.join(ROOT, "B\u00e4cker")
OUT = os.path.join(ROOT, "api", "baecker-order", "vorlage", "katalog.json")
W = "{http://schemas.openxmlformats.org/wordprocessingml/2006/main}"

# Tippfehler im Originalformular -> korrigierte Schreibweise
KORREKTUR = {
    "Sonnenblumenkernbot 750g": "Sonnenblumenkernbrot 750g",
    "Himbermarmelade": "Himbeermarmelade",
    "Schlo\u00dfbr\u00e4\u00fc Kruste": "Schlossbr\u00e4u Kruste",
    "Wallnussbaguette": "Walnussbaguette",
    "Kaiserschmarn": "Kaiserschmarrn",
}

# Artikel, die im Formular doppelt stehen -> Nummer, die gilt
DUBLETTEN = {
    "Butterzopf 400g": "301",
}


def cell(tc):
    return " ".join("".join(t.text or "" for t in tc.iter(W + "t")).split())


def rows_from_docx(data, tmp):
    with open(tmp, "wb") as fh:
        fh.write(data)
    with zipfile.ZipFile(tmp) as z:
        root = ET.fromstring(z.read("word/document.xml"))
    out = []
    for tbl in root.iter(W + "tbl"):
        for tr in tbl.findall(W + "tr"):
            c = [cell(x) for x in tr.findall(W + "tc")]
            if len(c) >= 3 and c[1] and not c[1].lower().startswith("artikelbez"):
                out.append((c[0].strip(), c[1].strip(), c[2].strip()))
    return out


def main():
    tmp = os.path.join(os.environ.get("TEMP", "."), "_kat.docx")
    katalog = {}      # (nr, name) -> dict
    reihenfolge = []  # erste Sichtung bestimmt die Reihenfolge im Formular

    for f in sorted(glob.glob(os.path.join(BASE, "*.eml"))):
        with open(f, "rb") as fh:
            msg = email.message_from_binary_file(fh, policy=policy.default)
        for p in msg.walk():
            if not (p.get_filename() or "").endswith(".docx"):
                continue
            for nr, name, menge in rows_from_docx(p.get_payload(decode=True), tmp):
                name = KORREKTUR.get(name, name)
                if name in DUBLETTEN and nr != DUBLETTEN[name]:
                    continue  # Dublette verwerfen
                key = name
                if key not in katalog:
                    katalog[key] = {"nummer": nr, "name": name, "anzahl": 0, "summe": 0}
                    reihenfolge.append(key)
                if nr and not katalog[key]["nummer"]:
                    katalog[key]["nummer"] = nr
                try:
                    q = int(menge)
                except ValueError:
                    q = 0
                if q > 0:
                    katalog[key]["anzahl"] += 1
                    katalog[key]["summe"] += q

    def sortkey(k):
        nr = katalog[k]["nummer"]
        return (0, int(nr)) if nr.isdigit() else (1, 0)

    artikel = []
    for k in sorted(reihenfolge, key=sortkey):
        a = katalog[k]
        artikel.append({
            "nummer": a["nummer"],
            "name": a["name"],
            "aktiv": a["anzahl"] > 0,          # nie bestellt -> ausgeblendet
            "bestellt_in": a["anzahl"],
            "summe": a["summe"],
        })

    os.makedirs(os.path.dirname(OUT), exist_ok=True)
    with open(OUT, "w", encoding="utf-8") as fh:
        json.dump({"artikel": artikel}, fh, ensure_ascii=False, indent=2)

    aktiv = sum(1 for a in artikel if a["aktiv"])
    print(f"Katalog: {len(artikel)} Artikel ({aktiv} aktiv, {len(artikel) - aktiv} ausgeblendet)")
    print("->", OUT)
    print()
    print(f"{'Nr':<8}{'Artikel':<36}{'aktiv':<7}{'bestellt':>9}{'Summe':>7}")
    print("-" * 70)
    for a in artikel:
        print(f"{a['nummer'] or '-':<8}{a['name'][:34]:<36}"
              f"{('ja' if a['aktiv'] else 'nein'):<7}{a['bestellt_in']:>9}{a['summe']:>7}")


if __name__ == "__main__":
    main()
