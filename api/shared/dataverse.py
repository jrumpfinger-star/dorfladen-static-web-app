"""Zentrale Auflösung der Dataverse-/Graph-Zugangsdaten.

Tenant-ID und Client-ID sind **öffentliche Bezeichner** (kein Secret) – sie
erscheinen ohnehin in Tokens/Redirects. Das eigentliche Secret
``DV_CLIENT_SECRET`` hat bewusst **keinen** Fallback und muss als App-Setting
gesetzt sein.

Die Tenant-/Client-Fallbacks bleiben aus Kompatibilitätsgründen zunächst hier
an **einer** Stelle (statt in ~30 Function-Dateien). Sobald ``DV_TENANT_ID`` und
``DV_CLIENT_ID`` in den Azure-App-Settings gesetzt sind, können die Fallbacks
unten entfernt werden.
"""

import os

# Öffentliche Bezeichner (keine Secrets) – zentraler, einziger Fallback.
_TENANT_FALLBACK = "acfaedd4-c403-43b7-9544-fdb2b150124e"
_CLIENT_FALLBACK = "137b2df6-be83-459a-ac89-9efd0bdf51c4"

# Standard-Dataverse-URL (Produktion) – ebenfalls kein Secret.
DEFAULT_DATAVERSE_URL = "https://orgab4e2f00.crm16.dynamics.com"


def get_tenant_id():
    """Azure AD Tenant-ID (App-Setting ``DV_TENANT_ID``)."""
    return os.environ.get("DV_TENANT_ID", _TENANT_FALLBACK)


def get_client_id():
    """App-Registration Client-ID (App-Setting ``DV_CLIENT_ID``)."""
    return os.environ.get("DV_CLIENT_ID", _CLIENT_FALLBACK)


def get_client_secret():
    """Client-Secret (App-Setting ``DV_CLIENT_SECRET``) – ohne Fallback."""
    return os.environ.get("DV_CLIENT_SECRET", "")


def get_dataverse_url(url_setting_name="DV_DEFAULT_URL"):
    """Ziel-Dataverse-URL aus dem angegebenen App-Setting."""
    return os.environ.get(url_setting_name, DEFAULT_DATAVERSE_URL)


def get_authority():
    """MSAL-Authority-URL für den Tenant."""
    return f"https://login.microsoftonline.com/{get_tenant_id()}"
