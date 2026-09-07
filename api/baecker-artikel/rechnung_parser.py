"""Liest Artikel aus den Rechnungs-PDFs von Martin's Backstube.

Die Rechnungen sind maschinenlesbar (echter Text, kein Scan). Fuer den
Artikelstamm interessieren nur **Nummer und Bezeichnung** – Mengen taugen nicht,
weil eine Rechnung mehrere Liefertage zusammenfasst, und Preise werden bewusst
nicht gefuehrt. Liefer- und Retourmenge werden trotzdem gelesen: daraus entsteht
die Retouren-Uebersicht, die auf zu hohe Bestellmengen hinweist.

Zeilenform einer Position (Text wie ihn ``pypdf`` liefert)::

      Semmel 200 200 Stueck 0,50 30,0100,00 70,00    1
      ^Name  ^Liefer ^Berech        ^Preis/Rabatt    ^Art.-Nr. am ZEILENENDE

Mit Retoure stehen **drei** Zahlen vor der Einheit::

      Mohnsemmel 6 1 5 Stueck 0,65 30,03,25 2,28   14
                 ^ ^ ^ Liefer, Retour, Berech

**Mehrzeilige Positionen** verteilen sich auf drei Zeilen::

      BIO-Ciabatta                       <- Name, mit fuehrenden Leerzeichen
    aus kontr.biolog.Anbau               <- Zusatz, OHNE fuehrende Leerzeichen
    3 3 Stueck 2,90 30,08,70 6,09  104   <- Mengen + Nummer

Ein zeilenweiser Parser uebersieht diese Position **stillschweigend** – und
ausgerechnet sie rechtfertigt den Import, weil sie auf dem Bestellschein nur
handschriftlich stand. Deshalb wird der Name ueber Zeilengrenzen gemerkt.
"""
import email
import glob
import io
import os
import re
from email import policy

# Mengen + Einheit + Preisblock + Artikelnummer am Zeilenende.
# Die Einheit ist praktisch immer "Stueck"; andere Schreibweisen werden
# toleriert, damit eine Layout-Aenderung nicht sofort alles blockiert.
_POSITION = re.compile(
    r"(?P<mengen>[\d,]+(?:\s+[\d,]+){0,2})\s+"
    r"(?P<einheit>St\S*ck|Stk\.?|kg|g)\s+"
    r"(?P<preise>[\d,.\s]+?)\s+"
    r"(?P<nr>\d{1,4})\s*$"
)

# Zeilen, die nie ein Artikelname sind.
_KEIN_NAME = re.compile(
    r"^(Rechnungs-Nr|Diese Rechnung|Datum:|Werte in|Kunden-Nr|LS-Nr|Rabatt:|"
    r"Lieferwert|Netto:|Zahlbetrag|Zahlbar|Summe:|\S*bertrag|DE-|Menge|Einheit|"
    r"Einzel|Preis|Gesamt|Berech|Liefer|Retour|in %|o\. Rab)",
    re.I,
)


def _zahl(s):
    """'2,50' -> 2.5 ; '' -> 0.0"""
    try:
        return float(str(s).replace(",", "."))
    except (TypeError, ValueError):
        return 0.0


def _mengen(roh):
    """Liefer-, Retour- und Berechnungsmenge aus dem Zahlenblock.

    Zwei Zahlen  -> geliefert, berechnet (keine Retoure)
    Drei Zahlen  -> geliefert, retour, berechnet
    Eine Zahl    -> nur geliefert
    """
    teile = [t for t in roh.split() if t]
    if len(teile) >= 3:
        return _zahl(teile[0]), _zahl(teile[1]), _zahl(teile[2])
    if len(teile) == 2:
        return _zahl(teile[0]), 0.0, _zahl(teile[1])
    if len(teile) == 1:
        return _zahl(teile[0]), 0.0, _zahl(teile[0])
    return 0.0, 0.0, 0.0


