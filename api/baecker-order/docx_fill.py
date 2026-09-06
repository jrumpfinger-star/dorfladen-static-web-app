"""Befuellt das Bestellformular der Baeckerei Freundl.

Statt ein Dokument neu zu bauen wird die Original-Vorlage aus den bisherigen
Bestellmails befuellt: nur Datum, Tour-Nr. und die beiden Mengenspalten werden
gesetzt. Layout, Schrift, Rahmen und Spaltenbreiten bleiben damit unveraendert.

Ein .docx ist ein ZIP mit XML-Teilen; genutzt werden ausschliesslich
`zipfile` und `xml.etree` aus der Standardbibliothek.
"""
import io
import re
import zipfile
from xml.etree import ElementTree as ET

W = "http://schemas.openxmlformats.org/wordprocessingml/2006/main"
w = lambda tag: f"{{{W}}}{tag}"  # noqa: E731

DOC_PART = "word/document.xml"


# ──────────────────────────────────────────────────────────────────────
#  XML-Grundlagen
# ──────────────────────────────────────────────────────────────────────

def _register_namespaces(xml_text):
    """Alle im Dokument deklarierten Praefixe registrieren, damit sie beim
    Serialisieren erhalten bleiben (sonst wuerden daraus ns0, ns1, …)."""
    for prefix, uri in set(re.findall(r'xmlns:(\w+)="([^"]+)"', xml_text)):
        try:
            ET.register_namespace(prefix, uri)
        except ValueError:
            pass


def _root_tag(xml_text):
    """Original-Starttag von <w:document …> inklusive aller Namespace-
    Deklarationen und mc:Ignorable."""
    m = re.search(r"<w:document\b[^>]*>", xml_text)
    return m.group(0) if m else None


def _serialize(root, original_xml):
    """Baum serialisieren und den Starttag durch das Original ersetzen.

    ElementTree schreibt nur noch tatsaechlich benutzte Namespaces. Da
    `mc:Ignorable` aber Praefixe nennt, die sonst nirgends vorkommen, wuerde
    Word die Datei als beschaedigt melden. Deshalb wird der urspruengliche
    Starttag wieder eingesetzt.
    """
    out = ET.tostring(root, encoding="unicode")
    orig = _root_tag(original_xml)
    if orig:
        out = re.sub(r"^<[^>]*document\b[^>]*>", orig, out, count=1)
    return '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\r\n' + out


# ──────────────────────────────────────────────────────────────────────
#  Text in Absaetzen ersetzen (ueber Run-Grenzen hinweg)
# ──────────────────────────────────────────────────────────────────────

def _para_text(p):
    """Sichtbarer Text eines Absatzes. Word verteilt Text auf mehrere Runs,
    z.B. steht 'Tour-Nr. 87' als '…8' + '7' in zwei w:t-Knoten."""
    return "".join(t.text or "" for t in p.iter(w("t")))


def _replace_in_para(p, pattern, replacement):
    """Ersetzt ein Regex-Treffer im Absatztext, ohne die Formatierung zu
    verlieren: Der Treffer landet komplett im ersten beteiligten w:t-Knoten,
    die restlichen beteiligten Knoten werden geleert.

    Gibt True zurueck, wenn etwas ersetzt wurde.
    """
    nodes = list(p.iter(w("t")))
    if not nodes:
        return False
    full = "".join(n.text or "" for n in nodes)
    m = re.search(pattern, full)
    if not m:
        return False

    start, end = m.start(), m.end()
    # Rueckverweise wie \g<1> aufloesen; reine Ersatztexte bleiben unveraendert
    new_text = m.expand(replacement) if "\\g<" in replacement else replacement

    pos = 0
    first = True
    for n in nodes:
        text = n.text or ""
        n_start, n_end = pos, pos + len(text)
        pos = n_end
        if n_end <= start or n_start >= end:
            continue  # Knoten liegt ausserhalb des Treffers
        vor = text[: max(0, start - n_start)]
        nach = text[max(0, end - n_start):] if n_end > end else ""
        if first:
            n.text = vor + new_text + nach
            first = False
        else:
            n.text = vor + nach
        # Fuehrende/abschliessende Leerzeichen erhalten
        if n.text != (n.text or "").strip():
            n.set("{http://www.w3.org/XML/1998/namespace}space", "preserve")
    return True


