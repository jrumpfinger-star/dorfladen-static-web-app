/* ========================================
   Dorfladen Oberornau – Static Site JS
   All data loaded via Azure Function API
   ======================================== */

// API Base URL – Azure Function (SWA proxied via /api)
var API_BASE = 'https://dorfladen-cms-v2.azurewebsites.net/api';

var DAYS = {101000:'Montag',101001:'Dienstag',101002:'Mittwoch',101003:'Donnerstag',101004:'Freitag',101005:'Samstag',101006:'Sonntag'};
var DAY_SHORT = {101000:'Mo',101001:'Di',101002:'Mi',101003:'Do',101004:'Fr',101005:'Sa',101006:'So'};

/* === Utility functions === */
function pad(n){return n<10?'0'+n:String(n);}
function esc(s){var d=document.createElement('div');d.textContent=s;return d.innerHTML;}
function fmtTime(t){
  if(!t) return '';
  return t;
}
function fmtDE(d){return pad(d.getDate())+'.'+pad(d.getMonth()+1)+'.'+d.getFullYear();}
function fmtPrice(v){var i=Math.floor(v);var f=Math.round((v-i)*100);return i+','+(f<10?'0':'')+f+' \u20AC';}

/* === Cookie Banner === */
(function(){
  if(!localStorage.getItem('dl_cookies')&&!sessionStorage.getItem('dl_cookies_declined')){
    document.getElementById('cookieBar').classList.add('show');
  }
})();

/* === CMS Config from API === */
(function(){
  fetch(API_BASE+'/cms-config')
    .then(function(r){return r.json();})
    .then(function(config){
      if(!config || Object.keys(config).length===0) return;
      console.log('CMS Config loaded:', config);
      
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
    })
    .catch(function(e){console.log('CMS Config fetch failed:', e);});
})();

