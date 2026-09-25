# Bestellkopie an den Laden

## Anlass

Rückmeldung aus dem Laden: „Warum erscheinen die gesendeten Mails nicht im
Gesendet-Postfach von info@dorfladen-oberornau.de?"

## Was tatsächlich passiert

Der Versand läuft über Microsoft Graph in `api/shop-notify/__init__.py`:

```
POST https://graph.microsoft.com/v1.0/users/{mailbox}/sendMail
```

Die Kopie in „Gesendet" legt Graph **im Postfach aus dieser Adresse** ab.
Dort stand `info@dorfladenoberornau.onmicrosoft.com` — das technische
Tenant-Postfach. `info@dorfladen-oberornau.de` war lediglich als
`replyTo` eingetragen, und eine Antwortadresse hat mit dem
Absenderpostfach nichts zu tun. Die Kopien lagen also seit jeher in einem
Postfach, in das niemand schaut.

## Warum nicht einfach aus dem .de-Postfach senden

Naheliegend, aber **nicht möglich**. Live gemessen: Wird `mailbox` auf
`info@dorfladen-oberornau.de` gesetzt, antwortet Graph mit

```
404 ErrorInvalidUser – The requested user 'info@dorfladen-oberornau.de' is invalid.
```

und es geht **gar keine** Mail mehr raus (8 von 8 Sendungen gescheitert).
Im Tenant existiert unter dieser Adresse **kein Postfach**, das Graph
auflösen könnte. Eine Umstellung setzt voraus, dass die Domäne im Tenant
verifiziert und dort ein echtes Postfach angelegt wird.

Wichtig für das Verständnis: Diese Einschränkung gilt nur für die
**Absenderrolle**. Als **Empfänger** darf jede beliebige Adresse der Welt
eintragen sein — dafür muss im Tenant nichts eingerichtet sein.

## Nachtrag: Die Bestellung selbst prallte ab

Aus dem Laden kam ein Unzustellbarkeitsbericht zu einer
Metzger-Bestellung:

```
Ihre Nachricht an info@dorfladen-oberornau.de konnte nicht zugestellt werden.
info wurde nicht in dorfladen-oberornau.de gefunden,
oder das Postfach ist nicht verfügbar.
```

Aus der Live-Konfiguration in Dataverse ausgelesen:

| Schlüssel | Wert |
|---|---|
| `metzger_config.empfaenger` | `info@dorfladen-oberornau.de` |
| `getraenke_config.empfaenger` | `info@dorfladen-oberornau.de` |
| `shop_kontakt.email` | `info@dorfladen-oberornau.de` |
| `shop_kontakt.kopie_an` | nicht gesetzt → fällt auf `email` zurück |
| `shop_kontakt.mailbox` | `info@dorfladenoberornau.onmicrosoft.com` |

**Damit ist der Bericht kein Kopie-Problem, sondern ein Bestellproblem.**
Der Empfänger war selbst die Ladenadresse. Und weil F4 keine Kopie an
denselben Empfänger schickt, gab es auch keinen Ersatzweg — die
Bestellung ging restlos verloren, während der Kiosk sie als „gesendet"
führte.

Bemerkenswert: `empfaenger_name` steht weiterhin auf
`Test (Metzger-Bestellung)`, die Adresse daneben aber nicht mehr auf der
Testadresse. Der Name führt also in die Irre.

### Ein Tippfehler ist ausgeschlossen

Naheliegender Verdacht, deshalb geprüft:

| Feld | Wert |
|---|---|
| `mailbox` | `info@dorfladenoberornau.onmicrosoft.com` |
| `email` | `info@dorfladen-oberornau.de` — 27 Zeichen, zeichengenau, keine Zeichen außerhalb ASCII |
| `kopie_an` | leer → Rückfall auf `email`, wie in F3 vorgesehen |

> **Korrektur einer früheren Annahme.** Hier stand zwischenzeitlich, die
> Bestellung sei „eine Mail mit zwei Empfängern (An: Testadresse, Kopie:
> Laden)" gewesen — einer habe angenommen, einer abgelehnt. Das direkte
> Auslesen von `metzger_config` widerlegt das: Der Empfänger **ist** die
> Ladenadresse, also gab es nach F4 gar keine zweite Adresse. Die
> Annahme stützte sich auf den Vorgabewert im Code, nicht auf den
> tatsächlich gespeicherten Wert.

