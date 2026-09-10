"""Erzeugt die Live-Daten fuer das Getraenke-Bestellformular (Getraenke Kratzer).

Quellen sind die abgelegten E-Mails im Ordner ``Getränke``:

* ``Ihre Rechnung Nr. *.eml`` - PDF-Anhang je Rechnung. Daraus entstehen
  Artikelnummer, Bezeichnung, Gebinde und Einzelpreis (= Katalog).
* ``Bestellung *.eml`` - Klartext der tatsaechlich verschickten Bestellungen.
  Daraus entstehen Bestellhaeufigkeit und uebliche Kistenmengen (= Vorschlaege).

Erzeugt werden zwei Dateien aus derselben Auswertung:

* ``mockups/getraenke-katalog.js`` - ``window.GETRAENKE_DATEN`` fuer den Mockup.
* ``api/getraenke-order/vorlage/katalog.json`` - Startbestand der Anwendung.
  Er greift, solange in Dataverse noch kein ``getraenke_artikel`` liegt
  (specs/getraenke-bestellung/plan.md, Persistenz).

Aufruf:  python tools/getraenke_katalog_build.py
"""

from __future__ import annotations

import email
import io
import json
import re
import statistics
import unicodedata
from collections import Counter
from datetime import datetime
from email import policy
from pathlib import Path

import pypdf

WURZEL = Path(__file__).resolve().parent.parent
QUELLE = WURZEL / "Getränke"
ZIEL = WURZEL / "mockups" / "getraenke-katalog.js"
ZIEL_API = WURZEL / "api" / "getraenke-order" / "vorlage" / "katalog.json"

# Eine Rechnungszeile sieht im extrahierten PDF-Text so aus:
#   "206,2515 KA40015 Augustiner Hell 20x0,50 13,75300"
# also Gesamt+Menge verklebt, dann Art-Nr, Bezeichnung, Gebinde, Einzel+HL/Fl.
RECHNUNGSZEILE = re.compile(
    r"^([\d.]*\d,\d\d)(\d+)\s+(KA\d+)\s+(.+?)\s*(\d+x\d,\d{2})\s+([\d.]*\d,\d\d)(\d*)$"
)

# Die Pfandtabelle steht am Fuss der Rechnung, z. B.
#   "99550 3,30 EUR 12er Kiste 56 9 155,1047"
PFANDZEILE = re.compile(r"^(\d{5})\s+(\d+,\d\d)\s+EUR\s+(.+?)\s+\d+\s+\d+\s")

# Leergut-Nummer -> Gebinde des Katalogs. Ohne diese Zuordnung liesse sich das
# Pfand nicht je Kiste ausweisen.
PFAND_GEBINDE: dict[str, list[str]] = {
    "99550": ["12x0,50", "12x0,75"],   # 12er Kiste
    "99559": ["12x1,00"],              # Aho Split 12x1,00
    "99581": ["20x0,50"],              # 20er Kiste
    "99591": ["24x0,33"],              # 24er Kiste Bier 0,33
}

# Warengruppen des Bestellformulars in der Reihenfolge, in der sie in den
# Bestellmails auftauchen: erst Bier, dann Mehrweg-Limo, dann Wasser, dann
# Erfrischungsgetraenke, zuletzt Saefte.
GRUPPEN: list[tuple[str, list[str]]] = [
    ("Bier", ["KA40015", "KA40349", "KA40350"]),
    ("Limonade Mehrweg", ["KA50261"]),
    ("Mineralwasser Glas 0,75 l", ["KA56180", "KA56181", "KA56182"]),
    ("Mineralwasser Glas 0,5 l", ["KA58268", "KA58270", "KA58269"]),
    ("Mineralwasser PET 1,0 l", ["KA50040", "KA50091", "KA56043"]),
    ("Mineralwasser PET 0,5 l", ["KA50041", "KA50090", "KA50076"]),
    ("Erfrischungsgetränke PET 0,5 l", []),  # Rest fuellt sich automatisch
    ("Säfte", ["KA50961", "WOLFRA-APFEL-TRUEB", "WOLFRA-APFEL-KLAR",
               "WOLFRA-APFEL-KIRSCH", "WOLFRA-JOHANNISBEER"]),
]

