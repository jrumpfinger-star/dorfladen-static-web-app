"""Prueft die Drax-Bestelllogik ohne Azure und ohne Dataverse.

Aufruf::

    python tools/drax_logik_test.py

Was hier laeuft, deckt die Test Cases der Spec ab, die allein im Server
entschieden werden: Liefertage (F1), Vorbelegung (F2), Mengenpruefung (F3),
Sortierung (F4), Formular (F5), Korrekturblatt (F7), Bestellschluss (F8) und
Verlauf (F9). Die Oberflaeche pruefen die Playwright-Tests.

Ohne dieses Werkzeug waere die Logik erst nach einem Deployment pruefbar -
Dataverse und Graph stehen hier nicht zur Verfuegung.
"""
import os
import sys
from datetime import date, datetime

_API = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
                    "api")
sys.path.insert(0, _API)
sys.path.insert(0, os.path.join(_API, "drax-order"))

import drax_store as store      # noqa: E402
import drax_pdf as pdf          # noqa: E402

from shared.zeit import zone    # noqa: E402

fehler = []


def pruefe(bedingung, text):
    kennung = "  ok  " if bedingung else "FEHLER"
    print(f"[{kennung}] {text}")
    if not bedingung:
        fehler.append(text)


CFG = dict(store.DEFAULT_CONFIG)
KATALOG = store.vorlage_katalog()
GRUPPEN = store.vorlage_gruppen()


# ── F1: Liefertage ────────────────────────────────────────────────────
print("\nF1 Liefertage")

# Montag, 12.10.2026
tage = store.naechste_liefertage(CFG, ab=date(2026, 10, 12))
pruefe(tage == ["2026-10-15", "2026-10-22", "2026-10-29", "2026-11-05"],
       f"TC-F1-01/03 vier Donnerstage ab Montag: {tage}")
pruefe(all(datetime.strptime(t, "%Y-%m-%d").weekday() == 3 for t in tage),
       "TC-F1-03 alle Eintraege sind Donnerstage")

# Am Liefertag selbst zaehlt bereits der naechste - die Ware ist unterwegs.
pruefe(store.naechster_liefertag(CFG, ab=date(2026, 10, 16)) == "2026-10-22",
       "TC-F1-02 nach dem Liefertag zaehlt der naechste")
pruefe(not store.bestellbar(date(2020, 1, 1).isoformat()),
       "Vergangene Liefertage sind nicht bestellbar")


# ── F8: Bestellschluss ────────────────────────────────────────────────
print("\nF8 Bestellschluss")

schluss = store.bestellschluss_zeitpunkt(CFG, "2026-10-15")
pruefe(schluss == datetime(2026, 10, 14, 12, 0, tzinfo=zone()),
       f"TC-F8-01 Mittwoch 12:00 vor dem Donnerstag: {schluss}")

dienstag = datetime(2026, 10, 13, 9, 0, tzinfo=zone())
mittwoch_nachmittag = datetime(2026, 10, 14, 13, 0, tzinfo=zone())
pruefe(not store.schluss_verstrichen(CFG, "2026-10-15", dienstag),
       "TC-F8-01 am Dienstag ist der Schluss nicht verstrichen")
pruefe(store.schluss_verstrichen(CFG, "2026-10-15", mittwoch_nachmittag),
       "TC-F8-02 Mittwoch 13:00 ist der Schluss verstrichen")

# Faellt der Schlusstag auf den Liefertag, gilt die volle Woche davor -
# sonst waere der Schluss derselbe Tag und die Frist null.
gleich = dict(CFG, bestellschluss_tag=3)
pruefe(store.bestellschluss_zeitpunkt(gleich, "2026-10-15").date()
       == date(2026, 10, 8),
       "Schlusstag gleich Liefertag -> eine Woche davor")

pruefe(store.testbetrieb(CFG),
       "TC-F11-01 Testbetrieb, solange die Bestelladresse nicht bestaetigt ist")

