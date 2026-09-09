# CMS im Kiosk-Design — Implementation Plan

> Gehört zu [spec.md](./spec.md). Keine Verhaltensweise in diesem Plan, die
> nicht in der Spezifikation steht.

**Status:** Stufe 0–2 umgesetzt · Stufe 3 (Feinschliff) und 4 (Umschalten) offen

**Last updated:** 2026-09-09

## 1. Das Designschema — festgehalten

Damit „dasselbe Design" nicht Auslegungssache ist, hier das Schema, das im
Kiosk-Umbau entstanden ist und jetzt Grundlage wird. Es steht heute in
[css/kiosk-neu.css](../../static-site/css/kiosk-neu.css) §1 und wird nach
`css/dl-design.css` herausgelöst.

### 1.1 Werte

| Bereich | Werte |
| --- | --- |
| **Bedienmaß** | `--tap: 48px` (Regelfall), `--tap-min: 44px` (Untergrenze aus der Konstitution) |
| **Abstände** | `--gap: 10/12/14/16px`, `--pad: 12/14/16/20px` — wachsen mit der Breite |
| **Rundungen** | `--r-s: 10px`, `--r-m: 14px`, `--r-l: 18px` |
| **Schrift** | `--schrift-klein: 12px`, `--schrift-normal: 14px`, `--schrift-gross: 16px`; Zeilenhöhe `--zh: 1.35`, Überschriften 1.3 |
| **Hausfarbe** | `--gr: #2e7d4f`, dunkel `--gr-d: #1b5e3a`, Fläche hell `--gr-l: #e8f3ec`, sehr hell `--gr-t: #f5faf7` |
| **Text** | `--ink: #132a1e`, zurückgenommen `--mut: #688073` |
| **Flächen** | Seite `--flaeche: #f1f5f2`, Karte `--karte: #fff`, Linie `--line: #e1ebe5` |
| **Zustände** | Hinweis `--amb: #b45309` · Nachricht `--blu: #1d4ed8` · Abbruch `--red: #b91c1c`, je mit heller Fläche und Rand |
| **Schatten** | `--schatten-1` (Karte), `--schatten-2` (angehoben), `--schatten-blatt` (Dialog) |
| **Umschaltpunkte** | 640 px (Tablet) · 1180 px (breit) · 1620 px (sehr breit) |

### 1.2 Regeln

1. **Rasterhülle statt Fließtext.** Kopf, Navigation, Inhalt und Fußleiste
   liegen in einem Raster; nur der Inhaltsbereich rollt.
2. **Navigation wandert mit der Breite.** Telefon unten, ab 640 px links
   schmal, ab 1180 px links breit mit Beschriftung.
3. **Klebende Leisten rasten an der Panelkante ein**, nicht am Inhaltsrand:
   `top: calc(var(--pad) * -1)`. (Diese Falle ist im Kiosk dreimal
   aufgetreten — sie gehört ins Schema, nicht in die Erinnerung.)
4. **Dialoge sind Blätter.** Telefon: Blatt am unteren Rand mit Griff.
   Ab 640 px mittige Karte. Ab 1180 px angedockte Spalte rechts.
   Kopf und Fußleiste des Dialogs bleiben stehen, nur der Rumpf rollt.
5. **44 px Antippfläche**, notfalls über durchsichtige Ränder, damit die
   sichtbare Fläche schlank bleiben darf.
6. **Höchstens halbfett** (`font-weight ≤ 600`). Fett wirkt auf dem Bildschirm
   im Laden unruhig.
7. **Kein abgeschnittener Text, keine waagerechten Rollstreifen** — geprüft von
   320 bis 1920 px.
8. **Zeilenhöhe nie unter 1,3** bei Überschriften; darunter werden die
   Umlautpunkte gekappt.
9. **Ein Wert, eine Stelle.** Farben und Maße kommen aus dem Schema, nicht aus
   dem Element.
10. **Dunkelmodus über `html[data-theme="dark"]`**, nur Werte werden getauscht.

### 1.3 Was das Schema NICHT vorschreibt

Den inhaltlichen Aufbau eines Bereichs. Wochenplan bleibt Wochenplan.

