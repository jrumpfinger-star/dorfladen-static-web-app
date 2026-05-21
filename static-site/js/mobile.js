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
    for(var i=1;i<=6;i++){
      var isToday=i===todayIdx;
      var dishes=menu[i]||[];
      html+='<div class="mob-wp-day'+(isToday?' today':'')+'">';
      html+='<div class="mob-wp-day-name">'+wpDays[i]+(isToday?' · Heute':'')+'</div>';
      if(dishes.length===0){
        html+='<div class="mob-wp-day-menu">–</div>';
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
    // After 14:00, show tomorrow's dishes instead
    var sub=document.getElementById('mob-lunch-sub');
    var now=new Date();
    var hour=now.getHours();
    var showIdx=todayIdx;
    var label='Heute';
    if(hour>=14){
      // Next weekday (Mon-Sat): Sun=0→Mon=1, Mon=1→Tue=2, ..., Fri=5→Sat=6, Sat=6→Mon=1
      showIdx=todayIdx>=6?1:todayIdx+1;
      label='Morgen';
    }
    var showDishes=menu[showIdx]||[];
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
      var menu={1:[],2:[],3:[],4:[],5:[],6:[]};
      (data.data||[]).forEach(function(item){
        var wt=item.dl_wochentag;
        var label=item._dl_wochentag_label;
        var dIdx=wpDayMap[wt]||wpDayMap[(label||'').toLowerCase()]||wpDayMap[(String(wt)||'').toLowerCase()];
        if(dIdx) menu[dIdx].push({name:item.dl_gericht||'',price:String(item.dl_preis||'')});
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
    var txt=laufband.map(function(n){
      var t=n.dl_titel||n.title||'';
      return t;
    }).join('     \u2605     ');
    tickerEl.textContent=txt;
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
          html+='<div class="mob-pl-row '+cls+'" data-name="'+esc(item.bezeichnung).toLowerCase()+'">';
          html+='<span class="mob-pl-name">'+esc(item.bezeichnung)+'</span>';
          html+='<span class="mob-pl-price">'+priceHtml+'</span>';
          html+='</div>';
          plAllItems.push({el:null,name:(item.bezeichnung||'').toLowerCase()});
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
    }).catch(function(e){
      grid.innerHTML='<p style="color:#c00">Preisliste konnte nicht geladen werden.</p>';
    });
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
