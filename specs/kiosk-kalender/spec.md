# Kiosk-Kalender — Specification

> Spec-driven development. Every requirement carries explicit test cases.
> Ein Spec mit offenen `[NEEDS CLARIFICATION]`-Markern darf NICHT nach `/sdd-plan`.

**Status:** Ready for Plan

**Owner:** {offen — Projektverantwortliche/r}

**Last updated:** 2026-07-21

## Overview

Die Verkäuferinnen im Dorfladen führen bisher einen **Papierkalender**, in dem
sie erfassen, was zu bestimmten Zeiten zu erledigen ist bzw. was Kunden
reservieren oder vorbestellen. Dieser Kalender soll **digital und zentral**
abgelöst werden, damit alle Verkäuferinnen jederzeit denselben Stand sehen.

Dieses Feature ergänzt eine neue **Kalender-Ansicht im Kiosk**
([static-site/kiosk.html](../../static-site/kiosk.html)) sowie einen neuen
Azure-Functions-Endpunkt `api/kalender/` (Python, Dataverse-Persistenz analog
zu `api/wochenplan/` und `api/stammkunden/`). Einträge lassen sich **schnell
erfassen**, sind wahlweise **ganztägig oder mit Uhrzeit**, können **optional mit
einem Stammkunden verknüpft** werden, unterstützen **wiederkehrende
Tätigkeiten** und lassen sich **als erledigt kennzeichnen** (Historie bleibt
erhalten).

Der Kalender ist nur für angemeldete Mitarbeiterinnen sichtbar/bearbeitbar
(hinter dem bestehenden CMS-/Admin-Login, serverseitig via
[api/shared/auth.py](../../api/shared/auth.py) geschützt).

Zielplattform: Azure Static Web App, statisches Frontend (Vanilla-JS,
`static-site/`), API als Azure Functions (Python v1, `api/`), Dataverse als
Datenspeicher. Referenz-Mockup: [mockups/kiosk-kalender-mockup.html](../../mockups/kiosk-kalender-mockup.html).

## Goals

- Zentrale, für alle Verkäuferinnen **gemeinsam sichtbare** Kalender-Ansicht im
  Kiosk — alle sehen jederzeit denselben Stand.
- **Schnelle Erfassung** eines Eintrags in einer Zeile (Titel + optional Uhrzeit).
- Einträge wahlweise **ganztägig** oder **mit Uhrzeit**.
- **Optionale Kundenverknüpfung** gegen bestehende Stammkunden (+ Freitext-Fallback).
- **Wiederkehrende Tätigkeiten** (täglich / wöchentlich / 14-tägig / monatlich).
- **Erledigt-Kennzeichnung** je Eintrag; erledigte Einträge bleiben als Historie
  erhalten (kein Hard-Delete beim Abhaken).
- **Tagesansicht** (Standard: heute) mit **Wochennavigation**.
- Konform zur Konstitution: serverseitige Auth, responsive (Mobile/iPad/Desktop),
  benutzerfreundliche Meldungen, automatisierte Playwright-Tests.

## Non-Goals

- **Kein** öffentlicher Zugriff — der Kalender ist rein intern (hinter Login).
- Kein vollständiges Rechte-/Rollensystem pro Nutzerin (gemeinsamer Admin-Login
  genügt, wie beim bestehenden CMS).
- Keine Erinnerungen/Push-Benachrichtigungen, keine E-Mail-Versendung
  (späterer Backlog-Punkt).
- Keine Synchronisation mit externen Kalendern (Google/Outlook/iCal-Export).
- Keine Mehrbenutzer-Echtzeit-Kollaboration mit Konfliktauflösung; ein einfacher
  **Auto-Refresh** (Polling) genügt für „alle sehen denselben Stand".
- Keine komplexen Wiederholungsregeln (z. B. „jeden 2. Dienstag", Ausnahmen,
  Enddatum-Serienbearbeitung) über die vier festen Intervalle hinaus.
- Keine Monats-/Kalenderraster-Ansicht (nur Tagesansicht mit Wochennavigation).

