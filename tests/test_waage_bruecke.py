"""Bruecke Kiosk -> Waage (Spec specs/kiosk-werbebilder-upload).

Geprueft wird der ECHTE HTTP-Weg der Bruecke (Server auf freiem Port, echte
Anfragen). Nur der FTP-Zugriff ist durch einen Speicher ersetzt, der
festhaelt, WAS auf der Waage landen wuerde und in WELCHEM Verzeichnis.

Ausfuehren:  python tests/test_waage_bruecke.py
"""
import http.client
import json
import os
import sys
import threading

HIER = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.abspath(os.path.join(HIER, "..", "tools", "waage-bruecke")))

import waage_bruecke as wb   # noqa: E402

JPEG = b"\xff\xd8\xff\xe0" + b"\x00" * 40
GIF = b"GIF89a" + b"\x00" * 40
PNG = b"\x89PNG\r\n\x1a\n" + b"\x00" * 40
ERLAUBT = "https://www.dorfladen-oberornau.de"


def pruefe(name, bedingung, hinweis=""):
    print(("OK   " if bedingung else "FEHL ") + name + ("" if bedingung else "  -> " + str(hinweis)))
    if not bedingung:
        sys.exit(1)


class Speicher:
    """Ersetzt FtpWaage; verzeichnis -> {name: bytes}."""
    dateien = {}
    aufrufe = []

    def __init__(self, cfg):
        pass

    def __enter__(self):
        return self

    def __exit__(self, *e):
        return False

    def pruefe(self, verz):
        return True

    def liste(self, verz):
        Speicher.aufrufe.append(("liste", verz))
        return [(n, len(d)) for n, d in Speicher.dateien.get(verz, {}).items()]

    def lies(self, verz, name):
        return Speicher.dateien[verz][name]

    def schreibe(self, verz, name, daten):
        Speicher.aufrufe.append(("schreibe", verz, name))
        Speicher.dateien.setdefault(verz, {})[name] = daten

    def loesche(self, verz, name):
        Speicher.aufrufe.append(("loesche", verz, name))
        del Speicher.dateien[verz][name]


def starte(max_bytes=1024):
    cfg = wb.lade_config(pfad="gibt-es-nicht.json", env={})
    cfg.update({"port": 0, "bind": "127.0.0.1", "max_bytes": max_bytes,
                "erlaubte_herkuenfte": [ERLAUBT]})
    srv = wb.baue_server(cfg, ftp_factory=Speicher)
    threading.Thread(target=srv.serve_forever, daemon=True).start()
    return srv, srv.server_address[1]


def anfrage(port, methode, pfad, body=None, herkunft=ERLAUBT, kopf=None):
    c = http.client.HTTPConnection("127.0.0.1", port, timeout=5)
    h = dict(kopf or {})
    if herkunft:
        h["Origin"] = herkunft
    c.request(methode, pfad, body=body, headers=h)
    r = c.getresponse()
    daten = r.read()
    antwort = (r.status, dict(r.getheaders()), daten)
    c.close()
    return antwort


def js(daten):
    return json.loads(daten.decode("utf-8")) if daten else {}


