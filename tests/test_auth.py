"""Unit-Tests für api/shared/auth.py (SEC-2).

Läuft ohne installierte Azure-Pakete: azure.functions wird gemockt.
Ausführen:  python tests/test_auth.py   (oder: python -m pytest tests/test_auth.py)
"""
import os
import sys
import types

# --- azure.functions mocken, damit shared.auth ohne Azure-Deps importierbar ist ---
_azure = types.ModuleType("azure")
_functions = types.ModuleType("azure.functions")


class HttpResponse:
    def __init__(self, body="", status_code=200, mimetype=None, headers=None):
        self.body = body
        self.status_code = status_code
        self.mimetype = mimetype
        self.headers = headers or {}


_functions.HttpResponse = HttpResponse
_azure.functions = _functions
sys.modules.setdefault("azure", _azure)
sys.modules["azure.functions"] = _functions

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "api"))
from shared import auth  # noqa: E402


class FakeReq:
    def __init__(self, method, token=None):
        self.method = method
        self.headers = {} if token is None else {"X-CMS-Auth": token}


def _set(enforce=None, token=None):
    for k, v in (("CMS_AUTH_ENFORCE", enforce), ("CMS_AUTH_TOKEN", token)):
        if v is None:
            os.environ.pop(k, None)
        else:
            os.environ[k] = v


def test_enforcement_flag():
    _set(enforce="0")
    assert auth.enforcement_enabled() is False
    _set(enforce="1")
    assert auth.enforcement_enabled() is True
    _set(enforce="true")
    assert auth.enforcement_enabled() is True


def test_tc_f1_01_missing_token_blocks():
    _set(enforce="1", token="geheim")
    assert auth.admin_auth_guard(FakeReq("POST")) is not None  # 401


def test_tc_f1_02_wrong_token_blocks():
    _set(enforce="1", token="geheim")
    assert auth.admin_auth_guard(FakeReq("POST", token="falsch")) is not None


def test_tc_f1_03_valid_token_passes():
    _set(enforce="1", token="geheim")
    assert auth.admin_auth_guard(FakeReq("POST", token="geheim")) is None


def test_tc_f1_04_get_always_open():
    _set(enforce="1", token="geheim")
    assert auth.admin_auth_guard(FakeReq("GET")) is None
    assert auth.admin_auth_guard(FakeReq("OPTIONS")) is None


def test_not_enforced_passes_without_token():
    _set(enforce="0", token="geheim")
    assert auth.admin_auth_guard(FakeReq("POST")) is None


def test_unauthorized_response_shape():
    r = auth.unauthorized_response()
    assert r.status_code == 401


if __name__ == "__main__":
    failed = 0
    for name, fn in sorted(globals().items()):
        if name.startswith("test_") and callable(fn):
            try:
                fn()
                print("PASS", name)
            except AssertionError as e:
                failed += 1
                print("FAIL", name, e)
    print("DONE", "OK" if failed == 0 else f"{failed} FAILED")
    sys.exit(1 if failed else 0)
