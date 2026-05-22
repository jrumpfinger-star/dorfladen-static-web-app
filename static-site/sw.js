var CACHE_NAME='dorfladen-v3';
var PRECACHE=[
  '/',
  '/css/style.css',
  '/css/mobile.css',
  '/js/app.js',
  '/js/mobile.js',
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
  // Network-first for API calls
  if(e.request.url.indexOf('/api/')!==-1){
    e.respondWith(
      fetch(e.request).catch(function(){return caches.match(e.request);})
    );
    return;
  }
  // Stale-while-revalidate for everything else
  e.respondWith(
    caches.match(e.request).then(function(cached){
      var fetched=fetch(e.request).then(function(response){
        var clone=response.clone();
        caches.open(CACHE_NAME).then(function(cache){
          cache.put(e.request,clone);
        });
        return response;
      }).catch(function(){return cached;});
      return cached||fetched;
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
  e.waitUntil(self.registration.showNotification(data.title,opts));
});

self.addEventListener('notificationclick',function(e){
  e.notification.close();
  var url=e.notification.data&&e.notification.data.url?e.notification.data.url:'/';
  e.waitUntil(
    clients.matchAll({type:'window',includeUncontrolled:true}).then(function(cl){
      for(var i=0;i<cl.length;i++){
        if(cl[i].url.indexOf(url)!==-1&&'focus' in cl[i])return cl[i].focus();
      }
      if(clients.openWindow)return clients.openWindow(url);
    })
  );
});
