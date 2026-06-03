import azure.functions as func
import json
import os
import hashlib
from datetime import datetime, timezone
from azure.data.tables import TableServiceClient


def _cors(status=200, body="", ct="text/plain"):
    headers = {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type",
        "Content-Type": ct,
    }
    return func.HttpResponse(body, status_code=status, headers=headers)


def _get_table_client(table_name="analytics"):
    conn = os.environ.get("STORAGE_CONN", "")
    if not conn:
        return None
    svc = TableServiceClient.from_connection_string(conn)
    svc.create_table_if_not_exists(table_name)
    return svc.get_table_client(table_name)


def main(req: func.HttpRequest) -> func.HttpResponse:
    if req.method == "OPTIONS":
        return _cors(204)

    try:
        body = req.get_json()
    except Exception:
        return _cors(400, '{"error":"invalid json"}', "application/json")

    page = body.get("page", "/")
    referrer = body.get("referrer", "")
    screen_w = body.get("sw", 0)
    ua = req.headers.get("User-Agent", "")

    # Anonymize: hash IP + UA + date → unique visitor per day, no PII stored
    ip = req.headers.get("X-Forwarded-For", "0.0.0.0").split(",")[0].strip()
    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    visitor_hash = hashlib.sha256(f"{ip}:{ua}:{today}".encode()).hexdigest()[:16]

    now = datetime.now(timezone.utc)
    hour = now.strftime("%H")

    # PartitionKey = date, RowKey = unique per hit
    row_key = f"{now.strftime('%H%M%S')}-{visitor_hash}-{hashlib.md5(page.encode()).hexdigest()[:6]}"

    entity = {
        "PartitionKey": today,
        "RowKey": row_key,
        "page": page[:200],
        "referrer": referrer[:500] if referrer else "",
        "visitor": visitor_hash,
        "hour": int(hour),
        "screenW": int(screen_w) if screen_w else 0,
        "ua": ua[:200],
        "ts": now.isoformat(),
    }

    tc = _get_table_client()
    if tc:
        tc.upsert_entity(entity)

    return _cors(200, '{"ok":true}', "application/json")
