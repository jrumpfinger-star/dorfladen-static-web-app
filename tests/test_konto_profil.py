"""Profil bearbeiten (Spec konto-profil-bearbeiten).

Aus dem Laden: "Es muss auch hier moeglich sein, sein Profil (Konto) zu
bearbeiten und zu aendern, wie es Standard ist in Online-Anwendungen."

Bisher gab es unter "Mein Konto" nur "Abmelden" - keinen einzigen Weg,
Name, E-Mail oder Passwort zu aendern.

Die Kundenkennung kommt ausschliesslich aus dem Anmeldezeichen (X-Shop-
Token), nie aus dem Anfragetext - der teuerste Fehlerfall waere, ein
fremdes Profil ueber eine im Text mitgeschickte ID aendern zu koennen.
Zwei Felder gelten als sicherheitsrelevant (E-Mail, Passwort) und
verlangen das aktuelle Passwort; Name und Telefon nicht.

Ausfuehren:  python tests/test_konto_profil.py
"""
import importlib.util
import json
import os
import sys
from datetime import datetime, timedelta

HIER = os.path.dirname(os.path.abspath(__file__))
API = os.path.abspath(os.path.join(HIER, "..", "api"))
sys.path.insert(0, API)

import bcrypt             # noqa: E402
import jwt as pyjwt        # noqa: E402

JWT_SECRET = "dorfladen-shop-secret-change-in-production-2026"
KUNDE_ID = "kunde-1"

_fehler = []


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


def zeichen(email, kunde_id=KUNDE_ID):
    jetzt = datetime.utcnow()
    nutz = {
        "sub": kunde_id, "email": email, "name": "Anna Beispiel",
        "iat": jetzt - timedelta(days=1), "exp": jetzt + timedelta(days=90),
    }
    return pyjwt.encode(nutz, JWT_SECRET, algorithm="HS256")


