window.AngeboteKunden = (function () {
  'use strict';
  var M = window.AngeboteModel, loaded = null, pending = null, states = new Map(), currentViewer = null, imageLookups = new Map();
  var homepageDefaults = {
    gridBg: '#f4f1ea', cardBg: '#ffffff', cardBorder: '#d8dfd7', nameColor: '#1f2521', detColor: '#555555',
    tagBg: '#a51d2d', tagText: '#ffffff', badgeBg: '#31704b', stattColor: '#666666',
    tagSkew: -4, tagRadius: 5, headerBg: '#c62828', headerText: '#ffffff',
    cardRadius: 10, imgSize: 95, showLeaf: false, showBasket: false
  };
  function homepageCard(it, kind, legacy) {
    var pct = M.savings(it), price = M.money(it.price_cents).split(',');
    return '<article class="an-hp-card' + (legacy ? ' an-legacy ang-item' : ' an-product') + '"'
      + (legacy && it.article_number ? ' data-artnr="' + M.esc(it.article_number) + '"' : '') + '>'
      + '<h3 class="ang-name">' + M.esc(it.name) + '</h3>'
      + '<p class="an-hp-details">' + M.esc(kind === 'drinks' ? M.pack(it) : it.description || '') + '</p>'
      + '<div class="an-hp-visual"><div class="an-hp-image ang-img"'
      + (it.image_id ? ' data-hp-image="' + M.esc(it.image_id) + '"' : '')
      + '><span class="an-hp-placeholder" aria-label="Produktbild">◇</span></div>'
      + '<div class="an-hp-prices" style="--hp-price-chars:' + (price[0].length + 1.5) + '">' + (pct ? '<span class="an-hp-discount">−' + pct + '%</span>' : '')
      + '<strong class="an-hp-price">' + price[0] + ',<sup>' + price[1] + '</sup><small> €</small></strong>'
      + (it.old_price_cents > it.price_cents ? '<del>' + M.money(it.old_price_cents) + ' €</del>' : '') + '</div></div>'
      + (kind === 'drinks' ? '<p class="an-hp-deposit">' + (it.deposit_free ? 'Pfandfrei' : 'zzgl. ' + M.money(it.deposit_cents) + ' € Pfand')
        + '<br>1 l = ' + M.money(M.base(it)) + ' €</p>' + (it.description ? '<p class="an-hp-details">' + M.esc(it.description) + '</p>' : '') : '')
      + '<span class="an-hp-leaf" aria-hidden="true">🌿</span><span class="an-hp-basket" aria-hidden="true">🛒</span></article>';
  }
  function applyHomepage(host, config) {
    var c = Object.assign({}, homepageDefaults, config);
    host.classList.add('an-homepage');
    Object.keys(homepageDefaults).forEach(function (key) {
      host.style.setProperty('--hp-' + key, typeof c[key] === 'number' ? c[key] + (key === 'tagSkew' ? 'deg' : 'px') : String(c[key]));
    });
    host.classList.toggle('an-hp-leaves', c.showLeaf);
    host.classList.toggle('an-hp-baskets', c.showBasket);
  }
  async function paintHomepage(host) {
    await Promise.all(Array.from(host.querySelectorAll('[data-hp-image],[data-hp-lookup]')).map(async function (box) {
      try {
        if (!box.dataset.hpImage && box.dataset.hpLookup) {
          var key = box.dataset.hpLookup;
          if (!imageLookups.has(key)) imageLookups.set(key,
            window.AngeboteDataverse.findImage(JSON.parse(key)).catch(function (error) { imageLookups.delete(key); throw error; }));
          var found = await imageLookups.get(key);
          if (!box.isConnected) return;
          if (!found) { box.textContent = 'Kein Produktbild hinterlegt'; return; }
          box.dataset.hpImage = found.image_id;
        }
        var image = await M.image(box.dataset.hpImage);
        if (!box.isConnected) return;
        var canvas = document.createElement('canvas');
        canvas.width = image.naturalWidth; canvas.height = image.naturalHeight;
        canvas.getContext('2d').drawImage(image, 0, 0);
        var copy = new Image(); copy.alt = box.closest('article').querySelector('h3').textContent;
        copy.src = canvas.toDataURL(); await copy.decode();
        if (box.isConnected) { box.replaceChildren(copy); box.classList.add('loaded'); }
      } catch (e) {
        console.error('[Angebote] Homepage-Bild', e);
        if (!box.isConnected) return;
        box.textContent = 'Bild nicht verfügbar';
        var retry = document.createElement('button'); retry.type = 'button'; retry.textContent = 'Erneut laden';
        retry.onclick = function () { paintHomepage(box.parentElement).catch(M.error); }; box.appendChild(retry);
      }
    }));
  }
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
      var offers = await M.request('/api/angebote');
      var archive = offers.config && offers.config.feature_archive_enabled === false
        ? { actions: [] } : await M.request('/api/angebote-flyer');
      var old = Array.isArray(offers) ? offers : offers.data || offers.value;
      if (!Array.isArray(old) || !Array.isArray(archive.actions)) throw M.problem('Die Angebote konnten nicht vollständig geladen werden.');
      var typed = old.filter(function (row) { return row.action_kind === 'drinks' || row.action_layout; });
      var typedActions = await window.AngeboteDataverse.actions(typed);
      var homepage = await M.request('/api/angebote-flyer?view=homepage');
      if (!homepage.homepage || typeof homepage.homepage !== 'object') throw M.problem('Die Homepage-Gestaltung konnte nicht geladen werden.');
      loaded = { legacy: old.filter(function (row) { return !typed.includes(row); }).map(normalizeOld),
        actions: typedActions.concat(archive.actions), homepage: homepage.homepage };
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
  async function homepagePreviewItems(force) {
    if (force) imageLookups.clear();
    await load(force);
    var result = selected({ week: 'this' });
    return result.legacy.map(function (a) {
      return { kind: 'weekly', item: { name: a.produkt, description: a.details, article_number: a.artnr,
        price_cents: Math.round(a.preis * 100), old_price_cents: Math.round(a.statt * 100) } };
    }).concat(result.actions.flatMap(function (action) {
      return action.data.items.map(function (it) { return { kind: action.data.kind, item: it }; });
    }));
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
  /* Klappzustand der Angebotsgruppen (je Raster + Titel). Default: aufgeklappt. */
  var groupOpen = new Map();
  function groupHTML(state, title, cards, count) {
    var key = state.grid + '|' + title, open = groupOpen.get(key);
    if (open === undefined) open = true;
    return '<section class="an-group"><button type="button" class="an-group-hdr" data-group-key="' + M.esc(key) + '"'
      + ' aria-expanded="' + open + '"><span class="an-group-t">' + M.esc(title) + '</span><span class="an-group-n">'
      + count + '</span></button><div class="an-customer-grid an-group-body' + (open ? '' : ' an-hidden') + '">'
      + cards + '</div></section>';
  }
  function render(state) {
    var grid = document.getElementById(state.grid);
    if (!grid || !loaded) return;
    var result = selected(state), controls = document.getElementById(state.grid + '-controls');
    if (!controls) {
      controls = document.createElement('div'); controls.id = state.grid + '-controls'; controls.className = 'an-customer-controls';
      var weekNav = grid.parentElement.querySelector('.ang-week-nav');
      if (weekNav) weekNav.appendChild(controls);
      else grid.before(controls);
      grid.parentElement.classList.add('an-customer');
      controls.addEventListener('click', function (e) {
        if (e.target.closest('[data-offer-flyer]')) {
          var actions = selected(state).actions;
          /* Ein Button für alle Flyer: der Viewer lässt seiten- und flyerübergreifend blättern. */
          if (actions.length) viewer(actions, e.target.closest('[data-offer-flyer]')).catch(M.error);
        }
      });
    }
    controls.hidden = !result.actions.length;
    controls.innerHTML = (result.actions.length ? '<button class="an-flyer-button" data-offer-flyer><svg aria-hidden="true" focusable="false" width="16" height="20" viewBox="0 0 16 20" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="1" y="1" width="14" height="18" rx="2"/><path d="M4 6h8M4 10h8M4 14h8"/></svg><span>Flyer ansehen</span></button>' : '');
    grid.classList.remove('an-customer-grid');
    grid.classList.add('an-groups');
    if (!grid.dataset.groupToggle) {
      grid.dataset.groupToggle = '1';
      grid.addEventListener('click', function (e) {
        var hdr = e.target.closest('.an-group-hdr');
        if (!hdr) return;
        var open = hdr.getAttribute('aria-expanded') !== 'false';
        groupOpen.set(hdr.dataset.groupKey, !open);
        hdr.setAttribute('aria-expanded', String(!open));
        if (hdr.nextElementSibling) hdr.nextElementSibling.classList.toggle('an-hidden', open);
      });
    }
    var homepage = state.grid === 'ang-grid' || state.grid === 'mob-ang-grid';
    if (homepage) applyHomepage(grid.parentElement, loaded.homepage);
    var legacyGroups = new Map();
    result.legacy.forEach(function (a) {
      var title = a.titel || 'Sonderangebote';
      if (!legacyGroups.has(title)) legacyGroups.set(title, []);
      legacyGroups.get(title).push(a);
    });
    var sections = [];
    legacyGroups.forEach(function (rows, title) {
      sections.push(groupHTML(state, title, rows.map(function (a) {
        return homepage ? homepageCard({ name: a.produkt, description: a.details, article_number: a.artnr,
          price_cents: Math.round(a.preis * 100), old_price_cents: Math.round(a.statt * 100) }, 'weekly', true) : legacyHTML(a);
      }).join(''), rows.length));
    });
    result.actions.forEach(function (action) {
      sections.push(groupHTML(state, action.data.title, action.data.items.map(function (it) {
        return homepage ? homepageCard(it, action.data.kind) : M.cardHTML(action.data, it);
      }).join(''), action.data.items.length));
    });
    grid.innerHTML = sections.join('');
    if (homepage) paintHomepage(grid).catch(M.error);
    else Promise.all(result.actions.map(function (action) { return M.paintCards(grid, action.data); })).catch(M.error);
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
    if (state.grid === 'mob-ang-grid') {
      ['this', 'next'].forEach(function (week) { var b = document.getElementById('mob-ang-btn-' + week); if (b) b.classList.toggle('active', state.week === week); });
    }
    var count = loaded.legacy.filter(function (a) { return overlaps(a.von, a.bis, range('this')); }).length
      + loaded.actions.filter(function (a) { return overlaps(a.data.valid_from, a.data.valid_to, range('this')); })
        .reduce(function (n, a) { return n + a.data.items.length; }, 0);
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
  async function viewer(list, opener) {
    /* akzeptiert eine Aktion (Rückwärtskompatibilität) oder eine Liste;
       bei einer Liste wird seiten- und flyerübergreifend geblättert. */
    var actions = Array.isArray(list) ? list : [list];
    if (!actions.length) return;
    if (currentViewer) currentViewer.close();
    var ai = 0;
    var dlg = document.createElement('dialog'); dlg.className = 'an-viewer'; dlg.setAttribute('aria-label', 'Original-Angebotsflyer');
    dlg.innerHTML = '<div class="an-viewer-shell"><div class="an-viewer-tools"><strong></strong><button data-viewer-close aria-label="Flyer schließen">Schließen ×</button></div>'
      + '<div class="an-viewer-tools"><div class="an-row"><button data-viewer-prev aria-label="Vorherige Flyerseite">←</button><span data-viewer-page-label></span><button data-viewer-next aria-label="Nächste Flyerseite">→</button></div>'
      + '<div class="an-row"><button data-viewer-zoom-out aria-label="Flyer verkleinern">−</button><button data-viewer-fit>An Breite anpassen</button><button data-viewer-zoom-in aria-label="Flyer vergrößern">+</button></div></div>'
      + '<div class="an-viewer-scroll" tabindex="0" aria-label="Flyer, bei Vergrößerung verschiebbar"><div class="an-viewer-page"></div></div></div>';
    var titleEl = dlg.querySelector('strong');
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
      var ticket = ++generation, action = actions[ai], rendered = await M.render(action.data, n, 2);
      if (ticket !== generation || !dlg.isConnected) return;
      canvas = rendered.canvas; canvas.setAttribute('aria-label', action.data.title + ' · Seite ' + (n + 1));
      page.replaceChildren(canvas); fit(); scroller.scrollTop = 0; scroller.scrollLeft = 0;
      titleEl.textContent = action.data.title + (actions.length > 1 ? ' · Flyer ' + (ai + 1) + '/' + actions.length : '');
      dlg.querySelector('[data-viewer-page-label]').textContent = (n + 1) + ' / ' + action.data.layout.pages.length;
      dlg.querySelector('[data-viewer-prev]').disabled = ai === 0 && n === 0;
      dlg.querySelector('[data-viewer-next]').disabled = ai === actions.length - 1 && n === action.data.layout.pages.length - 1;
    }
    dlg.addEventListener('click', function (e) {
      if (e.target.closest('[data-viewer-close]')) close();
      if (e.target.closest('[data-viewer-prev]')) {
        if (n > 0) { n--; draw().catch(M.error); }
        else if (ai > 0) { ai--; n = actions[ai].data.layout.pages.length - 1; draw().catch(M.error); }
      }
      if (e.target.closest('[data-viewer-next]')) {
        if (n < actions[ai].data.layout.pages.length - 1) { n++; draw().catch(M.error); }
        else if (ai < actions.length - 1) { ai++; n = 0; draw().catch(M.error); }
      }
      if (e.target.closest('[data-viewer-zoom-in]')) { zoom = Math.min(3, zoom + .5); fit(); }
      if (e.target.closest('[data-viewer-zoom-out]')) { zoom = Math.max(1, zoom - .5); fit(); }
      if (e.target.closest('[data-viewer-fit]')) { zoom = 1; fit(); scroller.scrollLeft = 0; }
    });
    dlg.addEventListener('cancel', function (e) { e.preventDefault(); close(); });
    document.body.appendChild(dlg); dlg.showModal(); observer.observe(scroller);
    currentViewer = { ids: actions.map(function (a) { return a.id; }), close: close };
    try { await draw(); } catch (e) { close(); throw e; }
  }
  async function refresh() {
    if (!states.size || document.hidden) return;
    try {
      await load(true);
      states.forEach(render);
      if (currentViewer && !currentViewer.ids.some(function (id) { return loaded.actions.some(function (a) { return a.id === id; }); })) currentViewer.close();
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
  return { mount: mount, refresh: refresh, viewer: viewer, homepageDefaults: homepageDefaults,
    homepageCard: homepageCard, applyHomepage: applyHomepage, homepagePreviewItems: homepagePreviewItems, paintHomepage: paintHomepage };
})();
