"""CMS-Login-Endpoint (SEC-2).

``POST /api/cms-auth`` mit ``{"password": "..."}``. Bei
``SHA-256(password) == CMS_PW_HASH`` wird das Admin-Token (``CMS_AUTH_TOKEN``)
zurückgegeben, das der Client danach als Header ``X-CMS-Auth`` sendet.
"""

import azure.functions as func
import json
import os
import hashlib
import hmac


def _resp(status, body):
    return func.HttpResponse(
        json.dumps(body),
        status_code=status,
        mimetype="application/json",
        headers={
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "POST,OPTIONS",
            "Access-Control-Allow-Headers": "Content-Type",
        },
    )


def main(req: func.HttpRequest) -> func.HttpResponse:
    if req.method == "OPTIONS":
        return _resp(204, {})

    try:
        body = req.get_json()
    except Exception:
        body = {}
    password = ((body or {}).get("password") or "")

    expected_hash = os.environ.get("CMS_PW_HASH", "").strip()
    token = os.environ.get("CMS_AUTH_TOKEN", "").strip()
    if not expected_hash or not token:
        return _resp(500, {"error": "server not configured"})

    pw_hash = hashlib.sha256(password.encode("utf-8")).hexdigest()
    if hmac.compare_digest(pw_hash, expected_hash):
        return _resp(200, {"token": token})
    return _resp(401, {"error": "invalid password"})