### Warum die eine Adresse geht und die andere nicht

Die naheliegende Frage: `jrumpfinger@t-online.de` und
`info@dorfladen-oberornau.de` sind **beide** fremde Postfächer. Warum
scheitert nur die zweite?

Weil „fremd" für Exchange Online nicht gleich „fremd" ist. Gemessen:

| Prüfung | Ergebnis |
|---|---|
| Graph `sendMail` → `jrumpfinger@t-online.de` | **HTTP 202**, angenommen |
| Graph `sendMail` → `info@dorfladen-oberornau.de` | **HTTP 202**, angenommen |

Der Versandweg ist für beide gesund; der Unterschied entsteht erst
**danach**, bei der Zustellentscheidung von Exchange Online:

- `t-online.de` ist für den Tenant eindeutig fremd → Exchange schlägt den
  MX nach und liefert nach außen. Kommt an.
- `dorfladen-oberornau.de` trägt den Namen des eigenen Ladens. Ist diese
  Domain im Tenant als **Akzeptierte Domäne vom Typ „Autoritativ"**
  eingetragen, gilt für Exchange: „Für diese Domäne bin ich selbst
  zuständig." Exchange sucht dann ein **lokales** Postfach, findet keins
  (das echte liegt bei IONOS) und weist ab — **ohne den MX überhaupt zu
  fragen**. Genau dieses Verhalten heißt bei Microsoft *Directory-Based
  Edge Blocking*.

Das erklärt den Wortlaut des Berichts: „info wurde nicht **in**
dorfladen-oberornau.de gefunden" ist die Aussage eines Servers, der sich
für die Domäne für zuständig hält.

### Was noch offen ist

Zwei Erklärungen passen auf den Befund; sie zu trennen erfordert einen
Blick, den das Projekt selbst nicht hat (die App-Registrierung bekommt
auf `/domains` und auf das Postfach jeweils **403**):

| | Erklärung A | Erklärung B |
|---|---|---|
| Ursache | Domäne im Tenant, Typ „Autoritativ" | Domäne nicht im Tenant, **IONOS** weist ab |
| Mail verlässt Microsoft | nein | ja |
| Passt zum Wortlaut des Berichts | sehr gut | möglich |
| Gegenargument | `getuserrealm` meldet `Unknown` | müsste erklären, warum IONOS ablehnt |

**Der entscheidende Beleg** steht im Bericht selbst unter
„Diagnoseinformationen für Administratoren": Nennt er als abweisenden
Server einen `*.outlook.com`/`*.protection.outlook.com`, gilt A. Nennt er
`mx00.ionos.de`, gilt B.

Ebenso einfach und ohne Administratorrechte zu prüfen: **Von einer
laden-fremden Adresse** (z. B. dem privaten Postfach) eine Mail an
`info@dorfladen-oberornau.de` schicken.

- **Kommt sie an** → Das Postfach bei IONOS ist gesund, und nur der
  eigene Tenant kann nicht dorthin zustellen. Das ist **Erklärung A**.
- **Kommt sie nicht an** → Das Postfach selbst ist das Problem,
  **Erklärung B**.

Dieser Test wiegt schwer, weil er die scheinbare Widersprüchlichkeit
auflöst: Im Laden wird an dieser Adresse Post empfangen — sie „existiert"
also. Beides zugleich ist nur möglich, wenn eingehende Post über den MX
zu IONOS läuft, während Exchange Online für eigene Absender einen anderen
Weg wählt. Genau das beschreibt Erklärung A.

Nachgemessene Randbedingungen (DNS und Microsoft-Anmeldedienst):

| Befund | Ergebnis |
|---|---|
| MX von `dorfladen-oberornau.de` | `mx00.ionos.de`, `mx01.ionos.de` |
| SPF | `v=spf1 include:_spf-eu.ionos.com ~all` |
| TXT | enthält `MS=5016065` — jemand hat die Domäne einmal bei Microsoft hinterlegt |
| `getuserrealm` für die `.de`-Domäne | `NameSpaceType=Unknown` |
| `getuserrealm` für `…onmicrosoft.com` (Kontrollprobe) | `NameSpaceType=Managed` |

