# CMS-Aktion: Bild zum Strichcode auch von Hand holen

## Ausgangslage

Aus dem Laden, mit zwei Bildschirmfotos: *„Warum wird bei Bayerntaler
nicht das Originalbild aus SharePoint angezeigt?"* — daneben der
SharePoint-Ordner mit der Datei `2154807005.png`.

## Befund

Das Bild **ist da und ist erreichbar**. Live über den Server geholt:

```
GET /api/werbebilder?artnrs=2154807005&sharepoint=1
  → name = 2154807005.png, 437 × 437, das richtige Bayerntaler-Bild
```

Die Ursache liegt nicht bei SharePoint, sondern daran, **wann** das CMS
überhaupt zu laden versucht. `cmsLoadBildSharePoint()` läuft genau in
zwei Fällen:

1. wenn ein Artikel **aus der Vorschlagsliste** gewählt wird
2. wenn eine **bestehende** Aktion zum Bearbeiten geöffnet wird

„Bayerntaler" steht **nicht in der Preisliste** — nachgezählt: 0 von
2883 Artikeln, weder unter dem Namen noch unter dem Strichcode. Es gibt
also keinen Vorschlag zum Anklicken, Name und Strichcode werden von Hand
eingetippt — und damit läuft der Ladeversuch **nie**.

Ein Knopf, um es von Hand auszulösen, fehlt. Die Zeile trägt nur
`clearBild`, `uploadBildSP` und `pasteBildSP`. Bezeichnend: Der Code
sucht bereits nach `[data-action="loadBildSharePoint"]` — der Knopf
wurde also einmal gedacht, aber nie gebaut.

## Zweiter Befund: der Umweg über die Anmeldung

Das CMS holt SharePoint-Bilder im Browser über MSAL mit
`Files.ReadWrite.All`. Wer nicht angemeldet ist, bekommt ein
Anmeldefenster oder gar nichts.

Der **Server** kann dasselbe Bild mit den Anmeldedaten der Anwendung
holen — ohne jede Benutzeranmeldung. Das ist oben nachgewiesen. Für das
**Lesen** ist der Serverweg also der verlässlichere.

## Anforderungen

- **F1** Die Artikelzeile hat einen Knopf **„Bild suchen"**, der das
  Bild zum eingetragenen Strichcode holt.
- **F2** Gesucht wird zuerst über den **Server**
  (`/api/werbebilder?artnrs=<sc>&sharepoint=1`) — ohne Anmeldefenster.
  Erst wenn das nichts ergibt, greift der bisherige Weg über MSAL.
- **F3** Aus der Antwort wird der Eintrag mit **gefülltem** Bild
  genommen. Ein leerer Werbebild-Datensatz darf nicht gewinnen — zu
  diesem Strichcode liegt genau so einer in Dataverse.
- **F4** Wird der Strichcode von Hand eingetragen und ist noch kein Bild
  gesetzt, wird automatisch gesucht.
- **F5** Findet sich nichts, sagt das CMS das verständlich; die Zeile
  bleibt sonst unberührt.
- **F6** Das Verhalten bei Auswahl aus der Vorschlagsliste und beim
  Bearbeiten bestehender Aktionen bleibt unverändert.
- **F7** Ein gefundenes Bild wird wie bisher verkleinert; PNG bleibt PNG.

## Nachtrag: „Es wird immer das alte Bild angezeigt"

Aus dem Laden: *„Werden die Bilder in irgendeiner Form gecacht? Es wird
immer das alte Bild angezeigt, obwohl es auf SharePoint bereits verändert
ist."*

Nachgemessen: Der **Server liefert frisch**. Während dieser Sitzung wurde
das Bild in SharePoint getauscht, und der Serverabruf lieferte binnen
Minuten das neue (173 502 → 274 146 Zeichen, anderes Motiv). Es wird
also **auf dem Weg zum Bildschirm** festgehalten:

| Ort | Dauer | Wirkung |
|---|---|---|
| **Keine `Cache-Control`-Kopfzeile** auf `/api/werbebilder` | unbestimmt | Der Browser darf die Antwort nach eigenem Ermessen aufbewahren — die unsichtbarste und hartnäckigste Ursache |
| `_imgCache` im CMS | 15 Minuten | Nach dem Tausch bleibt das alte Bild bis zu 15 Minuten stehen |
| `_bildCache` auf der Website | bis zum Neuladen | Unkritisch, ein Neuladen genügt |
| `dl_bild_base64` in Dataverse | dauerhaft | Ist dort eine Kopie hinterlegt, **gewinnt sie immer** — SharePoint wird dann gar nicht mehr gefragt. Derzeit sind die Felder leer, die Falle bleibt aber bestehen |

- **F8** `/api/werbebilder` sendet `Cache-Control: no-cache, no-store,
  must-revalidate`. Ein in SharePoint getauschtes Bild darf nicht aus dem
  Browserspeicher überschrieben werden.
- **F9** Der Knopf „Bild suchen" übergeht den 15-Minuten-Speicher und
  fragt ausdrücklich frisch (`cache: 'no-store'` plus Zeitstempel). Die
  selbsttätige Suche darf weiterhin den Speicher nutzen.

## Testfälle

| Nr. | Fall | Erwartung |
|---|---|---|
| TC-B01 | Artikelzeile | trägt den Knopf „Bild suchen" |
| TC-B02 | Strichcode eintragen, Knopf drücken | Bild erscheint in der Vorschau |
| TC-B03 | Antwort enthält leeren **und** gefüllten Eintrag | der gefüllte gewinnt |
| TC-B04 | Server findet nichts | verständliche Meldung, Zeile unverändert |
| TC-B05 | Strichcode von Hand eintragen | sucht selbsttätig |
| TC-B06 | Zeile hat bereits ein Bild | selbsttätige Suche überschreibt es nicht |
| TC-B07 | Serverweg verlangt keine Anmeldung | kein MSAL-Aufruf nötig |
| TC-B08 | Antwort von `/api/werbebilder` | trägt `Cache-Control: no-store` |
| TC-B09 | Knopf zweimal drücken, Bild dazwischen getauscht | beim zweiten Mal das **neue** Bild |
| TC-B10 | Knopfabruf | enthält Zeitstempel, umgeht den Speicher |

