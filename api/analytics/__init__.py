import azure.functions as func
import json
import os
from datetime import datetime, timezone, timedelta
from azure.data.tables import TableServiceClient


def _cors(status=200, body="", ct="application/json"):
    headers = {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type",
        "Content-Type": ct,
    }
    return func.HttpResponse(body, status_code=status, headers=headers)


def _get_table_client(table_name="analytics"):
    conn = os.environ.get("STORAGE_CONN", "")
    if not conn:
        return None
    svc = TableServiceClient.from_connection_string(conn)
    return svc.get_table_client(table_name)


def main(req: func.HttpRequest) -> func.HttpResponse:
    if req.method == "OPTIONS":
        return _cors(204)

    days_param = req.params.get("days", "30")
    try:
        days = min(int(days_param), 90)
    except ValueError:
        days = 30

    tc = _get_table_client()
    if not tc:
        return _cors(500, '{"error":"storage not configured"}')

    now = datetime.now(timezone.utc)
    start_date = now - timedelta(days=days)

    # Collect data per day
    daily = {}
    pages = {}
    referrers = {}
    all_visitors = set()
    total_views = 0
    hourly = [0] * 24
    devices = {"mobile": 0, "desktop": 0}
    cities = {}
    regions = {}

    for d in range(days + 1):
        day = (start_date + timedelta(days=d)).strftime("%Y-%m-%d")
        daily[day] = {"views": 0, "visitors": set()}

    # Query each day partition
    for day_key in list(daily.keys()):
        try:
            entities = tc.query_entities(f"PartitionKey eq '{day_key}'")
            for e in entities:
                page = e.get("page", "/")
                visitor = e.get("visitor", "")
                hour = e.get("hour", 0)
                ref = e.get("referrer", "")
                sw = e.get("screenW", 0)

                daily[day_key]["views"] += 1
                daily[day_key]["visitors"].add(visitor)
                total_views += 1
                all_visitors.add(visitor)

                # Pages
                pages[page] = pages.get(page, 0) + 1

                # Hourly
                if 0 <= hour < 24:
                    hourly[hour] += 1

                # Referrers
                if ref:
                    # Extract domain
                    try:
                        from urllib.parse import urlparse
                        domain = urlparse(ref).netloc or ref
                    except Exception:
                        domain = ref
                    # Eigene SWA-Hosts (*.azurestaticapps.net) ausschliessen –
                    # das ist Dev-/Preview-Navigation, kein echter Referrer.
                    if domain and "azurestaticapps.net" not in domain.lower():
                        referrers[domain] = referrers.get(domain, 0) + 1

                # Device detection
                if sw and int(sw) < 768:
                    devices["mobile"] += 1
                else:
                    devices["desktop"] += 1

                # Location
                city = e.get("city", "")
                region = e.get("region", "")
                country = e.get("country", "")
                if city:
                    loc_key = f"{city}, {region}" if region else city
                    cities[loc_key] = cities.get(loc_key, 0) + 1
                if region:
                    regions[region] = regions.get(region, 0) + 1
        except Exception:
            pass

    # Build timeline
    timeline = []
    for day_key in sorted(daily.keys()):
        timeline.append({
            "date": day_key,
            "views": daily[day_key]["views"],
            "visitors": len(daily[day_key]["visitors"]),
        })

    # Top pages
    top_pages = sorted(pages.items(), key=lambda x: -x[1])[:20]

    # Top referrers
    top_referrers = sorted(referrers.items(), key=lambda x: -x[1])[:10]

    # Today stats
    today_key = now.strftime("%Y-%m-%d")
    today_data = daily.get(today_key, {"views": 0, "visitors": set()})

    result = {
        "period": {"days": days, "from": start_date.strftime("%Y-%m-%d"), "to": now.strftime("%Y-%m-%d")},
        "totals": {
            "views": total_views,
            "visitors": len(all_visitors),
        },
        "today": {
            "views": today_data["views"],
            "visitors": len(today_data["visitors"]),
        },
        "timeline": timeline,
        "topPages": [{"page": p, "views": v} for p, v in top_pages],
        "topReferrers": [{"domain": d, "views": v} for d, v in top_referrers],
        "hourly": hourly,
        "devices": devices,
        "topCities": sorted([{"city": c, "views": v} for c, v in cities.items()], key=lambda x: -x["views"])[:20],
        "topRegions": sorted([{"region": r, "views": v} for r, v in regions.items()], key=lambda x: -x["views"])[:10],
    }

    return _cors(200, json.dumps(result))
