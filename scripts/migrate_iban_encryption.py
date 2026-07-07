"""
Migriert bestehende IBAN-Datensätze von Legacy 'ENC:' (Base64, effektiv
unverschlüsselt) auf 'ENC2:' (Fernet, AES-128-CBC + HMAC-SHA256).

Liest die Zugangsdaten aus api/local.settings.json (DV_* + IBAN_ENCRYPTION_KEY).

Verwendung:
    python scripts/migrate_iban_encryption.py            # Dry-Run (zeigt nur an)
    python scripts/migrate_iban_encryption.py --apply    # schreibt Änderungen

Sicherheit:
- Der Klartext der IBAN wird NIE ausgegeben (nur maskiert).
- Ohne IBAN_ENCRYPTION_KEY bricht das Skript ab.
- Datensätze, die bereits 'ENC2:' sind, werden übersprungen.
"""
import base64
import json
import os
import sys

import msal
import requests
from cryptography.fernet import Fernet

try:
    sys.stdout.reconfigure(encoding="utf-8")
except Exception:
    pass

ENTITY_SET = "dl_shopkundes"
ID_FIELD = "dl_shopkundeid"
IBAN_FIELD = "dl_iban_encrypted"

APPLY = "--apply" in sys.argv


def _load_settings():
    here = os.path.dirname(os.path.abspath(__file__))
    settings_path = os.path.join(here, "..", "api", "local.settings.json")
    with open(settings_path, "r", encoding="utf-8") as f:
        return json.load(f).get("Values", {})


def _get(settings, key, default=""):
    return os.environ.get(key) or settings.get(key, default)


def _mask(iban):
    if not iban or len(iban) < 8:
        return "****"
    return iban[:4] + " **** " + iban[-4:]


def _get_token(settings):
    tenant_id = _get(settings, "DV_TENANT_ID")
    client_id = _get(settings, "DV_CLIENT_ID")
    client_secret = _get(settings, "DV_CLIENT_SECRET")
    base_url = _get(settings, "DV_DEFAULT_URL")
    app = msal.ConfidentialClientApplication(
        client_id,
        authority=f"https://login.microsoftonline.com/{tenant_id}",
        client_credential=client_secret,
    )
    result = app.acquire_token_for_client(scopes=[f"{base_url}/.default"])
    token = result.get("access_token")
    if not token:
        raise SystemExit(f"Token-Fehler: {result.get('error_description', result)}")
    return token


def main():
    settings = _load_settings()
    key = _get(settings, "IBAN_ENCRYPTION_KEY").strip()
    if not key:
        raise SystemExit("IBAN_ENCRYPTION_KEY fehlt – Abbruch.")
    cipher = Fernet(key.encode())

    base_url = _get(settings, "DV_DEFAULT_URL").rstrip("/")
    token = _get_token(settings)
    headers = {
        "Authorization": f"Bearer {token}",
        "OData-MaxVersion": "4.0",
        "OData-Version": "4.0",
        "Accept": "application/json",
        "Content-Type": "application/json; charset=utf-8",
    }

    mode = "APPLY (schreibt)" if APPLY else "DRY-RUN (nur Anzeige)"
    print(f"Modus: {mode}")
    print(f"Dataverse: {base_url}\n")

    url = (
        f"{base_url}/api/data/v9.2/{ENTITY_SET}"
        f"?$select={ID_FIELD},{IBAN_FIELD}"
    )
    resp = requests.get(url, headers=headers, timeout=30)
    resp.raise_for_status()
    records = resp.json().get("value", [])

    total = len(records)
    legacy = 0
    migrated = 0
    skipped_enc2 = 0
    empty = 0
    failed = 0

    for rec in records:
        rec_id = rec.get(ID_FIELD)
        enc = rec.get(IBAN_FIELD) or ""
        if not enc:
            empty += 1
            continue
        if enc.startswith("ENC2:"):
            skipped_enc2 += 1
            continue
        if not enc.startswith("ENC:"):
            print(f"  [?] {rec_id}: unbekanntes Format, übersprungen")
            continue

        legacy += 1
        try:
            raw = base64.b64decode(enc[4:]).decode()
        except Exception as e:
            failed += 1
            print(f"  [FEHLER] {rec_id}: Base64-Dekodierung fehlgeschlagen ({e})")
            continue

        new_token = "ENC2:" + cipher.encrypt(raw.encode()).decode()
        if APPLY:
            patch_url = f"{base_url}/api/data/v9.2/{ENTITY_SET}({rec_id})"
            pr = requests.patch(
                patch_url, headers=headers,
                json={IBAN_FIELD: new_token}, timeout=30,
            )
            if pr.status_code in (200, 204):
                migrated += 1
                print(f"  [OK] {rec_id}: {_mask(raw)} -> ENC2:")
            else:
                failed += 1
                print(f"  [FEHLER] {rec_id}: HTTP {pr.status_code} {pr.text[:200]}")
        else:
            print(f"  [WUERDE MIGRIEREN] {rec_id}: {_mask(raw)} -> ENC2:")

    print("\n--- Zusammenfassung ---")
    print(f"  Gesamt:            {total}")
    print(f"  Leer:              {empty}")
    print(f"  Bereits ENC2:      {skipped_enc2}")
    print(f"  Legacy ENC::       {legacy}")
    if APPLY:
        print(f"  Migriert:          {migrated}")
    print(f"  Fehler:            {failed}")
    if not APPLY and legacy:
        print("\nZum tatsächlichen Migrieren erneut mit --apply ausführen.")


if __name__ == "__main__":
    main()
