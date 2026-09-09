# Bestell-Freitext für Bäcker und Metzger — Specification

> Spec-driven development. Every requirement carries explicit test cases.
> Ein Spec mit offenen `[NEEDS CLARIFICATION]`-Markern darf NICHT nach `/sdd-plan`.

**Status:** Implemented

**Owner:** Dorfladen — Verkäuferinnen (Bäcker- und Metzger-Bestellung)

**Last updated:** 2026-09-09

## Overview

Der Dorfladen bestellt jeden Liefertag beim Bäcker und beim Metzger. Die
Bestellung entsteht im Kiosk und geht als **Bestellformular** an die Bäckerei
bzw. an die Metzgerei — beim Bäcker zusätzlich als Word-Dokument, das die
Bäckerei gewohnt ist.

Heute lässt sich in diesem Formular **nur Ware bestellen**. Alles andere, was
die Verkäuferin dem Bäcker oder dem Metzger mitteilen möchte, hat keinen Platz:
„Am Freitag bitte erst ab 7 Uhr liefern", „Die Semmeln vom letzten Mal waren zu
dunkel", „Bitte die Rechnung an die neue Adresse". Solche Hinweise werden heute
mündlich oder gar nicht weitergegeben und gehen unter.

Dieses Feature ergänzt **jede** Bäcker- und Metzger-Bestellung um einen
**optionalen Freitext**, der auf dem Bestellformular mitgedruckt wird. Erfasst
wird er über einen **Textgestalter** (HTML-Editor) im Kiosk, damit Wichtiges
hervorgehoben und Mehreres als Aufzählung geschrieben werden kann.

Technisch ist es eine Änderung an Frontend
([kiosk-baecker.js](../../static-site/js/kiosk-baecker.js),
[kiosk-metzger-bestellung.js](../../static-site/js/kiosk-metzger-bestellung.js))
und API ([baecker-order](../../api/baecker-order),
[metzger-order](../../api/metzger-order)). Eine Bestellung liegt als JSON im
generischen Speicher `dl_seiteninhalts`; **eine Schema-Änderung in Dataverse ist
nicht nötig.**

## Goals

- Zu **jeder** Bestellung — Bäcker wie Metzger — lässt sich ein Freitext
  mitgeben, ohne dass er Pflicht wird.
- Der Freitext steht **auf dem Bestellformular**, das der Bäcker bzw. der
  Metzger bekommt, und ist dort **nicht zu übersehen**.
- Wichtiges lässt sich **hervorheben** (fett, kursiv, unterstrichen) und
  Mehreres als **Aufzählung** schreiben.
- Der Freitext gehört zur Bestellung: Er wird mitgespeichert, mitgesendet und
  ist über die Korrektur änderbar.
- Konform zur Konstitution: bedienbar auf Handy, iPad und Rechner,
  verständliche Meldungen, automatisierte Playwright-Tests.

## Non-Goals

- **Kein Freitext je Artikelzeile.** Der Metzger hat dafür bereits den
  Positions-Hinweis (`hinweis`); der bleibt unverändert. Hier geht es um einen
  Text zur **gesamten** Bestellung.
- **Keine beliebige HTML-Gestaltung.** Kein eingefügtes Bild, keine Tabelle,
  keine Schriftgröße, keine Farbe, kein Verweis. Begründung siehe Entscheidung 2.
- **Keine Vorlagen/Textbausteine** und keine Übernahme des Textes in die
  nächste Bestellung. Jede Bestellung beginnt mit leerem Feld.
- **Keine Antwort des Bäckers/Metzgers.** Der Freitext ist eine Einbahnstraße
  aufs Formular, kein Nachrichtenverlauf.
- Kein Freitext für Mittagstisch, Online-Shop oder Kundenbestellungen.
- Keine neue Dataverse-Spalte, keine Migration bestehender Bestellungen.

## Decisions (aufgelöste Klärungen)

