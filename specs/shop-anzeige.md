# Shop-Anzeige (Kundenseite) – Spec

> **Feature-ID**: SHOP-ANZEIGE
> **Status**: Bestand + laufende Änderungen (SDD)
> **Erstellt**: 2026-07-15

---

## 1. Überblick

Kundenseitige Produktanzeige des Click-&-Collect-Shops (`shop.html`): Kategorie-
Navigation, Produktkacheln (Grid) bzw. kompakte Liste, Preisdarstellung, Bild-
Popup und der Fleisch-Vorbestell-Promo-Banner. Datenquelle ist die API
`GET /api/shop-articles` (Artikelstamm `cr5d4_tables` gefiltert über die
Freigabetabelle `dl_shopfreigabes`).

**Betroffene Dateien:**
- API: `api/shop-articles/`
- Frontend: `static-site/shop.html`

## 2. Non-Goals

- Warenkorb/Bestellablauf (siehe `bestellsystem-workflows.md`).
- Fleisch-Vorbestellung selbst (siehe `fleisch-vorbestellung.md`).
- Tageslogik-Datenmodell (siehe `tagesverfuegbarkeit.md`).

## 3. Requirements

### F1: Artikel-Sichtbarkeit (alle freigegebenen Artikel)

#### F1 Behaviour / Acceptance

- Der Shop zeigt **alle in `dl_shopfreigabes` freigegebenen Artikel** (mit Name
  und Preis > 0), unabhängig davon, wann sie zuletzt verkauft wurden.
- Der frühere serverseitige „letzter Verkauf ≤ 6 Monate"-Filter wird **nicht**
  angewandt, solange eine Freigabetabelle existiert. Nur im Fallback (keine
  Freigabetabelle vorhanden) begrenzt der 6-Monats-Filter die Rohmenge.
- Tages- und Kurzfrist-Filter (`verfuegbare_tage`, `gueltig_bis`, `kurzfristig`)
  bleiben unberührt und greifen weiterhin je gewähltem Abholslot
  (siehe `tagesverfuegbarkeit.md`).

#### F1 Test Cases

