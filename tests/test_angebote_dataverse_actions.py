"""Transactional Dataverse offer actions; no live Dataverse calls."""

import importlib.util
import hashlib
import json
import os
import sys
import unittest
import uuid
from email import policy
from email.parser import BytesParser
from pathlib import Path
from types import SimpleNamespace
from unittest.mock import patch


ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "api"))
spec = importlib.util.spec_from_file_location(
    "angebote_dataverse_actions", ROOT / "api" / "angebote" / "__init__.py"
)
angebote = importlib.util.module_from_spec(spec)
spec.loader.exec_module(angebote)


def item(index=0):
    return {
        "id": f"{index + 1:032x}",
        "name": f"Getränk {index + 1}",
        "description": "gekühlt",
        "price_cents": 129,
        "old_price_cents": 149,
        "article_number": f"ART-{index + 1}",
        "barcode": f"400000000000{index}",
        "retail_price_cents": 199,
        "units": 20,
        "volume_ml": 500,
        "packaging": "Mehrweg",
        "deposit_cents": 25,
        "deposit_free": False,
        "werbebild_id": None,
    }


def body(items=None):
    return {
        "aktion_id": "a" * 32,
        "title": "Getränke-Angebote",
        "valid_from": "2026-11-16",
        "valid_to": "2026-11-22",
        "kind": "drinks",
        "layout": {
            "density": 4,
            "image_refs": {f"{1:032x}": "cms:ANG-abc123"},
            "pages": [{
                "elements": [{
                    "type": "image",
                    "image_id": "cms:ANG-abc123",
                }]
            }],
        },
        "items": items if items is not None else [item()],
        "original_ids": [],
    }


class Response:
    def __init__(self, status=200, data=None, text="", content_type="application/json"):
        self.status_code = status
        self._data = data or {}
        self.text = text
        self.headers = {"Content-Type": content_type}
        self.content = text.encode("utf-8")

    def json(self):
        return self._data


def batch_response(operations):
    batch = "batch_response"
    change = "changeset_response"
    parts = [f"--{batch}", f"Content-Type: multipart/mixed;boundary={change}", ""]
    new_id = 100
    for index, operation in enumerate(operations, 1):
        parts.extend([
            f"--{change}",
            "Content-Type: application/http",
            "Content-Transfer-Encoding: binary",
            f"Content-ID: {index}",
            "",
        ])
        if operation["method"] == "POST" and operation["path"] == "dl_angebotes":
            created = f"{new_id:032x}"
            new_id += 1
            parts.extend([
                "HTTP/1.1 201 Created",
                "Content-Type: application/json",
                f"OData-EntityId: https://example.invalid/api/data/v9.2/dl_angebote({created})",
                "",
                json.dumps({"dl_angeboteid": created}),
            ])
        else:
            parts.extend(["HTTP/1.1 204 No Content", "", ""])
    parts.extend([f"--{change}--", f"--{batch}--", ""])
    return Response(
        200, text="\r\n".join(parts),
        content_type=f"multipart/mixed; boundary={batch}",
    )


def parse_batch_request(raw, content_type):
    wrapper = (f"Content-Type: {content_type}\r\nMIME-Version: 1.0\r\n\r\n"
               ).encode("ascii") + raw
    message = BytesParser(policy=policy.default).parsebytes(wrapper)
    operations = []

    def collect(part):
        if part.is_multipart():
            for child in part.iter_parts():
                collect(child)
            return
        text = (part.get_payload(decode=True) or b"").decode("utf-8")
        request, _, payload = text.partition("\r\n\r\n")
        method, path, _ = request.splitlines()[0].split(" ", 2)
        operations.append({
            "method": method,
            "path": path,
            "payload": json.loads(payload) if payload.strip() else None,
        })

    collect(message)
    return operations