### Sofortmaßnahme: der Verlust ist gestoppt

Solange die Ursache nicht behoben ist, gingen Bestellungen **restlos
verloren**: Der Empfänger war die abprallende Adresse, und weil F4 keine
Kopie an denselben Empfänger schickt, gab es keinen Ersatzweg — der
Kiosk meldete trotzdem „gesendet".

Deshalb zeigen die Bestellziele jetzt auf das technische Tenant-Postfach
`info@dorfladenoberornau.onmicrosoft.com`. Das ist **belegbar
erreichbar**: Genau dort landen die Unzustellbarkeitsberichte, die im
Laden in Outlook gelesen werden.

| Schlüssel | vorher | jetzt |
|---|---|---|
| `shop_kontakt.kopie_an` | nicht gesetzt → `email` | `info@dorfladenoberornau.onmicrosoft.com` |
| `metzger_config.empfaenger` | `info@dorfladen-oberornau.de` | `info@dorfladenoberornau.onmicrosoft.com` |
| `getraenke_config.empfaenger` | `info@dorfladen-oberornau.de` | `info@dorfladenoberornau.onmicrosoft.com` |

Über den **echten** Versandweg nachgewiesen (`shop-notify.send_email`
mit den Kontaktdaten aus Dataverse, echter Graph-Versand): Ergebnis
`ERFOLG – sent`.

`reply_to` bleibt bewusst auf `info@dorfladen-oberornau.de`: Antworten
von Lieferanten kommen von **außen** und laufen damit über den MX zu
IONOS — dieser Weg ist von der Störung nicht betroffen.

Die Werte sind im CMS unter *Kontaktdaten* und im Kiosk unter
*Einstellungen* jederzeit zurückzustellen. Die Kontaktdaten werden
höchstens 5 Minuten zwischengespeichert (F6), danach greift eine
Änderung von selbst.

### Nachtrag 25.09.2026: Die Notmaßnahme war nur halb zurückgestellt

Rückmeldung aus dem Laden: „Warum geht die Kopie immer noch an
`info@dorfladenoberornau.onmicrosoft.com`?"

Live aus Dataverse ausgelesen — und der Befund ist ein schlichtes
Überbleibsel:

| Schlüssel | Stand 25.09.2026 |
|---|---|
| `metzger_config.empfaenger` | `info@metzgerei-mair.de` ✔ zurückgestellt |
| `getraenke_config.empfaenger` | `bestellung@getraenke-kratzer.de` ✔ zurückgestellt |
| `baecker_config.*.empfaenger` | echte Bäckereiadressen ✔ |
| `shop_kontakt.kopie_an` | `info@dorfladenoberornau.onmicrosoft.com` ✘ **vergessen** |

Die drei Bestellziele zeigen längst wieder auf die Lieferanten; nur das
vierte Feld der Tabelle oben blieb stehen. Deshalb war die Kopie als
einziger Wert noch auf dem Notbehelf.

**Erklärung A gilt damit als ausgeschlossen** — mit zwei unabhängigen
Verfahren nachgemessen:

| Prüfung | `dorfladen-oberornau.de` | `…onmicrosoft.com` (Kontrolle) |
|---|---|---|
| `getuserrealm` | `NameSpaceType=Unknown` | `Managed` |
| `/v2.0/.well-known/openid-configuration` | **HTTP 400** | HTTP 200 → Tenant `acfaedd4-…` |

Eine Domäne, die in keinem Tenant liegt, kann dort auch keine
*Akzeptierte Domäne* sein. Exchange schlägt also den MX nach und liefert
nach außen an IONOS.

> **Korrektur einer eigenen Fehlannahme.** Hier stand zwischenzeitlich,
> daraus folge Erklärung B: Das Postfach bei IONOS existiere nicht. Der
> Laden hat das widerlegt — an `info@dorfladen-oberornau.de` **kommt von
> anderen Absendern Post an**, es ist ein echtes, gesundes Postfach. Die
> Annahme stützte sich allein auf den Wortlaut des alten Rückläufers,
> nicht auf eine Messung.

### Auflösung: Die Zustellung läuft — sie ist nur langsam

