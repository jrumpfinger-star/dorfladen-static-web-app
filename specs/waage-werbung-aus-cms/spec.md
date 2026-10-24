# Waage-Werbung aus dem CMS: HD-Druck und „Auf die Waage“

Baut auf `specs/kiosk-werbebilder-upload` (Cloud-Relais) auf.

## Ausgangslage

Aus dem Laden: *„Ist es möglich den Wochenplan auch hochauflösend mit HD-Auflösung zu drucken und diesen
dann über einen Button auf die Waage zu transferieren? Hier sollte der Hochladen-Dialog erscheinen, so
dass auch alte hochgeladene Bilder gleich gelöscht werden können. Selbiges sollte für den Aktionsflyer
möglich sein. Hier sollten die Artikel aber nicht im Portrait, sondern in Landscape dargestellt werden,
weil die Waage Bilder am besten Landscape anzeigt. Es sollte auch möglich sein, dass jeder Einzelartikel
als eigenständige Datei übertragen werden kann.“*

Befund: Wochenplan-Bild, Aktions-Plakat und Einzelflyer sind heute nur 794 px breit (Bildschirmmaß), das
Handbuch nennt sie „hochauflösend“. Plakat und Einzelflyer sind fest Hochformat (794 × 1123). Die Waage
nimmt nur JPEG/GIF. Anzeigeprofile laut Programmieranleitung und Foto siehe F12.

## Entwurfsentscheidungen

- **HD = Faktor 3** (ca. 300 dpi bei A4) für Vorschau, Download, Drucken und Teilen. Die Live-Vorschau in den
  Einstellungen bleibt bei Faktor 1. Bei Speichermangel (Canvas nicht anlegbar) Rückfall auf Faktor 2.
- **Waagenbilder 2×** (1600 px breit), weil die Waage ohnehin auf 800 px verkleinert; Format **JPEG** (PNG geht nicht).
- **Ein gemeinsamer Dialog** (`KWerbebilder.uebertragen`) für Wochenplan und Aktion; er nutzt die Cloud-API des
  Relais. Alles Neue wird zuerst hochgeladen, die gewählten alten erst danach und nur ohne Fehler gelöscht.
- **Aktion für die Waage im Querformat** mit eigenem Zeichner (Farben aus dem Aktions-Design), nicht durch Umbau
  des Hochformats. Das Hochformat zum Drucken bleibt, nur höher aufgelöst.
- **Dateinamen steuern die Reihenfolge** auf der Waage: `10_Wochenplan_KW44.jpg`, danach `20_Angebot_…`.
  Alte Bilder derselben Art (Präfix `10_Wochenplan_` bzw. `20_Angebot_`) sind im Dialog vorausgewählt.
- **Dauerwerbung** nutzt die gewählte Profilhöhe (F12); Vorgabe der Werbeart bleibt Vollbild.

## Anforderungen

- **F1** Wochenplan-Bild, Aktions-Plakat und Einzelflyer lassen sich in **HD (3×)** ansehen, herunterladen,
  drucken und teilen. Bildmaße: Wochenplan 794·3 = 2382 px Breite, Plakat/Einzelflyer 2382 × 3369.
  Das Aussehen ist bis auf die Schärfe unverändert (Schatten, Linien, Logo gleich groß, Logo in HD-Datei).
- **F2** Der **Einzelflyer-Editor** arbeitet unverändert in 1× (Zonen, Pfeiltasten, Speichern); nur Drucken und
  Download rendern den Flyer neu in 3× mit denselben Überschreibungen.
- **F3** Knopf **„Auf die Waage“** an drei Stellen für den Wochenplan: Vorschau (neben Download/Drucken) und
  Wochenplan-Tab; für Aktionen: Aktions-Vorschau und Aktionsmenü.
- **F4** Der Knopf öffnet den **Waagen-Dialog**: Art wählbar (Vollbild/Dauerwerbung), „Neu“ mit Miniatur und
  Haken je Datei, „Bereits auf der Waage“ mit Miniatur und Haken „löschen“, Brückenstatus, Zähler `n / 99`.
- **F5** Vorauswahl zum Löschen: Bilder mit dem Präfix der Art des Auftrags (`10_Wochenplan_`, `20_Angebot_`);
  andere Bilder sind anwählbar, „Alle“/„Keine“ schalten um. Gleichnamige neue Bilder ersetzen die alten.
- **F6** Ablauf „Übertragen“: erst alle angehakten neuen Bilder hochladen; nur wenn **alle** gelungen sind, die
  angehakten alten löschen. Ergebnis je Datei; bei Fehlern wird nichts gelöscht. Mehr als 99 Bilder nach dem
  Löschen sind nicht möglich (Knopf gesperrt, Hinweis).
- **F7** Wochenplan-Waagenbild: eigene Wochenübersicht mit allen Tagen, Gerichten und Preisen auf genau
  einem JPEG im gewählten Anzeigeprofil. Keine verkleinerte Druckvorlage. Gerichtstext mindestens
  18 native Pixel beim großen, 16 beim kleinen Profil. Nicht darstellbarer Inhalt wird ausdrücklich
  gemeldet und nicht übertragen; weder Tage noch Gerichte still kürzen.
- **F8** Aktion im Querformat (Maße nach F12): **Übersicht** mit bis zu 6 Artikeln (3 × 2) je Bild, bei mehr
  Artikeln weitere Übersichten; bei weniger Artikeln Zeilen/Spalten zur Flächennutzung reduzieren.
  Dazu **ein Bild je Artikel** (Artikelbild groß, Name, Details, Preis, Statt-Preis
  durchgestrichen, −%-Badge, Gültigkeit, Logo). Alle Bilder sind im Dialog angehakt. Die Kachel-Overrides des
  Hochformat-Editors gelten hier nicht.
