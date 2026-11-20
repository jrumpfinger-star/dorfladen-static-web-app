"""Unit-Tests für die Inventur-Web-App (api/shared/inventur_logic.py, api/inventur).

Läuft ohne Azure und ohne Dataverse: azure.functions wird gemockt, das
Repository durch eine Attrappe ersetzt. Es werden NIE echte Daten gelesen
oder geschrieben.
Ausführen:  python tests/test_inventur.py   (oder: python -m pytest tests/test_inventur.py)
"""
import copy
import os
import sys
import types

_azure = types.ModuleType("azure")
_functions = types.ModuleType("azure.functions")


class HttpResponse:
    def __init__(self, body="", status_code=200, mimetype=None, headers=None):
        self.body = body
        self.status_code = status_code
        self.mimetype = mimetype
        self.headers = headers or {}


_functions.HttpResponse = HttpResponse
_functions.HttpRequest = object
_azure.functions = _functions
sys.modules.setdefault("azure", _azure)
sys.modules["azure.functions"] = _functions

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "api"))
from shared import inventur_logic as logic  # noqa: E402
from shared.inventur_logic import ApiError, InventurService, VersionConflict  # noqa: E402
import inventur as api  # noqa: E402

INV = "11111111-1111-1111-1111-111111111111"
INV2 = "22222222-2222-2222-2222-222222222222"
ART = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa"
ART2 = "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb"


class FakeRepo:
    def __init__(self):
        self.inventories = {
            INV: {"id": INV, "name": "Ladeninventur", "year": "2026", "date": "2026-11-20T08:30:00Z",
                  "status": 769580001, "version": "v1"},
            INV2: {"id": INV2, "name": "Alt", "year": "2025", "date": "2025-12-31", "status": 769580002,
                   "version": "v1"},
        }
        self.articles = {
            ART: {"id": ART, "name": "Milch", "code": "0900", "articleCode": "0900", "search": "Milch-0900",
                  "vk": 1.79, "lastEk": 1.12, "tax": 9, "unit": "0"},
            ART2: {"id": ART2, "name": "Brot", "code": "4500", "articleCode": "4500", "search": "Brot-4500",
                   "vk": 4.5, "lastEk": 0, "tax": 9, "unit": "3"},
        }
        self.positions = {}
        self.counter = 0
        self.writes = []
        self.on_create = None
        self.conflict_next_update = False

    # Inventuren
    def list_inventories(self):
        return copy.deepcopy(list(self.inventories.values()))

    def get_inventory(self, inventory_id):
        return copy.deepcopy(self.inventories.get(inventory_id))

    def inventory_name_exists(self, name, exclude_id):
        return any(i["name"] == name and i["id"] != exclude_id for i in self.inventories.values())

    def inventory_has_positions(self, inventory_id, name):
        return any(p["inventoryId"] == inventory_id or (p["key"] or "").startswith(name + "-")
                   for p in self.positions.values())

    def create_inventory(self, values):
        new_id = "33333333-3333-3333-3333-33333333333%d" % len(self.inventories)
        inv = {"id": new_id, "version": "v1", **values}
        self.inventories[new_id] = inv
        self.writes.append(("create_inventory", values))
        return copy.deepcopy(inv)

    def update_inventory(self, inventory_id, changes, version):
        inv = self.inventories[inventory_id]
        if version is not None and version != inv["version"]:
            raise VersionConflict()
        inv.update(changes)
        inv["version"] = "v" + str(int(inv["version"][1:]) + 1)
        self.writes.append(("update_inventory", changes))
        return copy.deepcopy(inv)

    # Artikel
    def search_articles(self, term, after, limit):
        rows = sorted(self.articles.values(), key=lambda a: a["search"])
        rows = [a for a in rows if term.lower() in a["search"].lower() and (not after or a["search"] > after)]
        return copy.deepcopy(rows[:limit])

    def find_articles_by_barcode(self, barcode):
        return copy.deepcopy([a for a in self.articles.values() if a["code"] == barcode][:2])

    def get_article(self, article_id):
        return copy.deepcopy(self.articles.get(article_id))

    # Positionen
    def find_positions(self, key):
        return copy.deepcopy([p for p in self.positions.values() if p["key"] == key][:3])

    def _add(self, key, inv, art, qty, ek, unit):
        self.counter += 1
        pos = {"id": "99999999-9999-9999-9999-%012d" % self.counter, "key": key, "quantity": qty, "ek": ek,
               "unit": unit, "inventoryId": inv, "articleId": art, "version": "p1"}
        self.positions[pos["id"]] = pos
        return pos

    def create_position(self, inventory_id, article_id, key, article_number, unit, quantity, ek):
        self.writes.append(("create_position", key, quantity, ek))
        pos = self._add(key, inventory_id, article_id, quantity, ek, unit)
        if self.on_create:
            self.on_create(self, key)
        return copy.deepcopy(pos)

    def update_position(self, position_id, quantity, version):
        pos = self.positions[position_id]
        if self.conflict_next_update or version != pos["version"]:
            self.conflict_next_update = False
            raise VersionConflict()
        pos["quantity"] = quantity
        pos["version"] = "p" + str(int(pos["version"][1:]) + 1)
        self.writes.append(("update_position", position_id, quantity))
        return copy.deepcopy(pos)

    def delete_position(self, position_id):
        self.writes.append(("delete_position", position_id))
        self.positions.pop(position_id, None)

    # Fortschritt
    def progress_positions(self, inventory_id):
        rows = [p for p in self.positions.values() if p["inventoryId"] == inventory_id]
        rows.sort(key=lambda p: p.get("at") or "", reverse=True)
        return [{"quantity": p["quantity"], "ek": p["ek"], "articleId": p["articleId"],
                 "articleNumber": None, "at": p.get("at")} for p in rows]

    def progress_articles(self):
        return [{"id": a["id"], "name": a["name"], "warengruppe": a.get("warengruppe") or "",
                 "unit": a["unit"]} for a in self.articles.values()]