# ──────────────────────────────────────────────────────────────────────
#  Tabellenzellen
# ──────────────────────────────────────────────────────────────────────

def _cell_text(tc):
    return " ".join("".join(t.text or "" for t in tc.iter(w("t"))).split())


def _set_cell(tc, value):
    """Setzt den Text einer Zelle auf `value` (leerer String = Zelle leeren).

    Die Zellen enthalten mehrere leere Absaetze, die die Zeilenhoehe bestimmen —
    sie bleiben erhalten. Der Wert wird in den Absatz geschrieben, der schon
    Text trug; gab es keinen, in den ersten Absatz.
    """
    paras = tc.findall(w("p"))
    if not paras:
        return

    ziel = None
    vorlage_run = None
    for p in paras:
        runs = p.findall(w("r"))
        if runs and any((t.text or "").strip() for t in p.iter(w("t"))):
            ziel = p
            vorlage_run = runs[0]
            break

    # Alle vorhandenen Runs entfernen (Text loeschen, Absaetze behalten)
    for p in paras:
        for r in p.findall(w("r")):
            p.remove(r)

    value = "" if value is None else str(value)
    if not value:
        return

    if ziel is None:
        ziel = paras[0]

    run = ET.SubElement(ziel, w("r"))
    # Zeichenformatierung des urspruenglichen Runs uebernehmen
    if vorlage_run is not None:
        rpr = vorlage_run.find(w("rPr"))
        if rpr is not None:
            run.append(rpr)
    t = ET.SubElement(run, w("t"))
    t.text = value


def _norm_nr(value):
    """Artikelnummer als Sortierschluessel: Zahlen zuerst, dann alles ohne
    Nummer. Damit steht eine frei erfasste Position am Ende."""
    s = (value or "").strip()
    return (0, int(s)) if s.isdigit() else (1, 0)


# ──────────────────────────────────────────────────────────────────────
#  Hauptfunktion
# ──────────────────────────────────────────────────────────────────────

