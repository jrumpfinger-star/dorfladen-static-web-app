"""Zentrale Auflösung der Dataverse-/Graph-Zugangsdaten.

Tenant-ID und Client-ID sind **öffentliche Bezeichner** (kein Secret) – sie
erscheinen ohnehin in Tokens/Redirects. Sie werden dennoch ausschließlich aus
den Azure-App-Settings gelesen (kein Hardcode mehr). Fehlt eine Einstellung,
wird ein klarer Fehler ausgelöst (kein stiller Fallback).

Die aktiven Umgebungen ``dorfladen-website`` (Prod) und
``dorfladen-bestellsystem`` haben ``DV_TENANT_ID``/``DV_CLIENT_ID``/
``DV_CLIENT_SECRET``/``DV_DEFAULT_URL`` gesetzt; lokal via ``local.settings.json``.
"""

import os

# Standard-Dataverse-URL (Produktion) – kein Secret, dient als URL-Default.
DEFAULT_DATAVERSE_URL = "https://orgab4e2f00.crm16.dynamics.com"


def _require(name):
    value = os.environ.get(name, "").strip()
    if not value:
        raise RuntimeError(
            f"App-Setting '{name}' fehlt. Bitte in den Azure Static Web App "
            f"App-Settings (bzw. lokal in local.settings.json) setzen."
        )
    return value


def get_tenant_id():
    """Azure AD Tenant-ID (App-Setting ``DV_TENANT_ID``)."""
    return _require("DV_TENANT_ID")


def get_client_id():
    """App-Registration Client-ID (App-Setting ``DV_CLIENT_ID``)."""
    return _require("DV_CLIENT_ID")


def get_client_secret():
    """Client-Secret (App-Setting ``DV_CLIENT_SECRET``) – ohne Fallback."""
    return os.environ.get("DV_CLIENT_SECRET", "")


def get_dataverse_url(url_setting_name="DV_DEFAULT_URL"):
    """Ziel-Dataverse-URL aus dem angegebenen App-Setting."""
    return os.environ.get(url_setting_name, DEFAULT_DATAVERSE_URL)


def get_authority():
    """MSAL-Authority-URL für den Tenant."""
    return f"https://login.microsoftonline.com/{get_tenant_id()}"
