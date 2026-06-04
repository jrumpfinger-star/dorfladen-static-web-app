import json
import os
import sys
import uuid
from datetime import datetime, timedelta
from pathlib import Path

import bcrypt
import msal
import requests

ROOT = Path(__file__).resolve().parents[1]
API = ROOT / "api"
LOCAL_SETTINGS = API / "local.settings.json"
PROD_URL = "https://orgab4e2f00.crm16.dynamics.com"


def load_settings():
    if not LOCAL_SETTINGS.exists():
        raise SystemExit(f"Fehlt: {LOCAL_SETTINGS}")
    cfg = json.loads(LOCAL_SETTINGS.read_text(encoding="utf-8-sig"))["Values"]
    os.environ.update(cfg)
    os.environ["DV_DEFAULT_URL"] = os.environ.get("SHOP_CLI_DV_URL") or PROD_URL
    return cfg


def get_base_url():
    return os.environ.get("DV_DEFAULT_URL") or PROD_URL


def get_token(base_url):
    app = msal.ConfidentialClientApplication(
        os.environ["DV_CLIENT_ID"],
        authority=f"https://login.microsoftonline.com/{os.environ['DV_TENANT_ID']}",
        client_credential=os.environ["DV_CLIENT_SECRET"],
    )
    result = app.acquire_token_for_client(scopes=[f"{base_url}/.default"])
    if "access_token" not in result:
        raise RuntimeError(result.get("error_description") or str(result))
    return result["access_token"]


def headers(token, prefer=False):
    h = {
        "Authorization": "Bearer " + token,
        "OData-MaxVersion": "4.0",
        "OData-Version": "4.0",
        "Accept": "application/json",
        "Content-Type": "application/json; charset=utf-8",
    }
    if prefer:
        h["Prefer"] = "return=representation"
    return h


def api_get(path, token):
    base = get_base_url()
    r = requests.get(base + path, headers=headers(token), timeout=60)
    return r


def api_post(entity_set, payload, token):
    base = get_base_url()
    return requests.post(
        f"{base}/api/data/v9.2/{entity_set}",
        headers=headers(token, prefer=True),
        json=payload,
        timeout=60,
    )


def api_patch(entity_set, record_id, payload, token):
    base = get_base_url()
    return requests.patch(
        f"{base}/api/data/v9.2/{entity_set}({record_id})",
        headers=headers(token),
        json=payload,
        timeout=60,
    )


def money(value):
    try:
        return f"{float(value):.2f} €"
    except Exception:
        return str(value)


def input_default(prompt, default):
    value = input(f"{prompt} [{default}]: ").strip()
    return value or default


def menu_header(title):
    print("\n" + "=" * 72)
    print(title)
    print("=" * 72)


def test_connection(token):
    menu_header("Dataverse Verbindung")
    base = get_base_url()
    r = requests.get(f"{base}/api/data/v9.2/WhoAmI", headers=headers(token), timeout=30)
    print("URL:", base)
    print("Status:", r.status_code)
    print(r.text[:1000])


def list_articles(token):
    menu_header("Artikel suchen")
    term = input("Suchbegriff (z.B. Nutella, Emmen, 6051): ").strip().lower()
    fields = "cr5d4_artikelnummeredeka,cr5d4_artikelbezeichnung,cr5d4_vk_dorf,cr5d4_warengruppebez,cr5d4_strichcode,cr5d4_mengentyp,cr5d4_mengeneinheit,cr5d4_mengenerfassung,cr5d4_bestelleinheit,cr5d4_tableid"
    r = api_get(f"/api/data/v9.2/cr5d4_tables?$select={fields}&$top=500", token)
    if r.status_code != 200:
        print("Fehler:", r.status_code, r.text[:1000])
        return
    rows = r.json().get("value", [])
    matches = []
    for a in rows:
        article_id = a.get("cr5d4_artikelnummeredeka") or a.get("cr5d4_strichcode") or a.get("cr5d4_tableid")
        hay = " ".join(str(x or "") for x in [article_id, a.get("cr5d4_strichcode"), a.get("cr5d4_artikelbezeichnung"), a.get("cr5d4_warengruppebez")]).lower()
        if not term or term in hay:
            matches.append((article_id, a))
    print(f"Treffer: {len(matches)} (aus Stichprobe 500)")
    for article_id, a in matches[:30]:
        mt = a.get("cr5d4_mengentyp")
        me = a.get("cr5d4_mengeneinheit")
        erf = a.get("cr5d4_mengenerfassung")
        unit = "kg" if str(mt or "").lower() == "kg" and str(erf or "").strip() == "3" else "Stück"
        print(f"{article_id:>14} | {a.get('cr5d4_strichcode') or '-':>14} | {money(a.get('cr5d4_vk_dorf')):>9} | {unit:>5} | {mt or '-'} {me or '-'} | {a.get('cr5d4_artikelbezeichnung')}")


