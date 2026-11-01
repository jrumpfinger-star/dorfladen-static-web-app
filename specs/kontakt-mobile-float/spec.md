# Mobile Chat-Float verschieben

## Ziel

Der auf Mobilgeräten fest positionierte „Schreib uns“-Chat-Button soll Inhalte
und den CMS-Zugang nicht dauerhaft verdecken. Nutzer können ihn an eine andere
Stelle ziehen; die Position bleibt auf demselben Browser/Gerät erhalten.

## Anforderungen

- **FR-01:** Bei Viewports bis einschließlich 768 CSS-Pixel Breite kann der
  Chat-Float mit Maus oder Touch verschoben werden.
- **FR-02:** Eine abgeschlossene Verschiebung wird lokal pro Browser und
  Website-Origin gespeichert und beim nächsten Besuch wiederhergestellt.
- **FR-03:** Verschieben und Wiederherstellen begrenzen den Button auf den
  sichtbaren Viewport. Bei einer Größenänderung wird eine nicht mehr passende
  gespeicherte Position in den Viewport zurückgesetzt.
- **FR-04:** Der Float ist im mobilen Ruhezustand leicht transparent und bei
  Fokus, Berührung oder Verschiebung deutlicher sichtbar.
- **FR-05:** Ein einfacher Tap/Klick öffnet weiterhin den Chat. Eine echte
  Verschiebung darf den Chat nicht versehentlich öffnen.
- **FR-06:** `Alt`+`Umschalt`+Pfeiltasten ermöglichen das Verschieben, ohne die
  bestehende Enter-/Leertasten-Bedienung zum Öffnen des Chats zu verlieren.
  Die Bewegungsmöglichkeit wird für assistive Technik beschrieben.
- **FR-07:** Auf Viewports über 768 CSS-Pixel bleiben Position und Aussehen des
  Chat-Floats unverändert; eine gespeicherte Mobilposition wirkt dort nicht.
- **FR-08:** Fehler beim Lesen oder Speichern des lokalen Positionswerts
  verhindern weder die Anzeige noch die Bedienung des Chats und werden
  nachvollziehbar protokolliert.

## Akzeptanztests

- **TC-KMF-01:** Auf 375×667 und 768×1024 ist der Float sichtbar, im Ruhezustand
  leicht transparent und bei Fokus/Interaktion deutlicher.
- **TC-KMF-02:** Verschieben per Pointer verändert seine Position innerhalb
  des Viewports, speichert diese lokal und öffnet den Chat dabei nicht.
- **TC-KMF-03:** Nach einem Reload erscheint der Float an der gespeicherten
  Stelle; wird der Viewport verkleinert, bleibt er vollständig sichtbar und
  die angepasste Position wird erneut gespeichert.
- **TC-KMF-04:** Ein Tap öffnet das Chatfenster weiterhin;
  Alt+Umschalt+Pfeiltasten verschieben den fokussierten mobilen Float und die
  Bewegung ist für assistive Technik beschrieben.
- **TC-KMF-05:** Bei 1280×800 bleibt der Float rechts unten, vollständig
  sichtbar und undurchsichtig; mobile Drag-Bedienung ist dort nicht aktiv.
- **TC-KMF-06:** Wenn `localStorage` nicht verfügbar ist, bleibt der Chat
  bedienbar und der Speicherfehler wird protokolliert.

## Grenzen

- Keine Änderung des Chat-Overlays, des CMS-Zugangs oder der WhatsApp-Gruppe.
- Keine Synchronisierung der Position zwischen Geräten oder Browsern.
- Die mobile Breakpoint-Grenze bleibt bei 768 CSS-Pixeln.
