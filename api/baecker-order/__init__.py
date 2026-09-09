"""Baecker-Bestellung – Entwurf, Vorbelegung, Versand und Korrektur.

Der Dorfladen wird von **zwei** Baeckereien beliefert (siehe ``store.py``).
Aufrufe, die eine bestimmte Bestellung betreffen, tragen deshalb ``baeckerei``;
uebergreifende Abrufe (Tagesleiste, Verlauf, Einstellungen) kommen ohne aus und
liefern die Baeckerei je Eintrag mit.

GET  /api/baecker-order?baeckerei=..&datum=JJJJ-MM-TT   Bestellung inkl. Vorbelegung
GET  /api/baecker-order?mode=uebersicht                 Tagesleiste + Erinnerung
GET  /api/baecker-order?mode=verlauf                    Verlauf (optional je Baeckerei)
GET  /api/baecker-order?mode=config                     Einstellungen (fuer das CMS)
POST /api/baecker-order                                 Entwurf speichern
POST /api/baecker-order {aktion:"config"}               Einstellungen speichern
POST /api/baecker-order {aktion:"gedruckt"}             Papierausdruck vermerken
POST /api/baecker-order/{datum}/senden                  Formular erzeugen und senden
POST /api/baecker-order/{datum}/korrektur               Korrektur versenden
"""
import importlib.util
import json
import logging
import os
import re
import sys
import base64
from datetime import date, datetime, timedelta

import azure.functions as func

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from shared.auth import admin_auth_guard  # noqa: E402
from shared import richtext  # noqa: E402
import store  # noqa: E402
from docx_fill import fill_form  # noqa: E402
from pdf_fill import build_pdf  # noqa: E402
from formular_pdf import build_formular  # noqa: E402

VORLAGEN_ORDNER = os.path.join(os.path.dirname(os.path.abspath(__file__)), "vorlage")
VORLAGE = os.path.join(VORLAGEN_ORDNER, "freundl-werktag.docx")

DOCX_MIME = ("application/vnd.openxmlformats-officedocument"
             ".wordprocessingml.document")
PDF_MIME = "application/pdf"

# Anhang je Ausgabeformat. Der Dateiname landet im Postfach der Baeckerei –
# deshalb sprechend halten.
ANHANG = {
    "docx": ("Freundl-Bestellformular.docx", DOCX_MIME),
    "pdf": ("Bestellung-Martins-Backstube.pdf", PDF_MIME),
}
ANHANG_NAME = ANHANG["docx"][0]   # Rueckwaertskompatibilitaet fuer Werkzeuge


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


def _send_mail(to_email, to_name, subject, body_text, attachment_bytes, format_="docx"):
    """Mail ueber den bestehenden Graph-Versand aus shop-notify."""
    name, mime = ANHANG.get(format_, ANHANG["docx"])
    pfad = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
                        "shop-notify", "__init__.py")
    spec = importlib.util.spec_from_file_location("shop_notify_mail", pfad)
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    return mod.send_email(
        to_email, to_name, subject, body_text,
        attachments=[{"name": name, "content": attachment_bytes, "type": mime}],
        # Kein Shop-Knopf: Die Baeckerei bestellt nicht in unserem Laden.
        mit_shop_link=False,
    )


