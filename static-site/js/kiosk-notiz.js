/* Hinweis zur Bestellung — Textgestalter für Bäcker und Metzger
   ===============================================================

   Zu jeder Bäcker- und Metzger-Bestellung darf ein Freitext mitgegeben
   werden, der auf dem Bestellformular mitgedruckt wird (Spec
   `bestell-freitext`, F1/F2/F6). Erfasst wird er hier.

   Warum ein eigenes Modul? Der Gestalter wird an zwei Stellen gebraucht —
   im Bäcker- und im Metzger-Reiter. Zweimal dasselbe zu bauen hieße, jeden
   Fehler zweimal zu beheben. Die Fachmodule reichen nur ihren Text herein
   und bekommen ihn zurück; von Dialog, Bearbeitungsleiste und Zeichenzähler
   wissen sie nichts.

   Benutzung::

       KNotiz.oeffnen({
         html: '<p>Bitte früh liefern</p>',   // bisheriger Stand
         gesperrt: false,                     // nur lesbar?
         titel: 'Hinweis für die Metzgerei',
         uebernehmen: function (notiz) { … }  // {html, text} oder null
       });

   Die Gestaltung selbst läuft über `document.execCommand`. Das gilt als
   veraltet, ist aber in jedem Zielbrowser vorhanden und wird ohne Ersatz
   nicht verschwinden. Wichtiger: Der Kiosk ist hier **nicht** die
   Sicherheitsgrenze — der Server baut den Text ohnehin aus einer
   Positivliste neu auf. Der Gestalter muss also nicht sauber arbeiten, nur
   bequem sein. */
