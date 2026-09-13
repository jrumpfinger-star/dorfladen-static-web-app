/* ══════════════════════════════════════════════════════════════════════
   App-Anleitung (/app) — Spec specs/app-anleitung/spec.md

   Die Seite liefert alle acht Wege im HTML aus. Dieses Skript blendet
   nur aus, was gerade nicht passt (F2, F3), meldet den Ist-Zustand (F4)
   und bietet Knöpfe an, wo der Browser sie einlöst (F5).

   Es setzt auf js/pwa.js auf, kommt aber ohne dieses aus: Fehlt es,
   bleiben die Anleitungstexte vollständig bedienbar.
   ══════════════════════════════════════════════════════════════════════ */
(function () {
  'use strict';

  var WEGE = ['ios-safari', 'ios-andere', 'android-chrome', 'android-samsung',
    'android-firefox', 'win-chrome', 'mac-safari', 'mac-chrome'];

  var GERAET_VON_WEG = {
    'ios-safari': 'iphone', 'ios-andere': 'iphone',
    'android-chrome': 'android', 'android-samsung': 'android',
    'android-firefox': 'android',
    'win-chrome': 'rechner', 'mac-safari': 'rechner', 'mac-chrome': 'rechner'
  };

  var _weg = null;

  function $(s, w) { return (w || document).querySelector(s); }
  function $$(s, w) { return Array.prototype.slice.call((w || document).querySelectorAll(s)); }

  /* ── Erkennung (F3) ────────────────────────────────────────────────
     iPadOS meldet sich seit Jahren als Macintosh. Ohne die Prüfung auf
     Tastpunkte bekämen iPad-Nutzer die Mac-Anleitung — also einen Weg,
     den es auf ihrem Gerät gar nicht gibt. */
  function istIOS(ua) {
    if (/iPad|iPhone|iPod/.test(ua)) return true;
    return /Macintosh/.test(ua) && (navigator.maxTouchPoints || 0) > 1;
  }

  function erkenne() {
    var ua = navigator.userAgent || '';

    if (istIOS(ua)) {
      // Auf dem iPhone geben sich alle Browser als Safari aus; nur an
      // diesen Kürzeln sind die Fremden zu erkennen.
      if (/CriOS|FxiOS|EdgiOS|OPiOS|OPT\//.test(ua)) return 'ios-andere';
      return 'ios-safari';
    }

    if (/Android/.test(ua)) {
      if (/SamsungBrowser/.test(ua)) return 'android-samsung';
      if (/Firefox|FxiOS/.test(ua)) return 'android-firefox';
      return 'android-chrome';
    }

    if (/Macintosh|Mac OS X/.test(ua)) {
      var fremd = /Chrome|Chromium|Edg\/|OPR\//.test(ua);
      return (!fremd && /Safari/.test(ua)) ? 'mac-safari' : 'mac-chrome';
    }

    // Windows, Linux und alles Übrige: Der Weg über die Adresszeile ist
    // in Chrome und Edge derselbe.
    return 'win-chrome';
  }

  /* ── Einen Weg zeigen ─────────────────────────────────────────────── */

  function zeige(weg, merken) {
    if (WEGE.indexOf(weg) < 0) return;
    _weg = weg;

    $$('.app-weg').forEach(function (s) {
      s.hidden = (s.getAttribute('data-weg') !== weg);
    });

    var geraet = GERAET_VON_WEG[weg];

    $$('#app-geraete .app-wk').forEach(function (b) {
      var an = b.getAttribute('data-geraet') === geraet;
      b.classList.toggle('on', an);
      b.setAttribute('aria-pressed', an ? 'true' : 'false');
    });

    $$('.app-browserreihe').forEach(function (r) {
      r.hidden = (r.getAttribute('data-fuer') !== geraet);
    });

    $$('.app-browserreihe .app-wk').forEach(function (b) {
      var an = b.getAttribute('data-weg') === weg;
      b.classList.toggle('on', an);
      b.setAttribute('aria-pressed', an ? 'true' : 'false');
    });

    // Der Weg steht in der Adresse, damit er sich weitergeben und
    // drucken lässt. Ohne Sprung — sonst rutscht die Seite weg.
    if (merken) {
      try {
        history.replaceState(null, '', '#' + weg);
      } catch (e) { /* alte Browser: dann eben ohne */ }
    }

    knoepfe();
  }

  function binde() {
    $$('#app-geraete .app-wk').forEach(function (b) {
      b.addEventListener('click', function () {
        var g = b.getAttribute('data-geraet');
        // Beim Wechsel des Geräts den ersten Weg dieses Geräts zeigen —
        // meist der häufigste.
        for (var i = 0; i < WEGE.length; i++) {
          if (GERAET_VON_WEG[WEGE[i]] === g) { zeige(WEGE[i], true); return; }
        }
      });
    });

    $$('.app-browserreihe .app-wk').forEach(function (b) {
      b.addEventListener('click', function () {
        zeige(b.getAttribute('data-weg'), true);
      });
    });

    // Verweise aus den Sackgassen („Anleitung für Safari ansehen")
    $$('[data-zeige]').forEach(function (a) {
      a.addEventListener('click', function (e) {
        e.preventDefault();
        zeige(a.getAttribute('data-zeige'), true);
        var ziel = $('.app-weg:not([hidden])');
        if (ziel && ziel.scrollIntoView) ziel.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
    });

    window.addEventListener('hashchange', function () {
      var h = (location.hash || '').replace('#', '');
      if (WEGE.indexOf(h) >= 0) zeige(h, false);
    });
  }

  /* ── Ist-Zustand (F4) ─────────────────────────────────────────────── */

  function istApp() {
    try {
      if (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches) return true;
    } catch (e) { /* matchMedia fehlt: dann über navigator */ }
    return navigator.standalone === true;
  }

  function pushMoeglich() {
    return ('Notification' in window) && ('serviceWorker' in navigator)
      && ('PushManager' in window);
  }

  function erlaubnis() {
    try { return Notification.permission; } catch (e) { return 'unsupported'; }
  }

  function hatAbo() {
    if (!pushMoeglich() || !navigator.serviceWorker) return Promise.resolve(false);
    return navigator.serviceWorker.getRegistration()
      .then(function (reg) { return reg ? reg.pushManager.getSubscription() : null; })
      .then(function (sub) { return !!sub; })
      .catch(function () { return false; });
  }

  var HAKEN = '<svg width="17" height="17" viewBox="0 0 24 24" fill="none"'
    + ' stroke="currentColor" stroke-width="3" stroke-linecap="round"'
    + ' stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>';
  var OFFEN = '<svg width="17" height="17" viewBox="0 0 24 24" fill="none"'
    + ' stroke="currentColor" stroke-width="2.5" stroke-linecap="round"'
    + '><circle cx="12" cy="12" r="9"/><path d="M12 8v5"/></svg>';

  function punkt(art, text) {
    return '<span class="app-status-p ' + art + '">'
      + (art === 'ja' ? HAKEN : OFFEN) + '<span>' + text + '</span></span>';
  }

  function status() {
    var band = $('#app-status');
    if (!band) return;

    var app = istApp();
    var teile = [];

    teile.push(app
      ? punkt('ja', 'Sie nutzen den Dorfladen bereits als App')
      : punkt('offen', 'Noch nicht als App eingerichtet'));

    var fertig = function (an) {
      if (!pushMoeglich()) {
        teile.push(punkt('offen', 'Benachrichtigungen kann dieser Browser nicht'));
      } else if (erlaubnis() === 'denied') {
        teile.push(punkt('warn', 'Benachrichtigungen sind blockiert'));
      } else if (an) {
        teile.push(punkt('ja', 'Benachrichtigungen sind eingeschaltet'));
      } else {
        teile.push(punkt('offen', 'Benachrichtigungen noch aus'));
      }
      band.innerHTML = teile.join('');
      band.hidden = false;
      if (app) appSchonDa();
    };

    hatAbo().then(function (an) {
      fertig(an && erlaubnis() === 'granted');
    });
  }

  /* Wer die App schon hat, soll die Installationsschritte nicht erst
     wegscrollen müssen — sie werden eingeklappt, aber nicht entfernt. */
  function appSchonDa() {
    $$('.app-weg').forEach(function (s) {
      if (s.getAttribute('data-erledigt')) return;
      var liste = $('.app-schritte', s);
      if (!liste) return;
      s.setAttribute('data-erledigt', '1');
      liste.hidden = true;

      var zeile = document.createElement('p');
      zeile.className = 'app-kasten';
      zeile.innerHTML = '<strong>Das ist bei Ihnen schon erledigt.</strong> '
        + 'Der Dorfladen liegt als App auf Ihrem Gerät. ';
      var knopf = document.createElement('button');
      knopf.type = 'button';
      knopf.className = 'app-link';
      knopf.style.cssText = 'background:none;border:0;font:inherit;cursor:pointer;'
        + 'text-decoration:underline;padding:0';
      knopf.textContent = 'Schritte trotzdem anzeigen';
      knopf.addEventListener('click', function () {
        liste.hidden = !liste.hidden;
        knopf.textContent = liste.hidden ? 'Schritte trotzdem anzeigen' : 'Schritte ausblenden';
      });
      zeile.appendChild(knopf);
      liste.parentNode.insertBefore(zeile, liste);
    });
  }

  /* ── Knöpfe (F5) ──────────────────────────────────────────────────── */

  function installAngebot() {
    // pwa.js fängt `beforeinstallprompt` ab und legt das Ereignis in
    // _pwaPrompt. Beide Wege prüfen: Das Ereignis kann vor oder nach
    // diesem Skript eintreffen.
    return !!window._pwaPrompt;
  }

  function knoepfe() {
    // Der Installationsknopf erscheint nur, wenn der Browser die
    // Installation wirklich anbietet. Ein Knopf, der nichts bewirkt,
    // ist schlimmer als gar keiner.
    $$('.app-knopfzeile[data-knopf="installieren"]').forEach(function (z) {
      z.hidden = !(installAngebot() && !istApp());
    });
    pushKnopf();
  }

  function bindeInstall() {
    $$('.app-knopfzeile[data-knopf="installieren"] .app-tun').forEach(function (b) {
      b.addEventListener('click', function () {
        var p = window._pwaPrompt;
        if (p && p.prompt) {
          p.prompt();
          if (p.userChoice) {
            p.userChoice.then(function () {
              window._pwaPrompt = null;
              knoepfe();
            });
          }
        } else if (typeof window.pwaInstall === 'function') {
          window.pwaInstall();
        }
      });
    });

    window.addEventListener('beforeinstallprompt', function () {
      // pwa.js hat das Ereignis bereits abgefangen und abgelegt;
      // hier zählt nur, den Knopf nachzuziehen.
      setTimeout(knoepfe, 0);
    });
    window.addEventListener('appinstalled', function () {
      window._pwaPrompt = null;
      status();
      knoepfe();
    });
  }

  function pushKnopf() {
    var b = $('#app-push');
    var note = $('#app-push-note');
    if (!b) return;

    var setze = function (text, aktiv, hinweis) {
      b.textContent = text;
      b.disabled = !aktiv;
      if (note) note.textContent = hinweis || '';
    };

    if (!pushMoeglich()) {
      setze('Benachrichtigungen einschalten', false,
        'Dieser Browser kann keine Benachrichtigungen anzeigen. '
        + 'Mit Chrome, Edge oder Safari klappt es.');
      return;
    }

    // Apple lässt Benachrichtigungen nur in der installierten App zu.
    // Das vorher zu sagen, erspart einen Fehlschlag.
    var ua = navigator.userAgent || '';
    if (istIOS(ua) && !istApp()) {
      setze('Benachrichtigungen einschalten', false,
        'Auf dem iPhone und iPad geht das erst, wenn der Dorfladen als App '
        + 'auf dem Startbildschirm liegt \u2014 und von dort geöffnet wird.');
      return;
    }

    if (erlaubnis() === 'denied') {
      setze('Benachrichtigungen einschalten', false,
        'Sie haben Benachrichtigungen für diese Seite einmal abgelehnt. '
        + 'Bitte geben Sie sie in den Einstellungen Ihres Browsers wieder frei '
        + '\u2014 dort unter „Website-Einstellungen" oder „Berechtigungen".');
      return;
    }

    hatAbo().then(function (an) {
      if (an && erlaubnis() === 'granted') {
        setze('Einstellungen ändern', true,
          'Benachrichtigungen sind eingeschaltet. Hier wählen Sie, welche '
          + 'der vier Arten Sie bekommen möchten.');
      } else {
        setze('Benachrichtigungen einschalten', true,
          'Ihr Browser fragt gleich einmal nach. Danach wählen Sie aus, '
          + 'worüber Sie informiert werden möchten.');
      }
    });
  }

  function bindePush() {
    var b = $('#app-push');
    if (!b) return;
    b.addEventListener('click', function () {
      if (typeof window.pushToggle === 'function') {
        window.pushToggle();
        // Nach dem Umschalten den Stand nachziehen; die Entscheidung
        // des Nutzers fällt im Dialog, also mit etwas Abstand.
        setTimeout(function () { status(); pushKnopf(); }, 1500);
        setTimeout(function () { status(); pushKnopf(); }, 5000);
      }
    });
  }

  /* ── Druck: die Fragen aufklappen ─────────────────────────────────
     Ein zugeklapptes <details> lässt sich mit CSS allein nicht öffnen —
     der Browser blendet den Inhalt unabhängig von `display` aus. Auf dem
     Papier nützt eine zugeklappte Frage aber nichts. Also vor dem Druck
     öffnen und danach den alten Zustand wiederherstellen. */
  function druckvorbereitung() {
    var vorher = null;

    var auf = function () {
      var fragen = $$('.app-frage');
      vorher = fragen.map(function (d) { return d.open; });
      fragen.forEach(function (d) { d.open = true; });
    };
    var zu = function () {
      if (!vorher) return;
      $$('.app-frage').forEach(function (d, i) { d.open = vorher[i]; });
      vorher = null;
    };

    window.addEventListener('beforeprint', auf);
    window.addEventListener('afterprint', zu);

    // Safari kennt die beiden Ereignisse nicht und meldet den Druck über
    // die Medienabfrage.
    if (window.matchMedia) {
      var mq = window.matchMedia('print');
      var horch = function (e) { if (e.matches) auf(); else zu(); };
      if (mq.addEventListener) mq.addEventListener('change', horch);
      else if (mq.addListener) mq.addListener(horch);
    }
  }

  /* ── Start ────────────────────────────────────────────────────────── */

  function los() {
    var wahl = $('#app-wahl');
    if (wahl) wahl.hidden = false;
    var hinweis = $('.app-ohne-js');
    if (hinweis) hinweis.hidden = true;

    binde();
    bindeInstall();
    bindePush();
    druckvorbereitung();

    var h = (location.hash || '').replace('#', '');
    // Ein Weg in der Adresse schlägt die Erkennung — so lässt sich ein
    // bestimmter Weg gezielt weitergeben.
    //
    // Beim bloßen Öffnen wird die Adresse NICHT angefasst: Sobald dort ein
    // Fragment steht, das zu einer Abschnitts-ID passt, rollt der Browser
    // dorthin — die Überschrift und das Statusband wären aus dem Bild. Die
    // Adresse bekommt ihren Weg erst, wenn der Nutzer selbst wählt.
    zeige(WEGE.indexOf(h) >= 0 ? h : erkenne(), false);

    status();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', los);
  } else {
    los();
  }

  // Für die Tests einsehbar machen, ohne die Seite zu verändern.
  window.AppAnleitung = { erkenne: erkenne, zeige: zeige, wege: WEGE };
})();
