/* ═══════════════════════════════════════════════════════════════════════
   Kiosk-Umbau — Hilfeschicht
   Wird nur von kiosk-neu.html geladen und liegt über den bestehenden
   Modulen. Sie ruft ausschließlich vorhandene Funktionen auf und ändert
   keine. Dadurch bleibt die Fachlogik unberührt.

   Spec:  specs/kiosk-umbau/spec.md  (F5, F9)
   Plan:  specs/kiosk-umbau/plan.md
   ═══════════════════════════════════════════════════════════════════════ */
(function () {
  'use strict';

  var KNeu = window.KNeu = {};

  // ── Symbole nachziehen ────────────────────────────────────────────────
  // Die Module schreiben laufend neues HTML in die Reiter. Lucide ersetzt
  // <i data-lucide> nur beim Aufruf, deshalb nach jeder Änderung nachziehen –
  // gebündelt, damit es nicht bei jedem einzelnen Knoten passiert.
  var symbolLauf = null;
  function symboleNachziehen() {
    if (symbolLauf) return;
    symbolLauf = requestAnimationFrame(function () {
      symbolLauf = null;
      try {
        if (window.lucide && typeof window.lucide.createIcons === 'function') {
          window.lucide.createIcons();
        }
      } catch (e) { /* Darstellung darf die Bedienung nie blockieren */ }
    });
  }

  // ── Hinweiszeile am unteren Rand („Zuletzt: … · Rückgängig") ─────────
  var meldeBox = null;
  function meldeBereich() {
    if (meldeBox && document.body.contains(meldeBox)) return meldeBox;
    meldeBox = document.createElement('div');
    meldeBox.className = 'kneu-melder';
    meldeBox.setAttribute('role', 'status');
    meldeBox.setAttribute('aria-live', 'polite');
    document.body.appendChild(meldeBox);
    return meldeBox;
  }

  /**
   * Zeigt eine Rückmeldung in Alltagssprache. Optional mit einer
   * Rücknahme-Schaltfläche (F5: „Rückgängig oder Rückfrage").
   *
   * @param {string} text     Was gerade passiert ist, in Klartext.
   * @param {object} [opt]    { art:'gut'|'warn'|'fehler', zurueck:Function, dauer:number }
   */
  KNeu.melden = function (text, opt) {
    opt = opt || {};
    var box = meldeBereich();
    var kachel = document.createElement('div');
    kachel.className = 'kneu-meld kneu-meld-' + (opt.art || 'gut');

    var span = document.createElement('span');
    span.className = 'kneu-meld-txt';
    span.textContent = text;
    kachel.appendChild(span);

    var weg = function () {
      kachel.classList.add('kneu-meld-aus');
      setTimeout(function () { if (kachel.parentNode) kachel.parentNode.removeChild(kachel); }, 200);
    };

    if (typeof opt.zurueck === 'function') {
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'kneu-meld-btn';
      btn.textContent = 'Rückgängig';
      btn.addEventListener('click', function () {
        weg();
        try { opt.zurueck(); } catch (e) { KNeu.melden('Das Rückgängigmachen hat nicht geklappt. Bitte noch einmal versuchen.', { art: 'fehler' }); }
      });
      kachel.appendChild(btn);
    }

    var zu = document.createElement('button');
    zu.type = 'button';
    zu.className = 'kneu-meld-zu';
    zu.setAttribute('aria-label', 'Hinweis schließen');
    zu.textContent = '×';
    zu.addEventListener('click', weg);
    kachel.appendChild(zu);

    box.appendChild(kachel);
    setTimeout(weg, opt.dauer || (opt.zurueck ? 9000 : 4500));
    return kachel;
  };

  // ── Meldungen in Alltagssprache (F5 / TC-F5-04) ──────────────────────
  //
  // Mehrere Module reichen im Fehlerfall den technischen Text durch:
  // `toast(e.message || 'Der Entwurf konnte nicht gespeichert werden.')`
  // zeigt bei einem Netzfehler „Failed to fetch" statt des vorgesehenen
  // deutschen Satzes. Für eine Verkäuferin ist das keine Auskunft.
  //
  // Die Module bleiben unverändert. Stattdessen wird die Meldezeile
  // beobachtet: Steht dort Technik, wird sie durch einen Satz ersetzt, der
  // sagt, was los ist und was zu tun ist.
  var TECHNIK = [
    {
      muster: /failed to fetch|networkerror|load failed|net::|err_internet|offline/i,
      klar: 'Keine Verbindung. Bitte die Netzverbindung prüfen und noch einmal versuchen.',
    },
    {
      muster: /\b401\b|unauthorized/i,
      klar: 'Die Anmeldung ist abgelaufen. Bitte neu anmelden.',
    },
    {
      muster: /\b403\b|forbidden/i,
      klar: 'Dafür fehlt die Berechtigung. Bitte im Laden Bescheid geben.',
    },
    {
      muster: /\b404\b|not found/i,
      klar: 'Das ist nicht mehr da. Bitte die Ansicht aktualisieren.',
    },
    {
      muster: /\b5\d\d\b|internal server|bad gateway|service unavailable|timeout|timed out|aborted/i,
      klar: 'Der Dienst antwortet gerade nicht. Bitte gleich noch einmal versuchen.',
    },
    {
      muster: /unexpected token|json|syntaxerror|typeerror|referenceerror|cannot read|is not a function|undefined|\bnull\b/i,
      klar: 'Die Antwort war unvollständig. Bitte noch einmal versuchen.',
    },
  ];

  /**
   * Macht aus einer technischen Meldung einen brauchbaren Satz.
   * Alles, was schon deutsch und verständlich ist, bleibt unangetastet.
   */
  KNeu.klartext = function (text) {
    var t = String(text == null ? '' : text).trim();
    if (!t) return t;

    // „Fehler: " davor sagt nichts; entscheidend ist, was dahinter steht.
    var kern = t.replace(/^(fehler|error)\s*:\s*/i, '').trim();

    for (var i = 0; i < TECHNIK.length; i++) {
      if (TECHNIK[i].muster.test(kern)) return TECHNIK[i].klar;
    }
    // Übrig bleiben Ausnahmenamen und Zustandsnummern ohne Satzbau.
    if (/^[A-Za-z]*Error\b/.test(kern) || /\bhttp\b/i.test(kern)) {
      return 'Das hat nicht geklappt. Bitte noch einmal versuchen.';
    }
    return t;
  };

  function meldungenBeobachten() {
    if (!window.MutationObserver) return;
    var beob = new MutationObserver(function (aenderungen) {
      for (var i = 0; i < aenderungen.length; i++) {
        var ziel = aenderungen[i].target;
        var el = ziel.nodeType === 1 ? ziel : ziel.parentElement;
        if (!el || !el.closest) continue;
        var box = el.closest('#k-toast, .k-toast, [id$="-status"]');
        if (!box) continue;
        var alt = box.textContent;
        var neu = KNeu.klartext(alt);
        // Nur reiner Text wird ersetzt - sonst gingen Symbole verloren.
        if (neu !== alt && box.children.length === 0) box.textContent = neu;
      }
    });
    beob.observe(document.body, { childList: true, subtree: true, characterData: true });
  }


  // ── Rückfrage vor folgenschweren Schritten (F5 / TC-F5-05) ───────────
  //
  // Gefragt wird nur dort, wo es sonst niemand tut.
  //
  // Beim Senden fragen Bäcker und Metzger längst nach: Sie zeigen einen
  // Versanddialog mit Empfänger, Betreff und allen Positionen und lassen ihn
  // ausdrücklich bestätigen. Eine allgemeine Rückfrage davor hat diesen viel
  // nützlicheren Dialog nur verdeckt und aus einem Weg zwei gemacht — sie ist
  // deshalb wieder entfallen.
  //
  // Ohne Absicherung waren das Zurücksetzen — es überschreibt alle erfassten
  // Mengen mit denen des letzten gleichen Wochentags — und das Verwerfen.
  // Beides ist selten und nicht zurückzuholen; dort steht die Rückfrage.
  //
  // Das Entfernen einer einzelnen Portion bleibt bewusst ohne Rückfrage: Es
  // kommt oft vor, ist sofort sichtbar und mit einem Griff wieder erfasst —
  // eine Frage bei jedem Handgriff würde nur noch weggetippt.
  var RUECKFRAGEN = [
    {
      reiter: 'panel-baecker', muster: /zur(ü|ue)cksetzen/i,
      titel: 'Alle Mengen zurücksetzen?',
      text: 'Die heute erfassten Mengen werden durch die vom letzten gleichen Wochentag ersetzt.',
      ja: 'Zurücksetzen',
    },
    {
      reiter: null, muster: /^\s*verwerfen\s*$/i,
      titel: 'Änderungen verwerfen?',
      text: 'Das Erfasste wird gelöscht. Eine bereits gesendete Bestellung bleibt, wie sie ist.',
      ja: 'Verwerfen',
    },
  ];

  var frageOffen = null;

  /**
   * Zeigt eine Rückfrage als Blatt am unteren Rand.
   * Die verneinende Antwort hat den Bedienfokus — wer versehentlich zweimal
   * tippt, löst nichts aus.
   */
  function frageStellen(eintrag, weiter) {
    if (frageOffen) return;

    var hülle = document.createElement('div');
    hülle.className = 'kneu-frage';

    var blatt = document.createElement('div');
    blatt.className = 'kneu-frage-blatt';
    blatt.setAttribute('role', 'alertdialog');
    blatt.setAttribute('aria-modal', 'true');

    var titel = document.createElement('div');
    titel.className = 'kneu-frage-titel';
    titel.textContent = eintrag.titel;

    var text = document.createElement('div');
    text.className = 'kneu-frage-text';
    text.textContent = eintrag.text;

    var reihe = document.createElement('div');
    reihe.className = 'kneu-frage-knoepfe';

    var nein = document.createElement('button');
    nein.type = 'button';
    nein.className = 'kneu-frage-nein';
    nein.textContent = 'Abbrechen';

    var ja = document.createElement('button');
    ja.type = 'button';
    ja.className = 'kneu-frage-ja';
    ja.textContent = eintrag.ja;

    reihe.appendChild(nein);
    reihe.appendChild(ja);
    blatt.appendChild(titel);
    blatt.appendChild(text);
    blatt.appendChild(reihe);
    hülle.appendChild(blatt);

    var vorher = document.activeElement;
    function schliessen() {
      if (!frageOffen) return;
      frageOffen = null;
      document.removeEventListener('keydown', beiTaste, true);
      if (hülle.parentNode) hülle.parentNode.removeChild(hülle);
      try { if (vorher && vorher.focus) vorher.focus(); } catch (e) { /* Fokus ist nicht erzwingbar */ }
    }
    function beiTaste(ev) {
      if (ev.key === 'Escape') { ev.preventDefault(); schliessen(); }
    }

    nein.addEventListener('click', schliessen);
    ja.addEventListener('click', function () { schliessen(); weiter(); });
    hülle.addEventListener('click', function (ev) { if (ev.target === hülle) schliessen(); });
    document.addEventListener('keydown', beiTaste, true);

    frageOffen = hülle;
    document.body.appendChild(hülle);
    try { nein.focus(); } catch (e) { /* Fokus ist nicht erzwingbar */ }
  }

  function rueckfragenBeobachten() {
    // In der Erfassungsphase: So greift die Rückfrage, bevor der Knopf des
    // Fachmoduls seine eigene Behandlung startet. Die Module bleiben dadurch
    // unverändert.
    document.addEventListener('click', function (ev) {
      var knopf = ev.target && ev.target.closest
        ? ev.target.closest('button, [role=button]') : null;
      if (!knopf) return;

      // Die Knöpfe der Rückfrage selbst tragen die Namen der Aktionen
      // („Verwerfen", „Senden") und dürfen keine zweite Rückfrage auslösen.
      if (knopf.closest('.kneu-frage')) return;

      // Nach dem Bestätigen läuft derselbe Tipper noch einmal durch - dann
      // ohne Rückfrage.
      if (knopf.getAttribute('data-kneu-bestaetigt')) {
        knopf.removeAttribute('data-kneu-bestaetigt');
        return;
      }

      var beschriftung = (knopf.textContent || '').replace(/\s+/g, ' ').trim();
      if (!beschriftung) return;

      for (var i = 0; i < RUECKFRAGEN.length; i++) {
        var e = RUECKFRAGEN[i];
        if (e.reiter && !knopf.closest('#' + e.reiter)) continue;
        if (!e.muster.test(beschriftung)) continue;

        ev.preventDefault();
        ev.stopPropagation();
        (function (ziel, eintrag) {
          frageStellen(eintrag, function () {
            ziel.setAttribute('data-kneu-bestaetigt', '1');
            ziel.click();
          });
        })(knopf, e);
        return;
      }
    }, true);
  }


  //
  // Der Kopf des Bäcker-Reiters ist ein einziger Block (.bk-sticky). Das
  // Fachmodul baut ihn in der Reihenfolge Unterreiter, Liefertag, Hinweise,
  // Bäckerei, Status, Werkzeuge auf.
  //
  // Nach dem Arbeitsablauf gehört der Liefertag nach oben: Er ist das
  // Hauptmerkmal, nach dem ausgewählt wird — erst danach die Bäckerei. Beide
  // sollen außerdem beim Blättern durch die Artikelliste stehen bleiben.
  //
  // Beides zusammen geht nur, wenn sie ein gemeinsamer Block sind. Den legt
  // diese Schicht an und hängt Liefertag und Bäckerei hinein; das Fachmodul
  // bleibt unberührt und baut den Kopf weiter so auf wie bisher. Nach jedem
  // Neuaufbau stellt der Beobachter die Ordnung wieder her.
  function baeckerKopfOrdnen() {
    var kopf = document.querySelector('#panel-baecker .bk-sticky');
    if (!kopf) return;

    // Bereits umgehängt (dann liegt die Tagesleiste im festen Block) oder
    // in dieser Ansicht gar nicht vorhanden (Verlauf, Artikel).
    var tage = kopf.querySelector(':scope > .bk-days');
    if (!tage) return;

    var fest = kopf.parentNode.querySelector(':scope > .kneu-bk-fest');
    if (!fest) {
      fest = document.createElement('div');
      fest.className = 'kneu-bk-fest';
      // Bewusst neben den Kopf, nicht hinein: Ein haftender Block bleibt nur
      // innerhalb seines Elternteils stehen. Im Kopf waere er beim ersten
      // Dutzend Artikel wieder verschwunden; als Geschwister des Kopfes
      // begleitet er die ganze Liste.
      kopf.parentNode.insertBefore(fest, kopf);
    }

    var beschriftung = kopf.querySelector(':scope > .bk-days-lbl');
    var baeckerei = kopf.querySelector(':scope > .bk-btabs');
    if (beschriftung) fest.appendChild(beschriftung);
    fest.appendChild(tage);
    if (baeckerei) fest.appendChild(baeckerei);
  }

  // Das Tagesfeld erscheint erst, wenn die Tagesleiste weggescrollt ist.
  function mittagScrollBeobachten() {
    var reiter = document.getElementById('panel-mittag');
    if (!reiter) return;
    reiter.addEventListener('scroll', mittagTagSichtbarkeit, { passive: true });
  }

  /* ── Werkzeugleiste: die beiden Umschalter als ein Segment ────────────
   *
   * Die Leiste enthaelt zwei Umschalter ("Uebliche Artikel" /
   * "Alle Artikel 60") und den Knopf "Auf letzten <Wochentag>
   * zuruecksetzen". Zusammen sind sie 500 px breit und passen auf dem
   * Handy nicht in eine Zeile.
   *
   * Ein Rollstreifen verbarg, was noch kommt; Text abzukuerzen machte
   * die Knoepfe unlesbar. Beides ist verworfen. Hier werden die beiden
   * Umschalter nur als zusammengehoeriges Segment markiert - das
   * Gestaltungsblatt zeichnet sie dann mit einem gemeinsamen Rahmen.
   * Das spart Breite, ohne ein einziges Wort zu verstecken.
   */
  function baeckerWerkzeuge() {
    var leiste = document.querySelector('#panel-baecker .bk-tools');
    if (!leiste) return;
    var umschalter = leiste.querySelectorAll('[onclick*="KBaecker.umfang"]');
    if (umschalter.length !== 2) return;
    umschalter[0].classList.add('kn-seg', 'kn-seg-a');
    umschalter[1].classList.add('kn-seg', 'kn-seg-b');
  }

  // ── Mittagstisch: der gewählte Tag bleibt beim Scrollen sichtbar ─────
  //
  // Die Tagesleiste klebt nicht mehr (13.10 im Gestaltungsblatt) - zwei
  // klebende Leisten kosteten bei 360 px zusammen 213 px Kopfhöhe. Damit
  // trotzdem jederzeit erkennbar ist, welcher Tag gerade angezeigt wird,
  // wandert er als erstes Feld in die klebende Filterleiste. Ein Antippen
  // rollt zur Tagesleiste zurück — Tag wechseln bleibt ein Griff.
  function mittagTagFeld() {
    var leiste = document.getElementById('mittag-status-bar');
    var bar = document.getElementById('mittag-day-bar');
    if (!leiste || !bar) return;

    var aktiv = bar.querySelector('.k-day-pill.active');
    var feld = leiste.querySelector('.k-tag-jetzt');
    if (!aktiv) {
      if (feld && feld.parentNode) feld.parentNode.removeChild(feld);
      return;
    }
    if (!feld) {
      feld = document.createElement('button');
      feld.type = 'button';
      feld.className = 'k-tag-jetzt';
      feld.title = 'Anderen Tag wählen';
      feld.addEventListener('click', function () {
        var panel = document.getElementById('panel-mittag');
        if (!panel) return;
        try { panel.scrollTo({ top: 0, behavior: 'smooth' }); }
        catch (e) { panel.scrollTop = 0; }
      });
      leiste.insertBefore(feld, leiste.firstChild);
    }

    var teile = [];
    [].forEach.call(aktiv.querySelectorAll('span'), function (s) {
      var t = s.textContent.replace(/\s+/g, ' ').trim();
      if (t) teile.push(t);
    });
    // Ohne Vorwort: "Heute · 08.09" erklärt sich selbst und spart 30 px in
    // einer Leiste, in der jeder Millimeter über eine weitere Zeile entscheidet.
    var text = teile.length ? teile.join(' · ') : aktiv.textContent.trim();
    if (feld.textContent !== text) feld.textContent = text;
    mittagTagSichtbarkeit();
  }

  // Solange die Tagesleiste selbst zu sehen ist, wiederholt das Feld nur,
  // was zwei Zeilen darüber schon steht — und kostet in der Filterleiste die
  // Breite, die über eine zusätzliche Zeile entscheidet. Es erscheint
  // deshalb erst, wenn die Tagesleiste nach oben weggescrollt ist.
  function mittagTagSichtbarkeit() {
    var panel = document.getElementById('panel-mittag');
    var bar = document.getElementById('mittag-day-bar');
    var feld = document.querySelector('#mittag-status-bar .k-tag-jetzt');
    if (!panel || !bar || !feld) return;
    var pb = panel.getBoundingClientRect();
    var bb = bar.getBoundingClientRect();
    var leisteNochZuSehen = bb.bottom > pb.top + 4;
    feld.classList.toggle('k-tag-jetzt-aus', leisteNochZuSehen);
  }

  // ── Metzger: der Mengeneditor muss zu sehen sein ────────────────────
  //
  // Der Editor ist als Blatt am unteren Rand gestaltet (`position:sticky`).
  // Ein solches Blatt klebt aber erst, wenn seine Zeile im Bild ist — tippt
  // man weit unten in der Liste auf „+", bleibt es unterhalb des Bildschirms
  // stehen. Das Fachmodul hat dafür ein eigenes Nachschieben, das mit dem
  // klebenden Blatt nicht mehr greift.
  //
  // Deshalb wird der Editor hier ins Bild geholt, sobald er erscheint —
  // einmal je Öffnung, damit das Blättern danach frei bleibt.
  var editorGesehen = null;
  function metzgerEditorInsBild() {
    var ed = document.querySelector('#panel-metzgerbest .mb-ed');
    if (!ed) { editorGesehen = null; return; }
    if (editorGesehen === ed) return;
    editorGesehen = ed;
    KNeu.editorLaeufe = (KNeu.editorLaeufe || 0) + 1;

    // Ein klebendes Element haelt sich selbst fuer sichtbar - `scrollIntoView`
    // auf dem Blatt bewirkt deshalb nichts, und „mittig" laesst den unteren
    // Rand ueberstehen. Gerechnet wird deshalb der genaue Versatz: so weit,
    // dass das ganze Blatt im Reiter steht. Unmittelbar nach dem Neuaufbau
    // stehen die Hoehen der Liste noch nicht fest, deshalb wird nachgefasst.
    var reiter = document.getElementById('panel-metzgerbest');
    var versuche = 0;
    (function holen() {
      var blatt = document.querySelector('#panel-metzgerbest .mb-ed');
      if (!blatt || !reiter) return;

      // Die Fußleiste klebt ebenfalls am unteren Rand des Reiters. Ihre Höhe
      // wechselt mit dem Inhalt, deshalb wird sie gemessen und dem
      // Gestaltungsblatt gemeldet - sonst läge das Blatt darunter.
      var fuss = document.getElementById('mb-foot');
      var fh = fuss ? Math.round(fuss.getBoundingClientRect().height) : 0;
      reiter.style.setProperty('--mb-fuss', fh + 'px');

      var p = reiter.getBoundingClientRect();
      var b = blatt.getBoundingClientRect();
      var unten = p.bottom - fh;
      var luft = 8;
      var weg = 0;
      if (b.bottom > unten - luft) weg = b.bottom - unten + luft;
      if (b.top - weg < p.top + luft) weg = b.top - p.top - luft;
      if (Math.abs(weg) > 1) reiter.scrollTop += weg;
      if (++versuche < 6) setTimeout(holen, 120);
    })();
  }


  // ── Mittagstisch: „Alle" stand zweimal nebeneinander ────────────────
  //
  // In der Filterleiste sitzt der Filter „Alle 7" und unmittelbar daneben der
  // Umschalter, der alle Bestellkarten auf- oder zuklappt. Das Fachmodul
  // beschriftet ihn mit „Alle" bzw. „Zu" — zwei gleich aussehende Knöpfe mit
  // ganz verschiedener Wirkung, und „Zu" sagt für sich genommen nichts.
  //
  // Die Beschriftung wird deshalb hier gesetzt. Woran der Zustand erkennbar
  // ist: Das Fachmodul haengt „expandAllCards" oder „collapseAllCards" an den
  // Knopf. Nach jedem Neuaufbau stellt der Beobachter die Beschriftung wieder
  // her.
  function mittagUmschalterBenennen() {
    var knopf = document.querySelector('#mt-toggle-wrap .k-btn');
    if (!knopf) return;
    var aufklappen = /expandAllCards/.test(knopf.getAttribute('onclick') || '');
    var soll = aufklappen ? 'Aufklappen' : 'Zuklappen';
    if (knopf.textContent.trim() === soll) return;

    // Nur den Text ersetzen; das Symbol des Moduls bleibt unberuehrt.
    var gesetzt = false;
    for (var i = 0; i < knopf.childNodes.length; i++) {
      var k = knopf.childNodes[i];
      if (k.nodeType === 3 && k.nodeValue.trim()) { k.nodeValue = soll; gesetzt = true; break; }
    }
    if (!gesetzt) knopf.appendChild(document.createTextNode(soll));
    knopf.setAttribute('title', aufklappen
      ? 'Alle Bestellungen aufklappen'
      : 'Alle Bestellungen zuklappen');
  }

  //
  // Der Katalog stellte für jeden der 45 Artikel gleichzeitig ein Preisfeld
  // und eine Uhrzeit-Auswahl offen. Zusammen mit den übrigen Feldern des
  // Reiters standen 469 Eingabefelder gleichzeitig offen — man sah einen
  // Formularteppich statt einer Warenliste, und ein Fehlgriff war leicht.
  //
  // Hier wird nichts entfernt: Die Felder bleiben mit ihren Werten im
  // Dokument, damit das Fachmodul sie beim Absenden weiterhin ausliest
  // (`.soc-pick-preis[data-id]`). Sie werden nur eingeklappt und durch eine
  // ruhige Zeile ersetzt, die den Wert im Klartext zeigt. Geöffnet ist
  // immer höchstens ein Artikel.
  function socialKatalogText(zeile) {
    var anzeige = zeile.querySelector('.kneu-kat-wert');
    if (!anzeige) return;
    var preis = zeile.querySelector('.soc-pick-preis');
    var ab = zeile.querySelector('.soc-pick-ab');
    var teile = [];
    var pv = preis && preis.value ? preis.value.trim() : '';
    teile.push(pv ? pv.replace('.', ',') + ' \u20AC' : 'kein Preis');
    if (ab && ab.value) teile.push('ab ' + ab.value);
    var text = teile.join('  \u00B7  ');
    if (anzeige.textContent !== text) anzeige.textContent = text;

    var knopf = zeile.querySelector('.kneu-kat-btn');
    if (knopf) {
      var offen = zeile.classList.contains('kneu-kat-offen');
      var soll = offen ? 'Fertig' : 'Bearbeiten';
      if (knopf.textContent !== soll) knopf.textContent = soll;
      knopf.setAttribute('aria-expanded', offen ? 'true' : 'false');
    }
  }

  function socialKatalog() {
    var zeilen = document.querySelectorAll('#soc-pick-grid .soc-pick-row');
    for (var i = 0; i < zeilen.length; i++) {
      var zeile = zeilen[i];
      if (zeile.getAttribute('data-kneu-kat')) { socialKatalogText(zeile); continue; }

      var preis = zeile.querySelector('.soc-pick-preis');
      if (!preis) continue;
      var felder = preis.parentNode;
      if (!felder) continue;

      zeile.setAttribute('data-kneu-kat', '1');
      zeile.classList.add('kneu-kat-zeile');
      felder.classList.add('kneu-kat-felder');

      var kurz = document.createElement('div');
      kurz.className = 'kneu-kat-kurz';

      var wert = document.createElement('span');
      wert.className = 'kneu-kat-wert';
      kurz.appendChild(wert);

      var knopf = document.createElement('button');
      knopf.type = 'button';
      knopf.className = 'kneu-kat-btn';
      knopf.textContent = 'Bearbeiten';
      // Der Name des Artikels steht unmittelbar darüber; für die Vorlesehilfe
      // wird er mit aufgenommen, damit "Bearbeiten" nicht allein steht.
      var name = zeile.querySelector('div[style*="font-weight:600"]');
      knopf.setAttribute('aria-label', 'Preis und Uhrzeit bearbeiten'
        + (name ? ' \u2013 ' + name.textContent.trim() : ''));
      kurz.appendChild(knopf);

      felder.parentNode.insertBefore(kurz, felder);

      (function (z, k) {
        k.addEventListener('click', function (ev) {
          ev.preventDefault();
          ev.stopPropagation();
          var warOffen = z.classList.contains('kneu-kat-offen');
          var offene = document.querySelectorAll('#soc-pick-grid .kneu-kat-offen');
          for (var n = 0; n < offene.length; n++) {
            offene[n].classList.remove('kneu-kat-offen');
            socialKatalogText(offene[n]);
          }
          if (!warOffen) {
            z.classList.add('kneu-kat-offen');
            var p = z.querySelector('.soc-pick-preis');
            if (p) { try { p.focus(); p.select(); } catch (e) { /* Eingabe ist nicht erzwingbar */ } }
          }
          socialKatalogText(z);
        });
        var spiegeln = function () { socialKatalogText(z); };
        z.querySelector('.kneu-kat-felder').addEventListener('input', spiegeln);
        z.querySelector('.kneu-kat-felder').addEventListener('change', spiegeln);
      })(zeile, knopf);

      socialKatalogText(zeile);
    }
  }

  // ── Terminkalender: Datum wählen statt Woche für Woche blättern ──────
  //
  // Der Kalender kennt nur „eine Woche vor / zurück". Für einen Termin in
  // drei Monaten waren das ein Dutzend Tipper. Die Wochenangabe wird deshalb
  // zur Datumsauswahl: Darüber liegt ein unsichtbares Datumsfeld, das die
  // Auswahl des Geräts öffnet.
  //
  // Das Fachmodul bleibt unberührt. Gesteuert wird es so, wie eine Bedienerin
  // es auch täte — über seine eigenen Blätterknöpfe.
  function kalenderSpringen(zielIso) {
    var tage = document.querySelectorAll('#kal-days .kal-day');
    if (!tage.length) return;
    var ersterTag = tage[0].getAttribute('data-day');
    if (!ersterTag) return;

    var tagMs = 86400000;
    var montagJetzt = new Date(ersterTag + 'T12:00:00');
    var ziel = new Date(zielIso + 'T12:00:00');
    if (isNaN(ziel.getTime())) return;

    // Montag der Zielwoche (in Deutschland beginnt die Woche am Montag).
    var montagZiel = new Date(ziel);
    montagZiel.setDate(ziel.getDate() - ((ziel.getDay() + 6) % 7));

    var wochen = Math.round((montagZiel - montagJetzt) / (7 * tagMs));
    var knopf = document.querySelector(
      '#panel-kalender .kal-nav[data-act="' + (wochen < 0 ? 'prev' : 'next') + '"]');
    if (!knopf) return;

    if (wochen !== 0) {
      // Jeder Tipper stößt beim Modul ein Nachladen an. Bei zwanzig Wochen
      // wären das zwanzig überflüssige Abrufe, deren Antworten sich auch noch
      // überholen könnten. Für die Dauer des Sprungs — ein einziger, nicht
      // unterbrochener Durchlauf — wird das Nachladen deshalb stillgelegt und
      // danach genau einmal ausgelöst.
      var echtesHolen = window.fetch;
      window.fetch = function () { return new Promise(function () { }); };
      try {
        for (var i = 0; i < Math.abs(wochen); i++) knopf.click();
      } finally {
        window.fetch = echtesHolen;
      }
      try { window.KalenderKiosk.reload(); }
      catch (e) { return; }
    }

    // Den gewünschten Tag auswählen, sobald die Woche steht.
    var versuche = 0;
    (function tagWaehlen() {
      var el = document.querySelector('#kal-days .kal-day[data-day="' + zielIso + '"]');
      if (el) { el.click(); return; }
      if (++versuche < 40) setTimeout(tagWaehlen, 100);
    })();
  }

  function kalenderDatumswahl() {
    var woche = document.querySelector('#panel-kalender .kal-week');
    if (!woche || woche.querySelector('.kneu-kal-datum')) return;

    var feld = document.createElement('input');
    feld.type = 'date';
    feld.className = 'kneu-kal-datum';
    feld.setAttribute('aria-label', 'Datum wählen und dorthin springen');
    feld.addEventListener('change', function () {
      if (feld.value) kalenderSpringen(feld.value);
    });
    woche.appendChild(feld);
  }

  // Ein eigener, enger Beobachter nur für die Tagesleiste. Der große
  // Beobachter unten darf keine Attribute verfolgen: `baeckerWerkzeuge()`
  // setzt selbst Klassen und würde sich sonst endlos wieder aufrufen.
  var _mtTagBeob = null;
  function mittagTagBeobachten() {
    var bar = document.getElementById('mittag-day-bar');
    if (!bar || _mtTagBeob || !window.MutationObserver) return;
    _mtTagBeob = new MutationObserver(mittagTagFeld);
    _mtTagBeob.observe(bar, {
      childList: true, subtree: true,
      attributes: true, attributeFilter: ['class'],
    });
  }

  // ── Reiterwechsel: Liste nach oben, Symbole nachziehen ───────────────
  function reiterBeobachten() {
    var leiste = document.querySelector('.k-tabs');
    if (!leiste) return;
    leiste.addEventListener('click', function () {
      symboleNachziehen();
      baeckerWerkzeuge();
      baeckerKopfOrdnen();
      mittagTagFeld();
      socialKatalog();
      kalenderDatumswahl();
      requestAnimationFrame(function () {
        var offen = document.querySelector('.k-panel.active');
        if (offen && offen.scrollTop > 0) offen.scrollTop = 0;
      });
    });
  }

  // ── Änderungen in den Reitern verfolgen ──────────────────────────────
  function inhalteBeobachten() {
    var haupt = document.querySelector('.k-main');
    if (!haupt || !window.MutationObserver) return;
    var beob = new MutationObserver(function () {
      // Jede Hilfe fuer sich: Steigt eine aus, sollen die uebrigen trotzdem
      // laufen. Vorher haette ein einziger Fehler die ganze Kette angehalten.
      [
        metzgerEditorInsBild, symboleNachziehen, baeckerWerkzeuge,
        baeckerKopfOrdnen, mittagTagFeld, mittagUmschalterBenennen,
        socialKatalog, kalenderDatumswahl,
      ].forEach(function (hilfe) {
        try { hilfe(); }
        catch (e) { /* Darstellung darf die Bedienung nie blockieren */ }
      });
    });
    beob.observe(haupt, { childList: true, subtree: true });
  }

  // ── Start ────────────────────────────────────────────────────────────
  function start() {
    reiterBeobachten();
    inhalteBeobachten();
    rueckfragenBeobachten();
    meldungenBeobachten();
    mittagScrollBeobachten();
    mittagTagBeobachten();
    symboleNachziehen();
    baeckerWerkzeuge();
    baeckerKopfOrdnen();
    mittagTagFeld();
    socialKatalog();
    kalenderDatumswahl();
    document.documentElement.classList.add('kneu');
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start);
  } else {
    start();
  }
})();