def _service():
    repo = FakeRepo()
    return repo, InventurService(repo)


def _expect(code, status, fn, *args, **kwargs):
    try:
        fn(*args, **kwargs)
    except ApiError as err:
        assert err.code == code and err.status == status, (err.code, err.status)
        return err
    raise AssertionError("ApiError %s erwartet" % code)


def _save(service, **kw):
    data = {"inventoryId": INV, "articleId": ART, "quantity": None, "plus": None, "baseVersion": None}
    data.update(kw)
    return service.save_position(data)


# ---------- Berechnung ----------
def test_ek_vorschlag():
    assert logic.ek_suggestion({"lastEk": 1.12, "vk": 1.79, "tax": 9}) == 1.12
    assert logic.ek_suggestion({"lastEk": 0, "vk": 4.5, "tax": 9}) == 2.82  # 4,5 / 1,07 * 0,67
    assert logic.ek_suggestion({"lastEk": 0, "vk": 3.49, "tax": 1}) == 1.96  # 3,49 / 1,19 * 0,67
    assert logic.ek_suggestion({"lastEk": None, "vk": None, "tax": 9}) == 0.0


def test_menge_plus_regeln():
    assert logic.compute_total(5, None) == 5
    assert logic.compute_total(None, None) is None
    assert logic.compute_total(None, 3) == 3
    assert logic.compute_total(5, -7) == -2
    assert logic.compute_total(0, 0) == 0
    for bad in (1.5, "5", True):
        _expect("invalid_number", 400, logic.compute_total, bad, None)
    _expect("out_of_range", 400, logic.compute_total, 2147483647, 1)
    _expect("out_of_range", 400, logic.compute_total, 2147483648, None)


# ---------- Positionen ----------
def test_neue_position_mit_originalschluessel_und_ek():
    repo, svc = _service()
    result = _save(svc, quantity=4)
    assert result["position"]["quantity"] == 4
    assert repo.writes == [("create_position", "Ladeninventur-0900", 4, 1.12)]
    again = svc.position(INV, ART)
    assert again["position"]["id"] == result["position"]["id"]


