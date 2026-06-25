from pathlib import Path

p = Path('function_app.py')
s = p.read_text(encoding='utf-8')

helper = '''
SP_DRIVE = "b!bwUha0ab4EeiA3xXHK-Oobhv5tJbeYJDiF9pTB-f1kC-Mp-AY0brRrr2WigdYK4A"
SP_FOLDER = "01USAQ6ERA5Q2V5M2I2BCKYOFVH2WWICOC"
SP_BARCODE_FOLDER = "01USAQ6ESD7NCQ4ZM6GRHK5IRCMJMSRSVH"
_graph_msal_app = None

def get_graph_token():
    global _graph_msal_app
    tenant_id = os.environ.get("DV_TENANT_ID", "acfaedd4-c403-43b7-9544-fdb2b150124e")
    client_id = os.environ.get("DV_CLIENT_ID", "137b2df6-be83-459a-ac89-9efd0bdf51c4")
    client_secret = os.environ.get("DV_CLIENT_SECRET", "")
    if not client_secret:
        return None
    if not _graph_msal_app:
        _graph_msal_app = msal.ConfidentialClientApplication(
            client_id,
            authority=f"https://login.microsoftonline.com/{tenant_id}",
            client_credential=client_secret,
        )
    r = _graph_msal_app.acquire_token_for_client(scopes=["https://graph.microsoft.com/.default"])
    return r.get("access_token")

def find_sharepoint_image(token, folder_id, key):
    if not token or not key:
        return None
    headers = {"Authorization": f"Bearer {token}"}
    for ext in ("jpg", "png", "jpeg", "gif"):
        url = f"https://graph.microsoft.com/v1.0/drives/{SP_DRIVE}/items/{folder_id}:/{key}.{ext}"
        r = requests.get(url, headers=headers, timeout=20)
        if r.status_code == 200:
            body = r.json()
            return {
                "name": body.get("name", f"{key}.{ext}"),
                "dl_download_url": body.get("@microsoft.graph.downloadUrl", "")
            }
    return None

def lookup_sharepoint_images(article_infos):
    token = get_graph_token()
    result = []
    for info in article_infos[:20]:
        artnr = (info.get("edeka_nr") or info.get("artikelnummer") or "").strip()
        sc = (info.get("strichcode") or "").strip()
        result_key = sc or artnr
        hit = find_sharepoint_image(token, SP_BARCODE_FOLDER, sc) if sc else None
        if not hit and artnr:
            hit = find_sharepoint_image(token, SP_FOLDER, artnr)
        if hit and hit.get("dl_download_url"):
            result.append({
                "dl_artikelnummer": result_key,
                "dl_download_url": hit["dl_download_url"],
                "source": "sharepoint",
                "name": hit.get("name", "")
            })
    return result
'''

if 'def lookup_sharepoint_images(' not in s:
    s = s.replace('def get_cors_headers():', helper + '\ndef get_cors_headers():')
    print('Inserted SharePoint helper functions')
else:
    print('SharePoint helper functions already present')

old = '''@app.route(route="werbebilder", methods=["GET"])
def werbebilder(req: func.HttpRequest) -> func.HttpResponse:
    artnrs = req.params.get("artnrs", "")
    if not artnrs.strip():
        return create_response([], 200)

    # Fallback-endpoint: liefert bewusst leere Liste, wenn keine verlässliche Bildquelle
    # innerhalb dieses Projekts konfiguriert ist. So bleibt das Frontend stabil.
    return create_response([], 200)
'''

new = '''@app.route(route="werbebilder", methods=["GET", "POST"])
def werbebilder(req: func.HttpRequest) -> func.HttpResponse:
    if req.method == "POST":
        try:
            body = req.get_json()
        except Exception:
            return create_response({"success": False, "error": "Invalid JSON"}, 400)
        article_infos = body.get("articles") or []
        include_sp = (req.params.get("sharepoint") or "").lower() in ("1", "true", "yes")
        if include_sp and article_infos:
            return create_response(lookup_sharepoint_images(article_infos), 200)
        return create_response([], 200)

    artnrs = req.params.get("artnrs", "")
    if not artnrs.strip():
        return create_response([], 200)
    article_infos = [{"artikelnummer": x.strip(), "edeka_nr": x.strip(), "strichcode": ""} for x in artnrs.split(",") if x.strip()]
    include_sp = (req.params.get("sharepoint") or "").lower() in ("1", "true", "yes")
    if include_sp:
        return create_response(lookup_sharepoint_images(article_infos), 200)
    return create_response([], 200)
'''

if old not in s:
    raise SystemExit('ERROR: old werbebilder block not found')

s = s.replace(old, new)
p.write_text(s, encoding='utf-8')
print('Replaced werbebilder route with GET+POST SharePoint lookup')
print('DONE')
