"""Ablauf, Offline-Abgleich und Preview-Sperre ohne echte Waage oder Cloud."""

import importlib.util
import json
import os
import sys
import tempfile
import unittest
from datetime import datetime
from unittest.mock import patch

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
sys.path.insert(0, os.path.join(ROOT, "api"))
sys.path.insert(0, os.path.join(ROOT, "tools", "waage-bruecke"))

from shared import waage
from shared.angebote import scale_scope
from test_waage_relais_api import FakeSpeicher, FakeTabelle, JPEG
from test_waage_bruecke import CFG, WaageFtp
import waage_bruecke

NAME = "21_" + scale_scope("preview-test") + "_" + "a" * 12 + "_" + "b" * 12 + "_20261116_20261121_01.jpg"
OTHER = "21_" + scale_scope("preview-test") + "_" + "c" * 12 + "_" + "d" * 12 + "_20261116_20261128_01.jpg"


def stamp(value):
    return datetime.fromisoformat(value).timestamp()


class RelayCloud:
    def __init__(self):
        self.storage, self.table = FakeSpeicher(), FakeTabelle()
        self.now = stamp("2026-11-18T12:00:00+00:00")
        self.offline = False

    def request(self, method, params, body=None):
        if self.offline:
            raise OSError("offline")
        code, typ, data = waage.verarbeite(method, params, body, self.storage, self.table, self.now)
        if code != 200:
            raise OSError("Test API rejected request: " + data.decode())
        return json.loads(data) if typ.startswith("application/json") else data

    def sync(self):
        return self.request("GET", {"bruecke": "sync"})

    def lade(self, art, name):
        return self.request("GET", {"art": art, "name": name})

    def lade_hoch(self, art, name, data):
        return self.request("POST", {"art": art, "name": name}, data)

    def bericht(self, report):
        return self.request("POST", {"bruecke": "bericht"}, json.dumps(report).encode())


class LifecycleTests(unittest.TestCase):
    def setUp(self):
        self.cloud = RelayCloud()
        self.cloud.storage.schreibe("dauer", NAME, JPEG)
        self.cloud.storage.schreibe("dauer", OTHER, JPEG)
        self.cloud.storage.schreibe("dauer", "Hauswerbung.jpg", JPEG)
        self.cloud.storage.schreibe("vollbild", "Wochenplan.jpg", JPEG)

    def test_TC_F6_03_active_only_and_stable_version(self):
        before = self.cloud.sync()
        self.assertIn(NAME, [b["name"] for b in before["arten"]["dauer"]])
        self.assertEqual(before["version"], self.cloud.sync()["version"])
        self.cloud.now = stamp("2026-11-21T23:00:00+00:00")
        after = self.cloud.sync()
        self.assertNotEqual(before["version"], after["version"])
        self.assertEqual([b["name"] for b in after["arten"]["dauer"]], sorted([OTHER, "Hauswerbung.jpg"], key=str.lower))
        self.assertEqual(after["arten"]["vollbild"][0]["name"], "Wochenplan.jpg")
        self.assertIn(NAME, self.cloud.storage.d["dauer"])

    def test_TC_F6_03_scheduled_is_not_sent(self):
        self.cloud.now = stamp("2026-11-15T22:59:59+00:00")
        self.assertEqual([b["name"] for b in self.cloud.sync()["arten"]["dauer"]], ["Hauswerbung.jpg"])
        self.cloud.now += 1
        self.assertIn(NAME, [b["name"] for b in self.cloud.sync()["arten"]["dauer"]])

    def test_TC_F6_02_expired_physical_status_is_honest(self):
        self.cloud.table.schreibe({"zeit": self.cloud.now, "ok": True, "ist": {"dauer": [NAME]}, "stand": {}})
        self.cloud.now = stamp("2026-11-22T00:00:00+00:00")
        response = self.cloud.request("GET", {"art": "dauer"})
        row = next(b for b in response["bilder"] if b["name"] == NAME)
        self.assertEqual(row["status"], "abgelaufen_auf_waage")
        self.assertFalse(response["bruecke"]["online"])
        self.cloud.table.schreibe({"zeit": self.cloud.now, "ok": True, "ist": {"dauer": []}, "stand": {}})
        row = next(b for b in self.cloud.request("GET", {"art": "dauer"})["bilder"] if b["name"] == NAME)
        self.assertEqual(row["status"], "abgelaufen")

    def test_TC_F6_04_offline_expiry_then_real_bridge_reconciles(self):
        ftp = WaageFtp()
        with tempfile.TemporaryDirectory() as tmp:
            bridge = waage_bruecke.Agent(CFG, self.cloud, ftp, uhr=lambda: self.cloud.now,
                                        log=lambda *args: None, stand_pfad=os.path.join(tmp, "stand.json"))
            bridge.initialisiert = True
            self.cloud.table.schreibe({"initialisiert": True})
            bridge.schritt()
            self.assertIn(NAME, ftp.d["dauer"])
            self.cloud.offline = True
            self.cloud.now = stamp("2026-11-22T00:00:00+00:00")
            bridge.schritt()
            self.assertIn(NAME, ftp.d["dauer"], "Ohne Verbindung keine physische Erfolgsmeldung")
            self.cloud.offline = False
            bridge.schritt()
            self.assertNotIn(NAME, ftp.d["dauer"])
            self.assertIn(OTHER, ftp.d["dauer"])
            self.assertIn("Hauswerbung.jpg", ftp.d["dauer"])
            self.assertIn("Wochenplan.jpg", ftp.d["vollbild"])
            self.assertEqual(self.cloud.table.lies()["ist"]["dauer"], sorted(ftp.d["dauer"]))

    def test_TC_F6_01_filename_survives_existing_limits(self):
        self.assertEqual(waage.sauberer_name(NAME, "jpg"), NAME)
        self.assertLessEqual(len(NAME.rsplit(".", 1)[0]), 60)
        self.assertIsNone(waage.angebotsdatei("21_SonstigeWerbung.jpg"))
        with self.assertRaises(waage.WaageFehler):
            waage.angebotsdatei(NAME.replace("20261121", "20260230"))


class PreviewGuardTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        spec = importlib.util.spec_from_file_location("offers_scale_route", os.path.join(ROOT, "api", "waage-werbebilder", "__init__.py"))
        cls.route = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(cls.route)

    def setUp(self):
        self.env = patch.dict(os.environ, {"CMS_AUTH_TOKEN": "test-auth", "CMS_AUTH_ENFORCE": "false",
                                          "ANGEBOTE_NAMESPACE": "preview-test", "ANGEBOTE_WAAGE_SEND_ENABLED": "false"})
        self.env.start()
        self.storage, self.table = FakeSpeicher(), FakeTabelle()

    def tearDown(self):
        self.env.stop()

    def call(self, method, name, auth=True, flag=False):
        import azure.functions as func
        params = {"art": "dauer", "name": name}
        if flag:
            params["angebot"] = "1"
        req = func.HttpRequest(method=method, url="http://localhost/api/waage-werbebilder", params=params,
                               headers={"X-CMS-Auth": "test-auth"} if auth else {}, body=JPEG if method == "POST" else b"")
        with patch.object(waage, "GraphSpeicher", return_value=self.storage), patch.object(waage, "TabellenStatus", return_value=self.table):
            return self.route.main(req)

    def test_TC_F8_02_preview_blocks_upload_and_delete_on_server(self):
        self.storage.schreibe("dauer", NAME, JPEG)
        for method in ("POST", "DELETE"):
            response = self.call(method, NAME)
            self.assertEqual(response.status_code, 403)
            self.assertIn(NAME, self.storage.d["dauer"])
        self.assertEqual(len(self.storage.d["dauer"]), 1)

    def test_TC_F8_02_no_flag_or_path_sanitization_bypass(self):
        self.assertEqual(self.call("POST", "../" + NAME).status_code, 403)
        self.assertEqual(self.call("POST", NAME, auth=False).status_code, 401)
        self.assertEqual(self.call("POST", "anderer_name.jpg", flag=True).status_code, 403)
        self.assertFalse(self.storage.d["dauer"])

    def test_TC_F8_01_enabled_environment_cannot_write_other_namespace(self):
        with patch.dict(os.environ, {"ANGEBOTE_WAAGE_SEND_ENABLED": "true"}):
            foreign = NAME.replace(scale_scope("preview-test"), scale_scope("production"))
            self.assertEqual(self.call("POST", foreign).status_code, 403)
            self.assertEqual(self.call("DELETE", foreign).status_code, 403)
            self.assertEqual(self.call("POST", NAME).status_code, 200)

    def test_TC_F8_02_existing_unassigned_ads_are_unchanged(self):
        self.assertEqual(self.call("POST", "Hauswerbung.jpg").status_code, 200)
        self.assertEqual(self.call("GET", "Hauswerbung.jpg", auth=False).status_code, 200)
        self.assertEqual(self.call("DELETE", "Hauswerbung.jpg").status_code, 200)


if __name__ == "__main__":
    unittest.main(verbosity=2)
