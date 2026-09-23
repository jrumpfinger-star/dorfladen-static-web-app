"""Zeitangaben stehen projektweit in Ladenzeit.

Spec: specs/zeitzone-projektweit/spec.md (TC-TZ-01 … TC-TZ-06)

Aus dem Laden gemeldet am Sendestempel der Baeckerei: „Das gesendete Datum
wird falsch angezeigt." Ursache war ``datetime.now()`` auf einer Laufzeit,
die in UTC laeuft. Derselbe Fehler steckte in 19 weiteren Modulen.

Dieser Waechter haelt den bereinigten Zustand fest. Er prueft den
**Syntaxbaum**, nicht den Text - ein Textvergleich schluege auch auf
Beschreibungen an, in denen ``datetime.now()`` als das Falsche erwaehnt
wird.

Die 18 verbliebenen Stellen sind einzeln geprueft und hier mit Begruendung
aufgefuehrt. Kommt eine neue hinzu, faellt der Waechter - genau das ist
seine Aufgabe. Wer eine Ausnahme ergaenzt, muss sie begruenden.

Ausfuehren:  python tools/zeitzone_test.py
"""
import ast
import os
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
API = os.path.join(ROOT, "api")
sys.path.insert(0, API)

fehler = []


def pruefe(bedingung, text):
    print(("  OK   " if bedingung else "  FEHL ") + text)
    if not bedingung:
        fehler.append(text)


# ── Geprueft und bewusst in Weltzeit ────────────────────────────────────
# Schluessel: (modul, datei, code-ausschnitt) -> Begruendung
AUSNAHMEN = {
    ("auth-login", "__init__.py", '"iat"'):
        "JWT: die Norm (RFC 7519) schreibt UTC vor",
    ("auth-login", "__init__.py", '"exp"'):
        "JWT: die Norm schreibt UTC vor",
    ("auth-reset", "__init__.py", "expiry ="):
        "Ablauffrist, wird nur mit sich selbst verglichen",
    ("auth-reset", "__init__.py", "> expiry"):
        "Gegenstueck zur Ablauffrist, derselbe Massstab",
    ("contact-message", "__init__.py", 'isoformat() + "Z"'):
        "traegt das Z und ist damit eindeutig gekennzeichnet",
    ("lunch-order", "__init__.py", "last_run"):
        "interner Merker, traegt das Z",
    ("lunch-order", "__init__.py", "_now_iso"):
        "traegt das Z",
    ("lunch-order", "__init__.py", "from_dt"):
        "Zeitfenster in Tagen, zwei Stunden unerheblich",
    ("news-save", "__init__.py", "dl_datum"):
        "strftime mit Z",
    ("preisliste", "__init__.py", "cutoff_date"):
        "Stichtag 183 Tage zurueck, zwei Stunden unerheblich",
    ("roterpunkt", "__init__.py", "cutoff_date"):
        "Stichtag 6 Wochen zurueck",
    ("shop-articles", "__init__.py", "cutoff_date"):
        "Stichtag 183 Tage zurueck",
    ("shop-articles", "__init__.py", "days_ago"):
        "Differenz in ganzen Tagen",
    ("shop-freigabe", "__init__.py", "cutoff"):
        "Stichtag 6 Wochen zurueck, mit Z",
    ("shop-order", "__init__.py", "now_str"):
        "strftime mit Z",
    ("social-katalog", "__init__.py", '"erstellt"'):
        "strftime mit Z",
    ("social-katalog", "__init__.py", '"aktualisiert"'):
        "strftime mit Z",
    ("social-post", "__init__.py", "filename"):
        "nur ein Dateiname, die Zone ist gleichgueltig",
}


def blanke_aufrufe(text):
    """now()/utcnow()/today() ohne Zeitzone, mit Zeile und Quelltext."""
    treffer = []
    zeilen = text.splitlines()
    for k in ast.walk(ast.parse(text)):
        if not isinstance(k, ast.Call) or not isinstance(k.func, ast.Attribute):
            continue
        f = k.func
        # now(tz) ist in Ordnung - nur das argumentlose now() ist der Fehler.
        blank = (f.attr in ("utcnow", "today")
                 or (f.attr == "now" and not k.args and not k.keywords))
        if blank and getattr(f.value, "id", "") in ("datetime", "date"):
            treffer.append((k.lineno, zeilen[k.lineno - 1].strip()))
    return treffer


print("1) Der Sucher arbeitet richtig (Selbsttest)")
pruefe(blanke_aufrufe("import datetime\nx = datetime.now()\n"),
       "erkennt datetime.now()")
pruefe(blanke_aufrufe("x = date.today()\n"), "erkennt date.today()")
pruefe(blanke_aufrufe("x = datetime.utcnow()\n"), "erkennt datetime.utcnow()")
pruefe(not blanke_aufrufe("x = datetime.now(tz)\n"), "now(tz) ist erlaubt")
pruefe(not blanke_aufrufe('x = "datetime.now() waere falsch"\n'),
       "Text in Zeichenketten zaehlt nicht")

