"""Löscht alle Bilder aus SharePoint StrichcodeBilder die vom fehlgeschlagenen fetch-Lauf stammen."""
import json, msal, requests

with open("api/local.settings.json") as f:
    s = json.load(f).get("Values", {})

tid = s["DV_TENANT_ID"]
app = msal.ConfidentialClientApplication(s["DV_CLIENT_ID"],
    authority="https://login.microsoftonline.com/" + tid,
    client_credential=s["DV_CLIENT_SECRET"])
t = app.acquire_token_for_client(scopes=["https://graph.microsoft.com/.default"])["access_token"]
h = {"Authorization": "Bearer " + t}

SP_DRIVE = "b!bwUha0ab4EeiA3xXHK-Oobhv5tJbeYJDiF9pTB-f1kC-Mp-AY0brRrr2WigdYK4A"
SP_BARCODE = "01USAQ6ESD7NCQ4ZM6GRHK5IRCMJMSRSVH"

# Alle Strichcodes die in den beiden Läufen hochgeladen wurden
bad = [
    # Erster Testlauf (5er)
    "9", "14", "301", "302", "9005511060476",
    # Zweiter Lauf – aus dem Log extrahiert
    "13", "131", "4013044100342", "4012852207335", "925",
    "4019555705342", "4012346168906", "4012346169200", "4002971430308",
    "4015400548508", "4015400548706", "4015400548201", "4015400548409",
    "4000739480661", "4000739480609", "4015400300502", "2000131004497",
    "4305615155470", "4009233003471", "4009233003181", "4305399281624",
    "4305399281006", "4002971021301", "4002971021400", "4002971262103",
    "4002971440208", "4002971015607", "4002971015706", "4002971019803",
    "4002971033809", "4002971033700", "4002971043105", "4002971043006",
    "4002971842708", "4002971014006", "4002971010107", "4002971840100",
    "4002971840407", "4002971010206", "4002971843101", "4002971842203",
    "2012", "4016249039110",
]

deleted = 0
not_found = 0
for sc in bad:
    fname = sc + ".png"
    url = "https://graph.microsoft.com/v1.0/drives/" + SP_DRIVE + "/items/" + SP_BARCODE + ":/" + fname
    r = requests.get(url, headers=h, timeout=15)
    if r.status_code == 200:
        item_id = r.json()["id"]
        d = requests.delete("https://graph.microsoft.com/v1.0/drives/" + SP_DRIVE + "/items/" + item_id, headers=h, timeout=15)
        print("GELOESCHT: " + fname + " (" + str(d.status_code) + ")")
        deleted += 1
    else:
        not_found += 1

print("\n" + str(deleted) + " geloescht, " + str(not_found) + " nicht gefunden")
