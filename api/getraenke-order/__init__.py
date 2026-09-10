"""Endpunkt der Getraenke-Bestellung (Spec F1, F5, F9, F10, F12, F13).

Routen (``getraenke-order/{datum?}/{aktion?}``)::

    GET  /api/getraenke-order                     Uebersicht: Termin, Config
    GET  /api/getraenke-order?mode=verlauf        gesendete Bestellungen
    GET  /api/getraenke-order/2026-09-14          Entwurf, Artikel, Vorlage
    POST /api/getraenke-order/2026-09-14/speichern
    POST /api/getraenke-order/2026-09-14/senden
    POST /api/getraenke-order/2026-09-14/korrektur
    POST /api/getraenke-order/config

Schreibende Aufrufe laufen durch ``admin_auth_guard``.

Anders als beim Metzger geht **kein PDF** mit: Kratzer bekam bisher reinen
Text und kommt damit zurecht (plan.md, Leitentscheidung 6).
"""
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
import getraenke_store as store           # noqa: E402

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


def _send_mail(to_email, to_name, subject, body_text):
    """Mailversand ueber den bestehenden Graph-Weg aus shop-notify."""
    pfad = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
                        "shop-notify", "__init__.py")
    spec = importlib.util.spec_from_file_location("shop_notify_mail", pfad)
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    return mod.send_email(
        to_email, to_name, subject, body_text,
        # Kein Shop-Knopf: Der Lieferant bestellt nicht in unserem Laden.
        mit_shop_link=False,
    )


def _zeile(pos):
    """``20 Kisten Augustiner hell 0,5l`` - Singular beachtet (Spec F9.3)."""
    menge = pos.get("menge", 0)
    text = pos.get("bestelltext") or pos.get("name") or ""
    if pos.get("gebinde") and not pos.get("bestelltext"):
        text = f"{text} {pos['gebinde']}"
    return f"{menge} {'Kiste' if menge == 1 else 'Kisten'} {text}".strip()


def _mail_text(datum_iso, cfg, positionen, korrektur=False, notiz=""):
    """Bestelltext in der gewachsenen Schreibweise des Ladens (Spec F9).

    Die Bloecke folgen der Warengruppenreihenfolge und sind durch Leerzeilen
    getrennt - genau so sahen die bisher von Hand getippten Mails aus. Bei
    Kratzer soll nichts Ungewohntes ankommen.
    """
    reihenfolge = store.gruppen()
    rang = {g: i for i, g in enumerate(reihenfolge)}
    bloecke = {}
    for p in positionen:
        bloecke.setdefault(p.get("gruppe") or "", []).append(p)

    teile = []
    for gruppe in sorted(bloecke, key=lambda g: (rang.get(g, len(rang)), g)):
        teile.append("\n".join(_zeile(p) for p in bloecke[gruppe]))

    einleitung = ("bitte korrigieren Sie unsere Bestellung - es gilt die "
                  "folgende Liste"
                  if korrektur else "bitte liefern Sie uns")
    hinweis = (notiz or "").strip()
    hinweis_block = f"\nHinweis vom Dorfladen:\n{hinweis}\n" if hinweis else ""
    return (
        f"Guten Tag,\n\n"
        f"{einleitung} zum {store.wochentag(datum_iso)}, "
        f"den {store.datum_de(datum_iso)}:\n\n"
        + "\n\n".join(teile) + "\n"
        + hinweis_block
        + f"\nKd.-Nr. {cfg.get('kd_nr', '')}"
        + (f", Tour {cfg['tour']}" if cfg.get("tour") else "") + "\n\n"
        f"Mit freundlichen Gr\u00fc\u00dfen\n"
        f"Dorfladen Oberornau"
    )


def _betreff(datum_iso, korrektur=False):
    """``Bestellung fuer Dorfladen Oberornau KW 38`` (Spec F9.1)."""
    vorn = "Korrektur der Bestellung" if korrektur else "Bestellung"
    return f"{vorn} f\u00fcr Dorfladen Oberornau KW {store.kw(datum_iso)}"


def _positionen_aus(body):
    """Positionen aus dem Request saeubern und Leeres verwerfen."""
    out = []
    for roh in (body.get("positionen") or []):
        p = store.normalisiere_position(roh)
        if store.bestellt(p):
            out.append(p)
    return out


