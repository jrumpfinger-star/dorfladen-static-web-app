import azure.functions as func
import json
import os
import msal
import requests

app = func.FunctionApp(http_auth_level=func.AuthLevel.ANONYMOUS)

DAY_LABELS = {
    101000: "Montag",
    101001: "Dienstag",
    101002: "Mittwoch",
    101003: "Donnerstag",
    101004: "Freitag",
    101005: "Samstag",
    101006: "Sonntag",
}

# --- CORS PREFLIGHT HANDLER ---
@app.route(route="{*path}", methods=["OPTIONS"])
def cors_preflight(req: func.HttpRequest) -> func.HttpResponse:
    return func.HttpResponse(status_code=200, headers=get_cors_headers())

# --- GLOBALE CONFIG & TOKENS ---
def get_token(url_setting_name="DV_DEV_URL"):
    tenant_id = os.environ.get("DV_TENANT_ID", "acfaedd4-c403-43b7-9544-fdb2b150124e")
    client_id = os.environ.get("DV_CLIENT_ID", "137b2df6-be83-459a-ac89-9efd0bdf51c4")
    client_secret = os.environ.get("DV_CLIENT_SECRET", "")
    target_url = os.environ.get(url_setting_name, "https://org392a4789.crm16.dynamics.com")

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

def get_headers(url_setting_name="DV_DEV_URL"):
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

def create_response(data, status_code=200):
    return func.HttpResponse(
        json.dumps(data, ensure_ascii=False),
        status_code=status_code,
        mimetype="application/json",
        headers=get_cors_headers()
    )

def parse_config_value(value):
    if not isinstance(value, str):
        return value

    stripped = value.strip()
    if not stripped:
        return ""

    if stripped.startswith("{") or stripped.startswith("["):
        try:
            return json.loads(stripped)
        except json.JSONDecodeError:
            return value

    return value

# --- ROUTEN ---

@app.route(route="test", methods=["GET"])
def test(req: func.HttpRequest) -> func.HttpResponse:
    return create_response({"status": "ok", "message": "V4-Zentrale online!"}, 200)

@app.route(route="wochenplan", methods=["GET"])
def wochenplan(req: func.HttpRequest) -> func.HttpResponse:
    try:
        headers = get_headers("DV_DEV_URL")
        dev_url = os.environ.get("DV_DEV_URL", "https://org392a4789.crm16.dynamics.com")
        url = f"{dev_url}/api/data/v9.2/dl_wochenplans?$filter=dl_status eq 101001&$orderby=dl_datum asc"
        r = requests.get(url, headers=headers)
        if r.status_code == 200:
            data = r.json()
            wochenplan_list = []
            for item in data.get("value", []):
                wochenplan_list.append({
                    "id": item.get("dl_wochenplansid"),
                    "dl_wochenplanid": item.get("dl_wochenplansid"),
                    "dl_wochenplansid": item.get("dl_wochenplansid"),
                    "gericht": item.get("dl_gericht", ""),
                    "dl_gericht": item.get("dl_gericht", ""),
                    "wochentag": item.get("dl_wochentag"),
                    "dl_wochentag": item.get("dl_wochentag"),
                    "_dl_wochentag_label": DAY_LABELS.get(item.get("dl_wochentag"), ""),
                    "preis": item.get("dl_preis", 0),
                    "dl_preis": item.get("dl_preis", 0),
                    "beschreibung": item.get("dl_beschreibung", ""),
                    "dl_beschreibung": item.get("dl_beschreibung", ""),
                    "datum": item.get("dl_datum"),
                    "dl_datum": item.get("dl_datum"),
                    "kalenderwoche": item.get("dl_kalenderwoche"),
                    "dl_kalenderwoche": item.get("dl_kalenderwoche"),
                    "jahr": item.get("dl_jahr"),
                    "dl_jahr": item.get("dl_jahr"),
                    "status": item.get("dl_status"),
                    "dl_status": item.get("dl_status")
                })
            return create_response({"success": True, "data": wochenplan_list}, 200)
        return create_response({"success": False, "error": f"Dataverse error: {r.status_code}"}, r.status_code)
    except Exception as e:
        return create_response({"success": False, "error": str(e)}, 500)

