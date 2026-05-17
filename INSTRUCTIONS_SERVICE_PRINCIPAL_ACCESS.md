# Service Principal Zugriff auf Default Environment geben

## Problem
Der Service Principal (Dorfladen-Deploy) hat Zugriff auf das Developer Environment (org392a4789), aber nicht auf das Default Environment (orgab4e2f00). Die Preisliste-Abfrage schlägt mit 400 Bad Request fehl.

#
## Wichtige Informationen

- **Service Principal Name**: Dorfladen-Deploy
- **Client ID**: 137b2df6-be83-459a-ac89-9efd0bdf51c4
- **Tenant ID**: acfaedd4-c403-43b7-9544-fdb2b150124e
- **Default Environment URL**: https://orgab4e2f00.crm16.dynamics.com
- **Developer Environment URL**: https://org392a4789.crm16.dynamics.com

## Tabellen

### Developer Environment (org392a4789)
- dl_angebotes (Sonderangebote)
- dl_wochenplans (Wochenplan)
- dl_oeffnungszeits (Öffnungszeiten)
- dl_news (News/Aktuelles)
- dl_seiteninhalts (CMS Konfiguration)
- dl_artikelstamms (Artikelstamm - sync von Default via Power Automate)

### Default Environment (orgab4e2f00)
- cr5d4_tables (Artikelstamm - Quelle für Sync)
