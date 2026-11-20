"""Inventur-API (/api/inventur) für die Web-App unter /inventur.

Lesen: ``GET ?action=inventories|inventory|articles|article|position``
Schreiben: ``POST {"action": "savePosition"|"saveInventory", ...}``

Jeder Aufruf – auch lesend – verlangt ein gültiges Kiosk-/CMS-Token
(``X-CMS-Auth``), **unabhängig** vom Rollout-Schalter ``CMS_AUTH_ENFORCE``.
Fehlt die Serverkonfiguration, wird abgelehnt statt geöffnet (fail-closed).
"""

import json
import logging
import os
import sys

import azure.functions as func

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from shared.auth import token_valid  # noqa: E402
from shared.inventur_logic import ApiError, InventurService  # noqa: E402

_log = logging.getLogger("inventur")
_HEADERS = {"Cache-Control": "no-store", "X-Content-Type-Options": "nosniff"}
_service = None


def _get_service():
    global _service
    if _service is None:
        from shared.inventur_dv import DataverseRepo
        _service = InventurService(DataverseRepo())
    return _service


def _resp(status, body):
    return func.HttpResponse(json.dumps(body, ensure_ascii=False), status_code=status,
                             mimetype="application/json", headers=_HEADERS)


def handle(req, get_service):
    """Kern ohne Azure-Bindung (für Tests): liefert (status, body)."""
    if not token_valid(req):
        return 401, {"error": "unauthorized", "message": "Bitte anmelden."}
    try:
        service = get_service()
        if req.method == "GET":
            action = req.params.get("action", "")
            if action == "inventories":
                return 200, {"inventories": service.inventories()}
            if action == "inventory":
                return 200, {"inventory": service.inventory(req.params.get("id", ""))}
            if action == "articles":
                return 200, service.search_articles(req.params.get("q", ""), req.params.get("after") or None)
            if action == "article":
                return 200, {"article": service.article_by_barcode(req.params.get("barcode", ""))}
            if action == "position":
                return 200, service.position(req.params.get("inventory", ""), req.params.get("article", ""))
            return 400, {"error": "unknown_action", "message": "Unbekannte Anfrage."}
        try:
            data = req.get_json()
        except ValueError:
            data = None
        if not isinstance(data, dict):
            return 400, {"error": "invalid_body", "message": "Die Anfrage ist ungültig."}
        action = data.get("action")
        if action == "savePosition":
            return 200, service.save_position(data)
        if action == "saveInventory":
            return 200, service.save_inventory(data)
        return 400, {"error": "unknown_action", "message": "Unbekannte Anfrage."}
    except ApiError as err:
        body = {"error": err.code, "message": err.message}
        body.update(err.extra)
        return err.status, body
    except Exception:
        _log.exception("Unerwarteter Fehler in /api/inventur")
        return 500, {"error": "server_error", "message": "Unerwarteter Serverfehler. Es wurde nichts gespeichert."}


def main(req: func.HttpRequest) -> func.HttpResponse:
    if req.method == "OPTIONS":
        return func.HttpResponse(status_code=204, headers=_HEADERS)
    status, body = handle(req, _get_service)
    return _resp(status, body)
