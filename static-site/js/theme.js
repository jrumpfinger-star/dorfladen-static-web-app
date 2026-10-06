/*
 * theme.js – Dark Mode / Color Theme Support
 * ------------------------------------------------------------
 * - Dark Mode ist global über die CMS-Einstellung `feature_flags.dark_mode`
 *   freigebbar (GET /api/cms-config). Default: NICHT erlaubt (alles hell).
 * - Ist erlaubt, folgt das Theme STRIKT der System-Einstellung
 *   (prefers-color-scheme); es gibt keinen manuellen Umschalter.
 * - Setzt data-theme="dark" | "light" auf <html>. Flackerfrei über den
 *   localStorage-Cache `dl-dark-allowed` (letzte bekannte Freigabe).
 * - Fallback bei nicht erreichbarer API: erlaubt (System).
 *
 * Selbstständig – keine Abhängigkeiten. Auf jeder Seite via
 *   <script src="/js/theme.js"></script>
 * einbinden (möglichst früh im <head> für flimmerfreies Laden).
 */
(function () {
  // ALLOW_KEY = gecachte CMS-Freigabe ('1' | '0') für flackerfreien ersten Paint.
  // Legacy-Key 'dl-theme' (manuelle Wahl) wird bewusst NICHT mehr gesetzt und
  // NICHT gelöscht – lediglich ignoriert.
  var ALLOW_KEY = 'dl-dark-allowed';
  var mql = window.matchMedia ? window.matchMedia('(prefers-color-scheme: dark)') : null;
  var allowedNow = false;

  function systemDark() { return mql ? mql.matches : false; }
  function readAllowCache() {
    try { return localStorage.getItem(ALLOW_KEY); } catch (e) { return null; }
  }
  function writeAllowCache(allowed) {
    try { localStorage.setItem(ALLOW_KEY, allowed ? '1' : '0'); } catch (e) {}
  }

  // --- Zentrale Dark-Mode-Baseline (gilt auf ALLEN Seiten mit theme.js) ---
  // Behebt seitenübergreifend die häufigsten Lücken, ohne jede Seite einzeln
  // patchen zu müssen: Formularfelder (Selects/Inputs/Textareas) bekommen im
  // Dark Mode dunklen Grund + helle Schrift. Element-Selektoren (robust gegen
  // JS-Style-Mutation, anders als [style*=...]).
  (function injectDarkBaseline() {
    try {
      if (document.getElementById('dl-dark-baseline')) return;
      var css =
        /* FN-13 Design-Tokens: zentrale Marken-/Neutral-Tokens (synchron, alle Seiten) */
        ':root{--dl-green:#2d5016;--dl-green-h:#1b5e20;--dl-green-action:#2e7d4f;--dl-green-light:#e8f5e9;--dl-bg:#faf7f2;--dl-surface:#ffffff;--dl-surface2:#f9fafb;--dl-text:#1f2937;--dl-muted:#6b7280;--dl-border:#e5e7eb;--dl-red:#dc2626;--dl-orange:#e65100;--dl-radius:14px;--dl-shadow:0 2px 12px rgba(0,0,0,.08)}' +
        'html[data-theme="dark"]{--dl-green:#5cb85f;--dl-green-h:#74c777;--dl-green-action:#5cb85f;--dl-green-light:#1e2a20;--dl-bg:#12171a;--dl-surface:#1b2228;--dl-surface2:#161c20;--dl-text:#e6eae8;--dl-muted:#9aa6a0;--dl-border:#2a333a}' +
        'html[data-theme="dark"] input:not([type=checkbox]):not([type=radio]):not([type=range]):not([type=color]):not([type=submit]):not([type=button]),' +
        'html[data-theme="dark"] select,' +
        'html[data-theme="dark"] textarea{background-color:#12171a !important;color:#e6eae8 !important;border-color:#2a333a}' +
        'html[data-theme="dark"] input::placeholder,html[data-theme="dark"] textarea::placeholder{color:#7f8a86 !important}' +
        'html[data-theme="dark"] select option{background-color:#1b2228;color:#e6eae8}' +
        /* Gruene Aktions-Buttons: dunkler Text statt weiss (weiss auf #5cb85f nur 2.5:1) */
        'html[data-theme="dark"] .k-btn-confirm,html[data-theme="dark"] .shop-add-btn,html[data-theme="dark"] .push-prompt-yes,html[data-theme="dark"] .submit-btn,html[data-theme="dark"] .success-btn,html[data-theme="dark"] .btn-confirm,html[data-theme="dark"] .fm-reorder-btn-confirm,html[data-theme="dark"] .bs-login button,html[data-theme="dark"] .bs-comment-box button,html[data-theme="dark"] .bs-dialog-ft .bs-btn-ok,html[data-theme="dark"] .k-day-pill.active,html[data-theme="dark"] .k-hist-pill.active,html[data-theme="dark"] .shop-slot-dd-item.active,html[data-theme="dark"] .order-group-hdr,html[data-theme="dark"] .stat.active .label,html[data-theme="dark"] .stat.active .value,html[data-theme="dark"] .refresh-btn,html[data-theme="dark"] .filter-btn.active,html[data-theme="dark"] .filter-btn:hover,html[data-theme="dark"] .pk-btn-done{color:#0f1a12 !important}';
      var s = document.createElement('style');
      s.id = 'dl-dark-baseline';
      s.textContent = css;
      (document.head || document.documentElement).appendChild(s);
    } catch (e) {}
  })();

  // Effektives Theme: nur dunkel, wenn erlaubt UND System dunkel (strikt System).
  function effective(allowed) { return (allowed && systemDark()) ? 'dark' : 'light'; }
  function applyAllowed(allowed) {
    allowedNow = allowed;
    document.documentElement.setAttribute('data-theme', effective(allowed));
  }

  // --- Pre-Paint (synchron): gecachte Freigabe; fehlt => Default "nicht erlaubt" (hell) ---
  applyAllowed(readAllowCache() === '1');

  // Live auf System-Wechsel reagieren (wirkt nur, wenn erlaubt).
  if (mql) {
    var onChange = function () { applyAllowed(allowedNow); };
    if (mql.addEventListener) mql.addEventListener('change', onChange);
    else if (mql.addListener) mql.addListener(onChange);
  }

  // --- Async: aktuelle Freigabe aus CMS laden und einmalig abgleichen ---
  function fromFlags(res) {
    var data = (res && res.data) ? res.data : res;
    var flags = data ? data.feature_flags : null;
    if (typeof flags === 'string') { try { flags = JSON.parse(flags); } catch (e) { flags = null; } }
    return !!(flags && flags.dark_mode === true); // Default: nicht erlaubt
  }
  try {
    fetch('/api/cms-config', { headers: { 'Accept': 'application/json' } })
      .then(function (r) { return r.json(); })
      .then(function (res) {
        var allowed = fromFlags(res);
        writeAllowCache(allowed);
        applyAllowed(allowed);
      })
      .catch(function () {
        // Fallback bei API-Fehler: erlaubt (heutiges Verhalten = System).
        // Cache NICHT überschreiben, damit der nächste Pre-Paint den letzten
        // bekannten Wert nutzt.
        applyAllowed(true);
      });
  } catch (e) {
    applyAllowed(true);
  }

  // Minimale öffentliche API – kein manueller Umschalter/Button mehr (strikt System).
  window.dlGetTheme = function () {
    return document.documentElement.getAttribute('data-theme') || 'light';
  };
  window.dlDarkAllowed = function () { return allowedNow; };
})();

