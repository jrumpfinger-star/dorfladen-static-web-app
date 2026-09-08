# Kiosk-Gesamtumbau — Übergabe

> Stand: 08.09.2026 · Spec: [spec.md](./spec.md) · Plan: [plan.md](./plan.md) ·
> Aufgaben: [tasks.md](./tasks.md)
>
> Diese Datei ist der Einstieg für den nächsten Bearbeiter. Sie beschreibt den
> tatsächlichen Zustand, nicht den geplanten.

---

## 1 Worum es geht

Der Kiosk (`static-site/kiosk.html`) ist das Werkzeug der Verkäuferinnen im
Dorfladen Oberornau. Er wird **Reiter für Reiter auf ein neues, verdichtetes
Design umgebaut**.

Der Umbau geschieht **ausschließlich auf einer Zweitseite**:

| Datei | Rolle |
| --- | --- |
| `static-site/kiosk-neu.html` | erzeugte Zweitseite, trägt den roten Hinweisstreifen „wirkt auf echte Daten" |
| `static-site/css/kiosk-neu.css` | **die zentrale Arbeitsdatei** — alle Umbauregeln |
| `static-site/js/kiosk-neu-shell.js` | additive Hilfsschicht, ändert keine Modulfunktion |
| `tools/build-kiosk-neu.js` | erzeugt `kiosk-neu.html` aus `kiosk.html` (Regeln R1–R7) |

**Unantastbar:** `static-site/kiosk.html` (Produktivkiosk), `kiosk-base.css`
(gilt für beide Kioske) und sämtliche Fachmodule (`kiosk-baecker.js`,
`kiosk-metzger-bestellung.js`, `kiosk-social.js`, …). Der Produktivbetrieb darf
durch den Umbau nicht gefährdet werden — deshalb der Weg über die Zweitseite.

---

## 2 Bindende Vorgaben des Auftraggebers

Diese Regeln sind im Lauf der Arbeit entstanden, mehrfach bekräftigt und
**nicht verhandelbar**:

1. **Bedienbarkeit vor allem.** Das Personal ist ungeschult. Erfassung muss so
   viel Hilfestellung wie möglich bieten, der Normalfall mit **einem Klick**
   erledigt sein, alles intuitiv.
2. **Kein abgeschnittener Text.** Weder `text-overflow:ellipsis` noch
   `-webkit-line-clamp` noch gekürzte Beschriftungen.
3. **Keine waagerechten Rollstreifen.** Was man schieben muss, sieht man nicht —
   also weiß man nicht, dass es existiert.
4. **Nur halbfett** (`font-weight:600`), niemals fett.
5. **Wenig Leerraum, wenig Scrollen**, Elemente sauber aneinander ausgerichtet.
6. **Menüs mit Benachrichtigungen bleiben immer sichtbar.**
7. **Echte Daten**, keine Beispieldaten. Geprüft wird über den Dev-Proxy.
8. **Alle Auflösungen prüfen**: 320, 360, 375, 390, 412, 430, 744, 768, 1024,
   1280, 1920 px.
9. **Abnahme Reiter für Reiter durch den Auftraggeber.** Erst wenn ein Reiter
   abgenommen ist, geht es zum nächsten.

Der akzeptierte Weg, Platz zu sparen, ist **Redundanz zu entfernen, nicht
Inhalt**: Wo Symbol *und* Wort *und* Zählerpille dasselbe sagten, fielen Symbol
und Pille weg — das Wort blieb. Und: **lieber eine Zeile mehr als ein
abgeschnittenes Wort.**

---

## 3 Zustand der Arbeitskopie

**Nichts vom Umbau ist eingecheckt.** `git status` zeigt alle Umbaudateien als
unversioniert (`??`):

```
static-site/kiosk-neu.html          4890 Zeilen   erzeugt
static-site/css/kiosk-neu.css       2183 Zeilen   Arbeitsdatei
static-site/css/kiosk-base.css      1364 Zeilen   aus kiosk.html ausgelagert
static-site/js/kiosk-neu-shell.js    223 Zeilen
tools/build-kiosk-neu.js             225 Zeilen
tools/pruef-kiosk-neu.js             342 Zeilen   führendes Prüfskript
specs/kiosk-umbau/                                spec/plan/tasks
```

Letzter Commit im Zweig ist `e9b25f8` (Social-Bilder über Proxy) und hat mit
dem Umbau nichts zu tun.

