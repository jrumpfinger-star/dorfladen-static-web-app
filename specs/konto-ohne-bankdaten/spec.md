# Konto ohne Bankverbindung

**Drei Meldungen aus dem Laden, in dieser Reihenfolge:**

1. „Ich möchte, dass die Kachel-Logik so bestehen bleibt, da wir viele
   Ad-hoc-User haben. Für die ist ein Konto zu viel Aufwand."
2. „Es sollte aber die Möglichkeit geben, ohne den Bestellshop das Konto
   anzulegen, aber IBAN ist dann kein Pflichtfeld. Wenn jemand dann
   eingeloggt ist, kann der über Meine Bestellungen seine Bestellungen
   einsehen."
3. „Dies muss auch funktionieren, wenn Bestellshop nicht aktiv ist."

Die dritte Meldung hat die Lösung umgeworfen — dazu unten mehr.

## Ausgangslage

Die Registrierung verlangte **alles**: Telefon, vollständige Adresse,
IBAN, Kontoinhaber und die Zustimmung zum SEPA-Lastschriftmandat. Das ist
richtig für jemanden, der im Shop einkauft und per Einzug zahlt. Für
jemanden, der nur sehen will, ob seine Dampfnudeln bestätigt sind, ist es
eine Zumutung.

Gleichzeitig soll niemand gezwungen werden: Die Kachel auf der Startseite
findet Bestellungen weiterhin über die **Geräte-Kennung**, ganz ohne
Konto (Spec `meine-bestellungen-geraete`, F4). Das Konto ist ein
Angebot, keine Voraussetzung.

## Der Umweg, der sich als Sackgasse erwies

Zuerst lag die Umschaltung im Registrierungsformular von
[shop.html](../../static-site/shop.html): oben eine Auswahl „Wofür
möchten Sie ein Konto?", darunter die Bankfelder, die bei „nur ansehen"
verschwinden.

Dann kam die dritte Meldung. Nachgemessen:

```
GET /api/cms-config → feature_flags.orders = false
```

Der Bestellshop ist **abgeschaltet**. Die Startseite blendet jeden Link
dorthin aus (`.feature-orders-link`). Die Registrierung lag damit hinter
einer Tür, die niemand sieht — die Funktion wäre gebaut und unerreichbar
gewesen.

**Deshalb gibt es jetzt eine eigene Seite**
[mein-konto.html](../../static-site/mein-konto.html), die von keinem
Schalter abhängt. Die Umschaltung in `shop.html` bleibt zusätzlich
bestehen: Wer den Shop einmal einschaltet, soll dort dieselbe Wahl haben.

## Anforderungen

- **K1** Ein Konto lässt sich **ohne** Bankverbindung anlegen. Pflicht
  sind nur Vorname, Nachname, E-Mail, Passwort sowie die Zustimmung zu
  Datenschutz und AGB.
- **K2** Dabei entsteht **kein** SEPA-Lastschriftmandat — weder ein
  Mandats-Datensatz noch eine Mandatsreferenz noch der Status „aktiv".
- **K3** Die Absicht muss **ausdrücklich** in der Anfrage stehen
  (`ohne_bankdaten: true`). Eine bloß fehlende IBAN reicht nicht.
- **K4** Das vollständige Konto mit Lastschrift bleibt unverändert.
- **K5** Der Weg zum Konto funktioniert, **auch wenn der Bestellshop
  abgeschaltet ist**.
- **K6** Wer angemeldet ist, sieht dort seine eigenen Bestellungen.
- **K7** Die Kachel auf der Startseite bleibt **unverändert** — in
  Aussehen, Größe und Verhalten.

## Warum K2 der heikelste Punkt ist

Ein SEPA-Mandat ohne IBAN wäre kein leeres Feld, sondern ein **Papier
über nichts**: Es trüge eine Mandatsreferenz, das Datum, den Status
„aktiv" und den Vermerk `"unterschrift_digital": true` samt IP-Adresse
und Zeitpunkt. Damit behauptete der Datensatz eine Einzugsermächtigung,
die niemand erteilt hat. Der maskierte IBAN-Eintrag sähe obendrein
kurios aus — schlicht `"****"`.

Gleiches gilt für das verschlüsselte IBAN-Feld: `_encrypt_iban("")`
lieferte vorher ein Kryptogramm des leeren Textes — einen Wert, der „da
ist" und beim Entschlüsseln nichts ergibt. Jede spätere Prüfung „hat
dieser Kunde eine IBAN?" müsste erst entschlüsseln, statt hinsehen zu
können. Ohne IBAN bleibt das Feld jetzt leer.

## Warum K3 einen Schalter braucht

Naheliegend wäre: „Keine IBAN übermittelt? Dann eben ohne." Das wäre
falsch. Im Shop-Formular kann die IBAN unterwegs verlorengehen — ein
Feld, das beim Umschalten geleert wird, ein abgebrochener Versuch. Aus
einem solchen Versehen dürfte niemals stillschweigend ein Konto ohne
Mandat werden. Die Absicht muss aus der Anfrage hervorgehen.

Aus demselben Grund gehen die Bankfelder bei „nur ansehen" **gar nicht
erst mit**: Wer erst das volle Formular ausfüllt und dann umschaltet,
hätte sonst ein Mandat erzeugt, das er gerade abgewählt hat.

Umgekehrt gilt: Eine **freiwillig** angegebene, aber unbrauchbare IBAN
wird weiterhin bemängelt (`TC-KB-08`). Das ist ein Tippfehler und keine
Entscheidung gegen die Lastschrift — sie stillschweigend zu verwerfen
wäre die schlechtere Antwort.

