"""Den Hinweis des Dorfladens in ein ``fpdf2``-Formular setzen.

Zu jeder Bäcker- und Metzger-Bestellung darf ein Freitext mitgegeben werden
(Spec ``bestell-freitext``, F3). Er erscheint auf **allen** Bestellformularen
als eigener, umrandeter Block — beim Metzger über der Artikeltabelle, beim
Bäcker darunter.

Es gibt drei Formularerzeuger (Metzger, Bäcker-Nachbildung, Bäcker-PDF). Damit
der Block überall gleich aussieht und Fehler nur einmal zu beheben sind, steht
er hier — als reine Zeichenfunktion, die auf jedem ``FPDF``-Objekt arbeitet.

Der Block ist **nie sehr hoch**: Der Freitext ist auf 1 000 Zeichen begrenzt,
das sind bei 9 pt rund zwölf Zeilen. Er wird deshalb nicht über Seiten
aufgeteilt — passt er unten nicht mehr hin, wandert er als Ganzes auf die
nächste Seite. Ein über zwei Seiten zerrissener Rahmen wäre schwerer zu lesen
und deutlich fehleranfälliger.

Der Aufrufer gibt seine eigene ``latin1``-Ersetzung mit. Die Kernschriften von
``fpdf2`` können nur Latin-1; ein Gedankenstrich oder ein Emoji im Hinweis darf
den Versand einer Bestellung niemals scheitern lassen.
"""

TITEL = "Hinweis vom Dorfladen"

SCHRIFT = "Helvetica"
GROESSE = 9
ZEILE = 4.8              # mm Zeilenhöhe
RAND = 2.5               # mm Innenabstand des Rahmens
EINZUG_PUNKT = 4.0       # mm Einzug der Aufzählungspunkte


def _stil(stueck):
    return (("B" if stueck.get("fett") else "")
            + ("I" if stueck.get("kursiv") else "")
            + ("U" if stueck.get("unterstrichen") else ""))


def _wortfolge(stuecke, umbruch="\n"):
    """Textstücke in Wörter zerlegen, Auszeichnung und Abstand behalten.

    Rückgabe: Liste aus ``(wort, stil, abstand_davor)``; ein Wort ``None``
    steht für einen erzwungenen Zeilenumbruch (``<br>``).
    """
    out = []
    abstand = False
    for s in stuecke:
        text = s.get("text", "")
        if text == umbruch:
            out.append((None, "", False))
            abstand = False
            continue
        stil = _stil(s)
        if text[:1].isspace():
            abstand = True
        for wort in text.split():
            out.append((wort, stil, abstand and bool(out)))
            abstand = False
        if text[-1:].isspace():
            abstand = True
    return out


def _zeilen(pdf, woerter, breite, latin1):
    """Wörter auf Zeilen verteilen, die in ``breite`` Millimeter passen."""
    zeilen, laufend, laufbreite = [], [], 0.0
    for wort, stil, abstand in woerter:
        if wort is None:
            zeilen.append(laufend)
            laufend, laufbreite = [], 0.0
            continue
        pdf.set_font(SCHRIFT, stil, GROESSE)
        text = (" " if abstand and laufend else "") + latin1(wort)
        w = pdf.get_string_width(text)
        if laufend and laufbreite + w > breite:
            zeilen.append(laufend)
            laufend, laufbreite = [], 0.0
            text = latin1(wort)
            w = pdf.get_string_width(text)
        laufend.append((text, stil, w))
        laufbreite += w
    zeilen.append(laufend)
    return zeilen


def _gesetzt(pdf, bloecke, breite, latin1):
    """Alle Blöcke in fertige Zeilen umrechnen — ohne schon zu zeichnen.

    Erst wenn die Gesamthöhe bekannt ist, lässt sich entscheiden, ob der Block
    noch auf die Seite passt.
    """
    gesetzt = []
    for block in bloecke:
        punkt = block.get("art") == "punkt"
        einzug = EINZUG_PUNKT if punkt else 0.0
        zeilen = _zeilen(pdf, _wortfolge(block.get("stuecke", [])),
                         breite - einzug, latin1)
        for i, zeile in enumerate(zeilen):
            gesetzt.append({"zeile": zeile, "einzug": einzug,
                            "marke": punkt and i == 0})
    return gesetzt


def hoehe(pdf, bloecke, breite, latin1):
    """Wie hoch der Block wird — in Millimetern, einschließlich Rahmen."""
    if not bloecke:
        return 0.0
    zeilen = _gesetzt(pdf, bloecke, breite - 2 * RAND, latin1)
    return ZEILE + len(zeilen) * ZEILE + 2 * RAND


def zeichne(pdf, bloecke, latin1, titel=TITEL, breite=None, umbruch=True):
    """Den Hinweisblock an der aktuellen Stelle setzen.

    Tut nichts, wenn kein Hinweis erfasst ist — ohne Freitext sieht das
    Formular exakt aus wie bisher (F3).

    ``umbruch=False`` verbietet den Seitenwechsel. Das braucht der Aufruf aus
    einer ``header()``-Methode: Dort würde ``add_page`` sich selbst erneut
    aufrufen. Am Seitenanfang ist der Platz ohnehin nie knapp.
    """
    if not bloecke:
        return

    schrift_vorher = (pdf.font_family, pdf.font_style, pdf.font_size_pt)
    if breite is None:
        breite = pdf.w - pdf.l_margin - pdf.r_margin
    innen = breite - 2 * RAND

    zeilen = _gesetzt(pdf, bloecke, innen, latin1)
    gesamt = ZEILE + len(zeilen) * ZEILE + 2 * RAND

    if umbruch and pdf.get_y() + gesamt > pdf.h - pdf.b_margin:
        pdf.add_page()

    links = pdf.l_margin
    oben = pdf.get_y()

    pdf.set_xy(links + RAND, oben + RAND)
    pdf.set_font(SCHRIFT, "B", GROESSE)
    pdf.cell(innen, ZEILE, latin1(titel), new_x="LMARGIN", new_y="NEXT")

    for eintrag in zeilen:
        y = pdf.get_y()
        x = links + RAND + eintrag["einzug"]
        if eintrag["marke"]:
            pdf.set_xy(links + RAND, y)
            pdf.set_font(SCHRIFT, "", GROESSE)
            pdf.cell(eintrag["einzug"], ZEILE, latin1("-"))
        pdf.set_xy(x, y)
        for text, stil, w in eintrag["zeile"]:
            pdf.set_font(SCHRIFT, stil, GROESSE)
            pdf.cell(w, ZEILE, text)
        pdf.set_xy(links, y + ZEILE)

    unten = pdf.get_y() + RAND
    pdf.rect(links, oben, breite, unten - oben)
    pdf.set_xy(links, unten)

    pdf.set_font(*schrift_vorher[:2], size=schrift_vorher[2])
