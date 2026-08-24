"""Hilfsfunktionen zur Ermittlung der oeffentlichen Origin (Schema + Host).

Push-Benachrichtigungen sollen auf die Umgebung verlinken, aus der sie
ausgeloest wurden (z. B. die Produktions-Domain), statt auf einen fest
konfigurierten Test-Host. Dazu wird die Origin aus den Request-Headern
(``X-Forwarded-Host``/``Host`` + ``X-Forwarded-Proto``) abgeleitet, die Azure
Static Web Apps mit dem oeffentlich verwendeten Hostnamen fuellt.
"""

import os


# Fester oeffentlicher Fallback (Custom Domain). Ein Klick auf eine Push-
# Benachrichtigung muss IMMER auf der oeffentlichen Seite landen – niemals auf
# dem internen Functions-Host (…azurewebsites.net), da dort die SWA-Auth
# greift ("Login not supported for provider azureStaticWebApps").
DEFAULT_PUBLIC_ORIGIN = "https://www.dorfladen-oberornau.de"


def _is_internal_host(host):
    """True fuer interne/nicht-oeffentlich klickbare Hosts (Functions-Host, lokal)."""
    h = (host or "").lower()
    if not h:
        return True
    return (
        "azurewebsites.net" in h
        or "azure-api.net" in h
        or h.startswith("localhost")
        or h.startswith("127.")
        or h.startswith("0.0.0.0")
    )


def get_public_origin(req, fallback_envs=("SWA_HOSTNAME", "WEBSITE_HOSTNAME")):
    """Liefert die oeffentliche Origin (z. B. ``https://www.dorfladen-oberornau.de``).

    Reihenfolge:
      1. ``X-Forwarded-Host`` / ``Host`` aus dem ausloesenden Request –
         aber NUR, wenn es ein oeffentlicher Host ist (nicht der interne
         Functions-Host ``…azurewebsites.net``).
      2. App-Setting ``PUBLIC_SITE_URL`` (pro Umgebung setzbar).
      3. Fallback-Umgebungsvariablen (sofern nicht intern).
      4. Fester Fallback ``DEFAULT_PUBLIC_ORIGIN`` (Custom Domain).
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

    # Interne Function-Hosts NIE als oeffentliche Ziel-URL verwenden.
    if _is_internal_host(host):
        host = ""

    if not host:
        # Explizit konfigurierte oeffentliche URL bevorzugen (pro Umgebung).
        env_url = (os.environ.get("PUBLIC_SITE_URL", "") or "").strip().rstrip("/")
        if env_url:
            return env_url
        for key in fallback_envs:
            cand = (os.environ.get(key, "") or "").strip()
            if cand and not _is_internal_host(cand):
                host = cand
                break

    if not host:
        return DEFAULT_PUBLIC_ORIGIN

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
