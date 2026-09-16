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
Die Domain ist im M365-Tenant nicht eingerichtet; das dortige Postfach
liegt bei einem anderen Anbieter. Eine Umstellung setzt voraus, dass die
Domain im Tenant verifiziert und dort ein echtes Postfach angelegt wird.

Solange das nicht der Fall ist, geht stattdessen eine **Kopie per CC** an
die Ladenadresse. Sie landet im Posteingang und schließt die Lücke.

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
