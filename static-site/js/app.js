/* ========================================
   Dorfladen Oberornau – Static Site JS
   All data loaded via Azure Function API
   ======================================== */

// API Base URL – Azure Function (SWA proxied via /api)
var API_BASE = '/api';

var DAYS = {101000:'Montag',101001:'Dienstag',101002:'Mittwoch',101003:'Donnerstag',101004:'Freitag',101005:'Samstag',101006:'Sonntag'};
var DAY_SHORT = {101000:'Mo',101001:'Di',101002:'Mi',101003:'Do',101004:'Fr',101005:'Sa',101006:'So'};

/* === Utility functions === */
function unwrapApiData(payload){
  if(Array.isArray(payload)) return payload;
  if(payload&&Array.isArray(payload.data)) return payload.data;
  if(payload&&Array.isArray(payload.value)) return payload.value;
  return [];
}
function pad(n){return n<10?'0'+n:String(n);}
function esc(s){var d=document.createElement('div');d.textContent=s;return d.innerHTML;}
function fmtTime(t){
  if(!t) return '';
  return t;
}
function fmtDE(d){return pad(d.getDate())+'.'+pad(d.getMonth()+1)+'.'+d.getFullYear();}
function fmtPrice(v){var i=Math.floor(v);var f=Math.round((v-i)*100);return i+','+(f<10?'0':'')+f+' \u20AC';}

/* === Global Confirm Dialog – loaded from /js/dl-confirm.js === */
/* If dl-confirm.js is not already loaded, inject it dynamically */
if(typeof window.dlConfirm!=='function'){
  var _s=document.createElement('script');_s.src='/js/dl-confirm.js';document.head.appendChild(_s);
}

/* === Cookie Banner === */
(function(){
  if(!localStorage.getItem('dl_cookies')&&!sessionStorage.getItem('dl_cookies_declined')){
    document.getElementById('cookieBar').classList.add('show');
  }
})();

/* === CMS Config from API === */
window._dlFlagsReady=new Promise(function(resolveFlags){
(function(){
  fetch(API_BASE+'/cms-config')
    .then(function(r){return r.json();})
    .then(function(payload){
      var config=(payload&&payload.data)?payload.data:payload;
      if(!config || Object.keys(config).length===0){resolveFlags();return;}
      window._dlCmsConfig=config;
      console.log('CMS Config loaded:', config);
      
      // Apply Hero texts from Dataverse CMS
      var heroH1=document.querySelector('.hero-text h1');
      var heroP=document.querySelector('.hero-text > p:not(.hero-sub)');
      var heroSub=document.querySelector('.hero-text .hero-sub');
      var titel=config['Hero \u00dcberschrift']||config['hero_titel'];
      var untertitel=config['Hero Untertitel']||config['hero_untertitel'];
      var zusatz=config['Hero Zusatztext']||config['hero_sub'];
      if(titel && heroH1) heroH1.textContent=titel;
      if(untertitel && heroP) heroP.textContent=untertitel;
      if(zusatz && heroSub) heroSub.textContent=zusatz;

      // Apply homepage layout configuration
      var homeCfg = config['home'] || config['homepage'] || {};
      if(homeCfg.show_weeklyplan!==undefined){
        var wpCard=document.getElementById('wp-card');
        if(wpCard) wpCard.style.display=homeCfg.show_weeklyplan?'':'none';
      }
      if(homeCfg.template){
        document.documentElement.setAttribute('data-template', homeCfg.template);
      }
      if(homeCfg.layout){
        document.documentElement.setAttribute('data-layout', homeCfg.layout);
      }
      // Bestellschluss (default 10:30 = 10.5h)
      var bsRaw=config['bestellschluss_uhr']||(homeCfg&&homeCfg.bestellschluss_uhr)||'';
      if(bsRaw){
        var bsParts=String(bsRaw).split(':');
        var bsH=parseInt(bsParts[0],10),bsM=parseInt(bsParts[1]||'0',10);
        if(!isNaN(bsH)) window._dlBestellschluss=bsH+bsM/60;
      }
      // Store feature flags globally
      var ff=config['feature_flags']||config.feature_flags;
      if(typeof ff==='string'){try{ff=JSON.parse(ff);}catch(e){ff={};}}
      if(ff) window._dlFeatureFlags=ff;
      // Staging: alle Features aktivieren
      if(location.hostname.indexOf('witty-island')>=0){
        if(!window._dlFeatureFlags) window._dlFeatureFlags={};
        ['push','barcode','orders','mittagstisch','wp_images','social_poster'].forEach(function(k){window._dlFeatureFlags[k]=true;});
      }
      resolveFlags();
    })
    .catch(function(e){console.log('CMS Config fetch failed:', e);resolveFlags();});
})();
});