def _entwurf(url, hdrs, datum_iso):
    """Bestellung laden - ein neuer Entwurf startet bewusst leer (Spec F5.4)."""
    rec_id, order = store.load_order(url, hdrs, datum_iso)
    if not order:
        order = {"datum": datum_iso, "status": store.STATUS_ENTWURF,
                 "positionen": [], "protokoll": []}
    order.setdefault("datum", datum_iso)
    order.setdefault("status", store.STATUS_ENTWURF)
    order.setdefault("positionen", [])
    order.setdefault("protokoll", [])
    order.setdefault("notiz", "")
    order["kw"] = store.kw(datum_iso)
    return rec_id, order


def _vorlage_sicht(letzte):
    """Die letzte Bestellung als Nachschlagewerk fuer den Kiosk (Spec F5)."""
    if not letzte:
        return None
    positionen = [store.normalisiere_position(p)
                  for p in letzte.get("positionen", [])
                  if not p.get("zusatz")]
    positionen = [p for p in positionen if store.bestellt(p)]
    return {
        "datum": letzte.get("datum", ""),
        "datum_de": store.datum_de(letzte.get("datum", "")),
        "aus_vorlage": bool(letzte.get("aus_vorlage")),
        "mengen": {p["nummer"]: p["menge"] for p in positionen if p["nummer"]},
        "positionen": positionen,
    }


def _verlauf(url, hdrs):
    out = []
    pfand = store.pfandsaetze()
    for o in store.bestellungen(url, hdrs):
        if o.get("status") not in (store.STATUS_GESENDET, store.STATUS_KORRIGIERT):
            continue
        positionen = [store.normalisiere_position(p)
                      for p in o.get("positionen", [])]
        out.append({
            "datum": o.get("datum"),
            "datum_de": store.datum_de(o.get("datum", "")),
            "kw": store.kw(o.get("datum", "")),
            "status": o.get("status"),
            "summen": store.summen(positionen, pfand),
            "protokoll": o.get("protokoll", []),
        })
    return out


def _senden(url, hdrs, cfg, datum_iso, body, korrektur=False):
    """Mail versenden, Bestellung sperren und den Katalog nachfuehren."""
    positionen = _positionen_aus(body)
    if not positionen:
        return _err("Es ist noch nichts bestellt. Bitte mindestens eine "
                    "Kiste erfassen.")

    notiz = (body.get("notiz") or "").strip()
    text = _mail_text(datum_iso, cfg, positionen, korrektur, notiz)
    try:
        erfolg = _send_mail(cfg.get("empfaenger"),
                            cfg.get("empfaenger_name", ""),
                            _betreff(datum_iso, korrektur), text)
    except Exception as e:
        logging.error(f"[getraenke] Mailversand fehlgeschlagen: {e}")
        erfolg = False
    if not erfolg:
        # Der Entwurf bleibt erhalten - nichts geht verloren (Spec F10.3).
        return _err("Die Bestellung konnte nicht versendet werden. "
                    "Der Entwurf ist gespeichert, bitte sp\u00e4ter erneut senden.",
                    502)

    rec_id, order = store.load_order(url, hdrs, datum_iso)
    order = order or {}
    order.update({
        "datum": datum_iso,
        "kw": store.kw(datum_iso),
        "status": store.STATUS_KORRIGIERT if korrektur else store.STATUS_GESENDET,
        "positionen": positionen,
        "notiz": notiz,
        "mailtext": text,
    })
    protokoll = order.get("protokoll") or []
    protokoll.append({
        "zeit": datetime.now().isoformat(timespec="seconds"),
        "was": "korrigiert" if korrektur else "gesendet",
        "an": cfg.get("empfaenger"),
        "wer": (body.get("wer") or "Kiosk"),
    })
    order["protokoll"] = protokoll
    store.save_order(url, hdrs, rec_id, order)

    return _ok({
        "status": order["status"],
        "empfaenger": cfg.get("empfaenger"),
        "testbetrieb": store.testbetrieb(cfg),
        "protokoll": protokoll,
        "mailtext": text,
        "summen": store.summen(positionen, store.pfandsaetze()),
    })


