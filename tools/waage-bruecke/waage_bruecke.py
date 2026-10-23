#!/usr/bin/env python3
"""Bruecke Cloud -> PC-Waage (Spec specs/kiosk-werbebilder-upload/spec.md, F17-F25).

Der Kiosk legt Werbebilder ueber die HTTPS-API in der Cloud ab. Dieser kleine Dienst
laeuft im Laden-LAN, ruft die Cloud AUSGEHEND ab und gleicht die Waage per FTP an:

    Kiosk -> /api/waage-werbebilder (SharePoint)  <-  Bruecke  -> FTP -> Waage

Es gibt keinen offenen Port, keine IP-Eingabe im Kiosk und kein Zertifikat.
Nur Standardbibliothek.

Abgleich: Die Cloud ist die Sollvorgabe. Beim allerersten Lauf uebernimmt die
Bruecke die vorhandenen Bilder der Waage in die Cloud (nichts geht verloren),
danach wird die Waage angeglichen. Fremde Dateien (Namen ausserhalb
[A-Za-z0-9._-], andere Endungen, Unterordner) fasst die Bruecke nie an.

Zugangsdaten stehen nur in config.json (nicht im Repo; Einrichtung mit
"python waage_bruecke.py --einrichten") oder in Umgebungsvariablen
WAAGE_FTP_HOST / WAAGE_FTP_PORT / WAAGE_FTP_USER / WAAGE_FTP_PASS /
WAAGE_API_URL / WAAGE_CMS_PASSWORT / WAAGE_POLL.
"""
import ftplib
import getpass
import hashlib
import io
import json
import os
import re
import socket
import sys
import time
import urllib.error
import urllib.parse
import urllib.request

# Art -> Unterverzeichnis unterhalb der Wurzel. Nur "default": Die
# Monatsverzeichnisse 1..12 werden im Laden nicht genutzt.
ARTEN = {"vollbild": "fullscreen/default", "dauer": "permanent/default"}
MAX_BILDER = 99
NAME_OK = re.compile(r"^[A-Za-z0-9._-]{1,80}\.(jpg|gif)$")
FTP_INTERVALL = 300      # Waage spaetestens alle 5 Minuten erneut ansehen
BERICHT_INTERVALL = 30   # Lebenszeichen an die Cloud
LEER_BESTAETIGUNG = 3    # so oft muss eine leere Cloud-Liste in Folge kommen, bevor die Waage geleert wird
FEHLER_WIEDERHOLUNG = 60

STANDARD = {
    "ftp_host": "",
    "ftp_port": 21,
    "ftp_user": "",
    "ftp_pass": "",
    "ftp_basis": "bizerba/data/multimedia/advertising",
    "ftp_timeout": 10,
    "verzeichnisse": ARTEN,
    "max_bytes": 8 * 1024 * 1024,
    "api_url": "https://www.dorfladen-oberornau.de",
    "cms_passwort": "",
    "poll_sekunden": 10,
}


def basis_verzeichnis():
    """Ordner der exe (PyInstaller) bzw. des Skripts; dort liegen config.json und sync_stand.json."""
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
                             ("ftp_pass", "WAAGE_FTP_PASS"), ("ftp_basis", "WAAGE_FTP_BASIS"),
                             ("api_url", "WAAGE_API_URL"), ("cms_passwort", "WAAGE_CMS_PASSWORT")):
        if env.get(name):
            cfg[schluessel] = env[name]
    for schluessel, name in (("ftp_port", "WAAGE_FTP_PORT"), ("poll_sekunden", "WAAGE_POLL")):
        if env.get(name):
            cfg[schluessel] = int(env[name])
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


def pruefe_api_url(url, name="API-Adresse"):
    url = (url or "").strip().rstrip("/")
    m = re.match(r"^(https?)://([^/:]+)(:\d{1,5})?$", url)
    if not m:
        raise ValueError("%s ungueltig: '%s' (z. B. https://www.dorfladen-oberornau.de)" % (name, url))
    pruefe_adresse(m.group(2), name)
    return url


