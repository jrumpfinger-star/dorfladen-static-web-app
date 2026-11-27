import azure.functions as func
import json
import hashlib
import os
import re
import uuid
from datetime import date, datetime
from email import policy
from email.parser import BytesParser
from zoneinfo import ZoneInfo
import msal
import requests


DEFAULT_URL_SETTING = "DV_DEFAULT_URL"
DEFAULT_URL_FALLBACK = "https://orgab4e2f00.crm16.dynamics.com"
ENTITY_SET = "dl_angebotes"
CMS_ENTITY_SET = "dl_seiteninhalts"
ACTION_LAYOUT_PREFIX = "angebote_layout_"
LEGACY_IMAGE_ID = re.compile(r"^[a-f0-9]{32}$")

# Physical Dataverse contract for drinks extensions. dl_artikelnummer remains
# the legacy barcode; article_number is stored separately in
# dl_stamm_artikelnummer.
ACTION_COLUMNS = {
    "dl_aktionsart", "dl_stamm_artikelnummer", "dl_anzahl", "dl_inhalt_ml",
    "dl_gebinde", "dl_pfand_cent", "dl_pfandfrei", "dl_stamm_vk_cent",
}
ACTION_COLUMN_TYPES = {
    "dl_aktionsart": "String",
    "dl_stamm_artikelnummer": "String",
    "dl_anzahl": "Integer",
    "dl_inhalt_ml": "Integer",
    "dl_gebinde": "String",
    "dl_pfand_cent": "Integer",
    "dl_pfandfrei": "Boolean",
    "dl_stamm_vk_cent": "Integer",
}
ACTION_FIELD_MAP = {
    "article_number": "dl_stamm_artikelnummer",
    "units": "dl_anzahl",
    "volume_ml": "dl_inhalt_ml",
    "packaging": "dl_gebinde",
    "deposit_cents": "dl_pfand_cent",
    "deposit_free": "dl_pfandfrei",
    "retail_price_cents": "dl_stamm_vk_cent",
}


class ActionRequestError(Exception):
    def __init__(self, status, message, details=None):
        super().__init__(message)
        self.status = status
        self.details = details


def _action_error_response(error):
    body = {"success": False, "error": str(error)}
    if getattr(error, "details", None):
        body["details"] = error.details
    return func.HttpResponse(
        json.dumps(body, ensure_ascii=False), status_code=error.status,
        mimetype="application/json", headers=get_cors_headers()
    )


def _guid(value, label):
    if not isinstance(value, str):
        raise ActionRequestError(400, f"{label} must be a UUID")
    try:
        return str(uuid.UUID(value))
    except (ValueError, AttributeError, TypeError):
        raise ActionRequestError(400, f"{label} must be a UUID")


def _action_identifier(value, label):
    if (not isinstance(value, str) or not value.strip() or len(value) > 256
            or any(ord(char) < 32 or ord(char) == 127 for char in value)):
        raise ActionRequestError(400, f"{label} must be a non-empty action id")
    return value


def _positive_int(value, label, allow_zero=False):
    if isinstance(value, bool) or not isinstance(value, int):
        raise ActionRequestError(400, f"{label} must be an integer")
    if value < (0 if allow_zero else 1):
        qualifier = "non-negative" if allow_zero else "positive"
        raise ActionRequestError(400, f"{label} must be {qualifier}")
    return value


def _validate_layout(layout):
    if layout is None:
        return None
    try:
        encoded = json.dumps(layout, ensure_ascii=False, allow_nan=False)
    except (TypeError, ValueError):
        raise ActionRequestError(400, "layout must contain only valid JSON values")
    if len(encoded.encode("utf-8")) > 2 * 1024 * 1024:
        raise ActionRequestError(413, "layout exceeds the 2 MB limit")

    def check(value, depth=0):
        if depth > 20:
            raise ActionRequestError(400, "layout is nested too deeply")
        if isinstance(value, dict):
            if len(value) > 500:
                raise ActionRequestError(400, "layout object has too many properties")
            for child in value.values():
                check(child, depth + 1)
        elif isinstance(value, list):
            if len(value) > 1000:
                raise ActionRequestError(400, "layout array has too many entries")
            for child in value:
                check(child, depth + 1)
        elif value is not None and not isinstance(value, (str, int, float, bool)):
            raise ActionRequestError(400, "layout must contain only JSON values")
        elif isinstance(value, float) and not (float("-inf") < value < float("inf")):
            raise ActionRequestError(400, "layout numbers must be finite")

    check(layout)
    if "design_origin" in layout:
        from shared.angebote import _design_origin, AngeboteFehler
        try:
            _design_origin(layout["design_origin"])
        except AngeboteFehler as error:
            raise ActionRequestError(error.status, error.text) from error
    pages = layout.get("pages")
    if pages is not None:
        if not isinstance(pages, list):
            raise ActionRequestError(400, "layout.pages must be an array")
        for page in pages:
            if not isinstance(page, dict):
                raise ActionRequestError(400, "each layout page must be an object")
            elements = page.get("elements", [])
            if not isinstance(elements, list):
                raise ActionRequestError(400, "layout page elements must be an array")
            if any(not isinstance(element, dict) for element in elements):
                raise ActionRequestError(400, "each layout element must be an object")
    target_styles = layout.get("target_styles")
    if target_styles is not None and (
            not isinstance(target_styles, dict) or set(target_styles) - {"card", "single", "scale", "scale_small"}
            or any(not isinstance(style, dict) for style in target_styles.values())):
        raise ActionRequestError(400, "layout.target_styles must map card, single, scale and scale_small to objects")
    cms = layout.get("cms")
    if cms is not None:
        if not isinstance(cms, dict):
            raise ActionRequestError(400, "layout.cms must be an object")
        for group in ("plakat_article_overrides", "flyer_article_overrides"):
            overrides = cms.get(group, {})
            if not isinstance(overrides, dict):
                raise ActionRequestError(400, f"layout.cms.{group} must be an object")
            for override in overrides.values():
                image = override.get("customImg") if isinstance(override, dict) else None
                if image is not None and (
                        not isinstance(image, str) or len(image) > 700000
                        or not re.fullmatch(r"data:image/(png|jpeg|webp);base64,[A-Za-z0-9+/=\r\n]+", image)):
                    raise ActionRequestError(400, "layout custom image must be an inline png, jpeg or webp image")
    image_refs = layout.get("image_refs")
    if image_refs is not None:
        if not isinstance(image_refs, dict) or len(image_refs) > 99:
            raise ActionRequestError(400, "layout.image_refs must be an object of at most 99 entries")
        canonical_ids = set()
        for item_id, image_id in image_refs.items():
            canonical_id = _guid(item_id, "layout.image_refs key")
            if canonical_id in canonical_ids:
                raise ActionRequestError(400, "layout.image_refs keys must be unique UUIDs")
            canonical_ids.add(canonical_id)
            valid_cms_key = (
                isinstance(image_id, str)
                and image_id.startswith("cms:")
                and _safe_cms_image_key(image_id[4:])
            )
            valid_legacy_id = (
                isinstance(image_id, str)
                and bool(LEGACY_IMAGE_ID.fullmatch(image_id))
            )
            if not (valid_cms_key or valid_legacy_id):
                raise ActionRequestError(
                    400,
                    "layout.image_refs values must be cms:<safe key> or a valid image id",
                )
    return layout


