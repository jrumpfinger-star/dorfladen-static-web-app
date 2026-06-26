import requests, json
r = requests.get('https://witty-island-064f9d903.7.azurestaticapps.net/api/preisliste', timeout=30)
d = r.json()
fleisch = d['groups']['Fleisch und Wurstwaren']
print(f"Fleisch-Artikel: {len(fleisch)}")
print("\nBeispiele (alle Felder):")
for a in fleisch[:5]:
    print(json.dumps({k: a[k] for k in ['bezeichnung','vk','vk_base','menge','strichcode']}, ensure_ascii=False))
print("\n--- Suche Gelbwurst ---")
for a in fleisch:
    if 'gelbwurst' in a['bezeichnung'].lower():
        print(json.dumps({k: a[k] for k in ['bezeichnung','vk','vk_base','menge','strichcode']}, ensure_ascii=False))
