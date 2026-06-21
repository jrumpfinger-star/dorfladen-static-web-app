# Bestellsystem – Workflow-Übersicht

## 1. Bestellstatus-Lebenszyklus

```
┌─────────┐    Annehmen     ┌────────────────┐    Packen fertig    ┌─────────────┐    Ausgeben     ┌───────────┐
│  0: NEU  │───────────────▶│ 1: IN BEARBEI- │───────────────────▶│ 2: ABHOL-   │───────────────▶│ 3: ABGE-  │
│          │                │    TUNG         │                    │    BEREIT    │                │    HOLT   │
└─────────┘                └────────────────┘                    └─────────────┘                └───────────┘
     │                            │                                    │
     │ Stornieren                 │ (zurück nicht möglich)             │
     ▼                            │                                    │
┌───────────┐                     │                                    │
│ 4: STOR-  │◀────────────────────┘ (nur manuell)                     │
│   NIERT   │                                                          │
└───────────┘                                                          │
     ▲                                                                 │
     └─────────────────────────────────────────────────────────────────┘
                              (Stornieren möglich bis Abgeholt)
```

---

## 2. Bestellvorgang (Kunde → Shop)

```
 KUNDE (shop.html)                          API (shop-order)                    DATAVERSE
 ═══════════════                            ════════════════                    ═════════
       │                                          │                                │
  [Warenkorb füllen]                              │                                │
       │                                          │                                │
  [Abholtermin wählen]                            │                                │
   (Datum + Zeitslot)                             │                                │
       │                                          │                                │
  [Bestellung absenden]──── POST /shop-order ────▶│                                │
       │                    + JWT Token            │                                │
       │                    + Positionen           │── Mindestbestellwert prüfen    │
       │                    + Abholslot            │── Bestellnummer generieren     │
       │                    + Anmerkungen          │── DL-YYYYMMDD-XXXX            │
       │                                          │                                │
       │                                          │── POST dl_shopbestellungs ────▶│
       │                                          │   Status = 0 (Neu)             │
       │                                          │                                │
       │                                          │── E-Mail Bestätigung senden    │
       │                                          │   (shop-notify)                │
       │                                          │                                │
       │                                          │── Push-Notification senden     │
       │◀──── 201 {bestellnummer, abholdatum} ────│                                │
       │                                          │                                │
  [Bestätigung anzeigen]                          │                                │
```

---

## 3. Bestellbearbeitung (Kiosk + Shop-Admin)

```
 KIOSK (kiosk.html)                    SHOP-ADMIN (shop-admin.html)
 ══════════════════                    ════════════════════════════
       │                                      │
  [Tab: Online-Shop]                     [Bestellungen laden]
       │                                      │
  GET /shop-order ◀───────────────────── GET /shop-order?action=dashboard
       │                                      │
  ┌────┴────────────────────────────────────────┐
  │            BESTELLUNGSLISTE                  │
  │  Filter: Zu erledigen │ Heute │ Überfällig  │
  │          │ Historie                          │
  └────┬────────────────────────────────────────┘
       │
       ▼
  ┌─────────────────────────────────────────────┐
  │  STATUS 0: NEU                              │
  │  [Annehmen] → Status 1                      │
  │  [Details]  → Detail-Modal                  │
  │  [✕]        → Status 4 (Stornieren)         │
  └─────────────────────────────────────────────┘
       │ Annehmen
       ▼
  ┌─────────────────────────────────────────────┐
  │  STATUS 1: IN BEARBEITUNG                   │
  │  [Bereit]  → Status 2                       │
  │  [Packen]  → Pack-Modal öffnen              │
  │  [Details] → Detail-Modal                   │
  └─────────────────────────────────────────────┘
       │ Packen
       ▼
  ┌─────────────────────────────────────────────────────────────┐
  │  PACK-MODAL                                                 │
  │                                                             │
  │  ┌──────────────────────────────────────────────────┐       │
  │  │ Für jede Position:                               │       │
  │  │  ☐ Artikel-Name    Menge [___]  Preis            │       │
  │  │  → Checkbox = gepackt                            │       │
  │  │  → Menge anpassbar (Gewichtsware in Gramm)       │       │
  │  │  → Auto-Save alle 1,2 Sek                        │       │
  │  └──────────────────────────────────────────────────┘       │
  │                                                             │
  │  [Fertig packen]                                            │
  │    ├─ Alle gepackt? → Status 2 + E-Mail "Bereit"           │
  │    └─ Artikel fehlen? → Bestätigung → Status 2              │
  │                         + E-Mail "Fehlende Artikel"         │
  └─────────────────────────────────────────────────────────────┘
       │
       ▼
  ┌─────────────────────────────────────────────┐
  │  STATUS 2: ABHOLBEREIT                      │
  │  [Ausgeben] → Status 3 (wenn gepackt)       │
  │  [Packen]   → Pack-Modal (wenn nicht)       │
  │  [Details]  → Detail-Modal                  │
  └─────────────────────────────────────────────┘
       │ Ausgeben / Abholscan
       ▼
  ┌─────────────────────────────────────────────┐
  │  STATUS 3: ABGEHOLT                         │
  │  ✅ (nur in Historie sichtbar)              │
  └─────────────────────────────────────────────┘
```

