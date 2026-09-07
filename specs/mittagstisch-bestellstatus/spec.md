# Mittagstisch: Bestellstatus sichtbar und einheitlich – Spec

## Overview

Im Kiosk laufen Mittagstisch-Bestellungen aus zwei Quellen zusammen: **Online**
(Kunde bestellt über die Website) und **Telefon** (Verkäuferin nimmt sie am
Apparat auf). Beide landen in derselben Liste, verhalten sich aber unterschiedlich
– und der Zustand einer Bestellung ist nirgends angeschrieben.

Gemeldet wurde: „Telefonbestellungen erscheinen nicht unter offen. Sie haben auch
keinen Status z. B. abgeholt. Das ist irreführend und sollte synchronisiert werden."

### Befund aus den Live-Daten (14 Tage, 73 Bestellungen)

| Quelle | Status | Anzahl |
|---|---|---|
| Online | bestätigt | 59 |
| Online | abgeholt | 8 |
| Online | storniert | 5 |
| Telefon | abgeholt | 1 |

Die eine Telefonbestellung **hat** einen Status – er ist nur nicht lesbar. Auf der
Karte erkennt man den Zustand ausschließlich an der Randfarbe und daran, welche
Knöpfe erscheinen. Bei „abgeholt" bleibt nur ein grüner Haken.

### Ursachen

1. **Kein Statustext.** Keine Bestellkarte schreibt ihren Zustand an.
2. **Unterschiedliche Lebenswege.** Online startet auf `neu`, Telefon auf
   `bestätigt`. Die Zahl am Mittagstisch-Reiter und die rote Hervorhebung von
   „Offen" reagieren aber nur auf `neu` – eine Telefonbestellung löst also **nie**
   ein Signal aus, obwohl sie im Kochbedarf sofort mitzählt.
3. **Stille Lücke.** `item.get("dl_status", 0)` liefert bei einem **leeren** Feld
   nicht die 0, sondern `None`. Eine solche Bestellung erschiene unter „Alle",
   aber unter **keinem** Status-Reiter und ohne jeden Knopf – genau das gemeldete
   Bild. Aktuell existiert kein solcher Datensatz; es gibt aber auch nichts, was
   ihn verhindert. Gleiches gilt für `dl_quelle`.
4. **Doppelt belegter Begriff.** „vor Ort" bedeutet im Kochbedarf *nicht online
   erfasst*, in der Küchenliste dagegen *Verzehr im Laden*. Zwei Bedeutungen,
   ein Wort.
5. **Zwei Einheiten nebeneinander.** Kochbedarf zählt Portionen (9), die Reiter
   zählen Bestellungen (6). Beides stimmt, unbeschriftet verwirrt es.

## Goals

- Der Zustand jeder Bestellung ist ohne Deuten ablesbar.
- Keine Bestellung kann aus allen Reitern herausfallen.
- Telefonbestellungen sind auffindbar und verhalten sich nachvollziehbar.
- Zahlen sind mit ihrer Einheit beschriftet.

## Non-Goals

- Der Lebensweg selbst wird **nicht** umgebaut. Eine Telefonbestellung wird
  weiterhin sofort als `bestätigt` gespeichert – der Kunde kommt später und holt
  ab. Ein Fall „direkt mitgenommen" existiert im Betrieb nicht
  (**vom Nutzer bestätigt**).
- Keine Änderung an Storno-, Chat- oder Sonderwunsch-Logik.

## Requirements

### F1: Status auf jeder Bestellkarte

#### F1 Behaviour / Acceptance

- Jede Karte trägt neben der Quelle ein Textabzeichen mit ihrem Zustand:
  `Neu`, `Bestätigt`, `Abgeholt`, `Storniert`.
- Das Abzeichen ist farblich vom Quellen-Abzeichen unterscheidbar.
- Gilt für alle Quellen gleichermaßen.

#### F1 Test Cases

- **TC-F1-01:** Eine Bestellung mit Status `bestätigt` zeigt das Abzeichen
  „Bestätigt".
- **TC-F1-02:** Eine Telefonbestellung mit Status `abgeholt` zeigt „Abgeholt"
  **und** die Quelle „Telefon".

