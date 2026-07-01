# Mittagstisch bestellen – Spec

## Übersicht
Kunden können über `/mittagstisch-bestellen` den wöchentlichen Mittagstisch vorbestellen.
Die Seite zeigt alle Gerichte der Woche gruppiert nach Wochentag und ermöglicht eine Bestellung
für zukünftige Tage.

## Datenquelle
- API: `GET /api/mittagstisch` → liefert `dl_wochenplan` Items mit:
  - `dl_wochenplanid`, `dl_gericht`, `dl_preis`, `dl_wochentag` (101000–101005),
    `dl_datum`, `dl_allergene`
- Bestellschluss: `window._dlBestellschluss` aus CMS-Config (`bestellschluss_uhr`), Fallback 10:30

## Akzeptanzkriterien

### AK-MT-01: Vergangene Tage nicht bestellbar
- Gerichte für Tage die **vor heute** liegen, werden ausgegraut (`opacity:.45`)
- Gerichtname durchgestrichen (`text-decoration:line-through`)
- Kein Bestell-Button (Warenkorb-Icon)
- Nicht klickbar (`pointer-events:none`)
- Tages-Header zeigt Label "vorbei"

### AK-MT-02: Heutiger Tag nach Bestellschluss nicht bestellbar
- Wenn die aktuelle Uhrzeit ≥ Bestellschluss ist, wird der heutige Tag wie ein vergangener behandelt
- Tages-Header zeigt "Bestellschluss erreicht" (rot)

### AK-MT-03: Zukünftige Tage bestellbar
- Gerichte für Donnerstag und Freitag (bzw. Tage nach heute) zeigen den roten Bestell-Button
- Klick öffnet die Gericht-Auswahl mit Mengenauswahl

### AK-MT-04: Dynamischer Bestellschluss
- Der Bestellschluss-Zeitpunkt wird aus `window._dlBestellschluss` gelesen
- Fallback: 10.5 (= 10:30 Uhr)
- Die Bestellseite zeigt den dynamischen Wert im Countdown und in Fehlermeldungen

### AK-MT-05: TagesInfo Bestell-Button
- Im TagesInfo-Modal auf der Startseite wird beim Mittagessen immer ein Bestell-Button angezeigt
- Vor Bestellschluss: Direktlink zum Bestellen für heute mit vorausgewähltem Gericht
- Nach Bestellschluss: Link zur allgemeinen Bestellseite

### AK-MT-06: TagesInfo UI
- Mittagessen-Item hat **zweizeiliges Layout**:
  - **Zeile 1:** Icon + Gerichtname (volle Breite, kein Abschneiden)
  - **Zeile 2:** Preis + ab-Badge + Bestell-Button (rechts ausgerichtet, unter dem Namen eingerückt)
- Unter der Sektion "Mittagessen" wird die Kategorie "Mittagessen" nicht redundant angezeigt
- Bei gesetztem `ab_uhr` wird ein lila Badge "ab HH:MM" mit Uhr-Icon angezeigt

### AK-MT-07: Multi-Device UI-Tests (Pflicht)
- **Jede UI-Änderung** muss auf drei Viewports visuell geprüft werden:
  - **Mobile** (375×812, iPhone-artig)
  - **iPad Mini** (768×1024)
  - **Desktop** (1280×800)
- Prüfkriterien pro Viewport:
  - Text wird nicht abgeschnitten oder umgebrochen in unlesbarer Weise
  - Buttons/Icons sind erreichbar und haben ausreichend Klickfläche (min. 36×36px)
  - Layout nutzt den verfügbaren Platz sinnvoll
  - Kein horizontales Scrollen
- Diese Regel gilt projektübergreifend für alle Seiten und Modals
