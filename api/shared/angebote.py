"""Angebotsrevisionen und Validierung, ohne Azure- oder Netzwerkabhaengigkeiten."""

import copy
import hashlib
import logging
import math
import re
import uuid
from datetime import date, datetime, timezone
from zoneinfo import ZoneInfo

ID = re.compile(r"^[a-f0-9]{32}$")
COLOR = re.compile(r"^#[a-fA-F0-9]{6}$")
FIELDS = ("name", "pack", "description", "price", "old_price", "deposit", "base")
ELEMENTS = ("text", "image", "shape") + FIELDS + ("title", "period", "brand", "footer")
FONTS = ("Arial", "Georgia", "Verdana", "Trebuchet MS")
WIDTH, HEIGHT = 794, 1123
MAX_ITEMS, MAX_PAGES = 99, 99
THEME_DEFAULTS = {
    "font": "Arial", "title_color": "#234c38", "text_color": "#24362d",
    "card_background": "#ffffff", "price_background": "#ffffff",
    "price_shape": "rect", "name_size": 24, "price_size": 58, "details_size": 17,
    "image_rotation": 0, "image_scale": 100,
}


class AngeboteFehler(Exception):
    def __init__(self, status, text):
        super().__init__(text)
        self.status, self.text = status, text


def kennung(value):
    if not isinstance(value, str) or not ID.fullmatch(value):
        raise AngeboteFehler(400, "Dieses Angebot wurde nicht gefunden.")
    return value


def _text(value, label, maximum=300):
    if not isinstance(value, str) or len(value) > maximum:
        raise AngeboteFehler(400, f"Bitte {label} prüfen (höchstens {maximum} Zeichen).")
    return value.strip()


def _number(value, label, low, high, integer=False, optional=False):
    if optional and value is None:
        return None
    if (isinstance(value, bool) or not isinstance(value, (int, float))
            or not low <= value <= high or not math.isfinite(value)
            or (integer and int(value) != value)):
        raise AngeboteFehler(400, f"Bitte {label} prüfen.")
    return int(value) if integer else value


def _day(value):
    if value == "":
        return ""
    if not isinstance(value, str) or not re.fullmatch(r"\d{4}-\d{2}-\d{2}", value):
        raise AngeboteFehler(400, "Bitte ein gültiges Datum wählen.")
    try:
        date.fromisoformat(value)
    except ValueError as exc:
        raise AngeboteFehler(400, "Bitte ein gültiges Datum wählen.") from exc
    return value


def today(now=None):
    moment = now or datetime.now(timezone.utc)
    return moment.astimezone(ZoneInfo("Europe/Berlin")).date().isoformat()


def active(data, now=None):
    day = today(now)
    return bool(data.get("valid_from") and data.get("valid_to")
                and data["valid_from"] <= day <= data["valid_to"])


def base_cents(item):
    volume = (item.get("units") or 0) * (item.get("volume_ml") or 0)
    if not volume or item.get("price_cents") is None:
        return None
    # Positive Ganzzahlen: exaktes kaufmaennisches Runden ohne Float-Preisfehler.
    return (2 * item["price_cents"] * 1000 + volume) // (2 * volume)


def image_ids(data):
    found = {i["image_id"] for i in data.get("items", []) if i.get("image_id")}
    for page in data.get("layout", {}).get("pages", []):
        found.update(e["image_id"] for e in page["elements"] if e.get("image_id"))
    return sorted(found)


