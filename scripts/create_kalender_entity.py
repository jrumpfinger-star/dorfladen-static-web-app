"""Idempotentes Anlegen der Kiosk-Kalender-Tabellen in Dataverse.

Erstellt (falls noch nicht vorhanden):
  - dl_kalendereintrag   (Set: dl_kalendereintrags)
  - dl_kalender_override (Set: dl_kalender_overrides)
samt aller benötigten Spalten und veröffentlicht die Anpassungen.

Nutzt die vorhandenen DV_*-App-Settings. Liest sie aus der Umgebung ODER –
falls dort nicht gesetzt – aus api/local.settings.json. Es werden **keine**
Secret-Werte ausgegeben.

Ausführen:  python scripts/create_kalender_entity.py
"""
import json
import os
import sys

import msal
import requests

LANG = 1031  # Deutsch
API = "/api/data/v9.2"


# ── Konfiguration laden (Env oder local.settings.json) ──
def load_settings():
    keys = ["DV_TENANT_ID", "DV_CLIENT_ID", "DV_CLIENT_SECRET", "DV_DEFAULT_URL"]
    cfg = {k: os.environ.get(k, "") for k in keys}
    if not all(cfg.values()):
        path = os.path.join(os.path.dirname(__file__), "..", "api", "local.settings.json")
        if os.path.exists(path):
            with open(path, "r", encoding="utf-8-sig") as f:
                values = (json.load(f) or {}).get("Values", {})
            for k in keys:
                if not cfg[k]:
                    cfg[k] = values.get(k, "")
    missing = [k for k in keys if not cfg[k]]
    if missing:
        print(f"FEHLER: Es fehlen Einstellungen: {', '.join(missing)}")
        sys.exit(1)
    return cfg


def get_token(cfg):
    app = msal.ConfidentialClientApplication(
        cfg["DV_CLIENT_ID"],
        authority=f"https://login.microsoftonline.com/{cfg['DV_TENANT_ID']}",
        client_credential=cfg["DV_CLIENT_SECRET"],
    )
    r = app.acquire_token_for_client(scopes=[f"{cfg['DV_DEFAULT_URL']}/.default"])
    tok = r.get("access_token")
    if not tok:
        print("FEHLER: Token konnte nicht geholt werden:", r.get("error_description", "")[:200])
        sys.exit(1)
    return tok


def label(text):
    return {
        "@odata.type": "Microsoft.Dynamics.CRM.Label",
        "LocalizedLabels": [{
            "@odata.type": "Microsoft.Dynamics.CRM.LocalizedLabel",
            "Label": text, "LanguageCode": LANG,
        }],
    }


# ── Attribut-Builder ──
def s_string(schema, disp, maxlen=250, primary=False, required="None", fmt="Text"):
    a = {
        "@odata.type": "Microsoft.Dynamics.CRM.StringAttributeMetadata",
        "SchemaName": schema, "MaxLength": maxlen,
        "FormatName": {"Value": fmt},
        "RequiredLevel": {"Value": required},
        "DisplayName": label(disp),
    }
    if primary:
        a["IsPrimaryName"] = True
    return a


def s_memo(schema, disp, maxlen=2000):
    return {
        "@odata.type": "Microsoft.Dynamics.CRM.MemoAttributeMetadata",
        "SchemaName": schema, "MaxLength": maxlen,
        "RequiredLevel": {"Value": "None"}, "DisplayName": label(disp),
    }


def s_bool(schema, disp, default=False):
    return {
        "@odata.type": "Microsoft.Dynamics.CRM.BooleanAttributeMetadata",
        "SchemaName": schema, "RequiredLevel": {"Value": "None"},
        "DisplayName": label(disp), "DefaultValue": default,
        "OptionSet": {
            "@odata.type": "Microsoft.Dynamics.CRM.BooleanOptionSetMetadata",
            "TrueOption": {"Value": 1, "Label": label("Ja")},
            "FalseOption": {"Value": 0, "Label": label("Nein")},
        },
    }


def s_datetime(schema, disp, date_only=True):
    return {
        "@odata.type": "Microsoft.Dynamics.CRM.DateTimeAttributeMetadata",
        "SchemaName": schema,
        "Format": "DateOnly" if date_only else "DateAndTime",
        "DateTimeBehavior": {"Value": "DateOnly" if date_only else "UserLocal"},
        "RequiredLevel": {"Value": "None"}, "DisplayName": label(disp),
    }


# ── Dataverse-Helfer ──
class DV:
    def __init__(self, base, token, solution=None):
        self.base = base.rstrip("/")
        self.h = {
            "Authorization": f"Bearer {token}",
            "OData-MaxVersion": "4.0", "OData-Version": "4.0",
            "Accept": "application/json",
            "Content-Type": "application/json; charset=utf-8",
            "Consistency": "Strong",
        }
        if solution:
            self.h["MSCRM.SolutionUniqueName"] = solution

    def entity_exists(self, logical):
        r = requests.get(
            f"{self.base}{API}/EntityDefinitions(LogicalName='{logical}')",
            headers=self.h, params={"$select": "LogicalName"}, timeout=30,
        )
        return r.status_code == 200

    def attr_exists(self, logical, attr):
        r = requests.get(
            f"{self.base}{API}/EntityDefinitions(LogicalName='{logical}')/Attributes(LogicalName='{attr}')",
            headers=self.h, params={"$select": "LogicalName"}, timeout=30,
        )
        return r.status_code == 200

    def create_entity(self, body):
        r = requests.post(f"{self.base}{API}/EntityDefinitions", headers=self.h, json=body, timeout=300)
        return r

    def add_attr(self, logical, body):
        r = requests.post(
            f"{self.base}{API}/EntityDefinitions(LogicalName='{logical}')/Attributes",
            headers=self.h, json=body, timeout=180,
        )
        return r

    def publish_all(self):
        return requests.post(f"{self.base}{API}/PublishAllXml", headers=self.h, timeout=300)


