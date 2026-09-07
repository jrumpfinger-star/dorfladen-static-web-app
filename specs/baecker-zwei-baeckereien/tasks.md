# Zweite Bäckerei (Martin's Backstube) — Tasks

> Abgeleitet aus [plan.md](./plan.md). Geordnete, abhängigkeitsbewusste,
> abhakbare Arbeitseinheiten. `[P]` = parallelisierbar (keine gemeinsamen
> Dateien / keine Reihenfolge-Abhängigkeit). Jede Task referenziert die
> Spec-Anforderung bzw. den Testfall, den sie bedient.

**Spec:** [spec.md](./spec.md) · **Plan:** [plan.md](./plan.md)

**Status:** Noch nicht begonnen

## Conventions

- Tasks von oben nach unten abarbeiten, außer `[P]`.
- Eine Task ist erst „done", wenn ihre referenzierten Testfälle grün sind.
- Kleine Commits; Task-ID in der Commit-Message referenzieren.

> **Reihenfolge ist hier nicht kosmetisch.** `store.py` (T02x) ist das Fundament:
> Solange die Lesebrücke nicht steht, arbeitet jede darauf aufbauende Task gegen
> ein Schema, das den Bestand nicht sieht. T020–T026 zuerst, ohne Abkürzung.

## Setup

- [ ] **T001** Vor dem Start auf `origin/main` rebasen. Eine parallele Sitzung
      arbeitet an `static-site/kiosk.html`, `api/lunch-order/` und
      `tests/TESTCASES.md` — beim Zusammenführen die Testfall-Übersicht
      zusammenlegen, nicht überschreiben. — Risiko-Minderung
- [ ] **T002** `fpdf2` und `pypdf` in `api/requirements.txt` ergänzen.
      Beides reines Python, keine Systembibliotheken. — `F20`, `F22`

## Stammdaten (unabhängig vom Code)

