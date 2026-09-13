"""Erzeugt static-site/handbuch/hilfe.html aus tools/hilfe_inhalt.py.

    python tools\\hilfe_bauen.py

Die Themen stehen in hilfe_inhalt.py genau einmal; hier entstehen daraus
Karte, aufklappbarer Abschnitt und Suchdatensatz. Fruher waren das drei
getrennte Listen - und sie liefen auseinander.
"""

import io
import json
import os
import re
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
sys.stdout.reconfigure(encoding="utf-8", errors="replace")

from hilfe_inhalt import GRUPPEN, THEMEN, ZIEL, q  # noqa: E402
from hilfe_symbole import sprite  # noqa: E402

# Die Texte in hilfe_inhalt.py tragen ihre Umlaute selbst. Hier stand
# einmal eine Ersetzungstabelle mit rund 150 Wortpaaren - sie war prompt
# unvollstaendig und liess Woerter wie "Ausfuehrlich" stehen. Die
# Funktion bleibt als einzige Stelle erhalten, falls doch einmal etwas
# nachzubessern ist.
def umlaute(text):
    return text


def ic(name, klasse="ic"):
    return f'<svg class="{klasse}" aria-hidden="true"><use href="#ic-{name}"/></svg>'


# ── Bausteine ─────────────────────────────────────────────────────────

def karten(gruppe):
    aus = []
    for t in [x for x in THEMEN if x["gruppe"] == gruppe]:
        aus.append(
            f'<button type="button" class="hcard" data-id="{t["id"]}"'
            f' onclick="openFaq(\'{t["id"]}\')">'
            f'<span class="hc-sym">{ic(t["sym"])}</span>'
            f'<span class="hc-t">{umlaute(t["titel"])}</span>'
            f'<span class="hc-k">{umlaute(t["kurz"])}</span>'
            f"</button>")
    return "\n".join(aus)


def abschnitte():
    """Themen gruppiert, jedes mit Kurztext — aufklappbar.

    Frueher gab es beides: ein Kartenraster zum Ueberblicken und darunter
    dieselben Themen noch einmal zum Aufklappen. Bei 27 Themen wurde die
    Seite damit doppelt so lang, ohne mehr zu sagen. Jetzt traegt jeder
    Eintrag seinen Kurztext gleich mit - Ueberblick und Antwort an einer
    Stelle.
    """
    aus = []
    for g_id, g_titel, g_sym in GRUPPEN:
        aus.append(f'<h2 class="sh" id="gr-{g_id}">{ic(g_sym)} {g_titel}</h2>')
        for t in [x for x in THEMEN if x["gruppe"] == g_id]:
            aus.append(
                f'<div class="faq" id="{t["id"]}" data-kw="{t["kw"]}">'
                f'<button type="button" class="faq-q" onclick="toggleFaq(this)"'
                f' aria-expanded="false">'
                f'<span class="fq-sym">{ic(t["sym"])}</span>'
                f'<span class="fq-t"><span class="fq-f">{umlaute(t["titel"])}</span>'
                f'<span class="fq-k">{umlaute(t["kurz"])}</span></span>'
                f'<span class="fq-pf" aria-hidden="true"></span>'
                f"</button>"
                f'<div class="faq-a">{umlaute(t["text"]).strip()}</div>'
                f"</div>")
    return "\n".join(aus)


def schnellzugriff():
    """Die Themen, nach denen am häufigsten gefragt wird.

    Eigene, sprechende Beschriftungen statt der Schlagworte: Sonst stünde
    dort zweimal „Bestellung“ — einmal für den Stand, einmal fürs
    Stornieren —, und niemand wüsste, welcher Knopf wohin führt.
    """
    beliebt = [
        ("faq-mittag-bestellen", "Essen vorbestellen"),
        ("faq-bestellstatus", "Wo ist meine Bestellung?"),
        ("faq-storno", "Stornieren"),
        ("faq-oez", "Öffnungszeiten"),
        ("faq-app", "App einrichten"),
        ("faq-push", "Benachrichtigungen"),
        ("faq-preisliste", "Preise suchen"),
        ("faq-kontakt", "Uns schreiben"),
    ]
    aus = []
    for tid, beschriftung in beliebt:
        t = next(x for x in THEMEN if x["id"] == tid)
        aus.append(f'<button type="button" class="qlb" onclick="openFaq(\'{tid}\')">'
                   f'{ic(t["sym"], "ic klein")} {beschriftung}</button>')
    return "\n".join(aus)


