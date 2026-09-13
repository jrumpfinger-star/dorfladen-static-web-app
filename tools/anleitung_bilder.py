"""Nachgezeichnete Abbildungen fuer die App-Anleitung erzeugen.

Warum nachgezeichnet und nicht abfotografiert: Fremde Bildschirmfotos der
iOS- und Android-Menues sind urheberrechtlich nicht frei. Die Zeichnungen
hier sind bewusst schematisch — sie zeigen, WO etwas steht und WIE es
aussieht, ohne eine Oberflaeche pixelgenau nachzubilden. Das hat den
Nebeneffekt, dass kleine Aenderungen an den Menues die Anleitung nicht
sofort falsch machen.

    python tools\anleitung_bilder.py

Die Dateien landen in static-site/images/anleitung/. Sie lassen sich
spaeter einzeln gegen echte Fotos austauschen; die Namen bleiben.
"""

import os
import sys

ORDNER = os.path.join("static-site", "images", "anleitung")

GRUEN = "#2d5016"
GRUEN_HELL = "#e8f0e3"
RAHMEN = "#cbd5e1"
GRAU = "#94a3b8"
GRAU_HELL = "#f1f5f9"
TEXT = "#1f2937"
MARK = "#dc2626"
WEISS = "#ffffff"

SCHRIFT = ("font-family=\"-apple-system,BlinkMacSystemFont,'Segoe UI',"
           "Roboto,sans-serif\"")


def kopf(breite, hoehe, titel):
    return (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {breite} {hoehe}"'
            f' width="{breite}" height="{hoehe}" role="img"'
            f' aria-label="{titel}">'
            f'<title>{titel}</title>')


def txt(x, y, s, groesse=13, farbe=TEXT, fett=False, anker="start"):
    g = ' font-weight="600"' if fett else ""
    return (f'<text x="{x}" y="{y}" {SCHRIFT} font-size="{groesse}"'
            f' fill="{farbe}"{g} text-anchor="{anker}">{s}</text>')


def kasten(x, y, b, h, r=10, fuell=WEISS, rand=RAHMEN, randbreite=1.5):
    return (f'<rect x="{x}" y="{y}" width="{b}" height="{h}" rx="{r}"'
            f' fill="{fuell}" stroke="{rand}" stroke-width="{randbreite}"/>')


def markierung(x, y, r=22):
    """Der rote Ring zeigt, wohin getippt wird."""
    return (f'<circle cx="{x}" cy="{y}" r="{r}" fill="none" stroke="{MARK}"'
            f' stroke-width="2.5" stroke-dasharray="5 4" opacity=".95"/>')


def telefon_rahmen(b=300, h=560):
    """Geraeterahmen mit Statuszeile."""
    return (
        kasten(4, 4, b - 8, h - 8, 26, WEISS, "#334155", 2.5)
        + f'<rect x="{b / 2 - 32}" y="10" width="64" height="7" rx="3.5" fill="#334155"/>'
        + txt(26, 40, "9:41", 11, GRAU, True)
        + f'<rect x="{b - 60}" y="32" width="20" height="9" rx="2" fill="{GRAU}"/>'
    )


def teilen_symbol(x, y, farbe="#0a84ff", s=1.0):
    """Quadrat mit Pfeil nach oben."""
    return (f'<g transform="translate({x},{y}) scale({s})" fill="none"'
            f' stroke="{farbe}" stroke-width="2" stroke-linecap="round"'
            f' stroke-linejoin="round">'
            f'<path d="M7 10H5a2 2 0 0 0-2 2v7a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-7a2 2 0 0 0-2-2h-2"/>'
            f'<path d="M10 3v11"/><path d="m6.5 6.5 3.5-3.5 3.5 3.5"/></g>')


def dreipunkt(x, y, farbe=TEXT):
    return (f'<g fill="{farbe}">'
            f'<circle cx="{x}" cy="{y - 6}" r="2"/>'
            f'<circle cx="{x}" cy="{y}" r="2"/>'
            f'<circle cx="{x}" cy="{y + 6}" r="2"/></g>')


