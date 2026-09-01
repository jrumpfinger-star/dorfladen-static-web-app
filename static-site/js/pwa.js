// PWA Install – shared across all pages

// Stabile Geraete-Kennung (pro Browser-Profil, ueberlebt Endpoint-Refresh /
// Neu-Abonnieren). Wird beim Abonnieren mitgeschickt, damit der Server alte
// Subscriptions DESSELBEN Geraets ersetzt -> keine doppelten Push-Nachrichten.
function dlPushDeviceId(){
  try{
    var k='dl_push_device_id';
    var v=localStorage.getItem(k);
    if(!v){
      if(window.crypto&&crypto.randomUUID){ v=crypto.randomUUID(); }
      else { v='dev-'+Date.now().toString(36)+'-'+Math.random().toString(36).slice(2,10); }
      localStorage.setItem(k,v);
    }
    return v;
  }catch(e){ return ''; }
}

if('serviceWorker' in navigator){
  navigator.serviceWorker.register('/sw.js').then(function(reg){
    // Force waiting SW to activate immediately
    if(reg.waiting){reg.waiting.postMessage({type:'SKIP_WAITING'});}
    reg.addEventListener('updatefound',function(){
      var nw=reg.installing;
      if(nw){nw.addEventListener('statechange',function(){
        if(nw.state==='installed'&&navigator.serviceWorker.controller){
          nw.postMessage({type:'SKIP_WAITING'});
        }
      });}
    });
  }).catch(function(){});
  // Reload once when new SW takes over
  var _swRefreshing=false;
  navigator.serviceWorker.addEventListener('controllerchange',function(){
    if(_swRefreshing)return;_swRefreshing=true;window.location.reload();
  });
}

// ── App-Icon-Badge zuruecksetzen, sobald die App geoeffnet/sichtbar ist ──
// (die ungelesenen Push-Nachrichten gelten dann als gesehen). Nutzt die
// Web-Badging-API; auf nicht unterstuetzten Plattformen ein No-Op.
function dlClearAppBadge(){
  try{ if(navigator.clearAppBadge) navigator.clearAppBadge(); }catch(e){}
  try{
    if(navigator.serviceWorker){
      navigator.serviceWorker.ready.then(function(reg){
        var sw=(reg&&reg.active)||navigator.serviceWorker.controller;
        if(sw) sw.postMessage({type:'CLEAR_BADGE'});
      }).catch(function(){});
    }
  }catch(e){}
}
window.addEventListener('load',function(){ setTimeout(dlClearAppBadge,400); });
document.addEventListener('visibilitychange',function(){ if(document.visibilityState==='visible') dlClearAppBadge(); });

