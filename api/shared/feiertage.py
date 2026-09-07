"""Gesetzliche Feiertage in Bayern und die Frage: ist das ein Arbeitstag?

Warum hier und nicht je Modul: Die Berechnung lag bisher doppelt vor
(``shop-order`` und ``fleisch-order``). Eine dritte Kopie fuer die Baecker-
Bestellung waere die schlechteste aller Loesungen - weichen die Listen
irgendwann voneinander ab, bestellt ein Bereich an einem Feiertag und der
andere nicht, ohne dass das jemand bemerkt.

Beruecksichtigt ist **Maria Himmelfahrt (15.08.)**: In Bayern ist der Tag nur
in ueberwiegend katholischen Gemeinden gesetzlicher Feiertag - Obertaufkirchen
gehoert dazu.
"""
from datetime import date, datetime, timedelta

# ── Bewegliche Feiertage haengen am Ostersonntag ──────────────────────────


def ostersonntag(jahr):
    """Ostersonntag nach der Gaussschen Osterformel."""
    a = jahr % 19
    b, c = divmod(jahr, 100)
    d, e = divmod(b, 4)
    f = (b + 8) // 25
    g = (b - f + 1) // 3
    h = (19 * a + b - d - g + 15) % 30
    i, k = divmod(c, 4)
    lw = (32 + 2 * e + 2 * i - h - k) % 7
    m = (a + 11 * h + 22 * lw) // 451
    monat = (h + lw - 7 * m + 114) // 31
    tag = ((h + lw - 7 * m + 114) % 31) + 1
    return date(jahr, monat, tag)


def feiertage_bayern(jahr):
    """Alle gesetzlichen Feiertage eines Jahres als Menge von 'JJJJ-MM-TT'."""
    o = ostersonntag(jahr)
    tage = [
        date(jahr, 1, 1),        # Neujahr
        date(jahr, 1, 6),        # Heilige Drei Koenige
        o + timedelta(days=-2),  # Karfreitag
        o + timedelta(days=1),   # Ostermontag
        date(jahr, 5, 1),        # Tag der Arbeit
        o + timedelta(days=39),  # Christi Himmelfahrt
        o + timedelta(days=50),  # Pfingstmontag
        o + timedelta(days=60),  # Fronleichnam
        date(jahr, 8, 15),       # Maria Himmelfahrt
        date(jahr, 10, 3),       # Tag der Deutschen Einheit
        date(jahr, 11, 1),       # Allerheiligen
        date(jahr, 12, 25),      # 1. Weihnachtstag
        date(jahr, 12, 26),      # 2. Weihnachtstag
    ]
    return {t.isoformat() for t in tage}


_zwischenspeicher = {}


def _als_datum(wert):
    """Nimmt date, datetime oder 'JJJJ-MM-TT' entgegen."""
    if isinstance(wert, datetime):
        return wert.date()
    if isinstance(wert, date):
        return wert
    return datetime.strptime(str(wert), "%Y-%m-%d").date()


def ist_feiertag(wert):
    d = _als_datum(wert)
    if d.year not in _zwischenspeicher:
        _zwischenspeicher[d.year] = feiertage_bayern(d.year)
    return d.isoformat() in _zwischenspeicher[d.year]


def ist_werktag(wert):
    """Montag bis Samstag und kein Feiertag - also ein Tag, an dem der Laden
    besetzt ist. Sonntag zaehlt nie."""
    d = _als_datum(wert)
    return d.weekday() < 6 and not ist_feiertag(d)


def letzter_werktag_vor(wert, max_tage=14):
    """Der letzte Arbeitstag VOR dem angegebenen Tag.

    Damit laesst sich beantworten, wann eine Lieferung spaetestens bestellt
    werden muss: am Vortag - und faellt der auf einen Sonntag oder Feiertag,
    entsprechend frueher. Ohne diese Regel fiele zum Beispiel die Montags-
    Lieferung durch, weil ihr Vortag der Sonntag ist.
    """
    d = _als_datum(wert)
    for _ in range(max_tage):
        d -= timedelta(days=1)
        if ist_werktag(d):
            return d
    return d
