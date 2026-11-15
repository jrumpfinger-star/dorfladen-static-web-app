window.AngeboteDesign = (function () {
  'use strict';
  var M = window.AngeboteModel;
  var controlId = 0;
  var choicePaint = new WeakMap();
  var choiceState = new WeakMap(), previewDialog = null;
  var elementLabels = { image: 'Produktbild', logo: 'Dorfladen-Logo', shape: 'Fläche', text: 'Eigener Text',
    brand: 'Marke', title: 'Überschrift', period: 'Zeitraum', footer: 'Fußzeile', name: 'Artikelname',
    description: 'Beschreibung', pack: 'Gebinde', price: 'Preis', old_price: 'Stattpreis',
    discount: 'Ersparnismarker', deposit: 'Pfand', base: 'Literpreis' };
  var modes = [['paper', 'A4 / PDF'], ['cards', 'Handy / Kiosk'], ['scale-large', 'Waage · 800 × 462'], ['scale-small', 'Waage · 800 × 280']];
  var markerTypes = [['starburst', 'Stern (Zacken)'], ['badge', 'Kreis'], ['pill', 'Kapsel'], ['flag', 'Fahne'],
    ['hexburst', 'Sechszack'], ['diamond', 'Raute'], ['shield', 'Schild'], ['ribbon', 'Band'], ['explosion', 'Explosion'], ['heart', 'Herz']];
  var markerPalettes = [['harmonie', 'Harmonie Grün'], ['classic-red', 'Klassisch Rot'], ['warm-copper', 'Warmes Kupfer'],
    ['berry-purple', 'Beere Violett'], ['ocean-blue', 'Ozean Blau'], ['sunset-orange', 'Sonnenuntergang Orange'],
    ['fresh-lime', 'Frische Limette'], ['deep-rose', 'Dunkle Rose'], ['midnight-gold', 'Mitternacht Gold'], ['arctic-teal', 'Arktis Türkis']];
  var definitions = [
    ['template', 'Vorlage als Startpunkt', M.templateOptions],
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
    ['image_scale', 'Produktbild · Größe in Prozent', 'number', 20, 200],
    ['marker_type', 'Ersparnis-Marker Typ', markerTypes],
    ['marker_palette', 'Ersparnis-Farbwelt', markerPalettes],
    ['marker_scale', 'Ersparnis-Marker Größe %', 'number', 80, 180]
  ];
  function controls(layout) {
    if (layout.cms) {
      var cfg = layout.cms.config;
      return '<p class="an-note">Originale CMS-Wochenvorlagen · gespeicherte Einstellungen dieser Aktion. Kein Getränkelayout.</p>'
        + '<div class="an-fields">' + ['plakat', 'flyer'].map(function (kind) {
          var label = kind === 'plakat' ? 'Sammelflyer / Kachel' : 'Einzelflyer / Waage';
          return '<label class="an-field"><span>' + label + ' · Originalvorlage</span><select data-cms-config="' + kind + 'Template">'
            + M.templateOptions.slice(2).map(function (option) { return '<option value="' + option[0] + '"' + (cfg[kind + 'Template'] === option[0] ? ' selected' : '') + '>' + option[1] + '</option>'; }).join('')
            + '</select></label>'
            + [['decoBgColor', 'Hintergrund'], ['decoTitleColor', 'Überschrift']].map(function (field) {
              return '<label class="an-field"><span>' + label + ' · ' + field[1] + '</span><input type="color" data-cms-config="' + kind + '_' + field[0] + '" value="' + M.esc(cfg[kind + '_' + field[0]]) + '"></label>';
            }).join('')
            + '<label class="an-field"><span>' + label + ' · Preisschildform</span><select data-cms-config="' + kind + '_tagShape">'
            + ['rect', 'rounded', 'circle', 'pill', 'banner', 'star', 'hexagon', 'diamond', 'ticket', 'explosion', 'trapez'].map(function (shape, n) {
              var labels = ['Rechteck', 'Abgerundet', 'Kreis', 'Kapsel', 'Banner', 'Stern', 'Sechseck', 'Raute', 'Ticket', 'Zacken', 'Trapez'];
              return '<option value="' + shape + '"' + (cfg[kind + '_tagShape'] === shape ? ' selected' : '') + '>' + labels[n] + '</option>';
            }).join('') + '</select></label>';
        }).join('') + [['priceFontPlakat', 'Preisgröße Sammelflyer', 14, 100], ['priceFontFlyer', 'Preisgröße Einzelflyer', 14, 160],
          ['imgRotation', 'Bilddrehung', -180, 180], ['plakat_imgScale', 'Bildgröße Sammelflyer %', 20, 200],
          ['flyer_imgScale', 'Bildgröße Einzelflyer %', 20, 200]].map(function (field) {
          return '<label class="an-field"><span>' + field[1] + '</span><input type="number" data-cms-config="' + field[0] + '" min="' + field[2] + '" max="' + field[3] + '" value="' + cfg[field[0]] + '"></label>';
        }).join('') + '</div><fieldset class="an-choice-group"><legend>Ersparnis-Marker</legend><div class="an-fields">'
        + [['savingsMarkerType', 'Ersparnis-Marker Typ', markerTypes], ['savingsPalette', 'Ersparnis-Farbwelt', markerPalettes]].map(function (field) {
          return '<label class="an-field"><span>' + field[1] + '</span><select data-cms-config="' + field[0] + '">' + field[2].map(function (option) {
            return '<option value="' + option[0] + '"' + (cfg[field[0]] === option[0] ? ' selected' : '') + '>' + option[1] + '</option>';
          }).join('') + '</select></label>';
        }).join('') + [['savingsScalePlakat', 'Markergröße Plakat %'], ['savingsScaleFlyer', 'Markergröße Einzelflyer %']].map(function (field) {
          return '<label class="an-field"><span>' + field[1] + '</span><input type="number" min="80" max="180" data-cms-config="' + field[0] + '" value="' + cfg[field[0]] + '"></label>';
        }).join('') + '</div></fieldset>';
    }
    var id = ++controlId;
    function choices(key, title, options) {
      var isTemplate = key === 'template';
      return '<fieldset class="an-choice-group"><legend>' + title + '</legend>'
        + (isTemplate ? '<details class="an-template-picker"><summary><span class="an-template-current" data-current-template="' + M.esc(layout.template) + '"></span><span><strong data-template-label>'
          + M.esc(M.templateStyle(layout.template).label) + '</strong><small>' + options.length + ' Designvorlagen · Auswahl öffnen</small></span></summary>' : '')
        + '<div class="an-choices' + (isTemplate ? ' an-template-gallery' : '') + '">'
        + options.map(function (option) {
          return (isTemplate ? '<div class="an-choice-option">' : '') + '<label class="an-choice"><input type="radio" name="an-' + key + '-' + id + '" data-style="' + key
            + '" value="' + option[0] + '"' + (String(layout[key]) === option[0] ? ' checked' : '') + '>'
            + '<span class="an-choice-body">' + (key === 'template' ? '<span class="an-choice-picture" data-template-preview="' + option[0] + '"></span>' : '')
            + '<strong>' + option[1] + '</strong><span class="an-choice-active">✓ Aktiv</span></span></label>'
            + (isTemplate ? '<button type="button" class="an-template-enlarge" data-template-enlarge="' + option[0]
              + '" aria-label="' + M.esc(option[1]) + ' vergrößern">Vergrößern</button></div>' : '');
        }).join('') + '</div>' + (isTemplate ? '</details>' : '') + '</fieldset>';
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
    return choices('template', '1 · Stil wählen', M.templateOptions)
      + choices('density', '2 · Artikel pro Seite', [['4', '4 · großzügig'], ['6', '6 · kompakt']])
      + '<h3 class="an-settings-heading">3 · Farben und Schrift</h3>' + fields(false)
      + '<details class="an-fine"><summary>Feinabstimmung · Größen und Drehung</summary>' + fields(true) + '</details>';
  }
  async function previewChoices(host, layout, kind) {
    if (!choiceState.has(host)) {
      function open(event) {
        var button = event.target.closest('[data-template-enlarge]');
        if (event.type === 'dblclick' && !button) {
          var choice = event.target.closest('.an-choice-option');
          button = choice && choice.querySelector('[data-template-enlarge]');
        }
        if (!button) return;
        event.preventDefault(); event.stopPropagation();
        var state = choiceState.get(host);
        enlarge(state.layout, state.kind, button.dataset.templateEnlarge, button).catch(M.error);
      }
      host.addEventListener('click', open); host.addEventListener('dblclick', open);
    }
    choiceState.set(host, { layout: M.clone(layout), kind: kind });
    var ticket = (choicePaint.get(host) || 0) + 1; choicePaint.set(host, ticket);
    host.querySelectorAll('[data-style]').forEach(function (control) {
      var value = layout[control.dataset.style];
      if (value == null) return;
      if (control.type === 'radio') control.checked = control.value === String(value);
      else control.value = value;
    });
    var current = host.querySelector('[data-current-template]'), label = host.querySelector('[data-template-label]');
    if (current) current.dataset.currentTemplate = layout.template;
    if (label) label.textContent = M.templateStyle(layout.template).label;
    var targets = Array.from(host.querySelectorAll('[data-template-preview], [data-current-template]'));
    await Promise.all(targets.map(async function (target) {
      var style = M.clone(layout), id = target.dataset.templatePreview || target.dataset.currentTemplate;
      if (id !== layout.template) M.useTemplate(style, id);
      var result = await M.render(sample(style, kind), 0, .25);
      result.canvas.setAttribute('aria-label', 'Stilvorschau ' + M.templateStyle(style.template).label);
      if (target.isConnected && choicePaint.get(host) === ticket) target.replaceChildren(result.canvas);
    }));
  }
  async function enlarge(layout, kind, id, opener) {
    if (previewDialog) previewDialog();
    var style = M.clone(layout);
    if (id !== style.template) M.useTemplate(style, id);
    var dlg = document.createElement('dialog'); dlg.className = 'an-viewer';
    dlg.setAttribute('aria-label', 'Vorlagenvorschau · ' + M.templateStyle(id).label);
    dlg.innerHTML = '<div class="an-viewer-shell"><div class="an-viewer-tools"><strong></strong><button type="button" data-template-close>Schließen</button></div>'
      + '<div class="an-viewer-tools"><button type="button" data-template-minus aria-label="Vorschau verkleinern">−</button><button type="button" data-template-fit>Einpassen</button>'
      + '<button type="button" data-template-actual>100 %</button><button type="button" data-template-plus aria-label="Vorschau vergrößern">+</button><output aria-live="polite"></output></div>'
      + '<div class="an-viewer-scroll" tabindex="0" aria-label="Vergrößerte Vorlage, verschiebbar"><p role="status">Vorschau wird geladen …</p><div class="an-viewer-page"></div></div></div>';
    dlg.querySelector('strong').textContent = M.templateStyle(id).label + ' · Beispielvorschau';
    var scroller = dlg.querySelector('.an-viewer-scroll'), page = dlg.querySelector('.an-viewer-page');
    var canvas = null, zoom = null, closed = false, previousOverflow = document.documentElement.style.overflow;
    function fit() {
      if (!canvas) return;
      var factor = zoom == null ? Math.min(1, Math.max(100, scroller.clientWidth - 4) / M.W) : zoom;
      page.style.width = M.W * factor + 'px'; page.style.height = M.H * factor + 'px';
      canvas.style.width = M.W + 'px'; canvas.style.height = M.H + 'px'; canvas.style.transform = 'scale(' + factor + ')';
      dlg.querySelector('output').textContent = Math.round(factor * 100) + ' %';
    }
    var observer = new ResizeObserver(fit);
    function close() {
      if (closed) return; closed = true; observer.disconnect();
      dlg.close(); dlg.remove(); document.documentElement.style.overflow = previousOverflow;
      previewDialog = null; if (opener.isConnected) opener.focus();
    }
    dlg.addEventListener('close', close);
    dlg.addEventListener('cancel', function (e) { e.preventDefault(); close(); });
    dlg.addEventListener('click', function (e) {
      if (e.target.closest('[data-template-close]')) { close(); return; }
      if (e.target.closest('[data-template-fit]')) { zoom = null; scroller.scrollLeft = 0; scroller.scrollTop = 0; }
      if (e.target.closest('[data-template-actual]')) zoom = 1;
      if (e.target.closest('[data-template-plus],[data-template-minus]')) {
        var current = zoom == null ? Math.min(1, Math.max(100, scroller.clientWidth - 4) / M.W) : zoom;
        zoom = Math.max(.25, Math.min(3, current + (e.target.closest('[data-template-plus]') ? .25 : -.25)));
      }
      fit();
    });
    document.body.appendChild(dlg); document.documentElement.style.overflow = 'hidden';
    dlg.showModal(); observer.observe(scroller); previewDialog = close;
    try {
      var rendered = await M.render(sample(style, kind), 0, 2);
      if (closed) return;
      if (rendered.errors.length) throw M.problem(rendered.errors[0]);
      canvas = rendered.canvas; canvas.setAttribute('aria-label', 'Große Stilvorschau ' + M.templateStyle(id).label);
      scroller.querySelector('[role=status]').remove(); page.replaceChildren(canvas); fit();
    } catch (error) { close(); throw error; }
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
    if (key === 'template') {
      M.useTemplate(layout, target.value);
    } else layout[key] = target.type === 'number' || key === 'density' ? Number(target.value) : target.value;
    return true;
  }
  function sample(layout, kind) {
    var d = M.blank(kind, layout); d.title = kind === 'drinks' ? 'Getränkeangebote · Designvorschau' : 'Wochenangebote · Designvorschau';
    for (var n = 0; n < layout.density; n++) {
      var it = M.item(); Object.assign(it, { name: (kind === 'drinks' ? 'Getränk' : 'Artikel') + ' – Beispiel ' + (n + 1),
        price_cents: 1249, old_price_cents: 1499, units: 20, volume_ml: 500, packaging: 'Mehrweg', deposit_cents: 310 });
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
      var result = await M.request('/api/angebote-verwaltung?view=design'), design = result.design, kind = 'drinks', mode = 'paper', ticket = 0, surface = null;
      function html() {
        root.innerHTML = '<div class="an-note">Speichern ersetzt den bisherigen Startstandard für neue Getränkeaktionen – nicht die eingebauten Vorlagen. Bestehende Flyer und veröffentlichte Angebote bleiben unverändert.</div>'
          + '<div class="an-design-layout"><section class="an-card"><h2>Getränkeflyer-Design</h2>'
          + '<p>Standards für Getränkeangebote. Wochenangebote verwenden die gespeicherten Originalvorlagen aus dem <a href="/cms.html?tab=cfg">CMS-Wochenangebotsdesign</a>.</p>'
          + '<div data-design-fields>' + controls(design[kind]) + '</div>'
          + '<div class="an-actions"><button type="button" class="an-primary" data-design-save>Designstandards speichern</button>'
          + '<button type="button" data-design-reset>Vorlage auf Original zurücksetzen</button>'
          + '<button type="button" data-design-copy>Bisherige Flyer-Farben übernehmen</button></div><p data-design-status role="status"></p></section>'
          + '<section class="an-preview"><div class="an-preview-head"><h2>Live-Vorschau · Beispieldaten</h2>'
          + '</div>' + previewTabs(mode, 'data-design-mode')
          + '<div data-design-preview></div></section></div>';
        preview().catch(M.error);
      }
      async function preview() {
        var current = ++ticket, data = sample(design[kind], kind), host = root.querySelector('[data-design-preview]');
        await previewChoices(root, design[kind], kind);
        if (current !== ticket) return;
        var target = mode === 'paper' ? 'sheet' : mode === 'cards' ? 'card' : 'scale';
        var source = target === 'sheet' ? data.layout.pages[0] : data.layout.targets[target][0];
        var rendered = target === 'sheet' ? await M.render(data, 0, 1) : await M.renderTarget(data, target, data.items[0].id, 1);
        if (current !== ticket) return;
        if (!surface) {
          surface = window.AngeboteVorschauEditor.mount(host, {
            change: function (element, delta) {
              if (delta.dx) delta.dx /= element.unitScale;
              if (delta.dy) delta.dy /= element.unitScale;
              M.updateAdjustment(design[kind], element.id, delta);
              root.querySelector('[data-design-status]').textContent = 'Geändert · noch nicht gespeichert';
              preview().catch(M.error);
            }
          });
        }
        var canvas = rendered.canvas, width = canvas.width, height = canvas.height, ratio = 1, offsetX = 0, offsetY = 0;
        if (mode === 'scale-small') {
          var fitted = document.createElement('canvas'); fitted.width = 800; fitted.height = 280;
          var ctx = fitted.getContext('2d'); ctx.fillStyle = data.layout.background; ctx.fillRect(0, 0, 800, 280);
          ratio = Math.min(800 / width, 280 / height); offsetX = (800 - width * ratio) / 2; offsetY = (280 - height * ratio) / 2;
          ctx.drawImage(canvas, offsetX, offsetY, width * ratio, height * ratio); canvas = fitted; width = 800; height = 280;
        }
        canvas.setAttribute('aria-label', 'Live-Vorschau der Designstandards');
        surface.update(canvas, source.elements.filter(function (element) { return !element.hidden; }).map(function (element) {
          return { id: M.adjustmentKey(data, target, element, source.elements), type: element.type, label: elementLabels[element.type] + (element.item_id ? ' · ' + (data.items.findIndex(function (it) { return it.id === element.item_id; }) + 1) : ''),
            x: element.x * ratio + offsetX, y: element.y * ratio + offsetY, w: element.w * ratio, h: element.h * ratio, rotation: element.rotation, unitScale: ratio };
        }), width, height);
      }
      root.addEventListener('change', function (e) {
        if (change(design[kind], e.target)) preview().catch(M.error);
        if (e.target.dataset.style) root.querySelector('[data-design-status]').textContent = 'Geändert · noch nicht gespeichert';
      });
      root.addEventListener('click', async function (e) {
        var tab = e.target.closest('[data-design-mode]');
        if (tab) { mode = tab.dataset.designMode; selectPreview(root, mode, 'data-design-mode'); preview().catch(M.error); return; }
        if (e.target.closest('[data-design-reset]')) {
          if (!(await M.dialog('Vorlage auf Original zurücksetzen?', 'Farben, Größen, Ersparnismarker und freie Anpassungen werden in der Vorschau auf die Originalwerte der ausgewählten Vorlage zurückgesetzt. Erst „Designstandards speichern“ übernimmt dies als Startstandard für neue Aktionen. Bestehende Flyer bleiben erhalten.', 'Vorschau zurücksetzen'))) return;
          var reset = M.blank(kind).layout; M.useTemplate(reset, design[kind].template);
          design[kind] = reset; root.querySelector('[data-design-fields]').innerHTML = controls(reset);
          root.querySelector('[data-design-status]').textContent = 'Originalwerte in der Vorschau · noch nicht gespeichert';
          try { await preview(); } catch (error) { await M.error(error); }
          return;
        }
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