class DataverseActionsTests(unittest.TestCase):
    def setUp(self):
        self.headers = {"Authorization": "Bearer test"}
        self.base_url = "https://dv.example"
        self.meta = Response(200, {
            "value": [
                {"LogicalName": name, "AttributeType": type_name}
                for name, type_name in angebote.ACTION_COLUMN_TYPES.items()
            ]
        })

    def test_validate_accepts_cms_images_and_unbounded_by_layout_density(self):
        request = body([item(i) for i in range(7)])
        normalized = angebote._validate_action_body(request)
        self.assertEqual(len(normalized["items"]), 7)
        self.assertEqual(
            normalized["layout"]["pages"][0]["elements"][0]["image_id"],
            "cms:ANG-abc123",
        )
        self.assertEqual(
            normalized["layout"]["image_refs"],
            {f"{1:032x}": "cms:ANG-abc123"},
        )
        request["layout"]["image_refs"][f"{2:032x}"] = "b" * 32
        self.assertIn(
            f"{2:032x}",
            angebote._validate_action_body(request)["layout"]["image_refs"],
        )

    def test_action_ids_preserve_legacy_strings_exactly(self):
        for action_id in ("AKT-" + "f" * 32, "AKT-1763222400",
                          "AUTO-2026-11-16-Unsere Angebote"):
            request = body()
            request["aktion_id"] = action_id
            self.assertEqual(
                angebote._validate_action_body(request)["aktion_id"],
                action_id,
            )

    def test_auto_legacy_action_uses_verified_untagged_rows_and_migrates_id(self):
        action_id = "AUTO-2026-11-16-2026-11-22-Unsere Angebote"
        row_id = "eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee"
        legacy_row = {
            "dl_angeboteid": row_id,
            "dl_aktion_id": None,
            "dl_aktion_titel": "Unsere Angebote",
            "dl_gueltig_von": "2026-11-16",
            "dl_gueltig_bis": "2026-11-22",
            "dl_status": 101001,
            "@odata.etag": 'W/"legacy"',
        }
        unrelated = {
            "dl_angeboteid": "ffffffff-ffff-ffff-ffff-ffffffffffff",
            "dl_aktion_id": None,
            "dl_aktion_titel": "Other action",
            "dl_gueltig_von": "2026-11-16",
            "dl_gueltig_bis": "2026-11-22",
            "dl_status": 101001,
        }
        request = body([item()])
        request.update(aktion_id=action_id, original_ids=[row_id])
        request["revision"] = angebote._action_revision([legacy_row], None)
        request["items"][0]["id"] = row_id
        request["layout"]["image_refs"] = {row_id: "cms:ANG-abc123"}
        responses = [
            self.meta,
            Response(200, {"value": []}),
            Response(200, {"value": [legacy_row, unrelated]}),
            Response(200, {"value": []}),
        ]
        operations = [
            {"method": "PATCH", "path": f"dl_angebotes({row_id})"},
            {"method": "POST", "path": "dl_seiteninhalts"},
        ]

        def fake_post(url, **kwargs):
            transaction = kwargs["data"].decode("utf-8")
            self.assertIn(f'"dl_aktion_id":"{action_id}"', transaction)
            self.assertIn(f"If-Match: W/\"legacy\"", transaction)
            return batch_response(operations)

        with patch.object(angebote.requests, "get", side_effect=responses) as get_request, \
                patch.object(angebote.requests, "post", side_effect=fake_post):
            result = angebote._save_action(self.base_url, self.headers, request)
        self.assertEqual(result["aktion_id"], action_id)
        self.assertEqual(result["items"][0]["id"], row_id)
        self.assertEqual(
            get_request.call_args_list[2].kwargs["params"]["$filter"],
            "(dl_aktion_id eq null or dl_aktion_id eq '') and dl_status eq 101001",
        )

    def test_image_refs_require_uuid_keys_and_safe_or_existing_ids(self):
        for key, image_id in (
            ("not-a-uuid", "cms:ANG-1"),
            ("a" * 32, "cms:../private"),
            ("a" * 32, "cms:with/slash"),
            ("a" * 32, 'cms:quote"key'),
            ("a" * 32, "cms:control\nkey"),
            ("a" * 32, "private-image"),
        ):
            request = body()
            request["layout"]["image_refs"] = {key: image_id}
            with self.subTest(key=key, image_id=image_id), \
                    self.assertRaises(angebote.ActionRequestError):
                angebote._validate_action_body(request)

    def test_drinks_require_explicit_amount_packaging_and_deposit_choice(self):
        for field, value in (
            ("units", None), ("volume_ml", None), ("packaging", ""),
            ("deposit_free", None), ("deposit_cents", None),
        ):
            request = body()
            request["items"][0][field] = value
            with self.subTest(field=field), self.assertRaises(angebote.ActionRequestError):
                angebote._validate_action_body(request)

    def test_invalid_title_dates_and_nonpositive_price_are_rejected(self):
        for mutate in (
            lambda value: value.update(title=" "),
            lambda value: value.update(valid_from="2026-11-31"),
            lambda value: value.update(valid_to="2026-11-15"),
            lambda value: value["items"][0].update(price_cents=0),
        ):
            request = body()
            mutate(request)
            with self.assertRaises(angebote.ActionRequestError):
                angebote._validate_action_body(request)

    def test_batch_is_one_changeset_and_new_ids_are_returned(self):
        request = body([item(i) for i in range(7)])
        action_id = "AKT-" + "a" * 32
        request["aktion_id"] = action_id
        request["layout"] = {
            "mode": "template",
            "template": "land",
            "density": 4,
            "color": "#bb421e",
            "background": "#fffdf6",
            "pages": [],
            "targets": {"card": [], "single": [], "scale": []},
            "adjustments": {},
            "image_refs": {request["items"][0]["id"]: "cms:Getränk 1"},
        }
        get_responses = [
            self.meta,
            Response(200, {"value": []}),
            Response(200, {"value": []}),
        ]

        def fake_post(url, **kwargs):
            self.assertTrue(url.endswith("/api/data/v9.2/$batch"))
            self.assertNotIn("/dl_angebote(", url)
            operations = [
                {"method": "POST", "path": "dl_angebotes"}
                for _ in range(7)
            ] + [{"method": "POST", "path": "dl_seiteninhalts"}]
            transaction = kwargs["data"].decode("utf-8")
            request_parts = parse_batch_request(
                kwargs["data"], kwargs["headers"]["Content-Type"]
            )
            self.assertEqual(transaction.count("Content-Type: multipart/mixed;boundary=changeset_"), 1)
            self.assertEqual(transaction.count("POST /api/data/v9.2/dl_angebotes HTTP/1.1"), 7, transaction)
            self.assertIn('"dl_aktionsart":"drinks"', transaction)
            self.assertNotIn('"dl_strichcode"', transaction)
            self.assertIn('"dl_stamm_artikelnummer":"ART-1"', transaction)
            self.assertIn("image_refs", transaction)
            self.assertIn("cms:Getränk 1", transaction)
            saved_layout = next(
                part["payload"] for part in request_parts
                if part["path"] == "/api/data/v9.2/dl_seiteninhalts"
            )
            self.assertEqual(json.loads(saved_layout["dl_wert"]), request["layout"])
            created = [
                part["payload"]["dl_angeboteid"] for part in request_parts
                if part["path"] == "/api/data/v9.2/dl_angebotes"
            ]
            self.assertEqual(created, [str(uuid.UUID(entry["id"])) for entry in request["items"]])
            return batch_response(operations)

        with patch.object(angebote.requests, "get", side_effect=get_responses) as get_request, \
                patch.object(angebote.requests, "post", side_effect=fake_post):
            result = angebote._save_action(self.base_url, self.headers, request)
        self.assertEqual(result["aktion_id"], action_id)
        self.assertEqual(
            get_request.call_args_list[1].kwargs["params"]["$filter"],
            f"dl_aktion_id eq '{action_id}'",
        )
        self.assertEqual(
            get_request.call_args_list[2].kwargs["params"]["$filter"],
            f"dl_schluessel eq 'angebote_layout_{action_id}'",
        )
        self.assertEqual(len(result["items"]), 7)
        self.assertEqual(result["items"][0]["id"], "00000000-0000-0000-0000-000000000064")
        self.assertEqual(result["items"][0]["client_id"], f"{1:032x}")

    def test_schema_not_ready_fails_before_transaction(self):
        with patch.object(angebote.requests, "get",
                          return_value=Response(200, {"value": []})), \
                patch.object(angebote.requests, "post") as post:
            with self.assertRaises(angebote.ActionRequestError) as error:
                angebote._save_action(self.base_url, self.headers, body())
        self.assertEqual(error.exception.status, 503)
        self.assertIn("dl_aktionsart", error.exception.details)
        post.assert_not_called()

    def test_stale_original_ids_conflict_before_transaction(self):
        current = {"dl_angeboteid": "b" * 32, "@odata.etag": 'W/"1"'}
        with patch.object(angebote.requests, "get", side_effect=[
                self.meta, Response(200, {"value": [current]})]), \
                patch.object(angebote.requests, "post") as post:
            with self.assertRaises(angebote.ActionRequestError) as error:
                angebote._save_action(self.base_url, self.headers, body())
        self.assertEqual(error.exception.status, 409)
        post.assert_not_called()

    def test_delete_validates_current_action_members_before_batch(self):
        foreign = {"dl_angeboteid": "b" * 32}
        with patch.object(angebote.requests, "get",
                          return_value=Response(200, {"value": [foreign]})), \
                patch.object(angebote.requests, "post") as post:
            with self.assertRaises(angebote.ActionRequestError) as error:
                angebote._delete_action(self.base_url, self.headers, {
                    "aktion_id": "a" * 32, "original_ids": ["c" * 32],
                })
        self.assertEqual(error.exception.status, 409)
        post.assert_not_called()

    def test_delete_removes_rows_and_layout_in_one_etag_guarded_transaction(self):
        row_id = "b" * 8 + "-" + "b" * 4 + "-" + "b" * 4 + "-" + "b" * 4 + "-" + "b" * 12
        layout_id = "c" * 8 + "-" + "c" * 4 + "-" + "c" * 4 + "-" + "c" * 4 + "-" + "c" * 12
        requests = [
            Response(200, {"value": [{
                "dl_angeboteid": row_id, "@odata.etag": 'W/"row"'
            }]}),
            Response(200, {"value": [{
                "dl_seiteninhaltid": layout_id, "@odata.etag": 'W/"layout"'
            }]}),
        ]
        revision = angebote._action_revision(
            requests[0].json()["value"], requests[1].json()["value"][0]
        )
        with patch.object(angebote.requests, "get", side_effect=requests), \
                patch.object(angebote.requests, "post",
                             return_value=batch_response([
                                 {"method": "DELETE", "path": "dl_angebotes"},
                                 {"method": "DELETE", "path": "dl_seiteninhalts"},
                             ])) as post:
            result = angebote._delete_action(self.base_url, self.headers, {
                "aktion_id": "a" * 32, "original_ids": [row_id],
                "revision": revision,
            })
        self.assertTrue(result["success"])
        transaction = post.call_args.kwargs["data"].decode("utf-8")
        self.assertIn("DELETE /api/data/v9.2/dl_angebotes(", transaction)
        self.assertIn("DELETE /api/data/v9.2/dl_seiteninhalts(", transaction)
        self.assertIn('If-Match: W/"row"', transaction)
        self.assertIn('If-Match: W/"layout"', transaction)

    def test_action_mutations_require_cms_token_even_without_global_enforcement(self):
        from azure.functions import HttpRequest
        request = HttpRequest(
            method="POST", url="http://localhost/api/angebote?action=save",
            params={"action": "save"}, headers={}, body=b"{}",
        )
        with patch.dict(os.environ, {"CMS_AUTH_TOKEN": "secret", "CMS_AUTH_ENFORCE": "false"}):
            response = angebote.main(request)
        self.assertEqual(response.status_code, 401)

    def test_public_get_maps_images_layout_and_safe_scale_config(self):
        from azure.functions import HttpRequest
        action_id = "a" * 8 + "-" + "a" * 4 + "-" + "a" * 4 + "-" + "a" * 4 + "-" + "a" * 12
        rows = Response(200, {"value": [
            {
                "dl_angeboteid": "1" * 32,
                "@odata.etag": 'W/"admin-row"',
                "dl_aktion_id": action_id,
                "dl_artikelnummer": "BARCODE-1",
                "dl_gueltig_von": "2020-01-01",
                "dl_gueltig_bis": "2099-12-31",
                "dl_aktionsart": None,
                "dl_stamm_vk_cent": 199,
                "dl_WerbebildId": {
                    "dl_werbebildid": "2" * 32,
                    "dl_artikelnummer": "CMS-KEY-1",
                    "dl_download_url": "https://images.invalid/1",
                    "dl_bild_base64": "",
                },
            },
            {
                "dl_angeboteid": "3" * 32,
                "dl_aktion_id": action_id,
                "dl_artikelnummer": "BARCODE-2",
                "dl_gueltig_von": "2020-01-01",
                "dl_gueltig_bis": "2099-12-31",
                "dl_WerbebildId": {},
            },
            {
                "dl_angeboteid": "4" * 32,
                "dl_aktion_id": "b" * 8 + "-" + "b" * 4 + "-" + "b" * 4 + "-" + "b" * 4 + "-" + "b" * 12,
                "dl_aktionsart": "drinks",
                "dl_gueltig_von": "2099-01-01",
                "dl_gueltig_bis": "2099-12-31",
            },
            {
                "dl_angeboteid": "5" * 32,
                "dl_aktion_id": "c" * 8 + "-" + "c" * 4 + "-" + "c" * 4 + "-" + "c" * 4 + "-" + "c" * 12,
                "dl_gueltig_von": "2099-01-01",
                "dl_gueltig_bis": "2099-12-31",
            },
            {
                "dl_angeboteid": "6" * 32,
                "dl_aktion_id": "d" * 8 + "-" + "d" * 4 + "-" + "d" * 4 + "-" + "d" * 4 + "-" + "d" * 12,
                "dl_aktionsart": "drinks",
                "dl_gueltig_von": "2000-01-01",
                "dl_gueltig_bis": "2000-12-31",
            },
        ]})
        layouts = Response(200, {"value": [{
            "dl_schluessel": "angebote_layout_" + action_id,
            "dl_wert": json.dumps({"density": 4}),
        }]})
        request = HttpRequest(
            method="GET", url="https://preview.invalid/api/angebote",
            params={}, headers={"Host": "preview.invalid"}, body=b"",
        )
        with patch.dict(os.environ, {
                "ANGEBOTE_NAMESPACE": "preview-test",
                "ANGEBOTE_WAAGE_SEND_ENABLED": "true",
                "CMS_AUTH_TOKEN": "secret",
        }), patch.object(angebote, "get_headers", return_value=self.headers), \
                patch.object(angebote.requests, "get", side_effect=[rows, layouts]):
            response = angebote.main(request)
        result = json.loads(response.get_body())
        self.assertEqual(response.status_code, 200)
        self.assertEqual(result["data"][0]["action_kind"], "weekly")
        self.assertEqual(result["data"][0]["image_key"], "CMS-KEY-1")
        self.assertEqual(result["data"][0]["bild_data"], "https://images.invalid/1")
        self.assertEqual(result["data"][1]["image_key"], "BARCODE-2")
        self.assertEqual(result["data"][0]["action_layout"], {"density": 4})
        self.assertNotIn("retail_price_cents", result["data"][0])
        # Upcoming actions are public (homepage filters weeks); expired ones are not.
        self.assertEqual(len(result["data"]), 4)
        self.assertNotIn("6" * 32, [row["id"] for row in result["data"]])
        self.assertEqual(result["config"], {"feature_archive_enabled": True})

    def test_public_empty_get_still_includes_runtime_config(self):
        from azure.functions import HttpRequest
        request = HttpRequest(
            method="GET", url="https://preview.invalid/api/angebote",
            params={}, headers={"Host": "preview.invalid"}, body=b"",
        )
        with patch.dict(os.environ, {
                "ANGEBOTE_NAMESPACE": "",
                "CMS_AUTH_TOKEN": "secret",
                "CMS_AUTH_ENFORCE": "false",
        }), patch.object(angebote, "get_headers", return_value=self.headers), \
                patch.object(angebote.requests, "get",
                             return_value=Response(200, {"value": []})):
            response = angebote.main(request)
        result = json.loads(response.get_body())
        self.assertEqual(response.status_code, 200)
        self.assertEqual(result, {
            "success": True,
            "data": [],
            "config": {"feature_archive_enabled": False},
        })

    def test_authenticated_admin_get_keeps_all_rows_and_includes_config(self):
        from azure.functions import HttpRequest
        request = HttpRequest(
            method="GET", url="https://www.dorfladen-oberornau.de/api/angebote",
            params={}, headers={
                "Host": "www.dorfladen-oberornau.de", "X-CMS-Auth": "secret",
            }, body=b"",
        )
        rows = Response(200, {"value": [{
            "dl_angeboteid": "1" * 32,
            "@odata.etag": 'W/"admin-row"',
            "dl_aktion_id": "a" * 32,
            "dl_aktionsart": "drinks",
            "dl_gueltig_von": "2099-01-01",
            "dl_gueltig_bis": "2099-12-31",
            "dl_stamm_vk_cent": 199,
        }]})
        layouts = Response(200, {"value": []})
        with patch.dict(os.environ, {
                "ANGEBOTE_NAMESPACE": "production",
                "ANGEBOTE_WAAGE_SEND_ENABLED": "true",
                "CMS_AUTH_TOKEN": "secret",
        }), patch.object(angebote, "get_headers", return_value=self.headers), \
                patch.object(angebote.requests, "get", side_effect=[rows, layouts]):
            response = angebote.main(request)
        result = json.loads(response.get_body())
        self.assertEqual(len(result["data"]), 1)
        self.assertEqual(result["data"][0]["retail_price_cents"], 199)
        self.assertEqual(result["config"]["feature_archive_enabled"], True)
        self.assertEqual(result["config"]["scale_enabled"], True)
        self.assertEqual(
            result["config"]["scale_scope"],
            hashlib.sha256(b"production").hexdigest()[:6],
        )

    def test_same_ids_changed_content_and_layout_conflict_before_writes(self):
        row = {"dl_angeboteid": str(uuid.UUID(item()["id"])), "@odata.etag": 'W/"1"'}
        layout = {"dl_seiteninhaltid": str(uuid.uuid4()), "@odata.etag": 'W/"layout-1"'}
        revision = angebote._action_revision([row], layout)
        for changed_row, changed_layout in (
                ({**row, "@odata.etag": 'W/"2"'}, layout),
                (row, {**layout, "@odata.etag": 'W/"layout-2"'})):
            with self.subTest(row=changed_row, layout=changed_layout), \
                    patch.object(angebote, "_check_action_schema"), \
                    patch.object(angebote, "_read_action_rows", return_value=[changed_row]), \
                    patch.object(angebote, "_read_action_layout", return_value=changed_layout), \
                    patch.object(angebote, "_run_action_batch") as batch:
                request = body()
                request.update(original_ids=[row["dl_angeboteid"]], revision=revision)
                with self.assertRaises(angebote.ActionRequestError) as error:
                    angebote._save_action(self.base_url, self.headers, request)
                self.assertEqual(error.exception.status, 409)
                with self.assertRaises(angebote.ActionRequestError) as error:
                    angebote._delete_action(self.base_url, self.headers, request)
                self.assertEqual(error.exception.status, 409)
                batch.assert_not_called()

    def test_missing_revision_cannot_overwrite_existing_action(self):
        row = {"dl_angeboteid": str(uuid.UUID(item()["id"])), "@odata.etag": 'W/"1"'}
        with patch.object(angebote, "_check_action_schema"), \
                patch.object(angebote, "_read_action_rows", return_value=[row]), \
                patch.object(angebote, "_read_action_layout", return_value=None), \
                patch.object(angebote, "_run_action_batch") as batch:
            request = body()
            request["original_ids"] = [row["dl_angeboteid"]]
            with self.assertRaises(angebote.ActionRequestError) as error:
                angebote._save_action(self.base_url, self.headers, request)
            self.assertEqual(error.exception.status, 409)
            batch.assert_not_called()

    def test_runtime_config_does_not_require_blob_namespace(self):
        from azure.functions import HttpRequest
        request = HttpRequest(
            method="GET", url="https://fresh.invalid/api/angebote",
            params={}, headers={"Host": "fresh.invalid"}, body=b"",
        )
        with patch.dict(os.environ, {}, clear=True):
            self.assertEqual(angebote._offer_runtime_config(request), {
                "feature_archive_enabled": False,
            })


if __name__ == "__main__":
    unittest.main(verbosity=2)
