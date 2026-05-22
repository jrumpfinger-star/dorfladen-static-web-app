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
        "Access-Control-Allow-Methods": "GET, POST, PUT, PATCH, DELETE, OPTIONS",
        "Access-Control-Allow-Headers": "*",
        "Access-Control-Max-Age": "86400",
        "Content-Type": "application/json; charset=utf-8",
    }


def resolve_gallery_folder(token):
    """Resolve the sharing link to drive_id and item_id."""
    headers = {"Authorization": f"Bearer {token}", "Accept": "application/json"}
    encoded = base64.urlsafe_b64encode(SHARE_URL.encode()).decode().rstrip("=")
    share_token = f"u!{encoded}"
    r = requests.get(
        f"https://graph.microsoft.com/v1.0/shares/{share_token}/driveItem",
        headers=headers, timeout=30,
    )
    if r.status_code != 200:
        return None, None
    item = r.json()
    return item.get("parentReference", {}).get("driveId", ""), item.get("id", "")


def ensure_category_folder(drive_id, parent_id, category, token):
    """Find or create a category subfolder. Returns folder item id."""
    headers = {"Authorization": f"Bearer {token}", "Accept": "application/json"}
    # Check if folder exists
    url = f"https://graph.microsoft.com/v1.0/drives/{drive_id}/items/{parent_id}/children?$filter=name eq '{category}'&$select=id,name,folder"
    r = requests.get(url, headers=headers, timeout=15)
    if r.status_code == 200:
        for child in r.json().get("value", []):
            if child.get("folder") is not None and child.get("name") == category:
                return child["id"]
    # Create folder
    r2 = requests.post(
        f"https://graph.microsoft.com/v1.0/drives/{drive_id}/items/{parent_id}/children",
        headers={**headers, "Content-Type": "application/json"},
        json={"name": category, "folder": {}, "@microsoft.graph.conflictBehavior": "fail"},
        timeout=15,
    )
    if r2.status_code in (200, 201):
        return r2.json().get("id")
    return None


def handle_upload(req, token):
    """POST: Upload image to SharePoint gallery. Expects multipart/form-data with 'file' and 'category'."""
    try:
        # Parse form data
        files = req.files
        if not files or "file" not in files:
            # Try raw body with JSON metadata
            return func.HttpResponse(
                body=json.dumps({"success": False, "error": "No file provided. Use multipart/form-data with 'file' field."}),
                status_code=400, headers=get_cors_headers(),
            )

        file = files["file"]
        filename = file.filename or "image.jpg"
        content = file.read()

        if not content or len(content) == 0:
            return func.HttpResponse(
                body=json.dumps({"success": False, "error": "Empty file"}),
                status_code=400, headers=get_cors_headers(),
            )

        # Check extension
        ext = os.path.splitext(filename)[1].lower()
        if ext not in IMAGE_EXTENSIONS:
            return func.HttpResponse(
                body=json.dumps({"success": False, "error": f"Invalid file type: {ext}"}),
                status_code=400, headers=get_cors_headers(),
            )

        category = req.form.get("category", "").strip()
        description = req.form.get("description", "").strip()

        drive_id, root_id = resolve_gallery_folder(token)
        if not drive_id:
            return func.HttpResponse(
                body=json.dumps({"success": False, "error": "Could not resolve gallery folder"}),
                status_code=500, headers=get_cors_headers(),
            )

        # Determine upload target folder
        if category:
            target_id = ensure_category_folder(drive_id, root_id, category, token)
            if not target_id:
                return func.HttpResponse(
                    body=json.dumps({"success": False, "error": f"Could not create/find category folder: {category}"}),
                    status_code=500, headers=get_cors_headers(),
                )
        else:
            target_id = root_id

        # Upload file via Graph API
        upload_url = f"https://graph.microsoft.com/v1.0/drives/{drive_id}/items/{target_id}:/{filename}:/content"
        mime = file.content_type or "application/octet-stream"
        r = requests.put(
            upload_url,
            headers={
                "Authorization": f"Bearer {token}",
                "Content-Type": mime,
            },
            data=content,
            timeout=60,
        )

        if r.status_code in (200, 201):
            item = r.json()
            item_id = item.get("id", "")

            # Set description if provided
            if description and item_id:
                requests.patch(
                    f"https://graph.microsoft.com/v1.0/drives/{drive_id}/items/{item_id}",
                    headers={
                        "Authorization": f"Bearer {token}",
                        "Content-Type": "application/json",
                    },
                    json={"description": description},
                    timeout=15,
                )

            return func.HttpResponse(
                body=json.dumps({
                    "success": True,
                    "id": item_id,
                    "name": item.get("name", ""),
                    "size": item.get("size", 0),
                    "category": category or "Sonstiges",
                    "description": description,
                }),
                status_code=200, headers=get_cors_headers(),
            )
        else:
            return func.HttpResponse(
                body=json.dumps({"success": False, "error": f"Upload failed: {r.status_code} {r.text[:200]}"}),
                status_code=500, headers=get_cors_headers(),
            )
    except Exception as e:
        return func.HttpResponse(
            body=json.dumps({"success": False, "error": str(e)}),
            status_code=500, headers=get_cors_headers(),
        )


