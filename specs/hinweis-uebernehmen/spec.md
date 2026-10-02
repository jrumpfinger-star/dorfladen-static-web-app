# Hinweise in die Vorbelegung übernehmen (Metzger) — Specification

**Status:** umgesetzt
**Gemeldet:** „Die Hinweise werden aber nicht übernommen vom selben Tag
der Woche vorher."

## Befund (gemessen am 02.10. an den Live-Daten)

| Vorlage → Entwurf | Hinweise in der Vorlage | im Entwurf |
|---|---|---|
| Mo 28.09. → Mo 05.10. | 6 (Kräuter, Knoblauch, Zwiebel, 3× Klein) | 0 |
| Fr 02.10. → Fr 09.10. | 2 (Kräuter, Käse) | 0 |

Ursache: `metzger_store.entwurf_positionen()` leerte jeden Hinweis
(`p["hinweis"] = ""  # Hinweise gelten fuer den einen Tag`).

Die Annahme dahinter stimmte nicht. Im Laden stehen dort **Sortenangaben**,
die zur Position gehören — ohne sie bestellt die Vorbelegung „Salami mit
Zwiebelrand/Käserand", ohne zu sagen, welche.

## Requirements

- Der Hinweis einer Position wird in die Vorbelegung des nächsten
  gleichen Wochentags übernommen.
- Eine Position mit **nur** einem Hinweis (z. B. „nur wenn da") wird
  ebenfalls übernommen. Sie gilt schon bisher als bestellt
  (`metzger_portionen.bestellt`), wurde bei der Vorbelegung aber verworfen.
- **Zusatzartikel** bleiben draußen (unverändert, Spec F8) — samt Hinweis.
- Wer einen Hinweis nicht mehr braucht, tippt ihn im Kiosk weg (×).
- Die gesendete Vorlage selbst bleibt unverändert.

Bäcker und Getränke sind nicht betroffen (dort wird kein Hinweis geleert).

## Hinweis zu bereits gespeicherten Entwürfen

Die Vorbelegung entsteht nur, wenn für den Tag noch **nichts gespeichert**
ist. Ein Entwurf, der vor der Korrektur schon gespeichert wurde, behält
seinen Stand. Am 02.10. waren die Entwürfe für Mo 05.10. und Fr 09.10.
noch nicht gespeichert und bekommen die Hinweise damit automatisch.

## Test Cases

`tests/test_metzger_hinweis_uebernehmen.py`, TC-HU-01 bis -05 — am echten
`_entwurf()`, mit den Positionen vom 02.10. nachgebildet.

## Gegenprobe

Alte Fassung: TC-HU-01 (Kräuter, Käse → `''`) und TC-HU-02 („nur wenn
da" → fehlt) fallen.