1. **Was ist „eine Bestellung"?** Beim Bäcker die Bestellung **je Bäckerei und
   Liefertag** (Schlüssel `baecker_order_<bk>_JJJJ-MM-TT`), beim Metzger die
   Bestellung **je Liefertag** (`metzger_order_JJJJ-MM-TT`). Jede trägt ihren
   eigenen Freitext.
2. **Welche Auszeichnungen?** **Fett, kursiv, unterstrichen, Aufzählung,
   Absatz.** Das ist die Schnittmenge dessen, was sich sowohl im PDF (`fpdf2`,
   Kernschrift Helvetica) als auch im Word-Dokument der Bäckerei zuverlässig
   darstellen lässt. Alles andere würde im Ausdruck stillschweigend verloren
   gehen — schlimmer, als es gar nicht erst anzubieten.
3. **Wo steht der Text im Formular?**
   - **Metzger:** direkt unter der Kopfzeile, **über** der Artikeltabelle. Das
     Formular ist frei gesetzt, dort stört ein Block nicht.
   - **Bäcker:** **unter** der Artikeltabelle, in einem umrandeten Block mit der
     Überschrift „Hinweis vom Dorfladen". Das Bäcker-Formular bildet bewusst das
     gewohnte Word-Blatt nach; ein Block über der Tabelle würde dieses vertraute
     Bild zerstören.
   - In beiden Fällen erscheint der Block **nur**, wenn ein Text erfasst ist.
4. **Auch in der E-Mail?** Ja. Der Freitext steht zusätzlich im Text der
   Bestellmail, weil manche Empfänger den Anhang erst später öffnen.
5. **Bereinigung wo?** **Auf dem Server.** Der Kiosk schickt HTML; die API
   entfernt alles außer den erlaubten Auszeichnungen. Ungeprüftes Markup kann
   damit niemals ins Formular oder in die Mail durchschlagen.
6. **Länge:** höchstens **1 000 Zeichen** reiner Text. Mehr passt nicht sinnvoll
   auf ein Bestellformular. Der Kiosk zeigt den Rest-Vorrat an und lässt nicht
   mehr zu.
7. **Nach dem Senden?** Der Freitext ist Teil der Bestellung und damit nach dem
   Senden gesperrt. Geändert wird er wie jede andere Angabe über die
   **Korrektur** — beim Metzger über den bestehenden Korrekturweg, beim Bäcker
   über den Nachdruck.

## Requirements

### F1: Freitext erfassen

#### F1 Description

Im Bäcker- und im Metzger-Reiter des Kiosks gibt es je Bestellung ein
**optionales** Freitextfeld. Es wird über einen Knopf in der Bestellansicht
geöffnet und in einem Dialog bearbeitet. Der Knopf zeigt an, ob bereits ein Text
hinterlegt ist.

#### F1 Inputs

| Input | Required | Description |
| --- | --- | --- |
| `notiz.html` | Nein | Der Freitext mit den erlaubten Auszeichnungen. Vorgabe: leer |
| `notiz.text` | Nein | Derselbe Text ohne Auszeichnungen, vom Kiosk mitgeliefert, dient als Rückfallebene |

#### F1 Behaviour / Acceptance

- Im Bäcker-Reiter steht bei der gewählten Bäckerei und im Metzger-Reiter in der
  Fußleiste ein Knopf **„Hinweis"**.
- Ist kein Text erfasst, heißt der Knopf „Hinweis hinzufügen" und ist ruhig
  gezeichnet. Ist einer erfasst, heißt er „Hinweis ändern", ist hervorgehoben und
  zeigt die ersten Wörter des Textes.
- Der Dialog enthält den Textgestalter, eine Leiste mit den Auszeichnungen aus
  Entscheidung 2, die Rest-Vorrat-Anzeige und die Knöpfe „Übernehmen" und
  „Abbrechen".
- „Abbrechen" verwirft die Änderung; der zuvor gespeicherte Text bleibt.
- Ist die Bestellung gesperrt (bereits gesendet, keine Korrektur offen), ist der
  Text nur **lesbar**, der Dialog zeigt keine Bearbeitungsleiste.

