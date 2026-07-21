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

  // Vorlagen für häufige (wiederkehrende) Aufgaben. Die Liste wird im Dialog um
  // die tatsächlich vorhandenen wiederkehrenden Einträge ergänzt (selbstlernend).
  var BUILTIN_TEMPLATES = [
    { name: '🥖 Bäcker-Bestellung', titel: 'Bestellung bei Bäcker', kategorie: 'aufgabe', allday: true, recur: 'weekdays', weekdays: [1, 2, 3, 4, 5, 6] },
    { name: '💶 Kasse abrechnen', titel: 'Kasse abrechnen', kategorie: 'aufgabe', allday: true, recur: 'daily', weekdays: [] },
    { name: '🧽 Kühltheke reinigen', titel: 'Kühltheke reinigen', kategorie: 'aufgabe', allday: true, recur: 'weekly', weekdays: [] },
    { name: '📦 Wochenware bestellen', titel: 'Wochenware bestellen', kategorie: 'aufgabe', allday: true, recur: 'weekly', weekdays: [] },
    { name: '🥬 Gemüselieferung', titel: 'Gemüselieferung annehmen', kategorie: 'lieferung', allday: false, uhrzeit: '08:00', recur: 'weekly', weekdays: [] },
    { name: '🥩 Metzger-Bestellung', titel: 'Metzger-Bestellung aufgeben', kategorie: 'vorbestellung', allday: true, recur: 'weekly', weekdays: [] }
  ];
  var dialogTemplates = [];  // aktuelle Vorlagenliste im offenen Dialog

  var state = {
    weekOffset: 0,
    selected: null,     // ISO date string
    filter: 'all',
    showDone: false,
    allday: true,
    entries: [],
    built: false,
    pollTimer: null,
    kundenMap: {},      // name(lower) → id
    newCat: 'aufgabe',  // Dialog: gewählte Kategorie
    newRecur: '',       // Dialog: gewählte Wiederholung
    newWeekdays: []     // Dialog: gewählte ISO-Wochentage (1=Mo … 7=So)
  };

  // ── Datums-Helfer ──
  function pad(n) { return (n < 10 ? '0' : '') + n; }
  function iso(d) { return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); }
  function todayIso() { return iso(new Date()); }
  function nowHM() { var n = new Date(); return pad(n.getHours()) + ':' + pad(n.getMinutes()); }
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
          '<div class="kal-fld"><span>Vorlage wählen (optional)</span>' +
            '<div class="kal-pills kal-tpls" id="kal-tpls"></div></div>' +
          '<label class="kal-fld"><span>Was ist zu tun / reserviert?</span>' +
            '<textarea id="kal-title" rows="1" placeholder="z. B. „Brotbestellung Fam. Huber abholbereit“…"></textarea></label>' +
          '<div class="kal-fld"><span>Zeitpunkt</span>' +
            '<div class="kal-modal-time">' +
              '<div class="kal-toggle"><button type="button" class="on" data-ad="1">Ganztags</button><button type="button" data-ad="0">Uhrzeit</button></div>' +
              '<span class="kal-timebox" id="kal-timebox" style="display:none">' +
                '<input type="text" id="kal-time" inputmode="numeric" maxlength="5" value="09:00" placeholder="HH:MM" class="kal-time-txt" aria-label="Uhrzeit (24 Stunden)">' +
                '<b class="kal-time-uhr">Uhr</b>' +
              '</span>' +
            '</div></div>' +
          '<div class="kal-fld"><span>Kategorie</span>' +
            '<div class="kal-pills" id="kal-catpills">' +
              '<button type="button" class="kal-pill active" data-newcat="aufgabe"><span class="kd" style="background:var(--kp)"></span>Aufgabe</button>' +
              '<button type="button" class="kal-pill" data-newcat="reservierung"><span class="kd" style="background:#1d4ed8"></span>Reservierung</button>' +
              '<button type="button" class="kal-pill" data-newcat="vorbestellung"><span class="kd" style="background:#e65100"></span>Vorbestellung</button>' +
              '<button type="button" class="kal-pill" data-newcat="lieferung"><span class="kd" style="background:#6d28d9"></span>Lieferung</button>' +
            '</div></div>' +
          '<div class="kal-fld kal-kunde-wrap"><span>Kunde (optional)</span>' +
            '<input type="text" id="kal-kunde" placeholder="🔗 Name eingeben…" autocomplete="off">' +
            '<div class="kal-kunde-dd" id="kal-kunde-dd" hidden></div></div>' +
          '<div class="kal-fld"><span>Wiederholung</span>' +
            '<div class="kal-pills" id="kal-recurpills">' +
              '<button type="button" class="kal-pill active" data-newrecur="">Einmalig</button>' +
              '<button type="button" class="kal-pill" data-newrecur="daily">Täglich</button>' +
              '<button type="button" class="kal-pill" data-newrecur="weekly">Wöchentlich</button>' +
              '<button type="button" class="kal-pill" data-newrecur="biweekly">14-tägig</button>' +
              '<button type="button" class="kal-pill" data-newrecur="monthly">Monatlich</button>' +
              '<button type="button" class="kal-pill" data-newrecur="weekdays">Wochentage</button>' +
            '</div>' +
            '<div class="kal-weekdays" id="kal-weekdays" hidden>' +
              DOW.map(function (n, i) { return '<button type="button" class="kal-wd" data-wd="' + (i + 1) + '">' + n + '</button>'; }).join('') +
              '<div class="kal-wd-hint">Serie an den gewählten Wochentagen</div>' +
            '</div></div>' +
          '<div class="kal-modal-foot">' +
            '<button class="kal-btn-ghost" data-act="closedialog">Abbrechen</button>' +
            '<button class="kal-add" data-act="add">Speichern</button>' +
          '</div>' +
        '</div>' +
      '</div>';

    // Events (delegiert)
    root.addEventListener('click', onClick);
    var title = document.getElementById('kal-title');
    // Strg/Cmd+Enter speichert; Enter erzeugt eine neue Zeile (mehrzeiliger Text).
    title.addEventListener('keydown', function (e) { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) { e.preventDefault(); addEntry(); } });
    title.addEventListener('input', autoGrow);
    var timeEl = document.getElementById('kal-time');
    timeEl.addEventListener('input', function () { timeEl.value = fmtTimeInput(timeEl.value); });
    var kunde = document.getElementById('kal-kunde');
    var kt = null;
    kunde.addEventListener('input', function () {
      clearTimeout(kt); kt = setTimeout(function () { searchKunden(kunde.value); }, 250);
    });
    kunde.addEventListener('blur', function () { setTimeout(hideKundeDd, 150); });
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
    var b = e.target.closest('[data-act],[data-cat],[data-ad],[data-newcat],[data-newrecur],[data-wd],[data-kunde],[data-tpl]');
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
    else if (b.dataset.newcat !== undefined) { setCat(b.dataset.newcat); }
    else if (b.dataset.newrecur !== undefined) { setRecur(b.dataset.newrecur); }
    else if (b.dataset.wd !== undefined) { toggleWeekday(parseInt(b.dataset.wd, 10), b); }
    else if (b.dataset.kunde !== undefined) { setKunde(b.dataset.kunde, b.dataset.kid); }
    else if (b.dataset.tpl !== undefined) { applyTemplate(dialogTemplates[parseInt(b.dataset.tpl, 10)], b); }
  }

  // Vorlagenliste = Standard-Vorlagen + tatsächlich vorhandene wiederkehrende Aufgaben.
  function collectTemplates() {
    var list = BUILTIN_TEMPLATES.slice();
    var seen = {};
    list.forEach(function (t) { seen[(t.titel || '').toLowerCase()] = true; });
    (state.entries || []).forEach(function (e) {
      if (!e.wiederholung) return;
      var key = (e.titel || '').toLowerCase();
      if (!key || seen[key]) return;
      seen[key] = true;
      list.push({
        name: e.titel, titel: e.titel, kategorie: e.kategorie,
        allday: !!e.ganztags, uhrzeit: e.uhrzeit, recur: e.wiederholung,
        weekdays: String(e.wochentage || '').split('').filter(function (c) { return c >= '1' && c <= '7'; }).map(function (c) { return parseInt(c, 10); })
      });
    });
    return list;
  }
  function renderTemplates() {
    var wrap = document.getElementById('kal-tpls');
    if (!wrap) return;
    dialogTemplates = collectTemplates();
    wrap.innerHTML = dialogTemplates.map(function (t, i) {
      return '<button type="button" class="kal-pill kal-tpl" data-tpl="' + i + '">' + esc(t.name) + '</button>';
    }).join('');
  }
  function applyTemplate(t, btn) {
    if (!t) return;
    document.querySelectorAll('#kal-tpls .kal-tpl').forEach(function (p) { p.classList.toggle('active', p === btn); });
    document.getElementById('kal-title').value = t.titel || '';
    autoGrow();
    setCat(t.kategorie || 'aufgabe');
    var allday = t.allday !== false;
    setAllday(allday);
    if (!allday) document.getElementById('kal-time').value = t.uhrzeit || '09:00';
    setRecur(t.recur || '');
    state.newWeekdays = (t.weekdays || []).slice();
    document.querySelectorAll('#kal-weekdays .kal-wd').forEach(function (w) {
      w.classList.toggle('active', state.newWeekdays.indexOf(parseInt(w.dataset.wd, 10)) !== -1);
    });
  }

  function setCat(cat) {
    state.newCat = cat;
    document.querySelectorAll('#kal-catpills .kal-pill').forEach(function (p) {
      p.classList.toggle('active', p.dataset.newcat === cat);
    });
  }
  function setRecur(rec) {
    state.newRecur = rec;
    document.querySelectorAll('#kal-recurpills .kal-pill').forEach(function (p) {
      p.classList.toggle('active', p.dataset.newrecur === rec);
    });
    var wd = document.getElementById('kal-weekdays');
    if (wd) wd.hidden = (rec !== 'weekdays');
  }
  function toggleWeekday(day, btn) {
    var i = state.newWeekdays.indexOf(day);
    if (i === -1) state.newWeekdays.push(day); else state.newWeekdays.splice(i, 1);
    if (btn) btn.classList.toggle('active', state.newWeekdays.indexOf(day) !== -1);
  }
  function setKunde(name, id) {
    var inp = document.getElementById('kal-kunde');
    if (inp) inp.value = name;
    if (name && id) state.kundenMap[name.toLowerCase()] = id;
    hideKundeDd();
  }
  function hideKundeDd() {
    var dd = document.getElementById('kal-kunde-dd');
    if (dd) { dd.hidden = true; dd.innerHTML = ''; }
  }
  function autoGrow() {
    var t = document.getElementById('kal-title');
    if (!t) return;
    t.style.height = 'auto';
    t.style.height = Math.min(t.scrollHeight, 200) + 'px';
  }
  // 24h-Zeit: Live-Formatierung „HHMM“ → „HH:MM“ (geräteunabhängig, kein AM/PM).
  function fmtTimeInput(v) {
    var d = String(v || '').replace(/\D/g, '').slice(0, 4);
    return d.length <= 2 ? d : d.slice(0, 2) + ':' + d.slice(2);
  }
  // Normalisiert auf gültige „HH:MM“ (24h) oder '' wenn ungültig.
  function normTime(v) {
    var d = String(v || '').replace(/\D/g, '');
    if (d.length === 3) d = '0' + d;
    if (d.length !== 4) return '';
    var h = parseInt(d.slice(0, 2), 10), m = parseInt(d.slice(2), 10);
    if (h > 23 || m > 59) return '';
    return pad(h) + ':' + pad(m);
  }

  function openDialog() {
    var m = document.getElementById('kal-modal'); if (!m) return;
    // Felder zurücksetzen; Standard = Ganztags, Kategorie Aufgabe, Einmalig
    document.getElementById('kal-title').value = '';
    document.getElementById('kal-kunde').value = '';
    document.getElementById('kal-time').value = '09:00';
    autoGrow();
    state.newWeekdays = [];
    document.querySelectorAll('#kal-weekdays .kal-wd').forEach(function (w) { w.classList.remove('active'); });
    renderTemplates();
    hideKundeDd();
    setCat('aufgabe');
    setRecur('');
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
    var box = document.getElementById('kal-timebox');
    if (box) box.style.display = v ? 'none' : '';
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
      .then(function (d) { state.entries = (d && d.data) || []; renderDays(); renderList(); updateBadgeFromEntries(); })
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
    if (timed.length) html += section('Mit Uhrzeit', timed.length) + '<div class="kal-timeline">' + timed.map(timelineRowHtml).join('') + '</div>';
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
  function _checkKey(e) { return e.wiederholung ? (e._serien_id || e.id) : e.id; }
  function _checkHtml(e) {
    return '<div class="check" data-check="' + esc(_checkKey(e)) + '" data-datum="' + esc(e.datum) + '" title="Als erledigt markieren"><span class="box">✓</span></div>';
  }
  function _badgesHtml(e) {
    var kunde = (e.kunde_id || e.kunde_freitext)
      ? '<span class="badge kunde">🔗 ' + esc(e.kunde_freitext || e.kunde_id) + '</span>' : '';
    var recur = e.wiederholung ? '<span class="badge recur">↻ ' + esc(recurLabel(e)) + '</span>' : '';
    var over = isOverdue(e) ? '<span class="badge overdue">‼️ überfällig</span>' : '';
    return '<div class="badges"><span class="badge cat">' + esc(CATS[e.kategorie] || e.kategorie) + '</span>' + recur + kunde + over + '</div>';
  }
  function fmtWeekdays(digits) {
    return String(digits || '').split('').filter(function (c) { return c >= '1' && c <= '7'; })
      .map(function (c) { return DOW[parseInt(c, 10) - 1]; }).join(', ');
  }
  function recurLabel(e) {
    if (e.wiederholung === 'weekdays') return fmtWeekdays(e.wochentage);
    return RECUR[e.wiederholung] || e.wiederholung;
  }
  function isOverdue(e) {
    return !e.ganztags && e.status !== 'erledigt' &&
      (e.datum || '').slice(0, 10) === todayIso() && String(e.uhrzeit || '') < nowHM();
  }
  function _notesHtml(e) {
    var note = e.notiz ? '<div class="note">' + esc(e.notiz) + '</div>' : '';
    var erledigt = (e.status === 'erledigt' && e.erledigt_am)
      ? '<div class="note">Erledigt am ' + esc(fmtErledigt(e.erledigt_am)) + '</div>' : '';
    return note + erledigt;
  }
  function _actsHtml(e) {
    return '<div class="acts"><button class="ic" data-del="' + esc(_checkKey(e)) + '" data-del-serie="' + (e.wiederholung ? '1' : '') + '" data-del-datum="' + esc(e.datum) + '" title="Löschen"><i data-lucide="trash-2" style="width:15px;height:15px"></i></button></div>';
  }

  // Ganztägige Einträge: normale Karte mit Datum-Label.
  function entryHtml(e) {
    var done = e.status === 'erledigt';
    var datum = '<span class="kal-datum">' + esc(deShort(e.datum)) + '</span>';
    return '<div class="kal-entry cat-' + esc(e.kategorie) + (done ? ' done' : '') + '">' +
      _checkHtml(e) +
      '<div class="body"><div class="top">' + datum + '<span class="time allday">Ganztägig</span><span class="title">' + esc(e.titel) + '</span></div>' +
      _badgesHtml(e) + _notesHtml(e) + '</div>' +
      _actsHtml(e) +
      '</div>';
  }

  // Terminierte Einträge: Zeile einer vertikalen Timeline (Uhrzeit links auf der Leiste).
  function timelineRowHtml(e) {
    var done = e.status === 'erledigt';
    var over = !done && isOverdue(e);
    return '<div class="kal-tl-row' + (done ? ' done' : '') + (over ? ' overdue' : '') + '">' +
      '<div class="kal-tl-time">' + esc(e.uhrzeit) + '<small>Uhr</small></div>' +
      '<div class="kal-tl-rail"><span class="kal-tl-dot cat-' + esc(e.kategorie) + '"></span></div>' +
      '<div class="kal-entry cat-' + esc(e.kategorie) + (done ? ' done' : '') + (over ? ' overdue' : '') + ' kal-tl-card">' +
        _checkHtml(e) +
        '<div class="body"><div class="top"><span class="title">' + esc(e.titel) + '</span></div>' +
        _badgesHtml(e) + _notesHtml(e) + '</div>' +
        _actsHtml(e) +
      '</div>' +
    '</div>';
  }

  // ── Aktionen ──
  function addEntry() {
    var title = document.getElementById('kal-title');
    var t = title.value.trim();
    if (!t) { title.focus(); return; }
    var timeEl = document.getElementById('kal-time');
    var uhr = normTime(timeEl.value);
    if (!state.allday && !uhr) { toast('Bitte eine gültige Uhrzeit als HH:MM eingeben (z. B. 14:30).', 'err'); return; }
    if (state.newRecur === 'weekdays' && !state.newWeekdays.length) {
      toast('Bitte mindestens einen Wochentag wählen.', 'err'); return;
    }
    var kundeVal = document.getElementById('kal-kunde').value.trim();
    var kundeId = state.kundenMap[kundeVal.toLowerCase()] || '';
    var wochentage = state.newRecur === 'weekdays'
      ? state.newWeekdays.slice().sort().join('') : '';
    var body = {
      titel: t, datum: state.selected, ganztags: state.allday,
      uhrzeit: state.allday ? '' : uhr,
      kategorie: state.newCat,
      wiederholung: state.newRecur,
      wochentage: wochentage,
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
        title.value = ''; document.getElementById('kal-kunde').value = '';
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
    var dd = document.getElementById('kal-kunde-dd');
    if (q.length < 2) { if (dd) { dd.hidden = true; dd.innerHTML = ''; } return; }
    fetch((window.API_BASE || '') + '/api/stammkunden?q=' + encodeURIComponent(q), { headers: { 'Accept': 'application/json' } })
      .then(function (r) { return r.json(); })
      .then(function (d) {
        if (!dd) return;
        var cs = ((d && d.customers) || []).slice(0, 8);
        cs.forEach(function (c) { if (c.name) state.kundenMap[c.name.toLowerCase()] = c.id; });
        // Exakt getippter Name → Liste nicht (mehr) aufdrängen
        var exact = cs.some(function (c) { return (c.name || '').toLowerCase() === q.toLowerCase(); });
        if (!cs.length || exact) { dd.hidden = true; dd.innerHTML = ''; return; }
        dd.innerHTML = cs.map(function (c) {
          return '<button type="button" class="kal-kunde-item" data-kunde="' + esc(c.name) + '" data-kid="' + esc(c.id) + '">🔗 ' + esc(c.name) + '</button>';
        }).join('');
        dd.hidden = false;
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

  // Filter-Chips an den State angleichen (build() läuft nur einmal).
  function syncFilterUI() {
    document.querySelectorAll('#kal-filters .kal-chip[data-cat]').forEach(function (c) {
      c.classList.toggle('active', c.dataset.cat === state.filter);
    });
    var dc = document.querySelector('.kal-donechip');
    if (dc) {
      dc.classList.toggle('active', state.showDone);
      dc.textContent = state.showDone ? '✓ Erledigte ausblenden' : '✓ Erledigte zeigen';
    }
  }

  // ── Tab-Badge: heute offen + (blinkend) überfällig ──
  function countToday(entries) {
    var t = todayIso(), hm = nowHM(), open = 0, overdue = 0;
    (entries || []).forEach(function (e) {
      if ((e.datum || '').slice(0, 10) !== t || e.status === 'erledigt') return;
      open++;
      if (!e.ganztags && String(e.uhrzeit || '') < hm) overdue++;
    });
    return { open: open, overdue: overdue };
  }
  function updateBadge(c) {
    var wrap = document.getElementById('badges-kalender');
    if (!wrap) return;
    var h = '';
    if (c.open > 0) h += '<span class="k-tab-badge show badge-neu" title="' + c.open + ' heute offen">' + c.open + '</span>';
    if (c.overdue > 0) h += '<span class="k-tab-badge show badge-overdue blink" title="' + c.overdue + ' überfällig (Zeit verstrichen)">' + c.overdue + '</span>';
    wrap.innerHTML = h;
  }
  function updateBadgeFromEntries() {
    if (weekDates().map(iso).indexOf(todayIso()) === -1) return; // heute nicht im View
    updateBadge(countToday(state.entries));
  }
  function fetchTodayBadge() {
    var t = todayIso();
    fetch(apiBase() + '?von=' + t + '&bis=' + t, { headers: { 'Accept': 'application/json' } })
      .then(function (r) { return r.ok ? r.json() : { data: [] }; })
      .then(function (d) { updateBadge(countToday((d && d.data) || [])); })
      .catch(function () {});
  }

  // ── Öffentliche API (von switchTab aufgerufen) ──
  window.KalenderKiosk = {
    onShow: function () {
      // Klick auf Tab/Badge → heute + offene anzeigen
      state.weekOffset = 0;
      state.selected = todayIso();
      state.filter = 'all';
      state.showDone = false;
      build(); syncFilterUI(); load(); startPoll();
    },
    reload: load
  };

  // Badge beim Laden der Kiosk-Seite füllen (auch ohne Tab-Besuch) + periodisch.
  fetchTodayBadge();
  setInterval(fetchTodayBadge, 120000);

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
      '.kal-fld input[type=text],.kal-fld select,.kal-fld textarea{width:100%;border:1.5px solid var(--kb);border-radius:10px;padding:10px 12px;font-size:14px;background:var(--ks);color:var(--kt);font-family:inherit;box-sizing:border-box}',
      '.kal-fld textarea{resize:vertical;min-height:44px;line-height:1.4;overflow:hidden}',
      '.kal-modal-time{display:flex;gap:8px;align-items:center;flex-wrap:wrap}',
      '.kal-modal-time input[type=time]{border:1.5px solid var(--kb);border-radius:10px;padding:9px 10px;font-size:14px;background:var(--ks);color:var(--kt)}',
      '.kal-timebox{display:inline-flex;align-items:center;gap:6px}',
      '.kal-time-txt{width:78px;border:1.5px solid var(--kb);border-radius:10px;padding:9px 10px;font-size:16px;font-weight:700;text-align:center;letter-spacing:1px;font-variant-numeric:tabular-nums;background:var(--ks);color:var(--kt);font-family:inherit}',
      '.kal-time-txt:focus{outline:none;border-color:var(--kp)}',
      '.kal-time-uhr{font-size:13px;font-weight:700;color:var(--km)}',
      '.kal-modal-foot{display:flex;gap:8px;justify-content:flex-end;margin-top:16px}',
      '.kal-btn-ghost{padding:10px 16px;border:1.5px solid var(--kb);background:transparent;color:var(--kt);border-radius:12px;font-weight:700;font-size:14px;cursor:pointer}',
      '.kal-pills{display:flex;flex-wrap:wrap;gap:6px}',
      '.kal-pill{padding:8px 12px;border:1.5px solid var(--kb);border-radius:20px;background:var(--ks);font-size:13px;font-weight:700;cursor:pointer;color:var(--kt);display:inline-flex;align-items:center;gap:6px}',
      '.kal-pill.active{border-color:var(--kp);background:var(--c-pri-l,#f0f4f1);color:var(--kp)}.kal-pill .kd{width:9px;height:9px;border-radius:3px}',
      '.kal-tpls{max-height:108px;overflow-y:auto}',
      '.kal-tpl.active{background:var(--kp);color:#fff;border-color:var(--kp)}',
      '.kal-weekdays{display:flex;gap:5px;margin-top:8px;flex-wrap:wrap;align-items:center}',
      '.kal-wd{width:42px;padding:8px 0;border:1.5px solid var(--kb);border-radius:10px;background:var(--ks);font-weight:700;font-size:13px;cursor:pointer;color:var(--kt);text-align:center}',
      '.kal-wd.active{background:var(--kp);color:#fff;border-color:var(--kp)}',
      '.kal-wd-hint{flex-basis:100%;font-size:11px;color:var(--km);margin-top:2px}',
      '.kal-kunde-wrap{position:relative}',
      '.kal-kunde-dd{position:absolute;left:0;right:0;top:100%;z-index:5;background:var(--ks);border:1.5px solid var(--kb);border-radius:10px;box-shadow:0 8px 24px rgba(0,0,0,.18);max-height:184px;overflow-y:auto;margin-top:4px}',
      '.kal-kunde-item{display:block;width:100%;text-align:left;padding:10px 12px;border:none;background:transparent;cursor:pointer;font-size:14px;color:var(--kt);border-bottom:1px solid var(--kb)}',
      '.kal-kunde-item:last-child{border-bottom:none}.kal-kunde-item:hover{background:var(--c-pri-l,#f0f4f1);color:var(--kp)}',
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
      '.kal-entry .title{font-weight:700;font-size:15px;flex:1;min-width:0;color:var(--kt);white-space:pre-wrap;overflow-wrap:anywhere;line-height:1.35}',
      '.kal-entry .top{align-items:flex-start!important}',
      '.kal-entry .badges{display:flex;gap:5px;flex-wrap:wrap;margin-top:4px}',
      '.kal-entry .badge{font-size:11px;font-weight:700;padding:2px 8px;border-radius:20px}',
      '.kal-entry .badge.cat{color:#fff}.cat-aufgabe .badge.cat{background:var(--kp)}.cat-reservierung .badge.cat{background:#1d4ed8}.cat-vorbestellung .badge.cat{background:#e65100}.cat-lieferung .badge.cat{background:#6d28d9}',
      '.kal-entry .badge.kunde{background:#dcfce7;color:#2e7d4f}.kal-entry .badge.recur{background:#f3e8ff;color:#6d28d9}',
      '.kal-entry .badge.overdue{background:#fee2e2;color:#b91c1c}',
      '.kal-entry .note{font-size:13px;color:var(--km);margin-top:3px}',
      '.kal-entry .acts{display:flex;align-items:center;padding:0 8px}.kal-entry .ic{width:32px;height:32px;border:none;background:transparent;border-radius:8px;cursor:pointer;color:var(--km);display:flex;align-items:center;justify-content:center}',
      '.kal-entry.done{opacity:.62}.kal-entry.done .title{text-decoration:line-through;color:var(--km)}.kal-entry.done .time{color:var(--km)}',
      '.kal-entry.done .check .box{background:#2e7d4f;border-color:#2e7d4f;color:#fff}',
      '.kal-timeline{position:relative;margin-top:2px}',
      '.kal-tl-row{display:flex;align-items:stretch;gap:8px}',
      '.kal-tl-time{width:50px;flex-shrink:0;text-align:right;font-weight:800;font-size:14px;color:var(--kp);padding-top:12px;font-variant-numeric:tabular-nums;line-height:1.1}',
      '.kal-tl-time small{display:block;font-size:10px;font-weight:600;color:var(--km)}',
      '.kal-tl-rail{position:relative;width:14px;flex-shrink:0;display:flex;justify-content:center}',
      '.kal-tl-rail::before{content:"";position:absolute;top:0;bottom:0;left:50%;transform:translateX(-50%);width:2px;background:var(--kb)}',
      '.kal-tl-row:first-child .kal-tl-rail::before{top:15px}.kal-tl-row:last-child .kal-tl-rail::before{bottom:calc(100% - 27px)}',
      '.kal-tl-dot{position:relative;z-index:1;width:12px;height:12px;border-radius:50%;background:var(--kp);margin-top:15px;border:2px solid var(--ks);box-shadow:0 0 0 1px var(--kb)}',
      '.kal-tl-dot.cat-reservierung{background:#1d4ed8}.kal-tl-dot.cat-vorbestellung{background:#e65100}.kal-tl-dot.cat-lieferung{background:#6d28d9}',
      '.kal-tl-card{flex:1;min-width:0;margin-bottom:8px}',
      '.kal-tl-row.done .kal-tl-time{color:var(--km)}.kal-tl-row.done .kal-tl-dot{background:#9ca3af}',
      '.kal-tl-row.overdue .kal-tl-time{color:#b91c1c}',
      '.kal-tl-row.overdue .kal-tl-dot{background:#b91c1c;animation:kalPulse 1.2s ease-in-out infinite}',
      '.kal-entry.overdue{border-left-color:#b91c1c!important;background:#fff6f6}',
      '@keyframes kalPulse{0%,100%{transform:scale(1);opacity:1}50%{transform:scale(1.35);opacity:.5}}',
      '.kal-empty{text-align:center;color:var(--km);padding:30px;font-size:14px;border:1.5px dashed var(--kb);border-radius:14px}',
      '.kal-toast{position:fixed;left:50%;bottom:24px;transform:translate(-50%,20px);background:var(--kp);color:#fff;padding:11px 20px;border-radius:12px;font-weight:600;font-size:14px;box-shadow:0 8px 24px rgba(0,0,0,.2);opacity:0;transition:.3s;z-index:99999}',
      '.kal-toast.show{opacity:1;transform:translate(-50%,0)}.kal-toast.err{background:#b91c1c}'
    ].join('\n');
    document.head.appendChild(s);
  }
})();
