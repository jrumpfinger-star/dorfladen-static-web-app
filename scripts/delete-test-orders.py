"""Delete test orders from Dataverse."""
import os, sys, msal, requests

TENANT = 'acfaedd4-c403-43b7-9544-fdb2b150124e'
CLIENT = '137b2df6-be83-459a-ac89-9efd0bdf51c4'
SECRET = os.environ.get('DV_CLIENT_SECRET', '')
BASE = 'https://orgab4e2f00.crm16.dynamics.com'

if not SECRET:
    print("ERROR: DV_CLIENT_SECRET not set"); sys.exit(1)

app = msal.ConfidentialClientApplication(CLIENT, authority=f'https://login.microsoftonline.com/{TENANT}', client_credential=SECRET)
token = app.acquire_token_for_client(scopes=[f'{BASE}/.default'])['access_token']
h = {'Authorization': f'Bearer {token}', 'OData-MaxVersion': '4.0', 'OData-Version': '4.0', 'Accept': 'application/json'}

IDS = [
    '764726cb-ad6d-f111-ab0e-7ced8d245c6c',
]

for i in IDS:
    r = requests.delete(f'{BASE}/api/data/v9.2/dl_mittagsbestellungs({i})', headers=h, timeout=15)
    print(f'  {i}: {"OK" if r.status_code == 204 else f"ERROR {r.status_code}"}')

print("Done!")
