"""Erzeugt den Drax-Artikelstamm aus dem Kassen-Export.

Die Datei ``Drax/data (10).xlsx`` ist ein Auszug aus der Kassen-Auswertung und
enthaelt je Artikel die Bezeichnung, die **interne Artikelnummer** (sie ist
zugleich die Artikelnummer der Drax Muehle), den Strichcode, Preise und die
Verkaufsanzahl der letzten zwoelf Monate.

Daraus entstehen zwei Dateien:

* ``api/drax-order/vorlage/katalog-drax.json`` - Artikelstamm fuer die API.
* ``mockups/drax-katalog.js``                  - dieselben Daten fuer das Mockup.

Liegt ``rechnungsartikel.json`` bereits vor (erzeugt von
``tools/drax_rechnung_extract.py``), wird es **mit Vorrang** eingemischt:

* Bezeichnung und Einheit kommen dann von der Muehle, nicht von der Kasse.
  Auf dem Bestellformular muss stehen, was Drax unter der Nummer fuehrt — der
  Kassen-Export weicht davon ab (``78549`` heisst dort „Tellofix", bei Drax
  „Klare Delikatess-Suppe").
* Artikel, die nur in Rechnungen auftauchen, kommen dazu. Ohne sie liesse sich
  ein Teil des tatsaechlichen Sortiments gar nicht bestellen.

Vier Dinge passieren dabei:

1. **Einheit abspalten.** Die Gebindegroesse steckt im Namen und zugleich in der
   Artikelnummer (40401/40402/40405/40408 = Weizenmehl 405 in 1/2,5/5/12,5 kg).
   Fuer die Spalte *Einheit* des Bestellformulars wird sie herausgeloest.
2. **Abkuerzungen aufloesen.** Der Kassen-Export kuerzt hart ab
   (``DRX Weizenm. 405 12,5 kg``). Am Touch-Bildschirm ist das schlecht lesbar.
3. **Warengruppe zuordnen.** Fest je Artikelnummer fuer den bekannten Bestand,
   mit einer Rueckfalloption ueber den Nummernkreis fuer neue Artikel.
4. **Rechnungsdaten einmischen** (siehe oben).

Aufruf — erst die Rechnungen, dann der Katalog::

    python tools/drax_rechnung_extract.py
    python tools/drax_katalog_aus_xlsx.py
"""
import json
import os
import re
import zipfile
import xml.etree.ElementTree as ET
from datetime import date

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
QUELLE = os.path.join(ROOT, "Drax", "data (10).xlsx")
RECHNUNGSARTIKEL = os.path.join(ROOT, "api", "drax-order", "vorlage",
                                "rechnungsartikel.json")
JSON_ZIEL = os.path.join(ROOT, "api", "drax-order", "vorlage", "katalog-drax.json")
JS_ZIEL = os.path.join(ROOT, "mockups", "drax-katalog.js")

NS = "{http://schemas.openxmlformats.org/spreadsheetml/2006/main}"

# ── Warengruppen ──────────────────────────────────────────────────────────
# Reihenfolge am Bildschirm: was am haeufigsten bestellt wird, steht oben.
GRUPPEN = [
    ("weizenmehl", "Weizenmehl & Grieß"),
    ("dinkelmehl", "Dinkelmehl & Dinkel"),
    ("roggenmehl", "Roggenmehl"),
    ("backmischung", "Backmischungen"),
    ("muesli", "Müsli & Flocken"),
    ("backzutaten", "Backzutaten"),
    ("knabber", "Knabbern & Süßes"),
    ("nudeln", "Nudeln"),
    ("sonstiges", "Sonstiges"),
]

# Feste Zuordnung fuer den bekannten Bestand. Sie steht hier und nicht im
# Anwendungscode, weil sie nach dem Export im Reiter „Artikel" gepflegt wird.
GRUPPE_JE_NR = {
    "backzutaten": ["11024", "45020", "88082", "88126", "88130", "88133",
                    "88134", "88135", "88214", "88512"],
    "muesli": ["38050", "55740", "78586", "78590", "88004", "88005", "88006",
               "88020", "88032", "88034", "88035", "88047", "88055", "88057",
               "88060", "88061", "88063", "88064", "88070", "88232", "88253",
               "88812", "88949"],
    "knabber": ["88099", "88139", "88141", "88155", "88184", "88187", "88191",
                "88192", "88196", "88208", "88240", "88401", "88402", "88411",
                "88412", "88413"],
    "sonstiges": ["11263", "38255", "78549", "82900", "82901"],
}

