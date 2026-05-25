(function(){
  // --- CMS Password Gate ---
  var CMS_PW_KEY='cms_auth_ok';
  var cmsPwEl=document.getElementById('cms-pw-hash');
  var cmsPwHash=cmsPwEl?JSON.parse(cmsPwEl.textContent):'';
  function cmsShowApp(){document.getElementById('cms-login').style.display='none';document.getElementById('cms-app').style.display='';}
  function cmsShowLogin(){document.getElementById('cms-login').style.display='';document.getElementById('cms-app').style.display='none';}

  function sha256(str){
    var buf=new TextEncoder().encode(str);
    return crypto.subtle.digest('SHA-256',buf).then(function(h){
      return Array.from(new Uint8Array(h)).map(function(b){return b.toString(16).padStart(2,'0');}).join('');
    });
  }

  // Check session
  if(sessionStorage.getItem(CMS_PW_KEY)===cmsPwHash){
    cmsShowApp();
  } else {
    cmsShowLogin();
  }

  // Login button
  document.getElementById('cms-login-btn').addEventListener('click',function(){
    var pw=document.getElementById('cms-login-pw').value;
    sha256(pw).then(function(hash){
      if(hash===cmsPwHash){
        sessionStorage.setItem(CMS_PW_KEY,hash);
        document.getElementById('cms-login-err').style.display='none';
        cmsShowApp();
        init();
      } else {
        document.getElementById('cms-login-err').style.display='block';
        document.getElementById('cms-login-pw').value='';
        document.getElementById('cms-login-pw').focus();
      }
    });
  });
  // Enter key
  document.getElementById('cms-login-pw').addEventListener('keydown',function(e){
    if(e.key==='Enter') document.getElementById('cms-login-btn').click();
  });
  // Password eye toggle
  document.getElementById('cms-pw-eye').addEventListener('click',function(){
    var inp=document.getElementById('cms-login-pw');
    inp.type=inp.type==='password'?'text':'password';
  });

  var API = '/api';

  // --- Load Version ---
  (function(){
    var el=document.getElementById('cms-version');
    if(!el)return;
    fetch('/version.json?t='+Date.now()).then(function(r){return r.json();}).then(function(v){
      el.textContent='v'+v.version+' (Build '+v.build+')';
    }).catch(function(){});
  })();

  // --- Load CMS Header Logo from Dataverse ---
  (function(){
    var el=document.getElementById('cms-header-logo');
    if(!el)return;
    fetch(API+'/logo').then(function(r){return r.json();}).then(function(res){
      if(res.success&&res.logo) el.src=res.logo;
    }).catch(function(){});
  })();
  
  // --- Load Artikel Data from Azure Function API ---  
  async function loadArtikelData() {
    try {
      const response = await fetch(API + '/preisliste');
      if (!response.ok) {
        console.error('Preisliste API failed:', response.status, response.statusText);
        return;
      }
      const data = await response.json();
      if (data && data.groups) {
        const artikelData = [];
        Object.keys(data.groups).forEach(function(wg){
          (data.groups[wg]||[]).forEach(function(item){
            if(!item.bezeichnung) return;
            artikelData.push({
              b: item.bezeichnung,
              bt: item.bezeichnung,
              nr: item.artikelnummer || '',
              sc: item.strichcode || '',
              p: item.vk || 0,
              details: '',
              preis: item.vk || 0,
              statt_preis: item.angebot_statt || item.uvp || 0,
              wg: wg,
              produktVal: item.bezeichnung
            });
          });
        });
        _artikelCache = artikelData;
        console.log('[CMS] Artikel cache loaded from Preisliste:', _artikelCache.length, 'items');
      }
    } catch (error) {
      console.error('Error loading artikel data:', error);
    }
  }
  
  var aktionen = [];
  var _angWeekFilter = 'this';
  var angRowCounter = 0;

  function toIsoDateOnly(v){
    if(!v) return '';
    var s=String(v);
    return s.length>=10?s.substring(0,10):s;
  }
  function weekBounds(mode){
    var d=new Date();
    // Ab Samstag: "Diese Woche" = nächste KW
    if(d.getDay()===0||d.getDay()===6) d.setDate(d.getDate()+(d.getDay()===0?1:2));
    if(mode==='next') d.setDate(d.getDate()+7);
    var day=(d.getDay()+6)%7;
    var mon=new Date(d);mon.setDate(d.getDate()-day);mon.setHours(0,0,0,0);
    var sun=new Date(mon);sun.setDate(mon.getDate()+6);sun.setHours(23,59,59,999);
    return {mon:mon,sun:sun};
  }
  function parseIsoDateSafe(s){
    if(!s) return null;
    var p=String(s).substring(0,10).split('-');
    if(p.length!==3) return null;
    return new Date(+p[0],(+p[1])-1,+p[2]);
  }
  function isAktionInWeek(a,mode){
    if(mode==='all') return true;
    var w=weekBounds(mode);
    var von=parseIsoDateSafe(a.von),bis=parseIsoDateSafe(a.bis);
    if(!von||!bis) return true;
    return von<=w.sun && bis>=w.mon;
  }

  function renderAktionenList(){
    var c=document.getElementById('cms-akt-list');
    c.innerHTML='';
    var filtered=aktionen.filter(function(a){return isAktionInWeek(a,_angWeekFilter);});
    if(filtered.length===0){
      document.getElementById('cms-ang-empty').style.display='';
      return;
    }
    document.getElementById('cms-ang-empty').style.display='none';

    filtered.forEach(function(g){
      var card=document.createElement('div');
      card.className='cms-card';
      var h='';
      h+='<div class="cms-flex cms-between cms-ang-toggle" style="padding:12px 12px 10px 12px" data-action="toggleAngItems">';
      h+='<div style="display:flex;align-items:center"><div><div style="font-weight:700;color:#1f2937">'+esc(g.titel||'Angebot')+'</div>';
      h+='<div class="cms-ang-meta">'+toIsoDateOnly(g.von)+' bis '+toIsoDateOnly(g.bis)+' · '+g.items.length+' Artikel</div></div>';
      h+='<span class="cms-ang-chevron collapsed">&#9660;</span></div>';
      h+='<div style="display:flex;gap:6px;flex-wrap:wrap;justify-content:flex-end">';
      h+='<button class="cms-btn cms-btn-sm cms-btn-gray" data-action="editAktion" data-id="'+esc(g.aktion_id)+'">Bearbeiten</button>';
      h+='<button class="cms-btn-preview" data-action="previewAktion" data-id="'+esc(g.aktion_id)+'"><svg viewBox="0 0 24 24"><path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z"/></svg>Vorschau</button>';
      h+='<button class="cms-btn-wa" data-action="shareAktion" data-id="'+esc(g.aktion_id)+'"><svg viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.654-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347"/></svg>Teilen</button>';
      h+='<button class="cms-btn-trash" data-action="deleteAktion" data-id="'+esc(g.aktion_id)+'" title="Löschen"><svg viewBox="0 0 24 24"><path d="M9 3h6l1 2h4v2H4V5h4l1-2zm1 6h2v9h-2V9zm4 0h2v9h-2V9zM7 9h2v9H7V9z"/></svg></button>';
      h+='</div></div>';
      h+='<div class="cms-ang-items collapsed">';
      g.items.forEach(function(a){
        h+='<div class="cms-ang-item">';
        h+='<div class="cms-ang-name">'+esc(a.produkt)+'</div>';
        if(a.preis!=null)h+='<div class="cms-ang-price">'+fmtP(Number(a.preis)||0)+'</div>';
        if(a.statt_preis!=null)h+='<div class="cms-ang-old">statt '+fmtP(Number(a.statt_preis)||0)+'</div>';
        h+='</div>';
      });
      h+='</div>';
      card.innerHTML=h;
      c.appendChild(card);
    });
  }

  window.cmsFilterWeek=function(mode){
    _angWeekFilter=mode||'this';
    var nav=document.getElementById('cms-ang-week-nav');
    if(nav){
      nav.querySelectorAll('button[data-week]').forEach(function(b){
        b.className='cms-btn cms-btn-sm '+(b.getAttribute('data-week')===_angWeekFilter?'cms-btn-primary':'cms-btn-gray');
      });
    }
    renderAktionenList();
  };

  function loadAngebote(){
    var ldEl=document.getElementById('cms-ang-loading');
    if(ldEl)ldEl.style.display='';
    document.getElementById('cms-akt-list').innerHTML='';
    document.getElementById('cms-ang-empty').style.display='none';
    fetch(API+'/angebote')
      .then(function(r){return r.json();})
      .then(function(data){
        angebote=[];
        (data.data||data.value||[]).forEach(function(a){
          angebote.push({
            id:a.dl_angeboteid||a.id||'',
            produkt:a.dl_produkt||a.name||a.produkt||'',
            details:a.dl_details||a.details||'',
            preis:(a.dl_preis!=null?a.dl_preis:a.price),
            statt_preis:(a.dl_statt_preis!=null?a.dl_statt_preis:a.old_price),
            artikelnummer:a.dl_artikelnummer||a.artikelnummer||'',
            bild_data:a.dl_bild_base64||a.bild_data||'',
            dl_werbebildid:a.dl_werbebildid||'',
            aktion_titel:a.dl_aktion_titel||a.aktion_titel||'',
            aktion_id:a.dl_aktion_id||a.aktion_id||'',
            gueltig_von:toIsoDateOnly(a.dl_gueltig_von||a.valid_from||a.gueltig_von||''),
            gueltig_bis:toIsoDateOnly(a.dl_gueltig_bis||a.valid_to||a.gueltig_bis||''),
            sortierung:a.dl_sortierung||a.sortierung||0,
            status:a.dl_status||a.status||101001
          });
        });
        // Group by aktion_id
        var map={};
        angebote.forEach(function(a){
          var key=a.aktion_id||('AUTO-'+(a.gueltig_von||'')+'-'+(a.gueltig_bis||'')+'-'+(a.aktion_titel||a.produkt||''));
          if(!map[key]) map[key]={aktion_id:key,titel:a.aktion_titel||'Angebot',von:a.gueltig_von,bis:a.gueltig_bis,items:[]};
          map[key].items.push(a);
        });
        aktionen=Object.keys(map).map(function(k){
          var g=map[k];
          g.items.sort(function(x,y){return (x.sortierung||0)-(y.sortierung||0);});
          return g;
        }).sort(function(a,b){return (b.von||'').localeCompare(a.von||'');});
        renderAktionenList();
      })
      .catch(function(e){toast('Fehler: '+e.message,'error');})
      .then(function(){if(ldEl)ldEl.style.display='none';});
  }

  function addAngRow(item){
    angRowCounter++;
    var c=document.getElementById('cms-akt-items');
    if(!c) return;
    var row=document.createElement('div');
    row.className='cms-ang-row';
    row.id='cms-ar-'+angRowCounter;
    var produktVal=esc((item&&item.produkt)||'');
    var hasBild=!!(item&&item.bild_data);
    row.innerHTML=''
      +'<div class="cms-ang-row-num">'+angRowCounter+'</div>'
      +'<button type="button" class="cms-ang-row-close" data-action="removeAngRow">&times;</button>'
      +'<div class="cms-ang-fields">'
      +'<input type="hidden" data-f="id" value="'+esc((item&&item.id)||'')+'">'
      +'<input type="hidden" data-f="bild_data" value="'+esc((item&&item.bild_data)||'')+'">'
      +'<input type="hidden" data-f="dl_werbebildid" value="'+esc((item&&item.dl_werbebildid)||'')+'">'
      +'<div class="cms-ang-row-img">'
      +'<img class="cms-bild-preview" src="'+(hasBild?esc(item.bild_data):'')+'" style="width:36px;height:36px;object-fit:cover;border-radius:4px;border:1px solid #e5e7eb;background:#fff;'+(hasBild?'':'display:none')+'">'
      +'<button class="cms-bild-clear" type="button" title="Bild entfernen" data-action="clearBild" style="font-size:11px;color:#9ca3af;background:none;border:none;cursor:pointer;padding:0 2px;'+(hasBild?'':'display:none')+'">✕</button>'
      +'<button class="cms-bild-upload-sp" data-action="uploadBildSP" data-row="'+angRowCounter+'" type="button" title="Bild auswählen & in StrichcodeBilder hochladen" style="font-size:14px;background:none;border:none;cursor:pointer;padding:0 2px;color:#6b7280">📁</button>'
      +'</div>'
      +'<div class="cms-art-wrap"><input class="cms-input cms-art-input" data-f="produkt" placeholder="Produkt..." value="'+produktVal+'" autocomplete="off" spellcheck="false"><div class="cms-art-dd"></div></div>'
      +'<input class="cms-input" data-f="details" placeholder="Details" value="'+esc((item&&item.details)||'')+'">'
      +'<input class="cms-input cms-price" data-f="preis" placeholder="VK" value="'+((item&&item.preis!=null)?fmtDePrice(item.preis):'')+'">'
      +'<input class="cms-input cms-price" data-f="statt_preis" placeholder="Aktion" value="'+((item&&item.statt_preis!=null)?fmtDePrice(item.statt_preis):'')+'">'
      +'<input class="cms-input" data-f="artikelnummer" placeholder="ArtNr/SC" value="'+esc((item&&item.artikelnummer)||'')+'">'
      +'</div>';
    c.appendChild(row);
    var prodInp=row.querySelector('.cms-art-input');
    if(prodInp){
      prodInp.addEventListener('input',function(e){console.log('[CMS] Input:',this.value);artSearchFilter(this);});
      prodInp.addEventListener('focus',function(){artSearchFilter(this);});
      prodInp.addEventListener('blur',function(){setTimeout(function(){var wrap=prodInp.parentElement;if(wrap){var dd=wrap.querySelector('.cms-art-dd');if(dd&&!dd.contains(document.activeElement)&&!dd.matches(':hover'))dd.classList.remove('open');}},200);});
    }
    renumberAngRows();
  }

  function renumberAngRows(){
    var rows=document.querySelectorAll('#cms-akt-items .cms-ang-row');
    rows.forEach(function(r,i){
      var b=r.querySelector('.cms-ang-row-num');
      if(b)b.textContent=''+(i+1);
    });
    angRowCounter=rows.length;
  }

  function nextWeekMonSat(){
    var now=new Date();
    var day=now.getDay(); // 0=So,1=Mo,...6=Sa
    var daysUntilNextMon=(day===0?1:8-day);
    var mon=new Date(now);mon.setDate(now.getDate()+daysUntilNextMon);mon.setHours(0,0,0,0);
    var sat=new Date(mon);sat.setDate(mon.getDate()+5);
    return {mon:mon,sat:sat};
  }
  function getISOWeek(d){
    var t=new Date(Date.UTC(d.getFullYear(),d.getMonth(),d.getDate()));
    t.setUTCDate(t.getUTCDate()+4-(t.getUTCDay()||7));
    var y=new Date(Date.UTC(t.getUTCFullYear(),0,1));
    return Math.ceil(((t-y)/86400000+1)/7);
  }

  function showAktionModal(aktion){
    var isEdit=!!aktion;
    var defVon='',defBis='',defTitel='Sonderangebote';
    if(!isEdit){
      var nw=nextWeekMonSat();
      defVon=fmtISO(nw.mon);
      defBis=fmtISO(nw.sat);
      defTitel='Sonderangebote KW'+getISOWeek(nw.mon);
    }
    var html='<div class="cms-modal-bg" style="align-items:flex-start;overflow-y:auto;padding:12px 6px">'
      +'<div class="cms-modal" style="max-width:980px;max-height:92vh;height:auto;display:flex;flex-direction:column;position:relative;margin:10px auto;overflow:hidden;padding:0;border-radius:20px;box-shadow:0 24px 64px rgba(0,0,0,0.18)">'
      +'<div class="cms-modal-header" style="display:flex;align-items:center;justify-content:space-between;padding:14px 20px;background:#f9fafb;border-bottom:1px solid #e5e7eb;position:sticky;top:0;z-index:100;flex-shrink:0;width:100%;box-sizing:border-box">'
        +'<h3 style="margin:0;font-size:15px;font-weight:800;color:var(--c-m-pri);text-transform:uppercase;letter-spacing:0.5px;">'+(isEdit?'✏️ Aktion bearbeiten':'🆕 Neue Aktion erstellen')+'</h3>'
        +'<div style="display:flex;gap:8px;">'
          +'<button class="cms-btn cms-btn-primary" data-action="saveAktion" style="padding:8px 18px;font-size:13px;font-weight:700;box-shadow:0 2px 8px rgba(22,163,74,0.25)">💾 Speichern</button>'
          +'<button class="cms-btn cms-btn-gray" data-action="closeModal" style="padding:8px 14px;font-size:13px;font-weight:600">Abbrechen</button>'
        +'</div>'
      +'</div>'
      +'<div class="cms-modal-body" style="padding:20px;overflow-y:auto;flex:1;display:flex;flex-direction:column;gap:12px;box-sizing:border-box;width:100%">'
        +'<div class="cms-akt-header-grid">'
          +'<div><label for="cms-akt-titel">Titel</label><input id="cms-akt-titel" class="cms-input" placeholder="Titel der Aktion" value="'+esc(isEdit?(aktion.titel||''):defTitel)+'"></div>'
          +'<div><label for="cms-akt-von">Gültig von</label><input id="cms-akt-von" class="cms-input" type="date" value="'+esc(isEdit?(aktion.von||''):defVon)+'"></div>'
          +'<div><label for="cms-akt-bis">Gültig bis</label><input id="cms-akt-bis" class="cms-input" type="date" value="'+esc(isEdit?(aktion.bis||''):defBis)+'"></div>'
        +'</div>'
        +'<input type="hidden" id="cms-akt-edit-id" value="'+esc(isEdit?(aktion.aktion_id||''):'')+'">'
        +'<div style="display:flex;justify-content:space-between;align-items:center;margin:6px 0 2px">'
          +'<strong style="font-size:13px;color:#374151">Artikel</strong>'
          +'<button class="cms-btn cms-btn-sm cms-btn-gray" data-action="addAngRow" type="button">+ Artikel</button>'
        +'</div>'
        +'<div id="cms-akt-items" style="display:flex;flex-direction:column;gap:10px;min-height:0;padding:4px 0"></div>'
      +'</div>'
      +'</div></div>';
    document.getElementById('cms-modal-wrap').innerHTML=html;
    document.getElementById('cms-modal-wrap').style.display='';
    angRowCounter=0;
    if(isEdit&&aktion.items&&aktion.items.length){
      aktion.items.forEach(function(it){addAngRow(it);});
      // Automatically pre-load missing images from SharePoint for perfect editing UX
      setTimeout(function(){
        var rows=document.querySelectorAll('#cms-akt-items .cms-ang-row');
        rows.forEach(function(row){
          var bildInp=row.querySelector('[data-f="bild_data"]');
          var nrInp=row.querySelector('[data-f="artikelnummer"]');
          if(bildInp && !bildInp.value && nrInp && nrInp.value.trim()){
            var rowId=row.id.replace('cms-ar-','');
            cmsLoadBildSharePoint(parseInt(rowId));
          }
        });
      }, 300);
    } else {
      addAngRow();addAngRow();addAngRow();addAngRow();addAngRow();addAngRow();
    }
  }

  window.cmsOpenNewAktion=function(){showAktionModal(null);};
  window.cmsEditAktion=function(aktId){
    var ak=aktionen.find(function(a){return a.aktion_id===aktId;});
    if(ak)showAktionModal(ak);
  };

  function artSearchFilter(inp){
    if(!inp) return;
    var val=(inp.value||'').trim().toLowerCase();
    var wrap=inp.parentElement;
    if(!wrap || !wrap.classList.contains('cms-art-wrap')) return;
    var dd=wrap.querySelector('.cms-art-dd');
    if(!dd) return;
    dd.innerHTML='';
    if(val.length<1){dd.classList.remove('open');return;}
    var matches=_artikelCache.filter(function(a){
      var name=(a.b||a.produktVal||'').toLowerCase(),nr=(a.nr||'').toLowerCase(),sc=(a.sc||'').toLowerCase();
      return name.indexOf(val)>=0 || nr.indexOf(val)>=0 || sc.indexOf(val)>=0;
    }).slice(0,12);
    if(matches.length===0){dd.classList.remove('open');console.log('[CMS] No matches for:',val);return;}
    console.log('[CMS] Search matches for',val,': found',matches.length);
    matches.forEach(function(m){
      var opt=document.createElement('div');
      opt.className='cms-art-opt';
      var metaParts=[];
      if(m.nr) metaParts.push('Nr: '+m.nr);
      if(m.sc) metaParts.push('SC: '+m.sc);
      if(m.preis) metaParts.push('VK: '+Number(m.preis).toFixed(2).replace('.',',')+' €');
      if(m.statt_preis) metaParts.push('Aktion: '+Number(m.statt_preis).toFixed(2).replace('.',',')+' €');
      opt.innerHTML='<div class="cms-art-opt-name">'+esc(m.b||m.produktVal||'')+'</div><div class="cms-art-opt-meta">'+esc(metaParts.join(' · '))+'</div>';
      opt.addEventListener('mousedown',function(e){
        e.preventDefault(); // Prevent blur from firing before selection completes
        var row=inp.closest('.cms-ang-row');
        if(row){
          inp.value=m.b||m.produktVal||'';
          var nrInp=row.querySelector('[data-f="artikelnummer"]');
          if(nrInp) nrInp.value=m.nr||m.sc||'';
          var detInp=row.querySelector('[data-f="details"]');
          if(detInp && m.details) detInp.value=m.details;
          var preisInp=row.querySelector('[data-f="preis"]');
          if(preisInp && m.preis) preisInp.value=Number(m.preis).toFixed(2).replace('.',',');
          var stattInp=row.querySelector('[data-f="statt_preis"]');
          if(stattInp && m.statt_preis) stattInp.value=Number(m.statt_preis).toFixed(2).replace('.',',');
          console.log('[CMS] Selected article:',m.b,'Nr:',m.nr,'Details:',m.details,'Preis:',m.preis,'Statt:',m.statt_preis);
          // Auto-load image from SharePoint (by artikelnummer or strichcode)
          if((m.nr || m.sc) && typeof cmsLoadBildSharePoint==='function'){
            var rowId=row.id.replace('cms-ar-','');
            setTimeout(function(){cmsLoadBildSharePoint(parseInt(rowId));},100);
          }
        }
        dd.classList.remove('open');
      });
      dd.appendChild(opt);
    });
    dd.classList.add('open');
    // Prevent scrolling/clicking in dropdown from stealing focus and closing it
    dd.onmousedown=function(e){if(!e.target.classList.contains('cms-art-opt')&&!e.target.closest('.cms-art-opt'))e.preventDefault();};
    // Position fixed dropdown below the input
    var inpRect=inp.getBoundingClientRect();
    dd.style.left=inpRect.left+'px';
    dd.style.top=(inpRect.bottom+2)+'px';
    dd.style.width=Math.max(inpRect.width,280)+'px';
  }
  
  function cmsCompressImage(base64Str, maxWidth, maxHeight, callback) {
    if (!base64Str) {
      callback('');
      return;
    }
    var img = new Image();
    img.onload = function() {
      var width = img.width;
      var height = img.height;
      if (width > height) {
        if (width > maxWidth) {
          height *= maxWidth / width;
          width = maxWidth;
        }
      } else {
        if (height > maxHeight) {
          width *= maxHeight / height;
          height = maxHeight;
        }
      }
      var canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      var ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, width, height);
      var compressed = canvas.toDataURL('image/jpeg', 0.75); // 75% quality JPEG for ultra light size
      callback(compressed);
    };
    img.onerror = function() {
      callback(base64Str); // Fallback to original
    };
    img.src = base64Str;
  }

  window.cmsLoadBildSharePoint=function(rowNum){
    var row=document.getElementById('cms-ar-'+rowNum);
    if(!row) return;
    var nrInp=row.querySelector('[data-f="artikelnummer"]');
    var bildInp=row.querySelector('[data-f="bild_data"]');
    var prodInp=row.querySelector('[data-f="produkt"]');
    var artnr=((nrInp&&nrInp.value)||'').trim();
    var strichcode='';
    if(artnr){
      var c=_artikelCache.find(function(a){return a.nr===artnr;});
      if(c && c.sc) strichcode=c.sc;
    }
    if(!artnr && prodInp){
      var prod=prodInp.value.trim().toLowerCase();
      var match=_artikelCache.find(function(a){return (a.b||a.produktVal||'').toLowerCase()===prod;});
      if(match){artnr=match.nr||'';strichcode=match.sc||'';}
    }
    if(!artnr && !strichcode){toast('Bitte Artikelnummer oder Produkt ausfüllen','warn');return;}
    var btn=row.querySelector('[data-action="loadBildSharePoint"]');
    if(btn){btn.disabled=true;btn.textContent='⏳';}
    console.log('[CMS] Loading image for article:',artnr,'strichcode:',strichcode);
    loadImageFromSharePoint(artnr, strichcode).then(function(b64){
      if(b64 && bildInp){
        cmsCompressImage(b64, 500, 500, function(compressedB64){
          bildInp.value=compressedB64;
          var prev=row.querySelector('.cms-bild-preview');
          var clr=row.querySelector('.cms-bild-clear');
          if(prev){prev.src=compressedB64;prev.style.display='';}
          if(clr){clr.style.display='';}
          toast('Bild geladen & für Mobile optimiert!');
        });
      }
      else {toast('Bild nicht in SharePoint gefunden','warn');}
    }).catch(function(e){toast('Fehler beim Laden: '+e.message,'error');console.error(e);}).then(function(){
      if(btn){btn.disabled=false;btn.textContent='🔍';}
    });
  };

  window.cmsSaveAktion=function(){
    var editId=document.getElementById('cms-akt-edit-id').value;
    var titelInp=document.getElementById('cms-akt-titel');
    var vonInp=document.getElementById('cms-akt-von');
    var bisInp=document.getElementById('cms-akt-bis');
    var titel=(titelInp.value||'').trim();
    var von=vonInp.value;
    var bis=bisInp.value;
    var headerOk=true;
    [titelInp,vonInp,bisInp].forEach(function(inp){inp.style.border='';});
    if(!titel){titelInp.style.border='2px solid #e53935';titelInp.addEventListener('input',function(){this.style.border='';},{once:true});headerOk=false;}
    if(!von){vonInp.style.border='2px solid #e53935';vonInp.addEventListener('change',function(){this.style.border='';},{once:true});headerOk=false;}
    if(!bis){bisInp.style.border='2px solid #e53935';bisInp.addEventListener('change',function(){this.style.border='';},{once:true});headerOk=false;}
    if(!headerOk){toast('Bitte Titel und Gültigkeitszeitraum ausfüllen','warn');return;}
    var rows=document.querySelectorAll('#cms-akt-items .cms-ang-row');
    var items=[];var hasError=false;
    rows.forEach(function(row){
      var produkt=(row.querySelector('[data-f="produkt"]').value||'').trim();
      if(!produkt) return;
      var pInp=row.querySelector('[data-f="preis"]');
      var sInp=row.querySelector('[data-f="statt_preis"]');
      var preis=parseDePrice(pInp.value);
      var statt=parseDePrice(sInp.value);
      if(preis==null||statt==null){
        if(preis==null){pInp.style.border='2px solid #e53935';pInp.addEventListener('input',function(){this.style.border='';},{once:true});}
        if(statt==null){sInp.style.border='2px solid #e53935';sInp.addEventListener('input',function(){this.style.border='';},{once:true});}
        hasError=true;
      }
      items.push({
        id:(row.querySelector('[data-f="id"]').value||''),
        produkt:produkt,
        details:(row.querySelector('[data-f="details"]').value||'').trim(),
        preis:preis,
        statt_preis:statt,
        artikelnummer:(row.querySelector('[data-f="artikelnummer"]').value||'').trim(),
        bild_data:(row.querySelector('[data-f="bild_data"]').value||'').trim(),
        dl_werbebildid:(row.querySelector('[data-f="dl_werbebildid"]').value||'').trim()
      });
    });
    if(hasError){toast('Bitte VK und Aktionspreis für alle Artikel eintragen','warn');return;}
    if(!items.length){toast('Bitte mindestens 1 Artikel eintragen','warn');return;}

    var aktId=editId||('AKT-'+Date.now());
    var saveBtn=document.querySelector('[data-action="saveAktion"]');
    btnBusy(saveBtn);

    refreshToken().then(function(){
      var promises=[];
      if(editId){
        var old=aktionen.find(function(a){return a.aktion_id===editId;});
        if(old){
          var keep={};items.forEach(function(it){if(it.id)keep[it.id]=true;});
          old.items.forEach(function(it){if(it.id&&!keep[it.id])promises.push(fetch(API+'/angebote/'+it.id,{method:'DELETE'}));});
        }
      }

      // Step 1: Upsert werbebilder first to get IDs, then save angebote with relation
      var bildPromises=[];
      items.forEach(function(it){
        if(it.bild_data){
          // Generate a temporary artikelnummer from product name if none provided
          var artNr=it.artikelnummer||('IMG-'+it.produkt.replace(/[^a-zA-Z0-9]/g,'').substring(0,20)+'-'+Date.now().toString(36));
          if(!it.artikelnummer) it.artikelnummer=artNr;
          bildPromises.push(
            fetch(API+'/werbebilder',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({dl_artikelnummer:artNr,dl_bild_base64:it.bild_data})})
            .then(function(r){return r.json();})
            .then(function(j){it._werbebildid=j.id||'';})
            .catch(function(){it._werbebildid='';})
          );
        } else if(it.dl_werbebildid){
          it._werbebildid=it.dl_werbebildid;
        }
      });
      return Promise.all(bildPromises).then(function(){
        // Step 2: Save angebote with werbebild relation
        items.forEach(function(it,idx){
          var body={
            dl_produkt:it.produkt,
            dl_details:it.details||null,
            dl_preis:it.preis,
            dl_statt_preis:it.statt_preis,
            dl_aktion_id:aktId,
            dl_aktion_titel:titel,
            dl_gueltig_von:von||null,
            dl_gueltig_bis:bis||null,
            dl_artikelnummer:it.artikelnummer||null,
            dl_sortierung:idx+1,
            dl_status:101001
          };
          if(it._werbebildid) body.dl_werbebildid=it._werbebildid;
          if(it.id) promises.push(fetch(API+'/angebote/'+it.id,{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)}));
          else promises.push(fetch(API+'/angebote',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)}));
        });
        return Promise.all(promises);
      });
    }).then(function(results){
      var ok=results.every(function(r){return r&&r.ok;});
      if(!ok) throw new Error('Einige Anfragen fehlgeschlagen');
      toast(editId?'Aktion aktualisiert':'Aktion erstellt');
      cmsCloseModal();
      loadAngebote();
    }).catch(function(e){toast('Fehler: '+e.message,'error');})
      .then(function(){btnDone(saveBtn);});
  };

  window.cmsDeleteAktion=function(aktId){
    var ak=aktionen.find(function(a){return a.aktion_id===aktId;});
    if(!ak)return;
    var html='<div class="cms-modal-bg"><div class="cms-modal" style="text-align:center">';
    html+='<h3>Angebot löschen?</h3>';
    html+='<p style="font-size:13px;color:#6b7280;margin-bottom:8px">"'+esc(ak.titel)+'" mit '+ak.items.length+' Artikeln wirklich löschen?</p>';
    html+='<p style="font-size:12px;color:#b91c1c;margin-bottom:16px">Diese Aktion kann nicht rückgängig gemacht werden.</p>';
    html+='<div style="display:flex;gap:8px">';
    html+='<button class="cms-btn cms-btn-danger" style="flex:1;background:#dc2626;color:#fff" data-action="confirmDeleteAkt" data-id="'+esc(aktId)+'">Löschen</button>';
    html+='<button class="cms-btn cms-btn-gray" style="flex:1" data-action="closeModal">Abbrechen</button>';
    html+='</div></div></div>';
    document.getElementById('cms-modal-wrap').innerHTML=html;
    document.getElementById('cms-modal-wrap').style.display='';
  };

  window.cmsConfirmDeleteAkt=function(aktId){
    var ak=aktionen.find(function(a){return a.aktion_id===aktId;});
    if(!ak)return;
    var delBtn=document.querySelector('[data-action="confirmDeleteAkt"]');
    btnBusy(delBtn,'Löschen...');
    refreshToken().then(function(){
      var promises=ak.items.filter(function(it){return !!it.id;}).map(function(it){
        return fetch(API+'/angebote/'+it.id,{method:'DELETE'});
      });
      return Promise.all(promises);
    }).then(function(){toast('Aktion gelöscht');cmsCloseModal();loadAngebote();})
      .catch(function(e){toast('Fehler: '+e.message,'error');})
      .then(function(){btnDone(delBtn);});
  };

  // Load data on page load
  loadArtikelData();
  loadAngebote();

  var HOME_PREVIEW_URL = 'https://gentle-ocean-0bed0bf03.7.azurestaticapps.net/';
  var DAYS = {101000:'Montag',101001:'Dienstag',101002:'Mittwoch',101003:'Donnerstag',101004:'Freitag'};
  var DAY_SHORT = {101000:'Mo',101001:'Di',101002:'Mi',101003:'Do',101004:'Fr',101005:'Sa',101006:'So'};

  // --- MSAL.js: Graph API access for SharePoint images ---
  var SP_DRIVE='b!bwUha0ab4EeiA3xXHK-Oobhv5tJbeYJDiF9pTB-f1kC-Mp-AY0brRrr2WigdYK4A';
  var SP_FOLDER='01USAQ6ERA5Q2V5M2I2BCKYOFVH2WWICOC';
  var SP_BARCODE_FOLDER='01USAQ6ESD7NCQ4ZM6GRHK5IRCMJMSRSVH';
  var msalApp=null;
  var _msalReady=false;
  var _isMobile=/Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent);
  function initMsal(){
    if(msalApp) return;
    try{
      msalApp=new msal.PublicClientApplication({auth:{clientId:'64b027b2-aa1c-4d2a-824d-8ad4b2a4231d',authority:'https://login.microsoftonline.com/acfaedd4-c403-43b7-9544-fdb2b150124e',redirectUri:window.location.origin+'/cms/'},cache:{cacheLocation:'localStorage'}});
      // Handle redirect returns (mobile auth flow)
      msalApp.handleRedirectPromise().then(function(resp){
        _msalReady=true;
        if(resp)console.log('[MSAL] Redirect login success',resp.account.username);
      }).catch(function(e){
        _msalReady=true;
        console.warn('[MSAL] handleRedirectPromise error',e);
      });
    }catch(e){console.warn('MSAL init failed',e);}
  }
  if(typeof msal!=='undefined'){initMsal();}
  else{var _msalWait=setInterval(function(){if(typeof msal!=='undefined'){clearInterval(_msalWait);initMsal();}},200);setTimeout(function(){clearInterval(_msalWait);},10000);}

  var _graphTokenPromise=null;
  function _waitMsalReady(){
    if(_msalReady) return Promise.resolve();
    return new Promise(function(res){
      var tries=0;
      var iv=setInterval(function(){
        tries++;
        if(_msalReady||tries>20){clearInterval(iv);res();}
      },250);
    });
  }
  function getGraphToken(){
    if(!msalApp)return Promise.reject('no msal');
    // Serialize token requests to prevent "interaction_in_progress" errors
    if(_graphTokenPromise) return _graphTokenPromise;
    var p=_waitMsalReady().then(function(){
      var accounts=msalApp.getAllAccounts();
      var req={scopes:['Files.ReadWrite.All']};
      if(accounts.length>0){
        req.account=accounts[0];
        return msalApp.acquireTokenSilent(req).catch(function(e){
          if(e&&e.errorCode==='interaction_in_progress'){
            return new Promise(function(res){setTimeout(res,2000);}).then(function(){
              return msalApp.acquireTokenSilent(req);
            });
          }
          // On mobile use redirect (popups are blocked), on desktop use popup
          if(_isMobile){
            msalApp.acquireTokenRedirect(req);
            return new Promise(function(){}); // page will redirect
          }
          return msalApp.acquireTokenPopup(req).catch(function(e2){
            if(e2&&e2.errorCode==='interaction_in_progress'){
              return new Promise(function(res){setTimeout(res,2000);}).then(function(){
                return msalApp.acquireTokenSilent(req);
              });
            }
            throw e2;
          });
        });
      }else{
        if(_isMobile){
          msalApp.loginRedirect({scopes:['Files.ReadWrite.All']});
          return new Promise(function(){}); // page will redirect
        }
        return msalApp.acquireTokenPopup(req);
      }
    });
    _graphTokenPromise=p.then(function(tok){_graphTokenPromise=null;return tok;},function(err){_graphTokenPromise=null;throw err;});
    return _graphTokenPromise;
  }

  function _searchFolderForImage(token, folderId, artnr){
    // Try exact filename matches: artnr.jpg, artnr.png, artnr.gif
    var exts=['jpg','png','gif','jpeg'];
    var tryNext=function(i){
      if(i>=exts.length) return Promise.resolve(null);
      var url='https://graph.microsoft.com/v1.0/drives/'+SP_DRIVE+'/items/'+folderId+':/'+artnr+'.'+exts[i];
      return fetch(url,{headers:{'Authorization':'Bearer '+token.accessToken}}).then(function(r){
        if(r.ok) return r.json();
        return tryNext(i+1);
      });
    };
    return tryNext(0).then(function(found){
      if(!found || !found.id) return null;
      console.log('[CMS] Found image file:',found.name,'in folder',folderId);
      return fetch('https://graph.microsoft.com/v1.0/drives/'+SP_DRIVE+'/items/'+found.id+'/content',{
        headers:{'Authorization':'Bearer '+token.accessToken}
      }).then(function(r){
        if(!r.ok) throw new Error('File download failed: '+r.status);
        return r.arrayBuffer();
      }).then(function(buf){
        var arr=new Uint8Array(buf);
        var binaryStr='';
        for(var i=0;i<arr.length;i++) binaryStr+=String.fromCharCode(arr[i]);
        var ext=(found.name||'').split('.').pop().toLowerCase();
        var mime=ext==='png'?'image/png':ext==='gif'?'image/gif':'image/jpeg';
        return 'data:'+mime+';base64,'+btoa(binaryStr);
      });
    });
  }

  function loadImageFromSharePoint(artnr, strichcode){
    // Accept artnr and/or strichcode – at least one must be provided
    if((!artnr && !strichcode) || !msalApp) return Promise.resolve(null);
    console.log('[CMS] Fetching image for article:',artnr,'strichcode:',strichcode);
    // If strichcode not passed, look it up from artikel cache
    if(!strichcode && artnr){
      var cached=_artikelCache.find(function(a){return a.nr===artnr;});
      if(cached && cached.sc) strichcode=cached.sc;
    }
    return getGraphToken().then(function(token){
      // 1. Search in main product images folder by artikelnummer (if available)
      var mainSearch=artnr?_searchFolderForImage(token, SP_FOLDER, artnr):Promise.resolve(null);
      return mainSearch.then(function(b64){
        if(b64) return b64;
        // 2. Fallback: search in StrichcodeBilder folder by strichcode (min 5 chars)
        var barcodeSearch=strichcode||artnr;
        if(!barcodeSearch) return null;
        console.log('[CMS] Not found in main folder, trying StrichcodeBilder with',barcodeSearch,'...');
        return _searchFolderForImage(token, SP_BARCODE_FOLDER, barcodeSearch);
      });
    }).catch(function(e){
      console.error('[CMS] SharePoint image load error for '+(artnr||strichcode),e);
      return null;
    });
  }

  function uploadImageToSharePoint(artnr, base64Data){
    if(!artnr || !base64Data || !msalApp) return Promise.reject('Artikelnummer und Bild benötigt');
    return getGraphToken().then(function(token){
      // Convert base64 data URL to binary
      var parts=base64Data.split(',');
      var mime=(parts[0].match(/:(.*?);/)||[])[1]||'image/jpeg';
      var ext=mime==='image/png'?'png':mime==='image/gif'?'gif':'jpg';
      var raw=atob(parts[1]);
      var arr=new Uint8Array(raw.length);
      for(var i=0;i<raw.length;i++) arr[i]=raw.charCodeAt(i);
      var blob=new Blob([arr],{type:mime});
      var fileName=artnr+'.'+ext;
      var uploadUrl='https://graph.microsoft.com/v1.0/drives/'+SP_DRIVE+'/items/'+SP_BARCODE_FOLDER+':/'+fileName+':/content';
      return fetch(uploadUrl,{
        method:'PUT',
        headers:{'Authorization':'Bearer '+token.accessToken,'Content-Type':mime},
        body:blob
      }).then(function(r){
        if(!r.ok) throw new Error('Upload fehlgeschlagen: '+r.status);
        return r.json();
      }).then(function(item){
        console.log('[CMS] Uploaded to StrichcodeBilder:',item.name);
        return item;
      });
    });
  }
  var DAY_COLORS = {101000:'#ef4444',101001:'#f97316',101002:'#eab308',101003:'#22c55e',101004:'#3b82f6'};
  var meals = [], hours = [], kw, jahr;

  // Pre-loaded article data from FetchXML (server-side)
  var _artikelCache = [];
  try { _artikelCache = JSON.parse(document.getElementById('cms-artikel-data').textContent); } catch(e) { console.warn('Artikel cache parse error', e); }

  var _csrfToken='';
  function refreshToken(){
    if(typeof shell!=='undefined'&&shell.getTokenDeferred){
      return shell.getTokenDeferred().then(function(t){_csrfToken=t;return t;});
    }
    return Promise.resolve('');
  }
  function writeHeaders(){
    return {'Content-Type':'application/json','__RequestVerificationToken':_csrfToken};
  }
  function deleteHeaders(){
    return {'__RequestVerificationToken':_csrfToken};
  }

  function btnBusy(btn,label){
    if(!btn)return;
    btn._origLabel=btn.textContent;
    btn.disabled=true;
    btn.innerHTML='<span class="cms-btn-spinner"></span>'+(label||'Speichern...');
  }
  function btnDone(btn){
    if(!btn)return;
    btn.disabled=false;
    btn.textContent=btn._origLabel||'Speichern';
  }

  function init(){
    try{
      refreshToken();
      var d = new Date();
      // Ab Samstag (6) die nächste Woche anzeigen
      if(d.getDay()===0||d.getDay()===6){d.setDate(d.getDate()+(d.getDay()===0?1:2));}
      jahr = d.getFullYear();
      kw = isoWeek(d);
      loadWP();
      document.getElementById('cms-status').textContent = 'Verbunden';
      document.getElementById('cms-status').style.color = '#16a34a';
    }catch(e){
      console.error('CMS init error',e);
      document.getElementById('cms-status').textContent = 'Fehler: '+e.message;
      document.getElementById('cms-status').style.color = '#dc2626';
    }
  }

  function isoWeek(d){
    var dt = new Date(d.getTime()); dt.setHours(0,0,0,0);
    dt.setDate(dt.getDate()+3-(dt.getDay()+6)%7);
    var w1 = new Date(dt.getFullYear(),0,4);
    return 1+Math.round(((dt.getTime()-w1.getTime())/86400000-3+(w1.getDay()+6)%7)/7);
  }
  function weekRange(w,y){
    var j4=new Date(y,0,4),dow=j4.getDay()||7,mon=new Date(j4);
    mon.setDate(j4.getDate()-dow+1+(w-1)*7);
    var fri=new Date(mon); fri.setDate(mon.getDate()+4);
    return {start:mon,end:fri};
  }
  function fmtD(d){return d.toLocaleDateString('de-DE',{day:'2-digit',month:'2-digit',year:'2-digit'});}
  function fmtISO(d){var y=d.getFullYear(),m=d.getMonth()+1,day=d.getDate();return y+'-'+(m<10?'0':'')+m+'-'+(day<10?'0':'')+day;}
  function fmtP(p){return p?p.toFixed(2).replace('.',',')+' \u20AC':'';}
  function fmtDePrice(v){if(v==null||v==='')return '';var n=parseFloat(String(v).replace(',','.'));return isNaN(n)?'':n.toFixed(2).replace('.',',');}
  function parseDePrice(s){if(!s)return null;var n=parseFloat(String(s).replace(',','.'));return isNaN(n)?null:n;}
  function esc(s){var d=document.createElement('div');d.textContent=s;return d.innerHTML;}

  function toast(msg,type){
    var el=document.createElement('div');
    el.className='cms-toast';
    el.style.background=type==='error'?'#dc2626':type==='warn'?'#d97706':'#16a34a';
    el.textContent=msg;
    document.body.appendChild(el);
    setTimeout(function(){el.remove();},3000);
  }

  function cmsConfirm(msg,opts){
    opts=opts||{};
    var icon=opts.icon||'\u2753';
    var warn=opts.warn||false;
    var okText=opts.ok||'OK';
    var cancelText=opts.cancel||'Abbrechen';
    return new Promise(function(resolve){
      var ov=document.createElement('div');
      ov.className='cms-confirm-overlay';
      ov.innerHTML='<div class="cms-confirm-box">'
        +'<div class="cms-confirm-icon">'+icon+'</div>'
        +'<div class="cms-confirm-msg"></div>'
        +'<div class="cms-confirm-btns">'
        +'<button class="cms-confirm-btn-cancel">'+esc(cancelText)+'</button>'
        +'<button class="cms-confirm-btn-ok'+(warn?' cms-confirm-warn':'')+'">'+esc(okText)+'</button>'
        +'</div></div>';
      ov.querySelector('.cms-confirm-msg').textContent=msg;
      function close(val){ov.remove();resolve(val);}
      ov.querySelector('.cms-confirm-btn-cancel').onclick=function(){close(false);};
      ov.querySelector('.cms-confirm-btn-ok').onclick=function(){close(true);};
      ov.addEventListener('click',function(e){if(e.target===ov)close(false);});
      document.body.appendChild(ov);
      ov.querySelector('.cms-confirm-btn-ok').focus();
    });
  }

  // --- Tabs ---
  var angebote = [];
  var _cmsCurrentTab='wp';
  window.cmsTab = function(name, skipHistory){
    _cmsCurrentTab=name;
    ['wp','hours','ang','hp','news','sort','gallery','push','settings','cfg'].forEach(function(t){
      document.getElementById('cms-panel-'+t).style.display = t===name?'':'none';
      document.getElementById('cms-tab-'+t).className = 'cms-tab'+(t===name?' active':'');
    });
    if(name==='hours' && hours.length===0) loadHours();
    if(name==='ang' && angebote.length===0) loadAngebote();
    if(name==='hp'){ if(!_hpLoaded) loadHomepage(); loadLogo(); if(!window._seitenLoaded) loadSeiteninhalte(); }
    if(name==='news' && !_newsLoaded) loadNews();
    if(name==='sort' && !_sortLoaded) loadSortiment();
    if(name==='gallery' && !_galLoaded) loadGalleryAdmin();
    if(name==='settings' && !_settingsLoaded) loadFeatureFlags();
    if(name==='cfg'){ cfgLoadUI(); hpCfgLoadUI(); }
    if(!skipHistory) history.pushState({cmsTab:name},'','');
  };

  // PWA back button support for CMS tabs
  (function(){
    var isStandalone=window.matchMedia('(display-mode:standalone)').matches||navigator.standalone;
    history.replaceState({cmsTab:'wp'},'','');
    window.addEventListener('popstate',function(e){
      if(e.state&&e.state.cmsTab){
        cmsTab(e.state.cmsTab,true);
        return;
      }
      // Standalone: prevent app from closing, go back to first tab
      if(isStandalone){
        cmsTab('wp',true);
        history.pushState({cmsTab:'wp'},'','');
      }
    });
  })();

  // ── Design Sub-Tabs ──
  window.cmsCfgSubTab = function(id){
    ['cfg-hp','cfg-wp','cfg-plakat','cfg-hpang'].forEach(function(t){
      var panel=document.getElementById('cms-'+t);
      if(panel) panel.style.display = t===id?'':'none';
    });
    document.querySelectorAll('.cms-subtab').forEach(function(btn){
      var active = btn.getAttribute('data-id')===id;
      btn.className = 'cms-subtab'+(active?' active':'');
      btn.style.borderBottomColor = active?'#5ea88a':'transparent';
      btn.style.color = active?'#5ea88a':'#6b7280';
    });
  };

  // ── Seiteninhalte Tab ──
  var SEITEN_KEYS = [
    {key:'gf_inhalt', label:'Gesch&auml;ftsf&uuml;hrung', icon:'&#128188;', page:'/geschaeftsfuehrung'},
    {key:'beirat_inhalt', label:'Beirat', icon:'&#128101;', page:'/beirat'},
    {key:'konzept_inhalt', label:'Konzept', icon:'&#128161;', page:'/konzept'},
    {key:'stille_gesellschafter_inhalt', label:'Stille Gesellschafter', icon:'&#129309;', page:'/stille-gesellschafter'},
    {key:'essen_inhalt', label:'Essen im Dorfladen', icon:'&#127869;', page:'/essen-im-dorfladen'},
    {key:'impressum_inhalt', label:'Impressum', icon:'&#9878;', page:'/impressum'},
    {key:'datenschutz_inhalt', label:'Datenschutzerkl&auml;rung', icon:'&#128274;', page:'/datenschutzerklaerung'}
  ];

  function loadSeiteninhalte(){
    var container=document.getElementById('cms-seiten-fields');
    container.innerHTML='<div style="text-align:center;padding:20px;color:#6b7280">Lade Seiteninhalte&hellip;</div>';
    fetch(API+'/cms-config')
      .then(function(r){return r.json();})
      .then(function(cfg){
        var map={};
        var d=cfg.data||cfg;
        if(Array.isArray(d)){
          d.forEach(function(c){map[c.dl_schluessel||c.key||c.name]=c.dl_wert||c.value||c.wert||'';});
        } else if(d && typeof d==='object'){
          Object.keys(d).forEach(function(k){map[k]=typeof d[k]==='string'?d[k]:JSON.stringify(d[k]);});
        }
        function rteBar(id){
          return '<div class="cms-rte-toolbar">'
            +'<button type="button" class="cms-rte-btn" onclick="cmsSeitenFocus(\''+id+'\');document.execCommand(\'bold\')" title="Fett"><b>B</b></button>'
            +'<button type="button" class="cms-rte-btn" onclick="cmsSeitenFocus(\''+id+'\');document.execCommand(\'italic\')" title="Kursiv"><i>I</i></button>'
            +'<button type="button" class="cms-rte-btn" onclick="cmsSeitenFocus(\''+id+'\');document.execCommand(\'underline\')" title="Unterstrichen"><u>U</u></button>'
            +'<span class="cms-rte-sep"></span>'
            +'<button type="button" class="cms-rte-btn" onclick="cmsSeitenFocus(\''+id+'\');document.execCommand(\'formatBlock\',false,\'h2\')" title="&Uuml;berschrift">H2</button>'
            +'<button type="button" class="cms-rte-btn" onclick="cmsSeitenFocus(\''+id+'\');document.execCommand(\'formatBlock\',false,\'h3\')" title="Unter&uuml;berschrift">H3</button>'
            +'<button type="button" class="cms-rte-btn" onclick="cmsSeitenFocus(\''+id+'\');document.execCommand(\'formatBlock\',false,\'p\')" title="Absatz">P</button>'
            +'<span class="cms-rte-sep"></span>'
            +'<button type="button" class="cms-rte-btn" onclick="cmsSeitenFocus(\''+id+'\');document.execCommand(\'insertUnorderedList\')" title="Liste">&#8226;</button>'
            +'<button type="button" class="cms-rte-btn" onclick="cmsSeitenFocus(\''+id+'\');document.execCommand(\'insertOrderedList\')" title="Num. Liste">1.</button>'
            +'<span class="cms-rte-sep"></span>'
            +'<button type="button" class="cms-rte-btn" onclick="cmsSeitenFocus(\''+id+'\');var u=prompt(\'Link-URL:\');if(u)document.execCommand(\'createLink\',false,u)" title="Link">&#128279;</button>'
            +'<button type="button" class="cms-rte-btn" onclick="cmsSeitenFocus(\''+id+'\');document.execCommand(\'removeFormat\')" title="Format entfernen">&#10006;</button>'
            +'</div>';
        }
        container.innerHTML=SEITEN_KEYS.map(function(s){
          var val=map[s.key]||'';
          var statusDot=val?'<span style="width:8px;height:8px;border-radius:50%;background:#22c55e;display:inline-block;margin-left:6px" title="Inhalt vorhanden"></span>'
                           :'<span style="width:8px;height:8px;border-radius:50%;background:#f59e0b;display:inline-block;margin-left:6px" title="Noch kein Inhalt"></span>';
          var hint=val?'':'<p style="font-size:11px;color:#d97706;margin:4px 0 0">&#9888; Noch kein Inhalt in Dataverse. Bitte Text eingeben und speichern.</p>';
          return '<div class="cms-card" data-seiten-key="'+s.key+'" style="margin-bottom:2px">'
            +'<div class="cms-card-header" style="display:flex;justify-content:space-between;align-items:center;cursor:pointer;user-select:none" onclick="cmsSeitenToggle(\''+s.key+'\')">'
            +'<span>'+s.icon+' '+s.label+statusDot+'</span>'
            +'<span style="display:flex;align-items:center;gap:8px">'
            +'<a href="'+s.page+'" target="_blank" style="font-size:11px;color:#5ea88a;text-decoration:none" title="Seite anzeigen" onclick="event.stopPropagation()">&#128065;</a>'
            +'<span class="cms-seiten-arrow" id="seiten-arrow-'+s.key+'" style="font-size:16px;transition:transform .2s">&#9654;</span>'
            +'</span></div>'
            +'<div class="cms-card-body" id="seiten-body-'+s.key+'" style="display:none">'
            +rteBar('seiten-'+s.key)
            +'<div class="cms-rte-editor" contenteditable="true" id="seiten-'+s.key+'" data-seiten-key="'+s.key+'" style="min-height:120px;max-height:400px;overflow-y:auto">'+val+'</div>'
            +hint
            +'<div style="margin-top:10px;display:flex;gap:8px;justify-content:flex-end">'
            +'<button class="cms-btn cms-btn-primary cms-btn-sm" onclick="cmsSeitenSave(\''+s.key+'\')">&#128190; Speichern</button>'
            +'</div>'
            +'</div></div>';
        }).join('');
        window._seitenLoaded=true;
      })
      .catch(function(e){
        container.innerHTML='<p style="color:#dc2626">Fehler beim Laden: '+e.message+'</p>';
      });
  }

  window.cmsSeitenToggle=function(key){
    var body=document.getElementById('seiten-body-'+key);
    var arrow=document.getElementById('seiten-arrow-'+key);
    var isOpen=body.style.display!=='none';
    // Close all
    SEITEN_KEYS.forEach(function(s){
      var b=document.getElementById('seiten-body-'+s.key);
      var a=document.getElementById('seiten-arrow-'+s.key);
      if(b){b.style.display='none';}
      if(a){a.style.transform='rotate(0deg)';}
    });
    // Open clicked (if it was closed)
    if(!isOpen){
      body.style.display='';
      arrow.style.transform='rotate(90deg)';
    }
  };

  window.cmsSeitenFocus=function(id){
    var el=document.getElementById(id);
    if(el) el.focus();
  };

  window.cmsSeitenSave=function(key){
    var el=document.getElementById('seiten-'+key);
    if(!el) return;
    var html=el.innerHTML;
    var btn=el.closest('.cms-card').querySelector('.cms-btn-primary');
    var origText=btn.innerHTML;
    btn.innerHTML='&#8987; Speichern&hellip;';btn.disabled=true;
    fetch(API+'/cms-config',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({name:key,wert:html})})
      .then(function(r){return r.json();})
      .then(function(res){
        if(res.success){
          btn.innerHTML='&#9989; Gespeichert!';
          setTimeout(function(){btn.innerHTML=origText;btn.disabled=false;},2000);
        } else {
          btn.innerHTML='&#10060; Fehler';btn.disabled=false;
          alert('Speichern fehlgeschlagen: '+(res.error||'Unbekannter Fehler'));
          setTimeout(function(){btn.innerHTML=origText;},2000);
        }
      })
      .catch(function(e){
        btn.innerHTML='&#10060; Fehler';btn.disabled=false;
        alert('Netzwerkfehler: '+e.message);
        setTimeout(function(){btn.innerHTML=origText;},2000);
      });
  };

  // ── Design Config ──
  var CFG_KEY='dl_design_cfg';
  var CFG_COMPACT_KEY='dl_cms_cfg_compact';
  var CFG_DEFAULTS={
    bgColor:'#f4f1ea',tagColor:'#a51d2d',leafColor:'#4a7c3f',titleColor:'#a51d2d',decoFooterColor:'#8aad7e',
    imgRotation:15,imgFreistellen:true,imgThreshold:230,imgMaxScale:4,
    priceFontFlyer:72,priceFontPlakat:36,stattColor:'#555555',tagSkew:18,tagShape:'rect',tagRadius:0,tagPreset:'',
    showLeaf:false,leafSize:34,showBag:false,showTexture:true,
    savingsMarkerType:'starburst',savingsPalette:'harmonie',
    savingsScalePlakat:95,savingsScaleFlyer:120,
    plakatTemplate:'classic-red',flyerTemplate:'classic-red',
    plakat_tagPreset:'',plakat_tagShape:'rect',plakat_tagRadius:0,plakat_tagSkew:18,plakat_tagScale:100,
    plakat_decoLeafColor:'#4a7c3f',plakat_decoTitleColor:'#a51d2d',plakat_decoBgColor:'#f4f1ea',plakat_decoFooterColor:'#8aad7e',
    plakat_showLeaf:false,plakat_leafSize:34,plakat_showBag:false,plakat_showTexture:true,
    flyer_tagPreset:'',flyer_tagShape:'rect',flyer_tagRadius:0,flyer_tagSkew:18,flyer_tagScale:100,
    flyer_decoLeafColor:'#4a7c3f',flyer_decoTitleColor:'#a51d2d',flyer_decoBgColor:'#f4f1ea',flyer_decoFooterColor:'#8aad7e',
    flyer_showLeaf:false,flyer_leafSize:34,flyer_showBag:false,flyer_showTexture:true
  };
  var PERSEC_SECTIONS=['plakat','flyer'];
  var PERSEC_COLORS=['decoLeafColor','decoTitleColor','decoBgColor','decoFooterColor'];
  var PERSEC_RANGES=['tagRadius','tagSkew','leafSize','tagScale'];
  var PERSEC_CHECKS=['showLeaf','showBag','showTexture'];
  var PERSEC_SELECTS=['tagPreset','tagShape'];
  var PERSEC_RANGE_UNITS={tagRadius:'px',tagSkew:'%',leafSize:'px',tagScale:'%'};
  // Merge per-section values into global keys for rendering (e.g. cfg.flyer_tagShape → cfg.tagShape)
  var PERSEC_COLOR_MAP={decoLeafColor:'leafColor',decoTitleColor:'titleColor',decoBgColor:'bgColor',decoFooterColor:'decoFooterColor'};
  function cfgForKind(cfg,kind){
    if(!kind)return cfg;
    var c=Object.assign({},cfg);
    PERSEC_COLORS.forEach(function(k){var v=c[kind+'_'+k];if(v!=null)c[PERSEC_COLOR_MAP[k]||k]=v;});
    PERSEC_RANGES.forEach(function(k){var v=c[kind+'_'+k];if(v!=null)c[k]=v;});
    PERSEC_CHECKS.forEach(function(k){var v=c[kind+'_'+k];if(v!=null)c[k]=v;});
    PERSEC_SELECTS.forEach(function(k){var v=c[kind+'_'+k];if(v!=null)c[k]=v;});
    return c;
  }
  function cfgGet(){
    try{var s=localStorage.getItem(CFG_KEY);if(s){var o=JSON.parse(s);var r={};for(var k in CFG_DEFAULTS)r[k]=o.hasOwnProperty(k)?o[k]:CFG_DEFAULTS[k];
      if(o.hasOwnProperty('savingsScale')){
        if(!o.hasOwnProperty('savingsScalePlakat'))r.savingsScalePlakat=o.savingsScale;
        if(!o.hasOwnProperty('savingsScaleFlyer'))r.savingsScaleFlyer=o.savingsScale;
      }
      if(o.tplColors)r.tplColors=o.tplColors;
      return r;}}catch(e){}
    return JSON.parse(JSON.stringify(CFG_DEFAULTS));
  }
  function cfgSave(o){
    try{localStorage.setItem(CFG_KEY,JSON.stringify(o));}catch(e){}
    // Persist to Dataverse
    fetch(API+'/cms-config',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({name:'design_config',wert:o})})
      .then(function(r){return r.json();})
      .then(function(res){if(!res.success)console.warn('Design save to Dataverse failed',res.error);})
      .catch(function(e){console.warn('Design save error',e);});
  }
  function cfgGetCompact(){
    try{return localStorage.getItem(CFG_COMPACT_KEY)==='1';}catch(e){return false;}
  }
  function cfgSetCompact(on){
    var panel=document.getElementById('cms-panel-cfg');
    if(panel)panel.classList.toggle('cms-compact-on',!!on);
    var cb=document.getElementById('cfg-compactMode');
    if(cb)cb.checked=!!on;
    try{localStorage.setItem(CFG_COMPACT_KEY,on?'1':'0');}catch(e){}
  }
  function cfgLoadFromDataverse(){
    return fetch(API+'/cms-config')
      .then(function(r){return r.json();})
      .then(function(res){
        if(!res.success||!res.data)return;
        var dvCfg=res.data['design_config'];
        if(dvCfg&&typeof dvCfg==='object'){
          // Dataverse is always the source of truth
          var merged={};for(var k in CFG_DEFAULTS)merged[k]=dvCfg.hasOwnProperty(k)?dvCfg[k]:CFG_DEFAULTS[k];
          if(dvCfg.tplColors)merged.tplColors=dvCfg.tplColors;
          try{localStorage.setItem(CFG_KEY,JSON.stringify(merged));}catch(e){}
          cfgApplyUI(merged);
        }
      })
      .catch(function(e){console.warn('Design load from Dataverse failed',e);});
  }
  function cfgLoadUI(){
    var c=cfgGet();
    cfgSetCompact(cfgGetCompact());
    cfgApplyUI(c);
    // Render preset lists
    if(typeof cfgPresetsRenderAll==='function')cfgPresetsRenderAll();
    // Always refresh from Dataverse (source of truth)
    cfgLoadFromDataverse();
  }
  function cfgApplyUI(c){
    ['bgColor','tagColor','leafColor','titleColor','stattColor','decoFooterColor'].forEach(function(k){
      var el=document.getElementById('cfg-'+k);if(el)el.value=c[k];
    });
    // Sync deco color pickers with main config values
    var decoMap={decoLeafColor:'leafColor',decoTitleColor:'titleColor',decoBgColor:'bgColor',decoFooterColor:'decoFooterColor'};
    Object.keys(decoMap).forEach(function(dk){
      var el=document.getElementById('cfg-'+dk);if(el)el.value=c[decoMap[dk]]||el.defaultValue;
    });
    ['imgRotation','imgThreshold','imgMaxScale','priceFontFlyer','priceFontPlakat','tagSkew','tagRadius','leafSize','savingsScalePlakat','savingsScaleFlyer'].forEach(function(k){
      var el=document.getElementById('cfg-'+k);if(el){el.value=c[k];cfgUpdateVal(k,c[k]);}
    });
    ['imgFreistellen','showLeaf','showBag','showTexture'].forEach(function(k){
      var el=document.getElementById('cfg-'+k);if(el)el.checked=c[k];
    });
    var ts=document.getElementById('cfg-tagShape');if(ts)ts.value=c.tagShape||'rect';
    var tp=document.getElementById('cfg-tagPreset');if(tp)tp.value=c.tagPreset||'';
    var mt=document.getElementById('cfg-savingsMarkerType');if(mt)mt.value=c.savingsMarkerType||'starburst';
    var pl=document.getElementById('cfg-savingsPalette');if(pl)pl.value=c.savingsPalette||'harmonie';
    var pt=document.getElementById('cfg-plakatTemplate');if(pt)pt.value=c.plakatTemplate||'classic-red';
    var ft=document.getElementById('cfg-flyerTemplate');if(ft)ft.value=c.flyerTemplate||'classic-red';
    cfgSyncOfferTplPreviews();
    cfgSyncAllTplColors();
    // Sync global tagColor from the active flyer template tagColor
    var _ftcEl=document.getElementById('cfg-tpl-flyer-tagColor');
    var _gtcEl=document.getElementById('cfg-tagColor');
    if(_ftcEl&&_gtcEl&&_ftcEl.value&&_ftcEl.value!=='#000000')_gtcEl.value=_ftcEl.value;
    var ssEl=document.getElementById('cfg-savingsStarStyle');
    if(ssEl){
      var ss='harmonie';
      try{ss=localStorage.getItem('dl_savings_star_style')||'harmonie';}catch(e){}
      ssEl.value=ss;
    }
    cfgRenderSavingsPreview();
    // Apply per-section controls (Plakat + Flyer)
    PERSEC_SECTIONS.forEach(function(sec){
      PERSEC_COLORS.forEach(function(ck){
        var el=document.getElementById('cfg-'+sec+'-'+ck);if(el)el.value=c[sec+'_'+ck]||el.defaultValue;
      });
      PERSEC_RANGES.forEach(function(rk){
        var el=document.getElementById('cfg-'+sec+'-'+rk);if(el){el.value=c[sec+'_'+rk];cfgUpdateVal(sec+'-'+rk,c[sec+'_'+rk]);}
      });
      PERSEC_CHECKS.forEach(function(bk){
        var el=document.getElementById('cfg-'+sec+'-'+bk);if(el)el.checked=c[sec+'_'+bk];
      });
      PERSEC_SELECTS.forEach(function(sk){
        var el=document.getElementById('cfg-'+sec+'-'+sk);if(el)el.value=c[sec+'_'+sk]||'';
      });
    });
  }
  function cfgUpdateVal(k,v){
    var el=document.getElementById('cfg-'+k+'-val');if(!el)return;
    var u={'imgRotation':'\u00B0','imgThreshold':'','imgMaxScale':'x','priceFontFlyer':'px','priceFontPlakat':'px','tagSkew':'%','tagRadius':'px','leafSize':'px','savingsScalePlakat':'%','savingsScaleFlyer':'%',
      'plakat-tagRadius':'px','plakat-tagSkew':'%','plakat-leafSize':'px','plakat-tagScale':'%',
      'flyer-tagRadius':'px','flyer-tagSkew':'%','flyer-leafSize':'px','flyer-tagScale':'%'};
    el.textContent=v+(u[k]||'');
  }
  function cfgReadUI(){
    var c={};
    ['bgColor','tagColor','leafColor','titleColor','stattColor','decoFooterColor'].forEach(function(k){
      var el=document.getElementById('cfg-'+k);if(el)c[k]=el.value;
    });
    // Read deco color pickers and sync back to main config keys
    var decoMap={decoLeafColor:'leafColor',decoTitleColor:'titleColor',decoBgColor:'bgColor',decoFooterColor:'decoFooterColor'};
    Object.keys(decoMap).forEach(function(dk){
      var el=document.getElementById('cfg-'+dk);if(el)c[decoMap[dk]]=el.value;
    });
    ['imgRotation','imgThreshold','priceFontFlyer','priceFontPlakat','tagSkew','tagRadius','leafSize','savingsScalePlakat','savingsScaleFlyer'].forEach(function(k){
      var el=document.getElementById('cfg-'+k);if(el)c[k]=parseInt(el.value);
    });
    var scEl=document.getElementById('cfg-imgMaxScale');if(scEl)c.imgMaxScale=parseFloat(scEl.value);
    ['imgFreistellen','showLeaf','showBag','showTexture'].forEach(function(k){
      var el=document.getElementById('cfg-'+k);if(el)c[k]=el.checked;
    });
    var ts2=document.getElementById('cfg-tagShape');c.tagShape=ts2?ts2.value:'rect';
    var tpEl=document.getElementById('cfg-tagPreset');c.tagPreset=tpEl?tpEl.value:'';
    var mt=document.getElementById('cfg-savingsMarkerType');c.savingsMarkerType=mt?mt.value:'starburst';
    var pl=document.getElementById('cfg-savingsPalette');c.savingsPalette=pl?pl.value:'harmonie';
    var pt=document.getElementById('cfg-plakatTemplate');c.plakatTemplate=pt?pt.value:'classic-red';
    var ft=document.getElementById('cfg-flyerTemplate');c.flyerTemplate=ft?ft.value:'classic-red';
    var ssEl=document.getElementById('cfg-savingsStarStyle');
    c.savingsStarStyle=ssEl?ssEl.value:'harmonie';
    // Read per-template color overrides (keyed as kind:tpl e.g. 'plakat:classic-red')
    var tc={};
    ['plakatTemplate','flyerTemplate'].forEach(function(tKey){
      var tpl=c[tKey]||'classic-red';
      var kind=tKey.replace('Template','');
      var storeKey=kind+':'+tpl;
      if(!tc[storeKey])tc[storeKey]={};
      TPL_COLOR_KEYS.forEach(function(ck){
        var el=document.getElementById('cfg-tpl-'+kind+'-'+ck);
        if(el)tc[storeKey][ck]=el.value;
      });
      TPL_GRAD_KEYS.forEach(function(gk){
        var tgl=document.querySelector('.cfg-tpl-grad-toggle[data-kind="'+kind+'"][data-key="'+gk+'"]');
        tc[storeKey][gk+'_grad']=tgl?tgl.checked:false;
        var c2=document.getElementById('cfg-tpl-'+kind+'-'+gk+'_c2');if(c2)tc[storeKey][gk+'_c2']=c2.value;
        var dir=document.getElementById('cfg-tpl-'+kind+'-'+gk+'_dir');if(dir)tc[storeKey][gk+'_dir']=dir.value;
        var pct=document.getElementById('cfg-tpl-'+kind+'-'+gk+'_pct');if(pct)tc[storeKey][gk+'_pct']=parseInt(pct.value);
      });
    });
    // Preserve existing overrides for other templates
    var existing=cfgGet().tplColors||{};
    for(var tk in existing){if(!tc[tk])tc[tk]=existing[tk];}
    c.tplColors=tc;
    // Read per-section controls (Plakat + Flyer)
    PERSEC_SECTIONS.forEach(function(sec){
      PERSEC_COLORS.forEach(function(ck){
        var el=document.getElementById('cfg-'+sec+'-'+ck);if(el)c[sec+'_'+ck]=el.value;
      });
      PERSEC_RANGES.forEach(function(rk){
        var el=document.getElementById('cfg-'+sec+'-'+rk);if(el)c[sec+'_'+rk]=parseInt(el.value);
      });
      PERSEC_CHECKS.forEach(function(bk){
        var el=document.getElementById('cfg-'+sec+'-'+bk);if(el)c[sec+'_'+bk]=el.checked;
      });
      PERSEC_SELECTS.forEach(function(sk){
        var el=document.getElementById('cfg-'+sec+'-'+sk);if(el)c[sec+'_'+sk]=el.value;
      });
    });
    return c;
  }
  function cfgSyncOfferTplPreviews(){
    function sync(selId,boxId){
      var sel=document.getElementById(selId);if(!sel)return;
      var v=(sel.value||'classic-red').toLowerCase();
      var btns=document.querySelectorAll('#'+boxId+' .cms-wp-preview');
      btns.forEach(function(b){b.classList.toggle('active',((b.getAttribute('data-value')||'').toLowerCase()===v));});
    }
    sync('cfg-plakatTemplate','cfg-plakatTemplate-preview');
    sync('cfg-flyerTemplate','cfg-flyerTemplate-preview');
  }
  function cfgTplToggleGrad(kind,k,on){
    var row=document.querySelector('.cfg-tpl-grad-row[data-kind="'+kind+'"][data-key="'+k+'"]');if(!row)return;
    var c2=row.querySelector('.cfg-tpl-grad-c2');if(c2)c2.style.display=on?'':'none';
    var opts=row.querySelector('.cfg-tpl-grad-opts');if(opts)opts.style.display=on?'':'none';
  }
  function cfgTplUpdateGradPreview(kind,k){
    var c1El=document.getElementById('cfg-tpl-'+kind+'-'+k);
    var c2El=document.getElementById('cfg-tpl-'+kind+'-'+k+'_c2');
    var dirEl=document.getElementById('cfg-tpl-'+kind+'-'+k+'_dir');
    var pctEl=document.getElementById('cfg-tpl-'+kind+'-'+k+'_pct');
    var prev=document.getElementById('cfg-tpl-'+kind+'-'+k+'-preview');
    if(!c1El||!c2El||!prev)return;
    var c1=c1El.value,c2=c2El.value,dir=dirEl?dirEl.value:'to bottom',pct=pctEl?pctEl.value:50;
    prev.style.background='linear-gradient('+dir+','+c1+' 0%,'+c1+' '+pct+'%,'+c2+' 100%)';
  }
  function cfgSyncTplColors(kind){
    // kind = 'plakat' or 'flyer'
    var selId=kind==='flyer'?'cfg-flyerTemplate':'cfg-plakatTemplate';
    var sel=document.getElementById(selId);if(!sel)return;
    var tpl=sel.value||'classic-red';
    var cfg=cfgGet();
    var colors=getTplColors(tpl,cfg,kind);
    TPL_COLOR_KEYS.forEach(function(ck){
      var el=document.getElementById('cfg-tpl-'+kind+'-'+ck);
      if(el)el.value=colors[ck]||'#000000';
    });
    TPL_GRAD_KEYS.forEach(function(gk){
      var isGrad=colors[gk+'_grad']||false;
      var tgl=document.querySelector('.cfg-tpl-grad-toggle[data-kind="'+kind+'"][data-key="'+gk+'"]');
      if(tgl){tgl.checked=isGrad;cfgTplToggleGrad(kind,gk,isGrad);}
      var c2=document.getElementById('cfg-tpl-'+kind+'-'+gk+'_c2');if(c2)c2.value=colors[gk+'_c2']||colors[gk];
      var dir=document.getElementById('cfg-tpl-'+kind+'-'+gk+'_dir');if(dir)dir.value=colors[gk+'_dir']||'to bottom';
      var pct=document.getElementById('cfg-tpl-'+kind+'-'+gk+'_pct');
      if(pct){pct.value=colors[gk+'_pct']!=null?colors[gk+'_pct']:50;var pv=document.getElementById('cfg-tpl-'+kind+'-'+gk+'_pct-val');if(pv)pv.textContent=pct.value;}
      if(isGrad)cfgTplUpdateGradPreview(kind,gk);
    });
  }
  function cfgSyncAllTplColors(){cfgSyncTplColors('plakat');cfgSyncTplColors('flyer');}
  function cfgRenderSavingsPreview(){
    var cv=document.getElementById('cfg-savingsPreviewCanvas');if(!cv)return;
    var ctx=cv.getContext('2d');if(!ctx)return;
    var c=cfgReadUI();
    var samplePreis=2.99;
    var sampleStatt=3.99;
    var pct=Math.max(1,Math.round((1-(samplePreis/sampleStatt))*100));
    var pctLabel='-'+pct+'%';
    ctx.clearRect(0,0,cv.width,cv.height);
    ctx.fillStyle='#ffffff';ctx.fillRect(0,0,cv.width,cv.height);

    var tx=52,ty=43,tw=86,th=30;
    ctx.save();
    ctx.translate(tx,ty);
    ctx.rotate(-0.08);
    ctx.fillStyle=c.tagColor||'#a51d2d';
    fillTagShape(ctx,tw,th,c);
    ctx.fillStyle='rgba(255,255,255,.15)';
    fillTagShape(ctx,tw,th,c);
    ctx.fillStyle='#fff';
    ctx.font='900 16px Arial Black, Arial, sans-serif';
    ctx.textAlign='center';
    ctx.textBaseline='middle';
    ctx.fillText(samplePreis.toFixed(2).replace('.',',')+'€',0,1);
    ctx.restore();

    drawSavingsBurst(ctx,170,31,14,9,pctLabel,'plakat',c);
    drawSavingsBurst(ctx,210,44,14,9,pctLabel,'flyer',c);
    ctx.fillStyle='#64748b';
    ctx.font='10px Arial, sans-serif';
    ctx.textAlign='center';
    ctx.fillText('Plakat',170,68);
    ctx.fillText('Flyer',210,68);
    ctx.fillStyle='#94a3b8';
    ctx.font='9px Arial, sans-serif';
    ctx.fillText(samplePreis.toFixed(2).replace('.',',')+'€ statt '+sampleStatt.toFixed(2).replace('.',',')+'€',112,68);
  }
  window.cmsSaveCfg=function(){
    var c=cfgReadUI();
    cfgSave(c);
    try{localStorage.setItem('dl_savings_star_style',c.savingsStarStyle||'harmonie');}catch(e){}
    toast('Design-Einstellungen gespeichert','ok');
  };
  window.cmsResetCfg=function(){
    var defaults=JSON.parse(JSON.stringify(CFG_DEFAULTS));
    cfgSave(defaults);
    try{localStorage.removeItem('dl_savings_star_style');}catch(e){}
    cfgApplyUI(defaults);
    toast('Auf Standardwerte zur\u00fcckgesetzt','ok');
  };

  // ── Section Navigation (Plakat / Flyer / Gemeinsam) ──
  window.cfgSwitchSection=function(secId){
    ['sec-plakat','sec-flyer','sec-shared'].forEach(function(s){
      var panel=document.getElementById('cfg-'+s);
      if(panel)panel.style.display=s===secId?'':'none';
    });
    var nav=document.querySelector('#cms-cfg-plakat .cfg-section-nav');
    if(nav)nav.querySelectorAll('.cfg-section-btn').forEach(function(btn){
      var active=btn.getAttribute('data-id')===secId;
      btn.classList.toggle('active',active);
      btn.style.borderBottomColor=active?'var(--c-m-pri)':'transparent';
      btn.style.color=active?'var(--c-m-pri)':'#6b7280';
    });
    // Toggle sticky sidebar preview container
    var lpPlakat=document.getElementById('cfg-live-preview-plakat');
    var lpFlyer=document.getElementById('cfg-live-preview-flyer');
    var refreshBtn=document.getElementById('cfg-lp-refresh-btn');
    if(secId==='sec-flyer'){
      if(lpPlakat)lpPlakat.style.display='none';
      if(lpFlyer)lpFlyer.style.display='flex';
      if(refreshBtn)refreshBtn.setAttribute('data-target','flyer');
    }else{
      if(lpPlakat)lpPlakat.style.display='flex';
      if(lpFlyer)lpFlyer.style.display='none';
      if(refreshBtn)refreshBtn.setAttribute('data-target','plakat');
    }
  };

  // ── WP Section Navigation (Homepage / Flyer / Elemente) ──
  window.wpCfgSwitchSection=function(secId){
    ['wp-sec-home','wp-sec-flyer','wp-sec-elemente'].forEach(function(s){
      var panel=document.getElementById(s);
      if(panel)panel.style.display=s===secId?'':'none';
    });
    var nav=document.querySelector('#cms-cfg-wp .cfg-section-nav');
    if(nav)nav.querySelectorAll('.cfg-section-btn').forEach(function(btn){
      var active=btn.getAttribute('data-id')===secId;
      btn.classList.toggle('active',active);
      btn.style.borderBottomColor=active?'var(--c-m-pri)':'transparent';
      btn.style.color=active?'var(--c-m-pri)':'#6b7280';
    });
    // Toggle sticky sidebar WP preview container
    var lpHome=document.getElementById('wp-home-live-preview');
    var lpFlyer=document.getElementById('wp-flyer-live-preview');
    var refreshBtn=document.getElementById('wp-lp-refresh-btn');
    if(secId==='wp-sec-flyer'){
      if(lpHome)lpHome.style.display='none';
      if(lpFlyer)lpFlyer.style.display='flex';
      if(refreshBtn)refreshBtn.setAttribute('data-kind','flyer');
    }else{
      if(lpHome)lpHome.style.display='flex';
      if(lpFlyer)lpFlyer.style.display='none';
      if(refreshBtn)refreshBtn.setAttribute('data-kind','home');
    }
  };

  // ── Revert Unsaved Changes ──
  window.cfgRevertUnsaved=function(){
    var saved=cfgGet();
    cfgApplyUI(saved);
    toast('\u00c4nderungen verworfen \u2013 gespeicherter Stand wiederhergestellt','ok');
  };

  // ── Preset/Vorlagen System ──
  var CFG_PRESETS_KEY='dl_design_presets';
  function cfgPresetsGet(){
    try{var s=localStorage.getItem(CFG_PRESETS_KEY);if(s)return JSON.parse(s);}catch(e){}
    return {plakat:[],flyer:[],shared:[]};
  }
  function cfgPresetsSave(all){
    try{localStorage.setItem(CFG_PRESETS_KEY,JSON.stringify(all));}catch(e){}
  }
  window.cfgPresetSave=function(section){
    var name=prompt('Name f\u00fcr die Vorlage:');
    if(!name||!name.trim())return;
    var c=cfgReadUI();
    var all=cfgPresetsGet();
    if(!all[section])all[section]=[];
    all[section].push({name:name.trim(),data:JSON.parse(JSON.stringify(c)),ts:Date.now()});
    cfgPresetsSave(all);
    cfgPresetsRenderAll();
    toast('Vorlage "'+name.trim()+'" gespeichert','ok');
  };
  window.cfgPresetLoad=function(section,idx){
    var all=cfgPresetsGet();
    if(!all[section]||!all[section][idx])return;
    var preset=all[section][idx].data;
    cfgApplyUI(preset);
    toast('Vorlage "'+all[section][idx].name+'" geladen','ok');
  };
  window.cfgPresetDelete=function(section,idx){
    var all=cfgPresetsGet();
    if(!all[section]||!all[section][idx])return;
    var name=all[section][idx].name;
    if(!confirm('Vorlage "'+name+'" l\u00f6schen?'))return;
    all[section].splice(idx,1);
    cfgPresetsSave(all);
    cfgPresetsRenderAll();
    toast('Vorlage "'+name+'" gel\u00f6scht','ok');
  };
  function cfgPresetsRenderAll(){
    ['plakat','flyer','shared'].forEach(function(sec){cfgPresetsRender(sec);});
  }
  function cfgPresetsRender(section){
    var container=document.getElementById('cfg-presets-'+section);
    if(!container)return;
    var all=cfgPresetsGet();
    var list=all[section]||[];
    if(!list.length){
      container.innerHTML='<span style="font-size:11px;color:#9ca3af;font-style:italic">Noch keine Vorlagen gespeichert.</span>';
      return;
    }
    var html='';
    list.forEach(function(p,i){
      var d=new Date(p.ts);
      var dateStr=d.toLocaleDateString('de-DE',{day:'2-digit',month:'2-digit',year:'2-digit'});
      html+='<div style="display:flex;align-items:center;gap:6px;padding:4px 6px;background:#fff;border:1px solid #e5e7eb;border-radius:6px">';
      html+='<span style="flex:1;font-size:11px;font-weight:600;color:#374151" title="'+dateStr+'">'+p.name+'</span>';
      html+='<span style="font-size:9px;color:#9ca3af">'+dateStr+'</span>';
      html+='<button class="cms-btn cms-btn-gray cms-btn-sm" style="font-size:9px;padding:1px 5px" data-action="cfgPresetLoad" data-section="'+section+'" data-idx="'+i+'">Laden</button>';
      html+='<button class="cms-btn cms-btn-gray cms-btn-sm" style="font-size:9px;padding:1px 5px;color:#dc2626" data-action="cfgPresetDelete" data-section="'+section+'" data-idx="'+i+'">&times;</button>';
      html+='</div>';
    });
    container.innerHTML=html;
  }

  // Live-Update der Slider-Werte
  document.addEventListener('input',function(e){
    var id=e.target.id;if(!id||id.indexOf('cfg-')!==0)return;
    var k=id.replace('cfg-','');cfgUpdateVal(k,e.target.value);
    if(id==='cfg-savingsScalePlakat'||id==='cfg-savingsScaleFlyer'||id==='cfg-tagColor'||id==='cfg-tagRadius')cfgRenderSavingsPreview();
    // Sync deco color pickers ↔ global config pickers
    var _decoSync={decoLeafColor:'leafColor',decoTitleColor:'titleColor',decoBgColor:'bgColor'};
    var _decoSyncRev={leafColor:'decoLeafColor',titleColor:'decoTitleColor',bgColor:'decoBgColor'};
    if(_decoSync[k]){var g=document.getElementById('cfg-'+_decoSync[k]);if(g)g.value=e.target.value;}
    if(_decoSyncRev[k]){var d=document.getElementById('cfg-'+_decoSyncRev[k]);if(d)d.value=e.target.value;}
    // Sync global tagColor → template-specific tagColor inputs
    if(id==='cfg-tagColor'){
      var v=e.target.value;
      ['cfg-tpl-plakat-tagColor','cfg-tpl-flyer-tagColor'].forEach(function(tid){var t=document.getElementById(tid);if(t)t.value=v;});
    }
    // Auto-save when template color pickers change
    if(id.indexOf('cfg-tpl-')===0){cfgSave(cfgReadUI());}
  });
  document.addEventListener('change',function(e){
    if(e.target.id==='cfg-plakatTemplate'){cfgSyncOfferTplPreviews();cfgSyncTplColors('plakat');cfgSave(cfgReadUI());}
    if(e.target.id==='cfg-flyerTemplate'){cfgSyncOfferTplPreviews();cfgSyncTplColors('flyer');cfgSave(cfgReadUI());}
    // Offer template gradient toggle
    if(e.target.classList.contains('cfg-tpl-grad-toggle')){
      var gk=e.target.getAttribute('data-key'),gkind=e.target.getAttribute('data-kind');
      if(gk&&gkind){cfgTplToggleGrad(gkind,gk,e.target.checked);cfgTplUpdateGradPreview(gkind,gk);cfgSave(cfgReadUI());}
    }
    // Offer template gradient direction change
    if(e.target.id&&e.target.id.indexOf('cfg-tpl-')===0&&e.target.id.indexOf('_dir')>0){
      var m=e.target.id.match(/^cfg-tpl-(plakat|flyer)-(\w+)_dir$/);
      if(m){cfgTplUpdateGradPreview(m[1],m[2]);cfgSave(cfgReadUI());}
    }
  });
  // Live gradient preview for offer template color/range changes
  document.addEventListener('input',function(e){
    if(!e.target.id||e.target.id.indexOf('cfg-tpl-')!==0)return;
    var m=e.target.id.match(/^cfg-tpl-(plakat|flyer)-(\w+?)(?:_c2|_pct)?$/);
    if(m){
      var kind=m[1],gk=m[2];
      if(TPL_GRAD_KEYS&&TPL_GRAD_KEYS.indexOf(gk)>=0)cfgTplUpdateGradPreview(kind,gk);
      var pv=document.getElementById(e.target.id+'-val');if(pv)pv.textContent=e.target.value;
    }
  });

  // ── Live Preview System (Angebote + Wochenplan) ──
  var _livePreviewTimers={};
  var _livePreviewGen=0;
  function cfgLivePreview(target){
    target=(target||'plakat').toLowerCase();
    var container=document.getElementById('cfg-live-preview-'+target);
    if(!container)return;
    container.innerHTML='<span style="font-size:12px;color:#6b7280">Wird generiert\u2026</span>';
    var gen=++_livePreviewGen;
    ensureAngeboteForPreview().then(function(){
      if(gen!==_livePreviewGen)return;
      var cfg=Object.assign({},cfgGet(),cfgReadUI());
      var now=new Date();var plus6=new Date(now.getTime()+6*86400000);
      var fallback=[
        {produkt:'Beispielprodukt 1',details:'500g',preis:2.99,statt_preis:3.99,artikelnummer:'',bild_data:''},
        {produkt:'Beispielprodukt 2',details:'450g',preis:3.49,statt_preis:4.29,artikelnummer:'',bild_data:''},
        {produkt:'Beispielprodukt 3',details:'250g',preis:1.99,statt_preis:2.49,artikelnummer:'',bild_data:''},
        {produkt:'Beispielprodukt 4',details:'1kg',preis:4.29,statt_preis:5.29,artikelnummer:'',bild_data:''},
        {produkt:'Beispielprodukt 5',details:'300g',preis:2.49,statt_preis:2.99,artikelnummer:'',bild_data:''},
        {produkt:'Beispielprodukt 6',details:'750g',preis:5.99,statt_preis:6.99,artikelnummer:'',bild_data:''}
      ];
      var src=(angebote&&angebote.length)?angebote.slice(0,6):fallback;
      var previewItems=src.map(function(a,i){var f=fallback[i]||fallback[0];return{produkt:(a&&a.produkt)||f.produkt,details:(a&&a.details)||f.details,preis:(a&&a.preis!=null)?a.preis:f.preis,statt_preis:(a&&a.statt_preis!=null)?a.statt_preis:f.statt_preis,artikelnummer:(a&&a.artikelnummer)||'',bild_data:(a&&a.bild_data)||''};});
      var data={von:now.toISOString().slice(0,10),bis:plus6.toISOString().slice(0,10),items:previewItems};
      if(target==='flyer'){
        var sample=data.items[0]||fallback[0];
        generateEinzelflyer(sample,data,cfg).then(function(canvas){
          if(gen!==_livePreviewGen)return;
          canvas.toBlob(function(blob){
            if(!blob||gen!==_livePreviewGen)return;
            var url=URL.createObjectURL(blob);
            container.innerHTML='<img src="'+url+'" style="max-width:100%;border-radius:6px" alt="Flyer-Vorschau">';
          },'image/png');
        }).catch(function(){container.innerHTML='<span style="font-size:11px;color:#dc2626">Fehler</span>';});
      }else{
        generateAngebotPlakat(data,function(blob){
          if(!blob||gen!==_livePreviewGen)return;
          var url=URL.createObjectURL(blob);
          container.innerHTML='<img src="'+url+'" style="max-width:100%;border-radius:6px" alt="Plakat-Vorschau">';
        },cfg);
      }
    });
  }
  window.cfgLivePreview=cfgLivePreview;

  function _scheduleAutoPreview(key,fn,delay){
    if(_livePreviewTimers[key])clearTimeout(_livePreviewTimers[key]);
    _livePreviewTimers[key]=setTimeout(fn,delay||400);
  }
  function _autoCheckEnabled(id){var cb=document.getElementById(id);return cb?cb.checked:false;}

  // Determine which Angebote section is active
  function _activeCfgSection(){
    var p=document.getElementById('cfg-sec-plakat');
    if(p&&p.style.display!=='none')return 'plakat';
    var f=document.getElementById('cfg-sec-flyer');
    if(f&&f.style.display!=='none')return 'flyer';
    return null;
  }
  // Determine which WP section is active
  function _activeWpSection(){
    var h=document.getElementById('wp-sec-home');
    if(h&&h.style.display!=='none')return 'home';
    var f=document.getElementById('wp-sec-flyer');
    if(f&&f.style.display!=='none')return 'flyer';
    return null;
  }

  // Auto-trigger for Angebote design panel
  function _triggerCfgAutoPreview(){
    var sec=_activeCfgSection();
    if(!sec)return;
    if(!_autoCheckEnabled('cfg-live-auto-'+sec))return;
    _scheduleAutoPreview('cfg-'+sec,function(){cfgLivePreview(sec);});
  }
  // Auto-trigger for WP design panel
  function _triggerWpAutoPreview(){
    var sec=_activeWpSection();
    if(!sec)return;
    if(!_autoCheckEnabled('cfg-live-auto-wp-'+sec))return;
    _scheduleAutoPreview('wp-'+sec,function(){wpLivePreview(sec);});
  }

  // Hook into input/change events on the two design panels
  var _cfgPlakatPanel=document.getElementById('cms-cfg-plakat');
  var _cfgWpPanel=document.getElementById('cms-cfg-wp');
  if(_cfgPlakatPanel){
    _cfgPlakatPanel.addEventListener('input',function(){_triggerCfgAutoPreview();});
    _cfgPlakatPanel.addEventListener('change',function(){_triggerCfgAutoPreview();});
  }
  if(_cfgWpPanel){
    _cfgWpPanel.addEventListener('input',function(){_triggerWpAutoPreview();});
    _cfgWpPanel.addEventListener('change',function(){_triggerWpAutoPreview();});
  }

  // Click on preview container → open large modal
  document.addEventListener('click',function(e){
    var t=e.target;
    if(t.tagName==='IMG'&&t.parentElement&&/^(cfg-live-preview-|wp-.*-live-preview)/.test(t.parentElement.id)){
      var blob;
      var url=t.src;
      var fn=t.alt||'Vorschau.png';
      // Show in modal
      var html='<div class="cms-modal-bg"><div class="cms-modal" style="max-width:90vw;max-height:90vh;text-align:center;overflow:auto">';
      html+='<h3 style="margin:0 0 12px;font-size:15px">Vorschau (Gro\u00df)</h3>';
      html+='<img src="'+url+'" style="max-width:100%;max-height:75vh;border-radius:8px;border:1px solid #e5e7eb">';
      html+='<div style="display:flex;gap:8px;justify-content:center;margin-top:12px;flex-wrap:wrap">';
      html+='<button class="cms-btn cms-btn-gray" id="cfg-lp-dl">\u2b07\ufe0f Download</button>';
      html+='<button class="cms-btn cms-btn-gray" data-action="closeModal">Schlie\u00dfen</button>';
      html+='</div></div></div>';
      var wrap=document.getElementById('cms-modal-wrap');
      wrap.innerHTML=html;wrap.style.display='';
      document.getElementById('cfg-lp-dl').onclick=function(){
        var a=document.createElement('a');a.href=url;a.download=fn;a.click();
      };
    }
  });

  // --- HP-Sonderangebote Card Design ---
  var HPANG_KEY='dl_hpang_design';
  var HPANG_DEFAULTS={
    gridBg:'#f4f1ea',cardBg:'#ffffff',cardBorder:'#e8e5de',nameColor:'#111111',detColor:'#555555',
    tagBg:'#a51d2d',tagText:'#ffffff',badgeBg:'#a51d2d',stattColor:'#666666',
    tagSkew:-4,tagRadius:5,headerBg:'#c62828',headerText:'#ffffff',
    cardRadius:16,imgSize:95,showLeaf:true,showBasket:true
  };
  var _hpangViewMode='desktop';

  function hpangGet(){
    try{var s=localStorage.getItem(HPANG_KEY);if(s){var p=JSON.parse(s);var r={};for(var k in HPANG_DEFAULTS)r[k]=p[k]!=null?p[k]:HPANG_DEFAULTS[k];return r;}}catch(e){}
    return JSON.parse(JSON.stringify(HPANG_DEFAULTS));
  }
  function hpangSave(cfg){try{localStorage.setItem(HPANG_KEY,JSON.stringify(cfg));}catch(e){}}

  function hpangReadUI(){
    var c={};
    ['gridBg','cardBg','cardBorder','nameColor','detColor','tagBg','tagText','badgeBg','stattColor','headerBg','headerText'].forEach(function(k){
      var el=document.getElementById('hpang-'+k);if(el)c[k]=el.value;
    });
    ['tagSkew','tagRadius','cardRadius','imgSize'].forEach(function(k){
      var el=document.getElementById('hpang-'+k);if(el)c[k]=parseInt(el.value);
    });
    ['showLeaf','showBasket'].forEach(function(k){
      var el=document.getElementById('hpang-'+k);if(el)c[k]=el.checked;
    });
    return c;
  }
  function hpangApplyUI(c){
    ['gridBg','cardBg','cardBorder','nameColor','detColor','tagBg','tagText','badgeBg','stattColor','headerBg','headerText'].forEach(function(k){
      var el=document.getElementById('hpang-'+k);if(el)el.value=c[k]||HPANG_DEFAULTS[k];
    });
    ['tagSkew','tagRadius','cardRadius','imgSize'].forEach(function(k){
      var el=document.getElementById('hpang-'+k);if(el)el.value=c[k]!=null?c[k]:HPANG_DEFAULTS[k];
      var vEl=document.getElementById('hpang-'+k+'-val');
      if(vEl){var u={tagSkew:'\u00B0',tagRadius:'px',cardRadius:'px',imgSize:'px'};vEl.textContent=(c[k]!=null?c[k]:HPANG_DEFAULTS[k])+(u[k]||'');}
    });
    ['showLeaf','showBasket'].forEach(function(k){
      var el=document.getElementById('hpang-'+k);if(el)el.checked=c[k]!=null?c[k]:HPANG_DEFAULTS[k];
    });
    hpangRenderPreview();
  }

  // Sample data for the live preview
  var HPANG_SAMPLES=[
    {produkt:'Bio Alpenmilch 3,5%',details:'1L Packung',preis:1.89,statt:2.49,artnr:'12345'},
    {produkt:'Bauernbrot Vollkorn',details:'750g',preis:3.49,statt:4.29,artnr:'23456'},
    {produkt:'Freiland-Eier 10er',details:'Gr\u00f6\u00dfe M',preis:3.29,statt:3.99,artnr:'34567'},
    {produkt:'Bergk\u00e4se W\u00fcrzig',details:'200g',preis:4.49,statt:5.79,artnr:'45678'}
  ];

  function hpangRenderPreview(){
    var wrap=document.getElementById('hpang-preview-wrap');
    var container=document.getElementById('hpang-preview');
    if(!container||!wrap)return;
    var c=hpangReadUI();
    var isMobile=_hpangViewMode==='mobile';

    wrap.style.background=c.gridBg;
    container.style.maxWidth=isMobile?'380px':'100%';

    // Build header
    var html='<div style="background:linear-gradient(135deg,'+c.headerBg+' 0%,'+c.headerBg+' 50%,'+adjustColor(c.headerBg,20)+' 100%);color:'+c.headerText+';padding:12px 16px;display:flex;align-items:center;gap:8px;font-size:14px;font-weight:700;border-radius:12px 12px 0 0">';
    html+='<svg viewBox="0 0 24 24" style="width:18px;height:18px;fill:'+c.headerText+'"><path d="M21.41 11.58l-9-9C12.05 2.22 11.55 2 11 2H4c-1.1 0-2 .9-2 2v7c0 .55.22 1.05.59 1.42l9 9c.36.36.86.58 1.41.58s1.05-.22 1.41-.59l7-7c.37-.36.59-.86.59-1.41s-.23-1.06-.59-1.42zM5.5 7C4.67 7 4 6.33 4 5.5S4.67 4 5.5 4 7 4.67 7 5.5 6.33 7 5.5 7z"/></svg>';
    html+='<span>Sonderangebote</span>';
    html+='<span style="font-size:11px;font-weight:400;opacity:.85;margin-left:auto">'+HPANG_SAMPLES.length+' Artikel</span>';
    html+='</div>';

    // Build grid
    var cols=isMobile?'1fr':'repeat(auto-fill,minmax(320px,1fr))';
    html+='<div style="display:grid;grid-template-columns:'+cols+';gap:14px;padding:14px;background:'+c.gridBg+';border-radius:0 0 12px 12px">';

    HPANG_SAMPLES.forEach(function(a){
      var pct=a.statt>0&&a.preis>0?Math.round((a.statt-a.preis)/a.statt*100):0;
      var pi=Math.floor(a.preis);var pf=Math.round((a.preis-pi)*100);var cs=pf<10?'0'+pf:String(pf);
      var imgSz=isMobile?'70':String(c.imgSize);
      var cardMinH=isMobile?'90':'110';

      html+='<div style="background:'+c.cardBg+';border:1px solid '+c.cardBorder+';border-radius:'+c.cardRadius+'px;padding:'+(isMobile?'10':'14')+'px 12px;position:relative;box-shadow:0 2px 8px rgba(0,0,0,.06);display:grid;grid-template-columns:'+imgSz+'px 1fr auto;gap:0 10px;overflow:visible;min-height:'+cardMinH+'px">';
      // Leaf
      if(c.showLeaf) html+='<span style="position:absolute;top:6px;right:6px;opacity:.15;font-size:1.4rem;pointer-events:none">\uD83C\uDF3F</span>';
      // Badge
      if(pct>0) html+='<div style="position:absolute;top:-4px;left:6px;background:'+c.badgeBg+';color:#fff;font-size:.68rem;font-weight:800;padding:3px 9px;border-radius:0 0 8px 8px;letter-spacing:.3px;z-index:3">-'+pct+'%</div>';
      // Image placeholder
      html+='<div style="width:'+imgSz+'px;height:'+imgSz+'px;overflow:hidden;border-radius:10px;background:#faf9f6;display:flex;align-items:center;justify-content:center;grid-row:1/3">';
      html+='<span style="font-size:2rem;opacity:.4">\uD83D\uDED2</span></div>';
      // Info
      html+='<div style="min-width:0;display:flex;flex-direction:column;justify-content:flex-start;grid-column:2;grid-row:1/3;padding-top:2px">';
      html+='<div style="font-weight:800;font-size:'+(isMobile?'1rem':'1.02rem')+';color:'+c.nameColor+';margin-bottom:3px;line-height:1.22">'+a.produkt+'</div>';
      if(a.details) html+='<div style="font-size:.88rem;color:'+c.detColor+';font-weight:500">'+a.details+'</div>';
      html+='</div>';
      // Price tag
      html+='<div style="grid-column:3;grid-row:1/3;display:flex;flex-direction:column;align-items:center;justify-content:center;min-width:'+(isMobile?'75':'82')+'px;gap:6px">';
      html+='<div style="background:'+c.tagBg+';color:'+c.tagText+';font-weight:900;font-size:'+(isMobile?'1.2rem':'1.6rem')+';padding:'+(isMobile?'10px 12px':'14px 18px')+';border-radius:'+c.tagRadius+'px;transform:rotate('+c.tagSkew+'deg) skewY('+(c.tagSkew*0.75)+'deg);box-shadow:5px 5px 0 rgba(80,0,0,.35);text-align:center;line-height:1;white-space:nowrap;position:relative">';
      html+=pi+','+cs+'<span style="font-size:.5em;vertical-align:super;margin-left:1px">\u20AC</span>';
      html+='<div style="position:absolute;top:0;left:0;right:0;bottom:50%;background:linear-gradient(to bottom,rgba(255,255,255,.15),transparent);border-radius:'+c.tagRadius+'px '+c.tagRadius+'px 0 0"></div>';
      html+='</div>';
      if(a.statt) html+='<span style="font-size:.78rem;color:'+c.stattColor+';text-decoration:line-through;font-weight:400;font-style:italic;transform:rotate(-2deg)">'+a.statt.toFixed(2).replace('.',',')+' \u20AC</span>';
      html+='</div>';
      // Basket
      if(c.showBasket) html+='<span style="position:absolute;bottom:4px;right:12px;opacity:.12;font-size:1.6rem;pointer-events:none">\uD83D\uDED2</span>';
      html+='</div>';
    });
    html+='</div>';
    container.innerHTML=html;
  }

  function adjustColor(hex,amt){
    var r=parseInt(hex.slice(1,3),16),g=parseInt(hex.slice(3,5),16),b=parseInt(hex.slice(5,7),16);
    r=Math.min(255,r+amt);g=Math.min(255,g+amt);b=Math.min(255,b+amt);
    return '#'+[r,g,b].map(function(c){return c.toString(16).padStart(2,'0');}).join('');
  }

  // View toggle
  window.hpangSetView=function(mode){
    _hpangViewMode=mode;
    document.querySelectorAll('.hpang-view-btn').forEach(function(btn){
      var active=btn.getAttribute('data-mode')===mode;
      btn.classList.toggle('active',active);
      btn.style.background=active?'#fff':'transparent';
      btn.style.color=active?'#374151':'#6b7280';
    });
    hpangRenderPreview();
  };

  // Save / Revert / Reset
  window.hpangSaveCfg=function(){
    var c=hpangReadUI();
    hpangSave(c);
    toast('HP-Sonderangebote Design gespeichert','ok');
  };
  window.hpangRevert=function(){
    hpangApplyUI(hpangGet());
    toast('\u00c4nderungen verworfen','ok');
  };
  window.hpangReset=function(){
    var d=JSON.parse(JSON.stringify(HPANG_DEFAULTS));
    hpangSave(d);
    hpangApplyUI(d);
    toast('Auf Standardwerte zur\u00fcckgesetzt','ok');
  };

  // Live update on input
  document.addEventListener('input',function(e){
    if(!e.target.classList.contains('hpang-ctl'))return;
    var id=e.target.id;
    var valEl=document.getElementById(id+'-val');
    if(valEl){
      var u={tagSkew:'\u00B0',tagRadius:'px',cardRadius:'px',imgSize:'px'};
      var k=id.replace('hpang-','');
      valEl.textContent=e.target.value+(u[k]||'');
    }
    hpangRenderPreview();
  });
  document.addEventListener('change',function(e){
    if(e.target.classList.contains('hpang-ctl'))hpangRenderPreview();
  });

  // Load on tab switch
  var _hpangLoaded=false;
  var _origCmsCfgSubTab=window.cmsCfgSubTab;
  window.cmsCfgSubTab=function(id){
    _origCmsCfgSubTab(id);
    if(id==='cfg-hpang'&&!_hpangLoaded){
      _hpangLoaded=true;
      hpangApplyUI(hpangGet());
    }
  };

  // --- Homepage/Wochenplan Config (hpCfg) ---
  var HPCFG_KEY='dl_hp_design_config';
  var HPCFG_GRAD_KEYS=['priColor','priHover','accColor','bgColor'];
  var HPCFG_DEFAULTS={
    priColor:'#5ea88a',priColor_grad:false,priColor_c2:'#4a8e73',priColor_dir:'to bottom',priColor_pct:50,
    priHover:'#4a8e73',priHover_grad:false,priHover_c2:'#3a7e63',priHover_dir:'to bottom',priHover_pct:50,
    accColor:'#d32f2f',accColor_grad:false,accColor_c2:'#b71c1c',accColor_dir:'to bottom',accColor_pct:50,
    bgColor:'#f4f6f4',bgColor_grad:false,bgColor_c2:'#e8ece8',bgColor_dir:'to bottom',bgColor_pct:50,
    textColor:'#16162a',
    showTopbar:true,showPromoBar:true,showMeatPromo:true,showDoGehIHi:true,showInfoCards:true,showWhatsApp:true,showCookie:true,
    baseFontSize:15,borderRadius:12,
    wpHeaderFrom:'#5ea88a',wpHeaderTo:'#4a8e73',wpDishColor:'#1a1a1a',wpPriceColor:'#2d7a5e',
    wpStripeColor:'#f0f7f0',wpDayColor:'#5ea88a',
    wpShowCard:true,wpShowOeko:true,wpShowVorbestell:true,wpShowPhone:true,wpShowWaShare:true,wpShowWaInfo:true,
    wpDishFontSize:0.92,wpPriceFontSize:0.92,
    wpHomeTemplate:'classic-red',wpFlyerTemplate:'classic-red',
    heroOverlay:50,heroFontSize:2
  };
  // Wochenplan template color defaults per template
  var WP_TPL_COLOR_DEFAULTS={
    'classic-red':{wpHeaderFrom:'#5ea88a',wpHeaderTo:'#4a8e73',wpDishColor:'#1a1a1a',wpPriceColor:'#2d7a5e',wpStripeColor:'#f0f7f0',wpDayColor:'#5ea88a',wpBgColor:'#ffffff',wpHeaderDir:'135deg'},
    'clean-white':{wpHeaderFrom:'#f3f4f6',wpHeaderTo:'#e5e7eb',wpDishColor:'#111827',wpPriceColor:'#374151',wpStripeColor:'#f9fafb',wpDayColor:'#111827',wpBgColor:'#ffffff',wpHeaderDir:'135deg'},
    'dark-modern':{wpHeaderFrom:'#1e40af',wpHeaderTo:'#1e3a8a',wpDishColor:'#f1f5f9',wpPriceColor:'#93c5fd',wpStripeColor:'#1e293b',wpDayColor:'#60a5fa',wpBgColor:'#0f172a',wpHeaderDir:'135deg'},
    'tafel':{wpHeaderFrom:'#2d5a3f',wpHeaderTo:'#1a3c28',wpDishColor:'#e8e0d0',wpPriceColor:'#c8b898',wpStripeColor:'#1e4430',wpDayColor:'#e8e0d0',wpBgColor:'#1a3c28',wpHeaderDir:'135deg'},
    'bento':{wpHeaderFrom:'#5ea88a',wpHeaderTo:'#4a8e73',wpDishColor:'#1e293b',wpPriceColor:'#059669',wpStripeColor:'#f0fdf4',wpDayColor:'#059669',wpBgColor:'#f8fafc',wpHeaderDir:'135deg'},
    'timeline':{wpHeaderFrom:'#0284c7',wpHeaderTo:'#0369a1',wpDishColor:'#0f172a',wpPriceColor:'#0284c7',wpStripeColor:'#f0f9ff',wpDayColor:'#0284c7',wpBgColor:'#f0f9ff',wpHeaderDir:'135deg'},
    'zeitung':{wpHeaderFrom:'#292524',wpHeaderTo:'#1c1917',wpDishColor:'#1c1917',wpPriceColor:'#44403c',wpStripeColor:'#fafaf9',wpDayColor:'#44403c',wpBgColor:'#fafaf9',wpHeaderDir:'to right'}
  };
  var WP_TPL_COLOR_KEYS=['wpHeaderFrom','wpHeaderTo','wpDishColor','wpPriceColor','wpStripeColor','wpDayColor','wpBgColor','wpHeaderDir'];
  function getWpTplColors(tplName,cfg,kind){
    var defaults=WP_TPL_COLOR_DEFAULTS[tplName]||WP_TPL_COLOR_DEFAULTS['classic-red'];
    // Look up kind-prefixed key first (e.g. 'home:classic-red'), fall back to legacy non-prefixed key
    var tc=cfg.wpTplColors||{};
    var overrides=(kind&&tc[kind+':'+tplName])||tc[tplName]||{};
    var result={};
    WP_TPL_COLOR_KEYS.forEach(function(k){result[k]=overrides[k]||defaults[k];});
    return result;
  }
  function hpCfgGet(){
    try{var s=localStorage.getItem(HPCFG_KEY);if(s){var o=JSON.parse(s);var r={};for(var k in HPCFG_DEFAULTS)r[k]=o.hasOwnProperty(k)?o[k]:HPCFG_DEFAULTS[k];if(o.wpTplColors)r.wpTplColors=o.wpTplColors;return r;}}catch(e){}
    return JSON.parse(JSON.stringify(HPCFG_DEFAULTS));
  }
  function hpCfgSave(o){
    try{localStorage.setItem(HPCFG_KEY,JSON.stringify(o));}catch(e){}
    fetch(API+'/cms-config',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({name:'hp_design_config',wert:o})})
      .then(function(r){return r.json();})
      .then(function(res){if(!res.success)console.warn('HP Design save to Dataverse failed',res.error);})
      .catch(function(e){console.warn('HP Design save error',e);});
  }
  function hpCfgReadUI(){
    var c={};
    ['priColor','priHover','accColor','bgColor','textColor'].forEach(function(k){
      var el=document.getElementById('hcfg-'+k);if(el)c[k]=el.value;
    });
    HPCFG_GRAD_KEYS.forEach(function(k){
      var tgl=document.querySelector('.hcfg-grad-toggle[data-key="'+k+'"]');
      if(tgl)c[k+'_grad']=tgl.checked;
      var c2=document.getElementById('hcfg-'+k+'2');if(c2)c[k+'_c2']=c2.value;
      var dir=document.getElementById('hcfg-'+k+'Dir');if(dir)c[k+'_dir']=dir.value;
      var pct=document.getElementById('hcfg-'+k+'Pct');if(pct)c[k+'_pct']=parseInt(pct.value);
    });
    ['wpHeaderFrom','wpHeaderTo','wpDishColor','wpPriceColor','wpStripeColor','wpDayColor'].forEach(function(k){
      var el=document.getElementById('hcfg-'+k);if(el)c[k]=el.value;
    });
    ['showTopbar','showPromoBar','showMeatPromo','showDoGehIHi','showInfoCards','showWhatsApp','showCookie'].forEach(function(k){
      var el=document.getElementById('hcfg-'+k);if(el)c[k]=el.checked;
    });
    ['wpShowCard','wpShowOeko','wpShowVorbestell','wpShowPhone','wpShowWaShare','wpShowWaInfo'].forEach(function(k){
      var el=document.getElementById('hcfg-'+k);if(el)c[k]=el.checked;
    });
    ['baseFontSize','borderRadius'].forEach(function(k){
      var el=document.getElementById('hcfg-'+k);if(el)c[k]=parseInt(el.value);
    });
    ['wpDishFontSize','wpPriceFontSize'].forEach(function(k){
      var el=document.getElementById('hcfg-'+k);if(el)c[k]=parseFloat(el.value);
    });
    ['heroOverlay','heroFontSize'].forEach(function(k){
      var el=document.getElementById('hcfg-'+k);if(el)c[k]=parseFloat(el.value);
    });
    var ht=document.getElementById('hcfg-wpHomeTemplate');if(ht)c.wpHomeTemplate=ht.value;
    var ft=document.getElementById('hcfg-wpFlyerTemplate');if(ft)c.wpFlyerTemplate=ft.value;
    // Read per-template color overrides from the template-specific inputs (keyed as kind:tpl)
    var tplColors={};
    ['flyer','home'].forEach(function(kind){
      var selId=kind==='flyer'?'hcfg-wpFlyerTemplate':'hcfg-wpHomeTemplate';
      var sel=document.getElementById(selId);if(!sel)return;
      var tpl=sel.value||'classic-red';
      var tplDef=WP_TPL_COLOR_DEFAULTS[tpl]||WP_TPL_COLOR_DEFAULTS['classic-red'];
      var storeKey=kind+':'+tpl;
      if(!tplColors[storeKey])tplColors[storeKey]={};
      WP_TPL_COLOR_KEYS.forEach(function(ck){
        var el=document.getElementById('hcfg-wpTpl-'+kind+'-'+ck);
        var v=el?el.value:'';
        // If input is uninitialized (#000000), use template default
        if(!v||v==='#000000')v=tplDef[ck]||'';
        if(v)tplColors[storeKey][ck]=v;
      });
    });
    // Preserve existing overrides for other templates not currently displayed
    var existing=hpCfgGet();
    if(existing.wpTplColors){
      for(var t in existing.wpTplColors){
        if(!tplColors[t])tplColors[t]=existing.wpTplColors[t];
      }
    }
    c.wpTplColors=tplColors;
    // Sync flat color keys + hidden inputs from current home template for backward compat
    var homeTpl=c.wpHomeTemplate||'classic-red';
    var htd=WP_TPL_COLOR_DEFAULTS[homeTpl]||WP_TPL_COLOR_DEFAULTS['classic-red'];
    var hto=(tplColors['home:'+homeTpl])||{};
    ['wpHeaderFrom','wpHeaderTo','wpDishColor','wpPriceColor','wpStripeColor','wpDayColor'].forEach(function(k){
      c[k]=hto[k]||htd[k];
      var el=document.getElementById('hcfg-'+k);if(el)el.value=c[k];
    });
    return c;
  }
  function hpCfgApplyUI(c){
    ['priColor','priHover','accColor','bgColor','textColor'].forEach(function(k){
      var el=document.getElementById('hcfg-'+k);if(el)el.value=c[k]||HPCFG_DEFAULTS[k];
    });
    HPCFG_GRAD_KEYS.forEach(function(k){
      var tgl=document.querySelector('.hcfg-grad-toggle[data-key="'+k+'"]');
      var isGrad=c[k+'_grad']||false;
      if(tgl){tgl.checked=isGrad;hpCfgToggleGrad(k,isGrad);}
      var c2=document.getElementById('hcfg-'+k+'2');if(c2)c2.value=c[k+'_c2']||HPCFG_DEFAULTS[k+'_c2'];
      var dir=document.getElementById('hcfg-'+k+'Dir');if(dir)dir.value=c[k+'_dir']||HPCFG_DEFAULTS[k+'_dir'];
      var pct=document.getElementById('hcfg-'+k+'Pct');if(pct){pct.value=c[k+'_pct']!=null?c[k+'_pct']:HPCFG_DEFAULTS[k+'_pct'];var pv=document.getElementById('hcfg-'+k+'Pct-val');if(pv)pv.textContent=pct.value;}
      hpCfgUpdateGradPreview(k);
    });
    // Sync old global WP color inputs with current home template colors
    var _tpl=c.wpHomeTemplate||'classic-red';
    var _td=WP_TPL_COLOR_DEFAULTS[_tpl]||WP_TPL_COLOR_DEFAULTS['classic-red'];
    var _to=(c.wpTplColors&&(c.wpTplColors['home:'+_tpl]||c.wpTplColors[_tpl]))||{};
    ['wpHeaderFrom','wpHeaderTo','wpDishColor','wpPriceColor','wpStripeColor','wpDayColor'].forEach(function(k){
      var el=document.getElementById('hcfg-'+k);if(el)el.value=_to[k]||_td[k]||c[k]||HPCFG_DEFAULTS[k];
    });
    ['showTopbar','showPromoBar','showMeatPromo','showDoGehIHi','showInfoCards','showWhatsApp','showCookie'].forEach(function(k){
      var el=document.getElementById('hcfg-'+k);if(el)el.checked=c.hasOwnProperty(k)?c[k]:HPCFG_DEFAULTS[k];
    });
    ['wpShowCard','wpShowOeko','wpShowVorbestell','wpShowPhone','wpShowWaShare','wpShowWaInfo'].forEach(function(k){
      var el=document.getElementById('hcfg-'+k);if(el)el.checked=c.hasOwnProperty(k)?c[k]:HPCFG_DEFAULTS[k];
    });
    ['baseFontSize','borderRadius'].forEach(function(k){
      var el=document.getElementById('hcfg-'+k);if(el){el.value=c[k]!=null?c[k]:HPCFG_DEFAULTS[k];var v=document.getElementById('hcfg-'+k+'-val');if(v)v.textContent=el.value;}
    });
    ['wpDishFontSize','wpPriceFontSize'].forEach(function(k){
      var el=document.getElementById('hcfg-'+k);if(el){el.value=c[k]||HPCFG_DEFAULTS[k];var v=document.getElementById('hcfg-'+k+'-val');if(v)v.textContent=el.value;}
    });
    ['heroOverlay','heroFontSize'].forEach(function(k){
      var el=document.getElementById('hcfg-'+k);if(el){el.value=c[k]!=null?c[k]:HPCFG_DEFAULTS[k];var v=document.getElementById('hcfg-'+k+'-val');if(v)v.textContent=el.value;}
    });
    var ht=document.getElementById('hcfg-wpHomeTemplate');if(ht)ht.value=c.wpHomeTemplate||'classic-red';
    var ft=document.getElementById('hcfg-wpFlyerTemplate');if(ft)ft.value=c.wpFlyerTemplate||'classic-red';
    hpCfgSyncWpPreview();
    hpCfgSyncWpFlyerPreview();
    hpCfgSyncWpTplColors('home',c);
    hpCfgSyncWpTplColors('flyer',c);
  }
  function hpCfgToggleGrad(k,on){
    var row=document.querySelector('.hcfg-grad-row[data-key="'+k+'"]');if(!row)return;
    var c2=row.querySelector('.hcfg-grad-c2');if(c2)c2.style.display=on?'':'none';
    var opts=row.querySelector('.hcfg-grad-opts');if(opts)opts.style.display=on?'':'none';
  }
  function hpCfgUpdateGradPreview(k){
    var prev=document.getElementById('hcfg-'+k+'-preview');if(!prev)return;
    var c1El=document.getElementById('hcfg-'+k);
    var c2El=document.getElementById('hcfg-'+k+'2');
    var dirEl=document.getElementById('hcfg-'+k+'Dir');
    var pctEl=document.getElementById('hcfg-'+k+'Pct');
    if(!c1El||!c2El)return;
    var c1=c1El.value,c2=c2El.value,dir=dirEl?dirEl.value:'to bottom',pct=pctEl?pctEl.value:'50';
    prev.style.background='linear-gradient('+dir+', '+c1+' 0%, '+c1+' '+pct+'%, '+c2+' 100%)';
  }
  function hpCfgBuildGradCSS(c,k){
    if(!c[k+'_grad'])return c[k]||HPCFG_DEFAULTS[k];
    var c1=c[k]||HPCFG_DEFAULTS[k];
    var c2=c[k+'_c2']||HPCFG_DEFAULTS[k+'_c2'];
    var dir=c[k+'_dir']||'to bottom';
    var pct=c[k+'_pct']!=null?c[k+'_pct']:50;
    return 'linear-gradient('+dir+', '+c1+' 0%, '+c1+' '+pct+'%, '+c2+' 100%)';
  }
  // Gradient toggle event listener
  document.addEventListener('change',function(e){
    if(!e.target.classList.contains('hcfg-grad-toggle'))return;
    var k=e.target.getAttribute('data-key');if(!k)return;
    hpCfgToggleGrad(k,e.target.checked);
    hpCfgUpdateGradPreview(k);
  });
  // Gradient live-preview on color/slider/select change
  document.addEventListener('input',function(e){
    var id=e.target.id;if(!id||id.indexOf('hcfg-')!==0)return;
    HPCFG_GRAD_KEYS.forEach(function(k){
      if(id==='hcfg-'+k||id==='hcfg-'+k+'2'||id==='hcfg-'+k+'Dir'||id==='hcfg-'+k+'Pct'){
        hpCfgUpdateGradPreview(k);
      }
    });
  });
  function hpCfgLoadUI(){
    var c=hpCfgGet();
    hpCfgApplyUI(c);
    if(typeof wpPresetsRenderAll==='function')wpPresetsRenderAll();
    fetch(API+'/cms-config')
      .then(function(r){return r.json();})
      .then(function(res){
        if(!res.success||!res.data)return;
        var dvCfg=res.data['hp_design_config'];
        if(dvCfg&&typeof dvCfg==='object'){
          var merged={};for(var k in HPCFG_DEFAULTS)merged[k]=dvCfg.hasOwnProperty(k)?dvCfg[k]:HPCFG_DEFAULTS[k];
          if(dvCfg.wpTplColors)merged.wpTplColors=dvCfg.wpTplColors;
          try{localStorage.setItem(HPCFG_KEY,JSON.stringify(merged));}catch(e){}
          hpCfgApplyUI(merged);
        }
      })
      .catch(function(e){console.warn('HP Design load from Dataverse failed',e);});
  }
  function hpCfgSyncWpPreview(){
    var sel=document.getElementById('hcfg-wpHomeTemplate');if(!sel)return;
    var v=(sel.value||'classic-red').toLowerCase();
    var btns=document.querySelectorAll('#hcfg-wpHomeTemplate-preview .cms-wp-preview');
    btns.forEach(function(b){b.classList.toggle('active',((b.getAttribute('data-value')||'').toLowerCase()===v));});
  }
  function hpCfgSyncWpFlyerPreview(){
    var sel=document.getElementById('hcfg-wpFlyerTemplate');if(!sel)return;
    var v=(sel.value||'classic-red').toLowerCase();
    var btns=document.querySelectorAll('#hcfg-wpFlyerTemplate-preview .cms-wp-preview');
    btns.forEach(function(b){b.classList.toggle('active',((b.getAttribute('data-value')||'').toLowerCase()===v));});
  }
  function wpTplGradPreview(kind){
    var c1=document.getElementById('hcfg-wpTpl-'+kind+'-wpHeaderFrom');
    var c2=document.getElementById('hcfg-wpTpl-'+kind+'-wpHeaderTo');
    var dir=document.getElementById('hcfg-wpTpl-'+kind+'-wpHeaderDir');
    var prev=document.getElementById('hcfg-wpTpl-'+kind+'-gradPreview');
    if(!c1||!c2||!dir||!prev)return;
    prev.style.background='linear-gradient('+dir.value+', '+c1.value+' 0%, '+c2.value+' 100%)';
  }
  function hpCfgSyncWpTplColors(kind,cfg){
    if(!cfg)cfg=hpCfgGet();
    var selId=kind==='flyer'?'hcfg-wpFlyerTemplate':'hcfg-wpHomeTemplate';
    var sel=document.getElementById(selId);if(!sel)return;
    var tpl=sel.value||'classic-red';
    var colors=getWpTplColors(tpl,cfg,kind);
    WP_TPL_COLOR_KEYS.forEach(function(ck){
      var el=document.getElementById('hcfg-wpTpl-'+kind+'-'+ck);
      if(!el)return;
      if(el.tagName==='SELECT'){el.value=colors[ck]||'135deg';}
      else{el.value=colors[ck]||'#000000';}
    });
    wpTplGradPreview(kind);
  }
  // Live-preview for WP template gradient inputs
  document.addEventListener('input',function(e){
    if(!e.target.classList.contains('wpTpl-grad-input'))return;
    var kind=e.target.getAttribute('data-kind');if(kind)wpTplGradPreview(kind);
  });
  document.addEventListener('change',function(e){
    if(!e.target.classList.contains('wpTpl-grad-input'))return;
    var kind=e.target.getAttribute('data-kind');if(kind)wpTplGradPreview(kind);
  });
  window.saveHPCfg=function(){
    var c=hpCfgReadUI();
    hpCfgSave(c);
    hpCfgSyncWpTplColors('home',c);
    hpCfgSyncWpTplColors('flyer',c);
    toast('Design gespeichert','ok');
  };
  window.resetHPCfg=function(){
    var defaults=JSON.parse(JSON.stringify(HPCFG_DEFAULTS));
    defaults.wpTplColors={};
    hpCfgSave(defaults);
    hpCfgApplyUI(defaults);
    toast('Wochenplan-Design zur\u00fcckgesetzt','ok');
  };
  window.resetWpTplColors=function(kind){
    kind=kind||'home';
    var selId=kind==='flyer'?'hcfg-wpFlyerTemplate':'hcfg-wpHomeTemplate';
    var sel=document.getElementById(selId);if(!sel)return;
    var tpl=sel.value||'classic-red';
    var cfg=hpCfgGet();
    if(cfg.wpTplColors){
      // Delete kind-prefixed key and legacy key
      delete cfg.wpTplColors[kind+':'+tpl];
      delete cfg.wpTplColors[tpl];
    }
    hpCfgSave(cfg);
    hpCfgSyncWpTplColors(kind,cfg);
    toast('Farben f\u00fcr '+tpl+' zur\u00fcckgesetzt','ok');
  };

  // ── WP Revert Section (discard unsaved changes) ──
  window.wpRevertSection=function(kind){
    var saved=hpCfgGet();
    hpCfgApplyUI(saved);
    toast('\u00c4nderungen verworfen \u2013 gespeicherter Stand wiederhergestellt','ok');
  };

  // ── WP Live Preview (inline) ──
  window.wpLivePreview=function(kind){
    kind=kind||'home';
    var uiCfg=hpCfgReadUI();
    try{localStorage.setItem(HPCFG_KEY,JSON.stringify(uiCfg));}catch(e){}
    var selId=(kind==='flyer')?'hcfg-wpFlyerTemplate':'hcfg-wpHomeTemplate';
    var sel=document.getElementById(selId);
    var tpl=(sel&&sel.value)?sel.value:'classic-red';
    var mealRows=[];
    var byDay={};
    [101000,101001,101002,101003,101004].forEach(function(d){byDay[d]=[];});
    if(typeof meals!=='undefined')meals.forEach(function(m){if(byDay[m.wochentag])byDay[m.wochentag].push(m);});
    var hasMeals=false;
    [101000,101001,101002,101003,101004].forEach(function(dc){
      var items=byDay[dc]||[];
      if(items.length===0){mealRows.push({day:DAYS[dc],dish:'\u2014',price:'',alt:''});return;}
      hasMeals=true;
      items.forEach(function(m,idx){
        mealRows.push({day:idx===0?DAYS[dc]:'',dish:m.gericht||m.beschreibung||'\u2014',price:m.preis?fmtPriceWA(m.preis):'',alt:''});
      });
    });
    if(!hasMeals){
      mealRows=[
        {day:'Montag',dish:'Wiener Schnitzel mit Kartoffelsalat',price:'8,50 \u20ac',alt:''},
        {day:'Dienstag',dish:'Gem\u00fcse-Curry mit Reis',price:'7,90 \u20ac',alt:''},
        {day:'Mittwoch',dish:'Schweinebraten mit Kn\u00f6del',price:'9,20 \u20ac',alt:''},
        {day:'Donnerstag',dish:'Pasta Bolognese',price:'7,50 \u20ac',alt:''},
        {day:'Freitag',dish:'Backfisch mit Remoulade',price:'8,80 \u20ac',alt:''}
      ];
    }
    var r=(typeof weekRange==='function'&&typeof kw!=='undefined')?weekRange(kw,jahr):null;
    var header=r?('KW '+kw+' \u00b7 '+fmtD(r.start)+' \u2013 '+fmtD(r.end)):'KW 21 \u00b7 19.05. \u2013 23.05.2025';
    var containerId=kind==='flyer'?'wp-flyer-live-preview':'wp-home-live-preview';
    var container=document.getElementById(containerId);
    if(!container)return;
    container.innerHTML='<span style="font-size:12px;color:#6b7280">Wird generiert\u2026</span>';
    if(typeof generateMenuImage==='function'){
      generateMenuImage(mealRows,header,function(blob){
        var url=URL.createObjectURL(blob);
        container.innerHTML='<img src="'+url+'" style="max-width:100%;border-radius:6px" alt="Vorschau">';
      },tpl,kind);
    }else{
      container.innerHTML='<span style="font-size:12px;color:#dc2626">generateMenuImage nicht verf\u00fcgbar</span>';
    }
  };

  // ── WP Preset/Vorlagen System ──
  var WP_PRESETS_KEY='dl_wp_design_presets';
  function wpPresetsGet(){
    try{var s=localStorage.getItem(WP_PRESETS_KEY);if(s)return JSON.parse(s);}catch(e){}
    return {'wp-home':[],'wp-flyer':[]};
  }
  function wpPresetsSave(all){
    try{localStorage.setItem(WP_PRESETS_KEY,JSON.stringify(all));}catch(e){}
  }
  window.wpPresetSave=function(section){
    var name=prompt('Name f\u00fcr die Vorlage:');
    if(!name||!name.trim())return;
    var c=hpCfgReadUI();
    var all=wpPresetsGet();
    if(!all[section])all[section]=[];
    all[section].push({name:name.trim(),data:JSON.parse(JSON.stringify(c)),ts:Date.now()});
    wpPresetsSave(all);
    wpPresetsRenderAll();
    toast('Vorlage "'+name.trim()+'" gespeichert','ok');
  };
  window.wpPresetLoad=function(section,idx){
    var all=wpPresetsGet();
    if(!all[section]||!all[section][idx])return;
    var preset=all[section][idx].data;
    hpCfgApplyUI(preset);
    toast('Vorlage "'+all[section][idx].name+'" geladen','ok');
  };
  window.wpPresetDelete=function(section,idx){
    var all=wpPresetsGet();
    if(!all[section]||!all[section][idx])return;
    var name=all[section][idx].name;
    if(!confirm('Vorlage "'+name+'" l\u00f6schen?'))return;
    all[section].splice(idx,1);
    wpPresetsSave(all);
    wpPresetsRenderAll();
    toast('Vorlage "'+name+'" gel\u00f6scht','ok');
  };
  function wpPresetsRenderAll(){
    ['wp-home','wp-flyer'].forEach(function(sec){wpPresetsRender(sec);});
  }
  function wpPresetsRender(section){
    var shortKey=section.replace('wp-','');
    var container=document.getElementById('wp-presets-'+shortKey);
    if(!container)return;
    var all=wpPresetsGet();
    var list=all[section]||[];
    if(!list.length){
      container.innerHTML='<span style="font-size:11px;color:#9ca3af;font-style:italic">Noch keine Vorlagen gespeichert.</span>';
      return;
    }
    var html='';
    list.forEach(function(p,i){
      var d=new Date(p.ts);
      var dateStr=d.toLocaleDateString('de-DE',{day:'2-digit',month:'2-digit',year:'2-digit'});
      html+='<div style="display:flex;align-items:center;gap:6px;padding:4px 6px;background:#fff;border:1px solid #e5e7eb;border-radius:6px">';
      html+='<span style="flex:1;font-size:11px;font-weight:600;color:#374151" title="'+dateStr+'">'+p.name+'</span>';
      html+='<span style="font-size:9px;color:#9ca3af">'+dateStr+'</span>';
      html+='<button class="cms-btn cms-btn-gray cms-btn-sm" style="font-size:9px;padding:1px 5px" data-action="wpPresetLoad" data-section="'+section+'" data-idx="'+i+'">Laden</button>';
      html+='<button class="cms-btn cms-btn-gray cms-btn-sm" style="font-size:9px;padding:1px 5px;color:#dc2626" data-action="wpPresetDelete" data-section="'+section+'" data-idx="'+i+'">&times;</button>';
      html+='</div>';
    });
    container.innerHTML=html;
  }

  // Sync WP template colors when dropdown changes
  document.addEventListener('change',function(e){
    if(e.target.id==='hcfg-wpHomeTemplate'){hpCfgSyncWpPreview();hpCfgSyncWpTplColors('home');}
    if(e.target.id==='hcfg-wpFlyerTemplate'){hpCfgSyncWpFlyerPreview();hpCfgSyncWpTplColors('flyer');}
  });
  // Auto-save WP template color pickers on input
  document.addEventListener('input',function(e){
    var id=e.target.id;if(!id||id.indexOf('hcfg-wpTpl-')!==0)return;
    // debounced auto-save
    clearTimeout(window._wpTplColorTimer);
    window._wpTplColorTimer=setTimeout(function(){var c=hpCfgReadUI();hpCfgSave(c);},800);
  });

  // --- Wochenplan ---
  window.cmsWeek = function(delta){
    kw+=delta; if(kw<1){jahr--;kw=52;} if(kw>52){jahr++;kw=1;} loadWP();
  };
  window.cmsWeekJump = function(offset){
    var d=new Date();
    // Ab Samstag: "Diese Woche" = nächste KW, "Nächste Woche" = übernächste KW
    if(d.getDay()===0||d.getDay()===6) d.setDate(d.getDate()+(d.getDay()===0?1:2));
    d.setDate(d.getDate()+offset*7);
    jahr=d.getFullYear();kw=isoWeek(d);loadWP();
  };

  function loadWP(){
    var wpLd=document.getElementById('cms-wp-loading');
    if(wpLd)wpLd.style.display='';
    document.getElementById('cms-wp-grid').style.display='none';
    document.getElementById('cms-wp-empty').style.display='none';
    var r=weekRange(kw,jahr);
    document.getElementById('cms-wp-title').textContent='KW '+kw+' / '+jahr;
    document.getElementById('cms-wp-range').textContent=fmtD(r.start)+' \u2013 '+fmtD(r.end);
    var now=new Date();
    // Ab Samstag: "Diese Woche" ist bereits die nächste KW
    if(now.getDay()===0||now.getDay()===6) now.setDate(now.getDate()+(now.getDay()===0?1:2));
    var thisKw=isoWeek(now),thisJahr=now.getFullYear();
    var nxt=new Date(now.getTime());nxt.setDate(nxt.getDate()+7);var nxtKw=isoWeek(nxt),nxtJahr=nxt.getFullYear();
    var bThis=document.querySelector('[data-action="weekThis"]'),bNxt=document.querySelector('[data-action="weekNxt"]');
    if(bThis)bThis.className='cms-week-quick'+(kw===thisKw&&jahr===thisJahr?' active':'');
    if(bNxt)bNxt.className='cms-week-quick'+(kw===nxtKw&&jahr===nxtJahr?' active':'');

    var filter="dl_kalenderwoche eq "+kw+" and dl_jahr eq "+jahr;
    fetch(API+'/wochenplan?$filter='+encodeURIComponent(filter)+'&$orderby=dl_datum asc,dl_wochentag asc&$top=50')
      .then(function(r){return r.json();})
      .then(function(data){
        meals=[];
        (data.data||data.value||[]).forEach(function(m){
          meals.push({
            id:m.dl_wochenplanid,
            gericht:m.dl_gericht||'',
            wochentag:m.dl_wochentag,
            wochentag_name:DAYS[m.dl_wochentag]||'?',
            datum:m.dl_datum,
            preis:m.dl_preis,
            beschreibung:m.dl_beschreibung||'',
            kalenderwoche:m.dl_kalenderwoche,
            jahr:m.dl_jahr,
            status:m.dl_status
          });
        });
        renderWP();
      })
      .catch(function(e){toast('Fehler: '+e.message,'error');})
      .then(function(){if(wpLd)wpLd.style.display='none';});
  }

  function renderWP(){
    var grid=document.getElementById('cms-wp-grid');
    var empty=document.getElementById('cms-wp-empty');
    grid.innerHTML='';
    if(meals.length===0){grid.style.display='none';empty.style.display='';return;}
    grid.style.display='';empty.style.display='none';

    var byDay={};
    [101000,101001,101002,101003,101004].forEach(function(d){byDay[d]=[];});
    meals.forEach(function(m){if(byDay[m.wochentag])byDay[m.wochentag].push(m);});

    [101000,101001,101002,101003,101004].forEach(function(dc){
      var items=byDay[dc], col=DAY_COLORS[dc];
      var card=document.createElement('div'); card.className='cms-meal';
      var h='<div class="cms-meal-hdr" style="background:'+col+'">'+DAYS[dc]+'</div>';
      var b='<div class="cms-meal-body">';
      if(items.length===0){
        b+='<div style="color:#d1d5db;font-size:13px;text-align:center;padding:16px 0">Kein Gericht</div>';
      } else {
        var notice=items[0].beschreibung;
        if(notice&&!items[0].gericht){
          b+='<div style="color:#9ca3af;font-size:13px;font-style:italic;text-align:center;padding:12px 4px">'+esc(notice)+'</div>';
          b+='<div class="cms-meal-actions">';
          b+='<button class="cms-btn cms-btn-sm cms-btn-gray" data-action="editMeal" data-id="'+items[0].id+'">Bearbeiten</button>';
          b+='<button class="cms-btn-trash" title="Wochenplan-Eintrag löschen" aria-label="Löschen" data-action="deleteMeal" data-id="'+items[0].id+'"><svg viewBox="0 0 24 24"><path d="M9 3h6l1 2h4v2H4V5h4l1-2zm1 6h2v9h-2V9zm4 0h2v9h-2V9zM7 9h2v9H7V9z"/></svg></button>';
          b+='</div>';
        } else {
          items.forEach(function(m){
            b+='<div class="cms-meal-item"><span>'+esc(m.gericht)+'</span>';
            if(m.preis) b+='<span class="price">'+fmtP(m.preis)+'</span>';
            b+='</div>';
            if(m.beschreibung) b+='<div style="color:#9ca3af;font-size:11px;font-style:italic;padding:0 8px 4px">'+esc(m.beschreibung)+'</div>';
            b+='<div class="cms-meal-actions">';
            b+='<button class="cms-btn cms-btn-sm cms-btn-gray" data-action="editMeal" data-id="'+m.id+'">Bearbeiten</button>';
            b+='<button class="cms-btn-trash" title="Wochenplan-Eintrag löschen" aria-label="Löschen" data-action="deleteMeal" data-id="'+m.id+'"><svg viewBox="0 0 24 24"><path d="M9 3h6l1 2h4v2H4V5h4l1-2zm1 6h2v9h-2V9zm4 0h2v9h-2V9zM7 9h2v9H7V9z"/></svg></button>';
            b+='</div>';
          });
        }
      }
      b+='</div>';
      card.innerHTML=h+b; grid.appendChild(card);
    });
  }

  // --- Add/Edit Meal Modal ---
  window.cmsOpenAddMeal = function(){
    showMealModal(null);
  };
  window.cmsEditMeal = function(id){
    var m=meals.find(function(x){return x.id===id;});
    if(m) showMealModal(m);
  };

  // Gerichte history for autocomplete
  var gerichteHistory=[];
  function loadGerichteHistory(){
    fetch(API+'/wochenplan?$select=dl_gericht,dl_preis&$orderby=dl_datum desc&$top=500&$filter=dl_status eq 101001')
      .then(function(r){return r.json();})
      .then(function(data){
        var seen={};
        (data.data||data.value||[]).forEach(function(m){
          var g=(m.dl_gericht||'').trim();
          if(g&&!seen[g]){seen[g]=true;gerichteHistory.push({gericht:g,preis:m.dl_preis});}
        });
        gerichteHistory.sort(function(a,b){return a.gericht.localeCompare(b.gericht,'de');});
      }).catch(function(){});
  }
  loadGerichteHistory();

  var mealRowCtr=0;
  function addMealRow(name,price,id){
    mealRowCtr++;
    var c=document.getElementById('cms-meal-rows');
    var row=document.createElement('div');
    row.className='cms-ang-row';row.id='cms-mr-'+mealRowCtr;
    row.dataset.mealId=id||'';
    var canRemove=c.children.length>0;
    var h='';
    if(canRemove) h+='<button type="button" class="cms-ang-row-close" data-action="removeMealRow">&times;</button>';
    h+='<div class="cms-meal-grid" style="display:grid;grid-template-columns:2fr 1fr;gap:8px">';
    h+='<div class="cms-art-wrap"><input class="cms-input cms-meal-ac" data-f="name" placeholder="z.B. Schnitzel mit Pommes" autocomplete="off" value="'+esc(name||'')+'">';
    h+='<div class="cms-art-dd"></div></div>';
    h+='<input class="cms-input cms-price" data-f="price" type="text" inputmode="decimal" placeholder="Preis" value="'+(price!=null?fmtDePrice(price):'')+'">';
    h+='</div>';
    row.innerHTML=h;
    c.appendChild(row);
    wireMealAC(row);
  }

  function wireMealAC(row){
    var inp=row.querySelector('.cms-meal-ac');
    var dd=row.querySelector('.cms-art-dd');
    if(!inp||!dd) return;
    inp.addEventListener('input',function(){
      var val=inp.value.toLowerCase().trim();
      if(val.length<1){dd.className='cms-art-dd';dd.innerHTML='';return;}
      var matches=gerichteHistory.filter(function(g){return g.gericht.toLowerCase().indexOf(val)!==-1;}).sort(function(a,b){return a.gericht.localeCompare(b.gericht,'de');}).slice(0,12);
      if(!matches.length||matches.length===1&&matches[0].gericht===inp.value){dd.className='cms-art-dd';dd.innerHTML='';return;}
      dd.innerHTML=matches.map(function(g){
        return '<div class="cms-art-opt" data-g="'+esc(g.gericht)+'" data-p="'+(g.preis||'')+'">'
          +'<span class="cms-art-opt-name">'+esc(g.gericht)+'</span>'
          +(g.preis?'<span class="cms-art-opt-meta">'+fmtP(g.preis)+'</span>':'')
          +'<button type="button" class="cms-art-opt-del" data-del-g="'+esc(g.gericht)+'" title="Vorbelegung l\u00f6schen">&times;</button></div>';
      }).join('');
      dd.className='cms-art-dd open';
      flipDDIfNeeded(dd);
    });
    inp.addEventListener('focus',function(){inp.dispatchEvent(new Event('input'));});
    dd.addEventListener('click',function(e){
      // Delete button clicked
      var delBtn=e.target.closest('.cms-art-opt-del');
      if(delBtn){
        e.stopPropagation();
        var gName=delBtn.getAttribute('data-del-g');
        if(gName) cmsConfirm('Vorbelegung "'+gName+'" wirklich l\u00f6schen?',{icon:'\uD83D\uDDD1\uFE0F',ok:'L\u00f6schen',warn:true}).then(function(ok){
          if(!ok) return;
          gerichteHistory=gerichteHistory.filter(function(g){return g.gericht!==gName;});
          delBtn.closest('.cms-art-opt').remove();
          if(!dd.querySelector('.cms-art-opt')){dd.className='cms-art-dd';dd.innerHTML='';}
          toast('Vorbelegung gel\u00f6scht','ok');
        });
        return;
      }
      // Normal selection
      var opt=e.target.closest('.cms-art-opt');
      if(!opt) return;
      inp.value=opt.getAttribute('data-g');
      var p=opt.getAttribute('data-p');
      if(p) row.querySelector('[data-f="price"]').value=p;
      dd.className='cms-art-dd';dd.innerHTML='';
    });
  }

  var NOTICE_PRESETS=['Feiertag geschlossen','Nicht geoeffnet','Kein Mittagessen heute','Betriebsurlaub'];

  function showMealModal(meal){
    var isEdit=!!meal;
    var title=isEdit?'Gericht bearbeiten':'Gericht hinzuf\u00fcgen';
    var dayOpts='';
    [101000,101001,101002,101003,101004].forEach(function(dc){
      var sel=meal&&meal.wochentag===dc?' selected':'';
      dayOpts+='<option value="'+dc+'"'+sel+'>'+DAYS[dc]+'</option>';
    });
    var noticeVal=meal?meal.beschreibung:'';
    var noticeOpts='<option value="">— Kein Hinweis —</option>';
    var isCustom=false;
    NOTICE_PRESETS.forEach(function(p){
      noticeOpts+='<option value="'+esc(p)+'"'+(noticeVal===p?' selected':'')+'>'+esc(p)+'</option>';
      if(noticeVal===p) isCustom=false;
    });
    if(noticeVal&&NOTICE_PRESETS.indexOf(noticeVal)===-1) isCustom=true;
    noticeOpts+='<option value="__custom__"'+(isCustom?' selected':'')+'>Eigener Text...</option>';

    var html='<div class="cms-modal-bg" >';
    html+='<div class="cms-modal">';
    html+='<h3>'+title+'</h3>';
    html+='<div style="margin-bottom:12px"><label style="font-size:12px;font-weight:600;color:#6b7280;display:block;margin-bottom:4px">Wochentag</label>';
    html+='<select id="cms-meal-day" class="cms-input">'+dayOpts+'</select></div>';
    html+='<div style="margin-bottom:12px"><label style="font-size:12px;font-weight:600;color:#6b7280;display:block;margin-bottom:4px">Hinweis <span style="font-weight:400;color:#9ca3af">(optional)</span></label>';
    html+='<select id="cms-meal-notice-sel" class="cms-input" data-action="noticeSelChange">'+noticeOpts+'</select>';
    html+='<input id="cms-meal-notice-custom" class="cms-input" style="margin-top:6px;'+(isCustom?'':'display:none')+'" value="'+esc(isCustom?noticeVal:'')+'" placeholder="Eigenen Hinweis eingeben..."></div>';
    html+='<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px">';
    html+='<span style="font-size:11px;font-weight:600;color:#6b7280;text-transform:uppercase;letter-spacing:.5px">Gerichte</span>';
    if(!isEdit) html+='<button class="cms-btn cms-btn-sm cms-btn-gray" type="button" data-action="addMealRow">+ Gericht</button>';
    html+='</div>';
    html+='<div id="cms-meal-rows"></div>';
    html+='<input type="hidden" id="cms-meal-id" value="'+(meal?meal.id:'')+'">';
    html+='<div style="display:flex;gap:8px;margin-top:12px">';
    html+='<button class="cms-btn cms-btn-primary" data-action="saveMeal">Speichern</button>';
    html+='<button class="cms-btn cms-btn-gray" data-action="closeModal">Abbrechen</button>';
    html+='</div></div></div>';
    document.getElementById('cms-modal-wrap').innerHTML=html;
    document.getElementById('cms-modal-wrap').style.display='';
    mealRowCtr=0;
    if(isEdit){
      addMealRow(meal.gericht, meal.preis, meal.id);
    } else {
      addMealRow();
    }
  }

  window.cmsCloseModal = function(){
    document.getElementById('cms-modal-wrap').style.display='none';
    document.getElementById('cms-modal-wrap').innerHTML='';
  };

  function getNoticeValue(){
    var sel=document.getElementById('cms-meal-notice-sel');
    if(!sel) return '';
    if(sel.value==='__custom__') return (document.getElementById('cms-meal-notice-custom').value||'').trim();
    return sel.value;
  }

  window.cmsSaveMeal = function(){
    var saveBtn=document.querySelector('[data-action="saveMeal"]');
    var editId=document.getElementById('cms-meal-id').value;
    var dayCode=parseInt(document.getElementById('cms-meal-day').value);
    var beschreibung=getNoticeValue();

    var r=weekRange(kw,jahr);
    var dayOff=dayCode-101000;
    var d=new Date(r.start); d.setDate(d.getDate()+dayOff);

    var rows=document.querySelectorAll('#cms-meal-rows .cms-ang-row');
    var mealData=[];
    rows.forEach(function(row){
      var name=(row.querySelector('[data-f="name"]').value||'').trim();
      var price=parseDePrice(row.querySelector('[data-f="price"]').value);
      var mid=row.dataset.mealId||'';
      if(name) mealData.push({gericht:name,preis:price,id:mid,priceInput:row.querySelector('[data-f="price"]')});
    });

    for(var mi=0;mi<mealData.length;mi++){if(mealData[mi].preis==null||isNaN(mealData[mi].preis)){mealData[mi].priceInput.style.border='2px solid #ef4444';mealData[mi].priceInput.focus();toast('Bitte Preis f\u00fcr "'+mealData[mi].gericht+'" eingeben','warn');return;} else {mealData[mi].priceInput.style.border='';}}

    if(!mealData.length&&!beschreibung){toast('Bitte mindestens ein Gericht oder einen Hinweis eingeben','warn');return;}
    if(!mealData.length&&beschreibung){mealData.push({gericht:'',preis:null,id:''});}

    btnBusy(saveBtn);
    refreshToken().then(function(){
      var promises=mealData.map(function(item){
        var body={
          dl_gericht:item.gericht,
          dl_wochentag:dayCode,
          dl_datum:fmtISO(d),
          dl_preis:item.preis,
          dl_beschreibung:beschreibung||null,
          dl_kalenderwoche:kw,
          dl_jahr:jahr,
          dl_status:101001
        };
        var url,method;
        if(item.id){url=API+'/wochenplan/'+item.id;method='PATCH';}
        else{url=API+'/wochenplan';method='POST';}
        return fetch(url,{method:method,headers:writeHeaders(),body:JSON.stringify(body)})
          .then(function(r){if(!r.ok) return r.json().then(function(e){throw new Error(e.error?e.error.message:'HTTP '+r.status);});});
      });

      return Promise.all(promises);
    })
      .then(function(){
        var cnt=mealData.length;
        toast(editId?'Gericht aktualisiert':cnt+' Gericht'+(cnt>1?'e':'')+' hinzugefuegt');
        cmsCloseModal();
        loadWP();
        loadGerichteHistory();
      })
      .catch(function(e){toast('Fehler: '+e.message,'error');})
      .then(function(){btnDone(saveBtn);});
  };

  // --- Delete Meal ---
  window.cmsDeleteMeal = function(id){
    var m=meals.find(function(x){return x.id===id;});
    if(!m)return;
    var html='<div class="cms-modal-bg" >';
    html+='<div class="cms-modal" style="text-align:center">';
    html+='<h3>Wochenplan-Eintrag löschen?</h3>';
    html+='<p style="font-size:13px;color:#6b7280;margin-bottom:8px">"'+esc(m.gericht||'Eintrag')+'" am '+m.wochentag_name+' wirklich löschen?</p>';
    html+='<p style="font-size:12px;color:#b91c1c;margin-bottom:16px">Diese Aktion kann nicht rückgängig gemacht werden.</p>';
    html+='<div style="display:flex;gap:8px">';
    html+='<button class="cms-btn cms-btn-danger" style="flex:1;background:#dc2626;color:#fff" data-action="confirmDeleteMeal" data-id="'+id+'">Löschen</button>';
    html+='<button class="cms-btn cms-btn-gray" style="flex:1" data-action="closeModal">Abbrechen</button>';
    html+='</div></div></div>';
    document.getElementById('cms-modal-wrap').innerHTML=html;
    document.getElementById('cms-modal-wrap').style.display='';
  };

  window.cmsConfirmDelete = function(id){
    var delBtn=document.querySelector('[data-action="confirmDeleteMeal"]');
    btnBusy(delBtn,'Löschen...');
    refreshToken().then(function(){
      return fetch(API+'/wochenplan/'+id,{method:'DELETE',headers:deleteHeaders()});
    })
      .then(function(r){
        if(!r.ok) throw new Error('HTTP '+r.status);
        toast('Gericht gelöscht');
        cmsCloseModal();
        loadWP();
      })
      .catch(function(e){toast('Fehler: '+e.message,'error');})
      .then(function(){btnDone(delBtn);});
  };

  // --- Öffnungszeiten ---
  function loadHours(){
    fetch(API+'/hours?$orderby=dl_sortierung asc&$top=50')
      .then(function(r){return r.json();})
      .then(function(data){
        hours=[];
        (data.data||data.value||[]).forEach(function(h){
          hours.push({
            id:h.id||h.dl_oeffnungszeitid||h.dl_oeffnungszeitsid||'',
            name:h.dl_name||'',
            wochentag:h.dl_wochentag,
            vormittag_von:h.dl_vormittag_von||'',
            vormittag_bis:h.dl_vormittag_bis||'',
            nachmittag_von:h.dl_nachmittag_von||'',
            nachmittag_bis:h.dl_nachmittag_bis||'',
            geschlossen:h.dl_geschlossen||false,
            sortierung:h.dl_sortierung,
            hinweis:h.dl_hinweis||''
          });
        });
        renderHours();
      })
      .catch(function(e){toast('Fehler: '+e.message,'error');});
  }

  function renderHours(){
    var c=document.getElementById('cms-hours-container');
    c.innerHTML='';
    var sections={};
    hours.forEach(function(h){
      var k=h.name||'Unbekannt';
      if(!sections[k])sections[k]=[];
      sections[k].push(h);
    });
    Object.keys(sections).forEach(function(name){
      var items=sections[name];
      var card=document.createElement('div'); card.className='cms-card';
      var html='<div class="cms-card-header" style="background:linear-gradient(135deg,#15803d,#16a34a)">'+esc(name)+'</div>';
      html+='<div>';
      items.forEach(function(h){
        html+='<div class="cms-hours-row" data-hid="'+h.id+'">';
        html+='<div class="cms-hours-top"><span class="cms-hours-day">'+(DAY_SHORT[h.wochentag]||'?')+'</span>';
        html+='<label style="display:flex;align-items:center;gap:4px;font-size:12px"><input type="checkbox" class="h-closed" '+(h.geschlossen?'checked':'')+' data-action="hoursChanged"><span style="color:#6b7280">Geschlossen</span></label></div>';
        html+='<div class="cms-hours-times">';
        html+='<div class="cms-hours-block"><span class="cms-hours-label">VM:</span>';
        html+='<input type="time" class="cms-hours-time h-vm-von" value="'+h.vormittag_von+'" data-action="hoursChanged">';
        html+='<span style="color:#d1d5db">&ndash;</span>';
        html+='<input type="time" class="cms-hours-time h-vm-bis" value="'+h.vormittag_bis+'" data-action="hoursChanged">';
        html+='</div>';
        html+='<div class="cms-hours-block"><span class="cms-hours-label">NM:</span>';
        html+='<input type="time" class="cms-hours-time h-nm-von" value="'+h.nachmittag_von+'" data-action="hoursChanged">';
        html+='<span style="color:#d1d5db">&ndash;</span>';
        html+='<input type="time" class="cms-hours-time h-nm-bis" value="'+h.nachmittag_bis+'" data-action="hoursChanged">';
        html+='</div></div></div>';
      });
      html+='</div>';
      card.innerHTML=html; c.appendChild(card);
    });
  }

  window.cmsHoursChanged = function(){
    document.getElementById('cms-save-hours').style.display='';
  };

  window.cmsSaveHours = function(){
    var saveBtn=document.getElementById('cms-save-hours');
    btnBusy(saveBtn);
    var rows=document.querySelectorAll('[data-hid]');
    refreshToken().then(function(){
      var promises=[];
      rows.forEach(function(row){
        var id=row.dataset.hid;
        var body={
          dl_name:(row.closest('.cms-card')&&row.closest('.cms-card').querySelector('.cms-card-header')?row.closest('.cms-card').querySelector('.cms-card-header').textContent.trim():null),
          dl_wochentag:(function(){var d=row.querySelector('.cms-hours-day');var m={'Mo':101000,'Di':101001,'Mi':101002,'Do':101003,'Fr':101004,'Sa':101005,'So':101006};return d&&m[d.textContent]?m[d.textContent]:null;})(),
          dl_geschlossen:row.querySelector('.h-closed').checked,
          dl_vormittag_von:row.querySelector('.h-vm-von').value||null,
          dl_vormittag_bis:row.querySelector('.h-vm-bis').value||null,
          dl_nachmittag_von:row.querySelector('.h-nm-von').value||null,
          dl_nachmittag_bis:row.querySelector('.h-nm-bis').value||null
        };
        promises.push(fetch(API+'/hours/'+id,{method:'PATCH',headers:writeHeaders(),body:JSON.stringify(body)}));
      });
      return Promise.all(promises);
    })
      .then(function(){toast('Öffnungszeiten gespeichert');saveBtn.style.display='none';})
      .catch(function(e){toast('Fehler: '+e.message,'error');})
      .then(function(){btnDone(saveBtn);});
  };

  // --- Homepage Content ---
  var _hpLoaded = false;
  var _hpItems = [];

  // Field descriptions for Homepage tab
  var HP_FIELD_META = {
    'hero_titel':     {icon:'&#127968;', desc:'Gro&szlig;e &Uuml;berschrift im Hero-Bereich der Startseite'},
    'hero_untertitel': {icon:'&#9998;',  desc:'Kleinerer Text unter der &Uuml;berschrift'},
    'hero_sub':       {icon:'&#9749;',  desc:'Zusatzzeile mit Icons (z.B. Bistro, Sommer)'},
    'Hero \u00dcberschrift':     {icon:'&#127968;', desc:'Gro&szlig;e &Uuml;berschrift im Hero-Bereich der Startseite'},
    'Hero Untertitel': {icon:'&#9998;',  desc:'Kleinerer Text unter der &Uuml;berschrift'},
    'Hero Zusatztext': {icon:'&#9749;',  desc:'Zusatzzeile mit Icons (z.B. Bistro, Sommer)'},
    'kontakt_adresse': {icon:'&#128205;', desc:'Adresse f&uuml;r Kontaktbereich (z.B. Dorfplatz 1, 84419 Obertaufkirchen)'},
    'kontakt_telefon': {icon:'&#128222;', desc:'Telefonnummer f&uuml;r Kontaktbereich'},
    'kontakt_email':  {icon:'&#9993;', desc:'E-Mail-Adresse f&uuml;r Kontaktbereich'},
    'kontakt_name':   {icon:'&#127793;', desc:'Name des Ladens (z.B. Dorfladen Oberornau)'},
    'sort_intro':     {icon:'&#128722;', desc:'Einleitungstext Sortiment-Seite (HTML)', html:true},
    'sort_highlights':{icon:'&#11088;', desc:'Highlights Sortiment-Seite (HTML)', html:true},
    'sort_eco':       {icon:'&#9851;', desc:'Hinweisbox Sortiment-Seite (HTML)', html:true},
    'sortiment_intro':     {icon:'&#128722;', desc:'Einleitungstext Sortiment-Seite (HTML)', html:true},
    'sortiment_highlights':{icon:'&#11088;', desc:'Highlights Sortiment-Seite (HTML)', html:true},
    'sortiment_eco':       {icon:'&#9851;', desc:'Hinweisbox Sortiment-Seite (HTML)', html:true}
  };
  // Fields that use HTML rich-text editor
  function isHtmlField(name){
    var m=HP_FIELD_META[name]; if(m && m.html) return true;
    return false;
  }
  // Detect if value is a base64 image
  function isImageValue(val){ return typeof val==='string' && val.indexOf('data:image/')===0; }

  function loadHomepage(){
    var container = document.getElementById('cms-hp-fields');
    var empty = document.getElementById('cms-hp-empty');
    container.innerHTML = '<div style="text-align:center;padding:20px;color:#6b7280">Lade Homepage-Inhalte&hellip;</div>';
    fetch(API+'/cms-config?full=true')
      .then(function(r){return r.json();})
      .then(function(res){
        if(!res.success){container.innerHTML='<p style="color:#dc2626">Fehler: '+res.error+'</p>';return;}
        _hpItems = Array.isArray(res.data) ? res.data : [];
        _hpLoaded = true;
        // Filter out design_config, logo fields, image data, and Seiteninhalte keys (shown in accordion below)
        var _seitenKeys={'gf_inhalt':1,'beirat_inhalt':1,'konzept_inhalt':1,'stille_gesellschafter_inhalt':1,'essen_inhalt':1,'impressum_inhalt':1,'datenschutz_inhalt':1};
        var textItems = _hpItems.filter(function(item){ return typeof item.wert !== 'object' && item.name !== 'design_config' && item.name !== 'logo' && item.name !== 'Site Logo' && item.key !== 'site_logo' && !isImageValue(String(item.wert||'')) && !_seitenKeys[item.key||item.name]; });
        // Deduplicate by name (keep first occurrence)
        var seen={};
        textItems = textItems.filter(function(item){ if(seen[item.name]) return false; seen[item.name]=true; return true; });
        if(textItems.length===0){container.innerHTML='';empty.style.display='';return;}
        empty.style.display='none';
        // Build RTE toolbar HTML helper
        function rteToolbar(itemId){
          return '<div class="cms-rte-toolbar">'
            +'<button type="button" class="cms-rte-btn" onclick="cmsRteFocus(\''+itemId+'\');document.execCommand(\'bold\')" title="Fett"><b>B</b></button>'
            +'<button type="button" class="cms-rte-btn" onclick="cmsRteFocus(\''+itemId+'\');document.execCommand(\'italic\')" title="Kursiv"><i>I</i></button>'
            +'<button type="button" class="cms-rte-btn" onclick="cmsRteFocus(\''+itemId+'\');document.execCommand(\'underline\')" title="Unterstrichen"><u>U</u></button>'
            +'<span class="cms-rte-sep"></span>'
            +'<button type="button" class="cms-rte-btn" onclick="cmsRteFocus(\''+itemId+'\');document.execCommand(\'insertUnorderedList\')" title="Liste">&#8226;</button>'
            +'<button type="button" class="cms-rte-btn" onclick="cmsRteFocus(\''+itemId+'\');document.execCommand(\'insertOrderedList\')" title="Num. Liste">1.</button>'
            +'<span class="cms-rte-sep"></span>'
            +'<button type="button" class="cms-rte-btn" onclick="cmsRteFocus(\''+itemId+'\');var u=prompt(\'Link-URL:\');if(u)document.execCommand(\'createLink\',false,u)" title="Link">&#128279;</button>'
            +'<button type="button" class="cms-rte-btn" onclick="cmsRteFocus(\''+itemId+'\');document.execCommand(\'removeFormat\')" title="Format entfernen">&#10006;</button>'
            +'</div>';
        }
        container.innerHTML = textItems.map(function(item){
          var val = String(item.wert||'');
          var meta = HP_FIELD_META[item.name] || HP_FIELD_META[item.key] || {icon:'&#128221;', desc:''};
          var descHtml = meta.desc ? '<p style="font-size:11px;color:#9ca3af;margin:2px 0 8px">'+meta.desc+'</p>' : '';
          var fieldHtml;
          var useHtml = isHtmlField(item.name);
          // Auto-detect HTML content in value
          if(!useHtml && /<[a-z][\s\S]*>/i.test(val)) useHtml = true;
          if(isImageValue(val)){
            // Show image preview only (base64 data hidden)
            fieldHtml='<div style="display:flex;align-items:center;gap:12px">'
              +'<img src="'+val+'" style="max-width:200px;max-height:120px;border-radius:8px;border:1px solid #e5e7eb;background:#f9fafb" alt="Bild-Vorschau">'
              +'<span style="font-size:11px;color:#9ca3af">Bild ('+Math.round(val.length/1024)+' KB base64)</span>'
              +'</div>'
              +'<input type="hidden" data-hp-id="'+item.id+'" data-hp-name="'+esc(item.name)+'" value="'+esc(val)+'">';
          } else if(useHtml){
            fieldHtml=rteToolbar(item.id)
              +'<div class="cms-rte-editor" contenteditable="true" data-hp-id="'+item.id+'" data-hp-name="'+esc(item.name)+'" data-hp-html="1">'+val+'</div>';
          } else {
            fieldHtml='<input class="cms-input" data-hp-id="'+item.id+'" data-hp-name="'+esc(item.name)+'" value="'+esc(val)+'" style="width:100%;font-size:14px;padding:10px 12px;border:1px solid #d1d5db;border-radius:6px">';
          }
          return '<div class="cms-card" style="margin-bottom:12px">'
            +'<div class="cms-card-header" style="font-size:13px">'+meta.icon+' '+esc(item.name)+'</div>'
            +'<div class="cms-card-body" style="padding:12px 16px">'
            +descHtml
            +fieldHtml
            +'<div style="margin-top:6px;font-size:11px;color:#d1d5db">ID: '+item.id+'</div>'
            +'</div></div>';
        }).join('');
      })
      .catch(function(e){container.innerHTML='<p style="color:#dc2626">Fehler: '+e.message+'</p>';});
  }

  // Focus RTE editor before toolbar command
  window.cmsRteFocus=function(itemId){
    var el=document.querySelector('[data-hp-id="'+itemId+'"]');
    if(el && el.getAttribute('data-hp-html')) el.focus();
  };

  function saveHomepage(){
    var fields = document.querySelectorAll('[data-hp-id]');
    var items = [];
    fields.forEach(function(el){
      var val = el.hasAttribute('data-hp-html') ? el.innerHTML : el.value;
      items.push({name:el.getAttribute('data-hp-name'),wert:val});
    });
    if(items.length===0){toast('Keine Felder zum Speichern','warning');return;}
    var btn = document.getElementById('cms-save-hp');
    if(btn)btn.disabled=true;
    var saved=0,errors=[];
    var chain=Promise.resolve();
    items.forEach(function(item){
      chain=chain.then(function(){
        return fetch(API+'/cms-config',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(item)})
          .then(function(r){return r.json();})
          .then(function(res){if(res.success)saved++;else errors.push(item.name+': '+res.error);});
      });
    });
    chain.then(function(){
      if(errors.length)toast('Fehler: '+errors.join('; '),'error');
      else toast(saved+' Felder gespeichert!','success');
    }).catch(function(e){toast('Fehler: '+e.message,'error');})
    .then(function(){if(btn)btn.disabled=false;});
  }

  // --- Add new HP field ---
  window.cmsAddHpField=function(){
    var suggestions=Object.keys(HP_FIELD_META).filter(function(k){
      var exists=false;
      document.querySelectorAll('[data-hp-name]').forEach(function(el){if(el.getAttribute('data-hp-name')===k)exists=true;});
      return !exists;
    });
    var msg='Feldname eingeben';
    if(suggestions.length>0) msg+='\n\nVorschläge:\n'+suggestions.join('\n');
    var name=prompt(msg);
    if(!name||!name.trim())return;
    name=name.trim();
    fetch(API+'/cms-config',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({name:name,wert:''})})
      .then(function(r){return r.json();})
      .then(function(res){
        if(res.success){toast('Feld "'+name+'" angelegt!','success');_hpLoaded=false;loadHomepage();}
        else toast('Fehler: '+res.error,'error');
      }).catch(function(e){toast('Fehler: '+e.message,'error');});
  };

  // --- Logo Upload ---
  function loadLogo(){
    var preview=document.getElementById('cms-logo-preview');
    if(!preview)return;
    fetch(API+'/logo')
      .then(function(r){return r.json();})
      .then(function(res){
        if(!res.success||!res.logo)return;
        preview.innerHTML='<img src="'+res.logo+'" style="max-height:120px;max-width:300px">';
      }).catch(function(){});
  }

  window.cmsLogoRemove=function(){
    document.getElementById('cms-logo-preview').innerHTML='<span style="color:#9ca3af;font-size:12px">Kein Logo</span>';
    fetch(API+'/logo',{method:'DELETE'})
      .then(function(r){return r.json();})
      .then(function(res){if(res.success)toast('Logo entfernt','ok');else toast('Fehler: '+res.error,'error');})
      .catch(function(err){toast('Fehler: '+err.message,'error');});
  };

  // Wire logo upload – resizes to 3x retina, auto-removes background, stores via Image Column
  document.getElementById('cms-logo-file').addEventListener('change',function(){
    var file=this.files[0];
    if(!file)return;
    if(file.size>10*1024*1024){toast('Logo zu groß (max 10 MB)','warn');this.value='';return;}
    var reader=new FileReader();
    reader.onload=function(e){
      var img=new Image();
      img.onload=function(){
        var MAX_LEN=500000;
        /* Scale to high-res for sharp logos (up to 300px height, 1200px width) */
        var MAX_H=300, MAX_W=1200;
        var w=img.width, h=img.height;
        if(h>MAX_H){w=Math.round(w*(MAX_H/h));h=MAX_H;}
        if(w>MAX_W){h=Math.round(h*(MAX_W/w));w=MAX_W;}
        var canvas=document.createElement('canvas');
        canvas.width=w; canvas.height=h;
        var ctx=canvas.getContext('2d',{willReadFrequently:true});
        ctx.clearRect(0,0,w,h);
        ctx.drawImage(img,0,0,w,h);
        /* Auto-Freistellung: Flood-Fill vom Rand – nur zusammenhängende helle Pixel entfernen */
        var idata=ctx.getImageData(0,0,w,h);
        var px=idata.data;
        var visited=new Uint8Array(w*h);
        var changed=false;
        function isBg(idx){
          var r=px[idx],g=px[idx+1],b=px[idx+2],a=px[idx+3];
          if(a===0) return true;
          /* Nur wirklich helle, nahezu weiße Pixel als Hintergrund */
          var bright=(r+g+b)/3;
          var maxDiff=Math.max(Math.abs(r-g),Math.abs(g-b),Math.abs(r-b));
          return bright>210 && maxDiff<20;
        }
        /* Flood-fill queue from all border pixels */
        var queue=[];
        for(var x=0;x<w;x++){
          queue.push(x);queue.push(0);
          queue.push(x);queue.push(h-1);
        }
        for(var y=1;y<h-1;y++){
          queue.push(0);queue.push(y);
          queue.push(w-1);queue.push(y);
        }
        while(queue.length>0){
          var qy=queue.pop(),qx=queue.pop();
          if(qx<0||qx>=w||qy<0||qy>=h) continue;
          var pi=qy*w+qx;
          if(visited[pi]) continue;
          visited[pi]=1;
          var idx=pi*4;
          if(!isBg(idx)) continue;
          /* Soft edge: bright 210-230 gets partial alpha, >230 fully transparent */
          var bright2=(px[idx]+px[idx+1]+px[idx+2])/3;
          if(bright2>230) px[idx+3]=0;
          else px[idx+3]=Math.round((230-bright2)/20*255);
          changed=true;
          queue.push(qx-1);queue.push(qy);
          queue.push(qx+1);queue.push(qy);
          queue.push(qx);queue.push(qy-1);
          queue.push(qx);queue.push(qy+1);
        }
        
        /* Zweiter Durchlauf: geschlossene weiße Löcher (z.B. in O, R, A, D) transparent machen */
        for(var i=0;i<px.length;i+=4){
          var r=px[i],g=px[i+1],b=px[i+2],a=px[i+3];
          if(a===0) continue;
          var bright=(r+g+b)/3;
          var maxDiff=Math.max(Math.abs(r-g),Math.abs(g-b),Math.abs(r-b));
          /* Wenn der Pixel fast reinweiß ist (>240) und keine Farbe hat, machen wir ihn transparent */
          if(bright>240 && maxDiff<10){
            px[i+3]=0;
            changed=true;
          }
        }
        
        if(changed){ctx.putImageData(idata,0,0);}
        /* Use cleaned canvas as source for all subsequent scaling */
        var srcCanvas=document.createElement('canvas');
        srcCanvas.width=w;srcCanvas.height=h;
        var srcCtx=srcCanvas.getContext('2d');
        srcCtx.drawImage(canvas,0,0);
        /* Try WebP at full size first (best quality) */
        var dataUrl;
        var webpQualities=[0.9,0.8,0.7,0.6,0.5,0.4,0.25];
        for(var wq=0;wq<webpQualities.length;wq++){
          dataUrl=canvas.toDataURL('image/webp',webpQualities[wq]);
          if(dataUrl.length<=MAX_LEN) break;
        }
        /* WebP still too large? Scale down slightly + try qualities */
        var webpScales=[0.85,0.7,0.55];
        for(var wi=0;wi<webpScales.length && dataUrl.length>MAX_LEN;wi++){
          canvas.width=Math.round(w*webpScales[wi]);canvas.height=Math.round(h*webpScales[wi]);
          ctx=canvas.getContext('2d',{willReadFrequently:true});ctx.clearRect(0,0,canvas.width,canvas.height);ctx.drawImage(srcCanvas,0,0,canvas.width,canvas.height);
          for(var wq2=0;wq2<webpQualities.length && dataUrl.length>MAX_LEN;wq2++){
            dataUrl=canvas.toDataURL('image/webp',webpQualities[wq2]);
          }
        }
        if(dataUrl.length>MAX_LEN){toast('Logo zu groß – bitte kleineres Bild verwenden','warn');return;}
        document.getElementById('cms-logo-preview').innerHTML='<img src="'+dataUrl+'" style="max-height:120px;max-width:300px">';
        var sizeKB=Math.round(dataUrl.length/1024);
        fetch(API+'/logo',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({data:dataUrl})})
          .then(function(r){return r.json();})
          .then(function(res){if(res.success)toast('Logo gespeichert! ('+sizeKB+' KB)','ok');else toast('Fehler: '+res.error,'error');})
          .catch(function(err){toast('Fehler: '+err.message,'error');});
      };
      img.src=e.target.result;
    };
    reader.readAsDataURL(file);
    this.value='';
  });

  // --- Aktuelles / News ---
  var _newsLoaded = false;
  var _newsItems = [];
  var _editingNewsId = null;
  var _editingNewsStatus = 101001;

  function loadNews(){
    var container = document.getElementById('cms-news-list');
    var empty = document.getElementById('cms-news-empty');
    container.innerHTML = '<div style="text-align:center;padding:20px;color:#6b7280">Lade Beitr&auml;ge&hellip;</div>';
    fetch(API+'/news?all=true')
      .then(function(r){return r.json();})
      .then(function(res){
        if(!res.success){container.innerHTML='<p style="color:#dc2626">Fehler: '+res.error+'</p>';return;}
        _newsItems = res.data || [];
        _newsLoaded = true;
        renderNewsList();
      })
      .catch(function(e){container.innerHTML='<p style="color:#dc2626">Fehler: '+e.message+'</p>';});
  }

  function renderNewsList(){
    var container = document.getElementById('cms-news-list');
    var empty = document.getElementById('cms-news-empty');
    if(_newsItems.length===0){container.innerHTML='';empty.style.display='';return;}
    empty.style.display='none';
    var html='<table class="cms-news-tbl"><thead><tr><th style="width:76px">Datum</th><th>Titel</th><th style="width:56px">Status</th><th style="width:60px">Laufband</th><th style="width:140px;text-align:right">Aktionen</th></tr></thead><tbody>';
    _newsItems.forEach(function(n){
      var isActive = n.status===101001;
      var isLaufband = !!n.dl_laufband;
      var dateStr = n.datum?new Date(n.datum).toLocaleDateString('de-DE',{day:'numeric',month:'numeric',year:'2-digit'}):'–';
      var desc = n.beschreibung||n.dl_kurztext||'';
      html+='<tr style="opacity:1">'
        +'<td class="cms-news-date">'+dateStr+'</td>'
        +'<td><div class="cms-news-title">'+esc(n.titel)+'</div>'+(desc?'<div class="cms-news-desc">'+esc(desc.length>80?desc.substring(0,80)+'…':desc)+'</div>':'')+'</td>'
        +'<td><span class="cms-news-badge'+(isActive?' active':'')+'">'+(isActive?'Aktiv':'Inaktiv')+'</span></td>'
        +'<td style="text-align:center">'+(isLaufband?'<span class="cms-news-badge active" style="background:#dbeafe;color:#1e40af">📢</span>':'–')+'</td>'
        +'<td class="cms-news-actions">'
        +'<button class="cms-news-abtn" data-action="toggleNewsStatus" data-id="'+n.id+'" title="'+(isActive?'Deaktivieren':'Aktivieren')+'">'+(isActive?'⏸':'▶')+'</button>'
        +'<button class="cms-news-abtn" data-action="editNews" data-id="'+n.id+'" title="Bearbeiten">✏️</button>'
        +'<button class="cms-news-abtn cms-news-del" data-action="deleteNews" data-id="'+n.id+'" title="Löschen">🗑</button>'
        +'</td></tr>';
    });
    html+='</tbody></table>';
    container.innerHTML = html;
  }

  function openNewNews(){
    _editingNewsId = null;
    _editingNewsStatus = 101001;
    showNewsModal('Neuer Beitrag','','');
  }

  function editNews(id){
    var item = _newsItems.find(function(n){return n.id===id;});
    if(!item){toast('Beitrag nicht gefunden','error');return;}
    _editingNewsId = id;
    _editingNewsStatus = item.status||101001;
    showNewsModal('Beitrag bearbeiten',item.titel,item.dl_inhalt||'',item.dl_laufband);
  }

  function showNewsModal(title,titel,inhalt,laufband){
    // Extract existing beitragsbild from inhalt
    var existingImg = '';
    var cleanInhalt = inhalt.replace(/<div class="news-beitragsbild">.*?<\/div>/gi, function(m){
      var match = m.match(/src="([^"]+)"/);
      if(match) existingImg = match[1];
      return '';
    });
    inhalt = cleanInhalt;
    var overlay = document.createElement('div');
    overlay.id='cms-news-modal';
    overlay.className='cms-modal-bg';
    overlay.innerHTML='<div class="cms-modal" style="max-width:720px">'
      +'<h3 style="margin:0 0 14px;font-size:15px;font-weight:700;border-bottom:1px solid #e5e7eb;padding-bottom:10px">'+title+'</h3>'
      +'<label class="cms-news-lbl">Titel</label>'
      +'<input class="cms-input" id="news-edit-titel" value="'+esc(titel)+'" placeholder="Überschrift des Beitrags">'
      +'<label class="cms-news-lbl">Inhalt</label>'
      +'<div class="cms-rte-toolbar">'
      +'<button type="button" class="cms-rte-btn" data-rte="bold" title="Fett"><b>F</b></button>'
      +'<button type="button" class="cms-rte-btn" data-rte="italic" title="Kursiv"><i>K</i></button>'
      +'<button type="button" class="cms-rte-btn" data-rte="underline" title="Unterstrichen"><u>U</u></button>'
      +'<span class="cms-rte-sep"></span>'
      +'<button type="button" class="cms-rte-btn" data-rte="insertUnorderedList" title="Liste">☰</button>'
      +'<button type="button" class="cms-rte-btn" data-rte="createLink" title="Link einfügen">🔗</button>'
      +'<button type="button" class="cms-rte-btn" data-rte="insertImage" title="Bild einfügen">🖼️</button>'
      +'<span class="cms-rte-sep"></span>'
      +'<button type="button" class="cms-rte-btn" data-rte="removeFormat" title="Formatierung entfernen">✖</button>'
      +'</div>'
      +'<div class="cms-rte-editor" id="news-edit-inhalt" contenteditable="true">'+inhalt+'</div>'
      +'<label class="cms-news-lbl">Beitragsbild (optional)</label>'
      +'<div class="cms-news-img-row">'
      +'<img id="news-edit-img-preview" class="cms-news-img-preview" style="display:none">'
      +'<button type="button" class="cms-btn cms-btn-sm cms-btn-gray" id="news-edit-img-btn">📁 Bild auswählen</button>'
      +'<button type="button" class="cms-btn cms-btn-sm cms-btn-gray" id="news-edit-img-clear" style="display:none">✕ Entfernen</button>'
      +'<input type="hidden" id="news-edit-img-data">'
      +'</div>'
      +'<label style="display:flex;align-items:center;gap:8px;margin-top:14px;cursor:pointer"><input type="checkbox" id="news-edit-laufband" style="width:18px;height:18px;accent-color:#2e7d4f"> <span style="font-size:13px;font-weight:600;color:#374151">Im Laufband anzeigen</span></label>'
      +'<div style="display:flex;gap:8px;justify-content:flex-end;margin-top:16px;padding-top:12px;border-top:1px solid #e5e7eb">'
      +'<button class="cms-btn cms-btn-gray" data-action="closeNewsModal">Abbrechen</button>'
      +'<button class="cms-btn cms-btn-primary" data-action="saveNews">💾 Speichern</button>'
      +'</div></div>';
    document.body.appendChild(overlay);
    overlay.addEventListener('click',function(e){if(e.target===overlay)overlay.remove();});
    // Wire save/cancel buttons directly (delegation can fail on mobile with contenteditable)
    var saveBtn=overlay.querySelector('[data-action="saveNews"]');
    var cancelBtn=overlay.querySelector('[data-action="closeNewsModal"]');
    if(saveBtn) saveBtn.addEventListener('click',function(e){e.stopPropagation();saveNews();});
    if(cancelBtn) cancelBtn.addEventListener('click',function(e){e.stopPropagation();overlay.remove();});
    // RTE toolbar handlers
    overlay.querySelectorAll('.cms-rte-btn').forEach(function(btn){
      btn.addEventListener('click',function(){
        var cmd=btn.getAttribute('data-rte');
        if(cmd==='createLink'){var url=prompt('URL eingeben:','https://');if(url)document.execCommand('createLink',false,url);}
        else if(cmd==='insertImage'){
          var fi=document.createElement('input');fi.type='file';fi.accept='image/*';
          fi.onchange=function(){var f=fi.files[0];if(!f)return;var r=new FileReader();r.onload=function(){document.execCommand('insertImage',false,r.result);};r.readAsDataURL(f);};
          fi.click();
        }
        else{document.execCommand(cmd,false,null);}
      });
    });
    // Image upload for Beitragsbild
    var imgBtn=document.getElementById('news-edit-img-btn');
    var imgClr=document.getElementById('news-edit-img-clear');
    var imgPv=document.getElementById('news-edit-img-preview');
    var imgData=document.getElementById('news-edit-img-data');
    imgBtn.addEventListener('click',function(){
      var fi=document.createElement('input');fi.type='file';fi.accept='image/*';
      fi.onchange=function(){var f=fi.files[0];if(!f)return;var r=new FileReader();r.onload=function(){imgPv.src=r.result;imgPv.style.display='';imgClr.style.display='';imgData.value=r.result;};r.readAsDataURL(f);};
      fi.click();
    });
    imgClr.addEventListener('click',function(){imgPv.src='';imgPv.style.display='none';imgClr.style.display='none';imgData.value='';});
    // Show existing beitragsbild if present
    if(existingImg){imgPv.src=existingImg;imgPv.style.display='';imgClr.style.display='';imgData.value=existingImg;}
    // Set Laufband checkbox
    var lbCb=document.getElementById('news-edit-laufband');
    if(lbCb) lbCb.checked=!!laufband;
  }

  function saveNews(){
    var titel = document.getElementById('news-edit-titel').value.trim();
    var inhaltEl = document.getElementById('news-edit-inhalt');
    var inhalt = (inhaltEl.innerHTML||'').trim();
    if(!titel){toast('Bitte Titel eingeben','warning');return;}
    var imgD = document.getElementById('news-edit-img-data');
    if(imgD && imgD.value){
      inhalt += '<div class="news-beitragsbild"><img src="'+imgD.value+'" alt="Beitragsbild" style="max-width:100%;border-radius:8px;margin-top:12px"></div>';
    }
    var lbCb = document.getElementById('news-edit-laufband');
    var payload = {titel:titel,inhalt:inhalt,status:_editingNewsStatus||101001,dl_laufband:lbCb?lbCb.checked:false};
    if(_editingNewsId) payload.id = _editingNewsId;
    fetch(API+'/news-save',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)})
      .then(function(r){return r.json();})
      .then(function(res){
        if(res.success){
          toast(_editingNewsId?'Beitrag aktualisiert!':'Beitrag erstellt!','success');
          var modal=document.getElementById('cms-news-modal');if(modal)modal.remove();
          _newsLoaded=false;loadNews();
        } else {toast('Fehler: '+res.error,'error');}
      })
      .catch(function(e){toast('Fehler: '+e.message,'error');});
  }

  function deleteNews(id){
    var item = _newsItems.find(function(n){return n.id===id;});
    var name = item?item.titel:'';
    var overlay = document.createElement('div');
    overlay.id='cms-news-del-modal';
    overlay.style.cssText='position:fixed;inset:0;background:rgba(0,0,0,0.5);display:flex;align-items:center;justify-content:center;z-index:9999';
    overlay.innerHTML='<div style="background:#fff;border-radius:12px;padding:24px;width:90%;max-width:400px">'
      +'<h3 style="margin:0 0 12px;font-size:15px">Beitrag l&ouml;schen?</h3>'
      +'<p style="margin:0 0 16px;font-size:13px;color:#4b5563">&bdquo;'+esc(name)+'&ldquo; wird unwiderruflich gel&ouml;scht.</p>'
      +'<div style="display:flex;gap:8px;justify-content:flex-end">'
      +'<button class="cms-btn cms-btn-gray" onclick="document.getElementById(\'cms-news-del-modal\').remove()">Abbrechen</button>'
      +'<button class="cms-btn" style="background:#dc2626;color:#fff" data-action="confirmDeleteNews" data-id="'+id+'">L&ouml;schen</button>'
      +'</div></div>';
    document.body.appendChild(overlay);
    overlay.addEventListener('click',function(e){if(e.target===overlay)overlay.remove();});
  }

  function confirmDeleteNews(id){
    fetch(API+'/news-delete?id='+id,{method:'DELETE'})
      .then(function(r){return r.json();})
      .then(function(res){
        if(res.success){
          toast('Beitrag gel&ouml;scht','success');
          var modal=document.getElementById('cms-news-del-modal');if(modal)modal.remove();
          _newsItems=_newsItems.filter(function(n){return n.id!==id;});
          renderNewsList();
        } else {toast('Fehler: '+res.error,'error');}
      })
      .catch(function(e){toast('Fehler: '+e.message,'error');});
  }

  function toggleNewsStatus(id){
    var item = _newsItems.find(function(n){return n.id===id;});
    if(!item){toast('Beitrag nicht gefunden','error');return;}
    var newStatus = item.status===101001?101000:101001;
    fetch(API+'/news-save',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({id:id,titel:item.titel,inhalt:item.dl_inhalt||'',status:newStatus})})
      .then(function(r){return r.json();})
      .then(function(res){
        if(res.success){
          item.status=newStatus;
          toast(newStatus===101001?'Beitrag aktiviert':'Beitrag deaktiviert','success');
          renderNewsList();
        } else {toast('Fehler: '+res.error,'error');}
      })
      .catch(function(e){toast('Fehler: '+e.message,'error');});
  }

  // --- WhatsApp Share ---
  function fmtPriceWA(v){return v?Number(v).toFixed(2).replace('.',',')+' \u20AC':'';}

  function generateMenuImage(mealRows, header, callback, tplOverride, kindOverride){
    var SF='Segoe UI, sans-serif';
    var W=794,padL=30,padR=30;
    var headerH=130,rowH=52,gapBetweenDays=12,footerH=44;
    var groups=[];var curGrp=null;
    mealRows.forEach(function(m){
      if(m.day){if(curGrp)groups.push(curGrp);curGrp={day:m.day,items:[m]};}
      else if(curGrp){curGrp.items.push(m);}
    });
    if(curGrp)groups.push(curGrp);
    // Pre-resolve template so height calc can be template-aware
    var hp=hpCfgGet();
    var wpKind=kindOverride||'flyer';
    var tpl=((tplOverride||hp.wpFlyerTemplate||'classic-red')+'').toLowerCase();
    var tplMap={'minimal-clean':'clean-white','organic-market':'clean-white','bold-poster':'tafel','magazine-split':'bento','compact-chips':'bento','rail-menu':'timeline','newspaper-list':'zeitung','timeline-stripe':'timeline','bento-cards':'bento'};
    if(tplMap[tpl])tpl=tplMap[tpl];
    // Read custom color overrides for this template
    var cc=getWpTplColors(tpl,hp,wpKind);

    var totalGroupH=0;
    if(tpl==='tafel'){
      groups.forEach(function(g){totalGroupH+=36+Math.max(g.items.length,1)*rowH+gapBetweenDays;});
    }else if(tpl==='bento'){
      var colH=[0,0];
      groups.forEach(function(g,i){colH[i%2]+=44+Math.max(1,g.items.length)*38+10+12;});
      totalGroupH=Math.max(colH[0],colH[1]);
    }else if(tpl==='timeline'){
      groups.forEach(function(g){totalGroupH+=38+Math.max(1,g.items.length)*40+8+12;});
    }else if(tpl==='zeitung'){
      var colH2=[0,0];
      groups.forEach(function(g,i){colH2[i%2]+=38+Math.max(1,g.items.length)*36+8+12;});
      totalGroupH=Math.max(colH2[0],colH2[1]);
    }else{
      groups.forEach(function(g){totalGroupH+=Math.max(g.items.length*rowH,rowH)+gapBetweenDays;});
    }
    var H=headerH+20+totalGroupH+footerH+30;
    var c=document.createElement('canvas');c.width=W;c.height=H;
    var ctx=c.getContext('2d');ctx.textBaseline='top';

    function rrect(rx,ry,rw,rh,r){
      ctx.beginPath();ctx.moveTo(rx+r,ry);ctx.lineTo(rx+rw-r,ry);ctx.quadraticCurveTo(rx+rw,ry,rx+rw,ry+r);
      ctx.lineTo(rx+rw,ry+rh-r);ctx.quadraticCurveTo(rx+rw,ry+rh,rx+rw-r,ry+rh);
      ctx.lineTo(rx+r,ry+rh);ctx.quadraticCurveTo(rx,ry+rh,rx,ry+rh-r);
      ctx.lineTo(rx,ry+r);ctx.quadraticCurveTo(rx,ry,rx+r,ry);ctx.closePath();
    }

    function wrap2(text,maxW){
      var t=(text||'').trim();
      if(!t) return [''];
      var words=t.split(/\s+/),lines=[],line='';
      for(var wi=0;wi<words.length;wi++){
        var w=words[wi];
        var test=line?line+' '+w:w;
        if(ctx.measureText(test).width<=maxW){line=test;continue;}
        if(line){lines.push(line);line=w;}else{lines.push(w);line='';}
        if(lines.length===2) break;
      }
      if(lines.length<2&&line) lines.push(line);
      if(lines.length===2){
        while(ctx.measureText(lines[1]).width>maxW&&lines[1].length>1){lines[1]=lines[1].slice(0,-1);}
      }
      return lines.slice(0,2);
    }

    function drawCommonLogo(){
      var logoImg=new Image();
      return new Promise(function(res){
        logoImg.onload=function(){
          var lh=72,lw=lh*(logoImg.width/logoImg.height);
          ctx.drawImage(logoImg,W-lw-padR,18,lw,lh);res();
        };
        logoImg.onerror=function(){res();};
        var hdrLogo=document.querySelector('#cms-app img[src^="data:image"]');
        logoImg.src=hdrLogo?hdrLogo.src:'/Logo-sm-64.png';
      });
    }

    function drawFooter(color){
      ctx.fillStyle=color||'#6b7280';ctx.font='11px '+SF;ctx.textAlign='center';
      ctx.fillText('Dorfladen Oberornau \u00b7 Dorfplatz 1 \u00b7 84419 Obertaufkirchen \u00b7 Tel: 08082 622 99 91',W/2,H-footerH+10);
      ctx.textAlign='left';
    }

    // ── Shared row-drawing: Day label left, dishes right ──
    function drawRows(yStart,dayLabelW,s){
      var y=yStart,cardW=W-padL-padR;
      groups.forEach(function(grp){
        var grpH=Math.max(grp.items.length*rowH,rowH);
        ctx.save();
        if(s.shadow){ctx.shadowColor=s.shadow;ctx.shadowBlur=s.shadowBlur||0;ctx.shadowOffsetX=3;ctx.shadowOffsetY=3;}
        ctx.fillStyle=s.cardBg;rrect(padL,y,cardW,grpH,s.radius||10);ctx.fill();ctx.restore();
        if(s.cardBorder){ctx.strokeStyle=s.cardBorder;ctx.lineWidth=1;rrect(padL,y,cardW,grpH,s.radius||10);ctx.stroke();}
        // Day label
        ctx.fillStyle=s.dayFill;rrect(padL,y,dayLabelW,grpH,s.radius||10);ctx.fill();
        ctx.fillRect(padL+dayLabelW-(s.radius||10),y,s.radius||10,grpH);
        ctx.fillStyle=s.dayText;ctx.font='700 15px '+SF;ctx.textAlign='center';
        ctx.fillText(grp.day.toUpperCase(),padL+dayLabelW/2,y+grpH/2-8);ctx.textAlign='left';
        var dishX=padL+dayLabelW+16,priceX=W-padR-14;
        grp.items.forEach(function(m,di){
          var ry=y+di*rowH;
          if(di>0){ctx.strokeStyle=s.rowLine;ctx.lineWidth=1;ctx.setLineDash(s.dash||[]);ctx.beginPath();ctx.moveTo(dishX,ry);ctx.lineTo(priceX,ry);ctx.stroke();ctx.setLineDash([]);}
          ctx.fillStyle=s.text;ctx.font='600 15px '+SF;
          var dl=wrap2(m.dish||'',Math.max(80,priceX-dishX-(m.price?60:8)));
          ctx.fillText(dl[0]||'',dishX,ry+10);if(dl[1])ctx.fillText(dl[1],dishX,ry+30);
          if(m.price){ctx.fillStyle=s.price;ctx.font='700 16px '+SF;ctx.textAlign='right';ctx.fillText(m.price,priceX,ry+14);ctx.textAlign='left';}
        });
        y+=grpH+gapBetweenDays;
      });
      return y;
    }

    // ── Stacked rows: full-width day header bar, then dishes below ──
    function drawRowsStacked(yStart,s){
      var y=yStart,cardW=W-padL-padR;
      groups.forEach(function(grp){
        var grpH=36+Math.max(grp.items.length,1)*rowH;
        if(s.cardBg){ctx.fillStyle=s.cardBg;rrect(padL,y,cardW,grpH,s.radius||10);ctx.fill();}
        if(s.cardBorder){ctx.strokeStyle=s.cardBorder;ctx.lineWidth=1;rrect(padL,y,cardW,grpH,s.radius||10);ctx.stroke();}
        // Day header strip
        ctx.fillStyle=s.dayFill;rrect(padL,y,cardW,34,s.radius||10);ctx.fill();
        ctx.fillRect(padL,y+24,cardW,10);
        ctx.fillStyle=s.dayText;ctx.font='700 14px '+SF;ctx.textAlign='left';
        ctx.fillText(grp.day.toUpperCase(),padL+14,y+10);
        var ry=y+38;
        grp.items.forEach(function(m,di){
          if(di>0){ctx.strokeStyle=s.rowLine||'#e5e7eb';ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(padL+14,ry);ctx.lineTo(W-padR-14,ry);ctx.stroke();}
          ctx.fillStyle=s.text;ctx.font='600 15px '+SF;
          var dl=wrap2(m.dish||'',cardW-40-(m.price?70:10));
          ctx.fillText(dl[0]||'',padL+14,ry+10);if(dl[1])ctx.fillText(dl[1],padL+14,ry+28);
          if(m.price){ctx.fillStyle=s.price;ctx.font='700 16px '+SF;ctx.textAlign='right';ctx.fillText(m.price,W-padR-14,ry+14);ctx.textAlign='left';}
          ry+=rowH;
        });
        y+=grpH+gapBetweenDays;
      });
      return y;
    }

    // ── Bento: 2-column masonry cards ──
    function drawRowsBento(yStart,s){
      var colGap=14,cardW=(W-padL-padR-colGap)/2;
      var leftY=yStart,rightY=yStart;
      var dayColors=s.dayColors||['#2563eb','#059669','#d97706','#dc2626','#7c3aed'];
      groups.forEach(function(grp,idx){
        var isRight=idx%2===1;
        var x=isRight?(padL+cardW+colGap):padL;
        var y=isRight?rightY:leftY;
        var rows=Math.max(1,grp.items.length);
        var cardH=44+rows*38+10;
        var dc=dayColors[idx%dayColors.length];
        ctx.save();ctx.shadowColor='rgba(0,0,0,0.06)';ctx.shadowBlur=6;ctx.shadowOffsetY=3;
        ctx.fillStyle=s.cardBg||'#ffffff';rrect(x,y,cardW,cardH,12);ctx.fill();ctx.restore();
        ctx.strokeStyle=s.cardBorder||'#e5e7eb';ctx.lineWidth=1;rrect(x,y,cardW,cardH,12);ctx.stroke();
        // Colored top bar
        ctx.fillStyle=dc;rrect(x,y,cardW,4,12);ctx.fill();ctx.fillRect(x,y+4,cardW,0);
        ctx.fillStyle=dc;ctx.font='700 14px '+SF;ctx.textAlign='left';
        ctx.fillText((grp.day||'').toUpperCase(),x+14,y+16);
        var ry=y+42;
        grp.items.forEach(function(m,ri){
          if(ri>0){ctx.strokeStyle='#f3f4f6';ctx.beginPath();ctx.moveTo(x+12,ry);ctx.lineTo(x+cardW-12,ry);ctx.stroke();}
          ctx.fillStyle=s.text||'#1f2937';ctx.font='600 13px '+SF;
          var dl=wrap2(m.dish||'',cardW-90);
          ctx.fillText(dl[0]||'',x+14,ry+4);if(dl[1])ctx.fillText(dl[1],x+14,ry+20);
          if(m.price){ctx.fillStyle=dc;ctx.font='700 14px '+SF;ctx.textAlign='right';ctx.fillText(m.price,x+cardW-14,ry+7);ctx.textAlign='left';}
          ry+=38;
        });
        if(isRight)rightY+=cardH+12;else leftY+=cardH+12;
      });
      return Math.max(leftY,rightY);
    }

    // ── Timeline: vertical line with dots ──
    function drawRowsTimeline(yStart,s){
      var railX=padL+16;
      var y=yStart;
      groups.forEach(function(grp){
        var rows=Math.max(1,grp.items.length);
        var cardH=38+rows*40+8;
        var x=padL+36,cardW=W-padR-x;
        // Rail segment
        ctx.strokeStyle=s.railColor||'#3b82f6';ctx.lineWidth=3;
        ctx.beginPath();ctx.moveTo(railX,y);ctx.lineTo(railX,y+cardH);ctx.stroke();
        // Dot
        ctx.fillStyle=s.railColor||'#3b82f6';ctx.beginPath();ctx.arc(railX,y+18,6,0,Math.PI*2);ctx.fill();
        ctx.fillStyle='#ffffff';ctx.beginPath();ctx.arc(railX,y+18,3,0,Math.PI*2);ctx.fill();
        // Card
        ctx.save();ctx.shadowColor='rgba(0,0,0,0.05)';ctx.shadowBlur=4;ctx.shadowOffsetY=2;
        ctx.fillStyle=s.cardBg||'#ffffff';rrect(x,y,cardW,cardH,10);ctx.fill();ctx.restore();
        if(s.cardBorder){ctx.strokeStyle=s.cardBorder;ctx.lineWidth=1;rrect(x,y,cardW,cardH,10);ctx.stroke();}
        // Day name pill
        ctx.fillStyle=s.dayFill||'#eff6ff';rrect(x+10,y+8,110,24,8);ctx.fill();
        ctx.fillStyle=s.dayText||'#1d4ed8';ctx.font='700 13px '+SF;ctx.textAlign='left';
        ctx.fillText((grp.day||'').toUpperCase(),x+18,y+13);
        var ry=y+38;
        grp.items.forEach(function(m,ri){
          if(ri>0){ctx.strokeStyle=s.rowLine||'#e5e7eb';ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(x+12,ry);ctx.lineTo(x+cardW-12,ry);ctx.stroke();}
          ctx.fillStyle=s.text||'#1e293b';ctx.font='600 14px '+SF;
          var dl=wrap2(m.dish||'',cardW-100);
          ctx.fillText(dl[0]||'',x+14,ry+5);if(dl[1])ctx.fillText(dl[1],x+14,ry+22);
          if(m.price){ctx.fillStyle=s.price||'#2563eb';ctx.font='700 15px '+SF;ctx.textAlign='right';ctx.fillText(m.price,x+cardW-14,ry+8);ctx.textAlign='left';}
          ry+=40;
        });
        y+=cardH+12;
      });
      return y;
    }

    // ── Newspaper: 2-column elegant ──
    function drawRowsNewspaper(yStart,s){
      var colGap=16,colW=(W-padL-padR-colGap)/2;
      var leftY=yStart,rightY=yStart;
      groups.forEach(function(grp,idx){
        var right=idx%2===1;
        var x=right?(padL+colW+colGap):padL;
        var y=right?rightY:leftY;
        var rows=Math.max(1,grp.items.length);
        var cardH=38+rows*36+8;
        ctx.fillStyle=s.cardBg||'#ffffff';rrect(x,y,colW,cardH,8);ctx.fill();
        if(s.cardBorder){ctx.strokeStyle=s.cardBorder;ctx.lineWidth=1;rrect(x,y,colW,cardH,8);ctx.stroke();}
        // Day name + underline
        ctx.fillStyle=s.dayText||'#1f2937';ctx.font='700 15px '+SF;ctx.textAlign='left';
        ctx.fillText((grp.day||'').toUpperCase(),x+12,y+10);
        ctx.strokeStyle=s.accent||'#1f2937';ctx.lineWidth=2;
        ctx.beginPath();ctx.moveTo(x+12,y+32);ctx.lineTo(x+colW-12,y+32);ctx.stroke();
        var ry=y+38;
        grp.items.forEach(function(m,ri){
          if(ri>0){ctx.strokeStyle='#e5e7eb';ctx.lineWidth=1;ctx.setLineDash([2,2]);ctx.beginPath();ctx.moveTo(x+12,ry);ctx.lineTo(x+colW-12,ry);ctx.stroke();ctx.setLineDash([]);}
          ctx.fillStyle=s.text||'#374151';ctx.font='600 13px '+SF;
          var dl=wrap2(m.dish||'',colW-90);
          ctx.fillText(dl[0]||'',x+12,ry+4);if(dl[1])ctx.fillText(dl[1],x+12,ry+20);
          if(m.price){ctx.fillStyle=s.price||'#1f2937';ctx.font='700 14px '+SF;ctx.textAlign='right';ctx.fillText(m.price,x+colW-12,ry+7);ctx.textAlign='left';}
          ry+=36;
        });
        if(right)rightY+=cardH+12;else leftY+=cardH+12;
      });
      return Math.max(leftY,rightY);
    }

    var logoLoaded;

    if(tpl==='clean-white'){
      // ── 1. CLEAN WHITE: Pure white, gray tones, ultra-clean ──
      ctx.fillStyle=cc.wpBgColor;ctx.fillRect(0,0,W,H);
      ctx.textAlign='left';ctx.fillStyle=cc.wpDishColor;ctx.font='700 42px '+SF;ctx.fillText('Wochenplan',padL,28);
      ctx.fillStyle='#6b7280';ctx.font='400 17px '+SF;ctx.fillText('Mittagstisch  \u00b7  '+header,padL,74);
      ctx.strokeStyle='#e5e7eb';ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(padL,headerH-6);ctx.lineTo(W-padR,headerH-6);ctx.stroke();
      drawRows(headerH+14,120,{cardBg:cc.wpStripeColor,cardBorder:'#e5e7eb',radius:8,dayFill:cc.wpHeaderFrom,dayText:cc.wpDayColor,text:cc.wpDishColor,price:cc.wpPriceColor,rowLine:'#e5e7eb',dash:[]});
      logoLoaded=drawCommonLogo();drawFooter('#9ca3af');

    }else if(tpl==='dark-modern'){
      // ── 2. DARK MODERN: Dark slate background, bright accents ──
      var bg=ctx.createLinearGradient(0,0,0,H);bg.addColorStop(0,cc.wpBgColor);bg.addColorStop(1,'#1e293b');
      ctx.fillStyle=bg;ctx.fillRect(0,0,W,H);
      ctx.textAlign='left';ctx.fillStyle=cc.wpDishColor;ctx.font='700 42px '+SF;ctx.fillText('Wochenplan',padL,28);
      ctx.fillStyle='#94a3b8';ctx.font='400 17px '+SF;ctx.fillText('Mittagstisch  \u00b7  '+header,padL,74);
      ctx.strokeStyle='#334155';ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(padL,headerH-6);ctx.lineTo(W-padR,headerH-6);ctx.stroke();
      drawRows(headerH+14,120,{cardBg:cc.wpStripeColor,cardBorder:'#334155',radius:10,dayFill:cc.wpHeaderFrom,dayText:cc.wpDayColor,text:cc.wpDishColor,price:cc.wpPriceColor,rowLine:'#334155',dash:[]});
      logoLoaded=drawCommonLogo();drawFooter('#64748b');

    }else if(tpl==='tafel'){
      // ── 3. TAFEL: Chalkboard green, white text, handwritten feel ──
      ctx.fillStyle=cc.wpBgColor;ctx.fillRect(0,0,W,H);
      // Subtle chalk dust texture
      ctx.globalAlpha=0.03;
      for(var ty=0;ty<H;ty+=2){for(var tx=0;tx<W;tx+=2){if(Math.random()>0.6){ctx.fillStyle='#fff';ctx.fillRect(tx,ty,1,1);}}}
      ctx.globalAlpha=1;
      // Double border like a real blackboard frame
      ctx.strokeStyle='#8b7355';ctx.lineWidth=6;ctx.strokeRect(8,8,W-16,H-16);
      ctx.strokeStyle='#a08968';ctx.lineWidth=2;ctx.strokeRect(14,14,W-28,H-28);
      ctx.textAlign='left';ctx.fillStyle='#ffffff';ctx.font='700 44px '+SF;ctx.fillText('Wochenplan',padL+10,32);
      ctx.fillStyle='#a3d9a5';ctx.font='400 17px '+SF;ctx.fillText('Mittagstisch  \u00b7  '+header,padL+10,78);
      ctx.strokeStyle='rgba(255,255,255,0.25)';ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(padL+10,headerH-4);ctx.lineTo(W-padR-10,headerH-4);ctx.stroke();
      drawRowsStacked(headerH+10,{cardBg:cc.wpStripeColor,radius:6,dayFill:'rgba(255,255,255,0.12)',dayText:cc.wpDayColor,text:cc.wpDishColor,price:cc.wpPriceColor,rowLine:'rgba(255,255,255,0.1)'});
      logoLoaded=drawCommonLogo();drawFooter('rgba(255,255,255,0.5)');

    }else if(tpl==='bento'){
      // ── 4. BENTO: 2-column masonry, colorful day accents ──
      ctx.fillStyle=cc.wpBgColor;ctx.fillRect(0,0,W,H);
      ctx.textAlign='left';ctx.fillStyle=cc.wpDishColor;ctx.font='700 42px '+SF;ctx.fillText('Wochenplan',padL,28);
      ctx.fillStyle='#64748b';ctx.font='400 17px '+SF;ctx.fillText('Mittagstisch  \u00b7  '+header,padL,74);
      ctx.strokeStyle='#e2e8f0';ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(padL,headerH-6);ctx.lineTo(W-padR,headerH-6);ctx.stroke();
      drawRowsBento(headerH+14,{cardBg:cc.wpStripeColor,cardBorder:'#e2e8f0',text:cc.wpDishColor,dayColors:[cc.wpDayColor,cc.wpPriceColor,'#d97706','#dc2626','#7c3aed']});
      logoLoaded=drawCommonLogo();drawFooter('#94a3b8');

    }else if(tpl==='timeline'){
      // ── 5. TIMELINE: Vertical line with dots, card per day ──
      ctx.fillStyle=cc.wpBgColor;ctx.fillRect(0,0,W,H);
      ctx.textAlign='left';ctx.fillStyle=cc.wpDayColor;ctx.font='700 42px '+SF;ctx.fillText('Wochenplan',padL,28);
      ctx.fillStyle='#64748b';ctx.font='400 17px '+SF;ctx.fillText('Mittagstisch  \u00b7  '+header,padL,74);
      ctx.strokeStyle='#bae6fd';ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(padL,headerH-6);ctx.lineTo(W-padR,headerH-6);ctx.stroke();
      drawRowsTimeline(headerH+14,{railColor:cc.wpHeaderFrom,cardBg:cc.wpStripeColor,cardBorder:'#e0f2fe',dayFill:cc.wpHeaderTo,dayText:cc.wpDayColor,text:cc.wpDishColor,price:cc.wpPriceColor,rowLine:cc.wpBgColor});
      logoLoaded=drawCommonLogo();drawFooter('#94a3b8');

    }else if(tpl==='zeitung'){
      // ── 6. ZEITUNG: 2-column newspaper, elegant, warm gray ──
      ctx.fillStyle='#fafaf9';ctx.fillRect(0,0,W,H);
      // Double rule at top
      ctx.strokeStyle='#292524';ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(padL,10);ctx.lineTo(W-padR,10);ctx.stroke();
      ctx.strokeStyle='#292524';ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(padL,16);ctx.lineTo(W-padR,16);ctx.stroke();
      ctx.textAlign='center';ctx.fillStyle='#1c1917';ctx.font='700 40px '+SF;ctx.fillText('Wochenplan',W/2,28);
      ctx.fillStyle='#78716c';ctx.font='400 16px '+SF;ctx.fillText('Mittagstisch  \u00b7  '+header,W/2,72);
      ctx.strokeStyle='#292524';ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(padL,headerH-8);ctx.lineTo(W-padR,headerH-8);ctx.stroke();
      ctx.strokeStyle='#292524';ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(padL,headerH-4);ctx.lineTo(W-padR,headerH-4);ctx.stroke();
      ctx.textAlign='left';
      // Vertical divider in center
      ctx.strokeStyle='#d6d3d1';ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(W/2,headerH+6);ctx.lineTo(W/2,H-footerH-8);ctx.stroke();
      drawRowsNewspaper(headerH+14,{cardBg:cc.wpBgColor,dayText:cc.wpDayColor,accent:cc.wpHeaderFrom,text:cc.wpDishColor,price:cc.wpPriceColor});
      logoLoaded=drawCommonLogo();drawFooter('#a8a29e');

    }else{
      // ── DEFAULT / KLASSIK: Warm beige, red accents, traditional ──
      ctx.fillStyle=cc.wpBgColor||'#fdf8f0';ctx.fillRect(0,0,W,H);
      ctx.textAlign='left';ctx.fillStyle=cc.wpHeaderFrom;ctx.font='700 44px '+SF;ctx.fillText('Wochenplan',padL,28);
      ctx.fillStyle='#6b7280';ctx.font='400 17px '+SF;ctx.fillText('Mittagstisch  \u00b7  '+header,padL,74);
      ctx.strokeStyle=cc.wpHeaderFrom;ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(padL,headerH-6);ctx.lineTo(W-padR,headerH-6);ctx.stroke();
      ctx.fillStyle='#9ca3af';ctx.font='400 12px '+SF;ctx.textAlign='center';ctx.fillText('Vorbestellung bis 10:00 Uhr erbeten!',W/2,headerH-1);ctx.textAlign='left';
      drawRows(headerH+14,124,{cardBg:cc.wpStripeColor,cardBorder:'#fecdd3',radius:10,dayFill:cc.wpHeaderFrom,dayText:cc.wpDayColor,text:cc.wpDishColor,price:cc.wpPriceColor,rowLine:'#fce7f3',dash:[],shadow:'rgba(159,18,57,0.06)',shadowBlur:2});
      logoLoaded=drawCommonLogo();drawFooter('#9ca3af');
    }

    ctx.textAlign='left';
    logoLoaded.then(function(){c.toBlob(function(blob){callback(blob);},'image/png');});
  }

  window.cmsShareWP=function(){
    var r=weekRange(kw,jahr);
    var header='KW '+kw+' \u00B7 '+fmtD(r.start)+' \u2013 '+fmtD(r.end);
    // Build meal rows for canvas
    var byDay={};
    [101000,101001,101002,101003,101004].forEach(function(d){byDay[d]=[];});
    meals.forEach(function(m){if(byDay[m.wochentag])byDay[m.wochentag].push(m);});
    var mealRows=[];
    [101000,101001,101002,101003,101004].forEach(function(dc){
      var items=byDay[dc];
      if(items.length===0){mealRows.push({day:DAYS[dc],dish:'\u2014',price:'',alt:''});return;}
      items.forEach(function(m,idx){
        mealRows.push({
          day:idx===0?DAYS[dc]:'',
          dish:m.gericht||m.beschreibung||'\u2014',
          price:m.preis?fmtPriceWA(m.preis):'',
          alt:''
        });
      });
    });
    // Build WhatsApp text (kurz)
    var msg='\ud83c\udf7d\ufe0f *Mittagsmen\u00fc '+header+'*';
    // Generate image + share directly
    generateMenuImage(mealRows,header,function(blob){
      shareBlob(blob,'Wochenplan_KW'+kw+'.png',msg);
    });
  };

  window.cmsPreviewWP=function(){
    var r=weekRange(kw,jahr);
    var header='KW '+kw+' \u00B7 '+fmtD(r.start)+' \u2013 '+fmtD(r.end);
    var byDay={};
    [101000,101001,101002,101003,101004].forEach(function(d){byDay[d]=[];});
    meals.forEach(function(m){if(byDay[m.wochentag])byDay[m.wochentag].push(m);});
    var mealRows=[];
    [101000,101001,101002,101003,101004].forEach(function(dc){
      var items=byDay[dc];
      if(items.length===0){mealRows.push({day:DAYS[dc],dish:'\u2014',price:'',alt:''});return;}
      items.forEach(function(m,idx){
        mealRows.push({day:idx===0?DAYS[dc]:'',dish:m.gericht||m.beschreibung||'\u2014',price:m.preis?fmtPriceWA(m.preis):'',alt:''});
      });
    });
    generateMenuImage(mealRows,header,function(blob){
      showSharePreview(blob,'Wochenplan_KW'+kw+'.png');
    });
  };

  window.cmsPreviewWpTpl=function(target){
    target=(target||'home-live').toLowerCase();
    if(target==='home'||target==='home-image'||target==='home-live')target='home';

    // Save current UI color values so generateMenuImage picks them up
    var uiCfg=hpCfgReadUI();
    try{localStorage.setItem(HPCFG_KEY,JSON.stringify(uiCfg));}catch(e){}

    var selId=(target==='flyer')?'hcfg-wpFlyerTemplate':'hcfg-wpHomeTemplate';
    var sel=document.getElementById(selId);
    var tpl=(sel&&sel.value)?sel.value:'classic-red';

    var mealRows=[];
    var byDay={};
    [101000,101001,101002,101003,101004].forEach(function(d){byDay[d]=[];});
    meals.forEach(function(m){if(byDay[m.wochentag])byDay[m.wochentag].push(m);});
    [101000,101001,101002,101003,101004].forEach(function(dc){
      var items=byDay[dc];
      if(items.length===0){mealRows.push({day:DAYS[dc],dish:'—',price:'',alt:''});return;}
      items.forEach(function(m,idx){
        mealRows.push({day:idx===0?DAYS[dc]:'',dish:m.gericht||m.beschreibung||'—',price:m.preis?fmtPriceWA(m.preis):'',alt:''});
      });
    });

    var r=weekRange(kw,jahr);
    var header='KW '+kw+' · '+fmtD(r.start)+' – '+fmtD(r.end);
    generateMenuImage(mealRows,header,function(blob){
      showSharePreview(blob,'Wochenplan-Template-Vorschau.png');
    },tpl,target);
  };

  window.cmsPrintWP=function(){
    var r=weekRange(kw,jahr);
    var header='KW '+kw+' \u00B7 '+fmtD(r.start)+' \u2013 '+fmtD(r.end);
    var byDay={};
    [101000,101001,101002,101003,101004].forEach(function(d){byDay[d]=[];});
    meals.forEach(function(m){if(byDay[m.wochentag])byDay[m.wochentag].push(m);});
    var mealRows=[];
    [101000,101001,101002,101003,101004].forEach(function(dc){
      var items=byDay[dc];
      if(items.length===0){mealRows.push({day:DAYS[dc],dish:'\u2014',price:'',alt:''});return;}
      items.forEach(function(m,idx){
        mealRows.push({day:idx===0?DAYS[dc]:'',dish:m.gericht||m.beschreibung||'\u2014',price:m.preis?fmtPriceWA(m.preis):'',alt:''});
      });
    });
    generateMenuImage(mealRows,header,function(blob){
      printFromBlob(blob);
    });
  };

  function shareBlob(blob,filename,msg){
    var file=new File([blob],filename,{type:blob.type||'image/png'});
    if(navigator.share){
      navigator.share({text:msg,files:[file]}).then(function(){
        console.log('[share] success');
      }).catch(function(err){
        console.warn('[share] failed:',err.name,err.message);
        if(err.name!=='AbortError') fallbackShare(blob,filename,msg);
      });
      return;
    }
    console.log('[share] navigator.share not available, using fallback');
    fallbackShare(blob,filename,msg);
  }
  function fallbackShare(blob,filename,msg){
    var url=URL.createObjectURL(blob);
    var a=document.createElement('a');a.href=url;a.download=filename;document.body.appendChild(a);a.click();document.body.removeChild(a);
    setTimeout(function(){URL.revokeObjectURL(url);},2000);
    toast('Bild heruntergeladen \u2013 WhatsApp \u00f6ffnet sich...','ok');
    setTimeout(function(){window.open('https://wa.me/?text='+encodeURIComponent(msg),'_blank');},800);
  }

  function showSharePreview(blob,filename,opts){
    opts=opts||{};
    var url=URL.createObjectURL(blob);
    var html='<div class="cms-modal-bg">';
    html+='<div class="cms-modal" style="max-width:520px;text-align:center">';
    html+='<h3 style="margin:0 0 12px;font-size:15px">Vorschau</h3>';
    html+='<img src="'+url+'" style="max-width:100%;max-height:55vh;border-radius:8px;border:1px solid #e5e7eb;margin-bottom:12px">';
    html+='<div style="display:flex;gap:8px;justify-content:center;flex-wrap:wrap">';
    html+='<button class="cms-btn cms-btn-gray" id="cms-share-dl">\u2b07\ufe0f Download</button>';
    html+='<button class="cms-btn cms-btn-gray" id="cms-share-print">\ud83d\udda8\ufe0f Drucken</button>';
    if(opts.showEinzelflyer){
      html+='<button class="cms-btn" id="cms-share-flyer" style="background:#e65100;color:#fff">\ud83d\udccb Einzelflyer</button>';
    }
    html+='<button class="cms-btn cms-btn-gray" data-action="closeModal">Schlie\u00dfen</button>';
    html+='</div></div></div>';
    document.getElementById('cms-modal-wrap').innerHTML=html;
    document.getElementById('cms-modal-wrap').style.display='';
    document.getElementById('cms-share-dl').onclick=function(){
      var a=document.createElement('a');a.href=url;a.download=filename;a.click();
      toast('Bild heruntergeladen','ok');
    };
    document.getElementById('cms-share-print').onclick=function(){
      printFromBlob(blob);
    };
    if(opts.showEinzelflyer && document.getElementById('cms-share-flyer')){
      document.getElementById('cms-share-flyer').onclick=function(){
        showEinzelflyer();
      };
    }
  }

  function printFromBlob(blob){
    var reader=new FileReader();
    reader.onload=function(){
      var win=window.open('','_blank');
      if(!win){toast('Popup-Blocker aktiv \u2013 bitte erlauben','warn');return;}
      win.document.write('<html><head><title>Drucken</title><style>@page{margin:10mm}body{margin:0;display:flex;justify-content:center;align-items:flex-start}img{max-width:100%;height:auto}</style></head><body><img src="'+reader.result+'" onload="setTimeout(function(){window.print();},300)"></body></html>');
      win.document.close();
    };
    reader.readAsDataURL(blob);
  }

  function getOfferTemplate(kind,cfg){
    var raw=kind==='flyer'?(cfg.flyerTemplate||'classic-red'):(cfg.plakatTemplate||'classic-red');
    var tpl=(raw||'classic-red').toLowerCase();
    var ok={
      'classic-red':1,
      'minimal-clean':1,
      'dark-modern':1,
      'organic-market':1,
      'bold-poster':1,
      'modern-magazine':1
    };
    return ok[tpl]?tpl:'classic-red';
  }

  // Template color defaults – used as base, can be overridden per template in config
  var TPL_COLOR_DEFAULTS={
    'classic-red':{bgColor:'#f4f1ea',titleColor:'#a51d2d',tagColor:'#a51d2d',cardBg:'#ffffff',cardBorder:'#eeeeee',textColor:'#1a1a1a',detailsColor:'#444444',imgBg:'#faf9f6'},
    'minimal-clean':{bgColor:'#ffffff',titleColor:'#111827',tagColor:'#047857',cardBg:'#ffffff',cardBorder:'#e5e7eb',textColor:'#1a1a1a',detailsColor:'#444444',imgBg:'#f9fafb'},
    'dark-modern':{bgColor:'#0f172a',titleColor:'#e5e7eb',tagColor:'#0ea5e9',cardBg:'#f5f5f5',cardBorder:'#94a3b8',textColor:'#111827',detailsColor:'#334155',imgBg:'#e2e8f0'},
    'organic-market':{bgColor:'#f7f2e7',titleColor:'#355e3b',tagColor:'#8b1e3f',cardBg:'#fffdf8',cardBorder:'#e9dfcf',textColor:'#2f3d2f',detailsColor:'#6b5b48',imgBg:'#faf5eb'},
    'bold-poster':{bgColor:'#fff7ed',titleColor:'#b91c1c',tagColor:'#ea580c',cardBg:'#fffaf2',cardBorder:'#fdba74',textColor:'#7c2d12',detailsColor:'#9a3412',imgBg:'#fff5e6'},
    'modern-magazine':{bgColor:'#edf4ea',titleColor:'#5e7057',tagColor:'#6f835f',cardBg:'#f6fbf5',cardBorder:'#d2e0cf',textColor:'#2c3a2a',detailsColor:'#5b6d54',imgBg:'#eef5eb'}
  };
  var TPL_COLOR_KEYS=['bgColor','titleColor','tagColor','cardBg','cardBorder','textColor','detailsColor','imgBg'];
  var TPL_GRAD_KEYS=['bgColor','imgBg'];

  function getTplColors(tplName,cfg,kind){
    var defaults=TPL_COLOR_DEFAULTS[tplName]||TPL_COLOR_DEFAULTS['classic-red'];
    // Look up kind-prefixed key first (e.g. 'plakat:classic-red'), fall back to legacy non-prefixed key
    var tc=cfg.tplColors||{};
    var overrides=(kind&&tc[kind+':'+tplName])||tc[tplName]||{};
    var result={};
    TPL_COLOR_KEYS.forEach(function(k){result[k]=overrides[k]||defaults[k];});
    TPL_GRAD_KEYS.forEach(function(k){
      result[k+'_grad']=overrides[k+'_grad']||false;
      result[k+'_c2']=overrides[k+'_c2']||defaults[k];
      result[k+'_dir']=overrides[k+'_dir']||'to bottom';
      result[k+'_pct']=overrides[k+'_pct']!=null?overrides[k+'_pct']:50;
    });
    return result;
  }

  // Canvas gradient helper: returns a CanvasGradient or solid color string
  function tplGradFill(ctx,theme,key,x,y,w,h){
    if(!theme[key+'_grad'])return theme[key];
    var dir=theme[key+'_dir']||'to bottom',c1=theme[key],c2=theme[key+'_c2']||c1,pct=theme[key+'_pct']!=null?theme[key+'_pct']:50;
    var x0=x,y0=y,x1=x,y1=y+h;
    if(dir==='to right'){x1=x+w;y1=y;}
    else if(dir==='to bottom right'||dir==='135deg'){x1=x+w;y1=y+h;}
    var g=ctx.createLinearGradient(x0,y0,x1,y1);
    g.addColorStop(0,c1);g.addColorStop(pct/100,c1);g.addColorStop(1,c2);
    return g;
  }

  function getOfferTheme(kind,cfg){
    var tpl=getOfferTemplate(kind,cfg);
    var colors=getTplColors(tpl,cfg,kind);
    var base={
      tpl:tpl,
      bgColor:colors.bgColor,
      titleColor:colors.titleColor,
      titleFont:'900 60px Arial Black, Arial, sans-serif',
      titleY:72,
      dateColor:'#1a1a1a',
      dateFont:'900 22px Arial, sans-serif',
      cardBg:colors.cardBg,
      cardBorder:colors.cardBorder,
      cardRadius:kind==='flyer'?32:28,
      textColor:colors.textColor,
      detailsColor:colors.detailsColor,
      footerColor:'#1a1a1a',
      tagColor:colors.tagColor,
      imgBg:colors.imgBg||colors.cardBg,
      bgColor_grad:colors.bgColor_grad,bgColor_c2:colors.bgColor_c2,bgColor_dir:colors.bgColor_dir,bgColor_pct:colors.bgColor_pct,
      imgBg_grad:colors.imgBg_grad,imgBg_c2:colors.imgBg_c2,imgBg_dir:colors.imgBg_dir,imgBg_pct:colors.imgBg_pct,
      showTexture:cfg.showTexture
    };
    if(tpl==='minimal-clean'){
      base.dateColor='#374151';base.cardRadius=kind==='flyer'?20:18;
      base.showTexture=false;base.titleFont='900 54px Arial Black, Arial, sans-serif';
    }else if(tpl==='dark-modern'){
      base.dateColor='#93c5fd';base.footerColor='#e5e7eb';
      base.showTexture=false;base.titleFont='900 56px Arial Black, Arial, sans-serif';
    }else if(tpl==='organic-market'){
      base.dateColor='#7a6a55';base.footerColor='#6b5b48';
      base.cardRadius=kind==='flyer'?36:30;base.titleFont='900 58px Arial, sans-serif';
    }else if(tpl==='bold-poster'){
      base.dateColor='#7c2d12';base.footerColor='#7c2d12';
      base.cardRadius=kind==='flyer'?24:22;base.titleFont='900 62px Arial Black, Arial, sans-serif';
    }else if(tpl==='modern-magazine'){
      base.dateColor='#4b5f45';base.footerColor='#4e5f47';
      base.cardRadius=kind==='flyer'?34:30;base.titleFont='900 56px Arial Black, Arial, sans-serif';
      base.showTexture=false;
    }
    return base;
  }

  // ── Einzelflyer Generator (A4 pro Artikel) ──
  function wrapTextCMS(ctx,text,maxW){
    if(!text)return[''];
    var words=text.split(' '),lines=[],line='';
    words.forEach(function(w){var test=line?line+' '+w:w;if(ctx.measureText(test).width>maxW&&line){lines.push(line);line=w;}else{line=test;}});
    if(line)lines.push(line);return lines;
  }

  // ── Preisschild-Form zeichnen (centered at 0,0) ──
  function drawTagShapePath(ctx,w,h,shape,radius){
    var hw=w/2,hh=h/2,r=Math.min(radius,hw,hh);
    ctx.beginPath();
    if(shape==='circle'){
      var cr=Math.max(hw,hh);
      ctx.arc(0,0,cr,0,Math.PI*2);
    }else if(shape==='pill'){
      var pr=hh;
      ctx.moveTo(-hw+pr,   -hh);ctx.lineTo(hw-pr, -hh);
      ctx.arc(hw-pr, 0, pr, -Math.PI/2, Math.PI/2);
      ctx.lineTo(-hw+pr, hh);
      ctx.arc(-hw+pr, 0, pr, Math.PI/2, -Math.PI/2);
    }else if(shape==='banner'){
      var notch=hw*0.12;
      ctx.moveTo(-hw,-hh);ctx.lineTo(hw,-hh);ctx.lineTo(hw,hh);
      ctx.lineTo(0,hh-notch);ctx.lineTo(-hw,hh);
    }else if(shape==='star'){
      var spikes=5,outerR=Math.max(hw,hh),innerR=outerR*0.5;
      var rot=Math.PI/2*3,step=Math.PI/spikes;
      ctx.moveTo(0,-outerR);
      for(var si=0;si<spikes;si++){
        ctx.lineTo(Math.cos(rot)*outerR,Math.sin(rot)*outerR);rot+=step;
        ctx.lineTo(Math.cos(rot)*innerR,Math.sin(rot)*innerR);rot+=step;
      }
    }else if(shape==='hexagon'){
      for(var hi=0;hi<6;hi++){
        var ha=Math.PI/3*hi-Math.PI/6;
        var hx=hw*Math.cos(ha),hy=hh*Math.sin(ha);
        if(hi===0)ctx.moveTo(hx,hy);else ctx.lineTo(hx,hy);
      }
    }else if(shape==='diamond'){
      ctx.moveTo(0,-hh);ctx.lineTo(hw,0);ctx.lineTo(0,hh);ctx.lineTo(-hw,0);
    }else if(shape==='ticket'){
      var tn=hh*0.22;
      ctx.moveTo(-hw,-hh);ctx.lineTo(hw,-hh);ctx.lineTo(hw,-tn);
      ctx.arc(hw,0,tn,Math.PI*1.5,Math.PI*0.5,true);
      ctx.lineTo(hw,hh);ctx.lineTo(-hw,hh);ctx.lineTo(-hw,tn);
      ctx.arc(-hw,0,tn,Math.PI*0.5,Math.PI*1.5,true);
    }else if(shape==='explosion'){
      var eSpikes=12,eOuter=Math.max(hw,hh),eInner=eOuter*0.72;
      var eRot=-Math.PI/2,eStep=Math.PI/eSpikes;
      ctx.moveTo(Math.cos(eRot)*eOuter,Math.sin(eRot)*eOuter);
      for(var ei=0;ei<eSpikes;ei++){
        eRot+=eStep;ctx.lineTo(Math.cos(eRot)*eInner,Math.sin(eRot)*eInner);
        eRot+=eStep;ctx.lineTo(Math.cos(eRot)*eOuter,Math.sin(eRot)*eOuter);
      }
    }else if(shape==='trapez'){
      var tInset=hw*0.22;
      ctx.moveTo(-hw,-hh);ctx.lineTo(hw,-hh);ctx.lineTo(hw-tInset,hh);ctx.lineTo(-hw+tInset,hh);
    }else if(shape==='rounded'||r>0){
      var rr=shape==='rounded'?Math.min(16,hw,hh):r;
      ctx.moveTo(-hw+rr,-hh);ctx.lineTo(hw-rr,-hh);ctx.quadraticCurveTo(hw,-hh,hw,-hh+rr);
      ctx.lineTo(hw,hh-rr);ctx.quadraticCurveTo(hw,hh,hw-rr,hh);
      ctx.lineTo(-hw+rr,hh);ctx.quadraticCurveTo(-hw,hh,-hw,hh-rr);
      ctx.lineTo(-hw,-hh+rr);ctx.quadraticCurveTo(-hw,-hh,-hw+rr,-hh);
    }else{
      ctx.rect(-hw,-hh,w,h);
    }
    ctx.closePath();
  }
  function fillTagShape(ctx,w,h,cfg){
    drawTagShapePath(ctx,w,h,cfg.tagShape||'rect',cfg.tagRadius||0);
    ctx.fill();
  }

  function generateEinzelflyer(item,data,cfgOverride){
    return new Promise(function(resolve){
      var W=794,H=1123;
      var cfg=cfgForKind(cfgOverride||cfgGet(),'flyer');
      var theme=getOfferTheme('flyer',cfg);
      var c=document.createElement('canvas');c.width=W;c.height=H;
      var ctx=c.getContext('2d');
      // ── Papier-Hintergrund (gleicher Stil wie Plakat) ──
      ctx.fillStyle=tplGradFill(ctx,theme,'bgColor',0,0,W,H);ctx.fillRect(0,0,W,H);
      if(theme.showTexture){ctx.globalAlpha=0.04;
      for(var ty=0;ty<1123;ty+=3){for(var tx=0;tx<794;tx+=3){
        if(Math.random()>0.5){ctx.fillStyle=Math.random()>0.5?'#000':'#fff';ctx.fillRect(tx,ty,2,2);}
      }}}
      ctx.globalAlpha=1.0;
      // ── Hilfsfunktion runde Ecken ──
      function rrect(rx,ry,rw,rh,r){
        ctx.beginPath();ctx.moveTo(rx+r,ry);ctx.lineTo(rx+rw-r,ry);ctx.quadraticCurveTo(rx+rw,ry,rx+rw,ry+r);
        ctx.lineTo(rx+rw,ry+rh-r);ctx.quadraticCurveTo(rx+rw,ry+rh,rx+rw-r,ry+rh);
        ctx.lineTo(rx+r,ry+rh);ctx.quadraticCurveTo(rx,ry+rh,rx,ry+rh-r);
        ctx.lineTo(rx,ry+r);ctx.quadraticCurveTo(rx,ry,rx+r,ry);ctx.closePath();
      }
      // ── Blatt-Deko ──
      function drawLeaf(lx,ly,sz){
        ctx.save();ctx.globalAlpha=1.0;ctx.fillStyle=cfg.leafColor;
        ctx.translate(lx,ly);ctx.rotate(-0.4);
        ctx.beginPath();ctx.moveTo(0,0);
        ctx.bezierCurveTo(sz*0.3,-sz*0.6,sz*0.7,-sz*0.6,sz,0);
        ctx.bezierCurveTo(sz*0.7,sz*0.6,sz*0.3,sz*0.6,0,0);ctx.fill();
        ctx.strokeStyle=cfg.leafColor;ctx.lineWidth=1;ctx.globalAlpha=0.6;
        ctx.beginPath();ctx.moveTo(0,0);ctx.lineTo(sz*0.9,0);ctx.stroke();ctx.restore();
      }
      var von=data.von?new Date(data.von).toLocaleDateString('de-DE',{day:'2-digit',month:'2-digit',year:'2-digit'}):'';
      var bis=data.bis?new Date(data.bis).toLocaleDateString('de-DE',{day:'2-digit',month:'2-digit',year:'2-digit'}):'';
      var logoLoaded=Promise.resolve();

      if(theme.tpl==='modern-magazine'){
        // ── Modern Magazine Einzelflyer: clean centered card layout ──
        ctx.fillStyle=tplGradFill(ctx,theme,'bgColor',0,0,W,H);ctx.fillRect(0,0,W,H);
        // Header bar
        ctx.fillStyle='#d6e5d0';ctx.fillRect(0,0,W,140);
        ctx.fillStyle='#8aad7e';ctx.fillRect(0,138,W,3);

        // Date right (draw first so we know its width)
        ctx.fillStyle=theme.dateColor;ctx.font='900 24px Arial Black, Arial, sans-serif';
        var dateStr=von+' \u2013 '+bis;
        var dateW=ctx.measureText(dateStr).width;
        var dateRight=W-42;
        ctx.textAlign='right';
        ctx.fillText(dateStr,dateRight,82);
        ctx.font='700 18px Arial, sans-serif';
        ctx.fillText('Gültig:',dateRight,52);
        ctx.textAlign='left';
        var dateLeftEdge=dateRight-Math.max(dateW,ctx.measureText('Gültig:').width)-16;

        // Logo + 'Angebote' dominant (capped to not overlap date)
        var mgLogoEl=document.querySelector('#cms-app img[src^="data:image"]');
        var mgLogoP=new Promise(function(rl){
          if(!mgLogoEl){rl();return;}
          var li=new Image();li.onload=function(){
            var lh=80,lw=lh*(li.width/li.height);
            var maxLogoW=180;
            if(lw>maxLogoW){lh=lh*(maxLogoW/lw);lw=maxLogoW;}
            ctx.drawImage(li,28,30,lw,lh);
            // 'Angebote' dominant next to logo, capped before date
            var titleX=28+lw+16;
            ctx.fillStyle=theme.titleColor;ctx.textAlign='left';
            var fontSize=44;
            ctx.font='900 '+fontSize+'px Arial Black, Arial, sans-serif';
            while(fontSize>24&&titleX+ctx.measureText('Angebote').width>dateLeftEdge){
              fontSize-=2;ctx.font='900 '+fontSize+'px Arial Black, Arial, sans-serif';
            }
            ctx.fillText('Angebote',titleX,78);
            rl();
          };li.onerror=function(){rl();};li.src=mgLogoEl.src;
        });

        // ── Main product card ──
        var cardMX=40, cardMY=170, cardMW=W-80, cardMH=H-170-80;
        var cardMR=20;
        function mgFlyerRR(rx,ry,rw,rh,r){
          ctx.beginPath();ctx.moveTo(rx+r,ry);ctx.lineTo(rx+rw-r,ry);ctx.quadraticCurveTo(rx+rw,ry,rx+rw,ry+r);
          ctx.lineTo(rx+rw,ry+rh-r);ctx.quadraticCurveTo(rx+rw,ry+rh,rx+rw-r,ry+rh);
          ctx.lineTo(rx+r,ry+rh);ctx.quadraticCurveTo(rx,ry+rh,rx,ry+rh-r);
          ctx.lineTo(rx,ry+r);ctx.quadraticCurveTo(rx,ry,rx+r,ry);ctx.closePath();
        }
        // Card shadow + fill
        ctx.save();ctx.shadowColor='rgba(0,0,0,0.1)';ctx.shadowBlur=12;ctx.shadowOffsetY=6;
        ctx.fillStyle=theme.cardBg;mgFlyerRR(cardMX,cardMY,cardMW,cardMH,cardMR);ctx.fill();ctx.restore();
        ctx.strokeStyle=theme.cardBorder;ctx.lineWidth=1;mgFlyerRR(cardMX,cardMY,cardMW,cardMH,cardMR);ctx.stroke();

        // Image area (top 55% of card) – fill with imgBg color
        var imgZoneH=Math.floor(cardMH*0.55);
        ctx.save();mgFlyerRR(cardMX+2,cardMY+2,cardMW-4,imgZoneH,cardMR);ctx.clip();
        ctx.fillStyle=tplGradFill(ctx,theme,'imgBg',cardMX,cardMY,cardMW,imgZoneH);ctx.fillRect(cardMX,cardMY,cardMW,imgZoneH);ctx.restore();
        var mgImgPromise=Promise.resolve();
        if(item.bild_data){
          mgImgPromise=new Promise(function(resImg){
            var img=new Image();
            img.onload=function(){
              var ofc=document.createElement('canvas');ofc.width=img.width;ofc.height=img.height;
              var ox=ofc.getContext('2d');ox.drawImage(img,0,0);
              if(cfg.imgFreistellen){
                try{var id=ox.getImageData(0,0,ofc.width,ofc.height),d=id.data;
                for(var pi=0;pi<d.length;pi+=4){if(d[pi]>cfg.imgThreshold&&d[pi+1]>cfg.imgThreshold&&d[pi+2]>cfg.imgThreshold)d[pi+3]=0;}
                ox.putImageData(id,0,0);}catch(e){}
              }
              var maxIW=cardMW-40, maxIH=imgZoneH-20;
              var scI=Math.min(maxIW/ofc.width,maxIH/ofc.height,cfg.imgMaxScale||3);
              var iw=ofc.width*scI,ih=ofc.height*scI;
              var imgX=cardMX+cardMW/2-iw/2, imgY=cardMY+10+(imgZoneH-ih)/2;
              ctx.save();mgFlyerRR(cardMX+2,cardMY+2,cardMW-4,imgZoneH,cardMR);ctx.clip();
              ctx.drawImage(ofc,imgX,imgY,iw,ih);ctx.restore();
              resImg();
            };img.onerror=function(){resImg();};img.src=item.bild_data;
          });
        }

        mgImgPromise.then(function(){
          // Savings badge top-right
          var savePct=getSavingsPercent(item);
          if(savePct){
            var bR=34;
            ctx.fillStyle=theme.tagColor;
            ctx.beginPath();ctx.arc(cardMX+cardMW-28-bR,cardMY+28+bR,bR,0,Math.PI*2);ctx.fill();
            ctx.fillStyle='#fff';ctx.textAlign='center';ctx.font='900 26px Arial Black, Arial, sans-serif';
            ctx.fillText('-'+savePct+'%',cardMX+cardMW-28-bR,cardMY+28+bR+8);
            ctx.textAlign='left';
          }

          // Divider line
          var divY=cardMY+imgZoneH+4;
          ctx.strokeStyle='#e2eade';ctx.lineWidth=1;
          ctx.beginPath();ctx.moveTo(cardMX+24,divY);ctx.lineTo(cardMX+cardMW-24,divY);ctx.stroke();

          // Text area
          var tPad=32, tY=divY+36;

          // Product name
          ctx.fillStyle=theme.textColor;ctx.font='900 42px Arial Black, Arial, sans-serif';ctx.textAlign='left';
          var pName=(item.produkt||'Produkt').trim();
          var pLines=wrapTextCMS(ctx,pName,cardMW-tPad*2).slice(0,2);
          pLines.forEach(function(l){ctx.fillText(l,cardMX+tPad,tY);tY+=50;});

          // Details
          if(item.details){
            tY+=4;
            ctx.fillStyle=theme.detailsColor;ctx.font='600 24px Arial, sans-serif';
            var dLines=wrapTextCMS(ctx,item.details,cardMW-tPad*2).slice(0,2);
            dLines.forEach(function(l){ctx.fillText(l,cardMX+tPad,tY);tY+=30;});
          }

          // Price section at bottom of card
          var priceBarY=cardMY+cardMH-100;
          ctx.fillStyle='#eaf3e6';mgFlyerRR(cardMX+24,priceBarY,cardMW-48,72,14);ctx.fill();
          ctx.strokeStyle='#c5dbbe';ctx.lineWidth=1;mgFlyerRR(cardMX+24,priceBarY,cardMW-48,72,14);ctx.stroke();

          if(item.preis){
            var pp=Number(item.preis).toFixed(2).split('.');
            ctx.fillStyle=theme.tagColor;ctx.font='900 52px Arial Black, Arial, sans-serif';
            ctx.fillText(pp[0]+','+pp[1],cardMX+40,priceBarY+52);
            var mw=ctx.measureText(pp[0]+','+pp[1]).width;
            ctx.font='700 30px Arial, sans-serif';
            ctx.fillText('\u20AC',cardMX+40+mw+6,priceBarY+48);
          }
          if(item.statt_preis){
            var uvp='statt '+Number(item.statt_preis).toFixed(2).replace('.',',')+' \u20AC';
            ctx.textAlign='right';ctx.fillStyle='#8a9e80';ctx.font='600 24px Arial, sans-serif';
            ctx.fillText(uvp,cardMX+cardMW-40,priceBarY+48);
            var uvpW=ctx.measureText(uvp).width;
            ctx.strokeStyle='#8a9e80';ctx.lineWidth=2;
            ctx.beginPath();ctx.moveTo(cardMX+cardMW-40-uvpW,priceBarY+40);ctx.lineTo(cardMX+cardMW-40,priceBarY+40);ctx.stroke();
            ctx.textAlign='left';
          }

          // Footer
          ctx.fillStyle='#8aad7e';ctx.fillRect(0,H-36,W,36);
          ctx.fillStyle='#ffffff';ctx.textAlign='center';ctx.font='600 14px Arial, sans-serif';
          ctx.fillText('*Solange Vorrat reicht \u00b7 \u00c4nderungen vorbehalten',W/2,H-12);
          ctx.textAlign='left';

          return mgLogoP.then(function(){return logoLoaded;});
        }).then(function(){
          resolve(c);
        });
        return;
      }
      // ── Header: ANGEBOT + Datum + Logo (default templates only) ──
      ctx.textAlign='left';
      ctx.fillStyle=theme.titleColor;ctx.font=theme.titleFont;
      ctx.fillText('ANGEBOT',40,theme.titleY);
      ctx.fillStyle=theme.dateColor;ctx.font=theme.dateFont;
      ctx.fillText(von+' \u2013 '+bis,44,104);
      // Logo oben rechts (capped width to avoid overlap with title)
      var logoImg=new Image();
      logoLoaded=new Promise(function(resLogo){
        logoImg.onload=function(){
          var lh=90,lw=lh*(logoImg.width/logoImg.height);
          var maxLw=W*0.35;
          if(lw>maxLw){lh=lh*(maxLw/lw);lw=maxLw;}
          ctx.drawImage(logoImg,W-lw-30,14,lw,lh);resLogo();
        };
        logoImg.onerror=function(){resLogo();};
        var hdrLogo=document.querySelector('#cms-app img[src^="data:image"]');
        logoImg.src=hdrLogo?hdrLogo.src:'/Logo-sm-64.png';
      });
      // ── Weisse Karte (grosser Bereich für Produkt) ──
      var cardX=30,cardY=130,cardW=W-60,cardH=H-130-60;
      ctx.save();
      ctx.shadowColor='rgba(0,0,0,0.06)';ctx.shadowBlur=2;ctx.shadowOffsetX=8;ctx.shadowOffsetY=8;
      ctx.fillStyle=theme.cardBg;rrect(cardX,cardY,cardW,cardH,theme.cardRadius);ctx.fill();ctx.restore();
      ctx.strokeStyle=theme.cardBorder;ctx.lineWidth=1;rrect(cardX,cardY,cardW,cardH,theme.cardRadius);ctx.stroke();
      // Blatt-Deko oben rechts auf Karte
      if(cfg.showLeaf) drawLeaf(cardX+cardW-60,cardY+36,36);
      // ── Produktname + Details auf Karte ──
      var pad=36;
      var textY=cardY+pad+28;
      ctx.fillStyle=theme.textColor;ctx.font='900 48px Arial Black, Arial, sans-serif';ctx.textAlign='left';
      var prodLines=wrapTextCMS(ctx,item.produkt||'',cardW-pad*2-40);
      prodLines.forEach(function(line){ctx.fillText(line,cardX+pad,textY);textY+=56;});
      if(item.details){
        ctx.fillStyle=theme.detailsColor;ctx.font='28px Arial, sans-serif';
        var detLines=wrapTextCMS(ctx,item.details,cardW-pad*2);
        textY+=4;detLines.forEach(function(line){ctx.fillText(line,cardX+pad,textY);textY+=34;});
      }
      // ── Bild + Preisschild: Bild zuerst (volle Fläche), dann Tag darüber ──
      var imgAreaTop=textY+6;
      var imgAreaH=cardH-(imgAreaTop-cardY)-pad-10;
      // Fill image area with imgBg color
      ctx.save();rrect(cardX,imgAreaTop,cardW,imgAreaH+pad,theme.cardRadius);ctx.clip();
      ctx.fillStyle=tplGradFill(ctx,theme,'imgBg',cardX,imgAreaTop,cardW,imgAreaH+pad);ctx.fillRect(cardX,imgAreaTop,cardW,imgAreaH+pad);ctx.restore();
      var tagSc=(cfg.tagScale||100)/100;
      var tagW=Math.round(280*tagSc),tagH=Math.round(130*tagSc);
      var tagCX=cardX+cardW-pad-tagW/2+10;
      var tagCY=imgAreaTop+tagH/2+20;
      // Bild zuerst zeichnen (nutzt gesamten verfügbaren Bereich, am unteren Rand verankert)
      var imgPromise;
      if(item.bild_data){
        imgPromise=new Promise(function(resImg){
          var img=new Image();
          img.onload=function(){
            var maxImgW=cardW*0.82,maxImgH=imgAreaH*0.82;
            var scale=Math.min(maxImgW/img.width,maxImgH/img.height,cfg.imgMaxScale);
            var iw=img.width*scale,ih=img.height*scale;
            var cx=cardX+cardW*0.38;
            var cy=imgAreaTop+imgAreaH*0.55;
            // Freistellen: weissen Hintergrund entfernen
            var ofc=document.createElement('canvas');ofc.width=img.width;ofc.height=img.height;
            var ox=ofc.getContext('2d');ox.drawImage(img,0,0);
            if(cfg.imgFreistellen){var id=ox.getImageData(0,0,ofc.width,ofc.height),d=id.data;
            for(var pi=0;pi<d.length;pi+=4){if(d[pi]>cfg.imgThreshold&&d[pi+1]>cfg.imgThreshold&&d[pi+2]>cfg.imgThreshold)d[pi+3]=0;}
            ox.putImageData(id,0,0);}
            // Clip auf Karte damit Bild nicht überragt
            ctx.save();rrect(cardX,cardY,cardW,cardH,theme.cardRadius);ctx.clip();
            var rotRad=cfg.imgRotation*Math.PI/180;
            ctx.translate(cx,cy);ctx.rotate(-rotRad);
            ctx.drawImage(ofc,-iw/2,-ih/2,iw,ih);ctx.restore();resImg();
          };
          img.onerror=function(){resImg();};img.src=item.bild_data;
        });
      }else{imgPromise=Promise.resolve();}
      // Preisschild ÜBER dem Bild zeichnen (rechts oben im Bildbereich)
      imgPromise.then(function(){
      if(item.preis){
        var savingsPct=getSavingsPercent(item);
        var preisStr=Number(item.preis).toFixed(2).split('.');
        var skewVal=cfg.tagSkew/100;
        ctx.save();
        ctx.translate(tagCX,tagCY);
        ctx.rotate(-0.05);ctx.transform(1,-skewVal,0,1,0,0);
        ctx.shadowColor='rgba(100,0,0,0.4)';ctx.shadowBlur=3;ctx.shadowOffsetX=8;ctx.shadowOffsetY=8;
        ctx.fillStyle=theme.tagColor;fillTagShape(ctx,tagW,tagH,cfg);
        ctx.restore();
        // Glanz + Preis-Text
        ctx.save();
        ctx.translate(tagCX,tagCY);
        ctx.rotate(-0.05);ctx.transform(1,-skewVal,0,1,0,0);
        var glanz=ctx.createLinearGradient(-tagW/2,-tagH/2,tagW/2,tagH/2);
        glanz.addColorStop(0,'rgba(255,255,255,0.12)');glanz.addColorStop(0.5,'rgba(255,255,255,0)');
        ctx.fillStyle=glanz;fillTagShape(ctx,tagW,tagH,cfg);
        ctx.fillStyle='#ffffff';ctx.textAlign='left';
        ctx.transform(1,skewVal,0,1,0,0);
        var fs=cfg.priceFontFlyer,cs=Math.round(fs*0.55),es=Math.round(fs*0.35);
        var mainStr=preisStr[0]+',';var centStr=preisStr[1];
        ctx.font='900 '+fs+'px Arial Black, Arial, sans-serif';var mw=ctx.measureText(mainStr).width;
        ctx.font='900 '+cs+'px Arial Black, Arial, sans-serif';var cw=ctx.measureText(centStr).width;
        ctx.font='bold '+es+'px Arial, sans-serif';var ew=ctx.measureText('\u20AC').width;
        var tw=mw+cw+ew+4;
        if(tw>tagW-40){var sc2=(tagW-40)/tw;fs=Math.round(fs*sc2);cs=Math.round(cs*sc2);es=Math.round(es*sc2);
          ctx.font='900 '+fs+'px Arial Black, Arial, sans-serif';mw=ctx.measureText(mainStr).width;
          ctx.font='900 '+cs+'px Arial Black, Arial, sans-serif';cw=ctx.measureText(centStr).width;
          ctx.font='bold '+es+'px Arial, sans-serif';ew=ctx.measureText('\u20AC').width;tw=mw+cw+ew+4;}
        var px=-tw/2,py=fs*0.35;
        ctx.font='900 '+fs+'px Arial Black, Arial, sans-serif';ctx.fillText(mainStr,px,py);
        ctx.font='900 '+cs+'px Arial Black, Arial, sans-serif';ctx.fillText(centStr,px+mw+2,py-fs*0.3);
        ctx.font='bold '+es+'px Arial, sans-serif';ctx.fillText('\u20AC',px+mw+cw+4,py-fs*0.28);
        ctx.restore();
        // Statt-Preis unter dem Tag
        if(item.statt_preis){
          var stattStr=Number(item.statt_preis).toFixed(2).replace('.',',')+' \u20AC';
          var stFs=Math.round(26*tagSc);
          ctx.fillStyle=cfg.stattColor;ctx.font='bold '+stFs+'px Arial, sans-serif';ctx.textAlign='center';
          var tagBottom=cfg.tagShape==='explosion'?Math.max(tagW/2,tagH/2):tagH/2;
          var stattX=tagCX,stattY=tagCY+tagBottom+Math.round(42*tagSc);
          ctx.fillText(stattStr,stattX,stattY);
          var stW=ctx.measureText(stattStr).width;
          ctx.strokeStyle=theme.tagColor;ctx.lineWidth=2.5;ctx.beginPath();
          ctx.moveTo(stattX-stW/2-4,stattY-Math.round(7*tagSc));ctx.lineTo(stattX+stW/2+4,stattY-Math.round(7*tagSc));ctx.stroke();
        }
        if(savingsPct){
          drawSavingsBurst(ctx,tagCX-tagW/2+8,tagCY-tagH/2-14,Math.round(36*tagSc),Math.round(22*tagSc),'-'+savingsPct+'%','flyer');
        }
      }
        ctx.textAlign='left';
        // Footer
        ctx.fillStyle=theme.footerColor;ctx.globalAlpha=0.4;ctx.font='14px Arial, sans-serif';ctx.textAlign='center';
        ctx.fillText('*Solange Vorrat reicht',W/2,H-24);
        ctx.globalAlpha=1.0;ctx.textAlign='left';
        return logoLoaded;
      }).then(function(){resolve(c);});
    });
  }

  function showEinzelflyer(){
    if(!_currentPreviewAktion||!_currentPreviewAktion.items)return;
    var items=_currentPreviewAktion.items,data=_currentPreviewAktion;
    if(items.length===0){toast('Keine Artikel vorhanden','warn');return;}
    var isMobile=window.innerWidth<=768;
    // Desktop: open in new window; Mobile: use inline modal (window.open+document.write fails on mobile)
    var win=null;
    if(!isMobile){
      win=window.open('','_blank');
      if(!win){toast('Popup-Blocker aktiv \u2013 bitte erlauben','warn');return;}
      win.document.write('<html><head><title>Einzelflyer</title></head><body style="display:flex;justify-content:center;align-items:center;height:100vh;font-family:Segoe UI,system-ui,-apple-system,sans-serif;color:#888"><div style="text-align:center"><div style="font-size:2rem;margin-bottom:12px">\u23f3</div>Einzelflyer werden erstellt\u2026</div></body></html>');
    }
    toast('Einzelflyer werden erstellt...','ok');
    // Fetch missing images first
    var fetchPromises=items.map(function(it){
      if(it.bild_data)return Promise.resolve();
      var sc='';if(it.artikelnummer){var cc=_artikelCache.find(function(a){return a.nr===it.artikelnummer;});if(cc)sc=cc.sc||'';}
      if(!sc&&it.produkt){var cc2=_artikelCache.find(function(a){return (a.b||'').toLowerCase()===it.produkt.toLowerCase();});if(cc2)sc=cc2.sc||'';}
      if(!it.artikelnummer&&!sc)return Promise.resolve();
      return loadImageFromSharePoint(it.artikelnummer,sc).then(function(b64){if(b64)it.bild_data=b64;}).catch(function(){});
    });
    Promise.all(fetchPromises).then(function(){
      return Promise.all(items.map(function(item){return generateEinzelflyer(item,data);}));
    }).then(function(canvases){
      if(isMobile){
        // ── Mobile: render in CMS modal with print+save per flyer ──
        var mhtml='<div class="cms-modal-bg" style="align-items:flex-start;padding:0">';
        mhtml+='<div class="cms-modal" style="max-width:100%;width:100%;max-height:100vh;height:100vh;overflow-y:auto;padding:0;border-radius:0;text-align:center;font-family:Segoe UI,system-ui,-apple-system,sans-serif">';
        // Sticky toolbar
        mhtml+='<div style="position:sticky;top:0;background:#fff;padding:10px 12px;border-bottom:1px solid #e0e0e0;display:flex;gap:8px;justify-content:center;align-items:center;flex-wrap:wrap;z-index:10">';
        mhtml+='<button class="cms-btn cms-btn-primary cms-btn-sm" id="mob-flyer-print-all" style="font-size:12px">\ud83d\udda8\ufe0f Alle drucken</button>';
        mhtml+='<button class="cms-btn cms-btn-sm" id="mob-flyer-dl-all" style="font-size:12px;background:#1565c0;color:#fff;border:none">\u2b07\ufe0f Alle speichern</button>';
        mhtml+='<span style="color:#888;font-size:12px">'+canvases.length+' Flyer</span>';
        mhtml+='<button class="cms-btn cms-btn-gray cms-btn-sm" data-action="closeModal" style="font-size:12px">Schlie\u00dfen</button>';
        mhtml+='</div>';
        mhtml+='<div style="padding:8px">';
        canvases.forEach(function(cv,i){
          var dataUrl=cv.toDataURL('image/png');
          var name=items[i]?items[i].produkt||('Artikel '+(i+1)):'Artikel '+(i+1);
          var safeName=(name+'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
          mhtml+='<div class="mob-flyer-page" style="margin-bottom:16px;background:#fff;border-radius:10px;box-shadow:0 2px 12px rgba(0,0,0,0.12);overflow:hidden">';
          mhtml+='<img src="'+dataUrl+'" alt="'+safeName+'" style="width:100%;display:block" data-flyer-idx="'+i+'">';
          mhtml+='<div style="padding:8px 10px;display:flex;gap:6px;justify-content:center;align-items:center;flex-wrap:wrap;background:#f9fafb;border-top:1px solid #e5e7eb">';
          mhtml+='<button class="cms-btn cms-btn-sm" data-mob-print="'+i+'" style="font-size:11px;background:#2e7d32;color:#fff;border:none;padding:5px 12px;border-radius:6px">\ud83d\udda8\ufe0f Drucken</button>';
          mhtml+='<a href="'+dataUrl+'" download="Flyer_'+safeName.replace(/[^a-zA-Z0-9_-]/g,'_')+'.png" class="cms-btn cms-btn-sm" style="font-size:11px;background:#1565c0;color:#fff;border:none;padding:5px 12px;border-radius:6px;text-decoration:none">\u2b07\ufe0f Speichern</a>';
          mhtml+='<span style="color:#666;font-size:11px;font-weight:600">'+safeName+'</span>';
          mhtml+='</div></div>';
        });
        mhtml+='</div></div></div>';
        document.getElementById('cms-modal-wrap').innerHTML=mhtml;
        document.getElementById('cms-modal-wrap').style.display='';
        // Mobile event handlers
        document.getElementById('mob-flyer-print-all').onclick=function(){
          var w=window.open('','_blank');
          if(!w){toast('Popup-Blocker aktiv','warn');return;}
          var ph='<html><head><title>Einzelflyer</title><style>@page{margin:0;size:A4 portrait}img{width:100%;page-break-after:always}body{margin:0}</style></head><body>';
          canvases.forEach(function(cv){ph+='<img src="'+cv.toDataURL('image/png')+'">';});
          ph+='</body></html>';
          w.document.write(ph);w.document.close();
          setTimeout(function(){w.print();},500);
        };
        document.getElementById('mob-flyer-dl-all').onclick=function(){
          canvases.forEach(function(cv,i){
            var nm=items[i]?items[i].produkt||('Artikel_'+(i+1)):'Artikel_'+(i+1);
            var a=document.createElement('a');a.href=cv.toDataURL('image/png');a.download='Flyer_'+nm.replace(/[^a-zA-Z0-9_-]/g,'_')+'.png';a.click();
          });
          toast(canvases.length+' Flyer heruntergeladen','ok');
        };
        document.querySelectorAll('[data-mob-print]').forEach(function(btn){
          btn.onclick=function(){
            var idx=parseInt(btn.getAttribute('data-mob-print'));
            var w=window.open('','_blank');
            if(!w){toast('Popup-Blocker aktiv','warn');return;}
            w.document.write('<html><head><title>Einzelflyer</title><style>@page{margin:0;size:A4 portrait}img{width:100%}body{margin:0}</style></head><body><img src="'+canvases[idx].toDataURL('image/png')+'"></body></html>');
            w.document.close();
            setTimeout(function(){w.print();},500);
          };
        });
      }else{
        // ── Desktop: write to popup window ──
        var html='<html><head><title>Einzelflyer</title><style>'
          +'@page{margin:0;size:A4 portrait}'
          +'@media print{.no-print{display:none!important}.flyer-page{page-break-after:always;page-break-inside:avoid}}'
          +'body{margin:0;font-family:\'Segoe UI\',system-ui,-apple-system,sans-serif;background:#f5f5f5}'
          +'.toolbar{position:sticky;top:0;background:#fff;padding:12px 24px;border-bottom:1px solid #e0e0e0;display:flex;gap:12px;z-index:10;align-items:center}'
          +'.toolbar button{padding:8px 20px;border-radius:8px;border:none;font-weight:600;cursor:pointer;font-size:14px}'
          +'.btn-print{background:#2e7d32;color:#fff}'
          +'.btn-dl{background:#1565c0;color:#fff}'
          +'.btn-close{background:#eee;color:#333}'
          +'.flyer-page{max-width:794px;margin:20px auto;background:#fff;box-shadow:0 2px 8px rgba(0,0,0,0.1)}'
          +'.flyer-page img{width:100%;display:block}'
          +'</style></head><body>'
          +'<div class="toolbar no-print">'
          +'<button class="btn-print" data-act="print-all">\ud83d\udda8\ufe0f Alle drucken</button>'
          +'<span style="color:#888;font-size:13px">'+canvases.length+' Flyer</span>'
          +'<button class="btn-close" data-act="close">Schlie\u00dfen</button>'
          +'</div>';
        canvases.forEach(function(cv,i){
          var dataUrl=cv.toDataURL('image/png');
          var name=items[i]?items[i].produkt||('Artikel '+(i+1)):'Artikel '+(i+1);
          var safeName=(name+'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
          html+='<div class="flyer-page"><img src="'+dataUrl+'" alt="'+safeName+'">'
            +'<div class="no-print" style="text-align:center;padding:8px;display:flex;gap:8px;justify-content:center;align-items:center">'
            +'<button class="btn-print" data-act="print" data-idx="'+i+'" style="padding:6px 16px;border-radius:6px;border:none;background:#2e7d32;color:#fff;font-size:13px;cursor:pointer">\ud83d\udda8\ufe0f Drucken</button>'
            +'<button class="btn-dl" data-act="dl" data-idx="'+i+'" data-name="'+safeName+'" style="padding:6px 16px;border-radius:6px;border:none;background:#1565c0;color:#fff;font-size:13px;cursor:pointer">\u2b07\ufe0f Speichern</button>'
            +'<span style="color:#888;font-size:12px">'+safeName+'</span>'
            +'</div></div>';
        });
        html+='</body></html>';
        win.document.open();
        win.document.write(html);
        win.document.close();

        // Handlers im Popup-Fenster registrieren (Inline-onclick wird ggf. von CSP blockiert)
        var attach=function(){
          var doc=win.document;
          function sanitize(s){return (s||'flyer').replace(/[\\/:*?"<>|]+/g,'_').replace(/\s+/g,'_').substring(0,80);}
          function printOne(idx){
            var imgs=doc.querySelectorAll('.flyer-page img');
            if(!imgs[idx])return;
            var src=imgs[idx].src;
            var w=win.open('','_blank');
            if(!w){win.alert('Popup-Blocker aktiv! Bitte Popups erlauben.');return;}
            var d=w.document;
            d.open();
            d.write('<html><head><title>Flyer drucken</title><style>@page{margin:10mm}body{margin:0;display:flex;justify-content:center;align-items:flex-start}img{max-width:100%;height:auto}</style></head><body><img id="pi"></body></html>');
            d.close();
            var pi=d.getElementById('pi');
            pi.onload=function(){setTimeout(function(){try{w.focus();w.print();}catch(e){}},300);};
            pi.src=src;
          }
          function dlOne(idx,name){
            var imgs=doc.querySelectorAll('.flyer-page img');
            if(!imgs[idx])return;
            var a=doc.createElement('a');
            a.href=imgs[idx].src;
            a.download='Flyer_'+sanitize(name||('Artikel_'+(idx+1)))+'.png';
            doc.body.appendChild(a);
            a.click();
            setTimeout(function(){doc.body.removeChild(a);},100);
          }
          doc.addEventListener('click',function(ev){
            var t=ev.target;
            while(t && t!==doc && !t.getAttribute){t=t.parentNode;}
            if(!t||!t.getAttribute)return;
            var act=t.getAttribute('data-act');
            if(!act)return;
            ev.preventDefault();
            if(act==='print-all'){try{win.focus();win.print();}catch(e){}}
            else if(act==='close'){win.close();}
            else if(act==='print'){printOne(parseInt(t.getAttribute('data-idx'),10)||0);}
            else if(act==='dl'){dlOne(parseInt(t.getAttribute('data-idx'),10)||0,t.getAttribute('data-name'));}
          });
        };
        if(win.document.readyState==='complete'){attach();}
        else{win.addEventListener('load',attach);setTimeout(attach,500);}
      }
    }).catch(function(e){toast('Fehler: '+e.message,'error');});
  }

  function truncText(ctx,text,maxW){
    if(ctx.measureText(text).width<=maxW)return text;
    while(text.length>0&&ctx.measureText(text+'...').width>maxW)text=text.slice(0,-1);
    return text+'...';
  }

  function loadItemImage(bildData){
    return new Promise(function(resolve){
      if(!bildData){resolve(null);return;}
      var img=new Image();
      if(bildData.indexOf('data:')!==0)img.crossOrigin='anonymous';
      img.onload=function(){resolve(img);};
      img.onerror=function(){resolve(null);};
      img.src=bildData;
    });
  }

  function getSavingsPercent(item){
    var preis=Number(item&&item.preis),statt=Number(item&&item.statt_preis);
    if(!isFinite(preis)||!isFinite(statt)||statt<=0||preis<=0||preis>=statt)return null;
    var pct=Math.round((1-(preis/statt))*100);
    return pct>0?pct:null;
  }

  function getSavingsBurstTheme(cfgOverride){
    var style='harmonie';
    try{
      var cfg=cfgOverride||cfgGet();
      style=(cfg&&cfg.savingsPalette?cfg.savingsPalette:(cfg&&cfg.savingsStarStyle?cfg.savingsStarStyle:(localStorage.getItem('dl_savings_star_style')||'harmonie'))).toLowerCase();
    }catch(e){
      try{style=(localStorage.getItem('dl_savings_star_style')||'harmonie').toLowerCase();}catch(_e){}
    }
    if(style==='classic-red'||style==='red'||style==='classic'){
      return {name:'classic-red',g1:'#ff4b3a',g2:'#e11d1d',stroke:'rgba(255,255,255,0.65)',text:'#ffffff',textStroke:'rgba(0,0,0,0.3)'};
    }
    if(style==='warm-copper'||style==='copper'||style==='warm'){
      return {name:'warm-copper',g1:'#c77b3e',g2:'#9a5a2c',stroke:'rgba(255,244,220,0.7)',text:'#fff7ea',textStroke:'rgba(56,31,17,0.35)'};
    }
    if(style==='berry-purple'||style==='purple'||style==='berry'){
      return {name:'berry-purple',g1:'#8b5cf6',g2:'#6d28d9',stroke:'rgba(243,232,255,0.8)',text:'#ffffff',textStroke:'rgba(49,18,107,0.35)'};
    }
    if(style==='ocean-blue'||style==='blue'||style==='ocean'){
      return {name:'ocean-blue',g1:'#38bdf8',g2:'#0369a1',stroke:'rgba(224,242,254,0.8)',text:'#ffffff',textStroke:'rgba(8,47,73,0.38)'};
    }
    if(style==='sunset-orange'||style==='orange'||style==='sunset'){
      return {name:'sunset-orange',g1:'#fb923c',g2:'#c2410c',stroke:'rgba(255,237,213,0.8)',text:'#ffffff',textStroke:'rgba(67,20,7,0.35)'};
    }
    if(style==='fresh-lime'||style==='lime'||style==='fresh'){
      return {name:'fresh-lime',g1:'#a3e635',g2:'#4d7c0f',stroke:'rgba(236,252,203,0.8)',text:'#ffffff',textStroke:'rgba(26,46,5,0.38)'};
    }
    if(style==='deep-rose'||style==='rose'||style==='deep'){
      return {name:'deep-rose',g1:'#fb7185',g2:'#be123c',stroke:'rgba(255,228,230,0.8)',text:'#ffffff',textStroke:'rgba(76,5,25,0.35)'};
    }
    if(style==='midnight-gold'||style==='gold'||style==='midnight'){
      return {name:'midnight-gold',g1:'#fbbf24',g2:'#b45309',stroke:'rgba(254,243,199,0.8)',text:'#ffffff',textStroke:'rgba(69,26,3,0.4)'};
    }
    if(style==='arctic-teal'||style==='teal'||style==='arctic'){
      return {name:'arctic-teal',g1:'#2dd4bf',g2:'#0f766e',stroke:'rgba(204,251,241,0.8)',text:'#ffffff',textStroke:'rgba(4,47,46,0.38)'};
    }
    return {name:'harmonie',g1:'#72b38b',g2:'#3e7f61',stroke:'rgba(255,255,255,0.65)',text:'#ffffff',textStroke:'rgba(0,0,0,0.28)'};
  }

  function getSavingsMarkerType(cfgOverride){
    try{var c=cfgOverride||cfgGet();return (c&&c.savingsMarkerType?c.savingsMarkerType:'starburst');}catch(e){return 'starburst';}
  }

  window.cmsSetSavingsStarStyle=function(style){
    var allowed={'harmonie':1,'classic-red':1,'warm-copper':1,'berry-purple':1,'ocean-blue':1,'sunset-orange':1,'fresh-lime':1,'deep-rose':1,'midnight-gold':1,'arctic-teal':1};
    if(!allowed[style]){toast('Ungültiger Stil.','warn');return;}
    try{localStorage.setItem('dl_savings_star_style',style);}catch(e){}
    var sel=document.getElementById('cfg-savingsStarStyle');if(sel)sel.value=style;
    var sel2=document.getElementById('cfg-savingsPalette');if(sel2)sel2.value=style;
    toast('Stern-Stil gesetzt: '+style,'ok');
    if(typeof _currentPreviewAktion!=='undefined'&&_currentPreviewAktion&&_currentPreviewAktion.aktion_id){
      setTimeout(function(){try{cmsPreviewAktion(_currentPreviewAktion.aktion_id);}catch(e){}},120);
    }
  };

  function drawSavingsBurst(ctx,cx,cy,outerR,innerR,text,contextType,cfgOverride){
    var th=getSavingsBurstTheme(cfgOverride);
    var markerType=getSavingsMarkerType(cfgOverride);
    var scaleFactor=1;
    try{
      var c=cfgOverride||cfgGet();
      var key=(contextType==='flyer')?'savingsScaleFlyer':'savingsScalePlakat';
      scaleFactor=Math.max(0.8,Math.min(1.8,(Number(c[key])||100)/100));
    }catch(e){}
    outerR*=scaleFactor;innerR*=scaleFactor;
    var spikes=10;
    var rot=-Math.PI/2;
    var step=Math.PI/spikes;
    ctx.save();
    if(markerType==='badge'){
      ctx.beginPath();ctx.arc(cx,cy,outerR,0,Math.PI*2);ctx.closePath();
    }else if(markerType==='pill'){
      var pw=outerR*2.3,ph=outerR*1.15,pr=ph/2;
      ctx.beginPath();
      ctx.moveTo(cx-pw/2+pr,cy-ph/2);
      ctx.lineTo(cx+pw/2-pr,cy-ph/2);
      ctx.quadraticCurveTo(cx+pw/2,cy-ph/2,cx+pw/2,cy-ph/2+pr);
      ctx.lineTo(cx+pw/2,cy+ph/2-pr);
      ctx.quadraticCurveTo(cx+pw/2,cy+ph/2,cx+pw/2-pr,cy+ph/2);
      ctx.lineTo(cx-pw/2+pr,cy+ph/2);
      ctx.quadraticCurveTo(cx-pw/2,cy+ph/2,cx-pw/2,cy+ph/2-pr);
      ctx.lineTo(cx-pw/2,cy-ph/2+pr);
      ctx.quadraticCurveTo(cx-pw/2,cy-ph/2,cx-pw/2+pr,cy-ph/2);
      ctx.closePath();
    }else if(markerType==='flag'){
      var fw=outerR*2.2,fh=outerR*1.25;
      ctx.translate(cx,cy);ctx.rotate(-0.14);
      ctx.beginPath();
      ctx.moveTo(-fw/2,-fh/2);
      ctx.lineTo(fw/2-10,-fh/2);
      ctx.lineTo(fw/2,0);
      ctx.lineTo(fw/2-10,fh/2);
      ctx.lineTo(-fw/2,fh/2);
      ctx.closePath();
      cx=0;cy=0;
    }else if(markerType==='hexburst'){
      var hSpikes=6,hRot=-Math.PI/2,hStep=Math.PI/hSpikes,hInner=outerR*0.7;
      ctx.beginPath();
      for(var hi=0;hi<hSpikes;hi++){
        ctx.lineTo(cx+Math.cos(hRot)*outerR,cy+Math.sin(hRot)*outerR);hRot+=hStep;
        ctx.lineTo(cx+Math.cos(hRot)*hInner,cy+Math.sin(hRot)*hInner);hRot+=hStep;
      }
      ctx.closePath();
    }else if(markerType==='diamond'){
      ctx.beginPath();
      ctx.moveTo(cx,cy-outerR);ctx.lineTo(cx+outerR*0.75,cy);
      ctx.lineTo(cx,cy+outerR);ctx.lineTo(cx-outerR*0.75,cy);
      ctx.closePath();
    }else if(markerType==='shield'){
      ctx.beginPath();
      ctx.moveTo(cx-outerR*0.8,cy-outerR*0.85);
      ctx.lineTo(cx+outerR*0.8,cy-outerR*0.85);
      ctx.lineTo(cx+outerR*0.8,cy+outerR*0.15);
      ctx.quadraticCurveTo(cx+outerR*0.8,cy+outerR*0.7,cx,cy+outerR);
      ctx.quadraticCurveTo(cx-outerR*0.8,cy+outerR*0.7,cx-outerR*0.8,cy+outerR*0.15);
      ctx.closePath();
    }else if(markerType==='ribbon'){
      var rw=outerR*2.4,rh=outerR*1.1,rNotch=outerR*0.25;
      ctx.translate(cx,cy);
      ctx.beginPath();
      ctx.moveTo(-rw/2,  -rh/2);
      ctx.lineTo( rw/2,  -rh/2);
      ctx.lineTo( rw/2,   rh/2);
      ctx.lineTo( 0,      rh/2-rNotch);
      ctx.lineTo(-rw/2,   rh/2);
      ctx.closePath();
      cx=0;cy=0;
    }else if(markerType==='explosion'){
      var eSpikes=16,eRot=-Math.PI/2,eStep=Math.PI/eSpikes,eInner=outerR*0.78;
      ctx.beginPath();
      for(var ei=0;ei<eSpikes;ei++){
        ctx.lineTo(cx+Math.cos(eRot)*outerR,cy+Math.sin(eRot)*outerR);eRot+=eStep;
        ctx.lineTo(cx+Math.cos(eRot)*eInner,cy+Math.sin(eRot)*eInner);eRot+=eStep;
      }
      ctx.closePath();
    }else if(markerType==='heart'){
      ctx.translate(cx,cy);
      var hs=outerR*0.62;
      ctx.beginPath();
      ctx.moveTo(0,hs*0.6);
      ctx.bezierCurveTo(-hs*0.1,hs*0.3,-hs*1.1,-hs*0.3,-hs*0.0,-hs*0.85);
      ctx.bezierCurveTo(hs*0.5,-hs*1.3,hs*0.8,-hs*0.7,hs*0.5,-hs*0.2);
      ctx.bezierCurveTo(hs*0.5,-hs*0.2,hs*0.2,hs*0.2,0,hs*0.6);
      ctx.closePath();
      cx=0;cy=0;
    }else{
      ctx.beginPath();
      for(var i=0;i<spikes;i++){
        var x1=cx+Math.cos(rot)*outerR, y1=cy+Math.sin(rot)*outerR;
        ctx.lineTo(x1,y1);rot+=step;
        var x2=cx+Math.cos(rot)*innerR, y2=cy+Math.sin(rot)*innerR;
        ctx.lineTo(x2,y2);rot+=step;
      }
      ctx.closePath();
    }
    var g=ctx.createLinearGradient(cx-outerR,cy-outerR,cx+outerR,cy+outerR);
    g.addColorStop(0,th.g1);
    g.addColorStop(1,th.g2);
    ctx.fillStyle=g;
    ctx.shadowColor='rgba(0,0,0,0.18)';ctx.shadowBlur=3;ctx.shadowOffsetX=2;ctx.shadowOffsetY=3;
    ctx.fill();
    // feiner Rand für bessere Lesbarkeit
    ctx.lineWidth=Math.max(1,Math.round(outerR*0.08));
    ctx.strokeStyle=th.stroke;
    ctx.stroke();
    ctx.shadowColor='transparent';
    var label=String(text||'');
    if(label.charAt(0)==='-') label='−'+label.slice(1); // typografisches Minus
    if(label.charAt(0)!=='−') label='−'+label;
    ctx.fillStyle=th.text;
    ctx.textAlign='center';
    ctx.font='900 '+Math.round(outerR*0.74)+'px Arial Black, Arial, sans-serif';
    var ty=cy+Math.round(outerR*0.26);
    ctx.lineWidth=Math.max(2,Math.round(outerR*0.11));
    ctx.strokeStyle=th.textStroke;
    ctx.strokeText(label,cx,ty);
    ctx.fillText(label,cx,ty);
    ctx.restore();
  }

  function generateAngebotPlakat(data,callback,cfgOverride){
    var items=data.items||[];
    // Fetch missing images via Server Logic before drawing
    var fetchPromises=items.map(function(it){
      if(it.bild_data) return Promise.resolve();
      var sc='';if(it.artikelnummer){var cc=_artikelCache.find(function(a){return a.nr===it.artikelnummer;});if(cc)sc=cc.sc||'';}
      if(!sc&&it.produkt){var cc2=_artikelCache.find(function(a){return (a.b||'').toLowerCase()===it.produkt.toLowerCase();});if(cc2)sc=cc2.sc||'';}
      if(!it.artikelnummer&&!sc) return Promise.resolve();
      return loadImageFromSharePoint(it.artikelnummer,sc).then(function(b64){
        if(b64) it.bild_data=b64;
      }).catch(function(){});
    });
    Promise.all(fetchPromises).then(function(){
      // Pre-load all images into Image objects for canvas drawing
      var imgPromises=items.map(function(it){return loadItemImage(it.bild_data);});
      return Promise.all(imgPromises);
    }).then(function(images){
      drawAngebotPlakat(data,items,images,callback,cfgOverride);
    });
  }

  function drawAngebotPlakat(data,items,images,callback,cfgOverride){
    var cols=2,maxRows=3,perPage=maxRows*cols;
    var W=794,H=1123;
    var cfg=cfgForKind(cfgOverride||cfgGet(),'plakat');
    var theme=getOfferTheme('plakat',cfg);
    var headerH=130,footerH=36,cardGap=18,cardPad=22;
    var gridTop=headerH+10,gridBot=H-footerH-10;
    var gridW=W-40,gridH=gridBot-gridTop;
    var cellW=Math.floor((gridW-cardGap)/cols);
    var cellH=Math.floor((gridH-(maxRows-1)*cardGap)/maxRows);
    var c=document.createElement('canvas');c.width=W;c.height=H;
    var ctx=c.getContext('2d');

    if(theme.tpl==='modern-magazine'){
      // ── Modern Magazine: Clean grid card layout ──
      ctx.fillStyle=tplGradFill(ctx,theme,'bgColor',0,0,W,H);ctx.fillRect(0,0,W,H);

      // Header bar
      ctx.fillStyle='#d6e5d0';ctx.fillRect(0,0,W,140);
      // Thin accent line
      ctx.fillStyle='#8aad7e';ctx.fillRect(0,138,W,3);

      // Date right (draw first so we know its width)
      var vonTxt=data.von?new Date(data.von).toLocaleDateString('de-DE',{day:'2-digit',month:'2-digit',year:'2-digit'}):'';
      var bisTxt=data.bis?new Date(data.bis).toLocaleDateString('de-DE',{day:'2-digit',month:'2-digit',year:'2-digit'}):'';
      ctx.fillStyle=theme.dateColor;ctx.font='900 24px Arial Black, Arial, sans-serif';
      var mgDateStr=vonTxt+' \u2013 '+bisTxt;
      var mgDateW=ctx.measureText(mgDateStr).width;
      var mgDateRight=W-30;
      ctx.textAlign='right';
      ctx.fillText(mgDateStr,mgDateRight,82);
      ctx.font='700 18px Arial, sans-serif';
      ctx.fillText('G\u00fcltig:',mgDateRight,52);
      ctx.textAlign='left';
      var mgDateLeftEdge=mgDateRight-Math.max(mgDateW,ctx.measureText('G\u00fcltig:').width)-16;

      // Logo + store name left (capped to not overlap date)
      var logoEl=document.querySelector('#cms-app img[src^="data:image"]');
      var logoP=new Promise(function(rl){
        if(!logoEl){rl();return;}
        var li=new Image();li.onload=function(){
          var lh=80,lw=lh*(li.width/li.height);
          var maxLogoW=180;
          if(lw>maxLogoW){lh=lh*(maxLogoW/lw);lw=maxLogoW;}
          ctx.drawImage(li,28,30,lw,lh);
          // 'Angebote' dominant next to logo, capped before date
          var titleX=28+lw+16;
          ctx.fillStyle=theme.titleColor;ctx.textAlign='left';
          var fontSize=44;
          ctx.font='900 '+fontSize+'px Arial Black, Arial, sans-serif';
          while(fontSize>24&&titleX+ctx.measureText('Angebote').width>mgDateLeftEdge){
            fontSize-=2;ctx.font='900 '+fontSize+'px Arial Black, Arial, sans-serif';
          }
          ctx.fillText('Angebote',titleX,78);
          rl();
        };
        li.onerror=function(){rl();};
        li.src=logoEl.src;
      });

      // ── Prepare items (sort by savings, max 6) ──
      var renderPairs=(items||[]).map(function(it,idx){
        var sp=getSavingsPercent(it);
        return {it:it,img:(images&&images[idx])?images[idx]:null,sp:(sp==null?-1:sp),idx:idx};
      });
      renderPairs.sort(function(a,b){return b.sp!==a.sp?b.sp-a.sp:a.idx-b.idx;});
      renderPairs=renderPairs.slice(0,6);
      var renderItems=renderPairs.map(function(p){return p.it;});
      var renderImages=renderPairs.map(function(p){return p.img;});

      // ── 2x3 Grid cards ──
      var mgCols=2, mgRows=3;
      var mgGap=16, mgPadX=24, mgPadTop=156, mgPadBot=50;
      var mgCellW=Math.floor((W-mgPadX*2-mgGap)/mgCols);
      var mgCellH=Math.floor((H-mgPadTop-mgPadBot-(mgRows-1)*mgGap)/mgRows);
      var mgRad=16;

      function mgRRect(rx,ry,rw,rh,r){
        ctx.beginPath();ctx.moveTo(rx+r,ry);ctx.lineTo(rx+rw-r,ry);ctx.quadraticCurveTo(rx+rw,ry,rx+rw,ry+r);
        ctx.lineTo(rx+rw,ry+rh-r);ctx.quadraticCurveTo(rx+rw,ry+rh,rx+rw-r,ry+rh);
        ctx.lineTo(rx+r,ry+rh);ctx.quadraticCurveTo(rx,ry+rh,rx,ry+rh-r);
        ctx.lineTo(rx,ry+r);ctx.quadraticCurveTo(rx,ry,rx+r,ry);ctx.closePath();
      }

      for(var ci=0;ci<Math.min(mgCols*mgRows,renderItems.length);ci++){
        var col=ci%mgCols, row=Math.floor(ci/mgCols);
        var cx=mgPadX+col*(mgCellW+mgGap);
        var cy=mgPadTop+row*(mgCellH+mgGap);
        var it=renderItems[ci], img=renderImages[ci];

        // Card shadow
        ctx.save();ctx.shadowColor='rgba(0,0,0,0.08)';ctx.shadowBlur=8;ctx.shadowOffsetY=4;
        ctx.fillStyle=theme.cardBg;mgRRect(cx,cy,mgCellW,mgCellH,mgRad);ctx.fill();ctx.restore();
        // Card border
        ctx.strokeStyle=theme.cardBorder;ctx.lineWidth=1;mgRRect(cx,cy,mgCellW,mgCellH,mgRad);ctx.stroke();

        var cardPadI=14;
        // Image area (top half of card) – fill with imgBg
        var imgAreaH=Math.floor(mgCellH*0.48);
        ctx.save();mgRRect(cx+2,cy+2,mgCellW-4,imgAreaH,mgRad);ctx.clip();
        ctx.fillStyle=tplGradFill(ctx,theme,'imgBg',cx,cy,mgCellW,imgAreaH);ctx.fillRect(cx,cy,mgCellW,imgAreaH);ctx.restore();
        if(img){
          var ofc=document.createElement('canvas');ofc.width=img.width;ofc.height=img.height;
          var ox=ofc.getContext('2d');ox.drawImage(img,0,0);
          if(cfg.imgFreistellen){
            try{var id=ox.getImageData(0,0,ofc.width,ofc.height),d=id.data;
            for(var pi=0;pi<d.length;pi+=4){if(d[pi]>cfg.imgThreshold&&d[pi+1]>cfg.imgThreshold&&d[pi+2]>cfg.imgThreshold)d[pi+3]=0;}
            ox.putImageData(id,0,0);}catch(e){}
          }
          var maxIW=mgCellW-cardPadI*2, maxIH=imgAreaH-10;
          var scI=Math.min(maxIW/ofc.width,maxIH/ofc.height,cfg.imgMaxScale||3);
          var iw=ofc.width*scI,ih=ofc.height*scI;
          var imgX=cx+mgCellW/2-iw/2, imgY=cy+cardPadI+(imgAreaH-ih)/2;
          ctx.save();mgRRect(cx+2,cy+2,mgCellW-4,imgAreaH,mgRad);ctx.clip();
          ctx.drawImage(ofc,imgX,imgY,iw,ih);ctx.restore();
        }

        // Savings badge top-right
        var sp=getSavingsPercent(it);
        if(sp){
          var badgeR=22;
          ctx.fillStyle=theme.tagColor;
          ctx.beginPath();ctx.arc(cx+mgCellW-cardPadI-badgeR+4,cy+cardPadI+badgeR-4,badgeR,0,Math.PI*2);ctx.fill();
          ctx.fillStyle='#fff';ctx.textAlign='center';ctx.font='900 18px Arial Black, Arial, sans-serif';
          ctx.fillText('-'+sp+'%',cx+mgCellW-cardPadI-badgeR+4,cy+cardPadI+badgeR+2);
          ctx.textAlign='left';
        }

        // Text area (bottom half)
        var textTop=cy+imgAreaH+8;

        // Product name
        ctx.fillStyle=theme.textColor;ctx.font='700 20px Arial, sans-serif';
        var nameLines=wrapTextCMS(ctx,(it&&it.produkt)||'Produkt',mgCellW-cardPadI*2).slice(0,2);
        var ny=textTop+20;
        nameLines.forEach(function(l){ctx.fillText(l,cx+cardPadI,ny);ny+=24;});

        // Details
        if(it&&it.details){
          ctx.fillStyle=theme.detailsColor;ctx.font='600 15px Arial, sans-serif';
          ctx.fillText(truncText(ctx,it.details,mgCellW-cardPadI*2),cx+cardPadI,ny+2);
          ny+=22;
        }

        // Price area at bottom of card
        var priceY=cy+mgCellH-cardPadI;
        if(it&&it.preis!=null){
          var p=Number(it.preis);
          if(isFinite(p)){
            var pp=p.toFixed(2).split('.');
            // Green price tag area
            ctx.fillStyle='#eaf3e6';mgRRect(cx+cardPadI-4,priceY-42,mgCellW-cardPadI*2+8,46,10);ctx.fill();
            ctx.strokeStyle='#c5dbbe';ctx.lineWidth=1;mgRRect(cx+cardPadI-4,priceY-42,mgCellW-cardPadI*2+8,46,10);ctx.stroke();
            // Main price
            ctx.fillStyle=theme.tagColor;ctx.font='900 34px Arial Black, Arial, sans-serif';
            ctx.fillText(pp[0]+','+pp[1],cx+cardPadI+4,priceY-6);
            ctx.font='700 20px Arial, sans-serif';
            var mw=ctx.measureText(pp[0]+','+pp[1]).width;
            ctx.fillText('\u20AC',cx+cardPadI+4+mw+4,priceY-8);
            // Statt-Preis right-aligned
            if(it.statt_preis!=null){
              var uvp=Number(it.statt_preis).toFixed(2).replace('.',',')+' \u20AC';
              ctx.textAlign='right';ctx.fillStyle='#8a9e80';ctx.font='600 17px Arial, sans-serif';
              ctx.fillText('statt '+uvp,cx+mgCellW-cardPadI,priceY-18);
              // Strikethrough
              var uvpW=ctx.measureText('statt '+uvp).width;
              ctx.strokeStyle='#8a9e80';ctx.lineWidth=1.5;
              ctx.beginPath();ctx.moveTo(cx+mgCellW-cardPadI-uvpW,priceY-23);ctx.lineTo(cx+mgCellW-cardPadI,priceY-23);ctx.stroke();
              ctx.textAlign='left';
            }
          }
        }
      }

      // Footer
      ctx.fillStyle='#8aad7e';ctx.fillRect(0,H-36,W,36);
      ctx.fillStyle='#ffffff';ctx.textAlign='center';ctx.font='600 14px Arial, sans-serif';
      ctx.fillText('*Solange Vorrat reicht \u00b7 \u00c4nderungen vorbehalten',W/2,H-12);
      ctx.textAlign='left';

      logoP.then(function(){c.toBlob(function(blob){callback(blob);},'image/png');});
      return;
    }
    // ── Papier-Hintergrund (warm beige) ──
    ctx.fillStyle=tplGradFill(ctx,theme,'bgColor',0,0,W,H);ctx.fillRect(0,0,W,H);
    // Subtile Papierstruktur simulieren
    if(theme.showTexture){ctx.globalAlpha=0.04;
    for(var ty=0;ty<H;ty+=3){for(var tx=0;tx<W;tx+=3){
      if(Math.random()>0.5){ctx.fillStyle=Math.random()>0.5?'#000':'#fff';ctx.fillRect(tx,ty,2,2);}
    }}}
    ctx.globalAlpha=1.0;
    // ── ANGEBOT Titel (rot, gross, links) ──
    ctx.textAlign='left';
    ctx.fillStyle=theme.titleColor;ctx.font=theme.titleFont;
    ctx.fillText('ANGEBOT',30,68);
    // Datum darunter
    var von=data.von?new Date(data.von).toLocaleDateString('de-DE',{day:'2-digit',month:'2-digit',year:'2-digit'}):'';
    var bis=data.bis?new Date(data.bis).toLocaleDateString('de-DE',{day:'2-digit',month:'2-digit',year:'2-digit'}):'';
    ctx.fillStyle=theme.dateColor;ctx.font=theme.dateFont;
    ctx.fillText(von+' \u2013 '+bis,34,100);
    // ── Logo oben rechts (capped width to avoid overlap with title) ──
    var logoImg=new Image();
    var logoLoaded=new Promise(function(res){
      logoImg.onload=function(){
        var lh=90,lw=lh*(logoImg.width/logoImg.height);
        var maxLw=W*0.35;
        if(lw>maxLw){lh=lh*(maxLw/lw);lw=maxLw;}
        ctx.drawImage(logoImg,W-lw-30,14,lw,lh);res();
      };
      logoImg.onerror=function(){res();};
      var hdrLogo=document.querySelector('#cms-app img[src^="data:image"]');
      logoImg.src=hdrLogo?hdrLogo.src:'/Logo-sm-64.png';
    });
    ctx.textAlign='left';
    // ── Hilfsfunktion: Runde-Ecken Rechteck ──
    function roundRect(rx,ry,rw,rh,r){
      ctx.beginPath();
      ctx.moveTo(rx+r,ry);ctx.lineTo(rx+rw-r,ry);ctx.quadraticCurveTo(rx+rw,ry,rx+rw,ry+r);
      ctx.lineTo(rx+rw,ry+rh-r);ctx.quadraticCurveTo(rx+rw,ry+rh,rx+rw-r,ry+rh);
      ctx.lineTo(rx+r,ry+rh);ctx.quadraticCurveTo(rx,ry+rh,rx,ry+rh-r);
      ctx.lineTo(rx,ry+r);ctx.quadraticCurveTo(rx,ry,rx+r,ry);ctx.closePath();
    }
    // ── Hilfsfunktion: Blatt-Deko ──
    function drawLeaf(lx,ly,sz){
      ctx.save();ctx.globalAlpha=1.0;ctx.fillStyle=cfg.leafColor;
      ctx.translate(lx,ly);ctx.rotate(-0.4);
      ctx.beginPath();ctx.moveTo(0,0);
      ctx.bezierCurveTo(sz*0.3,-sz*0.6,sz*0.7,-sz*0.6,sz,0);
      ctx.bezierCurveTo(sz*0.7,sz*0.6,sz*0.3,sz*0.6,0,0);
      ctx.fill();
      // Blattader
      ctx.strokeStyle=cfg.leafColor;ctx.lineWidth=1.5;ctx.globalAlpha=0.6;
      ctx.beginPath();ctx.moveTo(0,0);ctx.lineTo(sz*0.9,0);ctx.stroke();
      ctx.restore();
    }
    // ── Produktkarten ──
    items.forEach(function(item,i){
      if(i>=perPage) return;
      var col=i%cols,row=Math.floor(i/cols);
      var cx=20+col*(cellW+cardGap);
      var cy=gridTop+row*(cellH+cardGap);
      // Weisse Karte mit runden Ecken + Schatten
      ctx.save();
      ctx.shadowColor='rgba(0,0,0,0.06)';ctx.shadowBlur=2;ctx.shadowOffsetX=8;ctx.shadowOffsetY=8;
      ctx.fillStyle=theme.cardBg;
      roundRect(cx,cy,cellW,cellH,theme.cardRadius);ctx.fill();ctx.restore();
      // Rand
      ctx.strokeStyle=theme.cardBorder;ctx.lineWidth=1;roundRect(cx,cy,cellW,cellH,theme.cardRadius);ctx.stroke();
      // Blatt-Deko oben rechts
      if(cfg.showLeaf) drawLeaf(cx+cellW-45,cy+30,cfg.leafSize);
      // ── Produktname + Details oben ──
      var textX=cx+cardPad,textY=cy+cardPad+20;
      ctx.fillStyle=theme.textColor;ctx.font='900 24px Arial Black, Arial, sans-serif';ctx.textAlign='left';
      var nameLines=wrapTextCMS(ctx,item.produkt||'',cellW-cardPad*2-30);
      nameLines.forEach(function(ln){ctx.fillText(ln,textX,textY);textY+=28;});
      if(item.details){
        ctx.fillStyle=theme.detailsColor;ctx.font='16px Arial, sans-serif';
        ctx.fillText(truncText(ctx,item.details,cellW-cardPad*2),textX,textY+4);textY+=22;
      }
      // ── Bild links (freigestellt, gedreht, geclippt) ──
      var img=images[i];
      var imgAreaTop=textY+8;
      var imgAreaH=cellH-imgAreaTop+cy-cardPad;
      // Fill image area with imgBg color
      ctx.save();roundRect(cx,imgAreaTop,cellW,imgAreaH+cardPad,theme.cardRadius);ctx.clip();
      ctx.fillStyle=tplGradFill(ctx,theme,'imgBg',cx,imgAreaTop,cellW,imgAreaH+cardPad);ctx.fillRect(cx,imgAreaTop,cellW,imgAreaH+cardPad);ctx.restore();
      if(img){
        var maxImgW=cellW*0.52,maxImgH=imgAreaH*0.88;
        var scale=Math.min(maxImgW/img.width,maxImgH/img.height,cfg.imgMaxScale);
        var iw=img.width*scale,ih=img.height*scale;
        var imgCX=cx+cardPad+maxImgW*0.45;
        var imgCY=imgAreaTop+imgAreaH*0.5;
        // Freistellen: weissen Hintergrund entfernen
        var ofc=document.createElement('canvas');ofc.width=img.width;ofc.height=img.height;
        var ox=ofc.getContext('2d');ox.drawImage(img,0,0);
        if(cfg.imgFreistellen){try{var idat=ox.getImageData(0,0,ofc.width,ofc.height),dd=idat.data;
        for(var pp=0;pp<dd.length;pp+=4){if(dd[pp]>cfg.imgThreshold&&dd[pp+1]>cfg.imgThreshold&&dd[pp+2]>cfg.imgThreshold)dd[pp+3]=0;}
        ox.putImageData(idat,0,0);}catch(e){}}
        // Clip auf Karte, drehen, zeichnen
        var pRotRad=cfg.imgRotation*Math.PI/180*0.85;
        ctx.save();roundRect(cx,cy,cellW,cellH,theme.cardRadius);ctx.clip();
        ctx.translate(imgCX,imgCY);ctx.rotate(-pRotRad);
        ctx.drawImage(ofc,-iw/2,-ih/2,iw,ih);ctx.restore();
      }
      // ── Schräges rotes Preisschild rechts ──
      if(item.preis){
        var cardSavingsPct=getSavingsPercent(item);
        var preisStr=Number(item.preis).toFixed(2).split('.');
        var tagSc=(cfg.tagScale||100)/100;
        var tagW=Math.round(130*tagSc),tagH=Math.round(58*tagSc);
        var tagCX=cx+cellW-cardPad-tagW/2-10;
        var tagCY=imgAreaTop+imgAreaH*0.4;
        ctx.save();
        ctx.translate(tagCX,tagCY);
        var pSkew=cfg.tagSkew/100;
        ctx.rotate(-0.05);ctx.transform(1,-pSkew,0,1,0,0);
        // Dunkler Schatten
        ctx.shadowColor='rgba(100,0,0,0.4)';ctx.shadowBlur=2;ctx.shadowOffsetX=6;ctx.shadowOffsetY=6;
        ctx.fillStyle=theme.tagColor;
        fillTagShape(ctx,tagW,tagH,cfg);
        ctx.restore();
        // Glanz-Overlay
        ctx.save();
        ctx.translate(tagCX,tagCY);
        ctx.rotate(-0.05);ctx.transform(1,-pSkew,0,1,0,0);
        var glanz=ctx.createLinearGradient(-tagW/2,-tagH/2,tagW/2,tagH/2);
        glanz.addColorStop(0,'rgba(255,255,255,0.12)');glanz.addColorStop(0.5,'rgba(255,255,255,0)');
        ctx.fillStyle=glanz;fillTagShape(ctx,tagW,tagH,cfg);
        // Preis-Text im gedrehten Kontext
        ctx.fillStyle='#ffffff';ctx.textAlign='left';
        // Skew rückgängig für lesbaren Text
        ctx.transform(1,pSkew,0,1,0,0);
        var fs=cfg.priceFontPlakat,cs=Math.round(fs*0.55),es=Math.round(fs*0.35);
        ctx.font='900 '+fs+'px Arial Black, Arial, sans-serif';
        var mainStr=preisStr[0]+',';var mw=ctx.measureText(mainStr).width;
        ctx.font='900 '+cs+'px Arial Black, Arial, sans-serif';
        var centStr=preisStr[1];var cw=ctx.measureText(centStr).width;
        ctx.font='bold '+es+'px Arial, sans-serif';
        var ew=ctx.measureText('\u20AC').width;
        var tw=mw+cw+ew+3;
        if(tw>tagW-20){var sc2=(tagW-20)/tw;fs=Math.round(fs*sc2);cs=Math.round(cs*sc2);es=Math.round(es*sc2);
          ctx.font='900 '+fs+'px Arial Black, Arial, sans-serif';mw=ctx.measureText(mainStr).width;
          ctx.font='900 '+cs+'px Arial Black, Arial, sans-serif';cw=ctx.measureText(centStr).width;
          ctx.font='bold '+es+'px Arial, sans-serif';ew=ctx.measureText('\u20AC').width;tw=mw+cw+ew+3;}
        var px=-tw/2,py=fs*0.35;
        ctx.font='900 '+fs+'px Arial Black, Arial, sans-serif';ctx.fillText(mainStr,px,py);
        ctx.font='900 '+cs+'px Arial Black, Arial, sans-serif';ctx.fillText(centStr,px+mw+2,py-fs*0.3);
        ctx.font='bold '+es+'px Arial, sans-serif';ctx.fillText('\u20AC',px+mw+cw+3,py-fs*0.28);
        ctx.restore();
        // Statt-Preis unter dem Tag
        if(item.statt_preis){
          var stattStr=Number(item.statt_preis).toFixed(2).replace('.',',')+' \u20AC';
          var stFs=Math.round(16*tagSc);
          ctx.fillStyle=cfg.stattColor;ctx.font='bold '+stFs+'px Arial, sans-serif';ctx.textAlign='center';
          var tagBottom=cfg.tagShape==='explosion'?Math.max(tagW/2,tagH/2):tagH/2;
          var stattX=tagCX,stattY=tagCY+tagBottom+Math.round(30*tagSc);
          ctx.fillText(stattStr,stattX,stattY);
          var stW=ctx.measureText(stattStr).width;
          ctx.strokeStyle=theme.tagColor;ctx.lineWidth=1.5;ctx.beginPath();
          ctx.moveTo(stattX-stW/2-2,stattY-Math.round(5*tagSc));ctx.lineTo(stattX+stW/2+2,stattY-Math.round(5*tagSc));ctx.stroke();
        }
        if(cardSavingsPct){
          drawSavingsBurst(ctx,tagCX-tagW/2+6,tagCY-tagH/2-12,Math.round(24*tagSc),Math.round(15*tagSc),'-'+cardSavingsPct+'%','plakat');
        }
      }
      // Einkaufstaschen-Deko unten rechts
      if(cfg.showBag){ctx.save();ctx.globalAlpha=1.0;ctx.font='36px Arial, sans-serif';ctx.textAlign='right';
      ctx.fillStyle=cfg.leafColor;ctx.fillText('\uD83D\uDECD',cx+cellW-cardPad+4,cy+cellH-cardPad+2);ctx.restore();}
      ctx.textAlign='left';
    });
    // ── Footer ──
    ctx.fillStyle=theme.footerColor;ctx.globalAlpha=0.5;ctx.font='11px Arial, sans-serif';ctx.textAlign='left';
    ctx.fillText('*Solange Vorrat reicht',20,H-14);ctx.textAlign='right';
    ctx.fillText('Dorfladen Oberornau \u00B7 Dorfplatz 1 \u00B7 84419 Obertaufkirchen',W-20,H-14);
    ctx.textAlign='left';ctx.globalAlpha=1.0;
    logoLoaded.then(function(){c.toBlob(function(blob){callback(blob);},'image/png');});
  }

  window.cmsShareAktion=function(aktId){
    var ak=aktionen.find(function(a){return a.aktion_id===aktId;});
    if(!ak)return;
    var von=ak.von?new Date(ak.von).toLocaleDateString('de-DE',{day:'2-digit',month:'2-digit'}):'';
    var bis=ak.bis?new Date(ak.bis).toLocaleDateString('de-DE',{day:'2-digit',month:'2-digit'}):'';
    var titel=ak.titel||'Sonderangebote';
    var msg='\ud83c\udff7\ufe0f *'+titel+'*\n_G\u00fcltig '+von+' \u2013 '+bis+'_';
    // Generate plakat image + share directly
    generateAngebotPlakat(ak,function(blob){
      shareBlob(blob,'Angebot_'+(ak.von||'aktuell')+'.png',msg);
    });
  };

  var _currentPreviewAktion=null;
  window.cmsPreviewAktion=function(aktId){
    var ak=aktionen.find(function(a){return a.aktion_id===aktId;});
    if(!ak)return;
    _currentPreviewAktion=ak;
    generateAngebotPlakat(ak,function(blob){
      showSharePreview(blob,'Angebot_'+(ak.von||'aktuell')+'.png',{showEinzelflyer:true});
    });
  };

  function ensureAngeboteForPreview(){
    if(angebote&&angebote.length) return Promise.resolve(angebote);
    return fetch(API+'/angebote')
      .then(function(r){return r.json();})
      .then(function(data){
        angebote=[];
        (data.data||[]).forEach(function(a){
          angebote.push({
            id:a.id,
            produkt:a.name||'',
            details:'',
            preis:a.price,
            statt_preis:a.old_price,
            artikelnummer:'',
            bild_data:'',
            aktion_titel:'',
            aktion_id:'',
            gueltig_von:a.valid_from?a.valid_from.substring(0,10):'',
            gueltig_bis:a.valid_to?a.valid_to.substring(0,10):'',
            sortierung:0,
            status:101001
          });
        });
        return angebote;
      })
      .catch(function(){return angebote||[];});
  }

  window.cmsPreviewOfferTpl=function(target){
    target=(target||'plakat').toLowerCase();
    ensureAngeboteForPreview().then(function(){
      var cfg=Object.assign({},cfgGet(),cfgReadUI());
      var now=new Date();
      var plus6=new Date(now.getTime()+6*86400000);
      var fallback=[
        {produkt:'Beispielprodukt 1',details:'500g',preis:2.99,statt_preis:3.99,artikelnummer:'',bild_data:''},
        {produkt:'Beispielprodukt 2',details:'450g',preis:3.49,statt_preis:4.29,artikelnummer:'',bild_data:''},
        {produkt:'Beispielprodukt 3',details:'250g',preis:1.99,statt_preis:2.49,artikelnummer:'',bild_data:''},
        {produkt:'Beispielprodukt 4',details:'1kg',preis:4.29,statt_preis:5.29,artikelnummer:'',bild_data:''},
        {produkt:'Beispielprodukt 5',details:'300g',preis:2.49,statt_preis:2.99,artikelnummer:'',bild_data:''},
        {produkt:'Beispielprodukt 6',details:'750g',preis:5.99,statt_preis:6.99,artikelnummer:'',bild_data:''}
      ];
      var src=(angebote&&angebote.length)?angebote.slice(0,6):fallback;
      var previewItems=src.map(function(a,i){
        var f=fallback[i]||fallback[0];
        return {
          produkt:(a&&a.produkt)||f.produkt,
          details:(a&&a.details)||f.details,
          preis:(a&&a.preis!=null)?a.preis:f.preis,
          statt_preis:(a&&a.statt_preis!=null)?a.statt_preis:f.statt_preis,
          artikelnummer:(a&&a.artikelnummer)||'',
          bild_data:(a&&a.bild_data)||''
        };
      });
      var data={
        von:now.toISOString().slice(0,10),
        bis:plus6.toISOString().slice(0,10),
        items:previewItems
      };
      var sample=data.items[0]||fallback[0];
      if(target==='flyer'){
        var p=Promise.resolve();
        if(!sample.bild_data){
          var sc='';if(sample.artikelnummer){var cc=_artikelCache.find(function(a){return a.nr===sample.artikelnummer;});if(cc)sc=cc.sc||'';}
          if(!sc&&sample.produkt){var cc2=_artikelCache.find(function(a){return (a.b||'').toLowerCase()===sample.produkt.toLowerCase();});if(cc2)sc=cc2.sc||'';}
          if(sample.artikelnummer||sc) p=loadImageFromSharePoint(sample.artikelnummer,sc).then(function(b64){if(b64)sample.bild_data=b64;});
        }
        p.then(function(){
          return generateEinzelflyer(sample,data,cfg).then(function(canvas){
            canvas.toBlob(function(blob){
              if(!blob){toast('Vorschau konnte nicht erzeugt werden','error');return;}
              showSharePreview(blob,'Template-Vorschau-Einzelflyer.png');
            },'image/png');
          });
        }).catch(function(e){toast('Fehler: '+(e&&e.message?e.message:e),'error');});
        return;
      }
      generateAngebotPlakat(data,function(blob){
        showSharePreview(blob,'Template-Vorschau-Plakat.png');
      },cfg);
    });
  };


  // --- Event Delegation (CSP-safe, no inline handlers) ---
  document.addEventListener('click',function(e){
    var t=e.target&&e.target.closest?e.target.closest('[data-action]'):null;
    if(!t)return;
    var act=t.getAttribute('data-action'),id=t.getAttribute('data-id');
    if(!act)return;
    switch(act){
      case 'tab':cmsTab(id);break;
      case 'cfgSubTab':cmsCfgSubTab(id);break;
      case 'weekPrev':cmsWeek(-1);break;
      case 'weekNext':cmsWeek(1);break;
      case 'weekThis':cmsWeekJump(0);break;
      case 'weekNxt':cmsWeekJump(1);break;
      case 'openAddMeal':cmsOpenAddMeal();break;
      case 'saveHours':cmsSaveHours();break;
      case 'openNewAktion':cmsOpenNewAktion();break;
      case 'editMeal':cmsEditMeal(id);break;
      case 'deleteMeal':cmsDeleteMeal(id);break;
      case 'saveMeal':cmsSaveMeal();break;
      case 'confirmDeleteMeal':cmsConfirmDelete(id);break;
      case 'closeModal':cmsCloseModal();break;
      case 'editAktion':cmsEditAktion(id);break;
      case 'deleteAktion':cmsDeleteAktion(id);break;
      case 'toggleAngItems':
        if(e.target.closest('[data-action="editAktion"],[data-action="previewAktion"],[data-action="shareAktion"],[data-action="deleteAktion"]'))break;
        var card=t.closest('.cms-card');
        if(card){
          var items=card.querySelector('.cms-ang-items');
          var chevron=card.querySelector('.cms-ang-chevron');
          if(items){
            items.classList.toggle('collapsed');
            if(chevron) chevron.classList.toggle('collapsed');
          }
        }
        break;
      case 'saveAktion':cmsSaveAktion();break;
      case 'confirmDeleteAkt':cmsConfirmDeleteAkt(id);break;
      case 'addAngRow':addAngRow();break;
      case 'removeAngRow':t.parentElement.remove();renumberAngRows();break;
      case 'addMealRow':addMealRow();break;
      case 'removeMealRow':t.parentElement.remove();break;
      case 'shareWP':cmsShareWP();break;
      case 'previewWP':cmsPreviewWP();break;
      case 'printWP':cmsPrintWP();break;
      case 'shareAktion':cmsShareAktion(id);break;
      case 'previewAktion':cmsPreviewAktion(id);break;
      case 'saveHP':saveHomepage();break;
      case 'saveHPCfg':saveHPCfg();break;
      case 'saveHPCfgSection':saveHPCfg();break;
      case 'resetHPCfg':resetHPCfg();break;
      case 'logoRemove':cmsLogoRemove();break;
      case 'pickWpHomeTpl':
        var tpl=t.getAttribute('data-value')||'classic-red';
        var sel=document.getElementById('hcfg-wpHomeTemplate');
        if(sel){sel.value=tpl;hpCfgSyncWpPreview();hpCfgSyncWpTplColors('home');}
        break;
      case 'pickWpFlyerTpl':
        var tpl2=t.getAttribute('data-value')||'classic-red';
        var sel2=document.getElementById('hcfg-wpFlyerTemplate');
        if(sel2){sel2.value=tpl2;hpCfgSyncWpFlyerPreview();hpCfgSyncWpTplColors('flyer');}
        break;
      case 'resetWpTplColors':
        resetWpTplColors(t.getAttribute('data-kind')||'home');
        break;
      case 'pickPlakatTpl':
        var pt=t.getAttribute('data-value')||'classic-red';
        var psel=document.getElementById('cfg-plakatTemplate');
        if(psel){psel.value=pt;cfgSyncOfferTplPreviews();cfgSyncTplColors('plakat');}
        break;
      case 'pickFlyerTpl':
        var ft=t.getAttribute('data-value')||'classic-red';
        var fsel=document.getElementById('cfg-flyerTemplate');
        if(fsel){fsel.value=ft;cfgSyncOfferTplPreviews();cfgSyncTplColors('flyer');}
        break;
      case 'resetTplColors':
        var rKind=t.getAttribute('data-kind')||'plakat';
        var rSelId=rKind==='flyer'?'cfg-flyerTemplate':'cfg-plakatTemplate';
        var rSel=document.getElementById(rSelId);
        var rTpl=rSel?rSel.value:'classic-red';
        var rDefaults=TPL_COLOR_DEFAULTS[rTpl]||TPL_COLOR_DEFAULTS['classic-red'];
        TPL_COLOR_KEYS.forEach(function(ck){
          var el=document.getElementById('cfg-tpl-'+rKind+'-'+ck);
          if(el)el.value=rDefaults[ck]||'#000000';
        });
        cfgSave(cfgReadUI());
        toast('Farben zur\u00fcckgesetzt','ok');
        break;
      case 'previewOfferTpl':
        cmsPreviewOfferTpl(t.getAttribute('data-target')||'plakat');
        break;
      case 'previewWpTpl':
        cmsPreviewWpTpl(t.getAttribute('data-target')||'home');
        break;
      case 'openNewNews':openNewNews();break;
      case 'editNews':editNews(id);break;
      case 'deleteNews':deleteNews(id);break;
      case 'confirmDeleteNews':confirmDeleteNews(id);break;
      case 'saveNews':saveNews();break;
      case 'closeNewsModal':var nm=document.getElementById('cms-news-modal');if(nm)nm.remove();break;
      case 'toggleNewsStatus':toggleNewsStatus(id);break;
      case 'clearBild':
        var row=t.closest('.cms-ang-row');
        if(row){
          var hi=row.querySelector('[data-f="bild_data"]');
          if(hi)hi.value='';
          var pv=row.querySelector('.cms-bild-preview');
          if(pv){pv.src='';pv.style.display='none';}
          t.style.display='none';
        }
        break;
      case 'uploadBildSP':
        (function(){
          var rn=t.getAttribute('data-row');if(!rn)return;
          var row=document.getElementById('cms-ar-'+rn);if(!row)return;
          var bildInp=row.querySelector('[data-f="bild_data"]');
          var nrInp=row.querySelector('[data-f="artikelnummer"]');
          var prodInp=row.querySelector('[data-f="produkt"]');
          // Resolve strichcode first
          var artnr=(nrInp&&nrInp.value||'').trim();
          var scNr='';
          if(artnr){
            var cached=_artikelCache.find(function(a){return a.nr===artnr;});
            if(cached && cached.sc) scNr=cached.sc;
          }
          if(!scNr && prodInp){
            var prod=prodInp.value.trim().toLowerCase();
            var match=_artikelCache.find(function(a){return (a.b||a.produktVal||'').toLowerCase()===prod;});
            if(match && match.sc) scNr=match.sc;
            if(!scNr && match && match.nr) scNr=match.nr;
          }
          if(!scNr) scNr=artnr;
          if(!scNr){toast('Bitte zuerst einen Artikel ausw\u00e4hlen','warn');return;}
          // Always open file picker – select image, compress, set preview, upload to SharePoint
          var inp=document.createElement('input');inp.type='file';inp.accept='image/*';
          inp.onchange=function(){
            var f=inp.files[0];if(!f)return;
            var reader=new FileReader();
            reader.onload=function(){
              cmsCompressImage(reader.result, 500, 500, function(compressedB64){
                if(bildInp) bildInp.value=compressedB64;
                var pv=row.querySelector('.cms-bild-preview');if(pv){pv.src=compressedB64;pv.style.display='';}
                var cl=row.querySelector('.cms-bild-clear');if(cl)cl.style.display='';
                t.disabled=true;t.textContent='\u23F3';
                uploadImageToSharePoint(scNr, compressedB64).then(function(){
                  toast('Bild als '+scNr+' in StrichcodeBilder hochgeladen!');
                }).catch(function(e){
                  var msg=e&&e.message||String(e);
                  if(msg.indexOf('interaction_in_progress')!==-1) msg='Anmeldung läuft noch – bitte kurz warten und erneut versuchen';
                  toast('Upload-Fehler: '+msg,'error');console.error(e);
                })
                .then(function(){t.disabled=false;t.textContent='\uD83D\uDCC1';});
              });
            };
            reader.readAsDataURL(f);
          };
          inp.click();
        })();
        break;
      case 'settingsSave':saveFeatureFlags();break;
      case 'saveCfg':cmsSaveCfg();break;
      case 'resetCfg':cmsResetCfg();break;
      case 'cfgRevertUnsaved':cfgRevertUnsaved();break;
      case 'cfgSection':cfgSwitchSection(t.getAttribute('data-id'));break;
      case 'wpCfgSection':wpCfgSwitchSection(t.getAttribute('data-id'));break;
      case 'cfgLivePreview':cfgLivePreview(t.getAttribute('data-target')||'plakat');break;
      case 'wpLivePreview':wpLivePreview(t.getAttribute('data-kind')||'home');break;
      case 'wpRevertSection':wpRevertSection(t.getAttribute('data-kind')||'home');break;
      case 'wpPresetSave':wpPresetSave(t.getAttribute('data-section'));break;
      case 'wpPresetLoad':wpPresetLoad(t.getAttribute('data-section'),t.getAttribute('data-idx'));break;
      case 'wpPresetDelete':wpPresetDelete(t.getAttribute('data-section'),t.getAttribute('data-idx'));break;
      case 'cfgPresetSave':cfgPresetSave(t.getAttribute('data-section'));break;
      case 'cfgPresetLoad':cfgPresetLoad(t.getAttribute('data-section'),t.getAttribute('data-idx'));break;
      case 'cfgPresetDelete':cfgPresetDelete(t.getAttribute('data-section'),t.getAttribute('data-idx'));break;
      case 'toggleCfgCompact':cfgSetCompact(!!t.checked);break;
      case 'hpangView':hpangSetView(t.getAttribute('data-mode'));break;
      case 'hpangSave':hpangSaveCfg();break;
      case 'hpangRevert':hpangRevert();break;
      case 'hpangReset':hpangReset();break;
    }
  });
  document.addEventListener('change',function(e){
    var act=e.target.getAttribute('data-action');
    if(act==='hoursChanged')cmsHoursChanged();
    if(e.target&&e.target.id==='hcfg-wpHomeTemplate')hpCfgSyncWpPreview();
    if(e.target&&e.target.id==='hcfg-wpFlyerTemplate')hpCfgSyncWpFlyerPreview();
    if(e.target&&((e.target.id==='cfg-plakatTemplate')||(e.target.id==='cfg-flyerTemplate')))cfgSyncOfferTplPreviews();
    if(e.target&&e.target.id==='cfg-savingsStarStyle'){
      var sp=document.getElementById('cfg-savingsPalette');
      if(sp&&sp.querySelector('option[value="'+e.target.value+'"]'))sp.value=e.target.value;
    }
    if(e.target&&(e.target.id==='cfg-savingsMarkerType'||e.target.id==='cfg-savingsPalette'||e.target.id==='cfg-savingsStarStyle'||e.target.id==='cfg-tagShape'))cfgRenderSavingsPreview();
    var TAG_PRESETS={
      'classic-red-rect':{tagColor:'#a51d2d',tagShape:'rect',tagRadius:0},
      'green-rounded':{tagColor:'#3d7a4a',tagShape:'rounded',tagRadius:16},
      'dark-pill':{tagColor:'#1e293b',tagShape:'pill',tagRadius:0},
      'gold-banner':{tagColor:'#b8860b',tagShape:'banner',tagRadius:0},
      'blue-circle':{tagColor:'#1d4ed8',tagShape:'circle',tagRadius:0},
      'orange-star':{tagColor:'#ea580c',tagShape:'star',tagRadius:0},
      'purple-hexagon':{tagColor:'#7c3aed',tagShape:'hexagon',tagRadius:0},
      'teal-ticket':{tagColor:'#0d9488',tagShape:'ticket',tagRadius:0},
      'rose-diamond':{tagColor:'#e11d48',tagShape:'diamond',tagRadius:0},
      'copper-explosion':{tagColor:'#b45309',tagShape:'explosion',tagRadius:0}
    };
    if(e.target&&e.target.id==='cfg-tagPreset'){
      var preset=TAG_PRESETS[e.target.value];
      if(preset){
        var tc=document.getElementById('cfg-tagColor');if(tc)tc.value=preset.tagColor;
        var ts=document.getElementById('cfg-tagShape');if(ts)ts.value=preset.tagShape;
        var tr=document.getElementById('cfg-tagRadius');if(tr){tr.value=preset.tagRadius;cfgUpdateVal('tagRadius',preset.tagRadius);}
        cfgRenderSavingsPreview();
      }
    }
    // Per-section tag preset handling (Plakat + Flyer)
    ['plakat','flyer'].forEach(function(sec){
      if(e.target&&e.target.id==='cfg-'+sec+'-tagPreset'){
        var preset=TAG_PRESETS[e.target.value];
        if(preset){
          var ts=document.getElementById('cfg-'+sec+'-tagShape');if(ts)ts.value=preset.tagShape;
          var tr=document.getElementById('cfg-'+sec+'-tagRadius');if(tr){tr.value=preset.tagRadius;cfgUpdateVal(sec+'-tagRadius',preset.tagRadius);}
        }
      }
    });
    if(act==='noticeSelChange'){
      var sel=e.target,ci=document.getElementById('cms-meal-notice-custom');
      if(ci){if(sel.value==='__custom__'){ci.style.display='';ci.focus();}else{ci.style.display='none';ci.value='';}}
    }
  });

  // Auto-format price fields on blur (German comma, 2 decimals)
  document.addEventListener('focusout',function(e){
    if(e.target.classList&&e.target.classList.contains('cms-price')){
      var v=e.target.value.trim();if(!v)return;
      var n=parseDePrice(v);
      if(n!=null)e.target.value=fmtDePrice(n);
    }
  });

  // Close autocomplete dropdowns on outside click
  document.addEventListener('click',function(e){
    if(!e.target.closest('.cms-art-wrap') && !e.target.closest('.cms-art-dd')){
      document.querySelectorAll('.cms-art-dd.open').forEach(function(dd){dd.className='cms-art-dd';dd.innerHTML='';});
    }
  },true);

  // Close fixed dropdowns on scroll (they don't follow the scroll)
  document.addEventListener('scroll',function(){
    document.querySelectorAll('.cms-art-dd.open').forEach(function(dd){dd.className='cms-art-dd';dd.innerHTML='';});
  },true);

  // --- Force German locale for date/time pickers ---
  document.documentElement.setAttribute('lang','de');

  // --- Sortiment CMS (WYSIWYG) ---
  var _sortLoaded=false;
  var _sortLines=[];
  var _sortEditing=false;
  var _sortIntro='';
  var _sortEco='';

  var SORT_DEFAULTS={
    intro:'Neben den gängigen Produkten des täglichen Bedarfs findet ihr bei uns vor allem <strong>regionale und spezielle Angebote</strong>:',
    highlights:[
      '🥬 Jeden Mittwoch <strong>frisches Biogemüse</strong> von <strong>Chiemgauer Naturkost</strong>, montags <strong>Steiner</strong> aus Kirchweidach',
      '🍊 Spanische <strong>Orangen</strong> und <strong>Mandarinen</strong> direkt vom Erzeuger, Fam. <strong>Bernauer</strong> aus Reitmehring',
      '🥩 <strong>Fleisch- und Wurstwaren</strong> von der <strong>Metzgerei Mayr</strong> aus Haag i. OB – dienstags und freitags',
      '🍽 <strong>Montag bis Freitag</strong> warmes <strong>Mittagessen</strong>, auch zum Mitnehmen. Freitag: Schnitzeltag!',
      '🍰 Täglich selbst gebackene <strong>Kuchen und Torten</strong>',
      '☎️ Vorbestellung: <a href="tel:+4980826229991">08082-6229991</a>'
    ],
    eco:'♻️ Zur Müllvermeidung könnt ihr gerne geeignete Behälter von zuhause mitbringen!'
  };

  // --- RTE helpers (execCommand-based) ---
  window.sortRteCmd=function(editorId,cmd){
    document.getElementById(editorId).focus();
    document.execCommand(cmd,false,null);
  };
  window.sortRteLink=function(editorId){
    var url=prompt('Link-URL eingeben (z.B. tel:+49... oder https://...)','');
    if(!url)return;
    document.getElementById(editorId).focus();
    document.execCommand('createLink',false,url);
  };
  window.sortRteUnlink=function(editorId){
    document.getElementById(editorId).focus();
    document.execCommand('unlink',false,null);
  };

  function _rteGetHtml(id){
    var el=document.getElementById(id);
    return el?el.innerHTML.trim():'';
  }

  function loadSortiment(){
    _sortLoaded=true;
    fetch('/api/cms-config')
      .then(function(r){return r.json()})
      .then(function(payload){
        var cfg=(payload&&payload.data)?payload.data:payload;
        _sortIntro=cfg['sortiment_intro']||SORT_DEFAULTS.intro;
        var hl=cfg['sortiment_highlights']||'';
        _sortEco=cfg['sortiment_eco']||SORT_DEFAULTS.eco;

        if(hl){
          var tmp=document.createElement('div');tmp.innerHTML=hl;
          var ps=tmp.querySelectorAll('p');
          _sortLines=[];
          ps.forEach(function(p){if(p.innerHTML.trim())_sortLines.push(p.innerHTML.trim());});
        }else{
          _sortLines=SORT_DEFAULTS.highlights.slice();
        }
        sortRenderView();
      })
      .catch(function(){
        _sortIntro=SORT_DEFAULTS.intro;
        _sortEco=SORT_DEFAULTS.eco;
        _sortLines=SORT_DEFAULTS.highlights.slice();
        sortRenderView();
      });
  }

  function sortRenderView(){
    document.getElementById('sort-view-intro').innerHTML=_sortIntro;
    var hlHtml='';
    _sortLines.forEach(function(l){hlHtml+='<p style="margin:6px 0">'+l+'</p>';});
    document.getElementById('sort-view-highlights').innerHTML=hlHtml;
    document.getElementById('sort-view-eco').innerHTML=_sortEco;
  }

  window.sortToggleEdit=function(){
    _sortEditing=!_sortEditing;
    document.getElementById('sort-view-mode').style.display=_sortEditing?'none':'';
    document.getElementById('sort-edit-mode').style.display=_sortEditing?'':'none';
    document.getElementById('sort-edit-toggle').innerHTML=_sortEditing?'← Zurück':'✏️ Bearbeiten';
    if(_sortEditing){
      document.getElementById('sort-rte-intro').innerHTML=_sortIntro;
      document.getElementById('sort-rte-eco').innerHTML=_sortEco;
      sortRenderLines();
    }
    document.getElementById('sort-cms-status').textContent='';
  };

  function sortRenderLines(){
    var container=document.getElementById('sort-rte-lines');
    var html='';
    _sortLines.forEach(function(line,i){
      var uid='sort-rte-hl-'+i;
      html+='<div class="rte-wrap" style="margin-bottom:8px">';
      html+='<div class="rte-toolbar">';
      html+='<button class="rte-btn" onclick="sortRteCmd(\''+uid+'\',\'bold\')" title="Fett"><b>F</b></button>';
      html+='<button class="rte-btn" onclick="sortRteCmd(\''+uid+'\',\'italic\')" title="Kursiv"><i>K</i></button>';
      html+='<span class="rte-sep"></span>';
      html+='<button class="rte-btn" onclick="sortRteLink(\''+uid+'\')" title="Link">🔗</button>';
      html+='<span style="flex:1"></span>';
      html+='<button class="rte-btn" onclick="sortRemoveLine('+i+')" title="Zeile entfernen" style="color:#dc2626">✕</button>';
      html+='</div>';
      html+='<div class="rte-editor" id="'+uid+'" contenteditable="true"></div>';
      html+='</div>';
    });
    container.innerHTML=html;
    // Set innerHTML after DOM is created (to preserve HTML)
    _sortLines.forEach(function(line,i){
      var el=document.getElementById('sort-rte-hl-'+i);
      if(el) el.innerHTML=line;
    });
  }

  window.sortAddLine=function(){
    _sortLines.push('🔹 Neuer Eintrag mit <strong>Fettdruck</strong>');
    sortRenderLines();
    var last=document.getElementById('sort-rte-hl-'+(_sortLines.length-1));
    if(last) last.focus();
  };

  window.sortRemoveLine=function(i){
    _sortLines.splice(i,1);
    sortRenderLines();
  };

  function _sortCollectLines(){
    var lines=[];
    _sortLines.forEach(function(_,i){
      var el=document.getElementById('sort-rte-hl-'+i);
      if(el){
        var h=el.innerHTML.trim();
        if(h&&h!=='<br>') lines.push(h);
      }
    });
    return lines;
  }

  window.sortSave=function(){
    var status=document.getElementById('sort-cms-status');
    status.textContent='Speichert…';status.style.color='#6b7280';

    _sortIntro=_rteGetHtml('sort-rte-intro');
    _sortEco=_rteGetHtml('sort-rte-eco');
    _sortLines=_sortCollectLines();
    var hlHtml='';
    _sortLines.forEach(function(l){hlHtml+='<p>'+l+'</p>';});

    var saves=[
      fetch('/api/cms-config',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({name:'sortiment_intro',wert:_sortIntro})}),
      fetch('/api/cms-config',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({name:'sortiment_highlights',wert:hlHtml})}),
      fetch('/api/cms-config',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({name:'sortiment_eco',wert:_sortEco})})
    ];

    Promise.all(saves).then(function(results){
      var allOk=results.every(function(r){return r.ok;});
      if(allOk){
        status.textContent='✅ Gespeichert!';status.style.color='#16a34a';
        toast('Sortiment-Texte gespeichert');
        sortRenderView();
        setTimeout(function(){sortToggleEdit();},800);
      }else{
        status.textContent='⚠️ Fehler beim Speichern';status.style.color='#dc2626';
        toast('Speichern teilweise fehlgeschlagen','error');
      }
    }).catch(function(){
      status.textContent='⚠️ Netzwerkfehler';status.style.color='#dc2626';
      toast('Netzwerkfehler beim Speichern','error');
    });
  };

  // ═══════════════ GALLERY ADMIN ═══════════════
  var _galLoaded=false;
  var _galData=null;

  window.loadGalleryAdmin=function(){
    var grid=document.getElementById('gal-admin-grid');
    var empty=document.getElementById('gal-admin-empty');
    if(!grid)return;
    grid.innerHTML='<div style="text-align:center;padding:24px;color:var(--c-m-muted)">Lade Galerie...</div>';
    empty.style.display='none';

    fetch(API+'/gallery')
      .then(function(r){return r.json();})
      .then(function(res){
        _galLoaded=true;
        if(!res.success){
          grid.innerHTML='<div style="text-align:center;padding:24px;color:#dc2626">Fehler: '+(res.error||'')+'</div>';
          _galData={categories:[],images:[]};
          galUpdateCatSelect();
          galRenderFolderList();
          return;
        }
        _galData=res;
        galUpdateCatSelect();
        galRenderFolderList();
        galRenderGrid();
      })
      .catch(function(e){
        grid.innerHTML='<div style="text-align:center;padding:24px;color:#dc2626">Fehler beim Laden: '+e.message+'</div>';
      });
  };

  function galUpdateCatSelect(){
    var sel=document.getElementById('gal-upload-cat');
    if(!sel||!_galData)return;
    var cats=(_galData.categories||[]).map(function(c){return c.name;});
    var html='<option value="">-- Kategorie wählen --</option>';
    cats.forEach(function(c){
      html+='<option value="'+c+'">'+c+'</option>';
    });
    sel.innerHTML=html;
  }

  function galRenderFolderList(){
    var container=document.getElementById('gal-folder-list');
    if(!container||!_galData)return;
    var cats=(_galData.categories||[]).filter(function(c){return c.id;});
    if(!cats.length){container.innerHTML='<span style="font-size:12px;color:var(--c-m-muted)">Keine Ordner vorhanden</span>';return;}
    var html='';
    cats.forEach(function(cat){
      html+='<span style="display:inline-flex;align-items:center;gap:4px;padding:4px 10px;border-radius:16px;background:#f3f4f6;border:1px solid #e5e7eb;font-size:12px;font-weight:600">';
      html+='<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg> ';
      html+=cat.name+' <span style="opacity:.6">('+cat.count+')</span>';
      html+=' <button onclick="galDeleteFolder(\''+cat.id+'\',\''+cat.name.replace(/'/g,"\\'")+'\','+cat.count+')" style="width:16px;height:16px;border-radius:50%;border:none;background:transparent;color:#9ca3af;cursor:pointer;font-size:12px;display:inline-flex;align-items:center;justify-content:center;transition:all .15s" title="Ordner löschen" onmouseover="this.style.background=\'#fecaca\';this.style.color=\'#dc2626\'" onmouseout="this.style.background=\'transparent\';this.style.color=\'#9ca3af\'">&times;</button>';
      html+='</span>';
    });
    container.innerHTML=html;
  }

  function galRenderGrid(){
    var grid=document.getElementById('gal-admin-grid');
    var empty=document.getElementById('gal-admin-empty');
    if(!grid||!_galData)return;
    var cats=(_galData.categories||[]).filter(function(c){return c.images&&c.images.length;});
    if(!cats.length){grid.innerHTML='';empty.style.display='';return;}
    empty.style.display='none';

    var html='';
    cats.forEach(function(cat){
      html+='<div class="cms-card" style="margin-bottom:12px">';
      html+='<div class="cms-card-header" style="display:flex;justify-content:space-between;align-items:center">';
      html+='<span><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:middle;margin-right:4px"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg> '+cat.name+' <span style="opacity:.7;font-weight:400;margin-left:4px">('+cat.count+' Bilder)</span></span>';
      html+='</div>';
      html+='<div class="cms-card-body" style="padding:10px">';
      html+='<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(170px,1fr));gap:10px">';
      (cat.images||[]).forEach(function(img){
        var desc=img.description||'';
        var descEsc=desc.replace(/"/g,'&quot;').replace(/'/g,'&#39;');
        html+='<div style="border-radius:8px;overflow:hidden;background:#f3f4f6;border:1px solid #e5e7eb">';
        html+='<div style="position:relative;aspect-ratio:4/3">';
        html+='<img src="'+(img.thumb||img.url)+'" alt="'+img.name.replace(/"/g,'&quot;')+'" style="width:100%;height:100%;object-fit:cover;display:block">';
        html+='<button onclick="galDelete(\''+img.id+'\',\''+img.name.replace(/'/g,"\\'")+'\',event)" style="position:absolute;top:4px;right:4px;width:24px;height:24px;border-radius:6px;border:none;background:rgba(220,38,38,.85);color:#fff;cursor:pointer;font-size:14px;display:flex;align-items:center;justify-content:center;transition:background .15s" title="Bild löschen">&times;</button>';
        html+='</div>';
        html+='<div style="padding:6px 8px">';
        html+='<div style="font-size:10px;color:#6b7280;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;margin-bottom:4px" title="'+img.name.replace(/"/g,'&quot;')+'">'+img.name+'</div>';
        html+='<input class="cms-input" value="'+descEsc+'" placeholder="Untertitel..." style="width:100%;font-size:11px;padding:3px 6px;box-sizing:border-box" onchange="galSaveDesc(\''+img.id+'\',this.value)" title="Untertitel / Beschreibung">';
        html+='</div></div>';
      });
      html+='</div></div></div>';
    });
    grid.innerHTML=html;
  }

  window.galSaveDesc=function(id,desc){
    fetch(API+'/gallery',{
      method:'PATCH',
      headers:{'Content-Type':'application/json'},
      body:JSON.stringify({id:id,description:desc})
    })
    .then(function(r){return r.json();})
    .then(function(res){
      if(res.success){toast('Untertitel gespeichert');}
      else{toast('Fehler: '+(res.error||''),'error');}
    })
    .catch(function(e){toast('Netzwerkfehler: '+e.message,'error');});
  };

  window.galCreateFolder=function(){
    var inp=document.getElementById('gal-folder-name');
    var name=(inp&&inp.value||'').trim();
    if(!name){toast('Bitte Ordnernamen eingeben','warn');return;}
    fetch(API+'/gallery',{
      method:'PUT',
      headers:{'Content-Type':'application/json'},
      body:JSON.stringify({action:'create_folder',name:name})
    })
    .then(function(r){return r.json();})
    .then(function(res){
      if(res.success){toast('Ordner "'+name+'" angelegt');inp.value='';loadGalleryAdmin();}
      else{toast('Fehler: '+(res.error||''),'error');}
    })
    .catch(function(e){toast('Netzwerkfehler: '+e.message,'error');});
  };

  window.galDeleteFolder=function(id,name,count){
    var msg='Ordner "'+name+'" wirklich löschen?';
    if(count>0) msg+='\n\nACHTUNG: Alle '+count+' Bilder im Ordner werden ebenfalls gelöscht!';
    cmsConfirm(msg,{icon:'🗑️',ok:'L\u00f6schen',warn:true}).then(function(ok){
      if(!ok)return;
      fetch(API+'/gallery',{
        method:'PUT',
        headers:{'Content-Type':'application/json'},
        body:JSON.stringify({action:'delete_folder',id:id})
      })
      .then(function(r){return r.json();})
      .then(function(res){
        if(res.success){toast('Ordner "'+name+'" gelöscht');loadGalleryAdmin();}
        else{toast('Fehler: '+(res.error||''),'error');}
      })
      .catch(function(e){toast('Netzwerkfehler: '+e.message,'error');});
    });
  };

  window.galDelete=function(id,name,evt){
    if(evt)evt.stopPropagation();
    cmsConfirm('Bild "'+name+'" wirklich löschen?',{icon:'🗑️',ok:'L\u00f6schen',warn:true}).then(function(ok){
      if(!ok)return;
      fetch(API+'/gallery',{
        method:'DELETE',
        headers:{'Content-Type':'application/json'},
        body:JSON.stringify({id:id})
      })
      .then(function(r){return r.json();})
      .then(function(res){
        if(res.success){toast('Bild gelöscht: '+name);loadGalleryAdmin();}
        else{toast('Fehler: '+(res.error||'Unbekannt'),'error');}
      })
      .catch(function(e){toast('Netzwerkfehler: '+e.message,'error');});
    });
  };

  window.galPreviewFiles=function(input){
    var preview=document.getElementById('gal-upload-preview');
    var thumbs=document.getElementById('gal-upload-thumbs');
    if(!preview||!thumbs)return;
    thumbs.innerHTML='';
    if(!input.files||!input.files.length){preview.style.display='none';return;}
    preview.style.display='';
    for(var i=0;i<input.files.length;i++){
      (function(file){
        var wrap=document.createElement('div');
        wrap.style.cssText='position:relative;width:80px;height:80px;border-radius:8px;overflow:hidden;border:1px solid #e5e7eb;background:#f9fafb;flex-shrink:0';
        var img=document.createElement('img');
        img.style.cssText='width:100%;height:100%;object-fit:cover;display:block';
        img.alt=file.name;
        var label=document.createElement('div');
        label.style.cssText='position:absolute;bottom:0;left:0;right:0;background:rgba(0,0,0,.6);color:#fff;font-size:9px;padding:2px 4px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis';
        label.textContent=file.name;
        var reader=new FileReader();
        reader.onload=function(e){img.src=e.target.result;};
        reader.readAsDataURL(file);
        wrap.appendChild(img);
        wrap.appendChild(label);
        thumbs.appendChild(wrap);
      })(input.files[i]);
    }
    var count=document.createElement('div');
    count.style.cssText='display:flex;align-items:center;justify-content:center;width:80px;height:80px;border-radius:8px;border:1px dashed #d1d5db;color:var(--c-m-muted);font-size:12px;font-weight:700;flex-shrink:0';
    count.textContent=input.files.length+' Bild'+(input.files.length>1?'er':'');
    thumbs.appendChild(count);
  };

  window.galUpload=function(){
    var fileInput=document.getElementById('gal-upload-files');
    var files=fileInput.files;
    if(!files||!files.length){toast('Bitte Bilder auswählen','warn');return;}

    var sel=document.getElementById('gal-upload-cat');
    var category=sel&&sel.value||'';
    var descInput=document.getElementById('gal-upload-desc');
    var description=descInput&&descInput.value.trim()||'';

    var btn=document.getElementById('gal-upload-btn');
    var progress=document.getElementById('gal-upload-progress');
    var bar=document.getElementById('gal-upload-bar');
    var status=document.getElementById('gal-upload-status');
    btn.disabled=true;
    progress.style.display='';
    bar.style.width='0%';

    var total=files.length;
    var done=0;
    var errors=0;

    function uploadNext(idx){
      if(idx>=total){
        btn.disabled=false;
        var msg=done+' von '+total+' Bild'+(total>1?'ern':'')+' hochgeladen';
        if(errors>0) msg+=', '+errors+' Fehler';
        status.textContent=msg;
        toast(msg, errors>0?'warn':'success');
        fileInput.value='';
        if(descInput)descInput.value='';
        var pv=document.getElementById('gal-upload-preview');if(pv)pv.style.display='none';
        loadGalleryAdmin();
        return;
      }
      status.textContent='Lade hoch: '+(idx+1)+' / '+total+' – '+files[idx].name;
      var fd=new FormData();
      fd.append('file',files[idx]);
      if(category) fd.append('category',category);
      if(description) fd.append('description',description);

      fetch(API+'/gallery',{method:'POST',body:fd})
        .then(function(r){return r.json();})
        .then(function(res){
          if(res.success){done++;}else{errors++;toast('Fehler bei '+files[idx].name+': '+(res.error||''),'error');}
          bar.style.width=Math.round(((idx+1)/total)*100)+'%';
          uploadNext(idx+1);
        })
        .catch(function(e){
          errors++;
          toast('Fehler bei '+files[idx].name+': '+e.message,'error');
          bar.style.width=Math.round(((idx+1)/total)*100)+'%';
          uploadNext(idx+1);
        });
    }
    uploadNext(0);
  };

  // --- Push Notifications: Queue ---
  var PUSH_QUEUE_KEY='push_queue';
  function pushGetQueue(){try{return JSON.parse(localStorage.getItem(PUSH_QUEUE_KEY)||'[]');}catch(e){return [];}}
  function pushSaveQueue(q){localStorage.setItem(PUSH_QUEUE_KEY,JSON.stringify(q));pushRenderQueue();}
  var CAT_ICONS={mittagstisch:'\uD83C\uDF7D',angebote:'\uD83C\uDF81',news:'\uD83D\uDCF0'};
  var CAT_NAMES={mittagstisch:'Mittagstisch',angebote:'Angebote',news:'News'};

  function pushRenderQueue(){
    var q=pushGetQueue();
    var card=document.getElementById('push-queue-card');
    var list=document.getElementById('push-queue-list');
    var cnt=document.getElementById('push-queue-count');
    var prev=document.getElementById('push-queue-preview');
    cnt.textContent=q.length;
    if(!q.length){card.style.display='none';return;}
    card.style.display='';
    var html='';
    q.forEach(function(item,i){
      var icon=CAT_ICONS[item.category]||'\uD83D\uDD14';
      var catName=CAT_NAMES[item.category]||'Alle';
      html+='<div style="display:flex;align-items:flex-start;gap:8px;padding:8px 0;border-bottom:1px solid #f3f4f6">';
      html+='<span style="font-size:18px">'+icon+'</span>';
      html+='<div style="flex:1;min-width:0">';
      html+='<div style="font-weight:600;font-size:13px;color:#1f2937">'+item.title+'</div>';
      html+='<div style="font-size:12px;color:#6b7280;white-space:pre-line;overflow:hidden;text-overflow:ellipsis">'+item.message+'</div>';
      html+='<div style="font-size:11px;color:#9ca3af;margin-top:2px">'+catName+'</div>';
      html+='</div>';
      html+='<button onclick="pushRemoveFromQueue('+i+')" style="background:none;border:none;color:#dc2626;cursor:pointer;font-size:16px;padding:2px 6px" title="Entfernen">&times;</button>';
      html+='</div>';
    });
    list.innerHTML=html;
    // Build combined preview
    if(q.length>1){
      prev.style.display='';
      document.getElementById('push-queue-preview-title').textContent='Dorfladen Oberornau';
      var body=q.map(function(item){
        var icon=CAT_ICONS[item.category]||'\u2022';
        return icon+' '+item.message;
      }).join('\n');
      document.getElementById('push-queue-preview-body').textContent=body;
    }else{
      prev.style.display='none';
    }
  }

  window.pushAddToQueue=function(){
    var title=document.getElementById('push-title').value.trim();
    var message=document.getElementById('push-message').value.trim();
    var url=document.getElementById('push-url').value;
    var category=document.getElementById('push-category').value;
    if(!message){toast('Bitte Nachricht eingeben','warn');return;}
    var q=pushGetQueue();
    q.push({title:title,message:message,url:url,category:category});
    pushSaveQueue(q);
    document.getElementById('push-message').value='';
    toast('Zur Warteschlange hinzugef\u00fcgt ('+q.length+')','ok');
  };

  window.pushRemoveFromQueue=function(idx){
    var q=pushGetQueue();
    q.splice(idx,1);
    pushSaveQueue(q);
  };

  window.pushClearQueue=function(){
    cmsConfirm('Warteschlange wirklich leeren?',{icon:'\uD83D\uDDD1\uFE0F',ok:'Leeren',warn:true}).then(function(ok){
      if(!ok)return;
      pushSaveQueue([]);
      toast('Warteschlange geleert','ok');
    });
  };

  window.pushSendQueue=function(){
    var q=pushGetQueue();
    if(!q.length){toast('Warteschlange ist leer','warn');return;}
    // Build combined message
    var title='Dorfladen Oberornau';
    var body,url='/',category='';
    if(q.length===1){
      title=q[0].title;
      body=q[0].message;
      url=q[0].url;
      category=q[0].category;
    }else{
      body=q.map(function(item){
        var icon=CAT_ICONS[item.category]||'\u2022';
        return icon+' '+item.message;
      }).join('\n');
    }
    var catInfo=category?(CAT_NAMES[category]||category):'Alle Abonnenten';
    cmsConfirm('Gesammelte Push senden ('+q.length+' Nachricht'+(q.length>1?'en':'')+')?'+
      '\n\nEmpf\u00e4nger: '+catInfo+
      '\nTitel: '+title+
      '\nNachricht: '+body+
      '\n\n\u274c Kann nach dem Senden NICHT zur\u00fcckgezogen werden!',{icon:'\u26a0\ufe0f',ok:'Jetzt senden',warn:true}).then(function(ok){
    if(!ok)return;
    var status=document.getElementById('push-queue-status');
    status.textContent='Wird gesendet...';
    status.style.color='#6b7280';
    var payload={title:title,message:body,url:url,tag:'dorfladen-cms'};
    if(category)payload.category=category;
    fetch(API+'/push-send',{
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body:JSON.stringify(payload)
    }).then(function(r){return r.json();})
    .then(function(res){
      if(res.success){
        var info='Gesendet: '+res.sent;
        if(res.failed)info+=', Fehler: '+res.failed;
        status.textContent='\u2705 '+info;
        status.style.color=res.failed?'#d97706':'#16a34a';
        toast(res.sent>0?'Gesammelte Push gesendet! ('+res.sent+' Empf\u00e4nger)':'Keine Empf\u00e4nger',res.sent>0?'ok':'warn');
        pushSaveQueue([]);
      }else{
        status.textContent='\u274c '+res.error;
        status.style.color='#dc2626';
        toast('Fehler: '+res.error,'error');
      }
    }).catch(function(e){
      status.textContent='\u274c Netzwerkfehler';
      status.style.color='#dc2626';
      toast('Fehler: '+e.message,'error');
    });
    });
  };

  // Render queue on load
  pushRenderQueue();

  // --- Push Notifications ---
  window.pushTemplate = function(type){
    var title=document.getElementById('push-title');
    var msg=document.getElementById('push-message');
    var url=document.getElementById('push-url');
    var cat=document.getElementById('push-category');
    if(type==='mittagstisch'){
      title.value='Mittagstisch heute';
      msg.value='Der heutige Mittagstisch ist da! Schaut vorbei.';
      url.value='/essen-im-dorfladen';
      cat.value='mittagstisch';
    }else if(type==='angebote'){
      title.value='Neue Angebote';
      msg.value='Neue Angebote im Dorfladen! Jetzt entdecken.';
      url.value='/sortiment';
      cat.value='angebote';
    }else if(type==='news'){
      title.value='Neuigkeit vom Dorfladen';
      msg.value='';
      url.value='/aktuelles';
      cat.value='news';
      msg.focus();
    }
  };
  window.pushImagePreview = function(input){
    if(!input.files||!input.files[0])return;
    var file=input.files[0];
    document.getElementById('push-image-name').textContent=file.name;
    document.getElementById('push-image-remove').style.display='';
    var reader=new FileReader();
    reader.onload=function(e){
      document.getElementById('push-image-thumb').src=e.target.result;
      document.getElementById('push-image-preview').style.display='';
      // Store base64 for upload
      input.setAttribute('data-base64',e.target.result);
    };
    reader.readAsDataURL(file);
  };
  window.pushImageRemove = function(){
    document.getElementById('push-image-file').value='';
    document.getElementById('push-image-file').removeAttribute('data-base64');
    document.getElementById('push-image-name').textContent='Kein Bild';
    document.getElementById('push-image-remove').style.display='none';
    document.getElementById('push-image-preview').style.display='none';
    document.getElementById('push-image-url').value='';
  };
  function pushUploadImage(){
    var fileInput=document.getElementById('push-image-file');
    var b64=fileInput.getAttribute('data-base64');
    if(!b64)return Promise.resolve('');
    // Check if already uploaded
    var cachedUrl=document.getElementById('push-image-url').value;
    if(cachedUrl)return Promise.resolve(cachedUrl);
    return fetch(API+'/push-image',{
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body:JSON.stringify({data:b64})
    }).then(function(r){return r.json();}).then(function(res){
      if(res.success&&res.url){
        document.getElementById('push-image-url').value=res.url;
        return res.url;
      }
      throw new Error(res.error||'Bild-Upload fehlgeschlagen');
    });
  }
  window.pushLoadSubscribers = function(){
    var list=document.getElementById('push-sub-list');
    var count=document.getElementById('push-sub-count');
    list.textContent='Lade...';
    fetch(API+'/push-send').then(function(r){return r.json();}).then(function(res){
      count.textContent=res.total||0;
      if(!res.subscribers||res.subscribers.length===0){list.innerHTML='<em>Keine Subscriber vorhanden.</em>';return;}
      var html='<table style="width:100%;border-collapse:collapse;font-size:12px"><thead><tr style="text-align:left;border-bottom:2px solid #e5e7eb">'
        +'<th style="padding:4px 6px">#</th><th style="padding:4px 6px">Domain</th><th style="padding:4px 6px">Kategorien</th><th style="padding:4px 6px">Keys</th><th style="padding:4px 6px"></th></tr></thead><tbody>';
      res.subscribers.forEach(function(s,i){
        var keyOk=s.has_p256dh&&s.has_auth;
        html+='<tr style="border-bottom:1px solid #f3f4f6">'
          +'<td style="padding:4px 6px">'+(i+1)+'</td>'
          +'<td style="padding:4px 6px;word-break:break-all">'+((s.endpoint_domain||'?').replace(/</g,'&lt;'))+'</td>'
          +'<td style="padding:4px 6px">'+(s.categories||[]).join(', ')+'</td>'
          +'<td style="padding:4px 6px;color:'+(keyOk?'#16a34a':'#dc2626')+'">'+(keyOk?'&#10003;':'&#10007;')+'</td>'
          +'<td style="padding:4px 6px"><button onclick="pushDeleteSub(\''+s.record_id+'\')" style="background:#fee2e2;color:#dc2626;border:1px solid #fecaca;border-radius:4px;padding:2px 8px;font-size:11px;cursor:pointer">&#128465;</button></td>'
          +'</tr>';
      });
      html+='</tbody></table>';
      list.innerHTML=html;
    }).catch(function(e){list.textContent='Fehler: '+e.message;});
  };
  window.pushDeleteSub = function(recordId){
    cmsConfirm('Subscriber wirklich l\u00f6schen?',{icon:'\uD83D\uDDD1\uFE0F',ok:'L\u00f6schen',warn:true}).then(function(ok){
      if(!ok)return;
      fetch(API+'/push-send',{method:'DELETE',headers:{'Content-Type':'application/json'},body:JSON.stringify({record_id:recordId})})
        .then(function(r){return r.json();})
        .then(function(res){
          if(res.success){toast('Subscriber gel\u00f6scht','ok');pushLoadSubscribers();}
          else{toast('Fehler: '+(res.error||'Unbekannt'),'error');}
        }).catch(function(e){toast('Fehler: '+e.message,'error');});
    });
  };

  window.pushSendNow = function(){
    var title=document.getElementById('push-title').value.trim();
    var message=document.getElementById('push-message').value.trim();
    var url=document.getElementById('push-url').value;
    var category=document.getElementById('push-category').value;
    var catLabels={mittagstisch:'Mittagstisch',angebote:'Angebote',news:'News / Aktuelles'};
    var catInfo=category?(catLabels[category]||category):'Alle Abonnenten';
    var btn=document.getElementById('push-send-btn');
    var status=document.getElementById('push-status');
    if(!message){toast('Bitte Nachricht eingeben','warn');return;}
    cmsConfirm('Push-Nachricht senden?\n\nEmpf\u00e4nger: '+catInfo+'\nTitel: '+title+'\nNachricht: '+message+'\n\n\u274c Kann nach dem Senden NICHT zur\u00fcckgezogen werden!',{icon:'\u26a0\ufe0f',ok:'Jetzt senden',warn:true}).then(function(ok){
    if(!ok)return;
    btn.disabled=true;
    status.textContent='Bild wird hochgeladen...';
    status.style.color='#6b7280';
    pushUploadImage().then(function(imageUrl){
      status.textContent='Wird gesendet...';
      var payload={title:title,message:message,url:url,tag:'dorfladen-cms'};
      if(category)payload.category=category;
      if(imageUrl)payload.image=imageUrl;
      return fetch(API+'/push-send',{
        method:'POST',
        headers:{'Content-Type':'application/json'},
        body:JSON.stringify(payload)
      });
    })
    .then(function(r){return r.json();})
    .then(function(res){
      if(res.success){
        var info='Gesendet: '+res.sent;
        if(res.failed)info+=', Fehler: '+res.failed;
        if(res.removed)info+=', Entfernt: '+res.removed;
        if(res.errors&&res.errors.length)info+='\n'+res.errors.join('\n');
        status.textContent='\u2705 '+info;
        status.style.color=res.failed?'#d97706':'#16a34a';
        var toastMsg=res.sent>0?'Push gesendet! ('+res.sent+' Empf\u00e4nger)':(res.total==0?'Keine Abonnenten vorhanden':(res.sent==0&&res.failed>0?'Push konnte nicht zugestellt werden (Firefox-Push evtl. abgelaufen). Bitte Abo erneuern.':'Fehler beim Senden ('+res.failed+' fehlgeschlagen)'));toast(toastMsg,res.sent>0?'ok':'warn');
      }else{
        status.textContent='\u274c '+res.error;
        status.style.color='#dc2626';
        toast('Fehler: '+res.error,'error');
      }
    })
    .catch(function(e){
      status.textContent='\u274c Netzwerkfehler';
      status.style.color='#dc2626';
      toast('Fehler: '+e.message,'error');
    })
    .then(function(){btn.disabled=false;pushImageRemove();});
    });
  };

  // --- Feature Flags (Settings tab) ---
  var _settingsLoaded=false;
  function loadFeatureFlags(){
    _settingsLoaded=true;
    var statusEl=document.getElementById('settings-status');
    statusEl.style.display='block';statusEl.style.background='#f0f4ff';statusEl.style.color='#4338ca';
    statusEl.textContent='\u23F3 Lade Feature-Einstellungen\u2026';
    fetch('/api/cms-config').then(function(r){return r.json();}).then(function(res){
      statusEl.style.display='none';
      if(res.success&&res.data){
        var flags=res.data.feature_flags;
        if(typeof flags==='string'){try{flags=JSON.parse(flags);}catch(e){flags={};}}
        if(!flags)flags={};
        var fp=document.getElementById('feat-push');
        var fs=document.getElementById('feat-scanner');
        if(fp)fp.checked=flags.push!==false;
        if(fs)fs.checked=flags.scanner!==false;
      }
    }).catch(function(e){
      statusEl.style.display='block';statusEl.style.background='#fef2f2';statusEl.style.color='#dc2626';
      statusEl.textContent='\u274c Fehler beim Laden: '+e.message;
    });
  }
  function saveFeatureFlags(){
    var fp=document.getElementById('feat-push');
    var fs=document.getElementById('feat-scanner');
    var flags={push:fp?fp.checked:true,scanner:fs?fs.checked:true};
    var btn=document.getElementById('settings-save');
    var hint=document.getElementById('settings-saved-hint');
    var statusEl=document.getElementById('settings-status');
    if(btn){btn.disabled=true;btn.textContent='\u23F3 Speichern\u2026';}
    fetch('/api/cms-config',{
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body:JSON.stringify({name:'feature_flags',wert:flags})
    }).then(function(r){return r.json();}).then(function(res){
      if(res.success){
        statusEl.style.display='none';
        toast('Feature-Einstellungen gespeichert!');
        if(hint){hint.style.display='inline';setTimeout(function(){hint.style.display='none';},3000);}
      }else{
        statusEl.style.display='block';statusEl.style.background='#fef2f2';statusEl.style.color='#dc2626';
        statusEl.textContent='\u274c '+res.error;
        toast('Fehler: '+res.error,'error');
      }
    }).catch(function(e){
      statusEl.style.display='block';statusEl.style.background='#fef2f2';statusEl.style.color='#dc2626';
      statusEl.textContent='\u274c Netzwerkfehler';
      toast('Fehler: '+e.message,'error');
    }).then(function(){if(btn){btn.disabled=false;btn.textContent='\uD83D\uDCBE Speichern';}});
  }

  // --- Init (only if already authenticated via session) ---
  if(sessionStorage.getItem(CMS_PW_KEY)===cmsPwHash){
    if(document.readyState==='loading'){document.addEventListener('DOMContentLoaded',init);}else{init();}
  }
})();
