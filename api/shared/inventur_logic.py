"""Fachlogik der Inventur-Web-App (/inventur).

Alle Regeln aus specs/inventur/spec.md, ohne Dataverse-Details: Der Zugriff
läuft über ein Repository (``inventur_dv.DataverseRepo``), das in den Tests
durch eine Attrappe ersetzt wird.

Leitlinie: **fail-closed**. Ist ein Schreibvorgang nicht eindeutig sicher
(doppelter Schlüssel, veralteter Stand, unklare Referenz), wird NICHT
geschrieben, sondern ein typischer Fehler mit verständlicher Meldung
geliefert.
"""

from decimal import Decimal, ROUND_HALF_UP

INT_MIN = -2147483648
INT_MAX = 2147483647
KEY_MAX = 850
NAME_MAX = 850
YEAR_MAX = 4000
PAGE_SIZE = 50

STATUS_BY_VALUE = {769580000: "geplant", 769580001: "aktiv", 769580002: "abgeschlossen"}
VALUE_BY_STATUS = {v: k for k, v in STATUS_BY_VALUE.items()}
UNITS = {"0": "Stück", "3": "Gramm"}


class ApiError(Exception):
    """Fachlicher Fehler mit HTTP-Status, Code und deutscher Meldung."""

    def __init__(self, status, code, message, **extra):
        super().__init__(message)
        self.status = status
        self.code = code
        self.message = message
        self.extra = extra


class VersionConflict(Exception):
    """Dataverse hat die bedingte Änderung abgelehnt (Stand veraltet)."""


def _round2(value):
    return float(Decimal(str(value)).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP))


def ek_suggestion(article):
    """EK für NEUE Positionen: letzter EK, sonst VK / MwSt * 0,67 (wie PowerApps)."""
    last = article.get("lastEk") or 0
    if last:
        return _round2(last)
    vk = article.get("vk") or 0
    factor = Decimal("1.07") if article.get("tax") == 9 else Decimal("1.19")
    return _round2(Decimal(str(vk)) / factor * Decimal("0.67"))


def position_key(inventory, article):
    """Originalschlüssel: Inventurname + "-" + Artikel[Strichcode]."""
    code = (article.get("articleCode") or "").strip()
    if not code:
        raise ApiError(422, "article_key_missing",
                       "Für diesen Artikel fehlt der Artikel-Strichcode. Er kann nicht erfasst werden.")
    key = inventory["name"] + "-" + code
    if len(key) > KEY_MAX:
        raise ApiError(422, "key_too_long",
                       "Inventurname und Barcode ergeben zusammen mehr als 850 Zeichen. "
                       "Diese Position kann nicht gespeichert werden.")
    return key


def _integer(value, label):
    if value is None:
        return None
    if isinstance(value, bool) or not isinstance(value, int):
        raise ApiError(400, "invalid_number", f"{label}: Bitte eine ganze Zahl eingeben.")
    if value < INT_MIN or value > INT_MAX:
        raise ApiError(400, "out_of_range", f"{label}: Die Zahl liegt außerhalb des erlaubten Bereichs.")
    return value


def compute_total(quantity, plus):
    """Menge ist die Basis, Plus die Differenz. Leere Basis zählt bei Plus als 0."""
    base = _integer(quantity, "Menge")
    extra = _integer(plus, "Plus")
    total = base if extra is None else (base or 0) + extra
    if total is not None and (total < INT_MIN or total > INT_MAX):
        raise ApiError(400, "out_of_range",
                       "Die Gesamtmenge liegt außerhalb des erlaubten Bereichs. Bitte Menge oder Plus korrigieren.")
    return total


def _public_inventory(inv, name_locked=None):
    data = {
        "id": inv["id"], "name": inv["name"], "year": inv.get("year") or "",
        "date": inv.get("date") or "", "status": STATUS_BY_VALUE.get(inv.get("status")),
        "version": inv["version"],
    }
    if name_locked is not None:
        data["nameLocked"] = name_locked
    return data


def _public_article(article):
    unit = (article.get("unit") or "").strip()
    supported = unit in UNITS and bool((article.get("articleCode") or "").strip())
    return {
        "id": article["id"], "name": article["name"], "code": article.get("code") or "",
        "articleCode": article.get("articleCode") or "", "vk": article.get("vk"),
        "lastEk": article.get("lastEk"), "tax": article.get("tax"), "unit": unit,
        "unitLabel": UNITS.get(unit), "supported": supported,
        "ekSuggestion": ek_suggestion(article),
    }


def _public_position(pos):
    return {"id": pos["id"], "quantity": pos.get("quantity"), "ek": pos.get("ek"), "version": pos["version"]}


