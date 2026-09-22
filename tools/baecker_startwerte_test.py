"""Prueft die Startwerte-Logik ohne Netz.

Kernfragen:
  1. Liest der Server beide Dateiformen - flach (Martins) und
     wochentaggenau (Freundl)?
  2. Waehlt das Datum bei Freundl den richtigen Wochentagssatz?
  3. Bleibt ein Wochentag ohne Zettel bewusst leer, statt zu raten?
  4. Nennt der Herkunftstext die richtige Quelle je Baeckerei?
"""
import datetime
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


def tag(datum_iso):
    return datetime.date.fromisoformat(datum_iso).weekday()


# Feste Daten statt "heute": ein Test darf nicht ueber Mitternacht kippen.
MITTWOCH, DONNERSTAG = "2026-09-16", "2026-09-17"
FREITAG, SAMSTAG, MONTAG = "2026-09-18", "2026-09-19", "2026-09-21"

print("0) Die Testdaten liegen auf den Wochentagen, die sie behaupten")
for iso, wd, name in ((MITTWOCH, 2, "Mittwoch"), (DONNERSTAG, 3, "Donnerstag"),
                      (FREITAG, 4, "Freitag"), (SAMSTAG, 5, "Samstag"),
                      (MONTAG, 0, "Montag")):
    pruefe(tag(iso) == wd, f"{iso} ist ein {name}")

print("\n1) Martins: flache Datei, fuer jeden Wochentag derselbe Satz")
m_mengen, m_woche, m_meta = store.startwerte("martins", MITTWOCH)
m_sa, _, _ = store.startwerte("martins", SAMSTAG)
m_ohne, _, _ = store.startwerte("martins")
pruefe(len(m_mengen) > 30, f"Martins liefert Startwerte ({len(m_mengen)} Artikel)")
pruefe(m_mengen == m_sa, "Samstag gleich Mittwoch - die Rechnungen kennen keine Tage")
pruefe(m_mengen == m_ohne, "auch ohne Datum lesbar (rueckwaertsvertraeglich)")
pruefe(m_meta.get("rechnungen") == 11 and m_meta.get("liefertage") == 66,
       f"Herkunft vermerkt: rechnungen={m_meta.get('rechnungen')}, "
       f"liefertage={m_meta.get('liefertage')}")

print("\n2) Martins: Semmel als Tageswert, Brot nur als Wochenschnitt")
pruefe(m_mengen.get("1") == 28, f"Semmel (Nr. 1) = {m_mengen.get('1')} je Tag")
pruefe(m_mengen.get("136") == 0, f"Landbrot 1kg (Nr. 136) = {m_mengen.get('136')} je Tag")
pruefe(m_woche.get("136", 0) > 1.5, f"Landbrot hat Wochenschnitt {m_woche.get('136')}")
pruefe(m_woche.get("1", 0) > 100, f"Semmel hat Wochenschnitt {m_woche.get('1')}")

print("\n3) Freundl: wochentaggenaue Datei, das Datum waehlt den Satz")
saetze = {}
for iso, name in ((MITTWOCH, "Mittwoch"), (DONNERSTAG, "Donnerstag"),
                  (FREITAG, "Freitag"), (SAMSTAG, "Samstag")):
    mengen, _, meta = store.startwerte("freundl", iso)
    saetze[name] = mengen
    pruefe(bool(mengen), f"{name}: {len(mengen)} Artikel vorbelegt")
    pruefe(meta.get("wochentag") == name,
           f"{name}: Satz richtig zugeordnet ({meta.get('wochentag')!r})")
    pruefe((meta.get("zettel") or 0) > 0, f"{name}: aus {meta.get('zettel')} Zettel(n)")

print("\n4) Freundl: der Samstag ist nachweislich anders")
sa, do = saetze["Samstag"], saetze["Donnerstag"]
pruefe(sa != do, "Samstag und Donnerstag unterscheiden sich")
pruefe(sa.get("1", 0) == 0,
       f"samstags keine Kaisersemmel (Nr. 1 = {sa.get('1')}) - so stehen es die Zettel")
pruefe(do.get("1", 0) > 0, f"donnerstags schon (Nr. 1 = {do.get('1')})")
pruefe(sum(sa.values()) < sum(do.values()),
       f"samstags weniger Stueck gesamt ({sum(sa.values())} < {sum(do.values())})")

print("\n5) Wochentag ohne Zettel: lieber nichts als geraten")
mo_mengen, _, mo_meta = store.startwerte("freundl", MONTAG)
pruefe(mo_mengen == {}, "Montag bleibt leer - Freundl liefert dann nicht")
pruefe(mo_meta.get("wochentag_ohne_daten") is True, f"Grund vermerkt: {mo_meta}")
o_mengen, _, _ = store.startwerte("freundl")
pruefe(o_mengen == {}, "ohne Datum leer - irgendeinen Satz zu nehmen waere geraten")
k_mengen, _, _ = store.startwerte("freundl", "kein-datum")
pruefe(k_mengen == {}, "unlesbares Datum stuerzt nicht ab")

print("\n6) Der Herkunftstext nennt die richtige Quelle")
_, _, meta_do = store.startwerte("freundl", DONNERSTAG)
pruefe("Bestellzettel" in meta_do.get("text", ""), f"Freundl: {meta_do.get('text')!r}")
pruefe("Donnerstag" in meta_do.get("text", ""), "Freundl: Wochentag genannt")
pruefe("Rechnungen" in m_meta.get("text", ""), f"Martins: {m_meta.get('text')!r}")
pruefe("Rechnungen" not in meta_do.get("text", ""),
       "Freundl spricht nicht von Rechnungen - die gibt es dort nicht")

print("\n7) Keine negativen oder unsinnigen Werte")
alle = list(m_mengen.values()) + [v for s in saetze.values() for v in s.values()]
pruefe(all(v >= 0 for v in alle), "alle Tageswerte >= 0")
pruefe(all(v >= 0 for v in m_woche.values()), "alle Wochenwerte >= 0")
pruefe(max(alle) < 200, f"groesster Tageswert plausibel ({max(alle)})")

print("\n8) Unbekannte Baeckerei faellt sauber zurueck")
u_mengen, u_woche, u_meta = store.startwerte("gibtsnicht", MITTWOCH)
pruefe(u_mengen == {} and u_woche == {} and u_meta == {}, "leeres Ergebnis statt Absturz")

print()
if fehler:
    print(f"{len(fehler)} Pruefung(en) fehlgeschlagen.")
    raise SystemExit(1)
print("Alle Pruefungen bestanden.")
