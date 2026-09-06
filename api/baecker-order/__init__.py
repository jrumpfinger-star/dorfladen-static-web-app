"""Baecker-Bestellung – Entwurf, Vorbelegung, Versand und Korrektur.

GET  /api/baecker-order?datum=JJJJ-MM-TT   Bestellung inkl. Vorbelegung
GET  /api/baecker-order?mode=uebersicht    Tagesleiste + offene Erinnerung
GET  /api/baecker-order?mode=verlauf       Verlauf der Bestellungen
GET  /api/baecker-order?mode=config        Einstellungen (fuer das CMS)
POST /api/baecker-order                    Entwurf speichern
POST /api/baecker-order {aktion:"config"}  Einstellungen speichern
POST /api/baecker-order/{datum}/senden     Formular erzeugen und Mail versenden
POST /api/baecker-order/{datum}/korrektur  Korrektur versenden
"""
import importlib.util
import json
import logging
import os
import re
import sys
from datetime import date, datetime, timedelta

import azure.functions as func

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from shared.auth import admin_auth_guard  # noqa: E402
import store  # noqa: E402
from docx_fill import fill_form  # noqa: E402

VORLAGE = os.path.join(os.path.dirname(os.path.abspath(__file__)),
                       "vorlage", "freundl-werktag.docx")
ANHANG_NAME = "Freundl-Bestellformular.docx"
DOCX_MIME = ("application/vnd.openxmlformats-officedocument"
             ".wordprocessingml.document")


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


def _send_mail(to_email, to_name, subject, body_text, attachment_bytes):
    """Mail ueber den bestehenden Graph-Versand aus shop-notify."""
    pfad = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
                        "shop-notify", "__init__.py")
    spec = importlib.util.spec_from_file_location("shop_notify_mail", pfad)
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    return mod.send_email(
        to_email, to_name, subject, body_text,
        attachments=[{"name": ANHANG_NAME, "content": attachment_bytes, "type": DOCX_MIME}],
        # Kein Shop-Knopf: Die Baeckerei bestellt nicht in unserem Laden.
        mit_shop_link=False,
    )


def _mail_text(datum_iso, cfg, korrektur=False):
    tag = store.wochentag(datum_iso)
    einleitung = (
        "anbei die Korrektur unserer Bestellung"
        if korrektur else "anbei unsere Bestellung"
    )
    return (
        f"Guten Tag,\n\n"
        f"{einleitung} f\u00fcr {tag}, den {store.datum_de(datum_iso)}.\n"
        f"Kd.-Nr. {cfg.get('kd_nr')} / Tour-Nr. {store.tour_nr(cfg, datum_iso)}\n\n"
        f"Das ausgef\u00fcllte Bestellformular finden Sie im Anhang.\n\n"
        f"Mit freundlichen Gr\u00fc\u00dfen\n"
        f"Dorfladen Oberornau"
    )


def _positionen_fuer_versand(order, artikel):
    """Positionen mit Menge oder Retoure, aufsteigend nach Artikelnummer."""
    namen = {store.artikel_key(a): a.get("name", "") for a in artikel}
    out = []
    for p in order.get("positionen", []):
        menge = int(p.get("menge") or 0)
        retoure = int(p.get("retoure") or 0)
        if not menge and not retoure:
            continue
        nr = str(p.get("nummer") or "").strip()
        name = (p.get("name") or "").strip() or namen.get(nr, "")
        out.append({"nummer": nr, "name": name, "menge": menge, "retoure": retoure})
    out.sort(key=lambda p: (store.sort_nr(p["nummer"]), p["name"]))
    return out