def handle_delete(req, token):
    """DELETE: Delete image or folder from SharePoint gallery. Expects JSON body with 'id' (driveItem id)."""
    try:
        body = req.get_json()
        item_id = body.get("id", "")
        if not item_id:
            return func.HttpResponse(
                body=json.dumps({"success": False, "error": "Missing 'id' parameter"}),
                status_code=400, headers=get_cors_headers(),
            )

        drive_id, _ = resolve_gallery_folder(token)
        if not drive_id:
            return func.HttpResponse(
                body=json.dumps({"success": False, "error": "Could not resolve gallery folder"}),
                status_code=500, headers=get_cors_headers(),
            )

        delete_url = f"https://graph.microsoft.com/v1.0/drives/{drive_id}/items/{item_id}"
        r = requests.delete(
            delete_url,
            headers={"Authorization": f"Bearer {token}"},
            timeout=15,
        )

        if r.status_code == 204:
            return func.HttpResponse(
                body=json.dumps({"success": True}),
                status_code=200, headers=get_cors_headers(),
            )
        else:
            return func.HttpResponse(
                body=json.dumps({"success": False, "error": f"Delete failed: {r.status_code}"}),
                status_code=500, headers=get_cors_headers(),
            )
    except Exception as e:
        return func.HttpResponse(
            body=json.dumps({"success": False, "error": str(e)}),
            status_code=500, headers=get_cors_headers(),
        )


def handle_put(req, token):
    """PUT: Folder management. Actions: 'create_folder', 'delete_folder'."""
    try:
        body = req.get_json()
        action = body.get("action", "")
        drive_id, root_id = resolve_gallery_folder(token)
        if not drive_id:
            return func.HttpResponse(
                body=json.dumps({"success": False, "error": "Could not resolve gallery folder"}),
                status_code=500, headers=get_cors_headers(),
            )

        if action == "create_folder":
            name = body.get("name", "").strip()
            if not name:
                return func.HttpResponse(
                    body=json.dumps({"success": False, "error": "Missing folder name"}),
                    status_code=400, headers=get_cors_headers(),
                )
            folder_id = ensure_category_folder(drive_id, root_id, name, token)
            if folder_id:
                return func.HttpResponse(
                    body=json.dumps({"success": True, "id": folder_id, "name": name}),
                    status_code=200, headers=get_cors_headers(),
                )
            return func.HttpResponse(
                body=json.dumps({"success": False, "error": "Could not create folder"}),
                status_code=500, headers=get_cors_headers(),
            )

        elif action == "delete_folder":
            folder_id = body.get("id", "")
            if not folder_id:
                return func.HttpResponse(
                    body=json.dumps({"success": False, "error": "Missing folder id"}),
                    status_code=400, headers=get_cors_headers(),
                )
            r = requests.delete(
                f"https://graph.microsoft.com/v1.0/drives/{drive_id}/items/{folder_id}",
                headers={"Authorization": f"Bearer {token}"},
                timeout=15,
            )
            if r.status_code == 204:
                return func.HttpResponse(
                    body=json.dumps({"success": True}),
                    status_code=200, headers=get_cors_headers(),
                )
            return func.HttpResponse(
                body=json.dumps({"success": False, "error": f"Delete folder failed: {r.status_code}"}),
                status_code=500, headers=get_cors_headers(),
            )

        return func.HttpResponse(
            body=json.dumps({"success": False, "error": f"Unknown action: {action}"}),
            status_code=400, headers=get_cors_headers(),
        )
    except Exception as e:
        return func.HttpResponse(
            body=json.dumps({"success": False, "error": str(e)}),
            status_code=500, headers=get_cors_headers(),
        )


