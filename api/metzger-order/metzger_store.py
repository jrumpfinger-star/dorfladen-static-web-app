"""Datenschicht der Metzger-Bestellung (Spec F1, F4, F7, F9, F12, F15).

Wie bei der Baecker-Bestellung liegt alles als JSON im generischen
Schluessel-/Wert-Speicher ``dl_seiteninhalts``. Dadurch ist **keine
Schema-Aenderung in Dataverse** noetig.

Schluessel::

    metzger_artikel               Artikelkatalog
    metzger_config                Einstellungen
    metzger_vorschlaege           Vorschlagslisten je Artikelnummer (F4)
    metzger_order_JJJJ-MM-TT      eine Bestellung je Liefertag

Fehlt ein Schluessel, liefert das Modul den Startbestand aus ``vorlage/``.
Der Kiosk ist damit ab dem ersten Aufruf brauchbar, auch ohne Seed-Lauf.
"""
import json
import logging
import os
from datetime import date, datetime, timedelta

import msal
import requests

import metzger_portionen as P

ENTITY = "dl_seiteninhalts"
PK = "dl_seiteninhaltid"

KEY_ARTIKEL = "metzger_artikel"
KEY_CONFIG = "metzger_config"
KEY_VORSCHLAEGE = "metzger_vorschlaege"
KEY_ORDER = "metzger_order_"

DEFAULT_URL_SETTING = "DV_DEFAULT_URL"
DEFAULT_URL_FALLBACK = "https://orgab4e2f00.crm16.dynamics.com"

STATUS_ENTWURF, STATUS_GESENDET, STATUS_KORRIGIERT = 0, 1, 2

VORLAGEN = os.path.join(os.path.dirname(os.path.abspath(__file__)), "vorlage")

# Bis zur ausdruecklichen Freigabe geht jede Bestellung an die Testadresse,
# damit keine unfertige Bestellung beim Metzger landet.
TESTADRESSE = "jrumpfinger@t-online.de"
METZGER_MAIL = ""          # echte Bestelladresse - bewusst noch offen

TAGE = ["Montag", "Dienstag", "Mittwoch", "Donnerstag", "Freitag",
        "Samstag", "Sonntag"]

DEFAULT_CONFIG = {
    "name": "Metzgerei Mair",
    "empfaenger": TESTADRESSE,
    "empfaenger_name": "Test (Metzger-Bestellung)",
    "metzger_mail": METZGER_MAIL,
    "bestelltage": [0, 3],            # Montag und Donnerstag (Montag = 0)
    "bestellschluss": "12:00",
    "kd_nr": "1041",
}

# Fuer die Vorschlaege (F4): Was bestellt wurde, wiegt schwerer als das, was
# aus Lieferungen abgeleitet ist. Aelteres verliert ueber acht Wochen an
# Gewicht, damit sich die Liste von selbst an neue Gewohnheiten anpasst.
PUNKTE = {"bestellung": 1.0, "lieferung": 0.4}
HALBWERTSZEIT_TAGE = 56
MAX_VORSCHLAEGE = 5


# ──────────────────────────────────────────────────────────────────────
#  Dataverse-Zugriff
# ──────────────────────────────────────────────────────────────────────

def get_token():
    from shared.dataverse import get_tenant_id, get_client_id
    secret = os.environ.get("DV_CLIENT_SECRET", "")
    if not secret:
        return None
    target = os.environ.get(DEFAULT_URL_SETTING, DEFAULT_URL_FALLBACK)
    try:
        app = msal.ConfidentialClientApplication(
            get_client_id(),
            authority=f"https://login.microsoftonline.com/{get_tenant_id()}",
            client_credential=secret,
        )
        return app.acquire_token_for_client(
            scopes=[f"{target}/.default"]).get("access_token")
    except Exception as e:
        logging.error(f"[metzger] token failed: {e}")
        return None


def base_url():
    return os.environ.get(DEFAULT_URL_SETTING, DEFAULT_URL_FALLBACK)


def headers(token):
    return {
        "Authorization": f"Bearer {token}",
        "OData-MaxVersion": "4.0",
        "OData-Version": "4.0",
        "Accept": "application/json",
        "Content-Type": "application/json; charset=utf-8",
    }


