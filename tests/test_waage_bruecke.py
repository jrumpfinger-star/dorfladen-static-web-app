"""Test der Waage-Bruecke als Agent (Spec kiosk-werbebilder-upload, F20-F24, F14, F15).

Ohne Netz und ohne echte Waage: Cloud-API und FTP sind Attrappen. Aufruf: python tests\\test_waage_bruecke.py
"""
import io
import json
import os
import sys
import tempfile
import urllib.error

HIER = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.abspath(os.path.join(HIER, "..", "tools", "waage-bruecke")))

import waage_bruecke as wb  # noqa: E402

JPEG = b"\xff\xd8\xff\xe0\x00\x10JFIF" + b"\x00" * 20
JPEG2 = b"\xff\xd8\xff\xe1\x00\x10Exif" + b"\x00" * 40
GIF = b"GIF89a" + b"\x00" * 20
PNG = b"\x89PNG\r\n\x1a\n" + b"\x00" * 20
CFG = {"ftp_host": "x", "ftp_port": 21, "ftp_user": "u", "ftp_pass": "p", "ftp_basis": "b", "ftp_timeout": 1,
       "verzeichnisse": wb.ARTEN, "max_bytes": 1024 * 1024, "api_url": "https://x.example", "cms_passwort": "",
       "poll_sekunden": 10}


def pruefe(name, bedingung, info=""):
    if not bedingung:
        print("FEHLER", name, info)
        sys.exit(1)
    print("OK  ", name)


class Wolke:
    """Attrappe der Cloud-API: Sollvorgabe, Download, Upload, Bericht."""

    def __init__(self):
        self.d = {"vollbild": {}, "dauer": {}}
        self.zaehler = 0
        self.berichte = []
        self.initialisiert = False
        self.kaputt = set()
        self.aus = False

    def setze(self, art, name, daten):
        self.zaehler += 1
        self.d[art][name] = (daten, "e%d" % self.zaehler)
        return "e%d" % self.zaehler

    def sync(self):
        if self.aus:
            raise OSError("keine Verbindung")
        arten = dict((a, [{"name": n, "groesse": len(v[0]), "etag": v[1]} for n, v in sorted(self.d[a].items())])
                     for a in self.d)
        v = "|".join("%s:%s:%s" % (a, n, e) for a in sorted(arten) for n, _, e in
                     [(x["name"], x["groesse"], x["etag"]) for x in arten[a]])
        return {"success": True, "version": v, "initialisiert": self.initialisiert, "arten": arten}

    def lade(self, art, name):
        if (art, name) in self.kaputt:
            return PNG
        return self.d[art][name][0]

    def lade_hoch(self, art, name, daten):
        return {"success": True, "name": name, "etag": self.setze(art, name, daten)}

    def bericht(self, b):
        self.berichte.append(json.loads(json.dumps(b)))
        if b.get("initialisiert"):
            self.initialisiert = True
        return {"success": True}


class WaageFtp:
    """Attrappe der Waage; Fabrik und Kontextmanager in einem, zaehlt Zugriffe."""

    def __init__(self, direkt=None):
        self.d = {"vollbild": {}, "dauer": {}}     # gueltige und fremde Dateien: name -> bytes
        self.fremd_direkt = direkt or {}
        self.oeffnungen = 0
        self.geschrieben, self.geloescht = [], []
        self.aus = False

    def __call__(self, cfg):
        return self

    def __enter__(self):
        if self.aus:
            raise OSError("Verbindung abgelehnt")
        self.oeffnungen += 1
        return self

    def __exit__(self, *e):
        return False

    def _art(self, verz):
        return "vollbild" if "fullscreen" in verz else "dauer"

    def liste(self, verz):
        return [(n, len(v)) for n, v in self.d[self._art(verz)].items()]

    def direkt(self, verz):
        return [(n, 1) for n in self.fremd_direkt.get(self._art(verz), [])]

    def lies(self, verz, name):
        return self.d[self._art(verz)][name]

    def schreibe(self, verz, name, daten):
        self.geschrieben.append((self._art(verz), name))
        self.d[self._art(verz)][name] = daten

    def loesche(self, verz, name):
        self.geloescht.append((self._art(verz), name))
        self.d[self._art(verz)].pop(name, None)


