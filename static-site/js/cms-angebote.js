window.CMSAngebote = (function () {
  'use strict';
  var M = window.AngeboteModel, A = window.AngeboteDataverse;
  function mount(root, options) {
    var list = [], filter = 'this', activeDialog = null, dirty = false, catalogPromise = null;
    async function catalog() {
      if (!catalogPromise) {
        catalogPromise = M.request('/api/preisliste?all=1').then(function (response) {
          if (!response.groups || typeof response.groups !== 'object') throw M.problem('Der Artikelstamm konnte nicht gelesen werden.');
          return Object.values(response.groups).flat().filter(function (item) { return item.bezeichnung; });
        });
        catalogPromise.catch(function () { catalogPromise = null; });
      }
      return catalogPromise;
    }
    function overlaps(data) {
      if (filter === 'all') return true;
      var d = new Date(M.today() + 'T12:00:00Z'), day = (d.getUTCDay() + 6) % 7;
      d.setUTCDate(d.getUTCDate() - day + (filter === 'next' ? 7 : 0));
      var from = d.toISOString().slice(0, 10); d.setUTCDate(d.getUTCDate() + 6);
      return data.valid_from <= d.toISOString().slice(0, 10) && data.valid_to >= from;
    }
    async function overview() {
      root.innerHTML = '<p role="status">Die Angebote werden geladen …</p>';
      try { list = await A.load(); render(); }
      catch (error) {
        root.innerHTML = '<p class="an-status an-error" role="alert">Die Angebote konnten nicht geladen werden.</p><button data-retry>Erneut versuchen</button>';
        root.querySelector('[data-retry]').onclick = overview;
        await M.error(error);
      }
    }
    function render() {
      var selected = list.filter(function (action) { return overlaps(action.data); });
      root.innerHTML = '<div class="an-overview-toolbar"><h2>Sonderangebote &amp; Getränkeaktionen</h2>'
        + '<button class="an-primary" data-create>+ Neue Aktion erstellen</button></div>'
        + '<nav class="an-tabs an-week-filter" aria-label="Aktionszeitraum">'
        + [['this', 'Diese Woche'], ['next', 'Nächste Woche'], ['all', 'Alle']].map(function (entry) {
          return '<button data-week="' + entry[0] + '" aria-pressed="' + (filter === entry[0]) + '">' + entry[1] + '</button>';
        }).join('') + '</nav><div class="an-list an-action-list">'
        + selected.map(function (action) {
          var data = action.data;
          return '<article class="an-card an-action-row"><div class="an-action-summary"><h3>' + M.esc(data.title)
            + '</h3><p>' + (data.kind === 'drinks' ? 'Getränkeaktion' : 'Sonderaktion') + ' · ' + M.date(data.valid_from) + ' – '
            + M.date(data.valid_to) + ' · ' + data.items.length + ' Artikel</p></div><div class="an-actions">'
            + '<button data-edit="' + M.esc(action.id) + '">Bearbeiten</button>'
            + '<button data-preview-action="' + M.esc(action.id) + '">Vorschau</button>'
            + '<button data-share-action="' + M.esc(action.id) + '">Teilen</button>'
            + '<button data-scale-action="' + M.esc(action.id) + '">Waage</button>'
            + '<button data-delete-action="' + M.esc(action.id) + '" aria-label="Aktion löschen">×</button></div></article>';
        }).join('') + (selected.length ? '' : '<p>Keine Aktionen in diesem Zeitraum.</p>') + '</div>'
        + '<details class="an-legacy-links"><summary>Bereits gespeicherte Feature-Aktionen</summary>'
        + '<p>Die bisherigen Feature-Entwürfe und Freigaben bleiben unverändert erhalten. Neue Aktionen werden im gemeinsamen CMS-Angebotsbestand gespeichert.</p>'
        + '<button data-feature-stock>Feature-Bestand öffnen</button></details>';
      root.onclick = function (event) {
        var b = event.target.closest('button');
        if (!b) return;
        if (b.dataset.week) { filter = b.dataset.week; render(); return; }
        if (b.hasAttribute('data-create')) { choose().catch(M.error); return; }
        if (b.hasAttribute('data-feature-stock')) { options.legacy(); return; }
        var id = b.dataset.edit || b.dataset.previewAction || b.dataset.shareAction || b.dataset.scaleAction || b.dataset.deleteAction;
        var action = list.find(function (item) { return item.id === id; });
        if (!action) return;
        if (b.dataset.edit) capture(action).catch(M.error);
        else if (b.dataset.deleteAction) {
          (async function () {
            if (!(await M.dialog('Aktion löschen?', '„' + action.data.title + '“ mit allen Artikeln löschen? Bereits an die Waage gesendete Motive werden hierdurch nicht entfernt.', 'Aktion löschen'))) return;
            b.disabled = true;
            try { await A.remove(action); await overview(); } finally { b.disabled = false; }
          })().catch(M.error);
        } else options.preview(action, b.dataset.scaleAction ? 'scale' : b.dataset.shareAction ? 'share' : 'preview', overview);
      };
    }
    async function choose() {
      var dlg = document.createElement('dialog'); dlg.className = 'an-dialog';
      dlg.setAttribute('aria-label', 'Aktionsart wählen');
      dlg.innerHTML = '<h2>Neue Aktion erstellen</h2><p>Welche Aktion möchtest du erfassen?</p><div class="an-actions">'
        + '<button data-kind="weekly" class="an-primary">Sonderaktion</button><button data-kind="drinks">Getränkeaktion</button><button data-cancel>Abbrechen</button></div>';
      function close() { dlg.close(); dlg.remove(); }
      dlg.onclick = function (event) {
        var b = event.target.closest('button'); if (!b) return;
        close();
        if (b.dataset.kind) capture(null, b.dataset.kind).catch(M.error);
      };
      dlg.addEventListener('cancel', function (event) { event.preventDefault(); close(); });
      document.body.appendChild(dlg); dlg.showModal();
    }
    async function capture(action, kind) {
      var draft = action ? M.clone(action.data) : M.blank(kind);
      var isNew = !action, drinks = draft.kind === 'drinks', changedRows = false;
      if (isNew) {
        if (drinks && A.settings().feature_archive_enabled !== false) {
          var standards = await M.request('/api/angebote-verwaltung?view=design');
          draft = M.blank(kind, standards.design.drinks);
        }
        var d = new Date(M.today() + 'T12:00:00Z'), day = d.getUTCDay();
        d.setUTCDate(d.getUTCDate() + (day === 0 ? 1 : 8 - day));
        draft.valid_from = d.toISOString().slice(0, 10); d.setUTCDate(d.getUTCDate() + 5);
        draft.valid_to = d.toISOString().slice(0, 10);
        draft.title = drinks ? 'Getränkeangebote' : 'Sonderangebote';
        draft.layout.density = 6;
        if (!drinks) await M.adoptWeekly(draft);
      }
      var dlg = document.createElement('dialog'); dlg.className = 'an-dialog an-cms-capture';
      dlg.setAttribute('aria-label', drinks ? 'Getränkeaktion erfassen' : 'Sonderaktion erfassen');
      dlg.innerHTML = '<div class="an-dialog-top"><h2>' + (action ? 'Aktion bearbeiten' : 'Neue Aktion erstellen') + ' · '
        + (drinks ? 'Getränke' : 'Sonderangebote') + '</h2><div class="an-actions"><button class="an-primary" data-save>Speichern</button>'
        + '<button data-cancel>Abbrechen</button><button data-cancel aria-label="Erfassung schließen">×</button></div></div>'
        + '<div class="an-capture-body"><div class="an-capture-meta">'
        + '<label class="an-field"><span>Titel</span><input data-meta="title" value="' + M.esc(draft.title) + '" maxlength="120"></label>'
        + '<label class="an-field"><span>Gültig von</span><input type="date" data-meta="valid_from" value="' + draft.valid_from + '"></label>'
        + '<label class="an-field"><span>Gültig bis</span><input type="date" data-meta="valid_to" value="' + draft.valid_to + '"></label></div>'
        + (drinks ? '<label class="an-field an-density-field"><span>Kacheln je Sammelflyer-Seite</span><select data-density><option value="4"'
          + (draft.layout.density === 4 ? ' selected' : '') + '>4 Kacheln (2×2)</option><option value="6"'
          + (draft.layout.density === 6 ? ' selected' : '') + '>6 Kacheln (2×3)</option></select></label>' : '')
        + '<div class="an-overview-toolbar"><strong>Artikel</strong><button data-add>+ Artikel</button></div>'
        + '<div class="an-capture-items"></div><p class="an-muted" data-capture-status role="status">Angebotspreis separat eingeben. Speichern übernimmt die Aktion für den gewählten Gültigkeitszeitraum.</p></div>';
      var host = dlg.querySelector('.an-capture-items'), status = dlg.querySelector('[data-capture-status]');
      var states = new Map(), pending = new Map(), imageTasks = new Set(), imageRequests = new WeakMap();
      var sequence = 0, dragRow = null, pasteRow = null, saving = false, resetApproved = false;
      function invalidateImage(row) {
        var token = (imageRequests.get(row) || 0) + 1; imageRequests.set(row, token); return token;
      }
      function input(row, field) { return row.querySelector('[data-f="' + field + '"]'); }
      function renumber() {
        Array.from(host.children).forEach(function (row, index) { row.querySelector('.cms-ang-row-num').textContent = index + 1; });
      }
      function mark() { dirty = true; }
      async function imagePreview(row, item) {
        if (!item.image_id) return;
        var img = await M.image(item.image_id);
        if (!row.isConnected) return;
        var canvas = document.createElement('canvas'), factor = Math.min(1, 150 / Math.max(img.width, img.height));
        canvas.width = Math.max(1, img.width * factor); canvas.height = Math.max(1, img.height * factor);
        canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
        var preview = row.querySelector('.cms-bild-preview'); preview.src = canvas.toDataURL(); preview.style.display = '';
        row.querySelector('.cms-bild-clear').style.display = '';
      }
      function rowItem(row) {
        var it = states.get(row);
        it.name = input(row, 'produkt').value.trim(); it.description = input(row, 'details').value.trim();
        it.price_cents = M.cents(input(row, 'preis').value);
        it.old_price_cents = M.cents(input(row, 'statt_preis').value);
        it.barcode = input(row, 'artikelnummer').value.trim();
        if (drinks) {
          it.units = input(row, 'units').value === '' ? null : Number(input(row, 'units').value);
          it.volume_ml = M.millilitres(input(row, 'volume_ml').value);
          it.packaging = input(row, 'packaging').value;
          it.deposit_free = input(row, 'deposit_mode').value === 'no';
          it.deposit_cents = it.deposit_free ? 0 : M.cents(input(row, 'deposit_cents').value);
        }
        return it;
      }
      function add(item) {
        item = item || Object.assign(M.item(), { id: crypto.randomUUID() });
        item.layout_key = item.id;
        if (!Object.prototype.hasOwnProperty.call(item, 'werbebild_id')) item.werbebild_id = '';
        var row = window.CMSAngeboteForm.row({ id: item.id, produkt: item.name, details: item.description,
          preis: item.price_cents == null ? null : item.price_cents / 100,
          statt_preis: item.old_price_cents == null ? null : item.old_price_cents / 100, artikelnummer: item.barcode }, ++sequence);
        row.id = 'cms-offer-row-' + sequence;
        row.querySelectorAll('[data-action]').forEach(function (el) { el.dataset.offerAction = el.dataset.action; delete el.dataset.action; });
        states.set(row, item);
        if (drinks) {
          var extra = document.createElement('div'); extra.className = 'an-drinks-fields';
          function field(name, label, value, attrs) {
            return '<label class="an-field"><span>' + label + '</span><input data-f="' + name + '" value="' + M.esc(value == null ? '' : value) + '" ' + (attrs || '') + '></label>';
          }
          extra.innerHTML = field('units', 'Anzahl', item.units, 'type="number" min="1" step="1"')
            + field('volume_ml', 'Liter je Einheit', M.litres(item.volume_ml), 'inputmode="decimal"')
            + '<label class="an-field"><span>Gebinde</span><select data-f="packaging"><option value="">Bitte wählen</option>'
            + ['Mehrweg', 'Einweg', 'Dose', 'Flasche', 'Karton', 'Fass'].map(function (value) { return '<option' + (item.packaging === value ? ' selected' : '') + '>' + value + '</option>'; }).join('')
            + '</select></label><label class="an-field"><span>Pfand</span><select data-f="deposit_mode"><option value="">Bitte wählen</option>'
            + '<option value="yes"' + (!item.deposit_free && item.deposit_cents > 0 ? ' selected' : '') + '>Mit Pfand</option>'
            + '<option value="no"' + (item.deposit_free ? ' selected' : '') + '>Pfandfrei</option></select></label>'
            + field('deposit_cents', 'Gesamtpfand €', item.deposit_cents == null ? '' : M.money(item.deposit_cents), 'inputmode="decimal"' + (item.deposit_free ? ' disabled' : ''))
            + '<output class="an-muted" data-base-price></output>';
          row.appendChild(extra);
        }
        var handle = row.querySelector('.cms-ang-drag');
        handle.setAttribute('role', 'button'); handle.tabIndex = 0; handle.setAttribute('aria-label', 'Artikel nach oben verschieben');
        handle.onpointerdown = function () { row.draggable = true; };
        handle.onkeydown = function (event) {
          if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); if (row.previousElementSibling) { host.insertBefore(row, row.previousElementSibling); changedRows = true; mark(); renumber(); } }
        };
        host.appendChild(row); renumber();
        imagePreview(row, item).catch(M.error);
        return row;
      }
      function track(task) {
        imageTasks.add(task);
        function done() { imageTasks.delete(task); }
        task.then(done, done);
        return task;
      }
      async function find(row) {
        var token = invalidateImage(row);
        var task = (async function () {
          var it = rowItem(row), button = row.querySelector('[data-offer-action="loadBildSharePoint"]'); button.disabled = true;
          try {
            var result = await A.findImage(it);
            if (!result) { status.textContent = 'Kein Bild gefunden. Du kannst eine Datei oder die Zwischenablage verwenden.'; return; }
            if (!row.isConnected || imageRequests.get(row) !== token) return;
            Object.assign(it, result); pending.delete(row); mark(); await imagePreview(row, it);
            status.textContent = 'Artikelbild gefunden.';
          } finally { button.disabled = false; }
        })();
        return track(task);
      }
      function setFile(row, file) {
        if (!file || !/^image\/(?:png|jpeg|webp)$/.test(file.type)) throw M.problem('Bitte ein PNG-, JPEG- oder WebP-Bild auswählen.');
        invalidateImage(row);
        pending.set(row, file); mark();
        var reader = new FileReader();
        reader.onload = function () {
          if (!row.isConnected) return;
          var preview = row.querySelector('.cms-bild-preview'); preview.src = reader.result; preview.style.display = '';
          row.querySelector('.cms-bild-clear').style.display = '';
        };
        reader.onerror = function () { M.error(M.problem('Das Bild konnte nicht gelesen werden.')); };
        reader.readAsDataURL(file);
      }
      function onPaste(event) {
        if (!pasteRow || saving) return;
        var files = event.clipboardData && Array.from(event.clipboardData.items || []);
        var found = files && files.find(function (entry) { return entry.type.startsWith('image/'); });
        if (found) { event.preventDefault(); try { setFile(pasteRow, found.getAsFile()); } catch (error) { M.error(error); } }
      }
      var initialItems = draft.items.slice();
      initialItems.forEach(add);
      if (isNew) while (host.children.length < draft.layout.density) add();
      function close() {
        document.removeEventListener('paste', onPaste);
        dlg.close(); dlg.remove(); activeDialog = null; dirty = false;
      }
      async function cancel() {
        if (saving) return;
        if (dirty && !(await M.dialog('Änderungen verwerfen?', 'Nicht gespeicherte Eingaben gehen verloren.', 'Änderungen verwerfen'))) return;
        close();
      }
      dlg.addEventListener('cancel', function (event) { event.preventDefault(); cancel().catch(M.error); });
      dlg.addEventListener('input', mark);
      dlg.addEventListener('change', function (event) {
        var row = event.target.closest('.cms-ang-row');
        if (row) {
          if (event.target.dataset.f === 'volume_ml') {
            var ml = M.millilitres(event.target.value);
            event.target.setCustomValidity(event.target.value.trim() && ml == null ? 'Bitte einen gültigen Literinhalt eingeben, zum Beispiel 0,5.' : '');
            if (ml != null) event.target.value = M.litres(ml);
            else if (event.target.value.trim()) event.target.reportValidity();
          }
          if (event.target.dataset.f === 'deposit_mode') {
            var pfand = input(row, 'deposit_cents'); pfand.disabled = event.target.value === 'no';
            pfand.value = pfand.disabled ? '0,00' : '';
          }
          var it = rowItem(row), output = row.querySelector('[data-base-price]');
          if (output) output.textContent = M.base(it) == null ? '' : M.money(M.base(it)) + ' €/l · ohne Pfand';
          if (event.target.dataset.f === 'artikelnummer' && !it.image_id && it.barcode) find(row).catch(M.error);
        }
      });
      dlg.querySelector('[data-density]')?.addEventListener('change', async function (event) {
        var value = Number(event.target.value);
        if (draft.layout.mode === 'free' && !(await M.dialog('Sammelraster ändern?', 'Alle Artikel und Einzelflyer bleiben erhalten. Freie Positionen des Sammelflyers werden für das neue Raster neu angeordnet.', 'Raster ändern'))) {
          event.target.value = draft.layout.density; return;
        }
        draft.layout.density = value; changedRows = true; mark();
        resetApproved = true;
        Array.from(host.children).slice(value).reverse().forEach(function (row) {
          var hasValue = Array.from(row.querySelectorAll('input:not([type=hidden]),select')).some(function (field) { return field.value.trim() !== ''; });
          if (!hasValue && !pending.has(row) && !states.get(row).image_id) { states.delete(row); row.remove(); }
        });
        while (host.children.length < value) add();
        renumber();
        status.textContent = value + ' Kacheln je Seite. Weitere Artikel erscheinen vollständig auf Folgeseiten.';
      });
      host.addEventListener('input', function (event) {
        if (event.target.dataset.f !== 'produkt') return;
        var inp = event.target, row = inp.closest('.cms-ang-row'), dd = row.querySelector('.cms-art-dd'), query = inp.value.trim().toLocaleLowerCase('de');
        dd.replaceChildren();
        if (!query) { dd.classList.remove('open'); return; }
        catalog().then(function (items) {
          if (!row.isConnected || inp.value.trim().toLocaleLowerCase('de') !== query) return;
          dd.replaceChildren();
          items.filter(function (it) { return [it.bezeichnung, it.artikelnummer, it.strichcode].join(' ').toLocaleLowerCase('de').includes(query); }).slice(0, 12).forEach(function (source) {
            var b = document.createElement('button'); b.type = 'button'; b.className = 'cms-art-opt';
            b.textContent = source.bezeichnung + ' · ' + (source.artikelnummer || '') + ' · ' + (source.strichcode || '') + ' · VK ' + M.money(M.cents(source.vk)) + ' €';
            b.onmousedown = function (e) { e.preventDefault(); };
            b.onclick = function (e) {
              e.stopPropagation();
              var it = states.get(row);
              input(row, 'produkt').value = source.bezeichnung; input(row, 'details').value = source.menge || '';
              input(row, 'artikelnummer').value = source.strichcode || '';
              it.image_id = ''; it.werbebild_id = ''; pending.delete(row);
              invalidateImage(row);
              row.querySelector('.cms-bild-preview').style.display = 'none';
              row.querySelector('.cms-bild-clear').style.display = 'none';
              it.article_number = String(source.artikelnummer || ''); it.retail_price_cents = M.cents(source.vk);
              if (!input(row, 'statt_preis').value && it.retail_price_cents) input(row, 'statt_preis').value = M.money(it.retail_price_cents);
              if (drinks) {
                var match = /(\d+)\s*[x×]\s*(\d+(?:[,.]\d+)?)\s*(ml|cl|l)?/i.exec(source.menge || '');
                if (match) {
                  input(row, 'units').value = match[1];
                  input(row, 'volume_ml').value = M.litres(Math.round(Number(match[2].replace(',', '.')) * (/^ml$/i.test(match[3]) ? 1 : /^cl$/i.test(match[3]) ? 10 : 1000)));
                }
              }
              dd.classList.remove('open'); mark(); inp.focus();
              find(row).catch(M.error);
            };
            dd.appendChild(b);
          });
          dd.classList.toggle('open', !!dd.children.length);
        }).catch(M.error);
      });
      host.addEventListener('keydown', function (event) {
        var dd = event.target.closest('.cms-art-wrap')?.querySelector('.cms-art-dd');
        if (!dd || !dd.classList.contains('open')) return;
        if (event.key === 'ArrowDown') { event.preventDefault(); var next = event.target.matches('.cms-art-opt') ? event.target.nextElementSibling : dd.firstElementChild; if (next) next.focus(); }
        if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); dd.classList.remove('open'); }
      });
      host.addEventListener('dragstart', function (event) { dragRow = event.target.closest('.cms-ang-row'); if (dragRow) event.dataTransfer.setData('text/plain', dragRow.id); });
      host.addEventListener('dragover', function (event) { if (dragRow) event.preventDefault(); });
      host.addEventListener('drop', function (event) {
        var row = event.target.closest('.cms-ang-row'); if (!dragRow || !row) return;
        event.preventDefault();
        if (dragRow !== row) { host.insertBefore(dragRow, event.clientY < row.getBoundingClientRect().top + row.offsetHeight / 2 ? row : row.nextSibling); changedRows = true; mark(); renumber(); }
      });
      host.addEventListener('dragend', function () { if (dragRow) dragRow.draggable = false; dragRow = null; });
      dlg.onclick = function (event) {
        var b = event.target.closest('button'); if (!b || saving) return;
        if (b.hasAttribute('data-cancel')) { cancel().catch(M.error); return; }
        if (b.hasAttribute('data-add')) { add(); changedRows = true; mark(); return; }
        var row = b.closest('.cms-ang-row'), cmd = b.dataset.offerAction;
        if (cmd === 'removeAngRow') { pending.delete(row); states.delete(row); row.remove(); changedRows = true; mark(); renumber(); }
        if (cmd === 'clearBild') {
          invalidateImage(row);
          Object.assign(states.get(row), { image_id: '', werbebild_id: '' }); pending.delete(row);
          row.querySelector('.cms-bild-preview').style.display = 'none'; b.style.display = 'none'; mark();
        }
        if (cmd === 'loadBildSharePoint') find(row).catch(M.error);
        if (cmd === 'uploadBildSP') {
          var fileInput = document.createElement('input'); fileInput.type = 'file'; fileInput.accept = 'image/png,image/jpeg,image/webp';
          fileInput.onchange = function () { try { setFile(row, fileInput.files[0]); } catch (error) { M.error(error); } }; fileInput.click();
        }
        if (cmd === 'pasteBildSP') {
          pasteRow = row;
          status.textContent = 'Zwischenablage für diese Zeile aktiv: Bild mit Strg+V einfügen.';
          if (navigator.clipboard && navigator.clipboard.read) {
            navigator.clipboard.read().then(async function (entries) {
              var found = entries.find(function (entry) { return entry.types.some(function (type) { return type.startsWith('image/'); }); });
              if (found) setFile(row, await found.getType(found.types.find(function (type) { return type.startsWith('image/'); })));
            }).catch(function (error) { console.warn('[Angebote] Zwischenablage', error); status.textContent = 'Bitte das kopierte Bild mit Strg+V einfügen oder eine Bilddatei auswählen.'; });
          }
        }
        if (b.hasAttribute('data-save')) {
          (async function () {
            saving = true; dlg.querySelectorAll('button,input,select').forEach(function (el) { el.disabled = true; });
            try {
              await Promise.all(Array.from(imageTasks));
              draft.title = dlg.querySelector('[data-meta="title"]').value.trim();
              draft.valid_from = dlg.querySelector('[data-meta="valid_from"]').value;
              draft.valid_to = dlg.querySelector('[data-meta="valid_to"]').value;
              draft.items = Array.from(host.children).filter(function (row) {
                var it = rowItem(row);
                if (it.name) return true;
                var hasValue = Array.from(row.querySelectorAll('input:not([type=hidden]),select')).some(function (field) { return field.value.trim() !== ''; });
                if (hasValue || pending.has(row) || it.image_id || it.article_number) throw M.problem('Bitte für jede ausgefüllte Zeile einen Produktnamen eingeben oder die Zeile entfernen.');
                return false;
              }).map(rowItem);
              var layoutChanged = changedRows || draft.items.map(function (it) { return it.id; }).join() !== initialItems.map(function (it) { return it.id; }).join();
              if (layoutChanged && !resetApproved && draft.layout.mode === 'free' && !(await M.dialog('Sammelflyer neu anordnen?', 'Alle Artikel und Einzelflyer bleiben erhalten. Die geänderte Artikelanzahl oder Reihenfolge erfordert eine neue Anordnung des Sammelflyers.', 'Neu anordnen'))) return;
              for (var row of host.children) {
                var oldPrice = input(row, 'statt_preis');
                if (oldPrice.value.trim() && M.cents(oldPrice.value) == null) throw M.problem('Bitte einen gültigen Stattpreis eingeben oder das Feld leer lassen.');
              }
              if (layoutChanged || draft.layout.mode === 'template') M.applyTemplate(draft);
              M.ensureTargets(draft); M.validate(draft);
              for (var entry of pending) {
                var it = states.get(entry[0]); if (!draft.items.includes(it)) continue;
                Object.assign(it, await A.productImage(entry[1], it.barcode || 'ANG-' + it.id));
              }
              var saved = await A.save(action, draft); close(); await overview();
              options.preview(saved, 'preview', overview);
            } catch (error) { await M.error(error); }
            finally {
              saving = false; dlg.querySelectorAll('button,input,select').forEach(function (el) { el.disabled = false; });
              host.querySelectorAll('[data-f="deposit_mode"]').forEach(function (el) { input(el.closest('.cms-ang-row'), 'deposit_cents').disabled = el.value === 'no'; });
            }
          })();
        }
      };
      activeDialog = dlg; document.addEventListener('paste', onPaste);
      document.body.appendChild(dlg); dlg.showModal();
    }
    return { start: overview, capture: capture, hasUnsavedChanges: function () { return !!activeDialog && dirty; } };
  }
  return { mount: mount };
})();
