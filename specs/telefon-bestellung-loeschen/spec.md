# Telefonbestellung löschen, nicht nur stornieren

**Meldung aus dem Laden:** „Telefonbestellung sollen auch gelöscht werden
können und nicht nur storniert."

## Ausgangslage

Für Mittagstisch-Bestellungen gab es nur den Weg über den Status:
Stornieren setzt `dl_status = 2`. Der Datensatz bleibt bestehen — er steht
weiter im Reiter „Storniert", zählt im Zähler mit und taucht in der
Statistik auf.

Für eine echte Absage ist das richtig: Man will später sehen, dass storniert
wurde und warum. Für eine **Fehleingabe** oder eine **Testbestellung** ist es
falsch — die gehört gar nicht erst in die Zahlen.

Bäcker, Metzger und Getränke kennen das Löschen bereits
(Spec `bestellung-loeschen`); beim Mittagstisch fehlte es.

## Anforderungen

- **R1** Telefonisch oder am Tresen aufgenommene Bestellungen (`quelle` 1
  und 2) lassen sich endgültig löschen.
- **R2** Offene Online-Bestellungen nicht. Der Kunde sieht sie in seiner
  eigenen Übersicht; ein stilles Verschwinden könnte er sich nicht
  erklären. Dort bleibt es beim Stornieren.
- **R3** Der Server stellt R2 selbst sicher und verlässt sich nicht darauf,
  dass der Kiosk den Knopf weglässt.
- **R4** Gelöscht wird erst nach einer Rückfrage, die Kunde und Gericht
  nennt und auf den Unterschied zum Stornieren hinweist.
- **R5** Das gilt in jedem Status — auch eine bereits stornierte
  Telefonbestellung lässt sich wegräumen (der gemeldete Fall).
- **R6** Eine bereits gelöschte Bestellung gilt als Erfolg, nicht als
  Fehler. Zwei Personen am selben Tablet sollen sich nicht gegenseitig
  Fehlermeldungen erzeugen.
- **R7** **Stornierte** Bestellungen lassen sich löschen, auch wenn sie
  online aufgegeben wurden (Nachtrag 27.09.2026, siehe unten).

## Nachtrag 27.09.2026: Stornierte auch online löschbar

**Meldung aus dem Laden:** „stornierte sollen auch gelöscht werden können."

Der Anlass ist im Bildschirmfoto eindeutig: Im Reiter *Storniert* steht
eine Karte mit den Kennzeichen `ONLINE` und `STORNIERT` — und ohne
Papierkorb. R2 sperrte sie, weil sie online aufgegeben wurde.

### Warum die alte Begründung hier nicht greift

R2 schützt ein berechtigtes Interesse: Der Kunde sieht seine Bestellung
im Kasten auf der Startseite. Verschwände sie dort ohne sein Zutun,
stünde er vor einem Rätsel.

Beim Stornieren ist dieser Punkt aber bereits erledigt — **die Absage
ist dem Kunden in jedem Fall bekannt**:

| Wer storniert | Woher der Kunde es weiß |
|---|---|
| der Kunde selbst | er hat es ausgelöst |
| der Laden | Push „Ihre Bestellung wurde leider storniert" |

Eine stornierte Bestellung ist damit ein abgeschlossener Vorgang. Sie
später aus der Liste zu nehmen, kann niemanden mehr überraschen —
anders als bei einer offenen Bestellung, die der Kunde noch erwartet.

**R2 gilt deshalb weiter, aber nur für Bestellungen, die noch offen
sind** (Status 0, 1 und 3).

### Was der Kunde dadurch verliert

Ehrlich benannt, denn kostenlos ist die Änderung nicht: Die Abfrage
`mode=my` zeigt stornierte Bestellungen bis zum Ende des Bestelltags
(siehe `api/lunch-order/__init__.py`, Statusfilter). Nach dem Löschen
fehlt dort der Eintrag — samt des daran hängenden Nachrichtenverlaufs.

Das ist vertretbar, weil das Löschen ein **bewusster Griff** der
Verkäuferin mit Rückfrage ist (R4) und nicht von selbst passiert. Wer
den Verlauf noch braucht, lässt die Karte einfach stehen.

Status 3 (abgeholt) bleibt bewusst gesperrt: Dort liegt der
Nachrichtenfaden, und der Kasten auf der Startseite ist der einzige Weg
dorthin zurück (Spec `mittagstisch-abgeholt-sichtbar`, F1).

