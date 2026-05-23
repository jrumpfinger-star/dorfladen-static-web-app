import azure.functions as func
import json
import os
import msal
import requests

def get_token(url_setting_name="DV_DEFAULT_URL"):
    tenant_id = os.environ.get("DV_TENANT_ID", "acfaedd4-c403-43b7-9544-fdb2b150124e")
    client_id = os.environ.get("DV_CLIENT_ID", "137b2df6-be83-459a-ac89-9efd0bdf51c4")
    client_secret = os.environ.get("DV_CLIENT_SECRET", "")
    target_url = os.environ.get(url_setting_name, "https://orgab4e2f00.crm16.dynamics.com")
    if not client_secret:
        return "FEHLER_SECRET_FEHLT"
    try:
        a = msal.ConfidentialClientApplication(
            client_id,
            authority=f"https://login.microsoftonline.com/{tenant_id}",
            client_credential=client_secret,
        )
        r = a.acquire_token_for_client(scopes=[f"{target_url}/.default"])
        return r.get("access_token")
    except Exception as e:
        return f"FEHLER: {str(e)}"

def get_headers(url_setting_name="DV_DEFAULT_URL"):
    token = get_token(url_setting_name)
    return {
        "Authorization": f"Bearer {token}",
        "OData-MaxVersion": "4.0",
        "OData-Version": "4.0",
        "Accept": "application/json",
        "Content-Type": "application/json; charset=utf-8"
    }

def get_cors_headers():
    return {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, POST, PATCH, OPTIONS, DELETE",
        "Access-Control-Allow-Headers": "*",
        "Access-Control-Max-Age": "86400",
        "Content-Type": "application/json; charset=utf-8"
    }

DAY_LABELS = {101000: "Montag", 101001: "Dienstag", 101002: "Mittwoch", 101003: "Donnerstag", 101004: "Freitag", 101005: "Samstag", 101006: "Sonntag"}


def _serialize_item(item):
    return {
        "id": item.get("dl_wochenplanid"),
        "dl_wochenplanid": item.get("dl_wochenplanid"),
        "dl_wochenplansid": item.get("dl_wochenplanid"),
        "gericht": item.get("dl_gericht", ""),
        "dl_gericht": item.get("dl_gericht", ""),
        "wochentag": item.get("dl_wochentag"),
        "dl_wochentag": item.get("dl_wochentag"),
        "_dl_wochentag_label": DAY_LABELS.get(item.get("dl_wochentag"), ""),
        "preis": item.get("dl_preis", 0),
        "dl_preis": item.get("dl_preis", 0),
        "beschreibung": item.get("dl_beschreibung", ""),
        "dl_beschreibung": item.get("dl_beschreibung", ""),
        "datum": item.get("dl_datum"),
        "dl_datum": item.get("dl_datum"),
        "kalenderwoche": item.get("dl_kalenderwoche"),
        "dl_kalenderwoche": item.get("dl_kalenderwoche"),
        "jahr": item.get("dl_jahr"),
        "dl_jahr": item.get("dl_jahr"),
        "status": item.get("dl_status"),
        "dl_status": item.get("dl_status")
    }

