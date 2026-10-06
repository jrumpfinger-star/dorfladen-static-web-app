"""Erreicht jeden Dialog ein Escape-Waechter?

Aufruf aus dem Wurzelverzeichnis des Projekts:  py -3.12 tools/escape_inventar.py

Eine Zaehlung je Datei genuegt nicht: kiosk.html traegt sechs Dialoge und
einen Waechter und galt damit als versorgt. Dieses Werkzeug geht je Dialog
vor:

1. **Dialogwurzeln** statt Treffer. Ein Element ist eine Wurzel, wenn sein
   Name auf einen Dialog deutet und *kein Vorfahr* dasselbe tut. Damit
   fallen lightbox-close, mob-popup-handle und Co. heraus.
2. **Reichweite.** Zu jeder Datei kommen die Skripte dazu, die sie laedt --
   die Popups der Startseite werden in mobile.js geschlossen, nicht im
   Markup. Im Umfeld jedes Escape-Waechters wird gesammelt, welche
   Kennungen und Klassen er nennt; dazu die Rumpfe der Funktionen, die er
   ruft (closeLightbox nennt lightbox-overlay erst eine Ebene tiefer).
3. **Urteil** je Dialog: erreicht oder nicht.
"""
import io
import os
import re
import sys
from html.parser import HTMLParser

sys.stdout.reconfigure(encoding="utf-8", errors="replace")

WURZEL = os.path.join("static-site")

NAME = re.compile(r"(?:overlay|modal|popup|dlg|lightbox|dialog)", re.I)

# Namen, die ein Teil eines Dialogs sind, nie der Dialog selbst.
TEIL = re.compile(
    r"-(?:close|caption|img|next|prev|handle|top|topbar|x|val|inner|body|head|style|bg-inner)$",
    re.I)

# Ausgenommen: die Cookie-Leiste verlangt eine bewusste Wahl (Zustimmen oder
# Ablehnen). Escape waere weder das eine noch das andere.
# Entschieden mit dem Nutzer am 06.10.2026.
AUSGENOMMEN = {"cookiebar", "cookie-bar"}

ESCAPE = re.compile(r"key\s*===?\s*['\"]Esc(?:ape)?['\"]|keyCode\s*===?\s*27")

KENNUNG = re.compile(r"['\"#.]([A-Za-z][\w-]{2,})['\"\s)\],]|getElementById\(['\"]([\w-]+)")
AUFRUF = re.compile(r"\b([A-Za-z_$][\w$]*)\s*\(")

# Klappen: dort ist das Danebentippen die erwartete Geste (Spec R4),
# Escape soll laut R9 trotzdem greifen -- sie zaehlen also mit.
SKRIPT = re.compile(r"<script[^>]+src=['\"]([^'\"]+)['\"]")


class Wurzeln(HTMLParser):
    """Sammelt Dialogwurzeln: Treffer ohne Treffer-Vorfahr."""

    LEER = ("br", "img", "input", "hr", "meta", "link", "source", "area")
    KEIN_DIALOG = ("style", "script", "template")

    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.stapel = []
        self.treffer = []

    def handle_starttag(self, tag, attrs):
        a = dict(attrs)
        kennung = a.get("id", "")
        klassen = a.get("class", "").split()
        namen = " ".join([kennung] + klassen)
        ist = bool(NAME.search(namen)) or a.get("role") == "dialog"

        if tag in self.KEIN_DIALOG:
            ist = False
        if ist and TEIL.search(kennung or (klassen[0] if klassen else "")):
            ist = False
        if ist and ({kennung.lower()} | {k.lower() for k in klassen}) & AUSGENOMMEN:
            ist = False

        if ist and not any(self.stapel):
            self.treffer.append({
                "id": kennung,
                "klassen": klassen,
                "zeile": self.getpos()[0],
            })
        if tag not in self.LEER:
            self.stapel.append(ist)

    def handle_endtag(self, tag):
        if self.stapel:
            self.stapel.pop()


def lies(pfad):
    with io.open(pfad, encoding="utf-8", errors="replace") as f:
        return f.read()


