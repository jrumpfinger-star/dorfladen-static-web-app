/* hilfe-popup.js  – Universelles Hilfe-Modal für Homepage & CMS
   Lädt handbuch/hilfe.html in einem DIV-Overlay (kein <dialog> – zu viele Browser-Bugs).
   Einbindung: <script src="hilfe-popup.js"></script>
   Trigger:    openHilfePopup()  oder  openHilfePopup('faq-push')
   Schließen:  Escape, Klick auf Backdrop, ×-Button, Android-Zurück
*/
(function () {
  'use strict';

  /* ── CSS ──────────────────────────────────────────────────────── */
  var style = document.createElement('style');
  style.textContent = [
    '#hilfe-overlay{position:fixed;inset:0;z-index:99999;background:rgba(0,0,0,.6);',
    'display:none;align-items:flex-start;justify-content:center;box-sizing:border-box;}',
    '#hilfe-overlay.open{display:flex;}',
    '#hilfe-dialog-inner{position:relative;margin:24px auto;width:min(94vw,980px);',
    'max-height:calc(100vh - 48px);background:#fff;border-radius:14px;',
    'box-shadow:0 24px 80px rgba(0,0,0,.35);display:flex;flex-direction:column;',
    'overflow:hidden;animation:hilfeSlideUp .25s ease-out;box-sizing:border-box;}',
    '@keyframes hilfeSlideUp{from{opacity:0;transform:translateY(30px)}to{opacity:1;transform:translateY(0)}}',
    '#hilfe-dialog-topbar{display:flex;align-items:center;gap:10px;',
    'padding:14px 18px;background:#2d5016;color:#fff;flex-shrink:0;}',
    '#hilfe-dialog-topbar h2{flex:1;font-size:1.05em;font-weight:700;margin:0;}',
    '#hilfe-close-btn{background:rgba(255,255,255,.15);border:none;color:#fff;',
    'width:44px;height:44px;border-radius:8px;font-size:1.3em;',
    'cursor:pointer;display:flex;align-items:center;justify-content:center;',
    '-webkit-tap-highlight-color:transparent;touch-action:manipulation;}',
    '#hilfe-close-btn:hover{background:rgba(255,255,255,.3);}',
    '#hilfe-close-btn:active{background:rgba(255,255,255,.45);}',
    '#hilfe-dialog-frame{flex:1;border:none;overflow:auto;min-height:0;}',
    '@media(max-width:768px){',
    '#hilfe-dialog-inner{margin:0!important;width:100vw!important;max-width:none!important;',
    'height:100vh!important;height:100dvh!important;max-height:none!important;border-radius:0;}',
    '#hilfe-dialog-frame{width:100%!important;min-height:0;}}'
  ].join('\n');
  document.head.appendChild(style);

  /* ── State ─────────────────────────────────────────────────────── */
  var overlay = null, frame = null;
  var isOpen = false;

  /* ── Build ─────────────────────────────────────────────────────── */
  function build() {
    if (overlay) return;

    overlay = document.createElement('div');
    overlay.id = 'hilfe-overlay';

    var inner = document.createElement('div');
    inner.id = 'hilfe-dialog-inner';

    var topbar = document.createElement('div');
    topbar.id = 'hilfe-dialog-topbar';
    topbar.innerHTML = '<span style="font-size:1.4em">\u2753</span>' +
      '<h2>Online-Hilfe \u2013 Dorfladen Oberornau</h2>';

    var closeBtn = document.createElement('button');
    closeBtn.id = 'hilfe-close-btn';
    closeBtn.title = 'Schlie\u00dfen';
    closeBtn.textContent = '\u2715';
    closeBtn.addEventListener('click', function () { closeHilfe(); });
    closeBtn.addEventListener('touchend', function (e) { e.preventDefault(); closeHilfe(); });
    topbar.appendChild(closeBtn);

    frame = document.createElement('iframe');
    frame.id = 'hilfe-dialog-frame';
    frame.title = 'Dorfladen Online-Hilfe';
    frame.setAttribute('loading', 'lazy');

    inner.appendChild(topbar);
    inner.appendChild(frame);
    overlay.appendChild(inner);
    document.body.appendChild(overlay);

    /* Backdrop-Klick */
    overlay.addEventListener('click', function (e) {
      if (e.target === overlay) closeHilfe();
    });

    /* Escape */
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && isOpen) closeHilfe();
    });

    /* Android Back-Button */
    window.addEventListener('popstate', function () {
      if (isOpen) {
        isOpen = false;
        overlay.classList.remove('open');
        document.body.style.overflow = '';
      }
    });
  }

  /* ── Close ─────────────────────────────────────────────────────── */
  function closeHilfe() {
    if (!isOpen) return;
    isOpen = false;
    overlay.classList.remove('open');
    document.body.style.overflow = '';
    if (history.state && history.state.hilfeOpen) {
      history.back();
    }
  }

  /* ── Basis-URL ─────────────────────────────────────────────────── */
  function hilfeBaseUrl() {
    var scripts = document.querySelectorAll('script[src*="hilfe-popup"]');
    if (scripts.length) {
      var src = scripts[scripts.length - 1].src;
      return src.replace(/hilfe-popup\.js.*$/, '') + 'handbuch/hilfe.html';
    }
    return '/handbuch/hilfe.html';
  }

  /* ── Public API ────────────────────────────────────────────────── */
  window.openHilfePopup = function (anchor) {
    build();
    var url = hilfeBaseUrl();
    if (anchor) url += '#' + anchor;
    if (frame.src !== url) frame.src = url;
    if (!isOpen) {
      isOpen = true;
      history.pushState({ hilfeOpen: true }, '', window.location.href);
      overlay.classList.add('open');
      document.body.style.overflow = 'hidden';
    }
    if (anchor) {
      frame.onload = function () {
        try {
          var el = frame.contentDocument.getElementById(anchor);
          if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
        } catch (ex) {}
      };
    }
  };

  window.closeHilfePopup = function () { closeHilfe(); };
})();
