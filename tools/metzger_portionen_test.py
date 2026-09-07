"""Selbsttest des Portionsmodells (Spec F2, F6, F16) - ohne Azure und Netz.

Aufruf::

    python tools/metzger_portionen_test.py
"""
import os
import sys

sys.path.insert(0, os.path.join(
    os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
    "api", "metzger-order"))

import metzger_portionen as P  # noqa: E402

FEHLER = []


def pruefe(name, ist, soll):
    if ist == soll:
        print(f"  ok   {name}")
    else:
        print(f"  FEHL {name}\n       ist:  {ist!r}\n       soll: {soll!r}")
        FEHLER.append(name)


def block(a, m, e, v=False):
    return {"anzahl": a, "menge": m, "einheit": e, "vakuum": v}


def pos(portionen, hinweis="", nummer=None):
    return P.normalisiere_position(
        {"nummer": nummer, "name": "X", "portionen": portionen, "hinweis": hinweis})


print("TC-F2-01  Papier-Schreibweisen abbildbar")
faelle = [
    ([block(1, 0.5, "kg")], "1 \u00d7 \u00bd kg"),
    ([block(1, 30, "St")], "1 \u00d7 30 St"),
    ([block(2, 4, "St", True)], "2 \u00d7 4 St (vakuumiert)"),
    ([block(2, 500, "g"), block(6, 250, "g", True)],
     "2 \u00d7 500 g, 6 \u00d7 250 g (vakuumiert)"),
    ([block(4, 65, "cm")], "4 \u00d7 65 cm"),
    ([block(2, None, "klein"), block(1, 1, "St")], "2 \u00d7 klein, 1 \u00d7 1 St"),
]
for portionen, soll in faelle:
    pruefe(soll, P.position_text(pos(portionen)), soll)
pruefe("1/2 Kr\u00e4uter",
       P.position_text(pos([block(1, 0.5, "kg")], "Kr\u00e4uter")),
       "1 \u00d7 \u00bd kg \u2014 Kr\u00e4uter")

print("TC-F2-02  ohne Bloecke und ohne Hinweis nicht bestellt")
pruefe("leer", P.bestellt(pos([])), False)

print("TC-F2-03  Anzahl 0 wird auf 1 normalisiert")
pruefe("anzahl", P.normalisiere_block(block(0, 1, "kg"))["anzahl"], 1)
pruefe("anzahl negativ", P.normalisiere_block(block(-3, 1, "kg"))["anzahl"], 1)

print("TC-F2-04  Gewicht summiert nur Gewichtsbloecke")
s = P.summen([pos([block(2, 500, "g"), block(1, 4, "St")])])
pruefe("kg", s["kg"], 1.0)
pruefe("stueck", s["stueck"], 4)

print("TC-F2-05  Hinweis allein zaehlt als bestellt")
p = pos([], "nur wenn da")
pruefe("bestellt", P.bestellt(p), True)
pruefe("text", P.position_text(p), "nur wenn da")

print("TC-F6-04  Vakuum zaehlt Portionen, nicht Stueck")
s = P.summen([pos([block(2, 4, "St", True)]), pos([block(3, 0.5, "kg", True)])])
pruefe("vakuum", s["vakuum"], 5)

print("TC-F16    Mindestwert und nicht bewertbare Positionen")
s = P.summen([pos([block(2, 500, "g")], nummer=360)], preise={360: 17.50})
pruefe("wert", s["wert"], 17.50)
pruefe("ohne_wert", s["ohne_wert"], 0)
s = P.summen([pos([block(2, 500, "g")], nummer=360),
              pos([block(1, 30, "St")], nummer=600)], preise={360: 17.50})
pruefe("wert mit Stueck", s["wert"], 17.50)
pruefe("nicht bewertbar", s["ohne_wert"], 1)
s = P.summen([pos([block(1, 30, "St")], nummer=600)], preise={})
pruefe("gar nichts bewertbar", (s["wert"], s["ohne_wert"]), (0.0, 1))

print("Sonstiges  Einheiten und Groessen")
pruefe("alias gr", P.einheit_normieren("gr"), "g")
pruefe("alias Stk", P.einheit_normieren("Stk"), "St")
pruefe("alias gross", P.einheit_normieren("gross"), "gro\u00df")
pruefe("groesse erkannt", P.ist_groesse("klein"), True)
pruefe("groesse ohne Menge",
       P.normalisiere_block(block(2, 5, "klein"))["menge"], None)
pruefe("menge fehlt -> verworfen", P.normalisiere_block(block(1, None, "kg")), None)
pruefe("schluessel", P.schluessel([block(2, 4, "St", True)]), "2x4St:v")

print()
if FEHLER:
    print(f"FEHLGESCHLAGEN: {len(FEHLER)} Pruefung(en) -> {', '.join(FEHLER)}")
    sys.exit(1)
print("Alle Pruefungen bestanden.")