def _layout(raw, items):
    if not isinstance(raw, dict):
        raise AngeboteFehler(400, "Die Gestaltung konnte nicht gelesen werden.")
    mode, template = raw.get("mode", "template"), raw.get("template", "land")
    if mode not in ("template", "free") or template not in ("land", "classic"):
        raise AngeboteFehler(400, "Bitte eine gültige Gestaltung wählen.")
    density = _number(raw.get("density", 4), "die Artikelzahl", 4, 6, integer=True)
    if density not in (4, 6):
        raise AngeboteFehler(400, "Bitte vier oder sechs Artikel je Vorlagenseite wählen.")
    color, background = raw.get("color", "#bb421e"), raw.get("background", "#fffdf6")
    if not COLOR.fullmatch(str(color)) or not COLOR.fullmatch(str(background)):
        raise AngeboteFehler(400, "Bitte eine gültige Farbe wählen.")
    pages = raw.get("pages", [])
    if not isinstance(pages, list) or len(pages) > MAX_PAGES:
        raise AngeboteFehler(400, "Der Flyer enthält zu viele Seiten.")
    result, known, seen = [], {i["id"] for i in items}, set()
    for page in pages:
        if not isinstance(page, dict) or not isinstance(page.get("elements"), list):
            raise AngeboteFehler(400, "Bitte die Flyerseiten prüfen.")
        if len(page["elements"]) > 300:
            raise AngeboteFehler(400, "Eine Flyerseite enthält zu viele Elemente.")
        elements = []
        for raw_el in page["elements"]:
            if not isinstance(raw_el, dict) or raw_el.get("type") not in ELEMENTS:
                raise AngeboteFehler(400, "Bitte die Gestaltungselemente prüfen.")
            el = {"id": kennung(raw_el.get("id")), "type": raw_el["type"]}
            if el["id"] in seen:
                raise AngeboteFehler(400, "Ein Gestaltungselement ist doppelt vorhanden.")
            seen.add(el["id"])
            item_id = raw_el.get("item_id", "")
            if not isinstance(item_id, str) or (item_id and item_id not in known):
                raise AngeboteFehler(400, "Ein Gestaltungselement gehört zu keinem Artikel.")
            if el["type"] in FIELDS and not item_id:
                raise AngeboteFehler(400, "Bitte das Artikelfeld zuordnen.")
            el["item_id"] = item_id
            for name, low, high, default in (
                    ("x", 0, WIDTH, 0), ("y", 0, HEIGHT, 0),
                    ("w", 8, WIDTH, 200), ("h", 8, HEIGHT, 60),
                    ("font_size", 10, 160, 24), ("rotation", -180, 180, 0),
                    ("opacity", 0, 1, 1), ("image_scale", 20, 200, 100)):
                el[name] = _number(raw_el.get(name, default), "die Elementmaße", low, high)
            el["text"] = _text(raw_el.get("text", ""), "den Text", 2000)
            el["font"] = raw_el.get("font", "Arial")
            el["align"] = raw_el.get("align", "left")
            el["shape"] = raw_el.get("shape", "rect")
            el["bold"] = raw_el.get("bold", False) is True
            el["hidden"] = raw_el.get("hidden", False) is True
            if el["font"] not in FONTS or el["align"] not in ("left", "center", "right"):
                raise AngeboteFehler(400, "Bitte Schrift und Ausrichtung prüfen.")
            if el["shape"] not in ("rect", "round", "ellipse"):
                raise AngeboteFehler(400, "Bitte eine gültige Form wählen.")
            el["fill"] = raw_el.get("fill", "")
            if el["fill"] and not COLOR.fullmatch(str(el["fill"])):
                raise AngeboteFehler(400, "Bitte die Elementfarbe prüfen.")
            el["image_id"] = raw_el.get("image_id", "")
            if not isinstance(el["image_id"], str):
                raise AngeboteFehler(400, "Bitte die Bildzuordnung prüfen.")
            if el["image_id"]:
                kennung(el["image_id"])
            elements.append(el)
        result.append({"elements": elements})
    theme = {}
    for key, default in THEME_DEFAULTS.items():
        value = raw.get(key, default)
        if key.endswith("_color") or key.endswith("_background"):
            if not COLOR.fullmatch(str(value)):
                raise AngeboteFehler(400, "Bitte die Gestaltungsfarben prüfen.")
        elif key == "font" and value not in FONTS:
            raise AngeboteFehler(400, "Bitte eine gültige Schrift wählen.")
        elif key == "price_shape" and value not in ("rect", "round", "ellipse"):
            raise AngeboteFehler(400, "Bitte eine gültige Preisform wählen.")
        elif key in ("name_size", "price_size", "details_size"):
            value = _number(value, "die Schriftgröße", 14, 100)
        elif key == "image_rotation":
            value = _number(value, "die Bilddrehung", -180, 180)
        elif key == "image_scale":
            value = _number(value, "die Bildgröße", 20, 200)
        theme[key] = value
    return {"mode": mode, "template": template, "density": density,
            "color": color, "background": background, "pages": result, **theme}


