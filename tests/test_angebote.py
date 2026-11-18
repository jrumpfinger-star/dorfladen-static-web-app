"""Angebotsvertrag ohne Live-Zugriffe: python tests\\test_angebote.py."""

import copy
import io
import json
import os
import sys
import unittest
from datetime import datetime, timezone
from unittest.mock import MagicMock, patch

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "api"))

from shared.angebote import (AngeboteFehler, AngeboteService, TEMPLATES, active, base_cents,
                             normalize, today)


def draft(kind="drinks"):
    item_id = "1" * 32
    roles = ["name", "price"] + (["pack", "deposit", "base"] if kind == "drinks" else [])
    return {
        "kind": kind, "title": "Unsere Angebote",
        "valid_from": "2026-11-16", "valid_to": "2026-11-21",
        "items": [{"id": item_id, "name": "Unser Getränk", "article_number": "KA40015",
                   "barcode": "4000000000001", "retail_price_cents": 1499,
                   "price_cents": 1249, "old_price_cents": None, "units": 20,
                   "volume_ml": 500, "packaging": "Mehrweg", "deposit_cents": 310,
                   "deposit_free": False, "image_id": ""}],
        "layout": {"pages": [{"elements": [
            {"id": format(i + 10, "032x"), "type": role, "item_id": item_id,
             "x": 40, "y": i * 70 + 50, "w": 300, "h": 60}
            for i, role in enumerate(roles)]}]},
    }


class MemoryStore:
    def __init__(self, namespace="test", storage=None):
        self.namespace = namespace
        self.data = storage if storage is not None else {}
        self.fail_replace = False

    def _key(self, path):
        return self.namespace + "/" + path

    def get(self, path):
        value = self.data.get(self._key(path))
        return (copy.deepcopy(value[0]), str(value[1])) if value else (None, None)

    def create(self, path, value):
        if self._key(path) in self.data:
            raise AngeboteFehler(409, "Konflikt")
        self.data[self._key(path)] = (copy.deepcopy(value), 1)

    def replace(self, path, value, etag):
        _, current = self.get(path)
        if self.fail_replace or current != etag:
            raise AngeboteFehler(409, "Konflikt")
        self.data[self._key(path)] = (copy.deepcopy(value), int(etag) + 1)

    def list(self, prefix):
        return [copy.deepcopy(value[0]) for key, value in self.data.items()
                if key.startswith(self._key(prefix))]

    def put_image(self, image_id, data, mime):
        self.create("images/" + image_id, [data, mime])

    def delete(self, path, etag):
        _, current = self.get(path)
        if self.fail_replace or current != etag:
            raise AngeboteFehler(409, "Konflikt")
        del self.data[self._key(path)]

    def get_image(self, image_id):
        image, _ = self.get("images/" + image_id)
        return image


