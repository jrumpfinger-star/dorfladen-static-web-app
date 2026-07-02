# Tagesverfügbarkeit – Spec

> **Feature-ID**: TAGESVERF
> **Status**: Entwurf
> **Erstellt**: 2026-07-03

---

## 1. Überblick

Produkte im Shop sollen nur an bestimmten Wochentagen verfügbar sein. Die Verfügbarkeit wird in der Freigabeliste (`shop-freigabe.html`) pro Artikel konfiguriert und wirkt sich auf die Shop-Anzeige (`shop.html`) und den Warenkorb aus.

**Beispiel:** Frische Brezen sind nur Mo, Mi und Fr verfügbar, Fertiggerichte nur Di und Do.

**Kernverhalten:**
- Artikel ohne Tageseinschränkung sind an allen Tagen verfügbar (Rückwärtskompatibilität)
- Default: alle Tage (Mo–Sa). In der Freigabeliste können einzelne Tage abgewählt werden
- Nicht verfügbare Artikel werden im Shop **nicht angezeigt** (kein Badge, kein Hinweis – einfach unsichtbar)
- Beim Wechsel des Abholslots im Warenkorb werden Verfügbarkeiten neu geprüft
- Nicht mehr verfügbare Artikel im Warenkorb werden markiert und können nicht bestellt werden
- Backend prüft Verfügbarkeit bei Bestelleingang nochmals
- Fleisch-Vorbestellung (`fleisch-bestellen.html`) ist nicht betroffen – dort gilt weiterhin das eigene Liefertag-System (Mo + Do)

---

## 2. Datenmodell

### Dataverse-Tabelle `dl_shopfreigabes`

**Neues Feld:**

| Logischer Name | Anzeigename | Typ | Beschreibung |
|---|---|---|---|
| `dl_verfuegbare_tage` | Verfügbare Tage | String (max 20) | Komma-separierte Wochentag-Nummern: `1,2,3,4,5,6` (Mo=1, ..., Sa=6, JS `getDay()`-Format). Leer = alle Tage (Mo–Sa). Sonntag (0) entfällt, da der Laden sonntags geschlossen ist. |

**Warum String statt MultiSelect?**
- Einfache Verarbeitung in JS (`"1,2,3,4,5".split(",")`)
- Keine Abhängigkeit von Dataverse Choice-Definitionen
- Filterbar im OData-Query (`contains(dl_verfuegbare_tage, '1')`)

### API-Antwortformat

`GET /api/shop-freigabe` liefert pro Freigabe zusätzlich:
```json
{
  "strichcode": "4012345678901",
  "aktiv": true,
  "gueltig_bis": "2026-12-31",
  "kurzfristig": false,
  "verfuegbare_tage": "1,2,3,4,5"
}
```

`GET /api/shop-articles` liefert pro Artikel zusätzlich:
```json
{
  "verfuegbare_tage": "1,2,3,4,5"
}
```

Leer/null = alle Tage Mo–Sa (rückwärtskompatibel).

---

## 3. Freigabeliste (`shop-freigabe.html`)

### UI-Erweiterung pro Artikel-Zeile

Unter der bestehenden Checkbox (Aktiv) und dem Datumsfeld (Gültig bis) wird eine **Tagesauswahl** angezeigt:

```
☑ Aktiv  |  Gültig bis: [2026-12-31]  |  ☐ Nur kurz
Tage: [Mo] [Di] [Mi] [Do] [Fr] [Sa]   ← Toggle-Buttons
```

**Design:**
- 6 kleine Toggle-Buttons (Mo–Sa), farblich wie die bestehenden Pills im Shop
- Aktive Tage: grüner Hintergrund (`var(--green)`)
- Inaktive/abgewählte Tage: grauer Hintergrund (`#f3f4f6`), durchgestrichen oder verblasst
- Default: alle 6 Tage aktiv. Der Admin klickt Tage **weg**, an denen der Artikel nicht verfügbar ist
- Buttons sind nur klickbar wenn der Artikel freigegeben (aktiv) ist
- Platzierung: Neue Zeile unterhalb der bestehenden Zeile (Checkbox + Datum + Kurzfristig)

### Interaktion

- Klick auf Tages-Button: toggled diesen Tag an/aus (Default = alle an)
- Änderung wird als `pendingChange` tracked (wie bestehende Änderungen)
- Wenn alle 6 Tage aktiv → wird als leer gespeichert (= "täglich", spart Daten)

### Speichern

