"""Der Hinweis des Dorfladens auf den Bestellformularen (F3, F4).

Prüft alle vier Ausgabewege: Metzger-PDF, Bäcker-Nachbildung, Bäcker-PDF und
das Word-Dokument der Bäckerei Freundl.

Ausführen:  python tests/test_notiz_dokumente.py
"""
import io
import os
import sys
import zipfile
from xml.etree import ElementTree as ET

HIER = os.path.dirname(os.path.abspath(__file__))
API = os.path.join(HIER, "..", "api")
sys.path.insert(0, API)
sys.path.insert(0, os.path.join(API, "baecker-order"))
sys.path.insert(0, os.path.join(API, "metzger-order"))

from pypdf import PdfReader  # noqa: E402

import metzger_pdf  # noqa: E402
import formular_pdf  # noqa: E402
import pdf_fill  # noqa: E402
import docx_fill  # noqa: E402

TITEL = "Hinweis vom Dorfladen"

ARTIKEL = [{"nummer": 10, "name": "Putenschnitzel"},
           {"nummer": 20, "name": "Lende Schwein"}]
POSITIONEN = [{"nummer": 10, "name": "Putenschnitzel",
               "portionen": [{"menge": 1, "groesse": 2, "einheit": "kg"}]}]
BK_POSITIONEN = [{"nummer": "100", "name": "Semmel", "menge": 30, "retoure": 0},
                 {"nummer": "200", "name": "Breze", "menge": 12, "retoure": 0}]

VORLAGE = os.path.join(API, "baecker-order", "vorlage", "freundl-werktag.docx")


def pruefe(name, bedingung, hinweis=""):
    if not bedingung:
        raise AssertionError(f"{name}{(' — ' + hinweis) if hinweis else ''}")
    print(f"  ok  {name}")


def text_aus(pdf_bytes):
    leser = PdfReader(io.BytesIO(pdf_bytes))
    roh = "\n".join((s.extract_text() or "") for s in leser.pages)
    # fpdf2 setzt Wörter einzeln; für die Suche reicht ein geglätteter Text.
    return " ".join(roh.split())


def ohne_leerraum(pdf_bytes):
    """Text ohne jeden Abstand.

    ``pypdf`` erkennt die Wortabstände nicht mehr zuverlässig, sobald ein
    Wort ein Sonderzeichen enthält — im PDF stehen sie sehr wohl. Für die
    Inhaltsprüfung wird der Abstand deshalb ganz herausgenommen.
    """
    return text_aus(pdf_bytes).replace(" ", "")


def metzger(notiz=None):
    return metzger_pdf.build_pdf(ARTIKEL, POSITIONEN, "2026-09-10",
                                 kd_nr="1041", notiz=notiz)


def baecker_formular(notiz=None):
    return formular_pdf.build_formular(BK_POSITIONEN, "10.09.2026",
                                       kd_nr="1190", tour_nr="87", notiz=notiz)


def baecker_pdf(notiz=None):
    return pdf_fill.build_pdf(BK_POSITIONEN, "10.09.2026", "Donnerstag",
                              kd_nr="1190", notiz=notiz)


def docx(notiz=None):
    with open(VORLAGE, "rb") as f:
        vorlage = f.read()
    return docx_fill.fill_form(vorlage, "10.09.2026", BK_POSITIONEN,
                               notiz=notiz)


def docx_xml(daten):
    with zipfile.ZipFile(io.BytesIO(daten)) as z:
        return z.read("word/document.xml").decode("utf-8")


# --- TC-F3-01 / TC-F3-02: Block erscheint nur mit Text --------------------
def test_block_mit_und_ohne_text():
    notiz = {"html": "<p>Bitte fr&uuml;h liefern</p>"}
    for name, bau in (("Metzger", metzger), ("Baecker-Nachbildung", baecker_formular),
                      ("Baecker-PDF", baecker_pdf)):
        mit = ohne_leerraum(bau(notiz))
        pruefe(f"TC-F3-01 {name}: Ueberschrift", TITEL.replace(" ", "") in mit)
        pruefe(f"TC-F3-01 {name}: Text", "liefern" in mit)
        ohne = text_aus(bau(None))
        pruefe(f"TC-F3-02 {name}: ohne Hinweis kein Block", TITEL not in ohne)


def test_auszeichnungen():
    """Fett und kursiv landen als eigene Schriftschnitte im Dokument."""
    daten = metzger({"html": "<p>Ganz <b>wichtig</b> und <i>dringend</i></p>"})
    text = ohne_leerraum(daten)
    pruefe("fetter Teil steht da", "wichtig" in text)
    pruefe("kursiver Teil steht da", "dringend" in text)
    roh = daten.decode("latin-1", "replace")
    pruefe("Fettschnitt eingebettet", "Helvetica-Bold" in roh)
    pruefe("Kursivschnitt eingebettet", "Helvetica-Oblique" in roh)


