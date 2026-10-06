/**
 * Gemeinsamer Filter-Baustein der Bestellreiter (Spec kiosk-erfassung-filter).
 *
 * Bäcker, Mair und Getränke zeigen denselben Umschalter mit drei Umfängen:
 *   ueblich · alle · best   ("Übliche", "Alle", "Nur erfasste")
 *
 * Vorher lagen die Filter im Blatt hinter dem „i" und zusätzlich am
 * Listenende — zwei Orte für dieselbe Sache, und keiner davon dort, wo man
 * sie sucht. Jetzt stehen sie neben der Suche:
 *
 *   ab 700 px Bildschirmhöhe   eine eigene Filterzeile mit Trefferzahlen
 *   darunter                   ein Trichter-Symbol, das ein Blatt öffnet
 *
 * Welche Form erscheint, entscheidet CSS (`@media (min-height: …)`) — beide
 * stehen im Markup. So wirkt das Drehen des Geräts sofort.
 *
 * Aufruf im Fachmodul:
 *
 *   h += KFilter.markup(umfaenge, _umfang);      // im festen Kopf
 *   KFilter.binde(panel, function (wahl) { … });  // nach dem Zeichnen
 *
 * `umfaenge` ist [['ueblich','Übliche',57], ['alle','Alle',102], …].
 */
window.KFilter = (function () {
  'use strict';

  var VORGABE = 'ueblich';

  function esc(s) {
    return String(s === null || s === undefined ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  function knoepfe(umfaenge, aktiv, lang) {
    return umfaenge.map(function (u) {
      return '<button type="button" data-umfang="' + esc(u[0]) + '"'
        + (aktiv === u[0] ? ' class="on"' : '') + '>'
        + esc(lang && u[3] ? u[3] : u[1])
        + (u[2] != null ? ' <span class="anz">' + u[2] + '</span>' : '')
        + '</button>';
    }).join('');
  }

  /** Suchfeld-Zusatz, Filterzeile und Auswahlblatt in einem Stück. */
  function markup(umfaenge, aktiv) {
    var gefiltert = aktiv && aktiv !== VORGABE;
    return '<button type="button" class="k-filterknopf' + (gefiltert ? ' aktiv' : '') + '"'
      + ' aria-label="Welche Artikel zeigen?" title="Welche Artikel zeigen?">'
      + '<i data-lucide="list-filter"></i>'
      + (gefiltert ? '<span class="punkt"></span>' : '') + '</button>';
  }

  function zeile(umfaenge, aktiv) {
    return '<div class="k-filterzeile">' + knoepfe(umfaenge, aktiv) + '</div>';
  }

  function blatt(umfaenge, aktiv, extra) {
    return '<div class="k-filterblatt" hidden>'
      + '<div class="k-filterblatt-karte">'
      + '<h4>Welche Artikel zeigen?</h4>'
      + knoepfe(umfaenge, aktiv, true)
      + (extra || '')
      + '</div></div>';
  }

  /**
   * Bindet Zeile, Knopf und Blatt innerhalb von `wurzel`.
   * `beiWahl(umfang)` wird gerufen, wenn sich etwas ändert.
   */
  function binde(wurzel, beiWahl) {
    if (!wurzel) return;
    var bl = wurzel.querySelector('.k-filterblatt');
    var auf = function (ja) {
      if (!bl) return;
      bl.hidden = !ja;
    };

    var knopf = wurzel.querySelector('.k-filterknopf');
    if (knopf) knopf.addEventListener('click', function (e) {
      e.stopPropagation();
      auf(bl && bl.hidden);
    });

    wurzel.querySelectorAll('[data-umfang]').forEach(function (b) {
      b.addEventListener('click', function () {
        auf(false);
        beiWahl(b.dataset.umfang);
      });
    });

    // Danebentippen schliesst das Blatt.
    if (bl) bl.addEventListener('click', function (e) {
      if (e.target === bl) auf(false);
    });
  }

  return { markup: markup, zeile: zeile, blatt: blatt, binde: binde, VORGABE: VORGABE };
})();