class AngeboteTests(unittest.TestCase):
    def setUp(self):
        self.store = MemoryStore()
        self.now = datetime(2026, 11, 18, 12, tzinfo=timezone.utc)
        self.service = AngeboteService(self.store, self.now)

    def error(self, code, fn, *args, **kwargs):
        with self.assertRaises(AngeboteFehler) as cm:
            fn(*args, **kwargs)
        self.assertEqual(cm.exception.status, code, str(cm.exception))

    def test_TC_F14_03_weekly_design_snapshot_isolated_and_public(self):
        data = draft("weekly")
        key = data["items"][0]["name"].lower().replace(" ", "_")
        data["layout"]["cms"] = {
            "config": {"plakatTemplate": "classic-red", "flyerTemplate": "modern-mag-xl",
                       "plakat_decoBgColor": "#123456",
                       "tplColors": {"plakat:classic-red": {"bgColor_grad": True, "bgColor_c2": "#abcdef"}}},
            "plakat_article_overrides": {key: {"imgDx": 23, "copies": [{"type": "ghost", "dx": 12}]},
                                       "unrelated": {"customImg": None}},
            "flyer_article_overrides": {key: {"priceDy": -12}},
        }
        head = self.service.create(data)
        self.assertNotIn("unrelated", head["draft"]["layout"]["cms"]["plakat_article_overrides"])
        head = self.service.publish(head["id"], head["version"])
        data["layout"]["cms"]["config"]["plakat_decoBgColor"] = "#ffffff"
        public = self.service.public()[0]["data"]["layout"]["cms"]
        self.assertEqual(public["config"]["plakat_decoBgColor"], "#123456")
        self.assertEqual(public["plakat_article_overrides"][key]["imgDx"], 23)
        duplicate = self.service.duplicate(head["id"])
        self.assertEqual(duplicate["draft"]["layout"]["cms"], head["draft"]["layout"]["cms"])

    def test_TC_F14_03_invalid_weekly_design_rejected(self):
        for config in ({"plakatTemplate": "land", "flyerTemplate": "classic-red"},
                       {"plakatTemplate": "classic-red", "flyerTemplate": "classic-red", "secret": "no"}):
            data = draft("weekly")
            data["layout"]["cms"] = {"config": config, "plakat_article_overrides": {}, "flyer_article_overrides": {}}
            self.error(400, normalize, data)
        data["layout"]["cms"]["config"] = {"plakatTemplate": "classic-red", "flyerTemplate": "classic-red"}
        data["layout"]["cms"]["plakat_article_overrides"] = {"test": {"customImg": "https://example.invalid/image.png"}}
        self.error(400, normalize, data)
        data["layout"]["cms"]["plakat_article_overrides"] = {}
        data["kind"] = "drinks"
        self.error(400, normalize, data)

    def test_TC_F38_04_weekly_price_image_colors_survive_publication(self):
        data = draft("weekly")
        config = {"plakatTemplate": "classic-red", "flyerTemplate": "modern-mag-xl"}
        for kind in ("plakat", "flyer"):
            config.update({f"{kind}_tagShape": "price-image", f"{kind}_tagPreset": "price-image"})
            for key, color in (("priceImageColor", "#ed1c24"), ("priceOutlineColor", "#ffffff"),
                               ("priceStripColor", "#fff000"), ("priceOldColor", "#000000"),
                               ("priceStrikeColor", "#ed1c24")):
                config[f"{kind}_{key}"] = color
        data["layout"]["cms"] = {
            "config": config, "plakat_article_overrides": {}, "flyer_article_overrides": {}
        }
        head = self.service.create(data)
        self.service.publish(head["id"], head["version"])
        self.assertEqual(self.service.public()[0]["data"]["layout"]["cms"]["config"], config)

    def test_TC_F44_03_inline_standards_survive_snapshot_and_reject_invalid_values(self):
        data = draft("weekly")
        config = {"plakatTemplate": "classic-red", "flyerTemplate": "modern-mag-xl",
                  "plakat_inline": {"imgDx": 12, "imgScale": 110, "priceRot": -15},
                  "flyer_inline": {"priceDy": -12, "priceScale": 90}}
        data["layout"]["cms"] = {
            "config": config, "plakat_article_overrides": {}, "flyer_article_overrides": {}
        }
        head = self.service.create(data)
        self.service.publish(head["id"], head["version"])
        self.assertEqual(self.service.public()[0]["data"]["layout"]["cms"]["config"], config)
        for invalid in ([], {"imgDx": True}, {"imgScale": 0}, {"priceRot": 181},
                        {"imgDx": float("inf")}, {"customImg": "no"}):
            with self.subTest(invalid=invalid):
                data["layout"]["cms"]["config"]["plakat_inline"] = invalid
                self.error(400, normalize, data)

    def test_TC_F64_01_section_markers_survive_snapshot_publication_and_duplicate(self):
        data = draft("weekly")
        config = {"plakatTemplate": "classic-red", "flyerTemplate": "modern-mag-xl",
                  "savingsMarkerType": "starburst", "savingsPalette": "harmonie",
                  "plakat_savingsMarkerType": "heart", "plakat_savingsPalette": "midnight-gold",
                  "flyer_savingsMarkerType": "", "flyer_savingsPalette": ""}
        data["layout"]["cms"] = {
            "config": config, "plakat_article_overrides": {}, "flyer_article_overrides": {}
        }
        head = self.service.create(data)
        head = self.service.publish(head["id"], head["version"])
        self.assertEqual(self.service.public()[0]["data"]["layout"]["cms"]["config"], config)
        duplicate = self.service.duplicate(head["id"])
        self.assertEqual(duplicate["draft"]["layout"]["cms"]["config"], config)
        for key in ("plakat_savingsMarkerType", "flyer_savingsPalette"):
            for invalid in ("unknown", None, True, 4, {}):
                with self.subTest(key=key, invalid=invalid):
                    broken = copy.deepcopy(data)
                    broken["layout"]["cms"]["config"][key] = invalid
                    self.error(400, normalize, broken)

    def test_TC_F15_02_delete_requires_current_version_and_ends_publication(self):
        head = self.service.create(draft())
        head = self.service.publish(head["id"], head["version"])
        self.assertEqual(len(self.service.public()), 1)
        self.error(409, self.service.delete, head["id"], head["version"] - 1)
        self.store.fail_replace = True
        self.error(409, self.service.delete, head["id"], head["version"])
        self.assertEqual(len(self.service.public()), 1)
        self.store.fail_replace = False
        self.service.delete(head["id"], head["version"])
        self.assertEqual(self.service.list(), [])
        self.assertEqual(self.service.public(), [])

    def test_TC_F16_design_adjustments_and_markers_survive_publication(self):
        data = draft()
        data["layout"].update({
            "marker_type": "heart", "marker_palette": "ocean-blue", "marker_scale": 140,
            "adjustments": {"sheet:0:image:0": {"dx": 12, "dy": -23, "scale": 1.1, "rotation": 15}},
        })
        head = self.service.create(data)
        self.service.publish(head["id"], head["version"])
        public = self.service.public()[0]["data"]["layout"]
        for key in ("marker_type", "marker_palette", "marker_scale", "adjustments"):
            self.assertEqual(public[key], data["layout"][key])

    def test_TC_F16_invalid_marker_and_transform_values_rejected(self):
        for field, value in (("marker_type", "invalid"), ("marker_palette", "invalid"), ("marker_scale", 181),
                             ("adjustments", {"sheet:0:image:0": {"dx": 0, "dy": 0, "scale": 4, "rotation": 0}}),
                             ("adjustments", {"invalid": {"dx": 0, "dy": 0, "scale": 1, "rotation": 0}})):
            data = draft()
            data["layout"][field] = value
            self.error(400, normalize, data)

    def test_TC_F23_target_styles_survive_publication_and_are_validated(self):
        data = draft()
        data["layout"]["target_styles"] = {"card": {"template": "half-red", "marker_type": "pill", "text_color": "#112233"}}
        head = self.service.create(data)
        self.service.publish(head["id"], head["version"])
        public = self.service.public()[0]["data"]["layout"]
        self.assertEqual(public["target_styles"], data["layout"]["target_styles"])
        for styles in ({"sheet": {}}, {"card": {"template": "unbekannt"}}, {"card": {"marker_type": "invalid"}},
                       {"single": {"text_color": "rot"}}, {"scale": {"unbekannt": 1}}, {"card": []}, []):
            data = draft()
            data["layout"]["target_styles"] = styles
            self.error(400, normalize, data)

    def test_TC_F34_price_image_colors_survive_design_and_publication(self):
        colors = {"color": "#1122aa", "price_background": "#aaff22",
                  "price_outline_color": "#ddccff", "old_price_color": "#112233",
                  "price_strike_color": "#ff44aa"}
        settings = self.service.design()
        settings["drinks"].update({"template": "price-image", **colors})
        saved = self.service.save_design(0, settings)
        data = draft()
        data["layout"].update({**saved["drinks"], "pages": data["layout"]["pages"],
                               "target_styles": {"card": {"template": "price-image", **colors}}})
        head = self.service.create(data)
        self.service.publish(head["id"], head["version"])
        public = self.service.public()[0]["data"]["layout"]
        self.assertEqual(public["template"], "price-image")
        for key, value in colors.items():
            self.assertEqual(public[key], value)
            self.assertEqual(public["target_styles"]["card"][key], value)
        for key in ("price_outline_color", "old_price_color", "price_strike_color"):
            invalid = draft()
            invalid["layout"][key] = "keine-farbe"
            self.error(400, normalize, invalid)
            invalid = draft()
            invalid["layout"]["target_styles"] = {"card": {key: "#12"}}
            self.error(400, normalize, invalid)

    def test_TC_F49_price_presets_survive_target_styles_and_publication(self):
        data = draft()
        data["layout"].update({"price_preset": "price-image",
                               "target_styles": {"scale": {"price_preset": "green-rounded"}}})
        head = self.service.create(data)
        self.service.publish(head["id"], head["version"])
        public = self.service.public()[0]["data"]["layout"]
        self.assertEqual(public["price_preset"], "price-image")
        self.assertEqual(public["target_styles"]["scale"]["price_preset"], "green-rounded")
        for value in ("unknown", None, [], 42):
            invalid = draft()
            invalid["layout"]["price_preset"] = value
            self.error(400, normalize, invalid)

    def test_TC_F36_homepage_roundtrip_validation_and_namespace(self):
        service = AngeboteService(MemoryStore())
        raw = service.design()
        raw["homepage"] = {"tagBg": "#123456", "showLeaf": True, "imgSize": 110}
        saved = service.save_design(0, raw)
        self.assertEqual(service.homepage()["tagBg"], "#123456")
        older_client = copy.deepcopy(saved)
        del older_client["homepage"]
        service.save_design(1, older_client)
        self.assertTrue(service.homepage()["showLeaf"])
        self.assertEqual(AngeboteService(MemoryStore("other", service.store.data)).homepage()["tagBg"], "#a51d2d")
        for invalid in ([], {"tagBg": "red"}, {"showLeaf": 1}, {"imgSize": 1000}, {"unknown": True}):
            with self.subTest(invalid=invalid):
                current = service.design()
                current["homepage"] = invalid
                with self.assertRaises(AngeboteFehler):
                    service.save_design(current["version"], current)
        with self.assertRaises(AngeboteFehler):
            service.save_design(0, raw)
        stored, etag = service.store.get("design/defaults.json")
        stored["homepage"] = {"tagBg": "broken"}
        service.store.replace("design/defaults.json", stored, etag)
        with self.assertRaises(AngeboteFehler) as failure:
            service.homepage()
        self.assertEqual(failure.exception.status, 503)

    def test_TC_F61_extended_palette_roles_roundtrip_and_validation(self):
        colors = {key: "#123456" for key in (
            "header_background", "header_accent", "date_color", "divider_color",
            "price_bar_background", "price_bar_border")}
        colors.update(background_gradient=True, background_color2="#abcdef",
                      background_direction="135deg", background_pct=37)
        data = draft()
        data["layout"].update(decoration=colors, target_styles={
            "card": {"decoration": colors}, "single": {"decoration": colors},
            "scale": {"decoration": colors}})
        head = self.service.create(data)
        self.service.publish(head["id"], head["version"])
        layout = self.service.public()[0]["data"]["layout"]
        self.assertEqual(layout["decoration"], colors)
        for target in ("card", "single", "scale"):
            self.assertEqual(layout["target_styles"][target]["decoration"], colors)
        settings = self.service.design()
        settings["drinks"]["decoration"] = colors
        self.service.save_design(settings["version"], settings)
        self.assertEqual(self.service.design()["drinks"]["decoration"], colors)
        for key in colors:
            if not key.endswith(("_color", "_background", "_accent", "_border")):
                continue
            invalid = draft()
            invalid["layout"]["decoration"] = {key: "keine Farbe"}
            self.error(400, normalize, invalid)

    def test_TC_F61_all_legacy_cms_palette_roles_survive_snapshot_roundtrip(self):
        roles = {key: "#123456" for key in (
            "headerBg", "headerAccent", "dateColor", "dividerColor", "priceBarBg",
            "priceBarBorder", "stattColor", "footerColor", "vorratColor", "priceTextColor")}
        roles.update(bgColor_grad=True, bgColor_c2="#abcdef", bgColor_dir="135deg",
                     bgColor_pct=37, imgBg_grad=True, imgBg_c2="#345678",
                     imgBg_dir="to right", imgBg_pct=63)
        for template in TEMPLATES[2:11]:
            with self.subTest(template=template):
                data = draft("weekly")
                config = {"plakatTemplate": template, "flyerTemplate": template,
                          "tplColors": {f"{kind}:{template}": copy.deepcopy(roles)
                                        for kind in ("plakat", "flyer")}}
                data["layout"]["cms"] = {
                    "config": config, "plakat_article_overrides": {}, "flyer_article_overrides": {}}
                head = self.service.create(data)
                self.service.publish(head["id"], head["version"])
                public = next(entry for entry in self.service.public() if entry["id"] == head["id"])
                self.assertEqual(public["data"]["layout"]["cms"]["config"], config)
                self.assertEqual(self.service.duplicate(head["id"])["draft"]["layout"]["cms"]["config"], config)

    def test_TC_F35_decoration_and_named_presets_roundtrip_and_validation(self):
        decoration = {"show_leaf": True, "leaf_size": 40, "leaf_color": "#123456",
                      "show_bag": True, "show_texture": True, "border_width": 4,
                      "border_color": "#aa2244", "background_gradient": True,
                      "background_color2": "#abcdef", "background_direction": "to right",
                      "background_pct": 35, "price_radius": 9, "price_skew": 12,
                      "price_scale": 110, "image_width_pct": 60, "image_dx": 8, "price_dy": 2}
        data = draft()
        data["layout"].update({"decoration": decoration, "price_shape": "ticket",
                               "target_styles": {"card": {"decoration": decoration, "price_shape": "hexagon"}}})
        head = self.service.create(data)
        self.service.publish(head["id"], head["version"])
        public = self.service.public()[0]["data"]["layout"]
        self.assertEqual(public["decoration"], decoration)
        self.assertEqual(public["target_styles"]["card"]["decoration"], decoration)
        settings = self.service.design()
        settings["presets"] = [{"name": "Sommer", "layout": {"template": "price-image", "decoration": decoration}}]
        saved = self.service.save_design(0, settings)
        self.assertEqual(self.service.design()["presets"][0]["layout"]["decoration"], decoration)
        legacy = copy.deepcopy(saved)
        del legacy["presets"]
        self.assertEqual(self.service.save_design(1, legacy)["presets"], saved["presets"])
        for value in ({"show_leaf": "ja"}, {"leaf_color": "rot"}, {"leaf_size": 51},
                      {"background_direction": "up"}, {"price_scale": 151}, {"unknown": True}, []):
            invalid = draft()
            invalid["layout"]["decoration"] = value
            self.error(400, normalize, invalid)
            invalid["layout"].pop("decoration")
            invalid["layout"]["target_styles"] = {"card": {"decoration": value}}
            self.error(400, normalize, invalid)
        for presets in ([{"name": "", "layout": {}}], [{"name": "Test", "layout": {"template": "unknown"}}],
                        [{"name": "Test", "layout": draft()["layout"]}], "invalid"):
            invalid = self.service.design()
            invalid["presets"] = presets
            self.error(400, self.service.save_design, 2, invalid)

    def test_TC_F2_01_exact_base_price(self):
        self.assertEqual(base_cents(draft()["items"][0]), 125)
        self.assertEqual(base_cents({"units": 1, "volume_ml": 8000, "price_cents": 100}), 13)

    def test_TC_F2_02_invalid_publication(self):
        for field, value in (("price_cents", 0), ("units", None), ("volume_ml", None),
                             ("packaging", ""), ("deposit_cents", None)):
            data = draft()
            data["items"][0][field] = value
            self.error(422, normalize, data, publish=True)
            normalize(data)
        for value in (True, float("nan"), float("inf"), -1, 12.5, "12"):
            data = draft()
            data["items"][0]["price_cents"] = value
            self.error(400, normalize, data)
        data = draft()
        data["valid_from"] = "2026-11-22"
        self.error(422, normalize, data, publish=True)

    def test_TC_F2_02_explicit_deposit_free(self):
        data = draft()
        data["items"][0].update(deposit_cents=0, deposit_free=False)
        self.error(422, normalize, data, publish=True)
        data["items"][0]["deposit_free"] = True
        normalize(data, publish=True)
        data["items"][0]["deposit_cents"] = 310
        self.error(422, normalize, data, publish=True)

    def test_TC_F2_03_no_procurement_fields(self):
        data = draft()
        data["supplier_secret"] = "internal"
        data["items"][0].update(einkaufspreis=100, bestelltext="internal", preis=999)
        normalized = normalize(data)
        self.assertNotIn("internal", json.dumps(normalized))
        self.assertNotIn("einkaufspreis", normalized["items"][0])

    def test_TC_F3_04_free_layout_roundtrip(self):
        data = draft()
        data["layout"].update(mode="free", font="Georgia")
        data["layout"]["pages"][0]["elements"].append({
            "id": "a" * 32, "type": "text", "text": "Dein Text",
            "x": 80, "y": 550, "w": 220, "h": 75, "rotation": 15, "opacity": .65,
        })
        head = self.service.create(data)
        self.assertEqual(self.service.get(head["id"])["draft"]["layout"]["mode"], "free")
        self.assertEqual(self.service.get(head["id"])["draft"]["layout"]["pages"][0]["elements"][-1]["rotation"], 15)

    def test_TC_F13_original_templates_and_logo_roundtrip(self):
        self.assertEqual(len(TEMPLATES), 18)
        for template in TEMPLATES:
            with self.subTest(template=template):
                data = draft()
                data["layout"].update(template=template, background="#f4f1ea")
                page = data["layout"]["pages"][0]
                page["background"] = "#ffffff"
                page["elements"].extend([
                    {"id": "a" * 32, "type": "logo", "x": 518, "y": 28,
                     "w": 236, "h": 70, "rotation": 5},
                    {"id": "b" * 32, "type": "discount", "item_id": "1" * 32,
                     "x": 40, "y": 600, "w": 80, "h": 30},
                ])
                head = self.service.create(data)
                stored = self.service.get(head["id"])["draft"]["layout"]
                self.assertEqual(stored["template"], template)
                self.assertEqual(stored["pages"][0]["background"], "#ffffff")
                self.assertEqual(stored["pages"][0]["elements"][-2]["type"], "logo")
                self.assertEqual(stored["pages"][0]["elements"][-2]["rotation"], 5)
        data["layout"]["template"] = "unknown"
        self.error(400, normalize, data)
        data["layout"]["template"] = "land"
        for invalid in ("red", "#fff", None, 123):
            data["layout"]["pages"][0]["background"] = invalid
            self.error(400, normalize, data)

    def test_TC_F11_independent_target_layouts_and_public_image_scope(self):
        data = draft()
        item_id = data["items"][0]["id"]
        image_id = "b" * 32
        data["layout"]["targets"] = {}
        for target, width, image_y in (("card", 420, 320), ("single", 800, 900), ("scale", 800, 280)):
            roles = [
                {"id": format(i + 100 + len(data["layout"]["targets"]) * 10, "032x"),
                 "type": role, "item_id": item_id, "x": 12, "y": i * 44 + 12,
                 "w": width - 24, "h": 40}
                for i, role in enumerate(("name", "price", "pack", "deposit", "base"))
            ]
            roles.append({"id": format(200 + len(data["layout"]["targets"]), "032x"),
                          "type": "image", "item_id": item_id, "image_id": image_id,
                          "x": 12, "y": image_y, "w": min(180, width - 24), "h": 40})
            data["layout"]["targets"][target] = [{"item_id": item_id, "elements": roles}]
        head = self.service.create(data)
        stored = head["draft"]
        self.assertEqual(stored["items"][0]["barcode"], "4000000000001")
        self.assertEqual(stored["items"][0]["retail_price_cents"], 1499)
        self.assertEqual(set(stored["layout"]["targets"]), {"card", "single", "scale"})
        for target in ("card", "single", "scale"):
            self.assertEqual(stored["layout"]["targets"][target][0]["item_id"], item_id)
        self.store.put_image(image_id, b"private-image", "image/png")
        head = self.service.publish(head["id"], head["version"])
        public = self.service.public()[0]["data"]
        for target in ("card", "single", "scale"):
            self.assertEqual(public["layout"]["targets"][target][0]["item_id"], item_id)
        self.assertTrue(self.service.image_public(image_id))
        self.assertNotIn("barcode", public["items"][0])
        self.assertNotIn("retail_price_cents", public["items"][0])

    def test_TC_F11_invalid_target_layout_is_rejected(self):
        data = draft()
        item_id = data["items"][0]["id"]
        data["layout"]["targets"] = {"card": [
            {"item_id": item_id,
             "elements": [{"id": "a" * 32, "type": "name", "item_id": item_id,
                           "x": 421, "y": 0, "w": 10, "h": 20}]},
        ]}
        self.error(400, normalize, data)
        data = draft()
        data["layout"]["targets"] = {"card": [{"item_id": "f" * 32, "elements": []}]}
        self.error(400, normalize, data)
        data = draft()
        data["layout"]["targets"] = {"unknown": []}
        self.error(400, normalize, data)

    def test_TC_F3_06_missing_mandatory_fields(self):
        for mutate in (lambda e: e.update(hidden=True), lambda e: e.update(opacity=.1),
                       lambda e: e.update(x=790), lambda e: e.update(font_size=11),
                       lambda e: e.update(x=0, y=0, rotation=90)):
            data = draft()
            mutate(data["layout"]["pages"][0]["elements"][1])
            self.error(422, normalize, data, publish=True)

    def test_TC_F4_01_drafts_are_private(self):
        head = self.service.create(draft())
        self.assertEqual(self.service.public(), [])
        self.assertEqual(head["version"], 1)
        self.assertFalse(self.service.image_public("a" * 32))

    def test_TC_F4_02_snapshot_isolation(self):
        head = self.service.create(draft())
        head = self.service.publish(head["id"], head["version"])
        revision = head["published_revision"]
        data = head["draft"]
        data["title"] = "Noch geheim"
        head = self.service.save(head["id"], head["version"], data)
        public = self.service.public()
        self.assertEqual(public[0]["data"]["title"], "Unsere Angebote")
        self.assertEqual(public[0]["revision"], revision)
        self.assertNotIn("Noch geheim", json.dumps(public))

    def test_TC_F4_02_conflict_and_failed_publication(self):
        head = self.service.create(draft())
        self.error(409, self.service.save, head["id"], 0, draft())
        head = self.service.publish(head["id"], head["version"])
        before = self.service.public()
        head = self.service.save(head["id"], head["version"], dict(draft(), title="Neu"))
        self.store.fail_replace = True
        self.error(409, self.service.publish, head["id"], head["version"])
        self.assertEqual(self.service.public(), before)

    def test_TC_F4_03_Berlin_boundaries_and_DST(self):
        self.assertEqual(today(datetime(2026, 11, 15, 23, 5, tzinfo=timezone.utc)), "2026-11-16")
        self.assertEqual(today(datetime(2026, 7, 1, 22, 5, tzinfo=timezone.utc)), "2026-07-02")
        for stamp in ("2026-03-29T00:59:00+00:00", "2026-03-29T01:01:00+00:00"):
            self.assertEqual(today(datetime.fromisoformat(stamp)), "2026-03-29")
        self.assertTrue(active(draft(), datetime(2026, 11, 15, 23, 0, tzinfo=timezone.utc)))
        self.assertTrue(active(draft(), datetime(2026, 11, 21, 22, 59, tzinfo=timezone.utc)))
        self.assertFalse(active(draft(), datetime(2026, 11, 21, 23, 0, tzinfo=timezone.utc)))
        self.assertFalse(active(draft(), datetime(2026, 11, 15, 22, 59, tzinfo=timezone.utc)))

    def test_TC_F4_01_images_only_current_published(self):
        data = draft()
        image_id = "b" * 32
        data["items"][0]["image_id"] = image_id
        head = self.service.create(data)
        self.error(422, self.service.publish, head["id"], head["version"])
        self.store.put_image(image_id, b"image", "image/jpeg")
        self.assertFalse(self.service.image_public(image_id))
        head = self.service.publish(head["id"], head["version"])
        self.assertTrue(self.service.image_public(image_id))
        later = AngeboteService(self.store, datetime(2026, 11, 22, tzinfo=timezone.utc))
        self.assertFalse(later.image_public(image_id))
        self.assertEqual(later.public(), [])

    def test_TC_F1_02_duplicate_is_independent_draft(self):
        head = self.service.create(draft())
        head = self.service.publish(head["id"], head["version"])
        new = self.service.duplicate(head["id"])
        self.assertNotEqual(new["id"], head["id"])
        self.assertIsNone(new["published_revision"])
        self.assertEqual(len(self.service.public()), 1)

    def test_TC_F8_01_namespace_isolation(self):
        a = AngeboteService(MemoryStore("preview-a", self.store.data), self.now)
        b = AngeboteService(MemoryStore("preview-b", self.store.data), self.now)
        head = a.create(draft())
        self.assertEqual(b.list(), [])
        self.error(404, b.get, head["id"])

    def test_TC_F9_01_03_design_is_versioned_copy(self):
        settings = self.service.design()
        head = self.service.create(dict(draft(), layout={**settings["drinks"], **draft()["layout"]}))
        before = copy.deepcopy(head)
        settings["drinks"]["color"] = "#0000ff"
        saved = self.service.save_design(0, settings)
        self.assertEqual(saved["version"], 1)
        self.assertEqual(self.service.design()["drinks"]["color"], "#0000ff")
        self.assertEqual(self.service.get(head["id"]), before)
        self.error(409, self.service.save_design, 0, settings)

    def test_malformed_layout_is_rejected(self):
        for field, value in (("item_id", []), ("image_id", {}), ("x", float("nan")), ("font", "url(evil)")):
            data = draft()
            data["layout"]["pages"][0]["elements"][0][field] = value
            if field == "image_id":
                data["layout"]["pages"][0]["elements"][0][field] = {"invalid": True}
            self.error(400, normalize, data)

    def test_TC_F4_04_corrupt_head_is_not_an_empty_list(self):
        self.store.create("actions/invalid.json", {"version": 1})
        with self.assertLogs(level="ERROR"):
            self.error(503, self.service.list)


