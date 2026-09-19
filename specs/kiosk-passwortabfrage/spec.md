# Kiosk: dieselbe Passwortabfrage wie im CMS

## Ausgangslage

Aus dem Laden: *„Ich möchte die gleiche Passwortabfrage wie in CMS."*

Wer `dorfladen-oberornau.de/kiosk` in den Browser tippte, stand sofort
im Kiosk — ohne jede Abfrage. `cms.html` und `posten.html` haben je eine
Maske, der Kiosk als einziger nicht.

Warum das so war, ist in `specs/serverseitige-auth` dokumentiert: Die
Absicherung war als *faule* Anmeldung entworfen — die Seite offen, und
erst ein abgewiesener **Schreibversuch** (HTTP 401) hätte den
Passwortdialog aus `admin-auth.js` ausgelöst. Dieser Auslöser feuert nie,
weil `CMS_AUTH_ENFORCE` in der Produktion bewusst offen blieb (Aufgabe
T10, Begründung: „Kiosk ist operativ kritisch").

## Was diese Änderung leistet — und was nicht

**Sie ist ein Riegel vor der Bedienoberfläche, kein Schutz der Daten.**

Die Schnittstellen antworten weiterhin ohne Anmeldung: `/api/stammkunden`
und andere geben ihre Daten auf einen einfachen Abruf heraus. Daran
ändert eine Abfrage im Browser nichts — wer die Adresse der Schnittstelle
kennt, geht daran vorbei. Für das CMS gilt genau dasselbe.

Das Schließen dieser Lücke ist eine eigene Baustelle
(`specs/serverseitige-auth`, T10 und die lesenden Endpunkte). Diese Spec
erhebt den Anspruch ausdrücklich **nicht**.

Was sie leistet: Wer zufällig oder neugierig die Adresse öffnet, sieht
den Betrieb des Ladens nicht mehr.

## Entwurfsentscheidungen

**Derselbe Schlüssel wie im CMS.** Passwort und Sitzungsschlüssel
(`cms_auth_ok`) sind dieselben. Wer sich im CMS angemeldet hat, kommt
ohne erneute Eingabe in den Kiosk — und umgekehrt. Das entspricht der
Festlegung in `specs/serverseitige-auth`: „Admin-Seiten … nutzen
**denselben** Login/Token wie das CMS."

**Im Zweifel aufsperren, nicht aussperren.** Der Kiosk ist das
Arbeitsgerät im Laden. Ein blinder Kiosk wäre dort schlimmer als ein
offener. Deshalb wird bei jeder Störung freigegeben: kein hinterlegtes
Passwort, gesperrter Sitzungsspeicher, fehlende Web-Crypto.

**Gesperrt wird über eine Klasse am `<html>`-Element**, gesetzt von einem
Skript im Kopfbereich — nicht über eine Auszeichnung im Markup. Läuft das
Skript nicht, bleibt der Kiosk bedienbar. Die frühe Ausführung verhindert
zugleich, dass der Inhalt kurz aufblitzt.

**Die Maske liegt am Dateiende**, außerhalb der Rasterhülle, die das
Bauwerkzeug um Kopf, Reiter und Inhalt legt (Regel R4).

## Anforderungen

- **F1** Ohne Anmeldung zeigt der Kiosk eine Passwortmaske; der Betrieb
  dahinter ist verdeckt.
- **F2** Passwort und Sitzungsschlüssel sind dieselben wie im CMS. Eine
  Anmeldung im CMS öffnet auch den Kiosk und umgekehrt.
- **F3** Die Sperre greift **vor** dem ersten Zeichnen — der Inhalt
  blitzt nicht auf.
- **F4** Ein falsches Passwort meldet das verständlich, leert das Feld
  und bleibt gesperrt.
- **F5** Nach richtiger Eingabe ist der Kiosk frei und bleibt es für
  die Sitzung.
- **F6** Bei richtiger Eingabe wird zusätzlich das Admin-Token geholt
  (`dlAdminLogin`), damit schreibende Aufrufe später nicht erneut fragen.
  Schlägt das fehl, wird trotzdem aufgesperrt.
- **F7** Fehlt das hinterlegte Passwort, wird **nicht** ausgesperrt.
- **F8** Das Passwort steht an genau **einer** Stelle in der Quelldatei.
- **F9** Die Maske ist bedienbar: Eingabefeld, Auge zum Anzeigen,
  Eingabetaste, Antippgröße mindestens 44 px.

## Nachtrag: Neustart auf dem Kiosk-Tablett

Aus dem Laden: *„Ich habe Fully Kiosk installiert. Aber ich muss bei
Neustart immer das Passwort für Kiosk eingeben."*

Der erste Entwurf merkte sich die Anmeldung nur im **Sitzungsspeicher**
(`sessionStorage`) — so wie das CMS. Der wird beim Beenden des Browsers
geleert. Das CMS läuft auf einem Rechner und wird zwischendurch
geschlossen; ein Kiosk-Tablett unter Fully Kiosk wird dagegen **täglich
neu gestartet**. Damit stand jeden Morgen die Passwortabfrage.

Fully Kiosk behält den **dauerhaften** Speicher über Neustarts hinweg —
gelöscht wird er nur, wenn unter *Page & Content* die Einstellung
„Clear WebStorage" eingeschaltet ist.

- **F10** Die Anmeldung wird **dauerhaft** gemerkt
  (`localStorage`, Schlüssel `kiosk_auth_ok`) und übersteht einen
  Neustart. Der Sitzungsschlüssel des CMS (`cms_auth_ok`) gilt
  **zusätzlich** weiter, damit eine CMS-Anmeldung den Kiosk sofort
  öffnet.
- **F11** Es gibt einen Weg zurück: `kioskSperren()` löscht beide
  Einträge und lädt neu. Ohne das bliebe ein Gerät für immer offen.
  Ebenso wirkt eine Änderung des Passworts — die alte Prüfsumme passt
  dann nicht mehr, alle Geräte fragen erneut.

## Testfälle

| Nr. | Fall | Erwartung |
|---|---|---|
| TC-P01 | Kiosk ohne Anmeldung öffnen | Maske sichtbar, Betrieb verdeckt |
| TC-P02 | Falsches Passwort | Meldung, Feld geleert, bleibt gesperrt |
| TC-P03 | Richtiges Passwort | entsperrt, Kopfzeile wieder sichtbar |
| TC-P04 | Nach dem Entsperren neu laden | bleibt frei, keine Maske |
| TC-P05 | Sitzungsschlüssel aus dem CMS gesetzt | keine Maske |
| TC-P06 | Kein Passwort hinterlegt | keine Maske (Sicherung) |
| TC-P07 | Beim Laden | `html` trägt `kiosk-zu` von Anfang an |
| TC-P08 | Eingabetaste im Feld | meldet an wie der Knopf |
| TC-P09 | Antippgrößen | Feld und Knopf mindestens 44 px |
| TC-P10 | Quelldatei | Passwort-Prüfsumme genau einmal enthalten |
| TC-P11 | Anmelden, dann **Neustart** (Sitzung leer) | bleibt frei — kein erneutes Passwort |
| TC-P12 | Anmelden schreibt den dauerhaften Schlüssel | `kiosk_auth_ok` gesetzt |
| TC-P13 | `kioskSperren()` aufrufen | beide Einträge weg, Maske wieder da |