def pruefe_config(cfg):
    """Prueft die Eingaben; wirft ValueError mit verstaendlichem Text."""
    cfg["ftp_host"] = pruefe_adresse(cfg.get("ftp_host"), "Waagen-Adresse (ftp_host)")
    cfg["ftp_port"] = pruefe_port(cfg.get("ftp_port"), "FTP-Port (ftp_port)")
    cfg["api_url"] = pruefe_api_url(cfg.get("api_url"), "API-Adresse (api_url)")
    try:
        p = int(cfg.get("poll_sekunden"))
    except (TypeError, ValueError):
        p = 0
    if not 2 <= p <= 3600:
        raise ValueError("poll_sekunden ungueltig: '%s' (2 bis 3600)" % cfg.get("poll_sekunden"))
    cfg["poll_sekunden"] = p
    return cfg


def lokale_adressen():
    """IPv4-Adressen dieses Rechners (ohne Loopback), nur zur Anzeige."""
    ips = set()
    try:
        for info in socket.getaddrinfo(socket.gethostname(), None, socket.AF_INET):
            ips.add(info[4][0])
    except OSError:
        pass
    return sorted(i for i in ips if not i.startswith("127."))


def einrichten(pfad=None, eingabe=input, ausgabe=print):
    """Fragt Waage, FTP-Zugang und Anmeldung ab und schreibt config.json (Altwerte bleiben Vorschlag)."""
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
    if not cfg.get("ftp_user"):
        cfg["ftp_user"] = eingabe("FTP-Benutzer: ").strip()
    if not cfg.get("ftp_pass"):
        cfg["ftp_pass"] = getpass.getpass("FTP-Passwort (wird nicht angezeigt): ") if eingabe is input else eingabe("FTP-Passwort: ")
    cfg["api_url"] = frage("Adresse der Dorfladen-Seite", "api_url", lambda v: pruefe_api_url(v))
    if not cfg.get("cms_passwort"):
        cfg["cms_passwort"] = (getpass.getpass("Kiosk-/CMS-Passwort (Enter = ohne, wird nicht angezeigt): ")
                               if eingabe is input else eingabe("Kiosk-/CMS-Passwort: "))
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


def installieren(eingabe=input, ausgabe=print, ausfuehren=_ausfuehren):
    """Nach der Einrichtung: Autostart anbieten. Eine Firewall-Regel ist nicht noetig (nur ausgehend)."""
    if eingabe("Bruecke bei jeder Windows-Anmeldung automatisch starten? [J/n]: ").strip().lower() in ("", "j", "ja", "y"):
        code, text = autostart_einrichten(ausfuehren)
        ausgabe("Autostart eingerichtet." if code == 0 else "Autostart fehlgeschlagen: " + text)


def bildtyp(daten):
    """'jpg' oder 'gif' nach dem Dateikopf, sonst None. Die Endung zaehlt nicht."""
    if daten[:3] == b"\xff\xd8\xff":
        return "jpg"
    if daten[:6] in (b"GIF87a", b"GIF89a"):
        return "gif"
    return None


# ── FTP zur Waage ───────────────────────────────────────────────────────────

class FtpWaage:
    """Kurzlebige FTP-Verbindung zur Waage (eine je Abgleich)."""

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

    def _cd(self, verz, anlegen=False):
        # Der Pfad gilt ab dem Anmeldeverzeichnis, nicht ab dem zuletzt
        # besuchten - mehrere Zugriffe je Verbindung sind sonst verschoben.
        # Nur die letzte Ebene ("default") darf angelegt werden, nie darueberliegende
        # Ordner: ein falscher ftp_basis soll keine Verzeichnisse auf der Waage anlegen.
        eltern, _, letzte = verz.rstrip("/").rpartition("/")
        self.ftp.cwd(self._start)
        if eltern:
            self.ftp.cwd(eltern)
        try:
            self.ftp.cwd(letzte)
        except ftplib.error_perm:
            if not anlegen:
                raise
            self.ftp.mkd(letzte)
            self.ftp.cwd(letzte)

    def pruefe(self, verz):
        """True, wenn das Verzeichnis oder (dann wird es beim Hochladen angelegt) sein Elternordner da ist."""
        eltern = verz.rstrip("/").rpartition("/")[0]
        self.ftp.cwd(self._start)
        if eltern:
            self.ftp.cwd(eltern)
        return True

    def liste(self, verz):
        try:
            self._cd(verz)
        except ftplib.error_perm:
            self.pruefe(verz)   # Elternordner fehlt ebenfalls -> Fehler; sonst: noch leer
            return []
        return self._dateien()

    def direkt(self, verz):
        """Bilder direkt im Elternordner (fullscreen/permanent); die Waage spielt diese vor 'default'."""
        eltern = verz.rstrip("/").rpartition("/")[0]
        self.ftp.cwd(self._start)
        if eltern:
            self.ftp.cwd(eltern)
        return self._dateien()

    def _dateien(self):
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
        self._cd(verz, anlegen=True)
        self.ftp.storbinary("STOR " + name, io.BytesIO(daten))

    def loesche(self, verz, name):
        self._cd(verz)
        self.ftp.delete(name)


