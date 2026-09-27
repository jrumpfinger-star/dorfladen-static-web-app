"""Konto ohne Bankverbindung (Spec konto-ohne-bankdaten).

Aus dem Laden: „Es sollte die Moeglichkeit geben, ohne den Bestellshop
das Konto anzulegen, aber IBAN ist dann kein Pflichtfeld."

Der heikle Punkt ist nicht das Weglassen der Pflichtfelder, sondern was
dabei GESPEICHERT wird. Ein SEPA-Mandat ohne IBAN waere ein Papier ueber
nichts: Es truege eine Mandatsreferenz, den Status „aktiv" und die
Angabe, es sei digital unterschrieben worden - und behauptete damit eine
Einzugsermaechtigung, die niemand erteilt hat. Genau darauf zielen die
meisten Faelle hier.

Ausfuehren:  python tests/test_konto_ohne_bank.py
"""
import importlib.util
import json
import os
import sys

HIER = os.path.dirname(os.path.abspath(__file__))
API = os.path.abspath(os.path.join(HIER, "..", "api"))
sys.path.insert(0, API)

import requests      # noqa: E402

_fehler = []

# Eine formal gueltige Test-IBAN (Pruefziffern stimmen).
IBAN_OK = "DE89370400440532013000"


def pruefe(name, bedingung, hinweis=""):
    if bedingung:
        print(f"  ok  {name}")
    else:
        print(f"  FEHLER  {name}" + (f"  -> {hinweis}" if hinweis else ""))
        _fehler.append(name)


def lade(pfad, name):
    spec = importlib.util.spec_from_file_location(
        name, os.path.join(API, *pfad.split("/")))
    modul = importlib.util.module_from_spec(spec)
    sys.modules[name] = modul
    spec.loader.exec_module(modul)
    return modul


class Antwort:
    def __init__(self, code, rumpf):
        self.status_code = code
        self._rumpf = rumpf
        self.text = json.dumps(rumpf)

    def json(self):
        return self._rumpf


class Speicher:
    """Ersatz-Dataverse. Merkt sich, was wirklich geschrieben wurde."""

    def __init__(self):
        self.geschrieben = None

    def get(self, url, **kw):
        # Keine Adresse ist schon vergeben.
        return Antwort(200, {"value": []})

    def post(self, url, **kw):
        self.geschrieben = kw.get("json")
        return Antwort(201, {"dl_shopkundeid": "neu-1"})

    def patch(self, url, **kw):
        return Antwort(204, {})


class Anfrage:
    def __init__(self, body):
        self.method = "POST"
        self.headers = {}
        self.params = {}
        self._body = body

    def get_json(self):
        return self._body


def felder(ohne_bank=True, **anders):
    d = {
        "email": "neu@example.com",
        "passwort": "geheim123",
        "vorname": "Anna",
        "nachname": "Beispiel",
        "dsgvo_zustimmung": True,
        "agb_zustimmung": True,
    }
    if ohne_bank:
        d["ohne_bankdaten"] = True
    else:
        d.update({
            "telefon": "0123456", "strasse": "Dorfplatz 1",
            "plz": "84419", "ort": "Obertaufkirchen",
            "iban": IBAN_OK, "kontoinhaber": "Anna Beispiel",
            "sepa_zustimmung": True,
        })
    d.update(anders)
    return d


