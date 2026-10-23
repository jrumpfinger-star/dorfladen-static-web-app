"""Waage-Werbebilder: reine Logik und Adapter (SharePoint/Graph, Table Storage).

Spec: specs/kiosk-werbebilder-upload (F17, F18). Der Kiosk legt Werbebilder ueber
``/api/waage-werbebilder`` in SharePoint ab; die Bruecke im Laden holt sie ab und
gleicht die Waage per FTP an. Die Logik steht hier ohne Netz-Zugriff, damit sie sich
mit Attrappen pruefen laesst; die Adapter sind duenn.
"""

import hashlib
import json
import os
import re
import time
import unicodedata

ARTEN = ("vollbild", "dauer")
MAX_BILDER = 99
MAX_BYTES = 8 * 1024 * 1024
ONLINE_SEKUNDEN = 90
NAME_OK = re.compile(r"^[A-Za-z0-9._-]{1,80}\.(jpg|gif)$")

SP_ORDNER = "Waage-Werbebilder"
SP_DRIVE = "b!bwUha0ab4EeiA3xXHK-Oobhv5tJbeYJDiF9pTB-f1kC-Mp-AY0brRrr2WigdYK4A"
TABELLE = "waage"


class WaageFehler(Exception):
    def __init__(self, status, text):
        Exception.__init__(self, text)
        self.status = status
        self.text = text


# ── reine Logik ─────────────────────────────────────────────────────────────

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


def kurz_etag(roh):
    """Kurze, URL-taugliche Kennung aus der eTag von SharePoint."""
    return hashlib.sha1((roh or "").encode("utf-8")).hexdigest()[:12]


def sortiert(bilder):
    return sorted(bilder, key=lambda b: b["name"].lower())


def version_von(arten):
    """Aendert sich bei jeder Aenderung der Sollvorgabe (Name, Groesse oder eTag)."""
    zeilen = []
    for art in ARTEN:
        for b in sortiert(arten.get(art, [])):
            zeilen.append("%s|%s|%s|%s" % (art, b["name"], b.get("groesse", 0), b.get("etag", "")))
    return hashlib.sha1("\n".join(zeilen).encode("utf-8")).hexdigest()[:16]


