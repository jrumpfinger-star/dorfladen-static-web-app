# Dialoge sind modal — ein Klick daneben schließt nichts

**Meldung aus dem Laden (06.10.2026):** „Modal bedeutet, dass auch Klicks
außerhalb den Dialog nicht schließen. Checke alle Dialoge darauf."

## Vorgeschichte

Die Frage kam nicht zum ersten Mal. Im Spätsommer hieß es: „Bei Bestellung
Metzger schließt sich Dialog, wenn klick auf außerhalb." Damals wurde sie
**gezielt** beantwortet — nur die Artikelmaske des Metzgers bekam den
Schutz, Rückfragen blieben wegklickbar
([specs/metzger-dialog-sicher/spec.md](../metzger-dialog-sicher/spec.md),
R5: „die Änderung gilt gezielt, nicht pauschal").

Dass dieselbe Frage wiederkam, ist die Antwort auf jenes R5: Eine
Oberfläche, in der ein Dialog mal wegklickbar ist und mal nicht, erzieht
dazu, es gar nicht erst zu versuchen — und dann wird auch die Rückfrage,
auf die es ankommt, mit einem Griff daneben beantwortet. Die Ausnahme hat
mehr gekostet, als sie wert war.

## Befund

Erhoben über `static-site/`: **69 Stellen** schlossen beim Klick auf den
Rand. In den vier Bestellmodulen sah es so aus:

| Modul | Klick daneben | Escape | `aria-modal` |
|---|---|---|---|
| Drax | schloss **alles** | fehlte | fehlte |
| Bäcker | schloss **alles** | fehlte | fehlte |
| Getränke | schloss **alles** | ja | **ja** (!) |
| Metzger | nur Rückfragen | ja | fehlte |

Getränke war der deutlichste Fall: Das Markup versprach seit jeher
`aria-modal="true"`, das Verhalten hielt es nicht. Wer sich auf die Zusage
verlässt — etwa ein Screenreader —, bekam etwas anderes als die Maus.

## Anforderungen

- **R1** Ein Klick oder Tipp neben einen Dialog schließt ihn nicht.
- **R2** Die bewussten Wege hinaus bleiben: ein Knopf im Dialog
  („Abbrechen", „Schließen", „×") und `Escape`, wo es ihn schon gab.
- **R3** Jede Dialoghülle der Bestellmodule trägt `role="dialog"` und
  `aria-modal="true"` — Zusage und Verhalten stimmen überein.
- **R4** Die Regel gilt für **Dialoge**, nicht für jeden Überlagerer.
  Ausgenommen bleiben Klappen ohne eigenen Schließknopf, bei denen das
  Danebentippen die einzige und erwartete Geste ist:
  `kiosk-filter.js` (Filterblatt), `kiosk-neu-shell.js` und
  `cms-neu-shell.js` (Navigationsblätter).
- **R5** Kein Dialog darf ohne Ausweg zurückbleiben. Vor dem Entfernen
  wird je Dialog geprüft, dass ein Schließknopf oder `Escape` existiert.

## Umfang

| Bereich | Stellen |
|---|---|
| Bestellmodule (Drax, Bäcker, Getränke, Metzger) | 4 Dialoghüllen |
| Kiosk und CMS (Storno, Antworten, Bestätigungen, Anmeldung) | 23 |
| Öffentliche Seiten (Popups, Lightbox, Hilfe, Neuigkeiten) | 32 |
| Ausgenommen (Klappen, R4) | 4 |

## Test Cases

| ID | Prüft | Erwartung |
|----|-------|-----------|
| TC-DM-01 | R1 | Text in die Artikelmaske tippen, auf den Rand klicken → Maske steht, Eingabe unverändert |
| TC-DM-02 | R2 | „Abbrechen" schließt |
| TC-DM-03 | R2 | `Escape` schließt |
| TC-DM-04 | R1 | Auch eine reine Rückfrage bleibt beim Klick daneben stehen |
| TC-DM-05 | R3 | Jede Dialoghülle der vier Module trägt `aria-modal="true"` |
| TC-DM-06 | R5 | Jedes geänderte Popup hat weiterhin einen Schließknopf |
| TC-DM-07 | R4 | Das Filterblatt schließt weiterhin beim Danebentippen |

## Gegenprobe

Nachgewiesen im Browser an Drax, Metzger und Getränken: Eingabe eintippen,
auf den Rand klicken, Eingabe unverändert vorgefunden; `Escape` und
„Abbrechen" schließen weiterhin.

Für die zwölf Popups der Startseite maschinell geprüft, dass das Attribut
fort ist **und** ein Schließknopf bleibt — 12 von 12.

Der Elementbaum aller dreizehn geänderten HTML-Dateien ist vor und nach
der Änderung identisch; entfernt wurden ausschließlich Attribute, nie
Elemente.

## Offen

`Escape` schließt noch nicht überall — auf einigen öffentlichen Seiten gibt
es keinen Tastenwächter. Das ist kein Rückschritt, es gab ihn dort auch
vorher nicht, aber ein lohnender nächster Schritt.
