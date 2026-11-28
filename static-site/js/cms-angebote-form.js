/* Gemeinsame Artikelzeile des bisherigen CMS-Angebotsdialogs. */
window.CMSAngeboteForm = (function () {
  'use strict';
  function icon(name) {
    var paths = {
      'square-pen': '<path d="M12 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.375 2.625a1 1 0 0 1 3 3l-9.013 9.014a2 2 0 0 1-.853.505l-2.873.84a.5.5 0 0 1-.62-.62l.84-2.873a2 2 0 0 1 .506-.852z"/>',
      eye: '<path d="M2.062 12.348a1 1 0 0 1 0-.696 10.75 10.75 0 0 1 19.876 0 1 1 0 0 1 0 .696 10.75 10.75 0 0 1-19.876 0"/><circle cx="12" cy="12" r="3"/>',
      'share-2': '<circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><path d="m8.59 13.51 6.83 3.98m-.01-10.98-6.82 3.98"/>',
      scale: '<path d="m16 16 3-8 3 8c-.87.65-1.92 1-3 1s-2.13-.35-3-1Zm-14 0 3-8 3 8c-.87.65-1.92 1-3 1s-2.13-.35-3-1ZM7 21h10M12 3v18M3 7h2c2 0 5-1 7-2 2 1 5 2 7 2h2"/>',
      'trash-2': '<path d="M3 6h18M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2M10 11v6m4-6v6"/>',
      ellipsis: '<circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/><circle cx="5" cy="12" r="1"/>',
      list: '<path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"/>',
      palette: '<circle cx="13.5" cy="6.5" r=".5" fill="currentColor"/><circle cx="17.5" cy="10.5" r=".5" fill="currentColor"/><circle cx="8.5" cy="7.5" r=".5" fill="currentColor"/><circle cx="6.5" cy="12.5" r=".5" fill="currentColor"/><path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.926 0 1.648-.746 1.648-1.688 0-.437-.18-.835-.437-1.125-.29-.289-.438-.652-.438-1.125a1.64 1.64 0 0 1 1.668-1.668h1.996c3.051 0 5.555-2.503 5.555-5.554C21.965 6.012 17.461 2 12 2z"/>',
      printer: '<path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2M6 9V3a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v6"/><rect x="6" y="14" width="12" height="8" rx="1"/>',
      'calendar-days': '<path d="M8 2v4m8-4v4M3 10h18"/><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M8 14h.01M12 14h.01M16 14h.01M8 18h.01M12 18h.01M16 18h.01"/>',
      x: '<path d="m18 6-12 12M6 6l12 12"/>',
      'chevron-down': '<path d="m6 9 6 6 6-6"/>'
    };
    if (!paths[name]) throw new Error('Unbekanntes Angebotssymbol: ' + name);
    return '<svg class="lucide" aria-hidden="true" focusable="false" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' + paths[name] + '</svg>';
  }
  function row(item, number, escape) {
    item = item || {};
    var esc = escape || window.AngeboteModel.esc;
    var hasBild = !!item.bild_data;
    function price(value) {
      return value == null ? '' : Number(value).toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    }
    var element = document.createElement('div');
    element.className = 'cms-ang-row';
    element.id = 'cms-ar-' + number;
    element.setAttribute('draggable', 'false');
    element.innerHTML = '<div class="cms-ang-row-num">' + number + '</div>'
      + '<span class="cms-ang-drag" title="Reihenfolge ändern (ziehen)">&#9776;</span>'
      + '<button type="button" class="cms-ang-row-close" data-action="removeAngRow" aria-label="Artikel entfernen">&times;</button>'
      + '<div class="cms-ang-fields">'
      + '<input type="hidden" data-f="id" value="' + esc(item.id || '') + '">'
      + '<input type="hidden" data-f="bild_data" data-bild-dirty="" value="' + esc(item.bild_data || '') + '">'
      + '<input type="hidden" data-f="dl_werbebildid" value="' + esc(item.dl_werbebildid || '') + '">'
      + '<div class="cms-ang-row-img">'
      + '<img class="cms-bild-preview" alt="Artikelbild" src="' + (hasBild ? esc(item.bild_data) : '') + '" style="width:36px;height:36px;object-fit:contain;border-radius:4px;' + (hasBild ? '' : 'display:none') + '">'
      + '<button class="cms-bild-clear" type="button" title="Bild entfernen" data-action="clearBild" style="' + (hasBild ? '' : 'display:none') + '">×</button>'
      + '<button class="cms-bild-load-sp" type="button" title="Bild zum Strichcode suchen" data-action="loadBildSharePoint" data-row="' + number + '">&#128269;</button>'
      + '<button class="cms-bild-upload-sp" type="button" title="Bild auswählen & in StrichcodeBilder hochladen" data-action="uploadBildSP" data-row="' + number + '">&#128193;</button>'
      + '<button class="cms-bild-paste-sp" type="button" title="Bild aus Zwischenablage einfügen (Klick + Strg+V)" data-action="pasteBildSP" data-row="' + number + '">&#128203;</button></div>'
      + '<div class="cms-art-wrap"><input class="cms-input cms-art-input" data-f="produkt" aria-label="Produkt" placeholder="Produkt..." value="' + esc(item.produkt || '') + '" autocomplete="off" spellcheck="false"><div class="cms-art-dd"></div></div>'
      + '<input class="cms-input" data-f="details" aria-label="Details" placeholder="Details" value="' + esc(item.details || '') + '">'
      + '<input class="cms-input cms-price" data-f="preis" inputmode="decimal" aria-label="Angebotspreis" placeholder="Preis" value="' + price(item.preis) + '">'
      + '<input class="cms-input cms-price" data-f="statt_preis" inputmode="decimal" aria-label="Stattpreis" placeholder="statt" value="' + price(item.statt_preis) + '">'
      + '<input class="cms-input" data-f="artikelnummer" aria-label="Strichcode" placeholder="Strichcode" value="' + esc(item.artikelnummer || '') + '" title="Strichcode">'
      + '</div>';
    return element;
  }
  function action(g, escape, formatPrice) {
    var esc = escape || window.AngeboteModel.esc;
    var card = document.createElement('div'); card.className = 'cms-card';
    var id = esc(g.aktion_id), featuredItem = g.items[0];
    function actionButton(entry) {
      return '<button type="button" class="' + entry[3] + '" data-action="' + entry[0] + '" data-id="' + id + '" aria-label="' + entry[2]
        + '" title="' + (entry[0] === 'waageAktion' ? 'Als Querformat-Bilder auf die Waage' : entry[2]) + '">' + icon(entry[1])
        + (entry[0] === 'deleteAktion' ? '' : '<span class="an-action-label">' + entry[2] + '</span>') + '</button>';
    }
    var h = '<div class="cms-ang-card-head">'
      + '<div class="cms-ang-summary" data-action="toggleAngItems" role="button" tabindex="0" aria-expanded="false">'
      + '<div class="cms-ang-heading"><div class="cms-ang-title">' + esc(g.titel || 'Angebot') + '</div>'
      + '<div class="cms-ang-meta"><span>' + esc(g.von) + ' bis ' + esc(g.bis) + '</span><span>' + esc(g.aktionstyp || 'Sonderaktion')
      + '</span><span>' + g.items.length + ' Artikel</span></div></div>'
      + '<div class="cms-ang-status" aria-label="Status"></div>'
      + (featuredItem ? '<div class="cms-ang-featured"><div class="cms-ang-featured-copy"><span class="cms-ang-featured-label">Angebot</span>'
        + '<strong>' + esc(featuredItem.produkt || 'Artikel') + '</strong>'
        + (g.items.length > 1 ? '<small>+' + (g.items.length - 1) + ' weitere</small>' : '') + '</div>'
        + '<div class="cms-ang-featured-price">' + (featuredItem.preis != null ? '<span class="cms-ang-price-label">Angebotspreis</span><strong>'
          + esc(formatPrice(featuredItem.preis)) + '</strong>' : '')
        + (featuredItem.statt_preis != null ? '<del>statt ' + esc(formatPrice(featuredItem.statt_preis)) + '</del>' : '') + '</div></div>' : '')
      + '<div class="cms-ang-disclosure"><span class="cms-ang-chevron collapsed">' + icon('chevron-down') + '</span><span>Artikel und Bilder anzeigen</span></div>'
        + '</div></div><div class="cms-ang-items collapsed">';
    g.items.forEach(function (item) {
      h += '<div class="cms-ang-item"><div class="cms-ang-name">' + esc(item.produkt) + '</div>';
      if (item.preis != null) h += '<div class="cms-ang-price">' + esc(formatPrice(item.preis)) + '</div>';
      if (item.statt_preis != null) h += '<div class="cms-ang-old">statt ' + esc(formatPrice(item.statt_preis)) + '</div>';
      h += '</div>';
    });
    card.innerHTML = h + '</div><div class="cms-akt-btns"><div class="cms-akt-primary">'
        + actionButton(['editAktion', 'square-pen', 'Bearbeiten', 'cms-btn cms-btn-sm cms-btn-gray'])
        + actionButton(['previewAktion', 'eye', 'Vorschau/Ausgabe', 'cms-btn-preview'])
        + '</div><div class="cms-akt-secondary">'
        + actionButton(['shareAktion', 'share-2', 'Teilen', 'cms-btn-wa'])
        + actionButton(['waageAktion', 'scale', 'Waage', 'cms-btn cms-btn-sm cms-btn-gray'])
        + actionButton(['deleteAktion', 'trash-2', 'Aktion löschen', 'cms-btn-trash'])
        + '</div></div>';
    return card;
  }
  function syncAreaNavigation(select) {
    var nav = select.previousElementSibling;
    if (!nav || !nav.classList.contains('an-main-steps')) return;
    nav.querySelectorAll('button').forEach(function (button) {
      button.setAttribute('aria-pressed', String(button.dataset.actionArea === select.value));
    });
  }
  function areaNavigation(select) {
    var nav = document.createElement('nav');
    nav.className = 'an-main-steps'; nav.setAttribute('aria-label', 'Aktionsbereiche');
    Array.from(select.options).forEach(function (option, index) {
      var button = document.createElement('button'); button.type = 'button';
      button.dataset.actionArea = option.value;
      button.textContent = (index + 1) + ' · ' + option.textContent;
      nav.appendChild(button);
    });
    select.classList.add('an-action-area-select'); select.before(nav);
    nav.onclick = function (event) {
      var button = event.target.closest('button');
      if (!button || select.disabled) return;
      select.value = button.dataset.actionArea; syncAreaNavigation(select);
      select.dispatchEvent(new Event('change', { bubbles: true }));
    };
    select.addEventListener('change', function () { syncAreaNavigation(select); });
    syncAreaNavigation(select);
    return nav;
  }
  return { row: row, action: action, icon: icon, areaNavigation: areaNavigation, syncAreaNavigation: syncAreaNavigation };
})();