# Artikel, die in den Bestellmails vorkommen, aber in keiner der vorliegenden
# Rechnungen abgerechnet wurden. Sie gehoeren ins Formular, haben aber weder
# Artikelnummer noch belegten Preis - das wird im Mockup ausgewiesen.
OHNE_BELEG: list[dict] = [
    {"nr": "WOLFRA-APFEL-TRUEB", "name": "Wolfra Apfelsaft trüb", "gebinde": "6x1,00"},
    {"nr": "WOLFRA-APFEL-KLAR", "name": "Wolfra Apfelsaft klar", "gebinde": "6x1,00"},
    {"nr": "WOLFRA-APFEL-KIRSCH", "name": "Wolfra Apfel-Kirsch", "gebinde": "6x1,00"},
    {"nr": "WOLFRA-JOHANNISBEER", "name": "Wolfra Johannisbeer", "gebinde": "6x1,00"},
    {"nr": "AHO-LIMETTE", "name": "Aho Limette PET", "gebinde": "12x0,50"},
    {"nr": "AHO-ORANGE-SPORT", "name": "Aho Orange Sport Isotonisch PET", "gebinde": "12x0,50"},
]

# Freitext aus den Bestellmails -> Artikelnummer. Der Schluessel ist die
# normalisierte Schreibweise (siehe ``norm``), damit "Adelh. MIWA classic
# PET 0,5l" und "Adelh. Classic PET 0,5 l" dieselbe Zeile treffen.
ALIASE: dict[str, str] = {
    # --- Bier ---
    "augustiner hell 0,5l": "KA40015",
    "augustiner hell export 0,5l": "KA40015",
    "tegernseer hell 0,5l": "KA40349",
    "tegenseer hell 0,5l": "KA40349",
    "tegernseer hell 0,33l": "KA40350",
    "tegenseer hell 0,33l": "KA40350",
    # --- Mehrweg-Limo ---
    "flotzinger cola-mix 0,5l": "KA50261",
    "flotzinger cola mix 0,5l": "KA50261",
    # --- Mineralwasser Glas 0,75 ---
    "adelh. miwa classic glas 0,75l": "KA56180",
    "adelh. miwa sanft glas 0,75l": "KA56181",
    "adelh. sanft glas 0,75l": "KA56181",
    "adelh. miwa naturell glas 0,75l": "KA56182",
    # --- Mineralwasser Glas 0,5 ---
    "adelh. sanft glas 0,5l": "KA58270",
    "adelh. classic glas 0,5l": "KA58268",
    "adelh. naturell glas 0,5l": "KA58269",
    # --- Mineralwasser PET 1,0 ---
    "adelh. miwa classic pet 1,0l": "KA50040",
    "adelh. classic pet 1,0l": "KA50040",
    "adelh. miwa sanft pet 1,0l": "KA50091",
    "adelh. sanft pet 1,0l": "KA50091",
    "adelh. miwa naturell pet 1,0l": "KA56043",
    "adelh. naturell pet 1,0l": "KA56043",
    # --- Mineralwasser PET 0,5 ---
    "adelh. miwa classic pet 0,5l": "KA50041",
    "adelh. miwa sanft pet 0,5l": "KA50090",
    "adelh. miwa naturell pet 0,5l": "KA50076",
    # --- Erfrischungsgetraenke PET 0,5 ---
    "adelh. miwa+lemon pet 0,5l": "KA50033",
    "miwa+lemon": "KA50033",
    "adelh. ace pet 0,5l": "KA50002",
    "adelh. ace 0,5l pet": "KA50002",
    "adelh. apfel-krauter pet 0,5l": "KA50012",
    "adelh. apfel krauter pet 0,5l": "KA50012",
    "adelh. apfel-krauter 0,5l pet": "KA50012",
    "apfel-krauter": "KA50012",
    "adelh. apfelschorle pet 0,5l": "KA50013",
    "apfelschorle": "KA50013",
    "adelh. bio apfelschorle pet 0,5l": "KA50031",
    "adelh. bio apfel-schorle pet 0,5l": "KA50031",
    "bio apfelschorle": "KA50031",
    "bio apfel-traube": "KA50032",
    "adelh. bio orange maracuja pet 0,5l": "KA50034",
    "bio orange maracuja": "KA50034",
    "bio orange-maracuja": "KA50034",
    "adelh. brombeer holunder pet 0,5l": "KA51639",
    "brombeer holunder": "KA51639",
    "adelh. cola-mix pet 0,5l": "KA50045",
    "cola-mix": "KA50045",
    "adelh. eistee pfirsich pet 0,5l": "KA50048",
    "adelh. eistee pfirsich 0,5l pet": "KA50048",
    "eistee pfirsich": "KA50048",
    "adelh. eistee waldbeere pet 0,5l": "KA50051",
    "adelh. waldbeere pet 0,5l": "KA50051",
    "eistee waldbeere": "KA50051",
    "adelh. eistee zitrone pet 0,5l": "KA50052",
    "adelh. johannisbeere pet 0,5l": "KA50067",
    "johannisbeere": "KA50067",
    "adelh. kirsche pet 0,5l": "KA58248",
    "kirsch": "KA58248",
    "adelh. kirsch sport pet 0,5l": "KA56040",
    "adelh. lemon sport pet 0,5l": "KA56041",
    "adelh. lemon -sport pet 0,5l": "KA56041",
    "lemon sport": "KA56041",
    "adelh. mandarine pet 0,5l": "KA50072",
    "adelh mandarine pet 0,5l": "KA50072",
    "mandarine": "KA50072",
    "adelh. mango pet 0,5l": "KA56172",
    "mango": "KA56172",
    "adelh. maracuja lemon pet 0,5l": "KA58020",
    "adelh. maracuja-lemon 0,5l pet": "KA58020",
    "maracuja-lemon": "KA58020",
    "maracuja- lemon": "KA58020",
    "adelh. multivitamin pet 0,5l": "KA51575",
    "adelh. mulitvitamin 0,5l pet": "KA51575",
    "multivitamin": "KA51575",
    "adelh. orange pet 0,5l": "KA56001",
    "orange": "KA56001",
    "adelh. pfirsich holunder pet 0,5l": "KA58642",
    "pfirsich holunder": "KA58642",
    "pfirsich-holunderblute": "KA58642",
    "adelh. pink grapefruit pet 0,5l": "KA50099",
    "adelh. rote schorle pet 0,5l": "KA56002",
    "adelh. rote schorle pet 0,5": "KA56002",
    "rote schorle": "KA56002",
    "adelh. sport schorle pet 0,5l": "KA50096",
    "sport schorle": "KA50096",
    "adelh. tropic pet 0,5l": "KA58484",
    "adelh. tropic 0,5l pet": "KA58484",
    "adelh. zitrone pet 0,5l": "KA56000",
    "adelh zitrone pet 0,5l": "KA56000",
    "adelh. zitrone 0,5l pet": "KA56000",
    "zitrone": "KA56000",
    "adelh. limette pet 0,5l": "AHO-LIMETTE",
    "orange sport": "AHO-ORANGE-SPORT",
    # --- Saefte ---
    "wolfra orangensaft 1,0l": "KA50961",
    "wolfra orange 1,0l": "KA50961",
    "wolfra apfelsaft trub 1,0l": "WOLFRA-APFEL-TRUEB",
    "wolfra apfelsaft klar 1,0l": "WOLFRA-APFEL-KLAR",
    "wolfra apfel-kirsch 1,0l": "WOLFRA-APFEL-KIRSCH",
    "wolfra apfel-kirsch 1,0": "WOLFRA-APFEL-KIRSCH",
    "wolfra johannisbeere 1,0l": "WOLFRA-JOHANNISBEER",
    "wolfra johannisbeersaft 1,0l": "WOLFRA-JOHANNISBEER",
}