def category_overview(token):
    menu_header("Kategorien")
    fields = "cr5d4_warengruppebez"
    r = api_get(f"/api/data/v9.2/cr5d4_tables?$select={fields}&$top=5000", token)
    if r.status_code != 200:
        print("Fehler:", r.status_code, r.text[:1000])
        return
    counts = {}
    for a in r.json().get("value", []):
        cat = (a.get("cr5d4_warengruppebez") or "Ohne Kategorie").strip()
        counts[cat] = counts.get(cat, 0) + 1
    for cat, count in sorted(counts.items(), key=lambda x: (-x[1], x[0])):
        print(f"{count:>5}  {cat}")


def create_test_customer(token):
    menu_header("Testkunde registrieren")
    email = input_default("E-Mail", f"test-cli-{uuid.uuid4().hex[:8]}@example.invalid")
    password = input_default("Passwort", "test1234")
    mand_ref = "DL-" + datetime.utcnow().strftime("%Y%m%d") + "-" + uuid.uuid4().hex[:6].upper()
    payload = {
        "dl_email": email,
        "dl_vorname": "CLI",
        "dl_nachname": "Test",
        "dl_passwort_hash": bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode(),
        "dl_telefon": "+491234",
        "dl_strasse": "Teststr 1",
        "dl_plz": "84166",
        "dl_ort": "Adlkofen",
        "dl_iban_encrypted": "cli-test-encrypted",
        "dl_kontoinhaber": "CLI Test",
        "dl_mandatsreferenz": mand_ref,
        "dl_mandatsdatum": datetime.utcnow().date().isoformat(),
        "dl_mandatstyp": "RCUR",
        "dl_mandatsstatus": "aktiv",
        "dl_sepa_mandat_json": json.dumps({"mandatsreferenz": mand_ref, "test": True}, ensure_ascii=False),
        "dl_email_verifiziert": False,
        "dl_aktiv": True,
        "dl_verify_token": uuid.uuid4().hex,
    }
    r = api_post("dl_shopkundes", payload, token)
    print("Status:", r.status_code)
    print(r.text[:1500])


def test_login(token):
    menu_header("Login prüfen")
    email = input("E-Mail: ").strip()
    password = input("Passwort: ").strip()
    safe_email = email.replace("'", "''")
    r = api_get(f"/api/data/v9.2/dl_shopkundes?$select=dl_email,dl_passwort_hash,dl_vorname,dl_nachname,dl_aktiv&$filter=dl_email eq '{safe_email}'&$top=1", token)
    if r.status_code != 200:
        print("Fehler:", r.status_code, r.text[:1000])
        return
    rows = r.json().get("value", [])
    if not rows:
        print("Nicht gefunden")
        return
    row = rows[0]
    valid = bcrypt.checkpw(password.encode(), row["dl_passwort_hash"].encode())
    print("Passwort gültig:", valid)
    print("Aktiv:", row.get("dl_aktiv"))


def create_test_order(token):
    menu_header("Testbestellung erstellen")
    email = input_default("Kunden-E-Mail", "test-order@example.invalid")
    name = input_default("Kundenname", "CLI Test")
    article_id = input_default("Artikelnummer/Strichcode", "6051")
    article_name = input_default("Artikelname", "Nuss-Schoko Croissant")
    price = float(input_default("Einzelpreis", "1.90").replace(",", "."))
    qty = float(input_default("Menge", "6").replace(",", "."))
    total = round(price * qty, 2)
    if total < 10:
        print(f"WARNUNG: Unter Mindestbestellwert 10 €, aktuell {total:.2f} €")
    bestellnummer = "TEST-" + datetime.utcnow().strftime("%H%M%S") + "-" + uuid.uuid4().hex[:4]
    positions = [{
        "artikelnummer": article_id,
        "strichcode": article_id,
        "bezeichnung": article_name,
        "menge": qty,
        "einheit": "Stück",
        "einzelpreis": price,
        "positionspreis": total,
    }]
    payload = {
        "dl_bestellnummer": bestellnummer,
        "dl_kunde_email": email,
        "dl_kunde_name": name,
        "dl_kunde_id": "cli-test",
        "dl_abholdatum": (datetime.utcnow() + timedelta(days=2)).strftime("%Y-%m-%d"),
        "dl_bestelldatum": (datetime.utcnow() + timedelta(hours=2)).strftime("%Y-%m-%d %H:%M"),
        "dl_status": 0,
        "dl_gesamtsumme": total,
        "dl_positionen_json": json.dumps(positions, ensure_ascii=False),
        "dl_anmerkungen": "CLI Testbestellung",
    }
    r = api_post("dl_shopbestellungs", payload, token)
    print("Status:", r.status_code)
    print(r.text[:2000])