def laden_symbol(x, y, s=1.0, farbe=WEISS):
    """Das Blatt aus dem Seitenkopf - dient als App-Symbol."""
    return (f'<g transform="translate({x},{y}) scale({s})" fill="none"'
            f' stroke="{farbe}" stroke-width="2" stroke-linecap="round"'
            f' stroke-linejoin="round">'
            f'<path d="M7 20h10"/><path d="M10 20c5.5-2.5.8-6.4 3-10"/>'
            f'<path d="M9.5 9.4c1.1.8 1.8 2.2 2.3 3.7-2 .4-3.5.4-4.8-.3-1.2-.6-2.3-1.9-3-4.2 2.8-.5 4.4 0 5.5.8z"/>'
            f'<path d="M14.1 6a7 7 0 0 0-1.1 4c1.9-.1 3.3-.6 4.3-1.4 1-1 1.6-2.3 1.7-4.6-2.7.1-4 1-4.9 2z"/></g>')


def seiteninhalt(y=70, b=300):
    """Angedeutete Webseite hinter dem Menue."""
    s = f'<rect x="16" y="{y}" width="{b - 32}" height="54" rx="8" fill="{GRUEN}"/>'
    s += laden_symbol(30, y + 14, 1.0)
    s += txt(66, y + 32, "Dorfladen Oberornau", 12, WEISS, True)
    for i, w in enumerate([b - 60, b - 42, b - 80]):
        s += (f'<rect x="16" y="{y + 70 + i * 16}" width="{w - 16}" height="8"'
              f' rx="4" fill="{GRAU_HELL}"/>')
    return s


# ── iPhone / Safari ──────────────────────────────────────────────────

def ios_teilen():
    b, h = 300, 560
    s = kopf(b, h, "Safari auf dem iPhone: das Teilen-Symbol in der unteren Leiste")
    s += telefon_rahmen(b, h)
    s += seiteninhalt(58, b)
    # Adresszeile und Werkzeugleiste unten, wie bei Safari
    s += kasten(20, h - 118, b - 40, 34, 17, GRAU_HELL, GRAU_HELL, 0)
    s += txt(b / 2, h - 96, "dorfladen-oberornau.de", 11, GRAU, False, "middle")
    y = h - 56
    s += f'<path d="M20 {y - 22}h{b - 40}" stroke="{RAHMEN}" stroke-width="1"/>'
    for i, x in enumerate([44, 96, 150, 206, 258]):
        if i == 2:
            s += teilen_symbol(x - 11, y - 13, "#0a84ff", 1.0)
        else:
            s += (f'<rect x="{x - 9}" y="{y - 9}" width="18" height="18" rx="4"'
                  f' fill="none" stroke="{GRAU}" stroke-width="1.8"/>')
    s += markierung(150, y - 1, 24)
    s += txt(b / 2, h - 16, "Auf das Teilen-Symbol tippen", 11, MARK, True, "middle")
    return s + "</svg>"


