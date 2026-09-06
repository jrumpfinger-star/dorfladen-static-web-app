# Bäcker-Bestellung — Specification

> Spec-driven development. Every requirement carries explicit test cases.
> Ein Spec mit offenen `[NEEDS CLARIFICATION]`-Markern darf NICHT nach `/sdd-plan`.

**Status:** Implemented — live verifiziert am 06.09.2026

**Owner:** Dorfladen Oberornau — Verkäuferinnen

**Last updated:** 2026-09-06

## Overview

Die Bestellung bei der **Bäckerei Freundl** läuft heute per Hand: Das Word-Formular
aus der letzten Mail wird kopiert, das Datum geändert, die Mengen werden getippt
und das Dokument als Anhang verschickt. Die 19 vorliegenden Bestellmails
(Jan 2025, Jul–Sep 2026) zeigen ein sehr gleichförmiges Bild — und mehrere
Schwachstellen:

- **Ein Datumsfehler ist bereits passiert:** „Bestellung für 7.8.26" enthält ein
  Formular mit dem Datum **06.08.2026** (Vortagsdatum nicht geändert). Damit
  gingen zwei Bestellungen für denselben Tag raus.
- **Drei Formularvarianten** sind im Umlauf; die Samstagsversion enthält Artikel,
  die in der Werktagsversion fehlen (Toskana, Parisienne), und umgekehrt.
- **Dubletten und Tippfehler im Katalog:** „Butterzopf 400g" unter Nr. 300 *und*
  301, „Sonnenblumenkern**bot**" neben „Sonnenblumenkern**brot**".
- **Nichts erinnert**, wenn die Bestellung vergessen wird.
- 27 Positionen werden getippt, obwohl sich in der Praxis fast nur die
  Semmelzahl ändert.

Dieses Feature ergänzt den Kiosk
([static-site/kiosk.html](../../static-site/kiosk.html)) um einen **Bäcker-Tab**
mit vier Unterreitern (Bestellung · Verlauf · Artikel · Einstellungen) sowie zwei
neue Azure-Functions-Endpunkte `api/baecker-artikel/` und `api/baecker-order/`
(Python, Dataverse-Persistenz analog zu `api/fleisch-order/`).

Referenz-Mockup: `baecker-bestellung-mockup.html` (Session-Ordner).

## Datenlage (aus den 19 vorhandenen Bestellmails)

| Merkmal | Befund |
| --- | --- |
| Empfänger | `info@baeckerei-freundl.de` |
| Absender | `info@dorfladen-oberornau.de` |
| Anhang | `Freundl-Bestellformular.docx` |
| Liefertage | Do 8× · Fr 5× · Sa 4× · Mi 2× — **keine** Bestellung für So/Mo/Di |
| Vorlauf | durchgehend **1 Tag** (Ausnahme: der Datumsfehler oben) |
| Sendezeit | zwischen **10:08 und 12:05 Uhr** |
| Kd.-Nr. | 1190 (konstant) |
| Tour-Nr. | **87** an Mi/Do/Fr · **8** am Samstag |
| Formularspalten | Artikel Nr · Artikelbezeichnung · Bestell Menge · **Retouren Menge** |
| Katalog | 60 Artikel, davon **34 jemals bestellt**, 26 nie |
| Mengen | Kaisersemmel dominiert (Mi ≈ 40, Do ≈ 48, Fr ≈ 57); alles andere 1–5 Stück und über Wochen konstant |

## Goals

- Bestellung im Kiosk erfassen und **auf einen Knopfdruck** als Word-Anhang an
  die Bäckerei senden.
- **Vorbelegung** der Mengen aus dem letzten gleichen Wochentag, plus Anzeige der
  drei vorherigen gleichen Wochentage als Vergleich.
- Das versendete Dokument sieht **exakt aus wie bisher**, damit die Bäckerei ihren
  Ablauf nicht ändern muss.
- **Sortierung durchgehend aufsteigend nach Artikelnummer** — in der Erfassung wie
  im Dokument, da die Nummer die Warengruppe bestimmt.
- **Retouren** je Artikel erfassbar (zweite Spalte des Formulars).
- **Zusatzartikel** nur für einen Tag, ohne die Vorbelegung zu verfälschen.
- **Artikelverwaltung** durch die Verkäuferinnen.
- Nach dem Versand sind die Werte **gesperrt**; Änderungen nur über eine
  ausdrückliche **Korrektur**.
- **Erinnerung**: ab Bestellschluss blinkt der Bäcker-Reiter, bis die Mail raus ist.
- Konform zur Konstitution: responsive (Mobile/iPad/Desktop), benutzerfreundliche
  Meldungen, automatisierte Playwright-Tests.

## Non-Goals

- Keine Anbindung an ein Warenwirtschafts- oder Kassensystem.
- Keine automatische Mengenprognose über den letzten gleichen Wochentag hinaus
  (kein Mittelwert, kein Trend, keine Wetter-/Feiertagslogik).
- Kein Abgleich mit tatsächlichen Lieferungen oder Rechnungen der Bäckerei.
- Keine Bestellung bei anderen Bäckereien (Freundl ist fest verdrahtet, Adresse
  und Kd.-Nr. sind Einstellungen).
- Kein Löschen von Artikeln (nur Ausblenden) und kein Löschen gesendeter
  Bestellungen.
- Kein automatischer Versand ohne Bestätigung durch eine Verkäuferin.

## Decisions (aufgelöste Klärungen)

1. **Vorbelegung:** Exakt die Mengen des **letzten gleichen Wochentags** mit
   gesendeter Bestellung. Kein Mittelwert — nachvollziehbar und erklärbar.