#### F1 Test Cases

**TC-F1-01: Knopf ist in beiden Reitern vorhanden**

- **Setup:** Kiosk geöffnet, Bäcker-Reiter, Liefertag mit offener Bestellung.
- **Expected:** Ein Knopf „Hinweis hinzufügen" ist sichtbar. Dasselbe im
  Metzger-Reiter.

**TC-F1-02: Text erfassen und übernehmen**

- **Setup:** Metzger-Reiter, offene Bestellung.
- **Action:** Knopf antippen, „Bitte erst ab 7 Uhr liefern" eingeben,
  „Übernehmen".
- **Expected:** Der Dialog schließt, der Knopf heißt „Hinweis ändern" und zeigt
  den Anfang des Textes.

**TC-F1-03: Abbrechen verwirft**

- **Setup:** Bestellung mit dem Hinweis „Erst ab 7 Uhr".
- **Action:** Dialog öffnen, Text durch „Ganz anders" ersetzen, „Abbrechen".
- **Expected:** Der Knopf zeigt weiter „Erst ab 7 Uhr".

**TC-F1-04: Gesendete Bestellung ist nur lesbar**

- **Setup:** Metzger-Bestellung mit Status „gesendet", keine Korrektur offen.
- **Action:** Hinweis-Knopf antippen.
- **Expected:** Der Text ist zu sehen, es gibt keine Bearbeitungsleiste und
  keinen „Übernehmen"-Knopf.

**TC-F1-05: Leerer Text entfernt den Hinweis**

- **Setup:** Bestellung mit Hinweis.
- **Action:** Text vollständig löschen, „Übernehmen".
- **Expected:** Der Knopf heißt wieder „Hinweis hinzufügen"; auf dem Formular
  erscheint kein Hinweisblock.

### F2: Erlaubte Auszeichnungen und Bereinigung

#### F2 Description

Der Textgestalter bietet **fett, kursiv, unterstrichen, Aufzählung** und
Absätze. Der Server nimmt nur diese an und entfernt alles andere, gleich woher es
kommt (eingefügter Text aus einer Webseite, aus Word, aus einer E-Mail).

#### F2 Inputs

| Input | Required | Description |
| --- | --- | --- |
| `notiz.html` | Nein | Wird serverseitig auf `<b> <strong> <i> <em> <u> <ul> <li> <br> <p>` reduziert; alle Eigenschaften (`style`, `class`, `on…`, `href`) entfallen |

#### F2 Behaviour / Acceptance

- Erlaubt sind genau die oben genannten Elemente, jeweils **ohne** Eigenschaften.
- Alles andere wird entfernt, der enthaltene **Text bleibt erhalten**. Aus
  `<a href="…">Bäcker</a>` wird `Bäcker`.
- `<script>`, `<style>` und deren Inhalt werden **vollständig** entfernt.
- Reiner Text über 1 000 Zeichen wird abgeschnitten; der Kiosk lässt es gar nicht
  erst so weit kommen.
- Der Kiosk fügt eingefügten Text grundsätzlich **ohne** Gestaltung ein.

#### F2 Test Cases

**TC-F2-01: Erlaubte Auszeichnungen überleben**

- **Setup:** —
- **Action:** `<p>Bitte <b>früh</b> liefern</p><ul><li>Semmeln</li></ul>`
  speichern und wieder lesen.
- **Expected:** Unverändert zurück.

**TC-F2-02: Script wird samt Inhalt entfernt**

- **Action:** `Hallo<script>alert(1)</script>` speichern.
- **Expected:** Gespeichert ist `Hallo`; das Wort `script` kommt nicht vor.

**TC-F2-03: Eigenschaften entfallen**

- **Action:** `<b style="color:red" onclick="x()">Achtung</b>` speichern.
- **Expected:** Gespeichert ist `<b>Achtung</b>`.

**TC-F2-04: Verweis wird zu reinem Text**

