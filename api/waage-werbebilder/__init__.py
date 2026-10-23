"""Kiosk-Werbebilder der PC-Waage (Spec kiosk-werbebilder-upload, F17/F18).

GET/POST/DELETE ?art=&name=   Kiosk: Liste, Bild, Hochladen, Loeschen
GET  ?bruecke=sync            Bruecke: Sollvorgabe
POST ?bruecke=bericht         Bruecke: Zustandsbericht

Die Logik steht in shared/waage.py; hier nur Auth, CORS und die Azure-Typen.
"""

import json
import logging

import azure.functions as func

from shared import waage
from shared.auth import admin_auth_guard

CORS = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, X-CMS-Auth",
    "Access-Control-Max-Age": "86400",
    # Bilder werden ausgetauscht; ein alter Browser-Vorrat liesse das alte Bild stehen.
    "Cache-Control": "no-store",
}


def _fehler(status, text):
    return status, "application/json; charset=utf-8", json.dumps(
        {"success": False, "error": text}, ensure_ascii=False).encode("utf-8")


def main(req: func.HttpRequest) -> func.HttpResponse:
    if req.method == "OPTIONS":
        return func.HttpResponse(status_code=204, headers=CORS)

    gesperrt = admin_auth_guard(req)
    if gesperrt is not None:
        return gesperrt

    try:
        status, typ, daten = waage.verarbeite(
            req.method, dict(req.params), req.get_body(),
            waage.GraphSpeicher(), waage.TabellenStatus())
    except waage.WaageFehler as e:
        status, typ, daten = _fehler(e.status, e.text)
    except Exception:
        logging.exception("[waage-werbebilder] Fehler")
        status, typ, daten = _fehler(500, "Interner Fehler")
    return func.HttpResponse(body=daten, status_code=status, mimetype=typ.split(";")[0], headers=CORS)
