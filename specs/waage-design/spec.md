# Waagen-Design unter „Design" — Specification

> Gehört zur SDD-Stufe 1 (Specify). Offene `[NEEDS CLARIFICATION]`-Punkte
> müssen geklärt sein, bevor ein Plan entsteht. Es gilt der
> [UI-Designstandard](../../docs/ui-designstandard.md); größere Umgestaltungen
> brauchen vorab ein abgenommenes Mockup.

**Status:** Approved (Mockup abgenommen)

**Owner:** Dorfladen Oberornau

**Last updated:** 2026-11-27

## Overview

Plakat und Einzelflyer haben unter **Design → Plakate & Flyer** je einen
eigenen Abschnitt: Vorlage, Farben, Schrift, Preisschild, Marker, Live-Vorschau
und „als Standard speichern". Dieser Standard gilt für **neue** Aktionen.

Das **Waagenmotiv** hat so einen Abschnitt bisher nicht. Seine Gestaltung gibt
es nur in der einzelnen Aktion (Aktions-Editor → Gestaltung → Ausgabeziel
„Waage"). Wochenaktionen nutzen dort keine Design-Vorlage. Das Wochenplan-Bild
für die Waage hat keine Gestaltungseinstellungen und verwendet die Farben der
Homepage- bzw. Flyer-Vorlage des Wochenplans.

Neu: Die Waage bekommt unter **Design** eigene Abschnitte, die sich bedienen
und verhalten wie Plakat und Einzelflyer.

Technik: Vanilla HTML/CSS/JS (`static-site/`), Azure Functions v2 (Python);
Zielgeräte: Handy, iPad mini, Desktop und das Ladentablett (686 × 1095).

## Goals

- Unter Design gibt es einen auffindbaren Abschnitt **Waage** für Angebote
  (Wochenaktionen und Getränkeaktionen).
- Je Anzeigeprofil gibt es einen **eigenen Standard**: **800 × 462** und
  **800 × 280**.
- Der Abschnitt bietet dieselben Bedienprinzipien wie Plakat/Einzelflyer:
  Live-Vorschau im echten Format, Speichern als Standard, Vorlagen laden,
  Zurücksetzen auf den gespeicherten Stand.
- Auch das **Wochenplan-Bild für die Waage** hat unter Design einen eigenen
  Gestaltungsabschnitt.
- Neue Aktionen starten mit dem gespeicherten Waagen-Standard; bestehende
  Aktionen bleiben unverändert, bis sie ausdrücklich übernehmen.

## Non-Goals

- Kein Wechsel der Waagen-Hardware, der Bildgrößen oder der Übertragung
  (`/api/waage-werbebilder`, Brücke, JPEG 1600 × …). Das bleibt unverändert.
- Keine Änderung an Plakat, Einzelflyer, Getränkeflyer und deren Standards.
- Keine automatische Änderung bestehender Aktionen oder bereits auf die Waage
  übertragener Bilder.
- Kein neues Design-System. Es werden vorhandene Tokens, Komponenten und
  Feldhelfer wiederverwendet.

## Requirements

<!-- markdownlint-disable-next-line MD024 -->
### F1: Abschnitt „Waage" unter Design → Plakate & Flyer

#### F1 Description

Neben Plakat, Einzelflyer und Getränkeflyer erscheint ein Reiter **Waage**.
Er ist ein gleichwertiger Abschnitt mit demselben Aufbau wie Plakat und
Einzelflyer: Werkzeuge links, Live-Vorschau rechts; auf dem Handy und im
Hochformat steht die Vorschau oben, die Werkzeuge scrollen darunter.

#### F1 Behaviour / Acceptance

- Der Reiter ist in der gleichen Leiste wie Plakat/Einzelflyer erreichbar,
  ohne zusätzliche Navigationsebene.
- Es gibt zwei Reiter: **Waage groß** (800 × 462) und **Waage klein**
  (800 × 280). Die Vorschau zeigt das tatsächliche Seitenverhältnis des
  Profils.
- Ein Wechsel zwischen den Reitern verwirft keine ungespeicherten Eingaben des
  anderen Profils (kein Zustandsverlust durch Ansicht).

#### F1 Test Cases

**TC-F1-01: Reiter vorhanden und erreichbar**

- **Setup:** CMS → Design → Plakate & Flyer, vier Zielgrößen.
- **Expected:** Reiter „Waage" sichtbar, ohne waagerechtes Scrollen des
  Dokuments, mit mindestens 44 px (Touch) bzw. 32 px (präzise Maus) Höhe.

**TC-F1-02: Profilwechsel erhält Eingaben**

- **Setup:** Im Profil 800 × 462 eine Farbe ändern, nicht speichern.
- **Action:** Reiter „Waage klein" wählen, dann zurück zu „Waage groß".
- **Expected:** Die Farbänderung ist weiterhin da; Speicherstatus unverändert.

### F2: Gestaltungsgruppen wie bei Plakat und Einzelflyer

#### F2 Description

Der Abschnitt enthält dieselben Gestaltungsgruppen wie Plakat/Einzelflyer,
soweit sie auf dem Waagenformat fachlich anwendbar sind: Vorlage,
Farben (Hintergrund, Text, Preis, Marker), Bezeichnung (Schrift, Stärke,
Größe, Farbe), Zusatztext, Preisschild (Vorgaben wie Rot/Gelb, Form, Rundung,
Neigung, Preisfarbe, Kontur, Stattpreis) und Sparmarker.

#### F2 Behaviour / Acceptance

- Jede angebotene Einstellung verändert die Live-Vorschau nachvollziehbar
  (keine Scheinfunktion); nicht anwendbare Einstellungen werden nicht
  angeboten oder mit Begründung deaktiviert.
- Was die Vorschau zeigt, bleibt nach Speichern, Neuladen und im Export
  erhalten. Vorschau und Export nutzen dieselbe Rendering-Grundlage.
- Schrift und Preisschild gelten nur für das Waagenmotiv, nicht für Plakat,
  Einzelflyer oder die Oberfläche.
- Bezeichnung und Zusatztext bleiben eine Gruppe; langer Text bricht um, ohne
  zu überlappen. Passt Text nicht lesbar auf die Fläche, erscheint ein
  verständlicher Hinweis statt abgeschnittener Inhalte.

#### F2 Test Cases

**TC-F2-01: Jede Einstellung wirkt**

- **Setup:** Beispielartikel, Profil 800 × 462.
- **Action:** Je Gruppe eine Einstellung ändern.
- **Expected:** Das gerenderte Vorschaubild ändert sich; Breite × Höhe des
  Bildes entsprechen dem Profil.

**TC-F2-02: Zusatztext und Umbruch**

- **Setup:** Sehr langer Produktname und Zusatztext.
- **Expected:** Kein Überlappen; bei Nichtpassen verständlicher Hinweis.

### F3: Standard speichern, laden, zurücksetzen — je Profil

#### F3 Description

Der Standard wird **je Profil** gespeichert, genau wie bei Plakat/Einzelflyer:
Speichern ersetzt den bisherigen Startstandard für **neue** Aktionen. Bestehende
Aktionen und bereits übertragene Bilder bleiben unverändert.

#### F3 Behaviour / Acceptance

- Explizites **Speichern** je Profil; ungespeicherter Stand wird angezeigt.
- Vorlagen (benannte Gestaltungen) laden, ersetzen und löschen mit
  Rückfrage in den vorhandenen Bestätigungsdialogen.
- **Standard laden** ersetzt ungespeicherte Änderungen erst nach Bestätigung.
- Fehler beim Speichern erscheinen als verständliche Meldung; Eingaben bleiben
  erhalten.
- Speichern in der Vorschau erzeugt keinen Schreibzugriff auf Waage,
  Werbebilder oder Aktionen.

#### F3 Test Cases

**TC-F3-01: Speichern je Profil getrennt**

- **Setup:** Beide Profile mit verschiedenen Farben gestaltet.
- **Action:** Nur 800 × 462 speichern, neu laden.
- **Expected:** 800 × 462 geladen wie gespeichert; 800 × 280 unverändert
  (Standardwerte).

**TC-F3-02: Ersetzen und Löschen mit Rückfrage**

- **Expected:** Keine Änderung ohne Bestätigung; Abbrechen ändert nichts.

### F4: Neue Aktionen starten mit dem Standard

#### F4 Description

Neue **Wochenaktionen** und **Getränkeaktionen** übernehmen beim Anlegen den
gespeicherten Waagen-Standard des jeweiligen Profils für ihr Waagenmotiv.
Das gilt auch für neue Aktionen der alten CMS-Ansicht („Aktion im
Querformat"). Bestehende Aktionen behalten ihre Gestaltung. Über die bereits vorhandene
Aktion „Designstandards übernehmen" im Aktions-Editor kann eine bestehende
Aktion den Waagen-Standard ausdrücklich übernehmen (nur für das aktuelle
Ausgabeziel „Waage").

#### F4 Behaviour / Acceptance

- Neue Aktion ohne gespeicherten Standard: bisheriges Verhalten unverändert.
- Eine Änderung des Standards verändert gespeicherte Aktionen nicht.
- Wochenaktionen nutzen den Standard für das Waagenziel (bisher keine
  Vorlage); die Ziele Sammelflyer, Einzelflyer, Homepage/Kiosk bleiben
  unverändert.

#### F4 Test Cases

**TC-F4-01: Neue Aktion übernimmt Standard**

- **Setup:** Waagen-Standard gespeichert; Wochen- und Getränkeaktion neu
  anlegen.
- **Expected:** Waagenmotiv zeigt die Standardfarben und -schrift.

**TC-F4-02: Bestehende Aktion unverändert**

- **Setup:** Aktion mit eigener Waagen-Gestaltung; Standard ändern.
- **Expected:** Waagenmotiv der Aktion unverändert, bis „Designstandards
  übernehmen" bestätigt wird.

### F5: Wochenplan-Bild für die Waage

#### F5 Description

Das Wochenplan-Bild für die Waage erhält unter **Design → Wochenplan** einen
eigenen Abschnitt **Waage** mit Gestaltungseinstellungen (mindestens
Hintergrund-, Streifen-, Gerichts-, Tages- und Preisfarbe sowie Schriftgröße
und Schriftart). Heute nutzt es die Farben der Homepage- bzw. Flyer-Vorlage.

#### F5 Behaviour / Acceptance

- Der Waagen-Abschnitt des Wochenplans hat eine Live-Vorschau in den beiden
  Profilen. Die Profile haben **je einen eigenen Standard**.
- Ohne gespeicherte Waagen-Einstellung bleibt das Bild **pixelgleich** zum
  heutigen Ergebnis (Rückwärtskompatibilität).
- Passt die ganze Woche nicht lesbar auf die Fläche, bleibt der bisherige
  Hinweis erhalten; es wird nichts abgeschnitten.
- Der Dialog „Auf die Waage" (Art Vollbild/Dauerwerbung, Profil, Upload,
  Löschen alter Bilder) bleibt unverändert.

#### F5 Test Cases

**TC-F5-01: Ohne Einstellung pixelgleich**

- **Expected:** Das erzeugte Waagenbild entspricht byteweise dem Stand vor der
  Änderung.

**TC-F5-02: Geänderte Farbe wirkt**

- **Setup:** Hintergrundfarbe im Waagen-Abschnitt speichern.
- **Expected:** Das erzeugte Waagenbild zeigt die neue Farbe in beiden
  Profilen; Plakat/Flyer/Homepage-Wochenplan unverändert.

### F6: Funktionserhalt, Bedienung und Isolation

- Alle bisherigen Eigenschaften und Funktionen bleiben erreichbar
  (Vorher/Nachher-Zuordnung im Plan). Keine Zusammenlegung oder Entfernung
  ohne ausdrückliche Freigabe.
- UI nach [UI-Designstandard](../../docs/ui-designstandard.md): gemeinsame
  Tokens, 44/32-px-Ziele, Dunkelmodus, sichtbarer Fokus, Escape/Zurück
  schließen die vorderste Ebene.
- Vier Zielgrößen: 375 × 667, 768 × 1024, 1280 × 800, 686 × 1095.
- Tests schreiben keine echten Daten und senden nichts an die Waage; alle
  API-Zugriffe sind isoliert.

#### F6 Test Cases

**TC-F6-01: Vier Zielgrößen**

- **Expected:** Kein Überlauf, keine Überlagerung, Bedienmaße eingehalten,
  Vorschau ohne Abschneiden.

**TC-F6-02: Keine ungewollten Schreibzugriffe**

- **Expected:** Beim Gestalten ohne Speichern keine Schreibzugriffe; beim
  Speichern genau ein Schreibzugriff auf die Design-Konfiguration.

## Data & Contracts

- Neue Konfigurationsschlüssel in der bestehenden Design-Konfiguration
  (`/api/cms-config`), getrennt je Profil, zum Beispiel
  `waage_large_*` / `waage_small_*` für Angebote und
  `wpTplColors['waage-…']` für den Wochenplan.
  Die endgültigen Namen legt der Plan fest.
- Keine neuen Endpunkte; keine Änderung am Datenmodell der Aktionen.
- Fehlende Schlüssel = heutiges Verhalten.

## Open Questions

Entschieden am 2026-11-27 (Nutzer):

- Gestaltungsgruppen: alle wie beim Einzelflyer (Vorlage, Farben, Schrift,
  Preisschild, Marker); fachlich nicht anwendbare werden ausgeblendet.
- Geltung: Standards gelten auch für die alten CMS-Aktionen („Aktion im
  Querformat", Waage-Knopf in der CMS-Liste), nicht nur für den Aktions-Editor.
- Wochenplan-Waage: Farben, Schriftgröße **und Schriftart** einstellbar.
- Profilwahl: eigene Reiter **„Waage groß"** (800 × 462) und **„Waage klein"**
  (800 × 280) in der Reiterleiste neben Plakat/Einzelflyer
  (ersetzt die Profilauswahl innerhalb des Abschnitts aus F1).

- Mockup abgenommen am 2026-11-27 ([waage-design-mockup.html](../../mockups/waage-design-mockup.html)):
  Reiter „Waage groß/klein" stehen zwischen „Getränkeflyer" und „Gemeinsame
  Einstellungen"; im Wochenplan-Design stehen sie hinter „Flyer / Druck". Auf
  dem Handy bleibt die Live-Vorschau oben stehen, die Einstellungen scrollen
  darunter (statt eines Umschalters).

## Traceability

| Requirement | Test Cases | Plan section | Tasks | Nachweis |
| --- | --- | --- | --- | --- |
| F1 Abschnitt Waage | TC-F1-01, TC-F1-02 | Technical Approach 2 | T030, T031 | `tests/cms-waage-design.spec.js` (TC-F1-01), Mockup `cms-waage-design-mockup.spec.js` (TC-WDM-01/02) |
| F2 Gestaltungsgruppen | TC-F2-01, TC-F2-02 | Technical Approach 2, 3 | T020, T030 | `cms-waage-design.spec.js` (TC-F2-01) |
| F3 Standard je Profil | TC-F3-01, TC-F3-02 | Technical Approach 1 | T010, T011, T030 | `cms-waage-design.spec.js` (TC-F3-01), `tests/test_angebote.py` |
| F4 Neue Aktionen | TC-F4-01, TC-F4-02 | Technical Approach 4, 5 | T021–T023, T034 | `cms-waage-design.spec.js` (TC-F4-01, TC-F4-03) |
| F5 Wochenplan-Waage | TC-F5-01, TC-F5-02 | Technical Approach 6 | T032, T033 | `cms-waage-design.spec.js` (TC-F5-01/02); Byte-Gleichheit gegen den Stand vor der Änderung einmalig geprüft |
| F6 Funktionserhalt, Bedienung | TC-F6-01, TC-F6-02 | Test Strategy | T040, T041 | Regression `cms-angebote-ablauf`, `angebote-*`, `cms-wochenplan`; vier Zielgrößen |

Hinweis: TC-F3-02 (Rückfragen beim Ersetzen/Löschen) und TC-F4-02 (bestehende
Aktion bleibt unverändert) werden durch den vorhandenen Designer und das
Modell erfüllt (`blank` greift nur bei Neuanlage); eigene Playwright-Fälle
dazu sind noch offen.