- **Action:** `Siehe <a href="http://x.de">hier</a>` speichern.
- **Expected:** Gespeichert ist `Siehe hier`.

**TC-F2-05: Länge wird begrenzt**

- **Action:** 1 200 Zeichen reinen Text speichern.
- **Expected:** Der gespeicherte Text ist 1 000 Zeichen lang.

**TC-F2-06: Einfügen bringt keine fremde Gestaltung mit**

- **Setup:** Dialog offen.
- **Action:** Text mit fremder Gestaltung einfügen.
- **Expected:** Im Feld steht reiner Text.

### F3: Freitext auf dem Bestellformular (PDF)

#### F3 Description

Ist ein Freitext erfasst, erscheint er auf dem Bestellformular in einem eigenen,
umrandeten Block mit der Überschrift **„Hinweis vom Dorfladen"** — beim Metzger
über der Tabelle, beim Bäcker darunter (Entscheidung 3).

#### F3 Inputs

| Input | Required | Description |
| --- | --- | --- |
| `notiz` der Bestellung | Nein | Fehlt sie oder ist sie leer, entsteht kein Block |

#### F3 Behaviour / Acceptance

- Fett, kursiv und unterstrichen werden im PDF als solche gesetzt.
- Eine Aufzählung erscheint mit vorangestelltem Strich, eine Zeile je Punkt.
- Langer Text bricht um und läuft nötigenfalls auf die nächste Seite; er wird
  **nicht** abgeschnitten.
- Zeichen außerhalb von Latin-1 dürfen den Versand **nicht** scheitern lassen;
  es gilt dieselbe Ersetzung wie für den übrigen Formularinhalt.
- Ohne Freitext sieht das Formular exakt aus wie bisher.

#### F3 Test Cases

**TC-F3-01: Block erscheint mit Text**

- **Setup:** Metzger-Bestellung mit Hinweis „Bitte früh liefern".
- **Action:** Formular erzeugen.
- **Expected:** Das PDF enthält „Hinweis vom Dorfladen" und „Bitte früh liefern".

**TC-F3-02: Ohne Text kein Block**

- **Setup:** Bestellung ohne Hinweis.
- **Expected:** Das PDF enthält „Hinweis vom Dorfladen" nicht.

**TC-F3-03: Aufzählung wird zu Strichpunkten**

- **Setup:** Hinweis `<ul><li>Semmeln</li><li>Brezen</li></ul>`.
- **Expected:** Das PDF enthält beide Punkte in getrennten Zeilen.

**TC-F3-04: Langer Text bricht um statt abzuschneiden**

- **Setup:** Hinweis mit 1 000 Zeichen.
- **Expected:** Das PDF enthält die letzten Wörter des Hinweises.

**TC-F3-05: Sonderzeichen lassen den Versand nicht scheitern**

- **Setup:** Hinweis mit `–`, `„"`, `×`, `€` und einem Emoji.
- **Expected:** Das Formular entsteht ohne Ausnahme.

**TC-F3-06: Bäcker-Formular bleibt ohne Hinweis unverändert**

- **Setup:** Bäcker-Bestellung ohne Hinweis.
- **Expected:** Seitenaufbau und Spalten wie bisher.

### F4: Freitext im Word-Dokument der Bäckerei

#### F4 Description

Die Bäckerei Freundl bekommt ihr gewohntes `.docx`. Ist ein Freitext erfasst,
steht er dort **unter der Artikeltabelle** unter derselben Überschrift wie im
PDF, mit denselben Auszeichnungen.

#### F4 Inputs

| Input | Required | Description |
| --- | --- | --- |
| `notiz` der Bäcker-Bestellung | Nein | Fehlt sie, bleibt das Dokument unverändert |

#### F4 Behaviour / Acceptance

- Fett, kursiv und unterstrichen werden als Word-Auszeichnung gesetzt, nicht als
  sichtbare Zeichen.
