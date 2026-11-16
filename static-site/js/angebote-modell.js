/* Ein Daten-/Gestaltungsmodell fuer Editor, Kundenansicht, Papier und Waage. */
window.AngeboteModel = (function () {
  'use strict';
  var W = 794, H = 1123;
  var imageCache = new Map();
  var cmsImages = new Map();
  var theme = {
    font: 'Arial', title_color: '#234c38', text_color: '#24362d',
    card_background: '#ffffff', price_background: '#ffffff', price_shape: 'rect',
    name_size: 24, price_size: 58, details_size: 17,     image_rotation: 0, image_scale: 100, marker_type: 'starburst', marker_palette: 'harmonie', marker_scale: 100
  };
  var templateStyles = [
    { id: 'land', label: 'Landladen', settings: Object.assign({}, theme, { color: '#bb421e', background: '#fffdf6' }) },
    { id: 'classic', label: 'Klassisch', settings: Object.assign({}, theme, { color: '#bb421e', background: '#ffffff' }) },
    { id: 'classic-red', label: 'Classic Red', original: true,
      settings: { background: '#f4f1ea', title_color: '#a51d2d', color: '#a51d2d', card_background: '#ffffff', text_color: '#1a1a1a', price_background: '#a51d2d', price_shape: 'round' } },
    { id: 'minimal-clean', label: 'Minimal Clean', original: true,
      settings: { background: '#ffffff', title_color: '#111827', color: '#047857', card_background: '#ffffff', text_color: '#1a1a1a', price_background: '#047857', price_shape: 'round' } },
    { id: 'dark-modern', label: 'Dark Modern', original: true,
      settings: { background: '#0f172a', title_color: '#e5e7eb', color: '#0ea5e9', card_background: '#f5f5f5', text_color: '#111827', price_background: '#0ea5e9', price_shape: 'round' } },
    { id: 'organic-market', label: 'Organic Market', original: true,
      settings: { background: '#f7f2e7', title_color: '#355e3b', color: '#8b1e3f', card_background: '#fffdf8', text_color: '#2f3d2f', price_background: '#8b1e3f', price_shape: 'round' } },
    { id: 'bold-poster', label: 'Bold Poster', original: true,
      settings: { background: '#fff7ed', title_color: '#b91c1c', color: '#ea580c', card_background: '#fffaf2', text_color: '#7c2d12', price_background: '#ea580c', price_shape: 'rect' } },
    { id: 'modern-magazine', label: 'Modern Magazine', original: true, magazine: true, header: '#d6e5d0', accent: '#8aad7e',
      settings: { background: '#edf4ea', title_color: '#5e7057', color: '#6f835f', card_background: '#f6fbf5', text_color: '#2c3a2a', price_background: '#eaf3e6', price_shape: 'round' } },
    { id: 'modern-mag-fresh', label: 'Mag Fresh (Türkis)', original: true, magazine: true, header: '#cffafe', accent: '#06b6d4',
      settings: { background: '#e8f6f8', title_color: '#0e7490', color: '#0891b2', card_background: '#f0fdfa', text_color: '#134e4a', price_background: '#ecfeff', price_shape: 'round' } },
    { id: 'modern-mag-bold', label: 'Mag Bold (Violett)', original: true, magazine: true, header: '#ede9fe', accent: '#8b5cf6',
      settings: { background: '#faf5ff', title_color: '#7c3aed', color: '#db2777', card_background: '#fefcff', text_color: '#1e1b4b', price_background: '#f5f3ff', price_shape: 'round' } },
    { id: 'modern-mag-xl', label: 'Mag XL (Großbild)', original: true, magazine: true, xl: true, header: '#dbeafe', accent: '#3b82f6',
      settings: { background: '#f0f4f8', title_color: '#1e40af', color: '#2563eb', card_background: '#ffffff', text_color: '#1e293b', price_background: '#eff6ff', price_shape: 'round' } },
    { id: 'half-red', label: 'Bild 50 % · Rot', original: true, half: true,
      settings: { background: '#f6f1ea', title_color: '#a51d2d', color: '#a51d2d', card_background: '#ffffff', text_color: '#1f1a1a', price_background: '#a51d2d', price_shape: 'round' } },
    { id: 'half-green', label: 'Bild 50 % · Grün', original: true, half: true,
      settings: { background: '#f2f6ee', title_color: '#234c38', color: '#2f7d4f', card_background: '#ffffff', text_color: '#1f2d24', price_background: '#2f7d4f', price_shape: 'round' } },
    { id: 'half-blue', label: 'Bild 50 % · Blau', original: true, half: true,
      settings: { background: '#eef3f9', title_color: '#1e3a8a', color: '#2563eb', card_background: '#ffffff', text_color: '#1e293b', price_background: '#2563eb', price_shape: 'round' } },
    { id: 'tag-red', label: 'Preisschild · Rot', original: true, tag: true, soft: '#f4f0ea',
      settings: { background: '#f1eee8', title_color: '#a51d2d', color: '#a51d2d', card_background: '#ffffff', text_color: '#1a1a1a', price_background: '#a51d2d', price_shape: 'rect' } },
    { id: 'tag-green', label: 'Preisschild · Grün', original: true, tag: true, soft: '#eef3ea',
      settings: { background: '#f2f6ee', title_color: '#234c38', color: '#2f7d4f', card_background: '#ffffff', text_color: '#1f2d24', price_background: '#2f7d4f', price_shape: 'rect' } },
    { id: 'tag-blue', label: 'Preisschild · Blau', original: true, tag: true, soft: '#eaf0f8',
      settings: { background: '#eef3f9', title_color: '#1e3a8a', color: '#2563eb', card_background: '#ffffff', text_color: '#1e293b', price_background: '#2563eb', price_shape: 'rect' } }
  ];
  function templateStyle(id) {
    var style = templateStyles.find(function (entry) { return entry.id === id; });
    if (!style) throw problem('Diese Designvorlage ist nicht verfügbar. Bitte eine andere wählen.');
    return style;
  }
  function useTemplate(layout, id) { Object.assign(layout, templateStyle(id).settings, { template: id }); }
  function preserveBackgrounds(data) {
    data.layout.pages.forEach(function (page) { if (!page.background) page.background = data.layout.background; });
    Object.values(data.layout.targets || {}).forEach(function (targets) {
      targets.forEach(function (target) { if (!target.background) target.background = data.layout.background; });
    });
  }
  function savings(item) {
    if (!(item.price_cents > 0 && item.old_price_cents > item.price_cents)) return null;
    return Math.round((1 - item.price_cents / item.old_price_cents) * 100) || null;
  }
  function priceColor(layout) {
    var value = layout.price_background.slice(1);
    var lightness = parseInt(value.slice(0, 2), 16) * 299 + parseInt(value.slice(2, 4), 16) * 587 + parseInt(value.slice(4, 6), 16) * 114;
    return lightness >= 160000 ? layout.color : '#ffffff';
  }
  function uid() { return crypto.randomUUID().replace(/-/g, ''); }
  function clone(value) { return structuredClone(value); }
  function problem(message) { var e = new Error(message); e.userMessage = message; return e; }
  function dialog(title, text, confirmText) {
    return new Promise(function (resolve) {
      var previous = document.activeElement;
      var dlg = document.createElement('dialog'); dlg.className = 'an-dialog';
      var h = document.createElement('h2'); h.textContent = title;
      var p = document.createElement('p'); p.textContent = text;
      var actions = document.createElement('div'); actions.className = 'an-actions';
      var close = document.createElement('button'); close.type = 'button'; close.textContent = confirmText ? 'Abbrechen' : 'Schließen';
      actions.appendChild(close);
      function finish(value) { dlg.close(); dlg.remove(); if (previous && previous.isConnected) previous.focus(); resolve(value); }
      close.onclick = function () { finish(false); };
      if (confirmText) {
        var ok = document.createElement('button'); ok.type = 'button'; ok.className = 'an-primary'; ok.textContent = confirmText;
        ok.onclick = function () { finish(true); }; actions.appendChild(ok);
      }
      dlg.append(h, p, actions); dlg.addEventListener('cancel', function (e) { e.preventDefault(); finish(false); });
      document.body.appendChild(dlg); dlg.showModal();
    });
  }
  function error(e) {
    console.error('[Angebote]', e);
    return dialog('Das hat leider nicht geklappt', e.userMessage || 'Die Aktion konnte nicht abgeschlossen werden. Bitte die Verbindung prüfen und erneut versuchen.');
  }
  function esc(value) {
    return String(value == null ? '' : value).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function money(cents) {
    return cents == null ? '—' : (cents / 100).toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }
  function cents(input) {
    var value = String(input).trim().replace(',', '.');
    if (!/^\d+(?:\.\d{1,2})?$/.test(value)) return null;
    return Math.round(Number(value) * 100);
  }
  function litres(millilitres) {
    return millilitres == null ? '' : (millilitres / 1000).toLocaleString('de-DE', { useGrouping: false, maximumFractionDigits: 3 });
  }
  function millilitres(input) {
    var value = String(input).trim().replace(',', '.');
    if (!/^\d+(?:\.\d{1,3})?$/.test(value)) return null;
    var result = Math.round(Number(value) * 1000);
    return Number.isSafeInteger(result) && result > 0 ? result : null;
  }
  function base(item) {
    var volume = item.units * item.volume_ml;
    return volume && item.price_cents != null ? Math.floor((2 * item.price_cents * 1000 + volume) / (2 * volume)) : null;
  }
  function pack(item) {
    if (!item.units || !item.volume_ml) return item.packaging || 'Gebinde bitte ergänzen';
    return item.units + ' × ' + litres(item.volume_ml) + ' l · ' + (item.packaging || 'Gebindeart ergänzen');
  }
  function date(value) { return value ? value.split('-').reverse().join('.') : 'Datum ergänzen'; }
  function cardHTML(data, it) {
    var l = data.layout || theme;
    if (data.layout.targets && data.layout.targets.card &&
        data.layout.targets.card.some(function (target) { return target.item_id === it.id; })) {
      return '<article class="an-product an-custom-card" aria-label="' + esc(it.name) + '"><canvas data-card-item="'
        + esc(it.id) + '" width="420" height="480" aria-label="' + esc(it.name) + '"></canvas><span class="an-sr-only">'
        + esc(it.name) + (data.kind === 'drinks' ? ' · ' + esc(pack(it)) + ' · ' : ' · ')
        + money(it.price_cents) + ' €' + (data.kind === 'drinks' ? ' · '
          + (it.deposit_free ? 'Pfandfrei' : 'zzgl. ' + money(it.deposit_cents) + ' € Pfand')
          + ' · 1 l = ' + money(base(it)) + ' €' : '') + '</span></article>';
    }
    return '<article class="an-product" style="--an-price:' + esc(l.color || '#bb421e') + ';--an-text:' + esc(l.text_color || '#24362d')
      + ';--an-card-bg:' + esc(l.card_background || '#ffffff') + ';--an-font:' + esc(l.font || 'Arial') + '">'
      + (it.image_id ? '<img src="/api/angebote-bilder/' + encodeURIComponent(it.image_id) + '" alt="' + esc(it.name) + '" loading="lazy">' : '<div class="an-no-image">Kein Produktbild</div>')
      + '<h3>' + esc(it.name) + '</h3>'
      + (data.kind === 'drinks' ? '<p>' + esc(pack(it)) + '</p>' : '')
      + (it.description ? '<p>' + esc(it.description) + '</p>' : '')
      + '<div class="an-price">' + money(it.price_cents) + ' €</div>'
      + (it.old_price_cents != null ? '<div class="an-old-price">statt ' + money(it.old_price_cents) + ' €</div>' : '')
      + (data.kind === 'drinks' ? '<p>' + (it.deposit_free ? 'Pfandfrei' : 'zzgl. ' + money(it.deposit_cents) + ' € Pfand') + '</p><p>1 l = ' + money(base(it)) + ' €</p>' : '')
      + '<p class="an-muted">' + date(data.valid_from) + ' – ' + date(data.valid_to) + '</p></article>';
  }
  function today() { return new Intl.DateTimeFormat('sv-SE', { timeZone: 'Europe/Berlin' }).format(new Date()); }
  function blank(kind, defaults) {
    return { kind: kind, title: kind === 'drinks' ? 'Unsere Getränkeangebote' : 'Unsere Wochenangebote',
      valid_from: today(), valid_to: today(), items: [],
      layout: Object.assign({}, theme, { mode: 'template', template: 'land', density: 4, color: '#bb421e',
        background: '#fffdf6', pages: [], targets: { card: [], single: [], scale: [] } }, clone(defaults || {})) };
  }
  function item() {
    return { id: uid(), name: '', article_number: '', barcode: '', retail_price_cents: null,
      description: '', price_cents: null, old_price_cents: null,
      units: null, volume_ml: null, packaging: '', deposit_cents: null, deposit_free: false, highlight: false, image_id: '' };
  }
  async function request(url, options) {
    var controller = new AbortController();
    var timeout = setTimeout(function () { controller.abort(); }, 60000);
    try {
      var r = await fetch(url, Object.assign({ cache: 'no-store', signal: controller.signal }, options));
      var data;
      try { data = await r.json(); }
      catch (e) { console.error('[Angebote] Ungültige Antwort', r.status, e); throw problem('Der Angebotsbereich hat nicht wie erwartet geantwortet. Bitte erneut versuchen.'); }
      if (!r.ok || data.success === false) {
        var action = /^\/api\/angebote\?action=(?:save|delete)(?:&|$)/.test(url);
        var friendly = /^\/api\/angebote-/.test(url);
        var message = 'Die Angebote konnten nicht geladen oder gespeichert werden.';
        if (action) {
          console.error('[Angebote] Aktion', r.status, data.error);
          message = r.status === 409 ? 'Die Aktion wurde zwischenzeitlich geändert. Bitte erneut öffnen.'
            : r.status === 400 ? 'Die Aktion enthält ungültige Angaben. Bitte Artikel, Preise und Zeitraum prüfen.'
            : r.status === 401 || r.status === 403 ? 'Bitte erneut im CMS anmelden, um Angebote zu speichern.'
            : 'Die Aktion konnte gerade nicht gespeichert werden. Bitte später erneut versuchen.';
        } else if (friendly && data.error) message = data.error;
        var error = problem(message);
        error.status = r.status;
        throw error;
      }
      return data;
    } finally { clearTimeout(timeout); }
  }
  function json(method, body) { return { method: method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }; }
  function el(type, x, y, w, h, extra) {
    return Object.assign({ id: uid(), type: type, x: x, y: y, w: w, h: h, rotation: 0,
      opacity: 1, hidden: false, font: 'Arial', font_size: 20, bold: false, align: 'left',
      fill: '', text: '', item_id: '', image_id: '', image_scale: 100, shape: 'rect' }, extra);
  }
  function templates(data) {
    var l = data.layout, density = l.density, compact = density === 6, pages = [], style = templateStyle(l.template);
    for (var start = 0; start < Math.max(1, data.items.length); start += density) {
      var elements = [];
      if (style.magazine) {
        elements.push(el('shape', 0, 0, W, 170, { fill: style.header }),
          el('shape', 0, 170, W, 3, { fill: style.accent }),
          el('logo', 28, 45, 185, 80),
          el('title', 226, 60, 360, 50, { font_size: 40, bold: true, fill: l.title_color, font: l.font }),
          el('period', 598, 67, 168, 36, { font_size: 15, align: 'right', fill: l.title_color, font: l.font }));
      } else {
        if (!style.original) elements.push(el('brand', 40, 28, 440, 30, { font_size: 18, bold: true, fill: l.title_color, font: l.font }));
        elements.push(el('logo', 518, 28, 236, 70),
          el('title', 40, style.original ? 30 : 65, 450, 72, { font_size: style.original ? 50 : 43, bold: true, fill: style.original ? l.title_color : l.color, font: l.font }),
          el('period', 40, 143, 714, 28, { font_size: 17, fill: style.original ? l.title_color : l.text_color, font: l.font }));
      }
      elements.push(el('footer', 40, 1060, 714, 40, { font_size: 13, align: 'center', fill: style.original ? l.title_color : l.text_color, font: l.font }));
      data.items.slice(start, start + density).forEach(function (it, n) {
        var x = 40 + (n % 2) * 365, y = 190 + Math.floor(n / 2) * (compact ? 282 : 427);
        var h = compact ? 264 : 407;
        var shared = { item_id: it.id, font: l.font, fill: l.text_color };
        function bound(role, dx, dy, width, height, size, extra) {
          elements.push(el(role, x + dx, y + dy, width, height,
            Object.assign({}, shared, { font_size: size }, extra)));
        }
        elements.push(el('shape', x, y, 349, h, { item_id: it.id, fill: it.highlight ? '#f2ead8' : l.card_background, shape: l.template === 'classic' ? 'rect' : 'round' }));
        if (style.tag) {
          var tagTop = compact ? 68 : 84, tagHeight = compact ? 138 : 250;
          bound('name', 16, compact ? 8 : 10, 317, compact ? 36 : 44, Math.min(l.name_size, compact ? 20 : 26), { bold: true });
          if (data.kind === 'drinks') bound('pack', 16, compact ? 44 : 56, 317, 20, 15);
          else bound('description', 16, compact ? 44 : 56, 317, 20, 15);
          elements.push(el('shape', x + 12, y + tagTop, 325, tagHeight, { item_id: it.id, fill: style.soft, shape: 'round' }));
          bound('image', 12, tagTop, compact ? 190 : 230, tagHeight, 20, { rotation: l.image_rotation, image_scale: l.image_scale });
          var tagBox = compact ? { x: 188, y: 104, w: 140, h: 56, pad: 8 } : { x: 206, y: 174, w: 124, h: 66, pad: 8 };
          elements.push(el('shape', x + tagBox.x, y + tagBox.y, tagBox.w, tagBox.h, { item_id: it.id, fill: l.price_background, shape: l.price_shape, rotation: -6 }));
          bound('price', tagBox.x + tagBox.pad, tagBox.y + tagBox.pad, tagBox.w - 2 * tagBox.pad, tagBox.h - 2 * tagBox.pad, Math.min(l.price_size, compact ? 30 : 34), { bold: true, align: 'center', fill: priceColor(l), rotation: -6 });
          bound('old_price', tagBox.x, tagBox.y + tagBox.h + (compact ? 8 : 10), tagBox.w, compact ? 24 : 26, compact ? 15 : 16, { align: 'center' });
          if (data.kind === 'drinks') {
            bound('deposit', 18, compact ? 212 : 342, 313, compact ? 18 : 24, compact ? 14 : 16);
            bound('base', 18, compact ? 232 : 368, 313, compact ? 18 : 24, compact ? 14 : 16);
          }
          bound('discount', compact ? 194 : 210, compact ? 74 : 128, compact ? 70 : 82, compact ? 54 : 64, 16, { bold: true, align: 'center', fill: '#ffffff' });
          return;
        }
        if (style.half) {
          var half = { name: compact ? 18 : 24, pack: compact ? 14 : 16, price: compact ? 40 : 58, note: compact ? 14 : 16 };
          var rowTop = compact ? 152 : 240, rowHeight = compact ? 46 : 70;
          bound('image', 12, 12, 174, compact ? 124 : 214, 20, { rotation: l.image_rotation, image_scale: l.image_scale });
          bound('name', 198, 12, 139, compact ? 58 : 96, Math.min(l.name_size, half.name), { bold: true });
          if (data.kind === 'drinks') bound('pack', 198, compact ? 74 : 112, 139, compact ? 56 : 72, half.pack);
          else bound('description', 198, compact ? 74 : 112, 139, compact ? 56 : 100, half.pack);
          elements.push(el('shape', x + 12, y + rowTop - 6, 325, rowHeight + 12, { item_id: it.id, fill: l.price_background, shape: l.price_shape }));
          bound('price', 24, rowTop, 205, rowHeight, Math.min(l.price_size, half.price), { bold: true, fill: priceColor(l) });
          bound('old_price', 236, rowTop + (compact ? 8 : 14), 96, compact ? 30 : 42, 18, { fill: priceColor(l) });
          if (data.kind === 'drinks') {
            bound('deposit', 18, compact ? 212 : 332, 313, compact ? 18 : 24, half.note);
            bound('base', 18, compact ? 232 : 360, 313, compact ? 18 : 24, half.note);
          }
          bound('discount', 14, 12, 80, 60, 16, { bold: true, align: 'center', fill: '#ffffff' });
          return;
        }
        if (style.magazine) {
          var imageHeight = compact ? (style.xl ? 90 : 74) : (style.xl ? 178 : 145);
          bound('image', 14, 12, 321, imageHeight, 20, { rotation: l.image_rotation, image_scale: l.image_scale });
          bound('name', 16, imageHeight + 20, 317, compact ? 40 : 60, Math.min(l.name_size, compact ? 22 : 28), { bold: true });
          if (data.kind === 'drinks') bound('pack', 16, compact ? 151 : 260, 317, compact ? 22 : 24, Math.min(l.details_size, 18));
        } else {
          bound('image', 14, 14, 122, compact ? 110 : 160, 20, { rotation: l.image_rotation, image_scale: l.image_scale });
          bound('name', 148, 18, 185, compact ? 75 : 100, Math.min(l.name_size, compact ? 22 : 28), { bold: true });
          if (data.kind === 'drinks') bound('pack', 148, compact ? 98 : 130, 185, compact ? 40 : 55, Math.min(l.details_size, 18));
          if (!compact) bound('description', 16, 200, 317, 50, l.details_size);
        }
        var priceY = style.magazine ? (compact ? 180 : 290) : compact ? 149 : 260;
        var priceHeight = style.magazine ? (compact ? 38 : 45) : compact ? 55 : 70;
        elements.push(el('shape', x + 12, y + priceY - 5, 325, style.magazine ? priceHeight + 10 : compact ? 64 : 78,
          { item_id: it.id, fill: l.price_background, shape: l.price_shape }));
        bound('price', 24, priceY, 205, priceHeight, Math.min(l.price_size, style.magazine ? 36 : compact ? 46 : 70), { bold: true, fill: priceColor(l) });
        bound('old_price', 236, priceY + 9, 96, style.magazine ? 30 : 42, 18, { fill: priceColor(l) });
        if (data.kind === 'drinks') {
          bound('deposit', 18, compact ? (style.magazine ? 224 : 212) : 354, 313, compact && style.magazine ? 18 : 24, Math.min(l.details_size, compact && style.magazine ? 14 : 18));
          bound('base', 18, compact ? (style.magazine ? 244 : 237) : 380, 313, compact && style.magazine ? 18 : 24, Math.min(l.details_size, compact && style.magazine ? 14 : 18));
        }
        bound('discount', 14, 12, 80, 60, 16, { bold: true, align: 'center', fill: '#ffffff' });
      });
      pages.push({ elements: elements, background: l.background });
    }
    return pages;
  }
  var targetSizes = { card: { w: 420, h: 480 }, single: { w: 800, h: 1130 }, scale: { w: 800, h: 462 } };
  function targetTemplate(data, target, item) {
    var l = data.layout, id = item.id, elements = [], size = targetSizes[target], style = templateStyle(l.template);
    function add(type, x, y, w, h, fontSize, extra) {
      elements.push(el(type, x, y, w, h, Object.assign({ item_id: id, font_size: fontSize,
        font: l.font, fill: l.text_color }, extra || {})));
    }
    function price(x, y, w, h, fontSize) {
      add('shape', x - 8, y - 6, w + 16, h + 12, 20, { fill: l.price_background, shape: l.price_shape });
      add('price', x, y, w, h, fontSize, { bold: true, fill: priceColor(l) });
    }
    function halfTarget() {
      var shape = l.price_shape, ink = priceColor(l);
      var note = { fill: ink, align: 'right' };
      if (target === 'card') {
        add('shape', 8, 8, 404, 464, 20, { fill: item.highlight ? '#f2ead8' : l.card_background, shape: 'round' });
        add('image', 16, 16, 210, 270, 20, { image_scale: l.image_scale, rotation: l.image_rotation });
        add('name', 242, 16, 162, 120, Math.min(l.name_size, 26), { bold: true });
        if (data.kind === 'drinks') add('pack', 242, 142, 162, 76, 17);
        else add('description', 242, 142, 162, 140, 15);
        add('shape', 16, 302, 388, 70, 20, { fill: l.price_background, shape: shape });
        add('price', 32, 308, 230, 58, Math.min(l.price_size, 48), { bold: true, fill: ink });
        add('old_price', 274, 322, 120, 34, 18, note);
        if (data.kind === 'drinks') {
          add('deposit', 24, 380, 372, 20, 15);
          add('base', 24, 402, 372, 20, 15);
        }
        add('period', 24, 436, 372, 22, 12);
      } else if (target === 'single') {
        add('shape', 20, 20, 760, 1090, 20, { fill: item.highlight ? '#f2ead8' : l.card_background, shape: 'round' });
        add('logo', 520, 44, 230, 80, 20);
        add('image', 40, 140, 400, 600, 20, { image_scale: l.image_scale, rotation: l.image_rotation });
        add('name', 464, 150, 296, 150, Math.min(l.name_size + 18, 46), { bold: true });
        if (data.kind === 'drinks') {
          add('pack', 464, 312, 296, 70, l.details_size + 8);
          if (item.description) add('description', 464, 400, 296, 330, 22);
        } else add('description', 464, 312, 296, 418, 24);
        add('shape', 40, 770, 720, 130, 20, { fill: l.price_background, shape: shape });
        add('price', 60, 782, 440, 106, Math.min(l.price_size + 28, 100), { bold: true, fill: ink });
        add('old_price', 520, 806, 220, 56, 26, note);
        if (data.kind === 'drinks') {
          add('deposit', 44, 925, 706, 44, 24);
          add('base', 44, 975, 706, 44, 24);
        }
        add('period', 44, 1050, 706, 34, 16);
      } else {
        add('shape', 8, 8, 784, 446, 20, { fill: item.highlight ? '#f2ead8' : l.card_background, shape: 'round' });
        add('logo', 614, 12, 158, 44, 20);
        add('image', 22, 24, 400, 414, 20, { image_scale: l.image_scale, rotation: l.image_rotation });
        add('name', 446, 62, 326, 100, Math.min(l.name_size + 14, 40), { bold: true });
        if (data.kind === 'drinks') add('pack', 446, 168, 326, 36, 22);
        else add('description', 446, 168, 326, 36, 20);
        add('shape', 438, 212, 346, 92, 20, { fill: l.price_background, shape: shape });
        add('price', 452, 220, 320, 76, Math.min(l.price_size + 12, 70), { bold: true, fill: ink });
        add('old_price', 446, 312, 326, 30, 20);
        if (data.kind === 'drinks') {
          add('deposit', 446, 348, 326, 28, 18);
          add('base', 446, 378, 326, 28, 18);
        }
        add('period', 446, 418, 326, 24, 14);
      }
    }
    function tagTarget() {
      var soft = style.soft, ink = priceColor(l), round = 'round';
      function tag(box, size) {
        add('shape', box.x, box.y, box.w, box.h, 20, { fill: l.price_background, shape: l.price_shape, rotation: -6 });
        add('price', box.x + box.pad, box.y + (box.padV || box.pad), box.w - 2 * box.pad, box.h - 2 * (box.padV || box.pad), size, { bold: true, align: 'center', fill: ink, rotation: -6 });
        add('old_price', box.x, box.y + box.h + 14, box.w, box.oldHeight, box.oldSize, { align: 'center' });
      }
      if (target === 'card') {
        add('shape', 8, 8, 404, 464, 20, { fill: item.highlight ? '#f2ead8' : l.card_background, shape: round });
        add('name', 24, 20, 372, 44, Math.min(l.name_size, 30), { bold: true });
        if (data.kind === 'drinks') add('pack', 24, 66, 372, 26, 18);
        else add('description', 24, 66, 372, 26, 16);
        add('shape', 16, 104, 388, 260, 20, { fill: soft, shape: round });
        add('image', 16, 104, 250, 260, 20, { image_scale: l.image_scale, rotation: l.image_rotation });
        tag({ x: 240, y: 190, w: 158, h: 80, pad: 10, oldHeight: 28, oldSize: 18 }, Math.min(l.price_size, 44));
        if (data.kind === 'drinks') {
          add('deposit', 24, 376, 372, 22, 15);
          add('base', 24, 400, 372, 22, 15);
        }
        add('period', 24, 436, 372, 22, 12);
      } else if (target === 'single') {
        add('shape', 20, 20, 760, 1090, 20, { fill: item.highlight ? '#f2ead8' : l.card_background, shape: round });
        add('logo', 520, 44, 230, 80, 20);
        add('name', 44, 60, 460, 90, Math.min(l.name_size + 24, 52), { bold: true });
        if (data.kind === 'drinks') add('pack', 44, 156, 460, 44, 28);
        else add('description', 44, 156, 460, 44, 24);
        add('shape', 40, 220, 720, 560, 20, { fill: soft, shape: round });
        add('image', 40, 220, 470, 560, 20, { image_scale: l.image_scale, rotation: l.image_rotation });
        tag({ x: 470, y: 400, w: 270, h: 150, pad: 14, padV: 24, oldHeight: 50, oldSize: 28 }, Math.min(l.price_size + 28, 86));
        if (data.kind === 'drinks') {
          add('deposit', 44, 820, 706, 44, 24);
          add('base', 44, 872, 706, 44, 24);
        }
        add('period', 44, 1040, 706, 34, 16);
      } else {
        add('shape', 8, 8, 784, 446, 20, { fill: item.highlight ? '#f2ead8' : l.card_background, shape: round });
        add('logo', 614, 12, 158, 44, 20);
        add('name', 24, 18, 560, 50, Math.min(l.name_size + 14, 40), { bold: true });
        if (data.kind === 'drinks') add('pack', 24, 72, 560, 32, 22);
        else add('description', 24, 72, 560, 32, 20);
        add('shape', 16, 112, 768, 296, 20, { fill: soft, shape: round });
        add('image', 16, 112, 460, 296, 20, { image_scale: l.image_scale, rotation: l.image_rotation });
        tag({ x: 480, y: 190, w: 280, h: 110, pad: 12, oldHeight: 34, oldSize: 22 }, Math.min(l.price_size + 12, 70));
        add('period', 480, 380, 280, 24, 14, { align: 'center' });
        if (data.kind === 'drinks') {
          add('deposit', 24, 416, 380, 26, 17);
          add('base', 404, 416, 380, 26, 17);
        }
      }
    }
    if (style.half) halfTarget();
    else if (style.tag) tagTarget();
    else if (target === 'card') {
      add('shape', 8, 8, 404, 464, 20, { fill: item.highlight ? '#f2ead8' : l.card_background,
        shape: l.template === 'classic' ? 'rect' : 'round' });
      if (style.magazine) {
        var imageHeight = style.xl ? 184 : 136;
        add('image', 24, 24, 372, imageHeight, 20, { image_scale: l.image_scale, rotation: l.image_rotation });
        add('name', 24, imageHeight + 32, 372, 58, Math.min(l.name_size, 28), { bold: true });
        if (data.kind === 'drinks') add('pack', 24, 278, 372, 28, Math.min(l.details_size, 19));
        price(32, 324, 218, 58, Math.min(l.price_size, 48));
        add('old_price', 266, 340, 122, 34, 16);
      } else {
        add('image', 24, 24, 116, 140, 20, { image_scale: l.image_scale, rotation: l.image_rotation });
        add('name', 154, 24, 242, 76, Math.min(l.name_size, 28), { bold: true });
        if (data.kind === 'drinks') add('pack', 154, 102, 242, 42, Math.min(l.details_size, 19));
        price(154, data.kind === 'drinks' ? 150 : 112, 242, 68, Math.min(l.price_size, 52));
        add('old_price', 154, 230, 242, 28, 16);
        if (item.description) add('description', 24, 276, 372, 46, 15);
      }
      if (data.kind === 'drinks') {
        add('deposit', 24, style.magazine ? 390 : 336, 372, style.magazine ? 18 : 20, 15);
        add('base', 24, style.magazine ? 410 : 368, 372, style.magazine ? 18 : 20, 15);
      }
      add('period', 24, 430, 372, 22, 12);
    } else if (target === 'single') {
      add('shape', 20, 20, 760, 1090, 20, { fill: item.highlight ? '#f2ead8' : l.card_background,
        shape: l.template === 'classic' ? 'rect' : 'round' });
      add('logo', 520, 44, 230, 80, 20);
      if (style.magazine) {
        add('name', 44, 142, 706, 90, Math.min(l.name_size + 18, 60), { bold: true, align: 'center' });
        if (item.description) add('description', 44, 238, 706, 44, 22, { align: 'center' });
        add('image', 44, 292, 706, style.xl ? 440 : 370, 20, { image_scale: l.image_scale, rotation: l.image_rotation });
        if (data.kind === 'drinks') add('pack', 44, style.xl ? 744 : 674, 706, 34, l.details_size + 8);
        price(52, style.xl ? 790 : 730, 460, 90, Math.min(l.price_size + 28, 100));
        add('old_price', 540, style.xl ? 810 : 750, 210, 42, 22);
      } else {
        add('image', 44, 44, 260, 440, 20, { image_scale: l.image_scale, rotation: l.image_rotation });
        add('name', 330, 150, 420, 150, Math.min(l.name_size + 18, 60), { bold: true });
        if (data.kind === 'drinks') add('pack', 330, 306, 420, 60, l.details_size + 8);
        price(330, 376, 420, 132, Math.min(l.price_size + 28, 100));
        add('old_price', 330, 526, 420, 42, 22);
        if (item.description) add('description', 44, 600, 706, 110, 22);
      }
      if (data.kind === 'drinks') {
        add('deposit', 44, 900, 706, 52, 24);
        add('base', 44, 960, 706, 52, 24);
      }
      add('period', 44, 1040, 706, 34, 16);
    } else {
      add('shape', 8, 8, 784, 446, 20, { fill: item.highlight ? '#f2ead8' : l.card_background,
        shape: l.template === 'classic' ? 'rect' : 'round' });
      add('logo', 614, 12, 158, 44, 20);
      add('image', 22, 24, 242, 414, 20, { image_scale: l.image_scale, rotation: l.image_rotation });
      add('name', 286, 62, 486, 72, 50, { bold: true });
      if (data.kind === 'drinks') add('pack', 286, 142, 486, 38, 23);
      price(286, 188, 330, 88, 70);
      add('old_price', 632, 210, 140, 42, 20);
      if (item.description) add('description', 286, 290, 486, 32, 20);
      if (data.kind === 'drinks') {
        add('deposit', 286, 328, 486, 34, 20);
        add('base', 286, 366, 486, 34, 20);
      }
      add('period', 286, 414, 486, 24, 14);
    }
    var badgeY = target === 'single' && style.magazine ? 292 : 24;
    var badge = style.half ? { card: [28, 28, 82, 64], single: [52, 152, 82, 64], scale: [34, 36, 82, 64] }[target]
      : style.tag ? { card: [228, 140, 86, 70], single: [452, 300, 130, 104], scale: [468, 128, 100, 82] }[target] : [24, badgeY, 82, 64];
    add('discount', badge[0], badge[1], badge[2], badge[3], 18, { fill: '#ffffff', bold: true, align: 'center' });
    adjustElements(data, target, elements, size.w, size.h);
    return { item_id: id, elements: elements, background: l.background, width: size.w, height: size.h };
  }
  function ensureTargets(data) {
    if (!data.layout.targets || typeof data.layout.targets !== 'object') {
      data.layout.targets = { card: [], single: [], scale: [] };
    }
    Object.keys(targetSizes).forEach(function (target) {
      var current = data.layout.targets[target] || [];
      var byItem = new Map(current.map(function (entry) { return [entry.item_id, entry]; }));
      data.layout.targets[target] = data.items.map(function (it) {
        return byItem.get(it.id) || targetTemplate(data, target, it);
      });
    });
  }
  function applyTargetTemplate(data, target, itemId) {
    if (!targetSizes[target]) throw problem('Dieses Gestaltungsziel ist nicht verfügbar.');
    ensureTargets(data);
    var it = data.items.find(function (item) { return item.id === itemId; });
    if (!it) throw problem('Bitte zuerst einen Artikel auswählen.');
    var layout = targetTemplate(data, target, it);
    data.layout.targets[target] = data.layout.targets[target].map(function (entry) {
      return entry.item_id === itemId ? layout : entry;
    });
  }
  function applyTemplate(data) {
    if (data.layout.cms) { data.layout.density = 6; syncWeeklyOverrides(data); }
    data.layout.pages = templates(data); data.layout.mode = 'template'; ensureTargets(data);
    data.layout.pages.forEach(function (page) { adjustElements(data, 'sheet', page.elements, W, H); });
  }
  function adjustmentKey(data, target, element, elements) {
    var index = data.items.findIndex(function (it) { return it.id === element.item_id; });
    var matches = elements.filter(function (entry) { return entry.type === element.type && entry.item_id === element.item_id; });
    return target + ':' + (index < 0 ? 'page' : index % data.layout.density) + ':' + element.type + ':' + matches.indexOf(element);
  }
  function updateAdjustment(layout, key, delta) {
    if (!layout.adjustments) layout.adjustments = {};
    var value = layout.adjustments[key] || { dx: 0, dy: 0, scale: 1, rotation: 0 };
    value.dx = Math.max(-1000, Math.min(1000, value.dx + (delta.dx || 0)));
    value.dy = Math.max(-1500, Math.min(1500, value.dy + (delta.dy || 0)));
    value.scale = Math.max(.2, Math.min(3, value.scale * (delta.scale || 1)));
    value.rotation = ((value.rotation + (delta.rotation || 0) + 540) % 360) - 180;
    layout.adjustments[key] = value;
  }
  function adjustElements(data, target, elements, width, height) {
    elements.forEach(function (element) {
      var value = (data.layout.adjustments || {})[adjustmentKey(data, target, element, elements)];
      if (!value) return;
      var oldW = element.w, oldH = element.h;
      element.rotation = ((element.rotation + value.rotation + 540) % 360) - 180;
      var angle = element.rotation * Math.PI / 180, cos = Math.abs(Math.cos(angle)), sin = Math.abs(Math.sin(angle));
      var factor = Math.min(value.scale, width / (cos * oldW + sin * oldH), height / (sin * oldW + cos * oldH));
      element.w = Math.max(8, oldW * factor); element.h = Math.max(8, oldH * factor);
      var halfW = (cos * element.w + sin * element.h) / 2, halfH = (sin * element.w + cos * element.h) / 2;
      var centerX = element.x + oldW / 2 + value.dx, centerY = element.y + oldH / 2 + value.dy;
      element.x = Math.max(halfW, Math.min(width - halfW, centerX)) - element.w / 2;
      element.y = Math.max(halfH, Math.min(height - halfH, centerY)) - element.h / 2;
      element.font_size = Math.max(10, Math.min(160, element.font_size * factor));
    });
  }
  var weeklySource = null;
  function weeklyKey(item) { return item.layout_key || item.name.trim().toLowerCase().replace(/\s+/g, '_'); }
  function syncWeeklyOverrides(data) {
    if (!weeklySource) return;
    ['plakat_article_overrides', 'flyer_article_overrides'].forEach(function (key) {
      var source = weeklySource[key] || {}, selected = data.layout.cms[key];
      data.items.forEach(function (item) {
        var id = weeklyKey(item), nameKey = item.name.trim().toLowerCase().replace(/\s+/g, '_');
        var found = source[id] || source[nameKey] || source[item.article_number] || source[item.barcode];
        if (found && !selected[id]) selected[id] = clone(found);
      });
    });
  }
  async function adoptWeekly(data) {
    var result = await request('/api/cms-config');
    if (!result.data || typeof result.data !== 'object') throw problem('Die gespeicherten Wochenvorlagen konnten nicht geladen werden. Bitte erneut versuchen.');
    var R = window.WochenangeboteRenderer;
    var config = clone(R.CFG_DEFAULTS), saved = result.data.design_config || {};
    Object.keys(config).concat(['tplColors']).forEach(function (key) {
      if (Object.prototype.hasOwnProperty.call(saved, key)) config[key] = clone(saved[key]);
    });
    weeklySource = result.data;
    data.layout.cms = { config: config, plakat_article_overrides: {}, flyer_article_overrides: {} };
    data.layout.template = config.plakatTemplate; data.layout.density = 6;
    applyTemplate(data);
  }
  function weeklySnapshot(data) {
    var snapshot = clone(data.layout.cms);
    ['plakat_article_overrides', 'flyer_article_overrides'].forEach(function (key) {
      var selected = {};
      data.items.forEach(function (item) { var id = weeklyKey(item); if (snapshot[key][id]) selected[id] = snapshot[key][id]; });
      snapshot[key] = selected;
    });
    return snapshot;
  }
  function changeWeekly(data, element, delta) {
    var item = data.items.find(function (it) { return it.id === element.itemId; });
    var key = weeklyKey(item), overrides = data.layout.cms[element.group];
    var renderer = window.WochenangeboteRenderer.create({});
    var defaults = element.group === 'plakat_article_overrides' ? renderer.plakatArtOverrideDefault() : renderer.flyerArtOverrideDefault();
    var value = Object.assign(defaults, overrides[key] || {}), prefix = element.ovKey;
    if (prefix === 'copy') { value.copies = clone(value.copies || []); value = value.copies[element.copyIdx]; prefix = ''; }
    if (!value) throw problem('Dieses Vorschau-Element ist nicht mehr vorhanden. Bitte die Vorschau erneut öffnen.');
    var unit = element.unitScale || 1;
    var dxKey = prefix ? prefix + 'Dx' : 'dx', dyKey = prefix ? prefix + 'Dy' : 'dy';
    var scaleKey = prefix ? prefix + 'Scale' : 'scale', rotKey = prefix ? prefix + 'Rot' : 'rot';
    value[dxKey] = Math.max(-1000, Math.min(1000, (value[dxKey] || 0) + (delta.dx || 0) / unit));
    value[dyKey] = Math.max(-1500, Math.min(1500, (value[dyKey] || 0) + (delta.dy || 0) / unit));
    value[scaleKey] = Math.max(20, Math.min(200, (value[scaleKey] || 100) * (delta.scale || 1)));
    value[rotKey] = (((value[rotKey] || 0) + (delta.rotation || 0) * element.rotationSign + 540) % 360) - 180;
    if (prefix) overrides[key] = value;
    else overrides[key].copies[element.copyIdx] = value;
  }
  async function weeklyRender(data, pageNumber, scale, itemId, card, light) {
    var R = window.WochenangeboteRenderer, snapshot = weeklySnapshot(data);
    snapshot.config = Object.assign({}, R.CFG_DEFAULTS, snapshot.config);
    var items = itemId ? data.items.filter(function (it) { return it.id === itemId; }) : data.items.slice(pageNumber * 6, pageNumber * 6 + 6);
    var logo = await image('logo'), logoCanvas = document.createElement('canvas');
    logoCanvas.width = logo.width; logoCanvas.height = logo.height; logoCanvas.getContext('2d').drawImage(logo, 0, 0);
    var renderer = R.create({
      cfgGet: function () { return snapshot.config; }, logo: logoCanvas.toDataURL('image/png'),
      flyerArtOverrideGet: function (it) { return snapshot.flyer_article_overrides[it.key] || null; },
      plakatArtOverrideGet: function (it) { return snapshot.plakat_article_overrides[it.key] || null; }
    });
    var originalItems = [], images = [];
    for (var it of items) {
      var img = it.image_id ? await image(it.image_id) : null, source = '';
      if (img) {
        var converted = document.createElement('canvas'); converted.width = img.width; converted.height = img.height;
        converted.getContext('2d').drawImage(img, 0, 0); source = converted.toDataURL('image/png');
      }
      originalItems.push({ key: weeklyKey(it), produkt: it.name, details: it.description, artikelnummer: it.article_number,
        preis: it.price_cents == null ? 0 : it.price_cents / 100, statt_preis: it.old_price_cents == null ? null : it.old_price_cents / 100, bild_data: source });
      images.push(img);
    }
    var action = { von: data.valid_from, bis: data.valid_to, titel: data.title, items: originalItems };
    var timer;
    try {
      var drawing = itemId && !card
        ? renderer.generateEinzelflyer(originalItems[0], action, snapshot.config, { scale: scale || 1 })
        : new Promise(function (resolve) {
          renderer.drawAngebotPlakat(action, originalItems, images, resolve, snapshot.config, { scale: scale || 1, returnCanvas: true, semibold: !!light });
        });
      var canvas = await Promise.race([drawing, new Promise(function (_, reject) {
        timer = setTimeout(function () { reject(problem('Die Wochenvorlage konnte nicht vollständig dargestellt werden. Bitte Bilder und Design prüfen und erneut versuchen.')); }, 30000);
      })]);
      if (!canvas) throw problem('Die Wochenvorlage konnte nicht dargestellt werden. Bitte erneut versuchen.');
      var group = itemId && !card ? 'flyer_article_overrides' : 'plakat_article_overrides';
      var magazine = /^modern-mag/.test(snapshot.config[group === 'flyer_article_overrides' ? 'flyerTemplate' : 'plakatTemplate']);
      canvas._weeklyElements = (canvas._elMeta || []).map(function (meta) {
        var it = itemId ? items[0] : items.find(function (it) { return weeklyKey(it) === meta.itemKey; });
        if (!it) return null;
        var override = snapshot[group][weeklyKey(it)] || {}, sign = !magazine && meta.ovKey === 'img' ? -1 : 1;
        var rot = meta.ovKey === 'copy' ? ((override.copies || [])[meta.copyIdx] || {}).rot : override[meta.ovKey + 'Rot'];
        var baseRotation = !magazine && meta.ovKey === 'img' ? -snapshot.config.imgRotation * (group === 'plakat_article_overrides' ? .85 : 1) : 0;
        return Object.assign({}, meta, { id: it.id + ':' + meta.id, itemId: it.id, label: meta.label + ' · ' + it.name,
          group: group, rotation: baseRotation + (rot || 0) * sign, rotationSign: sign, unitScale: 1 });
      }).filter(Boolean);
      canvas._weeklyWidth = W; canvas._weeklyHeight = H;
      return { canvas: canvas, errors: [] };
    } finally { clearTimeout(timer); }
  }
  function textFor(element, data, pageNumber) {
    var it = data.items.find(function (i) { return i.id === element.item_id; });
    switch (element.type) {
      case 'brand': return 'DORFLADEN OBERORNAU';
      case 'title': return data.title;
      case 'period': return 'Gültig ' + date(data.valid_from) + ' – ' + date(data.valid_to);
      case 'footer': return 'Preise inkl. MwSt., zzgl. angegebenem Pfand. Nur solange der Vorrat reicht.\nSeite ' + (pageNumber + 1) + ' / ' + data.layout.pages.length;
      case 'text': return element.text;
      case 'name': return it ? it.name || 'Artikelname ergänzen' : '';
      case 'description': return it ? it.description : '';
      case 'pack': return it ? pack(it) : '';
      case 'price': return it ? money(it.price_cents) + ' €' : '';
      case 'old_price': return it && it.old_price_cents != null ? 'statt ' + money(it.old_price_cents) + ' €' : '';
      case 'discount': return it && savings(it) ? '-' + savings(it) + '%' : '';
      case 'deposit': return it ? (it.deposit_free ? 'Pfandfrei' : it.deposit_cents == null ? 'Pfand bitte ergänzen' : 'zzgl. ' + money(it.deposit_cents) + ' € Pfand') : '';
      case 'base': return it ? '1 l = ' + money(base(it)) + ' €' : '';
      default: return '';
    }
  }
  function imageFor(element, data) {
    var it = data.items.find(function (i) { return i.id === element.item_id; });
    return element.image_id || (it && it.image_id) || '';
  }
  function registerImage(id, source) {
    if (!/^cms:/.test(id) || !/^(data:image\/(?:png|jpeg|webp);base64,|https:\/\/)/i.test(source)) {
      throw problem('Das Artikelbild hat kein unterstütztes Format.');
    }
    if (cmsImages.get(id) !== source) imageCache.delete(id);
    cmsImages.set(id, source);
  }
  async function image(id) {
    if (!imageCache.has(id)) {
      var promise = (async function () {
        var source = cmsImages.get(id);
        if (id.startsWith('cms:') && (!source || /^https:\/\//i.test(source))) {
          var key = id.slice(4);
          if (!key || /['\r\n]/.test(key)) throw problem('Der Bildschlüssel ist nicht gültig.');
          var matches = await request('/api/werbebilder?sharepoint=1', json('POST', { articles: [{ artikelnummer: key, edeka_nr: key, strichcode: key }] }));
          var found = Array.isArray(matches) && matches.find(function (entry) { return entry.dl_bild_base64; });
          if (!found) throw problem('Ein Artikelbild wurde nicht gefunden. Bitte die Bildzuordnung prüfen.');
          source = found.dl_bild_base64;
          registerImage(id, source);
        }
        var r = await fetch(source || (id === 'logo' ? '/images/dorfladen-logo.png' : '/api/angebote-bilder/' + encodeURIComponent(id)), { cache: 'no-store' });
        if (!r.ok) throw problem(id === 'logo' ? 'Das Dorfladen-Logo konnte nicht geladen werden. Bitte erneut versuchen.' : 'Ein Angebotsbild konnte nicht geladen werden. Bitte erneut versuchen.');
        var url = URL.createObjectURL(await r.blob());
        try {
          return await new Promise(function (resolve, reject) {
            var img = new Image();
            img.onload = function () { resolve(img); };
            img.onerror = function () { reject(problem(id === 'logo' ? 'Das Dorfladen-Logo konnte nicht dargestellt werden.' : 'Ein Angebotsbild konnte nicht dargestellt werden.')); };
            img.src = url;
          });
        } finally { URL.revokeObjectURL(url); }
      })();
      imageCache.set(id, promise);
      promise.catch(function () { imageCache.delete(id); });
    }
    return imageCache.get(id);
  }
  function lines(ctx, value, width) {
    var result = [];
    String(value).split('\n').forEach(function (paragraph) {
      var line = '';
      paragraph.split(/\s+/).forEach(function (word) {
        if (!word) return;
        if (line && ctx.measureText(line + ' ' + word).width <= width) { line += ' ' + word; return; }
        if (line) { result.push(line); line = ''; }
        for (var character of word) {
          if (line && ctx.measureText(line + character).width > width) { result.push(line); line = ''; }
          line += character;
        }
      });
      result.push(line.trimEnd());
    });
    return result;
  }
  var LIGHT_STACK = '"Segoe UI", system-ui, -apple-system, Roboto, "Helvetica Neue", Arial, sans-serif';
  // Startseite: halbfett statt fett wirkt filigraner.
  function fontFor(element, size, light) {
    if (!light) return (element.bold ? 'bold ' : '') + size + 'px "' + element.font + '"';
    return (element.bold ? '600 ' : '') + size + 'px ' + (element.font === 'Arial' ? LIGHT_STACK : '"' + element.font + '"');
  }
  function fitted(ctx, element, value, light) {
    var words = String(value).split(/\s+/).filter(Boolean), size;
    // Prefer a smaller font over breaking a word in the middle.
    for (size = element.font_size; size >= 12; size--) {
      ctx.font = fontFor(element, size, light);
      if (words.some(function (word) { return ctx.measureText(word).width > element.w; })) continue;
      var whole = lines(ctx, value, element.w);
      if (whole.length * size * 1.18 <= element.h) return { lines: whole, size: size, fits: true };
    }
    var result;
    size = element.font_size;
    do {
      ctx.font = fontFor(element, size, light);
      result = lines(ctx, value, element.w);
      if (result.length * size * 1.18 <= element.h) break;
      size--;
    } while (size >= 12);
    return { lines: result, size: size, fits: size >= 12 && result.length * size * 1.18 <= element.h };
  }
  async function renderElements(data, elements, width, height, background, scale, pageNumber, light) {
    var canvas = document.createElement('canvas'), factor = scale || 1;
    canvas.width = Math.round(width * factor); canvas.height = Math.round(height * factor);
    var ctx = canvas.getContext('2d');
    if (light) window.WochenangeboteRenderer.create({}).semibold(ctx);
    ctx.scale(factor, factor); ctx.fillStyle = background; ctx.fillRect(0, 0, width, height);
    var errors = [];
    for (var element of elements) {
      if (element.hidden) continue;
      ctx.save();
      ctx.globalAlpha = element.opacity;
      ctx.translate(element.x + element.w / 2, element.y + element.h / 2);
      ctx.rotate(element.rotation * Math.PI / 180);
      ctx.translate(-element.w / 2, -element.h / 2);
      ctx.fillStyle = element.fill || data.layout.text_color;
      var angle = element.rotation * Math.PI / 180;
      var halfW = (Math.abs(Math.cos(angle)) * element.w + Math.abs(Math.sin(angle)) * element.h) / 2;
      var halfH = (Math.abs(Math.sin(angle)) * element.w + Math.abs(Math.cos(angle)) * element.h) / 2;
      if (element.x + element.w / 2 - halfW < -1 || element.y + element.h / 2 - halfH < -1
          || element.x + element.w / 2 + halfW > width + 1 || element.y + element.h / 2 + halfH > height + 1) {
        errors.push('Ein Element ragt über die Seite hinaus.');
      }
      if (element.type === 'shape') {
        ctx.beginPath();
        if (element.shape === 'ellipse') ctx.ellipse(element.w / 2, element.h / 2, element.w / 2, element.h / 2, 0, 0, 2 * Math.PI);
        else if (element.shape === 'round') ctx.roundRect(0, 0, element.w, element.h, Math.min(16, element.w / 2, element.h / 2));
        else ctx.rect(0, 0, element.w, element.h);
        ctx.fill();
      } else if (element.type === 'image' || element.type === 'logo') {
        var id = element.type === 'logo' ? 'logo' : imageFor(element, data);
        if (id) {
          var img = await image(id), ratio = Math.min(element.w / img.width, element.h / img.height) * (element.image_scale || 100) / 100;
          ctx.beginPath(); ctx.rect(0, 0, element.w, element.h); ctx.clip();
          ctx.drawImage(img, (element.w - img.width * ratio) / 2, (element.h - img.height * ratio) / 2, img.width * ratio, img.height * ratio);
        } else {
          ctx.fillStyle = '#e8ede7'; ctx.fillRect(0, 0, element.w, element.h);
          ctx.fillStyle = '#53644f'; ctx.font = '14px Arial'; ctx.textAlign = 'center';
          ctx.fillText('Produktbild', element.w / 2, element.h / 2);
        }
      } else if (element.type === 'discount') {
        var discount = textFor(element, data, pageNumber);
        if (discount) {
          var marker = window.WochenangeboteRenderer.create({});
          var radius = Math.min(element.w, element.h) / 3.8 * (data.layout.marker_scale || 100) / 100;
          marker.drawSavingsBurst(ctx, element.w / 2, element.h / 2, radius, radius * .62, discount, 'plakat',
            { savingsMarkerType: data.layout.marker_type || 'starburst', savingsPalette: data.layout.marker_palette || 'harmonie', savingsScalePlakat: 100 });
        }
      } else {
        var value = textFor(element, data, pageNumber);
        var fit = fitted(ctx, element, value, light);
        if (!fit.fits) errors.push('Der Text „' + value.slice(0, 35) + '“ passt nicht vollständig. Bitte das Textfeld vergrößern.');
        ctx.beginPath(); ctx.rect(0, 0, element.w, element.h); ctx.clip();
        ctx.textBaseline = 'top'; ctx.textAlign = element.align;
        var tx = element.align === 'center' ? element.w / 2 : element.align === 'right' ? element.w : 0;
        fit.lines.forEach(function (line, i) { ctx.fillText(line, tx, i * fit.size * 1.18); });
        if (element.type === 'old_price') {
          ctx.strokeStyle = ctx.fillStyle; ctx.lineWidth = Math.max(1, fit.size / 16);
          fit.lines.forEach(function (line, i) {
            var lineWidth = ctx.measureText(line).width, left = element.align === 'center' ? (element.w - lineWidth) / 2 : element.align === 'right' ? element.w - lineWidth : 0;
            ctx.beginPath(); ctx.moveTo(left, i * fit.size * 1.18 + fit.size * .5);
            ctx.lineTo(left + lineWidth, i * fit.size * 1.18 + fit.size * .5); ctx.stroke();
          });
        }
      }
      ctx.restore();
    }
    return { canvas: canvas, errors: errors };
  }
  async function render(data, pageNumber, scale) {
    var page = data.layout.pages[pageNumber];
    if (!page) throw problem('Diese Flyerseite ist nicht vorhanden.');
    if (data.kind === 'weekly' && data.layout.cms) return weeklyRender(data, pageNumber, scale);
    return renderElements(data, page.elements, W, H, page.background || data.layout.background, scale, pageNumber);
  }
  async function renderTarget(data, target, itemId, scale, light) {
    var size = targetSizes[target], targets = data.layout.targets && data.layout.targets[target] || [];
    var selected = targets.find(function (entry) { return entry.item_id === itemId; });
    if (!size || !selected) throw problem('Diese Zielgestaltung ist nicht vorhanden.');
    if (data.kind === 'weekly' && data.layout.cms) {
      var rendered = await weeklyRender(data, 0, scale, itemId, target === 'card', light);
      if (target === 'single') return rendered;
      var source = rendered.canvas, output = document.createElement('canvas'), factor = scale || 1;
      output.width = Math.round(size.w * factor); output.height = Math.round(size.h * factor);
      var ctx = output.getContext('2d');
      ctx.fillStyle = data.layout.cms.config.flyer_decoBgColor; ctx.fillRect(0, 0, output.width, output.height);
      if (target === 'card') {
        var rect = source._offerCards[0], fit = Math.min(output.width / rect.w, output.height / rect.h);
        ctx.drawImage(source, rect.x * factor, rect.y * factor, rect.w * factor, rect.h * factor,
          (output.width - rect.w * fit) / 2, (output.height - rect.h * fit) / 2, rect.w * fit, rect.h * fit);
        output._weeklyElements = source._weeklyElements.map(function (entry) {
          var ratio = fit / factor;
          return Object.assign({}, entry, { x: (entry.x - rect.x) * ratio + (size.w - rect.w * ratio) / 2,
            y: (entry.y - rect.y) * ratio + (size.h - rect.h * ratio) / 2, w: entry.w * ratio, h: entry.h * ratio, unitScale: ratio });
        });
      } else {
        var ratio = Math.min(output.width / source.width, output.height / source.height);
        ctx.drawImage(source, (output.width - source.width * ratio) / 2, (output.height - source.height * ratio) / 2, source.width * ratio, source.height * ratio);
        output._weeklyElements = source._weeklyElements.map(function (entry) {
          return Object.assign({}, entry, { x: entry.x * ratio + (size.w - W * ratio) / 2,
            y: entry.y * ratio + (size.h - H * ratio) / 2, w: entry.w * ratio, h: entry.h * ratio, unitScale: ratio });
        });
      }
      output._weeklyWidth = size.w; output._weeklyHeight = size.h;
      return { canvas: output, errors: [] };
    }
    return renderElements(data, selected.elements, size.w, size.h, selected.background || data.layout.background, scale, 0, light);
  }
  async function paintCards(host, data) {
    var canvases = Array.from(host.querySelectorAll('[data-card-item]'));
    for (var canvas of canvases) {
      if (!data.items.some(function (item) { return item.id === canvas.dataset.cardItem; })) continue;
      var result = await renderTarget(data, 'card', canvas.dataset.cardItem, 1, true);
      result.canvas.setAttribute('aria-hidden', 'true');
      if (canvas.isConnected) canvas.replaceWith(result.canvas);
    }
  }
  function validate(data) {
    if (!data.title.trim() || !data.items.length || !data.valid_from || !data.valid_to || data.valid_from > data.valid_to) {
      throw problem('Bitte Überschrift, mindestens einen Artikel und einen gültigen Zeitraum eintragen.');
    }
    data.items.forEach(function (it) {
      if (!it.name.trim() || !Number.isInteger(it.price_cents) || it.price_cents <= 0) throw problem('Jeder Artikel benötigt einen Namen und einen gültigen Angebotspreis.');
      if (it.old_price_cents != null && it.old_price_cents <= it.price_cents) throw problem('Der Stattpreis muss über dem Angebotspreis liegen oder leer bleiben.');
      if (data.kind === 'drinks' && (!Number.isInteger(it.units) || it.units <= 0 || !Number.isInteger(it.volume_ml) || it.volume_ml <= 0 || !it.packaging)) {
        throw problem('Bitte Anzahl, Literinhalt und Gebindeart für jedes Getränk ergänzen.');
      }
      if (data.kind === 'drinks' && (!Number.isInteger(it.deposit_cents) || (it.deposit_free ? it.deposit_cents !== 0 : it.deposit_cents <= 0))) {
        throw problem('Bitte das Gesamtpfand eintragen oder ausdrücklich „pfandfrei“ wählen.');
      }
      var required = ['name', 'price'].concat(data.kind === 'drinks' ? ['pack', 'deposit', 'base'] : []);
      required.forEach(function (role) {
        if (!data.layout.pages.some(function (p) { return p.elements.some(function (e) { return e.type === role && e.item_id === it.id && !e.hidden && e.opacity >= .5; }); })) {
          throw problem('Ein Pflichtfeld für Artikel, Preis, Pfand oder Grundpreis fehlt in der Gestaltung.');
        }
      });
    });
    var targets = data.layout.targets || {};
    if (Object.keys(targets).some(function (key) { return targets[key] && targets[key].length; })) {
      Object.keys(targetSizes).forEach(function (target) {
        var layouts = targets[target] || [];
        if (layouts.length !== data.items.length || data.items.some(function (it) {
          return !layouts.some(function (entry) { return entry.item_id === it.id; });
        })) throw problem('Bitte für jeden Artikel alle vier Ausgaben gestalten.');
        layouts.forEach(function (entry) {
          var required = ['name', 'price'].concat(data.kind === 'drinks' ? ['pack', 'deposit', 'base'] : []);
          required.forEach(function (role) {
            if (!entry.elements.some(function (e) { return e.type === role && e.item_id === entry.item_id && !e.hidden && e.opacity >= .5; })) {
              throw problem('In einer Ausgabe fehlt ein Pflichtfeld. Bitte die Gestaltung prüfen.');
            }
          });
        });
      });
    }
  }
  async function preflight(data) {
    validate(data);
    var result = [];
    for (var p = 0; p < data.layout.pages.length; p++) {
      var rendered = await render(data, p, 2);
      if (rendered.errors.length) throw problem(rendered.errors[0]);
      result.push(rendered.canvas);
    }
    var targets = data.layout.targets || {};
    if (Object.keys(targets).some(function (key) { return targets[key] && targets[key].length; })) {
      for (var target of Object.keys(targetSizes)) {
        for (var itemLayout of targets[target]) {
          var renderedTarget = await renderTarget(data, target, itemLayout.item_id, 1);
          if (renderedTarget.errors.length) throw problem(renderedTarget.errors[0]);
        }
      }
    }
    return result;
  }
  async function scaleImages(data, mode, dimensions) {
    validate(data);
    if (mode === 'single' && data.layout.targets && data.layout.targets.scale && data.layout.targets.scale.length) {
      var custom = [];
      for (var layout of data.layout.targets.scale) {
        var renderedCustom = await renderTarget(data, 'scale', layout.item_id, 1);
        var output = document.createElement('canvas'); output.width = dimensions.w; output.height = dimensions.h;
        var outputContext = output.getContext('2d'); outputContext.fillStyle = layout.background || data.layout.background;
        outputContext.fillRect(0, 0, output.width, output.height);
        var ratio = Math.min(output.width / renderedCustom.canvas.width, output.height / renderedCustom.canvas.height);
        outputContext.drawImage(renderedCustom.canvas,
          (output.width - renderedCustom.canvas.width * ratio) / 2,
          (output.height - renderedCustom.canvas.height * ratio) / 2,
          renderedCustom.canvas.width * ratio, renderedCustom.canvas.height * ratio);
        custom.push(output);
      }
      return custom;
    }
    if (mode === 'single') {
      var singles = [];
      for (var it of data.items) {
        var single = document.createElement('canvas');
        single.width = dimensions.w; single.height = dimensions.h;
        var sc = single.getContext('2d'), w = dimensions.w / 2, h = dimensions.h / 2;
        sc.scale(2, 2); sc.fillStyle = data.layout.background; sc.fillRect(0, 0, w, h);
        var right = Math.round(w * .34), tw = w - right - 22, short = h <= 300;
        function draw(role, x, y, width, height, size, bold, color) {
          var e = el(role, x, y, width, height, { item_id: it.id, font_size: size, bold: bold, font: data.layout.font });
          var value = textFor(e, data, 0);
          if (role === 'pack' && short && it.description) value += '\n' + it.description;
          var fit = fitted(sc, e, value);
          if (!fit.fits) throw problem('Ein Artikeltext passt nicht lesbar auf die Waage. Bitte kürzen oder ein größeres Profil wählen.');
          sc.fillStyle = color || data.layout.text_color; sc.textBaseline = 'top';
          fit.lines.forEach(function (line, n) { sc.fillText(line, x, y + n * fit.size * 1.18); });
        }
        if (it.image_id) {
          var img = await image(it.image_id), iw = right - 40, ih = h - 48, ir = Math.min(iw / img.width, ih / img.height) * data.layout.image_scale / 100;
          sc.save(); sc.beginPath(); sc.rect(18, 24, iw, ih); sc.clip();
          sc.translate(18 + iw / 2, 24 + ih / 2); sc.rotate(data.layout.image_rotation * Math.PI / 180);
          sc.drawImage(img, -img.width * ir / 2, -img.height * ir / 2, img.width * ir, img.height * ir); sc.restore();
        }
        draw('title', right, 10, tw, 24, 17, true, data.layout.title_color);
        draw('name', right, 42, tw, short ? 67 : 115, short ? 28 : 40, true);
        if (data.kind === 'drinks') draw('pack', right, short ? 113 : 161, tw, 38, short ? 17 : 23);
        else draw('description', right, short ? 113 : 161, tw, 38, 17);
        draw('price', right, short ? 151 : 218, it.old_price_cents == null ? tw : tw * .68, short ? 55 : 90, short ? 45 : 70, true, data.layout.color);
        if (it.old_price_cents != null) draw('old_price', right + tw * .7, short ? 169 : 248, tw * .3, short ? 35 : 50, short ? 16 : 20);
        if (!short && data.kind === 'drinks' && it.description) draw('description', right, 313, tw, Math.max(20, h - 393), 17);
        if (data.kind === 'drinks') {
          draw('deposit', right, h - 73, tw, 25, short ? 16 : 20);
          draw('base', right, h - 47, tw, 25, short ? 16 : 20);
        }
        draw('period', right, h - 21, tw, 18, 12);
        singles.push(single);
      }
      return singles;
    }
    var sources = await preflight(data);
    return sources.map(function (source, index) {
      var canvas = document.createElement('canvas'); canvas.width = dimensions.w; canvas.height = dimensions.h;
      var ctx = canvas.getContext('2d'); ctx.fillStyle = data.layout.pages[index].background || data.layout.background; ctx.fillRect(0, 0, canvas.width, canvas.height);
      var ratio = Math.min(canvas.width / source.width, canvas.height / source.height);
      ctx.drawImage(source, (canvas.width - source.width * ratio) / 2, (canvas.height - source.height * ratio) / 2, source.width * ratio, source.height * ratio);
      return canvas;
    });
  }
  async function hash(value, length) {
    var bytes = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value));
    return Array.from(new Uint8Array(bytes), function (b) { return b.toString(16).padStart(2, '0'); }).join('').slice(0, length);
  }
  return { W: W, H: H, targetSizes: targetSizes, uid: uid, clone: clone, esc: esc, money: money, cents: cents,
    adjustmentKey: adjustmentKey, updateAdjustment: updateAdjustment,
    adoptWeekly: adoptWeekly, weeklyKey: weeklyKey, weeklySnapshot: weeklySnapshot,
    changeWeekly: changeWeekly,
    litres: litres, millilitres: millilitres, base: base, pack: pack, date: date,
    today: today, blank: blank, item: item, request: request, json: json, el: el, applyTemplate: applyTemplate,
    ensureTargets: ensureTargets, applyTargetTemplate: applyTargetTemplate, textFor: textFor,
    render: render, renderTarget: renderTarget, paintCards: paintCards, validate: validate,
    preflight: preflight, scaleImages: scaleImages, image: image, imageFor: imageFor, registerImage: registerImage,
    hash: hash, theme: theme, problem: problem, dialog: dialog, error: error, cardHTML: cardHTML,
    templateOptions: templateStyles.map(function (style) { return [style.id, style.label]; }),
    cmsTemplateOptions: templateStyles.filter(function (style) { return style.original && !style.half && !style.tag; }).map(function (style) { return [style.id, style.label]; }),
    templateStyle: templateStyle, useTemplate: useTemplate, preserveBackgrounds: preserveBackgrounds, savings: savings };
})();
