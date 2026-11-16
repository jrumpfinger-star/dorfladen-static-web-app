# Sonderangebote und Getränkeaktionen

## Ein gemeinsamer CMS-Ablauf

**Kiosk → Angebote**, **CMS → Angebote** und die eigenständige Angebotsseite
verwenden dieselbe Verwaltung. Im Kiosk ist auch die vollständige
**Erfassung** möglich, nicht nur das Ansehen. Das Kioskmenü bleibt erhalten;
Erfassung, Vorschau und Gestaltung öffnen sich über dem eingebetteten Angebotsbereich.
Der Reiter **Angebote** steht im Kioskmenü ganz unten, unter „Werbebilder“.
Das eigentliche Getränke-Bestellsystem bleibt unverändert.

Die kompakte Übersicht bietet Wochenfilter und direkte Aktionen:
**Bearbeiten**, **Vorschau** (grau), **Teilen** (grün), **Waage** (orange)
und **Löschen** (rot, mit Bestätigung).
Die ursprünglichen CMS-Aktionszeilen mit aufklappbarer Artikelliste bleiben
erhalten. Die Übersicht wartet nicht auf Vorlagen oder Artikelbilder;
Wochenvorlagen werden erst beim Öffnen einer einzelnen Aktion geladen.

### Angebote erfassen

1. **Neue Aktion erstellen** und **Sonderaktion** oder **Getränkeaktion** wählen.
2. Titel und Gültigkeitszeitraum eintragen.
3. Artikel direkt in den nummerierten Zeilen erfassen. Im Produktfeld nach
   Name, Artikelnummer oder EAN suchen und den Treffer übernehmen. Der
   reguläre Stamm-VK bleibt vom separat einzugebenden Angebotspreis getrennt.
   Stattpreis und Details sind direkt bearbeitbar.
4. Die Bildknöpfe an der Zeile dienen Bildsuche, Dateiauswahl, Zwischenablage
   und Entfernen. Reihenfolge am Griff ändern; der Griff kann per Tastatur
   auch die Zeile nach oben bewegen. **+ Artikel** ergänzt weitere Zeilen.
5. Bei Getränken Anzahl, Liter je Einheit, Gebindeart und Gesamtpfand oder
   ausdrücklich **Pfandfrei** ergänzen. Der Literpreis enthält kein Pfand.
   Komma und Punkt bei Literangaben sind möglich, bis zu drei Nachkommastellen
   werden als ganze Milliliter erhalten.
6. **Speichern** übernimmt die vollständige Aktion. Während ihres
   Gültigkeitszeitraums ist sie für Kunden sichtbar – **ohne zusätzliche
   Veröffentlichung**. Abbrechen verwirft ungespeicherte Eingaben erst nach
   Bestätigung. Fehler lassen den Dialog mit den Eingaben offen.

### Vier oder sechs Getränkekacheln

Bereits im Getränkedialog steht **Kacheln je Sammelflyer-Seite**:

- **4 Kacheln (2×2)**: vier vorbereitete Erfassungszeilen und vier Kacheln
  auf einer Sammelflyer-Seite.
- **6 Kacheln (2×3)**: sechs vorbereitete Zeilen und sechs Kacheln pro Seite.

Die Auswahl begrenzt **nicht** die Anzahl der Artikel. Beim Wechsel bleiben
alle ausgefüllten Zeilen, Bilder und Getränkedaten erhalten. Sechs Artikel
mit der Auswahl „4“ ergeben zwei Seiten mit **4 + 2** Artikeln. Nur überzählige,
vollständig unbenutzte Eingabezeilen dürfen entfallen.

Die Wahl wird mit der Aktion gespeichert. Vorschau und Ausgaben berücksichtigen
sämtliche Folgeseiten. Einzelflyer bleiben unabhängig vom Sammelraster.
Sonderaktionen behalten ihre ursprüngliche Sechser-Erfassung und CMS-Vorlagen.

## Vorschau und Gestaltung

Nach dem Speichern öffnet sich die Vorschau. Sonderaktionen verwenden die
echten gespeicherten CMS-Plakat-/Einzelflyervorlagen und deren Zeichenfunktionen;
Getränke behalten ihre Getränkevorlagen mit Gebinde, Inhalt, Pfand und Literpreis.

- Die Vorschau steht links (mindestens die halbe Breite), die kompakten
  Werkzeuge rechts daneben. Auf schmalen Geräten bleibt das Motiv oben fixiert
  und füllt mehr als die halbe Breite; die Werkzeuge scrollen darunter. So ist
  jede Änderung sofort am Motiv sichtbar. Die Vorschau wird so groß, wie sie
  ohne Scrollen in das Fenster passt. Unter **Artikel bearbeiten** lassen sich
  Name, Angebots- und Stattpreis direkt ändern.
