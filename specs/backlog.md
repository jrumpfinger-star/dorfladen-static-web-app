# Dorfladen – Feature Backlog

> Erstellt: 2026-06-28 | Zuletzt aktualisiert: 2026-07-07
> Prioritäten: 🔴 Hoch | 🟡 Mittel | 🟢 Niedrig
> Status: ✅ Umgesetzt | 🔧 Teilweise | ❌ Offen | 🚫 Verworfen

---

## 📚 Spec-Index (Bestand – retrospektiv dokumentiert)

Retrospektive Specs für bereits umgesetzte Features (Status „Bestand"). Neue
Änderungen an diesen Bereichen folgen dem SDD-Ablauf und aktualisieren die Spec.

| Bereich | Spec | Umfasst |
|---------|------|---------|
| Auth / Konten | [auth-konten.md](auth-konten.md) | auth-login, auth-register, auth-verify, auth-reset |
| Analytics | [analytics-tracking.md](analytics-tracking.md) | track, analytics |
| News | [news-aktuelles.md](news-aktuelles.md) | news, news-save, news-delete, aktuelles.html |
| Preisliste | [preisliste-sortiment.md](preisliste-sortiment.md) | preisliste, sortiment.html, preisliste-live.js |
| Roter Punkt | [roter-punkt.md](roter-punkt.md) | roterpunkt, roter-punkt.html, roterpunkt-live.js |
| Push / PWA | [push-infrastruktur.md](push-infrastruktur.md) | push-vapid-key/subscribe/send/image, sw.js, pwa.js |
| Galerie | [galerie-bilder.md](galerie-bilder.md) | gallery, bilder.html |
| Öffnungszeiten | [oeffnungszeiten.md](oeffnungszeiten.md) | hours, oeffnungszeiten.html |
| Logo | [logo.md](logo.md) | logo, logo-loader.js |
| Werbebilder | [werbebilder.md](werbebilder.md) | werbebilder, shop-images.js |
| Social / Meta | [social-katalog.md](social-katalog.md) | social-katalog, meta-catalog |
| CMS-Inhalte | [cms-inhalte-seiten.md](cms-inhalte-seiten.md) | cms-config, Rechts-/Info-Seiten |
| Shop-Infrastruktur | [shop-infrastruktur.md](shop-infrastruktur.md) | shop-setup, shop-notify |
| Mitarbeiter-Portal | [mitarbeiter-portal.md](mitarbeiter-portal.md) | portal.html |
| Handbuch / Hilfe | [handbuch-hilfe.md](handbuch-hilfe.md) | handbuch/, help-workflows.html |
| Frontend-Infra | [frontend-infrastruktur.md](frontend-infrastruktur.md) | app.js, mobile.js, env-banner.js, dl-confirm.js |
| Tagesverfügbarkeit | [tagesverfuegbarkeit.md](tagesverfuegbarkeit.md) | Wochentags-Verfügbarkeit Shop-Artikel |
| Shop-Anzeige (Kunde) | [shop-anzeige.md](shop-anzeige.md) | shop.html Produktanzeige, kg-Grundpreis (PAngV), Bild-Popup, Fleisch-Banner, Sichtbarkeit freigegebener Artikel, Redesign |

> Offen (noch ohne dedizierte Spec): Bestellsystem-Kern (`bestellungen`, Shop-/
> Fleisch-/Mittagstisch-Bestellung, Kiosk, Bestellstatus). Siehe Feature-Tabellen unten.

---

## 🏠 Homepage (index.html)

| # | Feature | Prio | Status | Details |
|---|---------|------|--------|---------|
| H-01 | Pull-to-Refresh | 🟡 | ✅ | Browser-natives Pull-to-Refresh funktioniert (kein overscroll-behavior-Block) |
| H-02 | Mittagstisch-Kachel Wochenende | 🟢 | ✅ | API liefert ab Samstag nächste Woche; Frontend zeigt automatisch nächsten Wochenplan |
| H-03 | Öffnungszeiten-Indikator | 🟡 | ✅ | Countdown: "öffnet in X Std/Min", "schließt in X Min"; Feiertage + nächster Tag |
| H-04 | Skeleton Loading | 🟢 | 🔧 | CSS-Klasse `.skeleton` in `index.html` (Wochenplan, News, Galerie), fehlt auf shop/aktuelles/etc. |
| H-05 | Lazy-Loading Maps | 🟡 | ✅ | Beide iframes haben `loading="lazy"` |
| H-06 | Desktop-Version pflegen | 🟢 | ❌ | Desktop-Ansicht (aside, info-cards) wirkt weniger gepflegt als Mobile |

---

## 🏥 Kiosk (kiosk.html)

| # | Feature | Prio | Status | Details |
|---|---------|------|--------|---------|
| K-01 | Sammelbestellung PDF/Druck | 🔴 | ✅ | Sammelbestellung-Tab mit Filter, renderSammelbestellung(), printMetzgerSammel() (Druckfenster), "Alle beim Metzger bestellt" Button |
| K-02 | Sound/Vibrationsalarm | 🔴 | ✅ | Audio-Alert + Badge-Pulse bei neuen Bestellungen (Mittagstisch, Shop, Fleisch) |
| K-03 | Auto-Refresh | 🟡 | ✅ | 30s Intervall implementiert |
| K-04 | Bestätigungs-History/Audit-Trail | 🟡 | ❌ | Wer hat wann welche Bestellung bestätigt? |
| K-05 | Keyboard-Shortcuts / Swipe | 🟢 | ✅ | Tasten 1-5 für Tab-Wechsel, R für Refresh |

---

## 📝 CMS (cms.html / cms.js)

| # | Feature | Prio | Status | Details |
|---|---------|------|--------|---------|
| C-01 | Undo/Rückgängig | 🔴 | ✅ | Undo-Toast (8s) für Angebote-, Wochenplan-, News-Löschung + Seiteninhalte-Save |
| C-02 | Vorschau-Modus | 🟡 | ✅ | Live-Vorschau für Wochenplan (Desktop/Mobil Toggle), Angebote-Plakat, Angebote-Flyer, Homepage-Angebote mit Template-Auswahl |
| C-03 | Bilder Drag & Drop | 🟡 | ✅ | Drag & Drop für Artikel-Reihenfolge (draggable rows), Bild-Paste + Drag&Drop Zone für Social-Media-Bilder, Flyer-Bilder D&D |
| C-04 | Änderungsprotokoll | 🟡 | ❌ | Wer hat wann was geändert? |
| C-05 | Mobile-Optimierung CMS | 🟢 | ❌ | Tab-Navigation eng auf Tablet |

---

## 🛒 Shop (shop.html)

| # | Feature | Prio | Status | Details |
|---|---------|------|--------|---------|
| S-01 | Warenkorb-Persistenz | 🟡 | ✅ | localStorage wird bereits genutzt |
| S-02 | Produktbilder | 🔴 | ✅ | Bilder aus SharePoint via `/api/werbebilder`, `shop-images.js`, base64-Cache |
| S-03 | Suchfunktion | 🟡 | ✅ | Suchfeld mit Live-Filter nach Artikelname (`shop-search-input`) |
| S-04 | Mengen-Schnellwahl (+/-) | 🟢 | ✅ | +/- Buttons für Gewichtsware (100g-Schritte) und Stückware in Grid+Liste |
| S-05 | Zeitslot-Verfügbarkeit | 🟢 | 🔧 | Slots mit abgelaufener Vorlaufzeit werden automatisch herausgefiltert; Kapazitätslimit (voll) fehlt (braucht Backend) |

---

## 📦 Shop-Admin (shop-admin.html / shop-freigabe.html)

| # | Feature | Prio | Status | Details |
|---|---------|------|--------|---------|
| A-01 | Batch-Aktionen | 🟡 | ✅ | In `shop-freigabe.html` implementiert (Alle freigeben/sperren, Batch-Bar) |
| A-02 | Tagesstatistiken | 🟡 | ✅ | Umsatz-Kachel im Shop-Admin-Dashboard (API summary.summe); Mittagstisch hat Portionen+Umsatz |
| A-03 | CSV/Excel-Export | 🟡 | ✅ | CSV-Export-Button in Shop-Admin + Lunch-Admin (BOM+Semikolon für Excel) |
| A-04 | Benachrichtigungs-Indikator | 🟢 | ✅ | Kiosk: NEU-Badge, Counter, Gelesen-Buttons; Shop-Admin: badge-shop (offene Bestellungen) + badge-mittag (offene MT-Orders) mit admin-tab-badge.show |
| A-05 | Tagesverfügbarkeit | 🟡 | ✅ | Artikel nur an bestimmten Wochentagen verfügbar; Tages-Toggles in Freigabeliste; Shop-Filter + Warenkorb-Prüfung bei Slot-Wechsel; Backend-Validierung. Spec: `specs/tagesverfuegbarkeit.md` |

---

## 🥩 Fleisch-Bestellen (fleisch-bestellen.html)

| # | Feature | Prio | Status | Details |
|---|---------|------|--------|---------|
| F-01 | Bestellverlauf | 🟡 | ✅ | History-Button im Header, Popup mit letzten 20 Bestellungen (API mode=my_history) |
| F-02 | Mengenvorschläge | 🟢 | ❌ | "Beliebteste Menge: 1,5 kg" als Hilfe |
| F-03 | Liefertag-Kalender | 🟢 | ❌ | Visueller Kalender statt Dropdown |
| F-04 | Warenkorb-Zusammenfassung | 🟡 | ✅ | Vor Absenden Zusammenfassung mit Rabattberechnung vorhanden |
| F-05 | Bestellschluss-Countdown | 🔴 | ✅ | Implementiert |

---

## 📋 Bestellstatus (bestellstatus.html)

| # | Feature | Prio | Status | Details |
|---|---------|------|--------|---------|
| B-01 | QR-Code | 🟢 | ❌ | Bestellnummer als QR für schnelles Vorzeigen im Laden |
| B-02 | Push bei Status-Änderung | 🔴 | ✅ | Push bei Bestellung (lunch-order, shop-order, fleisch-order → push-send), Status-Änderung (shop-notify), Nachrichten-Push |
| B-03 | Timeline-Visualisierung | 🟡 | ✅ | buildTimeline() mit CSS `.bs-tl-*`, Schritte done/active/cancelled, in renderOrder() + renderFleischOrder() integriert |
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
| N-01 | Bilder in Beiträgen | 🟡 | ✅ | Beitragsbild direkt auf News-Karte (Homepage + Aktuelles-Seite); CMS-Upload war bereits vorhanden |
| N-02 | Teilen-Button | 🟢 | ✅ | WhatsApp + Link-kopieren Buttons auf jeder News-Karte (Aktuelles-Seite) |
| N-03 | Push bei neuem Beitrag | 🟢 | 🔧 | Push-System existiert, Category "news" vorhanden, Trigger beim Speichern fehlt |

---

## 🔴 Übergreifend

| # | Feature | Prio | Status | Details |
|---|---------|------|--------|---------|
| X-01 | Design-System / Tokens | 🟡 | ❌ | Jede Seite hat eigene CSS-Variablen (3 Grün-Töne, versch. Schriftgrößen) |
| X-02 | Error-Handling | 🟡 | 🔧 | Grundlegende Fehlermeldungen vorhanden; spezifischere Meldungen wären Verbesserung |
| X-03 | Offline-Modus (PWA) | 🟡 | 🔧 | Service Worker mit Cache existiert (`sw.js`), Network-first für Code, Cache-first für Assets. Kein dedizierter Offline-Fallback-Screen |
| X-04 | Analytics | 🟡 | ✅ | Analytics-Dashboard im CMS implementiert (API `/api/analytics`, Charts, KPIs) |
| X-05 | SEO og:image | 🟢 | ✅ | og:image/og:url zeigen korrekt auf Production-URL (kind-pebble = Live); bei Custom-Domain erneut anpassen |
| X-06 | Accessibility (ARIA) | 🟡 | ❌ | Kein ARIA auf den meisten interaktiven Elementen, fehlende alt-Texte |

---

## Zusammenfassung

| Status | Anzahl |
|--------|--------|
| ✅ Umgesetzt | 29 |
| 🔧 Teilweise | 3 |
| ❌ Offen | 12 |
| **Gesamt** | **44** |

### Verbleibende Quick Wins
1. **H-04** – Skeleton-Klasse an Loading-States anhängen (30 Min)
2. **B-01** – QR-Code für Bestellnummer (30 Min)
3. **B-04** – WhatsApp-Teilen Bestellstatus (15 Min)