print("\n2) Kein ungeprueftes Modul nutzt blanke Zeitaufrufe")
offen, bekannt = [], 0
for modul in sorted(os.listdir(API)):
    mpfad = os.path.join(API, modul)
    if not os.path.isdir(mpfad):
        continue
    for datei in sorted(os.listdir(mpfad)):
        if not datei.endswith(".py"):
            continue
        with open(os.path.join(mpfad, datei), encoding="utf-8-sig") as fh:
            text = fh.read()
        for nr, code in blanke_aufrufe(text):
            treffer = [g for (m, d, s), g in AUSNAHMEN.items()
                       if m == modul and d == datei and s in code]
            if treffer:
                bekannt += 1
            else:
                offen.append(f"{modul}/{datei}:{nr}  {code[:70]}")

pruefe(not offen, f"{len(offen)} unbegruendete Stelle(n)"
       + (("\n         " + "\n         ".join(offen)) if offen else ""))
pruefe(bekannt == len(AUSNAHMEN),
       f"alle {len(AUSNAHMEN)} Ausnahmen sind noch vorhanden (gefunden: {bekannt})")

print("\n3) Der gemeinsame Helfer liefert Ladenzeit")
from shared import zeit  # noqa: E402

jetzt = zeit.jetzt_lokal()
pruefe(jetzt.tzinfo is not None, "jetzt_lokal() traegt eine Zeitzone")
pruefe(jetzt.utcoffset().total_seconds() in (3600, 7200),
       f"Versatz +1 oder +2 Stunden (war {jetzt.utcoffset()})")
pruefe(zeit.heute_lokal() == jetzt.date(), "heute_lokal() passt dazu")
pruefe(zeit.heute_iso() == jetzt.date().isoformat(), "heute_iso() passt dazu")
pruefe(zeit.stempel_lokal().endswith(("+01:00", "+02:00")),
       f"stempel_lokal() nennt die Zone: {zeit.stempel_lokal()}")
pruefe(zeit.stempel_utc().endswith("Z"),
       f"stempel_utc() nennt das Z: {zeit.stempel_utc()}")

print("\n4) Die beiden Stempel meinen denselben Augenblick")
from datetime import datetime as _dt, timezone as _tz  # noqa: E402

a = _dt.fromisoformat(zeit.stempel_lokal())
b = _dt.strptime(zeit.stempel_utc(), "%Y-%m-%dT%H:%M:%SZ").replace(tzinfo=_tz.utc)
pruefe(abs((a - b).total_seconds()) < 5,
       f"Abweichung {abs((a - b).total_seconds()):.1f}s")

print("\n5) Die Bestellmodule nutzen den Helfer")
for modul, erwartet in (("baecker-order", "heute_lokal"),
                        ("metzger-order", "heute_lokal"),
                        ("getraenke-order", "jetzt_lokal"),
                        ("lunch-order", "heute_lokal")):
    gefunden = False
    mpfad = os.path.join(API, modul)
    for datei in os.listdir(mpfad):
        if datei.endswith(".py"):
            with open(os.path.join(mpfad, datei), encoding="utf-8-sig") as fh:
                if erwartet in fh.read():
                    gefunden = True
    pruefe(gefunden, f"{modul} nutzt {erwartet}()")

print("\n6) Jedes umgestellte Modul laesst sich laden")
# Der wichtigste Teil. Syntax- und Strukturpruefung haben zwei Faelle
# durchgelassen, in denen der eingefuegte `sys.path`-Block VOR dem
# `import os` stand - die Module waeren erst im Betrieb abgestuerzt
# (NameError: name 'os' is not defined). Nur ein echter Import findet das.
import importlib.util  # noqa: E402

for schluessel, wert in (("DV_TENANT_ID", "0" * 8), ("DV_CLIENT_ID", "0" * 8),
                         ("DV_CLIENT_SECRET", "test"),
                         ("DV_DEFAULT_URL", "https://test.crm4.dynamics.com")):
    os.environ.setdefault(schluessel, wert)

UMGESTELLT = ["auth-register", "baecker-artikel", "baecker-order",
              "fleisch-order", "getraenke-order", "kalender", "lunch-order",
              "metzger-order", "preisliste", "roterpunkt", "shop-admin",
              "shop-articles", "shop-order", "wochenplan"]

nicht_ladbar = []
for modul in UMGESTELLT:
    eigen = os.path.join(API, modul)
    sys.path.insert(0, eigen)
    try:
        spec = importlib.util.spec_from_file_location(
            "probe_" + modul.replace("-", "_"),
            os.path.join(eigen, "__init__.py"))
        mod = importlib.util.module_from_spec(spec)
        sys.modules[spec.name] = mod
        spec.loader.exec_module(mod)
    except Exception as e:
        nicht_ladbar.append(f"{modul}: {type(e).__name__}: {e}")
    finally:
        sys.path.remove(eigen)

pruefe(not nicht_ladbar,
       f"alle {len(UMGESTELLT)} Module laden"
       + (("\n         " + "\n         ".join(nicht_ladbar)) if nicht_ladbar else ""))

print()
if fehler:
    print(f"{len(fehler)} Pruefung(en) fehlgeschlagen.")
    raise SystemExit(1)
print("Alle Pruefungen bestanden.")