def ios_menue():
    b, h = 300, 560
    s = kopf(b, h, "Das Teilen-Menue mit dem Eintrag Zum Home-Bildschirm")
    s += telefon_rahmen(b, h)
    s += seiteninhalt(58, b)
    # Das Blatt schiebt sich von unten herein
    s += kasten(10, 190, b - 20, h - 200, 18, WEISS, RAHMEN, 1.5)
    s += f'<rect x="{b / 2 - 18}" y="200" width="36" height="4" rx="2" fill="{RAHMEN}"/>'
    s += txt(28, 232, "Dorfladen Oberornau", 13, TEXT, True)
    s += txt(28, 250, "dorfladen-oberornau.de", 10, GRAU)
    eintraege = [("Lesezeichen hinzufügen", False),
                 ("Zur Leseliste hinzufügen", False),
                 ("Zum Home-Bildschirm", True),
                 ("Drucken", False)]
    y = 280
    for name, hervor in eintraege:
        if hervor:
            s += kasten(20, y - 18, b - 40, 40, 10, GRUEN_HELL, GRUEN, 2)
            s += txt(36, y + 7, name, 13, GRUEN, True)
            s += (f'<g transform="translate({b - 58},{y - 8})" fill="none"'
                  f' stroke="{GRUEN}" stroke-width="2" stroke-linecap="round">'
                  f'<rect x="0" y="0" width="16" height="16" rx="4"/>'
                  f'<path d="M8 4v8M4 8h8"/></g>')
        else:
            s += txt(36, y + 7, name, 13, GRAU)
            s += (f'<rect x="{b - 58}" y="{y - 8}" width="16" height="16" rx="4"'
                  f' fill="none" stroke="{RAHMEN}" stroke-width="1.8"/>')
        y += 46
    # Der Ring gehoert auf den dritten Eintrag, nicht auf den ersten.
    s += markierung(b / 2, 372, 26)
    s += txt(b / 2, h - 24, "„Zum Home-Bildschirm“ wählen", 11, MARK, True, "middle")
    return s + "</svg>"


def ios_bestaetigen():
    b, h = 300, 400
    s = kopf(b, h, "Der Dialog Zum Home-Bildschirm mit dem Knopf Hinzufuegen")
    s += kasten(4, 4, b - 8, h - 8, 22, GRAU_HELL, "#334155", 2.5)
    s += txt(18, 42, "Abbrechen", 11, "#0a84ff")
    s += txt(130, 42, "Zum Home-Bildschirm", 11, TEXT, True, "middle")
    s += kasten(b - 88, 24, 72, 28, 14, GRUEN, GRUEN, 0)
    s += txt(b - 52, 42, "Hinzufügen", 10, WEISS, True, "middle")
    # Der Ring umschliesst den Knopf, statt seine Schrift zu kreuzen.
    s += (f'<rect x="{b - 96}" y="16" width="88" height="44" rx="22" fill="none"'
          f' stroke="{MARK}" stroke-width="2.5" stroke-dasharray="5 4"/>')
    # Name und Adresse
    s += kasten(20, 80, b - 40, 84, 12)
    s += kasten(34, 96, 52, 52, 12, GRUEN, GRUEN, 0)
    s += laden_symbol(46, 108, 1.2)
    s += kasten(100, 100, b - 124, 26, 6, GRAU_HELL, RAHMEN, 1)
    s += txt(108, 118, "Dorfladen", 12, TEXT, True)
    s += txt(100, 144, "dorfladen-oberornau.de", 10, GRAU)
    s += txt(20, 196, "So heißt das Symbol später auf", 11, GRAU)
    s += txt(20, 212, "Ihrem Startbildschirm. Der Name", 11, GRAU)
    s += txt(20, 228, "lässt sich hier noch ändern.", 11, GRAU)
    s += txt(b / 2, 300, "Oben rechts auf „Hinzufügen“ tippen", 11, MARK, True, "middle")
    return s + "</svg>"


def startbildschirm():
    b, h = 300, 560
    s = kopf(b, h, "Der Startbildschirm mit dem neuen Dorfladen-Symbol")
    s += kasten(4, 4, b - 8, h - 8, 26, "#dbeafe", "#334155", 2.5)
    s += f'<rect x="{b / 2 - 32}" y="10" width="64" height="7" rx="3.5" fill="#334155"/>'
    s += txt(26, 40, "9:41", 11, "#1e3a5f", True)
    reihen = [["#cbd5e1", "#cbd5e1", "#cbd5e1", "#cbd5e1"],
              ["#cbd5e1", "DORF", "#cbd5e1", "#cbd5e1"]]
    y = 80
    for reihe in reihen:
        x = 30
        for feld in reihe:
            if feld == "DORF":
                s += kasten(x, y, 54, 54, 14, GRUEN, GRUEN, 0)
                s += laden_symbol(x + 13, y + 13, 1.2)
                s += txt(x + 27, y + 74, "Dorfladen", 9, "#1e3a5f", True, "middle")
                s += markierung(x + 27, y + 27, 32)
            else:
                s += kasten(x, y, 54, 54, 14, feld, feld, 0)
            x += 66
        y += 96
    s += txt(b / 2, h - 40, "Fertig — die App liegt auf dem Startbildschirm",
             11, GRUEN, True, "middle")
    return s + "</svg>"


