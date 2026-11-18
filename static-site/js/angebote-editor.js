(function () {
  'use strict';
  var root = document.getElementById('an-root');
  if (!root) return;
  var M = window.AngeboteModel, D = window.AngeboteDesign;
  var record = null, data = null, config = null, design = null, dirty = false, busy = false;
  var step = 'articles', page = 0, selected = '', paint = 0, undo = [], redo = [];
  var designTarget = 'sheet', designItemId = '', pendingImages = new Map(), pendingImageUrls = new Map();
  var previewMode = 'paper';
  var overviewFilter = 'all';
  var weeklySurface = null;
  var taskFrame = null;
  var objectTransaction = null;
  var liveControl = null, liveValue = '', liveApplying = false;
  var cmsHost = null, cmsAction = null, cmsReturn = null, cmsDialog = null, cmsPlaceholder = null, cmsScrolled = false;
  var cmsTab = 'element', cmsPanel = null, cmsTabbar = null, cmsObserver = null, cmsNarrow = null;
  var cmsSession = null;
  var roleNames = { brand: 'Marke', title: 'Überschrift', period: 'Zeitraum', footer: 'Fußzeile',
    name: 'Artikelname', pack: 'Gebinde', description: 'Beschreibung', price: 'Preis',
    old_price: 'Stattpreis', discount: 'Rabatt', deposit: 'Pfand', base: 'Literpreis', image: 'Bild', logo: 'Dorfladen-Logo', text: 'Eigener Text', shape: 'Fläche' };
  var $ = function (id) { return document.getElementById(id); };
  function outputMode() { return cmsAction ? cmsTab === 'output' : step === 'output'; }
  function selectArticle(id) {
    if (!data.items.some(function (item) { return item.id === id; })) return;
    designItemId = id; selected = '';
    if (designTarget === 'sheet') {
      var index = data.layout.pages.findIndex(function (entry) { return entry.elements.some(function (element) { return element.item_id === id; }); });
      if (index >= 0) page = index;
    }
    syncArticleNavigation(); renderInspector(); preview().catch(M.error);
  }
  function syncSelectedArticle() {
    var element = selection();
    if (element && element.item_id) designItemId = element.item_id;
  }
  function syncArticleNavigation() {
    var picker = $('an-design-item'), position = root.querySelector('[data-article-position]');
    if (!picker) return;
    var index = data.items.findIndex(function (item) { return item.id === designItemId; });
    if (index < 0 && data.items.length) { index = 0; designItemId = data.items[0].id; }
    picker.value = designItemId;
    if (position) position.textContent = index < 0 ? 'Keine Artikel' : 'Artikel ' + (index + 1) + ' von ' + data.items.length;
    var back = root.querySelector('[data-article-prev]'), next = root.querySelector('[data-article-next]');
    if (back) back.disabled = index <= 0;
    if (next) next.disabled = index < 0 || index >= data.items.length - 1;
    if ($('an-cms-item')) $('an-cms-item').value = designItemId;
    syncOutput();
  }
  function syncOutput() {
    root.dataset.outputMode = String(outputMode());
    var status = root.querySelector('[data-export-state]');
    if (status) {
      status.textContent = dirty ? 'Ungespeicherte Gestaltung · zum Sichern zurück zur Gestaltung.' : '';
      status.hidden = !dirty;
    }
    var download = root.querySelector('[data-cms-download]'), printButton = root.querySelector('[data-cms-print]');
    if (download) download.textContent = designTarget === 'sheet' ? 'Seite als PNG' : 'Als PNG speichern';
    if (printButton) printButton.textContent = designTarget === 'single' ? 'Artikel drucken / PDF'
      : designTarget === 'sheet' && data.layout.pages.length > 1 ? 'Drucken / PDF (' + data.layout.pages.length + ' Seiten)' : 'Drucken / PDF';
    var outputTarget = root.querySelector('[data-output-target]');
    if (outputTarget) outputTarget.value = designTarget;
    var batch = root.querySelector('[data-cms-singles]');
    if (batch) batch.hidden = designTarget !== 'single';
    var allPages = root.querySelector('[data-cms-all-pages]');
    if (allPages) allPages.hidden = designTarget !== 'sheet';
    syncDesignContext();
    var outputBar = root.querySelector('.an-output-bar'), pageTools = $('an-page-tools');
    if (outputBar && pageTools) {
      if (outputMode()) outputBar.prepend(pageTools);
      else if (outputBar.contains(pageTools)) root.querySelector('[data-task-panel=view],[data-editor-panel=view]').prepend(pageTools);
    }
    function syncDesignContext() {
      var status = root.querySelector('[data-action-design-context]');
      if (!status || !data) return;
      var names = { sheet: 'Sammelflyer', single: 'Einzelflyer', card: 'Homepage / Kiosk', scale: 'Waage' };
      var kind = designTarget === 'single' ? 'flyer' : 'plakat';
      var template = weeklyTarget() ? root.querySelector('[data-cms-variant][data-cms-kind=' + kind + '] option:checked')
        : root.querySelector('[data-style=template] option:checked');
      var layout = weeklyTarget() ? M.cmsFor(data, designTarget).config[kind + 'Template'] : controlLayout().template;
      var origin = M.designProvenanceState(data.layout, designTarget);
      status.textContent = names[designTarget] + ' · Aussehen: ' + (template ? template.textContent : layout)
        + (origin.known ? ' · Eigene Vorlage: ' + origin.label : '');
      var button = $('an-defaults'); if (button) button.hidden = outputMode();
      refreshPresetPicker().catch(function (error) { console.warn('[Angebote] Eigene Vorlagen', error); });
    }
    if (!cmsAction) {
      var bar = root.querySelector('.an-output-bar'), picker = $('an-design-item-wrap');
      if (bar) {
        bar.hidden = !outputMode();
        if (outputMode()) bar.prepend(picker);
        else if (bar.contains(picker)) root.querySelector('[data-editor-panel=element]').prepend(picker);
      }
    }
  }
  function weeklyTarget() { return !!data.layout.cms && designTarget !== 'scale'; }
  function controlLayout() {
    var layout = M.clone(data.layout);
    if (layout.cms && designTarget !== 'scale') layout.cms = M.clone(M.cmsFor(data, designTarget));
    if (designTarget === 'scale') delete layout.cms;
    return designTarget !== 'sheet' && !weeklyTarget() ? Object.assign(layout, M.styleOf(layout, designTarget)) : layout;
  }
  function header(title) {
    return '<header class="an-head"><div><small>DORFLADEN · WOCHEN- UND GETRÄNKEANGEBOTE</small><h1>' + M.esc(title) + '</h1></div>'
      + '</header>' + (config && !config.scale_enabled ? '<p class="an-note">'
        + (cmsAction ? 'Kein echter Waagenversand aus dieser Umgebung.' : 'Vorschauumgebung · Feature-Entwürfe sind getrennt gespeichert. Kein echter Waagenversand aus dieser Umgebung.') + '</p>' : '');
  }
  function lock(value) {
    busy = value; root.setAttribute('aria-busy', String(value));
    root.querySelectorAll('button,input,select,textarea').forEach(function (el) {
      if (value) { el.dataset.wasDisabled = el.disabled ? 'true' : 'false'; el.disabled = true; }
      else if (el.dataset.wasDisabled != null) { el.disabled = el.dataset.wasDisabled === 'true'; delete el.dataset.wasDisabled; }
    });
  }
  async function run(fn) {
    if (busy) return;
    lock(true);
    try { await fn(); } catch (e) {
      if (data && $('an-state')) $('an-state').textContent = dirty ? 'Nicht gespeichert · Änderungen bleiben erhalten' : 'Vorgang nicht abgeschlossen · gespeicherter Stand bleibt erhalten';
      await M.error(e);
    } finally { lock(false); }
  }
  function changed() {
    dirty = true;
    var status = $('an-state');
    if (status) status.textContent = cmsAction ? 'Gestaltung geändert · noch nicht gespeichert' : 'Entwurf geändert · noch nicht gespeichert oder veröffentlicht';
    root.querySelectorAll('[data-history="undo"]').forEach(function (button) { button.disabled = !undo.length; });
    root.querySelectorAll('[data-history="redo"]').forEach(function (button) { button.disabled = !redo.length; });
    syncOutput();
  }
  function checkpoint() { if (objectTransaction || liveApplying) return; liveControl = null; undo.push(M.clone(data)); if (undo.length > 30) undo.shift(); redo = []; }
  function edit(fn, free) {
    if (outputMode()) return;
    checkpoint(); fn(); if (free && designTarget === 'sheet') data.layout.mode = 'free'; changed(); preview().catch(M.error);
  }
  async function discard() {
    return !dirty || await M.dialog('Ungespeicherte Änderungen', 'Möchtest du die Änderungen verwerfen? Der zuletzt gespeicherte Stand bleibt erhalten.', 'Änderungen verwerfen');
  }
  async function overview() {
    if (!(await discard())) return;
    if (taskFrame) { taskFrame.destroy(); taskFrame = null; }
    root.classList.remove('an-task-editor'); root.style.removeProperty('height');
    data = null; record = null; dirty = false; paint++;
    root.innerHTML = header('Angebote. Gemeinsam gestalten.') + '<p role="status">Die Angebote werden geladen …</p>';
    var result = await M.request('/api/angebote-verwaltung');
    config = result.config;
    var legacy = [], legacyError = '';
    try { var old = await M.request('/api/angebote'); legacy = Array.isArray(old) ? old : old.data || []; }
    catch (e) { console.error('[Angebote] Altbestand', e); legacyError = 'Die bisherigen Angebote konnten nicht geladen werden. Der bisherige CMS-Editor bleibt erreichbar.'; }
    root.innerHTML = header('Angebote. Gemeinsam gestalten.')
      + (cmsHost ? '<button id="an-cms-back">Zur gemeinsamen Aktionsübersicht</button>' : '')
      + '<div class="an-overview-toolbar"><h2>Deine Aktionen</h2><div class="an-actions"><button class="an-primary" data-new="weekly">+ Wochenaktion anlegen</button>'
      + '<button data-new="drinks">+ Getränkeaktion anlegen</button></div></div>'
      + '<nav class="an-tabs an-week-filter" aria-label="Aktionszeitraum">' + [['current', 'Diese Woche'], ['next', 'Nächste Woche'], ['all', 'Alle']].map(function (filter) {
        return '<button data-overview-filter="' + filter[0] + '" aria-pressed="' + (overviewFilter === filter[0]) + '">' + filter[1] + '</button>';
      }).join('') + '</nav><div class="an-list an-action-list">' + (result.actions.length ? result.actions.map(function (head) {
        var d = head.draft, pub = head.published_summary;
        return '<article class="an-card an-action-row" data-action-id="' + head.id + '" data-valid-from="' + d.valid_from + '" data-valid-to="' + d.valid_to + '"><div class="an-action-summary"><h3>' + M.esc(d.title || 'Unbenannter Entwurf')
          + '</h3><p class="an-muted">' + (d.kind === 'drinks' ? 'Getränke' : 'Wochenangebote') + ' · ' + M.date(d.valid_from) + ' – ' + M.date(d.valid_to) + ' · ' + d.items.length + ' Artikel'
          + ' · ' + (pub ? 'Freigegeben · Änderungen bleiben Entwurf' : 'Entwurf · nicht für Kunden sichtbar') + '</p></div>'
          + '<div class="an-actions" aria-label="Aktionsfunktionen"><button data-open="' + head.id + '">Bearbeiten</button>'
          + '<button data-preview-action="' + head.id + '">Vorschau</button><button data-share-action="' + head.id + '">Teilen</button><button data-scale-action="' + head.id + '">Waage</button>'
          + '<button data-duplicate="' + head.id + '">Duplizieren</button><button data-delete-action="' + head.id + '" aria-label="Aktion löschen" title="Aktion löschen">×</button></div></article>';
      }).join('') : '<p>Noch keine neuen Aktionen. Beginne mit einer Wochen- oder Getränkeaktion.</p>') + '</div>'
      + '<p id="an-filter-empty" class="an-muted" hidden>Keine Aktionen in diesem Zeitraum.</p>'
      + '<details class="an-legacy-links"><summary>Bestehende Angebote und Designstandards</summary><p>Die bisherigen Aktionen und deren Design bleiben unverändert.</p>'
      + (legacyError ? '<p class="an-status an-error" role="alert">' + legacyError + '</p>' : '<p>' + legacy.length + ' bestehende Angebotsartikel gefunden.</p>')
      + '<a class="an-btn" id="an-legacy" href="/cms.html?tab=ang">Bisherige Angebote öffnen</a>'
      + '<a class="an-btn" href="/cms.html?tab=cfg&amp;flyer=drinks">Getränkeflyer-Designstandards</a></details>';
    function filterRows() {
      var today = new Date(M.today() + 'T12:00:00Z'), day = (today.getUTCDay() + 6) % 7;
      today.setUTCDate(today.getUTCDate() - day + (overviewFilter === 'next' ? 7 : 0));
      var start = today.toISOString().slice(0, 10); today.setUTCDate(today.getUTCDate() + 6);
      var end = today.toISOString().slice(0, 10), visible = 0;
      root.querySelectorAll('[data-action-id]').forEach(function (row) {
        row.hidden = overviewFilter !== 'all' && (!row.dataset.validFrom || !row.dataset.validTo || row.dataset.validFrom > end || row.dataset.validTo < start);
        if (!row.hidden) visible++;
      });
      root.querySelectorAll('[data-overview-filter]').forEach(function (button) { button.setAttribute('aria-pressed', String(button.dataset.overviewFilter === overviewFilter)); });
      $('an-filter-empty').hidden = visible > 0 || !result.actions.length;
    }
    root.querySelectorAll('[data-overview-filter]').forEach(function (button) { button.onclick = function () { overviewFilter = button.dataset.overviewFilter; filterRows(); }; });
    filterRows();
    root.querySelectorAll('[data-preview-action],[data-share-action],[data-scale-action],[data-delete-action]').forEach(function (button) {
      button.onclick = function () { run(async function () {
        var id = button.dataset.previewAction || button.dataset.shareAction || button.dataset.scaleAction || button.dataset.deleteAction;
        var head = result.actions.find(function (action) { return action.id === id; });
        if (button.dataset.deleteAction) {
          if (!(await M.dialog('Aktion löschen?', '„' + head.draft.title + '“ und die Homepagefreigabe werden entfernt. Bereits an die Waage gesendete Bilder bleiben dort erhalten und müssen bei Bedarf im Bereich Werbebilder entfernt werden.', 'Aktion löschen'))) return;
          await M.request('/api/angebote-verwaltung/' + id + '?action=delete', M.json('POST', { version: head.version }));
          await overview(); return;
        }
        if (button.dataset.scaleAction) { await open(id); await scale(); return; }
        await previewAction(head.draft, !!button.dataset.shareAction);
      }); };
    });
    root.querySelectorAll('[data-new]').forEach(function (b) { b.onclick = function () { run(function () { return create(b.dataset.new); }); }; });
    if ($('an-cms-back')) $('an-cms-back').onclick = function () { cmsHost.start(); };
    root.querySelectorAll('[data-open]').forEach(function (b) { b.onclick = function () { run(function () { return open(b.dataset.open); }); }; });
    root.querySelectorAll('[data-duplicate]').forEach(function (b) {
      b.onclick = function () { run(async function () {
        var res = await M.request('/api/angebote-verwaltung/' + b.dataset.duplicate + '?action=duplicate', M.json('POST', {}));
        await open(res.action.id);
      }); };
    });
  }
  async function shareDialog(draft, canvases) {
    var blobs = [];
    for (var canvas of canvases) {
      var blob = await new Promise(function (resolve) { canvas.toBlob(resolve, 'image/png'); });
      if (!blob) throw M.problem('Das Vorschaubild konnte nicht erstellt werden. Bitte erneut versuchen.');
      blobs.push(blob);
    }
    var files = blobs.map(function (blob, index) { return new File([blob], 'Angebot-' + (index + 1) + '.png', { type: 'image/png' }); });
    var message = '🏷️ *' + draft.title + '*\n_Gültig ' + M.date(draft.valid_from) + ' – ' + M.date(draft.valid_to) + '_';
    var mobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
    // Wie früher zuerst das System-Teilen-Menü (öffnet die WhatsApp-App); der Dialog ist nur der Ausweichweg.
    var note = '';
    if (navigator.share) {
      try { await navigator.share({ files: files, text: message, title: draft.title }); return; }
      catch (error) { if (error.name === 'AbortError') return; note = 'Das Teilen-Menü ist hier nicht verfügbar. Bitte eine der Möglichkeiten unten wählen.'; }
    }
    var urls = blobs.map(function (blob) { return URL.createObjectURL(blob); });
    var appLink = mobile ? 'https://wa.me/?text=' + encodeURIComponent(message) : 'whatsapp://send?text=' + encodeURIComponent(message);
    var webLink = 'https://web.whatsapp.com/send?text=' + encodeURIComponent(message);
    var canCopy = !mobile && !!(navigator.clipboard && navigator.clipboard.write && window.ClipboardItem);
    var dialog = document.createElement('dialog'); dialog.className = 'an-dialog an-share';
    dialog.setAttribute('aria-label', 'Angebot teilen');
    dialog.innerHTML = '<div class="an-dialog-top"><h2>Angebot teilen</h2><button type="button" data-share-close aria-label="Schließen">×</button></div>'
      + '<div class="an-share-pages">' + urls.map(function (url) { return '<img alt="" src="' + url + '">'; }).join('') + '</div>'
      + '<p class="an-muted" data-share-status role="status"></p>'
      + '<div class="an-actions an-share-actions">'
      + (canCopy ? blobs.map(function (blob, index) {
        return '<button type="button" class="an-primary" data-share-copy="' + index + '">'
          + (blobs.length > 1 ? 'Seite ' + (index + 1) + ' kopieren' : 'Bild kopieren & WhatsApp öffnen') + '</button>'; }).join('') : '')
      + '<button type="button"' + (canCopy ? '' : ' class="an-primary"') + ' data-share-whatsapp>WhatsApp öffnen</button>'
      + '<button type="button" data-share-download>Herunterladen</button>'
      + (mobile ? '' : '<button type="button" data-share-web>WhatsApp Web</button>') + '</div>';
    var status = dialog.querySelector('[data-share-status]');
    function say(text) { status.textContent = text; }
    say(note);
    function open(link) {
      var anchor = document.createElement('a'); anchor.href = link; anchor.rel = 'noopener';
      if (/^https?:/.test(link)) anchor.target = '_blank';
      document.body.appendChild(anchor); anchor.click(); anchor.remove();
    }
    dialog.addEventListener('close', function () { urls.forEach(function (url) { URL.revokeObjectURL(url); }); dialog.remove(); });
    dialog.addEventListener('click', async function (event) {
      var button = event.target.closest('button'); if (!button) return;
      if (button.hasAttribute('data-share-close')) { dialog.close(); return; }
      if (button.hasAttribute('data-share-copy')) {
        try {
          await navigator.clipboard.write([new ClipboardItem({ 'image/png': blobs[Number(button.dataset.shareCopy)] })]);
          say('Bild kopiert – in WhatsApp mit Strg+V einfügen.');
          if (blobs.length === 1) open(appLink);
        } catch (error) { say('Das Bild konnte nicht kopiert werden. Bitte „Herunterladen“ verwenden.'); }
        return;
      }
      if (button.hasAttribute('data-share-whatsapp')) { open(appLink); return; }
      if (button.hasAttribute('data-share-web')) { open(webLink); return; }
      if (button.hasAttribute('data-share-download')) {
        files.forEach(function (file, index) {
          var link = document.createElement('a'); link.href = urls[index]; link.download = file.name; link.click();
        });
        say('Heruntergeladen – in WhatsApp als Bild anhängen.');
      }
    });
    document.body.appendChild(dialog); dialog.showModal();
  }
  async function previewAction(draft, share) {
    var canvases = await M.preflight(draft);
    if (share) { await shareDialog(draft, canvases); return; }
    var dialog = document.createElement('dialog'); dialog.className = 'an-dialog an-action-preview';
    dialog.setAttribute('aria-label', 'Aktionsvorschau');
    dialog.innerHTML = '<div class="an-dialog-top"><h2>' + M.esc(draft.title) + '</h2><button aria-label="Vorschau schließen">×</button></div><div class="an-preview-pages"></div>';
    canvases.forEach(function (canvas) { dialog.querySelector('.an-preview-pages').appendChild(canvas); });
    dialog.querySelector('button').onclick = function () { dialog.close(); };
    dialog.addEventListener('close', function () { dialog.remove(); });
    document.body.appendChild(dialog); dialog.showModal();
  }
  async function create(kind) {
    if (cmsHost && !new URLSearchParams(location.search).has('bestand')) {
      await cmsHost.capture(null, kind); return;
    }
    var response = await M.request('/api/angebote-verwaltung?view=design'); design = response.design;
    record = null; data = M.blank(kind, design[kind]); M.applyTemplate(data);
    if (kind === 'weekly') await M.adoptWeekly(data);
    M.rememberDesign(data);
    dirty = true; undo = []; redo = []; step = 'articles'; page = 0; selected = ''; designTarget = 'card'; designItemId = '';
    if (kind === 'weekly') designTarget = 'sheet';
    pendingImages.clear(); pendingImageUrls.clear(); previewMode = 'paper'; renderEditor();
  }
  async function open(id) {
    var response = await M.request('/api/angebote-verwaltung/' + id);
    record = response.action; config = response.config; data = M.clone(record.draft);
    var targets = data.layout.targets || {};
    dirty = ['card', 'single', 'scale'].some(function (target) { return !targets[target] || targets[target].length !== data.items.length; });
    M.ensureTargets(data);
    undo = []; redo = []; step = 'articles'; page = 0; selected = ''; designTarget = 'card';
    designItemId = data.items[0] ? data.items[0].id : ''; pendingImages.clear(); pendingImageUrls.clear();
    previewMode = 'paper'; renderEditor();
    await loadMissingImages();
  }
  function field(label, prop, value, type, extra) {
    return '<label class="an-field"><span>' + label + '</span><input data-prop="' + prop + '" type="' + (type || 'text')
      + '" value="' + M.esc(value == null ? '' : value) + '" ' + (extra || '') + '></label>';
  }
  function renderItems() {
    var host = $('an-items');
    host.innerHTML = data.items.map(function (it, i) {
      var source = pendingImageUrls.get(it.id) || (it.image_id ? '/api/angebote-bilder/' + encodeURIComponent(it.image_id) : '');
      return '<article class="an-item" data-item-id="' + it.id + '">'
        + (source ? '<img class="an-item-thumb" data-image-id="' + M.esc(it.image_id) + '" alt="Artikelbild">' : '<span class="an-item-thumb an-no-image" aria-hidden="true">Bild</span>')
        + '<div class="an-item-main an-sr-only"><strong>' + M.esc(it.name || 'Neuer Artikel ' + (i + 1)) + '</strong>'
        + '<small>' + M.esc(it.article_number || 'ohne Artikelnummer') + (it.barcode ? ' · EAN ' + M.esc(it.barcode) : '')
        + ' · ' + (it.price_cents == null ? 'Preis offen' : M.money(it.price_cents) + ' €')
        + (data.kind === 'drinks' && it.price_cents != null && it.units && it.volume_ml
          ? ' · <span data-unit-price>' + M.money(M.base(it)) + ' €/l</span>' : '') + '</small></div>'
        + '<button type="button" data-edit-item="' + it.id + '" aria-label="Bild und weitere Details bearbeiten: ' + M.esc(it.name || 'Neuer Artikel') + '">Bild</button>'
        + '<details class="an-item-menu"><summary aria-label="Weitere Artikelaktionen">⋯</summary><div>'
        + '<button type="button" data-highlight="' + it.id + '" aria-pressed="' + it.highlight + '">' + (it.highlight ? '★ Hervorgehoben' : '☆ Hervorheben') + '</button>'
        + '<button type="button" data-up="' + it.id + '"' + (i === 0 ? ' disabled' : '') + '>↑ Nach oben</button>'
        + '<button type="button" data-remove="' + it.id + '">Entfernen</button></div></details>'
        + '<div class="an-item-fields">'
        + field('Artikelname', 'name', it.name, 'text', 'maxlength="160"')
        + field('Angebotspreis €', 'price_cents', it.price_cents == null ? '' : M.money(it.price_cents), 'text', 'inputmode="decimal"')
        + field('Stattpreis / UVP €', 'old_price_cents', it.old_price_cents == null ? '' : M.money(it.old_price_cents), 'text', 'inputmode="decimal"')
        + field('Beschreibung / Inhalt', 'description', it.description, 'text', 'maxlength="500"')
        + field('EAN / Strichcode', 'barcode', it.barcode, 'text', 'maxlength="80"')
        + '</div><p class="an-item-values" data-item-values></p>'
        + '<details class="an-item-extra"><summary>' + (data.kind === 'drinks' ? 'Gebinde, Pfand und Kennungen' : 'Artikelnummer und EAN') + '</summary><div class="an-fields">'
        + field('Artikelnummer', 'article_number', it.article_number, 'text', 'maxlength="80"')
        + (data.kind === 'drinks'
          ? field('Anzahl Flaschen / Einheiten', 'units', it.units, 'number', 'min="1" step="1"')
            + field('Liter je Einheit', 'volume_ml', M.litres(it.volume_ml), 'text', 'inputmode="decimal"')
            + '<label class="an-field"><span>Gebindeart</span><select data-prop="packaging"><option value="">Bitte wählen</option>'
            + ['Mehrweg', 'Einweg', 'Dose', 'Flasche', 'Karton', 'Fass'].map(function (value) {
              return '<option' + (it.packaging === value ? ' selected' : '') + '>' + value + '</option>';
            }).join('') + '</select></label>'
            + '<label class="an-field"><span>Pfandentscheidung</span><select data-prop="deposit_mode"><option value="">Bitte wählen</option>'
            + '<option value="yes"' + (!it.deposit_free && it.deposit_cents > 0 ? ' selected' : '') + '>Mit Pfand</option>'
            + '<option value="no"' + (it.deposit_free ? ' selected' : '') + '>Pfandfrei</option></select></label>'
            + field('Gesamtpfand €', 'deposit_cents', it.deposit_cents == null ? '' : M.money(it.deposit_cents), 'text', 'inputmode="decimal"' + (it.deposit_free ? ' disabled' : ''))
          : '') + '</div></details></article>';
    }).join('') || '<p>Noch keine Artikel ausgewählt.</p>';
    data.items.forEach(function (it) { updateItemValues(host.querySelector('[data-item-id="' + it.id + '"]'), it); });
    host.querySelectorAll('img[data-image-id]').forEach(loadThumbnail);
  }
  async function loadThumbnail(element) {
    try {
      var image = await M.image(element.dataset.imageId);
      if (!element.isConnected) return;
      var canvas = document.createElement('canvas'), scale = Math.min(1, 320 / Math.max(image.width, image.height));
      canvas.width = Math.max(1, Math.round(image.width * scale)); canvas.height = Math.max(1, Math.round(image.height * scale));
      canvas.getContext('2d').drawImage(image, 0, 0, canvas.width, canvas.height);
      element.src = canvas.toDataURL('image/png');
    } catch (error) {
      if (!element.isConnected) return;
      element.alt = 'Bild konnte nicht geladen werden';
      console.error('[Angebote] Bildvorschau', error);
      await M.error(error);
    }
  }
  function updateItemValues(row, it) {
    row.querySelector('.an-item-main strong').textContent = it.name || 'Neuer Artikel';
    row.querySelector('.an-item-main small').textContent = (it.article_number || 'ohne Artikelnummer')
      + (it.barcode ? ' · EAN ' + it.barcode : '');
    var discount = M.savings(it), values = row.querySelector('[data-item-values]');
    values.textContent = (it.retail_price_cents == null ? '' : 'Stamm-VK: ' + M.money(it.retail_price_cents) + ' € · ')
      + (discount ? 'Rabatt: −' + discount + ' %' : 'Rabatt: —');
    if (data.kind === 'drinks') {
      var base = M.base(it), hint = document.createElement('span');
      hint.dataset.unitPrice = ''; hint.textContent = ' · Literpreis: ' + (base == null ? '—' : M.money(base) + ' €/l') + ' · ohne Pfand';
      values.appendChild(hint);
    }
    var option = $('an-design-item') && Array.from($('an-design-item').options).find(function (entry) { return entry.value === it.id; });
    if (option) option.textContent = it.name || 'Neuer Artikel';
  }
  async function loadMissingImages() {
    var missing = data.items.filter(function (it) { return !it.image_id && (it.article_number || it.barcode); });
    if (!missing.length) return;
    var status = $('an-image-status'); status.textContent = 'Fehlende Artikelbilder werden automatisch gesucht …';
    try {
      var results = await lookupMasterImages(missing), found = 0;
      for (var it of missing) {
        var blob = imageForMaster(results, it);
        if (blob) { it.image_id = await upload(blob); changed(); found++; }
      }
      status.textContent = found + ' Artikelbilder übernommen.'
        + (found < missing.length ? ' Für ' + (missing.length - found) + ' Artikel wurde kein Bild gefunden. Du kannst es über „Bild“ ergänzen.' : '');
      renderItems(); await preview();
    } catch (error) {
      status.textContent = 'Die automatische Bildsuche ist fehlgeschlagen. Bitte den Entwurf erneut öffnen oder über „Bild“ erneut suchen.';
      throw error;
    }
  }
  function parseMasterPack(value) {
    var match = /(\d+)\s*[x×]\s*(\d+(?:[,.]\d+)?)\s*(ml|cl|l)?/i.exec(String(value || ''));
    if (!match) return {};
    var factor = /^(?:ml)$/i.test(match[3] || '') ? 1 : /^(?:cl)$/i.test(match[3] || '') ? 10 : 1000;
    var packaging = /mehrweg/i.test(value) ? 'Mehrweg' : /dose/i.test(value) ? 'Dose' : /einweg/i.test(value) ? 'Einweg' : '';
    return { units: Number(match[1]), volume_ml: Math.round(Number(match[2].replace(',', '.')) * factor), packaging: packaging };
  }
  function readVolume(input) {
    var ml = M.millilitres(input.value), invalid = input.value.trim() !== '' && ml == null;
    input.setCustomValidity(invalid ? 'Bitte einen Literinhalt größer als null mit höchstens drei Nachkommastellen eingeben, zum Beispiel 0,5.' : '');
    input.setAttribute('aria-invalid', String(invalid));
    if (invalid) input.reportValidity();
    else if (ml != null) input.value = M.litres(ml);
    return ml;
  }
  function masterItem(source, offerPrice) {
    var it = M.item(), retail = M.cents(source.vk);
    it.name = String(source.bezeichnung || '').trim();
    it.article_number = String(source.artikelnummer || '').trim();
    it.barcode = String(source.strichcode || '').trim();
    it.description = String(source.menge || '').trim();
    it.retail_price_cents = retail;
    var old = M.cents(source.angebot_statt) || M.cents(source.uvp);
    it.old_price_cents = old || retail;
    if (offerPrice) it.price_cents = retail;
    if (data.kind === 'drinks') Object.assign(it, parseMasterPack(source.menge));
    return it;
  }
  async function lookupMasterImages(articles) {
    var found = [];
    for (var start = 0; start < articles.length; start += 20) {
      var batch = articles.slice(start, start + 20).map(function (it) {
        return { artikelnummer: it.article_number || it.barcode || '', edeka_nr: it.article_number || '', strichcode: it.barcode || '' };
      });
      var response = await M.request('/api/werbebilder?sharepoint=1', M.json('POST', { articles: batch }));
      if (!Array.isArray(response)) throw M.problem('Die Bildsuche hat keine gültige Artikelliste zurückgegeben.');
      found = found.concat(response);
    }
    return found;
  }
  function imageDataBlob(data) {
    var match = /^data:(image\/(?:png|jpeg|webp));base64,([\s\S]+)$/i.exec(String(data || ''));
    if (!match) return null;
    var binary = atob(match[2]), bytes = new Uint8Array(binary.length);
    for (var i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    return new Blob([bytes], { type: match[1].toLowerCase() });
  }
  function imageForMaster(list, item) {
    var keys = [item.article_number, item.barcode].filter(Boolean);
    var match = list.find(function (entry) {
      return keys.indexOf(String(entry.dl_artikelnummer || '')) >= 0 && entry.dl_bild_base64;
    });
    return match && imageDataBlob(match.dl_bild_base64);
  }
  function elements() {
    if (designTarget === 'sheet') return data.layout.pages[page].elements;
    var target = data.layout.targets[designTarget] || [];
    var selectedLayout = target.find(function (entry) { return entry.item_id === designItemId; });
    return selectedLayout ? selectedLayout.elements : [];
  }
  function activeSize() { return designTarget === 'sheet' ? { w: M.W, h: M.H } : M.targetSizes[designTarget]; }
  function selection() { return elements().find(function (e) { return e.id === selected; }); }
  function constrainElement(e) {
    var size = activeSize(), angle = e.rotation * Math.PI / 180;
    var cos = Math.abs(Math.cos(angle)), sin = Math.abs(Math.sin(angle));
    var factor = Math.min(1, size.w / (cos * e.w + sin * e.h), size.h / (sin * e.w + cos * e.h));
    e.w *= factor; e.h *= factor;
    var halfW = (cos * e.w + sin * e.h) / 2, halfH = (sin * e.w + cos * e.h) / 2;
    e.x = Math.max(halfW, Math.min(size.w - halfW, e.x + e.w / 2)) - e.w / 2;
    e.y = Math.max(halfH, Math.min(size.h - halfH, e.y + e.h / 2)) - e.h / 2;
  }
  function renderCmsArticle() {
    var host = $('an-cms-article'); if (!host || !data) return;
    var current = !weeklyTarget() && selection();
    var id = (current && current.item_id) || designItemId || (data.items[0] && data.items[0].id);
    var item = data.items.find(function (entry) { return entry.id === id; });
    if (!item) { host.replaceChildren(); return; }
    var open = host.querySelector('details') ? host.querySelector('details').open : true;
    host.innerHTML = '<details class="an-article-edit" data-cms-article-id="' + item.id + '"' + (open ? ' open' : '') + '><summary>Artikel bearbeiten</summary><div class="an-fields">'
      + '<label class="an-field"><span>Artikelname</span><input data-cms-article="name" maxlength="160" value="' + M.esc(item.name) + '"></label>'
      + '<label class="an-field"><span>Angebot €</span><input data-cms-article="price_cents" inputmode="decimal" value="' + (item.price_cents == null ? '' : M.money(item.price_cents)) + '"></label>'
      + '<label class="an-field"><span>Statt €</span><input data-cms-article="old_price_cents" inputmode="decimal" value="' + (item.old_price_cents == null ? '' : M.money(item.old_price_cents)) + '"></label></div></details>';
  }
  function renderInspector() {
    renderInspectorBody(); renderCmsArticle(); cmsLayout();
    if (taskFrame) {
      D.compactHelp($('an-inspector'), taskFrame.help);
      D.expandGroups($('an-inspector'));
      $('an-inspector').querySelectorAll('[data-history]').forEach(function (button) { button.parentElement.remove(); });
    }
    syncArticleNavigation();
  }
  function cmsLayout() {
    if (!cmsAction || !cmsDialog) return;
    var narrow = cmsDialog.clientWidth < 1000;
    root.classList.add('an-cms-stacked');
    root.classList.toggle('an-cms-phone', cmsDialog.clientWidth < 640);
    var workspace = root.querySelector('.an-cms-workspace');
    if (!workspace || !cmsPanel || !cmsTabbar) return;
    workspace.classList.toggle('an-cms-weekly', weeklyTarget());
    cmsTabs();
    cmsNarrow = narrow;
  }
  function cmsTabs() {
    var tabs = [['element', 'Element'], ['article', 'Artikel'], ['design', 'Vorlage']]
      .concat(weeklyTarget() ? [['marker', 'Marker']] : []).concat([['view', 'Ansicht'], ['output', 'Ausgabe']]);
    if (!tabs.some(function (tab) { return tab[0] === cmsTab; })) cmsTab = 'element';
    var wanted = tabs.map(function (tab) { return tab[0]; }).join();
    if (cmsTabbar.dataset.tabs !== wanted) {
      cmsTabbar.dataset.tabs = wanted;
      cmsTabbar.innerHTML = tabs.map(function (tab) { return '<button type="button" data-cms-tab="' + tab[0] + '"' + (tab[0] === 'output' ? ' hidden' : '') + '>' + tab[1] + '</button>'; }).join('');
    }
    cmsTabbar.querySelectorAll('button').forEach(function (button) { button.setAttribute('aria-pressed', String(button.dataset.cmsTab === cmsTab)); });
    root.querySelector('.an-cms-workspace').dataset.anTab = cmsTab;
    root.querySelectorAll('[data-task-panel]').forEach(function (panel) {
      panel.hidden = panel.dataset.taskPanel !== cmsTab;
    });
    $('an-inspector').hidden = previewMode !== 'paper' || cmsTab === 'view' || cmsTab === 'output';
    cmsPanel.hidden = cmsTab !== 'design' && cmsTab !== 'marker';
    var article = $('an-cms-article');
    if (article) article.hidden = cmsTab !== 'article';
    var outputBar = root.querySelector('.an-output-bar'), itemPicker = $('an-design-item-wrap');
    if (outputBar && itemPicker) {
      if (outputMode()) outputBar.prepend(itemPicker);
      else root.querySelector('.an-task-fields').prepend(itemPicker);
      outputBar.hidden = !outputMode();
    }
    var weeklyPicture = root.querySelector('.an-weekly-picture');
    if (weeklyPicture) { weeklyPicture.hidden = outputMode() || !weeklyTarget(); weeklyPicture.inert = outputMode(); }
    var hits = $('an-hit-layer');
    if (hits) { hits.hidden = outputMode(); hits.inert = outputMode(); }
    syncOutput();
    var area = root.querySelector('.an-workspace-area');
    if (area) {
      area.value = cmsTab === 'output' ? 'output' : 'design';
      window.CMSAngeboteForm.syncAreaNavigation(area);
    }
  }
  function renderInspectorBody() {
    var host = $('an-inspector'); if (!host) return;
    if (weeklySurface) { weeklySurface.destroy(); weeklySurface = null; }
    var picture = root.querySelector('.an-weekly-picture');
    if (outputMode()) {
      if (picture) { picture.hidden = true; picture.inert = true; }
      host.replaceChildren(); return;
    }
    if (picture) picture.hidden = !weeklyTarget();
    if (weeklyTarget()) {
      var itemId = designItemId || (data.items[0] && data.items[0].id);
      var currentItem = data.items.find(function (item) { return item.id === itemId; });
      var key = currentItem && M.weeklyKey(currentItem);
      var group = designTarget === 'sheet' || designTarget === 'card' ? 'plakat_article_overrides' : 'flyer_article_overrides';
      var renderer = window.WochenangeboteRenderer.create({});
      var values = key && M.cmsFor(data, designTarget)[group][key] || (group === 'plakat_article_overrides' ? renderer.plakatArtOverrideDefault() : renderer.flyerArtOverrideDefault());
      host.innerHTML = '<div class="an-weekly-tools"></div><div id="an-cms-article"></div><details open><summary>Exakte CMS-Artikelpositionen</summary>'
        + (currentItem ? '<label class="an-field"><span>Artikelpositionen bearbeiten</span><select id="an-cms-item">'
          + data.items.map(function (item) { return '<option value="' + item.id + '"' + (item.id === itemId ? ' selected' : '') + '>' + M.esc(item.name || 'Neuer Artikel') + '</option>'; }).join('') + '</select></label>'
          + '<div class="an-fields">' + [['imgDx', 'Bild X', -800, 800], ['imgDy', 'Bild Y', -1130, 1130],
            ['imgScale', 'Bildgröße %', 20, 200], ['imgRot', 'Bilddrehung', -180, 180],
            ['priceDx', 'Preis X', -800, 800], ['priceDy', 'Preis Y', -1130, 1130]].map(function (field) {
              return '<label class="an-field"><span>' + field[1] + '</span><input type="number" data-cms-override="' + field[0] + '" data-cms-group="' + group + '" data-cms-item="' + itemId + '" value="' + values[field[0]] + '" min="' + field[2] + '" max="' + field[3] + '"></label>';
            }).join('') + '</div>' : '') + '</details>';
      if (!picture) { picture = document.createElement('div'); picture.className = 'an-weekly-picture an-weekly-surface'; $('an-stage').after(picture); }
      picture.hidden = false;
      weeklySurface = window.AngeboteVorschauEditor.mount(picture, {
        toolsHost: host.querySelector('.an-weekly-tools'), selectFirst: true, itemId: itemId,
        select: function (entry) {
          if (entry.itemId) designItemId = entry.itemId;
          syncArticleNavigation();
          var item = data.items.find(function (item) { return item.id === designItemId; });
          var defaults = group === 'plakat_article_overrides' ? renderer.plakatArtOverrideDefault() : renderer.flyerArtOverrideDefault();
          var overrides = item && M.cmsFor(data, designTarget)[group][M.weeklyKey(item)] || {};
          host.querySelectorAll('[data-cms-override]').forEach(function (field) {
            field.dataset.cmsItem = designItemId;
            field.value = overrides[field.dataset.cmsOverride] == null ? defaults[field.dataset.cmsOverride] : overrides[field.dataset.cmsOverride];
          });
          if (cmsAction) { cmsTab = 'element'; cmsTabs(); renderCmsArticle(); }
        },
        begin: checkpoint,
        change: function (element, delta) { M.changeWeekly(data, element, delta, designTarget); changed(); preview().catch(M.error); },
        override: function (entry) { return M.weeklyOverride(data, entry.itemId, entry.group, designTarget); },
        fields: M.weeklyFields, newCopy: M.weeklyNewCopy,
        mutate: function (entry, fn, quiet) {
          if (!quiet) checkpoint();
          var id = fn(M.weeklyOverride(data, entry.itemId, entry.group, designTarget));
          changed(); preview().catch(M.error); return id;
        },
        reset: function (entry, scope) {
          run(async function () {
            if (scope === 'all' && !(await M.dialog('Alle Anpassungen zurücksetzen?', 'Position, Größe, Drehung, Ghost, Duplikate, Kopien und das eigene Bild dieses Artikels werden zurückgesetzt. Andere Artikel bleiben unverändert.', 'Zurücksetzen'))) return;
            checkpoint();
            var ov = M.weeklyOverride(data, entry.itemId, entry.group, designTarget), defaults = M.weeklyDefaults(entry.group), overrides = M.cmsFor(data, designTarget, true)[entry.group], key = Object.keys(overrides).find(function (k) { return overrides[k] === ov; });
            if (scope === 'all') overrides[key] = defaults;
            else {
              var fields = M.weeklyFields(ov, entry);
              if (fields) ['dx', 'dy', 'scale', 'rot'].forEach(function (name) {
                fields.obj[fields[name]] = entry.ovKey === 'copy' ? (name === 'scale' ? 100 : 0) : (defaults[fields[name]] != null ? defaults[fields[name]] : (name === 'scale' ? 100 : 0));
              });
            }
            changed(); await preview();
          });
        },
        addImage: function (entry, file) {
          run(async function () {
            var url = await M.weeklyCompress(file);
            checkpoint();
            var ov = M.weeklyOverride(data, entry.itemId, entry.group, designTarget);
            ov.customImg = url; ov.customImgDx = 0; ov.customImgDy = 0; ov.customImgScale = 100; ov.customImgRot = 0;
            if (ov.customImgAlpha == null) ov.customImgAlpha = 100;
            changed(); await preview();
          });
        }
      });
      return;
    }
    var expanded = step === 'design' || !!(host.querySelector('details') && host.querySelector('details').open);
    if (!selection()) {
      var candidates = designTarget === 'sheet' && designItemId ? elements().filter(function (e) { return e.item_id === designItemId; }) : elements();
      var first = candidates.find(function (e) { return e.type === 'image' && !e.hidden; }) || candidates[0];
      selected = first ? first.id : '';
    }
    var current = selection();
    var size = activeSize();
    host.innerHTML = '<fieldset class="an-direct-tools"' + (designTarget !== 'sheet' && !designItemId ? ' disabled' : '') + '><legend>Gestalten</legend>'
      + '<label class="an-field"><span>Gestaltungselement</span><select id="an-select-element"><option value="">Bitte auswählen</option>'
      + M.groupedElements(data, elements(), controlLayout()).map(function (e, i) { return '<option value="' + e.id + '"' + (e.id === selected ? ' selected' : '') + '>'
        + (i + 1) + ' · ' + roleNames[e.type] + (e.hidden ? ' (ausgeblendet)' : '') + '</option>'; }).join('') + '</select></label>'
      + '<div class="an-element-actions"><button data-add-element="image">+ Eigenes Bild</button>'
      + (current && current.type === 'image' ? '<button data-replace-image>Bild ersetzen</button>' : '')
      + (current ? '<button data-element-action="copy">Duplizieren</button><button data-element-action="ghost">Ghost</button>' : '') + '</div>'
      + (current ? '<div class="an-element-actions an-transform-tools" role="group" aria-label="Drehen und Größe">'
        + '<button data-transform="left" aria-label="Element 15 Grad nach links drehen" title="15° nach links drehen">↶ 15°</button>'
        + '<button data-transform="right" aria-label="Element 15 Grad nach rechts drehen" title="15° nach rechts drehen">↷ 15°</button>'
        + '<button data-transform="smaller" aria-label="Element verkleinern" title="Proportional verkleinern">−</button>'
        + '<button data-transform="larger" aria-label="Element vergrößern" title="Proportional vergrößern">+</button>'
        + '<button data-transform="straight" aria-label="Drehung zurücksetzen" title="Drehung zurücksetzen">0°</button></div>' : '')
      + (current ? '<div class="an-quickbar" role="toolbar" aria-label="Schnellformatierung">'
        + '<label class="an-quick"><span>Farbe</span><input type="color" data-element-prop="fill" value="' + M.esc(current.fill || data.layout.text_color) + '"></label>'
        + '<label class="an-quick"><span>↻ Drehung</span><input type="range" min="-180" max="180" step="1" data-element-prop="rotation" value="' + current.rotation + '" aria-label="Drehung in Grad"></label>'
        + '<label class="an-quick"><span>Deckkraft</span><input type="range" min="0" max="1" step=".05" data-element-prop="opacity" value="' + current.opacity + '"></label>'
        + '<div class="an-quick-nudge" role="group" aria-label="Fein verschieben"><button data-nudge="-5,0" aria-label="Element nach links">←</button><button data-nudge="0,-5" aria-label="Element nach oben">↑</button><button data-nudge="0,5" aria-label="Element nach unten">↓</button><button data-nudge="5,0" aria-label="Element nach rechts">→</button></div></div>' : '')
      + '<details class="an-more-tools"' + (expanded ? ' open' : '') + '><summary>Weitere Werkzeuge · Position, Text und Ebenen</summary>'
      + '<div class="an-element-actions"><button data-add-element="text">+ Text</button><button data-add-element="shape">+ Fläche</button><button data-add-element="logo">+ Dorfladen-Logo</button></div>'
      + (current ? '<div class="an-fields">' + [
        ['x', 'Position X', 0, size.w], ['y', 'Position Y', 0, size.h], ['w', 'Breite', 8, size.w], ['h', 'Höhe', 8, size.h],
        ['font_size', 'Schriftgröße', 10, 160], ['rotation', 'Drehung', -180, 180]
      ].map(function (p) { return '<label class="an-field"><span>' + p[1] + '</span><input type="number" data-element-prop="' + p[0] + '" value="'
          + current[p[0]] + '" min="' + p[2] + '" max="' + p[3] + '" step="1"></label>'; }).join('') + '</div>'
        + '<div class="an-pair"><label class="an-field"><span>Schrift</span><select data-element-prop="font">' + ['Arial', 'Georgia', 'Verdana', 'Trebuchet MS'].map(function (font) { return '<option' + (current.font === font ? ' selected' : '') + '>' + font + '</option>'; }).join('') + '</select></label>'
        + '<label class="an-field"><span>Ausrichtung</span><select data-element-prop="align">' + [['left', 'Links'], ['center', 'Zentriert'], ['right', 'Rechts']].map(function (p) { return '<option value="' + p[0] + '"' + (current.align === p[0] ? ' selected' : '') + '>' + p[1] + '</option>'; }).join('') + '</select></label></div>'
        + (current.type === 'text' ? '<label class="an-field"><span>Eigener Text</span><textarea data-element-prop="text" maxlength="2000">' + M.esc(current.text) + '</textarea></label>' : '')
        + (current.type === 'shape' ? '<label class="an-field"><span>Form</span><select data-element-prop="shape">' + [['rect', 'Rechteck'], ['round', 'Abgerundet'], ['ellipse', 'Oval']].map(function (p) { return '<option value="' + p[0] + '"' + (current.shape === p[0] ? ' selected' : '') + '>' + p[1] + '</option>'; }).join('') + '</select></label>' : '')
        + '<div class="an-row"><label class="an-field"><input type="checkbox" data-element-prop="bold"' + (current.bold ? ' checked' : '') + '> Fett</label>'
        + '<label class="an-field"><input type="checkbox" data-element-prop="hidden"' + (current.hidden ? ' checked' : '') + '> Ausblenden</label></div>'
        + '<div class="an-element-actions"><button data-element-action="forward">Ebene nach vorn</button><button data-element-action="back">Ebene zurück</button><button data-element-action="delete">Element entfernen</button></div>' : '')
      + '</details></fieldset>';
  }
  function overlay() {
    var host = $('an-hit-layer'); if (!host) return;
    if (weeklyTarget() || outputMode()) { host.replaceChildren(); return; }
    var size = activeSize();
    var visible = M.groupedElements(data, elements(), controlLayout());
    host.innerHTML = visible.filter(function (e) { return !e.hidden; }).map(function (e) {
      return '<button type="button" data-select="' + e.id + '" class="' + (selected === e.id ? 'an-selected' : '') + '" aria-label="Element auswählen: ' + roleNames[e.type]
        + '" style="left:' + e.x / size.w * 100 + '%;top:' + e.y / size.h * 100 + '%;width:' + e.w / size.w * 100 + '%;height:' + e.h / size.h * 100
        + '%;transform:rotate(' + e.rotation + 'deg)"></button>';
    }).join('');
    var current = visible.find(function (element) { return element.id === selected; });
    if (current && !current.hidden) {
      window.AngeboteVorschauEditor.sizeHandles(host, current, visible, size.w);
      var points = window.AngeboteVorschauEditor.handlePoints(current, size.w, size.h);
      host.insertAdjacentHTML('beforeend', '<button type="button" class="an-resize-handle" data-resize="' + current.id
        + '" aria-label="Elementgröße ziehen" title="Größe ziehen" style="left:clamp(var(--an-handle-edge),'
        + points.resize.x + '%,calc(100% - var(--an-handle-edge)));top:clamp(var(--an-handle-edge),' + points.resize.y + '%,calc(100% - var(--an-handle-edge)))">↘</button>'
        + '<button type="button" class="an-rotate-handle" data-rotate="' + current.id
        + '" aria-label="Element frei drehen" title="Ziehen zum Drehen" style="left:clamp(var(--an-handle-edge),'
        + points.rotate.x + '%,calc(100% - var(--an-handle-edge)));top:clamp(var(--an-handle-edge),' + points.rotate.y + '%,calc(100% - var(--an-handle-edge)))">↻</button>');
    }
  }
  async function preview() {
    if (!data || !$('an-stage-canvas')) return;
    var ticket = ++paint, draft = M.clone(data), n = page, target = designTarget, itemId = designItemId;
    var ownStyle = designTarget !== 'sheet' && !weeklyTarget();
    await D.previewChoices($('an-style-controls'), controlLayout(), draft.kind);
    if (weeklyTarget()) {
      var group = designTarget === 'sheet' || designTarget === 'card' ? 'plakat' : 'flyer';
      $('an-style-controls').querySelectorAll('[data-cms-config]').forEach(function (control) {
        var key = control.dataset.cmsConfig, owner = /plakat/i.test(key) ? 'plakat' : /flyer/i.test(key) ? 'flyer' : '';
        var field = control.closest('.an-field'), unavailable = !!owner && owner !== group;
        field.dataset.objectUnavailable = String(unavailable);
        field.hidden = unavailable || (!!field.dataset.objectField && !field.closest('.an-object-dialog'));
      });
      $('an-style-controls').querySelectorAll('[data-side-panel=design]>.an-compact-group').forEach(function (fieldset) {
        fieldset.hidden = !fieldset.querySelector('.an-field:not([hidden])');
      });
    }
    var density = $('an-style-controls').querySelector('[data-style=density]');
    if (density) density.closest('fieldset').hidden = ownStyle;
    var noTargetItem = designTarget !== 'sheet' && !designItemId;
    var result;
    if (noTargetItem) {
      var empty = document.createElement('canvas'), emptySize = activeSize();
      empty.width = emptySize.w; empty.height = emptySize.h; result = { canvas: empty, errors: [] };
    } else result = target === 'sheet'
      ? await M.render(draft, n, 1.5)
      : await M.renderTarget(draft, target, itemId, 1.5);
    if (ticket !== paint || !data || !$('an-stage-canvas')) return;
    if (root._objectProperties) root._objectProperties.refresh();
    var canvas = result.canvas; canvas.id = 'an-stage-canvas'; canvas.setAttribute('aria-label', 'Live-Vorschau des Angebotsflyers');
    canvas._offerElements = elements(); canvas._offerWidth = activeSize().w;
    $('an-stage-canvas').replaceWith(canvas);
    if (weeklyTarget() && weeklySurface) weeklySurface.update(canvas, canvas._weeklyElements || [], canvas._weeklyWidth || activeSize().w, canvas._weeklyHeight || activeSize().h);
    var names = { card: 'Homepage-/Kioskkachel', single: 'Einzelflyer', scale: 'Waagenmotiv', sheet: 'Sammelflyer' };
    var context = root.querySelector('.an-workspace-context');
    if (context) context.textContent = 'Aktion „' + data.title + '“ · ' + names[designTarget] + (outputMode() ? ' · Ausgabevorschau' : ' · Gestaltung dieser Ausgabe');
    var size = activeSize();
    $('an-stage').style.aspectRatio = size.w + ' / ' + size.h;
    var canvasColumn = cmsAction && root.querySelector('.an-cms-canvas');
    if (cmsAction && cmsDialog) cmsLayout();
    var availableWidth = Math.max(100, canvasColumn ? canvasColumn.clientWidth : $('an-preview').clientWidth - 48);
    var maxHeight = window.innerHeight - (window.innerWidth > 1000 ? 455 : window.innerWidth > 480 ? 560 : 350);
    if (window.innerWidth <= 480) maxHeight = Math.min(430, maxHeight);
    maxHeight = Math.max(160, maxHeight);
    if (cmsAction) {
      var workspaceBox = root.querySelector('.an-cms-workspace');
      var chrome = workspaceBox.getBoundingClientRect().top - cmsDialog.getBoundingClientRect().top + cmsDialog.scrollTop + (canvasColumn.firstElementChild ? canvasColumn.firstElementChild.offsetHeight : 0);
      maxHeight = Math.max(180, root.classList.contains('an-cms-stacked') ? window.innerHeight * (cmsDialog.clientWidth >= 640 ? .56 : .35) : window.innerHeight - 12 - chrome - 64);
      if (root.classList.contains('an-cms-phone')) maxHeight = Math.max(maxHeight, Math.min(availableWidth, window.innerWidth * .52) * size.h / size.w);
    }
    var stageWidth = Math.min(availableWidth, maxHeight * size.w / size.h);
    $('an-stage').style.width = stageWidth + 'px';
    $('an-stage').style.height = stageWidth * size.h / size.w + 'px';
    $('an-stage').style.marginInline = 'auto';
    if (taskFrame) { $('an-stage').style.width = '100%'; $('an-stage').style.height = 'auto'; }
    if (canvasColumn) root.style.setProperty('--an-canvas-height', canvasColumn.offsetHeight + 'px');
    if (cmsAction && !taskFrame && !cmsScrolled && root.classList.contains('an-cms-stacked')) {
      cmsScrolled = true;
      var pinned = data.layout.cms ? root.querySelector('.an-weekly-surface .an-stage') : canvasColumn;
      if (pinned) pinned.scrollIntoView({ block: 'start' });
    }
    $('an-stage-info').textContent = result.errors.length ? result.errors.join(' ')
      : noTargetItem ? 'Füge einen Artikel hinzu, um diese Ausgabe zu gestalten.'
      : names[designTarget] + ' · ' + (designTarget === 'sheet' ? (data.layout.mode === 'free' ? 'freie Gestaltung' : 'Vorlagenmodus') : 'individuell je Artikel');
    $('an-stage-info').classList.toggle('an-error', result.errors.length > 0);
    var designItem = data.items.find(function (it) { return it.id === designItemId; });
    $('an-page-label').textContent = designTarget === 'sheet'
      ? 'Seite ' + (page + 1) + ' / ' + data.layout.pages.length
      : designItem ? designItem.name : '';
    $('an-page-prev').disabled = designTarget !== 'sheet' || page === 0;
    $('an-page-next').disabled = designTarget !== 'sheet' || page >= data.layout.pages.length - 1;
    $('an-page-tools').hidden = designTarget !== 'sheet';
    $('an-design-item-wrap').hidden = designTarget === 'sheet' && outputMode();
    if ($('an-design-item')) $('an-design-item').value = designItemId;
    syncArticleNavigation();
    root.querySelectorAll('[data-layout-target]').forEach(function (button) {
      button.setAttribute('aria-pressed', String(button.dataset.layoutTarget === designTarget));
    });
    $('an-stage').hidden = previewMode !== 'paper' || (weeklyTarget() && !outputMode());
    $('an-inspector').hidden = previewMode !== 'paper' || outputMode();
    $('an-other-preview').hidden = previewMode === 'paper';
    $('an-preview-hint').textContent = weeklyTarget() ? 'Originale CMS-Wochenvorlage' : previewMode === 'paper' ? 'Zum Auswählen auf ein Element tippen' : 'Ausgabevorschau · keine Änderung deiner Gestaltung';
    $('an-stage-help').hidden = weeklyTarget();
    if (previewMode !== 'paper') {
      var host = $('an-other-preview');
      if (!draft.items.length) host.innerHTML = '<p class="an-status">Füge einen Artikel hinzu, um diese Ausgabe anzusehen.</p>';
      else if (previewMode === 'cards') {
        host.innerHTML = D.cards(draft);
        M.paintCards(host, draft).catch(M.error);
      }
      else {
        var output = await D.outputPreview(draft, previewMode, n);
        if (ticket !== paint) return;
        output.setAttribute('aria-label', 'Waagenvorschau des Angebots');
        host.replaceChildren(output);
      }
    }
    overlay();
    if (cmsAction && cmsPanel) cmsTabs();
    var targetSelect = root.querySelector('[data-action-target]');
    if (targetSelect) targetSelect.value = designTarget;
  }
  function setStep(value) {
    step = value;
    root.querySelector('.an-layout').classList.toggle('an-article-layout', value === 'articles');
    ['articles', 'design', 'output'].forEach(function (s) { $('an-step-' + s).hidden = value !== s; });
    root.querySelectorAll('[data-step]').forEach(function (b) { b.setAttribute('aria-pressed', String(b.dataset.step === value)); });
    renderInspector();
    preview().catch(M.error);
  }
  function renderEditor() {
    if (taskFrame) { taskFrame.destroy(); taskFrame = null; }
    root.innerHTML = header(data.title || 'Dein Angebotsflyer')
      + '<div class="an-row an-preview-head an-toolbar"><span class="an-badge" id="an-state">' + (dirty ? 'Entwurf geändert · noch nicht gespeichert' : record && record.published_revision ? 'Gespeicherter Entwurf · veröffentlichte Fassung bleibt getrennt' : 'Gespeicherter Entwurf · nicht veröffentlicht')
      + '</span><div class="an-actions"><button data-history="undo"' + (undo.length ? '' : ' disabled') + '>Rückgängig</button>'
      + '<button data-history="redo"' + (redo.length ? '' : ' disabled') + '>Wiederholen</button>'
      + '<button id="an-reload-saved"' + (!record && !cmsAction ? ' disabled' : '') + '>Gespeicherten Stand laden</button>'
      + '<button id="an-overview">Zur Übersicht</button><button id="an-save" class="an-primary">Entwurf speichern</button></div></div>'
      + '<div class="an-layout"><section class="an-card an-work-panel"><nav class="an-tabs an-steps" aria-label="Bearbeitung"><button data-step="articles">1 · Artikel und Bilder</button><button data-step="design">2 · Frei gestalten</button><button data-step="output">3 · Ausgeben</button></nav>'
      + '<section id="an-step-articles"><details id="an-action-meta"><summary id="an-action-summary"></summary><div class="an-fields">'
      + '<label class="an-field wide"><span>Titel der Aktion</span><input id="an-title" data-action-prop="title" maxlength="120" value="' + M.esc(data.title) + '"></label>'
      + '<label class="an-field"><span>Gültig von</span><input type="date" data-action-prop="valid_from" value="' + data.valid_from + '"></label>'
      + '<label class="an-field"><span>Gültig bis</span><input type="date" data-action-prop="valid_to" value="' + data.valid_to + '"></label></div></details>'
      + '<h2>Artikel mit Bild auswählen</h2><div class="an-actions"><button id="an-add-catalog" class="an-primary">+ Aus Artikelstamm wählen</button><button id="an-add-manual">+ Manueller Artikel</button></div>'
      + '<p class="an-muted">Artikeldaten direkt ändern · „Bild“ öffnet die optionalen Bildwerkzeuge.</p><div id="an-items"></div><p id="an-image-status" class="an-muted" role="status"></p><p class="an-note">Angebotspreis, Pfand und Veröffentlichung bleiben vom Stamm getrennt. Eigene Produktbilder mit Strichcode werden zusätzlich in StrichcodeBilder gespeichert.</p>'
      + '<button data-step="design" class="an-primary">Weiter · Kachel / Flyer gestalten</button></section>'
      + '<section id="an-step-design" hidden><h2>Die vertraute freie Gestaltung</h2><p class="an-muted">Bild, Preis und Texte antippen und ziehen – oder mit Zahlen und Pfeilen bearbeiten. Jedes Ausgabeziel bleibt separat gespeichert.</p>'
      + '<section id="an-design-options"><h3>Vorlagen, Farben und Schrift</h3><div id="an-style-controls">' + D.controls(controlLayout()) + '</div>'
      + '<p class="an-note">Eine Vorlage ersetzt freie Positionen erst nach deiner Bestätigung – nur für das aktuelle Ausgabeziel und den gewählten Artikel.</p><div class="an-actions"><button id="an-template">Vorlage neu anwenden</button><button id="an-defaults">Designstandards übernehmen</button><button id="an-transfer">Auf andere Kacheln übertragen</button></div></section>'
      + '<div class="an-actions"><button id="an-add-page">+ Seite</button><button id="an-remove-page">Seite entfernen</button></div>'
      + '<button data-step="output" class="an-primary">Weiter · Ausgeben</button></section>'
      + '<section id="an-step-output" hidden><h2>Wie bei den bisherigen Angeboten ausgeben</h2><div id="an-output-previews">'
      + D.previewTabs(previewMode, 'data-editor-mode') + '</div><p>Speichern, Veröffentlichen, Drucken und Waagenversand sind getrennte Aktionen.</p>'
      + '<p class="an-status" id="an-output-status">' + (record && record.published_revision ? 'Eine veröffentlichte Fassung ist vorhanden. Änderungen bleiben bis zur nächsten Freigabe intern.' : 'Noch nicht veröffentlicht.') + '</p>'
      + '<p class="an-muted" id="an-quality-note" role="status">Qualitätsprüfung noch nicht ausgeführt.</p>'
      + '<div class="an-publish-actions"><button id="an-quality">Qualität prüfen</button><button id="an-publish" class="an-primary">Für Homepage veröffentlichen</button><button id="an-print-single">Einzelflyer drucken / PDF</button><button id="an-print-action">Sammelflyer A4 drucken / PDF</button><button id="an-scale">Für Waage vorbereiten</button></div>'
      + '<p class="an-note">Freigabe gilt im gewählten Zeitraum (Europe/Berlin). Die Waage wird nur nach eigenem Versand aktualisiert.</p></section></section>'
      + '<section class="an-preview an-card" id="an-preview"><div class="an-preview-head"><h2>Gestaltbare Homepage-/Kioskansicht</h2><span class="an-muted" id="an-preview-hint">Element antippen oder ziehen</span></div>'
      + '<nav class="an-tabs an-target-tabs" aria-label="Gestaltungsziel">'
      + '<button type="button" data-layout-target="card">Homepage / Kiosk</button><button type="button" data-layout-target="single">Einzelflyer</button>'
      + '<button type="button" data-layout-target="sheet">Sammelflyer</button><button type="button" data-layout-target="scale">Waage</button></nav>'
      + '<div class="an-article-picker" id="an-design-item-wrap"><div class="an-article-navigation"><button type="button" data-article-prev aria-label="Vorheriger Artikel">←</button><span data-article-position role="status"></span><button type="button" data-article-next aria-label="Nächster Artikel">→</button></div><label class="an-field"><span>Artikel auswählen</span><select id="an-design-item">'
      + data.items.map(function (item) { return '<option value="' + item.id + '"' + (item.id === designItemId ? ' selected' : '') + '>' + M.esc(item.name || 'Neuer Artikel') + '</option>'; }).join('')
      + '</select></label></div><div id="an-inspector" class="an-inspector"></div><div id="an-other-preview" hidden></div>'
      + '<div class="an-stage" id="an-stage"><canvas id="an-stage-canvas"></canvas><div class="an-hit-layer" id="an-hit-layer"></div></div>'
      + '<p class="an-stage-info" id="an-stage-info" role="status"></p><div class="an-actions an-spread" id="an-page-tools"><button id="an-page-prev" aria-label="Vorherige Flyerseite">←</button><span id="an-page-label"></span><button id="an-page-next" aria-label="Nächste Flyerseite">→</button></div>'
      + '<p class="an-muted" id="an-stage-help">Tippen = auswählen · Ziehen = verschieben · Quadrat unten rechts = Größe ändern. Zahlenfelder funktionieren auch ohne Ziehen.</p></section></div>';
    var summary = $('an-action-summary');
    summary.textContent = data.title + ' · ' + M.date(data.valid_from) + ' – ' + M.date(data.valid_to);
    renderItems(); setStep(step); bind(); preview().catch(M.error);
    if (data.kind === 'weekly') {
      $('an-defaults').textContent = 'Gespeicherte CMS-Wochenvorlage übernehmen';
      if (data.layout.cms) {
        $('an-template').hidden = true; $('an-add-page').hidden = true; $('an-remove-page').hidden = true;
      }
    }
    if (cmsAction) cmsPreviewTools();
    else editorWorkspace();
    if (busy) lock(true);
  }
  async function cmsPreview(action, mode, onClose, session) {
    try {
      cmsSession = session || null;
      cmsAction = action; cmsReturn = onClose; cmsScrolled = false;
      record = { id: action.id }; data = M.clone(action.data);
      var openingData = data;
      config = window.AngeboteDataverse.settings();
      dirty = false; undo = []; redo = []; page = 0; selected = '';
      step = 'design'; designTarget = 'sheet'; designItemId = data.items[0] ? data.items[0].id : '';
      previewMode = 'paper';
      if (cmsSession) {
        dirty = !!cmsSession.dirty;
        var state = cmsSession.state;
        if (state) {
          undo = M.clone(state.undo); redo = M.clone(state.redo);
          designTarget = state.designTarget; designItemId = state.designItemId;
          selected = state.selected; page = Math.min(state.page, data.layout.pages.length - 1);
        }
      }
      cmsPlaceholder = document.createComment('Angebotsverwaltung');
      root.before(cmsPlaceholder);
      root.classList.remove('an-cms-overview');
      root.innerHTML = '<p role="status">Die Vorschau wird geladen …</p>';
      cmsDialog = document.createElement('dialog'); cmsDialog.className = 'an-dialog an-cms-preview-modal';
      cmsDialog.setAttribute('aria-label', 'Vorschau');
      cmsDialog.appendChild(root); document.body.appendChild(cmsDialog);
      cmsDialog.addEventListener('cancel', function (event) { event.preventDefault(); run(closeCmsPreview); });
      cmsDialog.showModal();
      cmsTab = mode === 'output' ? 'output' : cmsSession && cmsSession.state ? cmsSession.state.cmsTab : 'element'; cmsNarrow = null;
      if (window.ResizeObserver) {
        cmsObserver = new ResizeObserver(function () {
          if (!cmsDialog || !cmsPanel || cmsNarrow === (cmsDialog.clientWidth < 1000)) return;
          cmsLayout(); preview().catch(M.error);
        });
        cmsObserver.observe(cmsDialog);
      }
      if (action.needs_weekly_template) await M.adoptWeekly(openingData);
      if (data !== openingData || !cmsDialog) return;
      if (action.restore_images) await window.AngeboteDataverse.restoreImages(openingData);
      if (data !== openingData || !cmsDialog) return;
      M.ensureTargets(data); renderEditor();
      await preview();
      if (mode === 'share') await previewAction(data, true);
      if (mode === 'scale') await scale();
    } catch (error) {
      if (cmsDialog && cmsPlaceholder) {
        cmsCleanup();
        cmsPlaceholder.replaceWith(root); cmsPlaceholder = null;
        cmsDialog.close(); cmsDialog.remove(); cmsDialog = null;
        cmsAction = null; record = null; data = null; dirty = false; paint++;
        cmsSession = null;
        root.classList.remove('an-cms-preview');
        await cmsReturn();
      }
      await M.error(error);
    }
  }
  function cmsCleanup() {
    if (cmsObserver) { cmsObserver.disconnect(); cmsObserver = null; }
    if (taskFrame) { taskFrame.destroy(); taskFrame = null; }
    root.classList.remove('an-task-editor'); root.style.removeProperty('height');
    cmsPanel = null; cmsTabbar = null; cmsNarrow = null;
  }
  async function closeCmsPreview() {
    if (!cmsSession && !(await discard())) return;
    var result = cmsSession ? { data: M.clone(data), dirty: dirty, undo: M.clone(undo), redo: M.clone(redo),
      designTarget: designTarget, designItemId: designItemId, selected: selected, page: page, cmsTab: cmsTab } : undefined;
    cmsCleanup();
    cmsAction = null; record = null; data = null; dirty = false; paint++;
    cmsSession = null;
    root.classList.remove('an-cms-preview');
    cmsPlaceholder.replaceWith(root); cmsPlaceholder = null;
    cmsDialog.close(); cmsDialog.remove(); cmsDialog = null;
    await cmsReturn(result);
  }
  function finishTaskFrame(layout, left, picture, view) {
    root.classList.add('an-task-editor');
    root.style.height = cmsAction ? '100%' : 'calc(100dvh - ' + Math.max(0, root.getBoundingClientRect().top) + 'px)';
    var cardTab = root.querySelector('[data-layout-target=card]');
    cardTab.setAttribute('aria-label', 'Homepage / Kiosk'); cardTab.title = 'Homepage / Kiosk'; cardTab.textContent = 'Kachel';
    left.classList.add('an-task-tools'); picture.classList.add('an-task-picture');
    var title = document.createElement('h2'), help = document.createElement('span');
    title.textContent = 'Bearbeiten'; help.className = 'an-designer-help'; title.appendChild(help); left.prepend(title);
    var toolbar = root.querySelector('.an-toolbar'), actions = toolbar.querySelector('.an-actions');
    var full = D.fullscreen(root, toolbar);
    toolbar.appendChild($('an-overview')); left.appendChild(actions);
    var context = document.createElement('section'); context.className = 'an-design-context';
    context.setAttribute('aria-label', 'Aktuelle Gestaltung');
    context.innerHTML = '<span data-action-design-context role="status"></span>'
      + '<select data-action-preset aria-label="Eigene Vorlage laden" hidden><option value="">Eigene Vorlage laden …</option></select>';
    var standard = $('an-defaults'); standard.textContent = 'Standard-Gestaltung laden'; standard.title = 'Zurück zur gespeicherten Standard-Gestaltung dieses Bereichs'; standard.dataset.designLoadStandard = ''; context.appendChild(standard);
    toolbar.after(context);
    actions.appendChild($('an-stage-info'));
    D.compactActions(actions); D.compactHelp(root, help); D.expandGroups(root);
    actions.classList.add('an-action-footer');
    actions.insertBefore($('an-state'), $('an-save'));
    var issues = $('an-stage-info');
    actions.before(issues);
    var splitter = D.split(layout, left, picture), viewport = D.pictureViewport(picture, view);
    D.objectProperties(root, {
      canvas: function () { return $('an-stage-canvas'); },
      item: function () { return selection()?.item_id || designItemId; },
      origin: function (group) { return M.originStatus(data, designTarget, group); },
      canReset: function () { return !!data.layout.design_origin?.targets[designTarget]; },
      reset: function (group) { M.resetObject(data, designTarget, group); changed(); preview().catch(M.error); },
      values: function () { return M.objectValues(data, designTarget); },
      begin: function () { objectTransaction = { data: M.clone(data), dirty: dirty, undo: undo.slice(), redo: redo.slice() }; },
      end: function (commit) {
        var before = objectTransaction; objectTransaction = null;
        var modified = JSON.stringify(data) !== JSON.stringify(before.data);
        undo = before.undo; redo = before.redo;
        if (commit && modified) { undo.push(before.data); if (undo.length > 30) undo.shift(); redo = []; changed(); }
        else {
          data = before.data; dirty = before.dirty;
          $('an-style-controls').innerHTML = D.controls(controlLayout());
          root._objectProperties.refresh(); renderInspector(); preview().catch(M.error);
        }
      }
    });
    taskFrame = { help: help, destroy: function () { splitter.destroy(); viewport.destroy(); full.destroy(); } };
  }
  function editorWorkspace() {
    var layout = root.querySelector('.an-layout'), left = root.querySelector('.an-work-panel'), picture = $('an-preview');
    var steps = left.querySelector('.an-steps'), fields = document.createElement('div');
    fields.className = 'an-task-fields';
    ['articles', 'design', 'output'].forEach(function (name) { fields.appendChild($('an-step-' + name)); });
    left.appendChild(fields); steps.classList.add('an-task-tabs');
    var targetTabs = picture.querySelector('.an-target-tabs'); layout.before(targetTabs);
    var designFields = $('an-step-design'), tools = document.createElement('div'), styles = document.createElement('div'), view = document.createElement('div');
    tools.dataset.editorPanel = 'element'; styles.dataset.editorPanel = 'design'; view.dataset.editorPanel = 'view';
    tools.append($('an-design-item-wrap'), $('an-inspector'));
    styles.appendChild($('an-design-options'));
    view.append(picture.querySelector('.an-preview-head'), $('an-page-tools'), $('an-stage-help'));
    var tabs = document.createElement('nav'); tabs.className = 'an-task-tabs'; tabs.setAttribute('aria-label', 'Gestaltungswerkzeuge');
    tabs.innerHTML = '<button type="button" data-editor-panel-tab="element">Element</button><button type="button" data-editor-panel-tab="design">Vorlage</button><button type="button" data-editor-panel-tab="view">Ansicht</button>';
    function select(name) {
      [tools, styles, view].forEach(function (panel) { panel.hidden = panel.dataset.editorPanel !== name; });
      tabs.querySelectorAll('button').forEach(function (button) { button.setAttribute('aria-pressed', String(button.dataset.editorPanelTab === name)); });
    }
    tabs.onclick = function (event) { var button = event.target.closest('button'); if (button) select(button.dataset.editorPanelTab); };
    designFields.prepend(tabs, tools, styles, view); select('element');
    finishTaskFrame(layout, left, picture, view);
    createOutputControls(picture);
  }
  function cmsPreviewTools() {
    root.classList.add('an-cms-preview');
    var title = root.querySelector('.an-head');
    root.querySelector('.an-toolbar').prepend(title);
    $('an-state').textContent = M.savedState(data, dirty);
    $('an-save').textContent = cmsSession ? 'Aktion speichern' : 'Gestaltung speichern';
    $('an-reload-saved').hidden = !!cmsSession;
    $('an-overview').textContent = cmsSession ? 'Artikel / Bilder' : 'Schließen';
    $('an-overview').onclick = function () { run(closeCmsPreview); };
    {
      var area = document.createElement('select'); area.className = 'an-workspace-area'; area.setAttribute('aria-label', 'Aktionsbereich');
      area.innerHTML = (cmsSession ? '<option value="articles">Artikel / Bilder</option>' : '') + '<option value="design">Gestaltung</option><option value="output">Ausgabe</option>';
      area.value = cmsTab === 'output' ? 'output' : 'design';
      area.onchange = function () {
        if (area.value === 'articles') run(closeCmsPreview);
        else { cmsTab = area.value === 'output' ? 'output' : 'element'; renderInspector(); preview().catch(M.error); }
      };
      root.querySelector('.an-toolbar').prepend(area);
      window.CMSAngeboteForm.areaNavigation(area);
    }
    var panel = root.querySelector('.an-work-panel');
    panel.hidden = true;
    var previewPanel = $('an-preview');
    previewPanel.querySelector('h2').textContent = 'Vorschau';
    cmsPanel = document.createElement('section'); cmsPanel.className = 'an-cms-style-options';
    cmsPanel.setAttribute('aria-label', 'Vorlage und Gestaltung');
    cmsPanel.appendChild($('an-design-options'));
    cmsTabbar = document.createElement('nav'); cmsTabbar.className = 'an-tabs an-cms-tabbar an-task-tabs'; cmsTabbar.setAttribute('aria-label', 'Gestaltungsbereich');
    cmsTabbar.onclick = function (event) {
      var button = event.target.closest('[data-cms-tab]'); if (!button) return;
      cmsTab = button.dataset.cmsTab; renderInspector(); preview().catch(M.error);
    };
    var workspace = document.createElement('div'); workspace.className = 'an-cms-workspace' + (data.layout.cms ? ' an-cms-weekly' : '');
    var canvasColumn = document.createElement('div'); canvasColumn.className = 'an-cms-canvas';
    var sideColumn = document.createElement('div'); sideColumn.className = 'an-cms-side';
    var article = document.createElement('div'); article.id = 'an-cms-article';
    var fields = document.createElement('div'); fields.className = 'an-task-fields';
    var view = document.createElement('div'); view.dataset.taskPanel = 'view';
    var output = document.createElement('div'); output.dataset.taskPanel = 'output';
    var notice = root.querySelector(':scope>.an-note');
    if (notice) output.appendChild(notice);
    var tabs = previewPanel.querySelector('.an-target-tabs');
    var context = document.createElement('label'); context.className = 'an-action-context';
    context.innerHTML = '<span>Gestalten für</span><select data-action-target aria-label="Gestaltungsziel">'
      + '<option value="sheet">Sammelflyer</option><option value="single">Einzelflyer</option><option value="card">Homepage / Kiosk</option><option value="scale">Waage</option></select>';
    context.lastElementChild.value = designTarget;
    context.lastElementChild.onchange = function () { tabs.querySelector('[data-layout-target="' + this.value + '"]').click(); };
    tabs.hidden = true;
    tabs.after(workspace); workspace.append(sideColumn, canvasColumn);
    canvasColumn.append($('an-other-preview'), $('an-stage'));
    var weeklyPicture = root.querySelector('.an-weekly-picture');
    if (weeklyPicture) canvasColumn.appendChild(weeklyPicture);
    view.append($('an-page-tools'), $('an-stage-help'));
    fields.append($('an-design-item-wrap'), $('an-inspector'), cmsPanel, view, output);
    sideColumn.append(context, cmsTabbar, fields);
    if (!weeklyTarget()) $('an-inspector').before(article);
    finishTaskFrame(workspace, sideColumn, canvasColumn, view);
    createOutputControls(canvasColumn);
    renderCmsArticle(); cmsLayout();
  }
  function createOutputControls(picture) {
    var bar = document.createElement('section'); bar.className = 'an-output-bar'; bar.hidden = true;
    bar.setAttribute('aria-label', 'Ausgabe der Vorschau');
    bar.innerHTML = '<label class="an-field"><span>Ausgabeformat</span><select data-output-target aria-label="Ausgabeformat">'
      + '<option value="sheet">Sammelflyer</option><option value="single">Einzelflyer</option><option value="card">Homepage / Kiosk</option><option value="scale">Waage</option></select></label>'
      + '<div class="an-output-actions"><button type="button" class="an-primary" data-cms-print>Drucken / PDF</button>'
      + '<button type="button" data-cms-download>Als PNG speichern</button><button type="button" data-cms-singles>Weitere Artikel …</button>'
      + '<button type="button" data-cms-all-pages>Alle Seiten als PNG</button><button type="button" data-cms-scale title="Einzelartikel im Wechsel auf die Waage">⚖ Waage</button></div>'
      + '<details class="an-output-more"><summary>Mehr</summary><div class="an-output-actions">'
      + '<button type="button" data-cms-quality>Qualität prüfen</button>'
      + (!cmsAction ? '<button type="button" data-output-publish>Für Homepage veröffentlichen</button>' : '') + '</div></details>'
      + '<p data-export-state role="status"></p><button type="button" data-output-back>Zur Gestaltung</button>';
    picture.prepend(bar);
    var note = $('an-quality-note'); if (note) bar.appendChild(note);
    bar.querySelector('[data-output-target]').onchange = function () {
      root.querySelector('[data-layout-target="' + this.value + '"]').click();
    };
    bar.querySelector('[data-cms-download]').onclick = function () { run(function () { return exportOutput('png'); }); };
    bar.querySelector('[data-cms-all-pages]').onclick = function () { run(function () { return exportOutput('png', null, true); }); };
    bar.querySelector('[data-cms-print]').onclick = function () { run(function () { return exportOutput('print'); }); };
    bar.querySelector('[data-cms-singles]').onclick = choosePrintArticles;
    bar.querySelector('[data-cms-scale]').onclick = function () { run(scale); };
    bar.querySelector('[data-cms-quality]').onclick = function () { run(function () { return qualityGate(true); }); };
    var publishButton = bar.querySelector('[data-output-publish]');
    if (publishButton) publishButton.onclick = function () { run(publish); };
    bar.querySelector('[data-output-back]').onclick = function () {
      if (cmsAction) { cmsTab = 'element'; renderInspector(); preview().catch(M.error); }
      else setStep('design');
    };
    syncOutput();
  }
  function choosePrintArticles() {
    var dlg = document.createElement('dialog'); dlg.className = 'an-dialog an-batch-print';
    dlg.setAttribute('aria-label', 'Einzelflyer auswählen');
    dlg.innerHTML = '<form><h2>Einzelflyer auswählen</h2><p>Ein A4-Blatt je ausgewähltem Artikel.</p>'
      + '<div class="an-actions"><button type="button" data-batch-all>Alle auswählen</button><button type="button" data-batch-none>Auswahl aufheben</button></div>'
      + '<div class="an-batch-items">' + data.items.map(function (item) { return '<label class="an-check"><input type="checkbox" value="'
        + M.esc(item.id) + '"' + (item.id === designItemId ? ' checked' : '') + '> ' + M.esc(item.name || 'Neuer Artikel') + '</label>'; }).join('')
      + '</div><div class="an-actions"><button type="button" data-batch-cancel>Abbrechen</button><button type="submit" class="an-primary" data-batch-print></button></div></form>';
    var previous = document.activeElement;
    function ids() { return Array.from(dlg.querySelectorAll('input:checked'), function (box) { return box.value; }); }
    function update() { var button = dlg.querySelector('[data-batch-print]'), count = ids().length; button.disabled = !count; button.textContent = 'Ausgewählte Einzelflyer drucken / PDF (' + count + ')'; }
    function close() { dlg.close(); dlg.remove(); if (previous && previous.isConnected) previous.focus(); }
    dlg.onchange = update;
    dlg.querySelector('[data-batch-all]').onclick = function () { dlg.querySelectorAll('input').forEach(function (box) { box.checked = true; }); update(); };
    dlg.querySelector('[data-batch-none]').onclick = function () { dlg.querySelectorAll('input').forEach(function (box) { box.checked = false; }); update(); };
    dlg.querySelector('[data-batch-cancel]').onclick = close;
    dlg.oncancel = function (event) { event.preventDefault(); close(); };
    dlg.querySelector('form').onsubmit = function (event) { event.preventDefault(); var chosen = ids(); if (!chosen.length) return; close(); run(function () { return exportOutput('print', chosen); }); };
    document.body.appendChild(dlg); dlg.showModal(); update();
  }
  async function exportOutput(method, itemIds, allPages) {
    var draft = M.clone(data), target = itemIds ? 'single' : designTarget, currentPage = page;
    var ids = itemIds ? itemIds.slice() : [designItemId], names = [], canvases = [];
    if (!draft.items.length) throw M.problem('Bitte zuerst einen Artikel erfassen.');
    if (!(await qualityGate(false, draft, target, ids))) return;
    if (target === 'sheet') {
      var pages = method === 'print' || allPages ? draft.layout.pages.map(function (_, index) { return index; }) : [currentPage];
      for (var n of pages) {
        var rendered = await M.render(draft, n, 2);
        if (rendered.errors.length) throw M.problem(rendered.errors[0]);
        canvases.push(rendered.canvas); names.push(draft.title + ' · Seite ' + (n + 1));
      }
    } else {
      for (var id of ids) {
        var item = draft.items.find(function (entry) { return entry.id === id; });
        if (!item) throw M.problem('Der ausgewählte Artikel ist nicht mehr verfügbar. Bitte erneut auswählen.');
        var result = await M.renderTarget(draft, target, id, 2);
        if (result.errors.length) throw M.problem(result.errors[0]);
        canvases.push(result.canvas); names.push(draft.title + ' · ' + item.name);
      }
    }
    if (method === 'print') return printCanvases(canvases, names);
    for (var index = 0; index < canvases.length; index++) {
      var blob = imageDataBlob(canvases[index].toDataURL('image/png'));
      if (!blob) throw M.problem('Das Bild konnte nicht erstellt werden.');
      var url = URL.createObjectURL(blob), link = document.createElement('a');
      link.href = url; link.download = (names[index] + '-' + target).replace(/[<>:"/\\|?*\x00-\x1f]/g, '-').slice(0, 160) + '.png';
      link.click(); setTimeout(function (value) { URL.revokeObjectURL(value); }, 10000, url);
    }
  }
  function addItem(it) {
    addItems([it]);
  }
  function addItems(items) {
    edit(function () {
      data.items.push.apply(data.items, items);
      if (data.layout.mode === 'template') M.applyTemplate(data);
      else {
        items.forEach(function (it) {
          var extra = M.clone(data); extra.items = [it]; M.applyTemplate(extra);
          data.layout.pages.push(extra.layout.pages[0]);
        });
      }
      M.ensureTargets(data);
    });
    if (!designItemId) designItemId = items[0].id;
    renderItems(); renderInspector();
  }
  async function upload(file) {
    if (!file) return '';
    if (cmsAction) return (await window.AngeboteDataverse.productImage(file, 'ANG-' + M.uid())).image_id;
    var response = await M.request('/api/angebote-bilder', { method: 'POST', headers: { 'Content-Type': file.type || 'application/octet-stream' }, body: file });
    return response.image_id;
  }
  async function saveMasterImage(file, barcode) {
    var encoded = await new Promise(function (resolve, reject) {
      var reader = new FileReader();
      reader.onload = function () { resolve(reader.result); };
      reader.onerror = function () { reject(M.problem('Das Bild konnte nicht gelesen werden. Bitte erneut auswählen.')); };
      reader.readAsDataURL(file);
    });
    var result = await M.request('/api/werbebilder', M.json('POST', { dl_artikelnummer: barcode, dl_bild_base64: encoded }));
    if (!result.success || !result.id) throw M.problem('Das Produktbild konnte nicht in StrichcodeBilder gespeichert werden. Bitte erneut versuchen.');
  }
  async function picker() {
    var response = await M.request('/api/preisliste?all=1');
    if (!response.groups || typeof response.groups !== 'object') throw M.problem('Der Artikelstamm konnte nicht gelesen werden.');
    var catalog = Object.keys(response.groups).reduce(function (all, group) {
      return all.concat((response.groups[group] || []).filter(function (item) { return item.bezeichnung; }));
    }, []);
    var chosen = new Set();
    var dlg = document.createElement('dialog'); dlg.className = 'an-dialog';
    dlg.innerHTML = '<div class="an-dialog-top"><h2>Artikel aus dem Artikelstamm wählen</h2><button class="an-close" aria-label="Artikelauswahl schließen">×</button></div>'
      + '<p>Suche nach Artikelname, Nummer oder EAN. Der VK wird nur als Vergleich übernommen.</p>'
      + '<label class="an-field"><span>Artikel suchen</span><input type="search" autofocus></label>'
      + '<label class="an-check"><input id="an-copy-vk" type="checkbox">Stamm-VK auch als Angebotspreis vorbelegen</label>'
      + '<div class="an-picker-results"></div><p class="an-muted" id="an-picker-status" role="status"></p>'
      + '<div class="an-dialog-actions"><button type="button" class="an-primary" id="an-master-add" disabled>Auswahl übernehmen</button></div>';
    function close() { dlg.close(); dlg.remove(); }
    function updateSelection() {
      dlg.querySelector('#an-master-add').disabled = chosen.size === 0;
      dlg.querySelector('#an-master-add').textContent = 'Auswahl übernehmen (' + chosen.size + ')';
    }
    function results() {
      var q = dlg.querySelector('input').value.toLocaleLowerCase('de');
      var matches = catalog.map(function (article, index) { return { article: article, index: index }; }).filter(function (entry) {
        var a = entry.article;
        return [a.bezeichnung, a.artikelnummer, a.strichcode].join(' ').toLocaleLowerCase('de').includes(q);
      });
      dlg.querySelector('.an-picker-results').innerHTML = matches.map(function (entry) {
        var a = entry.article, index = entry.index, price = M.cents(a.vk);
        return '<button type="button" data-master-index="' + index + '" aria-pressed="' + chosen.has(index) + '"><span><strong>'
          + M.esc(a.bezeichnung) + '</strong><br><small>' + M.esc(a.artikelnummer || 'ohne Artikelnummer') + (a.strichcode ? ' · EAN ' + M.esc(a.strichcode) : '')
          + (a.menge ? ' · ' + M.esc(a.menge) : '') + '</small></span><span>' + (price == null ? 'VK —' : 'VK ' + M.money(price) + ' €')
          + '<span data-master-selected>' + (chosen.has(index) ? ' · ✓' : ' · + Auswählen') + '</span></span></button>';
      }).join('') || '<p>Kein Artikel gefunden. Du kannst einen eigenen Artikel erfassen.</p>';
      updateSelection();
    }
    dlg.querySelector('.an-close').onclick = close; dlg.addEventListener('cancel', function (e) { e.preventDefault(); close(); });
    dlg.querySelector('input').oninput = results;
    dlg.addEventListener('click', function (e) {
      var b = e.target.closest('[data-master-index]');
      if (b) {
        var index = Number(b.dataset.masterIndex);
        if (chosen.has(index)) chosen.delete(index); else chosen.add(index);
        b.setAttribute('aria-pressed', String(chosen.has(index)));
        b.querySelector('[data-master-selected]').textContent = chosen.has(index) ? ' · ✓' : ' · + Auswählen';
        updateSelection();
      }
    });
    dlg.querySelector('#an-master-add').onclick = function () {
      run(async function () {
        var selectedSources = Array.from(chosen).map(function (index) { return catalog[index]; });
        var imageResults = await lookupMasterImages(selectedSources.map(function (source) {
          return { article_number: String(source.artikelnummer || ''), barcode: String(source.strichcode || '') };
        }));
        var missingImageCount = 0, items = [];
        for (var source of selectedSources) {
          var it = masterItem(source, dlg.querySelector('#an-copy-vk').checked);
          var blob = imageForMaster(imageResults, it);
          if (blob) it.image_id = await upload(blob);
          else missingImageCount++;
          items.push(it);
        }
        addItems(items);
        close();
        $('an-image-status').textContent = missingImageCount
          ? 'Für ' + missingImageCount + ' Artikel wurde kein Bild gefunden. Du kannst es über „Bild“ ergänzen.'
          : 'Artikelbilder automatisch übernommen.';
      });
    };
    document.body.appendChild(dlg); results(); dlg.showModal();
  }
  function openItemDialog(itemId) {
    var item = data.items.find(function (entry) { return entry.id === itemId; });
    if (!item) return;
    var drinks = data.kind === 'drinks', dlg = document.createElement('dialog');
    dlg.className = 'an-dialog an-item-dialog'; dlg.dataset.itemId = itemId;
    dlg.innerHTML = '<div class="an-dialog-top"><div><h2>Artikel und Bild bearbeiten</h2><p class="an-badge">'
      + (item.article_number ? 'Artikelstamm · Preise nur in diesem Angebot' : 'Manuell · eigenes Bild hinzufügen') + '</p></div>'
      + '<button type="button" class="an-close" aria-label="Artikelbearbeitung schließen">×</button></div>'
      + '<section class="an-image-tools"><div class="an-image-preview">' + (item.image_id
        ? '<img data-image-id="' + M.esc(item.image_id) + '" alt="Aktuelles Artikelbild">'
        : '<span>Kein Artikelbild</span>') + '</div><div class="an-image-actions"><strong>Artikelbild – auch bei manueller Anlage</strong>'
      + '<div class="an-actions"><label class="an-btn an-upload">Bilddatei wählen / ersetzen<input type="file" accept="image/jpeg,image/png,image/webp"></label>'
      + '<button type="button" data-image-search>🔍 Bild per Nummer / EAN suchen</button>'
      + '<button type="button" data-image-paste>📋 Zwischenablage einfügen</button>'
      + '<button type="button" data-image-remove' + (item.image_id ? '' : ' disabled') + '>Bild entfernen</button></div>'
      + '<details class="an-image-more"><summary>Weitere Bildfunktionen</summary><p class="an-muted">Eigene Produktbilder mit EAN / Strichcode werden zusätzlich in StrichcodeBilder gespeichert und ersetzen dort das gemeinsame Produktbild. Ohne Strichcode bleibt das Bild nur in diesem Angebot. Gefundene Bilder werden nicht zurückgeschrieben.</p></details>'
      + '<p class="an-muted" data-image-status role="status">Die Bildauswahl wird erst beim Speichern dem Angebot zugeordnet.</p></div></section>'
      + '<div class="an-fields an-core-fields"><label class="an-field wide"><span>Artikelname</span><input data-item-field="name" maxlength="160" value="' + M.esc(item.name) + '"></label>'
      + '<label class="an-field"><span>Regulärer VK · Artikelstamm</span><input value="' + (item.retail_price_cents == null ? '—' : M.money(item.retail_price_cents) + ' €') + '" readonly></label>'
      + '<label class="an-field"><span>Angebotspreis €</span><input data-item-field="price_cents" inputmode="decimal" value="' + (item.price_cents == null ? '' : M.money(item.price_cents)) + '"></label>'
      + '<label class="an-field"><span>Stattpreis €</span><input data-item-field="old_price_cents" inputmode="decimal" value="' + (item.old_price_cents == null ? '' : M.money(item.old_price_cents)) + '"></label>'
      + (drinks ? '<label class="an-field"><span>Anzahl Flaschen / Einheiten</span><input data-item-field="units" type="number" min="1" step="1" value="' + (item.units || '') + '"></label>'
        + '<label class="an-field"><span>Liter je Einheit</span><input data-item-field="volume" inputmode="decimal" value="' + M.litres(item.volume_ml) + '"></label>'
        + '<label class="an-field"><span>Gebindeart</span><select data-item-field="packaging"><option value="">Bitte wählen</option>'
        + ['Mehrweg', 'Einweg', 'Dose', 'Flasche', 'Karton', 'Fass'].map(function (value) {
          return '<option value="' + value + '"' + (item.packaging === value ? ' selected' : '') + '>' + value + '</option>';
        }).join('') + '</select></label>'
        + '<label class="an-field"><span>Pfandentscheidung</span><select data-item-field="deposit_mode"><option value="">Bitte wählen</option>'
        + '<option value="yes"' + (!item.deposit_free && item.deposit_cents > 0 ? ' selected' : '') + '>Mit Pfand</option>'
        + '<option value="no"' + (item.deposit_free ? ' selected' : '') + '>Pfandfrei</option></select></label>'
        + '<label class="an-field"><span>Gesamtpfand €</span><input data-item-field="deposit_cents" inputmode="decimal" value="' + (item.deposit_cents == null ? '' : M.money(item.deposit_cents)) + '"' + (item.deposit_free ? ' disabled' : '') + '></label>' : '')
      + '<details class="an-extra-fields"><summary>Zusatzangaben</summary><div class="an-fields">'
      + '<label class="an-field"><span>Artikelnummer</span><input data-item-field="article_number" maxlength="80" value="' + M.esc(item.article_number) + '"></label>'
      + '<label class="an-field"><span>EAN / Strichcode</span><input data-item-field="barcode" maxlength="80" value="' + M.esc(item.barcode) + '"></label>'
      + '<label class="an-field wide"><span>Beschreibung / Inhalt</span><input data-item-field="description" maxlength="500" value="' + M.esc(item.description) + '"></label></div></details>'
      + '<div class="an-dialog-actions"><button type="button" class="an-primary" data-item-save>Übernehmen</button></div>';
    var preview = dlg.querySelector('.an-image-preview'), status = dlg.querySelector('[data-image-status]');
    var imageBlob = null, imageUrl = '', clearImage = false, pasteEnabled = false, closed = false, ownImage = false;
    function setPreview(blob, own) {
      if (imageUrl) URL.revokeObjectURL(imageUrl);
      imageBlob = blob; ownImage = !!own; clearImage = false; imageUrl = blob ? URL.createObjectURL(blob) : '';
      preview.innerHTML = imageUrl ? '<img alt="Ausgewähltes Artikelbild" src="' + imageUrl + '">' : '<span>Kein Artikelbild</span>';
      dlg.querySelector('[data-image-remove]').disabled = !imageUrl && !item.image_id;
    }
    function close() {
      if (closed) return; closed = true;
      document.removeEventListener('paste', onPaste);
      if (imageUrl) URL.revokeObjectURL(imageUrl);
      dlg.close(); dlg.remove();
    }
    function onPaste(event) {
      if (!dlg.open || !pasteEnabled) return;
      var files = Array.from(event.clipboardData && event.clipboardData.items || [])
        .map(function (entry) { return entry.getAsFile(); }).filter(function (file) { return file && /^image\/(png|jpeg|webp)$/.test(file.type); });
      if (!files.length) { status.textContent = 'In der Zwischenablage wurde kein PNG-, JPEG- oder WebP-Bild gefunden.'; return; }
      event.preventDefault(); setPreview(files[0], true); pasteEnabled = false;
      status.textContent = 'Zwischenablagebild ausgewählt. Mit „Übernehmen“ wird es diesem Angebot hinzugefügt.';
    }
    dlg.querySelector('.an-close').onclick = close;
    dlg.addEventListener('cancel', function (event) { event.preventDefault(); close(); });
    dlg.querySelector('input[type=file]').onchange = function (event) {
      var file = event.target.files && event.target.files[0];
      if (!file) return;
      if (!/^image\/(png|jpeg|webp)$/.test(file.type) || file.size > 8 * 1024 * 1024) {
        status.textContent = 'Bitte ein PNG-, JPEG- oder WebP-Bild bis 8 MB wählen.'; return;
      }
      setPreview(file, true); status.textContent = 'Bild ausgewählt. Mit „Übernehmen“ wird es dem Angebot und bei vorhandenem Strichcode auch StrichcodeBilder hinzugefügt.';
    };
    dlg.querySelector('[data-image-paste]').onclick = function () {
      pasteEnabled = true; status.textContent = 'Jetzt das Bild mit Strg+V einfügen.';
      dlg.querySelector('[data-image-paste]').focus();
    };
    dlg.querySelector('[data-image-remove]').onclick = function () {
      setPreview(null); clearImage = true; status.textContent = 'Das Artikelbild wird beim Übernehmen entfernt.';
    };
    if (drinks) {
      var depositMode = dlg.querySelector('[data-item-field="deposit_mode"]');
      var depositInput = dlg.querySelector('[data-item-field="deposit_cents"]');
      depositMode.addEventListener('change', function () {
        var free = depositMode.value === 'no';
        depositInput.disabled = free;
        if (free) depositInput.value = '0.00';
        else if (depositInput.value === '0.00') depositInput.value = '';
      });
    }
    dlg.querySelector('[data-image-search]').onclick = function () {
      run(async function () {
        var key = dlg.querySelector('[data-item-field="barcode"]').value.trim()
          || dlg.querySelector('[data-item-field="article_number"]').value.trim()
          || dlg.querySelector('[data-item-field="name"]').value.trim();
        if (!key) { status.textContent = 'Bitte zuerst Artikelnummer, EAN oder Artikelnamen eingeben.'; return; }
        status.textContent = 'Die vorhandene Bildquelle wird durchsucht …';
        var query = { article_number: dlg.querySelector('[data-item-field="article_number"]').value.trim(),
          barcode: dlg.querySelector('[data-item-field="barcode"]').value.trim() || key };
        var result = await lookupMasterImages([query]);
        var blob = imageForMaster(result, query);
        if (!blob) { status.textContent = 'Kein Bild für diese Nummer oder EAN gefunden. Du kannst eine Datei wählen oder ein Bild einfügen.'; return; }
        setPreview(blob); status.textContent = 'Bild gefunden. Mit „Übernehmen“ wird es nur diesem Angebot zugeordnet.';
      });
    };
    dlg.querySelector('[data-item-save]').onclick = function () {
      run(async function () {
        var value = function (key) { return dlg.querySelector('[data-item-field="' + key + '"]'); };
        var name = value('name').value.trim();
        if (!name) { status.textContent = 'Bitte einen Artikelnamen eingeben.'; value('name').focus(); return; }
        var volume = drinks ? readVolume(value('volume')) : null;
        if (drinks && !value('volume').checkValidity()) { status.textContent = value('volume').validationMessage; return; }
        var imageId = item.image_id;
        if (imageBlob) {
          status.textContent = 'Das Bild wird sicher dem Angebotsentwurf zugeordnet …';
          if (ownImage && value('barcode').value.trim()) {
            try { await saveMasterImage(imageBlob, value('barcode').value.trim()); }
            catch (error) {
              console.error('[Angebote] Stammbild speichern', error);
              status.textContent = 'Das Produktbild konnte nicht in StrichcodeBilder gespeichert werden. Bitte erneut versuchen. Das Bild wurde nicht übernommen.';
              return;
            }
          }
          imageId = await upload(imageBlob);
        } else if (clearImage) imageId = '';
        edit(function () {
          item.name = name;
          item.price_cents = M.cents(value('price_cents').value);
          item.old_price_cents = M.cents(value('old_price_cents').value);
          item.article_number = value('article_number').value.trim();
          item.barcode = value('barcode').value.trim();
          item.description = value('description').value.trim();
          if (drinks) {
            item.units = value('units').value === '' ? null : Number(value('units').value);
            item.volume_ml = volume;
            item.packaging = value('packaging').value;
            item.deposit_free = value('deposit_mode').value === 'no';
            item.deposit_cents = item.deposit_free ? 0 : M.cents(value('deposit_cents').value);
          }
          item.image_id = imageId;
        });
        if (imageBlob || clearImage) pendingImageUrls.delete(itemId);
        renderItems(); renderInspector(); close();
      });
    };
    document.addEventListener('paste', onPaste);
    dlg.addEventListener('change', function (event) {
      if (event.target.dataset.itemField === 'volume') readVolume(event.target);
    });
    document.body.appendChild(dlg); dlg.showModal();
    var existingImage = preview.querySelector('[data-image-id]');
    if (existingImage) loadThumbnail(existingImage);
  }
  async function save() {
    $('an-state').textContent = 'Wird gespeichert …';
    if (cmsAction) {
      var saved = cmsSession ? await cmsSession.save(data) : await window.AngeboteDataverse.save(cmsAction, data);
      if (!saved) { await closeCmsPreview(); return; }
      cmsAction = saved;
      if (cmsSession) data = M.clone(cmsAction.data);
      dirty = false; renderEditor(); return;
    }
    var response = record ? await M.request('/api/angebote-verwaltung/' + record.id, M.json('PUT', { version: record.version, data: data }))
      : await M.request('/api/angebote-verwaltung', M.json('POST', { data: data }));
    record = response.action; data = M.clone(record.draft); config = response.config; dirty = false;
    renderEditor(); $('an-state').textContent = 'Entwurf gespeichert · Veröffentlichung bleibt getrennt';
  }
  async function qualityGate(explicit, snapshot, target, ids) {
    var result = await M.quality(snapshot || data), status = $('an-quality-note');
    if (target) {
      ['errors', 'hints', 'unchecked'].forEach(function (key) {
        result[key] = result[key].filter(function (issue) {
          return (!issue.target || issue.target === target) && (target === 'sheet' || !issue.item_id || ids.indexOf(issue.item_id) >= 0);
        });
      });
    }
    if (status) status.textContent = 'Qualitätsprüfung: ' + result.errors.length + ' Fehler · ' + result.hints.length + ' Hinweise · ' + result.unchecked.length + ' nicht geprüft';
    if (!explicit && !result.errors.length) return true;
    var choice = await M.qualityDialog(result, { goto: true, confirm: explicit });
    if (choice && choice.goto) setTimeout(function () { goToIssue(choice.goto); }, 0);
    if (choice === 'confirmed' && status) status.textContent += ' · Hinweise bestätigt';
    return !result.errors.length && !explicit;
  }
  function goToIssue(issue) {
    if (cmsAction && outputMode()) cmsTab = 'element';
    var item = data.items.find(function (it) { return it.id === issue.item_id; });
    if (issue.field === 'meta') { if (!cmsAction) { setStep('articles'); $('an-action-meta').open = true; $('an-title').focus(); } return; }
    if (item && ['no-image', 'low-resolution'].includes(issue.code) || issue.code === 'data' && item && ['name', 'old_price', 'units', 'deposit'].includes(issue.field)) {
      if (!cmsAction) setStep('articles');
      openItemDialog(item.id); return;
    }
    if (!cmsAction) setStep('design');
    var tab = root.querySelector('[data-layout-target="' + (issue.target || 'sheet') + '"]');
    if (tab) tab.click();
    if (item) designItemId = item.id;
    page = Math.max(0, Math.min(issue.page || 0, data.layout.pages.length - 1));
    selected = !weeklyTarget() && elements().some(function (e) { return e.id === issue.element_id; }) ? issue.element_id : '';
    if ($('an-design-item')) $('an-design-item').value = designItemId;
    renderInspector(); preview().catch(M.error);
    var stage = $('an-stage'); if (stage && !stage.hidden) stage.scrollIntoView({ block: 'nearest' });
  }
  async function transfer() {
    var target = designTarget, current = !weeklyTarget() && selection();
    var sourceId = current && current.item_id || designItemId, source = data.items.find(function (it) { return it.id === sourceId; });
    if (!source) throw M.problem('Bitte zuerst einen Artikel als Quelle wählen.');
    var others = data.items.filter(function (it) { return it.id !== sourceId; }), options = M.transferOptions(data, target);
    if (!others.length) throw M.problem('Zum Übertragen werden mindestens zwei Artikel benötigt.');
    var names = { card: 'Homepage-/Kioskkachel', single: 'Einzelflyer', sheet: 'Sammelflyer', scale: 'Waagenmotiv' };
    var dlg = document.createElement('dialog'); dlg.className = 'an-dialog an-transfer'; dlg.setAttribute('aria-label', 'Gestaltung übertragen');
    dlg.innerHTML = '<form method="dialog"><h2>Gestaltung übertragen</h2><p>Quelle: Artikel „' + M.esc(source.name) + '“ · Ziel: ' + names[target]
      + '. Artikeldaten, Preise und Bildzuordnungen sowie andere Ausgabeziele bleiben unverändert.</p>'
      + '<fieldset><legend>Zielkacheln</legend>' + others.map(function (it) {
        return '<label class="an-check"><input type="checkbox" data-transfer-item="' + it.id + '"> ' + M.esc(it.name || 'Neuer Artikel') + '</label>'; }).join('') + '</fieldset>'
      + '<fieldset><legend>Eigenschaften</legend>' + options.map(function (option) {
        return '<label class="an-check"><input type="checkbox" data-transfer-prop="' + option.id + '"> ' + option.label + '</label>'; }).join('') + '</fieldset>'
      + '<p role="status" data-transfer-summary>Bitte Zielkacheln und Eigenschaften auswählen.</p><ul class="an-quality-list" data-transfer-changes></ul>'
      + '<div class="an-actions"><button type="button" data-transfer-cancel>Abbrechen</button><button type="submit" class="an-primary" data-transfer-apply disabled>Übertragen</button></div></form>';
    var previous = document.activeElement;
    function chosen(name) { return Array.from(dlg.querySelectorAll('[data-transfer-' + name + ']:checked'), function (box) { return box.dataset['transfer' + name[0].toUpperCase() + name.slice(1)]; }); }
    function swatch(value) { return typeof value === 'string' && /^#[0-9a-f]{6}$/i.test(value) ? value.toLowerCase() : String(value); }
    function update() {
      var items = chosen('item'), props = chosen('prop'), list = dlg.querySelector('[data-transfer-changes]'), total = 0;
      list.replaceChildren();
      M.transferPlan(data, target, sourceId, items, props).forEach(function (plan) {
        plan.changes.forEach(function (change) {
          total++; var row = document.createElement('li');
          row.textContent = plan.item_name + ' · ' + change.label + ': ' + swatch(change.from) + ' → ' + swatch(change.to); list.appendChild(row);
        });
      });
      dlg.querySelector('[data-transfer-summary]').textContent = !items.length || !props.length ? 'Bitte Zielkacheln und Eigenschaften auswählen.'
        : total ? items.length + ' Kachel(n) · ' + props.length + ' Eigenschaft(en) · ' + total + ' Änderung(en)' : 'Die gewählten Kacheln haben bereits diese Werte. Es wird nichts geändert.';
      dlg.querySelector('[data-transfer-apply]').disabled = !total;
    }
    function close() { dlg.close(); dlg.remove(); if (previous && previous.isConnected) previous.focus(); }
    dlg.addEventListener('change', update);
    dlg.querySelector('[data-transfer-cancel]').onclick = close;
    dlg.addEventListener('cancel', function (event) { event.preventDefault(); close(); });
    dlg.querySelector('form').onsubmit = function (event) {
      event.preventDefault();
      var items = chosen('item'), props = chosen('prop');
      close(); edit(function () { M.transferApply(data, target, sourceId, items, props); }, true); renderInspector();
    };
    document.body.appendChild(dlg); dlg.showModal();
  }
  async function publish() {
    if (!(await qualityGate())) return;
    await M.preflight(data);
    if (!(await M.dialog('Für Kunden veröffentlichen?', data.items.length + ' Angebote · ' + M.date(data.valid_from) + ' bis ' + M.date(data.valid_to)
        + '. Die bisherige Kundenfassung wird ersetzt. Druck und Waage werden nicht ausgelöst.', 'Jetzt freigeben'))) return;
    if (dirty || !record) await save();
    var response = await M.request('/api/angebote-verwaltung/' + record.id + '?action=publish', M.json('POST', { version: record.version }));
    record = response.action; data = M.clone(record.draft); dirty = false; renderEditor();
    $('an-output-status').textContent = 'Freigegeben für den gewählten Gültigkeitszeitraum. Es wurde nichts an die Waage gesendet.';
  }
  async function printCanvases(canvases, labels) {
    var container = $('an-print');
    if (!container) { container = document.createElement('div'); container.id = 'an-print'; document.body.appendChild(container); }
    container.replaceChildren();
    canvases.forEach(function (canvas, index) {
      var div = document.createElement('div'); div.className = 'an-print-page';
      var image = document.createElement('img'); image.src = canvas.toDataURL('image/png'); image.alt = labels[index]; div.appendChild(image); container.appendChild(div);
    });
    await Promise.all(Array.from(container.querySelectorAll('img'), function (img) { return img.decode(); }));
    document.body.classList.add('an-printing'); window.print();
  }
  async function print() {
    if (!(await qualityGate())) return;
    await printCanvases(await M.preflight(data), data.layout.pages.map(function () { return data.title; }));
  }
  async function printSingles() {
    if (!(await qualityGate())) return;
    M.validate(data);
    var layouts = data.layout.targets && data.layout.targets.single;
    if (!Array.isArray(layouts) || layouts.length !== data.items.length) {
      throw M.problem('Bitte erst für jeden Artikel einen Einzelflyer gestalten.');
    }
    var canvases = [];
    for (var item of data.items) {
      var result = await M.renderTarget(data, 'single', item.id, 2);
      if (result.errors.length) throw M.problem(result.errors[0]);
      canvases.push(result.canvas);
    }
    await printCanvases(canvases, data.items.map(function (item) { return data.title + ' · ' + item.name; }));
  }
  window.addEventListener('afterprint', function () {
    document.body.classList.remove('an-printing');
    var container = $('an-print'); if (container) container.replaceChildren();
  });
  async function applyWeeklyDesign(source, presetName) {
    var updated = M.clone(data); await M.adoptWeekly(updated, source, presetName);
    checkpoint();
    if (!data.layout.cms) {
      data = updated;
      var firstOrigin = M.designProvenanceState(updated.layout, 'sheet');
      M.setDesignProvenance(data.layout, 'sheet', firstOrigin.known ? firstOrigin.name : 'Gespeicherter Bereichsstandard');
      M.rememberDesign(data); page = 0; selected = ''; designTarget = 'sheet'; changed(); renderEditor(); return;
    }
    if (designTarget === 'sheet') {
      M.cmsFor(data, 'sheet', true);
      var keptTargets = data.layout.cms.targets;
      data.layout.cms = M.clone(updated.layout.cms); data.layout.cms.targets = keptTargets;
      data.layout.template = updated.layout.template; data.layout.pages = updated.layout.pages;
    } else {
      M.cmsFor(data, designTarget, true);
      data.layout.cms.targets[designTarget] = M.clone(updated.layout.cms);
    }
    var inherited = M.designProvenanceState(updated.layout, 'sheet');
    M.setDesignProvenance(data.layout, designTarget, inherited.known ? inherited.name : 'Gespeicherter Bereichsstandard');
    M.rememberDesign(data, designTarget); page = 0; selected = ''; changed(); renderEditor();
  }
  // Eigene Vorlagen (Design-Einstellungen → Eigene Vorlagen) für Plakat bzw. Einzelflyer in der Aktion wählbar machen.
  var presetCache = null;
  async function refreshPresetPicker() {
    var picker = root.querySelector('[data-action-preset]'); if (!picker) return;
    var usable = !!data && !!data.layout.cms && designTarget !== 'scale';
    var presetKind = designTarget === 'single' ? 'flyer' : 'plakat', key = usable + ':' + presetKind;
    if (picker.dataset.key === key && presetCache) return;
    picker.hidden = !usable; if (!usable) { picker.dataset.key = key; return; }
    if (!presetCache) { try { var result = await M.request('/api/cms-config'); presetCache = result.data && result.data.design_presets || {}; } catch (error) { presetCache = {}; } }
    var list = presetCache[presetKind] || [];
    picker.dataset.key = key;
    picker.innerHTML = '<option value="">Eigene Vorlage laden …</option>' + list.map(function (entry, index) {
      return '<option value="' + index + '">' + M.esc(entry.name) + '</option>';
    }).join('');
    picker.hidden = !list.length;
  }
  async function loadOwnPreset(picker) {
    var list = presetCache && presetCache[designTarget === 'single' ? 'flyer' : 'plakat'] || [], entry = list[Number(picker.value)];
    picker.value = ''; if (!entry) return;
    if (!(await M.dialog('Eigene Vorlage laden?', '„' + entry.name + '“ ersetzt die Gestaltung des gewählten Ausgabeziels. Andere Ausgaben, Artikel und Preise bleiben erhalten. Zum Behalten bitte die Aktion speichern.', 'Vorlage laden'))) return;
    run(function () { return applyWeeklyDesign(entry.data, entry.name); });
  }
  async function scale() {
    if (!(await qualityGate())) return;
    await M.preflight(data);
    if (dirty || !record) await save();
    var mode = 'single';
    await (async function () {
        var draft = M.clone(data), actionHash = await M.hash(record.id, 12), revision = await M.hash(M.uid(), 12);
        var prefix = '21_' + config.scale_scope + '_' + actionHash + '_';
        window.KWerbebilder.uebertragen({
          titel: 'Angebot „' + draft.title + '“ · ' + (mode === 'single' ? 'Einzelartikel' : 'gesamter Flyer'),
          art: 'dauer', praefix: prefix, nurAktion: true, nurVorschau: !config.scale_enabled, verwaltetesAngebot: true,
          hinweisDauer: 'Gültig ' + M.date(draft.valid_from) + ' – ' + M.date(draft.valid_to) + '. Abgelaufene Bilder werden beim nächsten Online-Abgleich deaktiviert.',
          erzeuge: async function (art, progress, cancelled, dimensions) {
            var canvases = await M.scaleImages(draft, mode, dimensions), result = [];
            var scaleTargets = draft.layout.targets && draft.layout.targets.scale && draft.layout.targets.scale.length ? draft.layout.targets.scale : null;
            var titles = mode === 'single' ? (scaleTargets ? scaleTargets.map(function (entry) { return entry.item_id; }) : draft.items.map(function (entry) { return entry.id; })) : [];
            for (var n = 0; n < canvases.length; n++) {
              if (cancelled()) return [];
              progress(n + 1, canvases.length);
              var blob = await new Promise(function (resolve) { canvases[n].toBlob(resolve, 'image/jpeg', .94); });
              if (!blob) throw M.problem('Das Waagenbild konnte nicht erstellt werden.');
              var article = draft.items.find(function (entry) { return entry.id === titles[n]; });
              result.push({ name: prefix + revision + '_' + draft.valid_from.replace(/-/g, '') + '_' + draft.valid_to.replace(/-/g, '') + '_' + String(n + 1).padStart(2, '0') + '.jpg', blob: blob, an: true,
                titel: article ? article.name : mode === 'full' ? 'Flyer-Seite ' + (n + 1) : 'Bild ' + (n + 1) });
            }
            return result;
          }
        });
    })();
  }
  function move(dx, dy) {
    var e = selection(); if (!e) return;
    var size = activeSize();
    edit(function () { e.x = Math.max(0, Math.min(size.w - e.w, e.x + dx)); e.y = Math.max(0, Math.min(size.h - e.h, e.y + dy)); }, true);
    renderInspector();
  }
  function bind() {
    root.onkeydown = function (event) {
      if (outputMode()) return;
      if (event.ctrlKey || event.metaKey) liveControl = null;
      var undoButton = root.querySelector('[data-history=undo]'), redoButton = root.querySelector('[data-history=redo]');
      if (undoButton && redoButton) D.historyShortcut(event, function () { undoButton.click(); }, function () { redoButton.click(); });
    };
    $('an-overview').onclick = function () { run(overview); };
    $('an-reload-saved').onclick = function () { if (record || cmsAction) run(async function () {
      if (!(await discard())) return;
      if (cmsAction) {
        var fresh = (await window.AngeboteDataverse.load()).find(function (entry) { return entry.id === cmsAction.id; });
        if (!fresh) throw M.problem('Diese Aktion ist nicht mehr vorhanden. Bitte die Übersicht erneut öffnen.');
        cmsAction = fresh; data = M.clone(fresh.data); dirty = false; selected = '';
        designItemId = data.items[0]?.id || ''; undo = []; redo = []; renderEditor();
      } else await open(record.id);
    }); };
    $('an-save').onclick = function () { run(save); };
    $('an-add-manual').onclick = function () { var item = M.item(); addItem(item); openItemDialog(item.id); };
    if ($('an-add-catalog')) $('an-add-catalog').onclick = function () { run(picker); };
    $('an-page-prev').onclick = function () { page--; selected = ''; renderInspector(); preview().catch(M.error); };
    $('an-page-next').onclick = function () { page++; selected = ''; renderInspector(); preview().catch(M.error); };
    $('an-publish').onclick = function () { run(publish); }; $('an-print-single').onclick = function () { run(printSingles); };
    $('an-print-action').onclick = function () { run(print); };     $('an-scale').onclick = function () { run(scale); };
    $('an-quality').onclick = function () { run(function () { return qualityGate(true); }); };
    $('an-transfer').onclick = function () { run(transfer); };
    root.onclick = async function (event) {
      var b = event.target.closest('button');
      if (!b || b.disabled || busy) return;
      if (b.hasAttribute('data-article-prev') || b.hasAttribute('data-article-next')) {
        var index = data.items.findIndex(function (item) { return item.id === designItemId; });
        var next = data.items[index + (b.hasAttribute('data-article-prev') ? -1 : 1)];
        if (next) selectArticle(next.id);
        return;
      }
      if (b.dataset.editorMode) {
        previewMode = b.dataset.editorMode; D.selectPreview(root, previewMode, 'data-editor-mode');
        preview().catch(M.error); return;
      }
      if (b.dataset.layoutTarget) {
        designTarget = b.dataset.layoutTarget;
        if (!data.items.some(function (item) { return item.id === designItemId; })) designItemId = data.items[0] ? data.items[0].id : '';
        if (root.querySelector('.an-object-dialog[open]')) {
          root.querySelectorAll('[data-cms-config]').forEach(function (control) {
            var value = cfg[control.dataset.cmsConfig];
            if (value != null) control.value = value;
          });
        } else {
          $('an-style-controls').innerHTML = D.controls(controlLayout()); D.expandGroups($('an-style-controls'));
        }
        selected = ''; previewMode = 'paper'; renderInspector(); preview().catch(M.error); return;
      }
      if (b.dataset.editItem) { openItemDialog(b.dataset.editItem); return; }
      if (b.dataset.cmsPalette) {
        run(async function () {
          var kind = b.dataset.cmsKind, cfg = M.cmsFor(data, designTarget).config;
          var palette = M.palettes.find(function (entry) { return entry.id === b.dataset.cmsPalette; });
          if (!palette) throw M.problem('Diese Farbpalette ist nicht mehr verfügbar. Bitte die Gestaltung erneut öffnen.');
          if (D.cmsPaletteState(cfg, kind).custom
            && !(await M.dialog('Eigene Farben ersetzen?', 'Die Farbpalette ersetzt die eigenen Farben nur im aktuellen Ausgabeziel. Positionen, Schrift und andere Ausgaben bleiben erhalten.', 'Palette übernehmen'))) return;
          var values = D.cmsPaletteValues(palette.colors, cfg, kind);
          edit(function () { D.applyCmsPaletteValues(M.cmsFor(data, designTarget, true).config, kind, values); });
          renderEditor();
        });
        return;
      }
      if (b.dataset.offerPalette) {
        run(async function () {
          var target = designTarget, palette = M.clone(M.styleOf(data.layout, target));
          if (!(await D.applyPalette(palette, b.dataset.offerPalette))) return;
          edit(function () { M.applyPaletteColors(data, target, M.effectiveColors(palette)); });
          renderEditor();
        });
        return;
      }
      if (b.dataset.step) setStep(b.dataset.step);
      if (outputMode()) return;
      if (b.dataset.select) { selected = b.dataset.select; syncSelectedArticle(); renderInspector(); overlay(); }
      if (b.dataset.remove) {
        var removedIndex = data.items.findIndex(function (item) { return item.id === b.dataset.remove; });
        edit(function () { data.items = data.items.filter(function (it) { return it.id !== b.dataset.remove; });
          data.layout.pages.forEach(function (p) { p.elements = p.elements.filter(function (e) { return e.item_id !== b.dataset.remove; }); });
          M.ensureTargets(data);
          if (data.layout.mode === 'template') M.applyTemplate(data); page = Math.min(page, data.layout.pages.length - 1);
        });
        if (designItemId === b.dataset.remove) designItemId = data.items.length ? data.items[Math.min(removedIndex, data.items.length - 1)].id : '';
        pendingImages.delete(b.dataset.remove); pendingImageUrls.delete(b.dataset.remove);
        renderItems(); renderInspector();
      }
      if (b.dataset.up || b.dataset.highlight) {
        edit(function () {
          var i = data.items.findIndex(function (it) { return it.id === (b.dataset.up || b.dataset.highlight); });
          if (b.dataset.up && i > 0) { var old = data.items[i - 1]; data.items[i - 1] = data.items[i]; data.items[i] = old; }
          if (b.dataset.highlight) {
            data.items[i].highlight = !data.items[i].highlight;
            Object.keys(data.layout.targets || {}).forEach(function (target) {
              var entry = data.layout.targets[target].find(function (candidate) { return candidate.item_id === data.items[i].id; });
              var frame = entry && entry.elements.find(function (element) { return element.type === 'shape'; });
              if (frame) frame.fill = data.items[i].highlight ? '#f2ead8' : data.layout.card_background;
            });
          }
          if (data.layout.mode === 'template') M.applyTemplate(data);
          M.ensureTargets(data);
        }); renderItems();
      }
      if (b.dataset.addElement || b.hasAttribute('data-replace-image')) {
        var type = b.dataset.addElement, imageId = '';
        if (type === 'image' || b.hasAttribute('data-replace-image')) {
          var replace = b.hasAttribute('data-replace-image') ? selection() : null;
          var input = document.createElement('input'); input.type = 'file'; input.accept = 'image/jpeg,image/png,image/webp';
          input.onchange = function () { run(async function () {
            var id = await upload(input.files[0]);
            if (!id) return;
            if (replace) { edit(function () { replace.image_id = id; }, true); renderInspector(); }
            else insertElement(type, id);
          }); }; input.click(); return;
        }
        insertElement(type, imageId);
      }
      if (b.dataset.nudge) { var nudge = b.dataset.nudge.split(',').map(Number); move(nudge[0], nudge[1]); }
      if (b.dataset.transform && selection()) {
        edit(function () {
          var e = selection(), action = b.dataset.transform;
          if (action === 'straight') e.rotation = 0;
          else if (action === 'left' || action === 'right') e.rotation = ((e.rotation + (action === 'right' ? 15 : -15) + 540) % 360) - 180;
          else {
            var size = activeSize(), factor = action === 'larger' ? 1.1 : 1 / 1.1;
            factor = Math.max(8 / e.w, 8 / e.h, Math.min(factor, size.w / e.w, size.h / e.h));
            var w = e.w * factor, h = e.h * factor;
            e.x = Math.max(0, Math.min(size.w - w, e.x + (e.w - w) / 2));
            e.y = Math.max(0, Math.min(size.h - h, e.y + (e.h - h) / 2));
            e.w = w; e.h = h;
          }
          constrainElement(e);
        }, true); renderInspector();
      }
      if (b.dataset.elementAction && selection()) {
        edit(function () {
          var e = selection(), i = elements().indexOf(e), action = b.dataset.elementAction;
          if (action === 'delete') { elements().splice(i, 1); selected = ''; }
          if (action === 'copy' || action === 'ghost') { var size = activeSize(), copy = M.clone(e); copy.id = M.uid(); copy.x = Math.min(size.w - copy.w, e.x + 12); copy.y = Math.min(size.h - copy.h, e.y + 12); if (action === 'ghost') copy.opacity = .35; elements().push(copy); selected = copy.id; }
          if (action === 'forward' && i < elements().length - 1) { elements().splice(i, 1); elements().splice(i + 1, 0, e); }
          if (action === 'back' && i > 0) { elements().splice(i, 1); elements().splice(i - 1, 0, e); }
        }, true); renderInspector();
      }
      if (b.dataset.history) {
        var source = b.dataset.history === 'undo' ? undo : redo, dest = b.dataset.history === 'undo' ? redo : undo;
        if (source.length) { dest.push(M.clone(data)); data = source.pop(); page = Math.min(page, data.layout.pages.length - 1); changed(); renderEditor(); }
      }
      if (b.id === 'an-template' || b.id === 'an-defaults') {
        if (b.id === 'an-defaults' && data.kind === 'weekly' && (!data.layout.cms || designTarget !== 'scale')) {
          if (!(await M.dialog('CMS-Wochenvorlage übernehmen?', 'Die aktuelle CMS-Vorlage ersetzt nur die Gestaltung des gewählten Ausgabeziels. Andere Ausgaben, Artikel und Preise bleiben erhalten. Alte freie Wochenlayouts werden dabei insgesamt auf die CMS-Vorlage umgestellt.', 'CMS-Vorlage übernehmen'))) return;
          run(function () { return applyWeeklyDesign(); });
          return;
        }
        var standards = b.id === 'an-defaults' && designTarget !== 'sheet';
        if (!(await M.dialog('Gestaltung ersetzen?', standards
          ? 'Alle Artikel im aktuellen Ausgabeziel erhalten die gespeicherten Designstandards. Freie Positionen und eigene Gestaltungselemente dieses Ziels werden ersetzt. Andere Ausgaben, Artikel und Preise bleiben erhalten.'
          : 'Die freien Positionen und eigenen Gestaltungselemente im aktuellen Ausgabeziel werden durch die gewählte Vorlage ersetzt. Bei Einzelansichten betrifft das nur den ausgewählten Artikel. Andere Ausgaben, Artikel und Preise bleiben erhalten.', 'Vorlage anwenden'))) return;
        run(async function () {
          var layout = data.layout;
          if (b.id === 'an-defaults') { var result = await M.request('/api/angebote-verwaltung?view=design'); layout = result.design[data.kind]; }
          edit(function () {
            M.preserveBackgrounds(data);
            if (b.id === 'an-defaults') {
              var targets = data.layout.targets, pages = data.layout.pages, mode = data.layout.mode, kept = {}, oldLayout = data.layout;
              Object.keys(data.layout.adjustments || {}).forEach(function (key) {
                if (key.split(':')[0] !== designTarget) kept[key] = data.layout.adjustments[key];
              });
              if (designTarget === 'sheet') {
                data.layout = M.clone(layout); data.layout.targets = targets; data.layout.pages = pages; data.layout.mode = mode;
                data.layout.design_origin = oldLayout.design_origin;
                if (oldLayout.design_provenance) data.layout.design_provenance = M.clone(oldLayout.design_provenance);
                else delete data.layout.design_provenance;
                data.layout.target_styles = {};
                ['card', 'single', 'scale'].forEach(function (target) {
                  var style = M.styleOf(oldLayout, target); delete style.density; data.layout.target_styles[target] = style;
                });
              } else {
                M.setTargetStyle(data.layout, designTarget, function (style) { Object.assign(style, M.styleOf(layout, designTarget)); delete style.density; });
              }
              Object.keys(layout.adjustments || {}).forEach(function (key) {
                if (key.split(':')[0] === designTarget) kept[key] = M.clone(layout.adjustments[key]);
              });
              data.layout.adjustments = kept;
            }
            if (designTarget === 'sheet') { M.applyTemplate(data); page = 0; }
            else if (standards) M.applyTargetStyleToAll(data, designTarget);
            else M.applyTargetTemplate(data, designTarget, designItemId);
            if (b.id === 'an-defaults') {
              var inherited = M.designProvenanceState(layout, designTarget);
              M.setDesignProvenance(data.layout, designTarget, inherited.known ? inherited.name : 'Gespeicherter Bereichsstandard');
              M.rememberDesign(data, designTarget);
            }
            selected = '';
          });
          renderEditor();
        });
      }
      if (b.id === 'an-add-page') {
        edit(function () { var empty = M.clone(data); empty.items = []; M.applyTemplate(empty); data.layout.pages.push(empty.layout.pages[0]); page = data.layout.pages.length - 1; }, true);
        selected = ''; renderInspector(); preview().catch(M.error);
      }
      if (b.id === 'an-remove-page') {
        if (data.layout.pages.length <= 1) { await M.dialog('Eine Seite bleibt', 'Ein Flyer benötigt mindestens eine Seite.'); return; }
        if (!(await M.dialog('Seite entfernen?', 'Alle Gestaltungselemente dieser Seite werden entfernt. Artikel bleiben in der Erfassung und müssen vor der Ausgabe auf einer Seite platziert sein.', 'Seite entfernen'))) return;
        edit(function () { data.layout.pages.splice(page, 1); page = Math.min(page, data.layout.pages.length - 1); selected = ''; }, true); renderInspector();
      }
      if (b.id === 'an-undo' || b.id === 'an-undo-toolbar') {
        if (undo.length) { redo.push(M.clone(data)); data = undo.pop(); page = Math.min(page, data.layout.pages.length - 1); M.ensureTargets(data); changed(); renderEditor(); }
      }
    };
    root.onchange = function (event) {
      if (outputMode()) {
        if (event.target.id === 'an-design-item') selectArticle(event.target.value);
        return;
      }
      var target = event.target;
      if (target.matches('[data-action-preset]')) { loadOwnPreset(target); return; }
      if (event.type === 'change' && target === liveControl) {
        liveControl = null;
        if (!target.validity.valid || target.type === 'number' && target.value === '') {
          target.value = liveValue;
          M.error(M.problem('Bitte einen gültigen Zahlenwert eingeben. Der letzte gültige Wert bleibt erhalten.'));
        }
        return;
      }
      if (target.hasAttribute('data-cms-family') || target.hasAttribute('data-cms-variant')) {
        var kind = target.dataset.cmsKind;
        var family = M.styleFamilies.find(function (entry) { return entry[0] === target.value; });
        var template = target.hasAttribute('data-cms-family') ? family && family[2] : target.value;
        if (!template) { M.error(M.problem('Dieser Stil ist nicht mehr verfügbar. Bitte die Gestaltung erneut öffnen.')); return; }
        edit(function () {
          M.cmsFor(data, designTarget, true).config[kind + 'Template'] = template;
          if (kind === 'plakat' && designTarget === 'sheet') data.layout.template = template;
        });
        renderEditor(); return;
      }
      if (target.dataset.cmsConfig) {
        if (!target.reportValidity()) return;
        edit(function () {
          var currentConfig = M.cmsFor(data, designTarget, true).config;
          currentConfig[target.dataset.cmsConfig] = target.type === 'number' ? Number(target.value) : target.value;
          if (target.dataset.cmsConfig.endsWith('_tagPreset')) {
            var prefix = target.dataset.cmsConfig.split('_')[0], preset = window.WochenangeboteRenderer.TAG_PRESETS[target.value], cfg = currentConfig;
            if (preset) {
              cfg[prefix + '_tagShape'] = preset.tagShape; cfg[prefix + '_tagRadius'] = preset.tagRadius;
              cfg[prefix + '_priceStripColor'] = preset.tagShape === 'price-image' ? '#fff000' : preset.tagColor;
              cfg[prefix + '_priceImageColor'] = preset.tagShape === 'price-image' ? preset.tagColor : '#ffffff';
              $('an-style-controls').innerHTML = D.controls(controlLayout()); D.expandGroups($('an-style-controls'));
            }
          }
          if (target.dataset.cmsConfig === 'plakatTemplate') data.layout.template = target.value;
        });
      }
      if (target.id === 'an-cms-item') { selectArticle(target.value); return; }
      if (target.dataset.cmsOverride) {
        if (!target.reportValidity()) return;
        edit(function () {
          var item = data.items.find(function (it) { return it.id === target.dataset.cmsItem; });
          var key = M.weeklyKey(item), overrides = M.cmsFor(data, designTarget, true)[target.dataset.cmsGroup];
          if (!overrides[key]) overrides[key] = {};
          overrides[key][target.dataset.cmsOverride] = Number(target.value);
        });
      }
      if (target.dataset.prop) {
        var it = data.items.find(function (item) { return item.id === target.closest('[data-item-id]').dataset.itemId; });
        edit(function () {
          var prop = target.dataset.prop;
          if (prop.endsWith('_cents')) it[prop] = M.cents(target.value);
          else if (prop === 'units') it.units = target.value === '' ? null : Number(target.value);
          else if (prop === 'volume_ml') it.volume_ml = readVolume(target);
          else if (prop === 'deposit_mode') {
            it.deposit_free = target.value === 'no';
            if (it.deposit_free) it.deposit_cents = 0;
            else if (!target.value || it.deposit_cents === 0) it.deposit_cents = null;
            var pfand = target.closest('[data-item-id]').querySelector('[data-prop=deposit_cents]');
            pfand.disabled = it.deposit_free; pfand.value = it.deposit_cents == null ? '' : M.money(it.deposit_cents);
          }
          else it[prop] = target.value;
        });
        updateItemValues(target.closest('[data-item-id]'), it);
      }
      if (target.dataset.actionProp) {
        edit(function () { data[target.dataset.actionProp] = target.value; });
        $('an-action-summary').textContent = data.title + ' · ' + M.date(data.valid_from) + ' – ' + M.date(data.valid_to);
      }
      if (target.dataset.style === 'price_preset') {
        edit(function () {
          if (designTarget === 'sheet') D.change(data.layout, target);
          else M.setTargetStyle(data.layout, designTarget, function (style) { D.change(style, target); });
        });
      } else if (target.dataset.style && (designTarget === 'sheet' || weeklyTarget())) {
        edit(function () { M.preserveBackgrounds(data); D.change(data.layout, target); if (data.layout.mode === 'template' && designTarget === 'sheet') M.applyTemplate(data); });
      } else if (target.dataset.style) {
        var applyStyle = function () { edit(function () { M.setTargetStyle(data.layout, designTarget, function (style) { D.change(style, target); }); M.applyTargetStyleToAll(data, designTarget); }); };
        if (!M.targetCustomized(data, designTarget)) applyStyle();
        else run(async function () {
          if (await M.dialog('Gestaltung ersetzen?', 'Dieses Ausgabeziel enthält frei verschobene oder eigene Elemente. Sie werden durch den gewählten Stil ersetzt. Andere Ausgaben bleiben unverändert.', 'Stil anwenden')) applyStyle();
          else preview().catch(M.error);
        });
      }
      if (target.id === 'an-design-item') { selectArticle(target.value); return; }
      if (target.id === 'an-select-element') { selected = target.value; syncSelectedArticle(); renderInspector(); overlay(); }
      if (target.dataset.elementProp && selection()) {
        var e = selection();
        edit(function () { e[target.dataset.elementProp] = target.type === 'checkbox' ? target.checked : target.type === 'number' || target.type === 'range' ? Number(target.value) : target.value; }, true);
      }
      if (target.dataset.cmsArticle) {
        var holder = target.closest('[data-cms-article-id]');
        var article = data.items.find(function (it) { return it.id === holder.dataset.cmsArticleId; });
        var field = target.dataset.cmsArticle;
        var value = field === 'name' ? target.value.trim() : M.cents(target.value);
        if (!article || (field === 'name' && !value) || (field === 'price_cents' && value == null) || (field === 'old_price_cents' && target.value.trim() !== '' && value == null)) {
          M.dialog('Bitte prüfen', field === 'name' ? 'Bitte einen Artikelnamen eingeben.' : 'Bitte einen gültigen Preis, z. B. 1,99, eingeben.');
          renderCmsArticle(); return;
        }
        edit(function () { article[field] = value; }, false);
        target.value = field === 'name' ? value : value == null ? '' : M.money(value);
        var option = $('an-design-item') && Array.from($('an-design-item').options).find(function (entry) { return entry.value === article.id; });
        if (option) option.textContent = article.name || 'Neuer Artikel';
        if (data.layout.cms && field === 'name') renderInspector();
      }
    };
    root.oninput = function (event) {
      var target = event.target;
      if (busy || outputMode() || !target.matches('input[type=color],input[type=range],input[type=number]')) return;
      if (!target.matches('[data-cms-config],[data-cms-override],[data-style],[data-element-prop]')) return;
      if (!target.validity.valid || (target.type === 'number' && target.value === '')) return;
      if (liveControl !== target) { checkpoint(); liveControl = target; }
      liveValue = target.value;
      liveApplying = true;
      try { root.onchange(event); } finally { liveApplying = false; }
    };
    $('an-stage').onpointerdown = function (event) {
      if (outputMode()) return;
      var resize = event.target.closest('[data-resize]'), rotate = event.target.closest('[data-rotate]');
      var hit = resize || rotate || event.target.closest('[data-select]');
      if (!hit || busy || event.button !== 0) return;
      event.preventDefault();
      selected = resize ? hit.dataset.resize : rotate ? hit.dataset.rotate : hit.dataset.select;
      syncSelectedArticle(); renderInspector();
      var e = selection(), size = activeSize(), rect = $('an-stage').getBoundingClientRect(), startX = event.clientX, startY = event.clientY, x = e.x, y = e.y, w = e.w, h = e.h, moved = false;
      var surface = window.AngeboteVorschauEditor;
      var centerX = rect.left + (x + w / 2) / size.w * rect.width, centerY = rect.top + (y + h / 2) / size.h * rect.height;
      function drag(ev) {
        if (ev.pointerId !== event.pointerId) return;
        if (!moved && Math.abs(ev.clientX - startX) + Math.abs(ev.clientY - startY) < 5) return;
        if (!moved) { checkpoint(); moved = true; }
        var dx = (ev.clientX - startX) * size.w / rect.width, dy = (ev.clientY - startY) * size.h / rect.height;
        if (rotate) {
          var turn = surface.pointerAngle(centerX, centerY, ev) + 90;
          var snapped = Math.round(turn / 15) * 15;
          e.rotation = Math.round(surface.normalizeTurn(Math.abs(turn - snapped) < 3 ? snapped : turn) * 10) / 10;
        } else if (resize) {
          var angle = e.rotation * Math.PI / 180, along = dx * Math.cos(angle) + dy * Math.sin(angle), across = -dx * Math.sin(angle) + dy * Math.cos(angle);
          if (e.type === 'image' || e.type === 'logo') {
            var factor = 1 + (Math.abs(along / w) > Math.abs(across / h) ? along / w : across / h);
            factor = Math.max(8 / w, 8 / h, Math.min(factor, (size.w - x) / w, (size.h - y) / h));
            e.w = w * factor; e.h = h * factor;
          } else { e.w = Math.max(8, Math.min(size.w - x, w + along)); e.h = Math.max(8, Math.min(size.h - y, h + across)); }
        } else {
          e.x = Math.max(0, Math.min(size.w - e.w, x + dx));
          e.y = Math.max(0, Math.min(size.h - e.h, y + dy));
        }
        constrainElement(e);
        var box = $('an-hit-layer').querySelector('[data-select="' + selected + '"]');
        if (box) {
          box.style.left = e.x / size.w * 100 + '%'; box.style.top = e.y / size.h * 100 + '%';
          box.style.width = e.w / size.w * 100 + '%'; box.style.height = e.h / size.h * 100 + '%';
          box.style.transform = 'rotate(' + e.rotation + 'deg)';
        }
        var points = surface.handlePoints(e, size.w, size.h);
        var handle = $('an-hit-layer').querySelector('[data-resize]');
        if (handle) {
          handle.style.left = 'clamp(var(--an-handle-edge),' + points.resize.x + '%,calc(100% - var(--an-handle-edge)))';
          handle.style.top = 'clamp(var(--an-handle-edge),' + points.resize.y + '%,calc(100% - var(--an-handle-edge)))';
        }
        var turner = $('an-hit-layer').querySelector('[data-rotate]');
        if (turner) {
          turner.style.left = 'clamp(var(--an-handle-edge),' + points.rotate.x + '%,calc(100% - var(--an-handle-edge)))';
          turner.style.top = 'clamp(var(--an-handle-edge),' + points.rotate.y + '%,calc(100% - var(--an-handle-edge)))';
        }
        if (designTarget === 'sheet') data.layout.mode = 'free'; changed();
      }
      function end(ev) {
        if (ev.pointerId !== event.pointerId) return;
        document.removeEventListener('pointermove', drag); document.removeEventListener('pointerup', end); document.removeEventListener('pointercancel', end);
        renderInspector(); preview().catch(M.error);
      }
      document.addEventListener('pointermove', drag); document.addEventListener('pointerup', end); document.addEventListener('pointercancel', end);
    };
    $('an-stage').onkeydown = function (e) {
      if (outputMode()) return;
      var key = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] }[e.key];
      if (key && selection()) { e.preventDefault(); move(key[0] * (e.shiftKey ? 10 : 1), key[1] * (e.shiftKey ? 10 : 1)); }
    };
  }
  function insertElement(type, imageId) {
    var size = activeSize();
    edit(function () { var w = Math.min(type === 'image' ? 200 : 300, size.w - 24), h = Math.min(type === 'image' ? 220 : 80, size.h - 24);
      var e = M.el(type, Math.round((size.w - w) / 2), Math.round((size.h - h) / 2), w, h,
      { text: type === 'text' ? 'Dein eigener Text' : '', image_id: imageId || '', fill: type === 'shape' ? '#e5ecd9' : data.layout.text_color, font: data.layout.font, font_size: 28 });
      elements().push(e); selected = e.id;
    }, true); renderInspector();
  }
  window.addEventListener('beforeunload', function (event) { if (dirty) { event.preventDefault(); event.returnValue = ''; } });
  var resizeTimer = 0;
  window.addEventListener('resize', function () {
    if (!cmsAction || !data) return;
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(function () { if (cmsAction && data) preview().catch(M.error); }, 150);
  });
  var started = false;
  function start() {
    if (started) { if (data) preview().catch(M.error); return; }
    started = true;
    var load = overview;
    if (window.CMSAngebote && !new URLSearchParams(location.search).has('bestand')) {
      cmsHost = window.CMSAngebote.mount(root, {
        preview: cmsPreview,
        legacy: function () { cmsAction = null; dirty = false; root.classList.remove('an-cms-preview', 'an-cms-overview'); overview().catch(M.error); }
      });
      load = cmsHost.start;
    }
    load().catch(function (e) {
      started = false;
      root.innerHTML = header('Angebote') + '<p class="an-status an-error" role="alert">Die Angebotsverwaltung ist gerade nicht verfügbar.</p><button id="an-retry">Erneut versuchen</button>';
      $('an-retry').onclick = start; M.error(e);
    });
  }
  if (root.closest('#panel-angebote')) {
    window.KAngebote = { onShow: start, hasUnsavedChanges: function () { return dirty || !!(cmsHost && cmsHost.hasUnsavedChanges()); } };
    if (root.closest('#panel-angebote').classList.contains('active')) start();
  } else start();
})();
