var CACHE_NAME='dorfladen-v31';
var PRECACHE=[
  '/',
  '/tagesinfo.html',
  '/css/style.css',
  '/css/mobile.css',
  '/js/app.js',
  '/js/mobile.js',
  '/js/pwa.js',
  '/hilfe-popup.js',
  '/images/icon-192.png',
  '/images/icon-512.png',
  '/favicon.ico'
];

self.addEventListener('install',function(e){
  e.waitUntil(
    caches.open(CACHE_NAME).then(function(cache){
      return cache.addAll(PRECACHE);
    })
  );
  self.skipWaiting();
});

// Allow page to force-activate a waiting SW + Badge zuruecksetzen, wenn die App
// geoeffnet/sichtbar wird (Notifications gelten dann als gesehen).
self.addEventListener('message',function(e){
  if(e.data&&e.data.type==='SKIP_WAITING') self.skipWaiting();
  if(e.data&&e.data.type==='CLEAR_BADGE'){
    e.waitUntil(idbBadge('set',0).then(function(){return clearAppBadge();}));
  }
});

// ── App-Icon-Badge (ungelesene Push-Nachrichten) ─────────────────────────────
// Persistenter Zaehler in IndexedDB (der SW hat kein localStorage). Bei jeder
// Push-Nachricht +1, beim Oeffnen/Anklicken zurueck auf 0. Zeigt auf installierten
// PWAs (Android/Chrome, Desktop, iOS 16.4+) eine Zahl am App-Icon.
function idbBadge(mode,val){
  return new Promise(function(resolve){
    try{
      var open=indexedDB.open('dl-badge',1);
      open.onupgradeneeded=function(){ try{ open.result.createObjectStore('kv'); }catch(_){} };
      open.onerror=function(){ resolve(0); };
      open.onsuccess=function(){
        try{
          var db=open.result;
          var tx=db.transaction('kv',mode==='get'?'readonly':'readwrite');
          var store=tx.objectStore('kv');
          if(mode==='get'){
            var g=store.get('unread');
            g.onsuccess=function(){ resolve(Number(g.result)||0); };
            g.onerror=function(){ resolve(0); };
          }else{
            store.put(Number(val)||0,'unread');
            tx.oncomplete=function(){ resolve(Number(val)||0); };
            tx.onerror=function(){ resolve(Number(val)||0); };
          }
        }catch(_){ resolve(0); }
      };
    }catch(_){ resolve(0); }
  });
}
function setAppBadge(n){
  try{
    if(n>0 && self.navigator && self.navigator.setAppBadge) return self.navigator.setAppBadge(n);
    if(self.navigator && self.navigator.clearAppBadge) return self.navigator.clearAppBadge();
  }catch(_){}
  return Promise.resolve();
}
function clearAppBadge(){
  try{ if(self.navigator && self.navigator.clearAppBadge) return self.navigator.clearAppBadge(); }catch(_){}
  return Promise.resolve();
}

