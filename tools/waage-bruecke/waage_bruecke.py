#!/usr/bin/env python3
"""Bruecke Kiosk -> PC-Waage (Spec specs/kiosk-werbebilder-upload/spec.md).

Der Kiosk laeuft im Browser und kann kein FTP. Dieser kleine Dienst laeuft im
Laden-LAN, nimmt Werbebilder per HTTP an und legt sie per FTP auf der Waage
ab. Nur Standardbibliothek.

Er hat bewusst keine eigene Anmeldung und gehoert deshalb nur ins LAN, nie ins
Internet. Schutz: nur JPEG/GIF (am Dateikopf geprueft), Groessen- und
Anzahlgrenze, bereinigte Dateinamen, nur die beiden Default-Verzeichnisse und
nur erlaubte Herkuenfte.

Zugangsdaten und Adressen stehen nur in config.json (nicht im Repo; Einrichtung
mit "python waage_bruecke.py --einrichten") oder in den Umgebungsvariablen
WAAGE_FTP_HOST / WAAGE_FTP_PORT / WAAGE_FTP_USER / WAAGE_FTP_PASS /
WAAGE_BIND / WAAGE_PORT.
"""
import ftplib
import getpass
import io
import json
import os
import re
import socket
import ssl
import sys
import unicodedata
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import parse_qs, unquote, urlparse

# Art -> Unterverzeichnis unterhalb der Wurzel. Nur "default": Die
# Monatsverzeichnisse 1..12 werden im Laden nicht genutzt.
ARTEN = {"vollbild": "fullscreen/default", "dauer": "permanent/default"}
MAX_BILDER = 99
NAME_OK = re.compile(r"^[A-Za-z0-9._-]{1,80}\.(jpg|gif)$")

STANDARD = {
    "ftp_host": "",
    "ftp_port": 21,
    "ftp_user": "",
    "ftp_pass": "",
    "ftp_basis": "bizerba/data/multimedia/advertising",
    "ftp_timeout": 10,
    "verzeichnisse": ARTEN,
    "max_bytes": 8 * 1024 * 1024,
    "bind": "0.0.0.0",
    "port": 8765,
    "erlaubte_herkuenfte": [
        "https://www.dorfladen-oberornau.de",
        "https://kind-pebble-072605b03.7.azurestaticapps.net",
    ],
    "tls_cert": "",
    "tls_key": "",
}


def basis_verzeichnis():
    """Ordner der exe (PyInstaller) bzw. des Skripts; dort liegt config.json."""
    if getattr(sys, "frozen", False):
        return os.path.dirname(os.path.abspath(sys.executable))
    return os.path.dirname(os.path.abspath(__file__))


def lade_config(pfad=None, env=None):
    cfg = json.loads(json.dumps(STANDARD))
    pfad = pfad or os.path.join(basis_verzeichnis(), "config.json")
    if os.path.exists(pfad):
        with open(pfad, encoding="utf-8-sig") as f:
            cfg.update(json.load(f))
    env = os.environ if env is None else env
    for schluessel, name in (("ftp_host", "WAAGE_FTP_HOST"), ("ftp_user", "WAAGE_FTP_USER"),
                             ("ftp_pass", "WAAGE_FTP_PASS"), ("ftp_basis", "WAAGE_FTP_BASIS")):
        if env.get(name):
            cfg[schluessel] = env[name]
    for schluessel, name in (("ftp_port", "WAAGE_FTP_PORT"), ("port", "WAAGE_PORT")):
        if env.get(name):
            cfg[schluessel] = int(env[name])
    if env.get("WAAGE_BIND"):
        cfg["bind"] = env["WAAGE_BIND"]
    return cfg


HOST_OK = re.compile(r"^(?:\d{1,3}(?:\.\d{1,3}){3}|[A-Za-z0-9](?:[A-Za-z0-9.-]{0,251}[A-Za-z0-9])?)$")