def test_bestehende_position_behaelt_ek_und_plus_addiert_zur_basis():
    repo, svc = _service()
    first = _save(svc, quantity=10)["position"]
    updated = _save(svc, quantity=10, plus=5, baseVersion=first["version"])["position"]
    assert updated["quantity"] == 15
    assert updated["ek"] == 1.12
    assert [w[0] for w in repo.writes] == ["create_position", "update_position"]


def test_wiederholte_buchung_wirkt_nur_einmal():
    repo, svc = _service()
    first = _save(svc, quantity=10)["position"]
    _save(svc, quantity=10, plus=5, baseVersion=first["version"])
    err = _expect("conflict", 409, _save, svc, **{"quantity": 10, "plus": 5, "baseVersion": first["version"]})
    assert err.extra["current"]["quantity"] == 15
    assert [w[0] for w in repo.writes].count("update_position") == 1


def test_veralteter_stand_schreibt_nichts():
    repo, svc = _service()
    first = _save(svc, quantity=1)["position"]
    next(iter(repo.positions.values()))["version"] = "fremd"
    repo.writes.clear()
    _expect("conflict", 409, _save, svc, **{"quantity": 2, "baseVersion": first["version"]})
    assert repo.writes == []


def test_dataverse_ablehnung_wird_als_konflikt_gemeldet():
    repo, svc = _service()
    first = _save(svc, quantity=1)["position"]
    repo.conflict_next_update = True
    _expect("conflict", 409, _save, svc, **{"quantity": 2, "baseVersion": first["version"]})


def test_neu_geladen_aber_inzwischen_vorhanden_ist_konflikt():
    repo, svc = _service()
    _save(svc, quantity=1)
    repo.writes.clear()
    _expect("conflict", 409, _save, svc, **{"quantity": 9, "baseVersion": None})
    assert repo.writes == []


def test_doppelte_position_blockiert_lesen_und_schreiben():
    repo, svc = _service()
    repo._add("Ladeninventur-0900", INV, ART, 1, 1.0, "0")
    repo._add("Ladeninventur-0900", INV, ART, 2, 1.0, "0")
    _expect("duplicate_position", 409, svc.position, INV, ART)
    _expect("duplicate_position", 409, _save, svc, **{"quantity": 3, "baseVersion": "p1"})
    assert repo.writes == []


def test_falsche_referenz_blockiert():
    repo, svc = _service()
    repo._add("Ladeninventur-0900", INV2, ART, 1, 1.0, "0")
    _expect("reference_mismatch", 409, _save, svc, **{"quantity": 3, "baseVersion": "p1"})
    assert repo.writes == []


def test_gleichzeitige_erstanlage_wird_zurueckgenommen():
    repo, svc = _service()
    repo.on_create = lambda r, key: r._add(key, INV, ART, 7, 1.0, "0")
    _expect("conflict", 409, _save, svc, **{"quantity": 3})
    assert len(repo.positions) == 1
    assert next(iter(repo.positions.values()))["quantity"] == 7


def test_umbenennung_waehrend_erstanlage_wird_zurueckgenommen():
    repo, svc = _service()
    repo.on_create = lambda r, key: r.inventories[INV].update(name="Neu")
    _expect("conflict", 409, _save, svc, **{"quantity": 3})
    assert repo.positions == {}


def test_inaktive_inventur_und_ungueltige_artikel():
    repo, svc = _service()
    _expect("inventory_not_active", 409, _save, svc, **{"inventoryId": INV2, "quantity": 1})
    repo.articles[ART]["unit"] = "8"
    _expect("unit_unsupported", 422, _save, svc, **{"quantity": 1})
    repo.articles[ART]["unit"] = "0"
    repo.articles[ART]["articleCode"] = ""
    _expect("unit_unsupported", 422, _save, svc, **{"quantity": 1})
    _expect("invalid_inventory", 400, _save, svc, **{"inventoryId": "x"})
    _expect("article_not_found", 404, _save, svc, **{"articleId": "cccccccc-cccc-cccc-cccc-cccccccccccc"})
    assert repo.writes == []


