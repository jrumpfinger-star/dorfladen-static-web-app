"""Prueft das PDF-Bestellformular fuer Martin's Backstube.

Laeuft ohne Azure. Aufruf::

    python tools/baecker_pdf_test.py

Erzeugt das Formular, liest es mit ``pypdf`` zurueck und prueft Kopfdaten,
Sortierung, Umlaute und – besonders wichtig – dass der Zeichenbereiniger auch
bei Sonderzeichen nicht abstuerzt.

Deckt TC-B2-F20-01 bis TC-B2-F20-03.
"""
import logging
import os
import sys

HIER = os.path.dirname(os.path.abspath(__file__))
WURZEL = os.path.dirname(HIER)
sys.path.insert(0, os.path.join(WURZEL, "api", "baecker-order"))

logging.getLogger("pypdf").setLevel(logging.CRITICAL)

from pdf_fill import build_pdf, latin1  # noqa: E402

_ok = 0
_fehler = []


def pruefe(name, bedingung, hinweis=""):
    global _ok
    if bedingung:
        _ok += 1
        print(f"  OK   {name}")
    else:
        _fehler.append(name)
        print(f"  FEHL {name}" + (f"  -> {hinweis}" if hinweis else ""))


def text_aus(daten):
    import pypdf
    import io
    leser = pypdf.PdfReader(io.BytesIO(daten))
    return "\n".join((s.extract_text() or "") for s in leser.pages), len(leser.pages)


POSITIONEN = [
    {"nummer": "1", "name": "Semmel", "menge": 90, "retoure": 0},
    {"nummer": "12", "name": "Roggensemmel m. K\u00fcmmel", "menge": 2, "retoure": 0},
    {"nummer": "27", "name": "Bio-Dinkel-K\u00e4se-K\u00fcrbiskern", "menge": 2, "retoure": 1},
    {"nummer": "41", "name": "Bio-Mehrkornsemmel", "menge": 3, "retoure": 0},
    {"nummer": "130", "name": "Helles Mischbrot 500 g", "menge": 1, "retoure": 0},
    {"nummer": "401", "name": "Nu\u00dfh\u00f6rnchen", "menge": 2, "retoure": 0},
]


def test_bereiniger():
    print("\nZeichenbereiniger (T040)")
    pruefe("Umlaute bleiben", latin1("K\u00fcmmel K\u00e4se gro\u00df")
           == "K\u00fcmmel K\u00e4se gro\u00df")
    pruefe("Gedankenstrich wird ersetzt", latin1("a \u2013 b") == "a - b")
    pruefe("Anfuehrungszeichen werden ersetzt",
           latin1("\u201eHallo\u201c") == '"Hallo"')
    pruefe("Auslassungspunkte", latin1("mehr\u2026") == "mehr...")
    pruefe("Euro-Zeichen", latin1("3\u20ac") == "3EUR")
    pruefe("schmales Leerzeichen", latin1("12\u202fUhr") == "12 Uhr")
    # Voellig fremdes Zeichen: darf nicht werfen, sondern ersetzt werden
    aus = latin1("Brot \u4e2d\u6587 \U0001F950")
    pruefe("fremde Zeichen stuerzen nicht ab", isinstance(aus, str), aus)
    pruefe("Ergebnis ist latin-1-fest",
           aus.encode("latin-1") is not None)
    pruefe("None wird zu leer", latin1(None) == "")
    pruefe("Zahl wird zu Text", latin1(42) == "42")