(function(){
  var isStandalone=window.matchMedia('(display-mode:standalone)').matches||navigator.standalone;

  // Try to close any open popup/overlay. Returns true if something was closed.
  function closeAnyPopup(){
    // Mobile popups
    var mobPopups=document.querySelectorAll('.mob-popup-bg.open');
    if(mobPopups.length){mobPopups.forEach(function(el){el.classList.remove('open');});return true;}
    // Mobile nav drawer
    var mobNav=document.getElementById('mob-nav');
    if(mobNav&&mobNav.classList.contains('open')){
      mobNav.classList.remove('open');
      var ov=document.getElementById('mob-nav-ov');if(ov)ov.classList.remove('open');
      return true;
    }
    // Lightbox
    var lb=document.getElementById('lightbox-overlay');
    if(lb&&lb.classList.contains('active')){
      if(typeof closeLightbox==='function')closeLightbox();
      else{lb.classList.remove('active');document.body.style.overflow='';}
      return true;
    }
    // News overlay
    var nOv=document.querySelector('.news-overlay.open');
    if(nOv){nOv.classList.remove('open');if(window.dlUnlockScroll)dlUnlockScroll();setTimeout(function(){if(nOv.parentNode)nOv.remove();},300);return true;}
    // Desktop modals
    var dtModal=document.querySelector('[id^="dt-modal-"].open');
    if(dtModal){dtModal.classList.remove('open');if(window.dlUnlockScroll)dlUnlockScroll();return true;}
    // Push settings overlay
    var pushOv=document.getElementById('push-settings-overlay');
    if(pushOv&&pushOv.offsetParent!==null){
      if(typeof closePushSettings==='function')closePushSettings();
      else{pushOv.style.opacity='0';setTimeout(function(){if(pushOv.parentNode)pushOv.remove();},300);}
      return true;
    }
    // CMS confirm overlay
    var confirmOv=document.querySelector('.cms-confirm-overlay.open');
    if(confirmOv){
      var cancelBtn=confirmOv.querySelector('[data-action="cancel"],.cms-confirm-cancel');
      if(cancelBtn)cancelBtn.click();
      else{confirmOv.remove();}
      return true;
    }
    // Hilfe-Overlay (from hilfe-popup.js)
    var hilfeOv=document.getElementById('hilfe-overlay');
    if(hilfeOv&&hilfeOv.classList.contains('open')){
      if(typeof closeHilfePopup==='function')closeHilfePopup();
      else{hilfeOv.classList.remove('open');document.body.style.overflow='';}
      return true;
    }
    // Bestelldetail-Overlay (Shop) / Bestell-Uebersichten / TagesInfo-Overlay
    var odOv=document.getElementById('od-overlay');
    if(odOv&&odOv.classList.contains('open')){ odOv.classList.remove('open'); if(window.dlUnlockScroll)dlUnlockScroll(); return true; }
    var ordersOv=document.getElementById('orders-overlay');
    if(ordersOv&&ordersOv.classList.contains('open')){ ordersOv.classList.remove('open'); if(window.dlUnlockScroll)dlUnlockScroll(); return true; }
    var tpOv=document.getElementById('tp-overlay');
    if(tpOv&&tpOv.classList.contains('open')){ tpOv.classList.remove('open'); if(window.dlUnlockScroll)dlUnlockScroll(); return true; }
    // Vollbild-Bild-Popup (Zoom)
    var imgPop=document.getElementById('dl-img-popup');
    if(imgPop){ imgPop.remove(); if(window.dlUnlockScroll)dlUnlockScroll(); return true; }
    // Dynamisch erzeugte "Meine Bestellungen"-Popups (display:flex/none)
    var dynPops=document.querySelectorAll('[id^="popup-"]');
    for(var dp=0;dp<dynPops.length;dp++){
      if(_dlOverlayVisible(dynPops[dp])){ dynPops[dp].style.display='none'; document.body.style.overflow=''; return true; }
    }
    // iOS-Push-Hinweis
    var iosHint=document.getElementById('push-ios-hint-overlay');
    if(iosHint){ iosHint.remove(); return true; }
    // PWA install banner
    var pwaBanner=document.getElementById('pwa-install-banner');
    if(pwaBanner&&pwaBanner.style.display!=='none'&&pwaBanner.offsetParent){
      pwaBanner.style.display='none';return true;
    }
    return false;
  }

  // Sichtbarkeit eines (auch position:fixed) Overlays robust pruefen.
  function _dlOverlayVisible(el){
    if(!el) return false;
    try{ var s=getComputedStyle(el); return s.display!=='none' && s.visibility!=='hidden' && s.opacity!=='0'; }
    catch(_){ return false; }
  }

  // Zentrale Liste aller Overlays, die den Zurueck-Button abfangen sollen.
  // WICHTIG: Jedes NEUE Overlay hier eintragen ODER eine der bestehenden
  // Konventionen (.open / display) nutzen – der Observer unten sichert es dann
  // automatisch ab. Das mt-popup (.mt-popup-overlay) ist bewusst NICHT enthalten,
  // da es auf index/tagesinfo eine eigene History-Behandlung besitzt.
  var _DL_OVERLAY_SELECTORS=[
    {sel:'.mob-popup-bg.open'},
    {sel:'#mob-nav.open'},
    {sel:'#lightbox-overlay.active'},
    {sel:'.news-overlay.open'},
    {sel:'[id^="dt-modal-"].open'},
    {sel:'.cms-confirm-overlay.open'},
    {sel:'#hilfe-overlay.open'},
    {sel:'#od-overlay.open'},
    {sel:'#orders-overlay.open'},
    {sel:'#tp-overlay.open'},
    {sel:'#push-settings-overlay', vis:true},
    {sel:'#dl-img-popup', vis:true},
    {sel:'[id^="popup-"]', vis:true}
  ];
  function dlAnyOverlayOpen(){
    for(var i=0;i<_DL_OVERLAY_SELECTORS.length;i++){
      var o=_DL_OVERLAY_SELECTORS[i];
      var nodes=document.querySelectorAll(o.sel);
      for(var j=0;j<nodes.length;j++){
        if(o.vis){ if(_dlOverlayVisible(nodes[j])) return true; }
        else { return true; }
      }
    }
    return false;
  }

  // === Standard pattern: pushState when popup opens, consume on back ===
  var _popupStateActive=false;

  // Push fake history entry when any popup opens
  window.pushPopupState=function(){
    if(!_popupStateActive){
      _popupStateActive=true;
      history.pushState({popup:true},'',window.location.href);
    }
  };

  // Remove fake history entry when popup is closed normally (not via back)
  window.removePopupState=function(){
    if(_popupStateActive){
      _popupStateActive=false;
      history.back();
    }
  };

  // Back button pressed
  window.addEventListener('popstate',function(e){
    // If popup state active, close popup (fake entry auto-consumed)
    if(_popupStateActive){
      _popupStateActive=false;
      closeAnyPopup();
      // Falls noch ein weiteres Overlay offen ist, erneut absichern.
      if(dlAnyOverlayOpen()){ window.pushPopupState(); }
      return;
    }
    // No popup: let browser/PWA history continue normally.
    // Important: do not push a homepage guard here; Firefox Android would require extra Back clicks.
  });

  // === Automatische Absicherung ALLER Overlays gegen den Zurueck-Button ===
  // Ein MutationObserver erkennt, sobald irgendein Overlay geoeffnet oder
  // geschlossen wird, und verwaltet den History-Eintrag automatisch. Dadurch
  // muss nicht mehr an jeder einzelnen Oeffnen-/Schliessen-Stelle daran gedacht
  // werden – neue Overlays sind ohne Zusatzcode abgesichert.
  var _dlOvlTimer=0;
  function _dlOverlaySync(){
    _dlOvlTimer=0;
    var open=dlAnyOverlayOpen();
    if(open && !_popupStateActive){ window.pushPopupState(); }
    else if(!open && _popupStateActive){ window.removePopupState(); }
  }
  function _dlOverlaySchedule(){
    if(_dlOvlTimer) return;
    // setTimeout statt requestAnimationFrame: feuert auch in inaktiven Tabs
    // zuverlaessig, sodass der History-Eintrag garantiert gesetzt wird.
    _dlOvlTimer=setTimeout(_dlOverlaySync,0);
  }
  try{
    var _dlOvlObserver=new MutationObserver(_dlOverlaySchedule);
    _dlOvlObserver.observe(document.documentElement,{subtree:true,childList:true,attributes:true,attributeFilter:['class','style']});
  }catch(_){}
})();

