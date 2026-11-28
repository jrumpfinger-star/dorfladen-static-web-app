window.AngeboteDataverse = (function () {
  'use strict';
  var M = window.AngeboteModel;
  var config = { scale_enabled: false, scale_scope: 'cms' };
  var pendingIds = new WeakMap();
  function number(value) { return value == null ? null : Math.round(Number(value) * 100); }
  function relinkLayout(layout, records) {
    var ids = new Map(records.map(function (row) { var id = row.dl_angeboteid || row.id; return [id.replace(/-/g, '').toLowerCase(), id]; }));
    function link(value) { return typeof value === 'string' ? ids.get(value.replace(/-/g, '').toLowerCase()) || value : value; }
    function visit(value) {
      if (Array.isArray(value)) return value.map(visit);
      if (!value || typeof value !== 'object') return value;
      var result = {};
      Object.keys(value).forEach(function (key) {
        result[link(key)] = key === 'item_id' || key === 'layout_key' ? link(value[key]) : visit(value[key]);
      });
      return result;
    }
    return visit(layout);
  }
  async function actions(rows) {
    var groups = new Map();
    rows.forEach(function (row) {
      var id = row.dl_aktion_id || row.aktion_id
        || 'AUTO-' + [row.valid_from, row.valid_to, row.aktion_titel || row.name].join('-');
      if (!groups.has(id)) groups.set(id, []);
      groups.get(id).push(row);
    });
    var result = [];
    for (var entry of groups) {
      var records = entry[1].slice().sort(function (a, b) { return (a.dl_sortierung || 0) - (b.dl_sortierung || 0); });
      var first = records[0], kind = first.action_kind === 'drinks' ? 'drinks' : 'weekly';
      var data = M.blank(kind);
      data.title = first.dl_aktion_titel || first.aktion_titel || 'Sonderangebote';
      data.valid_from = String(first.dl_gueltig_von || first.valid_from || '').slice(0, 10);
      data.valid_to = String(first.dl_gueltig_bis || first.valid_to || '').slice(0, 10);
      data.items = records.map(function (row) {
        var rowId = row.dl_angeboteid || row.id;
        var imageKey = row.image_key || row.barcode || row.dl_artikelnummer || '';
        var refs = first.action_layout && relinkLayout(first.action_layout, records).image_refs || {};
        var imageId = refs[rowId] || (imageKey && (row.bild_data || row.dl_werbebildid) ? 'cms:' + imageKey : '');
        var source = row.dl_bild_base64 || row.bild_data;
        if (imageId && source && !/^https:\/\//i.test(source)) M.registerImage(imageId, source);
        return Object.assign(M.item(), {
          id: rowId, layout_key: rowId, name: row.dl_produkt || row.name || row.produkt || '',
          description: row.dl_details || row.details || '',
          price_cents: number(row.dl_preis == null ? row.price : row.dl_preis),
          old_price_cents: number(row.dl_statt_preis == null ? row.old_price : row.dl_statt_preis) || null,
          article_number: row.article_number || '', barcode: row.barcode || row.dl_artikelnummer || '',
          retail_price_cents: row.retail_price_cents == null ? null : row.retail_price_cents,
          units: row.units == null ? null : row.units, volume_ml: row.volume_ml == null ? null : row.volume_ml,
          packaging: row.packaging || '', deposit_cents: row.deposit_cents == null ? null : row.deposit_cents,
          deposit_free: row.deposit_free === true, image_id: imageId, werbebild_id: row.dl_werbebildid || ''
        });
      });
      if (first.action_layout) {
        data.layout = relinkLayout(first.action_layout, records);
        M.ensureTargets(data);
      } else M.applyTemplate(data);
      result.push({ id: entry[0], data: data, needs_weekly_template: !first.action_layout && kind === 'weekly',
        revision: first.action_revision,
        restore_images: !first.action_layout || data.items.some(function (item) { return !item.image_id && (item.barcode || item.article_number); }), original_ids: data.items.map(function (item) { return item.id; }) });
    }
    return result.sort(function (a, b) { return b.data.valid_from.localeCompare(a.data.valid_from); });
  }
  async function load() {
    var response = await M.request('/api/angebote');
    if (response.config) config = response.config;
    var rows = Array.isArray(response) ? response : response.data;
    if (!Array.isArray(rows)) throw M.problem('Die Angebotsliste konnte nicht gelesen werden.');
    return actions(rows);
  }
  async function save(action, data) {
    data.layout.image_refs = Object.fromEntries(data.items.filter(function (it) { return it.image_id; }).map(function (it) { return [it.id, it.image_id]; }));
    M.validate(data);
    if (!action && !pendingIds.has(data)) pendingIds.set(data, 'AKT-' + M.uid());
    else if (!action) {
      var earlier;
      try { earlier = (await load()).find(function (entry) { return entry.id === pendingIds.get(data); }); }
      catch (error) {
        console.error('[Angebote] Früheren Speicherversuch prüfen', error);
        throw M.problem('Ein früherer Speicherversuch konnte nicht überprüft werden. Bitte die Verbindung prüfen und erneut speichern; es wird nichts doppelt angelegt.');
      }
      if (earlier) action = earlier;
    }
    var response = await M.request('/api/angebote?action=save', M.json('POST', {
      aktion_id: action ? action.id : pendingIds.get(data),
      revision: action ? action.revision : null,
      original_ids: action ? action.original_ids : [],
      title: data.title, kind: data.kind, valid_from: data.valid_from, valid_to: data.valid_to,
      layout: data.layout, items: data.items
    }));
    var saved;
    try { saved = (await load()).find(function (entry) { return entry.id === response.aktion_id; }); }
    catch (error) {
      console.error('[Angebote] Gespeicherten Stand nachladen', error);
      throw M.problem('Die Aktion wurde gespeichert, der neue Stand konnte aber nicht geladen werden. Bitte die Aktion erneut öffnen, bevor du weiter speicherst.');
    }
    if (!saved) throw M.problem('Die Aktion wurde gespeichert, ist aber noch nicht wieder lesbar. Bitte die Übersicht neu laden.');
    pendingIds.delete(data);
    return saved;
  }
  async function remove(action) {
    return M.request('/api/angebote?action=delete', M.json('POST', { aktion_id: action.id, original_ids: action.original_ids, revision: action.revision }));
  }
  async function productImage(file, key) {
    if (!/^[a-zA-Z0-9._-]{1,128}$/.test(key)) throw M.problem('Bitte einen gültigen Strichcode ohne Leer- oder Sonderzeichen eingeben.');
    var encoded = await new Promise(function (resolve, reject) {
      var reader = new FileReader();
      reader.onload = function () { resolve(reader.result); };
      reader.onerror = function () { reject(M.problem('Das Bild konnte nicht gelesen werden. Bitte erneut auswählen.')); };
      reader.readAsDataURL(file);
    });
    var response = await M.request('/api/werbebilder', M.json('POST', { dl_artikelnummer: key, dl_bild_base64: encoded }));
    if (!response.success || !response.id) throw M.problem('Das Bild konnte nicht in StrichcodeBilder gespeichert werden.');
    var id = 'cms:' + key; M.registerImage(id, encoded);
    return { image_id: id, werbebild_id: response.id };
  }
  async function findImage(item) {
    var key = item.barcode || item.article_number || item.name;
    if (!key || !/^[\p{L}\p{N}._ -]{1,128}$/u.test(key)) throw M.problem('Bitte eine gültige Artikelnummer, einen Strichcode oder Produktnamen zur Bildsuche eingeben.');
    var results = await M.request('/api/werbebilder?sharepoint=1', M.json('POST', {
      articles: [{ artikelnummer: key, edeka_nr: item.article_number || key, strichcode: item.barcode || key }]
    }));
    if (!Array.isArray(results)) throw M.problem('Die Bildsuche hat keine gültige Antwort geliefert.');
    var found = results.find(function (row) { return row.dl_bild_base64; });
    if (!found) return null;
    var imageKey = found.dl_artikelnummer || key;
    if (!/^[\p{L}\p{N}._ -]{1,128}$/u.test(imageKey)) throw M.problem('Das gefundene Bild hat keinen gültigen Bildschlüssel. Bitte ein eigenes Artikelbild auswählen.');
    var id = 'cms:' + imageKey;
    M.registerImage(id, found.dl_bild_base64);
    return { image_id: id, werbebild_id: found.dl_werbebildid || found.id || '', source: found.dl_bild_base64 };
  }
  async function restoreImages(data) {
    await Promise.all(data.items.filter(function (item) { return !item.image_id; }).map(async function (item) {
      try {
        var found = await findImage(item);
        if (found) Object.assign(item, found);
      } catch (error) { console.warn('[Angebote] Artikelbild nicht wiederhergestellt', item.name, error); }
    }));
  }
  return { actions: actions, load: load, save: save, remove: remove, productImage: productImage, findImage: findImage,
    restoreImages: restoreImages, settings: function () { return M.clone(config); } };
})();
