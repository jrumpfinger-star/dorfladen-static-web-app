# Die Bestellliste ist kein öffentliches Verzeichnis

> **Status: vorbereitet, NICHT scharf geschaltet.**
> Der Code ist ausgeliefert und ändert vorerst **nichts**. Die
> Durchsetzung hängt an `CMS_AUTH_ENFORCE`, das in der Produktion
> bewusst nicht gesetzt ist (siehe „Warum nicht sofort scharf").

## Befund

Am 27.09.2026 gegen die Live-Seite gemessen — ohne Anmeldung, ohne
Token, ohne einen einzigen Parameter:

```
GET https://www.dorfladen-oberornau.de/api/lunch-order
→ HTTP 200, 200 Datensätze
   2026-09-29 | Josef Rumpfinger | jrumpfinger@t-online.de
   …
```

Namen, E-Mail-Adressen und Telefonnummern aller Mittagstisch-Kunden,
abrufbar von jedem Rechner der Welt.

## Wie er gefunden wurde

Nicht durch Suchen danach. Beim Absichern der E-Mail-Abfrage
(Spec `meine-bestellungen-geraete`) wurde der Filter geleert, wenn kein
Nachweis vorlag. Die Anfrage fiel dadurch bis in den **Listenzweig**
durch — und `TC-MG-02` zeigte statt einer leeren Liste:

```
FEHLER  TC-MG-02  keine fremden Bestellungen  -> bekam ['Anna', 'Bert', 'Gast']
```

Der Wächter prüfte nicht „keine fremde Bestellung", sondern verglich die
**Namen**. Hätte er nur auf „leer oder nicht" geschaut, wäre der Befund
unbemerkt geblieben.

> **Damit war die Absicherung kurzzeitig gefährlicher als das Problem:**
> Sie leerte den Filter und öffnete damit die Tür zur vollen Liste. Der
> Zweig endet seitdem ausdrücklich mit einer leeren Antwort.

## Eine überholte Entscheidung

Die Spec `serverseitige-auth` führt `lunch-order` unter **Non-Goals**:

> „Kunden-/Shop-Auth … `lunch-order` … wird von diesem Feature **nicht**
> verändert – diese haben ihre eigene Logik bzw. sind bewusst öffentlich."

Das stimmt für die **Kundenwege** am selben Endpunkt. Für den
**Listenzweig** stimmt es nicht: Er ist kein Kundenweg, sondern die
Arbeitsliste des Kiosks. Dass beide unter derselben Adresse liegen, hat
ihn in der damaligen Betrachtung mitgenommen.

Auch der Kiosk selbst sagt es im Quelltext:

> „Das ist ein Riegel vor der BEDIENOBERFLÄCHE, kein Schutz der Daten.
> Die Schnittstellen antworten weiterhin ohne Anmeldung … Wer das hier
> für Datenschutz hält, täuscht sich."

Der Befund bestätigt diesen Satz.

## Anforderungen

- **B1** Der Listenzweig verlangt das Kiosk-Token (`X-CMS-Auth`).
- **B2** Die drei **Kundenwege** am selben Endpunkt bleiben ohne
  Kiosk-Token erreichbar:
  `mode=my` mit Geräte-Kennung, `mode=my` mit Anmeldezeichen,
  `nr=…` mit E-Mail oder Kennung.
- **B3** Die Durchsetzung hängt an `CMS_AUTH_ENFORCE`. Solange es nicht
  gesetzt ist, ändert sich **nichts**.
- **B4** Der Kiosk schickt das Token bei der Listen-Abfrage mit — und
  **nur** dort, nicht bei den Kundenwegen.

## Warum B4 der entscheidende Punkt ist

Ohne diesen Nachweis darf `CMS_AUTH_ENFORCE` nicht eingeschaltet werden:
Die Liste bliebe leer, und im Laden wüsste niemand, warum.

Der erste Anlauf ist genau daran gescheitert. `TC-BL-A1` meldete:

```
2 von 2 Abfragen ohne Token, z. B. /api/lunch-order?datum=2026-09-27
```

Und zwar obwohl das Token im Speicher lag und `window.fetch` umhüllt
war. Die Ursache war die **Ladereihenfolge**: `admin-auth.js` stand am
Seitenende (Zeile 7458), der Kiosk holt seine Daten aber aus dem
Inline-Code weiter oben. Die ersten Abfragen liefen am Wrapper vorbei.

`admin-auth.js` steht jetzt im `<head>`, direkt nach `theme.js`. Die
Datei braucht kein DOM; ihr Passwort-Dialog entsteht erst bei Bedarf.

## Warum nicht sofort scharf

`CMS_AUTH_ENFORCE` bleibt in der Produktion **aus** — aus demselben
Grund, aus dem die Spec `serverseitige-auth` ihre Aufgabe **T10** offen
lässt:

> „Prod (`dorfladen-website`) aktivieren … bewusst **offen**, erst nach
> kurzem CMS-Check im Prod-Browser (Kiosk ist operativ kritisch)."

Dazu kommt ein zweiter Grund, der erst hier sichtbar wurde: Der Kiosk
merkt sich die Freigabe **dauerhaft** (`kiosk_auth_ok` im localStorage).
Wer ihn morgens öffnet, durchläuft die Passwortmaske **nicht** mehr — und
holt sich damit auch kein frisches Admin-Token. Ist das alte Token weg
(neues Gerät, geleerter Speicher), stünde der Laden vor einer leeren
Liste.

### Nachtrag 27.09.2026: ein eigener Schalter löst den Knoten

Der Schutz hing an einer Entscheidung, die viel zu groß war für ihn:
`CMS_AUTH_ENFORCE` gilt für **25 Endpunkte** auf einmal. Wer nur diese
eine Liste schließen wollte, hätte den gesamten Schreibbetrieb von CMS
und Kiosk mit umlegen müssen. Genau daran hing der Schutz fest — nicht
an der Technik, sondern an der Größe der Entscheidung.

**`LUNCH_LIST_ENFORCE=1` schließt allein diese Liste.** Schlägt etwas
fehl, betrifft es nichts sonst: kein CMS, keine Bäcker- oder
Metzgerbestellung, keine Bilder, keine Push-Nachrichten.

```
az staticwebapp appsettings set --name dorfladen-website \
   --subscription 89dd5962-2356-4f41-aa6b-ab6c0e054877 \
   --setting-names LUNCH_LIST_ENFORCE=1
```

Zurückstellen: derselbe Befehl mit leerem Wert.

`CMS_AUTH_ENFORCE` wirkt weiterhin mit — wer T10 später angeht, bekommt
beides. Die beiden sind ein **ODER**, keine Bedingung (`TC-BL-10`).

### Was dabei nicht passieren darf

Wer nur die Liste schließt, darf **niemandem die Kachel nehmen**.
`TC-BL-09` belegt das für beide Kundenwege: Geräte-Kennung und
Bestellnummer arbeiten weiter, auch wenn der Schalter gesetzt ist. Das
ist der Fall, der den Laden am nächsten Morgen träfe.

### Vorher zu prüfen

Am Ladentablett, ob `cms_auth_token` im Speicher liegt. Falls nicht,
genügt eine Anmeldung über die Passwortmaske — sie holt das Token mit.

**Entwarnung zum Risiko:** `admin-auth.js` fängt eine **401** ab und
zeigt den gewohnten Passwort-Dialog, statt still zu scheitern; danach
wird der Aufruf wiederholt. Ein fehlendes Token bedeutet also einen
zusätzlichen Handgriff, keinen Ausfall. Offen bleibt allein, ob der
Dialog unter Fully Kiosk sichtbar ist — das lässt sich nur am Gerät
prüfen.

### Reihenfolge zum Einschalten

1. Am Tablett prüfen, ob `cms_auth_token` vorhanden ist
2. `LUNCH_LIST_ENFORCE=1` setzen
3. Im Kiosk den Mittagstisch öffnen — die Liste muss stehen
4. Von außen `GET /api/lunch-order` — muss 401 geben
5. Die Kachel auf der Startseite prüfen

Ein kurzes Einschalten allein zum Ausprobieren wurde für
`CMS_AUTH_ENFORCE` erwogen und **verworfen** — mit dem eigenen Schalter
erübrigt sich das: Er ist klein genug, um ihn gefahrlos zu setzen und
wieder zurückzunehmen.

## Was noch nicht bewiesen ist

Die Sperre ist in Wächtern geprüft, aber **nicht in einer laufenden
Umgebung mit aktiver Durchsetzung**. Der Grund:

| Umgebung | `CMS_AUTH_ENFORCE` | Version |
|---|---|---|
| `dorfladen-website` (Produktion) | nicht gesetzt | 1.7.91 — hat den Code |
| `dorfladen-bestellsystem` (Test) | `1` | 1.6.29 — **hat den Code nicht** |

Die Testumgebung hätte die Durchsetzung, bekommt aber keine
Auslieferungen mehr. Die Produktion hat den Code, aber nicht die
Durchsetzung. Es gibt also zurzeit keinen Ort, an dem sich beides
zugleich beobachten ließe.

Ein kurzes Einschalten in der Produktion wurde erwogen und **verworfen**:
`CMS_AUTH_ENFORCE` ist ein gemeinsamer Schalter für **25 Endpunkte**
(alle mit `admin_auth_guard`). Ein Versuch „nur mal sehen" hätte den
gesamten Schreibbetrieb von CMS und Kiosk mit umgelegt — für einen
Erkenntnisgewinn, den die Wächter bereits liefern.

### Nachtrag 27.09.2026: Das Risiko ist kleiner als angenommen

Beim Nachlesen von
[admin-auth.js](../../static-site/js/admin-auth.js) zeigt sich: Auf eine
**401**-Antwort folgt **kein** leerer Bildschirm, sondern der gewohnte
Passwort-Dialog — und danach wird der Aufruf automatisch wiederholt:

```js
return call.then(function (resp) {
  if (resp.status !== 401) return resp;
  function askAndRetry(errMsg) { … }   // Passwort erfragen, dann erneut
```

Seit dem Einbau gilt dieser Rückfall auch für die Bestellliste
(`isLunchListe`). Fehlt am Ladentablett das Token, steht die Verkäuferin
also vor derselben Passwortmaske, die ohnehin vor dem Kiosk liegt — kein
Ausfall, sondern ein zusätzlicher Handgriff.

**Damit bleibt als Restrisiko nur**, ob der Dialog unter Fully Kiosk
sichtbar ist. Das lässt sich nur am Gerät selbst feststellen, und genau
deshalb bleibt T10 offen.

Betroffener Umfang, gezählt:

| Schutzart | Endpunkte |
|---|---|
| Schreiben (`admin_auth_guard`) | 25 — `angebote`, `baecker-order`, `cms-config`, `kalender`, `metzger-order`, `news-save`, `push-send`, `shop-admin`, `wochenplan` u. a. |
| Lesen (`read_auth_guard`) | 2 — `kalender`, `lunch-order` |

Das Token schicken heute: `admin-auth.js` (für alle mutierenden Aufrufe,
den Kalender und die Bestellliste), `kiosk-getraenke.js`,
`kiosk-metzger-bestellung.js`, `kiosk-kalender.js`.

**Empfohlene Reihenfolge**, wenn T10 angegangen wird:

1. Am Ladentablett prüfen, ob `cms_auth_token` im Speicher liegt.
   Falls nicht: einmal über die Passwortmaske anmelden.
2. `CMS_AUTH_ENFORCE=1` setzen.
3. Im Kiosk den Mittagstisch öffnen — die Liste muss stehen.
4. Von außen `GET /api/lunch-order` aufrufen — muss 401 geben.
5. Die Kachel auf der Startseite prüfen — muss weiter funktionieren.

Schlägt Schritt 3 fehl, genügt `CMS_AUTH_ENFORCE=` (leer) zum
Zurückstellen; die Wirkung tritt nach dem Neustart der Funktionen ein.

## Testfälle

### Server — [tests/test_bestellliste_schuetzen.py](../../tests/test_bestellliste_schuetzen.py)

| ID | Prüft | Erwartung |
|----|-------|-----------|
| TC-BL-01 | B1 | die blanke Liste → 401, keine Namen |
| TC-BL-02 | B1 | auch mit `datum=` → 401 |
| TC-BL-03 | B1 | mit gültigem Token → 200 und alle Sätze; falsches Token → 401 |
| TC-BL-04 | B2 | `mode=my` mit Geräte-Kennung **ohne** Token → die eigene Bestellung |
| TC-BL-05 | B2 | `mode=my` mit Anmeldezeichen **ohne** Token → die eigene Bestellung |
| TC-BL-06 | B2 | Statusseite `nr=` **ohne** Token → die Bestellung |
| TC-BL-07 | B3 | ohne `CMS_AUTH_ENFORCE` bleibt alles wie bisher |
| TC-BL-08 | B3 | `LUNCH_LIST_ENFORCE` **allein** schließt die Liste — mit Token kommt der Kiosk durch |
| TC-BL-09 | B2 | der eigene Schalter lässt **beide Kundenwege** in Ruhe |
| TC-BL-10 | B3 | beide Schalter einzeln und zusammen; ein unsinniger Wert sperrt **nicht** |

### Anzeige — [tests/kiosk-bestellliste-token.spec.js](../../tests/kiosk-bestellliste-token.spec.js)

| ID | Prüft | Erwartung |
|----|-------|-----------|
| TC-BL-A1 | B4 | die Listen-Abfrage trägt `X-CMS-Auth` |
| TC-BL-A2 | B4 | die Kundenwege tragen es **nicht** |
| TC-BL-A3 | B3 | ohne Token bleibt die Anzeige stehen, solange nicht erzwungen wird |

**TC-BL-04 bis 06 sind die wichtigsten Fälle dieser Spec.** Nicht die
Sperre ist das Risiko, sondern was sie mitreißen könnte: Fällt einer der
Kundenwege, merkt es der Laden am nächsten Morgen.

## Gegenprobe

| Rücknahme | Ergebnis |
|---|---|
| `read_auth_guard` im Listenzweig entfernen | **TC-BL-01** fällt — die Namen stehen wieder da |
| `admin-auth.js` zurück ans Seitenende | **TC-BL-A1** fällt mit „2 von 2 Abfragen ohne Token" (nachgestellt) |
| `mode=my` nicht ausnehmen | **TC-BL-A2** fällt — Kiosk-Token im Browser jeder Kundin |
| Guard vor die Kundenwege ziehen | **TC-BL-04/05/06** fallen |
| eigenen Schalter ignorieren (`return False`) | **TC-BL-08** fällt mit `war 200, Namen: ['Anna', 'Bert', 'Gast']` (nachgestellt) |
