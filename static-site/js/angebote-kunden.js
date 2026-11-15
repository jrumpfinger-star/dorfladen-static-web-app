window.AngeboteKunden = (function () {
  'use strict';
  var M = window.AngeboteModel, loaded = null, pending = null, states = new Map(), currentViewer = null;
  function normalizeOld(item) {
    return { id: item.dl_angeboteid || item.id || '', produkt: item.dl_produkt || item.name || '',
      details: item.dl_details || item.details || '', preis: Number(item.dl_preis || item.price || 0),
      statt: Number(item.dl_statt_preis || item.old_price || 0), titel: item.dl_aktion_titel || item.aktion_titel || '',
      aktion: item.dl_aktion_id || item.aktion_id || '', artnr: item.dl_artikelnummer || item.artikelnummer || '',
      von: String(item.dl_gueltig_von || item.valid_from || '').slice(0, 10),
      bis: String(item.dl_gueltig_bis || item.valid_to || '').slice(0, 10) };
  }
  async function load(force) {
    if (pending) return pending;
    if (loaded && !force) return loaded;
    pending = (async function () {
      var responses = await Promise.all([M.request('/api/angebote'), M.request('/api/angebote-flyer')]);
      var old = Array.isArray(responses[0]) ? responses[0] : responses[0].data || responses[0].value;
      if (!Array.isArray(old) || !Array.isArray(responses[1].actions)) throw M.problem('Die Angebote konnten nicht vollständig geladen werden.');
      loaded = { legacy: old.map(normalizeOld), actions: responses[1].actions };
      return loaded;
    })();
    try { return await pending; } finally { pending = null; }
  }
  function range(mode) {
    var ref = new Date(M.today() + 'T12:00:00Z');
    ref.setUTCDate(ref.getUTCDate() - ref.getUTCDay() + (mode === 'next' ? 7 : 0));
    var start = ref.toISOString().slice(0, 10);
    ref.setUTCDate(ref.getUTCDate() + 6);
    return { start: start, end: ref.toISOString().slice(0, 10) };
  }
  function overlaps(from, to, r) { return (!from || from <= r.end) && (!to || to >= r.start); }
  function selected(state) {
    var r = range(state.week);
    var legacy = loaded.legacy.filter(function (a) { return overlaps(a.von, a.bis, r); });
    var actions = loaded.actions.filter(function (a) {
      return overlaps(a.data.valid_from, a.data.valid_to, r);
    });
    return { legacy: legacy, actions: actions, range: r };
  }
  function legacyHTML(a) {
    var pct = a.statt > a.preis && a.preis > 0 ? Math.round((a.statt - a.preis) / a.statt * 100) : 0;
    return '<article class="ang-item an-legacy"' + (a.artnr ? ' data-artnr="' + M.esc(a.artnr) + '"' : '') + '>'
      + '<span class="ang-leaf">🌿</span>' + (pct > 0 ? '<div class="ang-badge">-' + pct + '%</div>' : '')
      + '<div class="ang-img"></div><div class="ang-info"><div class="ang-name">' + M.esc(a.produkt) + '</div>'
      + (a.details ? '<div class="ang-det">' + M.esc(a.details) + '</div>' : '') + '</div>'
      + (a.preis ? '<div class="ang-tag"><div class="ang-tag-inner">' + M.money(Math.round(a.preis * 100)) + '<span class="ang-euro">€</span></div>'
      + (a.statt ? '<span class="ang-statt">' + M.money(Math.round(a.statt * 100)) + ' €</span>' : '') + '</div>' : '')
      + '<span class="ang-basket">🛒</span></article>';
  }
  function render(state) {
    var grid = document.getElementById(state.grid);
    if (!grid || !loaded) return;
    var result = selected(state), controls = document.getElementById(state.grid + '-controls');
    if (!controls) {
      controls = document.createElement('div'); controls.id = state.grid + '-controls'; controls.className = 'an-customer-controls';
      grid.before(controls); grid.parentElement.classList.add('an-customer');
      controls.addEventListener('click', function (e) {
        if (e.target.closest('[data-offer-flyer]')) {
          var chooser = controls.querySelector('[data-offer-action]');
          var action = selected(state).actions.find(function (a) { return !chooser || a.id === chooser.value; });
          if (action) viewer(action, e.target).catch(M.error);
        }
      });
    }
    controls.innerHTML = (result.actions.length > 1 ? '<label class="an-field"><span>Flyer auswählen</span><select data-offer-action>' + result.actions.map(function (a) {
        return '<option value="' + M.esc(a.id) + '">' + M.esc(a.data.title) + '</option>'; }).join('') + '</select></label>' : '')
      + (result.actions.length ? '<button data-offer-flyer>Flyer ansehen</button>' : '');
    grid.classList.add('an-customer-grid');
    grid.innerHTML = result.legacy.map(legacyHTML).join('') + result.actions.map(function (action) {
      return action.data.items.map(function (it) { return M.cardHTML(action.data, it); }).join('');
    }).join('');
    Promise.all(result.actions.map(function (action) { return M.paintCards(grid, action.data); })).catch(M.error);
    if (!result.legacy.length && !result.actions.length) grid.innerHTML = '<p class="an-status">Aktuell keine Angebote in diesem Zeitraum.</p>';
    if (window.loadAngBilder && result.legacy.length) window.loadAngBilder(grid);
    grid.querySelectorAll('.an-product img').forEach(function (img) {
      img.addEventListener('error', function () {
        console.error('[Angebote] Produktbild nicht verfügbar', img.src);
        var missing = document.createElement('div'); missing.className = 'an-no-image'; missing.textContent = 'Produktbild gerade nicht verfügbar'; img.replaceWith(missing);
      });
    });
    var label = document.getElementById(state.label);
    if (label) label.textContent = M.date(result.range.start) + ' – ' + M.date(result.range.end);
    if (state.grid === 'ang-grid') {
      var shell = document.getElementById('angebote'), empty = document.getElementById('ang-empty');
      if (shell) shell.style.display = '';
      if (empty) empty.style.display = 'none';
      ['this', 'next'].forEach(function (week) { var b = document.getElementById('ang-btn-' + week); if (b) b.classList.toggle('active', state.week === week); });
    }
    var count = loaded.legacy.filter(function (a) { return overlaps(a.von, a.bis, range('this')); }).length
      + loaded.actions.reduce(function (n, a) { return n + a.data.items.length; }, 0);
    if (state.onLoaded) state.onLoaded({ legacy: loaded.legacy, count: count });
  }
  async function mount(options) {
    var state = states.get(options.grid);
    if (state) Object.assign(state, options);
    else { state = Object.assign({ week: 'this' }, options); states.set(state.grid, state); }
    try { await load(); render(state); }
    catch (e) {
      console.error('[Angebote] Kundenansicht', e);
      var grid = document.getElementById(state.grid);
      if (grid) {
        grid.innerHTML = '<p class="an-status an-error" role="alert">Die Angebote konnten nicht geladen werden. Bitte erneut versuchen.</p><button>Erneut laden</button>';
        grid.querySelector('button').onclick = function () { loaded = null; mount(options); };
        var shell = document.getElementById('angebote'); if (shell) shell.style.display = '';
      }
    }
  }
  async function viewer(action, opener) {
    if (currentViewer) currentViewer.close();
    var dlg = document.createElement('dialog'); dlg.className = 'an-viewer'; dlg.setAttribute('aria-label', 'Original-Angebotsflyer');
    dlg.innerHTML = '<div class="an-viewer-shell"><div class="an-viewer-tools"><strong></strong><button data-viewer-close aria-label="Flyer schließen">Schließen ×</button></div>'
      + '<div class="an-viewer-tools"><div class="an-row"><button data-viewer-prev aria-label="Vorherige Flyerseite">←</button><span data-viewer-page-label></span><button data-viewer-next aria-label="Nächste Flyerseite">→</button></div>'
      + '<div class="an-row"><button data-viewer-zoom-out aria-label="Flyer verkleinern">−</button><button data-viewer-fit>An Breite anpassen</button><button data-viewer-zoom-in aria-label="Flyer vergrößern">+</button></div></div>'
      + '<div class="an-viewer-scroll" tabindex="0" aria-label="Flyer, bei Vergrößerung verschiebbar"><div class="an-viewer-page"></div></div></div>';
    dlg.querySelector('strong').textContent = action.data.title;
    var n = 0, zoom = 1, generation = 0, canvas = null, scroller = dlg.querySelector('.an-viewer-scroll'), page = dlg.querySelector('.an-viewer-page');
    var previousOverflow = document.documentElement.style.overflow;
    document.documentElement.style.overflow = 'hidden';
    function fit() {
      if (!canvas) return;
      var width = Math.min(M.W, Math.max(100, scroller.clientWidth - 4)) * zoom, factor = width / M.W;
      page.style.width = width + 'px'; page.style.height = M.H * factor + 'px';
      canvas.style.width = M.W + 'px'; canvas.style.height = M.H + 'px'; canvas.style.transform = 'scale(' + factor + ')';
    }
    var observer = new ResizeObserver(fit);
    function close() { generation++; observer.disconnect(); dlg.close(); dlg.remove(); document.documentElement.style.overflow = previousOverflow; currentViewer = null; if (opener && opener.isConnected) opener.focus(); }
    async function draw() {
      var ticket = ++generation, rendered = await M.render(action.data, n, 2);
      if (ticket !== generation || !dlg.isConnected) return;
      canvas = rendered.canvas; canvas.setAttribute('aria-label', action.data.title + ' · Seite ' + (n + 1));
      page.replaceChildren(canvas); fit(); scroller.scrollTop = 0; scroller.scrollLeft = 0;
      dlg.querySelector('[data-viewer-page-label]').textContent = (n + 1) + ' / ' + action.data.layout.pages.length;
      dlg.querySelector('[data-viewer-prev]').disabled = n === 0;
      dlg.querySelector('[data-viewer-next]').disabled = n === action.data.layout.pages.length - 1;
    }
    dlg.addEventListener('click', function (e) {
      if (e.target.closest('[data-viewer-close]')) close();
      if (e.target.closest('[data-viewer-prev]') && n > 0) { n--; draw().catch(M.error); }
      if (e.target.closest('[data-viewer-next]') && n < action.data.layout.pages.length - 1) { n++; draw().catch(M.error); }
      if (e.target.closest('[data-viewer-zoom-in]')) { zoom = Math.min(3, zoom + .5); fit(); }
      if (e.target.closest('[data-viewer-zoom-out]')) { zoom = Math.max(1, zoom - .5); fit(); }
      if (e.target.closest('[data-viewer-fit]')) { zoom = 1; fit(); scroller.scrollLeft = 0; }
    });
    dlg.addEventListener('cancel', function (e) { e.preventDefault(); close(); });
    document.body.appendChild(dlg); dlg.showModal(); observer.observe(scroller); currentViewer = { id: action.id, close: close };
    try { await draw(); } catch (e) { close(); throw e; }
  }
  async function refresh() {
    if (!states.size || document.hidden) return;
    try {
      await load(true);
      states.forEach(render);
      if (currentViewer && !loaded.actions.some(function (a) { return a.id === currentViewer.id; })) currentViewer.close();
    } catch (e) {
      console.error('[Angebote] Aktualisierung fehlgeschlagen', e);
      states.forEach(function (state) {
        var grid = document.getElementById(state.grid);
        if (grid && !grid.querySelector('[data-refresh-error]')) {
          var note = document.createElement('p'); note.dataset.refreshError = ''; note.className = 'an-status an-error'; note.setAttribute('role', 'alert');
          note.textContent = 'Der aktuelle Gültigkeitsstand konnte nicht geprüft werden. Bitte die Seite neu laden.';
          grid.prepend(note);
        }
      });
    }
  }
  setInterval(refresh, 60000);
  document.addEventListener('visibilitychange', refresh);
  return { mount: mount, refresh: refresh, viewer: viewer };
})();
