"""Erzeugt das Besucher-Handbuch aus derselben Quelle wie die Online-Hilfe.

    python tools\\handbuch_bauen.py

WARUM AUS DERSELBEN QUELLE?
Das alte Handbuch war aus demselben Grund veraltet wie die Hilfe: Es
beschrieb einen Stand, den niemand mehr nachpflegte - eine "Sidebar am
linken Bildschirmrand", die es seit Langem nicht mehr gibt, saemtliche
Bestellfunktionen fehlten, und Benachrichtigungen galten als "Testphase".

Zwei Dokumente mit denselben Inhalten laufen immer auseinander. Deshalb
kommen die Themen jetzt aus tools/hilfe_inhalt.py - dieselbe Quelle, aus
der auch die Online-Hilfe entsteht. Das Handbuch ergaenzt nur, was ein
zusammenhaengendes Dokument braucht: eine Einfuehrung, den Aufbau der
Seite und ein Inhaltsverzeichnis.
"""

import io
import os
import re
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
sys.stdout.reconfigure(encoding="utf-8", errors="replace")

from hilfe_inhalt import GRUPPEN, THEMEN  # noqa: E402
from hilfe_symbole import sprite  # noqa: E402

ZIEL = os.path.join("static-site", "handbuch", "homepage-anwenderhandbuch.html")

STAND = "September 2026"


def ic(name, klasse="ic"):
    return f'<svg class="{klasse}" aria-hidden="true"><use href="#ic-{name}"/></svg>'


# ══════════════════════════════════════════════════════════════════════
#  Der Teil, den nur das Handbuch hat: Einführung und Aufbau
# ══════════════════════════════════════════════════════════════════════

EINFUEHRUNG = """
<h2 id="kap-start"><span class="nr">1</span> Über diese Anleitung</h2>

<p>Diese Anleitung beschreibt, was Sie auf der Website des Dorfladens
Oberornau tun können — vom Nachsehen der Öffnungszeiten bis zum Vorbestellen
des Mittagessens. Sie ist zum Nachschlagen gedacht: Über das
Inhaltsverzeichnis kommen Sie direkt zu Ihrem Thema.</p>

<p>Alles hier Beschriebene funktioniert ohne Anmeldung und ohne Konto. Sie
brauchen nichts zu installieren — wenn Sie möchten, können Sie die Seite
aber wie eine App auf Ihren Startbildschirm legen (siehe Abschnitt
<i>App und Nachrichten</i>).</p>

<div class="kasten">
  <b>Lieber kurz und schnell?</b> Dieselben Antworten stehen auch in der
  Online-Hilfe auf der Website — dort mit Suchfeld. Sie erreichen sie über
  den Knopf <b>Hilfe</b> im Menü.
</div>

<h2 id="kap-aufbau"><span class="nr">2</span> Die Seite im Überblick</h2>

<h3>Am Rechner</h3>
<p>Oben läuft eine Leiste mit den Hauptbereichen: <b>Aktuelles</b>,
<b>Dorfladen</b>, <b>Online bestellen</b>, <b>Essen</b>, <b>Über uns</b> und
<b>Hilfe</b>. Hinter <b>Dorfladen</b> und <b>Über uns</b> klappt jeweils ein
Untermenü auf — dort finden Sie Konzept, Sortiment, Preisliste,
Öffnungszeiten, Impressionen und den Roten Punkt beziehungsweise Beirat,
Geschäftsführung und Stille Gesellschafter.</p>

<p>Ganz oben steht außerdem, ob der Laden <b>gerade geöffnet</b> hat.</p>

<h3>Auf dem Handy</h3>
<p>Dort ist die Leiste platzsparend zusammengefasst: Eine schmale grüne
Kopfzeile zeigt den Ladennamen, rechts daneben ein Symbol mit drei Strichen.
Ein Tippen darauf öffnet die Liste aller Bereiche.</p>

<p>Darunter liegen große Kacheln für das, was am häufigsten gebraucht wird:</p>

<table class="tab">
  <tr><td><b>Mittagstisch</b></td><td>Wochenplan und Vorbestellung</td></tr>
  <tr><td><b>TagesInfo</b></td><td>Was es heute frisch gibt</td></tr>
  <tr><td><b>Online-Einkauf</b></td><td>Waren zusammenstellen und abholen</td></tr>
  <tr><td><b>Fleisch &amp; Wurst</b></td><td>Vorbestellung beim Metzger</td></tr>
  <tr><td><b>Angebote</b></td><td>Aktionen dieser und nächster Woche</td></tr>
  <tr><td><b>Preisliste</b></td><td>Das ganze Sortiment mit Preisen</td></tr>
  <tr><td><b>Roter Punkt</b></td><td>Dauerhaft günstige Grundnahrungsmittel</td></tr>
</table>

<p>Ganz oben läuft ein schmales Band mit den neuesten Meldungen; unten rechts
erreichen Sie uns über <b>Schreib uns</b>.</p>
"""

