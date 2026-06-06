# SharePoint-Bilder – Architektur & Ablaufdiagramme

> Dieses Dokument beschreibt alle Wege, über die Artikelbilder im Dorfladen-Projekt aus SharePoint **gelesen** und **geschrieben** werden.

---

## 1. Überblick – Datenquellen

| Speicher | Inhalt | Schlüssel (Dateiname) | Zugriff |
|---|---|---|---|
| **SharePoint – Werbebilder** (`SP_FOLDER`) | Bilder nach Edeka-Nr | `{edeka_nr}.jpg/png` | Graph API |
| **SharePoint – StrichcodeBilder** (`SP_BARCODE_FOLDER`) | Bilder nach Strichcode/EAN | `{strichcode}.jpg/png` | Graph API |
| **Dataverse** (`dl_werbebilds`) | Metadaten (kein base64 mehr) | `dl_artikelnummer` = Strichcode | OData REST |

### SharePoint-Konstanten (identisch in allen Komponenten)

```
SP_DRIVE           = "b!bwUha0ab4EeiA3xXHK-Oobhv5tJbeYJDiF9pTB-f1kC-Mp-AY0brRrr2WigdYK4A"
SP_FOLDER          = "01USAQ6ERA5Q2V5M2I2BCKYOFVH2WWICOC"      ← Werbebilder (Edeka-Nr)
SP_BARCODE_FOLDER  = "01USAQ6ESD7NCQ4ZM6GRHK5IRCMJMSRSVH"      ← StrichcodeBilder (EAN/Strichcode)
```

### Authentifizierung

| Kontext | Methode | Scope |
|---|---|---|
| **Backend** (Azure Functions) | MSAL Confidential Client (Client-ID + Secret) | `https://graph.microsoft.com/.default` |
| **CMS Frontend** (cms.js) | MSAL Public Client (Browser-Login via Popup/Redirect) | `Files.ReadWrite.All` |
| **Shop/Freigabe Frontend** | Kein direkter Graph-Zugriff – geht über Backend-API | – |

---

## 2. Übersicht der Funktionalitäten

```
┌──────────────────────────────────────────────────────────────────────┐
│                        BILDER LESEN                                  │
│                                                                      │
│  A) Shop (shop.html)           → ShopImages → /api/werbebilder      │
│  B) Artikelfreigabe            → ShopImages → /api/werbebilder      │
│  C) CMS Angebot erstellen      → MSAL direkt → Graph API            │
│     (NUR StrichcodeBilder, kein Werbebilder-Fallback)               │
│  D) CMS Angebot erstellen      → Backend-Fallback → /api/werbebilder│
│  E) Sonderangebote (index.html) → /api/werbebilder?sharepoint=1     │
│                                                                      │
├──────────────────────────────────────────────────────────────────────┤
│                       BILDER SCHREIBEN                               │
│                                                                      │
│  F) Artikelfreigabe Upload     → /api/werbebilder POST               │
│  G) CMS „Bild hochladen"      → MSAL direkt → Graph API PUT         │
│  H) Batch-Script               → Graph API PUT (automatisiert)       │
│                                                                      │
└──────────────────────────────────────────────────────────────────────┘
```

---

## 3. Bilder LESEN

### A) Shop (`shop.html`) – Bilder laden

```
┌──────────────┐     ┌────────────────┐     ┌──────────────────────────┐
│  shop.html   │     │ shop-images.js │     │  /api/werbebilder        │
│              │     │  (ShopImages)  │     │  (__init__.py)           │
└──────┬───────┘     └───────┬────────┘     └────────────┬─────────────┘
       │                     │                            │
       │  loadImages(items)  │                            │
       │────────────────────►│                            │
       │                     │                            │
       │     loadBatch()     │                            │
       │  batchSize=20       │                            │
       │  cacheKey=artnr     │                            │
       │                     │  POST /api/werbebilder     │
       │                     │  ?sharepoint=1             │
       │                     │  {articles: [{             │
       │                     │    artikelnummer,           │
       │                     │    edeka_nr,                │
       │                     │    strichcode               │
       │                     │  }, ...]}                   │
       │                     │───────────────────────────►│
       │                     │                            │
       │                     │                 ┌──────────┴──────────┐
       │                     │                 │ 1. Dataverse-Suche  │
       │                     │                 │    dl_artikelnummer  │
       │                     │                 │    = artikelnummer   │
       │                     │                 │                     │
       │                     │                 │ 2. SharePoint $batch│
       │                     │                 │    StrichcodeBilder:│
       │                     │                 │     {sc}.jpg/png    │
       │                     │                 │    Werbebilder:     │
       │                     │                 │     {enr}.jpg/png   │
       │                     │                 │                     │
       │                     │                 │ 3. Download → base64│
       │                     │                 │    _download_as_b64 │
       │                     │                 │                     │
       │                     │                 │ 4. Merge:           │
       │                     │                 │    SP base64 > DV   │
       │                     │                 └──────────┬──────────┘
       │                     │                            │
       │                     │  [{dl_artikelnummer,       │
       │                     │    dl_bild_base64,          │
       │                     │    dl_download_url}]        │
       │                     │◄───────────────────────────│
       │                     │                            │
       │  keyMap-Auflösung:  │                            │
       │  dl_artikelnummer   │                            │
       │  → artikelnummer    │                            │
       │  (=cacheKey)        │                            │
       │                     │                            │
       │  onImage(key, src)  │                            │
       │◄────────────────────│                            │
       │                     │                            │
       │  setArticleImage()  │                            │
       │  img.src = base64   │                            │
       ▼                     ▼                            ▼
```