def find_solution(base, token):
    """Solution mit Publisher-Prefix 'dl' finden (für dl_-Schemanamen)."""
    h = {"Authorization": f"Bearer {token}", "Accept": "application/json"}
    p = requests.get(
        f"{base}{API}/publishers",
        headers=h, params={"$filter": "customizationprefix eq 'dl'", "$select": "publisherid,customizationprefix"},
        timeout=30,
    )
    if p.status_code != 200 or not p.json().get("value"):
        return None
    pub_id = p.json()["value"][0]["publisherid"]
    s = requests.get(
        f"{base}{API}/solutions",
        headers=h,
        params={
            "$filter": f"_publisherid_value eq {pub_id} and ismanaged eq false and isvisible eq true",
            "$select": "uniquename,friendlyname", "$orderby": "installedon desc",
        },
        timeout=30,
    )
    vals = s.json().get("value", []) if s.status_code == 200 else []
    for v in vals:
        if v.get("uniquename", "").lower() != "default":
            return v["uniquename"]
    return vals[0]["uniquename"] if vals else None


# ── Tabellen-Definitionen ──
def entity_kalendereintrag():
    return {
        "@odata.type": "Microsoft.Dynamics.CRM.EntityMetadata",
        "SchemaName": "dl_kalendereintrag",
        "DisplayName": label("Kalendereintrag"),
        "DisplayCollectionName": label("Kalendereinträge"),
        "OwnershipType": "UserOwned", "HasActivities": False, "HasNotes": False,
        "IsActivity": False,
        "Attributes": [s_string("dl_titel", "Titel", 250, primary=True, required="ApplicationRequired")],
    }


def entity_override():
    return {
        "@odata.type": "Microsoft.Dynamics.CRM.EntityMetadata",
        "SchemaName": "dl_kalender_override",
        "DisplayName": label("Kalender-Ausnahme"),
        "DisplayCollectionName": label("Kalender-Ausnahmen"),
        "OwnershipType": "UserOwned", "HasActivities": False, "HasNotes": False,
        "IsActivity": False,
        "Attributes": [s_string("dl_name", "Name", 100, primary=True, required="None")],
    }


EINTRAG_ATTRS = [
    s_datetime("dl_datum", "Datum", date_only=True),
    s_bool("dl_ganztags", "Ganztags"),
    s_string("dl_uhrzeit", "Uhrzeit", 10),
    s_string("dl_kategorie", "Kategorie", 50),
    s_string("dl_wiederholung", "Wiederholung", 20),
    s_string("dl_stammkundeid", "Stammkunde-ID", 100),
    s_string("dl_kunde_freitext", "Kunde (Freitext)", 200),
    s_string("dl_status", "Status", 20),
    s_datetime("dl_erledigt_am", "Erledigt am", date_only=False),
    s_memo("dl_notiz", "Notiz", 2000),
]

OVERRIDE_ATTRS = [
    s_string("dl_serie_id", "Serien-ID", 100),
    s_datetime("dl_datum", "Datum", date_only=True),
    s_string("dl_status", "Status", 20),
    s_datetime("dl_erledigt_am", "Erledigt am", date_only=False),
]


def ensure_table(dv, entity_body, logical, attrs):
    if dv.entity_exists(logical):
        print(f"  = Tabelle {logical} existiert bereits.")
    else:
        r = dv.create_entity(entity_body)
        if r.status_code in (200, 201, 204):
            print(f"  + Tabelle {logical} angelegt.")
        else:
            print(f"  ! Fehler beim Anlegen von {logical}: {r.status_code}")
            print("   ", r.text[:400])
            return False
    ok = True
    for a in attrs:
        name = a["SchemaName"]
        if dv.attr_exists(logical, name):
            print(f"    = Spalte {name} vorhanden.")
            continue
        r = dv.add_attr(logical, a)
        if r.status_code in (200, 201, 204):
            print(f"    + Spalte {name} angelegt.")
        else:
            print(f"    ! Fehler bei Spalte {name}: {r.status_code} {r.text[:300]}")
            ok = False
    return ok


def main():
    cfg = load_settings()
    base = cfg["DV_DEFAULT_URL"].rstrip("/")
    print(f"Ziel-Dataverse: {base}")
    token = get_token(cfg)
    solution = find_solution(base, token)
    print(f"Solution: {solution or '(Default)'}")
    dv = DV(base, token, solution)

    print("Tabelle dl_kalendereintrag:")
    ok1 = ensure_table(dv, entity_kalendereintrag(), "dl_kalendereintrag", EINTRAG_ATTRS)
    print("Tabelle dl_kalender_override:")
    ok2 = ensure_table(dv, entity_override(), "dl_kalender_override", OVERRIDE_ATTRS)

    print("Veröffentliche Anpassungen …")
    pr = dv.publish_all()
    print("  Publish:", pr.status_code if pr.status_code in (200, 204) else f"{pr.status_code} {pr.text[:200]}")

    print("\nFertig." if ok1 and ok2 else "\nMit Fehlern beendet – siehe oben.")
    sys.exit(0 if (ok1 and ok2) else 2)


if __name__ == "__main__":
    main()