# ── Android ──────────────────────────────────────────────────────────

def android_menue():
    b, h = 300, 560
    s = kopf(b, h, "Chrome auf Android: das Menue mit den drei Punkten oben rechts")
    s += telefon_rahmen(b, h)
    s += kasten(20, 54, b - 40, 34, 17, GRAU_HELL, GRAU_HELL, 0)
    s += txt(36, 76, "dorfladen-oberornau.de", 11, GRAU)
    s += dreipunkt(b - 34, 71, TEXT)
    s += markierung(b - 34, 71, 20)
    s += seiteninhalt(104, b)
    s += txt(b / 2, h - 30, "Oben rechts auf die drei Punkte tippen",
             11, MARK, True, "middle")
    return s + "</svg>"


def android_installieren():
    b, h = 300, 560
    s = kopf(b, h, "Das Chrome-Menue mit dem Eintrag App installieren")
    s += telefon_rahmen(b, h)
    s += kasten(20, 54, b - 40, 34, 17, GRAU_HELL, GRAU_HELL, 0)
    s += txt(36, 76, "dorfladen-oberornau.de", 11, GRAU)
    s += dreipunkt(b - 34, 71, GRAU)
    # Aufklappmenue
    s += kasten(96, 92, b - 116, 260, 12, WEISS, RAHMEN, 1.5)
    eintraege = [("Neuer Tab", False), ("Lesezeichen", False),
                 ("Verlauf", False), ("App installieren", True),
                 ("Einstellungen", False)]
    y = 122
    for name, hervor in eintraege:
        if hervor:
            s += kasten(102, y - 17, b - 128, 34, 8, GRUEN_HELL, GRUEN, 2)
            s += txt(116, y + 5, name, 12, GRUEN, True)
        else:
            s += txt(116, y + 5, name, 12, GRAU)
        y += 46
    s += markierung(b / 2 + 12, 260, 24)
    s += seiteninhalt(370, b)
    s += txt(b / 2, h - 30, "„App installieren“ wählen", 11, MARK, True, "middle")
    return s + "</svg>"


def android_dialog():
    b, h = 300, 320
    s = kopf(b, h, "Der Installationsdialog mit dem Knopf Installieren")
    s += kasten(4, 4, b - 8, h - 8, 20, WEISS, "#334155", 2.5)
    s += kasten(28, 40, 56, 56, 14, GRUEN, GRUEN, 0)
    s += laden_symbol(41, 53, 1.3)
    s += txt(98, 66, "Dorfladen", 15, TEXT, True)
    s += txt(98, 86, "dorfladen-oberornau.de", 11, GRAU)
    s += txt(28, 128, "Die App wird zu Ihrem Startbildschirm", 11, GRAU)
    s += txt(28, 146, "hinzugefügt und öffnet sich in einem", 11, GRAU)
    s += txt(28, 164, "eigenen Fenster.", 11, GRAU)
    s += txt(b - 168, 224, "Abbrechen", 12, GRAU, False, "middle")
    s += kasten(b - 118, 202, 90, 34, 17, GRUEN, GRUEN, 0)
    s += txt(b - 73, 224, "Installieren", 12, WEISS, True, "middle")
    s += markierung(b - 73, 219, 30)
    s += txt(b / 2, 282, "Auf „Installieren“ tippen", 11, MARK, True, "middle")
    return s + "</svg>"


