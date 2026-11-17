window.AngeboteVorschauEditor = (function () {
  'use strict';
  // Handle anchors follow the element's rotation; values are percentages of the stage.
  function handlePoints(entry, width, height) {
    var angle = (entry.rotation || 0) * Math.PI / 180, cos = Math.cos(angle), sin = Math.sin(angle);
    var cx = entry.x + entry.w / 2, cy = entry.y + entry.h / 2, reach = entry.h / 2 + Math.max(30, width * .045);
    return {
      resize: { x: (cx + cos * entry.w / 2 - sin * entry.h / 2) / width * 100, y: (cy + sin * entry.w / 2 + cos * entry.h / 2) / height * 100 },
      rotate: { x: (cx + sin * reach) / width * 100, y: (cy - cos * reach) / height * 100 }
    };
  }
  function pointerAngle(centerX, centerY, event) { return Math.atan2(event.clientY - centerY, event.clientX - centerX) * 180 / Math.PI; }
  function normalizeTurn(value) { return ((value + 540) % 360) - 180; }
  function mount(host, options) {
    host.innerHTML = '<div class="an-direct-tools"><label class="an-field"><span>Element in der Vorschau</span><select data-preview-element></select></label>'
      + '<div class="an-element-actions"><button type="button" data-preview-transform="left" aria-label="Vorschauelement nach links drehen">↶ 15°</button>'
      + '<button type="button" data-preview-transform="right" aria-label="Vorschauelement nach rechts drehen">↷ 15°</button>'
      + '<button type="button" data-preview-transform="smaller" aria-label="Vorschauelement verkleinern">−</button>'
      + '<button type="button" data-preview-transform="larger" aria-label="Vorschauelement vergrößern">+</button>'
      + '<span class="an-nudge" role="group" aria-label="Fein verschieben">'
      + '<button type="button" data-preview-nudge="-2,0" aria-label="Vorschauelement nach links">←</button>'
      + '<button type="button" data-preview-nudge="0,-2" aria-label="Vorschauelement nach oben">↑</button>'
      + '<button type="button" data-preview-nudge="0,2" aria-label="Vorschauelement nach unten">↓</button>'
      + '<button type="button" data-preview-nudge="2,0" aria-label="Vorschauelement nach rechts">→</button></span></div></div>'
      + '<div class="an-stage" tabindex="0" aria-label="Direkt bearbeitbare Vorschau"><div class="an-hit-layer"></div></div>'
      + '<p class="an-muted">Element antippen · ziehen = verschieben · ↘ = Größe · Pfeiltasten = verschieben</p>';
    var extrasHost = null;
    if (options.override) {
      extrasHost = document.createElement('div'); extrasHost.className = 'an-extras';
      extrasHost.innerHTML = '<label class="an-quick an-rot"><span>↻ Drehung</span><input type="range" min="-180" max="180" step="1" data-x-rot aria-label="Drehung in Grad"><output data-x-rot-out>0°</output><button type="button" data-x-rot-reset aria-label="Drehung zurücksetzen">⭯ 0°</button></label>'
        + '<div class="an-element-actions an-copy-tools" role="group" aria-label="Ghost, Duplikat und Bild">'
        + '<button type="button" data-x-toggle="ghost" aria-pressed="false">Ghost</button>'
        + '<button type="button" data-x-toggle="dup" aria-pressed="false">Duplikat</button>'
        + '<button type="button" data-x-add="ghost" title="Weitere Ghost-Kopie hinzufügen">+ Ghost</button>'
        + '<button type="button" data-x-add="dup" title="Weitere Duplikat-Kopie hinzufügen">+ Duplikat</button>'
        + '<label class="an-file-btn" title="Eigenes Bild hinzufügen">+ Bild<input type="file" accept="image/*" data-x-image></label>'
        + '<button type="button" data-x-image-remove hidden>Bild entfernen</button></div>'
        + '<div class="an-chips" data-x-copies></div>'
        + '<div class="an-quickbar an-sliders">'
        + '<label class="an-quick" data-x-row="ghost"><span>Ghost Deckkraft</span><input type="range" min="10" max="90" data-x-prop="ghostAlpha" aria-label="Ghost Deckkraft"></label>'
        + '<label class="an-quick" data-x-row="ghost"><span>Ghost Größe</span><input type="range" min="10" max="300" data-x-prop="ghostScale" aria-label="Ghost Größe"></label>'
        + '<label class="an-quick" data-x-row="dup"><span>Duplikat Größe</span><input type="range" min="10" max="300" data-x-prop="dupScale" aria-label="Duplikat Größe"></label>'
        + '<label class="an-quick" data-x-row="image"><span>Bild Deckkraft</span><input type="range" min="10" max="100" data-x-prop="customImgAlpha" aria-label="Eigenes Bild Deckkraft"></label></div>'
        + '<div class="an-element-actions"><button type="button" data-x-reset="element">Element zurücksetzen</button><button type="button" data-x-reset="all">Alles zurücksetzen</button></div>';
      host.querySelector('.an-direct-tools').appendChild(extrasHost);
    }
    var tools = host.querySelector('.an-direct-tools');
    if (options.toolsHost) {
      options.toolsHost.replaceChildren(tools, host.querySelector(':scope>p'));
    }
    var stage = host.querySelector('.an-stage'), layer = host.querySelector('.an-hit-layer');
    var select = tools.querySelector('select'), entries = [], chosen = '', width = 1, height = 1, endDrag = null;
    function current() { return entries.find(function (entry) { return entry.id === chosen; }); }
    function overlay() {
      layer.replaceChildren();
      entries.forEach(function (entry) {
        var button = document.createElement('button'); button.type = 'button'; button.dataset.previewSelect = entry.id;
        button.setAttribute('aria-label', 'Vorschauelement auswählen: ' + entry.label);
        button.className = entry.id === chosen ? 'an-selected' : '';
        button.style.cssText = 'left:' + entry.x / width * 100 + '%;top:' + entry.y / height * 100
          + '%;width:' + entry.w / width * 100 + '%;height:' + entry.h / height * 100 + '%;transform:rotate(' + (entry.rotation || 0) + 'deg)';
        layer.appendChild(button);
      });
      var selected = current();
      if (selected) {
        var points = handlePoints(selected, width, height);
        var handle = document.createElement('button'); handle.type = 'button'; handle.className = 'an-resize-handle';
        handle.dataset.previewResize = chosen; handle.textContent = '↘'; handle.setAttribute('aria-label', 'Vorschauelementgröße ziehen');
        handle.style.left = 'clamp(var(--an-handle-edge,22px),' + points.resize.x + '%,calc(100% - var(--an-handle-edge,22px)))';
        handle.style.top = 'clamp(var(--an-handle-edge,22px),' + points.resize.y + '%,calc(100% - var(--an-handle-edge,22px)))'; layer.appendChild(handle);
        var turn = document.createElement('button'); turn.type = 'button'; turn.className = 'an-rotate-handle';
        turn.dataset.previewRotate = chosen; turn.textContent = '↻'; turn.setAttribute('aria-label', 'Vorschauelement frei drehen');
        turn.title = 'Ziehen zum Drehen';
        turn.style.left = 'clamp(var(--an-handle-edge,22px),' + points.rotate.x + '%,calc(100% - var(--an-handle-edge,22px)))';
        turn.style.top = 'clamp(var(--an-handle-edge,22px),' + points.rotate.y + '%,calc(100% - var(--an-handle-edge,22px)))'; layer.appendChild(turn);
      }
      select.value = chosen;
      tools.querySelectorAll('[data-preview-transform],[data-preview-nudge]').forEach(function (button) { button.disabled = !selected; });
      if (typeof refreshExtras === 'function') refreshExtras();
    }
    function change(delta) {
      var entry = current(); if (!entry) return;
      options.change(entry, delta);
    }
    function ghostOff(entry) { return entry.group === 'plakat_article_overrides' ? 'off' : 'auto'; }
    function refreshExtras() {
      if (!extrasHost) return;
      var entry = current(), disabled = !entry;
      extrasHost.hidden = false;
      extrasHost.querySelectorAll('button,input').forEach(function (control) { control.disabled = disabled; });
      if (disabled) return;
      var ov = options.override(entry), fields = options.fields(ov, entry);
      var rot = fields ? Math.round(fields.obj[fields.rot] || 0) : 0;
      extrasHost.querySelector('[data-x-rot]').value = rot;
      extrasHost.querySelector('[data-x-rot-out]').textContent = rot + '°';
      var ghostOn = ov.ghostMode === 'on';
      var ghostButton = extrasHost.querySelector('[data-x-toggle=ghost]'), dupButton = extrasHost.querySelector('[data-x-toggle=dup]');
      ghostButton.setAttribute('aria-pressed', String(ghostOn)); dupButton.setAttribute('aria-pressed', String(!!ov.dupOn));
      ghostButton.classList.toggle('an-on', ghostOn); dupButton.classList.toggle('an-on', !!ov.dupOn);
      var hasImage = !!ov.customImg;
      extrasHost.querySelector('[data-x-image-remove]').hidden = !hasImage;
      extrasHost.querySelectorAll('[data-x-row]').forEach(function (row) {
        row.hidden = row.dataset.xRow === 'ghost' ? !ghostOn : row.dataset.xRow === 'dup' ? !ov.dupOn : !hasImage;
      });
      extrasHost.querySelector('.an-sliders').hidden = !ghostOn && !ov.dupOn && !hasImage;
      var values = { ghostAlpha: Math.round((ov.ghostAlpha || .45) * 100), ghostScale: ov.ghostScale || 100, dupScale: ov.dupScale || 100,
        customImgAlpha: ov.customImgAlpha != null ? ov.customImgAlpha : 100 };
      extrasHost.querySelectorAll('[data-x-prop]').forEach(function (input) { input.value = values[input.dataset.xProp]; });
      var chips = extrasHost.querySelector('[data-x-copies]');
      chips.replaceChildren();
      (ov.copies || []).forEach(function (copy, index) {
        var chip = document.createElement('span'); chip.className = 'an-chip';
        var label = document.createElement('button'); label.type = 'button'; label.dataset.xCopy = String(index);
        label.textContent = (copy.type === 'ghost' ? 'Ghost ' : 'Duplikat ') + (index + 1);
        label.setAttribute('aria-label', 'Kopie ' + (index + 1) + ' auswählen');
        var remove = document.createElement('button'); remove.type = 'button'; remove.dataset.xDelCopy = String(index);
        remove.textContent = '×'; remove.setAttribute('aria-label', 'Kopie ' + (index + 1) + ' löschen');
        chip.append(label, remove); chips.appendChild(chip);
      });
    }
    var sliding = false, pending = '';
    function mutate(entry, fn, quiet) {
      var id = options.mutate(entry, fn, quiet);
      if (id) pending = entry.id.split(':')[0] + ':' + id;
    }
    if (extrasHost) {
      extrasHost.addEventListener('click', function (event) {
        var entry = current(), target = event.target.closest('button'); if (!entry || !target) return;
        if (target.dataset.xToggle) {
          var kind = target.dataset.xToggle;
          mutate(entry, function (ov) {
            if (kind === 'ghost') {
              if (ov.ghostMode === 'on') ov.ghostMode = ghostOff(entry);
              else { ov.ghostMode = 'on'; if (!ov.ghostDx && !ov.ghostDy) { ov.ghostDx = 80; ov.ghostDy = -60; } return 'ghost'; }
            } else {
              ov.dupOn = !ov.dupOn;
              if (ov.dupOn) { if (!ov.dupDx && !ov.dupDy) { ov.dupDx = -70; ov.dupDy = 50; } return 'dup'; }
            }
          });
        } else if (target.dataset.xAdd) {
          mutate(entry, function (ov) {
            ov.copies.push(options.newCopy(target.dataset.xAdd, ov.copies.length));
            return 'copy-' + (ov.copies.length - 1);
          });
        } else if (target.dataset.xDelCopy != null) {
          mutate(entry, function (ov) { ov.copies.splice(Number(target.dataset.xDelCopy), 1); return 'img'; });
        } else if (target.dataset.xCopy != null) {
          chosen = entry.id.split(':')[0] + ':copy-' + target.dataset.xCopy; overlay();
        } else if (target.hasAttribute('data-x-image-remove')) {
          mutate(entry, function (ov) {
            ov.customImg = null; ov.customImgDx = 0; ov.customImgDy = 0; ov.customImgScale = 100; ov.customImgAlpha = 100; ov.customImgRot = 0; return 'img';
          });
        } else if (target.hasAttribute('data-x-rot-reset')) {
          mutate(entry, function (ov) { var f = options.fields(ov, entry); if (f) f.obj[f.rot] = 0; });
        } else if (target.dataset.xReset) {
          options.reset(entry, target.dataset.xReset);
        }
      });
      extrasHost.addEventListener('input', function (event) {
        var entry = current(), input = event.target; if (!entry) return;
        var quiet = sliding; sliding = true;
        if (input.hasAttribute('data-x-rot')) {
          mutate(entry, function (ov) { var f = options.fields(ov, entry); if (f) f.obj[f.rot] = Number(input.value); }, quiet);
          extrasHost.querySelector('[data-x-rot-out]').textContent = input.value + '°';
        } else if (input.dataset.xProp) {
          var key = input.dataset.xProp;
          mutate(entry, function (ov) { ov[key] = key === 'ghostAlpha' ? Number(input.value) / 100 : Number(input.value); }, quiet);
        }
      });
      extrasHost.addEventListener('change', function (event) {
        var input = event.target; sliding = false;
        if (!input.hasAttribute('data-x-image') || !input.files || !input.files[0]) return;
        var entry = current(), file = input.files[0]; input.value = '';
        if (entry) { pending = entry.id.split(':')[0] + ':customImg'; options.addImage(entry, file); }
      });
    }
    select.onchange = function () { chosen = select.value; overlay(); };
    tools.onclick = function (event) {
      var nudge = event.target.closest('[data-preview-nudge]');
      if (nudge && current()) {
        var step = nudge.dataset.previewNudge.split(',').map(Number);
        if (options.begin) options.begin();
        change({ dx: step[0], dy: step[1] }); if (options.end) options.end(); return;
      }
      var button = event.target.closest('[data-preview-transform]'); if (!button || !current()) return;
      if (options.begin) options.begin();
      var action = button.dataset.previewTransform;
      change(action === 'left' || action === 'right' ? { rotation: action === 'right' ? 15 : -15 }
        : { scale: action === 'larger' ? 1.1 : 1 / 1.1 });
      if (options.end) options.end();
    };
    stage.onkeydown = function (event) {
      var delta = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] }[event.key];
      if (!delta || !current()) return;
      event.preventDefault(); if (options.begin) options.begin();
      change({ dx: delta[0] * (event.shiftKey ? 10 : 1), dy: delta[1] * (event.shiftKey ? 10 : 1) });
      if (options.end) options.end();
    };
    stage.onpointerdown = function (event) {
      var hit = event.target.closest('[data-preview-select],[data-preview-resize],[data-preview-rotate]');
      if (!hit || event.button !== 0) return;
      event.preventDefault(); chosen = hit.dataset.previewSelect || hit.dataset.previewResize || hit.dataset.previewRotate; overlay();
      var entry = current(); if (!entry) return;
      if (options.begin) options.begin();
      stage.focus({ preventScroll: true });
      var lastX = event.clientX, lastY = event.clientY, resizing = !!hit.dataset.previewResize, turning = !!hit.dataset.previewRotate;
      var startRect = stage.getBoundingClientRect();
      var centerX = startRect.left + (entry.x + entry.w / 2) / width * startRect.width, centerY = startRect.top + (entry.y + entry.h / 2) / height * startRect.height;
      var lastAngle = pointerAngle(centerX, centerY, event);
      function move(ev) {
        if (ev.pointerId !== event.pointerId) return;
        var rect = stage.getBoundingClientRect(), dx = (ev.clientX - lastX) / rect.width * width, dy = (ev.clientY - lastY) / rect.height * height;
        lastX = ev.clientX; lastY = ev.clientY;
        if (turning) {
          var angle = pointerAngle(centerX, centerY, ev), turn = normalizeTurn(angle - lastAngle);
          lastAngle = angle; if (!turn) return;
          change({ rotation: turn }); entry.rotation = normalizeTurn((entry.rotation || 0) + turn);
        } else if (resizing) {
          var factor = Math.max(.5, Math.min(2, 1 + (dx / entry.w + dy / entry.h) / 2));
          change({ scale: factor }); entry.w *= factor; entry.h *= factor;
        } else { change({ dx: dx, dy: dy }); entry.x += dx; entry.y += dy; }
        overlay();
      }
      endDrag = function (ev) {
        if (ev && ev.pointerId !== event.pointerId) return;
        document.removeEventListener('pointermove', move); document.removeEventListener('pointerup', endDrag); document.removeEventListener('pointercancel', endDrag); endDrag = null;
        if (options.end) options.end();
      };
      document.addEventListener('pointermove', move); document.addEventListener('pointerup', endDrag); document.addEventListener('pointercancel', endDrag);
    };
    return {
      update: function (canvas, elements, logicalWidth, logicalHeight) {
        width = logicalWidth; height = logicalHeight; entries = elements;
        if (pending && elements.some(function (entry) { return entry.id === pending; })) { chosen = pending; pending = ''; }
        if (!entries.some(function (entry) { return entry.id === chosen; })) {
          var first = entries.find(function (entry) { return entry.type === 'image' || entry.ovKey === 'img'; }) || entries[0];
          chosen = first && !options.toolsHost ? first.id : '';
        }
        if (canvas.isConnected) {
          var displayed = document.createElement('canvas'); displayed.width = canvas.width; displayed.height = canvas.height;
          displayed.getContext('2d').drawImage(canvas, 0, 0); canvas = displayed;
        }
        var previous = stage.querySelector('canvas'); if (previous) previous.remove();
        stage.prepend(canvas); stage.style.aspectRatio = width + ' / ' + height; stage.style.setProperty('--an-ratio', width / height);
        select.replaceChildren();
        if (options.toolsHost) {
          var placeholder = document.createElement('option'); placeholder.value = ''; placeholder.textContent = 'Element auswählen …';
          select.appendChild(placeholder);
        }
        entries.forEach(function (entry) { var option = document.createElement('option'); option.value = entry.id; option.textContent = entry.label; select.appendChild(option); });
        overlay();
      },
      destroy: function () { if (endDrag) endDrag(); }
    };
  }
  return { mount: mount, handlePoints: handlePoints, pointerAngle: pointerAngle, normalizeTurn: normalizeTurn };
})();