def test_formular():
    print("\nFormular (TC-B2-F20-01/-02/-03)")
    daten = build_pdf(POSITIONEN, "12.09.2026", "Samstag",
                      kd_nr="1015", baeckerei_name="Martin's Backstube")
    pruefe("PDF wird erzeugt", daten[:4] == b"%PDF", str(daten[:8]))

    text, seiten = text_aus(daten)

    # TC-B2-F20-01: nur EIN Liefertag
    pruefe("TC-B2-F20-01 genau ein Datum", text.count("12.09.2026") == 1
           and "13.09" not in text and "11.09" not in text, text[:200])
    pruefe("eine Seite", seiten == 1, str(seiten))

    # TC-B2-F20-02: Kopfdaten
    pruefe("TC-B2-F20-02 Kunden-Nr. 1015", "1015" in text)
    pruefe("TC-B2-F20-02 Baeckereiname", "Martin" in text)
    pruefe("TC-B2-F20-02 Wochentag", "Samstag" in text)

    # TC-B2-F20-03: Sortierung
    stellen = [text.find(n) for n in ("Semmel", "Roggensemmel", "Bio-Mehrkorn",
                                      "Helles Mischbrot")]
    pruefe("TC-B2-F20-03 Reihenfolge nach Nummer",
           all(a >= 0 for a in stellen) and stellen == sorted(stellen), str(stellen))

    # Umlaute ueberstehen den Weg
    for probe in ("K\u00fcmmel", "K\u00e4se", "Nu\u00dfh\u00f6rnchen"):
        pruefe(f"Umlaut lesbar: {probe}", probe in text, text[:300])

    # Retoure erscheint
    pruefe("Retoure wird gedruckt", "1" in text)
    pruefe("Positionszahl im Fuss", "6 Positionen" in text, text[-200:])


def test_sonderfaelle():
    print("\nSonderfaelle")
    # Ein Name voller Sonderzeichen darf den Versand NICHT sprengen
    heikel = [{"nummer": "1",
               "name": "Brot \u2013 \u201eSpezial\u201c \u2026 \u4e2d\u6587 \U0001F950",
               "menge": 1, "retoure": 0}]
    try:
        daten = build_pdf(heikel, "12.09.2026", "Samstag", kd_nr="1015")
        pruefe("Sonderzeichen sprengen das PDF nicht", daten[:4] == b"%PDF")
    except Exception as e:
        pruefe("Sonderzeichen sprengen das PDF nicht", False, repr(e))

    # Testbetrieb wird gekennzeichnet
    daten = build_pdf(POSITIONEN, "12.09.2026", "Samstag", kd_nr="1015",
                      testbetrieb=True)
    text, _ = text_aus(daten)
    pruefe("Testbetrieb ist gekennzeichnet", "TESTBETRIEB" in text, text[:300])

    # Korrektur wird gekennzeichnet
    daten = build_pdf(POSITIONEN, "12.09.2026", "Samstag", korrektur=True)
    text, _ = text_aus(daten)
    pruefe("Korrektur ist gekennzeichnet", "Korrektur" in text, text[:300])

    # Zusatzartikel (Basis-Spec F4) landen mit Hinweis im Dokument
    mit_zusatz = POSITIONEN + [{"nummer": "", "name": "Sonderbestellung Torte",
                                "menge": 1, "retoure": 0, "zusatz": True}]
    daten = build_pdf(mit_zusatz, "12.09.2026", "Samstag")
    text, _ = text_aus(daten)
    pruefe("Zusatzartikel erscheint", "Sonderbestellung Torte" in text)
    pruefe("Zusatzartikel ist markiert", "nur für diesen Tag" in text, text[-300:])

    # Halbe Retoure (kommt in den Rechnungen vor)
    halb = [{"nummer": "136", "name": "Landbrot 1 kg", "menge": 3, "retoure": 0.5}]
    daten = build_pdf(halb, "12.09.2026", "Samstag")
    text, _ = text_aus(daten)
    pruefe("halbe Retoure wird gedruckt", "0,50" in text, text[:400])

    # Leere Liste darf nicht werfen (der Aufrufer faengt das ab, aber sicher ist sicher)
    try:
        daten = build_pdf([], "12.09.2026", "Samstag")
        pruefe("leere Liste ergibt trotzdem ein PDF", daten[:4] == b"%PDF")
    except Exception as e:
        pruefe("leere Liste ergibt trotzdem ein PDF", False, repr(e))

    # Viele Positionen -> Seitenumbruch
    viele = [{"nummer": str(i), "name": f"Artikel {i}", "menge": 1, "retoure": 0}
             for i in range(1, 61)]
    daten = build_pdf(viele, "12.09.2026", "Samstag")
    _, seiten = text_aus(daten)
    pruefe("60 Positionen brechen sauber um", seiten >= 2, f"{seiten} Seiten")


def main():
    print("PDF-Bestellformular \u2013 Martin's Backstube")
    test_bereiniger()
    test_formular()
    test_sonderfaelle()
    print(f"\n{_ok} von {_ok + len(_fehler)} Pruefungen bestanden")
    if _fehler:
        print("Fehlgeschlagen: " + ", ".join(_fehler))
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