def suchdaten():
    return json.dumps(
        [{"id": t["id"], "sym": t["sym"], "tag": umlaute(t["tag"]),
          "titel": umlaute(t["titel"]), "kurz": umlaute(t["kurz"]),
          "kw": t["kw"]} for t in THEMEN],
        ensure_ascii=False, indent=0).replace("\n", "")


CSS = """
:root{
  --gr:#2d5016; --gr-h:#4a7c27; --gr-bg:#f0f7e8;
  --text:#1f2937; --muted:#6b7280; --linie:#e5e7eb;
  --warn-bg:#fffbeb; --warn-li:#d97706; --warn-tx:#92400e;
  --schatten:0 2px 8px rgba(0,0,0,.07); --r:12px;
}
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:'Segoe UI',system-ui,-apple-system,sans-serif;background:#f9fafb;
  color:var(--text);min-height:100vh;line-height:1.6;-webkit-text-size-adjust:100%}

.ic{width:1.15em;height:1.15em;flex:0 0 auto;vertical-align:-.16em}
.ic.klein{width:1em;height:1em}

/* Kopf */
.hdr{background:linear-gradient(135deg,var(--gr),var(--gr-h));color:#fff;
  padding:20px 20px 34px;text-align:center}
.hdr .back{display:inline-flex;align-items:center;gap:6px;color:rgba(255,255,255,.85);
  font-size:.85rem;text-decoration:none;margin-bottom:12px}
.hdr .back:hover{color:#fff}
.hdr h1{font-size:1.65rem;font-weight:700;margin-bottom:6px;
  display:flex;align-items:center;justify-content:center;gap:10px}
.hdr p{font-size:.95rem;opacity:.9}

/* Suche */
.search-wrap{max-width:680px;margin:-22px auto 0;padding:0 16px;position:relative;z-index:10}
.search-box{display:flex;align-items:center;background:#fff;border-radius:14px;
  box-shadow:0 4px 20px rgba(0,0,0,.16);padding:4px 10px 4px 16px;gap:10px}
.search-box input{flex:1;border:0;outline:none;font:inherit;font-size:1.02rem;
  padding:13px 0;background:transparent;color:var(--text);min-width:0}
.search-box input::placeholder{color:#9ca3af}
/* Das Suchfeld bringt in Chrome und Safari ein eigenes Kreuz mit. Neben
   dem eigenen Knopf standen dadurch zwei davon nebeneinander. */
.search-box input::-webkit-search-cancel-button,
.search-box input::-webkit-search-decoration{-webkit-appearance:none;appearance:none}
.si{color:var(--gr)}
#clearBtn{background:none;border:0;cursor:pointer;color:#9ca3af;font-size:1.2rem;
  padding:8px;display:none;min-width:40px;min-height:40px}
#clearBtn.show{display:block}

.wrap{max-width:900px;margin:0 auto;padding:30px 16px 70px}

/* Treffer */
#sr{display:none}
#sr.show{display:block}
.rc{font-size:.88rem;color:var(--muted);margin-bottom:12px}
.rcard{background:#fff;border-radius:var(--r);box-shadow:var(--schatten);
  padding:13px 16px;margin-bottom:9px;border-left:4px solid var(--gr);
  cursor:pointer;display:flex;gap:12px;align-items:flex-start;width:100%;
  text-align:left;border-top:0;border-right:0;border-bottom:0;font:inherit;color:inherit}
.rcard:hover{box-shadow:0 4px 16px rgba(0,0,0,.12)}
.rcard .rs{color:var(--gr);margin-top:2px}
.rcard .tag{display:inline-block;background:var(--gr-bg);color:var(--gr);
  font-size:.72rem;font-weight:700;padding:2px 8px;border-radius:20px;margin-bottom:4px}
.rcard .rtitle{font-weight:700;font-size:.97rem}
.rcard .rsnip{font-size:.86rem;color:var(--muted)}
.rcard mark{background:#fef08a;border-radius:2px;padding:0 2px}
.nores{text-align:center;padding:44px 20px;color:var(--muted)}
.nores .ic{width:34px;height:34px;color:#cbd5e1;margin-bottom:10px}

/* Abschnittskopf */
.sh{font-size:1.06rem;font-weight:700;color:var(--gr);margin:34px 0 14px;
  display:flex;align-items:center;gap:9px;scroll-margin-top:14px}
.sh::after{content:'';flex:1;height:1px;background:var(--linie)}

/* Schnellzugriff */
.ql{display:flex;flex-wrap:wrap;gap:8px;margin-bottom:6px}
.qlb{display:inline-flex;align-items:center;gap:6px;background:var(--gr-bg);
  color:var(--gr);padding:9px 14px;border-radius:20px;font:inherit;font-size:.87rem;
  font-weight:600;border:0;cursor:pointer;min-height:40px}
.qlb:hover{background:#dcecca}

/* Karten */
.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(240px,1fr));gap:12px}
.hcard{background:#fff;border-radius:var(--r);box-shadow:var(--schatten);
  padding:15px 16px;display:flex;flex-direction:column;gap:6px;align-items:flex-start;
  border:0;border-top:3px solid transparent;cursor:pointer;font:inherit;
  color:var(--text);text-align:left;width:100%}
.hcard:hover{box-shadow:0 6px 20px rgba(0,0,0,.12);border-top-color:var(--gr)}
.hc-sym{width:38px;height:38px;border-radius:10px;background:var(--gr-bg);
  color:var(--gr);display:flex;align-items:center;justify-content:center;margin-bottom:2px}
.hc-sym .ic{width:20px;height:20px}
.hc-t{font-weight:700;font-size:.95rem;line-height:1.35}
.hc-k{font-size:.85rem;color:var(--muted);line-height:1.45}

/* Aufklappbare Abschnitte */
.faq{background:#fff;border-radius:var(--r);box-shadow:var(--schatten);
  margin-bottom:9px;overflow:hidden;scroll-margin-top:14px}
.faq-q{width:100%;display:flex;align-items:flex-start;gap:11px;padding:14px 16px;
  background:none;border:0;font:inherit;color:var(--text);cursor:pointer;
  text-align:left;min-height:56px}
.fq-sym{width:34px;height:34px;border-radius:9px;background:var(--gr-bg);color:var(--gr);
  display:flex;align-items:center;justify-content:center;flex:0 0 auto;margin-top:1px}
.fq-sym .ic{width:18px;height:18px}
.fq-t{flex:1;min-width:0;display:flex;flex-direction:column;gap:2px}
.fq-f{font-weight:700;font-size:.97rem;line-height:1.35}
/* Der Kurztext sagt schon zugeklappt, worum es geht - dafuer gab es
   frueher ein eigenes Kartenraster mit denselben 27 Themen. */
.fq-k{font-size:.85rem;color:var(--muted);line-height:1.45}
.faq.open .fq-k{display:none}
.fq-pf{width:10px;height:10px;border-right:2px solid var(--muted);
  border-bottom:2px solid var(--muted);transform:rotate(45deg);
  transition:transform .2s;flex:0 0 auto;margin:9px 4px 0 0}
.faq.open .fq-pf{transform:rotate(-135deg)}
.faq.open .fq-f{color:var(--gr)}
.faq-a{display:none;padding:0 18px 18px 61px;font-size:.94rem}
.faq.open .faq-a{display:block;animation:auf .2s ease-out}
@media(max-width:560px){.faq-a{padding-left:18px}}
@keyframes auf{from{opacity:0;transform:translateY(-4px)}to{opacity:1;transform:none}}
.faq-a p{margin-bottom:11px}
.faq-a ul,.faq-a ol{margin:0 0 12px 20px}
.faq-a li{margin-bottom:6px}
.faq-a a{color:var(--gr);font-weight:600}
.faq-a b{font-weight:700}
.schritte{counter-reset:s;list-style:none;margin-left:0!important}
.schritte li{counter-increment:s;position:relative;padding-left:34px;margin-bottom:9px}
.schritte li::before{content:counter(s);position:absolute;left:0;top:1px;
  width:23px;height:23px;border-radius:50%;background:var(--gr);color:#fff;
  font-size:.78rem;font-weight:700;display:flex;align-items:center;justify-content:center}

.hinweis{background:var(--warn-bg);border-left:4px solid var(--warn-li);
  border-radius:9px;padding:12px 15px;margin:12px 0;color:var(--warn-tx);font-size:.92rem}
.hinweis.gross{background:var(--gr-bg);border-left-color:var(--gr);color:var(--text)}
.hinweis a{color:inherit}
.knopf{display:inline-block;margin-top:9px;background:var(--gr);color:#fff!important;
  padding:11px 18px;border-radius:9px;text-decoration:none;font-weight:700;font-size:.9rem}
.knopf:hover{background:var(--gr-h)}

.tab{width:100%;border-collapse:collapse;margin:4px 0 13px;font-size:.92rem}
.tab td{padding:8px 10px;border-bottom:1px solid var(--linie);vertical-align:top}
.tab td:first-child{white-space:nowrap;width:1%;color:var(--gr)}
.klein{display:block;font-size:.82rem;color:var(--muted);margin-top:2px}

/* Fuss */
.fuss{margin-top:34px;padding:18px;background:#fff;border-radius:var(--r);
  box-shadow:var(--schatten);font-size:.92rem}
.fuss h3{font-size:1rem;margin-bottom:7px;display:flex;align-items:center;gap:8px;color:var(--gr)}
.fuss p{margin-bottom:8px}
.fuss a{color:var(--gr);font-weight:600}
.intern{margin-top:12px;padding-top:12px;border-top:1px dashed var(--linie);
  font-size:.86rem;color:var(--muted)}

@media(max-width:560px){
  .hdr h1{font-size:1.4rem}
  .grid{grid-template-columns:1fr}
  .wrap{padding:24px 13px 60px}
  .tab td:first-child{white-space:normal}
}
html[data-theme="dark"] body{background:#0f172a;color:#e2e8f0}
html[data-theme="dark"] .faq,html[data-theme="dark"] .hcard,
html[data-theme="dark"] .rcard,html[data-theme="dark"] .fuss,
html[data-theme="dark"] .search-box{background:#1f2933;color:#e2e8f0}
html[data-theme="dark"] .faq-q{color:#e2e8f0}
"""

