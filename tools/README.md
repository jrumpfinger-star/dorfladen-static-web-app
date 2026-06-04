# Dorfladen Shop CLI

Lokales Menüprogramm zum Testen der Shop-/Dataverse-Funktionen ohne Deploy.

## Start

```powershell
python tools/shop_cli.py
```

Standardmäßig verbindet sich das Tool mit der Produktions-Dataverse-Umgebung:

```text
https://orgab4e2f00.crm16.dynamics.com
```

Die Zugangsdaten werden aus `api/local.settings.json` gelesen.

## DEV-Umgebung explizit verwenden

```powershell
$env:SHOP_CLI_DV_URL='https://org392a4789.crm16.dynamics.com'
python tools/shop_cli.py
```

## Menüfunktionen

- `1` Dataverse Verbindung testen
- `2` Artikel suchen
- `3` Kategorien anzeigen
- `4` Testkunde registrieren
- `5` Login prüfen
- `6` Testbestellung erstellen
- `7` Bestellungen anzeigen
- `8` Bestellstatus ändern
- `9` Packdaten speichern
- `10` Smoke Test

## Hinweis

Einige Menüpunkte erzeugen echte Datensätze in Dataverse, z. B. Testkunden und Testbestellungen.
Nutze dafür am besten E-Mail-Adressen mit `example.invalid`.