**TC-SHOP-ANZEIGE-F1-01: Freigegebener Artikel ohne jüngsten Verkauf**
- **Setup:** Artikel freigegeben, letzter Verkauf > 6 Monate (z. B. „Lyoner im Ring", 2220615).
- **Expected:** Artikel ist im Shop (Kategorie/„Alle"/Suche) sichtbar.

**TC-SHOP-ANZEIGE-F1-02: Tagesfilter bleibt aktiv**
- **Setup:** Freigegebener Artikel mit `verfuegbare_tage` ohne den Slot-Wochentag.
- **Expected:** Artikel am gewählten Abholtag ausgeblendet, an erlaubten Tagen sichtbar.

### F2: Grundpreis (kg-Preis) für gewogene Ware – PAngV

#### F2 Behaviour / Acceptance

- Gesetzliche Pflicht (PAngV): Bei **gewogener Ware** (`gewichtsware = true`)
  wird zusätzlich zum Verkaufspreis der **Grundpreis pro kg** informativ
  angezeigt, z. B. `1,95 € /100 g` → darunter `(19,50 €/kg)`.
- Quelle des kg-Preises ist `vk_base` (Rohpreis = kg-Preis).
- Wird **nicht doppelt** ausgewiesen, wenn die Basiseinheit ohnehin schon
  „1 kg" ist (z. B. Obst/Gemüse).
- Anzeige in **Grid-Karten, Listenansicht und Bild-Popup**.

#### F2 Test Cases

**TC-SHOP-ANZEIGE-F2-01: kg-Grundpreis auf Karte**
- **Setup:** Gewogener Artikel mit Einheit „100 g".
- **Expected:** Karte zeigt „(x,xx €/kg)" unter dem Preis.

**TC-SHOP-ANZEIGE-F2-02: Kein doppelter kg-Preis**
- **Setup:** Artikel mit Basiseinheit „1 kg".
- **Expected:** Kein zusätzlicher „(… €/kg)"-Zusatz.

**TC-SHOP-ANZEIGE-F2-03: kg-Grundpreis im Bild-Popup**
- **Action:** Bild eines gewogenen Artikels öffnen.
- **Expected:** Popup zeigt Preis + „(x,xx €/kg)".

### F3: Fleisch-Promo-Banner

#### F3 Behaviour / Acceptance

- Der Banner „15 % Rabatt auf Fleisch & Wurst" erscheint **nur** auf der
  Startübersicht sowie in der Kategorie **„Fleisch und Wurstwaren"**.
- Er erscheint **nicht** unter anderen Warengruppen (unabhängig von der
  Warengruppenauswahl).

#### F3 Test Cases

**TC-SHOP-ANZEIGE-F3-01: Banner nur in Fleisch-Kategorie**
- **Action:** Kategorie „Butter und Margarine" wählen.
- **Expected:** Kein Fleisch-Banner.
- **Action:** Kategorie „Fleisch und Wurstwaren" wählen.
- **Expected:** Fleisch-Banner sichtbar.

### F4: Bild-Popup

#### F4 Behaviour / Acceptance

- Klick auf ein Produktbild öffnet ein Popup mit Bild, Bezeichnung, Preis
  (inkl. kg-Grundpreis bei gewogener Ware, F2), Warengruppe und Artikelnummer.

#### F4 Test Cases

**TC-SHOP-ANZEIGE-F4-01: Popup-Inhalt**
- **Expected:** Popup zeigt Name, Preis (+ kg-Grundpreis falls gewogen), Warengruppe, Artikelnr.

### F5: Design (Variante „Modern Frisch")

#### F5 Behaviour / Acceptance

- Optik: grüner Gradient-Header (weiße Such-Pille + Icon-Buttons), weiße
  Kategorieleiste mit gefüllter aktiver Pill, kräftige Preis-Typografie in
  Ink-Farbe (`--shop-ink`), Karten mit Hover-Anhebung.
- **Dark-Mode:** `--shop-ink` hell (lesbarer Preiskontrast).
- Alle bestehenden Funktionen (Warenkorb, Auth, Slot-Picker, Favoriten,
  Grid-/Listen-Umschaltung, Druck) bleiben erhalten.
- Sauber in Desktop-, Tablet- und Mobil-Auflösung.

#### F5 Test Cases

**TC-SHOP-ANZEIGE-F5-01: Responsiv**
- **Expected:** Header, Kategorien und Grid rendern sauber in Desktop/Tablet/Mobil.

**TC-SHOP-ANZEIGE-F5-02: Dark-Mode Preiskontrast**
- **Expected:** Preise im Dark-Mode gut lesbar (heller Ink-Wert).

## 4. Traceability

| Requirement | Test Cases | Betroffen |
| --- | --- | --- |
| F1 | TC-SHOP-ANZEIGE-F1-01..02 | `api/shop-articles`, `shop.html` |
| F2 | TC-SHOP-ANZEIGE-F2-01..03 | `shop.html` (`grundpreisHtml`) |
| F3 | TC-SHOP-ANZEIGE-F3-01 | `shop.html` |
| F4 | TC-SHOP-ANZEIGE-F4-01 | `shop.html` (`showImagePopup`) |
| F5 | TC-SHOP-ANZEIGE-F5-01..02 | `shop.html` (CSS) |

## 5. Status

- [x] F1 Sichtbarkeit freigegebener Artikel (6-Monats-Filter entfällt) – live getestet
- [x] F2 kg-Grundpreis (Karte/Liste/Popup) – live getestet
- [x] F3 Fleisch-Banner nur in Fleisch-Kategorie/Übersicht – live getestet
- [x] F4 Bild-Popup inkl. kg-Grundpreis – live getestet
- [x] F5 Redesign „Modern Frisch" + Dark-Mode-Fix – live getestet (Test-Umgebung `witty-island`)
