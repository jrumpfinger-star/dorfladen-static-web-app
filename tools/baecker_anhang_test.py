"""Der Mailanhang traegt den Namen der richtigen Baeckerei.

Aus dem Laden: „Wenn man Bestellung an Martins Backstube schicken will,
steht im Anhang Freundl-Bestellformular.docx. Das ist nur bei Freundl
Bestellung richtig, nicht bei Martins Backstube."

Der Dateiname hing am AUSGABEFORMAT statt an der Baeckerei:

    ANHANG = {"docx": ("Freundl-Bestellformular.docx", ...), ...}

Solange Freundl das Word-Format nutzte und Martin's das PDF, fiel das nicht
auf. Sobald aber Martin's auf Word steht, ging eine Datei mit dem Namen der
anderen Baeckerei hinaus — an eine fremde Firma.

Geprueft wird der ECHTE Versandweg: Der Graph-Aufruf wird abgefangen, damit
der Dateiname sichtbar wird, der tatsaechlich im Postfach ankaeme.

Ausfuehren:  python tools/baecker_anhang_test.py
"""
import importlib.util
import os
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
API = os.path.join(ROOT, "api")
sys.path.insert(0, API)
sys.path.insert(0, os.path.join(API, "baecker-order"))

import msal          # noqa: E402
import requests      # noqa: E402


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
#  Graph-Ersatz: der Versand wird abgefangen
# ──────────────────────────────────────────────────────────────────────

class Antwort:
    def __init__(self, status=202, text=""):
        self.status_code = status
        self.text = text

    def json(self):
        return {}


class Spion:
    def __init__(self):
        self.sendungen = []

    def post(self, url, **kw):
        if "sendMail" in url:
            self.sendungen.append(kw.get("json") or {})
            return Antwort(202)
        return Antwort(200)

    def get(self, url, **kw):
        return Antwort(404)   # keine Kontaktdaten: Standardwerte greifen

    def anhangsnamen(self):
        n = self.sendungen[-1]["message"].get("attachments", [])
        return [a.get("name") for a in n]


class TokenErsatz:
    def __init__(self, *a, **kw):
        pass

    def acquire_token_for_client(self, scopes=None):
        return {"access_token": "test"}


spion = Spion()
requests.post = spion.post
requests.get = spion.get
msal.ConfidentialClientApplication = TokenErsatz
os.environ["DV_CLIENT_SECRET"] = "test"
os.environ.setdefault("DV_TENANT_ID", "00000000-0000-0000-0000-000000000000")
os.environ.setdefault("DV_CLIENT_ID", "00000000-0000-0000-0000-000000000001")

bo = lade("baecker-order/__init__.py", "baecker_order_anhang")


# ──────────────────────────────────────────────────────────────────────
#  TC-A01 … TC-A06
# ──────────────────────────────────────────────────────────────────────

def test_namensbildung():
    print("\nNamensbildung")

    pruefe("TC-A01: Martin's Backstube heisst auch so",
           bo._anhang_name({"name": "Martin's Backstube"}, "docx")[0]
           == "Martins-Backstube-Bestellformular.docx",
           bo._anhang_name({"name": "Martin's Backstube"}, "docx")[0])

    pruefe("TC-A02: Freundl heisst auch so",
           bo._anhang_name({"name": "B\u00e4ckerei Freundl"}, "docx")[0]
           == "Baeckerei-Freundl-Bestellformular.docx",
           bo._anhang_name({"name": "B\u00e4ckerei Freundl"}, "docx")[0])

    pruefe("TC-A03: die Endung folgt dem Format",
           bo._anhang_name({"name": "Martin's Backstube"}, "pdf")[0]
           .endswith(".pdf"))

    # Der Name landet bei einer fremden Firma — reines ASCII kommt ueberall
    # unbeschaedigt an.
    name = bo._anhang_name({"name": "B\u00e4ckerei M\u00fcller & S\u00f6hne"}, "docx")[0]
    pruefe("TC-A04: Umlaute werden umgeschrieben, Sonderzeichen entfallen",
           name == "Baeckerei-Mueller-Soehne-Bestellformular.docx", name)

    pruefe("TC-A05: ohne Namen bleibt ein brauchbarer Rueckfall",
           bo._anhang_name({}, "docx")[0] == "Baeckerei-Bestellformular.docx",
           bo._anhang_name({}, "docx")[0])


def test_versandweg():
    print("\nEchter Versandweg")

    for cfg, erwartet in [
        ({"name": "Martin's Backstube"}, "Martins-Backstube-Bestellformular.docx"),
        ({"name": "B\u00e4ckerei Freundl"}, "Baeckerei-Freundl-Bestellformular.docx"),
    ]:
        bo._send_mail("test@example.com", "Test", "Bestellung", "Text",
                      b"PK-testinhalt", "docx", bcfg=cfg)
        namen = spion.anhangsnamen()
        pruefe(f"TC-A06: Versand an {cfg['name']} traegt {erwartet}",
               namen == [erwartet], f"war {namen}")


if __name__ == "__main__":
    test_namensbildung()
    test_versandweg()
    print("\nAlle Pr\u00fcfungen bestanden.")
