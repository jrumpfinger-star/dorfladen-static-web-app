# Online-Hilfe für Kundinnen und Kunden — Specification

**Status:** Angenommen

**Owner:** Dorfladen Oberornau

**Last updated:** 2026-09-13

## Overview

Die Online-Hilfe (`static-site/handbuch/hilfe.html`, erreichbar über den
Knopf „Hilfe" und als Blatt über `hilfe-popup.js`) war inhaltlich überholt.

**Befund vor der Überarbeitung:**

| Prüfung | Ergebnis |
| --- | --- |
| Mittagstisch online bestellen | fehlte vollständig |
| Bestellstatus verfolgen | fehlte vollständig |
| Stornieren | fehlte vollständig |
| Fleisch- und Wurstbestellung | fehlte vollständig |
| Online-Einkauf | fehlte vollständig |
| Nachricht schreiben / Antwort | fehlte vollständig |
| TagesInfo | fehlte vollständig |
| Benachrichtigungen | als „Testphase … noch nicht im Live-Betrieb" beschrieben |
| Symbole | 340 Emoji-Zeichen, kein einziges SVG |
| Kiosk-Themen | drei Mitarbeiter-Themen in der Kundenhilfe |

Dazu ein Darstellungsfehler: Das Hilfe-Blatt war am Rechner nur rund 220 px
hoch, der Inhalt also abgeschnitten.

**Ursache der Veralterung.** Jedes Thema stand an **drei** Stellen: als Karte
im Raster, als aufklappbarer Abschnitt und noch einmal als Suchdatensatz.
Wer eine Stelle pflegte, vergaß die anderen. Deshalb wird die Seite jetzt aus
einer einzigen Themenliste erzeugt.

## Goals

- Jede Funktion, die ein Kunde auf der Website nutzen kann, ist erklärt.
- Keine Aussage widerspricht dem tatsächlichen Verhalten der Seite.
- Ein Thema wird an genau einer Stelle gepflegt.
- Wer ein Stichwort eingibt, findet die Antwort — auch ohne Umlaute
  getippt.
- Die Hilfe veraltet nicht erneut, wenn im CMS ein Wert geändert wird.

## Non-Goals

- Keine Anleitung für Mitarbeiterwerkzeuge (Kiosk, CMS, Shop-Verwaltung) —
  dafür gibt es `/help-workflows.html`.
- Keine Wiederholung der App-Installationsanleitung; die steht unter `/app`.
- Keine Änderung an der Funktion der Website selbst.

## Requirements

### F1: Alle Kundenfunktionen sind erklärt

#### F1 Description

Die Hilfe deckt jede Funktion ab, die ein Kunde auf der öffentlichen Website
nutzen kann.

#### F1 Behaviour / Acceptance

- Themen zu **Bestellen und abholen**: Mittagessen vorbestellen,
  Bestellstatus, Stornieren, Fleisch und Wurst, Online-Einkauf.
- Themen zu **Nachrichten**: Benachrichtigungsarten, Nachricht an den Laden.
- Themen zu **Was es heute gibt**: TagesInfo, Wochenplan, Angebote,
  Öffnungszeiten.
- Jedes Thema trägt Symbol, Frage, Kurztext, Antwort und Suchbegriffe.

#### F1 Test Cases

**TC-F1-01: Die zuvor fehlenden Themen sind vorhanden**

- **Expected:** Abschnitte mit den Kennungen `faq-mittag-bestellen`,
  `faq-bestellstatus`, `faq-storno`, `faq-fleisch`, `faq-shop`,
  `faq-kontakt`, `faq-tagesinfo` sind im HTML enthalten.

**TC-F1-02: Jedes Thema ist vollständig**

- **Expected:** Jeder `.faq` trägt Symbol, Frage, Kurztext und eine Antwort
  mit mindestens 120 Zeichen Text.

### F2: Keine veralteten Aussagen

#### F2 Description

Aussagen, die dem heutigen Verhalten widersprechen, dürfen nicht
vorkommen.

#### F2 Behaviour / Acceptance

- Das Wort „Testphase" kommt im Zusammenhang mit Benachrichtigungen nicht
  mehr vor; sie laufen produktiv.
- Alle **vier** Benachrichtigungsarten sind benannt (TagesInfo, News,
  Meine Bestellungen, Antwort auf meine Nachricht).
- Bei den beiden persönlichen Arten steht, dass nur der Betroffene sie
  erhält.

#### F2 Test Cases

**TC-F2-01: Kein Hinweis auf eine Testphase**

- **Expected:** Der Text enthält weder „Testphase" noch „noch nicht
  offiziell".

**TC-F2-02: Vier Benachrichtigungsarten**

- **Expected:** Der Abschnitt `faq-push` nennt alle vier Arten und enthält
  bei den persönlichen den Hinweis „nur an Sie".

### F3: Keine Werte, die sich ändern können

#### F3 Description

Bestellschluss, Liefertage und Rabattsatz werden im CMS eingestellt. Wer sie
in der Hilfe wiederholt, hat nach der nächsten Änderung eine falsche Hilfe —
genau das ist zuvor passiert. Die Hilfe sagt deshalb, **wo** der Wert steht.

#### F3 Behaviour / Acceptance

- Der Text nennt keine Uhrzeit als Bestellschluss und keinen Prozentsatz als
  Rabatt.
- Stattdessen wird auf die Anzeige auf der jeweiligen Bestellseite verwiesen.
- Ausgenommen ist die Abholzeit des Mittagessens; sie steht so auch in der
  Bestätigungsmail (`api/lunch-order`) und ist als Richtwert gekennzeichnet.

#### F3 Test Cases

**TC-F3-01: Kein fester Bestellschluss, kein fester Rabattsatz**

- **Expected:** In `faq-mittag-bestellen` und `faq-fleisch` steht keine
  Uhrzeit der Form `10:30` und kein Prozentwert.

### F4: Ein Thema, eine Stelle

#### F4 Description

Karte, Abschnitt und Suchdatensatz entstehen aus derselben Quelle
(`tools/hilfe_inhalt.py`), damit sie nicht auseinanderlaufen können.

#### F4 Behaviour / Acceptance

- Die Zahl der Abschnitte entspricht der Zahl der Suchdatensätze.
- Jede Kennung kommt in beiden vor.
- Übersicht und Antwort stehen an einer Stelle: Jeder Abschnitt trägt seinen
  Kurztext bereits im zugeklappten Zustand. Ein zusätzliches Kartenraster mit
  denselben Themen entfällt.

#### F4 Test Cases

**TC-F4-01: Abschnitte und Suchdaten stimmen überein**

- **Expected:** Die Kennungen aus dem Suchdatensatz und die Kennungen der
  `.faq`-Abschnitte sind dieselbe Menge.

**TC-F4-02: Keine doppelte Auflistung**

- **Expected:** Es gibt kein zweites Raster (`.hcard`), das dieselben Themen
  noch einmal führt.

### F5: Suchen mit und ohne Umlaute

#### F5 Description

Am Handy tippt kaum jemand Umlaute aus. Die Suche behandelt `ö`, `oe` und
`o` gleich.

#### F5 Behaviour / Acceptance

- „öffnungszeiten", „oeffnungszeiten" und „offnungszeiten" führen zum selben
  Ergebnis.
- Gesucht wird in Frage, Kurztext, Schlagwort und Suchbegriffen.
- Ohne Treffer erscheint ein Hinweis mit der Telefonnummer.

#### F5 Test Cases

**TC-F5-01: Drei Schreibweisen, ein Ergebnis**

- **Action:** Nacheinander die drei Schreibweisen eingeben.
- **Expected:** Jedes Mal erscheint `faq-oez` als Treffer.

**TC-F5-02: Ohne Treffer hilft die Telefonnummer weiter**

- **Action:** Ein Wort eingeben, das nicht vorkommt.
- **Expected:** Kein Treffer, aber die Telefonnummer ist sichtbar.

### F6: Keine Mitarbeiterthemen in der Kundenhilfe

#### F6 Description

Kalender, Serien und Tagesablauf betreffen die Verkäuferinnen. Sie standen
prominent unter „Beliebte Themen" und verwirrten dort.

#### F6 Behaviour / Acceptance

- Keine Themen mit der Kennung `faq-kiosk-*`.
- Am Ende steht ein dezenter Verweis auf `/help-workflows.html`.

#### F6 Test Cases

**TC-F6-01: Kiosk-Themen sind fort, der Verweis steht**

- **Expected:** Keine Kennung beginnt mit `faq-kiosk`; ein Verweis auf
  `help-workflows.html` ist vorhanden.

### F7: Symbole statt Emojis

#### F7 Description

Emojis sehen auf jedem Gerät anders aus, lassen sich nicht einfärben und
wirken abgenutzt. Die Hilfe verwendet Strichsymbole im Stil der Seite.

#### F7 Behaviour / Acceptance

- Kein Emoji-Zeichen im sichtbaren Text.
- Die Symbole liegen als `<symbol>`-Sammlung einmal in der Datei.

#### F7 Test Cases

**TC-F7-01: Keine Emojis, dafür Symbole**

- **Expected:** Der sichtbare Text enthält kein Zeichen aus den
  Emoji-Bereichen; es sind mindestens 20 `<svg class="ic">` vorhanden.

### F8: Das Hilfe-Blatt ist vollständig sichtbar

#### F8 Description

Das Blatt war am Rechner nur rund 220 px hoch: Der Rahmen hatte lediglich
eine Maximalhöhe, und ein Flex-Kind mit `flex:1` erbt daraus keine Höhe —
der eingebettete Rahmen fiel auf seine Standardhöhe von 150 px zurück.

#### F8 Behaviour / Acceptance

- Auf dem Rechner nimmt das Blatt den größten Teil der Fensterhöhe ein.
- Auf dem Telefon füllt es den Bildschirm.

#### F8 Test Cases

**TC-F8-01: Das Blatt füllt den Bildschirm**

- **Setup:** Startseite, `openHilfePopup()` aufrufen.
- **Expected:** Bei 1280×800 ist das Blatt höher als 600 px; der
  eingebettete Rahmen höher als 500 px.

**TC-F8-02: Ein Anker öffnet das passende Thema**

- **Action:** `openHilfePopup('faq-push')`.
- **Expected:** Der Abschnitt `faq-push` ist aufgeklappt.

## Data & Contracts

**Inhalt:** `tools/hilfe_inhalt.py` — `GRUPPEN` und `THEMEN`
(id, gruppe, sym, tag, titel, kurz, kw, text).

**Symbole:** `tools/hilfe_symbole.py` — Strichsymbole als `<symbol>`-Sammlung.

**Erzeugung:** `python tools/hilfe_bauen.py` schreibt
`static-site/handbuch/hilfe.html`.

**Aufruf von außen:** `openHilfePopup()` sowie `openHilfePopup('faq-push')`;
ebenso `/handbuch/hilfe.html#faq-push`.

**Belegte Kundenabläufe** (Grundlage der Texte):
`static-site/mittagstisch-bestellen.html`, `api/lunch-order/__init__.py`
(Bestellschluss aus CMS, Abholung 11:30–13:00, Storno nur bei
„Eingegangen"), `static-site/bestellstatus.html` (Status), 
`api/fleisch-order/__init__.py` (Liefertage und Bestellschluss aus CMS),
`static-site/js/kontakt.js` (Name Pflicht), `static-site/tagesinfo.html`.

## Open Questions

Keine.

## Traceability

| Requirement | Test Cases | Tasks |
| --- | --- | --- |
| F1 | TC-F1-01, TC-F1-02 | Inhalt |
| F2 | TC-F2-01, TC-F2-02 | Inhalt |
| F3 | TC-F3-01 | Inhalt |
| F4 | TC-F4-01, TC-F4-02 | Generator |
| F5 | TC-F5-01, TC-F5-02 | Suche |
| F6 | TC-F6-01 | Inhalt |
| F7 | TC-F7-01 | Symbole |
| F8 | TC-F8-01, TC-F8-02 | Popup |