@app.route(route="hours", methods=["GET"])
def hours(req: func.HttpRequest) -> func.HttpResponse:
    try:
        headers = get_headers("DV_DEFAULT_URL")
        default_url = os.environ.get("DV_DEFAULT_URL", "https://orgab4e2f00.crm16.dynamics.com")
        url = (
            f"{default_url}/api/data/v9.2/dl_oeffnungszeits"
            f"?$select=dl_name,dl_wochentag,dl_geschlossen,dl_vormittag_von,dl_vormittag_bis,"
            f"dl_nachmittag_von,dl_nachmittag_bis,dl_sortierung,dl_hinweis"
            f"&$orderby=dl_sortierung asc"
        )
        r = requests.get(url, headers=headers)
        if r.status_code == 200:
            data = r.json()
            hours_list = []
            for item in data.get("value", []):
                wochentag = item.get("dl_wochentag")
                hours_list.append({
                    "id": item.get("dl_oeffnungszeitsid"),
                    "dl_oeffnungszeitsid": item.get("dl_oeffnungszeitsid"),
                    "dl_oeffnungszeitid": item.get("dl_oeffnungszeitsid"),
                    "name": item.get("dl_name", ""),
                    "dl_name": item.get("dl_name", ""),
                    "wochentag": wochentag,
                    "dl_wochentag": wochentag,
                    "_dl_wochentag_label": DAY_LABELS.get(wochentag, ""),
                    "geschlossen": item.get("dl_geschlossen", False),
                    "dl_geschlossen": item.get("dl_geschlossen", False),
                    "vormittag_von": item.get("dl_vormittag_von") or "",
                    "dl_vormittag_von": item.get("dl_vormittag_von") or "",
                    "vormittag_bis": item.get("dl_vormittag_bis") or "",
                    "dl_vormittag_bis": item.get("dl_vormittag_bis") or "",
                    "nachmittag_von": item.get("dl_nachmittag_von") or "",
                    "dl_nachmittag_von": item.get("dl_nachmittag_von") or "",
                    "nachmittag_bis": item.get("dl_nachmittag_bis") or "",
                    "dl_nachmittag_bis": item.get("dl_nachmittag_bis") or "",
                    "sortierung": item.get("dl_sortierung"),
                    "dl_sortierung": item.get("dl_sortierung"),
                    "hinweis": item.get("dl_hinweis", ""),
                    "dl_hinweis": item.get("dl_hinweis", "")
                })
            return create_response({"success": True, "data": hours_list}, 200)
        return create_response({"success": False, "error": f"Dataverse error: {r.status_code}"}, r.status_code)
    except Exception as e:
        return create_response({"success": False, "error": str(e)}, 500)

@app.route(route="news", methods=["GET"])
def news(req: func.HttpRequest) -> func.HttpResponse:
    try:
        headers = get_headers("DV_DEFAULT_URL")
        default_url = os.environ.get("DV_DEFAULT_URL", "https://orgab4e2f00.crm16.dynamics.com")
        url = (
            f"{default_url}/api/data/v9.2/dl_news"
            f"?$select=dl_titel,dl_kurztext,dl_inhalt,dl_datum,createdon,dl_status"
            f"&$filter=dl_status eq 101001"
            f"&$orderby=dl_datum desc"
        )
        r = requests.get(url, headers=headers)
        if r.status_code == 200:
            data = r.json()
            news_list = []
            for item in data.get("value", []):
                news_list.append({
                    "id": item.get("dl_newsid"),
                    "dl_newsid": item.get("dl_newsid"),
                    "titel": item.get("dl_titel", ""),
                    "dl_titel": item.get("dl_titel", ""),
                    "beschreibung": item.get("dl_kurztext", ""),
                    "dl_kurztext": item.get("dl_kurztext", ""),
                    "dl_inhalt": item.get("dl_inhalt", ""),
                    "datum": item.get("dl_datum") or item.get("createdon"),
                    "dl_datum": item.get("dl_datum"),
                    "createdon": item.get("createdon")
                })
            return create_response({"success": True, "data": news_list}, 200)
        return create_response({"success": False, "error": f"Dataverse error: {r.status_code}"}, r.status_code)
    except Exception as e:
        return create_response({"success": False, "error": str(e)}, 500)