> **Achtung — `kiosk-base.css` ist eine Kopie, kein gemeinsames Blatt.**
> Geprüft: `kiosk.html` verweist **nirgends** auf `kiosk-base.css`, sondern
> behält seinen eingebetteten Stil. Nur `kiosk-neu.html` lädt es (Z. 23), davor
> `kiosk-neu.css` (Z. 24) und am Ende `kiosk-neu-shell.js` (Z. 4789).
>
> Daraus folgt zweierlei:
> 1. **Gut:** Der Produktivkiosk kann durch Änderungen an `kiosk-base.css` nicht
>    beschädigt werden. Die Zweitseite ist wirklich abgeschottet.
> 2. **Gefährlich:** Die Kopie **driftet**. Jede Änderung, die jemand am
>    eingebetteten Stil in `kiosk.html` vornimmt, fehlt in `kiosk-base.css` —
>    und umgekehrt. Vor dem Zusammenführen der beiden Kioske muss beides wieder
>    abgeglichen werden. `tools/build-kiosk-neu.js` (Regel R1) erzeugt die
>    Auslagerung; erneut laufen lassen, wenn `kiosk.html` sich geändert hat.

---

## 4 Erledigt

### 4.1 Gerüst und Grundlagen — steht

| Aufgabe | Zustand |
| --- | --- |
| T001 Dev-Proxy auf 8787 | läuft (detached), `kiosk-neu.html` antwortet mit 200 |
| T010–T012 Umformer `build-kiosk-neu.js` | Regeln R1–R7 greifen, Zweitseite wird erzeugt |
| T013 Grundwerte | Abschnitt 1: Farben, Schriftgrade, `--pad`/`--gap`/`--tap-min`, Umschaltpunkte 640/1180/1620 px |
| T014 Reiterleiste | Abschnitt 5: unten am Telefon, links schmal ab 640 px, links breit ab 1180 px; Zähler in jeder Anordnung sichtbar |
| T016 44-px-Regel | Abschnitt 8 „Bedienmaße" |
| T017 Dialoge als Blatt | Abschnitt 10 angelegt — **nicht durchgeprüft** |

Das Gestaltungsblatt hat heute 34 Abschnitte. Aufbau: 1–12 allgemein,
**13.x Mittagstisch**, **14.x Bäcker**.

### 4.2 Reiter „Mittagstisch" — weit gediehen, **nicht abgenommen**

Abschnitte 13.1 bis 13.9:

- **13.1 Tagesleiste** vom Rollstreifen zum Raster. Unter 430 px vier Spalten in
  zwei Zeilen, darüber alle sieben Tage nebeneinander. Vorher waren nur drei von
  sieben Tagen zu sehen.
- **13.2 Kochbedarf** auf eine Zeile.
- **13.3 Sonderwünsche** als einzeiliges Band.
- **13.4 Filterleiste**: die sechs Filter sind zusammen 807 px breit und waren
  als Rollstreifen zu zweieinhalb sichtbar. Jetzt Umbruch. Beschriftung bleibt
  immer stehen; das Symbol daneben fiel weg (19 px je Chip), die Zählerpille
  wurde entschlackt.
- **13.5 Gerichtsgruppe** als Trennzeile statt Kasten.
- **13.6 Bestellkarte**, **13.7 Leermeldung**.
- **13.8** Verdichtung für niedrige Bildschirme, **13.9** zwei Spalten ab Tablet.

### 4.3 Reiter „Bäcker" — fertig gebaut, **nicht belegt, nicht abgenommen**

Abschnitte 14.1 bis 14.12:

- **14.2 Fester Kopf** von 645 px auf gut ein Drittel gebracht.
- **14.3 Liefertagsleiste** als Raster (vier Spalten, ab **560 px** sieben).
  Die Grenze liegt höher als beim Mittagstisch (430 px), weil jeder Bäckertag
  zusätzlich eine Statuszeile trägt — bei 430 px blieben nur 57 px je Tag.
- **14.4 Hinweiszeilen**: Der Wortbruch „Testbet-rieb" ist behoben.
- **14.5 Statusblock**, **14.6 Werkzeugleiste** (ohne Rollstreifen),
  **14.8 Artikelzeile** wieder einzeilig, **14.9 Fußleiste**,
  **14.10** frühere Mehrspaltigkeit, **14.11** Fixieren, **14.12** niedrige Schirme.