def samsung_menue():
    b, h = 300, 560
    s = kopf(b, h, "Samsung Internet: Menue und der Eintrag Seite hinzufuegen zu")
    s += telefon_rahmen(b, h)
    s += seiteninhalt(58, b)
    # Samsung Internet fuehrt seine Leiste unten
    s += kasten(20, h - 118, b - 40, 34, 17, GRAU_HELL, GRAU_HELL, 0)
    s += txt(b / 2, h - 96, "dorfladen-oberornau.de", 11, GRAU, False, "middle")
    y = h - 56
    for x in [44, 96, 150, 206]:
        s += (f'<rect x="{x - 9}" y="{y - 9}" width="18" height="18" rx="4"'
              f' fill="none" stroke="{GRAU}" stroke-width="1.8"/>')
    # Das Menue-Symbol mit drei Strichen rechts
    s += (f'<g stroke="{TEXT}" stroke-width="2" stroke-linecap="round">'
          f'<path d="M250 {y - 5}h18M250 {y}h18M250 {y + 5}h18"/></g>')
    s += markierung(259, y, 22)
    # Aufklappblatt
    s += kasten(20, 210, b - 40, 190, 14, WEISS, RAHMEN, 1.5)
    eintraege = [("Lesezeichen", False), ("Seite hinzufügen zu", True),
                 ("Downloads", False), ("Einstellungen", False)]
    yy = 244
    for name, hervor in eintraege:
        if hervor:
            s += kasten(28, yy - 17, b - 56, 34, 8, GRUEN_HELL, GRUEN, 2)
            s += txt(42, yy + 5, name, 12, GRUEN, True)
            s += txt(b - 48, yy + 5, "›", 14, GRUEN, True, "middle")
        else:
            s += txt(42, yy + 5, name, 12, GRAU)
        yy += 44
    s += txt(b / 2, h - 16, "Menü → „Seite hinzufügen zu“ → Startbildschirm",
             10, MARK, True, "middle")
    return s + "</svg>"


def firefox_menue():
    b, h = 300, 560
    s = kopf(b, h, "Firefox auf Android: Menue mit dem Eintrag Zum Startbildschirm hinzufuegen")
    s += telefon_rahmen(b, h)
    s += kasten(20, 54, b - 40, 34, 17, GRAU_HELL, GRAU_HELL, 0)
    s += txt(36, 76, "dorfladen-oberornau.de", 11, GRAU)
    s += dreipunkt(b - 34, 71, GRAU)
    s += kasten(96, 92, b - 116, 214, 12, WEISS, RAHMEN, 1.5)
    eintraege = [("Lesezeichen", False), ("Verlauf", False),
                 ("Zum Startbildschirm hinzufügen", True), ("Einstellungen", False)]
    y = 122
    for name, hervor in eintraege:
        if hervor:
            s += kasten(102, y - 17, b - 128, 34, 8, "#fff4e5", "#e65100", 2)
            s += txt(112, y + 5, name, 10, "#b34700", True)
        else:
            s += txt(112, y + 5, name, 11, GRAU)
        y += 46
    s += seiteninhalt(330, b)
    s += kasten(20, h - 78, b - 40, 52, 10, "#fff4e5", "#e65100", 1.5)
    s += txt(b / 2, h - 56, "Firefox legt nur eine Verknüpfung an —", 10,
             "#b34700", True, "middle")
    s += txt(b / 2, h - 40, "keine richtige App.", 10, "#b34700", True, "middle")
    return s + "</svg>"


# ── Rechner ──────────────────────────────────────────────────────────

