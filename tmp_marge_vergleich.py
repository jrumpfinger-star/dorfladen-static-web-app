import requests, json
from difflib import SequenceMatcher

# --- 1) Load PDF prices ---
with open('tmp_preisliste_parsed.json', 'r', encoding='utf-8') as f:
    pdf_articles = json.load(f)

# --- 2) Get Dataverse token ---
with open("api/local.settings.json", "r") as f:
    vals = json.load(f).get("Values", {})
    client_id = vals["DV_CLIENT_ID"]
    client_secret = vals["DV_CLIENT_SECRET"]
    tenant_id = vals["DV_TENANT_ID"]
    org_url = vals["DV_DEFAULT_URL"]

token_url = f"https://login.microsoftonline.com/{tenant_id}/oauth2/v2.0/token"
tr = requests.post(token_url, data={
    "client_id": client_id, "client_secret": client_secret,
    "scope": f"{org_url}/.default", "grant_type": "client_credentials"
}, timeout=30)
token = tr.json()["access_token"]
hdrs = {"Authorization": f"Bearer {token}", "Accept": "application/json"}

# --- 3) Fetch Fleisch&Wurst articles with EK and VK ---
select = "cr5d4_artikelbezeichnung,cr5d4_vk_dorf,cr5d4_letzterek,cr5d4_marge___vk_dorf_to_ek_brutto,cr5d4_strichcode,cr5d4_mengentyp,cr5d4_mengeneinheit,cr5d4_gpfaktor,cr5d4_warengruppebez"
# Fleisch und Wurstwaren = Warengruppe filter
url = f"{org_url}/api/data/v9.2/cr5d4_tables?$select={select}&$filter=cr5d4_warengruppebez eq 'Fleisch und Wurstwaren'&$orderby=cr5d4_artikelbezeichnung asc&$top=500"
r = requests.get(url, headers=hdrs, timeout=30)
dv_articles = r.json().get("value", [])
print(f"Dataverse Fleisch-Artikel: {len(dv_articles)}")
print(f"PDF Artikel: {len(pdf_articles)}")

# Show first 3 to verify
for a in dv_articles[:3]:
    print(f"  {a.get('cr5d4_artikelbezeichnung','')}: VK={a.get('cr5d4_vk_dorf')}, EK={a.get('cr5d4_letzterek')}, Marge={a.get('cr5d4_marge___vk_dorf_to_ek_brutto')}")

# --- 4) Match & compute margins ---
def norm(s):
    s = s.lower().strip()
    s = s.replace('\u00f6', 'oe').replace('\u00fc', 'ue').replace('\u00e4', 'ae').replace('\u00df', 'ss')
    s = s.replace('\ufffd', '').replace('  ', ' ')
    return s

def similarity(a, b):
    return SequenceMatcher(None, norm(a), norm(b)).ratio()

results = []
not_found = []

for pdf_a in pdf_articles:
    pdf_name = pdf_a["name"]
    try:
        pdf_ek = round(float(pdf_a["ek_dorfladen"]), 2)  # EK-Preis fuer Dorfladen
    except:
        continue

    best_match = None
    best_score = 0
    for dv_a in dv_articles:
        bez = dv_a.get("cr5d4_artikelbezeichnung", "")
        score = similarity(pdf_name, bez)
        if score > best_score:
            best_score = score
            best_match = dv_a

    if best_score < 0.70 or not best_match:
        not_found.append(pdf_a)
        continue

    dv_vk = best_match.get("cr5d4_vk_dorf") or 0
    dv_ek_alt = best_match.get("cr5d4_letzterek") or 0
    dv_marge_alt = best_match.get("cr5d4_marge___vk_dorf_to_ek_brutto")

    # New margin: (VK - new EK) / VK * 100
    if dv_vk > 0:
        marge_neu = round((dv_vk - pdf_ek) / dv_vk * 100, 1)
    else:
        marge_neu = 0

    # Old margin from Dataverse or compute
    if dv_marge_alt is not None:
        marge_alt = round(dv_marge_alt, 1)
    elif dv_ek_alt and dv_vk > 0:
        marge_alt = round((dv_vk - dv_ek_alt) / dv_vk * 100, 1)
    else:
        marge_alt = None

    ek_diff = round(pdf_ek - dv_ek_alt, 2) if dv_ek_alt else None

    results.append({
        "name_pdf": pdf_a["name"],
        "name_stamm": best_match.get("cr5d4_artikelbezeichnung", ""),
        "score": round(best_score, 2),
        "vk_dorf": round(dv_vk, 2),
        "ek_alt": round(dv_ek_alt, 2) if dv_ek_alt else None,
        "ek_neu": pdf_ek,
        "ek_diff": ek_diff,
        "marge_alt": marge_alt,
        "marge_neu": marge_neu,
    })

# --- 5) Output ---
print(f"\nMatched: {len(results)}")
print(f"Nicht gefunden: {len(not_found)}")

# Sort by margin change (biggest margin reduction first)
results_with_change = [r for r in results if r["marge_alt"] is not None]
results_with_change.sort(key=lambda x: (x["marge_neu"] - x["marge_alt"]))

delta = "Diff"
print(f"\n{'Bezeichnung (PDF)':<40} | {'VK Dorf':>8} | {'EK alt':>8} | {'EK neu':>8} | {'EK Diff':>8} | {'Marge alt':>9} | {'Marge neu':>9} | {'M.Diff':>8}")
print("-" * 145)
for r in results_with_change:
    ek_alt_s = f"{r['ek_alt']:>7.2f}\u20ac" if r['ek_alt'] else "     n/a"
    ek_diff_s = f"{r['ek_diff']:>+7.2f}\u20ac" if r['ek_diff'] is not None else "     n/a"
    marge_alt_s = f"{r['marge_alt']:>7.1f}%" if r['marge_alt'] is not None else "     n/a"
    marge_diff = r['marge_neu'] - r['marge_alt'] if r['marge_alt'] is not None else 0
    md = f"{marge_diff:>+6.1f}%"
    print(f"{r['name_pdf'][:40]:<40} | {r['vk_dorf']:>7.2f}\u20ac | {ek_alt_s} | {r['ek_neu']:>7.2f}\u20ac | {ek_diff_s} | {marge_alt_s} | {r['marge_neu']:>7.1f}% | {md}")

# Summary
if results_with_change:
    avg_marge_alt = sum(r["marge_alt"] for r in results_with_change) / len(results_with_change)
    avg_marge_neu = sum(r["marge_neu"] for r in results_with_change) / len(results_with_change)
    ek_increases = [r for r in results_with_change if r["ek_diff"] and r["ek_diff"] > 0]
    ek_decreases = [r for r in results_with_change if r["ek_diff"] and r["ek_diff"] < 0]
    print(f"\n{'='*60}")
    print(f"ZUSAMMENFASSUNG")
    print(f"{'='*60}")
    print(f"Artikel verglichen:      {len(results_with_change)}")
    print(f"Durchschn. Marge ALT:    {avg_marge_alt:.1f}%")
    print(f"Durchschn. Marge NEU:    {avg_marge_neu:.1f}%")
    print(f"Marge-Veraenderung:      {avg_marge_neu - avg_marge_alt:+.1f} Prozentpunkte")
    print(f"EK-Erhoehungen:          {len(ek_increases)} Artikel")
    print(f"EK-Senkungen:            {len(ek_decreases)} Artikel")

# Save
with open('tmp_marge_vergleich.json', 'w', encoding='utf-8') as f:
    json.dump({"results": results, "not_found_count": len(not_found)}, f, ensure_ascii=False, indent=2)