def _mail_text(datum_iso, cfg, korrektur=False, notiz=None):
    """``cfg`` ist die Konfiguration EINER Baeckerei.

    Ein erfasster Hinweis steht auch im Mailtext, nicht nur im Anhang - manche
    Empfaenger oeffnen den Anhang erst spaeter (Spec bestell-freitext).
    """
    tag = store.wochentag(datum_iso)
    einleitung = (
        "anbei die Korrektur unserer Bestellung"
        if korrektur else "anbei unsere Bestellung"
    )
    kennung = f"Kd.-Nr. {cfg.get('kd_nr')}"
    tour = store.tour_nr(cfg, datum_iso)
    if tour:
        kennung += f" / Tour-Nr. {tour}"
    hinweis = (notiz or {}).get("text", "").strip() if notiz else ""
    hinweis_block = f"Hinweis vom Dorfladen:\n{hinweis}\n\n" if hinweis else ""
    return (
        f"Guten Tag,\n\n"
        f"{einleitung} f\u00fcr {tag}, den {store.datum_de(datum_iso)}.\n"
        f"{kennung}\n\n"
        + hinweis_block
        + f"Das ausgef\u00fcllte Bestellformular finden Sie im Anhang.\n\n"
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


def _positionen_formular(order, artikel):
    """**Alle** Katalogzeilen mit den Mengen dieser Bestellung (F23).

    Der Papierausdruck soll dasselbe Blatt zeigen wie das versendete Dokument:
    Die Word-Vorlage ist ein Formular ueber den ganzen Katalog, in das nur die
    Mengen eingetragen werden. Eine Liste nur der bestellten Positionen waere
    ein anderes Papier - und genau das war der Fehler.

    Zusatzartikel, die nicht im Katalog stehen, haengen hinten an; ohne sie
    fehlte auf dem Blatt, was zusaetzlich bestellt wurde.
    """
    mengen = {}
    for p in order.get("positionen", []):
        nr = str(p.get("nummer") or "").strip()
        schluessel = nr or (p.get("name") or "").strip().lower()
        mengen[schluessel] = p

    out, benutzt = [], set()
    for a in artikel:
        nr = str(a.get("nummer") or "").strip()
        schluessel = nr or (a.get("name") or "").strip().lower()
        p = mengen.get(schluessel, {})
        if p:
            benutzt.add(schluessel)
        out.append({
            "nummer": nr,
            "name": a.get("name", ""),
            "menge": int(p.get("menge") or 0),
            "retoure": int(p.get("retoure") or 0),
        })
    out.sort(key=lambda p: (store.sort_nr(p["nummer"]), p["name"]))

    for schluessel, p in mengen.items():
        if schluessel in benutzt:
            continue
        if not (int(p.get("menge") or 0) or int(p.get("retoure") or 0)):
            continue
        out.append({
            "nummer": str(p.get("nummer") or "").strip(),
            "name": (p.get("name") or "").strip(),
            "menge": int(p.get("menge") or 0),
            "retoure": int(p.get("retoure") or 0),
            "zusatz": True,
        })
    return out


def _dokument(url, hdrs, bcfg, bk, datum_iso):
    """Das Bestellformular als PDF - frisch aus den gespeicherten Positionen.

    Nichts wird zusaetzlich abgelegt: Das Blatt entsteht bei jedem Abruf neu
    aus derselben Quelle wie der Mailanhang.

    Baeckereien mit Word-Anhang (Freundl) bekommen die **Nachbildung** ihrer
    Vorlage: gleiche Kopfzeilen, gleiche vier Spalten, alle Katalogzeilen. Ein
    Browser kann ``.docx`` nicht drucken, und auf dem Server steht weder Word
    noch LibreOffice bereit. Baeckereien mit PDF-Anhang (Martin's) bekommen
    genau das Blatt, das auch per Mail hinausging.
    """
    _, order = store.load_order(url, hdrs, bk, datum_iso)
    if not order:
        return None
    artikel = store.sort_artikel(store.load_artikel(url, hdrs, bk))
    zeilen = _positionen_formular(order, artikel)
    korrektur = order.get("status") == store.STATUS_KORRIGIERT
    notiz = order.get("notiz")
    if (bcfg.get("format") or "docx").lower() == "docx":
        return build_formular(
            zeilen, store.datum_de(datum_iso),
            kd_nr=bcfg.get("kd_nr", ""),
            tour_nr=store.tour_nr(bcfg, datum_iso),
            testbetrieb=store.testbetrieb(bcfg),
            korrektur=korrektur,
            notiz=notiz,
        )
    return build_pdf(
        zeilen,
        store.datum_de(datum_iso), store.wochentag(datum_iso),
        kd_nr=bcfg.get("kd_nr", ""), baeckerei_name=bcfg.get("name", ""),
        tour_nr=store.tour_nr(bcfg, datum_iso),
        testbetrieb=store.testbetrieb(bcfg),
        korrektur=korrektur,
        formular=True,
        notiz=notiz,
    )


def _build_entwurf(url, hdrs, cfg, bk, datum_iso):
    """Bestellung laden oder aus dem letzten gleichen Wochentag vorbelegen.

    ``cfg`` ist die Konfiguration EINER Baeckerei.
    """
    rec_id, order = store.load_order(url, hdrs, bk, datum_iso)
    artikel = store.load_artikel(url, hdrs, bk)
    vorlagen = store.vorlage_bestellungen(url, hdrs, bk, datum_iso)

    # Vergleichswerte je Artikel: letzter gleicher Wochentag + drei davor
    verlauf = {}
    for _, v in vorlagen:
        for key, menge in store.positionen_map(v).items():
            verlauf.setdefault(key, []).append(menge)

    gesendet = order.get("status") in (store.STATUS_GESENDET, store.STATUS_KORRIGIERT)
    hat_entwurf = bool(order.get("positionen"))
    # Startwerte aus den Rechnungen: greifen NUR, wenn es fuer diesen Wochentag
    # noch keine echte Bestellung gibt. Sobald eine gesendet wurde, hat sie
    # Vorrang - der Durchschnitt ist nur die Starthilfe am ersten Tag.
    sw_mengen, _sw_woche, sw_meta = store.startwerte(bk)
    aus_startwerten = False
    if hat_entwurf:
        mengen = {}
        retouren = {}
        for p in order["positionen"]:
            key = str(p.get("nummer") or "").strip() or (p.get("name") or "").lower()
            mengen[key] = int(p.get("menge") or 0)
            retouren[key] = int(p.get("retoure") or 0)
        # Herkunft der Vorbelegung: aus dem Entwurf, sonst der letzte gleiche Wochentag
        quelle = order.get("vorlage_datum") or (vorlagen[0][0] if vorlagen else "")
    elif vorlagen:
        # Noch kein Entwurf: exakt den letzten gleichen Wochentag uebernehmen
        mengen = store.positionen_map(vorlagen[0][1])
        retouren = {}
        quelle = vorlagen[0][0]
    else:
        # Weder Entwurf noch Vorgaenger: Durchschnitt aus den Rechnungen
        mengen = dict(sw_mengen)
        retouren = {}
        quelle = ""
        aus_startwerten = bool(sw_mengen)

    zeilen = []
    _bs = store.bestellschluss_tag(datum_iso)
    _bs_iso = _bs.isoformat() if _bs else ""
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
        "baeckerei": bk,
        "baeckerei_name": cfg.get("name") or bk,
        "wochentag": store.wochentag(datum_iso),
        "datum_de": store.datum_de(datum_iso),
        "status": order.get("status", store.STATUS_ENTWURF),
        "gesperrt": gesendet,
        # Bestellt wird immer fuer einen kuenftigen Liefertag.
        "bestellbar": _bestellbar(datum_iso),
        "korrektur_moeglich": gesendet and store.korrektur_moeglich(cfg, datum_iso),
        "hat_entwurf": hat_entwurf,
        "vorlage_datum": quelle,
        "vorlage_datum_de": store.datum_de(quelle) if quelle else "",
        # Wann muss diese Lieferung spaetestens bestellt sein? In der Regel der
        # Vortag - faellt der auf Sonntag oder Feiertag, entsprechend frueher.
        # Der Kiosk schreibt es an, damit niemand Liefertag und Bestelltag
        # verwechselt.
        "bestellschluss_datum": _bs_iso,
        "bestellschluss_datum_de": store.datum_de(_bs_iso) if _bs_iso else "",
        "bestellschluss_wochentag": store.wochentag(_bs_iso) if _bs_iso else "",
        # Vorbelegung stammt aus dem Rechnungs-Durchschnitt, nicht aus einer
        # echten Bestellung – die Oberflaeche muss das anders benennen.
        "aus_startwerten": aus_startwerten,
        "startwerte_meta": sw_meta if aus_startwerten else {},
        "protokoll": order.get("protokoll", []),
        "notiz": order.get("notiz"),
        "positionen": zeilen,
        "tour_nr": store.tour_nr(cfg, datum_iso),
        "kd_nr": cfg.get("kd_nr"),
        "empfaenger": cfg.get("empfaenger"),
        "papierausdruck": bool(cfg.get("papierausdruck")),
        "gedruckt_am": order.get("gedruckt_am", ""),
        # Ausdruck steht aus: gesendet, gefordert, aber noch nicht gedruckt.
        "druck_offen": bool(gesendet and cfg.get("papierausdruck")
                            and not order.get("gedruckt_am")),
        "gruppen": cfg.get("gruppen") or [],
        "testbetrieb": store.testbetrieb(cfg),
        "record_id": rec_id,
    }