## Decisions (aufgelöste Klärungen)

1. **Sichtbarkeit/Auth:** Nur intern, hinter CMS-/Admin-Login. Schreibende
   Endpunkte serverseitig via `admin_auth_guard` (`X-CMS-Auth`) geschützt;
   Lesen ebenfalls auth-pflichtig (kein öffentlicher GET).
2. **Kundenverknüpfung:** Lookup auf Stammkunden (`dl_stammkundes`) **plus**
   Freitext-Fallback, wenn kein Stammkunde passt.
3. **Ansicht:** Tagesansicht mit „Heute" als Standard, Wochennavigation (‹ ›)
   und Tages-Pills Mo–So.
4. **Uhrzeit optional:** Flag `ganztags`. Ganztägige Einträge werden oben als
   eigene Gruppe geführt, terminierte darunter chronologisch sortiert.
5. **Erledigt:** Soft-Status (`status = erledigt` + `erledigt_am`), kein
   Hard-Delete beim Abhaken. Erledigte sind standardmäßig ausgeblendet, per
   Umschalter einblendbar.
6. **Wiederkehrend:** Feste Intervalle `daily` / `weekly` / `biweekly` /
   `monthly`. Ein wiederkehrender Eintrag wird **einmal** gespeichert und für
   die angezeigten Tage **berechnet expandiert** (keine Vorab-Materialisierung
   vieler Einzelsätze).
7. **Erledigt bei Serien:** Das Abhaken einer wiederkehrenden Tätigkeit gilt nur
   für **das jeweilige Datum** (eine Ausnahme/Override pro Vorkommen), nicht für
   die ganze Serie.
8. **Kategorien:** Feste Auswahl `aufgabe` / `reservierung` / `vorbestellung` /
   `lieferung` mit Farbcodierung.

## Requirements

<!-- markdownlint-disable MD024 -->

### F1: Eintrag schnell erfassen

#### F1 Description

Im Kiosk-Kalender gibt es eine Schnellerfassungszeile. Mit Titel + optionaler
Uhrzeit (Toggle „Ganztags" / „Uhrzeit") und optional Kategorie, Kunde und
Wiederholung wird per Klick (oder Enter im Titelfeld) ein Eintrag angelegt. Der
Eintrag wird über `POST /api/kalender` gespeichert und erscheint danach sofort
in der Liste des gewählten Tages.

#### F1 Inputs

| Input | Required | Description |
| --- | --- | --- |
| `titel` | Ja | Kurztext, was zu tun ist / reserviert/vorbestellt wird |
| `datum` | Ja | Tag des Eintrags (Vorbelegung: aktuell gewählter Tag) |
| `ganztags` | Ja | Boolean. `true` = ganztägig; `false` = mit Uhrzeit |
| `uhrzeit` | Nein | Pflicht **nur** wenn `ganztags = false` (Format `HH:MM`) |
| `kategorie` | Ja | `aufgabe` \| `reservierung` \| `vorbestellung` \| `lieferung` (Default `aufgabe`) |
| `kunde_id` | Nein | Lookup auf `dl_stammkundes` (siehe F4) |
| `kunde_freitext` | Nein | Freitext-Kundenname, wenn kein Stammkunde gewählt |
| `wiederholung` | Nein | leer \| `daily` \| `weekly` \| `biweekly` \| `monthly` |
| `notiz` | Nein | Zusatzdetails (mehrzeilig) |

#### F1 Behaviour / Acceptance

- Given das Titelfeld ist leer, When „Hinzufügen"/Enter, Then wird **nicht**
  gespeichert und der Fokus bleibt im Titelfeld (kein technischer Fehler).
- Given `ganztags = false` und keine `uhrzeit`, Then wird eine
  benutzerfreundliche Hinweismeldung gezeigt (Konstitution §6) und nicht
  gespeichert.
- Given gültige Eingaben, When `POST /api/kalender` `201/200` liefert, Then
  erscheint der Eintrag sofort in der Liste des `datum`-Tages und ein kurzer
  Erfolgs-Toast; die Erfassungszeile wird geleert.