Beim Speichern wird `dl_verfuegbare_tage` als komma-separierter String mitgesendet:
```json
{
  "strichcode": "4012345678901",
  "aktiv": true,
  "verfuegbare_tage": "1,3,5"
}
```

Leer-String oder null = alle Tage (Mo–Sa). Wenn alle 6 Tage gewählt sind, wird leer gespeichert.

---

## 4. Shop (`shop.html`)

### Filterung der Artikelanzeige

Die bestehende Funktion `isAvailableForSlot(a)` wird erweitert:

```js
function isAvailableForSlot(a) {
  // Bestehende Gültigkeits-Prüfung
  if (a.gueltig_bis && selectedSlot && a.gueltig_bis < selectedSlot.dateStr) {
    return false;
  }
  // NEU: Tagesverfügbarkeit
  if (a.verfuegbare_tage && selectedSlot) {
    var slotDay = selectedSlot.date.getDay(); // 0=So, 1=Mo, ..., 6=Sa
    var tage = a.verfuegbare_tage.split(',');
    if (tage.indexOf(String(slotDay)) === -1) {
      return false; // Artikel an diesem Tag nicht verfügbar → wird nicht angezeigt
    }
  }
  return true;
}
```

**Verhalten:**
- Artikel ohne `verfuegbare_tage` sind immer sichtbar (Rückwärtskompatibilität)
- Nicht verfügbare Artikel werden **komplett ausgeblendet** – kein Badge, kein Hinweis, einfach nicht im Sortiment
- Die Kategorieanzahl (`countByCat`) aktualisiert sich automatisch, da sie auf `visibleArticles()` basiert
- Bestseller werden ebenfalls gefiltert (Zeile 1654: `bestsellers.filter(isAvailableForSlot)`)
- Leere Kategorien (alle Artikel ausgeblendet) werden in der Kategorie-Navigation nicht angezeigt

### Slot-Wechsel

Beim Wechsel des Abholslots (Event in `initTopbarSlotPicker`) passiert bereits:
1. `updateBanner()` → aktualisiert Slot-Dropdown
2. `showCategoryOverview()` oder `showArticles()` → rendert Artikel neu

Die Filterung greift automatisch über `visibleArticles()`.

---

## 5. Warenkorb-Prüfung bei Slot-Wechsel

### Problem
Wenn der Kunde den Abholslot wechselt, kann es sein, dass Artikel im Warenkorb am neuen Tag nicht verfügbar sind.

### Lösung

Nach jedem Slot-Wechsel (in `initTopbarSlotPicker`, Zeile ~937):

1. **Prüfe alle Warenkorb-Artikel** gegen den neuen Slot
2. **Nicht-verfügbare Artikel markieren** (visuell im Warenkorb)
3. **Hinweis anzeigen** als Toast oder Inline-Banner im Warenkorb
4. **Bestell-Button deaktivieren** solange nicht-verfügbare Artikel im Warenkorb sind

### UI im Warenkorb

Nicht-verfügbare Artikel erhalten:
- Roten Rahmen / rote Hintergrundfarbe
- Hinweistext: `"⚠ Nicht verfügbar am [Wochentag]"`
- "Entfernen"-Button bleibt aktiv

Banner über dem Warenkorb:
```
⚠ Einige Artikel sind am [Mittwoch] nicht verfügbar.
Bitte entfernen Sie diese oder wählen Sie einen anderen Abholtermin.
```

### Checkout-Sperre

Der Bestell-Button (`shop-checkout-btn`) wird deaktiviert wenn nicht-verfügbare Artikel im Warenkorb sind:
```
🛍 [X] Artikel nicht verfügbar – bitte entfernen
```

### Implementierung

Neue Funktion `checkCartAvailability()`:
```js
function checkCartAvailability() {
  if (!selectedSlot) return [];
  var slotDay = selectedSlot.date.getDay();
  return cart.filter(function(item) {
    var article = allArticles.find(function(a) { return a.artikelnummer === item.artikelnummer; });
    if (!article) return false;
    if (!article.verfuegbare_tage) return false; // kein Tages-Limit
    var tage = article.verfuegbare_tage.split(',');
    return tage.indexOf(String(slotDay)) === -1; // nicht verfügbar
  });
}
```

Aufrufe:
- In `renderCart()` → markiert nicht-verfügbare Items
- Im Slot-Wechsel-Handler → zeigt Toast bei neuen Konflikten
- In `placeOrder()` → finale Prüfung vor Absenden

---

## 6. Backend-Validierung

### `shop-articles/__init__.py`