def test_zu_langer_schluessel_wird_nicht_gekuerzt():
    repo, svc = _service()
    repo.inventories[INV]["name"] = "x" * 847
    _expect("key_too_long", 422, _save, svc, **{"quantity": 1})
    assert repo.writes == []


def test_gramm_artikel_und_leere_menge():
    repo, svc = _service()
    result = _save(svc, articleId=ART2, quantity=None)
    assert result["position"]["quantity"] is None
    assert repo.writes[0][3] == 2.82


# ---------- Artikel ----------
def test_barcode_fuehrende_nullen_und_mehrdeutigkeit():
    repo, svc = _service()
    assert svc.article_by_barcode("0900")["id"] == ART
    _expect("article_not_found", 404, svc.article_by_barcode, "9999")
    repo.articles[ART2]["code"] = "0900"
    _expect("article_ambiguous", 409, svc.article_by_barcode, "0900")


def test_suche_paginiert_ueber_cursor():
    repo, svc = _service()
    repo.articles = {}
    for i in range(60):
        aid = "aaaaaaaa-aaaa-aaaa-aaaa-%012d" % i
        repo.articles[aid] = {"id": aid, "name": "A%02d" % i, "code": str(i), "articleCode": str(i),
                              "search": "A%02d" % i, "vk": 1, "lastEk": 1, "tax": 9, "unit": "0"}
    page1 = svc.search_articles("")
    assert len(page1["articles"]) == 50 and page1["hasMore"] and page1["after"] == "A49"
    page2 = svc.search_articles("", page1["after"])
    assert len(page2["articles"]) == 10 and not page2["hasMore"]


# ---------- Inventuren ----------
def _inv_data(**kw):
    data = {"id": INV, "name": "Ladeninventur", "year": "2026", "date": "2026-11-20", "status": "aktiv",
            "baseVersion": "v1"}
    data.update(kw)
    return data


def test_inventur_neu_anlegen_und_validieren():
    repo, svc = _service()
    created = svc.save_inventory({"name": "Neu", "year": "2027", "date": "2027-01-02", "status": "geplant"})
    assert created["inventory"]["status"] == "geplant"
    _expect("name_required", 400, svc.save_inventory, {"name": "  "})
    _expect("name_too_long", 400, svc.save_inventory, {"name": "x" * 851})
    _expect("year_too_long", 400, svc.save_inventory, {"name": "a", "year": "y" * 4001})
    _expect("invalid_status", 400, svc.save_inventory, {"name": "a", "status": "kaputt"})
    _expect("invalid_date", 400, svc.save_inventory, {"name": "a", "date": "31.12.2026"})
    _expect("name_exists", 409, svc.save_inventory, {"name": "Ladeninventur"})


def test_name_nach_erster_position_gesperrt_andere_felder_frei():
    repo, svc = _service()
    _save(svc, quantity=1)
    _expect("name_locked", 409, svc.save_inventory, _inv_data(name="Anders"))
    ok = svc.save_inventory(_inv_data(year="2027", status="abgeschlossen"))
    assert ok["inventory"]["year"] == "2027" and ok["inventory"]["status"] == "abgeschlossen"
    assert repo.inventories[INV]["name"] == "Ladeninventur"


def test_umbenennen_ohne_positionen_und_konflikte():
    repo, svc = _service()
    assert svc.save_inventory(_inv_data(name="Anders"))["inventory"]["name"] == "Anders"
    err = _expect("conflict", 409, svc.save_inventory, _inv_data(name="Wieder"))
    assert err.extra["current"]["name"] == "Anders"
    _expect("name_exists", 409, svc.save_inventory, _inv_data(name="Alt", baseVersion="v2"))
    _expect("invalid_version", 400, svc.save_inventory, _inv_data(baseVersion=None))


