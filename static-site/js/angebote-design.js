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
    ['price_shape', 'Preis-Hintergrundform', [['rect', 'Rechteck'], ['round', 'Abgerundet'], ['ellipse', 'Oval'],
      ['pill', 'Kapsel'], ['circle', 'Kreis'], ['banner', 'Fahne'], ['star', 'Stern'], ['hexagon', 'Sechseck'],
      ['diamond', 'Raute'], ['ticket', 'Ticket'], ['explosion', 'Zacken'], ['trapez', 'Trapez']]],
    ['color', 'Angebots-/Preisfarbe', 'color'], ['background', 'Flyer-Hintergrund', 'color'],
    ['title_color', 'Markenfarbe', 'color'], ['text_color', 'Textfarbe', 'color'],
    ['card_background', 'Karten-Hintergrund', 'color'], ['price_background', 'Preis-Hintergrund', 'color'],
    ['price_outline_color', 'Preisschild · Konturfarbe', 'color'],
    ['old_price_color', 'Preisschild · Stattpreisfarbe', 'color'],
    ['price_strike_color', 'Preisschild · Durchstreichungsfarbe', 'color'],
    ['name_size', 'Artikelname · Schriftgröße', 'number', 14, 100],
    ['price_size', 'Preis · Schriftgröße', 'number', 14, 100],
    ['details_size', 'Gebinde / Pfand / Literpreis · Schriftgröße', 'number', 14, 100],
    ['image_rotation', 'Produktbild · Drehung in Grad', 'number', -180, 180],
    ['image_scale', 'Produktbild · Größe in Prozent', 'number', 20, 200],
    ['marker_type', 'Ersparnis-Marker Typ', markerTypes],
    ['marker_palette', 'Ersparnis-Farbwelt', markerPalettes],
    ['marker_scale', 'Ersparnis-Marker Größe %', 'number', 80, 180]
  ].concat([
    ['price_preset', 'Preisschild-Farbvorlage', [['', 'Manuell'], ['classic-red-rect', 'Classic Rot'],
      ['green-rounded', 'Naturgrün'], ['dark-pill', 'Dark Elegance'], ['gold-banner', 'Gold Banner'],
      ['blue-circle', 'Ocean Badge'], ['orange-star', 'Sunrise Stern'], ['purple-hexagon', 'Berry Hexagon'],
      ['teal-ticket', 'Teal Coupon'], ['rose-diamond', 'Rosé Diamant'], ['copper-explosion', 'Copper Burst'],
      ['price-image', 'Rot/Gelb']]],
    ['decoration.price_radius', 'Preisschild · Eckenradius', 'number', 0, 40],
    ['decoration.price_skew', 'Preisschild · Neigung %', 'number', 0, 30],
    ['decoration.price_scale', 'Preisschild · Größe %', 'number', 50, 150],
    ['decoration.show_leaf', 'Blatt-Deko anzeigen', 'checkbox'],
    ['decoration.leaf_size', 'Blatt-Größe', 'number', 16, 50],
    ['decoration.leaf_color', 'Blatt-/Taschenfarbe', 'color'],
    ['decoration.show_bag', 'Einkaufstasche anzeigen', 'checkbox'],
    ['decoration.show_texture', 'Papiertextur anzeigen', 'checkbox'],
    ['decoration.border_width', 'Rahmen · Breite', 'number', 0, 20],
    ['decoration.border_color', 'Rahmen · Farbe', 'color'],
    ['decoration.card_border_width', 'Kartenrahmen · Breite', 'number', 0, 20],
    ['decoration.card_border_color', 'Kartenrahmen · Farbe', 'color'],
    ['decoration.details_color', 'Details · Farbe', 'color'],
    ['decoration.footer_color', 'Fußzeile / Zeitraum · Farbe', 'color'],
    ['decoration.vorrat_color', 'Vorratshinweis · Farbe', 'color'],
    ['decoration.background_gradient', 'Flyer-Hintergrund · Verlauf', 'checkbox'],
    ['decoration.background_color2', 'Flyer-Hintergrund · zweite Farbe', 'color'],
    ['decoration.background_direction', 'Flyer-Hintergrund · Richtung', [['to bottom', 'Nach unten'], ['to right', 'Nach rechts'], ['to bottom right', 'Diagonal'], ['135deg', '135°']]],
    ['decoration.background_pct', 'Flyer-Hintergrund · Farbstopp %', 'number', 10, 90],
    ['decoration.image_background', 'Bildhintergrund · Farbe', 'color'],
    ['decoration.image_gradient', 'Bildhintergrund · Verlauf', 'checkbox'],
    ['decoration.image_color2', 'Bildhintergrund · zweite Farbe', 'color'],
    ['decoration.image_direction', 'Bildhintergrund · Richtung', [['to bottom', 'Nach unten'], ['to right', 'Nach rechts'], ['to bottom right', 'Diagonal'], ['135deg', '135°']]],
    ['decoration.image_pct', 'Bildhintergrund · Farbstopp %', 'number', 10, 90],
    ['decoration.image_width_pct', 'Bildbreite %', 'number', 20, 80],
    ['decoration.image_dx', 'Bildposition · rechts/links', 'number', -1000, 1000],
    ['decoration.image_dy', 'Bildposition · unten/oben', 'number', -1500, 1500],
    ['decoration.price_dx', 'Preisposition · rechts/links', 'number', -1000, 1000],
    ['decoration.price_dy', 'Preisposition · unten/oben', 'number', -1500, 1500]
  ]);
  function controls(layout) {
    if (layout.cms) {
      var cfg = layout.cms.config;
      var shapeLabels = [['rect', 'Rechteck'], ['rounded', 'Abgerundet'], ['circle', 'Kreis'], ['pill', 'Kapsel'], ['banner', 'Banner'], ['star', 'Stern'],
        ['hexagon', 'Sechseck'], ['diamond', 'Raute'], ['ticket', 'Ticket'], ['explosion', 'Zacken'], ['trapez', 'Trapez'],
        ['price-image', 'Preisbild · Rot/Gelb']];
      function select(key, title, text, options) {
        return '<label class="an-field"><span>' + text + '</span><select aria-label="' + title + ' · ' + text + '" data-cms-config="' + key + '">'
          + options.map(function (option) { return '<option value="' + option[0] + '"' + (cfg[key] === option[0] ? ' selected' : '') + '>' + option[1] + '</option>'; }).join('')
          + '</select></label>';
      }
      function number(key, text, min, max) {
        return '<label class="an-field"><span>' + text + '</span><input type="number" data-cms-config="' + key + '" min="' + min + '" max="' + max + '" value="' + cfg[key] + '"></label>';
      }
      return '<div data-side-panel="design">'
        + ['plakat', 'flyer'].map(function (kind) {
          var label = kind === 'plakat' ? 'Sammelflyer / Kachel' : 'Einzelflyer / Waage';
          return '<fieldset class="an-compact-group"><legend>' + label + '</legend><div class="an-fields">'
            + select(kind + 'Template', label, 'Originalvorlage', M.cmsTemplateOptions)
            + select(kind + '_tagPreset', label, 'Preisschild-Vorlage', definitions.find(function (def) { return def[0] === 'price_preset'; })[2])
            + select(kind + '_tagShape', label, 'Preisschildform', shapeLabels)
            + select(kind + '_nameFont', label, 'Bezeichnung · Schrift', ['Arial', 'Georgia', 'Verdana', 'Trebuchet MS'].map(function (font) { return [font, font]; }))
            + number(kind + '_nameSize', 'Bezeichnung · Größe (0 = Vorlage)', 0, 100)
            + [['decoBgColor', 'Hintergrund'], ['decoTitleColor', 'Überschrift'], ['nameColor', 'Bezeichnung · Farbe'],
              ['priceImageColor', 'Preisfarbe'], ['priceOutlineColor', 'Konturfarbe'],
              ['priceStripColor', 'Hintergrund / Stattpreis-Streifen'], ['priceOldColor', 'Stattpreisfarbe'],
              ['priceStrikeColor', 'Durchstreichungsfarbe']].map(function (field) {
              return '<label class="an-field"><span>' + field[1] + '</span><input type="color" aria-label="' + label + ' · ' + field[1] + '" data-cms-config="' + kind + '_' + field[0] + '" value="' + M.esc(cfg[kind + '_' + field[0]]) + '"></label>';
            }).join('') + '</div></fieldset>';
        }).join('')
        + '<fieldset class="an-compact-group"><legend>Größen</legend><div class="an-fields an-fields-3">'
        + number('priceFontPlakat', 'Preisgröße Sammelflyer', 14, 100) + number('priceFontFlyer', 'Preisgröße Einzelflyer', 14, 160)
        + number('imgRotation', 'Bilddrehung', -180, 180) + number('plakat_imgScale', 'Bildgröße Sammelflyer %', 20, 200)
        + number('flyer_imgScale', 'Bildgröße Einzelflyer %', 20, 200) + '</div></fieldset></div>'
        + '<fieldset class="an-compact-group" data-side-panel="marker"><legend>Ersparnis-Marker</legend><div class="an-fields">'
        + select('savingsMarkerType', 'Ersparnis-Marker', 'Typ', markerTypes) + select('savingsPalette', 'Ersparnis-Marker', 'Farbwelt', markerPalettes)
        + number('savingsScalePlakat', 'Markergröße Plakat %', 80, 180) + number('savingsScaleFlyer', 'Markergröße Einzelflyer %', 80, 180)
        + '</div></fieldset>';
    }
    var id = ++controlId;
    function choices(key, title, options) {
      var isTemplate = key === 'template';
      return '<fieldset class="an-choice-group' + (key === 'density' ? ' an-density-choice' : '') + '"><legend>' + title + '</legend>'
        + (isTemplate ? '<details class="an-template-picker"><summary><span class="an-template-current" data-current-template="' + M.esc(layout.template) + '"></span><span><strong data-template-label>'
          + M.esc(M.templateStyle(layout.template).label) + '</strong><small>' + options.length + ' Vorlagen</small></span></summary>' : '')
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
      var defs = definitions.filter(function (def) {
        var extra = def[0].indexOf('decoration.') === 0 || def[0] === 'price_preset';
        var marker = def[0].indexOf('marker_') === 0;
        return def[0] !== 'template' && def[0] !== 'density'
          && (advanced === 'extra' ? extra : !extra && (advanced === true ? def[2] === 'number' || marker : def[2] === 'number' === advanced && !marker));
      });
      var order = ['marker_type', 'marker_palette', 'marker_scale', 'name_size', 'price_size', 'details_size', 'image_rotation', 'image_scale'];
      if (advanced === true) defs.sort(function (a, b) {
        var i = order.indexOf(a[0]), j = order.indexOf(b[0]);
        return (i < 0 ? 99 : i) - (j < 0 ? 99 : j);
      });
      var out = [], lastSection = '';
      var extraSections = { price_preset: 'Preisschild', 'decoration.price_radius': 'Preisschild', 'decoration.price_skew': 'Preisschild', 'decoration.price_scale': 'Preisschild', 'decoration.price_dx': 'Preisschild', 'decoration.price_dy': 'Preisschild', 'decoration.show_leaf': 'Deko', 'decoration.leaf_size': 'Deko', 'decoration.show_bag': 'Deko', 'decoration.show_texture': 'Deko', 'decoration.border_width': 'Deko', 'decoration.card_border_width': 'Deko', 'decoration.leaf_color': 'Deko-Farben', 'decoration.border_color': 'Deko-Farben', 'decoration.card_border_color': 'Deko-Farben', 'decoration.details_color': 'Deko-Farben', 'decoration.footer_color': 'Deko-Farben', 'decoration.vorrat_color': 'Deko-Farben', 'decoration.background_gradient': 'Hintergründe', 'decoration.background_color2': 'Hintergründe', 'decoration.background_direction': 'Hintergründe', 'decoration.background_pct': 'Hintergründe', 'decoration.image_background': 'Hintergründe', 'decoration.image_gradient': 'Hintergründe', 'decoration.image_color2': 'Hintergründe', 'decoration.image_direction': 'Hintergründe', 'decoration.image_pct': 'Hintergründe', 'decoration.image_width_pct': 'Hintergründe', 'decoration.image_dx': 'Hintergründe', 'decoration.image_dy': 'Hintergründe' };
      function sectionIndex(def0) { var s = extraSections[def0]; return s === 'Preisschild' ? 0 : s === 'Deko' ? 1 : s === 'Deko-Farben' ? 2 : 3; }
      if (advanced === 'extra') defs.sort(function (a, b) { return sectionIndex(a[0]) - sectionIndex(b[0]); });
      defs.forEach(function (def) {
        var section = advanced === true ? (def[0].indexOf('marker_') === 0 ? 'Ersparnis-Marker' : 'Größen')
          : advanced === 'extra' ? (extraSections[def[0]] || '') : '';
        if (section && section !== lastSection) { out.push({ heading: section }); lastSection = section; }
        out.push({ html: row(def) });
      });
      for (var i = 0; i < out.length; i++) {
        if (out[i].heading && (!out[i + 1] || out[i + 1].heading)) { out.splice(i, 1); i--; }
      }
      return '<div class="an-fields">' + out.map(function (part) {
        return part.heading ? '<h3 class="an-settings-heading">' + part.heading + '</h3>' : part.html;
      }).join('') + '</div>';
    }
    function row(def) {
        var decorationKey = def[0].split('.')[1];
        var value = def[0] === 'price_preset' ? (M.priceImage(layout) ? 'price-image' : layout.price_preset === 'manual' ? '' : layout.price_preset || '')
          : decorationKey ? Object.assign({}, M.decorationDefaults, layout.decoration)[decorationKey]
          : layout[def[0]] == null ? M.theme[def[0]] : layout[def[0]];
        var imageColor = ['price_outline_color', 'old_price_color', 'price_strike_color'].indexOf(def[0]) >= 0;
        var html = '<label class="an-field"' + (imageColor ? ' data-price-image-color' : '')
          + '><span' + (def[0] === 'price_background' ? ' data-price-background-label' : '') + '>'
          + (def[0] === 'price_background' && M.priceImage(layout) ? 'Stattpreis-Streifen' : def[1]) + '</span>';
        if (Array.isArray(def[2])) {
          html += '<select aria-label="' + M.esc(def[1]) + '" data-style="' + def[0] + '">' + def[2].map(function (option) {
            var key = Array.isArray(option) ? option[0] : option, label = Array.isArray(option) ? option[1] : option;
            return '<option value="' + M.esc(key) + '"' + (String(value) === key ? ' selected' : '') + '>' + M.esc(label) + '</option>';
          }).join('') + '</select>';
        } else if (def[2] === 'number') {
          var unit = /%/.test(def[1]) ? ' %' : /Grad/.test(def[1]) ? '\u00b0' : /px|Breite|Radius|Größe/i.test(def[1]) ? ' px' : '';
          html += '<input data-style="' + def[0] + '" type="range" min="' + def[3] + '" max="' + def[4] + '" value="' + M.esc(value) + '" aria-label="' + M.esc(def[1]) + '">'
            + '<output data-style-value="' + def[0] + '" data-unit="' + unit + '">' + M.esc(value) + unit + '</output>';
        } else {
          html += '<input data-style="' + def[0] + '" type="' + def[2] + '" value="' + M.esc(value) + '"'
            + (def[2] === 'checkbox' && value ? ' checked' : '') + '>';
        }
        return html + '</label>';
    }
    return '<div data-side-panel="design">' + choices('template', '1 · Stil wählen', M.templateOptions)
      + choices('density', '2 · Artikel pro Seite', [['4', '4 · großzügig'], ['6', '6 · kompakt']])
      + '<h3 class="an-settings-heading">3 · Farben und Schrift</h3>' + fields(false)
      + '<details class="an-fine"><summary>Feinabstimmung · Größen und Drehung</summary>' + fields(true) + '</details>'
      + '<details class="an-fine an-more-design"><summary>Weitere Gestaltung · Dekoration, Farben und Preisschild</summary>' + fields('extra') + '</details></div>';
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
    host.querySelectorAll('[data-price-image-color]').forEach(function (field) { field.hidden = false; });
    host.querySelectorAll('[data-price-background-label]').forEach(function (label) {
      label.textContent = M.priceImage(layout) ? 'Stattpreis-Streifen' : 'Preis-Hintergrund';
    });
    host.querySelectorAll('[data-style]').forEach(function (control) {
      var key = control.dataset.style, decorationKey = key.split('.')[1];
      var value = decorationKey ? Object.assign({}, M.decorationDefaults, layout.decoration)[decorationKey] : layout[key];
      if (value == null) return;
      if (control.type === 'radio') control.checked = control.value === String(value);
      else if (control.type === 'checkbox') control.checked = value;
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
      layout.price_preset = '';
    } else if (key === 'price_preset') {
      if (!target.value) { layout.price_preset = 'manual'; return true; }
      var preset = window.WochenangeboteRenderer.TAG_PRESETS[target.value];
      if (!preset) return false;
      layout.price_preset = target.value;
      layout.price_shape = preset.tagShape === 'price-image' ? 'rect' : preset.tagShape;
      layout.price_background = target.value === 'price-image' ? '#fff000' : preset.tagColor;
      layout.color = target.value === 'price-image' ? preset.tagColor : '#ffffff';
      layout.decoration = Object.assign({}, layout.decoration, { price_radius: preset.tagRadius });
    } else if (key.indexOf('decoration.') === 0) {
      layout.decoration = Object.assign({}, layout.decoration);
      layout.decoration[key.split('.')[1]] = target.type === 'checkbox' ? target.checked : target.type === 'number' || target.type === 'range' ? Number(target.value) : target.value;
    } else {
      layout[key] = target.type === 'number' || target.type === 'range' || key === 'density' ? Number(target.value) : target.value;
      if (key === 'price_shape') layout.price_preset = 'manual';
      if (key === 'color' && !layout.price_preset) layout.price_preset = 'manual';
    }
    var out = target.parentElement && target.parentElement.querySelector('output[data-style-value="' + key + '"]');
    if (out) out.textContent = target.value + (out.dataset.unit || '');
    return true;
  }
  function sample(layout, kind, products) {
    var d = M.blank(kind, layout); d.title = kind === 'drinks' ? 'Getränkeangebote · Designvorschau' : 'Wochenangebote · Designvorschau';
    for (var n = 0; n < layout.density; n++) {
      var it = M.item(); Object.assign(it, { name: (kind === 'drinks' ? 'Getränk' : 'Artikel') + ' – Beispiel ' + (n + 1),
        price_cents: 1249, old_price_cents: 1499, units: 20, volume_ml: 500, packaging: 'Mehrweg', deposit_cents: 310 });
      if (products && products.length) {
        var id = it.id; Object.assign(it, M.clone(products[n % products.length])); it.id = id; it.layout_key = '';
      }
      d.items.push(it);
    }
    M.applyTemplate(d);
    return d;
  }
  function synchronizeTiles(layout) {
    if (!layout.adjustments) return;
    var shared = {};
    Object.keys(layout.adjustments).forEach(function (key) {
      var slot = /^(sheet|card|single|scale):([0-5]):(.+)$/.exec(key);
      if (!slot) { shared[key] = M.clone(layout.adjustments[key]); return; }
      if (slot[2] !== '0') return;
      for (var n = 0; n < layout.density; n++) {
        shared[slot[1] + ':' + n + ':' + slot[3]] = M.clone(layout.adjustments[key]);
      }
    });
    layout.adjustments = shared;
  }
  function historyShortcut(event, undo, redo) {
    if (!(event.ctrlKey || event.metaKey) || event.altKey || event.defaultPrevented
      || event.target.closest('input,textarea,select') || event.target.isContentEditable) return;
    var key = event.key.toLowerCase();
    if (key !== 'z' && key !== 'y') return;
    event.preventDefault();
    if (key === 'y' || event.shiftKey) redo(); else undo();
  }
  function history(read, restore) {
    var current = M.clone(read()), past = [], future = [], grouped = false, recorded = false, toolbar = null, transaction = null;
    function update() {
      if (!toolbar) return;
      toolbar.querySelector('[data-design-history=undo]').disabled = !past.length;
      toolbar.querySelector('[data-design-history=redo]').disabled = !future.length;
    }
    function record() {
      if (transaction) return;
      var value = M.clone(read());
      if (JSON.stringify(value) === JSON.stringify(current)) return;
      if (!grouped || !recorded) { past.push(current); if (past.length > 30) past.shift(); }
      current = value; future = []; recorded = true; update();
    }
    function travel(source, destination) {
      if (transaction) return;
      if (!source.length) return;
      grouped = false; recorded = false;
      destination.push(M.clone(read()));
      current = source.pop(); restore(M.clone(current)); current = M.clone(read()); update();
    }
    var api = {
      record: record,
      transaction: function (commit) {
        if (typeof commit !== 'boolean') {
          record();
          transaction = M.clone(read());
          return;
        }
        var before = transaction;
        if (!before) return;
        if (!commit) restore(M.clone(before));
        transaction = null;
        if (commit) record();
        update();
      },
      begin: function () { grouped = true; recorded = false; },
      end: function () { grouped = false; recorded = false; },
      reset: function () { current = M.clone(read()); past = []; future = []; grouped = false; update(); },
      undo: function () { travel(past, future); },
      redo: function () { travel(future, past); },
      bind: function (host, root) {
        toolbar = document.createElement('div'); toolbar.className = 'an-actions an-design-history';
        toolbar.setAttribute('role', 'group'); toolbar.setAttribute('aria-label', 'Gestaltungsschritte');
        toolbar.innerHTML = '<button type="button" data-design-history="undo">Rückgängig</button><button type="button" data-design-history="redo">Wiederholen</button>';
        host.querySelectorAll('.an-design-history').forEach(function (node) { node.remove(); });
        host.prepend(toolbar);
        toolbar.querySelector('[data-design-history=undo]').onclick = api.undo;
        toolbar.querySelector('[data-design-history=redo]').onclick = api.redo;
        root.onkeydown = function (event) { historyShortcut(event, api.undo, api.redo); };
        update();
        compactActions(host);
        objectProperties(root, { history: api });
      }
    };
    return api;
  }
      function objectProperties(root, options) {
        if (root._objectProperties) { root._objectProperties.refresh(); return root._objectProperties; }
        var groups = { text: [], price: [], image: [] }, labels = { text: 'Schrift', price: 'Preisschild', image: 'Bild' };
        var bar = document.createElement('div'), active = null;
        bar.className = 'an-object-summaries';
        function classify(control) {
          var key = control.dataset.style || control.dataset.cmsConfig || control.id || '';
          return M.propertyGroup(key);
        }
        function describe(group) {
          var controls = groups[group].map(function (field) { return field.querySelector('input,select,textarea'); });
          function find(pattern) { return controls.find(function (control) { return pattern.test(control.dataset.style || control.dataset.cmsConfig || control.id || ''); }); }
          function label(control) { return !control ? '' : control.tagName === 'SELECT' ? control.selectedOptions[0]?.textContent : control.value; }
          if (group === 'text') {
            var font = find(/(?:nameFont|(?:^|[-_])font)$/i), size = find(/(?:nameSize|name_size)$/i);
            return [label(font), size ? Number(size.value) ? size.value + ' px' : 'Automatische Größe' : ''].filter(Boolean).join(' · ');
          }
          if (group === 'price') return label(find(/(?:tagPreset|price_preset)$/i)) || label(find(/(?:tagShape|price_shape)$/i));
          var scale = find(/(?:imgScale|image_scale)$/i), rotation = find(/(?:imgRot|image_rotation)$/i);
          return [scale ? scale.value + ' %' : '', rotation ? rotation.value + '°' : ''].filter(Boolean).join(' · ');
        }
        Object.keys(groups).forEach(function (group) {
          var button = document.createElement('button'); button.type = 'button';
          button.dataset.objectProperties = group; button.setAttribute('aria-haspopup', 'dialog');
          button.setAttribute('aria-label', labels[group] + ': Eigenschaften öffnen');
          button.innerHTML = '<strong>' + labels[group] + '</strong><small></small>';
          button.onclick = function () { open(group, button); }; bar.appendChild(button);
        });
        function refresh() {
          if (active) return;
          var displayOnly = !!root.dataset.designer;
          Object.keys(groups).forEach(function (group) { groups[group] = []; });
          root.querySelectorAll('input,select,textarea').forEach(function (control) {
            if (control.closest('.an-object-dialog')) return;
            var group = classify(control), field = control.closest('label');
            if (!group || !field || field.dataset.objectUnavailable === 'true' || field.querySelectorAll('input,select,textarea').length !== 1) return;
            if (field.hidden && !field.dataset.objectField) return;
            field.dataset.objectField = group;
            if (!displayOnly) field.hidden = true;
            groups[group].push(field);
          });
          bar.querySelectorAll('[data-object-properties]').forEach(function (button) {
            var group = button.dataset.objectProperties, detail = describe(group);
            button.hidden = !groups[group].length; button.querySelector('small').textContent = (options.origin ? options.origin(group) + ' · ' : '') + detail;
            button.title = labels[group] + ': ' + detail;
          });
          var host = root.querySelector('.an-designer-body,#an-style-controls');
          if (host && !bar.isConnected) host.prepend(bar);
        }
        function open(group, opener) {
          if (active) return;
          var nodes = groups[group].filter(function (field) { return field.isConnected && field.dataset.objectUnavailable !== 'true'; });
          if (!nodes.length) return;
          var dialog = document.createElement('dialog'), positions = [], statuses = [];
          dialog.className = 'an-dialog an-object-dialog';
          dialog.setAttribute('aria-label', labels[group] + ' einstellen');
          dialog.innerHTML = '<form><header><h2>' + labels[group] + ' einstellen</h2>'
            + '<button type="button" data-object-cancel aria-label="Eigenschaften schließen und Änderungen verwerfen">×</button></header>'
            + '<div class="an-object-preview"><figure tabindex="0" aria-label="Vorschauausschnitt, bei Bedarf scrollen"><canvas aria-label="Live-Detailvorschau"></canvas></figure><div><small>Live-Vorschau · noch nicht gespeichert</small><button type="button" data-object-view>Gesamtmotiv</button></div></div>'
            + '<div class="an-object-body"><div class="an-object-grid"></div></div><footer><button type="button" data-object-cancel>Abbrechen</button>'
            + '<button type="submit" class="an-primary">Übernehmen</button></footer></form>';
          root.querySelectorAll('[role=status],[data-design-status]').forEach(function (node) { statuses.push([node, node.textContent]); });
          if (options.history) options.history.transaction();
          if (options.begin) options.begin();
          nodes.forEach(function (field) {
            var marker = document.createComment('object-field'); field.replaceWith(marker);
            positions.push([marker, field]); field.hidden = false;
            dialog.querySelector('.an-object-grid').appendChild(field);
          });
          root.appendChild(dialog); active = dialog;
          if (options.reset) {
            var reset = document.createElement('button'); reset.type = 'button';
            reset.textContent = options.canReset() ? 'Auf Vorlagenwert zurücksetzen' : 'Keine gespeicherte Vorlagenherkunft';
            reset.disabled = !options.canReset();
            reset.onclick = function () {
              options.reset(group);
              var values = options.values();
              dialog.querySelectorAll('input,select').forEach(function (control) {
                var key = control.dataset.cmsConfig ? 'cms.' + control.dataset.cmsConfig : control.dataset.style;
                if (!Object.prototype.hasOwnProperty.call(values, key)) {
                  if (control.type === 'checkbox') control.checked = false;
                  else if (control.type !== 'radio' && !control.dataset.cmsConfig) control.value = '';
                  return;
                }
                if (control.type === 'checkbox') control.checked = values[key]; else control.value = values[key];
              });
            };
            dialog.querySelector('.an-object-body').appendChild(reset);
          }
          function close(commit) {
            if (commit && !dialog.querySelector('form').reportValidity()) return;
            clearInterval(timer);
            positions.forEach(function (entry) { entry[1].hidden = true; entry[0].replaceWith(entry[1]); });
            dialog.close(); dialog.remove(); active = null;
            if (options.history) options.history.transaction(commit);
            if (options.end) options.end(commit);
            if (!commit) statuses.forEach(function (entry) { if (entry[0].isConnected) entry[0].textContent = entry[1]; });
            refresh(); (opener.isConnected ? opener : bar.querySelector('[data-object-properties="' + group + '"]'))?.focus();
          }
          var whole = false;
          function preview() {
            if (!matchMedia('(max-width:559px)').matches) return;
            var source = options.canvas ? options.canvas() : root.querySelector('.an-designer-paper canvas,#an-stage-canvas');
            if (!source || !source.width || !source.height) return;
            drawDetail(dialog.querySelector('canvas'), source, whole ? '' : group, options.item && options.item());
          }
          dialog.querySelector('[data-object-view]').onclick = function (event) {
            whole = !whole; event.currentTarget.textContent = whole ? 'Detailansicht' : 'Gesamtmotiv'; preview();
          };
          dialog.querySelector('form').onsubmit = function (event) { event.preventDefault(); close(true); };
          dialog.querySelectorAll('[data-object-cancel]').forEach(function (button) { button.onclick = function () { close(false); }; });
          dialog.addEventListener('cancel', function (event) { event.preventDefault(); event.stopPropagation(); close(false); });
          var timer = setInterval(preview, 150);
          dialog.showModal(); preview();
        }
  function drawDetail(target, source, group, itemId) {
    var elements = source._weeklyElements || source._elMeta || source._offerElements || [];
    var roles = group === 'text' ? ['name', 'description'] : group === 'image' ? ['img', 'image'] : ['price', 'old_price'];
    function identity(element) { return element.item_id || element.itemId || element.itemKey; }
    var relevant = group ? elements.filter(function (element) { return roles.includes(element.ovKey || element.type || element.id); }) : [];
    var id = itemId || (relevant[0] && identity(relevant[0]));
    relevant = relevant.filter(function (element) { return identity(element) === id; });
    var x = 0, y = 0, w = source.width, h = source.height;
    if (relevant.length) {
        var boxes = relevant.map(function (element) {
          var angle = (element.rotation || 0) * Math.PI / 180;
          var bw = Math.abs(Math.cos(angle)) * element.w + Math.abs(Math.sin(angle)) * element.h;
          var bh = Math.abs(Math.sin(angle)) * element.w + Math.abs(Math.cos(angle)) * element.h;
          return { x: element.x + (element.w - bw) / 2, y: element.y + (element.h - bh) / 2, w: bw, h: bh };
        });
        var scale = source.width / (source._weeklyWidth || source._offerWidth || M.W);
        x = Math.max(0, Math.min.apply(null, boxes.map(function (e) { return e.x; })) * scale - 8);
        y = Math.max(0, Math.min.apply(null, boxes.map(function (e) { return e.y; })) * scale - 8);
        w = Math.max(1, Math.min(source.width - x, Math.max.apply(null, boxes.map(function (e) { return e.x + e.w; })) * scale - x + 8));
        h = Math.max(1, Math.min(source.height - y, Math.max.apply(null, boxes.map(function (e) { return e.y + e.h; })) * scale - y + 8));
    }
    target.width = Math.max(1, Math.round(w)); target.height = Math.max(1, Math.round(h));
    target.getContext('2d').drawImage(source, x, y, w, h, 0, 0, target.width, target.height);
  }
        root._objectProperties = { refresh: refresh };
        refresh(); return root._objectProperties;
      }
  var helpId = 0;
  function placePopover(button, popup) {
    var rect = button.getBoundingClientRect();
    popup.style.left = Math.max(12, Math.min(innerWidth - popup.offsetWidth - 12, rect.left)) + 'px';
    popup.style.top = Math.max(12, Math.min(innerHeight - popup.offsetHeight - 12, rect.bottom + 5)) + 'px';
  }
  function iconButton(button, name) {
    var label = button.getAttribute('aria-label') || button.textContent.trim();
    var paths = name === 'undo' ? '<path d="M3 10h11a6 6 0 0 1 0 12M3 10l5-5M3 10l5 5"/>'
      : name === 'redo' ? '<path d="M21 10H10a6 6 0 0 0 0 12M21 10l-5-5m5 5-5 5"/>'
      : '<circle cx="5" cy="12" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/>';
    button.innerHTML = '<svg aria-hidden="true" viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' + paths + '</svg>';
    button.setAttribute('aria-label', label); button.title = label; button.classList.add('an-icon-action');
  }
  function compactActions(host) {
    host.classList.add('an-compact-actions');
    host.querySelectorAll('[data-design-history],[data-history]').forEach(function (button) {
      iconButton(button, button.dataset.designHistory || button.dataset.history);
    });
    var save = host.querySelector('[data-design-save],#cfg-plakat-save,[data-action=hpangSave],#an-save');
    if (save) {
      if (!save.hasAttribute('aria-label')) save.setAttribute('aria-label', save.textContent.trim());
      save.textContent = 'Speichern';
    }
    var popup = host.querySelector('.an-action-popover'), menu = host.querySelector('[data-more-actions]');
    var extras = Array.from(host.querySelectorAll(':scope>button')).filter(function (button) {
      return button !== save && !button.matches('[data-history],[data-more-actions],[data-workspace-views],#an-overview');
    });
    if (extras.length && !popup) {
      popup = document.createElement('div'); popup.className = 'an-action-popover'; popup.popover = 'auto';
      popup.id = 'an-actions-' + (++helpId);
      menu = document.createElement('button'); menu.type = 'button'; menu.dataset.moreActions = '';
      menu.textContent = 'Weitere Aktionen'; iconButton(menu, 'more');
      menu.setAttribute('popovertarget', popup.id); host.append(menu, popup);
      popup.addEventListener('toggle', function () { if (popup.matches(':popover-open')) placePopover(menu, popup); });
      popup.addEventListener('click', function (event) {
        if (event.target.closest('button')) popup.hidePopover();
      });
    }
    if (popup) extras.forEach(function (button) { popup.appendChild(button); });
  }
  function split(root, left, right) {
    if (root._splitView) return root._splitView;
    root.classList.add('an-split'); left.classList.add('an-split-tools'); right.classList.add('an-split-picture');
    var handle = document.createElement('div'), ratio = .6, dragging = false, explicitView = false;
    var viewbar = document.createElement('div');
    viewbar.className = 'an-workspace-view';
    viewbar.innerHTML = '<span class="an-workspace-context"></span><select aria-label="Arbeitsansicht">'
      + '<option value="split">Geteilt</option><option value="inputs">Nur Eingaben</option><option value="picture">Nur Motiv</option></select>';
    var view = viewbar.querySelector('select');
    var pictureStatus = document.createElement('span'); pictureStatus.className = 'an-workspace-picture-status';
    pictureStatus.textContent = 'Nur Motiv · Eingaben ausgeblendet'; viewbar.prepend(pictureStatus);
    root.prepend(viewbar);
    var viewButton = document.createElement('button'), viewPopup = document.createElement('div'), viewLabel = document.createElement('label');
    viewButton.type = 'button'; viewButton.dataset.workspaceViews = ''; viewButton.className = 'an-icon-action an-workspace-views';
    viewButton.innerHTML = '<svg aria-hidden="true" viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="16" rx="2"/><path d="M12 4v16"/></svg>';
    viewPopup.className = 'an-action-popover an-workspace-choices'; viewPopup.popover = 'auto'; viewPopup.id = 'an-workspace-views-' + (++helpId);
    viewButton.setAttribute('popovertarget', viewPopup.id);
    viewLabel.textContent = 'Arbeitsansicht'; viewPopup.appendChild(viewLabel);
    var actions = left.querySelector('.an-designer-save,.an-compact-actions');
    root.classList.toggle('an-mobile-views', !!actions);
    if (actions) { actions.appendChild(viewButton); root.appendChild(viewPopup); }
    viewPopup.addEventListener('toggle', function () { if (viewPopup.matches(':popover-open')) placePopover(viewButton, viewPopup); });
    view.onchange = function () { explicitView = true; viewPopup.hidePopover(); resize(); };
    handle.className = 'an-split-handle'; handle.tabIndex = 0;
    handle.setAttribute('role', 'separator'); handle.setAttribute('aria-orientation', 'vertical');
    handle.setAttribute('aria-label', 'Breite von Werkzeugen und Vorschau');
    handle.title = 'Trennlinie ziehen · Pfeiltasten zum Verstellen';
    root.insertBefore(handle, right);
    function resize() {
      var width = root.clientWidth;
      if (!width) { viewButton.hidden = true; return; }
      var mobile = width < 612;
      root.classList.toggle('an-split-mobile', mobile);
      if (!explicitView) view.value = mobile ? 'inputs' : 'split';
      root.dataset.workspaceView = view.value;
      viewButton.hidden = !mobile || !actions;
      viewButton.setAttribute('aria-label', 'Arbeitsansicht: ' + view.selectedOptions[0].textContent);
      viewButton.title = 'Arbeitsansicht: ' + view.selectedOptions[0].textContent;
      if (actions) (mobile && view.value === 'picture' ? viewbar : actions).appendChild(viewButton);
      if (mobile && actions) viewLabel.appendChild(view);
      else if (view.parentElement !== viewbar) { viewPopup.hidePopover(); viewbar.appendChild(view); }
      handle.hidden = mobile || view.value !== 'split';
      if (mobile || !width) return;
      var minimum = (width - 12) / 2, maximum = Math.max(minimum, width - 262);
      var tools = Math.max(minimum, Math.min(maximum, (width - 12) * ratio));
      root.style.setProperty('--an-tools-width', tools + 'px');
      handle.setAttribute('aria-valuemin', Math.round(minimum));
      handle.setAttribute('aria-valuemax', Math.round(maximum));
      handle.setAttribute('aria-valuenow', Math.round(tools));
    }
    handle.onpointerdown = function (event) {
      if (event.button !== 0) return;
      event.preventDefault(); dragging = true; handle.setPointerCapture(event.pointerId); handle.focus();
    };
    handle.onpointermove = function (event) {
      if (!dragging) return;
      var box = root.getBoundingClientRect(); ratio = (event.clientX - box.left) / (box.width - 12);
      resize();
    };
    handle.onpointerup = handle.onpointercancel = function () { dragging = false; };
    handle.onkeydown = function (event) {
      if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
      event.preventDefault();
      ratio = event.key === 'Home' ? .5 : event.key === 'End' ? 1
        : (Number(handle.getAttribute('aria-valuenow')) + (event.key === 'ArrowRight' ? 20 : -20)) / (root.clientWidth - 12);
      resize();
    };
    var observer = new ResizeObserver(resize); observer.observe(root);
    root._splitView = { destroy: function () { observer.disconnect(); viewbar.remove(); viewButton.remove(); viewPopup.remove(); }, resize: resize };
    resize(); return root._splitView;
  }
  function expandGroups(root) {
    root.querySelectorAll('details').forEach(function (group) {
      if (group.dataset.groupReady) return;
      group.dataset.groupReady = 'true'; group.open = true;
    });
  }
  function fullscreen(root, host) {
    var button = document.createElement('button'); button.type = 'button'; button.dataset.workspaceFullscreen = '';
    button.innerHTML = '<svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M8 3H3v5m13-5h5v5M3 16v5h5m8 0h5v-5"/></svg>';
    function update() {
      var label = document.fullscreenElement ? 'Vollbild beenden' : 'Vollbild';
      button.setAttribute('aria-label', label); button.title = label;
    }
    button.onclick = async function () {
      try {
        if (document.fullscreenElement) await document.exitFullscreen();
        else if (root.requestFullscreen) await root.requestFullscreen();
        else throw M.problem('Dieser Browser unterstützt keinen Vollbildmodus. Bitte einen Browser mit Vollbildunterstützung verwenden.');
      } catch (error) { M.error(error); }
    };
    document.addEventListener('fullscreenchange', update); host.appendChild(button); update();
    return { destroy: function () { document.removeEventListener('fullscreenchange', update); } };
  }
  function compactHelp(root, target) {
    var notes = Array.from(root.querySelectorAll('.an-note,.an-muted,p[style*="font-size"]'));
    if (root.matches && root.matches('p,.an-note,.an-muted')) notes.unshift(root);
    notes.forEach(function (note) {
      if (note.id || note.hasAttribute('role') || Object.keys(note.dataset).length
        || note.closest('.an-help-popover') || note.querySelector('button,input,select,a') || !note.textContent.trim()) return;
      var owner = note.closest('fieldset'), destination = owner ? owner.querySelector('legend') : target;
      if (!destination) return;
      var existing = destination.querySelector(':scope>.an-help .an-help-popover>div');
      if (existing) {
        if (Array.from(existing.children).some(function (node) { return node.textContent === note.textContent; })) note.remove();
        else existing.appendChild(note);
        return;
      }
      var wrap = document.createElement('span'), button = document.createElement('button'), popup = document.createElement('div');
      wrap.className = 'an-help';
      button.type = 'button'; button.className = 'an-help-button'; button.textContent = 'ⓘ';
      button.setAttribute('aria-label', 'Hinweis: ' + note.textContent.trim().split(/[.!]/)[0]);
      popup.id = 'an-design-help-' + (++helpId); popup.className = 'an-help-popover'; popup.popover = 'auto';
      popup.setAttribute('role', 'tooltip'); button.setAttribute('aria-controls', popup.id); button.setAttribute('aria-expanded', 'false');
      var text = document.createElement('div'); text.appendChild(note);
      var close = document.createElement('button'); close.type = 'button'; close.textContent = 'Schließen';
      var returning = false;
      function hide(restore) {
        if (popup.matches(':popover-open')) popup.hidePopover();
        popup.classList.remove('an-help-pinned');
        if (restore) { returning = true; button.focus(); returning = false; }
      }
      function show() {
        if (returning || popup.matches(':popover-open')) return;
        popup.showPopover();
        placePopover(button, popup);
      }
      close.onclick = function () { hide(true); };
      button.onclick = function () { popup.classList.add('an-help-pinned'); show(); }; button.onfocus = show;
      button.onpointerenter = function (event) { if (event.pointerType === 'mouse') show(); };
      wrap.onpointerleave = function (event) {
        if (!wrap.contains(document.activeElement) && !wrap.contains(event.relatedTarget)) hide(false);
      };
      wrap.onfocusout = function (event) { if (!wrap.contains(event.relatedTarget)) hide(false); };
      wrap.onkeydown = function (event) {
        if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); hide(true); }
      };
      popup.addEventListener('toggle', function () {
        var open = popup.matches(':popover-open'); button.setAttribute('aria-expanded', String(open));
        if (!open) popup.classList.remove('an-help-pinned');
      });
      popup.append(text, close); wrap.append(button, popup); destination.appendChild(wrap);
    });
  }
  function prepareCms(panel) {
    if (!document.querySelector('[data-offer-workspaces]')) return;
    if (panel.classList.contains('an-design-shell')) return;
    if (!panel.querySelector(':scope>.an-design-header')) {
      var header = document.createElement('header');
      header.className = 'an-design-header';
      header.append(panel.children[0], panel.children[1]);
      panel.prepend(header);
      panel.classList.add('an-design-shell');
      fullscreen(panel, header.querySelector('div'));
    }
    var generalHelp = document.createElement('span'); generalHelp.className = 'an-header-help';
    panel.querySelector('.an-design-header>div').appendChild(generalHelp);
    panel.querySelectorAll(':scope>div').forEach(function (section) {
      var hint = document.createElement('span'); hint.className = 'an-tab-help';
      var nav = section.querySelector(':scope>.cfg-section-nav');
      (nav || generalHelp).appendChild(hint);
      Array.from(section.children).filter(function (node) { return node.tagName === 'P'; }).forEach(function (node) {
        if (!node.querySelector('a')) compactHelp(node, hint);
      });
    });
    panel.querySelectorAll('#cms-cfg-wp .cfg-split-right .cfg-lp-inner').forEach(function (preview) {
      if (preview.dataset.pictureOnly) return;
      preview.dataset.pictureOnly = 'true';
      var heading = preview.firstElementChild, actions = preview.lastElementChild, controls = document.createElement('div');
      var left = preview.closest('.cfg-split').querySelector('.cfg-split-left');
      controls.className = 'an-preview-options'; controls.appendChild(actions);
      left.prepend(controls); heading.remove(); pictureViewport(preview, controls);
    });
    restyleColorGrids(panel);
    restyleColorRows(panel);
    restyleSliderRows(panel);
    restyleCheckRows(panel);
    compactDesignNavigation(panel);
  }
  // Checkbox-Zeilen: Kästchen nach vorn (links), Label daneben.
  function restyleCheckRows(panel) {
    panel.querySelectorAll('label.an-field>input[type=checkbox]').forEach(function (box) {
      var label = box.parentElement;
      if (label.dataset.chkrow) return;
      label.dataset.chkrow = 'true';
      label.classList.add('an-chkrow');
      label.insertBefore(box, label.firstChild);
    });
  }
  // Übrige Farb-Zeilen (HP, Wochenplan, …) ebenfalls auf Swatch-links-Zeilen umbauen.
  function restyleColorRows(panel) {
    panel.querySelectorAll('label>input[type=color],div>input[type=color]').forEach(function (input) {
      var label = input.closest('label') || input.parentElement;
      if (label.classList.contains('an-cfield') || label.dataset.crow) return;
      if (label.closest('.an-gradopts,.cfg-tpl-grad-row,.an-object-dialog')) return;
      label.dataset.crow = 'true';
      label.classList.add('an-cfield');
      var head = label.childNodes[0];
      while (head && head.nodeType === 3 && !head.textContent.trim()) head = head.nextSibling;
      if (head && head.nodeType === 3) {
        var lab = document.createElement('span'); lab.className = 'an-cfield-lab'; lab.textContent = head.textContent.trim();
        label.removeChild(head); label.appendChild(lab);
      } else if (head && head.nodeType === 1 && (head.tagName === 'SPAN' || head.tagName === 'LABEL') && !head.classList.contains('an-cfield-lab')) {
        head.classList.add('an-cfield-lab');
        label.appendChild(head);
      }
    });
  }
  // Slider-Zeilen 1:1 nach Entwurf: Kartenzeile = Label links · Slider · Wert rechts.
  function restyleSliderRows(panel) {
    panel.querySelectorAll('input[type=range]').forEach(function (range) {
      if (/pct/i.test(range.id || '')) return;
      if (range.closest('.an-quickbar,.an-quick,.an-gradopts,.cfg-tpl-grad-opts,.an-image-tools,.an-nudge,.hcfg-grad-opts')) return;
      var label = range.closest('label');
      var row = label || range.parentElement;
      if (row.dataset.srow) return;
      if (row !== label && row.parentElement !== label && row !== range.parentElement) return;
      row.dataset.srow = 'true';
      row.classList.add('an-srow');
      if (row !== label) row.classList.add('an-srow-slider');
      var head = row.childNodes[0];
      while (head && head.nodeType === 3 && !head.textContent.trim()) head = head.nextSibling;
      if (head && head.nodeType === 3) {
        var lab = document.createElement('span'); lab.className = 'an-srow-lab'; lab.textContent = head.textContent.trim();
        row.removeChild(head); row.insertBefore(lab, row.firstChild);
      } else if (head && head.nodeType === 1 && (head.tagName === 'SPAN' || head.tagName === 'LABEL') && !head.classList.contains('an-srow-lab')) {
        head.classList.add('an-srow-lab');
      }
    });
  }
  // Farb-Karten (Plakat/Flyer) 1:1 nach Entwurf: Zeile = Swatch · Label · Verlauf,
  // Verlauf-Optionen als eingerückte Leiste mit zweiter Farbe, Reset in den Sektionskopf.
  function restyleColorGrids(panel) {
    panel.querySelectorAll('#cfg-tpl-plakat-colors>div,#cfg-tpl-flyer-colors>div').forEach(function (grid) {
      if (grid.dataset.restyled) return;
      grid.dataset.restyled = 'true';
      grid.classList.add('an-cgrid');
      Array.prototype.slice.call(grid.children).forEach(function (node) {
        if (node.matches('label') && node.querySelector('input[type=color]')) {
          var head = node.childNodes[0];
          if (head && head.nodeType === 3) {
            var lab = document.createElement('span'); lab.className = 'an-cfield-lab'; lab.textContent = head.textContent.trim();
            node.removeChild(head); node.appendChild(lab);
          }
          node.classList.add('an-cfield');
          var toggle = node.querySelector('.cfg-tpl-grad-toggle');
          if (toggle) toggle.closest('label').classList.add('an-gradchk');
        } else if (node.classList.contains('cfg-tpl-grad-row')) {
          var headRow = node.querySelector(':scope>div');
          var strip = headRow && headRow.nextElementSibling;
          var opts = node.querySelector('.cfg-tpl-grad-opts');
          if (!headRow || !strip) return;
          var input = strip.querySelector('input[type=color]:not(.cfg-tpl-grad-c2)');
          var c2 = strip.querySelector('.cfg-tpl-grad-c2');
          var gradLabel = headRow.querySelector('label');
          var labText = headRow.querySelector('span') ? headRow.querySelector('span').textContent.trim() : '';
          var line = document.createElement('div'); line.className = 'an-cfield';
          if (input) line.appendChild(input);
          var lab = document.createElement('span'); lab.className = 'an-cfield-lab'; lab.textContent = labText;
          line.appendChild(lab);
          if (gradLabel) { gradLabel.classList.add('an-gradchk'); line.appendChild(gradLabel); }
          if (opts) {
            opts.classList.add('an-gradopts');
            if (c2) opts.insertBefore(c2, opts.firstChild);
            node.replaceChildren(line, opts);
          } else node.replaceChildren(line);
        } else if (node.matches('button')) {
          node.classList.add('an-creset');
        }
      });
    });
  }
  function moveColorResets(root) {
    root.querySelectorAll('.an-creset').forEach(function (button) {
      var fieldset = button.closest('fieldset');
      if (!fieldset) return;
      var legend = fieldset.querySelector(':scope>legend');
      if (legend && button.parentElement !== legend) legend.appendChild(button);
    });
  }
  function compactDesignNavigation(panel) {
    var header = panel.querySelector('.an-design-header'), toolbar = header.firstElementChild, nav = header.children[1];
    nav.classList.add('an-design-nav');
    var location = document.createElement('div'), button = document.createElement('button'), popup = document.createElement('div'), destinations = new Map();
    location.className = 'an-design-location';
    button.type = 'button'; button.className = 'an-design-location-btn';
    button.setAttribute('aria-haspopup', 'listbox');
    popup.className = 'an-action-popover an-design-locations'; popup.popover = 'auto'; popup.id = 'an-design-locations-' + (++helpId);
    popup.setAttribute('role', 'listbox'); popup.setAttribute('aria-label', 'Designbereich');
    button.setAttribute('popovertarget', popup.id);
    button.innerHTML = '<span></span><svg aria-hidden="true" viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><path d="M6 9l6 6 6-6"/></svg>';
    button.querySelector('span').textContent = 'Designbereich';
    location.appendChild(button); toolbar.insertBefore(location, toolbar.children[1]); header.appendChild(popup);
    var observer = new MutationObserver(sync);
    observer.observe(nav, { subtree: true, attributes: true, attributeFilter: ['class'] });
    nav.querySelectorAll('[data-id]').forEach(function (top) {
      var section = panel.querySelector('#cms-' + top.dataset.id), subnav = section && section.querySelector(':scope>.cfg-section-nav');
      var group = document.createElement('div');
      group.className = 'an-loc-group';
      group.setAttribute('role', 'group');
      var groupLabel = top.textContent.replace(/^[^\p{L}\p{N}]+/u, '').trim();
      group.setAttribute('aria-label', groupLabel);
      group.textContent = groupLabel;
      popup.appendChild(group);
      if (subnav) observer.observe(subnav, { subtree: true, attributes: true, attributeFilter: ['class'] });
      var children = subnav ? Array.from(subnav.querySelectorAll('button[data-id]')) : [null];
      children.forEach(function (sub) {
        var item = document.createElement('button'), key = top.dataset.id + (sub ? '/' + sub.dataset.id : '');
        item.type = 'button'; item.className = 'an-loc-item'; item.dataset.value = key;
        item.setAttribute('role', 'option');
        item.textContent = 'Vorgabe: ' + (sub ? sub.textContent.replace(/^[^\p{L}\p{N}]+/u, '').trim() : group.textContent);
        var check = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        check.setAttribute('viewBox', '0 0 24 24'); check.setAttribute('width', '14'); check.setAttribute('height', '14');
        check.setAttribute('fill', 'none'); check.setAttribute('stroke', 'currentColor'); check.setAttribute('stroke-width', '3');
        check.setAttribute('aria-hidden', 'true'); check.style.visibility = 'hidden'; check.innerHTML = '<path d="M20 6L9 17l-5-5"/>';
        item.appendChild(check);
        var entry = { top: top, sub: sub, item: item, check: check };
        item.onclick = function () {
          popup.hidePopover(); entry.top.click(); if (entry.sub) entry.sub.click();
        };
        popup.appendChild(item); destinations.set(key, entry);
      });
    });
    function sync() {
      var current = null;
      destinations.forEach(function (entry, key) {
        var active = entry.top.classList.contains('active') && (!entry.sub || entry.sub.classList.contains('active'));
        entry.item.classList.toggle('active', active);
        entry.item.setAttribute('aria-selected', String(active));
        entry.check.style.visibility = active ? 'visible' : 'hidden';
        if (active) current = entry.item.textContent;
      });
      if (current) button.querySelector('span').textContent = current;
    }
    popup.addEventListener('toggle', function () {
      var open = popup.matches(':popover-open');
      button.setAttribute('aria-expanded', String(open));
      if (open) placePopover(button, popup);
    });
    var optionsButton = document.createElement('button'), optionsPopup = document.createElement('div');
    optionsButton.type = 'button'; optionsButton.className = 'an-icon-action an-design-options-toggle'; iconButton(optionsButton, 'more');
    optionsButton.setAttribute('aria-label', 'Designoptionen und Hilfe'); optionsButton.title = 'Designoptionen und Hilfe';
    optionsPopup.className = 'an-action-popover an-design-options'; optionsPopup.popover = 'auto'; optionsPopup.id = 'an-design-options-' + (++helpId);
    optionsButton.setAttribute('popovertarget', optionsPopup.id);
    var compact = toolbar.querySelector('.cms-switch'), generalHelp = toolbar.querySelector('.an-header-help');
    if (compact) optionsPopup.appendChild(compact);
    if (generalHelp) {
      generalHelp.querySelectorAll('.an-help-button').forEach(function (help) { help.textContent = help.getAttribute('aria-label').replace(/^Hinweis:\s*/, ''); });
      optionsPopup.appendChild(generalHelp);
    }
    var oldHelp = toolbar.querySelector('h3>span');
    if (oldHelp) {
      var help = document.createElement('button'); help.type = 'button'; help.textContent = 'Hilfe zum Designeditor';
      help.onclick = function () { optionsPopup.hidePopover(); oldHelp.click(); };
      oldHelp.hidden = true; optionsPopup.appendChild(help);
    }
    toolbar.insertBefore(optionsButton, toolbar.querySelector('[data-workspace-fullscreen]')); header.appendChild(optionsPopup);
    optionsPopup.addEventListener('toggle', function () { if (optionsPopup.matches(':popover-open')) placePopover(optionsButton, optionsPopup); });
    var size = new ResizeObserver(function () { if (panel.clientWidth) panel.classList.toggle('an-design-narrow', panel.clientWidth < 612); });
    size.observe(panel); sync();
  }
  function pictureViewport(preview, controls) {
    if (!preview._pictureView) {
      var frame = document.createElement('div'), paper = document.createElement('div');
      frame.className = 'an-designer-frame'; paper.className = 'an-designer-paper';
      while (preview.firstChild) paper.appendChild(preview.firstChild);
      frame.appendChild(paper); preview.appendChild(frame);
      var toolbar = document.createElement('div'); toolbar.className = 'an-picture-controls';
      toolbar.innerHTML = '<label class="an-field"><span>Vorschaugröße</span><select data-picture-zoom aria-label="Vorschaugröße">'
        + '<option value="fit">Einpassen</option><option value="0.25">25 %</option><option value="0.5">50 %</option><option value="0.75">75 %</option>'
        + '<option value="1">100 %</option><option value="1.25">125 %</option><option value="1.5">150 %</option><option value="2">200 %</option>'
        + '<option value="2.5">250 %</option><option value="3">300 %</option><option value="4">400 %</option></select></label>'
        + '<div class="an-actions"><button type="button" data-picture-fit>Einpassen</button><button type="button" data-picture-fullscreen>Vollbild</button></div>';
      var zoom = toolbar.querySelector('select');
      var zoombar = document.createElement('div'); zoombar.className = 'an-zoombar';
      zoombar.innerHTML = '<button type="button" data-zoom-out aria-label="Vorschau verkleinern" title="Verkleinern">&minus;</button>'
        + '<output aria-live="polite" aria-label="Aktuelle Vorschaugröße">100 %</output>'
        + '<button type="button" data-zoom-in aria-label="Vorschau vergrößern" title="Vergrößern">+</button>'
        + '<button type="button" data-zoom-fit aria-label="Vorschau einpassen" title="Vorschau an die Oberfläche anpassen">Einpassen</button>';
      preview.insertBefore(zoombar, preview.firstElementChild);
      var out = zoombar.querySelector('output');
      var steps = [.25, .5, .75, 1, 1.25, 1.5, 2, 2.5, 3, 4];
      function currentScale() {
        var width = paper.offsetWidth, height = paper.offsetHeight;
        if (!width || !height || !preview.clientWidth || !preview.clientHeight) return 1;
        return zoom.value === 'fit' ? Math.min((preview.clientWidth - 16) / width, (preview.clientHeight - fitPad()) / height, 1) : Number(zoom.value);
      }
      function fitPad() {
        var box = zoombar.getBoundingClientRect();
        return 16 + (box.height ? box.height + 8 : 0);
      }
      function step(direction) {
        var scale = currentScale(), value = null;
        if (direction > 0) {
          for (var i = 0; i < steps.length; i++) if (steps[i] > scale + .005) { value = steps[i]; break; }
        } else {
          for (var n = steps.length - 1; n >= 0; n--) if (steps[n] < scale - .005) { value = steps[n]; break; }
        }
        if (value && Array.prototype.some.call(zoom.options, function (option) { return option.value === String(value); })) {
          zoom.value = String(value); zoom.onchange();
        }
      }
      zoombar.querySelector('[data-zoom-in]').onclick = function () { step(1); };
      zoombar.querySelector('[data-zoom-out]').onclick = function () { step(-1); };
      zoombar.querySelector('[data-zoom-fit]').onclick = function () { zoom.value = 'fit'; zoom.onchange(); };
      function size() {
        if (!preview.clientWidth || !preview.clientHeight) return;
        var width = paper.offsetWidth, height = paper.offsetHeight;
        if (!width || !height) return;
        var scale = zoom.value === 'fit' || !zoom.value ? Math.min((preview.clientWidth - 16) / width, (preview.clientHeight - fitPad()) / height, 1) : Number(zoom.value);
        paper.style.transform = 'scale(' + scale + ')';
        paper.style.setProperty('--an-picture-scale', scale);
        frame.style.width = width * scale + 'px'; frame.style.height = height * scale + 'px';
        out.textContent = Math.round(scale * 100) + ' %';
      }
      zoom.onchange = function () { preview.scrollTop = 0; preview.scrollLeft = 0; size(); };
      toolbar.querySelector('[data-picture-fit]').onclick = function () { zoom.value = 'fit'; zoom.onchange(); };
      toolbar.querySelector('[data-picture-fullscreen]').onclick = async function () {
        try {
          if (document.fullscreenElement) await document.exitFullscreen();
          else {
            var workspace = preview.closest('.an-task-editor,.an-designer-workspace,.cfg-split');
            if (!workspace || !workspace.requestFullscreen) throw M.problem('Dieser Browser unterstützt keinen Vollbildmodus.');
            await workspace.requestFullscreen();
          }
        } catch (error) {
          M.error(error);
        }
      };
      var observer = new ResizeObserver(size); observer.observe(preview); observer.observe(paper);
      preview._pictureView = { toolbar: toolbar, size: size, destroy: function () { observer.disconnect(); } };
    }
    controls.appendChild(preview._pictureView.toolbar);
    preview.classList.add('an-preview', 'an-designer-preview');
    preview.tabIndex = 0; preview.setAttribute('aria-label', 'Live-Vorschau · unabhängig scrollen');
    return preview._pictureView;
  }
  function previewTools(preview) {
    if (!preview._workspaceTools) {
      var tools = document.createElement('div'); tools.className = 'an-preview-options';
      Array.from(preview.children).forEach(function (node) {
        if (node.classList.contains('an-preview-head') || /Live-Vorschau/.test(node.textContent) && !node.querySelector('button,img,canvas')) node.remove();
        else if (node.matches('.an-tabs,p,button') || node.querySelector('.hpang-view-btn,#cfg-lp-refresh-btn')) tools.appendChild(node);
      });
      preview._workspaceTools = tools;
    }
    return preview._workspaceTools;
  }
  function mountShared(root, preview, actions) {
    var body = root.querySelector('.an-shared-body');
    if (!body) {
      body = document.createElement('div'); body.className = 'an-shared-body';
      while (root.firstChild) body.appendChild(root.firstChild);
      root.appendChild(body); root.classList.add('an-shared-settings');
    }
    body.prepend(previewTools(preview)); pictureViewport(preview, body);
    root.appendChild(actions);
  }
  function workspace(root, options) {
    root.classList.add('an-design');
    root.dataset.designer = options.kind;
    var layout = document.createElement('div'), settings = document.createElement('section');
    layout.className = 'an-design-layout an-designer-workspace';
    settings.className = 'an-card an-designer-settings';
    settings.innerHTML = '<h2>' + M.esc(options.title) + '</h2><small class="an-designer-scope">Designvorgabe · alle Kacheln</small><div class="an-tabs an-designer-tabs" role="tablist" aria-label="Gestaltungswerkzeuge"></div>';
    var tabs = settings.querySelector('[role=tablist]'), panels = document.createElement('div'), body = document.createElement('div');
    var tools = document.createElement('select'); tools.className = 'an-designer-tool-select'; tools.setAttribute('aria-label', 'Gestaltungswerkzeuge');
    tabs.before(tools);
    body.className = 'an-designer-body';
    var controls = document.createElement('section'), direct = document.createElement('div'), help = document.createElement('div');
    controls.className = 'an-designer-controls'; direct.className = 'an-designer-direct'; help.className = 'an-designer-help';
    controls.setAttribute('aria-label', 'Vorschauwerkzeuge'); controls.append(help, direct);
    panels.dataset.designFields = '';
    body.append(controls, panels); settings.appendChild(body);
    var names = (options.tabs || ['Stil', 'Farben', 'Feinabstimmung', 'Weitere Gestaltung', 'Eigene Vorlagen']).concat(['Werkzeuge']);
    names.forEach(function (name, index) {
      var option = document.createElement('option'); option.value = index; option.textContent = name; tools.appendChild(option);
      var button = document.createElement('button'), panel = document.createElement('div');
      button.type = 'button'; button.textContent = name; button.dataset.designerTab = index;
      button.id = 'an-designer-' + options.kind + '-tab-' + index;
      button.setAttribute('role', 'tab');
      panel.id = 'an-designer-' + options.kind + '-panel-' + index;
      panel.dataset.designerPanel = index; panel.setAttribute('role', 'tabpanel');
      panel.setAttribute('aria-labelledby', button.id);
      button.setAttribute('aria-controls', panel.id);
      var content = panel;
      if (index === names.length - 1) { button.dataset.designerTools = ''; panel.appendChild(controls); }
      if (index === 4) {
        content = document.createElement('details'); content.className = 'an-fine an-own-presets';
        var summary = document.createElement('summary'); summary.textContent = 'Eigene Designvorlagen';
        content.appendChild(summary); panel.appendChild(content);
      }
      (options.groups[index] || []).forEach(function (node) { content.appendChild(node); });
      tabs.appendChild(button); panels.appendChild(panel);
    });
    function select(index, focus) {
      tools.value = index;
      tabs.querySelectorAll('button').forEach(function (button, n) {
        button.setAttribute('aria-selected', String(n === index));
        button.setAttribute('aria-pressed', String(n === index)); button.tabIndex = n === index ? 0 : -1;
        if (focus && n === index) button.focus();
      });
      settings.querySelectorAll('[data-designer-panel]').forEach(function (panel, n) { panel.hidden = n !== index; });
    }
    tools.onchange = function () { select(Number(tools.value)); };
    tabs.addEventListener('click', function (event) {
      var button = event.target.closest('[data-designer-tab]');
      if (button) select(Number(button.dataset.designerTab));
    });
    tabs.addEventListener('keydown', function (event) {
      var button = event.target.closest('[data-designer-tab]');
      if (!button || !['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
      event.preventDefault();
      var index = Number(button.dataset.designerTab);
      select(event.key === 'Home' ? 0 : event.key === 'End' ? names.length - 1
        : (index + (event.key === 'ArrowRight' ? 1 : names.length - 1)) % names.length, true);
    });
    controls.appendChild(previewTools(options.preview));
    pictureViewport(options.preview, controls);
    options.actions.classList.add('an-actions', 'an-designer-save');
    settings.appendChild(options.actions);
    layout.append(settings, options.preview);
    var splitter = split(layout, settings, options.preview);
    layout.querySelector('.an-workspace-context').textContent = 'Designvorgabe · ' + options.title + ' · alle Kacheln';
    root.replaceChildren(layout);
    compactHelp(root, help);
    select(0);
    expandGroups(root);
    restyleColorRows(root);
    restyleSliderRows(root);
    restyleCheckRows(root);
    root._designerUi = { select: select, direct: direct, help: help, destroy: function () {
      splitter.destroy(); options.preview._pictureView.destroy();
    } };
    return root._designerUi;
  }
  function mountCms(root, preview, actions, kind, history) {
    if (root.dataset.designer) {
      root.querySelector('.an-designer-workspace').appendChild(preview);
      root.querySelector('.an-designer-controls').appendChild(preview._workspaceTools);
      pictureViewport(preview, root.querySelector('.an-designer-controls'));
      root.querySelector('.an-designer-settings').appendChild(actions);
      history.bind(actions, root);
      moveColorResets(root);
      return;
    }
    var original = root.firstElementChild, groups = [[], [], [], [], []];
    Array.from(original.children).forEach(function (node) {
      if (node.classList.contains('cms-card')) {
        var header = node.querySelector('.cms-card-header'), body = node.querySelector('.cms-card-body');
        var title = header.textContent.trim(), section = document.createElement('fieldset');
        section.className = 'an-choice-group';
        if (body.classList.contains('cfg-anchor-grid')) section.classList.add('cfg-anchor-grid');
        var legend = document.createElement('legend'); legend.textContent = title;
        section.appendChild(legend);
        while (body.firstChild) section.appendChild(body.firstChild);
        var index = /Vorlage/.test(title) ? 0 : /Farben/.test(title) ? 1
          : /Preisschild und Marker|Position|Bezeichnung/.test(title) ? 2 : 3;
        groups[index].push(section);
      } else if (node.querySelector('[data-action=cfgPresetSave]') || node.querySelector('[onclick*="cmsSaveAsDefault"]')) {
        groups[4].push(node);
      }
    });
    var select = groups[0][0].querySelector('#cfg-' + kind + 'Template');
    var gallery = groups[0][0].querySelector('#cfg-' + kind + 'Template-preview');
    var picker = document.createElement('details');
    picker.className = 'an-template-picker';
    picker.innerHTML = '<summary><span><strong data-template-label></strong><small>Designvorlagen · Auswahl öffnen</small></span></summary>';
    gallery.className = 'an-choices an-template-gallery';
    gallery.querySelectorAll('button').forEach(function (button) {
      button.className = 'cms-wp-preview an-choice-body';
      var active = document.createElement('span'); active.className = 'an-choice-active'; active.textContent = '✓ Aktiv'; button.appendChild(active);
    });
    picker.appendChild(gallery); groups[0][0].appendChild(picker);
    select.closest('label').classList.add('an-sr-only');
    function update() {
      picker.querySelector('[data-template-label]').textContent = select.options[select.selectedIndex].textContent;
      gallery.querySelectorAll('button').forEach(function (button) {
        var active = button.dataset.value === select.value;
        button.classList.toggle('active', active);
        button.setAttribute('aria-pressed', String(active));
      });
    }
    select.addEventListener('change', update);
    gallery.addEventListener('click', function () { update(); });
    update();
    workspace(root, { kind: kind, title: kind === 'plakat' ? 'Plakat-Design' : 'Einzelflyer-Design',
      groups: groups, preview: preview, actions: actions });
    history.bind(actions, root);
    moveColorResets(root);
  }
  function mountHomepage(root, changes) {
    if (root.dataset.designer) return;
    var preview = root.querySelector('#hpang-preview-wrap').parentElement;
    preview.style.removeProperty('overflow');
    preview.style.marginBottom = '0';
    var actions = root.querySelector('[data-action=hpangSave]').parentElement, groups = [[], [], []];
    root.querySelectorAll('.cms-cfg-grid .cms-card').forEach(function (card) {
      var section = document.createElement('fieldset'), legend = document.createElement('legend');
      section.className = 'an-choice-group';
      legend.textContent = card.querySelector('.cms-card-header').textContent.trim(); section.appendChild(legend);
      var body = card.querySelector('.cms-card-body');
      var index = card.querySelector('#hpang-tagBg') ? 1 : card.querySelector('#hpang-cardRadius') ? 2 : 0;
      while (body.firstChild) section.appendChild(body.firstChild);
      groups[index].push(section);
    });
    workspace(root, { kind: 'homepage', title: 'Homepage-Sonderangebote',
      tabs: ['Farben', 'Preis-Tag', 'Layout'], groups: groups, preview: preview, actions: actions });
    changes.bind(actions, root);
  }
  async function mount(root) {
    if (!root || root.dataset.mounted) return;
    root.dataset.mounted = 'true'; root.classList.add('an-design');
    root.innerHTML = '<p role="status">Die Getränkeflyer-Einstellungen werden geladen …</p>';
    try {
      var result = await M.request('/api/angebote-verwaltung?view=design'), design = result.design, kind = 'drinks', mode = 'paper', ticket = 0, surface = null;
      var products = [], productsMessage = 'Produktbilder werden geladen …', productsLoading = false, productsFailed = false;
      var changes = history(function () {
        var value = M.clone(design); delete value.version; return value;
      }, function (value) {
        design = Object.assign(value, { version: design.version });
        refreshFields(); renderPresets(); preview().catch(M.error);
        root.querySelector('[data-design-status]').textContent = 'Geändert · noch nicht gespeichert';
      });
      function renderPresets() {
        var select = root.querySelector('[data-preset-select]'), presets = design.presets || [];
        select.innerHTML = '<option value="">Eigene Vorlage wählen</option>' + presets.map(function (preset, index) {
          return '<option value="' + index + '">' + M.esc(preset.name) + '</option>';
        }).join('');
      }
      function productStatus() {
        var status = root.querySelector('[data-design-products]');
        status.textContent = productsMessage;
        status.setAttribute('role', productsFailed ? 'alert' : 'status');
        root.querySelector('[data-design-products-retry]').hidden = !productsFailed;
      }
      async function loadProducts() {
        if (productsLoading) return;
        productsLoading = true; productsFailed = false; productsMessage = 'Produktbilder werden geladen …'; productStatus();
        try {
          var actions = await window.AngeboteDataverse.load();
          var items = actions.filter(function (action) { return action.data.kind === 'drinks'; })
            .flatMap(function (action) { return action.data.items; }).slice(0, 6).map(M.clone);
          var failures = 0, missing = 0;
          await Promise.all(items.map(async function (item) {
            try {
              if (!item.image_id) {
                var found = await window.AngeboteDataverse.findImage(item);
                if (found) item.image_id = found.image_id;
              }
              if (item.image_id) await M.image(item.image_id); else missing++;
            } catch (error) {
              failures++; item.image_id = ''; console.error('[Angebote] Getränkedesign-Produktbild', error);
            }
          }));
          products = items; productsFailed = failures > 0;
          productsMessage = failures ? 'Nicht alle Produktbilder konnten geladen werden. Die Gestaltung bleibt erhalten.'
            : !items.length ? 'Keine Getränkeartikel vorhanden · die Vorschau zeigt weiterhin beschriftete Beispieldaten.'
              : missing ? 'Vorhandene Getränkeartikel · für ' + missing + ' Artikel ist kein Produktbild hinterlegt.'
                : 'Vorhandene Getränkeartikel mit Produktbildern · nur Vorschau, keine Änderung der Angebote.';
          await preview();
        } catch (error) {
          productsFailed = true; productsMessage = 'Die Vorschauartikel konnten nicht geladen werden. Die Gestaltung bleibt erhalten.';
          console.error('[Angebote] Getränkedesign-Vorschauartikel', error);
        } finally { productsLoading = false; productStatus(); }
      }
      function fieldGroups(fields) {
        var fine = fields.querySelector('.an-fine:not(.an-more-design)'), extra = fields.querySelector('.an-more-design');
        fine.querySelector('summary').remove(); extra.querySelector('summary').remove();
        return [Array.from(fields.querySelectorAll(':scope>.an-choice-group')),
          [fields.querySelector('.an-settings-heading'), fields.querySelector(':scope>.an-fields')],
          Array.from(fine.childNodes), Array.from(extra.childNodes)];
      }
      function refreshFields() {
        var fields = document.createElement('div'); fields.innerHTML = controls(design[kind]);
        fieldGroups(fields.firstElementChild).forEach(function (nodes, index) {
          root.querySelector('[data-designer-panel="' + index + '"]').replaceChildren.apply(
            root.querySelector('[data-designer-panel="' + index + '"]'), nodes);
        });
        if (root._objectProperties) root._objectProperties.refresh();
      }
      function html() {
        if (root._designerUi) root._designerUi.destroy();
        if (surface) surface.destroy();
        surface = null;
        root.innerHTML = '<div class="an-note">Speichern ersetzt den bisherigen Startstandard für neue Getränkeaktionen – nicht die eingebauten Vorlagen. Bestehende Flyer und veröffentlichte Angebote bleiben unverändert. Für eine bestehende Aktion: Aktion öffnen, Gestaltung → Ausgabeziel wählen → „Designstandards übernehmen“, dann speichern und veröffentlichen.</div>'
          + '<div class="an-design-layout"><section class="an-card"><h2>Getränkeflyer-Design</h2>'
          + '<p>Standards für Getränkeangebote. Wochenangebote verwenden die gespeicherten Originalvorlagen aus dem <a href="/cms.html?tab=cfg">CMS-Wochenangebotsdesign</a>.</p>'
          + '<div data-design-fields>' + controls(design[kind]) + '</div>'
          + '<div class="an-actions"><button type="button" class="an-primary" data-design-save>Designstandards speichern</button>'
          + '<button type="button" data-design-discard>Änderungen verwerfen</button>'
          + '<button type="button" data-design-reset>Vorlage auf Original zurücksetzen</button>'
          + '<button type="button" data-design-copy>Bisherige Flyer-Farben übernehmen</button></div>'
          + '<fieldset class="an-choice-group"><legend>Eigene Designvorlagen</legend>'
          + '<p class="an-muted">Anlegen und Löschen werden erst mit „Designstandards speichern“ dauerhaft übernommen.</p>'
          + '<label class="an-field"><span>Vorlagenname</span><input data-preset-name maxlength="80"></label>'
          + '<div class="an-actions"><button type="button" data-preset-add>+ Vorlage anlegen</button></div>'
          + '<label class="an-field"><span>Eigene Designvorlage</span><select data-preset-select></select></label>'
          + '<div class="an-actions"><button type="button" data-preset-load>Vorlage laden</button>'
          + '<button type="button" data-preset-delete>Vorlage löschen</button></div></fieldset>'
          + '<p data-design-status role="status"></p></section>'
          + '<section class="an-preview"><div class="an-preview-head"><h2>Live-Vorschau · Musterartikel</h2>'
          + '</div>' + previewTabs(mode, 'data-design-mode')
          + '<p data-design-products class="an-muted" role="status"></p><button type="button" data-design-products-retry hidden>Produktbilder erneut laden</button>'
          + '<p class="an-note">Nur die erste Kachel ist als Musterkachel bearbeitbar. Ihre Änderungen gelten automatisch für alle Kacheln dieser Ausgabe. Titel und Logo gelten für die ganze Seite.</p>'
          + '<div data-design-preview></div></section></div>';
        renderPresets();
        var settings = root.querySelector('.an-card'), fields = root.querySelector('[data-design-fields]>div');
        var groups = fieldGroups(fields);
        groups.push([settings.querySelector(':scope>fieldset')]);
        var actions = settings.querySelector(':scope>.an-actions'), status = settings.querySelector('[data-design-status]');
        actions.appendChild(status);
        var note = root.querySelector(':scope>.an-note');
        var workspaceUi = workspace(root, { kind: kind, title: 'Getränkeflyer-Design', groups: groups,
          preview: root.querySelector('.an-preview'), actions: actions });
        changes.bind(actions, root);
        workspaceUi.help.appendChild(note); compactHelp(workspaceUi.help, workspaceUi.help);
        var link = root.parentElement.querySelector(':scope>p');
        if (link) workspaceUi.help.appendChild(link);
        productStatus();
        preview().catch(M.error);
      }
      async function preview() {
        synchronizeTiles(design[kind]);
        var current = ++ticket, data = sample(design[kind], kind, products), host = root.querySelector('[data-design-preview]');
        await previewChoices(root, design[kind], kind);
        if (current !== ticket) return;
        var target = mode === 'paper' ? 'sheet' : mode === 'cards' ? 'card' : 'scale';
        var source = target === 'sheet' ? data.layout.pages[0] : data.layout.targets[target][0];
        var rendered = target === 'sheet' ? await M.render(data, 0, 1) : await M.renderTarget(data, target, data.items[0].id, 1);
        if (current !== ticket) return;
        if (!surface) {
          surface = window.AngeboteVorschauEditor.mount(host, {
            toolsHost: root.querySelector('.an-designer-direct'),
            begin: changes.begin, end: changes.end,
            change: function (element, delta) {
              if (delta.dx) delta.dx /= element.unitScale;
              if (delta.dy) delta.dy /= element.unitScale;
              M.updateAdjustment(design[kind], element.id, delta);
              root.querySelector('[data-design-status]').textContent = 'Geändert · noch nicht gespeichert';
              preview().catch(M.error);
              changes.record();
            }
          });
          compactHelp(root.querySelector('.an-designer-direct'), root.querySelector('.an-designer-help'));
        }
        var canvas = rendered.canvas, width = canvas.width, height = canvas.height, ratio = 1, offsetX = 0, offsetY = 0;
        if (mode === 'scale-small') {
          var fitted = document.createElement('canvas'); fitted.width = 800; fitted.height = 280;
          var ctx = fitted.getContext('2d'); ctx.fillStyle = data.layout.background; ctx.fillRect(0, 0, 800, 280);
          ratio = Math.min(800 / width, 280 / height); offsetX = (800 - width * ratio) / 2; offsetY = (280 - height * ratio) / 2;
          ctx.drawImage(canvas, offsetX, offsetY, width * ratio, height * ratio); canvas = fitted; width = 800; height = 280;
        }
        canvas.setAttribute('aria-label', 'Live-Vorschau der Designstandards');
        surface.update(canvas, source.elements.filter(function (element) {
          return !element.hidden && (!element.item_id || element.item_id === data.items[0].id);
        }).map(function (element) {
          return { id: M.adjustmentKey(data, target, element, source.elements), type: element.type, label: elementLabels[element.type] + (element.item_id ? ' · ' + (data.items.findIndex(function (it) { return it.id === element.item_id; }) + 1) : ''),
            x: element.x * ratio + offsetX, y: element.y * ratio + offsetY, w: element.w * ratio, h: element.h * ratio, rotation: element.rotation, unitScale: ratio };
        }), width, height);
      }
      root.addEventListener('change', function (e) {
        if (change(design[kind], e.target)) { preview().catch(M.error); changes.record(); }
        if (e.target.dataset.style) root.querySelector('[data-design-status]').textContent = 'Geändert · noch nicht gespeichert';
      });
      root.addEventListener('click', async function (e) {
        if (e.target.closest('[data-design-products-retry]')) { await loadProducts(); return; }
        var tab = e.target.closest('[data-design-mode]');
        if (tab) { mode = tab.dataset.designMode; selectPreview(root, mode, 'data-design-mode'); preview().catch(M.error); return; }
        if (e.target.closest('[data-design-discard]')) {
          if (!(await M.dialog('Änderungen verwerfen?', 'Ungespeicherte Gestaltung und Änderungen an eigenen Vorlagen werden verworfen.', 'Änderungen verwerfen'))) return;
          try {
            design = (await M.request('/api/angebote-verwaltung?view=design')).design;
            html(); changes.reset(); root.querySelector('[data-design-status]').textContent = 'Gespeicherter Stand wiederhergestellt';
          } catch (error) { await M.error(error); }
          return;
        }
        if (e.target.closest('[data-preset-add]')) {
          var name = root.querySelector('[data-preset-name]').value.trim();
          if (!name) { await M.dialog('Vorlagenname fehlt', 'Bitte einen Namen für die eigene Designvorlage eingeben.'); return; }
          var presets = design.presets || [], index = presets.findIndex(function (preset) { return preset.name === name; });
          if (index >= 0 && !(await M.dialog('Vorlage ersetzen?', 'Die eigene Vorlage „' + name + '“ wird durch die aktuelle Gestaltung ersetzt.', 'Vorlage ersetzen'))) return;
          if (index < 0 && presets.length >= 99) { await M.dialog('Vorlagenliste ist voll', 'Bitte zuerst eine nicht mehr benötigte eigene Vorlage löschen.'); return; }
          synchronizeTiles(design[kind]);
          var layout = M.clone(design[kind]); layout.pages = []; layout.targets = { card: [], single: [], scale: [] };
          var preset = { name: name, layout: layout };
          if (index >= 0) presets[index] = preset; else presets.push(preset);
          design.presets = presets; renderPresets();
          changes.record();
          root.querySelector('[data-design-status]').textContent = 'Vorlage angelegt · bitte Designstandards speichern';
          return;
        }
        if (e.target.closest('[data-preset-load],[data-preset-delete]')) {
          var selected = root.querySelector('[data-preset-select]').value;
          if (selected === '') { await M.dialog('Vorlage auswählen', 'Bitte zuerst eine eigene Designvorlage auswählen.'); return; }
          var entry = design.presets[Number(selected)];
          if (e.target.closest('[data-preset-delete]')) {
            if (!(await M.dialog('Vorlage löschen?', 'Die eigene Vorlage „' + entry.name + '“ wird aus der Liste entfernt.', 'Vorlage löschen'))) return;
            design.presets.splice(Number(selected), 1); renderPresets();
          } else {
            design[kind] = M.clone(entry.layout);
            refreshFields();
            preview().catch(M.error);
          }
          root.querySelector('[data-design-status]').textContent = 'Geändert · bitte Designstandards speichern';
          changes.record();
          return;
        }
        if (e.target.closest('[data-design-reset]')) {
          if (!(await M.dialog('Vorlage auf Original zurücksetzen?', 'Farben, Größen, Ersparnismarker und freie Anpassungen werden in der Vorschau auf die Originalwerte der ausgewählten Vorlage zurückgesetzt. Erst „Designstandards speichern“ übernimmt dies als Startstandard für neue Aktionen. Bestehende Flyer bleiben erhalten.', 'Vorschau zurücksetzen'))) return;
          var reset = M.blank(kind).layout; M.useTemplate(reset, design[kind].template);
          design[kind] = reset; refreshFields();
          root.querySelector('[data-design-status]').textContent = 'Originalwerte in der Vorschau · noch nicht gespeichert';
          try { await preview(); } catch (error) { await M.error(error); }
          changes.record();
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
            refreshFields();
            root.querySelector('[data-design-status]').textContent = 'Übernommen · bitte Designstandards speichern';
            await preview();
            changes.record();
          } else {
            synchronizeTiles(design[kind]);
            var saved = await M.request('/api/angebote-verwaltung?view=design', M.json('PUT', { version: design.version, data: design }));
            design = saved.design;
            root.querySelector('[data-design-status]').textContent = 'Designstandards gespeichert. Bestehende Aktionen wurden nicht verändert.';
          }
        } catch (error) { await M.error(error); }
        finally { button.disabled = false; }
      });
      html();
      changes.reset();
      loadProducts();
    } catch (e) {
      delete root.dataset.mounted;
      root.innerHTML = '<p class="an-status an-error" role="alert">Die Designstandards konnten nicht geladen werden.</p><button type="button">Erneut versuchen</button>';
      root.querySelector('button').onclick = function () { mount(root); };
      await M.error(e);
    }
  }
  return { mount: mount, mountCms: mountCms, mountHomepage: mountHomepage, mountShared: mountShared, prepareCms: prepareCms, compactHelp: compactHelp,
    pictureViewport: pictureViewport, history: history, historyShortcut: historyShortcut,
    split: split, compactActions: compactActions, objectProperties: objectProperties,
    expandGroups: expandGroups,
    fullscreen: fullscreen,
    controls: controls, change: change, previewChoices: previewChoices,
    previewTabs: previewTabs, selectPreview: selectPreview, outputPreview: outputPreview, cards: cards };
})();