def norm(text: str) -> str:
    """Vereinheitlicht Freitext, damit Schreibvarianten dieselbe Zeile treffen."""
    t = unicodedata.normalize("NFKD", text.lower())
    t = "".join(c for c in t if not unicodedata.combining(c))
    t = t.replace("ß", "ss")
    t = re.sub(r"\s+", " ", t).strip()
    return t


def mails(muster: str):
    for pfad in sorted(QUELLE.glob(muster)):
        with pfad.open("rb") as fh:
            yield pfad, email.message_from_binary_file(fh, policy=policy.default)


def lies_katalog() -> tuple[dict[str, dict], dict[str, float]]:
    """Katalog und Pfandsaetze aus allen Rechnungs-PDFs.

    Preis bzw. Pfand ist jeweils der haeufigste Wert ueber alle Rechnungen.
    """
    artikel: dict[str, dict] = {}
    pfand: dict[str, Counter] = {}
    for _, msg in mails("Ihre Rechnung Nr. *.eml"):
        for teil in msg.walk():
            name = teil.get_filename() or ""
            if not name.lower().endswith(".pdf"):
                continue
            leser = pypdf.PdfReader(io.BytesIO(teil.get_payload(decode=True)))
            text = "\n".join((s.extract_text() or "") for s in leser.pages)
            for zeile in text.splitlines():
                zeile = zeile.strip()
                treffer = RECHNUNGSZEILE.match(zeile)
                if treffer:
                    _, _, nr, bez, gebinde, einzel, _ = treffer.groups()
                    eintrag = artikel.setdefault(
                        nr,
                        {"nr": nr, "name": bez.strip(), "gebinde": gebinde,
                         "preise": Counter(), "belege": 0},
                    )
                    eintrag["preise"][einzel] += 1
                    eintrag["belege"] += 1
                    continue
                leergut = PFANDZEILE.match(zeile)
                if leergut:
                    lgnr, satz, _bez = leergut.groups()
                    for gebinde in PFAND_GEBINDE.get(lgnr, []):
                        pfand.setdefault(gebinde, Counter())[satz] += 1
    for eintrag in artikel.values():
        preis, _ = eintrag["preise"].most_common(1)[0]
        eintrag["preis"] = round(float(preis.replace(",", ".")), 2)
        del eintrag["preise"]
    saetze = {
        gebinde: round(float(zaehler.most_common(1)[0][0].replace(",", ".")), 2)
        for gebinde, zaehler in pfand.items()
    }
    return artikel, saetze


