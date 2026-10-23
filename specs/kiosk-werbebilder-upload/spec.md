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

> **Änderung 2026-10-23 – Cloud-Relais ersetzt die Direktverbindung.** Die erste
> Fassung ließ den Kiosk direkt per `http://<IP>:8765` mit einer Brücke im LAN sprechen.
> Das scheitert in der Praxis: Browser (Edge/Chrome/Fully Kiosk) blockieren `http` auf
> einer `https`-Seite („Mixed Content“), die Abhilfe wäre eine Einstellung je Gerät. Der
> Laden will **keine manuellen Eingriffe**. Deshalb gilt jetzt F17–F25; F8 (Adresse),
> F11, F13 (Kiosk-Adresse, Firewall) und F15/F16 sind damit **abgelöst**. Unverändert
> gelten F1–F7, F9 (Prüfungen jetzt in API **und** Brücke), F10, F12, F14 (Autostart).

**Ein Browser kann kein FTP, und die Cloud erreicht das Laden-LAN nicht.** Deshalb
arbeitet die **Brücke** (`tools/waage-bruecke/`) als Agent im Laden-LAN und ruft die
Cloud **ausgehend** ab: Der Kiosk legt Bilder über die vorhandene HTTPS-API ab
(`/api/waage-werbebilder`, Speicher: SharePoint), die Brücke gleicht die Waage per FTP
damit ab. Es gibt keinen offenen Port, keine IP-Eingabe, kein Zertifikat und kein Mixed
Content. Der FTP-Port der Waage wird **nicht** ins Internet geöffnet.

**Die Cloud ist die Sollvorgabe, die Waage wird angeglichen.** Beim allerersten Lauf
übernimmt die Brücke die vorhandenen Bilder der Waage in die Cloud (nichts geht
verloren, leere Dateien werden nicht übernommen) und meldet „initialisiert“. Danach
wird die Waage der Cloud angeglichen: fehlende/geänderte Bilder hochladen, Bilder mit
gültigem Namen, die in der Cloud nicht (mehr) vorkommen, löschen. Fremde Dateien
(Namen außerhalb `[A-Za-z0-9._-]`, andere Endungen, Unterordner) fasst die Brücke
nie an.

**„Ohne Anmeldung“ heißt: keine zusätzliche Anmeldung im Tab.** Die Passwortabfrage des
Kiosks (`specs/kiosk-passwortabfrage`) gilt weiter. Schreibende Aufrufe laufen wie bei
allen Kiosk-APIs über `admin_auth_guard` (`X-CMS-Auth`, staged über `CMS_AUTH_ENFORCE`).
Die Brücke meldet sich dafür wie das CMS mit dem Passwort an (`POST /api/cms-auth`) und
sendet das Token mit.

**Die FTP-Zugangsdaten und das Anmeldepasswort stehen nur in der lokalen Konfiguration der
Brücke** (`config.json`, per `.gitignore` ausgeschlossen) oder in Umgebungsvariablen —
nie im Repo, in Specs, Tests oder Commit-Texten.

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

### Cloud-Relais (löst die Direktverbindung ab)

- **F17** API `GET/POST/DELETE /api/waage-werbebilder` (Kiosk): Liste je Art (`vollbild`,
  `dauer`), Bild abrufen, hochladen, löschen. Speicher: SharePoint-Ordner
  `Waage-Werbebilder/<art>/`. Prüfungen serverseitig: nur JPEG/GIF am Dateikopf (415),
  Grenze 8 MB (413), höchstens 99 Bilder je Art (409; Ersetzen eines vorhandenen bleibt
  möglich), bereinigter Dateiname, unbekannte Art 404. Schreibende Aufrufe hinter
  `admin_auth_guard`.
- **F18** API für die Brücke: `GET ?bruecke=sync` liefert die Sollvorgabe (je Art Name,
  Größe, `etag`, dazu `version` und `initialisiert`); `POST ?bruecke=bericht` nimmt den
  Zustand der Brücke entgegen (Zeitpunkt, ok/Fehler, Namen auf der Waage, zuletzt
  übertragene `etag`s, `initialisiert`). Der Bericht liegt in Azure Table Storage.