def pruefe_adresse(host, name="Adresse"):
    """IPv4 oder Rechnername; sonst Fehlertext (ValueError)."""
    host = (host or "").strip()
    if not HOST_OK.match(host):
        raise ValueError("%s ungueltig: '%s' (IP wie 192.168.1.50 oder Rechnername)" % (name, host))
    if re.match(r"^\d{1,3}(\.\d{1,3}){3}$", host) and any(int(t) > 255 for t in host.split(".")):
        raise ValueError("%s ungueltig: '%s' (Zahlen nur bis 255)" % (name, host))
    return host


def pruefe_port(wert, name="Port"):
    try:
        p = int(wert)
    except (TypeError, ValueError):
        raise ValueError("%s ungueltig: '%s'" % (name, wert))
    if not 1 <= p <= 65535:
        raise ValueError("%s ungueltig: %s (1 bis 65535)" % (name, p))
    return p


def pruefe_config(cfg):
    """Prueft die eingegebenen Adressen; wirft ValueError mit verstaendlichem Text."""
    cfg["ftp_host"] = pruefe_adresse(cfg.get("ftp_host"), "Waagen-Adresse (ftp_host)")
    cfg["ftp_port"] = pruefe_port(cfg.get("ftp_port"), "FTP-Port (ftp_port)")
    cfg["bind"] = pruefe_adresse(cfg.get("bind"), "Rechner-Adresse (bind)")
    cfg["port"] = pruefe_port(cfg.get("port"), "Bruecken-Port (port)")
    return cfg


def lokale_adressen():
    """IPv4-Adressen dieses Rechners (ohne Loopback), fuer den Hinweis an den Kiosk."""
    ips = set()
    try:
        for info in socket.getaddrinfo(socket.gethostname(), None, socket.AF_INET):
            ips.add(info[4][0])
    except OSError:
        pass
    try:
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        s.connect(("10.255.255.255", 1))
        ips.add(s.getsockname()[0])
        s.close()
    except OSError:
        pass
    return sorted(i for i in ips if not i.startswith("127."))


def einrichten(pfad=None, eingabe=input, ausgabe=print):
    """Fragt die Adressen ab und schreibt config.json (bestehende Werte bleiben Vorschlag)."""
    pfad = pfad or os.path.join(basis_verzeichnis(), "config.json")
    alt = {}
    if os.path.exists(pfad):
        with open(pfad, encoding="utf-8-sig") as f:
            alt = json.load(f)
    cfg = json.loads(json.dumps(STANDARD))
    cfg.update(alt)

    def frage(text, schluessel, pruefer):
        while True:
            v = eingabe("%s [%s]: " % (text, cfg.get(schluessel, ""))).strip() or str(cfg.get(schluessel, ""))
            try:
                return pruefer(v)
            except ValueError as e:
                ausgabe(str(e))

    ips = lokale_adressen()
    if ips:
        ausgabe("Adressen dieses Rechners: " + ", ".join(ips))
    cfg["ftp_host"] = frage("IP-Adresse der Waage / des Waagen-PCs", "ftp_host", lambda v: pruefe_adresse(v, "Waagen-Adresse"))
    cfg["ftp_port"] = frage("FTP-Port der Waage", "ftp_port", lambda v: pruefe_port(v, "FTP-Port"))
    cfg["bind"] = frage("Auf welcher Adresse dieses Rechners lauschen (0.0.0.0 = alle)", "bind", lambda v: pruefe_adresse(v, "Rechner-Adresse"))
    cfg["port"] = frage("Port der Bruecke", "port", lambda v: pruefe_port(v, "Bruecken-Port"))
    if not cfg.get("ftp_user"):
        cfg["ftp_user"] = eingabe("FTP-Benutzer: ").strip()
    if not cfg.get("ftp_pass"):
        cfg["ftp_pass"] = getpass.getpass("FTP-Passwort (wird nicht angezeigt): ") if eingabe is input else eingabe("FTP-Passwort: ")
    with open(pfad, "w", encoding="utf-8") as f:
        json.dump(cfg, f, indent=2, ensure_ascii=False)
    ausgabe("Gespeichert: " + pfad)
    return cfg