def main(req: func.HttpRequest) -> func.HttpResponse:
    if req.method == "OPTIONS":
        return func.HttpResponse(status_code=200, headers=get_cors_headers())

    record_id = req.route_params.get("id")

    try:
        headers = get_headers("DV_DEFAULT_URL")
        dev_url = os.environ.get("DV_DEFAULT_URL", "https://orgab4e2f00.crm16.dynamics.com")

        if req.method == "GET":
            from datetime import datetime
            params = {}
            for key in ["$select", "$filter", "$orderby", "$top", "$skip", "$expand"]:
                value = req.params.get(key)
                if value:
                    params[key] = value

            if "$select" not in params:
                params["$select"] = "dl_wochenplanid,dl_gericht,dl_wochentag,dl_datum,dl_preis,dl_beschreibung,dl_kalenderwoche,dl_jahr,dl_status"
            if "$orderby" not in params:
                params["$orderby"] = "dl_datum asc"
            if "$filter" not in params:
                # Default: only active items for current/next calendar week
                # Ab Samstag: nächste Woche anzeigen
                from datetime import timedelta
                now = datetime.utcnow()
                if now.weekday() >= 5:  # 5=Saturday, 6=Sunday
                    now = now + timedelta(days=(7 - now.weekday()))  # shift to next Monday
                kw = now.isocalendar()[1]
                jahr = now.isocalendar()[0]
                params["$filter"] = f"dl_status eq 101001 and dl_kalenderwoche eq {kw} and dl_jahr eq {jahr}"

            url = f"{dev_url}/api/data/v9.2/dl_wochenplans"
            r = requests.get(url, headers=headers, params=params)

            if r.status_code == 200:
                data = r.json()
                wochenplan_list = [_serialize_item(item) for item in data.get("value", [])]
                return func.HttpResponse(
                    json.dumps({"success": True, "data": wochenplan_list}, ensure_ascii=False),
                    status_code=200,
                    mimetype="application/json",
                    headers=get_cors_headers()
                )

            return func.HttpResponse(
                json.dumps({"success": False, "error": f"Dataverse error: {r.status_code}", "detail": r.text}, ensure_ascii=False),
                status_code=r.status_code,
                mimetype="application/json",
                headers=get_cors_headers()
            )

        if req.method == "POST":
            body = req.get_json()
            url = f"{dev_url}/api/data/v9.2/dl_wochenplans"
            post_headers = {**headers, "Prefer": "return=representation"}
            r = requests.post(url, headers=post_headers, json=body)

            if r.status_code in (200, 201, 204):
                created = {"success": True}
                if r.text:
                    try:
                        created["data"] = _serialize_item(r.json())
                    except Exception:
                        created["raw"] = r.text
                return func.HttpResponse(
                    json.dumps(created, ensure_ascii=False),
                    status_code=200,
                    mimetype="application/json",
                    headers=get_cors_headers()
                )

            return func.HttpResponse(
                json.dumps({"success": False, "error": f"Dataverse error: {r.status_code}", "detail": r.text}, ensure_ascii=False),
                status_code=r.status_code,
                mimetype="application/json",
                headers=get_cors_headers()
            )

        if req.method == "PATCH" and record_id:
            body = req.get_json()
            url = f"{dev_url}/api/data/v9.2/dl_wochenplans({record_id})"
            patch_headers = {**headers, "If-Match": "*"}
            r = requests.patch(url, headers=patch_headers, json=body)

            if r.status_code in (200, 204):
                return func.HttpResponse(
                    json.dumps({"success": True}, ensure_ascii=False),
                    status_code=200,
                    mimetype="application/json",
                    headers=get_cors_headers()
                )

            return func.HttpResponse(
                json.dumps({"success": False, "error": f"Dataverse error: {r.status_code}", "detail": r.text}, ensure_ascii=False),
                status_code=r.status_code,
                mimetype="application/json",
                headers=get_cors_headers()
            )

        if req.method == "DELETE" and record_id:
            url = f"{dev_url}/api/data/v9.2/dl_wochenplans({record_id})"
            delete_headers = {**headers, "If-Match": "*"}
            r = requests.delete(url, headers=delete_headers)

            if r.status_code in (200, 204):
                return func.HttpResponse(
                    json.dumps({"success": True}, ensure_ascii=False),
                    status_code=200,
                    mimetype="application/json",
                    headers=get_cors_headers()
                )

            return func.HttpResponse(
                json.dumps({"success": False, "error": f"Dataverse error: {r.status_code}", "detail": r.text}, ensure_ascii=False),
                status_code=r.status_code,
                mimetype="application/json",
                headers=get_cors_headers()
            )

        return func.HttpResponse(
            json.dumps({"success": False, "error": "Method not allowed"}, ensure_ascii=False),
            status_code=405,
            mimetype="application/json",
            headers=get_cors_headers()
        )

    except Exception as e:
        return func.HttpResponse(
            json.dumps({"success": False, "error": str(e)}, ensure_ascii=False),
            status_code=500,
            mimetype="application/json",
            headers=get_cors_headers()
        )
