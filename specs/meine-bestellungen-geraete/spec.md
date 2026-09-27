# Meine Mittagessen-Bestellungen auf allen Geräten

> **Status: Entwurf — NICHT umsetzungsreif.**
> Diese Spec enthält offene `[NEEDS CLARIFICATION]`-Punkte und darf nach
> den Regeln des Projekts **nicht** nach `/sdd-plan` weitergereicht
> werden, bevor sie entschieden sind.

**Wunsch aus dem Laden (27.09.2026):** „Ich möchte, dass meine
Mittagessenbestellungen auch auf der Homepage angezeigt werden können.
Voraussetzung ist eine hinterlegte E-Mail-Adresse, so dass dies dann auch
auf mehreren Geräten abrufbar ist."

Entwurf zum Anschauen:
[mockups/meine-bestellungen-geraete-mockup.html](../../mockups/meine-bestellungen-geraete-mockup.html)
— geprüft über sechs Breiten (320 – 1280 px), kein waagerechtes Rollen,
kein überlaufender Text.

## Ausgangslage — gemessen, nicht vermutet

### Der halbe Weg steht bereits

| Baustein | Zustand |
|---|---|
| Kachel „Ihre Bestellung" auf der Startseite | vorhanden (Spec `mittagstisch-kachel`) |
| Serverabfrage `mode=my` | kennt **E-Mail** *und* **Geräte-Kennung** |
| Ablage der Adresse im Browser | `bs_email`, gesetzt beim Bestellen |

Der Bruch liegt allein dazwischen: `bs_email` entsteht **nur auf dem
Gerät, auf dem bestellt wurde**. Ein zweiter Browser kennt die Adresse
nicht, und es gibt keinen Weg, sie ihm zu nennen.

### Der Haken, der die Lösung bestimmt

Die Abfrage verlangt **keinen Nachweis**. Am 27.09.2026 gegen die
Live-Seite gemessen, ohne Anmeldung und ohne Token:

| Aufruf | Antwort |
|---|---|
| `GET /api/lunch-order?mode=my&email=<echte Adresse>` | HTTP 200, **1 Treffer** mit Name, Gericht, Datum, Status |
| `GET /api/lunch-order?mode=my&email=<erfundene Adresse>` | HTTP 200, 0 Treffer |

Heute ist das folgenlos, weil es **keine Eingabemöglichkeit** gibt — nur
wer auf dem Gerät bestellt hat, sieht etwas. Der naheliegende Bau eines
E-Mail-Feldes würde die Lücke jedoch **zur Funktion erheben**: Wer die
Adresse einer Nachbarin kennt, läse deren Bestellungen mit. In einem Dorf,
in dem man die Adressen kennt, ist das besonders heikel.

**Daraus folgt die Leitplanke dieser Spec:** Eine Adresse darf erst dann
Bestellungen zeigen, wenn nachgewiesen ist, dass sie der anfragenden
Person gehört.

### Was dafür schon bereitsteht

Für den Shop existiert ein vollständiges Kundenkonto:
`api/auth-register`, `api/auth-verify`, `api/auth-login`,
`api/auth-reset`. Es prüft die E-Mail-Adresse (`dl_email_verifiziert`),
speichert das Passwort als Hash und stellt ein Anmeldezeichen (JWT) mit
**90 Tagen** Gültigkeit aus. Im Browser liegen `dl_shop_token` und
`dl_shop_user`.

## Wege

| | Weg | Beurteilung |
|---|---|---|
| **A** | Das vorhandene Konto nutzen | Baut auf Geprüftem auf, Adresse ist bestätigt, schließt die Lücke mit. Hürde: Wer kein Konto hat, muss eins anlegen. |
| **B** | Sechsstelliger Code per E-Mail | Kein Passwort, niedrige Hürde, vertraut aus dem Onlinebanking. Aufwand: neuer Endpunkt, Ablauffrist, Sperre gegen Ausprobieren. |
| **C** | Freies E-Mail-Feld | **Abzuraten.** Billig gebaut, gibt aber fremde Bestellungen preis. Nur der Vollständigkeit halber genannt. |

Vorschlag: **A und B verbinden.** Wer angemeldet ist, merkt nichts — es
funktioniert. Wer kein Konto hat, bekommt den Code-Weg angeboten.

## Anforderungen (Entwurf)

- **F1** Wer an einem Gerät nachweislich über seine E-Mail-Adresse
  verfügt, sieht dort seine Mittagessen-Bestellungen.
- **F2** Der Nachweis erfolgt über das bestehende Kundenkonto (Weg A).
- **F3** Der Server gibt Bestellungen zu einer E-Mail-Adresse **nur**
  gegen ein gültiges Anmeldezeichen heraus.
- **F4** Die **Geräte-Kennung** bleibt als Schlüssel bestehen. Wer ohne
  Konto bestellt, muss seine Bestellung weiterhin auf seinem Gerät sehen
  — sonst nimmt die Änderung allen heutigen Kunden die Kachel weg.
- **F5** Beim Bestellen wird die Adresse des angemeldeten Kontos
  vorbelegt.
- **F6** Der Nachweis hält ohne erneutes Anmelden; Richtwert sind die
  90 Tage des bestehenden Anmeldezeichens.

## Offene Punkte

- `[NEEDS CLARIFICATION]` **Reicht Weg A allein?** Oder ist die Hürde
  „Konto anlegen" für die Stammkundschaft zu hoch und Weg B gehört von
  Anfang an dazu?
- `[NEEDS CLARIFICATION]` **Welcher Zeitraum?** Die Kachel zeigt heute
  Bestellungen ab dem heutigen Tag. Soll es geräteübergreifend auch einen
  Rückblick geben — und wenn ja, wie weit zurück?
- `[NEEDS CLARIFICATION]` **Altbestellungen.** Wer ohne Konto bestellt
  hat, hat keine Verknüpfung. Sollen solche Bestellungen nachträglich
  über die Adresse zugeordnet werden — und ist das zulässig, obwohl die
  Adresse damals nicht bestätigt wurde?
- `[NEEDS CLARIFICATION]` **Umgang mit der offenen Abfrage.** Wird F3
  scharf geschaltet, hört jeder heutige Aufruf mit blanker Adresse auf zu
  wirken. Braucht es eine Übergangszeit, in der beides geht?

## Testfälle (Entwurf, noch nicht geschrieben)

| ID | Prüft | Erwartung |
|----|-------|-----------|
| TC-MG-01 | F1/F2 | angemeldet auf Gerät B → Bestellung erscheint |
| TC-MG-02 | F3 | Abfrage mit fremder Adresse **ohne** Anmeldezeichen → keine Daten |
| TC-MG-03 | F3 | Abfrage mit Anmeldezeichen einer **anderen** Person → keine Daten |
| TC-MG-04 | F4 | ohne Konto, aber mit Geräte-Kennung → Bestellung erscheint weiterhin |
| TC-MG-05 | F5 | angemeldet bestellen → Adresse ist vorbelegt |
| TC-MG-06 | F6 | nach Neuladen weiterhin sichtbar, ohne erneutes Anmelden |

## Gegenprobe (Entwurf)

- Entfällt die Prüfung des Anmeldezeichens, fällt **TC-MG-02**.
- Wird das Zeichen nicht gegen die angefragte Adresse geprüft, fällt
  **TC-MG-03** — der gefährlichere Fall, weil er nur mit *zwei*
  verschiedenen Konten auffällt.
- Wird die Geräte-Kennung beim Absichern vergessen, fällt **TC-MG-04**.
  Dieser Fall ist der Wächter gegen den Schaden, den die Absicherung
  selbst anrichten könnte.
