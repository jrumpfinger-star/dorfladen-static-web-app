"""Portionsmodell der Metzger-Bestellung (Spec F2, F6, F16).

Eine Position traegt eine Liste von **Portionsbloecken** und einen freien
Hinweis. Ein Block sagt, wie oft eine Portion welcher Groesse bestellt wird und
ob sie vakuumiert wird::

    { "anzahl": 2, "menge": 500, "einheit": "g", "vakuum": true }

Damit sind alle Schreibweisen des Papierformulars abbildbar - von ``1/2`` ueber
``2x 4 St V`` bis ``2x500g | 6x250g``.

Bewusste Festlegungen
---------------------
* ``klein`` / ``mittel`` / ``gross`` sind **Portionsgroessen** wie kg oder
  Stueck (z. B. "2x klein Schweinebauch"). Sie haben mit dem Vakuumieren nichts
  zu tun.
* ``vakuum`` ist ein reines Ja/Nein. Welcher Beutel genommen wird, entscheidet
  der Metzger beim Verpacken - eine Groesse hier waere Scheingenauigkeit.
* Nur Bloecke in ``kg``/``g`` gehen ins Gewicht. Stueck, Laengen und
  Groessenwoerter lassen sich ohne Stueckgewicht nicht in Kilo umrechnen und
  werden deshalb getrennt gezaehlt statt geraten.

Das Modul ist bewusst frei von Azure- und Netzabhaengigkeiten, damit es sich
mit ``tools/metzger_portionen_test.py`` ohne Cloud pruefen laesst.
"""

GEWICHTS_EINHEITEN = {"kg": 1.0, "g": 0.001}
GROESSEN = ("klein", "mittel", "gross", "gro\u00df")
EINHEITEN = ("kg", "g", "St", "cm", "Schale", "Beutel",
             "klein", "mittel", "gro\u00df")

# Schreibweisen, die aus dem Kiosk oder aus Altbestaenden kommen koennen.
EINHEIT_ALIAS = {
    "kg": "kg", "g": "g", "gr": "g", "gramm": "g",
    "st": "St", "stk": "St", "stck": "St", "stueck": "St", "st\u00fcck": "St",
    "cm": "cm",
    "schale": "Schale", "schalen": "Schale", "beutel": "Beutel",
    "klein": "klein", "kleine": "klein",
    "mittel": "mittel",
    "gross": "gro\u00df", "gro\u00df": "gro\u00df", "gro\u00dfe": "gro\u00df",
}

BRUCH = {0.25: "\u00bc", 0.5: "\u00bd", 0.75: "\u00be", 1.5: "1\u00bd"}


def ist_groesse(einheit):
    """True fuer die Portionsgroessen klein/mittel/gross."""
    return (einheit or "").lower() in GROESSEN


def einheit_normieren(wert):
    """Schreibweise einer Einheit vereinheitlichen; Unbekanntes wird ``St``."""
    return EINHEIT_ALIAS.get(str(wert or "").strip().lower(), "St")


def _zahl(wert):
    try:
        z = float(str(wert).replace(",", "."))
    except (TypeError, ValueError):
        return None
    return z if z > 0 else None


def normalisiere_block(roh):
    """Einen Block auf gueltige Werte bringen; ``None`` wenn unbrauchbar."""
    if not isinstance(roh, dict):
        return None
    einheit = einheit_normieren(roh.get("einheit"))
    try:
        anzahl = int(roh.get("anzahl") or 1)
    except (TypeError, ValueError):
        anzahl = 1
    anzahl = max(1, anzahl)                       # Anzahl 0 ist unzulaessig
    menge = None if ist_groesse(einheit) else _zahl(roh.get("menge"))
    if menge is None and not ist_groesse(einheit):
        return None                               # Menge fehlt und ist noetig
    return {"anzahl": anzahl, "menge": menge, "einheit": einheit,
            "vakuum": bool(roh.get("vakuum"))}


