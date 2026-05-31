/* hilfe-popup.js  – Universelles Hilfe-Modal für Homepage & CMS
   Lädt handbuch/hilfe.html in einem <dialog>-Overlay.
   Einbindung: <script src="hilfe-popup.js"></script>
   Trigger:    openHilfePopup()  oder  openHilfePopup('faq-push')
   Schließen:  Escape, Klick auf Backdrop oder eigener ×-Button
*/
(function () {
  'use strict';

  /* ── CSS injizieren ─────────────────────────────────────────── */
  const style = document.createElement('style');
  style.textContent = `
  #hilfe-dialog {
    position: fixed; inset: 0; z-index: 99999;
    margin: 0 !important; padding: 0 !important; border: none;
    background: transparent;
    width: 100vw !important; height: 100vh !important;
    max-width: none !important; max-height: none !important;
    overflow: hidden;
    display: flex; align-items: flex-start; justify-content: center;
    box-sizing: border-box;
  }
  #hilfe-dialog[open] { display: flex; }
  #hilfe-dialog::backdrop {
    background: rgba(0,0,0,.6);
    backdrop-filter: blur(3px);
  }
  #hilfe-dialog-inner {
    position: relative;
    margin: 24px auto;
    width: min(94vw, 980px);
    max-height: calc(100vh - 48px);
    background: #fff;
    border-radius: 14px;
    box-shadow: 0 24px 80px rgba(0,0,0,.35);
    display: flex; flex-direction: column;
    overflow: hidden;
    animation: hilfeSlideUp .25s ease-out;
    box-sizing: border-box;
  }
  @keyframes hilfeSlideUp {
    from { opacity:0; transform:translateY(30px); }
    to   { opacity:1; transform:translateY(0); }
  }
  #hilfe-dialog-topbar {
    display: flex; align-items: center; gap: 10px;
    padding: 14px 18px; background: #2d5016; color: #fff;
    flex-shrink: 0;
  }
  #hilfe-dialog-topbar h2 {
    flex: 1; font-size: 1.05em; font-weight: 700; margin: 0;
  }
  #hilfe-close-btn {
    background: rgba(255,255,255,.15); border: none; color: #fff;
    width: 32px; height: 32px; border-radius: 8px; font-size: 1.1em;
    cursor: pointer; display: flex; align-items: center; justify-content: center;
    transition: background .15s;
  }
  #hilfe-close-btn:hover { background: rgba(255,255,255,.3); }
  #hilfe-dialog-frame {
    flex: 1; border: none; overflow: auto;
    min-height: 0;
  }
  /* Klick-Bereich auf dem Dialog (außerhalb von inner) schließt */
  #hilfe-dialog { cursor: pointer; }
  #hilfe-dialog-inner { cursor: default; }
  @media (max-width:768px) {
    #hilfe-dialog-inner {
      margin: 0 !important;
      width: 100vw !important; max-width: none !important;
      height: 100vh !important; height: 100dvh !important; max-height: none !important;
      border-radius: 0;
    }
    #hilfe-dialog-frame {
      width: 100% !important; min-width: 0;
    }
  }
  `;
  document.head.appendChild(style);

  /* ── Dialog aufbauen ──────────────────────────────────────────── */
  let dialog, inner, frame;
  var _closing = false;

  function buildDialog() {
    if (dialog) return;
    dialog = document.createElement('dialog');
    dialog.id = 'hilfe-dialog';

    inner = document.createElement('div');
    inner.id = 'hilfe-dialog-inner';

    const topbar = document.createElement('div');
    topbar.id = 'hilfe-dialog-topbar';
    topbar.innerHTML = `
      <span style="font-size:1.4em">❓</span>
      <h2>Online-Hilfe – Dorfladen Oberornau</h2>
    `;

    /* Schließen-Button — direkter addEventListener statt inline onclick */
    const closeBtn = document.createElement('button');
    closeBtn.id = 'hilfe-close-btn';
    closeBtn.title = 'Schließen';
    closeBtn.textContent = '✕';
    closeBtn.addEventListener('click', function (e) {
      e.stopPropagation();
      closeDialog();
    });
    topbar.appendChild(closeBtn);

    frame = document.createElement('iframe');
    frame.id = 'hilfe-dialog-frame';
    frame.title = 'Dorfladen Online-Hilfe';
    frame.setAttribute('loading', 'lazy');

    inner.appendChild(topbar);
    inner.appendChild(frame);
    dialog.appendChild(inner);
    document.body.appendChild(dialog);

    /* 1) Native dialog cancel-Event (Escape-Taste + Android Back in manchen Browsern) */
    dialog.addEventListener('cancel', function (e) {
      e.preventDefault();
      closeDialog();
    });

    /* 2) Escape-Taste als Fallback */
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && dialog.open) closeDialog();
    });

    /* 3) Klick auf Backdrop (::backdrop ist Pseudo-Element, daher Klick auf dialog selbst prüfen) */
    dialog.addEventListener('click', function (e) {
      if (e.target === dialog) closeDialog();
    });

    /* 4) Android Back-Button / Browser-Zurück via popstate
       popstate hat den History-Eintrag bereits entfernt,
       daher direkt schließen ohne history.back() */
    window.addEventListener('popstate', function () {
      if (dialog && dialog.open && !_closing) {
        _closing = true;
        try { dialog.close(); } catch (_) { dialog.open = false; }
        setTimeout(function () { _closing = false; }, 50);
      }
    });
  }

  /* ── Basis-URL bestimmen ──────────────────────────────────────── */
  function hilfeBaseUrl() {
    /* Funktioniert vom Root (/) und aus Unterordnern */
    const scripts = document.querySelectorAll('script[src*="hilfe-popup"]');
    if (scripts.length) {
      const src = scripts[scripts.length - 1].src;
      return src.replace(/hilfe-popup\.js.*$/, '') + 'handbuch/hilfe.html';
    }
    return '/handbuch/hilfe.html';
  }

  /* ── API ──────────────────────────────────────────────────────── */
  window.openHilfePopup = function (anchor) {
    buildDialog();
    let url = hilfeBaseUrl();
    if (anchor) url += '#' + anchor;
    if (frame.src !== url) frame.src = url;
    if (!dialog.open) {
      /* History-Eintrag für Android-Zurück-Button */
      history.pushState({ hilfeOpen: true }, '', window.location.href);
      dialog.showModal ? dialog.showModal() : (dialog.open = true);
    }
    /* Scrolle im iframe nach dem Laden zum Anker */
    if (anchor) {
      frame.onload = function () {
        try {
          const el = frame.contentDocument.getElementById(anchor);
          if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
        } catch (_) {}
      };
    }
  };

  window.closeHilfePopup = function () { closeDialog(); };

  function closeDialog() {
    if (!dialog || !dialog.open || _closing) return;
    _closing = true;
    try {
      /* Dialog schließen */
      if (dialog.close) dialog.close();
      else dialog.open = false;
    } catch (_) { dialog.open = false; }
    /* History-Eintrag entfernen, wenn wir nicht schon durch popstate geschlossen haben */
    var needBack = history.state && history.state.hilfeOpen;
    /* _closing erst NACH history.back zurücksetzen (setTimeout), damit
       ein synchron gefeuerten popstate-Event in Firefox nicht re-entered */
    if (needBack) {
      history.back();
      setTimeout(function () { _closing = false; }, 50);
    } else {
      _closing = false;
    }
  }
})();