2. **Vergleichswerte:** Je Artikel werden zusätzlich die **drei vorherigen**
   gleichen Wochentage angezeigt (nur Anzeige, keine Berechnung).
3. **Sortierung:** Durchgehend **aufsteigend nach Artikelnummer**, in Erfassung
   und Dokument. Artikel **ohne** Nummer stehen am Ende.
4. **Warengruppen:** Im Kiosk trennen Zwischenüberschriften die Nummernbereiche
   (Start: 1–119 Semmeln, 120–301 Brote, ab 302 Süßes/Sonstiges). Reine
   Lesehilfe — sie erscheinen **nicht** im Dokument. Grenzen sind einstellbar.
5. **Anzeigeumfang:** Standard ist „Übliche Artikel" (aktive), umschaltbar auf
   „Alle Artikel". Der Umschalter ändert **nur die Anzeige, nie die Reihenfolge**.
6. **Retouren:** Zweite Mengenspalte je Artikel, standardmäßig leer. Wird
   unverändert in die Spalte „Retouren Menge" geschrieben und fließt **nicht** in
   die Vorbelegung ein.
7. **Zusatzartikel:** Entweder aus dem Katalog geholt oder frei eingetragen
   (Nummer optional). Gelten nur für den gewählten Tag, fließen **nicht** in die
   Vorbelegung ein. Optional dauerhaft in den Katalog übernehmbar.
8. **Tour-Nr.:** Je Wochentag hinterlegt — **87** an Mi/Do/Fr, **8** am Samstag.
9. **Bestelltage:** Einstellbar, Startwert **Mi–Sa** (aus der Datenlage).
10. **Bestellschluss:** Einstellbar, Startwert **12:00 Uhr**. Er steuert nur die
    Erinnerung, **blockiert den Versand nicht**.
11. **Sperre:** Nach dem Versand sind alle Felder gesperrt. „Korrektur senden"
    öffnet sie wieder.
12. **Korrektur:** Versendet ein **komplettes neues Formular** mit dem Betreff
    „Korrektur Bestellung TT.MM.JJJJ", ohne Hervorhebung im Dokument. Mehrere
    Korrekturen sind möglich, jede wird protokolliert.
13. **Vorlage:** Die **Werktagsvariante** aus den vorhandenen Mails ist die
    Vorlage (10 von 19 Mails nutzen sie, saubere Absatztrennung). Ihr leerer
    Spaltenkopf über der Mengenspalte wird mit **„Bestell Menge"** gefüllt —
    so steht es bereits in der Samstagsvariante.
14. **Artikel ohne Katalogeintrag im Dokument:** Am Ende der Tabelle ergänzt,
    indem eine bestehende Zeile geklont wird — dadurch bleiben Schrift, Rahmen
    und Spaltenbreiten unverändert.
15. **Empfänger:** Einstellung. Bis zur Freigabe **`jrumpfinger@t-online.de`**
    (Testbetrieb), danach `info@baeckerei-freundl.de`. Absender ist immer
    `info@dorfladen-oberornau.de`.
16. **Testkennzeichnung:** Solange der Empfänger nicht die Bäckerei ist, zeigt
    der Versanddialog deutlich sichtbar „Testbetrieb".
17. **Historie:** Die 19 vorhandenen Mails werden einmalig als gesendete
    Bestellungen importiert, damit die Vorbelegung ab dem ersten Tag greift.