def _safe_cms_image_key(value):
    return (
        isinstance(value, str)
        and 1 <= len(value) <= 128
        and all(char.isalnum() or char in " ._-" for char in value)
    )


def _validate_action_body(body):
    if not isinstance(body, dict):
        raise ActionRequestError(400, "JSON body must be an object")

    action_id = _action_identifier(body.get("aktion_id"), "aktion_id")
    title = body.get("title")
    if not isinstance(title, str) or not title.strip():
        raise ActionRequestError(400, "title is required")
    title = title.strip()

    dates = []
    for field in ("valid_from", "valid_to"):
        value = body.get(field)
        try:
            parsed = date.fromisoformat(value) if isinstance(value, str) else None
        except ValueError:
            parsed = None
        if parsed is None or parsed.isoformat() != value:
            raise ActionRequestError(400, f"{field} must be a valid YYYY-MM-DD date")
        dates.append(parsed)
    if dates[0] > dates[1]:
        raise ActionRequestError(400, "valid_from must not be after valid_to")

    kind = body.get("kind")
    if kind not in ("weekly", "drinks"):
        raise ActionRequestError(400, "kind must be 'weekly' or 'drinks'")

    items = body.get("items")
    if not isinstance(items, list) or not items:
        raise ActionRequestError(400, "items must be a non-empty array")
    normalized_items = []
    seen_ids = set()
    for index, item in enumerate(items):
        label = f"items[{index}]"
        if not isinstance(item, dict):
            raise ActionRequestError(400, f"{label} must be an object")
        name = item.get("name")
        if not isinstance(name, str) or not name.strip():
            raise ActionRequestError(400, f"{label}.name is required")
        price = _positive_int(item.get("price_cents"), f"{label}.price_cents")
        old_price = item.get("old_price_cents")
        if old_price is not None:
            _positive_int(old_price, f"{label}.old_price_cents")
        description = item.get("description")
        if description is not None and not isinstance(description, str):
            raise ActionRequestError(400, f"{label}.description must be text")
        item_id = item.get("id")
        canonical_item_id = None
        if item_id not in (None, ""):
            canonical_item_id = _guid(item_id, f"{label}.id")
            if canonical_item_id in seen_ids:
                raise ActionRequestError(400, "item ids must be unique")
            seen_ids.add(canonical_item_id)
        normalized = {
            "id": item_id,
            "canonical_id": canonical_item_id,
            "name": name.strip(),
            "description": item.get("description"),
            "price_cents": price,
            "old_price_cents": old_price,
            "article_number": item.get("article_number"),
            "barcode": item.get("barcode"),
            "retail_price_cents": item.get("retail_price_cents"),
            "units": item.get("units"),
            "volume_ml": item.get("volume_ml"),
            "packaging": item.get("packaging"),
            "deposit_cents": item.get("deposit_cents"),
            "deposit_free": item.get("deposit_free"),
            "werbebild_id": item.get("werbebild_id"),
        }
        for field in ("article_number", "barcode", "packaging"):
            value = normalized[field]
            if value is not None and not isinstance(value, str):
                raise ActionRequestError(400, f"{label}.{field} must be text")
            if isinstance(value, str):
                normalized[field] = value.strip()
        for field in ("units", "volume_ml"):
            if normalized[field] is not None:
                _positive_int(normalized[field], f"{label}.{field}")
        if normalized["deposit_cents"] is not None:
            _positive_int(normalized["deposit_cents"],
                          f"{label}.deposit_cents", allow_zero=True)
        if normalized["deposit_free"] is not None and not isinstance(normalized["deposit_free"], bool):
            raise ActionRequestError(400, f"{label}.deposit_free must be true or false")
        if normalized["retail_price_cents"] is not None:
            _positive_int(normalized["retail_price_cents"],
                          f"{label}.retail_price_cents")
        if kind == "drinks":
            _positive_int(normalized["units"], f"{label}.units")
            _positive_int(normalized["volume_ml"], f"{label}.volume_ml")
            if not normalized["packaging"]:
                raise ActionRequestError(400, f"{label}.packaging is required")
            if not isinstance(normalized["deposit_free"], bool):
                raise ActionRequestError(400, f"{label}.deposit_free must be true or false")
            _positive_int(normalized["deposit_cents"],
                          f"{label}.deposit_cents", allow_zero=True)
            if normalized["deposit_free"] and normalized["deposit_cents"] != 0:
                raise ActionRequestError(400, f"{label}: deposit-free products must have zero deposit")
            if not normalized["deposit_free"] and normalized["deposit_cents"] == 0:
                raise ActionRequestError(400, f"{label}: choose deposit-free for zero deposit")
        normalized_items.append(normalized)

    original_ids = body.get("original_ids")
    if not isinstance(original_ids, list):
        raise ActionRequestError(400, "original_ids must be an array")
    normalized_originals = [_guid(value, "original_ids entry") for value in original_ids]
    if len(set(normalized_originals)) != len(normalized_originals):
        raise ActionRequestError(400, "original_ids must be unique")

    layout = body.get("layout") if "layout" in body else None
    if "layout" in body and layout is not None and not isinstance(layout, dict):
        raise ActionRequestError(400, "layout must be an object or null")
    if "layout" in body:
        layout = _validate_layout(layout)
    if layout and layout.get("image_refs"):
        item_ids = {
            item["canonical_id"] for item in normalized_items
            if item["canonical_id"]
        }
        for item_id in layout["image_refs"]:
            if _guid(item_id, "layout.image_refs key") not in item_ids:
                raise ActionRequestError(
                    400, "layout.image_refs keys must refer to items in this action"
                )

    return {
        "aktion_id": action_id, "title": title,
        "valid_from": dates[0].isoformat(), "valid_to": dates[1].isoformat(),
        "kind": kind, "items": normalized_items,
        "original_ids": normalized_originals,
        "layout_supplied": "layout" in body, "layout": layout,
    }


