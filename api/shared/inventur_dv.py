"""Dataverse-Zugriff der Inventur-Web-App.

Nutzt dieselben Tabellen wie die PowerApps-Inventur (Inventuren, Positionen,
Artikelstamm). Der Artikelstamm wird nur gelesen. Zugangsdaten bleiben auf
dem Server (App-Settings ``DV_*``), der Browser sieht sie nie.
"""

import logging
import os
import re
import threading
from urllib.parse import quote

import msal
import requests

from shared.dataverse import get_authority, get_client_id, get_client_secret, get_dataverse_url
from shared.inventur_logic import ApiError, VersionConflict

INVENTORIES = "cr5d4_inventurs"
DETAILS = "cr5d4_inventurdetailses"  # ungewöhnlicher Plural – exakt so verwenden
ARTICLES = "cr5d4_tables"

INV_SELECT = "cr5d4_inventurid,cr5d4_inventur1,cr5d4_jahr,cr5d4_startdatum,cr5d4_status,modifiedon"
DET_SELECT = ("cr5d4_inventurdetailsid,cr5d4_newcolumn,cr5d4_menge,cr5d4_ekpreis,cr5d4_mengenerfassung,"
              "_cr5d4_inventur_value,_cr5d4_artikelstamm_value,modifiedon")
PROG_POS_SELECT = ("cr5d4_inventurdetailsid,cr5d4_menge,cr5d4_ekpreis,cr5d4_mengenerfassung,"
                   "cr5d4_artikelnummer,_cr5d4_artikelstamm_value,modifiedon")
PROG_ART_SELECT = ("cr5d4_tableid,cr5d4_bezeichnungtotal,cr5d4_artikelbezeichnung,"
                   "cr5d4_warengruppebez,cr5d4_mengenerfassung")
ART_SELECT = ("cr5d4_tableid,cr5d4_bezeichnungtotal,cr5d4_artikelbezeichnung,cr5d4_strichcode,"
              "cr5d4_artikelstrichcode,cr5d4_search,cr5d4_vk_dorf,cr5d4_letzterek,cr5d4_mwstkz,"
              "cr5d4_mengenerfassung")

_log = logging.getLogger("inventur")
_app_lock = threading.Lock()
_app = None


def odata_string(value):
    """Wert für ein OData-Stringliteral (Hochkomma verdoppeln)."""
    return "'" + str(value).replace("'", "''") + "'"


_SAFE = "(),'/"


def _query(params):
    return "&".join(k + "=" + quote(str(v), safe=_SAFE) for k, v in params.items())


def _token():
    global _app
    base = get_dataverse_url().rstrip("/")
    with _app_lock:
        if _app is None:
            secret = get_client_secret()
            if not secret:
                raise ApiError(503, "not_configured", "Die Datenanbindung ist auf dem Server nicht eingerichtet.")
            _app = msal.ConfidentialClientApplication(
                get_client_id(), authority=get_authority(), client_credential=secret)
        result = _app.acquire_token_for_client(scopes=[f"{base}/.default"])
    token = result.get("access_token")
    if not token:
        _log.error("Dataverse-Token nicht erhalten: %s", result.get("error"))
        raise ApiError(502, "dataverse_auth", "Die Anmeldung bei Dataverse ist fehlgeschlagen.")
    return token


def _version(raw):
    etag = raw.get("@odata.etag")
    if etag:
        return etag
    # Ohne ETag (Optimistic Concurrency aus): Änderungszeit + Menge als Näherung.
    return f"m:{raw.get('modifiedon')}|{raw.get('cr5d4_menge')}"


