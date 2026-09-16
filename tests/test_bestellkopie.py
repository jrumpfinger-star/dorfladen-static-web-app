"""Bestellkopie an den Laden (Spec specs/bestellkopie-laden).

Hintergrund: Gesendet wird aus dem technischen onmicrosoft.com-Postfach.
Die Kopie in „Gesendet" liegt deshalb dort — und nicht im Postfach
info@dorfladen-oberornau.de, in das im Laden geschaut wird. Aus diesem
Postfach zu senden ist nicht moeglich: Microsoft Graph loest die Adresse
im Tenant nicht auf (404 ErrorInvalidUser, live nachgemessen). Also geht
eine Kopie per CC dorthin.

Geprueft wird der ECHTE Versandweg der drei Bestell-Endpunkte, nicht nur
ihr Quelltext: Graph-Anmeldung und HTTP werden unterhalb ersetzt, sodass
die Nutzlast sichtbar wird, die tatsaechlich an Graph ginge.

Ausfuehren:  python tests/test_bestellkopie.py
"""
import importlib.util
import os
import sys

HIER = os.path.dirname(os.path.abspath(__file__))
API = os.path.abspath(os.path.join(HIER, "..", "api"))
sys.path.insert(0, API)

import msal          # noqa: E402
import requests      # noqa: E402

LADEN = "info@dorfladen-oberornau.de"


def lade(pfad, name):
    spec = importlib.util.spec_from_file_location(
        name, os.path.join(API, *pfad.split("/")))
    modul = importlib.util.module_from_spec(spec)
    sys.modules[name] = modul
    spec.loader.exec_module(modul)
    return modul


def pruefe(name, bedingung, hinweis=""):
    if not bedingung:
        raise AssertionError(f"{name}{(' — ' + hinweis) if hinweis else ''}")
    print(f"  ok  {name}")


# ──────────────────────────────────────────────────────────────────────
#  Graph-Ersatz: Anmeldung und HTTP werden abgefangen
# ──────────────────────────────────────────────────────────────────────

class Antwort:
    def __init__(self, status=202, text=""):
        self.status_code = status
        self.text = text

    def json(self):
        return {}


class GraphSpion:
    """Faengt jeden Graph-Aufruf ab und merkt sich die Nutzlast."""

    def __init__(self):
        self.sendungen = []

    def post(self, url, **kw):
        if "sendMail" in url:
            self.sendungen.append({"url": url, "payload": kw.get("json") or {}})
            return Antwort(202)
        return Antwort(200)

    def get(self, url, **kw):
        # Kontaktdaten aus Dataverse: leer lassen, damit die im Code
        # hinterlegten Standardwerte greifen.
        return Antwort(404)

    @property
    def letzte(self):
        return self.sendungen[-1]["payload"]["message"]

    def cc(self):
        return [e["emailAddress"]["address"]
                for e in self.letzte.get("ccRecipients", [])]


class TokenErsatz:
    def __init__(self, *a, **kw):
        pass

    def acquire_token_for_client(self, scopes=None):
        return {"access_token": "test-token"}


spion = GraphSpion()
requests.post = spion.post
requests.get = spion.get
msal.ConfidentialClientApplication = TokenErsatz
# Platzhalter statt echter Zugangsdaten: Der Graph-Aufruf wird ohnehin
# abgefangen, die Werte muessen nur gesetzt sein.
os.environ["DV_CLIENT_SECRET"] = "test"
os.environ.setdefault("DV_TENANT_ID", "00000000-0000-0000-0000-000000000000")
os.environ.setdefault("DV_CLIENT_ID", "00000000-0000-0000-0000-000000000001")

notify = lade("shop-notify/__init__.py", "shop_notify_test")


def frische_kontakte(**aenderungen):
    """Kontaktdaten setzen und den Zwischenspeicher fuellen."""
    ci = dict(notify.CONTACT_DEFAULTS)
    ci.update(aenderungen)
    notify._contact_cache = ci
    notify._contact_cache_zeit = notify.time.time()
    return ci


# ──────────────────────────────────────────────────────────────────────
#  TC-K01 … TC-K05: der Versender
# ──────────────────────────────────────────────────────────────────────

