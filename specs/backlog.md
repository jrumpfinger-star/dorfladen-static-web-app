# Dorfladen – Feature Backlog

> Erstellt: 2026-06-28 | Zuletzt aktualisiert: 2026-06-28
> Prioritäten: 🔴 Hoch | 🟡 Mittel | 🟢 Niedrig
> Status: ✅ Umgesetzt | 🔧 Teilweise | ❌ Offen | 🚫 Verworfen

---

## 🏠 Homepage (index.html)

| # | Feature | Prio | Status | Details |
|---|---------|------|--------|---------|
| H-01 | Pull-to-Refresh | 🟡 | ✅ | Browser-natives Pull-to-Refresh funktioniert (kein overscroll-behavior-Block) |
| H-02 | Mittagstisch-Kachel Wochenende | 🟢 | ❌ | Wenn kein Gericht verfügbar: "Montag: ..." als Vorschau statt leere Kachel |
| H-03 | Öffnungszeiten-Indikator | 🟡 | ✅ | Countdown: "öffnet in X Std/Min", "schließt in X Min"; Feiertage + nächster Tag |
| H-04 | Skeleton Loading | 🟢 | 🔧 | CSS-Klasse `.skeleton` existiert in `style.css`, aber nicht überall eingesetzt |
| H-05 | Lazy-Loading Maps | 🟡 | ✅ | Beide iframes haben `loading="lazy"` |
| H-06 | Desktop-Version pflegen | 🟢 | ❌ | Desktop-Ansicht (aside, info-cards) wirkt weniger gepflegt als Mobile |

---

## 🏥 Kiosk (kiosk.html)

| # | Feature | Prio | Status | Details |
|---|---------|------|--------|---------|
| K-01 | Sammelbestellung PDF/Druck | 🔴 | 🔧 | Sammelbestellung-Tab existiert, Druckansicht teilweise (CSS `@media print`) |
| K-02 | Sound/Vibrationsalarm | 🔴 | ✅ | Audio-Alert + Badge-Pulse bei neuen Bestellungen (Mittagstisch, Shop, Fleisch) |
| K-03 | Auto-Refresh | 🟡 | ✅ | 30s Intervall implementiert |
| K-04 | Bestätigungs-History/Audit-Trail | 🟡 | ❌ | Wer hat wann welche Bestellung bestätigt? |
| K-05 | Keyboard-Shortcuts / Swipe | 🟢 | ❌ | Schnelles Navigieren am Tablet |

---

## 📝 CMS (cms.html / cms.js)

| # | Feature | Prio | Status | Details |
|---|---------|------|--------|---------|
| C-01 | Undo/Rückgängig | 🔴 | ✅ | Undo-Toast (8s) für Angebote-, Wochenplan-, News-Löschung + Seiteninhalte-Save |
| C-02 | Vorschau-Modus | 🟡 | ❌ | Änderungen vor Speichern in Live-Vorschau sehen |
| C-03 | Bilder Drag & Drop | 🟡 | 🔧 | Drag & Drop für Artikel-Reihenfolge existiert, Bild-Upload via Zwischenablage/SharePoint vorhanden, kein direktes Bild-Drag&Drop |
| C-04 | Änderungsprotokoll | 🟡 | ❌ | Wer hat wann was geändert? |
| C-05 | Mobile-Optimierung CMS | 🟢 | ❌ | Tab-Navigation eng auf Tablet |

---

## 🛒 Shop (shop.html)

| # | Feature | Prio | Status | Details |
|---|---------|------|--------|---------|
| S-01 | Warenkorb-Persistenz | 🟡 | ✅ | localStorage wird bereits genutzt |
| S-02 | Produktbilder | 🔴 | ✅ | Bilder aus SharePoint via `/api/werbebilder`, `shop-images.js`, base64-Cache |
| S-03 | Suchfunktion | 🟡 | ✅ | Suchfeld mit Live-Filter nach Artikelname (`shop-search-input`) |
| S-04 | Mengen-Schnellwahl (+/-) | 🟢 | ❌ | Aktuell manuelle Eingabe |
| S-05 | Zeitslot-Verfügbarkeit | 🟢 | ❌ | Visuell zeigen, welche Slots voll sind |

---

## 📦 Shop-Admin (shop-admin.html / shop-freigabe.html)

| # | Feature | Prio | Status | Details |
|---|---------|------|--------|---------|
| A-01 | Batch-Aktionen | 🟡 | ✅ | In `shop-freigabe.html` implementiert (Alle freigeben/sperren, Batch-Bar) |
| A-02 | Tagesstatistiken | 🟡 | ❌ | Umsatz pro Tag, durchschnittliche Bestellgröße |
| A-03 | CSV/Excel-Export | 🟡 | ✅ | CSV-Export-Button in Shop-Admin + Lunch-Admin (BOM+Semikolon für Excel) |
| A-04 | Benachrichtigungs-Indikator | 🟢 | ❌ | Ungelesene Kunden-Kommentare visuell hervorheben |