# Rueckfall fuer Artikel, die spaeter dazukommen: Nummernkreis -> Gruppe.
GRUPPE_JE_PRAEFIX = [
    ("404", "weizenmehl"), ("405", "weizenmehl"), ("409", "weizenmehl"),
    ("427", "weizenmehl"),
    ("805", "dinkelmehl"), ("808", "dinkelmehl"),
    ("606", "roggenmehl"),
    ("555", "backmischung"), ("556", "backmischung"),
    ("659", "nudeln"),
]

# ── Abkuerzungen aus dem Kassen-Export ────────────────────────────────────
# Laengere Muster zuerst, sonst zerlegt eine kurze Regel das laengere Muster.
ABKUERZUNGEN = [
    ("Din. M. Dun. W. Griess.", "Dinkelmehl Dunst Wiener Griessler"),
    ("Din.M. Dun. W.Griess.", "Dinkelmehl Dunst Wiener Griessler"),
    ("Din. Dunst W.Griess.", "Dinkel Dunst Wiener Griessler"),
    ("Dun. W. Griess.", "Dunst Wiener Griessler"),
    ("Din. VM Mand.splitter K.waf.", "Dinkel Vollmilch Mandelsplitter Knusperwaffeln"),
    ("Erdb-Knus.waf. Jogh.schoko.", "Erdbeer-Knusperwaffeln Joghurt-Schoko"),
    ("Rogg.vollk. Sauert.", "Roggenvollkorn Sauerteig"),
    ("Hafer-Porridgefl.", "Hafer-Porridgeflocken"),
    ("Din. Zartb.Knusperwaffeln", "Dinkel Zartbitter Knusperwaffeln"),
    ("Kartoffelbr. Misch.", "Kartoffelbrot-Mischung"),
    ("Weizen-Pizza Misch.", "Weizen-Pizza-Mischung"),
    ("Kerndlbr. Misch.", "Kerndlbrot-Mischung"),
    ("3-Saten Misch.", "3-Saaten-Mischung"),
    ("Partybrot Misch:", "Partybrot-Mischung"),
    ("Bauernb. Backm.", "Bauernbrot-Backmischung"),
    ("Zitr. B.misch.", "Zitronen-Backmischung"),
    ("Dinkel Cräcker Parme.", "Dinkel-Cräcker Parmesan"),
    ("Braunhirse gemal.", "Braunhirse gemahlen"),
    ("Haferfl. Kleinblatt", "Haferflocken Kleinblatt"),
    ("Schoko-Apfelsch. misch.", "Schoko-Apfelscheiben gemischt"),
    ("Weizen ganz. Korn", "Weizen ganzes Korn"),
    ("Weizenm.Type", "Weizenmehl Type"),
    ("Weizenm.", "Weizenmehl"),
    ("Dinkelm.", "Dinkelmehl"),
    ("Roggenm.", "Roggenmehl"),
    ("Pizzam.", "Pizzamehl"),
    ("Dinkel VM", "Dinkel Vollmilch"),
    ("-VM ", "-Vollmilch "),
    ("Bourbon konv.", "Bourbon konventionell"),
]


def _zellwerte(row):
    """Werte einer Zeile als Liste – inlineStr und Zahlen gleichermassen."""
    werte = []
    for c in row.findall(NS + "c"):
        istr = c.find(NS + "is")
        if istr is not None:
            t = istr.find(NS + "t")
            werte.append((t.text or "") if t is not None else "")
            continue
        v = c.find(NS + "v")
        werte.append(v.text if v is not None and v.text is not None else "")
    return werte


def lies_zeilen(pfad):
    """Alle Datenzeilen des ersten Blattes, Kopfzeile und Fusszeilen entfernt."""
    with zipfile.ZipFile(pfad) as z:
        xml = z.read("xl/worksheets/sheet1.xml")
    sheet = ET.fromstring(xml)
    daten = sheet.find(NS + "sheetData")
    zeilen = [_zellwerte(r) for r in daten.findall(NS + "row")]
    raus = []
    for i, w in enumerate(zeilen):
        if i == 0:
            continue                       # Kopfzeile
        name = (w[0] if w else "").strip()
        nr = (w[1] if len(w) > 1 else "").strip()
        # Die Auswertung haengt unten „Total" und die Filterbeschreibung an.
        if not name or not nr.isdigit():
            continue
        raus.append(w)
    return raus


EINHEIT = re.compile(r"(\d+(?:[,.]\d+)?)\s*(kg|g|l|ml|ml\b)\s*$", re.IGNORECASE)


