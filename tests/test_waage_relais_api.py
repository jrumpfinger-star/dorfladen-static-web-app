"""Test der Waage-Werbebilder-API-Logik (Spec kiosk-werbebilder-upload, F17/F18).

Ohne Netz: Speicher und Tabelle sind Attrappen. Aufruf: python tests\\test_waage_relais_api.py
"""
import json
import os
import sys

HIER = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.abspath(os.path.join(HIER, "..", "api")))

from shared import waage as w  # noqa: E402

JPEG = b"\xff\xd8\xff\xe0\x00\x10JFIF" + b"\x00" * 20
GIF = b"GIF89a" + b"\x00" * 20
PNG = b"\x89PNG\r\n\x1a\n" + b"\x00" * 20


class FakeSpeicher:
    def __init__(self):
        self.d = {"vollbild": {}, "dauer": {}}
        self.zaehler = 0

    def liste(self, art):
        return [{"name": n, "groesse": len(v[0]), "etag": v[1]} for n, v in self.d[art].items()]

    def lies(self, art, name):
        return self.d[art][name][0] if name in self.d[art] else None

    def schreibe(self, art, name, daten):
        self.zaehler += 1
        self.d[art][name] = (daten, "e%d" % self.zaehler)
        return {"etag": "e%d" % self.zaehler}

    def loesche(self, art, name):
        return self.d[art].pop(name, None) is not None


class FakeTabelle:
    def __init__(self):
        self.bericht = None

    def lies(self):
        return json.loads(json.dumps(self.bericht)) if self.bericht else None

    def schreibe(self, b):
        self.bericht = json.loads(json.dumps(b))


def pruefe(name, bedingung, info=""):
    if not bedingung:
        print("FEHLER", name, info)
        sys.exit(1)
    print("OK  ", name)


def rufe(methode, params, body=None, sp=None, tb=None, jetzt=1000.0):
    status, typ, daten = w.verarbeite(methode, params, body, sp, tb, jetzt)
    if typ.startswith("application/json"):
        return status, json.loads(daten.decode("utf-8"))
    return status, daten


