"""Gemeinsame Datenschicht fuer die Baecker-Bestellung.

Artikelkatalog, Einstellungen und Bestellungen liegen als JSON in
``dl_seiteninhalts`` – demselben generischen Schluessel-/Wert-Speicher, den der
Kiosk bereits fuer Konfiguration und Push-Abos nutzt. Dadurch ist keine
Schema-Aenderung in Dataverse noetig.

Der Dorfladen wird von **zwei** Baeckereien beliefert. Die Baeckerei ist Teil
des Schluessels, weil beide Haeuser **eigene Artikelnummern** vergeben: Nr. 1 ist
bei Freundl die Kaisersemmel, bei Martin's die Semmel. Ein gemeinsamer Katalog
waere damit unbrauchbar.

Schluessel:
    baecker_artikel_<bk>              Artikelkatalog je Baeckerei
    baecker_config                    Einstellungen ALLER Baeckereien
    baecker_order_<bk>_JJJJ-MM-TT     eine Bestellung je Baeckerei und Liefertag

Altschluessel (vor der Umstellung auf zwei Baeckereien, gehoeren Freundl):
    baecker_artikel                   -> baecker_artikel_freundl
    baecker_order_JJJJ-MM-TT          -> baecker_order_freundl_JJJJ-MM-TT

Solange der Bestand noch nicht umgezogen ist, greift die **Lesebruecke**: Fehlt
der neue Schluessel, wird der alte gelesen. Geschrieben wird **immer** auf den
neuen. Ohne diese Bruecke staende der Baecker-Tab zwischen Live-Gang und Umzug
mit leerem Verlauf und leerer Vorbelegung da.
"""
import json
import logging
import os
import re
from datetime import date, datetime, timedelta

import msal
import requests

ENTITY = "dl_seiteninhalts"
PK = "dl_seiteninhaltid"

KEY_ARTIKEL = "baecker_artikel"     # Altschluessel, nur noch fuer die Bruecke
KEY_CONFIG = "baecker_config"
KEY_ORDER = "baecker_order_"        # gemeinsamer Praefix ALLER Bestellungen

# Feste Kennungen – sie stehen in Speicherschluesseln und duerfen sich nie
# aendern. Der Anzeigename ist davon getrennt und im CMS frei aenderbar.
FREUNDL, MARTINS = "freundl", "martins"
BAECKEREIEN = (FREUNDL, MARTINS)
ALT_BAECKEREI = FREUNDL             # der Altbestand gehoert Freundl

DEFAULT_URL_SETTING = "DV_DEFAULT_URL"
DEFAULT_URL_FALLBACK = "https://orgab4e2f00.crm16.dynamics.com"

STATUS_ENTWURF, STATUS_GESENDET, STATUS_KORRIGIERT = 0, 1, 2

# Startwerte je Baeckerei – im CMS aenderbar. Der Empfaenger bleibt bis zur
# ausdruecklichen Freigabe die Testadresse, damit keine unfertige Bestellung
# bei einer Baeckerei landet.
TESTADRESSE = "jrumpfinger@t-online.de"

DEFAULT_BAECKEREIEN = {
    FREUNDL: {
        "name": "B\u00e4ckerei Freundl",
        "empfaenger": TESTADRESSE,
        "empfaenger_name": "Test (B\u00e4cker-Bestellung)",
        "baeckerei_mail": "info@baeckerei-freundl.de",
        "bestelltage": [2, 3, 4, 5],          # Mi, Do, Fr, Sa (Montag = 0)
        "bestellschluss": "12:00",
        "kd_nr": "1190",
        "tour_nr": {"default": "87", "5": "8"},   # Samstag faehrt Tour 8
        "format": "docx",
        "papierausdruck": True,               # Freundl braucht zusaetzlich Papier
        "gruppen": [
            {"bis": 119, "titel": "Semmeln & Kleingeb\u00e4ck"},
            {"bis": 301, "titel": "Brote & Baguettes"},
            {"bis": None, "titel": "S\u00fc\u00dfes & Sonstiges"},
        ],
    },
    MARTINS: {
        "name": "Martin's Backstube",
        "empfaenger": TESTADRESSE,
        "empfaenger_name": "Test (B\u00e4cker-Bestellung)",
        "baeckerei_mail": "",                 # echte Bestelladresse noch offen
        "bestelltage": [0, 1, 5],             # Mo, Di, Sa
        "bestellschluss": "12:00",
        "kd_nr": "1015",
        "tour_nr": {"default": ""},
        "format": "pdf",
        "papierausdruck": False,
        "gruppen": [
            {"bis": 99, "titel": "Semmeln & Kleingeb\u00e4ck"},
            {"bis": 299, "titel": "Brote"},
            {"bis": None, "titel": "S\u00fc\u00dfes & Sonstiges"},
        ],
    },
}

