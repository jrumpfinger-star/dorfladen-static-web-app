"""Datenschicht der Drax-Bestellung (Spec F1-F11).

Wie bei Baecker und Metzger liegt alles als JSON im generischen
Schluessel-/Wert-Speicher ``dl_seiteninhalts``. Dadurch ist **keine
Schema-Aenderung in Dataverse** noetig.

Schluessel::

    drax_artikel                  Artikelkatalog (96 Artikel)
    drax_config                   Einstellungen
    drax_order_JJJJ-MM-TT         eine Bestellung je Liefertag

Fehlt ein Schluessel, liefert das Modul den Startbestand aus ``vorlage/``.
Der Kiosk ist damit ab dem ersten Aufruf brauchbar, auch ohne Seed-Lauf.

**Ein Lieferant, kein Parameter.** Anders als beim Baecker (Freundl und
Martin's) beliefert nur die Drax Muehle den Laden. Der Schluessel traegt
deshalb keinen Lieferantenteil - das erspart die Praefix-Fallstricke, die
``baecker_order_`` mit sich bringt.

**Der Modulname ist bewusst praefixiert.** Azure Functions (Python v1) legt
alle Function-Ordner in denselben ``sys.path``. Ein zweites ``store.py``
wuerde das des Baeckers verdecken.
"""
import json
import logging
import os
import sys
from datetime import datetime, timedelta

import msal
import requests

# ``shared`` liegt eine Ebene hoeher. Der Pfad wird hier selbst gesetzt, damit
# drax_store.py auch dann laedt, wenn es direkt importiert wird
# (Pruefwerkzeuge in tools/) und nicht ueber die Azure-Function.
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from shared.zeit import heute_lokal, jetzt_lokal  # noqa: E402

ENTITY = "dl_seiteninhalts"
PK = "dl_seiteninhaltid"

KEY_ARTIKEL = "drax_artikel"
KEY_CONFIG = "drax_config"
KEY_ORDER = "drax_order_"

DEFAULT_URL_SETTING = "DV_DEFAULT_URL"
DEFAULT_URL_FALLBACK = "https://orgab4e2f00.crm16.dynamics.com"

STATUS_ENTWURF, STATUS_GESENDET, STATUS_KORRIGIERT = 0, 1, 2

VORLAGEN = os.path.join(os.path.dirname(os.path.abspath(__file__)), "vorlage")

# Bis zur ausdruecklichen Freigabe geht jede Bestellung an die Testadresse,
# damit keine unfertige Bestellung bei der Muehle landet.
TESTADRESSE = "jrumpfinger@t-online.de"

# Die echte Bestelladresse ist **bestaetigt** (06.10.2026): Der Betreiber hat
# mit der Muehle geklaert, dass Bestellungen unter info@drax-muehle.de
# angenommen werden. Das ist die Vorgabe; im CMS laesst sie sich aendern -
# genau wie bei Metzger, Baecker und Getraenken.
DRAX_MAIL = "info@drax-muehle.de"

TAGE = ["Montag", "Dienstag", "Mittwoch", "Donnerstag", "Freitag",
        "Samstag", "Sonntag"]

DEFAULT_CONFIG = {
    "name": "Drax M\u00fchle",
    "empfaenger": TESTADRESSE,
    "empfaenger_name": "Test (Drax-Bestellung)",
    "drax_mail": DRAX_MAIL,
    "kd_nr": "11225",
    "liefertag": 3,                   # Donnerstag (Montag = 0)
    "bestellschluss_tag": 2,          # Mittwoch
    "bestellschluss": "12:00",
    "format": "pdf",
    "vorbelegung": "letzte",
    "anschrift": [
        "Dorfladen Oberornau",
        "Oberornau 8",
        "83552 Obing",
    ],
}

# Wie viele Liefertage die Tagesleiste zeigt (Spec F1).
LIEFERTAGE_VORAUS = 4


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
        logging.error(f"[drax] token failed: {e}")
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
        logging.warning(f"[drax] read {key} failed: {e}")
    return "", {}


