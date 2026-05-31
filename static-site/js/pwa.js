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
    // Push settings overlay
    var pushOv=document.getElementById('push-settings-overlay');
    if(pushOv){
      if(typeof closePushSettings==='function')closePushSettings();
      else{pushOv.style.opacity='0';setTimeout(function(){if(pushOv.parentNode)pushOv.remove();},300);}
      return true;
    }
    // CMS confirm overlay
    var confirmOv=document.querySelector('.cms-confirm-overlay');
    if(confirmOv){
      var cancelBtn=confirmOv.querySelector('[data-action="cancel"],.cms-confirm-cancel');
      if(cancelBtn)cancelBtn.click();
      else{confirmOv.remove();}
      return true;
    }
    // Hilfe-Dialog (from hilfe-popup.js)
    var hilfeDialog=document.getElementById('hilfe-dialog');
    if(hilfeDialog&&hilfeDialog.open){
      if(typeof closeHilfePopup==='function')closeHilfePopup();
      else if(hilfeDialog.close)hilfeDialog.close();
      return true;
    }
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
  var CAT_LABELS={mittagstisch:'Mittagstisch',angebote:'Angebote',news:'News / Aktuelles'};
  var CAT_ICONS={mittagstisch:'\uD83C\uDF7D\uFE0F',angebote:'\uD83C\uDF1F',news:'\uD83D\uDCE2'};
  var CAT_DESC={mittagstisch:'T\u00e4glicher Mittagstisch & Speisekarte',angebote:'Sonderangebote & Aktionen',news:'Neuigkeiten & Infos'};

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
    [pushBtn,pushBtnDt].forEach(function(btn){
      if(!btn)return;
      var label=subscribed?'\uD83D\uDD14 Benachrichtigungen aktiv':'\uD83D\uDD14 Benachrichtigungen aktivieren';
      // For desktop: the <li> contains an <a> – update the <a> text, not the <li>
      var a=btn.querySelector('a');
      if(a){a.textContent=label;}else{btn.textContent=label;}
      if(subscribed){btn.setAttribute('data-subscribed','1');}
      else{btn.removeAttribute('data-subscribed');}
    });
  }

  function showPushButtons(){
    if(pushBtn)pushBtn.style.display='';
    if(pushBtnDt)pushBtnDt.style.display='';
  }

  if(!('PushManager' in window)||!('serviceWorker' in navigator)){return;}

  // Check feature flags before showing push buttons
  (function(){
    var flagsUrl='/api/cms-config';
    try{
      fetch(flagsUrl).then(function(r){return r.json();}).then(function(res){
        if(res.success&&res.data){
          var ff=res.data.feature_flags;
          if(typeof ff==='string'){try{ff=JSON.parse(ff);}catch(e){ff={};}}
          if(ff&&ff.push===false){
            if(pushBtn)pushBtn.style.display='none';
            if(pushBtnDt)pushBtnDt.style.display='none';
            return;
          }
          // Scanner feature flag
          if(ff&&ff.scanner===false){
            window._dlFeatScanner=false;
            var sb=document.getElementById('mob-pl-barcode-btn');if(sb)sb.style.display='none';
            var sbd=document.querySelector('.so-barcode-btn');if(sbd)sbd.style.display='none';
          }else{
            window._dlFeatScanner=true;
          }
        }
        showPushButtons();
      }).catch(function(){showPushButtons();});
    }catch(e){showPushButtons();}
  })();

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
    ['mittagstisch','angebote','news'].forEach(function(c){
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
          body:JSON.stringify({subscription:sub.toJSON(),categories:cats})
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
    ['mittagstisch','angebote','news'].forEach(function(c){
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
          ['mittagstisch','angebote','news'].forEach(function(c){
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
        body:JSON.stringify({subscription:newSub.toJSON(),categories:cats||['mittagstisch','angebote','news']})
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
      body:JSON.stringify({subscription:sub.toJSON(),categories:['mittagstisch','angebote','news']})
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
                  body:JSON.stringify({subscription:sub.toJSON(),categories:['mittagstisch','angebote','news'],validate:true})
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
