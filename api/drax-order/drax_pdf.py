"""Bildet das Papier-Bestellformular der Drax Muehle als PDF nach (Spec F5, F7).

Grundlage ist das Blatt, das im Laden bisher von Hand ausgefuellt wurde
(``Drax/WhatsApp Image 2026-10-06 at 15.00.20.jpeg``)::

    ┌──────────────────────┐
    │ Kunde                │            Drax Muehle
    │ Dorfladen Oberornau  │     Datum ......................
    │      KDNr 11225      │     Lieferung ..................
    └──────────────────────┘     Versand ....................

    | Stueck | Einheit | Art. Nr | Artikelbezeichnung |

Die Muehle liest dieses Blatt. Deshalb bleiben Spaltenfolge und Kopf genau
so - und deshalb steht hier die Schreibweise der Muehle, nicht die der Kasse.

**Leerzeilen zwischen den Warengruppen** gehoeren dazu: Auf dem Papier
trennen sie Mehle, Muesli und Backzutaten voneinander, und daran orientiert
sich beim Kommissionieren das Auge.

Eine Preisspalte gibt es bewusst nicht - das Papierblatt hat keine.
"""
from fpdf import FPDF

# Spaltenbreiten in mm, abgemessen am Papierblatt. Summe = 180 mm, also
# A4 (210 mm) minus 15 mm Rand je Seite.
SPALTEN = (18.0, 34.0, 30.0, 98.0)
UEBERSCHRIFTEN = ("St\u00fcck", "Einheit", "Art. Nr", "Artikelbezeichnung")

ZEILENHOEHE = 7.0
LEERZEILE = 3.5          # Abstand zwischen zwei Warengruppen

# Typografische Zeichen, die ``fpdf2`` mit den Kernschriften nicht kennt.
# Ohne diese Tabelle wuerde aus einem Apostroph ein Fragezeichen - und der
# Artikelreiter laesst freie Eingaben zu (Spec F10).
ERSATZ = {
    "\u2018": "'", "\u2019": "'", "\u201a": "'", "\u201b": "'",
    "\u201c": '"', "\u201d": '"', "\u201e": '"', "\u201f": '"',
    "\u2013": "-", "\u2014": "-", "\u2212": "-",
    "\u2026": "...", "\u00a0": " ", "\u202f": " ", "\u2009": " ",
}


def latin1(text):
    """fpdf2 kann mit den Kernschriften nur Latin-1 - Rest ersetzen."""
    s = str(text or "")
    for alt, neu in ERSATZ.items():
        s = s.replace(alt, neu)
    return s.encode("latin-1", "replace").decode("latin-1")


def _menge(wert):
    try:
        z = int(wert or 0)
    except (TypeError, ValueError):
        return ""
    return str(z) if z else "0"


def _kundenkasten(p, kd_nr, anschrift):
    """Der umrandete Kasten links oben, wie auf dem Papierblatt."""
    x, y = p.get_x(), p.get_y()
    breite, hoehe = 78.0, 26.0
    p.rect(x, y, breite, hoehe)

    p.set_xy(x + 3, y + 2)
    p.set_font("Helvetica", "B", 11)
    p.cell(breite - 6, 6, latin1("Kunde"), new_x="LMARGIN", new_y="NEXT")

    p.set_font("Helvetica", "", 11)
    zeilen = [z for z in (anschrift or []) if z][:2]
    hoehe_je = 5.5
    start = y + 10
    for i, zeile in enumerate(zeilen):
        p.set_xy(x, start + i * hoehe_je)
        p.cell(breite, hoehe_je, latin1(zeile), align="C")
    if kd_nr:
        p.set_xy(x, start + len(zeilen) * hoehe_je)
        p.set_font("Helvetica", "B", 11)
        p.cell(breite, hoehe_je, latin1(f"KDNr {kd_nr}"), align="C")
    return hoehe