def write_json(url, hdrs, key, rec_id, data, bezeichnung="Drax"):
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
        logging.error(f"[drax] write {key} failed: {e}")
        return False


def delete_json(url, hdrs, rec_id):
    """Loescht einen Datensatz. Ein bereits fehlender gilt als geloescht."""
    if not rec_id:
        return False
    try:
        r = requests.delete(
            f"{url}/api/data/v9.2/{ENTITY}({rec_id})",
            headers={**hdrs, "If-Match": "*"}, timeout=30,
        )
        return r.status_code in (200, 204, 404)
    except Exception as e:
        logging.error(f"[drax] delete {rec_id} failed: {e}")
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
        logging.warning(f"[drax] read_many {prefix} failed: {e}")
    return out


# ──────────────────────────────────────────────────────────────────────
#  Startbestand aus den Vorlagen
# ──────────────────────────────────────────────────────────────────────

def _vorlage(name):
    try:
        with open(os.path.join(VORLAGEN, name), encoding="utf-8") as fh:
            return json.load(fh)
    except Exception as e:
        logging.warning(f"[drax] Vorlage {name} fehlt: {e}")
        return {}


def vorlage_katalog():
    """96 Artikel aus Kassen-Export und Rechnungen."""
    return _vorlage("katalog-drax.json").get("artikel", [])


def vorlage_gruppen():
    """Die neun Warengruppen in ihrer festen Reihenfolge.

    Die Reihenfolge stammt aus der Bestellhaeufigkeit und ist die, in der das
    Papierblatt gelesen wurde. Alphabetisch zu ordnen wuerde sie ohne Gewinn
    zerreissen.
    """
    return _vorlage("katalog-drax.json").get("gruppen", [])


def vorlage_startwerte():
    """Mengen der letzten aus den Rechnungen bekannten Lieferung (F2)."""
    daten = _vorlage("startwerte-drax.json")
    return daten.get("mengen", {}) or {}, daten.get("grundlage", "")


def vorlage_historie():
    """Die sieben aus den Rechnungen gewonnenen Lieferungen (F9).

    Sie erscheinen im Verlauf, solange es noch keine eigenen Bestellungen
    gibt - sonst staende der Reiter beim Live-Gang leer da, obwohl der Laden
    seit Wochen bei Drax bestellt.
    """
    return _vorlage("lieferhistorie.json").get("lieferungen", []) or []


# ──────────────────────────────────────────────────────────────────────
#  Konfiguration
# ──────────────────────────────────────────────────────────────────────

def load_config(url, hdrs):
    rec_id, data = read_json(url, hdrs, KEY_CONFIG)
    cfg = dict(DEFAULT_CONFIG)
    if isinstance(data, dict):
        cfg.update({k: v for k, v in data.items() if v is not None})
    # Ein leer gespeichertes `drax_mail` stammt aus der Testzeit, in der die
    # Adresse noch unbestaetigt war. Es ist keine Einstellung, sondern ein
    # Ueberbleibsel - und "" ist nicht None, haette die Vorgabe oben also
    # still ueberschrieben. Ein im CMS gepflegter Wert gewinnt weiterhin.
    #
    # Folge: Das Leeren des Feldes fuehrt NICHT in den Testbetrieb zurueck.
    # Dafuer traegt man eine andere Adresse als Empfaenger ein - genau wie
    # bei Metzger, Baecker und Getraenken.
    if not (cfg.get("drax_mail") or "").strip():
        cfg["drax_mail"] = DRAX_MAIL
    cfg["_rec_id"] = rec_id
    return cfg


def save_config(url, hdrs, cfg):
    rec_id = cfg.pop("_rec_id", "")
    return write_json(url, hdrs, KEY_CONFIG, rec_id, cfg,
                      "Drax Einstellungen")