## 2. Warum das CMS anders liegt als der Kiosk

Der Kiosk-Umbau beruhte auf einem glücklichen Umstand: **das gesamte Aussehen
steckte in einem einzigen `<style>`-Block**, die Module erzeugten Elemente mit
festen Klassennamen. Blatt tauschen, Klassennamen behalten — fertig, und der
Funktionserhalt war bauartbedingt.

Im CMS ist das **nicht** so:

| Befund | Zahl | Folge |
| --- | --- | --- |
| `style="…"`-Attribute | 2 306 | Überstimmen jedes Gestaltungsblatt (Gewicht 1000) |
| Deklarationen darin | 7 528 | Zwei Drittel des Aussehens liegen hier |
| davon **verschiedene** | **741** | **Maschinell abbildbar** |
| eingebettetes `<style>` | 615 Zeilen | Der kleinere Teil des Aussehens |
| `getElementById`/`querySelector` | ~915 | Markup darf sich nicht verschieben |
| `onclick`-Attribute | 104 | Müssen zeichengleich erhalten bleiben |
| `data-action` | 119 | Zentral delegiert — Markup-Änderungen hier unkritisch |

Ein reiner Blattaustausch würde also fast nichts bewirken; ein Neubau der
Oberfläche wäre bei 915 DOM-Kopplungen unverantwortlich. Der Weg liegt
dazwischen — und die Zahl **741** ist der Grund, warum er gangbar ist.

## 3. Architektur

### 3.1 Erzeugen statt kopieren

```text
   static-site/cms.html            ← einzige gepflegte Quelle (unverändert)
            │
            ▼
   tools/build-cms-neu.js          ← benannte Umformungsregeln U1…U7
            │
            ├──► static-site/cms-neu.html      Prototyp mit Live-Daten
            └──► static-site/css/cms-neu.css   herausgelöstes Blatt

   tools/pruef-cms-abgleich.js     ← vergleicht alt/neu: Kennungen, Aufrufe,
                                     Felder, Klassen  → 0 Fehlstellen
```

Alles, was keine Regel trifft, wird **zeichengleich** übernommen. Der Umbau
ist damit als Liste von Regeln lesbar und prüfbar — nicht als 4 000-Zeilen-Diff.

### 3.2 Die Umformungsregeln

| Regel | Anker in `cms.html` | Wirkung |
| --- | --- | --- |
| **U1** | `<style>` … `</style>` (Z. 24–639) | Nach `css/cms-neu.css` ausgelagert und dort neu geschrieben |
| **U2** | Kopfbereich der Anwendung | Neue Kopfzeile im Rasterbereich `hd` — alle vorhandenen Bedienelemente bleiben, samt Kennungen und `onclick` |
| **U3** | Reiterleiste (Z. 674–718) | Neue Navigation mit Gruppen; `class="cms-tab"`, `data-action="tab"`, `data-id`, `id="cms-tab-*"` bleiben **unverändert** |
| **U4** | `#cms-app` | Umschlossen von der Rasterhülle `.dl-app` |
| **U5** | alle `style="…"` in `cms.html` | Werte über `tools/cms-stilwerte.json` auf das Schema gezogen (F4) |
| **U6** | vor `</body>` | `css/dl-design.css` und `css/cms-neu.css` eingebunden |
| **U7** | `<title>` und Kopf | Hinweisstreifen „Entwurf — wirkt auf echte Daten" (F5) |

Greift ein Anker nicht, **bricht das Werkzeug ab**. Ein stillschweigend
übersprungener Umbau wäre der gefährlichste Fehler.

### 3.3 Die Inline-Umwertung (U5) im Einzelnen

Das Verfahren rührt den **Mechanismus** nicht an — es bleiben gleich viele
`style="…"`-Attribute mit gleicher Reihenfolge der Deklarationen. Nur die
**Werte** wandern auf das Schema:

```text
   style="font-size:12px;font-weight:600;color:#374151"      (71 ×)
        ▼
   style="font-size:var(--schrift-klein);font-weight:600;color:var(--ink)"
```

Zuordnung nach drei Klassen:

