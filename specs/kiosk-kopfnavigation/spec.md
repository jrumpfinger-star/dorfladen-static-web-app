# Kiosk – Kopfnavigation, die sich selbst heilt

## Ausgangslage

Aus dem Laden gemeldet: Die Symbole oben rechts im Kiosk („Zur Website",
„Zum CMS") öffnen ihre Seite **anfangs, später aber dann nicht mehr**.
Ein Klick bewirkt gar nichts. „Link in neuem Tab öffnen" über das
Kontextmenü funktioniert dagegen weiterhin.

## Was nachgemessen wurde

Gegen die echte Seite, zweimal über je zehn Minuten Dauernutzung
(alle Reiter, alle Blätter, ohne zwischendurch neu zu laden):

| Verdacht | Messung | Ergebnis |
|---|---|---|
| Etwas liegt über dem Knopf | `elementFromPoint` auf die Knopfmitte | trifft in 15 von 15 Messungen den Link |
| Jemand ruft `preventDefault` | Fensterhorcher liest `e.defaultPrevented` | 14 von 14 Runden `false` |
| History läuft voll | `history.length` über die ganze Zeit | bleibt konstant bei 2 |
| Liegengebliebene Overlays | Overlay-Selektoren, `body.style.overflow` | unauffällig |
| `inert` / `pointer-events` per JS | Suche im ganzen Projekt | kommt nirgends vor |
| Zugriffsschutz auf `/cms.html` | HTTP-Abruf, `staticwebapp.config.json` | 200, keine Rollenprüfung |
| PWA-Geltungsbereich | `manifest.json` | `scope: "/"` — `/cms.html` liegt darin |

**Schluss daraus:** Der Klick kommt gesund an. Es stirbt die Navigation
**danach**, und zwar lautlos. Wer sie verschluckt, ließ sich in fünf
Versuchsreihen nicht einfangen; in Frage kommen der Service Worker, das
PWA-Fenster oder ein Zusammenspiel mit der History.

## Entscheidung

Statt weiter auf die Ursache zu warten, wird der Weg **selbstheilend**
gemacht und zugleich der eine Fehler behoben, der im Service Worker
nachweisbar vorhanden ist.

## Anforderungen

- **F1** Nach einem einfachen Linksklick auf einen Kopf-Link (`a.k-hbtn`
  mit `href`) prüft der Kiosk nach kurzer Frist, ob die Seite noch steht.
  Steht sie noch, holt er die Navigation von Hand nach.
- **F2** Läuft die Navigation normal an, unternimmt der Schutz nichts.
  Es darf **kein** zweiter Seitenaufruf entstehen.
- **F3** Der Schutz greift nicht bei Klicks, die der Anwender ausdrücklich
  anders meint: mittlere/rechte Maustaste, Strg/Cmd/Umschalt/Alt,
  `target` ungleich `_self`.
- **F4** Der Schutz greift nur für Ziele **auf derselben Herkunft**.
  Fremde Adressen, `mailto:`, `tel:` und Sprungmarken bleiben unberührt.
- **F5** Hat bereits jemand `preventDefault()` gerufen, bevor der Schutz
  an der Reihe ist, wird das respektiert — dann war es Absicht.
- **F6** Der Service Worker liefert bei einer Navigation **nie**
  `undefined` an `respondWith()`. Ohne Netz und ohne Vorrat kommt eine
  lesbare Antwort statt eines stummen Netzwerkfehlers.
- **F7** Eine weitergeleitete Antwort (`response.redirected`) wird bei
  einer Navigation sauber nachgebaut, damit der Browser sie nicht
  zurückweist.
- **F8** Ein Fehlschlag beim Ablegen im Zwischenspeicher darf eine
  Auslieferung nie scheitern lassen. Nur brauchbare Antworten (`ok`)
  werden abgelegt.
- **F9** Das „Mehr"-Menü der Kopfzeile meldet seinen Schließ-Horcher
  beim Zuklappen wieder ab. Wiederholtes Auf- und Zuklappen darf die
  Zahl der Klick-Horcher am `document` **nicht** wachsen lassen.

## Testfälle

| Nr. | Fall | Erwartung |
|---|---|---|
| TC-K01 | Normaler Klick auf „Zum CMS" | landet auf `/cms.html` |
| TC-K02 | Normaler Klick auf „Zur Website" | landet auf `/index.html` |
| TC-K03 | Navigation wird verschluckt (Fensterhorcher ruft `preventDefault` **nach** dem Schutz) | Schutz holt sie nach, Ziel wird erreicht |
| TC-K04 | Normaler Klick | genau **ein** Seitenaufruf, kein Nachschlag |
| TC-K05 | Strg-Klick | keine Navigation im selben Fenster |
| TC-K06 | Klick auf einen Link mit `target="_blank"` | Schutz bleibt untätig |
| TC-K07 | Klick auf eine fremde Herkunft | Schutz bleibt untätig |
| TC-K08 | Ein Horcher ruft `preventDefault` **vor** dem Schutz (Capture) | Schutz bleibt untätig |
| TC-K09 | `sw.js` enthält kein `return undefined` im Navigationszweig | erfüllt |
| TC-K10 | `sw.js` behandelt `response.redirected` bei Navigationen | erfüllt |
| TC-K11 | „Mehr"-Menü achtmal auf und zu | Zahl der Klick-Horcher am `document` wächst nicht |

## Hinweis zum Mobilprofil

Unter 560 px stehen „Zur Website" und „Zum CMS" nicht direkt in der
Kopfzeile, sondern hinter dem „Mehr"-Knopf (`.k-head-mehr`, Klasse
`mehr-auf`). Die Tests klappen dort zuerst auf.