## Was ein Konto ohne Bankverbindung im Shop bedeutet

Nichts Schlimmes: `shop-order` liest die IBAN ohnehin und schreibt

```python
zahlungsart = "Lastschrift" if iban_masked else "Bar bei Abholung"
```

Ein solches Konto kann also einkaufen — es zahlt bar bei Abholung. Es
war keine Sperre nötig.

## K7: ein Hinweis, der wieder verschwand

Unter der Kachel stand kurzzeitig „Auch auf anderen Geräten sehen?".
Gemeint war der Moment, in dem der Gedanke naheliegt — man sieht seine
Bestellung und hätte sie gern auch am Rechner.

**TC-K02 hat das verhindert, und zwar zu Recht:** Die Kachel darf
höchstens 140 px hoch sein; die zusätzliche Zeile sprengte das auf
**allen vier** Breiten. Die Meldung aus dem Laden sagte dasselbe — „Die
Kachel-Logik soll bestehen bleiben."

Der Weg zum Konto steht deshalb in der **Fußzeile**: immer da, stört
niemanden, hängt an keinem Schalter.

## Testfälle

### Server — [tests/test_konto_ohne_bank.py](../../tests/test_konto_ohne_bank.py)

| ID | Prüft | Erwartung |
|----|-------|-----------|
| TC-KB-01 | K1 | Anlegen ohne Bankverbindung wird angenommen |
| TC-KB-02 | K2 | kein Mandat, keine Referenz, kein Status „aktiv", leeres IBAN-Feld |
| TC-KB-03 | K1 | Name und Adresse stimmen, Passwort ist gehasht, Adresse ist unbestätigt |
| TC-KB-04 | K1 | Datenschutz und AGB bleiben Pflicht |
| TC-KB-05 | K1 | Name, Passwortlänge und E-Mail-Form bleiben Pflicht |
| TC-KB-06 | K3 | **ohne** den Schalter wird die fehlende IBAN weiterhin bemängelt |
| TC-KB-07 | K4 | das volle Konto erzeugt weiterhin ein Mandat, IBAN verschlüsselt |
| TC-KB-08 | K3 | freiwillig angegebene, unbrauchbare IBAN wird bemängelt |

### Anzeige — [tests/mein-konto.spec.js](../../tests/mein-konto.spec.js)

| ID | Prüft | Erwartung |
|----|-------|-----------|
| TC-MK-01 | K5 | die Seite trägt sich selbst, auch bei `orders = false` |
| TC-MK-02 | K1/K3 | gesendet wird `ohne_bankdaten`, ohne IBAN, ohne SEPA |
| TC-MK-03 | K1 | im Formular steht **kein** Bankfeld |
| TC-MK-04 | K1 | fehlende Zustimmung wird verständlich gemeldet |
| TC-MK-05 | — | zwei verschiedene Passwörter werden bemerkt, nichts wird gesendet |
| TC-MK-06 | K6 | nach dem Anmelden stehen die eigenen Bestellungen da |
| TC-MK-07 | — | die Abfrage trägt das Anmeldezeichen, **nicht** die Adresse |
| TC-MK-08 | — | falsches Passwort wird gemeldet, nichts wird angezeigt |
| TC-MK-09 | — | ohne Bestellung steht ein Satz da, nicht nichts |
| TC-MK-10 | — | Abmelden räumt das Anmeldezeichen weg |
| TC-MK-11 | — | kein waagerechtes Rollen |
| TC-MK-12 | K1 | im Shop-Formular sind die Bankfelder **beim Öffnen** schon weg |
| TC-MK-13 | K4 | Umschalten auf „einkaufen" bringt sie zurück |

### Ein Fehler, den TC-MK-12 gefunden hat

Die Umschaltung hing zuerst **nur** am `change`-Ereignis. Öffnete man
das Formular, war „nur ansehen" vorgewählt — die Bankfelder standen
aber sichtbar da. Ein Kunde hätte IBAN und Kontoinhaber ausgefüllt, und
gesendet worden wären sie trotzdem nicht (K3). Er hätte sich zu Recht
gewundert.

Gefunden wurde das nicht im Test, sondern beim Nachzählen: `grep` fand
`regZweckAnwenden()` genau **zweimal** — Definition und `change`-Handler.
Ein Aufruf beim Öffnen fehlte. Der Fall hält es jetzt fest.

### Unverändert — [tests/mittagstisch-kachel.spec.js](../../tests/mittagstisch-kachel.spec.js)

**TC-K02** ist der Wächter für K7 und hat seinen Wert bereits bewiesen:
Er hat den Hinweis unter der Kachel gestoppt, bevor er ausgeliefert
wurde.

## Gegenprobe

| Rücknahme | Ergebnis |
|---|---|
| Mandat auch ohne IBAN erzeugen | **TC-KB-02** fällt — der Kern von K2 |
| `ohne_bankdaten` ignorieren und „IBAN leer = egal" annehmen | **TC-KB-06** fällt |
| Bankfelder bei „nur ansehen" doch mitschicken | **TC-MK-02** fällt |
| Registrierung wieder nur in `shop.html` | **TC-MK-01** fällt — die Seite gibt es dann nicht |
| Umschaltung nur am `change`-Ereignis, kein Aufruf beim Öffnen | **TC-MK-12** fällt (nachgestellt) |
| Hinweis unter der Kachel wieder einbauen | **TC-K02** fällt auf allen vier Breiten (nachgestellt) |
