# Die App muss sich als App installieren lassen

## Overview

Aus dem Laden: *„Wir haben Probleme mit Android 12. Die App erscheint hier
nicht in der Liste der Apps, obwohl sie auf dem Startbildschirm installiert
wurde. Ebenso gehen dann Notifications nicht."*

## Ursache

Beide Symptome zusammen beschreiben genau **eine** Sache: Es wurde keine App
angelegt, sondern nur eine **Verknüpfung**.

| | echte App (WebAPK) | Verknüpfung |
|---|---|---|
| Startbildschirm | Symbol | Symbol |
| **Liste aller Apps** | **ja** | **nein** |
| Einstellungen → Apps | eigener Eintrag | keiner |
| **Benachrichtigungen** | **eigene** | gehören Chrome |
| Adresszeile | keine | je nach Fall sichtbar |

Chrome legt nur dann eine echte App an, wenn die Seite alle Bedingungen
erfüllt. Eine davon: **ein auf der Seite verlinktes Manifest.**

**Ausgerechnet `app.html` — die Anleitungsseite zum Installieren — hatte
keinen Manifest-Verweis.** Die Seite schickt Besucher ausdrücklich dorthin
(*„Geben Sie dort dorfladen-oberornau.de/app ein"*). Wer der Anleitung folgte,
bekam zwangsläufig eine Verknüpfung.

Drei Folgen, alle gemeldet oder erklärbar:

1. Im Chrome-Menü stand nur **„Zum Startbildschirm hinzufügen"**, nicht
   „App installieren".
2. `beforeinstallprompt` feuerte nie — der Knopf **„Jetzt installieren"** auf
   der Seite blieb deshalb dauerhaft unsichtbar. Er ist ausdrücklich so
   gebaut: *„Ein Knopf, der nichts bewirkt, ist schlimmer als gar keiner."*
3. Die entstandene Verknüpfung erschien nicht in der App-Liste, und
   Benachrichtigungen liefen über Chrome statt über eine eigene App.

Die Anleitung verschärfte das noch. Dort stand:

> „Im Menü steht **„App installieren"**. Bei manchen Geräten heißt es
> **„Zum Startbildschirm hinzufügen"** — das ist dasselbe."

Das ist **nicht** dasselbe. Der Satz führte die Leute geradewegs in den
gemeldeten Zustand.

### Nicht die Android-Version war der Auslöser

Die Bedingung fehlte auf **jedem** Gerät gleichermaßen — Android 12 ist
unverdächtig. Entscheidend war, **von welcher Seite aus** installiert wurde:

| Seite | Manifest | Ergebnis |
|---|---|---|
| `index.html`, `shop.html`, … (10 Seiten) | ja | echte App |
| **`app.html`** und 16 weitere | **nein** | **Verknüpfung** |

Wer zufällig auf der Startseite installierte, bekam eine richtige App — wer
der Anleitung folgte, nicht. Das erklärt, warum es „nur auf manchen Geräten"
auftrat.

## F1: Jede Kundenseite verweist auf das Manifest

- Alle **23 Kundenseiten** tragen den Manifest-Block (Manifest, `theme-color`,
  Apple-Angaben, Apple-Symbol) — bisher hatten ihn nur 10.
- **Mitarbeiterseiten bleiben bewusst außen vor** (`cms*`, `*-admin`, `pack`,
  `portal`, `help-workflows`, `shop-freigabe`). Das Verwaltungswerkzeug
  gehört nicht als Kunden-App auf ein Handy.
- Der **Kiosk** behält sein eigenes `kiosk-manifest.json`, `posten.html` sein
  `posten-manifest.json`. Sonst hieße die installierte Kiosk-App „Dorfladen"
  und startete auf der Kundenseite.

## F2: Die Anleitung benennt den Unterschied

- Die Gleichsetzung ist gestrichen.
- Neuere Chrome-Fassungen bieten nach „Zum Startbildschirm hinzufügen" eine
  **Auswahl** an. Die Anleitung sagt jetzt: unbedingt **„Installieren"**
  wählen, nicht „Verknüpfung erstellen" — mit der Begründung, was sonst
  fehlt.
- Neuer Kasten **„So erkennen Sie, dass es geklappt hat"**: in der Liste
  aller Apps nachsehen. Fehlt der Dorfladen dort, war es eine Verknüpfung —
  entfernen und noch einmal.

Das ist zugleich die Anleitung für die bereits betroffenen Geräte im Dorf:
**Symbol entfernen, neu installieren.** Eine Verknüpfung lässt sich nicht
nachträglich in eine App verwandeln.

## Test Cases

**TC-PWA-01: Jede der 23 Kundenseiten verweist auf ein Manifest** — geprüft
an der Datei, damit der Wächter auch ohne laufende Umgebung trägt.

**TC-PWA-02: Mitarbeiterseiten bleiben ohne Kunden-Manifest** — die
Gegenrichtung.

**TC-PWA-03: Der Kiosk nutzt sein eigenes Manifest.**

**TC-PWA-04: Das Manifest erfüllt alle Installationsbedingungen** — `name`,
`short_name`, `start_url`, tauglicher `display`, Symbole in 192 und 512.

**TC-PWA-05: Der Service Worker beantwortet Abrufe** — `fetch` verlangt
Chrome für die Installation, `push` braucht es für Benachrichtigungen.

**TC-PWA-06: `app.html` registriert den Service Worker.**

**TC-PWA-07: Die Anleitung verwechselt Installation und Verknüpfung nicht** —
fängt genau den Satz ab, der in den Fehler führte.

**TC-PWA-08: Der Browser findet Manifest und Symbole** — gegen die geladene
Seite, alle vier Symboldateien abgerufen.

**Gegenprobe gemacht:** Mit entferntem Manifest in `app.html` fallen
TC-PWA-01 und TC-PWA-08. Der Wächter ist nicht blind.

## Was bewusst offenbleibt

Ein Wächter kann nicht prüfen, ob Chrome auf einem echten Gerät wirklich eine
WebAPK anlegt — das entscheidet ein Google-Dienst zur Installationszeit und
setzt die Play-Dienste voraus. Geprüft wird deshalb die **Bedingung**, die in
unserer Hand liegt. Das genügt: Sie war der Grund.

## Betroffene Dateien

| Datei | Änderung |
|---|---|
| 17 Kundenseiten in [static-site/](../../static-site) | Manifest-Block ergänzt |
| [app.html](../../static-site/app.html) | Anleitung berichtigt, Prüfkasten ergänzt |
| [pwa-installierbar.spec.js](../../tests/pwa-installierbar.spec.js) | neu, 30 Prüfungen |
