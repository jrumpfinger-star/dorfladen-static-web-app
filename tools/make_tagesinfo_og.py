"""Erzeugt das OpenGraph-Vorschaubild fuer /tagesinfo (WhatsApp/Facebook-Link-Karte).

1200x630 (Standard-OG-Format). Zeigt 'TagesInfo' + Mittagstisch-Motiv in den
Dorfladen-Markenfarben statt des generischen Homepage-Logos.
"""
import os
from PIL import Image, ImageDraw, ImageFont

W, H = 1200, 630
GREEN = (22, 128, 61)        # Dorfladen-Gruen (dunkel)
GREEN_LT = (34, 163, 94)     # helleres Gruen
CREAM = (247, 243, 234)
WHITE = (255, 255, 255)
INK = (28, 45, 32)

FONT_DIR = r"C:\Windows\Fonts"

def font(name, size):
    for cand in (name, "segoeui.ttf", "arial.ttf"):
        p = os.path.join(FONT_DIR, cand)
        if os.path.exists(p):
            return ImageFont.truetype(p, size)
    return ImageFont.load_default()

f_over  = font("segoeuib.ttf", 34)
f_title = font("segoeuib.ttf", 132)
f_sub   = font("segoeui.ttf", 46)
f_pill  = font("segoeuib.ttf", 40)
f_dom   = font("segoeui.ttf", 34)

img = Image.new("RGB", (W, H), GREEN)
d = ImageDraw.Draw(img)

# Vertikaler Farbverlauf gruen -> dunkleres gruen
for y in range(H):
    t = y / H
    r = int(GREEN_LT[0] * (1 - t) + GREEN[0] * t)
    g = int(GREEN_LT[1] * (1 - t) + GREEN[1] * t)
    b = int(GREEN_LT[2] * (1 - t) + GREEN[2] * t)
    d.line([(0, y), (W, y)], fill=(r, g, b))

# --- Rechts: Teller mit Messer & Gabel (Mittagstisch-Motiv) ---
cx, cy, rr = 950, 315, 150
# Teller
d.ellipse([cx - rr, cy - rr, cx + rr, cy + rr], fill=CREAM)
d.ellipse([cx - rr + 26, cy - rr + 26, cx + rr - 26, cy + rr - 26], outline=(214, 205, 186), width=4)

def rounded(draw, box, rad, fill):
    draw.rounded_rectangle(box, radius=rad, fill=fill)

# Gabel (links vom Teller)
fx = cx - rr - 70
for i in range(4):
    x = fx + i * 13
    rounded(d, [x, cy - 150, x + 8, cy - 95], 4, CREAM)
rounded(d, [fx, cy - 100, fx + 47, cy - 78], 10, CREAM)     # Gabel-Kopf
rounded(d, [fx + 17, cy - 90, fx + 30, cy + 150], 6, CREAM) # Stiel
# Messer (rechts vom Teller)
kx = cx + rr + 52
rounded(d, [kx, cy - 150, kx + 26, cy - 20], 12, CREAM)     # Klinge
rounded(d, [kx + 7, cy - 30, kx + 19, cy + 150], 6, CREAM)  # Griff

# --- Links: Text ---
x0 = 80
# Overline
d.text((x0, 92), "DORFLADEN OBERORNAU", font=f_over, fill=(220, 244, 228))
# Titel
d.text((x0 - 4, 150), "TagesInfo", font=f_title, fill=WHITE)
# Untertitel
d.text((x0, 316), "Mittagstisch \u00b7 Theke \u00b7 Kuchen", font=f_sub, fill=(233, 250, 239))

# Pill "Jetzt vorbestellen"
pill_txt = "Jetzt vorbestellen"
tb = d.textbbox((0, 0), pill_txt, font=f_pill)
pw, ph = tb[2] - tb[0], tb[3] - tb[1]
px, py = x0, 400
pad_x, pad_y = 34, 22
rounded(d, [px, py, px + pw + 2 * pad_x, py + ph + 2 * pad_y], 40, CREAM)
d.text((px + pad_x, py + pad_y - tb[1]), pill_txt, font=f_pill, fill=GREEN)

# Domain unten
d.text((x0, 548), "www.dorfladen-oberornau.de/tagesinfo", font=f_dom, fill=(214, 240, 223))

out = os.path.join(os.path.dirname(__file__), "..", "static-site", "images", "tagesinfo-og.png")
out = os.path.abspath(out)
img.save(out, "PNG", optimize=True)
print("Gespeichert:", out, os.path.getsize(out), "Bytes")