- [ ] **T010** `[P]` Startkatalog `api/baecker-order/vorlage/katalog-martins.json`
      erzeugen: **48 Artikel** — die 44 gedruckten des Bestellscheins plus
      104, 186, 192, 242 aus den Rechnungen. Die neun nie bestellten
      (23, 60, 61, 62, 63, 64, 182, 189, 401) auf `aktiv: false`.
      Grunddaten liegen bereits ausgewertet vor (siehe Spec „Datenlage").
      — `F21` / `TC-B2-F21-01`, `TC-B2-F21-02`
- [ ] **T011** `[P]` `vorlage/katalog.json` → `vorlage/katalog-freundl.json`
      umbenennen. **Nur der Rename.** Die fest verdrahtete Referenz in
      `store.load_artikel` (~Z. 184) wird in **T021** mitgezogen — sie liegt in
      `store.py`, das T020–T026 ohnehin umbauen; parallel bearbeitet gäbe das
      einen Konflikt. — `F17`

## Fundament: `api/baecker-order/store.py`

- [ ] **T020** `BAECKEREIEN = ("freundl", "martins")`, `ALT_BAECKEREI`,
      `artikel_key_store(bk)`, `order_key(bk, datum)`, `order_praefix(bk)`.
      Die alten Konstanten `KEY_ARTIKEL`/`KEY_ORDER` bleiben zunächst stehen —
      die Lesebrücke braucht sie. — `F17`
- [ ] **T021** **Lesebrücke** in `load_order` und `load_artikel`: fehlt der neue
      Schlüssel *und* ist die Bäckerei `freundl`, aus dem Altschlüssel lesen.
      `record_id` dabei bewusst `None` zurückgeben — geschrieben wird **immer**
      auf den neuen Schlüssel. Hier auch den Dateinamen des Startkatalogs auf
      `katalog-{bk}.json` umstellen (Nachzug zu T011). — `F24`
      / `TC-B2-F24-02`
- [ ] **T022** `store.bestellungen(url, hdrs, bk)` als **einzige** Stelle, die
      den Präfix `baecker_order_` liest. Zuordnung über die Schlüsselform
      (`…_JJJJ-MM-TT` = alt/Freundl, `…_freundl_…` / `…_martins_…` = neu);
      bei doppeltem Tag gewinnt der neue Schlüssel.
      **Grund:** `baecker_order_` ist Präfix der neuen Schlüssel — eine
      übersehene Lesestelle mischt sonst beide Bäckereien. — `F17`
- [ ] **T023** `load_config` auf `{"baeckereien": {…}}` umstellen, mit Brücke:
      fehlt der Schlüssel, `freundl` aus dem flachen Altobjekt aufbauen und
      `martins` aus den Vorgabewerten ergänzen. — `F17`, `F25`
- [ ] **T024** `ist_bestelltag`, `naechster_bestelltag`, `tour_nr`,
      `korrektur_moeglich` auf die Bäckerei-Konfiguration umstellen. Die Logik
      bleibt unverändert, nur die Herkunft der Werte ändert sich. — `F17`, `F18`
- [ ] **T025** `vorlage_bestellungen` und `nummer_umziehen` auf
      `store.bestellungen(bk)` umstellen. **Wichtig bei `nummer_umziehen`:** ohne
      diese Umstellung schriebe eine Freundl-Nummernänderung quer in
      Martin's-Bestellungen. — `F17` / `TC-B2-F17-02`
- [ ] **T026** `tools/baecker_store_test.py` — Lesebrücke und Schlüssel-Zuordnung
      gegen einen nachgebildeten Bestand, ohne Azure. Prüft insbesondere: alter
      Schlüssel wird gefunden, neuer gewinnt bei Dublette, Martin's sieht nie
      Freundl-Daten. — `F17`, `F24` / `TC-B2-F17-03`, `TC-B2-F24-02`

## API: `api/baecker-order/__init__.py`

- [ ] **T030** `baeckerei` aus Query **und** Rumpf lesen, gegen `BAECKEREIEN`
      prüfen. **Nur wo sie fachlich nötig ist:** Einzelbestellung
      (`GET ?datum=…`), Bestell-POST, Senden/Korrektur, `aktion:'gedruckt'`.
      Fehlt sie dort → HTTP 400 mit Klartext, **nicht** stillschweigend Freundl.
      **Ausdrücklich ohne Bäckerei bleiben** `mode=uebersicht`, `mode=verlauf`
      und `mode=config` — sie spannen bewusst über beide und werden vom Kiosk
      heute schon ohne Parameter gerufen (kiosk-baecker.js Z. 86 und 972).
      Ein pauschaler Riegel legte den Tab lahm. — `F17`
      / `TC-B2-F17-04`, `TC-B2-F17-05`
- [ ] **T031** `_build_entwurf` und `_senden` auf Bäckerei umstellen
      (Katalog, Vorbelegung, Kd.-Nr., Tour-Nr., Korrektursperre). — `F17`, `F18`
- [ ] **T032** `_uebersicht` liefert je Tag eine **Liste** `lieferanten` mit
      `{baeckerei, status, gedruckt}` statt eines einzelnen Objekts.
      Grundlage für Tagespunkte, „1 von 2" und den Tab-Zähler. — `F18`, `F19`
      / `TC-B2-F18-03`, `TC-B2-F19-02`
- [ ] **T032b** **Erinnerungsblock** in `_uebersicht` (~Z. 200–224) über **alle**
      am Zieltag liefernden Bäckereien rechnen: `offen` = mindestens eine offen.
      Heute lädt er genau **eine** Bestellung (`load_order(url, hdrs, morgen)`) —
      am Samstag wäre der Blinkstatus damit schlicht falsch, und der Client kann
      das nicht reparieren, weil `blinkt` vom Server kommt. Bestellschluss je
      Bäckerei berücksichtigen. — `F19` / `TC-B2-F19-04`
- [ ] **T033** `_verlauf` auf `store.bestellungen(bk)` umstellen; ohne
      `baeckerei` über **beide** laufen und die Bäckerei je Eintrag mitgeben
      (der Verlauf zeigt sie als Spalte). — `F17` / `TC-B2-F17-05`
- [ ] **T034** Formatweiche beim Senden: `format == "pdf"` → `pdf_fill`,
      sonst `docx_fill`. Dateiname und MIME-Typ mitziehen. Die Vorlagenwahl
      (heute die Modulkonstante `VORLAGE` für Freundls Werktag/Samstag) wandert
      dabei in die Bäckerei-Konfiguration.
      **⚠ Setzt T041 voraus** — ohne `pdf_fill.py` lässt sich nur der
      Freundl-Zweig prüfen, und die Task gälte als erledigt, obwohl der
      Martin's-Versand ungetestet wäre. Erst T040–T043, dann hierher zurück.
      **Mitprüfen:** Die Ablehnung leerer Bestellungen sitzt in `_senden`
      *vor* der Weiche (`if not versand`) und gilt damit auch für Martin's —
      im Test bestätigen, nicht annehmen. — `F20`
      / `TC-B2-F20-04`, `TC-B2-F20-05`
- [ ] **T035** `aktion: 'gedruckt'` — setzt `gedruckt_am` an der Bestellung.
      Nur zulässig, wenn die Bestellung gesendet ist. — `F23` / `TC-B2-F23-06`
- [ ] **T036** `_config_pruefen` auf die neue Struktur erweitern: je Bäckerei
      prüfen, Überschneidung der Bestelltage **erlauben** (Samstag) und als
      Hinweis zurückgeben, nicht als Fehler. — `F25` / `TC-B2-F25-03`

## Formular für Martin's: `api/baecker-order/pdf_fill.py`

- [ ] **T040** Zeichenbereiniger `_latin1(text)`: bekannte Sonderzeichen
      ersetzen (`–` → `-`, `„" "` → `"`, `…` → `...`), sonst Rückfall auf `?`.
      **Muss vor T041 stehen.** Ohne ihn bricht `fpdf2` mit der Kernschrift bei
      jedem Zeichen außerhalb von Latin-1 ab — der Versand scheiterte dann im
      Moment des Absendens. Vorab reproduziert. — `F20`
- [ ] **T041** Formular bauen: Kopf (Bäckereiname, Anschrift), Zeile mit
      Bestellschein / Kd.-Nr. 1015 / Liefertag, Tabelle
      **Nr. · Bezeichnung · Menge · Retouren**, Fußzeile mit Positions- und
      Stückzahl. Nur ein Liefertag, **keine** zehn Tagesspalten.
      Sortierung nach Artikelnummer aufsteigend. — `F20`
      / `TC-B2-F20-01`, `TC-B2-F20-02`, `TC-B2-F20-03`
- [ ] **T042** Testbetrieb-Kennzeichnung im Dokument, sobald der Empfänger von
      der hinterlegten Bäckerei-Adresse abweicht — wie bei Freundl. — `F20`
- [ ] **T043** `tools/baecker_pdf_test.py` — Formular erzeugen, mit `pypdf`
      zurücklesen: Kd.-Nr., Datum, Sortierung, Umlaute. Dazu ein Artikelname
      voller Sonderzeichen: der Bereiniger darf **nicht** abstürzen. Ein
      **Zusatzartikel** (Basis-Spec F4) gehört in den Testfall — `pdf_fill`
      braucht dafür keine eigene Logik, weil `_positionen_fuer_versand` ihn
      bereits sortiert mitliefert; genau das soll der Test bestätigen.
      — `F20` / `TC-B2-F20-01…03`

> **Rücksprung:** Nach T043 zurück zu **T034** (Formatweiche) — jetzt lässt sie
> sich tatsächlich prüfen.

## Rechnungs-Import: `api/baecker-artikel/`

- [ ] **T050** `rechnung_parser.py` — PDF-Text mit `pypdf` lesen, Positionen
      erkennen: Artikelnummer (steht am **Zeilenende**), Bezeichnung, Liefer-
      und Retourmenge. — `F22` / `TC-B2-F22-01`
- [ ] **T051** Mehrzeilige Positionen zusammenführen. **Konkreter Fall:**
      Nr. 104 „BIO-Ciabatta" trägt die Zusatzzeile „aus kontr.biolog.Anbau" —
      ein zeilenweiser Parser übersieht sie *stillschweigend*. Ausgerechnet
      dieser Artikel rechtfertigt den Import, weil er auf dem Zettel nur
      handschriftlich stand. — `F22` / `TC-B2-F22-02`
- [ ] **T052** `tools/baecker_rechnung_test.py` — gegen alle **11** vorliegenden
      Rechnungen. Erwartung: 39 Artikel inklusive 104; die vier nur dort
      belegten (104, 186, 192, 242) werden gefunden; ein zweiter Lauf ändert
      nichts. — `F22` / `TC-B2-F22-01`, `-02`, `-04`
- [ ] **T060** `__init__.py`: `baeckerei` in GET/POST/PATCH; Dublettenprüfung je
      Bäckerei (Nr. 1 darf bei beiden existieren). — `F17`, `F21`
      / `TC-B2-F17-01`, `TC-B2-F21-04`
- [ ] **T061** `aktion: 'rechnung'`, Modus **Vorschau** — liefert `neu`,
      `geaendert`, `unveraendert` sowie die Retouren-Übersicht mit Quote.
      Bei unlesbarem PDF freundliche Meldung, Katalog unberührt. — `F22`
      / `TC-B2-F22-05`, `TC-B2-F22-06`
- [ ] **T062** `aktion: 'rechnung'`, Modus **Übernahme** — schreibt
      ausschließlich Nummer und Bezeichnung. Keine Mengen, keine Preise.
      Neue Artikel `aktiv: true`. — `F22` / `TC-B2-F22-03`

## Bestandsübernahme: `api/baecker-migration/`

- [ ] **T070** `function.json` + Grundgerüst mit `admin_auth_guard`.
      Parameter `?modus=test|echt`. — `F24`
- [ ] **T071** **Testmodus**: zählt Bestellungen, Positionen und Artikel vorher
      und nachher, meldet Abweichungen, schreibt **nichts**. — `F24`
      / `TC-B2-F24-04`
- [ ] **T072** **Echtmodus**: kopiert Katalog und alle Bestellungen auf die
      Freundl-Schlüssel. Tage, für die der neue Schlüssel **schon existiert**,
      werden übersprungen — dort ist der neue Stand der gültige. Altschlüssel
      bleiben stehen.
      **Die Einstellungen werden nicht verschoben:** `baecker_config` behält
      seinen Schlüssel und wird nur um `baeckereien: {…}` erweitert; die Brücke
      aus T023 genügt. Einen `baecker_config_freundl` gibt es bewusst nicht.
      **Paginieren oder hart abbrechen**, wenn `read_many`s Grenze von 400
      erreicht ist — niemals stillschweigend abschneiden. — `F24`
      / `TC-B2-F24-01`, `TC-B2-F24-03`
- [ ] **T073** `tools/baecker_migration_test.py` — zwei Teile:
      (a) neuer Code gegen **un-migrierten** Bestand: Verlauf, Vorbelegung und
      Katalog identisch zum Altverhalten; (b) Umzug: Zahlen vorher/nachher,
      zweiter Lauf folgenlos, Abbruch bei erreichter Lesegrenze. — `F24`
      / `TC-B2-F24-01…04`

## Kiosk: `static-site/js/kiosk-baecker.js` + `kiosk.html`

- [ ] **T080** `_baeckerei` in den Modulzustand; alle API-Aufrufe geben sie mit.
      Tageswechsel schaltet auf die dort liefernde Bäckerei um. — `F18`
      / `TC-B2-F18-02`
- [ ] **T081** Tagesleiste: farbige Punkte je Lieferant, gesendete erkennbar,
      „1 von 2" an Tagen mit zwei Bäckereien. — `F18`, `F19`
      / `TC-B2-F18-03`, `TC-B2-F19-02`
- [ ] **T082** Reiterzeile `.bk-btabs` — **nur** bei zwei Lieferanten, mit
      Abzeichen `offen` / `✓ gesendet` / `🖨 Ausdruck fehlt`. — `F19`
      / `TC-B2-F19-01`, `TC-B2-F19-03`
- [ ] **T083** Statuskarte und Fußzeile nennen die Bäckerei im Klartext, auch an
      Ein-Bäckerei-Tagen. — `F18` / `TC-B2-F18-01`
- [ ] **T084** Druckansicht: HTML aus den Positionsdaten bauen,
      `window.open('', '_blank')` + `window.print()` — dasselbe Muster wie
      `K.printKitchen()`. Mit Kd.-Nr., Tour-Nr., Liefertag und Retourenspalte.
      — `F23` / `TC-B2-F23-01`
- [ ] **T085** Bestätigung nach dem Senden: Overlay mit der Schrittfolge
      *erstellt · verschickt · drucken* und Formularvorschau; „Später drucken"
      schließt es, **ohne** den Schritt als erledigt zu werten. — `F23`
      / `TC-B2-F23-01`, `TC-B2-F23-05`
- [ ] **T085b** Ausdruck-Zustand in der Oberfläche: Tagesplättchen
      „🖨 Ausdruck fehlt"; `statusKarte` zeigt den Druckknopf **statt**
      „Korrektur senden"; nach dem Druck `aktion:'gedruckt'` melden und beides
      zurückschalten. Bei Bäckereien ohne die Einstellung entfällt der Schritt.
      — `F23` / `TC-B2-F23-02`, `TC-B2-F23-03`, `TC-B2-F23-06`
- [ ] **T085c** Tab-Zähler: offene Bestellungen **und** offene Ausdrucke zählen.
      — `F19` / `TC-B2-F19-05`
- [ ] **T086** Nachdruck aus dem Verlauf: die Bestellung per
      `GET ?baeckerei=…&datum=…` **nachladen** — `_verlauf` liefert nur die
      Anzahl der Positionen, nicht die Zeilen. Kein erneuter Mailversand.
      — `F23` / `TC-B2-F23-04`
- [ ] **T087** Rechnungs-Import, Teil 1: Datei wählen, hochladen, **Vorschau**
      mit `neu` / `geändert` / `unverändert`; freundliche Meldung bei
      unlesbarem PDF. — `F22` / `TC-B2-F22-05`
- [ ] **T087b** Rechnungs-Import, Teil 2: **Übernehmen** und Retouren-Übersicht
      mit Quote. — `F22` / `TC-B2-F22-06`
- [ ] **T088** CSS in `kiosk.html`: `.bk-btabs`, Tagespunkte, Zustand
      „Ausdruck fehlt", Druck-Stile. Die Reiterzeile gehört in **denselben**
      `@media (min-width:900px) and (min-height:620px)`-Block wie `.bk-sticky` —
      auf 375×667 hat der klebende Kopf schon einmal Zeilen verdeckt und Klicks
      abgefangen. — `F19`, `F23`, `F26` / `TC-B2-F26-01…03`

## CMS: `static-site/cms.html` + `cms.js`

- [ ] **T090** Bäckerei-Auswahl oben in der Karte „Bäckerei-Bestellung";
      alle Felder darunter gehören zur gewählten. Neue Felder: Anzeigename,
      Formularformat, Papierausdruck ja/nein. — `F25` / `TC-B2-F25-01`
- [ ] **T091** Laden und Speichern je Bäckerei; Speichern darf die **andere**
      nicht anfassen. — `F25` / `TC-B2-F25-02`
- [ ] **T092** Testbetrieb-Hinweis je Bäckerei; Hinweis (kein Fehler) bei
      überschneidenden Bestelltagen. — `F25` / `TC-B2-F25-03`, `TC-B2-F25-04`

## Tests

- [ ] **T100** `tests/kiosk-baecker.spec.js` — Mock um `baeckerei` erweitern.
      Die **156 bestehenden Tests müssen grün bleiben**; sie sind die
      Absicherung, dass die Freundl-Bestellung durch die Verallgemeinerung nicht
      beschädigt wird. — Regression
- [ ] **T101** `tests/kiosk-baecker-zwei.spec.js` anlegen. Der Mock ist **eine**
      Route und antwortet je nach `baeckerei` **unterschiedlich** — sonst prüfen
      die Tests die Trennung nur scheinbar. `serviceWorkers: 'block'`.
      Abschnitt F17–F19. — `TC-B2-F17-02`, `-03`, `F18-01…03`, `F19-01…05`
- [ ] **T102** Tests F21–F23 (Katalog, Rechnungs-Oberfläche, Ausdruck).
      — `TC-B2-F21-01…04`, `F22-05`, `-06`, `F23-01…06`
- [ ] **T103** Tests F25–F26 (CMS, Responsive auf allen drei Auflösungen).
      — `TC-B2-F25-01…04`, `F26-01…04`
- [ ] **T104** API-Tests über die `request`-Fixture: gleiche Nummer bei beiden
      Bäckereien, fehlende Bäckerei wird abgelehnt. — `TC-B2-F17-01`,
      `TC-B2-F17-04`

## Auslieferung

> Der SWA-Workflow liefert `static-site` **und** `api` in *einem* Lauf aus.
> Server und Kiosk gehen immer gemeinsam live — eine getrennte Reihenfolge gibt
> es nicht.

- [ ] **T110** Volle Suite lokal, alle drei Auflösungen. Umgebungsvariable heißt
      **`TEST_URL`**, nicht `BASE_URL` — mit falschem Namen laufen die Tests
      still gegen die Standard-URL und bestehen irreführend.
- [ ] **T111** Auf die **Testumgebung** ausrollen, Suite dort fahren.
- [ ] **T112** Live ausrollen. Dank der Lesebrücke arbeitet der Tab mit dem
      Altbestand weiter — es braucht **kein** Zeitfenster, in dem niemand
      bestellen darf.
- [ ] **T113** Bestandsübernahme im **Testmodus**, Zahlen prüfen.
- [ ] **T114** Bestandsübernahme **echt**, danach Verlauf und Vorbelegung im
      Kiosk stichprobenartig gegenprüfen.
- [ ] **T115** Testfall-Übersicht `tests/TESTCASES.md`, Abschnitt T-B2, mit den
      Ergebnissen füllen; Querverweis in `specs/baecker-bestellung/spec.md`.

## Aufräumen (nicht vergessen)

- [ ] **T119** Beim Bau der Lesebrücke (T021) **sofort** einen Wächter
      mitschreiben: `tools/baecker_bruecke_test.py` prüft, ob noch Datensätze
      unter den Altschlüsseln liegen. Solange ja, meldet er „Brücke wird noch
      gebraucht"; sind sie weg, **schlägt er fehl** mit dem Hinweis, jetzt T120
      auszuführen.
      **Grund:** Eine Aufräum-Task, die allein an „ausdrücklicher Freigabe"
      hängt, bleibt erfahrungsgemäß für immer liegen — und dann traut sich
      niemand mehr, die Brücke anzufassen. Der Wächter macht das Aufräumen zu
      etwas, das sich von selbst meldet. — Folgearbeit zu `F24`
- [ ] **T120** Nach einigen Tagen Beobachtung und **ausdrücklicher Freigabe**:
      Altschlüssel entfernen, danach die Lesebrücke aus `store.py` zurückbauen
      (T021, T023), `KEY_ARTIKEL`/`KEY_ORDER` löschen und den Wächter aus T119
      entfernen. — Folgearbeit zu `F24`

## Blockiert / braucht eine Entscheidung

- [ ] **T900** **Bestelladresse von Martin's** klären. Für die Umsetzung
      unerheblich (Testbetrieb), aber **vor** der Scharfschaltung nötig. Die
      Rechnungen kommen von `rechnung@martins-backstube.de` — das ist keine
      Bestelladresse.
- [ ] **T901** Freigabe, den Empfänger von der Testadresse auf die echten
      Bäckereien umzustellen — für **beide** getrennt.

## Traceability

| Task | Requirement | Test Cases |
| --- | --- | --- |
| T010 | F21 | TC-B2-F21-01, TC-B2-F21-02 |
| T011, T020, T022, T025 | F17 | TC-B2-F17-02 |
| T021, T023 | F17, F24 | TC-B2-F24-02 |
| T024 | F17, F18 | — |
| T026 | F17, F24 | TC-B2-F17-03, TC-B2-F24-02 |
| T030 | F17 | TC-B2-F17-04, TC-B2-F17-05 |
| T031 | F17, F18 | — |
| T033 | F17 | TC-B2-F17-05 |
| T032 | F18, F19 | TC-B2-F18-03, TC-B2-F19-02 |
| T032b | F19 | TC-B2-F19-04 |
| T034 | F20 | TC-B2-F20-04, TC-B2-F20-05 |
| T035 | F23 | TC-B2-F23-06 |
| T036 | F25 | TC-B2-F25-03 |
| T040–T043 | F20 | TC-B2-F20-01…03 |
| T050–T052 | F22 | TC-B2-F22-01, -02, -04 |
| T060 | F17, F21 | TC-B2-F17-01, TC-B2-F21-04 |
| T061 | F22 | TC-B2-F22-05, -06 |
| T062 | F22 | TC-B2-F22-03 |
| T070–T073 | F24 | TC-B2-F24-01…04 |
| T080, T083 | F18 | TC-B2-F18-01, -02 |
| T081 | F18, F19 | TC-B2-F18-03, TC-B2-F19-02 |
| T082 | F19 | TC-B2-F19-01, -03 |
| T084, T085 | F23 | TC-B2-F23-01, TC-B2-F23-05 |
| T085b | F23 | TC-B2-F23-02, -03, -06 |
| T085c | F19 | TC-B2-F19-05 |
| T086 | F23 | TC-B2-F23-04 |
| T087 | F22 | TC-B2-F22-05 |
| T087b | F22 | TC-B2-F22-06 |
| T088 | F19, F23, F26 | TC-B2-F26-01…03 |
| T090–T092 | F25 | TC-B2-F25-01…04 |
| T100 | Regression | 156 bestehende Tests |
| T101–T104 | alle | TC-B2-F17…F26 |
| T110–T115 | — | Auslieferung |
| T119, T120 | F24 | Folgearbeit |