def testbetrieb(cfg):
    """True, solange die Bestellung nicht an die Muehle selbst geht.

    Eine Wahrheit fuer alle Aufrufer: Versand, Formular und Kiosk. Zwei
    Dinge muessen zusammenkommen: ``drax_mail`` traegt die im Quelltext
    freigegebene Adresse (siehe ``DRAX_MAIL``), und in den Einstellungen
    steht genau dieselbe. Ein Tippfehler im Kiosk faellt damit nicht der
    Muehle zur Last, sondern landet in der Testablage.
    """
    ziel = (cfg.get("drax_mail") or "").strip().lower()
    return not ziel or (cfg.get("empfaenger") or "").strip().lower() != ziel


# ──────────────────────────────────────────────────────────────────────
#  Kalender: Liefertage und Bestellschluss (F1, F8)
# ──────────────────────────────────────────────────────────────────────

def _tag(datum_iso):
    try:
        return datetime.strptime(datum_iso, "%Y-%m-%d").date()
    except (ValueError, TypeError):
        return None


def liefertag_nr(cfg):
    """Wochentag der Lieferung, 0 = Montag. Vorgabe Donnerstag."""
    try:
        return int(cfg.get("liefertag", DEFAULT_CONFIG["liefertag"]))
    except (TypeError, ValueError):
        return DEFAULT_CONFIG["liefertag"]


def ist_liefertag(cfg, datum_iso):
    d = _tag(datum_iso)
    return bool(d) and d.weekday() == liefertag_nr(cfg)


def naechster_liefertag(cfg, ab=None):
    """Der naechste Liefertag ab **morgen** (bzw. ab dem angegebenen Datum).

    Fuer heute ist die Ware laengst unterwegs; eine Bestellung darauf waere
    sinnlos.
    """
    start = ab or (heute_lokal() + timedelta(days=1))
    ziel = liefertag_nr(cfg)
    versatz = (ziel - start.weekday()) % 7
    return (start + timedelta(days=versatz)).isoformat()


def naechste_liefertage(cfg, anzahl=LIEFERTAGE_VORAUS, ab=None):
    """Die naechsten Liefertage als ISO-Daten, aufsteigend (F1)."""
    erster = _tag(naechster_liefertag(cfg, ab))
    if not erster:
        return []
    return [(erster + timedelta(days=7 * i)).isoformat()
            for i in range(max(1, int(anzahl)))]


def bestellschluss_zeitpunkt(cfg, datum_iso):
    """Wann die Bestellung fuer diesen Liefertag spaetestens raus muss.

    Mittwoch 12:00 vor dem Donnerstag - also der in der Konfiguration
    genannte Wochentag in der Woche **vor** dem Liefertag, hoechstens sieben
    Tage davor. Gibt einen Zeitpunkt **mit** Zeitzone, damit der Vergleich
    mit ``jetzt_lokal()`` stimmt (siehe shared/zeit.py).
    """
    d = _tag(datum_iso)
    if not d:
        return None
    try:
        schluss_wd = int(cfg.get("bestellschluss_tag",
                                 DEFAULT_CONFIG["bestellschluss_tag"]))
    except (TypeError, ValueError):
        schluss_wd = DEFAULT_CONFIG["bestellschluss_tag"]

    # Rueckwaerts bis zum passenden Wochentag; faellt er auf den Liefertag
    # selbst, gilt die volle Woche davor.
    versatz = (d.weekday() - schluss_wd) % 7 or 7
    tag = d - timedelta(days=versatz)

    zeit = str(cfg.get("bestellschluss") or DEFAULT_CONFIG["bestellschluss"])
    try:
        stunde, minute = (int(x) for x in zeit.split(":")[:2])
    except (ValueError, TypeError):
        stunde, minute = 12, 0
    from shared.zeit import zone
    return datetime(tag.year, tag.month, tag.day, stunde, minute,
                    tzinfo=zone())


def schluss_verstrichen(cfg, datum_iso, jetzt=None):
    """True, wenn der Bestellschluss fuer diesen Liefertag vorbei ist (F8)."""
    ziel = bestellschluss_zeitpunkt(cfg, datum_iso)
    if not ziel:
        return False
    return (jetzt or jetzt_lokal()) > ziel


