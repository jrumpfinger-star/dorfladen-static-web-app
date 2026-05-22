import azure.functions as func
import json
import os


def get_cors_headers():
    return {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, OPTIONS",
        "Access-Control-Allow-Headers": "*",
        "Access-Control-Max-Age": "86400",
        "Content-Type": "application/json; charset=utf-8"
    }


def main(req: func.HttpRequest) -> func.HttpResponse:
    if req.method == "OPTIONS":
        return func.HttpResponse(status_code=200, headers=get_cors_headers())

    vapid_public_key = os.environ.get("VAPID_PUBLIC_KEY", "")
    if not vapid_public_key:
        return func.HttpResponse(
            json.dumps({"error": "VAPID key not configured"}),
            status_code=500, mimetype="application/json", headers=get_cors_headers()
        )

    return func.HttpResponse(
        json.dumps({"publicKey": vapid_public_key}),
        status_code=200, mimetype="application/json", headers=get_cors_headers()
    )
