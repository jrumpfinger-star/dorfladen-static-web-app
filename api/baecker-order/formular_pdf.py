"""Bildet das Word-Bestellformular der Baeckerei Freundl als PDF nach.

Warum das noetig ist: Die Baeckerei bekommt ein ausgefuelltes Word-Dokument.
Ein Browser kann ``.docx`` nicht drucken, und auf dem Server steht weder Word
noch LibreOffice zur Verfuegung. Der Papierausdruck entstand deshalb frueher
als frei gebaute HTML-Seite - die sah dem versendeten Blatt aber ueberhaupt
nicht aehnlich. Genau das wurde aus dem Laden gemeldet.

Dieses Modul setzt stattdessen dieselbe Seite noch einmal: gleiche
Kopfzeilen, gleiche vier Spalten, gleiche Reihenfolge, alle Katalogzeilen.
Grundlage ist der Aufbau von ``vorlage/freundl-werktag.docx``:

    Bestellung/Lieferschein            Datum: 04.09.2026
    Kd.-Nr. 1190 / Tour-Nr. 87
    Bitte zweite Seite anschauen                       (rot)

    | Artikel Nr | Artikelbezeichnung | Bestell Menge | Retouren Menge |

Die Spaltenbreiten stammen aus der Vorlage (Angaben in dxa, also
Zwanzigstel-Punkt) und werden auf die nutzbare Seitenbreite umgerechnet:
1282 / 2717 / 1690 / 2578.
"""

from fpdf import FPDF

# Spaltenbreiten der Word-Tabelle in dxa - Verhaeltnis bleibt erhalten.
SPALTEN_DXA = (1282, 2717, 1690, 2578)
NUTZBARE_BREITE = 180.0          # A4 (210 mm) minus 15 mm Rand je Seite

HINWEIS = "Bitte zweite Seite anschauen"


def _breiten():
    gesamt = float(sum(SPALTEN_DXA))
    return [NUTZBARE_BREITE * w / gesamt for w in SPALTEN_DXA]


def latin1(text):
    """fpdf2 kann mit den Kernschriften nur Latin-1 - Rest ersetzen."""
    return str(text or "").encode("latin-1", "replace").decode("latin-1")


def _menge(wert):
    """Ganze Zahlen ohne Nachkomma, Bruchteile mit Komma (0,5 Retouren)."""
    try:
        z = float(wert)
    except (TypeError, ValueError):
        return ""
    if not z:
        return ""
    if abs(z - round(z)) < 0.01:
        return str(int(round(z)))
    return f"{z:.1f}".replace(".", ",")


def _kopf(p, datum_de, kd_nr, tour_nr, testbetrieb, korrektur):
    p.set_font("Helvetica", "", 11)
    p.cell(90, 7, latin1("Bestellung/Lieferschein"))
    p.cell(0, 7, latin1(f"Datum: {datum_de}"), new_x="LMARGIN", new_y="NEXT")

    zeile = f"Kd.-Nr. {kd_nr}" if kd_nr else ""
    if tour_nr:
        zeile = (zeile + " / " if zeile else "") + f"Tour-Nr. {tour_nr}"
    if zeile:
        p.cell(0, 7, latin1(zeile), new_x="LMARGIN", new_y="NEXT")

    # Der Hinweis steht in der Vorlage rot - er gehoert zum Blatt dazu.
    p.set_text_color(192, 0, 0)
    p.cell(0, 7, latin1(HINWEIS), new_x="LMARGIN", new_y="NEXT")
    p.set_text_color(0, 0, 0)

    if korrektur:
        p.set_font("Helvetica", "B", 11)
        p.cell(0, 7, latin1("KORREKTUR - ersetzt die vorherige Bestellung"),
               new_x="LMARGIN", new_y="NEXT")
        p.set_font("Helvetica", "", 11)

    if testbetrieb:
        # Muss ins Auge springen: Das Blatt gehoert zu KEINER echten Bestellung.
        p.ln(1)
        p.set_fill_color(255, 243, 205)
        p.set_draw_color(230, 180, 60)
        p.set_font("Helvetica", "B", 10)
        p.cell(0, 8, latin1("TESTBETRIEB - diese Bestellung ist keine echte Bestellung"),
               border=1, align="C", fill=True, new_x="LMARGIN", new_y="NEXT")
        p.set_draw_color(0, 0, 0)
        p.set_font("Helvetica", "", 11)
    p.ln(3)


def _tabellenkopf(p):
    breiten = _breiten()
    p.set_font("Helvetica", "B", 10)
    for breite, text in zip(breiten, ("Artikel Nr", "Artikelbezeichnung",
                                      "Bestell Menge", "Retouren Menge")):
        p.cell(breite, 8, latin1(text), border=1)
    p.ln()
    p.set_font("Helvetica", "", 10)


def build_formular(positionen, datum_de, kd_nr="", tour_nr="",
                   testbetrieb=False, korrektur=False):
    """Baut das Blatt und gibt die PDF-Bytes.

    ``positionen`` sind dicts mit nummer, name, menge, retoure - und zwar
    **alle** Katalogzeilen, so wie im Word-Formular. Leere Felder bleiben
    leer, damit man notfalls mit dem Stift nachtragen kann.
    """
    p = FPDF(format="A4")
    p.set_auto_page_break(True, margin=15)
    p.set_margins(15, 12, 15)
    p.add_page()

    _kopf(p, datum_de, kd_nr, tour_nr, testbetrieb, korrektur)
    _tabellenkopf(p)

    breiten = _breiten()
    hoehe = 6.2
    bestellt = 0
    stueck = 0
    for pos in positionen:
        # Seitenumbruch von Hand, damit der Tabellenkopf mitwandert - sonst
        # steht die zweite Seite ohne Beschriftung da.
        if p.get_y() + hoehe > p.h - 15:
            p.add_page()
            _tabellenkopf(p)
        menge = pos.get("menge") or 0
        retoure = pos.get("retoure") or 0
        try:
            stueck += int(menge or 0)
        except (TypeError, ValueError):
            pass
        if menge or retoure:
            bestellt += 1
        name = (pos.get("name") or "") + (" *" if pos.get("zusatz") else "")
        p.cell(breiten[0], hoehe, latin1(pos.get("nummer") or ""),
               border=1, align="C")
        p.cell(breiten[1], hoehe, latin1(name), border=1)
        p.cell(breiten[2], hoehe, latin1(_menge(menge)), border=1)
        p.cell(breiten[3], hoehe, latin1(_menge(retoure)), border=1)
        p.ln()

    p.ln(3)
    p.set_font("Helvetica", "I", 8)
    if any(x.get("zusatz") for x in positionen):
        p.cell(0, 4, latin1("* nur fuer diesen Tag zusaetzlich bestellt"),
               new_x="LMARGIN", new_y="NEXT")
    p.cell(0, 4, latin1(f"{bestellt} Positionen, {stueck} Stueck"),
           new_x="LMARGIN", new_y="NEXT")

    aus = p.output()
    return bytes(aus)
