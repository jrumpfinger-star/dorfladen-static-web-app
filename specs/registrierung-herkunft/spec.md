# Registrierung führt dorthin zurück, wo sie begann — Specification

**Status:** umgesetzt
**Gemeldet:** „Nach Registrierung eines Kunden landet dieser im Shop,
obwohl die Registrierung von der Homepage aufgerufen wurde. Der Kunde muss
dort landen, von wo er die Registrierung gestartet hat."

## Ursache

Nach dem Registrieren kommt eine E-Mail mit Bestätigungslink auf
`api/auth-verify`. Dessen Erfolgsseite hatte **fest** einen Knopf
„Zum Shop →" (`/shop.html`) und den Satz „Sie können sich jetzt im Shop
anmelden". Die Herkunft wurde nirgends mitgeführt.

## Lösung

Die Herkunft reist mit: Registrierung → Bestätigungslink → Erfolgsseite.

| Start der Registrierung | `herkunft` | Knopf auf der Bestätigungsseite |
|---|---|---|
| Startseite / Mein Konto | `start` | „Zur Startseite" → `/` |
| Mittagstisch-Bestellung | `mittag` | „Zum Mittagstisch" → `/mittagstisch-bestellen` |
| Shop | `shop` | „Zum Shop" → `/shop.html` |
| alter Link ohne Angabe | — | „Zum Shop" (wie bisher) |

- `mein-konto.html` schickt `start`, bzw. `mittag`, wenn es mit
  `?von=mittag` geöffnet wurde (die beiden Links im Mittagstisch-Formular
  tragen das jetzt).
- `shop.html` schickt ausdrücklich `shop`.
- Auch die Bestätigung einer **geänderten E-Mail** (Profil bearbeiten)
  führt zur Startseite.
- „Link erneut senden" gibt es nur im Shop → dort bleibt „Zum Shop" richtig.

## Sicherheit: keine offene Weiterleitung

Das Ziel steht im Link aus der E-Mail. Wäre es eine freie Adresse, ließe
sich über unsere Domain auf fremde Seiten weiterleiten (Phishing). Deshalb:

- Server akzeptiert nur die **Schlüssel** `start`, `mittag`, `shop` —
  beim Registrieren (`auth-register`) und beim Bestätigen (`auth-verify`).
- Alles andere wird still verworfen; es gilt der alte Standard.

## Test Cases

- `tests/test_registrierung_herkunft.py` — TC-RH-01 bis -08 (Server)
- `tests/registrierung-herkunft.spec.js` — TC-RH-10 bis -12 (Oberfläche)

## Gegenproben

1. Ohne die Server-Änderung fallen die gemeldeten Fälle (TC-RH-01, -02,
   -04, -06, -07: „war /shop.html"); die Bestandsfälle (Shop, alte Links)
   bleiben grün.
2. **Liste ausgehebelt** (freier Wert als Ziel): alle vier TC-RH-05-Fälle
   fallen — u. a. `href=https://boese.example` und
   `href=javascript:alert(1)`. Die feste Liste schützt nachweislich.
3. Ohne die Oberflächen-Änderung fallen TC-RH-10 bis -12.
