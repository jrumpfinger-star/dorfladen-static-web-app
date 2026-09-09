# Bestell-Freitext für Bäcker und Metzger — Implementation Plan

> Gehört zu [spec.md](./spec.md). Keine Verhaltensweise in diesem Plan, die
> nicht in der Spezifikation steht.

**Status:** Draft

**Last updated:** 2026-09-09

## Ausgangslage

Der Freitext muss an fünf Stellen ankommen, weil es zwei Gewerke, zwei
Bäckereien und zwei Anhangformate gibt:

| Weg | Erzeuger | Empfänger |
| --- | --- | --- |
| Metzger-Formular (PDF) | [metzger_pdf.py](../../api/metzger-order/metzger_pdf.py) | Metzgerei, Mailanhang **und** Ausdruck |
| Bäcker-Anhang Freundl (`.docx`) | [docx_fill.py](../../api/baecker-order/docx_fill.py) | Bäckerei Freundl, Mailanhang |
| Bäcker-Ausdruck Freundl (PDF) | [formular_pdf.py](../../api/baecker-order/formular_pdf.py) | Nachbildung des Word-Blatts zum Drucken |
| Bäcker-Anhang Martin's (PDF) | [pdf_fill.py](../../api/baecker-order/pdf_fill.py) | Bäckerei mit PDF-Format, Anhang und Ausdruck |
| Mailtext | `_mail_text()` in beiden `__init__.py` | beide Gewerke |

Alle vier Dokumentwege setzen auf `fpdf2` bzw. auf reines Word-XML. Es gibt
keinen HTML-Umsetzer — der Freitext muss deshalb **einmal** in eine neutrale
Zwischenform gebracht und von dort aus in jedes Ziel gesetzt werden. Das ist
der Kern dieses Plans.

## Architektur

### Der Freitext wird einmal zerlegt, viermal gesetzt

```text
   Kiosk (HTML aus dem Textgestalter)
        │  notiz.html
        ▼
   shared/richtext.py
        ├─ bereinige(html)      → sicheres, erlaubtes HTML   (wird gespeichert)
        ├─ als_text(html)       → reiner Text                (Mail, Rückfallebene)
        └─ als_bloecke(html)    → [ {art, stuecke:[{text,fett,kursiv,unterstrichen}]} ]
                                       │
             ┌─────────────────────────┼─────────────────────────┐
             ▼                         ▼                         ▼
      pdf_notiz.py               docx_notiz.py              _mail_text()
   (fpdf2, 3 Formulare)      (Word-XML, Freundl)         (reiner Text)
```

`als_bloecke` ist die neutrale Zwischenform: eine Liste von Absätzen und
Aufzählungspunkten, jeder aus Textstücken mit den drei Auszeichnungen. Damit
weiß weder das PDF noch das Word-Dokument etwas von HTML.

**Warum ein eigener Zerleger statt einer Bibliothek?** Die API läuft als Azure
Function; jede zusätzliche Abhängigkeit muss in `requirements.txt` und wird bei
jedem Kaltstart geladen. Der erlaubte Sprachumfang ist winzig (neun Elemente,
keine Eigenschaften) — `html.parser` aus der Standardbibliothek reicht und ist
gegenüber `bleach`/`lxml` die kleinere Angriffsfläche.

### Bereinigung: Positivliste, nicht Sperrliste

`bereinige()` baut das Ergebnis **neu auf**, statt Unerwünschtes zu entfernen.
Ein Element ohne Freigabe wird übersprungen, sein Textinhalt aber übernommen.
`<script>` und `<style>` unterdrücken zusätzlich ihren Inhalt. Damit gibt es
keinen Weg, über verschachtelte oder kaputte Auszeichnung etwas durchzuschmuggeln
— anders als bei jedem Ansatz mit regulären Ausdrücken.

### Kiosk: ein Textgestalter für beide Reiter

Ein neues Modul `static-site/js/kiosk-notiz.js` stellt `KNotiz.oeffnen(opt)`
bereit. Es bringt Dialog, Bearbeitungsleiste und Rest-Vorrat mit und ist
gewerkefrei — Bäcker und Metzger reichen nur ihren Text und eine Rückmeldung
hinein. So gibt es den Textgestalter **einmal**, nicht zweimal.

Der Gestalter selbst ist ein `contenteditable`-Bereich mit
`document.execCommand` für fett/kursiv/unterstrichen/Aufzählung. Das ist im
Kiosk vertretbar, weil er auf einem festen Gerät mit aktuellem Browser läuft und
weil die Positivliste ohnehin auf dem Server greift — der Gestalter muss also
nicht sauber arbeiten, nur bequem sein. Eingefügter Text wird über `paste`
abgefangen und als reiner Text eingesetzt (F2).

## Dateiänderungen

### Neu

| Datei | Zweck |
| --- | --- |
| `api/shared/richtext.py` | `bereinige()`, `als_text()`, `als_bloecke()` — F2 |
| `api/baecker-order/notiz_docx.py` | Hinweisblock als Word-Absätze — F4 |
| `static-site/js/kiosk-notiz.js` | Dialog und Textgestalter für beide Reiter — F1, F6 |
| `tests/kiosk-notiz.spec.js` | Playwright: F1, F5, F6 |
| `tests/api/test_richtext.py` | Python: F2 (Bereinigung, Zerlegung) |
| `specs/bestell-freitext/tasks.md` | Aufgabenliste |

### Geändert

