"""Datenschicht der Getraenke-Bestellung (Spec F1, F4, F5, F8, F13).

Wie bei Baecker und Metzger liegt alles als JSON im generischen
Schluessel-/Wert-Speicher ``dl_seiteninhalts``. Dadurch ist **keine
Schema-Aenderung in Dataverse** noetig.

Schluessel::

    getraenke_artikel               Artikelkatalog
    getraenke_config                Einstellungen
    getraenke_order_JJJJ-MM-TT      eine Bestellung je Liefertermin

Fehlt ein Schluessel, liefert das Modul den Startbestand aus ``vorlage/``.
Der Kiosk ist damit ab dem ersten Aufruf brauchbar, auch ohne Seed-Lauf.

Anders als beim Metzger gibt es **keine festen Bestelltage** - bei Kratzer
wird unregelmaessig bestellt (plan.md, Leitentscheidung 1). Statt einer
Tagesleiste traegt die Bestellung einen frei gewaehlten Liefertermin, aus
dem die Kalenderwoche fuer den Betreff entsteht.
"""
import json
import logging
import os
import statistics
from datetime import date, datetime

import msal
import requests

ENTITY = "dl_seiteninhalts"
PK = "dl_seiteninhaltid"

KEY_ARTIKEL = "getraenke_artikel"
KEY_CONFIG = "getraenke_config"
KEY_ORDER = "getraenke_order_"

DEFAULT_URL_SETTING = "DV_DEFAULT_URL"
DEFAULT_URL_FALLBACK = "https://orgab4e2f00.crm16.dynamics.com"

STATUS_ENTWURF, STATUS_GESENDET, STATUS_KORRIGIERT = 0, 1, 2

VORLAGEN = os.path.join(os.path.dirname(os.path.abspath(__file__)), "vorlage")

# Bis zur ausdruecklichen Freigabe geht jede Bestellung an die Testadresse,
# damit keine unfertige Bestellung beim Lieferanten landet (Spec F13).
TESTADRESSE = "jrumpfinger@t-online.de"
LIEFERANT_MAIL = ""        # bestellung@getraenke-kratzer.de - bewusst offen

TAGE = ["Montag", "Dienstag", "Mittwoch", "Donnerstag", "Freitag",
        "Samstag", "Sonntag"]

DEFAULT_CONFIG = {
    "name": "Getr\u00e4nke Kratzer",
    "empfaenger": TESTADRESSE,
    "empfaenger_name": "Test (Getr\u00e4nke-Bestellung)",
    "lieferant_mail": LIEFERANT_MAIL,
    "kd_nr": "15554",
    "tour": "1",
}

MAX_MENGE = 99

# „ueblich" ist der Median der Mengen aus den juengsten UEBLICH_FENSTER
# gesendeten Bestellungen. Ein hartes Fenster (statt Zeitgewichtung wie beim
# Metzger) genuegt hier: Getraenke werden selten und in ganzen Kisten bestellt.
UEBLICH_FENSTER = 8


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
        logging.error(f"[getraenke] token failed: {e}")
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
        "Access-Control-Allow-Methods": "GET, POST, PATCH, OPTIONS",
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
        logging.warning(f"[getraenke] read {key} failed: {e}")
    return "", {}


def write_json(url, hdrs, key, rec_id, data, bezeichnung="Getr\u00e4nke"):
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
        logging.error(f"[getraenke] write {key} failed: {e}")
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
        logging.warning(f"[getraenke] read_many {prefix} failed: {e}")
    return out


# ──────────────────────────────────────────────────────────────────────
#  Startbestand aus der Vorlage
# ──────────────────────────────────────────────────────────────────────

def _vorlage():
    try:
        with open(os.path.join(VORLAGEN, "katalog.json"), encoding="utf-8") as fh:
            return json.load(fh)
    except Exception as e:
        logging.warning(f"[getraenke] Vorlage fehlt: {e}")
        return {}


