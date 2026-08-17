# Meine Bestellungen – Unified Order View

## Beschreibung
Die Ansicht "Meine Bestellungen" auf der Shop-Seite (`shop.html`) zeigt dem Kunden alle seine Bestellungen
(Shop-Bestellungen UND Fleisch-Vorbestellungen) in einer einheitlichen, chronologisch sortierten Liste.
Standardmäßig werden nur offene Bestellungen angezeigt. Filter-Tabs ermöglichen eine gezielte Ansicht.

## Akzeptanzkriterien

### Integration
- [x] **AK-MB-01** Shop- und Fleisch-Bestellungen werden parallel geladen und in einer gemeinsamen Liste angezeigt
- [x] **AK-MB-02** Fleisch-Bestellungen sind mit einem "Fleisch"-Badge gekennzeichnet
- [x] **AK-MB-03** Fleisch-Bestellungen zeigen eine eigene Timeline (Neu → Bestellt → Eingetroffen → Abgeholt)
- [x] **AK-MB-04** Fleisch-Bestellungen enthalten einen "Details anzeigen"-Link zur Bestellstatus-Seite
- [x] **AK-MB-05** Bestellungen werden nach Bestelldatum absteigend sortiert

### Filter
- [x] **AK-MB-06** Filter-Tabs: "Offen" (Default), "7 Tage", "30 Tage", "Alle"
- [x] **AK-MB-07** Default-Filter "Offen" zeigt nur Bestellungen mit Status < 3 (nicht abgeholt/storniert)
- [x] **AK-MB-08** Filter "7 Tage" zeigt alle Bestellungen der letzten 7 Tage (inkl. abgeholt/storniert)
- [x] **AK-MB-09** Filter "30 Tage" zeigt alle Bestellungen der letzten 30 Tage
- [x] **AK-MB-10** Filter "Alle" zeigt alle Bestellungen ohne Einschränkung
- [x] **AK-MB-11** Offene-Filter zeigt Badge mit Anzahl offener Bestellungen

### Fleisch-Vorbestellungen in "Schon bestellt"-Sektion
- [x] **AK-MB-12** Abgeholte (Status 3) und stornierte (Status 4) Fleisch-Bestellungen werden in der "Schon bestellt"-Übersicht ausgeblendet

## Dateien
- `static-site/shop.html` – Unified Order View mit Filtern + Fleisch-Vorbestellungen-Filter