**Wichtig:** Nur `dl_bild_base64` wird verwendet. `dl_download_url` wird ignoriert (SharePoint-Auth nötig).

---

### B) Artikelfreigabe (`shop-freigabe.html`) – Bilder laden

```
┌────────────────────┐     ┌────────────────┐     ┌──────────────────────┐
│ shop-freigabe.html │     │ shop-images.js │     │ /api/werbebilder     │
└─────────┬──────────┘     └───────┬────────┘     └──────────┬───────────┘
          │                        │                          │
          │  loadImages(articles)  │                          │
          │  toLoad = [{           │                          │
          │    artikelnummer:       │                          │
          │     edeka_nr||strich,  │                          │
          │    edeka_nr,           │                          │
          │    strichcode          │                          │
          │  }]                    │                          │
          │───────────────────────►│                          │
          │                        │                          │
          │  loadBatch()           │                          │
          │  batchSize=20          │                          │
          │  cacheKey=strichcode   │  POST (gleich wie A)     │
          │                        │─────────────────────────►│
          │                        │                          │
          │                        │  [...Ergebnisse...]      │
          │                        │◄─────────────────────────│
          │                        │                          │
          │  keyMap-Auflösung:     │                          │
          │  dl_artikelnummer      │                          │
          │  → strichcode          │                          │
          │  (über Reverse-Map)    │                          │
          │                        │                          │
          │  onImage(sc, src)      │                          │
          │◄───────────────────────│                          │
          │                        │                          │
          │  imgCache[sc] = src    │                          │
          │  img.src = base64      │                          │
          │                        │                          │
          │  onBatchDone(batch,    │                          │
          │    found)              │                          │
          │  → Reset imgRequested  │                          │
          │    für fehlende        │                          │
          ▼                        ▼                          ▼
```

**Unterschied zu A):** `cacheKey` ist `strichcode` statt `artikelnummer`, und `artikelnummer` wird als `edeka_nr || strichcode` gesetzt.

---

### C) CMS – Bild aus SharePoint laden (direkter Graph-Zugriff)

> **Seit Juni 2026:** CMS arbeitet ausschließlich mit Strichcode.
> Das Feld `artikelnummer` enthält immer den Strichcode.
> Es wird **nur** im StrichcodeBilder-Ordner gesucht (kein Werbebilder-Fallback).

```
┌──────────┐      ┌──────────────┐      ┌──────────────────────┐
│  cms.js  │      │  MSAL Public │      │  Graph API           │
│          │      │  Client      │      │  (graph.microsoft.   │
│          │      │  (Browser)   │      │   com)               │
└────┬─────┘      └──────┬───────┘      └──────────┬───────────┘
     │                   │                          │
     │  loadImageFrom    │                          │
     │  SharePoint(sc)   │                          │
     │──────────────────►│                          │
     │                   │  acquireTokenSilent()    │
     │                   │  oder acquireTokenPopup() │
     │                   │─────────────────────────►│ (Login)
     │                   │  access_token            │
     │                   │◄─────────────────────────│
     │                   │                          │
     │  _searchFolder    │                          │
     │  ForImage()       │                          │
     │                   │                          │
     │  StrichcodeBilder/{sc}.jpg/png/gif/jpeg      │
     │───────────────────────────────────────────────►│
     │                   │    200 OK + item metadata │
     │◄──────────────────────────────────────────────│
     │                   │                          │
     │  GET /items/{id}/content                     │
     │───────────────────────────────────────────────►│
     │                   │    Bild-Binary (ArrayBuf) │
     │◄──────────────────────────────────────────────│
     │                   │                          │
     │  → btoa() → data:image/...;base64,...        │
     │                   │                          │
     │  Falls nicht gefunden:                       │
     │  Fallback → loadImageFromBackend(sc,sc)      │
     │     → POST /api/werbebilder                  │
     │                   │                          │
     │  _imgCacheSet()   │                          │
     ▼                   ▼                          ▼
```