# Scharf geschaltet heisst: Empfaenger UND hinterlegte Adresse der Muehle
# sind dieselbe. Ein Tippfehler im einen Feld faellt damit nicht der Muehle
# zur Last, sondern landet in der Testablage. (TC-F11-05)
SCHARF = dict(CFG)
SCHARF["drax_mail"] = "info@drax-muehle.de"
SCHARF["empfaenger"] = "info@drax-muehle.de"
pruefe(not store.testbetrieb(SCHARF),
       "TC-F11-05 scharf, wenn Empfaenger und Muehlenadresse uebereinstimmen")

VERTIPPT = dict(SCHARF)
VERTIPPT["empfaenger"] = "info@drax-muehle.d"
pruefe(store.testbetrieb(VERTIPPT),
       "TC-F11-05 ein Vertipper im Empfaenger faellt zurueck in den Testbetrieb")

# Die Freigabe darf nicht an einem Ueberbleibsel aus der Testzeit scheitern:
# Der gespeicherte Satz traegt ein leeres `drax_mail`, und "" ist nicht None.
LEER = dict(CFG)
LEER["drax_mail"] = ""
pruefe(store.testbetrieb(LEER),
       "Leere Muehlenadresse bedeutet Testbetrieb")
pruefe(store.DRAX_MAIL == "info@drax-muehle.de",
       f"Bestaetigte Bestelladresse hinterlegt: {store.DRAX_MAIL}")


# ── F2: Vorbelegung ───────────────────────────────────────────────────
print("\nF2 Vorbelegung")

pos, herkunft = store.vorbelegung([], "2026-10-15")
pruefe(len(pos) == 12 and all(p["uebernommen"] for p in pos),
       f"TC-F2-01 12 Positionen aus der Lieferhistorie, alle uebernommen "
       f"({len(pos)})")
pruefe(herkunft["art"] == "lieferung" and "24.09.2026" in herkunft["text"],
       f"TC-F2-01 Herkunft genannt: {herkunft['text']}")

# Eine eigene Bestellung hat Vorrang vor den Startwerten.
eigene = [{"datum": "2026-10-08", "status": store.STATUS_GESENDET,
           "positionen": [{"nr": "40401", "menge": 6}]}]
pos2, herkunft2 = store.vorbelegung(eigene, "2026-10-15")
pruefe(pos2 == [{"nr": "40401", "menge": 6, "uebernommen": True}],
       f"TC-F2-01 eigene Bestellung hat Vorrang: {pos2}")
pruefe(herkunft2["art"] == "bestellung", "Herkunft 'bestellung'")

# Ein Entwurf ist keine Vorlage - daran wird ja noch gearbeitet.
entwurf = [{"datum": "2026-10-08", "status": store.STATUS_ENTWURF,
            "positionen": [{"nr": "40401", "menge": 99}]}]
pos3, _ = store.vorbelegung(entwurf, "2026-10-15")
pruefe(all(p["nr"] != "40401" or p["menge"] != 99 for p in pos3),
       "Ein Entwurf dient nicht als Vorlage")

# Ohne Historie UND ohne Startwerte bleibt die Liste leer.
echt = store.vorlage_startwerte
store.vorlage_startwerte = lambda: ({}, "")
leer, herkunft3 = store.vorbelegung([], "2026-10-15")
store.vorlage_startwerte = echt
pruefe(leer == [] and herkunft3["art"] == "keine",
       f"TC-F2-03 ohne Vorlage leer starten: {herkunft3['text']}")

# Ein inaktiver Artikel darf nicht vorbelegt werden.
ohne = set(store.artikel_map(KATALOG)) - {"40412"}
gefiltert, _ = store.vorbelegung([], "2026-10-15", ohne)
pruefe(all(p["nr"] != "40412" for p in gefiltert),
       "TC-F10-03 inaktive Artikel fallen aus der Vorbelegung")


# ── F3: Mengen ────────────────────────────────────────────────────────
print("\nF3 Mengen")

roh = [{"nr": "40401", "menge": "3"}, {"nr": "40401", "menge": 2},
       {"nr": "88949", "menge": 0}, {"nr": "40405", "menge": "a12b"},
       {"nr": "", "menge": 5}, {"nr": "99999", "menge": 4}]