var _pwaPrompt=null;
var _pwaIsStandalone=window.matchMedia('(display-mode:standalone)').matches||navigator.standalone;

function pwaShowLinks(){
  var m=document.getElementById('mob-pwa-install');if(m)m.style.display='';
  var d=document.getElementById('dt-pwa-install');if(d)d.style.display='';
}
function pwaHideAll(){
  ['pwa-install-banner','mob-pwa-install','dt-pwa-install'].forEach(function(id){
    var el=document.getElementById(id);if(el)el.style.display='none';
  });
}

// Always show menu links unless already running as installed PWA
if(!_pwaIsStandalone){
  pwaShowLinks();
}

window.addEventListener('beforeinstallprompt',function(e){
  e.preventDefault();
  _pwaPrompt=e;
  pwaShowLinks();
  if(!localStorage.getItem('pwa-dismissed')){
    setTimeout(function(){
      var b=document.getElementById('pwa-install-banner');
      if(b)b.style.display='';
    },3000);
  }
});
window.addEventListener('appinstalled',function(){pwaHideAll();});

function pwaInstall(){
  if(_pwaPrompt){
    _pwaPrompt.prompt();
    _pwaPrompt.userChoice.then(function(r){
      if(r.outcome==='accepted')pwaHideAll();
      _pwaPrompt=null;
    });
    return;
  }
  // No prompt available – show manual instructions
  if(/iPhone|iPad|iPod/.test(navigator.userAgent)){
    alert('Tippe auf das Teilen-Symbol (Quadrat mit Pfeil nach oben) und dann auf \u201eZum Home-Bildschirm\u201c.');
  }else{
    alert('Klicke im Browser-Men\u00fc auf \u201eApp installieren\u201c oder \u201eZum Startbildschirm hinzuf\u00fcgen\u201c.');
  }
}
function pwaCloseBanner(){
  var b=document.getElementById('pwa-install-banner');
  if(b)b.style.display='none';
  localStorage.setItem('pwa-dismissed','1');
}

// iOS: adapt banner text
if(/iPhone|iPad|iPod/.test(navigator.userAgent)&&!navigator.standalone&&!localStorage.getItem('pwa-dismissed')){
  setTimeout(function(){
    var b=document.getElementById('pwa-install-banner');
    if(!b)return;
    var txt=b.querySelector('div > div:last-of-type');
    if(txt)txt.innerHTML='<div style="font-weight:700;font-size:.95rem">Dorfladen als App</div><div style="font-size:.78rem;opacity:.85;margin-top:2px">Tippe <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" style="vertical-align:middle"><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/><polyline points="16 6 12 2 8 6"/><line x1="12" x2="12" y1="2" y2="15"/></svg> und dann <b>\u201eZum Home-Bildschirm\u201c</b></div>';
    var btn=b.querySelector('button');if(btn)btn.style.display='none';
    b.style.display='';
  },3000);
}

