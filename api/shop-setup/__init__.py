"""
Shop Setup API – Creates Dataverse entities for the Bestellsystem.
Entities: dl_shopkunde, dl_shopbestellung, dl_shopposition
Run ONCE to initialize the schema. Idempotent (checks before creating).
"""
import azure.functions as func
import json
import os
import msal
import requests


DEFAULT_URL_SETTING = "DV_DEFAULT_URL"
DEFAULT_URL_FALLBACK = "https://orgab4e2f00.crm16.dynamics.com"


def get_token():
    tenant_id = os.environ.get("DV_TENANT_ID", "acfaedd4-c403-43b7-9544-fdb2b150124e")
    client_id = os.environ.get("DV_CLIENT_ID", "137b2df6-be83-459a-ac89-9efd0bdf51c4")
    client_secret = os.environ.get("DV_CLIENT_SECRET", "")
    target_url = os.environ.get(DEFAULT_URL_SETTING, DEFAULT_URL_FALLBACK)
    if not client_secret:
        return None
    try:
        a = msal.ConfidentialClientApplication(
            client_id,
            authority=f"https://login.microsoftonline.com/{tenant_id}",
            client_credential=client_secret,
        )
        r = a.acquire_token_for_client(scopes=[f"{target_url}/.default"])
        return r.get("access_token")
    except:
        return None


def get_cors_headers():
    return {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
        "Access-Control-Allow-Headers": "*",
        "Content-Type": "application/json; charset=utf-8"
    }


def _base_url():
    return os.environ.get(DEFAULT_URL_SETTING, DEFAULT_URL_FALLBACK)


def _headers(token):
    return {
        "Authorization": f"Bearer {token}",
        "OData-MaxVersion": "4.0",
        "OData-Version": "4.0",
        "Accept": "application/json",
        "Content-Type": "application/json; charset=utf-8",
        "MSCRM.SolutionUniqueName": "DorfladenOberornau"
    }


def _entity_exists(base_url, headers, logical_name):
    """Check if entity already exists."""
    url = f"{base_url}/api/data/v9.2/EntityDefinitions(LogicalName='{logical_name}')?$select=LogicalName"
    r = requests.get(url, headers=headers, timeout=30)
    return r.status_code == 200


def _create_entity(base_url, headers, schema_name, display_name, display_plural, description, primary_attr_name, primary_attr_display):
    """Create a new Dataverse entity via Metadata API."""
    logical = schema_name.lower()
    if _entity_exists(base_url, headers, logical):
        return {"entity": logical, "status": "already_exists"}

    payload = {
        "@odata.type": "Microsoft.Dynamics.CRM.EntityMetadata",
        "SchemaName": schema_name,
        "DisplayName": {"@odata.type": "Microsoft.Dynamics.CRM.Label", "LocalizedLabels": [{"@odata.type": "Microsoft.Dynamics.CRM.LocalizedLabel", "Label": display_name, "LanguageCode": 1031}]},
        "DisplayCollectionName": {"@odata.type": "Microsoft.Dynamics.CRM.Label", "LocalizedLabels": [{"@odata.type": "Microsoft.Dynamics.CRM.LocalizedLabel", "Label": display_plural, "LanguageCode": 1031}]},
        "Description": {"@odata.type": "Microsoft.Dynamics.CRM.Label", "LocalizedLabels": [{"@odata.type": "Microsoft.Dynamics.CRM.LocalizedLabel", "Label": description, "LanguageCode": 1031}]},
        "HasNotes": False,
        "HasActivities": False,
        "OwnershipType": "UserOwned",
        "IsActivity": False,
        "PrimaryNameAttribute": primary_attr_name.lower(),
        "Attributes": [
            {
                "@odata.type": "Microsoft.Dynamics.CRM.StringAttributeMetadata",
                "SchemaName": primary_attr_name,
                "DisplayName": {"@odata.type": "Microsoft.Dynamics.CRM.Label", "LocalizedLabels": [{"@odata.type": "Microsoft.Dynamics.CRM.LocalizedLabel", "Label": primary_attr_display, "LanguageCode": 1031}]},
                "MaxLength": 200,
                "RequiredLevel": {"Value": "ApplicationRequired"},
                "AttributeType": "String",
                "AttributeTypeName": {"Value": "StringType"},
                "IsPrimaryName": True
            }
        ]
    }

    url = f"{base_url}/api/data/v9.2/EntityDefinitions"
    r = requests.post(url, headers=headers, json=payload, timeout=60)
    if r.status_code in (200, 201, 204):
        return {"entity": logical, "status": "created"}
    else:
        return {"entity": logical, "status": "error", "code": r.status_code, "detail": r.text[:500]}