- In `kiosk-neu-shell.js`: `baeckerKopfSetzen()` misst den negativen `top`-Versatz
  des Bäckerkopfes nach jeder Änderung neu; `baeckerWerkzeuge()` fasst die zwei
  Umschalter zu einem Segment zusammen.

### 4.4 Prüfwerkzeug

`tools/pruef-kiosk-neu.js` ist das führende Skript:

```
node tools\pruef-kiosk-neu.js --reiter mittag,baecker --breiten 360,768 --bild
```

Enthaltene Prüfungen: waagerechter Überlauf, Antippflächen, überlappende
Geschwister, **F17** Fettschrift über 600, **F18** abgeschnittener Text,
**F19** waagerechte Rollstreifen (erfasst seit Kurzem auch `.bk-days` und
`.bk-sub`), Reiter und Zähler.

---

## 5 Offen

### 5.1 Überlappung im Mittagstisch — **behoben** (Weg B)

Der Auftraggeber hatte sie mit einem Bildschirmfoto belegt: die Filterchips
lagen über der Tagesleiste, beides gleichzeitig lesbar.

**Ursache — drei Dinge zusammen:**

1. `kiosk-neu.css` ließ **beide** Leisten kleben, die Tagesleiste bei
   `top:calc(var(--pad) * -1)`, die Filterleiste bei `top:0`. Die Filterleiste
   rastete 12 px unter der Oberkante ein — **mitten in der Tagesleiste**.
2. Der Ausgleich existierte, griff aber nicht: `#panel-mittag .k-filter-bar{
   top:var(--mt-daybar,58px) }` steht in `kiosk-base.css` Z. 1165 **innerhalb
   von `@media(min-width:900px)`**. Im alten Kiosk war die Tagesleiste unter
   900 px gar nicht fixiert — dort gab es das Problem nicht. `kiosk-neu.css`
   fixierte sie bei allen Breiten, ohne den Ausgleich mitzuziehen.
3. Verschärfend: `background:none` hob den deckenden Hintergrund auf. Deshalb
   *sah* man die Überlagerung, statt dass die obere Leiste die untere verdeckte.

Der Rasterumbau von 13.1 und 13.4 hat den Fehler sichtbar gemacht: beide
Leisten waren seither zwei Zeilen hoch (111 px bzw. 102 px statt 62/55).

**Umgesetzt ist Weg B** (Abschnitt **13.10** im Gestaltungsblatt und
`mittagTagFeld()` in `kiosk-neu-shell.js`):

- Tagesleiste und `#mittag-stats` kleben nicht mehr (`position:static`).
- Es klebt nur noch die Filterleiste — sie trägt die Zähler, die laut Vorgabe
  immer sichtbar bleiben müssen. Deckender Grund, volle Breite, bündig oben.
