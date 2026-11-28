"""Angebotsrevisionen und Validierung, ohne Azure- oder Netzwerkabhaengigkeiten."""

import copy
import hashlib
import json
import logging
import math
import re
import uuid
from datetime import date, datetime, timezone
from zoneinfo import ZoneInfo

ID = re.compile(r"^[a-f0-9]{32}$")
COLOR = re.compile(r"^#[a-fA-F0-9]{6}$")
FIELDS = ("name", "pack", "description", "price", "old_price", "deposit", "base", "discount")
ELEMENTS = ("text", "image", "shape", "logo") + FIELDS + ("title", "period", "brand", "footer")
FONTS = ("Arial", "Georgia", "Verdana", "Trebuchet MS")
TEMPLATES = ("land", "classic", "classic-red", "minimal-clean", "dark-modern",
             "organic-market", "bold-poster", "modern-magazine", "modern-mag-fresh",
             "modern-mag-bold", "modern-mag-xl", "half-red", "half-green", "half-blue",
             "tag-red", "tag-green", "tag-blue", "price-image")
WIDTH, HEIGHT = 794, 1123
MAX_ITEMS, MAX_PAGES = 99, 99
THEME_DEFAULTS = {
    "font": "Arial", "title_color": "#234c38", "text_color": "#24362d",
    "card_background": "#ffffff", "price_background": "#ffffff",
    "price_shape": "rect", "name_size": 24, "price_size": 58, "details_size": 17,
    "price_outline_color": "#ffffff", "old_price_color": "#000000", "price_strike_color": "#ed1c24",
    "price_preset": "",
    "image_rotation": 0, "image_scale": 100,
    "marker_type": "starburst", "marker_palette": "harmonie", "marker_scale": 100,
}
MARKER_TYPES = ("starburst", "badge", "pill", "flag", "hexburst", "diamond", "shield", "ribbon", "explosion", "heart")
MARKER_PALETTES = ("harmonie", "classic-red", "warm-copper", "berry-purple", "ocean-blue",
                   "sunset-orange", "fresh-lime", "deep-rose", "midnight-gold", "arctic-teal")
PRICE_SHAPES = ("rect", "round", "ellipse", "rounded", "pill", "circle", "banner",
                "star", "hexagon", "diamond", "ticket", "explosion", "trapez")
PRICE_PRESETS = ("", "manual", "classic-red-rect", "green-rounded", "dark-pill", "gold-banner",
                 "blue-circle", "orange-star", "purple-hexagon", "teal-ticket",
                 "rose-diamond", "copper-explosion", "price-image")
DECORATION_FLAGS = {"show_leaf", "show_bag", "show_texture", "background_gradient", "image_gradient"}
DECORATION_COLORS = {"leaf_color", "footer_color", "vorrat_color", "details_color",
                     "card_border_color", "image_background", "border_color",
                     "background_color2", "image_color2", "header_background", "header_accent",
                     "date_color", "divider_color", "price_bar_background", "price_bar_border", "tag_background"}
DECORATION_RANGES = {
    "leaf_size": (16, 50), "border_width": (0, 20), "card_border_width": (0, 20),
    "price_radius": (0, 40), "price_skew": (0, 30), "price_scale": (50, 150),
    "image_width_pct": (20, 80), "image_dx": (-1000, 1000), "image_dy": (-1500, 1500),
    "price_dx": (-1000, 1000), "price_dy": (-1500, 1500),
    "background_pct": (10, 90), "image_pct": (10, 90),
}
HOMEPAGE_DEFAULTS = {
    "gridBg": "#f4f1ea", "cardBg": "#ffffff", "cardBorder": "#d8dfd7",
    "nameColor": "#1f2521", "detColor": "#555555", "tagBg": "#a51d2d",
    "tagText": "#ffffff", "badgeBg": "#31704b", "stattColor": "#666666",
    "tagSkew": -4, "tagRadius": 5, "headerBg": "#c62828", "headerText": "#ffffff",
    "cardRadius": 10, "imgSize": 95, "showLeaf": False, "showBasket": False,
}