def _dataverse_url(base_url, entity_set):
    return f"{base_url}/api/data/v9.2/{entity_set}"


def _action_layout_key(action_id):
    return ACTION_LAYOUT_PREFIX + str(action_id or "")


def _layout_action_id(action_id):
    return action_id


def _today_berlin():
    return datetime.now(ZoneInfo("Europe/Berlin")).date()


def _not_expired(offer, today):
    """Public readers also receive upcoming actions; the homepage filters weeks."""
    start = (offer.get("valid_from") or "")[:10]
    end = (offer.get("valid_to") or "")[:10]
    try:
        date.fromisoformat(start)
        end_date = date.fromisoformat(end)
    except ValueError:
        return False
    return end_date >= today


def _is_extended_offer(offer):
    return offer.get("action_kind") == "drinks" or "action_layout" in offer


def _check_action_schema(base_url, headers):
    url = (f"{base_url}/api/data/v9.2/EntityDefinitions"
           f"(LogicalName='dl_angebote')/Attributes?$select=LogicalName,AttributeType")
    response = requests.get(url, headers=headers, timeout=30)
    if response.status_code != 200:
        raise ActionRequestError(
            503, "Drinks-offer schema readiness could not be verified",
            f"Dataverse metadata returned {response.status_code}: {response.text[:300]}"
        )
    attributes = {
        attribute.get("LogicalName"): attribute.get("AttributeType")
        for attribute in (response.json() or {}).get("value", [])
    }
    missing = sorted(ACTION_COLUMNS - set(attributes))
    wrong_types = sorted(
        f"{name} (expected {expected}, found {attributes.get(name)})"
        for name, expected in ACTION_COLUMN_TYPES.items()
        if name in attributes and attributes[name] != expected
    )
    if missing or wrong_types:
        raise ActionRequestError(
            503, "Drinks offers are not ready: Dataverse schema is missing or incompatible",
            "; ".join(
                ([f"missing: {', '.join(missing)}"] if missing else []) +
                ([f"wrong type: {', '.join(wrong_types)}"] if wrong_types else [])
            )
        )


def _read_action_rows(base_url, headers, action_id):
    escaped_action_id = action_id.replace("'", "''")
    response = requests.get(
        _dataverse_url(base_url, ENTITY_SET),
        params={"$filter": f"dl_aktion_id eq '{escaped_action_id}'"},
        headers=headers, timeout=30
    )
    if response.status_code != 200:
        raise ActionRequestError(
            503, "Could not load current offer action",
            f"Dataverse returned {response.status_code}: {response.text[:300]}"
        )
    rows = response.json().get("value", [])
    if rows or not action_id.startswith("AUTO-"):
        return rows

    legacy_rows = _read_untagged_rows(base_url, headers)
    matching = [
        row for row in legacy_rows
        if _legacy_action_identifier(row) == action_id
    ]
    if not matching:
        raise ActionRequestError(409, "Legacy offer action could not be verified; reload before saving")
    return matching


def _legacy_action_identifier(row):
    if row.get("dl_aktion_id") not in (None, ""):
        return None
    valid_from = str(row.get("dl_gueltig_von") or "")
    valid_to = str(row.get("dl_gueltig_bis") or "")
    title = str(row.get("dl_aktion_titel") or row.get("dl_produkt") or "")
    return "AUTO-" + "-".join((valid_from, valid_to, title))


def _read_untagged_rows(base_url, headers):
    url = _dataverse_url(base_url, ENTITY_SET)
    params = {
        "$filter": "(dl_aktion_id eq null or dl_aktion_id eq '') and dl_status eq 101001",
        "$select": (
            "dl_angeboteid,dl_aktion_id,dl_aktion_titel,dl_produkt,"
            "dl_gueltig_von,dl_gueltig_bis,dl_status"
        ),
    }
    rows = []
    while url:
        response = requests.get(url, params=params, headers=headers, timeout=30)
        if response.status_code != 200:
            raise ActionRequestError(
                503, "Could not verify legacy offer action ownership",
                f"Dataverse returned {response.status_code}: {response.text[:300]}"
            )
        data = response.json()
        rows.extend(data.get("value", []))
        url = data.get("@odata.nextLink")
        params = None
    return rows


