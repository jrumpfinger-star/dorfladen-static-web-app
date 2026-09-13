"""Baut die Kunden-Online-Hilfe (static-site/handbuch/hilfe.html).

WARUM EIN GENERATOR?
Die alte Hilfe pflegte dieselben Themen an drei Stellen: als Karte im
Raster, als aufklappbarer Abschnitt und noch einmal als Suchdatensatz.
Drei Listen, die zwangsläufig auseinanderlaufen - genau deshalb fehlten
zuletzt sämtliche Bestellfunktionen, während Push noch als
"Testphase" beschrieben war. Hier steht jedes Thema genau einmal.

WAS NICHT IN DIE HILFE GEHOERT
Werte, die im CMS eingestellt werden - Bestellschluss, Liefertage,
Rabattsatz. Wer sie hier wiederholt, hat in drei Monaten wieder eine
falsche Hilfe. Stattdessen wird gesagt, WO der Wert steht.

    python tools\\hilfe_bauen.py
"""

import io
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from hilfe_symbole import sprite  # noqa: E402

ZIEL = os.path.join("static-site", "handbuch", "hilfe.html")

AUF = "\u201e"   # dt. Anführungszeichen unten
ZU = "\u201c"    # dt. Anführungszeichen oben


def q(text):
    return f"{AUF}{text}{ZU}"


# ══════════════════════════════════════════════════════════════════════
#  Die Themen - eine Quelle für Karte, Abschnitt und Suche
# ══════════════════════════════════════════════════════════════════════
#
#   id      Anker, auch von außen aufrufbar: openHilfePopup('faq-...')
#   sym     Symbol aus tools/hilfe_symbole.py
#   tag     Schlagwort in der Trefferliste
#   titel   Die Frage, wie sie im Abschnitt steht
#   kurz    Der Satz auf der Karte
#   kw      Suchbegriffe (auch Umgangssprache und Tippfehler-Nachbarn)
#   text    Die Antwort als HTML

GRUPPEN = [
    ("bestellen", "Bestellen und abholen", "korb"),
    ("heute", "Was es heute gibt", "essen"),
    ("sortiment", "Sortiment und Preise", "liste"),
    ("app", "App und Nachrichten", "handy"),
    ("seite", "Rund um die Seite", "buch"),
    ("klemmt", "Wenn etwas klemmt", "warnung"),
]

