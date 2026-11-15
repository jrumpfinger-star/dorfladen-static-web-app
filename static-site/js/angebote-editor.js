(function () {
  'use strict';
  var root = document.getElementById('an-root');
  if (!root) return;
  var M = window.AngeboteModel, D = window.AngeboteDesign;
  var record = null, data = null, config = null, design = null, dirty = false, busy = false;
  var step = 'articles', page = 0, selected = '', paint = 0, undo = [], redo = [];
  var previewMode = 'paper';
  var roleNames = { brand: 'Marke', title: 'Überschrift', period: 'Zeitraum', footer: 'Fußzeile',
    name: 'Artikelname', pack: 'Gebinde', description: 'Beschreibung', price: 'Preis',
    old_price: 'Stattpreis', deposit: 'Pfand', base: 'Literpreis', image: 'Bild', text: 'Eigener Text', shape: 'Fläche' };
  var $ = function (id) { return document.getElementById(id); };
  function header(title) {
    return '<header class="an-head"><div><small>DORFLADEN OBERORNAU · ANGEBOTE</small><h1>' + M.esc(title) + '</h1></div>'
      + '<nav class="an-row" aria-label="Zurück"><a class="an-btn" href="/kiosk.html">Kiosk</a><a class="an-btn" href="/cms.html?tab=ang">CMS</a>'
      + '<a class="an-btn" href="/index.html#angebote" target="_blank" rel="noopener">Kundenansicht</a></nav></header>'
      + (config && !config.scale_enabled ? '<p class="an-note">Vorschauumgebung · Neue Angebote sind getrennt gespeichert. Kein echter Waagenversand aus dieser Umgebung.</p>' : '');
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
    checkpoint(); fn(); if (free) data.layout.mode = 'free'; changed(); preview().catch(M.error);
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
    dirty = true; undo = []; redo = []; step = 'articles'; page = 0; selected = ''; previewMode = 'paper'; renderEditor();
  }
  async function open(id) {
    var response = await M.request('/api/angebote-verwaltung/' + id);
    record = response.action; config = response.config; data = M.clone(record.draft);
    dirty = false; undo = []; redo = []; step = 'articles'; page = 0; selected = ''; previewMode = 'paper'; renderEditor();
  }
  function field(label, prop, value, type, extra) {
    return '<label class="an-field"><span>' + label + '</span><input data-prop="' + prop + '" type="' + (type || 'text')
      + '" value="' + M.esc(value == null ? '' : value) + '" ' + (extra || '') + '></label>';
  }
  function renderItems() {
    var host = $('an-items');
    host.innerHTML = data.items.map(function (it, i) {
      var drinks = data.kind === 'drinks';
      return '<details class="an-item" data-item-id="' + it.id + '" open><summary>' + M.esc(it.name || 'Neuer Artikel ' + (i + 1)) + '</summary>'
        + field('Artikelname ' + (i + 1), 'name', it.name, 'text', 'maxlength="160"')
        + field('Artikelnummer ' + (i + 1), 'article_number', it.article_number, 'text', 'maxlength="80"')
        + '<div class="an-fields">' + field('Angebotspreis € ' + (i + 1), 'price_cents', it.price_cents == null ? '' : (it.price_cents / 100).toFixed(2), 'number', 'min=".01" step=".01"')
        + field('Stattpreis € ' + (i + 1) + ' (optional)', 'old_price_cents', it.old_price_cents == null ? '' : (it.old_price_cents / 100).toFixed(2), 'number', 'min=".01" step=".01"') + '</div>'
        + (drinks ? '<div class="an-fields">' + field('Anzahl Flaschen / Einheiten ' + (i + 1), 'units', it.units, 'number', 'min="1" step="1"')
          + field('Liter je Einheit ' + (i + 1), 'volume_ml', it.volume_ml == null ? '' : it.volume_ml / 1000, 'number', 'min=".001" step=".001"') + '</div>'
          + '<label class="an-field"><span>Gebindeart ' + (i + 1) + '</span><select data-prop="packaging"><option value="">Bitte wählen</option>'
          + ['Mehrweg', 'Einweg', 'Dose', 'Flasche', 'Karton', 'Fass'].map(function (v) { return '<option' + (v === it.packaging ? ' selected' : '') + '>' + v + '</option>'; }).join('')
          + '</select></label><div class="an-fields"><label class="an-field"><span>Pfandentscheidung ' + (i + 1) + '</span><select data-prop="deposit_mode">'
          + '<option value="">Bitte wählen</option><option value="yes"' + (!it.deposit_free && it.deposit_cents > 0 ? ' selected' : '') + '>Mit Pfand</option>'
          + '<option value="no"' + (it.deposit_free ? ' selected' : '') + '>Pfandfrei</option></select></label>'
          + field('Gesamtpfand € ' + (i + 1), 'deposit_cents', it.deposit_cents == null ? '' : (it.deposit_cents / 100).toFixed(2), 'number', 'min=".01" step=".01"' + (it.deposit_free ? ' disabled' : '')) + '</div>'
          + '<p class="an-muted" data-unit-price>Literpreis: ' + M.money(M.base(it)) + ' €/l · Angebotspreis ohne Pfand</p>' : '')
        + field('Beschreibung ' + (i + 1), 'description', it.description, 'text', 'maxlength="500"')
        + '<label class="an-field"><span>Eigenes Produktbild ' + (i + 1) + (it.image_id ? ' · Bild gespeichert' : '') + '</span><input type="file" accept="image/jpeg,image/png,image/webp" data-image-item="' + it.id + '"></label>'
        + '<div class="an-actions"><button data-highlight="' + it.id + '" aria-pressed="' + it.highlight + '">' + (it.highlight ? '★ Hervorgehoben' : '☆ Hervorheben') + '</button>'
        + '<button data-up="' + it.id + '"' + (i === 0 ? ' disabled' : '') + '>↑ Nach oben</button><button data-remove="' + it.id + '">Entfernen</button></div></details>';
    }).join('') || '<p>Füge einen eigenen Artikel hinzu oder wähle aus dem Getränkekatalog.</p>';
  }
  function elements() { return data.layout.pages[page].elements; }
  function selection() { return elements().find(function (e) { return e.id === selected; }); }
  function renderInspector() {
    var host = $('an-inspector'); if (!host) return;
    var current = selection();
    host.innerHTML = '<h3>Frei gestalten</h3><p class="an-muted">Element in der Vorschau antippen oder hier wählen. Ziehen ist optional; alle Positionen sind auch über Eingaben und Pfeile einstellbar.</p>'
      + '<label class="an-field"><span>Gestaltungselement</span><select id="an-select-element"><option value="">Bitte auswählen</option>'
      + elements().map(function (e, i) { return '<option value="' + e.id + '"' + (e.id === selected ? ' selected' : '') + '>'
        + (i + 1) + ' · ' + roleNames[e.type] + (e.hidden ? ' (ausgeblendet)' : '') + '</option>'; }).join('') + '</select></label>'
      + '<div class="an-element-actions"><button data-add-element="text">+ Text</button><button data-add-element="shape">+ Fläche</button><button data-add-element="image">+ Eigenes Bild</button></div>'
      + (current ? '<div class="an-fields">' + [
        ['x', 'Position X', 0, M.W], ['y', 'Position Y', 0, M.H], ['w', 'Breite', 8, M.W], ['h', 'Höhe', 8, M.H],
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
    host.innerHTML = elements().filter(function (e) { return !e.hidden; }).map(function (e) {
      return '<button type="button" data-select="' + e.id + '" class="' + (selected === e.id ? 'an-selected' : '') + '" aria-label="Element auswählen: ' + roleNames[e.type]
        + '" style="left:' + e.x / M.W * 100 + '%;top:' + e.y / M.H * 100 + '%;width:' + e.w / M.W * 100 + '%;height:' + e.h / M.H * 100
        + '%;transform:rotate(' + e.rotation + 'deg)"></button>';
    }).join('');
  }
  async function preview() {
    if (!data || !$('an-stage-canvas')) return;
    var ticket = ++paint, draft = M.clone(data), n = page;
    await D.previewChoices($('an-style-controls'), draft.layout, draft.kind);
    var result = await M.render(draft, n, 1.5);
    if (ticket !== paint || !data || !$('an-stage-canvas')) return;
    var canvas = result.canvas; canvas.id = 'an-stage-canvas'; canvas.setAttribute('aria-label', 'Live-Vorschau des Angebotsflyers');
    $('an-stage-canvas').replaceWith(canvas);
    $('an-preview-info').textContent = result.errors.length ? result.errors.join(' ') : 'Individuelles A4-Layout · ' + (data.layout.mode === 'free' ? 'freie Gestaltung' : 'Vorlagenmodus');
    $('an-preview-info').classList.toggle('an-error', result.errors.length > 0);
    $('an-page-label').textContent = 'Seite ' + (page + 1) + ' / ' + data.layout.pages.length;
    $('an-page-prev').disabled = page === 0; $('an-page-next').disabled = page >= data.layout.pages.length - 1;
    $('an-stage').hidden = previewMode !== 'paper';
    $('an-other-preview').hidden = previewMode === 'paper';
    $('an-page-tools').hidden = previewMode !== 'paper';
    $('an-preview-hint').textContent = previewMode === 'paper' ? 'Zum Auswählen auf ein Element tippen' : 'Ausgabevorschau · keine Änderung deiner Gestaltung';
    if (previewMode !== 'paper') {
      var host = $('an-other-preview');
      if (!draft.items.length) host.innerHTML = '<p class="an-status">Füge einen Artikel hinzu, um diese Ausgabe anzusehen.</p>';
      else if (previewMode === 'cards') host.innerHTML = D.cards(draft);
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
      + '</span><div class="an-actions"><button id="an-overview">Zur Übersicht</button><button id="an-save" class="an-primary">Entwurf speichern</button></div></div>'
      + '<div class="an-layout"><section class="an-card"><nav class="an-tabs" aria-label="Bearbeitung"><button data-step="articles">1 · Artikel</button><button data-step="design">2 · Gestalten</button><button data-step="output">3 · Ausgeben</button></nav>'
      + '<section id="an-step-articles"><h2>Was kommt ins Angebot?</h2><div id="an-items"></div><div class="an-actions"><button id="an-add-manual">+ Eigener Artikel</button>'
      + (data.kind === 'drinks' ? '<button id="an-add-catalog">Aus Getränkekatalog wählen</button>' : '') + '</div><p class="an-note">Angebotspreise sind Verkaufspreise inklusive MwSt., ohne Pfand. Katalog-/Einkaufspreise werden nicht übernommen.</p>'
      + '<button data-step="design" class="an-primary">Weiter · Gestalten</button></section>'
      + '<section id="an-step-design" hidden><h2>Dein Stil. Frei gestaltbar.</h2><label class="an-field"><span>Überschrift</span><input id="an-title" data-action-prop="title" maxlength="120" value="' + M.esc(data.title) + '"></label>'
      + '<div class="an-fields"><label class="an-field"><span>Gültig ab</span><input type="date" data-action-prop="valid_from" value="' + data.valid_from + '"></label><label class="an-field"><span>Gültig bis</span><input type="date" data-action-prop="valid_to" value="' + data.valid_to + '"></label></div>'
      + '<section><h3>Vorlage und globale Gestaltung</h3><div id="an-style-controls">' + D.controls(data.layout) + '</div>'
      + '<p class="an-note">Im freien Modus bleiben Elementpositionen erhalten. Eine Vorlage oder neue Standards werden erst nach deiner Bestätigung erneut angewendet.</p>'
      + '<div class="an-actions"><button id="an-template">Vorlage neu anwenden</button><button id="an-defaults">Aktuelle Designstandards übernehmen</button></div></section>'
      + '<div id="an-inspector" class="an-inspector"></div><div class="an-actions"><button id="an-add-page">+ Seite</button><button id="an-remove-page">Seite entfernen</button></div>'
      + '<div class="an-actions"><button data-step="output" class="an-primary">Weiter · Ausgeben</button></div></section>'
      + '<section id="an-step-output" hidden><h2>Einmal gestalten. Überall zeigen.</h2><p>Speichern, Veröffentlichen, Drucken und Waagenversand sind getrennte Aktionen.</p>'
      + '<p class="an-status" id="an-output-status">' + (record && record.published_revision ? 'Eine veröffentlichte Fassung ist vorhanden. Änderungen bleiben bis zur nächsten Freigabe intern.' : 'Noch nicht veröffentlicht.') + '</p>'
      + '<div class="an-publish-actions"><button id="an-publish" class="an-primary">Für Homepage veröffentlichen</button><button id="an-print-action">A4 drucken / als PDF speichern</button><button id="an-scale">Für Waage vorbereiten</button></div>'
      + '<p class="an-note">Freigabe gilt im gewählten Zeitraum (Europe/Berlin). Die Waage wird nur nach eigenem Versand aktualisiert. Ist die Brücke offline, kann sie Änderungen und Ablauf erst nach Wiederverbindung übernehmen.</p></section></section>'
      + '<section class="an-preview"><div class="an-preview-head"><h2>Live-Vorschau</h2><span class="an-muted" id="an-preview-hint">Zum Auswählen auf ein Element tippen</span></div>'
      + D.previewTabs(previewMode, 'data-editor-mode') + '<div id="an-other-preview" hidden></div>'
      + '<div class="an-stage" id="an-stage"><canvas id="an-stage-canvas"></canvas><div class="an-hit-layer" id="an-hit-layer"></div></div>'
      + '<p class="an-stage-info" id="an-preview-info" role="status"></p><div class="an-actions an-spread" id="an-page-tools"><button id="an-page-prev" aria-label="Vorherige Flyerseite">←</button><span id="an-page-label"></span><button id="an-page-next" aria-label="Nächste Flyerseite">→</button></div></section></div>';
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
    });
    renderItems(); renderInspector();
  }
  async function upload(file) {
    if (!file) return '';
    var response = await M.request('/api/angebote-bilder', { method: 'POST', headers: { 'Content-Type': file.type || 'application/octet-stream' }, body: file });
    return response.image_id;
  }
  async function picker() {
    var response = await M.request('/api/getraenke-artikel');
    var catalog = (response.artikel || []).filter(function (a) { return a.aktiv !== false; });
    var dlg = document.createElement('dialog'); dlg.className = 'an-dialog';
    dlg.innerHTML = '<button class="an-close" aria-label="Artikelauswahl schließen">×</button><h2>Getränk auswählen</h2><p>Nur Artikelangaben, keine Einkaufspreise. Verkaufspreis bitte selbst eintragen.</p>'
      + '<label class="an-field"><span>Getränke suchen</span><input type="search" autofocus></label><div class="an-picker-results"></div>';
    function close() { dlg.close(); dlg.remove(); }
    function results() {
      var q = dlg.querySelector('input').value.toLocaleLowerCase('de');
      dlg.querySelector('.an-picker-results').innerHTML = catalog.filter(function (a) { return (a.name + ' ' + (a.nummer || '')).toLocaleLowerCase('de').includes(q); }).map(function (a) {
        return '<button data-catalog-index="' + catalog.indexOf(a) + '"><span><strong>' + M.esc(a.name) + '</strong><br><small>' + M.esc(a.gebinde || '') + ' · ' + M.esc(a.nummer || 'ohne Artikelnummer') + '</small></span><span>+ Wählen</span></button>';
      }).join('') || '<p>Kein Artikel gefunden. Du kannst einen eigenen Artikel erfassen.</p>';
    }
    dlg.querySelector('.an-close').onclick = close; dlg.addEventListener('cancel', function (e) { e.preventDefault(); close(); });
    dlg.querySelector('input').oninput = results;
    dlg.addEventListener('click', function (e) {
      var b = e.target.closest('[data-catalog-index]'); if (!b) return;
      var source = catalog[Number(b.dataset.catalogIndex)], it = M.item(), match = /^(\d+)\s*[x×]\s*(\d+(?:[,.]\d+)?)\s*l?$/i.exec(source.gebinde || '');
      it.name = source.name || ''; it.article_number = String(source.nummer || '');
      if (match) { it.units = Number(match[1]); it.volume_ml = Math.round(Number(match[2].replace(',', '.')) * 1000); }
      if (Number.isFinite(source.pfand) && source.pfand > 0) it.deposit_cents = Math.round(source.pfand * 100);
      close(); addItem(it);
    });
    document.body.appendChild(dlg); results(); dlg.showModal();
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
  async function print() {
    var canvases = await M.preflight(data);
    var container = $('an-print');
    if (!container) { container = document.createElement('div'); container.id = 'an-print'; document.body.appendChild(container); }
    container.replaceChildren();
    canvases.forEach(function (canvas) {
      var div = document.createElement('div'); div.className = 'an-print-page';
      var image = document.createElement('img'); image.src = canvas.toDataURL('image/png'); image.alt = data.title; div.appendChild(image); container.appendChild(div);
    });
    await Promise.all(Array.from(container.querySelectorAll('img'), function (img) { return img.decode(); }));
    document.body.classList.add('an-printing'); window.print();
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
    edit(function () { e.x = Math.max(0, Math.min(M.W - e.w, e.x + dx)); e.y = Math.max(0, Math.min(M.H - e.h, e.y + dy)); }, true);
    renderInspector();
  }
  function bind() {
    $('an-overview').onclick = function () { run(overview); };
    $('an-save').onclick = function () { run(save); };
    $('an-add-manual').onclick = function () { addItem(M.item()); };
    if ($('an-add-catalog')) $('an-add-catalog').onclick = function () { run(picker); };
    $('an-page-prev').onclick = function () { page--; selected = ''; renderInspector(); preview().catch(M.error); };
    $('an-page-next').onclick = function () { page++; selected = ''; renderInspector(); preview().catch(M.error); };
    $('an-publish').onclick = function () { run(publish); }; $('an-print-action').onclick = function () { run(print); }; $('an-scale').onclick = function () { run(scale); };
    root.onclick = async function (event) {
      var b = event.target.closest('button');
      if (!b || b.disabled || busy) return;
      if (b.dataset.editorMode) {
        previewMode = b.dataset.editorMode; D.selectPreview(root, previewMode, 'data-editor-mode');
        preview().catch(M.error); return;
      }
      if (b.dataset.step) setStep(b.dataset.step);
      if (b.dataset.select) { selected = b.dataset.select; setStep('design'); overlay(); }
      if (b.dataset.remove) {
        edit(function () { data.items = data.items.filter(function (it) { return it.id !== b.dataset.remove; });
          data.layout.pages.forEach(function (p) { p.elements = p.elements.filter(function (e) { return e.item_id !== b.dataset.remove; }); });
          if (data.layout.mode === 'template') M.applyTemplate(data); page = Math.min(page, data.layout.pages.length - 1);
        });
        renderItems(); renderInspector();
      }
      if (b.dataset.up || b.dataset.highlight) {
        edit(function () {
          var i = data.items.findIndex(function (it) { return it.id === (b.dataset.up || b.dataset.highlight); });
          if (b.dataset.up && i > 0) { var old = data.items[i - 1]; data.items[i - 1] = data.items[i]; data.items[i] = old; }
          if (b.dataset.highlight) data.items[i].highlight = !data.items[i].highlight;
          if (data.layout.mode === 'template') M.applyTemplate(data);
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
          if (action === 'copy') { var copy = M.clone(e); copy.id = M.uid(); copy.x = Math.min(M.W - copy.w, e.x + 12); copy.y = Math.min(M.H - copy.h, e.y + 12); elements().push(copy); selected = copy.id; }
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
          edit(function () { data.layout = M.clone(layout); M.applyTemplate(data); page = 0; selected = ''; });
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
    };
    root.onchange = function (event) {
      var target = event.target;
      if (target.dataset.imageItem) {
        run(async function () { var id = await upload(target.files[0]); if (id) { edit(function () { data.items.find(function (it) { return it.id === target.dataset.imageItem; }).image_id = id; }); renderItems(); } }); return;
      }
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
      if (target.dataset.actionProp) edit(function () { data[target.dataset.actionProp] = target.value; });
      if (target.dataset.style) {
        edit(function () { D.change(data.layout, target); if (data.layout.mode === 'template') M.applyTemplate(data); });
      }
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
      var e = selection(), rect = $('an-stage').getBoundingClientRect(), startX = event.clientX, startY = event.clientY, x = e.x, y = e.y, moved = false;
      function drag(ev) {
        if (!moved && Math.abs(ev.clientX - startX) + Math.abs(ev.clientY - startY) < 5) return;
        if (!moved) { checkpoint(); moved = true; }
        e.x = Math.max(0, Math.min(M.W - e.w, x + (ev.clientX - startX) * M.W / rect.width));
        e.y = Math.max(0, Math.min(M.H - e.h, y + (ev.clientY - startY) * M.H / rect.height));
        hit.style.left = e.x / M.W * 100 + '%'; hit.style.top = e.y / M.H * 100 + '%';
        data.layout.mode = 'free'; changed();
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
    edit(function () { var e = M.el(type, 80, 250, type === 'image' ? 200 : 300, type === 'image' ? 220 : 80,
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
