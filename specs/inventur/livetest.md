# Inventur-Web-App — geführter Livetest

**Ziel:** Verhalten mit echten Dataverse-Daten nachprüfen, bevor die Inventur
im Laden regelmäßig genutzt wird. Der Test schreibt echte Mengen, aber in eine
eigene Testinventur; bestehende Inventuren und Positionen werden nicht angerührt.

**Vorbereitung:** PowerApps und Web-Seite nebeneinander auf zwei Geräten (oder
geteilter Bildschirm). Vorschau-URL laden und einmal neu laden, damit die
neueste Version aktiv ist.

## 1. Testinventur anlegen (Settings)

1. Menü → Settings → Neu.
2. Name: `Web-Livetest` (ohne Positionen umbenennbar). Status: **aktiv**.
3. Speichern → „Gespeichert“.

**Erwartung:** Die Inventur erscheint in Settings und in der Auswahl unter
„Aktive Inventur“.

## 2. Erfassen und Speichern (Erfassung)

1. Zwei echte Artikel erfassen: einen per Suche, einen per Kamera-Scan
   (auch einmal hochkant halten).
2. Menge eingeben, mit Eingabetaste (OK) oder Speichern abschließen.
3. In der PowerApps dieselbe Testinventur öffnen.

**Erwartung:** „Gespeichert“-Häkchen; in der PowerApps erscheinen die Positionen
mit denselben Mengen. Artikelname bleibt bei geöffneter Tastatur sichtbar;
nach dem Speichern schließt sich die Tastatur.

## 3. Konflikt mit der PowerApps

1. In der **Web-Seite** für Artikel A die Menge laden lassen (Artikel neu wählen).
2. In der **PowerApps** dieselbe Position auf einen anderen Wert ändern.
3. In der Web-Seite die Menge ändern und speichern.

**Erwartung:** Dialog „Stand geändert“ zeigt aktuellen Stand und eigenen
Entwurf getrennt; nichts wird still überschrieben. Nach „Aktuellen Stand
übernehmen“ steht die PowerApps-Menge im Feld.

## 4. Plus genau einmal

1. Menge 5 speichern, dann Plus 3 eingeben und speichern.
2. Ergebnis prüfen (8) und die Seite neu laden.

**Erwartung:** Nach dem Neuladen steht 8, nicht 11 oder 13.

## 5. Verbindung kappen (unklarer Ausgang)

1. Menge ändern und Speichern antippen; unmittelbar danach kurz
   Flugmodus/WLAN aus. Erscheint „Speicherstand unklar“: Dialog nutzen,
   aktuellen Stand prüfen lassen, dann neu speichern.
2. In der PowerApps die Menge gegenprüfen.

**Erwartung:** Kein doppeltes Addieren; die Menge stimmt mit der PowerApps überein.

## 6. Namenssperre

1. Nach erster Position Settings → Testinventur → Namen ändern → Speichern.

**Erwartung:** Ablehnung mit Begründung; Jahr/Datum/Status bleiben änderbar.

## 7. Aufräumen

Die Testinventur auf Status **abgeschlossen** stellen (nicht löschen – Löschen
ist nicht vorgesehen). Die erfassten Testmengen liegen damit außerhalb der
aktiven Inventuren.

## Notizen

- Blockiert die Seite eine Position mit „mehrere Positionen“: Das ist die
  bekannte doppelte Position; Bereinigung braucht eine separate Entscheidung.
- Auffälligkeiten (Meldungstexte, Zeitverhalten, Kamera) direkt notieren und
  hier melden.