def main():
    sp, tb = FakeSpeicher(), FakeTabelle()

    # F17 Hochladen und Liste
    s, d = rufe("POST", {"art": "vollbild", "name": "b_zwei.jpg"}, JPEG, sp, tb)
    pruefe("TC-F17-01  Upload eines JPEG gelingt", s == 200 and d["success"] and d["name"] == "b_zwei.jpg", d)
    rufe("POST", {"art": "vollbild", "name": "a_eins.gif"}, GIF, sp, tb)
    s, d = rufe("GET", {"art": "vollbild"}, None, sp, tb)
    pruefe("TC-F17-01  Liste ist nach Namen sortiert", [b["name"] for b in d["bilder"]] == ["a_eins.gif", "b_zwei.jpg"], d)
    s, daten = rufe("GET", {"art": "vollbild", "name": "b_zwei.jpg"}, None, sp, tb)
    pruefe("TC-F17-01  Bild laesst sich abrufen", s == 200 and daten == JPEG)

    # F17 Pruefungen
    s, d = rufe("POST", {"art": "vollbild", "name": "x.jpg"}, PNG, sp, tb)
    pruefe("TC-F17-02  PNG-Inhalt mit .jpg-Endung -> 415", s == 415, d)
    s, d = rufe("POST", {"art": "vollbild", "name": "x.jpg"}, JPEG + b"\x00" * w.MAX_BYTES, sp, tb)
    pruefe("TC-F17-02  ueber der Groessengrenze -> 413", s == 413, d)
    s, d = rufe("POST", {"art": "vollbild", "name": "x.jpg"}, b"", sp, tb)
    pruefe("TC-F17-02  leere Datei -> 400", s == 400, d)
    s, d = rufe("POST", {"art": "1", "name": "x.jpg"}, JPEG, sp, tb)
    pruefe("TC-F17-02  unbekannte Art (Monatsnummer) -> 404", s == 404, d)
    s, d = rufe("POST", {"art": "default", "name": "x.jpg"}, JPEG, sp, tb)
    pruefe("TC-F17-02  unbekannte Art 'default' -> 404", s == 404, d)
    s, d = rufe("POST", {"art": "vollbild", "name": "..\\..\\x/y.gif"}, JPEG, sp, tb)
    pruefe("TC-F17-02  Pfadanteile werden entfernt, Endung folgt dem Typ", s == 200 and d["name"] == "y.jpg", d)
    s, d = rufe("POST", {"art": "vollbild", "name": "Käse Ärger ß.jpg"}, JPEG, sp, tb)
    pruefe("TC-F17-02  Umlaute werden umgeschrieben", s == 200 and d["name"] == "Kaese_Aerger_ss.jpg", d)
    s, d = rufe("GET", {"art": "vollbild", "name": "../geheim.jpg"}, None, sp, tb)
    pruefe("TC-F17-02  Abruf mit Pfadanteilen -> 400", s == 400, d)

    # 99er-Grenze
    sp2 = FakeSpeicher()
    for i in range(99):
        sp2.schreibe("dauer", "b%02d.jpg" % i, JPEG)
    s, d = rufe("POST", {"art": "dauer", "name": "neu.jpg"}, JPEG, sp2, tb)
    pruefe("TC-F17-02  100. Bild -> 409", s == 409, d)
    s, d = rufe("POST", {"art": "dauer", "name": "b00.jpg"}, GIF, sp2, tb)
    pruefe("TC-F17-02  anderes Format waere ein neuer Name (b00.gif) -> bei 99 Bildern 409", s == 409, d)
    s, d = rufe("POST", {"art": "dauer", "name": "b00.jpg"}, JPEG, sp2, tb)
    pruefe("TC-F17-02  gleiches Format ersetzt vorhandenes Bild", s == 200 and d["name"] == "b00.jpg", d)

    # F17 Loeschen
    s, d = rufe("DELETE", {"art": "vollbild", "name": "b_zwei.jpg"}, None, sp, tb)
    pruefe("TC-F17-03  DELETE entfernt das Bild", s == 200 and "b_zwei.jpg" not in sp.d["vollbild"], d)
    s, d = rufe("DELETE", {"art": "vollbild", "name": "b_zwei.jpg"}, None, sp, tb)
    pruefe("TC-F17-03  unbekanntes Bild -> 404", s == 404, d)

    # F18 Sollvorgabe fuer die Bruecke
    s, a = rufe("GET", {"bruecke": "sync"}, None, sp, tb)
    pruefe("TC-F18-01  sync liefert Soll mit etag", s == 200 and a["arten"]["vollbild"][0]["etag"] and a["initialisiert"] is False, a)
    rufe("POST", {"art": "dauer", "name": "n.gif"}, GIF, sp, tb)
    s, b = rufe("GET", {"bruecke": "sync"}, None, sp, tb)
    pruefe("TC-F18-01  version aendert sich bei Aenderung", a["version"] != b["version"])
    s, c = rufe("GET", {"bruecke": "sync"}, None, sp, tb)
    pruefe("TC-F18-01  version bleibt ohne Aenderung gleich", b["version"] == c["version"])
    sp.schreibe("dauer", "n.gif", GIF)
    s, e = rufe("GET", {"bruecke": "sync"}, None, sp, tb)
    pruefe("TC-F18-01  version aendert sich auch beim Ersetzen mit gleichem Inhalt (neue eTag)", e["version"] != c["version"])

    # F18 Bericht und Status
    s, d = rufe("GET", {"art": "vollbild"}, None, sp, tb, jetzt=2000.0)
    pruefe("TC-F18-01  ohne Bericht: Bruecke unbekannt/offline, Bilder wartend",
           d["bruecke"]["bekannt"] is False and d["bruecke"]["online"] is False
           and all(b["status"] == "wartet" for b in d["bilder"]), d)
    etags = dict((b["name"], b["etag"]) for b in d["bilder"])
    bericht = {"ok": True, "fehler": "", "initialisiert": True,
               "ist": {"vollbild": ["a_eins.gif"], "dauer": []},
               "stand": {"vollbild": {"a_eins.gif": etags["a_eins.gif"]}, "dauer": {}}}
    s, d = rufe("POST", {"bruecke": "bericht"}, json.dumps(bericht).encode(), sp, tb, jetzt=2000.0)
    pruefe("TC-F18-01  Bericht wird gespeichert", s == 200 and tb.bericht["zeit"] == 2000.0, d)
    s, d = rufe("GET", {"art": "vollbild"}, None, sp, tb, jetzt=2030.0)
    st = dict((b["name"], b["status"]) for b in d["bilder"])
    pruefe("TC-F18-02  nur das uebertragene Bild ist 'auf_waage'", st["a_eins.gif"] == "auf_waage" and st["y.jpg"] == "wartet", st)
    pruefe("TC-F19-01  Bericht frisch -> online", d["bruecke"]["online"] is True and d["bruecke"]["vor_s"] == 30, d["bruecke"])
    s, d = rufe("GET", {"art": "vollbild"}, None, sp, tb, jetzt=2000.0 + w.ONLINE_SEKUNDEN + 1)
    pruefe("TC-F19-01  Bericht aelter als 90 s -> offline, Zeitpunkt bleibt", d["bruecke"]["online"] is False and d["bruecke"]["zeit"] == 2000.0, d["bruecke"])
    # geaendertes Bild auf Cloud-Seite -> wartet wieder
    sp.schreibe("vollbild", "a_eins.gif", GIF)
    s, d = rufe("GET", {"art": "vollbild"}, None, sp, tb, jetzt=2030.0)
    pruefe("TC-F18-02  geaenderte eTag -> wieder 'wartet'", [b["status"] for b in d["bilder"] if b["name"] == "a_eins.gif"] == ["wartet"], d)

    # initialisiert bleibt gesetzt, auch wenn ein spaeterer Bericht es nicht mehr nennt
    rufe("POST", {"bruecke": "bericht"}, json.dumps({"ok": True, "ist": {}, "stand": {}}).encode(), sp, tb, jetzt=2100.0)
    s, a = rufe("GET", {"bruecke": "sync"}, None, sp, tb)
    pruefe("TC-F18-01  'initialisiert' bleibt dauerhaft gesetzt", a["initialisiert"] is True, a)

    # Vorrang-Hinweis: Bilder direkt im Ordner der Art stehen in der Liste als 'direkt'
    rufe("POST", {"bruecke": "bericht"}, json.dumps({"ok": True, "ist": {}, "stand": {}, "direkt": {"vollbild": 3, "dauer": "x"}}).encode(), sp, tb, jetzt=2300.0)
    s, d = rufe("GET", {"art": "vollbild"}, None, sp, tb, jetzt=2300.0)
    s2, d2 = rufe("GET", {"art": "dauer"}, None, sp, tb, jetzt=2300.0)
    pruefe("TC-F15-04  Bilder direkt im Ordner werden je Art gemeldet (ungueltige Werte = 0)",
           d["bruecke"]["direkt"] == 3 and d2["bruecke"]["direkt"] == 0, (d["bruecke"], d2["bruecke"]))

    # Bericht wird bereinigt
    boese = {"ok": 1, "fehler": "x" * 1000, "ist": {"vollbild": ["../x.jpg", "ok.jpg", 5], "evil": ["a.jpg"]},
             "stand": {"vollbild": {"ok.jpg": "e1", "../y.jpg": "e2"}}}
    rufe("POST", {"bruecke": "bericht"}, json.dumps(boese).encode(), sp, tb, jetzt=2200.0)
    pruefe("TC-F18-01  Bericht: unzulaessige Namen/Arten fallen weg, Fehlertext begrenzt",
           tb.bericht["ist"] == {"vollbild": ["ok.jpg"], "dauer": []} and tb.bericht["stand"]["vollbild"] == {"ok.jpg": "e1"}
           and len(tb.bericht["fehler"]) == 300, tb.bericht)
    s, d = rufe("POST", {"bruecke": "bericht"}, b"kein json", sp, tb)
    pruefe("TC-F18-01  kaputter Bericht -> 400", s == 400, d)
    s, d = rufe("GET", {"bruecke": "unsinn"}, None, sp, tb)
    pruefe("TC-F18-01  unbekannter Bruecken-Aufruf -> 404", s == 404, d)

    # Graph-Adapter gegen Attrappe: Pfade, Filter, Wiederholung
    class Antwort:
        def __init__(self, status, daten=None, inhalt=b""):
            self.status_code, self._d, self.content = status, daten or {}, inhalt

        def json(self):
            return self._d

    class Http:
        def __init__(self):
            self.aufrufe = []
            self.put_antworten = [Antwort(503), Antwort(201, {"eTag": '"{ABC},2"'})]

        def get(self, url, **k):
            self.aufrufe.append(("GET", url))
            if "/children" in url:
                return Antwort(200, {"value": [
                    {"name": "ok.jpg", "size": 5, "eTag": "x", "file": {}},
                    {"name": "ordner", "size": 0, "eTag": "y"},
                    {"name": "Leer zeichen.jpg", "size": 5, "eTag": "z", "file": {}},
                    {"name": "b.png", "size": 5, "eTag": "z", "file": {}}]})
            return Antwort(200, inhalt=b"BYTES")

        def put(self, url, **k):
            self.aufrufe.append(("PUT", url))
            return self.put_antworten.pop(0)

        def delete(self, url, **k):
            self.aufrufe.append(("DELETE", url))
            return Antwort(204)

    w._graph_token = lambda: "T"
    http = Http()
    g = w.GraphSpeicher(drive="D", http=http)
    pruefe("Graph: Liste nur Dateien mit gueltigem Namen", [b["name"] for b in g.liste("vollbild")] == ["ok.jpg"])
    r = g.schreibe("dauer", "n.jpg", JPEG)
    pruefe("Graph: Schreiben wiederholt bei 503 und liefert kurze etag", r["etag"] and len(r["etag"]) == 12 and len(http.put_antworten) == 0, r)
    pruefe("Graph: Pfad Waage-Werbebilder/<art>/<name>",
           any(u == "https://graph.microsoft.com/v1.0/drives/D/root:/Waage-Werbebilder/dauer/n.jpg:/content?@microsoft.graph.conflictBehavior=replace"
               for m, u in http.aufrufe if m == "PUT"), http.aufrufe)
    pruefe("Graph: Lesen und Loeschen", g.lies("dauer", "n.jpg") == b"BYTES" and g.loesche("dauer", "n.jpg") is True)

    print("\nAlle Pruefungen bestanden.")


if __name__ == "__main__":
    main()
