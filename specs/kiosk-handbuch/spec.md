# Kiosk-Handbuch — Specification

**Status:** Approved for implementation

**Owner:** Dorfladen Oberornau

**Last updated:** 2026-07-23

## Overview

Das Kiosk-Handbuch unter `static-site/help-workflows.html` unterstützt Mitarbeitende im täglichen Ladenbetrieb. Es erklärt die tatsächlich vorhandenen Bereiche Mittagstisch, Online-Shop, Metzger, Stammkunden, Social Media und Kalender in professionellem, verständlichem Deutsch. Die Hilfe wird direkt über das Fragezeichen im Kiosk geöffnet und muss auf Tablet, Smartphone und Desktop gut bedienbar sein.

Die bisherige Seite enthält sachlich falsche Abläufe und eine für den geschäftlichen Einsatz ungeeignete, teilweise kindliche oder ordinäre Wortwahl. Sie wird vollständig durch ein quell- und spezifikationsgestütztes Anwenderhandbuch ersetzt.

## Goals

- Mitarbeitende können die wichtigsten täglichen Arbeitsabläufe ohne technische Vorkenntnisse nachvollziehen.
- Alle genannten Schaltflächen, Filter, Zustände und Folgen entsprechen dem aktuellen Kiosk.
- Jeder Fachbereich enthält mehrere plausible Handlungssituationen mit klaren Einzelschritten.
- Die Hilfe bleibt als übersichtliche, responsive Seite mit sieben direkt anwählbaren Kapiteln verfügbar.

## Non-Goals

- Keine Änderung am Verhalten des Kiosks, an APIs oder Datenmodellen.
- Keine Beschreibung erfundener Kassen-, Pfand-, Guthaben-, Waagen- oder Buchhaltungsfunktionen.
- Keine technische System-, API- oder Architektur-Dokumentation für Mitarbeitende.
- Keine verbindlichen Aussagen zu externen Apps, Gerätefunktionen oder Benachrichtigungen, soweit das Verhalten vom Gerät abhängt oder im Quellcode nicht eindeutig belegt ist.

## Requirements

### F1: Professionelle und verständliche Sprache

#### F1 Description

Das gesamte Handbuch verwendet sachliches, freundliches und geschäftsgeeignetes Deutsch in der Anrede „Sie“.

#### F1 Inputs

| Input | Required | Description |
| --- | --- | --- |
| Aktuelle Kiosk-Oberfläche | Yes | Sichtbare Bezeichnungen und bestätigte Abläufe |
| Bestehende Spezifikationen | Yes | Fachliche Regeln und Akzeptanzkriterien |

#### F1 Behaviour / Acceptance

- Das Handbuch enthält keine ordinären, verniedlichenden, herablassenden oder sensationsheischenden Formulierungen.
- Technische Hintergründe werden nicht erläutert, sofern sie für die Bedienung nicht erforderlich sind.
- Warnungen benennen konkrete Folgen und erforderliche Prüfungen ohne Dramatisierung.
- Die Anrede und Terminologie sind im gesamten Dokument einheitlich.

#### F1 Test Cases

##### TC-F1-01: Geschäftstaugliche Wortwahl

- **Setup:** Neue Handbuchseite ist geladen.
- **Expected:** Eine definierte Liste der abgelehnten Ausdrücke kommt im sichtbaren Text nicht vor.

##### TC-F1-02: Einheitliche Anrede

- **Setup:** Alle sieben Kapitel werden geprüft.
- **Expected:** Anleitungen verwenden eine professionelle „Sie“-Ansprache und klare Tätigkeitswörter.

### F2: Fachlich korrekte Kiosk-Abläufe

#### F2 Description

Jedes Kapitel beschreibt ausschließlich Funktionen, die in der aktuellen Kiosk-Oberfläche und den zugehörigen Spezifikationen belegt sind.

#### F2 Behaviour / Acceptance

- **Überblick:** erklärt Kopfzeile, sechs Kiosk-Bereiche, Aktualisierung und Statushinweise ohne pauschales Reversibilitätsversprechen.
- **Mittagstisch:** erklärt Tagesauswahl, `Offen`, `Nachrichten`, `Erledigt`, `Alle`, Telefonbestellung, Bestätigung, Abholung, Nachrichten und begründetes Stornieren.
- **Online-Shop:** erklärt `Zu erledigen`, `Heute abholen`, `Überfällig`, `Historie` sowie `Annehmen`, `Packen`, Teilmengen/Nicht lieferbar, Drucken, Fertigstellen, `Ausgeben`, Nachrichten und Statuskorrektur.
- **Metzger:** erklärt `Zu erledigen`, `Heute abholen`, `Sammelbestellung`, `Nachrichten`, `Historie`, das Abhaken bestellter Positionen, Drucken, `Bestellt`, `Abgeholt`, Zurücksetzen, Antworten und begründetes Stornieren. Waagen- oder Realpreisabläufe werden nicht behauptet.
- **Stammkunden:** erklärt Suche, `Alle Kunden laden`, `Neuer Kunde`, Pflichtfelder, `Bestellen`, `Bearbeiten` und Deaktivieren. Finanzkonten und Pfand werden nicht erwähnt.
- **Social Media:** erklärt die vier sichtbaren Schritte, Heute/Morgen, Titel und Text, Produktauswahl, Vorschau, geräteabhängiges Teilen, Bildspeicherung, `Tagesinfo veröffentlichen`, `Parken`, Entwürfe sowie Katalogpflege. Das Handbuch behauptet nicht, dass eine externe App immer automatisch geöffnet wird.
- **Kalender:** erklärt Wochen-/Tagesauswahl, Kategorien, Erledigt-Filter, einmalige und wiederkehrende Einträge, Vorlagen, Kundenbezug, Erledigt-Markierung, Entfernen eines einzelnen Serientags und Beenden einer Serie ab einem Datum bei Erhalt der Vergangenheit.