erlaubt = set(store.artikel_map(KATALOG))
sauber = store.normalisiere_positionen(roh, erlaubt)
pruefe(sauber == [{"nr": "40401", "menge": 5}],
       f"TC-F3-02/03 Mengen gesaeubert, Doppelte addiert, Unbekanntes weg: "
       f"{sauber}")
pruefe(store.summen(sauber) == {"positionen": 1, "stueck": 5},
       "Summen stimmen")
pruefe(store.normalisiere_positionen(None) == [],
       "Leere Eingabe ergibt leere Liste")


# ── F4: Sortierung ────────────────────────────────────────────────────
print("\nF4 Sortierung")

sortiert = store.nach_gruppe_und_nummer(KATALOG, GRUPPEN)
pruefe(len(sortiert) == len(KATALOG),
       f"Alle {len(KATALOG)} Artikel bleiben erhalten")

reihe = [a["nr"] for a in sortiert]
pruefe(reihe.index("40401") < reihe.index("40408") < reihe.index("40412"),
       "TC-F4-01 innerhalb der Gruppe aufsteigend nach Artikelnummer")

# Die Gruppen stehen am Stueck, in der Reihenfolge des Katalogs.
folge = [a["gruppe"] for a in sortiert]
bloecke = [g for i, g in enumerate(folge) if i == 0 or folge[i - 1] != g]
pruefe(len(bloecke) == len(set(bloecke)),
       f"Jede Gruppe steht am Stueck: {bloecke}")
pruefe(bloecke == [g["id"] for g in GRUPPEN],
       "Gruppenreihenfolge wie im Katalog")


# ── F5/F7: Formular ───────────────────────────────────────────────────
print("\nF5 Formular")

pruefe(pdf.UEBERSCHRIFTEN == ("St\u00fcck", "Einheit", "Art. Nr",
                              "Artikelbezeichnung"),
       "TC-F5-01 Spaltenfolge wie auf dem Papierblatt")

voll = store.positionen_mit_namen(pos, KATALOG)
pruefe(len(voll) == 12 and all(p["name"] for p in voll),
       "TC-F5-02 nur bestellte Positionen, alle mit Namen")

# Artikel 78549: Drax hat umgestellt, der Kassenname "Tellofix" entfaellt.
tellofix = next((a for a in KATALOG if a["nr"] == "78549"), None)
pruefe(tellofix is not None and "Tellofix" not in tellofix["name"],
       f"TC-F5-04 Schreibweise der Muehle: {tellofix['name'] if tellofix else '?'}")

blatt = pdf.build_formular(
    voll, "07.10.2026", "Do 15.10.2026 vormittags", "11225",
    CFG["anschrift"], GRUPPEN, testbetrieb=True)
pruefe(blatt.startswith(b"%PDF") and len(blatt) > 1000,
       f"Formular erzeugt ({len(blatt)} Bytes)")

# Alle 96 Artikel muessen durchlaufen, ohne haengen zu bleiben.
alles = store.positionen_mit_namen(
    [{"nr": a["nr"], "menge": 2} for a in sortiert], KATALOG)
gross = pdf.build_formular(alles, "07.10.2026", "", "11225",
                           CFG["anschrift"], GRUPPEN)
pruefe(gross.startswith(b"%PDF") and len(gross) > len(blatt),
       f"Vollstaendiger Katalog bricht sauber um ({len(gross)} Bytes)")

print("\nF7 Korrektur")
korr = [dict(p) for p in voll]
korr[0].update({"menge": 0, "gestrichen": True})
korr[1]["geaendert"] = True
blatt2 = pdf.build_formular(
    korr, "07.10.2026", "Do 15.10.2026 vormittags", "11225",
    CFG["anschrift"], GRUPPEN, korrektur=True, erstdatum="06.10.2026")
pruefe(blatt2.startswith(b"%PDF") and len(blatt2) > len(blatt),
       "TC-F7-02/03 Korrekturblatt mit Vermerk und gestrichener Zeile")

pruefe(pdf.latin1("Suppe \u201aFrei von\u2019 \u2013 fein") ==
       "Suppe 'Frei von' - fein",
       "Typografische Zeichen werden ersetzt, nicht zu Fragezeichen")


