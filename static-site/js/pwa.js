// PWA Install – shared across all pages
if('serviceWorker' in navigator){navigator.serviceWorker.register('/sw.js').catch(function(){});}

var _pwaPrompt=null;

function pwaShowLinks(){
  var m=document.getElementById('mob-pwa-install');if(m)m.style.display='';
  var d=document.getElementById('dt-pwa-install');if(d)d.style.display='';
}
function pwaHideAll(){
  ['pwa-install-banner','mob-pwa-install','dt-pwa-install'].forEach(function(id){
    var el=document.getElementById(id);if(el)el.style.display='none';
  });
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
  if(!_pwaPrompt){
    if(/iPhone|iPad|iPod/.test(navigator.userAgent)){
      alert('Tippe auf das Teilen-Symbol (Quadrat mit Pfeil) und dann auf \u201eZum Home-Bildschirm\u201c.');
    }
    return;
  }
  _pwaPrompt.prompt();
  _pwaPrompt.userChoice.then(function(r){
    if(r.outcome==='accepted')pwaHideAll();
    _pwaPrompt=null;
  });
}
function pwaCloseBanner(){
  var b=document.getElementById('pwa-install-banner');
  if(b)b.style.display='none';
  localStorage.setItem('pwa-dismissed','1');
}

// iOS: no beforeinstallprompt, show links manually
if(/iPhone|iPad|iPod/.test(navigator.userAgent)&&!navigator.standalone){
  pwaShowLinks();
  if(!localStorage.getItem('pwa-dismissed')){
    setTimeout(function(){
      var b=document.getElementById('pwa-install-banner');
      if(!b)return;
      var txt=b.querySelector('div > div:last-of-type');
      if(txt)txt.innerHTML='<div style="font-weight:700;font-size:.95rem">Dorfladen als App</div><div style="font-size:.78rem;opacity:.85;margin-top:2px">Tippe <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" style="vertical-align:middle"><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/><polyline points="16 6 12 2 8 6"/><line x1="12" x2="12" y1="2" y2="15"/></svg> und dann <b>\u201eZum Home-Bildschirm\u201c</b></div>';
      var btn=b.querySelector('button');if(btn)btn.style.display='none';
      b.style.display='';
    },3000);
  }
}