def _build_entwurf(url, hdrs, cfg, datum_iso):
    """Bestellung laden oder aus dem letzten gleichen Wochentag vorbelegen."""
    rec_id, order = store.load_order(url, hdrs, datum_iso)
    artikel = store.load_artikel(url, hdrs)
    vorlagen = store.vorlage_bestellungen(url, hdrs, datum_iso)

    # Vergleichswerte je Artikel: letzter gleicher Wochentag + drei davor
    verlauf = {}
    for _, v in vorlagen:
        for key, menge in store.positionen_map(v).items():
            verlauf.setdefault(key, []).append(menge)

    gesendet = order.get("status") in (store.STATUS_GESENDET, store.STATUS_KORRIGIERT)
    hat_entwurf = bool(order.get("positionen"))
    if hat_entwurf:
        mengen = {}
        retouren = {}
        for p in order["positionen"]:
            key = str(p.get("nummer") or "").strip() or (p.get("name") or "").lower()
            mengen[key] = int(p.get("menge") or 0)
            retouren[key] = int(p.get("retoure") or 0)
        # Herkunft der Vorbelegung: aus dem Entwurf, sonst der letzte gleiche Wochentag
        quelle = order.get("vorlage_datum") or (vorlagen[0][0] if vorlagen else "")
    else:
        # Noch kein Entwurf: exakt den letzten gleichen Wochentag uebernehmen
        mengen = store.positionen_map(vorlagen[0][1]) if vorlagen else {}
        retouren = {}
        quelle = vorlagen[0][0] if vorlagen else ""

    zeilen = []
    for a in artikel:
        key = store.artikel_key(a)
        zeilen.append({
            "nummer": a.get("nummer", ""),
            "name": a.get("name", ""),
            "aktiv": bool(a.get("aktiv", True)),
            "menge": mengen.get(key, 0),
            "retoure": retouren.get(key, 0),
            "vorbelegt": mengen.get(key, 0),
            "verlauf": verlauf.get(key, [])[:4],
            "nur_wochentag": a.get("nur_wochentag"),
        })

    # Zusatzpositionen, die es im Katalog nicht (mehr) gibt
    bekannt = {store.artikel_key(a) for a in artikel}
    for p in order.get("positionen", []) or []:
        key = str(p.get("nummer") or "").strip() or (p.get("name") or "").lower()
        if key in bekannt:
            continue
        zeilen.append({
            "nummer": p.get("nummer", ""),
            "name": p.get("name", ""),
            "aktiv": True,
            "menge": int(p.get("menge") or 0),
            "retoure": int(p.get("retoure") or 0),
            "vorbelegt": 0,
            "verlauf": [],
            "zusatz": True,
        })

    return {
        "datum": datum_iso,
        "wochentag": store.wochentag(datum_iso),
        "datum_de": store.datum_de(datum_iso),
        "status": order.get("status", store.STATUS_ENTWURF),
        "gesperrt": gesendet,
        "korrektur_moeglich": gesendet and store.korrektur_moeglich(cfg, datum_iso),
        "hat_entwurf": hat_entwurf,
        "vorlage_datum": quelle,
        "vorlage_datum_de": store.datum_de(quelle) if quelle else "",
        "protokoll": order.get("protokoll", []),
        "positionen": zeilen,
        "tour_nr": store.tour_nr(cfg, datum_iso),
        "kd_nr": cfg.get("kd_nr"),
        "empfaenger": cfg.get("empfaenger"),
        "testbetrieb": (cfg.get("empfaenger") or "").lower()
                       != (cfg.get("baeckerei_mail") or "").lower(),
        "record_id": rec_id,
    }


def _uebersicht(url, hdrs, cfg):
    """Tagesleiste und Erinnerungsstatus (Spec F1, F9)."""
    heute = date.today()
    tage = []
    for i in range(7):
        d = heute + timedelta(days=i)
        iso = d.isoformat()
        ist_tag = store.ist_bestelltag(cfg, iso)
        status = "kein_tag"
        if ist_tag:
            _, order = store.load_order(url, hdrs, iso)
            s = order.get("status")
            status = ("gesendet" if s == store.STATUS_GESENDET
                      else "korrigiert" if s == store.STATUS_KORRIGIERT
                      else "offen")
        tage.append({
            "datum": iso, "wochentag": store.wochentag(iso),
            "bestelltag": ist_tag, "status": status,
        })

    # Erinnerung: morgen ist Bestelltag und noch nichts gesendet
    morgen = (heute + timedelta(days=1)).isoformat()
    offen = False
    blinkt = False
    if store.ist_bestelltag(cfg, morgen):
        _, order = store.load_order(url, hdrs, morgen)
        offen = order.get("status") not in (store.STATUS_GESENDET, store.STATUS_KORRIGIERT)
        if offen:
            schluss = cfg.get("bestellschluss") or "12:00"
            try:
                h, m = (int(x) for x in schluss.split(":"))
                jetzt = datetime.now()
                blinkt = (jetzt.hour, jetzt.minute) >= (h, m)
            except Exception:
                blinkt = False

    return {
        "tage": tage,
        "naechster": store.naechster_bestelltag(cfg),
        "erinnerung": {
            "offen": offen, "blinkt": blinkt, "datum": morgen if offen else "",
            "wochentag": store.wochentag(morgen) if offen else "",
            "bestellschluss": cfg.get("bestellschluss"),
        },
    }