def _uebersicht(url, hdrs, cfg):
    """Tagesleiste und Erinnerungsstatus (Spec F1, F9, F18, F19).

    Je Tag steht eine **Liste** der liefernden Baeckereien mit ihrem Stand –
    am Samstag sind es zwei. Daraus ergeben sich die Farbpunkte, „1 von 2"
    und der Zaehler am Tab.
    """
    heute = date.today()
    tage = []
    druck_offen_gesamt = 0
    for i in range(7):
        d = heute + timedelta(days=i)
        iso = d.isoformat()
        lieferanten = []
        for bk in store.liefert_am(cfg, iso):
            bcfg = store.cfg_von(cfg, bk)
            _, order = store.load_order(url, hdrs, bk, iso)
            s = order.get("status")
            gesendet = s in (store.STATUS_GESENDET, store.STATUS_KORRIGIERT)
            gedruckt = bool(order.get("gedruckt_am"))
            druck_offen = bool(gesendet and bcfg.get("papierausdruck") and not gedruckt)
            lieferanten.append({
                "baeckerei": bk,
                "name": bcfg.get("name") or bk,
                "status": ("gesendet" if s == store.STATUS_GESENDET
                           else "korrigiert" if s == store.STATUS_KORRIGIERT
                           else "offen"),
                "gedruckt": gedruckt,
                "druck_offen": druck_offen,
            })
            # Ein fehlender Ausdruck ist offene Arbeit, egal an welchem Tag.
            if druck_offen:
                druck_offen_gesamt += 1
        fertig = sum(1 for x in lieferanten
                     if x["status"] != "offen" and not x["druck_offen"])
        # Bestellt wird IMMER fuer einen kuenftigen Liefertag. Fuer heute ist
        # die Ware laengst da – eine Bestellung waere sinnlos und richtete im
        # Zweifel Schaden an (versehentlich abgeschickt).
        bestellbar = i > 0 and bool(lieferanten)
        # Wann muss diese Lieferung bestellt sein? Der Kiosk springt beim
        # Oeffnen auf den Tag, der HEUTE faellig ist - dort liegt die Arbeit.
        # Frueher landete er stur auf morgen, auch wenn das laengst gesendet
        # war: Man sah "gesendet" und hatte nichts zu tun.
        bs = store.bestellschluss_tag(iso) if lieferanten else None
        bs_iso = bs.isoformat() if bs else ""
        offen_hier = any(x["status"] == "offen" for x in lieferanten)
        tage.append({
            "datum": iso, "wochentag": store.wochentag(iso),
            "bestelltag": bool(lieferanten),
            "bestellbar": bestellbar,
            "heute": i == 0,
            "bestellschluss_datum": bs_iso,
            "bestellschluss_datum_de": store.datum_de(bs_iso) if bs_iso else "",
            "bestellschluss_wochentag": store.wochentag(bs_iso) if bs_iso else "",
            "heute_bestellen": bool(bestellbar and offen_hier and bs == heute),
            "hat_offene": bool(bestellbar and offen_hier),
            "lieferanten": lieferanten,
            "fertig": fertig,
            "gesamt": len(lieferanten),
            # Sammelstatus fuer die Faerbung des Tagesplaettchens
            "status": ("kein_tag" if not lieferanten
                       else "gesendet" if fertig == len(lieferanten)
                       else "druck_offen" if any(x["druck_offen"] for x in lieferanten)
                       else "vorbei" if not bestellbar
                       else "offen"),
        })

    # Erinnerung: Welche Lieferung muss HEUTE bestellt werden?
    #
    # Frueher wurde nur auf "morgen" geschaut. Das laesst die Montags-Lieferung
    # durchfallen: Ihr Vortag ist der Sonntag, da ist der Laden zu – am Samstag
    # sah die Erinnerung nur den leeren Sonntag und schwieg. Dasselbe gilt vor
    # Feiertagen. Massgeblich ist deshalb der Bestellschluss-Tag je Lieferung:
    # der letzte Arbeitstag davor.
    #
    # ACHTUNG: An Samstagen liefern beide Baeckereien – wird nur eine geprueft,
    # ist der Blinkstatus falsch, und der Kiosk kann das nicht ausbuegeln.
    offen = False
    blinkt = False
    wer_offen = []
    faellig_datum = ""
    schluss_zeit = ""
    for i in range(1, 9):
        tag = (heute + timedelta(days=i)).isoformat()
        if store.bestellschluss_tag(tag) != heute:
            continue
        for bk in store.liefert_am(cfg, tag):
            bcfg = store.cfg_von(cfg, bk)
            _, order = store.load_order(url, hdrs, bk, tag)
            if order.get("status") in (store.STATUS_GESENDET, store.STATUS_KORRIGIERT):
                continue
            offen = True
            if not faellig_datum:
                faellig_datum = tag
            wer_offen.append(bcfg.get("name") or bk)
            schluss = bcfg.get("bestellschluss") or "12:00"
            if not schluss_zeit:
                schluss_zeit = schluss
            # Im Testbetrieb bleibt der Reiter ruhig: Eine Bestellung, die an
            # die Testadresse geht, soll niemanden aus dem Laden holen. Das
            # endet, sobald der Empfaenger die echte Baeckerei ist.
            if store.testbetrieb(bcfg):
                continue
            try:
                h, m = (int(x) for x in schluss.split(":"))
                jetzt = datetime.now()
                if (jetzt.hour, jetzt.minute) >= (h, m):
                    blinkt = True
            except Exception:
                pass

    # Der Zaehler am Tab nennt die ANSTEHENDE Arbeit: die heute faelligen
    # Bestellungen plus alle offenen Ausdrucke. Bewusst NICHT jeder offene Tag
    # der Woche – sonst stuende dort dauerhaft eine Zahl und niemand schaute
    # noch hin.
    return {
        "tage": tage,
        "offen_gesamt": len(wer_offen) + druck_offen_gesamt,
        "erinnerung": {
            "offen": offen, "blinkt": blinkt,
            "datum": faellig_datum,
            "wochentag": store.wochentag(faellig_datum) if faellig_datum else "",
            "bestellschluss": schluss_zeit,
            "baeckereien": wer_offen,
        },
    }