def _read_action_layout(base_url, headers, action_id):
    key = _action_layout_key(action_id)
    escaped_key = key.replace("'", "''")
    response = requests.get(
        _dataverse_url(base_url, CMS_ENTITY_SET),
        params={
            "$filter": f"dl_schluessel eq '{escaped_key}'",
            "$select": "dl_seiteninhaltid,dl_schluessel,dl_wert",
        },
        headers=headers, timeout=30
    )
    if response.status_code != 200:
        raise ActionRequestError(
            503, "Could not load offer action layout",
            f"Dataverse returned {response.status_code}: {response.text[:300]}"
        )
    values = response.json().get("value", [])
    if len(values) > 1:
        raise ActionRequestError(503, "Offer action layout key is not unique")
    return values[0] if values else None


def _record_etag(record, label):
    etag = record.get("@odata.etag")
    if not etag:
        raise ActionRequestError(
            503, f"Dataverse did not provide a version for the {label}"
        )
    return etag


def _action_revision(rows, layout):
    versions = sorted(
        (_guid(row.get("dl_angeboteid"), "offer item"),
         _record_etag(row, "offer item")) for row in rows
    )
    layout_version = (
        [layout.get("dl_seiteninhaltid"), _record_etag(layout, "offer layout")]
        if layout else None
    )
    encoded = json.dumps([versions, layout_version], separators=(",", ":"))
    return hashlib.sha256(encoded.encode("utf-8")).hexdigest()


def _check_action_revision(body, rows, layout):
    expected = body.get("revision")
    if expected is None and not rows and not layout:
        return
    if (not isinstance(expected, str) or not re.fullmatch(r"[a-f0-9]{64}", expected)
            or expected != _action_revision(rows, layout)):
        raise ActionRequestError(409, "Offer action changed; reload before saving")


def _row_payload(action, item, sort_order):
    payload = {
        "dl_produkt": item["name"],
        "dl_details": item["description"],
        "dl_preis": item["price_cents"] / 100,
        "dl_statt_preis": (item["old_price_cents"] / 100
                           if item["old_price_cents"] is not None else None),
        "dl_aktion_titel": action["title"],
        "dl_aktion_id": action["aktion_id"],
        "dl_artikelnummer": item["barcode"],
        "dl_gueltig_von": action["valid_from"],
        "dl_gueltig_bis": action["valid_to"],
        "dl_sortierung": sort_order,
        "dl_status": 101001,
        "dl_aktionsart": action["kind"],
    }
    for field, column in ACTION_FIELD_MAP.items():
        payload[column] = item[field]
    if item["werbebild_id"] not in (None, ""):
        payload["dl_WerbebildId@odata.bind"] = (
            f"/dl_werbebilds({_guid(item['werbebild_id'], 'werbebild_id')})"
        )
    elif item["werbebild_id"] == "":
        payload["dl_WerbebildId@odata.bind"] = None
    return payload


def _add_batch_part(parts, content_id, method, path, payload=None, etag=None):
    headers = [
        "Content-Type: application/http",
        "Content-Transfer-Encoding: binary",
        f"Content-ID: {content_id}",
        "",
    ]
    request_headers = [
        "Accept: application/json",
        "Content-Type: application/json;type=entry",
    ]
    if method == "POST":
        request_headers.append("Prefer: return=representation")
    if etag:
        request_headers.append(f"If-Match: {etag}")
    request = [f"{method} /api/data/v9.2/{path} HTTP/1.1", *request_headers, ""]
    if payload is not None:
        request.append(json.dumps(payload, ensure_ascii=False, separators=(",", ":")))
    parts.append("\r\n".join([*headers, *request]))


def _batch_body(operations):
    batch_boundary = "batch_" + uuid.uuid4().hex
    changeset_boundary = "changeset_" + uuid.uuid4().hex
    parts = [
        f"--{batch_boundary}",
        f"Content-Type: multipart/mixed;boundary={changeset_boundary}",
        "",
    ]
    for index, operation in enumerate(operations, 1):
        parts.append(f"--{changeset_boundary}")
        _add_batch_part(
            parts, index, operation["method"], operation["path"],
            operation.get("payload"), operation.get("etag")
        )
    parts.append(f"--{changeset_boundary}--")
    parts.extend(["", f"--{batch_boundary}--", ""])
    return batch_boundary, "\r\n".join(parts)


def _parse_batch_responses(response, operations):
    content_type = response.headers.get("Content-Type", "")
    wrapped = (f"Content-Type: {content_type}\r\nMIME-Version: 1.0\r\n\r\n"
               ).encode("ascii") + response.content
    message = BytesParser(policy=policy.default).parsebytes(wrapped)
    leaves = []

    def collect(part):
        if part.is_multipart():
            for child in part.iter_parts():
                collect(child)
        else:
            leaves.append(part)

    collect(message)
    results = {}
    unlabelled = []
    for part in leaves:
        content_id = part.get("Content-ID")
        raw = part.get_payload(decode=True) or b""
        text = raw.decode("utf-8", errors="replace")
        match = re.search(r"HTTP/1\.[01]\s+(\d{3})", text)
        if not match:
            continue
        status = int(match.group(1))
        headers_text, _, body = text.partition("\r\n\r\n")
        entity_match = re.search(
            r"OData-EntityId:\s*[^\r\n]*\(([^)]+)\)", headers_text, re.IGNORECASE
        )
        created_id = entity_match.group(1) if entity_match else None
        if not created_id and body.strip():
            try:
                created_id = json.loads(body).get("dl_angeboteid")
            except (ValueError, AttributeError):
                pass
        result = {"status": status, "created_id": created_id}
        if content_id:
            results[str(content_id).strip("<>")] = result
        else:
            unlabelled.append(result)
    for index, result in enumerate(unlabelled, 1):
        results[str(index)] = result

    if response.status_code not in (200, 202):
        conflict = response.status_code in (409, 412) or re.search(
            r"HTTP/1\.[01]\s+(409|412)\b", response.text
        )
        raise ActionRequestError(
            409 if conflict else 503, "Dataverse action transaction failed",
            f"Dataverse batch returned {response.status_code}: {response.text[:500]}"
        )
    for index, operation in enumerate(operations, 1):
        result = results.get(str(index))
        if not result:
            raise ActionRequestError(503, "Dataverse returned an incomplete action transaction result")
        if result["status"] not in (200, 201, 202, 204):
            status = 409 if result["status"] in (409, 412) else 503
            raise ActionRequestError(
                status, "Dataverse action transaction failed",
                f"Operation {index} returned {result['status']}"
            )
        if operation.get("client_id") is not None:
            created_id = result.get("created_id")
            if not created_id:
                raise ActionRequestError(
                    503, "Dataverse saved an item but did not return its stable id"
                )
            operation["saved_id"] = str(uuid.UUID(created_id))