- Ein Element antippen, dann direkt **ziehen** (verschieben), am Quadrat
  ↘ **vergrößern** und am runden Griff ↻ oben **frei drehen** (rastet bei
  15°-Schritten ein). Die Schnellleiste bietet Farbe, Deckkraft und
  Feinverschiebung per Pfeilen; Zahlenfelder, Schrift, Ausrichtung und Ebenen
  stehen unter **Weitere Werkzeuge**. **Rückgängig** macht den letzten Schritt
  rückgängig.
- **Alle Einzelflyer** öffnet die Einzelansichten; den Artikel direkt auswählen.
- **Vorlage und Gestaltung** enthält Vorlagen, Farben, Schrift und
  Ersparnismarker. Der Marker benötigt einen Stattpreis über dem Angebotspreis.
  Neu sind „Bild 50 % · Rot/Grün/Blau“ (Bild nimmt die halbe Breite ein, rechts
  Name und Gebinde, darunter ein durchgehendes Preisband) und „Preisschild ·
  Rot/Grün/Blau“ (Aufteilung der Originalkachel mit großer Bildfläche und
  gedrehtem Preisschild). Beide gelten für Sammelflyer, Kachel, Einzelflyer und Waage.
- Auf der Startseite erscheinen die Kacheltexte halbfett statt fett und wirken
  dadurch filigraner; Flyer, Druck und Waage bleiben unverändert.
- Wie im bisherigen CMS-Editor stehen in jeder Vorschau **Ghost**, **Duplikat**,
  **+ Ghost** / **+ Duplikat** (weitere Kopien, einzeln wählbar und löschbar),
  **+ Bild** (eigenes Bild mit Deckkraft, **Bild entfernen**), der
  **Drehungs-Schieber** mit **0°** sowie **Element zurücksetzen** und **Alles
  zurücksetzen** zur Verfügung. Das gilt auf `angebote.html`, im Kiosk und im
  CMS gleichermaßen. Original-Wochenvorlagen behalten ihre originalen
  Artikelanpassungen; Kopien und Bilder erscheinen in der Elementauswahl.
- **Vorlage, Farben und Schrift** gelten je Ausgabeziel: Wer im Reiter
  „Einzelflyer“ den Stil ändert, ändert ihn für alle Einzelflyer dieser Aktion,
  nicht aber für Kachel, Sammelflyer oder Waage. Enthält das Ziel frei
  verschobene Elemente, fragt das Fenster „Gestaltung ersetzen?“ vorher nach.
- Auf der Startseite wechseln **Diese Woche / Nächste Woche** auch mobil;
  eine bereits angelegte Aktion der nächsten Woche erscheint dort.
- **Flyer ansehen** steht rechts in der Wochenleiste, ohne separate Leerzeile
  über den Angebotskacheln. Mobil ordnen sich Zeitraum und Flyer-Aktion kompakt
  unter der Wochenwahl an. Bei mehreren Aktionen bleibt **Flyer auswählen**
  verfügbar; ohne Flyer wird der Aktionsbereich ausgeblendet.
- **Gestaltung speichern** erhält die Anpassungen für diese Aktion.
  Andere Aktionen und globale Designstandards werden dadurch nicht verändert.
- **Download**, **Drucken / PDF**, **Teilen** und **Auf die Waage** verwenden
  dieselben Artikeldaten. Die Sammelflyer-Ausgabe enthält alle Seiten.

Ein neues Raster oder eine erneut angewandte Vorlage darf freie Positionen
nur nach Bestätigung ersetzen. Pflichtangaben und unlesbare Textfelder
werden vor der Ausgabe geprüft.

### Bilder

Eigene Produktdateien und Zwischenablagebilder werden beim Speichern über
die bestehende Werbebilder-API in **StrichcodeBilder** übernommen. Mit
Strichcode ersetzen sie dort das gemeinsame Produktbild; ohne Strichcode
erhalten sie einen eigenen Angebotsschlüssel. Preise und Produktstammdaten
werden dabei nicht geändert. Automatisch gefundene Bilder werden nur gelesen,
nicht als neue Stammbilder zurückgeschrieben.