ABSCHLUSS = """
<h2 id="kap-kontakt"><span class="nr">9</span> Wenn Sie nicht weiterkommen</h2>

<p>Schreiben Sie uns über den Knopf <b>Schreib uns</b> unten rechts auf der
Startseite. Sie brauchen dafür nur Ihren Namen; die Antwort erscheint im
selben Fenster.</p>

<p>Oder rufen Sie an: <b>08082 / 622 99 91</b>. Kommen Sie gerne auch einfach
im Laden vorbei — wir richten Ihnen die App und die Benachrichtigungen auf
Wunsch direkt auf Ihrem Handy ein.</p>

<div class="kasten">
  <b>Sie arbeiten im Dorfladen?</b> Für den Kiosk — Kalender, Bestellungen
  und Tagesablauf — gibt es ein eigenes Handbuch unter
  <span class="pfad">help-workflows.html</span>.
</div>
"""


def kapitel():
    """Die sechs Themengruppen als Kapitel 3 bis 8."""
    aus = []
    for nr, (g_id, g_titel, g_sym) in enumerate(GRUPPEN, start=3):
        aus.append(f'<h2 id="kap-{g_id}"><span class="nr">{nr}</span> {g_titel}</h2>')
        for t in [x for x in THEMEN if x["gruppe"] == g_id]:
            aus.append(
                f'<section class="thema" id="{t["id"]}">'
                f'<h3>{ic(t["sym"])} {t["titel"]}</h3>'
                f'<p class="kurz">{t["kurz"]}</p>'
                f'{t["text"].strip()}'
                f"</section>")
    return "\n".join(aus)


def inhaltsverzeichnis():
    zeilen = ['<li><a href="#kap-start">1 &middot; Über diese Anleitung</a></li>',
              '<li><a href="#kap-aufbau">2 &middot; Die Seite im Überblick</a></li>']
    for nr, (g_id, g_titel, g_sym) in enumerate(GRUPPEN, start=3):
        unter = "".join(
            f'<li><a href="#{t["id"]}">{t["titel"]}</a></li>'
            for t in THEMEN if t["gruppe"] == g_id)
        zeilen.append(f'<li><a href="#kap-{g_id}">{nr} &middot; {g_titel}</a>'
                      f"<ul>{unter}</ul></li>")
    zeilen.append('<li><a href="#kap-kontakt">9 &middot; Wenn Sie nicht '
                  "weiterkommen</a></li>")
    return "\n".join(zeilen)