def lies_bestellungen() -> list[dict]:
    """Bestellmails als Liste ``{datum, betreff, positionen:[(menge, text)]}``."""
    ergebnis: list[dict] = []
    for pfad, msg in mails("Bestellung*.eml"):
        koerper = msg.get_body(preferencelist=("plain", "html"))
        text = koerper.get_content().split("Mit freundlichen")[0]
        positionen: list[tuple[int, str]] = []
        # "Je 1 Kiste Adelh. PET 0,5l:" leitet eine Aufzaehlung ein, in der nur
        # noch die Geschmacksrichtung steht. Das Praefix gilt bis zur naechsten
        # normalen Mengenzeile.
        praefix: str | None = None
        for roh in text.splitlines():
            zeile = roh.strip().lstrip("*").strip()
            if not zeile or zeile.lower().startswith("bestellung"):
                continue
            menge = re.match(r"^(\d+)\s+Kisten?\s+(.+)$", zeile, re.I)
            if menge:
                positionen.append((int(menge.group(1)), menge.group(2).strip()))
                praefix = None
                continue
            sammel = re.match(r"^Je\s+1\s+Kiste\s+(.+?):?$", zeile, re.I)
            if sammel:
                praefix = sammel.group(1).strip().rstrip(":")
                continue
            if praefix:
                # Praefix bleibt am Text haengen: Nur so ist spaeter erkennbar,
                # dass "Bio Orange-Maracuja" aus einer Sammelzeile stammt und
                # keine vollstaendige Bestellschreibweise ist.
                positionen.append((1, praefix + " | " + zeile))
        ergebnis.append({
            "datei": pfad.name,
            "betreff": (msg.get("Subject") or "").strip(),
            "datum": email.utils.parsedate_to_datetime(msg.get("Date")),
            "positionen": positionen,
        })
    ergebnis.sort(key=lambda b: b["datum"])
    return ergebnis


def ordne_zu(text: str) -> str | None:
    """Freitext einer Bestellzeile auf eine Artikelnummer abbilden."""
    schluessel = norm(text)
    if schluessel in ALIASE:
        return ALIASE[schluessel]
    # Sammelzeilen kommen als "Adelh. PET 0,5l | Mango" herein: der Teil hinter
    # dem Trenner ist die Geschmacksrichtung und allein aussagekraeftig.
    if "|" in schluessel:
        geschmack = norm(schluessel.split("|", 1)[1])
        if geschmack in ALIASE:
            return ALIASE[geschmack]
    return None