SKRIPT = """
const THEMEN = __DATEN__;

const inp = document.getElementById('hs');
const srDiv = document.getElementById('sr');
const rlDiv = document.getElementById('rl');
const rcDiv = document.getElementById('rc');
const mcDiv = document.getElementById('mc');
const clrBtn = document.getElementById('clearBtn');

function sym(name, extra){
  return '<svg class="ic ' + (extra || '') + '" aria-hidden="true"><use href="#ic-'
    + name + '"/></svg>';
}

// Umlaute vereinheitlichen: Am Handy tippt kaum jemand „Öffnungszeiten“ aus.
// Gesucht und durchsucht wird deshalb in einer Form, in der ö, oe und o
// dasselbe sind — so findet auch „offnungszeiten“ ans Ziel.
function norm(s){
  return String(s).toLowerCase()
    .replace(/ä/g, 'a').replace(/ö/g, 'o').replace(/ü/g, 'u').replace(/ß/g, 'ss')
    .replace(/ae/g, 'a').replace(/oe/g, 'o').replace(/ue/g, 'u');
}

inp.addEventListener('input', function(){
  var q = inp.value.trim().toLowerCase();
  clrBtn.classList.toggle('show', q.length > 0);
  if (!q) { showMain(); return; }
  suche(q);
});

function suche(q){
  var teile = norm(q).split(/\\s+/).filter(function(t){ return t.length > 1; });
  // Gesucht wird in Titel, Kurztext UND Schlagworten: Wer „essen bestellen"
  // eingibt, soll die Bestellhilfe finden, auch wenn sie anders heisst.
  var treffer = THEMEN.filter(function(d){
    var heu = norm(d.titel + ' ' + d.kurz + ' ' + d.tag + ' ' + d.kw);
    return teile.every(function(t){ return heu.indexOf(t) >= 0; });
  });

  srDiv.classList.add('show');
  mcDiv.style.display = 'none';
  rcDiv.textContent = treffer.length
    ? treffer.length + (treffer.length > 1 ? ' Treffer' : ' Treffer') + ' für „' + inp.value.trim() + '“'
    : '';

  if (!treffer.length){
    rlDiv.innerHTML = '<div class="nores">' + sym('lupe')
      + '<br><strong>Nichts gefunden für „' + esc(inp.value.trim()) + '“</strong>'
      + '<br><span style="font-size:.9em">Versuchen Sie ein anderes Wort — oder '
      + 'blättern Sie unten durch die Themen. Sie erreichen uns auch unter '
      + '<a href="tel:+4980826229991" style="color:#2d5016;font-weight:600">08082 / 622 99 91</a>.</span></div>';
    return;
  }

  rlDiv.innerHTML = treffer.map(function(r){
    return '<button type="button" class="rcard" onclick="openFaqAusSuche(\\'' + r.id + '\\')">'
      + '<span class="rs">' + sym(r.sym) + '</span><span>'
      + '<span class="tag">' + r.tag + '</span>'
      + '<span class="rtitle" style="display:block">' + hervor(r.titel, teile) + '</span>'
      + '<span class="rsnip" style="display:block">' + esc(r.kurz) + '</span>'
      + '</span></button>';
  }).join('');
}

function hervor(text, teile){
  var out = esc(text);
  teile.forEach(function(t){
    var re = new RegExp('(' + t.replace(/[.*+?^${}()|[\\]\\\\]/g, '\\\\$&') + ')', 'gi');
    out = out.replace(re, '<mark>$1</mark>');
  });
  return out;
}

function esc(s){
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function showMain(){
  srDiv.classList.remove('show');
  mcDiv.style.display = '';
}

function clearSearch(){
  inp.value = '';
  clrBtn.classList.remove('show');
  showMain();
  inp.focus();
}

function openFaq(id){
  var el = document.getElementById(id);
  if (!el) return false;
  el.classList.add('open');
  var b = el.querySelector('.faq-q');
  if (b) b.setAttribute('aria-expanded', 'true');
  setTimeout(function(){ el.scrollIntoView({ behavior: 'smooth', block: 'start' }); }, 40);
  return false;
}

function openFaqAusSuche(id){
  clearSearch();
  setTimeout(function(){ openFaq(id); }, 110);
}

function toggleFaq(btn){
  var item = btn.closest('.faq');
  var auf = item.classList.toggle('open');
  btn.setAttribute('aria-expanded', auf ? 'true' : 'false');
}

// Aufruf mit Anker: openHilfePopup('faq-push') oder /handbuch/hilfe.html#faq-push
if (location.hash){
  setTimeout(function(){ openFaq(location.hash.slice(1)); }, 150);
}
"""