def _run_action_batch(base_url, headers, operations):
    if not operations:
        return
    if len(operations) > 1000:
        raise ActionRequestError(
            400, "Action exceeds Dataverse's 1000-operation transaction limit"
        )
    boundary, body = _batch_body(operations)
    batch_headers = {
        **headers,
        "Content-Type": f"multipart/mixed; boundary={boundary}",
        "Prefer": "return=representation",
    }
    response = requests.post(
        f"{base_url}/api/data/v9.2/$batch",
        headers=batch_headers, data=body.encode("utf-8"), timeout=60
    )
    _parse_batch_responses(response, operations)


def _save_action(base_url, headers, body):
    action = _validate_action_body(body)
    _check_action_schema(base_url, headers)
    current_rows = _read_action_rows(base_url, headers, action["aktion_id"])
    current_by_id = {
        str(row.get("dl_angeboteid", "")).lower(): row for row in current_rows
    }
    current_ids = set(current_by_id)
    if current_ids != set(action["original_ids"]):
        raise ActionRequestError(409, "Offer action changed; reload before saving")
    current_layout = _read_action_layout(base_url, headers, action["aktion_id"])
    _check_action_revision(body, current_rows, current_layout)

    operations = []
    saved_items = []
    incoming_ids = set()
    for index, item in enumerate(action["items"]):
        row_id = item["canonical_id"]
        row_payload = _row_payload(action, item, index)
        if row_id and row_id in current_by_id:
            existing = current_by_id[row_id]
            operation = {
                "method": "PATCH",
                "path": f"{ENTITY_SET}({row_id})",
                "payload": row_payload,
                "etag": _record_etag(existing, "offer item"),
            }
            saved_id = row_id
            incoming_ids.add(row_id)
        else:
            # The client's GUID becomes the row key so layout and image
            # references stay valid and the next save passes the ownership check.
            new_id = row_id or str(uuid.uuid4())
            operation = {
                "method": "POST", "path": ENTITY_SET,
                "payload": {**row_payload, "dl_angeboteid": new_id},
                "client_id": item["id"] or new_id,
            }
            saved_id = None
        operations.append(operation)
        saved_items.append({"id": saved_id, "client_id": item["id"]})

    for row_id, row in current_by_id.items():
        if row_id not in incoming_ids:
            operations.append({
                "method": "DELETE", "path": f"{ENTITY_SET}({row_id})",
                "etag": _record_etag(row, "offer item"),
            })

    if action["layout_supplied"]:
        config_key = _action_layout_key(action["aktion_id"])
        if action["layout"] is None:
            if current_layout:
                operations.append({
                    "method": "DELETE",
                    "path": f"{CMS_ENTITY_SET}({current_layout['dl_seiteninhaltid']})",
                    "etag": _record_etag(current_layout, "offer layout"),
                })
        else:
            config_payload = {
                "dl_schluessel": config_key,
                "dl_bezeichnung": "Getränke-Angebotsflyer Layout",
                "dl_wert": json.dumps(action["layout"], ensure_ascii=False),
            }
            if current_layout:
                operations.append({
                    "method": "PATCH",
                    "path": f"{CMS_ENTITY_SET}({current_layout['dl_seiteninhaltid']})",
                    "payload": config_payload,
                    "etag": _record_etag(current_layout, "offer layout"),
                })
            else:
                operations.append({
                    "method": "POST", "path": CMS_ENTITY_SET,
                    "payload": config_payload,
                })

    _run_action_batch(base_url, headers, operations)
    for index, operation in enumerate(operations):
        if operation.get("client_id") is not None:
            saved_items[index]["id"] = operation["saved_id"]
    return {"success": True, "aktion_id": action["aktion_id"], "items": saved_items}


def _delete_action(base_url, headers, body):
    if not isinstance(body, dict):
        raise ActionRequestError(400, "JSON body must be an object")
    action_id = _action_identifier(body.get("aktion_id"), "aktion_id")
    original_ids = body.get("original_ids")
    if not isinstance(original_ids, list):
        raise ActionRequestError(400, "original_ids must be an array")
    original_ids = [_guid(value, "original_ids entry") for value in original_ids]
    if len(set(original_ids)) != len(original_ids):
        raise ActionRequestError(400, "original_ids must be unique")

    rows = _read_action_rows(base_url, headers, action_id)
    current_by_id = {
        str(row.get("dl_angeboteid", "")).lower(): row for row in rows
    }
    if set(original_ids) != set(current_by_id):
        raise ActionRequestError(409, "Offer action changed; reload before deleting")
    layout = _read_action_layout(base_url, headers, action_id)
    if not current_by_id and not layout:
        raise ActionRequestError(404, "Offer action not found")
    _check_action_revision(body, rows, layout)

    operations = [{
        "method": "DELETE", "path": f"{ENTITY_SET}({row_id})",
        "etag": _record_etag(row, "offer item"),
    } for row_id, row in current_by_id.items()]
    if layout:
        operations.append({
            "method": "DELETE",
            "path": f"{CMS_ENTITY_SET}({layout['dl_seiteninhaltid']})",
            "etag": _record_etag(layout, "offer layout"),
        })
    _run_action_batch(base_url, headers, operations)
    return {"success": True, "aktion_id": action_id}