@app.route(route="cms-config", methods=["GET"])
def cms_config(req: func.HttpRequest) -> func.HttpResponse:
    try:
        headers = get_headers("DV_DEV_URL")
        dev_url = os.environ.get("DV_DEV_URL", "https://org392a4789.crm16.dynamics.com")
        url = f"{dev_url}/api/data/v9.2/dl_seiteninhalts"
        r = requests.get(url, headers=headers)
        if r.status_code == 200:
            data = r.json()
            config = {
                item.get("dl_name", ""): parse_config_value(item.get("dl_wert", ""))
                for item in data.get("value", [])
                if item.get("dl_name")
            }
            return create_response({"success": True, "data": config}, 200)
        return create_response({"success": False, "error": f"Dataverse error: {r.status_code}"}, r.status_code)
    except Exception as e:
        return create_response({"success": False, "error": str(e)}, 500)

@app.route(route="angebote", methods=["GET"])
def angebote(req: func.HttpRequest) -> func.HttpResponse:
    try:
        headers = get_headers("DV_DEFAULT_URL")
        default_url = os.environ.get("DV_DEFAULT_URL", "https://orgab4e2f00.crm16.dynamics.com")
        url = f"{default_url}/api/data/v9.2/dl_angebotes?$filter=dl_status eq 101001&$orderby=dl_produkt asc"
        r = requests.get(url, headers=headers)
        if r.status_code == 200:
            data = r.json()
            angebote_list = []
            for item in data.get("value", []):
                angebote_list.append({
                    "id": item.get("dl_angeboteid"),
                    "dl_angeboteid": item.get("dl_angeboteid"),
                    "name": item.get("dl_produkt", ""),
                    "dl_produkt": item.get("dl_produkt", ""),
                    "details": item.get("dl_details", "") or item.get("dl_beschreibung", ""),
                    "dl_details": item.get("dl_details", "") or item.get("dl_beschreibung", ""),
                    "price": item.get("dl_preis", 0),
                    "dl_preis": item.get("dl_preis", 0),
                    "old_price": item.get("dl_statt_preis", 0),
                    "dl_statt_preis": item.get("dl_statt_preis", 0),
                    "aktion_titel": item.get("dl_aktion_titel", ""),
                    "dl_aktion_titel": item.get("dl_aktion_titel", ""),
                    "aktion_id": item.get("dl_aktion_id", ""),
                    "dl_aktion_id": item.get("dl_aktion_id", ""),
                    "artikelnummer": item.get("dl_artikelnummer", ""),
                    "dl_artikelnummer": item.get("dl_artikelnummer", ""),
                    "valid_from": item.get("dl_gueltig_von"),
                    "dl_gueltig_von": item.get("dl_gueltig_von"),
                    "valid_to": item.get("dl_gueltig_bis"),
                    "dl_gueltig_bis": item.get("dl_gueltig_bis"),
                    "bild_data": item.get("dl_bild_base64", ""),
                    "dl_bild_base64": item.get("dl_bild_base64", "")
                })
            return create_response({"success": True, "data": angebote_list}, 200)
        return create_response({"success": False, "error": f"Dataverse error: {r.status_code}"}, r.status_code)
    except Exception as e:
        return create_response({"success": False, "error": str(e)}, 500)

@app.route(route="werbebilder", methods=["GET"])
def werbebilder(req: func.HttpRequest) -> func.HttpResponse:
    artnrs = req.params.get("artnrs", "")
    if not artnrs.strip():
        return create_response([], 200)

    # Fallback-endpoint: liefert bewusst leere Liste, wenn keine verlässliche Bildquelle
    # innerhalb dieses Projekts konfiguriert ist. So bleibt das Frontend stabil.
    return create_response([], 200)

