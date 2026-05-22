import azure.functions as func
import json
import os
import msal
import requests
import base64


TENANT_ID = os.environ.get("DV_TENANT_ID", "acfaedd4-c403-43b7-9544-fdb2b150124e")
CLIENT_ID = os.environ.get("DV_CLIENT_ID", "137b2df6-be83-459a-ac89-9efd0bdf51c4")
CLIENT_SECRET = os.environ.get("DV_CLIENT_SECRET", "")

SHARE_URL = "https://dorfladenoberornau.sharepoint.com/:f:/s/DorfladenOberornauUGhaftungsbeschrnkt/IgC__jJ1VrYvSoHgFOoC0sJrAQCA52yZmnVVFKo4861Jwss"

IMAGE_EXTENSIONS = {".jpg", ".jpeg", ".png", ".gif", ".webp", ".bmp", ".svg"}


def get_graph_token():
    try:
        app = msal.ConfidentialClientApplication(
            CLIENT_ID,
            authority=f"https://login.microsoftonline.com/{TENANT_ID}",
            client_credential=CLIENT_SECRET,
        )
        result = app.acquire_token_for_client(scopes=["https://graph.microsoft.com/.default"])
        return result.get("access_token")
    except:
        return None


def get_cors_headers():
    return {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, OPTIONS",
        "Access-Control-Allow-Headers": "*",
        "Access-Control-Max-Age": "86400",
        "Content-Type": "application/json; charset=utf-8",
    }


def main(req: func.HttpRequest) -> func.HttpResponse:
    if req.method == "OPTIONS":
        return func.HttpResponse(status_code=200, headers=get_cors_headers())

    token = get_graph_token()
    if not token:
        return func.HttpResponse(
            body=json.dumps({"success": False, "error": "Auth failed"}),
            status_code=500,
            headers=get_cors_headers(),
        )

    headers = {
        "Authorization": f"Bearer {token}",
        "Accept": "application/json",
    }

    # Resolve sharing link to driveItem
    encoded = base64.urlsafe_b64encode(SHARE_URL.encode()).decode().rstrip("=")
    share_token = f"u!{encoded}"

    resolve_url = f"https://graph.microsoft.com/v1.0/shares/{share_token}/driveItem"
    r = requests.get(resolve_url, headers=headers, timeout=30)
    if r.status_code != 200:
        return func.HttpResponse(
            body=json.dumps({"success": False, "error": f"Could not resolve folder: {r.status_code}"}),
            status_code=500,
            headers=get_cors_headers(),
        )

    item = r.json()
    drive_id = item.get("parentReference", {}).get("driveId", "")
    item_id = item.get("id", "")

    # List children (images)
    children_url = f"https://graph.microsoft.com/v1.0/drives/{drive_id}/items/{item_id}/children?$select=id,name,size,file,image,@microsoft.graph.downloadUrl&$orderby=name"
    r2 = requests.get(children_url, headers=headers, timeout=30)
    if r2.status_code != 200:
        return func.HttpResponse(
            body=json.dumps({"success": False, "error": f"Could not list images: {r2.status_code}"}),
            status_code=500,
            headers=get_cors_headers(),
        )

    children = r2.json().get("value", [])
    images = []
    for c in children:
        name = c.get("name", "")
        ext = os.path.splitext(name)[1].lower()
        if ext not in IMAGE_EXTENSIONS:
            continue

        download_url = c.get("@microsoft.graph.downloadUrl", "")
        image_meta = c.get("image", {})

        images.append({
            "id": c.get("id", ""),
            "name": name,
            "url": download_url,
            "size": c.get("size", 0),
            "width": image_meta.get("width", 0),
            "height": image_meta.get("height", 0),
            "mime": c.get("file", {}).get("mimeType", ""),
        })

    return func.HttpResponse(
        body=json.dumps({"success": True, "images": images, "count": len(images)}),
        status_code=200,
        headers=get_cors_headers(),
    )