def trenne_einheit(name):
    """„Weizenmehl 405 12,5 kg" -> ("Weizenmehl 405", "12,5 kg").

    Bei „Tellofix 540 g / 27 l" zaehlt die Packungsgroesse vor dem Schraegstrich;
    die Ergiebigkeit dahinter wandert als Klammerzusatz in den Namen.
    """
    rest = name
    zusatz = ""
    if "/" in rest:
        vorn, hinten = rest.split("/", 1)
        if EINHEIT.search(vorn.strip()):
            zusatz = "(ergibt %s)" % hinten.strip()
            rest = vorn.strip()
    m = EINHEIT.search(rest)
    if not m:
        return (name.strip(), "")
    einheit = "%s %s" % (m.group(1).replace(".", ","), m.group(2).lower())
    rest = rest[:m.start()].strip(" .*-")
    if zusatz:
        rest = (rest + " " + zusatz).strip()
    return (rest, einheit)


def klarname(roh):
    """Entfernt das Kuerzel „DRX", loest Abkuerzungen auf, raeumt Zeichen weg."""
    s = str(roh or "").strip()
    if s.upper().startswith("DRX "):
        s = s[4:]
    s = s.replace('""', '"').replace("`", "'")
    for alt, neu in ABKUERZUNGEN:
        s = s.replace(alt, neu)
    s = re.sub(r"\s*\*\s*", " ", s)
    s = re.sub(r"\s{2,}", " ", s)
    return s.strip(" .-")


def gruppe_von(nr):
    for gid, nummern in GRUPPE_JE_NR.items():
        if nr in nummern:
            return gid
    for praefix, gid in GRUPPE_JE_PRAEFIX:
        if nr.startswith(praefix):
            return gid
    return "sonstiges"


def zahl(text):
    try:
        return int(float(str(text).replace(",", ".")))
    except (TypeError, ValueError):
        return 0


# Drax haengt die Gebindegroesse mit Sternchen an: „Weizenmehl Type 405 * 5 kg".
# Die Groesse steht in der Rechnung bereits in einer eigenen Spalte, im Namen
# ist sie doppelt gemoppelt und frisst Platz am Bildschirm.
DRAX_ANHANG = re.compile(
    r"\s*\*?\s*\d+(?:[,.]\d+)?\s*(?:kg|g|l|ml)\s*$", re.IGNORECASE)


def drax_name(roh):
    s = str(roh or "").strip()
    # Ein nachgestellter Klammerzusatz („… * 250 g (aktiv)") steht hinter der
    # Groessenangabe. Er wird kurz beiseite gelegt, damit die Groesse am
    # Zeilenende greifbar wird, und danach wieder angehaengt.
    klammer = ""
    m = re.search(r"\s*(\([^()]*\))\s*$", s)
    if m:
        klammer = " " + m.group(1)
        s = s[:m.start()]
    s = DRAX_ANHANG.sub("", s)
    s = re.sub(r"\s*\*\s*", " ", s)
    # Hinten wird kein Punkt entfernt: „Bourbon konv." ist eine Abkuerzung,
    # und ohne Punkt sieht sie nach einem Tippfehler aus.
    return (re.sub(r"\s{2,}", " ", s).strip(" -") + klammer).strip()


def normiere_einheit(roh):
    """'1kg' -> '1 kg', 'St' -> '' (Stueckware braucht keine Angabe)."""
    s = str(roh or "").strip()
    if not s or s.lower() in ("st", "stk", "stück", "stueck"):
        return ""
    m = re.match(r"^(\d+(?:[,.]\d+)?)\s*(kg|g|l|ml)$", s, re.IGNORECASE)
    if m:
        return "%s %s" % (m.group(1).replace(".", ","), m.group(2).lower())
    return s


# Woerter, die beide Quellen unterschiedlich handhaben, ohne dass eine andere
# Ware gemeint waere. Nur was danach noch abweicht, ist eine echte Abweichung
# und wird im Kiosk als Kassenname mitgefuehrt.
BELANGLOS = re.compile(r"\b(type|typ|bio|drx)\b")

# Artikel, bei denen die Muehle das Produkt unter derselben Nummer ausgetauscht
# hat. Der Kassenname ist dann nicht ein Zweitname, sondern schlicht veraltet —
# er darf im Kiosk nicht als Suchhilfe stehen bleiben.
# 78549: fruehher „Tellofix", laut Rechnungen seit 2026 „Klare Delikatess-Suppe
# ‚Frei von'" (vom Betreiber bestaetigt).
VERALTETE_KASSENNAMEN = {"78549"}


def gleiche_ware(a, b):
    def kern(s):
        s = str(s or "").lower()
        for alt, neu in (("ä", "a"), ("ö", "o"), ("ü", "u"), ("ß", "ss")):
            s = s.replace(alt, neu)
        s = BELANGLOS.sub(" ", s)
        return re.sub(r"[^a-z0-9]", "", s)
    ka, kb = kern(a), kern(b)
    if ka == kb:
        return True
    # „Schoko Knusper Müsli" und „Müsli Schoko Knusper" sind dieselbe Ware,
    # nur anders sortiert.
    return sorted(ka) == sorted(kb)