def vorlage_katalog():
    """50 Artikel aus 9 Rechnungen und 7 Bestellmails."""
    return _vorlage().get("artikel", [])


def gruppen():
    """Reihenfolge der Warengruppen - sie bestimmt auch den Mailaufbau."""
    return _vorlage().get("gruppen", [])


def pfandsaetze():
    return _vorlage().get("pfand", {})


def vorlage_letzte():
    """Die letzte per Hand verschickte Bestellung als Vorlage (Spec F5.4).

    Sie greift nur, solange im System selbst noch nichts gesendet wurde -
    sonst stuende der Laden beim ersten Mal vor einer leeren Liste.
    """
    letzte = _vorlage().get("letzte")
    if not isinstance(letzte, dict) or not letzte.get("positionen"):
        return None
    return {
        "datum": letzte.get("datum", ""),
        "status": STATUS_GESENDET,
        "aus_vorlage": True,
        "positionen": [normalisiere_position(p)
                       for p in letzte.get("positionen", [])],
        "protokoll": [],
    }


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
    return write_json(url, hdrs, KEY_CONFIG, rec_id, cfg,
                      "Getr\u00e4nke Einstellungen")


def testbetrieb(cfg):
    """True, solange die Bestellung nicht an den Lieferanten selbst geht."""
    ziel = (cfg.get("lieferant_mail") or "").strip().lower()
    return not ziel or (cfg.get("empfaenger") or "").strip().lower() != ziel


# ──────────────────────────────────────────────────────────────────────
#  Kalender
# ──────────────────────────────────────────────────────────────────────

def kw(datum_iso):
    """Kalenderwoche nach ISO-8601 - sie steht im Betreff (Spec F1.2)."""
    try:
        return datetime.strptime(datum_iso, "%Y-%m-%d").isocalendar()[1]
    except Exception:
        return 0


def bestellbar(datum_iso):
    """Nur kuenftige Liefertermine lassen sich bestellen.

    Der Riegel sitzt bewusst auch im Server: Ein veralteter Kiosk oder ein
    Doppelklick darf keine sinnlose Bestellung ausloesen (Spec F1.3).
    """
    try:
        return datetime.strptime(datum_iso, "%Y-%m-%d").date() > date.today()
    except (ValueError, TypeError):
        return False


def datum_de(datum_iso):
    try:
        return datetime.strptime(datum_iso, "%Y-%m-%d").strftime("%d.%m.%Y")
    except Exception:
        return datum_iso


def wochentag(datum_iso):
    try:
        return TAGE[datetime.strptime(datum_iso, "%Y-%m-%d").weekday()]
    except Exception:
        return ""


def vorschlagstermin(heute=None):
    """Naechster Montag - der uebliche Liefertag der Tour 1.

    Nur eine Vorbelegung des Datumsfelds; frei aenderbar (Spec F1.1).
    """
    heute = heute or date.today()
    tage = 7 - heute.weekday() or 7          # heute Montag -> naechster Montag
    return date.fromordinal(heute.toordinal() + tage).isoformat()


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
                      "Getr\u00e4nke Artikel")


def _stat_schluessel(nummer, name):
    """Gemeinsamer Schluessel fuer Katalog und Position (Nummer, sonst Name)."""
    nr = str(nummer or "").strip()
    return nr if nr else (name or "").strip().lower()


def basis_statistik():
    """Der Startbestand aus der E-Mail-Auswertung als Grundlage.

    ``tools/getraenke_katalog_build.py`` hat aus sieben echten Bestellmails
    Haeufigkeit und uebliche Menge je Artikel gewonnen. Diese Zahlen sind die
    **Basis**; was seither im Kiosk bestellt wird, kommt obendrauf.

    Sie duerfen nicht ueberschrieben werden: Die Mailbestellungen liegen nicht
    im Order-Store, also faellt die ganze Auswertung weg, sobald man allein
    aus dem Store ableitet - genau das ist beim ersten Versand passiert
    (``Augustiner Hell`` fiel von 4/25 auf 0/None).
    """
    basis = {}
    for a in vorlage_katalog():
        key = _stat_schluessel(a.get("nummer"), a.get("name"))
        if not key:
            continue
        basis[key] = {"bestellungen": int(a.get("bestellungen") or 0),
                      "ueblich": a.get("ueblich")}
    return basis