18. **Katalog-Bereinigung:** Beim Import werden Dubletten verworfen
    („Butterzopf 400g" nur unter Nr. 301) und Tippfehler korrigiert
    („Sonnenblumenkernbot" → „Sonnenblumenkernbrot", „Himbermarmelade" →
    „Himbeermarmelade", „Wallnussbaguette" → „Walnussbaguette",
    „Kaiserschmarn" → „Kaiserschmarrn", „Schloßbräü Kruste" → „Schlossbräu Kruste").
19. **Nie bestellte Artikel** sind im Katalog **inaktiv** vorbelegt (26 von 60) —
    sie bleiben über „Alle Artikel" erreichbar.
20. **Auth:** Der Bäcker-Tab liegt hinter dem bestehenden Kiosk-/CMS-Login;
    schreibende Endpunkte sind serverseitig geschützt (`admin_auth_guard`).

## Requirements

<!-- markdownlint-disable MD024 -->

### F1: Bestelltag wählen

#### F1 Description

Der Bäcker-Tab zeigt eine Tagesleiste über sieben Tage ab heute. Nur konfigurierte
Bestelltage sind wählbar; beim Öffnen ist der **nächste offene Bestelltag** aktiv.

#### F1 Behaviour / Acceptance

- Given es ist Mittwoch und Bestelltage sind Mi–Sa, When der Tab geöffnet wird,
  Then ist **Donnerstag** (morgen) vorausgewählt.
- Nicht-Bestelltage sind sichtbar, aber ausgegraut und nicht anklickbar.
- Jeder Tag zeigt seinen Status: `offen` · `gesendet` · `korrigiert` · `kein Tag`.
- Ist die Bestellung für morgen bereits gesendet, wird der **nächste offene**
  Bestelltag vorausgewählt.

#### F1 Test Cases

**TC-F1-01: Nächster Bestelltag ist vorausgewählt**

- **Setup:** Heute Mittwoch, Bestelltage Mi–Sa, keine Bestellung gesendet.
- **Action:** Bäcker-Tab öffnen.
- **Expected:** Donnerstag aktiv; Kopfzeile nennt „Donnerstag" und das Datum.

**TC-F1-02: Nicht-Bestelltage sind gesperrt**

- **Setup:** Bestelltage Mi–Sa.
- **Action:** Auf Sonntag/Montag/Dienstag tippen.
- **Expected:** Kein Wechsel; die Tage sind als „kein Tag" gekennzeichnet.

**TC-F1-03: Bereits gesendeter Tag wird übersprungen**

- **Setup:** Bestellung für morgen ist gesendet.
- **Action:** Tab öffnen.
- **Expected:** Der übernächste Bestelltag ist aktiv; der gesendete Tag trägt
  die Kennzeichnung „gesendet".

### F2: Mengen aus dem letzten gleichen Wochentag vorbelegen

#### F2 Description

Beim Öffnen eines offenen Bestelltags sind alle Mengen bereits gefüllt — mit den
Werten der letzten **gesendeten** Bestellung desselben Wochentags. Je Artikel
werden zusätzlich die drei vorherigen gleichen Wochentage angezeigt.

#### F2 Inputs

| Input | Beschreibung |
| --- | --- |
| `datum` | gewählter Liefertag |
| Historie | gesendete/korrigierte Bestellungen desselben Wochentags, absteigend |

#### F2 Behaviour / Acceptance

- Given es gibt eine gesendete Bestellung desselben Wochentags, Then werden deren
  Mengen als Vorbelegung übernommen und die Herkunft genannt
  („vorbelegt mit den Werten vom letzten Donnerstag, 03.09.").
- Given es gibt **keine** Historie für diesen Wochentag, Then starten alle Mengen
  bei 0 und der Hinweis nennt „keine Vorlage vorhanden".
- Wurde eine Bestellung korrigiert, gilt der **korrigierte** Stand als Vorlage.
- **Retouren** und **Zusatzartikel** werden **nicht** übernommen.
- Ein Artikel, der inzwischen inaktiv ist, wird nicht vorbelegt.
- „Auf letzten … zurücksetzen" stellt die Vorbelegung wieder her.

#### F2 Test Cases

**TC-F2-01: Vorbelegung aus dem letzten gleichen Wochentag**

- **Setup:** Letzter Donnerstag gesendet mit Kaisersemmel 48, Dinkli 3.
- **Action:** Donnerstag öffnen.
- **Expected:** Kaisersemmel 48, Dinkli 3; Hinweis nennt das Herkunftsdatum.

**TC-F2-02: Freitag nutzt nicht die Donnerstagswerte**

- **Setup:** Do 48, Fr 57 gesendet.
- **Action:** Freitag öffnen.
- **Expected:** Kaisersemmel 57 (nicht 48).

**TC-F2-03: Ohne Historie starten alle Mengen bei 0**

- **Setup:** Keine gesendete Bestellung für diesen Wochentag.
- **Action:** Tag öffnen.
- **Expected:** Alle Mengen 0; Hinweis „keine Vorlage vorhanden"; kein Fehler.

**TC-F2-04: Vergleichswerte werden angezeigt**

- **Setup:** Vier gesendete Donnerstage mit Kaisersemmel 48, 45, 48, 50.
- **Action:** Donnerstag öffnen.
- **Expected:** Menge 48; daneben die drei Vergleichswerte 45, 48, 50.

**TC-F2-05: Zurücksetzen stellt die Vorbelegung wieder her**

- **Setup:** Vorbelegung 48, Nutzerin ändert auf 52.
- **Action:** „Auf letzten Donnerstag zurücksetzen".
- **Expected:** Wieder 48; Änderungsmarkierung verschwindet.

**TC-F2-06: Retouren werden nicht vorbelegt**

- **Setup:** Letzter Donnerstag hatte Retouren 3 bei Kaisersemmel.
- **Action:** Donnerstag öffnen.
- **Expected:** Retourenfeld leer.

### F3: Mengen und Retouren erfassen

#### F3 Description

Je Artikel gibt es ein Mengenfeld mit Plus/Minus sowie ein Feld für die
Retourenmenge. Die Liste ist aufsteigend nach Artikelnummer sortiert.

#### F3 Behaviour / Acceptance

- Sortierung **aufsteigend nach Artikelnummer**; Artikel ohne Nummer am Ende.
- Warengruppen-Überschriften trennen die Nummernbereiche (reine Lesehilfe).
- Plus/Minus ändern in Schritten von 1; Minus stoppt bei 0.
- Direkte Eingabe ist möglich; nur nicht-negative ganze Zahlen werden akzeptiert.
- Geänderte Werte sind gegenüber der Vorbelegung sichtbar markiert.
- Das Retourenfeld ist optional und standardmäßig leer.
- Der Umschalter „Übliche Artikel" / „Alle Artikel" ändert nur die Anzeige.
- Die Fußzeile nennt laufend Positionen und Gesamtstückzahl.
- Alle Bedienelemente haben mindestens 44×44px Tap-Target.

#### F3 Test Cases

**TC-F3-01: Sortierung nach Artikelnummer**

- **Setup:** Katalog mit Nummern 1, 33, 126, 1183 und einem Artikel ohne Nummer.
- **Action:** Bestelltag öffnen.
- **Expected:** Reihenfolge 1, 33, 126, 1183, danach der Artikel ohne Nummer.

**TC-F3-02: Plus/Minus verändern die Menge**

- **Setup:** Kaisersemmel mit Menge 48.
- **Action:** Zweimal Plus, einmal Minus.
- **Expected:** Menge 49; Zeile ist als geändert markiert.

**TC-F3-03: Minus stoppt bei 0**

- **Setup:** Artikel mit Menge 0.
- **Action:** Minus.
- **Expected:** Menge bleibt 0; kein negativer Wert.

**TC-F3-04: Retouren erfassen**

- **Setup:** Offener Bestelltag.
- **Action:** Bei Kaisersemmel Retouren 3 eintragen.
- **Expected:** Wert wird übernommen; Bestellmenge bleibt unverändert.

**TC-F3-05: Umschalter ändert die Reihenfolge nicht**

- **Setup:** Aktive und inaktive Artikel im Katalog.
- **Action:** Auf „Alle Artikel" schalten.
- **Expected:** Mehr Zeilen, aber weiterhin aufsteigend nach Nummer.

**TC-F3-06: Ungültige Eingabe wird abgefangen**

- **Setup:** Mengenfeld.
- **Action:** „-5" bzw. „abc" eingeben.
- **Expected:** Wert wird auf 0 normalisiert; kein technischer Fehler.

### F4: Zusatzartikel nur für diesen Tag

#### F4 Description

Über „Weiteren Artikel für diesen Tag hinzufügen" lassen sich Positionen ergänzen —
entweder aus dem Katalog (auch inaktive) oder frei eingetragen.

#### F4 Behaviour / Acceptance

- Die Suche findet **alle** Katalogartikel, auch inaktive.
- Frei eingetragene Positionen brauchen eine Bezeichnung; die Nummer ist optional.
- Zusatzpositionen erscheinen im Abschnitt „Nur für diesen Tag" und lassen sich
  einzeln wieder entfernen.
- Sie fließen **nicht** in die Vorbelegung künftiger Bestellungen ein.
- Optional „dauerhaft in die Artikelliste übernehmen" — dann entsteht ein
  Katalogeintrag (Regeln aus F5 gelten).
- Im Dokument stehen sie an ihrer Nummernposition; **ohne** Nummer am Ende.

#### F4 Test Cases

**TC-F4-01: Artikel aus dem Katalog ergänzen**

- **Setup:** „Brezensalz 5kg" (Nr. 686) ist inaktiv.
- **Action:** Suchen, hinzufügen, Menge 1.
- **Expected:** Erscheint unter „Nur für diesen Tag"; Positionszähler +1.

**TC-F4-02: Frei eingetragene Position**

- **Setup:** Offener Bestelltag.
- **Action:** „Brezen für Feuerwehrfest", Menge 40, ohne Nummer.
- **Expected:** Position erscheint; kein Katalogeintrag entsteht.

**TC-F4-03: Bezeichnung ist Pflicht**

- **Setup:** Dialog „Frei eintragen".
- **Action:** Ohne Bezeichnung übernehmen.
- **Expected:** Benutzerfreundlicher Hinweis; nichts wird hinzugefügt.

**TC-F4-04: Zusatzposition entfernen**

- **Setup:** Zwei Zusatzpositionen.
- **Action:** Eine über „✕" entfernen.
- **Expected:** Nur noch eine; Zähler aktualisiert.

**TC-F4-05: Zusatz verfälscht die Vorbelegung nicht**

- **Setup:** Donnerstag mit Zusatzposition 40 Brezen wird gesendet.
- **Action:** Nächsten Donnerstag öffnen.
- **Expected:** Keine Brezen-Position vorbelegt.

**TC-F4-06: Dauerhaft übernehmen**

- **Setup:** Frei eingetragener Artikel mit Nummer 852, Haken gesetzt.
- **Action:** Übernehmen.
- **Expected:** Artikel steht danach im Katalog an Nummernposition 852.

### F5: Artikel verwalten

#### F5 Description

Der Reiter „Artikel" listet den Katalog aufsteigend nach Nummer. Artikel lassen
sich anlegen, umbenennen und aus-/einblenden — aber nicht löschen.

#### F5 Behaviour / Acceptance

- Liste zeigt Nummer, Bezeichnung, Warengruppe, letzte Verwendung und einen
  Aktiv-Schalter; Filter „Aktiv" / „Ausgeblendet".
- Beim Anlegen sind Nummer und Bezeichnung erfassbar; die **Nummer bestimmt die
  Position** — es gibt keine separate Sortiereingabe.
- Existiert die Nummer bereits oder ist ein Name sehr ähnlich, erscheint ein
  Hinweis; das Speichern ist erst nach Bestätigung möglich.
- Optionale Wochentagseinschränkung je Artikel (z. B. nur Donnerstag).
- **Ausblenden statt Löschen:** Inaktive Artikel verschwinden aus der Standard-
  Erfassung und aus dem Dokument, bleiben aber im Verlauf sichtbar.
- Änderungen wirken sich **nicht rückwirkend** auf gesendete Bestellungen aus.

#### F5 Test Cases

**TC-F5-01: Katalog ist nach Nummer sortiert**

- **Setup:** Katalog mit gemischten Nummern.
- **Action:** Reiter „Artikel" öffnen.
- **Expected:** Aufsteigend nach Nummer; Artikel ohne Nummer am Ende.

**TC-F5-02: Neuen Artikel anlegen**

- **Setup:** Nummer 852 ist frei.
- **Action:** „Dinkel-Nuss-Kruste", Nr. 852 anlegen.
- **Expected:** Erscheint zwischen 686 und 1126 — in Verwaltung und Erfassung.

**TC-F5-03: Dublettenwarnung bei gleicher Nummer**

- **Setup:** Nr. 1 ist vergeben (Kaisersemmel).
- **Action:** Neuen Artikel mit Nr. 1 anlegen.
- **Expected:** Benutzerfreundlicher Hinweis auf den bestehenden Artikel.

**TC-F5-04: Dublettenwarnung bei ähnlichem Namen**

- **Setup:** „Sonnenblumenkernbrot 750g" existiert.
- **Action:** „Sonnenblumenkernbot 750g" anlegen.
- **Expected:** Hinweis auf den ähnlichen Artikel.

**TC-F5-05: Ausblenden entfernt aus der Erfassung**

- **Setup:** Aktiver Artikel ohne Menge.
- **Action:** Aktiv-Schalter aus, zurück zur Bestellung.
- **Expected:** Artikel erscheint nicht mehr unter „Übliche Artikel", aber unter
  „Alle Artikel".

**TC-F5-06: Ausblenden verändert alte Bestellungen nicht**

- **Setup:** Gesendete Bestellung enthält Artikel X.
- **Action:** X ausblenden, gesendete Bestellung im Verlauf öffnen.
- **Expected:** X ist dort weiterhin mit seiner Menge sichtbar.

### F6: Word-Formular erzeugen

#### F6 Description

Beim Versand wird aus der Vorlage ein `.docx` erzeugt, das dem bisher
verschickten Formular entspricht.

#### F6 Behaviour / Acceptance

- Kopfzeile enthält **Datum des Liefertags**, Kd.-Nr. und die **wochentagsabhängige
  Tour-Nr.** (Mi/Do/Fr → 87, Sa → 8).
- Tabellenzeilen enthalten Artikelnummer, Bezeichnung, **Bestellmenge** und
  **Retourenmenge**.
- Reihenfolge **aufsteigend nach Artikelnummer**; Positionen ohne Nummer am Ende.
- Artikel ohne Menge und ohne Retoure bleiben als **leere Zeile** stehen (wie
  bisher) — die Bäckerei ist das gewohnt.
- Inaktive Artikel ohne Menge erscheinen **nicht**.
- Layout, Schrift, Rahmen und Spaltenbreiten entsprechen der Vorlage.
- Der Dateiname ist immer `Freundl-Bestellformular.docx`.
- Die Datei ist mit Word und LibreOffice ohne Reparaturhinweis zu öffnen.

#### F6 Test Cases

**TC-F6-01: Kopfdaten werden gesetzt**

- **Setup:** Liefertag Donnerstag, 10.09.2026.
- **Action:** Dokument erzeugen.
- **Expected:** „Datum: 10.09.2026", „Kd.-Nr. 1190 / Tour-Nr. 87".

**TC-F6-02: Samstag nutzt Tour-Nr. 8**

- **Setup:** Liefertag Samstag.
- **Action:** Dokument erzeugen.
- **Expected:** „Tour-Nr. 8".

**TC-F6-03: Mengen und Retouren stehen in den richtigen Spalten**

- **Setup:** Kaisersemmel Menge 52, Retoure 3.
- **Action:** Dokument erzeugen.
- **Expected:** In der Zeile „1 / Kaisersemmel" steht Spalte 3 = 52, Spalte 4 = 3.

**TC-F6-04: Reihenfolge entspricht der Artikelnummer**

- **Setup:** Positionen mit Nummern 1, 126, 1183 und eine ohne Nummer.
- **Action:** Dokument erzeugen.
- **Expected:** Zeilenreihenfolge 1, 126, 1183, danach die Position ohne Nummer.

**TC-F6-05: Dokument ist gültig**

- **Setup:** Beliebige Bestellung.
- **Action:** Dokument erzeugen und wieder einlesen.
- **Expected:** Gültiges ZIP mit `word/document.xml`; parsebar; alle Teile der
  Vorlage vorhanden.

**TC-F6-06: Struktur entspricht dem Original**

- **Setup:** Mengen einer vorhandenen Bestellmail.
- **Action:** Dokument erzeugen und mit dem Original vergleichen.
- **Expected:** Gleiche Spaltenzahl, gleiche Artikelreihenfolge, gleiche Werte in
  den Mengenspalten.

### F7: Bestellung senden

#### F7 Description

„An Bäckerei senden" öffnet eine Vorschau. Erst die Bestätigung verschickt die
Mail mit dem Formular im Anhang.

#### F7 Behaviour / Acceptance

- Die Vorschau zeigt Absender, Empfänger, Betreff, Anhangnamen, Liefertag und die
  Positionen in Versandreihenfolge.
- Ist der Empfänger nicht die Bäckerei, erscheint deutlich sichtbar „Testbetrieb".
- Absender ist immer `info@dorfladen-oberornau.de`.
- Betreff: „Bestellung TT.MM.JJJJ".
- Nach Erfolg: Status `gesendet`, Zeitstempel und Name im Protokoll, Erfolgsmeldung.
- Bei Fehlschlag bleibt der Status `offen`, es erscheint eine **benutzerfreundliche**
  Meldung (Konstitution §6) und ein erneuter Versuch ist möglich.
- Eine Bestellung ohne jede Menge und ohne Retoure wird **nicht** gesendet.
- Der Bestellschluss blockiert den Versand **nicht**.

#### F7 Test Cases

**TC-F7-01: Vorschau zeigt die Versanddaten**

- **Setup:** Erfasste Bestellung.
- **Action:** „An Bäckerei senden".
- **Expected:** Absender, Empfänger, Betreff „Bestellung 10.09.2026", Anhangname
  und Positionsliste sichtbar; noch kein Versand.

**TC-F7-02: Testbetrieb ist gekennzeichnet**

- **Setup:** Empfänger `jrumpfinger@t-online.de`.
- **Action:** Vorschau öffnen.
- **Expected:** Deutlicher Hinweis „Testbetrieb" mit der Zieladresse.

**TC-F7-03: Erfolgreicher Versand sperrt die Bestellung**

- **Setup:** Vorschau offen.
- **Action:** Bestätigen; API meldet Erfolg.
- **Expected:** Status „gesendet", Zeit und Name im Protokoll, Felder gesperrt.

**TC-F7-04: Fehlschlag ist wiederholbar**

- **Setup:** API meldet einen Fehler.
- **Action:** Senden.
- **Expected:** Freundliche Meldung ohne technische Details; Status bleibt
  „offen"; erneuter Versand möglich.

**TC-F7-05: Leere Bestellung wird abgewiesen**

- **Setup:** Alle Mengen 0, keine Retouren.
- **Action:** Senden.
- **Expected:** Hinweis, dass nichts zu bestellen ist; kein Versand.

### F8: Sperre und Korrektur

#### F8 Description

Nach dem Versand sind die Werte gesperrt. „Korrektur senden" öffnet sie wieder
und verschickt ein vollständiges neues Formular.

#### F8 Behaviour / Acceptance

- Im Status `gesendet` sind alle Eingabefelder gesperrt.
- „Korrektur senden" entsperrt die Felder; Änderungen werden gegenüber dem
  gesendeten Stand markiert.
- Der Korrekturversand nutzt den Betreff **„Korrektur Bestellung TT.MM.JJJJ"**
  und enthält das **komplette** Formular.
- Nach dem Korrekturversand ist der Status `korrigiert` und die Felder sind
  wieder gesperrt.
- Mehrere Korrekturen sind möglich; jede erscheint im Protokoll.
- „Verwerfen" stellt den gesendeten Stand wieder her.
- Die **letzte** Fassung gilt als Vorlage für die Vorbelegung.
- Das Protokoll zeigt je Eintrag Zeitpunkt, Name und Positions-/Stückzahl.

#### F8 Test Cases

**TC-F8-01: Gesendete Bestellung ist gesperrt**

- **Setup:** Status „gesendet".
- **Action:** Menge ändern versuchen.
- **Expected:** Felder sind schreibgeschützt; Plus/Minus reagieren nicht.

**TC-F8-02: Korrekturmodus entsperrt**

- **Setup:** Status „gesendet".
- **Action:** „Korrektur senden".
- **Expected:** Felder editierbar; Kopfzeile weist auf die Korrektur hin.

**TC-F8-03: Änderungen werden markiert**

- **Setup:** Korrekturmodus, gesendet war Kaisersemmel 52.
- **Action:** Auf 60 ändern.
- **Expected:** Zeile markiert, Anzeige „52 → 60".

**TC-F8-04: Korrekturbetreff**

- **Setup:** Korrektur mit Änderungen.
- **Action:** Senden.
- **Expected:** Betreff „Korrektur Bestellung 10.09.2026"; vollständiges Formular.

**TC-F8-05: Verwerfen stellt den Stand wieder her**

- **Setup:** Korrekturmodus mit Änderungen.
- **Action:** „Verwerfen".
- **Expected:** Ursprüngliche Werte; Status wieder „gesendet"; kein Versand.

**TC-F8-06: Protokoll enthält Original und Korrektur**

- **Setup:** Bestellung gesendet, danach korrigiert.
- **Action:** Verlauf ansehen.
- **Expected:** Beide Einträge mit Zeit und Name, neueste oben.

**TC-F8-07: Korrigierter Stand ist die Vorlage**

- **Setup:** Donnerstag gesendet 52, korrigiert auf 60.
- **Action:** Nächsten Donnerstag öffnen.
- **Expected:** Vorbelegung 60.

### F9: Erinnerung ab Bestellschluss

#### F9 Description

Ist für den nächsten Bestelltag noch nichts gesendet, macht der Kiosk darauf
aufmerksam — ab dem Bestellschluss unübersehbar.

#### F9 Behaviour / Acceptance

- Vor dem Bestellschluss: Zähler am Bäcker-Reiter.
- **Ab dem Bestellschluss blinkt der Reiter**, bis die Bestellung gesendet ist.
- Zusätzlich erscheint eine Hinweiszeile im Bäcker-Tab **und** im Mittagstisch-Tab.
- Erinnerung nur an Tagen, an denen **morgen ein Bestelltag** ist.
- Nach dem Versand verschwinden Zähler, Blinken und Hinweiszeile sofort.
- Ein vergangener Bestelltag ohne Versand wird im Verlauf als **„nicht bestellt"**
  gekennzeichnet.

#### F9 Test Cases

**TC-F9-01: Zähler vor dem Bestellschluss**

- **Setup:** 11:00 Uhr, morgen Bestelltag, nichts gesendet.
- **Action:** Kiosk öffnen.
- **Expected:** Zähler am Bäcker-Reiter, kein Blinken.

**TC-F9-02: Blinken ab dem Bestellschluss**

- **Setup:** 12:30 Uhr, morgen Bestelltag, nichts gesendet.
- **Action:** Kiosk öffnen.
- **Expected:** Reiter blinkt; Hinweiszeile sichtbar.

**TC-F9-03: Kein Blinken nach dem Versand**

- **Setup:** 12:30 Uhr, Bestellung für morgen gesendet.
- **Action:** Kiosk öffnen.
- **Expected:** Kein Zähler, kein Blinken, keine Hinweiszeile.

**TC-F9-04: Keine Erinnerung ohne Bestelltag**

- **Setup:** Samstag 12:30 Uhr, morgen (Sonntag) kein Bestelltag.
- **Action:** Kiosk öffnen.
- **Expected:** Keine Erinnerung.

**TC-F9-05: Verpasster Tag ist gekennzeichnet**

- **Setup:** Vergangener Bestelltag ohne Versand.
- **Action:** Verlauf öffnen.
- **Expected:** Tag als „nicht bestellt" markiert.

### F10: Verlauf

#### F10 Description

Der Reiter „Verlauf" listet die vergangenen Bestellungen mit Status und erlaubt
den Blick auf das gesendete Dokument.

#### F10 Behaviour / Acceptance

- Liste absteigend nach Liefertag mit Wochentag, Status, Positions- und Stückzahl.
- Ein Eintrag lässt sich öffnen und zeigt die gesendeten Positionen.
- Das gesendete Dokument ist erneut herunterladbar.
- Nicht bestellte Bestelltage erscheinen als eigener Eintrag „nicht bestellt".
- Positionen erscheinen mit der Bezeichnung **zum Sendezeitpunkt**.

#### F10 Test Cases

**TC-F10-01: Verlauf ist absteigend sortiert**

- **Setup:** Mehrere gesendete Bestellungen.
- **Action:** Verlauf öffnen.
- **Expected:** Neueste oben, mit Wochentag und Status.

**TC-F10-02: Eintrag zeigt die Positionen**

- **Setup:** Gesendete Bestellung mit 27 Positionen.
- **Action:** Eintrag öffnen.
- **Expected:** Alle Positionen mit Menge, nach Nummer sortiert.

**TC-F10-03: Dokument erneut abrufbar**

- **Setup:** Gesendete Bestellung.
- **Action:** „Formular ansehen".
- **Expected:** Das damals gesendete Dokument wird geliefert.

### F11: Einstellungen

#### F11 Description

Bestelltage, Bestellschluss, Empfänger und Kopfdaten sind einstellbar.

#### F11 Inputs

| Einstellung | Startwert |
| --- | --- |
| Bestelltage | Mi, Do, Fr, Sa |
| Bestellschluss | 12:00 Uhr |
| Empfänger | `jrumpfinger@t-online.de` (Testbetrieb) |
| Absender | `info@dorfladen-oberornau.de` (fest) |
| Kd.-Nr. | 1190 |
| Tour-Nr. | 87 (Mi/Do/Fr) · 8 (Sa) |
| Warengruppen-Grenzen | 1–119 · 120–301 · ab 302 |

#### F11 Behaviour / Acceptance

- Änderungen wirken sofort auf Tagesleiste, Erinnerung und Dokumentkopf.
- Der Empfänger wird auf gültige Mail-Syntax geprüft.
- Bestelltage: mindestens einer muss gewählt sein.
- Tour-Nr. ist je Wochentag hinterlegbar.
- Änderungen wirken **nicht rückwirkend** auf gesendete Bestellungen.

#### F11 Test Cases

**TC-F11-01: Bestelltag ändern wirkt auf die Tagesleiste**

- **Setup:** Bestelltage Mi–Sa.
- **Action:** Dienstag zusätzlich aktivieren.
- **Expected:** Dienstag ist in der Tagesleiste wählbar.

**TC-F11-02: Kein Bestelltag ist unzulässig**

- **Setup:** Einstellungen.
- **Action:** Alle Tage abwählen und speichern.
- **Expected:** Freundlicher Hinweis; nichts wird gespeichert.

**TC-F11-03: Ungültige Empfängeradresse**

- **Setup:** Einstellungen.
- **Action:** „nicht-gueltig" eingeben und speichern.
- **Expected:** Freundlicher Hinweis; nichts wird gespeichert.

**TC-F11-04: Tour-Nr. je Wochentag**

- **Setup:** Sa = 8, sonst 87.
- **Action:** Samstagsbestellung erzeugen.
- **Expected:** Dokument trägt „Tour-Nr. 8".

### F12: Responsive und bedienbar

#### F12 Description

Der Bäcker-Tab ist auf allen drei Zielauflösungen bedienbar.

#### F12 Behaviour / Acceptance

- Auf 375×667, 768×1024 und 1280×800 kein horizontales Scrollen des Dokuments.
- Alle Bedienelemente mindestens 44×44px.
- Auf schmalen Schirmen bricht die Artikelzeile sinnvoll um; Menge und Retoure
  bleiben erreichbar.
- Kein `alert()`/`confirm()`; Meldungen nutzen die Kiosk-Komponenten.

#### F12 Test Cases

**TC-F12-01: Kein horizontales Scrollen**

- **Setup:** Bestelltag mit vielen Artikeln.
- **Action:** Auf allen drei Auflösungen öffnen.
- **Expected:** `scrollWidth <= innerWidth` (+1px Toleranz).

**TC-F12-02: Tap-Targets**

- **Setup:** 375×667.
- **Action:** Plus/Minus und Kopfzeilen-Knöpfe messen.
- **Expected:** Jeweils mindestens 44px.

**TC-F12-03: Keine nativen Dialoge**

- **Setup:** Fehlerfall beim Senden.
- **Action:** Senden.
- **Expected:** Kein `alert()`; Meldung über die Kiosk-Komponente.

### F13: Tab im CMS an- und abschaltbar

#### F13 Description

Der Bäcker-Tab lässt sich wie die übrigen Kiosk-Tabs im CMS unter
„Feature-Einstellungen" ein- und ausschalten (Flag `kiosk_baecker`).

#### F13 Behaviour / Acceptance

- Im CMS steht ein Schalter „Bäckerbestellung" direkt unter „Fleischbestellung".
- Ausgeschaltet verschwindet der Tab im Kiosk; das Panel bleibt im DOM.
- **Solange nie gespeichert wurde, gilt der Tab als eingeschaltet.** Anders als
  bei den übrigen Tabs ist die Vorbelegung „an" — sonst wäre der Tab nach dem
  Ausrollen unsichtbar, bis jemand im CMS einmal speichert.

#### F13 Test Cases

**TC-F13-01: Schalter aus blendet den Tab aus**

- **Setup:** `cms-config` liefert `kiosk_baecker: false`.
- **Action:** Kiosk öffnen.
- **Expected:** Der Tab ist im DOM vorhanden, aber nicht sichtbar.

**TC-F13-02: Schalter an zeigt den Tab**

- **Setup:** `cms-config` liefert `kiosk_baecker: true`.
- **Action:** Kiosk öffnen.
- **Expected:** Der Tab ist sichtbar.

**TC-F13-03: Nie gespeichert gilt als an**

- **Setup:** `cms-config` liefert die Feature-Flags ohne `kiosk_baecker`.
- **Action:** Kiosk öffnen.
- **Expected:** Der Tab ist sichtbar.

## Data / API

### Neue Endpunkte

| Endpunkt | Methode | Zweck |
| --- | --- | --- |
| `/api/baecker-artikel` | GET | Katalog, sortiert nach Nummer |
| `/api/baecker-artikel` | POST | Artikel anlegen (mit Dublettenprüfung) |
| `/api/baecker-artikel/{id}` | PATCH | Ändern, aus-/einblenden |
| `/api/baecker-order?datum=…` | GET | Bestellung/Entwurf inkl. Vorbelegung und Vergleichswerten |
| `/api/baecker-order` | POST | Entwurf speichern |
| `/api/baecker-order/{id}/senden` | POST | Dokument erzeugen und Mail versenden |
| `/api/baecker-order/{id}/korrektur` | POST | Korrektur versenden |
| `/api/baecker-order?mode=verlauf` | GET | Verlauf |
| `/api/baecker-order/{id}/dokument` | GET | Gesendetes Dokument abrufen |

### Dataverse

**`dl_baeckerartikels`** — Nummer, Bezeichnung, aktiv, Wochentagseinschränkung,
angelegt von/am.

**`dl_baeckerbestellungs`** — Liefertag, Status (0 Entwurf / 1 Gesendet /
2 Korrigiert), Positionen als JSON (Nummer, Bezeichnung, Menge, Retoure,
Zusatz-Kennzeichen), Protokoll als JSON, gesendetes Dokument.

### Wiederverwendung

- Mailversand über Microsoft Graph wie in `api/shop-notify/__init__.py`;
  `send_email()` wird um Dateianhänge erweitert.
- Auth über `api/shared/auth.py` (`admin_auth_guard`).

## Constitution Compliance

| Prinzip | Erfüllung |
| --- | --- |
| 1 Spec first | Diese Spec vor Plan/Tasks/Code |
| 2 Test cases | F1–F12 mit TC-Fn-xx, Playwright |
| 3 Keine Secrets | Graph-Zugang über bestehende App-Einstellungen |
| 4 Keine Artefakte | Vorlage und Katalog sind Quelldateien, keine Build-Ausgabe |
| 5 Deploy-aware | Auslieferung über den bestehenden SWA-Workflow |
| 6 Freundliche Meldungen | Alle Hinweise in Klartext, kein `alert()` (F7, F12) |
| 7 Responsive | F12 auf allen drei Viewports |
| 8 Automatisierte Tests | `tests/kiosk-baecker.spec.js` mit gemockter API |

### F14: Artikel bearbeiten

#### F14 Description

Nummer und Bezeichnung bestehender Artikel lassen sich ändern.

#### F14 Behaviour / Acceptance

- Jede Zeile der Artikelverwaltung hat einen Bearbeiten-Knopf.
- Der Dialog ist mit Nummer und Bezeichnung vorbelegt.
- Eine bereits vergebene Nummer wird abgelehnt – zwei Artikel mit derselben
  Nummer würden in Vorbelegung und Verlauf verschmelzen.
- Ein ähnlicher Name wird gemeldet, lässt sich aber bestätigen.
- **Wird die Nummer geändert, werden die früheren Bestellungen mitgezogen.**
  Positionen werden über die Nummer zugeordnet; ohne Nachziehen verlöre der
  Artikel seine Vorbelegung und die alte Nummer erschiene als Zusatzposition.
- Die Liste nutzt die Bildschirmbreite (zwei Spalten ab 1080px, drei ab 1620px).

#### F14 Test Cases

**TC-F14-01: Bearbeiten-Knopf je Zeile** – Artikelverwaltung öffnen; jede Zeile
zeigt den Stift.

**TC-F14-02: Dialog vorbelegt** – Stift bei „Kaisersemmel"; Nummer und
Bezeichnung stehen im Formular.

**TC-F14-03: Änderung wird gesendet** – Bezeichnung ändern und speichern; PATCH
mit neuem Namen und altem Schlüssel geht raus.

**TC-F14-04: Ohne Änderung kein Aufruf** – Dialog unverändert speichern; kein
API-Aufruf, Dialog schließt.

**TC-F14-05: Breite genutzt** – Spaltenzahl passt zur Fensterbreite.

### F15: Fester Kopf, sichtbares Eingabefeld

#### F15 Description

Der Kopfbereich bleibt stehen, während die Artikelliste scrollt. Das fokussierte
Feld ist immer sichtbar.

#### F15 Behaviour / Acceptance

- Tagesleiste, Statuskarte und Werkzeugleiste bleiben beim Scrollen stehen.
- **Nur ab 900px Breite und 620px Höhe.** Auf Handys stapelt sich der Kopf so
  hoch, dass er die halbe Liste verdecken würde.
- Beim Weiterspringen mit Tab rückt das Feld in den Blick und landet weder
  hinter dem Kopf noch hinter der Fußzeile.
- Im Mittagstisch gilt dasselbe: Tagesleiste und Filterleiste bleiben stehen.

#### F15 Test Cases

**TC-F15-01: Kopf scrollt nicht mit** – Liste scrollen; der Kopf behält seine
Position. Auf schmalen Schirmen ist er bewusst statisch.

**TC-F15-02: Fokusfeld sichtbar** – Ein weit unten liegendes Feld fokussieren;
es liegt vollständig zwischen Kopfunterkante und Panelunterkante.