def _verlauf(url, hdrs, cfg):
    eintraege = []
    for key, data in store.read_many(url, hdrs, store.KEY_ORDER):
        d = key[len(store.KEY_ORDER):]
        if not d:
            continue
        pos = [p for p in data.get("positionen", [])
               if (p.get("menge") or 0) or (p.get("retoure") or 0)]
        eintraege.append({
            "datum": d,
            "datum_de": store.datum_de(d),
            "wochentag": store.wochentag(d),
            "status": data.get("status", store.STATUS_ENTWURF),
            "positionen": len(pos),
            "stueck": sum(int(p.get("menge") or 0) for p in pos),
            "protokoll": data.get("protokoll", []),
        })
    eintraege.sort(key=lambda e: e["datum"], reverse=True)
    return {"verlauf": eintraege[:60]}


def _senden(url, hdrs, cfg, datum_iso, body, korrektur=False):
    """Formular erzeugen und per Mail versenden (Spec F6, F7, F8)."""
    rec_id, order = store.load_order(url, hdrs, datum_iso)

    if korrektur and not store.korrektur_moeglich(cfg, datum_iso):
        naechster = store.naechster_bestelltag(cfg)
        return _err(
            "Eine Korrektur ist nur f\u00fcr den n\u00e4chsten Liefertag m\u00f6glich "
            f"({store.wochentag(naechster)}, {store.datum_de(naechster)}). "
            f"Die Bestellung f\u00fcr {store.datum_de(datum_iso)} ist bereits geliefert.")

    positionen = body.get("positionen")
    if positionen is None:
        positionen = order.get("positionen", [])

    artikel = store.load_artikel(url, hdrs)
    versand = _positionen_fuer_versand({"positionen": positionen}, artikel)
    if not versand:
        return _err("Die Bestellung enth\u00e4lt keine Mengen. "
                    "Bitte zuerst Mengen eintragen.")

    try:
        with open(VORLAGE, "rb") as fh:
            vorlage = fh.read()
        dokument = fill_form(
            vorlage, store.datum_de(datum_iso), versand,
            kd_nr=cfg.get("kd_nr", "1190"), tour_nr=store.tour_nr(cfg, datum_iso),
        )
    except Exception as e:
        logging.error(f"[baecker-order] Formular fehlgeschlagen: {e}")
        return _err("Das Bestellformular konnte nicht erstellt werden. "
                    "Bitte erneut versuchen.", 500)

    betreff = ("Korrektur Bestellung " if korrektur else "Bestellung ") + store.datum_de(datum_iso)
    ok, info = _send_mail(
        cfg.get("empfaenger"), cfg.get("empfaenger_name") or "B\u00e4ckerei",
        betreff, _mail_text(datum_iso, cfg, korrektur), dokument,
    )
    if not ok:
        logging.error(f"[baecker-order] Mailversand fehlgeschlagen: {info}")
        return _err("Die Bestellung konnte nicht versendet werden. "
                    "Bitte pr\u00fcfen Sie die Internetverbindung und "
                    "versuchen Sie es erneut.", 502)

    eintrag = {
        "zeit": datetime.now().isoformat(timespec="seconds"),
        "art": "korrektur" if korrektur else "gesendet",
        "wer": (body.get("wer") or "").strip() or "Kiosk",
        "positionen": len(versand),
        "stueck": sum(p["menge"] for p in versand),
        "empfaenger": cfg.get("empfaenger"),
        "betreff": betreff,
    }
    order.update({
        "datum": datum_iso,
        "status": store.STATUS_KORRIGIERT if korrektur else store.STATUS_GESENDET,
        "positionen": positionen,
        "protokoll": [eintrag] + (order.get("protokoll") or []),
    })
    store.write_json(url, hdrs, store.order_key(datum_iso), rec_id, order,
                     f"Baecker-Bestellung {datum_iso}")

    return _ok({
        "status": order["status"],
        "protokoll": order["protokoll"],
        "meldung": ("Korrektur gesendet." if korrektur else "Bestellung gesendet.")
                   + f" {eintrag['positionen']} Positionen, {eintrag['stueck']} St\u00fcck.",
    })


