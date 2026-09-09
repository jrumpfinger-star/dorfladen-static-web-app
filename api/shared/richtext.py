"""Freitext aus dem Kiosk sicher machen und in eine neutrale Form bringen.

Zur Bäcker- und zur Metzger-Bestellung darf ein Hinweis mitgegeben werden, der
auf dem Bestellformular mitgedruckt wird (Spec ``bestell-freitext``, F2). Er
wird im Kiosk in einem Textgestalter erfasst und kommt deshalb als HTML an.

Dieses Modul ist die einzige Stelle, an der dieses HTML angefasst wird:

``bereinige(html)``
    Baut den Text aus einer **Positivliste** neu auf. Alles, was nicht
    ausdrücklich erlaubt ist, verschwindet — der enthaltene Text bleibt aber
    erhalten. Aus ``<a href="…">Bäcker</a>`` wird ``Bäcker``.

``als_text(html)``
    Derselbe Inhalt ohne jede Auszeichnung, für den Mailtext.

``als_bloecke(html)``
    Die neutrale Zwischenform für die Formulare: eine Liste von Absätzen und
    Aufzählungspunkten, jeder aus Textstücken mit den drei Auszeichnungen.
    Weder das PDF noch das Word-Dokument müssen damit etwas von HTML wissen.

Warum eine eigene Umsetzung und nicht ``bleach`` oder ``lxml``? Der erlaubte
Sprachumfang ist winzig — neun Elemente, keine Eigenschaften. ``html.parser``
aus der Standardbibliothek genügt, spart eine Abhängigkeit im
Consumption-Plan und hat die kleinere Angriffsfläche.

Warum aufbauen statt entfernen? Wer Unerwünschtes *entfernt*, muss jede
Schreibweise kennen, die ein Browser noch akzeptiert. Wer den Text aus dem
geparsten Baum **neu aufbaut**, kann gar nichts durchlassen, was er nicht
selbst geschrieben hat.
"""
from html import escape
from html.parser import HTMLParser

# Genau diese Auszeichnungen überstehen den Weg bis aufs Formular. Mehr würde
# im Ausdruck stillschweigend verloren gehen - schlimmer, als es gar nicht
# erst anzubieten.
FETT = ("b", "strong")
KURSIV = ("i", "em")
UNTERSTRICHEN = ("u",)
AUFBAU = ("p", "ul", "li", "br")

ERLAUBT = set(FETT) | set(KURSIV) | set(UNTERSTRICHEN) | set(AUFBAU)

# Inhalt dieser Elemente ist kein Text, sondern Anweisung - er verschwindet
# mitsamt dem Element.
STUMM = ("script", "style", "template", "iframe", "object", "embed")

GRENZE = 1000          # Zeichen reiner Text; mehr passt nicht aufs Formular

ABSATZ, PUNKT = "absatz", "punkt"
UMBRUCH = "\n"         # ein Stück mit diesem Text ist ein Zeilenumbruch