# ── Cloud-API ───────────────────────────────────────────────────────────────

class ApiFehler(Exception):
    def __init__(self, status, text):
        Exception.__init__(self, "%s: %s" % (status, text))
        self.status = status
        self.text = text


class Api:
    """HTTPS-Client fuer /api/waage-werbebilder; meldet sich wie das CMS an (X-CMS-Auth)."""

    def __init__(self, cfg, oeffne=None):
        self.basis = cfg["api_url"].rstrip("/")
        self.passwort = cfg.get("cms_passwort") or ""
        self.token = None
        self.oeffne = oeffne or urllib.request.urlopen

    def _roh(self, methode, pfad, body=None, typ=None, mit_token=True, timeout=60):
        kopf = {"User-Agent": "WaageBruecke/2"}
        if typ:
            kopf["Content-Type"] = typ
        if mit_token and self.token:
            kopf["X-CMS-Auth"] = self.token
        req = urllib.request.Request(self.basis + pfad, data=body, method=methode, headers=kopf)
        try:
            with self.oeffne(req, timeout=timeout) as r:
                return r.status, r.read()
        except urllib.error.HTTPError as e:
            return e.code, e.read()

    def anmelden(self):
        if not self.passwort:
            return False
        status, daten = self._roh("POST", "/api/cms-auth", json.dumps({"password": self.passwort}).encode("utf-8"),
                                  "application/json", mit_token=False, timeout=30)
        if status == 200:
            self.token = json.loads(daten.decode("utf-8")).get("token")
            return bool(self.token)
        if status == 401:
            raise ApiFehler(401, "Anmeldung abgelehnt: Passwort in config.json stimmt nicht")
        raise ApiFehler(status, "Anmeldung nicht moeglich")

    def _anfrage(self, methode, pfad, body=None, typ=None, timeout=60):
        if self.passwort and not self.token:
            self.anmelden()
        status, daten = self._roh(methode, pfad, body, typ, timeout=timeout)
        if status == 401 and self.passwort:
            self.token = None
            self.anmelden()
            status, daten = self._roh(methode, pfad, body, typ, timeout=timeout)
        return status, daten

    def _json(self, status, daten):
        try:
            d = json.loads(daten.decode("utf-8"))
        except Exception:
            raise ApiFehler(status, "Unerwartete Antwort der Dorfladen-Seite")
        if status != 200 or not d.get("success"):
            raise ApiFehler(status, d.get("error") or "Fehler")
        return d

    def sync(self):
        return self._json(*self._anfrage("GET", "/api/waage-werbebilder?bruecke=sync", timeout=30))

    def lade(self, art, name):
        status, daten = self._anfrage("GET", "/api/waage-werbebilder?art=%s&name=%s" % (art, urllib.parse.quote(name)))
        if status != 200:
            raise ApiFehler(status, "Bild nicht abrufbar")
        return daten

    def lade_hoch(self, art, name, daten):
        typ = "image/gif" if name.lower().endswith(".gif") else "image/jpeg"
        return self._json(*self._anfrage("POST", "/api/waage-werbebilder?art=%s&name=%s" % (art, urllib.parse.quote(name)),
                                         daten, typ))

    def bericht(self, bericht):
        return self._json(*self._anfrage("POST", "/api/waage-werbebilder?bruecke=bericht",
                                         json.dumps(bericht).encode("utf-8"), "application/json", timeout=30))


# ── Abgleich ────────────────────────────────────────────────────────────────