def _add_string_attr(base_url, headers, entity_logical, schema_name, display_name, max_length=200, required=False):
    """Add a string attribute to an existing entity."""
    url = f"{base_url}/api/data/v9.2/EntityDefinitions(LogicalName='{entity_logical}')/Attributes"
    payload = {
        "@odata.type": "Microsoft.Dynamics.CRM.StringAttributeMetadata",
        "SchemaName": schema_name,
        "DisplayName": {"@odata.type": "Microsoft.Dynamics.CRM.Label", "LocalizedLabels": [{"@odata.type": "Microsoft.Dynamics.CRM.LocalizedLabel", "Label": display_name, "LanguageCode": 1031}]},
        "MaxLength": max_length,
        "RequiredLevel": {"Value": "ApplicationRequired" if required else "None"},
        "AttributeType": "String",
        "AttributeTypeName": {"Value": "StringType"}
    }
    r = requests.post(url, headers=headers, json=payload, timeout=30)
    return r.status_code in (200, 201, 204)


def _add_boolean_attr(base_url, headers, entity_logical, schema_name, display_name, default_val=False):
    """Add a boolean attribute to an existing entity."""
    url = f"{base_url}/api/data/v9.2/EntityDefinitions(LogicalName='{entity_logical}')/Attributes"
    payload = {
        "@odata.type": "Microsoft.Dynamics.CRM.BooleanAttributeMetadata",
        "SchemaName": schema_name,
        "DisplayName": {"@odata.type": "Microsoft.Dynamics.CRM.Label", "LocalizedLabels": [{"@odata.type": "Microsoft.Dynamics.CRM.LocalizedLabel", "Label": display_name, "LanguageCode": 1031}]},
        "RequiredLevel": {"Value": "None"},
        "AttributeType": "Boolean",
        "AttributeTypeName": {"Value": "BooleanType"},
        "OptionSet": {
            "@odata.type": "Microsoft.Dynamics.CRM.BooleanOptionSetMetadata",
            "TrueOption": {"Value": 1, "Label": {"@odata.type": "Microsoft.Dynamics.CRM.Label", "LocalizedLabels": [{"@odata.type": "Microsoft.Dynamics.CRM.LocalizedLabel", "Label": "Ja", "LanguageCode": 1031}]}},
            "FalseOption": {"Value": 0, "Label": {"@odata.type": "Microsoft.Dynamics.CRM.Label", "LocalizedLabels": [{"@odata.type": "Microsoft.Dynamics.CRM.LocalizedLabel", "Label": "Nein", "LanguageCode": 1031}]}}
        },
        "DefaultValue": default_val
    }
    r = requests.post(url, headers=headers, json=payload, timeout=30)
    return r.status_code in (200, 201, 204)


def _add_decimal_attr(base_url, headers, entity_logical, schema_name, display_name, precision=2, min_val=0, max_val=999999):
    """Add a decimal attribute to an existing entity."""
    url = f"{base_url}/api/data/v9.2/EntityDefinitions(LogicalName='{entity_logical}')/Attributes"
    payload = {
        "@odata.type": "Microsoft.Dynamics.CRM.DecimalAttributeMetadata",
        "SchemaName": schema_name,
        "DisplayName": {"@odata.type": "Microsoft.Dynamics.CRM.Label", "LocalizedLabels": [{"@odata.type": "Microsoft.Dynamics.CRM.LocalizedLabel", "Label": display_name, "LanguageCode": 1031}]},
        "RequiredLevel": {"Value": "None"},
        "AttributeType": "Decimal",
        "AttributeTypeName": {"Value": "DecimalType"},
        "Precision": precision,
        "MinValue": min_val,
        "MaxValue": max_val
    }
    r = requests.post(url, headers=headers, json=payload, timeout=30)
    return r.status_code in (200, 201, 204)


def _add_integer_attr(base_url, headers, entity_logical, schema_name, display_name, min_val=0, max_val=999999):
    """Add an integer attribute to an existing entity."""
    url = f"{base_url}/api/data/v9.2/EntityDefinitions(LogicalName='{entity_logical}')/Attributes"
    payload = {
        "@odata.type": "Microsoft.Dynamics.CRM.IntegerAttributeMetadata",
        "SchemaName": schema_name,
        "DisplayName": {"@odata.type": "Microsoft.Dynamics.CRM.Label", "LocalizedLabels": [{"@odata.type": "Microsoft.Dynamics.CRM.LocalizedLabel", "Label": display_name, "LanguageCode": 1031}]},
        "RequiredLevel": {"Value": "None"},
        "AttributeType": "Integer",
        "AttributeTypeName": {"Value": "IntegerType"},
        "MinValue": min_val,
        "MaxValue": max_val
    }
    r = requests.post(url, headers=headers, json=payload, timeout=30)
    return r.status_code in (200, 201, 204)