def pc_adressleiste():
    b, h = 520, 240
    s = kopf(b, h, "Chrome am Rechner: das Installationssymbol rechts in der Adresszeile")
    s += kasten(4, 4, b - 8, h - 8, 12, WEISS, "#334155", 2)
    # Reiterzeile
    s += f'<rect x="6" y="6" width="{b - 12}" height="34" rx="10" fill="{GRAU_HELL}"/>'
    s += kasten(16, 12, 170, 26, 8, WEISS, RAHMEN, 1)
    s += laden_symbol(24, 17, 0.7, GRUEN)
    s += txt(46, 30, "Dorfladen Oberornau", 10, TEXT)
    # Adresszeile
    s += kasten(16, 50, b - 32, 32, 16, GRAU_HELL, GRAU_HELL, 0)
    s += txt(34, 70, "dorfladen-oberornau.de", 11, GRAU)
    # Installationssymbol: Bildschirm mit Pfeil nach unten
    ix = b - 58
    s += (f'<g transform="translate({ix},56)" fill="none" stroke="{GRUEN}"'
          f' stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">'
          f'<rect x="0" y="1" width="20" height="14" rx="2"/>'
          f'<path d="M10 4v7M7 8l3 3 3-3"/><path d="M6 18h8"/></g>')
    s += markierung(ix + 10, 66, 20)
    s += f'<rect x="16" y="98" width="{b - 32}" height="1" fill="{RAHMEN}"/>'
    s += txt(b / 2, 140, "Rechts in der Adresszeile erscheint ein kleines Symbol",
             12, TEXT, True, "middle")
    s += txt(b / 2, 162, "(Bildschirm mit Pfeil nach unten). Darauf klicken.",
             12, GRAU, False, "middle")
    s += txt(b / 2, 196, "Fehlt das Symbol? Menü ⋮ → „Installieren“",
             11, MARK, True, "middle")
    return s + "</svg>"


def mac_ablage():
    b, h = 520, 260
    s = kopf(b, h, "Safari am Mac: Menue Ablage mit dem Eintrag Zum Dock hinzufuegen")
    s += kasten(4, 4, b - 8, h - 8, 12, "#f8fafc", "#334155", 2)
    # Menueleiste oben
    s += f'<rect x="6" y="6" width="{b - 12}" height="26" rx="8" fill="{GRAU_HELL}"/>'
    x = 22
    for name, hervor in [("Safari", False), ("Ablage", True), ("Bearbeiten", False),
                         ("Darstellung", False), ("Verlauf", False)]:
        if hervor:
            s += kasten(x - 8, 9, 52, 20, 5, GRUEN, GRUEN, 0)
            s += txt(x + 18, 23, name, 11, WEISS, True, "middle")
            mx = x + 18
        else:
            s += txt(x, 23, name, 11, GRAU)
        x += len(name) * 7 + 26
    # Aufklappmenue unter Ablage
    s += kasten(52, 36, 220, 150, 10, WEISS, RAHMEN, 1.5)
    eintraege = [("Neuer Tab", False), ("Fenster schließen", False),
                 ("Zum Dock hinzufügen…", True), ("Drucken…", False)]
    y = 62
    for name, hervor in eintraege:
        if hervor:
            s += kasten(58, y - 15, 208, 30, 7, GRUEN_HELL, GRUEN, 2)
            s += txt(70, y + 6, name, 11, GRUEN, True)
        else:
            s += txt(70, y + 6, name, 11, GRAU)
        y += 38
    # Der Ring sitzt am rechten Rand des Eintrags, damit er die Schrift
    # nicht verdeckt.
    s += markierung(244, 140, 22)
    s += txt(b / 2 + 60, 216, "Oben in der Menüleiste: „Ablage“ →",
             12, TEXT, True, "middle")
    s += txt(b / 2 + 60, 238, "„Zum Dock hinzufügen“", 12, MARK, True, "middle")
    return s + "</svg>"


# ── Benachrichtigungen ───────────────────────────────────────────────