- Eine Aufzählung erscheint als eine Zeile je Punkt mit vorangestelltem Strich.
- Ohne Freitext ist das Dokument wie bisher.
- Das erzeugte Dokument bleibt gültig und in Word ohne Reparaturhinweis zu
  öffnen.

#### F4 Test Cases

**TC-F4-01: Hinweis steht im Dokument**

- **Setup:** Bäcker-Bestellung mit Hinweis „Bitte <b>früh</b> liefern".
- **Expected:** Das `.docx` enthält den Text; „früh" liegt in einem fett
  ausgezeichneten Textlauf.

**TC-F4-02: Ohne Hinweis unverändert**

- **Setup:** Bestellung ohne Hinweis.
- **Expected:** Das Dokument enthält die Überschrift nicht.

**TC-F4-03: Dokument bleibt gültig**

- **Setup:** Hinweis mit `<`, `>`, `&` und Umlauten.
- **Expected:** Das `.docx` lässt sich als ZIP öffnen, das Dokument-XML ist
  wohlgeformt.

### F5: Der Freitext gehört zur Bestellung

#### F5 Description

Der Freitext wird wie jede andere Angabe der Bestellung behandelt: gespeichert,
gesendet, korrigiert.

#### F5 Behaviour / Acceptance

- „Übernehmen" markiert die Bestellung als geändert; das stille Sichern der
  Bestellung nimmt den Text mit.
- Nach dem Neuladen des Kiosks steht der Text noch da.
- Beim Senden geht der Text mit ins Formular und in die Mail.
- Eine Korrektur, die **nur** den Freitext ändert, gilt als Änderung und lässt
  sich senden.
- Der Freitext einer Bestellung wirkt sich **nicht** auf andere Liefertage oder
  die andere Bäckerei aus.

#### F5 Test Cases

**TC-F5-01: Text übersteht das Neuladen**

- **Action:** Hinweis erfassen, Seite neu laden.
- **Expected:** Der Knopf zeigt den Hinweis weiterhin.

**TC-F5-02: Nur der Freitext geändert gilt als Korrektur**

- **Setup:** Gesendete Metzger-Bestellung, Korrektur geöffnet.
- **Action:** Nur den Hinweis ändern.
- **Expected:** Der Knopf „Korrektur senden" ist bedienbar.

**TC-F5-03: Der Text bleibt bei seinem Tag**

- **Setup:** Hinweis am Liefertag A.
- **Action:** Auf Liefertag B wechseln.
- **Expected:** Dort steht „Hinweis hinzufügen".

**TC-F5-04: Der Text bleibt bei seiner Bäckerei**

- **Setup:** Zwei Bäckereien, Hinweis bei der ersten.
- **Action:** Zur zweiten wechseln.
- **Expected:** Dort steht „Hinweis hinzufügen".

### F6: Bedienbarkeit

#### F6 Description

Der Dialog und der Knopf halten dieselben Regeln ein wie der übrige Kiosk.

#### F6 Behaviour / Acceptance

- Auf Handy (375×667), iPad mini (768×1024) und Rechner (1280×800): kein
  waagerechter Rollstreifen, kein abgeschnittener Text, nichts überdeckt.
- Alle Bedienelemente im Dialog sind mindestens 44 px hoch.
- Der Textgestalter ist auf dem Handy mindestens vier Zeilen hoch und wächst
  nicht über den Bildschirm hinaus.
- Meldungen sind in verständlichem Deutsch, ohne technische Angaben; kein
  `alert()`/`confirm()`.
- Die Bearbeitungsleiste erklärt sich über Beschriftungen, nicht nur über
  Sinnbilder.

#### F6 Test Cases

**TC-F6-01: Dialog passt auf alle drei Größen**

- **Action:** Dialog auf jeder der drei Größen öffnen.
- **Expected:** Kein waagerechter Rollstreifen, Dialog vollständig sichtbar.

**TC-F6-02: Bedienelemente groß genug**

- **Expected:** Jeder Knopf im Dialog ist mindestens 44 px hoch.

**TC-F6-03: Rest-Vorrat wird angezeigt**

