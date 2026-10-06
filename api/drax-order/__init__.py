"""Endpunkt der Drax-Bestellung (Spec F1-F9, F11).

Routen (``drax-order/{datum?}/{aktion?}``)::

    GET  /api/drax-order                     Uebersicht: Liefertage, Erinnerung
    GET  /api/drax-order?mode=verlauf        Lieferungen und Bestellungen
    GET  /api/drax-order/2026-10-15          Entwurf inkl. Vorbelegung
    GET  /api/drax-order/2026-10-15/dokument gesendetes PDF
    GET  /api/drax-order/2026-10-15/positionen  Positionen fuer den Verlauf
    POST /api/drax-order/2026-10-15/speichern
    POST /api/drax-order/2026-10-15/senden
    POST /api/drax-order/2026-10-15/korrektur
    POST /api/drax-order/2026-10-15/loeschen
    GET  /api/drax-order/config              Einstellungen lesen
    POST /api/drax-order/config              Einstellungen speichern

Schreibende Aufrufe laufen durch ``admin_auth_guard``.
"""
import base64
import importlib.util
import json
import logging
import os
import re
import sys

import azure.functions as func

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from shared.auth import admin_auth_guard   # noqa: E402
from shared.zeit import jetzt_lokal        # noqa: E402
import drax_store as store                 # noqa: E402
from drax_pdf import build_formular        # noqa: E402

PDF_MIME = "application/pdf"

DATUM = re.compile(r"^\d{4}-\d{2}-\d{2}$")


def _anhang_name(datum_iso):
    """Dateiname des Anhangs - reines ASCII (Spec F6).

    Umlaute im Dateinamen haben beim Baecker zu unleserlichen Anhaengen
    gefuehrt; ``Drax`` und ein ISO-Datum sind unverfaenglich und sortieren
    sich im Postfach der Muehle von selbst.
    """
    return f"Drax-Bestellung-{datum_iso}.pdf"


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


def _send_mail(to_email, to_name, subject, body_text, anhang, datum_iso):
    """Mailversand ueber den bestehenden Graph-Weg aus shop-notify."""
    pfad = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
                        "shop-notify", "__init__.py")
    spec = importlib.util.spec_from_file_location("shop_notify_mail", pfad)
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    return mod.send_email(
        to_email, to_name, subject, body_text,
        attachments=[{"name": _anhang_name(datum_iso),
                      "content": anhang, "type": PDF_MIME}],
        # Kein Shop-Knopf: Die Muehle bestellt nicht in unserem Laden.
        mit_shop_link=False,
        # Kopie in den Laden, damit dort nachvollziehbar bleibt, was
        # bestellt wurde (Spec bestellkopie-laden).
        kopie_an_laden=True,
    )


def _liefertext(cfg, datum_iso):
    """Was in der Zeile „Lieferung" steht - wie auf dem Papierblatt.

    Dort stand von Hand „Do vormittag 8.10.". Dieselbe Angabe, nur in
    gleichbleibender Schreibweise.
    """
    tag = store.wochentag(datum_iso)
    kurz = tag[:2] if tag else ""
    return f"{kurz} {store.datum_de(datum_iso)} vormittags".strip()


def _mail_text(datum_iso, cfg, positionen, korrektur=False, entfallen=None):
    """Positionsliste im Klartext; das Formular liegt zusaetzlich als PDF bei.

    Manche Empfaenger oeffnen den Anhang erst spaeter - was bestellt wurde,
    muss auch in der Mail stehen.
    """
    einleitung = ("anbei die Korrektur unserer Bestellung"
                  if korrektur else "anbei unsere Bestellung")
    zeilen = []
    for p in positionen:
        einheit = f" {p['einheit']}" if p.get("einheit") else ""
        zeilen.append(f"  {p.get('menge', 0)} x{einheit}  "
                      f"{p.get('nr', '')}  {p.get('name', '')}")
    s = store.summen(positionen)

    block_entfallen = ""
    if entfallen:
        weg = [f"  {p.get('nr', '')}  {p.get('name', '')}" for p in entfallen]
        block_entfallen = ("\nDiese Positionen entfallen gegen\u00fcber der "
                           "vorherigen Bestellung:\n" + "\n".join(weg) + "\n")

    return (
        f"Guten Tag,\n\n"
        f"{einleitung} zur Lieferung am {store.wochentag(datum_iso)}, "
        f"den {store.datum_de(datum_iso)}.\n"
        f"Kunden-Nr. {cfg.get('kd_nr', '')}\n\n"
        + "\n".join(zeilen) + "\n"
        + block_entfallen
        + f"\nGesamt: {s['positionen']} Positionen, {s['stueck']} St\u00fcck\n\n"
        f"Das vollst\u00e4ndige Formular finden Sie im Anhang.\n\n"
        f"Mit freundlichen Gr\u00fc\u00dfen\n"
        f"Dorfladen Oberornau"
    )