def _verlauf(url, hdrs, cfg, bk=None):
    """Verlauf – ohne Baeckerei ueber beide, mit Kennzeichnung je Eintrag."""
    eintraege = []
    for gefunden, d, data in store.bestellungen(url, hdrs, bk):
        bcfg = store.cfg_von(cfg, gefunden)
        pos = [p for p in (data or {}).get("positionen", [])
               if (p.get("menge") or 0) or (p.get("retoure") or 0)]
        gesendet = data.get("status") in (store.STATUS_GESENDET, store.STATUS_KORRIGIERT)
        eintraege.append({
            "datum": d,
            "datum_de": store.datum_de(d),
            "wochentag": store.wochentag(d),
            "baeckerei": gefunden,
            "baeckerei_name": bcfg.get("name") or gefunden,
            "status": data.get("status", store.STATUS_ENTWURF),
            "positionen": len(pos),
            "stueck": sum(int(p.get("menge") or 0) for p in pos),
            "protokoll": data.get("protokoll", []),
            "gedruckt_am": data.get("gedruckt_am", ""),
            "papierausdruck": bool(bcfg.get("papierausdruck")),
            "druck_offen": bool(gesendet and bcfg.get("papierausdruck")
                                and not data.get("gedruckt_am")),
        })
    eintraege.sort(key=lambda e: (e["datum"], e["baeckerei"]), reverse=True)
    return {"verlauf": eintraege[:60]}


