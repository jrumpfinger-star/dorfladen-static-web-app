"""Endpunkt der Metzger-Bestellung (Spec F1, F7, F11, F12, F14, F15).

Routen (``metzger-order/{datum?}/{aktion?}``)::

    GET  /api/metzger-order                    Uebersicht: Tage, Konfiguration
    GET  /api/metzger-order?mode=verlauf       gesendete Bestellungen
    GET  /api/metzger-order/2026-08-31         Entwurf inkl. Vorbelegung
    GET  /api/metzger-order/2026-08-31/dokument   gesendetes PDF
    POST /api/metzger-order/2026-08-31/speichern
    POST /api/metzger-order/2026-08-31/senden
    POST /api/metzger-order/2026-08-31/korrektur
    POST /api/metzger-order/config

Schreibende Aufrufe laufen durch ``admin_auth_guard``.
"""
import base64
import importlib.util
import json
import logging
import os
import re
import sys
from datetime import datetime

import azure.functions as func

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from shared.auth import admin_auth_guard  # noqa: E402
import metzger_portionen as P              # noqa: E402
import metzger_store as store              # noqa: E402
from metzger_pdf import build_pdf          # noqa: E402

PDF_MIME = "application/pdf"
ANHANG_NAME = "Bestellung-Metzger-Mair.pdf"

DATUM = re.compile(r"^\d{4}-\d{2}-\d{2}$")


def _err(msg, status=400):
    return func.HttpResponse(
        json.dumps({"success": False, "error": msg}, ensure_ascii=False),
        status_code=status, headers=store.cors_headers(),
    )


def _ok(payload, status=200):
    body = {"success": True}
    body.update(payload)
    return func.HttpResponse(
        json.dumps(body, ensure_ascii=False),
        status_code=status, headers=store.cors_headers(),
    )


def _send_mail(to_email, to_name, subject, body_text, anhang):
    """Mailversand ueber den bestehenden Graph-Weg aus shop-notify."""
    pfad = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
                        "shop-notify", "__init__.py")
    spec = importlib.util.spec_from_file_location("shop_notify_mail", pfad)
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    return mod.send_email(
        to_email, to_name, subject, body_text,
        attachments=[{"name": ANHANG_NAME, "content": anhang, "type": PDF_MIME}],
        # Kein Shop-Knopf: Der Metzger bestellt nicht in unserem Laden.
        mit_shop_link=False,
    )


def _mail_text(datum_iso, cfg, positionen, korrektur=False):
    """Positionsliste im Klartext; das Formular liegt zusaetzlich als PDF bei."""
    einleitung = ("anbei die Korrektur unserer Bestellung"
                  if korrektur else "anbei unsere Bestellung")
    zeilen = []
    for p in positionen:
        text = P.position_text(p)
        if text:
            nr = f"{p['nummer']} " if p.get("nummer") else ""
            zeilen.append(f"  {nr}{p.get('name', '')} \u2014 {text}")
    s = P.summen(positionen)
    return (
        f"Guten Tag,\n\n"
        f"{einleitung} f\u00fcr {store.wochentag(datum_iso)}, "
        f"den {store.datum_de(datum_iso)}.\n"
        f"Kd.-Nr. {cfg.get('kd_nr', '')}\n\n"
        + "\n".join(zeilen) + "\n\n"
        f"Davon vakuumiert: {s['vakuum']} Portionen\n"
        f"Gesamt: {s['positionen']} Positionen, "
        f"{('%.1f' % s['kg']).replace('.', ',')} kg\n\n"
        f"Das vollst\u00e4ndige Formular finden Sie im Anhang.\n\n"
        f"Mit freundlichen Gr\u00fc\u00dfen\n"
        f"Dorfladen Oberornau"
    )


def _positionen_aus(body):
    """Positionen aus dem Request saeubern und Leeres verwerfen."""
    out = []
    for roh in (body.get("positionen") or []):
        p = P.normalisiere_position(roh)
        if P.bestellt(p):
            out.append(p)
    return out


