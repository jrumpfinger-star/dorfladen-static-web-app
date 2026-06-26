"""
Move 'Roter Punkt' from top-level nav into 'Dorfladen' dropdown (after Impressionen).
"""
import re
import glob
import os

# 1) Remove top-level Roter Punkt: <li><a href="/roter-punkt" ...>... Roter Punkt</a></li>
remove_pat = re.compile(
    r'\s*<li[^>]*>\s*<a\s+href="/roter-punkt"[^>]*>[^<]*Roter Punkt</a>\s*</li>\s*\n?'
)

# 2) Insert into Dorfladen dropdown: before </ul> that closes it
# Find the closing </ul> of the Dorfladen dropdown (after Impressionen)
insert_pat = re.compile(
    r'(<li><a href="/bilder">Impressionen</a></li>\s*\n)(\s*</ul>)'
)

rp_line = '          <li><a href="/roter-punkt" style="color:#b91c1c;font-weight:700"><svg width="12" height="12" viewBox="0 0 24 24" fill="#b91c1c" stroke="#b91c1c" stroke-width="2" style="vertical-align:middle;margin-right:4px"><circle cx="12" cy="12" r="10"/></svg> Roter Punkt</a></li>\n'

for f in glob.glob('static-site/*.html'):
    if 'index.html' in f or 'flyer' in f:
        continue
    with open(f, 'r', encoding='utf-8') as fh:
        content = fh.read()

    new_content = remove_pat.sub('\n', content)

    # Insert if not already in the Dorfladen dropdown
    if insert_pat.search(new_content) and 'roter-punkt" style="color:#b91c1c' not in new_content.split('Dorfladen')[0] if 'Dorfladen' in new_content else True:
        new_content = insert_pat.sub(r'\g<1>' + rp_line + r'\2', new_content, count=1)

    if new_content != content:
        with open(f, 'w', encoding='utf-8') as fh:
            fh.write(new_content)
        print(f'Updated: {os.path.basename(f)}')

print('Done.')
