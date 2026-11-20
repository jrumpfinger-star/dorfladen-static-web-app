'use strict';
(() => {
  const $ = id => document.getElementById(id);
  const TOKEN_KEY = 'cms_auth_token';
  const SELECTED_KEY = 'inventur_selected';
  const SCAN_FORMATS = ['ean_13', 'ean_8', 'upc_a', 'upc_e', 'code_128', 'code_39', 'itf'];

  class Unauthorized extends Error {}
  class NetworkFailure extends Error {}
  class ApiFailure extends Error {
    constructor(status, body) {
      super((body && body.message) || 'Anfrage fehlgeschlagen');
      this.status = status;
      this.body = body || {};
    }
  }

  const state = {
    inventories: [], inventoryId: null, article: null, position: null,
    loaded: false, loadError: '', busy: false, inflight: null, pendingCommit: false,
    unclear: null, dirty: false, section: 'capture', started: false,
  };
  let matches = [], after = null, hasMore = false, activeResult = -1;
  let searchSeq = 0, searchAbort = null, searchTimer = null, positionSeq = 0;
  let editor = null, editorKey = null;
  const dialogReturn = new Map();

  const token = () => { try { return localStorage.getItem(TOKEN_KEY) || ''; } catch (e) { return ''; } };
  const wide = () => matchMedia('(min-width:850px) and (min-height:600px)').matches;
  const permanentResults = () => wide() || matchMedia('(min-width:600px) and (min-height:900px)').matches;
  const activeInventories = () => state.inventories.filter(i => i.status === 'aktiv');
  const inventory = () => state.inventories.find(i => i.id === state.inventoryId) || null;
  const money = v => (v === null || v === undefined) ? '—' : Number(v).toLocaleString('de-DE', {style: 'currency', currency: 'EUR'});
  const dateLabel = v => v ? v.slice(0, 10).split('-').reverse().join('.') : 'Kein Startdatum';
  const refreshIcons = () => { if (window.dlRefreshIcons) window.dlRefreshIcons(); };

  // ---------- Server ----------
  async function api(method, params, body, signal) {
    let response;
    try {
      response = await fetch('/api/inventur' + (params ? '?' + new URLSearchParams(params) : ''), {
        method, signal, cache: 'no-store',
        headers: Object.assign({'X-CMS-Auth': token()}, body ? {'Content-Type': 'application/json'} : {}),
        body: body ? JSON.stringify(body) : undefined,
      });
    } catch (e) {
      if (e && e.name === 'AbortError') throw e;
      throw new NetworkFailure('Keine Verbindung');
    }
    let data = null;
    try { data = await response.json(); } catch (e) { data = null; }
    if (response.status === 401) { showLogin(); throw new Unauthorized(); }
    if (!response.ok) throw new ApiFailure(response.status, data);
    return data;
  }
  const failureText = e => e instanceof NetworkFailure ? 'Keine Verbindung zum Server.' : (e.message || 'Unbekannter Fehler.');
  const ignorable = e => e instanceof Unauthorized || (e && e.name === 'AbortError');

  // ---------- Dialoge ----------
  function showDialog(id, trigger) {
    dialogReturn.set(id, trigger || document.activeElement);
    $(id).showModal();
    document.body.classList.add('modal-open');
  }
  function closeDialog(id) {
    const dlg = $(id);
    if (dlg.open) dlg.close();
    document.body.classList.toggle('modal-open', Boolean(document.querySelector('dialog:modal')));
    const previous = dialogReturn.get(id);
    if (previous && previous.isConnected && previous.getClientRects().length) previous.focus();
    else if (id === 'inventory-editor') {
      const row = [...$('inventory-list').children].find(el => el.dataset.inventoryId === editorKey);
      (row || $('new-inventory')).focus();
    }
  }
  for (const id of ['menu', 'scanner', 'message', 'inventory-editor']) {
    $(id).addEventListener('cancel', e => { e.preventDefault(); closeDialog(id); });
  }
  $('conflict').addEventListener('cancel', e => e.preventDefault());
  for (const id of ['menu', 'scanner', 'message', 'inventory-editor', 'conflict']) {
    $(id).addEventListener('keydown', e => {
      if (e.key === 'Escape' && id !== 'conflict') {
        e.preventDefault(); closeDialog(id);
      } else if (e.key === 'Tab' && $(id).matches(':modal')) {
        const controls = [...$(id).querySelectorAll('button,input,select,[tabindex]')]
          .filter(el => !el.disabled && el.tabIndex >= 0 && el.getClientRects().length);
        if (!controls.length) return;
        const first = controls[0], last = controls[controls.length - 1];
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
      }
    });
  }
  function problem(text, trigger) {
    $('message-text').textContent = text;
    if (!$('message').open) showDialog('message', trigger);
  }
  $('message-close').onclick = () => closeDialog('message');

  // ---------- Anmeldung ----------
  function showLogin() {
    for (const id of ['context', 'capture-screen', 'settings-screen', 'menu-open']) $(id).hidden = true;
    for (const id of ['menu', 'scanner', 'conflict', 'inventory-editor']) if ($(id).open) $(id).close();
    document.body.classList.remove('modal-open');
    $('login-screen').hidden = false;
    $('login-error').textContent = '';
    $('login-password').value = '';
    $('login-password').focus();
  }
  $('login-form').addEventListener('submit', async e => {
    e.preventDefault();
    const password = $('login-password').value;
    if (!password) { $('login-error').textContent = 'Bitte das Passwort eingeben.'; return; }
    $('login-submit').disabled = true;
    try {
      const response = await fetch('/api/cms-auth', {
        method: 'POST', cache: 'no-store', headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({password}),
      });
      if (response.status === 401) { $('login-error').textContent = 'Das Passwort stimmt nicht. Bitte erneut versuchen.'; return; }
      if (!response.ok) throw new Error('login');
      const data = await response.json();
      if (!data.token) throw new Error('login');
      try { localStorage.setItem(TOKEN_KEY, data.token); } catch (err) { /* Speicher gesperrt: Sitzung gilt nur bis zum Neuladen nicht */ }
      $('login-screen').hidden = true;
      await start();
    } catch (err) {
      $('login-error').textContent = 'Die Anmeldung ist gerade nicht erreichbar. Bitte erneut versuchen.';
    } finally {
      $('login-submit').disabled = false;
    }
  });

  // ---------- Start / Inventuren ----------
  async function start() {
    $('login-screen').hidden = true;
    $('menu-open').hidden = false;
    applySection();
    try {
      await loadInventories();
    } catch (e) {
      if (!ignorable(e)) { setContextError(failureText(e)); }
      return;
    }
    state.started = true;
    if (state.section === 'capture' && permanentResults()) runSearch();
  }
  function setContextError(text) {
    $('inventory').replaceChildren(new Option('Inventuren nicht geladen', ''));
    $('inventory').disabled = true;
    $('inventory-meta').textContent = text + ' Bitte Seite neu laden.';
    $('search').disabled = true;
    $('scan-open').disabled = true;
  }
  async function loadInventories() {
    const data = await api('GET', {action: 'inventories'});
    state.inventories = data.inventories;
    refreshInventoryContext();
    renderList();
  }
  // Wählt eine gültige aktive Inventur und lädt die Position nur nach, wenn sich der Kontext ändert.
  function refreshInventoryContext() {
    const changed = renderInventory();
    if (changed) {
      if (state.article && state.inventoryId) loadPosition(); else renderArticle(true);
    } else renderArticle(false);
  }
  function renderInventory() {
    const active = activeInventories();
    const before = state.inventoryId;
    if (!active.some(i => i.id === before)) {
      let saved = null;
      try { saved = localStorage.getItem(SELECTED_KEY); } catch (e) { saved = null; }
      state.inventoryId = (active.find(i => i.id === saved) || active[0] || {}).id || null;
    }
    $('inventory').replaceChildren();
    if (!active.length) $('inventory').append(new Option('Keine aktive Inventur', ''));
    else {
      active.forEach(i => $('inventory').append(new Option(i.name, i.id)));
      $('inventory').value = state.inventoryId;
    }
    $('inventory').disabled = !active.length || state.busy;
    const inv = inventory();
    $('inventory-meta').textContent = inv ? (inv.year || 'Kein Jahr') + ' · ' + dateLabel(inv.date) : 'In Settings eine Inventur aktivieren.';
    $('search').disabled = !inv;
    $('scan-open').disabled = !inv;
    return before !== state.inventoryId;
  }
  $('inventory').onchange = () => {
    state.inventoryId = $('inventory').value;
    try { localStorage.setItem(SELECTED_KEY, state.inventoryId); } catch (e) { /* optional */ }
    renderInventory();
    if (state.article) loadPosition(); else renderArticle(true);
  };

  // ---------- Erfassung ----------
  const canEdit = () => Boolean(inventory() && state.article && state.article.supported && state.loaded && !state.unclear);
  function feedback(text, kind) {
    $('status-text').textContent = text;
    $('status').className = 'status' + (kind ? ' ' + kind : '');
  }
  function renderArticle(resetValues) {
    const article = state.article, inv = inventory(), pos = state.position;
    $('article-name').textContent = article ? article.name : 'Welchen Artikel zählst du?';
    $('article-barcode').textContent = article ? 'Barcode ' + article.code : 'Artikel suchen oder Barcode scannen.';
    $('ek').textContent = article ? money(pos ? pos.ek : article.ekSuggestion) : '—';
    $('vk').textContent = article ? money(article.vk) : '—';
    $('unit').textContent = article ? (article.unitLabel || 'nicht unterstützt') : '';
    if (resetValues) {
      $('quantity').value = pos && pos.quantity !== null && pos.quantity !== undefined ? String(pos.quantity) : '';
      $('plus').value = '';
      state.dirty = false;
      for (const id of ['quantity', 'plus']) $(id).removeAttribute('aria-invalid');
    }
    const editable = canEdit();
    for (const id of ['quantity', 'plus']) $(id).disabled = !editable;
    $('save').disabled = !(editable && !state.busy) && !state.unclear;
    $('add').disabled = !(editable && !state.busy);
    $('save').textContent = state.unclear ? 'Stand prüfen' : 'Speichern';
    $('inventory').disabled = !activeInventories().length || state.busy;
    if (!inv) feedback('Keine aktive Inventur');
    else if (!article) feedback('Noch kein Artikel ausgewählt');
    else if (!article.supported) feedback('Mengenerfassung nicht unterstützt', 'error');
    else if (state.unclear) feedback('Speicherstand unklar – bitte prüfen', 'unclear');
    else if (state.loadError) feedback(state.loadError, 'error');
    else if (!state.loaded) feedback('Position wird geladen …');
    else if (state.busy) feedback('Speichert …');
    else if (state.dirty) feedback('Änderung · beim Verlassen des Feldes speichern');
    else feedback(pos ? 'Gespeichert' : 'Neue Position · noch nicht gespeichert');
    $('saved-check').hidden = state.dirty || !pos || !state.loaded || state.busy || !(Number(pos.quantity) > 0);
  }
  async function loadPosition() {
    const seq = ++positionSeq;
    state.loaded = false; state.loadError = ''; state.position = null;
    renderArticle(true);
    try {
      const data = await api('GET', {action: 'position', inventory: state.inventoryId, article: state.article.id});
      if (seq !== positionSeq) return;
      state.position = data.position; state.loaded = true;
    } catch (e) {
      if (seq !== positionSeq || ignorable(e)) return;
      state.loadError = e instanceof ApiFailure ? e.message : failureText(e);
      if (e instanceof ApiFailure && e.status === 409) problem(e.message, $('search'));
    }
    renderArticle(true);
    if (state.loaded) $('quantity').focus();
  }

  async function selectArticle(article) {
    if (state.busy && state.inflight) await state.inflight;
    if (state.unclear) return;
    state.article = article;
    closeResults();
    $('search').value = permanentResults() ? '' : article.name;
    if (permanentResults()) runSearch();
    if (!article.supported) {
      state.loaded = false; state.position = null; renderArticle(true);
      problem('Für diesen Artikel ist die Mengenerfassung noch nicht unterstützt. Bitte einen anderen Artikel wählen.', $('search'));
      return;
    }
    await loadPosition();
  }
  function clearArticle() {
    positionSeq++;
    state.article = null; state.position = null; state.loaded = false; state.loadError = '';
    renderArticle(true);
  }

  function readInteger(input, label) {
    const value = input.value.trim();
    if (value === '') return null;
    if (!/^[+-]?\d+$/.test(value)) throw Object.assign(new Error(label + ': Bitte eine ganze Zahl eingeben.'), {field: input});
    const number = Number(value);
    if (!Number.isSafeInteger(number) || number < -2147483648 || number > 2147483647) {
      throw Object.assign(new Error(label + ': Die Zahl liegt außerhalb des erlaubten Bereichs.'), {field: input});
    }
    return number;
  }
  function commit() {
    if (state.busy) { state.pendingCommit = state.dirty; return state.inflight; }
    if (!state.dirty || !canEdit()) return null;
    let quantity, plus;
    try {
      quantity = readInteger($('quantity'), 'Menge');
      plus = readInteger($('plus'), 'Plus');
    } catch (e) {
      e.field.setAttribute('aria-invalid', 'true');
      problem(e.message, e.field);
      return null;
    }
    if (quantity !== null || plus !== null) {
      const total = plus === null ? quantity : (quantity || 0) + plus;
      if (total < -2147483648 || total > 2147483647) {
        $('plus').setAttribute('aria-invalid', 'true');
        problem('Die Gesamtmenge liegt außerhalb des erlaubten Bereichs. Bitte Menge oder Plus korrigieren.', $('plus'));
        return null;
      }
    }
    state.inflight = doSave(quantity, plus);
    return state.inflight;
  }
  // Nach dem Speichern: Eingabefeld verlassen, damit die Tastatur zugeht und die volle Ansicht zurückkommt.
  function finishEntry() {
    const active = document.activeElement;
    if (active === $('quantity') || active === $('plus')) active.blur();
    viewport();
    setTimeout(() => {
      if (document.activeElement === document.body && !$('manual-scan').closest('[hidden]') && $('manual-scan').getClientRects().length) {
        $('manual-scan').focus();
      }
    }, 60);
  }
  async function doSave(quantity, plus) {
    const draft = {quantity, plus, baseVersion: state.position ? state.position.version : null};
    const sent = {q: $('quantity').value, p: $('plus').value};
    state.busy = true; state.dirty = false; state.pendingCommit = false;
    renderArticle(false);
    const payload = {
      action: 'savePosition', inventoryId: state.inventoryId, articleId: state.article.id,
      quantity, plus, baseVersion: draft.baseVersion,
    };
    try {
      const data = await api('POST', null, payload);
      state.position = data.position;
      if ($('quantity').value === sent.q) $('quantity').value = data.position.quantity === null ? '' : String(data.position.quantity);
      if ($('plus').value === sent.p) $('plus').value = '';
      state.busy = false;
      renderArticle(false);
      feedback('Gespeichert');
      $('saved-check').hidden = !(Number(data.position.quantity) > 0);
      finishEntry();
    } catch (e) {
      state.busy = false;
      state.dirty = true;
      if (e instanceof Unauthorized) {
        renderArticle(false);
        feedback('Nicht gespeichert – bitte anmelden und erneut speichern', 'error');
      } else if (e instanceof ApiFailure && e.status === 409 && e.body.error === 'conflict') {
        renderArticle(false);
        showConflict(e.body.current === undefined ? null : e.body.current, draft, 'conflict');
      } else if (e instanceof NetworkFailure || (e instanceof ApiFailure && e.body.outcome === 'unknown')) {
        state.unclear = draft;
        renderArticle(false);
        showConflict(undefined, draft, 'unclear');
      } else {
        renderArticle(false);
        feedback('Nicht gespeichert', 'error');
        problem(e instanceof ApiFailure ? e.message : failureText(e), $('save'));
        if (e instanceof ApiFailure && e.body.error === 'inventory_not_active') loadInventories().catch(() => {});
      }
    } finally {
      state.inflight = null;
    }
    if (state.pendingCommit && !state.busy && !state.unclear && !$('conflict').open) { state.dirty = true; commit(); }
    state.pendingCommit = false;
  }

  // ---------- Konflikt / unklarer Ausgang ----------
  let conflict = null;
  const describeDraft = d => 'Menge ' + (d.quantity === null ? 'leer' : d.quantity) + (d.plus !== null ? ' · Plus ' + d.plus : '');
  const describeCurrent = p => p === undefined ? '—' : p === null ? 'keine Position' : 'Menge ' + (p.quantity === null ? 'leer' : p.quantity);
  function showConflict(current, draft, mode) {
    conflict = {current, draft, mode};
    $('conflict-draft').textContent = describeDraft(draft);
    $('conflict-current').textContent = describeCurrent(current);
    if (mode === 'unclear' && current === undefined) {
      $('conflict-title').textContent = 'Speicherstand unklar';
      $('conflict-text').textContent = 'Die Verbindung wurde unterbrochen. Ob gespeichert wurde, ist unklar. Es wird nichts erneut gesendet, bevor der aktuelle Stand geprüft ist.';
      $('conflict-note').textContent = '';
      $('conflict-take').textContent = 'Aktuellen Stand prüfen';
      $('conflict-keep').textContent = 'Später prüfen';
    } else {
      $('conflict-title').textContent = mode === 'unclear' ? 'Stand geprüft' : 'Stand geändert';
      $('conflict-text').textContent = mode === 'unclear'
        ? 'Der Server liefert diesen aktuellen Stand. Eine frühere Speicherung kann bereits enthalten sein.'
        : 'Die Position wurde inzwischen geändert. Es wurde nichts gespeichert.';
      $('conflict-note').textContent = draft.plus !== null
        ? 'Das Plus wird nicht automatisch erneut gebucht. Wenn du deine Menge behältst, gilt nur der Wert im Feld Menge.'
        : 'Du kannst deine Menge behalten und danach bewusst speichern.';
      $('conflict-take').textContent = 'Aktuellen Stand übernehmen';
      $('conflict-keep').textContent = 'Meine Menge behalten';
    }
    if (!$('conflict').open) showDialog('conflict', $('quantity'));
    $('conflict-take').focus();
  }
  async function checkUnclear() {
    if (!state.unclear) return;
    try {
      const data = await api('GET', {action: 'position', inventory: state.inventoryId, article: state.article.id});
      const draft = state.unclear;
      const current = data.position;
      if ((current && current.version === draft.baseVersion) || (!current && draft.baseVersion === null)) {
        state.unclear = null; state.dirty = true;
        closeDialog('conflict');
        renderArticle(false);
        feedback('Nicht gespeichert – Entwurf bleibt erhalten, bitte erneut speichern', 'error');
        return;
      }
      showConflict(current, draft, 'unclear');
    } catch (e) {
      if (ignorable(e)) return;
      if (!$('conflict').open) showConflict(undefined, state.unclear, 'unclear');
      $('conflict-note').textContent = 'Der Stand konnte nicht geprüft werden: ' + failureText(e);
    }
  }
  function adopt(current, keepMine) {
    const draft = conflict.draft;
    state.unclear = null;
    state.position = current;
    state.loaded = true;
    $('plus').value = '';
    $('quantity').value = keepMine
      ? (draft.quantity === null ? '' : String(draft.quantity))
      : (current && current.quantity !== null ? String(current.quantity) : '');
    state.dirty = Boolean(keepMine);
    conflict = null;
    closeDialog('conflict');
    renderArticle(false);
    feedback(keepMine ? 'Dein Entwurf · zum Speichern bestätigen' : 'Aktueller Stand übernommen');
  }
  $('conflict-take').onclick = () => {
    if (conflict.mode === 'unclear' && conflict.current === undefined) { checkUnclear(); return; }
    adopt(conflict.current, false);
  };
  $('conflict-keep').onclick = () => {
    if (conflict.mode === 'unclear' && conflict.current === undefined) { closeDialog('conflict'); return; }
    adopt(conflict.current, true);
  };

  for (const id of ['quantity', 'plus']) {
    $(id).addEventListener('input', () => {
      state.dirty = true; $(id).removeAttribute('aria-invalid');
      feedback('Änderung · beim Verlassen des Feldes speichern');
      $('saved-check').hidden = true;
    });
    $(id).addEventListener('change', commit);
    // Eingabetaste schließt die Eingabe ab: speichern, danach Tastatur schließen.
    $(id).addEventListener('keydown', e => {
      if (e.key !== 'Enter') return;
      e.preventDefault();
      if (state.dirty || state.busy) commit();
      else $(id).blur();
    });
  }
  $('save').onclick = () => { if (state.unclear) checkUnclear(); else commit(); };
  $('add').onclick = commit;

  // ---------- Suche ----------
  function closeResults() {
    if (permanentResults()) return;
    $('results').hidden = true;
    $('search').setAttribute('aria-expanded', 'false');
    $('search').removeAttribute('aria-activedescendant');
  }
  function renderResults(error) {
    $('results').replaceChildren();
    matches.forEach((a, i) => {
      const button = document.createElement('button');
      button.className = 'result'; button.id = 'result-' + i; button.type = 'button';
      button.setAttribute('role', 'option'); button.setAttribute('aria-selected', 'false');
      const name = document.createElement('strong'), code = document.createElement('small');
      name.textContent = a.name; code.textContent = a.code;
      button.append(name, code);
      button.onclick = () => selectArticle(a);
      $('results').append(button);
    });
    if (error) {
      const p = document.createElement('p'); p.className = 'empty-results'; p.textContent = error; $('results').append(p);
    } else if (!matches.length) {
      const p = document.createElement('p'); p.className = 'empty-results'; p.textContent = 'Keine Artikel gefunden. Bitte Suchbegriff oder Barcode prüfen.'; $('results').append(p);
    } else if (hasMore) {
      const more = document.createElement('button');
      more.className = 'more-results'; more.type = 'button'; more.textContent = 'Weitere Treffer laden';
      more.onclick = () => runSearch(true);
      $('results').append(more);
    }
    $('results').hidden = false;
    $('search').setAttribute('aria-expanded', 'true');
  }
  async function runSearch(append) {
    const term = $('search').value.trim();
    const seq = ++searchSeq;
    if (searchAbort) searchAbort.abort();
    searchAbort = new AbortController();
    if (!append) { activeResult = -1; matches = []; hasMore = false; after = null; }
    try {
      const params = {action: 'articles', q: term};
      if (append && after) params.after = after;
      const data = await api('GET', params, null, searchAbort.signal);
      if (seq !== searchSeq) return;
      matches = append ? matches.concat(data.articles) : data.articles;
      hasMore = data.hasMore; after = data.after;
      renderResults();
    } catch (e) {
      if (seq !== searchSeq || ignorable(e)) return;
      matches = []; hasMore = false;
      renderResults('Die Suche ist gerade nicht möglich: ' + failureText(e));
    }
  }
  $('search').addEventListener('input', () => {
    clearTimeout(searchTimer);
    searchTimer = setTimeout(() => runSearch(false), 250);
  });
  $('search').addEventListener('focus', () => { if ($('results').hidden) runSearch(false); });
  $('search').addEventListener('keydown', e => {
    if (e.key === 'Escape') { closeResults(); return; }
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      if (!matches.length) return;
      const direction = e.key === 'ArrowDown' ? 1 : -1;
      activeResult = activeResult < 0 ? (direction > 0 ? 0 : matches.length - 1) : (activeResult + direction + matches.length) % matches.length;
      for (let i = 0; i < matches.length; i++) $('result-' + i).setAttribute('aria-selected', String(i === activeResult));
      const chosen = $('result-' + activeResult);
      $('search').setAttribute('aria-activedescendant', chosen.id);
      chosen.scrollIntoView({block: 'nearest'});
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (activeResult >= 0 && matches[activeResult]) selectArticle(matches[activeResult]);
      else if (/^\d{6,}$/.test($('search').value.trim())) lookupBarcode($('search').value.trim());
    }
  });
  document.addEventListener('click', e => { if (!e.target.closest('.search-area')) closeResults(); });

  async function lookupBarcode(code) {
    if (state.busy && state.inflight) await state.inflight;
    if (state.unclear) return;
    clearArticle();
    closeResults();
    try {
      const data = await api('GET', {action: 'article', barcode: code});
      await selectArticle(data.article);
    } catch (e) {
      if (ignorable(e)) return;
      problem(e instanceof ApiFailure ? e.message : failureText(e), $('scan-open'));
    }
  }

  // ---------- Kamera ----------
  const scanner = {stream: null, detector: null, timer: null, handled: false, detecting: false, token: 0};
  let zxingPromise = null;
  // Nicht jeder Browser hat die eingebaute Barcode-Erkennung (z. B. viele Samsung-Geräte):
  // Dann wird eine mitgelieferte Bibliothek erst bei Bedarf geladen.
  function loadZXing() {
    if (window.ZXing) return Promise.resolve(window.ZXing);
    if (!zxingPromise) {
      zxingPromise = new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.src = '/js/vendor/zxing-library.min.js';
        script.onload = () => window.ZXing ? resolve(window.ZXing) : reject(new Error('zxing'));
        script.onerror = () => reject(new Error('zxing'));
        document.head.append(script);
      }).catch(error => { zxingPromise = null; throw error; });
    }
    return zxingPromise;
  }
  async function makeDetector() {
    if (window.BarcodeDetector) {
      try {
        let formats = SCAN_FORMATS;
        if (window.BarcodeDetector.getSupportedFormats) {
          const supported = await window.BarcodeDetector.getSupportedFormats();
          formats = SCAN_FORMATS.filter(f => supported.includes(f));
        }
        const native = new window.BarcodeDetector({formats});
        return {detect: async video => {
          const codes = await native.detect(video);
          return codes.length ? String(codes[0].rawValue || '').trim() : null;
        }};
      } catch (e) { /* eingebaute Erkennung unbrauchbar: Bibliothek nutzen */ }
    }
    const ZX = await loadZXing();
    const reader = new ZX.MultiFormatReader();
    reader.setHints(new Map([
      [ZX.DecodeHintType.POSSIBLE_FORMATS, [ZX.BarcodeFormat.EAN_13, ZX.BarcodeFormat.EAN_8, ZX.BarcodeFormat.UPC_A,
        ZX.BarcodeFormat.UPC_E, ZX.BarcodeFormat.CODE_128, ZX.BarcodeFormat.CODE_39, ZX.BarcodeFormat.ITF]],
      [ZX.DecodeHintType.TRY_HARDER, true],
    ]));
    const canvas = document.createElement('canvas');
    const turned = document.createElement('canvas');
    const read = source => {
      try {
        const bitmap = new ZX.BinaryBitmap(new ZX.HybridBinarizer(new ZX.HTMLCanvasElementLuminanceSource(source)));
        return String(reader.decodeWithState(bitmap).getText()).trim() || null;
      } catch (e) {
        return null; // kein Barcode im Bild
      }
    };
    return {detect: async video => {
      const width = video.videoWidth, height = video.videoHeight;
      if (!width || !height) return null;
      const scale = Math.min(1, 1280 / width);
      canvas.width = Math.round(width * scale); canvas.height = Math.round(height * scale);
      canvas.getContext('2d', {willReadFrequently: true}).drawImage(video, 0, 0, canvas.width, canvas.height);
      const upright = read(canvas);
      if (upright) return upright;
      // Hochkant gehaltene Codes: Bild um 90° drehen und erneut lesen (die Lage des Codes ist egal).
      turned.width = canvas.height; turned.height = canvas.width;
      const context = turned.getContext('2d', {willReadFrequently: true});
      context.translate(turned.width / 2, turned.height / 2);
      context.rotate(Math.PI / 2);
      context.drawImage(canvas, -canvas.width / 2, -canvas.height / 2);
      return read(turned);
    }};
  }
  function stopScanner() {
    scanner.token++;
    clearInterval(scanner.timer); scanner.timer = null;
    if (scanner.stream) scanner.stream.getTracks().forEach(track => track.stop());
    scanner.stream = null;
    $('camera-video').srcObject = null;
    $('camera').hidden = true;
  }
  $('scanner').addEventListener('close', stopScanner);
  $('scanner-close').onclick = () => closeDialog('scanner');
  document.addEventListener('visibilitychange', () => { if (document.hidden && $('scanner').open) closeDialog('scanner'); });
  $('manual-scan').onchange = () => {
    $('scan-mode-text').textContent = $('manual-scan').checked ? 'Manuell · Scan per Knopf auslösen' : 'Automatisch · erkannter Barcode wird übernommen';
  };
  $('scan-open').onclick = async () => {
    closeResults();
    if (state.busy && state.inflight) await state.inflight;
    if (state.unclear) return;
    const run = ++scanner.token;
    scanner.handled = false;
    $('scan-confirm').hidden = !$('manual-scan').checked;
    $('scanner-hint').textContent = 'Kamera wird gestartet …';
    showDialog('scanner', $('scan-open'));
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      $('scanner-hint').textContent = 'Dieses Gerät oder dieser Browser kann die Kamera hier nicht benutzen. Bitte die Artikelsuche nutzen.';
      $('scan-confirm').hidden = true;
      return;
    }
    try {
      try {
        scanner.detector = await makeDetector();
      } catch (e) {
        $('scanner-hint').textContent = 'Der Barcode-Leser konnte nicht geladen werden. Bitte die Verbindung prüfen oder die Artikelsuche nutzen.';
        $('scan-confirm').hidden = true;
        return;
      }
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {facingMode: {ideal: 'environment'}, width: {ideal: 1280}, height: {ideal: 720}}, audio: false,
      });
      if (run !== scanner.token || !$('scanner').open) { stream.getTracks().forEach(track => track.stop()); return; }
      scanner.stream = stream;
      const video = $('camera-video');
      video.srcObject = stream;
      await video.play();
      $('camera').hidden = false;
      if ($('manual-scan').checked) {
        $('scanner-hint').textContent = 'Barcode in den Rahmen halten und „Scan auslösen“ tippen.';
      } else {
        $('scanner-hint').textContent = 'Barcode in den Rahmen halten. Er wird automatisch erkannt.';
        scanner.timer = setInterval(() => detectOnce(false), 300);
      }
    } catch (e) {
      const name = e && e.name;
      $('scanner-hint').textContent = name === 'NotAllowedError' || name === 'SecurityError'
        ? 'Der Kamerazugriff wurde nicht erlaubt. Bitte in den Browser-Einstellungen erlauben oder die Artikelsuche nutzen.'
        : name === 'NotFoundError' || name === 'OverconstrainedError'
          ? 'Es wurde keine Kamera gefunden. Bitte die Artikelsuche nutzen.'
          : 'Die Kamera konnte nicht gestartet werden. Sie wird eventuell von einer anderen App benutzt. Bitte die Artikelsuche nutzen.';
      $('scan-confirm').hidden = true;
      stopScanner();
    }
  };
  async function detectOnce(manual) {
    if (scanner.handled || scanner.detecting || !scanner.stream) return;
    scanner.detecting = true;
    try {
      const value = await scanner.detector.detect($('camera-video'));
      if (value && !scanner.handled) {
        scanner.handled = true;
        closeDialog('scanner');
        await lookupBarcode(value);
      } else if (manual && !value) {
        $('scanner-hint').textContent = 'Kein Barcode erkannt. Bitte näher heranhalten und erneut auslösen.';
      }
    } catch (e) {
      if (manual) $('scanner-hint').textContent = 'Der Barcode konnte nicht gelesen werden. Bitte erneut versuchen.';
    } finally {
      scanner.detecting = false;
    }
  }
  $('scan-confirm').onclick = () => detectOnce(true);

  // ---------- Menü / Bereiche ----------
  $('menu-open').onclick = () => { closeResults(); showDialog('menu', $('menu-open')); };
  $('menu-close').onclick = () => closeDialog('menu');
  function applySection() {
    const capture = state.section === 'capture';
    $('capture-screen').hidden = !capture;
    $('context').hidden = !capture;
    $('settings-screen').hidden = capture;
  }
  function go(next) {
    closeDialog('menu');
    state.section = next;
    applySection();
    if (next === 'settings') {
      renderList();
      if (editorKey && wide()) showEditor();
      else $('new-inventory').focus();
    } else {
      if ($('inventory-editor').open) $('inventory-editor').close();
      document.body.classList.toggle('modal-open', Boolean(document.querySelector('dialog:modal')));
      if (permanentResults()) runSearch();
      $('inventory').focus();
    }
  }
  $('go-capture').onclick = () => go('capture');
  $('go-settings').onclick = () => go('settings');

  // ---------- Settings: Inventuren ----------
  function renderList() {
    $('inventory-list').replaceChildren();
    if (!state.inventories.length) {
      const note = document.createElement('p'); note.className = 'list-note'; note.textContent = 'Keine Inventuren vorhanden.';
      $('inventory-list').append(note);
    }
    state.inventories.forEach(inv => {
      const button = document.createElement('button'), text = document.createElement('span'), title = document.createElement('strong'),
        meta = document.createElement('small'), badge = document.createElement('span'), arrow = document.createElement('span');
      button.className = 'inventory-row' + (inv.id === editorKey ? ' active' : '');
      button.dataset.inventoryId = inv.id;
      title.textContent = inv.name;
      meta.textContent = (inv.year || 'Kein Jahr') + ' · ' + dateLabel(inv.date);
      badge.className = 'state'; badge.textContent = inv.status || 'Nicht festgelegt';
      arrow.setAttribute('aria-hidden', 'true'); arrow.innerHTML = '<i data-lucide="chevron-right"></i>';
      text.append(title, meta, badge); button.append(text, arrow);
      button.setAttribute('aria-label', inv.name + ' bearbeiten');
      button.onclick = () => editInventory(inv.id, button);
      $('inventory-list').append(button);
    });
    refreshIcons();
  }
  const editorDirty = () => Boolean(editor && editor.loaded && JSON.stringify(editor.values) !== JSON.stringify(editor.original));
  function renderEditor() {
    $('editor-title').textContent = editorKey === 'new' ? 'Neue Inventur' : 'Inventur bearbeiten';
    $('inventory-name').value = editor.values.name;
    $('inventory-year').value = editor.values.year;
    $('inventory-date').value = editor.values.date;
    $('inventory-status').value = editor.values.status;
    $('inventory-name').disabled = !editor.loaded || editor.nameLocked;
    $('name-lock-note').hidden = !editor.nameLocked;
    for (const id of ['inventory-year', 'inventory-date', 'inventory-status']) $(id).disabled = !editor.loaded;
    $('inventory-save').disabled = !editorDirty() || editor.saving;
    $('editor-status').textContent = !editor.loaded ? 'Wird geladen …' : editor.saving ? 'Speichert …' : editorDirty() ? 'Ungespeicherter Entwurf' : (editor.message || '');
  }
  function showEditor(trigger) {
    if ($('inventory-editor').open) $('inventory-editor').close();
    document.body.classList.toggle('modal-open', Boolean(document.querySelector('dialog:modal')));
    renderEditor();
    dialogReturn.set('inventory-editor', trigger || $('new-inventory'));
    if (wide()) $('inventory-editor').show();
    else showDialog('inventory-editor', trigger || $('new-inventory'));
    if (!$('inventory-name').disabled) $('inventory-name').focus();
  }
  async function editInventory(id, trigger) {
    editorKey = id;
    renderList();
    if (id === 'new') {
      const values = {name: '', year: '', date: '', status: ''};
      editor = {id: null, values: {...values}, original: {...values}, version: null, nameLocked: false, loaded: true, saving: false, message: ''};
      showEditor(trigger);
      return;
    }
    const inv = state.inventories.find(i => i.id === id);
    const values = {name: inv.name, year: inv.year || '', date: (inv.date || '').slice(0, 10), status: inv.status || ''};
    editor = {id, values: {...values}, original: {...values}, version: inv.version, nameLocked: true, loaded: false, saving: false, message: ''};
    showEditor(trigger);
    try {
      const data = await api('GET', {action: 'inventory', id});
      if (!editor || editor.id !== id) return;
      const fresh = data.inventory;
      const freshValues = {name: fresh.name, year: fresh.year || '', date: (fresh.date || '').slice(0, 10), status: fresh.status || ''};
      editor.values = {...freshValues}; editor.original = {...freshValues};
      editor.version = fresh.version; editor.nameLocked = Boolean(fresh.nameLocked); editor.loaded = true;
    } catch (e) {
      if (ignorable(e)) return;
      if (editor && editor.id === id) editor.message = 'Nicht geladen: ' + failureText(e);
    }
    if (editor && editor.id === id) renderEditor();
  }
  $('new-inventory').onclick = () => editInventory('new', $('new-inventory'));
  $('editor-close').onclick = () => closeDialog('inventory-editor');
  for (const [id, property] of [['inventory-name', 'name'], ['inventory-year', 'year'], ['inventory-date', 'date'], ['inventory-status', 'status']]) {
    $(id).addEventListener('input', () => {
      editor.values[property] = $(id).value;
      $(id).removeAttribute('aria-invalid');
      renderEditor();
    });
  }
  $('inventory-save').onclick = async () => {
    if (!editorDirty() || editor.saving) return;
    const value = editor.values;
    if (!value.name.trim()) {
      $('inventory-name').setAttribute('aria-invalid', 'true');
      problem('Bitte einen Inventurnamen eingeben.', $('inventory-name'));
      return;
    }
    if (value.name.length > 850 || value.year.length > 4000) {
      const field = value.name.length > 850 ? $('inventory-name') : $('inventory-year');
      field.setAttribute('aria-invalid', 'true');
      problem(value.name.length > 850 ? 'Der Inventurname darf höchstens 850 Zeichen enthalten.' : 'Das Feld Jahr darf höchstens 4000 Zeichen enthalten.', field);
      return;
    }
    const current = editor;
    current.saving = true; renderEditor();
    try {
      const data = await api('POST', null, {
        action: 'saveInventory', id: current.id, name: value.name, year: value.year,
        date: value.date, status: value.status, baseVersion: current.version,
      });
      const saved = data.inventory;
      const savedValues = {name: saved.name, year: saved.year || '', date: (saved.date || '').slice(0, 10), status: saved.status || ''};
      const index = state.inventories.findIndex(i => i.id === saved.id);
      if (index >= 0) state.inventories[index] = saved; else state.inventories.unshift(saved);
      if (editor === current) {
        editorKey = saved.id; current.id = saved.id; current.version = saved.version;
        current.values = {...savedValues}; current.original = {...savedValues}; current.message = 'Gespeichert';
      }
      refreshInventoryContext(); renderList();
      if (!wide() && editor === current) { current.saving = false; closeDialog('inventory-editor'); }
    } catch (e) {
      if (!ignorable(e)) {
        current.message = 'Nicht gespeichert';
        problem((e instanceof ApiFailure ? e.message : failureText(e)) +
          (e instanceof ApiFailure && e.status === 409 && e.body.error === 'conflict' ? ' Dein Entwurf bleibt erhalten; die Liste zeigt den aktuellen Stand.' : ''), $('inventory-save'));
        if (e instanceof ApiFailure && e.body.error === 'conflict') {
          if (e.body.current) current.version = e.body.current.version;
          loadInventories().catch(() => {});
        }
      }
    } finally {
      current.saving = false;
      if (editor === current) renderEditor();
    }
  };

  // ---------- Bildschirm / Tastatur ----------
  function viewport() {
    const vv = window.visualViewport;
    const height = vv ? vv.height : innerHeight;
    document.documentElement.style.setProperty('--view-height', height + 'px');
    $('app').classList.toggle('keyboard', height < 500 && ['quantity', 'plus'].includes(document.activeElement && document.activeElement.id));
    if (state.section === 'capture' && state.started && permanentResults() && $('results').hidden) runSearch();
  }
  window.addEventListener('resize', viewport);
  if (window.visualViewport) window.visualViewport.addEventListener('resize', viewport);
  document.addEventListener('focusin', viewport);
  document.addEventListener('focusout', () => setTimeout(viewport, 0));
  window.addEventListener('resize', () => {
    if (state.section === 'settings' && $('inventory-editor').open && editor) {
      const modal = $('inventory-editor').matches(':modal');
      if (modal === wide()) showEditor();
    }
  });
  window.addEventListener('beforeunload', e => {
    if (state.dirty || state.busy || state.unclear || editorDirty()) { e.preventDefault(); e.returnValue = ''; }
  });

  renderInventory();
  renderArticle(true);
  viewport();
  if (token()) start(); else showLogin();
  window.addEventListener('load', refreshIcons);
})();