def statistik_aktualisieren(artikel, alle_bestellungen):
    """`bestellungen` und `ueblich` je Artikel fortschreiben.

    Grundlage ist die E-Mail-Auswertung (``basis_statistik``); die im Kiosk
    gesendeten Bestellungen kommen hinzu. Abgeleitet wird aus dem Order-Store,
    nicht als loser Zaehler (Spec F6): So zaehlt ein Termin auch nach einer
    Korrektur genau einmal (Spec F5).

    - ``bestellungen``: Basis + Zahl verschiedener gesendeter/korrigierter
      Termine, in denen der Artikel mit Menge > 0 vorkam.
    - ``ueblich``: Sobald **zwei** Termine im Store vorliegen, zaehlt die
      gelebte Praxis - der Median der juengsten ``UEBLICH_FENSTER`` Mengen.
      Darunter bleibt der Wert aus der E-Mail-Auswertung stehen.

    Einmalige Zusatzpositionen (``zusatz``) zaehlen nicht (Spec F4).
    Gibt die (in place) veraenderte Artikelliste zurueck.
    """
    gesendet = [o for o in (alle_bestellungen or [])
                if o.get("status") in (STATUS_GESENDET, STATUS_KORRIGIERT)]
    gesendet.sort(key=lambda o: o.get("datum", ""), reverse=True)  # neueste zuerst

    counts = {}          # schluessel -> Zahl der Termine
    werte = {}           # schluessel -> Mengen, neueste zuerst
    for o in gesendet:
        gesehen = set()
        for roh in o.get("positionen", []):
            p = normalisiere_position(roh)
            if p.get("zusatz") or not bestellt(p):
                continue
            key = _stat_schluessel(p.get("nummer"), p.get("name"))
            if not key or key in gesehen:
                continue
            gesehen.add(key)
            counts[key] = counts.get(key, 0) + 1
            werte.setdefault(key, []).append(p["menge"])

    basis = basis_statistik()
    for a in artikel:
        if a.get("zusatz"):
            continue
        key = _stat_schluessel(a.get("nummer"), a.get("name"))
        b = basis.get(key) or {}
        reihe = werte.get(key, [])[:UEBLICH_FENSTER]
        a["bestellungen"] = int(b.get("bestellungen") or 0) + counts.get(key, 0)
        # Kaufmaennisch runden (round-half-up); Mengen sind stets positiv.
        median = int(statistics.median(reihe) + 0.5) if reihe else None
        if len(reihe) >= 2:
            a["ueblich"] = median              # gelebte Praxis schlaegt die Altdaten
        elif b.get("ueblich"):
            a["ueblich"] = b["ueblich"]
        else:
            a["ueblich"] = median
    return artikel


def artikel_nach_nummer(artikel):
    """Nachschlagewerk. Die Nummern sind bei Kratzer Zeichenketten (``KA40015``)."""
    return {str(a.get("nummer") or ""): a for a in artikel if a.get("nummer")}


# ──────────────────────────────────────────────────────────────────────
#  Positionen und Summen
# ──────────────────────────────────────────────────────────────────────