def handle_patch(req, token):
    """PATCH: Update image description/subtitle. Expects JSON with 'id' and 'description'."""
    try:
        body = req.get_json()
        item_id = body.get("id", "")
        description = body.get("description", "")
        if not item_id:
            return func.HttpResponse(
                body=json.dumps({"success": False, "error": "Missing 'id' parameter"}),
                status_code=400, headers=get_cors_headers(),
            )

        drive_id, _ = resolve_gallery_folder(token)
        if not drive_id:
            return func.HttpResponse(
                body=json.dumps({"success": False, "error": "Could not resolve gallery folder"}),
                status_code=500, headers=get_cors_headers(),
            )

        patch_url = f"https://graph.microsoft.com/v1.0/drives/{drive_id}/items/{item_id}"
        r = requests.patch(
            patch_url,
            headers={
                "Authorization": f"Bearer {token}",
                "Content-Type": "application/json",
            },
            json={"description": description},
            timeout=15,
        )

        if r.status_code == 200:
            return func.HttpResponse(
                body=json.dumps({"success": True, "description": description}),
                status_code=200, headers=get_cors_headers(),
            )
        else:
            return func.HttpResponse(
                body=json.dumps({"success": False, "error": f"Update failed: {r.status_code} {r.text[:200]}"}),
                status_code=500, headers=get_cors_headers(),
            )
    except Exception as e:
        return func.HttpResponse(
            body=json.dumps({"success": False, "error": str(e)}),
            status_code=500, headers=get_cors_headers(),
        )


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

    # Route POST, PUT, PATCH, DELETE to their handlers
    if req.method == "POST":
        return handle_upload(req, token)
    if req.method == "PUT":
        return handle_put(req, token)
    if req.method == "PATCH":
        return handle_patch(req, token)
    if req.method == "DELETE":
        return handle_delete(req, token)

    # GET: list gallery images
    headers = {
        "Authorization": f"Bearer {token}",
        "Accept": "application/json",
    }

    drive_id, item_id = resolve_gallery_folder(token)
    if not drive_id:
        return func.HttpResponse(
            body=json.dumps({"success": False, "error": "Could not resolve folder"}),
            status_code=500,
            headers=get_cors_headers(),
        )

    # List children (subfolders = categories, or loose images)
    children_url = f"https://graph.microsoft.com/v1.0/drives/{drive_id}/items/{item_id}/children?$select=id,name,size,description,file,folder,image&$expand=thumbnails&$orderby=name"
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
            cat_url = f"https://graph.microsoft.com/v1.0/drives/{drive_id}/items/{c['id']}/children?$select=id,name,size,description,file,image&$expand=thumbnails&$orderby=name&$top=200"
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
                    "description": img.get("description", "") or "",
                    "url": thumb_url or full_url,
                    "thumb": thumb_url,
                    "size": img.get("size", 0),
                    "width": image_meta.get("width", 0),
                    "height": image_meta.get("height", 0),
                    "mime": img.get("file", {}).get("mimeType", ""),
                })
            if cat_images:
                categories.append({"name": name, "id": c["id"], "images": cat_images, "count": len(cat_images)})
            else:
                categories.append({"name": name, "id": c["id"], "images": [], "count": 0})
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
                "description": c.get("description", "") or "",
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