Die Sonden kamen an. Belegt durch die Ansicht im Postfach:

| Sonde | Beleg |
|---|---|
| `Zustelltest Bestellkopie 20:15:50` | liegt im Postfach, `An: info@dorfladen-oberornau.de` |
| `SONDE 1 Kontrolle 20:27:14` | `To: Josef Rumpfinger <jrumpfinger@t-online.de>`, **`Cc: You`** |

Die zweite Zeile ist der harte Beweis: Der An-Empfänger wird
ausgeschrieben, der Kopie-Empfänger dagegen als *You* aufgelöst. Das
gelingt dem Mailprogramm nur, wenn das gelesene Postfach selbst der
Kopie-Empfänger ist — also `info@dorfladen-oberornau.de`.

> **Zweite Korrektur einer eigenen Fehlannahme.** Um 20:25 lautete die
> Rückmeldung „kommt nicht an", und ich habe daraus geschlossen, die
> Adresse sei unzustellbar, und den Wert vorsorglich zurückgestellt. Das
> war falsch: Die Mail von 20:15:50 war zu diesem Zeitpunkt lediglich
> **noch unterwegs**. Eine Abwesenheit nach neun Minuten ist kein
> Messwert — bei einem fremden Absender ist eine Verzögerung normal
> (Graue Liste: Der erste Zustellversuch eines unbekannten Absenders
> wird planmäßig abgewiesen und erst beim Wiederholen angenommen).
>
> **Lehre:** „Ist noch nicht da" und „kommt nicht an" sind zwei
> verschiedene Aussagen. Für die zweite braucht es entweder einen
> Rückläufer oder eine Wartezeit jenseits der üblichen Wiederholung.

Damit sind **alle drei** Erklärungen vom Tisch: Exchange beansprucht die
Domäne nicht (A), das Postfach existiert und ist gesund (B), und ein
Filter hält nichts zurück (C). Es gab schlicht nichts zu beheben.

### Stand des Werts

`shop_kontakt.kopie_an` = `info@dorfladen-oberornau.de`.

Zweifach gegengelesen:

| Prüfung | Ergebnis |
|---|---|
| `shop-notify.get_contact_info()` + `_kopie_adresse()` (Live-Konfiguration) | `info@dorfladen-oberornau.de` |
| ausgelieferte API `GET /api/cms-config` | `info@dorfladen-oberornau.de` |

Änderbar im CMS unter *Kontaktdaten → Kopie an*; die Kontaktdaten werden
höchstens 5 Minuten gehalten (F6).

### Behebung der eigentlichen Ursache