def _aktive(artikel):
    """Nur Artikel, die im Bestellbildschirm erscheinen duerfen (F10)."""
    return [a for a in artikel if a.get("aktiv", True)]


def _entwurf(url, hdrs, cfg, datum_iso, artikel):
    """Gespeicherten Entwurf laden - oder einen mit Vorbelegung bauen (F2).

    Ein bereits gesendeter Tag wird unveraendert zurueckgegeben: Seine
    Positionen sind das, was die Muehle bekommen hat, und duerfen nicht
    nachtraeglich durch eine Vorbelegung ueberschrieben werden.
    """
    _, order = store.load_order(url, hdrs, datum_iso)
    if order and (order.get("positionen") or store.gesendet(order)):
        return order, order.get("herkunft") or {}

    erlaubt = set(store.artikel_map(_aktive(artikel)))
    positionen, herkunft = store.vorbelegung(
        store.bestellungen(url, hdrs), datum_iso, erlaubt)
    return store.neuer_entwurf(datum_iso, positionen, herkunft), herkunft


def _uebersicht(url, hdrs, cfg):
    """Die naechsten Liefertage samt Zustand und Erinnerung (F1, F8)."""
    alle = store.bestellungen(url, hdrs)
    bekannt = {}
    for o in alle:
        st = o.get("status", store.STATUS_ENTWURF)
        # Ein Entwurf ohne Positionen ist inhaltlich nichts und bekommt kein
        # Abzeichen - sonst sieht ein unberuehrter Tag nach Arbeit aus.
        if st == store.STATUS_ENTWURF and not o.get("positionen"):
            continue
        bekannt[o.get("datum")] = {
            "status": st,
            "positionen": len(o.get("positionen") or []),
        }

    jetzt = jetzt_lokal()
    tage = []
    for datum in store.naechste_liefertage(cfg):
        eintrag = bekannt.get(datum) or {}
        schluss = store.bestellschluss_zeitpunkt(cfg, datum)
        tage.append({
            "datum": datum,
            "wochentag": store.wochentag(datum),
            "status": eintrag.get("status", store.STATUS_ENTWURF),
            "positionen": eintrag.get("positionen", 0),
            "bestellbar": store.bestellbar(datum),
            "bestellschluss": schluss.isoformat(timespec="minutes") if schluss else "",
            "schluss_verstrichen": store.schluss_verstrichen(cfg, datum, jetzt),
        })

    erledigt = (store.STATUS_GESENDET, store.STATUS_KORRIGIERT)
    offen = next((t for t in tage
                  if t["bestellbar"] and t["status"] not in erledigt), None)
    aktiv = offen["datum"] if offen else (tage[0]["datum"] if tage else "")

    # Erinnert wird nur fuer den naechstgelegenen offenen Tag - und nur
    # ausserhalb des Testbetriebs: Eine Testbestellung soll niemanden aus
    # dem Laden holen.
    erinnerung = bool(offen and offen["schluss_verstrichen"]
                      and not store.testbetrieb(cfg))
    return {"tage": tage, "aktiv": aktiv, "erinnerung": erinnerung}


def _verlauf(url, hdrs, cfg):
    _, artikel = store.load_artikel(url, hdrs)
    return store.verlauf(store.bestellungen(url, hdrs), artikel,
                         store.liefertag_nr(cfg))


