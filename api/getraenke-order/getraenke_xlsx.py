"""Bestellformular für Kratzer als Excel-Mappe (.xlsx).

Aus der Beschwerde des Lieferanten:

    „diese Übersicht ist für uns sehr ungünstig. Bitte nehmen Sie zukünftig
     unsere Bestellliste inkl. Bestell-Nr."

Bisher ging reiner Text ohne Artikelnummern. Kratzer muss die Bestellung aber
in sein System übernehmen, und dafür braucht es die **Bestell-Nr.** Die Mappe
folgt deshalb dem Aufbau des Formulars, das Kratzer selbst geschickt hat:

    A  Art.-Nr.       Breite 10
    B  Bezeichnung    Breite 49
    C  Menge          Breite  6

**Ohne zusätzliche Abhängigkeit.** Eine .xlsx-Datei ist ein ZIP mit ein paar
XML-Teilen; beides bringt Python mit. ``openpyxl`` wäre bequemer, aber die
Azure-Function läuft auf dem Linux-Consumption-Plan, und dort ist jede
weitere Abhängigkeit ein Risiko beim Ausrollen - dieselbe Überlegung wie bei
``fpdf2``/``pypdf`` in ``requirements.txt``.

Geschrieben wird mit **inline strings** statt der üblichen gemeinsamen
Zeichenkettentabelle: Das spart einen ganzen XML-Teil und die Buchhaltung
darüber. Excel, LibreOffice und Google Tabellen lesen beides.
"""
import re
import zipfile
from io import BytesIO
from xml.sax.saxutils import escape

# Spaltenbreiten. B und C wie im Formular des Lieferanten; A ist etwas
# breiter als dessen 10,14 - sonst passen die Kopfbeschriftungen
# („Liefertag", „Kd.-Nr.") nicht, und die fünfstelligen Artikelnummern
# stehen ohnehin darin bequem.
BREITEN = [12.0, 48.86, 8.0]
KOPF = ["Art.-Nr.", "Bezeichnung", "Menge"]


def _spalte(i):
    """0 -> A, 1 -> B, … (mehr als 26 Spalten braucht das Formular nicht)."""
    name = ""
    i += 1
    while i:
        i, rest = divmod(i - 1, 26)
        name = chr(65 + rest) + name
    return name


def _zelle(ref, wert, stil=0):
    """Eine Zelle. Zahlen als Zahl, alles andere als Text."""
    if wert is None or wert == "":
        return f'<c r="{ref}" s="{stil}"/>'
    if isinstance(wert, (int, float)) and not isinstance(wert, bool):
        return f'<c r="{ref}" s="{stil}"><v>{wert}</v></c>'
    text = escape(str(wert))
    return (f'<c r="{ref}" s="{stil}" t="inlineStr">'
            f'<is><t xml:space="preserve">{text}</t></is></c>')


def _blatt(zeilen, kopfzeilen):
    """Das Arbeitsblatt als XML.

    ``kopfzeilen`` bleiben beim Rollen stehen und werden beim Drucken auf
    jeder Seite wiederholt - bei über fünfzig Artikeln sonst mühsam.
    """
    cols = "".join(
        f'<col min="{i+1}" max="{i+1}" width="{b}" customWidth="1"/>'
        for i, b in enumerate(BREITEN))

    xml = []
    for nr, werte in enumerate(zeilen, 1):
        zellen = "".join(
            _zelle(f"{_spalte(i)}{nr}", w, s)
            for i, (w, s) in enumerate(werte))
        xml.append(f'<row r="{nr}">{zellen}</row>')

    frieren = ""
    if kopfzeilen:
        frieren = (f'<sheetView workbookViewId="0">'
                   f'<pane ySplit="{kopfzeilen}" topLeftCell="A{kopfzeilen+1}"'
                   f' activePane="bottomLeft" state="frozen"/>'
                   f'</sheetView>')
    else:
        frieren = '<sheetView workbookViewId="0"/>'

    return (
        '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
        '<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">'
        f'<sheetViews>{frieren}</sheetViews>'
        f'<cols>{cols}</cols>'
        f'<sheetData>{"".join(xml)}</sheetData>'
        '<pageMargins left="0.5" right="0.5" top="0.6" bottom="0.6"'
        ' header="0.3" footer="0.3"/>'
        '<pageSetup paperSize="9" orientation="portrait" fitToWidth="1"/>'
        '</worksheet>'
    )


