"""Gemeinsame Datenschicht fuer die Baecker-Bestellung.

Artikelkatalog, Einstellungen und Bestellungen liegen als JSON in
``dl_seiteninhalts`` – demselben generischen Schluessel-/Wert-Speicher, den der
Kiosk bereits fuer Konfiguration und Push-Abos nutzt. Dadurch ist keine
Schema-Aenderung in Dataverse noetig.

Schluessel:
    baecker_artikel              Artikelkatalog
    baecker_config               Einstellungen (Empfaenger, Bestelltage, …)
    baecker_order_JJJJ-MM-TT     eine Bestellung je Liefertag
"""
import json
import logging
import os
from datetime import date, datetime, timedelta

import msal
import requests

ENTITY = "dl_seiteninhalts"
PK = "dl_seiteninhaltid"

KEY_ARTIKEL = "baecker_artikel"
KEY_CONFIG = "baecker_config"
KEY_ORDER = "baecker_order_"

DEFAULT_URL_SETTING = "DV_DEFAULT_URL"
DEFAULT_URL_FALLBACK = "https://orgab4e2f00.crm16.dynamics.com"

STATUS_ENTWURF, STATUS_GESENDET, STATUS_KORRIGIERT = 0, 1, 2

# Startwerte – im Kiosk aenderbar. Empfaenger bleibt bis zur Freigabe die
# Testadresse, damit keine unfertige Bestellung bei der Baeckerei landet.
DEFAULT_CONFIG = {
    "empfaenger": "jrumpfinger@t-online.de",
    "empfaenger_name": "Test (Baecker-Bestellung)",
    "baeckerei_mail": "info@baeckerei-freundl.de",
    "bestelltage": [2, 3, 4, 5],          # Mi, Do, Fr, Sa (Montag = 0)
    "bestellschluss": "12:00",
    "kd_nr": "1190",
    "tour_nr": {"default": "87", "5": "8"},   # Samstag faehrt Tour 8
    "gruppen": [
        {"bis": 119, "titel": "Semmeln & Kleingeb\u00e4ck"},
        {"bis": 301, "titel": "Brote & Baguettes"},
        {"bis": None, "titel": "S\u00fc\u00dfes & Sonstiges"},
    ],
}

TAGE = ["Montag", "Dienstag", "Mittwoch", "Donnerstag", "Freitag", "Samstag", "Sonntag"]


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
        return app.acquire_token_for_client(scopes=[f"{target}/.default"]).get("access_token")
    except Exception as e:
        logging.error(f"[baecker] token failed: {e}")
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
        logging.warning(f"[baecker] read {key} failed: {e}")
    return "", {}


def write_json(url, hdrs, key, rec_id, data, bezeichnung="Baecker"):
    """Schreibt einen JSON-Wert. Gibt True bei Erfolg."""
    payload = {
        "dl_schluessel": key,
        "dl_bezeichnung": bezeichnung,
        "dl_wert": json.dumps(data, ensure_ascii=False),
    }
    try:
        if rec_id:
            r = requests.patch(
                f"{url}/api/data/v9.2/{ENTITY}({rec_id})",
                headers={**hdrs, "If-Match": "*"}, json=payload, timeout=25,
            )
        else:
            r = requests.post(
                f"{url}/api/data/v9.2/{ENTITY}", headers=hdrs, json=payload, timeout=25,
            )
        return r.status_code in (200, 201, 204)
    except Exception as e:
        logging.error(f"[baecker] write {key} failed: {e}")
        return False


def read_many(url, hdrs, prefix, top=400):
    """Liest alle Datensaetze mit Schluessel-Praefix. Gibt Liste von (key, daten)."""
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
        logging.warning(f"[baecker] read_many {prefix} failed: {e}")
    return out


# ──────────────────────────────────────────────────────────────────────
#  Fachlogik
# ──────────────────────────────────────────────────────────────────────

def load_config(url, hdrs):
    """Einstellungen mit Startwerten aufgefuellt."""
    _, data = read_json(url, hdrs, KEY_CONFIG)
    cfg = dict(DEFAULT_CONFIG)
    cfg.update({k: v for k, v in (data or {}).items() if v not in (None, "")})
    return cfg


def load_artikel(url, hdrs):
    """Artikelkatalog, aufsteigend nach Nummer. Faellt auf die mitgelieferte
    Startliste zurueck, solange in Dataverse noch nichts gepflegt ist."""
    _, data = read_json(url, hdrs, KEY_ARTIKEL)
    artikel = (data or {}).get("artikel")
    if not artikel:
        pfad = os.path.join(os.path.dirname(os.path.abspath(__file__)),
                            "vorlage", "katalog.json")
        try:
            with open(pfad, encoding="utf-8") as fh:
                artikel = json.load(fh).get("artikel", [])
        except Exception as e:
            logging.warning(f"[baecker] Startkatalog fehlt: {e}")
            artikel = []
    return sort_artikel(artikel)


def sort_nr(nummer):
    """Sortierschluessel: numerisch aufsteigend, Positionen ohne Nummer ans Ende."""
    s = str(nummer or "").strip()
    return (0, int(s)) if s.isdigit() else (1, 0)


