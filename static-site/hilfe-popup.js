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
    margin: 0; padding: 0; border: none;
    background: transparent; width: 100%; height: 100%;
    max-width: 100%; max-height: 100%;
    overflow: hidden;
    display: flex; align-items: flex-start; justify-content: center;
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
  /* Backdrop-Klick-Fläche */
  #hilfe-dialog-backdrop {
    position: fixed; inset: 0; z-index: -1;
    cursor: pointer;
  }
  @media (max-width:768px) {
    #hilfe-dialog-inner {
      margin: 0; width: 100vw;
      max-height: 100vh; max-height: 100dvh;
      border-radius: 0;
    }
    #hilfe-dialog-frame {
      width: 100%; min-width: 0;
    }
  }
  `;
  document.head.appendChild(style);

  /* ── Dialog aufbauen ──────────────────────────────────────────── */
  let dialog, inner, frame;

  function buildDialog() {
    if (dialog) return;
    dialog = document.createElement('dialog');
    dialog.id = 'hilfe-dialog';

    const backdrop = document.createElement('div');
    backdrop.id = 'hilfe-dialog-backdrop';
    backdrop.addEventListener('click', closeDialog);

    inner = document.createElement('div');
    inner.id = 'hilfe-dialog-inner';

    const topbar = document.createElement('div');
    topbar.id = 'hilfe-dialog-topbar';
    topbar.innerHTML = `
      <span style="font-size:1.4em">❓</span>
      <h2>Online-Hilfe – Dorfladen Oberornau</h2>
      <button id="hilfe-close-btn" onclick="closeHilfePopup()" title="Schließen">✕</button>
    `;

    frame = document.createElement('iframe');
    frame.id = 'hilfe-dialog-frame';
    frame.title = 'Dorfladen Online-Hilfe';
    frame.setAttribute('loading', 'lazy');

    inner.appendChild(topbar);
    inner.appendChild(frame);
    dialog.appendChild(backdrop);
    dialog.appendChild(inner);
    document.body.appendChild(dialog);

    /* Escape-Taste schließt Dialog */
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && dialog.open) closeDialog();
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
    if (!dialog.open) dialog.showModal ? dialog.showModal() : (dialog.open = true);
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
    if (!dialog) return;
    if (dialog.close) dialog.close();
    else dialog.open = false;
  }
})();