def _homepage(raw):
    if not isinstance(raw, dict) or set(raw) - set(HOMEPAGE_DEFAULTS):
        raise AngeboteFehler(400, "Bitte die Homepage-Gestaltung prüfen.")
    result = copy.deepcopy(HOMEPAGE_DEFAULTS)
    for key, value in raw.items():
        if key in ("showLeaf", "showBasket"):
            if type(value) is not bool:
                raise AngeboteFehler(400, "Bitte die Homepage-Dekoration prüfen.")
        elif key in ("tagSkew", "tagRadius", "cardRadius", "imgSize"):
            limits = {"tagSkew": (-10, 10), "tagRadius": (0, 20),
                      "cardRadius": (0, 30), "imgSize": (60, 140)}
            value = _number(value, "die Homepage-Größen", *limits[key])
        elif not isinstance(value, str) or not COLOR.fullmatch(value):
            raise AngeboteFehler(400, "Bitte die Homepage-Farben prüfen.")
        result[key] = value
    return result


def _decoration(raw):
    if not isinstance(raw, dict):
        raise AngeboteFehler(400, "Bitte die zusätzlichen Gestaltungsoptionen prüfen.")
    result = {}
    for key, value in raw.items():
        if key in DECORATION_FLAGS:
            if type(value) is not bool:
                raise AngeboteFehler(400, "Bitte die Dekorationsauswahl prüfen.")
        elif key in DECORATION_COLORS:
            if not isinstance(value, str) or not COLOR.fullmatch(value):
                raise AngeboteFehler(400, "Bitte die Dekorationsfarben prüfen.")
        elif key in DECORATION_RANGES:
            value = _number(value, "die zusätzlichen Gestaltungsoptionen", *DECORATION_RANGES[key])
        elif key in ("background_direction", "image_direction"):
            if value not in ("to bottom", "to right", "to bottom right", "135deg"):
                raise AngeboteFehler(400, "Bitte die Verlaufsrichtung prüfen.")
        else:
            raise AngeboteFehler(400, "Bitte die zusätzlichen Gestaltungsoptionen prüfen.")
        result[key] = value
    return result


CMS_CONFIG_KEYS = set((
    "bgColor tagColor leafColor titleColor decoFooterColor imgRotation imgFreistellen "
    "imgThreshold imgMaxScale priceFontFlyer priceFontPlakat stattColor tagSkew "
    "tagShape tagRadius tagPreset showLeaf leafSize showBag showTexture "
    "savingsMarkerType savingsPalette savingsScalePlakat savingsScaleFlyer "
    "plakatTemplate flyerTemplate tplColors plakat_inline flyer_inline"
).split())
CMS_CONFIG_KEYS.update(
    f"{kind}_{key}" for kind in ("plakat", "flyer") for key in (
        "tagPreset tagShape tagRadius tagSkew tagScale decoLeafColor decoTitleColor "
        "decoBgColor decoFooterColor vorratColor showLeaf leafSize showBag "
        "showTexture imgScale borderWidth borderColor imgAnchorX imgAnchorY "
        "priceAnchorX priceAnchorY imgWidthPct priceImageColor priceOutlineColor "
        "priceStripColor priceOldColor priceStrikeColor nameFont nameSize nameColor "
        "nameWeight detailsWeight savingsMarkerType savingsPalette"
    ).split()
)
FONT_WEIGHTS = ("400", "600", "700", "900")