def plane(soll, ist, stand, initialisiert, leer_bestaetigt=()):
    """Reine Planung. Rueckgabe: {'uebernehmen': [(art,name)], 'hoch': [(art,name,etag)], 'loeschen': [(art,name)]}.

    soll:  {art: [{name, groesse, etag}]}   Sollvorgabe der Cloud
    ist:   {art: {name: groesse}}           gueltige Dateien auf der Waage
    stand: {art: {name: etag}}              zuletzt uebertragene Fassung
    """
    plan = {"uebernehmen": [], "hoch": [], "loeschen": []}
    for art in ARTEN:
        cloud = dict((b["name"], b) for b in soll.get(art, []))
        vorhanden = ist.get(art, {})
        stand_art = stand.get(art, {})
        if not initialisiert:
            for name, groesse in sorted(vorhanden.items()):
                if name not in cloud and groesse > 0:
                    plan["uebernehmen"].append((art, name))
        for name in sorted(cloud):
            if name not in vorhanden or stand_art.get(name) != cloud[name]["etag"]:
                plan["hoch"].append((art, name, cloud[name]["etag"]))
        if initialisiert:
            if cloud or art in leer_bestaetigt:
                for name in sorted(vorhanden):
                    if name not in cloud:
                        plan["loeschen"].append((art, name))
    return plan


