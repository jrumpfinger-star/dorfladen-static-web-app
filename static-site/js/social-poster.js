// ═══════════════════════════════════════════════════════════
//  SOCIAL POSTER + SHARING (continuation of social.js)
// ═══════════════════════════════════════════════════════════
(function(){
  'use strict';
  var M=window._socialModule;
  if(!M){console.error('[Social] social.js must be loaded before social-poster.js');return;}
  var API=M.API;
  var socialStatus=M.socialStatus;
  var socialGatherSelected=M.socialGatherSelected;
  var getFeatureFlags=M.getFeatureFlags;
  var lucideIcon=M.lucideIcon;

  function socialWrapText(ctx,text,maxW){var words=text.split(' '),lines=[],cur='';words.forEach(function(w){var test=cur?cur+' '+w:w;if(ctx.measureText(test).width>maxW){if(cur)lines.push(cur);cur=w;}else{cur=test;}});if(cur)lines.push(cur);return lines;}

  // ── Helfer: abgerundetes Rechteck ──
  function socialRoundRect(ctx,x,y,w,h,r){ctx.beginPath();ctx.moveTo(x+r,y);ctx.arcTo(x+w,y,x+w,y+h,r);ctx.arcTo(x+w,y+h,x,y+h,r);ctx.arcTo(x,y+h,x,y,r);ctx.arcTo(x,y,x+w,y,r);ctx.closePath();}
  // ── Helfer: Bild formatfüllend (object-fit:cover) in abgerundete Box ──
  function socialDrawCover(ctx,img,x,y,w,h,r){var iw=img.width||1,ih=img.height||1;var s=Math.max(w/iw,h/ih);var dw=iw*s,dh=ih*s;var dx=x+(w-dw)/2,dy=y+(h-dh)/2;ctx.save();socialRoundRect(ctx,x,y,w,h,r);ctx.clip();ctx.drawImage(img,dx,dy,dw,dh);ctx.restore();ctx.save();socialRoundRect(ctx,x,y,w,h,r);ctx.strokeStyle='rgba(0,0,0,.08)';ctx.lineWidth=1;ctx.stroke();ctx.restore();}
  // ── Helfer: Platzhalter-Kachel (kein Foto) mit Emoji ──
  function socialDrawPlaceholder(ctx,x,y,w,h,r,emoji){ctx.save();socialRoundRect(ctx,x,y,w,h,r);var g=ctx.createLinearGradient(x,y,x,y+h);g.addColorStop(0,'#f2efe8');g.addColorStop(1,'#e6dfd2');ctx.fillStyle=g;ctx.fill();ctx.clip();ctx.textAlign='center';ctx.textBaseline='middle';ctx.font=Math.round(h*0.4)+'px "Segoe UI Emoji","Apple Color Emoji",sans-serif';ctx.globalAlpha=0.85;ctx.fillText(emoji||'\uD83D\uDED2',x+w/2,y+h/2+2);ctx.globalAlpha=1;ctx.restore();ctx.textBaseline='alphabetic';}
  // ── Helfer: Text auf max. N Zeilen kürzen (mit …) ──
  function socialClampLines(ctx,text,maxW,maxLines){
    var words=(text||'').trim().split(/\s+/),lines=[],cur='';
    for(var i=0;i<words.length;i++){
      var test=cur?cur+' '+words[i]:words[i];
      if(ctx.measureText(test).width>maxW&&cur){lines.push(cur);cur=words[i];}
      else{cur=test;}
      if(lines.length===maxLines-1){ // letzte erlaubte Zeile: Rest anhängen und ggf. mit … kürzen
        var rest=cur;for(var j=i+1;j<words.length;j++)rest+=' '+words[j];
        if(ctx.measureText(rest).width>maxW){while(ctx.measureText(rest+'\u2026').width>maxW&&rest.length>1)rest=rest.slice(0,-1);rest+='\u2026';}
        lines.push(rest);cur='';break;
      }
    }
    if(cur)lines.push(cur);
    return lines.length?lines:[''];
  }
  function socialFmtPrice(v){var d=parseFloat(v);return (d&&isFinite(d))?d.toFixed(2).replace('.',','):(''+v);}

  function socialDrawPoster(canvas,ctx,W,selected,titel,freitext,loadedImgs,SCALE,hideFooter){
    SCALE=SCALE||1;
    var PAD=26, GAP=16, CPAD=10;
    var colW=(W-PAD*2-GAP)/2;         // Kartenbreite
    var photoW=colW-CPAD*2;           // Fotobreite in der Karte
    var photoH=Math.round(photoW*3/4);// 4:3
    var fwPhotoW=200, fwPhotoH=150;   // Vollbreiten-Karte (einzelnes Rest-Produkt)
    var NAME_LH=19, NAME_FONT='bold 15px "Segoe UI",system-ui,sans-serif';
    var FW_NAME_LH=22, FW_NAME_FONT='bold 17px "Segoe UI",system-ui,sans-serif';
    // Canvas kann kein SVG/Lucide – Emoji-Fallbacks (laut Konventionen §3 für Poster erlaubt)
    var _iconToEmoji={'utensils':'\uD83C\uDF5D','cake-slice':'\uD83C\uDF70','apple':'\uD83C\uDF4E','jar':'\uD83E\uDD57','salad':'\uD83E\uDD57','coffee':'\u2615','beef':'\uD83E\uDD69','fish':'\uD83D\uDC1F','pizza':'\uD83C\uDF55','sandwich':'\uD83E\uDD6A','cookie':'\uD83C\uDF6A','ice-cream-cone':'\uD83C\uDF66','wine':'\uD83C\uDF77','beer':'\uD83C\uDF7A','cherry':'\uD83C\uDF52','grape':'\uD83C\uDF47','carrot':'\uD83E\uDD55','wheat':'\uD83C\uDF3E','leaf':'\uD83C\uDF3F','tag':'\uD83C\uDFF7\uFE0F'};
    var catIcons={};
    var kats=window._socKategorien_ref?window._socKategorien_ref():[];
    kats.forEach(function(k){catIcons[k.name]=_iconToEmoji[k.icon]||'';});
    if(!catIcons['Mittagessen'])catIcons['Mittagessen']='\uD83C\uDF5D';
    if(!catIcons['Kuchen'])catIcons['Kuchen']='\uD83C\uDF70';
    var cats={};selected.forEach(function(p){var c=p.kategorie||'Sonstiges';if(!cats[c])cats[c]=[];cats[c].push(p);});
    var catKeys=Object.keys(cats);

    // ── leer ──
    if(!selected.length){
      var H0=170;canvas.width=W*SCALE;canvas.height=H0*SCALE;ctx.setTransform(SCALE,0,0,SCALE,0,0);
      ctx.fillStyle='#faf9f6';ctx.fillRect(0,0,W,H0);
      ctx.fillStyle='#2e7d32';ctx.fillRect(0,0,W,60);
      ctx.fillStyle='#fff';ctx.font='bold 22px "Segoe UI",system-ui,sans-serif';ctx.textAlign='center';ctx.fillText(titel||'Heute im Dorfladen',W/2,38);
      ctx.fillStyle='#9ca3af';ctx.font='italic 14px "Segoe UI",system-ui,sans-serif';ctx.fillText('Bitte Produkte oben ausw\u00e4hlen\u2026',W/2,120);
      return;
    }

    // Karten-Maße (misst Namenszeilen)
    function gridInfo(mctx,p){mctx.font=NAME_FONT;var lines=socialClampLines(mctx,p.name||'',photoW,2);var h=CPAD+photoH+10+lines.length*NAME_LH+CPAD;if(p.ab_uhr)h+=2+13;if(p.preis)h+=6+22;return {lines:lines,h:h};}
    function fwInfo(mctx,p){mctx.font=FW_NAME_FONT;var tw=W-PAD*2-fwPhotoW-16-CPAD*2;var lines=socialClampLines(mctx,p.name||'',tw,2);var textH=lines.length*FW_NAME_LH+(p.ab_uhr?2+15:0)+(p.preis?8+24:0);var h=Math.max(CPAD+fwPhotoH+CPAD,textH+CPAD*2);return {lines:lines,h:h,tw:tw};}

    // ── eine Karte zeichnen (Grid) ──
    function drawGridCard(ctx2,p,x,y,rowH,info,cat){
      ctx2.save();socialRoundRect(ctx2,x,y,colW,rowH,14);ctx2.fillStyle='#ffffff';ctx2.shadowColor='rgba(0,0,0,0.10)';ctx2.shadowBlur=8;ctx2.shadowOffsetY=2;ctx2.fill();ctx2.restore();
      ctx2.save();socialRoundRect(ctx2,x,y,colW,rowH,14);ctx2.strokeStyle='#ece7de';ctx2.lineWidth=1;ctx2.stroke();ctx2.restore();
      var px=x+CPAD, py=y+CPAD, img=loadedImgs[p.id];
      if(img) socialDrawCover(ctx2,img,px,py,photoW,photoH,10); else socialDrawPlaceholder(ctx2,px,py,photoW,photoH,10,catIcons[cat]||'\uD83D\uDED2');
      var cx=x+colW/2, ty=py+photoH+10+14;
      ctx2.textAlign='center';ctx2.fillStyle='#1f2937';ctx2.font=NAME_FONT;
      info.lines.forEach(function(l){ctx2.fillText(l,cx,ty);ty+=NAME_LH;});
      var by=y+rowH-CPAD; // bottom-aligned Preis (damit Preise nebeneinander fluchten)
      if(p.preis){ctx2.fillStyle='#2e7d32';ctx2.font='bold 18px "Segoe UI",system-ui,sans-serif';ctx2.fillText(socialFmtPrice(p.preis)+' \u20AC',cx,by);}
      if(p.ab_uhr){ctx2.fillStyle='#9ca3af';ctx2.font='italic 11px "Segoe UI",system-ui,sans-serif';ctx2.fillText('ab '+p.ab_uhr,cx,p.preis?by-22:by);}
    }
    // ── einzelne Rest-Karte über volle Breite ──
    function drawFullCard(ctx2,p,x,y,info,cat){
      var w=W-PAD*2;
      ctx2.save();socialRoundRect(ctx2,x,y,w,info.h,14);ctx2.fillStyle='#ffffff';ctx2.shadowColor='rgba(0,0,0,0.10)';ctx2.shadowBlur=8;ctx2.shadowOffsetY=2;ctx2.fill();ctx2.restore();
      ctx2.save();socialRoundRect(ctx2,x,y,w,info.h,14);ctx2.strokeStyle='#ece7de';ctx2.lineWidth=1;ctx2.stroke();ctx2.restore();
      var px=x+CPAD, py=y+(info.h-fwPhotoH)/2, img=loadedImgs[p.id];
      if(img) socialDrawCover(ctx2,img,px,py,fwPhotoW,fwPhotoH,10); else socialDrawPlaceholder(ctx2,px,py,fwPhotoW,fwPhotoH,10,catIcons[cat]||'\uD83D\uDED2');
      var tx=x+CPAD+fwPhotoW+16;
      var blockH=info.lines.length*FW_NAME_LH+(p.ab_uhr?2+15:0)+(p.preis?8+24:0);
      var ty=y+(info.h-blockH)/2+16;
      ctx2.textAlign='left';ctx2.fillStyle='#1f2937';ctx2.font=FW_NAME_FONT;
      info.lines.forEach(function(l){ctx2.fillText(l,tx,ty);ty+=FW_NAME_LH;});
      if(p.ab_uhr){ctx2.fillStyle='#9ca3af';ctx2.font='italic 12px "Segoe UI",system-ui,sans-serif';ctx2.fillText('ab '+p.ab_uhr+' Uhr',tx,ty+2);ty+=15;}
      if(p.preis){ty+=8;ctx2.fillStyle='#2e7d32';ctx2.font='bold 22px "Segoe UI",system-ui,sans-serif';ctx2.fillText(socialFmtPrice(p.preis)+' \u20AC',tx,ty+16);}
    }

    // ── Layout-Durchlauf: misst (draw=false) bzw. zeichnet (draw=true) ──
    function layout(ctx2,draw,H){
      if(draw){
        ctx2.fillStyle='#faf9f6';ctx2.fillRect(0,0,W,H);
        var hg=ctx2.createLinearGradient(0,0,W,60);hg.addColorStop(0,'#2e7d32');hg.addColorStop(1,'#3a8f3f');
        ctx2.fillStyle=hg;ctx2.fillRect(0,0,W,60);
        ctx2.fillStyle='#fff';ctx2.font='bold 22px "Segoe UI",system-ui,sans-serif';ctx2.textAlign='center';ctx2.fillText(titel||'Heute im Dorfladen',W/2,38);
        var now=new Date();var days=['Sonntag','Montag','Dienstag','Mittwoch','Donnerstag','Freitag','Samstag'];
        var dateStr=days[now.getDay()]+', '+now.getDate()+'.'+(now.getMonth()+1)+'.'+now.getFullYear();
        ctx2.fillStyle='#6b7280';ctx2.font='13px "Segoe UI",system-ui,sans-serif';ctx2.fillText(dateStr,W/2,80);
      }
      var y=88;
      if(freitext){
        ctx2.font='italic 14px "Segoe UI",system-ui,sans-serif';
        var fl=socialWrapText(ctx2,freitext,W-70);
        y+=6;
        if(draw){ctx2.fillStyle='#374151';ctx2.textAlign='center';fl.forEach(function(l){ctx2.fillText(l,W/2,y+14);y+=18;});}else{y+=fl.length*18;}
        y+=4;
      }
      catKeys.forEach(function(cat){
        y+=18;
        if(draw){
          ctx2.textAlign='left';ctx2.fillStyle='#e1306c';ctx2.font='bold 17px "Segoe UI",system-ui,sans-serif';
          var label=((catIcons[cat]||'')+' '+cat).replace(/^ /,'');
          ctx2.fillText(label,PAD,y);
          var lw=ctx2.measureText(label).width, lineX=PAD+lw+12;
          if(lineX<W-PAD-20){var lg=ctx2.createLinearGradient(lineX,0,W-PAD,0);lg.addColorStop(0,'#e1306c');lg.addColorStop(1,'rgba(225,48,108,0.12)');ctx2.strokeStyle=lg;ctx2.lineWidth=2;ctx2.beginPath();ctx2.moveTo(lineX,y-5);ctx2.lineTo(W-PAD,y-5);ctx2.stroke();}
        }
        y+=14;
        var items=cats[cat];
        for(var i=0;i<items.length;i+=2){
          if(i===items.length-1){
            var fi=fwInfo(ctx2,items[i]);
            if(draw) drawFullCard(ctx2,items[i],PAD,y,fi,cat);
            y+=fi.h+GAP;
          } else {
            var a=gridInfo(ctx2,items[i]), b=gridInfo(ctx2,items[i+1]);
            var rowH=Math.max(a.h,b.h);
            if(draw){drawGridCard(ctx2,items[i],PAD,y,rowH,a,cat);drawGridCard(ctx2,items[i+1],PAD+colW+GAP,y,rowH,b,cat);}
            y+=rowH+GAP;
          }
        }
        y+=4;
      });
      y+=12;
      if(!hideFooter){
        if(draw){ctx2.fillStyle='#6b8c42';ctx2.font='bold 12px "Segoe UI",system-ui,sans-serif';ctx2.textAlign='center';ctx2.fillText('\uD83C\uDF3F FRISCH \u00B7 REGIONAL \u00B7 NACHHALTIG \uD83C\uDF3F',W/2,y);}
        y+=18;
      }
      return y;
    }

    // Mess-Durchlauf → Gesamthöhe, dann zeichnen
    var scratch=document.createElement('canvas').getContext('2d');
    var H=Math.max(170,Math.round(layout(scratch,false,0)));
    canvas.width=W*SCALE;canvas.height=H*SCALE;ctx.setTransform(SCALE,0,0,SCALE,0,0);
    layout(ctx,true,H);
  }

  function socialDrawMealPosterAuto(canvas,ctx,W,mtItems,loadedImgs,SCALE){
    SCALE=SCALE||1;
    var PAD=26, GAP=16, CPAD=10, fwPhotoW=200, fwPhotoH=150;
    var NAME_LH=22, NAME_FONT='bold 18px "Segoe UI",system-ui,sans-serif';
    var days=['Sonntag','Montag','Dienstag','Mittwoch','Donnerstag','Freitag','Samstag'];
    var headerLabel='\uD83C\uDF7D\uFE0F Mittagessen \u00B7 '+days[new Date().getDay()];
    var totalMenus=mtItems.length;

    function mealInfo(mctx,meal){
      mctx.font=NAME_FONT;
      var tw=W-PAD*2-fwPhotoW-16-CPAD*2;
      var lines=socialClampLines(mctx,meal.name||'',tw,3);
      var showMenu=totalMenus>1;
      var textH=(showMenu?26:0)+lines.length*NAME_LH+(meal.ab_uhr?6+20:0)+10+30;
      var h=Math.max(CPAD+fwPhotoH+CPAD,textH+CPAD*2);
      return {lines:lines,h:h,showMenu:showMenu,textH:textH};
    }
    // Platzhalter-Kachel (kein Foto): gruener Verlauf + Teller-Emoji – passt zu Artikeln
    function drawMealPlaceholder(ctx2,x,y,w,h,r){ctx2.save();socialRoundRect(ctx2,x,y,w,h,r);var g=ctx2.createLinearGradient(x,y,x,y+h);g.addColorStop(0,'#3a8f3f');g.addColorStop(1,'#256a2a');ctx2.fillStyle=g;ctx2.fill();ctx2.clip();ctx2.textAlign='center';ctx2.textBaseline='middle';ctx2.font=Math.round(h*0.42)+'px "Segoe UI Emoji","Apple Color Emoji",sans-serif';ctx2.globalAlpha=0.95;ctx2.fillText('\uD83C\uDF7D\uFE0F',x+w/2,y+h/2+2);ctx2.globalAlpha=1;ctx2.restore();ctx2.textBaseline='alphabetic';}
    // Gut lesbarer "ab HH:MM Uhr"-Badge (rot mit Rahmen) statt hellgrauem Text
    function drawAbBadge(ctx2,x,yBaseline,text){ctx2.font='bold 11px "Segoe UI",system-ui,sans-serif';var t='ab '+text+' Uhr';var bw=ctx2.measureText(t).width+16;var by=yBaseline-14;ctx2.save();socialRoundRect(ctx2,x,by,bw,20,6);ctx2.fillStyle='#fff';ctx2.fill();ctx2.strokeStyle='#dc2626';ctx2.lineWidth=1.5;ctx2.stroke();ctx2.restore();ctx2.fillStyle='#dc2626';ctx2.textAlign='left';ctx2.fillText(t,x+8,yBaseline);}
    function drawMealCard(ctx2,meal,x,y,info,idx){
      var w=W-PAD*2;
      ctx2.save();socialRoundRect(ctx2,x,y,w,info.h,14);ctx2.fillStyle='#ffffff';ctx2.shadowColor='rgba(0,0,0,0.10)';ctx2.shadowBlur=8;ctx2.shadowOffsetY=2;ctx2.fill();ctx2.restore();
      ctx2.save();socialRoundRect(ctx2,x,y,w,info.h,14);ctx2.strokeStyle='#ece7de';ctx2.lineWidth=1;ctx2.stroke();ctx2.restore();
      var px=x+CPAD, py=y+(info.h-fwPhotoH)/2, img=loadedImgs&&loadedImgs[meal.id];
      if(img) socialDrawCover(ctx2,img,px,py,fwPhotoW,fwPhotoH,10); else drawMealPlaceholder(ctx2,px,py,fwPhotoW,fwPhotoH,10);
      var tx=x+CPAD+fwPhotoW+16;
      var ty=y+(info.h-info.textH)/2+(info.showMenu?18:16);
      if(info.showMenu){var t='Men\u00fc '+(idx+1);ctx2.font='bold 12px "Segoe UI",system-ui,sans-serif';var pw=ctx2.measureText(t).width+18;ctx2.save();socialRoundRect(ctx2,tx,ty-14,pw,20,10);ctx2.fillStyle='rgba(46,125,50,0.12)';ctx2.fill();ctx2.restore();ctx2.fillStyle='#2e7d32';ctx2.textAlign='left';ctx2.fillText(t,tx+9,ty);ty+=26;}
      ctx2.textAlign='left';ctx2.fillStyle='#1f2937';ctx2.font=NAME_FONT;
      info.lines.forEach(function(l){ctx2.fillText(l,tx,ty);ty+=NAME_LH;});
      if(meal.ab_uhr){ty+=6;drawAbBadge(ctx2,tx,ty,meal.ab_uhr);ty+=20;}
      ty+=10;ctx2.fillStyle='#2e7d32';ctx2.font='bold 28px "Segoe UI",system-ui,sans-serif';ctx2.textAlign='left';ctx2.fillText(socialFmtPrice(meal.preis)+' \u20AC',tx,ty+8);
    }
    // Mess-Durchlauf (Scratch) -> Gesamthoehe
    var scratch=document.createElement('canvas').getContext('2d');
    var H=34+18;
    mtItems.forEach(function(m){H+=mealInfo(scratch,m).h+GAP;});
    H+=6;H=Math.max(150,H);
    canvas.width=W*SCALE;canvas.height=H*SCALE;ctx=canvas.getContext('2d');ctx.setTransform(SCALE,0,0,SCALE,0,0);
    ctx.fillStyle='#faf9f6';ctx.fillRect(0,0,W,H);
    // Sektionsueberschrift (gruen) mit Trennlinie – Tag gut lesbar integriert
    var yy=34;ctx.textAlign='left';ctx.fillStyle='#2e7d32';ctx.font='bold 17px "Segoe UI",system-ui,sans-serif';ctx.fillText(headerLabel,PAD,yy);
    var lw=ctx.measureText(headerLabel).width, lineX=PAD+lw+12;
    if(lineX<W-PAD-20){var lg=ctx.createLinearGradient(lineX,0,W-PAD,0);lg.addColorStop(0,'#2e7d32');lg.addColorStop(1,'rgba(46,125,50,0.12)');ctx.strokeStyle=lg;ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(lineX,yy-5);ctx.lineTo(W-PAD,yy-5);ctx.stroke();}
    yy+=18;
    mtItems.forEach(function(m,i){var info=mealInfo(ctx,m);drawMealCard(ctx,m,PAD,yy,info,i);yy+=info.h+GAP;});
  }

  // Expose draw functions on module
  M.socialDrawPoster=socialDrawPoster;
  M.socialDrawMealPosterAuto=socialDrawMealPosterAuto;
  M.socialWrapText=socialWrapText;

  // --- Preview generator ---
  window.socialGenPreview=function(){
    var canvas=document.getElementById('soc-post-canvas');if(!canvas)return;var ctx=canvas.getContext('2d');var W=600;var SCALE=2;
    canvas.style.display='none';var _mealC=document.getElementById('soc-post-canvas-meal');var _mealL=document.getElementById('soc-preview-label-meal');var _dailyL=document.getElementById('soc-preview-label-daily');if(_mealC)_mealC.style.display='none';if(_mealL)_mealL.style.display='none';if(_dailyL)_dailyL.style.display='none';
    var selected=socialGatherSelected();var titel=(document.getElementById('soc-post-titel').value||'').trim();var freitext=(document.getElementById('soc-post-text').value||'').trim();
    var imgMap={};var ff=getFeatureFlags();var _socMtBilder=M._socMtBilder();var _socialKatalog=M._socialKatalog();var _socFreeItems=M._socFreeItems();
    if(ff.post_images!==false){selected.forEach(function(p){var url='';var pName=p.name||p.gericht||'';if(_socMtBilder[pName]&&_socMtBilder[pName].bild_url)url=_socMtBilder[pName].bild_url;if(!url){var katItem=_socialKatalog.find(function(k){return k.id===p.id;});if(katItem&&katItem.bild_url)url=katItem.bild_url;}if(!url&&p.bild_url)url=p.bild_url;if(!url){var freeItem=_socFreeItems.find(function(f){return f.id===p.id;});if(freeItem&&freeItem.bild_data)url=freeItem.bild_data;}if(url)imgMap[p.id]=url;});}
    var imgUrls=Object.keys(imgMap).map(function(id){return{id:id,url:imgMap[id]};});var loadedImgs={};
    var promises=imgUrls.map(function(entry){return new Promise(function(resolve){if(entry.url.indexOf('data:')===0){var img=new Image();img.onload=function(){loadedImgs[entry.id]=img;resolve();};img.onerror=function(){resolve();};img.src=entry.url;return;}fetch(entry.url).then(function(r){return r.blob();}).then(function(blob){var objUrl=URL.createObjectURL(blob);var img=new Image();img.onload=function(){loadedImgs[entry.id]=img;resolve();};img.onerror=function(){URL.revokeObjectURL(objUrl);resolve();};img.src=objUrl;}).catch(function(){var img=new Image();img.crossOrigin='anonymous';img.onload=function(){loadedImgs[entry.id]=img;loadedImgs['_tainted']=true;resolve();};img.onerror=function(){var img2=new Image();img2.onload=function(){loadedImgs[entry.id]=img2;loadedImgs['_tainted']=true;resolve();};img2.onerror=function(){resolve();};img2.src=entry.url;};img.src=entry.url;});});});
    return Promise.all(promises).then(function(){
      var mtItems=selected.filter(function(p){return p.kategorie==='Mittagessen';});var otherItems=selected.filter(function(p){return p.kategorie!=='Mittagessen';});var hasMt=mtItems.length>0;var hasOther=otherItems.length>0;
      var mealCanvas=document.getElementById('soc-post-canvas-meal');var mealLabel=document.getElementById('soc-preview-label-meal');var dailyLabel=document.getElementById('soc-preview-label-daily');if(mealCanvas)mealCanvas.style.display='none';if(mealLabel)mealLabel.style.display='none';if(dailyLabel)dailyLabel.style.display='none';
      if(hasMt&&hasOther){var tmpDaily=document.createElement('canvas');socialDrawPoster(tmpDaily,tmpDaily.getContext('2d'),W,otherItems,titel,freitext,loadedImgs,SCALE,true);var tmpMeal=document.createElement('canvas');socialDrawMealPosterAuto(tmpMeal,tmpMeal.getContext('2d'),W,mtItems,loadedImgs,SCALE);canvas.width=W*SCALE;canvas.height=tmpDaily.height+tmpMeal.height;ctx.drawImage(tmpDaily,0,0);ctx.drawImage(tmpMeal,0,tmpDaily.height);canvas.style.display='block';}
      else if(hasMt){canvas.style.display='block';socialDrawMealPosterAuto(canvas,canvas.getContext('2d'),W,mtItems,loadedImgs,SCALE);}
      else if(selected.length>0){canvas.style.display='block';socialDrawPoster(canvas,ctx,W,selected,titel,freitext,loadedImgs,SCALE);}
      else{canvas.style.display='none';}
      window._socLoadedImgs=loadedImgs;
    });
  };

  // --- WhatsApp message builder ---
  function socialBuildWhatsAppMsg(selected){
    var hasMittagessen=selected.some(function(p){return (p.kategorie||'Sonstiges')==='Mittagessen';});
    // Kurze, EINZEILIGE Bildunterschrift mit Link: erhoeht die Chance, dass
    // WhatsApp den Text als Caption zum Bild behaelt (statt separater Nachricht).
    if(hasMittagessen){
      var origin=window.location.origin||'';
      return '\uD83D\uDC49 Mittagessen vorbestellen: '+origin+'/tagesinfo';
    }
    return '';
  }

  function socialIsMobile(){return /Android|iPhone|iPad|iPod|webOS|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);}
  function socialFallbackDownloadFiles(files){files.forEach(function(f){var url=URL.createObjectURL(f);var a=document.createElement('a');a.href=url;a.download=f.name;document.body.appendChild(a);a.click();document.body.removeChild(a);setTimeout(function(){URL.revokeObjectURL(url);},2000);});socialStatus('soc-post-status','\u2705 '+files.length+' Poster heruntergeladen',true);}
  function socialShareViaDownload(files,msg){socialFallbackDownloadFiles(files);setTimeout(function(){window.open('https://wa.me/?text='+encodeURIComponent(msg||''),'_blank');},500);}
  function socialShareViaClipboard(files,msg){var blob=files[0];if(navigator.clipboard&&navigator.clipboard.write&&typeof ClipboardItem!=='undefined'){try{var item=new ClipboardItem({'image/png':blob});navigator.clipboard.write([item]).then(function(){socialStatus('soc-post-status','\u2705 Poster in Zwischenablage!',true);}).catch(function(){socialShareViaDownload(files,msg);});}catch(e){socialShareViaDownload(files,msg);}}else{socialShareViaDownload(files,msg);}setTimeout(function(){window.open('https://wa.me/?text='+encodeURIComponent(msg||''),'_blank');},300);}
  // Text zuverlässig in die Zwischenablage kopieren (mit execCommand-Fallback)
  function socialCopyTextFallback(text){try{var ta=document.createElement('textarea');ta.value=text;ta.style.position='fixed';ta.style.top='-1000px';ta.style.opacity='0';document.body.appendChild(ta);ta.focus();ta.select();var ok=document.execCommand('copy');document.body.removeChild(ta);return ok;}catch(e){return false;}}
  function socialCopyText(text){return new Promise(function(resolve){if(navigator.clipboard&&navigator.clipboard.writeText){navigator.clipboard.writeText(text).then(function(){resolve(true);},function(){resolve(socialCopyTextFallback(text));});}else{resolve(socialCopyTextFallback(text));}});}
  function socialShareFiles(files,msg,hasMt){
    var isMobile=socialIsMobile();
    var shareOne=files.length>1?[files[0]]:files;
    var canShareFiles=false;if(navigator.share&&navigator.canShare){try{canShareFiles=navigator.canShare({files:shareOne});}catch(e){}}
    // WICHTIG: KEIN navigator.clipboard.writeText() VOR navigator.share() aufrufen!
    // Auf Android verbraucht der Clipboard-Schreibzugriff die transiente Nutzeraktivierung,
    // wodurch navigator.share() mit NotAllowedError fehlschlaegt und die App in den
    // Download-Fallback faellt (Bild wird nicht geteilt, nur Text via wa.me). Der Text wird
    // ueber shareData.text uebergeben und erst NACH erfolgreichem Teilen als Backup kopiert.
    // Bevorzugt: natives Teilen mit Datei (oeffnet die System-Auswahl inkl. WhatsApp) - Mobil UND Desktop.
    if(canShareFiles){
      var shareData={files:shareOne};if(msg)shareData.text=msg;
      navigator.share(shareData).then(function(){
        if(msg){try{if(navigator.clipboard&&navigator.clipboard.writeText){navigator.clipboard.writeText(msg).catch(function(){});}}catch(e){}}
        socialStatus('soc-post-status', msg?'\u2705 Bild geteilt \u00B7 Falls der Text fehlt: im Chat einf\u00fcgen (Text ist kopiert)':'\u2705 Bild geteilt!',true);
      }).catch(function(err){
        if(err.name==='AbortError')return;
        if(isMobile){socialShareViaClipboard(files,msg);}
        else{socialFallbackDownloadFiles(files);window.open('https://wa.me/?text='+encodeURIComponent(msg||''),'_blank');}
      });
      socialStatus('soc-post-status','Wird geteilt\u2026',true);
      return;
    }
    // Kein natives Teilen mit Datei verfuegbar:
    if(isMobile){socialShareViaClipboard(files,msg);return;}
    // Desktop-Browser ohne Web-Share: Poster herunterladen, dann WhatsApp Web mit vorausgefuelltem Text.
    socialFallbackDownloadFiles(files);
    socialStatus('soc-post-status', msg?'\u2705 Poster gespeichert \u00B7 WhatsApp wird ge\u00f6ffnet \u2013 Poster anh\u00e4ngen (\uD83D\uDCCE), Text ist in der Zwischenablage':'\u2705 Poster gespeichert \u00B7 WhatsApp wird ge\u00f6ffnet \u2013 bitte Poster anh\u00e4ngen',true);
    window.open('https://wa.me/?text='+encodeURIComponent(msg||''),'_blank');
  }

  function canvasToFiles(canvases,selected,titel,freitext){
    var files=[];
    canvases.forEach(function(c){
      var dataUrl;try{dataUrl=c.canvas.toDataURL('image/png');}catch(e){var cc=document.createElement('canvas');var cx=cc.getContext('2d');var mtI=selected.filter(function(p){return p.kategorie==='Mittagessen';});var otherI=selected.filter(function(p){return p.kategorie!=='Mittagessen';});if(mtI.length>0&&otherI.length>0){var tD=document.createElement('canvas');socialDrawPoster(tD,tD.getContext('2d'),600,otherI,titel,freitext,{},2,true);var tM=document.createElement('canvas');socialDrawMealPosterAuto(tM,tM.getContext('2d'),600,mtI,{},2);cc.width=1200;cc.height=tD.height+tM.height;cx.drawImage(tD,0,0);cx.drawImage(tM,0,tD.height);}else if(mtI.length>0){socialDrawMealPosterAuto(cc,cx,600,mtI,{},2);}else{socialDrawPoster(cc,cx,600,otherI,titel,freitext,{},2);}dataUrl=cc.toDataURL('image/png');}
      if(dataUrl){var parts=dataUrl.split(',');var mime=parts[0].match(/:(.*?);/)[1];var bstr=atob(parts[1]);var u8=new Uint8Array(bstr.length);for(var i=0;i<bstr.length;i++)u8[i]=bstr.charCodeAt(i);files.push(new File([new Blob([u8],{type:mime})],c.name,{type:'image/png'}));}
    });return files;
  }

  window.socialShareWhatsApp=function(){
    try{
    var titel=(document.getElementById('soc-post-titel').value||'').trim()||'Heute im Dorfladen';var freitext=(document.getElementById('soc-post-text').value||'').trim();var selected=socialGatherSelected();
    if(!selected.length){socialStatus('soc-post-status','Bitte Produkte ausw\u00e4hlen',false);return;}
    var msg=socialBuildWhatsAppMsg(selected);var hasMt=selected.some(function(p){return p.kategorie==='Mittagessen';});
    socialStatus('soc-post-status','Poster wird geteilt...',true);
    var dailyCanvas=document.getElementById('soc-post-canvas');var mealCanvas=document.getElementById('soc-post-canvas-meal');var canvases=[];
    if(dailyCanvas&&dailyCanvas.style.display!=='none'&&dailyCanvas.width>0)canvases.push({canvas:dailyCanvas,name:'dorfladen-post.png'});
    if(mealCanvas&&mealCanvas.style.display!=='none'&&mealCanvas.width>0)canvases.push({canvas:mealCanvas,name:'mittagessen-poster.png'});
    if(!canvases.length){var mtI=selected.filter(function(p){return p.kategorie==='Mittagessen';});var otherI=selected.filter(function(p){return p.kategorie!=='Mittagessen';});var fc=document.createElement('canvas');var fx=fc.getContext('2d');if(mtI.length>0&&otherI.length>0){var tD=document.createElement('canvas');socialDrawPoster(tD,tD.getContext('2d'),600,otherI,titel,freitext,{},2,true);var tM=document.createElement('canvas');socialDrawMealPosterAuto(tM,tM.getContext('2d'),600,mtI,{},2);fc.width=1200;fc.height=tD.height+tM.height;fx.drawImage(tD,0,0);fx.drawImage(tM,0,tD.height);}else if(mtI.length>0){socialDrawMealPosterAuto(fc,fx,600,mtI,{},2);}else{socialDrawPoster(fc,fx,600,otherI,titel,freitext,{},2);}canvases.push({canvas:fc,name:'dorfladen-post.png'});}
    var files=canvasToFiles(canvases,selected,titel,freitext);
    if(!files.length){socialStatus('soc-post-status','Poster-Export fehlgeschlagen',false);return;}
    socialShareFiles(files,msg,hasMt);socialSavePost(titel,freitext,selected);
    }catch(e){console.error('[Social] WhatsApp share error:',e);socialStatus('soc-post-status','Fehler: '+e.message,false);}
  };

  // --- Instagram Share ---
  window.socialShareInstagram=function(){
    var titel=(document.getElementById('soc-post-titel').value||'').trim()||'Heute im Dorfladen';var freitext=(document.getElementById('soc-post-text').value||'').trim();var selected=socialGatherSelected();
    socialStatus('soc-post-status','Poster wird erstellt...',true);
    var genPromise=socialGenPreview()||Promise.resolve();
    genPromise.then(function(){var canvas=document.getElementById('soc-post-canvas');if(!canvas){socialStatus('soc-post-status','Kein Poster vorhanden',false);return;}
      if(navigator.share){canvas.toBlob(function(blob){if(!blob){socialIgFallback();return;}var file=new File([blob],'dorfladen-post.png',{type:'image/png'});try{if(navigator.canShare&&navigator.canShare({files:[file]})){navigator.share({files:[file]}).then(function(){socialStatus('soc-post-status','\u2705 Geteilt!',true);}).catch(function(err){if(err.name!=='AbortError')socialIgFallback();});return;}}catch(e){}socialIgFallback();},'image/png');}else{socialIgFallback();}});
    socialSavePost(titel,freitext,selected);
  };
  function socialIgFallback(){var canvas=document.getElementById('soc-post-canvas');if(!canvas)return;canvas.toBlob(function(blob){if(blob&&navigator.clipboard&&navigator.clipboard.write){var item=new ClipboardItem({'image/png':blob});navigator.clipboard.write([item]).then(function(){socialStatus('soc-post-status','\u2705 Poster in Zwischenablage!',true);}).catch(function(){socialDownloadPoster();socialStatus('soc-post-status','\u2705 Bild heruntergeladen',true);});}else{socialDownloadPoster();socialStatus('soc-post-status','\u2705 Bild heruntergeladen',true);}},'image/png');}

  // --- Download poster ---
  window.socialDownloadPoster=function(){var now=new Date();var dateStr=now.getFullYear()+'-'+(now.getMonth()+1)+'-'+now.getDate();var mealCanvas=document.getElementById('soc-post-canvas-meal');if(mealCanvas&&mealCanvas.style.display!=='none'&&mealCanvas.width>0){var ml=document.createElement('a');ml.download='dorfladen-mittagessen-'+dateStr+'.png';ml.href=mealCanvas.toDataURL('image/png');ml.click();}var canvas=document.getElementById('soc-post-canvas');if(canvas&&canvas.style.display!=='none'&&canvas.width>0){var link=document.createElement('a');link.download='dorfladen-post-'+dateStr+'.png';link.href=canvas.toDataURL('image/png');setTimeout(function(){link.click();},200);}};

  // --- Ziel-Datum berechnen (heute oder morgen) ---
  function socialGetZielDatum(){
    if(window._socSelectedDay==='morgen'){
      var d=new Date(Date.now()+86400000);
      return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');
    }
    return '';
  }

  // --- Save post ---
  function socialSavePost(titel,freitext,items){var body={titel:titel,freitext:freitext,items:items.map(function(p){var o={id:p.id,name:p.name,kategorie:p.kategorie,preis:p.preis};if(p.bild_url)o.bild_url=p.bild_url;if(p.ab_uhr)o.ab_uhr=p.ab_uhr;return o;})};var zd=socialGetZielDatum();if(zd)body.ziel_datum=zd;fetch(API+'/social-post',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)}).catch(function(){});}

  // --- Publish as Tagesinfo only (no WhatsApp/Instagram) ---
  window.socialPublishTagesinfo=function(){
    var selected=socialGatherSelected();
    var titel=(document.getElementById('soc-post-titel')||{}).value||'';
    var freitext=(document.getElementById('soc-post-text')||{}).value||'';
    if(!selected.length&&!freitext.trim()){socialStatus('soc-post-status','Bitte mindestens ein Produkt auswählen oder Freitext eingeben',false);return;}
    // Button-Feedback: Spinner + deaktivieren
    var btns=document.querySelectorAll('button[onclick="socialPublishTagesinfo()"]');
    btns.forEach(function(b){b.disabled=true;b._origHtml=b.innerHTML;b.innerHTML='<span style="display:inline-block;width:16px;height:16px;border:2px solid #16a34a;border-top-color:transparent;border-radius:50%;animation:socSpin 0.6s linear infinite;vertical-align:middle;margin-right:6px"></span> Wird veröffentlicht…';b.style.opacity='0.7';b.style.cursor='wait';});
    // CSS-Animation für Spinner (einmalig einfügen)
    if(!document.getElementById('soc-spin-css')){var st=document.createElement('style');st.id='soc-spin-css';st.textContent='@keyframes socSpin{to{transform:rotate(360deg)}}';document.head.appendChild(st);}
    socialStatus('soc-post-status','⏳ Wird veröffentlicht…',true);
    var body={titel:titel,freitext:freitext,items:selected.map(function(p){var o={id:p.id,name:p.name,kategorie:p.kategorie,preis:p.preis};if(p.bild_url)o.bild_url=p.bild_url;if(p.ab_uhr)o.ab_uhr=p.ab_uhr;return o;})};var zd=socialGetZielDatum();if(zd)body.ziel_datum=zd;
    fetch(API+'/social-post',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)})
    .then(function(r){if(!r.ok)throw new Error('Fehler ('+r.status+')');return r.json();})
    .then(function(){
      var msg=zd?'✅ Tagesinfo für morgen geplant – erscheint ab heute Abend auf der Homepage':'✅ Tagesinfo veröffentlicht – erscheint auf der Homepage';socialStatus('soc-post-status',msg,true);
      btns.forEach(function(b){b.innerHTML='<span style="vertical-align:middle;margin-right:6px">✅</span> Veröffentlicht!';b.style.opacity='1';b.style.background='#dcfce7';b.style.borderColor='#16a34a';b.style.color='#166534';});
      setTimeout(function(){btns.forEach(function(b){b.disabled=false;b.innerHTML=b._origHtml;b.style.opacity='';b.style.cursor='';b.style.background='';b.style.borderColor='';b.style.color='';});},3000);
      if(typeof socialLoadTodayPosts==='function') socialLoadTodayPosts();
    })
    .catch(function(e){
      socialStatus('soc-post-status','❌ '+e.message,false);
      btns.forEach(function(b){b.disabled=false;b.innerHTML=b._origHtml;b.style.opacity='';b.style.cursor='';b.style.background='';b.style.borderColor='';b.style.color='';});
    });
  };

  // --- Entwurf bearbeiten (in Wizard laden) ---
  var _socEditingDraftId=null;
  window.socialGetEditingDraftId=function(){return _socEditingDraftId;};
  window.socialClearEditingDraft=function(){_socEditingDraftId=null;var badge=document.getElementById('soc-editing-badge');if(badge)badge.style.display='none';};
  window.socialEditDraft=function(postId){
    socialStatus('soc-post-status','\u23F3 Entwurf wird geladen\u2026',true);
    fetch(API+'/social-post').then(function(r){return r.json();}).then(function(res){
      var all=res.posts||res.items||[];
      var post=all.find(function(p){return p.id===postId;});
      if(!post){socialStatus('soc-post-status','\u274C Entwurf nicht gefunden',false);return;}
      _socEditingDraftId=postId;
      // Fill titel
      var titelEl=document.getElementById('soc-post-titel');
      if(titelEl){
        if(titelEl.tagName==='SELECT'&&titelEl.options){
          var found=false;
          for(var i=0;i<titelEl.options.length;i++){if(titelEl.options[i].value===post.titel){titelEl.selectedIndex=i;found=true;break;}}
          if(!found&&titelEl.options.length>0) titelEl.selectedIndex=0;
        }else{
          titelEl.value=post.titel||'';
        }
      }
      // Fill freitext
      var textEl=document.getElementById('soc-post-text');
      if(textEl) textEl.value=post.freitext||post.text||'';
      // Rebuild post items and select matching products
      if(typeof M.socialBuildPostItems==='function') M.socialBuildPostItems();
      var draftItems=post.items||[];
      // Check catalog checkboxes
      setTimeout(function(){
        draftItems.forEach(function(di){
          // Try catalog checkbox
          var cb=document.querySelector('.soc-post-cb[value="'+di.id+'"]');
          if(cb&&!cb.checked){cb.checked=true;}
          // Try meal checkbox
          var wp=document.querySelector('.soc-post-wp[data-name="'+(di.name||'').replace(/"/g,'\\"')+'"]');
          if(wp&&!wp.checked){wp.checked=true;}
        });
        if(typeof window.socialPickUpdate==='function') window.socialPickUpdate();
        // Show editing badge
        var badge=document.getElementById('soc-editing-badge');
        if(!badge){
          var step4hdr=document.querySelector('#soc-step-4 .k-order-hdr');
          if(step4hdr){
            badge=document.createElement('span');
            badge.id='soc-editing-badge';
            badge.style.cssText='font-size:10px;background:#fef3c7;color:#92400e;padding:2px 8px;border-radius:8px;font-weight:700;margin-left:8px;cursor:pointer';
            badge.title='Klicken um Bearbeitung abzubrechen';
            badge.onclick=function(e){e.stopPropagation();window.socialClearEditingDraft();socialStatus('soc-post-status','Bearbeitung abgebrochen',true);};
            step4hdr.appendChild(badge);
          }
        }
        if(badge){badge.style.display='inline';badge.textContent='\u270F Bearbeite Entwurf';}
        socialStatus('soc-post-status','\u2705 Entwurf geladen \u2013 bearbeiten und erneut parken oder senden',true);
        // Switch to Erfassen tab on desktop
        if(typeof window.socDeskTab==='function') window.socDeskTab('edit');
        // Scroll to top of social panel
        var panel=document.getElementById('panel-social');
        if(panel) panel.scrollTop=0;
      },200);
    }).catch(function(e){socialStatus('soc-post-status','\u274C '+e.message,false);});
  };

  // --- Als Entwurf speichern ---
  window.socialSaveDraft=function(){
    var selected=socialGatherSelected();
    var titel=(document.getElementById('soc-post-titel')||{}).value||'';
    var freitext=(document.getElementById('soc-post-text')||{}).value||'';
    if(!selected.length&&!freitext.trim()){socialStatus('soc-post-status','Bitte mindestens ein Produkt oder Freitext eingeben',false);return;}
    if(!document.getElementById('soc-spin-css')){var st=document.createElement('style');st.id='soc-spin-css';st.textContent='@keyframes socSpin{to{transform:rotate(360deg)}}';document.head.appendChild(st);}
    var isEdit=!!_socEditingDraftId;
    socialStatus('soc-post-status','\u23F3 Entwurf wird '+(isEdit?'aktualisiert':'gespeichert')+'\u2026',true);
    var body={titel:titel,freitext:freitext,status:'entwurf',items:selected.map(function(p){var o={id:p.id,name:p.name,kategorie:p.kategorie,preis:p.preis};if(p.bild_url)o.bild_url=p.bild_url;if(p.ab_uhr)o.ab_uhr=p.ab_uhr;return o;})};
    var method='POST';
    if(isEdit){body.id=_socEditingDraftId;body._action='patch';}
    else{var zd=socialGetZielDatum();if(zd)body.ziel_datum=zd;}
    fetch(API+'/social-post',{method:method,headers:{'Content-Type':'application/json'},body:JSON.stringify(body)})
    .then(function(r){if(!r.ok)throw new Error('Fehler ('+r.status+')');return r.json();})
    .then(function(){_socEditingDraftId=null;var badge=document.getElementById('soc-editing-badge');if(badge)badge.style.display='none';socialStatus('soc-post-status','\u2705 Entwurf '+(isEdit?'aktualisiert':'gespeichert')+' \u2013 kann sp\u00e4ter ver\u00f6ffentlicht werden',true);if(typeof socialLoadTodayPosts==='function')socialLoadTodayPosts();})
    .catch(function(e){socialStatus('soc-post-status','\u274C '+e.message,false);});
  };

  // --- Entwurf veröffentlichen ---
  window.socialPublishDraft=function(postId){
    socialStatus('soc-post-status','\u23F3 Wird ver\u00f6ffentlicht\u2026',true);
    fetch(API+'/social-post',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({_action:'patch',id:postId,status:'veroeffentlicht'})})
    .then(function(r){if(!r.ok)throw new Error('Fehler ('+r.status+')');return r.json();})
    .then(function(){socialStatus('soc-post-status','\u2705 Ver\u00f6ffentlicht!',true);if(typeof socialLoadTodayPosts==='function')socialLoadTodayPosts();})
    .catch(function(e){socialStatus('soc-post-status','\u274C '+e.message,false);});
  };

  // --- Entwurf löschen ---
  window.socialDeletePost=function(postId){
    dlConfirm({icon:'🗑️',title:'Post löschen?',msg:'Der Post wird unwiderruflich gelöscht.',ok:'Löschen',cancel:'Abbrechen',color:'#dc2626'},function(){
      socialStatus('soc-post-status','\u23F3 Wird gel\u00f6scht\u2026',true);
      fetch(API+'/social-post',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({_action:'delete',id:postId})})
      .then(function(r){if(!r.ok)throw new Error('Fehler ('+r.status+')');return r.json();})
      .then(function(){socialStatus('soc-post-status','\u2705 Gel\u00f6scht',true);if(typeof socialLoadTodayPosts==='function')socialLoadTodayPosts();})
      .catch(function(e){socialStatus('soc-post-status','\u274C '+e.message,false);});
    });
  };

  // --- Geplante Posts laden (heute + morgen) ---
  window.socialLoadTodayPosts=function(){
    var wrap=document.getElementById('soc-today-posts');
    var list=document.getElementById('soc-today-posts-list');
    if(!wrap||!list)return;
    var today=new Date();var td=today.getFullYear()+'-'+String(today.getMonth()+1).padStart(2,'0')+'-'+String(today.getDate()).padStart(2,'0');
    var tom=new Date(Date.now()+86400000);var tmr=tom.getFullYear()+'-'+String(tom.getMonth()+1).padStart(2,'0')+'-'+String(tom.getDate()).padStart(2,'0');
    fetch(API+'/social-post').then(function(r){return r.json();}).then(function(res){
      var all=res.posts||res.items||[];
      var todayPosts=all.filter(function(p){return p.datum&&p.datum.substring(0,10)===td;});
      var tomorrowPosts=all.filter(function(p){return p.datum&&p.datum.substring(0,10)===tmr;});
      if(!todayPosts.length&&!tomorrowPosts.length){list.innerHTML='';wrap.style.display='none';if(typeof window.socSyncDeskPosts==='function')window.socSyncDeskPosts();return;}
      wrap.style.display='';
      var html='';
      function timeStr(d){if(!d)return '';var m=d.match(/T(\d{2}:\d{2})/);return m?m[1]:'';}
      function renderCard(p){
        var cnt=p.items?p.items.length:0;
        var isDraft=p.status==='entwurf';
        var pid=M.esc(p.id);
        var borderColor=isDraft?'#f59e0b':'#22c55e';
        var zeit=timeStr(p.datum);
        // Card container
        html+='<div style="border-left:3px solid '+borderColor+';border-radius:8px;padding:8px 10px;margin-bottom:6px;background:#fff;box-shadow:0 1px 3px rgba(0,0,0,.06);transition:box-shadow .15s" onmouseenter="this.style.boxShadow=\'0 2px 8px rgba(0,0,0,.1)\'" onmouseleave="this.style.boxShadow=\'0 1px 3px rgba(0,0,0,.06)\'">';
        // Header row: status icon + title + time + actions
        html+='<div style="display:flex;align-items:center;gap:6px">';
        if(isDraft) html+='<span title="Entwurf" style="flex-shrink:0">'+lucideIcon('file-edit',14,'#f59e0b')+'</span>';
        else html+='<span title="Ver\u00f6ffentlicht" style="flex-shrink:0">'+lucideIcon('check-circle',14,'#22c55e')+'</span>';
        html+='<span style="font-weight:600;font-size:12px;color:#1f2937;flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">'+M.esc(p.titel||'Post')+'</span>';
        if(zeit) html+='<span style="font-size:10px;color:#9ca3af;white-space:nowrap">'+M.esc(zeit)+'</span>';
        html+='</div>';
        // Product tags (always visible, compact)
        if(cnt>0){
          html+='<div style="display:flex;flex-wrap:wrap;gap:3px;margin-top:5px">';
          var maxShow=4;
          (p.items||[]).slice(0,maxShow).forEach(function(it){
            html+='<span style="font-size:10px;background:#f3f4f6;color:#374151;padding:1px 6px;border-radius:4px;white-space:nowrap;max-width:140px;overflow:hidden;text-overflow:ellipsis;display:inline-block">'+M.esc(it.name||'?');
            if(it.preis) html+=' <b style="color:#2e7d32">'+M.esc(String(it.preis))+'\u20AC</b>';
            html+='</span>';
          });
          if(cnt>maxShow) html+='<span style="font-size:10px;color:#9ca3af;padding:1px 4px">+'+(cnt-maxShow)+'</span>';
          html+='</div>';
        }
        // Freitext snippet
        if(p.freitext||p.text){
          var txt=M.esc((p.freitext||p.text).substring(0,60));
          if((p.freitext||p.text).length>60) txt+='...';
          html+='<div style="font-size:10px;color:#6b7280;font-style:italic;margin-top:3px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">'+txt+'</div>';
        }
        // Action row — icon buttons
        html+='<div style="display:flex;gap:3px;margin-top:6px;align-items:center">';
        if(isDraft){
          html+='<button onclick="socialEditDraft(\''+pid+'\')" title="Bearbeiten" style="display:inline-flex;align-items:center;gap:3px;font-size:10px;padding:3px 8px;background:#eff6ff;border:1px solid #bfdbfe;border-radius:6px;cursor:pointer;color:#2563eb;font-weight:600">'+lucideIcon('pencil',12)+' Bearbeiten</button>';
          html+='<button onclick="socialPublishDraft(\''+pid+'\')" title="Jetzt senden" style="display:inline-flex;align-items:center;gap:3px;font-size:10px;padding:3px 8px;background:#f0fdf4;border:1px solid #bbf7d0;border-radius:6px;cursor:pointer;color:#16a34a;font-weight:600">'+lucideIcon('send',12)+' Senden</button>';
        }
        html+='<span style="flex:1"></span>';
        html+='<button onclick="socialDeletePost(\''+pid+'\')" title="L\u00f6schen" style="display:inline-flex;align-items:center;justify-content:center;gap:4px;min-height:40px;min-width:40px;padding:0 12px;font-size:12px;font-weight:600;background:#fef2f2;border:1px solid #fecaca;border-radius:8px;cursor:pointer;color:#dc2626">'+lucideIcon('trash-2',15)+' L\u00f6schen</button>';
        html+='</div></div>';
      }
      function renderGroup(posts,label,color){
        if(!posts.length)return;
        html+='<div style="font-size:10px;font-weight:700;color:'+color+';margin:6px 0 4px;text-transform:uppercase;letter-spacing:.5px">'+M.esc(label)+'</div>';
        posts.forEach(renderCard);
      }
      renderGroup(todayPosts,'Heute','#16a34a');
      renderGroup(tomorrowPosts,'Morgen','#2563eb');
      list.innerHTML=html;
      if(typeof lucide!=='undefined') lucide.createIcons({attrs:{class:'lucide-inline'},nameAttr:'data-lucide'});
      if(typeof window.socSyncDeskPosts==='function') window.socSyncDeskPosts();
    }).catch(function(){wrap.style.display='none';});
  };

  // --- Individual Meal Poster ---
  window.socialGenMealPoster=function(idx){
    var sel=socialGatherSelected();var mtItems=sel.filter(function(p){return p.kategorie==='Mittagessen';});var meal=mtItems[idx];if(!meal)return;
    var pName=meal.name||'';var imgUrl='';var _socMtBilder=M._socMtBilder();var _socialKatalog=M._socialKatalog();var _socFreeItems=M._socFreeItems();
    if(_socMtBilder[pName]&&_socMtBilder[pName].bild_url)imgUrl=_socMtBilder[pName].bild_url;if(!imgUrl&&meal.bild_url)imgUrl=meal.bild_url;if(!imgUrl){var katItem=_socialKatalog.find(function(k){return k.id===meal.id;});if(katItem&&katItem.bild_url)imgUrl=katItem.bild_url;}if(!imgUrl){var freeItem=_socFreeItems.find(function(f){return f.id===meal.id;});if(freeItem&&freeItem.bild_data)imgUrl=freeItem.bild_data;}
    var canvas=document.getElementById('soc-post-canvas');if(!canvas)return;var ctx=canvas.getContext('2d');var W=540,H=540,SCALE=2;canvas.width=W*SCALE;canvas.height=H*SCALE;ctx.setTransform(SCALE,0,0,SCALE,0,0);
    function drawMealPoster(foodImg){
      ctx.fillStyle='#faf5ef';ctx.fillRect(0,0,W,H);var imgAreaH=270;
      if(foodImg){var iw=foodImg.width,ih=foodImg.height;var scale=Math.max(W/iw,imgAreaH/ih);var dw=iw*scale,dh=ih*scale;var dx=(W-dw)/2,dy=(imgAreaH-dh)/2;ctx.save();ctx.beginPath();ctx.rect(0,0,W,imgAreaH);ctx.clip();ctx.drawImage(foodImg,dx,dy,dw,dh);var grad=ctx.createLinearGradient(0,imgAreaH-80,0,imgAreaH);grad.addColorStop(0,'rgba(250,245,239,0)');grad.addColorStop(1,'rgba(250,245,239,1)');ctx.fillStyle=grad;ctx.fillRect(0,imgAreaH-80,W,80);ctx.restore();}
      else{ctx.fillStyle='#e8dfd3';ctx.fillRect(0,0,W,imgAreaH);ctx.fillStyle='#c9b99a';ctx.font='48px "Segoe UI",system-ui,sans-serif';ctx.textAlign='center';ctx.fillText('\uD83C\uDF7D',W/2,imgAreaH/2+16);}
      ctx.fillStyle='rgba(255,255,255,0.92)';var logoW=180,logoH=46,logoX=W-logoW-10,logoY=10;ctx.beginPath();ctx.moveTo(logoX+8,logoY);ctx.lineTo(logoX+logoW-8,logoY);ctx.quadraticCurveTo(logoX+logoW,logoY,logoX+logoW,logoY+8);ctx.lineTo(logoX+logoW,logoY+logoH-8);ctx.quadraticCurveTo(logoX+logoW,logoY+logoH,logoX+logoW-8,logoY+logoH);ctx.lineTo(logoX+8,logoY+logoH);ctx.quadraticCurveTo(logoX,logoY+logoH,logoX,logoY+logoH-8);ctx.lineTo(logoX,logoY+8);ctx.quadraticCurveTo(logoX,logoY,logoX+8,logoY);ctx.closePath();ctx.fill();ctx.fillStyle='#2e7d32';ctx.font='bold 13px "Segoe UI",system-ui,sans-serif';ctx.textAlign='center';ctx.fillText('DORFLADEN',logoX+logoW/2,logoY+20);ctx.fillText('OBERORNAU',logoX+logoW/2,logoY+36);
      ctx.fillStyle='#6b8c42';ctx.font='11px "Segoe UI",system-ui,sans-serif';ctx.fillText('\uD83C\uDF3F FRISCH \u2022 REGIONAL \u2022 NACHHALTIG \uD83C\uDF3F',W/2,imgAreaH+16);
      var ty2=imgAreaH+50;ctx.fillStyle='#5b7a3a';ctx.font='italic bold 32px Georgia,"Times New Roman",serif';ctx.fillText('Mittagessen',W/2,ty2);
      var now=new Date();var days=['SONNTAG','MONTAG','DIENSTAG','MITTWOCH','DONNERSTAG','FREITAG','SAMSTAG'];ty2+=38;ctx.fillStyle='#374151';ctx.font='bold 22px "Segoe UI",system-ui,sans-serif';ctx.fillText(days[now.getDay()],W/2,ty2);
      ty2+=40;ctx.fillStyle='rgba(107,140,66,0.18)';ctx.beginPath();ctx.ellipse(W/2,ty2-10,90,18,0,0,Math.PI*2);ctx.fill();ctx.fillStyle='#2e7d32';ctx.font='bold 20px "Segoe UI",system-ui,sans-serif';ctx.fillText('Men\u00fc '+(idx+1),W/2,ty2);
      ty2+=36;ctx.fillStyle='#1f2937';ctx.font='15px "Segoe UI",system-ui,sans-serif';var nameLines=socialWrapText(ctx,meal.name,W-60);nameLines.forEach(function(line){ctx.fillText(line,W/2,ty2);ty2+=20;});
      if(meal.preis){ty2+=6;ctx.fillStyle='#6b7280';ctx.font='13px "Segoe UI",system-ui,sans-serif';ctx.fillText('\u20AC'+meal.preis,W/2,ty2);}
      canvas.scrollIntoView({behavior:'smooth',block:'nearest'});
      canvas.toBlob(function(blob){if(!blob)return;var url=URL.createObjectURL(blob);var a=document.createElement('a');a.href=url;a.download='mittagessen-menue-'+(idx+1)+'.png';document.body.appendChild(a);a.click();document.body.removeChild(a);setTimeout(function(){URL.revokeObjectURL(url);},2000);},'image/png');
    }
    if(imgUrl){socialStatus('soc-post-status','Lade Bild...',true);var img=new Image();img.crossOrigin='anonymous';img.onload=function(){drawMealPoster(img);socialStatus('soc-post-status','',true);};img.onerror=function(){drawMealPoster(null);};img.src=imgUrl;}else{drawMealPoster(null);}
  };

  // --- WA Katalog ---
  window.waKatalogLoad=function(){var list=document.getElementById('wa-katalog-list');var empty=document.getElementById('wa-katalog-empty');var loading=document.getElementById('wa-katalog-loading');if(list)list.innerHTML='';if(empty)empty.style.display='none';if(loading)loading.style.display='block';socialStatus('wa-katalog-status','Lade WhatsApp Katalog...',true);
    fetch(API+'/meta-catalog').then(function(r){return r.json();}).then(function(res){if(loading)loading.style.display='none';if(res.error){socialStatus('wa-katalog-status','\u274C '+res.error,false);return;}var products=res.products||[];if(!products.length){if(empty)empty.style.display='block';socialStatus('wa-katalog-status','Katalog ist leer.',true);return;}socialStatus('wa-katalog-status','\u2705 '+products.length+' Produkte geladen',true);
      var html='<table style="width:100%;border-collapse:collapse;font-size:13px"><thead><tr style="background:#f9fafb;text-align:left"><th style="padding:8px;border-bottom:2px solid #e5e7eb">Bild</th><th style="padding:8px;border-bottom:2px solid #e5e7eb">Name</th><th style="padding:8px;border-bottom:2px solid #e5e7eb">Preis</th><th style="padding:8px;border-bottom:2px solid #e5e7eb">Status</th><th style="padding:8px;border-bottom:2px solid #e5e7eb">Aktion</th></tr></thead><tbody>';
      products.forEach(function(p){var imgHtml=p.image_url?'<img src="'+p.image_url+'" style="width:50px;height:50px;object-fit:cover;border-radius:6px" onerror="this.src=\'\'">':'<span style="color:#9ca3af">&#128247;</span>';var priceStr=p.price?((parseInt(p.price)/100).toFixed(2)+' \u20AC'):'\u2013';var statusBadge=p.availability==='in stock'?'<span style="background:#dcfce7;color:#166534;padding:2px 8px;border-radius:10px;font-size:11px">Verf\u00FCgbar</span>':'<span style="background:#fef2f2;color:#991b1b;padding:2px 8px;border-radius:10px;font-size:11px">'+p.availability+'</span>';var rid=p.retailer_id||'';html+='<tr style="border-bottom:1px solid #f3f4f6"><td style="padding:8px">'+imgHtml+'</td><td style="padding:8px;font-weight:600">'+((p.name||'').replace(/</g,'&lt;'))+'</td><td style="padding:8px">'+priceStr+'</td><td style="padding:8px">'+statusBadge+'</td><td style="padding:8px"><button onclick="waKatalogDelete(\''+rid.replace(/'/g,"\\'")+'\')" style="padding:4px 10px;font-size:11px;background:#f3f4f6;border:1px solid #d1d5db;border-radius:6px;cursor:pointer">\u274C</button></td></tr>';});
      html+='</tbody></table>';if(list)list.innerHTML=html;}).catch(function(e){if(loading)loading.style.display='none';socialStatus('wa-katalog-status','\u274C '+e.message,false);});};
  window.waKatalogDelete=function(retailerId){dlConfirm({icon:'\uD83D\uDDD1\uFE0F',title:'Produkt l\u00F6schen?',msg:'"'+retailerId+'" wird aus dem Katalog entfernt.',ok:'L\u00F6schen',color:'#dc2626'},function(){socialStatus('wa-katalog-status','\u23F3 L\u00F6sche...',true);fetch(API+'/meta-catalog?retailer_id='+encodeURIComponent(retailerId),{method:'DELETE'}).then(function(r){return r.json();}).then(function(res){if(res.success){socialStatus('wa-katalog-status','\u2705 Gel\u00F6scht',true);waKatalogLoad();}else{socialStatus('wa-katalog-status','\u274C '+JSON.stringify(res.response||res),false);}}).catch(function(e){socialStatus('wa-katalog-status','\u274C '+e.message,false);});});};
  window.waKatalogDeleteAll=function(){dlConfirm({icon:'\u26A0\uFE0F',title:'Alle Produkte l\u00F6schen?',msg:'ALLE Produkte werden unwiderruflich entfernt.',ok:'Alle l\u00F6schen',color:'#dc2626'},function(){socialStatus('wa-katalog-status','\u23F3 Lade...',true);fetch(API+'/meta-catalog').then(function(r){return r.json();}).then(function(res){var products=res.products||[];if(!products.length){socialStatus('wa-katalog-status','Bereits leer.',true);return;}socialStatus('wa-katalog-status','\u23F3 L\u00F6sche '+products.length+'...',true);Promise.all(products.map(function(p){return fetch(API+'/meta-catalog?retailer_id='+encodeURIComponent(p.retailer_id||''),{method:'DELETE'}).then(function(r){return r.json();});})).then(function(results){var ok=results.filter(function(r){return r.success;}).length;socialStatus('wa-katalog-status','\u2705 '+ok+'/'+products.length+' gel\u00F6scht',ok===products.length);waKatalogLoad();});}).catch(function(e){socialStatus('wa-katalog-status','\u274C '+e.message,false);});});};
  window.waKatalogUpload=function(){socialStatus('wa-katalog-status','\u23F3 Lade heutige Mittagessen...',true);var todayMeals=M.socialGetTodayMeals();if(!todayMeals.length){socialStatus('wa-katalog-status','\u274C Keine Mittagessen f\u00FCr heute gefunden.',false);return;}var _socMtBilder=M._socMtBilder();
    M.socialLoadMtBilder(function(){var meals=todayMeals.map(function(m){var hasImg=!!(_socMtBilder[m.gericht]&&_socMtBilder[m.gericht].bild_url);return{gericht:m.gericht,preis:m.preis,has_image:hasImg};});socialStatus('wa-katalog-status','\u23F3 Sende '+meals.length+' Gerichte...',true);fetch(API+'/meta-catalog',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({meals:meals})}).then(function(r){return r.json();}).then(function(res){if(res.error){socialStatus('wa-katalog-status','\u274C '+res.error,false);return;}socialStatus('wa-katalog-status','\u2705 '+res.succeeded+'/'+res.total+' aktualisiert',res.failed===0);waKatalogLoad();}).catch(function(e){socialStatus('wa-katalog-status','\u274C '+e.message,false);});});};
  window.socialSyncMetaCatalog=function(){var selected=socialGatherSelected();var mtItems=selected.filter(function(p){return p.kategorie==='Mittagessen';});if(!mtItems.length){socialStatus('soc-post-status','Keine Mittagessen ausgew\u00e4hlt',false);return;}socialStatus('soc-post-status','\u23F3 Sende...',true);var _socMtBilder=M._socMtBilder();var meals=mtItems.map(function(m){return{gericht:m.name,preis:m.preis,has_image:!!(_socMtBilder[m.name]&&_socMtBilder[m.name].bild_url)};});fetch(API+'/meta-catalog',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({meals:meals})}).then(function(r){return r.json();}).then(function(res){if(res.error){socialStatus('soc-post-status','\u274C '+res.error,false);return;}socialStatus('soc-post-status','\u2705 '+res.succeeded+'/'+res.total+' aktualisiert',res.failed===0);}).catch(function(e){socialStatus('soc-post-status','\u274C '+e.message,false);});};

  // Expose socialLoadMtBilder on window for CMS wochenplan usage
  window.socialLoadMtBilder = M.socialLoadMtBilder || function(){};
})();