def normalisiere_position(roh):
    """Eine Position auf die erwarteten Felder bringen.

    Getraenke laufen ausschliesslich in ganzen Kisten - deshalb genuegt eine
    Menge je Zeile (plan.md, Leitentscheidung 2).
    """
    if not isinstance(roh, dict):
        return {"nummer": "", "name": "", "menge": 0}
    try:
        menge = int(float(roh.get("menge") or 0))
    except (TypeError, ValueError):
        menge = 0
    menge = max(0, min(MAX_MENGE, menge))
    preis = roh.get("preis")
    try:
        preis = round(float(preis), 2) if preis not in (None, "") else None
    except (TypeError, ValueError):
        preis = None
    return {
        "nummer": str(roh.get("nummer") or ""),
        "name": (roh.get("name") or "").strip(),
        "bestelltext": (roh.get("bestelltext") or "").strip(),
        "gebinde": (roh.get("gebinde") or "").strip(),
        "gruppe": (roh.get("gruppe") or "").strip(),
        "menge": menge,
        "preis": preis,
        "zusatz": bool(roh.get("zusatz")),
    }


def bestellt(pos):
    return pos.get("menge", 0) > 0


def summen(positionen, pfand=None):
    """Kisten, Positionen, geschaetzter Warenwert und hoechstmoegliches Pfand.

    Der Wert ist ausdruecklich eine Schaetzung: Kratzer passt Preise
    unterjaehrig an (Spec F8.2). Das Pfand heisst ``max``, weil nur berechnet
    wird, was nicht als Leergut zurueckgeht (Spec F8.4).
    """
    pfand = pfand or {}
    kisten = wert = pfandwert = 0
    anzahl = ohne_preis = 0
    for p in positionen:
        menge = p.get("menge", 0)
        if menge <= 0:
            continue
        anzahl += 1
        kisten += menge
        preis = p.get("preis")
        if preis is None:
            ohne_preis += 1
        else:
            wert += menge * preis
        satz = pfand.get(p.get("gebinde") or "")
        if satz:
            pfandwert += menge * satz
    return {
        "kisten": kisten,
        "positionen": anzahl,
        "wert": round(wert, 2),
        "pfand": round(pfandwert, 2),
        "ohne_preis": ohne_preis,
    }


# ──────────────────────────────────────────────────────────────────────
#  Bestellungen
# ──────────────────────────────────────────────────────────────────────

def order_key(datum_iso):
    return f"{KEY_ORDER}{datum_iso}"


def load_order(url, hdrs, datum_iso):
    return read_json(url, hdrs, order_key(datum_iso))


def save_order(url, hdrs, rec_id, order):
    return write_json(url, hdrs, order_key(order.get("datum", "")), rec_id,
                      order, f"Getr\u00e4nke {order.get('datum', '')}")


def bestellungen(url, hdrs):
    """Alle Bestellungen, absteigend nach Liefertermin."""
    out = []
    for key, data in read_many(url, hdrs, KEY_ORDER):
        datum = key[len(KEY_ORDER):]
        if not datum:
            continue
        data.setdefault("datum", datum)
        out.append(data)
    out.sort(key=lambda o: o.get("datum", ""), reverse=True)
    return out


def letzte_bestellung(alle):
    """Die zuletzt gesendete Bestellung - Vorlage fuer die naechste (Spec F5).

    Anders als beim Metzger wird **nicht** nach Wochentag gesucht: Bei
    Abstaenden von sechs bis sechsundzwanzig Wochen gibt es keinen Rhythmus,
    den man treffen koennte (plan.md, Leitentscheidung 4).
    """
    for o in alle:                       # bereits absteigend sortiert
        if o.get("status") in (STATUS_GESENDET, STATUS_KORRIGIERT):
            return o
    return vorlage_letzte()


def entwurf_positionen(vorlage):
    """Positionen einer Vorlage uebernehmen - ohne einmalige Artikel.

    Einmalig angelegte Artikel gelten ausdruecklich nur fuer eine Bestellung
    (Spec F7.6) und duerfen die naechste nicht verfaelschen.
    """
    if not vorlage:
        return []
    out = []
    for p in vorlage.get("positionen", []):
        p = normalisiere_position(p)
        if p.get("zusatz") or not bestellt(p):
            continue
        out.append(p)
    return out