class InventurService:
    def __init__(self, repo):
        self.repo = repo

    # ---------- Lesen ----------
    def inventories(self):
        return [_public_inventory(i) for i in self.repo.list_inventories()]

    def inventory(self, inventory_id):
        inv = self._inventory(inventory_id)
        return _public_inventory(inv, self.repo.inventory_has_positions(inv["id"], inv["name"]))

    def search_articles(self, term, after=None):
        term = (term or "").strip()[:100]
        rows = self.repo.search_articles(term, after, PAGE_SIZE + 1)
        more = len(rows) > PAGE_SIZE
        rows = rows[:PAGE_SIZE]
        return {
            "articles": [_public_article(a) for a in rows],
            "hasMore": more,
            "after": rows[-1].get("search") if more and rows else None,
        }

    def article_by_barcode(self, barcode):
        barcode = (barcode or "").strip()
        if not barcode or len(barcode) > 100:
            raise ApiError(400, "invalid_barcode", "Bitte einen gültigen Barcode angeben.")
        found = self.repo.find_articles_by_barcode(barcode)
        if not found:
            raise ApiError(404, "article_not_found",
                           "Artikel nicht gefunden – bitte erneut scannen oder Barcode prüfen.")
        if len(found) > 1:
            raise ApiError(409, "article_ambiguous",
                           "Dieser Barcode gehört zu mehreren Artikeln. Bitte den Artikel über die Suche wählen.")
        return _public_article(found[0])

    def position(self, inventory_id, article_id):
        inv = self._inventory(inventory_id)
        article = self._article(article_id)
        pos = self._find_position(inv, article)
        return {"position": _public_position(pos) if pos else None}

    # ---------- Schreiben: Positionen ----------
    def save_position(self, data):
        inv = self._inventory(data.get("inventoryId"))
        if STATUS_BY_VALUE.get(inv.get("status")) != "aktiv":
            raise ApiError(409, "inventory_not_active",
                           "Diese Inventur ist nicht mehr aktiv. Es wurde nichts gespeichert.")
        article = self._article(data.get("articleId"))
        public_article = _public_article(article)
        if not public_article["supported"]:
            raise ApiError(422, "unit_unsupported",
                           "Für diesen Artikel ist die Mengenerfassung noch nicht unterstützt.")
        total = compute_total(data.get("quantity"), data.get("plus"))
        base_version = data.get("baseVersion")
        if base_version is not None and not isinstance(base_version, str):
            raise ApiError(400, "invalid_version", "Der Stand der Position fehlt oder ist ungültig.")
        key = position_key(inv, article)
        current = self._find_position(inv, article)

        if current is None:
            if base_version:
                raise ApiError(409, "conflict",
                               "Die Position hat sich seit dem Laden geändert. Es wurde nichts gespeichert.",
                               current=None)
            return {"position": self._create(inv, article, key, total)}

        if not base_version:
            raise ApiError(409, "conflict",
                           "Für diesen Artikel gibt es inzwischen eine Position. Es wurde nichts gespeichert.",
                           current=_public_position(current))
        if base_version != current["version"]:
            raise ApiError(409, "conflict",
                           "Die Position wurde inzwischen geändert. Es wurde nichts gespeichert.",
                           current=_public_position(current))
        try:
            updated = self.repo.update_position(current["id"], total, current["version"])
        except VersionConflict:
            fresh = self._find_position(inv, article)
            raise ApiError(409, "conflict",
                           "Die Position wurde inzwischen geändert. Es wurde nichts gespeichert.",
                           current=_public_position(fresh) if fresh else None)
        return {"position": _public_position(updated)}

    def _create(self, inv, article, key, total):
        created = self.repo.create_position(
            inv["id"], article["id"], key, article["articleCode"], article["unit"], total, ek_suggestion(article))
        # Nachprüfung: Parallele Erstanlage oder Umbenennung der Inventur dürfen keine
        # Doppelposition bzw. keinen verwaisten Schlüssel hinterlassen.
        same = self.repo.find_positions(key)
        fresh_inv = self.repo.get_inventory(inv["id"])
        if len(same) != 1 or same[0]["id"] != created["id"] or not fresh_inv or fresh_inv["name"] != inv["name"]:
            self.repo.delete_position(created["id"])
            raise ApiError(409, "conflict",
                           "Gleichzeitig wurde dieselbe Position oder Inventur geändert. "
                           "Es wurde nichts gespeichert; bitte Artikel neu laden.", current=None)
        return _public_position(created)

    # ---------- Schreiben: Inventuren ----------
    def save_inventory(self, data):
        name = data.get("name")
        year = data.get("year")
        date = data.get("date")
        status = data.get("status")
        if not isinstance(name, str) or not name.strip():
            raise ApiError(400, "name_required", "Bitte einen Inventurnamen eingeben.")
        if len(name) > NAME_MAX:
            raise ApiError(400, "name_too_long", "Der Inventurname darf höchstens 850 Zeichen enthalten.")
        if year is not None and (not isinstance(year, str) or len(year) > YEAR_MAX):
            raise ApiError(400, "year_too_long", "Das Feld Jahr darf höchstens 4000 Zeichen enthalten.")
        if status not in (None, "") and status not in VALUE_BY_STATUS:
            raise ApiError(400, "invalid_status", "Der Status ist ungültig.")
        if date not in (None, "") and not _valid_date(date):
            raise ApiError(400, "invalid_date", "Das Startdatum ist ungültig.")
        status_value = VALUE_BY_STATUS.get(status) if status else None
        inventory_id = data.get("id")

        if not inventory_id:
            if self.repo.inventory_name_exists(name, None):
                raise ApiError(409, "name_exists",
                               "Es gibt bereits eine Inventur mit diesem Namen. "
                               "Positionsschlüssel müssten sonst doppelt vergeben werden.")
            created = self.repo.create_inventory(
                {"name": name, "year": year or None, "date": date or None, "status": status_value})
            return {"inventory": _public_inventory(created, False)}

        inv = self._inventory(inventory_id)
        base_version = data.get("baseVersion")
        if not isinstance(base_version, str) or not base_version:
            raise ApiError(400, "invalid_version", "Der Stand der Inventur fehlt oder ist ungültig.")
        if base_version != inv["version"]:
            raise ApiError(409, "conflict",
                           "Die Inventur wurde inzwischen geändert. Es wurde nichts gespeichert.",
                           current=_public_inventory(inv))
        renamed = name != inv["name"]
        if renamed:
            if self.repo.inventory_has_positions(inv["id"], inv["name"]):
                raise ApiError(409, "name_locked",
                               "Der Name kann nicht mehr geändert werden, weil bereits Positionen erfasst sind.")
            if self.repo.inventory_name_exists(name, inv["id"]):
                raise ApiError(409, "name_exists", "Es gibt bereits eine Inventur mit diesem Namen.")
        changes = {"name": name, "year": year or None, "status": status_value}
        old_date = inv.get("date") or ""
        if (date or "") != old_date[:10]:
            # Uhrzeit des Bestandswerts beibehalten, damit Datum-/Zeitbedeutung nicht kippt.
            changes["date"] = ((date + old_date[10:]) if date and len(old_date) > 10 else (date or None))
        try:
            updated = self.repo.update_inventory(inv["id"], changes, inv["version"])
        except VersionConflict:
            fresh = self.repo.get_inventory(inv["id"])
            raise ApiError(409, "conflict",
                           "Die Inventur wurde inzwischen geändert. Es wurde nichts gespeichert.",
                           current=_public_inventory(fresh) if fresh else None)
        if renamed and self.repo.inventory_has_positions(inv["id"], inv["name"]):
            # Zwischenzeitlich wurde erfasst: Umbenennung zurücknehmen, Schlüssel bleiben stimmig.
            self.repo.update_inventory(inv["id"], {"name": inv["name"]}, None)
            raise ApiError(409, "name_locked",
                           "Während des Speicherns wurde eine Position erfasst. "
                           "Der Name wurde nicht geändert.")
        return {"inventory": _public_inventory(updated, False)}

    # ---------- Hilfen ----------
    def _inventory(self, inventory_id):
        if not isinstance(inventory_id, str) or not _valid_guid(inventory_id):
            raise ApiError(400, "invalid_inventory", "Die Inventur ist ungültig.")
        inv = self.repo.get_inventory(inventory_id)
        if not inv:
            raise ApiError(404, "inventory_not_found", "Die Inventur wurde nicht gefunden.")
        return inv

    def _article(self, article_id):
        if not isinstance(article_id, str) or not _valid_guid(article_id):
            raise ApiError(400, "invalid_article", "Der Artikel ist ungültig.")
        article = self.repo.get_article(article_id)
        if not article:
            raise ApiError(404, "article_not_found", "Der Artikel wurde nicht gefunden.")
        return article

    def _find_position(self, inv, article):
        key = position_key(inv, article)
        found = self.repo.find_positions(key)
        if len(found) > 1:
            raise ApiError(409, "duplicate_position",
                           "Für diesen Artikel gibt es in dieser Inventur mehrere Positionen. "
                           "Aus Sicherheitsgründen wird nichts geändert. Bitte die Daten bereinigen lassen.")
        if not found:
            return None
        pos = found[0]
        for have, want in ((pos.get("inventoryId"), inv["id"]), (pos.get("articleId"), article["id"])):
            if have and have.lower() != want.lower():
                raise ApiError(409, "reference_mismatch",
                               "Die vorhandene Position verweist auf eine andere Inventur oder einen anderen "
                               "Artikel. Aus Sicherheitsgründen wird nichts geändert.")
        return pos


def _valid_guid(value):
    import re
    return bool(re.fullmatch(r"[0-9a-fA-F]{8}-([0-9a-fA-F]{4}-){3}[0-9a-fA-F]{12}", value))


def _valid_date(value):
    import datetime
    if not isinstance(value, str) or len(value) != 10:
        return False
    try:
        datetime.date.fromisoformat(value)
        return True
    except ValueError:
        return False
