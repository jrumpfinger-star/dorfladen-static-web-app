"""
Create dl_kommentar_gelesen Boolean field on dl_fleischbestellung entity.
(dl_kunde_kommentar and dl_personal_antwort already exist as Memo fields)

Usage:
  python scripts/create-fleisch-comment-fields.py
"""
import os
import sys
import json
import msal
import requests

TENANT_ID = os.environ.get("DV_TENANT_ID", "acfaedd4-c403-43b7-9544-fdb2b150124e")
CLIENT_ID = os.environ.get("DV_CLIENT_ID", "137b2df6-be83-459a-ac89-9efd0bdf51c4")
CLIENT_SECRET = os.environ.get("DV_CLIENT_SECRET", "")
BASE_URL = os.environ.get("DV_DEFAULT_URL", "https://orgab4e2f00.crm16.dynamics.com")

ENTITY_LOGICAL_NAME = "dl_fleischbestellung"

FIELDS = [
    {
        "SchemaName": "dl_kommentar_gelesen",
        "DisplayName": {"@odata.type": "Microsoft.Dynamics.CRM.Label", "LocalizedLabels": [{"@odata.type": "Microsoft.Dynamics.CRM.LocalizedLabel", "Label": "Kommentar gelesen", "LanguageCode": 1031}]},
        "Description": {"@odata.type": "Microsoft.Dynamics.CRM.Label", "LocalizedLabels": [{"@odata.type": "Microsoft.Dynamics.CRM.LocalizedLabel", "Label": "Ob der Kundenkommentar vom Personal gelesen wurde", "LanguageCode": 1031}]},
        "@odata.type": "Microsoft.Dynamics.CRM.BooleanAttributeMetadata",
        "AttributeType": "Boolean",
        "OptionSet": {
            "@odata.type": "Microsoft.Dynamics.CRM.BooleanOptionSetMetadata",
            "TrueOption": {"Value": 1, "Label": {"@odata.type": "Microsoft.Dynamics.CRM.Label", "LocalizedLabels": [{"@odata.type": "Microsoft.Dynamics.CRM.LocalizedLabel", "Label": "Ja", "LanguageCode": 1031}]}},
            "FalseOption": {"Value": 0, "Label": {"@odata.type": "Microsoft.Dynamics.CRM.Label", "LocalizedLabels": [{"@odata.type": "Microsoft.Dynamics.CRM.LocalizedLabel", "Label": "Nein", "LanguageCode": 1031}]}},
        },
        "DefaultValue": False,
        "RequiredLevel": {"Value": "None"},
    },
]


def get_token():
    if not CLIENT_SECRET:
        print("ERROR: DV_CLIENT_SECRET not set!")
        sys.exit(1)
    app = msal.ConfidentialClientApplication(
        CLIENT_ID,
        authority=f"https://login.microsoftonline.com/{TENANT_ID}",
        client_credential=CLIENT_SECRET,
    )
    result = app.acquire_token_for_client(scopes=[f"{BASE_URL}/.default"])
    token = result.get("access_token")
    if not token:
        print(f"ERROR: Could not acquire token: {result.get('error_description', result)}")
        sys.exit(1)
    return token


def create_field(token, field_def):
    url = f"{BASE_URL}/api/data/v9.2/EntityDefinitions(LogicalName='{ENTITY_LOGICAL_NAME}')/Attributes"
    headers = {
        "Authorization": f"Bearer {token}",
        "OData-MaxVersion": "4.0",
        "OData-Version": "4.0",
        "Accept": "application/json",
        "Content-Type": "application/json; charset=utf-8",
    }
    r = requests.post(url, headers=headers, json=field_def, timeout=30)
    name = field_def["SchemaName"]
    if r.status_code in (200, 201, 204):
        print(f"  OK: {name} created successfully")
        return True
    elif r.status_code == 409 or "already exists" in r.text.lower() or "DuplicateAttributeSchemaName" in r.text:
        print(f"  SKIP: {name} already exists")
        return True
    else:
        print(f"  ERROR: {name} - HTTP {r.status_code}: {r.text[:300]}")
        return False


def publish(token):
    url = f"{BASE_URL}/api/data/v9.2/PublishAllXml"
    headers = {
        "Authorization": f"Bearer {token}",
        "OData-MaxVersion": "4.0",
        "OData-Version": "4.0",
        "Accept": "application/json",
    }
    r = requests.post(url, headers=headers, timeout=60)
    if r.status_code in (200, 204):
        print("  OK: Customizations published")
    else:
        print(f"  WARN: PublishAllXml returned {r.status_code}")


if __name__ == "__main__":
    print(f"Creating fields on '{ENTITY_LOGICAL_NAME}' in {BASE_URL}...")
    token = get_token()
    ok = True
    for field in FIELDS:
        if not create_field(token, field):
            ok = False
    if ok:
        print("Publishing customizations...")
        publish(token)
        print("Done!")
    else:
        print("Some fields failed. Check errors above.")
        sys.exit(1)