- Ganztägige Einträge erscheinen in der Gruppe „Ganztägig", terminierte in
  „Mit Uhrzeit", chronologisch nach `uhrzeit` sortiert.

#### F1 Test Cases

**TC-F1-01: Ganztägigen Eintrag anlegen**

- **Setup:** Kiosk-Kalender geöffnet, Tag = heute, eingeloggt.
- **Action:** Titel „Wochenware bestellen" eingeben, Toggle „Ganztags", „Hinzufügen".
- **Expected:** Eintrag erscheint unter „Ganztägig" beim heutigen Tag; POST-Body
  enthält `ganztags:true`, kein `uhrzeit`; Erfolgs-Toast; Titelfeld leer.

**TC-F1-02: Terminierten Eintrag anlegen**

- **Setup:** wie oben.
- **Action:** Titel „Blumenstrauß abholbereit", Toggle „Uhrzeit", `11:00`, „Hinzufügen".
- **Expected:** Eintrag erscheint unter „Mit Uhrzeit" mit `11:00`; POST-Body
  enthält `ganztags:false`, `uhrzeit:"11:00"`.

**TC-F1-03: Leerer Titel wird abgewiesen**

- **Setup:** wie oben.
- **Action:** „Hinzufügen" ohne Titel.
- **Expected:** Kein POST; Fokus im Titelfeld; keine `alert()`/kein technischer Fehler.

**TC-F1-04: Uhrzeit-Modus ohne Uhrzeit**

- **Setup:** Toggle „Uhrzeit", Uhrzeit geleert, Titel gesetzt.
- **Action:** „Hinzufügen".
- **Expected:** Benutzerfreundlicher Hinweis; kein POST.

### F2: Ganztägig vs. Uhrzeit anzeigen und gruppieren

#### F2 Description

