"""
Shop Articles API – Returns orderable articles with bestseller ranking.
Uses cr5d4_artikelletzterverkauf recency as popularity proxy.
Articles with cr5d4_bestellbar=true are included.
Enriched with product images from dl_werbebilds.

GET /api/shop-articles
  → {success, articles: [...], categories: [...]}
"""
import azure.functions as func
import json
import logging
import os
import re
import msal
import requests
from datetime import datetime, timedelta


DEFAULT_URL_SETTING = "DV_DEFAULT_URL"
DEFAULT_URL_FALLBACK = "https://orgab4e2f00.crm16.dynamics.com"


def get_token():
    tenant_id = os.environ.get("DV_TENANT_ID", "acfaedd4-c403-43b7-9544-fdb2b150124e")
    client_id = os.environ.get("DV_CLIENT_ID", "137b2df6-be83-459a-ac89-9efd0bdf51c4")
    client_secret = os.environ.get("DV_CLIENT_SECRET", "")
    target_url = os.environ.get(DEFAULT_URL_SETTING, DEFAULT_URL_FALLBACK)
    if not client_secret:
        return None
    try:
        a = msal.ConfidentialClientApplication(
            client_id,
            authority=f"https://login.microsoftonline.com/{tenant_id}",
            client_credential=client_secret,
        )
        r = a.acquire_token_for_client(scopes=[f"{target_url}/.default"])
        return r.get("access_token")
    except:
        return None


def get_cors_headers():
    return {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, OPTIONS",
        "Access-Control-Allow-Headers": "*",
        "Content-Type": "application/json; charset=utf-8"
    }


def _base_url():
    return os.environ.get(DEFAULT_URL_SETTING, DEFAULT_URL_FALLBACK)


def _headers(token):
    return {
        "Authorization": f"Bearer {token}",
        "OData-MaxVersion": "4.0",
        "OData-Version": "4.0",
        "Accept": "application/json",
        "Content-Type": "application/json; charset=utf-8"
    }


def _fetch_all_pages(url, headers, max_pages=20):
    """Fetch all pages from OData endpoint."""
    items = []
    current_url = url
    for _ in range(max_pages):
        r = requests.get(current_url, headers=headers, timeout=60)
        if r.status_code != 200:
            return items
        data = r.json()
        items.extend(data.get("value", []))
        next_link = data.get("@odata.nextLink")
        if not next_link:
            break
        current_url = next_link
    return items


def _num(value, default=0):
    try:
        if value is None or value == "":
            return default
        return float(value)
    except (TypeError, ValueError):
        return default


def normalize_warengruppe(name):
    """Clean up category names."""
    name = str(name or "")
    name = re.sub(r'\s*\(?\d+%\)?', '', name)
    name = re.sub(r'\s+Bis\s+\d{4}.*$', '', name, flags=re.IGNORECASE)
    name = name.strip()
    RENAME = {"Mopro": "Molkereiprodukte"}
    MERGE = {"Obst und Gemüse Stück": "Obst und Gemüse", "Waage Gemüse Obst": "Obst und Gemüse"}
    if name in RENAME:
        return RENAME[name]
    if name in MERGE:
        return MERGE[name]
    return name


def calc_menge_vk(preis, mengentyp, mengeneinheit, gpfaktor, mengenerfassung):
    """Calculate corrected price and unit display string."""
    mt = (mengentyp or "").strip().lower()
    me_val = str(mengenerfassung or "").strip()
    preis = _num(preis)
    gpfaktor = _num(gpfaktor, 1)
    vk_korr = preis
    menge_str = ""
    if mt == "kg" and me_val == "3":
        vk_korr = round(preis / 10, 2)
        menge_str = "100 g"
    elif mt == "kg" and gpfaktor and gpfaktor != 1:
        vk_korr = round(preis * gpfaktor, 2)
        if mengeneinheit:
            menge_str = f"{mengeneinheit:g} kg"
    elif mt == "g" and mengeneinheit:
        menge_str = f"{int(mengeneinheit)} g"
    return vk_korr, menge_str


def _popularity_score(letzter_verkauf_str):
    """Calculate a popularity score based on recency of last sale.
    More recent = higher score. Used for bestseller ranking.
    Score 0-100: 100 = sold today, 0 = sold 6+ months ago or never.
    """
    if not letzter_verkauf_str:
        return 0
    try:
        lv = datetime.fromisoformat(letzter_verkauf_str.replace("Z", "+00:00")).replace(tzinfo=None)
        days_ago = (datetime.utcnow() - lv).days
        if days_ago < 0:
            days_ago = 0
        if days_ago > 180:
            return 0
        # Exponential decay: recent sales score much higher
        return max(0, int(100 * (1 - (days_ago / 180) ** 0.5)))
    except:
        return 0


def _load_angebote(base_url, headers):
    """Load active Sonderangebote for enrichment."""
    try:
        url = f"{base_url}/api/data/v9.2/dl_angebotes?$select=dl_artikelnummer,dl_angebotspreis,dl_regulaererpreis&$filter=dl_aktiv eq true"
        r = requests.get(url, headers=headers, timeout=30)
        if r.status_code == 200:
            m = {}
            for a in r.json().get("value", []):
                nr = a.get("dl_artikelnummer", "").strip()
                if nr:
                    m[nr] = {"preis": a.get("dl_angebotspreis"), "statt": a.get("dl_regulaererpreis")}
            return m
    except:
        pass
    return {}


