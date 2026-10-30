# Mittagstisch: Laufkundschaft und Mengenänderungen

Status: lokal implementiert und automatisiert geprüft; noch nicht deployed.

## Problem und Ziel

Spontane Mittagessen-Käufe im Laden werden bisher umständlich als
Telefonbestellung erfasst. Verkäuferinnen benötigen einen eigenen kurzen
Erfassungsweg, damit alle Portionen gezählt werden. Zusätzlich sollen sich
Mengen offener Telefon- und Laufkundschaft-Bestellungen korrigieren lassen.

## Bestätigte Entscheidungen

Aktuelle sichtbare Bezeichnung ab der Namens-/Zeit-Nachbesserung: **Ladenkunde**
statt Laufkundschaft (Button, Dialog, Standardname, Quellenlabel, Filter und
Summen). Technische IDs, Quellwert 3 und bestehende Datensätze bleiben erhalten.
Die folgenden ursprünglichen Bezeichnungen beschreiben weiterhin dieselbe Quelle.

- Eigener Button und eigener Dialog, nicht in die Telefonbestellung integrieren.
- Laufkundschaft nur für heute erfassen.
- Pro Verkauf einen anonymen Eintrag; mehrere Portionen desselben Gerichts
  dieses Verkaufs über die Menge zusammenfassen.
- Startstatus **Bestätigt**, danach manuell **Abgeholt** setzen.
- Standard Verzehr vor Ort; Mitnehmen optional auswählbar.
- Eigenes Quellen-Badge und eigener Quellenfilter mit Zähler.
- Mengenänderung nur für Telefon und Laufkundschaft, solange offen.

## Funktionsbeschreibung

Die Fußleiste des Mittagstischs erhält neben „Neue Telefonbestellung“ den
eigenständigen Button „Laufkundschaft erfassen“. Die Küchenliste bleibt erreichbar.
Bei einem anderen ausgewählten Tag ist die Aktion nicht verfügbar; ein
sichtbarer Hinweis verweist auf „Heute“.

Der eigene Dialog zeigt das heutige Datum, die Tagesgerichte mit Preisen, eine
Mengenauswahl und eine Checkbox „Zum Mitnehmen“. Bei einem einzigen Tagesgericht
ist dieses vorausgewählt, die Menge beginnt bei 1. Es gibt keine Kundensuche
und keine Pflicht zur Eingabe von Name, Telefon oder E-Mail.

„Erfassen“ speichert einen Vorgang mit dem vorbelegten, änderbaren Namen
„Laufkundschaft“. Ein leerer Name verwendet weiterhin diesen Standard.
Der Name dient nur zur Zuordnung bei der Ausgabe, ohne Kundenanlage. Der Dialog
erklärt vorab: „Wird als bestätigt erfasst. Nach der Ausgabe bitte als abgeholt
markieren.“ Die Karte steht anschließend unter „Offen“, mit getrennten Badges
für Quelle und Status. Die Verkäuferin verwendet später den normalen
„Abgeholt“-Button. Die Erfassung ist auch nach dem Online-Bestellschluss möglich.

Zum Ändern einer Menge öffnet „Menge ändern“ an einer berechtigten Karte einen
kleinen Dialog mit Gericht, aktueller Menge und großen Minus-/Plus-Tasten.
Erst „Speichern“ übernimmt die Änderung. „Abbrechen“ verändert nichts.

## Anforderungen und Testfälle

### F6: Name und Erfassungszeit bei der Ausgabe

- Das Namensfeld startet bei jeder Erfassung mit „Laufkundschaft“, ist optional
  überschreibbar und wird getrimmt gespeichert. Kein Konto oder Kontakt erforderlich.
- Auf Mittagstisch-Karten steht hinter dem Namen die vorhandene Erfassungszeit
  (`bestellt_am`), in Berliner Ortszeit als „HH:mm Uhr“. Keine erfundene Zeit bei
  fehlendem/ungültigem Zeitstempel; der gespeicherte Name selbst bleibt unverändert.
- Die Namenszeile nutzt die gesamte Kartenbreite. Aktionsbuttons stehen darunter,
  sodass sie keinen künstlichen Umbruch im Namen erzwingen.

