/* Ein Daten-/Gestaltungsmodell fuer Editor, Kundenansicht, Papier und Waage. */
window.AngeboteModel = (function () {
  'use strict';
  var W = 794, H = 1123;
  var imageCache = new Map();
  var theme = {
    font: 'Arial', title_color: '#234c38', text_color: '#24362d',
    card_background: '#ffffff', price_background: '#ffffff', price_shape: 'rect',
    name_size: 24, price_size: 58, details_size: 17, image_rotation: 0, image_scale: 100
  };
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
  function base(item) {
    var volume = item.units * item.volume_ml;
    return volume && item.price_cents != null ? Math.floor((2 * item.price_cents * 1000 + volume) / (2 * volume)) : null;
  }
  function pack(item) {
    if (!item.units || !item.volume_ml) return item.packaging || 'Gebinde bitte ergänzen';
    return item.units + ' × ' + (item.volume_ml / 1000).toLocaleString('de-DE') + ' l · ' + (item.packaging || 'Gebindeart ergänzen');
  }
  function date(value) { return value ? value.split('-').reverse().join('.') : 'Datum ergänzen'; }
  function cardHTML(data, it) {
    var l = data.layout || theme;
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
        background: '#fffdf6', pages: [] }, clone(defaults || {})) };
  }
  function item() {
    return { id: uid(), name: '', article_number: '', description: '', price_cents: null, old_price_cents: null,
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
        var error = problem(/^\/api\/angebote-/.test(url) && data.error ? data.error : 'Die Angebote konnten nicht geladen oder gespeichert werden.');
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
    var l = data.layout, density = l.density, compact = density === 6, pages = [];
    for (var start = 0; start < Math.max(1, data.items.length); start += density) {
      var elements = [
        el('brand', 40, 28, 714, 30, { font_size: 18, bold: true, fill: l.title_color, font: l.font }),
        el('title', 40, 65, 714, 72, { font_size: 43, bold: true, fill: l.color, font: l.font }),
        el('period', 40, 143, 714, 28, { font_size: 17, fill: l.text_color, font: l.font }),
        el('footer', 40, 1060, 714, 40, { font_size: 13, align: 'center', fill: l.text_color, font: l.font })
      ];
      data.items.slice(start, start + density).forEach(function (it, n) {
        var x = 40 + (n % 2) * 365, y = 190 + Math.floor(n / 2) * (compact ? 282 : 427);
        var h = compact ? 264 : 407;
        var shared = { item_id: it.id, font: l.font, fill: l.text_color };
        function bound(role, dx, dy, width, height, size, extra) {
          elements.push(el(role, x + dx, y + dy, width, height,
            Object.assign({}, shared, { font_size: size }, extra)));
        }
        elements.push(el('shape', x, y, 349, h, { item_id: it.id, fill: it.highlight ? '#f2ead8' : l.card_background, shape: l.template === 'classic' ? 'rect' : 'round' }));
        bound('image', 14, 14, 122, compact ? 110 : 160, 20, { rotation: l.image_rotation, image_scale: l.image_scale });
        bound('name', 148, 18, 185, compact ? 75 : 100, Math.min(l.name_size, compact ? 22 : 28), { bold: true });
        if (data.kind === 'drinks') bound('pack', 148, compact ? 98 : 130, 185, compact ? 40 : 55, Math.min(l.details_size, 18));
        if (!compact) bound('description', 16, 200, 317, 50, l.details_size);
        var priceY = compact ? 149 : 260;
        elements.push(el('shape', x + 12, y + priceY - 5, 325, compact ? 64 : 78,
          { item_id: it.id, fill: l.price_background, shape: l.price_shape }));
        bound('price', 24, priceY, 205, compact ? 55 : 70, Math.min(l.price_size, compact ? 46 : 70), { bold: true, fill: l.color });
        if (it.old_price_cents != null) bound('old_price', 236, priceY + 9, 96, 42, 18);
        if (data.kind === 'drinks') {
          bound('deposit', 18, compact ? 212 : 344, 313, 24, Math.min(l.details_size, 18));
          bound('base', 18, compact ? 237 : 374, 313, 24, Math.min(l.details_size, 18));
        }
      });
      pages.push({ elements: elements });
    }
    return pages;
  }
  function applyTemplate(data) { data.layout.pages = templates(data); data.layout.mode = 'template'; }
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
      case 'deposit': return it ? (it.deposit_free ? 'Pfandfrei' : it.deposit_cents == null ? 'Pfand bitte ergänzen' : 'zzgl. ' + money(it.deposit_cents) + ' € Pfand') : '';
      case 'base': return it ? '1 l = ' + money(base(it)) + ' €' : '';
      default: return '';
    }
  }
  function imageFor(element, data) {
    var it = data.items.find(function (i) { return i.id === element.item_id; });
    return element.image_id || (it && it.image_id) || '';
  }
  async function image(id) {
    if (!imageCache.has(id)) {
      var promise = (async function () {
        var r = await fetch('/api/angebote-bilder/' + encodeURIComponent(id), { cache: 'no-store' });
        if (!r.ok) throw problem('Ein Angebotsbild konnte nicht geladen werden. Bitte erneut versuchen.');
        var url = URL.createObjectURL(await r.blob());
        try {
          return await new Promise(function (resolve, reject) {
            var img = new Image();
            img.onload = function () { resolve(img); };
            img.onerror = function () { reject(problem('Ein Angebotsbild konnte nicht dargestellt werden.')); };
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
  function fitted(ctx, element, value) {
    var size = element.font_size, result;
    do {
      ctx.font = (element.bold ? 'bold ' : '') + size + 'px "' + element.font + '"';
      result = lines(ctx, value, element.w);
      if (result.length * size * 1.18 <= element.h) break;
      size--;
    } while (size >= 12);
    return { lines: result, size: size, fits: size >= 12 && result.length * size * 1.18 <= element.h };
  }
  async function render(data, pageNumber, scale) {
    var canvas = document.createElement('canvas'), factor = scale || 1;
    canvas.width = Math.round(W * factor); canvas.height = Math.round(H * factor);
    var ctx = canvas.getContext('2d');
    ctx.scale(factor, factor); ctx.fillStyle = data.layout.background; ctx.fillRect(0, 0, W, H);
    var errors = [], page = data.layout.pages[pageNumber];
    if (!page) throw problem('Diese Flyerseite ist nicht vorhanden.');
    for (var element of page.elements) {
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
      if (element.type !== 'shape' && (element.x + element.w / 2 - halfW < -1 || element.y + element.h / 2 - halfH < -1
          || element.x + element.w / 2 + halfW > W + 1 || element.y + element.h / 2 + halfH > H + 1)) {
        errors.push('Ein Element ragt über die Seite hinaus.');
      }
      if (element.type === 'shape') {
        ctx.beginPath();
        if (element.shape === 'ellipse') ctx.ellipse(element.w / 2, element.h / 2, element.w / 2, element.h / 2, 0, 0, 2 * Math.PI);
        else if (element.shape === 'round') ctx.roundRect(0, 0, element.w, element.h, Math.min(16, element.w / 2, element.h / 2));
        else ctx.rect(0, 0, element.w, element.h);
        ctx.fill();
      } else if (element.type === 'image') {
        var id = imageFor(element, data);
        if (id) {
          var img = await image(id), ratio = Math.min(element.w / img.width, element.h / img.height) * (element.image_scale || 100) / 100;
          ctx.beginPath(); ctx.rect(0, 0, element.w, element.h); ctx.clip();
          ctx.drawImage(img, (element.w - img.width * ratio) / 2, (element.h - img.height * ratio) / 2, img.width * ratio, img.height * ratio);
        } else {
          ctx.fillStyle = '#e8ede7'; ctx.fillRect(0, 0, element.w, element.h);
          ctx.fillStyle = '#53644f'; ctx.font = '14px Arial'; ctx.textAlign = 'center';
          ctx.fillText('Produktbild', element.w / 2, element.h / 2);
        }
      } else {
        var value = textFor(element, data, pageNumber);
        var fit = fitted(ctx, element, value);
        if (!fit.fits) errors.push('Der Text „' + value.slice(0, 35) + '“ passt nicht vollständig. Bitte das Textfeld vergrößern.');
        ctx.beginPath(); ctx.rect(0, 0, element.w, element.h); ctx.clip();
        ctx.textBaseline = 'top'; ctx.textAlign = element.align;
        var tx = element.align === 'center' ? element.w / 2 : element.align === 'right' ? element.w : 0;
        fit.lines.forEach(function (line, i) { ctx.fillText(line, tx, i * fit.size * 1.18); });
      }
      ctx.restore();
    }
    return { canvas: canvas, errors: errors };
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
  }
  async function preflight(data) {
    validate(data);
    var result = [];
    for (var p = 0; p < data.layout.pages.length; p++) {
      var rendered = await render(data, p, 2);
      if (rendered.errors.length) throw problem(rendered.errors[0]);
      result.push(rendered.canvas);
    }
    return result;
  }
  async function scaleImages(data, mode, dimensions) {
    validate(data);
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
    return sources.map(function (source) {
      var canvas = document.createElement('canvas'); canvas.width = dimensions.w; canvas.height = dimensions.h;
      var ctx = canvas.getContext('2d'); ctx.fillStyle = data.layout.background; ctx.fillRect(0, 0, canvas.width, canvas.height);
      var ratio = Math.min(canvas.width / source.width, canvas.height / source.height);
      ctx.drawImage(source, (canvas.width - source.width * ratio) / 2, (canvas.height - source.height * ratio) / 2, source.width * ratio, source.height * ratio);
      return canvas;
    });
  }
  async function hash(value, length) {
    var bytes = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value));
    return Array.from(new Uint8Array(bytes), function (b) { return b.toString(16).padStart(2, '0'); }).join('').slice(0, length);
  }
  return { W: W, H: H, uid: uid, clone: clone, esc: esc, money: money, cents: cents, base: base, pack: pack, date: date,
    today: today, blank: blank, item: item, request: request, json: json, el: el, applyTemplate: applyTemplate,
    textFor: textFor, render: render, validate: validate, preflight: preflight, scaleImages: scaleImages,
    image: image, imageFor: imageFor, hash: hash, theme: theme, problem: problem, dialog: dialog, error: error, cardHTML: cardHTML };
})();
