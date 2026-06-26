import requests, json
BASE = "https://witty-island-064f9d903.7.azurestaticapps.net"
r = requests.get(f"{BASE}/api/preisliste", timeout=30)
data = r.json()
print("Top-level keys:", list(data.keys()))
print("success:", data.get("success"))
for k in data:
    v = data[k]
    if isinstance(v, dict):
        print(f"  {k}: dict with {len(v)} keys: {list(v.keys())[:5]}...")
    elif isinstance(v, list):
        print(f"  {k}: list with {len(v)} items")
        if v:
            print(f"    first item keys: {list(v[0].keys()) if isinstance(v[0], dict) else type(v[0])}")
    else:
        print(f"  {k}: {type(v).__name__} = {str(v)[:100]}")