class HttpTests(unittest.TestCase):
    def setUp(self):
        import azure.functions as func
        self.func = func
        self.store = MemoryStore()
        self.env = patch.dict(os.environ, {"CMS_AUTH_TOKEN": "test-auth", "ANGEBOTE_NAMESPACE": "preview-test"})
        self.env.start()

    def tearDown(self):
        self.env.stop()

    def call(self, method="GET", area="admin", body=None, params=None, action_id=None, auth=True):
        from shared.angebote_http import handle
        headers = {"X-CMS-Auth": "test-auth"} if auth else {}
        request = self.func.HttpRequest(method=method, url="http://localhost/api/test",
                                       params=params or {}, headers=headers, route_params={"id": action_id} if action_id else {},
                                       body=json.dumps(body).encode() if body is not None else b"")
        return handle(request, area, store_factory=lambda: self.store)

    def test_TC_F4_01_auth_is_not_optional(self):
        with patch.dict(os.environ, {"CMS_AUTH_ENFORCE": "false"}):
            self.assertEqual(self.call(auth=False).status_code, 401)
            self.assertEqual(self.call("POST", body={"data": draft()}, auth=False).status_code, 401)
        self.assertEqual(self.call("OPTIONS", auth=False).status_code, 204)

    def test_TC_F36_public_homepage_projection_and_write_auth(self):
        service = AngeboteService(self.store)
        design = service.design()
        design["homepage"] = {"cardBg": "#abcdef"}
        service.save_design(0, design)
        public = self.call(area="public", params={"view": "homepage"}, auth=False)
        data = json.loads(public.get_body())
        self.assertEqual(set(data), {"success", "homepage"})
        self.assertEqual(data["homepage"]["cardBg"], "#abcdef")
        self.assertEqual(self.call("PUT", params={"view": "design"}, body={"version": 1, "data": design}, auth=False).status_code, 401)

    def test_TC_F4_02_HTTP_contract(self):
        create = self.call("POST", body={"data": draft()})
        self.assertEqual(create.status_code, 200)
        action = json.loads(create.get_body())["action"]
        self.assertEqual(self.call("PUT", body={"version": 1, "data": draft()}, action_id=action["id"]).status_code, 200)
        self.assertEqual(self.call("POST", body={"version": 1}, action_id=action["id"], params={"action": "publish"}).status_code, 409)

    def test_TC_F15_02_delete_HTTP_auth_and_version(self):
        created = json.loads(self.call("POST", body={"data": draft()}).get_body())["action"]
        args = {"action_id": created["id"], "params": {"action": "delete"}}
        self.assertEqual(self.call("POST", body={"version": 1}, auth=False, **args).status_code, 401)
        self.assertEqual(self.call("POST", body={"version": 0}, **args).status_code, 409)
        self.assertEqual(self.call("POST", body={"version": 1}, **args).status_code, 200)
        self.assertEqual(self.call(action_id=created["id"]).status_code, 404)

    def test_TC_F4_01_image_upload_and_private_read(self):
        from PIL import Image
        from shared.angebote_http import handle
        image = io.BytesIO()
        Image.new("RGB", (100, 100), "green").save(image, "JPEG")
        request = self.func.HttpRequest(method="POST", url="http://localhost/api/angebote-bilder",
                                       headers={"X-CMS-Auth": "test-auth"}, body=image.getvalue())
        result = handle(request, "images", store_factory=lambda: self.store)
        self.assertEqual(result.status_code, 201)
        image_id = json.loads(result.get_body())["image_id"]
        self.assertEqual(self.call(area="images", action_id=image_id, auth=False).status_code, 404)
        self.assertEqual(self.call(area="images", action_id=image_id).status_code, 200)

    def test_TC_F4_04_storage_errors_are_not_empty_success(self):
        from azure.core.exceptions import ServiceRequestError
        with patch.object(self.store, "list", side_effect=ServiceRequestError("offline")):
            with self.assertLogs(level="ERROR"):
                self.assertEqual(self.call().status_code, 503)

    def test_TC_F5_03_public_has_no_admin_config(self):
        result = self.call(area="public", auth=False)
        self.assertEqual(result.status_code, 200)
        self.assertEqual(json.loads(result.get_body()), {"success": True, "actions": []})

    def test_TC_F4_01_missing_auth_configuration_fails_closed(self):
        with patch.dict(os.environ, {"CMS_AUTH_TOKEN": ""}):
            self.assertEqual(self.call().status_code, 503)

    def test_TC_F2_02_bad_JSON_and_ids(self):
        self.assertEqual(self.call("PUT", action_id="../bad", body={"version": 1}).status_code, 400)
        self.assertEqual(self.call("POST", body=[]).status_code, 400)
        self.assertEqual(self.call("DELETE").status_code, 405)

    def test_TC_F4_01_upload_rejects_non_images(self):
        from shared.angebote_http import handle
        request = self.func.HttpRequest(method="POST", url="http://localhost/api/angebote-bilder",
                                       headers={"X-CMS-Auth": "test-auth"}, body=b"not an image")
        self.assertEqual(handle(request, "images", store_factory=lambda: self.store).status_code, 415)


