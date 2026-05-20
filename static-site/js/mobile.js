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
  var wpFallback=[null,
    {name:'Fleischpflanzerl mit Kartoffelpüree',price:'8,50'},
    {name:'Wiener Schnitzel mit Kartoffelsalat',price:'8,90'},
    {name:'Gulaschsuppe mit Semmel',price:'6,90'},
    {name:'Schweinebraten mit Knödel & Krautsalat',price:'9,50'},
    {name:'Backfisch mit Remoulade & Pommes',price:'8,90'},
    {name:'Leberkässemmel',price:'4,50'}
  ];

  function getKW(){
    var now=new Date();
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
      html+='<div class="mob-wp-day'+(isToday?' today':'')+'">';
      html+='<div class="mob-wp-day-name">'+wpDays[i]+(isToday?' · Heute':'')+'</div>';
      html+='<div class="mob-wp-day-menu">'+(menu[i]?menu[i].name:'–')+'</div>';
      html+='<div class="mob-wp-day-price">'+(menu[i]?'€ '+menu[i].price:'')+'</div>';
      html+='</div>';
    }
    container.innerHTML=html;
    // Update quick-action subtitle
    var sub=document.getElementById('mob-lunch-sub');
    if(sub&&menu[todayIdx]){
      sub.textContent='Heute: '+menu[todayIdx].name;
    }
  }

  // Try API first, fallback to static
  fetch(API_BASE+'/wochenplan').then(function(r){return r.json();}).then(function(data){
    if(data&&data.success&&data.data){
      var menu=[null];
      var dayMap={montag:1,dienstag:2,mittwoch:3,donnerstag:4,freitag:5,samstag:6};
      (data.data||[]).forEach(function(item){
        var dIdx=dayMap[(item.dl_wochentag||'').toLowerCase()];
        if(dIdx) menu[dIdx]={name:item.dl_gericht||'',price:item.dl_preis||''};
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
      fetch(API_BASE+'/angebote').then(function(r){return r.json();}).then(function(payload){
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

  /* === NEWS TICKER (mobile top) === */
  fetch(API_BASE+'/news').then(function(r){return r.json();}).then(function(data){
    var items=data;
    if(data&&data.data) items=data.data;
    if(!Array.isArray(items)||!items.length) return;
    var tickerEl=document.getElementById('mob-ticker-content');
    if(!tickerEl) return;
    var txt=items.map(function(n){
      var d=n.dl_datum||n.date||'';
      var t=n.dl_titel||n.title||'';
      return(d?d.substring(8,10)+'.'+d.substring(5,7)+'. ':'')+t;
    }).join(' \u00a0•\u00a0 ');
    tickerEl.textContent=txt;
  }).catch(function(){});

  /* === CMS CONFIG (meat promo overrides) === */
  fetch(API_BASE+'/cms-config').then(function(r){return r.json();}).then(function(cfg){
    if(!cfg) return;
    var map={};
    (Array.isArray(cfg)?cfg:(cfg.data||[])).forEach(function(c){map[c.dl_schluessel||c.key]=c.dl_wert||c.value;});
    if(map.meatPct){var el=document.getElementById('mob-meat-pct');if(el) el.textContent=map.meatPct;}
    if(map.meatSub){var el2=document.getElementById('mob-meat-sub');if(el2) el2.textContent=map.meatSub;}
  }).catch(function(){});

})();