def pruefe_upload(art, name, daten, vorhanden):
    """Liefert den bereinigten Namen oder wirft WaageFehler (415/413/409/400/404)."""
    if art not in ARTEN:
        raise WaageFehler(404, "Unbekannte Art")
    if not daten:
        raise WaageFehler(400, "Leere Datei")
    if len(daten) > MAX_BYTES:
        raise WaageFehler(413, "Datei zu gross (max. %d MB)" % (MAX_BYTES // (1024 * 1024)))
    typ = bildtyp(daten)
    if not typ:
        raise WaageFehler(415, "Nur JPEG und GIF erlaubt")
    sauber = sauberer_name(name, typ)
    if sauber not in vorhanden and len(vorhanden) >= MAX_BILDER:
        raise WaageFehler(409, "Es sind bereits %d Bilder gespeichert" % MAX_BILDER)
    return sauber


def bruecke_info(bericht, jetzt=None):
    """Brueckenstatus fuer den Kiosk aus dem letzten Bericht."""
    jetzt = time.time() if jetzt is None else jetzt
    if not bericht or not bericht.get("zeit"):
        return {"bekannt": False, "online": False, "vor_s": None, "ok": False,
                "fehler": "", "initialisiert": False}
    vor = max(0, int(jetzt - float(bericht["zeit"])))
    return {"bekannt": True, "online": vor <= ONLINE_SEKUNDEN, "vor_s": vor,
            "zeit": bericht["zeit"], "ok": bool(bericht.get("ok")),
            "fehler": bericht.get("fehler", "") or "",
            "initialisiert": bool(bericht.get("initialisiert"))}


def bild_status(art, bild, bericht):
    """'auf_waage', wenn die Waage dieses Bild in genau dieser Fassung hat, sonst 'wartet'."""
    if not bericht:
        return "wartet"
    ist = (bericht.get("ist") or {}).get(art) or []
    stand = (bericht.get("stand") or {}).get(art) or {}
    if bild["name"] in ist and stand.get(bild["name"]) == bild.get("etag"):
        return "auf_waage"
    return "wartet"


# ── Verarbeitung (ohne Azure-Typen, testbar) ────────────────────────────────

def _json(status, daten):
    return status, "application/json; charset=utf-8", json.dumps(daten, ensure_ascii=False).encode("utf-8")


def _bilder(speicher, art):
    return sortiert(speicher.liste(art))


def verarbeite(methode, params, body, speicher, tabelle, jetzt=None):
    """Gemeinsamer Kern der Funktion. Rueckgabe: (status, content_type, bytes)."""
    jetzt = time.time() if jetzt is None else jetzt
    try:
        br = params.get("bruecke")
        if br == "sync" and methode == "GET":
            arten = dict((a, _bilder(speicher, a)) for a in ARTEN)
            bericht = tabelle.lies() or {}
            return _json(200, {
                "success": True, "version": version_von(arten),
                "initialisiert": bool(bericht.get("initialisiert")),
                "arten": dict((a, [{"name": b["name"], "groesse": b.get("groesse", 0), "etag": b.get("etag", "")}
                                   for b in arten[a]]) for a in ARTEN)})
        if br == "bericht" and methode == "POST":
            neu = _bericht_lesen(body)
            alt = tabelle.lies() or {}
            neu["initialisiert"] = bool(neu.get("initialisiert") or alt.get("initialisiert"))
            neu["zeit"] = jetzt
            tabelle.schreibe(neu)
            return _json(200, {"success": True})
        if br:
            raise WaageFehler(404, "Nicht gefunden")

        art = params.get("art")
        name = params.get("name")
        if art not in ARTEN:
            raise WaageFehler(404, "Unbekannte Art")

        if methode == "GET" and not name:
            bericht = tabelle.lies() or {}
            bilder = _bilder(speicher, art)
            info = bruecke_info(bericht, jetzt)
            info["direkt"] = int(((bericht.get("direkt") or {}).get(art)) or 0)
            return _json(200, {
                "success": True, "art": art, "max": MAX_BILDER,
                "bruecke": info,
                "bilder": [{"name": b["name"], "groesse": b.get("groesse", 0), "etag": b.get("etag", ""),
                            "status": bild_status(art, b, bericht)} for b in bilder]})
        if methode == "GET":
            if not NAME_OK.match(name or ""):
                raise WaageFehler(400, "Ungueltiger Dateiname")
            daten = speicher.lies(art, name)
            if daten is None:
                raise WaageFehler(404, "Bild nicht gefunden")
            return 200, ("image/gif" if name.lower().endswith(".gif") else "image/jpeg"), daten
        if methode == "POST":
            vorhanden = [b["name"] for b in _bilder(speicher, art)]
            sauber = pruefe_upload(art, name, body or b"", vorhanden)
            item = speicher.schreibe(art, sauber, body)
            return _json(200, {"success": True, "name": sauber, "groesse": len(body),
                               "etag": (item or {}).get("etag", "")})
        if methode == "DELETE":
            if not NAME_OK.match(name or ""):
                raise WaageFehler(400, "Ungueltiger Dateiname")
            if not speicher.loesche(art, name):
                raise WaageFehler(404, "Bild nicht gefunden")
            return _json(200, {"success": True})
        raise WaageFehler(405, "Methode nicht erlaubt")
    except WaageFehler as e:
        return _json(e.status, {"success": False, "error": e.text})


def _bericht_lesen(body):
    try:
        d = json.loads((body or b"").decode("utf-8"))
    except Exception:
        raise WaageFehler(400, "Ungueltiger Bericht")
    if not isinstance(d, dict):
        raise WaageFehler(400, "Ungueltiger Bericht")

    def namen(x):
        return [n for n in (x or []) if isinstance(n, str) and NAME_OK.match(n)][:MAX_BILDER]

    def staende(x):
        return dict((k, str(v)[:40]) for k, v in (x or {}).items() if isinstance(k, str) and NAME_OK.match(k))

    def zahl(x):
        return x if isinstance(x, int) and not isinstance(x, bool) and 0 <= x <= 999 else 0
    return {
        "ok": bool(d.get("ok")),
        "fehler": str(d.get("fehler") or "")[:300],
        "initialisiert": bool(d.get("initialisiert")),
        "ist": dict((a, namen((d.get("ist") or {}).get(a))) for a in ARTEN),
        "stand": dict((a, staende((d.get("stand") or {}).get(a))) for a in ARTEN),
        "direkt": dict((a, zahl((d.get("direkt") or {}).get(a))) for a in ARTEN),
    }


# ── Adapter: SharePoint (Microsoft Graph) ───────────────────────────────────

_msal_app = None


def _graph_token():
    global _msal_app
    import msal
    from shared.dataverse import get_authority, get_client_id
    secret = os.environ.get("DV_CLIENT_SECRET", "")
    if not secret:
        raise WaageFehler(503, "Speicher nicht eingerichtet")
    if _msal_app is None:
        _msal_app = msal.ConfidentialClientApplication(
            get_client_id(), authority=get_authority(), client_credential=secret)
    r = _msal_app.acquire_token_for_client(scopes=["https://graph.microsoft.com/.default"])
    tok = r.get("access_token")
    if not tok:
        raise WaageFehler(503, "Speicher nicht erreichbar")
    return tok


class GraphSpeicher:
    """Bilder je Art als Dateien in SharePoint: Waage-Werbebilder/<art>/<name>."""

    def __init__(self, drive=None, http=None):
        import requests
        self.drive = drive or os.environ.get("WAAGE_SP_DRIVE", SP_DRIVE)
        self.http = http or requests

    def _kopf(self):
        return {"Authorization": "Bearer " + _graph_token()}

    def _wurzel(self):
        return "https://graph.microsoft.com/v1.0/drives/%s/root:/%s" % (self.drive, SP_ORDNER)

    def liste(self, art):
        url = ("%s/%s:/children?$select=name,size,eTag,file&$top=200" % (self._wurzel(), art))
        r = self.http.get(url, headers=self._kopf(), timeout=20)
        if r.status_code == 404:
            return []
        if r.status_code != 200:
            raise WaageFehler(502, "SharePoint-Fehler %s" % r.status_code)
        aus = []
        for it in r.json().get("value", []):
            if "file" in it and NAME_OK.match(it.get("name", "")):
                aus.append({"name": it["name"], "groesse": it.get("size", 0), "etag": kurz_etag(it.get("eTag"))})
        return aus

    def lies(self, art, name):
        r = self.http.get("%s/%s/%s:/content" % (self._wurzel(), art, name), headers=self._kopf(), timeout=30)
        if r.status_code == 404:
            return None
        if r.status_code != 200:
            raise WaageFehler(502, "SharePoint-Fehler %s" % r.status_code)
        return r.content

    def schreibe(self, art, name, daten):
        url = ("%s/%s/%s:/content?@microsoft.graph.conflictBehavior=replace" % (self._wurzel(), art, name))
        kopf = dict(self._kopf(), **{"Content-Type": "application/octet-stream"})
        r = None
        for versuch in range(3):
            r = self.http.put(url, headers=kopf, data=daten, timeout=60)
            if r.status_code not in (429, 500, 502, 503, 504):
                break
            time.sleep(min(6, 2 ** versuch))
        if r is None or r.status_code not in (200, 201):
            raise WaageFehler(502, "SharePoint-Fehler %s" % (r.status_code if r is not None else "?"))
        return {"etag": kurz_etag(r.json().get("eTag"))}

    def loesche(self, art, name):
        r = self.http.delete("%s/%s/%s" % (self._wurzel(), art, name), headers=self._kopf(), timeout=20)
        if r.status_code == 404:
            return False
        if r.status_code not in (200, 204):
            raise WaageFehler(502, "SharePoint-Fehler %s" % r.status_code)
        return True


# ── Adapter: Table Storage (Brueckenbericht) ────────────────────────────────

class TabellenStatus:
    """Letzter Bericht der Bruecke; eine Zeile (PK 'bruecke', RK 'status')."""

    def _tabelle(self):
        from azure.data.tables import TableServiceClient
        conn = os.environ.get("STORAGE_CONN", "")
        if not conn:
            raise WaageFehler(503, "Status-Speicher nicht eingerichtet")
        svc = TableServiceClient.from_connection_string(conn)
        svc.create_table_if_not_exists(TABELLE)
        return svc.get_table_client(TABELLE)

    def lies(self):
        try:
            e = self._tabelle().get_entity("bruecke", "status")
        except WaageFehler:
            raise
        except Exception:
            return None
        return {"zeit": e.get("zeit", 0), "ok": bool(e.get("ok")), "fehler": e.get("fehler", ""),
                "initialisiert": bool(e.get("initialisiert")),
                "ist": json.loads(e.get("ist_json") or "{}"), "stand": json.loads(e.get("stand_json") or "{}"),
                "direkt": json.loads(e.get("direkt_json") or "{}")}

    def schreibe(self, bericht):
        self._tabelle().upsert_entity({
            "PartitionKey": "bruecke", "RowKey": "status", "zeit": float(bericht["zeit"]),
            "ok": bool(bericht["ok"]), "fehler": bericht.get("fehler", ""),
            "initialisiert": bool(bericht.get("initialisiert")),
            "ist_json": json.dumps(bericht.get("ist") or {}), "stand_json": json.dumps(bericht.get("stand") or {}),
            "direkt_json": json.dumps(bericht.get("direkt") or {})})