| Testfall | Erwartung |
|---|---|
| TC-F6-01 | Standardname vorbelegt; eigener Name im POST und in der Karte; erneutes Öffnen setzt Standard zurück. |
| TC-F6-02 | Leerer/Whitespace-Name wird serverseitig zu Laufkundschaft; eigener Name bleibt ohne Kundenverknüpfung erhalten. |
| TC-F6-03 | Zwei Karten mit gleichem Namen zeigen unterschiedliche Erfassungszeiten in Berliner Ortszeit direkt hinter dem Namen. |
| TC-F6-04 | Namenszeile nutzt volle Breite ohne Überschneidung mit Aktionen, auch in schmalen Karten auf breitem Bildschirm. |
| TC-F6-05 | Fehlende/ungültige Zeit ergibt keinen irreführenden Zeitzusatz. |

### F1: Eigenständige Erfassung für heute

- Eigener Button und eigener Dialog, getrennt vom Telefon-Erfassungsdialog.
- Nur heutige Tagesgerichte und nur heutiges Datum (Berliner Ortszeit).
- Nur ein Tagesgericht: vorauswählen. Mehrere: ausdrückliche Auswahl.
- Fehlender Plan bzw. Ladefehler: erklärter Zustand, kein Speichern und kein
  stiller Ersatz durch ein Gericht eines anderen Tages.
- Mengen sind ganze Zahlen von 1 bis 99.
- Kein Online-Bestellschluss für diesen Mitarbeiterablauf.

| Testfall | Erwartung |
|---|---|
| TC-F1-01 | Button öffnet eigenen Dialog ohne Kundensuche; Telefonbutton bleibt unverändert. |
| TC-F1-02 | Ein Tagesgericht vorausgewählt, Menge 1, Mitnehmen aus; mehrere Gerichte müssen gewählt werden. |
| TC-F1-03 | Bei anderem Tagesreiter keine Erfassung; manipulierte Anfrage mit anderem Datum wird abgelehnt. |
| TC-F1-04 | Fehlender/falsch datierter Plan und Ladefehler erlauben keine Speicherung. |
| TC-F1-05 | Nach Online-Bestellschluss funktioniert die Erfassung weiterhin. |
| TC-F1-06 | Tageswechsel während eines offenen Dialogs verhindert Buchung auf den alten Tag. |

### F2: Einzelvorgang und unverwechselbare Herkunft

- Ein Verkauf erzeugt genau einen anonymen Bestelleintrag mit gewähltem Gericht,
  Menge, Stückpreis und Mitnehmen-Merkmal.
- Startstatus Bestätigt; Abschluss weiterhin manuell als Abgeholt.
- Keine Kundenanlage, Kundenbenachrichtigung oder Verknüpfung zu einem Konto.
- Eigene eindeutig gespeicherte Quelle Laufkundschaft, getrennt von Online,
  Telefon und bisherigen Personalbestellungen. Historische Daten nicht umdeuten.
- Eigene beschriftete Quellen-Badges, nicht allein Farbunterscheidung.
- Erneutes Öffnen setzt die Eingaben zurück; beim Speichern Mehrfachauslösung
  verhindern. Keine automatische Wiederholung einer unklar beantworteten Buchung.

| Testfall | Erwartung |
|---|---|
| TC-F2-01 | Zwei Portionen erzeugen einen anonymen Eintrag, bestätigt, nicht abgeholt. |
| TC-F2-02 | Wahl „Zum Mitnehmen“ wird gespeichert; Standard bleibt vor Ort. |
| TC-F2-03 | Weitere Erfassung erzeugt unabhängigen Eintrag und beginnt wieder mit Menge 1. |
| TC-F2-04 | Quellen-Badge lautet Laufkundschaft; alte Personalbestellungen bleiben Personal. |
| TC-F2-05 | Kein Kunden-Datensatz, keine Kundenbenachrichtigung; Doppelklick sendet nur einmal. |
| TC-F2-06 | Speicherfehler/unklarer Verbindungsabbruch meldet keinen Erfolg und wiederholt nicht automatisch. |

### F3: Quellenfilter und richtige Summen

- Eigener Filter „Laufkundschaft“ mit Bestellanzahl als Zähler.
- Quellenfilter und Statusfilter werden kombiniert; Telefon und Laufkundschaft
  sind alternative Quellenfilter. Wiederholtes Antippen hebt den Quellenfilter auf.
- Quellenzähler zählen Bestelleinträge des gewählten Tages über alle Status,
  einschließlich Storniert. Der Statusfilter entscheidet über sichtbare Karten.
- „Nur Telefon“ enthält ausschließlich Telefon, nicht Personal/Laufkundschaft.
- Kochbedarf zählt alle nicht stornierten Portionen; Laufkundschaft separat
  von telefonisch anzeigen. Abgeholte Portionen bleiben enthalten.
