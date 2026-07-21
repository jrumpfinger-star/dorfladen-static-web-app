// kiosk-kalender.js — Kiosk-Tab „Kalender" (Feature: Kiosk-Kalender)
// Löst den Papierkalender ab: zentrale Aufgaben-/Reservierungs-/Vorbestellungs-
// liste, ganztägig oder mit Uhrzeit, optional mit Kunde, optional wiederkehrend,
// mit Erledigt-Kennzeichnung. Rendert vollständig in #kal-root.
//
// Backend: /api/kalender (GET/POST/PATCH/DELETE, Override via ?override=DATUM),
//          Kunden-Autocomplete via /api/stammkunden?q=…
// Auth:    admin-auth.js hängt X-CMS-Auth an (GET /api/kalender zusätzlich).
(function () {
  'use strict';

  var CATS = {
    aufgabe: 'Aufgabe', reservierung: 'Reservierung',
    vorbestellung: 'Vorbestellung', lieferung: 'Lieferung'
  };
  var RECUR = { daily: 'täglich', weekly: 'wöchentlich', biweekly: '14-tägig', monthly: 'monatlich' };
  var DOW = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'];
  var POLL_MS = 45000;

  var state = {
    weekOffset: 0,
    selected: null,     // ISO date string
    filter: 'all',
    showDone: false,
    allday: true,
    entries: [],
    built: false,
    pollTimer: null,
    kundenMap: {}       // name(lower) → id
  };

  // ── Datums-Helfer ──
  function pad(n) { return (n < 10 ? '0' : '') + n; }
  function iso(d) { return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); }
  function todayIso() { return iso(new Date()); }
  function mondayOf(offset) {
    var d = new Date();
    d.setHours(12, 0, 0, 0);
    var dow = (d.getDay() + 6) % 7; // 0=Mo
    d.setDate(d.getDate() - dow + offset * 7);
    return d;
  }
  function weekDates() {
    var mon = mondayOf(state.weekOffset);
    var out = [];
    for (var i = 0; i < 7; i++) {
      var d = new Date(mon); d.setDate(mon.getDate() + i); out.push(d);
    }
    return out;
  }
  function fmtRange(dates) {
    var a = dates[0], b = dates[6];
    var mon = ['Jan', 'Feb', 'März', 'Apr', 'Mai', 'Juni', 'Juli', 'Aug', 'Sep', 'Okt', 'Nov', 'Dez'];
    return a.getDate() + '.–' + b.getDate() + '. ' + mon[b.getMonth()] + ' ' + b.getFullYear();
  }
  function isoWeek(d) {
    var t = new Date(d.getFullYear(), d.getMonth(), d.getDate());
    var day = (t.getDay() + 6) % 7; t.setDate(t.getDate() - day + 3);
    var first = new Date(t.getFullYear(), 0, 4);
    return 1 + Math.round(((t - first) / 86400000 - 3 + ((first.getDay() + 6) % 7)) / 7);
  }

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  // ── Toast (constitution §6: keine nativen Dialoge) ──
  function toast(msg, kind) {
    if (window.K && typeof window.K.showToast === 'function') { window.K.showToast(msg, kind); return; }
    var t = document.createElement('div');
    t.className = 'kal-toast' + (kind === 'err' ? ' err' : '');
    t.textContent = msg;
    document.body.appendChild(t);
    setTimeout(function () { t.classList.add('show'); }, 10);
    setTimeout(function () { t.classList.remove('show'); setTimeout(function () { t.remove(); }, 300); }, 2600);
  }

  // ── Aufbau ──
  function build() {
    var root = document.getElementById('kal-root');
    if (!root || state.built) return;
    injectStyle();
    root.innerHTML =
      '<div class="kal-toolbar">' +
        '<button class="kal-nav" data-act="prev" aria-label="Vorherige Woche">‹</button>' +
        '<div class="kal-week"><span id="kal-kw"></span><small id="kal-range"></small></div>' +
        '<button class="kal-nav" data-act="next" aria-label="Nächste Woche">›</button>' +
        '<button class="kal-today" data-act="today">Heute</button>' +
        '<button class="kal-new" data-act="new">+ Neuer Eintrag</button>' +
      '</div>' +
      '<div class="kal-days" id="kal-days"></div>' +
      '<div class="kal-filters" id="kal-filters">' +
        '<button class="kal-chip active" data-cat="all">Alle</button>' +
        '<button class="kal-chip" data-cat="aufgabe"><span class="k" style="background:var(--c-pri,#1e463a)"></span>Aufgaben</button>' +
        '<button class="kal-chip" data-cat="reservierung"><span class="k" style="background:#1d4ed8"></span>Reservierungen</button>' +
        '<button class="kal-chip" data-cat="vorbestellung"><span class="k" style="background:#e65100"></span>Vorbestellungen</button>' +
        '<button class="kal-chip" data-cat="lieferung"><span class="k" style="background:#6d28d9"></span>Lieferungen</button>' +
        '<button class="kal-chip kal-donechip" data-act="toggledone">✓ Erledigte zeigen</button>' +
      '</div>' +
      '<div id="kal-list"></div>' +
      '<div class="kal-modal" id="kal-modal" hidden>' +
        '<div class="kal-modal-card" role="dialog" aria-modal="true" aria-label="Neuer Kalendereintrag">' +
          '<div class="kal-modal-head"><span>Neuer Eintrag</span>' +
            '<button class="kal-modal-x" data-act="closedialog" aria-label="Schließen">×</button></div>' +
          '<label class="kal-fld"><span>Was ist zu tun / reserviert?</span>' +
            '<input type="text" id="kal-title" placeholder="z. B. „Brotbestellung Fam. Huber abholbereit“…"></label>' +
          '<div class="kal-fld"><span>Zeitpunkt</span>' +
            '<div class="kal-modal-time">' +
              '<div class="kal-toggle"><button class="on" data-ad="1">Ganztags</button><button data-ad="0">Uhrzeit</button></div>' +
              '<input type="time" id="kal-time" value="09:00" style="display:none">' +
            '</div></div>' +
          '<label class="kal-fld"><span>Kategorie</span>' +
            '<select id="kal-cat"><option value="aufgabe">🗒️ Aufgabe</option><option value="reservierung">📌 Reservierung</option><option value="vorbestellung">🛒 Vorbestellung</option><option value="lieferung">🚚 Lieferung</option></select></label>' +
          '<label class="kal-fld"><span>Kunde (optional)</span>' +
            '<input type="text" id="kal-kunde" placeholder="🔗 Name eingeben…" list="kal-kundenlist" autocomplete="off"><datalist id="kal-kundenlist"></datalist></label>' +
          '<label class="kal-fld"><span>Wiederholung</span>' +
            '<select id="kal-recur"><option value="">↻ Einmalig</option><option value="daily">Täglich</option><option value="weekly">Wöchentlich</option><option value="biweekly">14-tägig</option><option value="monthly">Monatlich</option></select></label>' +
          '<div class="kal-modal-foot">' +
            '<button class="kal-btn-ghost" data-act="closedialog">Abbrechen</button>' +
            '<button class="kal-add" data-act="add">Speichern</button>' +
          '</div>' +
        '</div>' +
      '</div>';

    // Events (delegiert)
    root.addEventListener('click', onClick);
    var title = document.getElementById('kal-title');
    title.addEventListener('keydown', function (e) { if (e.key === 'Enter') addEntry(); });
    var kunde = document.getElementById('kal-kunde');
    var kt = null;
    kunde.addEventListener('input', function () {
      clearTimeout(kt); kt = setTimeout(function () { searchKunden(kunde.value); }, 250);
    });
    // Dialog: Klick auf Overlay (außerhalb der Karte) + Escape schließen
    var modal = document.getElementById('kal-modal');
    modal.addEventListener('click', function (e) { if (e.target === modal) closeDialog(); });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && !modal.hidden) closeDialog();
    });
    if (!state.selected) state.selected = todayIso();
    state.built = true;
  }

  function onClick(e) {
    var b = e.target.closest('[data-act],[data-cat],[data-ad]');
    if (!b) return;
    if (b.dataset.act === 'prev') { state.weekOffset--; load(); }
    else if (b.dataset.act === 'next') { state.weekOffset++; load(); }
    else if (b.dataset.act === 'today') { state.weekOffset = 0; state.selected = todayIso(); load(); }
    else if (b.dataset.act === 'new') { openDialog(); }
    else if (b.dataset.act === 'closedialog') { closeDialog(); }
    else if (b.dataset.act === 'add') { addEntry(); }
    else if (b.dataset.act === 'toggledone') { state.showDone = !state.showDone; b.classList.toggle('active', state.showDone); b.textContent = state.showDone ? '✓ Erledigte ausblenden' : '✓ Erledigte zeigen'; renderList(); }
    else if (b.dataset.cat) { state.filter = b.dataset.cat; document.querySelectorAll('#kal-filters .kal-chip[data-cat]').forEach(function (c) { c.classList.toggle('active', c === b); }); renderList(); }
    else if (b.dataset.ad) { setAllday(b.dataset.ad === '1'); }
  }

  function openDialog() {
    var m = document.getElementById('kal-modal'); if (!m) return;
    // Felder zurücksetzen; Standard = Ganztags
    document.getElementById('kal-title').value = '';
    document.getElementById('kal-kunde').value = '';
    document.getElementById('kal-cat').value = 'aufgabe';
    document.getElementById('kal-recur').value = '';
    document.getElementById('kal-time').value = '09:00';
    setAllday(true);
    m.hidden = false;
    setTimeout(function () { document.getElementById('kal-title').focus(); }, 30);
  }

  function closeDialog() {
    var m = document.getElementById('kal-modal'); if (m) m.hidden = true;
  }

  function setAllday(v) {
    state.allday = v;
    var btns = document.querySelectorAll('.kal-toggle button');
    btns[0].classList.toggle('on', v); btns[1].classList.toggle('on', !v);
    document.getElementById('kal-time').style.display = v ? 'none' : '';
  }

  // ── Laden / Rendern ──
  function apiBase() { return (window.API_BASE || '') + '/api/kalender'; }

  function load() {
    build();
    var dates = weekDates();
    document.getElementById('kal-kw').textContent = 'KW ' + isoWeek(dates[0]) + ' · ' + dates[0].getFullYear();
    document.getElementById('kal-range').textContent = fmtRange(dates);
    // gewählten Tag in die Woche spiegeln, falls außerhalb
    var isoList = dates.map(iso);
    if (isoList.indexOf(state.selected) === -1) {
      state.selected = (state.weekOffset === 0 && isoList.indexOf(todayIso()) !== -1) ? todayIso() : isoList[0];
    }
    var von = isoList[0], bis = isoList[6];
    fetch(apiBase() + '?von=' + von + '&bis=' + bis, { headers: { 'Accept': 'application/json' } })
      .then(function (r) { if (r.status === 401) throw new Error('401'); return r.json(); })
      .then(function (d) { state.entries = (d && d.data) || []; renderDays(); renderList(); })
      .catch(function (err) {
        if (String(err.message) === '401') { toast('Bitte anmelden, um den Kalender zu sehen.', 'err'); }
        else { toast('Kalender konnte nicht geladen werden.', 'err'); }
        state.entries = []; renderDays(); renderList();
      });
  }

  function entriesFor(isoDate) {
    return state.entries.filter(function (e) { return (e.datum || '').slice(0, 10) === isoDate; });
  }

  function renderDays() {
    var wrap = document.getElementById('kal-days'); if (!wrap) return;
    var dates = weekDates();
    wrap.innerHTML = dates.map(function (d) {
      var id = iso(d);
      var cnt = entriesFor(id).length;
      var isToday = id === todayIso();
      return '<button class="kal-day' + (id === state.selected ? ' active' : '') + (isToday ? ' today' : '') + '" data-day="' + id + '">' +
        '<span class="dow">' + DOW[(d.getDay() + 6) % 7] + '</span>' +
        '<span class="dnum">' + d.getDate() + '</span>' +
        (cnt ? '<span class="dot"></span>' : '') + '</button>';
    }).join('');
    wrap.querySelectorAll('.kal-day').forEach(function (el) {
      el.addEventListener('click', function () { state.selected = el.dataset.day; renderDays(); renderList(); });
    });
  }

  function deLong(iso) {
    try { return new Date(iso + 'T12:00:00').toLocaleDateString('de-DE', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }); }
    catch (e) { return iso; }
  }
  function deShort(iso) {
    try { return new Date(iso + 'T12:00:00').toLocaleDateString('de-DE', { weekday: 'short', day: '2-digit', month: '2-digit', year: 'numeric' }); }
    catch (e) { return iso; }
  }
  function fmtErledigt(dt) {
    try {
      return new Date(dt).toLocaleString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) + ' Uhr';
    } catch (e) { return dt; }
  }

  function renderList() {
    var list = document.getElementById('kal-list'); if (!list) return;
    var head = '<div class="kal-dayhead">' + esc(deLong(state.selected)) + '</div>';
    var day = entriesFor(state.selected)
      .filter(function (e) { return state.filter === 'all' || e.kategorie === state.filter; })
      .filter(function (e) { return state.showDone || e.status !== 'erledigt'; });

    if (!day.length) {
      list.innerHTML = head + '<div class="kal-empty">Keine Einträge für diesen Tag.<br>Tippe oben auf „+ Neuer Eintrag“.</div>';
      return;
    }
    var allday = day.filter(function (e) { return e.ganztags; })
      .sort(function (a, b) { return doneRank(a) - doneRank(b); });
    var timed = day.filter(function (e) { return !e.ganztags; })
      .sort(function (a, b) { return (doneRank(a) - doneRank(b)) || String(a.uhrzeit).localeCompare(String(b.uhrzeit)); });

    var html = head;
    if (allday.length) html += section('Ganztägig', allday.length) + allday.map(entryHtml).join('');
    if (timed.length) html += section('Mit Uhrzeit', timed.length) + timed.map(entryHtml).join('');
    list.innerHTML = html;

    list.querySelectorAll('[data-check]').forEach(function (el) {
      el.addEventListener('click', function () { toggleDone(el.dataset.check, el.dataset.datum); });
    });
    list.querySelectorAll('[data-del]').forEach(function (el) {
      el.addEventListener('click', function () { del(el.dataset.del, el.dataset.delSerie === '1', el.dataset.delDatum); });
    });
    if (window.lucide) try { window.lucide.createIcons(); } catch (e) {}
  }

  function doneRank(e) { return e.status === 'erledigt' ? 1 : 0; }
  function section(t, n) { return '<div class="kal-sec">' + t + ' <span>' + n + '</span></div>'; }

  function entryHtml(e) {
    var done = e.status === 'erledigt';
    var dstr = deShort(e.datum); // z. B. „Di, 21.07.2026“
    var time = e.ganztags
      ? '<span class="time allday">Ganztägig</span>'
      : '<span class="time">' + esc(e.uhrzeit) + ' Uhr</span>';
    var datum = '<span class="kal-datum">' + esc(dstr) + '</span>';
    var erledigt = (done && e.erledigt_am)
      ? '<div class="note">Erledigt am ' + esc(fmtErledigt(e.erledigt_am)) + '</div>' : '';
    var kunde = (e.kunde_id || e.kunde_freitext)
      ? '<span class="badge kunde">🔗 ' + esc(e.kunde_freitext || e.kunde_id) + '</span>' : '';
    var recur = e.wiederholung ? '<span class="badge recur">↻ ' + (RECUR[e.wiederholung] || e.wiederholung) + '</span>' : '';
    var note = e.notiz ? '<div class="note">' + esc(e.notiz) + '</div>' : '';
    var checkKey = e.wiederholung ? (e._serien_id || e.id) : e.id;
    return '<div class="kal-entry cat-' + esc(e.kategorie) + (done ? ' done' : '') + '">' +
      '<div class="check" data-check="' + esc(checkKey) + '" data-datum="' + esc(e.datum) + '" title="Als erledigt markieren"><span class="box">✓</span></div>' +
      '<div class="body"><div class="top">' + datum + time + '<span class="title">' + esc(e.titel) + '</span></div>' +
      '<div class="badges"><span class="badge cat">' + esc(CATS[e.kategorie] || e.kategorie) + '</span>' + recur + kunde + '</div>' + note + erledigt + '</div>' +
      '<div class="acts"><button class="ic" data-del="' + esc(checkKey) + '" data-del-serie="' + (e.wiederholung ? '1' : '') + '" data-del-datum="' + esc(e.datum) + '" title="Löschen"><i data-lucide="trash-2" style="width:15px;height:15px"></i></button></div>' +
      '</div>';
  }

  // ── Aktionen ──
  function addEntry() {
    var title = document.getElementById('kal-title');
    var t = title.value.trim();
    if (!t) { title.focus(); return; }
    var timeEl = document.getElementById('kal-time');
    if (!state.allday && !timeEl.value) { toast('Bitte eine Uhrzeit angeben oder „Ganztags“ wählen.', 'err'); return; }
    var kundeVal = document.getElementById('kal-kunde').value.trim();
    var kundeId = state.kundenMap[kundeVal.toLowerCase()] || '';
    var body = {
      titel: t, datum: state.selected, ganztags: state.allday,
      uhrzeit: state.allday ? '' : timeEl.value,
      kategorie: document.getElementById('kal-cat').value,
      wiederholung: document.getElementById('kal-recur').value,
      // Anzeigename immer speichern (lesbares Badge); kunde_id verknüpft zusätzlich
      // mit dem Stammkunden, falls ein Treffer gewählt wurde.
      kunde_id: kundeId, kunde_freitext: kundeVal
    };
    fetch(apiBase(), { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
      .then(function (r) { return r.json().then(function (d) { return { ok: r.ok, d: d }; }); })
      .then(function (res) {
        if (!res.ok || !res.d.success) {
          var msg = (res.d.errors && res.d.errors[0]) || res.d.error || 'Speichern fehlgeschlagen.';
          toast(msg, 'err'); return;
        }
        title.value = ''; document.getElementById('kal-kunde').value = ''; document.getElementById('kal-recur').value = '';
        toast('Eintrag gespeichert.');
        closeDialog();
        load();
      })
      .catch(function () { toast('Speichern fehlgeschlagen.', 'err'); });
  }

  function toggleDone(id, datum) {
    var e = state.entries.filter(function (x) { return (x._serien_id || x.id) === id && x.datum === datum; })[0];
    var makeDone = !(e && e.status === 'erledigt');
    var req;
    if (e && e.wiederholung) {
      // Serien-Vorkommen → Override (nur dieses Datum)
      req = fetch(apiBase() + '/' + id + '?override=' + datum, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: makeDone ? 'erledigt' : 'offen' })
      });
    } else {
      req = fetch(apiBase() + '/' + id, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: makeDone ? 'erledigt' : 'offen' })
      });
    }
    req.then(function (r) { return r.json(); })
      .then(function (d) { if (!d.success) throw new Error(); load(); })
      .catch(function () { toast('Aktion fehlgeschlagen.', 'err'); });
  }

  function del(id, isSerie, datum) {
    // Serien-Vorkommen: nur dieses Datum ausblenden (Override), Serie bleibt.
    var req = isSerie
      ? fetch(apiBase() + '/' + id + '?override=' + datum, {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: 'geloescht' })
        })
      : fetch(apiBase() + '/' + id, { method: 'DELETE' });
    req.then(function (r) { return r.json(); })
      .then(function (d) { if (!d.success) throw new Error(); toast('Gelöscht.'); load(); })
      .catch(function () { toast('Löschen fehlgeschlagen.', 'err'); });
  }

  function searchKunden(q) {
    q = (q || '').trim();
    if (q.length < 2) return;
    fetch((window.API_BASE || '') + '/api/stammkunden?q=' + encodeURIComponent(q), { headers: { 'Accept': 'application/json' } })
      .then(function (r) { return r.json(); })
      .then(function (d) {
        var list = document.getElementById('kal-kundenlist'); if (!list) return;
        var cs = (d && d.customers) || [];
        list.innerHTML = cs.map(function (c) { return '<option value="' + esc(c.name) + '">'; }).join('');
        cs.forEach(function (c) { if (c.name) state.kundenMap[c.name.toLowerCase()] = c.id; });
      })
      .catch(function () {});
  }

  // ── Auto-Refresh ──
  function startPoll() {
    stopPoll();
    state.pollTimer = setInterval(function () {
      var panel = document.getElementById('panel-kalender');
      if (panel && panel.classList.contains('active')) load();
      else stopPoll();
    }, POLL_MS);
  }
  function stopPoll() { if (state.pollTimer) { clearInterval(state.pollTimer); state.pollTimer = null; } }

  // ── Öffentliche API (von switchTab aufgerufen) ──
  window.KalenderKiosk = {
    onShow: function () { build(); load(); startPoll(); },
    reload: load
  };

  // ── Styles (scoped auf #kal-root, theme-fähig via --c-*/--dl-*) ──
  function injectStyle() {
    if (document.getElementById('kal-style')) return;
    var s = document.createElement('style'); s.id = 'kal-style';
    s.textContent = [
      '#kal-root{--kp:var(--c-pri,#1e463a);--kb:var(--c-border,#e6e4de);--ks:var(--c-surf,#fff);--km:var(--c-sec,#6b7280);--kt:var(--c-text,#1f2521)}',
      '#kal-root button{font-family:inherit}',
      '.kal-toolbar{display:flex;align-items:center;gap:8px;margin-bottom:12px;flex-wrap:wrap}',
      '.kal-nav{width:40px;height:40px;border:1.5px solid var(--kb);background:var(--ks);border-radius:12px;font-size:20px;cursor:pointer;color:var(--kp)}',
      '.kal-week{font-weight:700;font-size:15px;min-width:150px;color:var(--kt)}.kal-week small{display:block;font-weight:400;color:var(--km);font-size:12px}',
      '.kal-today{margin-left:auto;padding:9px 16px;border:1.5px solid var(--kp);background:var(--ks);color:var(--kp);border-radius:12px;font-weight:700;font-size:13px;cursor:pointer}',
      '.kal-days{display:flex;gap:6px;margin-bottom:14px;overflow-x:auto;padding-bottom:4px}',
      '.kal-day{flex:1;min-width:60px;padding:8px 6px;border:1.5px solid var(--kb);background:var(--ks);border-radius:10px;text-align:center;cursor:pointer;color:var(--kt)}',
      '.kal-day.active{background:var(--kp);color:#fff;border-color:var(--kp)}',
      '.kal-day .dow{display:block;font-size:11px;font-weight:700;text-transform:uppercase}.kal-day .dnum{display:block;font-size:20px;font-weight:800;line-height:1.1}',
      '.kal-day .dot{display:block;width:6px;height:6px;border-radius:50%;background:#b91c1c;margin:3px auto 0}.kal-day.active .dot{background:#fff}',
      '.kal-day.today{border-color:#b91c1c}.kal-day.today .dnum{color:#b91c1c}.kal-day.today.active .dnum{color:#fff}',
      '.kal-filters{display:flex;gap:6px;margin-bottom:14px;flex-wrap:wrap}',
      '.kal-chip{padding:6px 12px;border:1.5px solid var(--kb);border-radius:20px;background:var(--ks);font-size:13px;font-weight:600;cursor:pointer;display:inline-flex;align-items:center;gap:5px;color:var(--kt)}',
      '.kal-chip.active{border-color:var(--kp);background:var(--c-pri-l,#f0f4f1);color:var(--kp)}.kal-chip .k{width:10px;height:10px;border-radius:3px}',
      '.kal-new{margin-left:8px;padding:9px 16px;border:none;background:var(--kp);color:#fff;border-radius:12px;font-weight:700;font-size:13px;cursor:pointer;white-space:nowrap}',
      '.kal-toggle{display:inline-flex;border:1.5px solid var(--kb);border-radius:12px;overflow:hidden}',
      '.kal-toggle button{border:none;background:var(--ks);padding:9px 14px;font-size:13px;font-weight:700;cursor:pointer;color:var(--km)}.kal-toggle button.on{background:var(--kp);color:#fff}',
      '.kal-add{background:var(--kp);color:#fff;border:none;border-radius:12px;padding:10px 20px;font-weight:700;font-size:14px;cursor:pointer}',
      '.kal-modal[hidden]{display:none}.kal-modal{position:fixed;inset:0;z-index:100000;display:flex;align-items:center;justify-content:center;padding:16px;background:rgba(0,0,0,.5);-webkit-backdrop-filter:blur(2px);backdrop-filter:blur(2px)}',
      '.kal-modal-card{background:var(--ks);color:var(--kt);width:100%;max-width:420px;max-height:90vh;overflow-y:auto;border:1px solid var(--kb);border-radius:16px;box-shadow:0 20px 48px rgba(0,0,0,.28);padding:18px 20px}',
      '.kal-modal-head{display:flex;align-items:center;justify-content:space-between;font-size:17px;font-weight:800;color:var(--kp);margin-bottom:12px}',
      '.kal-modal-x{border:none;background:transparent;font-size:24px;line-height:1;cursor:pointer;color:var(--km);width:32px;height:32px;border-radius:8px}',
      '.kal-fld{display:block;margin-bottom:12px}.kal-fld>span{display:block;font-size:12px;font-weight:700;color:var(--km);margin-bottom:5px}',
      '.kal-fld input[type=text],.kal-fld select{width:100%;border:1.5px solid var(--kb);border-radius:10px;padding:10px 12px;font-size:14px;background:var(--ks);color:var(--kt);font-family:inherit;box-sizing:border-box}',
      '.kal-modal-time{display:flex;gap:8px;align-items:center;flex-wrap:wrap}',
      '.kal-modal-time input[type=time]{border:1.5px solid var(--kb);border-radius:10px;padding:9px 10px;font-size:14px;background:var(--ks);color:var(--kt)}',
      '.kal-modal-foot{display:flex;gap:8px;justify-content:flex-end;margin-top:16px}',
      '.kal-btn-ghost{padding:10px 16px;border:1.5px solid var(--kb);background:transparent;color:var(--kt);border-radius:12px;font-weight:700;font-size:14px;cursor:pointer}',
      '.kal-sec{font-size:12px;font-weight:800;text-transform:uppercase;letter-spacing:.6px;color:var(--km);margin:16px 2px 8px}.kal-sec span{background:var(--kb);border-radius:20px;padding:1px 9px;font-size:11px}',
      '.kal-dayhead{font-size:16px;font-weight:800;color:var(--kp);margin:2px 2px 10px;text-transform:capitalize}',
      '.kal-datum{font-size:12px;font-weight:700;color:var(--km);margin-right:2px;white-space:nowrap}',
      '.kal-entry{background:var(--ks);border-radius:14px;box-shadow:0 2px 8px rgba(0,0,0,.05);margin-bottom:8px;overflow:hidden;border-left:5px solid var(--km);display:flex;align-items:stretch}',
      '.kal-entry.cat-aufgabe{border-left-color:var(--kp)}.kal-entry.cat-reservierung{border-left-color:#1d4ed8}.kal-entry.cat-vorbestellung{border-left-color:#e65100}.kal-entry.cat-lieferung{border-left-color:#6d28d9}',
      '.kal-entry .check{width:52px;display:flex;align-items:center;justify-content:center;cursor:pointer;border-right:1px solid var(--kb)}',
      '.kal-entry .check .box{width:26px;height:26px;border:2px solid var(--km);border-radius:8px;display:flex;align-items:center;justify-content:center;font-size:16px;color:transparent}',
      '.kal-entry .check:hover .box{border-color:#2e7d4f}',
      '.kal-entry .body{flex:1;padding:11px 14px;min-width:0}.kal-entry .top{display:flex;align-items:center;gap:8px}',
      '.kal-entry .time{font-weight:800;font-size:15px;color:var(--kp)}.kal-entry .time.allday{color:var(--km);font-size:12px;font-weight:700;text-transform:uppercase}',
      '.kal-entry .title{font-weight:700;font-size:15px;flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:var(--kt)}',
      '.kal-entry .badges{display:flex;gap:5px;flex-wrap:wrap;margin-top:4px}',
      '.kal-entry .badge{font-size:11px;font-weight:700;padding:2px 8px;border-radius:20px}',
      '.kal-entry .badge.cat{color:#fff}.cat-aufgabe .badge.cat{background:var(--kp)}.cat-reservierung .badge.cat{background:#1d4ed8}.cat-vorbestellung .badge.cat{background:#e65100}.cat-lieferung .badge.cat{background:#6d28d9}',
      '.kal-entry .badge.kunde{background:#dcfce7;color:#2e7d4f}.kal-entry .badge.recur{background:#f3e8ff;color:#6d28d9}',
      '.kal-entry .note{font-size:13px;color:var(--km);margin-top:3px}',
      '.kal-entry .acts{display:flex;align-items:center;padding:0 8px}.kal-entry .ic{width:32px;height:32px;border:none;background:transparent;border-radius:8px;cursor:pointer;color:var(--km);display:flex;align-items:center;justify-content:center}',
      '.kal-entry.done{opacity:.62}.kal-entry.done .title{text-decoration:line-through;color:var(--km)}.kal-entry.done .time{color:var(--km)}',
      '.kal-entry.done .check .box{background:#2e7d4f;border-color:#2e7d4f;color:#fff}',
      '.kal-empty{text-align:center;color:var(--km);padding:30px;font-size:14px;border:1.5px dashed var(--kb);border-radius:14px}',
      '.kal-toast{position:fixed;left:50%;bottom:24px;transform:translate(-50%,20px);background:var(--kp);color:#fff;padding:11px 20px;border-radius:12px;font-weight:600;font-size:14px;box-shadow:0 8px 24px rgba(0,0,0,.2);opacity:0;transition:.3s;z-index:99999}',
      '.kal-toast.show{opacity:1;transform:translate(-50%,0)}.kal-toast.err{background:#b91c1c}'
    ].join('\n');
    document.head.appendChild(s);
  }
})();