def lies_rechnungsartikel():
    """Artikelstamm aus den Rechnungen – leer, solange er nicht erzeugt wurde."""
    if not os.path.exists(RECHNUNGSARTIKEL):
        return {}
    with open(RECHNUNGSARTIKEL, encoding="utf-8") as f:
        daten = json.load(f)
    return {a["nr"]: a for a in daten.get("artikel", [])}


def baue_katalog():
    artikel = []
    for w in lies_zeilen(QUELLE):
        roh = w[0].strip()
        nr = w[1].strip()
        name, einheit = trenne_einheit(klarname(roh))
        artikel.append({
            "nr": nr,
            "name": name,
            "einheit": einheit,
            "ean": (w[2] if len(w) > 2 else "").strip(),
            "gruppe": gruppe_von(nr),
            "haeufigkeit": zahl(w[8] if len(w) > 8 else 0),
            "lieferungen": 0,
            "aktiv": True,
            "quelle": roh,
        })

    # ── Rechnungsdaten einmischen ────────────────────────────────────────
    rech = lies_rechnungsartikel()
    je_nr = {a["nr"]: a for a in artikel}
    neu = 0
    umbenannt = 0
    for nr, r in rech.items():
        name = drax_name(r.get("name"))
        einheit = normiere_einheit(r.get("einheit")) or ""
        a = je_nr.get(nr)
        if a is None:
            artikel.append({
                "nr": nr,
                "name": name,
                "einheit": einheit,
                "ean": "",
                "gruppe": gruppe_von(nr),
                "haeufigkeit": 0,
                "lieferungen": r.get("lieferungen", 0),
                "aktiv": True,
                "quelle": r.get("name", ""),
                "nur_rechnung": True,
            })
            neu += 1
            continue
        a["lieferungen"] = r.get("lieferungen", 0)
        if name and name != a["name"]:
            # Der Kassenname bleibt nur erhalten, wenn er wirklich etwas
            # anderes sagt. Im Laden wird nach ihm gesucht, auf dem Formular
            # steht der Name der Muehle.
            if not gleiche_ware(name, a["name"]) and nr not in VERALTETE_KASSENNAMEN:
                a["kassenname"] = a["name"]
                umbenannt += 1
            a["name"] = name
        if einheit:
            a["einheit"] = einheit

    # Innerhalb der Gruppe stehen die Renner oben; bei Gleichstand entscheidet,
    # wie oft der Artikel zuletzt geliefert wurde, dann der Name.
    reihe = {gid: i for i, (gid, _) in enumerate(GRUPPEN)}
    artikel.sort(key=lambda a: (reihe.get(a["gruppe"], 99), -a["haeufigkeit"],
                                -a.get("lieferungen", 0), a["name"]))
    return {
        "stand": date.today().isoformat(),
        "quelle": "Drax/data (10).xlsx + Drax/Rechnung*.pdf",
        "kd_nr": "11225",
        "aus_rechnungen_neu": neu,
        "aus_rechnungen_umbenannt": umbenannt,
        "gruppen": [{"id": gid, "name": name} for gid, name in GRUPPEN],
        "artikel": artikel,
    }


def main():
    katalog = baue_katalog()
    os.makedirs(os.path.dirname(JSON_ZIEL), exist_ok=True)
    os.makedirs(os.path.dirname(JS_ZIEL), exist_ok=True)

    with open(JSON_ZIEL, "w", encoding="utf-8") as f:
        json.dump(katalog, f, ensure_ascii=False, indent=2)
        f.write("\n")

    with open(JS_ZIEL, "w", encoding="utf-8") as f:
        f.write("// Erzeugt von tools/drax_katalog_aus_xlsx.py – nicht von Hand aendern.\n")
        f.write("window.DRAX_KATALOG = ")
        json.dump(katalog, f, ensure_ascii=False, indent=2)
        f.write(";\n")

    je_gruppe = {}
    for a in katalog["artikel"]:
        je_gruppe[a["gruppe"]] = je_gruppe.get(a["gruppe"], 0) + 1
    print("%d Artikel geschrieben (%d neu aus Rechnungen, %d umbenannt)."
          % (len(katalog["artikel"]), katalog["aus_rechnungen_neu"],
             katalog["aus_rechnungen_umbenannt"]))
    for gid, name in GRUPPEN:
        print("  %-14s %-22s %3d" % (gid, name, je_gruppe.get(gid, 0)))
    print("->", JSON_ZIEL)
    print("->", JS_ZIEL)


if __name__ == "__main__":
    main()