def positionen_aus_text(text):
    """Positionen aus dem Text **einer** Rechnungsseite oder des ganzen PDFs.

    Gibt eine Liste von dicts mit nummer (str), name, liefer, retour, berech.
    """
    out = []
    offener_name = ""     # Name einer Position, deren Mengen erst spaeter kommen
    for zeile in (text or "").splitlines():
        if not zeile.strip():
            continue
        treffer = _POSITION.search(zeile)
        if not treffer:
            # Kein Mengenblock: entweder eine Namenszeile einer mehrzeiligen
            # Position (die traegt fuehrende Leerzeichen) oder eine Zusatz-/
            # Kopfzeile (die nicht).
            if zeile.startswith("  "):
                kandidat = zeile.strip()
                if kandidat and not _KEIN_NAME.match(kandidat):
                    offener_name = kandidat
            continue

        vorn = zeile[: treffer.start()].strip()
        name = vorn or offener_name
        offener_name = ""
        if not name or _KEIN_NAME.match(name):
            continue

        liefer, retour, berech = _mengen(treffer.group("mengen"))
        out.append({
            "nummer": treffer.group("nr").lstrip("0") or "0",
            "name": " ".join(name.split()),
            "liefer": liefer,
            "retour": retour,
            "berech": berech,
        })
    return out


def positionen_aus_pdf(daten):
    """Positionen aus PDF-Bytes. Gibt [] zurueck, wenn nichts lesbar ist."""
    try:
        import pypdf
    except ImportError:  # pragma: no cover - Abhaengigkeit fehlt nur lokal
        return []
    try:
        leser = pypdf.PdfReader(io.BytesIO(daten))
    except Exception:
        return []
    text = []
    for seite in leser.pages:
        try:
            text.append(seite.extract_text() or "")
        except Exception:
            continue
    return positionen_aus_text("\n".join(text))


def artikel_aus_pdf(daten):
    """Artikelstamm aus einer Rechnung: {nummer: name}, Mengen zusammengefasst.

    Gibt zusaetzlich je Nummer die Summen fuer die Retouren-Uebersicht.
    """
    stamm = {}
    for p in positionen_aus_pdf(daten):
        eintrag = stamm.setdefault(p["nummer"], {
            "nummer": p["nummer"], "name": p["name"],
            "liefer": 0.0, "retour": 0.0,
        })
        eintrag["liefer"] += p["liefer"]
        eintrag["retour"] += p["retour"]
        # Der laengere Name ist in aller Regel der vollstaendigere.
        if len(p["name"]) > len(eintrag["name"]):
            eintrag["name"] = p["name"]
    return stamm


# ──────────────────────────────────────────────────────────────────────
#  Hilfen fuer die Werkzeuge in tools/ (nicht von der Function benutzt)
# ──────────────────────────────────────────────────────────────────────

def pdf_aus_eml(pfad):
    """Erstes PDF aus einer .eml-Datei. Gibt Bytes oder None."""
    with open(pfad, "rb") as fh:
        msg = email.message_from_binary_file(fh, policy=policy.default)
    for teil in msg.walk():
        name = teil.get_filename() or ""
        if name.lower().endswith(".pdf"):
            return teil.get_payload(decode=True)
    return None


def artikel_aus_ordner(ordner):
    """Artikelstamm ueber alle Rechnungen eines Ordners (.eml und .pdf)."""
    gesamt = {}
    dateien = sorted(glob.glob(os.path.join(ordner, "*.eml"))) + \
        sorted(glob.glob(os.path.join(ordner, "Rechnung*.pdf")))
    for pfad in dateien:
        daten = pdf_aus_eml(pfad) if pfad.lower().endswith(".eml") else open(pfad, "rb").read()
        if not daten:
            continue
        for nr, eintrag in artikel_aus_pdf(daten).items():
            ziel = gesamt.setdefault(nr, {
                "nummer": nr, "name": eintrag["name"], "liefer": 0.0, "retour": 0.0,
            })
            ziel["liefer"] += eintrag["liefer"]
            ziel["retour"] += eintrag["retour"]
            if len(eintrag["name"]) > len(ziel["name"]):
                ziel["name"] = eintrag["name"]
    return gesamt
