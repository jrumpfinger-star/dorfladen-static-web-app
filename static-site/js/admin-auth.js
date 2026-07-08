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
      // Fallback: einmalig Passwort erfragen und wiederholen.
      var pw = window.prompt('CMS-Passwort für diese Aktion:');
      if (!pw) return resp;
      return window.dlAdminLogin(pw).then(function (tok) {
        var h = headersToObj(init.headers);
        h['X-CMS-Auth'] = tok;
        init.headers = h;
        return _fetch.call(window, input, init);
      }).catch(function () { return resp; });
    });
  };
})();