def cors_headers():
    return {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, POST, PATCH, DELETE, OPTIONS",
        "Access-Control-Allow-Headers": "*",
        "Access-Control-Max-Age": "86400",
        "Content-Type": "application/json; charset=utf-8",
    }


def read_json(url, hdrs, key):
    """Liest einen JSON-Wert. Gibt (record_id, daten)."""
    try:
        r = requests.get(
            f"{url}/api/data/v9.2/{ENTITY}"
            f"?$filter=dl_schluessel eq '{key}'&$select={PK},dl_wert",
            headers=hdrs, timeout=15,
        )
        if r.status_code == 200:
            items = r.json().get("value", [])
            if items:
                try:
                    data = json.loads(items[0].get("dl_wert") or "{}")
                except Exception:
                    data = {}
                return items[0].get(PK, ""), data
    except Exception as e:
        logging.warning(f"[metzger] read {key} failed: {e}")
    return "", {}


def write_json(url, hdrs, key, rec_id, data, bezeichnung="Metzger"):
    payload = {
        "dl_schluessel": key,
        "dl_bezeichnung": bezeichnung,
        "dl_wert": json.dumps(data, ensure_ascii=False),
    }
    try:
        if rec_id:
            r = requests.patch(
                f"{url}/api/data/v9.2/{ENTITY}({rec_id})",
                headers={**hdrs, "If-Match": "*"}, json=payload, timeout=30,
            )
        else:
            r = requests.post(
                f"{url}/api/data/v9.2/{ENTITY}", headers=hdrs,
                json=payload, timeout=30,
            )
        return r.status_code in (200, 201, 204)
    except Exception as e:
        logging.error(f"[metzger] write {key} failed: {e}")
        return False


def read_many(url, hdrs, prefix, top=400):
    """Alle Datensaetze mit Schluessel-Praefix als Liste von (key, daten)."""
    out = []
    try:
        r = requests.get(
            f"{url}/api/data/v9.2/{ENTITY}"
            f"?$filter=startswith(dl_schluessel,'{prefix}')"
            f"&$select=dl_schluessel,dl_wert&$top={top}",
            headers=hdrs, timeout=25,
        )
        if r.status_code == 200:
            for item in r.json().get("value", []):
                try:
                    out.append((item.get("dl_schluessel", ""),
                                json.loads(item.get("dl_wert") or "{}")))
                except Exception:
                    continue
    except Exception as e:
        logging.warning(f"[metzger] read_many {prefix} failed: {e}")
    return out


# ──────────────────────────────────────────────────────────────────────
#  Startbestand aus den Vorlagen
# ──────────────────────────────────────────────────────────────────────

def _vorlage(name):
    try:
        with open(os.path.join(VORLAGEN, name), encoding="utf-8") as fh:
            return json.load(fh)
    except Exception as e:
        logging.warning(f"[metzger] Vorlage {name} fehlt: {e}")
        return {}


def vorlage_katalog():
    """84 Formularzeilen plus 18 inaktive Rechnungsartikel."""
    return _vorlage("katalog.json").get("artikel", [])


def vorlage_vorschlaege():
    """Aus den Rechnungen abgeleitete Vorschlaege je Artikelnummer."""
    return _vorlage("vorschlaege.json").get("artikel", {})


# ──────────────────────────────────────────────────────────────────────
#  Konfiguration
# ──────────────────────────────────────────────────────────────────────

def load_config(url, hdrs):
    rec_id, data = read_json(url, hdrs, KEY_CONFIG)
    cfg = dict(DEFAULT_CONFIG)
    if isinstance(data, dict):
        cfg.update({k: v for k, v in data.items() if v is not None})
    cfg["_rec_id"] = rec_id
    return cfg


def save_config(url, hdrs, cfg):
    rec_id = cfg.pop("_rec_id", "")
    return write_json(url, hdrs, KEY_CONFIG, rec_id, cfg, "Metzger Einstellungen")


def testbetrieb(cfg):
    """True, solange die Bestellung nicht an den Metzger selbst geht."""
    ziel = (cfg.get("metzger_mail") or "").strip().lower()
    return not ziel or (cfg.get("empfaenger") or "").strip().lower() != ziel


# ──────────────────────────────────────────────────────────────────────
#  Kalender
# ──────────────────────────────────────────────────────────────────────

