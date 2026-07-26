# Shop Mobil-UX (Kundenseite) – Spec

> **Feature-ID**: SHOP-MOBIL-UX
> **Status**: Umgesetzt (SDD) – lokal verifiziert, Deploy auf feature/bestellsystem
> **Erstellt**: 2026-07-26
> **Mockup**: `shop-redesign-mockup.html` (Vorher/Nachher, Worktree-Root)

---

## 1. Überblick

Neugestaltung der **kundenseitigen Shop-Oberfläche (`shop.html`) für mobile
Geräte**. Ziel: Der Kunde erkennt sofort **was, wo, wie und wann** zu tun ist.
Ein klarer roter Faden führt durch den Ablauf **Abholzeit → Produkte wählen →
abholen & zahlen**. Es geht ausschließlich um Anordnung, Sichtbarkeit und
Führung der bestehenden Funktionen – **keine neue Geschäftslogik**.

**Betroffene Dateien:**
- Frontend: `static-site/shop.html` (HTML/CSS + kleine JS-Ergänzungen)

## 2. Non-Goals

- Keine Änderung an Bestell-/Warenkorb-Logik, API oder Datenmodell
  (siehe `bestellsystem-workflows.md`, `shop-anzeige.md`).
- Keine Änderung der Fleisch-Vorbestellung selbst (`fleisch-vorbestellung.md`).
- Desktop-Layout bleibt weitgehend unverändert (nur Mitnahme-Effekte erlaubt).
- Kein Kiosk-Redesign (separates, offenes Thema).

## 3. Problemanalyse (Ist-Zustand mobil)

1. **Überladene Kopfzeile** – 4 Einzel-Icons (Verwaltung, Bestellungen, Konto,
   Warenkorb) + großer Abholtermin-Chip + Login-Banner konkurrieren.
2. **Kein erkennbarer Ablauf** – Kunde weiß nicht, dass zuerst die Abholzeit
   und dann Produkte gewählt werden.
3. **Warenkorb versteckt** – nur als Icon oben rechts; keine dauerhaft sichtbare
   „Weiter zur Bestellung"-Aktion.
4. **Kategorie-Navigation unklar** – „Beliebt"-Pill + „Warengruppe…"-Dropdown
   sind nicht als Browsing erkennbar.
5. **Platz über dem Fold verschwendet** – großer roter Promo-Banner und die
   leere „Nur kurz verfügbar (0)"-Sektion verdrängen die Produkte.

## 4. Requirements

### F1: Abholzeit als klarer erster Schritt

