"""QR-Code fuer die App-Anleitung erzeugen.

Einmalig ausgefuehrt; das Ergebnis liegt als
static-site/images/anleitung/qr-app.svg im Verzeichnisbaum. Die Adresse
aendert sich nicht, deshalb braucht die Seite zur Laufzeit keine Bibliothek.

Der erzeugte Code wird anschliessend gegengelesen (OpenCV), damit kein
falscher Code in einen Aushang gerät.

    python tools\qr_app_erzeugen.py
"""

import os
import sys

import qrcode

ZIEL = "https://dorfladen-oberornau.de/app"
GRUEN = "#2d5016"
DATEI = os.path.join("static-site", "images", "anleitung", "qr-app.svg")

# Rand: Die Norm verlangt vier Module Ruhezone. Weniger liest manches
# aeltere Handy nicht mehr.
RAND = 4


def matrix():
    qr = qrcode.QRCode(
        version=None,
        error_correction=qrcode.constants.ERROR_CORRECT_M,
        box_size=1,
        border=0,
    )
    qr.add_data(ZIEL)
    qr.make(fit=True)
    return qr.get_matrix()


def svg(mat):
    n = len(mat)
    gesamt = n + 2 * RAND
    # Ein einziger Pfad statt tausend Rechtecken: kleiner und schneller.
    teile = []
    for y, zeile in enumerate(mat):
        x = 0
        while x < n:
            if not zeile[x]:
                x += 1
                continue
            breite = 0
            while x + breite < n and zeile[x + breite]:
                breite += 1
            teile.append(f"M{x + RAND} {y + RAND}h{breite}v1h-{breite}z")
            x += breite
    pfad = "".join(teile)
    return (
        f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {gesamt} {gesamt}"'
        f' width="{gesamt * 4}" height="{gesamt * 4}" shape-rendering="crispEdges"'
        f' role="img" aria-label="QR-Code zur Anleitung unter {ZIEL}">'
        f'<title>QR-Code: {ZIEL}</title>'
        f'<rect width="{gesamt}" height="{gesamt}" fill="#ffffff"/>'
        f'<path d="{pfad}" fill="{GRUEN}"/>'
        f"</svg>\n"
    )


def pruefe(mat):
    """Gegenlesen: Matrix als Bild aufziehen und mit OpenCV dekodieren."""
    import numpy as np
    import cv2

    n = len(mat)
    gesamt = n + 2 * RAND
    skala = 8
    bild = np.full((gesamt * skala, gesamt * skala), 255, dtype=np.uint8)
    for y, zeile in enumerate(mat):
        for x, an in enumerate(zeile):
            if an:
                oy, ox = (y + RAND) * skala, (x + RAND) * skala
                bild[oy:oy + skala, ox:ox + skala] = 0
    gelesen, _, _ = cv2.QRCodeDetector().detectAndDecode(bild)
    return gelesen


def main():
    mat = matrix()
    gelesen = pruefe(mat)
    if gelesen != ZIEL:
        print(f"FEHLER: gelesen wurde {gelesen!r}, erwartet {ZIEL!r}")
        return 1
    with open(DATEI, "w", encoding="utf-8", newline="\n") as f:
        f.write(svg(mat))
    print(f"ok   {len(mat)}x{len(mat)} Module, gegengelesen: {gelesen}")
    print(f"ok   geschrieben: {DATEI} ({os.path.getsize(DATEI)} Bytes)")
    return 0


if __name__ == "__main__":
    sys.exit(main())