/* === CMS Config (dl_homepage_cfg + dl_hp_design_config from localStorage) === */
(function(){
  try{
    var raw=localStorage.getItem('dl_homepage_cfg');
    if(!raw) raw=localStorage.getItem('dl_hp_design_config');
    if(!raw) return;
    var c=JSON.parse(raw);
    // Apply gradient colors as CSS custom properties
    var gradKeys=['priColor','priHover','accColor','bgColor'];
    var gradCss=[];
    function buildGrad(k){
      if(!c[k+'_grad'])return c[k]||'';
      var c1=c[k],c2=c[k+'_c2']||c1,dir=c[k+'_dir']||'to bottom',pct=c[k+'_pct']!=null?c[k+'_pct']:50;
      return 'linear-gradient('+dir+', '+c1+' 0%, '+c1+' '+pct+'%, '+c2+' 100%)';
    }
    var priGrad=buildGrad('priColor');
    var hoverGrad=buildGrad('priHover');
    var accGrad=buildGrad('accColor');
    var bgGrad=buildGrad('bgColor');
    if(priGrad){
      var isPriG=c.priColor_grad;
      gradCss.push(':root{--pri-color:'+c.priColor+';--pri-bg:'+(isPriG?priGrad:c.priColor)+'}');
      gradCss.push('.btn-primary,.cms-btn-primary{background:'+(isPriG?priGrad:c.priColor)+'!important;border-color:'+c.priColor+'!important}');
      gradCss.push('.navbar,.wp-header,.info-section-header{background:'+(isPriG?priGrad:c.priColor)+'!important}');
    }
    if(hoverGrad){
      var isHovG=c.priHover_grad;
      gradCss.push(':root{--pri-hover:'+(isHovG?hoverGrad:c.priHover)+'}');
      gradCss.push('.btn-primary:hover,.cms-btn-primary:hover{background:'+(isHovG?hoverGrad:c.priHover)+'!important}');
    }
    if(accGrad){
      var isAccG=c.accColor_grad;
      gradCss.push(':root{--acc-color:'+c.accColor+';--acc-bg:'+(isAccG?accGrad:c.accColor)+'}');
      gradCss.push('.badge-accent,.tag-aktion,.promo-badge{background:'+(isAccG?accGrad:c.accColor)+'!important}');
    }
    if(bgGrad){
      var isBgG=c.bgColor_grad;
      // Nur im Light Mode anwenden – im Dark Mode bleibt der dunkle Body-Hintergrund (style.css) erhalten
      gradCss.push('html[data-theme="light"] body{background:'+(isBgG?bgGrad:c.bgColor)+'!important}');
    }
    if(c.textColor)gradCss.push('html[data-theme="light"] body{color:'+c.textColor+'!important}');
    if(gradCss.length){var gs=document.createElement('style');gs.id='hp-grad-colors';gs.textContent=gradCss.join('');document.head.appendChild(gs);}
    var wpCss=[];
    // Template-specific colors: resolve from wpTplColors or fallback to flat values
    var tpl=c.wpHomeTemplate||'classic-red';
    var tplDefaults={'classic-red':{wpHeaderFrom:'#5ea88a',wpHeaderTo:'#4a8e73',wpDishColor:'#1a1a1a',wpPriceColor:'#2d7a5e',wpStripeColor:'#f0f7f0',wpDayColor:'#5ea88a',wpBgColor:'#ffffff',wpHeaderDir:'135deg'},'clean-white':{wpHeaderFrom:'#f3f4f6',wpHeaderTo:'#e5e7eb',wpDishColor:'#111827',wpPriceColor:'#374151',wpStripeColor:'#f9fafb',wpDayColor:'#111827',wpBgColor:'#ffffff',wpHeaderDir:'135deg'},'dark-modern':{wpHeaderFrom:'#1e40af',wpHeaderTo:'#1e3a8a',wpDishColor:'#f1f5f9',wpPriceColor:'#93c5fd',wpStripeColor:'#1e293b',wpDayColor:'#60a5fa',wpBgColor:'#0f172a',wpHeaderDir:'135deg'},'tafel':{wpHeaderFrom:'#2d5a3f',wpHeaderTo:'#1a3c28',wpDishColor:'#e8e0d0',wpPriceColor:'#c8b898',wpStripeColor:'#1e4430',wpDayColor:'#e8e0d0',wpBgColor:'#1a3c28',wpHeaderDir:'135deg'},'bento':{wpHeaderFrom:'#5ea88a',wpHeaderTo:'#4a8e73',wpDishColor:'#1e293b',wpPriceColor:'#059669',wpStripeColor:'#f0fdf4',wpDayColor:'#059669',wpBgColor:'#f8fafc',wpHeaderDir:'135deg'},'timeline':{wpHeaderFrom:'#0284c7',wpHeaderTo:'#0369a1',wpDishColor:'#0f172a',wpPriceColor:'#0284c7',wpStripeColor:'#f0f9ff',wpDayColor:'#0284c7',wpBgColor:'#f0f9ff',wpHeaderDir:'135deg'},'zeitung':{wpHeaderFrom:'#292524',wpHeaderTo:'#1c1917',wpDishColor:'#1c1917',wpPriceColor:'#44403c',wpStripeColor:'#fafaf9',wpDayColor:'#44403c',wpBgColor:'#fafaf9',wpHeaderDir:'to right'}};
    var td=tplDefaults[tpl]||tplDefaults['classic-red'];
    var tc=(c.wpTplColors&&c.wpTplColors[tpl])||{};
    var hFrom=tc.wpHeaderFrom||td.wpHeaderFrom;
    var hTo=tc.wpHeaderTo||td.wpHeaderTo;
    var dishC=tc.wpDishColor||td.wpDishColor;
    var priceC=tc.wpPriceColor||td.wpPriceColor;
    var stripeC=tc.wpStripeColor||td.wpStripeColor;
    var dayC=tc.wpDayColor||td.wpDayColor;
    var bgC=tc.wpBgColor||td.wpBgColor;
    var hDir=tc.wpHeaderDir||td.wpHeaderDir||'135deg';
    wpCss.push('.wp-header{background:linear-gradient('+hDir+','+hFrom+' 0%,'+hTo+' 100%)!important}');
    wpCss.push('.wp-day{color:'+dayC+'!important}');
    wpCss.push('.wp-dish{color:'+dishC+'!important}');
    wpCss.push('.wp-price{color:'+priceC+'!important}');
    wpCss.push('.wp-row:nth-child(even){background:'+stripeC+'!important}');
    wpCss.push('#wp-card .card-body,#wp-card{background:'+bgC+'!important}');
    if(c.wpDishFontSize&&c.wpDishFontSize!==0.92)wpCss.push('.wp-dish{font-size:'+c.wpDishFontSize+'rem!important}');
    if(c.wpPriceFontSize&&c.wpPriceFontSize!==0.92)wpCss.push('.wp-price{font-size:'+c.wpPriceFontSize+'rem!important}');
    if(wpCss.length){var ws=document.createElement('style');ws.id='wp-tpl-colors';ws.textContent=wpCss.join('');document.head.appendChild(ws);}
    var hide=[];
    if(c.showTopbar===false)hide.push('#hp-topbar');
    if(c.showPromoBar===false)hide.push('#hp-promo-bar');
    if(c.showMeatPromo===false)hide.push('#fleisch-aktion');
    if(c.showDoGehIHi===false)hide.push('#hp-dgih');
    if(c.showInfoCards===false)hide.push('#hp-info-cards');
    if(c.showWhatsApp===false)hide.push('#hp-wa-float');
    if(c.showCookie===false)hide.push('#cookieBar');
    if(c.wpShowCard===false)hide.push('#wp-card');
    if(c.wpShowOeko===false)hide.push('#wp-oeko');
    if(c.wpShowVorbestell===false)hide.push('#wp-vorbestell');
    if(c.wpShowPhone===false)hide.push('#wp-phone');
    if(c.wpShowWaInfo===false)hide.push('#wp-wa-info');
    if(hide.length){
      var hs=document.createElement('style');hs.textContent=hide.join(',')+'{display:none!important}';document.head.appendChild(hs);
    }
    // Meat promo parametrization
    if(c.meatPct){
      var pctEl=document.getElementById('meat-pct');
      if(pctEl)pctEl.innerHTML=c.meatPct+'\u2009% Rabatt';
    }
    if(c.meatTitle){var mt=document.getElementById('meat-title');if(mt)mt.innerHTML=c.meatTitle;}
    if(c.meatSub){var ms=document.getElementById('meat-sub');if(ms)ms.innerHTML=c.meatSub;}
    if(c.meatCta){var mc=document.getElementById('meat-cta');if(mc)mc.textContent=c.meatCta;}
    if(c.meatTag){var tg=document.getElementById('meat-tag');if(tg)tg.textContent=c.meatTag;}
    if(c.meatPhone){var mc2=document.getElementById('meat-cta');if(mc2)mc2.href='tel:'+c.meatPhone;}
    if(c.meatBadge){var mb=document.getElementById('meat-badge');if(mb)mb.textContent=c.meatBadge;}
  }catch(e){}
})();