| Klasse | Beispiele | Behandlung |
| --- | --- | --- |
| **Zustand** | `display`, `visibility`, `position`, `z-index`, `transform`, `flex`, `order`, `width`/`height` an Balken | **Unverändert**. `cms.js` schreibt und liest diese zur Laufzeit. |
| **Gestaltung, zugeordnet** | Farben, Schriftgrade, Abstände, Rundungen, Rahmen, Schatten | Auf Schemawert gezogen |
| **Gestaltung, nicht zugeordnet** | Einzelfälle | **Bleibt stehen** und wird im Bericht genannt |

Nach jedem Lauf gibt das Werkzeug aus: *umgestellt N · unverändert M ·
nicht zugeordnet K (mit Fundstellen)*. Die Liste der nicht zugeordneten
Deklarationen ist der Arbeitsvorrat für die nächste Runde — sie schrumpft
sichtbar, statt unter den Tisch zu fallen.

Für `cms.js` (580 weitere Inline-Gestaltungen in erzeugtem Markup) gilt
dasselbe, aber **erst in Stufe 3** und **von Hand geprüft** — dort steht die
Gestaltung in Zeichenkettenverkettung und lässt sich nicht so sicher
maschinell fassen.

### 3.4 Der Abgleich — der eigentliche Sicherheitsgurt

`tools/pruef-cms-abgleich.js` liest beide Seiten und vergleicht:

| Merkmal | Erwartung |
| --- | --- |
| DOM-Kennungen (`id`) | jede alte existiert neu |
| `onclick`-Aufrufe | Zeichengleich vorhanden |
| `data-action` / `data-id` | vollständig |
| Formularfelder | Kennung, Typ, `name` gleich |
| Klassennamen, die `cms.js` sucht | vorhanden |
| Globale Funktionsnamen | unverändert |

**Fehlstellen = 0** ist die Abnahmebedingung von Stufe 1. Der Bericht ist
kurz genug, um ihn bei jeder Änderung erneut zu lesen.

### 3.5 Navigation für 15 Bereiche

Die Kiosk-Leiste trägt 8 Reiter. 15 brauchen Gruppen:

| Gruppe | Bereiche |
| --- | --- |
| **Laden** | Wochenplan · Öffnungszeiten · Angebote · Sortiment |
| **Website** | Homepage · News · Galerie · Design |
| **Verkauf** | Bestellungen · Metzger · Statistik |
| **Kanäle** | Social · Push |
| **System** | Einstellungen · Hilfe |

- **Telefon (< 640 px):** Kopfzeile mit Bereichsnamen und Knopf „Bereich
  wechseln"; die Liste öffnet als Blatt von unten. 15 Einträge in einer
  Fußleiste wären nicht treffbar.
- **Ab 640 px:** schmale Seitenleiste, Sinnbilder mit Kurzbeschriftung,
  Gruppen durch Linien getrennt.
- **Ab 1180 px:** breite Seitenleiste, Gruppenüberschriften ausgeschrieben.

Die bunten Reiterfarben werden zum **Farbpunkt der Gruppe** — die Wiedererkennung
bleibt, das Bild wird ruhig.

## 4. Der Weg in Stufen

Jede Stufe ist für sich abnehmbar und für sich umkehrbar.

### Stufe 0 — Grundlage (½ Tag)

- `css/dl-design.css` aus `kiosk-neu.css` §1 herauslösen.
- Kiosk umstellen, **Sichtprüfung: unverändert**. (TC-F1-01)
- **Ergebnis:** Ein Schema, zwei Nutzer.

### Stufe 1 — Gerüst und Prototyp (2–3 Tage)

- `tools/build-cms-neu.js` mit U1–U4, U6, U7.
- `css/cms-neu.css`: Rasterhülle, Kopfzeile, Navigation, Dialogmuster,
  Bedienmaße — auf den **vorhandenen** Klassennamen.
- `tools/pruef-cms-abgleich.js`, bis **0 Fehlstellen**.
- **Ergebnis:** `http://localhost:8789/cms-neu.html` — das CMS mit neuer Hülle
  und echten Daten. Innen noch das alte Bild.
- **Abnahme:** Alle 15 Bereiche durchklicken. Funktioniert alles?

