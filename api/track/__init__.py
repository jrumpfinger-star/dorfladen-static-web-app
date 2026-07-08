import azure.functions as func
import json
import os
import hashlib
import logging
from datetime import datetime, timezone
from azure.data.tables import TableServiceClient
import requests as http_requests


def _cors(status=200, body="", ct="text/plain"):
    headers = {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type",
        "Content-Type": ct,
    }
    return func.HttpResponse(body, status_code=status, headers=headers)


def _geo_lookup(ip):
    """Lookup city/region/country from IP via ip-api.com (free, no key, 45 req/min)."""
    try:
        if ip in ("0.0.0.0", "127.0.0.1", "::1") or ip.startswith("10.") or ip.startswith("192.168."):
            return {"city": "Lokal", "region": "", "country": "DE"}
        r = http_requests.get(
            f"http://ip-api.com/json/{ip}?fields=status,city,regionName,country,countryCode",
            timeout=2,
        )
        if r.status_code == 200:
            data = r.json()
            if data.get("status") == "success":
                return {
                    "city": data.get("city", ""),
                    "region": data.get("regionName", ""),
                    "country": data.get("countryCode", ""),
                }
    except Exception as e:
        logging.warning(f"GeoIP lookup failed: {e}")
    return {"city": "", "region": "", "country": ""}


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
    internal = bool(body.get("internal", False))
    ua = req.headers.get("User-Agent", "")

    # Anonymize: hash IP + UA + date → unique visitor per day, no PII stored
    ip = req.headers.get("X-Forwarded-For", "0.0.0.0").split(",")[0].strip()
    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    visitor_hash = hashlib.sha256(f"{ip}:{ua}:{today}".encode()).hexdigest()[:16]

    # GeoIP lookup – city/region/country (IP is NOT stored)
    geo = _geo_lookup(ip)

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
        "city": geo.get("city", "")[:100],
        "region": geo.get("region", "")[:100],
        "country": geo.get("country", "")[:10],
        "internal": internal,
    }

    tc = _get_table_client()
    if tc:
        tc.upsert_entity(entity)

    return _cors(200, '{"ok":true}', "application/json")