**Suchpfad (vereinfacht):**
1. `StrichcodeBilder/{strichcode}.{ext}` (Graph API direkt)
2. Backend-Fallback via `/api/werbebilder` (Dataverse)

> ⚠️ **Kein Werbebilder-Ordner mehr!** Der Werbebilder-Fallback wurde entfernt.

---

## 4. Bilder SCHREIBEN

### F) Artikelfreigabe – Upload über Backend-API

```
┌────────────────────┐     ┌────────────────────────┐     ┌─────────────┐
│ shop-freigabe.html │     │ /api/werbebilder POST  │     │ SharePoint  │
└─────────┬──────────┘     └───────────┬────────────┘     └──────┬──────┘
          │                            │                         │
          │  1. FileReader             │                         │
          │     → base64 raw           │                         │
          │                            │                         │
          │  2. compressImage()        │                         │
          │     500×500, JPEG 75%      │                         │
          │     oder PNG               │                         │
          │                            │                         │
          │  3. POST /api/werbebilder  │                         │
          │  {dl_artikelnummer: sc,    │                         │
          │   dl_bild_base64: data}    │                         │
          │───────────────────────────►│                         │
          │                            │                         │
          │                 ┌──────────┴──────────┐              │
          │                 │ a) base64 → PIL     │              │
          │                 │    → RGBA → PNG     │              │
          │                 │                     │              │
          │                 │ b) Alte .jpg/.jpeg   │              │
          │                 │    löschen (GET+DEL) │              │
          │                 │────────────────────────────────────►│
          │                 │                     │   404/200     │
          │                 │◄───────────────────────────────────│
          │                 │                     │              │
          │                 │ c) PUT {sc}.png     │              │
          │                 │    _put_with_retry   │              │
          │                 │    (Retry bei 429)   │              │
          │                 │────────────────────────────────────►│
          │                 │                     │   200/201     │
          │                 │◄───────────────────────────────────│
          │                 │                     │              │
          │                 │ d) Dataverse upsert │              │
          │                 │    dl_download_url   │              │
          │                 │    dl_bild_base64="" │              │
          │                 └──────────┬──────────┘              │
          │                            │                         │
          │  {success:true, id, url}   │                         │
          │◄───────────────────────────│                         │
          │                            │                         │
          │  imgCache[sc] = data       │                         │
          │  DOM-Thumbnail ersetzen    │                         │
          ▼                            ▼                         ▼
```

---

### G) CMS „Angebot erstellen" – Upload über MSAL (direkt)

```
┌──────────┐      ┌──────────────┐      ┌──────────────────────┐
│  cms.js  │      │  MSAL Public │      │  Graph API           │
│          │      │  Client      │      │                      │
└────┬─────┘      └──────┬───────┘      └──────────┬───────────┘
     │                   │                          │
     │  uploadBildSP     │                          │
     │  (Button-Click)   │                          │
     │                   │                          │
     │  1. Strichcode    │                          │
     │     auflösen      │                          │
     │     (ArtikelCache)│                          │
     │                   │                          │
     │  2. File Picker   │                          │
     │     → FileReader  │                          │
     │     → base64 raw  │                          │
     │                   │                          │
     │  3. cmsCompress   │                          │
     │     Image()       │                          │
     │     500×500       │                          │
     │                   │                          │
     │  4. uploadImage   │                          │
     │     ToSharePoint()│                          │
     │──────────────────►│                          │
     │                   │  getGraphToken()         │
     │                   │─────────────────────────►│
     │                   │  access_token            │
     │                   │◄─────────────────────────│
     │                   │                          │
     │  base64→Blob      │                          │
     │  PUT /drives/     │                          │
     │  {SP_DRIVE}/items/│                          │
     │  {SP_BARCODE_     │                          │
     │   FOLDER}:/       │                          │
     │  {sc}.{ext}:/     │                          │
     │  content          │                          │
     │──────────────────────────────────────────────►│
     │                   │                          │
     │                   │  200/201 (item metadata) │
     │◄─────────────────────────────────────────────│
     │                   │                          │
     │  _imgCache        │                          │
     │  Invalidate()     │                          │
     │                   │                          │
     │  toast('Bild als  │                          │
     │   {sc} hochge-    │                          │
     │   laden!')        │                          │
     ▼                   ▼                          ▼
```