/* === Hero Overlay + WP Template Colors from CMS Design Config === */
(function(){
  var tplDefaults={'classic-red':{wpHeaderFrom:'#5ea88a',wpHeaderTo:'#4a8e73',wpDishColor:'#1a1a1a',wpPriceColor:'#2d7a5e',wpStripeColor:'#f0f7f0',wpDayColor:'#5ea88a',wpBgColor:'#ffffff',wpHeaderDir:'135deg'},'clean-white':{wpHeaderFrom:'#f3f4f6',wpHeaderTo:'#e5e7eb',wpDishColor:'#111827',wpPriceColor:'#374151',wpStripeColor:'#f9fafb',wpDayColor:'#111827',wpBgColor:'#ffffff',wpHeaderDir:'135deg'},'dark-modern':{wpHeaderFrom:'#1e40af',wpHeaderTo:'#1e3a8a',wpDishColor:'#f1f5f9',wpPriceColor:'#93c5fd',wpStripeColor:'#1e293b',wpDayColor:'#60a5fa',wpBgColor:'#0f172a',wpHeaderDir:'135deg'},'tafel':{wpHeaderFrom:'#2d5a3f',wpHeaderTo:'#1a3c28',wpDishColor:'#e8e0d0',wpPriceColor:'#c8b898',wpStripeColor:'#1e4430',wpDayColor:'#e8e0d0',wpBgColor:'#1a3c28',wpHeaderDir:'135deg'},'bento':{wpHeaderFrom:'#5ea88a',wpHeaderTo:'#4a8e73',wpDishColor:'#1e293b',wpPriceColor:'#059669',wpStripeColor:'#f0fdf4',wpDayColor:'#059669',wpBgColor:'#f8fafc',wpHeaderDir:'135deg'},'timeline':{wpHeaderFrom:'#0284c7',wpHeaderTo:'#0369a1',wpDishColor:'#0f172a',wpPriceColor:'#0284c7',wpStripeColor:'#f0f9ff',wpDayColor:'#0284c7',wpBgColor:'#f0f9ff',wpHeaderDir:'135deg'},'zeitung':{wpHeaderFrom:'#292524',wpHeaderTo:'#1c1917',wpDishColor:'#1c1917',wpPriceColor:'#44403c',wpStripeColor:'#fafaf9',wpDayColor:'#44403c',wpBgColor:'#fafaf9',wpHeaderDir:'to right'}};
  function applyWpTplColors(c){
    if(!c)return;
    var tpl=c.wpHomeTemplate||'classic-red';
    var td=tplDefaults[tpl]||tplDefaults['classic-red'];
    var tc=(c.wpTplColors&&c.wpTplColors[tpl])||{};
    var css=[];
    var hDir=tc.wpHeaderDir||td.wpHeaderDir||'135deg';
    css.push('.wp-header{background:linear-gradient('+hDir+','+(tc.wpHeaderFrom||td.wpHeaderFrom)+' 0%,'+(tc.wpHeaderTo||td.wpHeaderTo)+' 100%)!important}');
    css.push('.wp-day{color:'+(tc.wpDayColor||td.wpDayColor)+'!important}');
    css.push('.wp-dish{color:'+(tc.wpDishColor||td.wpDishColor)+'!important}');
    css.push('.wp-price{color:'+(tc.wpPriceColor||td.wpPriceColor)+'!important}');
    css.push('.wp-row:nth-child(even){background:'+(tc.wpStripeColor||td.wpStripeColor)+'!important}');
    css.push('#wp-card .card-body,#wp-card{background:'+(tc.wpBgColor||td.wpBgColor)+'!important}');
    var s=document.getElementById('wp-tpl-colors');
    if(!s){s=document.createElement('style');s.id='wp-tpl-colors';document.head.appendChild(s);}
    s.textContent=css.join('');
  }
  function applyHeroCfg(c){
    if(!c) return;
    var ov=c.heroOverlay!=null?c.heroOverlay:50;
    var leftOp=(ov/100).toFixed(2);
    var rightOp=Math.max(0,(ov/100-0.45)).toFixed(2);
    var css='.mob-hero::before{background:linear-gradient(to right,rgba(250,249,246,'+leftOp+') 40%,rgba(250,249,246,'+rightOp+') 100%)!important}';
    if(c.heroFontSize&&c.heroFontSize!==2) css+='.mob-hero h1{font-size:'+c.heroFontSize+'rem!important}';
    var s=document.getElementById('hero-overlay-style');
    if(!s){s=document.createElement('style');s.id='hero-overlay-style';document.head.appendChild(s);}
    s.textContent=css;
    applyWpTplColors(c);
  }
  try{
    var raw=localStorage.getItem('dl_hp_design_config');
    if(raw) applyHeroCfg(JSON.parse(raw));
  }catch(e){}
  var angTplDefaults={
    'classic-red':{cardBg:'#ffffff',cardBorder:'#eeeeee',imgBg:'#ffffff',textColor:'#1a1a1a',detailsColor:'#444444',tagColor:'#a51d2d'},
    'minimal-clean':{cardBg:'#ffffff',cardBorder:'#e5e7eb',imgBg:'#ffffff',textColor:'#1a1a1a',detailsColor:'#444444',tagColor:'#047857'},
    'dark-modern':{cardBg:'#f5f5f5',cardBorder:'#94a3b8',imgBg:'#ffffff',textColor:'#111827',detailsColor:'#334155',tagColor:'#0ea5e9'},
    'organic-market':{cardBg:'#fffdf8',cardBorder:'#e9dfcf',imgBg:'#ffffff',textColor:'#2f3d2f',detailsColor:'#6b5b48',tagColor:'#8b1e3f'},
    'bold-poster':{cardBg:'#fffaf2',cardBorder:'#fdba74',imgBg:'#ffffff',textColor:'#7c2d12',detailsColor:'#9a3412',tagColor:'#ea580c'},
    'modern-magazine':{cardBg:'#f6fbf5',cardBorder:'#d2e0cf',imgBg:'#ffffff',textColor:'#2c3a2a',detailsColor:'#5b6d54',tagColor:'#6f835f'}
  };
  function applyOfferTileColors(dc){
    if(!dc)return;
    var tpl=dc.plakatTemplate||'classic-red';
    var ad=angTplDefaults[tpl]||angTplDefaults['classic-red'];
    var ov=(dc.tplColors&&dc.tplColors[tpl])||{};
    var v=function(k){return ov[k]||ad[k];};
    var css=[];
    css.push('.ang-img{background:'+v('imgBg')+'!important}');
    css.push('.ang-item{background:'+v('cardBg')+'!important;border-color:'+v('cardBorder')+'!important}');
    css.push('.ang-name{color:'+v('textColor')+'!important}');
    css.push('.ang-det{color:'+v('detailsColor')+'!important}');
    css.push('.ang-tag .ang-tag-inner{background:'+v('tagColor')+'!important}');
    var s=document.getElementById('ang-tile-colors');
    if(!s){s=document.createElement('style');s.id='ang-tile-colors';document.head.appendChild(s);}
    s.textContent=css.join('');
  }
  try{
    var dcRaw=localStorage.getItem('dl_design_config');
    if(dcRaw) applyOfferTileColors(JSON.parse(dcRaw));
  }catch(e){}
  // Reuse the single cms-config fetch from _dlFlagsReady
  (window._dlFlagsReady||Promise.resolve()).then(function(){
      var d=window._dlCmsConfig;
      if(!d) return;
      var hc=d['hp_design_config'];
      if(hc&&typeof hc==='object'){
        applyHeroCfg(hc);
        try{localStorage.setItem('dl_hp_design_config',JSON.stringify(hc));}catch(e){}
      }
      var dc=d['design_config'];
      if(dc&&typeof dc==='object'){
        applyOfferTileColors(dc);
        try{localStorage.setItem('dl_design_config',JSON.stringify(dc));}catch(e){}
      }
    });
})();

