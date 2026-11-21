"""CMS-Login-Endpoint (SEC-2).

``POST /api/cms-auth`` mit ``{"password": "..."}``. Bei
``SHA-256(password) == CMS_PW_HASH`` wird das Admin-Token (``CMS_AUTH_TOKEN``)
zurückgegeben, das der Client danach als Header ``X-CMS-Auth`` sendet.
``GET`` prüft eine vorhandene Serversitzung, ohne das Token auszuliefern.
"""

import azure.functions as func
import json
import os
import hashlib
import hmac

from shared.auth import token_valid


def _resp(status, body):
    return func.HttpResponse(
        json.dumps(body),
        status_code=status,
        mimetype="application/json",
        headers={
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
            "Access-Control-Allow-Headers": "Content-Type,X-CMS-Auth",
            "Cache-Control": "no-store",
        },
    )


def main(req: func.HttpRequest) -> func.HttpResponse:
    if req.method == "OPTIONS":
        return _resp(204, {})

    expected_hash = os.environ.get("CMS_PW_HASH", "").strip()
    token = os.environ.get("CMS_AUTH_TOKEN", "").strip()
    if not expected_hash or not token:
        return _resp(500, {"error": "server not configured"})

    if req.method == "GET":
        authenticated = token_valid(req)
        return _resp(200 if authenticated else 401, {"authenticated": authenticated})

    try:
        body = req.get_json()
    except Exception:
        body = {}
    password = ((body or {}).get("password") or "")

    pw_hash = hashlib.sha256(password.encode("utf-8")).hexdigest()
    if hmac.compare_digest(pw_hash, expected_hash):
        return _resp(200, {"token": token})
    return _resp(401, {"error": "invalid password"})
