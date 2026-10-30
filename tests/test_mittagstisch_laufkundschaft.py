"""Laufkundschaft: echte Handler mit simuliertem Dataverse, keine Live-Schreibzugriffe."""
import importlib.util
import json
import os
from datetime import date
from pathlib import Path
import sys
import unittest
from unittest.mock import patch

API = Path(__file__).resolve().parents[1] / "api"
sys.path.insert(0, str(API))
spec = importlib.util.spec_from_file_location("lunch_walkin_test", API / "lunch-order" / "__init__.py")
lunch = importlib.util.module_from_spec(spec)
spec.loader.exec_module(lunch)


class Response:
    def __init__(self, status=200, data=None):
        self.status_code = status
        self.data = data or {}
        self.text = json.dumps(self.data)

    def json(self):
        return self.data


class Request:
    def __init__(self, method, body, authenticated=True, record_id=None):
        self.method = method
        self.body = body
        self.headers = {"X-CMS-Auth": "test-auth"} if authenticated else {}
        self.route_params = {"id": record_id} if record_id else {}
        self.params = {}
        self.url = "https://example.test/api/lunch-order"

    def get_json(self):
        return self.body


class WalkinTests(unittest.TestCase):
    def setUp(self):
        self.stack = []
        self.addCleanup(self.cleanup_patches)
        self.start(patch.dict(os.environ, {"CMS_AUTH_TOKEN": "test-auth"}))
        self.start(patch.object(lunch, "get_token", return_value="token"))
        self.start(patch.object(lunch, "heute_iso", return_value="2026-10-30"))
        self.existing = {
            "dl_quelle": 3, "dl_status": 1, "dl_menge": 1,
            "@odata.etag": 'W/"123"'
        }
        self.get = self.start(patch.object(lunch.requests, "get", side_effect=lambda *a, **k: Response(data=self.existing)))
        self.post = self.start(patch.object(lunch.requests, "post", return_value=Response(201, {})))
        self.write = self.start(patch.object(lunch.requests, "patch", return_value=Response(204)))

    def start(self, p):
        result = p.start()
        self.stack.append(p)
        return result

    def cleanup_patches(self):
        for p in reversed(self.stack):
            p.stop()

    def create(self, **kw):
        body = {"quelle": 3, "menge": 2, "datum": "2026-10-30",
                "gericht": "Schnitzel", "preis": 8.8, **kw}
        return lunch.main(Request("POST", body))

    def edit(self, body=None, authenticated=True):
        return lunch.main(Request("PATCH", body or {"menge": 3, "version": 'W/"123"'},
                                  authenticated, "order-1"))

    def test_create_anonymous_confirmed(self):
        self.assertEqual(self.create(email="someone@example.test", notify_email=True,
                                     device_id="device", stammkunde_id="customer").status_code, 201)
        payload = self.post.call_args.kwargs["json"]
        self.assertEqual(payload["dl_name"], "Laufkundschaft")
        self.assertEqual(payload["dl_quelle"], 3)
        self.assertEqual(payload["dl_status"], 1)
        self.assertEqual(payload["dl_menge"], 2)
        self.assertFalse(payload["dl_notify_email"])
        self.assertEqual(payload["dl_email"], "")
        self.assertEqual(payload["dl_stammkunde_id"], "")
        self.assertEqual(payload["dl_device_id"], "")

    def test_today_only_and_authentication(self):
        self.assertEqual(self.create(datum="2026-10-29").status_code, 400)
        self.assertEqual(lunch.main(Request("POST", {
            "quelle": 3, "menge": 1, "datum": "2026-10-30"}, False)).status_code, 401)
        self.post.assert_not_called()

    def test_edit_only_quantity_with_etag(self):
        self.assertEqual(self.edit().status_code, 200)
        self.assertEqual(self.write.call_args.kwargs["json"], {"dl_menge": 3})
        self.assertEqual(self.write.call_args.kwargs["headers"]["If-Match"], 'W/"123"')
        self.assertEqual(lunch._serialize(self.existing)["version"], 'W/"123"')

    def test_phone_allowed(self):
        self.existing["dl_quelle"] = 1
        self.assertEqual(self.edit().status_code, 200)

    def test_create_invalid_quantities_rejected(self):
        for amount in [0, 100, 1.5, True, "2", None, {}, []]:
            with self.subTest(amount=amount):
                self.assertEqual(self.create(menge=amount).status_code, 400)
        self.post.assert_not_called()

    def test_create_failure_and_takeout(self):
        self.create(mitnehmen=True)
        self.assertTrue(self.post.call_args.kwargs["json"]["dl_mitnehmen"])
        self.post.return_value = Response(500)
        self.assertEqual(self.create().status_code, 500)

    def test_excluded_sources_and_closed_statuses(self):
        for source, status in [(0, 1), (2, 1), (3, 3), (3, 2), (1, 3)]:
            with self.subTest(source=source, status=status):
                self.existing.update(dl_quelle=source, dl_status=status)
                self.assertEqual(self.edit().status_code, 409)
        self.write.assert_not_called()

    def test_invalid_quantities_rejected(self):
        for amount in [0, 100, 1.5, True, "2", None, {}, []]:
            with self.subTest(amount=amount):
                self.assertEqual(self.edit({"menge": amount, "version": 'W/"123"'}).status_code, 400)
        self.assertEqual(self.edit({"menge": 2}).status_code, 400)
        self.assertEqual(self.edit({"menge": 2, "version": 'W/"123"', "status": 1}).status_code, 400)
        self.write.assert_not_called()

    def test_auth_required(self):
        self.assertEqual(self.edit(authenticated=False).status_code, 401)
        self.write.assert_not_called()

    def test_stale_read_and_atomic_conflict(self):
        self.assertEqual(self.edit({"menge": 2, "version": 'W/"100"'}).status_code, 409)
        self.write.assert_not_called()
        self.write.return_value = Response(412)
        self.assertEqual(self.edit().status_code, 409)

    def test_write_failures(self):
        self.write.return_value = Response(500)
        self.assertEqual(self.edit().status_code, 502)
        self.get.return_value = Response(404)
        self.get.side_effect = None
        self.assertEqual(self.edit().status_code, 404)

    def test_history_distinguishes_walkins_without_double_counting(self):
        req = Request("GET", {})
        req.params = {"mode": "tagesverlauf", "days": "1"}
        self.start(patch.object(lunch, "heute_lokal", return_value=date(2026, 10, 30)))
        self.get.side_effect = None
        self.get.return_value = Response(data={"value": [
            {"dl_datum": "2026-10-30", "dl_quelle": source, "dl_status": status,
             "dl_gericht": "Schnitzel", "dl_menge": amount}
            for source, status, amount in [(0, 1, 1), (1, 1, 2), (3, 3, 3), (3, 2, 10)]
        ]})
        response = lunch.main(req)
        self.assertEqual(response.status_code, 200)
        day = json.loads(response.get_body())["verlauf"][0]
        self.assertEqual(day["portionen"], 6)
        self.assertEqual(day["bestellungen"], 3)
        self.assertEqual(day["online"], 1)
        self.assertEqual(day["vor_ort"], 5)
        self.assertEqual(day["laufkundschaft"], 3)


if __name__ == "__main__":
    unittest.main()
