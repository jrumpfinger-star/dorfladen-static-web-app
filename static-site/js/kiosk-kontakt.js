/* Kiosk – Tab "Kontakt": Kundennachrichten (1:1 Chat) verwalten.
   Selbststaendiges Modul (window.KKontakt), unabhaengig vom grossen K-Modul.
   Nutzt /api/contact-message (mode=list/unread, PATCH). */
(function(){
  var API = '/api';
  var _threads = [];
  var _open = {};        // id -> expanded?
  var _lastUnread = -1;
  var _loaded = false;
  var _pendingImg = {};  // id -> vorgemerktes Bild (dataUrl) fuer Antwort mit Untertitel
  var _draft = {};       // id -> Entwurfstext (ueber Re-Render bewahren)
  var _sel = {};         // id -> ausgewaehlt (fuer Loeschen / Mehrfachauswahl)

  var CHATFONT = "-apple-system,system-ui,'Segoe UI',Roboto,Helvetica,Arial,sans-serif,'Apple Color Emoji','Segoe UI Emoji'";
  var EMOJIS = ['😊','😀','😄','😍','👍','🙏','🎉','❤️','😅','😉','🙂','😢','😮','😡','👏','🙌','🤝','✅','❗','❓','🔥','⭐','☕','🥨','🍞','🧀','🥩','🍰','🛒','📦','📮','🕒'];

  function esc(s){ return (s==null?'':String(s)).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }

  // WhatsApp-artige Formatierung: *fett* _kursiv_ ~durchgestrichen~ + Zeilenumbrueche.
  function fmtText(s){
    var h=esc(s);
    h=h.replace(/\*([^*\n]+)\*/g,'<strong>$1</strong>')
       .replace(/_([^_\n]+)_/g,'<em>$1</em>')
       .replace(/~([^~\n]+)~/g,'<del>$1</del>')
       .replace(/\n/g,'<br>');
    return h;
  }

  function insertEmoji(inputId, em){
    var el=document.getElementById(inputId); if(!el) return;
    var s=(el.selectionStart!=null)?el.selectionStart:el.value.length;
    var e=(el.selectionEnd!=null)?el.selectionEnd:el.value.length;
    el.value=el.value.slice(0,s)+em+el.value.slice(e);
    var p=s+em.length; try{ el.selectionStart=el.selectionEnd=p; }catch(_){}
    el.focus();
    el.style.height='auto'; el.style.height=el.scrollHeight+'px';
    _draft[inputId.slice(7)]=el.value;
  }
  function closeEmojiOutside(e){
    var pop=document.getElementById('kk-emoji-pop');
    if(pop && !pop.contains(e.target) && !(e.target.classList&&e.target.classList.contains('kk-emoji-btn'))){ pop.remove(); document.removeEventListener('click',closeEmojiOutside,true); }
  }
  function emoji(inputId, anchor){
    var ex=document.getElementById('kk-emoji-pop');
    if(ex){ var was=ex.getAttribute('data-for'); ex.remove(); document.removeEventListener('click',closeEmojiOutside,true); if(was===inputId) return; }
    var pop=document.createElement('div'); pop.id='kk-emoji-pop'; pop.setAttribute('data-for',inputId);
    pop.style.cssText='position:fixed;z-index:100002;background:#fff;border:1px solid #e5e7eb;border-radius:10px;box-shadow:0 8px 24px rgba(0,0,0,.18);padding:6px;display:grid;grid-template-columns:repeat(8,1fr);gap:2px;width:296px';
    EMOJIS.forEach(function(em){ var b=document.createElement('button'); b.type='button'; b.textContent=em; b.style.cssText='border:none;background:none;font-size:20px;cursor:pointer;padding:3px;border-radius:6px'; b.onmouseenter=function(){b.style.background='#f3f4f6';}; b.onmouseleave=function(){b.style.background='none';}; b.onclick=function(){ insertEmoji(inputId,em); }; pop.appendChild(b); });
    document.body.appendChild(pop);
    var r=anchor.getBoundingClientRect();
    pop.style.left=Math.max(8,Math.min(r.left, window.innerWidth-pop.offsetWidth-8))+'px';
    pop.style.top=Math.max(8,(r.top-pop.offsetHeight-6))+'px';
    setTimeout(function(){ document.addEventListener('click',closeEmojiOutside,true); },0);
  }

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
    if(wrap){ wrap.innerHTML = (n>0) ? ('<span class="k-tab-badge show badge-msg blink" title="'+n+' ungelesene Nachricht(en)">'+n+'</span>') : ''; }
    var hdr=document.getElementById('kk-hdr-count');
    if(hdr){ hdr.innerHTML = (n>0) ? ('<span style="background:#dc2626;color:#fff;font-size:11px;font-weight:800;padding:2px 8px;border-radius:10px">'+n+' neu</span>') : ''; }
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

  function lastTs(t){
    if(t.verlauf && t.verlauf.length){ var m=t.verlauf[t.verlauf.length-1]; if(m && m.t) return m.t; }
    return t.modified || t.created || '';
  }

  function reload(silent){
    if(!silent){
      document.getElementById('kontakt-list').innerHTML='<div class="k-empty"><div class="k-empty-icon"><i data-lucide="loader" style="width:24px;height:24px;animation:kSpin 1s linear infinite"></i></div>Laden…</div>';
      if(window.lucide) lucide.createIcons();
    }
    fetch(API+'/contact-message?mode=list').then(function(r){return r.json();}).then(function(res){
      _threads = (res&&res.success&&res.threads)?res.threads:[];
      // WhatsApp-artig: unbeantwortete oben, danach nach letzter Aktivitaet.
      _threads.sort(function(a,b){
        var ua=!a.kommentar_gelesen?1:0, ub=!b.kommentar_gelesen?1:0;
        if(ua!==ub) return ub-ua;
        return (lastTs(b)||'').localeCompare(lastTs(a)||'');
      });
      _loaded=true;
      render();
    }).catch(function(){
      document.getElementById('kontakt-list').innerHTML='<div class="k-empty">Konnte nicht laden.</div>';
    });
  }

  function bubbles(verlauf){
    if(!verlauf||!verlauf.length) return '<div style="color:#9ca3af;font-size:13px;padding:6px">Kein Verlauf.</div>';
    var h='<div class="kk-thread" style="font-family:'+CHATFONT+';display:flex;flex-direction:column;gap:6px;max-height:60vh;min-height:320px;overflow-y:auto;padding:8px;background:#f8fafc;border-radius:8px;border:1px solid #eef2f7">';
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
      if(m.text){ inner += '<span style="white-space:pre-wrap;word-break:break-word">'+fmtText(m.text)+'</span>'; }
      h += '<div style="align-self:'+side+';max-width:80%;background:'+bg+';border:1px solid '+bd+';border-radius:10px;padding:6px 9px;font-size:14px;line-height:1.4">'
         + '<div style="font-size:9px;font-weight:800;text-transform:uppercase;color:'+col+';margin-bottom:1px">'+lbl+(m.t?(' · '+fmtTime(m.t)):'')+'</div>'+inner+'</div>';
    });
    h+='</div>';
    return h;
  }

  function shortCode(id){ id=(id||'').replace(/[^a-zA-Z0-9]/g,''); return id?('#'+id.slice(-4)):'#????'; }
  function devTag(t){ return (t.geraet?(t.geraet+' · '):'')+shortCode(t.device_id); }
  function devHue(id){ id=(id||''); var h=0; for(var i=0;i<id.length;i++){ h=(h*31+id.charCodeAt(i))>>>0; } return h%360; }

  function card(t){
    var unread = !t.kommentar_gelesen;
    var isOpen = _open[t.id];
    var last = (t.verlauf&&t.verlauf.length)?t.verlauf[t.verlauf.length-1]:null;
    var lastTxt = last ? ((last.who==='dorfladen'?'Du: ':'')+(last.text || (last.datei?'📷 Foto':''))) : '';
    var hue=devHue(t.device_id);
    var dcMain='hsl('+hue+',60%,40%)', dcBg='hsl('+hue+',72%,95%)';
    var h='<div class="k-order" style="margin-bottom:10px;border-left:5px solid '+dcMain+'">';
    // header
    h+='<div class="k-order-hdr" style="cursor:pointer" onclick="KKontakt.toggle(\''+t.id+'\')">';
    h+='<input type="checkbox" class="kk-sel" title="Auswählen" style="margin-right:8px;width:16px;height:16px;flex-shrink:0;cursor:pointer" '+(_sel[t.id]?'checked':'')+' onclick="event.stopPropagation();KKontakt.toggleSel(\''+t.id+'\',this.checked)">';
    h+='<span class="k-oc-arrow"><i data-lucide="chevron-'+(isOpen?'down':'right')+'" style="width:14px;height:14px"></i></span>';
    h+='<span style="display:inline-block;width:11px;height:11px;border-radius:50%;background:'+dcMain+';margin-right:7px;flex-shrink:0"></span>';
    h+='<span class="k-oc-name" style="font-weight:'+(unread?'800':'600')+'">'+esc(t.name||'Website-Besucher')+'</span>';
    h+='<span title="Gerät des Kunden – jede Farbe/Code ist ein eigenes Gerät" style="font-size:11px;font-weight:800;color:'+dcMain+';background:'+dcBg+';border:1px solid '+dcMain+';border-radius:6px;padding:1px 8px;margin-left:8px;white-space:nowrap;flex-shrink:0">📱 '+esc(devTag(t))+'</span>';
    h+='<span style="flex:1;min-width:0;color:'+(unread?'#111827':'#6b7280')+';font-weight:'+(unread?'700':'400')+';font-size:12px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;margin:0 8px">'+esc(lastTxt)+'</span>';
    h+='<span style="font-size:11px;color:#9ca3af;margin-right:8px">'+fmtTime(lastTs(t))+'</span>';
    if(unread) h+='<span style="background:#3b82f6;color:#fff;font-size:10px;font-weight:700;padding:2px 6px;border-radius:4px;animation:kBlink 1s ease-in-out infinite"><i data-lucide="message-circle" style="width:10px;height:10px"></i> NEU</span>';
    h+='</div>';
    if(isOpen){
      h+='<div style="padding:10px 12px;max-width:680px">';
      h+='<div style="font-size:12px;color:#6b7280;margin-bottom:6px;display:flex;flex-wrap:wrap;gap:10px;align-items:center">';
      if(t.email) h+='<span><i data-lucide="mail" style="width:12px;height:12px;vertical-align:-2px"></i> '+esc(t.email)+(t.notify_email?' · E-Mail-Antwort gewünscht':'')+'</span>';
      h+='<span title="Antwort geht genau an dieses Gerät zurück" style="font-weight:700;color:'+dcMain+';background:'+dcBg+';border:1px solid '+dcMain+';border-radius:6px;padding:1px 8px">📱 '+esc(devTag(t))+'</span>';
      h+='</div>';
      h+=bubbles(t.verlauf);
      // Vorschau des vorgemerkten Bildes (Antwort mit Untertitel)
      if(_pendingImg[t.id]){
        h+='<div style="display:flex;align-items:center;gap:8px;margin-top:8px;padding:6px;background:#eff6ff;border:1px solid #bfdbfe;border-radius:8px">';
        h+='<img src="'+_pendingImg[t.id]+'" alt="" style="height:48px;width:48px;object-fit:cover;border-radius:6px">';
        h+='<span style="flex:1;font-size:12px;color:#2563eb">Bild bereit – Text wird als Bildunterschrift gesendet</span>';
        h+='<button class="k-btn k-btn-outline k-btn-sm" style="padding:4px 8px" onclick="KKontakt.removeImage(\''+t.id+'\')"><i data-lucide="x" style="width:14px;height:14px"></i></button>';
        h+='</div>';
      }
      // reply row
      h+='<div style="display:flex;gap:6px;align-items:center;margin-top:8px">';
      h+='<textarea id="kk-rpt-'+t.id+'" placeholder="'+(_pendingImg[t.id]?'Bildunterschrift (optional)…':'Antwort an Kunde…')+'" maxlength="1000" rows="1" style="flex:1;font-family:'+CHATFONT+';padding:8px 12px;border:1px solid #d1d5db;border-radius:8px;font-size:14px;box-sizing:border-box;resize:none;overflow:hidden;min-height:38px" oninput="this.style.height=\'auto\';this.style.height=this.scrollHeight+\'px\'" onkeydown="if(event.key===\'Enter\'&&!event.shiftKey){event.preventDefault();KKontakt.send(\''+t.id+'\')}"></textarea>';
      h+='<button type="button" class="k-btn k-btn-outline k-btn-sm kk-emoji-btn" title="Emoji" style="padding:6px 8px;font-size:18px;line-height:1" onclick="KKontakt.emoji(\'kk-rpt-'+t.id+'\',this)">😊</button>';
      h+='<input type="file" accept="image/*" id="kk-img-'+t.id+'" style="display:none" onchange="KKontakt.stageImage(\''+t.id+'\',this.files[0])">';
      h+='<button class="k-btn k-btn-outline k-btn-sm" title="Foto anhängen" style="padding:8px 10px" onclick="document.getElementById(\'kk-img-'+t.id+'\').click()"><i data-lucide="image" style="width:16px;height:16px"></i></button>';
      h+='<button class="k-btn k-btn-sm" style="padding:8px 14px;background:#2563eb;color:#fff" onclick="KKontakt.send(\''+t.id+'\')"><i data-lucide="send" style="width:14px;height:14px"></i></button>';
      h+='</div>';
      h+='<div style="display:flex;justify-content:space-between;align-items:center;margin-top:8px">';
      h+='<span style="font-size:11px;color:#9ca3af">Tipp: *fett* · _kursiv_ · ~durchgestrichen~</span>';
      h+='<button class="k-btn k-btn-outline k-btn-sm" style="padding:4px 10px;font-size:12px;color:#dc2626" onclick="KKontakt.deleteOne(\''+t.id+'\')"><i data-lucide="trash-2" style="width:13px;height:13px"></i> Konversation löschen</button>';
      h+='</div>';
      h+='</div>';
    }
    h+='</div>';
    return h;
  }

  function render(){
    var host=document.getElementById('kontakt-list');
    if(!host) return;
    // Entwurfstexte offener Antwortfelder bewahren (Polling re-rendert die Liste).
    host.querySelectorAll('textarea[id^="kk-rpt-"]').forEach(function(ta){ _draft[ta.id.slice(7)]=ta.value; });
    if(!_threads.length){
      host.innerHTML='<div class="k-empty"><div class="k-empty-icon"><i data-lucide="message-square" style="width:24px;height:24px"></i></div>Noch keine Nachrichten</div>';
      if(window.lucide) lucide.createIcons();
      return;
    }
    var html='';
    _threads.forEach(function(t){ html+=card(t); });
    host.innerHTML=html;
    // Entwuerfe wiederherstellen
    Object.keys(_draft).forEach(function(id){ var ta=document.getElementById('kk-rpt-'+id); if(ta && _draft[id]){ ta.value=_draft[id]; ta.style.height='auto'; ta.style.height=ta.scrollHeight+'px'; } });
    if(window.lucide) lucide.createIcons();
    updateActions();
    // Auto-scroll offene Verlaeufe ans Ende – auch nachdem Bilder geladen sind
    // (Bilder vergroessern nachtraeglich die Hoehe und wuerden die letzte
    // Nachricht sonst nach unten aus dem Blickfeld schieben).
    host.querySelectorAll('.kk-thread').forEach(function(el){
      var toBottom=function(){ el.scrollTop=el.scrollHeight; };
      toBottom();
      el.querySelectorAll('img').forEach(function(img){ if(!img.complete){ img.addEventListener('load',toBottom,{once:true}); img.addEventListener('error',toBottom,{once:true}); } });
    });
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
    var img=_pendingImg[id];
    if(!text && !img) return;
    if(ta) ta.value=''; _draft[id]='';
    if(img){
      delete _pendingImg[id];
      fetch(API+'/contact-upload',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({device_id:'kiosk',image:img})})
        .then(function(r){return r.json();}).then(function(u){
          if(u&&u.success&&u.datei){
            return fetch(API+'/contact-message/'+id,{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify({bild_datei:u.datei,personal_antwort:text})})
              .then(function(r){return r.json();}).then(function(res){ if(res&&res.success){ var t=_threads.find(function(x){return x.id===id;}); if(t){ t.verlauf=res.verlauf||t.verlauf; t.status=1; t.kommentar_gelesen=true; } render(); pollBadge(); } });
          }
        }).catch(function(){});
      return;
    }
    fetch(API+'/contact-message/'+id,{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify({personal_antwort:text})})
      .then(function(r){return r.json();}).then(function(res){
        if(res&&res.success){ var t=_threads.find(function(x){return x.id===id;}); if(t){ t.verlauf=res.verlauf||t.verlauf; t.status=1; t.kommentar_gelesen=true; } render(); pollBadge(); }
      }).catch(function(){});
  }

  // Bild vormerken (mit optionaler Bildunterschrift senden – wie WhatsApp).
  function stageImage(id, file){
    if(!file) return;
    var reader=new FileReader();
    reader.onload=function(){
      var img=new Image();
      img.onload=function(){
        var max=1280, w=img.width, h=img.height;
        if(w>max){ h=Math.round(h*max/w); w=max; }
        var cv=document.createElement('canvas'); cv.width=w; cv.height=h;
        cv.getContext('2d').drawImage(img,0,0,w,h);
        _pendingImg[id]=cv.toDataURL('image/jpeg',0.85);
        render();
        var ta=document.getElementById('kk-rpt-'+id); if(ta) ta.focus();
      };
      img.src=reader.result;
    };
    reader.readAsDataURL(file);
  }
  function removeImage(id){ delete _pendingImg[id]; render(); }

  // ── Auswahl & Löschen (inkl. Mehrfachauswahl) ──
  function selIds(){ return Object.keys(_sel).filter(function(k){ return _sel[k]; }); }
  function updateActions(){
    var el=document.getElementById('kk-actions'); if(!el) return;
    var n=selIds().length;
    if(n>0){
      el.innerHTML='<span style="font-size:13px;color:#374151;margin-right:2px">'+n+' ausgewählt</span>'
        +'<button class="k-btn k-btn-sm" style="background:#dc2626;color:#fff;min-height:36px;padding:6px 12px;border-radius:8px;font-size:13px" onclick="KKontakt.deleteSelected()"><i data-lucide="trash-2" style="width:14px;height:14px"></i> Löschen</button>'
        +'<button class="k-btn k-btn-outline k-btn-sm" style="min-height:36px;padding:6px 10px;border-radius:8px;font-size:13px" onclick="KKontakt.clearSel()">Abbrechen</button>';
      if(window.lucide) lucide.createIcons();
    } else { el.innerHTML=''; }
  }
  function toggleSel(id, checked){ if(checked) _sel[id]=true; else delete _sel[id]; updateActions(); }
  function clearSel(){ _sel={}; render(); }
  function deleteOne(id){ if(!confirm('Diese Konversation endgültig löschen?')) return; doDelete([id]); }
  function deleteSelected(){ var ids=selIds(); if(!ids.length) return; if(!confirm(ids.length+' Konversation(en) endgültig löschen?')) return; doDelete(ids); }
  function doDelete(ids){
    Promise.all(ids.map(function(id){
      return fetch(API+'/contact-message/'+id,{method:'DELETE'}).then(function(r){ return r.json().catch(function(){return {};}); }).catch(function(){ return {}; });
    })).then(function(){
      ids.forEach(function(id){ delete _sel[id]; delete _open[id]; delete _draft[id]; delete _pendingImg[id]; });
      reload(); pollBadge();
    });
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
    onShow:onShow, reload:reload, toggle:toggle,
    send:send, stageImage:stageImage, removeImage:removeImage, pollBadge:pollBadge, zoom:zoom,
    emoji:emoji, toggleSel:toggleSel, clearSel:clearSel, deleteOne:deleteOne, deleteSelected:deleteSelected
  };
})();