def erlaubnis():
    b, h = 300, 300
    s = kopf(b, h, "Die Nachfrage des Browsers, ob Benachrichtigungen erlaubt sind")
    s += kasten(4, 4, b - 8, h - 8, 18, WEISS, "#334155", 2.5)
    s += kasten(26, 30, 44, 44, 12, GRUEN_HELL, GRUEN_HELL, 0)
    s += (f'<g transform="translate(37,41)" fill="none" stroke="{GRUEN}"'
          f' stroke-width="2" stroke-linecap="round" stroke-linejoin="round">'
          f'<path d="M11 4a6 6 0 0 0-6 6v4l-2 3h16l-2-3v-4a6 6 0 0 0-6-6z"/>'
          f'<path d="M9 20a2 2 0 0 0 4 0"/></g>')
    s += txt(84, 50, "dorfladen-oberornau.de", 12, TEXT, True)
    s += txt(84, 70, "möchte Ihnen Mitteilungen senden", 10, GRAU)
    s += kasten(26, 108, b - 52, 60, 10, GRAU_HELL, GRAU_HELL, 0)
    s += txt(40, 130, "Sie können jederzeit einzeln", 10, GRAU)
    s += txt(40, 148, "festlegen, was Sie bekommen.", 10, GRAU)
    s += txt(78, 214, "Nicht erlauben", 11, GRAU, False, "middle")
    s += kasten(160, 194, 110, 34, 17, GRUEN, GRUEN, 0)
    s += txt(215, 216, "Erlauben", 12, WEISS, True, "middle")
    s += markierung(215, 211, 30)
    s += txt(b / 2, 268, "Auf „Erlauben“ tippen", 11, MARK, True, "middle")
    return s + "</svg>"


def beispiel_meldung():
    b, h = 340, 230
    s = kopf(b, h, "Beispiel einer Benachrichtigung auf dem Sperrbildschirm")
    s += kasten(4, 4, b - 8, h - 8, 18, "#1e293b", "#1e293b", 0)
    s += txt(b / 2, 44, "Dienstag, 14. September", 11, "#94a3b8", False, "middle")
    s += kasten(18, 60, b - 36, 66, 14, "rgba(255,255,255,.94)", "rgba(255,255,255,.94)", 0)
    s += kasten(32, 74, 30, 30, 8, GRUEN, GRUEN, 0)
    s += laden_symbol(36, 78, 0.9)
    s += txt(72, 86, "Dorfladen Oberornau", 10, GRAU, True)
    s += txt(b - 32, 86, "jetzt", 9, GRAU, False, "end")
    s += txt(72, 106, "Heute: Kaiserschmarrn mit", 12, TEXT, True)
    s += txt(72, 121, "Apfelmus", 12, TEXT, True)
    s += kasten(18, 138, b - 36, 56, 14, "rgba(255,255,255,.72)",
                "rgba(255,255,255,.72)", 0)
    s += kasten(32, 150, 26, 26, 7, GRUEN, GRUEN, 0)
    s += laden_symbol(35, 153, 0.78)
    s += txt(68, 162, "Dorfladen Oberornau", 9, GRAU, True)
    s += txt(68, 180, "Ihre Bestellung ist abholbereit", 11, TEXT, True)
    return s + "</svg>"


BILDER = {
    "ios-teilen.svg": ios_teilen,
    "ios-menue.svg": ios_menue,
    "ios-bestaetigen.svg": ios_bestaetigen,
    "startbildschirm.svg": startbildschirm,
    "android-menue.svg": android_menue,
    "android-installieren.svg": android_installieren,
    "android-dialog.svg": android_dialog,
    "samsung-menue.svg": samsung_menue,
    "firefox-menue.svg": firefox_menue,
    "pc-adressleiste.svg": pc_adressleiste,
    "mac-ablage.svg": mac_ablage,
    "erlaubnis.svg": erlaubnis,
    "beispiel-meldung.svg": beispiel_meldung,
}


def main():
    os.makedirs(ORDNER, exist_ok=True)
    for name, f in BILDER.items():
        pfad = os.path.join(ORDNER, name)
        with open(pfad, "w", encoding="utf-8", newline="\n") as fh:
            fh.write(f())
        print(f"ok   {name} ({os.path.getsize(pfad)} Bytes)")
    print(f"\n{len(BILDER)} Abbildungen in {ORDNER}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
