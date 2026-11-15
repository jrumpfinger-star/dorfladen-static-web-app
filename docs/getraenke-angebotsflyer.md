# Wochenangebote und Getränkeflyer

## Bedienung

Im **Kiosk → Angebote** oder im **CMS → Angebote → Getränke & neue Angebote
gestalten** öffnet sich die gemeinsame Verwaltung.
Bestehende Aktionen bleiben über **Bisherige Angebote öffnen** im bisherigen
Editor erreichbar. Sie werden weder migriert noch überschrieben.

1. **Artikel:** Wochen- oder Getränkeaktion anlegen. Eigene Artikel erfassen oder
   Getränke aus dem Katalog wählen. Den **Verkaufspreis selbst eintragen**;
   Einkaufspreise und Bestelldaten werden nicht übernommen. Bei Getränken Anzahl,
   Liter je Einheit, Gebindeart und Gesamtpfand oder Pfandfreiheit ergänzen.
   Der Literpreis enthält kein Pfand. Unvollständige Entwürfe dürfen gespeichert
   werden.
2. **Gestalten:** Überschrift und Zeitraum festlegen. Vorlagen für vier oder sechs
   Artikel sind nur Startpunkte und erzeugen bei Bedarf Folgeseiten.
   Elemente antippen oder in der Liste auswählen: Position, Größe, Drehung,
   Schrift, Farbe, Ebenen und Deckkraft lassen sich einzeln ändern. Eigene Texte,
   Bilder und Flächen sowie Duplikate sind möglich. Statt Ziehen funktionieren
   auch Eingaben, Pfeilknöpfe und die Tastatur (Umschalt + Pfeil: größere Schritte).
   Die Bildgröße skaliert den Inhalt im Bildrahmen; dieser lässt sich separat
   vergrößern. Eine Vorlage ersetzt freie Gestaltung erst nach Bestätigung.
3. **Ausgeben:** Die folgenden Aktionen sind bewusst getrennt:
   - **Entwurf speichern** ändert keine Kundenfassung.
   - **Für Homepage veröffentlichen** gibt eine vollständige Fassung frei.
     Spätere Änderungen bleiben bis zur nächsten Freigabe intern.
   - **A4 drucken / als PDF speichern** öffnet den Browser-Druckdialog.
     Dort A4 wählen, Browser-Kopf-/Fußzeilen ausschalten und bei Bedarf
     „Als PDF speichern“ verwenden.
   - **Für Waage vorbereiten** erzeugt entweder Einzelartikel (empfohlen) oder
     eingepasste A4-Seiten. Profil und Dauerwerbung/Vollbild im vorhandenen
     Waagendialog wählen. JPEGs können auch ohne Versand gespeichert werden.

Pflichtangaben, ungültige Preise oder überstehende/zu kleine Textfelder blockieren
die Ausgabe mit einer verständlichen Meldung. Bei einem Versionskonflikt bleibt
der Serverstand erhalten; den Entwurf erneut öffnen, bevor weitergespeichert wird.

### Bestehender Designeditor

**CMS → Design → Plakate & Flyer → Getränkeflyer** verwaltet die Standards neuer
Getränke- und Wochenaktionen: Vorlagen, Farben, Schriften, Preisform, Typografie
und Produktbilder. A4-, Karten- und Waagenvorschau verwenden Beispieldaten.
Alte Flyer-Farben lassen sich ausdrücklich kopieren. Speichern verändert weder
alte Einstellungen noch individuelle oder veröffentlichte Aktionen.
Aktuelle Standards können im Aktionseditor ausdrücklich neu übernommen werden.
Landladen und Klassisch werden als anklickbare Vorschaukacheln angeboten.
Darunter unabhängig 4 großzügige oder 6 kompakte Artikel je Seite wählen.
Farben und Schrift sind direkt sichtbar; Größen und Drehung stehen unter
„Feinabstimmung“. Ein Häkchen markiert die aktive Auswahl, die Kacheln sind
auch per Tastatur bedienbar. Diese Auswahl ist im einzelnen Flyer ebenfalls
direkt unter „Gestalten“ sichtbar, nicht in einem versteckten Untermenü.
A4/PDF, Handy/Kiosk und die vorhandenen Waagenprofile sind über sichtbare
Vorschau-Schaltflächen erreichbar. Die Vorschau ändert oder veröffentlicht
keinen Entwurf. Freie Elemente werden weiterhin nur in der A4-Ansicht bearbeitet.
Beim ersten CMS-Login wartet der Reiter auf die abgeschlossene Anmeldung.
Bei Anmeldefehlern die Meldung schließen und den Getränkeflyer-Reiter erneut öffnen.