def test_versender():
    print("\nVersender (shop-notify.send_email)")

    frische_kontakte()
    notify.send_email("metzger@example.com", "Metzger", "Bestellung", "Text",
                      kopie_an_laden=True)
    pruefe("TC-K01: Kopie geht an die Ladenadresse",
           spion.cc() == [LADEN], f"CC war {spion.cc()}")

    frische_kontakte()
    notify.send_email("kunde@example.com", "Kunde", "Bestaetigung", "Text")
    pruefe("TC-K02: ohne Anforderung keine Kopie",
           "ccRecipients" not in spion.letzte,
           f"CC war {spion.letzte.get('ccRecipients')}")

    frische_kontakte()
    notify.send_email(LADEN, "Laden", "Bestellung", "Text", kopie_an_laden=True)
    pruefe("TC-K03: keine Kopie an sich selbst",
           "ccRecipients" not in spion.letzte,
           "Empfaenger ist bereits der Laden")

    frische_kontakte(kopie_an="buchhaltung@example.com")
    notify.send_email("metzger@example.com", "Metzger", "Bestellung", "Text",
                      kopie_an_laden=True)
    pruefe("TC-K04: `kopie_an` sticht die allgemeine Adresse",
           spion.cc() == ["buchhaltung@example.com"], f"CC war {spion.cc()}")

    frische_kontakte(kopie_an="")
    notify.send_email("metzger@example.com", "Metzger", "Bestellung", "Text",
                      kopie_an_laden=True)
    pruefe("TC-K05: leerer Eintrag faellt auf die Ladenadresse zurueck",
           spion.cc() == [LADEN],
           "einmal Speichern im CMS darf die Kopie nicht abschalten")

    frische_kontakte(kopie_an="aus")
    notify.send_email("metzger@example.com", "Metzger", "Bestellung", "Text",
                      kopie_an_laden=True)
    pruefe("TC-K05b: `aus` schaltet die Kopie ausdruecklich ab",
           "ccRecipients" not in spion.letzte,
           f"CC war {spion.letzte.get('ccRecipients')}")


# ──────────────────────────────────────────────────────────────────────
#  TC-K06 … TC-K08: die drei Bestell-Endpunkte, echter Weg
# ──────────────────────────────────────────────────────────────────────

def test_endpunkte():
    print("\nBestell-Endpunkte (echter Versandweg)")

    metzger = lade("metzger-order/__init__.py", "metzger_order_test")
    metzger._send_mail("metzger@example.com", "Metzger Mair",
                       "Bestellung", "Text", b"%PDF-1.4 test")
    pruefe("TC-K06: Metzger-Bestellung geht in Kopie an den Laden",
           spion.cc() == [LADEN], f"CC war {spion.cc()}")

    getraenke = lade("getraenke-order/__init__.py", "getraenke_order_test")
    getraenke._send_mail("kratzer@example.com", "Kratzer", "Bestellung", "Text")
    pruefe("TC-K07: Getraenke-Bestellung geht in Kopie an den Laden",
           spion.cc() == [LADEN], f"CC war {spion.cc()}")

    baecker = lade("baecker-order/__init__.py", "baecker_order_test")
    baecker._send_mail("baecker@example.com", "Baeckerei", "Bestellung",
                       "Text", b"PK test", "docx")
    pruefe("TC-K08: Baecker-Bestellung geht in Kopie an den Laden",
           spion.cc() == [LADEN], f"CC war {spion.cc()}")


# ──────────────────────────────────────────────────────────────────────
#  TC-K09: der Zwischenspeicher darf nicht ewig halten
# ──────────────────────────────────────────────────────────────────────

def test_haltezeit():
    print("\nHaltezeit der Kontaktdaten")

    pruefe("TC-K09: Kontaktdaten werden nur begrenzt gehalten",
           0 < notify._CONTACT_TTL <= 900,
           f"Haltezeit ist {notify._CONTACT_TTL} s")

    # Abgelaufener Zwischenspeicher wird neu geladen, statt einen
    # veralteten Wert festzuhalten. Genau daran hing der Versand fest,
    # nachdem ein fehlerhaftes Absenderpostfach zurueckgestellt war.
    notify._contact_cache = {"mailbox": "alt@example.com"}
    notify._contact_cache_zeit = notify.time.time() - notify._CONTACT_TTL - 1
    neu = notify.get_contact_info()
    pruefe("TC-K10: abgelaufener Eintrag wird verworfen",
           neu.get("mailbox") != "alt@example.com",
           f"es blieb {neu.get('mailbox')}")


if __name__ == "__main__":
    test_versender()
    test_endpunkte()
    test_haltezeit()
    print("\nAlle Prüfungen bestanden.")
