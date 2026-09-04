# Mittagstisch — Sonderwünsche auf einen Blick — Specification

> Spec-driven development. Every requirement carries explicit test cases.
> Ein Spec mit offenen `[NEEDS CLARIFICATION]`-Markern darf NICHT nach `/sdd-plan`.

**Status:** Ready for Plan

**Owner:** Dorfladen — Verkäuferinnen (Mittagstisch)

**Last updated:** 2026-09-04

## Overview

Die Verkäuferinnen wünschen sich eine **Zusammenstellung aller Sonderwünsche auf
einen Blick**. Heute steckt ein Sonderwunsch zugeklappt in der jeweiligen
Bestellkarte im Mittagstisch-Tab: Um alle zu finden, muss jede Karte einzeln
aufgeklappt werden. Beim Kochen und beim Packen an der Theke geht so leicht ein
Wunsch unter.

Ein Sonderwunsch wird **in der Regel bei der ersten Nachricht mitgegeben** — also
über das Feld „Anmerkung (optional)" im Bestellformular
([static-site/mittagstisch-bestellen.html](../../static-site/mittagstisch-bestellen.html),
Platzhalter „z.B. ohne Zwiebeln, extra Soße…"). Entsteht danach noch ein Hin und
Her, liegt das im Chatverlauf der Bestellung.

Dieses Feature ergänzt den Mittagstisch-Tab im Kiosk
([static-site/kiosk.html](../../static-site/kiosk.html)) um eine
**Sonderwunsch-Ansicht**, die alle Sonderwünsche des gewählten Tages gebündelt
zeigt, sowie um zwei **Ein-Klick-Einstiege** dorthin. Eine eventuelle
**Folgekonversation ist je Bestellung aufklappbar**.

Referenz-Mockup: [mockups/sonderwuensche-mockup.html](../../mockups/sonderwuensche-mockup.html)
(Abschnitt 1 „Integration in den Mittagstisch-Tab").

Es handelt sich um eine **reine Frontend-Änderung**. Alle benötigten Daten
liefert der bestehende Endpunkt `GET /api/lunch-order?datum=…` bereits mit
(`anmerkung`, `verlauf`, `kunde_kommentar`, `kommentar_gelesen`). Es werden
**keine** neuen Felder, Entitäten oder API-Endpunkte gebraucht.

## Goals

- **Ein Klick** genügt, um alle Sonderwünsche des gewählten Tages zu sehen.
- Der Sonderwunsch-Text steht **im Vordergrund** — nicht Name, Preis oder Status.
- Sonderwünsche sind **nach Gericht gruppiert**, passend zum Kochablauf.
- Eine eventuelle **Folgekonversation ist aufklappbar**, inklusive Antwortfeld,
  ohne die Ansicht zu verlassen.
- Ein **Hinweis fällt ins Auge**, auch wenn niemand aktiv danach sucht.
- Eine **Kompaktansicht** stellt alle Wünsche als knappe Liste dar (Übersicht
  für die Küche am Bildschirm).
- Konform zur Konstitution: responsive (Mobile/iPad/Desktop), benutzerfreundliche
  Meldungen, automatisierte Playwright-Tests.

## Non-Goals

- **Kein Abhaken / kein „berücksichtigt"-Status.** Bewusste Entscheidung des
  Auftraggebers: reine Übersicht, kein neues Feld in Dataverse.
- **Keine Druckfunktion.** Die Kompaktansicht wird am Bildschirm angezeigt, nicht
  gedruckt.
- Keine Änderung am Bestellformular (das Feld „Anmerkung" bleibt wie es ist).
- Keine neuen API-Endpunkte, keine Schema-Änderung, keine Migration.
- Kein Bearbeiten/Löschen des Sonderwunsch-Textes durch das Personal.
- Keine tagesübergreifende Auswertung/Statistik über Sonderwünsche.
- Keine eigene Sonderwunsch-Ansicht für Metzger oder Online-Shop (nur
  Mittagstisch).

## Decisions (aufgelöste Klärungen)

1. **Was ist ein Sonderwunsch?** Primär das Feld `anmerkung` der Bestellung
   (Bestellformular). Ist `anmerkung` leer, gilt die **erste Kundennachricht**
   aus `verlauf` als Sonderwunsch. Hat eine Bestellung beides nicht, taucht sie
   in der Ansicht nicht auf.
2. **Abgrenzung „weitere Nachrichten":** Alle Chatnachrichten, die **nicht** als
   Sonderwunsch gelten. Ist `anmerkung` der Sonderwunsch, sind das **alle**
   Einträge aus `verlauf`. Diente die erste Kundennachricht als Sonderwunsch,
   sind es alle `verlauf`-Einträge **danach**.
3. **`anmerkung` ist kein Teil von `verlauf`.** Serverseitig sind das getrennte
   Felder (`dl_anmerkung` vs. `dl_chatverlauf`), es gibt also keine Dopplung.
4. **Stornierte Bestellungen** (`status === 2`) werden ausgeblendet — analog zur
   bestehenden Kochbedarf-Leiste.
5. **Bezugstag:** Immer der in der Tagesleiste gewählte Tag. Die Ansicht nutzt
   dieselben bereits geladenen Bestellungen wie die Bestellliste; es wird **kein
   zusätzlicher Request** ausgelöst.
6. **Zwei Einstiege:** (a) eine bernsteinfarbene **Sonderwunsch-Leiste** unter der
   Kochbedarf-Leiste und (b) ein **Filter-Reiter „Sonderwünsche"** in der
   Statusleiste. Beide führen zur selben Ansicht.
7. **Kein Doppel-Filter:** Die Sonderwunsch-Ansicht zeigt **alle** nicht
   stornierten Bestellungen mit Sonderwunsch des Tages — unabhängig davon, ob
   sie offen, bestätigt oder bereits abgeholt sind. Der Status steht als Badge
   auf der Karte.
8. **Sortierung:** Gruppiert nach Gericht (gleiche Reihenfolge wie die
   Kochbedarf-Leiste: nach Portionszahl absteigend). Innerhalb einer Gruppe
   ungelesene Nachrichten zuerst, danach alphabetisch nach Kundenname.
9. **Antworten:** Im aufgeklappten Verlauf steht dasselbe Antwortfeld wie in der
   Bestellkarte und nutzt dieselbe Funktion (`sendReply`). Kein zweiter
   Sendeweg, keine abweichende Logik.
10. **Gelesen-Markierung:** Ungelesene Kundenhinweise werden mit derselben
    bestehenden Regel erkannt wie in der Bestellkarte (`_hasUnseenComment`):
    ein noch nicht als gelesen markierter Hinweis — `anmerkung` **oder**
    Chatnachricht — gilt als ungelesen. Solche Karten tragen das „NEU"-Merkmal
    und lassen sich in der Sonderwunsch-Ansicht per Knopf als gelesen markieren
    (`markMsgRead`). Damit stimmen die Kennzeichnungen in beiden Ansichten
    überein.
11. **Kompaktansicht:** Umschalter „Details ⇄ Kompakt" innerhalb der
    Sonderwunsch-Ansicht. Kompakt = eine Zeile je Bestellung
    (Anzahl · Kunde · Gericht · Sonderwunsch), ohne Verlauf und ohne Antwortfeld.
12. **Leiste nur bei Bedarf:** Gibt es am gewählten Tag keinen Sonderwunsch, wird
    die Sonderwunsch-Leiste **nicht** gerendert und der Filter-Reiter zeigt `0`.
13. **Touch-first:** Alle interaktiven Elemente haben ein Mindest-Tap-Target von
    44×44px (Konstitution, Kiosk wird per Touch bedient).

## Requirements

<!-- markdownlint-disable MD024 -->

### F1: Sonderwunsch ermitteln

#### F1 Description

Aus den geladenen Bestellungen des gewählten Tages wird je Bestellung ein
Sonderwunsch-Text abgeleitet. Diese Regel ist die Grundlage für Zähler, Leiste
und Liste.

#### F1 Inputs

| Input | Required | Description |
| --- | --- | --- |
| `anmerkung` | Nein | Freitext aus dem Bestellformular („Anmerkung (optional)") |
| `verlauf` | Nein | Chatverlauf, Array aus `{who, text}` (`who` = `kunde` \| `dorfladen`) |
| `status` | Ja | `0` neu, `1` bestätigt, `2` storniert, `3` abgeholt |

#### F1 Behaviour / Acceptance

- Given `anmerkung` ist nicht leer, Then ist `anmerkung` der Sonderwunsch und
  **alle** `verlauf`-Einträge zählen als „weitere Nachrichten".
- Given `anmerkung` ist leer und `verlauf` enthält mindestens eine Nachricht mit
  `who === 'kunde'`, Then ist die **erste** dieser Kundennachrichten der
  Sonderwunsch; alle `verlauf`-Einträge **nach** dieser Nachricht zählen als
  „weitere Nachrichten".
- Given `anmerkung` ist leer und es gibt keine Kundennachricht, Then hat die
  Bestellung **keinen** Sonderwunsch und erscheint nicht in der Ansicht.
- Given `status === 2` (storniert), Then wird die Bestellung ausgeschlossen —
  auch wenn sie eine `anmerkung` hat.
- Reiner Weißraum (`"   "`) in `anmerkung` gilt als leer.

#### F1 Test Cases

**TC-F1-01: Anmerkung ist der Sonderwunsch**

- **Setup:** Bestellung mit `anmerkung = "ohne Zwiebeln"`, `verlauf = []`, `status = 0`.
- **Action:** Sonderwunsch-Ansicht öffnen.
- **Expected:** Bestellung erscheint; angezeigter Sonderwunsch = „ohne Zwiebeln";
  Verlauf-Aufklapper wird nicht als aufklappbar angeboten (0 weitere Nachrichten).

**TC-F1-02: Erste Kundennachricht ersetzt fehlende Anmerkung**

- **Setup:** `anmerkung = ""`, `verlauf = [{who:'kunde',text:'bitte glutenfrei'},{who:'dorfladen',text:'notiert'}]`.
- **Action:** Sonderwunsch-Ansicht öffnen.
- **Expected:** Sonderwunsch = „bitte glutenfrei"; genau **1** weitere Nachricht
  („notiert") ist aufklappbar.

**TC-F1-03: Bestellung ohne jeden Hinweis erscheint nicht**

- **Setup:** `anmerkung = ""`, `verlauf = []`.
- **Action:** Sonderwunsch-Ansicht öffnen.
- **Expected:** Bestellung taucht in der Liste **nicht** auf und wird nicht mitgezählt.

**TC-F1-04: Stornierte Bestellung wird ausgeschlossen**

- **Setup:** `anmerkung = "ohne Salz"`, `status = 2`.
- **Action:** Sonderwunsch-Ansicht öffnen.
- **Expected:** Bestellung taucht nicht auf; Zähler enthält sie nicht.

**TC-F1-05: Anmerkung plus Chat**

- **Setup:** `anmerkung = "Soße separat"`, `verlauf = [{who:'kunde',text:'Soße separat'},{who:'dorfladen',text:'ok'}]`.
- **Action:** Sonderwunsch-Ansicht öffnen, Verlauf aufklappen.
- **Expected:** Sonderwunsch = „Soße separat"; Aufklapper meldet **2** weitere
  Nachrichten und zeigt beide.

### F2: Sonderwunsch-Leiste als Blickfang

#### F2 Description

Unterhalb der Kochbedarf-Leiste erscheint im Mittagstisch-Tab eine
bernsteinfarbene Leiste, die die Anzahl der Sonderwünsche des gewählten Tages
zeigt. Ein Klick auf die Leiste öffnet die Sonderwunsch-Ansicht.

#### F2 Behaviour / Acceptance

- Given mindestens ein Sonderwunsch am gewählten Tag, Then wird die Leiste
  angezeigt mit: Anzahl der betroffenen Bestellungen, Gesamtzahl der
  Bestellungen des Tages sowie — sofern vorhanden — der Anzahl ungelesener
  Nachrichten und der Anzahl mit Folgekonversation.
- Given kein Sonderwunsch am gewählten Tag, Then wird die Leiste **nicht**
  gerendert.
- When die Leiste (oder ihr Knopf „Alle anzeigen") geklickt wird, Then wechselt
  die Ansicht auf den Filter „Sonderwünsche".
- Die Leiste erscheint **unabhängig vom aktiven Statusfilter** (wie die
  Kochbedarf-Leiste), außer in der Nachrichten- und der Sonderwunsch-Ansicht
  selbst (dort wäre sie redundant).
- Der Tageswechsel in der Tagesleiste aktualisiert die Leiste.

#### F2 Test Cases

**TC-F2-01: Leiste zeigt korrekte Anzahl**

- **Setup:** Tag mit 5 Bestellungen, davon 2 mit Sonderwunsch, 1 davon storniert.
- **Action:** Mittagstisch-Tab öffnen.
- **Expected:** Leiste sichtbar, Anzahl = 1 (die stornierte zählt nicht).

**TC-F2-02: Klick öffnet die Sonderwunsch-Ansicht**

- **Setup:** Tag mit mindestens einem Sonderwunsch, Filter „Offen" aktiv.
- **Action:** Auf die Sonderwunsch-Leiste klicken.
- **Expected:** Filter-Reiter „Sonderwünsche" ist aktiv, die Sonderwunsch-Liste
  wird angezeigt.

**TC-F2-03: Keine Leiste ohne Sonderwünsche**

- **Setup:** Tag mit 3 Bestellungen, keine mit `anmerkung` oder Kundennachricht.
- **Action:** Mittagstisch-Tab öffnen.
- **Expected:** Keine Sonderwunsch-Leiste im DOM.

### F3: Filter-Reiter „Sonderwünsche"

#### F3 Description

Die Statusfilter-Leiste des Mittagstischs erhält einen zusätzlichen Reiter
„Sonderwünsche" mit Zähler, zwischen „Offen" und „Nachrichten".

#### F3 Behaviour / Acceptance

- Der Reiter zeigt die Anzahl der Bestellungen mit Sonderwunsch des gewählten
  Tages (gleiche Zahl wie die Leiste aus F2).
- When der Reiter geklickt wird, Then wird die Sonderwunsch-Liste angezeigt und
  der Reiter als aktiv markiert; alle anderen Reiter sind inaktiv.
- When ein anderer Reiter geklickt wird, Then verschwindet die Sonderwunsch-Liste
  und die gewohnte Bestellliste erscheint wieder.
- Der Zähler aktualisiert sich beim Tageswechsel und beim automatischen
  Neuladen der Bestellungen.
- Bleibt der Reiter aktiv, während ein Auto-Refresh läuft, Then bleibt die
  Sonderwunsch-Ansicht aktiv (kein Zurückspringen auf „Offen").

#### F3 Test Cases

**TC-F3-01: Zähler stimmt mit der Leiste überein**

- **Setup:** Tag mit 4 Bestellungen, 3 davon mit Sonderwunsch.
- **Action:** Mittagstisch-Tab öffnen.
- **Expected:** Reiter-Zähler = 3 und identisch zur Zahl in der Leiste.

**TC-F3-02: Umschalten zwischen den Reitern**

- **Setup:** Tag mit Sonderwünschen und offenen Bestellungen.
- **Action:** „Sonderwünsche" klicken, danach „Offen" klicken.
- **Expected:** Erst Sonderwunsch-Liste, danach wieder die normale Bestellliste;
  jeweils genau ein aktiver Reiter.

**TC-F3-03: Ansicht überlebt den Auto-Refresh**

- **Setup:** Filter „Sonderwünsche" aktiv.
- **Action:** Neuladen der Bestellungen auslösen.
- **Expected:** Sonderwunsch-Ansicht weiterhin aktiv und befüllt.

### F4: Sonderwunsch-Liste

#### F4 Description

Die Sonderwunsch-Ansicht listet alle Bestellungen mit Sonderwunsch, gruppiert
nach Gericht. Der Sonderwunsch-Text ist das optisch dominante Element der Karte.

#### F4 Behaviour / Acceptance

- Kopfzeile mit Datum des gewählten Tages sowie Gesamtzahl der Sonderwünsche und
  der betroffenen Portionen.
- Je Gericht ein Gruppenkopf mit Gerichtname und Anzahl der Sonderwünsche der
  Gruppe. Reihenfolge der Gruppen wie in der Kochbedarf-Leiste (Portionen
  absteigend).
- Je Bestellung eine Karte mit: Kundenname, Menge, Gericht, Preis, Status-Badge,
  Quelle (Online/Vor Ort), „MIT"-Kennzeichnung sofern zutreffend, und dem
  **hervorgehobenen Sonderwunsch-Text**.
- Ungelesene Kundennachrichten sind als „NEU" gekennzeichnet und lassen sich per
  Knopf als gelesen markieren.
- Der Sonderwunsch-Text wird escaped ausgegeben (kein HTML aus Kundendaten).
- Lange Texte werden vollständig umgebrochen, nicht abgeschnitten.

#### F4 Test Cases

**TC-F4-01: Gruppierung nach Gericht**

- **Setup:** 2 Sonderwünsche zu „Schnitzel", 1 zu „Käsegriller".
- **Action:** Sonderwunsch-Ansicht öffnen.
- **Expected:** Zwei Gruppenköpfe; „Schnitzel"-Gruppe enthält 2 Karten und steht
  vor „Käsegriller".

**TC-F4-02: Karte zeigt Wunsch und Eckdaten**

- **Setup:** Bestellung „Huber Anna", 2×, Schnitzel, `anmerkung = "glutenfrei"`.
- **Action:** Sonderwunsch-Ansicht öffnen.
- **Expected:** Karte zeigt Name, „2×", Gericht und den Text „glutenfrei".

**TC-F4-03: Kopfzeile zählt korrekt**

- **Setup:** 3 Bestellungen mit Sonderwunsch über 5 Portionen.
- **Action:** Sonderwunsch-Ansicht öffnen.
- **Expected:** Kopfzeile nennt 3 Sonderwünsche und 5 Portionen.

**TC-F4-04: HTML im Kundentext wird nicht ausgeführt**

- **Setup:** `anmerkung = "<img src=x onerror=alert(1)>ohne Salz"`.
- **Action:** Sonderwunsch-Ansicht öffnen.
- **Expected:** Text erscheint wörtlich; kein `img`-Element aus dem Kundentext im
  DOM, kein Dialog.

### F5: Aufklappbarer Verlauf

#### F5 Description

Gibt es zu einer Bestellung über den Sonderwunsch hinaus weitere Nachrichten,
zeigt die Karte eine Zeile „Weitere Nachrichten (n)". Ein Klick öffnet den
Chatverlauf samt Antwortfeld.

#### F5 Behaviour / Acceptance

- Given n > 0 weitere Nachrichten, Then ist die Aufklappzeile anklickbar und
  nennt n; ungelesene werden zusätzlich ausgewiesen.
- Given n = 0, Then wird ein nicht anklickbarer Hinweis „Keine weiteren
  Nachrichten" gezeigt.
- When aufgeklappt, Then erscheinen die Nachrichten in der bekannten Chat-Optik
  (Kunde links, Dorfladen rechts, älteste oben) plus Antwortfeld.
- When im Antwortfeld gesendet wird, Then wird dieselbe Logik wie in der
  Bestellkarte genutzt; nach dem Senden ist die Antwort im Verlauf sichtbar.
- Leere Antwort wird nicht gesendet, sondern mit benutzerfreundlichem Hinweis
  abgewiesen (Konstitution §6).
- Ein Knopf in der Kopfzeile klappt **alle** Verläufe auf bzw. wieder zu.
- Der Aufklappzustand bleibt über einen Auto-Refresh hinweg erhalten.

#### F5 Test Cases

**TC-F5-01: Aufklappen zeigt den Verlauf**

- **Setup:** Bestellung mit Sonderwunsch und 2 weiteren Nachrichten.
- **Action:** Auf „Weitere Nachrichten (2)" klicken.
- **Expected:** Beide Nachrichten sichtbar, Antwortfeld sichtbar.

**TC-F5-02: Ohne Folgekonversation kein Aufklapper**

- **Setup:** Bestellung mit `anmerkung`, ohne Chatnachrichten.
- **Action:** Sonderwunsch-Ansicht öffnen.
- **Expected:** Hinweis „Keine weiteren Nachrichten", nicht anklickbar.

**TC-F5-03: Antworten aus der Sonderwunsch-Ansicht**

- **Setup:** Bestellung mit aufgeklapptem Verlauf.
- **Action:** Text eingeben und senden.
- **Expected:** `PATCH /api/lunch-order/<id>` mit der Antwort; Erfolgsmeldung;
  Antwort erscheint im Verlauf.

**TC-F5-04: Leere Antwort wird abgewiesen**

- **Setup:** wie oben, Feld leer.
- **Action:** Senden.
- **Expected:** Kein PATCH, benutzerfreundlicher Hinweis, kein `alert()`.

**TC-F5-05: Alle Verläufe aufklappen**

- **Setup:** 2 Bestellungen mit Folgekonversation.
- **Action:** Knopf „Alle Verläufe" in der Kopfzeile klicken.
- **Expected:** Beide Verläufe offen; erneuter Klick schließt beide.

### F6: Kompaktansicht

#### F6 Description

Ein Umschalter in der Kopfzeile wechselt zwischen der ausführlichen Kartenansicht
und einer kompakten Liste, die alle Sonderwünsche knapp untereinander zeigt.

#### F6 Behaviour / Acceptance

- Kompaktansicht zeigt je Bestellung eine Zeile: Menge, Kundenname, Gericht,
  Sonderwunsch-Text.
- In der Kompaktansicht gibt es **kein** Antwortfeld und **keinen** Verlauf.
- Der Umschalter behält seinen Zustand beim Tageswechsel und beim Auto-Refresh
  innerhalb derselben Sitzung.
- Beide Ansichten enthalten dieselben Bestellungen in derselben Reihenfolge.

#### F6 Test Cases

**TC-F6-01: Umschalten auf Kompakt**

- **Setup:** Sonderwunsch-Ansicht mit 3 Einträgen, Kartenansicht aktiv.
- **Action:** Auf „Kompakt" schalten.
- **Expected:** 3 kompakte Zeilen; kein Antwortfeld im DOM.

**TC-F6-02: Zurück auf Details**

- **Setup:** Kompaktansicht aktiv.
- **Action:** Auf „Details" schalten.
- **Expected:** Wieder Kartenansicht mit denselben 3 Bestellungen.

**TC-F6-03: Gleiche Menge in beiden Ansichten**

- **Setup:** 4 Sonderwünsche.
- **Action:** Zwischen beiden Ansichten wechseln.
- **Expected:** Beide Male 4 Einträge.

### F7: Leerzustand und Responsiveness

#### F7 Description

Die Ansicht verhält sich sauber, wenn es nichts zu zeigen gibt, und ist auf allen
drei Zielauflösungen bedienbar.

#### F7 Behaviour / Acceptance

- Given kein Sonderwunsch am gewählten Tag, When der Reiter „Sonderwünsche"
  geöffnet wird, Then erscheint ein freundlicher Leerzustand
  („Keine Sonderwünsche für diesen Tag"), keine leeren Gruppenköpfe.
- Auf 375×667, 768×1024 und 1280×800 gibt es kein horizontales Scrollen des
  Dokuments; Karten und Texte bleiben vollständig lesbar.
- Alle Knöpfe und Aufklappzeilen haben ein Tap-Target von mindestens 44×44px.

#### F7 Test Cases

**TC-F7-01: Leerzustand**

- **Setup:** Tag ohne Sonderwünsche.
- **Action:** Reiter „Sonderwünsche" öffnen.
- **Expected:** Freundlicher Hinweistext, keine Gruppenköpfe, keine Karten.

**TC-F7-02: Kein horizontales Scrollen**

- **Setup:** Tag mit Sonderwünschen, langer Wunschtext.
- **Action:** Ansicht auf 375×667, 768×1024 und 1280×800 öffnen.
- **Expected:** `document.scrollWidth <= window.innerWidth` (+1px Toleranz) auf
  allen drei Auflösungen.

**TC-F7-03: Tap-Targets**

- **Setup:** Sonderwunsch-Ansicht auf 375×667.
- **Action:** Maße der Aufklappzeile und der Kopfzeilen-Knöpfe prüfen.
- **Expected:** Jeweils mindestens 44px hoch.

## Data / API

Keine Änderung. Genutzt wird ausschließlich der bestehende Endpunkt:

| Endpunkt | Nutzung |
| --- | --- |
| `GET /api/lunch-order?datum=YYYY-MM-DD` | liefert bereits `anmerkung`, `verlauf`, `kunde_kommentar`, `kommentar_gelesen`, `status`, `gericht`, `menge`, `preis`, `quelle`, `mitnehmen` |
| `PATCH /api/lunch-order/<id>` | bestehende Antwort- und Gelesen-Logik (F5), unverändert |

## Constitution Compliance

| Prinzip | Erfüllung |
| --- | --- |
| 1 Spec first | Diese Spec vor Plan/Tasks/Code |
| 2 Test cases | F1–F7 mit TC-Fn-xx, Playwright |
| 3 Keine Secrets | Keine Zugangsdaten berührt |
| 4 Keine Artefakte | Nur `kiosk.html`, Spec-Dateien, Testdatei |
| 5 Deploy-aware | Reine Frontend-Änderung, über bestehenden SWA-Workflow |
| 6 Freundliche Meldungen | Leerzustand und Antwort-Hinweise in Klartext, kein `alert()` |
| 7 Responsive | TC-F7-02/03 auf allen drei Viewports |
| 8 Automatisierte Tests | `tests/kiosk-sonderwuensche.spec.js` mit gemockter API |