def _entwurf(url, hdrs, cfg, datum_iso):
    """Bestellung laden oder aus dem letzten gleichen Wochentag vorbelegen."""
    rec_id, order = store.load_order(url, hdrs, datum_iso)
    alle = store.bestellungen(url, hdrs)
    quelle = None
    if not order:
        vorlage = store.vorlage_bestellung(alle, datum_iso)
        order = {
            "datum": datum_iso,
            "status": store.STATUS_ENTWURF,
            "positionen": store.entwurf_positionen(vorlage),
            "protokoll": [],
        }
        quelle = vorlage.get("datum") if vorlage else None
    order.setdefault("datum", datum_iso)
    order.setdefault("status", store.STATUS_ENTWURF)
    order.setdefault("positionen", [])
    order.setdefault("protokoll", [])
    order.pop("dokument", None)             # das PDF geht nicht in die Liste
    return rec_id, order, quelle, store.letzte_bestellung(alle)


def _letzte_werte(letzte):
    """Die letzte Bestellung als Nachschlagewerk fuer die Zeilenanzeige (F7).

    Der Kiosk zeigt damit in leeren Zeilen blass, was zuletzt bestellt wurde -
    ein Anhalt beim Neuerfassen, keine Vorbelegung.
    """
    if not letzte:
        return None
    werte = {}
    for p in letzte.get("positionen", []):
        p = P.normalisiere_position(p)
        if not p["portionen"]:
            continue
        schluessel = str(p["nummer"]) if p["nummer"] else p["name"].strip().lower()
        werte[schluessel] = p["portionen"]
    if not werte:
        return None
    return {
        "datum": letzte.get("datum", ""),
        "wochentag": store.wochentag(letzte.get("datum", "")),
        "positionen": werte,
    }


def _uebersicht(url, hdrs, cfg):
    """Zustand der naechsten 14 Tage fuer die Tagesleiste (F1)."""
    from datetime import date, timedelta
    # Ein Entwurf ohne Positionen ist inhaltlich nichts und bekommt deshalb
    # kein Abzeichen - sonst sieht ein unberuehrter Tag nach Arbeit aus.
    bekannt = {}
    for o in store.bestellungen(url, hdrs):
        st = o.get("status", store.STATUS_ENTWURF)
        if st == store.STATUS_ENTWURF and not o.get("positionen"):
            continue
        bekannt[o.get("datum")] = st
    heute = date.today()
    tage = []
    for i in range(14):
        d = (heute + timedelta(days=i)).isoformat()
        ist_tag = store.ist_bestelltag(cfg, d)
        tage.append({
            "datum": d,
            "wochentag": store.wochentag(d),
            "bestelltag": ist_tag,
            # Heute ist die Ware laengst geliefert - bestellt wird spaetestens
            # am Vortag. Deshalb ist heute nie waehlbar.
            "bestellbar": ist_tag and store.bestellbar(d),
            "status": bekannt.get(d),
        })
    # Ein Entwurf gilt als offen - daran wird ja noch gearbeitet. Nur
    # Gesendetes und Korrigiertes wird uebersprungen.
    erledigt = (store.STATUS_GESENDET, store.STATUS_KORRIGIERT)
    offen = next((t["datum"] for t in tage
                  if t["bestellbar"] and t["status"] not in erledigt), None)
    return {"tage": tage, "aktiv": offen or store.naechster_bestelltag(cfg)}


def _verlauf(url, hdrs):
    out = []
    for o in store.bestellungen(url, hdrs):
        if o.get("status") in (store.STATUS_GESENDET, store.STATUS_KORRIGIERT):
            s = P.summen([P.normalisiere_position(p)
                          for p in o.get("positionen", [])])
            out.append({
                "datum": o.get("datum"),
                "wochentag": store.wochentag(o.get("datum", "")),
                "status": o.get("status"),
                "summen": s,
                "protokoll": o.get("protokoll", []),
                "hat_dokument": bool(o.get("dokument")),
            })
    return out


