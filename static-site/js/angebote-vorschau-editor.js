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
      + '<button type="button" data-preview-transform="larger" aria-label="Vorschauelement vergrößern">+</button></div></div>'
      + '<div class="an-stage" tabindex="0" aria-label="Direkt bearbeitbare Vorschau"><div class="an-hit-layer"></div></div>'
      + '<p class="an-muted">Element antippen · ziehen = verschieben · ↘ = Größe · Pfeiltasten = verschieben</p>';
    var stage = host.querySelector('.an-stage'), layer = host.querySelector('.an-hit-layer');
    var select = host.querySelector('select'), entries = [], chosen = '', width = 1, height = 1, endDrag = null;
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
        handle.style.left = 'clamp(22px,' + points.resize.x + '%,calc(100% - 22px))';
        handle.style.top = 'clamp(22px,' + points.resize.y + '%,calc(100% - 22px))'; layer.appendChild(handle);
        var turn = document.createElement('button'); turn.type = 'button'; turn.className = 'an-rotate-handle';
        turn.dataset.previewRotate = chosen; turn.textContent = '↻'; turn.setAttribute('aria-label', 'Vorschauelement frei drehen');
        turn.title = 'Ziehen zum Drehen';
        turn.style.left = 'clamp(22px,' + points.rotate.x + '%,calc(100% - 22px))';
        turn.style.top = 'clamp(22px,' + points.rotate.y + '%,calc(100% - 22px))'; layer.appendChild(turn);
      }
      select.value = chosen;
      host.querySelectorAll('[data-preview-transform]').forEach(function (button) { button.disabled = !selected; });
    }
    function change(delta) {
      var entry = current(); if (!entry) return;
      options.change(entry, delta);
    }
    select.onchange = function () { chosen = select.value; overlay(); };
    host.onclick = function (event) {
      var button = event.target.closest('[data-preview-transform]'); if (!button || !current()) return;
      if (options.begin) options.begin();
      var action = button.dataset.previewTransform;
      change(action === 'left' || action === 'right' ? { rotation: action === 'right' ? 15 : -15 }
        : { scale: action === 'larger' ? 1.1 : 1 / 1.1 });
    };
    stage.onkeydown = function (event) {
      var delta = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] }[event.key];
      if (!delta || !current()) return;
      event.preventDefault(); if (options.begin) options.begin();
      change({ dx: delta[0] * (event.shiftKey ? 10 : 1), dy: delta[1] * (event.shiftKey ? 10 : 1) });
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
      };
      document.addEventListener('pointermove', move); document.addEventListener('pointerup', endDrag); document.addEventListener('pointercancel', endDrag);
    };
    return {
      update: function (canvas, elements, logicalWidth, logicalHeight) {
        width = logicalWidth; height = logicalHeight; entries = elements;
        if (!entries.some(function (entry) { return entry.id === chosen; })) {
          var first = entries.find(function (entry) { return entry.type === 'image' || entry.ovKey === 'img'; }) || entries[0];
          chosen = first ? first.id : '';
        }
        if (canvas.isConnected) {
          var displayed = document.createElement('canvas'); displayed.width = canvas.width; displayed.height = canvas.height;
          displayed.getContext('2d').drawImage(canvas, 0, 0); canvas = displayed;
        }
        var previous = stage.querySelector('canvas'); if (previous) previous.remove();
        stage.prepend(canvas); stage.style.aspectRatio = width + ' / ' + height; stage.style.setProperty('--an-ratio', width / height);
        select.replaceChildren();
        entries.forEach(function (entry) { var option = document.createElement('option'); option.value = entry.id; option.textContent = entry.label; select.appendChild(option); });
        overlay();
      },
      destroy: function () { if (endDrag) endDrag(); }
    };
  }
  return { mount: mount, handlePoints: handlePoints, pointerAngle: pointerAngle, normalizeTurn: normalizeTurn };
})();