def _cms_design(raw, items):
    if (not isinstance(raw, dict)
            or not {"config", "plakat_article_overrides", "flyer_article_overrides"} <= set(raw)
            or set(raw) - {"config", "plakat_article_overrides", "flyer_article_overrides", "targets"}
            or not isinstance(raw["config"], dict)
            or set(raw["config"]) - CMS_CONFIG_KEYS):
        raise AngeboteFehler(400, "Bitte die gespeicherte Wochenvorlage prüfen.")
    targets = raw.get("targets", {})
    if (not isinstance(targets, dict) or set(targets) - {"card", "single"}
            or any(not isinstance(value, dict) or "targets" in value for value in targets.values())):
        raise AngeboteFehler(400, "Bitte die getrennten Wochenvorlagen prüfen.")
    validated_targets = {key: _cms_design(value, items) for key, value in targets.items()}
    for key in ("plakatTemplate", "flyerTemplate"):
        if raw["config"].get(key) not in TEMPLATES[2:]:
            raise AngeboteFehler(400, "Bitte eine gültige CMS-Wochenvorlage wählen.")
    for kind in ("plakat", "flyer"):
        if (raw["config"].get(f"{kind}_savingsMarkerType", "") not in ("",) + MARKER_TYPES
                or raw["config"].get(f"{kind}_savingsPalette", "") not in ("",) + MARKER_PALETTES):
            raise AngeboteFehler(400, "Bitte die Ersparnis-Marker der Wochenvorlage prüfen.")
        inline = raw["config"].get(f"{kind}_inline", {})
        limits = {"imgDx": (-1000, 1000), "imgDy": (-1500, 1500),
                  "priceDx": (-1000, 1000), "priceDy": (-1500, 1500),
                  "imgScale": (20, 200), "priceScale": (20, 200),
                  "imgRot": (-180, 180), "priceRot": (-180, 180),
                  "nameDx": (-1000, 1000), "nameDy": (-1500, 1500),
                  "nameScale": (20, 200), "nameRot": (-180, 180)}
        if not isinstance(inline, dict) or set(inline) - limits.keys():
            raise AngeboteFehler(400, "Bitte die direkten Standardanpassungen prüfen.")
        if raw["config"].get(f"{kind}_nameFont", "Arial") not in FONTS:
            raise AngeboteFehler(400, "Bitte die Schrift der Bezeichnung prüfen.")
        for weight_key, default in (("nameWeight", "900"), ("detailsWeight", "600")):
            if str(raw["config"].get(f"{kind}_{weight_key}", default)) not in FONT_WEIGHTS:
                raise AngeboteFehler(400, "Bitte die Schriftstärke von Bezeichnung und Zusatztext prüfen.")
        if not COLOR.fullmatch(str(raw["config"].get(f"{kind}_nameColor", "#1a1a1a"))):
            raise AngeboteFehler(400, "Bitte die Farbe der Bezeichnung prüfen.")
        _number(raw["config"].get(f"{kind}_nameSize", 0), "die Schriftgröße der Bezeichnung", 0, 100)
        for key, value in inline.items():
            minimum, maximum = limits[key]
            if (isinstance(value, bool) or not isinstance(value, (int, float))
                    or not math.isfinite(value) or not minimum <= value <= maximum):
                raise AngeboteFehler(400, "Bitte die direkten Standardanpassungen prüfen.")
    count = 0

    def check(value, depth=0):
        nonlocal count
        count += 1
        if count > 20000 or depth > 8:
            raise AngeboteFehler(400, "Die Wochenvorlage ist zu umfangreich.")
        if value is None or isinstance(value, bool):
            return
        if isinstance(value, (int, float)) and math.isfinite(value) and abs(value) <= 100000000:
            return
        if isinstance(value, str) and len(value) <= 700000:
            return
        if isinstance(value, list):
            for entry in value:
                check(entry, depth + 1)
            return
        if isinstance(value, dict):
            for key, entry in value.items():
                if not isinstance(key, str) or key in ("__proto__", "prototype", "constructor") or len(key) > 200:
                    raise AngeboteFehler(400, "Bitte die Wochenvorlage prüfen.")
                if key == "customImg" and entry is not None and (
                        not isinstance(entry, str) or not re.fullmatch(
                            r"data:image/(png|jpeg|webp);base64,[A-Za-z0-9+/=\r\n]+", entry)):
                    raise AngeboteFehler(400, "Bitte das Zusatzbild der Wochenvorlage prüfen.")
                check(entry, depth + 1)
            return
        raise AngeboteFehler(400, "Bitte die Werte der Wochenvorlage prüfen.")

    check(raw)
    if len(json.dumps(raw, ensure_ascii=False).encode("utf-8")) > 1000000:
        raise AngeboteFehler(413, "Die Wochenvorlage ist zu umfangreich. Bitte weniger Zusatzbilder verwenden.")
    result = copy.deepcopy(raw)
    if "targets" in raw:
        result["targets"] = validated_targets
    known = {re.sub(r"\s+", "_", item["name"].strip().lower()) for item in items}
    for key in ("plakat_article_overrides", "flyer_article_overrides"):
        if not isinstance(result[key], dict):
            raise AngeboteFehler(400, "Bitte die Artikelpositionen der Wochenvorlage prüfen.")
        result[key] = {key: value for key, value in result[key].items() if key in known}
        if any(not isinstance(value, dict) for value in result[key].values()):
            raise AngeboteFehler(400, "Bitte die Artikelpositionen der Wochenvorlage prüfen.")
    return result


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
    for target in data.get("layout", {}).get("targets", {}).values():
        for item_layout in target:
            found.update(e["image_id"] for e in item_layout["elements"] if e.get("image_id"))
    return sorted(found)


