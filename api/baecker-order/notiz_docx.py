"""Den Hinweis des Dorfladens ans Word-Bestellformular anhängen.

Die Bäckerei Freundl bekommt ihr gewohntes ``.docx``. Ist zur Bestellung ein
Freitext erfasst, steht er dort unter der Artikeltabelle (Spec
``bestell-freitext``, F4) — mit denselben Auszeichnungen wie im PDF.

Gearbeitet wird auf demselben ElementTree-Baum, den ``docx_fill`` ohnehin
schreibt; es kommen nur Absätze hinzu. Zwei Dinge sind dabei zwingend:

* Die Absätze müssen **vor** ``<w:sectPr>`` stehen. Word verlangt, dass die
  Abschnittsangaben das letzte Kind des Körpers sind; danach eingefügte
  Absätze machen das Dokument ungültig.
* Text mit Leerzeichen am Rand braucht ``xml:space="preserve"``, sonst
  verschluckt Word den Abstand zwischen zwei verschieden ausgezeichneten
  Stücken.
"""
from xml.etree import ElementTree as ET

W = "http://schemas.openxmlformats.org/wordprocessingml/2006/main"
XML_NS = "http://www.w3.org/XML/1998/namespace"

TITEL = "Hinweis vom Dorfladen"


def _w(tag):
    return f"{{{W}}}{tag}"


def _lauf(text, fett=False, kursiv=False, unterstrichen=False):
    """Ein ``<w:r>`` mit Auszeichnung und Text."""
    r = ET.Element(_w("r"))
    if fett or kursiv or unterstrichen:
        rpr = ET.SubElement(r, _w("rPr"))
        if fett:
            ET.SubElement(rpr, _w("b"))
        if kursiv:
            ET.SubElement(rpr, _w("i"))
        if unterstrichen:
            ET.SubElement(rpr, _w("u")).set(_w("val"), "single")
    t = ET.SubElement(r, _w("t"))
    t.set(f"{{{XML_NS}}}space", "preserve")
    t.text = text
    return r


def _absatz(stuecke, fett_alles=False, marke="", umbruch="\n"):
    p = ET.Element(_w("p"))
    if marke:
        p.append(_lauf(marke))
    for s in stuecke:
        text = s.get("text", "")
        if text == umbruch:
            r = ET.SubElement(p, _w("r"))
            ET.SubElement(r, _w("br"))
            continue
        p.append(_lauf(text,
                       fett=fett_alles or bool(s.get("fett")),
                       kursiv=bool(s.get("kursiv")),
                       unterstrichen=bool(s.get("unterstrichen"))))
    return p


def anhaengen(body, bloecke, titel=TITEL):
    """Den Hinweisblock ans Ende des Dokumentkörpers setzen.

    Tut nichts, wenn kein Hinweis erfasst ist — ohne Freitext bleibt das
    Dokument, wie es war (F4).
    """
    if not bloecke:
        return

    absaetze = [ET.Element(_w("p")),
                _absatz([{"text": titel}], fett_alles=True)]
    for block in bloecke:
        marke = "- " if block.get("art") == "punkt" else ""
        absaetze.append(_absatz(block.get("stuecke", []), marke=marke))

    kinder = list(body)
    stelle = len(kinder)
    for i, kind in enumerate(kinder):
        if kind.tag == _w("sectPr"):
            stelle = i
            break
    for versatz, absatz in enumerate(absaetze):
        body.insert(stelle + versatz, absatz)