@app.route(route="preisliste", methods=["GET"])
def preisliste(req: func.HttpRequest) -> func.HttpResponse:
    try:
        headers = get_headers("DV_DEFAULT_URL")
        default_url = os.environ.get("DV_DEFAULT_URL", "https://orgab4e2f00.crm16.dynamics.com")
        url = f"{default_url}/api/data/v9.2/cr5d4_tables?$select=cr5d4_artikelnummeredeka,cr5d4_artikelbezeichnung,cr5d4_vk_dorf,cr5d4_warengruppebez&$orderby=cr5d4_artikelbezeichnung asc"
        r = requests.get(url, headers=headers)
        if r.status_code == 200:
            data = r.json()
            items = data.get("value", [])
            
            # Gruppieren nach Warengruppen (basierend auf WarengruppeBez)
            groups = {}
            for item in items:
                artikelnummer = item.get("cr5d4_artikelnummeredeka", "")
                bezeichnung = item.get("cr5d4_artikelbezeichnung", "")
                preis = item.get("cr5d4_vk_dorf", 0)
                warengruppe_bez = item.get("cr5d4_warengruppebez", "")
                
                # Warengruppe aus WarengruppeBez verwenden, falls vorhanden
                if warengruppe_bez:
                    # Warengruppen-Namen normalisieren und zusammenfassen
                    wg_name_mapping = {
                        "Obst": "Obst",
                        "Gemüse": "Gemüse",
                        "Obst & Gemüse": "Obst",
                        "Gemüse & Obst": "Obst",
                        "Sonstiges": "Sonstiges",
                        "Sonstiges 19%": "Sonstiges",
                        "Sonstiges 7%": "Sonstiges",
                        "Mittagessen": "Mittagessen",
                        "Mittagessen 7%": "Mittagessen",
                        "Mittagessen 7% MwSt": "Mittagessen",
                        "Kuchen": "Kuchen",
                        "Honig & Marmelade": "Honig & Marmelade",
                        "Papier & Schreibwaren": "Papier & Schreibwaren",
                        "Haushalt": "Haushalt",
                        "Getränke": "Getränke",
                        "Molkerei": "Molkerei",
                        "Backwaren": "Backwaren",
                        "Fleisch": "Fleisch",
                        "Trockenwaren": "Trockenwaren",
                        "Süßwaren": "Süßwaren",
                        "Gewürze": "Gewürze",
                        "Effektive Mikroorganismen": "Effektive Mikroorganismen",
                        "EM": "Effektive Mikroorganismen",
                        "EM Keramik": "Effektive Mikroorganismen",
                        "Cafeteria": "Cafeteria",
                        "Cafeteria 1": "Cafeteria",
                        "Cafeteria 2": "Cafeteria"
                    }
                    warengruppe = wg_name_mapping.get(warengruppe_bez, warengruppe_bez)
                # Fallback: Warengruppe aus Artikelnummer ableiten (erste 2-3 Ziffern)
                elif artikelnummer and len(artikelnummer) >= 3:
                    try:
                        wg_num = int(artikelnummer[:3])
                        wg_mapping = {
                            100: "Getränke",
                            200: "Molkerei",
                            300: "Backwaren",
                            400: "Fleisch",
                            500: "Gemüse",
                            600: "Obst",
                            700: "Trockenwaren",
                            800: "Süßwaren",
                            900: "Gewürze"
                        }
                        warengruppe = wg_mapping.get(wg_num, "Sonstiges")
                    except:
                        warengruppe = "Sonstiges"
                else:
                    warengruppe = "Sonstiges"
                
                if warengruppe not in groups:
                    groups[warengruppe] = []
                
                groups[warengruppe].append({
                    "artikelnummer": artikelnummer,
                    "bezeichnung": bezeichnung,
                    "vk": preis,
                    "uvp": None,
                    "angebot": False,
                    "angebot_statt": None,
                    "angebot_preis": None
                })
            
            from datetime import datetime
            result = {
                "groups": groups,
                "total": len(items),
                "warengruppen": len(groups),
                "generated": datetime.now().isoformat()
            }
            return create_response(result, 200)
        return create_response({"success": False, "error": f"Dataverse error: {r.status_code}"}, r.status_code)
    except Exception as e:
        return create_response({"success": False, "error": str(e)}, 500)