def _elements(source, known, seen, width, height):
    if not isinstance(source, list) or len(source) > 300:
        raise AngeboteFehler(400, "Bitte die Gestaltungselemente prüfen.")
    elements = []
    for raw_el in source:
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
                ("x", 0, width, 0), ("y", 0, height, 0),
                ("w", 8, width, 200), ("h", 8, height, 60),
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
        if el["shape"] not in PRICE_SHAPES:
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
    return elements


def _background(source):
    if "background" not in source:
        return {}
    value = source["background"]
    if not isinstance(value, str) or not COLOR.fullmatch(value):
        raise AngeboteFehler(400, "Bitte eine gültige Hintergrundfarbe wählen.")
    return {"background": value}


def _theme_value(key, value):
    if key.endswith("_color") or key.endswith("_background"):
        if not COLOR.fullmatch(str(value)):
            raise AngeboteFehler(400, "Bitte die Gestaltungsfarben prüfen.")
    elif key == "font" and value not in FONTS:
        raise AngeboteFehler(400, "Bitte eine gültige Schrift wählen.")
    elif key == "price_shape" and value not in PRICE_SHAPES:
        raise AngeboteFehler(400, "Bitte eine gültige Preisform wählen.")
    elif key == "price_preset" and value not in PRICE_PRESETS:
        raise AngeboteFehler(400, "Bitte eine gültige Preisschildvorlage wählen.")
    elif key in ("name_size", "price_size", "details_size"):
        value = _number(value, "die Schriftgröße", 14, 100)
    elif key == "image_rotation":
        value = _number(value, "die Bilddrehung", -180, 180)
    elif key == "image_scale":
        value = _number(value, "die Bildgröße", 20, 200)
    elif key == "marker_type" and value not in MARKER_TYPES:
        raise AngeboteFehler(400, "Bitte einen gültigen Ersparnismarker wählen.")
    elif key == "marker_palette" and value not in MARKER_PALETTES:
        raise AngeboteFehler(400, "Bitte eine gültige Ersparnis-Farbwelt wählen.")
    elif key == "marker_scale":
        value = _number(value, "die Größe des Ersparnismarkers", 80, 180)
    return value


def _target_styles(raw):
    """Eigener Stil je Ausgabeziel (Kachel, Einzelflyer, Waage); fehlt er, gilt der Stil des Flyers."""
    if raw is None:
        return {}
    if not isinstance(raw, dict) or set(raw) - {"card", "single", "scale", "scale_small"}:
        raise AngeboteFehler(400, "Bitte die Gestaltung der Ausgabeziele prüfen.")
    result = {}
    for target, style in raw.items():
        if not isinstance(style, dict) or set(style) - set(THEME_DEFAULTS) - {"template", "color", "background", "decoration"}:
            raise AngeboteFehler(400, "Bitte die Gestaltung der Ausgabeziele prüfen.")
        checked = {}
        for key, value in style.items():
            if key == "template" and value not in TEMPLATES:
                raise AngeboteFehler(400, "Bitte eine gültige Gestaltung wählen.")
            if key in ("color", "background"):
                if not COLOR.fullmatch(str(value)):
                    raise AngeboteFehler(400, "Bitte eine gültige Farbe wählen.")
            elif key == "decoration":
                value = _decoration(value)
            elif key != "template":
                value = _theme_value(key, value)
            checked[key] = value
        result[target] = checked
    return result