- **F9** Dateinamen: `10_Wochenplan_KW<kw>.jpg`; `20_Angebot_<von>_00_Uebersicht.jpg`, weitere
  `…_00b_Uebersicht.jpg`, `20_Angebot_<von>_<nn>_<Artikel>.jpg` (nn = Position, Artikel bereinigt, ≤ 60 Zeichen).
- **F10** Während des Erstellens zeigt der Dialog den Fortschritt („Bilder werden erstellt 3 / 12“); Abbrechen
  ist möglich; ohne Artikelbild wird der Artikel trotzdem ohne Bild dargestellt.
- **F11** Das CMS lädt `kiosk-werbebilder.js`; die Anmeldung läuft über das vorhandene CMS-Token (Cloud-API
  `admin_auth_guard`). Die bestehende Kiosk-Verwaltung bleibt erhalten, ergänzt um F28/F29 der Kiosk-Spec.

- **F12** Gemeinsame, im Browser gespeicherte Anzeigeprofile im Kiosk und CMS: „800 × 600“
  (Dauerwerbung 800 × 462, empfohlen anhand des Fotos, an der Waage zu prüfen) und „800 × 480“
  (Dauerwerbung 800 × 280). Ohne gespeicherte Auswahl großes Profil. Keine automatische Hardwareerkennung.
  JPEG-Ausgabe in 2×, also 1600 × 1200/924 beziehungsweise 1600 × 960/560.
  Speicherfehler werden angezeigt. Bestehende Dateien bleiben unverändert.
- **F13** Aktionslayouts nutzen die Profilhöhe; Text, Preis, Stattpreis und Gültigkeit liegen in
  getrennten Bereichen. Lange Texte umbrechen; bei nicht darstellbarem Inhalt warnen und Transfer
  sperren statt Text abzuschneiden. Druck-HD und Editor unverändert.

## Testfälle

- **TC-F12-01** Beide Profile und beide Arten liefern die exakten JPEG-Maße; Profilwechsel regeneriert
  Bilder, bleibt nach Neuladen erhalten und sendet ohne Bestätigung keine POST/DELETE.
- **TC-F12-02** Fehler beim Speichern der Profilwahl erscheint sichtbar.
- **TC-F7-03** Wochenübersicht enthält alle Gerichte und Preise bei Mindestschriftgröße; lange
  Testdaten führen zu expliziter Überlaufmeldung und gesperrtem Transfer, nicht zu gekürzten Dateien.
- **TC-F13-01** Aktionsübersichten und Einzelartikel haben bei beiden Profilen keine überlappenden
  Text-/Preisbereiche; lange Namen/Details und Stattpreise werden berücksichtigt.

- **TC-F1-01** Wochenplan-Vorschau: das Bild ist 2382 px breit; Download und Druck erhalten dieselbe Auflösung.
- **TC-F1-02** Plakat-Vorschau 2382 × 3369; ein 1×-Aufruf (Einstellungs-Vorschau) bleibt 794 px.
- **TC-F1-03** Schatten/Linien: das 3×-Bild, auf 1× verkleinert, weicht von der 1×-Fassung nur gering ab (Mittelwert).
- **TC-F2-01** Einzelflyer-Editor zeigt weiterhin 794 × 1123 und seine Zonen liegen an denselben Prozentpositionen.
- **TC-F2-02** Einzelflyer-Download ist 2382 × 3369.
- **TC-F3-01** Der Knopf „Auf die Waage“ ist in Wochenplan-Vorschau, Wochenplan-Tab, Aktions-Vorschau und
  Aktionsmenü vorhanden und öffnet den Dialog.
- **TC-F4-01** Dialog zeigt Art-Wahl, neue Bilder mit Miniatur, vorhandene Waagenbilder mit Miniatur und Zähler.
- **TC-F5-01** Alte `10_Wochenplan_*` sind zum Löschen vorausgewählt, andere nicht; „Alle“/„Keine“ funktionieren.
- **TC-F6-01** Reihenfolge der Anfragen: erst alle `POST`, dann die gewählten `DELETE`.
- **TC-F6-02** Schlägt ein Upload fehl, folgt kein `DELETE`; Fehler wird je Datei gezeigt.
- **TC-F6-03** Würde die Zahl 99 überschritten, ist „Übertragen“ gesperrt.
- **TC-F7-01** Wochenplan-Waagenbild ist ein JPEG (`ffd8ff`) in den Maßen aus F12.
- **TC-F7-02** Dauerwerbung zeigt die ausgewählte Fläche; Vorgabe ist Vollbild.
- **TC-F8-01** Aktion mit 8 Artikeln: 2 Übersichten (6 + 2) und 8 Einzelbilder, JPEG nach F12, alle angehakt.
- **TC-F8-02** Aktion mit 3 Artikeln: 1 Übersicht und 3 Einzelbilder.
- **TC-F9-01** Dateinamen entsprechen F9 und sind bereinigt (Umlaute, Sonderzeichen, Länge).
- **TC-F10-01** Fortschrittsanzeige erscheint; Abbrechen sendet nichts.
- **TC-F11-01** Das CMS lädt `kiosk-werbebilder.js`; Anfragen gehen an `/api/waage-werbebilder`.

## Offen / bewusst nicht Teil dieser Änderung

- Kachel-Overrides (Position/Größe je Artikel) des Hochformat-Editors fürs Querformat.
- Zeitliche Steuerung (Gültigkeit bis) auf der Waage; alte Aktionsbilder werden von Hand im Dialog gelöscht.
- Schärfere Artikelbilder: Die Auflösung der Bilder in SharePoint bestimmt das Ergebnis.