def bestellbar(datum_iso):
    """Nur kuenftige Liefertage lassen sich bestellen.

    Der Riegel sitzt bewusst auch im Server: Ein veralteter Kiosk oder ein
    Doppelklick darf keine sinnlose Bestellung ausloesen.
    """
    d = _tag(datum_iso)
    return bool(d) and d > heute_lokal()


def korrektur_moeglich(cfg, datum_iso):
    """True, solange der Liefertag noch aussteht.

    Fuer bereits gelieferte Tage waere eine Korrektur sinnlos - die Ware
    steht dann schon im Regal.
    """
    return bestellbar(datum_iso)


def datum_de(datum_iso):
    d = _tag(datum_iso)
    return d.strftime("%d.%m.%Y") if d else (datum_iso or "")


def wochentag(datum_iso):
    d = _tag(datum_iso)
    return TAGE[d.weekday()] if d else ""


# ──────────────────────────────────────────────────────────────────────
#  Artikelkatalog (F4, F10)
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
                      "Drax Artikel")


def nach_gruppe_und_nummer(artikel, gruppen=None):
    """Artikel nach Warengruppe, darin nach Artikelnummer (Spec F4).

    Dieselbe Ordnung wie im Kiosk. Beide muessen uebereinstimmen: Wer am
    Schirm erfasst, prueft danach das Formular - laufen die Listen
    auseinander, muss man bei jeder Zeile suchen.

    Innerhalb einer Gruppe steigt die Artikelnummer. Das ist die Ordnung des
    Papierblatts und der Rechnung der Muehle; beim Abhaken laeuft das Auge
    dadurch in beiden Listen gleich.
    """
    folge = {}
    for g in (gruppen if gruppen is not None else vorlage_gruppen()):
        kennung = g.get("id") if isinstance(g, dict) else str(g)
        if kennung:
            folge.setdefault(kennung, len(folge))
    # Gruppen, die im Katalog auftauchen, aber in der Liste fehlen, hinten an.
    for a in artikel:
        g = a.get("gruppe") or ""
        folge.setdefault(g, len(folge))

    def schluessel(a):
        nr = str(a.get("nr") or "").strip()
        # Rein numerische Nummern zahlenmaessig, alles andere alphabetisch
        # dahinter - sonst stuende "9" hinter "40401".
        if nr.isdigit():
            rang = (0, int(nr), "")
        else:
            rang = (1, 0, nr.lower())
        return (folge.get(a.get("gruppe") or "", 999),) + rang

    return sorted(artikel, key=schluessel)


def artikel_map(artikel):
    """Artikelnummer -> Artikel, fuer schnelles Nachschlagen."""
    return {str(a.get("nr") or "").strip(): a
            for a in artikel if str(a.get("nr") or "").strip()}


def nummer_frei(artikel, nr):
    """True, wenn die Artikelnummer noch nicht vergeben ist (F10)."""
    nr = str(nr or "").strip()
    return bool(nr) and nr not in artikel_map(artikel)


# ──────────────────────────────────────────────────────────────────────
#  Positionen (F3)
# ──────────────────────────────────────────────────────────────────────

def normalisiere_positionen(roh, erlaubt=None):
    """Positionen pruefen und saeubern.

    * Mengen werden zu ganzen Zahlen; alles Unlesbare gilt als 0.
    * Positionen mit Menge 0 fallen weg - eine Null ist keine Bestellung.
    * Unbekannte Artikelnummern fallen weg, falls ``erlaubt`` gesetzt ist.
    * Dieselbe Nummer zweimal wird zu **einer** Position addiert; sonst
      staende der Artikel zweimal auf dem Blatt und die Muehle liefert
      doppelt.

    Der Riegel sitzt bewusst im Server: Der Kiosk filtert dasselbe schon,
    aber ein veralteter Browser darf keine kaputte Bestellung erzeugen.
    """
    summe = {}
    reihenfolge = []
    for p in (roh or []):
        nr = str((p or {}).get("nr") or "").strip()
        if not nr:
            continue
        if erlaubt is not None and nr not in erlaubt:
            continue
        try:
            menge = int(float(p.get("menge") or 0))
        except (TypeError, ValueError):
            menge = 0
        if menge <= 0:
            continue
        if nr not in summe:
            summe[nr] = 0
            reihenfolge.append(nr)
        summe[nr] += menge
    return [{"nr": nr, "menge": summe[nr]} for nr in reihenfolge]