AUFGABE = "Waage-Bruecke"


def _ausfuehren(befehl):
    import subprocess
    r = subprocess.run(befehl, capture_output=True, text=True)
    return r.returncode, (r.stdout + r.stderr).strip()


def start_befehl():
    """Befehl, der die Bruecke startet (exe oder Skript)."""
    if getattr(sys, "frozen", False):
        return '"%s"' % os.path.abspath(sys.executable)
    return '"%s" "%s"' % (sys.executable, os.path.abspath(__file__))


def autostart_einrichten(ausfuehren=_ausfuehren):
    """Startet die Bruecke bei jeder Windows-Anmeldung (Aufgabenplanung, ohne Admin)."""
    return ausfuehren(["schtasks", "/Create", "/F", "/SC", "ONLOGON", "/RL", "LIMITED",
                       "/TN", AUFGABE, "/TR", start_befehl()])


def autostart_entfernen(ausfuehren=_ausfuehren):
    return ausfuehren(["schtasks", "/Delete", "/F", "/TN", AUFGABE])


def firewall_regel(port, ausfuehren=_ausfuehren):
    """Eingehenden TCP-Port nur fuer das lokale Netz oeffnen (braucht Administratorrechte)."""
    return ausfuehren(["netsh", "advfirewall", "firewall", "add", "rule", "name=" + AUFGABE,
                       "dir=in", "action=allow", "protocol=TCP", "localport=%s" % port,
                       "remoteip=LocalSubnet", "profile=private,domain"])


def installieren(cfg, eingabe=input, ausgabe=print, ausfuehren=_ausfuehren):
    """Nach der Einrichtung: Autostart und Firewall anbieten."""
    if eingabe("Bruecke bei jeder Windows-Anmeldung automatisch starten? [J/n]: ").strip().lower() in ("", "j", "ja", "y"):
        code, text = autostart_einrichten(ausfuehren)
        ausgabe("Autostart eingerichtet." if code == 0 else "Autostart fehlgeschlagen: " + text)
    if eingabe("Firewall-Regel fuer Port %s anlegen (nur lokales Netz, braucht Administrator)? [J/n]: "
               % cfg["port"]).strip().lower() in ("", "j", "ja", "y"):
        code, text = firewall_regel(cfg["port"], ausfuehren)
        if code == 0:
            ausgabe("Firewall-Regel angelegt.")
        else:
            ausgabe("Firewall-Regel nicht angelegt (als Administrator starten oder beim Windows-Hinweis "
                    "'Zugriff zulassen' klicken): " + text)


def bildtyp(daten):
    """'jpg' oder 'gif' nach dem Dateikopf, sonst None. Die Endung zaehlt nicht."""
    if daten[:3] == b"\xff\xd8\xff":
        return "jpg"
    if daten[:6] in (b"GIF87a", b"GIF89a"):
        return "gif"
    return None


def sauberer_name(name, typ):
    """Nur der Dateiname, nur [A-Za-z0-9._-], Endung gemaess tatsaechlichem Typ."""
    name = re.split(r"[\\/]", name or "")[-1]
    stamm = name.rsplit(".", 1)[0] if "." in name else name
    for a, b in (("ä", "ae"), ("ö", "oe"), ("ü", "ue"), ("Ä", "Ae"), ("Ö", "Oe"),
                 ("Ü", "Ue"), ("ß", "ss")):
        stamm = stamm.replace(a, b)
    stamm = unicodedata.normalize("NFKD", stamm).encode("ascii", "ignore").decode("ascii")
    stamm = re.sub(r"[^A-Za-z0-9._-]+", "_", stamm).strip("._-")[:60] or "bild"
    return "%s.%s" % (stamm, typ)


