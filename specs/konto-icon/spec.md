# Mein Konto als Icon mit Anmeldestatus

**Meldung aus dem Laden (27.09.2026):** „Mein Konto könnte auch über ein
Icon dargestellt werden und man gleich sieht, ob man eingeloggt ist oder
nicht. Von hier aus sollte man sich auch neu registrieren können, wenn
nicht eingeloggt."

## Ausgangslage

In der Kopfleiste stand ein schlichter Textlink **„Mein Konto"** — immer
gleich, ob angemeldet oder nicht. Wer wissen wollte, ob er eingeloggt
ist, musste die Seite öffnen.

Das war eine halbe Sache: Der Zugang war seit Spec
`konto-ohne-bankdaten` auffindbar, sagte aber nichts über den Zustand.

## Anforderungen

- **I1** Ein Icon zeigt den Anmeldestatus **ohne Text lesen zu müssen**.
- **I2** Angemeldet steht der **Vorname** daneben.
- **I3** Abgemeldet führt der Weg **direkt ins Anlegen-Formular**.
- **I4** Angemeldet führt er zur Übersicht, nicht zum Anlegen.
- **I5** Auch das Menü auf dem Handy zeigt den Zustand.
- **I6** Ein Konto ohne Vornamen erzeugt keine leere Schaltfläche.

## Gestaltung

| Zustand | Icon | Text | Ziel |
|---|---|---|---|
| **abgemeldet** | Umriss einer Person, halbtransparenter Kreis | „Anmelden" | `/mein-konto#neu` |
| **angemeldet** | **gefüllter** weißer Kreis mit **Initialen** | Vorname | `/mein-konto` |

Der Unterschied liegt bewusst **nicht nur im Text**: Die Meldung sagt
„man gleich sieht". Ein weißer Kreis mit „AB" ist aus dem Augenwinkel
vom halbtransparenten Umriss zu unterscheiden. `TC-KI-05` misst das an
der Hintergrundfarbe — ein Zustand, den man nur durch Lesen erkennt,
wäre keiner.

## Warum `#neu` beim abgemeldeten Zustand

Der zweite Teil der Meldung: „Von hier aus sollte man sich auch neu
registrieren können." Wer in der Kopfleiste auf „Anmelden" klickt und
**kein** Konto hat, will eins — ihm zuerst die Anmeldemaske zu zeigen
wäre ein Umweg. Wer schon eins hat, wechselt dort mit einem Klick.

## Warum I6 eigens dasteht

Die Registrierung verlangt einen Vornamen, aber ein Konto kann auf
anderem Weg entstanden sein. Ohne Rückfall stünde dann eine leere
Schaltfläche da. Die Initialen kommen deshalb ersatzweise aus der
E-Mail-Adresse, der Text aus „Mein Konto" (`TC-KI-08`).

## Umsetzung

**Kopfleiste** — [static-site/index.html](../../static-site/index.html):
`#tb-konto` mit `#tb-konto-ic` (Symbol oder Initialen) und
`#tb-konto-txt`. Im HTML steht der **abgemeldete** Fall, damit die
Leiste auch ohne JavaScript etwas Sinnvolles zeigt.

**Aussehen** — [static-site/css/style.css](../../static-site/css/style.css):
`.tb-konto`, `.tb-konto-ic`, und `.tb-konto.an` für den angemeldeten
Zustand.

**Logik** — `dlKontoStand()` in `index.html`. Sie läuft **zweimal**:
sofort (für den Fall, dass der Speicher schon lesbar ist) und nach
`DOMContentLoaded` (für die Symbole).

## Wo das Icon überhaupt erscheint

Die Kopfleiste `.tb` ist **bis 768 px ausgeblendet** — dort übernimmt
das Menü. Das betrifft auch das **Ladentablett**: Es hat 1200
Bildpunkte, aber bei einem Skalierungsfaktor von 1,75 nur **686
CSS-Pixel**.

| Gerät | CSS-Breite | Kopfleiste | Zugang über |
|---|---|---|---|
| Handy | 375 px | verborgen | Menü ☰ |
| iPad mini | 768 px | verborgen | Menü ☰ |
| **Ladentablett** | **686 px** | verborgen | Menü ☰ |
| Rechner | 1280 px | sichtbar | Kopfleiste |

`TC-KI-01` forderte zunächst stur `toBeVisible()` und fiel auf drei von
vier Auflösungen — er maß nicht die Funktion, sondern die
Bildschirmbreite. Jetzt prüft er die Sichtbarkeit nur dort, wo die
Leiste erscheint; für die übrigen Breiten steht `TC-KI-06`.

## Testfälle

[tests/konto-icon.spec.js](../../tests/konto-icon.spec.js)

| ID | Prüft | Erwartung |
|----|-------|-----------|
| TC-KI-01 | I1 | abgemeldet steht „Anmelden" da, ohne Klasse `an` |
| TC-KI-02 | I3 | abgemeldet zeigt das Ziel auf `#neu` |
| TC-KI-03 | I1/I2 | angemeldet: Klasse `an`, Vorname, Initialen im Kreis |
| TC-KI-04 | I4 | angemeldet zeigt auf `/mein-konto` |
| TC-KI-05 | I1 | die beiden Zustände haben **verschiedene Hintergründe** |
| TC-KI-06 | I5 | das Handy-Menü zeigt „Anmelden" und `#neu` |
| TC-KI-07 | I5 | angemeldet nennt es den Namen |
| TC-KI-08 | I6 | ohne Vornamen: Initiale aus der Adresse, Text „Mein Konto" |

## Gegenprobe

| Rücknahme | Ergebnis |
|---|---|
| Klasse `an` nicht setzen | **TC-KI-03** fällt |
| beiden Zuständen dieselbe Farbe geben | **TC-KI-05** fällt |
| abgemeldet auf `/mein-konto` statt `#neu` zeigen | **TC-KI-02** fällt |
| Rückfall auf die E-Mail-Adresse weglassen | **TC-KI-08** fällt |

## Nebenbefund, nicht behoben

Beim Prüfen fiel ein **sporadischer** Seitenfehler auf
(`Unexpected token ':'`). Ursache: Google Maps antwortet auf
`127.0.0.1` mit `application/json` statt JavaScript, weil diese Herkunft
für den Schlüssel nicht freigegeben ist — der Browser versucht die
JSON-Fehlermeldung als Skript zu lesen.

Per `git stash` belegt: Der Fehler tritt **auch ohne** diese Änderung
auf. **Live erscheint er nicht.** Damit ist es ein reines
Entwicklungsphänomen und kein Mangel der Seite.