def _bestellbar(datum_iso):
    """Nur kuenftige Liefertage lassen sich bestellen.

    Fuer heute ist die Ware laengst geliefert – eine Bestellung ginge ins
    Leere. Der Riegel sitzt bewusst im Server: Ein veralteter Kiosk oder ein
    Doppelklick darf keine sinnlose Bestellung ausloesen.
    """
    try:
        return datetime.strptime(datum_iso, "%Y-%m-%d").date() > date.today()
    except ValueError:
        return False


def _senden(url, hdrs, cfg, bk, datum_iso, body, korrektur=False):
    """Formular erzeugen und per Mail versenden (Spec F6, F7, F8, F20).

    ``cfg`` ist die Konfiguration EINER Baeckerei.
    """
    if not _bestellbar(datum_iso):
        naechster = store.naechster_bestelltag(cfg)
        return _err(
            f"F\u00fcr {store.wochentag(datum_iso)}, den {store.datum_de(datum_iso)}, "
            "l\u00e4sst sich nichts mehr bestellen \u2013 dieser Tag ist bereits "
            "geliefert. Bestellt wird immer f\u00fcr einen k\u00fcnftigen Liefertag, "
            f"als N\u00e4chstes {store.wochentag(naechster)}, "
            f"der {store.datum_de(naechster)}.")

    rec_id, order = store.load_order(url, hdrs, bk, datum_iso)

    if korrektur and not store.korrektur_moeglich(cfg, datum_iso):
        naechster = store.naechster_bestelltag(cfg)
        return _err(
            "Eine Korrektur ist nur f\u00fcr den n\u00e4chsten Liefertag m\u00f6glich "
            f"({store.wochentag(naechster)}, {store.datum_de(naechster)}). "
            f"Die Bestellung f\u00fcr {store.datum_de(datum_iso)} ist bereits geliefert.")

    positionen = body.get("positionen")
    if positionen is None:
        positionen = order.get("positionen", [])
    # Der Hinweis des Dorfladens: Kommt keiner mit, bleibt der gespeicherte
    # stehen - genau wie bei den Positionen (Spec bestell-freitext, F5).
    if "notiz" in body:
        notiz = richtext.notiz_aus(body.get("notiz"))
    else:
        notiz = order.get("notiz")

    artikel = store.load_artikel(url, hdrs, bk)
    versand = _positionen_fuer_versand({"positionen": positionen}, artikel)
    # Diese Pruefung steht bewusst VOR der Formatweiche und gilt damit fuer
    # beide Baeckereien.
    if not versand:
        return _err("Die Bestellung enth\u00e4lt keine Mengen. "
                    "Bitte zuerst Mengen eintragen.")

    testbetrieb = store.testbetrieb(cfg)
    format_ = (cfg.get("format") or "docx").lower()
    try:
        if format_ == "pdf":
            dokument = build_pdf(
                versand, store.datum_de(datum_iso), store.wochentag(datum_iso),
                kd_nr=cfg.get("kd_nr", ""), baeckerei_name=cfg.get("name", ""),
                tour_nr=store.tour_nr(cfg, datum_iso),
                testbetrieb=testbetrieb, korrektur=korrektur, notiz=notiz,
            )
        else:
            with open(VORLAGE, "rb") as fh:
                vorlage = fh.read()
            dokument = fill_form(
                vorlage, store.datum_de(datum_iso), versand,
                kd_nr=cfg.get("kd_nr", "1190"),
                tour_nr=store.tour_nr(cfg, datum_iso),
                notiz=notiz,
            )
    except Exception as e:
        logging.error(f"[baecker-order] Formular fehlgeschlagen ({format_}): {e}")
        return _err("Das Bestellformular konnte nicht erstellt werden. "
                    "Bitte erneut versuchen.", 500)

    betreff = ("Korrektur Bestellung " if korrektur else "Bestellung ") + store.datum_de(datum_iso)
    ok, info = _send_mail(
        cfg.get("empfaenger"), cfg.get("empfaenger_name") or "B\u00e4ckerei",
        betreff, _mail_text(datum_iso, cfg, korrektur, notiz), dokument, format_,
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
        "baeckerei": bk,
        "status": store.STATUS_KORRIGIERT if korrektur else store.STATUS_GESENDET,
        "positionen": positionen,
        "notiz": notiz,
        "protokoll": [eintrag] + (order.get("protokoll") or []),
    })
    # Eine Korrektur macht den vorherigen Ausdruck ungueltig.
    if korrektur:
        order["gedruckt_am"] = ""
    store.write_json(url, hdrs, store.order_key(bk, datum_iso), rec_id, order,
                     f"Baecker-Bestellung {bk} {datum_iso}")

    druck_offen = bool(cfg.get("papierausdruck"))
    return _ok({
        "status": order["status"],
        "protokoll": order["protokoll"],
        "papierausdruck": druck_offen,
        "druck_offen": druck_offen,
        "positionen_druck": versand if druck_offen else [],
        "meldung": ("Korrektur gesendet." if korrektur else "Bestellung gesendet.")
                   + f" {eintrag['positionen']} Positionen, {eintrag['stueck']} St\u00fcck."
                   + (" Bitte noch ausdrucken." if druck_offen else ""),
    })