class Agent:
    """Eine Runde je Aufruf von schritt(); Uhr, Log und Netz sind austauschbar (Test)."""

    def __init__(self, cfg, api, ftp_fabrik=FtpWaage, uhr=time.time, log=print, trocken=False, stand_pfad=None):
        self.cfg, self.api, self.ftp_fabrik, self.uhr, self.log = cfg, api, ftp_fabrik, uhr, log
        self.trocken = trocken
        self.stand_pfad = stand_pfad
        self.stand = dict((a, {}) for a in ARTEN)
        self.initialisiert = False
        self.version = None
        self.letzter_ftp = 0.0
        self.letzter_bericht = 0.0
        self.wiederholen_ab = 0.0
        self.ist_namen = dict((a, []) for a in ARTEN)
        self.direkt = dict((a, 0) for a in ARTEN)
        self.fehler = ""
        self.leer = dict((a, 0) for a in ARTEN)
        self._lade_stand()

    # Zustand neben der exe: welche Fassung ist uebertragen, ist der Erstlauf erledigt
    def _lade_stand(self):
        if not self.stand_pfad or not os.path.exists(self.stand_pfad):
            return
        try:
            with open(self.stand_pfad, encoding="utf-8") as f:
                d = json.load(f)
            self.initialisiert = bool(d.get("initialisiert"))
            for a in ARTEN:
                self.stand[a] = dict((k, str(v)) for k, v in (d.get("stand", {}).get(a) or {}).items())
        except (OSError, ValueError):
            pass

    def _speichere_stand(self):
        if not self.stand_pfad or self.trocken:
            return
        try:
            with open(self.stand_pfad, "w", encoding="utf-8") as f:
                json.dump({"initialisiert": self.initialisiert, "stand": self.stand}, f, indent=1)
        except OSError:
            pass

    def _verz(self, art):
        return self.cfg["ftp_basis"].rstrip("/") + "/" + self.cfg["verzeichnisse"][art].strip("/")

    def schritt(self, erzwingen=False):
        jetzt = self.uhr()
        try:
            soll = self.api.sync()
        except (ApiFehler, OSError) as e:
            self.log("Cloud nicht erreichbar: %s" % e)
            return False
        for a in ARTEN:
            self.leer[a] = self.leer[a] + 1 if not soll["arten"].get(a) else 0
        if erzwingen:
            faellig = True
        elif self.fehler:   # nach einem Fehler nicht im Takt der Abfrage, sondern erst nach der Wartezeit erneut versuchen
            faellig = jetzt >= self.wiederholen_ab
        else:
            faellig = (soll["version"] != self.version or jetzt - self.letzter_ftp >= FTP_INTERVALL
                       or any(self.leer[a] == LEER_BESTAETIGUNG and self.ist_namen[a] for a in ARTEN))
        if faellig:
            self.abgleich(soll, jetzt)
        elif jetzt - self.letzter_bericht >= BERICHT_INTERVALL:
            self.melde(jetzt)
        return faellig

    def abgleich(self, soll, jetzt):
        fehler = []
        try:
            with self.ftp_fabrik(self.cfg) as ftp:
                ist = {}
                for art in ARTEN:
                    eintraege = ftp.liste(self._verz(art))
                    ist[art] = dict((n, g) for n, g in eintraege if NAME_OK.match(n))
                    try:
                        self.direkt[art] = len([1 for n, _ in ftp.direkt(self._verz(art)) if NAME_OK.match(n)])
                    except (ftplib.Error, AttributeError):
                        self.direkt[art] = 0
                bestaetigt = [a for a in ARTEN if self.leer[a] >= LEER_BESTAETIGUNG]
                plan = plane(soll["arten"], ist, self.stand, self.initialisiert or bool(soll.get("initialisiert")), bestaetigt)
                self._protokolliere(plan)
                if not self.trocken:
                    self._fuehre_aus(plan, ftp, soll["arten"], fehler)
                    if not self.initialisiert and not fehler:
                        self.initialisiert = True
                    ist_neu = {}
                    for art in ARTEN:
                        ist_neu[art] = [n for n, _ in ftp.liste(self._verz(art)) if NAME_OK.match(n)]
                    self.ist_namen = ist_neu
                else:
                    self.ist_namen = dict((a, sorted(ist[a])) for a in ARTEN)
        except (OSError, EOFError, ftplib.Error) as e:
            fehler.append("Waage nicht erreichbar: %s" % e)
        self.fehler = "; ".join(fehler)[:300]
        self.letzter_ftp = jetzt
        self.wiederholen_ab = jetzt + FEHLER_WIEDERHOLUNG
        if not self.fehler:
            self.version = soll["version"]
        else:
            self.log("Abgleich mit Fehlern: %s" % self.fehler)
        self._speichere_stand()
        self.melde(jetzt)

    def _protokolliere(self, plan):
        if not (plan["uebernehmen"] or plan["hoch"] or plan["loeschen"]):
            return
        self.log("%sPlan: %d uebernehmen, %d auf die Waage, %d loeschen" % (
            "[trocken] " if self.trocken else "", len(plan["uebernehmen"]), len(plan["hoch"]), len(plan["loeschen"])))
        if self.trocken:
            for a, n in plan["uebernehmen"]:
                self.log("  uebernehmen  %s/%s" % (a, n))
            for a, n, _ in plan["hoch"]:
                self.log("  hochladen    %s/%s" % (a, n))
            for a, n in plan["loeschen"]:
                self.log("  loeschen     %s/%s" % (a, n))

    def _fuehre_aus(self, plan, ftp, soll_arten, fehler):
        max_bytes = int(self.cfg["max_bytes"])
        for art, name in plan["uebernehmen"]:
            try:
                daten = ftp.lies(self._verz(art), name)
                if not bildtyp(daten) or len(daten) > max_bytes:
                    self.log("uebersprungen (kein gueltiges Bild): %s/%s" % (art, name))
                    continue
                antwort = self.api.lade_hoch(art, name, daten)
                if antwort.get("name") != name:
                    self.log("uebernommen als %s: %s/%s" % (antwort.get("name"), art, name))
                self.stand[art][antwort.get("name", name)] = antwort.get("etag", "")
                self.log("uebernommen: %s/%s" % (art, name))
            except (ApiFehler, OSError, ftplib.Error) as e:
                fehler.append("%s/%s: %s" % (art, name, e))
        for art, name, etag in plan["hoch"]:
            try:
                daten = self.api.lade(art, name)
                if not bildtyp(daten) or len(daten) > max_bytes:
                    fehler.append("%s/%s: kein gueltiges JPEG/GIF, nicht auf die Waage geschrieben" % (art, name))
                    continue
                ftp.schreibe(self._verz(art), name, daten)
                self.stand[art][name] = etag
                self.log("auf der Waage: %s/%s" % (art, name))
            except (ApiFehler, OSError, ftplib.Error) as e:
                fehler.append("%s/%s: %s" % (art, name, e))
        for art, name in plan["loeschen"]:
            try:
                ftp.loesche(self._verz(art), name)
                self.stand[art].pop(name, None)
                self.log("geloescht: %s/%s" % (art, name))
            except ftplib.error_perm as e:
                if not str(e).startswith("550"):
                    fehler.append("%s/%s: %s" % (art, name, e))
            except (OSError, ftplib.Error) as e:
                fehler.append("%s/%s: %s" % (art, name, e))
        for art in ARTEN:   # Stand nur fuer Bilder behalten, die in der Cloud stehen oder gerade uebernommen wurden
            behalten = set(n for a, n, _ in plan["hoch"] if a == art)
            behalten |= set(n for a, n in plan["uebernehmen"] if a == art)
            behalten |= set(b["name"] for b in soll_arten.get(art, []))
            for name in list(self.stand[art]):
                if name not in behalten:
                    self.stand[art].pop(name, None)

    def melde(self, jetzt):
        if self.trocken:
            return
        try:
            self.api.bericht({"ok": not self.fehler, "fehler": self.fehler, "initialisiert": self.initialisiert,
                              "ist": self.ist_namen, "stand": self.stand, "direkt": self.direkt})
            self.letzter_bericht = jetzt
        except (ApiFehler, OSError) as e:
            self.log("Bericht an die Cloud fehlgeschlagen: %s" % e)


