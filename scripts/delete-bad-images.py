import msal, requests, json
with open("api/local.settings.json") as f:
    s = json.load(f).get("Values", {})
tid = s["DV_TENANT_ID"]
app = msal.ConfidentialClientApplication(s["DV_CLIENT_ID"], authority="https://login.microsoftonline.com/" + tid, client_credential=s["DV_CLIENT_SECRET"])
t = app.acquire_token_for_client(scopes=["https://graph.microsoft.com/.default"])["access_token"]
h = {"Authorization": "Bearer " + t}
SP_DRIVE = "b!bwUha0ab4EeiA3xXHK-Oobhv5tJbeYJDiF9pTB-f1kC-Mp-AY0brRrr2WigdYK4A"
SP_BARCODE = "01USAQ6ESD7NCQ4ZM6GRHK5IRCMJMSRSVH"
for name in ["9.png", "14.png", "301.png", "302.png"]:
    url = "https://graph.microsoft.com/v1.0/drives/" + SP_DRIVE + "/items/" + SP_BARCODE + ":/" + name
    r = requests.get(url, headers=h, timeout=15)
    if r.status_code == 200:
        item_id = r.json()["id"]
        d = requests.delete("https://graph.microsoft.com/v1.0/drives/" + SP_DRIVE + "/items/" + item_id, headers=h, timeout=15)
        print(name + ": geloescht (" + str(d.status_code) + ")")
    else:
        print(name + ": nicht vorhanden")