# ── F9: Verlauf ───────────────────────────────────────────────────────
print("\nF9 Verlauf")

v = store.verlauf([], KATALOG, store.liefertag_nr(CFG))
pruefe(len(v) == 7, f"Sieben Lieferungen aus den Rechnungen ({len(v)})")
pruefe(v[0]["datum"] == "2026-09-24" and v[-1]["datum"] == "2026-08-06",
       "TC-F9-01 neueste zuerst")
ausnahmen = [z["datum"] for z in v if z["ausnahme"]]
pruefe(ausnahmen == ["2026-08-17"],
       f"TC-F9-02 nur der Montag ist eine Ausnahme: {ausnahmen}")
pruefe(all(z["quelle"] == "lieferung" for z in v),
       "Ohne eigene Bestellungen stammt alles aus den Rechnungen")

# Eine eigene Bestellung verdeckt die Rechnungszeile desselben Tages.
mit = store.verlauf(
    [{"datum": "2026-09-24", "status": store.STATUS_GESENDET,
      "positionen": [{"nr": "40401", "menge": 3}], "dokument": "x"}],
    KATALOG, store.liefertag_nr(CFG))
oben = mit[0]
pruefe(oben["quelle"] == "bestellung" and oben["stueck"] == 3
       and oben["hat_dokument"],
       "TC-F9-03 eigene Bestellung hat Vorrang und traegt ihr Formular")
pruefe(len(mit) == 7, "Kein doppelter Eintrag fuer denselben Tag")


# ── F10: Artikelstamm ─────────────────────────────────────────────────
print("\nF10 Artikelstamm")

pruefe(len(store.artikel_map(KATALOG)) == len(KATALOG),
       "Jede Artikelnummer kommt genau einmal vor")
pruefe(not store.nummer_frei(KATALOG, "40401"),
       "TC-F10-02 vergebene Nummer wird erkannt")
pruefe(store.nummer_frei(KATALOG, "99999"), "Freie Nummer wird erkannt")

# Das Merkmal „nur Rechnung" stammte aus der Zeit, in der der Katalog aus
# Kassen-Export und Rechnungen zusammengesetzt war: Es kennzeichnete
# Artikel, die der Laden geliefert bekam, ohne dass sie in der Kasse
# standen. Seit die Preisliste der Muehle die Quelle ist, sind alle
# fuenfzehn dort gelistet und bestaetigt - das Merkmal ist erledigt.
# (Spec drax-bestellung, TC-F10-04)
nur_rechnung = [a for a in KATALOG if a.get("nur_rechnung")]
pruefe(not nur_rechnung,
       f"TC-F10-04 kein Artikel stammt mehr nur aus Rechnungen "
       f"({len(nur_rechnung)})")

nicht_gelistet = [a for a in KATALOG if a.get("nicht_gelistet")]
pruefe(all(a.get("aktiv") is False for a in nicht_gelistet),
       f"Nicht mehr gelistete Artikel sind ausgeblendet "
       f"({len(nicht_gelistet)})")
pruefe(all(not (a.get("haeufigkeit") or a.get("lieferungen"))
           for a in nicht_gelistet),
       "Ausgeblendet wird nur, was nie bestellt wurde")

# Eine Position ohne Katalogtreffer darf nicht stillschweigend verschwinden.
waise = store.positionen_mit_namen([{"nr": "00000", "menge": 1}], KATALOG)
pruefe(waise and waise[0]["name"] == "Artikel 00000",
       "Unbekannte Position behaelt ihre Nummer als Namen")


# ── Router: F5, F6, F7, F12 ───────────────────────────────────────────
print("\nRouter")

import importlib.util  # noqa: E402

_spec = importlib.util.spec_from_file_location(
    "drax_router", os.path.join(_API, "drax-order", "__init__.py"))
router = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(router)

name = router._anhang_name("2026-10-15")
pruefe(name == "Drax-Bestellung-2026-10-15.pdf" and name.isascii(),
       f"TC-F6-02 Anhangname ist reines ASCII: {name}")

