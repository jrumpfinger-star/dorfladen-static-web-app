/* Homepage – Kundenkontakt-Chat (WhatsApp-artig, 1:1 mit dem Dorfladen).
   Nur aktiv wenn Feature-Flag kiosk_kontakt gesetzt ist. Ersetzt die
   1:1-"Frage"-WhatsApp-Einstiege (Float-Button/Footer/Kontakt), die
   WhatsApp-Gruppe bleibt unberuehrt. */
(function(){
  var API='/api';
  var _open=false, _thread=null, _pollTimer=null, _histPushed=false;
  var _sending=false;
  var _pendingImg=null;

  function devId(){ try{ return (window.dlPushDeviceId?dlPushDeviceId():localStorage.getItem('dl_push_device_id'))||''; }catch(e){ return ''; } }
  function geraet(){
    var ua=navigator.userAgent||'';
    var os='Gerät';
    if(/Android/i.test(ua))os='Android'; else if(/iPhone|iPad|iPod/i.test(ua))os='iOS'; else if(/Windows/i.test(ua))os='Windows'; else if(/Mac OS X|Macintosh/i.test(ua))os='Mac'; else if(/Linux/i.test(ua))os='Linux';
    var br='';
    if(/Edg\//i.test(ua))br='Edge'; else if(/OPR\/|Opera/i.test(ua))br='Opera'; else if(/Chrome\//i.test(ua)&&!/Chromium/i.test(ua))br='Chrome'; else if(/Firefox\//i.test(ua))br='Firefox'; else if(/Safari\//i.test(ua)&&!/Chrome/i.test(ua))br='Safari';
    return br?(os+' · '+br):os;
  }
  function esc(s){ return (s==null?'':String(s)).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }
  function lastReply(t){ if(!t||!t.verlauf) return null; for(var i=t.verlauf.length-1;i>=0;i--){ if(t.verlauf[i].who==='dorfladen') return t.verlauf[i]; } return null; }
  function seenKey(){ return 'dl_kontakt_seen'; }

  // ── Flag pruefen ──
  function init(){
    fetch(API+'/cms-config').then(function(r){return r.json();}).then(function(res){
      var flags={}; if(res&&res.success&&res.data){ flags=res.data.feature_flags; if(typeof flags==='string'){try{flags=JSON.parse(flags);}catch(e){flags={};}} }
      if(flags && flags.kiosk_kontakt===true){ enable(); }
    }).catch(function(){});
  }

  function enable(){
    buildFloat();
    buildOverlay();
    // 1:1-"Frage"-WhatsApp-Einstiege auf den Chat umbiegen (Gruppe bleibt).
    var wa=document.getElementById('hp-wa-float'); if(wa) wa.style.display='none';
    document.querySelectorAll('a[href*="wa.me"]').forEach(function(a){
      var href=''; try{ href=decodeURIComponent(a.getAttribute('href')||''); }catch(e){ href=a.getAttribute('href')||''; }
      if(/Frage/i.test(href) && !/Gruppe/i.test(href)){
        a.addEventListener('click',function(e){ e.preventDefault(); openChat(); });
        a.removeAttribute('target');
      }
    });
    // Auto-Open per ?chat=1 (z.B. aus Push-Notification)
    try{ if(new URLSearchParams(location.search).get('chat')==='1'){ setTimeout(openChat,300); } }catch(e){}
    // Hintergrund: neue Antwort? -> roter Punkt am Float
    pollDot(); setInterval(pollDot, 45000);
  }

  function buildFloat(){
    if(document.getElementById('hp-chat-float')) return;
    if(!document.getElementById('hp-chat-float-style')){
      var st=document.createElement('style'); st.id='hp-chat-float-style';
      st.textContent='@keyframes hpChatPulse{0%{box-shadow:0 6px 20px rgba(0,0,0,.28),0 0 0 0 rgba(46,125,79,.45)}70%{box-shadow:0 6px 20px rgba(0,0,0,.28),0 0 0 14px rgba(46,125,79,0)}100%{box-shadow:0 6px 20px rgba(0,0,0,.28),0 0 0 0 rgba(46,125,79,0)}}'
        +'#hp-chat-float{animation:hpChatPulse 2.4s ease-out 3}#hp-chat-float:hover{background:#256b43}';
      document.head.appendChild(st);
    }
    var b=document.createElement('button');
    b.id='hp-chat-float';
    b.setAttribute('aria-label','Schreib uns – Chat mit dem Dorfladen');
    b.style.cssText='position:fixed;right:16px;bottom:16px;z-index:9998;display:flex;align-items:center;gap:9px;padding:13px 20px 13px 16px;border:none;border-radius:30px;background:#2e7d4f;color:#fff;font-size:15px;font-weight:700;line-height:1;box-shadow:0 6px 20px rgba(0,0,0,.28);cursor:pointer';
    b.innerHTML='<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/></svg>'
      +'<span>Schreib uns</span>'
      +'<span id="hp-chat-dot" style="display:none;position:absolute;top:-3px;right:-3px;width:14px;height:14px;border-radius:50%;background:#dc2626;border:2px solid #fff"></span>';
    b.onclick=openChat;
    document.body.appendChild(b);
  }

  function buildOverlay(){
    if(document.getElementById('hp-chat-ov')) return;
    var ov=document.createElement('div');
    ov.id='hp-chat-ov';
    ov.style.cssText='display:none;position:fixed;z-index:10000;right:16px;bottom:16px;width:370px;max-width:calc(100vw - 24px);height:560px;max-height:calc(100vh - 24px);background:#fff;border-radius:16px;box-shadow:0 20px 60px rgba(0,0,0,.3);flex-direction:column;overflow:hidden';
    ov.innerHTML=''
      +'<div style="background:#1e3a2f;color:#fff;padding:12px 14px;display:flex;align-items:center;gap:10px">'
        +'<div style="width:38px;height:38px;border-radius:50%;background:#fff;display:flex;align-items:center;justify-content:center;flex-shrink:0"><img src="/images/icon-192.png" alt="" style="width:30px;height:30px;border-radius:50%" onerror="this.style.display=\'none\'"></div>'
        +'<div style="flex:1;min-width:0"><div style="font-weight:800;font-size:15px">Dorfladen Oberornau</div><div style="font-size:11px;opacity:.8">antwortet meist während der Öffnungszeiten</div></div>'
        +'<button id="hp-chat-close" aria-label="Schließen" style="background:none;border:none;color:#fff;font-size:22px;cursor:pointer;padding:4px 8px">✕</button>'
      +'</div>'
      +'<div id="hp-chat-devbar" style="font-size:11px;color:#6b7280;background:#f3f4f6;padding:4px 12px;border-bottom:1px solid #eef2f7;display:flex;align-items:center;gap:6px"></div>'
      +'<div id="hp-chat-msgs" style="flex:1;overflow-y:auto;padding:12px;background:#f7faf8;display:flex;flex-direction:column;gap:8px"></div>'
      +'<div style="border-top:1px solid #eef2f7;padding:8px 10px;background:#fff">'
        +'<details id="hp-chat-ident" style="margin-bottom:6px">'
          +'<summary style="font-size:12px;color:#6b7280;cursor:pointer">Ihre Daten (optional)</summary>'
          +'<div style="display:flex;gap:6px;margin-top:6px">'
            +'<input id="hp-chat-name" placeholder="Name" style="flex:1;min-width:0;padding:7px 9px;border:1px solid #d1d5db;border-radius:8px;font-size:13px">'
            +'<input id="hp-chat-email" type="email" placeholder="E-Mail" style="flex:1.4;min-width:0;padding:7px 9px;border:1px solid #d1d5db;border-radius:8px;font-size:13px">'
          +'</div>'
          +'<div style="font-size:11px;color:#9ca3af;margin-top:5px;line-height:1.35">Damit die Verkäuferin weiß, wer schreibt. Ohne Angabe erscheinen Sie als „Website-Besucher".</div>'
          +'<label style="display:flex;align-items:center;gap:6px;font-size:12px;color:#374151;margin-top:6px"><input type="checkbox" id="hp-chat-email-opt"> Antworten auch per E-Mail</label>'
        +'</details>'
        +'<label id="hp-chat-push-row" style="display:flex;align-items:center;gap:6px;font-size:12px;color:#374151;margin-bottom:6px"><input type="checkbox" id="hp-chat-push-opt" checked> 📲 Antworten als App-Benachrichtigung</label>'
        +'<div id="hp-chat-preview" style="display:none;align-items:center;gap:8px;margin-bottom:6px;padding:6px;background:#f3f4f6;border-radius:10px"><img id="hp-chat-prev-img" alt="" style="height:52px;width:52px;object-fit:cover;border-radius:6px"><span style="flex:1;font-size:12px;color:#6b7280">Bild bereit – Unterschrift optional</span><button id="hp-chat-prev-x" type="button" aria-label="Bild entfernen" style="background:none;border:none;font-size:18px;color:#6b7280;cursor:pointer;line-height:1">✕</button></div>'
        +'<div style="display:flex;gap:6px;align-items:flex-end">'
          +'<input type="file" accept="image/*" id="hp-chat-file" style="display:none">'
          +'<button id="hp-chat-imgbtn" title="Foto senden" style="background:#f3f4f6;border:1px solid #e5e7eb;border-radius:8px;width:38px;height:38px;cursor:pointer;flex-shrink:0;display:flex;align-items:center;justify-content:center"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#374151" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.1-3.1a2 2 0 0 0-2.8 0L6 21"/></svg></button>'
          +'<textarea id="hp-chat-input" rows="2" maxlength="1000" placeholder="Nachricht schreiben…" style="flex:1;min-width:0;min-height:60px;padding:12px 13px;border:1px solid #d1d5db;border-radius:12px;font-size:15px;line-height:1.4;resize:none;overflow:hidden;max-height:150px;box-sizing:border-box"></textarea>'
          +'<button id="hp-chat-send" style="background:#2e7d4f;border:none;border-radius:10px;width:40px;height:40px;cursor:pointer;flex-shrink:0;display:flex;align-items:center;justify-content:center"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg></button>'
        +'</div>'
      +'</div>';
    document.body.appendChild(ov);

    document.getElementById('hp-chat-close').onclick=closeChat;
    var inp=document.getElementById('hp-chat-input');
    inp.addEventListener('input',function(){ inp.style.height='auto'; inp.style.height=inp.scrollHeight+'px'; });
    inp.addEventListener('keydown',function(e){ if(e.key==='Enter'&&!e.shiftKey){ e.preventDefault(); doSend(); } });
    document.getElementById('hp-chat-send').onclick=doSend;
    document.getElementById('hp-chat-imgbtn').onclick=function(){ document.getElementById('hp-chat-file').click(); };
    document.getElementById('hp-chat-file').addEventListener('change',function(){ if(this.files&&this.files[0]) stagePendingImage(this.files[0]); this.value=''; });
    document.getElementById('hp-chat-prev-x').onclick=clearPending;
    // Push-Zeile ausblenden, wenn Berechtigung blockiert
    try{ if(typeof Notification!=='undefined' && Notification.permission==='denied'){ var pr=document.getElementById('hp-chat-push-row'); if(pr) pr.style.display='none'; } }catch(e){}
    // Gespeicherte Kundendaten vorbelegen
    try{ var d=JSON.parse(localStorage.getItem('dl_lunch_customer')||'{}'); if(d.name)document.getElementById('hp-chat-name').value=d.name; if(d.email)document.getElementById('hp-chat-email').value=d.email; }catch(e){}
    // Geraete-Hinweis: dieser Chat ist mit diesem Geraet verknuepft.
    try{
      var dv=devId(); var code=dv?('#'+dv.replace(/[^a-zA-Z0-9]/g,'').slice(-4)):'';
      var db=document.getElementById('hp-chat-devbar');
      if(db) db.innerHTML='<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink:0"><rect x="5" y="2" width="14" height="20" rx="2"/><line x1="12" y1="18" x2="12" y2="18"/></svg><span>Chat auf diesem Gerät · '+geraet()+(code?(' · '+code):'')+'</span>';
    }catch(e){}
    // isMobile: Vollbild (Hoehe dynamisch via visualViewport, s. fitMobile)
    if(isMobile()){
      ov.style.cssText+=';right:0;left:0;top:0;bottom:auto;width:100vw;max-width:100vw;max-height:none;border-radius:0';
    }
  }

  function isMobile(){ return !!(window.matchMedia && window.matchMedia('(max-width:600px)').matches); }

  var _vvBound=false;
  function fitMobile(){
    if(!isMobile()) return;
    var ov=document.getElementById('hp-chat-ov'); if(!ov) return;
    var vv=window.visualViewport;
    var h=vv?vv.height:window.innerHeight;
    var top=vv?vv.offsetTop:0;
    ov.style.height=h+'px';
    ov.style.top=top+'px';
    var box=document.getElementById('hp-chat-msgs'); if(box) box.scrollTop=box.scrollHeight;
  }
  function bindVV(){
    if(_vvBound || !isMobile()) return; _vvBound=true;
    if(window.visualViewport){ window.visualViewport.addEventListener('resize',fitMobile); window.visualViewport.addEventListener('scroll',fitMobile); }
    window.addEventListener('resize',fitMobile);
  }
  function unbindVV(){
    if(!_vvBound) return; _vvBound=false;
    if(window.visualViewport){ window.visualViewport.removeEventListener('resize',fitMobile); window.visualViewport.removeEventListener('scroll',fitMobile); }
    window.removeEventListener('resize',fitMobile);
  }

  function openChat(){
    var ov=document.getElementById('hp-chat-ov'); if(!ov) return;
    ov.style.display='flex'; _open=true;
    document.getElementById('hp-chat-dot').style.display='none';
    if(isMobile()){ if(window.dlLockScroll) dlLockScroll(); fitMobile(); bindVV(); }
    if(!_histPushed){ _histPushed=true; try{ history.pushState({dlChat:1},''); }catch(e){} }
    loadThread(true);
    if(_pollTimer) clearInterval(_pollTimer);
    _pollTimer=setInterval(function(){ loadThread(false); }, 15000);
    setTimeout(function(){ var i=document.getElementById('hp-chat-input'); if(i) i.focus(); }, 100);
  }
  function closeChat(_fromPop){
    var ov=document.getElementById('hp-chat-ov'); if(!ov) return;
    ov.style.display='none'; _open=false;
    unbindVV();
    if(_pollTimer){ clearInterval(_pollTimer); _pollTimer=null; }
    if(window.dlUnlockScroll) dlUnlockScroll();
    markSeen();
    if(_histPushed){ _histPushed=false; if(!_fromPop){ try{ history.back(); }catch(e){} } }
  }
  window.addEventListener('popstate',function(){ if(_open) closeChat(true); });

  function markSeen(){
    var lr=lastReply(_thread);
    try{ localStorage.setItem(seenKey(), lr?((lr.t||'')+'|'+(lr.text||lr.datei||'')):''); }catch(e){}
    var dot=document.getElementById('hp-chat-dot'); if(dot) dot.style.display='none';
  }

  function pollDot(){
    var dv=devId(); if(!dv) return;
    fetch(API+'/contact-message?mode=my&device_id='+encodeURIComponent(dv)).then(function(r){return r.json();}).then(function(res){
      if(!res||!res.success||!res.thread) return;
      _thread=res.thread;
      var lr=lastReply(_thread); if(!lr) return;
      var cur=(lr.t||'')+'|'+(lr.text||lr.datei||'');
      var seen=''; try{ seen=localStorage.getItem(seenKey())||''; }catch(e){}
      if(cur!==seen && !_open){ var dot=document.getElementById('hp-chat-dot'); if(dot) dot.style.display='block'; }
    }).catch(function(){});
  }

  function renderMsgs(){
    var box=document.getElementById('hp-chat-msgs'); if(!box) return;
    var v=(_thread&&_thread.verlauf)||[];
    if(!v.length){ box.innerHTML='<div style="margin:auto;text-align:center;color:#9ca3af;font-size:13px;padding:20px">Schreiben Sie uns – wir helfen gern! 👋<br>Frisch · Regional · Persönlich</div>'; return; }
    var h='';
    v.forEach(function(m){
      if(!m) return;
      var mine=m.who==='kunde';
      var side=mine?'flex-end':'flex-start';
      var bg=mine?'#dcf8c6':'#fff';
      var inner='';
      if(m.datei){ inner+='<img src="/api/tagesbild?datei='+encodeURIComponent(m.datei)+'" alt="" style="max-width:200px;max-height:220px;border-radius:8px;display:block;cursor:zoom-in'+(m.text?';margin-bottom:4px':'')+'" onclick="DLKontakt.zoom(this.src)">'; }
      if(m.text){ inner+=esc(m.text); }
      h+='<div style="align-self:'+side+';max-width:82%;background:'+bg+';border:1px solid rgba(0,0,0,.06);border-radius:10px;padding:7px 10px;font-size:14px;line-height:1.4;box-shadow:0 1px 1px rgba(0,0,0,.05)">'+inner+'</div>';
    });
    box.innerHTML=h;
    box.scrollTop=box.scrollHeight;
  }

  function loadThread(scroll){
    var dv=devId(); if(!dv){ renderMsgs(); return; }
    fetch(API+'/contact-message?mode=my&device_id='+encodeURIComponent(dv)).then(function(r){return r.json();}).then(function(res){
      if(res&&res.success){ _thread=res.thread; renderMsgs(); if(_open) markSeen(); }
    }).catch(function(){});
  }

  function collectMeta(){
    var name=(document.getElementById('hp-chat-name')||{}).value||'';
    var email=(document.getElementById('hp-chat-email')||{}).value||'';
    var notifyEmail=!!(document.getElementById('hp-chat-email-opt')||{}).checked;
    var notifyPush=!!(document.getElementById('hp-chat-push-opt')||{}).checked;
    try{ localStorage.setItem('dl_lunch_customer', JSON.stringify({name:name.trim(),email:email.trim(),phone:(JSON.parse(localStorage.getItem('dl_lunch_customer')||'{}').phone||'')})); }catch(e){}
    return {name:name.trim(), email:email.trim().toLowerCase(), notify_email:notifyEmail, notify_push:notifyPush};
  }

  function doSend(){
    if(_sending) return;
    var inp=document.getElementById('hp-chat-input');
    var text=(inp&&inp.value||'').trim();
    if(_pendingImg){ return doSendImage(text); }
    if(!text) return;
    var meta=collectMeta();
    _sending=true; if(inp){ inp.value=''; inp.style.height='auto'; }
    // Optimistisch anzeigen
    if(!_thread) _thread={verlauf:[]}; if(!_thread.verlauf)_thread.verlauf=[];
    _thread.verlauf.push({who:'kunde',typ:'text',text:text}); renderMsgs();
    var body={device_id:devId(),name:meta.name,email:meta.email,text:text,notify_email:meta.notify_email,geraet:geraet()};
    fetch(API+'/contact-message',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)})
      .then(function(r){return r.json();}).then(function(res){
        _sending=false;
        if(res&&res.success){ if(res.verlauf) _thread.verlauf=res.verlauf; renderMsgs(); if(meta.notify_push) subscribePush(meta.email); }
      }).catch(function(){ _sending=false; });
  }

  // Bild auswaehlen -> komprimieren -> als Vorschau vormerken (noch nicht senden).
  function stagePendingImage(file){
    if(!file) return;
    var reader=new FileReader();
    reader.onload=function(){
      var img=new Image();
      img.onload=function(){
        var max=1280,w=img.width,h=img.height; if(w>max){ h=Math.round(h*max/w); w=max; }
        var cv=document.createElement('canvas'); cv.width=w; cv.height=h; cv.getContext('2d').drawImage(img,0,0,w,h);
        _pendingImg=cv.toDataURL('image/jpeg',0.85);
        var pv=document.getElementById('hp-chat-preview'), pi=document.getElementById('hp-chat-prev-img');
        if(pi) pi.src=_pendingImg; if(pv) pv.style.display='flex';
        var inp=document.getElementById('hp-chat-input'); if(inp){ inp.placeholder='Bildunterschrift (optional)…'; inp.focus(); }
      };
      img.src=reader.result;
    };
    reader.readAsDataURL(file);
  }
  function clearPending(){
    _pendingImg=null;
    var pv=document.getElementById('hp-chat-preview'); if(pv) pv.style.display='none';
    var inp=document.getElementById('hp-chat-input'); if(inp) inp.placeholder='Nachricht schreiben…';
  }

  // Vorgemerktes Bild + optionale Bildunterschrift zusammen senden (wie WhatsApp).
  function doSendImage(caption){
    if(_sending || !_pendingImg) return;
    _sending=true;
    var meta=collectMeta();
    var dataUrl=_pendingImg;
    var inp=document.getElementById('hp-chat-input');
    clearPending(); if(inp){ inp.value=''; inp.style.height='auto'; }
    fetch(API+'/contact-upload',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({device_id:devId(),image:dataUrl})})
      .then(function(r){return r.json();}).then(function(u){
        if(u&&u.success&&u.datei){
          return fetch(API+'/contact-message',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({device_id:devId(),name:meta.name,email:meta.email,bild_datei:u.datei,text:caption||'',notify_email:meta.notify_email,geraet:geraet()})})
            .then(function(r){return r.json();}).then(function(res){ _sending=false; if(res&&res.success){ _thread=_thread||{verlauf:[]}; _thread.verlauf=res.verlauf||_thread.verlauf; renderMsgs(); if(meta.notify_push) subscribePush(meta.email); } });
        }
        _sending=false;
      }).catch(function(){ _sending=false; });
  }

  // Push-Abo (Kategorie kontakt) einrichten, damit Antworten als Push kommen.
  function subscribePush(email){
    if(!('serviceWorker' in navigator) || !('PushManager' in window)) return;
    if(typeof Notification!=='undefined' && Notification.permission==='denied') return;
    function doSub(reg){
      fetch(API+'/push-vapid-key').then(function(r){return r.json();}).then(function(data){
        if(!data.publicKey) return;
        var raw=atob(data.publicKey.replace(/-/g,'+').replace(/_/g,'/'));
        var arr=new Uint8Array(raw.length); for(var i=0;i<raw.length;i++) arr[i]=raw.charCodeAt(i);
        reg.pushManager.getSubscription().then(function(existing){
          function save(sub){ fetch(API+'/push-subscribe',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({subscription:sub.toJSON(),email:email||'',categories:['kontakt'],merge:true,device_id:devId()})}); }
          if(existing){ save(existing); return; }
          reg.pushManager.subscribe({userVisibleOnly:true,applicationServerKey:arr}).then(save).catch(function(){});
        });
      }).catch(function(){});
    }
    navigator.serviceWorker.ready.then(function(reg){
      if(Notification.permission==='granted'){ doSub(reg); }
      else { Notification.requestPermission().then(function(p){ if(p==='granted') doSub(reg); }); }
    }).catch(function(){});
  }

  function zoom(src){
    if(window.dlImagePopup){ window.dlImagePopup(src,'',src); return; }
    var ov=document.createElement('div');
    ov.style.cssText='position:fixed;inset:0;z-index:100001;background:rgba(0,0,0,.85);display:flex;align-items:center;justify-content:center;cursor:zoom-out';
    ov.onclick=function(){ov.remove();};
    ov.innerHTML='<img src="'+src+'" style="max-width:90vw;max-height:85vh;border-radius:12px">';
    document.body.appendChild(ov);
  }

  window.DLKontakt={ open:openChat, zoom:zoom };
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