/* === Öffnungsstatus: Jetzt geöffnet / geschlossen === */
(function(){
  var schedule = {
    1: [390, 840, 990, 1140],  // Mo: 06:30-14:00, 16:30-19:00
    2: [390, 840, null, null],  // Di: 06:30-14:00
    3: [390, 840, 990, 1140],  // Mi: 06:30-14:00, 16:30-19:00
    4: [390, 840, 990, 1140],  // Do: 06:30-14:00, 16:30-19:00
    5: [390, 840, 990, 1140],  // Fr: 06:30-14:00, 16:30-19:00
    6: [420, 780, null, null],  // Sa: 07:00-13:00
    0: null                     // So: geschlossen
  };
  function getBayernHolidays(y){
    var a=y%19, b=Math.floor(y/100), c=y%100, d=Math.floor(b/4), e=b%4;
    var f=Math.floor((b+8)/25), g=Math.floor((b-f+1)/3), h=(19*a+b-d-g+15)%30;
    var i=Math.floor(c/4), k=c%4, l=(32+2*e+2*i-h-k)%7;
    var m=Math.floor((a+11*h+22*l)/451), month=Math.floor((h+l-7*m+114)/31), day=(h+l-7*m+114)%31+1;
    var easter=new Date(y,month-1,day);
    function addDays(d,n){var r=new Date(d);r.setDate(r.getDate()+n);return r;}
    function fmt(d){return d.getFullYear()+'-'+(d.getMonth()+1<10?'0':'')+(d.getMonth()+1)+'-'+(d.getDate()<10?'0':'')+d.getDate();}
    var hols = [];
    hols.push(fmt(new Date(y,0,1)));
    hols.push(fmt(new Date(y,0,6)));
    hols.push(fmt(addDays(easter,-2)));
    hols.push(fmt(easter));
    hols.push(fmt(addDays(easter,1)));
    hols.push(fmt(new Date(y,4,1)));
    hols.push(fmt(addDays(easter,39)));
    hols.push(fmt(addDays(easter,49)));
    hols.push(fmt(addDays(easter,50)));
    hols.push(fmt(addDays(easter,60)));
    hols.push(fmt(new Date(y,7,15)));
    hols.push(fmt(new Date(y,9,3)));
    hols.push(fmt(new Date(y,10,1)));
    hols.push(fmt(new Date(y,11,25)));
    hols.push(fmt(new Date(y,11,26)));
    return hols;
  }
  function updateStatus(){
    var el=document.getElementById('dl-open-status');
    if(!el) return;
    var now=new Date();
    var y=now.getFullYear();
    var holidays=getBayernHolidays(y);
    var todayStr=y+'-'+(now.getMonth()+1<10?'0':'')+(now.getMonth()+1)+'-'+(now.getDate()<10?'0':'')+now.getDate();
    var isHoliday=holidays.indexOf(todayStr)!==-1;
    var dow=now.getDay();
    var mins=now.getHours()*60+now.getMinutes();
    var s=schedule[dow];
    var isOpen=false;
    var closeAt='';
    var nextOpen='';
    if(!isHoliday && s){
      if(mins>=s[0] && mins<s[1]){isOpen=true;var _r=s[1]-mins;closeAt=(_r<=60?'schlie\u00dft in '+_r+' Min':'bis '+Math.floor(s[1]/60)+':'+(s[1]%60<10?'0':'')+(s[1]%60)+' Uhr');}
      else if(s[2]!==null && mins>=s[2] && mins<s[3]){isOpen=true;var _r2=s[3]-mins;closeAt=(_r2<=60?'schlie\u00dft in '+_r2+' Min':'bis '+Math.floor(s[3]/60)+':'+(s[3]%60<10?'0':'')+(s[3]%60)+' Uhr');}
    }
    if(!isOpen){
      for(var i=0;i<7;i++){
        var checkDow=(dow+i)%7;
        var cs=schedule[checkDow];
        if(!cs) continue;
        if(i===0 && !isHoliday){
          if(mins<cs[0]){var _d=cs[0]-mins;var _t=_d<60?'in '+_d+' Min':'in '+Math.floor(_d/60)+' Std';nextOpen='\u00f6ffnet '+_t+' ('+Math.floor(cs[0]/60)+':'+(cs[0]%60<10?'0':'')+(cs[0]%60)+' Uhr)';break;}
          if(cs[2]!==null && mins<cs[2]){var _d2=cs[2]-mins;var _t2=_d2<60?'in '+_d2+' Min':'in '+Math.floor(_d2/60)+' Std';nextOpen='\u00f6ffnet '+_t2+' ('+Math.floor(cs[2]/60)+':'+(cs[2]%60<10?'0':'')+(cs[2]%60)+' Uhr)';break;}
        }
        if(i>0){
          var dayNames=['Sonntag','Montag','Dienstag','Mittwoch','Donnerstag','Freitag','Samstag'];
          var futureDate=new Date(now);futureDate.setDate(now.getDate()+i);
          var fStr=futureDate.getFullYear()+'-'+(futureDate.getMonth()+1<10?'0':'')+(futureDate.getMonth()+1)+'-'+(futureDate.getDate()<10?'0':'')+futureDate.getDate();
          if(holidays.indexOf(fStr)!==-1) continue;
          nextOpen='\u00f6ffnet '+(i===1?'morgen':dayNames[checkDow])+' um '+Math.floor(cs[0]/60)+':'+(cs[0]%60<10?'0':'')+(cs[0]%60)+' Uhr';
          break;
        }
      }
    }
    if(isOpen){
      el.innerHTML='<div class="dl-status dl-status-open"><span class="dl-status-dot"></span>Jetzt ge\u00f6ffnet<span class="dl-status-next">\u2013 '+closeAt+'</span></div>';
    } else {
      var extra=nextOpen?('<span class="dl-status-next">\u2013 '+nextOpen+'</span>'):(isHoliday?'<span class="dl-status-next">\u2013 Feiertag</span>':'');
      el.innerHTML='<div class="dl-status dl-status-closed"><span class="dl-status-dot"></span>Geschlossen'+extra+'</div>';
    }
  }
  updateStatus();
  setInterval(updateStatus,60000);
})();

/* ========================================
   DATA LOADING VIA AZURE FUNCTION API
   ======================================== */