def _design_origin(raw):
    if (not isinstance(raw, dict) or set(raw) != {"schema", "targets"}
            or type(raw.get("schema")) is not int or raw["schema"] != 1
            or not isinstance(raw["targets"], dict)
            or set(raw["targets"]) - {"sheet", "card", "single", "scale", "scale_small"}):
        raise AngeboteFehler(400, "Bitte die gespeicherte Vorlagenherkunft prüfen.")
    for values in raw["targets"].values():
        if not isinstance(values, dict) or len(values) > 300:
            raise AngeboteFehler(400, "Die Vorlagenherkunft ist zu umfangreich.")
        for key, value in values.items():
            if not isinstance(key, str) or not re.fullmatch(r"[a-zA-Z_][a-zA-Z0-9_.]{0,100}", key):
                raise AngeboteFehler(400, "Bitte die Vorlageneigenschaften prüfen.")
            if (value is not None and not isinstance(value, bool)
                    and not (isinstance(value, str) and len(value) <= 200)
                    and not (isinstance(value, (int, float)) and math.isfinite(value) and abs(value) <= 100000000)):
                raise AngeboteFehler(400, "Bitte die Werte der Vorlagenherkunft prüfen.")
    return copy.deepcopy(raw)


def _design_provenance(raw, allowed_targets=("sheet", "card", "single", "scale", "scale_small")):
    if (not isinstance(raw, dict) or set(raw) != {"schema", "targets"}
            or type(raw.get("schema")) is not int or raw["schema"] != 1
            or not isinstance(raw["targets"], dict)
            or set(raw["targets"]) - set(allowed_targets)):
        raise AngeboteFehler(400, "Bitte die gespeicherte Designherkunft prüfen.")
    result = {"schema": 1, "targets": {}}
    for target, entry in raw["targets"].items():
        if (not isinstance(entry, dict) or set(entry) != {"name", "snapshot"}
                or not isinstance(entry["name"], str) or not entry["name"].strip()
                or len(entry["name"]) > 80 or any(ord(char) < 32 for char in entry["name"])):
            raise AngeboteFehler(400, "Bitte den Namen der Designherkunft prüfen.")
        if target == "homepage":
            _homepage(entry["snapshot"])
            snapshot = copy.deepcopy(entry["snapshot"])
        elif isinstance(entry["snapshot"], dict) and "cms" in entry["snapshot"]:
            snapshot = entry["snapshot"]
            kind = "flyer" if target == "single" else "plakat"
            cms = snapshot["cms"]
            if (target in ("scale", "scale_small") or set(snapshot) != {"cms"} or not isinstance(cms, dict)
                    or set(cms) != {"config", f"{kind}_article_overrides"}
                    or not isinstance(cms["config"], dict)
                    or f"{kind}Template" not in cms["config"]):
                raise AngeboteFehler(400, "Bitte den CMS-Designherkunft-Snapshot prüfen.")
            validation = copy.deepcopy(cms)
            other = "plakat" if kind == "flyer" else "flyer"
            if (any(key.startswith(f"{other}_") or key in (
                    f"{other}Template", f"priceFont{other.title()}", f"savingsScale{other.title()}")
                    for key in cms["config"])
                    or not isinstance(cms[f"{kind}_article_overrides"], dict)
                    or any(not isinstance(value, dict) for value in cms[f"{kind}_article_overrides"].values())):
                raise AngeboteFehler(400, "Bitte den bereichsbezogenen CMS-Designherkunft-Snapshot prüfen.")
            validation["config"].setdefault(f"{other}Template", "classic-red")
            validation[f"{other}_article_overrides"] = {}
            _cms_design(validation, [])
            snapshot = copy.deepcopy(snapshot)
        else:
            checked = _target_styles({"card": entry["snapshot"]}).get("card")
            snapshot = copy.deepcopy(entry["snapshot"]) if checked else None
        if not snapshot:
            raise AngeboteFehler(400, "Bitte den Designherkunft-Snapshot prüfen.")
        result["targets"][target] = {"name": entry["name"], "snapshot": snapshot}
    return result


