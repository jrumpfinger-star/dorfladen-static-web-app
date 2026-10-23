# Waage-Brücke

Vermittelt zwischen dem Kiosk (Browser, kann kein FTP) und dem FTP-Server der PC-Waage.
Spec: [specs/kiosk-werbebilder-upload](../../specs/kiosk-werbebilder-upload/spec.md).

```
Kiosk (Tab „Werbebilder“) --HTTP--> diese Brücke --FTP--> Waage
```

## Einrichten mit der exe (empfohlen, ohne Python)

1. `Waage-Bruecke.zip` auf den Laden-PC kopieren, entpacken (z. B. nach `C:\Waage-Bruecke\`) und
   `Waage-Bruecke.exe` im entpackten Ordner doppelklicken. Der Ordner muss zusammenbleiben.
2. Beim ersten Start fragt sie nach IP der Waage, FTP-Port, Rechner-Adresse, Port, Benutzer und
   Passwort und schreibt `config.json` **neben die exe**. Danach bietet sie an, den Autostart
   (Aufgabenplanung, bei jeder Windows-Anmeldung) und eine Firewall-Regel (nur lokales Netz,
   braucht „Als Administrator ausführen“) einzurichten.
3. Das Fenster zeigt „Im Kiosk eintragen: http://…“. Diese Adresse im Kiosk-Tab **Werbebilder** unter
   **Adresse** eintragen.
4. Neu einrichten: `config.json` löschen oder `Waage-Bruecke.exe --einrichten`.
   Autostart entfernen: `Waage-Bruecke.exe --autostart-entfernen`.
5. Die exe ist nicht signiert; Windows SmartScreen zeigt ggf. „Weitere Informationen → Trotzdem ausführen“.
   Als Ordner (nicht als Einzeldatei) gebaut, weil Windows Defender die Einzeldatei-Variante
   fälschlich als `Trojan:Win32/Bearfoos.B!ml` meldete; die Ordner-Variante meldet er nicht.

Die exe wird mit `build-exe.bat` erzeugt (braucht Python und `pip install pyinstaller`, Ergebnis in
`dist\`, nicht im Repo; ZIP mit dem Ordner).

## Einrichten mit Python (einmalig, auf einem Rechner im Laden-LAN)

1. Python 3.9 oder neuer installieren (nur Standardbibliothek nötig).
2. Ordner `tools/waage-bruecke` auf den Rechner kopieren.
3. Adressen und Zugang eintragen – am einfachsten geführt: `python waage_bruecke.py --einrichten`
   (fragt IP der Waage, FTP-Port, Rechner-Adresse, Port, Benutzer, Passwort ab, prüft die
   Eingaben und schreibt `config.json`; `start.bat` ruft das beim ersten Start selbst auf).
   Von Hand: `config.example.json` nach `config.json` kopieren:

   | Schlüssel | Bedeutung | Vorgabe |
   |-----------|-----------|---------|
   | `ftp_host` | IP der Waage bzw. des Waagen-PCs | – |
   | `ftp_port` | FTP-Port der Waage | 21 |
   | `bind` | Adresse **dieses** Rechners, auf der die Brücke lauscht (`0.0.0.0` = alle) | `0.0.0.0` |
   | `port` | Port der Brücke | 8765 |
   | `ftp_user`, `ftp_pass` | FTP-Zugang | – |

   Diese Datei bleibt auf dem Rechner und gehört **nie** ins Repo (steht in `.gitignore`).
   Alternativ Umgebungsvariablen `WAAGE_FTP_HOST`, `WAAGE_FTP_PORT`, `WAAGE_FTP_USER`,
   `WAAGE_FTP_PASS`, `WAAGE_BIND`, `WAAGE_PORT`. Fehlerhafte Adressen meldet die Brücke beim
   Start mit Klartext.
4. `start.bat` starten (für Dauerbetrieb in den Autostart oder die Aufgabenplanung legen).
   Die Brücke zeigt beim Start die Adresse(n) an, die im Kiosk einzutragen sind
   („Im Kiosk eintragen: http://192.168.1.20:8765“).
5. Im Kiosk den Tab **Werbebilder** öffnen und dort unter **Adresse** IP und Port des Rechners
   der Brücke eintragen (Felder werden geprüft; „Verbindung testen“ zeigt, ob die Waage antwortet).
   Die Adresse wird im Gerät gemerkt.
6. Prüfen: `http://<Rechner>:8765/health` muss `"waage": true` und beide Arten `true` melden.

## Verzeichnisse

Auf der Waage (Anleitung Powerscale, 2.15.1), jeweils nur `default`:

| Art im Kiosk | Verzeichnis (ab `ftp_basis`) |
|--------------|------------------------------|
| Vollbild | `fullscreen/default` |
| Dauerwerbung | `permanent/default` |

Meldet `/health` für eine Art `false`, stimmt `ftp_basis` nicht zum Stammverzeichnis des
FTP-Servers. Anpassen in `config.json`; abweichende Unterverzeichnisse über `verzeichnisse`
(`{"vollbild": "fullscreen", "dauer": "permanent"}`).

## HTTPS-Kiosk und HTTP-Brücke

Der Kiosk läuft über HTTPS, die Brücke standardmäßig über HTTP. Browser blockieren das
(„Mixed Content“). Zwei Wege:

- **Fully Kiosk:** Einstellungen → Web-Inhalte → *Mixed Content zulassen* einschalten.
- **HTTPS an der Brücke:** `tls_cert` und `tls_key` in `config.json` setzen (Zertifikat, dem
  das Gerät vertraut) und im Kiosk eine `https://`-Adresse eintragen.

## Sicherheit

Die Brücke hat keine eigene Anmeldung (so gewünscht) und gehört nur ins Laden-LAN. Den Port
nicht ins Internet weiterleiten. Angenommen werden nur JPEG und GIF (geprüft am Dateikopf),
höchstens `max_bytes` je Datei (Standard 8 MB), höchstens 99 Bilder je Verzeichnis, nur aus den
erlaubten Herkünften.