# Rueckwaertskompatibilitaet: Aufrufer, die noch das flache Objekt erwarten,
# bekommen die Freundl-Werte.
DEFAULT_CONFIG = dict(DEFAULT_BAECKEREIEN[FREUNDL])

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
#  Baeckerei-Kennung, Schluessel und Lesebruecke
# ──────────────────────────────────────────────────────────────────────

def baeckerei_gueltig(bk):
    return bk in BAECKEREIEN


def artikel_store_key(bk):
    """Speicherschluessel des Artikelkatalogs einer Baeckerei.

    Bewusst NICHT ``artikel_key`` – so heisst weiter unten der Positions-
    schluessel eines einzelnen Artikels. Zwei Funktionen gleichen Namens in
    einem Modul waeren still wirkungslos: Python behielte nur die letzte.
    """
    return f"{KEY_ARTIKEL}_{bk}"


def order_key(bk, datum_iso):
    return f"{KEY_ORDER}{bk}_{datum_iso}"


def order_praefix(bk):
    return f"{KEY_ORDER}{bk}_"


def alt_order_key(datum_iso):
    """Schluessel aus der Zeit vor der zweiten Baeckerei."""
    return f"{KEY_ORDER}{datum_iso}"


_ALT_DATUM = re.compile(r"^\d{4}-\d{2}-\d{2}$")


def schluessel_deuten(key):
    """Ordnet einen Bestellschluessel einer Baeckerei und einem Datum zu.

    ``baecker_order_2026-09-10``          -> (freundl, '2026-09-10', alt=True)
    ``baecker_order_freundl_2026-09-10``  -> (freundl, '2026-09-10', alt=False)

    Gibt ``(None, None, False)``, wenn der Schluessel zu keiner Form passt.
    Diese Unterscheidung ist noetig, weil ``baecker_order_`` ein **Praefix der
    neuen Schluessel** ist: Wer stumpf nach dem gemeinsamen Praefix filtert,
    bekommt beide Baeckereien und die Altschluessel in einem Topf.
    """
    if not key.startswith(KEY_ORDER):
        return None, None, False
    rest = key[len(KEY_ORDER):]
    if _ALT_DATUM.match(rest):
        return ALT_BAECKEREI, rest, True
    for bk in BAECKEREIEN:
        marke = f"{bk}_"
        if rest.startswith(marke):
            datum = rest[len(marke):]
            if _ALT_DATUM.match(datum):
                return bk, datum, False
    return None, None, False


def load_order(url, hdrs, bk, datum_iso):
    """Bestellung einer Baeckerei an einem Liefertag. Gibt (record_id, daten).

    Lesebruecke: Fehlt der neue Schluessel und geht es um Freundl, wird der
    Altschluessel gelesen. ``record_id`` bleibt dann bewusst ``None`` – so
    schreibt der Aufrufer einen **neuen** Datensatz unter dem neuen Schluessel,
    statt den alten zu ueberschreiben.
    """
    rec_id, data = read_json(url, hdrs, order_key(bk, datum_iso))
    if data or bk != ALT_BAECKEREI:
        return rec_id, data
    _, alt = read_json(url, hdrs, alt_order_key(datum_iso))
    return None, alt


def bestellungen(url, hdrs, bk=None):
    """Alle Bestellungen – wahlweise nur einer Baeckerei.

    **Einzige** Stelle, die den gemeinsamen Praefix liest. Neue Schluessel
    gewinnen gegenueber alten, falls ein Tag doppelt vorliegt (waehrend der
    Koexistenz kann genau das vorkommen).

    Gibt eine Liste von ``(baeckerei, datum, daten)``, neueste zuerst.
    """
    treffer = {}
    for key, data in read_many(url, hdrs, KEY_ORDER):
        gefunden, datum, alt = schluessel_deuten(key)
        if not gefunden or not datum:
            continue
        if bk and gefunden != bk:
            continue
        vorhanden = treffer.get((gefunden, datum))
        # Neuer Schluessel schlaegt alten.
        if vorhanden is not None and not vorhanden[1]:
            continue
        treffer[(gefunden, datum)] = (data, alt)
    aus = [(b, d, daten) for (b, d), (daten, _alt) in treffer.items()]
    aus.sort(key=lambda t: t[1], reverse=True)
    return aus