def _gedruckt(url, hdrs, cfg, bk, datum_iso, body):
    """Vermerkt, dass der Papierausdruck erfolgt ist (Spec F23).

    Erst danach gilt der Tag als vollstaendig erledigt.
    """
    rec_id, order = store.load_order(url, hdrs, bk, datum_iso)
    if not order:
        return _err("Zu diesem Tag gibt es noch keine Bestellung.")
    if order.get("status") not in (store.STATUS_GESENDET, store.STATUS_KORRIGIERT):
        return _err("Die Bestellung wurde noch nicht gesendet \u2013 "
                    "ein Ausdruck ergibt erst danach Sinn.")

    order["gedruckt_am"] = datetime.now().isoformat(timespec="seconds")
    order["protokoll"] = [{
        "zeit": order["gedruckt_am"],
        "art": "gedruckt",
        "wer": (body.get("wer") or "").strip() or "Kiosk",
    }] + (order.get("protokoll") or [])
    store.write_json(url, hdrs, store.order_key(bk, datum_iso), rec_id, order,
                     f"Baecker-Bestellung {bk} {datum_iso}")
    return _ok({"gedruckt_am": order["gedruckt_am"],
                "meldung": "Ausdruck vermerkt."})


def _config_pruefen(cfg_bk, name=""):
    """Prueft die Einstellungen EINER Baeckerei.

    Gibt eine verstaendliche Fehlermeldung zurueck oder None. Die Werte kommen
    aus dem CMS und landen ungeprueft im Formularkopf bzw. steuern den
    Mailversand – deshalb hier streng pruefen.
    """
    wo = f" ({name})" if name else ""
    tage = cfg_bk.get("bestelltage") or []
    if not isinstance(tage, list) or not tage:
        return f"Bitte mindestens einen Bestelltag ausw\u00e4hlen{wo}."
    for t in tage:
        if not isinstance(t, int) or t < 0 or t > 6:
            return f"Ung\u00fcltiger Bestelltag{wo}."

    mail = (cfg_bk.get("empfaenger") or "").strip()
    if "@" not in mail or "." not in mail.split("@")[-1]:
        return f"Bitte eine g\u00fcltige E-Mail-Adresse angeben{wo}."

    bk_mail = (cfg_bk.get("baeckerei_mail") or "").strip()
    if bk_mail and ("@" not in bk_mail or "." not in bk_mail.split("@")[-1]):
        return f"Die Adresse der B\u00e4ckerei ist keine g\u00fcltige E-Mail-Adresse{wo}."

    schluss = (cfg_bk.get("bestellschluss") or "").strip()
    if not re.match(r"^([01]\d|2[0-3]):[0-5]\d$", schluss):
        return f"Bestellschluss bitte als Uhrzeit angeben, z.\u202fB. 12:00{wo}."

    if not str(cfg_bk.get("kd_nr") or "").strip():
        return f"Bitte die Kunden-Nummer angeben{wo}."

    if (cfg_bk.get("format") or "docx") not in ("docx", "pdf"):
        return f"Unbekanntes Formularformat{wo}."
    # Tour-Nr. ist nicht bei jeder Baeckerei gebraeuchlich (Martin's hat keine)
    # und deshalb bewusst nicht mehr Pflicht.
    return None