### Stufe 2 — Das Bild (3–4 Tage) ✔ umgesetzt

- Zuordnungstabelle `tools/cms-stilwerte.json` aufbauen; Regel U5 anschalten.
- Reihenfolge nach Häufigkeit: die 20 häufigsten Werte decken schon über die
  Hälfte der Vorkommen ab.
- Nach jeder Runde: Prototyp ansehen, Bericht der nicht zugeordneten
  Deklarationen abarbeiten.
- **Ergebnis:** 1 802 Deklarationen umgewertet; 330 bleiben bewusst stehen
  (Fremdfarben wie WhatsApp-Grün, Kennfarben einzelner Bereiche, `none`).
  Zusätzlich zeigen die alten Seitenvariablen (`--c-m-*`, `--c-green` …) auf
  das Schema — dadurch folgt auch die Grundgestaltung dem neuen Bild, ohne
  dass dort eine Regel angefasst wurde.
- **Abnahme:** Bereich für Bereich im Prototyp, mit Live-Daten.

### Stufe 3 — Feinschliff (2–3 Tage) ✔ Darstellung geprüft

- Bereiche, die nach Stufe 2 noch fremd wirken, einzeln nachziehen —
  zuerst die täglich benutzten: Wochenplan, Angebote, Bestellungen.
- Inline-Gestaltung in `cms.js` (580 Stellen) dort angleichen, wo sie stört.
- Prüfung über 8 Breiten × 15 Bereiche **und die Dialoge**
  (`tools/pruef-cms-darstellung.js`, 136 Kombinationen); Dunkelmodus.
- **Ergebnis:** 0 Befunde. Zum Vergleich hat die gewohnte Fassung über
  dieselben 136 Kombinationen **119 Befunde** (zu kleine Bedienelemente,
  herausragende Inhalte).
- **Offen:** die Feinarbeit an einzelnen Bereichen und an der
  Inline-Gestaltung in `cms.js`.

### Bekannte Grenze der Umgebung: Produktbilder

Die Produktfotos in Angeboten und Flyern liegen in **SharePoint** und werden
über MSAL geholt. Das verlangt eine Microsoft-Anmeldung in einem eigenen
Fenster. Auf `http://localhost:…` lässt der Browser dieses Fenster nicht zu
(`popup_window_error`), deshalb bleiben die Kacheln im Prototyp leer.

**Das betrifft die gewohnte Fassung genauso** — nachgewiesen durch denselben
Ablauf auf `cms.html`. Es ist keine Folge des Umbaus und auf der
ausgelieferten Seite nicht vorhanden.

### Stufe 4 — Umschalten (½ Tag)

- `cms.html` → `cms-klassisch.html` (Rückfallweg), erzeugter Stand → `cms.html`.
- Ab dann ist `cms-klassisch.html` die gepflegte Quelle — genau wie beim
  Kiosk mit `kiosk-klassisch.html`.
- **Abnahme:** Der Auftraggeber gibt frei.

**Aufwand insgesamt: rund 8–11 Arbeitstage.** Ein Neubau der Oberfläche läge
bei einem Vielfachen und trüge 915 Kopplungen als Risiko.

## 5. File-Level Change Map

### Neu

| Datei | Zweck |
| --- | --- |
| `static-site/css/dl-design.css` | Das gemeinsame Schema (Stufe 0) |
| `static-site/css/cms-neu.css` | Gestaltungsblatt des CMS |
| `static-site/cms-neu.html` | Erzeugter Prototyp |
| `tools/build-cms-neu.js` | Umformung U1–U7 |
| `tools/pruef-cms-abgleich.js` | Funktionsabgleich |
| `tools/cms-stilwerte.json` | Zuordnungstabelle der Inline-Werte |
| `tests/cms-neu.spec.js` | Playwright: F3, F6 über drei Größen |

### Geändert

| Datei | Änderung |
| --- | --- |
| `static-site/css/kiosk-neu.css` | §1 entfällt, verweist auf `dl-design.css` |
| `static-site/kiosk-klassisch.html` | `dl-design.css` eingebunden, danach `tools/build-kiosk-neu.js` |
| `static-site/cms.html` | **Erst in Stufe 4** (Umbenennung) |