// === PUSH NOTIFICATIONS ===
(function(){
  var pushBtn=document.getElementById('mob-push-toggle');
  var pushBtnDt=document.getElementById('dt-push-toggle');
  var CAT_LABELS={tagesinfo:'TagesInfo',news:'News / Aktuelles',bestellung:'Meine Bestellungen'};
  var CAT_ICONS={tagesinfo:'\uD83D\uDCCB',news:'\uD83D\uDCE2',bestellung:'\uD83D\uDECD\uFE0F'};
  var CAT_DESC={tagesinfo:'T\u00e4glicher Mittagstisch, Theke & Angebote',news:'Neuigkeiten & Infos',bestellung:'Status & Nachrichten zu Ihren Bestellungen'};

  // --- Toast system (replaces ugly alert()) ---
  function showToast(msg,type,duration){
    type=type||'success';duration=duration||3500;
    var existing=document.getElementById('dl-toast');if(existing)existing.remove();
    var t=document.createElement('div');t.id='dl-toast';
    var bg=type==='success'?'linear-gradient(135deg,#2d7a5e,#3a9b6e)':type==='error'?'linear-gradient(135deg,#dc2626,#ef4444)':'linear-gradient(135deg,#d97706,#f59e0b)';
    var icon=type==='success'?'\u2705':type==='error'?'\u274C':'\u26A0\uFE0F';
    t.style.cssText='position:fixed;bottom:24px;left:50%;transform:translateX(-50%) translateY(80px);z-index:100000;padding:14px 22px;border-radius:14px;background:'+bg+';color:#fff;font-size:.9rem;font-weight:500;box-shadow:0 8px 32px rgba(0,0,0,.25);display:flex;align-items:center;gap:10px;max-width:340px;width:calc(100% - 32px);opacity:0;transition:all .4s cubic-bezier(.4,0,.2,1);font-family:"Segoe UI",system-ui,sans-serif;backdrop-filter:blur(8px)';
    t.innerHTML='<span style="font-size:1.3rem;flex-shrink:0">'+icon+'</span><span>'+msg+'</span>';
    document.body.appendChild(t);
    requestAnimationFrame(function(){requestAnimationFrame(function(){
      t.style.opacity='1';t.style.transform='translateX(-50%) translateY(0)';
    });});
    setTimeout(function(){
      t.style.opacity='0';t.style.transform='translateX(-50%) translateY(80px)';
      setTimeout(function(){if(t.parentNode)t.remove();},400);
    },duration);
  }

  function updatePushUI(subscribed){
    var text=subscribed?'Benachrichtigungen aktiv':'Benachrichtigungen aktivieren';
    var canLucide=!!(window.lucide||window.dlRefreshIcons);
    [pushBtn,pushBtnDt].forEach(function(btn){
      if(!btn)return;
      // For desktop: the <li> contains an <a> – update the <a>, not the <li>
      var target=btn.querySelector('a')||btn;
      if(canLucide){
        target.innerHTML='<i data-lucide="bell" width="16" height="16" style="vertical-align:-3px;margin-right:6px"></i>'+text;
      }else{
        target.textContent='\uD83D\uDD14 '+text;
      }
      if(subscribed){btn.setAttribute('data-subscribed','1');}
      else{btn.removeAttribute('data-subscribed');}
    });
    if(window.dlRefreshIcons){try{window.dlRefreshIcons();}catch(e){}}
    else if(window.lucide){try{window.lucide.createIcons();}catch(e){}}
  }

  function showPushButtons(){
    if(pushBtn)pushBtn.style.display='';
    if(pushBtnDt)pushBtnDt.style.display='';
  }

  // Feature-Flags (gecacht) auswerten – bei Fehler nicht blockieren.
  function whenFlags(cb){
    try{
      (window._dlFlagsReady||Promise.resolve()).then(function(){cb(window._dlFeatureFlags||{});});
    }catch(e){cb({});}
  }

  var IS_IOS=/iPhone|iPad|iPod/.test(navigator.userAgent)||
             (navigator.platform==='MacIntel'&&navigator.maxTouchPoints>1);
  var IS_STANDALONE=window.matchMedia('(display-mode:standalone)').matches||navigator.standalone===true;
  // Apple erlaubt Web-Push AUSSCHLIESSLICH in der zum Home-Bildschirm
  // hinzugefuegten App (ab iOS 16.4) – im Safari-Tab gibt es sie nicht.
  var IOS_NEEDS_INSTALL=IS_IOS&&!IS_STANDALONE;
  var PUSH_SUPPORTED=('PushManager' in window)&&('serviceWorker' in navigator)&&('Notification' in window);

  // Scanner-Flag unabhaengig vom Push-Support auswerten (greift sonst auf
  // iPhones nie, weil die Push-Pruefung vorher abbricht).
  whenFlags(function(ff){
    if(ff.scanner===false){
      window._dlFeatScanner=false;
      var sb=document.getElementById('mob-pl-barcode-btn');if(sb)sb.style.display='none';
      var sbd=document.querySelector('.so-barcode-btn');if(sbd)sbd.style.display='none';
    }else{
      window._dlFeatScanner=true;
    }
  });

  function closeIosPushHint(){
    var el=document.getElementById('push-ios-hint-overlay');
    if(!el)return;
    el.style.opacity='0';
    setTimeout(function(){if(el.parentNode)el.remove();},300);
  }

  // Erklaert iPhone-Nutzern, warum Benachrichtigungen im Safari-Tab nicht
  // gehen und wie sie sie bekommen. Ohne diesen Hinweis waere fuer sie nur
  // unerklaerlich nichts passiert.
  function showIosPushHint(){
    var mn=document.getElementById('mob-nav');
    var mo=document.getElementById('mob-nav-ov');
    if(mn)mn.classList.remove('open');
    if(mo)mo.classList.remove('open');
    var old=document.getElementById('push-ios-hint-overlay');
    if(old)old.remove();

    var ov=document.createElement('div');
    ov.id='push-ios-hint-overlay';
    ov.style.cssText='position:fixed;top:0;left:0;right:0;bottom:0;z-index:99999;background:rgba(0,0,0,0);display:flex;align-items:flex-end;justify-content:center;transition:background .3s ease;font-family:"Segoe UI",system-ui,sans-serif';

    var dialog=document.createElement('div');
    dialog.style.cssText='background:#fff;border-radius:20px 20px 0 0;max-width:400px;width:100%;padding:24px 20px env(safe-area-inset-bottom,16px);box-shadow:0 -8px 40px rgba(0,0,0,.15);transform:translateY(100%);transition:transform .35s cubic-bezier(.4,0,.2,1)';
    dialog.onclick=function(e){e.stopPropagation();};
    dialog.innerHTML=
      '<div style="width:36px;height:4px;background:#d1d5db;border-radius:4px;margin:0 auto 16px"></div>'+
      '<div style="text-align:center;margin-bottom:18px">'+
        '<div style="width:52px;height:52px;border-radius:50%;background:linear-gradient(135deg,#e8f5e9,#c8e6c9);display:flex;align-items:center;justify-content:center;margin:0 auto 10px;font-size:1.5rem">\uD83D\uDD14</div>'+
        '<div style="font-weight:700;font-size:1.08rem;color:#1a1a1a;margin-bottom:5px">Auf dem iPhone zuerst die App installieren</div>'+
        '<div style="font-size:.82rem;color:#6b7280;line-height:1.45">Apple erlaubt Benachrichtigungen nur, wenn der Dorfladen als App auf dem Home-Bildschirm liegt. Im Safari-Tab ist das leider nicht m\u00f6glich.</div>'+
      '</div>'+
      '<ol style="margin:0 0 14px;padding-left:20px;font-size:.87rem;color:#374151;line-height:1.6">'+
        '<li style="margin-bottom:6px">In Safari unten auf das <b>Teilen-Symbol</b> tippen (Quadrat mit Pfeil nach oben).</li>'+
        '<li style="margin-bottom:6px">\u201E<b>Zum Home-Bildschirm</b>\u201C ausw\u00e4hlen.</li>'+
        '<li style="margin-bottom:6px">Den Dorfladen \u00fcber das <b>neue Symbol</b> auf dem Home-Bildschirm \u00f6ffnen.</li>'+
        '<li>Dort erneut auf \u201E<b>Benachrichtigungen aktivieren</b>\u201C tippen.</li>'+
      '</ol>'+
      '<div style="font-size:.75rem;color:#9ca3af;text-align:center;margin-bottom:14px">Voraussetzung: iOS 16.4 oder neuer.</div>';

    var btn=document.createElement('button');
    btn.textContent='Verstanden';
    btn.style.cssText='width:100%;padding:14px;border:0;border-radius:12px;background:linear-gradient(135deg,#2d7a5e,#3a9b6e);color:#fff;font-size:.95rem;font-weight:600;cursor:pointer';
    btn.onclick=function(e){e.stopPropagation();closeIosPushHint();};
    dialog.appendChild(btn);

    ov.appendChild(dialog);
    ov.onclick=closeIosPushHint;
    document.body.appendChild(ov);
    requestAnimationFrame(function(){requestAnimationFrame(function(){
      ov.style.background='rgba(0,0,0,.45)';
      dialog.style.transform='translateY(0)';
    });});
  }

  if(!PUSH_SUPPORTED||IOS_NEEDS_INSTALL){
    // Auf dem iPhone im Safari-Tab den Button bewusst ANZEIGEN und beim Tippen
    // den Weg erklaeren. Auf sonstigen Browsern ohne Push bleibt er verborgen.
    if(IOS_NEEDS_INSTALL){
      window.pushToggle=showIosPushHint;
      whenFlags(function(ff){if(ff.push!==false)showPushButtons();});
    }
    return;
  }

  // Push-Button nur zeigen, wenn das Feature nicht deaktiviert ist.
  whenFlags(function(ff){
    if(ff.push===false){
      if(pushBtn)pushBtn.style.display='none';
      if(pushBtnDt)pushBtnDt.style.display='none';
      return;
    }
    showPushButtons();
  });

  navigator.serviceWorker.ready.then(function(reg){
    return reg.pushManager.getSubscription();
  }).then(function(sub){
    updatePushUI(!!sub);
  });

  function urlBase64ToUint8Array(base64String){
    var padding='='.repeat((4-base64String.length%4)%4);
    var base64=(base64String+padding).replace(/-/g,'+').replace(/_/g,'/');
    var raw=atob(base64);
    var arr=new Uint8Array(raw.length);
    for(var i=0;i<raw.length;i++)arr[i]=raw.charCodeAt(i);
    return arr;
  }

  // --- Settings Dialog ---
  function closePushSettings(){
    var el=document.getElementById('push-settings-overlay');
    if(el){el.style.opacity='0';setTimeout(function(){if(el.parentNode)el.remove();},300);}
  }

  function savePushCategories(endpoint){
    var cats=[];
    ['tagesinfo','news','bestellung'].forEach(function(c){
      var cb=document.getElementById('push-cat-'+c);
      if(cb&&cb.checked)cats.push(c);
    });
    function onSaved(){
      closePushSettings();
      showToast('Einstellungen gespeichert!','success');
      updatePushUI(true);
    }
    fetch('/api/push-subscribe',{
      method:'PATCH',
      headers:{'Content-Type':'application/json'},
      body:JSON.stringify({endpoint:endpoint,categories:cats})
    }).then(function(r){return r.json();}).then(function(res){
      if(res.success){onSaved();return;}
      return navigator.serviceWorker.ready.then(function(reg){
        return reg.pushManager.getSubscription();
      }).then(function(sub){
        if(!sub){showToast('Keine aktive Subscription gefunden.','error');return;}
        return fetch('/api/push-subscribe',{
          method:'POST',
          headers:{'Content-Type':'application/json'},
          body:JSON.stringify({subscription:sub.toJSON(),categories:cats,device_id:dlPushDeviceId()})
        }).then(function(r2){return r2.json();}).then(function(res2){
          if(res2.success){onSaved();}
          else{showToast('Fehler beim Speichern','error');}
        });
      });
    }).catch(function(e){
      console.error('Save categories error',e);
      showToast('Netzwerkfehler beim Speichern','error');
    });
  }

  function showPushSettings(endpoint,isNew){
    closePushSettings();
    // Overlay with animation
    var ov=document.createElement('div');
    ov.id='push-settings-overlay';
    ov.style.cssText='position:fixed;top:0;left:0;right:0;bottom:0;z-index:99999;background:rgba(0,0,0,0);display:flex;align-items:flex-end;justify-content:center;padding:0;transition:background .3s ease;font-family:"Segoe UI",system-ui,sans-serif';

    var dialog=document.createElement('div');
    dialog.style.cssText='background:#fff;border-radius:20px 20px 0 0;max-width:400px;width:100%;padding:24px 20px env(safe-area-inset-bottom,16px);box-shadow:0 -8px 40px rgba(0,0,0,.15);transform:translateY(100%);transition:transform .35s cubic-bezier(.4,0,.2,1)';
    dialog.onclick=function(e){e.stopPropagation();};

    // Handle / grip
    var grip=document.createElement('div');
    grip.style.cssText='width:36px;height:4px;background:#d1d5db;border-radius:4px;margin:0 auto 16px';
    dialog.appendChild(grip);

    // Header
    var hdr=document.createElement('div');
    hdr.style.cssText='text-align:center;margin-bottom:20px';
    var iconCircle=document.createElement('div');
    iconCircle.style.cssText='width:52px;height:52px;border-radius:50%;background:linear-gradient(135deg,#e8f5e9,#c8e6c9);display:flex;align-items:center;justify-content:center;margin:0 auto 10px;font-size:1.5rem';
    iconCircle.textContent=isNew?'\uD83C\uDF89':'\uD83D\uDD14';
    hdr.appendChild(iconCircle);
    var title=document.createElement('div');
    title.style.cssText='font-weight:700;font-size:1.1rem;color:#1a1a1a;margin-bottom:4px';
    title.textContent=isNew?'Benachrichtigungen aktiviert!':'Benachrichtigungen';
    hdr.appendChild(title);
    var desc=document.createElement('div');
    desc.style.cssText='font-size:.82rem;color:#6b7280;line-height:1.4';
    desc.textContent=isNew?'W\u00e4hle, wor\u00fcber du informiert werden m\u00f6chtest:':'W\u00e4hle, welche Benachrichtigungen du erhalten m\u00f6chtest:';
    hdr.appendChild(desc);
    dialog.appendChild(hdr);

    // Category cards
    ['tagesinfo','news','bestellung'].forEach(function(c){
      var card=document.createElement('label');
      card.style.cssText='display:flex;align-items:center;gap:14px;padding:14px 16px;margin-bottom:8px;border-radius:12px;border:2px solid #f0f0f0;cursor:pointer;transition:all .15s ease;background:#fafafa';
      card.onmouseover=function(){card.style.borderColor='#5ea88a';card.style.background='#f0faf4';};
      card.onmouseout=function(){var cb=card.querySelector('input');card.style.borderColor=cb&&cb.checked?'#5ea88a':'#f0f0f0';card.style.background=cb&&cb.checked?'#f0faf4':'#fafafa';};
      var iconWrap=document.createElement('span');
      iconWrap.style.cssText='font-size:1.4rem;flex-shrink:0;width:36px;height:36px;display:flex;align-items:center;justify-content:center;background:#fff;border-radius:10px;box-shadow:0 1px 3px rgba(0,0,0,.08)';
      iconWrap.textContent=CAT_ICONS[c];
      card.appendChild(iconWrap);
      var textWrap=document.createElement('div');
      textWrap.style.cssText='flex:1;min-width:0';
      var catName=document.createElement('div');
      catName.style.cssText='font-weight:600;font-size:.9rem;color:#1a1a1a';
      catName.textContent=CAT_LABELS[c];
      textWrap.appendChild(catName);
      var catDesc=document.createElement('div');
      catDesc.style.cssText='font-size:.75rem;color:#9ca3af;margin-top:1px';
      catDesc.textContent=CAT_DESC[c];
      textWrap.appendChild(catDesc);
      card.appendChild(textWrap);
      var toggle=document.createElement('div');
      toggle.style.cssText='position:relative;width:44px;height:24px;flex-shrink:0';
      var cb=document.createElement('input');
      cb.type='checkbox';cb.id='push-cat-'+c;cb.checked=true;
      cb.style.cssText='position:absolute;inset:0;width:100%;height:100%;margin:0;opacity:0;cursor:pointer;z-index:2';
      var track=document.createElement('div');
      track.style.cssText='position:absolute;inset:0;border-radius:12px;background:#5ea88a;transition:background .2s';
      var knob=document.createElement('div');
      knob.style.cssText='position:absolute;top:2px;left:22px;width:20px;height:20px;border-radius:50%;background:#fff;box-shadow:0 1px 3px rgba(0,0,0,.2);transition:left .2s';
      toggle.appendChild(cb);toggle.appendChild(track);toggle.appendChild(knob);
      function syncToggle(){
        if(cb.checked){track.style.background='#5ea88a';knob.style.left='22px';card.style.borderColor='#5ea88a';card.style.background='#f0faf4';}
        else{track.style.background='#d1d5db';knob.style.left='2px';card.style.borderColor='#f0f0f0';card.style.background='#fafafa';}
      }
      cb.addEventListener('change',syncToggle);
      card.appendChild(toggle);
      dialog.appendChild(card);
    });

    // Buttons
    var btnRow=document.createElement('div');
    btnRow.style.cssText='display:flex;gap:10px;margin-top:20px';

    var saveBtn=document.createElement('button');
    saveBtn.style.cssText='flex:2;padding:14px;border:none;border-radius:12px;background:linear-gradient(135deg,#2d7a5e,#3a9b6e);color:#fff;font-weight:700;font-size:.92rem;cursor:pointer;transition:transform .1s;box-shadow:0 4px 12px rgba(45,122,94,.3)';
    saveBtn.textContent=isNew?'\u2705 Fertig':'Speichern';
    saveBtn.onmousedown=function(){saveBtn.style.transform='scale(.97)';};
    saveBtn.onmouseup=function(){saveBtn.style.transform='';};
    saveBtn.addEventListener('click',function(e){e.stopPropagation();savePushCategories(endpoint);});

    var unsubBtn=document.createElement('button');
    unsubBtn.style.cssText='flex:1;padding:14px;border:2px solid #fecaca;border-radius:12px;background:#fff;color:#dc2626;font-weight:600;font-size:.85rem;cursor:pointer;transition:all .15s';
    unsubBtn.textContent='Deaktivieren';
    unsubBtn.onmouseover=function(){unsubBtn.style.background='#fef2f2';};
    unsubBtn.onmouseout=function(){unsubBtn.style.background='#fff';};
    unsubBtn.addEventListener('click',function(e){e.stopPropagation();closePushSettings();doUnsubscribe();});

    btnRow.appendChild(saveBtn);
    btnRow.appendChild(unsubBtn);
    dialog.appendChild(btnRow);

    ov.appendChild(dialog);
    ov.addEventListener('click',function(e){if(e.target===ov)closePushSettings();});
    document.body.appendChild(ov);

    // Animate in
    requestAnimationFrame(function(){requestAnimationFrame(function(){
      ov.style.background='rgba(0,0,0,.45)';
      dialog.style.transform='translateY(0)';
    });});

    // Load current categories
    fetch('/api/push-subscribe?endpoint='+encodeURIComponent(endpoint))
      .then(function(r){return r.json();})
      .then(function(res){
        if(res.categories){
          ['tagesinfo','news','bestellung'].forEach(function(c){
            var cb=document.getElementById('push-cat-'+c);
            if(cb){
              cb.checked=res.categories.indexOf(c)!==-1;
              cb.dispatchEvent(new Event('change'));
            }
          });
        }
      }).catch(function(){});
  }

  function doUnsubscribe(){
    navigator.serviceWorker.ready.then(function(reg){
      return reg.pushManager.getSubscription().then(function(sub){
        if(!sub){
          updatePushUI(false);
          showToast('Benachrichtigungen deaktiviert.','success');
          return;
        }
        var ep=sub.endpoint;
        return sub.unsubscribe().then(function(){
          updatePushUI(false);
          return fetch('/api/push-subscribe',{method:'DELETE',headers:{'Content-Type':'application/json'},body:JSON.stringify({endpoint:ep})});
        }).then(function(){
          showToast('Benachrichtigungen deaktiviert.','success');
        });
      });
    }).catch(function(err){
      console.error('Unsubscribe error',err);
      updatePushUI(false);
      showToast('Benachrichtigungen deaktiviert.','success');
    });
  }

  function freshSubscribe(reg,cats){
    return fetch('/api/push-vapid-key').then(function(r){return r.json()}).then(function(data){
      if(!data.publicKey){throw new Error('Push-Konfiguration fehlt');}
      return reg.pushManager.subscribe({
        userVisibleOnly:true,
        applicationServerKey:urlBase64ToUint8Array(data.publicKey)
      });
    }).then(function(newSub){
      if(!newSub)throw new Error('Subscription fehlgeschlagen');
      return fetch('/api/push-subscribe',{
        method:'POST',
        headers:{'Content-Type':'application/json'},
        body:JSON.stringify({subscription:newSub.toJSON(),categories:cats||['mittagstisch','angebote','news'],device_id:dlPushDeviceId()})
      }).then(function(r){return r.json();}).then(function(res){
        if(!res.success)throw new Error(res.error||'Server-Fehler');
        updatePushUI(true);
        return newSub;
      });
    });
  }

  function registerExisting(sub){
    return fetch('/api/push-subscribe',{
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body:JSON.stringify({subscription:sub.toJSON(),categories:['mittagstisch','angebote','news'],device_id:dlPushDeviceId()})
    }).then(function(r){return r.json();}).then(function(res){
      updatePushUI(true);
      return sub;
    });
  }

  // Force a completely new push subscription by unregistering the service worker
  function nukeAndResubscribe(){
    showToast('Push wird erneuert...','info',3000);
    return navigator.serviceWorker.getRegistration().then(function(reg){
      // Kill old subscription
      return (reg?reg.pushManager.getSubscription():Promise.resolve(null)).then(function(sub){
        return sub?sub.unsubscribe():true;
      }).then(function(){
        // Unregister service worker to force Firefox to drop cached endpoint
        return reg?reg.unregister():true;
      });
    }).then(function(){
      // Re-register service worker
      return navigator.serviceWorker.register('/sw.js');
    }).then(function(){
      return navigator.serviceWorker.ready;
    }).then(function(newReg){
      return freshSubscribe(newReg);
    }).then(function(newSub){
      showPushSettings(newSub.endpoint,true);
    });
  }

  window.pushToggle=function(){
    // Close mobile nav if open
    var mn=document.getElementById('mob-nav');
    var mo=document.getElementById('mob-nav-ov');
    if(mn)mn.classList.remove('open');
    if(mo)mo.classList.remove('open');
    navigator.serviceWorker.ready.then(function(reg){
      return reg.pushManager.getSubscription().then(function(sub){
        if(sub){
          // Browser has a subscription – check if it exists in Dataverse
          return fetch('/api/push-subscribe?endpoint='+encodeURIComponent(sub.endpoint))
            .then(function(r){return r.json();})
            .then(function(res){
              if(res.success){
                // Already registered – show settings
                showPushSettings(sub.endpoint,false);
              }else{
                // Not in Dataverse – register existing and validate via test push
                return fetch('/api/push-subscribe',{
                  method:'POST',
                  headers:{'Content-Type':'application/json'},
                  body:JSON.stringify({subscription:sub.toJSON(),categories:['mittagstisch','angebote','news'],validate:true,device_id:dlPushDeviceId()})
                }).then(function(r){return r.json();}).then(function(res2){
                  if(res2.endpoint_invalid){
                    // Dead endpoint – nuke service worker and get fresh one
                    return nukeAndResubscribe();
                  }
                  updatePushUI(true);
                  showPushSettings(sub.endpoint,true);
                });
              }
            });
        }
        // No subscription at all – create fresh, then show settings dialog
        return freshSubscribe(reg).then(function(newSub){
          showPushSettings(newSub.endpoint,true);
        }).catch(function(err){
          var msg=(err&&err.message)||String(err);
          if(msg.toLowerCase().indexOf('unreachable')!==-1||msg.toLowerCase().indexOf('network')!==-1){
            showToast('Push-Dienst nicht erreichbar. Bitte sp\u00e4ter nochmal versuchen.','warn',5000);
          }else{
            throw err;
          }
        });
      });
    }).catch(function(err){
      var msg=(err&&err.message)||String(err);
      if(Notification.permission==='denied'){
        showToast('Benachrichtigungen sind im Browser blockiert. Bitte in den Einstellungen erlauben.','error',5000);
      }else{
        console.error('Push toggle error',err);
        showToast('Fehler: '+msg,'error',4000);
      }
    });
  };
})();