def _config_speichern(url, hdrs, cfg, body):
    """Einstellungen einer oder aller Baeckereien speichern (Spec F25)."""
    eingang = body.get("config") or {}
    # Sowohl {baeckereien:{…}} als auch {baeckerei:'martins', config:{…}}
    if "baeckereien" in eingang:
        neu_roh = eingang.get("baeckereien") or {}
    else:
        ziel = (body.get("baeckerei") or eingang.get("baeckerei") or "").strip()
        if not store.baeckerei_gueltig(ziel):
            return _err("Bitte angeben, welche B\u00e4ckerei gespeichert werden soll.")
        neu_roh = {ziel: {k: v for k, v in eingang.items() if k != "baeckerei"}}

    zusammen = {bk: dict(store.cfg_von(cfg, bk)) for bk in store.BAECKEREIEN}
    for bk, werte in neu_roh.items():
        if not store.baeckerei_gueltig(bk):
            continue
        zusammen[bk].update(werte or {})

    for bk in store.BAECKEREIEN:
        fehler = _config_pruefen(zusammen[bk], zusammen[bk].get("name") or bk)
        if fehler:
            return _err(fehler)

    rec_id, _ = store.read_json(url, hdrs, store.KEY_CONFIG)
    if not store.write_json(url, hdrs, store.KEY_CONFIG, rec_id,
                            {"baeckereien": zusammen}, "Baecker-Einstellungen"):
        return _err("Einstellungen konnten nicht gespeichert werden.", 500)

    # Ueberschneidende Bestelltage sind erlaubt (Samstag) – aber ein Hinweis
    # ist hilfreich, damit niemand sie fuer einen Fehler haelt.
    hinweise = []
    for wd in range(7):
        wer = [zusammen[bk].get("name") or bk for bk in store.BAECKEREIEN
               if wd in (zusammen[bk].get("bestelltage") or [])]
        if len(wer) > 1:
            hinweise.append(f"{store.TAGE[wd]}: {' und '.join(wer)}")
    meldung = "Einstellungen gespeichert."
    if hinweise:
        meldung += " An diesen Tagen liefern beide: " + "; ".join(hinweise) + "."
    return _ok({"config": {"baeckereien": zusammen}, "meldung": meldung,
                "hinweise": hinweise})