# ──────────────────────────────────────────────────────────────────────
#  Fachlogik
# ──────────────────────────────────────────────────────────────────────

def load_config(url, hdrs):
    """Einstellungen ALLER Baeckereien, mit Startwerten aufgefuellt.

    Bruecke: Liegt noch das flache Altobjekt vor (eine Baeckerei), werden dessen
    Werte Freundl zugeordnet und Martin's aus den Vorgaben ergaenzt.
    """
    _, data = read_json(url, hdrs, KEY_CONFIG)
    data = data or {}
    roh = data.get("baeckereien")
    if not isinstance(roh, dict):
        # Altform: alles, was nicht 'baeckereien' ist, gehoert Freundl.
        flach = {k: v for k, v in data.items() if v not in (None, "")}
        roh = {ALT_BAECKEREI: flach} if flach else {}

    aus = {}
    for bk in BAECKEREIEN:
        eintrag = dict(DEFAULT_BAECKEREIEN[bk])
        eintrag.update({k: v for k, v in (roh.get(bk) or {}).items()
                        if v not in (None, "")})
        aus[bk] = eintrag
    return {"baeckereien": aus}


def cfg_von(cfg, bk):
    """Einstellungen einer einzelnen Baeckerei.

    Nimmt sowohl die neue Struktur als auch ein bereits ausgepacktes flaches
    Objekt entgegen – letzteres, damit vorhandene Helfer unveraendert bleiben.
    """
    if isinstance(cfg, dict) and "baeckereien" in cfg:
        return (cfg.get("baeckereien") or {}).get(bk) or dict(DEFAULT_BAECKEREIEN[bk])
    return cfg or dict(DEFAULT_BAECKEREIEN[bk])


def liefert_am(cfg, datum_iso):
    """Welche Baeckereien liefern an diesem Tag? Reihenfolge wie BAECKEREIEN."""
    return [bk for bk in BAECKEREIEN if ist_bestelltag(cfg_von(cfg, bk), datum_iso)]


def load_artikel(url, hdrs, bk):
    """Artikelkatalog einer Baeckerei, aufsteigend nach Nummer.

    Faellt auf die mitgelieferte Startliste zurueck, solange in Dataverse noch
    nichts gepflegt ist. Fuer Freundl greift zuvor die Lesebruecke auf den
    Altschluessel – sonst staende dort der Startkatalog statt der gepflegten
    Artikel.
    """
    _, data = read_json(url, hdrs, artikel_store_key(bk))
    artikel = (data or {}).get("artikel")
    if not artikel and bk == ALT_BAECKEREI:
        _, alt = read_json(url, hdrs, KEY_ARTIKEL)
        artikel = (alt or {}).get("artikel")
    if not artikel:
        pfad = os.path.join(os.path.dirname(os.path.abspath(__file__)),
                            "vorlage", f"katalog-{bk}.json")
        try:
            with open(pfad, encoding="utf-8") as fh:
                artikel = json.load(fh).get("artikel", [])
        except Exception as e:
            logging.warning(f"[baecker] Startkatalog {bk} fehlt: {e}")
            artikel = []
    return sort_artikel(artikel)


def sort_nr(nummer):
    """Sortierschluessel: numerisch aufsteigend, Positionen ohne Nummer ans Ende."""
    s = str(nummer or "").strip()
    return (0, int(s)) if s.isdigit() else (1, 0)