**Unterschied zu F):**
- Kein Backend involviert – Browser spricht direkt mit Graph API
- Kein PIL/PNG-Konvertierung – Dateiformat bleibt wie vom Canvas (jpg/png)
- Kein Dataverse-Upsert (nur SharePoint)
- Benutzer muss im Browser eingeloggt sein (MSAL Popup/Redirect)

---

### H) Batch-Script (`scripts/fetch-product-images.py`)

```
┌────────────────────┐     ┌─────────────┐     ┌──────────────┐     ┌─────────────┐
│ fetch-product-     │     │ Dataverse   │     │ sellyorder / │     │ SharePoint  │
│ images.py          │     │             │     │ OpenFoodFacts│     │             │
└─────────┬──────────┘     └──────┬──────┘     └──────┬───────┘     └──────┬──────┘
          │                       │                    │                    │
          │  1. Alle Artikel      │                    │                    │
          │     der letzten       │                    │                    │
          │     6 Monate laden    │                    │                    │
          │──────────────────────►│                    │                    │
          │  cr5d4_tables         │                    │                    │
          │◄──────────────────────│                    │                    │
          │                       │                    │                    │
          │  2. sp_batch_check()  │                    │                    │
          │     Welche haben      │                    │                    │
          │     schon ein Bild?   │                    │                    │
          │     Graph $batch GET  │                    │                    │
          │────────────────────────────────────────────────────────────────►│
          │     {sc}.png, {sc}.jpg│                    │                    │
          │◄───────────────────────────────────────────────────────────────│
          │                       │                    │                    │
          │  3. Für fehlende:     │                    │                    │
          │     search_product_   │                    │                    │
          │     image()           │                    │                    │
          │                       │                    │                    │
          │     a) sellyorder     │                    │                    │
          │        (Edeka-Nr)     │                    │                    │
          │────────────────────────────────────────────►│                   │
          │        Bild           │                    │                    │
          │◄───────────────────────────────────────────│                    │
          │                       │                    │                    │
          │     b) Open Food Facts│                    │                    │
          │        (EAN)          │                    │                    │
          │────────────────────────────────────────────►│                   │
          │                       │                    │                    │
          │  4. remove_background │                    │                    │
          │     (rembg → PNG)     │                    │                    │
          │                       │                    │                    │
          │  5. upload_to_sp()    │                    │                    │
          │     PUT {sc}.png      │                    │                    │
          │────────────────────────────────────────────────────────────────►│
          │     200/201           │                    │                    │
          │◄───────────────────────────────────────────────────────────────│
          ▼                       ▼                    ▼                    ▼
```

**Besonderheiten:**
- Läuft lokal als CLI-Script (nicht auf Azure)
- Nutzt `rembg` zum Freistellen (Hintergrund entfernen)
- Schreibt **immer als PNG** nach `StrichcodeBilder/{strichcode}.png`
- Bilder kommen von **sellyorder** (Edeka C+C) oder **Open Food Facts**
- Cache-Datei `missing-images-cache.json` merkt sich fehlende Artikel

---

## 5. Backend-API im Detail (`/api/werbebilder`)

### POST mit `{articles: [...]}` – Batch-Bildsuche

```
Eingabe:
  {articles: [{artikelnummer, edeka_nr, strichcode}, ...]}  (max 20)
  ?sharepoint=1

Ablauf:
  1. Dataverse-Suche
     Filter: dl_artikelnummer IN (artikelnummer-Liste)
     → Liefert dl_bild_base64 + dl_download_url

  2. SharePoint $batch (wenn sharepoint=1)
     Pro Artikel, je 3 Extensions (jpg, png, jpeg):
       - StrichcodeBilder/{strichcode}.{ext}
       - Werbebilder/{edeka_nr}.{ext}
     Graph $batch: max 20 Sub-Requests pro Batch
     Bei Treffer: Download → base64 via _download_as_base64()

  3. Merge:
     SP base64 überschreibt Dataverse base64
     Dataverse base64 bleibt als Fallback wenn SP leer

Ausgabe:
  [{dl_artikelnummer, dl_bild_base64, dl_download_url}, ...]
```

### POST mit `{dl_artikelnummer, dl_bild_base64}` – Einzel-Upload