# ── Pruefen und Start ───────────────────────────────────────────────────────

def pruefen(cfg, api, ftp_fabrik=FtpWaage, ausgabe=print):
    """Diagnose fuer die Einrichtung: Cloud, Anmeldung, Waage, Verzeichnisse. True, wenn alles passt."""
    ok = True
    try:
        api.anmelden()
        s = api.sync()
        ausgabe("OK    Cloud erreichbar (%s), Sollvorgabe: %d Vollbild, %d Dauerwerbung" % (
            cfg["api_url"], len(s["arten"].get("vollbild", [])), len(s["arten"].get("dauer", []))))
    except (ApiFehler, OSError) as e:
        ok = False
        ausgabe("FEHLER Cloud/Anmeldung: %s" % e)
    try:
        with ftp_fabrik(cfg) as ftp:
            ausgabe("OK    Waage erreichbar (%s)" % cfg["ftp_host"])
            for art, rel in cfg["verzeichnisse"].items():
                verz = cfg["ftp_basis"].rstrip("/") + "/" + rel.strip("/")
                try:
                    anzahl = len([1 for n, _ in ftp.liste(verz) if NAME_OK.match(n)])
                    ausgabe("OK    %s: %s (%d Bilder)" % (art, verz, anzahl))
                except ftplib.Error as e:
                    ok = False
                    ausgabe("FEHLER %s: %s nicht gefunden - ftp_basis in config.json pruefen (%s)" % (art, verz, e))
    except (OSError, EOFError, ftplib.Error) as e:
        ok = False
        ausgabe("FEHLER Waage nicht erreichbar: %s" % e)
    return ok


def _zeit():
    return time.strftime("%H:%M:%S")


def main(argv=None):
    argv = sys.argv[1:] if argv is None else argv
    if "--einrichten" in argv:
        cfg = einrichten()
        installieren()
        pruefen(cfg, Api(cfg))
        return 0
    if "--autostart-entfernen" in argv:
        code, text = autostart_entfernen()
        print("Autostart entfernt." if code == 0 else "Fehlgeschlagen: " + text)
        return code
    cfg = lade_config()
    if not (cfg["ftp_host"] and cfg["ftp_user"]) and getattr(sys, "frozen", False) and sys.stdin and sys.stdin.isatty():
        print("Erstmalige Einrichtung der Waage-Bruecke.\n")
        cfg = einrichten()
        installieren()
        pruefen(cfg, Api(cfg))
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
    api = Api(cfg)
    if "--pruefen" in argv:
        return 0 if pruefen(cfg, api) else 1
    trocken = "--trocken" in argv
    agent = Agent(cfg, api, log=lambda t: print("%s %s" % (_zeit(), t), flush=True), trocken=trocken,
                  stand_pfad=os.path.join(basis_verzeichnis(), "sync_stand.json"))
    print("Waage-Bruecke laeuft: Cloud %s, Waage %s:%s, Abfrage alle %s s%s (Strg+C beendet)" % (
        cfg["api_url"], cfg["ftp_host"], cfg["ftp_port"], cfg["poll_sekunden"], ", TROCKEN" if trocken else ""))
    if "--einmal" in argv:
        agent.schritt(erzwingen=True)
        return 0 if not agent.fehler else 1
    try:
        while True:
            agent.schritt()
            time.sleep(cfg["poll_sekunden"])
    except KeyboardInterrupt:
        pass
    return 0


if __name__ == "__main__":
    ergebnis = main()
    if ergebnis and getattr(sys, "frozen", False):
        input("Enter zum Beenden ...")
    sys.exit(ergebnis)
