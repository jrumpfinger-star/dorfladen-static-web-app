"""End-to-End-Setup + Live-Smoke-Test für den Kiosk-Kalender.

Schritte:
  1) Tabellen dl_kalendereintrag / dl_kalender_override sicherstellen (idempotent)
  2) Anpassungen veröffentlichen
  3) Live-Smoke-Test direkt gegen Dataverse (POST/GET/PATCH/DELETE)

Schreibt alle Ergebnisse nach scripts/kalender_setup_result.json (keine Secrets).
Ausführen:  python scripts/setup_and_smoketest_kalender.py
"""
import json
import os
import sys
import time
import traceback
from datetime import date

import requests

sys.path.insert(0, os.path.dirname(__file__))
import create_kalender_entity as C  # noqa: E402

RESULT = {"steps": []}
RESULT_PATH = os.path.join(os.path.dirname(__file__), "kalender_setup_result.json")
API = "/api/data/v9.2"


def log(step, ok, detail=""):
    RESULT["steps"].append({"step": step, "ok": bool(ok), "detail": str(detail)[:500]})
    _flush()


def _flush():
    with open(RESULT_PATH, "w", encoding="utf-8") as f:
        json.dump(RESULT, f, ensure_ascii=False, indent=2)


def main():
    try:
        cfg = C.load_settings()
        base = cfg["DV_DEFAULT_URL"].rstrip("/")
        RESULT["dataverse"] = base
        token = C.get_token(cfg)
        log("token", True)
        solution = C.find_solution(base, token)
        RESULT["solution"] = solution
        dv = C.DV(base, token, solution)

        # 1) Tabellen sicherstellen
        ok1 = C.ensure_table(dv, C.entity_kalendereintrag(), "dl_kalendereintrag", C.EINTRAG_ATTRS)
        log("ensure_dl_kalendereintrag", ok1)
        ok2 = C.ensure_table(dv, C.entity_override(), "dl_kalender_override", C.OVERRIDE_ATTRS)
        log("ensure_dl_kalender_override", ok2)

        # 2) Veröffentlichen
        pr = dv.publish_all()
        log("publish_all", pr.status_code in (200, 204), pr.status_code)

        # kurze Wartezeit, damit EntitySet verfügbar ist
        time.sleep(5)

        # 3) Smoke-Test direkt gegen Dataverse
        h = {
            "Authorization": f"Bearer {token}",
            "OData-MaxVersion": "4.0", "OData-Version": "4.0",
            "Accept": "application/json",
            "Content-Type": "application/json; charset=utf-8",
        }
        eset = f"{base}{API}/dl_kalendereintrags"
        today = date.today().isoformat()

        # POST
        payload = {
            "dl_titel": "SMOKETEST Eintrag", "dl_datum": today, "dl_ganztags": True,
            "dl_uhrzeit": "", "dl_kategorie": "aufgabe", "dl_wiederholung": "",
            "dl_stammkundeid": "", "dl_kunde_freitext": "Testkunde",
            "dl_status": "offen", "dl_notiz": "vom Setup-Smoketest",
        }
        rp = requests.post(eset, headers={**h, "Prefer": "return=representation"}, json=payload, timeout=60)
        created_ok = rp.status_code in (200, 201)
        rec = rp.json() if (created_ok and rp.text) else {}
        rec_id = rec.get("dl_kalendereintragid")
        log("smoke_post", created_ok and bool(rec_id), f"{rp.status_code} id={rec_id or rp.text[:200]}")

        if rec_id:
            # GET (Filter auf heute)
            rg = requests.get(
                eset, headers=h,
                params={"$filter": f"dl_datum eq {today}", "$select": "dl_titel,dl_ganztags,dl_status,dl_kunde_freitext", "$top": "10"},
                timeout=60,
            )
            got = rg.json().get("value", []) if rg.status_code == 200 else []
            found = any(x.get("dl_titel") == "SMOKETEST Eintrag" for x in got)
            log("smoke_get", found, f"{rg.status_code} count={len(got)}")

            # PATCH → erledigt
            rpatch = requests.patch(
                f"{base}{API}/dl_kalendereintrags({rec_id})",
                headers={**h, "If-Match": "*"},
                json={"dl_status": "erledigt", "dl_erledigt_am": today + "T10:00:00Z"},
                timeout=60,
            )
            log("smoke_patch", rpatch.status_code in (200, 204), rpatch.status_code)

            # DELETE (Aufräumen)
            rd = requests.delete(f"{base}{API}/dl_kalendereintrags({rec_id})", headers=h, timeout=60)
            log("smoke_delete", rd.status_code in (200, 204), rd.status_code)

        RESULT["success"] = all(s["ok"] for s in RESULT["steps"])
        _flush()
    except Exception as e:
        RESULT["success"] = False
        RESULT["error"] = "".join(traceback.format_exception_only(type(e), e))[:500]
        _flush()


if __name__ == "__main__":
    main()
    print("DONE success=" + str(RESULT.get("success")))