def startwerte(bk):
    """Startwerte aus den Rechnungen, falls fuer diese Baeckerei hinterlegt.

    Fuer Martin's Backstube liegen keine alten Bestellzettel vor, nur
    Rechnungen. Daraus laesst sich keine wochentaggenaue Vorlage gewinnen -
    jede Rechnung fasst eine ganze Woche zusammen. Was bleibt, ist ein
    Durchschnitt je Liefertag (erzeugt von tools/baecker_startwerte_martins.py).

    Er dient nur als **erste Vorbelegung**, solange es fuer den Wochentag noch
    keine echte Bestellung gibt. Sobald eine gesendet wurde, hat sie Vorrang.

    Gibt zurueck: ({schluessel: menge}, {schluessel: stueck_je_woche}, meta)
    """
    pfad = os.path.join(os.path.dirname(os.path.abspath(__file__)),
                        "vorlage", f"startwerte-{bk}.json")
    try:
        with open(pfad, encoding="utf-8") as fh:
            daten = json.load(fh)
    except FileNotFoundError:
        return {}, {}, {}
    except Exception as e:
        logging.warning(f"[baecker] Startwerte {bk} unlesbar: {e}")
        return {}, {}, {}
    mengen, wochen = {}, {}
    for e in daten.get("artikel", []) or []:
        key = str(e.get("nummer") or "").strip() or (e.get("name") or "").strip().lower()
        if not key:
            continue
        mengen[key] = int(e.get("menge") or 0)
        try:
            wochen[key] = float(e.get("je_woche") or 0)
        except (TypeError, ValueError):
            wochen[key] = 0.0
    meta = {"rechnungen": daten.get("rechnungen", 0), "liefertage": daten.get("liefertage", 0)}
    return mengen, wochen, meta


def sort_artikel(artikel):
    return sorted(artikel, key=lambda a: (sort_nr(a.get("nummer")), a.get("name") or ""))


def tour_nr(cfg, datum_iso):
    """Tour-Nummer des Wochentags – bei Freundl faehrt samstags eine andere.

    ``cfg`` ist die Konfiguration **einer** Baeckerei (siehe ``cfg_von``).
    """
    tour = cfg.get("tour_nr")
    if tour in (None, ""):
        return ""
    if isinstance(tour, str):
        return tour
    standard = tour.get("default", "")
    try:
        wd = datetime.strptime(datum_iso, "%Y-%m-%d").weekday()
    except ValueError:
        return standard
    return tour.get(str(wd), standard)


def ist_bestelltag(cfg, datum_iso):
    try:
        wd = datetime.strptime(datum_iso, "%Y-%m-%d").weekday()
    except ValueError:
        return False
    return wd in (cfg.get("bestelltage") or [])


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


def vorlage_bestellungen(url, hdrs, bk, datum_iso, limit=4):
    """Die letzten gesendeten Bestellungen desselben Wochentags, neueste zuerst.

    Grundlage der Vorbelegung (Spec F2): exakt der letzte gleiche Wochentag,
    dazu drei weitere zum Vergleich. **Nur innerhalb derselben Baeckerei** –
    die Kataloge sind verschieden, ein Uebergreifen ergaebe Unsinn.
    """
    try:
        ziel = datetime.strptime(datum_iso, "%Y-%m-%d").date()
    except ValueError:
        return []
    treffer = []
    for _bk, d, data in bestellungen(url, hdrs, bk):
        if not d or d >= datum_iso:
            continue
        if (data or {}).get("status") not in (STATUS_GESENDET, STATUS_KORRIGIERT):
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


def nummer_umziehen(url, hdrs, bk, alt, neu, name=None):
    """Traegt eine geaenderte Artikelnummer in alle Bestellungen nach.

    Positionen werden ueber die Artikelnummer zugeordnet. Ohne dieses
    Nachziehen verlieren gespeicherte Bestellungen den Bezug zum Artikel: Die
    Vorbelegung faenge wieder bei 0 an und die alte Nummer taeuchte als
    Zusatzposition auf. Gibt die Zahl der angepassten Bestellungen zurueck.

    **Nur die eigene Baeckerei.** Beide Haeuser vergeben dieselben Nummern fuer
    verschiedene Artikel – wuerde hier stumpf ueber den gemeinsamen Praefix
    gelesen, schriebe eine Freundl-Aenderung quer in Martin's Bestellungen.
    """
    alt, neu = str(alt or "").strip(), str(neu or "").strip()
    if not alt or alt == neu:
        return 0
    geaendert = 0
    for _bk, datum, data in bestellungen(url, hdrs, bk):
        positionen = (data or {}).get("positionen") or []
        treffer = [p for p in positionen
                   if str(p.get("nummer") or "").strip() == alt]
        if not treffer:
            continue
        for p in treffer:
            p["nummer"] = neu
            if name:
                p["name"] = name
        # Immer auf den NEUEN Schluessel schreiben, auch wenn die Bestellung
        # noch unter dem Altschluessel lag (Lesebruecke).
        key = order_key(bk, datum)
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