def _config_pruefen(cfg):
    """Gibt eine verstaendliche Fehlermeldung zurueck oder None.

    Die Werte kommen aus dem CMS und landen ungeprueft im Serienbrief-Kopf
    bzw. steuern den Mailversand – deshalb hier streng pruefen.
    """
    tage = cfg.get("bestelltage") or []
    if not isinstance(tage, list) or not tage:
        return "Bitte mindestens einen Bestelltag ausw\u00e4hlen."
    for t in tage:
        if not isinstance(t, int) or t < 0 or t > 6:
            return "Ung\u00fcltiger Bestelltag."

    mail = (cfg.get("empfaenger") or "").strip()
    if "@" not in mail or "." not in mail.split("@")[-1]:
        return "Bitte eine g\u00fcltige E-Mail-Adresse angeben."

    bk_mail = (cfg.get("baeckerei_mail") or "").strip()
    if bk_mail and ("@" not in bk_mail or "." not in bk_mail.split("@")[-1]):
        return "Die Adresse der B\u00e4ckerei ist keine g\u00fcltige E-Mail-Adresse."

    schluss = (cfg.get("bestellschluss") or "").strip()
    if not re.match(r"^([01]\d|2[0-3]):[0-5]\d$", schluss):
        return "Bestellschluss bitte als Uhrzeit angeben, z.\u202fB. 12:00."

    if not (cfg.get("kd_nr") or "").strip():
        return "Bitte die Kunden-Nummer angeben."

    tour = cfg.get("tour_nr")
    if isinstance(tour, dict):
        if not (tour.get("default") or "").strip():
            return "Bitte die Tour-Nummer angeben."
    elif not (tour or "").strip():
        return "Bitte die Tour-Nummer angeben."
    return None


def main(req: func.HttpRequest) -> func.HttpResponse:
    guard = admin_auth_guard(req)
    if guard:
        return guard
    if req.method == "OPTIONS":
        return func.HttpResponse(status_code=200, headers=store.cors_headers())

    token = store.get_token()
    if not token:
        return _err("Verbindung zum Datenspeicher nicht m\u00f6glich.", 500)
    url, hdrs = store.base_url(), store.headers(token)
    cfg = store.load_config(url, hdrs)

    try:
        if req.method == "GET":
            mode = (req.params.get("mode") or "").strip()
            if mode == "uebersicht":
                return _ok(_uebersicht(url, hdrs, cfg))
            if mode == "verlauf":
                return _ok(_verlauf(url, hdrs, cfg))
            if mode == "config":
                return _ok({"config": cfg})
            datum = (req.params.get("datum") or "").strip()
            if not datum:
                datum = store.naechster_bestelltag(cfg)
            return _ok({"bestellung": _build_entwurf(url, hdrs, cfg, datum)})

        if req.method == "POST":
            body = req.get_json()
            aktion = (req.route_params.get("aktion")
                      or body.get("aktion") or "speichern").strip()

            # Einstellungen haengen an keinem Liefertag – deshalb vor der
            # Datumspruefung.
            if aktion == "config":
                rec_id, _ = store.read_json(url, hdrs, store.KEY_CONFIG)
                neu = dict(cfg)
                neu.update(body.get("config") or {})
                fehler = _config_pruefen(neu)
                if fehler:
                    return _err(fehler)
                if not store.write_json(url, hdrs, store.KEY_CONFIG, rec_id, neu,
                                        "Baecker-Einstellungen"):
                    return _err("Einstellungen konnten nicht gespeichert werden.", 500)
                return _ok({"config": neu, "meldung": "Einstellungen gespeichert."})

            datum = (req.route_params.get("datum")
                     or body.get("datum") or "").strip()
            if not datum:
                return _err("Bitte einen Liefertag angeben.")

            if aktion in ("senden", "korrektur"):
                return _senden(url, hdrs, cfg, datum, body,
                               korrektur=(aktion == "korrektur"))

            # Entwurf speichern
            rec_id, order = store.load_order(url, hdrs, datum)
            if order.get("status") in (store.STATUS_GESENDET, store.STATUS_KORRIGIERT) \
                    and not body.get("korrekturmodus"):
                return _err("Diese Bestellung wurde bereits gesendet. "
                            "\u00c4nderungen sind nur \u00fcber eine Korrektur m\u00f6glich.")
            order.update({
                "datum": datum,
                "status": order.get("status", store.STATUS_ENTWURF),
                "positionen": body.get("positionen") or [],
                "vorlage_datum": body.get("vorlage_datum", order.get("vorlage_datum", "")),
                "protokoll": order.get("protokoll", []),
            })
            if not store.write_json(url, hdrs, store.order_key(datum), rec_id, order,
                                    f"Baecker-Bestellung {datum}"):
                return _err("Der Entwurf konnte nicht gespeichert werden.", 500)
            return _ok({"meldung": "Entwurf gespeichert."})

        return _err("Nicht unterst\u00fctzte Anfrage.", 405)

    except ValueError:
        return _err("Die Anfrage konnte nicht gelesen werden.")
    except Exception as e:
        logging.error(f"[baecker-order] {e}")
        return _err("Es ist ein Fehler aufgetreten. Bitte erneut versuchen.", 500)
