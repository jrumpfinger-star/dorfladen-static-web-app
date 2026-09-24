"""Die Geraete-Kennung ist ueberall erreichbar, wo sie gebraucht wird.

Spec: specs/geraete-kennung/spec.md (TC-GK-01 … TC-GK-06)

Aus dem Laden gemeldet: Bestellungen ohne E-Mail tauchten auf der Startseite
nie wieder auf. Ursache war nicht die Suche, sondern die Ablage - jede
Bestellung wurde **ohne Geraete-Kennung** gespeichert:

    device_id: (window.dlPushDeviceId ? dlPushDeviceId() : '')

Die Funktion lag in `pwa.js`, und die Bestellseite lud diese Datei nicht.
Der Ausweichzweig griff also immer. Zu sehen war davon nichts: Die
Bestellung ging durch, nur eben unauffindbar.

Dieser Waechter prueft die Struktur:
  * definiert nur EINE Datei die Kennung?
  * laedt jede Seite, die sie aufruft, auch die Datei?
  * steht sie vor `pwa.js`, die sie ebenfalls braucht?
  * ist der stille Ausweichzweig verschwunden?

Ausfuehren:  python tools/geraete_id_test.py
"""
import os
import re
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SEITE = os.path.join(ROOT, "static-site")
JS = os.path.join(SEITE, "js")

DATEI = "/js/geraete-id.js"
AUFRUF = re.compile(r"\bdlPushDeviceId\s*\(")
DEFINITION = re.compile(r"function\s+dlPushDeviceId\s*\(")

fehler = []


def pruefe(bedingung, text):
    print(("  OK   " if bedingung else "  FEHL ") + text)
    if not bedingung:
        fehler.append(text)


def lies(pfad):
    with open(pfad, encoding="utf-8") as fh:
        return fh.read()


def ohne_kommentare(text):
    """Blockkommentare und Zeilenkommentare entfernen.

    Noetig, weil die Quelldateien den alten Ausweichzweig in ihren
    Erklaerungen zitieren - sonst mahnte der Waechter die eigene
    Dokumentation an. Derselbe Fehler ist mir beim Zeitzonen-Waechter
    schon einmal unterlaufen.
    """
    text = re.sub(r"/\*.*?\*/", " ", text, flags=re.S)
    text = re.sub(r"^\s*//.*$", " ", text, flags=re.M)
    return text


print("1) Die Kennung steht in genau einer Datei")
definierende = []
for ordner, _, dateien in os.walk(SEITE):
    for name in dateien:
        if not name.endswith((".js", ".html")):
            continue
        pfad = os.path.join(ordner, name)
        if DEFINITION.search(ohne_kommentare(lies(pfad))):
            definierende.append(os.path.relpath(pfad, SEITE))
pruefe(definierende == ["js" + os.sep + "geraete-id.js"],
       f"genau js/geraete-id.js definiert sie (gefunden: {definierende})")

print("\n2) Jede Seite, die sie aufruft, laedt sie auch")
# JS-Dateien, die die Kennung brauchen - ihre Seiten brauchen sie ebenso.
js_braucht = set()
for name in sorted(os.listdir(JS)):
    if not name.endswith(".js") or name == "geraete-id.js":
        continue
    if AUFRUF.search(ohne_kommentare(lies(os.path.join(JS, name)))):
        js_braucht.add(name)
print(f"       JS-Dateien mit Aufruf: {sorted(js_braucht) or 'keine'}")

offen = []
for name in sorted(os.listdir(SEITE)):
    if not name.endswith(".html"):
        continue
    text = lies(os.path.join(SEITE, name))
    nackt = ohne_kommentare(text)
    # Braucht die Seite die Kennung - direkt oder ueber eine JS-Datei?
    direkt = bool(AUFRUF.search(nackt))
    ueber_js = any(("/js/" + j) in text for j in js_braucht)
    if not (direkt or ueber_js):
        continue
    if DATEI not in text:
        woher = "direkt" if direkt else "ueber eine JS-Datei"
        offen.append(f"{name} ({woher})")
pruefe(not offen, "alle Seiten laden geraete-id.js"
       + (("\n         fehlt in: " + ", ".join(offen)) if offen else ""))

print("\n3) Sie steht vor pwa.js")
# pwa.js benutzt die Kennung, definiert sie aber nicht mehr.
reihenfolge = []
for name in sorted(os.listdir(SEITE)):
    if not name.endswith(".html"):
        continue
    text = lies(os.path.join(SEITE, name))
    if "/js/pwa.js" not in text:
        continue
    if DATEI not in text:
        reihenfolge.append(f"{name}: pwa.js ohne geraete-id.js")
    elif text.index(DATEI) > text.index("/js/pwa.js"):
        reihenfolge.append(f"{name}: geraete-id.js steht zu spaet")
pruefe(not reihenfolge, "Ladereihenfolge stimmt"
       + (("\n         " + "\n         ".join(reihenfolge)) if reihenfolge else ""))

print("\n4) Der stille Ausweichzweig ist weg")
# `window.dlPushDeviceId ? ... : ''` hat den Fehler verborgen: Er lieferte
# einen leeren Wert, statt das Fehlen zu melden.
stille = []
for ordner, _, dateien in os.walk(SEITE):
    for name in dateien:
        if not name.endswith((".js", ".html")):
            continue
        pfad = os.path.join(ordner, name)
        nackt = ohne_kommentare(lies(pfad))
        for treffer in re.finditer(r"window\.dlPushDeviceId\s*\?([^;\n]{0,80})", nackt):
            zweig = treffer.group(1)
            # Ein Rueckfall auf den gespeicherten Wert ist in Ordnung - er
            # liest dieselbe Kennung. Nur der leere Text verschleiert.
            if "localStorage" in zweig:
                continue
            stille.append(f"{os.path.relpath(pfad, SEITE)}: {zweig.strip()[:50]}")
pruefe(not stille, "kein stiller Rueckfall auf ''"
       + (("\n         " + "\n         ".join(stille)) if stille else ""))

print("\n5) Die Bestellseite schickt die Kennung mit")
bestellseite = lies(os.path.join(SEITE, "mittagstisch-bestellen.html"))
nackt = ohne_kommentare(bestellseite)
pruefe("device_id: dlPushDeviceId()" in nackt or "device_id:dlPushDeviceId()" in nackt,
       "Bestellung traegt device_id: dlPushDeviceId()")
pruefe(nackt.count("dlPushDeviceId()") >= 3,
       f"auch die beiden Push-Anmeldungen ({nackt.count('dlPushDeviceId()')} Aufrufe)")
pruefe(DATEI in bestellseite, "und laedt die Datei")

print("\n6) Der Waechter selbst greift (Selbsttest)")
pruefe(bool(AUFRUF.search("x = dlPushDeviceId();")), "erkennt einen Aufruf")
pruefe(not AUFRUF.search("// dlPushDeviceId erwaehnt"),
       "Kommentare zaehlen nicht als Aufruf")
pruefe(bool(DEFINITION.search("function dlPushDeviceId(){")), "erkennt die Definition")
pruefe(ohne_kommentare("/* window.dlPushDeviceId ? a : '' */").strip() == "",
       "Blockkommentare werden entfernt")

print()
if fehler:
    print(f"{len(fehler)} Pruefung(en) fehlgeschlagen.")
    raise SystemExit(1)
print("Alle Pruefungen bestanden.")
