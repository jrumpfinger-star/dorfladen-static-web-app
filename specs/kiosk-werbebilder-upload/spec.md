# Kiosk: Werbebilder der PC-Waage hochladen

## Ausgangslage

Aus dem Laden: *„Auf diesem Rechner können Werbedateien in Form von JPEG oder GIF
abgelegt werden, die dann im Display angezeigt werden. Diese Dateien sollen elegant
über eine Kiosk-Funktion ausgetauscht werden können. Der Upload erfolgt über FTP.
Es soll im Kiosk ein neuer Tab ‚Upload Werbebilder‘ angelegt werden, in dem der
Upload ohne Anmeldung elegant erfolgen kann. Wir nutzen nur die Default-Verzeichnisse,
nicht die Monatsverzeichnisse.“*

Quelle der Verzeichnisse und Formate: Programmieranleitung Powerscale (KHII),
Abschnitt 2.15 „Werbebilder“ (S. 2-107 ff.) und 6.15 „Werbung“.

## Was die Waage vorgibt (aus der Anleitung)

- Formate: **JPG** und **animiertes GIF**. Bilder werden von der Waage selbst auf
  Bildschirmgröße umgerechnet (Seitenverhältnis bleibt, Randstreifen).
- Wurzel: `bizerba/data/multimedia/advertising/`
  - `fullscreen/` = **Vollbildwerbung** (ganzer Bildschirm, startet im Leerlauf)
  - `permanent/` = **Dauerwerbung** (unterer Bildteil, 800×280, läuft parallel zum Verkauf)
- Je Art gibt es die Werbeprojekte `1`…`12` (Monate) und `default`. **Genutzt wird nur
  `default`.**
- 1…99 Bilder je Verzeichnis. Die **Reihenfolge ergibt sich aus dem Dateinamen**.
- Bildwechsel frühestens nach 7 s (Einstellung an der Waage, nicht hier).
- Per FTP trägt der Anwender selbst die Verantwortung für das Zielverzeichnis; auf der
  SD-Karte müssen mindestens 40 MB frei bleiben.

## Entwurfsentscheidungen

**Ein Browser kann kein FTP, und die Cloud erreicht das Laden-LAN nicht.** Deshalb
vermittelt ein kleiner **Brückendienst** im Laden-LAN (`tools/waage-bruecke/`): Der Kiosk
schickt das Bild per HTTP an die Brücke, die Brücke legt es per FTP auf der Waage ab.
Der FTP-Port der Waage wird **nicht** ins Internet geöffnet.

**„Ohne Anmeldung“ heißt: keine zusätzliche Anmeldung im Tab.** Die Passwortabfrage des
Kiosks (`specs/kiosk-passwortabfrage`) gilt weiter; im Tab selbst wird weder ein Name
noch ein Passwort verlangt. Die Brücke hat keine eigene Anmeldung und ist deshalb nur
im LAN zu betreiben. Schutz dort: nur JPEG/GIF (Prüfung am Dateikopf, nicht an der
Endung), Größen- und Anzahlgrenze, bereinigter Dateiname, nur die beiden
Default-Verzeichnisse.

**Die FTP-Zugangsdaten stehen nur in der lokalen Konfiguration der Brücke**
(`config.json`, per `.gitignore` ausgeschlossen) oder in Umgebungsvariablen — nie im
Repo, in Specs, Tests oder Commit-Texten.

**Der Upload ersetzt nie blind.** „Alle ersetzen“ lädt zuerst die neuen Bilder hoch und
entfernt erst danach die übrigen alten. Bricht etwas ab, bleibt die Werbung nicht leer.

**Die Reihenfolge wird nicht verwaltet.** Sie folgt dem Dateinamen; die Liste zeigt die
Bilder in genau dieser Reihenfolge mit Positionsnummer.

## Anforderungen

- **F1** Der Kiosk hat einen Tab **„Werbebilder“** (Schalter `kiosk_werbebilder`,
  Standard an). Der Tab verlangt keine zusätzliche Anmeldung.
- **F2** Der Tab bietet die beiden Arten **Vollbild** und **Dauerwerbung**, jeweils nur
  im Verzeichnis `default`. Monatsverzeichnisse kommen nirgends vor.
- **F3** Hochladen per Dateiwahl **und** Ziehen & Ablegen, mehrere Dateien auf einmal,
  mit Vorschau, Fortschritt je Datei und klarer Fehlermeldung je Datei.