### F2: Keine Bestellung darf verschwinden

#### F2 Behaviour / Acceptance

- Ein leeres/unbekanntes Statusfeld wird verlässlich als `neu` behandelt –
  serverseitig beim Auslesen **und** clientseitig beim Einlesen.
- Ein leeres Quellenfeld wird als `Online` behandelt.
- Die Summe der Reiter `Offen + Erledigt + Storniert` entspricht immer der Zahl
  aller geladenen Bestellungen.

#### F2 Test Cases

- **TC-F2-01:** Bestellung mit `dl_status: null` erscheint unter „Offen" und hat
  die Knöpfe einer neuen Bestellung.
- **TC-F2-02:** Offen + Erledigt + Storniert = Anzahl aller Bestellungen.
- **TC-F2-03:** Bestellung mit `dl_quelle: null` wird als „Online" beschriftet
  und im Kochbedarf als online gezählt (keine Widersprüche zwischen beiden).

### F3: Zahlen mit Einheit

#### F3 Behaviour / Acceptance

- Die Gerichtezeile über den Karten nennt beide Größen, z. B.
  „8 Portionen · 5 Bestellungen".
- Der Fuß des Kochbedarfs bleibt bei Portionen, benennt sie aber weiterhin klar.

#### F3 Test Cases

- **TC-F3-01:** Bei 5 Bestellungen mit zusammen 8 Portionen steht beides in der
  Gruppenzeile.

### F4: Herkunft auffindbar und eindeutig benannt

#### F4 Behaviour / Acceptance

- In der Filterleiste sitzt ein Schalter „Nur Telefon", der die Ansicht auf
  Bestellungen mit Quelle ≠ Online einschränkt. Er wirkt zusätzlich zum
  Status-Reiter und zeigt seine Trefferzahl.
- Der Schalter erscheint nur, wenn es überhaupt solche Bestellungen gibt.
- Der Kochbedarf beschriftet diese Bestellungen als **„telefonisch"** statt
  „vor Ort"; „vor Ort" bleibt allein dem Verzehr im Laden vorbehalten.

#### F4 Test Cases

- **TC-F4-01:** Ohne Telefonbestellungen ist der Schalter nicht sichtbar.
- **TC-F4-02:** Mit Telefonbestellung zeigt der Schalter deren Anzahl; ein Klick
  blendet die Online-Bestellungen aus.
- **TC-F4-03:** Der Kochbedarf verwendet „telefonisch", nicht „vor Ort".

### F5: Telefonerfassung sagt, was sie tut

#### F5 Behaviour / Acceptance

- Der Dialog „Neue Telefonbestellung" nennt vor dem Speichern den Zustand, in dem
  die Bestellung landet: bestätigt, erscheint unter „Offen", bis sie auf
  „Abgeholt" gesetzt wird.
- Keine Auswahlmöglichkeit – es gibt betrieblich nur diesen einen Fall.

#### F5 Test Cases

- **TC-F5-01:** Der Dialog enthält den Hinweis auf den Zustand „Bestätigt".

## Data & Contracts

- API `/api/lunch-order` unverändert im Vertrag; `_serialize` liefert `status`
  und `quelle` künftig **immer** als ganze Zahl, nie `null`.
- Statuswerte: `0 neu`, `1 bestätigt`, `2 storniert`, `3 abgeholt`.
- Quellen: `0 Online`, `1 Telefon`, `2 Personal`.

## Open Questions

Keine.

## Traceability

| Requirement | Test Cases | Umsetzung |
| --- | --- | --- |
| F1 | TC-F1-01/02 | `kiosk.html` `_renderOrderCard` |
| F2 | TC-F2-01..03 | `api/lunch-order/__init__.py` `_serialize`, `kiosk.html` `loadOrders` |
| F3 | TC-F3-01 | `kiosk.html` `renderOrders` |
| F4 | TC-F4-01..03 | `kiosk.html` Filterleiste, `renderCookBar` |
| F5 | TC-F5-01 | `kiosk.html` `openNewOrder` |
