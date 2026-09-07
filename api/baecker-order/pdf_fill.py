"""Erzeugt das Bestellformular fuer Martin's Backstube als PDF.

Anders als bei Freundl gibt es keine Vorlage zum Befuellen: Der Papier-Bestell-
schein ist ein Scan mit zehn Tagesspalten. Gebraucht wird aber nur **ein** Tag –
also wird das Formular neu gesetzt, im selben Aufbau wie das Freundl-Dokument:
Nummer, Bezeichnung, Menge, Retouren.

Zeichensatz
-----------
``fpdf2`` bringt Helvetica als Kernschrift mit; die kann nur **Latin-1**.
Umlaute und ``ss`` liegen darin und funktionieren, ein Gedankenstrich ``-`` oder
typografische Anfuehrungszeichen dagegen nicht: fpdf2 wirft dann
``FPDFUnicodeEncodingException`` – mitten im Versand. Eine Unicode-TTF
einzubetten kostete rund 750 KB im Repo fuer einen Nutzen, den kein
Artikelname braucht. Stattdessen bereinigt ``latin1`` die Handvoll bekannter
Sonderzeichen und faellt sonst auf ``?`` zurueck. Der Versand darf an einem
Zeichen niemals scheitern.
"""
from fpdf import FPDF

# Zeichen, die in Artikelnamen und Kopfzeilen realistisch vorkommen und in
# Latin-1 fehlen.
_ERSATZ = {
    "\u2013": "-", "\u2014": "-", "\u2212": "-",        # Gedankenstriche
    "\u201e": '"', "\u201c": '"', "\u201d": '"',        # Anfuehrungszeichen
    "\u201a": "'", "\u2018": "'", "\u2019": "'",
    "\u2026": "...",                                     # Auslassungspunkte
    "\u00a0": " ", "\u202f": " ", "\u2009": " ",         # schmale Leerzeichen
    "\u2022": "-", "\u00b7": "-",                        # Aufzaehlungspunkte
    "\u20ac": "EUR",
}


def latin1(text):
    """Macht Text fuer die Kernschrift von fpdf2 sicher.

    Gibt garantiert eine Zeichenkette zurueck, die sich in Latin-1 kodieren
    laesst – notfalls mit ``?`` fuer Unbekanntes.
    """
    s = "" if text is None else str(text)
    for a, b in _ERSATZ.items():
        s = s.replace(a, b)
    return s.encode("latin-1", "replace").decode("latin-1")


def _menge(wert):
    """Ganze Zahlen ohne Nachkomma, Bruchteile mit Komma (Retouren koennen 0,5 sein)."""
    try:
        z = float(wert)
    except (TypeError, ValueError):
        return ""
    if not z:
        return ""
    if abs(z - round(z)) < 0.001:
        return str(int(round(z)))
    return f"{z:.2f}".replace(".", ",")


def build_pdf(positionen, datum_de, wochentag, kd_nr="", baeckerei_name="",
              tour_nr="", testbetrieb=False, korrektur=False, formular=False):
    """Baut das Formular und gibt die PDF-Bytes.

    ``positionen`` sind dicts mit nummer, name, menge, retoure.

    ``formular=True`` erzeugt das **Blatt**, wie es die Baeckerei bekommt: alle
    Katalogzeilen, leere Mengenfelder bleiben leer. So sieht der Papierausdruck
    aus wie das versendete Dokument (F23). Ohne das Kennzeichen entsteht die
    kompakte Fassung fuer den Mailanhang, in der nur Bestelltes steht.
    """
    p = FPDF(format="A4")
    p.set_auto_page_break(True, margin=16)
    p.add_page()
    p.set_margins(15, 12, 15)

    # ── Kopf ──
    p.set_font("Helvetica", "B", 15)
    p.cell(0, 8, latin1(baeckerei_name or "Martin's Backstube"),
           align="C", new_x="LMARGIN", new_y="NEXT")
    p.set_font("Helvetica", "", 10)
    p.cell(0, 5, latin1("Dorfladen Oberornau UG - Dorfplatz 1 - 84419 Obertaufkirchen"),
           align="C", new_x="LMARGIN", new_y="NEXT")
    p.ln(5)

    if testbetrieb:
        # Muss ins Auge springen: Diese Bestellung geht NICHT an die Baeckerei.
        p.set_fill_color(255, 243, 205)
        p.set_draw_color(230, 180, 60)
        p.set_font("Helvetica", "B", 10)
        p.cell(0, 8, latin1("TESTBETRIEB – diese Bestellung ist keine echte Bestellung"),
               border=1, align="C", fill=True, new_x="LMARGIN", new_y="NEXT")
        p.set_draw_color(0, 0, 0)
        p.ln(4)

    p.set_font("Helvetica", "B", 12)
    titel = "Bestellschein" + (" (Korrektur)" if korrektur else "")
    p.cell(48, 7, latin1(titel))
    p.set_font("Helvetica", "", 10)
    kopf = f"Kunden-Nr.: {kd_nr}" if kd_nr else ""
    if tour_nr:
        kopf += f"   Tour-Nr.: {tour_nr}"
    p.cell(62, 7, latin1(kopf))
    p.cell(0, 7, latin1(f"Liefertag: {wochentag}, {datum_de}"),
           align="R", new_x="LMARGIN", new_y="NEXT")
    p.ln(2)

    # ── Tabellenkopf ──
    spalten = ((18, "Nr.", "C"), (114, "Bezeichnung", "L"),
               (24, "Menge", "R"), (24, "Retouren", "R"))
    p.set_font("Helvetica", "B", 9)
    p.set_fill_color(235, 235, 235)
    for breite, text, ausrichtung in spalten:
        p.cell(breite, 7, latin1(text), border=1, align=ausrichtung, fill=True)
    p.ln()

    # ── Zeilen ──
    # Im Formular bleiben leere Felder leer statt "-": Das Blatt soll wie ein
    # Bestellschein wirken, auf dem man notfalls mit dem Stift nachtraegt.
    leer = "" if formular else "-"
    p.set_font("Helvetica", "", 10)
    stueck = 0
    bestellt = 0
    for pos in positionen:
        menge = pos.get("menge") or 0
        retoure = pos.get("retoure") or 0
        stueck += int(menge or 0)
        if menge or retoure:
            bestellt += 1
        zusatz = " *" if pos.get("zusatz") else ""
        p.cell(18, 6.5, latin1(pos.get("nummer") or ""), border=1, align="C")
        p.cell(114, 6.5, latin1((pos.get("name") or "") + zusatz), border=1)
        p.cell(24, 6.5, latin1(_menge(menge) or leer), border=1, align="R")
        p.cell(24, 6.5, latin1(_menge(retoure) or leer), border=1, align="R")
        p.ln()

    # ── Fuss ──
    # Gezaehlt wird, was tatsaechlich bestellt ist - im Formular stehen alle
    # 57 Katalogzeilen, davon meist nur ein Bruchteil gefuellt.
    p.ln(4)
    p.set_font("Helvetica", "I", 8)
    if any(x.get("zusatz") for x in positionen):
        p.cell(0, 4, latin1("* nur für diesen Tag zusätzlich bestellt"),
               new_x="LMARGIN", new_y="NEXT")
    p.cell(0, 4, latin1(f"Erstellt im Dorfladen-Kiosk - "
                        f"{bestellt} Positionen, {stueck} Stück"),
           new_x="LMARGIN", new_y="NEXT")

    aus = p.output()
    return bytes(aus)