def normalize(raw, publish=False):
    if not isinstance(raw, dict) or raw.get("kind") not in ("weekly", "drinks"):
        raise AngeboteFehler(400, "Bitte die Angebotsart wählen.")
    result = {"kind": raw["kind"], "title": _text(raw.get("title", ""), "die Überschrift", 120),
              "valid_from": _day(raw.get("valid_from", "")),
              "valid_to": _day(raw.get("valid_to", ""))}
    source = raw.get("items", [])
    if not isinstance(source, list) or len(source) > MAX_ITEMS:
        raise AngeboteFehler(400, "Bitte die Artikelauswahl prüfen (höchstens 99 Artikel).")
    items, seen = [], set()
    for raw_item in source:
        if not isinstance(raw_item, dict):
            raise AngeboteFehler(400, "Bitte die Artikelangaben prüfen.")
        item = {"id": kennung(raw_item.get("id"))}
        if item["id"] in seen:
            raise AngeboteFehler(400, "Ein Artikel ist doppelt vorhanden.")
        seen.add(item["id"])
        for key, maximum in (("name", 160), ("article_number", 80),
                             ("description", 500), ("packaging", 100)):
            item[key] = _text(raw_item.get(key, ""), "die Artikelangaben", maximum)
        for key in ("price_cents", "old_price_cents", "deposit_cents"):
            item[key] = _number(raw_item.get(key), "die Preisangaben", 0, 100000000,
                                integer=True, optional=True)
        item["units"] = _number(raw_item.get("units"), "die Anzahl", 1, 10000,
                                integer=True, optional=True)
        item["volume_ml"] = _number(raw_item.get("volume_ml"), "den Inhalt", 1, 1000000,
                                    integer=True, optional=True)
        item["deposit_free"] = raw_item.get("deposit_free", False) is True
        item["highlight"] = raw_item.get("highlight", False) is True
        item["image_id"] = raw_item.get("image_id", "")
        if not isinstance(item["image_id"], str):
            raise AngeboteFehler(400, "Bitte die Bildzuordnung prüfen.")
        if item["image_id"]:
            kennung(item["image_id"])
        if publish:
            if not item["name"] or not item["price_cents"]:
                raise AngeboteFehler(422, "Jeder Artikel benötigt einen Namen und einen Angebotspreis größer als null.")
            if item["old_price_cents"] is not None and item["old_price_cents"] <= item["price_cents"]:
                raise AngeboteFehler(422, "Der Stattpreis muss über dem Angebotspreis liegen oder leer bleiben.")
            if result["kind"] == "drinks":
                if not item["units"] or not item["volume_ml"] or not item["packaging"]:
                    raise AngeboteFehler(422, "Bitte Anzahl, Literinhalt und Gebindeart für jedes Getränk ergänzen.")
                if (item["deposit_cents"] is None
                        or (item["deposit_free"] and item["deposit_cents"] != 0)
                        or (not item["deposit_free"] and item["deposit_cents"] <= 0)):
                    raise AngeboteFehler(422, "Bitte Pfand eintragen oder ausdrücklich „pfandfrei“ wählen.")
        items.append(item)
    result["items"] = items
    result["layout"] = _layout(raw.get("layout", {}), items)
    if publish:
        if (not result["title"] or not items or not result["valid_from"] or not result["valid_to"]
                or result["valid_from"] > result["valid_to"]):
            raise AngeboteFehler(422, "Bitte Überschrift, Artikel und einen gültigen Zeitraum eintragen.")
        required = ("name", "price") + (("pack", "deposit", "base") if result["kind"] == "drinks" else ())
        elements = [el for page in result["layout"]["pages"] for el in page["elements"]]
        for item in items:
            for role in required:
                if not any(el["type"] == role and el["item_id"] == item["id"] and _readable(el)
                           for el in elements):
                    raise AngeboteFehler(422, "Im Flyer fehlen lesbare Artikel-, Preis-, Pfand- oder Grundpreisangaben. Bitte die Gestaltung prüfen.")
    return result


def _readable(el):
    angle = math.radians(el["rotation"])
    half_w = (abs(math.cos(angle)) * el["w"] + abs(math.sin(angle)) * el["h"]) / 2
    half_h = (abs(math.sin(angle)) * el["w"] + abs(math.cos(angle)) * el["h"]) / 2
    cx, cy = el["x"] + el["w"] / 2, el["y"] + el["h"] / 2
    return (not el["hidden"] and el["opacity"] >= .5 and el["font_size"] >= 12
            and cx - half_w >= -1 and cy - half_h >= -1
            and cx + half_w <= WIDTH + 1 and cy + half_h <= HEIGHT + 1)