def _senden(url, hdrs, cfg, datum_iso, body, korrektur=False):
    """PDF erzeugen, Mail versenden, sperren und die Vorschlaege nachfuehren."""
    positionen = _positionen_aus(body)
    if not positionen:
        return _err("Es ist noch nichts bestellt. Bitte mindestens eine "
                    "Position erfassen.")

    rec_id, artikel = store.load_artikel(url, hdrs)
    try:
        anhang = build_pdf(artikel, positionen, datum_iso,
                           kd_nr=cfg.get("kd_nr", ""), korrektur=korrektur,
                           erstellt=datetime.now().strftime("%d.%m.%Y %H:%M"))
    except Exception as e:
        logging.error(f"[metzger] PDF fehlgeschlagen: {e}")
        return _err("Das Bestellformular konnte nicht erzeugt werden. "
                    "Bitte noch einmal versuchen.", 500)

    betreff = ("Korrektur Bestellung " if korrektur else "Bestellung ") \
        + store.datum_de(datum_iso)
    text = _mail_text(datum_iso, cfg, positionen, korrektur)
    try:
        erfolg = _send_mail(cfg.get("empfaenger"), cfg.get("empfaenger_name", ""),
                            betreff, text, anhang)
    except Exception as e:
        logging.error(f"[metzger] Mailversand fehlgeschlagen: {e}")
        erfolg = False
    if not erfolg:
        # Der Entwurf bleibt erhalten - nichts geht verloren (F11).
        return _err("Die Bestellung konnte nicht versendet werden. "
                    "Der Entwurf ist gespeichert, bitte sp\u00e4ter erneut senden.",
                    502)

    order_id, order = store.load_order(url, hdrs, datum_iso)
    order = order or {}
    order.update({
        "datum": datum_iso,
        "status": store.STATUS_KORRIGIERT if korrektur else store.STATUS_GESENDET,
        "positionen": positionen,
        "dokument": base64.b64encode(anhang).decode("ascii"),
    })
    protokoll = order.get("protokoll") or []
    protokoll.append({
        "zeit": datetime.now().isoformat(timespec="seconds"),
        "was": "korrigiert" if korrektur else "gesendet",
        "an": cfg.get("empfaenger"),
        "wer": (body.get("wer") or "Kiosk"),
    })
    order["protokoll"] = protokoll
    store.save_order(url, hdrs, order_id, order)

    v_id, vorschlaege = store.load_vorschlaege(url, hdrs)
    store.lerne(vorschlaege, positionen, datum_iso)
    store.save_vorschlaege(url, hdrs, v_id, vorschlaege)

    return _ok({
        "status": order["status"],
        "empfaenger": cfg.get("empfaenger"),
        "testbetrieb": store.testbetrieb(cfg),
        "protokoll": protokoll,
        "summen": P.summen(positionen),
    })


def _config_pruefen(neu):
    """Freundliche Pruefung der Einstellungen (F15)."""
    mail = (neu.get("empfaenger") or "").strip()
    if "@" not in mail or "." not in mail.split("@")[-1]:
        return "Bitte eine vollst\u00e4ndige E-Mail-Adresse eintragen."
    tage = neu.get("bestelltage")
    if not isinstance(tage, list) or not tage:
        return "Es muss mindestens ein Bestelltag gesetzt bleiben."
    if not re.match(r"^\d{1,2}:\d{2}$", (neu.get("bestellschluss") or "").strip()):
        return "Der Bestellschluss braucht die Form 12:00."
    return None


