import json, requests
from difflib import SequenceMatcher

# Load parsed PDF prices
with open('tmp_preisliste_parsed.json', 'r', encoding='utf-8') as f:
    pdf_articles = json.load(f)

# Load current prices from Artikelstamm via API
BASE = "https://witty-island-064f9d903.7.azurestaticapps.net"
r = requests.get(f"{BASE}/api/preisliste", timeout=30)
data = r.json()

# API returns groups -> flatten all articles, focus on Fleisch & Wurst
FLEISCH_CATS = ["Fleisch und Wurstwaren"]
categories = data.get("groups", {})
api_articles = []
for cat_name, items in categories.items():
    for item in items:
        item["_kategorie"] = cat_name
        api_articles.append(item)

# Filter API articles to Fleisch & Wurst category
fleisch_api = [a for a in api_articles if a["_kategorie"] in FLEISCH_CATS]
print(f"API gesamt: {len(api_articles)} Artikel")
print(f"API Fleisch&Wurst: {len(fleisch_api)} Artikel")
print(f"PDF: {len(pdf_articles)} Artikel in Preisliste")

# Normalize name for matching
def norm(s):
    s = s.lower().strip()
    for ch in ['ä','ae']: pass  # keep as-is
    # Remove common suffixes/prefixes
    s = s.replace('ö', 'oe').replace('ü', 'ue').replace('ä', 'ae').replace('ß', 'ss')
    s = s.replace('�', '').replace('  ', ' ')
    return s

def similarity(a, b):
    return SequenceMatcher(None, norm(a), norm(b)).ratio()

# Build name lookup from API Fleisch articles
api_by_norm = {}
for a in fleisch_api:
    bez = a.get("bezeichnung", "")
    api_by_norm[norm(bez)] = a

# Match PDF articles to API by name similarity
changes = []
not_found = []
matched = 0
unchanged = 0

for pdf_a in pdf_articles:
    pdf_name = pdf_a["name"]
    pdf_norm = norm(pdf_name)
    
    # Try exact match first
    best_match = api_by_norm.get(pdf_norm)
    best_score = 1.0 if best_match else 0
    
    # Fuzzy match if no exact
    if not best_match:
        best_score = 0
        for api_a in fleisch_api:
            api_bez = api_a.get("bezeichnung", "")
            score = similarity(pdf_name, api_bez)
            if score > best_score:
                best_score = score
                best_match = api_a
    
    if best_score < 0.70:
        not_found.append(pdf_a)
        continue
    
    matched += 1
    api_a = best_match
    
    try:
        pdf_vk = round(float(pdf_a["vk_preis_kg"]), 2)
    except:
        continue
    
    api_vk = None
    # PDF prices are per kg, API vk_base is per kg
    for field in ["vk_base", "vk"]:
        v = api_a.get(field)
        if v is not None:
            try:
                api_vk = round(float(v), 2)
                break
            except:
                pass
    
    if api_vk is None:
        continue
    
    if pdf_vk != api_vk:
        diff = pdf_vk - api_vk
        pct = (diff / api_vk * 100) if api_vk else 0
        changes.append({
            "metzgerei_nr": pdf_a["strichcode"],
            "name_pdf": pdf_a["name"],
            "name_stamm": api_a.get("bezeichnung", ""),
            "match_score": round(best_score, 2),
            "alt_preis": api_vk,
            "neu_preis": pdf_vk,
            "differenz": round(diff, 2),
            "prozent": round(pct, 1)
        })
    else:
        unchanged += 1

print(f"\nMatched: {matched}")
print(f"Unveraendert: {unchanged}")
print(f"Nicht gefunden: {len(not_found)}")
print(f"PREISAENDERUNGEN: {len(changes)}")

if changes:
    increases = [c for c in changes if c["differenz"] > 0]
    decreases = [c for c in changes if c["differenz"] < 0]
    print(f"  davon Erhoehungen: {len(increases)}")
    print(f"  davon Senkungen:   {len(decreases)}")
    
    changes.sort(key=lambda x: abs(x["differenz"]), reverse=True)
    print(f"\n{'Nr':>4} | {'Bezeichnung (PDF)':<40} | {'Stamm-Bezeichnung':<35} | {'Score':>5} | {'Alt':>7} | {'Neu':>7} | {'Diff':>7} | {'%':>6}")
    print("-" * 145)
    for c in changes:
        arrow = "+" if c["differenz"] > 0 else ""
        print(f"{c['metzgerei_nr']:>4} | {c['name_pdf'][:40]:<40} | {c['name_stamm'][:35]:<35} | {c['match_score']:>5.2f} | {c['alt_preis']:>6.2f}e | {c['neu_preis']:>6.2f}e | {arrow}{c['differenz']:>6.2f}e | {arrow}{c['prozent']:>5.1f}%")

print(f"\n--- Unveraenderte Preise: {unchanged} Artikel ---")

# Save
with open('tmp_preisvergleich.json', 'w', encoding='utf-8') as f:
    json.dump({
        "changes": changes,
        "unchanged_count": unchanged,
        "not_found": [{"nr": n["strichcode"], "name": n["name"], "vk": n["vk_preis_kg"]} for n in not_found]
    }, f, ensure_ascii=False, indent=2)