> **Hinweis (25.09.2026):** Dieser Abschnitt ist **Geschichte**. Beide
> Erklärungen wurden inzwischen widerlegt (siehe „Auflösung" oben); die
> Zustellung an `info@dorfladen-oberornau.de` funktioniert. Der Abschnitt
> bleibt stehen, weil er den damaligen Erkenntnisstand dokumentiert.

**Bei Erklärung A** — Microsoft 365 Admin Center → *Einstellungen →
Domänen*: Ist `dorfladen-oberornau.de` dort gelistet, im Exchange Admin
Center unter *Nachrichtenfluss → Akzeptierte Domänen* den Typ auf
**„Internes Relay"** stellen. Dann liefert Exchange unbekannte Adressen
wieder über den MX nach außen an IONOS. Alternativ im Tenant ein echtes
Postfach für `info@` anlegen.

**Bei Erklärung B** — Postfach bei IONOS prüfen: Existiert es wirklich,
ist es voll, oder ist es nur eine Weiterleitung mit totem Ziel?

Ist die Ursache behoben, genügt es, die drei Werte oben wieder auf
`info@dorfladen-oberornau.de` zu stellen — im CMS und im Kiosk, ohne
Codeänderung.

**Folge für F1:** Die Kopie erfüllt ihren Zweck nur, wenn die Zieladresse
tatsächlich zustellbar ist. Ist sie es nicht, erzeugt jede
Lieferantenmail zusätzlich einen Unzustellbarkeitsbericht — und wenn sie
zugleich der einzige Empfänger ist, geht die Bestellung ersatzlos
verloren. Abschalten geht mit `aus` (F3).

**Lehre daraus:** Eine Zieladresse, die im Laden „ganz offensichtlich
existiert", muss für den **eigenen Tenant** noch lange nicht erreichbar
sein. Vor dem Eintragen einer Adresse in `empfaenger` oder `kopie_an`
gehört ein echter Zustellversuch aus genau diesem Versandweg dazu.

## Ein zweiter Fehler, der dabei aufflog

Die Kontaktdaten wurden pro Funktionsinstanz **unbegrenzt**
zwischengespeichert. Eine fehlerhafte Absenderangabe blieb dadurch
hängen, auch nachdem sie in Dataverse längst zurückgestellt war — der
Versand blieb bis zum nächsten Neustart tot. Nachgemessen: 8 von 8
Sendungen scheiterten weiter, obwohl der gespeicherte Wert wieder korrekt
war.

## Anforderungen

- **F1** Bestellungen an Lieferanten (Metzger, Bäcker, Getränke) gehen in
  Kopie (CC) an die Ladenadresse.
- **F2** Die Adresse kommt aus der Kontaktkonfiguration: `kopie_an`, sonst
  die allgemeine Ladenadresse `email`.
- **F3** Ein **leerer** `kopie_an`-Eintrag bedeutet „Ladenadresse
  verwenden", nicht „abschalten". Grund: Die CMS-Maske schreibt beim
  Speichern alle Felder zurück; ein nie gefülltes Feld wäre leer —
  einmal Speichern hätte die Kopie sonst stillschweigend abgeschaltet.
  Abschalten geht nur ausdrücklich mit dem Wert `aus`.
- **F4** Geht eine Mail ohnehin schon an die Ladenadresse, entfällt die
  Kopie. Sonst läge sie doppelt im Posteingang.
- **F5** Mails an Kundinnen und Kunden (Bestellbestätigung, abholbereit,
  storniert) bekommen **keine** Kopie. Sie würden den Posteingang fluten.
- **F6** Die Kontaktdaten werden nur **begrenzt** zwischengespeichert. Ein
  fehlerhafter Wert heilt sich nach Ablauf der Haltezeit von selbst,
  ohne Neustart.

## Testfälle

| Nr. | Fall | Erwartung |
|---|---|---|
| TC-K01 | Lieferantenmail mit `kopie_an_laden` | CC an die Ladenadresse |
| TC-K02 | Mail ohne Anforderung | **kein** `ccRecipients` |
| TC-K03 | Empfänger ist der Laden selbst | **keine** Kopie |
| TC-K04 | `kopie_an` gesetzt | sticht die allgemeine Adresse |
| TC-K05 | `kopie_an` leer | fällt auf die Ladenadresse zurück |
| TC-K05b | `kopie_an` = `aus` | **keine** Kopie |
| TC-K06 | Metzger-Bestellung, echter Versandweg | CC an den Laden |
| TC-K07 | Getränke-Bestellung, echter Versandweg | CC an den Laden |
| TC-K08 | Bäcker-Bestellung, echter Versandweg | CC an den Laden |
| TC-K09 | Haltezeit der Kontaktdaten | begrenzt, höchstens 15 min |
| TC-K10 | Abgelaufener Eintrag | wird verworfen und neu geladen |

Wächter: `tests/test_bestellkopie.py` — prüft den **echten** Versandweg
der drei Endpunkte, nicht nur ihren Quelltext. Graph-Anmeldung und HTTP
werden unterhalb ersetzt, sodass die Nutzlast sichtbar wird, die
tatsächlich an Graph ginge.

## Offener Punkt

Damit künftig wirklich aus `info@dorfladen-oberornau.de` gesendet wird
(und die Kopien dort im Ordner „Gesendet" liegen), sind zwei Schritte
außerhalb dieses Projekts nötig:

1. Domain `dorfladen-oberornau.de` im Microsoft-365-Tenant hinzufügen und
   verifizieren.
2. Dort ein Postfach `info@dorfladen-oberornau.de` anlegen und der
   App-Registrierung `Mail.Send` darauf einräumen.

Danach genügt es, im CMS unter Kontaktdaten das Feld **Postfach** auf
diese Adresse zu setzen — eine Codeänderung ist nicht nötig.
