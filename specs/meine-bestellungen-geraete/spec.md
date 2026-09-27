# Meine Mittagessen-Bestellungen auf allen Geräten

> **Status: umgesetzt am 27.09.2026** (Weg A — das vorhandene
> Kundenkonto). Der Code-Weg ohne Passwort (Weg B) ist **nicht** gebaut;
> er bleibt als Möglichkeit beschrieben.

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

## Entscheidungen

Die Punkte, die als `[NEEDS CLARIFICATION]` offen waren, sind hier
entschieden — mit der Begründung, die sie getragen hat.

### Weg A allein, ohne den Code-Weg

Weg A ist gebaut, Weg B nicht. Grund: A kostet fast nichts, weil das
Konto samt bestätigter Adresse bereits existiert, und schließt die
Sicherheitslücke gleich mit. B wäre ein eigenes Vorhaben mit Versand,
Ablauffrist und Sperre gegen Ausprobieren. Ob es gebraucht wird, zeigt
sich erst, wenn Kunden am Konto scheitern — vorher wäre es auf Verdacht
gebaut.

### Der Zeitraum bleibt unverändert

Die Kachel zeigt weiterhin Bestellungen **ab heute**. Ein Rückblick ist
ein eigener Wunsch und hat mit „auf mehreren Geräten" nichts zu tun.

### Altbestellungen werden nicht nachgezogen

Wer vor der Umstellung ohne Konto bestellt hat, sieht seine Bestellung
weiter über die Geräte-Kennung — auf dem Gerät, auf dem er bestellt hat.
Eine nachträgliche Zuordnung über die Adresse unterbliebe bewusst: Diese
Adressen wurden nie bestätigt, und genau darauf beruht der Schutz.

### Kein Übergang mit beiden Wegen

Gemessen wurde, ob ein Übergang nötig ist — und die Zahlen sagen nein:

| Erfassungstag | mit Geräte-Kennung | ohne |
|---|---|---|
| 26.09.2026 | 1 | 0 |
| 25.09.2026 | 4 | 0 |
| 24.09.2026 und früher | **0** | alle |

Ein klarer Schnitt: Seit der Reparatur in Spec `geraete-kennung` trägt
**jede** neue Bestellung eine Kennung. Die 188 älteren ohne Kennung
liegen sämtlich in der Vergangenheit — für den heutigen Tag war keine
einzige betroffen. Ein Übergang hätte die Lücke also nur länger
offengehalten, ohne jemanden zu schützen.

## Der teuerste Fund beim Bau

Die Absicherung hätte den Schaden beinahe **vergrößert**.

Wird `email_filter` geleert, weil kein Nachweis vorliegt, und ist auch
keine Geräte-Kennung da, fällt die Anfrage weiter — in den allgemeinen
Listenzweig, der für den Kiosk gedacht ist. Der antwortet mit **allen**
Bestellungen.

Aufgefallen ist das nur, weil `TC-MG-02` nicht bloß prüfte „keine fremde
Bestellung", sondern die zurückgegebenen Namen verglich: Statt einer
leeren Liste kamen `['Anna', 'Bert', 'Gast']`.

Deshalb endet der Zweig jetzt ausdrücklich mit einer leeren Antwort,
statt durchzufallen.

> **Nebenbefund, nicht behoben:** Derselbe Listenzweig ist auch von außen
> erreichbar. `GET /api/lunch-order` ohne jeden Parameter lieferte am
> 27.09.2026 **200 Bestellungen** mit Namen und E-Mail-Adressen. Das ist
> ein eigenständiger, älterer Mangel — der Kiosk selbst ist durch die
> Anmeldung der Seite geschützt, seine Schnittstelle aber nicht. Eine
> Korrektur muss den Kiosk-Zugang mit umbauen und gehört deshalb in ein
> eigenes Vorhaben mit eigener Spec. **Bis dahin bleibt die Liste offen.**

## Umsetzung

**Server** — [api/lunch-order/\_\_init\_\_.py](../../api/lunch-order/__init__.py):
`_konto_mail(req)` liest das Anmeldezeichen aus `X-Shop-Token`
(nicht `Authorization` — Azure Static Web Apps ersetzt diese Kopfzeile
unterwegs). Bei `mode=my` sticht die Adresse aus dem Zeichen den
Parameter; ohne Zeichen wird der Parameter verworfen.

**Gemeinsame Abfrage** —
[static-site/js/geraete-id.js](../../static-site/js/geraete-id.js):
`dlMeineBestellungen()`. Startseite und Tagesinfo hatten die Abfrage
vorher je als eigene Abschrift.

`dlGeraeteKennungLesen()` ist bewusst **nicht** `dlPushDeviceId()`: Jene
legt eine Kennung an, wenn keine da ist. Auf der Startseite, die bei
jedem Besuch fragt, bekäme so auch der eine Kennung verpasst, der nur den
Speiseplan liest (`TC-GK-14`).

**Vorbelegung** —
[static-site/mittagstisch-bestellen.html](../../static-site/mittagstisch-bestellen.html):
`loadCustomer()` setzt die Adresse des Kontos ein, aber nur in ein leeres
Feld.

## Testfälle

### Server — [tests/test_meine_bestellungen.py](../../tests/test_meine_bestellungen.py)

| ID | Prüft | Erwartung |
|----|-------|-----------|
| TC-MG-01 | F1/F2 | angemeldet → eigene Bestellung, ohne Adresse in der Adresszeile |
| TC-MG-02 | F3 | fremde Adresse **ohne** Nachweis → leere Liste |
| TC-MG-03 | F3 | gültiger Nachweis, **fremde** Adresse angefragt → eigene Bestellungen |
| TC-MG-04 | F4 | ohne Konto, nur Geräte-Kennung → Bestellung erscheint |
| TC-MG-06 | F6 | abgelaufen, fremd unterschrieben, Unsinn → jeweils leer |
| — | — | Konto sticht die Geräte-Kennung |
| — | — | die Statusseite (Bestellnummer + Adresse) bleibt unberührt |

### Anzeige — [tests/geraete-kennung.spec.js](../../tests/geraete-kennung.spec.js)

| ID | Prüft | Erwartung |
|----|-------|-----------|
| TC-GK-10 | F3 | die Adresse steht **nicht** mehr in der Adresszeile |
| TC-GK-13 | F1 | Angemeldete schicken `X-Shop-Token` mit |
| TC-GK-14 | — | die Startseite legt ungefragt **keine** Kennung an |

## Gegenprobe

Alle drei nachgestellt, jede fällt genau dort, wo sie soll:

| Rücknahme | Ergebnis |
|---|---|
| Parameter wieder ungeprüft übernehmen | **TC-MG-02** fällt mit `bekam ['Bert']` — die alte Lücke |
| `email_filter or konto_mail` statt `konto_mail` | **TC-MG-03** fällt mit `bekam ['Bert']` — Anna bekäme Berts Daten |
| Geräte-Kennung im Riegel vergessen | **TC-MG-04** fällt mit `bekam []` — jeder Kunde ohne Konto verlöre die Kachel |

Der mittlere ist der gefährlichste: Er sieht nach einer harmlosen
Vorsichtsmaßnahme aus („nimm den Parameter, sonst das Zeichen") und fällt
nur auf, wenn man mit **zwei verschiedenen** Konten prüft.