def _add_datetime_attr(base_url, headers, entity_logical, schema_name, display_name, date_only=True):
    """Add a datetime attribute to an existing entity."""
    url = f"{base_url}/api/data/v9.2/EntityDefinitions(LogicalName='{entity_logical}')/Attributes"
    payload = {
        "@odata.type": "Microsoft.Dynamics.CRM.DateTimeAttributeMetadata",
        "SchemaName": schema_name,
        "DisplayName": {"@odata.type": "Microsoft.Dynamics.CRM.Label", "LocalizedLabels": [{"@odata.type": "Microsoft.Dynamics.CRM.LocalizedLabel", "Label": display_name, "LanguageCode": 1031}]},
        "RequiredLevel": {"Value": "None"},
        "AttributeType": "DateTime",
        "AttributeTypeName": {"Value": "DateTimeType"},
        "Format": "DateOnly" if date_only else "DateAndTime",
        "DateTimeBehavior": {"Value": "DateOnly" if date_only else "UserLocal"}
    }
    r = requests.post(url, headers=headers, json=payload, timeout=30)
    return r.status_code in (200, 201, 204)


def _add_memo_attr(base_url, headers, entity_logical, schema_name, display_name, max_length=10000):
    """Add a memo (multiline text) attribute."""
    url = f"{base_url}/api/data/v9.2/EntityDefinitions(LogicalName='{entity_logical}')/Attributes"
    payload = {
        "@odata.type": "Microsoft.Dynamics.CRM.MemoAttributeMetadata",
        "SchemaName": schema_name,
        "DisplayName": {"@odata.type": "Microsoft.Dynamics.CRM.Label", "LocalizedLabels": [{"@odata.type": "Microsoft.Dynamics.CRM.LocalizedLabel", "Label": display_name, "LanguageCode": 1031}]},
        "RequiredLevel": {"Value": "None"},
        "AttributeType": "Memo",
        "AttributeTypeName": {"Value": "MemoType"},
        "MaxLength": max_length
    }
    r = requests.post(url, headers=headers, json=payload, timeout=30)
    return r.status_code in (200, 201, 204)