`_load_freigaben()` lädt zusätzlich `dl_verfuegbare_tage` und gibt es an das Frontend weiter:

```python
result[sc] = {
    "gueltig_bis": gb,
    "kurzfristig": bool(f.get("dl_kurzfristig")),
    "verfuegbare_tage": (f.get("dl_verfuegbare_tage") or "").strip()
}
```

### `shop-order/__init__.py`

Beim Bestelleingang (`_handle_post`):

1. Lade Freigaben mit Tagen
2. Für jede Position prüfen: Ist der Artikel am gewählten Abholtag verfügbar?
3. Falls nicht: Bestellung ablehnen mit Fehlermeldung

```python
# Abholslot-Tag ermitteln (0=So, 1=Mo, ...)
from datetime import datetime
abhol_date = datetime.strptime(abholdatum, "%Y-%m-%d")
abhol_wochentag = (abhol_date.weekday() + 1) % 7  # Python weekday → JS getDay

# Freigaben laden
freigaben = _load_freigaben_mit_tagen(base_url, headers)

# Prüfen
nicht_verfuegbar = []
for pos in clean_positionen:
    sc = pos.get("strichcode", "")
    if sc and sc in freigaben:
        tage = freigaben[sc].get("verfuegbare_tage", "")
        if tage and str(abhol_wochentag) not in tage.split(","):
            nicht_verfuegbar.append(pos["bezeichnung"])

if nicht_verfuegbar:
    return error_response(f"Folgende Artikel sind am gewählten Abholtag nicht verfügbar: {', '.join(nicht_verfuegbar)}")
```

### `shop-freigabe/__init__.py`

`_upsert_freigabe()` speichert das neue Feld:

```python
if "verfuegbare_tage" in item:
    payload["dl_verfuegbare_tage"] = item["verfuegbare_tage"]
```

`_load_freigaben()` lädt das Feld:
- `$select` um `dl_verfuegbare_tage` ergänzen

GET-Response enthält `verfuegbare_tage` pro Freigabe.

---

## 7. Implementierungs-Reihenfolge

| Phase | Aufgabe | Dateien |
|---|---|---|
| **1** | Dataverse: Feld `dl_verfuegbare_tage` anlegen | Dataverse Admin |
| **2** | API: Feld lesen/schreiben in shop-freigabe | `api/shop-freigabe/__init__.py` |
| **3** | API: Feld an shop-articles weitergeben | `api/shop-articles/__init__.py` |
| **4** | Freigabeliste: Tages-Toggles UI | `static-site/shop-freigabe.html` |
| **5** | Shop: `isAvailableForSlot` erweitern | `static-site/shop.html` |
| **6** | Shop: Warenkorb-Prüfung bei Slot-Wechsel | `static-site/shop.html` |
| **7** | Backend: Validierung bei Bestellung | `api/shop-order/__init__.py` |
| **8** | Tests | `tests/` |

---

## 8. Akzeptanzkriterien

- [x] Freigabeliste zeigt Tages-Toggles pro Artikel (Mo–Sa)
- [x] Tages-Toggles nur klickbar wenn Artikel aktiv
- [x] Speichern der Tagesauswahl über API funktioniert
- [x] Artikel ohne Tageseinschränkung sind an allen Tagen sichtbar
- [x] Shop filtert Artikel nach Wochentag des gewählten Abholslots
- [x] Kategorieanzahl aktualisiert sich beim Slot-Wechsel
- [x] Warenkorb: Nicht-verfügbare Artikel werden visuell markiert nach Slot-Wechsel
- [x] Warenkorb: Hinweis-Banner bei nicht-verfügbaren Artikeln
- [x] Warenkorb: Bestell-Button deaktiviert bei nicht-verfügbaren Artikeln
- [x] Backend: Bestellung wird abgelehnt wenn Artikel am Abholtag nicht verfügbar
- [x] Rückwärtskompatibilität: Bestehende Artikel ohne Tage funktionieren wie bisher

---

## 9. Entschiedene Designfragen

| Frage | Entscheidung |
|---|---|
| Tage auf Artikelkarte anzeigen? | **Nein.** Verfügbar = sichtbar, nicht verfügbar = unsichtbar. |
| Tagesbereich? | **Mo–Sa** (6 Tage). Sonntag entfällt (Laden geschlossen). |
| Fleisch-Vorbestellung? | **Nicht betroffen.** Eigenes Liefertag-System bleibt. |
| Default? | **Alle Tage aktiv.** Admin klickt Tage weg, nicht hinzu. |