def test_datum_behaelt_uhrzeit_des_bestandswerts():
    repo, svc = _service()
    svc.save_inventory(_inv_data(date="2026-11-21"))
    assert repo.inventories[INV]["date"] == "2026-11-21T08:30:00Z"
    repo.inventories[INV]["version"] = "v1"
    svc.save_inventory(_inv_data(date="2026-11-21"))
    assert repo.inventories[INV]["date"] == "2026-11-21T08:30:00Z"  # unverändert, nicht neu gesendet


# ---------- HTTP-Schicht ----------
class Req:
    def __init__(self, method="GET", token=None, params=None, body=None):
        self.method = method
        self.headers = {} if token is None else {"X-CMS-Auth": token}
        self.params = params or {}
        self._body = body

    def get_json(self):
        if self._body is None:
            raise ValueError("kein JSON")
        return self._body


def _env(token="geheim", enforce=None):
    for name, value in (("CMS_AUTH_TOKEN", token), ("CMS_AUTH_ENFORCE", enforce)):
        if value is None:
            os.environ.pop(name, None)
        else:
            os.environ[name] = value


def test_ohne_token_nie_zugriff_auch_wenn_schalter_aus():
    _env(token="geheim", enforce=None)

    def boom():
        raise AssertionError("Service darf nicht erzeugt werden")

    for req in (Req("GET", None, {"action": "inventories"}), Req("GET", "falsch", {"action": "inventories"}),
                Req("POST", None, body={"action": "savePosition"})):
        assert api.handle(req, boom)[0] == 401
    _env(token="", enforce=None)  # Server nicht konfiguriert: ebenfalls geschlossen
    assert api.handle(Req("GET", "", {"action": "inventories"}), boom)[0] == 401


def test_http_schicht_fehlerformat_und_aktionen():
    _env(token="geheim")
    repo, svc = _service()
    get = lambda: svc
    status, body = api.handle(Req("GET", "geheim", {"action": "inventories"}), get)
    assert status == 200 and len(body["inventories"]) == 2
    assert api.handle(Req("GET", "geheim", {"action": "nope"}), get)[0] == 400
    assert api.handle(Req("POST", "geheim"), get)[0] == 400
    status, body = api.handle(Req("POST", "geheim", body={"action": "savePosition", "inventoryId": INV,
                                                          "articleId": ART, "quantity": 2}), get)
    assert status == 200 and body["position"]["quantity"] == 2
    status, body = api.handle(Req("POST", "geheim", body={"action": "savePosition", "inventoryId": INV,
                                                          "articleId": ART, "quantity": 3}), get)
    assert status == 409 and body["error"] == "conflict"
    status, body = api.handle(Req("GET", "geheim", {"action": "articles", "q": "mil"}), get)
    assert status == 200 and body["articles"][0]["id"] == ART


def test_unerwarteter_fehler_ist_kein_erfolg():
    _env(token="geheim")

    class Broken:
        def inventories(self):
            raise RuntimeError("kaputt")

    status, body = api.handle(Req("GET", "geheim", {"action": "inventories"}), lambda: Broken())
    assert status == 500 and body["error"] == "server_error"


# ---------- Dataverse-Hilfen ----------
def test_odata_hilfen():
    try:
        from shared import inventur_dv as dv
    except ImportError:
        return  # msal/requests nicht installiert – reine Hilfen, hier nicht prüfbar
    assert dv.odata_string("O'Brien") == "'O''Brien'"
    query = dv._query({"$filter": "cr5d4_newcolumn eq 'Ä&B+C'"})
    assert "&B" not in query.split("=", 1)[1] and "%2B" in query and "%26" in query
    assert dv.DETAILS == "cr5d4_inventurdetailses"
    raw = {"cr5d4_inventurdetailsid": "id", "cr5d4_menge": 3, "modifiedon": "t", "@odata.etag": 'W/"1"'}
    assert dv.DataverseRepo._pos(raw)["version"] == 'W/"1"'
    raw.pop("@odata.etag")
    assert dv.DataverseRepo._pos(raw)["version"] == "m:t|3"
    assert dv.DataverseRepo._if_match('W/"1"') == 'W/"1"' and dv.DataverseRepo._if_match(None) == "*"


