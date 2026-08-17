"""Erzeugt ein KOMPAKTES, quadratisches Vorschaubild fuer /tagesinfo.

WhatsApp zeigt bei grossen (1200x630) Bildern eine grosse Banner-Karte. Ein
kleines quadratisches Bild (300x300) + twitter:card=summary ergibt eine
kompakte Vorschau mit kleinem Thumbnail links und Text rechts.
"""
import os
from PIL import Image, ImageDraw, ImageFont

S = 390  # +30% groesser (300 * 1.3 = 390)
GREEN = (22, 128, 61)
GREEN_LT = (34, 163, 94)
CREAM = (247, 243, 234)
WHITE = (255, 255, 255)

FONT_DIR = r"C:\Windows\Fonts"

def font(name, size):
    for cand in (name, "segoeui.ttf", "arial.ttf"):
        p = os.path.join(FONT_DIR, cand)
        if os.path.exists(p):
            return ImageFont.truetype(p, size)
    return ImageFont.load_default()

f_over = font("segoeuib.ttf", 26)
f_title = font("segoeuib.ttf", 68)
f_sub = font("segoeui.ttf", 29)

img = Image.new("RGB", (S, S), GREEN)
d = ImageDraw.Draw(img)

# Vertikaler Farbverlauf
for y in range(S):
    t = y / S
    r = int(GREEN_LT[0] * (1 - t) + GREEN[0] * t)
    g = int(GREEN_LT[1] * (1 - t) + GREEN[1] * t)
    b = int(GREEN_LT[2] * (1 - t) + GREEN[2] * t)
    d.line([(0, y), (S, y)], fill=(r, g, b))

def center_text(y, text, fnt, fill):
    tb = d.textbbox((0, 0), text, font=fnt)
    w = tb[2] - tb[0]
    d.text(((S - w) / 2, y), text, font=fnt, fill=fill)

# Teller-Icon oben (Kreis)
cx, cy, rr = S / 2, 120, 60
d.ellipse([cx - rr, cy - rr, cx + rr, cy + rr], fill=CREAM)
d.ellipse([cx - rr + 13, cy - rr + 13, cx + rr - 13, cy + rr - 13], outline=(214, 205, 186), width=4)
# Gabel + Messer
d.rounded_rectangle([cx - rr - 29, cy - 34, cx - rr - 10, cy + 34], radius=5, fill=CREAM)
d.rounded_rectangle([cx + rr + 10, cy - 34, cx + rr + 29, cy + 34], radius=5, fill=CREAM)

center_text(195, "DORFLADEN OBERORNAU", f_over, (220, 244, 228))
center_text(224, "TagesInfo", f_title, WHITE)
center_text(307, "Mittagstisch vorbestellen", f_sub, (233, 250, 239))

out = os.path.join(os.path.dirname(__file__), "..", "static-site", "images", "tagesinfo-og-small.png")
out = os.path.abspath(out)
img.save(out, "PNG", optimize=True)
print("Gespeichert:", out, os.path.getsize(out), "Bytes")