/*
 * Lucide-Icons – zentrale Einbindung für ALLE Seiten (Projekt-Konvention §3).
 * Lädt Lucide einmal via CDN, ersetzt verbliebene Emoji-Icons in Navigation
 * und Footer durch <i data-lucide> und ruft lucide.createIcons() auf.
 * Stellt window.dlRefreshIcons() bereit (z.B. für dynamische Updates in pwa.js).
 */
(function () {
  var LUCIDE_SRC = 'https://unpkg.com/lucide@latest/dist/umd/lucide.min.js';
  // Emoji -> Lucide-Icon-Name (nur für Nav-/Footer-Aktionslinks)
  var MAP = [
    ['\uD83D\uDD14', 'bell'],           // 🔔 Push / Benachrichtigungen
    ['\u2753', 'help-circle'],          // ❓ Hilfe
    ['\uD83D\uDCE6', 'clipboard-list'], // 📦 Bestellungen
    ['\uD83D\uDCDF', 'monitor'],        // 📟 Kiosk
    ['\uD83D\uDE80', 'settings'],       // 🚀 CMS
    ['\uD83D\uDCCB', 'clipboard-list']  // 📋 Preisliste
  ];
  function iconHtml(name) {
    return '<i data-lucide="' + name + '" width="15" height="15" style="vertical-align:-3px;margin-right:4px"></i>';
  }
  function swapInLink(a) {
    // Nur ein führendes Emoji im ersten Text-Node ersetzen; SVGs/hrefs bleiben unangetastet.
    var node = a.firstChild;
    while (node && node.nodeType === 3 && !node.nodeValue.trim()) node = node.nextSibling;
    if (!node || node.nodeType !== 3) return;
    for (var i = 0; i < MAP.length; i++) {
      var emo = MAP[i][0];
      if (node.nodeValue.indexOf(emo) !== -1) {
        var span = document.createElement('span');
        span.innerHTML = iconHtml(MAP[i][1]);
        a.insertBefore(span.firstChild, node);
        node.nodeValue = node.nodeValue.replace(emo, '').replace(/^\s+/, ' ');
        return;
      }
    }
  }
  function convertEmoji() {
    var links = document.querySelectorAll('.nv-links a, .mob-nav a, .ft a, .ft-bottom a');
    for (var i = 0; i < links.length; i++) {
      swapInLink(links[i]);
      // Dunkelgrüne Aktions-Links (inline color:#2d5016) für den Dark Mode markieren.
      // el.style.color liefert normalisiert 'rgb(45, 80, 22)'.
      if (links[i].style && links[i].style.color === 'rgb(45, 80, 22)') {
        links[i].classList.add('dl-nav-action');
      }
    }
  }
  function run() {
    try { convertEmoji(); } catch (e) {}
    if (window.lucide) { try { window.lucide.createIcons(); } catch (e) {} }
  }
  window.dlRefreshIcons = run;
  function ready(fn) {
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', fn);
    else fn();
  }
  if (!window.lucide && !document.getElementById('dl-lucide-js')) {
    var s = document.createElement('script');
    s.id = 'dl-lucide-js';
    s.src = LUCIDE_SRC;
    s.async = true;
    s.onload = function () { ready(run); };
    document.head.appendChild(s);
  } else {
    ready(run);
  }
})();

