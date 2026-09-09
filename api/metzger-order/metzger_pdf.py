"""Erzeugt das Metzger-Bestellformular als PDF (Spec F11).

Vom Papierformular gibt es nur einen Scan, keine ausfuellbare Vorlage. Das
Formular wird deshalb neu gesetzt - im selben Aufbau wie das Papier: Nummer,
Bezeichnung, Bestellung. **Alle** Katalogzeilen erscheinen in der gewohnten
Reihenfolge; nicht bestellte tragen einen Strich, genau wie auf dem Zettel.

Zeichensatz
-----------
``fpdf2`` bringt Helvetica mit, das nur **Latin-1** kann. Umlaute liegen darin,
typografische Zeichen wie ``x`` (U+00D7), Gedankenstriche oder Bruchzeichen
dagegen nicht - fpdf2 wirft dann mitten im Versand eine Ausnahme. ``latin1()``
ersetzt die bekannten Faelle und faellt sonst auf ``?`` zurueck. Der Versand
darf an einem Zeichen niemals scheitern.
"""
from fpdf import FPDF

import metzger_portionen as P
from shared import pdf_notiz
from shared import richtext

_ERSATZ = {
    "\u00d7": "x",                                        # Multiplikationszeichen
    "\u00bc": "1/4", "\u00bd": "1/2", "\u00be": "3/4",    # Bruchzeichen
    "1\u00bd": "1 1/2",
    "\u2013": "-", "\u2014": "-", "\u2212": "-",          # Gedankenstriche
    "\u201e": '"', "\u201c": '"', "\u201d": '"',
    "\u201a": "'", "\u2018": "'", "\u2019": "'",
    "\u2026": "...",
    "\u00a0": " ", "\u202f": " ", "\u2009": " ",
    "\u2022": "-", "\u00b7": "-",
    "\u20ac": "EUR",
    "\u2713": "x", "\u2717": "-",
}


def latin1(text):
    """Text so bereinigen, dass Helvetica ihn sicher setzen kann."""
    s = str(text or "")
    for such, ersatz in _ERSATZ.items():
        s = s.replace(such, ersatz)
    return s.encode("latin-1", "replace").decode("latin-1")


class Formular(FPDF):
    def __init__(self, kopf, notiz_bloecke=None):
        super().__init__(orientation="P", unit="mm", format="A4")
        self.kopf_text = kopf
        # Der Hinweis des Dorfladens steht auf der ersten Seite zwischen
        # Kopfzeile und Tabelle - dort wird er zuerst gelesen (F3).
        self.notiz_bloecke = notiz_bloecke or []
        self.set_auto_page_break(auto=True, margin=14)

    def header(self):
        self.set_font("Helvetica", "B", 13)
        self.cell(0, 7, latin1("Bestellung Dorfladen Oberornau"), ln=1)
        self.set_font("Helvetica", "", 9)
        self.cell(0, 5, latin1(self.kopf_text), ln=1)
        self.ln(1)
        if self.page_no() == 1 and self.notiz_bloecke:
            pdf_notiz.zeichne(self, self.notiz_bloecke, latin1, umbruch=False)
            self.ln(2)
        self._spaltenkopf()

    def _spaltenkopf(self):
        self.set_font("Helvetica", "B", 8)
        self.set_fill_color(238, 240, 243)
        self.cell(16, 6, latin1("Nr."), border=1, align="R", fill=True)
        self.cell(74, 6, latin1("Artikel-Bez."), border=1, fill=True)
        self.cell(0, 6, latin1("Bestellung"), border=1, ln=1, fill=True)

    def footer(self):
        self.set_y(-12)
        self.set_font("Helvetica", "", 7)
        self.set_text_color(120, 120, 120)
        self.cell(0, 5, latin1(f"Seite {self.page_no()}/{{nb}}"), align="C")
        self.set_text_color(0, 0, 0)


