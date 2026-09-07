# Metzger-Bestellung — Tasks

> SDD-Stufe 3. Grundlage: [spec.md](./spec.md) und [plan.md](./plan.md).
> Eine Aufgabe ist erst „fertig", wenn ihre Test Cases nachweisbar erfüllt sind.

**Status:** Abgeschlossen · **Last updated:** 2026-09-07

| # | Aufgabe | Datei(en) | Test Cases | Status |
| --- | --- | --- | --- | --- |
| T1 | Portionsmodell: normalisieren, Text, Summen, Vakuumzählung | `api/metzger-order/portionen.py` | TC-F2-01…05, TC-F6-04 | erledigt |
| T2 | Selbsttest des Portionsmodells ohne Azure | `tools/metzger_portionen_test.py` | TC-F2-01…05 | erledigt |
| T3 | Ablage: Konfiguration, Katalog, Bestellungen, Startbestand aus `vorlage/` | `api/metzger-order/store.py` | TC-F1-01…03, TC-F15-01…05 | erledigt |
| T4 | Vorbelegung aus dem letzten gleichen Wochentag | `api/metzger-order/store.py` | TC-F7-01…05 | erledigt |
| T5 | Vorschläge lesen und beim Versand fortschreiben | `api/metzger-order/store.py` | TC-F4-09…13 | erledigt |
| T6 | Formular-PDF mit allen Zeilen, nicht Bestelltes mit Strich | `api/metzger-order/pdf_form.py` | TC-F11-03, TC-F11-04 | erledigt |
| T7 | Endpunkt Bestellung: Übersicht, Entwurf, Speichern, Verlauf, Dokument | `api/metzger-order/__init__.py`, `function.json` | TC-F1-02, TC-F14-01…04 | erledigt |
| T8 | Senden und Korrektur inkl. Mail, Sperre, Protokoll, Testbetrieb | `api/metzger-order/__init__.py` | TC-F11-01…08, TC-F12-01…06 | erledigt |
| T9 | Endpunkt Artikelpflege inkl. Dublettenprüfung und Nummernumzug | `api/metzger-artikel/__init__.py`, `function.json` | TC-F9-01…07 | erledigt |
| T10 | Kiosk-Oberfläche: Zeilenliste, Badges, Nummernspalte | `static-site/js/kiosk-metzger-bestellung.js` | TC-F3-01…09 | erledigt |
| T11 | Portionspad: Einheitenknöpfe, Kacheln, Vakuum, Ändern-Modus | dieselbe | TC-F3-10…16, TC-F6-01…06 | erledigt |
| T12 | Vorschläge als Mehrfachauswahl | dieselbe | TC-F4-01…08 | erledigt |
| T13 | Kurzeingabe mit Parser und Live-Vorschau | dieselbe | TC-F5-01…12 | erledigt |
| T14 | Suche, Warengruppen, Sprungleiste, Filter | dieselbe | TC-F10-01…05 | erledigt |
| T15 | Zusatzartikel nur für diesen Tag | dieselbe | TC-F8-01…06 | erledigt |
| T16 | Versanddialog mit Vorschau und Testbetrieb-Kennzeichnung | dieselbe | TC-F11-05…07 | erledigt |
| T17 | Verlauf, Artikelverwaltung, Einstellungen als Unterreiter | dieselbe | TC-F9-01…07, TC-F14-01…04, TC-F15-01…05 | erledigt |
| T18 | Erinnerung ab Bestellschluss | dieselbe | TC-F13-01…04 | erledigt |
| T19 | Tab, Panel, Stile und CMS-Schalter verdrahten | `static-site/kiosk.html` | TC-F18-01…04 | erledigt |
| T20 | Playwright-Tests über drei Viewports, API gemockt | `tests/kiosk-metzger-bestellung.spec.js` | TC-F17-01…07 und Querschnitt | erledigt |
| T21 | Spec auf die tatsächliche Ablage nachziehen | `specs/metzger-bestellung/spec.md` | — | erledigt |

## Abhängigkeiten

```
T1 → T2, T3, T6
T3 → T4 → T7
T3 → T5 → T8
T6 → T8
T7 → T10 → T11 → T12 → T13 → T14 → T15 → T16 → T17 → T18
T9 → T17
T10 → T19 → T20
```

## Abnahme

- `python tools/metzger_portionen_test.py` läuft grün.
- `npx playwright test tests/kiosk-metzger-bestellung.spec.js` läuft über
  Mobile (375×667), iPad mini (768×1024) und Desktop (1280×800) grün.
- Der Kiosk zeigt den Tab „Metzger Mair" mit gefülltem Katalog.
- Der Versanddialog weist bis zur Freigabe „Testbetrieb" aus; Empfänger ist
  `jrumpfinger@t-online.de`.
