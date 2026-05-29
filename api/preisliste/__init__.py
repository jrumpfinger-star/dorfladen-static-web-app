import azure.functions as func
import json
import os
import re
import msal
import requests

def normalize_warengruppe(name):
    """Merge groups that differ only by MwSt rate or date suffix, rename/merge display names."""
    name = re.sub(r'\s*\(?\d+%\)?', '', name)   # remove 7%, 19%, (7%), (19%)
    name = re.sub(r'\s+Bis\s+\d{4}.*$', '', name, flags=re.IGNORECASE)  # remove 'Bis 2025'
    name = name.strip()

    # Rename specific groups
    RENAME_MAP = {
        "Mopro": "Molkereiprodukte",
    }
    if name in RENAME_MAP:
        return RENAME_MAP[name]

    # Merge groups into one
    MERGE_MAP = {
        "Obst und Gemüse Stück": "Obst und Gemüse",
        "Waage Gemüse Obst": "Obst und Gemüse",
    }
    if name in MERGE_MAP:
        return MERGE_MAP[name]

    return name

def calc_menge_vk(preis, mengentyp, mengeneinheit, gpfaktor, mengenerfassung):
    """Berechne korrigierten VK-Preis und Mengenanzeige-String.
    Sonderfall: mengenerfassung=3 + mengentyp=kg → VK/10, Menge='100 g'
    Sonst: mengentyp g/kg + gpfaktor != 1 → VK * gpfaktor, Menge aus Mengeneinheit.
    """
    mt = (mengentyp or "").strip().lower()
    me_val = str(mengenerfassung or "").strip()
    vk_korr = preis
    menge_str = ""
    if mt == "kg" and me_val == "3":
        # Spezialfall: Preis gilt für 100g (Basis 1kg / 10)
        vk_korr = round(preis / 10, 2)
        menge_str = "100 g"
    elif mt == "kg" and gpfaktor and gpfaktor != 1:
        vk_korr = round(preis * gpfaktor, 2)
        if mengeneinheit:
            menge_str = f"{mengeneinheit:g} kg"
    elif mt == "g" and mengeneinheit:
        # Preis bleibt wie in Dataverse hinterlegt
        menge_str = f"{int(mengeneinheit)} g"
    elif mt == "kg" and mengeneinheit:
        menge_str = f"{mengeneinheit:g} kg"
    return vk_korr, menge_str


def get_token(url_setting_name="DV_DEFAULT_URL"):
    tenant_id = os.environ.get("DV_TENANT_ID", "acfaedd4-c403-43b7-9544-fdb2b150124e")
    client_id = os.environ.get("DV_CLIENT_ID", "137b2df6-be83-459a-ac89-9efd0bdf51c4")
    client_secret = os.environ.get("DV_CLIENT_SECRET", "")
    target_url = os.environ.get(url_setting_name, "https://orgab4e2f00.crm16.dynamics.com")
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

def get_headers(url_setting_name="DV_DEFAULT_URL"):
    token = get_token(url_setting_name)
    return {
        "Authorization": f"Bearer {token}",
        "OData-MaxVersion": "4.0",
        "OData-Version": "4.0",
        "Accept": "application/json",
        "Content-Type": "application/json; charset=utf-8"
    }

def get_cors_headers():
    return {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, POST, OPTIONS, DELETE",
        "Access-Control-Allow-Headers": "*",
        "Access-Control-Max-Age": "86400",
        "Content-Type": "application/json; charset=utf-8"
    }

def _fetch_all_pages(url, headers, max_pages=20):
    """Fetch all pages from a Dataverse OData query (handles @odata.nextLink)."""
    all_items = []
    page = 0
    while url and page < max_pages:
        r = requests.get(url, headers=headers, timeout=60)
        if r.status_code != 200:
            return None, r.status_code
        data = r.json()
        all_items.extend(data.get("value", []))
        url = data.get("@odata.nextLink")
        page += 1
    return all_items, 200


