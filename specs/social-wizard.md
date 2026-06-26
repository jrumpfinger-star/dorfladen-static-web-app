# AK-UI-50 – Social Media: Step-Wizard Layout

## Ziel
Social-Media-Tab im Kiosk auf ein geführtes Step-Wizard-Layout umstellen, das auf dem iPad intuitiv bedienbar ist – ohne Schulung für eine Verkäuferin.

## Ist-Zustand
- Neuer-Post-Panel: Alle Abschnitte (Titel/Text, Produkte, Vorschau, Teilen) als flacher Scroll-Bereich
- Kleine Buttons und Inputs (unter 44px Touch-Target)
- Keine visuelle Führung – unklar welcher Schritt als nächstes kommt
- Teilen-Buttons nebeneinander in einer Zeile (schwer zu treffen auf Touch)

## Soll-Zustand

### Geführter 4-Schritt-Wizard
Jeder Schritt ist eine **klappbare Karte** (k-order Pattern) mit nummerierter Schrittanzeige:

#### Schritt 1: Titel & Text (grün, anfangs offen)
- Nummerierter Kreis (1) + Lucide-Icon `type`
- Titel-Dropdown mit `min-height:44px` (iPad Touch-Target)
- Freitext-Textarea mit `min-height:44px`
- Eingabefelder mit `font-size:15px` (verhindert iOS-Zoom)

#### Schritt 2: Produkte auswählen (pink, anfangs offen)
- Nummerierter Kreis (2) + Lucide-Icon `shopping-basket`
- Badge im Header: „X ausgewählt" (dynamisch aktualisiert)
- Produkt-Picker wie bisher (Katalog, Mittagessen, Freierfassung)

#### Schritt 3: Vorschau (dunkel, anfangs zugeklappt)
- Nummerierter Kreis (3) + Lucide-Icon `eye`
- Quick-Action-Button „Aktualisieren" im Header
- Canvas-Poster wie bisher
- Auto-Preview bei Aufklappen

#### Schritt 4: Teilen & Veröffentlichen (blau, anfangs zugeklappt)
- Nummerierter Kreis (4) + Lucide-Icon `send`
- Große, vertikale Share-Buttons (min-height:56px):
  - WhatsApp (grün, mit Shadow)
  - Instagram (Gradient, mit Shadow)
  - Bild speichern (neutral)
- Tagesinfo-Button mit Trennlinie (sekundäre Aktion)

### Sub-Tab-Leiste
- Größere Buttons (`min-height:44px`, `font-size:13px`)
- Lucide-Icons statt Emoji-Prefixe (plus-circle, book-open)
- Abgerundete Ecken (10px)

### Header
- Titel mit Lucide-Icon `share-2` statt Emoji
- Hinweis „in 4 einfachen Schritten"

## Verhalten
- Steps 1+2 starten offen, Steps 3+4 zugeklappt
- Klick auf Step-Header toggled auf/zu
- Aufklappen von Step 3 löst automatisch Vorschau-Update aus
- Zustand bleibt in `_socStepOpen` erhalten
- CSS-Klassen: `k-order`, `k-order-hdr`, `k-order-body`, `oc-collapsed`
- IDs: `soc-step-{1..4}`

## Anpassungsstellen
1. `static-site/kiosk.html` – Social-Panel HTML + `socToggleStep()` + socialPickUpdate-Wrapper

## Akzeptanzkriterien
- [x] AK-UI-50-01: 4 nummerierte Step-Karten sichtbar im Neuer-Post-Panel
- [x] AK-UI-50-02: Steps 1+2 anfangs offen, Steps 3+4 anfangs zugeklappt
- [x] AK-UI-50-03: Klick auf Step-Header toggled auf/zu
- [x] AK-UI-50-04: Alle Touch-Targets mindestens 44px hoch
- [x] AK-UI-50-05: Sub-Tabs mit Lucide-Icons und min-height:44px
- [x] AK-UI-50-06: Teilen-Buttons vertikal gestapelt mit min-height:56px
- [x] AK-UI-50-07: Badge „X ausgewählt" in Step 2 Header (dynamisch)

## Status
| Komponente | Status |
|---|---|
| Step-Wizard HTML | ✅ Implementiert |
| socToggleStep() | ✅ Implementiert |
| socialPickUpdate-Wrapper | ✅ Implementiert |
| Touch-Target-Sizing | ✅ Implementiert |
| Lucide-Icons in Sub-Tabs | ✅ Implementiert |
