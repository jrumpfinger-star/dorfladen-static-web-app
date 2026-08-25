/* Kiosk – Tab "Kontakt": Kundennachrichten (1:1 Chat) verwalten.
   Selbststaendiges Modul (window.KKontakt), unabhaengig vom grossen K-Modul.
   Nutzt /api/contact-message (mode=list/unread, PATCH). */
(function(){
  var API = '/api';
  var _filter = 'neu';
  var _threads = [];
  var _open = {};        // id -> expanded?
  var _lastUnread = -1;
  var _loaded = false;

  function esc(s){ return (s==null?'':String(s)).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }

  function fmtTime(iso){
    if(!iso) return '';
    try{ var d=new Date(iso); return d.toLocaleString('de-DE',{day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit'}); }catch(e){ return ''; }
  }

  function beep(){
    try{
      if(localStorage.getItem('kiosk_sound')==='off') return;
      var C=window.AudioContext||window.webkitAudioContext; if(!C) return;
      var ctx=new C(); var o=ctx.createOscillator(), g=ctx.createGain();
      o.type='sine'; o.frequency.value=880; o.connect(g); g.connect(ctx.destination);
      g.gain.setValueAtTime(0.001,ctx.currentTime); g.gain.exponentialRampToValueAtTime(0.2,ctx.currentTime+0.02);
      g.gain.exponentialRampToValueAtTime(0.001,ctx.currentTime+0.35);
      o.start(); o.stop(ctx.currentTime+0.36);
    }catch(e){}
  }

  function setBadge(n){
    var wrap=document.getElementById('badges-kontakt');
    if(!wrap) return;
    wrap.innerHTML = (n>0) ? ('<span class="k-tab-badge show badge-msg blink" title="'+n+' ungelesene Nachricht(en)">'+n+'</span>') : '';
  }

  function pollBadge(){
    fetch(API+'/contact-message?mode=unread').then(function(r){return r.ok?r.json():null;}).then(function(res){
      if(!res||!res.success) return;
      var n=res.unread_count||0;
      setBadge(n);
      if(_lastUnread>=0 && n>_lastUnread) beep();
      _lastUnread=n;
      // Wenn der Tab gerade offen ist, Liste aktualisieren.
      var panel=document.getElementById('panel-kontakt');
      if(panel && panel.classList.contains('active')) reload(true);
    }).catch(function(){});
  }

  function onShow(){ reload(); }

  function setFilter(f){
    _filter=f;
    document.querySelectorAll('#kontakt-filter-bar [data-kk-filter]').forEach(function(b){
      b.classList.toggle('active', b.getAttribute('data-kk-filter')===f);
    });
    reload();
  }

  function reload(silent){
    var q = (_filter==='neu'||_filter==='erledigt') ? ('&status='+_filter) : '';
    if(!silent){
      document.getElementById('kontakt-list').innerHTML='<div class="k-empty"><div class="k-empty-icon"><i data-lucide="loader" style="width:24px;height:24px;animation:kSpin 1s linear infinite"></i></div>Laden…</div>';
      if(window.lucide) lucide.createIcons();
    }
    fetch(API+'/contact-message?mode=list'+q).then(function(r){return r.json();}).then(function(res){
      _threads = (res&&res.success&&res.threads)?res.threads:[];
      _loaded=true;
      render();
    }).catch(function(){
      document.getElementById('kontakt-list').innerHTML='<div class="k-empty">Konnte nicht laden.</div>';
    });
  }

  function bubbles(verlauf){
    if(!verlauf||!verlauf.length) return '<div style="color:#9ca3af;font-size:13px;padding:6px">Kein Verlauf.</div>';
    var h='<div class="kk-thread" style="display:flex;flex-direction:column;gap:6px;max-height:320px;overflow-y:auto;padding:8px;background:#f8fafc;border-radius:8px;border:1px solid #eef2f7">';
    verlauf.forEach(function(m){
      if(!m) return;
      var mine = m.who==='dorfladen';
      var side = mine?'flex-end':'flex-start';
      var bg = mine?'#f0fdf4':'#eff6ff';
      var bd = mine?'#bbf7d0':'#bfdbfe';
      var col = mine?'#16a34a':'#2563eb';
      var lbl = mine?'Dorfladen':'Kunde';
      var inner='';
      if(m.datei){ inner += '<img src="/api/tagesbild?datei='+encodeURIComponent(m.datei)+'" alt="" style="max-width:200px;max-height:200px;border-radius:8px;display:block;cursor:zoom-in;margin-bottom:'+(m.text?'4px':'0')+'" onclick="KKontakt.zoom(this.src)">'; }
      if(m.text){ inner += esc(m.text); }
      h += '<div style="align-self:'+side+';max-width:80%;background:'+bg+';border:1px solid '+bd+';border-radius:10px;padding:6px 9px;font-size:13px;line-height:1.4">'
         + '<div style="font-size:9px;font-weight:800;text-transform:uppercase;color:'+col+';margin-bottom:1px">'+lbl+(m.t?(' · '+fmtTime(m.t)):'')+'</div>'+inner+'</div>';
    });
    h+='</div>';
    return h;
  }

  function card(t){
    var unread = !t.kommentar_gelesen && t.status!==2;
    var isOpen = _open[t.id];
    var last = (t.verlauf&&t.verlauf.length)?t.verlauf[t.verlauf.length-1]:null;
    var lastTxt = last ? (last.text || (last.datei?'📷 Foto':'')) : '';
    var statusLbl = t.status===0?'Neu':(t.status===1?'Beantwortet':'Erledigt');
    var statusCol = t.status===0?'#dc2626':(t.status===1?'#16a34a':'#6b7280');
    var h='<div class="k-order'+(unread?'':'')+'" style="margin-bottom:10px;border-left:4px solid '+(unread?'#3b82f6':'#e5e7eb')+'">';
    // header
    h+='<div class="k-order-hdr" style="cursor:pointer" onclick="KKontakt.toggle(\''+t.id+'\')">';
    h+='<span class="k-oc-arrow"><i data-lucide="chevron-'+(isOpen?'down':'right')+'" style="width:14px;height:14px"></i></span>';
    h+='<span class="k-oc-name">'+esc(t.name||'Website-Besucher')+'</span>';
    h+='<span style="flex:1;min-width:0;color:#6b7280;font-size:12px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;margin:0 8px">'+esc(lastTxt)+'</span>';
    if(unread) h+='<span style="background:#3b82f6;color:#fff;font-size:10px;font-weight:700;padding:2px 6px;border-radius:4px;animation:kBlink 1s ease-in-out infinite;margin-right:6px"><i data-lucide="message-circle" style="width:10px;height:10px"></i> NEU</span>';
    h+='<span style="font-size:11px;font-weight:700;padding:2px 8px;border-radius:4px;background:'+statusCol+'1a;color:'+statusCol+'">'+statusLbl+'</span>';
    h+='</div>';
    if(isOpen){
      h+='<div style="padding:10px 12px">';
      if(t.email) h+='<div style="font-size:12px;color:#6b7280;margin-bottom:6px"><i data-lucide="mail" style="width:12px;height:12px;vertical-align:-2px"></i> '+esc(t.email)+(t.notify_email?' · E-Mail-Antwort gewünscht':'')+'</div>';
      h+=bubbles(t.verlauf);
      // reply row
      h+='<div style="display:flex;gap:6px;align-items:center;margin-top:8px">';
      h+='<textarea id="kk-rpt-'+t.id+'" placeholder="Antwort an Kunde…" maxlength="1000" rows="1" style="flex:1;padding:8px 12px;border:1px solid #d1d5db;border-radius:8px;font-size:13px;box-sizing:border-box;resize:none;overflow:hidden;min-height:38px" oninput="this.style.height=\'auto\';this.style.height=this.scrollHeight+\'px\'" onkeydown="if(event.key===\'Enter\'&&!event.shiftKey){event.preventDefault();KKontakt.send(\''+t.id+'\')}"></textarea>';
      h+='<input type="file" accept="image/*" id="kk-img-'+t.id+'" style="display:none" onchange="KKontakt.sendImage(\''+t.id+'\',this.files[0])">';
      h+='<button class="k-btn k-btn-outline k-btn-sm" title="Foto senden" style="padding:8px 10px" onclick="document.getElementById(\'kk-img-'+t.id+'\').click()"><i data-lucide="image" style="width:16px;height:16px"></i></button>';
      h+='<button class="k-btn k-btn-sm" style="padding:8px 14px;background:#2563eb;color:#fff" onclick="KKontakt.send(\''+t.id+'\')"><i data-lucide="send" style="width:14px;height:14px"></i></button>';
      h+='</div>';
      // actions
      h+='<div style="display:flex;gap:8px;margin-top:8px">';
      if(t.status!==2) h+='<button class="k-btn k-btn-outline k-btn-sm" onclick="KKontakt.setStatus(\''+t.id+'\',2)"><i data-lucide="check-check" style="width:13px;height:13px"></i> Als erledigt</button>';
      else h+='<button class="k-btn k-btn-outline k-btn-sm" onclick="KKontakt.setStatus(\''+t.id+'\',1)"><i data-lucide="rotate-ccw" style="width:13px;height:13px"></i> Wieder öffnen</button>';
      h+='</div>';
      h+='</div>';
    }
    h+='</div>';
    return h;
  }

  function render(){
    var host=document.getElementById('kontakt-list');
    if(!host) return;
    if(!_threads.length){
      host.innerHTML='<div class="k-empty"><div class="k-empty-icon"><i data-lucide="message-square" style="width:24px;height:24px"></i></div>'+(_filter==='erledigt'?'Keine erledigten':(_filter==='neu'?'Keine neuen Nachrichten':'Keine Nachrichten'))+'</div>';
      if(window.lucide) lucide.createIcons();
      return;
    }
    var html='';
    _threads.forEach(function(t){ html+=card(t); });
    host.innerHTML=html;
    if(window.lucide) lucide.createIcons();
    // Auto-scroll offene Verlaeufe ans Ende
    host.querySelectorAll('.kk-thread').forEach(function(el){ el.scrollTop=el.scrollHeight; });
  }

  function toggle(id){
    _open[id]=!_open[id];
    if(_open[id]){
      var t=_threads.find(function(x){return x.id===id;});
      if(t && !t.kommentar_gelesen){ markRead(id); t.kommentar_gelesen=true; }
    }
    render();
  }

  function markRead(id){
    fetch(API+'/contact-message/'+id,{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify({kommentar_gelesen:true})})
      .then(function(){ pollBadge(); }).catch(function(){});
  }

  function send(id){
    var ta=document.getElementById('kk-rpt-'+id);
    var text=(ta&&ta.value||'').trim();
    if(!text) return;
    if(ta) ta.value='';
    fetch(API+'/contact-message/'+id,{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify({personal_antwort:text})})
      .then(function(r){return r.json();}).then(function(res){
        if(res&&res.success){ var t=_threads.find(function(x){return x.id===id;}); if(t){ t.verlauf=res.verlauf||t.verlauf; t.status=1; t.kommentar_gelesen=true; } render(); pollBadge(); }
      }).catch(function(){});
  }

  function sendImage(id, file){
    if(!file) return;
    var reader=new FileReader();
    reader.onload=function(){
      // clientseitig verkleinern
      var img=new Image();
      img.onload=function(){
        var max=1280, w=img.width, h=img.height;
        if(w>max){ h=Math.round(h*max/w); w=max; }
        var cv=document.createElement('canvas'); cv.width=w; cv.height=h;
        cv.getContext('2d').drawImage(img,0,0,w,h);
        var dataUrl=cv.toDataURL('image/jpeg',0.85);
        fetch(API+'/contact-upload',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({device_id:'kiosk',image:dataUrl})})
          .then(function(r){return r.json();}).then(function(u){
            if(u&&u.success&&u.datei){
              return fetch(API+'/contact-message/'+id,{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify({bild_datei:u.datei})})
                .then(function(r){return r.json();}).then(function(res){ if(res&&res.success){ var t=_threads.find(function(x){return x.id===id;}); if(t){ t.verlauf=res.verlauf||t.verlauf; t.status=1; } render(); } });
            }
          }).catch(function(){});
      };
      img.src=reader.result;
    };
    reader.readAsDataURL(file);
  }

  function setStatus(id, status){
    fetch(API+'/contact-message/'+id,{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify({status:status})})
      .then(function(r){return r.json();}).then(function(res){ if(res&&res.success){ reload(); pollBadge(); } }).catch(function(){});
  }

  function zoom(src){
    if(window.dlImagePopup){ window.dlImagePopup(src,'',src); return; }
    var ov=document.createElement('div');
    ov.style.cssText='position:fixed;inset:0;z-index:100001;background:rgba(0,0,0,.85);display:flex;align-items:center;justify-content:center;cursor:zoom-out';
    ov.onclick=function(){ov.remove();};
    ov.innerHTML='<img src="'+src+'" style="max-width:90vw;max-height:85vh;border-radius:12px">';
    document.body.appendChild(ov);
  }

  window.KKontakt = {
    onShow:onShow, reload:reload, setFilter:setFilter, toggle:toggle,
    send:send, sendImage:sendImage, setStatus:setStatus, pollBadge:pollBadge, zoom:zoom
  };
})();
