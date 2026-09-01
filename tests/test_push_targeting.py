"""Unit-Tests fuer den geraete-genauen Web-Push-Versand (api/shared/push.py).

Regression: ``_fetch_all_subscriptions`` las die ``device_id`` nicht aus,
waehrend ``send_push_notification`` nach ``target_device_id`` filterte. Die
Empfaengerliste war dadurch beim In-Process-Versand IMMER leer – Antworten im
Kontakt-Chat erreichten geraete-adressierte Kunden (typisch: iOS-PWA ohne
E-Mail) nie, der Versand meldete aber "success".

Laeuft ohne installierte Azure-/Push-Pakete: diese werden gemockt.
Ausfuehren:  python tests/test_push_targeting.py   (oder: python -m pytest tests/test_push_targeting.py)
"""
import json
import os
import sys
import types

# --- Externe Pakete mocken, damit shared.push ohne Deps importierbar ist ---
for _name in ("requests", "msal"):
    if _name not in sys.modules:
        sys.modules[_name] = types.ModuleType(_name)

if "pywebpush" not in sys.modules:
    _pwp = types.ModuleType("pywebpush")

    class _WebPushException(Exception):
        pass

    _pwp.webpush = lambda **kw: None
    _pwp.WebPushException = _WebPushException
    sys.modules["pywebpush"] = _pwp

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "api"))
from shared import push  # noqa: E402

# --- push-subscribe hat einen Bindestrich im Ordnernamen und ist daher nicht
#     normal importierbar -> per Pfad laden (azure.functions wird gemockt). ---
if "azure.functions" not in sys.modules:
    _azure = types.ModuleType("azure")
    _functions = types.ModuleType("azure.functions")

    class _HttpResponse:
        def __init__(self, body="", status_code=200, mimetype=None, headers=None):
            self.body = body
            self.status_code = status_code

    class _HttpRequest:
        pass

    _functions.HttpResponse = _HttpResponse
    _functions.HttpRequest = _HttpRequest
    _azure.functions = _functions
    sys.modules.setdefault("azure", _azure)
    sys.modules["azure.functions"] = _functions

import importlib.util  # noqa: E402

_spec = importlib.util.spec_from_file_location(
    "push_subscribe_mod",
    os.path.join(os.path.dirname(__file__), "..", "api", "push-subscribe", "__init__.py"),
)
subscribe = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(subscribe)


def _record(rec_id, endpoint, categories=None, **extra):
    """Baut einen Dataverse-Datensatz im aktuellen Speicherformat."""
    val = {
        "subscription": {"endpoint": endpoint, "keys": {"p256dh": "p", "auth": "a"}},
        "categories": categories if categories is not None else ["tagesinfo", "news"],
    }
    val.update(extra)
    return {
        "dl_seiteninhaltid": rec_id,
        "dl_schluessel": "push_sub_" + rec_id,
        "dl_wert": json.dumps(val),
        "createdon": "2026-01-01T00:00:00Z",
        "modifiedon": "2026-01-02T00:00:00Z",
    }


def _run_send(records, **kwargs):
    """Ruft send_push_notification gegen gefakte Dataverse-Daten auf und gibt
    (result, [zugestellte Endpoints]) zurueck."""
    delivered = []

    class _Resp:
        status_code = 200

        @staticmethod
        def json():
            return {"value": records}

    class _FakeRequests:
        @staticmethod
        def get(url, headers=None, timeout=None):
            return _Resp()

        @staticmethod
        def delete(url, headers=None, timeout=None):
            return _Resp()

    saved = (push.requests, push.webpush, push._get_headers, push._resolve_entity_set)
    push.requests = _FakeRequests
    push.webpush = lambda **kw: delivered.append(kw["subscription_info"]["endpoint"])
    push._get_headers = lambda *a, **k: {}
    push._resolve_entity_set = lambda *a, **k: "dl_seiteninhalts"
    os.environ["VAPID_PRIVATE_KEY"] = "priv"
    os.environ["VAPID_PUBLIC_KEY"] = "pub"
    try:
        result = push.send_push_notification(title="T", message="M", **kwargs)
    finally:
        (push.requests, push.webpush, push._get_headers, push._resolve_entity_set) = saved
    return result, delivered


def test_parse_reads_device_id():
    out = push.parse_subscription_record(
        _record("a", "https://push.example/a", device_id="dev-123", email="A@Example.com")
    )
    assert out["device_id"] == "dev-123"
    assert out["email"] == "A@Example.com"
    assert out["created"] == "2026-01-01T00:00:00Z"
    assert out["modified"] == "2026-01-02T00:00:00Z"


def test_parse_legacy_format_has_device_id_key():
    legacy = {
        "dl_seiteninhaltid": "b",
        "dl_wert": json.dumps({"endpoint": "https://push.example/b", "keys": {}}),
    }
    out = push.parse_subscription_record(legacy)
    assert out["device_id"] == ""
    assert out["categories"] == ["tagesinfo", "news"]


def test_parse_rejects_invalid_records():
    assert push.parse_subscription_record({"dl_wert": "kein json"}) is None
    assert push.parse_subscription_record({"dl_wert": json.dumps({"foo": 1})}) is None
    assert push.parse_subscription_record({"dl_wert": json.dumps([1, 2])}) is None


