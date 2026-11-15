"""Privater Blob-Speicher: pro Preview getrennt, Publikationszeiger mit ETag."""

import json
import logging
import os
import re

from azure.core import MatchConditions
from azure.core.exceptions import ResourceExistsError, ResourceModifiedError, ResourceNotFoundError
from azure.storage.blob import BlobServiceClient, ContentSettings

from shared.angebote import AngeboteFehler, kennung


def namespace():
    value = os.environ.get("ANGEBOTE_NAMESPACE", "").strip()
    if not re.fullmatch(r"[a-z0-9][a-z0-9-]{0,62}", value):
        raise AngeboteFehler(503, "Der Angebotsbereich ist für diese Umgebung noch nicht eingerichtet.")
    return value


def scale_enabled():
    return os.environ.get("ANGEBOTE_WAAGE_SEND_ENABLED", "").lower() == "true"


class BlobStore:
    def __init__(self):
        self.namespace = namespace()
        connection = os.environ.get("STORAGE_CONN", "").strip()
        if not connection:
            raise AngeboteFehler(503, "Der Angebotsspeicher ist noch nicht eingerichtet.")
        try:
            self.container = BlobServiceClient.from_connection_string(connection).get_container_client("angebote")
        except ValueError as exc:
            logging.error("[angebote] Ungültige Speicherkonfiguration")
            raise AngeboteFehler(503, "Der Angebotsspeicher ist nicht gültig eingerichtet.") from exc
        self._private()

    def _private(self):
        try:
            if self.container.get_container_properties().get("public_access"):
                logging.error("[angebote] Der Angebotscontainer darf keinen öffentlichen Blob-Zugriff erlauben")
                raise AngeboteFehler(503, "Der Angebotsspeicher ist nicht privat eingerichtet. Bitte die Verwaltung informieren.")
        except ResourceNotFoundError:
            pass

    def _blob(self, path):
        return self.container.get_blob_client(self.namespace + "/" + path)

    def _ensure(self):
        try:
            self.container.create_container()
        except ResourceExistsError:
            self._private()

    def get(self, path):
        try:
            download = self._blob(path).download_blob()
            try:
                data = json.loads(download.readall())
            except (UnicodeDecodeError, json.JSONDecodeError) as exc:
                logging.exception("[angebote] Ungültiges gespeichertes JSON-Dokument")
                raise AngeboteFehler(503, "Ein gespeichertes Angebot konnte nicht gelesen werden.") from exc
            if not isinstance(data, dict):
                logging.error("[angebote] Unerwartete gespeicherte Dokumentstruktur")
                raise AngeboteFehler(503, "Ein gespeichertes Angebot konnte nicht gelesen werden.")
            return data, download.properties.etag
        except ResourceNotFoundError:
            return None, None

    def list(self, prefix):
        try:
            names = list(self.container.list_blobs(name_starts_with=self.namespace + "/" + prefix))
        except ResourceNotFoundError:
            return []
        result = []
        for blob in names:
            doc, _ = self.get(blob.name[len(self.namespace) + 1:])
            if doc is None:
                raise AngeboteFehler(409, "Die Angebotsliste wurde gleichzeitig geändert. Bitte erneut laden.")
            result.append(doc)
        return result

    def _write(self, path, value, etag=None):
        encoded = json.dumps(value, ensure_ascii=False, allow_nan=False).encode("utf-8")
        if len(encoded) > 2 * 1024 * 1024:
            raise AngeboteFehler(413, "Die Gestaltung ist zu umfangreich. Bitte weniger Elemente verwenden.")
        kwargs = {"content_settings": ContentSettings(content_type="application/json; charset=utf-8")}
        if etag:
            kwargs.update(overwrite=True, etag=etag, match_condition=MatchConditions.IfNotModified)
        else:
            self._ensure()
            kwargs["overwrite"] = False
        try:
            self._blob(path).upload_blob(encoded, **kwargs)
        except (ResourceExistsError, ResourceModifiedError) as exc:
            raise AngeboteFehler(409, "Das Angebot wurde gleichzeitig geändert. Bitte neu öffnen.") from exc

    def create(self, path, value):
        self._write(path, value)

    def replace(self, path, value, etag):
        if not etag:
            raise AngeboteFehler(409, "Der gespeicherte Angebotsstand konnte nicht bestätigt werden. Bitte neu laden.")
        self._write(path, value, etag)

    def put_image(self, image_id, data, mime):
        self._ensure()
        self._blob("images/" + kennung(image_id)).upload_blob(
            data, overwrite=False, content_settings=ContentSettings(content_type=mime))

    def get_image(self, image_id):
        try:
            download = self._blob("images/" + kennung(image_id)).download_blob()
            return download.readall(), download.properties.content_settings.content_type
        except ResourceNotFoundError:
            return None
