// ═══════════════════════════════════════════════════════════
//  SOCIAL MEDIA MODULE (shared by CMS + Kiosk)
//  Depends on: window.SOCIAL_API (default '/api'),
//              window.SOCIAL_MEALS (function returning meals array, optional),
//              window.SOCIAL_FEATURE_FLAGS (object, optional),
//              window.SOCIAL_TOAST (function, optional)
// ═══════════════════════════════════════════════════════════
(function(){
  'use strict';
  var API = window.SOCIAL_API || '/api';
  // Universal image popup – fallback if app.js is not loaded (e.g. kiosk.html)
  if(!window.dlImagePopup){
    window.dlImagePopup=function(src,alt){
      if(!src)return;
      var existing=document.getElementById('dl-img-popup');
      if(existing) existing.remove();
      var ov=document.createElement('div');
      ov.id='dl-img-popup';
      ov.style.cssText='position:fixed;inset:0;z-index:9999;background:rgba(0,0,0,.85);display:flex;flex-direction:column;align-items:center;justify-content:center;padding:16px;cursor:pointer';
      ov.addEventListener('click',function(){ov.remove();});
      var img=document.createElement('img');
      img.src=src; img.alt=alt||'';
      img.style.cssText='max-width:90vw;max-height:80vh;object-fit:contain;border-radius:12px;box-shadow:0 8px 40px rgba(0,0,0,.5)';
      img.addEventListener('click',function(e){e.stopPropagation();});
      ov.appendChild(img);
      if(alt){var cap=document.createElement('div');cap.textContent=alt;cap.style.cssText='color:#fff;font-size:15px;font-weight:600;margin-top:12px;text-align:center;max-width:90vw;word-break:break-word';ov.appendChild(cap);}
      var cls=document.createElement('button');cls.innerHTML='&#10005;';
      cls.style.cssText='position:absolute;top:12px;right:16px;background:rgba(255,255,255,.2);border:none;color:#fff;font-size:24px;width:40px;height:40px;border-radius:50%;cursor:pointer;display:flex;align-items:center;justify-content:center';
      cls.addEventListener('click',function(e){e.stopPropagation();ov.remove();});
      ov.appendChild(cls);
      document.body.appendChild(ov);
      document.addEventListener('keydown',function onKey(e){if(e.key==='Escape'){ov.remove();document.removeEventListener('keydown',onKey);}});
    };
  }
  function esc(s){var d=document.createElement('div');d.textContent=s;return d.innerHTML;}
  function getFeatureFlags(){return window.SOCIAL_FEATURE_FLAGS||window._featureFlags||{};}
  function getMeals(){
    if(typeof window.SOCIAL_MEALS==='function') return window.SOCIAL_MEALS();
    if(typeof meals!=='undefined' && meals && meals.length) return meals;
    return [];
  }

  var _socialKatalog = [];
  var _socKategorien = []; // [{name, icon}] from API
  window._socialKatLoaded = false;

  // Lucide SVG icon helper – renders inline SVG for a Lucide icon name
  // Converts kebab-case (e.g. "cake-slice") to PascalCase (e.g. "CakeSlice") for lucide.icons lookup
  function lucideIcon(name, size) {
    size = size || 16;
    if (window.lucide && window.lucide.icons) {
      var pascal = name.split('-').map(function(w){ return w.charAt(0).toUpperCase() + w.slice(1); }).join('');
      var ic = window.lucide.icons[pascal];
      if (ic && Array.isArray(ic)) {
        var paths = ic.map(function(p) {
          var tag = p[0], attrs = p[1] || {};
          var a = ''; for (var k in attrs) a += ' ' + k + '="' + attrs[k] + '"';
          return '<' + tag + a + '/>';
        }).join('');
        return '<svg width="' + size + '" height="' + size + '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' + paths + '</svg>';
      }
    }
    return '<i data-lucide="' + esc(name) + '" style="width:' + size + 'px;height:' + size + 'px"></i>';
  }

  // Build <option> HTML for category dropdowns from _socKategorien
  function socKatOptionsHtml(selectedVal) {
    return _socKategorien.map(function(k) {
      var sel = k.name === selectedVal ? ' selected' : '';
      return '<option value="' + esc(k.name) + '"' + sel + '>' + esc(k.name) + '</option>';
    }).join('');
  }

  // Populate all static category <select> elements
  function socPopulateKatSelects() {
    var html = socKatOptionsHtml('');
    ['soc-kat-kategorie'].forEach(function(id) {
      var el = document.getElementById(id);
      if (el) { var cur = el.value; el.innerHTML = html; if (cur) el.value = cur; }
    });
  }

  // Get Lucide icon name for a category
  function socCatIcon(catName) {
    for (var i = 0; i < _socKategorien.length; i++) {
      if (_socKategorien[i].name === catName) return _socKategorien[i].icon || 'tag';
    }
    return 'tag';
  }

  // --- Sub-tab switching ---
  window.socialSubTab = function(name){
    ['katalog','post','wakatalog'].forEach(function(t){
      var p=document.getElementById('social-panel-'+t);
      var b=document.getElementById('social-subtab-'+t);
      if(p) p.style.display = t===name?'':'none';
      if(b){
        if(t===name){ b.classList.add('active'); } else { b.classList.remove('active'); }
      }
    });
    if(name==='post'){
      var katReady2=window._socialKatLoaded;
      var mtReady2=window._socialMtBilderLoaded||false;
      function tryBuild2(){ if(katReady2&&mtReady2) socialBuildPostItems(); }
      if(katReady2&&mtReady2){ socialBuildPostItems(); }
      else {
        if(!window._socialKatLoaded){
          socialLoadKatalog(function(){ katReady2=true; tryBuild2(); });
        }
        if(!window._socialMtBilderLoaded){
          socialLoadMtBilder(function(){ mtReady2=true; tryBuild2(); });
        } else { mtReady2=true; tryBuild2(); }
      }
      socialLoadTodayPosts();
    }
    if(name==='wakatalog') waKatalogLoad();
  };

  function socialStatus(id,msg,ok){
    var el=document.getElementById(id);
    if(!el)return;
    if(el._statusTimer){clearTimeout(el._statusTimer);el._statusTimer=null;}
    el.style.display='block';
    el.style.background=ok?'#f0fdf4':'#fef2f2';
    el.style.color=ok?'#166534':'#991b1b';
    el.style.border='1px solid '+(ok?'#bbf7d0':'#fecaca');
    el.textContent=msg;
    el._statusTimer=setTimeout(function(){el.style.display='none';el._statusTimer=null;},4000);
  }

  var _socPastedFile = null;

  function socialShowBildPreview(file){
    var wrap=document.getElementById('soc-kat-bild-preview');
    var thumb=document.getElementById('soc-kat-bild-thumb');
    var hint=document.getElementById('soc-kat-paste-hint');
    var zone=document.getElementById('soc-kat-paste-zone');
    if(!wrap||!thumb)return;
    var r=new FileReader();
    r.onload=function(e){
      thumb.src=e.target.result;
      wrap.style.display='block';
      if(hint) hint.style.display='none';
      if(zone){ zone.style.borderColor='var(--c-green,#2e7d4f)'; zone.style.background='#f0fdf4'; }
    };
    r.readAsDataURL(file);
  }

  window.socialClearBild = function(){
    _socPastedFile=null;
    var inp=document.getElementById('soc-kat-bild');
    if(inp) inp.value='';
    var cam=document.getElementById('soc-kat-bild-cam');
    if(cam) cam.value='';
    var wrap=document.getElementById('soc-kat-bild-preview');
    var hint=document.getElementById('soc-kat-paste-hint');
    var zone=document.getElementById('soc-kat-paste-zone');
    if(wrap) wrap.style.display='none';
    if(hint) hint.style.display='block';
    if(zone){ zone.style.borderColor='var(--c-border,#e5e7eb)'; zone.style.background='#fafbfc'; }
  };

  // Init bild handlers on DOMContentLoaded
  function socialInitBildHandlers(){
    var inp=document.getElementById('soc-kat-bild');
    if(inp) inp.addEventListener('change',function(){
      _socPastedFile=null;
      var cam=document.getElementById('soc-kat-bild-cam'); if(cam) cam.value='';
      var f=this.files&&this.files[0];
      if(f) socialShowBildPreview(f);
    });
    var camInp=document.getElementById('soc-kat-bild-cam');
    if(camInp) camInp.addEventListener('change',function(){
      _socPastedFile=null;
      if(inp) inp.value='';
      var f=this.files&&this.files[0];
      if(f) socialShowBildPreview(f);
    });
    var zone=document.getElementById('soc-kat-paste-zone');
    var panel=document.getElementById('cms-panel-social')||document.getElementById('kiosk-panel-social');
    function handlePaste(e){
      var items=e.clipboardData&&e.clipboardData.items;
      if(!items)return;
      for(var i=0;i<items.length;i++){
        if(items[i].type.indexOf('image')!==-1){
          e.preventDefault();
          var f=items[i].getAsFile();
          if(f){ _socPastedFile=f; if(inp) inp.value=''; socialShowBildPreview(f); }
          return;
        }
      }
    }
    if(zone) zone.addEventListener('paste',handlePaste);
    if(panel) panel.addEventListener('paste',handlePaste);
    if(zone){
      zone.addEventListener('dragover',function(e){ e.preventDefault(); zone.style.borderColor='var(--c-green,#2e7d4f)'; zone.style.background='#f0fdf4'; });
      zone.addEventListener('dragleave',function(){ if(!_socPastedFile&&!(inp&&inp.files&&inp.files.length)){ zone.style.borderColor='var(--c-border,#e5e7eb)'; zone.style.background='#fafbfc'; } });
      zone.addEventListener('drop',function(e){ e.preventDefault(); var f=e.dataTransfer&&e.dataTransfer.files&&e.dataTransfer.files[0]; if(f&&f.type.indexOf('image')!==-1){ _socPastedFile=f; if(inp) inp.value=''; socialShowBildPreview(f); } });
    }
  }

  window.socialLoadKatalog = function(cb){
    var list=document.getElementById('soc-kat-list');
    var empty=document.getElementById('soc-kat-empty');
    var loading=document.getElementById('soc-kat-loading');
    if(loading) loading.style.display='block';
    if(list) list.innerHTML='';
    if(empty) empty.style.display='none';
    fetch(API+'/social-katalog?base64=1').then(function(r){ if(!r.ok) throw new Error('HTTP '+r.status); return r.json(); })
      .then(function(res){ if(res.error){socialStatus('soc-kat-status','API-Fehler: '+res.error,false);return;} window._socialKatLoaded=true; _socialKatalog=res.items||[]; if(res.kategorien&&res.kategorien.length){_socKategorien=res.kategorien;} socPopulateKatSelects(); socialRenderKatalog(); })
      .catch(function(e){socialStatus('soc-kat-status','Fehler beim Laden: '+e.message,false);})
      .then(function(){ if(loading) loading.style.display='none'; if(typeof cb==='function') cb(); });
  };

  // _socKatOpts is now dynamically built from _socKategorien (no more hardcoded emojis)

  function socialRenderKatalog(){
    var list=document.getElementById('soc-kat-list');
    var empty=document.getElementById('soc-kat-empty');
    if(!list)return;
    if(!_socialKatalog.length){ list.innerHTML=''; if(empty) empty.style.display='block'; return; }
    if(empty) empty.style.display='none';
    var cats={}; _socialKatalog.forEach(function(p){ var c=p.kategorie||'Sonstiges'; if(!cats[c]) cats[c]=[]; cats[c].push(p); });
    var catIcons={}; _socKategorien.forEach(function(k){ catIcons[k.name]=lucideIcon(k.icon||'tag',16); });
    var html='';
    Object.keys(cats).forEach(function(cat){
      var catId='soc-kat-cat-'+esc(cat).replace(/[^a-zA-Z0-9]/g,'_');
      html+='<div class="k-order soc-card" style="margin-bottom:10px">';
      html+='<div class="soc-kat-cat-hdr" onclick="socialKatToggleCat(\''+catId+'\')" style="background:linear-gradient(135deg,var(--c-pri,#2d5016) 0%,var(--c-green,#2e7d4f) 100%);cursor:pointer;display:flex;align-items:center;justify-content:space-between;user-select:none;padding:10px 14px;color:#fff;font-weight:700;border-radius:10px 10px 0 0">';
      html+='<span style="display:inline-flex;align-items:center;gap:6px">'+(catIcons[cat]||lucideIcon('package',16))+' '+esc(cat)+' <span style="opacity:.6;font-size:11px">('+cats[cat].length+')</span></span>';
      html+='<span class="soc-kat-arrow" id="'+catId+'-arrow" style="transition:transform .2s;font-size:14px">&#9654;</span>';
      html+='</div>';
      html+='<div id="'+catId+'" style="padding:0;display:none">';
      html+='<table style="width:100%;border-collapse:collapse;font-size:13px">';
      cats[cat].forEach(function(p,i){
        var bg=i%2===0?'#fff':'#fafbfc'; var pid=esc(p.id);
        html+='<tr id="soc-row-'+pid+'" style="background:'+bg+';border-bottom:1px solid #f3f4f6">';
        html+='<td style="padding:8px;width:50px">';
        if(p.bild_url) html+='<img id="soc-kat-thumb-'+pid+'" src="'+esc(p.bild_url)+'" ondblclick="dlImagePopup(this.src,\''+esc(p.name).replace(/'/g,"\\'")+'\')" style="width:44px;height:44px;object-fit:cover;border-radius:6px;border:1px solid #e5e7eb;cursor:zoom-in" onerror="this.style.display=\'none\'">';
        else html+='<div id="soc-kat-thumb-'+pid+'" style="width:44px;height:44px;background:#f3f4f6;border-radius:6px;display:flex;align-items:center;justify-content:center;color:#9ca3af">'+lucideIcon('camera',20)+'</div>';
        html+='</td><td style="padding:8px"><span style="font-weight:700">'+esc(p.name)+'</span></td>';
        html+='<td style="padding:8px;text-align:right;white-space:nowrap">';
        if(p.preis){var lp=parseFloat(p.preis);html+='<span style="font-weight:700;color:#2e7d32">'+(lp&&isFinite(lp)?lp.toFixed(2).replace('.',','):esc(p.preis))+' &#8364;</span>';}
        html+='</td><td style="padding:8px;width:110px;text-align:right;white-space:nowrap">';
        html+='<label title="Bild \u00e4ndern" style="padding:4px 8px;margin-right:3px;cursor:pointer;display:inline-flex;align-items:center;background:#f3f4f6;border:1px solid #d1d5db;border-radius:6px;min-height:32px">'+lucideIcon('camera',16)+'<input type="file" accept="image/*" capture="environment" onchange="socialKatImgChange(\''+pid+'\',this)" style="display:none"></label>';
        html+='<button onclick="socialKatEdit(\''+pid+'\')" title="Bearbeiten" style="padding:4px 8px;margin-right:3px;background:#f3f4f6;border:1px solid #d1d5db;border-radius:6px;cursor:pointer;display:inline-flex;align-items:center;min-height:32px">'+lucideIcon('pencil',16)+'</button>';
        html+='<button onclick="socialKatDelete(\''+pid+'\')" title="L\u00f6schen" style="color:#dc2626;padding:4px 8px;background:#f3f4f6;border:1px solid #d1d5db;border-radius:6px;cursor:pointer;display:inline-flex;align-items:center;min-height:32px">'+lucideIcon('trash-2',16)+'</button>';
        html+='</td></tr>';
        html+='<tr id="soc-edit-'+pid+'" style="display:none;background:#fffbeb;border-bottom:2px solid #f59e0b"><td colspan="4" style="padding:12px">';
        html+='<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">';
        html+='<div class="k-field" style="grid-column:1/-1;margin-bottom:0"><label>Name</label><input id="soc-ed-name-'+pid+'" value="'+esc(p.name)+'"></div>';
        html+='<div class="k-field" style="margin-bottom:0"><label>Kategorie</label><select id="soc-ed-kat-'+pid+'">';
        html+=socKatOptionsHtml(p.kategorie);
        html+='</select></div>';
        var edP=parseFloat(p.preis);
        html+='<div class="k-field" style="margin-bottom:0"><label>Preis &euro;</label><input id="soc-ed-preis-'+pid+'" type="text" inputmode="decimal" value="'+(edP&&isFinite(edP)?edP.toFixed(2).replace('.',','):(p.preis||''))+'"></div>';
        html+='</div>';
        html+='<div id="soc-ed-paste-'+pid+'" tabindex="0" onpaste="socialKatEditPaste(\''+pid+'\',event)" style="margin-top:8px;border:2px dashed #d1d5db;border-radius:8px;padding:10px;text-align:center;background:#fafbfc;outline:none;font-size:12px;color:#9ca3af" onclick="document.getElementById(\'soc-ed-paste-'+pid+'\').focus()" title="Strg+V zum Bild einf\u00fcgen">';
        html+='<div style="display:flex;gap:8px;justify-content:center;margin-bottom:4px">';
        html+='<label class="k-btn" style="padding:8px 12px;font-size:13px;display:inline-flex;align-items:center;gap:4px;background:#f0fdf4;border:1px solid var(--c-green);color:var(--c-green);border-radius:8px;cursor:pointer;min-height:var(--touch-min)">'+lucideIcon('camera',16)+' Kamera<input type="file" accept="image/*" capture="environment" onchange="socialKatImgChange(\''+pid+'\',this)" style="display:none"></label>';
        html+='<label class="k-btn" style="padding:8px 12px;font-size:13px;display:inline-flex;align-items:center;gap:4px;background:#fff;border:1px solid var(--c-border);color:#374151;border-radius:8px;cursor:pointer;min-height:var(--touch-min)">'+lucideIcon('image',16)+' Datei<input type="file" accept="image/*" onchange="socialKatImgChange(\''+pid+'\',this)" style="display:none"></label>';
        html+='</div>';
        html+='<span style="font-size:11px">'+lucideIcon('clipboard-paste',12)+' oder <strong>Strg+V</strong> zum Einf\u00fcgen</span>';
        html+='</div>';
        html+='<div style="display:flex;gap:8px;margin-top:10px"><button class="k-btn k-btn-confirm" onclick="socialKatSave(\''+pid+'\')" style="flex:1;padding:10px 14px;font-size:14px;min-height:var(--touch-min)">'+lucideIcon('check',16)+' Speichern</button>';
        html+='<button class="k-btn k-btn-outline" onclick="socialKatCancelEdit(\''+pid+'\')" style="padding:10px 14px;font-size:14px;min-height:var(--touch-min)">Abbrechen</button></div>';
        html+='</td></tr>';
      });
      html+='</table></div></div>';
    });
    list.innerHTML=html;
    if(window.lucide) try{lucide.createIcons();}catch(e){}
  }

  window.socialKatEdit=function(id){ document.querySelectorAll('[id^="soc-edit-"]').forEach(function(el){el.style.display='none';}); document.querySelectorAll('[id^="soc-row-"]').forEach(function(el){el.style.display='';}); var row=document.getElementById('soc-row-'+id); var edit=document.getElementById('soc-edit-'+id); if(row) row.style.display='none'; if(edit) edit.style.display=''; var ni=document.getElementById('soc-ed-name-'+id); if(ni) ni.focus(); };
  window.socialKatToggleCat=function(catId){ var body=document.getElementById(catId); var arrow=document.getElementById(catId+'-arrow'); if(!body)return; if(body.style.display==='none'){body.style.display='';if(arrow) arrow.innerHTML='&#9660;';}else{body.style.display='none';if(arrow) arrow.innerHTML='&#9654;';} };
  window.socialKatCancelEdit=function(id){ var row=document.getElementById('soc-row-'+id); var edit=document.getElementById('soc-edit-'+id); if(row) row.style.display=''; if(edit) edit.style.display='none'; };
  window.socialKatSave=function(id){ var name=(document.getElementById('soc-ed-name-'+id).value||'').trim(); var kat=document.getElementById('soc-ed-kat-'+id).value; var preisRaw=(document.getElementById('soc-ed-preis-'+id).value||'').trim(); var preis=preisRaw?parseFloat(preisRaw.replace(',','.')):'';
  if(preis&&isFinite(preis)) preis=preis.toFixed(2); else preis=preisRaw;
  if(!name){socialStatus('soc-kat-status','Name darf nicht leer sein',false);return;} socialStatus('soc-kat-status','Wird gespeichert...',true); fetch(API+'/social-katalog',{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify({id:id,name:name,kategorie:kat,preis:preis})}).then(function(r){if(!r.ok)throw new Error('HTTP '+r.status);return r.json();}).then(function(res){if(res.error){socialStatus('soc-kat-status',res.error,false);return;}socialStatus('soc-kat-status','Gespeichert!',true);socialLoadKatalog();}).catch(function(e){socialStatus('soc-kat-status','Fehler: '+e.message,false);}); };
  window.socialKatAdd=function(){ var name=document.getElementById('soc-kat-name').value.trim(); var kat=document.getElementById('soc-kat-kategorie').value; var preis=document.getElementById('soc-kat-preis').value.trim(); var bildInput=document.getElementById('soc-kat-bild'); var camInput=document.getElementById('soc-kat-bild-cam'); if(!name){socialStatus('soc-kat-status','Bitte Namen eingeben',false);return;} var fd=new FormData(); fd.append('name',name); fd.append('kategorie',kat); if(preis){var pn=parseFloat(preis.replace(',','.'));fd.append('preis',pn&&isFinite(pn)?pn.toFixed(2):preis);} var bildFile=_socPastedFile||(bildInput&&bildInput.files&&bildInput.files[0])||(camInput&&camInput.files&&camInput.files[0]); if(bildFile) fd.append('bild',bildFile); socialStatus('soc-kat-status','Wird gespeichert...',true); fetch(API+'/social-katalog',{method:'POST',body:fd}).then(function(r){return r.json();}).then(function(res){if(res.error){socialStatus('soc-kat-status',res.error,false);return;}socialStatus('soc-kat-status','Produkt hinzugefuegt!',true);document.getElementById('soc-kat-name').value='';document.getElementById('soc-kat-preis').value='';socialClearBild();socialLoadKatalog();}).catch(function(e){socialStatus('soc-kat-status','Fehler: '+e.message,false);}); };
  window.socialKatDelete=function(id){ if(!confirm('Produkt wirklich entfernen?'))return; fetch(API+'/social-katalog?id='+encodeURIComponent(id),{method:'DELETE'}).then(function(r){return r.json();}).then(function(res){if(res.error){socialStatus('soc-kat-status',res.error,false);return;}socialStatus('soc-kat-status','Entfernt',true);socialLoadKatalog();}).catch(function(e){socialStatus('soc-kat-status','Fehler: '+e.message,false);}); };
  window.socialKatImgChange=function(id,inp){ if(!inp||!inp.files||!inp.files[0])return; var file=inp.files[0]; var reader=new FileReader(); reader.onload=function(e){ var b64=e.target.result; var thumb=document.getElementById('soc-kat-thumb-'+id); if(thumb){if(thumb.tagName==='IMG'){thumb.src=b64;}else{var img=document.createElement('img');img.id='soc-kat-thumb-'+id;img.src=b64;img.style.cssText='width:44px;height:44px;object-fit:cover;border-radius:6px;border:1px solid #e5e7eb';thumb.parentNode.replaceChild(img,thumb);}} socialStatus('soc-kat-status','Bild wird hochgeladen...',true); fetch(API+'/social-katalog',{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify({id:id,bild_base64:b64})}).then(function(r){return r.json();}).then(function(res){if(res.error){socialStatus('soc-kat-status','Bild-Upload fehlgeschlagen: '+res.error,false);return;}socialStatus('soc-kat-status','Bild aktualisiert!',true);var item=_socialKatalog.find(function(p){return p.id===id;});if(item) item.bild_url=res.item&&res.item.bild_url?res.item.bild_url:b64;}).catch(function(err){socialStatus('soc-kat-status','Bild-Upload Fehler: '+err.message,false);}); }; reader.readAsDataURL(file); };
  // Strg+V paste handler for edit row
  window.socialKatEditPaste=function(id,e){ var items=e.clipboardData&&e.clipboardData.items; if(!items)return; for(var i=0;i<items.length;i++){if(items[i].type.indexOf('image')!==-1){e.preventDefault();var f=items[i].getAsFile();if(f){var reader=new FileReader();reader.onload=function(ev){var b64=ev.target.result;var zone=document.getElementById('soc-ed-paste-'+id);if(zone){zone.style.borderColor='#22c55e';zone.innerHTML='<img src="'+b64+'" style="max-width:80px;max-height:80px;border-radius:6px;border:1px solid #e5e7eb">';} socialKatImgChange(id,{files:[f]});};reader.readAsDataURL(f);}return;}} };

  // --- Category Manager ---
  // A curated list of useful Lucide icon names for food/shop categories
  var _socIconChoices=['utensils','cake-slice','apple','salad','coffee','beef','fish','egg-fried','milk','wheat','grape','carrot','cherry','citrus','cookie','croissant','drum','drumstick','ice-cream-cone','leaf','nut','pizza','popcorn','sandwich','soup','wine','beer','candy','shopping-basket','package','tag','store','heart','star','sun','flower','sprout','flame','snowflake','droplet','zap'];

  function socRenderKatManager(){
    var wrap=document.getElementById('soc-kat-manager-list');
    if(!wrap)return;
    if(!_socKategorien.length){wrap.innerHTML='<div style="color:#9ca3af;font-size:12px;padding:10px">Keine Kategorien geladen.</div>';return;}
    var html='';
    _socKategorien.forEach(function(k,idx){
      html+='<div style="display:flex;align-items:center;gap:8px;padding:6px 8px;background:'+(idx%2===0?'#fff':'#f9fafb')+';border-radius:6px;margin-bottom:2px">';
      html+='<span style="width:24px;height:24px;display:inline-flex;align-items:center;justify-content:center;color:#6b7280">'+lucideIcon(k.icon||'tag',18)+'</span>';
      html+='<span style="flex:1;font-weight:600;font-size:13px">'+esc(k.name)+'</span>';
      html+='<span style="font-size:10px;color:#9ca3af;background:#f3f4f6;padding:2px 6px;border-radius:4px">'+esc(k.icon||'tag')+'</span>';
      html+='<button onclick="socialKatMgrRemove('+idx+')" title="Entfernen" style="background:none;border:none;color:#dc2626;cursor:pointer;font-size:14px;padding:2px 4px">&times;</button>';
      html+='</div>';
    });
    wrap.innerHTML=html;
    if(window.lucide) try{lucide.createIcons();}catch(e){}
  }

  var _socIconFilter='';
  // German keyword → English Lucide icon name mapping for search
  var _socIconDeMap={'eis':'ice-cream','eiscreme':'ice-cream','getraenk':'cup-soda','trinken':'cup-soda','brot':'wheat','fleisch':'beef','rind':'beef','schwein':'ham','huhn':'drumstick','haehnchen':'drumstick','gemuese':'carrot','obst':'apple','frucht':'cherry','torte':'cake','kuchen':'cake','wein':'wine','bier':'beer','milch':'milk','kaese':'wedge','fisch':'fish','pizza':'pizza','suppe':'soup','kaffee':'coffee','tee':'coffee','salat':'salad','bonbon':'candy','blume':'flower','sonne':'sun','stern':'star','herz':'heart','feuer':'flame','wasser':'droplet','blatt':'leaf','nuss':'nut','traube':'grape','kirsche':'cherry','zitrone':'citrus','keks':'cookie','essen':'utensils','gabel':'utensils','messer':'utensils','tasse':'coffee','glas':'wine','flasche':'wine','korb':'shopping-basket','tuete':'shopping-bag','laden':'store','geschaeft':'store','paket':'package','lieferung':'truck','schneeflocke':'snowflake','kalt':'snowflake','heiss':'flame','frisch':'leaf','bio':'sprout','vegan':'sprout','popcorn':'popcorn'};
  function _socGetAllLucideIcons(){
    if(!window.lucide||!window.lucide.icons) return [];
    var names=[];
    for(var key in window.lucide.icons){
      // Convert PascalCase to kebab-case
      var kebab=key.replace(/([a-z])([A-Z])/g,'$1-$2').replace(/([A-Z])([A-Z][a-z])/g,'$1-$2').toLowerCase();
      names.push(kebab);
    }
    return names;
  }
  function socRenderIconPicker(){
    var grid=document.getElementById('soc-kat-icon-grid');
    if(!grid)return;
    var q=_socIconFilter.toLowerCase().trim();
    var filtered;
    if(!q){
      // No search: show curated icons
      filtered=_socIconChoices;
    } else {
      // Translate German search terms to English icon names
      var searchTerms=[q];
      if(_socIconDeMap[q]) searchTerms.push(_socIconDeMap[q]);
      // Also check partial German matches
      for(var de in _socIconDeMap){ if(de.indexOf(q)!==-1||q.indexOf(de)!==-1) searchTerms.push(_socIconDeMap[de]); }
      // Search ALL Lucide icons
      var allIcons=_socGetAllLucideIcons();
      if(!allIcons.length) allIcons=_socIconChoices; // fallback if lucide not loaded
      filtered=allIcons.filter(function(ic){
        for(var i=0;i<searchTerms.length;i++){ if(ic.indexOf(searchTerms[i])!==-1) return true; }
        return false;
      });
      // Limit results to prevent performance issues
      if(filtered.length>60) filtered=filtered.slice(0,60);
    }
    var html='';
    filtered.forEach(function(ic){
      var sel=document.getElementById('soc-kat-new-icon')&&document.getElementById('soc-kat-new-icon').value===ic;
      html+='<button type="button" onclick="socialKatMgrPickIcon(\''+ic+'\')" title="'+ic+'" style="width:36px;height:36px;border-radius:6px;border:2px solid '+(sel?'var(--c-green,#2e7d4f)':'#e5e7eb')+';background:'+(sel?'#f0fdf4':'#fff')+';cursor:pointer;display:inline-flex;align-items:center;justify-content:center;color:#374151">'+lucideIcon(ic,18)+'</button>';
    });
    if(!filtered.length) html='<div style="color:#9ca3af;font-size:11px;padding:8px">Kein Icon gefunden – versuche englische Begriffe (z.B. ice-cream, bread, cup)</div>';
    grid.innerHTML=html;
    if(window.lucide) try{lucide.createIcons();}catch(e){}
  }

  window.socialKatMgrPickIcon=function(iconName){
    var inp=document.getElementById('soc-kat-new-icon');
    if(inp) inp.value=iconName;
    var preview=document.getElementById('soc-kat-icon-preview');
    if(preview) preview.innerHTML=lucideIcon(iconName,20);
    socRenderIconPicker();
    if(window.lucide) try{lucide.createIcons();}catch(e){}
  };

  window.socialKatMgrFilterIcons=function(){
    var inp=document.getElementById('soc-kat-icon-search');
    _socIconFilter=inp?inp.value:'';
    socRenderIconPicker();
  };

  window.socialKatMgrAdd=function(){
    var nameInp=document.getElementById('soc-kat-new-name');
    var iconInp=document.getElementById('soc-kat-new-icon');
    var name=(nameInp?nameInp.value:'').trim();
    var icon=(iconInp?iconInp.value:'').trim()||'tag';
    if(!name){socialStatus('soc-kat-status','Kategoriename eingeben',false);return;}
    // Check duplicate
    for(var i=0;i<_socKategorien.length;i++){if(_socKategorien[i].name===name){socialStatus('soc-kat-status','Kategorie "'+name+'" existiert bereits',false);return;}}
    _socKategorien.push({name:name,icon:icon});
    socialKatMgrSave();
    if(nameInp) nameInp.value='';
    if(iconInp) iconInp.value='';
    _socIconFilter='';
    var search=document.getElementById('soc-kat-icon-search');
    if(search) search.value='';
  };

  window.socialKatMgrRemove=function(idx){
    if(!confirm('Kategorie "'+_socKategorien[idx].name+'" wirklich entfernen?'))return;
    _socKategorien.splice(idx,1);
    socialKatMgrSave();
  };

  function socialKatMgrSave(){
    socialStatus('soc-kat-status','Kategorien werden gespeichert...',true);
    fetch(API+'/cms-config',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({name:'katalog_kategorien',wert:JSON.stringify(_socKategorien)})})
    .then(function(r){return r.json();})
    .then(function(res){
      if(res.error){socialStatus('soc-kat-status','Fehler: '+res.error,false);return;}
      socialStatus('soc-kat-status','Kategorien gespeichert!',true);
      socPopulateKatSelects();
      socRenderKatManager();
      socialRenderKatalog();
    })
    .catch(function(e){socialStatus('soc-kat-status','Speichern fehlgeschlagen: '+e.message,false);});
  }

  window.socialKatMgrToggle=function(){
    var panel=document.getElementById('soc-kat-manager');
    if(!panel)return;
    if(panel.style.display==='none'){panel.style.display='';socRenderKatManager();socRenderIconPicker();}
    else{panel.style.display='none';}
  };

  // Expose _socKategorien for external access
  window._socKategorien_ref=function(){return _socKategorien;};

  // --- Post Builder ---
  function socialGetTodayMeals(){ if(new Date().getHours()>=11) return []; var d=new Date().getDay(); var todayCode=d===0?101006:101000+(d-1); var m=getMeals(); if(!m||!m.length) return []; return m.filter(function(mi){return mi.wochentag===todayCode&&mi.gericht&&mi.gericht.trim()&&mi.preis;}); }
  // _socCatIcons now built dynamically from _socKategorien via socCatIcon()
  var _socMtBilder={};
  var _socFreeItems=[];
  var _socFreeCounter=0;
  window._socialMtBilderLoaded=false;
  function socialLoadMtBilder(cb){ fetch(API+'/social-katalog?action=mt-bilder&base64=1').then(function(r){return r.json();}).then(function(res){ var bilder=res.bilder||{}; Object.keys(bilder).forEach(function(k){if(bilder[k].bild_base64) bilder[k].bild_url=bilder[k].bild_base64;}); _socMtBilder=bilder; window._socialMtBilderLoaded=true; if(cb)cb(); }).catch(function(){if(cb)cb();}); }

  // Expose for CMS wochenplan image rendering
  window.socialLoadMtBilder = socialLoadMtBilder;
  window._socMtBilder_ref = function(){ return _socMtBilder; };

  function socialBuildPostItems(){ var wrap=document.getElementById('soc-post-items'); if(!wrap)return; var todayMeals=socialGetTodayMeals(); var allCats=[]; _socialKatalog.forEach(function(p){var c=p.kategorie||'Sonstiges';if(allCats.indexOf(c)===-1)allCats.push(c);}); var html='';
    html+='<div id="soc-pick-selected" style="display:none;margin-bottom:10px;background:#f0fdf4;border:1px solid #86efac;border-radius:10px;padding:8px 12px"><div style="font-size:11px;font-weight:700;color:#16a34a;margin-bottom:4px">&#10003; Ausgew\u00e4hlt:</div><div id="soc-pick-tags"></div></div>';
    if(todayMeals.length){ var days=['Sonntag','Montag','Dienstag','Mittwoch','Donnerstag','Freitag','Samstag']; var today=days[new Date().getDay()]; html+='<div style="margin-bottom:10px;background:#fff8e1;border:1px solid #ffe082;border-radius:10px;padding:8px 12px"><div style="font-size:12px;font-weight:700;color:#f57f17;margin-bottom:5px">&#127869; Heutiges Mittagessen ('+esc(today)+')</div>';
      todayMeals.forEach(function(m){ var wpId='wp-'+m.id; var mtImg=_socMtBilder[m.gericht]; html+='<div class="soc-mt-row" style="display:flex;align-items:center;gap:8px;padding:8px 10px;background:#fff;border:2px solid #ffe082;border-radius:10px;margin-bottom:4px;min-height:44px"><label style="display:flex;align-items:center;gap:6px;flex:1;cursor:pointer"><input type="checkbox" class="soc-post-wp" value="'+esc(wpId)+'" data-name="'+esc(m.gericht)+'" data-preis="'+esc(m.preis?m.preis.toFixed(2):'')+'" data-kat="Mittagessen" data-img="'+esc(mtImg&&mtImg.bild_url?mtImg.bild_url:'')+'" onchange="socialPickUpdate()" style="width:18px;height:18px;accent-color:#f57f17">';
        if(mtImg&&mtImg.bild_url) html+='<img src="'+esc(mtImg.bild_url)+'" ondblclick="dlImagePopup(this.src,\''+esc(m.gericht).replace(/'/g,"\\'")+'\')" style="width:32px;height:32px;object-fit:cover;border-radius:4px;flex-shrink:0;cursor:zoom-in" onerror="this.style.display=\'none\'">';
        html+='<span style="font-weight:700;font-size:13px;flex:1">'+esc(m.gericht)+'</span>'; if(m.preis) html+='<span style="font-size:12px;color:#2e7d32;font-weight:700">'+m.preis.toFixed(2).replace('.',',')+' &#8364;</span>'; html+='</label>';
        html+='<label title="Bild hochladen" style="cursor:pointer;padding:6px 10px;border-radius:6px;background:#fff8e1;border:1px solid #ffe082;font-size:18px;flex-shrink:0;min-width:36px;min-height:36px;display:inline-flex;align-items:center;justify-content:center">&#128247;<input type="file" accept="image/*" onchange="socialMtBildUpload(this,\''+esc(m.gericht).replace(/'/g,"\\'")+'\')" style="display:none"></label>';
        html+='<button class="soc-mt-paste" data-gericht="'+esc(m.gericht).replace(/'/g,"&#39;")+'" onclick="socialMtPasteFocus(this)" title="Bild aus Zwischenablage" style="padding:4px 8px;border-radius:6px;background:#fff8e1;border:1px solid #ffe082;font-size:12px;cursor:pointer;flex-shrink:0">&#128203;</button></div>'; }); html+='</div>'; }
    // Free entry
    html+='<div style="margin-bottom:10px"><button onclick="socialFreeToggle()" style="width:100%;padding:12px 14px;background:#eff6ff;border:1px dashed #93c5fd;border-radius:10px;cursor:pointer;font-size:13px;font-weight:700;color:#2563eb;text-align:left;min-height:44px;box-sizing:border-box">&#10010; Produkt frei erfassen <span style="opacity:.5;font-weight:400">(ohne Katalog)</span></button>';
    html+='<div id="soc-free-form" style="display:none;margin-top:6px;background:#eff6ff;border:1px solid #93c5fd;border-radius:8px;padding:10px"><div style="display:flex;gap:6px;flex-wrap:wrap;align-items:flex-end"><div style="flex:2;min-width:140px"><label style="font-size:10px;font-weight:700;color:#6b7280;display:block">Name *</label><input id="soc-free-name" placeholder="z.B. Kartoffelsalat" style="width:100%;font-size:12px;padding:5px 8px;box-sizing:border-box;border:1px solid #d1d5db;border-radius:6px"></div><div style="width:70px"><label style="font-size:10px;font-weight:700;color:#6b7280;display:block">Preis &euro;</label><input id="soc-free-preis" type="text" inputmode="decimal" placeholder="3,50" style="width:100%;font-size:12px;padding:5px 8px;box-sizing:border-box;border:1px solid #d1d5db;border-radius:6px"></div><div style="flex:1;min-width:100px"><label style="font-size:10px;font-weight:700;color:#6b7280;display:block">Kategorie</label><select id="soc-free-kat" style="width:100%;font-size:12px;padding:5px 8px;box-sizing:border-box;border:1px solid #d1d5db;border-radius:6px">'+socKatOptionsHtml('')+'<option value="Sonstiges">Sonstiges</option></select></div><div style="width:56px"><label style="font-size:10px;font-weight:700;color:#6b7280;display:block">ab</label><select id="soc-free-ab" style="width:100%;font-size:12px;padding:5px 8px;box-sizing:border-box;border:1px solid #d1d5db;border-radius:6px"><option value="">ab</option><option value="10:00">10:00</option><option value="12:00">12:00</option></select></div></div>';
    html+='<div style="display:flex;gap:6px;align-items:center;margin-top:6px"><label style="cursor:pointer;padding:4px 10px;border-radius:6px;background:#fff;border:1px solid #d1d5db;font-size:11px;color:#374151">&#128247; Bild <input type="file" id="soc-free-bild" accept="image/*" capture="environment" onchange="socialFreeImgPreview()" style="display:none"></label><button onclick="socialFreePaste(this)" title="Bild einfuegen" style="padding:4px 8px;border-radius:6px;background:#fff;border:1px solid #d1d5db;font-size:11px;cursor:pointer;color:#374151">&#128203; Einf\u00fcgen</button><span id="soc-free-img-name" style="font-size:10px;color:#9ca3af;flex:1"></span><button onclick="socialFreeAdd()" style="background:#2563eb;color:#fff;padding:5px 14px;font-size:12px;font-weight:700;border:none;border-radius:6px;cursor:pointer">&#10003; Hinzuf\u00fcgen</button></div></div></div>';
    html+='<div id="soc-free-list">'+socialRenderFreeItems()+'</div>';
    // Katalog product picker
    if(_socialKatalog.length){ html+='<div style="margin-bottom:8px"><input id="soc-pick-search" type="text" placeholder="&#128269; Produkt suchen..." oninput="socialPickFilter()" style="width:100%;padding:8px 12px;border:1px solid #d1d5db;border-radius:8px;font-size:13px;outline:none;box-sizing:border-box"></div>';
      html+='<div style="display:flex;gap:5px;flex-wrap:wrap;margin-bottom:10px"><button class="soc-cat-chip soc-cat-active" data-cat="" onclick="socialPickCat(this)" style="padding:4px 10px;border-radius:16px;border:1px solid #d1d5db;background:#1f2937;color:#fff;font-size:11px;font-weight:700;cursor:pointer">Alle</button>';
      allCats.forEach(function(cat){ html+='<button class="soc-cat-chip" data-cat="'+esc(cat)+'" onclick="socialPickCat(this)" style="padding:4px 10px;border-radius:16px;border:1px solid #d1d5db;background:#fff;color:#374151;font-size:11px;font-weight:600;cursor:pointer;display:inline-flex;align-items:center;gap:3px">'+lucideIcon(socCatIcon(cat),14)+' '+esc(cat)+'</button>'; }); html+='</div>';
      html+='<div id="soc-pick-grid" style="max-height:340px;overflow-y:auto;border:1px solid #e5e7eb;border-radius:10px;padding:4px">';
      _socialKatalog.forEach(function(p){ var pid=esc(p.id); var priceStr=''; if(p.preis){var cp=parseFloat(p.preis);priceStr=(cp&&isFinite(cp)?cp.toFixed(2).replace('.',','):esc(p.preis))+'\u20AC';}
        html+='<div class="soc-pick-row" data-cat="'+esc(p.kategorie||'Sonstiges')+'" data-search="'+(p.name||'').toLowerCase()+'" style="display:flex;align-items:flex-start;gap:8px;padding:8px;border-radius:8px;margin-bottom:3px;border:1px solid transparent">';
        html+='<input type="checkbox" class="soc-post-cb" value="'+pid+'" onchange="socialPickUpdate()" style="width:20px;height:20px;accent-color:var(--c-green,#2e7d4f);flex-shrink:0;margin-top:2px">';
        html+='<div style="flex-shrink:0;position:relative"><div tabindex="0" data-pid="'+pid+'" onpaste="socialPickImgPaste(\''+pid+'\',event)" style="cursor:pointer;outline:none;border-radius:6px;position:relative">';
        if(p.bild_url) html+='<img id="soc-pick-img-'+pid+'" src="'+esc(p.bild_url)+'" ondblclick="dlImagePopup(this.src,\''+esc(p.name).replace(/'/g,"\\'")+'\')" style="width:40px;height:40px;object-fit:cover;border-radius:6px;border:1px solid #e5e7eb;display:block;cursor:zoom-in" onerror="this.style.display=\'none\'">';
        else html+='<div id="soc-pick-img-'+pid+'" style="width:40px;height:40px;background:#f3f4f6;border-radius:6px;display:flex;align-items:center;justify-content:center;color:#9ca3af;border:1px solid #e5e7eb">'+lucideIcon('camera',18)+'</div>';
        html+='<input type="file" accept="image/*" capture="environment" onchange="socialPickImgChange(\''+pid+'\',this)" style="display:none"></div>';
        html+='<button type="button" onclick="this.parentNode.querySelector(\'input[type=file]\').click()" style="position:absolute;bottom:-3px;right:-3px;width:22px;height:22px;border-radius:50%;background:#fff;border:1px solid #d1d5db;font-size:12px;cursor:pointer;display:flex;align-items:center;justify-content:center;padding:0;box-shadow:0 1px 3px rgba(0,0,0,.12)" title="Bild \u00e4ndern">&#128247;</button></div>';
        html+='<div style="flex:1;min-width:0"><div style="font-weight:600;font-size:13px;line-height:1.3;word-break:break-word;color:#1f2937">'+esc(p.name)+'</div><div style="display:flex;align-items:center;gap:6px;margin-top:3px;flex-wrap:wrap">';
        var priceVal=p.preis?parseFloat(p.preis):''; if(priceVal&&isFinite(priceVal)) priceVal=priceVal.toFixed(2).replace('.',','); else priceVal='';
        html+='<input type="text" inputmode="decimal" class="soc-pick-preis" data-id="'+pid+'" value="'+priceVal+'" placeholder="\u20AC" style="width:60px;font-size:11px;padding:2px 4px;border:1px solid #d1d5db;border-radius:4px;color:#2e7d32;font-weight:700;text-align:right">';
        html+='<select class="soc-pick-ab" data-id="'+pid+'" style="font-size:11px;padding:2px 6px;border:1px solid #d1d5db;border-radius:4px;background:#fff;color:#6b7280;min-height:26px"><option value="">ab</option><option value="10:00">10:00</option><option value="12:00">12:00</option></select></div></div></div>'; });
      html+='</div><div id="soc-pick-count" style="font-size:10px;color:#9ca3af;text-align:right;margin-top:2px">'+_socialKatalog.length+' Produkte</div>';
    } else if(!todayMeals.length){ html+='<p style="color:#9ca3af;font-size:12px;font-style:italic">Noch keine Produkte im Katalog.</p>'; }
    wrap.innerHTML=html;
  }

  function socialRenderFreeItems(){ if(!_socFreeItems.length) return ''; var h=''; _socFreeItems.forEach(function(fi){ h+='<div data-id="'+esc(fi.id)+'" style="display:flex;align-items:center;gap:6px;padding:5px 8px;margin-bottom:3px;background:#eff6ff;border:1px solid #93c5fd;border-radius:8px">'; if(fi.bild_data) h+='<img src="'+fi.bild_data+'" style="width:28px;height:28px;object-fit:cover;border-radius:4px;flex-shrink:0">'; h+='<span style="font-weight:600;font-size:12px;flex:1">'+esc(fi.name)+(fi.ab_uhr?' <span style="font-size:10px;color:#9ca3af;font-style:italic">ab '+esc(fi.ab_uhr)+'</span>':'')+'</span>'; if(fi.preis) h+='<span style="font-size:11px;color:#2e7d32;font-weight:700">'+esc(fi.preis)+'\u20AC</span>'; h+='<span style="font-size:10px;color:#6b7280;background:#e0e7ff;padding:1px 6px;border-radius:8px">'+esc(fi.kategorie)+'</span>'; h+='<button onclick="socialFreeRemove(\''+esc(fi.id)+'\')" style="border:none;background:none;color:#dc2626;cursor:pointer;font-size:14px;padding:0 4px">&#10005;</button></div>'; }); return h; }
  window.socialFreeToggle=function(){var f=document.getElementById('soc-free-form');if(f) f.style.display=f.style.display==='none'?'block':'none';};
  window.socialFreeImgPreview=function(){var inp=document.getElementById('soc-free-bild');var lbl=document.getElementById('soc-free-img-name');if(inp&&inp.files&&inp.files[0]&&lbl) lbl.textContent=inp.files[0].name;window._socFreePastedData='';};
  var _socFreePasteActive=false; window._socFreePastedData='';
  window.socialFreePaste=function(btn){_socFreePasteActive=true;btn.style.background='#fef08a';btn.textContent='\u23F3 Strg+V';setTimeout(function(){btn.style.background='#fff';btn.textContent='\uD83D\uDCCB Einf\u00fcgen';_socFreePasteActive=false;},4000);};
  document.addEventListener('paste',function(e){if(!_socFreePasteActive)return;var items=e.clipboardData&&e.clipboardData.items;if(!items)return;for(var i=0;i<items.length;i++){if(items[i].type.indexOf('image')!==-1){var blob=items[i].getAsFile();var reader=new FileReader();reader.onload=function(ev){window._socFreePastedData=ev.target.result;var lbl=document.getElementById('soc-free-img-name');if(lbl) lbl.textContent='\u2705 Bild eingef\u00fcgt';_socFreePasteActive=false;};reader.readAsDataURL(blob);e.preventDefault();break;}}});
  window.socialFreeAdd=function(){var name=(document.getElementById('soc-free-name').value||'').trim();var preis=(document.getElementById('soc-free-preis').value||'').trim();var kat=document.getElementById('soc-free-kat').value;if(!name){socialStatus('soc-post-status','Bitte Name eingeben',false);return;}var bildInp=document.getElementById('soc-free-bild');var preisNum=parseFloat(preis.replace(',','.'));var abUhr=(document.getElementById('soc-free-ab')||{}).value||'';var fi={id:'free-'+(++_socFreeCounter),name:name,preis:preisNum&&isFinite(preisNum)?preisNum.toFixed(2):'',kategorie:kat,bild_data:'',ab_uhr:abUhr};function finish(){_socFreeItems.push(fi);var list=document.getElementById('soc-free-list');if(list) list.innerHTML=socialRenderFreeItems();document.getElementById('soc-free-name').value='';document.getElementById('soc-free-preis').value='';var abSel2=document.getElementById('soc-free-ab');if(abSel2) abSel2.value='';if(bildInp) bildInp.value='';var lbl=document.getElementById('soc-free-img-name');if(lbl) lbl.textContent='';window._socFreePastedData='';socialPickUpdate();}if(window._socFreePastedData){fi.bild_data=window._socFreePastedData;finish();}else if(bildInp&&bildInp.files&&bildInp.files[0]){var reader=new FileReader();reader.onload=function(e){fi.bild_data=e.target.result;finish();};reader.readAsDataURL(bildInp.files[0]);}else{finish();}};
  function socialPickImgUpload(prodId,b64){var thumb=document.getElementById('soc-pick-img-'+prodId);if(thumb){if(thumb.tagName==='IMG'){thumb.src=b64;}else{var img=document.createElement('img');img.id='soc-pick-img-'+prodId;img.src=b64;img.style.cssText='width:40px;height:40px;object-fit:cover;border-radius:6px;border:1px solid #e5e7eb;display:block;cursor:zoom-in';img.ondblclick=function(){window.dlImagePopup(img.src,prodId);};thumb.parentNode.replaceChild(img,thumb);}}var item=_socialKatalog.find(function(p){return p.id===prodId;});if(item) item.bild_url=b64;socialStatus('soc-post-status','Bild tempor\u00e4r ge\u00e4ndert',true);socialGenPreview();}
  window.socialPickImgChange=function(prodId,inp){if(!inp||!inp.files||!inp.files[0])return;var reader=new FileReader();reader.onload=function(e){socialPickImgUpload(prodId,e.target.result);};reader.readAsDataURL(inp.files[0]);};
  window.socialPickImgPaste=function(prodId,e){var items=e.clipboardData&&e.clipboardData.items;if(!items)return;for(var i=0;i<items.length;i++){if(items[i].type.indexOf('image')!==-1){e.preventDefault();var f=items[i].getAsFile();if(f){var reader=new FileReader();reader.onload=function(ev){socialPickImgUpload(prodId,ev.target.result);};reader.readAsDataURL(f);}return;}}};
  window.socialPickImgPreview=function(prodId){var img=document.getElementById('soc-pick-img-'+prodId);if(!img)return;var src=img.tagName==='IMG'?img.src:'';if(!src)return;var item=_socialKatalog.find(function(p){return p.id===prodId;});var name=item?item.name:'';var old=document.getElementById('soc-img-popup');if(old)old.remove();var ov=document.createElement('div');ov.id='soc-img-popup';ov.style.cssText='position:fixed;inset:0;z-index:9999;background:rgba(0,0,0,.85);display:flex;flex-direction:column;align-items:center;justify-content:center;padding:16px;cursor:pointer';ov.onclick=function(){ov.remove();};var im=document.createElement('img');im.src=src;im.style.cssText='max-width:90vw;max-height:75vh;object-fit:contain;border-radius:12px;box-shadow:0 8px 32px rgba(0,0,0,.4)';ov.appendChild(im);if(name){var lbl=document.createElement('div');lbl.textContent=name;lbl.style.cssText='color:#fff;font-size:15px;font-weight:600;margin-top:12px;text-align:center;max-width:90vw;word-break:break-word';ov.appendChild(lbl);}var cls=document.createElement('button');cls.textContent='\u2715';cls.style.cssText='position:absolute;top:12px;right:16px;background:rgba(255,255,255,.2);border:none;color:#fff;font-size:24px;width:40px;height:40px;border-radius:50%;cursor:pointer;display:flex;align-items:center;justify-content:center';cls.onclick=function(e){e.stopPropagation();ov.remove();};ov.appendChild(cls);document.body.appendChild(ov);};
  window.socialFreeRemove=function(id){_socFreeItems=_socFreeItems.filter(function(f){return f.id!==id;});var list=document.getElementById('soc-free-list');if(list) list.innerHTML=socialRenderFreeItems();socialPickUpdate();};
  window.socialMtBildUpload=function(input,gericht){if(!input.files||!input.files[0])return;var fd=new FormData();fd.append('gericht',gericht);fd.append('bild',input.files[0]);socialStatus('soc-post-status','Bild wird hochgeladen...',true);fetch(API+'/social-katalog?action=mt-bild',{method:'POST',body:fd}).then(function(r){return r.json();}).then(function(res){if(res.error){socialStatus('soc-post-status',res.error,false);return;}socialStatus('soc-post-status','Bild f\u00fcr "'+gericht+'" gespeichert!',true);_socMtBilder[gericht]={bild_url:res.bild_url};socialUpdateMtThumb(gericht,res.bild_url);}).catch(function(e){socialStatus('soc-post-status','Upload-Fehler: '+e.message,false);});};
  function socialUpdateMtThumb(gericht,url){var rows=document.querySelectorAll('.soc-mt-row');for(var i=0;i<rows.length;i++){var cb=rows[i].querySelector('.soc-post-wp');if(!cb)continue;if(cb.getAttribute('data-name')!==gericht)continue;var lbl=cb.closest('label');if(!lbl)continue;var existing=lbl.querySelector('img');if(existing){existing.src=url;}else{var img=document.createElement('img');img.src=url;img.style.cssText='width:32px;height:32px;object-fit:cover;border-radius:4px;flex-shrink:0';img.onerror=function(){this.style.display='none';};cb.parentNode.insertBefore(img,cb.nextSibling);}break;}socialGenPreview();}
  var _socMtPasteTarget=null;
  window.socialMtPasteFocus=function(btn){_socMtPasteTarget=btn.getAttribute('data-gericht');btn.style.background='#fef08a';btn.textContent='\u23F3 Strg+V';setTimeout(function(){btn.style.background='#fff8e1';btn.textContent='\uD83D\uDCCB';},3000);};
  document.addEventListener('paste',function(e){if(!_socMtPasteTarget)return;var items=e.clipboardData&&e.clipboardData.items;if(!items)return;for(var i=0;i<items.length;i++){if(items[i].type.indexOf('image/')===0){e.preventDefault();var file=items[i].getAsFile();var gericht=_socMtPasteTarget;_socMtPasteTarget=null;var fd=new FormData();fd.append('gericht',gericht);fd.append('bild',file);socialStatus('soc-post-status','Bild wird hochgeladen...',true);fetch(API+'/social-katalog?action=mt-bild',{method:'POST',body:fd}).then(function(r){return r.json();}).then(function(res){if(res.error){socialStatus('soc-post-status',res.error,false);return;}socialStatus('soc-post-status','Bild f\u00fcr "'+gericht+'" eingef\u00fcgt!',true);_socMtBilder[gericht]={bild_url:res.bild_url};socialUpdateMtThumb(gericht,res.bild_url);}).catch(function(err){socialStatus('soc-post-status','Paste-Fehler: '+err.message,false);});return;}}});
  window.socialPickFilter=function(){var q=(document.getElementById('soc-pick-search').value||'').toLowerCase().trim();var activeCat=document.querySelector('.soc-cat-chip.soc-cat-active');var catFilter=activeCat?activeCat.getAttribute('data-cat'):'';var rows=document.querySelectorAll('#soc-pick-grid .soc-pick-row');var shown=0;rows.forEach(function(row){var name=row.getAttribute('data-search')||'';var cat=row.getAttribute('data-cat')||'';var matchQ=!q||name.indexOf(q)!==-1;var matchCat=!catFilter||cat===catFilter;row.style.display=(matchQ&&matchCat)?'flex':'none';if(matchQ&&matchCat)shown++;});var cnt=document.getElementById('soc-pick-count');if(cnt) cnt.textContent=shown+' / '+_socialKatalog.length+' Produkte';};
  window.socialPickCat=function(btn){document.querySelectorAll('.soc-cat-chip').forEach(function(c){c.classList.remove('soc-cat-active');c.style.background='#fff';c.style.color='#374151';});btn.classList.add('soc-cat-active');btn.style.background='#1f2937';btn.style.color='#fff';socialPickFilter();};
  window.socialPickUpdate=function(){var sel=socialGatherSelected();var box=document.getElementById('soc-pick-selected');var tags=document.getElementById('soc-pick-tags');if(!box||!tags)return;if(!sel.length){box.style.display='none';return;}box.style.display='block';var html='';sel.forEach(function(p){html+='<span style="display:inline-block;background:#dcfce7;color:#15803d;font-size:11px;font-weight:600;padding:3px 8px;border-radius:12px;margin:2px 3px 2px 0">'+esc(p.name);if(p.preis){var tp=parseFloat(p.preis);html+=' <span style="opacity:.7">'+(tp&&isFinite(tp)?tp.toFixed(2).replace('.',','):esc(p.preis))+'\u20AC</span>';}html+='</span>';});tags.innerHTML=html;document.querySelectorAll('#soc-pick-grid .soc-pick-row').forEach(function(row){var cb=row.querySelector('input[type=checkbox]');var isChecked=cb&&cb.checked;row.style.background=isChecked?'#f0fdf4':'#fff';row.style.borderColor=isChecked?'#86efac':'transparent';});var mealPosterWrap=document.getElementById('soc-meal-posters');if(mealPosterWrap) mealPosterWrap.style.display='none';if(sel.length) socialGenPreview();};
  function socialGatherSelected(){var selected=[];document.querySelectorAll('.soc-post-wp:checked').forEach(function(cb){selected.push({id:cb.value,name:cb.getAttribute('data-name')||'',preis:cb.getAttribute('data-preis')||'',kategorie:cb.getAttribute('data-kat')||'Mittagessen',bild_url:cb.getAttribute('data-img')||''});});document.querySelectorAll('.soc-post-cb:checked').forEach(function(cb){var item=_socialKatalog.find(function(p){return p.id===cb.value;});if(item){var copy={id:item.id,name:item.name,preis:item.preis,kategorie:item.kategorie,bild_url:item.bild_url};var abSel=document.querySelector('.soc-pick-ab[data-id="'+item.id+'"]');if(abSel&&abSel.value) copy.ab_uhr=abSel.value;var preisInp=document.querySelector('.soc-pick-preis[data-id="'+item.id+'"]');if(preisInp&&preisInp.value){var pv=parseFloat(preisInp.value.replace(',','.'));copy.preis=pv&&isFinite(pv)?pv.toFixed(2):'';}else{copy.preis='';}selected.push(copy);}});_socFreeItems.forEach(function(fi){var o={id:fi.id,name:fi.name,preis:fi.preis,kategorie:fi.kategorie};if(fi.ab_uhr) o.ab_uhr=fi.ab_uhr;if(fi.bild_data) o.bild_url=fi.bild_data;selected.push(o);});return selected;}

  // --- Poster drawing + sharing (loaded from social-poster.js) ---
  // These are heavy functions, kept in a separate continuation
  window._socialModule={esc:esc,API:API,socialStatus:socialStatus,socialGatherSelected:socialGatherSelected,getFeatureFlags:getFeatureFlags,_socialKatalog:function(){return _socialKatalog;},_socMtBilder:function(){return _socMtBilder;},_socFreeItems:function(){return _socFreeItems;},socialGetTodayMeals:socialGetTodayMeals,socialDrawPoster:null,socialDrawMealPosterAuto:null,socialWrapText:null,socialBuildPostItems:socialBuildPostItems,socialInitBildHandlers:socialInitBildHandlers};

  // Init when DOM ready
  if(document.readyState==='loading'){document.addEventListener('DOMContentLoaded',socialInitBildHandlers);}else{socialInitBildHandlers();}
})();