#### F2 Test Cases

##### TC-F2-01: Vorhandene Kapitel und Fachbegriffe

- **Action:** Alle Handbuch-Tabs nacheinander öffnen.
- **Expected:** Jedes Kapitel enthält seine nachgewiesenen Kernbezeichnungen und mindestens zwei konkrete Handlungssituationen.

##### TC-F2-02: Keine erfundenen Geschäftsprozesse

- **Expected:** Begriffe und Aussagen zu Pfandkonto, Guthabenkonto, Realgewicht, Waagenetikett, automatischer Kassierung und erfundenen Mittagstisch-Stationen fehlen.

##### TC-F2-03: Kritische Folgen korrekt beschrieben

- **Expected:** Endgültiges Löschen, Deaktivieren, Stornieren und Serienende werden voneinander unterschieden; Hinweise nennen die tatsächliche Wirkung.

### F3: Praxisnahe Handlungssituationen

#### F3 Description

Die Anleitung verbindet Funktionsbeschreibungen mit realistischen Arbeitsfällen aus dem Ladenbetrieb.

#### F3 Behaviour / Acceptance

- Jeder Fachbereich enthält einen Standardablauf und mindestens einen Korrektur-, Ausnahme- oder Kommunikationsfall.
- Beispiele nutzen plausible Personen-, Artikel- und Zeitangaben, ohne nicht vorhandene Systemfunktionen vorauszusetzen.
- Jeder Ablauf endet mit einem klar erkennbaren Ergebnis oder Kontrollpunkt.

#### F3 Test Cases

##### TC-F3-01: Standard- und Ausnahmefälle

- **Expected:** In jedem Fachkapitel sind mindestens zwei als Szenario gekennzeichnete Abläufe vorhanden.

##### TC-F3-02: Social-Media-Arbeitsablauf

- **Expected:** Social Media enthält Szenarien für einen Tagesbeitrag, eine Korrektur vor Veröffentlichung, einen geparkten Entwurf und einen neuen Katalogartikel.

### F4: Bedienbare und responsive Hilfe

#### F4 Description

Die bestehende tabbasierte Hilfe wird als eigenständige statische Seite beibehalten und für alle Zielgrößen optimiert.

#### F4 Behaviour / Acceptance

- Genau sieben Kapitel-Schaltflächen sind vorhanden; beim Laden ist `Überblick` aktiv.
- Ein Klick aktiviert genau ein Kapitel und genau eine Navigationsschaltfläche.
- Die Navigation bleibt beim Scrollen erreichbar und kann auf kleinen Bildschirmen horizontal bedient werden.
- Inhalte, Tabellen und UI-Beispiele verursachen bei 375×667, 768×1024 und 1280×800 keinen horizontalen Seitenüberlauf.
- Fokuszustände und ARIA-Zustände machen die Navigation per Tastatur nachvollziehbar.

#### F4 Test Cases

##### TC-F4-01: Tab-Navigation

- **Action:** Alle sieben Tabs anklicken.
- **Expected:** Jeweils genau der zugehörige Abschnitt ist sichtbar; `aria-selected` wird korrekt gesetzt.

##### TC-F4-02: Tastaturbedienung

- **Action:** Navigation fokussieren und Pfeiltasten verwenden.
- **Expected:** Fokus und sichtbares Kapitel wechseln nachvollziehbar.

##### TC-F4-03: Responsive Darstellung

- **Setup:** Seite in allen drei Playwright-Projekten öffnen.
- **Expected:** Kein horizontaler Dokumentüberlauf; Navigation und Inhalte sind sichtbar und anklickbar.

## Data & Contracts

- Einstiegspunkt: `/help-workflows.html`, geöffnet aus `static-site/kiosk.html`.
- Referenzquellen: `static-site/kiosk.html`, `static-site/js/social.js`, `static-site/js/social-poster.js`, `static-site/js/kiosk-kalender.js` sowie einschlägige Dateien unter `specs/`.
- Das Handbuch ruft selbst keine APIs auf und verändert keine Daten.
- Kapitel-IDs bleiben stabil: `start`, `mittag`, `shop`, `metzger`, `kunden`, `social`, `kalender`.

## Open Questions

Keine offenen Fragen.

## Traceability

| Requirement | Test Cases | Plan section | Tasks |
| --- | --- | --- | --- |
| F1 | TC-F1-01, TC-F1-02 | Sprach- und Inhaltsmodell | T010, T020 |
| F2 | TC-F2-01, TC-F2-02, TC-F2-03 | Quellenbasierter Neuaufbau | T011, T020 |
| F3 | TC-F3-01, TC-F3-02 | Szenariostruktur | T011, T020 |
| F4 | TC-F4-01, TC-F4-02, TC-F4-03 | Responsive Tabs | T012, T021 |