Bildfehler werden angezeigt. Eine fehlgeschlagene Übernahme wird nicht als
erfolgreich gespeichertes Artikelbild behandelt.
Beim Öffnen bestehender CMS-Aktionen werden Bilder auch ohne gespeicherte
Werbebildverknüpfung automatisch nachgeladen. Abgelaufene SharePoint-Downloadlinks
werden über die vorhandene Bildsuche erneuert. Das Lesen verändert keine
Angebote oder Stammbilder; ein Ladefehler wird an der betroffenen Zeile angezeigt.

### Designstandards

Der bestehende CMS-Designeditor unter **Design → Plakate & Flyer →
Getränkeflyer** bleibt erhalten. **Designstandards speichern** bestimmt den
Startstandard neuer Getränkeaktionen, nicht das Layout bestehender Aktionen.
Eingebaute Vorlagen werden dadurch nicht überschrieben.
**Vorlage auf Original zurücksetzen** setzt erst die Vorschau zurück;
dauerhaft wird dies erst nach separatem Speichern.

## Bestehende Daten

Bestehende CMS-Aktionen bleiben in Dataverse und ohne Konvertierung nutzbar.
Neue Sonder- und Getränkeaktionen erweitern denselben Angebotsbestand.
Aktionsbezogene Layoutmetadaten verwenden vorhandene Dataverse-Konfiguration,
keine zweite führende Aktionsablage.

Unter **Bereits gespeicherte Feature-Aktionen → Feature-Bestand öffnen**
bleiben die zuvor angelegten Blob-Entwürfe und Veröffentlichungen erreichbar.
Sie behalten ihre bisherige Entwurf-/Freigabesemantik. Es erfolgt keine
automatische Migration oder Freigabe und kein paralleles Schreiben neuer
Aktionen in beide Ablagen.

## Betrieb, Schema und Preview

Der erweiterte Dataverse-Vertrag benötigt folgende Spalten auf `dl_angebote`:

| Spalte | Typ / Zweck |
|---|---|
| `dl_aktionsart` | Text: `weekly` oder `drinks`; fehlend bei Altbestand bedeutet Sonderaktion |
| `dl_stamm_artikelnummer` | Text: Artikelnummer getrennt vom bisherigen Strichcodefeld `dl_artikelnummer` |
| `dl_anzahl` | Ganzzahl: Einheiten |
| `dl_inhalt_ml` | Ganzzahl: Milliliter je Einheit |
| `dl_gebinde` | Text: Gebindeart |
| `dl_pfand_cent` | Ganzzahl: Gesamtpfand in Cent |
| `dl_pfandfrei` | Ja/Nein: ausdrückliche Pfandfreiheit |
| `dl_stamm_vk_cent` | Ganzzahl: Stamm-VK als interner Vergleichswert |

Aktionslayouts liegen als JSON in der bestehenden Seitenkonfiguration
`dl_seiteninhalt`; Produktbilder behalten die vorhandene Werbebildverknüpfung.
Schema-/Berechtigungsprüfung und transaktionale Speicherung verhindern eine
teilweise erfolgreich gemeldete Aktion. Fehlende Spalten müssen vor einem
realen Einsatz durch die zuständige Administration bereitgestellt werden.
Die Implementierung legt keine Produktivspalten automatisch an.

**Wichtig:** Ein PR-Hostname und ein eigener Blob-Namespace isolieren
Dataverse **nicht**. Schreibtests benötigen eine isolierte Dataverse-Testumgebung.
Ein Preview-Rollout mit gemeinsamem produktivem Angebotsbestand ist nur nach
ausdrücklicher Freigabe zulässig: Speichern und Löschen betreffen dann echte
Angebote. Ebenso benötigen die acht optionalen Schemaergänzungen eine
ausdrückliche Freigabe. Bestehende Datensätze werden dabei nicht migriert oder
als Testdaten verändert. Keine Tests an produktiven Angeboten, keine
ungefragten Schemaänderungen und kein main-Deployment.

Für den erhaltenen Feature-Bestand gelten weiterhin privater Blob-Container
`angebote`, `STORAGE_CONN` und umgebungsbezogener `ANGEBOTE_NAMESPACE`.
Die bestehende CMS-Anmeldung schützt Schreibzugriffe.
`ANGEBOTE_WAAGE_SEND_ENABLED` erlaubt echten Versand nur bei ausdrücklicher
Aktivierung; Preview bleibt gesperrt. Zugangsdaten gehören ausschließlich
in App-Settings, niemals ins Repository.

Löschen entfernt keine bereits physisch übertragenen Waagenbilder.
Cloudbereitstellung ist keine Waagenbestätigung; Offline-Brücke und
physische Lesbarkeit müssen gesondert geprüft werden.