class DataverseRepo:
    def __init__(self):
        self.base = get_dataverse_url().rstrip("/") + "/api/data/v9.2/"

    def _request(self, method, path, params=None, body=None, headers=None, mutating=False):
        url = self.base + path + (("?" + _query(params)) if params else "")
        head = {
            "Authorization": f"Bearer {_token()}",
            "OData-MaxVersion": "4.0", "OData-Version": "4.0", "Accept": "application/json",
            "Content-Type": "application/json; charset=utf-8",
        }
        head.update(headers or {})
        try:
            resp = requests.request(method, url, headers=head, json=body, timeout=(5, 25))
        except requests.ConnectTimeout:
            raise ApiError(502, "load_failed", "Dataverse ist gerade nicht erreichbar. Es wurde nichts gespeichert.")
        except requests.RequestException as exc:
            _log.warning("Dataverse-Aufruf %s %s fehlgeschlagen: %s", method, path, type(exc).__name__)
            if mutating:
                raise ApiError(504, "outcome_unknown",
                               "Die Verbindung wurde unterbrochen. Ob gespeichert wurde, ist unklar.",
                               outcome="unknown")
            raise ApiError(502, "load_failed", "Dataverse ist gerade nicht erreichbar.")
        return resp

    def _get(self, path, params=None):
        resp = self._request("GET", path, params)
        if resp.status_code != 200:
            _log.warning("Dataverse GET %s -> %s", path, resp.status_code)
            raise ApiError(502, "load_failed", "Die Daten konnten nicht geladen werden.")
        return resp.json()

    def _get_all(self, path, params, limit=2000):
        rows, url = [], None
        data = self._get(path, params)
        while True:
            rows.extend(data.get("value", []))
            url = data.get("@odata.nextLink")
            if not url or len(rows) >= limit:
                return rows
            resp = requests.get(url, headers={"Authorization": f"Bearer {_token()}", "Accept": "application/json",
                                              "OData-MaxVersion": "4.0", "OData-Version": "4.0"}, timeout=(5, 25))
            if resp.status_code != 200:
                raise ApiError(502, "load_failed", "Die Daten konnten nicht geladen werden.")
            data = resp.json()

    def _write_failed(self, resp, what):
        _log.warning("Dataverse-Schreibfehler (%s): %s", what, resp.status_code)
        if resp.status_code == 412:
            raise VersionConflict()
        raise ApiError(502, "write_failed", "Dataverse hat das Speichern abgelehnt. Es wurde nichts gespeichert.")

    # ---------- Normalisierung ----------
    @staticmethod
    def _inv(raw):
        return {"id": raw["cr5d4_inventurid"], "name": raw.get("cr5d4_inventur1") or "",
                "year": raw.get("cr5d4_jahr"), "date": raw.get("cr5d4_startdatum"),
                "status": raw.get("cr5d4_status"), "version": _version(raw)}

    @staticmethod
    def _pos(raw):
        ek = raw.get("cr5d4_ekpreis")
        return {"id": raw["cr5d4_inventurdetailsid"], "key": raw.get("cr5d4_newcolumn"),
                "quantity": raw.get("cr5d4_menge"), "ek": float(ek) if ek is not None else None,
                "unit": raw.get("cr5d4_mengenerfassung"), "inventoryId": raw.get("_cr5d4_inventur_value"),
                "articleId": raw.get("_cr5d4_artikelstamm_value"), "version": _version(raw)}

    @staticmethod
    def _art(raw):
        name = raw.get("cr5d4_bezeichnungtotal") or raw.get("cr5d4_artikelbezeichnung") or ""
        return {"id": raw["cr5d4_tableid"], "name": name, "code": raw.get("cr5d4_strichcode"),
                "articleCode": raw.get("cr5d4_artikelstrichcode"), "search": raw.get("cr5d4_search"),
                "vk": raw.get("cr5d4_vk_dorf"), "lastEk": raw.get("cr5d4_letzterek"),
                "tax": raw.get("cr5d4_mwstkz"), "unit": raw.get("cr5d4_mengenerfassung")}

    # ---------- Fortschritt (nur lesen) ----------
    def progress_positions(self, inventory_id):
        flt = f"_cr5d4_inventur_value eq {inventory_id}"
        rows = self._get_all(DETAILS, {"$select": PROG_POS_SELECT, "$filter": flt,
                                       "$orderby": "modifiedon desc"}, limit=10000)
        return [{"quantity": r.get("cr5d4_menge"), "ek": r.get("cr5d4_ekpreis"),
                 "articleId": r.get("_cr5d4_artikelstamm_value"), "articleNumber": r.get("cr5d4_artikelnummer"),
                 "at": r.get("modifiedon")} for r in rows]

    def progress_articles(self):
        rows = self._get_all(ARTICLES, {"$select": PROG_ART_SELECT, "$filter": "statecode eq 0"}, limit=20000)
        return [{"id": r["cr5d4_tableid"],
                 "name": r.get("cr5d4_bezeichnungtotal") or r.get("cr5d4_artikelbezeichnung") or "",
                 "warengruppe": (r.get("cr5d4_warengruppebez") or "").strip(),
                 "unit": r.get("cr5d4_mengenerfassung")} for r in rows]

    # ---------- Inventuren ----------
    def list_inventories(self):
        rows = self._get_all(INVENTORIES, {"$select": INV_SELECT, "$orderby": "cr5d4_startdatum desc"})
        return [self._inv(r) for r in rows]

    def get_inventory(self, inventory_id):
        resp = self._request("GET", f"{INVENTORIES}({inventory_id})", {"$select": INV_SELECT})
        if resp.status_code == 404:
            return None
        if resp.status_code != 200:
            raise ApiError(502, "load_failed", "Die Inventur konnte nicht geladen werden.")
        return self._inv(resp.json())

    def inventory_name_exists(self, name, exclude_id):
        flt = f"cr5d4_inventur1 eq {odata_string(name)}"
        rows = self._get(INVENTORIES, {"$select": "cr5d4_inventurid", "$filter": flt, "$top": "5"})["value"]
        return any(r["cr5d4_inventurid"].lower() != (exclude_id or "").lower() for r in rows)

    def inventory_has_positions(self, inventory_id, name):
        flt = (f"_cr5d4_inventur_value eq {inventory_id} or "
               f"startswith(cr5d4_newcolumn,{odata_string(name + '-')})")
        rows = self._get(DETAILS, {"$select": "cr5d4_inventurdetailsid", "$filter": flt, "$top": "1"})["value"]
        return bool(rows)

    def create_inventory(self, values):
        resp = self._request("POST", INVENTORIES, {"$select": INV_SELECT}, self._inv_body(values),
                             {"Prefer": "return=representation"}, mutating=True)
        if resp.status_code not in (200, 201):
            self._write_failed(resp, "create inventory")
        return self._inv(resp.json())

    def update_inventory(self, inventory_id, changes, version):
        headers = {"Prefer": "return=representation", "If-Match": self._if_match(version)}
        resp = self._request("PATCH", f"{INVENTORIES}({inventory_id})", {"$select": INV_SELECT},
                             self._inv_body(changes), headers, mutating=True)
        if resp.status_code != 200:
            self._write_failed(resp, "update inventory")
        return self._inv(resp.json())

    @staticmethod
    def _inv_body(values):
        body = {}
        for field, column in (("name", "cr5d4_inventur1"), ("year", "cr5d4_jahr"),
                              ("date", "cr5d4_startdatum"), ("status", "cr5d4_status")):
            if field in values:
                body[column] = values[field]
        return body

    @staticmethod
    def _if_match(version):
        return version if version and version.startswith(('W/"', '"')) else "*"

    # ---------- Artikel (nur lesen) ----------
    def search_articles(self, term, after, limit):
        parts = ["statecode eq 0"]
        if term:
            parts.append(f"contains(cr5d4_search,{odata_string(term)})")
        if after:
            parts.append(f"cr5d4_search gt {odata_string(after)}")
        rows = self._get(ARTICLES, {"$select": ART_SELECT, "$filter": " and ".join(parts),
                                    "$orderby": "cr5d4_search asc", "$top": str(limit)})["value"]
        return [self._art(r) for r in rows]

    def find_articles_by_barcode(self, barcode):
        flt = f"statecode eq 0 and cr5d4_strichcode eq {odata_string(barcode)}"
        rows = self._get(ARTICLES, {"$select": ART_SELECT, "$filter": flt, "$top": "2"})["value"]
        return [self._art(r) for r in rows]

    def get_article(self, article_id):
        resp = self._request("GET", f"{ARTICLES}({article_id})", {"$select": ART_SELECT})
        if resp.status_code == 404:
            return None
        if resp.status_code != 200:
            raise ApiError(502, "load_failed", "Der Artikel konnte nicht geladen werden.")
        return self._art(resp.json())

    # ---------- Positionen ----------
    def find_positions(self, key):
        flt = f"cr5d4_newcolumn eq {odata_string(key)}"
        rows = self._get(DETAILS, {"$select": DET_SELECT, "$filter": flt, "$top": "3"})["value"]
        return [self._pos(r) for r in rows]

    def create_position(self, inventory_id, article_id, key, article_number, unit, quantity, ek):
        body = {
            "cr5d4_newcolumn": key, "cr5d4_artikelnummer": article_number,
            "cr5d4_mengenerfassung": unit, "cr5d4_menge": quantity, "cr5d4_ekpreis": ek,
            "cr5d4_Inventur@odata.bind": f"/{INVENTORIES}({inventory_id})",
            "cr5d4_ArtikelStamm@odata.bind": f"/{ARTICLES}({article_id})",
        }
        resp = self._request("POST", DETAILS, {"$select": DET_SELECT}, body,
                             {"Prefer": "return=representation"}, mutating=True)
        if resp.status_code not in (200, 201):
            self._write_failed(resp, "create position")
        return self._pos(resp.json())

    def update_position(self, position_id, quantity, version):
        headers = {"Prefer": "return=representation", "If-Match": self._if_match(version)}
        resp = self._request("PATCH", f"{DETAILS}({position_id})", {"$select": DET_SELECT},
                             {"cr5d4_menge": quantity}, headers, mutating=True)
        if resp.status_code != 200:
            self._write_failed(resp, "update position")
        return self._pos(resp.json())

    def delete_position(self, position_id):
        """Nur für die Rücknahme einer EIGENEN, eben angelegten Position."""
        resp = self._request("DELETE", f"{DETAILS}({position_id})", mutating=True)
        if resp.status_code not in (200, 204, 404):
            _log.error("Rücknahme der Position %s fehlgeschlagen: %s", position_id, resp.status_code)
            raise ApiError(500, "rollback_failed",
                           "Eine doppelte Position konnte nicht automatisch entfernt werden. "
                           "Bitte beim Administrator melden.")
