"""Zeitstempel der Baecker-Bestellung stehen in Berliner Zeit.

Spec: specs/baecker-sendezeitpunkt/spec.md (TC-Z01 … TC-Z08)

Aus dem Laden: „Das gesendete Datum wird falsch angezeigt. Es ist nicht das
Datum, wann gesendet wurde."

Ursache: Azure Functions laufen in UTC. Ein blankes ``datetime.now()``
lieferte dort Weltzeit und schrieb sie **ohne Kennzeichnung** fort. Eine um
13:59 versandte Bestellung trug damit 11:59 - und zwischen 22 Uhr und
Mitternacht stand sogar der Vortag da.

Geprueft wird hier beides: dass die Helfer die richtige Zeit liefern und
dass im Modul keine zonenlosen Aufrufe zurueckkehren. Der zweite Teil ist
der wichtigere - ein solcher Fehler ist im Betrieb kaum zu sehen.

Ausfuehren:  python tools/baecker_zeitzone_test.py
"""
import os
import re
import sys
from datetime import datetime, timedelta, timezone

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.join(ROOT, "api", "baecker-order"))

import store  # noqa: E402

fehler = []


def pruefe(bedingung, text):
    print(("  OK   " if bedingung else "  FEHL ") + text)
    if not bedingung:
        fehler.append(text)


def quelle(name):
    pfad = os.path.join(ROOT, "api", "baecker-order", name)
    with open(pfad, encoding="utf-8-sig") as fh:
        return fh.read()


print("1) Die Helfer liefern Berliner Zeit")
jetzt = store.jetzt_lokal()
pruefe(jetzt.tzinfo is not None, "jetzt_lokal() traegt eine Zeitzone")
versatz = jetzt.utcoffset()
pruefe(versatz in (timedelta(hours=1), timedelta(hours=2)),
       f"Versatz ist +1 oder +2 Stunden (war {versatz})")

# Gegenprobe gegen die Weltzeit: Der Unterschied muss dem Versatz entsprechen.
utc = datetime.now(timezone.utc)
diff = abs((jetzt - utc).total_seconds())
pruefe(diff < 5, f"derselbe Augenblick wie UTC (Abweichung {diff:.1f}s)")
pruefe(jetzt.hour == (utc + versatz).hour,
       f"Stunde passt zum Versatz ({jetzt.hour} vs {(utc + versatz).hour})")

print("\n2) heute_lokal() ist der Kalendertag im Laden")
pruefe(store.heute_lokal() == jetzt.date(),
       f"{store.heute_lokal()} == {jetzt.date()}")

print("\n3) Der Zeitstempel nennt die Zone")
stempel = store.jetzt_lokal().isoformat(timespec="seconds")
pruefe(re.search(r"[+-]\d{2}:\d{2}$", stempel) is not None,
       f"Zone im Text: {stempel}")
# Genau so liest der Kiosk ihn - ohne Zone raet der Browser lokal.
pruefe("T" in stempel, f"ISO-Form: {stempel}")

print("\n4) Keine zonenlosen Zeitaufrufe mehr im Modul")
"""Geprueft wird der Syntaxbaum, nicht der Text.

Ein Textvergleich schlug auch auf die Beschreibungen an, in denen
`datetime.now()` als das *Falsche* erwaehnt wird - der Waechter haette
damit die eigene Dokumentation angemahnt.
"""
import ast  # noqa: E402


def blanke_aufrufe(text):
    """Aufrufe von now()/utcnow()/today() ohne Zeitzone, mit Zeilennummer."""
    treffer = []
    for knoten in ast.walk(ast.parse(text)):
        if not isinstance(knoten, ast.Call):
            continue
        ziel = knoten.func
        if not isinstance(ziel, ast.Attribute):
            continue
        # now(tz) ist in Ordnung - nur das argumentlose now() ist der Fehler.
        if ziel.attr in ("utcnow", "today") or (
                ziel.attr == "now" and not knoten.args and not knoten.keywords):
            basis = getattr(ziel.value, "id", "")
            if basis in ("datetime", "date"):
                treffer.append(f"Z{knoten.lineno}: {basis}.{ziel.attr}()")
    return treffer


for name in ("__init__.py", "store.py"):
    treffer = blanke_aufrufe(quelle(name))
    pruefe(not treffer, f"{name} ohne blanke Zeitaufrufe"
           + (("  " + " | ".join(treffer)) if treffer else ""))

# Gegenprobe: Der Sucher muss einen solchen Aufruf auch finden.
pruefe(blanke_aufrufe("import datetime\nx = datetime.now()\n"),
       "der Sucher erkennt einen blanken Aufruf (Selbsttest)")
pruefe(not blanke_aufrufe("x = datetime.now(tz)\n"),
       "now(tz) gilt nicht als Fehler (Selbsttest)")

print("\n5) Die Helfer werden auch wirklich benutzt")
haupt = quelle("__init__.py")
pruefe("store.jetzt_lokal()" in haupt, "Sendestempel nutzt jetzt_lokal()")
pruefe(haupt.count("store.heute_lokal()") >= 3,
       f"heute_lokal() an {haupt.count('store.heute_lokal()')} Stellen")

print("\n6) Der Kiosk rechnet Altwerte um")
kiosk = os.path.join(ROOT, "static-site", "js", "kiosk-baecker.js")
with open(kiosk, encoding="utf-8") as fh:
    js = fh.read()
pruefe("hatZone" in js, "zeitKurz erkennt fehlende Zonenangabe")
pruefe("text + 'Z'" in js, "ohne Zone wird als UTC gelesen (Altbestand)")

print()
if fehler:
    print(f"{len(fehler)} Pruefung(en) fehlgeschlagen.")
    raise SystemExit(1)
print("Alle Pruefungen bestanden.")