```
Eingabe:
  {dl_artikelnummer: "strichcode", dl_bild_base64: "data:image/...;base64,..."}

Ablauf:
  1. base64 → PIL → RGBA → PNG (einheitliches Format)
  2. Alte .jpg/.jpeg in StrichcodeBilder löschen (Graph GET + DELETE)
  3. PUT StrichcodeBilder/{sc}.png mit _put_with_retry()
     → Retry bei 429/500/502/503/504 (max 4 Versuche, Backoff)
  4. Dataverse Upsert:
     dl_artikelnummer = sc
     dl_download_url = SP-Download-URL
     dl_bild_base64 = "" (geleert, SP ist Source of Truth)

Ausgabe:
  {success: true, id: "...", dl_download_url: "..."}
```

### GET mit `?artnrs=nr1,nr2,...` – Bildsuche für öffentliche Website

```
Eingabe:
  ?artnrs=6007,4311501457177&sharepoint=1
  (artnrs enthält jetzt immer Strichcodes)

Ablauf:
  1. Dataverse OData-Filter (max 50 Nummern)
     → dl_bild_base64 ist meist leer (SP ist Source of Truth)
  2. SharePoint-Suche für fehlende (sharepoint=1):
     _lookup_sp_images() mit strichcode = artikelnummer
     → StrichcodeBilder/{sc}.jpg/png
     → Download → base64 via _download_as_base64()

Ausgabe:
  [{dl_artikelnummer, dl_bild_base64, dl_download_url, dl_werbebildid}, ...]
```

> **Wichtig:** `sharepoint=1` ist jetzt **erforderlich** für korrekte Bildanzeige,
> da Dataverse kein base64 mehr speichert (Zeile `dl_bild_base64 = ""`).
> Wird von `app.js` und `mobile.js` automatisch angehängt.

---

## 6. `shop-images.js` – Gemeinsame Frontend-Logik

```
ShopImages.loadBatch(articleInfos, {
  apiBase:    '/api',
  batchSize:  20,                              ← muss ≤ 20 sein (Backend-Limit)
  cacheKey:   function(info) { ... },          ← shop: artikelnummer, freigabe: strichcode
  runCheck:   function() { return true; },     ← Abbruchbedingung (nur shop.html)
  onImage:    function(key, src) { ... },      ← Callback pro gefundenem Bild
  onBatchDone: function(batch, found) { ... }  ← Callback nach jedem Batch
})
```

**Reverse Key Map:**
```
Für jeden Artikel im Batch wird eine Map gebaut:
  keyMap[cacheKey]     = cacheKey
  keyMap[artikelnummer] = cacheKey
  keyMap[strichcode]    = cacheKey
  keyMap[edeka_nr]      = cacheKey

Die API gibt dl_artikelnummer zurück → keyMap löst auf den cacheKey auf.
```

**Nur base64 wird akzeptiert** – `dl_download_url` wird ignoriert (erfordert SharePoint-Auth).

---

## 7. Zusammenfassung der Pfade

```
                          ┌─────────────────────┐
                          │    SharePoint        │
                          │                      │
                          │  ┌───────────────┐   │
              edeka_nr    │  │ Werbebilder   │   │
            ┌────────────►│  │ {enr}.jpg/png │   │
            │             │  └───────────────┘   │
            │             │                      │
            │             │  ┌───────────────┐   │
            │  strichcode │  │StrichcodeBilder│  │
            │ ┌──────────►│  │ {sc}.jpg/png   │  │
            │ │           │  └───────────────┘   │
            │ │           └─────────┬────────────┘
            │ │                     │
            │ │                     │ Download-URL
            │ │                     ▼
┌───────────┴─┴──┐      ┌──────────────────┐
│ Graph API      │      │ _download_as_b64 │
│ $batch / GET   │      │ → base64 Data-URI│
└────────────────┘      └────────┬─────────┘
                                 │
                                 ▼
                        ┌──────────────────┐
                        │ /api/werbebilder │
                        │ (Azure Function) │
                        └────────┬─────────┘
                                 │ JSON Response
            ┌────────────────────┼────────────────────┐
            │                    │                    │
            ▼                    ▼                    ▼
   ┌──────────────┐    ┌────────────────┐    ┌──────────────┐
   │  shop.html   │    │shop-freigabe   │    │   cms.js     │
   │              │    │   .html        │    │  (Fallback)  │
   │  cacheKey:   │    │  cacheKey:     │    │              │
   │  artikelnr   │    │  strichcode    │    │              │
   └──────────────┘    └────────────────┘    └──────────────┘
```