/* === Wochenplan loader === */
(function(){
  // Fetch wochenplan and feature flags in parallel, render only when both ready
  var flagsReady=window._dlFlagsReady||Promise.resolve();
  var wpData=fetch(API_BASE+'/wochenplan').then(function(r){return r.json();});
  Promise.all([wpData,flagsReady])
    .then(function(results){var response=results[0];
      var items=unwrapApiData(response).map(function(item){
        return {
          id:item.id||item.dl_wochenplanid||item.dl_wochenplansid||'',
          gericht:item.dl_gericht||item.gericht||'',
          wochentag:item.dl_wochentag!=null?item.dl_wochentag:item.wochentag,
          preis:item.dl_preis!=null?item.dl_preis:item.preis,
          beschreibung:item.dl_beschreibung||item.beschreibung||'',
          allergene:item.dl_allergene||item.allergene||'',
          datum:item.dl_datum||item.datum||'',
          kalenderwoche:item.dl_kalenderwoche!=null?item.dl_kalenderwoche:item.kalenderwoche
        };
      });
      if(!items||!items.length){
        document.getElementById('wp-subtitle').textContent='Kein aktueller Wochenplan';
        document.getElementById('wp-body').innerHTML='<div style="padding:20px;text-align:center;color:#888;font-style:italic">Aktuell kein Wochenplan verf\u00fcgbar. Unser Mittagstisch-Angebot findet ihr in der WhatsApp-Gruppe.</div>';
        return;
      }
      // API already filters by target week (ab Samstag: nächste Woche)
      var meals=items;
      // Compute target week Monday (same logic as API)
      var now=new Date();
      if(now.getDay()===0||now.getDay()===6){now.setDate(now.getDate()+(now.getDay()===0?1:2));}
      // Monday of target week
      var dayOfWeek=(now.getDay()+6)%7; // 0=Mo,1=Di,...,6=So
      var monday=new Date(now.getFullYear(),now.getMonth(),now.getDate()-dayOfWeek);
      var friday=new Date(monday);friday.setDate(monday.getDate()+4);
      // ISO week number
      var tmp=new Date(monday.getTime());
      tmp.setDate(tmp.getDate()+3);
      var week1=new Date(tmp.getFullYear(),0,4);
      week1.setDate(week1.getDate()+3-(week1.getDay()+6)%7);
      var curKw=1+Math.round((tmp-week1)/604800000);
      // Subtitle with Mo-Fr date range
      var sub=document.getElementById('wp-subtitle');
      if(meals.length>0){
        var kwText='KW '+curKw+' \u00B7 ';
        var y1=String(monday.getFullYear()).slice(-2);
        var y2=String(friday.getFullYear()).slice(-2);
        sub.textContent=kwText+pad(monday.getDate())+'.'+pad(monday.getMonth()+1)+'.'+y1+' \u2013 '+pad(friday.getDate())+'.'+pad(friday.getMonth()+1)+'.'+y2;
      }else{
        sub.textContent='KW '+curKw+' \u2013 noch keine Eintr\u00E4ge';
        document.getElementById('wp-body').innerHTML='<div style="padding:20px;text-align:center;color:#888;font-style:italic">F\u00fcr KW '+curKw+' ist noch kein Wochenplan eingetragen.</div>';
        return;
      }
      // Group by day
      var byDay={};
      meals.forEach(function(g){
        var dc=g.wochentag;
        if(!byDay[dc]) byDay[dc]=[];
        byDay[dc].push(g);
      });
      var todayIdx = new Date().getDay(); // 0=So, 1=Mo, ..., 6=Sa
      var isWeekend = todayIdx === 0 || todayIdx === 6;
      var todayDc = 101000 + (todayIdx === 0 ? 6 : todayIdx - 1); // map to 101000-101006
      var currentHour = new Date().getHours();
      // Always show Mon-Fri (101000-101004)
      var weekDays=[101000,101001,101002,101003,101004];

      var _wpImgs=window._dlFeatureFlags&&window._dlFeatureFlags.wp_images;
      var html='<table class="wp-table'+(_wpImgs?' wp-has-imgs':'')+'"><thead><tr><th class="wp-th-day"></th>'+(_wpImgs?'<th class="wp-th-img"></th>':'')+'<th></th><th class="wp-th-price">Verzehr im Laden<br><small>oder zum Mitnehmen</small></th></tr></thead><tbody>';
      weekDays.forEach(function(dc,dIdx){
        var dayMeals=byDay[dc]||[];
        var day=DAYS[dc]||'?';
        var grp=dIdx%2===0?'wp-grp-even':'wp-grp-odd';
        // Am Wochenende zeigt API nächste Woche → kein Tag ist vergangen
        var isToday=!isWeekend&&dc===todayDc;
        var isPast=!isWeekend&&dc<todayDc;
        // Bestellschluss: heute bis konfigurierbarer Uhrzeit, zukünftige Tage erlaubt, vergangene nicht
        var _bsCut=window._dlBestellschluss||10.5;
        var canOrder=isToday?((currentHour+new Date().getMinutes()/60)<_bsCut):(!isPast);
        var notice='';
        dayMeals.forEach(function(g){if(g.beschreibung&&!notice) notice=g.beschreibung;});
        var realMeals=dayMeals.filter(function(g){return g.gericht&&g.gericht.trim()&&g.preis;});
        if(!notice){dayMeals.forEach(function(g){if(g.gericht&&g.gericht.trim()&&!g.preis&&!notice) notice=g.gericht;});}
        var pastStyle=isPast?' style="opacity:.45"':'';
        if(realMeals.length===0){
          var cls=grp+(isToday?' wp-today wp-day-first wp-day-last':' wp-day-first wp-day-last');
          var noticeColspan=_wpImgs?'3':'2';
          if(notice){
            html+='<tr class="'+cls+'"'+pastStyle+'><td class="wp-day">'+day+'</td><td class="wp-notice" colspan="'+noticeColspan+'" style="color:#888;font-style:italic">'+esc(notice)+'</td></tr>';
          }else{
            html+='<tr class="'+cls+'"'+pastStyle+'><td class="wp-day">'+day+'</td><td class="wp-notice" colspan="'+noticeColspan+'" style="color:#aaa;font-style:italic">\u2013</td></tr>';
          }
        } else {
          realMeals.forEach(function(g,i){
            var isFirst=i===0;
            var isLast=i===realMeals.length-1;
            var cls=grp+(isFirst?' wp-day-first':'')+(isLast?' wp-day-last':'')+(isToday?' wp-today':'');
            var price=g.preis?(g.preis.toFixed(2).replace('.',',')+' \u20AC'):'';
            html+='<tr class="'+cls+'"'+pastStyle+'>';
            html+='<td class="'+(isFirst?'wp-day':'wp-day-empty')+'">'+(isFirst?day:'')+'</td>';
            var orderLink='/mittagstisch-bestellen.html?gericht_id='+encodeURIComponent(g.id||'')+'&gericht='+encodeURIComponent(g.gericht)+'&preis='+(g.preis||0)+'&datum='+encodeURIComponent(g.datum||'')+'&tag='+encodeURIComponent(DAYS[dc]||'');
            if(_wpImgs) html+='<td class="wp-img-cell" data-gericht="'+esc(g.gericht)+'"></td>';
            html+='<td class="wp-dish wp-dish-a">'+esc(g.gericht)+(g.allergene?'<div style="font-size:10px;color:#d97706;font-weight:400;margin-top:1px">⚠️ '+esc(g.allergene)+'</div>':'')+'</td>';
            var orderBtn='';
            if(canOrder) orderBtn=' <a href="javascript:void(0)" onclick="openMittagPopup(\''+orderLink.replace(/'/g,"\\'")+'\');return false" class="feature-mittagstisch wp-order-btn" title="Jetzt bestellen"><svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:middle;margin-right:2px"><circle cx="8" cy="21" r="1"/><circle cx="19" cy="21" r="1"/><path d="M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 1.95-1.57l1.65-7.43H5.12"/></svg>Bestellen</a>';
            html+='<td class="wp-price wp-price-a">'+price+orderBtn+'</td></tr>';
          });
        }
      });
      html+='</tbody></table>';
      html+='<div class="wp-footer"><svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor"><path d="M21.41 11.58l-9-9C12.05 2.22 11.55 2 11 2H4c-1.1 0-2 .9-2 2v7c0 .55.22 1.05.59 1.42l9 9c.36.36.86.58 1.41.58s1.05-.22 1.41-.59l7-7c.37-.36.59-.86.59-1.41s-.23-1.06-.59-1.42zM5.5 7C4.67 7 4 6.33 4 5.5S4.67 4 5.5 4 7 4.67 7 5.5 6.33 7 5.5 7z"/></svg>';
      html+='<span id="wp-oeko"><strong>0,50 \u20AC \u00D6ko-Rabatt</strong> mit eigenem Beh\u00E4lter</span>';
      html+='<span class="wp-hint" id="wp-phone">\u260E\uFE0F <a href="tel:+4980826229991">08082 622 99 91</a></span>';
      html+='<span class="feature-mittagstisch" style="color:#c0392b;font-weight:700;font-size:.92rem" id="wp-vorbestell"><a href="javascript:void(0)" onclick="openMittagPopup(\'/mittagstisch-bestellen\')" style="color:#c0392b;text-decoration:none">\uD83C\uDF7D Jetzt online vorbestellen!</a></span>';
      html+='</div>';
      document.getElementById('wp-body').innerHTML=html;
      // Apply mittagstisch feature flag to dynamically rendered content
      if(!window._featureMittagstisch){
        document.querySelectorAll('#wp-body .feature-mittagstisch').forEach(function(el){el.style.display='none';});
      }
      // Load Mittagstisch images into dedicated column (if feature enabled)
      if(_wpImgs){
        fetch(API_BASE+'/social-katalog?action=mt-bilder')
          .then(function(r){return r.json();})
          .then(function(res){
            var bilder=res.bilder||{};
            document.querySelectorAll('.wp-img-cell').forEach(function(td){
              var name=td.getAttribute('data-gericht');
              if(bilder[name]&&bilder[name].bild_url){
                var img=document.createElement('img');
                img.src=bilder[name].bild_url;
                img.className='wp-meal-thumb';
                img.alt=name;
                img.onerror=function(){this.style.display='none';};
                img.addEventListener('dblclick',function(){wpOpenLightbox(this.src,name);});
                td.appendChild(img);
              }
            });
          })
          .catch(function(){/* ignore */});
      }
    })
    .catch(function(e){
      console.log('WP-API:',e);
      document.getElementById('wp-subtitle').textContent='Fehler beim Laden';
      document.getElementById('wp-body').innerHTML='<div style="padding:20px;text-align:center;color:#888">Wochenplan konnte nicht geladen werden.</div>';
    });
})();

/* === DESKTOP MODAL CONTROL === */
window.openDtModal = function(id) {
  if (window.innerWidth <= 768) {
    // If mobile viewport, fallback to open the corresponding mobile popup instead!
    var mobPopupMap = {'concept': 'concept', 'post': 'post-hours', 'catering': 'lunch', 'sortiment': 'preisliste'};
    var mobId = mobPopupMap[id] || id;
    if (window.mobOpenPopup) window.mobOpenPopup(mobId);
    return;
  }
  var el = document.getElementById('dt-modal-' + id);
  if(el){ el.classList.add('open'); if(window.dlLockScroll) dlLockScroll(); }
};
window.closeDtModal = function(id) {
  var el = document.getElementById('dt-modal-' + id);
  if(el) el.classList.remove('open');
  if(!document.querySelector('[id^="dt-modal-"].open')){ if(window.dlUnlockScroll) dlUnlockScroll(); }
};


/* === Öffnungszeiten loader === */
(function(){
  window._dlHoursP=fetch(API_BASE+'/hours').then(function(r){return r.json();}).catch(function(e){console.log('HRS-API:',e);return null;});
  window._dlHoursP
    .then(function(payload){
      var items=unwrapApiData(payload);
      if(!items||!items.length) return;
      var hrsGrid=document.getElementById('hrs-grid');
      if(!hrsGrid) return;
      var sections={};var secOrder=[];
      items.forEach(function(item){
        var sec=item.dl_name||item.name||'Allgemein';
        if(!sections[sec]){sections[sec]=[];secOrder.push(sec);}
        sections[sec].push(item);
      });
      var html='';
      secOrder.forEach(function(sec){
        var icon=sec==='Dorfladen'?'\uD83D\uDED2':sec==='Postfiliale'?'\uD83D\uDCE6':'';
        html+='<div class="hrs-section"><div class="hrs-label">'+icon+' '+esc(sec)+'</div><table class="hrs">';
        sections[sec].forEach(function(item){
          var dayCode=item.dl_wochentag!=null?item.dl_wochentag:item.wochentag;
          var day=DAY_SHORT[dayCode]||DAYS[dayCode]||item._dl_wochentag_label||'?';
          if(item.dl_geschlossen||item.geschlossen){
            html+='<tr><td>'+day+'</td><td><span class="hrs-closed">Geschlossen</span></td></tr>';
          } else {
            var times='';
            var vmVon=item.dl_vormittag_von||item.vormittag_von;
            var vmBis=item.dl_vormittag_bis||item.vormittag_bis;
            var nmVon=item.dl_nachmittag_von||item.nachmittag_von;
            var nmBis=item.dl_nachmittag_bis||item.nachmittag_bis;
            var hinweis=item.dl_hinweis||item.hinweis;
            if(vmVon) times+='<span class="hrs-time">'+fmtTime(vmVon)+'\u2013'+fmtTime(vmBis)+'</span>';
            if(nmVon){
              if(times) times+=' <span class="hrs-sep">&amp;</span> ';
              times+='<span class="hrs-time">'+fmtTime(nmVon)+'\u2013'+fmtTime(nmBis)+'</span>';
            }
            if(hinweis) times+=' <small>('+esc(hinweis)+')</small>';
            html+='<tr><td>'+day+'</td><td>'+times+'</td></tr>';
          }
        });
        html+='</table></div>';
      });
      hrsGrid.innerHTML=html;
    });
})();

/* === News loader === */
(function(){
  fetch(API_BASE+'/news')
    .then(function(r){return r.json();})
    .then(function(payload){
      var items=unwrapApiData(payload);
      var nowDate=new Date();
      if(items&&items.length) items=items.filter(function(n){
        if(n.dl_aktiv_bis){var ab=new Date(n.dl_aktiv_bis);ab.setHours(23,59,59,999);if(ab<nowDate) return false;}
        return true;
      });
      var container=document.getElementById('news-container');
      var countEl=document.getElementById('news-count');
      if(!items||!items.length){
        container.innerHTML='<div class="news-empty-msg">Aktuell gibt es keine Neuigkeiten.</div>';
        return;
      }
      countEl.textContent=items.length+' Beitr\u00E4ge';
      items=items.slice(0,5);
      var html='<div class="news-grid">';
      items.forEach(function(artikel,idx){
        var datumRaw=artikel.dl_datum||artikel.datum||artikel.createdon;
        var datum='';
        if(datumRaw){
          var d=new Date(datumRaw);
          datum=pad(d.getDate())+'.'+pad(d.getMonth()+1)+'.'+d.getFullYear();
        }
        html+='<div class="news-card"><div class="news-card-top"><span class="news-date-badge"><svg viewBox="0 0 24 24"><path d="M19 3h-1V1h-2v2H8V1H6v2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V8h14v11zM9 10H7v2h2v-2zm4 0h-2v2h2v-2zm4 0h-2v2h2v-2z"/></svg>'+datum+'</span></div>';
        html+='<div class="news-title">'+esc(artikel.dl_titel||artikel.titel||'')+'</div>';
        var _ni=artikel.dl_inhalt||'';
        var _nim=_ni.match(/<div class="news-beitragsbild">.*?<img[^>]+src="([^"]+)"[^>]*>.*?<\/div>/i);
        if(_nim&&_nim[1]) html+='<img style="width:100%;border-radius:10px;margin:8px 0 4px;max-height:200px;object-fit:cover" src="'+_nim[1]+'" alt="" loading="lazy">';
        var _nic=_ni.replace(/<div class="news-beitragsbild">.*?<\/div>/gi,'').trim();
        if(artikel.dl_kurztext||artikel.beschreibung) html+='<div class="news-excerpt">'+esc(artikel.dl_kurztext||artikel.beschreibung)+'</div>';
        if(_nic){
          html+='<div class="news-full" id="news-'+idx+'">'+_nic+'</div>';
          html+='<button class="news-more" onclick="var el=document.getElementById(\'news-'+idx+'\');var v=el.style.display===\'block\';el.style.display=v?\'none\':\'block\';this.innerHTML=v?\'Weiterlesen\':\'Weniger\'">Weiterlesen</button>';
        }
        html+='</div>';
      });
      html+='</div>';
      container.innerHTML=html;

      /* News ticker above hero – only items marked as Laufband */
      var ticker=document.getElementById('news-ticker');
      var tickerContent=document.getElementById('news-ticker-content');
      var now=new Date();
      var recentItems=items.filter(function(n){
        if(!n.dl_laufband) return false;
        if(n.dl_laufband_bis){var bis=new Date(n.dl_laufband_bis);bis.setHours(23,59,59,999);if(bis<now) return false;}
        return true;
      });
      if(ticker&&tickerContent&&recentItems.length){
        window._tickerNews=recentItems;
        var singleHtml='';
        var sevenDaysAgo=new Date();sevenDaysAgo.setDate(sevenDaysAgo.getDate()-7);
        recentItems.forEach(function(n,i){
          var title=esc(n.dl_titel||n.titel||'');
          var dRaw=n.dl_datum||n.datum||n.createdon;
          var isNew=dRaw&&new Date(dRaw)>=sevenDaysAgo;
          var newBadge=isNew?'<span class="news-ticker-new">NEU</span> ':'';
          if(i>0) singleHtml+='<span class="news-ticker-sep"> &nbsp;&#9733;&nbsp; </span>';
          singleHtml+='<span class="news-ticker-item'+(isNew?' news-ticker-blink':'')+'"><a href="#" data-newsidx="'+i+'">'+newBadge+title+'</a></span>';
        });
        ticker.style.display='flex';
        var trackW=document.querySelector('.news-ticker-track').offsetWidth;
        var spacer='<span class="news-ticker-spacer" style="width:'+trackW+'px"></span>';
        tickerContent.innerHTML=spacer+singleHtml+spacer+singleHtml;
        var totalW=tickerContent.scrollWidth;
        var halfW=totalW/2;
        var speed=40;
        var dur=halfW/speed;
        tickerContent.style.setProperty('--ticker-dur',dur+'s');
        tickerContent.classList.add('running');
        ticker.addEventListener('click',function(e){
          var link=e.target.closest('[data-newsidx]');
          if(!link) return;
          e.preventDefault();
          var idx=parseInt(link.getAttribute('data-newsidx'),10);
          var n=window._tickerNews[idx];
          if(n) openNewsOverlay(n);
        });
      }

      function openNewsOverlay(n){
        var title=esc(n.dl_titel||n.titel||'');
        var datumR=n.dl_datum||n.datum||n.createdon;
        var dateStr='';
        if(datumR){var dd=new Date(datumR);dateStr=pad(dd.getDate())+'.'+pad(dd.getMonth()+1)+'.'+dd.getFullYear();}
        var inhalt=n.dl_inhalt||'';
        var ov=document.createElement('div');
        ov.className='news-overlay';
        ov.innerHTML='<div class="news-overlay-card">'
          +'<button class="news-overlay-close" aria-label="Schlie\u00dfen">&times;</button>'
          +'<div class="news-overlay-date">'+dateStr+'</div>'
          +'<h2 class="news-overlay-title">'+title+'</h2>'
          +'<div class="news-overlay-body">'+inhalt+'</div>'
          +'<a href="/aktuelles" class="news-overlay-link">Alle Neuigkeiten &rarr;</a>'
          +'</div>';
        document.body.appendChild(ov);
        requestAnimationFrame(function(){ov.classList.add('open');});
        if(window.dlLockScroll)dlLockScroll();
        ov.addEventListener('click',function(e){if(e.target===ov||e.target.closest('.news-overlay-close')){ov.classList.remove('open');if(window.dlUnlockScroll)dlUnlockScroll();setTimeout(function(){if(ov.parentNode)ov.remove();},300);}});
      }
    })
    .catch(function(e){
      console.log('NEWS-API:',e);
      document.getElementById('news-container').innerHTML='<div class="news-empty-msg">News konnten nicht geladen werden.</div>';
    });
})();