def _layout(raw, items):
    if not isinstance(raw, dict):
        raise AngeboteFehler(400, "Die Gestaltung konnte nicht gelesen werden.")
    mode, template = raw.get("mode", "template"), raw.get("template", "land")
    if mode not in ("template", "free") or template not in TEMPLATES:
        raise AngeboteFehler(400, "Bitte eine gültige Gestaltung wählen.")
    density = _number(raw.get("density", 4), "die Artikelzahl", 4, 6, integer=True)
    if density not in (4, 6):
        raise AngeboteFehler(400, "Bitte vier oder sechs Artikel je Vorlagenseite wählen.")
    color, background = raw.get("color", "#bb421e"), raw.get("background", "#fffdf6")
    if not COLOR.fullmatch(str(color)) or not COLOR.fullmatch(str(background)):
        raise AngeboteFehler(400, "Bitte eine gültige Farbe wählen.")
    pages = raw.get("pages", [])
    targets = raw.get("targets", {})
    if not isinstance(pages, list) or len(pages) > MAX_PAGES or not isinstance(targets, dict) or set(targets) - {"card", "single", "scale", "scale_small"}:
        raise AngeboteFehler(400, "Der Flyer enthält zu viele Seiten oder Kacheln.")
    known, seen, result = {i["id"] for i in items}, set(), []
    for page in pages:
        if not isinstance(page, dict) or not isinstance(page.get("elements"), list):
            raise AngeboteFehler(400, "Bitte die Flyerseiten prüfen.")
        result.append({"elements": _elements(page["elements"], known, seen, WIDTH, HEIGHT),
                       **_background(page)})
    dimensions = {"card": (420, 480), "single": (800, 1130), "scale": (800, 462), "scale_small": (800, 280)}
    target_result = {}
    for target, (width, height) in dimensions.items():
        source = targets.get(target, [])
        if not isinstance(source, list) or len(source) > MAX_ITEMS:
            raise AngeboteFehler(400, "Bitte die Zielgestaltungen prüfen.")
        target_items, result_target = set(), []
        for item_layout in source:
            if (not isinstance(item_layout, dict) or item_layout.get("item_id") not in known
                    or item_layout["item_id"] in target_items
                    or not isinstance(item_layout.get("elements"), list)):
                raise AngeboteFehler(400, "Bitte die Zielgestaltungen prüfen.")
            target_items.add(item_layout["item_id"])
            result_target.append({"item_id": item_layout["item_id"],
                                  "elements": _elements(item_layout["elements"], known, seen, width, height),
                                  **_background(item_layout)})
        if target != "scale_small" or result_target:
            target_result[target] = result_target
    theme = {key: _theme_value(key, raw.get(key, default)) for key, default in THEME_DEFAULTS.items()}
    target_styles = _target_styles(raw.get("target_styles"))
    adjustments = raw.get("adjustments", {})
    if not isinstance(adjustments, dict) or len(adjustments) > 400:
        raise AngeboteFehler(400, "Bitte die Vorlagenanpassungen prüfen.")
    normalized_adjustments = {}
    for key, value in adjustments.items():
        if (not isinstance(key, str)
                or not re.fullmatch(r"(sheet|card|single|scale_small|scale):(page|[0-5]):[a-z_]+:\d{1,3}", key)
                or not isinstance(value, dict) or set(value) != {"dx", "dy", "scale", "rotation"}):
            raise AngeboteFehler(400, "Bitte die Vorlagenanpassungen prüfen.")
        normalized_adjustments[key] = {
            field: _number(value[field], "die Vorlagenanpassungen", low, high)
            for field, low, high in (("dx", -1000, 1000), ("dy", -1500, 1500),
                                     ("scale", .2, 3), ("rotation", -180, 180))
        }
    cms = {"cms": _cms_design(raw["cms"], items)} if "cms" in raw else {}
    decoration = {"decoration": _decoration(raw["decoration"])} if "decoration" in raw else {}
    origin = {"design_origin": _design_origin(raw["design_origin"])} if "design_origin" in raw else {}
    provenance = {"design_provenance": _design_provenance(raw["design_provenance"])} if "design_provenance" in raw else {}
    return {"mode": mode, "template": template, "density": density,
            "color": color, "background": background, "pages": result,
            "targets": target_result, "adjustments": normalized_adjustments, **theme, **cms, **decoration, **origin,
            **({"target_styles": target_styles} if target_styles else {}), **provenance}


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
        if not publish:
            item["barcode"] = _text(raw_item.get("barcode", ""), "die EAN", 80)
            item["retail_price_cents"] = _number(raw_item.get("retail_price_cents"),
                                                  "den Stammverkaufspreis", 0, 100000000,
                                                  integer=True, optional=True)
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
    if "cms" in result["layout"] and result["kind"] != "weekly":
        raise AngeboteFehler(400, "Die CMS-Wochenvorlage ist nur für Wochenangebote vorgesehen.")
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
        targets = result["layout"]["targets"]
        if any(targets.values()):
            dimensions = {"card": (420, 480), "single": (800, 1130), "scale": (800, 462), "scale_small": (800, 280)}
            for target, (width, height) in dimensions.items():
                if target == "scale_small" and not targets.get(target):
                    continue
                layouts = {entry["item_id"]: entry["elements"] for entry in targets[target]}
                if set(layouts) != {item["id"] for item in items}:
                    raise AngeboteFehler(422, "Für jeden Artikel muss jede Ausgabe gestaltet sein.")
                for item in items:
                    for role in required:
                        if not any(el["type"] == role and el["item_id"] == item["id"] and
                                   _readable(el, width, height) for el in layouts[item["id"]]):
                            raise AngeboteFehler(422, "In einer Ausgabe fehlen lesbare Artikel-, Preis-, Pfand- oder Grundpreisangaben.")
    return result


