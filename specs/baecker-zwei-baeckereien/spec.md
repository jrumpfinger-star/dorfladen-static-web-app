# Zweite Bäckerei (Martin's Backstube) — Specification

> Spec-driven development. Every requirement carries explicit test cases.
> Ein Spec mit offenen `[NEEDS CLARIFICATION]`-Markern darf NICHT nach `/sdd-plan`.

**Status:** Draft — alle Klärungen aufgelöst, bereit für `/sdd-plan`

**Owner:** Dorfladen Oberornau — Verkäuferinnen

**Last updated:** 2026-09-07

**Baut auf:** [`specs/baecker-bestellung/spec.md`](../baecker-bestellung/spec.md) (F1–F15, implementiert)

> **Nummernkreise.** Die Anforderungen setzen die des Basis-Specs fort (F17 ff.),
> damit im Bäcker-Bereich keine Nummer doppelt vorkommt. Die Testfälle tragen das
> Kürzel **`TC-B2-…`**: `TC-F17-01` ist in `tests/TESTCASES.md` bereits für den
> Mittagstisch-Bestellschluss vergeben.

## Overview

Der Dorfladen wird von **zwei** Bäckereien beliefert, nicht von einer:

| Bäckerei | Liefertage | Kd.-Nr. | Formular | Papierausdruck |
| --- | --- | --- | --- | --- |
| **Martin's Backstube** | Mo, Di, **Sa** | 1015 | PDF | nein |
| **Bäckerei Freundl** | Mi, Do, Fr, **Sa** | 1190 | Word (`.docx`) | **ja** |

Der bestehende Bäcker-Tab kennt nur Freundl. Für Martin's wird heute weiterhin
ein **Papier-Laufzettel** über zwei Wochen geführt (zehn Tagesspalten je Blatt,
handschriftlich ausgefüllt) — mit denselben Schwächen, die den Bäcker-Tab für
Freundl überhaupt erst nötig gemacht haben: keine Erinnerung, keine Historie,
keine Nummern für handschriftlich ergänzte Artikel.

Dieses Feature erweitert den bestehenden Tab um die **Bäckerei als eigenständiges
Merkmal**. Der Liefertag steuert weiterhin alles; nur am **Samstag**, wenn beide
liefern, erscheint eine Reiterzeile zur Auswahl.

Referenz-Mockup: `zwei-baeckereien-mockup.html` (Session-Ordner).

## Datenlage (aus Bestellschein und 11 Rechnungen)

Quelle: `Bäcker/Martins Backstube/` — ein ausgefüllter Bestellschein vom
12.06.2026 sowie elf Rechnungen (Mai–Aug 2026), maschinenlesbar geparst.

