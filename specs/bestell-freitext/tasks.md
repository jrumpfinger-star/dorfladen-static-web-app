# Bestell-Freitext für Bäcker und Metzger — Tasks

> Aus [plan.md](./plan.md) abgeleitet. Geordnete, prüfbare Arbeitsschritte.
> `[P]` heißt: ohne gemeinsame Dateien, kann parallel laufen.

**Spec:** [spec.md](./spec.md) · **Plan:** [plan.md](./plan.md)

## Conventions

- Von oben nach unten abarbeiten, außer bei `[P]`.
- Eine Aufgabe ist erst erledigt, wenn ihre Testfälle bestehen.
- Nach jeder Änderung an `static-site/kiosk-klassisch.html`:
  `node tools/build-kiosk-neu.js`.

## Fundament — Text zerlegen und bereinigen

- [x] T001 `api/shared/richtext.py` anlegen: `bereinige(html)` als Positivliste
  über `html.parser`, `als_text(html)`, `als_bloecke(html)` — dient `F2`
- [x] T002 Längenbegrenzung 1 000 Zeichen reiner Text in `bereinige()` —
  `TC-F2-05`
- [x] T003 `tests/api/test_richtext.py`: Bereinigung und Zerlegung —
  `TC-F2-01` … `TC-F2-05`

## Der Hinweis im Formular

- [x] T010 `api/shared/pdf_notiz.py`: Hinweisblock in ein `fpdf2`-Dokument
  setzen (Überschrift, Rahmen, Auszeichnungen, Aufzählung, Umbruch, Latin-1) —
  dient `F3`
- [x] T011 `metzger_pdf.build_pdf(..., notiz=None)`: Block **über** der Tabelle
  — `TC-F3-01`, `TC-F3-02`, `TC-F3-03`
- [x] T012 [P] `formular_pdf.build_formular(..., notiz=None)`: Block **unter**
  der Tabelle — `TC-F3-06`
- [x] T013 [P] `pdf_fill.build_pdf(..., notiz=None)`: Block **unter** der
  Tabelle — `TC-F3-01`
- [x] T014 `api/baecker-order/notiz_docx.py` + `docx_fill.fill_form(...,
  notiz=None)`: Absätze mit fett/kursiv/unterstrichen ans Dokumentende —
  `TC-F4-01`, `TC-F4-02`, `TC-F4-03`
- [x] T015 `tests/api/test_notiz_dokumente.py`: PDF-Text und `.docx`-XML prüfen
  — `TC-F3-01` … `TC-F3-06`, `TC-F4-01` … `TC-F4-03`

## Der Hinweis in der API

- [x] T020 `api/metzger-order/__init__.py`: `notiz` entgegennehmen, über
  `richtext.bereinige` säubern, in der Bestellung speichern, an `build_pdf` und
  `_mail_text` geben; `GET` liefert sie mit — dient `F5`
- [x] T021 `api/baecker-order/__init__.py`: dasselbe für beide Bäckereien und
  beide Anhangformate, einschließlich `_dokument` und `_gedruckt` — dient `F5`
- [x] T022 Mailtext beider Gewerke um den Hinweis ergänzen (reiner Text) —
  Entscheidung 4 der Spezifikation

## Der Textgestalter im Kiosk

- [x] T030 `static-site/js/kiosk-notiz.js`: `KNotiz.oeffnen({html, gesperrt,
  onÜbernehmen})` — Dialog, Bearbeitungsleiste (fett, kursiv, unterstrichen,
  Aufzählung), Rest-Vorrat, Einfügen ohne Gestaltung — dient `F1`, `F2`, `F6`
- [x] T031 `static-site/css/kiosk-neu.css`: Gestaltung von Knopf und Dialog,
  44-px-Antippflächen, kein waagerechter Rollstreifen — dient `F6`
- [x] T032 `kiosk-klassisch.html`: Modul einbinden, danach
  `node tools/build-kiosk-neu.js`
- [x] T033 `kiosk-metzger-bestellung.js`: Knopf in der Fußleiste, `notiz` im
  Zustand, im Rumpf von speichern/senden/korrektur, gesperrt bei gesendeter
  Bestellung — `TC-F1-01` … `TC-F1-05`, `TC-F5-02`
- [x] T034 `kiosk-baecker.js`: Knopf bei der gewählten Bäckerei, `notiz` je
  Bäckerei und Liefertag — `TC-F1-01`, `TC-F5-03`, `TC-F5-04`

## Tests

- [x] T040 `tests/kiosk-notiz.spec.js`: Erfassen, Abbrechen, Neuladen, Sperre,
  Trennung nach Tag und Bäckerei — `TC-F1-01` … `TC-F1-05`, `TC-F5-01` …
  `TC-F5-04`
- [x] T041 `tests/kiosk-notiz.spec.js`: Bedienbarkeit über die drei
  Bildschirmgrößen — `TC-F6-01` … `TC-F6-03`
- [x] T042 `TC-F2-06` (Einfügen ohne Gestaltung) im Playwright-Test

## Abnahme

- [x] T050 Python-Tests und die neuen Playwright-Dateien laufen lassen; die
  bestehenden Metzger- und Bäcker-Testdateien einmal gegenprüfen
- [ ] T051 Spezifikation auf `Status: Implemented` setzen, Traceability füllen
- [ ] T052 Einchecken und hochladen

## Traceability

| Task | Requirement | Test Cases |
| --- | --- | --- |
| T001–T003 | F2 | TC-F2-01 … TC-F2-05 |
| T010–T013, T015 | F3 | TC-F3-01 … TC-F3-06 |
| T014, T015 | F4 | TC-F4-01 … TC-F4-03 |
| T020–T022 | F5 | TC-F5-01, TC-F5-02 |
| T030–T034 | F1 | TC-F1-01 … TC-F1-05 |
| T031, T041 | F6 | TC-F6-01 … TC-F6-03 |
| T040, T042 | F1, F2, F5 | TC-F2-06, TC-F5-01 … TC-F5-04 |
