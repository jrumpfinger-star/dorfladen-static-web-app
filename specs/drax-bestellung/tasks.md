# Drax-Bestellung — Tasks

> SDD-Stufe 3. Grundlage: [spec.md](./spec.md) und [plan.md](./plan.md).
> Eine Aufgabe ist erst „fertig", wenn ihre Test Cases nachweisbar erfüllt sind.

**Status:** Offen · **Last updated:** 2026-10-07

| # | Aufgabe | Datei(en) | Test Cases | Status |
| --- | --- | --- | --- | --- |
| T0 | Datenbasis erzeugen: Rechnungen auswerten, Katalog bauen | `tools/drax_rechnung_extract.py`, `tools/drax_katalog_aus_xlsx.py`, `api/drax-order/vorlage/*.json` | Grundlage für TC-F2, TC-F4, TC-F9, TC-F10 | erledigt |
| T1 | Ablage: Konfiguration, Katalog, Bestellungen, Startbestand aus `vorlage/` | `api/drax-order/drax_store.py` | TC-F11-01…03 | erledigt |
| T2 | Liefertage und Bestellschluss: nächste vier Donnerstage, Status, Schlusszeitpunkt | `api/drax-order/drax_store.py` | TC-F1-01…03, TC-F8-01…03 | erledigt |
| T3 | Vorbelegung aus der letzten Bestellung bzw. `startwerte-drax.json` | `api/drax-order/drax_store.py` | TC-F2-01…03 | erledigt |
| T4 | Positionen normalisieren: Ziffern erzwingen, Menge 0 entfernen | `api/drax-order/drax_store.py` | TC-F3-02, TC-F3-03 | erledigt |
| T5 | Formular-PDF: Kopf mit KDNr 11225, vier Spalten, Gruppen-Leerzeilen, Testvermerk | `api/drax-order/drax_pdf.py` | TC-F5-01…04 | erledigt |
| T6 | Korrekturblatt: Vermerk „Korrektur", Erstdatum, gestrichene Positionen mit 0 | `api/drax-order/drax_pdf.py` | TC-F7-02, TC-F7-03 | erledigt |
| T7 | Endpunkt Bestellung: Übersicht, Entwurf, Speichern, Verlauf, Dokument | `api/drax-order/__init__.py`, `function.json` | TC-F9-01…03 | erledigt |
| T8 | Senden und Korrektur inkl. Mail, ASCII-Anhangname, Sperre, Protokoll, Testbetrieb | `api/drax-order/__init__.py` | TC-F6-01…03, TC-F7-01 | erledigt |
| T9 | Endpunkt Artikelpflege inkl. Dublettenprüfung und Sortierung | `api/drax-artikel/__init__.py`, `function.json` | TC-F4-01, TC-F10-01…04 | erledigt |
| T10 | Kiosk-Grundgerüst: vier Unterreiter, Tagesleiste, Kopfbereich | `static-site/js/kiosk-drax.js` | TC-F1-01…03 | erledigt |
| T11 | Bestellliste: Mengenfeld, Vorbelegungs-Kennzeichnung, Zähler in der Fußleiste | dieselbe | TC-F2-01…03, TC-F3-01…04 | erledigt |
| T12 | Gliederung: Warengruppen, Suche, Sprungleiste, „Nur bestellt" | dieselbe | TC-F4-01…04 | erledigt |
| T13 | Versanddialog mit Formular-Vorschau und Testbetrieb-Kennzeichnung | dieselbe | TC-F5-01…04, TC-F6-01…02 | erledigt |
| T14 | Sperre nach Versand und Korrektur-Knopf | dieselbe | TC-F7-01…03 | erledigt |
| T15 | Erinnerung ab Bestellschluss inkl. Countdown und Reiter-Merkmal | dieselbe | TC-F8-01…03 | erledigt |
| T16 | Verlauf mit Montags-Ausnahme und erneutem Öffnen des Formulars | dieselbe | TC-F9-01…03 | erledigt |
| T17 | Artikelreiter: Pflege, Herkunftsmerkmal, aktiv/inaktiv | dieselbe | TC-F10-01…04 | erledigt |
| T18 | Einstellungsreiter mit Vorgaben und Testbetriebs-Warnung | dieselbe | TC-F11-01…03 | erledigt |
| T19 | Tab, Panel, Stile und CMS-Schalter `kiosk_drax` verdrahten (**beide** Map-Stellen) | `static-site/kiosk.html` | TC-F13-01…02 | erledigt |
| T20 | Playwright-Tests über drei Viewports, API gemockt | `tests/kiosk-drax.spec.js` | TC-F12-01…03 und Querschnitt | erledigt |
| T21 | Cache-Bust-Version erhöhen, committen, Deployment prüfen | `static-site/kiosk.html`, Git | — | offen |

## Abhängigkeiten

```
T0 → T1
T1 → T2 → T3 → T4
T1 → T5 → T6
T2, T3, T4 → T7
T5, T6, T7 → T8
T1 → T9
T7 → T10 → T11 → T12 → T13 → T14 → T15 → T16
T9 → T17 → T18
T10 → T19 → T20 → T21
```

## Abnahme

- `npx playwright test tests/kiosk-drax.spec.js` läuft über Mobile (375×667),
  iPad mini (768×1024) und Desktop (1280×800) grün.
- Der Kiosk zeigt den Tab „Drax Mühle" mit 96 Artikeln in 9 Warengruppen.
- Die Vorbelegung übernimmt die Mengen der letzten Lieferung.
- Das erzeugte Formular trägt „KDNr 11225" und die vier Spalten
  Stück · Einheit · Art. Nr · Artikelbezeichnung — ohne Preise.
- Der Versanddialog weist bis zur Freigabe „Testbetrieb" aus; Empfänger ist
  die Testadresse, nicht die Mühle.

## Offene Rückfrage

Die **echte Bestelladresse der Drax Mühle** ist nicht bestätigt.
`info@drax-muehle.de` steht auf den Rechnungen, muss aber vom Betreiber
freigegeben werden. Bis dahin bleibt die Testadresse eingetragen — T8 und T18
sind davon betroffen, blockieren aber nicht.