(function () {
  'use strict';

  var GRENZE = 1000;          // Zeichen reiner Text, wie in der API
  var _zu = null;             // Aufräumfunktion des offenen Dialogs

  var KNOEPFE = [
    { befehl: 'bold', text: 'Fett', stil: 'font-weight:600' },
    { befehl: 'italic', text: 'Kursiv', stil: 'font-style:italic' },
    { befehl: 'underline', text: 'Unterstrichen', stil: 'text-decoration:underline' },
    { befehl: 'insertUnorderedList', text: 'Aufzählung', stil: '' }
  ];

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c];
    });
  }

  /* Reiner Text eines Bereichs - dieselbe Rechnung wie in der API:
     Absätze und Aufzählungspunkte zählen als Zeilen, Auszeichnungen nicht. */
  function reinerText(el) {
    if (!el) return '';
    var t = el.innerText || el.textContent || '';
    return t.replace(/\u00a0/g, ' ').replace(/\s+\n/g, '\n').trim();
  }

  function laenge(el) {
    return reinerText(el).replace(/\n/g, '').length;
  }

  /* Der Textgestalter darf beim Einfügen keine fremde Gestaltung
     übernehmen (F2): Aus einer Webseite oder aus Word kämen sonst Farben,
     Schriftgrößen und Verweise mit, die auf dem Formular nichts verloren
     haben und die der Server ohnehin wieder entfernt. */
  function einfuegenOhneGestaltung(ev) {
    ev.preventDefault();
    var text = '';
    if (ev.clipboardData) text = ev.clipboardData.getData('text/plain');
    else if (window.clipboardData) text = window.clipboardData.getData('Text');
    if (!text) return;
    if (document.queryCommandSupported && document.queryCommandSupported('insertText')) {
      document.execCommand('insertText', false, text);
    } else {
      document.execCommand('paste', false, text);
    }
  }

  function baueDialog(opt) {
    var hg = document.createElement('div');
    hg.className = 'k-modal-bg kn-bg open';
    hg.setAttribute('role', 'dialog');
    hg.setAttribute('aria-modal', 'true');
    hg.setAttribute('aria-label', opt.titel || 'Hinweis zur Bestellung');

    var leiste = '';
    if (!opt.gesperrt) {
      leiste = '<div class="kn-leiste">' + KNOEPFE.map(function (k) {
        return '<button type="button" class="kn-werkzeug" data-befehl="' + k.befehl
          + '"' + (k.stil ? ' style="' + k.stil + '"' : '') + '>' + esc(k.text)
          + '</button>';
      }).join('') + '</div>';
    }

    hg.innerHTML =
      '<div class="k-modal kn-modal">'
      + '<div class="k-modal-head"><h2>' + esc(opt.titel || 'Hinweis zur Bestellung')
      + '</h2><button type="button" class="k-modal-close kn-abbruch"'
      + ' aria-label="Schließen">✕</button></div>'
      + '<div class="k-modal-body">'
      + '<p class="kn-erklaerung">' + esc(opt.erklaerung
        || 'Dieser Text wird auf dem Bestellformular mitgedruckt.') + '</p>'
      + leiste
      + '<div class="kn-feld" contenteditable="' + (opt.gesperrt ? 'false' : 'true')
      + '" role="textbox" aria-multiline="true"'
      + (opt.gesperrt ? ' aria-readonly="true"' : '')
      + ' aria-label="Hinweistext"></div>'
      + '<div class="kn-zaehler" aria-live="polite"></div>'
      + '</div>'
      + '<div class="k-modal-footer">'
      + (opt.gesperrt
        ? '<button type="button" class="k-btn k-btn-outline kn-abbruch">Schließen</button>'
        : '<button type="button" class="k-btn k-btn-outline kn-abbruch">Abbrechen</button>'
        + '<button type="button" class="k-btn k-btn-confirm kn-ok">Übernehmen</button>')
      + '</div></div>';
    return hg;
  }

  function oeffnen(opt) {
    opt = opt || {};
    schliessen();

    var hg = baueDialog(opt);
    document.body.appendChild(hg);

    var feld = hg.querySelector('.kn-feld');
    var zaehler = hg.querySelector('.kn-zaehler');
    feld.innerHTML = opt.html || '';

    function zaehle() {
      var n = laenge(feld);
      var rest = GRENZE - n;
      zaehler.textContent = rest >= 0
        ? 'Noch ' + rest + ' Zeichen frei'
        : 'Bitte um ' + (-rest) + ' Zeichen kürzen';
      zaehler.className = 'kn-zaehler' + (rest < 0 ? ' voll' : (rest < 100 ? ' knapp' : ''));
      var ok = hg.querySelector('.kn-ok');
      if (ok) ok.disabled = rest < 0;
    }

    if (!opt.gesperrt) {
      hg.querySelectorAll('.kn-werkzeug').forEach(function (b) {
        b.addEventListener('mousedown', function (ev) { ev.preventDefault(); });
        b.addEventListener('click', function () {
          feld.focus();
          document.execCommand(b.getAttribute('data-befehl'), false, null);
          zaehle();
        });
      });
      feld.addEventListener('paste', einfuegenOhneGestaltung);
      feld.addEventListener('input', zaehle);
      /* Über die Grenze hinaus wird gar nicht erst getippt (F6). Steuer- und
         Bewegungstasten müssen immer durchkommen, sonst ließe sich ein zu
         langer Text nicht mehr kürzen. */
      feld.addEventListener('keydown', function (ev) {
        if (ev.key && ev.key.length === 1 && !ev.ctrlKey && !ev.metaKey
            && laenge(feld) >= GRENZE && !fensterHatAuswahl(feld)) {
          ev.preventDefault();
        }
      });
    }

    function fertig(wert) {
      schliessen();
      if (opt.uebernehmen) opt.uebernehmen(wert);
    }

    hg.querySelectorAll('.kn-abbruch').forEach(function (b) {
      b.addEventListener('click', function () { schliessen(); });
    });
    var ok = hg.querySelector('.kn-ok');
    if (ok) {
      ok.addEventListener('click', function () {
        var text = reinerText(feld);
        fertig(text ? { html: feld.innerHTML, text: text } : null);
      });
    }
    hg.addEventListener('mousedown', function (ev) {
      if (ev.target === hg) schliessen();
    });

    function taste(ev) {
      if (ev.key === 'Escape') { schliessen(); }
    }
    document.addEventListener('keydown', taste);

    _zu = function () {
      document.removeEventListener('keydown', taste);
      if (hg.parentNode) hg.parentNode.removeChild(hg);
      _zu = null;
    };

    zaehle();
    if (!opt.gesperrt) setTimeout(function () { feld.focus(); }, 30);
    return hg;
  }

  function fensterHatAuswahl(feld) {
    var s = window.getSelection && window.getSelection();
    return !!(s && !s.isCollapsed && feld.contains(s.anchorNode));
  }

  function schliessen() { if (_zu) _zu(); }

  /* Kurzfassung für den Knopf in der Bestellansicht: die ersten Wörter des
     Hinweises, damit man ohne Öffnen sieht, worum es geht. */
  function kurz(notiz, zeichen) {
    var t = notiz && (notiz.text || notiz.html) ? (notiz.text || '') : '';
    if (!t && notiz && notiz.html) {
      var h = document.createElement('div');
      h.innerHTML = notiz.html;
      t = h.textContent || '';
    }
    t = String(t).replace(/\s+/g, ' ').trim();
    var max = zeichen || 40;
    return t.length > max ? t.slice(0, max - 1).trim() + '…' : t;
  }

  function hatText(notiz) { return !!kurz(notiz, 200); }

  window.KNotiz = {
    oeffnen: oeffnen,
    schliessen: schliessen,
    kurz: kurz,
    hatText: hatText,
    GRENZE: GRENZE
  };
})();