- Küchenliste und Tageszahlen berücksichtigen Laufkundschaft und Mitnehmen.
- Tagesverlauf darf Laufkundschaft nicht als telefonisch oder online bezeichnen.

| Testfall | Erwartung |
|---|---|
| TC-F3-01 | Gemischte Quellen: Telefonfilter enthält keine Laufkundschaft/Personal und umgekehrt. |
| TC-F3-02 | Laufkundschaftfilter kombiniert mit Offen, Erledigt und Storniert zeigt passende Karten. |
| TC-F3-03 | Bestellzähler zählen Einträge, Kochbedarf zählt Portionen ohne Storniert. |
| TC-F3-04 | Abholung verändert nicht die Gesamtportionen; Küchenliste zeigt korrekten Mitnehmen-Split. |
| TC-F3-05 | Quellenzahlen und Tagesverlauf ordnen Laufkundschaft eindeutig zu. |

### F4: Mengen offener Bestellungen ändern

- Nur Telefon und Laufkundschaft mit Status Neu oder Bestätigt.
- Keine Mengenbearbeitung von Online, historischen Personalbestellungen,
  Abgeholt oder Storniert über diesen Ablauf.
- Ganze Menge 1–99, ausdrücklich speichern; Abbruch ohne Nebenwirkungen.
- Status, Gericht, Stückpreis und Quelle bleiben unverändert.
- Karten-Gesamtpreis, Kochbedarf, Zähler, Tagesverlauf und nächste Küchenliste
  verwenden die gespeicherte Menge; nach Neuladen bleibt sie erhalten.
- Berechtigung und Quell-/Statusgrenzen serverseitig prüfen, nicht nur UI sperren.
- Zwischenzeitliche Mengen- oder Statusänderungen dürfen nicht überschrieben
  werden. Konflikt sichtbar erklären und aktuellen Stand neu laden.
- Ungültige Eingaben explizit ablehnen, nicht still ignorieren.

| Testfall | Erwartung |
|---|---|
| TC-F4-01 | Offene Telefon- und Laufkundschaft-Bestellung von 1 auf 3 ändern; nach Neuladen 3. |
| TC-F4-02 | Gesamtpreis entspricht 3 × Stückpreis; alle Portionssummen folgen, Status unverändert. |
| TC-F4-03 | Abbruch speichert nichts; 0, 100, Dezimalwerte und ungültige Typen werden abgelehnt. |
| TC-F4-04 | Online, Personal, Abgeholt und Storniert nicht bearbeitbar, auch nicht per manipulierter Anfrage. |
| TC-F4-05 | Zwischenzeitliche Abholung/Mengenänderung führt zu Konflikt statt Überschreiben. |
| TC-F4-06 | Doppelklick, API-/Netzfehler melden keinen falschen Erfolg; unangemeldete Änderungen abgewiesen. |

### F5: Bedienung und Bestandsschutz

- Keine horizontale Überbreite, verdeckten Aktionen oder springenden
  Scrollpositionen. Dialoge bedienen sich mit großen Touch-Zielen (mindestens
  44 Pixel), auch per Tastatur.
- Freundliche deutsche Fehler-/Bestätigungstexte, bestehende Kiosk-Komponenten.
- Telefon-Erfassungsdialog, Onlinebestellungen, Kundenkommunikation und
  bestehende Statusabläufe bleiben erhalten.

| Testfall | Erwartung |
|---|---|
| TC-F5-01 | Erfassung, Quellenfilter und Mengenänderung passen auf alle vier Projekt-Viewports. |
| TC-F5-02 | Speichern/Abbrechen erhält Tages-/Filterauswahl und Scrollposition; Fokus bleibt sinnvoll. |
| TC-F5-03 | Bestehende Telefon-, Online- und Abholtests bestehen weiter. |

## Nicht-Ziele

Keine Kassen-/Zahlungsabwicklung, keine automatische Abholung, keine
Tages-Sammelbuchung, keine rückwirkende Erfassung oder zukünftige
Laufkundschaft-Buchung und keine Mengenbearbeitung von Onlinebestellungen.
Kein Deployment und keine Änderung produktiver Daten ohne separaten Auftrag.

## Offene fachliche Fragen

Keine. Die technische Dataverse-Quellen-Erweiterung ist vor Umsetzung zu prüfen;
sie ändert die hier festgelegte fachliche Trennung nicht.