def _kopfrechts(p, x, y, datum_de, liefertext):
    """Titel und die drei Zeilen Datum / Lieferung / Versand."""
    breite = 180.0 - (x - p.l_margin)
    p.set_xy(x, y)
    p.set_font("Helvetica", "B", 16)
    p.cell(breite, 9, latin1("Drax M\u00fchle"), align="C")

    p.set_font("Helvetica", "", 11)
    zeilen = [
        ("Datum", datum_de),
        ("Lieferung", liefertext),
        ("Versand", ""),
    ]
    for i, (beschriftung, wert) in enumerate(zeilen):
        oben = y + 11 + i * 6
        p.set_xy(x, oben)
        p.cell(22, 6, latin1(beschriftung))
        if wert:
            p.set_font("Helvetica", "B", 11)
            p.cell(breite - 22, 6, latin1(wert))
            p.set_font("Helvetica", "", 11)
        else:
            # Leere Felder bekommen die Ausfuelllinie des Papierblattes -
            # „Versand" traegt der Laden von Hand nach.
            p.set_draw_color(140, 140, 140)
            p.line(x + 23, oben + 5, x + breite - 2, oben + 5)
            p.set_draw_color(0, 0, 0)


def _kopf(p, datum_de, liefertext, kd_nr, anschrift, testbetrieb,
          korrektur, erstdatum):
    oben = p.get_y()
    hoehe = _kundenkasten(p, kd_nr, anschrift)
    _kopfrechts(p, p.l_margin + 86.0, oben, datum_de, liefertext)
    p.set_xy(p.l_margin, oben + hoehe + 4)

    if korrektur:
        # Ueber die volle Breite, nicht in die schmale rechte Spalte: Der
        # Satz ist laenger als der Platz dort und lief sonst ueber den Rand.
        p.set_text_color(192, 0, 0)
        p.set_font("Helvetica", "B", 11)
        hinweis = "KORREKTUR"
        if erstdatum:
            hinweis += f" - ersetzt die Bestellung vom {erstdatum}"
        p.cell(0, 7, latin1(hinweis), new_x="LMARGIN", new_y="NEXT")
        p.set_text_color(0, 0, 0)
        p.set_font("Helvetica", "", 11)
        p.ln(1)

    if testbetrieb:
        # Muss ins Auge springen: Das Blatt gehoert zu KEINER echten Bestellung.
        p.set_fill_color(255, 243, 205)
        p.set_draw_color(230, 180, 60)
        p.set_font("Helvetica", "B", 10)
        p.cell(0, 8,
               latin1("TESTBETRIEB - diese Bestellung ist keine echte Bestellung"),
               border=1, align="C", fill=True, new_x="LMARGIN", new_y="NEXT")
        p.set_draw_color(0, 0, 0)
        p.set_font("Helvetica", "", 11)
        p.ln(2)
    else:
        p.ln(2)


def _tabellenkopf(p):
    p.set_font("Helvetica", "B", 10)
    p.set_fill_color(240, 240, 240)
    for breite, text in zip(SPALTEN, UEBERSCHRIFTEN):
        p.cell(breite, 8, latin1(text), border=1, align="L", fill=True)
    p.ln()
    p.set_font("Helvetica", "", 11)


def _zeile(p, pos):
    """Eine Positionszeile. Gestrichene werden durchgestrichen dargestellt."""
    gestrichen = bool(pos.get("gestrichen"))
    geaendert = bool(pos.get("geaendert"))

    if gestrichen:
        p.set_text_color(130, 130, 130)
    elif geaendert:
        p.set_font("Helvetica", "B", 11)

    y = p.get_y()
    felder = (
        (SPALTEN[0], _menge(pos.get("menge")), "C"),
        (SPALTEN[1], pos.get("einheit") or "", "C"),
        (SPALTEN[2], pos.get("nr") or "", "C"),
        (SPALTEN[3], pos.get("name") or "", "L"),
    )
    for breite, text, richtung in felder:
        p.cell(breite, ZEILENHOEHE, latin1(text), border=1, align=richtung)
    p.ln()

    if gestrichen:
        # Der Strich ersetzt das Durchstreichen auf dem Papier: Die Muehle
        # sieht, dass diese Position wegfaellt - und welche es war.
        p.set_draw_color(130, 130, 130)
        mitte = y + ZEILENHOEHE / 2
        p.line(p.l_margin, mitte, p.l_margin + sum(SPALTEN), mitte)
        p.set_draw_color(0, 0, 0)
        p.set_text_color(0, 0, 0)
    if geaendert:
        p.set_font("Helvetica", "", 11)