PASSWORT_ALT = "geheim123"
HASH_ALT = bcrypt.hashpw(PASSWORT_ALT.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


class Antwort:
    def __init__(self, code, rumpf):
        self.status_code = code
        self._rumpf = rumpf
        self.text = json.dumps(rumpf)

    def json(self):
        return self._rumpf


class Anfrage:
    def __init__(self, method="GET", headers=None, body=None):
        self.method = method
        self.headers = headers or {}
        self._body = body or {}

    def get_json(self):
        return self._body


class Speicher:
    """Ersatz-Dataverse mit EINEM Datensatz, der sich merkt, was
    geaendert wurde - damit die Waechter pruefen koennen, was wirklich
    ankam, nicht nur, was die Antwort behauptet."""

    def __init__(self):
        self.datensatz = {
            "dl_shopkundeid": KUNDE_ID,
            "dl_vorname": "Anna", "dl_nachname": "Beispiel",
            "dl_email": "anna@example.com", "dl_telefon": "",
            "dl_passwort_hash": HASH_ALT,
            "dl_email_verifiziert": True, "dl_mandatsstatus": "",
        }
        self.patch_aufrufe = []

    def get(self, url, **kw):
        if "$filter=dl_email" in url:
            # Suche nach vergebener E-Mail: nur ein Treffer, wenn die
            # gesuchte Adresse zu einem ANDEREN Datensatz gehoert.
            import re
            m = re.search(r"dl_email eq '([^']+)'", url)
            gesucht = m.group(1) if m else ""
            treffer = [self.datensatz] if gesucht == self.datensatz["dl_email"] else []
            return Antwort(200, {"value": treffer})
        return Antwort(200, dict(self.datensatz))

    def patch(self, url, **kw):
        self.patch_aufrufe.append(kw.get("json") or {})
        self.datensatz.update(kw.get("json") or {})
        return Antwort(204, {})


def modul_mit_speicher():
    m = lade("auth-profile/__init__.py", "auth_profil_test_" + str(id(object())))
    m.get_token = lambda: "dv-test-token"
    speicher = Speicher()
    m.requests = speicher
    return m, speicher


# ── GET: das eigene Profil ansehen ─────────────────────────────────────

def test_get_ohne_zeichen_ist_401():
    m, _ = modul_mit_speicher()
    antwort = m.main(Anfrage(method="GET"))
    pruefe("GET ohne Anmeldezeichen -> 401", antwort.status_code == 401)


def test_get_zeigt_eigenes_profil():
    m, s = modul_mit_speicher()
    req = Anfrage(method="GET", headers={"X-Shop-Token": zeichen("anna@example.com")})
    antwort = m.main(req)
    pruefe("GET mit Zeichen -> 200", antwort.status_code == 200)
    daten = json.loads(antwort.get_body().decode("utf-8"))
    profil = daten.get("profil", {})
    pruefe("Vorname kommt aus dem Speicher", profil.get("vorname") == "Anna")
    pruefe("E-Mail kommt aus dem Speicher", profil.get("email") == "anna@example.com")


# ── PATCH: harmlose Felder ohne Passwort ───────────────────────────────

def test_name_aendern_ohne_passwort():
    m, s = modul_mit_speicher()
    req = Anfrage(method="PATCH",
                  headers={"X-Shop-Token": zeichen("anna@example.com")},
                  body={"vorname": "Anna-Maria"})
    antwort = m.main(req)
    pruefe("Namensaenderung ohne Passwort gelingt", antwort.status_code == 200,
           f"Status {antwort.status_code}: {antwort.get_body().decode('utf-8')[:200]}")
    pruefe("Der neue Vorname steht im Speicher",
           s.datensatz["dl_vorname"] == "Anna-Maria")


def test_leerer_vorname_wird_abgelehnt():
    m, s = modul_mit_speicher()
    req = Anfrage(method="PATCH",
                  headers={"X-Shop-Token": zeichen("anna@example.com")},
                  body={"vorname": "   "})
    antwort = m.main(req)
    pruefe("Leerer Vorname -> 400", antwort.status_code == 400)


# ── PATCH: E-Mail und Passwort verlangen das aktuelle Passwort ────────

def test_email_aendern_ohne_passwort_wird_abgelehnt():
    m, s = modul_mit_speicher()
    req = Anfrage(method="PATCH",
                  headers={"X-Shop-Token": zeichen("anna@example.com")},
                  body={"email": "neu@example.com"})
    antwort = m.main(req)
    pruefe("E-Mail-Aenderung ohne aktuelles Passwort -> 400",
           antwort.status_code == 400)
    pruefe("Die alte E-Mail steht weiterhin im Speicher",
           s.datensatz["dl_email"] == "anna@example.com")


def test_email_aendern_mit_falschem_passwort_wird_abgelehnt():
    m, s = modul_mit_speicher()
    req = Anfrage(method="PATCH",
                  headers={"X-Shop-Token": zeichen("anna@example.com")},
                  body={"email": "neu@example.com", "aktuelles_passwort": "falsch"})
    antwort = m.main(req)
    pruefe("Falsches aktuelles Passwort -> 401", antwort.status_code == 401)
    pruefe("Die alte E-Mail bleibt unveraendert",
           s.datensatz["dl_email"] == "anna@example.com")


def test_email_aendern_mit_richtigem_passwort_gelingt():
    m, s = modul_mit_speicher()
    req = Anfrage(method="PATCH",
                  headers={"X-Shop-Token": zeichen("anna@example.com")},
                  body={"email": "neu@example.com", "aktuelles_passwort": PASSWORT_ALT})
    antwort = m.main(req)
    pruefe("E-Mail-Aenderung mit richtigem Passwort -> 200",
           antwort.status_code == 200, f"Status {antwort.status_code}: {antwort.get_body().decode('utf-8')[:200]}")
    pruefe("Die neue E-Mail steht im Speicher",
           s.datensatz["dl_email"] == "neu@example.com")
    pruefe("Die E-Mail gilt danach wieder als unbestaetigt",
           s.datensatz["dl_email_verifiziert"] is False)
    rumpf = json.loads(antwort.get_body().decode("utf-8"))
    pruefe("Ein neues Anmeldezeichen kommt zurueck", bool(rumpf.get("token")))
    if rumpf.get("token"):
        neu = pyjwt.decode(rumpf["token"], JWT_SECRET, algorithms=["HS256"])
        pruefe("Das neue Zeichen traegt die neue E-Mail-Adresse",
               neu.get("email") == "neu@example.com")


def test_email_auf_bereits_vergebene_adresse_wird_abgelehnt():
    m, s = modul_mit_speicher()
    # Ein zweiter Kunde mit der Wunschadresse existiert bereits.
    andere_email = "vergeben@example.com"
    urspruenglich_get = s.get
    def get_mit_zweitem_kunden(url, **kw):
        if "$filter=dl_email" in url and andere_email in url:
            return Antwort(200, {"value": [{"dl_shopkundeid": "anderer-kunde"}]})
        return urspruenglich_get(url, **kw)
    s.get = get_mit_zweitem_kunden

    req = Anfrage(method="PATCH",
                  headers={"X-Shop-Token": zeichen("anna@example.com")},
                  body={"email": andere_email, "aktuelles_passwort": PASSWORT_ALT})
    antwort = m.main(req)
    pruefe("Vergebene E-Mail -> 409", antwort.status_code == 409)


def test_passwort_aendern_ohne_aktuelles_wird_abgelehnt():
    m, s = modul_mit_speicher()
    req = Anfrage(method="PATCH",
                  headers={"X-Shop-Token": zeichen("anna@example.com")},
                  body={"neues_passwort": "neuespasswort123"})
    antwort = m.main(req)
    pruefe("Passwortaenderung ohne aktuelles Passwort -> 400",
           antwort.status_code == 400)


def test_passwort_aendern_mit_richtigem_passwort_gelingt():
    m, s = modul_mit_speicher()
    alter_hash = s.datensatz["dl_passwort_hash"]
    req = Anfrage(method="PATCH",
                  headers={"X-Shop-Token": zeichen("anna@example.com")},
                  body={"neues_passwort": "neuesPasswort123", "aktuelles_passwort": PASSWORT_ALT})
    antwort = m.main(req)
    pruefe("Passwortaenderung mit richtigem Passwort -> 200",
           antwort.status_code == 200, f"Status {antwort.status_code}: {antwort.get_body().decode('utf-8')[:200]}")
    pruefe("Der gespeicherte Hash hat sich geaendert",
           s.datensatz["dl_passwort_hash"] != alter_hash)
    pruefe("Das NEUE Passwort passt zum gespeicherten Hash",
           bcrypt.checkpw(b"neuesPasswort123", s.datensatz["dl_passwort_hash"].encode("utf-8")))
    pruefe("Das ALTE Passwort passt NICHT mehr",
           not bcrypt.checkpw(PASSWORT_ALT.encode("utf-8"), s.datensatz["dl_passwort_hash"].encode("utf-8")))


def test_zu_kurzes_neues_passwort_wird_abgelehnt():
    m, s = modul_mit_speicher()
    req = Anfrage(method="PATCH",
                  headers={"X-Shop-Token": zeichen("anna@example.com")},
                  body={"neues_passwort": "kurz", "aktuelles_passwort": PASSWORT_ALT})
    antwort = m.main(req)
    pruefe("Zu kurzes neues Passwort -> 400", antwort.status_code == 400)


def test_fremdes_profil_ueber_id_im_text_ist_nicht_erreichbar():
    """Der teuerste Fall: Steht die Kundenkennung im Anfragetext statt
    ausschliesslich im Zeichen, koennte jeder ein fremdes Profil ändern,
    indem er dessen ID eintraegt. Dieser Wächter belegt, dass eine ID im
    Textkoerper schlicht IGNORIERT wird - massgeblich ist immer die ID
    aus dem Zeichen."""
    m, s = modul_mit_speicher()
    req = Anfrage(method="PATCH",
                  headers={"X-Shop-Token": zeichen("anna@example.com")},
                  body={"id": "irgendein-fremdes-konto", "vorname": "Uebernommen"})
    antwort = m.main(req)
    rumpf = json.loads(antwort.get_body().decode("utf-8"))
    pruefe("Die Antwort betrifft weiterhin das EIGENE Konto",
           rumpf.get("kunde", {}).get("id") == KUNDE_ID,
           f"war: {rumpf.get('kunde')}")


if __name__ == "__main__":
    for name, funktion in sorted(globals().items()):
        if name.startswith("test_") and callable(funktion):
            print(f"{name}:")
            funktion()

    print()
    if _fehler:
        print(f"{len(_fehler)} Wächter fehlgeschlagen: {', '.join(_fehler)}")
        sys.exit(1)
    print("Alle Wächter grün.")