# Vier Stile: 0 normal, 1 fett (Kopf), 2 Titel, 3 grau (Hinweis).
_STYLES = (
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
    '<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">'
    '<fonts count="4">'
    '<font><sz val="11"/><name val="Calibri"/></font>'
    '<font><b/><sz val="11"/><name val="Calibri"/></font>'
    '<font><b/><sz val="14"/><name val="Calibri"/></font>'
    '<font><sz val="10"/><color rgb="FF666666"/><name val="Calibri"/></font>'
    '</fonts>'
    '<fills count="3">'
    '<fill><patternFill patternType="none"/></fill>'
    '<fill><patternFill patternType="gray125"/></fill>'
    '<fill><patternFill patternType="solid">'
    '<fgColor rgb="FFEFEFEF"/><bgColor indexed="64"/></patternFill></fill>'
    '</fills>'
    '<borders count="2">'
    '<border><left/><right/><top/><bottom/><diagonal/></border>'
    '<border><left/><right/><top/>'
    '<bottom style="thin"><color rgb="FF999999"/></bottom><diagonal/></border>'
    '</borders>'
    '<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>'
    '<cellXfs count="4">'
    '<xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>'
    '<xf numFmtId="0" fontId="1" fillId="2" borderId="1" xfId="0" applyFont="1"'
    ' applyFill="1" applyBorder="1"/>'
    '<xf numFmtId="0" fontId="2" fillId="0" borderId="0" xfId="0" applyFont="1"/>'
    '<xf numFmtId="0" fontId="3" fillId="0" borderId="0" xfId="0" applyFont="1"/>'
    '</cellXfs>'
    '<cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles>'
    '</styleSheet>'
)

_CONTENT_TYPES = (
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
    '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">'
    '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>'
    '<Default Extension="xml" ContentType="application/xml"/>'
    '<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>'
    '<Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>'
    '<Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>'
    '</Types>'
)

_RELS = (
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
    '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'
    '<Relationship Id="rId1" Target="xl/workbook.xml"'
    ' Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument"/>'
    '</Relationships>'
)

_WB_RELS = (
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
    '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'
    '<Relationship Id="rId1" Target="worksheets/sheet1.xml"'
    ' Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet"/>'
    '<Relationship Id="rId2" Target="styles.xml"'
    ' Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles"/>'
    '</Relationships>'
)


def _workbook(blattname):
    return (
        '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
        '<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"'
        ' xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">'
        f'<sheets><sheet name="{escape(blattname)}" sheetId="1" r:id="rId1"/></sheets>'
        '</workbook>'
    )


def _nummer_kurz(nummer):
    """``KA50071`` -> ``50071``.

    Die Nummern liegen bei uns mit dem Kuerzel der Quelle davor (``KA`` fuer
    Kratzer). Auf dem Formular des Lieferanten steht die blanke Nummer - so
    bekommt er sie auch zurueck. Traegt ein Artikel keine echte Nummer, bleibt
    das Feld leer; einen Platzhalter wie ``AHO-ORANGE-SPORT`` zu schicken
    waere schlimmer als nichts, denn er sieht wie eine Nummer aus.
    """
    n = str(nummer or "").strip()
    m = re.match(r"^KA0*(\d+)$", n)
    return m.group(1) if m else ""


