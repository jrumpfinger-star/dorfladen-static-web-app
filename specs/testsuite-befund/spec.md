# Befund: Zustand und Kosten der Testsuite

Entstanden aus zwei Aufträgen: „Wie viele der 3896 Testfälle können
entfallen oder sind redundant oder zu banal? Miste aus" und „Teste alles
durch und fixe alles".

Dieses Papier hält fest, **was gemessen wurde** — damit die nächste
Entscheidung auf Zahlen steht und nicht auf Vermutungen.

## Größe

| | Zahl |
|---|---|
| Dateien | 48 |
| eindeutige Tests | 983 |
| Testfälle (× 4 Profile) | 3.932 |

## Die vier Profile kosten fast nichts

Die naheliegende Vermutung war, die Vervierfachung sei der Kostentreiber.
**Gemessen ist das Gegenteil der Fall:**

| Lauf | Dauer |
|---|---|
| `meine-bestellungen.spec.js`, 1 Profil | 134 s |
| dieselbe Datei, 4 Profile | **105 s** |

Playwright verteilt die Arbeit auf die Kerne; vier Profile laufen
nebeneinander, nicht nacheinander. **Am Profilschnitt zu sparen bringt
nichts** — und würde die Constitution (Prinzip 7) verletzen, die vier
Viewports ausdrücklich verlangt. Sie hat sich bewährt: Die
Zweispalten-Schwelle des Ladentabletts wurde nur gefunden, weil es ein
eigenes Profil bekam.

## Der wirkliche Kostentreiber: feste Wartezeiten

| | Zahl |
|---|---|
| `waitForTimeout`-Stellen | **491** |
| Summe je Profil | 757 s |
| hochgerechnet auf 4 Profile | **50 Minuten reine Warterei** |

Die größten Posten:

| Datei | Stellen | Sekunden |
|---|---|---|
| `kiosk.spec.js` | 130 | 216 |
| `fleisch.spec.js` | 66 | 155 |
| `bestellsystem.spec.js` | 32 | 81 |
| `shop-admin.spec.js` | 13 | 28 |

Eine feste Wartezeit ist immer ein Kompromiss: zu kurz macht den Test
unzuverlässig, zu lang verschenkt Zeit. Ersetzbar sind sie durch
Bedingungen (`waitForFunction`, `expect.poll`, `toPass`), die weiterlaufen,
sobald der Zustand eintritt.

**Das ist der Hebel** — nicht die Zahl der Tests.

## Zwei Betriebsarten, die verwechselt wurden

| Art | Dateien | Tests | Braucht |
|---|---|---|---|
| **mit Mocks** | 30 | 714 | nur einen Dateiserver |
| **ohne Mocks** | 18 | 568 | eine laufende Umgebung mit API |

Wer die zweite Gruppe gegen einen reinen Dateiserver laufen lässt, bekommt
hunderte rote Felder, ohne dass am Code etwas falsch wäre. Genau darauf bin
ich hereingefallen: 367 vermeintliche Fehlschläge waren **Fehler meines
Testaufbaus**.

Dazu kam: Ein schlichter Dateiserver kennt `/kiosk` nicht — Azure Static
Web Apps löst das auf `kiosk.html` auf. `tools/dev-proxy.js` leistet beides
(lokale Dateien, echte API) und ist für diese Gruppe der richtige Aufbau.

## Redundanz und Banalität: kaum vorhanden

Gesucht und **nicht** gefunden:

- **Doppelte Testtitel über Dateien hinweg: 0.** Die Suite ist sauber
  geschnitten, es gibt keine zwei Dateien, die dasselbe prüfen.
- **Zu banale Fälle: 29** von 1.126 (eine einzige triviale Zusicherung wie
  `toHaveCount(1)` ohne inhaltliche Prüfung). Das sind 2,6 % — zu wenig,
  um den Aufwand einer Bereinigung zu rechtfertigen, und einige davon
  sichern bewusst die bloße Existenz eines Bedienelements.

**Es gibt also kaum etwas auszumisten.** Die Suite ist nicht zu groß, sie
ist an einzelnen Stellen zu langsam und an einer Stelle zu abhängig von
Tagesdaten.

## Die offene Stelle: `kiosk.spec.js`

159 Tests, keine Mocks, prüft gegen die **echten Bestellungen des Tages**.

Gemessen am 22.09.2026 (Dienstag): **0 Mittagstisch-Bestellungen, kein
Gericht hinterlegt.** Folge: 34 von 37 Fehlschlägen waren
Zeitüberschreitungen — die Tests warteten auf Bestellkarten, die es an
diesem Tag nicht gab. Laufzeit: **33 Minuten**.

Das ist kein Fehler im Code. Es ist eine Grundsatzfrage, die nicht
nebenbei entschieden werden sollte:

> Prüfen wir gegen **echte Daten** — dann sind die Tests tagesabhängig und
> an manchen Tagen rot, ohne dass etwas kaputt ist. Oder gegen **Mocks** —
> dann sind sie verlässlich, prüfen aber nicht mehr die Wirklichkeit.

**Ein Versuch und warum er verworfen wurde:** Eine Vorbedingung, die
Blöcke ohne Bestellungen überspringt, senkte die Fehlschläge von 37 auf 31
— nahm aber 22 Tests mit, die auch ohne Bestellungen etwas prüfen (56 grün
vorher, 34 danach). Zu grob, deshalb zurückgenommen.

### Vorschlag

1. **Mocks ergänzen** für die Fälle, die eine bestimmte Datenlage brauchen
   (Filter, Zähler, Kartenaufbau). Sie prüfen Logik, nicht Wirklichkeit.
2. **Ohne Mocks belassen**, was nur die Erreichbarkeit prüft
   (Reiterwechsel, Verweise, Aufbau der Seite).
3. Dann ist die Datei an jedem Tag deutbar — und schneller.

Der Umbau betrifft rund 74 der 104 Fälle und gehört in eine eigene Runde.

## Was in dieser Nacht behoben wurde

| Fund | Art |
|---|---|
| Hinweis-Knopf zeigte den erfassten Text nicht | **echter Fehler im Betrieb** |
| Tagesleiste nahm auf dem Telefon zwei Reihen | **echter Gestaltungsmangel** |
| `kiosk-neu.spec.js` ohne Anmelde-Aufsatz | 14 Fälle still rot |
| `kiosk-notiz.spec.js` suchte den Knopf außerhalb des Blattes | 10 Fälle still rot |
| Bäcker-Fälle klickten Bedienelemente nur in ihrer breiten Form | 4 Fälle rot auf `mobile` |
| `TC-B2-F19-03` nahm eine feste Vorauswahl an | kippte beim Wochentagswechsel |
| `K4-01/02/04/05` nahmen eine einspaltige Liste an | seit dem Umbau falsch |
| Service Worker in 18 Dateien nicht abgeschaltet | Abstürze und stille Mocks |

## Wichtigste Lehre

Rote Felder, die man erklären kann, gewöhnt man sich an — und übersieht
darin den echten Fehler. Von den 23 „bekannt roten" Bäcker-Fällen war
**einer** ein echter Fehler im Betrieb (der Hinweis-Knopf). Er stand
monatelang zwischen den anderen und fiel nicht auf.

**Eine Suite ist nur so viel wert wie ihre Deutbarkeit.**
