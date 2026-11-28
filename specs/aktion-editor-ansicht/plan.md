# Aktions-Editor: Ansicht, Vorschauanteil und Artikelbilder — Plan

**Spec:** [spec.md](./spec.md)

## Architektur

Keine neue Komponente. Bestehende Split-Logik, CSS und der Dataverse-Adapter
werden angepasst.

## Dateiänderungskarte

| Datei | Änderung | Spec |
| --- | --- | --- |
| `static-site/js/angebote-design.js` | `split()`: Standardansicht immer `split`; Anfangsverhältnis `.6` für alle Arbeitsflächen | F1, F2 |
| `static-site/css/angebote.css` | Handy-Split im Aktions-Editor: Werkzeuge oben (`1fr`), Vorschau unten (`minmax(120px,34%)`, `!important`), schlägt die älteren, widersprüchlichen Zeilenvorlagen | F2 |
| `static-site/js/angebote-dataverse.js` | `restore_images` auch bei vorhandenem Layout, wenn Artikel mit Kennung ohne Bild existieren; `restoreImages` je Artikel fehlertolerant | F4 |
| `api/werbebilder/__init__.py` | Warnung bei fehlendem Graph-Token | F4 |
| `tests/cms-angebote-ablauf.spec.js`, `tests/angebote-paletten.spec.js` | Alte Handy-Standardannahme angepasst; TC-AEA-Tests ergänzt | alle |

## Funktionserhalt

Vorher/Nachher: „Nur Eingaben“, „Nur Motiv“, Zoom, Splitter, Vollbild, manuelle
und automatische Bildsuche bleiben unverändert; geändert sind nur Standardwahl,
Anteile und der Auslöser der Nachsuche.