def umfeld(text):
    """Text aller Escape-Waechter samt der Rumpfe ihrer Aufrufe."""
    stuecke, aufrufe = [], set()
    for m in ESCAPE.finditer(text):
        fenster = text[max(0, m.start() - 400):m.end() + 600]
        stuecke.append(fenster)
        aufrufe.update(AUFRUF.findall(fenster))
    for name in aufrufe:
        for m in re.finditer(r"\b" + re.escape(name) + r"\s*[=:]?\s*function[^{]*\{", text):
            stuecke.append(text[m.end():m.end() + 800])
    return "\n".join(stuecke)


def kennungen(text):
    gefunden = set()
    for a, b in KENNUNG.findall(text):
        gefunden.add((a or b).lower())
    return gefunden


def js_dialoge(text):
    """Dialoge, die ein Skript zur Laufzeit erzeugt.

    Kennung und Klasse desselben Elements werden zusammengefasst -- sonst
    gilt ein Dialog doppelt (dl-confirm-overlay *und* dlc-overlay).
    """
    nach_var = {}
    for m in re.finditer(r"\b([A-Za-z_$][\w$]*)\.(className|id)\s*=\s*['\"]([\w -]+)['\"]", text):
        var, _, wert = m.groups()
        for teil in wert.split():
            if NAME.search(teil) and not TEIL.search(teil) and teil.lower() not in AUSGENOMMEN:
                nach_var.setdefault(var, set()).add(teil)

    return [{"id": sorted(n)[0], "klassen": sorted(n), "var": var}
            for var, n in sorted(nach_var.items())]


def element_waechter(text):
    """Variablen, deren Dialog von einem Escape-Waechter erreicht wird.

    Zwei Bauarten:
      * der Waechter haengt am Element selbst (`ov.addEventListener('keydown'`),
      * er haengt am Dokument, spricht das Element aber ueber seine Variable
        an (`if (e.key === 'Escape') { o.remove(); }`) -- dort taucht weder
        Kennung noch Klasse auf.
    """
    treffer = set()
    for m in re.finditer(r"\b([A-Za-z_$][\w$]*)\.addEventListener\(\s*['\"]keydown['\"]", text):
        if ESCAPE.search(text[m.end():m.end() + 600]):
            treffer.add(m.group(1))
    for m in ESCAPE.finditer(text):
        fenster = text[m.start():m.end() + 300]
        treffer.update(re.findall(r"\b([A-Za-z_$][\w$]*)\s*\.", fenster))
    return treffer


def main():
    seiten = []
    for ordner, _, dateien in os.walk(WURZEL):
        for name in sorted(dateien):
            if name.endswith((".html", ".js")):
                seiten.append(os.path.join(ordner, name))

    erreicht = nicht = 0
    luecken = []

    for pfad in seiten:
        text = lies(pfad)
        rel = os.path.relpath(pfad)

        if pfad.endswith(".html"):
            p = Wurzeln()
            try:
                p.feed(text)
            except Exception:
                continue
            dialoge = [(d["id"] or (d["klassen"][0] if d["klassen"] else "?"),
                        d["zeile"], d) for d in p.treffer]
            # Die Skripte dazu, die die Seite laedt.
            begleiter = text
            for src in SKRIPT.findall(text):
                kand = os.path.join(WURZEL, src.lstrip("/").split("?")[0])
                if os.path.exists(kand):
                    begleiter += "\n" + lies(kand)
        else:
            dialoge = [(d["id"], 0, d) for d in js_dialoge(text)]
            begleiter = text

        if not dialoge:
            continue

        gesehen = kennungen(umfeld(begleiter))
        am_element = element_waechter(begleiter)
        offen = []
        for name, zeile, d in dialoge:
            marken = {d["id"].lower()} | {k.lower() for k in d["klassen"]}
            marken.discard("")
            if marken & gesehen or d.get("var") in am_element:
                erreicht += 1
            else:
                nicht += 1
                offen.append(f"{name}:{zeile}" if zeile else name)
        if offen:
            luecken.append((rel, len(dialoge), offen))

    print("### Dialoge ohne Waechter in Reichweite\n")
    for rel, ganz, offen in sorted(luecken, key=lambda x: -len(x[2])):
        print(f"{rel}  ({len(offen)} von {ganz})")
        print("    " + ", ".join(offen[:10]) + (" …" if len(offen) > 10 else ""))
    print()
    print(f"Erreicht: {erreicht}   Nicht erreicht: {nicht}   "
          f"Summe: {erreicht + nicht}")


if __name__ == "__main__":
    main()