def agent(wolke, waage, trocken=False, stand_pfad=None, uhr=None, init=False):
    meldungen = []
    a = wb.Agent(CFG, wolke, waage, uhr=uhr or (lambda: 1000.0), log=meldungen.append, trocken=trocken, stand_pfad=stand_pfad)
    a.meldungen = meldungen
    if init:
        a.initialisiert = True   # Erstlauf schon erledigt: es wird angeglichen
    return a


def main():
    # ── F21 Erstlauf: Waage -> Cloud, nichts wird geloescht ──
    wolke, waage = Wolke(), WaageFtp()
    waage.d["vollbild"] = {"a.jpg": JPEG, "leer.jpg": b"", "x y.jpg": JPEG, "notiz.txt": b"hallo"}
    waage.d["dauer"] = {"d.gif": GIF, "kaputt.jpg": PNG}
    with tempfile.TemporaryDirectory() as tmp:
        stand = os.path.join(tmp, "sync_stand.json")
        ag = agent(wolke, waage, stand_pfad=stand)
        ag.schritt()
        pruefe("TC-F21-01  Erstlauf uebernimmt gueltige Waagenbilder in die Cloud",
               set(wolke.d["vollbild"]) == {"a.jpg"} and set(wolke.d["dauer"]) == {"d.gif"}, wolke.d)
        pruefe("TC-F21-01  Erstlauf loescht nichts und schreibt nichts auf die Waage",
               waage.geloescht == [] and waage.geschrieben == [], (waage.geloescht, waage.geschrieben))
        pruefe("TC-F21-01  Bericht meldet 'initialisiert'", wolke.berichte[-1]["initialisiert"] is True, wolke.berichte[-1])
        pruefe("TC-F21-01  nicht leer, aber kein Bild (PNG-Inhalt) wird nicht uebernommen", "kaputt.jpg" not in wolke.d["dauer"])
        pruefe("TC-F21-01  Zustand wird neben der exe gespeichert", os.path.exists(stand))

        # Folgelauf: Cloud ist Soll -> leer.jpg und kaputt.jpg (nicht in Cloud) fliegen raus, fremde bleiben
        ag.schritt()
        pruefe("TC-F22-01  Folgelauf loescht gueltig benannte Dateien, die in der Cloud fehlen",
               sorted(waage.geloescht) == [("dauer", "kaputt.jpg"), ("vollbild", "leer.jpg")], waage.geloescht)
        pruefe("TC-F22-01  fremde Dateien (Leerzeichen, .txt) bleiben unangetastet",
               "x y.jpg" in waage.d["vollbild"] and "notiz.txt" in waage.d["vollbild"])
        pruefe("TC-F21-01  uebernommene Bilder werden nicht erneut auf die Waage geschrieben", waage.geschrieben == [], waage.geschrieben)

        # Neustart: Zustand bleibt (kein erneuter Erstlauf, keine erneute Uebertragung)
        ag2 = agent(wolke, waage, stand_pfad=stand)
        pruefe("TC-F21-01  Neustart liest 'initialisiert' und Stand", ag2.initialisiert is True and ag2.stand["vollbild"].get("a.jpg"))

    # ── F21 Sicherheit: 'initialisiert' in der Cloud (z. B. von einer anderen Installation) ersetzt den Erstlauf NICHT ──
    wolke, waage = Wolke(), WaageFtp()
    wolke.initialisiert = True
    waage.d["vollbild"] = {"wichtig.jpg": JPEG}
    ag = agent(wolke, waage)
    ag.schritt()
    pruefe("TC-F21-02  frische Bruecke uebernimmt trotz 'initialisiert' in der Cloud, loescht nichts",
           "wichtig.jpg" in wolke.d["vollbild"] and waage.geloescht == [] and "wichtig.jpg" in waage.d["vollbild"], (wolke.d, waage.geloescht))

    # ── F22 Abgleich ──
    wolke, waage = Wolke(), WaageFtp()
    wolke.initialisiert = True
    wolke.setze("vollbild", "neu.gif", GIF)
    wolke.setze("vollbild", "a.jpg", JPEG)
    waage.d["vollbild"] = {"alt.jpg": JPEG, "x y.jpg": JPEG}
    ag = agent(wolke, waage, init=True)
    ag.schritt()
    pruefe("TC-F22-01  fehlende Bilder werden hochgeladen", sorted(waage.geschrieben) == [("vollbild", "a.jpg"), ("vollbild", "neu.gif")], waage.geschrieben)
    pruefe("TC-F22-01  gueltiger Name, nicht in Cloud -> geloescht", waage.geloescht == [("vollbild", "alt.jpg")], waage.geloescht)
    pruefe("TC-F22-01  fremde Datei bleibt", "x y.jpg" in waage.d["vollbild"])
    b = wolke.berichte[-1]
    pruefe("TC-F22-01  Bericht: ist/stand passen zur Cloud (fremde Datei zaehlt nicht)",
           sorted(b["ist"]["vollbild"]) == ["a.jpg", "neu.gif"]
           and set(b["stand"]["vollbild"]) == {"a.jpg", "neu.gif"} and b["ok"] is True, b)
    waage.geschrieben.clear()
    wolke.setze("vollbild", "a.jpg", JPEG2)    # Bild in der Cloud ersetzt (neue etag)
    ag.schritt()
    pruefe("TC-F22-01  neue etag ersetzt das Bild auf der Waage", waage.geschrieben == [("vollbild", "a.jpg")] and waage.d["vollbild"]["a.jpg"] == JPEG2, waage.geschrieben)
    waage.geschrieben.clear()
    del wolke.d["vollbild"]["neu.gif"]
    waage.geloescht.clear()
    ag.schritt()
    pruefe("TC-F22-01  in der Cloud geloeschtes Bild verschwindet von der Waage", ("vollbild", "neu.gif") in waage.geloescht and waage.geschrieben == [], (waage.geloescht, waage.geschrieben))

    # TC-F22-02: Waage rechnet Datei um -> kein erneuter Upload (Vergleich ueber etag, nicht Groesse)
    waage.d["vollbild"]["a.jpg"] = JPEG2 + b"umgerechnet"
    waage.geschrieben.clear()
    ag.schritt(erzwingen=True)
    pruefe("TC-F22-02  von der Waage veraenderte Datei loest keinen Dauer-Upload aus", waage.geschrieben == [], waage.geschrieben)

    # TC-F22-03: defekter Download wird nicht geschrieben, Rest laeuft weiter
    wolke.setze("dauer", "gut.gif", GIF)
    wolke.setze("dauer", "defekt.jpg", JPEG)
    wolke.kaputt.add(("dauer", "defekt.jpg"))
    ag.schritt()
    pruefe("TC-F22-03  defekte Datei nicht geschrieben, gute schon",
           ("dauer", "gut.gif") in waage.geschrieben and ("dauer", "defekt.jpg") not in waage.geschrieben, waage.geschrieben)
    pruefe("TC-F22-03  Fehler wird gemeldet", wolke.berichte[-1]["ok"] is False and "defekt.jpg" in wolke.berichte[-1]["fehler"], wolke.berichte[-1])

    # Trocken: nichts schreiben, nichts melden, keinen Zustand speichern
    wolke, waage = Wolke(), WaageFtp()
    wolke.initialisiert = True
    wolke.setze("vollbild", "a.jpg", JPEG)
    waage.d["vollbild"] = {"weg.jpg": JPEG}
    with tempfile.TemporaryDirectory() as tmp:
        stand = os.path.join(tmp, "s.json")
        ag = agent(wolke, waage, trocken=True, stand_pfad=stand, init=True)
        ag.schritt()
        pruefe("TC-F22-03  --trocken schreibt, loescht und meldet nichts, speichert keinen Stand",
               waage.geschrieben == [] and waage.geloescht == [] and wolke.berichte == [] and not os.path.exists(stand))
        pruefe("TC-F22-03  --trocken nennt den Plan",
               any("hochladen" in m and "a.jpg" in m for m in ag.meldungen) and any("loeschen" in m and "weg.jpg" in m for m in ag.meldungen), ag.meldungen)

    # ── F20 Rhythmus ──
    wolke, waage = Wolke(), WaageFtp()
    wolke.initialisiert = True
    wolke.setze("vollbild", "a.jpg", JPEG)
    zeit = [0.0]
    ag = agent(wolke, waage, uhr=lambda: zeit[0], init=True)
    ag.schritt()
    pruefe("TC-F20-01  erster Durchlauf gleicht ab", waage.oeffnungen == 1 and len(wolke.berichte) == 1)
    for t in (10, 20):
        zeit[0] = t
        ag.schritt()
    pruefe("TC-F20-01  ohne Aenderung kein FTP und kein Bericht innerhalb von 30 s", waage.oeffnungen == 1 and len(wolke.berichte) == 1)
    zeit[0] = 31
    ag.schritt()
    pruefe("TC-F20-01  nach 30 s Lebenszeichen ohne FTP", waage.oeffnungen == 1 and len(wolke.berichte) == 2)
    zeit[0] = 301
    ag.schritt()
    pruefe("TC-F20-01  spaetestens nach 5 Minuten wird die Waage wieder angesehen", waage.oeffnungen == 2)
    wolke.setze("vollbild", "b.jpg", JPEG)
    zeit[0] = 311
    ag.schritt()
    pruefe("TC-F20-01  Aenderung in der Cloud loest sofort den Abgleich aus", waage.oeffnungen == 3 and ("vollbild", "b.jpg") in waage.geschrieben)

    # Cloud nicht erreichbar -> kein Absturz, kein Abgleich; Waage nicht erreichbar -> Fehler im Bericht, spaeter Wiederholung
    wolke.aus = True
    pruefe("Cloud aus: schritt() meldet und laeuft weiter", ag.schritt() is False and any("Cloud nicht erreichbar" in m for m in ag.meldungen))
    wolke.aus = False
    waage.aus = True
    wolke.setze("dauer", "n.gif", GIF)
    zeit[0] = 320
    ag.schritt()
    pruefe("Waage aus: Fehler wird gemeldet", wolke.berichte[-1]["ok"] is False and "Waage nicht erreichbar" in wolke.berichte[-1]["fehler"], wolke.berichte[-1])
    waage.aus = False
    zeit[0] = 330
    ag.schritt()
    pruefe("Waage aus: kein Abgleich vor Ablauf der Wartezeit", ("dauer", "n.gif") not in waage.geschrieben)
    zeit[0] = 320 + wb.FEHLER_WIEDERHOLUNG + 1
    ag.schritt()
    pruefe("Waage wieder da: Wiederholung gelingt und Fehler ist weg", ("dauer", "n.gif") in waage.geschrieben and wolke.berichte[-1]["ok"] is True, wolke.berichte[-1])

    # Schutz: leere Cloud-Liste leert die Waage erst nach mehreren Bestaetigungen
    wolke, waage = Wolke(), WaageFtp()
    wolke.initialisiert = True
    waage.d["vollbild"] = {"a.jpg": JPEG, "b.jpg": JPEG}
    zeit = [0.0]
    ag = agent(wolke, waage, uhr=lambda: zeit[0], init=True)
    for i in range(wb.LEER_BESTAETIGUNG - 1):
        zeit[0] = i * 10
        ag.schritt()
    pruefe("Leer-Schutz: bei leerer Cloud wird zunaechst nichts geloescht", waage.geloescht == [], waage.geloescht)
    zeit[0] = 50
    ag.schritt()
    pruefe("Leer-Schutz: nach mehreren Bestaetigungen wird geleert", sorted(waage.geloescht) == [("vollbild", "a.jpg"), ("vollbild", "b.jpg")], waage.geloescht)

    # Vorrang-Hinweis: Bilder direkt im Ordner werden gemeldet
    wolke, waage = Wolke(), WaageFtp(direkt={"vollbild": ["x.jpg", "y.jpg", "z.txt"]})
    wolke.initialisiert = True
    agent(wolke, waage).schritt()
    pruefe("TC-F15-04  Bericht nennt Bilder direkt im Ordner", wolke.berichte[-1]["direkt"] == {"vollbild": 2, "dauer": 0}, wolke.berichte[-1])

    # ── plane() rein ──
    p = wb.plane({"vollbild": [{"name": "a.jpg", "groesse": 1, "etag": "e1"}], "dauer": []},
                 {"vollbild": {"a.jpg": 5, "b.jpg": 5}, "dauer": {}}, {"vollbild": {"a.jpg": "e1"}}, True)
    pruefe("plane: gleiche etag und vorhanden -> nichts hochladen, Ueberzaehliges loeschen",
           p == {"uebernehmen": [], "hoch": [], "loeschen": [("vollbild", "b.jpg")]}, p)

    # ── F23 Anmeldung ──
    class Antwort:
        def __init__(self, status, daten):
            self.status, self._d = status, daten

        def read(self):
            return self._d

        def __enter__(self):
            return self

        def __exit__(self, *e):
            return False

    aufrufe = []

    def oeffne_mit(pfaltig):
        def oeffne(req, timeout=0):
            aufrufe.append((req.get_method(), req.full_url, req.headers.get("X-cms-auth")))
            url = req.full_url
            if url.endswith("/api/cms-auth"):
                if json.loads(req.data.decode())["password"] == "richtig":
                    return Antwort(200, b'{"token": "TOK"}')
                raise urllib.error.HTTPError(url, 401, "x", {}, io.BytesIO(b'{"error": "invalid password"}'))
            if req.headers.get("X-cms-auth") != "TOK" and pfaltig:
                raise urllib.error.HTTPError(url, 401, "x", {}, io.BytesIO(b'{"error": "unauthorized"}'))
            return Antwort(200, b'{"success": true, "version": "v", "initialisiert": false, "arten": {"vollbild": [], "dauer": []}}')
        return oeffne

    api = wb.Api(dict(CFG, cms_passwort="richtig"), oeffne=oeffne_mit(True))
    api.sync()
    pruefe("TC-F23-01  mit Passwort: Anmeldung, dann Aufruf mit Token", aufrufe[0][1].endswith("/api/cms-auth") and aufrufe[-1][2] == "TOK", aufrufe)
    aufrufe.clear()
    api.token = "ALT"
    api.sync()
    pruefe("TC-F23-01  bei 401 wird neu angemeldet und wiederholt",
           [a[1].rsplit("/", 1)[-1] for a in aufrufe] == ["waage-werbebilder?bruecke=sync", "cms-auth", "waage-werbebilder?bruecke=sync"]
           and aufrufe[-1][2] == "TOK", aufrufe)
    aufrufe.clear()
    api = wb.Api(dict(CFG, cms_passwort=""), oeffne=oeffne_mit(False))
    api.sync()
    pruefe("TC-F23-01  ohne Passwort und ohne Pflicht: kein Token, keine Anmeldung", len(aufrufe) == 1 and aufrufe[0][2] is None, aufrufe)
    falsch = wb.Api(dict(CFG, cms_passwort="falsch"), oeffne=oeffne_mit(True))
    try:
        falsch.sync()
        gut = False
    except wb.ApiFehler as e:
        gut = e.status == 401 and "Passwort" in e.text
    pruefe("TC-F23-01  falsches Passwort -> verstaendliche Meldung", gut)

    # ── F24 Einrichtung ──
    antworten = iter(["192.168.1.999", "192.168.1.134", "", "bizuser-test", "pw-test", "", "pass-test"])
    meldungen = []
    with tempfile.TemporaryDirectory() as tmp:
        ziel = os.path.join(tmp, "config.json")
        wb.einrichten(pfad=ziel, eingabe=lambda _p: next(antworten), ausgabe=meldungen.append)
        with open(ziel, encoding="utf-8") as f:
            neu = json.load(f)
    pruefe("TC-F24-01  Assistent uebernimmt Waage, FTP-Zugang, Vorgabe-API und Passwort",
           (neu["ftp_host"], neu["ftp_port"], neu["ftp_user"], neu["api_url"], neu["cms_passwort"])
           == ("192.168.1.134", 21, "bizuser-test", "https://www.dorfladen-oberornau.de", "pass-test"), neu)
    pruefe("TC-F24-01  ungueltige IP wurde abgelehnt", sum(1 for m in meldungen if "ungueltig" in m) == 1, meldungen)
    fragen = []
    wb.installieren(eingabe=lambda p: (fragen.append(p), "n")[1], ausgabe=lambda m: None, ausfuehren=lambda b: (0, ""), ist_admin=True)
    pruefe("TC-F24-01  keine Firewall-Frage, nur Autostart", len(fragen) == 1 and "automatisch" in fragen[0] and "Firewall" not in fragen[0], fragen)

    def abgelehnt(**kw):
        c = dict(CFG, **kw)
        try:
            wb.pruefe_config(c)
        except ValueError as e:
            return str(e)
        return None
    pruefe("TC-F24-01  Konfiguration: IP > 255, Port 0, API ohne https, Takt 1 abgelehnt",
           all(abgelehnt(**kw) for kw in ({"ftp_host": "192.168.1.300"}, {"ftp_port": 0}, {"api_url": "ftp://x"},
                                          {"api_url": "www.x.de"}, {"poll_sekunden": 1})))
    pruefe("TC-F24-01  Rechnername und Standardwerte sind gueltig", abgelehnt(ftp_host="waage-pc") is None and abgelehnt() is None)

    # Autostart (F14, F30): beim Hochfahren als SYSTEM, versteckt, Neustart bei Fehler
    befehle = []
    ok = wb.installieren(eingabe=lambda _p: "", ausgabe=lambda m: None, ist_admin=True,
                         ausfuehren=lambda b: (befehle.append(" ".join(b)), (0, ""))[1])
    pruefe("TC-F30-02  Admin: Aufgabe per schtasks /Create /XML angelegt und sofort gestartet",
           ok and any("schtasks" in b and "/Create" in b and "/XML" in b for b in befehle)
           and any("/Run" in b for b in befehle), befehle)
    befehle.clear()
    ok = wb.installieren(eingabe=lambda _p: "", ausgabe=lambda m: None, ist_admin=False,
                         ausfuehren=lambda b: (befehle.append(" ".join(b)), (0, ""))[1])
    pruefe("TC-F30-02  ohne Admin: einmalige erhoehte Rueckfrage (RunAs), kein direktes schtasks",
           ok and len(befehle) == 1 and "RunAs" in befehle[0] and "--autostart-anlegen" in befehle[0], befehle)
    xml = wb.aufgaben_xml("C:\\Waage & Co\\Waage-Bruecke.exe", "--x", "C:\\Waage & Co")
    for teil in ("<BootTrigger>", "S-1-5-18", "<Hidden>true</Hidden>", "<ExecutionTimeLimit>PT0S</ExecutionTimeLimit>",
                 "<RestartOnFailure>", "IgnoreNew", "<StartWhenAvailable>true", "Waage &amp; Co"):
        pruefe("TC-F30-01  Aufgaben-XML enthaelt " + teil, teil in xml, xml)
    pruefe("TC-F30-01  keine Anmeldung noetig: kein LogonTrigger", "LogonTrigger" not in xml)
    import xml.etree.ElementTree as ET
    ET.fromstring(xml.split("?>", 1)[1])
    pruefe("TC-F30-01  XML ist wohlgeformt", True)
    befehle.clear()
    wb.installieren(eingabe=lambda _p: "n", ausgabe=lambda m: None, ausfuehren=lambda b: (befehle.append(b), (0, ""))[1])
    pruefe("TC-F14-02  Bei Nein wird nichts am System veraendert", befehle == [])
    ausgaben = []
    ok = wb.installieren(eingabe=lambda _p: "j", ausgabe=ausgaben.append, ist_admin=True,
                         ausfuehren=lambda b: (1, "Zugriff verweigert"))
    pruefe("TC-F14-03  Fehlschlag wird verstaendlich gemeldet statt abzubrechen",
           (not ok) and any("Zugriff verweigert" in a for a in ausgaben), ausgaben)
    ausgaben = []
    wb.installieren(eingabe=lambda _p: "j", ausgabe=ausgaben.append, ist_admin=False, ausfuehren=lambda b: (1223, ""))
    pruefe("TC-F30-02  abgelehnte Admin-Rueckfrage wird gemeldet", any("1223" in a for a in ausgaben), ausgaben)

    # Protokoll und Einzelinstanz (F30)
    with tempfile.TemporaryDirectory() as tmp:
        lg = wb.logdatei_einrichten(tmp)
        wb.ausgeben("Testzeile")
        for h in lg.handlers:
            h.flush()
        with open(os.path.join(tmp, wb.LOGDATEI), encoding="utf-8") as f:
            zeile = f.read()
        pruefe("TC-F30-03  Protokollzeile traegt Datum und Uhrzeit",
               bool(__import__("re").match(r"\d{4}-\d\d-\d\d \d\d:\d\d:\d\d Testzeile", zeile)), zeile)
        pruefe("TC-F30-03  Protokoll rotiert (512 KB, 3 Sicherungen)",
               lg.handlers[0].maxBytes == 512 * 1024 and lg.handlers[0].backupCount == 3)
        for h in lg.handlers:
            h.close()
        lg.handlers = []
        wb._logger = None
    stdout_alt = sys.stdout
    sys.stdout = None
    try:
        wb.ausgeben("ohne Konsole")
        pruefe("TC-F30-03  Ausgabe ohne Konsole (stdout None) wirft nicht", True)
    finally:
        sys.stdout = stdout_alt
    if os.name == "nt":
        pruefe("TC-F30-04  erste Instanz darf laufen", wb.einzige_instanz())
        import subprocess
        r = subprocess.run([sys.executable, "-c",
                            "import sys; sys.path.insert(0, %r); import waage_bruecke as w; sys.exit(0 if w.einzige_instanz() else 3)"
                            % os.path.dirname(os.path.abspath(wb.__file__))])
        pruefe("TC-F30-04  zweite Instanz wird abgelehnt", r.returncode == 3, r.returncode)

    # ── Diagnose ──
    ausg = []
    ok = wb.pruefen(CFG, wb.Api(CFG, oeffne=oeffne_mit(False)), ftp_fabrik=WaageFtp(), ausgabe=ausg.append)
    pruefe("pruefen: Cloud und Waage in Ordnung -> True, mit Anzahl je Art", ok and any("Waage erreichbar" in a for a in ausg), ausg)
    tot = WaageFtp()
    tot.aus = True
    ausg = []
    ok = wb.pruefen(CFG, wb.Api(CFG, oeffne=oeffne_mit(False)), ftp_fabrik=tot, ausgabe=ausg.append)
    pruefe("pruefen: Waage aus -> False mit klarer Meldung", (not ok) and any("Waage nicht erreichbar" in a for a in ausg), ausg)

    # ── FTP-Klasse gegen einen Verzeichnisbaum (F15) ──
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
            pruefe("TC-F15-01  Liste ohne vorhandenes default ist leer statt Fehler", ftp.liste(wurzel + "/fullscreen/default") == [])
            pruefe("TC-F15-01  Pruefung gelingt, wenn nur der Elternordner existiert", ftp.pruefe(wurzel + "/fullscreen/default") is True)
        with wb.FtpWaage(cfg_f) as ftp:
            ftp.schreibe(wurzel + "/fullscreen/default", "a.jpg", JPEG)
            pruefe("Zwei Zugriffe in einer Verbindung landen im selben Verzeichnis",
                   [n for n, _ in ftp.liste(wurzel + "/fullscreen/default")] == ["a.jpg"])
        pruefe("TC-F15-02  Upload legt genau 'default' an", baum.angelegt == ["/bizerba/data/multimedia/advertising/fullscreen/default"], baum.angelegt)
        baum.angelegt.clear()
        fehler_perm = False
        try:
            with wb.FtpWaage(cfg_f) as ftp:
                ftp.schreibe("falsch/data/multimedia/advertising/fullscreen/default", "a.jpg", JPEG)
        except wb.ftplib.error_perm:
            fehler_perm = True
        pruefe("TC-F15-03  Falsche Wurzel legt keine Ordner an und meldet Fehler", fehler_perm and baum.angelegt == [], baum.angelegt)
        with wb.FtpWaage(cfg_f) as ftp:
            baum.dateien["/bizerba/data/multimedia/advertising/fullscreen/direkt.jpg"] = JPEG
            pruefe("TC-F15-04  Bilder direkt im Elternordner werden erkannt (haben Vorrang)",
                   [n for n, _ in ftp.direkt(wurzel + "/fullscreen/default")] == ["direkt.jpg"])
    finally:
        wb.ftplib.FTP = echte

    print("\nAlle Pruefungen bestanden.")


if __name__ == "__main__":
    main()