// === DEV ENVIRONMENT INDICATOR ===
(function(){
  if(location.hostname.indexOf('proud-dune')!==-1||location.hostname.indexOf('witty-island')!==-1||location.hostname.indexOf('dorfladen-test')!==-1){
    var isPopup=!!window.opener||(window.parent!==window);
    var b=document.createElement('div');
    b.id='env-banner';
    b.style.cssText='position:fixed;top:0;left:0;right:0;z-index:99999;background:#e53e3e;color:#fff;text-align:center;padding:4px 0;font-size:13px;font-weight:700;letter-spacing:1px;'+(isPopup?'display:none;':'');
    b.textContent='\u26A0 TEST-UMGEBUNG \u2013 Nicht die Live-Seite!';
    document.body.appendChild(b);
    document.body.style.borderTop='none';
    if(!isPopup){
      document.documentElement.style.cssText+='outline:4px solid #e53e3e !important;outline-offset:-4px;';
      document.body.style.paddingTop='28px';
    }
  }
})();

// === LIGHTWEIGHT ANALYTICS ===
(function(){
  if(window.location.pathname.indexOf('/cms')===0)return; // Don't track CMS
  // Interner Traffic (Entwicklung) markieren, damit die Statistik ihn ausschliesst.
  // Prod bleibt gezaehlt (echte Besucher auf kind-pebble-072605b03 bzw. Custom-Domain).
  function _dlInternal(){
    try{ if(localStorage.getItem('dl_internal')==='1') return true; }catch(e){}
    var h=location.hostname;
    if(/proud-dune|witty-island|dorfladen-test|localhost|127\.0\.0\.1/.test(h)) return true;
    if(/kind-pebble-[0-9a-z]+-\d+\./.test(h)) return true; // PR-Preview (Prod hat kein -<nr>)
    return false;
  }
  try{
    var data={page:window.location.pathname,referrer:document.referrer||'',sw:window.screen?window.screen.width:0,internal:_dlInternal()};
    navigator.sendBeacon('/api/track',JSON.stringify(data));
  }catch(e){}
})();