class _Zerleger(HTMLParser):
    """Zerlegt HTML in Blöcke aus ausgezeichneten Textstücken."""

    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.bloecke = []
        self._block = None
        self._fett = 0
        self._kursiv = 0
        self._unter = 0
        self._stumm = 0

    # -- Blockverwaltung ---------------------------------------------------
    def _beginne(self, art, explizit):
        self._schliesse()
        self._block = {"art": art, "explizit": explizit, "stuecke": []}

    def _schliesse(self):
        if self._block and self._block["stuecke"]:
            self.bloecke.append(self._block)
        self._block = None

    def _aktiv(self, art=ABSATZ):
        if self._block is None:
            self._block = {"art": art, "explizit": False, "stuecke": []}
        return self._block

    # -- Ereignisse des Parsers -------------------------------------------
    def handle_starttag(self, tag, attrs):
        tag = tag.lower()
        if tag in STUMM:
            self._stumm += 1
        elif tag == "p":
            self._beginne(ABSATZ, True)
        elif tag == "li":
            self._beginne(PUNKT, True)
        elif tag == "ul" or tag == "ol":
            self._schliesse()
        elif tag == "br":
            self._aktiv()["stuecke"].append(self._stueck(UMBRUCH))
        elif tag in FETT:
            self._fett += 1
        elif tag in KURSIV:
            self._kursiv += 1
        elif tag in UNTERSTRICHEN:
            self._unter += 1
        # Alles andere wird übergangen; sein Text kommt trotzdem an.

    def handle_startendtag(self, tag, attrs):
        if tag.lower() == "br":
            self._aktiv()["stuecke"].append(self._stueck(UMBRUCH))

    def handle_endtag(self, tag):
        tag = tag.lower()
        if tag in STUMM:
            self._stumm = max(0, self._stumm - 1)
        elif tag in ("p", "li"):
            self._schliesse()
        elif tag in ("ul", "ol"):
            self._schliesse()
        elif tag in FETT:
            self._fett = max(0, self._fett - 1)
        elif tag in KURSIV:
            self._kursiv = max(0, self._kursiv - 1)
        elif tag in UNTERSTRICHEN:
            self._unter = max(0, self._unter - 1)

    def handle_data(self, data):
        if self._stumm:
            return
        text = _glaetten(data)
        if not text:
            return
        self._aktiv()["stuecke"].append(self._stueck(text))

    def _stueck(self, text):
        return {"text": text, "fett": self._fett > 0,
                "kursiv": self._kursiv > 0, "unterstrichen": self._unter > 0}

    def fertig(self):
        self._schliesse()
        return [b for b in (_geputzt(b) for b in self.bloecke) if b]


def _glaetten(text):
    """Zeilenumbrüche und Mehrfach-Leerzeichen aus der Quelle vereinheitlichen.

    Im HTML des Textgestalters stehen Umbrüche zur Einrückung, nicht als
    Absicht. Ein echter Umbruch kommt nur über ``<br>`` oder einen neuen Block.
    Ein Leerzeichen am Rand bleibt erhalten: ``Bitte <b>früh</b> liefern`` darf
    die Leerzeichen um ``früh`` nicht verlieren, sonst klebt der Satz zusammen.
    """
    roh = str(text or "")
    kern = " ".join(roh.split())
    if not kern:
        return ""
    vorn = " " if roh[:1].isspace() else ""
    hinten = " " if roh[-1:].isspace() else ""
    return vorn + kern + hinten


def _geputzt(block):
    """Leerraum am Blockrand entfernen und leere Blöcke verwerfen."""
    stuecke = list(block["stuecke"])
    while stuecke and not stuecke[0]["text"].strip():
        stuecke.pop(0)
    while stuecke and not stuecke[-1]["text"].strip():
        stuecke.pop()
    if stuecke:
        stuecke[0] = dict(stuecke[0], text=stuecke[0]["text"].lstrip())
        stuecke[-1] = dict(stuecke[-1], text=stuecke[-1]["text"].rstrip())
    stuecke = [s for s in stuecke if s["text"]]
    if not stuecke:
        return None
    return {"art": block["art"], "explizit": block["explizit"], "stuecke": stuecke}


def _kuerze(bloecke, grenze):
    """Auf ``grenze`` Zeichen reinen Text stutzen (Umbrüche zählen nicht mit)."""
    rest = grenze
    out = []
    for block in bloecke:
        stuecke = []
        for s in block["stuecke"]:
            if s["text"] == UMBRUCH:
                stuecke.append(s)
                continue
            if rest <= 0:
                break
            if len(s["text"]) > rest:
                stuecke.append(dict(s, text=s["text"][:rest]))
                rest = 0
                break
            stuecke.append(s)
            rest -= len(s["text"])
        block = _geputzt({"art": block["art"], "explizit": block["explizit"],
                          "stuecke": stuecke})
        if block:
            out.append(block)
        if rest <= 0:
            break
    return out