class AngeboteService:
    def __init__(self, store, now=None):
        self.store, self.now = store, now

    def _time(self):
        return (self.now or datetime.now(timezone.utc)).isoformat()

    def _head(self, action_id):
        head, etag = self.store.get("actions/" + kennung(action_id) + ".json")
        if head is None:
            raise AngeboteFehler(404, "Dieses Angebot wurde nicht gefunden.")
        self._check_head(head)
        return head, etag

    def list(self):
        heads = self.store.list("actions/")
        for head in heads:
            self._check_head(head)
        return heads

    @staticmethod
    def _check_head(head):
        if (not isinstance(head, dict) or not isinstance(head.get("id"), str)
                or not ID.fullmatch(head["id"]) or type(head.get("version")) is not int
                or not isinstance(head.get("draft"), dict)
                or not isinstance(head["draft"].get("items"), list)
                or "published_revision" not in head or "published_summary" not in head
                or (head["published_revision"] is not None
                    and (not isinstance(head["published_revision"], str)
                         or not ID.fullmatch(head["published_revision"])
                         or not isinstance(head["published_summary"], dict)))):
            logging.error("[angebote] Ungültiger gespeicherter Angebotskopf")
            raise AngeboteFehler(503, "Ein gespeichertes Angebot konnte nicht gelesen werden. Bitte die Verwaltung prüfen.")

    def design(self):
        stored, _ = self.store.get("design/defaults.json")
        if stored is not None:
            if (not isinstance(stored, dict) or type(stored.get("version")) is not int
                    or any(not isinstance(stored.get(k), dict) for k in ("weekly", "drinks"))):
                logging.error("[angebote] Ungültige gespeicherte Designstandards")
                raise AngeboteFehler(503, "Die gespeicherten Designstandards konnten nicht gelesen werden.")
            return stored
        layout = _layout({}, [])
        return {"version": 0, "weekly": copy.deepcopy(layout), "drinks": copy.deepcopy(layout)}

    def save_design(self, version, raw):
        stored, etag = self.store.get("design/defaults.json")
        self._version(stored or {"version": 0}, version)
        if not isinstance(raw, dict):
            raise AngeboteFehler(400, "Bitte die Designstandards prüfen.")
        design = {"version": version + 1}
        for kind in ("weekly", "drinks"):
            design[kind] = _layout(raw.get(kind), [])
            design[kind]["pages"] = []
            design[kind]["mode"] = "template"
        if stored is None:
            self.store.create("design/defaults.json", design)
        else:
            self.store.replace("design/defaults.json", design, etag)
        return design

    def get(self, action_id):
        return self._head(action_id)[0]

    def create(self, data):
        head = {"id": uuid.uuid4().hex, "version": 1, "draft": normalize(data),
                "published_revision": None, "published_summary": None, "updated_at": self._time()}
        self.store.create("actions/" + head["id"] + ".json", head)
        return head

    def _version(self, head, version):
        if isinstance(version, bool) or not isinstance(version, int) or version != head["version"]:
            raise AngeboteFehler(409, "Das Angebot wurde inzwischen geändert. Bitte neu öffnen, bevor du es erneut speicherst.")

    def save(self, action_id, version, data):
        head, etag = self._head(action_id)
        self._version(head, version)
        head["draft"] = normalize(data)
        head["version"] += 1
        head["updated_at"] = self._time()
        self.store.replace("actions/" + head["id"] + ".json", head, etag)
        return head

    def publish(self, action_id, version):
        head, etag = self._head(action_id)
        self._version(head, version)
        data = normalize(head["draft"], publish=True)
        for image in image_ids(data):
            if self.store.get_image(image) is None:
                raise AngeboteFehler(422, "Ein Artikelbild fehlt. Bitte das Bild erneut auswählen.")
        revision = uuid.uuid4().hex
        snapshot = {"id": head["id"], "revision": revision, "data": data}
        self.store.create("revisions/" + head["id"] + "/" + revision + ".json", snapshot)
        head["published_revision"] = revision
        head["published_summary"] = {key: data[key] for key in ("kind", "title", "valid_from", "valid_to")}
        head["published_summary"]["image_ids"] = image_ids(data)
        head["version"] += 1
        head["updated_at"] = self._time()
        self.store.replace("actions/" + head["id"] + ".json", head, etag)
        return head

    def duplicate(self, action_id):
        data = copy.deepcopy(self.get(action_id)["draft"])
        data["title"] = data["title"][:112] + " (Kopie)"
        return self.create(data)

    def public(self):
        result = []
        for head in self.list():
            if not head.get("published_revision") or not active(head.get("published_summary") or {}, self.now):
                continue
            snapshot, _ = self.store.get("revisions/" + head["id"] + "/" + head["published_revision"] + ".json")
            if (not isinstance(snapshot, dict) or not isinstance(snapshot.get("data"), dict)
                    or snapshot.get("id") != head["id"]
                    or snapshot.get("revision") != head["published_revision"]):
                raise AngeboteFehler(503, "Die veröffentlichten Angebote sind gerade nicht vollständig verfügbar.")
            result.append({"id": head["id"], "revision": head["published_revision"],
                           "data": normalize(snapshot["data"], publish=True)})
        return result

    def image_public(self, image_id):
        kennung(image_id)
        return any(head.get("published_revision")
                   and active(head.get("published_summary") or {}, self.now)
                   and image_id in (head.get("published_summary") or {}).get("image_ids", [])
                   for head in self.list())


def scale_scope(namespace):
    return hashlib.sha256(namespace.encode("utf-8")).hexdigest()[:6]