def ist_bestelltag(cfg, datum_iso):
    try:
        tag = datetime.strptime(datum_iso, "%Y-%m-%d").weekday()
    except Exception:
        return False
    return tag in (cfg.get("bestelltage") or DEFAULT_CONFIG["bestelltage"])


def naechster_bestelltag(cfg, ab=None, max_tage=14):
    """Naechster Liefertag ab **morgen** (bzw. ab dem angegebenen Datum).

    Bestellt werden muss spaetestens am Vortag; fuer heute ist die Ware
    laengst da. Die Bestellung darf auch zwei oder drei Tage vorher raus -
    sie gilt dann fuer den naechsten so erreichbaren Liefertag.
    """
    start = ab or (date.today() + timedelta(days=1))
    for i in range(max_tage):
        d = start + timedelta(days=i)
        if ist_bestelltag(cfg, d.isoformat()):
            return d.isoformat()
    return start.isoformat()


def bestellbar(datum_iso):
    """Nur kuenftige Liefertage lassen sich bestellen.

    Der Riegel sitzt bewusst auch im Server: Ein veralteter Kiosk oder ein
    Doppelklick darf keine sinnlose Bestellung ausloesen.
    """
    try:
        return datetime.strptime(datum_iso, "%Y-%m-%d").date() > date.today()
    except (ValueError, TypeError):
        return False


def datum_de(datum_iso):
    try:
        d = datetime.strptime(datum_iso, "%Y-%m-%d")
        return d.strftime("%d.%m.%Y")
    except Exception:
        return datum_iso


def wochentag(datum_iso):
    try:
        return TAGE[datetime.strptime(datum_iso, "%Y-%m-%d").weekday()]
    except Exception:
        return ""


# ──────────────────────────────────────────────────────────────────────
#  Artikelkatalog
# ──────────────────────────────────────────────────────────────────────

def load_artikel(url, hdrs):
    """Katalog laden; ohne gespeicherten Bestand greift die Vorlage."""
    rec_id, data = read_json(url, hdrs, KEY_ARTIKEL)
    artikel = data.get("artikel") if isinstance(data, dict) else None
    if not artikel:
        artikel = vorlage_katalog()
        rec_id = rec_id or ""
    return rec_id, artikel


def save_artikel(url, hdrs, rec_id, artikel):
    return write_json(url, hdrs, KEY_ARTIKEL, rec_id, {"artikel": artikel},
                      "Metzger Artikel")


def preise(artikel):
    """Artikelnummer -> Preis je Kilo, fuer die Wertschaetzung (F16)."""
    out = {}
    for a in artikel:
        if a.get("nummer") and a.get("preis"):
            out[int(a["nummer"])] = float(a["preis"])
    return out


# ──────────────────────────────────────────────────────────────────────
#  Bestellungen
# ──────────────────────────────────────────────────────────────────────

def order_key(datum_iso):
    return f"{KEY_ORDER}{datum_iso}"


def load_order(url, hdrs, datum_iso):
    return read_json(url, hdrs, order_key(datum_iso))


def save_order(url, hdrs, rec_id, order):
    return write_json(url, hdrs, order_key(order["datum"]), rec_id, order,
                      f"Metzger Bestellung {order['datum']}")


def bestellungen(url, hdrs):
    """Alle Bestellungen, absteigend nach Liefertag."""
    out = []
    for key, data in read_many(url, hdrs, KEY_ORDER):
        datum = key[len(KEY_ORDER):]
        if not datum:
            continue
        data.setdefault("datum", datum)
        out.append(data)
    out.sort(key=lambda o: o.get("datum", ""), reverse=True)
    return out


def vorlage_bestellung(alle, datum_iso):
    """Die letzte gesendete Bestellung desselben Wochentags **vor** dem Tag.

    Bewusst kein Mittelwert: Die Verkaeuferin soll nachvollziehen koennen,
    woher ein Wert stammt (Spec Decision 5).
    """
    try:
        ziel = datetime.strptime(datum_iso, "%Y-%m-%d")
    except Exception:
        return None
    for o in alle:                       # bereits absteigend sortiert
        d = o.get("datum", "")
        if d >= datum_iso:
            continue
        if o.get("status") in (STATUS_GESENDET, STATUS_KORRIGIERT):
            try:
                if datetime.strptime(d, "%Y-%m-%d").weekday() == ziel.weekday():
                    return o
            except Exception:
                continue
    return None