# --- TC-F3-03: Aufzählung wird zu Strichpunkten ---------------------------
def test_aufzaehlung():
    notiz = {"html": "<ul><li>Semmeln</li><li>Brezen</li></ul>"}
    t = ohne_leerraum(metzger(notiz))
    pruefe("TC-F3-03 erster Punkt", "-Semmeln" in t)
    pruefe("TC-F3-03 zweiter Punkt", "-Brezen" in t)


# --- TC-F3-04: Langer Text bricht um statt abzuschneiden ------------------
def test_langer_text():
    lang = ("Wir brauchen die Lieferung dringend frueher als sonst. " * 18)[:990]
    lang += " ENDEMARKE"
    t = ohne_leerraum(metzger({"html": lang}))
    pruefe("TC-F3-04 Anfang steht", "Wirbrauchen" in t)
    pruefe("TC-F3-04 Ende steht", "ENDEMARKE" in t)
    t2 = ohne_leerraum(baecker_formular({"html": lang}))
    pruefe("TC-F3-04 auch beim Baecker", "ENDEMARKE" in t2)


# --- TC-F3-05: Sonderzeichen lassen den Versand nicht scheitern -----------
def test_sonderzeichen():
    notiz = {"html": "<p>1 \u00d7 2 kg \u2013 \u201eganz frisch\u201c "
                     "f\u00fcr 5 \u20ac \U0001f600</p>"}
    for name, bau in (("Metzger", metzger), ("Baecker-Nachbildung", baecker_formular),
                      ("Baecker-PDF", baecker_pdf)):
        daten = bau(notiz)
        pruefe(f"TC-F3-05 {name}: Formular entsteht", len(daten) > 1000)


# --- TC-F3-06: Ohne Hinweis bleibt das Blatt, wie es war ------------------
def test_unveraendert_ohne_hinweis():
    a = baecker_formular(None)
    b = baecker_formular({"html": ""})
    pruefe("TC-F3-06 leerer Hinweis wirkt wie keiner", len(a) == len(b))


# --- TC-F4-01 … TC-F4-03: Word-Dokument -----------------------------------
def test_docx():
    xml = docx_xml(docx({"html": "<p>Bitte <b>fr\u00fch</b> liefern</p>"}))
    pruefe("TC-F4-01 Ueberschrift im Dokument", TITEL in xml)
    pruefe("TC-F4-01 Text im Dokument", "fr\u00fch" in xml)
    pruefe("TC-F4-01 fett ausgezeichnet", "<w:b />" in xml or "<w:b/>" in xml)

    ohne = docx_xml(docx(None))
    pruefe("TC-F4-02 ohne Hinweis keine Ueberschrift", TITEL not in ohne)


def test_docx_bleibt_gueltig():
    daten = docx({"html": "<p>5 &lt; 7 &amp; gr\u00f6\u00dfer &gt; klein</p>"})
    with zipfile.ZipFile(io.BytesIO(daten)) as z:
        pruefe("TC-F4-03 ZIP ist lesbar", z.testzip() is None)
        xml = z.read("word/document.xml").decode("utf-8")
    ET.fromstring(xml)          # wirft, wenn nicht wohlgeformt
    pruefe("TC-F4-03 XML ist wohlgeformt", True)
    pruefe("TC-F4-03 Sonderzeichen geschuetzt", "5 &lt; 7 &amp; gr" in xml)


def test_docx_aufzaehlung():
    xml = docx_xml(docx({"html": "<ul><li>Semmeln</li><li>Brezen</li></ul>"}))
    pruefe("Aufzaehlung im Dokument", "Semmeln" in xml and "Brezen" in xml)


def test_sectpr_bleibt_letztes():
    """Word meldet das Dokument als beschaedigt, wenn danach noch Absaetze stehen."""
    xml = docx_xml(docx({"html": "Hinweis"}))
    w = "{http://schemas.openxmlformats.org/wordprocessingml/2006/main}"
    body = ET.fromstring(xml).find(f"{w}body")
    kinder = list(body)
    hat_sectpr = any(k.tag == f"{w}sectPr" for k in kinder)
    if hat_sectpr:
        pruefe("sectPr steht am Ende", kinder[-1].tag == f"{w}sectPr")
    else:
        pruefe("Vorlage hat kein sectPr im Koerper", True)


def main():
    tests = [v for k, v in sorted(globals().items()) if k.startswith("test_")]
    print(f"Formulare mit Hinweis: {len(tests)} Gruppen")
    for t in tests:
        print(t.__name__)
        t()
    print("\nAlle Pruefungen bestanden.")


if __name__ == "__main__":
    main()