self.addEventListener('activate',function(e){
  e.waitUntil(
    caches.keys().then(function(names){
      return Promise.all(
        names.filter(function(n){return n!==CACHE_NAME;})
             .map(function(n){return caches.delete(n);})
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch',function(e){
  var url=e.request.url;
  // Network-first for API calls
  if(url.indexOf('/api/')!==-1){
    e.respondWith(
      fetch(e.request).catch(function(){return caches.match(e.request);})
    );
    return;
  }
  // Network-first for HTML, JS, CSS (always get fresh code)
  // Note: Firefox / manche In-App-Browser (z.B. WhatsApp) lassen request.destination leer und
  // Navigationen (/, /?tagesinfo=1) enden nicht auf .html - daher zusaetzlich request.mode==='navigate'
  // pruefen, sonst wuerde die alte, vorab gecachte Startseite ausgeliefert.
  var dest=e.request.destination;
  var isNav=e.request.mode==='navigate';
  var isCode=isNav||dest==='document'||dest==='script'||dest==='style'||dest==='worker'
     ||url.endsWith('.html')||url.endsWith('.js')||url.endsWith('.css')||url.endsWith('.json')
     ||url.indexOf('/handbuch/')!==-1;
  if(isCode){
    e.respondWith(
      fetch(e.request).then(function(response){
        var clone=response.clone();
        caches.open(CACHE_NAME).then(function(cache){cache.put(e.request,clone);});
        return response;
      }).catch(function(){
        return caches.match(e.request).then(function(c){
          if(c)return c;
          if(isNav)return caches.match('/');
          return undefined;
        });
      })
    );
    return;
  }
  // Cache-first for images, fonts, icons (rarely change)
  e.respondWith(
    caches.match(e.request).then(function(cached){
      if(cached)return cached;
      return fetch(e.request).then(function(response){
        var clone=response.clone();
        caches.open(CACHE_NAME).then(function(cache){cache.put(e.request,clone);});
        return response;
      });
    })
  );
});

// Push Notifications
self.addEventListener('push',function(e){
  var data={title:'Dorfladen Oberornau',body:'',url:'/',icon:'/images/icon-192.png',badge:'/images/icon-192.png',tag:'dorfladen'};
  if(e.data){
    try{var d=e.data.json();Object.assign(data,d);}catch(ex){data.body=e.data.text();}
  }
  var opts={
    body:data.body,
    icon:data.icon,
    badge:data.badge,
    tag:data.tag,
    data:{url:data.url},
    vibrate:[200,100,200],
    requireInteraction:false
  };
  if(data.image)opts.image=data.image;
  // Notification anzeigen UND ungelesen-Zaehler am App-Icon erhoehen.
  e.waitUntil(
    self.registration.showNotification(data.title,opts).then(function(){
      return idbBadge('get').then(function(n){
        var c=(Number(n)||0)+1;
        return idbBadge('set',c).then(function(){ return setAppBadge(c); });
      });
    })
  );
});

// Auto-renew expired push subscriptions (Firefox lets them expire)
self.addEventListener('pushsubscriptionchange',function(e){
  e.waitUntil(
    fetch('/api/push-vapid-key').then(function(r){return r.json();}).then(function(data){
      if(!data.publicKey)throw new Error('no key');
      var raw=self.atob(data.publicKey.replace(/-/g,'+').replace(/_/g,'/'));
      var arr=new Uint8Array(raw.length);
      for(var i=0;i<raw.length;i++)arr[i]=raw.charCodeAt(i);
      return self.registration.pushManager.subscribe({userVisibleOnly:true,applicationServerKey:arr});
    }).then(function(newSub){
      var oldEp=(e.oldSubscription&&e.oldSubscription.endpoint)||'';
      // Reihenfolge ist wichtig: ERST das neue Abo speichern und dabei den alten
      // Endpoint mitgeben – der Server uebernimmt daraus E-Mail, Geraete-ID und
      // Kategorien. Wuerde das alte Abo zuerst geloescht, waere diese Vorlage weg
      // und 1:1-Pushes (Bestell-/Kontakt-Chat) kaemen nie wieder an.
      return fetch('/api/push-subscribe',{
        method:'POST',
        headers:{'Content-Type':'application/json'},
        body:JSON.stringify({subscription:newSub.toJSON(),old_endpoint:oldEp})
      }).then(function(){
        if(!oldEp)return;
        return fetch('/api/push-subscribe',{method:'DELETE',headers:{'Content-Type':'application/json'},body:JSON.stringify({endpoint:oldEp})});
      });
    })
  );
});

self.addEventListener('notificationclick',function(e){
  e.notification.close();
  var rawUrl=e.notification.data&&e.notification.data.url?e.notification.data.url:'/';
  var targetUrl;
  try{ targetUrl=new URL(rawUrl,self.location.origin).href; }catch(_){ targetUrl=self.location.origin+'/'; }
  var targetOrigin;
  try{ targetOrigin=new URL(targetUrl).origin; }catch(_){ targetOrigin=self.location.origin; }

  function openFresh(){
    return clients.openWindow ? clients.openWindow(targetUrl) : undefined;
  }

  var openApp=clients.matchAll({type:'window',includeUncontrolled:true}).then(function(cl){
      // Alle gleichnamigen (same-origin) Fenster sammeln.
      var same=[];
      for(var i=0;i<cl.length;i++){
        var c=cl[i];
        if(!c || !c.url) continue;
        try{ if(new URL(c.url).origin===targetOrigin) same.push(c); }catch(_){}
      }
      // Nacheinander versuchen: fokussieren + navigieren. Schlaegt navigate fehl
      // (z.B. nicht vom SW kontrolliertes Fenster), zum naechsten Fenster bzw.
      // am Ende zu openWindow ausweichen -> Link oeffnet zuverlaessig.
      function tryAt(idx){
        if(idx>=same.length) return openFresh();
        var c=same[idx];
        var focusP = ('focus' in c) ? Promise.resolve().then(function(){return c.focus();}).catch(function(){return c;}) : Promise.resolve(c);
        return focusP.then(function(fc){
          var t = fc && fc.navigate ? fc : c;
          if('navigate' in t){
            return Promise.resolve().then(function(){ return t.navigate(targetUrl); })
              .then(function(nc){ return (nc && nc.focus) ? nc.focus() : nc; })
              .catch(function(){ return tryAt(idx+1); });
          }
          return tryAt(idx+1);
        }).catch(function(){ return tryAt(idx+1); });
      }
      return tryAt(0);
    }).catch(openFresh);
  // Klick = gelesen -> Badge zuruecksetzen.
  e.waitUntil(Promise.all([openApp, idbBadge('set',0).then(function(){return clearAppBadge();})]));
});