/* === Angebote loader === */
var allAngebote = [];

(function(){
  fetch(API_BASE+'/angebote')
    .then(function(r){return r.json();})
    .then(function(payload){
      var items=unwrapApiData(payload);
      if(!items||!items.length) return;
      allAngebote = items.map(function(item){
        return {
          id: item.dl_angeboteid||item.id||'',
          produkt: item.dl_produkt||item.name||'',
          details: item.dl_details||item.details||'',
          preis: item.dl_preis||item.price||0,
          statt: item.dl_statt_preis||item.old_price||0,
          titel: item.dl_aktion_titel||item.aktion_titel||'',
          aktion: item.dl_aktion_id||item.aktion_id||'',
          artnr: item.dl_artikelnummer||item.artikelnummer||'',
          von: (item.dl_gueltig_von||item.valid_from)?((item.dl_gueltig_von||item.valid_from).substring(0,10)):'',
          bis: (item.dl_gueltig_bis||item.valid_to)?((item.dl_gueltig_bis||item.valid_to).substring(0,10)):''
        };
      });
      // Show promo bar link (only count valid-this-week items)
      var promoLink=document.getElementById('promo-ang-link');
      renderAngebote('this');
      var thisWeek=filterByWeek('this');
      if(promoLink){
        if(thisWeek.items.length>0){promoLink.style.display='';document.getElementById('promo-ang-count').textContent=thisWeek.items.length;}
        else{promoLink.style.display='none';}
      }
      // Show angebote card
      document.getElementById('angebote').style.display=thisWeek.items.length>0?'':'none';
    })
    .catch(function(e){console.log('ANG-API:',e);});
})();