def _load_active_angebote(base_url, headers):
    """Load active Sonderangebote from dl_angebot table, return dict keyed by artikelnummer.
    Only includes offers valid today (dl_gueltig_von <= today <= dl_gueltig_bis)."""
    from datetime import datetime, timedelta, timezone
    cet = timezone(timedelta(hours=2))
    today = datetime.now(cet).strftime("%Y-%m-%d")
    angebote = {}
    for entity_set in ["dl_angebotes", "dl_angebots", "dl_angebot"]:
        url = f"{base_url}/api/data/v9.2/{entity_set}?$filter=dl_status eq 101001&$select=dl_artikelnummer,dl_produkt,dl_preis,dl_statt_preis,dl_gueltig_von,dl_gueltig_bis"
        r = requests.get(url, headers=headers, timeout=30)
        if r.status_code == 200:
            for item in r.json().get("value", []):
                artnr = item.get("dl_artikelnummer", "")
                if not artnr:
                    continue
                von = (item.get("dl_gueltig_von") or "")[:10]
                bis = (item.get("dl_gueltig_bis") or "")[:10]
                if von and von > today:
                    continue
                if bis and bis < today:
                    continue
                angebote[artnr] = {
                    "preis": item.get("dl_preis"),
                    "statt": item.get("dl_statt_preis")
                }
            return angebote
    return angebote


