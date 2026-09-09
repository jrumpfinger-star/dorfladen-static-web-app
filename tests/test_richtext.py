"""Unit-Tests für api/shared/richtext.py (Spec bestell-freitext, F2).

Läuft ohne Azure-Pakete.
Ausführen:  python tests/test_richtext.py   (oder: python -m pytest …)
"""
import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "api"))
from shared import richtext as R  # noqa: E402


def pruefe(name, ist, soll):
    if ist != soll:
        raise AssertionError(f"{name}\n  erwartet: {soll!r}\n  bekommen: {ist!r}")
    print(f"  ok  {name}")


# --- TC-F2-01: Erlaubte Auszeichnungen überleben --------------------------
def test_erlaubtes_bleibt():
    quelle = "<p>Bitte <b>früh</b> liefern</p><ul><li>Semmeln</li></ul>"
    pruefe("TC-F2-01 Auszeichnungen bleiben", R.bereinige(quelle), quelle)
    pruefe("TC-F2-01 ist beständig",
           R.bereinige(R.bereinige(quelle)), quelle)


def test_kursiv_und_unterstrichen():
    pruefe("kursiv bleibt", R.bereinige("<i>schräg</i>"), "<i>schräg</i>")
    pruefe("unterstrichen bleibt", R.bereinige("<u>wichtig</u>"), "<u>wichtig</u>")
    pruefe("strong wird zu b", R.bereinige("<strong>x</strong>"), "<b>x</b>")
    pruefe("em wird zu i", R.bereinige("<em>x</em>"), "<i>x</i>")


def test_umbruch():
    pruefe("Umbruch bleibt", R.bereinige("oben<br>unten"), "oben<br>unten")


# --- TC-F2-02: Script wird samt Inhalt entfernt ---------------------------
def test_script_verschwindet():
    ist = R.bereinige("Hallo<script>alert(1)</script>")
    pruefe("TC-F2-02 Script weg", ist, "Hallo")
    if "script" in ist or "alert" in ist:
        raise AssertionError("Script-Inhalt ist durchgekommen")
    pruefe("TC-F2-02 Style weg",
           R.bereinige("A<style>b{color:red}</style>B"), "AB")


def test_kaputtes_markup():
    pruefe("offener Tag",
           R.bereinige("<b>fett ohne Ende"), "<b>fett ohne Ende</b>")
    pruefe("fremdes Element",
           R.bereinige("<div><span>Text</span></div>"), "Text")


# --- TC-F2-03: Eigenschaften entfallen ------------------------------------
def test_eigenschaften_weg():
    pruefe("TC-F2-03 Eigenschaften weg",
           R.bereinige('<b style="color:red" onclick="x()">Achtung</b>'),
           "<b>Achtung</b>")


# --- TC-F2-04: Verweis wird zu reinem Text --------------------------------
def test_verweis_wird_text():
    pruefe("TC-F2-04 Verweis wird Text",
           R.bereinige('Siehe <a href="http://x.de">hier</a>'), "Siehe hier")


# --- TC-F2-05: Länge wird begrenzt ----------------------------------------
def test_laenge():
    lang = "a" * 1200
    pruefe("TC-F2-05 auf 1000 gestutzt", len(R.als_text(lang)), 1000)
    pruefe("TC-F2-05 auch im HTML", len(R.bereinige(lang)), 1000)
    viele = "<p>" + ("b" * 600) + "</p><p>" + ("c" * 600) + "</p>"
    pruefe("TC-F2-05 über Absätze hinweg",
           len(R.als_text(viele).replace("\n", "")), 1000)


# --- Neutrale Zwischenform für die Formulare ------------------------------
def test_bloecke():
    b = R.als_bloecke("<p>Bitte <b>früh</b> liefern</p>"
                      "<ul><li>Semmeln</li><li>Brezen</li></ul>")
    pruefe("drei Blöcke", len(b), 3)
    pruefe("erster ist Absatz", b[0]["art"], R.ABSATZ)
    pruefe("Stücke des Absatzes", len(b[0]["stuecke"]), 3)
    pruefe("Mitte ist fett", b[0]["stuecke"][1]["fett"], True)
    pruefe("Rand ist nicht fett", b[0]["stuecke"][0]["fett"], False)
    pruefe("Leerzeichen bleibt", b[0]["stuecke"][0]["text"], "Bitte ")
    pruefe("zweiter ist Punkt", b[1]["art"], R.PUNKT)
    pruefe("Punkttext", b[1]["stuecke"][0]["text"], "Semmeln")


def test_verschachtelt():
    b = R.als_bloecke("<b>fett <i>und schräg</i></b>")
    pruefe("beides gesetzt", b[0]["stuecke"][1]["kursiv"], True)
    pruefe("fett bleibt gesetzt", b[0]["stuecke"][1]["fett"], True)


def test_text():
    pruefe("Aufzählung als Striche",
           R.als_text("<ul><li>Semmeln</li><li>Brezen</li></ul>"),
           "- Semmeln\n- Brezen")
    pruefe("Absätze als Zeilen",
           R.als_text("<p>eins</p><p>zwei</p>"), "eins\nzwei")


def test_sonderzeichen():
    pruefe("spitze Klammern werden geschützt",
           R.bereinige("5 &lt; 7 &amp; mehr"), "5 &lt; 7 &amp; mehr")
    pruefe("im reinen Text stehen sie wieder da",
           R.als_text("5 &lt; 7 &amp; mehr"), "5 < 7 & mehr")


# --- Das Feld einer Bestellung -------------------------------------------
def test_notiz_aus():
    pruefe("leer bleibt leer", R.notiz_aus(None), None)
    pruefe("nur Leerraum ist nichts", R.notiz_aus({"html": "<p> </p>"}), None)
    n = R.notiz_aus({"html": "<p>Bitte <b>früh</b></p>", "text": "egal"})
    pruefe("HTML gesäubert", n["html"], "<p>Bitte <b>früh</b></p>")
    pruefe("Text neu erzeugt", n["text"], "Bitte früh")
    pruefe("Zeichenkette geht auch",
           R.notiz_aus("Hallo")["text"], "Hallo")


def main():
    tests = [v for k, v in sorted(globals().items()) if k.startswith("test_")]
    print(f"richtext: {len(tests)} Gruppen")
    for t in tests:
        print(t.__name__)
        t()
    print("\nAlle Prüfungen bestanden.")


if __name__ == "__main__":
    main()