def bauen():
    daten = suchdaten()
    html = f"""<!DOCTYPE html>
<html lang="de">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Online-Hilfe \u2013 Dorfladen Oberornau</title>
<meta name="description" content="Antworten auf die h\u00e4ufigsten Fragen zur
Website des Dorfladens Oberornau: bestellen, abholen, Benachrichtigungen,
Preisliste und mehr.">
<script src="/js/theme.js"></script>
<link rel="icon" href="/favicon.ico">
<style>{CSS}</style>
</head>
<body>
{sprite()}

<div class="hdr">
  <a href="/" class="back" target="_top">{ic('zurueck', 'ic klein')} Zur\u00fcck zur Startseite</a>
  <h1>{ic('buch')} Online-Hilfe</h1>
  <p>Wie funktioniert was? \u2013 Suchen Sie Ihr Thema oder bl\u00e4ttern Sie unten.</p>
</div>

<div class="search-wrap">
  <div class="search-box">
    {ic('lupe', 'ic si')}
    <input type="search" id="hs" placeholder="Suchen \u2013 z.\u00a0B. bestellen, Barcode, App"
           autocomplete="off" aria-label="In der Hilfe suchen">
    <button id="clearBtn" onclick="clearSearch()" title="Suche leeren"
            aria-label="Suche leeren">&#10005;</button>
  </div>
</div>

<div class="wrap">

  <div id="sr">
    <div class="rc" id="rc"></div>
    <div id="rl"></div>
  </div>

  <div id="mc">

    <h2 class="sh">{ic('haken')} H\u00e4ufig gesucht</h2>
    <div class="ql">
{schnellzugriff()}
    </div>

{''.join('' for _ in GRUPPEN)}

{abschnitte()}

    <div class="fuss">
      <h3>{ic('nachricht')} Nicht gefunden, was Sie suchen?</h3>
      <p>Schreiben Sie uns \u00fcber den Knopf <b>\u201eSchreib uns\u201c</b> unten rechts
         auf der Startseite \u2013 oder rufen Sie an:
         <a href="tel:+4980826229991">08082 / 622 99 91</a>.</p>
      <p>Kommen Sie gerne auch einfach im Laden vorbei. Wir richten Ihnen die App
         und die Benachrichtigungen auf Wunsch direkt auf Ihrem Handy ein.</p>
      <div class="intern">
        Sie arbeiten im Dorfladen? Das Handbuch f\u00fcr den Kiosk \u2013 Kalender,
        Bestellungen und Tagesablauf \u2013 steht unter
        <a href="/help-workflows.html" target="_blank">help-workflows.html</a>.
      </div>
    </div>

  </div>
</div>

<script>
{SKRIPT.replace('__DATEN__', daten)}
</script>
</body>
</html>
"""
    io.open(ZIEL, "w", encoding="utf-8", newline="\n").write(html)
    return html


if __name__ == "__main__":
    h = bauen()
    print(f"ok   {ZIEL} ({len(h)} Zeichen)")
    print(f"ok   {len(THEMEN)} Themen in {len(GRUPPEN)} Gruppen")
    rest = re.findall(r"\b\w*(?:ae|oe|ue)\w*\b", re.sub(r"<[^>]+>", " ", h))
    verdacht = sorted({w for w in rest if not w.lower().startswith(("quelle", "neue", "neuer", "neues"))})
    if verdacht:
        print("   Pruefen (moegliche Umlaute):", ", ".join(verdacht[:25]))
