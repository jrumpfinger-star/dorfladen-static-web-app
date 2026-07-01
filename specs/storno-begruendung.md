# Storno mit Begründung

## Beschreibung
Alle Stornierungen (Shop, Mittagessen, Metzger) erfordern eine Sicherheitsabfrage mit Pflicht-Begründung.
Der Storno-Grund wird im dedizierten Dataverse-Feld `dl_storno_grund` gespeichert (nicht in `personal_antwort` oder `bestaetigung_text`).

## Dataverse-Schema: `dl_storno_grund`

**Neues Feld auf allen drei Bestell-Entities:**

| Entity | Feld | Typ | Max | Beschreibung |
|---|---|---|---|---|
| `dl_mittagsbestellung` | `dl_storno_grund` | String | 2000 | Stornierungsgrund |
| `dl_shopbestellung` | `dl_storno_grund` | String | 2000 | Stornierungsgrund |
| `dl_fleischbestellung` | `dl_storno_grund` | String | 2000 | Stornierungsgrund |

**Zusätzlich auf `dl_shopbestellung` (fehlten bisher):**

| Entity | Feld | Typ | Max | Beschreibung |
|---|---|---|---|---|
| `dl_shopbestellung` | `dl_kunde_kommentar` | String | 2000 | Kundenkommentar |
| `dl_shopbestellung` | `dl_personal_antwort` | String | 2000 | Personalantwort |
| `dl_shopbestellung` | `dl_kommentar_gelesen` | Boolean | – | Gelesen-Flag |

**Migrations-Skript:** `scripts/create-storno-grund-fields.py`
- Legt alle Felder an (idempotent, überspringt bestehende)
- Muss vor dem ersten Deploy ausgeführt werden

## Akzeptanzkriterien

### Kiosk (Admin-Ansicht)
- [x] **AK-ST-01** Mittagstisch-Storno: Dialog mit Radio-Buttons für Stornogründe + optionaler Kommentar
- [x] **AK-ST-02** Shop-Storno: Dialog mit Radio-Buttons für Stornogründe + optionaler Kommentar, Stornieren-Button erst aktiv nach Grund-Auswahl
- [x] **AK-ST-03** Metzger-Storno: Dialog mit Radio-Buttons für Stornogründe + optionaler Kommentar, Stornieren-Button erst aktiv nach Grund-Auswahl
- [x] **AK-ST-04** Storno-Grund wird als `storno_grund` an API gesendet → `dl_storno_grund` in Dataverse

### CMS (Admin-Ansicht)
- [x] **AK-ST-05** CMS Shop-Storno: Modal-Dialog mit Radio-Buttons für Stornogründe statt einfachem `confirm()`
- [x] **AK-ST-06** CMS Metzger-Storno: Modal-Dialog mit Radio-Buttons für Stornogründe statt einfachem `confirm()`

### Kunden-Ansicht
- [x] **AK-ST-07** Shop-Kundenansicht (shop.html): Inline-Storno mit Pflicht-Textfeld für Begründung
- [x] **AK-ST-08** Fleisch-Kundenansicht (bestellstatus.html): Custom-Modal-Dialog mit Pflicht-Begründung (kein nativer `prompt()`)
- [x] **AK-ST-12** Mittagstisch-Kundenansicht (bestellstatus.html): Storno-Button sichtbar bei Status „Eingegangen" (0), Custom-Modal-Dialog mit Pflicht-Begründung
- [x] **AK-ST-15** Bestellstatus: Alle Fehler-/Info-Meldungen als Toast-Notification statt nativer `alert()`
- [x] **AK-ST-13** Mittagstisch-Kundenansicht: Storno-Button verschwindet nach Bestätigung (Status ≥ 1)

### API-Backend
- [x] **AK-ST-09** `shop-order` API PATCH akzeptiert `storno_grund` → schreibt `dl_storno_grund`
- [x] **AK-ST-10** `fleisch-order` API PATCH akzeptiert `storno_grund` → schreibt `dl_storno_grund`
- [x] **AK-ST-11** `lunch-order` API PATCH akzeptiert `storno_grund` → schreibt `dl_storno_grund`
- [x] **AK-ST-14** `lunch-order` API PATCH mit `kunde_storno=true`: Stornierung nur bei Status 0 (Eingegangen), sonst Fehler 400

## Storno-Gründe

### Shop (Kiosk/CMS)
1. Artikel nicht lieferbar
2. Bestellung wurde doppelt aufgegeben
3. Kunde hat telefonisch storniert
4. Abholung nicht möglich
5. Sonstiger Grund

### Metzger (Kiosk/CMS)
1. Ware nicht verfügbar
2. Bestellung wurde doppelt aufgegeben
3. Kunde hat telefonisch storniert
4. Mindestbestellmenge nicht erreicht
5. Sonstiger Grund

### Mittagstisch (bereits vorhanden)
1. Gericht ist leider ausverkauft
2. Bestellung wurde doppelt aufgegeben
3. Bestellschluss bereits überschritten
4. Kunde hat telefonisch storniert
5. Sonstiger Grund

## Dateien
- `static-site/kiosk.html` – Admin-Storno-Dialoge für Shop und Metzger
- `static-site/cms.js` – CMS-Storno-Dialoge für Shop und Metzger
- `static-site/shop.html` – Kunden-Inline-Storno mit Begründung
- `static-site/bestellstatus.html` – Kunden-Storno für Fleisch und Mittagstisch mit Custom-Modal-Dialog + Toast-Notifications
- `api/lunch-order/__init__.py` – Kunden-Storno-Schutzprüfung (nur bei Status 0)