def fill_form(template_bytes, datum, positionen, kd_nr="1190", tour_nr="87"):
    """Erzeugt das ausgefuellte Bestellformular.

    template_bytes : Inhalt der Vorlagendatei (.docx)
    datum          : Liefertag als 'TT.MM.JJJJ'
    positionen     : Liste von dicts mit nummer, name, menge, retoure
    kd_nr, tour_nr : Kopfdaten (Tour-Nr. haengt vom Wochentag ab)

    Rueckgabe: bytes des fertigen .docx
    """
    with zipfile.ZipFile(io.BytesIO(template_bytes)) as z:
        parts = {n: z.read(n) for n in z.namelist()}

    xml_text = parts[DOC_PART].decode("utf-8")
    _register_namespaces(xml_text)
    root = ET.fromstring(xml_text)
    body = root.find(w("body"))

    # ── Kopfzeilen: Datum und Tour-Nr. ──
    # \g<1> statt \1, sonst wuerde "\1" + "87" als Gruppe 187 gelesen.
    for p in body.findall(w("p")):
        text = _para_text(p)
        if "Datum:" in text:
            _replace_in_para(p, r"(?<=Datum:)(\s*)[0-9./]{6,10}", r"\g<1>" + datum)
        if "Tour-Nr." in text:
            _replace_in_para(p, r"(?<=Tour-Nr\.)(\s*)\d+", r"\g<1>" + str(tour_nr))
        if "Kd.-Nr." in text:
            _replace_in_para(p, r"(?<=Kd\.-Nr\.)(\s*)\d+", r"\g<1>" + str(kd_nr))

    # ── Tabelle: Mengen und Retouren ──
    tabellen = list(body.iter(w("tbl")))
    if not tabellen:
        raise ValueError("Vorlage enthaelt keine Tabelle")
    tbl = tabellen[0]
    rows = tbl.findall(w("tr"))

    # Positionen nach Nummer, ersatzweise nach Name zuordnen
    nach_nr, nach_name = {}, {}
    for pos in positionen:
        nr = str(pos.get("nummer") or "").strip()
        name = (pos.get("name") or "").strip()
        if nr:
            nach_nr[nr] = pos
        if name:
            nach_name[name.lower()] = pos

    kopf_row = None
    verwendet = set()

    for tr in rows:
        tcs = tr.findall(w("tc"))
        if len(tcs) < 4:
            continue
        nr = _cell_text(tcs[0])
        name = _cell_text(tcs[1])
        sp3, sp4 = _cell_text(tcs[2]), _cell_text(tcs[3])

        # Hauptkopfzeile: leere Mengenspalte beschriften (fehlt in der
        # Werktagsvorlage, die Samstagsvorlage hat dort "Bestell Menge").
        if name.lower().startswith("artikelbezeichnung"):
            kopf_row = tr
            if not sp3:
                _set_cell(tcs[2], "Bestell Menge")
            continue

        # Zwischenkopfzeilen (z.B. der Krapfen-Block traegt erneut
        # "Retouren Menge") bleiben unangetastet.
        if "retouren menge" in sp4.lower() or "bestell menge" in sp3.lower():
            continue

        pos = nach_nr.get(nr) or nach_name.get(name.lower())
        if pos is None:
            _set_cell(tcs[2], "")
            _set_cell(tcs[3], "")
            continue

        menge = pos.get("menge") or 0
        retoure = pos.get("retoure") or 0
        _set_cell(tcs[2], str(menge) if menge else "")
        _set_cell(tcs[3], str(retoure) if retoure else "")
        verwendet.add(id(pos))

    # ── Positionen, die es in der Vorlage nicht gibt: Zeile klonen ──
    rest = [p for p in positionen if id(p) not in verwendet
            and ((p.get("menge") or 0) or (p.get("retoure") or 0))]
    if rest:
        rest.sort(key=lambda p: (_norm_nr(p.get("nummer")), (p.get("name") or "")))
        # Als Muster eine echte Artikelzeile nehmen (nicht die Kopfzeile)
        muster = None
        for tr in rows:
            if tr is not kopf_row and len(tr.findall(w("tc"))) >= 4:
                muster = tr
        if muster is not None:
            import copy
            for pos in rest:
                neu = copy.deepcopy(muster)
                tcs = neu.findall(w("tc"))
                _set_cell(tcs[0], str(pos.get("nummer") or ""))
                _set_cell(tcs[1], pos.get("name") or "")
                _set_cell(tcs[2], str(pos.get("menge") or "") or "")
                _set_cell(tcs[3], str(pos.get("retoure") or "") or "")
                tbl.append(neu)

    parts[DOC_PART] = _serialize(root, xml_text).encode("utf-8")

    # ── Neu packen (Reihenfolge und Kompression wie im Original) ──
    buf = io.BytesIO()
    with zipfile.ZipFile(buf, "w", zipfile.ZIP_DEFLATED) as z:
        for name, data in parts.items():
            z.writestr(name, data)
    return buf.getvalue()


def tour_fuer(datum_iso, tour_map=None):
    """Tour-Nr. anhand des Wochentags. Samstag faehrt eine andere Tour."""
    from datetime import datetime
    tour_map = tour_map or {"default": "87", "5": "8"}  # 5 = Samstag
    try:
        wd = datetime.strptime(datum_iso, "%Y-%m-%d").weekday()
    except ValueError:
        return tour_map.get("default", "87")
    return tour_map.get(str(wd), tour_map.get("default", "87"))