def normalisiere_position(roh):
    """Eine Position saeubern. Reihenfolge der Bloecke bleibt erhalten."""
    roh = roh if isinstance(roh, dict) else {}
    bloecke = []
    for b in (roh.get("portionen") or []):
        b = normalisiere_block(b)
        if b:
            bloecke.append(b)
    nummer = roh.get("nummer")
    try:
        nummer = int(nummer) if nummer not in (None, "") else None
    except (TypeError, ValueError):
        nummer = None
    return {
        "nummer": nummer,
        "name": str(roh.get("name") or "").strip(),
        "portionen": bloecke,
        "hinweis": str(roh.get("hinweis") or "").strip(),
        "zusatz": bool(roh.get("zusatz")),
    }


def bestellt(position):
    """Eine Position gilt als bestellt, sobald sie Portionen ODER einen Hinweis
    hat. Ein Hinweis allein ist gueltig - "nur wenn da" ist eine Bestellung."""
    return bool(position.get("portionen")) or bool(position.get("hinweis"))


def menge_text(block):
    """``2 x 500 g`` bzw. ``2 x klein`` - fuer Mail und PDF."""
    if block.get("menge") is None:
        kern = block.get("einheit", "")
    else:
        menge = block["menge"]
        if menge in BRUCH:
            gezeigt = BRUCH[menge]
        elif float(menge).is_integer():
            gezeigt = str(int(menge))
        else:
            gezeigt = ("%g" % menge).replace(".", ",")
        kern = f"{gezeigt} {block.get('einheit', '')}"
    return f"{block.get('anzahl', 1)} \u00d7 {kern}"


def position_text(position, mit_vakuum=True, kurz_vakuum=False):
    """Portionen einer Position als Klartext, wie er in die Mail geht.

    ``kurz_vakuum`` schreibt statt ``(vakuumiert)`` ein ``V`` hinter die
    Menge - so wie es auf dem Papierformular des Metzgers steht (``2x 4 St V``).
    Das gedruckte Formular nutzt die kurze Form, weil dort die Spaltenbreite
    zaehlt; in der Mail bleibt das Wort ausgeschrieben.
    """
    teile = []
    for b in position.get("portionen", []):
        t = menge_text(b)
        if mit_vakuum and b.get("vakuum"):
            t += " V" if kurz_vakuum else " (vakuumiert)"
        teile.append(t)
    text = ", ".join(teile)
    hinweis = position.get("hinweis") or ""
    if hinweis:
        text = f"{text} \u2014 {hinweis}" if text else hinweis
    return text


def block_gewicht(block):
    """Gewicht eines Blocks in Kilogramm, sonst ``None``."""
    faktor = GEWICHTS_EINHEITEN.get(block.get("einheit"))
    if faktor is None or block.get("menge") is None:
        return None
    return block["anzahl"] * block["menge"] * faktor


def summen(positionen, preise=None):
    """Kennzahlen der Bestellung fuer Fusszeile, Mail und Schaetzung.

    ``preise`` bildet Artikelnummer -> Preis je Kilo ab. Der Wert ist ein
    **Mindestwert**: Stueck-, Laengen- und Groessenangaben lassen sich ohne
    Stueckgewicht nicht bewerten, ebenso Artikel ohne Preis. Ihre Zahl wird
    getrennt ausgewiesen, damit klar ist, wie belastbar die Zahl ist.
    """
    preise = preise or {}
    out = {"positionen": 0, "kg": 0.0, "stueck": 0, "vakuum": 0,
           "wert": 0.0, "ohne_wert": 0}
    for p in positionen:
        if not bestellt(p):
            continue
        out["positionen"] += 1
        preis = preise.get(p.get("nummer"))
        bewertbar = False
        for b in p.get("portionen", []):
            if b.get("vakuum"):
                out["vakuum"] += b["anzahl"]
            kg = block_gewicht(b)
            if kg is not None:
                out["kg"] += kg
                if preis:
                    out["wert"] += kg * float(preis)
                    bewertbar = True
            elif b.get("einheit") == "St" and b.get("menge") is not None:
                out["stueck"] += int(b["anzahl"] * b["menge"])
        if not bewertbar:
            out["ohne_wert"] += 1
    out["kg"] = round(out["kg"], 3)
    out["wert"] = round(out["wert"], 2)
    return out


def schluessel(portionen):
    """Vergleichsschluessel einer Portionsliste - fuer die Vorschlaege (F4)."""
    return "|".join(
        f"{b['anzahl']}x{b['menge']}{b['einheit']}{':v' if b.get('vakuum') else ''}"
        for b in portionen
    )
