# Der Mailanhang trägt den Namen der richtigen Bäckerei

## Anlass

Aus dem Laden:

> „Wenn man Bestellung an Martins Backstube schicken will, steht im Anhang
> Freundl-Bestellformular.docx. Das ist nur bei Freundl Bestellung richtig,
> nicht bei Martins Backstube."

## Ursache

Der Dateiname hing am **Ausgabeformat** statt an der Bäckerei:

```python
ANHANG = {
    "docx": ("Freundl-Bestellformular.docx", DOCX_MIME),
    "pdf":  ("Bestellung-Martins-Backstube.pdf", PDF_MIME),
}
```

Solange Freundl das Word-Format nutzte und Martin's das PDF, fiel das nicht
auf — die Zuordnung stimmte zufällig. Sobald aber Martin's auf Word steht,
ging eine Datei mit dem Namen der **anderen Bäckerei** hinaus. An eine
fremde Firma; das ist mehr als ein Schönheitsfehler.

Dazu kam eine zweite Wahrheit: Die Versandvorschau im Kiosk hatte den Namen
ebenfalls fest verdrahtet (`kv('Anhang', 'Freundl-Bestellformular.docx')`).
Selbst ein korrigierter Server hätte dort weiter das Falsche angezeigt.

## Anforderungen

- **F1** Der Dateiname entsteht aus dem **Namen der Bäckerei**, die Endung
  aus dem Format. Beides ist unabhängig voneinander.
- **F2** Die Versandvorschau im Kiosk nennt den Namen, der **tatsächlich**
  verschickt wird. Er kommt dafür vom Server (`anhang_name`) — eine zweite
  Wahrheit im Frontend wäre genau der alte Fehler.
- **F3** Der Name enthält nur ASCII-Zeichen: Umlaute werden umgeschrieben
  (ä→ae, ß→ss), Sonderzeichen entfallen. Er landet im Postfach einer fremden
  Firma, und dort ist nicht absehbar, welches Programm ihn öffnet.
- **F4** Fehlt der Name der Bäckerei, greift ein brauchbarer Rückfall
  (`Baeckerei-Bestellformular.docx`) statt eines leeren Namens.

## Ergebnis

| Bäckerei | Format | Dateiname |
|---|---|---|
| Martin's Backstube | docx | `Martins-Backstube-Bestellformular.docx` |
| Martin's Backstube | pdf | `Martins-Backstube-Bestellformular.pdf` |
| Bäckerei Freundl | docx | `Baeckerei-Freundl-Bestellformular.docx` |
| *(ohne Namen)* | docx | `Baeckerei-Bestellformular.docx` |

Für Freundl ändert sich der Name damit von `Freundl-Bestellformular.docx`
auf `Baeckerei-Freundl-Bestellformular.docx`. Das ist gewollt: Der Name
folgt jetzt überall derselben Regel, statt einen Sonderfall zu pflegen.

## Testfälle

| Nr. | Fall | Erwartung |
|---|---|---|
| TC-A01 | Martin's Backstube, docx | `Martins-Backstube-Bestellformular.docx` |
| TC-A02 | Bäckerei Freundl, docx | `Baeckerei-Freundl-Bestellformular.docx` |
| TC-A03 | Format pdf | Endung `.pdf` |
| TC-A04 | Name mit Umlauten und `&` | reines ASCII, keine Sonderzeichen |
| TC-A05 | ohne Namen | `Baeckerei-Bestellformular.docx` |
| TC-A06 | **echter Versandweg** je Bäckerei | Anhang trägt den richtigen Namen |
| TC-A07 | Versandvorschau für Martin's | nennt Martin's, **nicht** Freundl |

Wächter:
- `tools/baecker_anhang_test.py` — TC-A01 … TC-A06. Fängt den Graph-Aufruf
  ab, sodass der Dateiname sichtbar wird, der **tatsächlich** im Postfach
  ankäme. Nicht nur der Quelltext.
- `tests/kiosk-baecker.spec.js`, TC-F7-01b — die Vorschau.

**Nachweis der Wirksamkeit:** Mit zurückgenommener Änderung bricht der
Python-Wächter sofort ab (`_anhang_name` existiert nicht).

## Berührte Dateien

- `api/baecker-order/__init__.py` — `_dateiname_teil()`, `_anhang_name()`,
  `FORMATE`; `_send_mail()` nimmt die Bäckerei-Konfiguration entgegen; der
  Bestellungs-Abruf liefert `anhang_name`
- `static-site/js/kiosk-baecker.js` — Vorschau nutzt `_b.anhang_name`
- `tools/baecker_anhang_test.py`, `tests/kiosk-baecker.spec.js`
