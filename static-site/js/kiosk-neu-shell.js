/* ═══════════════════════════════════════════════════════════════════════
   Kiosk-Umbau — Hilfeschicht
   Wird nur von kiosk-neu.html geladen und liegt über den bestehenden
   Modulen. Sie ruft ausschließlich vorhandene Funktionen auf und ändert
   keine. Dadurch bleibt die Fachlogik unberührt.

   Spec:  specs/kiosk-umbau/spec.md  (F5, F9)
   Plan:  specs/kiosk-umbau/plan.md
   ═══════════════════════════════════════════════════════════════════════ */
(function () {
  'use strict';

  var KNeu = window.KNeu = {};

  // ── Symbole nachziehen ────────────────────────────────────────────────
  // Die Module schreiben laufend neues HTML in die Reiter. Lucide ersetzt
  // <i data-lucide> nur beim Aufruf, deshalb nach jeder Änderung nachziehen –
  // gebündelt, damit es nicht bei jedem einzelnen Knoten passiert.
  var symbolLauf = null;
  function symboleNachziehen() {
    if (symbolLauf) return;
    symbolLauf = requestAnimationFrame(function () {
      symbolLauf = null;
      try {
        if (window.lucide && typeof window.lucide.createIcons === 'function') {
          window.lucide.createIcons();
        }
      } catch (e) { /* Darstellung darf die Bedienung nie blockieren */ }
    });
  }

  // ── Hinweiszeile am unteren Rand („Zuletzt: … · Rückgängig") ─────────
  var meldeBox = null;
  function meldeBereich() {
    if (meldeBox && document.body.contains(meldeBox)) return meldeBox;
    meldeBox = document.createElement('div');
    meldeBox.className = 'kneu-melder';
    meldeBox.setAttribute('role', 'status');
    meldeBox.setAttribute('aria-live', 'polite');
    document.body.appendChild(meldeBox);
    return meldeBox;
  }

  /**
   * Zeigt eine Rückmeldung in Alltagssprache. Optional mit einer
   * Rücknahme-Schaltfläche (F5: „Rückgängig oder Rückfrage").
   *
   * @param {string} text     Was gerade passiert ist, in Klartext.
   * @param {object} [opt]    { art:'gut'|'warn'|'fehler', zurueck:Function, dauer:number }
   */
  KNeu.melden = function (text, opt) {
    opt = opt || {};
    var box = meldeBereich();
    var kachel = document.createElement('div');
    kachel.className = 'kneu-meld kneu-meld-' + (opt.art || 'gut');

    var span = document.createElement('span');
    span.className = 'kneu-meld-txt';
    span.textContent = text;
    kachel.appendChild(span);

    var weg = function () {
      kachel.classList.add('kneu-meld-aus');
      setTimeout(function () { if (kachel.parentNode) kachel.parentNode.removeChild(kachel); }, 200);
    };

    if (typeof opt.zurueck === 'function') {
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'kneu-meld-btn';
      btn.textContent = 'Rückgängig';
      btn.addEventListener('click', function () {
        weg();
        try { opt.zurueck(); } catch (e) { KNeu.melden('Das Rückgängigmachen hat nicht geklappt. Bitte noch einmal versuchen.', { art: 'fehler' }); }
      });
      kachel.appendChild(btn);
    }

    var zu = document.createElement('button');
    zu.type = 'button';
    zu.className = 'kneu-meld-zu';
    zu.setAttribute('aria-label', 'Hinweis schließen');
    zu.textContent = '×';
    zu.addEventListener('click', weg);
    kachel.appendChild(zu);

    box.appendChild(kachel);
    setTimeout(weg, opt.dauer || (opt.zurueck ? 9000 : 4500));
    return kachel;
  };

  // ── Bäcker: nur Bäckerei und Liefertag bleiben stehen ────────────────
  //
  // Der Kopf des Bäcker-Reiters ist ein einziger Block (.bk-sticky). Das
  // Gestaltungsblatt dreht seine Reihenfolge so, dass Bäckereileiste und
  // Tagesleiste unten liegen. Damit beim Scrollen genau diese Scheibe
  // stehen bleibt und der Rest darüber hinausgeschoben wird, muss `top`
  // negativ sein — um die Höhe des Teils, der wegscrollen darf.
  //
  // Diese Höhe kann nur der Browser kennen: Der Testbetrieb-Hinweis und der
  // Rücksetz-Knopf erscheinen je nach Lage, und der Statustext bricht je
  // nach Breite um. Deshalb wird nach jeder Änderung neu gemessen.
  var kopfLauf = null;

  /**
   * Setzt den Versatz, mit dem der Bäcker-Kopf einrastet.
   *
   * Alles oberhalb der Bäckereileiste (Statusblock, Hinweise, Werkzeuge)
   * darf beim Scrollen hinausgeschoben werden; Bäckerei und Liefertag
   * bleiben stehen. Der Versatz ist deshalb negativ und so groß wie der
   * Teil, der wegdarf.
   *
   * Zwei Feinheiten, die beim Bauen Zeit gekostet haben:
   *  - Gemessen wird der Abstand zwischen zwei Rechtecken desselben
   *    Elternelements. Der bleibt gleich, ob der Kopf anliegt oder nicht -
   *    `offsetTop` wich um ein paar Pixel ab.
   *  - Der Bezugsrahmen für `top` beginnt am Innenrand des Reiters, nicht
   *    an dessen Außenkante. Ohne diesen Ausgleich säße der Kopf um den
   *    Innenabstand zu tief und die Zeile darunter schaute darüber hervor.
   *
   * Nachgezogen wird auch beim Scrollen: Symbole und Schriften laden nach
   * und verschieben den Kopf sonst um wenige Pixel gegen die Oberkante.
   */
  function baeckerKopfSetzen() {
    var kopf = document.querySelector('#panel-baecker .bk-sticky');
    if (!kopf) return;
    var erster = kopf.querySelector('.bk-sub');
    if (!erster) { kopf.style.top = '0px'; return; }

    var k = kopf.getBoundingClientRect();
    var e = erster.getBoundingClientRect();
    var weg = Math.max(0, Math.round(e.top - k.top));

    var reiter = kopf.closest('.k-panel');
    var luft = reiter ? (parseFloat(getComputedStyle(reiter).paddingTop) || 0) : 0;

    var neu = -(weg + luft) + 'px';
    if (kopf.style.top !== neu) kopf.style.top = neu;
  }

  function baeckerKopf() {
    if (kopfLauf) return;
    kopfLauf = requestAnimationFrame(function () {
      kopfLauf = null;
      try { baeckerKopfSetzen(); }
      catch (err) { /* Darstellung darf die Bedienung nie blockieren */ }
    });
  }
  KNeu.baeckerKopf = baeckerKopf;

  function baeckerKopfBeobachten() {
    var reiter = document.getElementById('panel-baecker');
    if (!reiter) return;
    reiter.addEventListener('scroll', baeckerKopf, { passive: true });
  }

  /* ── Werkzeugleiste: die beiden Umschalter als ein Segment ────────────
   *
   * Die Leiste enthaelt zwei Umschalter ("Uebliche Artikel" /
   * "Alle Artikel 60") und den Knopf "Auf letzten <Wochentag>
   * zuruecksetzen". Zusammen sind sie 500 px breit und passen auf dem
   * Handy nicht in eine Zeile.
   *
   * Ein Rollstreifen verbarg, was noch kommt; Text abzukuerzen machte
   * die Knoepfe unlesbar. Beides ist verworfen. Hier werden die beiden
   * Umschalter nur als zusammengehoeriges Segment markiert - das
   * Gestaltungsblatt zeichnet sie dann mit einem gemeinsamen Rahmen.
   * Das spart Breite, ohne ein einziges Wort zu verstecken.
   */
  function baeckerWerkzeuge() {
    var leiste = document.querySelector('#panel-baecker .bk-tools');
    if (!leiste) return;
    var umschalter = leiste.querySelectorAll('[onclick*="KBaecker.umfang"]');
    if (umschalter.length !== 2) return;
    umschalter[0].classList.add('kn-seg', 'kn-seg-a');
    umschalter[1].classList.add('kn-seg', 'kn-seg-b');
  }

  // ── Mittagstisch: der gewählte Tag bleibt beim Scrollen sichtbar ─────
  //
  // Die Tagesleiste klebt nicht mehr (13.10 im Gestaltungsblatt) - zwei
  // klebende Leisten kosteten bei 360 px zusammen 213 px Kopfhöhe. Damit
  // trotzdem jederzeit erkennbar ist, welcher Tag gerade angezeigt wird,
  // wandert er als erstes Feld in die klebende Filterleiste. Ein Antippen
  // rollt zur Tagesleiste zurück — Tag wechseln bleibt ein Griff.
  function mittagTagFeld() {
    var leiste = document.getElementById('mittag-status-bar');
    var bar = document.getElementById('mittag-day-bar');
    if (!leiste || !bar) return;

    var aktiv = bar.querySelector('.k-day-pill.active');
    var feld = leiste.querySelector('.k-tag-jetzt');
    if (!aktiv) {
      if (feld && feld.parentNode) feld.parentNode.removeChild(feld);
      return;
    }
    if (!feld) {
      feld = document.createElement('button');
      feld.type = 'button';
      feld.className = 'k-tag-jetzt';
      feld.title = 'Anderen Tag wählen';
      feld.addEventListener('click', function () {
        var panel = document.getElementById('panel-mittag');
        if (!panel) return;
        try { panel.scrollTo({ top: 0, behavior: 'smooth' }); }
        catch (e) { panel.scrollTop = 0; }
      });
      leiste.insertBefore(feld, leiste.firstChild);
    }

    var teile = [];
    [].forEach.call(aktiv.querySelectorAll('span'), function (s) {
      var t = s.textContent.replace(/\s+/g, ' ').trim();
      if (t) teile.push(t);
    });
    // Ohne Vorwort: "Heute · 08.09" erklärt sich selbst und spart 30 px in
    // einer Leiste, in der jeder Millimeter über eine weitere Zeile entscheidet.
    var text = teile.length ? teile.join(' · ') : aktiv.textContent.trim();
    if (feld.textContent !== text) feld.textContent = text;
  }

  // Ein eigener, enger Beobachter nur für die Tagesleiste. Der große
  // Beobachter unten darf keine Attribute verfolgen: `baeckerWerkzeuge()`
  // setzt selbst Klassen und würde sich sonst endlos wieder aufrufen.
  var _mtTagBeob = null;
  function mittagTagBeobachten() {
    var bar = document.getElementById('mittag-day-bar');
    if (!bar || _mtTagBeob || !window.MutationObserver) return;
    _mtTagBeob = new MutationObserver(mittagTagFeld);
    _mtTagBeob.observe(bar, {
      childList: true, subtree: true,
      attributes: true, attributeFilter: ['class'],
    });
  }

  // ── Reiterwechsel: Liste nach oben, Symbole nachziehen ───────────────
  function reiterBeobachten() {
    var leiste = document.querySelector('.k-tabs');
    if (!leiste) return;
    leiste.addEventListener('click', function () {
      symboleNachziehen();
      baeckerWerkzeuge();
      baeckerKopf();
      mittagTagFeld();
      requestAnimationFrame(function () {
        var offen = document.querySelector('.k-panel.active');
        if (offen && offen.scrollTop > 0) offen.scrollTop = 0;
      });
    });
  }

  // ── Änderungen in den Reitern verfolgen ──────────────────────────────
  function inhalteBeobachten() {
    var haupt = document.querySelector('.k-main');
    if (!haupt || !window.MutationObserver) return;
    var beob = new MutationObserver(function () {
      symboleNachziehen();
      baeckerWerkzeuge();
      baeckerKopf();
      mittagTagFeld();
    });
    beob.observe(haupt, { childList: true, subtree: true });
  }

  // ── Start ────────────────────────────────────────────────────────────
  function start() {
    reiterBeobachten();
    inhalteBeobachten();
    baeckerKopfBeobachten();
    mittagTagBeobachten();
    symboleNachziehen();
    baeckerWerkzeuge();
    baeckerKopf();
    mittagTagFeld();
    window.addEventListener('resize', baeckerKopf);
    document.documentElement.classList.add('kneu');
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start);
  } else {
    start();
  }
})();
