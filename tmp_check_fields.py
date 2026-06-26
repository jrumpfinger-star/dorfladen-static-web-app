import requests, json, os

# Read from local.settings.json
with open("api/local.settings.json", "r") as f:
    settings = json.load(f)
    vals = settings.get("Values", {})
    client_id = vals.get("DV_CLIENT_ID", "")
    client_secret = vals.get("DV_CLIENT_SECRET", "")
    tenant_id = vals.get("DV_TENANT_ID", "")
    org_url = vals.get("DV_DEFAULT_URL", "")

print(f"Org URL: {org_url}")
# Get OAuth token
token_url = f"https://login.microsoftonline.com/{tenant_id}/oauth2/v2.0/token"
token_data = {
    "client_id": client_id,
    "client_secret": client_secret,
    "scope": f"{org_url}/.default",
    "grant_type": "client_credentials"
}
tr = requests.post(token_url, data=token_data, timeout=30)
token = tr.json().get("access_token")
if not token:
    print("Auth failed:", tr.json())
    exit(1)

hdrs = {"Authorization": f"Bearer {token}", "Accept": "application/json"}

# Get entity metadata to see ALL fields
meta_url = f"{org_url}/api/data/v9.2/EntityDefinitions(LogicalName='cr5d4_table')/Attributes?$select=LogicalName,DisplayName,AttributeType"
mr = requests.get(meta_url, headers=hdrs, timeout=30)
if mr.status_code == 200:
    attrs = mr.json().get("value", [])
    print(f"\nAll fields on cr5d4_table ({len(attrs)}):")
    for a in sorted(attrs, key=lambda x: x.get("LogicalName","")):
        ln = a.get("LogicalName", "")
        # Only show custom fields
        if ln.startswith("cr5d4_"):
            dn = ""
            try:
                dn = a["DisplayName"]["UserLocalizedLabel"]["Label"]
            except:
                pass
            at = a.get("AttributeType", "")
            print(f"  {ln:<50} | {dn:<30} | {at}")
else:
    print(f"Metadata request failed: {mr.status_code}")
    print(mr.text[:500])