def als_bloecke(html, grenze=GRENZE):
    """HTML in Absätze und Aufzählungspunkte zerlegen.

    Rückgabe::

        [{"art": "absatz"|"punkt", "explizit": bool,
          "stuecke": [{"text": str, "fett": bool,
                       "kursiv": bool, "unterstrichen": bool}]}]

    Ein Stück mit dem Text ``"\\n"`` ist ein Zeilenumbruch innerhalb des Blocks.
    """
    z = _Zerleger()
    try:
        z.feed(str(html or ""))
        z.close()
    except Exception:
        # Ein kaputter Rest darf niemals eine Bestellung aufhalten; was bis
        # dahin erkannt wurde, bleibt gültig.
        pass
    return _kuerze(z.fertig(), grenze)


def als_text(html, grenze=GRENZE):
    """Reiner Text ohne Auszeichnungen - für den Mailtext und als Rückfall."""
    zeilen = []
    for block in als_bloecke(html, grenze):
        text = "".join(s["text"] for s in block["stuecke"])
        text = text.replace(UMBRUCH, "\n").strip()
        if not text:
            continue
        zeilen.append(("- " + text) if block["art"] == PUNKT else text)
    return "\n".join(zeilen)


def bereinige(html, grenze=GRENZE):
    """Sicheres HTML mit ausschließlich erlaubten Auszeichnungen.

    Das Ergebnis ist die Form, die gespeichert wird. Es ist beständig: noch
    einmal durch ``bereinige`` geschickt kommt dasselbe heraus.
    """
    bloecke = als_bloecke(html, grenze)
    teile = []
    in_liste = False
    for block in bloecke:
        inhalt = _als_html(block["stuecke"])
        if block["art"] == PUNKT:
            if not in_liste:
                teile.append("<ul>")
                in_liste = True
            teile.append("<li>" + inhalt + "</li>")
            continue
        if in_liste:
            teile.append("</ul>")
            in_liste = False
        # Ein Absatz, der in der Quelle kein <p> war, bekommt auch keines -
        # sonst würde aus einem hingeschriebenen Wort ungefragt ein Absatz.
        if block["explizit"] or len(bloecke) > 1:
            teile.append("<p>" + inhalt + "</p>")
        else:
            teile.append(inhalt)
    if in_liste:
        teile.append("</ul>")
    return "".join(teile)


def _als_html(stuecke):
    out = []
    for s in stuecke:
        if s["text"] == UMBRUCH:
            out.append("<br>")
            continue
        text = escape(s["text"], quote=False)
        if s["unterstrichen"]:
            text = "<u>" + text + "</u>"
        if s["kursiv"]:
            text = "<i>" + text + "</i>"
        if s["fett"]:
            text = "<b>" + text + "</b>"
        out.append(text)
    return "".join(out)


def notiz_aus(rohwert, grenze=GRENZE):
    """Das ``notiz``-Feld einer Bestellung aus dem Anfragerumpf säubern.

    Nimmt entgegen, was der Kiosk schickt (Objekt mit ``html``/``text`` oder
    einfach eine Zeichenkette) und liefert entweder ``None`` - wenn nichts
    Sinnvolles übrig bleibt - oder ``{"html": …, "text": …}``.
    """
    if not rohwert:
        return None
    if isinstance(rohwert, str):
        roh = rohwert
    elif isinstance(rohwert, dict):
        roh = rohwert.get("html") or rohwert.get("text") or ""
    else:
        return None
    html = bereinige(roh, grenze)
    text = als_text(roh, grenze)
    if not text.strip():
        return None
    return {"html": html, "text": text}


def html_aus(notiz):
    """Das gespeicherte HTML einer Notiz holen - gleich in welcher Form."""
    if not notiz:
        return ""
    if isinstance(notiz, str):
        return notiz
    if isinstance(notiz, dict):
        return notiz.get("html") or escape(notiz.get("text") or "", quote=False)
    return ""


__all__ = ["ERLAUBT", "GRENZE", "ABSATZ", "PUNKT", "UMBRUCH",
           "als_bloecke", "als_text", "bereinige", "notiz_aus", "html_aus"]
