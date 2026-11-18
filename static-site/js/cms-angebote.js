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
      root.classList.add('an-cms-overview');
      root.classList.remove('an-filters-open');
      var selected = list.filter(function (action) { return overlaps(action.data); });
      root.innerHTML = '<div class="an-overview-toolbar"><h2>Angebote</h2>'
        + '<button type="button" data-filter-toggle aria-expanded="false">Zeitraum: ' + ({ this: 'Diese Woche', next: 'Nächste Woche', all: 'Alle' })[filter] + '</button>'
        + '<div class="an-new-actions"><button class="an-primary" data-create-kind="weekly">+ Sonderaktion</button>'
        + '<button data-create-kind="drinks">+ Getränkeaktion</button></div></div>'
        + '<nav class="an-tabs an-week-filter" aria-label="Aktionszeitraum">'
        + [['this', 'Diese Woche'], ['next', 'Nächste Woche'], ['all', 'Alle']].map(function (entry) {
          return '<button data-week="' + entry[0] + '" aria-pressed="' + (filter === entry[0]) + '">' + entry[1] + '</button>';
        }).join('') + '</nav><div class="an-list an-action-list">'
        + selected.map(function (action) {
          var data = action.data;
          var card = window.CMSAngeboteForm.action({
            aktion_id: action.id, titel: data.title, von: M.date(data.valid_from), bis: M.date(data.valid_to),
            items: data.items.map(function (item) { return { produkt: item.name, preis: item.price_cents == null ? null : item.price_cents / 100,
              statt_preis: item.old_price_cents == null ? null : item.old_price_cents / 100 }; })
          }, M.esc, function (value) { return M.money(Math.round(value * 100)) + ' €'; });
          var commands = { editAktion: 'edit', previewAktion: 'previewAction', shareAktion: 'shareAction', waageAktion: 'scaleAction', deleteAktion: 'deleteAction' };
          card.querySelectorAll('[data-action]').forEach(function (element) {
            var command = commands[element.dataset.action];
            if (command) element.dataset[command] = action.id;
            else element.dataset.cmsToggle = '';
            delete element.dataset.action; delete element.dataset.id;
          });
          var duplicate = document.createElement('button'); duplicate.type = 'button';
          duplicate.textContent = 'Duplizieren'; duplicate.dataset.duplicateAction = action.id;
          var buttons = card.querySelector('.cms-akt-btns'), summary = card.querySelector('.cms-ang-summary');
          var toggle = card.querySelector('[data-cms-toggle]');
          toggle.removeAttribute('data-cms-toggle'); toggle.removeAttribute('role'); toggle.removeAttribute('tabindex'); toggle.removeAttribute('aria-expanded');
          summary.dataset.cmsToggle = ''; summary.setAttribute('role', 'button'); summary.tabIndex = 0; summary.setAttribute('aria-expanded', 'false');
          var badge = document.createElement('span'); badge.className = 'an-action-kind';
          badge.textContent = data.kind === 'drinks' ? 'Getränkeaktion' : 'Sonderaktion';
          summary.firstElementChild.prepend(badge);
          var art = document.createElement('span'); art.className = 'an-action-art'; art.setAttribute('aria-hidden', 'true');
          art.innerHTML = '<svg viewBox="0 0 32 40" fill="none" stroke="currentColor" stroke-width="1.5">'
            + (data.kind === 'drinks' ? '<path d="M12 3h8v8l4 7v17a3 3 0 0 1-3 3H11a3 3 0 0 1-3-3V18l4-7z"/><path d="M12 7h8M8 22h16v10H8"/>'
              : '<rect x="3" y="2" width="26" height="36" rx="3"/><path d="M8 9h16M8 15h16M8 22h6v9H8zM19 22h5v9h-5z"/>') + '</svg>';
          summary.prepend(art);
          var more = document.createElement('details'); more.className = 'an-action-more';
          var moreLabel = document.createElement('summary'); moreLabel.textContent = '⋯'; moreLabel.setAttribute('aria-label', 'Weitere Aktionsfunktionen');
          var menu = document.createElement('div'); more.append(moreLabel, menu);
          buttons.querySelectorAll('[data-scale-action],[data-delete-action]').forEach(function (button) { menu.appendChild(button); });
          menu.prepend(duplicate); buttons.appendChild(more);
          card.classList.add('an-overview-action');
          var state = document.createElement('span'); state.className = 'an-save-state';
          state.textContent = ' · ' + M.savedState(data, false); card.querySelector('.cms-ang-meta').appendChild(state);
          return card.outerHTML;
        }).join('') + (selected.length ? '' : '<p>Keine Aktionen in diesem Zeitraum.</p>') + '</div>'
        + '<details class="an-legacy-links"><summary>Bereits gespeicherte Feature-Aktionen</summary>'
        + '<p>Die bisherigen Feature-Entwürfe und Freigaben bleiben unverändert erhalten. Neue Aktionen werden im gemeinsamen CMS-Angebotsbestand gespeichert.</p>'
        + '<button data-feature-stock>Feature-Bestand öffnen</button></details>';
      root.onclick = function (event) {
        var b = event.target.closest('button');
        var toggle = event.target.closest('[data-cms-toggle]');
        if (!b && toggle) {
          var collapsed = toggle.closest('.cms-card').querySelector('.cms-ang-items').classList.toggle('collapsed');
          toggle.querySelector('.cms-ang-chevron').classList.toggle('collapsed', collapsed);
          toggle.setAttribute('aria-expanded', String(!collapsed)); return;
        }
        if (!b) return;
        if (b.hasAttribute('data-filter-toggle')) {
          var open = b.getAttribute('aria-expanded') !== 'true';
          b.setAttribute('aria-expanded', String(open)); root.classList.toggle('an-filters-open', open); return;
        }
        if (b.dataset.week) { filter = b.dataset.week; render(); return; }
        if (b.dataset.createKind) { capture(null, b.dataset.createKind).catch(M.error); return; }
        if (b.hasAttribute('data-create')) { choose().catch(M.error); return; }
        if (b.hasAttribute('data-feature-stock')) { options.legacy(); return; }
        var id = b.dataset.edit || b.dataset.previewAction || b.dataset.shareAction || b.dataset.scaleAction || b.dataset.deleteAction || b.dataset.duplicateAction;
        var action = list.find(function (item) { return item.id === id; });
        if (!action) return;
        if (b.dataset.duplicateAction) capture(null, action.data.kind, M.duplicateAction(action.data)).catch(M.error);
        else if (b.dataset.edit) capture(action).catch(M.error);
        else if (b.dataset.deleteAction) {
          (async function () {
            if (!(await M.dialog('Aktion löschen?', '„' + action.data.title + '“ mit allen Artikeln löschen? Bereits an die Waage gesendete Motive werden hierdurch nicht entfernt.', 'Aktion löschen'))) return;
            b.disabled = true;
            try { await A.remove(action); await overview(); }
            catch (error) {
              if (error.status !== 409) throw error;
              await M.error(error); await overview();
            } finally { b.disabled = false; }
          })().catch(M.error);
        } else options.preview(action, b.dataset.scaleAction ? 'scale' : b.dataset.shareAction ? 'share' : 'preview', overview);
      };
      root.onkeydown = function (event) {
        if (event.target.matches('[data-cms-toggle]') && (event.key === 'Enter' || event.key === ' ')) {
          event.preventDefault(); event.target.click();
        }
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
    async function capture(action, kind, initial) {
      var draft = initial || (action ? M.clone(action.data) : M.blank(kind));
      var isNew = !action, drinks = draft.kind === 'drinks', changedRows = false;
      if (action && action.needs_weekly_template) await M.adoptWeekly(draft);
      if (isNew) {
        if (!initial && drinks && A.settings().feature_archive_enabled !== false) {
          var standards = await M.request('/api/angebote-verwaltung?view=design');
          draft = M.blank(kind, standards.design.drinks);
        }
        var d = new Date(M.today() + 'T12:00:00Z'), day = d.getUTCDay();
        d.setUTCDate(d.getUTCDate() + (day === 0 ? 1 : 8 - day));
        draft.valid_from = d.toISOString().slice(0, 10); d.setUTCDate(d.getUTCDate() + 5);
        draft.valid_to = d.toISOString().slice(0, 10);
        if (!initial) {
          draft.title = drinks ? 'Getränkeangebote' : 'Sonderangebote';
          draft.layout.density = 6;
          if (!drinks) await M.adoptWeekly(draft);
          M.rememberDesign(draft);
        }
      }
      var dlg = document.createElement('dialog'); dlg.className = 'an-dialog an-cms-capture';
      dlg.setAttribute('aria-label', drinks ? 'Getränkeaktion erfassen' : 'Sonderaktion erfassen');
      dlg.innerHTML = '<div class="an-dialog-top"><h2>' + (action ? 'Aktion bearbeiten' : 'Neue Aktion erstellen') + ' · '
        + (drinks ? 'Getränke' : 'Sonderangebote') + '</h2><div class="an-actions"><button class="an-primary" data-save>Speichern</button>'
        + (action ? '<button data-reload>Gespeicherten Stand laden</button>' : '')
        + '<button data-quality>Qualität prüfen</button>'
        + '<button data-cancel>Abbrechen</button><button data-cancel aria-label="Erfassung schließen">×</button></div></div>'
        + '<div class="an-capture-body"><div class="an-capture-meta">'
        + '<label class="an-field"><span>Titel</span><input data-meta="title" value="' + M.esc(draft.title) + '" maxlength="120"></label>'
        + '<label class="an-field"><span>Gültig von</span><input type="date" data-meta="valid_from" value="' + draft.valid_from + '"></label>'
        + '<label class="an-field"><span>Gültig bis</span><input type="date" data-meta="valid_to" value="' + draft.valid_to + '"></label>'
        + (drinks ? '<label class="an-field an-density-field"><span>Kacheln je Sammelflyer-Seite</span><select data-density><option value="4"'
          + (draft.layout.density === 4 ? ' selected' : '') + '>4 Kacheln (2×2)</option><option value="6"'
          + (draft.layout.density === 6 ? ' selected' : '') + '>6 Kacheln (2×3)</option></select></label>' : '') + '</div>'
        + '<div class="an-overview-toolbar"><strong>Artikel</strong><button data-add>+ Artikel</button></div>'
        + '<div class="an-capture-items"></div><p class="an-muted" data-capture-status role="status">Angebotspreis separat eingeben. Speichern übernimmt die Aktion für den gewählten Gültigkeitszeitraum.</p></div>';
      var host = dlg.querySelector('.an-capture-items'), status = dlg.querySelector('[data-capture-status]');
      var states = new Map(), pending = new Map(), imageTasks = new Set(), imageRequests = new WeakMap();
      var filePreviews = new Map(), workspaceState = null, selectedRow = null, blockedReport = null;
      var phone = matchMedia('(max-width:599px), (max-width:899px) and (max-height:500px)');
      var top = dlg.querySelector('.an-dialog-top'), footer = document.createElement('footer');
      footer.className = 'an-capture-footer';
      var actions = top.querySelector('.an-actions'), closeButton = actions.querySelector('[aria-label="Erfassung schließen"]');
      top.appendChild(closeButton); footer.appendChild(actions); dlg.appendChild(footer);
      var area = document.createElement('select'); area.dataset.captureArea = ''; area.setAttribute('aria-label', 'Aktionsbereich');
      area.innerHTML = '<option value="articles">Artikel / Bilder</option><option value="design">Gestaltung</option><option value="output">Ausgabe</option>';
      top.insertBefore(area, closeButton);
      window.CMSAngeboteForm.areaNavigation(area);
      var metaToggle = document.createElement('button'); metaToggle.type = 'button'; metaToggle.dataset.metaToggle = '';
      metaToggle.textContent = 'Daten'; metaToggle.setAttribute('aria-label', 'Aktionsdaten ein- oder ausblenden');
      metaToggle.setAttribute('aria-expanded', String(isNew)); top.insertBefore(metaToggle, closeButton);
      var mobileList = document.createElement('div'); mobileList.className = 'an-capture-mobile-list';
      host.before(mobileList);
      var stepper = document.createElement('div'); stepper.className = 'an-capture-stepper';
      stepper.innerHTML = '<button type="button" data-capture-back aria-label="Zur Artikelliste">← Liste</button><span data-capture-count></span>'
        + '<button type="button" data-capture-prev aria-label="Vorheriger Artikel">←</button><button type="button" data-capture-next aria-label="Nächster Artikel">→</button>';
      host.before(stepper);
      var more = document.createElement('details'); more.className = 'an-capture-more';
      more.open = !phone.matches;
      more.innerHTML = '<summary>Weitere Aktionen</summary><div></div>';
      Array.from(actions.children).filter(function (button) { return !button.hasAttribute('data-save') && !button.hasAttribute('data-cancel'); }).forEach(function (button) { more.lastElementChild.appendChild(button); });
      actions.prepend(more);
      var layerAnchors = new Map();
      var sequence = 0, dragRow = null, pasteRow = null, saving = false, resetApproved = false;
      dlg.classList.toggle('an-capture-drinks', drinks);
      function hideLayer(layer) {
        layer.classList.remove('open');
        layerAnchors.delete(layer);
        if (layer.matches(':popover-open')) layer.hidePopover();
      }
      function positionLayer(layer, anchor) {
        var r = anchor.getBoundingClientRect(), body = dlg.querySelector('.an-capture-body').getBoundingClientRect();
        if (r.bottom <= body.top || r.top >= body.bottom || !anchor.isConnected) { hideLayer(layer); return; }
        var gap = 6, margin = 12, below = Math.max(0, innerHeight - r.bottom - margin - gap);
        var above = Math.max(0, r.top - margin - gap), desired = layer.classList.contains('cms-art-dd') ? 280 : 400;
        var up = below < desired && above > below, available = up ? above : below;
        layer.style.width = Math.min(innerWidth - 2 * margin, Math.max(r.width, 320)) + 'px';
        layer.style.maxHeight = Math.min(desired, available) + 'px';
        var height = layer.getBoundingClientRect().height, width = layer.getBoundingClientRect().width;
        layer.style.left = Math.max(margin, Math.min(r.left, innerWidth - width - margin)) + 'px';
        layer.style.top = (up ? r.top - height - gap : r.bottom + gap) + 'px';
      }
      function showLayer(layer, anchor) {
        layer.classList.add('open');
        layerAnchors.set(layer, anchor);
        if (!layer.matches(':popover-open')) layer.showPopover();
        positionLayer(layer, anchor);
      }
      function updateLayers() { layerAnchors.forEach(function (anchor, layer) { positionLayer(layer, anchor); }); }
      function prepareLayer(layer) {
        layer.setAttribute('popover', 'auto');
        layer.addEventListener('toggle', function (event) {
          if (event.newState === 'closed') {
            layer.classList.remove('open'); layerAnchors.delete(layer);
          }
        });
      }
      function imagePresence(row, present) {
        row.querySelector('.an-image-trigger').classList.toggle('an-has-image', present);
        row.querySelector('.cms-bild-clear').style.display = present ? '' : 'none';
      }
      function invalidateImage(row) {
        var token = (imageRequests.get(row) || 0) + 1; imageRequests.set(row, token); return token;
      }
      function input(row, field) { return row.querySelector('[data-f="' + field + '"]'); }
      function renumber() {
        Array.from(host.children).forEach(function (row, index) { row.querySelector('.cms-ang-row-num').textContent = index + 1; });
        renderMobile();
      }
      function mark(event) {
        if (event && event.target === area) return;
        dirty = true; status.textContent = 'Ungespeicherte Änderungen · Speichern steuert die Sichtbarkeit im Gültigkeitszeitraum.'; renderMobile();
      }
      function renderMobile() {
        var rows = Array.from(host.children), narrow = phone.matches;
        if (selectedRow && !rows.includes(selectedRow)) selectedRow = null;
        if (dlg.classList.contains('an-capture-phone') !== narrow) more.open = !narrow;
        dlg.classList.toggle('an-capture-phone', narrow);
        dlg.classList.toggle('an-capture-detail', narrow && !!selectedRow);
        dlg.classList.toggle('an-meta-open', metaToggle.getAttribute('aria-expanded') === 'true');
        mobileList.hidden = !narrow || !!selectedRow; stepper.hidden = !narrow || !selectedRow;
        rows.forEach(function (row) { row.hidden = narrow && row !== selectedRow; });
        if (selectedRow) {
          var index = rows.indexOf(selectedRow);
          stepper.querySelector('[data-capture-count]').textContent = (index + 1) + ' / ' + rows.length;
          stepper.querySelector('[data-capture-prev]').disabled = index === 0;
          stepper.querySelector('[data-capture-next]').disabled = index === rows.length - 1;
        }
        mobileList.replaceChildren();
        rows.forEach(function (row, index) {
          var button = document.createElement('button'); button.type = 'button'; button.dataset.captureItem = row.id;
          var image = row.querySelector('.cms-bild-preview'), copy = document.createElement('span');
          if (image && image.style.display !== 'none' && image.src) { var thumb = document.createElement('img'); thumb.src = image.src; thumb.alt = ''; button.appendChild(thumb); }
          var name = document.createElement('strong'); name.textContent = (index + 1) + ' · ' + (input(row, 'produkt').value || 'Neuer Artikel');
          var detail = document.createElement('small'); detail.textContent = [input(row, 'preis').value ? input(row, 'preis').value + ' €' : 'Preis fehlt', input(row, 'details').value].filter(Boolean).join(' · ');
          copy.append(name, detail); button.appendChild(copy);
          button.onclick = function () { selectRow(row); }; mobileList.appendChild(button);
        });
      }
      function selectRow(row) {
        layerAnchors.forEach(function (anchor, layer) { hideLayer(layer); });
        selectedRow = row; metaToggle.setAttribute('aria-expanded', 'false'); renderMobile();
        dlg.querySelector('.an-capture-body').scrollTop = 0;
        if (row) input(row, 'produkt').focus({ preventScroll: true });
        else mobileList.querySelector('button')?.focus({ preventScroll: true });
      }
      metaToggle.onclick = function () { metaToggle.setAttribute('aria-expanded', String(metaToggle.getAttribute('aria-expanded') !== 'true')); renderMobile(); };
      stepper.querySelector('[data-capture-back]').onclick = function () { selectRow(null); };
      stepper.querySelector('[data-capture-prev]').onclick = function () { selectRow(selectedRow.previousElementSibling); };
      stepper.querySelector('[data-capture-next]').onclick = function () { selectRow(selectedRow.nextElementSibling); };
      function resizeCapture() {
        var focused = document.activeElement && document.activeElement.closest('.cms-ang-row');
        if (phone.matches && focused && host.contains(focused)) {
          selectedRow = focused; metaToggle.setAttribute('aria-expanded', 'false');
        }
        renderMobile();
      }
      phone.addEventListener('change', resizeCapture);
      function imageStatus(row, text, failed) {
        var note = row.querySelector('[data-image-status]');
        note.textContent = text; note.classList.toggle('an-image-error', !!failed);
      }
      async function imagePreview(row, item, token) {
        if (!item.image_id) return;
        var img = await M.image(item.image_id);
        if (!row.isConnected || imageRequests.get(row) !== token) return;
        var canvas = document.createElement('canvas'), factor = Math.min(1, 150 / Math.max(img.width, img.height));
        canvas.width = Math.max(1, img.width * factor); canvas.height = Math.max(1, img.height * factor);
        canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
        var preview = row.querySelector('.cms-bild-preview'); preview.src = canvas.toDataURL(); preview.style.display = '';
        imagePresence(row, true);
        imageStatus(row, '', false);
        renderMobile();
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
        var imageBox = row.querySelector('.cms-ang-row-img'), preview = imageBox.querySelector('img');
        var imageMenu = document.createElement('div'); imageMenu.className = 'an-capture-image-menu';
        imageMenu.id = row.id + '-images'; imageMenu.setAttribute('role', 'group'); imageMenu.setAttribute('aria-label', 'Produktbild bearbeiten');
        imageMenu.innerHTML = '<div class="an-image-menu-head"><strong>Produktbild bearbeiten</strong><button type="button" data-image-close aria-label="Bildmenü schließen">×</button></div>';
        var labels = {
          loadBildSharePoint: ['Bild im Bestand suchen', 'Zum Strichcode oder zur Artikelnummer'],
          uploadBildSP: ['Bilddatei auswählen', 'PNG, JPEG oder WebP · Upload beim Speichern'],
          pasteBildSP: ['Aus Zwischenablage einfügen', 'Bild mit Strg+V / Cmd+V einfügen'],
          clearBild: ['Bildzuordnung entfernen', 'Artikel und Stammbild bleiben erhalten']
        };
        ['loadBildSharePoint', 'uploadBildSP', 'pasteBildSP', 'clearBild'].forEach(function (cmd) {
          var button = imageBox.querySelector('[data-offer-action="' + cmd + '"]');
          button.innerHTML = '<strong>' + labels[cmd][0] + '</strong><small>' + labels[cmd][1] + '</small>';
          imageMenu.appendChild(button);
        });
        var trigger = document.createElement('button'); trigger.type = 'button'; trigger.className = 'an-image-trigger';
        trigger.setAttribute('aria-label', 'Produktbild bearbeiten'); trigger.setAttribute('aria-expanded', 'false');
        trigger.setAttribute('aria-controls', imageMenu.id);
        trigger.appendChild(preview);
        var placeholder = document.createElement('span'); placeholder.className = 'an-image-placeholder'; placeholder.textContent = '+ Bild';
        trigger.appendChild(placeholder);
        imageBox.appendChild(trigger); row.appendChild(imageMenu);
        prepareLayer(imageMenu);
        imageMenu.addEventListener('toggle', function (event) { trigger.setAttribute('aria-expanded', String(event.newState === 'open')); });
        trigger.onclick = function () {
          if (imageMenu.matches(':popover-open')) hideLayer(imageMenu);
          else {
            showLayer(imageMenu, trigger);
            imageMenu.querySelector('[data-offer-action]:not([disabled])').focus({ preventScroll: true });
          }
        };
        row.querySelector('[data-image-close]').onclick = function () { hideLayer(imageMenu); trigger.focus(); };
        imageMenu.addEventListener('keydown', function (event) {
          if (event.key === 'Escape') {
            event.preventDefault(); event.stopPropagation(); hideLayer(imageMenu); trigger.focus();
          }
        });
        var dd = row.querySelector('.cms-art-dd'); prepareLayer(dd);
        function labelField(node, text, className) {
          var label = document.createElement('label'); label.className = 'an-field ' + (className || '');
          var caption = document.createElement('span'); caption.textContent = text; label.appendChild(caption);
          node.parentNode.insertBefore(label, node); label.appendChild(node); return label;
        }
        labelField(row.querySelector('.cms-art-wrap'), 'Produkt', 'an-capture-product');
        labelField(input(row, 'preis'), 'Angebot €', 'an-capture-price');
        labelField(input(row, 'statt_preis'), 'Statt €', 'an-capture-old');
        labelField(input(row, 'artikelnummer'), 'Strichcode', 'an-capture-barcode');
        var details = labelField(input(row, 'details'), 'Details / Beschreibung', 'an-capture-description');
        var extra = document.createElement('div'); extra.className = 'an-capture-extra';
        extra.appendChild(details); row.appendChild(extra);
        var note = document.createElement('span'); note.dataset.imageStatus = ''; note.className = 'an-image-status';
        note.setAttribute('role', 'status'); row.appendChild(note);
        states.set(row, item);
        if (drinks) {
          extra.classList.add('an-drinks-fields');
          function field(name, label, value, attrs) {
            return '<label class="an-field"><span>' + label + '</span><input data-f="' + name + '" value="' + M.esc(value == null ? '' : value) + '" ' + (attrs || '') + '></label>';
          }
          extra.insertAdjacentHTML('beforeend', field('units', 'Anzahl', item.units, 'type="number" min="1" step="1"')
            + field('volume_ml', 'Liter je Einheit', M.litres(item.volume_ml), 'inputmode="decimal"')
            + '<label class="an-field"><span>Gebinde</span><select data-f="packaging"><option value="">Bitte wählen</option>'
            + ['Mehrweg', 'Einweg', 'Dose', 'Flasche', 'Karton', 'Fass'].map(function (value) { return '<option' + (item.packaging === value ? ' selected' : '') + '>' + value + '</option>'; }).join('')
            + '</select></label><label class="an-field"><span>Pfand</span><select data-f="deposit_mode"><option value="">Bitte wählen</option>'
            + '<option value="yes"' + (!item.deposit_free && item.deposit_cents > 0 ? ' selected' : '') + '>Mit Pfand</option>'
            + '<option value="no"' + (item.deposit_free ? ' selected' : '') + '>Pfandfrei</option></select></label>'
            + field('deposit_cents', 'Gesamtpfand €', item.deposit_cents == null ? '' : M.money(item.deposit_cents), 'inputmode="decimal"' + (item.deposit_free ? ' disabled' : ''))
            + '<output class="an-muted" data-base-price></output>');
        }
        var handle = row.querySelector('.cms-ang-drag');
        handle.setAttribute('role', 'button'); handle.tabIndex = 0; handle.setAttribute('aria-label', 'Artikel nach oben verschieben');
        handle.onpointerdown = function () { row.draggable = true; };
        handle.onkeydown = function (event) {
          if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); if (row.previousElementSibling) { host.insertBefore(row, row.previousElementSibling); changedRows = true; mark(); renumber(); } }
        };
        host.appendChild(row); renumber();
        if (item.image_id) {
          var token = invalidateImage(row);
          imageStatus(row, 'Bild wird geladen …', false);
          track(imagePreview(row, item, token)).catch(function (error) {
            console.error('[Angebote] Artikelbild', error);
            if (row.isConnected && imageRequests.get(row) === token) imageStatus(row, error.userMessage || 'Artikelbild konnte nicht geladen werden. Bitte erneut suchen.', true);
          });
        } else if (action && action.restore_images && item.name) find(row, true).catch(function (error) {
          console.error('[Angebote] Artikelbild', error);
          if (row.isConnected) imageStatus(row, error.userMessage || 'Artikelbild konnte nicht geladen werden. Bitte erneut suchen.', true);
        });
        return row;
      }
      function track(task) {
        imageTasks.add(task);
        function done() { imageTasks.delete(task); }
        task.then(done, done);
        return task;
      }
      async function find(row, automatic) {
        var token = invalidateImage(row);
        imageStatus(row, 'Bild wird geladen …', false);
        var task = (async function () {
          var it = rowItem(row), button = row.querySelector('[data-offer-action="loadBildSharePoint"]'); button.disabled = true;
          try {
            var result = await A.findImage(it);
            if (!row.isConnected || imageRequests.get(row) !== token) return;
            if (!result) { imageStatus(row, 'Kein Bild gefunden. Bildsuche oder eigene Datei verwenden.', false); return; }
            Object.assign(it, result); pending.delete(row); if (!automatic) mark(); await imagePreview(row, it, token);
            status.textContent = 'Artikelbild gefunden.';
          } finally { button.disabled = false; }
        })();
        return track(task);
      }
      function setFile(row, file) {
        if (!file || !/^image\/(?:png|jpeg|webp)$/.test(file.type)) throw M.problem('Bitte ein PNG-, JPEG- oder WebP-Bild auswählen.');
        var token = invalidateImage(row);
        imageStatus(row, '', false);
        pending.set(row, file); filePreviews.delete(row); mark();
        var reader = new FileReader();
        track(new Promise(function (resolve, reject) {
          reader.onload = function () {
            if (row.isConnected && imageRequests.get(row) === token) {
              filePreviews.set(row, reader.result);
              var preview = row.querySelector('.cms-bild-preview'); preview.src = reader.result; preview.style.display = '';
              imagePresence(row, true); renderMobile();
            }
            resolve();
          };
          reader.onerror = function () { reject(M.problem('Das Bild konnte nicht gelesen werden.')); };
          reader.readAsDataURL(file);
        })).catch(function (error) { imageStatus(row, error.userMessage, true); M.error(error); });
      }
      function onPaste(event) {
        if (!pasteRow || saving) return;
        var files = event.clipboardData && Array.from(event.clipboardData.items || []);
        var found = files && files.find(function (entry) { return entry.type.startsWith('image/'); });
        if (found) { event.preventDefault(); try { setFile(pasteRow, found.getAsFile()); } catch (error) { M.error(error); } }
      }
      var initialItems = draft.items.slice();
      var arrangedItems = initialItems.map(function (item) { return item.id; }).join();
      initialItems.forEach(add);
      if (isNew) while (host.children.length < draft.layout.density) add();
      async function inspect(report) {
        var choice = await M.qualityDialog(report, { goto: true });
        var issue = choice && choice.goto;
        if (!issue) return;
        var row = Array.from(host.children).find(function (candidate) { return states.get(candidate) && states.get(candidate).id === issue.item_id; });
        var field = { name: 'produkt', old_price: 'statt_preis', units: 'units', deposit: 'deposit_cents' }[issue.field] || 'produkt';
        if (!row) return;
        if (phone.matches) selectRow(row);
        row.scrollIntoView({ block: 'center' });
        var target = ['no-image', 'low-resolution'].includes(issue.code) ? row.querySelector('.an-image-trigger') : input(row, field);
        if (target && !target.disabled) target.focus();
      }
      async function probe() {
        var copy = M.clone(draft);
        copy.title = dlg.querySelector('[data-meta="title"]').value.trim();
        copy.valid_from = dlg.querySelector('[data-meta="valid_from"]').value;
        copy.valid_to = dlg.querySelector('[data-meta="valid_to"]').value;
        copy.items = Array.from(host.children).filter(function (row) { return rowItem(row).name; }).map(function (row) { return M.clone(states.get(row)); });
        if (!copy.items.length) return M.quality(copy);
        var layoutChanged = changedRows || copy.items.map(function (it) { return it.id; }).join() !== arrangedItems;
        if (layoutChanged || copy.layout.mode === 'template') M.applyTemplate(copy);
        M.ensureTargets(copy);
        return M.quality(copy);
      }
      async function prepareDraft() {
        await Promise.all(Array.from(imageTasks));
        draft.title = dlg.querySelector('[data-meta="title"]').value.trim();
        draft.valid_from = dlg.querySelector('[data-meta="valid_from"]').value;
        draft.valid_to = dlg.querySelector('[data-meta="valid_to"]').value;
        draft.items = Array.from(host.children).filter(function (row) {
          var it = rowItem(row);
          if (it.name) return true;
          var hasValue = Array.from(row.querySelectorAll('input:not([type=hidden]),select')).some(function (field) { return field.value.trim() !== ''; });
          if (hasValue || pending.has(row) || it.image_id || it.article_number) {
            if (phone.matches) selectRow(row);
            throw M.problem('Bitte für jede ausgefüllte Zeile einen Produktnamen eingeben oder die Zeile entfernen.');
          }
          return false;
        }).map(rowItem);
        var layoutChanged = changedRows || draft.items.map(function (it) { return it.id; }).join() !== arrangedItems;
        if (layoutChanged && !resetApproved && draft.layout.mode === 'free') {
          if (!(await M.dialog('Sammelflyer neu anordnen?', 'Alle Artikel und Einzelflyer bleiben erhalten. Die geänderte Artikelanzahl oder Reihenfolge erfordert eine neue Anordnung des Sammelflyers.', 'Neu anordnen'))) return false;
          resetApproved = true;
        }
        for (var row of host.children) {
          var oldPrice = input(row, 'statt_preis');
          if (oldPrice.value.trim() && M.cents(oldPrice.value) == null) {
            if (phone.matches) selectRow(row);
            throw M.problem('Bitte einen gültigen Stattpreis eingeben oder das Feld leer lassen.');
          }
        }
        if (layoutChanged || draft.layout.mode === 'template') M.applyTemplate(draft);
        M.ensureTargets(draft);
        arrangedItems = draft.items.map(function (item) { return item.id; }).join(); changedRows = false;
        return true;
      }
      function acceptPreview(value, temporaryImages) {
        draft = M.clone(value);
        Array.from(host.children).forEach(function (row) {
          var previous = states.get(row), item = draft.items.find(function (entry) { return entry.id === previous.id; });
          if (!item) return;
          var temporary = temporaryImages.get(item.id);
          if (temporary && item.image_id === temporary.id) {
            item.image_id = pending.has(row) ? temporary.original : previous.image_id;
            if (!pending.has(row)) item.werbebild_id = previous.werbebild_id;
          }
          else if (temporary) { pending.delete(row); filePreviews.delete(row); }
          states.set(row, item);
          var fields = { produkt: item.name, details: item.description, preis: item.price_cents == null ? '' : M.money(item.price_cents),
            statt_preis: item.old_price_cents == null ? '' : M.money(item.old_price_cents), artikelnummer: item.barcode };
          if (drinks) Object.assign(fields, { units: item.units == null ? '' : item.units, volume_ml: M.litres(item.volume_ml),
            packaging: item.packaging, deposit_mode: item.deposit_free ? 'no' : item.deposit_cents > 0 ? 'yes' : '',
            deposit_cents: item.deposit_cents == null ? '' : M.money(item.deposit_cents) });
          Object.keys(fields).forEach(function (key) { input(row, key).value = fields[key] == null ? '' : fields[key]; });
          if (drinks) input(row, 'deposit_cents').disabled = !!item.deposit_free;
          if (!pending.has(row) && item.image_id !== previous.image_id) {
            if (item.image_id) track(imagePreview(row, item, invalidateImage(row))).catch(M.error);
            else { row.querySelector('.cms-bild-preview').style.display = 'none'; imagePresence(row, false); }
          }
        });
        ['title', 'valid_from', 'valid_to'].forEach(function (key) { dlg.querySelector('[data-meta="' + key + '"]').value = draft[key]; });
        renderMobile();
      }
      async function persist() {
        if (!(await prepareDraft())) return null;
        M.validate(draft);
        var report = await M.quality(draft);
        if (report.errors.length) {
          status.textContent = 'Speichern nicht abgeschlossen · Qualitätsprüfung: ' + report.errors.length + ' Fehler. Eingaben bleiben erhalten.';
          blockedReport = report; return null;
        }
        for (var entry of pending) {
          var it = states.get(entry[0]); if (!draft.items.includes(it)) continue;
          Object.assign(it, await A.productImage(entry[1], it.barcode || 'ANG-' + it.id));
          pending.delete(entry[0]); filePreviews.delete(entry[0]);
        }
        var saved = await A.save(action, draft);
        action = saved; isNew = false; changedRows = false; resetApproved = false; dirty = false;
        initialItems = M.clone(saved.data.items);
        return saved;
      }
      area.onchange = function () {
        if (area.value === 'articles' || saving) return;
        var mode = area.value; area.value = 'articles';
        window.CMSAngeboteForm.syncAreaNavigation(area);
        (async function () {
          if (!(await prepareDraft())) return;
          if (!draft.items.length) throw M.problem('Bitte zuerst mindestens einen Artikel eingeben.');
          var previewDraft = M.clone(draft), temporaryImages = new Map();
          for (var row of host.children) {
            var item = previewDraft.items.find(function (entry) { return entry.id === states.get(row).id; });
            if (!item || !pending.has(row)) continue;
            if (!filePreviews.has(row)) throw M.problem('Das ausgewählte Bild konnte nicht gelesen werden. Bitte erneut auswählen.');
            var id = 'cms:pending-' + item.id;
            temporaryImages.set(item.id, { id: id, original: item.image_id });
            M.registerImage(id, filePreviews.get(row)); item.image_id = id;
          }
          if (workspaceState) {
            ['undo', 'redo'].forEach(function (key) {
              workspaceState[key].forEach(function (snapshot) {
                var idsChanged = snapshot.items.map(function (item) { return item.id; }).join() !== previewDraft.items.map(function (item) { return item.id; }).join();
                snapshot.items = M.clone(previewDraft.items);
                snapshot.title = previewDraft.title; snapshot.valid_from = previewDraft.valid_from; snapshot.valid_to = previewDraft.valid_to;
                if (idsChanged) M.applyTemplate(snapshot);
              });
            });
          }
          layerAnchors.forEach(function (anchor, layer) { hideLayer(layer); });
          var captureDirty = dirty;
          await options.preview(Object.assign({}, action || {}, { data: previewDraft }), mode, async function (result) {
            if (result) {
              workspaceState = result; acceptPreview(result.data, temporaryImages);
              dirty = captureDirty || result.dirty;
            }
            dlg.classList.remove('an-capture-suspended');
            (area.checkVisibility() ? area : top.querySelector('[data-action-area=articles]')).focus();
            if (blockedReport) { var report = blockedReport; blockedReport = null; await inspect(report); }
          }, {
            state: workspaceState, dirty: dirty,
            save: async function (value) {
              acceptPreview(value, temporaryImages);
              var saved = await persist();
              if (!saved) {
                if (blockedReport) return null;
                throw M.problem('Speichern abgebrochen · alle Eingaben bleiben erhalten.');
              }
              captureDirty = false; temporaryImages.clear();
              return saved;
            }
          });
        })().catch(async function (error) {
          dlg.classList.remove('an-capture-suspended'); metaToggle.setAttribute('aria-expanded', 'true'); renderMobile();
          status.textContent = 'Bereichswechsel nicht abgeschlossen · Eingaben bleiben erhalten.'; await M.error(error);
        });
      };
      function close() {
        phone.removeEventListener('change', resizeCapture);
        document.removeEventListener('paste', onPaste);
        window.removeEventListener('resize', updateLayers);
        layerAnchors.forEach(function (anchor, layer) { hideLayer(layer); });
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
        if (!query) { hideLayer(dd); return; }
        catalog().then(function (items) {
          if (!row.isConnected || inp.value.trim().toLocaleLowerCase('de') !== query) return;
          dd.replaceChildren();
          items.filter(function (it) { return [it.bezeichnung, it.artikelnummer, it.strichcode].join(' ').toLocaleLowerCase('de').includes(query); }).slice(0, 12).forEach(function (source) {
            var b = document.createElement('button'); b.type = 'button'; b.className = 'cms-art-opt';
            var name = document.createElement('strong'); name.textContent = source.bezeichnung;
            var detail = document.createElement('small'); detail.textContent = (source.artikelnummer || '') + ' · ' + (source.strichcode || '') + ' · Stamm-VK ' + M.money(M.cents(source.vk)) + ' €';
            b.append(name, detail);
            b.onmousedown = function (e) { e.preventDefault(); };
            b.onclick = function (e) {
              e.stopPropagation();
              var it = states.get(row);
              input(row, 'produkt').value = source.bezeichnung; input(row, 'details').value = source.menge || '';
              input(row, 'artikelnummer').value = source.strichcode || '';
              it.image_id = ''; it.werbebild_id = ''; pending.delete(row);
              invalidateImage(row);
              row.querySelector('.cms-bild-preview').style.display = 'none';
              imagePresence(row, false);
              it.article_number = String(source.artikelnummer || ''); it.retail_price_cents = M.cents(source.vk);
              if (!input(row, 'statt_preis').value && it.retail_price_cents) input(row, 'statt_preis').value = M.money(it.retail_price_cents);
              if (drinks) {
                var match = /(\d+)\s*[x×]\s*(\d+(?:[,.]\d+)?)\s*(ml|cl|l)?/i.exec(source.menge || '');
                if (match) {
                  input(row, 'units').value = match[1];
                  input(row, 'volume_ml').value = M.litres(Math.round(Number(match[2].replace(',', '.')) * (/^ml$/i.test(match[3]) ? 1 : /^cl$/i.test(match[3]) ? 10 : 1000)));
                }
              }
              hideLayer(dd); mark(); inp.focus();
              find(row).catch(M.error);
            };
            dd.appendChild(b);
          });
          if (dd.children.length && document.activeElement === inp) showLayer(dd, inp);
          else hideLayer(dd);
        }).catch(M.error);
      });
      host.addEventListener('keydown', function (event) {
        var dd = event.target.closest('.cms-art-wrap')?.querySelector('.cms-art-dd');
        if (!dd || !dd.classList.contains('open')) return;
        if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
          event.preventDefault();
          var option = event.target.matches('.cms-art-opt'), forward = event.key === 'ArrowDown';
          var next = option ? (forward ? event.target.nextElementSibling : event.target.previousElementSibling) : null;
          (next || (forward ? dd.firstElementChild : dd.lastElementChild))?.focus();
        }
        if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); hideLayer(dd); input(event.target.closest('.cms-ang-row'), 'produkt').focus(); }
      });
      host.addEventListener('focusout', function (event) {
        var wrap = event.target.closest('.cms-art-wrap');
        if (wrap && !wrap.contains(event.relatedTarget)) hideLayer(wrap.querySelector('.cms-art-dd'));
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
        if (b.hasAttribute('data-reload')) {
          (async function () {
            if (dirty && !(await M.dialog('Änderungen verwerfen?', 'Der aktuelle gespeicherte Stand wird geladen. Deine ungespeicherten Eingaben werden verworfen.', 'Stand neu laden'))) return;
            var fresh = (await A.load()).find(function (entry) { return entry.id === action.id; });
            if (!fresh) throw M.problem('Diese Aktion ist nicht mehr vorhanden. Bitte die Übersicht neu laden.');
            close(); await capture(fresh);
          })().catch(M.error); return;
        }
        if (b.hasAttribute('data-quality')) {
          (async function () {
            saving = true; status.textContent = 'Qualität wird geprüft …';
            try {
              var report = await probe();
              status.textContent = 'Qualitätsprüfung: ' + report.errors.length + ' Fehler · ' + report.hints.length + ' Hinweise · ' + report.unchecked.length + ' nicht geprüft';
              saving = false; await inspect(report);
            } catch (error) { status.textContent = 'Qualitätsprüfung nicht abgeschlossen.'; await M.error(error); }
            finally { saving = false; }
          })();
          return;
        }
        if (b.hasAttribute('data-add')) { var added = add(); changedRows = true; mark(); if (phone.matches) selectRow(added); return; }
        var row = b.closest('.cms-ang-row'), cmd = b.dataset.offerAction;
        if (cmd === 'removeAngRow') {
          row.querySelectorAll('[popover]').forEach(hideLayer);
          if (pasteRow === row) pasteRow = null;
          pending.delete(row); states.delete(row); row.remove(); changedRows = true; mark(); renumber();
        }
        if (['clearBild', 'loadBildSharePoint', 'uploadBildSP', 'pasteBildSP'].includes(cmd)) hideLayer(row.querySelector('.an-capture-image-menu'));
        if (cmd === 'clearBild') {
          invalidateImage(row);
          imageStatus(row, '', false);
          Object.assign(states.get(row), { image_id: '', werbebild_id: '' }); pending.delete(row);
          row.querySelector('.cms-bild-preview').style.display = 'none'; imagePresence(row, false); mark();
        }
        if (cmd === 'loadBildSharePoint') find(row).catch(M.error);
        if (cmd === 'uploadBildSP') {
          var fileInput = document.createElement('input'); fileInput.type = 'file'; fileInput.accept = 'image/png,image/jpeg,image/webp';
          fileInput.onchange = function () { if (!fileInput.files.length) return; try { setFile(row, fileInput.files[0]); } catch (error) { M.error(error); } }; fileInput.click();
        }
        if (cmd === 'pasteBildSP') {
          pasteRow = row;
          status.textContent = 'Zwischenablage für diese Zeile aktiv: Bild mit Strg+V einfügen.';
          imageStatus(row, 'Bild mit Strg+V oder Cmd+V für diesen Artikel einfügen.', false);
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
            status.textContent = 'Wird gespeichert …';
            try {
              var saved = await persist(); if (!saved) return;
              close(); await overview();
              options.preview(saved, 'preview', overview);
            } catch (error) {
              status.textContent = 'Speichern nicht abgeschlossen · Eingaben bleiben erhalten.';
              metaToggle.setAttribute('aria-expanded', 'true'); renderMobile(); await M.error(error);
            }
            finally {
              saving = false; dlg.querySelectorAll('button,input,select').forEach(function (el) { el.disabled = false; });
              host.querySelectorAll('[data-f="deposit_mode"]').forEach(function (el) { input(el.closest('.cms-ang-row'), 'deposit_cents').disabled = el.value === 'no'; });
              renderMobile();
              if (blockedReport) { var report = blockedReport; blockedReport = null; await inspect(report); }
            }
          })();
        }
      };
      dlg.addEventListener('scroll', updateLayers, true);
      window.addEventListener('resize', updateLayers);
      activeDialog = dlg; document.addEventListener('paste', onPaste);
      document.body.appendChild(dlg); dlg.showModal();
      if (initial) mark();
    }
    window.addEventListener('beforeunload', function (event) { if (activeDialog && dirty) { event.preventDefault(); event.returnValue = ''; } });
    return { start: overview, capture: capture, hasUnsavedChanges: function () { return !!activeDialog && dirty; } };
  }
  return { mount: mount };
})();