def sort_artikel(artikel):
    return sorted(artikel, key=lambda a: (sort_nr(a.get("nummer")), a.get("name") or ""))


def order_key(datum_iso):
    return f"{KEY_ORDER}{datum_iso}"


def load_order(url, hdrs, datum_iso):
    """Bestellung eines Liefertags. Gibt (record_id, daten)."""
    return read_json(url, hdrs, order_key(datum_iso))


def tour_nr(cfg, datum_iso):
    """Tour-Nummer des Wochentags – am Samstag faehrt eine andere Tour."""
    tour = cfg.get("tour_nr") or DEFAULT_CONFIG["tour_nr"]
    if isinstance(tour, str):
        return tour
    try:
        wd = datetime.strptime(datum_iso, "%Y-%m-%d").weekday()
    except ValueError:
        return tour.get("default", "87")
    return tour.get(str(wd), tour.get("default", "87"))


def ist_bestelltag(cfg, datum_iso):
    try:
        wd = datetime.strptime(datum_iso, "%Y-%m-%d").weekday()
    except ValueError:
        return False
    return wd in (cfg.get("bestelltage") or DEFAULT_CONFIG["bestelltage"])


def naechster_bestelltag(cfg, ab=None, max_tage=14):
    """Naechster Bestelltag ab morgen (bzw. ab dem angegebenen Datum)."""
    start = ab or (date.today() + timedelta(days=1))
    for i in range(max_tage):
        d = start + timedelta(days=i)
        if ist_bestelltag(cfg, d.isoformat()):
            return d.isoformat()
    return start.isoformat()


def korrektur_moeglich(cfg, datum_iso):
    """True, wenn fuer diesen Liefertag noch eine Korrektur gesendet werden darf.

    Nur der naechste anstehende Liefertag kommt infrage: Fuer bereits gelieferte
    Tage waere eine Korrektur sinnlos, und weiter entfernte Tage hat die
    Baeckerei noch gar nicht eingeplant.
    """
    return bool(datum_iso) and datum_iso == naechster_bestelltag(cfg)


def vorlage_bestellungen(url, hdrs, datum_iso, limit=4):
    """Die letzten gesendeten Bestellungen desselben Wochentags, neueste zuerst.

    Grundlage der Vorbelegung (Spec F2): exakt der letzte gleiche Wochentag,
    dazu drei weitere zum Vergleich.
    """
    try:
        ziel = datetime.strptime(datum_iso, "%Y-%m-%d").date()
    except ValueError:
        return []
    treffer = []
    for key, data in read_many(url, hdrs, KEY_ORDER):
        d = key[len(KEY_ORDER):]
        if not d or d >= datum_iso:
            continue
        if data.get("status") not in (STATUS_GESENDET, STATUS_KORRIGIERT):
            continue
        try:
            tag = datetime.strptime(d, "%Y-%m-%d").date()
        except ValueError:
            continue
        if tag.weekday() != ziel.weekday():
            continue
        treffer.append((d, data))
    treffer.sort(key=lambda t: t[0], reverse=True)
    return treffer[:limit]


def positionen_map(order):
    """Positionen einer Bestellung als {Schluessel: Menge}. Zusatzpositionen
    bleiben aussen vor – sie gelten nur fuer ihren Tag (Spec F4)."""
    out = {}
    for p in (order or {}).get("positionen", []):
        if p.get("zusatz"):
            continue
        key = str(p.get("nummer") or "").strip() or (p.get("name") or "").strip().lower()
        if key:
            out[key] = int(p.get("menge") or 0)
    return out


def artikel_key(a):
    return str(a.get("nummer") or "").strip() or (a.get("name") or "").strip().lower()


def nummer_umziehen(url, hdrs, alt, neu, name=None):
    """Traegt eine geaenderte Artikelnummer in alle Bestellungen nach.

    Positionen werden ueber die Artikelnummer zugeordnet. Ohne dieses
    Nachziehen verlieren gespeicherte Bestellungen den Bezug zum Artikel: Die
    Vorbelegung faenge wieder bei 0 an und die alte Nummer taeuchte als
    Zusatzposition auf. Gibt die Zahl der angepassten Bestellungen zurueck.
    """
    alt, neu = str(alt or "").strip(), str(neu or "").strip()
    if not alt or alt == neu:
        return 0
    geaendert = 0
    for key, data in read_many(url, hdrs, KEY_ORDER):
        positionen = (data or {}).get("positionen") or []
        treffer = [p for p in positionen
                   if str(p.get("nummer") or "").strip() == alt]
        if not treffer:
            continue
        for p in treffer:
            p["nummer"] = neu
            if name:
                p["name"] = name
        rec_id, _ = read_json(url, hdrs, key)
        if write_json(url, hdrs, key, rec_id, data, f"Baecker-Bestellung {key}"):
            geaendert += 1
    return geaendert


def datum_de(datum_iso):
    try:
        return datetime.strptime(datum_iso, "%Y-%m-%d").strftime("%d.%m.%Y")
    except ValueError:
        return datum_iso


def wochentag(datum_iso):
    try:
        return TAGE[datetime.strptime(datum_iso, "%Y-%m-%d").weekday()]
    except ValueError:
        return ""