- **F19** Der Kiosk zeigt je Bild **„auf der Waage“** oder **„wartet auf Übertragung“**
  und oben den Brückenstatus: **online** (Bericht jünger als 90 s), sonst **offline seit
  …** mit dem Hinweis, dass Änderungen übertragen werden, sobald die Brücke läuft. Hochladen
  und Löschen sind auch bei ausgeschalteter Brücke möglich. Die Liste aktualisiert sich
  automatisch (alle 8 s, nur solange der Tab offen ist).
- **F20** Brücke als Agent: ruft alle `poll_sekunden` (Standard 10) die Sollvorgabe ab; nur
  bei Änderung (oder spätestens alle 5 Minuten) wird per FTP abgeglichen; mindestens alle
  30 s geht ein Bericht an die Cloud. Kein HTTP-Server, kein offener Port.
- **F21** Erstlauf: Solange die Brücke **lokal** (`sync_stand.json`) noch nicht initialisiert ist,
  übernimmt sie die Bilder der Waage (gültige Namen, Größe > 0) in die Cloud, soweit dort nicht
  vorhanden, und löscht nichts. Ein „initialisiert“ in der Cloud (z. B. von einer früheren oder
  zweiten Installation) ersetzt den Erstlauf **nicht** und dient nur der Anzeige; sonst würde eine
  frische Brücke Waagenbilder löschen, die nie in der Cloud waren.
- **F22** Abgleich: Bild hochladen, wenn es auf der Waage fehlt oder seine `etag` von der
  zuletzt übertragenen abweicht (die Waage darf Dateien umrechnen, ohne Dauerschleife);
  löschen, wenn gültiger Name und nicht in der Cloud. Jede Datei wird vor dem Schreiben am
  Dateikopf geprüft; Fehler bei einer Datei stoppen die übrigen nicht. `--trocken` zeigt
  nur den Plan; `--einmal` gleicht einmal ab.
- **F23** Anmeldung der Brücke: `POST /api/cms-auth` mit dem im Assistenten eingegebenen
  Passwort; das Token geht als `X-CMS-Auth` mit; bei 401 neu anmelden. Fehlt das Passwort
  und die API verlangt keins (`CMS_AUTH_ENFORCE` aus), läuft es ohne.
- **F24** Einrichtung: Assistent fragt nur Waagen-IP, FTP-Zugang und (falls gewünscht)
  Anmeldepasswort ab; die API-Adresse hat die Live-Seite als Vorgabe. **Keine Firewall-Regel
  nötig**, nur Ausgangsverbindungen. Autostart wie F14.
- **F25** Kiosk: kein Adressfeld, kein „Verbindung testen“, keine Mixed-Content-Hinweise
  mehr; der Tab arbeitet nur noch mit derselben Herkunft (`/api/…`). Fehler der API werden
  in einem Satz gemeldet. Der Service Worker beantwortet Anfragen an LAN-Adressen weiterhin
  nicht selbst (bleibt als Schutz bestehen).
