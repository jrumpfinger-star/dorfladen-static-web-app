"""
Expand dl_inhalt field on dl_news entity from 10485 to 100000 characters.
Run once: python scripts/expand-dl-inhalt.py
Requires: DV_CLIENT_SECRET env var set, or .env file.
"""
import os
import sys
import msal
import requests

# Load .env if present
env_path = os.path.join(os.path.dirname(__file__), '..', 'api', 'local.settings.json')
if os.path.exists(env_path):
    import json
    with open(env_path) as f:
        settings = json.load(f).get("Values", {})
    for k, v in settings.items():
        if k not in os.environ:
            os.environ[k] = v

BASE_URL = os.environ.get("DV_DEFAULT_URL", "https://orgab4e2f00.crm16.dynamics.com")
TENANT_ID = os.environ.get("DV_TENANT_ID", "acfaedd4-c403-43b7-9544-fdb2b150124e")
CLIENT_ID = os.environ.get("DV_CLIENT_ID", "137b2df6-be83-459a-ac89-9efd0bdf51c4")
CLIENT_SECRET = os.environ.get("DV_CLIENT_SECRET", "")

ENTITY = "dl_news"
FIELD = "dl_inhalt"
NEW_MAX_LENGTH = 100000


def get_token():
    if not CLIENT_SECRET:
        print("ERROR: DV_CLIENT_SECRET not set")
        sys.exit(1)
    app = msal.ConfidentialClientApplication(
        CLIENT_ID,
        authority=f"https://login.microsoftonline.com/{TENANT_ID}",
        client_credential=CLIENT_SECRET,
    )
    result = app.acquire_token_for_client(scopes=[f"{BASE_URL}/.default"])
    token = result.get("access_token")
    if not token:
        print(f"ERROR: Token acquisition failed: {result.get('error_description')}")
        sys.exit(1)
    return token


def main():
    token = get_token()
    headers = {
        "Authorization": f"Bearer {token}",
        "OData-MaxVersion": "4.0",
        "OData-Version": "4.0",
        "Accept": "application/json",
        "Content-Type": "application/json; charset=utf-8",
    }

    # 1. Get current attribute metadata
    attr_url = (
        f"{BASE_URL}/api/data/v9.2/"
        f"EntityDefinitions(LogicalName='{ENTITY}')"
        f"/Attributes(LogicalName='{FIELD}')"
    )
    r = requests.get(attr_url, headers=headers, timeout=30)
    if r.status_code != 200:
        print(f"ERROR: Could not find attribute {FIELD} on {ENTITY}: {r.status_code} {r.text[:300]}")
        sys.exit(1)

    attr_data = r.json()
    current_max = attr_data.get("MaxLength", "?")
    attr_type = attr_data.get("AttributeType", "?")
    print(f"Found: {ENTITY}.{FIELD} (Type={attr_type}, MaxLength={current_max})")

    if current_max >= NEW_MAX_LENGTH:
        print(f"Already >= {NEW_MAX_LENGTH}. Nothing to do.")
        return

    # 2. Update MaxLength via PUT
    odata_type = "Microsoft.Dynamics.CRM.MemoAttributeMetadata" if attr_type == "Memo" else "Microsoft.Dynamics.CRM.StringAttributeMetadata"
    update_payload = {
        "@odata.type": odata_type,
        "MaxLength": NEW_MAX_LENGTH,
    }

    r = requests.put(attr_url, headers={**headers, "If-Match": "*"}, json=update_payload, timeout=30)
    if r.status_code in (200, 204):
        print(f"SUCCESS: {ENTITY}.{FIELD} MaxLength updated to {NEW_MAX_LENGTH}")
    else:
        print(f"ERROR: Update failed: {r.status_code} {r.text[:500]}")
        sys.exit(1)

    # 3. Publish the entity so the change takes effect
    publish_url = f"{BASE_URL}/api/data/v9.2/PublishXml"
    publish_payload = {
        "ParameterXml": f"<importexportxml><entities><entity>{ENTITY}</entity></entities></importexportxml>"
    }
    r = requests.post(publish_url, headers=headers, json=publish_payload, timeout=60)
    if r.status_code in (200, 204):
        print(f"Entity {ENTITY} published successfully.")
    else:
        print(f"WARNING: Publish failed: {r.status_code} {r.text[:300]}")


if __name__ == "__main__":
    main()
