/*
 * theme.js – Dark Mode / Color Theme Support
 * ------------------------------------------------------------
 * - Respektiert die Browser-/System-Einstellung (prefers-color-scheme)
 * - Manueller Toggle (Hell / Dunkel / System) mit Speicherung in localStorage
 * - Setzt data-theme="dark" | "light" auf <html>; ohne Wahl folgt es dem System
 * - Fügt einen kleinen Umschalt-Button unten rechts ein
 *
 * Selbstständig – keine Abhängigkeiten. Auf jeder Seite via
 *   <script src="/js/theme.js"></script>
 * einbinden (möglichst früh im <head> für flimmerfreies Laden).
 */
(function () {
  var STORAGE_KEY = 'dl-theme'; // 'dark' | 'light' | 'system'
  var mql = window.matchMedia ? window.matchMedia('(prefers-color-scheme: dark)') : null;

  function stored() {
    try { return localStorage.getItem(STORAGE_KEY) || 'system'; } catch (e) { return 'system'; }
  }
  function save(v) {
    try { localStorage.setItem(STORAGE_KEY, v); } catch (e) {}
  }
  function systemDark() { return mql ? mql.matches : false; }

  function effective(pref) {
    if (pref === 'dark') return 'dark';
    if (pref === 'light') return 'light';
    return systemDark() ? 'dark' : 'light';
  }

  function apply(pref) {
    var eff = effective(pref);
    document.documentElement.setAttribute('data-theme', eff);
  }

  // Sofort anwenden (vor dem ersten Paint, wenn im <head> geladen)
  apply(stored());

  // Auf System-Änderungen reagieren, solange 'system' gewählt ist
  if (mql) {
    var onChange = function () { if (stored() === 'system') apply('system'); };
    if (mql.addEventListener) mql.addEventListener('change', onChange);
    else if (mql.addListener) mql.addListener(onChange);
  }

  // Öffentliche API
  window.dlSetTheme = function (pref) {
    if (['dark', 'light', 'system'].indexOf(pref) === -1) pref = 'system';
    save(pref);
    apply(pref);
    updateButton();
  };
  window.dlGetTheme = stored;
  // Zyklus: system -> dark -> light -> system
  window.dlCycleTheme = function () {
    var cur = stored();
    var next = cur === 'system' ? 'dark' : (cur === 'dark' ? 'light' : 'system');
    window.dlSetTheme(next);
  };

  // --- Umschalt-Button ---
  var btn;
  function icon(pref) {
    // Sun (light), Moon (dark), Monitor (system)
    if (pref === 'light') return '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg>';
    if (pref === 'dark') return '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/></svg>';
    return '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="20" height="14" x="2" y="3" rx="2"/><path d="M8 21h8M12 17v4"/></svg>';
  }
  function label(pref) {
    return pref === 'light' ? 'Hell' : (pref === 'dark' ? 'Dunkel' : 'System');
  }
  function updateButton() {
    if (!btn) return;
    var pref = stored();
    btn.innerHTML = icon(pref);
    btn.setAttribute('title', 'Design: ' + label(pref) + ' (klicken zum Wechseln)');
    btn.setAttribute('aria-label', 'Design umschalten – aktuell ' + label(pref));
  }
  function injectButton() {
    if (document.getElementById('dl-theme-toggle')) return;
    btn = document.createElement('button');
    btn.id = 'dl-theme-toggle';
    btn.type = 'button';
    btn.addEventListener('click', function () { window.dlCycleTheme(); });
    updateButton();
    document.body.appendChild(btn);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', injectButton);
  } else {
    injectButton();
  }
})();