Die Tagesliste trennt ganztägige Einträge (oben, Gruppe „Ganztägig") von
terminierten (Gruppe „Mit Uhrzeit"), sortiert terminierte aufsteigend nach
Uhrzeit. Ganztägige Einträge zeigen das Label „Ganztags" statt einer Uhrzeit.

#### F2 Inputs

| Input | Required | Description |
| --- | --- | --- |
| Einträge des Tages | — | aus `GET /api/kalender?datum=…` bzw. Wochenbereich |

#### F2 Behaviour / Acceptance

- Given ein Tag mit ganztägigen und terminierten Einträgen, Then erscheint
  zuerst „Ganztägig" (mit Anzahl), dann „Mit Uhrzeit" (chronologisch).
- Given ein Tag ohne Einträge, Then erscheint ein freundlicher Leerzustand mit
  Hinweis auf die Schnellerfassung.

#### F2 Test Cases

**TC-F2-01: Gruppierung und Sortierung**

- **Setup:** Tag mit 2 ganztägigen + 3 terminierten Einträgen (`08:30`, `10:00`, `14:30`).
- **Action:** Tag öffnen.
- **Expected:** Reihenfolge: Gruppe „Ganztägig" (2), dann „Mit Uhrzeit"
  `08:30 → 10:00 → 14:30`.

**TC-F2-02: Leerer Tag**

- **Setup:** Tag ohne Einträge.
- **Action:** Tag öffnen.
- **Expected:** Freundlicher Leerzustand-Text, keine Fehlermeldung.

### F3: Erledigt-Kennzeichnung (Soft-Status)

#### F3 Description

Jeder Eintrag hat eine Abhak-Checkbox. Abhaken setzt `status = erledigt` und
`erledigt_am`; erneutes Klicken macht es rückgängig (`status = offen`). Erledigte
Einträge werden durchgestrichen/ausgegraut, bleiben aber als Historie erhalten
(kein Löschen). Standardmäßig sind erledigte Einträge ausgeblendet; ein
Umschalter „Erledigte zeigen/ausblenden" blendet sie ein.

#### F3 Inputs

| Input | Required | Description |
| --- | --- | --- |
| `id` | Ja | Eintrags-ID (bzw. `serien_id` + `datum` bei Serien, siehe F5) |
| `status` | Ja | `offen` \| `erledigt` |

#### F3 Behaviour / Acceptance

- Given ein offener Eintrag, When Checkbox geklickt, Then `PATCH/POST` setzt
  `status=erledigt` + `erledigt_am`; der Eintrag wird durchgestrichen dargestellt
  und bei ausgeblendeten Erledigten aus der Liste entfernt.
- Given ein erledigter Eintrag, When erneut geklickt, Then `status=offen`,
  `erledigt_am` geleert; normale Darstellung.
- Der Umschalter „Erledigte zeigen" blendet erledigte Einträge ein/aus, ohne
  sie zu löschen.

#### F3 Test Cases

**TC-F3-01: Eintrag abhaken**

- **Setup:** offener Eintrag „Kasse abrechnen".
- **Action:** Checkbox klicken.
- **Expected:** Request mit `status=erledigt`; Eintrag durchgestrichen; bei
  ausgeblendeten Erledigten verschwindet er aus der Liste (bleibt aber gespeichert).

**TC-F3-02: Erledigt rückgängig**

- **Setup:** erledigter Eintrag, „Erledigte zeigen" aktiv.
- **Action:** Checkbox erneut klicken.
- **Expected:** `status=offen`; normale Darstellung.

**TC-F3-03: Erledigte ein-/ausblenden**

- **Setup:** Tag mit 1 erledigten + 3 offenen Einträgen.
- **Action:** „Erledigte zeigen" umschalten.
- **Expected:** erledigter Eintrag erscheint/verschwindet; offene bleiben unverändert.

### F4: Optionale Kundenverknüpfung

#### F4 Description

Bei der Erfassung kann optional ein Kunde verknüpft werden. Ein
Autocomplete-Feld sucht gegen die bestehenden Stammkunden
(`api/stammkunden/`). Wird ein Treffer gewählt, wird `kunde_id` (Lookup auf
`dl_stammkundes`) gesetzt. Wird kein Treffer gewählt, aber Text eingegeben, wird
dieser als `kunde_freitext` gespeichert. Ein verknüpfter Stammkunde wird als
klickbares Badge dargestellt (öffnet Kundendetails).

#### F4 Inputs

| Input | Required | Description |
| --- | --- | --- |
| Suchtext | Nein | Freitext im Kundenfeld |
| `kunde_id` | Nein | gesetzt bei Auswahl eines Stammkunden |
| `kunde_freitext` | Nein | gesetzt, wenn kein Stammkunde gewählt |

#### F4 Behaviour / Acceptance

- Given Eingabe im Kundenfeld, Then werden passende Stammkunden vorgeschlagen.
- Given Auswahl eines Vorschlags, Then wird `kunde_id` gesetzt und der Eintrag
  zeigt ein klickbares Kunden-Badge.
- Given Freitext ohne Auswahl, Then wird `kunde_freitext` gespeichert (Badge ohne
  Verlinkung).
- Given kein Kundeneintrag, Then wird der Eintrag ohne Kunde gespeichert.

#### F4 Test Cases

**TC-F4-01: Stammkunde verknüpfen**

- **Setup:** Stammkunde „Familie Huber" existiert.
- **Action:** „Hub" tippen, Vorschlag „Familie Huber" wählen, Eintrag anlegen.
- **Expected:** POST-Body enthält `kunde_id` von „Familie Huber"; Eintrag zeigt
  klickbares Badge „Familie Huber".

**TC-F4-02: Kunde als Freitext**

- **Setup:** kein passender Stammkunde.
- **Action:** „Laufkundschaft Meier" eingeben, Eintrag anlegen.
- **Expected:** POST-Body enthält `kunde_freitext:"Laufkundschaft Meier"`, kein
  `kunde_id`; Badge ohne Verlinkung.

**TC-F4-03: Ohne Kunde**

- **Setup:** Kundenfeld leer.
- **Action:** Eintrag anlegen.
- **Expected:** weder `kunde_id` noch `kunde_freitext` gesetzt; kein Kunden-Badge.

### F5: Wiederkehrende Tätigkeiten

#### F5 Description

Bei der Erfassung kann eine Wiederholung gewählt werden
(`daily`/`weekly`/`biweekly`/`monthly`). Ein wiederkehrender Eintrag wird
**einmal** gespeichert (`wiederholung` + Startdatum) und für die angezeigten Tage
**berechnet expandiert** — an jedem passenden Termin erscheint ein Vorkommen mit
einem `↻`-Badge. Das Abhaken eines Vorkommens erzeugt eine **datumsbezogene
Ausnahme** (Override), ohne die Serie zu verändern; ebenso das Löschen eines
einzelnen Vorkommens.

#### F5 Inputs

| Input | Required | Description |
| --- | --- | --- |
| `wiederholung` | Nein | leer \| `daily` \| `weekly` \| `biweekly` \| `monthly` |
| `startdatum` | Ja (bei Serie) | Ankerdatum der Serie |
| Override `datum` | — | Datum eines einzelnen Vorkommens (für Erledigt/Löschen) |

#### F5 Behaviour / Acceptance

- Given eine wöchentliche Serie ab Di, When die Woche angezeigt wird, Then
  erscheint an jedem Dienstag ein Vorkommen mit `↻ wöchentlich`-Badge.
- Given ein Vorkommen wird abgehakt, Then gilt der Erledigt-Status nur für dieses
  Datum; andere Vorkommen bleiben offen.
- Given ein einzelnes Vorkommen wird gelöscht, Then bleibt die Serie an anderen
  Terminen bestehen (Ausnahme nur für dieses Datum).
- `biweekly` = jede zweite Woche relativ zum `startdatum`; `monthly` = gleicher
  Tag des Monats (fällt der Tag im Monat aus, gilt der letzte Tag des Monats).

#### F5 Test Cases

**TC-F5-01: Wöchentliche Serie erscheint an jedem Termin**

- **Setup:** Serie „Kühltheke reinigen", `weekly`, Start Di der aktuellen Woche.
- **Action:** aktuelle und nächste Woche ansehen.
- **Expected:** je ein Vorkommen an beiden Dienstagen mit `↻ wöchentlich`-Badge.

**TC-F5-02: Erledigt gilt nur pro Vorkommen**

- **Setup:** tägliche Serie „Kasse abrechnen".
- **Action:** Vorkommen von heute abhaken, morgen ansehen.
- **Expected:** heute erledigt (durchgestrichen), morgen weiterhin offen.

**TC-F5-03: 14-tägig überspringt Zwischenwoche**

- **Setup:** Serie `biweekly`, Start in KW A.
- **Action:** KW A, KW A+1, KW A+2 ansehen.
- **Expected:** Vorkommen in KW A und KW A+2, **nicht** in KW A+1.

**TC-F5-04: Einzelnes Vorkommen löschen lässt Serie bestehen**

- **Setup:** wöchentliche Serie.
- **Action:** ein Vorkommen löschen, Folgewoche ansehen.
- **Expected:** gelöschtes Datum ohne Vorkommen; Folgewoche zeigt Vorkommen.

### F6: Tagesansicht mit Wochennavigation

#### F6 Description

Der Kalender öffnet in der Tagesansicht mit „heute" vorausgewählt. Tages-Pills
(Mo–So) zeigen die aktuelle Woche; Pills mit Einträgen tragen eine Markierung.
`‹`/`›` blättern wochenweise, „Heute" springt zurück auf den aktuellen Tag.
Beim Blättern werden die Einträge des jeweiligen Bereichs geladen.

#### F6 Inputs

| Input | Required | Description |
| --- | --- | --- |
| gewählter Tag | — | Default: heute |
| Wochen-Offset | — | über `‹`/`›`/„Heute" |

#### F6 Behaviour / Acceptance

- Given der Kalender wird geöffnet, Then ist der heutige Tag ausgewählt und
  dessen Einträge werden angezeigt.
- Given Klick auf `›`, Then wird die Folgewoche mit ihren Einträgen geladen.
- Given Klick auf „Heute", Then wird zurück auf den aktuellen Tag gewechselt.
- Tage mit Einträgen sind in der Pill-Leiste markiert.

#### F6 Test Cases

**TC-F6-01: Standard = heute**

- **Setup:** Kalender öffnen.
- **Action:** —.
- **Expected:** heutiger Tag aktiv; dessen Einträge sichtbar.

**TC-F6-02: Woche vor/zurück**

- **Setup:** Kalender offen.
- **Action:** `›` klicken.
- **Expected:** Folgewoche geladen; Pills/Datumsbereich aktualisiert; passende
  Einträge sichtbar.

**TC-F6-03: „Heute" springt zurück**

- **Setup:** in Folgewoche navigiert.
- **Action:** „Heute" klicken.
- **Expected:** aktueller Tag wieder aktiv und ausgewählt.

### F7: Serverseitige Auth & gemeinsamer Stand

#### F7 Description

Alle Kalender-Endpunkte (`GET/POST/PATCH/DELETE /api/kalender`) sind
serverseitig via `admin_auth_guard` (`X-CMS-Auth`) geschützt — kein
öffentlicher Zugriff. Die Kiosk-Ansicht aktualisiert sich per **Auto-Refresh**
(Polling in festem Intervall), damit alle Verkäuferinnen denselben Stand sehen.

#### F7 Inputs

| Input | Required | Description |
| --- | --- | --- |
| `X-CMS-Auth` | Ja | Admin-Token (wie bestehende CMS-Endpunkte) |
| Poll-Intervall | — | fester Wert (z. B. 30–60 s), Implementierungsdetail |

#### F7 Behaviour / Acceptance

- Given ein Request ohne/mit ungültigem Token, Then antwortet der Endpunkt
  `401` und die UI zeigt eine freundliche Hinweismeldung (kein roher Fehlertext).
- Given ein anderer Client hat einen Eintrag geändert, When das Poll-Intervall
  abläuft, Then zeigt die Ansicht den aktuellen Stand ohne manuelles Neuladen.

#### F7 Test Cases

**TC-F7-01: Schreiben ohne Token → 401**

- **Setup:** kein gültiges `X-CMS-Auth`.
- **Action:** `POST /api/kalender`.
- **Expected:** HTTP `401`; keine Speicherung.

**TC-F7-02: Auto-Refresh zeigt fremde Änderung**

- **Setup:** zwei Sitzungen; Sitzung B legt einen Eintrag für heute an.
- **Action:** in Sitzung A das Poll-Intervall abwarten (bzw. Refresh-Trigger).
- **Expected:** Sitzung A zeigt den neuen Eintrag ohne manuelles Neuladen.

### F8: Responsive & benutzerfreundlich

#### F8 Description

Die Kalender-Ansicht ist an drei Viewports korrekt nutzbar: Mobile (375×667),
iPad mini (768×1024), Desktop (1280×800). Keine Überläufe, kein horizontales
Scrollen, keine überlappenden Elemente. Alle Nutzermeldungen sind
benutzerfreundlich (Konstitution §6), keine nativen `alert()`/`confirm()`.

#### F8 Inputs

| Input | Required | Description |
| --- | --- | --- |
| Viewport | — | 375×667, 768×1024, 1280×800 |

#### F8 Behaviour / Acceptance

- An jedem der drei Viewports: Schnellerfassung, Tages-Pills, Filter und
  Einträge sind bedienbar, ohne Clipping/Overflow/Horizontalscroll.
- Bestätigungen/Fehler erscheinen als In-App-Toast/Dialog, nicht als
  `alert()`/`confirm()`.

#### F8 Test Cases

**TC-F8-01: Layout an drei Viewports**

- **Setup:** Kalender mit Beispieldaten.
- **Action:** je Viewport (375×667, 768×1024, 1280×800) rendern.
- **Expected:** kein horizontaler Scroll, kein Clipping/Overlap; Bedienelemente
  erreichbar.

**TC-F8-02: Keine nativen Dialoge**

- **Setup:** Aktionen, die Feedback erzeugen (Speichern-Fehler, leerer Titel).
- **Action:** auslösen.
- **Expected:** In-App-Toast/Dialog; kein `alert()`/`confirm()`; kein roher
  `Fehler: <exception>`-Text.

## Data & Contracts

### API `api/kalender/` (Azure Function, Python v1)

Alle Methoden erfordern gültiges `X-CMS-Auth` (via `admin_auth_guard`).

| Methode | Pfad | Zweck |
| --- | --- | --- |
| `GET` | `/api/kalender?von=YYYY-MM-DD&bis=YYYY-MM-DD` | Einträge im Bereich (inkl. expandierter Serien-Vorkommen) |
| `POST` | `/api/kalender` | Eintrag/Serie anlegen |
| `PATCH` | `/api/kalender/{id}` | Eintrag ändern (inkl. `status`) |
| `POST` | `/api/kalender/{serien_id}/override` | Vorkommen einer Serie erledigen/löschen (datumsbezogen) |
| `DELETE` | `/api/kalender/{id}` | Einzeleintrag löschen |

### Dataverse-Entität `dl_kalendereintrag`

| Feld | Typ | Zweck |
| --- | --- | --- |
| `dl_titel` | Text | Kurztext (Pflicht) |
| `dl_datum` | Date | Tag bzw. Serien-Startdatum (Pflicht) |
| `dl_ganztags` | Bool | ganztägig vs. Uhrzeit |
| `dl_uhrzeit` | Text `HH:MM` | nur wenn nicht ganztägig |
| `dl_kategorie` | Choice | `aufgabe`/`reservierung`/`vorbestellung`/`lieferung` |
| `dl_wiederholung` | Choice | leer/`daily`/`weekly`/`biweekly`/`monthly` |
| `dl_stammkunde` | Lookup → `dl_stammkundes` | optionale Kundenverknüpfung |
| `dl_kunde_freitext` | Text | Fallback-Kundenname |
| `dl_status` | Choice | `offen`/`erledigt` |
| `dl_erledigt_am` | DateTime | Zeitpunkt des Abhakens |
| `dl_notiz` | Multiline | Details |

### Serien-Ausnahmen (Override) `dl_kalender_override`

| Feld | Typ | Zweck |
| --- | --- | --- |
| `dl_serie` | Lookup → `dl_kalendereintrag` | betroffene Serie |
| `dl_datum` | Date | betroffenes Vorkommen |
| `dl_status` | Choice | `erledigt`/`geloescht` |
| `dl_erledigt_am` | DateTime | bei `erledigt` |

> Hinweis: Exakte Feld-Schemanamen und Choice-Werte sind im Plan aus dem
> bestehenden Dataverse-Muster (`dl_wochenplan`, `dl_stammkundes`) abzuleiten;
> die Struktur oben ist der fachliche Vertrag.

## Open Questions

- (keine offenen `[NEEDS CLARIFICATION]` — Spec ist plan-reif.)

## Traceability

| Requirement | Test Cases | Plan section | Tasks |
| --- | --- | --- | --- |
| F1 Erfassen | TC-F1-01, TC-F1-02, TC-F1-03, TC-F1-04 | — | — |
| F2 Ganztags/Uhrzeit | TC-F2-01, TC-F2-02 | — | — |
| F3 Erledigt | TC-F3-01, TC-F3-02, TC-F3-03 | — | — |
| F4 Kunde | TC-F4-01, TC-F4-02, TC-F4-03 | — | — |
| F5 Wiederkehrend | TC-F5-01, TC-F5-02, TC-F5-03, TC-F5-04 | — | — |
| F6 Tagesansicht | TC-F6-01, TC-F6-02, TC-F6-03 | — | — |
| F7 Auth/Refresh | TC-F7-01, TC-F7-02 | — | — |
| F8 Responsive | TC-F8-01, TC-F8-02 | — | — |
