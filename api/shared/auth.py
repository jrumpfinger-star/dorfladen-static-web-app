"""Serverseitige Admin-/CMS-Authentifizierung (SEC-2).

Statisches gemeinsames Token (App-Setting ``CMS_AUTH_TOKEN``), Vergleich per
``hmac.compare_digest``. Die Durchsetzung ist **staged** über das App-Setting
``CMS_AUTH_ENFORCE`` (fail-safe Rollout): Solange es nicht auf einen Wahr-Wert
gesetzt ist, wird **nicht** blockiert – der Code kann so gefahrlos deployen,
bevor der Client Tokens sendet.
"""

import os
import json
import hmac

import azure.functions as func

MUTATING_METHODS = ("POST", "PUT", "PATCH", "DELETE")


def enforcement_enabled():
    """True, wenn die Auth-Prüfung aktiv erzwungen werden soll."""
    return os.environ.get("CMS_AUTH_ENFORCE", "").strip().lower() in (
        "1", "true", "yes", "on",
    )


def _expected_token():
    return os.environ.get("CMS_AUTH_TOKEN", "").strip()


def token_valid(req):
    """True, wenn der Request ein gültiges Admin-Token im Header trägt."""
    expected = _expected_token()
    if not expected:
        return False
    provided = (req.headers.get("X-CMS-Auth") or "").strip()
    if not provided:
        return False
    return hmac.compare_digest(provided, expected)


def unauthorized_response():
    return func.HttpResponse(
        json.dumps({"error": "unauthorized"}),
        status_code=401,
        mimetype="application/json",
        headers={"Access-Control-Allow-Origin": "*"},
    )


def admin_auth_guard(req):
    """Gibt eine 401-``HttpResponse`` zurück, wenn der Request blockiert werden
    muss, sonst ``None``.

    Blockiert **nur** mutierende Methoden und **nur**, wenn ``CMS_AUTH_ENFORCE``
    aktiv ist. ``GET``/``OPTIONS`` bleiben immer offen.
    """
    if req.method in MUTATING_METHODS and enforcement_enabled():
        if not token_valid(req):
            return unauthorized_response()
    return None


def read_auth_guard(req):
    """Zusätzliche **Lese**-Prüfung für rein interne Endpunkte (z. B. Kalender).

    Blockiert ``GET`` ohne gültiges Token, aber **nur** wenn ``CMS_AUTH_ENFORCE``
    aktiv ist. ``OPTIONS`` bleibt immer offen. Additiv gedacht: Endpunkte, die
    auch das Lesen absichern wollen, rufen dies zusätzlich zu
    ``admin_auth_guard`` auf; bestehende (öffentlich lesbare) Endpunkte bleiben
    unberührt, weil sie diese Funktion nicht verwenden.
    """
    if req.method == "GET" and enforcement_enabled():
        if not token_valid(req):
            return unauthorized_response()
    return None