def test_device_targeting_reaches_exactly_that_device():
    """Kern-Regression: geraete-genauer Versand muss genau ein Geraet treffen."""
    records = [
        _record("a", "https://push.example/a", device_id="dev-A"),
        _record("b", "https://push.example/b", device_id="dev-B"),
        _record("c", "https://push.example/c"),
    ]
    res, delivered = _run_send(records, category="kontakt", target_device_id="dev-B")
    assert delivered == ["https://push.example/b"]
    assert res["sent"] == 1
    assert res["total"] == 1


def test_device_targeting_ignores_category_filter():
    """Eine 1:1-Nachricht erreicht das Geraet auch ohne passende Kategorie."""
    records = [_record("a", "https://push.example/a", categories=["news"], device_id="dev-A")]
    res, delivered = _run_send(records, category="kontakt", target_device_id="dev-A")
    assert delivered == ["https://push.example/a"]
    assert res["sent"] == 1


def test_unknown_device_reaches_nobody():
    records = [_record("a", "https://push.example/a", device_id="dev-A")]
    res, delivered = _run_send(records, category="kontakt", target_device_id="dev-X")
    assert delivered == []
    assert res["total"] == 0


def test_email_targeting_still_works():
    records = [
        _record("a", "https://push.example/a", email="kunde@example.com"),
        _record("b", "https://push.example/b", email="andere@example.com"),
    ]
    res, delivered = _run_send(records, target_email="Kunde@Example.com")
    assert delivered == ["https://push.example/a"]
    assert res["sent"] == 1


def test_category_broadcast_still_works():
    records = [
        _record("a", "https://push.example/a", categories=["tagesinfo"]),
        _record("b", "https://push.example/b", categories=["news"]),
    ]
    res, delivered = _run_send(records, category="tagesinfo")
    assert delivered == ["https://push.example/a"]
    assert res["sent"] == 1


def test_legacy_category_is_migrated():
    """Alt-Abos mit 'mittagstisch' muessen bei 'tagesinfo' mitgezaehlt werden."""
    records = [_record("a", "https://push.example/a", categories=["mittagstisch"])]
    res, delivered = _run_send(records, category="tagesinfo")
    assert delivered == ["https://push.example/a"]
    assert res["sent"] == 1


def test_duplicate_endpoints_are_deduplicated():
    records = [
        _record("a", "https://push.example/a", device_id="dev-A"),
        _record("a2", "https://push.example/a", device_id="dev-A"),
    ]
    res, delivered = _run_send(records, target_device_id="dev-A")
    assert delivered == ["https://push.example/a"]
    assert res["sent"] == 1


# --- Abo-Erneuerung (pushsubscriptionchange): Uebernahme vom alten Endpoint ---

def test_renewal_keeps_device_id_email_and_categories():
    """Regression: Bei der Erneuerung aendert sich der Endpoint und damit der
    Schluessel. Ohne Uebernahme verloere das Geraet seine Zuordnung und
    1:1-Pushes kaemen nie wieder an."""
    prev = {"categories": ["tagesinfo", "bestellung", "kontakt"],
            "email": "kunde@example.com", "device_id": "dev-A"}
    cats, email, device_id = subscribe._apply_previous(
        prev, subscribe.ALL_CATEGORIES[:], False, False, "", "", True
    )
    assert device_id == "dev-A"
    assert email == "kunde@example.com"
    assert cats == ["tagesinfo", "bestellung", "kontakt"]


def test_renewal_migrates_legacy_categories():
    prev = {"categories": ["mittagstisch", "angebote"], "device_id": "dev-A"}
    cats, _e, _d = subscribe._apply_previous(
        prev, subscribe.ALL_CATEGORIES[:], False, False, "", "", True
    )
    assert cats == ["tagesinfo"]


def test_explicit_categories_win_over_previous():
    """Das Einstellungs-Menue setzt die Auswahl exakt – auch beim Abwaehlen."""
    prev = {"categories": ["tagesinfo", "news"], "device_id": "dev-A"}
    cats, _e, _d = subscribe._apply_previous(prev, ["news"], True, False, "", "", True)
    assert cats == ["news"]
    cats_empty, _e2, _d2 = subscribe._apply_previous(prev, [], True, False, "", "", True)
    assert cats_empty == []


def test_merge_adds_without_losing_previous():
    prev = {"categories": ["tagesinfo", "news"], "device_id": "dev-A"}
    cats, _e, _d = subscribe._apply_previous(prev, ["bestellung"], True, True, "", "", False)
    assert cats == ["tagesinfo", "news", "bestellung"]


def test_new_values_are_not_overwritten_by_previous():
    prev = {"categories": ["news"], "email": "alt@example.com", "device_id": "dev-ALT"}
    _c, email, device_id = subscribe._apply_previous(
        prev, ["news"], True, False, "neu@example.com", "dev-NEU", True
    )
    assert email == "neu@example.com"
    assert device_id == "dev-NEU"


def test_without_previous_record_nothing_is_invented():
    cats, email, device_id = subscribe._apply_previous({}, ["news"], True, False, "", "", False)
    assert cats == ["news"]
    assert email == ""
    assert device_id == ""


if __name__ == "__main__":
    failed = 0
    for name, fn in sorted(globals().items()):
        if name.startswith("test_") and callable(fn):
            try:
                fn()
                print(f"PASS {name}")
            except AssertionError as e:
                failed += 1
                print(f"FAIL {name}: {e}")
            except Exception as e:  # noqa: BLE001
                failed += 1
                print(f"ERROR {name}: {type(e).__name__}: {e}")
    print("---")
    print("Alle Tests bestanden." if not failed else f"{failed} Test(s) fehlgeschlagen.")
    sys.exit(1 if failed else 0)