| Datei | Änderung |
| --- | --- |
| `api/shared/pdf_notiz.py` (neu, aber bei `shared`) | Hinweisblock in ein `fpdf2`-Dokument setzen; von allen drei PDF-Wegen genutzt |
| `api/metzger-order/metzger_pdf.py` | `build_pdf(..., notiz=None)`; Block über der Tabelle |
| `api/metzger-order/__init__.py` | `notiz` aus dem Rumpf bereinigen, speichern, an PDF und Mailtext geben |
| `api/baecker-order/formular_pdf.py` | `build_formular(..., notiz=None)`; Block unter der Tabelle |
| `api/baecker-order/pdf_fill.py` | `build_pdf(..., notiz=None)`; Block unter der Tabelle |
| `api/baecker-order/docx_fill.py` | `fill_form(..., notiz=None)`; Absätze ans Ende des Dokuments |
| `api/baecker-order/__init__.py` | wie beim Metzger: bereinigen, speichern, weiterreichen |
| `static-site/js/kiosk-metzger-bestellung.js` | Knopf in der Fußleiste, `notiz` im Zustand und im Rumpf |
| `static-site/js/kiosk-baecker.js` | Knopf bei der gewählten Bäckerei, `notiz` im Zustand und im Rumpf |
| `static-site/css/kiosk-neu.css` | Gestaltung von Knopf und Dialog |
| `static-site/kiosk-klassisch.html` | `kiosk-notiz.js` einbinden (Quelle beider Kiosk-Seiten) |

**Nicht** geändert: Dataverse-Schema, `requirements.txt`, bestehende Endpunkte,
der Positions-Hinweis des Metzgers.

## Vorgehen in Schritten

1. **Bereinigung und Zerlegung** (`shared/richtext.py`) mit Python-Tests. Steht
   das nicht, ist alles Weitere unsicher. — F2
2. **Hinweisblock im PDF** (`shared/pdf_notiz.py`) und Anschluss der drei
   PDF-Erzeuger. — F3
3. **Hinweisblock im Word-Dokument.** — F4
4. **API-Anschluss** beider Gewerke: entgegennehmen, bereinigen, speichern,
   ausliefern, in den Mailtext. — F5
5. **Textgestalter im Kiosk** als eigenes Modul. — F1, F6
6. **Anschluss der beiden Reiter** an den Gestalter. — F1, F5
7. **Playwright-Tests** über die drei Bildschirmgrößen. — F1, F5, F6

Die Reihenfolge ist bewusst von hinten nach vorn: Erst wenn der Text sicher im
Formular landet, bekommt die Verkäuferin ein Feld, in das sie ihn schreibt.

## Entwurfsentscheidungen

**Warum `notiz` als Objekt und nicht als Zeichenkette?** Die Bestellung trägt
`{"html": …, "text": …}`. Der reine Text wird beim Speichern einmal erzeugt und
mitgelegt, damit Mailtext, Suche und jede spätere Auswertung ihn benutzen
können, ohne HTML zerlegen zu müssen. Kosten: ein paar Bytes je Bestellung.

**Warum der Block beim Bäcker unter und beim Metzger über der Tabelle?** Das
Bäcker-Blatt ist die bewusste Nachbildung des gewohnten Word-Formulars — ein
Block über der Tabelle würde genau das Wiedererkennen zerstören, das im Laden
ausdrücklich eingefordert wurde. Das Metzger-Blatt ist frei gesetzt; dort steht
der Hinweis oben, wo er zuerst gelesen wird.

**Warum kein `<h1>`/`<h2>` im erlaubten Umfang?** Ein Bestellhinweis ist kurz.
Überschriften bräuchten im PDF und im Word-Dokument eigene Schriftgrade und
Abstände und würden das Blatt unruhig machen, ohne etwas beizutragen. Fett
genügt.

**Umgang mit Zeichen außerhalb von Latin-1:** Der Hinweisblock läuft durch
dieselbe `latin1()`-Ersetzung wie der übrige Formularinhalt. Ein Emoji im
Hinweis darf den Versand einer Bestellung niemals verhindern (F3).

## Risiken

| Risiko | Umgang |
| --- | --- |
| `execCommand` gilt als veraltet | Es ist in allen Zielbrowsern vorhanden und wird nicht entfernt, ohne Ersatz zu bieten. Der Gestalter ist gekapselt; ein Austausch beträfe nur `kiosk-notiz.js`. |
| Word-Dokument wird ungültig | Absätze werden über ElementTree in denselben Baum gehängt, der ohnehin schon geschrieben wird; TC-F4-03 prüft die Wohlgeformtheit. |
| Langer Hinweis sprengt das Blatt | 1 000 Zeichen sind gedeckelt (F2); `fpdf2` bricht mit automatischem Seitenumbruch um (TC-F3-04). |
| Zwei Kiosk-Seiten aus einer Quelle | `kiosk-klassisch.html` ist die gepflegte Quelle; nach jeder Änderung `node tools/build-kiosk-neu.js`. |

## Traceability

| Requirement | Plan-Abschnitt | Dateien |
| --- | --- | --- |
| F1 Freitext erfassen | Kiosk: ein Textgestalter für beide Reiter | `kiosk-notiz.js`, beide Fachmodule |
| F2 Auszeichnungen und Bereinigung | Bereinigung: Positivliste | `shared/richtext.py` |
| F3 Formular (PDF) | Der Freitext wird einmal zerlegt, viermal gesetzt | `shared/pdf_notiz.py`, drei PDF-Erzeuger |
| F4 Word-Dokument | ebenda | `notiz_docx.py`, `docx_fill.py` |
| F5 Teil der Bestellung | Vorgehen Schritt 4 und 6 | beide `__init__.py`, beide Fachmodule |
| F6 Bedienbarkeit | Kiosk: ein Textgestalter für beide Reiter | `kiosk-notiz.js`, `kiosk-neu.css` |