# ---------- Fortschritt ----------
def test_fortschritt_zaehler_und_warenwert():
    repo, service = _service()
    repo.articles[ART]["warengruppe"] = "Molkerei"
    repo.articles[ART2]["warengruppe"] = "Backwaren"
    pos = repo._add("Ladeninventur-0900", INV, ART, 10, 1.5, "0")
    pos["at"] = "2026-11-20T16:00:00Z"
    pos2 = repo._add("Ladeninventur-4500", INV, ART2, 800, 2.0, "3")
    pos2["at"] = "2026-11-20T15:00:00Z"
    data = service.progress(INV)
    assert data["articlesTotal"] == 2 and data["articlesCaptured"] == 2 and data["positions"] == 2
    assert data["valueEk"] == 1615.0  # 10*1,5 + 800*2,0
    groups = {g["name"]: g for g in data["groups"]}
    assert groups["Molkerei"]["articlesCaptured"] == 1 and groups["Molkerei"]["valueEk"] == 15.0
    assert groups["Backwaren"]["valueEk"] == 1600.0
    assert data["recent"][0]["article"] == "Milch" and data["recent"][0]["value"] == 15.0


def test_fortschritt_gruppiert_ueber_gesamtes_sortiment():
    repo, service = _service()
    repo.articles[ART]["warengruppe"] = "Molkerei"
    repo._add("Ladeninventur-0900", INV, ART, 10, 1.5, "0")
    data = service.progress(INV)
    # ART2 (keine Position) bleibt mit seiner Warengruppe erhalten
    groups = {g["name"]: g for g in data["groups"]}
    assert groups["Molkerei"]["articlesTotal"] == 1 and groups["Molkerei"]["articlesCaptured"] == 1
    assert data["articlesCaptured"] == 1 and data["articlesTotal"] == 2


def test_fortschritt_ohne_ek_zaehlt_null():
    repo, service = _service()
    repo.articles[ART]["warengruppe"] = "Molkerei"
    repo._add("Ladeninventur-0900", INV, ART, 10, None, "0")
    data = service.progress(INV)
    assert data["valueEk"] == 0.0 and data["groups"][0]["valueEk"] == 0.0
    assert data["recent"][0]["value"] is None


def test_fortschritt_ohne_positionen_und_leere_menge():
    repo, service = _service()
    repo.articles[ART]["warengruppe"] = "Molkerei"
    repo._add("Ladeninventur-0900", INV, ART, None, 1.5, "0")  # leere Menge: kein Wert, kein "erfasst"
    data = service.progress(INV)
    assert data["articlesCaptured"] == 0 and data["valueEk"] == 0.0
    assert data["groups"][0]["articlesCaptured"] == 0


def test_fortschritt_unbekannter_artikel_bekannt_geblieben():
    repo, service = _service()
    repo.articles[ART]["warengruppe"] = "Molkerei"
    repo.articles[ART]["statecode"] = 1  # deaktivierter Artikel mit Position
    repo.progress_articles = lambda: [{"id": ART2, "name": "Brot", "warengruppe": "", "unit": "3"}]
    repo._add("Ladeninventur-0900", INV, ART, 4, 2.0, "0")
    data = service.progress(INV)
    assert data["articlesTotal"] == 1 and data["articlesCaptured"] == 0
    assert data["recent"][0]["article"] == "Artikel"  # Name nicht ermittelbar, Position trotzdem sichtbar


if __name__ == "__main__":
    failed = 0
    for name, fn in sorted(globals().items()):
        if name.startswith("test_") and callable(fn):
            try:
                fn()
                print("OK  ", name)
            except Exception as exc:  # noqa: BLE001
                failed += 1
                print("FAIL", name, "->", repr(exc))
    sys.exit(1 if failed else 0)