#### F1 Behaviour / Acceptance
- Der Abholtermin-Auswähler wird auf schmalen Viewports (< 640 px) als
  **volle, prominente Karte** dargestellt (Icon + Label „Abholung am" + Slot +
  Hinweis „Tippen zum Ändern"), statt als kleiner Chip.
- Funktion bleibt identisch: Tippen öffnet die bestehende Slot-Auswahl
  (`#shop-slot-dd-list`).
- Auf Desktop bleibt die kompakte Darstellung erhalten.

#### F1 Test Cases
- **TC-SHOP-MOBIL-UX-F1-01:** Bei 375 px Breite ist die Abholzeit-Karte
  full-width, zeigt Slot-Text und „Tippen zum Ändern".
- **TC-SHOP-MOBIL-UX-F1-02:** Tippen öffnet die Slot-Liste; Auswahl aktualisiert
  Label und Warenkorb-Verfügbarkeit wie bisher.

### F2: Aufgeräumte Kopfzeile (ein Menü)

#### F2 Behaviour / Acceptance
- Auf schmalen Viewports werden **Verwaltung, Meine Bestellungen und Konto/
  Anmelden** hinter einem einzigen **Menü-Button (☰)** gebündelt.
- Der **Warenkorb** wird aus der Topbar-Icon-Reihe genommen und stattdessen
  über den dauerhaften Warenkorb-Balken (F5) bedient.
- Der bestehende Login-Banner wird in das Menü bzw. den Anmelde-Eintrag
  integriert (kein separater, dauerhaft sichtbarer Banner mehr über dem Fold).
- Menü öffnet als **Dropdown-Popup direkt unter dem Menü-Button (oben rechts)**,
  nicht als Bottom-Sheet – entspricht dem gewohnten Standard. Klick daneben
  schließt es. Jede Aktion ruft die **bestehende** Funktion auf
  (`shop-admin.html`, `#shop-history-btn`-Aktion, `showAuth('login')`).
- Auf Desktop bleiben die Einzel-Icons erhalten.

#### F2 Test Cases
- **TC-SHOP-MOBIL-UX-F2-01:** Bei 375 px zeigt die Topbar Logo + Titel + ein
  Menü-Icon; keine 4 Einzel-Icons.
- **TC-SHOP-MOBIL-UX-F2-02:** Menü öffnet als Popup oben rechts (Dropdown unter
  dem ☰-Button) mit Einträgen „Anmelden/Konto",
  „Meine Bestellungen", „Verwaltung"; jeder Eintrag löst die bisherige Aktion aus.
- **TC-SHOP-MOBIL-UX-F2-03:** Kein separater Login-Banner mehr unter der Topbar.

### F3: Kategorien navigierbar (Quick-Chips + „Alle Warengruppen")

#### F3 Behaviour / Acceptance
- Der Shop hat **~20–25 Warengruppen** – reines Horizontal-Scrollen ist ungeeignet
  (schlechte Auffindbarkeit). Stattdessen:
- Auf schmalen Viewports zeigt eine **sticky Leiste** nur wenige **Quick-Chips**
  (die meistgenutzten, z. B. „Beliebt" + 3–4 Top-Warengruppen) plus einen klar
  erkennbaren Button **„Alle Warengruppen"**.
- „Alle Warengruppen" öffnet ein **Vollbild-Overlay / Bottom-Sheet** mit **allen**
  Warengruppen als saubere, scanbare Liste (2-spaltig oder Liste mit Icon), damit
  jede Gruppe auffindbar ist. Auswahl schließt das Overlay und filtert.
- Die Chip-Leiste **klebt** beim Scrollen oben. Aktive Kategorie ist grün
  hervorgehoben. Filterung nutzt die **bestehende** Logik (`activeCat`,
  `showCategoryOverview`/Filter).
- Der Fleisch-Rabatt erscheint als **dezentes „-15%"-Badge** an der Chip/Zeile
  „Fleisch" (kein großer Promo-Block über dem Fold).

#### F3 Test Cases
- **TC-SHOP-MOBIL-UX-F3-01:** Bei 375 px zeigt die sticky Leiste „Beliebt" +
  wenige Quick-Chips + Button „Alle Warengruppen".
- **TC-SHOP-MOBIL-UX-F3-02:** „Alle Warengruppen" öffnet ein Overlay mit allen
  ~25 Gruppen; Auswahl filtert und schließt das Overlay.
- **TC-SHOP-MOBIL-UX-F3-03:** Tippen auf eine Quick-Chip filtert die Produkte
  und markiert sie aktiv.
- **TC-SHOP-MOBIL-UX-F3-04:** Beim Scrollen bleibt die Chip-Leiste oben sichtbar.
- **TC-SHOP-MOBIL-UX-F3-05:** Kein großer roter Promo-Banner über dem Fold;
  Fleisch trägt ein „-15%"-Badge.

### F4: Weniger Ablenkung über dem Fold

#### F4 Behaviour / Acceptance
- Die Sektion „Nur kurz verfügbar" wird auf schmalen Viewports **nur angezeigt,
  wenn es tatsächlich kurzfristige Artikel gibt** (Anzahl > 0). Bei 0 Artikeln
  wird sie ausgeblendet (kein leerer Platzhalter über dem Fold).
- Produkte werden mobil im **2-Spalten-Raster** dargestellt (kompakter,
  scanbarer). Der bestehende Grid/Listen-Umschalter bleibt funktional.

#### F4 Test Cases
- **TC-SHOP-MOBIL-UX-F4-01:** Bei 0 kurzfristigen Artikeln erscheint die Sektion
  „Nur kurz verfügbar" mobil nicht.
- **TC-SHOP-MOBIL-UX-F4-02:** Produkte erscheinen mobil im 2-Spalten-Raster.

### F5: Dauerhaft sichtbarer Warenkorb-Balken

#### F5 Behaviour / Acceptance
- Am **unteren Bildschirmrand** klebt auf schmalen Viewports ein Balken:
  „🛒 <Anzahl> Artikel · <Summe> € — Zur Bestellung".
- Der Balken ist **nur sichtbar, wenn mindestens 1 Artikel** im Warenkorb ist
  (leerer Korb → kein Balken, um Produkte nicht zu verdecken).
- Anzahl und Summe aktualisieren sich live bei jeder Warenkorb-Änderung
  (an bestehende `updateCartBadge()`/`renderCart()` angebunden).
- Tippen öffnet das bestehende Warenkorb-Panel (`#shop-cart-panel`).
- Der Balken respektiert `safe-area-inset-bottom` (iPhone-Home-Indikator).

#### F5 Test Cases
- **TC-SHOP-MOBIL-UX-F5-01:** Leerer Warenkorb → kein Balken sichtbar.
- **TC-SHOP-MOBIL-UX-F5-02:** Nach „Hinzufügen" erscheint der Balken mit
  korrekter Anzahl und Summe.
- **TC-SHOP-MOBIL-UX-F5-03:** Tippen auf den Balken öffnet das Warenkorb-Panel.
- **TC-SHOP-MOBIL-UX-F5-04:** Menge ändern/entfernen aktualisiert bzw. blendet
  den Balken korrekt aus.

### F6: Roter Faden (3-Schritt-Anzeige) — optional/leichtgewichtig

#### F6 Behaviour / Acceptance
- Unter der Abholzeit-Karte erscheint mobil eine kompakte 3-Schritt-Anzeige
  „1 Abholzeit · 2 Auswählen · 3 Abholen & zahlen".
- Rein informativ (kein Zustandsautomat nötig): Schritt 1 gilt als erledigt,
  sobald ein Slot gewählt ist; Schritt 2 aktiv beim Stöbern; Schritt 3 wird
  beim Öffnen des Warenkorbs/Checkout hervorgehoben.

#### F6 Test Cases
- **TC-SHOP-MOBIL-UX-F6-01:** Bei 375 px erscheint die 3-Schritt-Anzeige.

### F7: Produktkarten-Platzhalter mit Lucide-Icons (statt Emoji)

#### F7 Behaviour / Acceptance
- Produkte **ohne Bild** zeigen auf der Karte einen kategoriebasierten
  **Lucide-Icon**-Platzhalter (z. B. `coffee`, `egg`, `apple`) statt der bisherigen
  Emoji (☕🥚🍎). Gilt für Grid-, Listen- und „Schon bestellt"-Reorder-Ansicht.
- Icon-Farbe dezent grün passend zum Platzhalter-Verlauf; Größe je Ansicht
  (Karte ~34 px, Liste ~20 px, Reorder ~18 px, letzterer grau).
- Sobald ein Produktbild geladen ist, ersetzt es den Icon-Platzhalter unverändert.

#### F7 Test Cases
- **TC-SHOP-MOBIL-UX-F7-01:** Ein Produkt ohne Bild zeigt ein Lucide-SVG (kein
  Emoji) passend zur Warengruppe; nach Bild-Load ist das Bild sichtbar.

## 5. UI/Design

- Farben/Komponenten aus bestehendem Shop-Theme (`--shop-green #0f8a4d`,
  `--shop-orange #e65100`, `--shop-radius 14px`).
- **Icons: Lucide** (keine Emoji in produktiven UI-Elementen; Emoji nur im
  Mockup). Warenkorb-Balken nutzt `shopping-cart`, Menü nutzt `menu` etc.
- Änderungen greifen primär über Media-Queries (`max-width: 640px`), damit
  Desktop unberührt bleibt.
- Dark-Mode: bestehende `html[data-theme="dark"]`-Overrides berücksichtigen.

## 6. Umsetzungshinweise (technisch)

- Kopfzeile: neue Mobil-CSS + Menü-Button, der ein Overlay mit den bestehenden
  Aktionen zeigt; Einzel-Icons per CSS mobil ausblenden.
- Abholzeit: `.shop-slot-dd-btn` mobil zu full-width Karte stylen.
- Kategorien: bestehende Pill-Render-Logik auch mobil als Chips ausgeben;
  Dropdown mobil ausblenden; Container sticky.
- Warenkorb-Balken: neues Element `#shop-cart-bar` am Body-Ende; Update in
  `updateCartBadge()` (Anzahl) und `renderCart()` (Summe) mitschreiben; Klick →
  `openCart()`.
- „Nur kurz verfügbar": Render nur bei `kurzArtikel.length > 0` (mobil).

## 7. Traceability

| Requirement | Test Cases | Umsetzung | Status |
| --- | --- | --- | --- |
| F1 | TC-SHOP-MOBIL-UX-F1-01..02 | shop.html – Abholzeit mobil bereits full-width Karte | umgesetzt |
| F2 | TC-SHOP-MOBIL-UX-F2-01..03 | shop.html – `#shop-menu-btn` + `#shop-menu-overlay`, Icons/Banner mobil aus | umgesetzt |
| F3 | TC-SHOP-MOBIL-UX-F3-01..05 | shop.html – Quick-Chips (`.shop-quickcat`), „Alle Warengruppen", `-15%`-Badge | umgesetzt |
| F4 | TC-SHOP-MOBIL-UX-F4-01..02 | shop.html – leere „Nur kurz"-Sektion entfällt, Grid | umgesetzt |
| F5 | TC-SHOP-MOBIL-UX-F5-01..04 | shop.html – `#shop-cart-bar` + `updateCartBar()` | umgesetzt |
| F6 | TC-SHOP-MOBIL-UX-F6-01 | shop.html – `#shop-steps` (3-Schritt-Faden) | umgesetzt |
| F7 | TC-SHOP-MOBIL-UX-F7-01 | shop.html – `getCatTileIcon()`/`getCatLucideName()` auf `.shop-card-noimg`/`.shop-list-noimg`/`.reorder-item-noimg`; `CAT_EMOJI`/`getCatEmoji` entfernt | umgesetzt |