class FtpWaage:
    """Kurzlebige FTP-Verbindung zur Waage (eine je Anfrage)."""

    def __init__(self, cfg):
        self.cfg = cfg
        self.ftp = None

    def __enter__(self):
        c = self.cfg
        self.ftp = ftplib.FTP()
        self.ftp.connect(c["ftp_host"], int(c["ftp_port"]), timeout=float(c["ftp_timeout"]))
        self.ftp.login(c["ftp_user"], c["ftp_pass"])
        self.ftp.voidcmd("TYPE I")
        self._start = self.ftp.pwd()
        return self

    def __exit__(self, *exc):
        try:
            self.ftp.quit()
        except Exception:
            try:
                self.ftp.close()
            except Exception:
                pass
        return False

    def _cd(self, verz):
        # Der Pfad gilt ab dem Anmeldeverzeichnis, nicht ab dem zuletzt
        # besuchten - mehrere Zugriffe je Verbindung sind sonst verschoben.
        self.ftp.cwd(self._start)
        self.ftp.cwd(verz)

    def pruefe(self, verz):
        self._cd(verz)
        return True

    def liste(self, verz):
        self._cd(verz)
        namen = []
        try:
            for name, fakten in self.ftp.mlsd(facts=["type", "size"]):
                if fakten.get("type") == "file":
                    namen.append((name, int(fakten.get("size", 0))))
            return namen
        except ftplib.error_perm:
            pass
        for name in self.ftp.nlst():
            name = name.replace("\\", "/").split("/")[-1]
            if not name or name in (".", ".."):
                continue
            try:
                namen.append((name, int(self.ftp.size(name) or 0)))
            except ftplib.error_perm:
                continue  # Unterverzeichnis o. ae.
        return namen

    def lies(self, verz, name):
        self._cd(verz)
        teile = []
        self.ftp.retrbinary("RETR " + name, teile.append)
        return b"".join(teile)

    def schreibe(self, verz, name, daten):
        self._cd(verz)
        self.ftp.storbinary("STOR " + name, io.BytesIO(daten))

    def loesche(self, verz, name):
        self._cd(verz)
        self.ftp.delete(name)


class Fehler(Exception):
    def __init__(self, status, text):
        Exception.__init__(self, text)
        self.status = status
        self.text = text


def bilder_sortiert(eintraege):
    gueltig = [(n, g) for n, g in eintraege if NAME_OK.match(n)]
    return sorted(gueltig, key=lambda e: e[0].lower())


