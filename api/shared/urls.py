"""Hilfsfunktionen zur Ermittlung der oeffentlichen Origin (Schema + Host).

Push-Benachrichtigungen sollen auf die Umgebung verlinken, aus der sie
ausgeloest wurden (z. B. die Produktions-Domain), statt auf einen fest
konfigurierten Test-Host. Dazu wird die Origin aus den Request-Headern
(``X-Forwarded-Host``/``Host`` + ``X-Forwarded-Proto``) abgeleitet, die Azure
Static Web Apps mit dem oeffentlich verwendeten Hostnamen fuellt.
"""

import os


def get_public_origin(req, fallback_envs=("SWA_HOSTNAME", "WEBSITE_HOSTNAME")):
    """Liefert die oeffentliche Origin (z. B. ``https://www.dorfladen-oberornau.de``).

    Reihenfolge:
      1. ``X-Forwarded-Host`` / ``Host`` aus dem ausloesenden Request.
      2. Fallback auf Umgebungsvariablen (``SWA_HOSTNAME``, ``WEBSITE_HOSTNAME``).
      3. Letzter Fallback ``localhost:7071`` (lokale Entwicklung).
    """
    host = ""
    proto = ""
    try:
        host = req.headers.get("X-Forwarded-Host") or req.headers.get("Host") or ""
        proto = req.headers.get("X-Forwarded-Proto") or ""
    except Exception:
        host = ""
        proto = ""

    # Header koennen kommagetrennte Listen sein -> erstes Element nehmen.
    host = (host or "").split(",")[0].strip()
    proto = (proto or "").split(",")[0].strip()

    if not host:
        for key in fallback_envs:
            host = (os.environ.get(key, "") or "").strip()
            if host:
                break
    if not host:
        host = "localhost:7071"

    if not proto:
        low = host.lower()
        proto = "https" if ("azurestaticapps" in low or "azure" in low or "dorfladen" in low) else "http"

    return f"{proto}://{host}"


def absolutize(url, origin):
    """Macht eine relative URL (``/pfad``) mit der gegebenen Origin absolut."""
    if not url:
        return origin or url
    if url.startswith("http://") or url.startswith("https://"):
        return url
    if origin and url.startswith("/"):
        return origin + url
    return url