def positionen_map(order):
    """Positionen einer Bestellung als {Artikelnummer: Menge}."""
    out = {}
    for p in (order or {}).get("positionen", []) or []:
        nr = str(p.get("nr") or "").strip()
        if nr:
            try:
                out[nr] = int(p.get("menge") or 0)
            except (TypeError, ValueError):
                continue
    return out


def summen(positionen):
    """Positionen und Stueck - die beiden Zahlen der Fussleiste und des Blattes."""
    stueck = 0
    for p in positionen or []:
        try:
            stueck += int(p.get("menge") or 0)
        except (TypeError, ValueError):
            continue
    return {"positionen": len(positionen or []), "stueck": stueck}


# ──────────────────────────────────────────────────────────────────────
#  Bestellungen (F2, F6, F7, F9)
# ──────────────────────────────────────────────────────────────────────

def order_key(datum_iso):
    return f"{KEY_ORDER}{datum_iso}"


def load_order(url, hdrs, datum_iso):
    return read_json(url, hdrs, order_key(datum_iso))


def save_order(url, hdrs, rec_id, order):
    return write_json(url, hdrs, order_key(order["datum"]), rec_id, order,
                      f"Drax Bestellung {order['datum']}")


def bestellungen(url, hdrs):
    """Alle Bestellungen, absteigend nach Liefertag."""
    out = []
    for key, data in read_many(url, hdrs, KEY_ORDER):
        datum = key[len(KEY_ORDER):]
        if not datum or not _tag(datum):
            continue
        data.setdefault("datum", datum)
        out.append(data)
    out.sort(key=lambda o: o.get("datum", ""), reverse=True)
    return out


def gesendet(order):
    return (order or {}).get("status") in (STATUS_GESENDET, STATUS_KORRIGIERT)


def vorlage_bestellung(alle, datum_iso):
    """Die letzte gesendete Bestellung **vor** diesem Liefertag (F2).

    Anders als beim Metzger wird **nicht** nach Wochentag gesucht: Drax
    liefert immer donnerstags, ein Wochentagsvergleich waere eine Bedingung
    ohne Wirkung. Die eine Ausnahme in den Rechnungen (Montag, 17.08.2026)
    soll gerade nicht ausgeschlossen werden - auch sie ist eine echte
    Lieferung und taugt als Vorlage.

    Bewusst kein Mittelwert: Die Verkaeuferin soll nachvollziehen koennen,
    woher ein Wert stammt.
    """
    for o in alle or []:                     # bereits absteigend sortiert
        d = o.get("datum", "")
        if d and d < datum_iso and gesendet(o):
            return o
    return None


def vorbelegung(alle, datum_iso, erlaubt=None):
    """Mengen fuer einen neuen Entwurf samt Herkunftsangabe (F2).

    Vorrang hat die letzte eigene Bestellung. Gibt es noch keine, greifen die
    aus den Rechnungen gewonnenen Startwerte - sonst staende der Laden beim
    ersten Mal vor einer leeren Liste, obwohl die Lieferhistorie vorliegt.

    Gibt ``(positionen, herkunft)``. Jede Position traegt ``uebernommen``,
    damit der Kiosk sie kennzeichnen kann.
    """
    quelle = vorlage_bestellung(alle, datum_iso)
    if quelle:
        mengen = positionen_map(quelle)
        herkunft = {
            "art": "bestellung",
            "datum": quelle.get("datum", ""),
            "text": ("\u00fcbernommen von der Bestellung am "
                     f"{datum_de(quelle.get('datum', ''))}"),
        }
    else:
        mengen, grundlage = vorlage_startwerte()
        if not mengen:
            return [], {"art": "keine", "datum": "",
                        "text": "keine Vorlage vorhanden"}
        herkunft = {
            "art": "lieferung",
            "datum": grundlage,
            "text": ("\u00fcbernommen von der Lieferung am "
                     f"{datum_de(grundlage)}"),
        }

    positionen = []
    for nr, menge in mengen.items():
        if erlaubt is not None and nr not in erlaubt:
            continue
        if menge > 0:
            positionen.append({"nr": nr, "menge": menge, "uebernommen": True})
    return positionen, herkunft


