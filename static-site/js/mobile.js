/* ============================================
   MOBILE REDESIGN – Dorfladen Oberornau
   Only runs on mobile viewports (<=768px)
   Desktop logic in app.js stays untouched
   ============================================ */
(function(){
  if(window.innerWidth>768) return; // Skip on desktop

  var API_BASE=window.API_BASE||'/api';

  /* === POPUP OPEN / CLOSE === */
  window.mobOpenPopup=function(id){
    var el=document.getElementById('mob-popup-'+id);
    if(el) el.classList.add('open');
  };
  window.mobClosePopup=function(id){
    var el=document.getElementById('mob-popup-'+id);
    if(el) el.classList.remove('open');
  };
  document.addEventListener('keydown',function(e){
    if(e.key==='Escape'){
      document.querySelectorAll('.mob-popup-bg.open').forEach(function(el){el.classList.remove('open');});
      document.getElementById('mob-nav').classList.remove('open');
      document.getElementById('mob-nav-ov').classList.remove('open');
    }
  });

  /* === LOGO LOADER (mobile header) === */
  var logoText=document.getElementById('mob-logo-text');
  if(logoText) logoText.style.opacity='0';
  fetch(API_BASE+'/logo').then(function(r){return r.json();}).then(function(res){
    if(res.success&&res.logo){
      var img=document.getElementById('mob-logo-img');
      if(img){img.src=res.logo;img.style.display='';if(logoText) logoText.style.display='none';}
    }else{
      if(logoText) logoText.style.opacity='1';
    }
  }).catch(function(){if(logoText) logoText.style.opacity='1';});

  /* === OPEN/CLOSED STATUS === */
  function updateMobStatus(){
    var now=new Date();
    var day=now.getDay(); // 0=So
    var h=now.getHours(),m=now.getMinutes(),t=h*60+m;
    var open=false,closeAt='';
    // Mo=1,Di=2,Mi=3,Do=4,Fr=5,Sa=6,So=0
    if(day>=1&&day<=5){
      if(t>=390&&t<840){open=true;closeAt='14:00';}   // 6:30-14:00
      if(day!==2&&t>=990&&t<1140){open=true;closeAt='19:00';} // 16:30-19:00 (not Di)
    }else if(day===6){
      if(t>=420&&t<780){open=true;closeAt='13:00';} // 7:00-13:00
    }
    var el=document.getElementById('mob-status');
    var txt=document.getElementById('mob-status-text');
    if(open){
      el.className='mob-only mob-status';
      txt.textContent='Jetzt geöffnet · bis '+closeAt+' Uhr';
    }else{
      el.className='mob-only mob-status closed';
      txt.textContent='Aktuell geschlossen';
    }
  }
  updateMobStatus();

  /* === HOURS TABLES (for popups) === */
  var dayNames=['So','Mo','Di','Mi','Do','Fr','Sa'];
  var ladenHrs=[
    {d:'Mo',t:'06:30–14:00 & 16:30–19:00'},
    {d:'Di',t:'06:30–14:00'},
    {d:'Mi',t:'06:30–14:00 & 16:30–19:00'},
    {d:'Do',t:'06:30–14:00 & 16:30–19:00'},
    {d:'Fr',t:'06:30–14:00 & 16:30–19:00'},
    {d:'Sa',t:'07:00–13:00'},
    {d:'So',t:'Geschlossen',closed:true}
  ];
  var postHrs=[
    {d:'Mo',t:'09:00–14:00 & 16:30–19:00'},
    {d:'Di',t:'09:00–14:00'},
    {d:'Mi',t:'09:00–14:00 & 16:30–19:00'},
    {d:'Do',t:'09:00–14:00 & 16:30–19:00'},
    {d:'Fr',t:'09:00–14:00 & 16:30–19:00'},
    {d:'Sa',t:'09:00–13:00'},
    {d:'So',t:'Geschlossen',closed:true}
  ];
  var todayDay=dayNames[new Date().getDay()];

  function renderHrs(data,elId){
    var el=document.getElementById(elId);
    if(!el) return;
    var html='';
    data.forEach(function(r){
      var isTd=r.d===todayDay;
      html+='<tr'+(isTd?' style="background:#e8f5e9;font-weight:700;border-radius:6px"':'')+'>';
      html+='<td style="padding:8px;font-weight:600;width:36px">'+r.d+'</td>';
      html+='<td style="padding:8px;color:'+(r.closed?'#c62828':'#2e7d4f')+';font-weight:500">'+r.t+'</td>';
      html+='</tr>';
    });
    el.innerHTML=html;
  }
  renderHrs(ladenHrs,'mob-hrs-laden');
  renderHrs(postHrs,'mob-hrs-post');
  renderHrs(postHrs,'mob-hrs-post2');

  // Override with API data if available
  fetch(API_BASE+'/hours').then(function(r){return r.json();}).then(function(data){
    if(!data) return;
    // API may provide hours – use them if present
    // For now the static fallback is fine
  }).catch(function(){});

  /* === WOCHENPLAN (dynamic, from API or fallback) === */
  var wpDays=['Sonntag','Montag','Dienstag','Mittwoch','Donnerstag','Freitag','Samstag'];
  var wpFallback={
    1:[{name:'Fleischpflanzerl mit Kartoffelpüree',price:'8,50'}],
    2:[{name:'Wiener Schnitzel mit Kartoffelsalat',price:'8,90'}],
    3:[{name:'Gulaschsuppe mit Semmel',price:'6,90'}],
    4:[{name:'Schweinebraten mit Knödel & Krautsalat',price:'9,50'}],
    5:[{name:'Backfisch mit Remoulade & Pommes',price:'8,90'}],
    6:[{name:'Leberkässemmel',price:'4,50'}]
  };

  function getKW(){
    var now=new Date();
    // Ab Samstag: nächste Woche anzeigen
    if(now.getDay()>=6){now.setDate(now.getDate()+(now.getDay()===6?2:1));}
    var d=new Date(Date.UTC(now.getFullYear(),now.getMonth(),now.getDate()));
    d.setUTCDate(d.getUTCDate()+4-(d.getUTCDay()||7));
    return Math.ceil((((d-new Date(Date.UTC(d.getUTCFullYear(),0,1)))/86400000)+1)/7);
  }

  function renderWP(menu){
    var todayIdx=new Date().getDay();
    var kwEl=document.getElementById('mob-wp-kw');
    if(kwEl) kwEl.textContent='Kalenderwoche '+getKW();
    var container=document.getElementById('mob-wp-days');
    if(!container) return;
    var html='';
    for(var i=1;i<=5;i++){
      var isToday=i===todayIdx;
      var dayData=menu[i]||[];
      var dishes=dayData.filter?dayData.filter(function(d){return d.name&&d.name.trim();}):dayData;
      var notice='';
      (menu[i]||[]).forEach(function(d){if(d.notice&&!notice) notice=d.notice;});
      html+='<div class="mob-wp-day'+(isToday?' today':'')+'">';
      html+='<div class="mob-wp-day-name">'+wpDays[i]+(isToday?' · Heute':'')+'</div>';
      if(dishes.length===0){
        if(notice){
          html+='<div class="mob-wp-day-menu" style="color:#888;font-style:italic">'+esc(notice)+'</div>';
        }else{
          html+='<div class="mob-wp-day-menu" style="color:#aaa">–</div>';
        }
      }else{
        dishes.forEach(function(d){
          html+='<div style="display:flex;justify-content:space-between;align-items:baseline;gap:8px">';
          html+='<div class="mob-wp-day-menu" style="flex:1">'+esc(d.name)+'</div>';
          html+='<div class="mob-wp-day-price" style="flex-shrink:0">€ '+fmtP(d.price)+'</div>';
          html+='</div>';
        });
      }
      html+='</div>';
    }
    container.innerHTML=html;
    // Update quick-action subtitle
    // After 14:00 or on Sunday, show next business day's dishes
    var sub=document.getElementById('mob-lunch-sub');
    var now=new Date();
    var hour=now.getHours();
    var showIdx=todayIdx;
    var label='Heute';
    var dayLabels=['Sonntag','Montag','Dienstag','Mittwoch','Donnerstag','Freitag','Samstag'];
    if(todayIdx===0||(todayIdx===6&&hour>=14)||hour>=14){
      // Next business day (Mon-Sat, skip Sunday)
      var next=todayIdx;
      do{next=next>=6?1:next+1;}while(next===0);
      showIdx=next;
      // Label: "Morgen" only if truly tomorrow, else day name
      var tomorrow=todayIdx>=6?(todayIdx===6?0:1):todayIdx+1;
      label=(next===tomorrow)?'Morgen':dayLabels[next];
    }
    var showDishes=(menu[showIdx]||[]).filter(function(d){return d.name&&d.name.trim();});
    if(sub&&showDishes.length>0){
      if(showDishes.length===1){
        sub.textContent=label+': '+showDishes[0].name;
      }else{
        sub.innerHTML='<span style="font-weight:800;display:block;margin-bottom:4px;color:rgba(255,255,255,0.9);font-size:0.85rem;text-transform:uppercase;letter-spacing:0.3px;">' + label + ':</span>' + 
          '<div style="display:flex;flex-direction:column;gap:4px;">' + 
          showDishes.map(function(d){
            return '<div style="display:flex;align-items:flex-start;gap:6px;font-size:0.8rem;line-height:1.25;">' + 
                   '<span style="color:#bd8b5c;font-size:1.1rem;line-height:1;margin-top:-4px;">&bull;</span>' + 
                   '<span style="flex:1;text-align:left;font-weight:600;color:rgba(255,255,255,0.95);white-space:normal;overflow:visible;">' + esc(d.name) + '</span>' + 
                   '</div>';
          }).join('') + '</div>';
      }
    }else if(sub&&hour>=14){
      sub.textContent='Morgen: Kein Gericht eingetragen';
    }
  }

  // Try API first, fallback to static
  // dayMap: supports both string labels and Dataverse choice integers
  var wpDayMap={montag:1,dienstag:2,mittwoch:3,donnerstag:4,freitag:5,samstag:6,
    101000:1,101001:2,101002:3,101003:4,101004:5,101005:6};
  fetch(API_BASE+'/wochenplan').then(function(r){return r.json();}).then(function(data){
    if(data&&data.success&&data.data&&data.data.length>0){
      // API already filters by target week date range (ab Samstag: nächste Woche)
      var menu={1:[],2:[],3:[],4:[],5:[],6:[]};
      data.data.forEach(function(item){
        var wt=item.dl_wochentag;
        var label=item._dl_wochentag_label;
        var dIdx=wpDayMap[wt]||wpDayMap[(label||'').toLowerCase()]||wpDayMap[(String(wt)||'').toLowerCase()];
        if(dIdx) menu[dIdx].push({name:item.dl_gericht||'',price:String(item.dl_preis||''),notice:item.dl_beschreibung||''});
      });
      renderWP(menu);
    }else{
      renderWP(wpFallback);
    }
  }).catch(function(){renderWP(wpFallback);});

  /* === ANGEBOTE (Kacheln im Popup) === */
  function renderMobAngebote(items){
    var grid=document.getElementById('mob-ang-grid');
    var kwEl=document.getElementById('mob-ang-kw');
    if(kwEl) kwEl.textContent='Diese Woche · KW '+getKW();
    var subEl=document.getElementById('mob-offers-sub');
    if(subEl&&items.length) subEl.textContent=items.length+' diese Woche';
    if(!grid) return;
    if(!items.length){grid.innerHTML='<p style="text-align:center;color:#6b7280;padding:20px">Aktuell keine Sonderangebote</p>';return;}
    var icons=['🥛','🧀','🍞','🥩','🍌','🥬','🥫','🍎'];
    var html='';
    items.forEach(function(a,idx){
      var pct='';
      if(a.statt>0&&a.preis>0){var p=Math.round((a.statt-a.preis)/a.statt*100);if(p>0) pct='-'+p+'%';}
      var pi=Math.floor(a.preis);var pf=Math.round((a.preis-pi)*100);
      var cs=pf<10?'0'+pf:String(pf);
      html+='<div class="mob-ang-item"'+(a.artnr?' data-artnr="'+esc(a.artnr)+'"':'')+'>';
      if(pct) html+='<div class="mob-ang-badge">'+pct+'</div>';
      html+='<div class="mob-ang-img"><span>'+(icons[idx%icons.length])+'</span></div>';
      html+='<div class="mob-ang-info">';
      html+='<div class="mob-ang-name">'+esc(a.produkt)+'</div>';
      if(a.details) html+='<div class="mob-ang-det">'+esc(a.details)+'</div>';
      html+='</div>';
      html+='<div class="mob-ang-tag">';
      html+='<div class="mob-ang-price">'+pi+','+cs+'<span class="euro">€</span></div>';
      if(a.statt) html+='<span class="mob-ang-statt">€ '+fmtP(a.statt)+'</span>';
      html+='</div>';
      html+='</div>';
    });
    grid.innerHTML=html;
    loadMobBilder(grid);
  }

  function fmtP(v){var n=Number(v);if(isNaN(n))return v;return n.toFixed(2).replace('.',',');}
  function esc(s){var d=document.createElement('div');d.textContent=s;return d.innerHTML;}

  // Use allAngebote from app.js if available, otherwise fetch
  function tryLoadAngebote(){
    if(window.allAngebote&&window.allAngebote.length){
      renderMobAngebote(window.allAngebote);
    }else{
      fetch(API_BASE+'/angebote?filter=today').then(function(r){return r.json();}).then(function(payload){
        var raw=payload;
        if(payload.data) raw=payload.data;
        if(!Array.isArray(raw)) raw=[raw];
        var items=raw.map(function(item){
          return{
            produkt:item.dl_produkt||item.name||'',
            details:item.dl_details||item.details||'',
            preis:item.dl_preis||item.price||0,
            statt:item.dl_statt_preis||item.old_price||0,
            artnr:item.dl_artikelnummer||item.artikelnummer||''
          };
        });
        renderMobAngebote(items);
      }).catch(function(){renderMobAngebote([]);});
    }
  }
  /* === WERBEBILDER nachladen === */
  var _mobBildCache={};
  function loadMobBilder(container){
    var items=container.querySelectorAll('.mob-ang-item[data-artnr]');
    if(!items.length) return;
    var toLoad=[];
    items.forEach(function(el){
      var nr=el.getAttribute('data-artnr');
      if(!nr) return;
      if(_mobBildCache[nr]){
        setMobBild(el,_mobBildCache[nr]);
        return;
      }
      toLoad.push(nr);
    });
    if(!toLoad.length) return;
    var unique=toLoad.filter(function(v,i,a){return a.indexOf(v)===i;});
    fetch(API_BASE+'/werbebilder?artnrs='+encodeURIComponent(unique.join(',')))
      .then(function(r){return r.json();})
      .then(function(data){
        (data||[]).forEach(function(r){if(r.dl_bild_base64) _mobBildCache[r.dl_artikelnummer]=r.dl_bild_base64;});
        items.forEach(function(el){
          var nr=el.getAttribute('data-artnr');
          if(_mobBildCache[nr]) setMobBild(el,_mobBildCache[nr]);
        });
      }).catch(function(e){console.log('MOB-BILDER:',e);});
  }
  function setMobBild(el,src){
    var div=el.querySelector('.mob-ang-img');
    if(!div||div.querySelector('img')) return;
    var img=document.createElement('img');
    img.src=src;
    img.alt='';
    img.style.cssText='width:100%;height:100%;object-fit:cover;border-radius:10px';
    div.innerHTML='';
    div.appendChild(img);
  }

  // Wait a bit for app.js to load angebote first
  setTimeout(tryLoadAngebote,1500);

  /* === NEWS TICKER (mobile top) – only items marked as Laufband === */
  fetch(API_BASE+'/news').then(function(r){return r.json();}).then(function(data){
    var items=data;
    if(data&&data.data) items=data.data;
    if(!Array.isArray(items)||!items.length) return;
    var laufband=items.filter(function(n){return !!n.dl_laufband;});
    if(!laufband.length) return;
    var tickerEl=document.getElementById('mob-ticker-content');
    if(!tickerEl) return;
    var sep='<span style="color:#f59e0b;margin:0 1.5em;font-size:14px">\u2605</span>';
    var html=laufband.map(function(n){
      var t=n.dl_titel||n.title||'';
      return '<span>'+t.replace(/&/g,'&amp;').replace(/</g,'&lt;')+'</span>';
    }).join(sep);
    tickerEl.innerHTML=html;
  }).catch(function(){});

  /* === PREISLISTE POPUP === */
  var plLoaded=false;
  var plAllItems=[];
  window.mobOpenPopup_preisliste_orig=window.mobOpenPopup;
  // Hook into popup open to lazy-load preisliste
  var origOpen=window.mobOpenPopup;
  window.mobOpenPopup=function(id){
    origOpen(id);
    if(id==='preisliste'&&!plLoaded){
      plLoaded=true;
      loadMobPreisliste();
    }
  };
  function loadMobPreisliste(){
    var grid=document.getElementById('mob-pl-grid');
    if(!grid) return;
    fetch(API_BASE+'/preisliste').then(function(r){return r.json();}).then(function(data){
      if(data.error){grid.innerHTML='<p style="color:#c00">Fehler: '+esc(data.error)+'</p>';return;}
      var groups=data.groups||{};
      var wgNames=Object.keys(groups).sort();
      plAllItems=[];
      var html='<p style="color:#6b7280;font-size:.8rem;margin-bottom:12px">'+data.total+' Artikel in '+data.warengruppen+' Warengruppen</p>';
      wgNames.forEach(function(wg){
        var items=groups[wg];
        html+='<div class="mob-pl-group">';
        html+='<button class="mob-pl-toggle" type="button"><span class="mob-pl-wg-name">'+esc(wg)+'</span><span class="mob-pl-count">'+items.length+'</span><span class="mob-pl-arrow">&#9660;</span></button>';
        html+='<div class="mob-pl-items" style="display:none">';
        items.forEach(function(item){
          var disc = item.discount || 0;
          if(item.uvp && item.uvp > 0 && item.vk > 0 && !disc){
            disc = Math.round((item.uvp - item.vk) / item.uvp * 100);
          }
          var is_rp = item.rp && disc >= 5 && disc <= 70;
          var cls=is_rp?'mob-pl-rp':'';
          if(item.angebot) cls+=' mob-pl-ang';
          var priceHtml=fmtP(item.vk)+' €';
          if(is_rp&&item.uvp){
            priceHtml+=' <span style="text-decoration:line-through;color:#999;font-size:.75rem">'+fmtP(item.uvp)+'€</span>';
            priceHtml+=' <span style="background:#c62828;color:#fff;padding:1px 5px;border-radius:6px;font-size:.65rem;font-weight:700">-'+disc+'%</span>';
          }
          if(item.angebot&&item.angebot_preis){
            priceHtml=fmtP(item.angebot_preis)+' € <span style="text-decoration:line-through;color:#999;font-size:.75rem">'+fmtP(item.vk)+'€</span>';
          }
          var bc=item.strichcode||'';
          html+='<div class="mob-pl-row '+cls+'" data-name="'+esc(item.bezeichnung).toLowerCase()+'" data-barcode="'+esc(bc)+'">';
          html+='<span class="mob-pl-name">'+esc(item.bezeichnung)+'</span>';
          html+='<span class="mob-pl-price">'+priceHtml+'</span>';
          html+='</div>';
          plAllItems.push({el:null,name:(item.bezeichnung||'').toLowerCase(),strichcode:item.strichcode||'',bezeichnung:item.bezeichnung||'',vk:item.vk,uvp:item.uvp,discount:item.discount||0,rp:item.rp,angebot:item.angebot,angebot_preis:item.angebot_preis,wg:wg});
        });
        html+='</div></div>';
      });
      grid.innerHTML=html;
      // Toggle groups
      grid.querySelectorAll('.mob-pl-toggle').forEach(function(btn){
        btn.addEventListener('click',function(){
          var items=this.nextElementSibling;
          var open=items.style.display!=='none';
          items.style.display=open?'none':'';
          this.querySelector('.mob-pl-arrow').textContent=open?'\u25BC':'\u25B2';
          this.classList.toggle('open',!open);
        });
      });
      // Wire up search + filter
      var searchInput=document.getElementById('mob-pl-search');
      var rows=grid.querySelectorAll('.mob-pl-row');
      var currentFilter='all';
      function applyPlFilters(){
        var q=searchInput?searchInput.value.toLowerCase().trim():'';
        rows.forEach(function(row){
          var nameMatch=!q||row.getAttribute('data-name').indexOf(q)!==-1;
          var filterMatch=currentFilter==='all'||(currentFilter==='rp'&&row.classList.contains('mob-pl-rp'))||(currentFilter==='ang'&&row.classList.contains('mob-pl-ang'));
          row.style.display=(nameMatch&&filterMatch)?'':'none';
        });
        grid.querySelectorAll('.mob-pl-group').forEach(function(g){
          var hasVisible=false;var visCount=0;
          g.querySelectorAll('.mob-pl-row').forEach(function(r){if(r.style.display!=='none'){hasVisible=true;visCount++;}});
          g.style.display=hasVisible?'':'none';
          var countBadge=g.querySelector('.mob-pl-count');
          if(countBadge) countBadge.textContent=visCount;
          var itemsDiv=g.querySelector('.mob-pl-items');
          var arrow=g.querySelector('.mob-pl-arrow');
          if((q||currentFilter!=='all')&&hasVisible){
            if(itemsDiv) itemsDiv.style.display='';
            if(arrow) arrow.textContent='\u25B2';
          }else if(!q&&currentFilter==='all'){
            if(itemsDiv) itemsDiv.style.display='none';
            if(arrow) arrow.textContent='\u25BC';
          }
        });
      }
      if(searchInput) searchInput.addEventListener('input',applyPlFilters);
      // Filter buttons
      document.querySelectorAll('.mob-pl-filter').forEach(function(btn){
        btn.addEventListener('click',function(){
          document.querySelectorAll('.mob-pl-filter').forEach(function(b){b.classList.remove('active');});
          this.classList.add('active');
          currentFilter=this.getAttribute('data-filter');
          applyPlFilters();
        });
      });
      initMobBarcodeScanner();
    }).catch(function(e){
      grid.innerHTML='<p style="color:#c00">Preisliste konnte nicht geladen werden.</p>';
    });
  }

  function initMobBarcodeScanner(){
    var scanBtn=document.getElementById('mob-pl-barcode-btn');
    var scannerDiv=document.getElementById('mob-pl-barcode-scanner');
    var readerDiv=document.getElementById('mob-pl-barcode-reader');
    var closeBtn=document.getElementById('mob-pl-barcode-close');
    var resultDiv=document.getElementById('mob-pl-barcode-result');
    if(!scanBtn||!scannerDiv)return;
    if(window._dlFeatScanner===false){scanBtn.style.display='none';return;}

    function findByBarcode(code){
      code=code.trim();
      var found=[];
      plAllItems.forEach(function(entry){
        if(entry.strichcode&&entry.strichcode.indexOf(code)!==-1)found.push(entry);
      });
      return found;
    }

    function showResult(code,matches){
      if(!matches.length){
        resultDiv.innerHTML='<div style="background:#fff3cd;border:1px solid #ffc107;border-radius:8px;padding:14px;font-size:.88rem;color:#856404;text-align:center">&#x26A0; Artikel mit EAN <b>'+esc(code)+'</b> nicht im Sortiment gefunden.</div>';
        resultDiv.style.display='block';return;
      }
      var h='<div style="background:#d4edda;border:1px solid #28a745;border-radius:8px;padding:14px;font-size:.88rem;color:#155724">';
      h+='<p style="margin:0 0 8px">&#x2705; '+matches.length+' Artikel f\u00fcr EAN <b>'+esc(code)+'</b> gefunden:</p>';
      matches.forEach(function(m){
        var preis=m.angebot&&m.angebot_preis?m.angebot_preis:m.vk;
        var disc=m.discount||0;
        if(m.uvp&&m.uvp>0&&m.vk>0&&!disc) disc=Math.round((m.uvp-m.vk)/m.uvp*100);
        var savingsHtml='';
        if(m.uvp&&m.uvp>0&&disc>5&&disc<=70){
          var saving=(m.uvp-m.vk);
          savingsHtml='<div style="margin-top:4px;display:flex;align-items:center;gap:6px;flex-wrap:wrap">';
          savingsHtml+='<span style="background:#c62828;color:#fff;padding:1px 6px;border-radius:6px;font-size:.72rem;font-weight:700">-'+disc+'%</span>';
          savingsHtml+='<span style="color:#999;font-size:.78rem;text-decoration:line-through">UVP '+fmtP(m.uvp)+' &euro;</span>';
          if(saving>0.004) savingsHtml+='<span style="color:#2e7d32;font-size:.78rem;font-weight:600">Sie sparen '+fmtP(saving)+' &euro;</span>';
          savingsHtml+='</div>';
        }
        var badges='';
        if(m.angebot) badges+='<span style="background:#ff6f00;color:#fff;padding:1px 6px;border-radius:6px;font-size:.7rem;font-weight:700;margin-right:4px">\u2B50 Angebot</span>';
        if(disc>5&&disc<=70) badges+='<span style="background:#2e7d32;color:#fff;padding:1px 6px;border-radius:6px;font-size:.7rem;font-weight:700">\uD83D\uDCB0 Ersparnis</span>';
        var badgesHtml=badges?'<div style="margin-top:3px">'+badges+'</div>':'';
        h+='<div style="background:#fff;border-radius:6px;padding:10px;margin-top:6px;display:flex;justify-content:space-between;align-items:start">';
        h+='<div><b>'+esc(m.bezeichnung)+'</b><br><small style="color:#888">'+esc(m.wg)+'</small>'+badgesHtml+savingsHtml+'</div>';
        var preisHtml='<div style="font-weight:700;white-space:nowrap;padding-top:2px;text-align:right">'+fmtP(preis)+' &euro;';
        if(m.angebot&&m.angebot_preis&&m.vk&&m.angebot_preis<m.vk) preisHtml+='<br><span style="text-decoration:line-through;color:#999;font-size:.75rem;font-weight:400">'+fmtP(m.vk)+' &euro;</span>';
        preisHtml+='</div>';
        h+=preisHtml+'</div>';
      });
      h+='</div>';
      resultDiv.innerHTML=h;resultDiv.style.display='block';
    }

    var _scanActive=false;
    function stopScanner(){
      if(_scanActive){
        Quagga.stop();
        _scanActive=false;
      }
      readerDiv.innerHTML='';
      scannerDiv.style.display='none';
    }

    function onBarcodeScanned(code){
      var matches=findByBarcode(code);
      if(matches.length){showResult(code,matches);return;}
      // Fallback: API lookup (bypasses 6-month filter)
      resultDiv.innerHTML='<div style="text-align:center;padding:14px;color:#666">Suche EAN '+esc(code)+' in Datenbank...</div>';
      resultDiv.style.display='block';
      fetch((window.API_BASE||'/api')+'/preisliste?barcode='+encodeURIComponent(code))
        .then(function(r){return r.json();})
        .then(function(data){
          if(data.results&&data.results.length){
            var apiMatches=[];
            data.results.forEach(function(r){apiMatches.push({bezeichnung:r.bezeichnung,vk:r.vk,wg:r.warengruppe,strichcode:r.strichcode,uvp:r.uvp||0,discount:r.discount||0,rp:r.rp,angebot:r.angebot,angebot_preis:r.angebot_preis});});
            showResult(code,apiMatches);
          }else{showResult(code,[]);}
        }).catch(function(){showResult(code,[]);});
    }

    scanBtn.addEventListener('click',function(){
      if(typeof Quagga==='undefined'){alert('Barcode-Scanner Library nicht geladen.');return;}
      resultDiv.style.display='none';resultDiv.innerHTML='';
      scannerDiv.style.display='block';
      Quagga.init({
        inputStream:{name:'Live',type:'LiveStream',target:readerDiv,
          constraints:{facingMode:'environment',width:{ideal:1280},height:{ideal:720}}},
        locator:{patchSize:'medium',halfSample:true},
        decoder:{readers:['ean_reader','ean_8_reader','upc_reader','upc_e_reader','code_128_reader']},
        locate:true,
        frequency:15
      },function(err){
        if(err){stopScanner();alert('Kamera konnte nicht ge\u00f6ffnet werden.\n'+err);return;}
        Quagga.start();
        _scanActive=true;
      });
      Quagga.offDetected();
      Quagga.onDetected(function(result){
        if(!result||!result.codeResult||!result.codeResult.code)return;
        // Confidence check: reject low-quality reads
        var errs=result.codeResult.decodedCodes;
        if(errs&&errs.length){
          var sumErr=0,cnt=0;
          errs.forEach(function(d){if(typeof d.error==='number'){sumErr+=d.error;cnt++;}});
          if(cnt>0&&(sumErr/cnt)>0.15)return; // avg error > 15% → skip
        }
        stopScanner();
        onBarcodeScanned(result.codeResult.code);
      });
    });

    closeBtn.addEventListener('click',function(){stopScanner();});
  }

  /* === CMS CONFIG (meat promo overrides) === */
  fetch(API_BASE+'/cms-config').then(function(r){return r.json();}).then(function(cfg){
    if(!cfg) return;
    var map={};
    (Array.isArray(cfg)?cfg:(cfg.data||[])).forEach(function(c){map[c.dl_schluessel||c.key]=c.dl_wert||c.value;});
    if(map.meatPct){var el=document.getElementById('mob-meat-pct');if(el) el.textContent=map.meatPct;}
    if(map.meatSub){var el2=document.getElementById('mob-meat-sub');if(el2) el2.textContent=map.meatSub;}
  }).catch(function(){});

})();