function getWeekStart(d){var dt=new Date(d);dt.setDate(dt.getDate()-dt.getDay());dt.setHours(0,0,0,0);return dt;}
function getWeekEnd(d){var s=getWeekStart(d);s.setDate(s.getDate()+6);s.setHours(23,59,59);return s;}
function isoDate(s){var p=s.split('-');return new Date(+p[0],+p[1]-1,+p[2]);}
function rangesOverlap(aVon,aBis,wStart,wEnd){return aVon<=wEnd && aBis>=wStart;}

function filterByWeek(mode){
  var now=new Date();
  var ref=new Date(now);
  if(mode==='next') ref.setDate(ref.getDate()+7);
  var wStart=getWeekStart(ref), wEnd=getWeekEnd(ref);
  var filtered=allAngebote.filter(function(a){
    if(!a.von||!a.bis) return true;
    var aVon=isoDate(a.von), aBis=isoDate(a.bis);
    return rangesOverlap(aVon,aBis,wStart,wEnd);
  });
  return {items:filtered, mon:wStart, sun:wEnd};
}

function renderAngebote(mode){
  var r=filterByWeek(mode);
  var grid=document.getElementById('ang-grid');
  var empty=document.getElementById('ang-empty');
  var card=document.getElementById('angebote');
  var title=document.getElementById('ang-title');
  var sub=document.getElementById('ang-sub');
  var label=document.getElementById('ang-week-label');
  document.getElementById('ang-btn-this').className='ang-week-btn'+(mode==='this'?' active':'');
  document.getElementById('ang-btn-next').className='ang-week-btn'+(mode==='next'?' active':'');
  label.textContent=fmtDE(r.mon)+' \u2013 '+fmtDE(r.sun);
  if(r.items.length===0){
    grid.style.display='none';
    empty.style.display='';
    title.textContent='Sonderangebote';
    sub.textContent='';
    card.style.display='';
    return;
  }
  empty.style.display='none';
  grid.style.display='';
  card.style.display='';
  var first=r.items[0];
  title.textContent='Sonderangebote';
  sub.textContent=(first.von?first.von.slice(8,10)+'.'+first.von.slice(5,7)+'.':'')+' \u2013 '+(first.bis?first.bis.slice(8,10)+'.'+first.bis.slice(5,7)+'.'+first.bis.slice(0,4):'');
  var html='';
  r.items.forEach(function(a){
    var badge='';
    if(a.statt>0&&a.preis>0){var pct=Math.round((a.statt-a.preis)/a.statt*100);if(pct>0) badge='<div class="ang-badge">-'+pct+'%</div>';}
    html+='<div class="ang-item"'+(a.artnr?' data-artnr="'+esc(a.artnr)+'"':'')+'>';
    html+='<span class="ang-leaf">\uD83C\uDF3F</span>';
    html+=badge;
    html+='<div class="ang-img"></div>';
    html+='<div class="ang-info">';
    html+='<div class="ang-name">'+esc(a.produkt)+'</div>';
    if(a.details) html+='<div class="ang-det">'+esc(a.details)+'</div>';
    html+='</div>';
    if(a.preis){
      var pi=Math.floor(a.preis);var pf=Math.round((a.preis-pi)*100);
      var cs=pf<10?'0'+pf:String(pf);
      html+='<div class="ang-tag"><div class="ang-tag-inner">'+pi+','+cs+'<span class="ang-euro">\u20AC</span></div>';
      if(a.statt) html+='<span class="ang-statt">'+fmtPrice(a.statt)+'</span>';
      html+='</div>';
    }
    html+='<span class="ang-basket">\uD83D\uDED2</span>';
    html+='</div>';
  });
  grid.innerHTML=html;
  loadAngBilder(grid);
}

window.angSetWeek=function(mode){renderAngebote(mode);};

/* === Werbebilder nachladen (Base64 aus Azure Function API) === */
var _bildCache={};
function loadAngBilder(container){
  var items=(container||document).querySelectorAll('.ang-item[data-artnr]');
  if(!items.length) return;
  var toLoad=[];
  items.forEach(function(el){
    var nr=el.getAttribute('data-artnr');
    if(!nr) return;
    if(_bildCache[nr]){
      var div=el.querySelector('.ang-img');
      if(div&&!div.querySelector('img')){var img=document.createElement('img');img.alt=nr;img.src=_bildCache[nr];div.appendChild(img);div.classList.add('loaded');}
      return;
    }
    toLoad.push(nr);
  });
  if(!toLoad.length) return;
  var unique=toLoad.filter(function(v,i,a){return a.indexOf(v)===i;});
  fetch(API_BASE+'/werbebilder?artnrs='+encodeURIComponent(unique.join(','))+'&sharepoint=1')
    .then(function(r){return r.json();})
    .then(function(data){
      (data||[]).forEach(function(r){if(r.dl_bild_base64) _bildCache[r.dl_artikelnummer]=r.dl_bild_base64;});
      items.forEach(function(el){
        var nr=el.getAttribute('data-artnr');
        var src=_bildCache[nr];
        if(!src) return;
        var div=el.querySelector('.ang-img');
        if(!div||div.querySelector('img')) return;
        var img=document.createElement('img');
        img.alt=nr;img.loading='lazy';
        img.onload=function(){div.classList.add('loaded');};
        img.onerror=function(){div.style.display='none';};
        img.src=src;
        div.appendChild(img);
      });
    })
    .catch(function(e){console.log('BILDER-API:',e);});
}

