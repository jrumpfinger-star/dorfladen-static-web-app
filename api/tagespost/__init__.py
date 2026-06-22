import azure.functions as func
import json
import os
import msal
import requests
from datetime import datetime, timezone

# ---------- config ----------
TENANT_ID = os.environ.get("DV_TENANT_ID", "acfaedd4-c403-43b7-9544-fdb2b150124e")
CLIENT_ID = os.environ.get("DV_CLIENT_ID", "137b2df6-be83-459a-ac89-9efd0bdf51c4")
CLIENT_SECRET = os.environ.get("DV_CLIENT_SECRET", "")

SP_DRIVE = "b!bwUha0ab4EeiA3xXHK-Oobhv5tJbeYJDiF9pTB-f1kC-Mp-AY0brRrr2WigdYK4A"
SP_SOCIAL_FOLDER_NAME = "SocialMedia"
POSTS_FILE = "posts.json"


def get_cors():
    return {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, OPTIONS",
        "Access-Control-Allow-Headers": "*",
        "Access-Control-Max-Age": "86400",
        "Content-Type": "application/json; charset=utf-8",
    }


def ok(data, code=200):
    return func.HttpResponse(
        json.dumps(data, ensure_ascii=False), status_code=code,
        mimetype="application/json", headers=get_cors(),
    )


def err(msg, code=400):
    return func.HttpResponse(
        json.dumps({"success": False, "error": msg}, ensure_ascii=False),
        status_code=code, mimetype="application/json", headers=get_cors(),
    )


def get_graph_token():
    if not CLIENT_SECRET:
        return None
    try:
        app = msal.ConfidentialClientApplication(
            CLIENT_ID,
            authority=f"https://login.microsoftonline.com/{TENANT_ID}",
            client_credential=CLIENT_SECRET,
        )
        r = app.acquire_token_for_client(scopes=["https://graph.microsoft.com/.default"])
        return r.get("access_token")
    except:
        return None


def graph_headers(token):
    return {"Authorization": f"Bearer {token}", "Accept": "application/json"}


def find_social_folder(token):
    h = graph_headers(token)
    url = f"https://graph.microsoft.com/v1.0/drives/{SP_DRIVE}/root/children?$filter=name eq '{SP_SOCIAL_FOLDER_NAME}'&$select=id,name,folder"
    r = requests.get(url, headers=h, timeout=15)
    if r.status_code == 200:
        for child in r.json().get("value", []):
            if child.get("folder") is not None:
                return child["id"]
    return None


def load_posts(token, folder_id):
    h = graph_headers(token)
    url = f"https://graph.microsoft.com/v1.0/drives/{SP_DRIVE}/items/{folder_id}:/{POSTS_FILE}:/content"
    r = requests.get(url, headers=h, timeout=15)
    if r.status_code == 200:
        try:
            return json.loads(r.text)
        except:
            return []
    return []


def main(req: func.HttpRequest) -> func.HttpResponse:
    if req.method == "OPTIONS":
        return func.HttpResponse(status_code=200, headers=get_cors())

    token = get_graph_token()
    if not token:
        return err("Graph-Token konnte nicht abgerufen werden", 500)

    folder_id = find_social_folder(token)
    if not folder_id:
        return ok({"success": True, "post": None})

    posts = load_posts(token, folder_id)
    if not posts:
        return ok({"success": True, "post": None})

    # Find the newest post from today
    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    today_posts = [p for p in posts if p.get("datum", "")[:10] == today]

    if not today_posts:
        return ok({"success": True, "post": None})

    # Return the newest post from today
    today_posts.sort(key=lambda p: p.get("datum", ""), reverse=True)
    post = today_posts[0]

    return ok({"success": True, "post": post})