def neuer_entwurf(datum_iso, positionen=None, herkunft=None):
    return {
        "datum": datum_iso,
        "status": STATUS_ENTWURF,
        "positionen": positionen or [],
        "herkunft": herkunft or {},
        "protokoll": [],
    }


def protokoll_eintrag(was, an="", wer="Kiosk"):
    from shared.zeit import stempel_lokal
    return {"zeit": stempel_lokal(), "was": was, "an": an, "wer": wer}


def verlauf(alle, katalog=None, liefertag=None):
    """Lieferungen und Bestellungen fuer den Verlaufsreiter (F9).

    Eigene Bestellungen stehen vorn; fuer Tage, zu denen es keine gibt, wird
    die aus den Rechnungen gewonnene Lieferung ergaenzt. Ein Tag, der nicht
    auf den eingestellten Liefertag faellt, wird als Ausnahme gekennzeichnet
    - genau das ist beim Montag, 17.08.2026, der Fall.
    """
    namen = artikel_map(katalog or [])
    ziel_wd = liefertag if liefertag is not None else DEFAULT_CONFIG["liefertag"]
    zeilen = {}

    for o in alle or []:
        datum = o.get("datum", "")
        if not datum:
            continue
        pos = o.get("positionen") or []
        zeilen[datum] = {
            "datum": datum,
            "wochentag": wochentag(datum),
            "quelle": "bestellung",
            "status": o.get("status", STATUS_ENTWURF),
            "hat_dokument": bool(o.get("dokument")),
            **summen(pos),
        }

    for lief in vorlage_historie():
        datum = lief.get("datum", "")
        if not datum or datum in zeilen:
            continue
        pos = lief.get("positionen") or []
        zeilen[datum] = {
            "datum": datum,
            "wochentag": lief.get("wochentag") or wochentag(datum),
            "quelle": "lieferung",
            "rechnung": lief.get("rechnung", ""),
            "status": STATUS_GESENDET,
            "hat_dokument": False,
            **summen(pos),
        }

    aus = []
    for datum in sorted(zeilen, reverse=True):
        zeile = zeilen[datum]
        d = _tag(datum)
        zeile["ausnahme"] = bool(d) and d.weekday() != ziel_wd
        aus.append(zeile)
    return aus


def positionen_mit_namen(positionen, katalog):
    """Positionen um Name, Einheit und Gruppe aus dem Katalog ergaenzen.

    Der Name wird **nicht** in der Bestellung gespeichert, sondern immer
    frisch nachgeschlagen: Korrigiert jemand eine Schreibweise im
    Artikelreiter, soll das auch auf einem spaeter geoeffneten Formular
    stehen. Eine Position ohne Katalogtreffer behaelt ihre Nummer als Namen -
    sie verschwindet nicht stillschweigend vom Blatt.
    """
    namen = artikel_map(katalog or [])
    aus = []
    for p in positionen or []:
        nr = str(p.get("nr") or "").strip()
        a = namen.get(nr) or {}
        aus.append({
            "nr": nr,
            "menge": int(p.get("menge") or 0),
            "name": a.get("name") or p.get("name") or f"Artikel {nr}",
            "einheit": a.get("einheit", ""),
            "gruppe": a.get("gruppe", ""),
            "uebernommen": bool(p.get("uebernommen")),
        })
    return aus
