window.AngeboteDesign = (function () {
  'use strict';
  var M = window.AngeboteModel;
  var controlId = 0;
  var choicePaint = new WeakMap();
  var modes = [['paper', 'A4 / PDF'], ['cards', 'Handy / Kiosk'], ['scale-large', 'Waage · 800 × 462'], ['scale-small', 'Waage · 800 × 280']];
  var definitions = [
    ['template', 'Vorlage als Startpunkt', [['land', 'Landladen'], ['classic', 'Klassisch']]],
    ['density', 'Artikel je Vorlagenseite', [['4', '4 · großzügig'], ['6', '6 · kompakt']]],
    ['font', 'Schrift', ['Arial', 'Georgia', 'Verdana', 'Trebuchet MS']],
    ['price_shape', 'Preis-Hintergrundform', [['rect', 'Rechteck'], ['round', 'Abgerundet'], ['ellipse', 'Oval']]],
    ['color', 'Angebots-/Preisfarbe', 'color'], ['background', 'Flyer-Hintergrund', 'color'],
    ['title_color', 'Markenfarbe', 'color'], ['text_color', 'Textfarbe', 'color'],
    ['card_background', 'Karten-Hintergrund', 'color'], ['price_background', 'Preis-Hintergrund', 'color'],
    ['name_size', 'Artikelname · Schriftgröße', 'number', 14, 100],
    ['price_size', 'Preis · Schriftgröße', 'number', 14, 100],
    ['details_size', 'Gebinde / Pfand / Literpreis · Schriftgröße', 'number', 14, 100],
    ['image_rotation', 'Produktbild · Drehung in Grad', 'number', -180, 180],
    ['image_scale', 'Produktbild · Größe in Prozent', 'number', 20, 200]
  ];
  function controls(layout) {
    var id = ++controlId;
    function choices(key, title, options) {
      return '<fieldset class="an-choice-group"><legend>' + title + '</legend><div class="an-choices">'
        + options.map(function (option) {
          return '<label class="an-choice"><input type="radio" name="an-' + key + '-' + id + '" data-style="' + key
            + '" value="' + option[0] + '"' + (String(layout[key]) === option[0] ? ' checked' : '') + '>'
            + '<span class="an-choice-body">' + (key === 'template' ? '<span class="an-choice-picture" data-template-preview="' + option[0] + '"></span>' : '')
            + '<strong>' + option[1] + '</strong><span class="an-choice-active">✓ Aktiv</span></span></label>';
        }).join('') + '</div></fieldset>';
    }
    function fields(advanced) {
      return '<div class="an-fields">' + definitions.filter(function (def) {
        return def[0] !== 'template' && def[0] !== 'density' && (def[2] === 'number') === advanced;
      }).map(function (def) {
        var value = layout[def[0]] == null ? M.theme[def[0]] : layout[def[0]];
        var html = '<label class="an-field"><span>' + def[1] + '</span>';
        if (Array.isArray(def[2])) {
          html += '<select aria-label="' + M.esc(def[1]) + '" data-style="' + def[0] + '">' + def[2].map(function (option) {
            var key = Array.isArray(option) ? option[0] : option, label = Array.isArray(option) ? option[1] : option;
            return '<option value="' + M.esc(key) + '"' + (String(value) === key ? ' selected' : '') + '>' + M.esc(label) + '</option>';
          }).join('') + '</select>';
        } else {
          html += '<input data-style="' + def[0] + '" type="' + def[2] + '" value="' + M.esc(value) + '"'
            + (def[2] === 'number' ? ' min="' + def[3] + '" max="' + def[4] + '"' : '') + '>';
        }
        return html + '</label>';
      }).join('') + '</div>';
    }
    return choices('template', '1 · Stil wählen', [['land', 'Landladen'], ['classic', 'Klassisch']])
      + choices('density', '2 · Artikel pro Seite', [['4', '4 · großzügig'], ['6', '6 · kompakt']])
      + '<h3 class="an-settings-heading">3 · Farben und Schrift</h3>' + fields(false)
      + '<details class="an-fine"><summary>Feinabstimmung · Größen und Drehung</summary>' + fields(true) + '</details>';
  }
  async function previewChoices(host, layout, kind) {
    var ticket = (choicePaint.get(host) || 0) + 1; choicePaint.set(host, ticket);
    var targets = Array.from(host.querySelectorAll('[data-template-preview]'));
    await Promise.all(targets.map(async function (target) {
      var style = M.clone(layout); style.template = target.dataset.templatePreview;
      if (style.template !== layout.template) style.background = style.template === 'classic' ? '#ffffff' : '#fffdf6';
      var result = await M.render(sample(style, kind), 0, .25);
      result.canvas.setAttribute('aria-label', 'Stilvorschau ' + (style.template === 'classic' ? 'Klassisch' : 'Landladen'));
      if (target.isConnected && choicePaint.get(host) === ticket) target.replaceChildren(result.canvas);
    }));
  }
  function previewTabs(mode, attribute) {
    return '<nav class="an-tabs an-preview-tabs" aria-label="Ausgabevorschau">' + modes.map(function (option) {
      return '<button type="button" ' + attribute + '="' + option[0] + '" aria-pressed="' + (mode === option[0]) + '">' + option[1] + '</button>';
    }).join('') + '</nav>';
  }
  function selectPreview(host, mode, attribute) {
    host.querySelectorAll('[' + attribute + ']').forEach(function (button) { button.setAttribute('aria-pressed', String(button.getAttribute(attribute) === mode)); });
  }
  async function outputPreview(data, mode, page) {
    if (mode === 'cards') return null;
    if (mode === 'paper') return (await M.render(data, page || 0, 1)).canvas;
    return (await M.scaleImages(data, 'single', { w: 1600, h: mode === 'scale-large' ? 924 : 560 }))[0];
  }
  function cards(data) {
    return '<div class="an-customer an-card-preview"><div class="an-customer-grid" style="grid-template-columns:1fr!important">'
      + data.items.map(function (item) { return M.cardHTML(data, item); }).join('') + '</div></div>';
  }
  function change(layout, target) {
    var key = target.dataset.style;
    if (!key || !definitions.some(function (d) { return d[0] === key; })) return false;
    layout[key] = target.type === 'number' || key === 'density' ? Number(target.value) : target.value;
    if (key === 'template') {
      layout.background = target.value === 'classic' ? '#ffffff' : '#fffdf6';
    }
    return true;
  }
  function sample(layout, kind) {
    var d = M.blank(kind, layout); d.title = kind === 'drinks' ? 'Getränkeangebote · Designvorschau' : 'Wochenangebote · Designvorschau';
    for (var n = 0; n < layout.density; n++) {
      var it = M.item(); Object.assign(it, { name: (kind === 'drinks' ? 'Getränk' : 'Artikel') + ' – Beispiel ' + (n + 1),
        price_cents: 1249, units: 20, volume_ml: 500, packaging: 'Mehrweg', deposit_cents: 310 });
      d.items.push(it);
    }
    M.applyTemplate(d);
    return d;
  }
  async function mount(root) {
    if (!root || root.dataset.mounted) return;
    root.dataset.mounted = 'true'; root.classList.add('an-design');
    root.innerHTML = '<p role="status">Die Getränkeflyer-Einstellungen werden geladen …</p>';
    try {
      var result = await M.request('/api/angebote-verwaltung?view=design'), design = result.design, kind = 'drinks', mode = 'paper', ticket = 0;
      function html() {
        root.innerHTML = '<div class="an-note">Standards für neue Aktionen. Bestehende individuelle Flyer und veröffentlichte Angebote bleiben unverändert.</div>'
          + '<div class="an-design-layout"><section class="an-card"><h2>Getränkeflyer-Design</h2>'
          + '<label class="an-field"><span>Standards bearbeiten für</span><select data-design-kind><option value="drinks">Getränkeangebote</option><option value="weekly">Neue Wochenangebote</option></select></label>'
          + '<div data-design-fields>' + controls(design[kind]) + '</div>'
          + '<div class="an-actions"><button type="button" class="an-primary" data-design-save>Designstandards speichern</button>'
          + '<button type="button" data-design-copy>Bisherige Flyer-Farben übernehmen</button></div><p data-design-status role="status"></p></section>'
          + '<section class="an-preview"><div class="an-preview-head"><h2>Live-Vorschau · Beispieldaten</h2>'
          + '</div>' + previewTabs(mode, 'data-design-mode')
          + '<div data-design-preview></div></section></div>';
        root.querySelector('[data-design-kind]').value = kind;
        preview().catch(M.error);
      }
      async function preview() {
        var current = ++ticket, data = sample(design[kind], kind), host = root.querySelector('[data-design-preview]');
        await previewChoices(root, design[kind], kind);
        if (current !== ticket) return;
        if (mode === 'cards') {
          data.items = data.items.slice(0, 1);
          host.innerHTML = cards(data); return;
        }
        var canvas = await outputPreview(data, mode, 0);
        if (current !== ticket) return;
        canvas.style.width = '100%'; canvas.style.height = 'auto'; canvas.setAttribute('aria-label', 'Live-Vorschau der Designstandards');
        host.replaceChildren(canvas);
      }
      root.addEventListener('change', function (e) {
        if (e.target.matches('[data-design-kind]')) { kind = e.target.value; root.querySelector('[data-design-fields]').innerHTML = controls(design[kind]); }
        if (change(design[kind], e.target) || e.target.matches('[data-design-kind]')) preview().catch(M.error);
        if (e.target.dataset.style) root.querySelector('[data-design-status]').textContent = 'Geändert · noch nicht gespeichert';
      });
      root.addEventListener('click', async function (e) {
        var tab = e.target.closest('[data-design-mode]');
        if (tab) { mode = tab.dataset.designMode; selectPreview(root, mode, 'data-design-mode'); preview().catch(M.error); return; }
        var save = e.target.closest('[data-design-save]'), copy = e.target.closest('[data-design-copy]');
        if (!save && !copy) return;
        var button = save || copy; button.disabled = true;
        try {
          if (copy) {
            var old = await M.request('/api/cms-config'), cfg = (old.data || {}).design_config || {};
            if (!Object.keys(cfg).length) throw M.problem('Es sind noch keine bisherigen Flyer-Farbwerte gespeichert.');
            Object.assign(design[kind], { color: cfg.flyer_decoTitleColor || cfg.titleColor || '#bb421e',
              background: cfg.flyer_decoBgColor || cfg.bgColor || '#fffdf6',
              title_color: cfg.flyer_decoLeafColor || cfg.leafColor || '#234c38',
              price_size: Math.max(14, Math.min(100, cfg.priceFontFlyer || 58)),
              image_rotation: cfg.imgRotation || 0 });
            root.querySelector('[data-design-fields]').innerHTML = controls(design[kind]);
            root.querySelector('[data-design-status]').textContent = 'Übernommen · bitte Designstandards speichern';
            await preview();
          } else {
            var saved = await M.request('/api/angebote-verwaltung?view=design', M.json('PUT', { version: design.version, data: design }));
            design = saved.design;
            root.querySelector('[data-design-status]').textContent = 'Designstandards gespeichert. Bestehende Aktionen wurden nicht verändert.';
          }
        } catch (error) { await M.error(error); }
        finally { button.disabled = false; }
      });
      html();
    } catch (e) {
      delete root.dataset.mounted;
      root.innerHTML = '<p class="an-status an-error" role="alert">Die Designstandards konnten nicht geladen werden.</p><button type="button">Erneut versuchen</button>';
      root.querySelector('button').onclick = function () { mount(root); };
      await M.error(e);
    }
  }
  return { mount: mount, controls: controls, change: change, previewChoices: previewChoices,
    previewTabs: previewTabs, selectPreview: selectPreview, outputPreview: outputPreview, cards: cards };
})();