def _korrekturzeilen(positionen, vorher):
    """Positionen fuers Korrekturblatt kennzeichnen (F7).

    Geaenderte Mengen werden hervorgehoben, entfallene mit Menge 0 angehaengt
    - das ersetzt das Durchstreichen auf dem Papier. Ohne sie sieht die
    Muehle nur eine kuerzere Liste und muss raten, was weggefallen ist.

    Gibt ``(zeilen, entfallen)``.
    """
    alt = {p.get("nr"): p for p in vorher or []}
    neu = {p.get("nr"): p for p in positionen or []}

    zeilen = []
    for p in positionen or []:
        zeile = dict(p)
        frueher = alt.get(p.get("nr"))
        if frueher is not None and frueher.get("menge") != p.get("menge"):
            zeile["geaendert"] = True
        zeilen.append(zeile)

    entfallen = []
    for nr, p in alt.items():
        if nr in neu:
            continue
        weg = dict(p)
        weg.update({"menge": 0, "gestrichen": True})
        entfallen.append(weg)
    return zeilen + entfallen, entfallen


def _senden(url, hdrs, cfg, datum_iso, body, korrektur=False):
    """Formular erzeugen, Mail versenden und den Tag sperren (F5, F6, F7)."""
    _, artikel = store.load_artikel(url, hdrs)
    aktiv = _aktive(artikel)
    erlaubt = set(store.artikel_map(aktiv))

    positionen = store.normalisiere_positionen(body.get("positionen"), erlaubt)
    if not positionen:
        return _err("Es ist noch nichts bestellt. Bitte mindestens eine "
                    "Position erfassen.")

    # Dieselbe Ordnung wie am Schirm: nach Warengruppe, darin nach
    # Verkaufshaeufigkeit. Wer im Laden erfasst, prueft danach das Blatt -
    # laufen die Listen auseinander, muss man bei jeder Zeile suchen.
    folge = {a.get("nr"): i for i, a
             in enumerate(store.nach_gruppe_und_nummer(aktiv))}
    positionen.sort(key=lambda p: folge.get(p.get("nr"), 9999))
    voll = store.positionen_mit_namen(positionen, artikel)

    _, vorhanden = store.load_order(url, hdrs, datum_iso)
    entfallen = []
    if korrektur:
        vorher = store.positionen_mit_namen(
            (vorhanden or {}).get("positionen") or [], artikel)
        zeilen, entfallen = _korrekturzeilen(voll, vorher)
    else:
        zeilen = voll

    try:
        anhang = build_formular(
            zeilen,
            datum_de=jetzt_lokal().strftime("%d.%m.%Y"),
            liefertext=_liefertext(cfg, datum_iso),
            kd_nr=cfg.get("kd_nr", ""),
            anschrift=cfg.get("anschrift") or [],
            gruppen=store.vorlage_gruppen(),
            testbetrieb=store.testbetrieb(cfg),
            korrektur=korrektur,
            erstdatum=store.datum_de((vorhanden or {}).get("gesendet_am", ""))
            if korrektur else "",
        )
    except Exception as e:
        logging.error(f"[drax] PDF fehlgeschlagen: {e}")
        return _err("Das Bestellformular konnte nicht erzeugt werden. "
                    "Bitte noch einmal versuchen.", 500)

    betreff = ("Korrektur Bestellung Lieferung "
               if korrektur else "Bestellung Lieferung ") \
        + store.datum_de(datum_iso)
    if store.testbetrieb(cfg):
        betreff = "[TEST] " + betreff
    text = _mail_text(datum_iso, cfg, voll, korrektur, entfallen)
    try:
        erfolg = _send_mail(cfg.get("empfaenger"),
                            cfg.get("empfaenger_name", ""),
                            betreff, text, anhang, datum_iso)
    except Exception as e:
        logging.error(f"[drax] Mailversand fehlgeschlagen: {e}")
        erfolg = False
    if not erfolg:
        # Der Entwurf bleibt erhalten - nichts geht verloren (F6).
        return _err("Die Bestellung konnte nicht versendet werden. "
                    "Der Entwurf ist gespeichert, bitte sp\u00e4ter erneut senden.",
                    502)

    order_id, _ = store.load_order(url, hdrs, datum_iso)
    order = dict(vorhanden or {})
    order.update({
        "datum": datum_iso,
        "status": store.STATUS_KORRIGIERT if korrektur else store.STATUS_GESENDET,
        "positionen": positionen,
        "dokument": base64.b64encode(anhang).decode("ascii"),
    })
    # Das Datum der ERSTEN Sendung bleibt stehen - das Korrekturblatt nennt
    # es, damit die Muehle das richtige Blatt ersetzt.
    order.setdefault("gesendet_am", datum_iso)
    if not korrektur:
        order["gesendet_am"] = jetzt_lokal().date().isoformat()

    protokoll = order.get("protokoll") or []
    protokoll.append(store.protokoll_eintrag(
        "korrigiert" if korrektur else "gesendet",
        cfg.get("empfaenger", ""), body.get("wer") or "Kiosk"))
    order["protokoll"] = protokoll
    store.save_order(url, hdrs, order_id, order)

    return _ok({
        "status": order["status"],
        "empfaenger": cfg.get("empfaenger"),
        "testbetrieb": store.testbetrieb(cfg),
        "protokoll": protokoll,
        "summen": store.summen(positionen),
        "entfallen": [p.get("nr") for p in entfallen],
    })


