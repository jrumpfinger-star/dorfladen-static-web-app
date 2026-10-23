# Waage-Brücke

Überträgt die im Kiosk (Tab **Werbebilder**) hochgeladenen Bilder per FTP auf die PC-Waage.
Spec: `specs/kiosk-werbebilder-upload/`.

```
Kiosk --HTTPS--> /api/waage-werbebilder (SharePoint)  <--HTTPS (ausgehend)--  Brücke --FTP--> Waage
```

Die Brücke läuft im Laden-LAN und **ruft die Cloud ab**. Es gibt keinen offenen Port, keine
IP-Eingabe im Kiosk, kein Zertifikat und keine Browser-Einstellung („Mixed Content“). Der
Kiosk funktioniert auch von außerhalb des Ladens; ist die Brücke aus, werden Änderungen
gespeichert und übertragen, sobald sie wieder läuft (der Kiosk zeigt „Brücke offline seit …“).

## Einrichten mit der exe (empfohlen, ohne Python)

1. `Waage-Bruecke.zip` auf den Laden-PC kopieren, entpacken (z. B. nach `C:\Waage-Bruecke\`) und
   `Waage-Bruecke.exe` im entpackten Ordner doppelklicken. Der Ordner muss zusammenbleiben.
2. Beim ersten Start fragt sie nach: IP der Waage, FTP-Port, FTP-Benutzer und -Passwort, Adresse der
   Dorfladen-Seite (Vorgabe: die Live-Seite) und – falls vorhanden – das Kiosk-/CMS-Passwort.
   Alles landet in `config.json` **neben der exe**.
3. Danach bietet sie den **Autostart** an (Aufgabenplanung, bei jeder Windows-Anmeldung) und führt eine
   **Prüfung** aus: Cloud erreichbar, Anmeldung, Waage erreichbar, Verzeichnisse gefunden.
4. Fertig. Im Kiosk den Tab **Werbebilder** öffnen: Dort steht „● Brücke online“.

Weitere Aufrufe: `Waage-Bruecke.exe --einrichten` (neu einrichten), `--pruefen` (Diagnose),
`--trocken --einmal` (zeigt nur, was passieren würde), `--autostart-entfernen`.

Die exe wird mit `build-exe.bat` erzeugt (braucht Python und `pip install pyinstaller`, Ergebnis in
`dist\`, nicht im Repo; ZIP mit dem Ordner). Sie ist nicht signiert; Windows SmartScreen zeigt ggf.
„Weitere Informationen → Trotzdem ausführen“. Als Ordner (nicht als Einzeldatei) gebaut, weil
Windows Defender die Einzeldatei-Variante fälschlich als `Trojan:Win32/Bearfoos.B!ml` meldete.

## Einrichten mit Python

1. Python 3.9 oder neuer, Ordner `tools/waage-bruecke` auf den Rechner kopieren.
2. `python waage_bruecke.py --einrichten` (gleiche Fragen wie oben) oder `config.example.json` nach
   `config.json` kopieren und ausfüllen.
3. `start.bat` starten (für Dauerbetrieb in den Autostart legen).

## Konfiguration (`config.json`, nie im Repo)

| Schlüssel | Bedeutung | Vorgabe |
|-----------|-----------|---------|
| `ftp_host` | IP der Waage bzw. des Waagen-PCs | – |
| `ftp_port` | FTP-Port | 21 |
| `ftp_user`, `ftp_pass` | FTP-Zugang | – |
| `ftp_basis` | Wurzel der Werbebilder auf dem FTP-Server | `bizerba/data/multimedia/advertising` |
| `api_url` | Adresse der Dorfladen-Seite (Cloud) | `https://www.dorfladen-oberornau.de` |
| `cms_passwort` | Kiosk-/CMS-Passwort; die Brücke meldet sich damit wie das CMS an (`/api/cms-auth`) | leer = ohne Anmeldung |
| `poll_sekunden` | Abfragetakt (2–3600) | 10 |
| `max_bytes` | größtes Bild | 8 MB |

Umgebungsvariablen überschreiben die Datei: `WAAGE_FTP_HOST`, `WAAGE_FTP_PORT`, `WAAGE_FTP_USER`,
`WAAGE_FTP_PASS`, `WAAGE_FTP_BASIS`, `WAAGE_API_URL`, `WAAGE_CMS_PASSWORT`, `WAAGE_POLL`.
Neben `config.json` legt die Brücke `sync_stand.json` an (welche Fassung der Bilder übertragen ist).

## Was die Brücke tut

- Alle `poll_sekunden` holt sie die Sollvorgabe (Bildliste der Cloud) und meldet sich spätestens alle
  30 s mit einem Bericht (Brückenstatus im Kiosk). Die Waage selbst wird nur bei einer Änderung, nach
  einem Fehler (nach 60 s) und sonst alle 5 Minuten per FTP angesehen.
- **Erstlauf:** Sie übernimmt die vorhandenen Bilder der Waage (gültige Namen, nicht leer) in die
  Cloud. Nichts wird gelöscht, leere oder defekte Dateien werden nicht übernommen.
- **Danach ist die Cloud die Vorgabe:** fehlende oder geänderte Bilder auf die Waage laden, gültig
  benannte Bilder, die in der Cloud fehlen, von der Waage löschen. Wird die Cloud-Liste einer Art
  plötzlich leer, leert sie die Waage erst nach 3 aufeinanderfolgenden Abfragen (Schutz vor einem
  Ausfall des Speichers).
- **Fremde Dateien bleiben unberührt:** Namen außerhalb `[A-Za-z0-9._-]`, andere Endungen, Unterordner.
- Jede Datei wird vor dem Schreiben am Dateikopf geprüft (nur JPEG/GIF); ein defektes Bild stoppt
  die anderen nicht.

## Verzeichnisse auf der Waage

Laut Anleitung Powerscale (2.15.1), jeweils nur `default`:

| Art im Kiosk | Verzeichnis (ab `ftp_basis`) |
|--------------|------------------------------|
| Vollbild | `fullscreen/default` |
| Dauerwerbung | `permanent/default` |

Ein fehlendes `default` legt die Brücke beim ersten Hochladen an, nie aber darüberliegende Ordner
(ein falscher `ftp_basis` erzeugt also keine Ordner auf der Waage). Die Waage spielt zuerst die Bilder,
die **direkt** in `fullscreen/` bzw. `permanent/` liegen, und nutzt `default` nur als Rückfall; liegen
dort Bilder, zeigt der Kiosk einen Hinweis. Abweichende Unterverzeichnisse über `verzeichnisse` in
`config.json` (`{"vollbild": "fullscreen", "dauer": "permanent"}`).

## Sicherheit

- Die Brücke öffnet **keinen** Port; sie baut nur Verbindungen nach außen auf (HTTPS zur Cloud, FTP zur Waage).
- FTP-Zugang und Passwort stehen nur in `config.json` auf dem Brückenrechner (nicht im Repo).
- Schreibende Aufrufe der API laufen wie bei allen Kiosk-Funktionen über das CMS-Token
  (`CMS_AUTH_ENFORCE`); die Brücke meldet sich dafür mit dem Passwort an.
- Der Kiosk-Tab selbst verlangt keine weitere Anmeldung (die Kiosk-Passwortabfrage gilt weiter).

## Fehlersuche

`Waage-Bruecke.exe --pruefen` prüft Cloud, Anmeldung, Waage und Verzeichnisse und nennt, was fehlt.
Typisch: falscher `ftp_basis` (Verzeichnis nicht gefunden), falsches Passwort (Anmeldung abgelehnt),
Waage aus (Verbindung abgelehnt). Läuft die Brücke ohne Fehler, aber im Kiosk steht „offline“, prüfen,
ob der Rechner Internet hat.
