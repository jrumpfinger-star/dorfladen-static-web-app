"""Reine Serien-Expansion für den Kiosk-Kalender (ohne Azure-Abhängigkeit).

Bewusst frei von ``azure.functions``/``requests``, damit die Logik isoliert
per Unit-Test geprüft werden kann (siehe ``tests`` / ``_test_kalender_serien``).

Ein wiederkehrender Eintrag wird **einmal** gespeichert (Startdatum +
Wiederholung) und für einen angefragten Datumsbereich zu einzelnen Vorkommen
expandiert. Unterstützte Intervalle: ``daily``, ``weekly``, ``biweekly``,
``monthly``. ``monthly`` nutzt denselben Tag im Monat; existiert der Tag nicht
(z. B. 31.), wird auf den letzten Tag des Monats geklemmt.
"""

from __future__ import annotations

import calendar
from datetime import date, timedelta

RECURRENCES = ("daily", "weekly", "biweekly", "monthly")


def parse_date(value) -> date:
    """Akzeptiert ``date`` oder ISO-String (``YYYY-MM-DD`` / ``YYYY-MM-DDT…``)."""
    if isinstance(value, date):
        return value
    return date.fromisoformat(str(value)[:10])


def _month_day(year: int, month: int, day: int) -> date:
    """Datum im (year, month) mit ``day``, geklemmt auf das Monatsende."""
    last = calendar.monthrange(year, month)[1]
    return date(year, month, min(day, last))


def occurrences(start, wiederholung, von, bis):
    """Liste der Datumswerte in ``[von, bis]``, an denen die Serie auftritt.

    ``wiederholung`` leer/None → Einzeltermin (nur ``start``, falls im Bereich).
    """
    start = parse_date(start)
    von = parse_date(von)
    bis = parse_date(bis)
    if von > bis:
        return []

    if not wiederholung:
        return [start] if von <= start <= bis else []

    if wiederholung == "daily":
        cur = max(start, von)
        out = []
        while cur <= bis:
            out.append(cur)
            cur += timedelta(days=1)
        return out

    if wiederholung in ("weekly", "biweekly"):
        step = 7 if wiederholung == "weekly" else 14
        if von <= start:
            cur = start
        else:
            gap = (von - start).days
            k = (gap + step - 1) // step  # aufrunden auf nächstes Vorkommen
            cur = start + timedelta(days=k * step)
        out = []
        while cur <= bis:
            if cur >= start:
                out.append(cur)
            cur += timedelta(days=step)
        return out

    if wiederholung == "monthly":
        out = []
        cur_y, cur_m = von.year, von.month
        while True:
            d = _month_day(cur_y, cur_m, start.day)
            if d > bis:
                break
            if d >= von and d >= start:
                out.append(d)
            cur_m += 1
            if cur_m > 12:
                cur_m = 1
                cur_y += 1
        return out

    # Unbekanntes Intervall → wie Einzeltermin behandeln (defensiv)
    return [start] if von <= start <= bis else []


def expand_entry(entry: dict, von, bis, overrides=None):
    """Expandiert einen (Serien-)Eintrag zu Vorkommen im Bereich.

    ``entry`` erwartet mind. ``id``, ``datum`` (Start), ``wiederholung``.
    ``overrides``: Mapping ``{iso_datum: {"status": "erledigt"|"geloescht", ...}}``
    für die Serie. ``geloescht`` blendet das Vorkommen aus; ``erledigt`` setzt
    den Status des Vorkommens.

    Rückgabe: Liste von Kopien des Eintrags, je Vorkommen mit gesetztem
    ``datum`` (Vorkommensdatum) und Zusatzfeldern ``_ist_vorkommen``,
    ``_serien_id``.
    """
    overrides = overrides or {}
    wiederholung = entry.get("wiederholung") or ""
    result = []
    for d in occurrences(entry.get("datum"), wiederholung, von, bis):
        iso = d.isoformat()
        ov = overrides.get(iso)
        if ov and ov.get("status") == "geloescht":
            continue
        item = dict(entry)
        item["datum"] = iso
        item["_ist_vorkommen"] = bool(wiederholung)
        item["_serien_id"] = entry.get("id") if wiederholung else None
        if ov and ov.get("status") == "erledigt":
            item["status"] = "erledigt"
            item["erledigt_am"] = ov.get("erledigt_am", "")
        result.append(item)
    return result