@app.route(route="roterpunkt", methods=["GET"])
def roterpunkt(req: func.HttpRequest) -> func.HttpResponse:
    try:
        headers = get_headers("DV_DEFAULT_URL")
        default_url = os.environ.get("DV_DEFAULT_URL", "https://orgab4e2f00.crm16.dynamics.com")
        url = f"{default_url}/api/data/v9.2/cr5d4_tables?$select=cr5d4_artikelnummeredeka,cr5d4_artikelbezeichnung,cr5d4_vk_dorf,cr5d4_warengruppebez,cr5d4_uvp_total&$orderby=cr5d4_artikelbezeichnung asc"
        r = requests.get(url, headers=headers)
        if r.status_code == 200:
            data = r.json()
            items = data.get("value", [])
            
            # Gruppieren nach Warengruppen (basierend auf cr5d4_warengruppebez)
            groups = {}
            for item in items:
                artikelnummer = item.get("cr5d4_artikelnummeredeka", "")
                bezeichnung = item.get("cr5d4_artikelbezeichnung", "")
                preis = item.get("cr5d4_vk_dorf", 0)
                uvp_preis = item.get("cr5d4_uvp_total")
                warengruppe_bez = item.get("cr5d4_warengruppebez", "")
                
                # Warengruppe aus WarengruppeBez verwenden, falls vorhanden
                if warengruppe_bez:
                    # Warengruppen-Namen normalisieren und zusammenfassen
                    wg_name_mapping = {
                        "Obst": "Obst",
                        "Gemüse": "Gemüse",
                        "Obst & Gemüse": "Obst",
                        "Gemüse & Obst": "Obst",
                        "Sonstiges": "Sonstiges",
                        "Sonstiges 19%": "Sonstiges",
                        "Sonstiges 7%": "Sonstiges",
                        "Mittagessen": "Mittagessen",
                        "Mittagessen 7%": "Mittagessen",
                        "Mittagessen 7% MwSt": "Mittagessen",
                        "Kuchen": "Kuchen",
                        "Honig & Marmelade": "Honig & Marmelade",
                        "Papier & Schreibwaren": "Papier & Schreibwaren",
                        "Haushalt": "Haushalt",
                        "Getränke": "Getränke",
                        "Molkerei": "Molkerei",
                        "Backwaren": "Backwaren",
                        "Fleisch": "Fleisch",
                        "Trockenwaren": "Trockenwaren",
                        "Süßwaren": "Süßwaren",
                        "Gewürze": "Gewürze",
                        "Effektive Mikroorganismen": "Effektive Mikroorganismen",
                        "EM": "Effektive Mikroorganismen",
                        "EM Keramik": "Effektive Mikroorganismen",
                        "Tabakwaren": "Tabakwaren"
                    }
                    warengruppe = wg_name_mapping.get(warengruppe_bez, warengruppe_bez)
                else:
                    warengruppe = "Sonstiges"
                
                if warengruppe not in groups:
                    groups[warengruppe] = []
                
                # Discount berechnen: ((uvp - vk) / uvp) * 100
                discount = 0
                if uvp_preis and uvp_preis > 0 and preis > 0:
                    discount = ((uvp_preis - preis) / uvp_preis) * 100
                
                groups[warengruppe].append({
                    "artikelnummer": artikelnummer,
                    "bezeichnung": bezeichnung,
                    "vk": preis,
                    "uvp": uvp_preis,
                    "discount": discount,
                    "angebot": False,
                    "angebot_statt": None,
                    "angebot_preis": None
                })
            
            from datetime import datetime
            result = {
                "groups": groups,
                "total": len(items),
                "warengruppen": len(groups),
                "generated": datetime.now().isoformat()
            }
            return create_response(result, 200)
        return create_response({"success": False, "error": f"Dataverse error: {r.status_code}"}, r.status_code)
    except Exception as e:
        return create_response({"success": False, "error": str(e)}, 500)

# ENTSCHÄRFTER LÖSCH-ENDPUNKT: Keine URL-Parameter mehr!
@app.route(route="delete-angebot", methods=["DELETE", "OPTIONS"])
def delete_angebot_safe(req: func.HttpRequest) -> func.HttpResponse:
    if req.method == "OPTIONS":
        return func.HttpResponse(status_code=204, headers=get_cors_headers())
    try:
        # Die ID holen wir uns jetzt einfach aus dem Query-String (z.B. ?id=XXXX)
        record_id = req.params.get("id")
        if not record_id:
            return create_response({"success": False, "error": "Fehlender Parameter 'id' im Query-String"}, 400)

        headers = get_headers("DV_DEV_URL")
        dev_url = os.environ.get("DV_DEV_URL", "https://org392a4789.crm16.dynamics.com")
        url = f"{dev_url}/api/data/v9.2/dl_angebotes({record_id})"
        r = requests.delete(url, headers=headers)
        if r.status_code == 204:
            return create_response({"success": True}, 200)
        return create_response({"success": False, "error": f"Dataverse error: {r.status_code}"}, r.status_code)
    except Exception as e:
        return create_response({"success": False, "error": str(e)}, 500)