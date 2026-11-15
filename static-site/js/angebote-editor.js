(function () {
  'use strict';
  var root = document.getElementById('an-root');
  if (!root) return;
  var M = window.AngeboteModel, D = window.AngeboteDesign;
  var record = null, data = null, config = null, design = null, dirty = false, busy = false;
  var step = 'articles', page = 0, selected = '', paint = 0, undo = [], redo = [];
  var designTarget = 'sheet', designItemId = '', pendingImages = new Map(), pendingImageUrls = new Map();
  var previewMode = 'paper';
  var roleNames = { brand: 'Marke', title: 'Überschrift', period: 'Zeitraum', footer: 'Fußzeile',
    name: 'Artikelname', pack: 'Gebinde', description: 'Beschreibung', price: 'Preis',
    old_price: 'Stattpreis', deposit: 'Pfand', base: 'Literpreis', image: 'Bild', text: 'Eigener Text', shape: 'Fläche' };
  var $ = function (id) { return document.getElementById(id); };
  function header(title) {
    return '<header class="an-head"><div><small>DORFLADEN · WOCHEN- UND GETRÄNKEANGEBOTE</small><h1>Angebote gestalten</h1></div>'
      + '</header>' + (config && !config.scale_enabled ? '<p class="an-note">Vorschauumgebung · Neue Angebote sind getrennt gespeichert. Kein echter Waagenversand aus dieser Umgebung.</p>' : '');
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
    try { await fn(); } catch (e) { await M.error(e); } finally { lock(false); }
  }
  function changed() {
    dirty = true;
    var status = $('an-state');
    if (status) status.textContent = 'Entwurf geändert · noch nicht gespeichert oder veröffentlicht';
  }
  function checkpoint() { undo.push(M.clone(data)); if (undo.length > 30) undo.shift(); redo = []; }
  function edit(fn, free) {
    checkpoint(); fn(); if (free && designTarget === 'sheet') data.layout.mode = 'free'; changed(); preview().catch(M.error);
  }
  async function discard() {
    return !dirty || await M.dialog('Ungespeicherte Änderungen', 'Möchtest du die Änderungen verwerfen? Der zuletzt gespeicherte Entwurf bleibt erhalten.', 'Änderungen verwerfen');
  }
  async function overview() {
    if (!(await discard())) return;
    data = null; record = null; dirty = false; paint++;
    root.innerHTML = header('Angebote. Gemeinsam gestalten.') + '<p role="status">Die Angebote werden geladen …</p>';
    var result = await M.request('/api/angebote-verwaltung');
    config = result.config;
    var legacy = [], legacyError = '';
    try { var old = await M.request('/api/angebote'); legacy = Array.isArray(old) ? old : old.data || []; }
    catch (e) { console.error('[Angebote] Altbestand', e); legacyError = 'Die bisherigen Angebote konnten nicht geladen werden. Der bisherige CMS-Editor bleibt erreichbar.'; }
    root.innerHTML = header('Angebote. Gemeinsam gestalten.')
      + '<p>Artikel auswählen, frei gestalten und unabhängig auf Homepage, Papier oder Waage ausgeben.</p>'
      + '<div class="an-overview"><section class="an-card"><h2>Wochenangebote</h2><p>Neue Aktionen mit eigenen Artikeln und vertrauter freier Gestaltung.</p><button class="an-primary" data-new="weekly">+ Wochenaktion anlegen</button></section>'
      + '<section class="an-card"><h2>Getränkeangebote</h2><p>Gebinde, Pfand und Literpreis – einmal erfassen, überall konsistent.</p><button class="an-primary" data-new="drinks">+ Getränkeaktion anlegen</button></section></div>'
      + '<h2>Deine Aktionen</h2><div class="an-list">' + (result.actions.length ? result.actions.map(function (head) {
        var d = head.draft, pub = head.published_summary;
        return '<article class="an-card"><div><span class="an-badge">' + (d.kind === 'drinks' ? 'Getränke' : 'Wochenangebote') + '</span><h3>' + M.esc(d.title || 'Unbenannter Entwurf')
          + '</h3><p class="an-muted">' + M.date(d.valid_from) + ' – ' + M.date(d.valid_to) + ' · ' + d.items.length + ' Artikel</p>'
          + '<p>' + (pub ? 'Veröffentlichte Fassung vorhanden · neue Änderungen bleiben Entwurf' : 'Entwurf · nicht für Kunden sichtbar') + '</p></div>'
          + '<div class="an-actions"><button data-open="' + head.id + '">Bearbeiten</button><button data-duplicate="' + head.id + '">Duplizieren</button></div></article>';
      }).join('') : '<p>Noch keine neuen Aktionen. Beginne mit einer Wochen- oder Getränkeaktion.</p>') + '</div>'
      + '<section class="an-card"><h2>Bestehende Angebote</h2><p>Die bisherigen Aktionen und deren Design bleiben unverändert. Sie werden weiterhin im bisherigen Editor bearbeitet.</p>'
      + (legacyError ? '<p class="an-status an-error" role="alert">' + legacyError + '</p>' : '<p>' + legacy.length + ' bestehende Angebotsartikel gefunden.</p>')
      + '<a class="an-btn" id="an-legacy" href="/cms.html?tab=ang">Bisherige Angebote öffnen</a>'
      + '<a class="an-btn" href="/cms.html?tab=cfg&amp;flyer=drinks">Getränkeflyer-Designstandards</a></section>';
    root.querySelectorAll('[data-new]').forEach(function (b) { b.onclick = function () { run(function () { return create(b.dataset.new); }); }; });
    root.querySelectorAll('[data-open]').forEach(function (b) { b.onclick = function () { run(function () { return open(b.dataset.open); }); }; });
    root.querySelectorAll('[data-duplicate]').forEach(function (b) {
      b.onclick = function () { run(async function () {
        var res = await M.request('/api/angebote-verwaltung/' + b.dataset.duplicate + '?action=duplicate', M.json('POST', {}));
        await open(res.action.id);
      }); };
    });
  }
  async function create(kind) {
    var response = await M.request('/api/angebote-verwaltung?view=design'); design = response.design;
    record = null; data = M.blank(kind, design[kind]); M.applyTemplate(data);
    dirty = true; undo = []; redo = []; step = 'articles'; page = 0; selected = ''; designTarget = 'card'; designItemId = '';
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
        + (source ? '<img class="an-item-thumb" src="' + M.esc(source) + '" alt="">' : '<span class="an-item-thumb an-no-image" aria-hidden="true">Bild</span>')
        + '<div class="an-item-main"><strong>' + M.esc(it.name || 'Neuer Artikel ' + (i + 1)) + '</strong>'
        + '<small>' + M.esc(it.article_number || 'ohne Artikelnummer') + (it.barcode ? ' · EAN ' + M.esc(it.barcode) : '')
        + ' · ' + (it.price_cents == null ? 'Preis offen' : M.money(it.price_cents) + ' €')
        + (data.kind === 'drinks' && it.price_cents != null && it.units && it.volume_ml
          ? ' · <span data-unit-price>' + M.money(M.base(it)) + ' €/l</span>' : '') + '</small></div>'
        + '<button type="button" data-edit-item="' + it.id + '" aria-label="Artikel und Bild bearbeiten: ' + M.esc(it.name || 'Neuer Artikel') + '">✎</button>'
        + '<details class="an-item-menu"><summary aria-label="Weitere Artikelaktionen">⋯</summary><div>'
        + '<button type="button" data-highlight="' + it.id + '" aria-pressed="' + it.highlight + '">' + (it.highlight ? '★ Hervorgehoben' : '☆ Hervorheben') + '</button>'
        + '<button type="button" data-up="' + it.id + '"' + (i === 0 ? ' disabled' : '') + '>↑ Nach oben</button>'
        + '<button type="button" data-remove="' + it.id + '">Entfernen</button></div></details></article>';
    }).join('') || '<p>Noch keine Artikel ausgewählt.</p>';
  }
  function parseMasterPack(value) {
    var match = /(\d+)\s*[x×]\s*(\d+(?:[,.]\d+)?)\s*(ml|cl|l)?/i.exec(String(value || ''));
    if (!match) return {};
    var factor = /^(?:ml)$/i.test(match[3] || '') ? 1 : /^(?:cl)$/i.test(match[3] || '') ? 10 : 1000;
    var packaging = /mehrweg/i.test(value) ? 'Mehrweg' : /dose/i.test(value) ? 'Dose' : /einweg/i.test(value) ? 'Einweg' : '';
    return { units: Number(match[1]), volume_ml: Math.round(Number(match[2].replace(',', '.')) * factor), packaging: packaging };
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
        return { artikelnummer: it.article_number || '', edeka_nr: it.article_number || '', strichcode: it.barcode || '' };
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
  function renderInspector() {
    var host = $('an-inspector'); if (!host) return;
    var current = selection();
    var size = activeSize();
    host.innerHTML = '<h3>Frei gestalten</h3><p class="an-muted">Element in der Vorschau antippen oder hier wählen. Ziehen ist optional; alle Positionen sind auch über Eingaben und Pfeile einstellbar.</p>'
      + '<label class="an-field"><span>Gestaltungselement</span><select id="an-select-element"><option value="">Bitte auswählen</option>'
      + elements().map(function (e, i) { return '<option value="' + e.id + '"' + (e.id === selected ? ' selected' : '') + '>'
        + (i + 1) + ' · ' + roleNames[e.type] + (e.hidden ? ' (ausgeblendet)' : '') + '</option>'; }).join('') + '</select></label>'
      + '<div class="an-element-actions"><button data-add-element="text">+ Text</button><button data-add-element="shape">+ Fläche</button><button data-add-element="image">+ Eigenes Bild</button></div>'
      + (current ? '<div class="an-fields">' + [
        ['x', 'Position X', 0, size.w], ['y', 'Position Y', 0, size.h], ['w', 'Breite', 8, size.w], ['h', 'Höhe', 8, size.h],
        ['font_size', 'Schriftgröße', 10, 160], ['rotation', 'Drehung', -180, 180], ['opacity', 'Deckkraft', 0, 1]
      ].map(function (p) { return '<label class="an-field"><span>' + p[1] + '</span><input type="number" data-element-prop="' + p[0] + '" value="'
          + current[p[0]] + '" min="' + p[2] + '" max="' + p[3] + '" step="' + (p[0] === 'opacity' ? '.05' : '1') + '"></label>'; }).join('')
        + '<label class="an-field"><span>Elementfarbe</span><input type="color" data-element-prop="fill" value="' + M.esc(current.fill || data.layout.text_color) + '"></label></div>'
        + '<label class="an-field"><span>Schrift des Elements</span><select data-element-prop="font">' + ['Arial', 'Georgia', 'Verdana', 'Trebuchet MS'].map(function (font) { return '<option' + (current.font === font ? ' selected' : '') + '>' + font + '</option>'; }).join('') + '</select></label>'
        + '<label class="an-field"><span>Ausrichtung</span><select data-element-prop="align">' + [['left', 'Links'], ['center', 'Zentriert'], ['right', 'Rechts']].map(function (p) { return '<option value="' + p[0] + '"' + (current.align === p[0] ? ' selected' : '') + '>' + p[1] + '</option>'; }).join('') + '</select></label>'
        + (current.type === 'text' ? '<label class="an-field"><span>Eigener Text</span><textarea data-element-prop="text" maxlength="2000">' + M.esc(current.text) + '</textarea></label>' : '')
        + (current.type === 'shape' ? '<label class="an-field"><span>Form</span><select data-element-prop="shape">' + [['rect', 'Rechteck'], ['round', 'Abgerundet'], ['ellipse', 'Oval']].map(function (p) { return '<option value="' + p[0] + '"' + (current.shape === p[0] ? ' selected' : '') + '>' + p[1] + '</option>'; }).join('') + '</select></label>' : '')
        + '<div class="an-row"><label class="an-field"><input type="checkbox" data-element-prop="bold"' + (current.bold ? ' checked' : '') + '> Fett</label>'
        + '<label class="an-field"><input type="checkbox" data-element-prop="hidden"' + (current.hidden ? ' checked' : '') + '> Ausblenden</label></div>'
        + '<div class="an-element-actions"><button data-nudge="-5,0" aria-label="Element nach links">←</button><button data-nudge="0,-5" aria-label="Element nach oben">↑</button><button data-nudge="0,5" aria-label="Element nach unten">↓</button><button data-nudge="5,0" aria-label="Element nach rechts">→</button></div>'
        + '<div class="an-element-actions"><button data-element-action="copy">Duplizieren</button><button data-element-action="forward">Ebene nach vorn</button><button data-element-action="back">Ebene zurück</button><button data-element-action="delete">Element entfernen</button></div>' : '')
      + '<div class="an-actions"><button data-history="undo"' + (undo.length ? '' : ' disabled') + '>Rückgängig</button><button data-history="redo"' + (redo.length ? '' : ' disabled') + '>Wiederholen</button></div>';
  }
  function overlay() {
    var host = $('an-hit-layer'); if (!host) return;
    var size = activeSize();
    host.innerHTML = elements().filter(function (e) { return !e.hidden; }).map(function (e) {
      return '<button type="button" data-select="' + e.id + '" class="' + (selected === e.id ? 'an-selected' : '') + '" aria-label="Element auswählen: ' + roleNames[e.type]
        + '" style="left:' + e.x / size.w * 100 + '%;top:' + e.y / size.h * 100 + '%;width:' + e.w / size.w * 100 + '%;height:' + e.h / size.h * 100
        + '%;transform:rotate(' + e.rotation + 'deg)"></button>';
    }).join('');
  }
  async function preview() {
    if (!data || !$('an-stage-canvas')) return;
    var ticket = ++paint, draft = M.clone(data), n = page;
    await D.previewChoices($('an-style-controls'), draft.layout, draft.kind);
    var noTargetItem = designTarget !== 'sheet' && !designItemId;
    var result;
    if (noTargetItem) {
      var empty = document.createElement('canvas'), emptySize = activeSize();
      empty.width = emptySize.w; empty.height = emptySize.h; result = { canvas: empty, errors: [] };
    } else result = designTarget === 'sheet'
      ? await M.render(draft, n, 1.5)
      : await M.renderTarget(draft, designTarget, designItemId, 1.5);
    if (ticket !== paint || !data || !$('an-stage-canvas')) return;
    var canvas = result.canvas; canvas.id = 'an-stage-canvas'; canvas.setAttribute('aria-label', 'Live-Vorschau des Angebotsflyers');
    $('an-stage-canvas').replaceWith(canvas);
    var names = { card: 'Homepage-/Kioskkachel', single: 'Einzelflyer', scale: 'Waagenmotiv', sheet: 'Sammelflyer' };
    var size = activeSize();
    $('an-stage').style.aspectRatio = size.w + ' / ' + size.h;
    var availableWidth = Math.max(100, $('an-preview').clientWidth - 48);
    var maxHeight = window.innerHeight - (window.innerWidth > 1000 ? 455 : window.innerWidth > 480 ? 560 : 350);
    if (window.innerWidth <= 480) maxHeight = Math.min(430, maxHeight);
    maxHeight = Math.max(160, maxHeight);
    var stageWidth = Math.min(availableWidth, maxHeight * size.w / size.h);
    $('an-stage').style.width = stageWidth + 'px';
    $('an-stage').style.height = stageWidth * size.h / size.w + 'px';
    $('an-stage').style.marginInline = 'auto';
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
    $('an-design-item-wrap').hidden = designTarget === 'sheet';
    if ($('an-design-item')) $('an-design-item').value = designItemId;
    root.querySelectorAll('[data-layout-target]').forEach(function (button) {
      button.setAttribute('aria-pressed', String(button.dataset.layoutTarget === designTarget));
    });
    $('an-stage').hidden = previewMode !== 'paper';
    $('an-other-preview').hidden = previewMode === 'paper';
    $('an-preview-hint').textContent = previewMode === 'paper' ? 'Zum Auswählen auf ein Element tippen' : 'Ausgabevorschau · keine Änderung deiner Gestaltung';
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
  }
  function setStep(value) {
    step = value;
    ['articles', 'design', 'output'].forEach(function (s) { $('an-step-' + s).hidden = value !== s; });
    root.querySelectorAll('[data-step]').forEach(function (b) { b.setAttribute('aria-pressed', String(b.dataset.step === value)); });
    if (step === 'design') renderInspector();
  }
  function renderEditor() {
    root.innerHTML = header(data.title || 'Dein Angebotsflyer')
      + '<div class="an-row an-preview-head an-toolbar"><span class="an-badge" id="an-state">' + (dirty ? 'Entwurf geändert · noch nicht gespeichert' : record && record.published_revision ? 'Gespeicherter Entwurf · veröffentlichte Fassung bleibt getrennt' : 'Gespeicherter Entwurf · nicht veröffentlicht')
      + '</span><div class="an-actions"><button data-history="undo"' + (undo.length ? '' : ' disabled') + '>Rückgängig</button>'
      + '<button id="an-reload-saved"' + (!record ? ' disabled' : '') + '>Gespeicherten Stand laden</button>'
      + '<button id="an-overview">Zur Übersicht</button><button id="an-save" class="an-primary">Entwurf speichern</button></div></div>'
      + '<div class="an-layout"><section class="an-card an-work-panel"><nav class="an-tabs an-steps" aria-label="Bearbeitung"><button data-step="articles">1 · Artikel und Bilder</button><button data-step="design">2 · Frei gestalten</button><button data-step="output">3 · Ausgeben</button></nav>'
      + '<section id="an-step-articles"><details id="an-action-meta"><summary id="an-action-summary"></summary><div class="an-fields">'
      + '<label class="an-field wide"><span>Titel der Aktion</span><input id="an-title" data-action-prop="title" maxlength="120" value="' + M.esc(data.title) + '"></label>'
      + '<label class="an-field"><span>Gültig von</span><input type="date" data-action-prop="valid_from" value="' + data.valid_from + '"></label>'
      + '<label class="an-field"><span>Gültig bis</span><input type="date" data-action-prop="valid_to" value="' + data.valid_to + '"></label></div></details>'
      + '<h2>Artikel mit Bild auswählen</h2><div class="an-actions"><button id="an-add-catalog" class="an-primary">+ Aus Artikelstamm wählen</button><button id="an-add-manual">+ Manueller Artikel</button></div>'
      + '<div id="an-items"></div><p class="an-note">Angebotspreis, Pfand und Veröffentlichung bleiben vom Stamm getrennt. Eigene Bildänderungen überschreiben keine Stammdaten.</p>'
      + '<button data-step="design" class="an-primary">Weiter · Kachel / Flyer gestalten</button></section>'
      + '<section id="an-step-design" hidden><h2>Die vertraute freie Gestaltung</h2><p class="an-muted">Bild, Preis und Texte antippen und ziehen – oder mit Zahlen und Pfeilen bearbeiten. Jedes Ausgabeziel bleibt separat gespeichert.</p>'
      + '<details id="an-design-options"><summary>Vorlagen, Farben und Schrift</summary><div id="an-style-controls">' + D.controls(data.layout) + '</div>'
      + '<p class="an-note">Eine Vorlage ersetzt freie Positionen erst nach deiner Bestätigung.</p><div class="an-actions"><button id="an-template">Vorlage neu anwenden</button><button id="an-defaults">Designstandards übernehmen</button></div></details>'
      + '<div id="an-inspector" class="an-inspector"></div><div class="an-actions"><button id="an-add-page">+ Seite</button><button id="an-remove-page">Seite entfernen</button></div>'
      + '<button data-step="output" class="an-primary">Weiter · Ausgeben</button></section>'
      + '<section id="an-step-output" hidden><h2>Wie bei den bisherigen Angeboten ausgeben</h2><div id="an-output-previews">'
      + D.previewTabs(previewMode, 'data-editor-mode') + '</div><p>Speichern, Veröffentlichen, Drucken und Waagenversand sind getrennte Aktionen.</p>'
      + '<p class="an-status" id="an-output-status">' + (record && record.published_revision ? 'Eine veröffentlichte Fassung ist vorhanden. Änderungen bleiben bis zur nächsten Freigabe intern.' : 'Noch nicht veröffentlicht.') + '</p>'
      + '<div class="an-publish-actions"><button id="an-publish" class="an-primary">Für Homepage veröffentlichen</button><button id="an-print-single">Einzelflyer drucken / PDF</button><button id="an-print-action">Sammelflyer A4 drucken / PDF</button><button id="an-scale">Für Waage vorbereiten</button></div>'
      + '<p class="an-note">Freigabe gilt im gewählten Zeitraum (Europe/Berlin). Die Waage wird nur nach eigenem Versand aktualisiert.</p></section></section>'
      + '<section class="an-preview an-card" id="an-preview"><div class="an-preview-head"><h2>Gestaltbare Homepage-/Kioskansicht</h2><span class="an-muted" id="an-preview-hint">Element antippen oder ziehen</span></div>'
      + '<nav class="an-tabs an-target-tabs" aria-label="Gestaltungsziel">'
      + '<button type="button" data-layout-target="card">Homepage / Kiosk</button><button type="button" data-layout-target="single">Einzelflyer</button>'
      + '<button type="button" data-layout-target="sheet">Sammelflyer</button><button type="button" data-layout-target="scale">Waage</button></nav>'
      + '<label class="an-field" id="an-design-item-wrap"><span>Artikel für diese Gestaltung</span><select id="an-design-item">'
      + data.items.map(function (item) { return '<option value="' + item.id + '"' + (item.id === designItemId ? ' selected' : '') + '>' + M.esc(item.name || 'Neuer Artikel') + '</option>'; }).join('')
      + '</select></label><div id="an-other-preview" hidden></div>'
      + '<div class="an-stage" id="an-stage"><canvas id="an-stage-canvas"></canvas><div class="an-hit-layer" id="an-hit-layer"></div></div>'
      + '<p class="an-stage-info" id="an-stage-info" role="status"></p><div class="an-actions an-spread" id="an-page-tools"><button id="an-page-prev" aria-label="Vorherige Flyerseite">←</button><span id="an-page-label"></span><button id="an-page-next" aria-label="Nächste Flyerseite">→</button></div>'
      + '<p class="an-muted" id="an-stage-help">Tippen = auswählen · Ziehen = verschieben · Quadrat unten rechts = Größe ändern. Zahlenfelder funktionieren auch ohne Ziehen.</p></section></div>';
    var summary = $('an-action-summary');
    summary.textContent = data.title + ' · ' + M.date(data.valid_from) + ' – ' + M.date(data.valid_to);
    renderItems(); setStep(step); bind(); preview().catch(M.error);
    if (busy) lock(true);
  }
  function addItem(it) {
    edit(function () {
      data.items.push(it);
      if (data.layout.mode === 'template') M.applyTemplate(data);
      else {
        var extra = M.clone(data); extra.items = [it]; M.applyTemplate(extra);
        data.layout.pages.push(extra.layout.pages[0]);
      }
      M.ensureTargets(data);
    });
    if (!designItemId) designItemId = it.id;
    renderItems(); renderInspector();
  }
  async function upload(file) {
    if (!file) return '';
    var response = await M.request('/api/angebote-bilder', { method: 'POST', headers: { 'Content-Type': file.type || 'application/octet-stream' }, body: file });
    return response.image_id;
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
    function results() {
      var q = dlg.querySelector('input').value.toLocaleLowerCase('de');
      var matches = catalog.filter(function (a) {
        return [a.bezeichnung, a.artikelnummer, a.strichcode].join(' ').toLocaleLowerCase('de').includes(q);
      });
      dlg.querySelector('.an-picker-results').innerHTML = matches.map(function (a) {
        var index = catalog.indexOf(a), price = M.cents(a.vk);
        return '<button type="button" data-master-index="' + index + '" aria-pressed="' + chosen.has(index) + '"><span><strong>'
          + M.esc(a.bezeichnung) + '</strong><br><small>' + M.esc(a.artikelnummer || 'ohne Artikelnummer') + (a.strichcode ? ' · EAN ' + M.esc(a.strichcode) : '')
          + (a.menge ? ' · ' + M.esc(a.menge) : '') + '</small></span><span>' + (price == null ? 'VK —' : 'VK ' + M.money(price) + ' €')
          + (chosen.has(index) ? ' · ✓' : ' · + Auswählen') + '</span></button>';
      }).join('') || '<p>Kein Artikel gefunden. Du kannst einen eigenen Artikel erfassen.</p>';
      dlg.querySelector('#an-master-add').disabled = chosen.size === 0;
      dlg.querySelector('#an-master-add').textContent = 'Auswahl übernehmen (' + chosen.size + ')';
    }
    dlg.querySelector('.an-close').onclick = close; dlg.addEventListener('cancel', function (e) { e.preventDefault(); close(); });
    dlg.querySelector('input').oninput = results;
    dlg.addEventListener('click', function (e) {
      var b = e.target.closest('[data-master-index]');
      if (b) {
        var index = Number(b.dataset.masterIndex);
        if (chosen.has(index)) chosen.delete(index); else chosen.add(index);
        results();
      }
    });
    dlg.querySelector('#an-master-add').onclick = function () {
      run(async function () {
        var selectedSources = Array.from(chosen).map(function (index) { return catalog[index]; });
        var imageResults = await lookupMasterImages(selectedSources.map(function (source) {
          return { article_number: String(source.artikelnummer || ''), barcode: String(source.strichcode || '') };
        }));
        for (var source of selectedSources) {
          var it = masterItem(source, dlg.querySelector('#an-copy-vk').checked);
          var blob = imageForMaster(imageResults, it);
          if (blob) it.image_id = await upload(blob);
          addItem(it);
        }
        close();
        renderItems();
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
      + (item.article_number ? 'Artikelstamm · Änderungen nur in diesem Angebot' : 'Manuell · eigenes Bild hinzufügen') + '</p></div>'
      + '<button type="button" class="an-close" aria-label="Artikelbearbeitung schließen">×</button></div>'
      + '<section class="an-image-tools"><div class="an-image-preview">' + (item.image_id
        ? '<img src="/api/angebote-bilder/' + encodeURIComponent(item.image_id) + '" alt="Aktuelles Artikelbild">'
        : '<span>Kein Artikelbild</span>') + '</div><div class="an-image-actions"><strong>Artikelbild – auch bei manueller Anlage</strong>'
      + '<div class="an-actions"><label class="an-btn an-upload">Bilddatei wählen / ersetzen<input type="file" accept="image/jpeg,image/png,image/webp"></label>'
      + '<button type="button" data-image-search>🔍 Bild per Nummer / EAN suchen</button>'
      + '<button type="button" data-image-paste>📋 Zwischenablage einfügen</button>'
      + '<button type="button" data-image-remove' + (item.image_id ? '' : ' disabled') + '>Bild entfernen</button></div>'
      + '<details class="an-image-more"><summary>Weitere Bildfunktionen</summary><p class="an-muted">Die Suche liest die vorhandene Stamm-/SharePoint-Bildquelle. Änderungen bleiben auf dieses Angebot beschränkt.</p></details>'
      + '<p class="an-muted" data-image-status role="status">Die Bildauswahl wird erst beim Speichern dem Angebot zugeordnet.</p></div></section>'
      + '<div class="an-fields an-core-fields"><label class="an-field wide"><span>Artikelname</span><input data-item-field="name" maxlength="160" value="' + M.esc(item.name) + '"></label>'
      + '<label class="an-field"><span>Regulärer VK · Artikelstamm</span><input value="' + (item.retail_price_cents == null ? '—' : M.money(item.retail_price_cents) + ' €') + '" readonly></label>'
      + '<label class="an-field"><span>Angebotspreis €</span><input data-item-field="price_cents" inputmode="decimal" value="' + (item.price_cents == null ? '' : M.money(item.price_cents)) + '"></label>'
      + '<label class="an-field"><span>Stattpreis €</span><input data-item-field="old_price_cents" inputmode="decimal" value="' + (item.old_price_cents == null ? '' : M.money(item.old_price_cents)) + '"></label>'
      + (drinks ? '<label class="an-field"><span>Anzahl Flaschen / Einheiten</span><input data-item-field="units" type="number" min="1" step="1" value="' + (item.units || '') + '"></label>'
        + '<label class="an-field"><span>Liter je Einheit</span><input data-item-field="volume" type="number" min=".001" step=".001" value="' + (item.volume_ml ? item.volume_ml / 1000 : '') + '"></label>'
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
    var imageBlob = null, imageUrl = '', clearImage = false, pasteEnabled = false, closed = false;
    function setPreview(blob) {
      if (imageUrl) URL.revokeObjectURL(imageUrl);
      imageBlob = blob; clearImage = false; imageUrl = blob ? URL.createObjectURL(blob) : '';
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
      event.preventDefault(); setPreview(files[0]); pasteEnabled = false;
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
      setPreview(file); status.textContent = 'Bild ausgewählt. Mit „Übernehmen“ wird es diesem Angebot hinzugefügt.';
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
        var imageId = item.image_id;
        if (imageBlob) {
          status.textContent = 'Das Bild wird sicher dem Angebotsentwurf zugeordnet …';
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
            var ml = Number(value('volume').value) * 1000;
            item.volume_ml = value('volume').value !== '' && Number.isInteger(ml) ? ml : null;
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
    document.body.appendChild(dlg); dlg.showModal();
  }
  async function save() {
    var response = record ? await M.request('/api/angebote-verwaltung/' + record.id, M.json('PUT', { version: record.version, data: data }))
      : await M.request('/api/angebote-verwaltung', M.json('POST', { data: data }));
    record = response.action; data = M.clone(record.draft); config = response.config; dirty = false;
    renderEditor(); $('an-state').textContent = 'Entwurf gespeichert · Veröffentlichung bleibt getrennt';
  }
  async function publish() {
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
    await printCanvases(await M.preflight(data), data.layout.pages.map(function () { return data.title; }));
  }
  async function printSingles() {
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
  window.addEventListener('afterprint', function () { document.body.classList.remove('an-printing'); });
  async function scale() {
    await M.preflight(data);
    if (dirty || !record) await save();
    var dlg = document.createElement('dialog'); dlg.className = 'an-dialog';
    dlg.innerHTML = '<button class="an-close" aria-label="Waagenauswahl schließen">×</button><h2>Ausgabe für die Waage</h2>'
      + '<label class="an-field"><span>Darstellung</span><select id="an-scale-mode"><option value="single">Einzelartikel im Wechsel · empfohlen</option><option value="full">Gesamter Flyer · jede Seite</option></select></label>'
      + '<p class="an-note">Ein ganzer A4-Flyer wird unverzerrt eingepasst, hat auf der Waage aber kleine Schrift. Bitte Lesbarkeit prüfen.</p>'
      + (!config.scale_enabled ? '<p class="an-note">Preview: Vorschau und Export möglich, echter Versand ist serverseitig gesperrt.</p>' : '')
      + '<button class="an-primary" id="an-scale-prepare">Waagenvorschau öffnen</button>';
    function close() { dlg.close(); dlg.remove(); }
    dlg.querySelector('.an-close').onclick = close;
    dlg.addEventListener('cancel', function (e) { e.preventDefault(); close(); });
    dlg.querySelector('#an-scale-prepare').onclick = function () {
      var mode = dlg.querySelector('select').value; close();
      run(async function () {
        var draft = M.clone(data), actionHash = await M.hash(record.id, 12), revision = await M.hash(M.uid(), 12);
        var prefix = '21_' + config.scale_scope + '_' + actionHash + '_';
        window.KWerbebilder.uebertragen({
          titel: 'Angebot „' + draft.title + '“ · ' + (mode === 'single' ? 'Einzelartikel' : 'gesamter Flyer'),
          art: 'dauer', praefix: prefix, nurAktion: true, nurVorschau: !config.scale_enabled, verwaltetesAngebot: true,
          hinweisDauer: 'Gültig ' + M.date(draft.valid_from) + ' – ' + M.date(draft.valid_to) + '. Abgelaufene Bilder werden beim nächsten Online-Abgleich deaktiviert.',
          erzeuge: async function (art, progress, cancelled, dimensions) {
            var canvases = await M.scaleImages(draft, mode, dimensions), result = [];
            for (var n = 0; n < canvases.length; n++) {
              if (cancelled()) return [];
              progress(n + 1, canvases.length);
              var blob = await new Promise(function (resolve) { canvases[n].toBlob(resolve, 'image/jpeg', .94); });
              if (!blob) throw M.problem('Das Waagenbild konnte nicht erstellt werden.');
              result.push({ name: prefix + revision + '_' + draft.valid_from.replace(/-/g, '') + '_' + draft.valid_to.replace(/-/g, '') + '_' + String(n + 1).padStart(2, '0') + '.jpg', blob: blob, an: true });
            }
            return result;
          }
        });
      });
    };
    document.body.appendChild(dlg); dlg.showModal();
  }
  function move(dx, dy) {
    var e = selection(); if (!e) return;
    var size = activeSize();
    edit(function () { e.x = Math.max(0, Math.min(size.w - e.w, e.x + dx)); e.y = Math.max(0, Math.min(size.h - e.h, e.y + dy)); }, true);
    renderInspector();
  }
  function bind() {
    $('an-overview').onclick = function () { run(overview); };
    $('an-reload-saved').onclick = function () { if (record) run(async function () { if (await discard()) await open(record.id); }); };
    $('an-save').onclick = function () { run(save); };
    $('an-add-manual').onclick = function () { var item = M.item(); addItem(item); openItemDialog(item.id); };
    if ($('an-add-catalog')) $('an-add-catalog').onclick = function () { run(picker); };
    $('an-page-prev').onclick = function () { page--; selected = ''; renderInspector(); preview().catch(M.error); };
    $('an-page-next').onclick = function () { page++; selected = ''; renderInspector(); preview().catch(M.error); };
    $('an-publish').onclick = function () { run(publish); }; $('an-print-single').onclick = function () { run(printSingles); };
    $('an-print-action').onclick = function () { run(print); }; $('an-scale').onclick = function () { run(scale); };
    root.onclick = async function (event) {
      var b = event.target.closest('button');
      if (!b || b.disabled || busy) return;
      if (b.dataset.editorMode) {
        previewMode = b.dataset.editorMode; D.selectPreview(root, previewMode, 'data-editor-mode');
        preview().catch(M.error); return;
      }
      if (b.dataset.layoutTarget) {
        designTarget = b.dataset.layoutTarget; designItemId = data.items[0] ? data.items[0].id : '';
        selected = ''; previewMode = 'paper'; renderInspector(); preview().catch(M.error); return;
      }
      if (b.dataset.editItem) { openItemDialog(b.dataset.editItem); return; }
      if (b.dataset.step) setStep(b.dataset.step);
      if (b.dataset.select) { selected = b.dataset.select; setStep('design'); overlay(); }
      if (b.dataset.remove) {
        edit(function () { data.items = data.items.filter(function (it) { return it.id !== b.dataset.remove; });
          data.layout.pages.forEach(function (p) { p.elements = p.elements.filter(function (e) { return e.item_id !== b.dataset.remove; }); });
          M.ensureTargets(data);
          if (data.layout.mode === 'template') M.applyTemplate(data); page = Math.min(page, data.layout.pages.length - 1);
        });
        if (designItemId === b.dataset.remove) designItemId = data.items[0] ? data.items[0].id : '';
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
      if (b.dataset.addElement) {
        var type = b.dataset.addElement, imageId = '';
        if (type === 'image') {
          var input = document.createElement('input'); input.type = 'file'; input.accept = 'image/jpeg,image/png,image/webp';
          input.onchange = function () { run(async function () { var id = await upload(input.files[0]); if (id) insertElement(type, id); }); }; input.click(); return;
        }
        insertElement(type, imageId);
      }
      if (b.dataset.nudge) { var nudge = b.dataset.nudge.split(',').map(Number); move(nudge[0], nudge[1]); }
      if (b.dataset.elementAction && selection()) {
        edit(function () {
          var e = selection(), i = elements().indexOf(e), action = b.dataset.elementAction;
          if (action === 'delete') { elements().splice(i, 1); selected = ''; }
          if (action === 'copy') { var size = activeSize(), copy = M.clone(e); copy.id = M.uid(); copy.x = Math.min(size.w - copy.w, e.x + 12); copy.y = Math.min(size.h - copy.h, e.y + 12); elements().push(copy); selected = copy.id; }
          if (action === 'forward' && i < elements().length - 1) { elements().splice(i, 1); elements().splice(i + 1, 0, e); }
          if (action === 'back' && i > 0) { elements().splice(i, 1); elements().splice(i - 1, 0, e); }
        }, true); renderInspector();
      }
      if (b.dataset.history) {
        var source = b.dataset.history === 'undo' ? undo : redo, dest = b.dataset.history === 'undo' ? redo : undo;
        if (source.length) { dest.push(M.clone(data)); data = source.pop(); page = Math.min(page, data.layout.pages.length - 1); changed(); renderEditor(); }
      }
      if (b.id === 'an-template' || b.id === 'an-defaults') {
        if (!(await M.dialog('Gestaltung ersetzen?', 'Alle freien Positionen und eigenen Gestaltungselemente werden durch die gewählte Vorlage ersetzt. Artikel und Preise bleiben erhalten.', 'Vorlage anwenden'))) return;
        run(async function () {
          var layout = data.layout;
          if (b.id === 'an-defaults') { var result = await M.request('/api/angebote-verwaltung?view=design'); layout = result.design[data.kind]; }
          edit(function () {
            if (b.id === 'an-defaults') {
              var targets = data.layout.targets;
              data.layout = M.clone(layout); data.layout.targets = targets;
            }
            if (designTarget === 'sheet') { M.applyTemplate(data); page = 0; }
            else data.items.forEach(function (it) { M.applyTargetTemplate(data, designTarget, it.id); });
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
      var target = event.target;
      if (target.dataset.prop) {
        var it = data.items.find(function (item) { return item.id === target.closest('[data-item-id]').dataset.itemId; });
        edit(function () {
          var prop = target.dataset.prop;
          if (prop.endsWith('_cents')) it[prop] = M.cents(target.value);
          else if (prop === 'units') it.units = target.value === '' ? null : Number(target.value);
          else if (prop === 'volume_ml') { var ml = Number(target.value) * 1000; it.volume_ml = target.value !== '' && Math.abs(ml - Math.round(ml)) < .00001 ? Math.round(ml) : null; }
          else if (prop === 'deposit_mode') {
            it.deposit_free = target.value === 'no';
            if (it.deposit_free) it.deposit_cents = 0;
            else if (!target.value || it.deposit_cents === 0) it.deposit_cents = null;
            var pfand = target.closest('[data-item-id]').querySelector('[data-prop=deposit_cents]');
            pfand.disabled = it.deposit_free; pfand.value = it.deposit_cents == null ? '' : (it.deposit_cents / 100).toFixed(2);
          }
          else it[prop] = target.value;
        });
        var hint = target.closest('[data-item-id]').querySelector('[data-unit-price]');
        if (hint) hint.textContent = 'Literpreis: ' + M.money(M.base(it)) + ' €/l · Angebotspreis ohne Pfand';
      }
      if (target.dataset.actionProp) {
        edit(function () { data[target.dataset.actionProp] = target.value; });
        $('an-action-summary').textContent = data.title + ' · ' + M.date(data.valid_from) + ' – ' + M.date(data.valid_to);
      }
      if (target.dataset.style) {
        edit(function () { D.change(data.layout, target); if (data.layout.mode === 'template' && designTarget === 'sheet') M.applyTemplate(data); });
      }
      if (target.id === 'an-design-item') { designItemId = target.value; selected = ''; renderInspector(); preview().catch(M.error); }
      if (target.id === 'an-select-element') { selected = target.value; renderInspector(); overlay(); }
      if (target.dataset.elementProp && selection()) {
        var e = selection();
        edit(function () { e[target.dataset.elementProp] = target.type === 'checkbox' ? target.checked : target.type === 'number' ? Number(target.value) : target.value; }, true);
      }
    };
    $('an-stage').onpointerdown = function (event) {
      var hit = event.target.closest('[data-select]');
      if (!hit || busy || event.button !== 0) return;
      selected = hit.dataset.select; setStep('design');
      var e = selection(), size = activeSize(), rect = $('an-stage').getBoundingClientRect(), startX = event.clientX, startY = event.clientY, x = e.x, y = e.y, moved = false;
      function drag(ev) {
        if (!moved && Math.abs(ev.clientX - startX) + Math.abs(ev.clientY - startY) < 5) return;
        if (!moved) { checkpoint(); moved = true; }
        e.x = Math.max(0, Math.min(size.w - e.w, x + (ev.clientX - startX) * size.w / rect.width));
        e.y = Math.max(0, Math.min(size.h - e.h, y + (ev.clientY - startY) * size.h / rect.height));
        hit.style.left = e.x / size.w * 100 + '%'; hit.style.top = e.y / size.h * 100 + '%';
        if (designTarget === 'sheet') data.layout.mode = 'free'; changed();
      }
      function end() {
        document.removeEventListener('pointermove', drag); document.removeEventListener('pointerup', end); document.removeEventListener('pointercancel', end);
        renderInspector(); preview().catch(M.error);
      }
      document.addEventListener('pointermove', drag); document.addEventListener('pointerup', end); document.addEventListener('pointercancel', end);
    };
    $('an-stage').onkeydown = function (e) {
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
  overview().catch(function (e) {
    root.innerHTML = header('Angebote') + '<p class="an-status an-error" role="alert">Die Angebotsverwaltung ist gerade nicht verfügbar.</p><button id="an-retry">Erneut versuchen</button>';
    $('an-retry').onclick = function () { location.reload(); }; M.error(e);
  });
})();