def build_pdf(artikel, positionen, datum_iso, kd_nr="", korrektur=False,
              erstellt="", notiz=None):
    """Formular-PDF als ``bytes``.

    ``artikel``    Katalog in Formularreihenfolge (alle Zeilen)
    ``positionen`` erfasste Positionen der Bestellung
    ``notiz``      optionaler Hinweis des Dorfladens (F3); ohne ihn sieht das
                   Blatt aus wie bisher
    """
    von_nummer, von_name = {}, {}
    for p in positionen:
        p = P.normalisiere_position(p)
        if not P.bestellt(p):
            continue
        if p.get("nummer"):
            von_nummer[p["nummer"]] = p
        elif p.get("name"):
            von_name[p["name"].strip().lower()] = p

    titel = "Korrektur der Bestellung" if korrektur else "Bestellung"
    kopf = f"{titel} fuer {_wochentag(datum_iso)}, den {_datum_de(datum_iso)}"
    if kd_nr:
        kopf += f"   .   Kd.-Nr. {kd_nr}"
    if erstellt:
        kopf += f"   .   erstellt {erstellt}"

    pdf = Formular(kopf, richtext.als_bloecke(richtext.html_aus(notiz)))
    pdf.alias_nb_pages()
    pdf.add_page()

    benutzt = set()
    for a in artikel:
        if not a.get("auf_formular", True):
            continue
        nummer = a.get("nummer")
        pos = None
        if nummer and nummer in von_nummer:
            pos = von_nummer[nummer]
            benutzt.add(id(pos))
        else:
            pos = von_name.get((a.get("name") or "").strip().lower())
            if pos is not None:
                benutzt.add(id(pos))
        _zeile(pdf, nummer, a.get("name", ""), pos)

    # Positionen, die zu keiner Formularzeile gehoeren (Zusatzartikel, F8).
    extra = [p for p in list(von_nummer.values()) + list(von_name.values())
             if id(p) not in benutzt]
    if extra:
        pdf.ln(2)
        pdf.set_font("Helvetica", "B", 9)
        pdf.cell(0, 6, latin1("Zusaetzlich"), ln=1)
        pdf._spaltenkopf()
        for p in extra:
            _zeile(pdf, p.get("nummer"), p.get("name", ""), p)

    s = P.summen([P.normalisiere_position(p) for p in positionen])
    kg = f"{s['kg']:.1f}".replace(".", ",")
    pdf.ln(3)
    pdf.set_font("Helvetica", "B", 9)
    pdf.cell(0, 5, latin1(f"{s['positionen']} Positionen   .   {kg} kg"), ln=1)
    pdf.set_font("Helvetica", "", 9)
    pdf.cell(0, 5, latin1(f"Davon vakuumiert: {s['vakuum']} Portionen"), ln=1)

    out = pdf.output(dest="S")
    return bytes(out) if not isinstance(out, str) else out.encode("latin-1")


def _umbrechen(pdf, text, breite):
    """Text in Zeilen zerlegen, die in ``breite`` Millimeter passen.

    Gebrochen wird an Leerzeichen. Ein einzelnes ueberlanges Wort bleibt
    stehen und ragt lieber etwas heraus, als dass es zerschnitten wird -
    abgeschnittener Text war genau der Fehler, den diese Funktion behebt.
    """
    zeilen, laufend = [], ""
    for wort in str(text).split(" "):
        versuch = f"{laufend} {wort}".strip()
        if laufend and pdf.get_string_width(versuch) > breite:
            zeilen.append(laufend)
            laufend = wort
        else:
            laufend = versuch
    zeilen.append(laufend)
    return zeilen or [""]


def _zeile(pdf, nummer, name, pos):
    """Eine Formularzeile. Ohne Bestellung steht dort ein Strich.

    Die Bestellspalte wurde frueher hart bei 70 Zeichen abgeschnitten. Bei
    mehreren Portionsgroessen fehlten dem Metzger dadurch stillschweigend
    Positionen - er lieferte weniger, als bestellt war. Die Spalte bricht
    jetzt um und die Zeile waechst mit.
    """
    text = P.position_text(pos, kurz_vakuum=True) if pos else "\u2014"
    zeilenhoehe = 5.6
    breite_best = pdf.w - pdf.l_margin - pdf.r_margin - 16 - 74

    pdf.set_font("Helvetica", "B" if pos else "", 8)
    zeilen = _umbrechen(pdf, " " + latin1(text), breite_best - 1)
    hoehe = zeilenhoehe * len(zeilen)

    # Passt die gewachsene Zeile nicht mehr aufs Blatt, beginnt sie oben auf
    # dem naechsten - eine ueber den Seitenrand laufende Zeile waere wieder
    # ein Stueck fehlende Bestellung.
    if pdf.get_y() + hoehe > pdf.page_break_trigger:
        pdf.add_page()

    x0, y0 = pdf.get_x(), pdf.get_y()
    pdf.set_font("Helvetica", "", 8)
    pdf.cell(16, hoehe, latin1(nummer if nummer else "-"), border=1, align="R")
    pdf.cell(74, hoehe, latin1(name)[:44], border=1)

    if pos:
        pdf.set_font("Helvetica", "B", 8)
    pdf.multi_cell(breite_best, zeilenhoehe, "\n".join(zeilen), border=1)
    pdf.set_xy(x0, y0 + hoehe)


def _datum_de(datum_iso):
    from datetime import datetime
    try:
        return datetime.strptime(datum_iso, "%Y-%m-%d").strftime("%d.%m.%Y")
    except Exception:
        return datum_iso


def _wochentag(datum_iso):
    from datetime import datetime
    tage = ["Montag", "Dienstag", "Mittwoch", "Donnerstag", "Freitag",
            "Samstag", "Sonntag"]
    try:
        return tage[datetime.strptime(datum_iso, "%Y-%m-%d").weekday()]
    except Exception:
        return ""
