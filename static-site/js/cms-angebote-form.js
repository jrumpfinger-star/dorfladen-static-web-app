/* Gemeinsame Artikelzeile des bisherigen CMS-Angebotsdialogs. */
window.CMSAngeboteForm = (function () {
  'use strict';
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
    var id = esc(g.aktion_id), h = '<div class="cms-flex cms-between cms-ang-toggle" style="padding:12px 12px 10px" data-action="toggleAngItems" role="button" tabindex="0" aria-expanded="false">'
      + '<div class="cms-ang-summary" style="display:flex;align-items:center"><div><div style="font-weight:600;color:var(--ink)">' + esc(g.titel || 'Angebot') + '</div>'
      + '<div class="cms-ang-meta">' + esc(g.von) + ' bis ' + esc(g.bis) + ' · ' + g.items.length + ' Artikel</div></div>'
      + '<span class="cms-ang-chevron collapsed">&#9660;</span></div><div class="cms-akt-btns" style="display:flex;gap:6px;flex-wrap:wrap;justify-content:flex-end">'
      + '<button class="cms-btn cms-btn-sm cms-btn-gray" data-action="editAktion" data-id="' + id + '">Bearbeiten</button>'
      + '<button class="cms-btn-preview" data-action="previewAktion" data-id="' + id + '"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z"/></svg>Vorschau</button>'
      + '<button class="cms-btn-wa" data-action="shareAktion" data-id="' + id + '"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.654-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347"/></svg>Teilen</button>'
      + '<button class="cms-btn cms-btn-sm cms-btn-gray" data-action="waageAktion" data-id="' + id + '" title="Als Querformat-Bilder auf die Waage">⚖ Waage</button>'
      + '<button class="cms-btn-trash" data-action="deleteAktion" data-id="' + id + '" aria-label="Aktion löschen" title="Löschen"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 3h6l1 2h4v2H4V5h4l1-2zm1 6h2v9h-2V9zm4 0h2v9h-2V9zM7 9h2v9H7V9z"/></svg></button>'
      + '</div></div><div class="cms-ang-items collapsed">';
    g.items.forEach(function (item) {
      h += '<div class="cms-ang-item"><div class="cms-ang-name">' + esc(item.produkt) + '</div>';
      if (item.preis != null) h += '<div class="cms-ang-price">' + esc(formatPrice(item.preis)) + '</div>';
      if (item.statt_preis != null) h += '<div class="cms-ang-old">statt ' + esc(formatPrice(item.statt_preis)) + '</div>';
      h += '</div>';
    });
    card.innerHTML = h + '</div>';
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
  return { row: row, action: action, areaNavigation: areaNavigation, syncAreaNavigation: syncAreaNavigation };
})();