/* ============================================================
 * Escape schliesst das oberste offene Overlay
 * Spec: specs/dialoge-modal/spec.md, R6-R10
 * ------------------------------------------------------------
 * Seit ein Klick daneben keinen Dialog mehr schliesst (R1), traegt der
 * zweite Weg hinaus mehr Gewicht - und genau der fehlte auf den
 * oeffentlichen Seiten ganz. Dieser Waechter liegt in theme.js, weil die
 * Datei auf 35 von 37 Seiten im <head> steht.
 *
 * Er schliesst nichts selbst, sondern ruft den vorhandenen Schliessweg
 * (mobClosePopup, closeDtModal, closeLightbox, den Schliessknopf). Diese
 * Funktionen fuehren Buch ueber die Seitenrolle und den Verlauf; wer
 * stattdessen nur eine Klasse entfernt, hinterlaesst eine Seite, die sich
 * nicht mehr rollen laesst.
 *
 * Vorfahrt (R8): Der Waechter wartet ab. theme.js liegt im <head> und
 * meldet sich damit VOR allen anderen an - bei gleicher Phase laufen
 * Waechter in Anmeldereihenfolge, er kaeme also zuerst dran. Deshalb
 * merkt er sich beim Tastendruck nur, was offen ist, und sieht einen
 * Augenblick spaeter nach: Hat sich etwas geschlossen, war ein eigener
 * Waechter zustaendig und er haelt still. Nur wenn alles unveraendert
 * dasteht, greift er ein. So schliesst nie mehr als ein Dialog je
 * Tastendruck, ohne dass die neun bestehenden Waechter angefasst werden.
 * ============================================================ */