def _read_action_layouts_for_public(base_url, headers, action_ids, revisions=None):
    if not action_ids:
        return {}
    prefix = ACTION_LAYOUT_PREFIX.replace("'", "''")
    url = (_dataverse_url(base_url, CMS_ENTITY_SET) +
           f"?$filter=startswith(dl_schluessel,'{prefix}')"
           "&$select=dl_schluessel,dl_wert,dl_seiteninhaltid")
    response = requests.get(url, headers=headers, timeout=30)
    if response.status_code != 200:
        raise ActionRequestError(
            503, "Could not load offer action layouts",
            f"Dataverse returned {response.status_code}: {response.text[:300]}"
        )
    wanted = {
        _action_layout_key(_layout_action_id(action_id))
        for action_id in action_ids
    }
    layouts = {}
    for config in response.json().get("value", []):
        key = config.get("dl_schluessel")
        if key not in wanted:
            continue
        try:
            layouts[key] = json.loads(config.get("dl_wert") or "null")
        except (ValueError, TypeError):
            raise ActionRequestError(503, "Stored offer action layout is invalid JSON")
        if revisions is not None:
            revisions[key] = config
    return layouts


def _offer_runtime_config(req):
    namespace = os.environ.get("ANGEBOTE_NAMESPACE", "").strip()
    runtime = {
        "feature_archive_enabled": bool(os.environ.get("ANGEBOTE_NAMESPACE")),
    }
    if not re.fullmatch(r"[a-z0-9][a-z0-9-]{0,62}", namespace):
        return runtime
    from shared.angebote import scale_scope

    forwarded_host = (req.headers.get("X-Forwarded-Host")
                      or req.headers.get("Host") or "")
    host = forwarded_host.split(",")[0].strip().lower().split(":")[0]
    allowed_hosts = {"www.dorfladen-oberornau.de", "dorfladen-oberornau.de"}
    production_host = host in allowed_hosts
    enabled = (production_host and
               os.environ.get("ANGEBOTE_WAAGE_SEND_ENABLED", "").lower() == "true")
    runtime.update({
        "scale_enabled": enabled,
        "scale_scope": scale_scope(namespace),
    })
    return runtime


def get_token():
    from shared.dataverse import get_tenant_id, get_client_id
    tenant_id = get_tenant_id()
    client_id = get_client_id()
    client_secret = os.environ.get("DV_CLIENT_SECRET", "")
    target_url = os.environ.get(DEFAULT_URL_SETTING, DEFAULT_URL_FALLBACK)
    if not client_secret:
        return "FEHLER_SECRET_FEHLT"
    try:
        a = msal.ConfidentialClientApplication(
            client_id,
            authority=f"https://login.microsoftonline.com/{tenant_id}",
            client_credential=client_secret,
        )
        r = a.acquire_token_for_client(scopes=[f"{target_url}/.default"])
        return r.get("access_token")
    except Exception as e:
        return f"FEHLER: {str(e)}"


def _base_url():
    return os.environ.get(DEFAULT_URL_SETTING, DEFAULT_URL_FALLBACK)


def get_headers():
    token = get_token()
    return {
        "Authorization": f"Bearer {token}",
        "OData-MaxVersion": "4.0",
        "OData-Version": "4.0",
        "Accept": "application/json",
        "Content-Type": "application/json; charset=utf-8"
    }


def _build_offer_payload(body):
    payload = {
        "dl_produkt": body.get("dl_produkt") or body.get("name") or body.get("produkt") or "",
        "dl_details": body.get("dl_details") if body.get("dl_details") is not None else body.get("details"),
        "dl_preis": body.get("dl_preis") if body.get("dl_preis") is not None else body.get("price") or body.get("preis"),
        "dl_statt_preis": body.get("dl_statt_preis") if body.get("dl_statt_preis") is not None else body.get("old_price") or body.get("statt_preis"),
        "dl_aktion_titel": body.get("dl_aktion_titel") or body.get("aktion_titel"),
        "dl_aktion_id": body.get("dl_aktion_id") or body.get("aktion_id"),
        "dl_artikelnummer": body.get("dl_artikelnummer") or body.get("artikelnummer"),
        "dl_gueltig_von": body.get("dl_gueltig_von") or body.get("valid_from") or body.get("gueltig_von"),
        "dl_gueltig_bis": body.get("dl_gueltig_bis") or body.get("valid_to") or body.get("gueltig_bis"),
        # dl_bild_base64 field does not exist in Dataverse dl_angebote table - skip it
        "dl_sortierung": body.get("dl_sortierung") if body.get("dl_sortierung") is not None else body.get("sortierung"),
        "dl_status": body.get("dl_status") if body.get("dl_status") is not None else body.get("status")
    }

    if payload.get("dl_status") is None:
        payload["dl_status"] = 101001

    clean = {}
    for key, value in payload.items():
        if value is not None and value != "":
            clean[key] = value
    return clean

def get_cors_headers():
    return {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, POST, PATCH, OPTIONS, DELETE",
        "Access-Control-Allow-Headers": "*",
        "Access-Control-Max-Age": "86400",
        "Content-Type": "application/json; charset=utf-8"
    }

