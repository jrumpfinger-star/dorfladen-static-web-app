import json

with open('tmp_marge_vergleich.json', 'r', encoding='utf-8') as f:
    data = json.load(f)

results = data["results"]
changed = [r for r in results if r.get("ek_diff") and abs(r["ek_diff"]) >= 0.01]
unchanged = [r for r in results if not r.get("ek_diff") or abs(r["ek_diff"]) < 0.01]

print(f"Gesamt verglichen: {len(results)}")
print(f"EK unveraendert:   {len(unchanged)}")
print(f"EK geaendert:      {len(changed)}")

if changed:
    ek_up = [c for c in changed if c["ek_diff"] > 0]
    ek_down = [c for c in changed if c["ek_diff"] < 0]
    print(f"  EK gestiegen:  {len(ek_up)}")
    print(f"  EK gesunken:   {len(ek_down)}")

    changed.sort(key=lambda x: x["ek_diff"], reverse=True)
    
    euro = "\u20ac"
    
    print(f"\n=== EK-ERHOEHUNGEN (neue Preisliste teurer) ===")
    print(f"{'Bezeichnung':<40} | {'VK':>7} | {'EK alt':>7} | {'EK neu':>7} | {'EK Diff':>8} | {'Marge alt':>9} | {'Marge neu':>9}")
    print("-" * 130)
    for r in ek_up:
        print(f"{r['name_pdf'][:40]:<40} | {r['vk_dorf']:>6.2f}{euro} | {r['ek_alt']:>6.2f}{euro} | {r['ek_neu']:>6.2f}{euro} | {r['ek_diff']:>+7.2f}{euro} | {r['marge_alt']:>7.1f}% | {r['marge_neu']:>7.1f}%")
    
    if ek_down:
        print(f"\n=== EK-SENKUNGEN (neue Preisliste guenstiger) ===")
        print(f"{'Bezeichnung':<40} | {'VK':>7} | {'EK alt':>7} | {'EK neu':>7} | {'EK Diff':>8} | {'Marge alt':>9} | {'Marge neu':>9}")
        print("-" * 130)
        for r in ek_down:
            print(f"{r['name_pdf'][:40]:<40} | {r['vk_dorf']:>6.2f}{euro} | {r['ek_alt']:>6.2f}{euro} | {r['ek_neu']:>6.2f}{euro} | {r['ek_diff']:>+7.2f}{euro} | {r['marge_alt']:>7.1f}% | {r['marge_neu']:>7.1f}%")
    
    # Marge summary for changed items
    avg_marge_alt = sum(r["marge_alt"] for r in changed if r["marge_alt"] is not None) / len(changed)
    avg_marge_neu = sum(r["marge_neu"] for r in changed) / len(changed)
    total_ek_diff = sum(r["ek_diff"] for r in changed)
    
    print(f"\n{'='*60}")
    print(f"ZUSAMMENFASSUNG (nur geaenderte Artikel)")
    print(f"{'='*60}")
    print(f"Artikel mit EK-Aenderung:  {len(changed)}")
    print(f"Durchschn. Marge vorher:   {avg_marge_alt:.1f}%")
    print(f"Durchschn. Marge nachher:  {avg_marge_neu:.1f}%")
    print(f"Summe EK-Aenderungen:      {total_ek_diff:+.2f}{euro}/kg")
