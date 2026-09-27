# Profil bearbeiten — Specification

**Status:** umgesetzt
**Gemeldet:** „Es muss auch hier möglich sein, sein Profil (Konto) zu
bearbeiten und zu ändern, wie es Standard ist in Online-Anwendungen."

## Overview

Unter „Mein Konto" gab es im angemeldeten Zustand nur einen einzigen
Knopf: **Abmelden**. Kein Weg, Vorname, Nachname, Telefon, E-Mail oder
Passwort zu ändern.

## Requirements

### F1: Name und Telefon ändern sich ohne Hürde

#### F1 Behaviour / Acceptance

- Ein Knopf „✎ Profil" neben „Abmelden" öffnet das Bearbeiten-Formular,
  vorbelegt mit den aktuellen Angaben.
- Vorname, Nachname und Telefon lassen sich ohne zusätzliche Bestätigung
  speichern.
- Ein leerer Vorname/Nachname wird client-seitig abgelehnt, ohne den
  Server zu bemühen.
- „Abbrechen" kehrt ohne zu speichern zur Bestellübersicht zurück.

### F2: E-Mail und Passwort verlangen das aktuelle Passwort

#### F2 Description

Wie beim Online-Banking üblich: sicherheitsrelevante Änderungen
verlangen eine zusätzliche Bestätigung.

#### F2 Behaviour / Acceptance

- Ändert sich die E-Mail-Adresse oder wird ein neues Passwort gesetzt,
  ist das **aktuelle Passwort** Pflicht — client- **und** serverseitig
  geprüft.
- Ein falsches aktuelles Passwort wird verständlich gemeldet (401), die
  alte E-Mail/das alte Passwort bleiben unverändert.
- Eine bereits vergebene E-Mail-Adresse wird abgelehnt (409).
- Ein zu kurzes neues Passwort (< 8 Zeichen) oder eine falsche
  Wiederholung wird abgelehnt, bevor eine Anfrage gesendet wird.
- Nach einer erfolgreichen E-Mail-Änderung gilt die Adresse wieder als
  **unbestätigt**, und ein neuer Bestätigungslink wird verschickt — wie
  bei der ersten Anmeldung.
- Nach jeder erfolgreichen Änderung kommt ein **neues Anmeldezeichen**
  zurück (Name/E-Mail stehen im Zeichen selbst) und wird übernommen.

### F3: Die Kundenkennung kommt ausschließlich aus dem Anmeldezeichen

#### F3 Description

Der teuerste denkbare Fehler: Stünde die Kundenkennung im Anfragetext
statt ausschließlich im Anmeldezeichen, könnte jeder ein fremdes Profil
ändern, indem er dessen ID einträgt. Derselbe Grundsatz wie in
`lunch-order._konto_mail()` (Spec meine-bestellungen-geraete, F3).

#### F3 Test Cases

`test_fremdes_profil_ueber_id_im_text_ist_nicht_erreichbar` in
`tests/test_konto_profil.py`: Eine ID im Textkörper wird schlicht
ignoriert — maßgeblich ist immer die ID aus dem Zeichen.

## Umsetzung

- **Server:** `api/auth-profile` (neu) — GET liefert das eigene Profil,
  PATCH ändert es. Entität `dl_shopkundes`, dieselbe wie Registrierung
  und Anmeldung.
- **Oberfläche:** `static-site/mein-konto.html` — neue Karte `#mk-profil`
  mit den Abschnitten Name/Telefon, E-Mail, Passwort ändern.
- **Mockup vorab geprüft:** `mockups/konto-profil-mockup.html` — mit
  erfundenen Testdaten, klickbar, ohne Serververbindung, bevor die
  Oberfläche gebaut wurde.

## Bewusst nicht umgesetzt

Kontolöschung — wirft eigene Fragen zu Datenaufbewahrung und
Bestellhistorie auf und war nicht ausdrücklich verlangt.

## Wächter

- `tests/test_konto_profil.py` — 21 Prüfungen, Server-Ebene. Gegenprobe:
  Eine testweise eingebaute Lücke (ID aus dem Text übernehmen) lässt
  genau einen Wächter fallen.
- `tests/konto-profil-bearbeiten.spec.js` — 9 Prüfungen (TC-PB-01 …
  TC-PB-09), Oberfläche über vier Auflösungen. Gegenprobe: Ohne die
  Änderungen an `mein-konto.html` fallen alle neun.
