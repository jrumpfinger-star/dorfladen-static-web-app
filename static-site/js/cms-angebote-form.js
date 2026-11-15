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
  return { row: row };
})();
