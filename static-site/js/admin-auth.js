// admin-auth.js — Admin-/CMS-Auth (SEC-2)
//
// 1) fetch-Wrapper: hängt `X-CMS-Auth` an mutierende /api/-Requests.
// 2) dlAdminLogin(password): holt das Token via /api/cms-auth.
// 3) 401-Fallback: fragt einmalig nach dem Passwort und wiederholt den Request.
(function () {
  var TOKEN_KEY = 'cms_auth_token';
  var MUT = ['POST', 'PUT', 'PATCH', 'DELETE'];

  function getToken() {
    try { return sessionStorage.getItem(TOKEN_KEY) || ''; } catch (e) { return ''; }
  }
  function setToken(t) {
    try { sessionStorage.setItem(TOKEN_KEY, t); } catch (e) {}
  }
  function headersToObj(h) {
    if (!h) return {};
    if (typeof Headers !== 'undefined' && h instanceof Headers) {
      var o = {}; h.forEach(function (v, k) { o[k] = v; }); return o;
    }
    return h;
  }

  window.dlAdminLogin = function (password) {
    return fetch('/api/cms-auth', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password: password }),
    }).then(function (r) {
      if (!r.ok) throw new Error('login failed');
      return r.json();
    }).then(function (d) {
      if (d && d.token) { setToken(d.token); return d.token; }
      throw new Error('no token');
    });
  };
  window.dlHasAdminToken = function () { return !!getToken(); };

  // Gestylter Passwort-Dialog (ersetzt window.prompt) – theme-fähig via --dl-* Tokens.
  var _pwDialog = null;
  function dlAdminPassword(errMsg) {
    if (_pwDialog) return _pwDialog; // Singleton: gleichzeitige 401 teilen sich einen Dialog.
    _pwDialog = new Promise(function (resolve) {
      var ov = document.createElement('div');
      ov.setAttribute('role', 'dialog');
      ov.setAttribute('aria-modal', 'true');
      ov.style.cssText = 'position:fixed;inset:0;z-index:2147483000;display:flex;align-items:center;justify-content:center;padding:16px;background:rgba(0,0,0,.5);backdrop-filter:blur(2px)';
      var card = document.createElement('div');
      card.style.cssText = 'background:var(--dl-surface,#fff);color:var(--dl-text,#1f2937);width:100%;max-width:360px;border:1px solid var(--dl-border,#e5e7eb);border-radius:var(--dl-radius,14px);box-shadow:0 20px 48px rgba(0,0,0,.28);padding:20px 22px;font-family:inherit';
      card.innerHTML =
        '<div style="font-size:16px;font-weight:800;margin-bottom:4px">Admin-Anmeldung</div>' +
        '<div style="font-size:13px;color:var(--dl-muted,#6b7280);margin-bottom:12px">CMS-Passwort für diese Aktion</div>' +
        '<input type="password" autocomplete="current-password" style="width:100%;box-sizing:border-box;padding:11px 12px;font-size:15px;border:2px solid var(--dl-border,#e5e7eb);border-radius:10px;background:var(--dl-surface2,#f9fafb);color:var(--dl-text,#1f2937);outline:none">' +
        '<div class="dl-pw-err" style="display:none;color:var(--dl-red,#dc2626);font-size:12px;font-weight:600;margin-top:8px"></div>' +
        '<div style="display:flex;gap:8px;justify-content:flex-end;margin-top:16px">' +
        '<button type="button" class="dl-pw-cancel" style="padding:9px 16px;font-size:14px;font-weight:700;border:1px solid var(--dl-border,#e5e7eb);border-radius:10px;background:transparent;color:var(--dl-text,#1f2937);cursor:pointer">Abbrechen</button>' +
        '<button type="button" class="dl-pw-ok" style="padding:9px 18px;font-size:14px;font-weight:700;border:none;border-radius:10px;background:var(--dl-green,#2d5016);color:#fff;cursor:pointer">Anmelden</button>' +
        '</div>';
      ov.appendChild(card);
      document.body.appendChild(ov);
      var input = card.querySelector('input');
      var okBtn = card.querySelector('.dl-pw-ok');
      var cancelBtn = card.querySelector('.dl-pw-cancel');
      var errEl = card.querySelector('.dl-pw-err');
      if (errMsg) { errEl.textContent = errMsg; errEl.style.display = ''; }

      function close(val) {
        document.removeEventListener('keydown', onKey, true);
        if (ov.parentNode) ov.parentNode.removeChild(ov);
        _pwDialog = null;
        resolve(val);
      }
      function submit() { close(input.value || ''); }
      function cancel() { close(null); }
      function onKey(e) {
        if (e.key === 'Escape') { e.preventDefault(); cancel(); }
        else if (e.key === 'Enter') { e.preventDefault(); submit(); }
      }
      okBtn.addEventListener('click', submit);
      cancelBtn.addEventListener('click', cancel);
      ov.addEventListener('mousedown', function (e) { if (e.target === ov) cancel(); });
      document.addEventListener('keydown', onKey, true);
      setTimeout(function () { input.focus(); }, 30);
    });
    return _pwDialog;
  }
  window.dlAdminPassword = dlAdminPassword;

  var _fetch = window.fetch;
  window.fetch = function (input, init) {
    init = init || {};
    var method = ((init && init.method) ||
      (typeof input === 'object' && input && input.method) || 'GET')
      .toString().toUpperCase();
    var url = (typeof input === 'string') ? input : ((input && input.url) || '');
    var isAdminCall = url.indexOf('/api/') !== -1 && MUT.indexOf(method) !== -1;

    if (isAdminCall) {
      var tok = getToken();
      if (tok) {
        var h = headersToObj(init.headers);
        h['X-CMS-Auth'] = tok;
        init.headers = h;
      }
    }

    var call = _fetch.call(this, input, init);
    if (!isAdminCall) return call;

    return call.then(function (resp) {
      if (resp.status !== 401) return resp;
      // Fallback: Passwort via gestyltem Dialog erfragen und wiederholen.
      function askAndRetry(errMsg) {
        return dlAdminPassword(errMsg).then(function (pw) {
          if (!pw) return resp;
          return window.dlAdminLogin(pw).then(function (tok) {
            var h = headersToObj(init.headers);
            h['X-CMS-Auth'] = tok;
            init.headers = h;
            return _fetch.call(window, input, init);
          }).catch(function () {
            return askAndRetry('Falsches Passwort – bitte erneut versuchen.');
          });
        });
      }
      return askAndRetry('');
    });
  };
})();
