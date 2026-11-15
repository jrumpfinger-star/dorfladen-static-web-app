"""Gemeinsame HTTP-Grenze fuer Angebotsverwaltung, Kundenfassung und Bilder."""

import io
import json
import logging
import os
import uuid

import azure.functions as func
from azure.core.exceptions import AzureError
from PIL import Image, UnidentifiedImageError

from shared.auth import token_valid
from shared.angebote import AngeboteFehler, AngeboteService, kennung, scale_scope
from shared.angebote_store import BlobStore, namespace, scale_enabled

CORS = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, PUT, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, X-CMS-Auth",
    "Cache-Control": "no-store",
}


def response(data, status=200):
    return func.HttpResponse(json.dumps(data, ensure_ascii=False, allow_nan=False),
                             status_code=status, mimetype="application/json", headers=CORS)


def config():
    return {"namespace": namespace(), "scale_scope": scale_scope(namespace()),
            "scale_enabled": scale_enabled()}


def _image_upload(req, store):
    raw = req.get_body()
    if not raw or len(raw) > 8 * 1024 * 1024:
        raise AngeboteFehler(413, "Bitte ein Bild mit höchstens 8 MB wählen.")
    try:
        with Image.open(io.BytesIO(raw)) as image:
            if image.format not in ("JPEG", "PNG", "WEBP") or image.width * image.height > 20000000:
                raise AngeboteFehler(415, "Bitte ein JPEG-, PNG- oder WebP-Bild mit höchstens 20 Megapixeln wählen.")
            from PIL import ImageOps
            image = ImageOps.exif_transpose(image)
            image.thumbnail((1800, 1800))
            transparent = image.mode in ("RGBA", "LA") or "transparency" in image.info
            output = io.BytesIO()
            if transparent:
                image.convert("RGBA").save(output, "PNG", optimize=True)
                mime = "image/png"
            else:
                image.convert("RGB").save(output, "JPEG", quality=90, optimize=True)
                mime = "image/jpeg"
    except (UnidentifiedImageError, OSError, Image.DecompressionBombError) as exc:
        raise AngeboteFehler(415, "Dieses Bild konnte nicht gelesen werden. Bitte ein anderes Bild wählen.") from exc
    image_id = uuid.uuid4().hex
    store.put_image(image_id, output.getvalue(), mime)
    return response({"success": True, "image_id": image_id}, 201)


def handle(req, area, store_factory=BlobStore):
    if req.method == "OPTIONS":
        return func.HttpResponse(status_code=204, headers=CORS)
    try:
        authenticated = token_valid(req)
        if area == "admin" or (area == "images" and req.method != "GET"):
            if not os.environ.get("CMS_AUTH_TOKEN", "").strip():
                raise AngeboteFehler(503, "Die Angebotsanmeldung ist noch nicht eingerichtet.")
            if not authenticated:
                raise AngeboteFehler(401, "Bitte zuerst mit dem CMS-Passwort anmelden.")
        store = store_factory()
        service = AngeboteService(store)
        action_id = req.route_params.get("id")
        if area == "public":
            if req.method != "GET":
                raise AngeboteFehler(405, "Diese Aktion ist hier nicht möglich.")
            return response({"success": True, "actions": service.public()})
        if area == "images":
            if req.method == "POST" and not action_id:
                return _image_upload(req, store)
            if req.method != "GET" or not action_id:
                raise AngeboteFehler(405, "Diese Bildaktion ist hier nicht möglich.")
            kennung(action_id)
            if not authenticated and not service.image_public(action_id):
                raise AngeboteFehler(404, "Dieses Bild ist nicht verfügbar.")
            image = store.get_image(action_id)
            if image is None:
                raise AngeboteFehler(404, "Dieses Bild ist nicht verfügbar.")
            return func.HttpResponse(image[0], mimetype=image[1], headers=CORS)
        design_view = req.params.get("view") == "design" and not action_id
        if req.method == "GET":
            if design_view:
                return response({"success": True, "design": service.design(), "config": config()})
            if action_id:
                return response({"success": True, "action": service.get(action_id), "config": config()})
            return response({"success": True, "actions": service.list(), "config": config()})
        if req.method not in ("POST", "PUT"):
            raise AngeboteFehler(405, "Diese Aktion ist hier nicht möglich.")
        try:
            body = req.get_json()
        except ValueError as exc:
            raise AngeboteFehler(400, "Die Angaben konnten nicht gelesen werden.") from exc
        if not isinstance(body, dict):
            raise AngeboteFehler(400, "Bitte die Angebotsangaben prüfen.")
        op = req.params.get("action")
        if req.method == "PUT" and design_view:
            return response({"success": True, "design": service.save_design(body.get("version"), body.get("data"))})
        if req.method == "POST" and not action_id and not op:
            head = service.create(body.get("data"))
        elif req.method == "PUT" and action_id and not op:
            head = service.save(action_id, body.get("version"), body.get("data"))
        elif req.method == "POST" and action_id and op == "publish":
            head = service.publish(action_id, body.get("version"))
        elif req.method == "POST" and action_id and op == "duplicate":
            head = service.duplicate(action_id)
        elif req.method == "POST" and action_id and op == "delete":
            service.delete(action_id, body.get("version"))
            return response({"success": True})
        else:
            raise AngeboteFehler(405, "Diese Aktion ist hier nicht möglich.")
        return response({"success": True, "action": head, "config": config()})
    except AngeboteFehler as exc:
        return response({"success": False, "error": exc.text}, exc.status)
    except AzureError:
        logging.exception("[angebote] Speicherzugriff fehlgeschlagen")
        return response({"success": False, "error": "Die Angebote konnten nicht geladen oder gespeichert werden. Bitte später erneut versuchen."}, 503)