### Ein Fallstrick, der dabei auffiel

Der Server las vor dem Löschen nur `dl_quelle,dl_bestellnummer,dl_name`.
Für die neue Regel braucht er `dl_status` — und **Dataverse liefert nur,
was im `$select` steht**. Der Testmock gab bis dahin stets alle
gespeicherten Felder zurück, unabhängig von der Abfrage. Ein vergessenes
`dl_status` im `$select` wäre damit grün durchgelaufen und erst im Laden
aufgefallen.

Der Mock wertet das `$select` jetzt aus (`TC-TL-S8`).

### Anzeige — [tests/mittagstisch-telefon-loeschen.spec.js](../../tests/mittagstisch-telefon-loeschen.spec.js)

| ID | Prüft | Erwartung |
|----|-------|-----------|
| TC-TL-01 | R1 | Telefon- und Tresen-Bestellungen tragen einen Papierkorb |
| TC-TL-02 | R2 | **offene** Online-Bestellungen tragen keinen |
| TC-TL-03 | R5 | auch die stornierte Telefonbestellung trägt einen |
| TC-TL-04 | R4 | erst Rückfrage mit dem Namen, dann genau ein `DELETE` auf die richtige Kennung |
| TC-TL-05 | R4 | „Abbrechen" löscht nichts |
| TC-TL-06 | — | der Klick klappt nicht nebenbei die Karte auf |
| TC-TL-07 | R7 | die **stornierte Online**-Bestellung trägt einen Papierkorb und lässt sich löschen |
| TC-TL-08 | R2 | die abgeholte Online-Bestellung trägt keinen — der Verlauf bleibt erreichbar |

### Server — [tests/test_bestellung_loeschen.py](../../tests/test_bestellung_loeschen.py)

| ID | Prüft | Erwartung |
|----|-------|-----------|
| TC-TL-S1 | R1 | `quelle = 1` → 200, Datensatz ist weg |
| TC-TL-S2 | R1 | `quelle = 2` → dasselbe |
| TC-TL-S3 | R3 | `quelle = 0`, **offen** → 403, nichts gelöscht, Begründung im Klartext |
| TC-TL-S4 | R6 | unbekannte Kennung → 200, nichts gelöscht |
| TC-TL-S5 | — | streikt Dataverse, wird kein Erfolg gemeldet |
| TC-TL-S6 | — | ohne Kennung wird nichts gelöscht (405) |
| TC-TL-S7 | R7 | `quelle = 0`, **storniert** → 200, Datensatz ist weg |
| TC-TL-S8 | R3/R7 | der Server fragt `dl_status` ausdrücklich ab — sonst entscheidet er blind |
| TC-TL-S9 | R2 | `quelle = 0`, **abgeholt** → 403; die Lockerung gilt nur für Storno |

## Umsetzung

**Server** —
[api/lunch-order/\_\_init\_\_.py](../../api/lunch-order/__init__.py):
neuer `DELETE`-Zweig. Er liest `dl_quelle` **und `dl_status`** und weist
offene Online-Bestellungen ab; `function.json` und die CORS-Kopfzeilen
kennen die Methode jetzt.

**Kiosk** —
[static-site/kiosk-klassisch.html](../../static-site/kiosk-klassisch.html):
Papierkorb in der Kopfzeile der Karte, bei `_istVorOrt(o)` **oder**
`o.status === 2`. `showDeleteDialog()` fragt über `dlConfirm` zurück,
`deleteOrder()` schickt das `DELETE`. `kiosk.html` und `kiosk-neu.html`
werden neu gebaut.

## Gegenprobe

- Erscheint der Papierkorb auch an **offenen** Online-Bestellungen, fällt
  **TC-TL-02**.
- Fehlt er an der **stornierten** Online-Bestellung, fällt **TC-TL-07**.
- Entfällt die Statusprüfung im Server und weist er Online wieder
  pauschal ab, fällt **TC-TL-S7** mit `war 403`.
- Fällt die Statusprüfung ganz weg, fällt **TC-TL-S3** mit `war 200`.
- Fehlt `dl_status` im `$select`, liefert der geschärfte Mock das Feld
  nicht mehr — der Server hält die Bestellung dann für offen und weist
  sie ab. Es fällt **TC-TL-S7** mit `war 403`, gefolgt von **TC-TL-S8**.
  Mit dem alten, alles zurückgebenden Mock wäre beides grün geblieben
  und der Fehler erst im Laden aufgefallen. (Beides nachgestellt.)
