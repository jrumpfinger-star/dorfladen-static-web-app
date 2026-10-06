# Artikel löschen — einheitlich in allen Bestellmodulen

## Anlass

Aus dem Laden: *„Artikel müssen auch gelöscht werden können"* und, als
Nachsatz zu einer modulweisen Umsetzung: *„Es muss alles einheitlich
sein!!!"* und *„Getränke auch!!"*

Bisher ließ sich ein Artikel in keinem der vier Bestellmodule entfernen.
Überall gab es nur *Ausblenden*. Ein Vertipper beim Anlegen — im
Bäckerstamm steht seither ein Artikel „ere" mit der Nummer 45 — bleibt
damit für immer im Stamm stehen und muss bei jeder Pflege übersprungen
werden.

Betroffen sind **alle vier** Bestellmodule, mit demselben Verhalten und
derselben Bedienung:

| Modul | Artikel-Endpunkt | Kiosk-Datei |
|-------|------------------|-------------|
| Metzger | `/api/metzger-artikel` | `static-site/js/kiosk-metzger-bestellung.js` |
| Bäcker | `/api/baecker-artikel` | `static-site/js/kiosk-baecker.js` |
| Getränke | `/api/getraenke-artikel` | `static-site/js/kiosk-getraenke.js` |
| Drax | `/api/drax-artikel` | `static-site/js/kiosk-drax.js` |

## Requirements

- **F1 Zwei Fälle, eine Taste.** Je Artikel gibt es im Artikelstamm genau
  eine Schaltfläche „Löschen". Was sie bewirkt, entscheidet der Server:
  - **nie bestellt** → der Artikel wird **wirklich** aus dem Stamm
    entfernt;
  - **schon einmal bestellt oder geliefert** → der Artikel wird
    **ausgeblendet**, nicht entfernt, und die Rückmeldung sagt warum.
  Ein wirklich gelöschter Artikel risse sonst eine Lücke in Verlauf und
  Vorbelegung: Dort stünde nur noch seine Nummer.

- **F2 Rückfrage vor dem Löschen.** Kein natives `confirm` oder `prompt`
  (Konstitution 6), sondern der Dialog des jeweiligen Moduls. Die
  Rückfrage nennt Nummer und Bezeichnung des Artikels und sagt, dass
  frühere Bestellungen unberührt bleiben.

- **F3 Abbrechen heißt abbrechen.** Wird die Rückfrage abgebrochen, geht
  **kein** Aufruf an den Server.

- **F4 Serverentscheid, nicht Cliententscheid.** Ob gelöscht oder
  ausgeblendet wird, entscheidet allein der Server. Der Kiosk kennt die
  vollständige Bestellhistorie nicht und dürfte sie nicht raten.

- **F5 Einheitliche Schnittstelle.** Jedes Modul beantwortet
  `DELETE /api/<modul>-artikel` mit der Kennung des Artikels als
  **Query-Parameter** (kein Rumpf — er ist bei DELETE nicht überall
  zuverlässig). Die Antwort trägt:
  - `success`, `meldung` (fertiger Satz für die Rückmeldung),
  - `ausgeblendet` (`true` = nur ausgeblendet, `false` = entfernt),
  - den **vollständigen neuen Katalog**, damit die Liste ohne zweiten
    Aufruf stimmt.

- **F6 Belegt heißt belegt.** Als „schon bestellt" gilt ein Artikel,
  sobald **eine** dieser Quellen ihn kennt: die Zähler im Stamm
  (`bestellt_in`, `haeufigkeit`, `lieferungen`), eine gespeicherte
  Bestellung oder die aus Rechnungen gewonnene Lieferhistorie.

- **F7 Ein bereits ausgeblendeter, belegter Artikel** bleibt beim
  Löschversuch stehen; die Meldung sagt das, ohne einen Fehler zu melden.

- **F8 Schreibschutz.** `DELETE` läuft wie `POST` und `PATCH` durch
  `admin_auth_guard`.

- **F9 Fehler lassen die Liste stehen.** Antwortet der Server mit einem
  Fehler, bleibt der Artikel in der Liste und die Meldung erscheint als
  Hinweis.

## Test Cases

| Kennung | Vorgang | Erwartung |
|---------|---------|-----------|
| TC-A01 | Artikelstamm eines Moduls öffnen | jede Zeile trägt „Löschen" |
| TC-A02 | „Löschen" antippen | Rückfrage mit Nummer und Bezeichnung, noch **kein** Serveraufruf |
| TC-A03 | Rückfrage abbrechen | kein Aufruf, Artikel bleibt |
| TC-A04 | Nie bestellten Artikel löschen | `DELETE …-artikel?…`, Zeile verschwindet, Meldung „… wurde gelöscht." |
| TC-A05 | Bestellten Artikel löschen | Zeile bleibt, ist nun ausgeblendet, Meldung nennt den Grund |
| TC-A06 | Server antwortet mit Fehler | Artikel bleibt, Hinweis erscheint |
| TC-A07 | Server: unbekannte Kennung | 404 |
| TC-A08 | Server: Kennung fehlt | 400 |
| TC-A09 | Server: ohne Anmeldung | wie `POST` abgewiesen |
| TC-A10 | Bereits ausgeblendeter, bestellter Artikel | bleibt ausgeblendet, Meldung ohne Fehler |