class BlobTests(unittest.TestCase):
    def setUp(self):
        self.container = MagicMock()
        self.container.get_container_properties.return_value = {"public_access": None}
        self.env = patch.dict(os.environ, {"STORAGE_CONN": "test-connection", "ANGEBOTE_NAMESPACE": "preview-test"})
        self.factory = patch("shared.angebote_store.BlobServiceClient")
        self.env.start()
        factory = self.factory.start()
        factory.from_connection_string.return_value.get_container_client.return_value = self.container

    def tearDown(self):
        self.factory.stop()
        self.env.stop()

    def test_TC_F4_01_existing_public_container_is_rejected(self):
        from shared.angebote_store import BlobStore
        self.container.get_container_properties.return_value = {"public_access": "blob"}
        with self.assertLogs(level="ERROR"), self.assertRaises(AngeboteFehler) as cm:
            BlobStore()
        self.assertEqual(cm.exception.status, 503)

    def test_TC_F8_01_real_adapter_uses_namespace_for_every_path(self):
        from shared.angebote_store import BlobStore
        from azure.core.exceptions import ResourceNotFoundError
        download = self.container.get_blob_client.return_value.download_blob.return_value
        download.readall.return_value = b'{"ok":true}'
        download.properties.etag = "e1"
        store = BlobStore()
        self.assertEqual(store.get("actions/test.json"), ({"ok": True}, "e1"))
        store.create("design/defaults.json", {"version": 1})
        store.put_image("a" * 32, b"photo", "image/jpeg")
        self.container.get_blob_client.assert_any_call("preview-test/actions/test.json")
        self.container.get_blob_client.assert_any_call("preview-test/design/defaults.json")
        self.container.get_blob_client.assert_any_call("preview-test/images/" + "a" * 32)
        self.container.list_blobs.return_value = []
        self.assertEqual(store.list("actions/"), [])
        self.container.list_blobs.assert_called_once_with(name_starts_with="preview-test/actions/")
        self.container.get_blob_client.return_value.download_blob.side_effect = ResourceNotFoundError()
        self.assertIsNone(store.get_image("b" * 32))

    def test_TC_F4_02_real_adapter_uses_conditional_ETag(self):
        from azure.core import MatchConditions
        from azure.core.exceptions import ResourceModifiedError
        from shared.angebote_store import BlobStore
        store = BlobStore()
        store.replace("actions/test.json", {"version": 2}, "e1")
        upload = self.container.get_blob_client.return_value.upload_blob
        self.assertEqual(upload.call_args.kwargs["etag"], "e1")
        self.assertEqual(upload.call_args.kwargs["match_condition"], MatchConditions.IfNotModified)
        upload.side_effect = ResourceModifiedError()
        with self.assertRaises(AngeboteFehler) as cm:
            store.replace("actions/test.json", {"version": 3}, "e1")
        self.assertEqual(cm.exception.status, 409)

    def test_TC_F15_02_delete_adapter_is_conditional_and_namespaced(self):
        from azure.core import MatchConditions
        from azure.core.exceptions import ResourceModifiedError
        from shared.angebote_store import BlobStore
        store = BlobStore()
        store.delete("actions/test.json", "e1")
        self.container.get_blob_client.assert_called_with("preview-test/actions/test.json")
        self.container.get_blob_client.return_value.delete_blob.assert_called_once_with(
            etag="e1", match_condition=MatchConditions.IfNotModified)
        self.container.get_blob_client.return_value.delete_blob.side_effect = ResourceModifiedError()
        with self.assertRaises(AngeboteFehler) as cm:
            store.delete("actions/test.json", "e1")
        self.assertEqual(cm.exception.status, 409)

    def test_TC_F4_04_corrupt_storage_is_reported(self):
        from shared.angebote_store import BlobStore
        store = BlobStore()
        for raw in (b"not-json", b"[]", b"\xff"):
            self.container.get_blob_client.return_value.download_blob.return_value.readall.return_value = raw
            with self.assertLogs(level="ERROR"), self.assertRaises(AngeboteFehler) as cm:
                store.get("actions/test.json")
            self.assertEqual(cm.exception.status, 503)

    def test_TC_F8_01_missing_or_invalid_namespace_never_uses_production(self):
        from shared.angebote_store import BlobStore
        for namespace in ("", "../production", "Preview", " "):
            with patch.dict(os.environ, {"ANGEBOTE_NAMESPACE": namespace}), self.assertRaises(AngeboteFehler) as cm:
                BlobStore()
            self.assertEqual(cm.exception.status, 503)


if __name__ == "__main__":
    unittest.main(verbosity=2)