def main() -> int:
    katalog, pfandsaetze = lies_katalog()
    for extra in OHNE_BELEG:
        katalog.setdefault(extra["nr"], {**extra, "preis": None, "belege": 0})

    bestellungen = lies_bestellungen()

    mengen: dict[str, list[int]] = {}
    haeufigkeit: Counter = Counter()
    offen: Counter = Counter()
    # Schreibweise, die der Laden gegenueber Kratzer bisher benutzt hat. Sie
    # geht in den Mailtext ein, damit die Bestellung beim Lieferanten unveraendert
    # aussieht - die Rechnungsbezeichnung ("Aho Individual Classic Glas") ist
    # dort nicht gebraeuchlich.
    schreibweise: dict[str, Counter] = {}
    zuletzt: dict[str, str] = {}
    for bestellung in bestellungen:
        gesehen: set[str] = set()
        for menge, text in bestellung["positionen"]:
            nr = ordne_zu(text)
            if not nr:
                offen[text] += 1
                continue
            mengen.setdefault(nr, []).append(menge)
            gesehen.add(nr)
            if "|" not in text:
                schreibweise.setdefault(nr, Counter())[text.strip()] += 1
        for nr in gesehen:
            haeufigkeit[nr] += 1
            zuletzt[nr] = bestellung["datum"].strftime("%d.%m.%Y")

    if offen:
        print("Nicht zugeordnete Bestellzeilen:")
        for text, anzahl in offen.most_common():
            print(f"  {anzahl}x  {text}")

    # Letzte Bestellung dient als Vorbelegung des Formulars.
    letzte = bestellungen[-1]
    vorbelegt: dict[str, int] = {}
    for menge, text in letzte["positionen"]:
        nr = ordne_zu(text)
        if nr:
            vorbelegt[nr] = vorbelegt.get(nr, 0) + menge

    anzahl_bestellungen = len(bestellungen)
    gruppen_ausgabe = []
    vergeben: set[str] = set()
    for name, nummern in GRUPPEN:
        if not nummern:
            continue
        gruppen_ausgabe.append((name, [n for n in nummern if n in katalog]))
        vergeben.update(nummern)
    rest = sorted(
        (n for n in katalog if n not in vergeben),
        key=lambda n: norm(katalog[n]["name"]),
    )
    reihenfolge = []
    for name, nummern in GRUPPEN:
        nummern = [n for n in nummern if n in katalog] if nummern else rest
        reihenfolge.append({"gruppe": name, "artikel": nummern})

    artikel_ausgabe = []
    for block in reihenfolge:
        for nr in block["artikel"]:
            eintrag = katalog[nr]
            werte = mengen.get(nr, [])
            varianten = schreibweise.get(nr)
            artikel_ausgabe.append({
                "nr": nr,
                "name": eintrag["name"],
                "gebinde": eintrag["gebinde"],
                "preis": eintrag.get("preis"),
                "gruppe": block["gruppe"],
                "bestelltext": (varianten.most_common(1)[0][0] if varianten
                                else f"{eintrag['name']} {eintrag['gebinde']}"),
                # Woher der Mailtext stammt: eine echte Bestellzeile oder - falls
                # der Artikel bisher nur in Sammelzeilen ("Je 1 Kiste ... :")
                # vorkam - ersatzweise die Rechnungsbezeichnung.
                "textquelle": "bestellung" if varianten else "rechnung",
                "zuletzt": zuletzt.get(nr),
                # Wie oft der Artikel in den ausgewerteten Bestellungen vorkam.
                "bestellt": haeufigkeit.get(nr, 0),
                "quote": round(haeufigkeit.get(nr, 0) / anzahl_bestellungen, 2),
                # Uebliche Kistenzahl: Median der bisherigen Bestellmengen.
                "ueblich": int(round(statistics.median(werte))) if werte else None,
                "spanne": [min(werte), max(werte)] if werte else None,
                "belegt": eintrag.get("belege", 0) > 0,
            })

    daten = {
        "stand": datetime.now().strftime("%d.%m.%Y"),
        "lieferant": {
            "name": "Getränke Kratzer",
            "mail": "bestellung@getraenke-kratzer.de",
            "kundennummer": "15554",
            "tour": "1",
        },
        "quellen": {
            "rechnungen": len(list(QUELLE.glob("Ihre Rechnung Nr. *.eml"))),
            "bestellungen": anzahl_bestellungen,
            "zeitraum": [
                bestellungen[0]["datum"].strftime("%d.%m.%Y"),
                bestellungen[-1]["datum"].strftime("%d.%m.%Y"),
            ],
        },
        "letzteBestellung": {
            "betreff": letzte["betreff"],
            "datum": letzte["datum"].strftime("%d.%m.%Y"),
            "positionen": vorbelegt,
        },
        "gruppen": [b["gruppe"] for b in reihenfolge],
        "pfand": pfandsaetze,
        "artikel": artikel_ausgabe,
        "verlauf": [
            {
                "betreff": b["betreff"],
                "datum": b["datum"].strftime("%d.%m.%Y"),
                "kisten": sum(m for m, _ in b["positionen"]),
                "positionen": len(b["positionen"]),
            }
            for b in reversed(bestellungen)
        ],
    }

    ZIEL.parent.mkdir(parents=True, exist_ok=True)
    with ZIEL.open("w", encoding="utf-8") as fh:
        fh.write("// Erzeugt von tools/getraenke_katalog_build.py"
                 " - nicht von Hand aendern.\n")
        fh.write("// Quelle: Rechnungs- und Bestellmails im Ordner 'Getränke'.\n")
        fh.write("window.GETRAENKE_DATEN = ")
        json.dump(daten, fh, ensure_ascii=False, indent=1)
        fh.write(";\n")

    print(f"{len(artikel_ausgabe)} Artikel aus {daten['quellen']['rechnungen']} Rechnungen "
          f"und {anzahl_bestellungen} Bestellungen -> {ZIEL.relative_to(WURZEL)}")
    schreibe_api_seed(daten, letzte, vorbelegt)
    return 1 if offen else 0