def list_orders(token):
    menu_header("Bestellungen anzeigen")
    top = input_default("Anzahl", "10")
    r = api_get(f"/api/data/v9.2/dl_shopbestellungs?$select=dl_shopbestellungid,dl_bestellnummer,dl_kunde_name,dl_kunde_email,dl_status,dl_gesamtsumme,dl_abholdatum,createdon&$orderby=createdon desc&$top={top}", token)
    if r.status_code != 200:
        print("Fehler:", r.status_code, r.text[:1000])
        return
    for o in r.json().get("value", []):
        print(f"{o.get('dl_bestellnummer')} | Status {o.get('dl_status')} | {money(o.get('dl_gesamtsumme'))} | {o.get('dl_kunde_name')} | {o.get('dl_abholdatum')} | {o.get('dl_shopbestellungid')}")


def update_order_status(token):
    menu_header("Bestellstatus ändern")
    record_id = input("dl_shopbestellungid: ").strip()
    print("0=Neu, 1=In Bearbeitung, 2=Abholbereit, 3=Abgeholt, 4=Storniert")
    status = int(input_default("Status", "1"))
    r = api_patch("dl_shopbestellungs", record_id, {"dl_status": status}, token)
    print("Status:", r.status_code)
    print(r.text[:1000])


def save_pack_data(token):
    menu_header("Packdaten speichern")
    record_id = input("dl_shopbestellungid: ").strip()
    pack = {
        "gepackt_von": "cli-test",
        "gepackt_um": datetime.utcnow().isoformat(),
        "items": [],
    }
    r = api_patch("dl_shopbestellungs", record_id, {"dl_pack_json": json.dumps(pack, ensure_ascii=False), "dl_status": 2}, token)
    print("Status:", r.status_code)
    print(r.text[:1000])


def full_smoke_test(token):
    menu_header("Smoke Test")
    failures = 0
    try:
        r = requests.get(f"{get_base_url()}/api/data/v9.2/WhoAmI", headers=headers(token), timeout=30)
        print("WhoAmI", r.status_code)
        failures += 0 if r.status_code == 200 else 1
        r = api_get("/api/data/v9.2/cr5d4_tables?$select=cr5d4_artikelbezeichnung&$top=1", token)
        print("Artikel", r.status_code, len(r.json().get("value", [])) if r.status_code == 200 else "-")
        failures += 0 if r.status_code == 200 else 1
        r = api_get("/api/data/v9.2/dl_shopkundes?$select=dl_email&$top=1", token)
        print("Shopkunden", r.status_code)
        failures += 0 if r.status_code == 200 else 1
        r = api_get("/api/data/v9.2/dl_shopbestellungs?$select=dl_bestellnummer&$top=1", token)
        print("Bestellungen", r.status_code)
        failures += 0 if r.status_code == 200 else 1
    except Exception as e:
        failures += 1
        print("Fehler:", e)
    print("Ergebnis:", "OK" if failures == 0 else f"{failures} Fehler")


def main():
    load_settings()
    base = get_base_url()
    token = get_token(base)
    actions = {
        "1": ("Dataverse Verbindung testen", test_connection),
        "2": ("Artikel suchen", list_articles),
        "3": ("Kategorien anzeigen", category_overview),
        "4": ("Testkunde registrieren", create_test_customer),
        "5": ("Login prüfen", test_login),
        "6": ("Testbestellung erstellen", create_test_order),
        "7": ("Bestellungen anzeigen", list_orders),
        "8": ("Bestellstatus ändern", update_order_status),
        "9": ("Packdaten speichern", save_pack_data),
        "10": ("Smoke Test", full_smoke_test),
        "0": ("Beenden", None),
    }
    while True:
        print("\nDorfladen Shop CLI")
        print("Dataverse:", base)
        for key, (label, _) in actions.items():
            print(f"{key:>2}) {label}")
        choice = input("Auswahl: ").strip()
        if choice == "0":
            return
        action = actions.get(choice)
        if not action:
            print("Ungültige Auswahl")
            continue
        try:
            action[1](token)
        except KeyboardInterrupt:
            print("\nAbgebrochen")
        except Exception as e:
            print("FEHLER:", e)


if __name__ == "__main__":
    main()