/* === CMS Config (dl_homepage_cfg from localStorage) === */
(function(){
  try{
    var raw=localStorage.getItem('dl_homepage_cfg');
    if(!raw) return;
    var c=JSON.parse(raw);
    var wpCss=[];
    if(c.wpHeaderBg&&c.wpHeaderBg!=='#5ea88a')wpCss.push('.wp-header{background:linear-gradient(135deg,'+c.wpHeaderBg+' 0%,'+c.wpHeaderBg+' 100%)!important}');
    if(c.wpDayColor&&c.wpDayColor!=='#5ea88a')wpCss.push('.wp-day{color:'+c.wpDayColor+'!important}');
    if(c.wpDishFontSize&&c.wpDishFontSize!==0.92)wpCss.push('.wp-dish{font-size:'+c.wpDishFontSize+'rem!important}');
    if(c.wpPriceFontSize&&c.wpPriceFontSize!==0.92)wpCss.push('.wp-price{font-size:'+c.wpPriceFontSize+'rem!important}');
    if(wpCss.length){var ws=document.createElement('style');ws.textContent=wpCss.join('');document.head.appendChild(ws);}
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
      if(mins>=s[0] && mins<s[1]){isOpen=true;closeAt=Math.floor(s[1]/60)+':'+(s[1]%60<10?'0':'')+(s[1]%60);}
      else if(s[2]!==null && mins>=s[2] && mins<s[3]){isOpen=true;closeAt=Math.floor(s[3]/60)+':'+(s[3]%60<10?'0':'')+(s[3]%60);}
    }
    if(!isOpen){
      for(var i=0;i<7;i++){
        var checkDow=(dow+i)%7;
        var cs=schedule[checkDow];
        if(!cs) continue;
        if(i===0 && !isHoliday){
          if(mins<cs[0]){nextOpen='\u00f6ffnet heute um '+Math.floor(cs[0]/60)+':'+(cs[0]%60<10?'0':'')+(cs[0]%60)+' Uhr';break;}
          if(cs[2]!==null && mins<cs[2]){nextOpen='\u00f6ffnet heute um '+Math.floor(cs[2]/60)+':'+(cs[2]%60<10?'0':'')+(cs[2]%60)+' Uhr';break;}
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
      el.innerHTML='<div class="dl-status dl-status-open"><span class="dl-status-dot"></span>Jetzt ge\u00f6ffnet<span class="dl-status-next">\u2013 bis '+closeAt+' Uhr</span></div>';
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
  fetch(API_BASE+'/wochenplan')
    .then(function(r){return r.json();})
    .then(function(response){
      var items=response.success?response.data:[];
      if(!items||!items.length){
        document.getElementById('wp-subtitle').textContent='Kein aktueller Wochenplan';
        document.getElementById('wp-body').innerHTML='<div style="padding:20px;text-align:center;color:#888;font-style:italic">Aktuell kein Wochenplan verf\u00fcgbar. Unser Mittagstisch-Angebot findet ihr in der WhatsApp-Gruppe.</div>';
        return;
      }
      // Find current ISO 8601 week number
      var now=new Date();
      var tmp=new Date(now.getFullYear(),now.getMonth(),now.getDate());
      tmp.setDate(tmp.getDate()+3-(tmp.getDay()+6)%7);
      var week1=new Date(tmp.getFullYear(),0,4);
      week1.setDate(week1.getDate()+3-(week1.getDay()+6)%7);
      var curKw=1+Math.round((tmp-week1)/604800000);
      // Collect available KWs
      var kws={};
      items.forEach(function(g){if(g.kalenderwoche)kws[g.kalenderwoche]=true;});
      // Pick best KW: prefer current week, then closest future, then highest available
      var bestKw=0;
      if(kws[curKw]){bestKw=curKw;}
      else{
        var sorted=Object.keys(kws).map(Number).sort(function(a,b){return a-b;});
        for(var i=0;i<sorted.length;i++){if(sorted[i]>=curKw){bestKw=sorted[i];break;}}
        if(!bestKw&&sorted.length)bestKw=sorted[sorted.length-1];
      }
      // Filter to best KW
      var meals=bestKw>0?items.filter(function(g){return g.kalenderwoche===bestKw;}):items;
      // Subtitle with date range
      var sub=document.getElementById('wp-subtitle');
      if(meals.length>0){
        var first=new Date(meals[0].datum);
        var last=new Date(meals[meals.length-1].datum);
        var kwText=bestKw?'KW '+bestKw+' \u00B7 ':'';
        var y1=String(first.getFullYear()).slice(-2);
        var y2=String(last.getFullYear()).slice(-2);
        sub.textContent=kwText+pad(first.getDate())+'.'+pad(first.getMonth()+1)+'.'+y1+' \u2013 '+pad(last.getDate())+'.'+pad(last.getMonth()+1)+'.'+y2;
      }
      // Group by day
      var byDay={};var dayOrder=[];
      meals.forEach(function(g){
        var dc=g.wochentag;
        if(!byDay[dc]){byDay[dc]=[];dayOrder.push(dc);}
        byDay[dc].push(g);
      });
      var html='<table class="wp-table"><thead><tr><th class="wp-th-day"></th><th></th><th class="wp-th-price">Verzehr im Laden<br><small>oder zum Mitnehmen</small></th></tr></thead><tbody>';
      dayOrder.forEach(function(dc,dIdx){
        var dayMeals=byDay[dc];
        var day=DAYS[dc]||'?';
        var grp=dIdx%2===0?'wp-grp-even':'wp-grp-odd';
        var notice='';
        dayMeals.forEach(function(g){if(g.beschreibung&&!notice) notice=g.beschreibung;});
        var realMeals=dayMeals.filter(function(g){return g.gericht&&g.gericht.trim();});
        if(realMeals.length===0&&notice){
          html+='<tr class="'+grp+' wp-day-first wp-day-last"><td class="wp-day">'+day+'</td><td class="wp-notice" colspan="2">'+esc(notice)+'</td></tr>';
        } else {
          var multi=realMeals.length>1;
          realMeals.forEach(function(g,i){
            var isFirst=i===0;
            var isLast=i===realMeals.length-1;
            var cls=grp+(isFirst?' wp-day-first':'')+(isLast?' wp-day-last':'');
            var price=g.preis?(g.preis.toFixed(2).replace('.',',')+' \u20AC'):'';
            var bullet=multi?' wp-dish-bullet':'';
            html+='<tr class="'+cls+'">';
            html+='<td class="'+(isFirst?'wp-day':'wp-day-empty')+'">'+(isFirst?day:'')+'</td>';
            html+='<td class="wp-dish'+bullet+' wp-dish-a">'+esc(g.gericht)+'</td>';
            html+='<td class="wp-price wp-price-a">'+price+'</td></tr>';
          });
        }
      });
      html+='</tbody></table>';
      html+='<div class="wp-footer"><svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor"><path d="M21.41 11.58l-9-9C12.05 2.22 11.55 2 11 2H4c-1.1 0-2 .9-2 2v7c0 .55.22 1.05.59 1.42l9 9c.36.36.86.58 1.41.58s1.05-.22 1.41-.59l7-7c.37-.36.59-.86.59-1.41s-.23-1.06-.59-1.42zM5.5 7C4.67 7 4 6.33 4 5.5S4.67 4 5.5 4 7 4.67 7 5.5 6.33 7 5.5 7z"/></svg>';
      html+='<span id="wp-oeko"><strong>0,50 \u20AC \u00D6ko-Rabatt</strong> mit eigenem Beh\u00E4lter</span>';
      html+='<span class="wp-hint" id="wp-phone">\u260E\uFE0F <a href="tel:+4980826229991">08082 622 99 91</a></span>';
      html+='<span style="color:#c0392b;font-weight:700;font-size:.92rem" id="wp-vorbestell">Gerne auch vorbestellen!</span>';
      html+='</div>';
      document.getElementById('wp-body').innerHTML=html;
    })
    .catch(function(e){
      console.log('WP-API:',e);
      document.getElementById('wp-subtitle').textContent='Fehler beim Laden';
      document.getElementById('wp-body').innerHTML='<div style="padding:20px;text-align:center;color:#888">Wochenplan konnte nicht geladen werden.</div>';
    });
})();

/* === Öffnungszeiten loader === */
(function(){
  fetch(API_BASE+'/hours')
    .then(function(r){return r.json();})
    .then(function(items){
      if(!items||!items.length) return;
      var hrsGrid=document.getElementById('hrs-grid');
      if(!hrsGrid) return;
      var sections={};var secOrder=[];
      items.forEach(function(item){
        var sec=item.dl_name||'Allgemein';
        if(!sections[sec]){sections[sec]=[];secOrder.push(sec);}
        sections[sec].push(item);
      });
      var html='';
      secOrder.forEach(function(sec){
        var icon=sec==='Dorfladen'?'\uD83D\uDED2':sec==='Postfiliale'?'\uD83D\uDCE6':'';
        html+='<div class="hrs-section"><div class="hrs-label">'+icon+' '+esc(sec)+'</div><table class="hrs">';
        sections[sec].forEach(function(item){
          var day=DAY_SHORT[item.dl_wochentag]||DAYS[item.dl_wochentag]||'?';
          if(item.dl_geschlossen){
            html+='<tr><td>'+day+'</td><td><span class="hrs-closed">Geschlossen</span></td></tr>';
          } else {
            var times='';
            if(item.dl_vormittag_von) times+='<span class="hrs-time">'+fmtTime(item.dl_vormittag_von)+'\u2013'+fmtTime(item.dl_vormittag_bis)+'</span>';
            if(item.dl_nachmittag_von){
              if(times) times+=' <span class="hrs-sep">&amp;</span> ';
              times+='<span class="hrs-time">'+fmtTime(item.dl_nachmittag_von)+'\u2013'+fmtTime(item.dl_nachmittag_bis)+'</span>';
            }
            if(item.dl_hinweis) times+=' <small>('+esc(item.dl_hinweis)+')</small>';
            html+='<tr><td>'+day+'</td><td>'+times+'</td></tr>';
          }
        });
        html+='</table></div>';
      });
      hrsGrid.innerHTML=html;
    })
    .catch(function(e){console.log('HRS-API:',e);});
})();

/* === News loader === */
(function(){
  fetch(API_BASE+'/news')
    .then(function(r){return r.json();})
    .then(function(items){
      var container=document.getElementById('news-container');
      var countEl=document.getElementById('news-count');
      if(!items||!items.length){
        container.innerHTML='<div class="news-empty-msg">Aktuell gibt es keine Neuigkeiten.</div>';
        return;
      }
      countEl.textContent=items.length+' Beitr\u00E4ge';
      var html='<div class="news-grid">';
      items.forEach(function(artikel,idx){
        var datum='';
        if(artikel.dl_datum){
          var d=new Date(artikel.dl_datum);
          datum=pad(d.getDate())+'.'+pad(d.getMonth()+1)+'.'+d.getFullYear();
        } else if(artikel.createdon){
          var d2=new Date(artikel.createdon);
          datum=pad(d2.getDate())+'.'+pad(d2.getMonth()+1)+'.'+d2.getFullYear();
        }
        html+='<div class="news-card"><div class="news-card-top"><span class="news-date-badge"><svg viewBox="0 0 24 24"><path d="M19 3h-1V1h-2v2H8V1H6v2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V8h14v11zM9 10H7v2h2v-2zm4 0h-2v2h2v-2zm4 0h-2v2h2v-2z"/></svg>'+datum+'</span></div>';
        html+='<div class="news-title">'+esc(artikel.dl_titel||'')+'</div>';
        if(artikel.dl_kurztext) html+='<div class="news-excerpt">'+esc(artikel.dl_kurztext)+'</div>';
        if(artikel.dl_inhalt){
          html+='<div class="news-full" id="news-'+idx+'">'+artikel.dl_inhalt+'</div>';
          html+='<button class="news-more" onclick="var el=document.getElementById(\'news-'+idx+'\');var v=el.style.display===\'block\';el.style.display=v?\'none\':\'block\';this.innerHTML=v?\'Weiterlesen\':\'Weniger\'">Weiterlesen</button>';
        }
        html+='</div>';
      });
      html+='</div>';
      container.innerHTML=html;
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
    .then(function(items){
      if(!items||!items.length) return;
      allAngebote = items.map(function(item){
        return {
          id: item.dl_angeboteid||'',
          produkt: item.dl_produkt||'',
          details: item.dl_details||'',
          preis: item.dl_preis||0,
          statt: item.dl_statt_preis||0,
          titel: item.dl_aktion_titel||'',
          aktion: item.dl_aktion_id||'',
          artnr: item.dl_artikelnummer||'',
          von: item.dl_gueltig_von?(item.dl_gueltig_von.substring(0,10)):'',
          bis: item.dl_gueltig_bis?(item.dl_gueltig_bis.substring(0,10)):''
        };
      });
      // Show promo bar link
      var promoLink=document.getElementById('promo-ang-link');
      if(promoLink){promoLink.style.display='';document.getElementById('promo-ang-count').textContent=allAngebote.length;}
      // Show angebote card
      document.getElementById('angebote').style.display='';
      renderAngebote('this');
    })
    .catch(function(e){console.log('ANG-API:',e);});
})();

function getMonday(d){var dt=new Date(d);var day=dt.getDay()||7;dt.setDate(dt.getDate()-day+1);dt.setHours(0,0,0,0);return dt;}
function getSunday(d){var m=getMonday(d);m.setDate(m.getDate()+6);m.setHours(23,59,59);return m;}
function isoDate(s){var p=s.split('-');return new Date(+p[0],+p[1]-1,+p[2]);}
function rangesOverlap(aVon,aBis,wMon,wSun){return aVon<=wSun && aBis>=wMon;}

function filterByWeek(mode){
  var now=new Date();
  var ref=new Date(now);
  if(mode==='next') ref.setDate(ref.getDate()+7);
  var wMon=getMonday(ref), wSun=getSunday(ref);
  var filtered=allAngebote.filter(function(a){
    if(!a.von||!a.bis) return true;
    var aVon=isoDate(a.von), aBis=isoDate(a.bis);
    return rangesOverlap(aVon,aBis,wMon,wSun);
  });
  return {items:filtered, mon:wMon, sun:wSun};
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
  fetch(API_BASE+'/werbebilder?artnrs='+encodeURIComponent(unique.join(',')))
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