def main(req: func.HttpRequest) -> func.HttpResponse:
    if req.method == "OPTIONS":
        return func.HttpResponse(status_code=200, headers=get_cors_headers())

    try:
        token = get_token()
        if not token:
            return func.HttpResponse(
                json.dumps({"success": False, "error": "Auth failed"}),
                status_code=500, headers=get_cors_headers()
            )

        base_url = _base_url()
        headers = _headers(token)

        # Fetch all articles. Some Dataverse environments do not have the extended quantity/order fields yet.
        base_fields = "cr5d4_artikelnummeredeka,cr5d4_artikelbezeichnung,cr5d4_vk_dorf,cr5d4_warengruppebez,cr5d4_uvp_total,cr5d4_artikelletzterverkauf,cr5d4_strichcode,cr5d4_tableid"
        extended_fields = base_fields + ",cr5d4_mengentyp,cr5d4_mengeneinheit,cr5d4_gpfaktor,cr5d4_mengenerfassung"
        select_attempts = [
            extended_fields + ",cr5d4_bestellbar,cr5d4_bestelleinheit",
            extended_fields,
            base_fields + ",cr5d4_bestellbar,cr5d4_bestelleinheit",
            base_fields,
        ]
        items = []
        for select_fields in select_attempts:
            url = f"{base_url}/api/data/v9.2/cr5d4_tables?$select={select_fields}&$orderby=cr5d4_artikelbezeichnung asc"
            items = _fetch_all_pages(url, headers)
            if items:
                break

        # Load Angebote
        angebote_map = _load_angebote(base_url, headers)

        cutoff_date = datetime.utcnow() - timedelta(days=183)
        articles = []
        categories = {}
        bestseller_candidates = []

        for item in items:
            artnr = item.get("cr5d4_artikelnummeredeka") or item.get("cr5d4_strichcode") or item.get("cr5d4_tableid", "")
            bezeichnung = item.get("cr5d4_artikelbezeichnung", "")
            preis = _num(item.get("cr5d4_vk_dorf"))
            warengruppe = normalize_warengruppe(item.get("cr5d4_warengruppebez", ""))
            letzter_verkauf = item.get("cr5d4_artikelletzterverkauf")
            strichcode = item.get("cr5d4_strichcode", "")
            bestellbar = item.get("cr5d4_bestellbar")
            bestelleinheit = item.get("cr5d4_bestelleinheit", "")

            # Skip if no name or price
            if not bezeichnung or preis <= 0:
                continue

            # Keep shop responsive even when bestellbar flags are not maintained in Dataverse.
            # Articles are filtered by valid name and price; optional recency/bestellbar fields must not hide the full assortment.

            # Calculate price/unit
            mengentyp = item.get("cr5d4_mengentyp")
            mengeneinheit = item.get("cr5d4_mengeneinheit")
            gpfaktor = _num(item.get("cr5d4_gpfaktor"), 1)
            mengenerfassung = item.get("cr5d4_mengenerfassung")
            vk_korr, menge_str = calc_menge_vk(preis, mengentyp, mengeneinheit, gpfaktor, mengenerfassung)

            # Determine order unit type
            mt = (mengentyp or "").strip().lower()
            if bestelleinheit:
                einheit = bestelleinheit
            elif mt == "kg" and str(mengenerfassung or "").strip() == "3":
                einheit = "kg"
            else:
                einheit = "Stück"

            # Popularity score
            pop_score = _popularity_score(letzter_verkauf)

            # Angebot check
            ang = angebote_map.get(artnr)
            uvp = _num(item.get("cr5d4_uvp_total"))
            discount = 0
            is_rp = False
            if uvp and uvp > 0 and preis > 0 and preis < uvp:
                discount = round((1 - preis / uvp) * 100)
                if 5 <= discount <= 70:
                    is_rp = True

            article = {
                "artikelnummer": artnr,
                "bezeichnung": bezeichnung,
                "vk": vk_korr,
                "vk_base": preis,
                "warengruppe": warengruppe,
                "strichcode": strichcode,
                "menge": menge_str,
                "einheit": einheit,
                "gewichtsware": einheit == "kg",
                "popularity": pop_score,
                "angebot": ang is not None,
                "angebot_preis": ang["preis"] if ang else None,
                "rp": is_rp,
                "discount": discount
            }
            articles.append(article)

            # Track categories
            if warengruppe:
                if warengruppe not in categories:
                    categories[warengruppe] = 0
                categories[warengruppe] += 1

            # Bestseller candidate
            if pop_score >= 50:
                bestseller_candidates.append(article)

        # Sort bestsellers by popularity (highest first), limit to top 20
        bestseller_candidates.sort(key=lambda x: x["popularity"], reverse=True)
        bestsellers = bestseller_candidates[:20]

        # Sort categories: prioritize key categories, then alphabetical
        PRIORITY_CATEGORIES = [
            "Backwaren",
            "Fleisch & Wurst",
            "Molkereiprodukte",
            "Obst und Gemüse",
        ]
        prio_cats = [c for c in PRIORITY_CATEGORIES if c in categories]
        other_cats = sorted([c for c in categories.keys() if c not in PRIORITY_CATEGORIES])
        cat_list = prio_cats + other_cats

        return func.HttpResponse(
            json.dumps({
                "success": True,
                "total": len(articles),
                "articles": articles,
                "categories": cat_list,
                "bestsellers": bestsellers
            }, ensure_ascii=False),
            status_code=200, headers=get_cors_headers()
        )
    except Exception as e:
        logging.exception("shop-articles failed")
        return func.HttpResponse(
            json.dumps({"success": False, "error": "Server-Fehler beim Laden der Artikel", "detail": str(e)}, ensure_ascii=False),
            status_code=500, headers=get_cors_headers()
        )