def schreibe_api_seed(daten: dict, letzte: dict, vorbelegt: dict) -> None:
    """Startbestand fuer ``api/getraenke-order`` schreiben.

    Der Mockup und die Anwendung teilen dieselbe Auswertung, aber nicht
    dieselben Feldnamen: Die Anwendung fuehrt je Artikel ``ueblich`` und
    ``zuletzt`` als *Kistenzahl* (Spec F4), waehrend der Mockup unter
    ``zuletzt`` das Datum der letzten Bestellung anzeigt.
    """
    pfand = daten["pfand"]
    artikel = []
    for a in daten["artikel"]:
        artikel.append({
            "nummer": a["nr"],
            "name": a["name"],
            "bestelltext": a["bestelltext"],
            "gebinde": a["gebinde"],
            "gruppe": a["gruppe"],
            "preis": a["preis"],
            "pfand": pfand.get(a["gebinde"]),
            "bestellungen": a["bestellt"],
            "ueblich": a["ueblich"],
            "zuletzt": vorbelegt.get(a["nr"], 0),
            "aktiv": True,
        })

    nach_nr = {a["nummer"]: a for a in artikel}
    positionen = []
    for nr, menge in vorbelegt.items():
        a = nach_nr.get(nr)
        if not a:
            continue
        positionen.append({
            "nummer": nr, "name": a["name"], "bestelltext": a["bestelltext"],
            "gebinde": a["gebinde"], "gruppe": a["gruppe"],
            "menge": menge, "preis": a["preis"], "zusatz": False,
        })

    seed = {
        "lieferant": daten["lieferant"],
        "gruppen": daten["gruppen"],
        "pfand": pfand,
        "artikel": artikel,
        # Die letzte per Mail verschickte Bestellung. Sie dient als Vorlage,
        # solange im System selbst noch keine Bestellung liegt (Spec F5).
        "letzte": {
            "datum": letzte["datum"].strftime("%Y-%m-%d"),
            "betreff": letzte["betreff"],
            "positionen": positionen,
        },
    }

    ZIEL_API.parent.mkdir(parents=True, exist_ok=True)
    with ZIEL_API.open("w", encoding="utf-8") as fh:
        json.dump(seed, fh, ensure_ascii=False, indent=1)
        fh.write("\n")
    print(f"{len(artikel)} Artikel -> {ZIEL_API.relative_to(WURZEL)}")


if __name__ == "__main__":
    raise SystemExit(main())