- **Action:** 990 Zeichen eingeben.
- **Expected:** Die Anzeige nennt die verbleibenden Zeichen und lässt nach 1 000
  keine weitere Eingabe zu.

## Data & Contracts

**Speicher.** Beide Bestellungen liegen als JSON im generischen Speicher
`dl_seiteninhalts` (Bäcker: `baecker_order_<bk>_JJJJ-MM-TT`, Metzger:
`metzger_order_JJJJ-MM-TT`). Der Freitext kommt als neues Feld der Bestellung
hinzu — **keine** Schema-Änderung, **keine** Migration:

```jsonc
{
  "datum": "2026-09-10",
  "positionen": [ /* … */ ],
  "notiz": {
    "html": "<p>Bitte <b>früh</b> liefern</p>",
    "text": "Bitte früh liefern"
  }
}
```

Fehlt `notiz`, gilt die Bestellung als ohne Freitext. Bestehende Bestellungen
sind damit unverändert gültig.

**API.** Keine neuen Endpunkte. `notiz` reist im Rumpf der bestehenden Aufrufe
mit:

| Endpunkt | Rolle |
| --- | --- |
| `POST /api/metzger-order/{datum}/speichern` | nimmt `notiz` entgegen, bereinigt sie |
| `POST /api/metzger-order/{datum}/senden` | druckt sie ins Formular und in die Mail |
| `POST /api/metzger-order/{datum}/korrektur` | dasselbe für die Korrektur |
| `GET /api/metzger-order/{datum}` | liefert `notiz` mit |
| `GET /api/metzger-order/{datum}/dokument` | Formular mit Hinweisblock |
| die entsprechenden Routen unter `/api/baecker-order/` | ebenso, zusätzlich `.docx` |

**Bereinigung.** Ein gemeinsamer Helfer unter [api/shared](../../api/shared)
reduziert das HTML auf `<b> <strong> <i> <em> <u> <ul> <li> <br> <p>` ohne
Eigenschaften, entfernt `<script>`/`<style>` samt Inhalt und begrenzt den reinen
Text auf 1 000 Zeichen. Er wird von beiden Bestell-APIs genutzt.

## Open Questions

Keine offenen Punkte. Die Fragen, die sich beim Schreiben ergaben, sind unter
„Decisions" beantwortet; sie sind bewusst so gewählt, dass sie sich später ohne
Datenumbau ändern lassen.

## Traceability

| Requirement | Test Cases | Plan section | Tasks |
| --- | --- | --- | --- |
| F1 Freitext erfassen | TC-F1-01 … TC-F1-05 (`tests/kiosk-notiz.spec.js`) | Kiosk: ein Textgestalter | T030–T034 |
| F2 Auszeichnungen und Bereinigung | TC-F2-01 … TC-F2-05 (`tests/test_richtext.py`), TC-F2-06 (`tests/kiosk-notiz.spec.js`) | Bereinigung: Positivliste | T001–T003 |
| F3 Formular (PDF) | TC-F3-01 … TC-F3-06 (`tests/test_notiz_dokumente.py`) | Einmal zerlegt, viermal gesetzt | T010–T013 |
| F4 Word-Dokument | TC-F4-01 … TC-F4-03 (`tests/test_notiz_dokumente.py`) | ebenda | T014 |
| F5 Teil der Bestellung | TC-F5-01, TC-F5-02 (`tests/kiosk-notiz.spec.js`) | Vorgehen Schritt 4 und 6 | T020–T022 |
| F6 Bedienbarkeit | TC-F6-01 … TC-F6-03 (`tests/kiosk-notiz.spec.js`) | Kiosk: ein Textgestalter | T031, T041 |

TC-F5-03 und TC-F5-04 (Trennung nach Liefertag und Bäckerei) ergeben sich
unmittelbar aus dem Speicherschlüssel — jede Bestellung ist ein eigener
Datensatz. Sie sind durch TC-F5-01 mit abgedeckt und haben keinen eigenen Test.