def main(req: func.HttpRequest) -> func.HttpResponse:
    if req.method == "OPTIONS":
        return func.HttpResponse("", status_code=204, headers=store.cors_headers())

    blocked = admin_auth_guard(req)
    if blocked:
        return blocked

    token = store.get_token()
    if not token:
        return _err("Die Verbindung zum Bestellsystem steht gerade nicht zur "
                    "Verf\u00fcgung. Bitte sp\u00e4ter erneut versuchen.", 503)
    url, hdrs = store.base_url(), store.headers(token)
    cfg = store.load_config(url, hdrs)

    datum = (req.route_params.get("datum") or "").strip()
    aktion = (req.route_params.get("aktion") or "").strip().lower()

    try:
        body = req.get_json() if req.method == "POST" else {}
    except ValueError:
        body = {}

    # ── Einstellungen ────────────────────────────────────────────────
    if datum == "config":
        if req.method != "POST":
            sicht = {k: v for k, v in cfg.items() if not k.startswith("_")}
            return _ok({"config": sicht})
        neu = {k: v for k, v in cfg.items() if not k.startswith("_")}
        neu.update({k: v for k, v in (body.get("config") or {}).items()})
        fehler = _config_pruefen(neu)
        if fehler:
            return _err(fehler)
        neu["_rec_id"] = cfg.get("_rec_id", "")
        if not store.save_config(url, hdrs, neu):
            return _err("Die Einstellungen konnten nicht gespeichert werden.", 502)
        return _ok({"config": {k: v for k, v in neu.items()
                               if not k.startswith("_")}})

    # ── Uebersicht und Verlauf ───────────────────────────────────────
    if req.method == "GET" and not datum:
        if (req.params.get("mode") or "").lower() == "verlauf":
            return _ok({"verlauf": _verlauf(url, hdrs)})
        daten = _uebersicht(url, hdrs, cfg)
        daten["config"] = {k: v for k, v in cfg.items() if not k.startswith("_")}
        daten["testbetrieb"] = store.testbetrieb(cfg)
        return _ok(daten)

    if not DATUM.match(datum):
        return _err("Bitte einen g\u00fcltigen Liefertag angeben.")

    # ── Gesendetes Dokument ──────────────────────────────────────────
    if aktion == "dokument":
        _, order = store.load_order(url, hdrs, datum)
        doc = (order or {}).get("dokument")
        if not doc:
            return _err("Zu diesem Tag liegt kein gesendetes Formular vor.", 404)
        return func.HttpResponse(
            base64.b64decode(doc), status_code=200,
            headers={"Access-Control-Allow-Origin": "*",
                     "Content-Type": PDF_MIME,
                     "Content-Disposition":
                         f'inline; filename="Bestellung-{datum}.pdf"'},
        )

    # ── Entwurf lesen ────────────────────────────────────────────────
    if req.method == "GET":
        _, order, quelle, letzte = _entwurf(url, hdrs, cfg, datum)
        _, artikel = store.load_artikel(url, hdrs)
        _, vorschlaege = store.load_vorschlaege(url, hdrs)
        for liste in vorschlaege.values():
            store.sortiere_vorschlaege(liste)
        return _ok({
            "bestellung": order,
            "artikel": artikel,
            "vorschlaege": vorschlaege,
            "vorbelegt_aus": quelle,
            "letzte": _letzte_werte(letzte),
            "bestelltag": store.ist_bestelltag(cfg, datum),
            "bestellbar": store.ist_bestelltag(cfg, datum) and store.bestellbar(datum),
            "config": {k: v for k, v in cfg.items() if not k.startswith("_")},
            "testbetrieb": store.testbetrieb(cfg),
            "summen": P.summen([P.normalisiere_position(p)
                                for p in order.get("positionen", [])],
                               store.preise(artikel)),
        })

    # ── Schreibende Aktionen ─────────────────────────────────────────
    if aktion == "speichern":
        if not store.bestellbar(datum):
            return _err("F\u00fcr diesen Tag l\u00e4sst sich nichts mehr bestellen. "
                        "Bestellt wird sp\u00e4testens am Vortag.", 409)
        rec_id, order = store.load_order(url, hdrs, datum)
        order = order or {"datum": datum, "protokoll": []}
        if order.get("status") == store.STATUS_GESENDET:
            return _err("Die Bestellung ist bereits gesendet. Bitte "
                        "\u201eKorrektur senden\u201c verwenden.", 409)
        order.update({"datum": datum, "positionen": _positionen_aus(body)})
        order.setdefault("status", store.STATUS_ENTWURF)
        if not store.save_order(url, hdrs, rec_id, order):
            return _err("Der Entwurf konnte nicht gespeichert werden.", 502)
        return _ok({"status": order["status"]})

    if aktion == "senden":
        if not store.bestellbar(datum):
            return _err("F\u00fcr diesen Tag l\u00e4sst sich nichts mehr bestellen. "
                        "Bestellt wird sp\u00e4testens am Vortag.", 409)
        _, vorhanden = store.load_order(url, hdrs, datum)
        if (vorhanden or {}).get("status") == store.STATUS_GESENDET:
            return _err("Diese Bestellung wurde bereits gesendet. Bitte "
                        "\u201eKorrektur senden\u201c verwenden.", 409)
        return _senden(url, hdrs, cfg, datum, body, korrektur=False)

    if aktion == "korrektur":
        _, vorhanden = store.load_order(url, hdrs, datum)
        if (vorhanden or {}).get("status") not in (store.STATUS_GESENDET,
                                                   store.STATUS_KORRIGIERT):
            return _err("F\u00fcr diesen Tag wurde noch nichts gesendet.", 409)
        return _senden(url, hdrs, cfg, datum, body, korrektur=True)

    return _err("Diese Aktion ist nicht bekannt.", 404)