| Merkmal | Befund |
| --- | --- |
| Empfänger Rechnungen | `rechnung@martins-backstube.de` → `rechnung@dorfladen-oberornau.de` |
| Kd.-Nr. | 1015 (konstant) |
| Formularspalten (Papier) | Nummer · Bezeichnung · **zehn Tagesspalten** (Mo–Do über zwei Wochen) |
| Rechnungsspalten | Art.-Nr. · Bezeichnung · Liefer- · Retour- · Berechnungsmenge · Einheit · Einzelpreis · Rabatt |
| Rechnungszeitraum | mehrere Liefertage je Rechnung (z. B. „24.08. bis 29.08.") |
| Artikel auf dem Schein | 44 gedruckt + 2 handschriftlich ergänzt |
| Artikel in den Rechnungen | 38 automatisch erkannt + 1 mehrzeilig (104) = **39** |
| Nie bestellt (Schein, aber keine Rechnung) | 9 — Gewürzstangerl (23), Brezen (60), BIO-Brezensemmel (61), Brezenzöpferl (62), Bio-Vollkornbrezen (63), Laugenstangerl m. Käse (64), BIO-Schrot & Saat (182), BIO-Olivenbrot (189), Nußhörnchen (401) |
| Nur in Rechnungen, nicht auf dem Schein | 4 — **104** BIO-Ciabatta, **186** BIO-Vollkorn-Nuß-Brot, **192** Bio-Brot des Monats, **242** Bio Bergbauern |
| Mengen Samstag (12.06.) | Semmel 90, Doppelte 16, alles andere 1–4 |

Zwei der vier nur in Rechnungen belegten Artikel (**104**, **192**) standen auf
dem Schein **handschriftlich** am Blattende („Ciabatta", „Brot d. Monats") — ohne
Nummer. Genau diese Lücke schließt der Rechnungs-Import (F22).

> **Stolperstein beim Parsen:** Position 104 verteilt sich im PDF auf zwei Zeilen
> („BIO-Ciabatta" / „aus kontr.biolog.Anbau"). Ein zeilenweiser Parser übersieht
> sie stillschweigend — der Import muss mehrzeilige Positionen zusammenführen
> (TC-B2-F22-02).

### Kritischer Befund: Artikelnummern kollidieren

Beide Bäckereien vergeben eigene Nummern. Dieselbe Nummer bezeichnet
unterschiedliche Artikel:

| Nummer | Freundl | Martin's |
| --- | --- | --- |
| 1 | Kaisersemmel | Semmel |
| 14 | *(nicht belegt)* | Mohnsemmel |
| 33 | Mohnsemmel | *(nicht belegt)* |
| 64 | Dinkli | Laugenstangerl m. Käse |
| 151 | Mischbrot 500 g | BIO-Mehrkornbrot 500 g |

Ein gemeinsamer Katalog ist damit ausgeschlossen. Da Positionen im Bestand über
`str(nummer)` zugeordnet werden ([`store.artikel_key`](../../api/baecker-order/store.py)),
**muss** die Bäckerei Teil des Schlüssels werden — sonst mischen sich die
Bestellungen beider Häuser.

### Weiterer Befund: Sortierung weicht vom Papier ab

Die Nummern auf dem Papierschein sind **nicht** durchgehend aufsteigend
(47 vor 41, 71 vor 64, 131/134/136/135). Der Kiosk sortiert numerisch (F3 der
Basis-Spec). Die Reihenfolge weicht damit an vier Stellen von der Papiergewohnheit
ab. **Entscheidung:** numerische Sortierung bleibt — sie ist vorhersehbar und
gruppiert die Warenarten korrekt.

## Goals

- **Beide Bäckereien** im selben Kiosk-Tab bestellen, ohne umständliches Wechseln.
- Die Bäckerei ergibt sich **aus dem Liefertag** — kein zusätzlicher Bedienschritt
  an Tagen mit nur einem Lieferanten.
- **Samstag** wird sicher abgewickelt: beide Bestellungen sichtbar, keine wird
  vergessen.
- **Papierausdruck** für Freundl als nachvollziehbarer Pflichtschritt.
- Artikelstamm von Martin's **aus den Rechnungen** pflegen — insbesondere für
  Artikel, die bisher nur handschriftlich existierten.
- Der Bestand geht **vollständig und verlustfrei** an Freundl über.

## Non-Goals

- Keine Mengen-Übernahme aus Rechnungen (eine Rechnung fasst mehrere Liefertage
  zusammen — Tagesmengen sind daraus nicht ableitbar).
- **Keine Preise** im Artikelstamm (ausdrücklich abgewählt).
- Kein Nachbilden des zehnspaltigen Laufzettels — Martin's erhält nur den
  gewählten Tag.
- Keine dritte Bäckerei; der Aufbau lässt sie aber zu.
- Keine Änderung an der Freundl-Logik außer dem Papierausdruck.

## Decisions (aufgelöste Klärungen)

| Frage | Entscheidung | Quelle |
| --- | --- | --- |
| Bestellschluss Martin's | wie Freundl: am **Vortag bis 12:00** | Nutzer, 07.09.2026 |
| Papier für Martin's | **nein** — nur E-Mail. Laufzettel entfällt | Nutzer, 07.09.2026 |
| Papier für Freundl | **ja** — Ausdruck nach dem Senden, nachdruckbar | Nutzer, 07.09.2026 |
| Preise führen | **nein** | Nutzer, 07.09.2026 |
| Samstags-Auswahl | **Reiter** je Bäckerei (Variante B) | Nutzer, 07.09.2026 |
| Bestandsübernahme | **alles bestehende → Freundl** | Nutzer, 07.09.2026 |
| Formularformat Martin's | **PDF**, nur der gewählte Tag | Nutzer, 07.09.2026 |
| Nie bestellte Artikel | als **ausgeblendet** anlegen, über „Alle Artikel" erreichbar | Vorschlag, siehe F21 |

## Requirements

### F17: Bäckerei als eigenständiges Merkmal

#### F17 Description

Katalog, Einstellungen und Bestellungen gehören künftig **je einer Bäckerei**.
Die Bäckerei-Kennung (`freundl`, `martins`) wird Teil des Speicherschlüssels und
jedes API-Aufrufs.

#### F17 Behaviour / Acceptance

- Jede Bäckerei hat einen **eigenen Artikelkatalog**; Nummern dürfen sich
  zwischen Bäckereien überschneiden, ohne sich zu stören.
- Jede Bäckerei hat **eigene Einstellungen**: Empfänger, Anrede, Bestelltage,
  Bestellschluss, Kd.-Nr., Tour-Nr., Warengruppen, Formularformat,
  Papierausdruck ja/nein.
- Eine Bestellung ist eindeutig über **(Bäckerei, Liefertag)** bestimmt.
- Die Vorbelegung (F2 der Basis-Spec) greift **nur innerhalb derselben Bäckerei**.
- Fehlt in einem Aufruf die Bäckerei, antwortet der Server mit einer
  verständlichen Fehlermeldung statt stillschweigend Freundl anzunehmen.

#### F17 Test Cases

**TC-B2-F17-01: Gleiche Nummer, verschiedene Artikel**

- **Setup:** Freundl Nr. 1 = „Kaisersemmel", Martin's Nr. 1 = „Semmel".
- **Action:** Katalog beider Bäckereien laden.
- **Expected:** Beide Artikel existieren nebeneinander; keiner überschreibt den
  anderen.

**TC-B2-F17-02: Bestellungen bleiben getrennt**

- **Setup:** Für Samstag ist bei Freundl Nr. 1 = 80 erfasst.
- **Action:** Für denselben Samstag Martin's öffnen.
- **Expected:** Martin's Nr. 1 zeigt **nicht** 80, sondern seine eigene
  Vorbelegung.

**TC-B2-F17-03: Vorbelegung überschreitet keine Bäckereigrenze**

- **Setup:** Freundl hat Historie für Samstage, Martin's nicht.
- **Action:** Martin's für Samstag öffnen.
- **Expected:** Hinweis „keine Vorlage vorhanden", alle Mengen 0 — **nicht** die
  Freundl-Werte.

**TC-B2-F17-04: Fehlende Bäckerei wird abgelehnt**

- **Action:** `GET /api/baecker-order?datum=2026-09-12` ohne `baeckerei`.
- **Expected:** HTTP 400 mit Klartext-Meldung; keine Daten.

### F18: Liefertag bestimmt die Bäckerei

#### F18 Description

An Tagen mit **einem** Lieferanten ändert sich für die Verkäuferin nichts: Tag
wählen, erfassen, senden. Die Bäckerei wird nirgends ausgewählt.

#### F18 Behaviour / Acceptance

- Given es ist Montag und Bestelltage sind Martin's Mo/Di/Sa sowie Freundl
  Mi–Sa, When der Tab geöffnet wird, Then ist **Dienstag / Martin's**
  vorausgewählt (nächster offener Tag).
- Die Tagesleiste zeigt je Tag **farbige Punkte** für die liefernden Bäckereien;
  ein gesendeter Auftrag ist am Punkt erkennbar.
- Sonntag bleibt gesperrt („keine Lieferung").
- Die Statuskarte nennt **immer** die Bäckerei im Klartext, auch an
  Ein-Bäckerei-Tagen.
- Wechselt die Verkäuferin auf einen Tag, an dem die aktuell gewählte Bäckerei
  nicht liefert, wird automatisch auf die dort liefernde umgeschaltet.

#### F18 Test Cases

**TC-B2-F18-01: Ein-Bäckerei-Tag zeigt keine Auswahl**

- **Setup:** Dienstag gewählt (nur Martin's).
- **Expected:** Reiterzeile ist **nicht** vorhanden; Statuskarte nennt
  „Martin's Backstube".

**TC-B2-F18-02: Tageswechsel schaltet die Bäckerei mit**

- **Setup:** Dienstag/Martin's ist aktiv.
- **Action:** Auf Donnerstag wechseln.
- **Expected:** Bäckerei ist **Freundl**; Katalog und Vorbelegung stammen von
  Freundl.

**TC-B2-F18-03: Tagesleiste zeigt die Lieferanten**

- **Expected:** Mo/Di tragen einen Punkt in Martin's-Farbe, Mi–Fr einen in
  Freundl-Farbe, Sa **zwei** Punkte.

### F19: Samstag — beide Bäckereien

#### F19 Description

Am Samstag liefern beide. Über der Erfassung erscheint eine **Reiterzeile** mit
beiden Bäckereien und ihrem jeweiligen Stand. Es wird eine nach der anderen
abgearbeitet.

#### F19 Behaviour / Acceptance

- Die Reiterzeile erscheint **ausschließlich** an Tagen mit zwei Lieferanten.
- Jeder Reiter trägt ein Abzeichen: `offen` · `✓ gesendet` · `🖨 Ausdruck fehlt`.
- Die Reiter sind in der Farbe ihrer Bäckerei unterlegt, damit sie sich von der
  darüberliegenden Ansichtszeile (Bestellung · Verlauf · Artikel) unterscheiden.
- Das Tagesplättchen zeigt den Fortschritt als **„1 von 2"**.
- Der Tag gilt erst als erledigt, wenn **beide** Bestellungen gesendet (und, wo
  gefordert, gedruckt) sind.
- Die **Erinnerung ab Bestellschluss** (F9 der Basis-Spec) blinkt weiter, solange
  auch nur eine der beiden offen ist.
- Der Zähler am Tab zählt jede offene Bestellung **und** jeden offenen Ausdruck.

#### F19 Test Cases

**TC-B2-F19-01: Reiter nur am Samstag**

- **Action:** Zwischen Freitag und Samstag wechseln.
- **Expected:** Freitag ohne Reiterzeile, Samstag mit zwei Reitern.

**TC-B2-F19-02: Stand je Reiter**

- **Setup:** Samstag, Freundl gesendet, Martin's offen.
- **Expected:** Freundl-Reiter „✓ gesendet", Martin's-Reiter „offen";
  Tagesplättchen „1 von 2".

**TC-B2-F19-03: Reiterwechsel tauscht den Katalog**

- **Action:** Auf Samstag von Martin's auf Freundl wechseln.
- **Expected:** Artikelliste zeigt den Freundl-Katalog (Kaisersemmel Nr. 1),
  Statuskarte und Fußzeile nennen Freundl.

**TC-B2-F19-04: Erinnerung erlischt erst nach beiden**

- **Setup:** Samstag nach Bestellschluss, nur Freundl gesendet.
- **Expected:** Tab blinkt weiter; nach dem Senden an Martin's endet das Blinken.

**TC-B2-F19-05: Tab-Zähler**

- **Setup:** Eine Bestellung offen, ein Ausdruck offen.
- **Expected:** Zähler zeigt **2**.

### F20: Formular je Bäckerei

#### F20 Description

Freundl erhält weiterhin das **Word-Formular** (unverändert). Martin's erhält ein
**PDF** mit ausschließlich dem gewählten Liefertag.

#### F20 Behaviour / Acceptance

- Das Martin's-PDF trägt Kopf („Martin's Backstube GmbH & Co.KG"), Kd.-Nr. 1015,
  Liefertag und Wochentag.
- Es enthält die Spalten **Nummer · Bezeichnung · Menge · Retouren** — analog zum
  Freundl-Formular, **nicht** die zehn Tagesspalten des Papierscheins.
- Nur Positionen mit Menge > 0 oder erfasster Retoure erscheinen; Zusatzartikel
  des Tages werden am Ende ergänzt.
- Positionen sind **nach Artikelnummer aufsteigend** sortiert.
- Das erzeugte Dokument wird wie bisher zur Bestellung gespeichert und ist im
  Verlauf abrufbar.
- Testbetrieb (Empfänger ≠ hinterlegte Bäckerei-Adresse) wird im Dokument **und**
  im Betreff gekennzeichnet — wie bei Freundl.

#### F20 Test Cases

**TC-B2-F20-01: PDF enthält nur den gewählten Tag**

- **Setup:** Martin's, Liefertag Samstag 12.09.
- **Action:** Senden.
- **Expected:** PDF nennt genau ein Datum; keine weiteren Tagesspalten.

**TC-B2-F20-02: Kopfdaten korrekt**

- **Expected:** Kd.-Nr. **1015**, Bäckereiname, Wochentag und Datum stimmen.

**TC-B2-F20-03: Sortierung im Dokument**

- **Setup:** Positionen 130, 1, 41 erfasst.
- **Expected:** Reihenfolge im PDF 1, 41, 130.

**TC-B2-F20-04: Freundl bleibt Word**

- **Action:** Freundl senden.
- **Expected:** Anhang ist `.docx` und formal unverändert gegenüber heute.

**TC-B2-F20-05: Leere Bestellung wird abgelehnt**

- **Setup:** Alle Mengen 0.
- **Action:** Senden.
- **Expected:** Freundliche Meldung, kein Versand.

### F21: Artikelstamm von Martin's

#### F21 Description

Martin's startet mit einem Katalog aus Bestellschein und Rechnungen.

#### F21 Behaviour / Acceptance

- Der Startkatalog enthält die **44 gedruckten** Artikel des Bestellscheins sowie
  die vier nur in Rechnungen belegten (104, 186, 192, 242) — zusammen **48**.
- Artikel, die in **keiner** der elf Rechnungen vorkommen, werden als
  **ausgeblendet** angelegt: sie erscheinen nicht in der täglichen Erfassung,
  sind aber über „Alle Artikel" erreichbar und einblendbar.
- Die Warengruppen folgen den Nummernbereichen (Semmeln & Kleingebäck bis 99,
  Brote bis 299, Süßes & Sonstiges darüber) und sind je Bäckerei einstellbar.
- Anlegen, Bearbeiten, Aus-/Einblenden funktioniert wie bei Freundl (F5/F14 der
  Basis-Spec) — jedoch **je Bäckerei getrennt**.

#### F21 Test Cases

**TC-B2-F21-01: Startkatalog vollständig**

- **Expected:** 48 Artikel; darunter 104, 186, 192, 242.

**TC-B2-F21-02: Nie bestellte sind ausgeblendet**

- **Expected:** Die neun nie bestellten (23, 60, 61, 62, 63, 64, 182, 189, 401)
  erscheinen nicht in der Standardansicht, wohl aber unter „Alle Artikel".

**TC-B2-F21-03: Warengruppen greifen**

- **Expected:** Nr. 1 unter „Semmeln & Kleingebäck", Nr. 136 unter „Brote",
  Nr. 401 unter „Süßes & Sonstiges".

**TC-B2-F21-04: Dublettenschutz je Bäckerei**

- **Action:** Bei Martin's Nr. 1 ein zweites Mal anlegen.
- **Expected:** Abgelehnt. Bei Freundl bleibt Nr. 1 unberührt.

### F22: Artikelstamm aus Rechnung aktualisieren

#### F22 Description

Rechnungs-PDFs von Martin's sind maschinenlesbar. Daraus lassen sich **Nummer und
Bezeichnung** übernehmen — vor allem für Artikel, die auf dem Zettel nur
handschriftlich standen und daher nie eine Nummer hatten.

#### F22 Inputs

| Input | Beschreibung |
| --- | --- |
| PDF | Rechnung von Martin's Backstube |
| `baeckerei` | Zielkatalog |

#### F22 Behaviour / Acceptance

- Das PDF wird geparst; erkannt werden Art.-Nr., Bezeichnung, Liefer- und
  Retourmenge.
- Vor dem Übernehmen erscheint eine **Vorschau** mit drei Kategorien: `neu`,
  `Bezeichnung geändert`, `unverändert`.
- Übernommen werden **ausschließlich Nummer und Bezeichnung** — keine Mengen,
  keine Preise.
- Neue Artikel werden als **aktiv** angelegt (sie wurden ja nachweislich
  geliefert).
- Mehrzeilige Positionen (z. B. „BIO-Ciabatta" mit Zusatzzeile
  „aus kontr.biolog.Anbau") werden korrekt als **ein** Artikel erkannt.
- Lässt sich das PDF nicht lesen, erscheint eine verständliche Meldung; der
  Katalog bleibt unverändert.
- Der Import ist **wiederholbar**: dieselbe Rechnung zweimal eingelesen ändert
  beim zweiten Mal nichts.
- Zusätzlich wird eine **Retouren-Übersicht** angezeigt (geliefert, retour,
  Quote je Artikel) — als Hinweis auf zu hohe Bestellmengen, ohne Automatik.

#### F22 Test Cases

**TC-B2-F22-01: Handschriftliche Artikel bekommen ihre Nummer**

- **Setup:** Katalog ohne 104/186/192/242.
- **Action:** Rechnung 26-10881 einlesen.
- **Expected:** Vorschau meldet die neuen Artikel mit genau diesen Nummern.

**TC-B2-F22-02: Mehrzeilige Position**

- **Expected:** „BIO-Ciabatta" erscheint **einmal** unter Nr. 104, nicht als zwei
  Einträge und nicht mit angehängter Zusatzzeile.

**TC-B2-F22-03: Keine Mengen, keine Preise**

- **Action:** Übernehmen.
- **Expected:** Kein Artikel trägt Menge oder Preis; eine offene Bestellung
  bleibt unverändert.

**TC-B2-F22-04: Wiederholter Import ist folgenlos**

- **Action:** Dieselbe Rechnung erneut einlesen.
- **Expected:** Alle Positionen „unverändert"; keine Dubletten.

**TC-B2-F22-05: Unlesbares PDF**

- **Action:** Ein Bild-PDF ohne Text einlesen.
- **Expected:** Meldung „Aus dieser Datei ließen sich keine Artikel lesen…";
  Katalog unverändert.

**TC-B2-F22-06: Retouren-Quote**

- **Expected:** Artikel 138 (2 geliefert, 1 retour) wird mit **50 %** und einem
  Hinweis „Menge prüfen" ausgewiesen.

### F23: Papierausdruck nach dem Senden

#### F23 Description

Freundl benötigt zusätzlich zur Mail einen **Papierausdruck**. Der Ausdruck ist
ein sichtbarer Arbeitsschritt, keine Nebenbemerkung — und je Bäckerei
einstellbar.

#### F23 Behaviour / Acceptance

- Ist für eine Bäckerei `papierausdruck` gesetzt, erscheint nach erfolgreichem
  Versand eine Bestätigung mit den Schritten *erstellt · verschickt · **drucken***
  und einer Vorschau des Formulars.
- Der Druckknopf löst den Druck der Bestellung aus; „Später drucken" schließt die
  Bestätigung, **ohne** den Schritt als erledigt zu werten.
- Solange nicht gedruckt wurde, zeigt das Tagesplättchen „🖨 Ausdruck fehlt", die
  Statuskarte bietet den Druckknopf **statt** „Korrektur senden", und der
  Tab-Zähler zählt den offenen Ausdruck mit.
- Im **Verlauf** lässt sich jede gesendete Bestellung erneut drucken, ohne sie
  erneut zu senden.
- Für Bäckereien ohne die Einstellung (Martin's) entfällt der Schritt vollständig;
  der Tag gilt sofort nach dem Senden als erledigt.
- Der Ausdruck enthält dieselben Positionen wie das versendete Dokument,
  inklusive Kd.-Nr., Tour-Nr. und Liefertag.

#### F23 Test Cases

**TC-B2-F23-01: Druckschritt erscheint bei Freundl**

- **Action:** Freundl senden.
- **Expected:** Bestätigung mit Druckknopf und Formularvorschau.

**TC-B2-F23-02: Martin's ohne Druckschritt**

- **Action:** Martin's senden.
- **Expected:** Keine Druckaufforderung; Tag sofort „gesendet".

**TC-B2-F23-03: Offener Ausdruck ist sichtbar**

- **Setup:** Freundl gesendet, nicht gedruckt.
- **Expected:** Tagesplättchen „🖨 Ausdruck fehlt"; Statuskarte zeigt
  „Jetzt drucken" statt „Korrektur senden".

**TC-B2-F23-04: Nachdrucken im Verlauf**

- **Action:** Im Verlauf „Erneut drucken".
- **Expected:** Druck wird ausgelöst; **kein** erneuter Mailversand.

**TC-B2-F23-05: „Später drucken" ändert den Stand nicht**

- **Action:** Bestätigung mit „Später drucken" schließen.
- **Expected:** Ausdruck bleibt offen, Zähler unverändert.

**TC-B2-F23-06: Nach dem Druck ist der Tag erledigt**

- **Action:** Drucken.
- **Expected:** Plättchen „gesendet · gedruckt"; Zähler um 1 kleiner;
  Statuskarte bietet wieder „Korrektur senden".

### F24: Übernahme des Bestands

#### F24 Description

Alle heute vorhandenen Daten gehören Freundl und werden **einmalig** dorthin
umgezogen. Dies ist der risikoreichste Schritt des Umbaus: Verlieren gespeicherte
Bestellungen ihren Bezug zum Artikel, beginnt die Vorbelegung wieder bei 0 — genau
der Fehler, der beim Ändern einer Artikelnummer bereits aufgetreten ist
(siehe `store.nummer_umziehen`).

#### F24 Behaviour / Acceptance

- Katalog, Einstellungen und **alle** Bestellungen werden Freundl zugeordnet.
- Nach dem Umzug sind Verlauf, Vorbelegung und Vergleichswerte **unverändert**
  gegenüber vorher.
- Der Umzug ist **wiederholbar**: ein zweiter Lauf ändert nichts.
- Der Umzug ist **umkehrbar**: die Altschlüssel bleiben bis zur Freigabe erhalten.
- Vor der Umstellung läuft ein **Testlauf**, der die Zahl der Bestellungen und
  Positionen vorher/nachher vergleicht und Abweichungen meldet.
- Ist der Umzug noch nicht gelaufen, verhält sich der Tab wie bisher
  (Freundl allein) — kein Zwischenzustand mit halb umgezogenen Daten.

#### F24 Test Cases

**TC-B2-F24-01: Nichts geht verloren**

- **Setup:** 19 gesendete Bestellungen, 60 Artikel.
- **Action:** Umzug ausführen.
- **Expected:** Freundl hat 19 Bestellungen und 60 Artikel; Positionszahl je
  Bestellung identisch.

**TC-B2-F24-02: Vorbelegung bleibt erhalten**

- **Setup:** Vor dem Umzug zeigt Donnerstag die Vorbelegung vom 03.09.
- **Action:** Umzug, dann Donnerstag öffnen.
- **Expected:** Dieselbe Vorbelegung, dieselbe Herkunftsangabe.

**TC-B2-F24-03: Zweiter Lauf ist folgenlos**

- **Action:** Umzug erneut ausführen.
- **Expected:** Keine Dubletten, keine Änderung.

**TC-B2-F24-04: Testlauf meldet Abweichungen**

- **Setup:** Künstlich beschädigter Datensatz.
- **Action:** Testlauf.
- **Expected:** Klare Meldung, welcher Schlüssel betroffen ist; kein Umzug.

### F25: Einstellungen je Bäckerei im CMS

#### F25 Description

Die CMS-Karte „Bäckerei-Bestellung" wird um die Bäckerei-Auswahl erweitert.

#### F25 Behaviour / Acceptance

- Eine Auswahl oben in der Karte schaltet zwischen den Bäckereien um; alle Felder
  darunter gehören zur gewählten.
- Je Bäckerei einstellbar: Name, Empfänger, Anrede, Adresse der Bäckerei,
  Bestelltage, Bestellschluss, Kd.-Nr., Tour-Nr. (Standard und Samstag),
  Formularformat, **Papierausdruck ja/nein**.
- Der Testbetrieb-Hinweis (Empfänger ≠ Bäckerei-Adresse) gilt **je Bäckerei**.
- Überschneiden sich Bestelltage, ist das **erlaubt** (Samstag) und wird als
  Hinweis, nicht als Fehler, dargestellt.
- Ein Tag ohne jede Bäckerei wird als „keine Lieferung" behandelt.

#### F25 Test Cases

**TC-B2-F25-01: Umschalten zeigt eigene Werte**

- **Action:** Von Freundl auf Martin's umschalten.
- **Expected:** Kd.-Nr. wechselt von 1190 auf 1015, Bestelltage von Mi–Sa auf
  Mo/Di/Sa.

**TC-B2-F25-02: Speichern trifft nur die gewählte Bäckerei**

- **Action:** Bei Martin's den Bestellschluss ändern und speichern.
- **Expected:** Freundls Bestellschluss unverändert.

**TC-B2-F25-03: Überschneidung ist erlaubt**

- **Setup:** Beide haben Samstag.
- **Expected:** Hinweis „An diesem Tag liefern beide", kein Fehler; Speichern
  möglich.

**TC-B2-F25-04: Papierausdruck ist schaltbar**

- **Action:** Bei Martin's den Ausdruck einschalten und senden.
- **Expected:** Druckschritt erscheint auch bei Martin's.

### F26: Responsive und bedienbar

#### F26 Description

Die Erweiterung hält die Vorgaben der Basis-Spec (F12) ein.

#### F26 Behaviour / Acceptance

- Reiterzeile, Statuskarte und Druckbestätigung funktionieren auf
  375×667, 768×1024 und 1280×800.
- Kein horizontales Scrollen; alle Bedienelemente ≥ 44 px.
- Keine nativen Dialoge (`alert`, `confirm`) — alle Meldungen im Klartext.
- Der feste Kopf (F15 der Basis-Spec) umfasst auch die neue Reiterzeile; das
  fokussierte Eingabefeld bleibt sichtbar.

#### F26 Test Cases

**TC-B2-F26-01: Kein horizontales Scrollen** — auf allen drei Auflösungen, Samstag
mit Reiterzeile.

**TC-B2-F26-02: Tap-Targets** — Reiter und Druckknopf ≥ 44 px hoch.

**TC-B2-F26-03: Reiterzeile klebt mit** — beim Scrollen der Artikelliste bleiben
Tagesleiste **und** Reiterzeile stehen.

**TC-B2-F26-04: Keine nativen Dialoge** — `window.alert`/`confirm` werden während
Senden, Drucken und Rechnungs-Import nicht aufgerufen.

## Data / API

### Geänderte Endpunkte

Alle bestehenden Bäcker-Endpunkte erhalten den Pflichtparameter `baeckerei`
(`freundl` | `martins`):

| Endpunkt | Methode | Änderung |
| --- | --- | --- |
| `/api/baecker-artikel?baeckerei=…` | GET | Katalog der Bäckerei |
| `/api/baecker-artikel` | POST/PATCH | `baeckerei` im Rumpf, Dublettenprüfung je Bäckerei |
| `/api/baecker-order?baeckerei=…&datum=…` | GET | Bestellung je Bäckerei und Tag |
| `/api/baecker-order` | POST | `baeckerei` im Rumpf |
| `/api/baecker-order?mode=uebersicht` | GET | Tagesleiste mit **beiden** Bäckereien je Tag |
| `/api/baecker-order?mode=config` | GET | Einstellungen **aller** Bäckereien |

### Neue Endpunkte

| Endpunkt | Methode | Zweck |
| --- | --- | --- |
| `/api/baecker-order` `{aktion:'gedruckt'}` | POST | Ausdruck als erledigt vermerken |
| `/api/baecker-artikel` `{aktion:'rechnung'}` | POST | Rechnungs-PDF auswerten (Vorschau **oder** Übernahme) |

### Speicherschlüssel (`dl_seiteninhalts`)

| Neu | Alt | Bemerkung |
| --- | --- | --- |
| `baecker_artikel_freundl` | `baecker_artikel` | umgezogen |
| `baecker_artikel_martins` | — | neu aus Bestellschein + Rechnungen |
| `baecker_config` | `baecker_config` | erweitert um `baeckereien: {…}` |
| `baecker_order_freundl_JJJJ-MM-TT` | `baecker_order_JJJJ-MM-TT` | umgezogen |
| `baecker_order_martins_JJJJ-MM-TT` | — | neu |

Bestellungen erhalten zusätzlich `gedruckt_am` (nur wo `papierausdruck` gilt).

### Wiederverwendung

- PDF-Erzeugung analog zu `docx_fill.py`; Bibliothek wird im Plan festgelegt.
- Rechnungs-Parser als eigenes Modul, testbar ohne Azure
  (analog `tools/baecker_logik_test.py`).
- Mailversand unverändert über `api/shop-notify` (`mit_shop_link=False`).

## Constitution Compliance

| Prinzip | Erfüllung |
| --- | --- |
| 1 Spec first | Diese Spec vor Plan/Tasks/Code |
| 2 Test cases | F17–F26 mit TC-Fn-xx |
| 3 Keine Secrets | Kein neuer Zugang; Rechnungen liegen bereits im Repo |
| 4 Keine Artefakte | Startkatalog und PDF-Vorlage sind Quelldateien |
| 5 Deploy-aware | Auslieferung über den bestehenden SWA-Workflow |
| 6 Freundliche Meldungen | F22, F23, F26 fordern Klartext |
| 7 Responsive | F26 auf allen drei Viewports |
| 8 Automatisierte Tests | `tests/kiosk-baecker-zwei.spec.js` mit gemockter API; Parser- und Umzugstests ohne Azure |

## Traceability

| Requirement | Test Cases | Plan | Tasks |
| --- | --- | --- | --- |
| F17 Bäckerei als Merkmal | TC-B2-F17-01…04 | Technical Approach, store.py | — |
| F18 Tag bestimmt Bäckerei | TC-B2-F18-01…03 | Tagesleiste | — |
| F19 Samstag | TC-B2-F19-01…05 | Kiosk-Reiterzeile | — |
| F20 Formular je Bäckerei | TC-B2-F20-01…05 | pdf_fill.py | — |
| F21 Artikelstamm Martin's | TC-B2-F21-01…04 | katalog-martins.json | — |
| F22 Rechnungs-Import | TC-B2-F22-01…06 | rechnung_parser.py | — |
| F23 Papierausdruck | TC-B2-F23-01…06 | Druckansicht im Browser | — |
| F24 Bestandsübernahme | TC-B2-F24-01…04 | baecker-migration | — |
| F25 CMS je Bäckerei | TC-B2-F25-01…04 | CMS-Karte | — |
| F26 Responsive | TC-B2-F26-01…04 | Change Map kiosk.html | — |