def _config_pruefen(neu):
    """Freundliche Pruefung der Einstellungen (Spec F12.2)."""
    mail = (neu.get("empfaenger") or "").strip()
    if "@" not in mail or "." not in mail.split("@")[-1]:
        return "Bitte eine vollst\u00e4ndige E-Mail-Adresse eintragen."
    if not (neu.get("kd_nr") or "").strip():
        return "Bitte die Kundennummer eintragen - sie geh\u00f6rt in jede Bestellung."
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
    sichtbar = {k: v for k, v in cfg.items() if not k.startswith("_")}

    datum = (req.route_params.get("datum") or "").strip()
    aktion = (req.route_params.get("aktion") or "").strip().lower()

    try:
        body = req.get_json() if req.method == "POST" else {}
    except ValueError:
        body = {}

    # ── Einstellungen ────────────────────────────────────────────────
    if datum == "config":
        if req.method != "POST":
            return _ok({"config": sichtbar})
        neu = dict(sichtbar)
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
        letzte = store.letzte_bestellung(store.bestellungen(url, hdrs))
        vorschlag = store.vorschlagstermin()
        return _ok({
            "termin": vorschlag,
            "kw": store.kw(vorschlag),
            "letzte": _vorlage_sicht(letzte),
            "config": sichtbar,
            "testbetrieb": store.testbetrieb(cfg),
        })

    if not DATUM.match(datum):
        return _err("Bitte einen g\u00fcltigen Liefertermin angeben.")

    # ── Entwurf lesen ────────────────────────────────────────────────
    if req.method == "GET":
        _, order = _entwurf(url, hdrs, datum)
        _, artikel = store.load_artikel(url, hdrs)
        alle = store.bestellungen(url, hdrs)
        positionen = [store.normalisiere_position(p)
                      for p in order.get("positionen", [])]
        return _ok({
            "bestellung": order,
            "artikel": artikel,
            "gruppen": store.gruppen(),
            "pfand": store.pfandsaetze(),
            "letzte": _vorlage_sicht(store.letzte_bestellung(alle)),
            "bestellbar": store.bestellbar(datum),
            "config": sichtbar,
            "testbetrieb": store.testbetrieb(cfg),
            "summen": store.summen(positionen, store.pfandsaetze()),
        })

    # ── Schreibende Aktionen ─────────────────────────────────────────
    if aktion == "speichern":
        rec_id, order = store.load_order(url, hdrs, datum)
        order = order or {"datum": datum, "protokoll": []}
        if order.get("status") in (store.STATUS_GESENDET,
                                   store.STATUS_KORRIGIERT):
            return _err("Die Bestellung ist bereits gesendet. Bitte "
                        "\u201eKorrektur senden\u201c verwenden.", 409)
        order.update({"datum": datum, "kw": store.kw(datum),
                      "positionen": _positionen_aus(body),
                      "notiz": (body.get("notiz") or "").strip()})
        order.setdefault("status", store.STATUS_ENTWURF)
        if not store.save_order(url, hdrs, rec_id, order):
            return _err("Der Entwurf konnte nicht gespeichert werden.", 502)
        return _ok({"status": order["status"]})

    if aktion == "senden":
        if not store.bestellbar(datum):
            return _err("Dieser Liefertermin liegt nicht in der Zukunft. "
                        "Bitte einen sp\u00e4teren Termin w\u00e4hlen.", 409)
        _, vorhanden = store.load_order(url, hdrs, datum)
        if (vorhanden or {}).get("status") in (store.STATUS_GESENDET,
                                               store.STATUS_KORRIGIERT):
            return _err("Diese Bestellung wurde bereits gesendet. Bitte "
                        "\u201eKorrektur senden\u201c verwenden.", 409)
        return _senden(url, hdrs, cfg, datum, body, korrektur=False)

    if aktion == "korrektur":
        _, vorhanden = store.load_order(url, hdrs, datum)
        if (vorhanden or {}).get("status") not in (store.STATUS_GESENDET,
                                                   store.STATUS_KORRIGIERT):
            return _err("F\u00fcr diesen Termin wurde noch nichts gesendet.", 409)
        return _senden(url, hdrs, cfg, datum, body, korrektur=True)

    return _err("Diese Aktion ist nicht bekannt.", 404)