def main():
    print("Konto ohne Bankverbindung\n")
    reg = lade("auth-register/__init__.py", "auth_register_test")
    reg.get_token = lambda: "test-token"

    def anlegen(body):
        dv = Speicher()
        requests.get, requests.post, requests.patch = dv.get, dv.post, dv.patch
        antwort = reg.main(Anfrage(body))
        try:
            daten = json.loads(antwort.get_body().decode("utf-8"))
        except Exception:
            daten = {}
        return antwort, daten, dv

    # ── TC-KB-01: Das leichte Konto entsteht ohne IBAN
    print("TC-KB-01  Anlegen ohne Bankverbindung")
    antwort, daten, dv = anlegen(felder())
    pruefe("TC-KB-01  wird angenommen", antwort.status_code in (200, 201),
           f"war {antwort.status_code}: {daten}")
    pruefe("TC-KB-01  ein Datensatz wurde geschrieben", dv.geschrieben is not None)

    # ── TC-KB-02: KEIN Lastschriftmandat. Der wichtigste Fall.
    print("\nTC-KB-02  Es entsteht kein Mandat ueber nichts")
    g = dv.geschrieben or {}
    pruefe("TC-KB-02  kein SEPA-Mandat hinterlegt",
           not (g.get("dl_sepa_mandat_json") or ""),
           f"war: {str(g.get('dl_sepa_mandat_json'))[:120]}")
    pruefe("TC-KB-02  keine Mandatsreferenz",
           not (g.get("dl_mandatsreferenz") or ""),
           f"war: {g.get('dl_mandatsreferenz')}")
    pruefe("TC-KB-02  kein Mandatsstatus 'aktiv'",
           g.get("dl_mandatsstatus") != "aktiv",
           f"war: {g.get('dl_mandatsstatus')}")
    pruefe("TC-KB-02  das IBAN-Feld bleibt leer",
           not (g.get("dl_iban_encrypted") or ""),
           f"war: {str(g.get('dl_iban_encrypted'))[:60]}")

    # ── TC-KB-03: Name, Adresse und Anmeldung stimmen trotzdem
    print("\nTC-KB-03  Was gespeichert wird, stimmt")
    pruefe("TC-KB-03  E-Mail ist da", g.get("dl_email") == "neu@example.com")
    pruefe("TC-KB-03  Name ist da",
           g.get("dl_vorname") == "Anna" and g.get("dl_nachname") == "Beispiel")
    pruefe("TC-KB-03  Passwort ist gehasht, nicht im Klartext",
           (g.get("dl_passwort_hash") or "").startswith("$2")
           and "geheim123" not in json.dumps(g))
    pruefe("TC-KB-03  Adresse muss NICHT angegeben werden",
           (g.get("dl_strasse") or "") == "")
    pruefe("TC-KB-03  die Bestaetigung der Adresse steht noch aus",
           g.get("dl_email_verifiziert") is False)

    # ── TC-KB-04: Zustimmungen bleiben Pflicht - auch ohne Bankdaten
    print("\nTC-KB-04  Datenschutz und AGB bleiben Pflicht")
    for feld, text in (("dsgvo_zustimmung", "Datenschutz"),
                       ("agb_zustimmung", "AGB")):
        b = felder()
        b[feld] = False
        antwort, daten, dv = anlegen(b)
        pruefe(f"TC-KB-04  ohne {text} wird abgewiesen",
               antwort.status_code == 400, f"war {antwort.status_code}")
        pruefe(f"TC-KB-04  und nichts gespeichert ({text})",
               dv.geschrieben is None)

    # ── TC-KB-05: Name und Passwort bleiben Pflicht
    print("\nTC-KB-05  Name und Passwort bleiben Pflicht")
    for feld, wert, text in (("vorname", "", "Vorname"),
                             ("nachname", "", "Nachname"),
                             ("passwort", "kurz", "kurzes Passwort"),
                             ("email", "keine-adresse", "unsinnige Adresse")):
        antwort, daten, dv = anlegen(felder(**{feld: wert}))
        pruefe(f"TC-KB-05  {text} wird abgewiesen",
               antwort.status_code == 400, f"war {antwort.status_code}")

    # ── TC-KB-06: Der Schalter muss ausdruecklich gesetzt sein.
    # Sonst koennte eine unterwegs verlorene IBAN stillschweigend ein
    # Konto ohne Mandat erzeugen.
    print("\nTC-KB-06  Ohne den Schalter bleibt alles beim Alten")
    b = felder(ohne_bank=False)
    b.pop("iban")
    antwort, daten, dv = anlegen(b)
    pruefe("TC-KB-06  fehlende IBAN wird weiterhin abgewiesen",
           antwort.status_code == 400, f"war {antwort.status_code}")
    pruefe("TC-KB-06  mit Hinweis auf die IBAN",
           any("IBAN" in f for f in daten.get("errors", [])),
           f"Meldungen: {daten.get('errors')}")

    # ── TC-KB-07: Das volle Konto bleibt unveraendert - mit Mandat.
    print("\nTC-KB-07  Das Konto MIT Bankverbindung bleibt wie es war")
    antwort, daten, dv = anlegen(felder(ohne_bank=False))
    pruefe("TC-KB-07  wird angenommen", antwort.status_code in (200, 201),
           f"war {antwort.status_code}: {daten}")
    g = dv.geschrieben or {}
    pruefe("TC-KB-07  ein SEPA-Mandat entsteht",
           bool(g.get("dl_sepa_mandat_json")))
    pruefe("TC-KB-07  mit Mandatsreferenz",
           bool(g.get("dl_mandatsreferenz")))
    pruefe("TC-KB-07  und Status aktiv",
           g.get("dl_mandatsstatus") == "aktiv")
    pruefe("TC-KB-07  die IBAN steht verschluesselt da, nicht im Klartext",
           (g.get("dl_iban_encrypted") or "").startswith(("ENC:", "ENC2:"))
           and IBAN_OK not in json.dumps(g),
           f"war: {str(g.get('dl_iban_encrypted'))[:40]}")

    # ── TC-KB-08: Eine freiwillig angegebene, aber falsche IBAN ist ein
    # Tippfehler - keine Entscheidung gegen die Lastschrift.
    print("\nTC-KB-08  Freiwillige IBAN wird trotzdem geprueft")
    antwort, daten, dv = anlegen(felder(iban="DE00 kaputt"))
    pruefe("TC-KB-08  unbrauchbare IBAN wird nicht stillschweigend verworfen",
           antwort.status_code == 400, f"war {antwort.status_code}")

    print()
    if _fehler:
        print(f"{len(_fehler)} Pruefung(en) fehlgeschlagen:")
        for f in _fehler:
            print(f"  - {f}")
        sys.exit(1)
    print("Alle Pruefungen bestanden.")


if __name__ == "__main__":
    main()
