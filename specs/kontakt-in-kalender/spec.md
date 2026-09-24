# Eine Bestellung aus einer Nachricht in den Kalender

## Overview

Aus dem Laden: *„Es wäre auch schön, wenn z. B. eine Bestellung über
Nachrichten in den Kalender übertragen werden könnte. Hast du da eine Idee,
wie dies erfolgen kann?"*

Beispiel aus dem Alltag: Margot Puls schreibt **„Bitte 1 Holzofenbrot
Roggen"**. Das ist eine Vorbestellung — sie gehört in den Kalender, nicht in
den Kopf der Verkäuferin.

## Die Lage

Der Kalender kann das **bereits alles**; es fehlte nur die Brücke:

| Feld des Kalenders | Passt zu |
|---|---|
| `kategorie` | **`vorbestellung`** — gibt es seit jeher |
| `titel` | „Bitte 1 Holzofenbrot Roggen" |
| `kunde_freitext` | „Margot Puls" |
| `datum`, `uhrzeit` | der Abholtag |

Es war also keine neue Fähigkeit zu bauen, sondern ein Weg zwischen zwei
vorhandenen.

## F1: Ein Knopf an der Nachricht

Jede **Kundennachricht mit Text** trägt im Verlauf ein kleines 🗓 neben dem
Löschknopf.

- **Nur an Kundennachrichten.** An der eigenen Antwort wäre er sinnlos — wir
  bestellen nichts bei uns selbst.
- **Nur bei Text.** An einem reinen Bild gäbe es nichts zu übernehmen.
- Er liegt **an der einzelnen Nachricht**, nicht an der Konversation: In
  einem längeren Verlauf ist genau eine Zeile die Bestellung.

## F2: Vorbefüllt, aber nicht gespeichert

Der Knopf wechselt in den Kalender und öffnet den **gewohnten Dialog**:

| | |
|---|---|
| Titel | der Wortlaut der Nachricht |
| Kunde | Name aus der Konversation |
| Kategorie | **Vorbestellung** |
| Datum, Uhrzeit | wie immer — vom Menschen zu setzen |

**Gespeichert wird ausdrücklich nicht.** Das ist die wichtigste Entscheidung
hier: „Bitte 1 Holzofenbrot Roggen" sagt nicht, **wann** abgeholt wird. Ein
Knopf, der ungefragt einen Termin anlegt, erzeugt Einträge am falschen Tag —
und die sind schlimmer als gar keine, weil man sich auf sie verlässt.

Der Schreibzeiger steht am **Ende** des vorbefüllten Titels, nicht alles
markiert: Der Text soll ergänzt werden („… – Rückruf"), nicht versehentlich
vom ersten Tastendruck gelöscht.

## Warum kein eigenes Notizfeld

Der Kalenderdialog kennt keine Notiz zum Bearbeiten — `dl_notiz` wird nur
angezeigt. Der volle Wortlaut steht deshalb im **Titel**, der ein
mehrzeiliges Feld ist. Ein Feld nur für diesen Weg einzuführen, hätte den
Dialog für alle anderen Fälle verbreitert.

## Test Cases

**TC-KK-01: Kundennachrichten tragen den Kalenderknopf.**

**TC-KK-02: An der eigenen Antwort steht keiner.**

**TC-KK-03: Der Klick öffnet den Kalender vorbefüllt** — Titel und Kunde
stehen drin.

**TC-KK-04: Die Kategorie steht auf Vorbestellung.**

**TC-KK-05: Es wird nichts still gespeichert** — der wichtigste Fall. Kein
`POST /api/kalender` nach dem Klick.

**TC-KK-06: Der Titel lässt sich ergänzen, nicht nur ersetzen.**

**Gegenprobe gemacht:** Ohne Vorbefüllung und mit falscher Kategorie fallen
**3 von 6**.

## Was bewusst offenbleibt

Zwei Ergänzungen wären sinnvoll und sind **nicht** gebaut:

1. **Ein Vermerk an der Nachricht** („→ im Kalender"), damit dieselbe
   Bestellung nicht zweimal eingetragen wird. Das braucht ein Feld am
   Verlauf und gehört für sich betrachtet.
2. **Die Antwort gleich anbieten** („Ist notiert für Donnerstag"), die man
   nur noch abschickt.

Beides ist ohne den ersten Schritt nicht sinnvoll zu bauen — erst muss der
Weg stehen.

## Betroffene Dateien

| Datei | Änderung |
|---|---|
| [kiosk-kontakt.js](../../static-site/js/kiosk-kontakt.js) | `inKalender`, Knopf an der Blase |
| [kiosk-kalender.js](../../static-site/js/kiosk-kalender.js) | `openDialog(vor)`, `KalenderKiosk.neuAus` |
| [kiosk-kontakt-haken.spec.js](../../tests/kiosk-kontakt-haken.spec.js) | 6 Fälle |