- **F26** Bilder aus der **Zwischenablage** einfügen: Solange der Tab offen ist, nimmt `Strg+V`
  (bzw. Einfügen per Langdruck auf dem Tablet) ein kopiertes Bild oder einen Screenshot auf; dazu
  ein Knopf **„Aus Zwischenablage einfügen“** (liest die Zwischenablage, sofern das Gerät es
  erlaubt, sonst Hinweis auf `Strg+V`). Das Bild landet wie eine gewählte Datei in „Zum
  Hochladen“ (Vorschau, Hochladen, Ersetzen). Die Zwischenablage liefert meist PNG; solche
  Bilder (auch WebP/BMP) werden im Browser in **JPEG** umgewandelt (weißer Hintergrund,
  längste Seite höchstens 1920 px). JPEG und GIF bleiben unverändert (GIF bleibt animiert).
  Der Name lautet `Zwischenablage_<Datum>_<Uhrzeit>_<Nr>.jpg`. Reiner Text in der
  Zwischenablage wird ignoriert und bleibt in Eingabefeldern normal einfügbar. Während einer
  Übertragung und bei offenem Dialog wird nichts aufgenommen.

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
- **TC-F16-01** Antwortet unter der Adresse nicht die Brücke (z. B. HTTP 504 eines Proxys), meldet der Kiosk (Laden und „Verbindung testen“) klar „antwortet nicht die Waage-Brücke“ samt Statuscode. *(abgelöst durch F25)*
- **TC-F17-01** API: Upload eines JPEG liefert `success`, Datei liegt im Ordner der Art; Liste zeigt es sortiert.
- **TC-F17-02** API: PNG-Inhalt → 415; über 8 MB → 413; 100. Bild → 409, Ersetzen eines vorhandenen geht; Name mit Pfadanteilen wird bereinigt; unbekannte Art → 404.
- **TC-F17-03** API: `DELETE` entfernt das Bild; unbekanntes Bild → 404.
- **TC-F18-01** API: `bruecke=sync` liefert Soll mit `etag` und stabile `version` (ändert sich bei jeder Änderung); `bericht` wird gespeichert und von der Kiosk-Liste als Brückenstatus ausgegeben.
- **TC-F18-02** API: Bild „auf der Waage“ nur, wenn Name in `ist` und `etag` in `stand` übereinstimmt, sonst „wartet“.
- **TC-F19-01** Kiosk: Brücke online → „online“; Bericht älter als 90 s → „offline seit …“ mit Hinweis; Upload bleibt möglich.
- **TC-F19-02** Kiosk: Bild zeigt „auf der Waage“ bzw. „wartet auf Übertragung“.
- **TC-F20-01** Brücke: ohne Änderung kein FTP-Zugriff innerhalb von 5 Minuten, aber Bericht spätestens alle 30 s.
- **TC-F21-01** Brücke: Erstlauf übernimmt Waagenbilder (nicht leere, gültige Namen) in die Cloud und löscht nichts; erst im Folgelauf wird abgeglichen.
- **TC-F21-02** Brücke: Meldet die Cloud „initialisiert“, die Brücke ist lokal aber frisch, wird trotzdem zuerst übernommen und nichts gelöscht.
- **TC-F22-01** Brücke: fehlendes Bild wird hochgeladen, geänderte `etag` ersetzt, überzähliges gültiges Bild gelöscht; fremde Dateien bleiben unberührt.
- **TC-F22-02** Brücke: Waage skaliert/ändert eine Datei nach dem Upload → kein erneuter Upload (Vergleich über `etag`, nicht über Größe).
- **TC-F22-03** Brücke: defekte Datei (kein JPEG/GIF) wird nicht auf die Waage geschrieben, die übrigen laufen weiter; `--trocken` schreibt/löscht nichts.
- **TC-F23-01** Brücke: 401 → Anmeldung mit Passwort, Wiederholung mit Token; ohne Passwort und ohne Pflicht kein Token.
- **TC-F24-01** Assistent fragt Waagen-IP, FTP-Zugang, optional Passwort; keine Firewall-Frage.
- **TC-F25-01** Kiosk-Tab hat keine Adress-/Test-Bedienelemente; alle Anfragen gehen an `/api/waage-werbebilder`.
- **TC-F26-01** `Strg+V` mit einem PNG in der Zwischenablage legt ein JPEG `Zwischenablage_….jpg` in „Zum Hochladen“; Hochladen sendet `image/jpeg` mit JPEG-Kopf (FFD8FF).
- **TC-F26-02** Ein GIF in der Zwischenablage bleibt ein GIF; ein JPEG bleibt unverändert.
- **TC-F26-03** Reiner Text in der Zwischenablage legt nichts ab; Einfügen in ein Eingabefeld außerhalb des Tabs bleibt unberührt.
- **TC-F26-04** Der Knopf „Aus Zwischenablage einfügen“ liest ein Bild per Zwischenablage-Schnittstelle; ohne Bild oder ohne Berechtigung/Schnittstelle erscheint ein Hinweis auf `Strg+V`.
- **TC-F26-05** Während einer Übertragung und bei offenem Dialog wird ein Einfügen ignoriert; zwei Bilder kurz nacheinander erhalten verschiedene Namen.

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
