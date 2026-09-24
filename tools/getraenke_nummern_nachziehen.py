"""Traegt die echten Kratzer-Artikelnummern in den LIVE-Katalog nach.

Warum ein eigenes Werkzeug noetig ist: ``vorlage/katalog.json`` ist nur der
**Startbestand**. Sobald in Dataverse ein Katalog liegt, wird die Vorlage
nicht mehr gelesen (``load_artikel``: „ohne gespeicherten Bestand greift die
Vorlage"). Die im Repo geaenderten Nummern kaemen also nie im Laden an.

Gemessen am 24.09.2026 gegen die Produktion: Der Live-Katalog fuehrte noch
sechs Platzhalter wie ``AHO-LIMETTE``.

Fuenf davon sind aus der Liste des Lieferanten eindeutig belegt. Der sechste
(``AHO-ORANGE-SPORT``) bleibt: Kratzer fuehrt Kirsch, Lemon und Pink
Grapefruit - keine Orange. Eine davon zu nehmen waere geraten.

Aufruf:
    python tools/getraenke_nummern_nachziehen.py            nur anzeigen
    python tools/getraenke_nummern_nachziehen.py --schreiben

Benoetigt beim Schreiben dieselben App-Settings wie die API
(DV_TENANT_ID, DV_CLIENT_ID, DV_CLIENT_SECRET, DV_DEFAULT_URL).
"""
import argparse
import os
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.join(ROOT, "api", "getraenke-order"))
sys.path.insert(0, os.path.join(ROOT, "api"))

import getraenke_store as store  # noqa: E402

# Belegt aus "Kunden Bestellformular.xlsx" (Art.-Nr. | Bezeichnung):
#   50071  Aho Limette PET 12x0,50
#   50922  Wolfra Apfel Kirsch 6x1,00
#   50926  Wolfra Apfel klar 6x1,00
#   50928  Wolfra Apfel trueb 6x1,00
#   50951  Wolfra Johannisb. schwarz 6x1,00
ZUORDNUNG = {
    "AHO-LIMETTE": "KA50071",
    "WOLFRA-APFEL-KIRSCH": "KA50922",
    "WOLFRA-APFEL-KLAR": "KA50926",
    "WOLFRA-APFEL-TRUEB": "KA50928",
    "WOLFRA-JOHANNISBEER": "KA50951",
}


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--schreiben", action="store_true")
    args = ap.parse_args()

    token = store.get_token()
    if not token:
        print("Kein Token - DV_* App-Settings gesetzt?")
        raise SystemExit(1)
    url = os.environ.get(store.DEFAULT_URL_SETTING, store.DEFAULT_URL_FALLBACK)
    hdrs = store.headers(token)

    rec_id, artikel = store.load_artikel(url, hdrs)
    print(f"Live-Katalog: {len(artikel)} Artikel, Datensatz {rec_id or '(aus Vorlage)'}")
    if not rec_id:
        print("\nEs liegt noch KEIN Katalog in Dataverse - dann greift die")
        print("Vorlage aus dem Repo, und die traegt die Nummern bereits.")
        return

    treffer, offen = [], []
    for a in artikel:
        alt = str(a.get("nummer") or "")
        if alt in ZUORDNUNG:
            treffer.append((a, alt, ZUORDNUNG[alt]))
        elif not alt.startswith("KA"):
            offen.append(a)

    print(f"\n{len(treffer)} Nummern zum Nachziehen:")
    for a, alt, neu in treffer:
        print(f"   {alt:<22} -> {neu:<10} {a.get('name')} {a.get('gebinde','')}")
    if offen:
        print(f"\n{len(offen)} bleiben ohne echte Nummer:")
        for a in offen:
            print(f"   {a.get('nummer'):<22} {a.get('name')} {a.get('gebinde','')}")

    if not treffer:
        print("\nNichts zu tun.")
        return
    if not args.schreiben:
        print("\nNur angezeigt. Mit --schreiben uebernehmen.")
        return

    for a, _alt, neu in treffer:
        a["nummer"] = neu

    # Doppelte Nummern waeren fatal: Zwei Artikel mit derselben Nummer
    # liessen den Lieferanten raten.
    nummern = [str(a.get("nummer")) for a in artikel]
    doppelt = {n for n in nummern if nummern.count(n) > 1}
    if doppelt:
        print(f"\nABBRUCH - doppelte Nummern: {doppelt}")
        raise SystemExit(1)

    ok = store.save_artikel(url, hdrs, rec_id, artikel)
    print(f"\ngespeichert: {ok}")

    # Gegenprobe: neu laden und nachsehen.
    _, frisch = store.load_artikel(url, hdrs)
    rest = [a for a in frisch if not str(a.get("nummer") or "").startswith("KA")]
    print(f"Nach dem Schreiben noch ohne KA-Nummer: {len(rest)}")
    for a in rest:
        print(f"   {a.get('nummer')}  {a.get('name')}")


if __name__ == "__main__":
    main()
