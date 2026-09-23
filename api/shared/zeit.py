"""Zeitangaben in Ladenzeit.

Azure Functions laufen in **UTC**. ``WEBSITE_TIME_ZONE`` ist nicht gesetzt -
nachgesehen, die Einstellung kommt im ganzen Projekt nicht vor. Ein blankes
``datetime.now()`` oder ``date.today()`` liefert dort also Weltzeit.

Gemeldet wurde das am Sendestempel der Baeckerei: „Das gesendete Datum wird
falsch angezeigt. Es ist nicht das Datum, wann gesendet wurde." Eine um
13:59 versandte Bestellung trug 11:59.

Drei Arten von Fehlern entstehen daraus:

1. **Zwei Stunden zu frueh** (im Winter eine). Trifft jede angezeigte Zeit.
2. **Der falsche Tag.** Zwischen 22 Uhr und Mitternacht steht in UTC noch
   der Vortag. Dann galt ein gelieferter Tag als bestellbar, eine
   Tagesleiste begann zu frueh, ein SEPA-Mandat trug das falsche Datum.
3. **Ein Zeitstempel ohne Zonenangabe.** Der Browser liest ihn nach ES-Norm
   als *lokale* Zeit - die Verschiebung faellt damit erst in der Anzeige auf
   und ist dort nicht mehr zu reparieren.

An einigen Stellen stand ``utcnow() + timedelta(hours=2)`` als Naeherung.
Das ist im Sommer richtig und im Winter eine Stunde daneben. ``ZoneInfo``
kennt die Umstellung.

**Wann UTC richtig bleibt:** Fuer Fristen, die nur mit sich selbst
verglichen werden (Token-Ablauf), fuer JWT-Felder (die Norm schreibt UTC
vor) und fuer Zeitstempel, die ausdruecklich ein ``Z`` tragen. Solche
Stellen gehoeren nicht umgestellt - sie sind geprueft und vermerkt.
"""
from datetime import datetime, timedelta, timezone


def zone():
    """Die Zeitzone des Ladens.

    Rueckfall auf feste +2 Stunden nur, falls die Zeitzonendaten fehlen -
    im Sommer richtig, im Winter eine Stunde daneben, immer noch besser als
    UTC. Auf einer vollstaendigen Laufzeit greift dieser Zweig nie.
    """
    try:
        from zoneinfo import ZoneInfo
        return ZoneInfo("Europe/Berlin")
    except Exception:
        return timezone(timedelta(hours=2))


def jetzt_lokal():
    """Der aktuelle Zeitpunkt im Laden, **mit** Zeitzonenangabe."""
    return datetime.now(zone())


def heute_lokal():
    """Der heutige Kalendertag im Laden."""
    return jetzt_lokal().date()


def heute_iso():
    """Der heutige Kalendertag als ``JJJJ-MM-TT``."""
    return heute_lokal().isoformat()


def stempel_lokal():
    """Zeitstempel fuer die Anzeige: ``2026-09-22T13:59:00+02:00``.

    Die Zone steht mit im Text, damit der Kiosk nicht raten muss.
    """
    return jetzt_lokal().isoformat(timespec="seconds")


def stempel_utc():
    """Zeitstempel fuer die Ablage: ``2026-09-22T11:59:00Z``.

    Fuer Felder, die schon immer in Weltzeit gefuehrt wurden. Das ``Z`` ist
    dabei Pflicht - ohne es liest der Browser den Wert als lokale Zeit.
    """
    return datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