CSS = """
:root{--gr:#2d5016;--gr-h:#4a7c27;--gr-bg:#f0f7e8;--text:#1f2937;
  --muted:#6b7280;--linie:#e5e7eb;--warn-bg:#fffbeb;--warn-li:#d97706;--warn-tx:#92400e}
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:'Segoe UI',system-ui,-apple-system,sans-serif;background:#f9fafb;
  color:var(--text);line-height:1.65}
.ic{width:1.05em;height:1.05em;flex:0 0 auto;vertical-align:-.14em;color:var(--gr)}

.titel{background:linear-gradient(135deg,var(--gr),var(--gr-h));color:#fff;
  padding:52px 24px;text-align:center}
.titel h1{font-size:2rem;font-weight:700;margin-bottom:8px}
.titel p{opacity:.9}
.titel .stand{margin-top:16px;font-size:.85rem;opacity:.75}

.blatt{max-width:860px;margin:0 auto;padding:34px 22px 80px}

.ivz{background:#fff;border-radius:12px;padding:20px 24px;margin-bottom:36px;
  box-shadow:0 2px 8px rgba(0,0,0,.07)}
.ivz h2{font-size:1.05rem;color:var(--gr);margin-bottom:12px;border:0;padding:0}
.ivz ul{list-style:none;margin:0}
.ivz>ul>li{margin-bottom:7px;font-weight:600}
.ivz ul ul{margin:5px 0 10px 16px}
.ivz ul ul li{font-weight:400;font-size:.92rem;margin-bottom:3px}
.ivz a{color:var(--text);text-decoration:none}
.ivz a:hover{color:var(--gr);text-decoration:underline}

h2{font-size:1.35rem;color:var(--gr);margin:40px 0 16px;padding-bottom:8px;
  border-bottom:2px solid var(--gr-bg);scroll-margin-top:12px}
h2 .nr{display:inline-flex;align-items:center;justify-content:center;
  width:30px;height:30px;border-radius:50%;background:var(--gr);color:#fff;
  font-size:.9rem;margin-right:10px;vertical-align:-5px}
h3{font-size:1.05rem;margin:22px 0 8px;display:flex;align-items:center;gap:8px}

.thema{background:#fff;border-radius:12px;padding:18px 22px;margin-bottom:14px;
  box-shadow:0 2px 8px rgba(0,0,0,.06);scroll-margin-top:12px}
.thema h3{margin-top:0;color:var(--text)}
.kurz{color:var(--muted);font-size:.92rem;margin-bottom:12px;
  padding-bottom:10px;border-bottom:1px solid var(--linie)}

p{margin-bottom:11px}
ul,ol{margin:0 0 12px 22px}
li{margin-bottom:6px}
a{color:var(--gr)}
b{font-weight:700}

.schritte{counter-reset:s;list-style:none;margin-left:0}
.schritte li{counter-increment:s;position:relative;padding-left:34px;margin-bottom:9px}
.schritte li::before{content:counter(s);position:absolute;left:0;top:2px;
  width:23px;height:23px;border-radius:50%;background:var(--gr);color:#fff;
  font-size:.78rem;font-weight:700;display:flex;align-items:center;justify-content:center}

.hinweis,.kasten{background:var(--warn-bg);border-left:4px solid var(--warn-li);
  border-radius:9px;padding:12px 15px;margin:12px 0;color:var(--warn-tx);font-size:.94rem}
.hinweis.gross,.kasten{background:var(--gr-bg);border-left-color:var(--gr);color:var(--text)}
.knopf{display:inline-block;margin-top:8px;background:var(--gr);color:#fff!important;
  padding:9px 16px;border-radius:8px;text-decoration:none;font-weight:700;font-size:.9rem}

.tab{width:100%;border-collapse:collapse;margin:6px 0 14px;font-size:.93rem}
.tab td{padding:8px 10px;border-bottom:1px solid var(--linie);vertical-align:top}
.tab td:first-child{white-space:nowrap;width:1%;color:var(--gr)}
.klein{display:block;font-size:.84rem;color:var(--muted);margin-top:2px}
.pfad{font-family:ui-monospace,Consolas,monospace;font-size:.9em}

@media(max-width:560px){
  .titel{padding:34px 18px}.titel h1{font-size:1.5rem}
  .blatt{padding:24px 14px 60px}
  .tab td:first-child{white-space:normal}
}

@media print{
  @page{margin:16mm}
  body{background:#fff;font-size:10.5pt}
  .titel{background:none;color:var(--gr);padding:0 0 18mm;text-align:left;
    border-bottom:3px solid var(--gr)}
  .titel h1{font-size:20pt}
  .titel p,.titel .stand{opacity:1;color:var(--muted)}
  .blatt{max-width:none;padding:0}
  .ivz{box-shadow:none;border:1px solid var(--linie);break-after:page}
  h2{break-before:page;break-after:avoid;page-break-after:avoid}
  h2:first-of-type{break-before:auto}
  h3{break-after:avoid;page-break-after:avoid}
  .thema{box-shadow:none;border:1px solid var(--linie);break-inside:avoid;
    page-break-inside:avoid;margin-bottom:5mm}
  .hinweis,.kasten,.tab{break-inside:avoid;page-break-inside:avoid}
  a{color:inherit;text-decoration:none}
  .knopf{border:1px solid var(--gr);color:var(--gr)!important;background:none}
}
"""


def bauen():
    html = f"""<!DOCTYPE html>
<html lang="de">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Anleitung f\u00fcr Besucher \u2013 Dorfladen Oberornau</title>
<meta name="description" content="Anleitung zur Website des Dorfladens
Oberornau: bestellen und abholen, Benachrichtigungen, Preisliste,
App einrichten.">
<link rel="icon" href="/favicon.ico">
<style>{CSS}</style>
</head>
<body>
{sprite()}

<header class="titel">
  <h1>Die Website des Dorfladens</h1>
  <p>Eine Anleitung f\u00fcr Besucherinnen und Besucher</p>
  <div class="stand">Stand: {STAND} \u00b7 dorfladen-oberornau.de</div>
</header>

<div class="blatt">

  <nav class="ivz" aria-label="Inhalt">
    <h2>Inhalt</h2>
    <ul>
{inhaltsverzeichnis()}
    </ul>
  </nav>

{EINFUEHRUNG}

{kapitel()}

{ABSCHLUSS}

</div>
</body>
</html>
"""
    io.open(ZIEL, "w", encoding="utf-8", newline="\n").write(html)
    return html


if __name__ == "__main__":
    h = bauen()
    print(f"ok   {ZIEL} ({len(h)} Zeichen)")
    print(f"ok   {len(THEMEN)} Themen, {len(GRUPPEN) + 3} Kapitel")
    roh = re.sub(r"<[^>]+>", " ", h)
    for wort in ["Testphase", "Sidebar", "Quick-Action"]:
        if wort in roh:
            print(f"   ACHTUNG: {wort} steht noch im Text")