def main(req: func.HttpRequest) -> func.HttpResponse:
    from shared.auth import admin_auth_guard
    _auth = admin_auth_guard(req)
    if _auth is not None:
        return _auth
    if req.method == "OPTIONS":
        return func.HttpResponse(status_code=200, headers=get_cors_headers())
    try:
        method = req.method.upper()
        offer_id = req.route_params.get("id")
        action = req.params.get("action", "").lower()
        if method == "POST" and action in ("save", "delete"):
            from shared.auth import token_valid
            if not token_valid(req):
                return func.HttpResponse(
                    json.dumps({"success": False, "error": "CMS authentication required"}),
                    status_code=401, mimetype="application/json",
                    headers=get_cors_headers()
                )
        base_url = _base_url()
        headers = get_headers()

        if method == "GET":
            # Expand linked werbebild to include image data
            expand = "&$expand=dl_WerbebildId($select=dl_werbebildid,dl_artikelnummer,dl_bild_base64,dl_download_url)"
            url = f"{base_url}/api/data/v9.2/{ENTITY_SET}?$filter=dl_status eq 101001&$orderby=dl_aktion_id desc,dl_sortierung asc,dl_produkt asc{expand}"
            r = requests.get(url, headers=headers, timeout=30)

            if r.status_code == 200:
                data = r.json()
                angebote_list = []
                for item in data.get("value", []):
                    wb = item.get("dl_WerbebildId") or {}
                    angebote_list.append({
                        "id": item.get("dl_angeboteid"),
                        "dl_angeboteid": item.get("dl_angeboteid"),
                        "name": item.get("dl_produkt", ""),
                        "produkt": item.get("dl_produkt", ""),
                        "dl_produkt": item.get("dl_produkt", ""),
                        "details": item.get("dl_details", "") or item.get("dl_beschreibung", ""),
                        "dl_details": item.get("dl_details", "") or item.get("dl_beschreibung", ""),
                        "price": item.get("dl_preis", 0),
                        "preis": item.get("dl_preis", 0),
                        "dl_preis": item.get("dl_preis", 0),
                        "old_price": item.get("dl_statt_preis", 0),
                        "statt_preis": item.get("dl_statt_preis", 0),
                        "dl_statt_preis": item.get("dl_statt_preis", 0),
                        "aktion_titel": item.get("dl_aktion_titel", ""),
                        "dl_aktion_titel": item.get("dl_aktion_titel", ""),
                        "aktion_id": item.get("dl_aktion_id", ""),
                        "dl_aktion_id": item.get("dl_aktion_id", ""),
                        "artikelnummer": item.get("dl_artikelnummer", ""),
                        "dl_artikelnummer": item.get("dl_artikelnummer", ""),
                        "action_kind": item.get("dl_aktionsart") or "weekly",
                        "barcode": item.get("dl_artikelnummer", ""),
                        "article_number": item.get("dl_stamm_artikelnummer", ""),
                        "units": item.get("dl_anzahl"),
                        "volume_ml": item.get("dl_inhalt_ml"),
                        "packaging": item.get("dl_gebinde"),
                        "deposit_cents": item.get("dl_pfand_cent"),
                        "deposit_free": item.get("dl_pfandfrei"),
                        "retail_price_cents": item.get("dl_stamm_vk_cent"),
                        "valid_from": item.get("dl_gueltig_von"),
                        "gueltig_von": item.get("dl_gueltig_von"),
                        "dl_gueltig_von": item.get("dl_gueltig_von"),
                        "valid_to": item.get("dl_gueltig_bis"),
                        "gueltig_bis": item.get("dl_gueltig_bis"),
                        "dl_gueltig_bis": item.get("dl_gueltig_bis"),
                        "sortierung": item.get("dl_sortierung", 0),
                        "dl_sortierung": item.get("dl_sortierung", 0),
                        "status": item.get("dl_status"),
                        "dl_status": item.get("dl_status"),
                        "bild_data": wb.get("dl_download_url", "") or wb.get("dl_bild_base64", ""),
                        "image_key": wb.get("dl_artikelnummer") or item.get("dl_artikelnummer") or "",
                        "dl_bild_base64": wb.get("dl_bild_base64", ""),
                        "dl_download_url": wb.get("dl_download_url", ""),
                        "dl_werbebildid": wb.get("dl_werbebildid", "") or item.get("_dl_werbebildid_value", ""),
                        "werbebild_id": wb.get("dl_werbebildid", "") or item.get("_dl_werbebildid_value", ""),
                    })
                action_ids = {
                    _layout_action_id(item.get("aktion_id") or _legacy_action_identifier(item))
                    for item in angebote_list
                }
                layout_revisions = {}
                layouts = _read_action_layouts_for_public(base_url, headers, action_ids, layout_revisions)
                for item in angebote_list:
                    layout_key = _action_layout_key(
                        _layout_action_id(item.get("aktion_id", ""))
                    )
                    if layout_key in layouts:
                        item["action_layout"] = layouts[layout_key]
                from shared.auth import token_valid
                is_admin = token_valid(req)
                if is_admin:
                    grouped_rows = {}
                    for row in data.get("value", []):
                        identifier = row.get("dl_aktion_id") or _legacy_action_identifier(row)
                        grouped_rows.setdefault(identifier, []).append(row)
                    for item in angebote_list:
                        identifier = item.get("aktion_id") or _legacy_action_identifier(item)
                        key = _action_layout_key(_layout_action_id(identifier))
                        item["action_revision"] = _action_revision(grouped_rows[identifier], layout_revisions.get(key))
                if not is_admin:
                    for item in angebote_list:
                        item.pop("retail_price_cents", None)

                # Public readers get new Dataverse actions until they expire, so
                # the homepage can show next week's actions (it filters weeks).
                # Legacy rows retain the previous all-active-rows behavior.
                # Admin readers retain the overview, including planned/expired rows.
                filter_param = req.params.get("filter", "").lower()
                if not is_admin or filter_param == "today":
                    today = _today_berlin()
                    filtered = []
                    for a in angebote_list:
                        if not is_admin and _is_extended_offer(a) and not _not_expired(a, today):
                            continue
                        if filter_param == "today":
                            try:
                                von = date.fromisoformat((a.get("dl_gueltig_von") or "")[:10])
                            except ValueError:
                                von = None
                            try:
                                bis = date.fromisoformat((a.get("dl_gueltig_bis") or "")[:10])
                            except ValueError:
                                bis = None
                            if (von and von > today) or (bis and bis < today):
                                continue
                        filtered.append(a)
                    angebote_list = filtered

                result = {"success": True, "data": angebote_list}
                result["config"] = (
                    _offer_runtime_config(req) if is_admin else {
                        "feature_archive_enabled": bool(
                            os.environ.get("ANGEBOTE_NAMESPACE")
                        )
                    }
                )
                return func.HttpResponse(
                    json.dumps(result, ensure_ascii=False),
                    status_code=200,
                    mimetype="application/json",
                    headers=get_cors_headers()
                )

            return func.HttpResponse(
                json.dumps({"success": False, "error": f"Dataverse error: {r.status_code}"}, ensure_ascii=False),
                status_code=r.status_code,
                mimetype="application/json",
                headers=get_cors_headers()
            )

        if method == "POST" and action in ("save", "delete"):
            try:
                body = req.get_json()
            except ValueError:
                raise ActionRequestError(400, "Invalid JSON body")
            result = (_save_action(base_url, headers, body) if action == "save"
                  else _delete_action(base_url, headers, body))
            return func.HttpResponse(
            json.dumps(result, ensure_ascii=False), status_code=200,
            mimetype="application/json", headers=get_cors_headers()
            )

        if method == "POST":
            body = req.get_json()
            payload = _build_offer_payload(body)

            # Optionally bind werbebild lookup
            werbebild_id = body.get("dl_werbebildid") or body.get("werbebildid")
            if werbebild_id:
                payload["dl_WerbebildId@odata.bind"] = f"/dl_werbebilds({werbebild_id})"

            post_headers = {**headers, "Prefer": "return=representation"}
            r = requests.post(
                f"{base_url}/api/data/v9.2/{ENTITY_SET}",
                headers=post_headers,
                json=payload,
                timeout=30
            )
            if r.status_code in (200, 201, 204):
                new_id = ""
                if r.status_code != 204:
                    try:
                        new_id = r.json().get("dl_angeboteid", "")
                    except:
                        pass
                if not new_id:
                    eid = r.headers.get("OData-EntityId", "")
                    if "(" in eid:
                        new_id = eid.split("(")[-1].rstrip(")")
                return func.HttpResponse(
                    json.dumps({"success": True, "id": new_id}, ensure_ascii=False),
                    status_code=200,
                    mimetype="application/json",
                    headers=get_cors_headers()
                )

            return func.HttpResponse(
                json.dumps({"success": False, "error": f"Dataverse error: {r.status_code}", "details": r.text[:300]}, ensure_ascii=False),
                status_code=r.status_code,
                mimetype="application/json",
                headers=get_cors_headers()
            )

        if method == "PATCH":
            if not offer_id:
                return func.HttpResponse(
                    json.dumps({"success": False, "error": "Missing offer id"}, ensure_ascii=False),
                    status_code=400,
                    mimetype="application/json",
                    headers=get_cors_headers()
                )

            body = req.get_json()
            payload = _build_offer_payload(body)

            # Allow explicit clearing of optional text fields on PATCH.
            # _build_offer_payload drops empty/None values (correct for POST),
            # but on PATCH a cleared field must overwrite the existing value.
            for _clear_key, _body_keys in (("dl_details", ("dl_details", "details")),):
                if any(k in body for k in _body_keys):
                    _val = None
                    for k in _body_keys:
                        if k in body and body.get(k) is not None:
                            _val = body.get(k)
                            break
                    if _val is None or _val == "":
                        payload[_clear_key] = None

            # Optionally bind or unbind werbebild lookup
            werbebild_id = body.get("dl_werbebildid") or body.get("werbebildid")
            if werbebild_id:
                payload["dl_WerbebildId@odata.bind"] = f"/dl_werbebilds({werbebild_id})"

            patch_headers = {**headers, "If-Match": "*"}
            r = requests.patch(
                f"{base_url}/api/data/v9.2/{ENTITY_SET}({offer_id})",
                headers=patch_headers,
                json=payload,
                timeout=30
            )
            if r.status_code in (200, 204):
                return func.HttpResponse(
                    json.dumps({"success": True}, ensure_ascii=False),
                    status_code=200,
                    mimetype="application/json",
                    headers=get_cors_headers()
                )

            return func.HttpResponse(
                json.dumps({"success": False, "error": f"Dataverse error: {r.status_code}", "details": r.text[:300]}, ensure_ascii=False),
                status_code=r.status_code,
                mimetype="application/json",
                headers=get_cors_headers()
            )

        if method == "DELETE":
            if not offer_id:
                return func.HttpResponse(
                    json.dumps({"success": False, "error": "Missing offer id"}, ensure_ascii=False),
                    status_code=400,
                    mimetype="application/json",
                    headers=get_cors_headers()
                )

            del_headers = {**headers, "If-Match": "*"}
            r = requests.delete(
                f"{base_url}/api/data/v9.2/{ENTITY_SET}({offer_id})",
                headers=del_headers,
                timeout=30
            )
            if r.status_code in (200, 204):
                return func.HttpResponse(
                    json.dumps({"success": True}, ensure_ascii=False),
                    status_code=200,
                    mimetype="application/json",
                    headers=get_cors_headers()
                )

            return func.HttpResponse(
                json.dumps({"success": False, "error": f"Dataverse error: {r.status_code}", "details": r.text[:300]}, ensure_ascii=False),
                status_code=r.status_code,
                mimetype="application/json",
                headers=get_cors_headers()
            )

        return func.HttpResponse(
            json.dumps({"success": False, "error": f"Unsupported method: {method}"}, ensure_ascii=False),
            status_code=405,
            mimetype="application/json",
            headers=get_cors_headers()
        )
    except ActionRequestError as e:
        return _action_error_response(e)
    except requests.RequestException as e:
        return func.HttpResponse(
            json.dumps({"success": False, "error": "Dataverse request failed",
                        "details": str(e)[:300]}, ensure_ascii=False),
            status_code=503, mimetype="application/json",
            headers=get_cors_headers()
        )
    except Exception as e:
        return func.HttpResponse(
            json.dumps({"success": False, "error": str(e)}, ensure_ascii=False),
            status_code=500,
            mimetype="application/json",
            headers=get_cors_headers()
        )
