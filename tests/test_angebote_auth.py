"""Gemeinsame CMS-Sitzung fuer Angebote, ohne Netzwerkzugriffe."""

import hashlib
import importlib.util
import json
import os
import sys
import unittest
from pathlib import Path
from types import SimpleNamespace
from unittest.mock import patch


ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "api"))
module_spec = importlib.util.spec_from_file_location(
    "angebote_cms_auth", ROOT / "api" / "cms-auth" / "__init__.py"
)
cms_auth = importlib.util.module_from_spec(module_spec)
module_spec.loader.exec_module(cms_auth)


class AngeboteAuthTests(unittest.TestCase):
    def request(self, method="GET", token="", password=""):
        return SimpleNamespace(
            method=method, headers={"X-CMS-Auth": token},
            get_json=lambda: {"password": password},
        )

    def setUp(self):
        self.settings = patch.dict(os.environ, {
            "CMS_AUTH_TOKEN": "test-auth",
            "CMS_PW_HASH": hashlib.sha256(b"test-password").hexdigest(),
            "CMS_AUTH_ENFORCE": "false",
        })
        self.settings.start()
        self.addCleanup(self.settings.stop)

    def test_TC_F9_01_session_requires_valid_token_even_without_rollout_flag(self):
        for token, status in (("", 401), ("expired", 401), ("test-auth", 200)):
            with self.subTest(token=token):
                response = cms_auth.main(self.request(token=token))
                self.assertEqual(response.status_code, status)
                self.assertEqual(json.loads(response.get_body()),
                                 {"authenticated": status == 200})
                self.assertEqual(response.headers["Cache-Control"], "no-store")
                self.assertNotIn("test-auth", response.get_body().decode())

    def test_TC_F9_01_single_password_login(self):
        for password, status in (("wrong", 401), ("test-password", 200)):
            with self.subTest(password=password):
                response = cms_auth.main(self.request("POST", password=password))
                self.assertEqual(response.status_code, status)
                self.assertEqual(response.headers["Cache-Control"], "no-store")
                if status == 200:
                    self.assertEqual(json.loads(response.get_body())["token"], "test-auth")

    def test_TC_F9_01_missing_server_configuration_is_not_a_valid_session(self):
        with patch.dict(os.environ, {"CMS_AUTH_TOKEN": ""}):
            self.assertEqual(cms_auth.main(self.request(token="test-auth")).status_code, 500)

    def test_TC_F9_01_session_route_and_cors_include_get(self):
        route = json.loads((ROOT / "api" / "cms-auth" / "function.json").read_text())
        self.assertIn("get", route["bindings"][0]["methods"])
        response = cms_auth.main(self.request("OPTIONS"))
        self.assertEqual(response.status_code, 204)
        self.assertIn("GET", response.headers["Access-Control-Allow-Methods"])
        self.assertIn("X-CMS-Auth", response.headers["Access-Control-Allow-Headers"])


if __name__ == "__main__":
    unittest.main()