def main(req: func.HttpRequest) -> func.HttpResponse:
    if req.method == "OPTIONS":
        return func.HttpResponse(status_code=200, headers=get_cors_headers())

    token = get_token()
    if not token:
        return func.HttpResponse(
            json.dumps({"success": False, "error": "Auth failed"}),
            status_code=500, headers=get_cors_headers()
        )

    base_url = _base_url()
    headers = _headers(token)
    results = []

    # ── 1. dl_shopkunde ──
    r1 = _create_entity(base_url, headers,
        "dl_shopkunde", "Shop-Kunde", "Shop-Kunden",
        "Registrierte Kunden des Dorfladen-Bestellshops",
        "dl_email", "E-Mail")
    results.append(r1)

    # Always add attributes (idempotent – Dataverse returns 409 if already exists)
    if r1["status"] in ("created", "already_exists"):
        e = "dl_shopkunde"
        _add_string_attr(base_url, headers, e, "dl_vorname", "Vorname", 100, True)
        _add_string_attr(base_url, headers, e, "dl_nachname", "Nachname", 100, True)
        _add_string_attr(base_url, headers, e, "dl_passwort_hash", "Passwort-Hash", 500)
        _add_string_attr(base_url, headers, e, "dl_telefon", "Telefon", 50)
        _add_string_attr(base_url, headers, e, "dl_strasse", "Straße", 200)
        _add_string_attr(base_url, headers, e, "dl_plz", "PLZ", 10)
        _add_string_attr(base_url, headers, e, "dl_ort", "Ort", 100)
        _add_string_attr(base_url, headers, e, "dl_iban_encrypted", "IBAN (verschlüsselt)", 500)
        _add_string_attr(base_url, headers, e, "dl_kontoinhaber", "Kontoinhaber", 200)
        _add_string_attr(base_url, headers, e, "dl_mandatsreferenz", "Mandatsreferenz", 50)
        _add_string_attr(base_url, headers, e, "dl_mandatsdatum", "Mandatsdatum", 25)
        _add_string_attr(base_url, headers, e, "dl_mandatstyp", "Mandatstyp (RCUR/OOFF)", 10)
        _add_string_attr(base_url, headers, e, "dl_mandatsstatus", "Mandatsstatus", 25)
        _add_memo_attr(base_url, headers, e, "dl_sepa_mandat_json", "SEPA-Mandat komplett (JSON)")
        _add_boolean_attr(base_url, headers, e, "dl_email_verifiziert", "E-Mail verifiziert")
        _add_boolean_attr(base_url, headers, e, "dl_aktiv", "Aktiv", True)
        _add_string_attr(base_url, headers, e, "dl_verify_token", "Verifizierungs-Token", 200)
        _add_string_attr(base_url, headers, e, "dl_reset_token", "Reset-Token", 200)
        _add_string_attr(base_url, headers, e, "dl_sepa_pdf_url", "SEPA-Mandat PDF URL", 500)

    # ── 2. dl_shopbestellung ──
    r2 = _create_entity(base_url, headers,
        "dl_shopbestellung", "Shop-Bestellung", "Shop-Bestellungen",
        "Bestellungen aus dem Online-Shop",
        "dl_bestellnummer", "Bestellnummer")
    results.append(r2)

    if r2["status"] in ("created", "already_exists"):
        e = "dl_shopbestellung"
        _add_string_attr(base_url, headers, e, "dl_kunde_email", "Kunde E-Mail", 200)
        _add_string_attr(base_url, headers, e, "dl_kunde_name", "Kundenname", 200)
        _add_string_attr(base_url, headers, e, "dl_abholdatum", "Abholdatum", 25)
        _add_string_attr(base_url, headers, e, "dl_bestelldatum", "Bestelldatum", 25)
        _add_integer_attr(base_url, headers, e, "dl_status", "Status", 0, 10)
        # Status: 0=Neu, 1=In Bearbeitung, 2=Abholbereit, 3=Abgeholt, 4=Storniert
        _add_decimal_attr(base_url, headers, e, "dl_gesamtsumme", "Gesamtsumme (ca.)")
        _add_memo_attr(base_url, headers, e, "dl_anmerkungen", "Anmerkungen")
        _add_memo_attr(base_url, headers, e, "dl_positionen_json", "Positionen (JSON)")
        # JSON array: [{artikelnummer, bezeichnung, menge, einheit, einzelpreis, positionspreis}]
        _add_string_attr(base_url, headers, e, "dl_kunde_id", "Kunde ID", 50)
        _add_memo_attr(base_url, headers, e, "dl_pack_json", "Pack-Daten (JSON)")
        # JSON: {gepackt_von, gepackt_um, items: [{artikelnummer, gepackt, gepackt_menge, scan_zeit}]}

    # ── 3. Artikelstamm: bestellbar-Flag auf cr5d4_tables ──
    # We add cr5d4_bestellbar (Boolean) + cr5d4_bestelleinheit (String) to existing article entity
    r3_ok = _add_boolean_attr(base_url, headers, "cr5d4_table", "cr5d4_bestellbar", "Online bestellbar")
    r3b_ok = _add_string_attr(base_url, headers, "cr5d4_table", "cr5d4_bestelleinheit", "Bestelleinheit", 20)
    results.append({"entity": "cr5d4_table (Artikelstamm)", "bestellbar": "added" if r3_ok else "exists/error", "bestelleinheit": "added" if r3b_ok else "exists/error"})

    # ── 4. dl_shopfreigabe – Separate Tabelle für Shop-Artikelfreigaben ──
    # Strichcode ist der Key. Separate Tabelle, weil cr5d4_tables extern überschrieben wird.
    r4 = _create_entity(base_url, headers,
        "dl_shopfreigabe", "Shop-Freigabe", "Shop-Freigaben",
        "Kennzeichnung welche Artikel im Bestellshop angezeigt werden",
        "dl_strichcode", "Strichcode")
    results.append(r4)

    if r4["status"] in ("created", "already_exists"):
        e = "dl_shopfreigabe"
        _add_boolean_attr(base_url, headers, e, "dl_aktiv", "Aktiv", True)
        _add_datetime_attr(base_url, headers, e, "dl_gueltig_bis", "Gültig bis", date_only=True)
        _add_string_attr(base_url, headers, e, "dl_warengruppe", "Warengruppe", 200)
        _add_string_attr(base_url, headers, e, "dl_bezeichnung", "Bezeichnung", 200)
        _add_string_attr(base_url, headers, e, "dl_edeka_nr", "EDEKA-Nr.", 50)
        _add_string_attr(base_url, headers, e, "dl_freigegeben_von", "Freigegeben von", 100)

    return func.HttpResponse(
        json.dumps({"success": True, "results": results}, ensure_ascii=False, indent=2),
        status_code=200, headers=get_cors_headers()
    )
