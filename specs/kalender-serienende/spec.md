# Kalender – Serienende festlegen

## Ausgangslage

Aus dem Laden: *„Bei der Terminserie sollte es auch möglich sein
anzugeben, wie lange die Serie laufen soll. 1 Woche, 2 Wochen, oder
Monate oder auch spezifisches Datum oder endlos. Orientiere dich hier an
Outlook."*

Eine einmal angelegte Serie lief bisher **immer endlos**. Wer eine
Vertretung für zwei Wochen eintrug, musste sie hinterher von Hand
beenden — und vergaß das erfahrungsgemäß.

Es gibt bereits ein Serienende, aber nur **nachträglich**: Über einen
Override mit Status `serie_ende` lässt sich eine laufende Serie ab einem
Datum abschneiden. Was fehlte, war die Angabe **bei der Anlage**.

## Wo das Ende gespeichert wird

Die Tabelle in Dataverse hat feste Spalten; eine neue anzulegen ist von
hier aus nicht möglich. Das Ende wird deshalb in das vorhandene Textfeld
`dl_wiederholung` mit aufgenommen:

| gespeichert | Bedeutung |
|---|---|
| `weekly` | wöchentlich, ohne Ende |
| `weekly~2026-12-31` | wöchentlich, letzter möglicher Termin 31.12.2026 |
| `weekdays:135` | Mo/Mi/Fr, ohne Ende |
| `weekdays:135~2026-12-31` | Mo/Mi/Fr bis 31.12.2026 |

Das Trennzeichen ist bewusst `~` und nicht `:` — letzteres trennt schon
`weekdays` von den Wochentagsziffern.

## Anforderungen

- **F1** Im Terminfenster lässt sich wählen, wie lange die Serie läuft:
  **Endlos**, **1 Woche**, **2 Wochen**, **1 Monat**, **3 Monate**,
  **6 Monate**, **1 Jahr** oder **Bis Datum…**.
- **F2** Die Auswahl erscheint **nur**, wenn überhaupt eine Wiederholung
  gewählt ist. Ein Einzeltermin hat kein Ende.
- **F3** Voreinstellung ist **Endlos** — das bisherige Verhalten.
- **F4** Unter der Auswahl steht in Klartext, wann die Serie das letzte
  Mal auftreten kann, oder dass sie ohne Ende weiterläuft.
- **F5** Die Expansion liefert **keine** Vorkommen nach dem Enddatum.
- **F6** Bereits gespeicherte Serien ohne Ende laufen unverändert weiter
  (leeres Ende = endlos).
- **F7** Ein Ende **vor** dem Startdatum wird abgewiesen — im Kiosk und
  im Server.
- **F8** „Bis Datum…" ohne gewähltes Datum wird abgewiesen.
- **F9** Ein Ende an einem Einzeltermin wird stillschweigend verworfen,
  nicht gespeichert.
- **F10** Das nachträgliche Beenden über `serie_ende` bleibt unberührt.
  Liegen beide vor, greift das **frühere** der beiden.

## Testfälle

| Nr. | Fall | Erwartung |
|---|---|---|
| TC-E01 | `zerlege('weekly')` | `('weekly', '', '')` |
| TC-E02 | `zerlege('weekly~2026-12-31')` | `('weekly', '', '2026-12-31')` |
| TC-E03 | `zerlege('weekdays:135~2026-12-31')` | `('weekdays', '135', '2026-12-31')` |
| TC-E04 | Hin- und Rückweg (`fuege_zusammen` → `zerlege`) | ergibt wieder dasselbe |
| TC-E05 | Wöchentlich mit Ende, Bereich darüber hinaus | keine Vorkommen nach dem Ende |
| TC-E06 | Dieselbe Serie ohne Ende | Vorkommen bis zum Bereichsende |
| TC-E07 | Ende **am** Starttag | genau **ein** Vorkommen |
| TC-E08 | Unlesbares Ende | wird wie „endlos" behandelt, kein Absturz |
| TC-E09 | `serie_ende`-Override **früher** als das Ende | der Override gewinnt |
| TC-E10 | Server: Ende vor dem Start | Fehler, nichts gespeichert |
| TC-E11 | Server: Ende an einem Einzeltermin | wird verworfen |
| TC-E12 | Kiosk: Wiederholung wählen | die Auswahl erscheint, „Endlos" ist aktiv |
| TC-E13 | Kiosk: „Einmalig" | die Auswahl ist verborgen |
| TC-E14 | Kiosk: „2 Wochen" | Hinweis nennt den letzten Termin; `serie_bis` geht mit |
| TC-E15 | Kiosk: „Bis Datum…" ohne Datum | Meldung, kein Aufruf |