def main(req: func.HttpRequest) -> func.HttpResponse:
    if req.method == "OPTIONS":
        return func.HttpResponse(status_code=200, headers=get_cors_headers())
    try:
        from datetime import datetime, timedelta
        hdrs = get_headers("DV_DEFAULT_URL")
        default_url = os.environ.get("DV_DEFAULT_URL", "https://orgab4e2f00.crm16.dynamics.com")

        # Barcode lookup: ?barcode=EAN – searches ALL articles (no 6-month filter)
        barcode_q = req.params.get("barcode", "").strip()
        if barcode_q:
            bc_url = f"{default_url}/api/data/v9.2/cr5d4_tables?$filter=cr5d4_strichcode eq '{barcode_q}'&$select=cr5d4_artikelnummeredeka,cr5d4_artikelbezeichnung,cr5d4_vk_dorf,cr5d4_warengruppebez,cr5d4_uvp_total,cr5d4_strichcode,cr5d4_mengentyp,cr5d4_mengeneinheit,cr5d4_gpfaktor,cr5d4_mengenerfassung"
            r = requests.get(bc_url, headers=hdrs, timeout=30)
            results = []
            # Load active Angebote to enrich barcode results
            angebote_map = _load_active_angebote(default_url, hdrs)
            if r.status_code == 200:
                for item in r.json().get("value", []):
                    artnr = item.get("cr5d4_artikelnummeredeka", "")
                    preis = item.get("cr5d4_vk_dorf") or 0
                    uvp = item.get("cr5d4_uvp_total")
                    discount = 0
                    is_rp = False
                    if uvp and uvp > 0 and preis > 0 and preis < uvp:
                        discount = round((uvp - preis) / uvp * 100)
                        if discount >= 5 and discount <= 70:
                            is_rp = True
                    ang = angebote_map.get(artnr)
                    mengentyp = item.get("cr5d4_mengentyp")
                    mengeneinheit = item.get("cr5d4_mengeneinheit")
                    gpfaktor = item.get("cr5d4_gpfaktor") or 1
                    mengenerfassung = item.get("cr5d4_mengenerfassung")
                    vk_korr, menge_str = calc_menge_vk(preis, mengentyp, mengeneinheit, gpfaktor, mengenerfassung)
                    results.append({
                        "artikelnummer": artnr,
                        "bezeichnung": item.get("cr5d4_artikelbezeichnung", ""),
                        "vk": vk_korr,
                        "vk_base": preis,
                        "uvp": uvp,
                        "discount": discount,
                        "rp": is_rp,
                        "angebot": ang is not None,
                        "angebot_preis": ang["preis"] if ang else None,
                        "warengruppe": item.get("cr5d4_warengruppebez", ""),
                        "strichcode": item.get("cr5d4_strichcode", ""),
                        "menge": menge_str
                    })
            return func.HttpResponse(
                json.dumps({"success": True, "barcode": barcode_q, "results": results}, ensure_ascii=False),
                status_code=200, mimetype="application/json", headers=get_cors_headers()
            )

        # Fetch ALL articles with pagination (incl. UVP)
        url = f"{default_url}/api/data/v9.2/cr5d4_tables?$select=cr5d4_artikelnummeredeka,cr5d4_artikelbezeichnung,cr5d4_vk_dorf,cr5d4_warengruppebez,cr5d4_uvp_total,cr5d4_artikelletzterverkauf,cr5d4_strichcode,cr5d4_mengentyp,cr5d4_mengeneinheit,cr5d4_gpfaktor,cr5d4_mengenerfassung&$orderby=cr5d4_artikelbezeichnung asc"
        items, status = _fetch_all_pages(url, hdrs)
        if items is None:
            return func.HttpResponse(
                json.dumps({"success": False, "error": f"Dataverse error: {status}"}, ensure_ascii=False),
                status_code=status, mimetype="application/json", headers=get_cors_headers()
            )

        # Load active Sonderangebote from Default environment
        angebote_map = _load_active_angebote(default_url, hdrs)

        # Cutoff: 6 months ago
        cutoff_date = datetime.utcnow() - timedelta(days=183)
        FLEISCH_WURST_KEYWORDS = ["fleisch", "wurst", "metzger", "aufschnitt", "schinken", "salami"]

        def is_fleisch_wurst(wg):
            wg_lower = wg.lower()
            return any(kw in wg_lower for kw in FLEISCH_WURST_KEYWORDS)

        groups = {}
        total = 0
        skipped = 0
        rp_count = 0
        ang_count = 0
        for item in items:
            artikelnummer = item.get("cr5d4_artikelnummeredeka", "")
            bezeichnung = item.get("cr5d4_artikelbezeichnung", "")
            preis = item.get("cr5d4_vk_dorf") or 0
            uvp_preis = item.get("cr5d4_uvp_total")
            warengruppe_bez = item.get("cr5d4_warengruppebez", "")
            letzter_verkauf = item.get("cr5d4_artikelletzterverkauf")
            mengentyp = item.get("cr5d4_mengentyp")
            mengeneinheit = item.get("cr5d4_mengeneinheit")
            gpfaktor = item.get("cr5d4_gpfaktor") or 1
            mengenerfassung = item.get("cr5d4_mengenerfassung")
            vk_korr, menge_str = calc_menge_vk(preis, mengentyp, mengeneinheit, gpfaktor, mengenerfassung)

            if not warengruppe_bez:
                warengruppe_bez = "Sonstiges"
            else:
                warengruppe_bez = normalize_warengruppe(warengruppe_bez) or warengruppe_bez

            # Filter: skip articles not sold in last 6 months, except Fleisch & Wurst
            if not is_fleisch_wurst(warengruppe_bez):
                if not letzter_verkauf:
                    skipped += 1
                    continue
                try:
                    lv = datetime.fromisoformat(letzter_verkauf.replace("Z", "+00:00")).replace(tzinfo=None)
                    if lv < cutoff_date:
                        skipped += 1
                        continue
                except (ValueError, AttributeError):
                    skipped += 1
                    continue

            if warengruppe_bez not in groups:
                groups[warengruppe_bez] = []

            # Roter Punkt: VK < UVP with meaningful discount (>= 5% and <= 70%)
            is_rp = False
            discount = 0
            if uvp_preis and uvp_preis > 0 and preis > 0 and preis < uvp_preis:
                discount = round((uvp_preis - preis) / uvp_preis * 100)
                if discount >= 5 and discount <= 70:
                    is_rp = True
                    rp_count += 1

            # Sonderangebot check
            ang = angebote_map.get(artikelnummer)
            is_ang = ang is not None
            if is_ang:
                ang_count += 1

            entry = {
                "artikelnummer": artikelnummer,
                "bezeichnung": bezeichnung,
                "vk": vk_korr,
                "vk_base": preis,
                "uvp": uvp_preis,
                "discount": discount,
                "rp": is_rp,
                "angebot": is_ang,
                "angebot_preis": ang["preis"] if ang else None,
                "angebot_statt": ang["statt"] if ang else None,
                "strichcode": item.get("cr5d4_strichcode", ""),
                "menge": menge_str
            }
            groups[warengruppe_bez].append(entry)
            total += 1

        result = {
            "generated": datetime.now().isoformat(),
            "total": total,
            "skipped_old": skipped,
            "warengruppen": len(groups),
            "rp_count": rp_count,
            "ang_count": ang_count,
            "ang_map_size": len(angebote_map),
            "groups": groups
        }
        return func.HttpResponse(
            json.dumps(result, ensure_ascii=False),
            status_code=200,
            mimetype="application/json",
            headers=get_cors_headers()
        )
    except Exception as e:
        return func.HttpResponse(
            json.dumps({"success": False, "error": str(e)}, ensure_ascii=False),
            status_code=500,
            mimetype="application/json",
            headers=get_cors_headers()
        )
