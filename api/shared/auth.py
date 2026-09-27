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


def _wahr(wert):
    return str(wert or "").strip().lower() in ("1", "true", "yes", "on")


def enforcement_enabled():
    """True, wenn die Auth-Prüfung aktiv erzwungen werden soll."""
    return _wahr(os.environ.get("CMS_AUTH_ENFORCE"))


def read_enforcement_enabled(schalter=None):
    """Wie ``enforcement_enabled``, aber mit **eigenem** Schalter je Endpunkt.

    Warum es den braucht: ``CMS_AUTH_ENFORCE`` gilt für **25** Endpunkte
    auf einmal (alle mit ``admin_auth_guard``). Wer nur EINE offene
    Leseschnittstelle schließen will, müsste den gesamten Schreibbetrieb
    von CMS und Kiosk mit umlegen - eine Entscheidung, die niemand
    nebenbei trifft. Genau daran hing der Schutz der Mittagstisch-Liste
    monatelang fest (Spec bestellliste-schuetzen, T10).

    Mit einem eigenen Schalter wird die Entscheidung klein: Schlägt etwas
    fehl, betrifft es nur diesen einen Endpunkt.

    Der gemeinsame Schalter wirkt weiterhin - wer ihn setzt, bekommt
    beides. Der eigene ist ein ODER, keine Bedingung.
    """
    if enforcement_enabled():
        return True
    return bool(schalter) and _wahr(os.environ.get(schalter))


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


def read_auth_guard(req, schalter=None):
    """Zusätzliche **Lese**-Prüfung für rein interne Endpunkte (z. B. Kalender).

    Blockiert ``GET`` ohne gültiges Token, aber **nur** wenn ``CMS_AUTH_ENFORCE``
    aktiv ist. ``OPTIONS`` bleibt immer offen. Additiv gedacht: Endpunkte, die
    auch das Lesen absichern wollen, rufen dies zusätzlich zu
    ``admin_auth_guard`` auf; bestehende (öffentlich lesbare) Endpunkte bleiben
    unberührt, weil sie diese Funktion nicht verwenden.

    ``schalter`` nennt wahlweise ein **eigenes** App-Setting (z. B.
    ``LUNCH_LIST_ENFORCE``). Dann lässt sich dieser eine Endpunkt
    absichern, ohne die 25 Schreib-Endpunkte mit umzulegen - siehe
    ``read_enforcement_enabled``.
    """
    if req.method == "GET" and read_enforcement_enabled(schalter):
        if not token_valid(req):
            return unauthorized_response()
    return None
