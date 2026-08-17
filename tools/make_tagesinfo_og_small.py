"""Erzeugt ein KOMPAKTES, quadratisches Vorschaubild fuer /tagesinfo.

WhatsApp zeigt bei grossen (1200x630) Bildern eine grosse Banner-Karte. Ein
kleines quadratisches Bild (300x300) + twitter:card=summary ergibt eine
kompakte Vorschau mit kleinem Thumbnail links und Text rechts.
"""
import os
from PIL import Image, ImageDraw, ImageFont

S = 300
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

f_over = font("segoeuib.ttf", 20)
f_title = font("segoeuib.ttf", 52)
f_sub = font("segoeui.ttf", 22)

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
cx, cy, rr = S / 2, 92, 46
d.ellipse([cx - rr, cy - rr, cx + rr, cy + rr], fill=CREAM)
d.ellipse([cx - rr + 10, cy - rr + 10, cx + rr - 10, cy + rr - 10], outline=(214, 205, 186), width=3)
# Gabel + Messer
d.rounded_rectangle([cx - rr - 22, cy - 26, cx - rr - 8, cy + 26], radius=4, fill=CREAM)
d.rounded_rectangle([cx + rr + 8, cy - 26, cx + rr + 22, cy + 26], radius=4, fill=CREAM)

center_text(150, "DORFLADEN OBERORNAU", f_over, (220, 244, 228))
center_text(172, "TagesInfo", f_title, WHITE)
center_text(236, "Mittagstisch vorbestellen", f_sub, (233, 250, 239))

out = os.path.join(os.path.dirname(__file__), "..", "static-site", "images", "tagesinfo-og-small.png")
out = os.path.abspath(out)
img.save(out, "PNG", optimize=True)
print("Gespeichert:", out, os.path.getsize(out), "Bytes")
