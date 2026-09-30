"""Registrierung fuehrt dorthin zurueck, wo sie begann.

Spec: specs/registrierung-herkunft/spec.md

Aus dem Laden: "Nach Registrierung eines Kunden landet dieser im Shop,
obwohl die Registrierung von der Homepage aufgerufen wurde. Der Kunde muss
dort landen, von wo er die Registrierung gestartet hat."

Ursache: Die Bestaetigungsseite (api/auth-verify) hatte fest einen Knopf
"Zum Shop". Die Herkunft wurde nirgends mitgefuehrt.

Der Sicherheitsfall: Das Ziel steht im Link aus der E-Mail. Waere es eine
freie Adresse, liesse sich ueber unsere Domain auf eine fremde Seite
weiterleiten. Deshalb nur Schluessel aus einer festen Liste (TC-RH-05).

Ausfuehren:  python tests/test_registrierung_herkunft.py
"""
import importlib.util
import json
import os
import sys

HIER = os.path.dirname(os.path.abspath(__file__))
API = os.path.abspath(os.path.join(HIER, "..", "api"))
sys.path.insert(0, API)

_fehler = []

# Die Windows-Konsole kennt Zeichen wie "→" nicht - ohne das wuerde
# ausgerechnet die FEHLER-Meldung mit einem UnicodeEncodeError abbrechen.
try:
    sys.stdout.reconfigure(errors="replace")
except Exception:
    pass


def pruefe(name, bedingung, hinweis=""):
    print(("  ok  " if bedingung else "  FEHLER  ") + name
          + ("" if bedingung or not hinweis else f"  -> {hinweis}"))
    if not bedingung:
        _fehler.append(name)


def lade(pfad, name):
    spec = importlib.util.spec_from_file_location(name, os.path.join(API, *pfad.split("/")))
    m = importlib.util.module_from_spec(spec)
    sys.modules[name] = m
    spec.loader.exec_module(m)
    return m


class Antwort:
    def __init__(self, code, rumpf):
        self.status_code = code
        self._r = rumpf
        self.text = json.dumps(rumpf)

    def json(self):
        return self._r


class Anfrage:
    def __init__(self, method="GET", params=None, body=None):
        self.method = method
        self.params = params or {}
        self.headers = {}
        self._b = body or {}

    def get_json(self):
        return self._b


# ── auth-verify: die Bestaetigungsseite ─────────────────────────────────

class VerifySpeicher:
    def __init__(self, bestaetigt=False):
        self.bestaetigt = bestaetigt

    def get(self, url, **kw):
        return Antwort(200, {"value": [{"dl_shopkundeid": "k1", "dl_vorname": "Anna",
                                        "dl_email_verifiziert": self.bestaetigt}]})

    def patch(self, url, **kw):
        return Antwort(204, {})


def bestaetigungsseite(ziel=None, bestaetigt=False):
    m = lade("auth-verify/__init__.py", f"verify_{ziel}_{bestaetigt}")
    m.get_token = lambda: "t"
    m.requests = VerifySpeicher(bestaetigt)
    p = {"token": "abc", "email": "anna@example.com"}
    if ziel is not None:
        p["ziel"] = ziel
    return m.main(Anfrage(params=p)).get_body().decode("utf-8")


def knopf(html):
    import re
    m = re.search(r'<a href="([^"]*)"[^>]*>([^<]*)</a>', html)
    return (m.group(1), m.group(2).strip()) if m else (None, None)


def test_rh01_startseite():
    href, text = knopf(bestaetigungsseite("start"))
    pruefe("TC-RH-01 ziel=start fuehrt zur Startseite", href == "/", f"war {href}")
    pruefe("TC-RH-01 Knopf heisst 'Zur Startseite'", text.startswith("Zur Startseite"), text)


def test_rh02_mittag():
    href, _ = knopf(bestaetigungsseite("mittag"))
    pruefe("TC-RH-02 ziel=mittag fuehrt zum Mittagstisch", href == "/mittagstisch-bestellen", f"war {href}")


def test_rh03_shop_und_alte_links():
    href, _ = knopf(bestaetigungsseite("shop"))
    pruefe("TC-RH-03 ziel=shop fuehrt zum Shop", href == "/shop.html", f"war {href}")
    href, _ = knopf(bestaetigungsseite(None))
    pruefe("TC-RH-03 Alte Links ohne ziel fuehren weiter zum Shop", href == "/shop.html", f"war {href}")


def test_rh04_auch_bereits_bestaetigt():
    href, _ = knopf(bestaetigungsseite("start", bestaetigt=True))
    pruefe("TC-RH-04 Auch 'bereits bestaetigt' fuehrt zur Startseite", href == "/", f"war {href}")


def test_rh05_keine_offene_weiterleitung():
    for boese in ["https://boese.example", "//boese.example", "/shop.html\"><script>",
                  "javascript:alert(1)"]:
        html = bestaetigungsseite(boese)
        href, _ = knopf(html)
        pruefe(f"TC-RH-05 fremdes Ziel '{boese[:24]}' wird ignoriert",
               href == "/shop.html" and "boese" not in html and "<script>" not in html,
               f"href={href}")


def test_rh06_text_passt():
    html = bestaetigungsseite("start")
    pruefe("TC-RH-06 Auf der Startseiten-Variante ist nicht vom Shop die Rede",
           "im Shop" not in html, "Text nennt noch den Shop")


# ── auth-register: die Herkunft reist in den Link ───────────────────────

class RegSpeicher:
    def get(self, url, **kw):
        return Antwort(200, {"value": []})

    def post(self, url, **kw):
        return Antwort(201, {"dl_shopkundeid": "neu-1"})

    def patch(self, url, **kw):
        return Antwort(204, {})


def registrieren(herkunft):
    m = lade("auth-register/__init__.py", f"reg_{herkunft}")
    m.get_token = lambda: "t"
    m.requests = RegSpeicher()
    gesendet = {}

    class Mail:
        @staticmethod
        def send_email(an, name, betreff, text, html=""):
            gesendet["text"] = text

    import importlib
    echt = importlib.import_module
    m_import = lambda n, *a, **k: Mail if n == "shop-notify" else echt(n, *a, **k)  # noqa: E731
    importlib.import_module = m_import
    try:
        body = {"email": "neu@example.com", "passwort": "geheim123", "vorname": "Neu",
                "nachname": "Kunde", "dsgvo_zustimmung": True, "agb_zustimmung": True,
                "ohne_bankdaten": True}
        if herkunft is not None:
            body["herkunft"] = herkunft
        m.main(Anfrage(method="POST", body=body))
    finally:
        importlib.import_module = echt
    return gesendet.get("text", "")


def test_rh07_register_haengt_ziel_an():
    pruefe("TC-RH-07 herkunft=start landet als &ziel=start im Link",
           "&ziel=start" in registrieren("start"))
    pruefe("TC-RH-07 herkunft=mittag landet als &ziel=mittag im Link",
           "&ziel=mittag" in registrieren("mittag"))


def test_rh08_register_verwirft_fremdes():
    text = registrieren("https://boese.example")
    pruefe("TC-RH-08 Fremde Herkunft kommt nicht in den Link",
           "ziel=" not in text and "boese" not in text, text[-120:])
    pruefe("TC-RH-08 Ohne Herkunft bleibt der Link wie bisher",
           "ziel=" not in registrieren(None))


if __name__ == "__main__":
    for name, f in sorted(globals().items()):
        if name.startswith("test_") and callable(f):
            f()
    print()
    if _fehler:
        print(f"{len(_fehler)} Waechter fehlgeschlagen")
        sys.exit(1)
    print("Alle Waechter gruen.")