### Kundenansicht und Gültigkeit

Homepage und mobiles Angebotspopup bieten **Wochenangebote / Getränke**.
Die lesbaren Karten enthalten Preis, Gebinde, Pfand und Literpreis.
**Flyer ansehen** öffnet zusätzlich das frei gestaltete Original mit Zoom und
Seitennavigation. Altangebote erscheinen einmalig unter Wochenangebote; deren
Wochenumschaltung bleibt erhalten.

Veröffentlichung gilt ab Beginn bis einschließlich Enddatum in **Europe/Berlin**.
Geplante oder abgelaufene neue Aktionen sind nicht öffentlich sichtbar.
Zugeordnete Waagenbilder gehören außerhalb ihres Zeitraums nicht zum Sollstand.
Andere Aktionen und unzugeordnete Werbung bleiben erhalten. Cloudbereitstellung
ist **keine Waagenbestätigung**: Bei Offline-Brücke sind Übernahme oder physische
Entfernung erst nach Wiederverbindung möglich. Der Dialog prüft die Bestätigung.

## Betrieb und Preview

Neue Dokumente und Bilder liegen im **privaten** Blob-Container `angebote`.
Ein bereits öffentlich freigegebener Container wird ausdrücklich abgelehnt.
Der Server bestimmt den Namespace; der Browser kann ihn nicht auswählen.

| App-Setting | Bedeutung |
|---|---|
| `STORAGE_CONN` | Bestehende Storage-Verbindung, ausschließlich als App-Setting |
| `CMS_AUTH_TOKEN`, `CMS_PW_HASH` | Bestehende serverseitige CMS-Anmeldung; keine Werte ins Repository schreiben |
| `ANGEBOTE_NAMESPACE` | Zwingender, je Umgebung eigener Bereich, z. B. `preview-42` |
| `ANGEBOTE_WAAGE_SEND_ENABLED` | Nur `true` erlaubt echten Versand verwalteter Angebote; sonst gesperrt |

Der PR-Workflow konfiguriert `preview-<PR>` und deaktiviert echten Angebotsversand
ausdrücklich. Er übernimmt erforderliche vorhandene Storage-/CMS-Einstellungen
sowie die bereits benötigte Shop-Anmeldung (`SHOP_JWT_SECRET`),
maskiert deren Werte und gibt die Einstellungsantwort nicht aus.
Die vorhandene Dataverse-Zuordnung bleibt bestehen; neue Angebote verändern
weder Altangebote noch Katalog-/Bestelldaten.

Veröffentlichte Revisionen und hochgeladene Bilder sind unveränderlich.
ETag-Bedingungen verhindern, dass konkurrierende Änderungen überschrieben werden.
Öffentliche Bildzugriffe sind auf Bilder aktuell veröffentlichter Fassungen
begrenzt; Verwaltungszugriffe erfordern immer Anmeldung, unabhängig vom
älteren allgemeinen Auth-Rollout-Schalter.

**Kein Produktivrollout durch diesen Feature-Branch.** Vor einem späteren Merge
müssen ausdrücklich ein eigener Produktiv-Namespace und die CMS-/Storage-Werte
eingerichtet und geprüft werden. Echter Waagenversand und physische Lesbarkeit
werden anschließend gesondert freigegeben. Keine Brücke auf die PR-Vorschau umstellen.

## Automatisierte Abnahme

```powershell
python -m unittest discover -s tests -p 'test_angebote*.py' -v
python tests\test_waage_relais_api.py
python tests\test_waage_bruecke.py
$env:TEST_URL = 'http://127.0.0.1:8817'
node node_modules\@playwright\test\cli.js test angebote-flyer
```

Der lokale statische Server muss vorher auf diesen Port gestartet werden.
Die UI-Tests mocken die API und laufen in allen vier Playwright-Projekten.
Sie prüfen unter anderem echte A4-PDF-Seiten und JPEG-Abmessungen, freie
Gestaltung, den bestehenden CMS-Reiter, Namespace/Anmeldung und Offline-Reconnect.
Keine echten Bestellungen oder Waagenübertragungen sind Teil der Tests.