def _baeckerei_aus(req, body=None):
    """Baeckerei aus Query, Route oder Rumpf. Leer, wenn nicht angegeben."""
    for quelle in (req.params.get("baeckerei"),
                   (req.route_params or {}).get("baeckerei"),
                   (body or {}).get("baeckerei")):
        wert = (quelle or "").strip().lower()
        if wert:
            return wert
    return ""


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

    def bk_pflicht(body=None):
        """Baeckerei ermitteln – fuer Aufrufe, die genau eine betreffen."""
        bk = _baeckerei_aus(req, body)
        if not bk:
            return None, _err(
                "Bitte angeben, um welche B\u00e4ckerei es geht "
                f"({' oder '.join(store.BAECKEREIEN)}).")
        if not store.baeckerei_gueltig(bk):
            return None, _err(f"Unbekannte B\u00e4ckerei \u201e{bk}\u201c.")
        return bk, None

    try:
        if req.method == "GET":
            mode = (req.params.get("mode") or "").strip()
            # Diese drei spannen bewusst ueber BEIDE Baeckereien und kommen
            # ohne den Parameter aus – der Kiosk ruft sie so auf.
            if mode == "uebersicht":
                return _ok(_uebersicht(url, hdrs, cfg))
            if mode == "verlauf":
                gewuenscht = _baeckerei_aus(req)
                return _ok(_verlauf(url, hdrs, cfg,
                                    gewuenscht if store.baeckerei_gueltig(gewuenscht) else None))
            if mode == "config":
                return _ok({"config": cfg, "baeckereien": list(store.BAECKEREIEN)})

            if mode == "dokument":
                # Das Blatt zum Ausdrucken. Frueher baute der Kiosk sich eine
                # eigene HTML-Seite - die sah dem versendeten Formular nicht
                # aehnlich, was aus dem Laden gemeldet wurde. Jetzt kommt es
                # aus derselben Quelle wie der Mailanhang.
                bk, fehler = bk_pflicht()
                if fehler:
                    return fehler
                bcfg = store.cfg_von(cfg, bk)
                datum = (req.params.get("datum") or "").strip()
                if not datum:
                    return _err("Bitte angeben, um welchen Liefertag es geht.")
                blatt = _dokument(url, hdrs, bcfg, bk, datum)
                if not blatt:
                    return _err("F\u00fcr diesen Tag gibt es keine Bestellung.", 404)
                return _ok({
                    "dateiname": f"Bestellung-{bk}-{datum}.pdf",
                    "pdf_base64": base64.b64encode(blatt).decode("ascii"),
                })

            bk, fehler = bk_pflicht()
            if fehler:
                return fehler
            bcfg = store.cfg_von(cfg, bk)
            datum = (req.params.get("datum") or "").strip()
            if not datum:
                datum = store.naechster_bestelltag(bcfg)
            return _ok({"bestellung": _build_entwurf(url, hdrs, bcfg, bk, datum)})

        if req.method == "POST":
            body = req.get_json()
            aktion = (req.route_params.get("aktion")
                      or body.get("aktion") or "speichern").strip()

            # Einstellungen haengen an keinem Liefertag – deshalb vor der
            # Datumspruefung.
            if aktion == "config":
                return _config_speichern(url, hdrs, cfg, body)

            bk, fehler = bk_pflicht(body)
            if fehler:
                return fehler
            bcfg = store.cfg_von(cfg, bk)

            datum = (req.route_params.get("datum")
                     or body.get("datum") or "").strip()
            if not datum:
                return _err("Bitte einen Liefertag angeben.")

            if aktion in ("senden", "korrektur"):
                return _senden(url, hdrs, bcfg, bk, datum, body,
                               korrektur=(aktion == "korrektur"))

            if aktion == "gedruckt":
                return _gedruckt(url, hdrs, bcfg, bk, datum, body)

            # Entwurf speichern
            rec_id, order = store.load_order(url, hdrs, bk, datum)
            if order.get("status") in (store.STATUS_GESENDET, store.STATUS_KORRIGIERT) \
                    and not body.get("korrekturmodus"):
                return _err("Diese Bestellung wurde bereits gesendet. "
                            "\u00c4nderungen sind nur \u00fcber eine Korrektur m\u00f6glich.")
            order.update({
                "datum": datum,
                "baeckerei": bk,
                "status": order.get("status", store.STATUS_ENTWURF),
                "positionen": body.get("positionen") or [],
                "notiz": (richtext.notiz_aus(body.get("notiz"))
                          if "notiz" in body else order.get("notiz")),
                "vorlage_datum": body.get("vorlage_datum", order.get("vorlage_datum", "")),
                "protokoll": order.get("protokoll", []),
            })
            if not store.write_json(url, hdrs, store.order_key(bk, datum), rec_id, order,
                                    f"Baecker-Bestellung {bk} {datum}"):
                return _err("Der Entwurf konnte nicht gespeichert werden.", 500)
            return _ok({"meldung": "Entwurf gespeichert."})

        return _err("Nicht unterst\u00fctzte Anfrage.", 405)

    except ValueError:
        return _err("Die Anfrage konnte nicht gelesen werden.")
    except Exception as e:
        logging.error(f"[baecker-order] {e}")
        return _err("Es ist ein Fehler aufgetreten. Bitte erneut versuchen.", 500)
