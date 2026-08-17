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

### Entwurf bearbeiten
- Geparkte Entwürfe können über den **✏ Bearbeiten**-Button in der Post-Liste zurück in den Wizard geladen werden
- `socialEditDraft(postId)` lädt den Entwurf per API und füllt:
  - Titel-Dropdown (passende Option wird ausgewählt)
  - Freitext-Feld
  - Produkt-Checkboxen (Katalog + Mittagessen)
- Badge „✏ Bearbeite Entwurf" erscheint im Step-4-Header (Klick = Bearbeitung abbrechen)
- **Parken** aktualisiert den bestehenden Entwurf per PATCH (kein Duplikat)
- **Jetzt senden** veröffentlicht den Entwurf direkt
- Nach Speichern/Abbrechen wird die Edit-ID zurückgesetzt
- Backend `PATCH /api/social-post` akzeptiert: `id` (Pflicht), `status`, `titel`, `freitext`/`text`, `items` (alle optional)

### Responsive Layout (≥900px)
- 2-Spalten-Flexbox-Layout: Steps 1+2 links, Steps 3+4 rechts
- Spalten fließen unabhängig (kein CSS Grid Row-Sync)
- Rechte Spalte ist sticky (`position:sticky;top:0`)
- Steps 3+4 auf Desktop immer aufgeklappt
- Footer-Elemente (Meal-Poster, Status, Today-Posts) volle Breite

## Verhalten
- Steps 1+2 starten offen, Steps 3+4 zugeklappt
- Klick auf Step-Header toggled auf/zu
- Aufklappen von Step 3 löst automatisch Vorschau-Update aus
- Zustand bleibt in `_socStepOpen` erhalten
- CSS-Klassen: `k-order`, `k-order-hdr`, `k-order-body`, `oc-collapsed`
- IDs: `soc-step-{1..4}`

## Anpassungsstellen
1. `static-site/kiosk.html` – Social-Panel HTML + `socToggleStep()` + socialPickUpdate-Wrapper
2. `static-site/cms.html` – Social-Panel (`#cms-panel-social`) an das Kiosk-Wizard-Layout angeglichen: identisches HTML/IDs, `k-*`-CSS gescoped unter `#cms-panel-social`, Inline-JS (`socToggleStep`, `socDeskTab`, `socialToggleDay`-Sync, `socialPickUpdate`-Wrapper) portiert. Desktop-Split-View ohne die Kiosk-Full-Height-Regeln (CMS ist ein scrollendes Dokument).

## Akzeptanzkriterien
- [x] AK-UI-50-01: 4 nummerierte Step-Karten sichtbar im Neuer-Post-Panel
- [x] AK-UI-50-02: Steps 1+2 anfangs offen, Steps 3+4 anfangs zugeklappt
- [x] AK-UI-50-03: Klick auf Step-Header toggled auf/zu
- [x] AK-UI-50-04: Alle Touch-Targets mindestens 44px hoch
- [x] AK-UI-50-05: Sub-Tabs mit Lucide-Icons und min-height:44px
- [x] AK-UI-50-06: Teilen-Buttons vertikal gestapelt mit min-height:56px
- [x] AK-UI-50-07: Badge „X ausgewählt" in Step 2 Header (dynamisch)
- [x] AK-UI-50-08: Entwürfe zeigen „✏ Bearbeiten"-Button in der Post-Liste
- [x] AK-UI-50-09: Klick auf „Bearbeiten" lädt Titel, Freitext und Produkte in den Wizard
- [x] AK-UI-50-10: „Parken" bei geladenem Entwurf aktualisiert per PATCH (kein Duplikat)
- [x] AK-UI-50-11: Badge „✏ Bearbeite Entwurf" in Step 4 sichtbar während Bearbeitung
- [x] AK-UI-50-12: 2-Spalten-Layout ab 900px (Steps 1+2 links, Steps 3+4 rechts)
- [x] AK-UI-50-13: Rechte Spalte sticky, keine Lücken zwischen Steps in linker Spalte

## Status
| Komponente | Status |
|---|---|
| Step-Wizard HTML | ✅ Implementiert |
| socToggleStep() | ✅ Implementiert |
| socialPickUpdate-Wrapper | ✅ Implementiert |
| Touch-Target-Sizing | ✅ Implementiert |
| Lucide-Icons in Sub-Tabs | ✅ Implementiert |
| Entwurf bearbeiten (socialEditDraft) | ✅ Implementiert |
| socialSaveDraft PATCH-Modus | ✅ Implementiert |
| Bearbeiten-Button in Post-Liste | ✅ Implementiert |
| 2-Spalten-Layout (≥900px) | ✅ Implementiert |
| Backend PATCH erweitert | ✅ Implementiert |