(function () {
  var bauarten = [];

  /* Fuer Dialoge, die zur Laufzeit entstehen und in keine Sammelbauart
     passen. Erwartet { rang, offen(), schliessen(el) }. */
  window.dlEscapeRegistrieren = function (b) {
    if (!b || typeof b.offen !== 'function' || typeof b.schliessen !== 'function') return;
    bauarten.push({ rang: typeof b.rang === 'number' ? b.rang : 30, offen: b.offen, schliessen: b.schliessen });
  };

  function liste(sel) {
    return Array.prototype.slice.call(document.querySelectorAll(sel));
  }

  function sichtbar(el) {
    if (!el || !el.isConnected) return false;
    var s = window.getComputedStyle(el);
    if (s.display === 'none' || s.visibility === 'hidden' || s.opacity === '0') return false;
    var r = el.getBoundingClientRect();
    return r.width > 0 && r.height > 0;
  }

  function offeneDialoge() {
    var gefunden = [];
    for (var i = 0; i < bauarten.length; i++) {
      var b = bauarten[i], treffer;
      try { treffer = b.offen() || []; } catch (e) { treffer = []; }
      if (treffer.nodeType) treffer = [treffer];
      for (var j = 0; j < treffer.length; j++) {
        if (sichtbar(treffer[j])) gefunden.push({ el: treffer[j], bauart: b });
      }
    }
    return gefunden;
  }

  /* Hoeherer Rang zuerst; bei gleichem Rang das, was spaeter im Baum
     steht - das ist in aller Regel das zuletzt geoeffnete. */
  function oberstes(gefunden) {
    var best = null;
    for (var i = 0; i < gefunden.length; i++) {
      var k = gefunden[i];
      if (!best || k.bauart.rang > best.bauart.rang) { best = k; continue; }
      if (k.bauart.rang === best.bauart.rang &&
          (best.el.compareDocumentPosition(k.el) & Node.DOCUMENT_POSITION_FOLLOWING)) best = k;
    }
    return best;
  }

  /* R10: Wo Escape selbst gebraucht wird, bleibt es unangetastet. */
  function eingabeBrauchtEscape(e) {
    var t = e.target;
    if (!t || !t.tagName) return false;
    if (t.isContentEditable) return true;
    var tag = t.tagName.toLowerCase();
    if (tag === 'select') return true;
    if (t.getAttribute && t.getAttribute('aria-expanded') === 'true') return true;
    if ((tag === 'input' || tag === 'textarea') && t.getAttribute('list')) return true;
    return false;
  }

  document.addEventListener('keydown', function (e) {
    if (e.key !== 'Escape' && e.key !== 'Esc') return;
    if (e.defaultPrevented || e.isComposing) return;
    if (document.querySelector('dialog[open]')) return;   // der Browser macht das selbst
    if (eingabeBrauchtEscape(e)) return;

    var vorher = offeneDialoge();
    if (!vorher.length) return;
    var ziel = oberstes(vorher);
    var anzahl = vorher.length;

    setTimeout(function () {
      if (!sichtbar(ziel.el)) return;              // ein eigener Waechter war schneller
      if (offeneDialoge().length < anzahl) return; // anderswo hat sich etwas geschlossen
      try { ziel.bauart.schliessen(ziel.el); } catch (err) {}
    }, 0);
  });

  /* --- Die Sammelbauarten --- */

  // Lightbox (Startseite, Bilder, Sortiment)
  window.dlEscapeRegistrieren({
    rang: 50,
    offen: function () { return liste('.lightbox-overlay.active'); },
    schliessen: function (el) {
      if (typeof window.closeLightbox === 'function') window.closeLightbox();
      else el.classList.remove('active');
    }
  });

  // Handy-Blaetter
  window.dlEscapeRegistrieren({
    rang: 40,
    offen: function () { return liste('[id^="mob-popup-"].open'); },
    schliessen: function (el) {
      if (typeof window.mobClosePopup === 'function') window.mobClosePopup(el.id.slice(10));
      else el.classList.remove('open');
    }
  });

  // Desktop-Masken der Startseite
  window.dlEscapeRegistrieren({
    rang: 40,
    offen: function () { return liste('[id^="dt-modal-"].open'); },
    schliessen: function (el) {
      if (typeof window.closeDtModal === 'function') window.closeDtModal(el.id.slice(9));
      else el.classList.remove('open');
    }
  });

  // Kiosk-Masken (modal-order, modal-kunde, ...) - sie tragen kein
  // role="dialog" und faenden sonst keine Bauart.
  window.dlEscapeRegistrieren({
    rang: 40,
    offen: function () { return liste('.k-modal-bg'); },
    schliessen: function (el) {
      if (typeof window.closeModal === 'function') window.closeModal(el.id);
      else el.style.display = 'none';
    }
  });

  /* Freier Dialog: alles, was sich als Dialog ausweist. Geschlossen wird
     ueber seinen eigenen Schliessknopf - ohne einen solchen ruehrt der
     Waechter nichts an, denn dann ist nicht bekannt, was Schliessen hier
     bedeutet. Die Cookie-Leiste bleibt aussen vor: Escape waere dort
     weder Zustimmung noch Ablehnung. */
  var SCHLIESSER = '[data-dl-close],.mob-popup-x,.k-modal-x,.dlg-x,.close,[aria-label*="chlie"],[title*="chlie"]';

  function schliessknopf(el) {
    var k = el.querySelector(SCHLIESSER);
    if (k) return k;
    var kandidaten = el.querySelectorAll('button,a');
    for (var i = 0; i < kandidaten.length; i++) {
      var t = (kandidaten[i].textContent || '').trim().toLowerCase();
      if (t === '\u00d7' || t === '\u2715' || t === 'x' ||
          t === 'schlie\u00dfen' || t === 'schliessen' || t === 'abbrechen') return kandidaten[i];
    }
    return null;
  }

  window.dlEscapeRegistrieren({
    rang: 30,
    offen: function () {
      return liste('[role="dialog"]:not(#cookieBar):not(.cookie-bar)').filter(function (el) {
        return !!schliessknopf(el);
      });
    },
    schliessen: function (el) {
      var k = schliessknopf(el);
      if (k) k.click();
    }
  });
})();