def _config_pruefen(neu):
    """Freundliche Pruefung der Einstellungen (F11)."""
    mail = (neu.get("empfaenger") or "").strip()
    if "@" not in mail or "." not in mail.split("@")[-1]:
        return "Bitte eine vollst\u00e4ndige E-Mail-Adresse eintragen."
    try:
        liefertag = int(neu.get("liefertag"))
        schluss_tag = int(neu.get("bestellschluss_tag"))
    except (TypeError, ValueError):
        return "Liefertag und Bestellschluss brauchen einen Wochentag."
    if not 0 <= liefertag <= 6 or not 0 <= schluss_tag <= 6:
        return "Liefertag und Bestellschluss brauchen einen Wochentag."
    if liefertag == schluss_tag:
        return ("Der Bestellschluss darf nicht auf den Liefertag fallen - "
                "sonst w\u00e4re die Ware schon unterwegs.")
    # Die Form allein genuegt nicht: "25:00" passte auf das Muster, haette
    # aber nie einen Bestellschluss ergeben.
    uhr = re.match(r"^(\d{1,2}):(\d{2})$",
                   (neu.get("bestellschluss") or "").strip())
    if not uhr or int(uhr.group(1)) > 23 or int(uhr.group(2)) > 59:
        return "Der Bestellschluss braucht eine Uhrzeit wie 12:00."
    if not str(neu.get("kd_nr") or "").strip():
        return "Ohne Kunden-Nr. kann die M\u00fchle die Bestellung nicht zuordnen."
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

    def sichtbar(c):
        return {k: v for k, v in c.items() if not k.startswith("_")}

    # ── Einstellungen ────────────────────────────────────────────────
    if datum == "config":
        if req.method != "POST":
            return _ok({"config": sichtbar(cfg),
                        "testbetrieb": store.testbetrieb(cfg)})
        neu = sichtbar(cfg)
        neu.update({k: v for k, v in (body.get("config") or {}).items()})
        fehler = _config_pruefen(neu)
        if fehler:
            return _err(fehler)
        neu["_rec_id"] = cfg.get("_rec_id", "")
        if not store.save_config(url, hdrs, neu):
            return _err("Die Einstellungen konnten nicht gespeichert werden.", 502)
        return _ok({"config": sichtbar(neu),
                    "testbetrieb": store.testbetrieb(neu)})

    # ── Uebersicht und Verlauf ───────────────────────────────────────
    if req.method == "GET" and not datum:
        if (req.params.get("mode") or "").lower() == "verlauf":
            return _ok({"verlauf": _verlauf(url, hdrs, cfg)})
        daten = _uebersicht(url, hdrs, cfg)
        daten["config"] = sichtbar(cfg)
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
                         f'inline; filename="{_anhang_name(datum)}"'},
        )

    # ── Positionen eines Verlaufstages (F9) ──────────────────────────
    # Der Verlauf laedt sie erst beim Aufklappen nach: Die Liste traegt bis
    # zu 60 Tage, jeder mit rund 15 Positionen - alles vorab mitzuschicken
    # waere Ballast fuer einen Reiter, den man meist nur ueberfliegt.
    if aktion == "positionen":
        _, artikel = store.load_artikel(url, hdrs)
        _, order = store.load_order(url, hdrs, datum)
        pos = (order or {}).get("positionen")
        quelle = "bestellung"
        if not order:
            lief = next((l for l in store.vorlage_historie()
                         if l.get("datum") == datum), None)
            if lief is None:
                return _err("Zu diesem Liefertag ist nichts gespeichert.", 404)
            pos = lief.get("positionen") or []
            quelle = "lieferung"
        voll = store.positionen_mit_namen(pos or [], artikel)
        return _ok({"datum": datum, "quelle": quelle, "positionen": voll,
                    **store.summen(pos or [])})

    # ── Entwurf lesen ────────────────────────────────────────────────
    if req.method == "GET":
        _, artikel = store.load_artikel(url, hdrs)
        order, herkunft = _entwurf(url, hdrs, cfg, datum, artikel)
        schluss = store.bestellschluss_zeitpunkt(cfg, datum)
        return _ok({
            "bestellung": order,
            "artikel": store.nach_gruppe_und_nummer(_aktive(artikel)),
            "gruppen": store.vorlage_gruppen(),
            "vorbelegt_aus": herkunft,
            "liefertag": store.ist_liefertag(cfg, datum),
            "bestellbar": store.bestellbar(datum),
            # Gesendet heisst gesperrt - geaendert wird nur ueber eine
            # ausdrueckliche Korrektur (F7).
            "nur_lesen": store.gesendet(order),
            "korrektur_moeglich": (store.gesendet(order)
                                   and store.korrektur_moeglich(cfg, datum)),
            "bestellschluss": schluss.isoformat(timespec="minutes") if schluss else "",
            "schluss_verstrichen": store.schluss_verstrichen(cfg, datum),
            "config": sichtbar(cfg),
            "testbetrieb": store.testbetrieb(cfg),
            "summen": store.summen(order.get("positionen") or []),
        })

    # ── Schreibende Aktionen ─────────────────────────────────────────
    if aktion == "loeschen":
        rec_id, vorhanden = store.load_order(url, hdrs, datum)
        if not rec_id or not vorhanden:
            return _err("Zu diesem Liefertag ist nichts gespeichert.", 404)
        if not store.delete_json(url, hdrs, rec_id):
            return _err("Die Bestellung konnte nicht gel\u00f6scht werden. "
                        "Bitte sp\u00e4ter erneut versuchen.", 502)
        return _ok({"datum": datum, "meldung": "Die Bestellung wurde gel\u00f6scht."})

    if aktion == "speichern":
        if not store.bestellbar(datum):
            return _err("F\u00fcr diesen Liefertag l\u00e4sst sich nichts mehr "
                        "bestellen - die Ware ist bereits unterwegs.", 409)
        rec_id, order = store.load_order(url, hdrs, datum)
        order = order or store.neuer_entwurf(datum)
        if store.gesendet(order):
            return _err("Die Bestellung ist bereits gesendet. Bitte "
                        "\u201eKorrektur senden\u201c verwenden.", 409)
        _, artikel = store.load_artikel(url, hdrs)
        erlaubt = set(store.artikel_map(_aktive(artikel)))
        order.update({
            "datum": datum,
            "positionen": store.normalisiere_positionen(
                body.get("positionen"), erlaubt),
        })
        order.setdefault("status", store.STATUS_ENTWURF)
        if not store.save_order(url, hdrs, rec_id, order):
            return _err("Der Entwurf konnte nicht gespeichert werden.", 502)
        return _ok({"status": order["status"],
                    "summen": store.summen(order["positionen"])})

    if aktion == "senden":
        if not store.bestellbar(datum):
            return _err("F\u00fcr diesen Liefertag l\u00e4sst sich nichts mehr "
                        "bestellen - die Ware ist bereits unterwegs.", 409)
        _, vorhanden = store.load_order(url, hdrs, datum)
        if store.gesendet(vorhanden):
            return _err("Diese Bestellung wurde bereits gesendet. Bitte "
                        "\u201eKorrektur senden\u201c verwenden.", 409)
        return _senden(url, hdrs, cfg, datum, body, korrektur=False)

    if aktion == "korrektur":
        _, vorhanden = store.load_order(url, hdrs, datum)
        if not store.gesendet(vorhanden):
            return _err("F\u00fcr diesen Liefertag wurde noch nichts gesendet.", 409)
        if not store.korrektur_moeglich(cfg, datum):
            return _err("Der Liefertag ist vorbei - eine Korrektur w\u00fcrde "
                        "die M\u00fchle nicht mehr erreichen.", 409)
        return _senden(url, hdrs, cfg, datum, body, korrektur=True)

    return _err("Diese Aktion ist nicht bekannt.", 404)