def _gruppiere(positionen, gruppen):
    """Positionen nach Warengruppe buendeln, Reihenfolge des Katalogs.

    Gibt eine Liste von Buendeln. Positionen ohne bekannte Gruppe bilden ein
    eigenes Buendel am Ende - sie verschwinden nicht stillschweigend.
    """
    folge = {}
    for g in gruppen or []:
        kennung = g.get("id") if isinstance(g, dict) else str(g)
        if kennung:
            folge.setdefault(kennung, len(folge))

    buendel = {}
    for pos in positionen or []:
        g = pos.get("gruppe") or ""
        folge.setdefault(g, len(folge))
        buendel.setdefault(g, []).append(pos)

    return [buendel[g] for g in sorted(buendel, key=lambda g: folge.get(g, 999))]


def _fuss(p, positionen, anschrift):
    # Gestrichene Zeilen stehen auf dem Blatt, sind aber keine Bestellung -
    # sie zaehlen deshalb weder bei den Positionen noch beim Stueck mit.
    aktiv = [x for x in positionen if not x.get("gestrichen")]
    anzahl = len(aktiv)
    stueck = 0
    for pos in aktiv:
        try:
            stueck += int(pos.get("menge") or 0)
        except (TypeError, ValueError):
            continue

    p.ln(4)
    p.set_font("Helvetica", "", 10)
    wort = "Position" if anzahl == 1 else "Positionen"
    p.cell(0, 5, latin1(f"{anzahl} {wort}, {stueck} St\u00fcck"),
           new_x="LMARGIN", new_y="NEXT")
    if any(x.get("gestrichen") for x in positionen):
        p.set_font("Helvetica", "I", 9)
        p.cell(0, 5,
               latin1("Durchgestrichene Zeilen entfallen gegen\u00fcber der "
                      "vorherigen Bestellung."),
               new_x="LMARGIN", new_y="NEXT")

    p.ln(2)
    p.set_font("Helvetica", "I", 9)
    for zeile in (anschrift or []):
        if zeile:
            p.cell(0, 4, latin1(zeile), new_x="LMARGIN", new_y="NEXT")


def build_formular(positionen, datum_de, liefertext="", kd_nr="",
                   anschrift=None, gruppen=None, testbetrieb=False,
                   korrektur=False, erstdatum=""):
    """Baut das Blatt und gibt die PDF-Bytes.

    ``positionen`` sind dicts mit ``nr``, ``name``, ``einheit``, ``gruppe``
    und ``menge`` - und zwar **nur die bestellten**. Anders als beim Baecker
    wird nicht der ganze Katalog gedruckt: Das Papierblatt der Muehle ist
    leer und wird zeilenweise gefuellt, 96 Artikel wuerden drei Seiten
    fuellen, von denen zwei leer waeren.

    Eine Position darf ``gestrichen`` tragen (Korrektur, entfaellt) oder
    ``geaendert`` (Korrektur, neue Menge) - siehe Spec F7.
    """
    p = FPDF(format="A4")
    p.set_auto_page_break(False)
    p.set_margins(15, 12, 15)
    p.add_page()

    _kopf(p, datum_de, liefertext, kd_nr, anschrift, testbetrieb,
          korrektur, erstdatum)
    _tabellenkopf(p)

    untergrenze = p.h - 25
    for i, gruppe in enumerate(_gruppiere(positionen, gruppen)):
        if i:
            # Leerzeile zwischen den Warengruppen - wie auf dem Papier.
            if p.get_y() + LEERZEILE + ZEILENHOEHE <= untergrenze:
                p.ln(LEERZEILE)
        for pos in gruppe:
            # Seitenumbruch von Hand, damit der Tabellenkopf mitwandert -
            # sonst staende die zweite Seite ohne Beschriftung da.
            if p.get_y() + ZEILENHOEHE > untergrenze:
                p.add_page()
                _tabellenkopf(p)
            _zeile(p, pos)

    _fuss(p, positionen or [], anschrift)
    return bytes(p.output())