THEMEN = [

    # ── Bestellen und abholen ─────────────────────────────────────────
    {
        "id": "faq-mittag-bestellen",
        "gruppe": "bestellen",
        "sym": "essen",
        "tag": "Mittagstisch",
        "titel": "Wie bestelle ich das Mittagessen vor?",
        "kurz": "Gericht aussuchen, Namen eintragen, fertig - ohne Anmeldung.",
        "kw": ("mittagessen bestellen vorbestellen mittagstisch reservieren essen "
               "vormerken online bestellung aufgeben portion abholen bestellschluss"),
        "text": f"""
<p>Sie brauchen kein Konto und kein Passwort. Auf der Startseite tippen Sie
auf {q('Mittagstisch')} und dort auf den Knopf zum Bestellen - oder Sie rufen
gleich <a href="/mittagstisch-bestellen" target="_blank">dorfladen-oberornau.de/mittagstisch-bestellen</a>
auf.</p>

<ol class="schritte">
  <li><b>Gericht auswählen.</b> Sie sehen die Gerichte des Tages mit Preis.
      Über die Menge bestellen Sie mehrere Portionen desselben Gerichts.</li>
  <li><b>Namen eintragen.</b> Mehr ist nicht nötig - der Name ist das
      einzige Pflichtfeld. Damit finden wir Ihre Bestellung bei der Abholung.</li>
  <li><b>Wenn Sie möchten:</b> E-Mail oder Telefonnummer angeben. Beides ist
      freiwillig und nur dafür da, Sie zu benachrichtigen, sobald das Essen
      fertig ist.</li>
  <li><b>Auf {q('Jetzt bestellen')} tippen.</b> Danach erscheint
      {q('Bestellung aufgenommen!')} samt Bestellnummer.</li>
</ol>

<div class="hinweis">
  <b>Bis wann kann ich bestellen?</b> Für denselben Tag gilt ein
  Bestellschluss am Vormittag. Die genaue Uhrzeit steht als Countdown oben
  auf der Bestellseite - dort ist sie immer aktuell, auch wenn wir sie
  einmal ändern.
</div>

<p><b>Abholen:</b> Ihr Essen steht für Sie bereit - in der Regel zwischen
11:30 und 13:00 Uhr. Sie bezahlen bei der Abholung im Laden; eine
Online-Zahlung gibt es nicht. Sie können das Essen mitnehmen oder bei uns
im Laden essen.</p>
""",
    },
    {
        "id": "faq-bestellstatus",
        "gruppe": "bestellen",
        "sym": "haken",
        "tag": "Bestellung",
        "titel": "Wo sehe ich, ob meine Bestellung angekommen ist?",
        "kurz": "Bestellnummer eingeben und den Stand verfolgen.",
        "kw": ("bestellstatus bestellung status verfolgen wo ist meine bestellung "
               "angekommen bestätigt abgeholt bestellnummer nachsehen prüfen"),
        "text": f"""
<p>Direkt nach dem Bestellen führt der Knopf {q('Bestellstatus ansehen')}
zur Übersicht. Später finden Sie sie so wieder:</p>

<ul>
  <li>Auf der Startseite unter <b>{q('Meine Vorbestellungen')}</b>.</li>
  <li>Über die Benachrichtigung, falls Sie eine bekommen haben - ein Tippen
      darauf öffnet genau Ihre Bestellung.</li>
  <li>Von Hand: Sie brauchen die <b>Bestellnummer</b> und die E-Mail-Adresse,
      mit der Sie bestellt haben. Ohne E-Mail erkennt die Seite Ihre
      Bestellung am Gerät - dann klappt es nur auf demselben Handy oder
      Rechner.</li>
</ul>

<p><b>Diese Angaben sehen Sie beim Mittagstisch:</b></p>
<table class="tab">
  <tr><td><b>Eingegangen</b></td><td>Wir haben Ihre Bestellung erhalten, aber
      noch nicht bearbeitet.</td></tr>
  <tr><td><b>Bestätigt</b></td><td>Die Küche hat die Bestellung angenommen.</td></tr>
  <tr><td><b>Abgeholt</b></td><td>Sie haben Ihr Essen bekommen. Damit ist die
      Bestellung erledigt.</td></tr>
  <tr><td><b>Storniert</b></td><td>Die Bestellung wurde zurückgezogen.</td></tr>
</table>

<p>Bei Fleisch- und Shop-Bestellungen heißt der erste Schritt
<b>{q('Neu')}</b> statt {q('Eingegangen')} - sonst ist es dasselbe.</p>
""",
    },
    {
        "id": "faq-storno",
        "gruppe": "bestellen",
        "sym": "verbot",
        "tag": "Bestellung",
        "titel": "Wie storniere ich eine Bestellung?",
        "kurz": "Solange wir sie noch nicht bestätigt haben, geht das selbst.",
        "kw": ("stornieren storno abbestellen absagen rückgängig löschen "
               "abbrechen doch nicht bestellung zurückziehen ändern"),
        "text": f"""
<p>Öffnen Sie Ihre Bestellung (siehe {q('Wo sehe ich, ob meine Bestellung angekommen ist?')})
und tippen Sie auf <b>{q('Stornieren')}</b>. Sie werden nach einem <b>Grund</b>
gefragt - ohne Angabe wird nicht storniert. Ein Wort genügt; es hilft uns,
die Planung zu verbessern.</p>

<div class="hinweis">
  <b>Nur solange {q('Eingegangen')} dasteht.</b> Sobald die Küche die
  Bestellung bestätigt hat, wird bereits für Sie gekocht. Dann geht das
  Stornieren nicht mehr von selbst - rufen Sie uns bitte kurz an unter
  <a href="tel:+4980826229991">08082 / 622 99 91</a>. Wir finden eine Lösung.
</div>

<p><b>Etwas ändern</b> - andere Menge, anderes Gericht - geht nicht direkt.
Stornieren Sie die Bestellung und geben Sie eine neue auf, solange der
Bestellschluss nicht vorbei ist.</p>
""",
    },
    {
        "id": "faq-fleisch",
        "gruppe": "bestellen",
        "sym": "fleisch",
        "tag": "Metzger",
        "titel": "Wie bestelle ich Fleisch und Wurst vor?",
        "kurz": "Frisch vom Metzger Mair - mit Mengenrabatt.",
        "kw": ("fleisch wurst metzger mair vorbestellen bestellen braten schnitzel "
               "vakuum grillen rabatt kilo kg liefertag bestellschluss"),
        "text": f"""
<p>Wir bestellen für Sie beim Metzger Mair mit. Die Seite heißt
<b>{q('Fleisch &amp; Wurst vorbestellen')}</b> und ist über die Kachel
{q('Fleisch &amp; Wurst')} auf der Startseite erreichbar.</p>

<ol class="schritte">
  <li>Artikel aussuchen und Menge eintragen, dann {q('In den Warenkorb')}.</li>
  <li>Namen und Telefonnummer angeben - damit wir Sie erreichen, falls es
      Rückfragen gibt.</li>
  <li>Bestellung abschicken.</li>
</ol>

<div class="hinweis">
  <b>Ab einer bestimmten Menge wird es günstiger.</b> Für größere
  Bestellungen gibt es einen Rabatt. Wie hoch er ist und ab welcher Menge er
  gilt, steht oben auf der Bestellseite - dort ist der Stand immer aktuell.
</div>

<p><b>Wann wird geliefert?</b> Der Metzger liefert an festen Tagen in der
Woche; bestellt werden muss am Werktag davor bis vormittags. Den nächsten
Liefertag und den Bestellschluss zeigt die Seite oben an. Bezahlt wird bei
der Abholung im Laden.</p>
""",
    },
    {
        "id": "faq-shop",
        "gruppe": "bestellen",
        "sym": "korb",
        "tag": "Online-Einkauf",
        "titel": "Was ist der Online-Einkauf?",
        "kurz": "Waren zusammenstellen, Abholtermin wählen, im Laden abholen.",
        "kw": ("shop online einkauf einkaufen warenkorb bestellen abholen "
               "abholtermin konto anmelden lieferung liefern"),
        "text": f"""
<p>Über die Kachel <b>{q('Online-Einkauf')}</b> stellen Sie sich Ihren Einkauf
in Ruhe zusammen und holen ihn dann fertig gepackt im Laden ab. Es gibt
keine Lieferung nach Hause - {q('Abholen im Dorfladen')} ist der Weg.</p>

<ol class="schritte">
  <li>Artikel in den Warenkorb legen.</li>
  <li>Einen <b>Abholtermin</b> wählen.</li>
  <li>Bestellung abschicken und im Laden abholen. Bezahlt wird dort.</li>
</ol>

<p>Wenn Sie öfter bestellen, lohnt sich ein Konto unter
{q('Anmelden / Konto')}: Dann sehen Sie unter {q('Meine Bestellungen')} alles
auf einen Blick und müssen Ihre Angaben nicht jedes Mal neu eintippen.
Pflicht ist das nicht.</p>
""",
    },

    # ── Was es heute gibt ─────────────────────────────────────────────
    {
        "id": "faq-tagesinfo",
        "gruppe": "heute",
        "sym": "zeitung",
        "tag": "TagesInfo",
        "titel": "Was ist die TagesInfo?",
        "kurz": "Eine Seite mit allem, was es heute frisch gibt.",
        "kw": ("tagesinfo tages info heute aktuell theke kuchen frisch aushang "
               "was gibt es heute teilen whatsapp"),
        "text": f"""
<p>Die <b>TagesInfo</b> ist unser Aushang für den Tag: Was es mittags zu
essen gibt, was frisch an der Theke liegt und welcher Kuchen da ist. Sie
erreichen sie über die Kachel {q('TagesInfo')} auf der Startseite oder
direkt unter <a href="/tagesinfo" target="_blank">dorfladen-oberornau.de/tagesinfo</a>.</p>

<p>Die Seite ist bewusst kurz gehalten und lässt sich gut per WhatsApp
weitergeben - etwa in der Nachbarschaft oder in der Familie.</p>

<p>Wenn Sie möchten, meldet sich die TagesInfo von selbst bei Ihnen:
Schalten Sie dafür die Benachrichtigung <b>TagesInfo</b> ein
(siehe {q('Welche Benachrichtigungen gibt es?')}).</p>
""",
    },
    {
        "id": "faq-mittag",
        "gruppe": "heute",
        "sym": "essen",
        "tag": "Mittagstisch",
        "titel": "Wo sehe ich den Mittagstisch der ganzen Woche?",
        "kurz": "Wochenplan ansehen, ausdrucken oder weitergeben.",
        "kw": ("mittagstisch wochenplan speiseplan essensplan gericht woche "
               "menü mittag drucken teilen whatsapp preis"),
        "text": f"""
<p>Auf der Startseite tippen Sie auf die Kachel <b>{q('Mittagstisch')}</b>.
Es öffnet sich der Wochenplan von Montag bis Freitag mit allen Gerichten
und Preisen.</p>

<ul>
  <li><b>Weitergeben:</b> Der Knopf zum Teilen öffnet WhatsApp mit einem
      fertigen Text.</li>
  <li><b>Ausdrucken:</b> Der Druckknopf bereitet den Plan sauber für ein
      Blatt Papier auf.</li>
  <li><b>Vorbestellen:</b> Aus dem Plan heraus kommen Sie direkt zur
      Bestellung (siehe {q('Wie bestelle ich das Mittagessen vor?')}).</li>
</ul>

<p>Auf dem Handy schließen Sie den Plan, indem Sie ihn nach unten wischen
oder die Zurück-Geste verwenden.</p>
""",
    },
    {
        "id": "faq-angebote",
        "gruppe": "heute",
        "sym": "schild",
        "tag": "Angebote",
        "titel": "Wo finde ich die Angebote dieser Woche?",
        "kurz": "Diese und nächste Woche, mit Ersparnis auf einen Blick.",
        "kw": ("angebote aktion rabatt sonderangebot woche nächste woche "
               "reduziert prozent sparen günstig aktionspreis flyer"),
        "text": f"""
<p>Die Kachel <b>{q('Angebote')}</b> auf der Startseite zeigt alle Aktionen.
Mit dem Umschalter wechseln Sie zwischen <b>dieser</b> und <b>nächster
Woche</b> - so können Sie Ihren Einkauf vorausplanen.</p>

<p>Bei jedem Artikel steht der Aktionspreis, daneben der normale Preis und
wie viel Sie sparen. Angebote gelten, solange der Vorrat reicht.</p>

<p>Damit Sie nichts verpassen, können Sie sich benachrichtigen lassen,
sobald neue Angebote online sind - siehe
{q('Welche Benachrichtigungen gibt es?')}.</p>
""",
    },
    {
        "id": "faq-oez",
        "gruppe": "heute",
        "sym": "uhr",
        "tag": "Öffnungszeiten",
        "titel": "Hat der Dorfladen gerade geöffnet?",
        "kurz": "Live-Anzeige, Wochenübersicht und Feiertage.",
        "kw": ("öffnungszeiten offen geschlossen auf zu wann feiertag urlaub "
               "ruhetag sonntag samstag geöffnet stunden zeiten"),
        "text": f"""
<p>Ganz oben auf der Startseite steht, ob wir <b>gerade</b> geöffnet haben.
Die Anzeige rechnet mit der tatsächlichen Uhrzeit und berücksichtigt auch
Feiertage und besondere Tage.</p>

<p>Die vollständige Übersicht finden Sie unter
<a href="/öffnungszeiten" target="_blank">Öffnungszeiten</a>: alle Wochentage,
dazu abweichende Zeiten an Feiertagen.</p>

<p>Ändern sich die Zeiten kurzfristig - etwa vor einem Feiertag -, erfahren
Sie es über die Benachrichtigung <b>News</b>.</p>
""",
    },

    # ── Sortiment und Preise ──────────────────────────────────────────
    {
        "id": "faq-preisliste",
        "gruppe": "sortiment",
        "sym": "liste",
        "tag": "Preisliste",
        "titel": "Wie suche ich einen Artikel in der Preisliste?",
        "kurz": "Nach Namen suchen oder nach Warengruppe blättern.",
        "kw": ("preisliste sortiment artikel suchen finden preis kosten was kostet "
               "warengruppe kategorie filter liste produkte"),
        "text": f"""
<p>Über die Kachel <b>{q('Preisliste')}</b> kommen Sie zum vollständigen
Sortiment. Tippen Sie einfach in das Suchfeld - die Liste wird schon beim
Schreiben kürzer.</p>

<ul>
  <li><b>Nach Warengruppe:</b> Die Abschnitte lassen sich auf- und zuklappen,
      etwa {q('Molkereiprodukte')} oder {q('Getränke')}.</li>
  <li><b>Nur günstige Grundnahrungsmittel:</b> Der Filter {q('Roter Punkt')}
      zeigt ausschließlich diese Artikel.</li>
  <li><b>Mit dem Strichcode suchen:</b> siehe
      {q('Kann ich den Strichcode einer Packung scannen?')}.</li>
</ul>

<p>Die Preise kommen unmittelbar aus unserer Kasse. Trotzdem kann es
vorkommen, dass ein Artikel gerade ausverkauft ist.</p>
""",
    },
    {
        "id": "faq-barcode",
        "gruppe": "sortiment",
        "sym": "kamera",
        "tag": "Preisliste",
        "titel": "Kann ich den Strichcode einer Packung scannen?",
        "kurz": "Kamera auf den Strichcode halten - der Artikel erscheint.",
        "kw": ("barcode strichcode scannen scanner ean kamera code artikel preis "
               "abfotografieren einlesen produkt"),
        "text": f"""
<p>Ja. In der Preisliste gibt es neben dem Suchfeld ein Kamerasymbol. Tippen
Sie darauf und halten Sie die Kamera auf den Strichcode - erkannt wird er
von selbst, Sie müssen nichts auslösen.</p>

<p>Beim ersten Mal fragt Ihr Browser, ob die Seite die Kamera verwenden darf.
Das müssen Sie erlauben, sonst bleibt das Bild schwarz. Es wird nichts
gespeichert und nichts übertragen - die Erkennung passiert auf Ihrem Gerät.</p>

<p>Klappt es nicht, hilft meist: Packung ruhig halten, etwas mehr Abstand,
und für Licht sorgen. Wenn der Browser die Kamera blockiert, lesen Sie
{q('Der Scanner sagt, die Kamera sei gesperrt')}.</p>
""",
    },
    {
        "id": "faq-roterpunkt",
        "gruppe": "sortiment",
        "sym": "punkt",
        "tag": "Roter Punkt",
        "titel": "Was bedeutet der Rote Punkt?",
        "kurz": "Günstige Grundnahrungsmittel zum Dauertiefpreis.",
        "kw": ("roter punkt rot dauertiefpreis günstig billig grundnahrungsmittel "
               "preiswert sozial discounter vergleich"),
        "text": f"""
<p>Artikel mit dem <b>Roten Punkt</b> sind Grundnahrungsmittel, die wir
dauerhaft günstig halten - keine Wochenaktion, sondern ein
Dauertiefpreis. Sie sollen sicherstellen, dass der tägliche Einkauf im
Dorfladen bezahlbar bleibt.</p>

<p>Im Laden erkennen Sie sie am roten Punkt am Regal. Auf der Website gibt es
die eigene Seite <a href="/roter-punkt" target="_blank">Roter Punkt</a> mit
allen Artikeln; in der Preisliste können Sie danach filtern.</p>
""",
    },
    {
        "id": "faq-preisabweichung",
        "gruppe": "sortiment",
        "sym": "geld",
        "tag": "Preise",
        "titel": "Der Preis auf der Website stimmt nicht mit dem Laden überein",
        "kurz": "Was gilt, wenn Aushang und Website sich unterscheiden.",
        "kw": ("preis falsch abweichung unterschied flyer aushang plakat teurer "
               "billiger stimmt nicht kasse anders"),
        "text": """
<p>Das kann vorkommen, wenn ein gedruckter Aushang älter ist als die Seite
oder wenn wir einen Preis kurzfristig angepasst haben.</p>

<p><b>Sprechen Sie uns an der Kasse einfach darauf an.</b> Wir schauen es uns
gemeinsam an und finden eine Lösung, die für Sie in Ordnung ist. Wenn Ihnen
etwas auffällt, sagen Sie es uns gerne - so bekommen wir Fehler schnell aus
der Welt.</p>
""",
    },
    {
        "id": "faq-sortiment-veraltet",
        "gruppe": "sortiment",
        "sym": "korb",
        "tag": "Sortiment",
        "titel": "Ein Artikel steht in der Liste, ist aber nicht im Regal",
        "kurz": "Woran das liegt und was Sie tun können.",
        "kw": ("artikel nicht da ausverkauft leer regal fehlt vergriffen "
               "nicht vorrätig bestellen nachbestellen lieferung"),
        "text": """
<p>Die Preisliste zeigt unser Sortiment - nicht den Lagerbestand von diesem
Augenblick. Ein Artikel kann also gerade ausverkauft sein oder auf die
nächste Lieferung warten.</p>

<p>Fragen Sie uns im Laden: Oft haben wir Nachschub im Lager oder können den
Artikel mit der nächsten Lieferung für Sie mitbestellen. Als kleiner Laden
können wir nicht alles vorrätig halten - mitbestellen geht fast immer.</p>
""",
    },

    # ── App und Nachrichten ───────────────────────────────────────────
    {
        "id": "faq-app",
        "gruppe": "app",
        "sym": "handy",
        "tag": "App",
        "titel": "Wie lege ich den Dorfladen als App auf mein Handy?",
        "kurz": "Bebilderte Anleitung für jedes Gerät.",
        "kw": ("app installieren startbildschirm homebildschirm home icon symbol "
               "handy iphone android pwa hinzufügen verknüpfung"),
        "text": f"""
<p>Sie können unsere Seite wie eine App auf den Startbildschirm legen: ein
Symbol, ein Tippen, ohne Umweg über den Browser. Aus einem App-Store wird
nichts geladen, es kostet nichts und braucht so gut wie keinen Speicher.</p>

<div class="hinweis groß">
  <b>Es gibt eine eigene Anleitung dafür</b> - mit Bildern und passend zu
  Ihrem Gerät, egal ob iPhone, Android-Handy oder Rechner. Sie erkennt von
  selbst, welchen Weg Sie brauchen.<br>
  <a class="knopf" href="/app" target="_blank">Zur Anleitung: dorfladen-oberornau.de/app</a>
</div>

<p><b>Kurzfassung:</b> Auf dem <b>iPhone</b> die Seite in <i>Safari</i>
öffnen, unten auf das Teilen-Symbol tippen und {q('Zum Home-Bildschirm')}
wählen. Mit anderen Browsern klappt es auf dem iPhone nicht zuverlässig.
Auf einem <b>Android-Handy</b> bietet der Browser die Installation meist von
selbst an; sonst finden Sie sie im Menü mit den drei Punkten unter
{q('App installieren')}.</p>
""",
    },
    {
        "id": "faq-push",
        "gruppe": "app",
        "sym": "glocke",
        "tag": "Benachrichtigungen",
        "titel": "Welche Benachrichtigungen gibt es?",
        "kurz": "Vier Arten - jede einzeln an- und abschaltbar.",
        "kw": ("benachrichtigung push mitteilung meldung nachricht erlauben "
               "aktivieren abschalten ausschalten stumm glocke abonnieren"),
        "text": f"""
<p>Wenn Sie möchten, meldet sich der Dorfladen von selbst - etwa morgens mit
dem Mittagstisch. Sie entscheiden dabei genau, worüber. Es gibt vier Arten,
die Sie <b>einzeln</b> ein- und ausschalten können:</p>

<table class="tab">
  <tr>
    <td><b>TagesInfo</b></td>
    <td>Was es heute zu essen gibt, was frisch an der Theke liegt.
        <span class="klein">An Werktagen &middot; an alle</span></td>
  </tr>
  <tr>
    <td><b>News &amp; Aktuelles</b></td>
    <td>Geänderte Öffnungszeiten, Aktionen, Veranstaltungen.
        <span class="klein">Selten &middot; an alle</span></td>
  </tr>
  <tr>
    <td><b>Meine Bestellungen</b></td>
    <td>Ihre Bestellung ist angenommen oder abholbereit; Rückfragen der Küche.
        <span class="klein">Nur bei eigener Bestellung &middot; <b>nur an Sie</b></span></td>
  </tr>
  <tr>
    <td><b>Antwort auf meine Nachricht</b></td>
    <td>Wenn wir auf Ihre Nachricht antworten.
        <span class="klein">Nur nach eigener Anfrage &middot; <b>nur an Sie</b></span></td>
  </tr>
</table>

<p><b>Einschalten:</b> Im Menü auf {q('Benachrichtigungen aktivieren')}
tippen. Der Browser fragt einmal nach - mit {q('Erlauben')} bestätigen.
Danach wählen Sie aus, welche der vier Arten Sie bekommen möchten. Das
lässt sich jederzeit wieder ändern.</p>

<div class="hinweis">
  <b>Auf dem iPhone</b> geht es erst, wenn der Dorfladen als App auf dem
  Startbildschirm liegt <i>und</i> von dort geöffnet wird - so will es Apple.
  Wie das geht, steht in der <a href="/app" target="_blank">App-Anleitung</a>.
</div>

<p><b>Versehentlich abgelehnt?</b> Dann fragt der Browser nicht noch einmal.
Sie geben es in den Einstellungen Ihres Browsers für diese Seite wieder
frei - meist über das Symbol links in der Adresszeile unter
{q('Berechtigungen')}.</p>

<p>Wir brauchen dafür keinen Namen und keine E-Mail-Adresse, sondern nur
eine anonyme Kennung Ihres Geräts. Schalten Sie die Benachrichtigungen ab,
ist auch die wieder weg.</p>
""",
    },
    {
        "id": "faq-kontakt",
        "gruppe": "app",
        "sym": "nachricht",
        "tag": "Kontakt",
        "titel": "Wie schreibe ich dem Dorfladen eine Nachricht?",
        "kurz": "Kurz schreiben - die Antwort kommt in dasselbe Fenster.",
        "kw": ("kontakt nachricht schreiben fragen antwort chat melden anfrage "
               "email schreib uns rückmeldung kritik lob"),
        "text": f"""
<p>Unten rechts finden Sie den Knopf <b>{q('Schreib uns')}</b>. Darüber
erreichen Sie uns direkt - ohne E-Mail-Programm und ohne Anmeldung.</p>

<ol class="schritte">
  <li><b>Namen eintragen.</b> Das ist das einzige Pflichtfeld.</li>
  <li>Nachricht schreiben und abschicken.</li>
  <li>Unsere Antwort erscheint <b>im selben Fenster</b>. Schauen Sie einfach
      später noch einmal hinein.</li>
</ol>

<p>Damit Sie die Antwort nicht verpassen, gibt es zwei Wege:</p>
<ul>
  <li><b>Benachrichtigung:</b> Haben Sie Benachrichtigungen eingeschaltet,
      sagen wir Ihnen Bescheid, sobald die Antwort da ist. Das sieht nur Sie.</li>
  <li><b>Per E-Mail:</b> Setzen Sie den Haken bei
      {q('Antworten auch per E-Mail')} und tragen Sie Ihre Adresse ein.</li>
</ul>

<p>Eilt es? Dann rufen Sie uns lieber an:
<a href="tel:+4980826229991">08082 / 622 99 91</a>.</p>
""",
    },

    # ── Rund um die Seite ─────────────────────────────────────────────
    {
        "id": "faq-galerie",
        "gruppe": "seite",
        "sym": "bild",
        "tag": "Galerie",
        "titel": "Wie sehe ich die Bilder groß an?",
        "kurz": "Bild antippen, blättern, mit Wischen schließen.",
        "kw": ("galerie bilder fotos impressionen ansehen groß vollbild "
               "blättern lightbox kategorie filter"),
        "text": """
<p>Unter <a href="/bilder" target="_blank">Impressionen</a> sehen Sie Bilder
aus dem Laden. Ein Tippen auf ein Bild zeigt es groß.</p>

<ul>
  <li><b>Blättern:</b> nach links oder rechts wischen, am Rechner mit den
      Pfeiltasten.</li>
  <li><b>Schließen:</b> nach unten wischen, auf das Kreuz tippen oder die
      Escape-Taste drücken.</li>
  <li><b>Filtern:</b> Über die Knöpfe oben sehen Sie nur eine Kategorie,
      etwa den Laden oder Veranstaltungen.</li>
</ul>
""",
    },
    {
        "id": "faq-news",
        "gruppe": "seite",
        "sym": "zeitung",
        "tag": "Aktuelles",
        "titel": "Was ist das Laufband ganz oben?",
        "kurz": "Kurzmeldungen - antippen für den ganzen Text.",
        "kw": ("news ticker laufband aktuelles neuigkeiten meldung nachricht "
               "schlagzeile oben lesen artikel"),
        "text": """
<p>Ganz oben läuft ein schmales Band mit unseren aktuellen Kurzmeldungen -
etwa geänderte Öffnungszeiten oder Veranstaltungen. Ein Tippen darauf
öffnet den vollständigen Text.</p>

<p>Alle Meldungen gesammelt finden Sie unter
<a href="/aktuelles" target="_blank">Aktuelles</a>. Wenn Sie nichts verpassen
möchten, schalten Sie die Benachrichtigung <b>News</b> ein.</p>
""",
    },
    {
        "id": "faq-whatsapp",
        "gruppe": "seite",
        "sym": "nachricht",
        "tag": "Teilen",
        "titel": "Wie gebe ich etwas per WhatsApp weiter?",
        "kurz": "Wochenplan, TagesInfo oder Angebot in einem Schritt teilen.",
        "kw": ("whatsapp teilen weitergeben senden schicken weiterleiten "
               "verschicken link freunde nachbarn familie"),
        "text": f"""
<p>Beim Wochenplan, bei der TagesInfo und bei den Angeboten gibt es einen
Knopf zum <b>Teilen</b>. Ein Tippen öffnet WhatsApp mit einem fertigen Text -
Sie wählen nur noch den Empfänger aus.</p>

<p>Am Rechner öffnet sich WhatsApp Web. Alternativ kopieren Sie die Adresse
aus der Adresszeile und fügen sie irgendwo ein.</p>

<p>Die App-Anleitung lässt sich übrigens genauso weitergeben - dort gibt es
zusätzlich einen QR-Code zum Abfotografieren:
<a href="/app" target="_blank">dorfladen-oberornau.de/app</a>.</p>
""",
    },
    {
        "id": "faq-drucken",
        "gruppe": "seite",
        "sym": "drucker",
        "tag": "Drucken",
        "titel": "Wie drucke ich den Wochenplan aus?",
        "kurz": "Sauber auf ein Blatt - ohne Menüs und Knöpfe.",
        "kw": ("drucken ausdrucken drucker papier a4 wochenplan speiseplan "
               "angebote aushang pdf blatt"),
        "text": f"""
<p>Beim Wochenplan und beim Angebotsflyer gibt es einen <b>Druckknopf</b>.
Er bereitet die Seite für Papier auf: Menüs, Knöpfe und Hintergründe
fallen weg, es bleibt der Inhalt.</p>

<p>Damit die Farben mitgedruckt werden, schalten Sie im Druckfenster
{q('Hintergrundgrafiken')} ein - bei Chrome unter {q('Weitere Einstellungen')}.</p>

<p>Kein Drucker zur Hand? Wählen Sie im Druckfenster
{q('Als PDF speichern')} - dann können Sie die Datei weitergeben oder
später drucken.</p>
""",
    },
    {
        "id": "faq-datenschutz",
        "gruppe": "seite",
        "sym": "schloss",
        "tag": "Datenschutz",
        "titel": "Welche Daten speichert die Website über mich?",
        "kurz": "So wenig wie möglich - und nichts für Werbung.",
        "kw": ("datenschutz daten dsgvo cookie tracking speichern anonym "
               "werbung weitergabe sicher privat löschen"),
        "text": """
<p>Wir verwenden nur technisch notwendige Cookies. Es gibt keine
Werbenetzwerke, kein Weiterverkaufen von Daten und keine Auswertung Ihres
Verhaltens für Werbung.</p>

<ul>
  <li><b>Benachrichtigungen:</b> Wir speichern eine anonyme Kennung Ihres
      Geräts - keinen Namen, keine E-Mail. Schalten Sie sie ab, wird die
      Kennung gelöscht.</li>
  <li><b>Bestellungen:</b> Was Sie eintragen - Name und, falls angegeben,
      E-Mail oder Telefon. Wir brauchen es, um Ihre Bestellung zuzuordnen.</li>
  <li><b>Kamera (Strichcode):</b> Das Bild bleibt auf Ihrem Gerät. Es wird
      nichts übertragen und nichts gespeichert.</li>
</ul>

<p>Ausführlich steht alles in der
<a href="/datenschutzerklärung" target="_blank">Datenschutzerklärung</a>.</p>
""",
    },

    # ── Wenn etwas klemmt ─────────────────────────────────────────────
    {
        "id": "faq-laden-fehler",
        "gruppe": "klemmt",
        "sym": "warnung",
        "tag": "Fehler",
        "titel": "Die Seite lädt nicht oder bleibt weiß",
        "kurz": "Drei Handgriffe, die fast immer helfen.",
        "kw": ("fehler lädt nicht weiß leer hängt kaputt geht nicht absturz "
               "funktioniert nicht neu laden aktualisieren"),
        "text": """
<ol class="schritte">
  <li><b>Neu laden.</b> Auf dem Handy von oben nach unten ziehen, am Rechner
      F5 drücken.</li>
  <li><b>Ganz schließen und neu öffnen.</b> Das hilft, wenn die Seite als
      App auf dem Startbildschirm liegt.</li>
  <li><b>Verbindung prüfen.</b> Kurz zwischen WLAN und Mobilfunk wechseln.</li>
</ol>

<p>Bleibt es dabei, ist womöglich eine alte Fassung zwischengespeichert.
Leeren Sie in den Browsereinstellungen den Zwischenspeicher (Cache) für
diese Seite.</p>

<p>Hilft alles nichts, sagen Sie uns bitte Bescheid - mit dem Knopf
<b>Schreib uns</b> oder telefonisch unter
<a href="tel:+4980826229991">08082 / 622 99 91</a>. Beschreiben Sie kurz, was
Sie getan haben und was passiert ist; das hilft uns beim Suchen.</p>
""",
    },
    {
        "id": "faq-kamera-gesperrt",
        "gruppe": "klemmt",
        "sym": "verbot",
        "tag": "Barcode",
        "titel": "Der Scanner sagt, die Kamera sei gesperrt",
        "kurz": "Berechtigung im Browser wieder freigeben.",
        "kw": ("kamera gesperrt blockiert verweigert erlauben berechtigung "
               "zugriff scanner barcode schwarz kein bild"),
        "text": f"""
<p>Sie haben die Kamera-Anfrage vermutlich einmal abgelehnt. Danach fragt der
Browser nicht noch einmal - Sie müssen es von Hand freigeben.</p>

<ul>
  <li><b>Android (Chrome):</b> Auf das Symbol links in der Adresszeile tippen
      &rarr; {q('Berechtigungen')} &rarr; {q('Kamera')} &rarr; zulassen.</li>
  <li><b>iPhone (Safari):</b> {q('Einstellungen')} &rarr; {q('Safari')} &rarr;
      {q('Kamera')} &rarr; {q('Fragen')} oder {q('Erlauben')}.</li>
  <li><b>Rechner:</b> Auf das Schloss- oder Kamerasymbol in der Adresszeile
      klicken und die Kamera zulassen.</li>
</ul>

<p>Danach die Seite einmal neu laden. Bleibt das Bild schwarz, verwendet
möglicherweise eine andere App gerade die Kamera - diese bitte schließen.</p>
""",
    },
    {
        "id": "faq-offline",
        "gruppe": "klemmt",
        "sym": "funk",
        "tag": "Offline",
        "titel": "Was geht ohne Internet?",
        "kurz": "Zuletzt Gesehenes bleibt lesbar - Neues braucht Netz.",
        "kw": ("offline kein internet funkloch langsam verbindung netz wlan "
               "mobilfunk cache gespeichert"),
        "text": """
<p>Die Seite merkt sich, was Sie zuletzt angesehen haben. Ohne Verbindung
können Sie das weiter lesen - zum Beispiel den Wochenplan von vorhin.</p>

<p>Nicht möglich sind Dinge, die aktuelle Daten brauchen: bestellen,
stornieren, eine Nachricht schreiben oder den Bestellstatus abrufen. Sobald
Sie wieder Netz haben, funktioniert alles von selbst - Sie müssen nichts
nachholen.</p>

<p>Bei schwacher Verbindung erscheinen Inhalte manchmal verzögert. Ziehen
Sie die Seite von oben nach unten, um sie neu zu laden.</p>
""",
    },
    {
        "id": "faq-schrift",
        "gruppe": "klemmt",
        "sym": "lupe",
        "tag": "Darstellung",
        "titel": "Die Schrift ist mir zu klein",
        "kurz": "Größer stellen - dauerhaft oder nur kurz.",
        "kw": ("schrift klein groß lesen zoom vergrößern lupe augen "
               "schriftgröße darstellung barrierefrei"),
        "text": f"""
<p><b>Schnell:</b> Auf dem Handy mit zwei Fingern auseinanderziehen. Am
Rechner Strg und + drücken (am Mac Befehlstaste und +).</p>

<p><b>Dauerhaft:</b></p>
<ul>
  <li><b>Android:</b> {q('Einstellungen')} &rarr; {q('Anzeige')} &rarr;
      {q('Schriftgröße')}.</li>
  <li><b>iPhone:</b> {q('Einstellungen')} &rarr; {q('Anzeige &amp; Helligkeit')}
      &rarr; {q('Textgröße')}.</li>
  <li><b>Rechner:</b> In den Browsereinstellungen unter {q('Darstellung')}
      die Schriftgröße erhöhen.</li>
</ul>

<p>Die Seite passt sich an - es wird nichts abgeschnitten.</p>
""",
    },
    {
        "id": "faq-gestures",
        "gruppe": "klemmt",
        "sym": "hand",
        "tag": "Bedienung",
        "titel": "Wie schließe ich ein Fenster auf dem Handy?",
        "kurz": "Wegwischen, Zurück-Geste oder das Kreuz.",
        "kw": ("popup schließen wegwischen wischen geste zurück fenster "
               "overlay zu weg bedienen"),
        "text": """
<p>Fenster wie der Wochenplan oder diese Hilfe lassen sich auf drei Arten
schließen:</p>

<ul>
  <li><b>Nach unten wischen</b> - am oberen Rand des Fensters ansetzen.</li>
  <li><b>Zurück-Geste</b> des Handys: vom linken Rand nach rechts wischen.
      Damit wird nur das Fenster geschlossen, die Seite bleibt.</li>
  <li><b>Auf das Kreuz</b> oben rechts tippen.</li>
</ul>

<p>Am Rechner genügt die Escape-Taste oder ein Klick neben das Fenster.</p>
""",
    },
]