def _readable(el, width=WIDTH, height=HEIGHT):
    angle = math.radians(el["rotation"])
    half_w = (abs(math.cos(angle)) * el["w"] + abs(math.sin(angle)) * el["h"]) / 2
    half_h = (abs(math.sin(angle)) * el["w"] + abs(math.cos(angle)) * el["h"]) / 2
    cx, cy = el["x"] + el["w"] / 2, el["y"] + el["h"] / 2
    return (not el["hidden"] and el["opacity"] >= .5 and el["font_size"] >= 12
            and cx - half_w >= -1 and cy - half_h >= -1
            and cx + half_w <= width + 1 and cy + half_h <= height + 1)


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
        if "homepage" in raw or (stored and "homepage" in stored):
            design["homepage"] = _homepage(raw.get("homepage", (stored or {}).get("homepage", {})))
        for kind in ("scale_large", "scale_small"):
            if kind in raw or (stored and kind in stored):
                design[kind] = _layout(raw.get(kind, (stored or {}).get(kind)), [])
                design[kind]["pages"] = []
                design[kind]["mode"] = "template"
        if "design_provenance" in raw or (stored and "design_provenance" in stored):
            provenance = raw.get("design_provenance", (stored or {}).get("design_provenance", {}))
            design["design_provenance"] = _design_provenance(provenance, ("homepage",))
        if "presets" in raw or (stored and "presets" in stored):
            presets = raw.get("presets", stored.get("presets", []) if stored else [])
            if not isinstance(presets, list) or len(presets) > MAX_ITEMS:
                raise AngeboteFehler(400, "Bitte die eigenen Designvorlagen prüfen.")
            design["presets"] = []
            for preset in presets:
                if not isinstance(preset, dict) or set(preset) != {"name", "layout"}:
                    raise AngeboteFehler(400, "Bitte die eigene Designvorlage prüfen.")
                name = _text(preset["name"], "den Vorlagennamen", 80)
                if not name:
                    raise AngeboteFehler(400, "Bitte der Vorlage einen Namen geben.")
                layout = _layout(preset["layout"], [])
                if layout["pages"] or any(layout["targets"].values()):
                    raise AngeboteFehler(400, "Designvorlagen dürfen keine Artikeldaten enthalten.")
                design["presets"].append({"name": name, "layout": layout})
        if stored is None:
            self.store.create("design/defaults.json", design)
        else:
            self.store.replace("design/defaults.json", design, etag)
        return design

    def homepage(self):
        try:
            return _homepage(self.design().get("homepage", {}))
        except AngeboteFehler as exc:
            if exc.status != 400:
                raise
            logging.error("[angebote] Ungültige gespeicherte Homepage-Gestaltung")
            raise AngeboteFehler(503, "Die gespeicherte Homepage-Gestaltung konnte nicht gelesen werden.") from exc

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

    def delete(self, action_id, version):
        head, etag = self._head(action_id)
        self._version(head, version)
        self.store.delete("actions/" + head["id"] + ".json", etag)

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