- Der gewählte Tag steht als erstes Feld in der Leiste („Heute · 08.09"),
  grün umrandet statt grün gefüllt, damit er nicht wie ein gewählter Filter
  aussieht. **Ein Antippen rollt zur Tagesleiste zurück** — Tag wechseln
  bleibt ein Griff.

**Gemessen nach dem Umbau** (`_mess-sticky-mittag.js`, `_pruef-mttag.js`):

| Breite | fester Kopf vorher | nachher | Überlappung |
| --- | --- | --- | --- |
| 360 px | 213 px (überlappend) | **156 px** | nein |
| 390 px | 213 px (überlappend) | **156 px** | nein |
| 430 px | 164 px (überlappend) | **156 px** | nein |
| 768 px | 117 px (überlappend) | **109 px** | nein |
| 1024 px | 194 px | **60 px** | nein |

Funktionsprobe bei 390 px: Feld zieht beim Tageswechsel nach
(„Heute · 08.09" → „Gestern · 07.09"), Antippen rollt von 516 px auf 0,
Leiste steht bündig (0 px), deckend, über die volle Breite.
`pruef-kiosk-neu.js --reiter mittag` über sechs Breiten: **0 Befunde**.

**Was dabei zusätzlich auffiel — die Falle mit dem Innenrand.** Mit `top:0`
rastete die Leiste 12 px zu tief ein, weil der Bezugsrahmen für `top` am
**Innenrand** des Rollbereichs beginnt, also unterhalb der Reiterpolsterung.
Durch diesen Spalt lief die Liste sichtbar vorbei. Richtig ist
`top:calc(var(--pad) * -1)`. Im normalen Fluss ändert `top` nichts, nur der
gestockte Zustand verschiebt sich.

**Offen geblieben:** Bei 320–430 px braucht die Leiste **drei Chip-Zeilen**
(156 px von 844 px = 18 %). Die dritte Zeile trägt bei 390/430 px **allein den
Quellenschalter** („⌄ Alle", `#mt-toggle-wrap`, 61 px) und kostet dafür volle
44 px. Er ist nur sichtbar, wenn Telefonbestellungen vorliegen. Die Chips sind
zusammen 688 px breit — in zwei Zeilen à 351 px passt das rechnerisch nicht.
Mögliche Hebel, falls der Kopf weiter schrumpfen soll: den Quellenschalter aus
der klebenden Leiste herausnehmen, oder die Chip-Polsterung von 10 auf 8 px
senken (spart 32 px, reicht allein nicht).

Kleinere Redundanz: Ganz oben steht der Tag zweimal — in der Tagesleiste und im
Feld darunter. Das Feld auszublenden, solange die Leiste nicht klebt, wurde
verworfen: eine Leiste, die beim Scrollen ihre Höhe ändert, lässt den Inhalt
springen.

### 5.2 Ebenfalls sofort — unbelegte Änderungen

Drei Änderungen am Bäcker-Reiter sind geschrieben, aber **nie nachgemessen**
(der Messlauf wurde unterbrochen):

- [ ] `node tools\_mess-bkdays.js` — erwartet: 320/360/390 px vier Spalten in
      zwei Zeilen, **rollt = nein**; ab 560 px sieben Spalten in einer Zeile.
      Besonders auf die Höhe achten.
- [ ] `node tools\_scrollprobe-baecker.js` — **zwingend**, weil
      `baeckerKopfSetzen()` von der Kopfhöhe abhängt und der Rasterumbau sie
      ändert. Erwartet: Kopf bündig (±2 px), Fuß 0 px über der Kante, keine
      Zeile unter dem Fuß, Knopfzeilen ≤ 1.
- [ ] `node tools\pruef-kiosk-neu.js --reiter mittag,baecker` — **null Befunde**.

Danach Bilder bei 390/744/1280 erstellen und dem Auftraggeber vorlegen, mit
Hinweis auf **Strg+F5** und der ehrlichen Angabe, dass die **Scrolltiefe
zugunsten der Lesbarkeit gestiegen ist** (320 px Mittagstisch von 4,4 auf 5,2
Bildschirme; Bäcker bei 360/375 px auf 5,3/5,5). Das ist ein bewusster Preis,
den der Auftraggeber **noch nicht bestätigt hat**.

### 5.3 Reiter — Stand nach dem Regeldurchlauf vom 08.09. (abends)

Ein vollständiger Prüflauf `pruef-kiosk-neu.js` über **alle acht Reiter × elf
Breiten** (88 Kombinationen) meldet **0 Befunde**. Die Regelverstöße (Rollstreifen,
abgeschnittener Text, Fettschrift, Überlappung) sind damit auf allen Reitern
beseitigt. Das Prüfskript erfasst jetzt zusätzlich die Rollstreifen `.mb-days`,
`.mb-jump` und `.kal-days`.

| Reiter | Aufgabe | Stand |
| --- | --- | --- |
| **Metzger Mair** | T032 | Liefertagsleiste (`.mb-days`) und Warengruppen-Sprungleiste (`.mb-jump`) vom Rollstreifen auf Raster/Umbruch, Datum `.d2` schneidet nicht mehr ab. Regelprüfung 0 Befunde. **Offen:** die Seitenhöhe — 15,9 Bildschirme bei 320 px — bleibt der größte Hebel und ist **nicht abgenommen**. |
| **Social** | T033 | Warenplättchen und Freitext der Beitragsvorschau kürzten per Inline-Stil (`max-width:140px`/`ellipsis`); über die Signatur in `#panel-social` auf Umbruch gestellt. Der **Katalogumbau T026** (statt 469 offener Felder höchstens 20) steht noch aus. |
| **Kalender** | T034 | Wochenleiste vom Rollstreifen auf Raster, `.dnum`-Tageszahl kappt nicht mehr. Regelprüfung 0 Befunde. |
| **Kontakt** | T035 | Ellipsis-Verschnitt und Fettschrift (800/700) beseitigt, Auswahl-Ankreuzfeld überlappt den Pfeil nicht mehr, Kopf bricht bei 320 px um. Regelprüfung 0 Befunde. |
| **Abhol / Metzger (alt)** | T036 | Zähler-Filterleisten (`#abhol-filter-bar`, `#metzger-filter-bar`) brechen bei 320 px um statt zu rollen. Vollständiger Umbau der ausgeblendeten Reiter steht noch aus. |

**Noch offen bleibt** neben T026 und der Metzger-Seitenhöhe die **Abnahme Reiter
für Reiter durch den Auftraggeber** sowie die Bedienhilfen T021–T025.


### 5.4 Bedienhilfen — größtenteils offen

`kiosk-neu-shell.js` enthält bisher nur Symbolnachzug, die Hinweiszeile
`KNeu.melden()` mit Rückgängig-Knopf und die zwei Bäckerhelfer. **Offen sind
T021–T026**, und das ist der Teil, der dem Auftraggeber am wichtigsten ist:

- T021 Vorbelegung aus dem letzten vergleichbaren Vorgang statt leerer Formulare
- T022 Ein-Klick-Normalfall ohne Zwischendialog
- T023 Vorschläge statt Tippen (Mengen, Einheiten, Kunden, Textbausteine)
- T024 Klartext statt Fehlercodes; unmögliche Eingaben gar nicht erst anbieten
- T025 Rückgängig oder Rückfrage bei jeder löschenden und versendenden Aktion
- T026 Social-Katalog: statt 469 gleichzeitig offener Felder höchstens 20

### 5.5 Tests und Rollout — offen

- T040 Funktionsverzeichnis `kiosk.html` ↔ `kiosk-neu.html` — keine Funktion darf fehlen
- T041 Selbsttest der Umformung (außerhalb der Regelbereiche zeichengleich)
- T042 `tests/kiosk-neu.spec.js` über alle elf Breiten und acht Reiter
- T043 bestehende Playwright-Tests gegen die Zweitseite
- T050 Vollständiger Prüflauf, null Befunde
- T051 Abnahme, T052 Version erhöhen und veröffentlichen

---

## 6 Was der Nachfolger wissen muss

### 6.1 Fixieren (`position:sticky`)

- Der Bezugsrahmen für `top`/`bottom` beginnt am **Innenrand** des Rollbereichs.
  Ein `bottom:0` rastet den `padding-bottom` des Reiters *oberhalb* der
  Unterkante ein — es entsteht ein Spalt, durch den die Liste sichtbar scrollt.
- Ausgleichsmuster für eine Leiste, die bis zur Kante reichen soll:
  ```css
  bottom: calc((var(--pad) + 8px) * -1);
  margin: 10px calc(var(--pad) * -1) calc((var(--pad) + 8px) * -1);
  padding: 9px var(--pad) calc(9px + var(--pad) + 8px);
  ```
- **Geschachteltes Fixieren** ist die häufigste Falle: `.bk-sub` ist eine
  `.k-filter-bar` und war dadurch selbst fixiert (`top:-12px`), rastete also im
  ohnehin fixierten Kopf noch einmal unabhängig ein. Behoben mit
  `position:static`. **Bei unerklärlichem Versatz zuerst
  `getComputedStyle(kind).position` prüfen.**
- Mehrere fixierte Geschwister brauchen **abgestimmte `top`-Werte und einen
  deckenden Hintergrund** — sonst genau der Fehler aus 5.1.

### 6.2 Umbruch und Textfluss

- **Ein Flexbehälter kann Wörter zerbrechen.** `.bk-test` war `display:flex`,
  damit wurde das `<b>Testbetrieb</b>` zu einem eigenen Flex-Element mit eigener
  Mindestbreite und brach mitten im Wort. Für Fließtext mit Auszeichnungen ist
  **`display:block`** richtig; das Symbol davor braucht dann
  `display:inline-block; vertical-align:-2px`.
- **`overflow-wrap:anywhere` ist für Fließtext zu scharf** — es bricht auch
  innerhalb kurzer Wörter. `break-word` bricht nur, wenn ein Wort sonst
  überliefe. `anywhere` gehört nur an Stellen mit sehr langen Einzelnamen.
- **`flex:1 1 auto` beim Umbruch ist gefährlich** (dehnte zwei Chips auf
  296/247 px). `flex:0 1 auto` ist ruhiger; für echte Ausrichtung ist
  **Grid mit `repeat(n,1fr)`** die bessere Wahl.
- **Die Umbruchgrenze hängt vom Inhalt je Feld ab** — 430 px beim Mittagstisch,
  560 px beim Bäcker. Nicht von einer Leiste auf die andere schließen, sondern
  messen.
- **Ein Kommentar kann lügen:** Die Regel in Abschnitt 9 trug „werden
  umgebrochen, nicht abgeschnitten" und enthielt `-webkit-line-clamp:2`. Bei
  Widersprüchen dem Code glauben.

### 6.3 Fallen in den Prüfskripten (selbst hineingelaufen)

- **Zeilen nicht über `bottom` zählen** — ein Kind mit Höhe 0 (`span.sp` mit
  `flex:1`) verfälscht das. Über `top` zählen und Elemente ohne Ausdehnung
  herausfiltern.
- **„Zeile unter der Fußleiste"** darf nicht heißen „Unterkante tiefer als die
  Leiste" — Zeilen laufen normal *hinter* der Leiste weiter. Richtig:
  „**beginnt** unterhalb der Leistenunterkante und ist noch im Fenster".
- **F18 nur auf Elemente anwenden, die den Text selbst tragen** (`childNodes`
  mit `nodeType === 3`), sonst meldet jeder Vorfahr mit.
- **Rollbereiche in F18 ausnehmen** (`overflowX/Y` = `auto|scroll`).

### 6.4 Betrieb der Prüfumgebung

- Testserver starten — **immer `detach:true`**:
  ```
  node <session-files>\dev-proxy.js 8787 "C:/Source/dorfladen-static-web-app/static-site"
  ```
- In **jedem** Playwright-Skript `**/version.json` mit `page.route` abfangen,
  sonst startet der Kiosk mitten in der Messung neu.
- Ladefolge: nach `goto` **6 s** warten, dann `K.switchTab('…')`, dann nochmals
  **6 s**. Ein Lauf über sechs Breiten dauert rund **zwei Minuten** —
  `initial_wait` entsprechend hoch setzen.
- **Zwei getrennte Browser-Instanzen:** die geteilte Seite und Playwright haben
  eigene Zwischenspeicher. **Maßgeblich ist der Skriptlauf**, nicht das Bild im
  geteilten Fenster. Dem Auftraggeber immer **Strg+F5** dazusagen.
- **PowerShell 5.1:** `node -e "…"` mit eingebetteten Anführungszeichen
  zerbricht am Parser — immer eine `.js`-Datei anlegen.

---

## 7 Aufräumen vor dem Commit

Diese Messhilfen sind Wegwerfware und gehören **nicht** ins Verzeichnis:

```
tools/_mess-sticky-mittag.js   tools/_mess-mtchips.js      tools/_pruef-mttag.js
tools/_bild-mittag.js          tools/_mess-bkdays.js       tools/_mess-tools.js
tools/_mess-mittagfilter.js    tools/_baum-mittagfilter.js tools/_baum-baecker.js
tools/_pruef-text.js           tools/_pruef-leiste.js      tools/_warum-abgeschnitten.js
tools/_debug-kopf.js           tools/_scrollprobe-baecker.js
tools/mess-kiosk-baecker.js    tools/diag-kiosk.js
```

Ebenso `files/pruefbilder/*.png` (entsteht durch `--bild`).

Bleiben sollen: `tools/build-kiosk-neu.js`, `tools/pruef-kiosk-neu.js`,
`tools/pruef-kiosk-mittag.js`.

---

## 8 Offene Fragen an den Auftraggeber

1. **Ist der feste Kopf des Mittagstischs mit 156 px in Ordnung?** Das sind 18 %
   des Schirms bei 360–430 px. Die dritte Chip-Zeile trägt allein den
   Quellenschalter („⌄ Alle"). Soll der aus der klebenden Leiste heraus?
2. **Ist die gestiegene Scrolltiefe in Ordnung?** 320 px Mittagstisch von 4,4
   auf 5,4 Bildschirme, Bäcker bei 360/375 px auf 5,3/5,5. Der Zuwachs ist der
   Preis dafür, dass nichts mehr abgeschnitten wird.
3. **Abnahme des Bäcker-Reiters** steht aus.
4. **Nicht zum Umbau, aber offen und mehrfach unbeantwortet:**
   `api/social-post/__init__.py` Z. 344 schreibt weiterhin **ablaufende
   SharePoint-Links** in veröffentlichte Beiträge. Der Kiosk holt die Bilder
   inzwischen über den Proxy (`e9b25f8`), die Veröffentlichung nicht. Soll das
   ebenfalls saniert werden?