### Unangetastet

`cms.js`, `social.js`, `social-poster.js`, `hilfe-popup.js`, `admin-auth.js`,
`dl-confirm.js`, sämtliche API-Ordner.

## 6. Test Strategy

| Ebene | Werkzeug | Deckt ab |
| --- | --- | --- |
| Funktionserhalt | `tools/pruef-cms-abgleich.js` | F2 — läuft bei jeder Änderung, Sekunden |
| Umwertung | Bericht von `build-cms-neu.js` | F4 |
| Oberfläche | `tests/cms-neu.spec.js` (3 Größen) | F3, F6 |
| **Erscheinungsbild vollständig** | `tools/pruef-cms-darstellung.js` — **8 Breiten × 15 Bereiche + Dialoge = 136 Kombinationen** | F3, F6 |
| Bestand | `tests/cms-social.spec.js` (13 Fälle) | Rückfallprobe |

Die Playwright-Datei deckt die drei Größen ab, die die Konstitution fordert.
Das reicht für einen Umbau dieser Größe nicht: Im Laden stehen Geräte von
320 bis 1920 px, und die Dialoge sind ein eigener Bauteil, den ein
Reiterdurchlauf nie berührt. Deshalb das zweite Werkzeug — es fährt das
vollständige Kreuz ab und lässt sich auch auf `cms.html` anwenden, um zu
zeigen, ob ein Befund neu ist.

**Zur Anmeldung in Tests:** Die vorhandene Testdatei prüft nur die Struktur,
weil das CMS ein Kennwort verlangt. Das bleibt so — die Tests setzen die
Anmeldung über eine abgefangene Antwort des Anmeldeendpunkts, **nie** über ein
hinterlegtes Kennwort.

## 7. Risiken

| Risiko | Wirkung | Umgang |
| --- | --- | --- |
| Eine Kennung geht verloren | Ein Bereich funktioniert nicht mehr | Abgleich mit 0 Fehlstellen als Abnahmebedingung jeder Stufe |
| Umwertung trifft eine Zustandsangabe | Etwas ist unsichtbar oder immer sichtbar | Zustandsangaben sind ausdrücklich ausgenommen; TC-F4-01 prüft jedes `display` |
| `cms.js` liest einen Stilwert und rechnet damit | Falsches Verhalten | Vor Stufe 2: alle `style.`-Lesezugriffe in `cms.js` auflisten und die betroffenen Angaben von der Umwertung ausnehmen |
| 15 Bereiche in der Navigation | Auf dem Telefon nicht treffbar | Blatt statt Fußleiste (F3) |
| Zwei Dateien laufen auseinander | Doppelpflege | `cms.html` bleibt bis Stufe 4 einzige Quelle; danach `cms-klassisch.html` |
| Prototyp wirkt auf echte Daten | Versehentliche Änderung | Hinweisstreifen; die Abnahme läuft lesend, Schreibproben nur abgesprochen |

## 8. Was zuerst zu entscheiden ist

Zwei Punkte brauchen ein Wort des Auftraggebers, bevor Stufe 1 beginnt:

1. **Die Gruppierung der 15 Bereiche** (Abschnitt 3.5) — Vorschlag aus der
   Sache heraus, leicht zu ändern.
2. **Die bunten Reiterfarben** — Vorschlag: als Farbpunkt der Gruppe erhalten,
   nicht als Schriftfarbe.

Alles Übrige ist entschieden und in der Spezifikation festgehalten.

## Traceability

| Requirement | Plan-Abschnitt | Stufe |
| --- | --- | --- |
| F1 Gemeinsame Grundlage | 1, 5 | 0 |
| F2 Funktionserhalt | 3.4 | 1 (und jede weitere) |
| F3 Navigation | 3.5 | 1 |
| F4 Inline-Gestaltung | 3.3 | 2 |
| F5 Prototyp | 3.1, Stufe 1 | 1 |
| F6 Bedienbarkeit | Stufe 3, 6 | 3 |
| F7 Umkehrbarkeit | 3.1, Stufe 4 | 4 |