def main():
    srv, port = starte()
    voll = "bizerba/data/multimedia/advertising/fullscreen/default"
    dauer = "bizerba/data/multimedia/advertising/permanent/default"

    # Reine Hilfen
    pruefe("Dateikopf JPEG", wb.bildtyp(JPEG) == "jpg")
    pruefe("Dateikopf GIF", wb.bildtyp(GIF) == "gif")
    pruefe("PNG ist kein Werbebild", wb.bildtyp(PNG) is None)

    # TC-F9-01 PNG-Inhalt mit .jpg-Endung
    s, _, d = anfrage(port, "POST", "/bilder/vollbild?name=falsch.jpg", PNG)
    pruefe("TC-F9-01  PNG als .jpg wird abgelehnt (415)", s == 415, s)
    pruefe("TC-F9-01  und nichts wurde geschrieben", not Speicher.dateien)

    # Erfolg und Zielverzeichnis (F2: nur die Default-Verzeichnisse)
    s, _, d = anfrage(port, "POST", "/bilder/vollbild?name=Fruehling.jpg", JPEG)
    pruefe("Upload Vollbild gelingt", s == 200 and js(d)["name"] == "Fruehling.jpg", (s, d))
    s, _, d = anfrage(port, "POST", "/bilder/dauer?name=Banner.gif", GIF)
    pruefe("Upload Dauerwerbung gelingt", s == 200, (s, d))
    pruefe("TC-F2-01  Vollbild landet in fullscreen/default", "Fruehling.jpg" in Speicher.dateien[voll])
    pruefe("TC-F2-01  Dauer landet in permanent/default", "Banner.gif" in Speicher.dateien[dauer])

    # Endung folgt dem Typ
    s, _, d = anfrage(port, "POST", "/bilder/vollbild?name=foto.png", JPEG)
    pruefe("Endung folgt dem echten Typ", s == 200 and js(d)["name"] == "foto.jpg", (s, d))

    # TC-F9-04 Pfadanteile
    s, _, d = anfrage(port, "POST", "/bilder/vollbild?name=..%5C..%5Cx.jpg", JPEG)
    pruefe("TC-F9-04  Rueckwaertspfad wird zum Dateinamen", s == 200 and js(d)["name"] == "x.jpg", (s, d))
    s, _, d = anfrage(port, "POST", "/bilder/vollbild?name=a%2Fb%2Fc.gif", GIF)
    pruefe("TC-F9-04  Schraegstriche werden entfernt", s == 200 and js(d)["name"] == "c.gif", (s, d))
    s, _, d = anfrage(port, "POST", "/bilder/vollbild?name=Gr%C3%BC%C3%9Fe%20und%20Co.jpg", JPEG)
    pruefe("Umlaute und Leerzeichen werden bereinigt",
           s == 200 and js(d)["name"] == "Gruesse_und_Co.jpg", (s, d))
    pruefe("TC-F9-04  nichts ausserhalb der Verzeichnisse",
           set(Speicher.dateien) == {voll, dauer}, set(Speicher.dateien))

    # TC-F9-02 Groesse
    s, _, d = anfrage(port, "POST", "/bilder/vollbild?name=gross.jpg", JPEG + b"\x00" * 2000)
    pruefe("TC-F9-02  zu grosse Datei wird abgelehnt (413)", s == 413, s)
    pruefe("TC-F9-02  und nicht geschrieben", "gross.jpg" not in Speicher.dateien[voll])

    # TC-F9-05 unbekannte Art
    for art in ("1", "default", "..", "fullscreen"):
        s, _, _ = anfrage(port, "POST", "/bilder/%s?name=a.jpg" % art, JPEG)
        pruefe("TC-F9-05  Art %r ist unbekannt (404)" % art, s == 404, s)
        s, _, _ = anfrage(port, "GET", "/bilder/%s" % art)
        pruefe("TC-F9-05  Liste fuer %r ist 404" % art, s == 404, s)

    # Liste, sortiert
    s, _, d = anfrage(port, "GET", "/bilder/vollbild")
    namen = [b["name"] for b in js(d)["bilder"]]
    pruefe("Liste in Namensreihenfolge", namen == sorted(namen, key=str.lower), namen)
    pruefe("Liste nennt Verzeichnis und Grenze",
           js(d)["verzeichnis"] == voll and js(d)["max"] == 99, js(d))

    # Bild lesen
    s, k, d = anfrage(port, "GET", "/bilder/dauer/Banner.gif")
    pruefe("Bild lesen liefert GIF", s == 200 and d == GIF and k["Content-Type"] == "image/gif", (s, k))
    s, _, _ = anfrage(port, "GET", "/bilder/dauer/..%2F..%2Fx.gif")
    pruefe("Ungueltiger Name beim Lesen wird abgewiesen", s in (400, 404), s)

    # TC-F9-03 hundertstes Bild
    Speicher.dateien[dauer] = {"b%02d.jpg" % i: JPEG for i in range(99)}
    s, _, d = anfrage(port, "POST", "/bilder/dauer?name=neu.jpg", JPEG)
    pruefe("TC-F9-03  das 100. Bild wird abgelehnt (409)", s == 409, (s, d))
    s, _, d = anfrage(port, "POST", "/bilder/dauer?name=b05.jpg", JPEG)
    pruefe("TC-F9-03  Ersetzen eines vorhandenen Bildes bleibt moeglich", s == 200, (s, d))

    # Loeschen
    s, _, d = anfrage(port, "DELETE", "/bilder/dauer/b05.jpg")
    pruefe("Loeschen gelingt", s == 200 and "b05.jpg" not in Speicher.dateien[dauer], (s, d))
    s, _, _ = anfrage(port, "DELETE", "/bilder/dauer/..%2Fx.jpg")
    pruefe("Loeschen mit Pfadanteil wird abgewiesen", s in (400, 404), s)
    s, _, _ = anfrage(port, "DELETE", "/bilder/dauer/b05.txt")
    pruefe("Loeschen fremder Endung wird abgewiesen", s == 400, s)

    # TC-F11-01 CORS
    s, k, _ = anfrage(port, "OPTIONS", "/bilder/vollbild", kopf={
        "Access-Control-Request-Method": "POST",
        "Access-Control-Request-Private-Network": "true"})
    pruefe("TC-F11-01  Vorabfrage erlaubter Herkunft",
           s == 204 and k.get("Access-Control-Allow-Origin") == ERLAUBT
           and k.get("Access-Control-Allow-Private-Network") == "true", (s, k))
    s, k, _ = anfrage(port, "OPTIONS", "/bilder/vollbild", herkunft="https://boese.example")
    pruefe("TC-F11-01  fremde Herkunft bekommt keine Freigabe",
           s == 403 and "Access-Control-Allow-Origin" not in k, (s, k))
    vorher = len(Speicher.aufrufe)
    s, _, _ = anfrage(port, "POST", "/bilder/vollbild?name=x.jpg", JPEG, herkunft="https://boese.example",
                      kopf={"Content-Type": "text/plain"})
    pruefe("TC-F11-01  fremde Herkunft kann nicht hochladen (einfache Anfrage)",
           s == 403 and len(Speicher.aufrufe) == vorher, s)
    s, _, _ = anfrage(port, "GET", "/health", herkunft=None)
    pruefe("Anfragen ohne Herkunft (Tests, Browser-Adressleiste) gehen", s == 200, s)

    # Gesundheit
    s, _, d = anfrage(port, "GET", "/health")
    h = js(d)
    pruefe("Health meldet Waage und beide Arten", h["waage"] is True and set(h["arten"]) == {"vollbild", "dauer"}, h)
    pruefe("Health verraet keine Zugangsdaten", "pass" not in json.dumps(h).lower(), h)

    # Waage nicht erreichbar -> 502 mit Text, Dienst bleibt oben
    class Tot(Speicher):
        def __enter__(self):
            raise ConnectionRefusedError("Verbindung abgelehnt")
    srv.ftp_factory = Tot
    s, _, d = anfrage(port, "GET", "/bilder/vollbild")
    pruefe("Waage nicht erreichbar -> 502", s == 502 and "Waage" in js(d)["error"], (s, d))
    s, _, d = anfrage(port, "GET", "/health")
    pruefe("Health bei toter Waage: waage=false, Dienst antwortet", s == 200 and js(d)["waage"] is False, (s, d))
    srv.shutdown()

    # F10 Konfiguration
    cfg = wb.lade_config(pfad="gibt-es-nicht.json", env={
        "WAAGE_FTP_HOST": "10.0.0.5", "WAAGE_FTP_USER": "u", "WAAGE_FTP_PASS": "p"})
    pruefe("TC-F10-01  Zugang kommt aus der Umgebung",
           (cfg["ftp_host"], cfg["ftp_user"], cfg["ftp_pass"]) == ("10.0.0.5", "u", "p"))
    pruefe("TC-F10-01  Standard enthaelt keine Zugangsdaten",
           wb.STANDARD["ftp_user"] == "" and wb.STANDARD["ftp_pass"] == "" and wb.STANDARD["ftp_host"] == "")
    wurzel = os.path.abspath(os.path.join(HIER, ".."))
    with open(os.path.join(wurzel, ".gitignore"), encoding="utf-8") as f:
        pruefe("TC-F10-01  config.json ist ausgeschlossen", "tools/waage-bruecke/config.json" in f.read())

    # F13 Adressen: Waagen-IP, Rechner-Adresse, Ports
    cfg = wb.lade_config(pfad="gibt-es-nicht.json", env={
        "WAAGE_FTP_HOST": "192.168.1.50", "WAAGE_FTP_PORT": "2121", "WAAGE_BIND": "192.168.1.20", "WAAGE_PORT": "9000"})
    pruefe("TC-F13-01  Adressen und Ports kommen aus der Umgebung",
           (cfg["ftp_host"], cfg["ftp_port"], cfg["bind"], cfg["port"]) == ("192.168.1.50", 2121, "192.168.1.20", 9000), cfg)
    pruefe("TC-F13-01  gueltige Adressen werden angenommen", wb.pruefe_config(dict(cfg))["port"] == 9000)

    def abgelehnt(**kw):
        c = dict(cfg)
        c.update(kw)
        try:
            wb.pruefe_config(c)
        except ValueError as e:
            return str(e)
        return None
    pruefe("TC-F13-02  IP ueber 255 abgelehnt", abgelehnt(ftp_host="192.168.1.300") is not None)
    pruefe("TC-F13-02  leere Waagen-IP abgelehnt", abgelehnt(ftp_host="") is not None)
    pruefe("TC-F13-02  Leerzeichen/Sonderzeichen abgelehnt", abgelehnt(ftp_host="192.168 .1.2") is not None
           and abgelehnt(bind="a/b") is not None)
    pruefe("TC-F13-02  Port 0, 70000 und Text abgelehnt",
           all(abgelehnt(port=p) is not None for p in (0, 70000, "abc")) and abgelehnt(ftp_port=0) is not None)
    pruefe("TC-F13-02  Rechnername ist erlaubt", abgelehnt(ftp_host="waage-pc") is None)

    # F13 Einrichtungsassistent schreibt config.json, fragt bei Fehleingabe erneut
    import tempfile
    antworten = iter(["192.168.1.999", "192.168.1.50", "", "", "0", "9000", "bizuser-test", "pw-test"])
    meldungen = []
    with tempfile.TemporaryDirectory() as tmp:
        ziel = os.path.join(tmp, "config.json")
        wb.einrichten(pfad=ziel, eingabe=lambda _p: next(antworten), ausgabe=meldungen.append)
        with open(ziel, encoding="utf-8") as f:
            neu = json.load(f)
    pruefe("TC-F13-03  Assistent uebernimmt gueltige Eingaben, Standard bei leerer Eingabe",
           (neu["ftp_host"], neu["ftp_port"], neu["bind"], neu["port"]) == ("192.168.1.50", 21, "0.0.0.0", 9000), neu)
    pruefe("TC-F13-03  ungueltige Eingaben wurden mit Hinweis abgelehnt",
           sum(1 for m in meldungen if "ungueltig" in m) == 2, meldungen)

    # Der echte FTP-Weg: Pfade gelten ab dem Anmeldeverzeichnis. Fehlte das, gingen
    # Liste und Schreiben in derselben Verbindung ins Leere (550).
    class FalschesFtp:
        def __init__(self):
            self.aktuell = "/home"
            self.cwds = []
            self.gespeichert = []

        def connect(self, *a, **k):
            pass

        def login(self, *a, **k):
            pass

        def voidcmd(self, *a):
            pass

        def pwd(self):
            return "/home"

        def cwd(self, p):
            self.cwds.append(p)
            self.aktuell = p if p.startswith("/") else self.aktuell.rstrip("/") + "/" + p

        def mlsd(self, facts=None):
            return iter([])

        def storbinary(self, kommando, quelle):
            self.gespeichert.append((self.aktuell, kommando))

        def quit(self):
            pass
    echte = wb.ftplib.FTP
    wb.ftplib.FTP = FalschesFtp
    try:
        with wb.FtpWaage({"ftp_host": "x", "ftp_port": 21, "ftp_timeout": 1,
                          "ftp_user": "u", "ftp_pass": "p"}) as ftp:
            ftp.liste("a/b")
            ftp.schreibe("a/b", "x.jpg", JPEG)
            pruefe("Zwei Zugriffe in einer Verbindung landen im selben Verzeichnis",
                   ftp.ftp.gespeichert == [("/home/a/b", "STOR x.jpg")], ftp.ftp.gespeichert)
    finally:
        wb.ftplib.FTP = echte

    # F14 Installation: Autostart und Firewall werden angeboten; ohne "ja" passiert nichts
    befehle = []
    def fake(b):
        befehle.append(b)
        return 0, ""
    ausgaben = []
    wb.installieren({"port": 8765}, eingabe=lambda _p: "", ausgabe=ausgaben.append, ausfuehren=fake)
    flach = [" ".join(b) for b in befehle]
    pruefe("TC-F14-01  Autostart per Aufgabenplanung ohne Admin (ONLOGON, LIMITED)",
           any("schtasks" in b and "ONLOGON" in b and "LIMITED" in b for b in flach), flach)
    pruefe("TC-F14-01  Firewall nur lokales Subnetz auf dem Bruecken-Port",
           any("netsh" in b and "localport=8765" in b and "remoteip=LocalSubnet" in b for b in flach), flach)
    befehle.clear()
    wb.installieren({"port": 8765}, eingabe=lambda _p: "n", ausgabe=ausgaben.append, ausfuehren=fake)
    pruefe("TC-F14-02  Bei Nein wird nichts am System veraendert", befehle == [], befehle)
    ausgaben.clear()
    wb.installieren({"port": 8765}, eingabe=lambda _p: "j", ausgabe=ausgaben.append, ausfuehren=lambda b: (1, "Zugriff verweigert"))
    pruefe("TC-F14-03  Fehlschlag wird verstaendlich gemeldet statt abzubrechen",
           any("Zugriff verweigert" in a for a in ausgaben), ausgaben)

    # F15 Fehlendes "default" wird beim Hochladen angelegt, darueberliegende Ordner nie
    class BaumFtp:
        def __init__(self, ordner):
            self.ordner = set(ordner)
            self.dateien = {}
            self.pfad = "/"
            self.angelegt = []

        def connect(self, *a, **k):
            pass

        def login(self, *a, **k):
            pass

        def voidcmd(self, *a):
            pass

        def pwd(self):
            return "/"

        def cwd(self, p):
            ziel = "/" + p.strip("/") if p.startswith("/") else (self.pfad.rstrip("/") + "/" + p)
            ziel = "/" + "/".join(t for t in ziel.split("/") if t)
            if ziel != "/" and ziel not in self.ordner:
                raise wb.ftplib.error_perm("550 nicht gefunden")
            self.pfad = ziel

        def mkd(self, name):
            neu = self.pfad.rstrip("/") + "/" + name
            self.ordner.add(neu)
            self.angelegt.append(neu)

        def mlsd(self, facts=None):
            return iter([(n.rsplit("/", 1)[1], {"type": "file", "size": "3"})
                         for n in self.dateien if n.rsplit("/", 1)[0] == self.pfad])

        def storbinary(self, kommando, quelle):
            self.dateien[self.pfad.rstrip("/") + "/" + kommando.split(" ", 1)[1]] = quelle.read()

        def quit(self):
            pass
    cfg_f = {"ftp_host": "x", "ftp_port": 21, "ftp_timeout": 1, "ftp_user": "u", "ftp_pass": "p"}
    wurzel = "bizerba/data/multimedia/advertising"
    echte = wb.ftplib.FTP
    baum = BaumFtp(["/bizerba", "/bizerba/data", "/bizerba/data/multimedia", "/bizerba/data/multimedia/advertising",
                    "/bizerba/data/multimedia/advertising/fullscreen"])
    wb.ftplib.FTP = lambda: baum
    try:
        with wb.FtpWaage(cfg_f) as ftp:
            pruefe("TC-F15-01  Liste ohne vorhandenes default ist leer statt Fehler",
                   ftp.liste(wurzel + "/fullscreen/default") == [])
            pruefe("TC-F15-01  Pruefung gelingt, wenn nur der Elternordner existiert",
                   ftp.pruefe(wurzel + "/fullscreen/default") is True)
        with wb.FtpWaage(cfg_f) as ftp:
            ftp.schreibe(wurzel + "/fullscreen/default", "a.jpg", JPEG)
        pruefe("TC-F15-02  Upload legt genau 'default' an",
               baum.angelegt == ["/bizerba/data/multimedia/advertising/fullscreen/default"], baum.angelegt)
        baum.angelegt.clear()
        fehler_perm = False
        try:
            with wb.FtpWaage(cfg_f) as ftp:
                ftp.schreibe("falsch/data/multimedia/advertising/fullscreen/default", "a.jpg", JPEG)
        except wb.ftplib.error_perm:
            fehler_perm = True
        pruefe("TC-F15-03  Falsche Wurzel legt keine Ordner an und meldet Fehler",
               fehler_perm and baum.angelegt == [], baum.angelegt)
        with wb.FtpWaage(cfg_f) as ftp:
            baum.dateien["/bizerba/data/multimedia/advertising/fullscreen/direkt.jpg"] = JPEG
            pruefe("TC-F15-04  Bilder direkt im Elternordner werden gemeldet (haben Vorrang)",
                   [n for n, _ in ftp.direkt(wurzel + "/fullscreen/default")] == ["direkt.jpg"])
    finally:
        wb.ftplib.FTP = echte

    class H:
        def __init__(self, o, erlaubt):
            self.headers = {"Origin": o}
            self.cfg = {"erlaubte_herkuenfte": erlaubt}
    ok = lambda o: wb.Handler._herkunft_ok(H(o, ["https://alt.example"]))
    pruefe("TC-F15-05  Live und SWA-Vorschau sind auch bei alter config.json erlaubt",
           ok("https://www.dorfladen-oberornau.de")
           and ok("https://kind-pebble-072605b03-14.westeurope.7.azurestaticapps.net")
           and ok("https://alt.example"))
    pruefe("TC-F15-05  Fremde Herkunft bleibt abgelehnt",
           not ok("https://evil.example") and not ok("https://other-app-14.westeurope.7.azurestaticapps.net")
           and not ok("http://www.dorfladen-oberornau.de"))

    print("\nAlle Pruefungen bestanden.")


if __name__ == "__main__":
    main()
