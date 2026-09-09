/* Hilfeschicht des CMS-Umbaus.
   =============================

   Wird ausschließlich von `cms-neu.html` geladen und ergänzt die bestehende
   Oberfläche **von außen**. Sie ruft nichts in `cms.js` auf und ändert dort
   nichts — die 10 639 Zeilen Fachlogik bleiben unangetastet (Spec
   cms-redesign, Non-Goals).

   Aufgabe: Auf dem Telefon ist die Navigation ein Blatt über dem Inhalt.
   15 Bereiche in einer Fußleiste wären nicht zu treffen. Dieses Blatt
   braucht einen Knopf zum Öffnen und muss sich nach der Auswahl von selbst
   schließen — mehr tut diese Datei nicht.
*/
(function () {
  'use strict';

  var AUF = 'cmsneu-nav-auf';

  function knopf() { return document.getElementById('cmsneu-menue-btn'); }
  function nav() { return document.querySelector('.cmsneu-nav'); }

  function auf() { return document.body.classList.contains(AUF); }

  function setze(offen) {
    document.body.classList.toggle(AUF, !!offen);
    var k = knopf();
    if (k) k.setAttribute('aria-expanded', offen ? 'true' : 'false');
  }

  /* Der Knopf trägt den Namen des Bereichs, in dem man gerade ist. Sonst
     müsste man das Blatt öffnen, um zu sehen, wo man sich befindet. */
  function beschriftungNachfuehren() {
    var aktiv = document.querySelector('.cmsneu-nav .cms-tab.active');
    var ziel = document.querySelector('.cmsneu-menue-txt');
    if (!aktiv || !ziel) return;
    var text = (aktiv.textContent || '').replace(/\s+/g, ' ').trim();
    if (text) ziel.textContent = text;
  }

  function start() {
    var k = knopf(), n = nav();
    if (!k || !n) return;

    k.addEventListener('click', function () { setze(!auf()); });

    // Auswahl schließt das Blatt. Der Wechsel selbst läuft weiterhin über
    // die zentrale Delegation von cms.js - hier wird nichts abgefangen.
    n.addEventListener('click', function (ev) {
      if (ev.target === n) { setze(false); return; }      // neben das Blatt
      if (ev.target.closest && ev.target.closest('.cms-tab')) {
        setze(false);
        setTimeout(beschriftungNachfuehren, 0);
      }
    });

    document.addEventListener('keydown', function (ev) {
      if (ev.key === 'Escape' && auf()) setze(false);
    });

    // Beim Wechsel über die Adresszeile oder den Verlauf ändert cms.js die
    // Klassen der Reiter. Ein Beobachter hält die Beschriftung nach.
    var tabs = document.getElementById('cms-tabs-scroll');
    if (tabs && window.MutationObserver) {
      new MutationObserver(beschriftungNachfuehren).observe(tabs, {
        subtree: true, attributes: true, attributeFilter: ['class']
      });
    }

    beschriftungNachfuehren();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start);
  } else {
    start();
  }
})();
