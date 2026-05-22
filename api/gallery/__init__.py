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


def get_content_url(drive_id, item_id, token):
    """Get a public download URL via /content redirect."""
    url = f"https://graph.microsoft.com/v1.0/drives/{drive_id}/items/{item_id}/content"
    r = requests.get(url, headers={"Authorization": f"Bearer {token}"}, timeout=15, allow_redirects=False)
    if r.status_code == 302:
        return r.headers.get("Location", "")
    return ""


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

    # List children (subfolders = categories, or loose images)
    children_url = f"https://graph.microsoft.com/v1.0/drives/{drive_id}/items/{item_id}/children?$select=id,name,size,file,folder,image&$expand=thumbnails&$orderby=name"
    r2 = requests.get(children_url, headers=headers, timeout=30)
    if r2.status_code != 200:
        return func.HttpResponse(
            body=json.dumps({"success": False, "error": f"Could not list items: {r2.status_code}"}),
            status_code=500,
            headers=get_cors_headers(),
        )

    children = r2.json().get("value", [])
    categories = []
    loose_images = []

    for c in children:
        name = c.get("name", "")

        # Subfolder = category
        if c.get("folder"):
            cat_url = f"https://graph.microsoft.com/v1.0/drives/{drive_id}/items/{c['id']}/children?$select=id,name,size,file,image&$expand=thumbnails&$orderby=name&$top=200"
            r3 = requests.get(cat_url, headers=headers, timeout=30)
            if r3.status_code != 200:
                continue
            cat_images = []
            for img in r3.json().get("value", []):
                ext = os.path.splitext(img.get("name", ""))[1].lower()
                if ext not in IMAGE_EXTENSIONS:
                    continue
                image_meta = img.get("image", {})
                # Use thumbnail URL for grid (fast, CDN-cached)
                thumbs = img.get("thumbnails", [])
                thumb_url = ""
                if thumbs:
                    thumb_url = thumbs[0].get("large", {}).get("url", "")
                # Full-size URL via /content redirect
                full_url = get_content_url(drive_id, img["id"], token) if not thumb_url else ""
                cat_images.append({
                    "id": img.get("id", ""),
                    "name": img.get("name", ""),
                    "url": thumb_url or full_url,
                    "thumb": thumb_url,
                    "size": img.get("size", 0),
                    "width": image_meta.get("width", 0),
                    "height": image_meta.get("height", 0),
                    "mime": img.get("file", {}).get("mimeType", ""),
                })
            if cat_images:
                categories.append({"name": name, "images": cat_images, "count": len(cat_images)})
        else:
            # Loose image at root level
            ext = os.path.splitext(name)[1].lower()
            if ext not in IMAGE_EXTENSIONS:
                continue
            image_meta = c.get("image", {})
            thumbs = c.get("thumbnails", [])
            thumb_url = thumbs[0].get("large", {}).get("url", "") if thumbs else ""
            img_url = thumb_url or get_content_url(drive_id, c["id"], token)
            loose_images.append({
                "id": c.get("id", ""),
                "name": name,
                "url": img_url,
                "thumb": thumb_url,
                "size": c.get("size", 0),
                "width": image_meta.get("width", 0),
                "height": image_meta.get("height", 0),
                "mime": c.get("file", {}).get("mimeType", ""),
            })

    # Add loose images as "Sonstiges" if not already a category
    if loose_images:
        has_sonstiges = any(cat["name"] == "Sonstiges" for cat in categories)
        if has_sonstiges:
            for cat in categories:
                if cat["name"] == "Sonstiges":
                    cat["images"].extend(loose_images)
                    cat["count"] = len(cat["images"])
        else:
            categories.append({"name": "Sonstiges", "images": loose_images, "count": len(loose_images)})

    # Build flat list of all images for backwards compatibility
    all_images = []
    for cat in categories:
        for img in cat["images"]:
            all_images.append({**img, "category": cat["name"]})

    total = sum(cat["count"] for cat in categories)

    return func.HttpResponse(
        body=json.dumps({
            "success": True,
            "categories": categories,
            "images": all_images,
            "count": total,
        }),
        status_code=200,
        headers=get_cors_headers(),
    )
