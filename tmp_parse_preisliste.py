import fitz, json, re

doc = fitz.open(r'g:\OneDrive - CGM\Dorfladen Test\Preisliste_Dorfladen_Juni_26.pdf')
text = ''
for p in doc:
    text += p.get_text()

lines = text.split('\n')
articles = []
i = 0
while i < len(lines):
    line = lines[i].strip()
    # Match article: 1-3 digit number followed by article name
    m = re.match(r'^(\d{1,3})\s+(.+)', line)
    if m and not line.startswith('Artikelnummer') and not line.startswith('Bereichswahl'):
        art_nr = m.group(1)
        name_parts = [m.group(2).strip()]
        j = i + 1
        # Collect continuation lines of the name
        while j < len(lines):
            val = lines[j].strip()
            if not val or re.match(r'^\d+[.,]\d+\s', val) or val.startswith('1041 ') or val.startswith('1002 ') or val == 'abgepasst':
                break
            if re.match(r'^Artikelnummer|^Bereichswahl|^Metzgerei|^CWS|^Benutzer|^STAMMKUNDEN|^Alle Preise', val):
                break
            name_parts.append(val)
            j += 1
        name = ' '.join(name_parts)
        
        if j < len(lines) and lines[j].strip() == 'abgepasst':
            j += 1
        
        # Now find the brutto/netto prices of the article, and the Dorfladen EK price
        brutto = ''
        netto = ''
        dl_ek_preis = ''
        search_end = min(j + 20, len(lines))
        while j < search_end:
            val = lines[j].strip()
            
            # Skip 1002 Wirte lines entirely (and their following price line)
            if val.startswith('1002 '):
                j += 1
                # Skip the Wirte price line too
                if j < len(lines) and re.match(r'^\d+[.,]\d+', lines[j].strip()):
                    j += 1
                continue
            
            # Price lines (brutto/netto from article header)
            pm = re.match(r'^(\d+[.,]\d+)\s', val)
            if pm and not brutto:
                brutto = pm.group(1).replace(',','.')
            elif pm and brutto and not netto:
                netto = pm.group(1).replace(',','.')
            
            # 1041 Dorfladen line -> the NEXT line has the EK price
            if val.startswith('1041 Dorfladen'):
                j += 1
                if j < len(lines):
                    price_line = lines[j].strip()
                    pm2 = re.match(r'^(\d+[.,]\d+)', price_line)
                    if pm2:
                        dl_ek_preis = pm2.group(1).replace(',','.')
                break
            
            j += 1
        
        if dl_ek_preis:
            articles.append({
                'nr': art_nr,
                'name': name,
                'lieferant_brutto': brutto,
                'lieferant_netto': netto,
                'ek_dorfladen': dl_ek_preis
            })
        i = j + 1
    else:
        i += 1

with open('tmp_preisliste_parsed.json', 'w', encoding='utf-8') as f:
    json.dump(articles, f, ensure_ascii=False, indent=2)

print(f'{len(articles)} Artikel geparst')
print(f"\n{'Nr':>4} | {'Bezeichnung':<50} | {'Brutto':>8} | {'Netto':>8} | {'EK Dofl.':>8}")
print("-" * 90)
for a in articles[:15]:
    print(f"  {a['nr']:>3} | {a['name'][:50]:<50} | {a['lieferant_brutto']:>7} | {a['lieferant_netto']:>7} | {a['ek_dorfladen']:>7}")
print('...')
for a in articles[-5:]:
    print(f"  {a['nr']:>3} | {a['name'][:50]:<50} | {a['lieferant_brutto']:>7} | {a['lieferant_netto']:>7} | {a['ek_dorfladen']:>7}")