class Handler(BaseHTTPRequestHandler):
    server_version = "WaageBruecke/1.0"
    protocol_version = "HTTP/1.1"

    # ── Hilfen ──
    @property
    def cfg(self):
        return self.server.cfg

    def _verz(self, art):
        rel = self.cfg["verzeichnisse"].get(art) if art in ARTEN else None
        if not rel:
            raise Fehler(404, "Unbekannte Art")
        return self.cfg["ftp_basis"].rstrip("/") + "/" + rel.strip("/")

    def _herkunft_ok(self):
        o = self.headers.get("Origin")
        erlaubt = self.cfg["erlaubte_herkuenfte"]
        return o is None or "*" in erlaubt or o in erlaubt

    def _kopf(self, status, typ, laenge):
        self.send_response(status)
        self.send_header("Content-Type", typ)
        self.send_header("Content-Length", str(laenge))
        self.send_header("Cache-Control", "no-store")
        o = self.headers.get("Origin")
        if o and self._herkunft_ok():
            self.send_header("Access-Control-Allow-Origin", o)
            self.send_header("Vary", "Origin")
            self.send_header("Access-Control-Allow-Private-Network", "true")
        self.end_headers()

    def _json(self, status, daten):
        body = json.dumps(daten, ensure_ascii=False).encode("utf-8")
        self._kopf(status, "application/json; charset=utf-8", len(body))
        self.wfile.write(body)

    def _ftp(self):
        return self.server.ftp_factory(self.cfg)

    def _lauf(self, fn):
        try:
            if not self._herkunft_ok():
                raise Fehler(403, "Herkunft nicht erlaubt")
            fn()
        except Fehler as e:
            self.close_connection = True
            self._json(e.status, {"success": False, "error": e.text})
        except (OSError, EOFError) as e:
            self.close_connection = True
            self._json(502, {"success": False, "error": "Waage nicht erreichbar: %s" % e})
        except ftplib.Error as e:
            self.close_connection = True
            self._json(502, {"success": False, "error": "FTP-Fehler: %s" % e})
        except Exception:
            self.close_connection = True
            self._json(500, {"success": False, "error": "Interner Fehler"})

    def _pfad(self):
        teile = [unquote(t) for t in urlparse(self.path).path.split("/") if t]
        return teile, parse_qs(urlparse(self.path).query)

    # ── Methoden ──
    def do_OPTIONS(self):
        o = self.headers.get("Origin")
        if o and not self._herkunft_ok():
            self._json(403, {"success": False, "error": "Herkunft nicht erlaubt"})
            return
        self.send_response(204)
        if o:
            self.send_header("Access-Control-Allow-Origin", o)
            self.send_header("Vary", "Origin")
            self.send_header("Access-Control-Allow-Methods", "GET, POST, DELETE, OPTIONS")
            self.send_header("Access-Control-Allow-Headers", "Content-Type")
            self.send_header("Access-Control-Allow-Private-Network", "true")
            self.send_header("Access-Control-Max-Age", "600")
        self.send_header("Content-Length", "0")
        self.end_headers()

    def do_GET(self):
        self._lauf(self._get)

    def do_POST(self):
        self._lauf(self._post)

    def do_DELETE(self):
        self._lauf(self._delete)

    def _get(self):
        teile, _ = self._pfad()
        if teile == ["health"]:
            return self._health()
        if len(teile) == 2 and teile[0] == "bilder":
            verz = self._verz(teile[1])
            with self._ftp() as f:
                bilder = bilder_sortiert(f.liste(verz))
            return self._json(200, {
                "success": True, "art": teile[1], "verzeichnis": verz, "max": MAX_BILDER,
                "bilder": [{"name": n, "groesse": g} for n, g in bilder]})
        if len(teile) == 3 and teile[0] == "bilder":
            verz = self._verz(teile[1])
            if not NAME_OK.match(teile[2]):
                raise Fehler(400, "Ungueltiger Dateiname")
            with self._ftp() as f:
                daten = f.lies(verz, teile[2])
            typ = "image/gif" if teile[2].lower().endswith(".gif") else "image/jpeg"
            self._kopf(200, typ, len(daten))
            self.wfile.write(daten)
            return
        raise Fehler(404, "Nicht gefunden")

    def _health(self):
        antwort = {"success": True, "ok": True, "waage": False,
                   "basis": self.cfg["ftp_basis"], "arten": {}}
        try:
            with self._ftp() as f:
                antwort["waage"] = True
                for art in ARTEN:
                    try:
                        antwort["arten"][art] = bool(f.pruefe(self._verz(art)))
                    except ftplib.Error:
                        antwort["arten"][art] = False
        except (OSError, EOFError, ftplib.Error) as e:
            antwort["fehler"] = str(e)
        self._json(200, antwort)

    def _post(self):
        teile, abfrage = self._pfad()
        if len(teile) != 2 or teile[0] != "bilder":
            raise Fehler(404, "Nicht gefunden")
        verz = self._verz(teile[1])
        laenge = self.headers.get("Content-Length")
        if laenge is None or not laenge.isdigit():
            raise Fehler(411, "Content-Length fehlt")
        laenge = int(laenge)
        if laenge <= 0:
            raise Fehler(400, "Leere Datei")
        if laenge > int(self.cfg["max_bytes"]):
            raise Fehler(413, "Datei zu gross (max. %d MB)" % (int(self.cfg["max_bytes"]) // (1024 * 1024)))
        daten = self.rfile.read(laenge)
        typ = bildtyp(daten)
        if not typ:
            raise Fehler(415, "Nur JPEG und GIF erlaubt")
        name = sauberer_name((abfrage.get("name") or [""])[0], typ)
        with self._ftp() as f:
            vorhanden = [n for n, _ in bilder_sortiert(f.liste(verz))]
            if name not in vorhanden and len(vorhanden) >= MAX_BILDER:
                raise Fehler(409, "Es sind bereits %d Bilder gespeichert" % MAX_BILDER)
            f.schreibe(verz, name, daten)
        self._json(200, {"success": True, "name": name, "groesse": len(daten)})

    def _delete(self):
        teile, _ = self._pfad()
        if len(teile) != 3 or teile[0] != "bilder":
            raise Fehler(404, "Nicht gefunden")
        verz = self._verz(teile[1])
        if not NAME_OK.match(teile[2]):
            raise Fehler(400, "Ungueltiger Dateiname")
        try:
            with self._ftp() as f:
                f.loesche(verz, teile[2])
        except ftplib.error_perm as e:
            if str(e).startswith("550"):
                raise Fehler(404, "Bild nicht gefunden")
            raise
        self._json(200, {"success": True})

    def log_message(self, fmt, *args):
        sys.stderr.write("%s %s\n" % (self.address_string(), fmt % args))


def baue_server(cfg, ftp_factory=None):
    srv = ThreadingHTTPServer((cfg["bind"], int(cfg["port"])), Handler)
    srv.cfg = cfg
    srv.ftp_factory = ftp_factory or FtpWaage
    srv.daemon_threads = True
    if cfg.get("tls_cert") and cfg.get("tls_key"):
        ctx = ssl.SSLContext(ssl.PROTOCOL_TLS_SERVER)
        ctx.load_cert_chain(cfg["tls_cert"], cfg["tls_key"])
        srv.socket = ctx.wrap_socket(srv.socket, server_side=True)
    return srv


def main(argv=None):
    argv = sys.argv[1:] if argv is None else argv
    if "--einrichten" in argv:
        installieren(einrichten())
        return 0
    if "--autostart-entfernen" in argv:
        code, text = autostart_entfernen()
        print("Autostart entfernt." if code == 0 else "Fehlgeschlagen: " + text)
        return code
    cfg = lade_config()
    if not (cfg["ftp_host"] and cfg["ftp_user"]) and getattr(sys, "frozen", False) and sys.stdin and sys.stdin.isatty():
        print("Erstmalige Einrichtung der Waage-Bruecke.\n")
        installieren(einrichten())
        cfg = lade_config()
    if not (cfg["ftp_host"] and cfg["ftp_user"]):
        print("FTP-Zugang fehlt: 'python waage_bruecke.py --einrichten' ausfuehren, config.json "
              "anlegen (siehe config.example.json) oder WAAGE_FTP_HOST/WAAGE_FTP_USER/WAAGE_FTP_PASS setzen.",
              file=sys.stderr)
        return 2
    try:
        pruefe_config(cfg)
    except ValueError as e:
        print("Konfiguration fehlerhaft: %s" % e, file=sys.stderr)
        return 2
    srv = baue_server(cfg)
    print("Waage-Bruecke laeuft auf %s:%s, Waage: %s:%s (Strg+C beendet)"
          % (cfg["bind"], cfg["port"], cfg["ftp_host"], cfg["ftp_port"]))
    schema = "https" if cfg.get("tls_cert") and cfg.get("tls_key") else "http"
    if cfg["bind"] in ("0.0.0.0", ""):
        ziele = lokale_adressen()
    else:
        ziele = [cfg["bind"]]
    for ip in ziele:
        print("Im Kiosk eintragen: %s://%s:%s" % (schema, ip, cfg["port"]))
    try:
        srv.serve_forever()
    except KeyboardInterrupt:
        pass
    return 0


if __name__ == "__main__":
    ergebnis = main()
    if ergebnis and getattr(sys, "frozen", False):
        input("Enter zum Beenden ...")
    sys.exit(ergebnis)
