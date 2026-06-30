"""
Create dl_storno_grund (String, 2000) on all three order entities:
  - dl_mittagsbestellung
  - dl_shopbestellung
  - dl_fleischbestellung

Also ensures dl_kunde_kommentar, dl_personal_antwort, dl_kommentar_gelesen
exist on dl_shopbestellung (already exist on Mittagstisch + Fleisch).

Usage:
  python scripts/create-storno-grund-fields.py

Requires env vars: DV_CLIENT_SECRET (and optionally DV_TENANT_ID, DV_CLIENT_ID, DV_DEFAULT_URL)
"""
import os
import sys
import json
import msal
import requests

# Load from local.settings.json as fallback
_settings = {}
_settings_path = os.path.join(os.path.dirname(__file__), "..", "api", "local.settings.json")
if os.path.exists(_settings_path):
    with open(_settings_path) as f:
        _settings = json.load(f).get("Values", {})

TENANT_ID = os.environ.get("DV_TENANT_ID", _settings.get("DV_TENANT_ID", "acfaedd4-c403-43b7-9544-fdb2b150124e"))
CLIENT_ID = os.environ.get("DV_CLIENT_ID", _settings.get("DV_CLIENT_ID", "137b2df6-be83-459a-ac89-9efd0bdf51c4"))
CLIENT_SECRET = os.environ.get("DV_CLIENT_SECRET", _settings.get("DV_CLIENT_SECRET", ""))
BASE_URL = os.environ.get("DV_DEFAULT_URL", _settings.get("DV_DEFAULT_URL", "https://orgab4e2f00.crm16.dynamics.com"))


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


def make_string_field(schema_name, label, description, max_length=2000):
    return {
        "SchemaName": schema_name,
        "DisplayName": {
            "@odata.type": "Microsoft.Dynamics.CRM.Label",
            "LocalizedLabels": [{"@odata.type": "Microsoft.Dynamics.CRM.LocalizedLabel", "Label": label, "LanguageCode": 1031}],
        },
        "Description": {
            "@odata.type": "Microsoft.Dynamics.CRM.Label",
            "LocalizedLabels": [{"@odata.type": "Microsoft.Dynamics.CRM.LocalizedLabel", "Label": description, "LanguageCode": 1031}],
        },
        "@odata.type": "Microsoft.Dynamics.CRM.StringAttributeMetadata",
        "AttributeType": "String",
        "FormatName": {"Value": "Text"},
        "MaxLength": max_length,
        "RequiredLevel": {"Value": "None"},
    }


def make_boolean_field(schema_name, label, description):
    return {
        "SchemaName": schema_name,
        "DisplayName": {
            "@odata.type": "Microsoft.Dynamics.CRM.Label",
            "LocalizedLabels": [{"@odata.type": "Microsoft.Dynamics.CRM.LocalizedLabel", "Label": label, "LanguageCode": 1031}],
        },
        "Description": {
            "@odata.type": "Microsoft.Dynamics.CRM.Label",
            "LocalizedLabels": [{"@odata.type": "Microsoft.Dynamics.CRM.LocalizedLabel", "Label": description, "LanguageCode": 1031}],
        },
        "@odata.type": "Microsoft.Dynamics.CRM.BooleanAttributeMetadata",
        "AttributeType": "Boolean",
        "OptionSet": {
            "@odata.type": "Microsoft.Dynamics.CRM.BooleanOptionSetMetadata",
            "TrueOption": {"Value": 1, "Label": {"@odata.type": "Microsoft.Dynamics.CRM.Label", "LocalizedLabels": [{"@odata.type": "Microsoft.Dynamics.CRM.LocalizedLabel", "Label": "Ja", "LanguageCode": 1031}]}},
            "FalseOption": {"Value": 0, "Label": {"@odata.type": "Microsoft.Dynamics.CRM.Label", "LocalizedLabels": [{"@odata.type": "Microsoft.Dynamics.CRM.LocalizedLabel", "Label": "Nein", "LanguageCode": 1031}]}},
        },
        "DefaultValue": False,
        "RequiredLevel": {"Value": "None"},
    }


# ── What to create on which entity ──
TASKS = [
    # dl_storno_grund on ALL three entities
    ("dl_mittagsbestellung", make_string_field("dl_storno_grund", "Storno-Grund", "Begründung bei Stornierung der Bestellung")),
    ("dl_shopbestellung",    make_string_field("dl_storno_grund", "Storno-Grund", "Begründung bei Stornierung der Bestellung")),
    ("dl_fleischbestellung", make_string_field("dl_storno_grund", "Storno-Grund", "Begründung bei Stornierung der Bestellung")),

    # dl_kunde_kommentar + dl_personal_antwort + dl_kommentar_gelesen on Shop (already on Mittagstisch + Fleisch)
    ("dl_shopbestellung", make_string_field("dl_kunde_kommentar", "Kunde Kommentar", "Kommentar des Kunden zur Bestellung")),
    ("dl_shopbestellung", make_string_field("dl_personal_antwort", "Personal Antwort", "Antwort des Personals auf Kundenkommentar")),
    ("dl_shopbestellung", make_boolean_field("dl_kommentar_gelesen", "Kommentar gelesen", "Ob der Kundenkommentar vom Personal gelesen wurde")),
]


def create_field(token, entity_logical_name, field_def):
    url = f"{BASE_URL}/api/data/v9.2/EntityDefinitions(LogicalName='{entity_logical_name}')/Attributes"
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
        print(f"  OK:   {entity_logical_name}.{name} created")
        return True
    elif r.status_code == 409 or "already exists" in r.text.lower() or "DuplicateAttributeSchemaName" in r.text:
        print(f"  SKIP: {entity_logical_name}.{name} already exists")
        return True
    else:
        print(f"  ERROR: {entity_logical_name}.{name} - HTTP {r.status_code}: {r.text[:300]}")
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
    print(f"Creating storno + comment fields in {BASE_URL}...\n")
    token = get_token()
    ok = True
    for entity, field_def in TASKS:
        if not create_field(token, entity, field_def):
            ok = False
    print()
    if ok:
        print("Publishing customizations...")
        publish(token)
        print("\nDone! All fields created/verified.")
    else:
        print("\nSome fields failed. Check errors above.")
        sys.exit(1)