---

## 4. Abholscan-Workflow

```
  KIOSK / SHOP-ADMIN                     API (shop-admin)
  ══════════════════                     ════════════════
       │                                      │
  [Barcode scannen]                           │
  oder [Bestellnr eingeben]                   │
       │                                      │
       │── GET /shop-admin                    │
       │   ?action=scan_pickup                │
       │   &nr=DL-20260621-A1B2 ────────────▶│
       │                                      │── Bestellung suchen
       │                                      │── Status prüfen:
       │                                      │   ✓ Status 1 oder 2 → auf 3 setzen
       │                                      │   ✓ Status 3 → "bereits abgeholt"
       │                                      │   ✗ Status 0 oder 4 → Fehler
       │◀──── {success, bestellnummer,        │
       │       kunde_name, status} ───────────│
       │                                      │
  [Erfolg/Fehler anzeigen]                    │
```

---

## 5. E-Mail-Benachrichtigungen (shop-notify)

```
  AUSLÖSER                          E-MAIL AN KUNDEN
  ════════                          ════════════════
  Bestellung aufgegeben ──────────▶ Bestellbestätigung
  (POST /shop-order)                 • Bestellnummer
                                     • Abholtermin + Slot
                                     • Positionen-Tabelle
                                     • Zahlungsart (Bar/SEPA)

  Packen abgeschlossen ───────────▶ Abholbereit-Benachrichtigung
  (finishPack, alle da)              • "Ihre Bestellung ist bereit"
                                     • Abholtermin

  Packen mit fehlenden ───────────▶ Fehlende-Artikel-Info
  Artikeln (finishPack)              • Liste der nicht verfügbaren Artikel
                                     • Aktualisierte Summe
```

---

## 6. Kiosk-Filterlogik (Online-Shop Tab)

```
  _allShopOrders (alle vom API)
       │
       ├── _showHistory = false (Standard)
       │   │
       │   │── base = nur Bestellungen mit abholdatum >= heute
       │   │
       │   ├── Filter "Zu erledigen" (default)
       │   │   └── base.filter(status < 3)
       │   │       → Zeigt: Neu, In Bearbeitung, Abholbereit
       │   │
       │   ├── Filter "Heute abholen"
       │   │   └── base.filter(abholdatum === heute && status < 4)
       │   │       → Zeigt: Alle nicht-stornierten für heute
       │   │
       │   └── Filter "Überfällig"
       │       └── base.filter(status < 3 && Zeitslot abgelaufen)
       │           → Zeigt: Nicht abgeholte nach Slot-Ende
       │
       └── _showHistory = true (Toggle)
           │
           │── base = ALLE Bestellungen (inkl. vergangene)
           │
           ├── Filter "Zu erledigen" + Historie
           │   └── base (ungefiltert)
           │       → Zeigt: ALLE Status inkl. Abgeholt + Storniert
           │
           ├── Filter "Heute abholen" + Historie
           │   └── base.filter(abholdatum === heute && status < 4)
           │
           └── Filter "Überfällig" + Historie
               └── base.filter(status < 3 && überfällig)

  Historie-Badge: Anzahl Bestellungen mit abholdatum < heute
```

---

## 7. API-Endpunkte

| Endpunkt | Methode | Zweck | Auth |
|---|---|---|---|
| `/api/shop-order` | `POST` | Neue Bestellung aufgeben | JWT (Kunde) |
| `/api/shop-order` | `GET` | Bestellungen laden | JWT oder CMS |
| `/api/shop-order` | `PATCH` | Status ändern, Pack-Daten speichern | CMS |
| `/api/shop-admin` | `GET` | Dashboard, Kunden, Abholscan | CMS |
| `/api/shop-admin` | `PATCH` | Kundendaten aktualisieren | CMS |
| `/api/shop-notify` | `POST` | E-Mail senden (Bereit/Fehlend) | Intern |
| `/api/push-send` | `POST` | Push-Notification an Kunde | Intern |

---

## 8. Datenfluss-Übersicht

```
  ┌──────────┐     JWT      ┌──────────┐    Dataverse    ┌──────────────┐
  │  Kunde   │─────────────▶│   API    │◀──────────────▶│  Dataverse   │
  │ (shop.   │◀─────────────│ (Azure   │                │ dl_shopbe-   │
  │  html)   │  Bestätigung │  Funct.) │                │ stellungs    │
  └──────────┘              └──────────┘                └──────────────┘
                                 │▲
                    E-Mail/Push  ││ PATCH Status
                                 ▼│
  ┌──────────┐              ┌──────────┐
  │  Kiosk   │──────────────│ Shop-    │
  │ (kiosk.  │  gleiche API │ Admin    │
  │  html)   │              │ (shop-   │
  └──────────┘              │ admin.   │
                            │  html)   │
                            └──────────┘
```
