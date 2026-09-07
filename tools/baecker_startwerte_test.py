"""Prueft die Startwerte-Logik ohne Netz.

Kernfragen:
  1. Werden die Startwerte fuer Martins gelesen, fuer Freundl nicht?
  2. Greifen sie NUR, wenn es weder Entwurf noch Vorgaenger gibt?
  3. Bleiben Brote bei 0 und tragen stattdessen einen Wochenschnitt?
"""
import os
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.join(ROOT, "api", "baecker-order"))

import store  # noqa: E402

fehler = []


def pruefe(bedingung, text):
    print(("  OK   " if bedingung else "  FEHL ") + text)
    if not bedingung:
        fehler.append(text)


print("1) Startwerte je Baeckerei")
m_mengen, m_woche, m_meta = store.startwerte("martins")
f_mengen, f_woche, f_meta = store.startwerte("freundl")
pruefe(len(m_mengen) > 30, f"Martins liefert Startwerte ({len(m_mengen)} Artikel)")
pruefe(not f_mengen, "Freundl hat keine Startwerte (dort gibt es echte Bestellzettel)")
pruefe(m_meta.get("rechnungen") == 11 and m_meta.get("liefertage") == 66,
       f"Herkunft vermerkt: {m_meta}")

print("\n2) Semmel als Tageswert, Brot nur als Wochenschnitt")
pruefe(m_mengen.get("1") == 28, f"Semmel (Nr. 1) = {m_mengen.get('1')} je Tag")
pruefe(m_mengen.get("136") == 0, f"Landbrot 1kg (Nr. 136) = {m_mengen.get('136')} je Tag")
pruefe(m_woche.get("136", 0) > 1.5, f"Landbrot hat Wochenschnitt {m_woche.get('136')}")
pruefe(m_woche.get("1", 0) > 100, f"Semmel hat Wochenschnitt {m_woche.get('1')}")

print("\n3) Keine negativen oder unsinnigen Werte")
pruefe(all(v >= 0 for v in m_mengen.values()), "alle Tageswerte >= 0")
pruefe(all(v >= 0 for v in m_woche.values()), "alle Wochenwerte >= 0")
pruefe(max(m_mengen.values()) < 200, f"groesster Tageswert plausibel ({max(m_mengen.values())})")

print("\n4) Unbekannte Baeckerei faellt sauber zurueck")
u_mengen, u_woche, u_meta = store.startwerte("gibtsnicht")
pruefe(u_mengen == {} and u_woche == {} and u_meta == {}, "leeres Ergebnis statt Absturz")

print()
if fehler:
    print(f"{len(fehler)} Pruefung(en) fehlgeschlagen.")
    raise SystemExit(1)
print("Alle Pruefungen bestanden.")