- **F4** Erlaubt sind nur JPEG und GIF. Die Prüfung erfolgt in der Brücke am Dateikopf;
  der Kiosk weist andere Dateien schon vor dem Senden ab.
- **F5** Die Liste zeigt die vorhandenen Bilder der gewählten Art in
  Wiedergabereihenfolge (Position, Miniatur, Name, Größe) und die Zahl `n / 99`.
- **F6** Ein einzelnes Bild lässt sich nach Rückfrage löschen.
- **F7** „Alle ersetzen“ (Rückfrage): neue Bilder hochladen, danach die übrigen alten
  löschen; bei einem Fehler wird nichts gelöscht.
- **F8** Die Brücke erreicht die Waage nicht, oder ist selbst nicht erreichbar: Der Tab
  zeigt das in einem Satz und mit dem Hinweis, was zu prüfen ist; er bleibt bedienbar
  (Adresse der Brücke einstellbar, gespeichert im Gerät).
- **F9** Brücke: lehnt ab, was nicht JPEG/GIF ist, größer als die Grenze ist (Standard
  8 MB), mehr als 99 Bilder je Verzeichnis ergäbe, oder einen Dateinamen mit Pfadanteilen
  hat. Dateinamen werden auf `[A-Za-z0-9._-]` bereinigt, die Endung folgt dem
  tatsächlichen Typ (`.jpg`/`.gif`).
- **F10** Brücke: Zugangsdaten und Wurzelpfad nur aus lokaler Konfiguration/Umgebung;
  `config.json` steht in `.gitignore`.
- **F11** Brücke: antwortet auf `OPTIONS` (Browser-Vorabfrage inkl. Private-Network-Access)
  und erlaubt nur die konfigurierten Herkünfte (Standard: die Live-Adresse des Ladens).

- **F12** Jedes Bild ist als Vorschau ansehbar: Miniaturen in der Liste und in der Auswahl
  (vor dem Hochladen); Antippen öffnet eine Großansicht mit Blättern (‹ ›, Pfeiltasten)
  und Schließen (✕, Esc, Antippen außerhalb).
- **F13** Adressen sind konfigurierbar. Brücke: IP der Waage (`ftp_host`), FTP-Port, eigene
  Rechner-Adresse (`bind`) und Port in `config.json`/Umgebung oder geführt per
  `--einrichten`; Eingaben werden geprüft (IPv4 je Zahl ≤ 255 oder Rechnername, Port 1–65535),
  beim Start nennt die Brücke die im Kiosk einzutragende Adresse. Kiosk: Adresse der Brücke
  als Schema/IP/Port-Felder mit Prüfung und „Verbindung testen“; gemerkt pro Gerät. Keine
  Zugangsdaten im Repo.
- **F14** Installation ohne Python: `Waage-Bruecke.exe` (PyInstaller, `build-exe.bat`) legt
  `config.json` neben die exe, startet beim ersten Aufruf den Assistenten und bietet Autostart
  (Aufgabenplanung bei Anmeldung, ohne Administrator) und eine Firewall-Regel nur für das lokale
  Subnetz an. Ohne Zustimmung wird am System nichts geändert; Fehlschläge werden gemeldet.
- **F15** Verzeichnis-/Herkunftsregeln der Brücke: fehlt nur `default`, wird es beim Hochladen
  angelegt (nur diese Ebene); Bilder direkt in `fullscreen`/`permanent` haben bei der Waage Vorrang
  und werden im Kiosk gemeldet; Live-Seite und SWA-Vorschau sind als Herkunft fest erlaubt.
- **F16** Antwortet unter der Brücken-Adresse ein fremder Server, nennt der Kiosk das klar.

## Testfälle

- **TC-F1-01** Tab „Werbebilder“ ist sichtbar und öffnet ohne Namens-/Passwortabfrage.
- **TC-F1-02** `kiosk_werbebilder=false` blendet den Tab aus.
- **TC-F2-01** Der Tab bietet genau „Vollbild“ und „Dauerwerbung“; Anfragen gehen nur an
  `vollbild`/`dauer`, nie an eine Monatsnummer.