def build_xlsx(positionen, datum_de, wochentag, kd_nr="", tour="",
               korrektur=False, notiz="", erstellt="", cfg=None):
    """Die Bestellung als Excel-Mappe, zurueck als ``bytes``.

    ``positionen`` sind die **bestellten** Zeilen. Der Lieferant bekommt
    damit genau das, was er eintippen muss - nicht den ganzen Katalog mit
    fuenfzig leeren Zeilen dazwischen.

    ``cfg`` liefert die Kopfangaben (Absender, Telefon, Fax des Lieferanten).
    Fehlt sie, bleiben die Zeilen weg statt falsche Angaben zu zeigen.
    """
    c = cfg or {}
    titel = "Korrektur der Bestellung" if korrektur else "Bestellung"

    def zeile(links="", rechts="", stil_l=0, stil_r=0):
        return [(links, stil_l), (rechts, stil_r), ("", 0)]

    # ── Kopf ────────────────────────────────────────────────────────────
    # Aufbau wie auf dem Formular des Lieferanten: oben der Titel, darunter
    # an WEN es geht und von WEM es kommt. Aus dem Laden: „bau auch einen
    # sinnvollen Header in Excel, so dass der Kunde weiß, von wem die
    # Bestellung stammt."
    zeilen = [zeile(titel, "", 2)]
    zeilen.append(zeile("", ""))

    empf = c.get("name") or "Getr\u00e4nke Kratzer"
    zeilen.append(zeile("An", empf, 3, 1))
    if c.get("lieferant_fax"):
        zeilen.append(zeile("Fax", c["lieferant_fax"], 3))
    zeilen.append(zeile("", ""))

    absender = c.get("absender") or "Dorfladen Oberornau UG"
    zeilen.append(zeile("Von", absender, 3, 1))
    for feld in ("absender_strasse", "absender_ort"):
        if c.get(feld):
            zeilen.append(zeile("", c[feld]))
    if c.get("absender_telefon"):
        zeilen.append(zeile("Telefon", c["absender_telefon"], 3))
    if kd_nr:
        # Die Kundennummer ist das, womit der Lieferant uns zuordnet -
        # sie gehoert in den Kopf, nicht in eine Fusszeile.
        zeilen.append(zeile("Kd.-Nr.", str(kd_nr), 3, 1))
    if tour:
        zeilen.append(zeile("Tour", str(tour), 3))

    zeilen.append(zeile("", ""))
    zeilen.append(zeile("Liefertag", f"{wochentag}, {datum_de}", 3, 1))
    if erstellt:
        zeilen.append(zeile("Erstellt", erstellt, 3))
    zeilen.append(zeile("", ""))

    kopfzeilen_bis = len(zeilen) + 1          # Spaltenkopf mit einfrieren
    zeilen.append([(KOPF[0], 1), (KOPF[1], 1), (KOPF[2], 1)])

    gesamt = 0
    for p in positionen:
        menge = int(p.get("menge") or 0)
        if menge <= 0:
            continue
        gesamt += menge
        # Bezeichnung in der Schreibweise des LIEFERANTEN: Name + Gebinde,
        # genau wie auf seinem Formular („Augustiner Hell 20x0,50"). Unser
        # `bestelltext` ist die gewachsene Schreibweise des Ladens
        # („Augustiner hell 0,5l") - die traegt die Groesse schon im Text
        # und ergaebe zusammen mit dem Gebinde „0,5l 20x0,50".
        bez = (p.get("name") or p.get("bestelltext") or "").strip()
        geb = (p.get("gebinde") or "").strip()
        if geb and geb not in bez:
            bez = f"{bez} {geb}".strip()
        zeilen.append([
            (_nummer_kurz(p.get("nummer")), 0),
            (bez, 0),
            (menge, 0),
        ])

    zeilen.append([("", 0), ("", 0), ("", 0)])
    zeilen.append([("", 0), ("Summe Kisten", 1), (gesamt, 1)])

    if (notiz or "").strip():
        zeilen.append([("", 0), ("", 0), ("", 0)])
        zeilen.append([("Hinweis vom Dorfladen:", 1), ("", 0), ("", 0)])
        for stueck in str(notiz).strip().splitlines():
            zeilen.append([(stueck, 0), ("", 0), ("", 0)])

    puffer = BytesIO()
    with zipfile.ZipFile(puffer, "w", zipfile.ZIP_DEFLATED) as z:
        z.writestr("[Content_Types].xml", _CONTENT_TYPES)
        z.writestr("_rels/.rels", _RELS)
        z.writestr("xl/workbook.xml", _workbook("Bestellung"))
        z.writestr("xl/_rels/workbook.xml.rels", _WB_RELS)
        z.writestr("xl/styles.xml", _STYLES)
        z.writestr("xl/worksheets/sheet1.xml", _blatt(zeilen, kopfzeilen_bis))
    return puffer.getvalue()


def dateiname(datum_iso, korrektur=False):
    """``Bestellung-Dorfladen-Oberornau-2026-09-29.xlsx``"""
    vorn = "Korrektur" if korrektur else "Bestellung"
    return f"{vorn}-Dorfladen-Oberornau-{datum_iso}.xlsx"
