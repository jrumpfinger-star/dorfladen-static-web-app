# Heutige Metzger-Bestellung nachsehen — Specification

**Status:** umgesetzt
**Gemeldet (Fr, 02.10.):** „Warum kann die Bestellung von diesem Freitag
nicht angezeigt werden?" — die Kachel „Fr 02.10. · ✓ gesendet · 46 Pos."
war ausgegraut.

## Ursache

Der Kiosk macht eine Kachel klickbar, wenn der Server `bestellbar` **oder**
`nur_lesen` meldet. Im Server galt:

| Feld | Bedingung |
|---|---|
| `bestellbar` | Liefertag liegt **nach** heute |
| `nur_lesen` | Liefertag liegt **vor** heute und ist gesendet |

Der heutige Tag erfüllt keins von beiden — eine Lücke von genau einem Tag.
Gesperrt war damit ausgerechnet der Tag, an dem man die gelieferte Ware
mit der Bestellung vergleicht.

Unbemerkt blieb es, weil die Oberflächen-Tests `nur_lesen` selbst
vorgeben, statt es vom Server zu holen. Einen Server-Test gab es nicht.

Der Bäcker-Kiosk ist nicht betroffen: Dort ist jeder Liefertag klickbar.

## Requirement

`nur_lesen` = gesendet/korrigiert **und** nicht mehr bestellbar
(`_nur_lesen()` in `api/metzger-order/__init__.py`), gleich für die
Tagesleiste und den Einzelabruf.

- Heute, gesendet → nachsehbar, nicht änderbar
- Heute, nur Entwurf oder nichts → bleibt gesperrt (nichts zu sehen)
- Künftig, gesendet → weiterhin korrigierbar (nicht „nur lesen")
- Vergangen, gesendet → unverändert nachsehbar

## Test Cases

`tests/test_metzger_heute_lesen.py`, TC-HL-01 bis -06 — am echten
`_uebersicht()`, relativ zum tatsächlichen heutigen Datum.

## Gegenprobe

Mit der alten Fassung fallen TC-HL-01/-02 mit „nur_lesen=False — die
Kachel wäre gesperrt": genau das gemeldete Bild.
