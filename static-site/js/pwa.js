// PWA Install – shared across all pages
if('serviceWorker' in navigator){navigator.serviceWorker.register('/sw.js').catch(function(){});}

// PWA: Android back gesture – close popups/overlays first, then navigate
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
    if(nOv){nOv.classList.remove('open');setTimeout(function(){if(nOv.parentNode)nOv.remove();},300);return true;}
    // Desktop modals
    var dtModal=document.querySelector('[id^="dt-modal-"].open');
    if(dtModal){dtModal.classList.remove('open');return true;}
    // PWA install banner
    var pwaBanner=document.getElementById('pwa-install-banner');
    if(pwaBanner&&pwaBanner.style.display!=='none'&&pwaBanner.offsetParent){
      pwaBanner.style.display='none';return true;
    }
    return false;
  }

  // When a popup opens, push a history state so Android back can close it
  function pushPopupState(){
    if(!history.state||!history.state.pwaPopup){
      history.pushState({pwaPopup:true},'','');
    }
  }

  // Hook into popup/overlay open functions to push history state
  function hookOpeners(){
    // Mobile popups
    if(window.mobOpenPopup){
      var origMobOpen=window.mobOpenPopup;
      window.mobOpenPopup=function(id){origMobOpen(id);pushPopupState();};
    }
    // Mobile nav
    var menuBtn=document.querySelector('.mob-header-menu');
    if(menuBtn){
      menuBtn.addEventListener('click',function(){setTimeout(pushPopupState,50);});
    }
    // Lightbox
    if(window.openLightbox){
      var origLB=window.openLightbox;
      window.openLightbox=function(idx){origLB(idx);pushPopupState();};
    }
    // Desktop modals
    if(window.openDtModal){
      var origDtM=window.openDtModal;
      window.openDtModal=function(id){origDtM(id);pushPopupState();};
    }
  }
  // Hook after DOM is ready
  if(document.readyState==='loading'){document.addEventListener('DOMContentLoaded',hookOpeners);}
  else{setTimeout(hookOpeners,0);}

  // Handle back gesture
  window.addEventListener('popstate',function(e){
    if(e.state&&e.state.pwaPopup){
      // We're going back from a popup state – close it
      closeAnyPopup();
      return;
    }
    // Try to close popup even without explicit state
    if(closeAnyPopup()){
      // Something was closed – push current URL back to prevent actual navigation
      history.pushState(null,'',window.location.href);
      return;
    }
    // On start page in standalone mode: prevent app from closing
    if(isStandalone&&window.location.pathname==='/'){
      if(e.state&&e.state.pwaGuard){
        history.pushState({pwaMain:true},'','/');
      }
    }
  });

  // Standalone: guard against closing on start page
  if(isStandalone&&window.location.pathname==='/'&&(!history.state||!history.state.pwaMain)){
    history.replaceState({pwaGuard:true},'','/');
    history.pushState({pwaMain:true},'','/');
  }
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

  function updatePushUI(subscribed){
    [pushBtn,pushBtnDt].forEach(function(btn){
      if(!btn)return;
      if(subscribed){
        btn.textContent='\uD83D\uDD14 Benachrichtigungen aktiv';
        btn.setAttribute('data-subscribed','1');
      }else{
        btn.textContent='\uD83D\uDD14 Benachrichtigungen aktivieren';
        btn.removeAttribute('data-subscribed');
      }
    });
  }

  function showPushButtons(){
    if(pushBtn)pushBtn.style.display='';
    if(pushBtnDt)pushBtnDt.style.display='';
  }

  // Check if push is supported
  if(!('PushManager' in window)||!('serviceWorker' in navigator)){return;}
  showPushButtons();

  // Check current subscription state
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

  window.pushToggle=function(){
    navigator.serviceWorker.ready.then(function(reg){
      return reg.pushManager.getSubscription().then(function(sub){
        if(sub){
          // Unsubscribe
          return sub.unsubscribe().then(function(){
            fetch('/api/push-subscribe',{method:'DELETE',headers:{'Content-Type':'application/json'},body:JSON.stringify({endpoint:sub.endpoint})});
            updatePushUI(false);
          });
        }
        // Subscribe
        return fetch('/api/push-vapid-key').then(function(r){return r.json()}).then(function(data){
          if(!data.publicKey){alert('Push-Konfiguration fehlt.');return;}
          return reg.pushManager.subscribe({
            userVisibleOnly:true,
            applicationServerKey:urlBase64ToUint8Array(data.publicKey)
          });
        }).then(function(newSub){
          if(!newSub)return;
          return fetch('/api/push-subscribe',{
            method:'POST',
            headers:{'Content-Type':'application/json'},
            body:JSON.stringify({subscription:newSub.toJSON()})
          }).then(function(){
            updatePushUI(true);
          });
        });
      });
    }).catch(function(err){
      if(Notification.permission==='denied'){
        alert('Benachrichtigungen sind im Browser blockiert. Bitte in den Einstellungen erlauben.');
      }else{
        console.error('Push toggle error',err);
      }
    });
  };
})();