def letzte_bestellung(alle):
    """Die zuletzt gesendete Bestellung - **unabhaengig vom Wochentag**.

    Anders als ``vorlage_bestellung`` (die den letzten gleichen Wochentag
    sucht und die Vorbelegung liefert) dient das hier nur als Anhalt beim
    Neuerfassen: Gibt es fuer den Wochentag noch nichts, startet die Liste
    leer - dann hilft der Blick darauf, was zuletzt ueberhaupt bestellt wurde.
    """
    for o in alle:                       # bereits absteigend sortiert
        if o.get("status") in (STATUS_GESENDET, STATUS_KORRIGIERT):
            return o
    return None


def entwurf_positionen(vorlage):
    """Positionen aus einer Vorlage uebernehmen - ohne Zusatzpositionen.

    Zusatzartikel gelten ausdruecklich nur fuer einen Tag (Spec F8) und duerfen
    die Vorbelegung des naechsten gleichen Wochentags nicht verfaelschen.
    """
    if not vorlage:
        return []
    out = []
    for p in vorlage.get("positionen", []):
        p = P.normalisiere_position(p)
        if p.get("zusatz") or not P.bestellt(p):
            continue
        p["hinweis"] = ""            # Hinweise gelten fuer den einen Tag
        if p["portionen"]:
            out.append(p)
    return out


# ──────────────────────────────────────────────────────────────────────
#  Vorschlaege (F4)
# ──────────────────────────────────────────────────────────────────────

def load_vorschlaege(url, hdrs):
    rec_id, data = read_json(url, hdrs, KEY_VORSCHLAEGE)
    artikel = data.get("artikel") if isinstance(data, dict) else None
    if not artikel:
        artikel = vorlage_vorschlaege()
        rec_id = rec_id or ""
    return rec_id, artikel


def _punkte(eintrag, heute):
    """Zeitgewichtete Punkte: Aelteres zaehlt weniger."""
    basis = float(eintrag.get("punkte") or 0)
    zuletzt = eintrag.get("zuletzt") or ""
    try:
        alter = (heute - datetime.strptime(zuletzt, "%Y-%m-%d").date()).days
    except Exception:
        return basis
    return basis * (0.5 ** (max(0, alter) / HALBWERTSZEIT_TAGE))


def sortiere_vorschlaege(liste, heute=None):
    """Bestellungen immer vor Lieferungen, darin nach Punkten.

    Die Rechnungen sind nur der Startbestand; was die Verkaeuferin tatsaechlich
    bestellt hat, gehoert nach oben.
    """
    heute = heute or date.today()
    liste.sort(key=lambda e: (0 if e.get("quelle") == "bestellung" else 1,
                              -_punkte(e, heute)))
    del liste[MAX_VORSCHLAEGE:]
    return liste


def lerne(vorschlaege, positionen, datum_iso):
    """Eine gesendete Bestellung in die Vorschlaege einarbeiten (F4)."""
    heute = date.today()
    for p in positionen:
        nummer = p.get("nummer")
        if not nummer or not p.get("portionen"):
            continue
        key = str(nummer)
        liste = vorschlaege.setdefault(key, [])
        sig = P.schluessel(p["portionen"])
        treffer = next(
            (e for e in liste if P.schluessel(e.get("portionen", [])) == sig), None)
        if treffer is None:
            treffer = {"portionen": [dict(b) for b in p["portionen"]],
                       "punkte": 0.0, "belege": 0, "quelle": "bestellung"}
            liste.append(treffer)
        if treffer.get("quelle") != "bestellung":
            treffer["quelle"] = "bestellung"
            treffer["belege"] = 0          # Lieferbelege sind keine Bestellungen
            treffer["punkte"] = 0.0
        treffer["punkte"] = round(float(treffer.get("punkte") or 0)
                                  + PUNKTE["bestellung"], 4)
        treffer["belege"] = int(treffer.get("belege") or 0) + 1
        treffer["zuletzt"] = datum_iso or heute.isoformat()
        sortiere_vorschlaege(liste, heute)
    return vorschlaege


def save_vorschlaege(url, hdrs, rec_id, vorschlaege):
    return write_json(url, hdrs, KEY_VORSCHLAEGE, rec_id,
                      {"artikel": vorschlaege}, "Metzger Vorschlaege")