/* === Version loader === */
(function(){
  fetch('/version.json?t='+Date.now())
    .then(function(r){return r.json();})
    .then(function(v){
      var el=document.getElementById('site-version');
      if(el) el.textContent='v'+v.version+' (Build '+v.build+')';
    }).catch(function(){});
})();

/* === Logo loader === */
(function(){
  var fb=document.getElementById('nv-logo-fallback');
  fetch(API_BASE+'/logo')
    .then(function(r){return r.json();})
    .then(function(res){
      if(!res.success||!res.logo){if(fb)fb.style.display='';return;}
      var el=document.getElementById('nv-logo');
      if(el) el.innerHTML='<img src="'+res.logo+'" alt="Dorfladen Oberornau" style="height:52px;width:auto">';
    })
    .catch(function(){if(fb)fb.style.display='';});
})();

/* === Gallery === */
var _galleryImages=[];
var _galleryAllImages=[];
var _galleryCategories=[];
var _galleryIdx=0;
var _galleryFilter='Alle';
function openLightbox(idx){
  _galleryIdx=idx;
  var overlay=document.getElementById('lightbox-overlay');
  var img=document.getElementById('lightbox-img');
  var cap=document.getElementById('lightbox-caption');
  if(!overlay||!_galleryImages[idx])return;
  img.src=_galleryImages[idx].url;
  var gi=_galleryImages[idx];
  if(gi.description){cap.textContent=gi.description;cap.style.display='';}
  else{cap.textContent='';cap.style.display='none';}
  overlay.classList.add('active');
  if(window.dlLockScroll) dlLockScroll(); else document.body.style.overflow='hidden';
}
function closeLightbox(){
  var overlay=document.getElementById('lightbox-overlay');
  if(overlay)overlay.classList.remove('active');
  if(window.dlUnlockScroll) dlUnlockScroll(); else document.body.style.overflow='';
}
function navLightbox(dir){
  var newIdx=_galleryIdx+dir;
  if(newIdx<0)newIdx=_galleryImages.length-1;
  if(newIdx>=_galleryImages.length)newIdx=0;
  openLightbox(newIdx);
}
function renderGallery(filter){
  _galleryFilter=filter||'Alle';
  var grid=document.getElementById('gallery-grid');
  if(!grid)return;
  _galleryImages=_galleryFilter==='Alle'?_galleryAllImages:_galleryAllImages.filter(function(img){return img.category===_galleryFilter;});
  if(!_galleryImages.length){grid.innerHTML='<div class="gallery-empty">Keine Bilder in dieser Kategorie</div>';return;}
  var html='';
  for(var i=0;i<_galleryImages.length;i++){
    var img=_galleryImages[i];
    var alt=img.description||img.name.replace(/\.[^.]+$/,'');
    html+='<div class="gallery-item" onclick="openLightbox('+i+')">';
    html+='<img src="'+img.url+'" alt="'+alt.replace(/"/g,'&quot;')+'" loading="lazy" class="loading" onload="this.classList.remove(\'loading\')">';
    if(img.description){html+='<div style="position:absolute;bottom:0;left:0;right:0;background:linear-gradient(transparent,rgba(0,0,0,.7));padding:6px 8px 5px;color:#fff;font-size:.75rem;line-height:1.3">'+img.description.replace(/</g,'&lt;')+'</div>';}
    html+='</div>';
  }
  grid.innerHTML=html;
  // Update active filter button
  var btns=document.querySelectorAll('.gallery-filter-btn');
  for(var j=0;j<btns.length;j++){
    btns[j].classList.toggle('active',btns[j].getAttribute('data-cat')===_galleryFilter);
  }
}
document.addEventListener('keydown',function(e){
  var overlay=document.getElementById('lightbox-overlay');
  if(!overlay||!overlay.classList.contains('active'))return;
  if(e.key==='Escape')closeLightbox();
  if(e.key==='ArrowLeft')navLightbox(-1);
  if(e.key==='ArrowRight')navLightbox(1);
});
(function(){
  var grid=document.getElementById('gallery-grid');
  var filters=document.getElementById('gallery-filters');
  if(!grid)return;
  fetch(API_BASE+'/gallery')
    .then(function(r){return r.json();})
    .then(function(res){
      if(!res.success||!res.images||!res.images.length){
        grid.innerHTML='<div class="gallery-empty">Noch keine Bilder vorhanden</div>';
        return;
      }
      _galleryAllImages=res.images;
      _galleryCategories=res.categories||[];
      // Build filter tabs
      if(filters&&_galleryCategories.length>1){
        var fhtml='<button class="gallery-filter-btn active" data-cat="Alle" onclick="renderGallery(\'Alle\')">Alle<span class="gf-count">('+res.count+')</span></button>';
        for(var c=0;c<_galleryCategories.length;c++){
          var cat=_galleryCategories[c];
          if(cat.name==='Sonstiges'&&cat.count<2)continue;
          fhtml+='<button class="gallery-filter-btn" data-cat="'+cat.name+'" onclick="renderGallery(\''+cat.name+'\')">'+cat.name+'<span class="gf-count">('+cat.count+')</span></button>';
        }
        filters.innerHTML=fhtml;
      }
      renderGallery('Alle');
    })
    .catch(function(){
      grid.innerHTML='<div class="gallery-empty">Galerie konnte nicht geladen werden</div>';
    });
})();

/* === Universal Image Popup (Lightbox) === */
window.dlImagePopup=function(src,alt){
  if(!src)return;
  var existing=document.getElementById('dl-img-popup');
  if(existing) existing.remove();
  var ov=document.createElement('div');
  ov.id='dl-img-popup';
  ov.style.cssText='position:fixed;inset:0;z-index:100001;background:rgba(0,0,0,.85);display:flex;flex-direction:column;align-items:center;justify-content:center;padding:16px;cursor:pointer;animation:wpLbFadeIn .2s';
  var img=document.createElement('img');
  img.src=src;
  img.alt=alt||'';
  img.style.cssText='max-width:90vw;max-height:80vh;object-fit:contain;border-radius:12px;box-shadow:0 8px 40px rgba(0,0,0,.5)';
  img.addEventListener('click',function(e){e.stopPropagation();});
  ov.appendChild(img);
  if(alt){var cap=document.createElement('div');cap.textContent=alt;cap.style.cssText='color:#fff;font-size:15px;font-weight:600;margin-top:12px;text-align:center;max-width:90vw;word-break:break-word';ov.appendChild(cap);}
  var cls=document.createElement('button');
  cls.innerHTML='&#10005;';
  cls.style.cssText='position:absolute;top:12px;right:16px;background:rgba(255,255,255,.2);border:none;color:#fff;font-size:24px;width:40px;height:40px;border-radius:50%;cursor:pointer;display:flex;align-items:center;justify-content:center';
  ov.appendChild(cls);
  document.body.appendChild(ov);
  if(window.dlLockScroll) dlLockScroll();
  function _imgClose(){ov.remove();if(window.dlUnlockScroll) dlUnlockScroll();}
  ov.addEventListener('click',function(){_imgClose();});
  cls.addEventListener('click',function(e){e.stopPropagation();_imgClose();});
  document.addEventListener('keydown',function onKey(e){if(e.key==='Escape'){_imgClose();document.removeEventListener('keydown',onKey);}});
};
function wpOpenLightbox(src,alt){window.dlImagePopup(src,alt);}
