"""Baut die Symbolsammlung fuer die Online-Hilfe.

Die Hilfe trug rund 340 Emoji-Zeichen und kein einziges Symbol. Emojis
sehen je nach Geraet voellig anders aus, lassen sich nicht einfaerben und
wirken altbacken. Ersetzt werden sie durch Strichsymbole im Stil der
uebrigen Seite (Lucide), abgelegt als ein <svg>-Sprite am Anfang der
Datei; im Text steht dann nur noch <svg class="ic"><use href="#ic-..."/></svg>.

Das Skript gibt den Sprite-Block auf der Standardausgabe aus.
"""
import sys

sys.stdout.reconfigure(encoding="utf-8")

# Pfaddaten aus dem Lucide-Satz, wie ihn die uebrigen Seiten verwenden.
SYMBOLE = {
    "uhr": '<circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>',
    "essen": '<path d="M3 2v7c0 1.1.9 2 2 2h4a2 2 0 0 0 2-2V2"/><path d="M7 2v20"/>'
             '<path d="M21 15V2v0a5 5 0 0 0-5 5v6c0 1.1.9 2 2 2h3Zm0 0v7"/>',
    "schild": '<path d="M12.586 2.586A2 2 0 0 0 11.172 2H4a2 2 0 0 0-2 2v7.172a2 2 0 0 0 .586 1.414l8.704 8.704a2.426 2.426 0 0 0 3.42 0l6.58-6.58a2.426 2.426 0 0 0 0-3.42z"/>'
              '<circle cx="7.5" cy="7.5" r=".5" fill="currentColor"/>',
    "kamera": '<path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z"/>'
              '<circle cx="12" cy="13" r="3"/>',
    "liste": '<path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"/>'
             '<path d="M14 2v5h5"/><path d="M8 13h8"/><path d="M8 17h5"/>',
    "punkt": '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="3.5" fill="currentColor"/>',
    "handy": '<rect width="14" height="20" x="5" y="2" rx="2"/><path d="M12 18h.01"/>',
    "glocke": '<path d="M10.268 21a2 2 0 0 0 3.464 0"/>'
              '<path d="M3.262 15.326A1 1 0 0 0 4 17h16a1 1 0 0 0 .74-1.673C19.41 13.956 18 12.499 18 8A6 6 0 0 0 6 8c0 4.499-1.411 5.956-2.738 7.326"/>',
    "bild": '<rect width="18" height="18" x="3" y="3" rx="2"/><circle cx="9" cy="9" r="2"/>'
            '<path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/>',
    "zeitung": '<path d="M4 22h16a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2H8a2 2 0 0 0-2 2v16a2 2 0 0 1-2 2Zm0 0a2 2 0 0 1-2-2v-9c0-1.1.9-2 2-2h2"/>'
               '<path d="M18 14h-8"/><path d="M15 18h-5"/><path d="M10 6h8v4h-8V6Z"/>',
    "hand": '<path d="M18 11V6a2 2 0 0 0-2-2a2 2 0 0 0-2 2"/><path d="M14 10V4a2 2 0 0 0-2-2a2 2 0 0 0-2 2v2"/>'
            '<path d="M10 10.5V6a2 2 0 0 0-2-2a2 2 0 0 0-2 2v8"/>'
            '<path d="M18 8a2 2 0 1 1 4 0v6a8 8 0 0 1-8 8h-2c-2.8 0-4.5-.86-5.99-2.34l-3.6-3.6a2 2 0 0 1 2.83-2.82L7 15"/>',
    "funk": '<path d="M12 20h.01"/><path d="M2 8.82a15 15 0 0 1 20 0"/><path d="M5 12.859a10 10 0 0 1 14 0"/>'
            '<path d="M8.5 16.429a5 5 0 0 1 7 0"/>',
    "schloss": '<rect width="18" height="11" x="3" y="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>',
    "drucker": '<path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/>'
               '<path d="M6 9V3h12v6"/><rect width="12" height="8" x="6" y="14"/>',
    "lupe": '<circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>',
    "warnung": '<path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3"/>'
               '<path d="M12 9v4"/><path d="M12 17h.01"/>',
    "korb": '<circle cx="8" cy="21" r="1"/><circle cx="19" cy="21" r="1"/>'
            '<path d="M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 1.95-1.57l1.65-7.43H5.12"/>',
    "nachricht": '<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>',
    "tuete": '<path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><path d="M3 6h18"/>'
             '<path d="M16 10a4 4 0 0 1-8 0"/>',
    "haken": '<path d="M21.801 10A10 10 0 1 1 17 3.335"/><path d="m9 11 3 3L22 4"/>',
    "verbot": '<circle cx="12" cy="12" r="10"/><path d="m4.9 4.9 14.2 14.2"/>',
    "fleisch": '<path d="M12.5 2a7.5 7.5 0 0 1 7.5 7.5c0 3-2 5.5-4 7.5l-3 3-3-3c-2-2-4-4.5-4-7.5A7.5 7.5 0 0 1 12.5 2z"/>'
               '<circle cx="12.5" cy="9" r="2.5"/>',
    "kalender": '<path d="M8 2v4"/><path d="M16 2v4"/><rect width="18" height="18" x="3" y="4" rx="2"/>'
                '<path d="M3 10h18"/>',
    "buch": '<path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H19a1 1 0 0 1 1 1v18a1 1 0 0 1-1 1H6.5a1 1 0 0 1 0-5H20"/>',
    "zurueck": '<path d="m12 19-7-7 7-7"/><path d="M19 12H5"/>',
    "schere": '<path d="M3 6h18"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/>'
              '<path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><path d="M10 11v6"/><path d="M14 11v6"/>',
    "person": '<path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>',
    "geld": '<rect width="20" height="12" x="2" y="6" rx="2"/><circle cx="12" cy="12" r="2"/>'
            '<path d="M6 12h.01M18 12h.01"/>',
}


def sprite():
    teile = ['<svg xmlns="http://www.w3.org/2000/svg" style="display:none" aria-hidden="true">']
    for name, pfad in SYMBOLE.items():
        teile.append(
            f'<symbol id="ic-{name}" viewBox="0 0 24 24" fill="none" stroke="currentColor"'
            f' stroke-width="2" stroke-linecap="round" stroke-linejoin="round">{pfad}</symbol>')
    teile.append("</svg>")
    return "\n".join(teile)


if __name__ == "__main__":
    print(sprite())