pruefe(router._liefertext(CFG, "2026-10-15") == "Do 15.10.2026 vormittags",
       f"TC-F5-03 Lieferzeile: {router._liefertext(CFG, '2026-10-15')}")

text = router._mail_text("2026-10-15", CFG, voll)
pruefe("11225" in text and "15.10.2026" in text and "Donnerstag" in text,
       "TC-F6-01 Mailtext nennt Kundennummer und Liefertag")
pruefe(all(p["name"] in text for p in voll),
       "TC-F6-01 jede Position steht auch im Mailtext")
pruefe("12 Positionen, 28 St\u00fcck" in text,
       "Mailtext nennt die Gesamtsumme")

# Korrektur: eine Menge geaendert, eine Position entfallen.
vorher = [{"nr": "40401", "menge": 4, "name": "Weizenmehl 405 1 kg"},
          {"nr": "88949", "menge": 2, "name": "Kokosmilch"}]
jetzt_pos = [{"nr": "40401", "menge": 6, "name": "Weizenmehl 405 1 kg"},
             {"nr": "40405", "menge": 1, "name": "Weizenmehl 405 5 kg"}]
zeilen, entfallen = router._korrekturzeilen(jetzt_pos, vorher)
pruefe([z.get("geaendert") for z in zeilen[:2]] == [True, None],
       "TC-F7-01 nur die geaenderte Menge wird hervorgehoben")
pruefe(len(entfallen) == 1 and entfallen[0]["nr"] == "88949"
       and entfallen[0]["menge"] == 0 and entfallen[0]["gestrichen"],
       f"TC-F7-03 entfallene Position wird gestrichen angehaengt: {entfallen}")
pruefe(zeilen[-1] is entfallen[0] or zeilen[-1]["nr"] == "88949",
       "Gestrichene Zeilen stehen am Ende")
ktext = router._mail_text("2026-10-15", CFG, jetzt_pos,
                          korrektur=True, entfallen=entfallen)
pruefe("Korrektur" in ktext and "entfallen" in ktext and "88949" in ktext,
       "TC-F7-03 Korrekturmail benennt die entfallene Position")

# Erste Bestellung: ohne Vorgaenger ist nichts geaendert und nichts entfallen.
z2, e2 = router._korrekturzeilen(jetzt_pos, [])
pruefe(e2 == [] and not any(z.get("geaendert") for z in z2),
       "Ohne Vorgaenger gibt es keine Korrekturmarken")

pruefe(router._aktive([{"nr": "1"}, {"nr": "2", "aktiv": False}])
       == [{"nr": "1"}],
       "TC-F10-03 ausgeblendete Artikel erscheinen nicht im Bildschirm")

# Einstellungen (F12)
gut = dict(CFG, empfaenger="bestellung@drax-muehle.de",
           bestellschluss="12:00", liefertag=3, bestellschluss_tag=2)
pruefe(router._config_pruefen(gut) is None,
       f"TC-F12-01 gueltige Einstellungen werden angenommen: "
       f"{router._config_pruefen(gut)}")
for schlecht, was in ((dict(gut, bestellschluss="25:00"), "Uhrzeit"),
                      (dict(gut, bestellschluss="12:70"), "Minute"),
                      (dict(gut, bestellschluss="zwoelf"), "Schreibweise"),
                      (dict(gut, liefertag=9), "Wochentag"),
                      (dict(gut, bestellschluss_tag=3), "Schlusstag"),
                      (dict(gut, empfaenger="drax-muehle"), "Adresse"),
                      (dict(gut, kd_nr=""), "Kundennummer")):
    m = router._config_pruefen(schlecht)
    pruefe(bool(m), f"TC-F12-02 unsinnige {was} wird abgewiesen: {m}")

pruefe(router.DATUM.match("2026-10-15") and not router.DATUM.match("15.10.2026"),
       "Nur ISO-Daten kommen durch die Route")


print()
if fehler:
    print(f"{len(fehler)} Pruefung(en) fehlgeschlagen:")
    for f in fehler:
        print(f"  - {f}")
    sys.exit(1)
print("Alle Pruefungen bestanden.")