- **TC-F3-01** Zwei JPEGs per Dateiwahl: zwei Sendungen, beide erscheinen in der Liste.
- **TC-F3-02** Ziehen & Ablegen löst denselben Upload aus.
- **TC-F4-01** Eine PNG/PDF-Datei wird vor dem Senden abgewiesen, ohne Anfrage.
- **TC-F5-01** Liste in Namensreihenfolge mit Positionen und `n / 99`.
- **TC-F6-01** Löschen fragt nach; „Abbrechen“ sendet nichts, „Löschen“ sendet `DELETE`.
- **TC-F7-01** „Alle ersetzen“ sendet erst die Uploads, danach die `DELETE` der übrigen.
- **TC-F7-02** Schlägt ein Upload fehl, folgt kein `DELETE`.
- **TC-F8-01** Brücke nicht erreichbar → Hinweistext, Adressfeld bedienbar.
- **TC-F8-02** Waage nicht erreichbar (`/health` meldet `waage:false`) → eigener Hinweis.
- **TC-F12-01** Miniatur öffnet die Großansicht, Pfeile blättern, Esc schließt.
- **TC-F12-02** Auch ein noch nicht hochgeladenes Bild lässt sich groß ansehen.
- **TC-F9-01** Brücke: Datei mit Endung `.jpg`, aber PNG-Inhalt → 415.
- **TC-F9-02** Brücke: Datei über der Größengrenze → 413.
- **TC-F9-03** Brücke: 100. Bild → 409.
- **TC-F9-04** Brücke: Name `..\..\x.jpg` / `a/b.gif` landet bereinigt im Zielverzeichnis.
- **TC-F9-05** Brücke: unbekannte Art (`1`, `default`, `..`) → 404.
- **TC-F10-01** `config.json` ist ausgeschlossen; im Repo steht kein Zugangswert.
- **TC-F11-01** `OPTIONS` liefert CORS- und Private-Network-Kopfzeilen nur für erlaubte Herkunft.
- **TC-F13-01** Adresse als Schema + IP + Port speichern; Felder sind mit der gemerkten Adresse vorbelegt; Brücke liest Waagen-IP/Ports/Bind aus der Umgebung.
- **TC-F13-02** Ungültige IP (>255, leer, Sonderzeichen) oder Port (0, >65535, Text) → Hinweis, nichts gespeichert (Kiosk und Brücke).
- **TC-F13-03** „Verbindung testen“ meldet Erfolg bzw. „Keine Antwort“; Assistent `--einrichten` schreibt `config.json` und fragt bei Fehleingabe nach.
- **TC-F14-01** Installation legt Autostart (ONLOGON, LIMITED) und Firewall-Regel (LocalSubnet, Bruecken-Port) an.
- **TC-F14-02** Bei „Nein“ wird nichts am System verändert.
- **TC-F14-03** Schlägt ein Schritt fehl (z. B. kein Administrator), erscheint eine verständliche Meldung statt Abbruch.
- **TC-F15-01…05** Fehlt `default`, ist die Liste leer statt Fehler; Upload legt genau `default` an, nie darüberliegende Ordner; Bilder direkt in `fullscreen`/`permanent` werden im Kiosk mit Vorrang-Hinweis gemeldet; Live- und Vorschau-Herkunft sind immer erlaubt, fremde nicht.
- **TC-F16-01** Antwortet unter der Adresse nicht die Brücke (z. B. HTTP 504 eines Proxys), meldet der Kiosk (Laden und „Verbindung testen“) klar „antwortet nicht die Waage-Brücke“ samt Statuscode.

## Offen / bewusst nicht Teil dieser Änderung

- **Das genaue FTP-Wurzelverzeichnis** hängt davon ab, wo der FTP-Server der Waage seinen
  Stamm hat. Die Brücke nimmt `ftp_basis` (Standard `bizerba/data/multimedia/advertising`)
  und die Verzeichnisnamen aus der Konfiguration. Beim ersten Lauf im Laden prüfen
  (`GET /health` zeigt Wurzel und Fund).
- **„default“ vs. Stammverzeichnis:** Die Anleitung zeigt Bilder aus `fullscreen/` bzw.
  `permanent/` direkt bei Werbeprojekt 0; `default` ist die Rückfallebene, wenn dort
  nichts liegt. Der Laden nennt ausdrücklich die Default-Verzeichnisse – daher
  `fullscreen/default` und `permanent/default`. Ändert sich das, genügt ein Eintrag in
  `config.json` (`verzeichnisse`).
- Zeitliche Steuerung (Monate), Umsortieren, Zuschneiden, Bildbearbeitung.
- Gerät mit HTTPS-Kiosk und HTTP-Brücke: Fully Kiosk braucht „Mixed Content zulassen“,
  oder die Brücke läuft mit Zertifikat (siehe README der Brücke).