---

## 🥩 Fleisch-Bestellen (fleisch-bestellen.html)

| # | Feature | Prio | Status | Details |
|---|---------|------|--------|---------|
| F-01 | Bestellverlauf | 🟡 | ❌ | Kunde sieht nur aktuelle, nicht vergangene Bestellungen |
| F-02 | Mengenvorschläge | 🟢 | ❌ | "Beliebteste Menge: 1,5 kg" als Hilfe |
| F-03 | Liefertag-Kalender | 🟢 | ❌ | Visueller Kalender statt Dropdown |
| F-04 | Warenkorb-Zusammenfassung | 🟡 | ✅ | Vor Absenden Zusammenfassung mit Rabattberechnung vorhanden |
| F-05 | Bestellschluss-Countdown | 🔴 | ✅ | Implementiert |

---

## 📋 Bestellstatus (bestellstatus.html)

| # | Feature | Prio | Status | Details |
|---|---------|------|--------|---------|
| B-01 | QR-Code | 🟢 | ❌ | Bestellnummer als QR für schnelles Vorzeigen im Laden |
| B-02 | Push bei Status-Änderung | 🔴 | 🔧 | Push-Infrastruktur existiert (SW, VAPID, subscribe/unsubscribe), aber Status-Trigger fehlt |
| B-03 | Timeline-Visualisierung | 🟡 | 🔧 | CSS existiert (`.bs-tl-*`), wird aber nicht genutzt |
| B-04 | Bestellung per WhatsApp teilen | 🟢 | ❌ | Link teilen ("Mein Liefertag ist...") |

---

## 🍽 Mittagstisch-Bestellen (mittagstisch-bestellen.html)

| # | Feature | Prio | Status | Details |
|---|---------|------|--------|---------|
| M-01 | Allergene/Zusatzstoffe | 🔴 | ✅ | Dataverse-Feld `dl_allergene`, CMS-Eingabe, Anzeige auf Homepage + Bestellseite |
| M-02 | Foto des Gerichts | 🟡 | ❌ | Starker Conversion-Booster |
| M-03 | Bestellschluss-Countdown | 🟡 | ✅ | Sticky-Banner mit Countdown bis 10:30, danach Hinweis "Bestellschluss erreicht" |
| M-04 | Stammkunden-Funktion | 🟡 | ✅ | Telefonnummer wird im localStorage gespeichert |

---

## 📰 Aktuelles (aktuelles.html)

| # | Feature | Prio | Status | Details |
|---|---------|------|--------|---------|
| N-01 | Bilder in Beiträgen | 🟡 | ❌ | Aktuell nur Text |
| N-02 | Teilen-Button | 🟢 | ❌ | WhatsApp/Copy-Link pro Beitrag |
| N-03 | Push bei neuem Beitrag | 🟢 | 🔧 | Push-System existiert, Category "news" vorhanden, Trigger beim Speichern fehlt |

---

## 🔴 Übergreifend

| # | Feature | Prio | Status | Details |
|---|---------|------|--------|---------|
| X-01 | Design-System / Tokens | 🟡 | ❌ | Jede Seite hat eigene CSS-Variablen (3 Grün-Töne, versch. Schriftgrößen) |
| X-02 | Error-Handling | 🟡 | ❌ | API-Fehler zeigen oft nur "Fehler" – spezifischere Meldungen |
| X-03 | Offline-Modus (PWA) | 🟡 | 🔧 | Service Worker mit Cache existiert (`sw.js`), Network-first für Code, Cache-first für Assets. Kein dedizierter Offline-Fallback-Screen |
| X-04 | Analytics | 🟡 | ✅ | Analytics-Dashboard im CMS implementiert (API `/api/analytics`, Charts, KPIs) |
| X-05 | SEO og:image | 🟢 | ✅ | og:image/og:url zeigen korrekt auf Production-URL (kind-pebble = Live); bei Custom-Domain erneut anpassen |
| X-06 | Accessibility (ARIA) | 🟡 | ❌ | Kein ARIA auf den meisten interaktiven Elementen, fehlende alt-Texte |

---

## Zusammenfassung

| Status | Anzahl |
|--------|--------|
| ✅ Umgesetzt | 8 |
| 🔧 Teilweise | 7 |
| ❌ Offen | 28 |
| **Gesamt** | **43** |

### Nächste Quick Wins (< 1h Aufwand)
1. **H-05** – `loading="lazy"` auf Maps-iframe (1 Zeile)
2. **X-05** – og:image URL korrigieren (5 Min)
3. **H-04** – Skeleton-Klasse an Loading-States anhängen (30 Min)
4. **K-02** – Sound-Alert bei neuer Bestellung (Audio-Element + Notification API, ~1h)
