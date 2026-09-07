"""Einmalwerkzeug: Testbestellungen aus der Datenbank entfernen.

Loescht Baecker- und Metzger-Bestellungen ab einem Stichtag. Gedacht fuer den
Uebergang in den Echtbetrieb: Was waehrend der Testphase erfasst wurde, soll
nicht als vermeintlich echte Bestellung stehen bleiben.

WICHTIG: Die aus E-Mails importierte Historie (Protokoll ``Import aus E-Mail``)
liegt vor dem Stichtag und bleibt unangetastet. Sie ist die Grundlage der
Vorbelegung - ohne sie startet jede Bestellung bei null.

Aufruf::

    python tools/bestellungen_loeschen.py --ab 2026-09-07            # nur zeigen
    python tools/bestellungen_loeschen.py --ab 2026-09-07 --loeschen # wirklich

Ohne ``--loeschen`` wird nichts angefasst.
"""

import argparse
import json
import os
import sys

import requests

HIER = os.path.dirname(os.path.abspath(__file__))
WURZEL = os.path.dirname(HIER)
sys.path.insert(0, os.path.join(WURZEL, "api", "baecker-order"))
sys.path.insert(0, os.path.join(WURZEL, "api", "metzger-order"))

ENTITY = "dl_seiteninhalts"
PK = "dl_seiteninhaltid"


def einstellungen_laden():
    """Zugangsdaten aus api/local.settings.json in die Umgebung heben."""
    pfad = os.path.join(WURZEL, "api", "local.settings.json")
    with open(pfad, encoding="utf-8") as fh:
        werte = json.load(fh).get("Values", {})
    for k, v in werte.items():
        os.environ.setdefault(k, str(v))


def token_holen():
    tenant = os.environ["DV_TENANT_ID"]
    r = requests.post(
        f"https://login.microsoftonline.com/{tenant}/oauth2/v2.0/token",
        data={
            "client_id": os.environ["DV_CLIENT_ID"],
            "client_secret": os.environ["DV_CLIENT_SECRET"],
            "scope": os.environ["DV_DEFAULT_URL"].rstrip("/") + "/.default",
            "grant_type": "client_credentials",
        },
        timeout=30,
    )
    r.raise_for_status()
    return r.json()["access_token"]


def kopf(token):
    return {
        "Authorization": f"Bearer {token}",
        "Accept": "application/json",
        "Content-Type": "application/json",
        "OData-MaxVersion": "4.0",
        "OData-Version": "4.0",
    }


def datensaetze(url, hdrs, praefix):
    """Alle Datensaetze mit diesem Schluessel-Praefix."""
    r = requests.get(
        f"{url}/api/data/v9.2/{ENTITY}"
        f"?$filter=startswith(dl_schluessel,'{praefix}')"
        f"&$select={PK},dl_schluessel,dl_wert&$top=500",
        headers=hdrs, timeout=40,
    )
    r.raise_for_status()
    return r.json().get("value", [])


def datum_aus(schluessel):
    """Letzte 10 Zeichen sind das ISO-Datum - bei beiden Schluesselformen."""
    rest = schluessel[-10:]
    if len(rest) == 10 and rest[4] == "-" and rest[7] == "-":
        return rest
    return ""


def herkunft(roh):
    """Woher stammt die Bestellung? Unterscheidet Test von echter Historie."""
    try:
        daten = json.loads(roh or "{}")
    except Exception:
        return "?"
    prot = daten.get("protokoll") or []
    if not prot:
        return "Entwurf (kein Protokoll)"
    return (prot[0] or {}).get("wer") or "?"


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--ab", required=True, help="Stichtag als ISO-Datum, z. B. 2026-09-07")
    ap.add_argument("--loeschen", action="store_true", help="wirklich loeschen")
    args = ap.parse_args()

    einstellungen_laden()
    url = os.environ["DV_DEFAULT_URL"].rstrip("/")
    hdrs = kopf(token_holen())

    treffer = []
    for praefix, titel in (("baecker_order_", "Baecker"),
                           ("metzger_order_", "Metzger")):
        for satz in datensaetze(url, hdrs, praefix):
            schluessel = satz.get("dl_schluessel", "")
            datum = datum_aus(schluessel)
            if not datum or datum < args.ab:
                continue
            treffer.append({
                "id": satz.get(PK), "schluessel": schluessel,
                "datum": datum, "bereich": titel,
                "herkunft": herkunft(satz.get("dl_wert")),
            })

    treffer.sort(key=lambda t: (t["bereich"], t["datum"]))
    print(f"Stichtag: ab {args.ab}")
    print(f"Gefunden: {len(treffer)} Bestellung(en)\n")
    for t in treffer:
        print(f"  {t['bereich']:<8} {t['datum']}  {t['schluessel']:<40} {t['herkunft']}")

    if not treffer:
        print("\nNichts zu tun.")
        return
    if not args.loeschen:
        print("\nNur angezeigt. Mit --loeschen wird wirklich entfernt.")
        return

    print("\nLoeschen ...")
    weg, fehler = 0, 0
    for t in treffer:
        r = requests.delete(f"{url}/api/data/v9.2/{ENTITY}({t['id']})",
                            headers=hdrs, timeout=30)
        if r.status_code in (200, 204):
            weg += 1
            print(f"  entfernt: {t['schluessel']}")
        else:
            fehler += 1
            print(f"  FEHLER  : {t['schluessel']} -> {r.status_code} {r.text[:120]}")
    print(f"\n{weg} entfernt, {fehler} Fehler.")


if __name__ == "__main__":
    main()
