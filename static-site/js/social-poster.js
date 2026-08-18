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

  function socialWrapText(ctx,text,maxW){var words=text.split(' '),lines=[],cur='';words.forEach(function(w){var test=cur?cur+' '+w:w;if(ctx.measureText(test).width>maxW){if(cur)lines.push(cur);cur=w;}else{cur=test;}});if(cur)lines.push(cur);return lines;}

  function socialDrawPoster(canvas,ctx,W,selected,titel,freitext,loadedImgs,SCALE){
    SCALE=SCALE||1;
    var PAD=16, GAP=12, CARD_R=16, CARD_PAD=14;
    var IMG_W=W-PAD*2, IMG_H=Math.round(IMG_W*0.55);
    var cats={};selected.forEach(function(p){var c=p.kategorie||'Sonstiges';if(!cats[c])cats[c]=[];cats[c].push(p);});
    var catKeys=Object.keys(cats);
    var catIcons={'Mittagessen':'\uD83C\uDF5D','Kuchen':'\uD83C\uDF70','Obst & Gemuese':'\uD83E\uDD66','Aufstriche':'\uD83E\uDD57'};
    var mc=document.createElement('canvas'),mx=mc.getContext('2d');
    var freitextLines=[];if(freitext){mx.font='15px "Segoe UI",system-ui,sans-serif';freitextLines=socialWrapText(mx,freitext,W-PAD*2-8);}
    var HEADER_H=92;var contentH=HEADER_H+(freitextLines.length?(10+freitextLines.length*20+6):8);var layout=[];
    catKeys.forEach(function(cat,ci){
      contentH+=ci===0?4:20;layout.push({type:'cat',cat:cat,y:contentH});contentH+=34;
      cats[cat].forEach(function(p){
        if(loadedImgs[p.id]){mx.font='bold 22px "Segoe UI",system-ui,sans-serif';var nl=socialWrapText(mx,p.name,IMG_W-CARD_PAD*2);if(nl.length>2)nl=nl.slice(0,2);var cardH=IMG_H+CARD_PAD+nl.length*28+(p.ab_uhr?28:0)+(p.preis?30:0)+CARD_PAD;layout.push({type:'card',p:p,y:contentH,hasImg:true,nl:nl,cardH:cardH});contentH+=cardH+GAP;}
        else{var cardH2=(p.ab_uhr?72:58);layout.push({type:'card',p:p,y:contentH,hasImg:false,cardH:cardH2});contentH+=cardH2+GAP;}
      });
    });
    contentH+=8;var H=Math.max(200,contentH);
    canvas.width=W*SCALE;canvas.height=H*SCALE;ctx.setTransform(SCALE,0,0,SCALE,0,0);
    ctx.fillStyle='#faf9f6';ctx.fillRect(0,0,W,H);
    var grad=ctx.createLinearGradient(0,0,W,HEADER_H);grad.addColorStop(0,'#2e7d4f');grad.addColorStop(1,'#245f3d');ctx.fillStyle=grad;ctx.fillRect(0,0,W,HEADER_H);
    ctx.fillStyle='#fff';ctx.textAlign='center';ctx.font='900 30px "Segoe UI",system-ui,sans-serif';ctx.fillText(titel||'Heute im Dorfladen',W/2,50);
    var now=new Date();var days=['Sonntag','Montag','Dienstag','Mittwoch','Donnerstag','Freitag','Samstag'];var months=['Januar','Februar','Maerz','April','Mai','Juni','Juli','August','September','Oktober','November','Dezember'];
    ctx.font='600 15px "Segoe UI",system-ui,sans-serif';ctx.fillStyle='rgba(255,255,255,0.92)';ctx.fillText(days[now.getDay()]+' \u00b7 '+now.getDate()+'. '+months[now.getMonth()],W/2,76);
    if(freitextLines.length){ctx.fillStyle='#374151';ctx.font='15px "Segoe UI",system-ui,sans-serif';ctx.textAlign='center';var fty=HEADER_H+24;freitextLines.forEach(function(line){ctx.fillText(line,W/2,fty);fty+=20;});}
    function roundRect(x,y,w,h,r){ctx.beginPath();ctx.moveTo(x+r,y);ctx.arcTo(x+w,y,x+w,y+h,r);ctx.arcTo(x+w,y+h,x,y+h,r);ctx.arcTo(x,y+h,x,y,r);ctx.arcTo(x,y,x+w,y,r);ctx.closePath();}
    function roundTop(x,y,w,h,r){ctx.beginPath();ctx.moveTo(x+r,y);ctx.lineTo(x+w-r,y);ctx.arcTo(x+w,y,x+w,y+r,r);ctx.lineTo(x+w,y+h);ctx.lineTo(x,y+h);ctx.lineTo(x,y+r);ctx.arcTo(x,y,x+r,y,r);ctx.closePath();}
    function drawCover(img,x,y,w,h){var iw=img.width,ih=img.height;var s=Math.max(w/iw,h/ih);var sw=w/s,sh=h/s;var sx=(iw-sw)/2,sy=(ih-sh)/2;ctx.drawImage(img,sx,sy,sw,sh,x,y,w,h);}
    function timeBadge(x,topY,time){var label='\u23F0 ab '+time+' Uhr';ctx.font='bold 13px "Segoe UI",system-ui,sans-serif';var tw=ctx.measureText(label).width;var padX=9,bh=23,bw=tw+padX*2;ctx.save();roundRect(x,topY,bw,bh,7);ctx.fillStyle='#fef2f2';ctx.fill();ctx.strokeStyle='#dc2626';ctx.lineWidth=1.5;ctx.stroke();ctx.fillStyle='#dc2626';ctx.textAlign='left';ctx.textBaseline='middle';ctx.fillText(label,x+padX,topY+bh/2+1);ctx.restore();ctx.textBaseline='alphabetic';}
    layout.forEach(function(it){
      if(it.type==='cat'){ctx.textAlign='left';ctx.fillStyle='#2e7d4f';ctx.font='900 18px "Segoe UI",system-ui,sans-serif';var label=(catIcons[it.cat]||'')+' '+it.cat;ctx.fillText(label,PAD,it.y+18);var tw=ctx.measureText(label).width;ctx.strokeStyle='rgba(46,125,79,0.25)';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(PAD+tw+12,it.y+13);ctx.lineTo(W-PAD,it.y+13);ctx.stroke();return;}
      var p=it.p,cx=PAD,cy=it.y,cw=IMG_W,ch=it.cardH;
      ctx.save();roundRect(cx,cy,cw,ch,CARD_R);ctx.fillStyle='#fff';ctx.fill();ctx.strokeStyle='#eee';ctx.lineWidth=1;ctx.stroke();ctx.restore();
      if(it.hasImg){
        ctx.save();roundTop(cx,cy,cw,IMG_H,CARD_R);ctx.clip();drawCover(loadedImgs[p.id],cx,cy,cw,IMG_H);ctx.restore();
        var tx=cx+CARD_PAD,tyy=cy+IMG_H+CARD_PAD;ctx.textAlign='left';ctx.fillStyle='#1f2937';ctx.font='bold 22px "Segoe UI",system-ui,sans-serif';
        it.nl.forEach(function(line){ctx.fillText(line,tx,tyy+20);tyy+=28;});
        if(p.ab_uhr){timeBadge(tx,tyy,p.ab_uhr);tyy+=28;}
        if(p.preis){ctx.fillStyle='#2e7d4f';ctx.font='900 24px "Segoe UI",system-ui,sans-serif';var dp=parseFloat(p.preis);ctx.fillText((dp&&isFinite(dp)?dp.toFixed(2):p.preis)+' \u20AC',tx,tyy+24);}
      } else {
        var tx2=cx+CARD_PAD,midY=cy+ch/2;ctx.textAlign='left';ctx.fillStyle='#1f2937';ctx.font='bold 19px "Segoe UI",system-ui,sans-serif';
        var nm=p.name,maxNameW=cw-CARD_PAD*2-90;while(ctx.measureText(nm).width>maxNameW&&nm.length>8)nm=nm.substring(0,nm.length-1);if(nm!==p.name)nm+='\u2026';
        ctx.fillText(nm,tx2,p.ab_uhr?midY-2:midY+7);
        if(p.ab_uhr){timeBadge(tx2,midY+3,p.ab_uhr);}
        if(p.preis){ctx.textAlign='right';ctx.fillStyle='#2e7d4f';ctx.font='900 21px "Segoe UI",system-ui,sans-serif';var dp2=parseFloat(p.preis);ctx.fillText((dp2&&isFinite(dp2)?dp2.toFixed(2):p.preis)+' \u20AC',cx+cw-CARD_PAD,midY+7);ctx.textAlign='left';}
      }
    });
    if(!selected.length){ctx.fillStyle='#9ca3af';ctx.font='italic 16px "Segoe UI",system-ui,sans-serif';ctx.textAlign='center';ctx.fillText('Bitte Produkte oben auswaehlen...',W/2,H/2);}
  }

  function socialDrawMealPosterAuto(canvas,ctx,W,mtItems,loadedImgs,SCALE){
    SCALE=SCALE||1;
    var PAD=16, GAP=14, CARD_R=16, CARD_PAD=14;
    var IMG_W=W-PAD*2, IMG_H=Math.round(IMG_W*0.58);
    var mc=document.createElement('canvas'),mx=mc.getContext('2d');
    var HEADER_H=118;var contentH=HEADER_H+6;var layout=[];
    mtItems.forEach(function(meal,idx){var hasImg=!!loadedImgs[meal.id];var heroH=hasImg?IMG_H:150;mx.font='bold 24px "Segoe UI",system-ui,sans-serif';var nl=socialWrapText(mx,meal.name,IMG_W-CARD_PAD*2);if(nl.length>3)nl=nl.slice(0,3);var cardH=heroH+CARD_PAD+26+nl.length*30+(meal.preis?32:0)+CARD_PAD;layout.push({meal:meal,idx:idx,hasImg:hasImg,nl:nl,cardH:cardH});contentH+=cardH+GAP;});
    contentH+=6;var H=Math.max(200,contentH);
    canvas.width=W*SCALE;canvas.height=H*SCALE;ctx=canvas.getContext('2d');ctx.setTransform(SCALE,0,0,SCALE,0,0);
    ctx.fillStyle='#faf5ef';ctx.fillRect(0,0,W,H);
    var ty=30;ctx.textAlign='center';ctx.fillStyle='#6b8c42';ctx.font='bold 12px "Segoe UI",system-ui,sans-serif';ctx.fillText('\uD83C\uDF3F FRISCH \u2022 REGIONAL \u2022 NACHHALTIG \uD83C\uDF3F',W/2,ty);
    ctx.fillStyle='#5b7a3a';ctx.font='italic bold 40px Georgia,"Times New Roman",serif';ctx.fillText('Mittagessen',W/2,ty+42);
    var now=new Date();var days=['SONNTAG','MONTAG','DIENSTAG','MITTWOCH','DONNERSTAG','FREITAG','SAMSTAG'];ctx.fillStyle='#374151';ctx.font='bold 22px "Segoe UI",system-ui,sans-serif';ctx.fillText(days[now.getDay()],W/2,ty+78);
    function roundRect(x,y,w,h,r){ctx.beginPath();ctx.moveTo(x+r,y);ctx.arcTo(x+w,y,x+w,y+h,r);ctx.arcTo(x+w,y+h,x,y+h,r);ctx.arcTo(x,y+h,x,y,r);ctx.arcTo(x,y,x+w,y,r);ctx.closePath();}
    function roundTop(x,y,w,h,r){ctx.beginPath();ctx.moveTo(x+r,y);ctx.lineTo(x+w-r,y);ctx.arcTo(x+w,y,x+w,y+r,r);ctx.lineTo(x+w,y+h);ctx.lineTo(x,y+h);ctx.lineTo(x,y+r);ctx.arcTo(x,y,x+r,y,r);ctx.closePath();}
    function drawCover(img,x,y,w,h){var iw=img.width,ih=img.height;var s=Math.max(w/iw,h/ih);var sw=w/s,sh=h/s;var sx=(iw-sw)/2,sy=(ih-sh)/2;ctx.drawImage(img,sx,sy,sw,sh,x,y,w,h);}
    var y=HEADER_H+6;
    layout.forEach(function(it){
      var meal=it.meal,cx=PAD,cy=y,cw=IMG_W,ch=it.cardH;
      ctx.save();roundRect(cx,cy,cw,ch,CARD_R);ctx.fillStyle='#fff';ctx.fill();ctx.strokeStyle='#efe7db';ctx.lineWidth=1;ctx.stroke();ctx.restore();
      var heroH=it.hasImg?IMG_H:150;
      var tyy=cy+CARD_PAD;
      if(it.hasImg){ctx.save();roundTop(cx,cy,cw,heroH,CARD_R);ctx.clip();drawCover(loadedImgs[meal.id],cx,cy,cw,heroH);ctx.restore();tyy=cy+heroH+CARD_PAD;}
      else{ctx.save();roundTop(cx,cy,cw,heroH,CARD_R);ctx.fillStyle='#f2efe8';ctx.fill();ctx.strokeStyle='#ebe5da';ctx.lineWidth=1;ctx.stroke();ctx.fillStyle='#c8b79b';ctx.font='56px "Segoe UI Emoji","Segoe UI Symbol","Segoe UI",system-ui,sans-serif';ctx.textAlign='center';ctx.fillText('🍽',W/2,cy+82);ctx.restore();tyy=cy+heroH+CARD_PAD;}
      ctx.textAlign='center';ctx.fillStyle='#2e7d32';ctx.font='900 15px "Segoe UI",system-ui,sans-serif';ctx.fillText('Men\u00fc '+(it.idx+1),W/2,tyy+16);tyy+=26;
      ctx.fillStyle='#1a1a1a';ctx.font='bold 24px "Segoe UI",system-ui,sans-serif';it.nl.forEach(function(line){ctx.fillText(line,W/2,tyy+22);tyy+=30;});
      if(meal.preis){var mp=parseFloat(meal.preis);ctx.fillStyle='#2e7d4f';ctx.font='900 24px "Segoe UI",system-ui,sans-serif';ctx.fillText((mp&&isFinite(mp)?mp.toFixed(2):meal.preis)+' \u20AC',W/2,tyy+24);}
      y+=ch+GAP;
    });
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
      if(hasMt&&hasOther){var tmpDaily=document.createElement('canvas');socialDrawPoster(tmpDaily,tmpDaily.getContext('2d'),W,otherItems,titel,freitext,loadedImgs,SCALE);var tmpMeal=document.createElement('canvas');socialDrawMealPosterAuto(tmpMeal,tmpMeal.getContext('2d'),W,mtItems,loadedImgs,SCALE);canvas.width=W*SCALE;canvas.height=tmpDaily.height+tmpMeal.height;ctx.drawImage(tmpDaily,0,0);ctx.drawImage(tmpMeal,0,tmpDaily.height);canvas.style.display='block';}
      else if(hasMt){canvas.style.display='block';socialDrawMealPosterAuto(canvas,canvas.getContext('2d'),W,mtItems,loadedImgs,SCALE);}
      else if(selected.length>0){canvas.style.display='block';socialDrawPoster(canvas,ctx,W,selected,titel,freitext,loadedImgs,SCALE);}
      else{canvas.style.display='none';}
      window._socLoadedImgs=loadedImgs;
    });
  };

  // --- WhatsApp message builder ---
  function socialBuildWhatsAppMsg(selected){
    var cats={};selected.forEach(function(p){var c=p.kategorie||'Sonstiges';if(!cats[c])cats[c]=[];cats[c].push(p);});
    var hasMittagessen=!!cats['Mittagessen'];var onlyMittagessen=hasMittagessen&&Object.keys(cats).length===1;
    var menuNr=['\u0031\uFE0F\u20E3','\u0032\uFE0F\u20E3','\u0033\uFE0F\u20E3','\u0034\uFE0F\u20E3','\u0035\uFE0F\u20E3'];
    if(onlyMittagessen||hasMittagessen){
      var msg='\uD83D\uDC49 *Mittagessen bestellen per Klick:*\n\n';
      var origin=window.location.origin||'';
      cats['Mittagessen'].forEach(function(p,i){var nr=menuNr[i]||'\u2022';var prStr=p.preis?(' \u2013 '+parseFloat(p.preis).toFixed(2)+'\u20AC'):'';var lnk=origin+'/mittagstisch-bestellen.html?gericht='+encodeURIComponent(p.name)+(p.preis?'&preis='+encodeURIComponent(p.preis):'');msg+=nr+' *'+p.name+'*'+prStr+'\n\uD83D\uDED2 '+lnk+'\n\n';});
      return msg.trim();
    }
    return '';
  }

  function socialIsMobile(){return /Android|iPhone|iPad|iPod|webOS|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);}
  function socialFallbackDownloadFiles(files){files.forEach(function(f){var url=URL.createObjectURL(f);var a=document.createElement('a');a.href=url;a.download=f.name;document.body.appendChild(a);a.click();document.body.removeChild(a);setTimeout(function(){URL.revokeObjectURL(url);},2000);});socialStatus('soc-post-status','\u2705 '+files.length+' Poster heruntergeladen',true);}
  function socialShareViaDownload(files,msg){socialFallbackDownloadFiles(files);setTimeout(function(){window.open('https://wa.me/?text='+encodeURIComponent(msg||''),'_blank');},500);}
  function socialShareViaClipboard(files,msg){var blob=files[0];if(navigator.clipboard&&navigator.clipboard.write&&typeof ClipboardItem!=='undefined'){try{var item=new ClipboardItem({'image/png':blob});navigator.clipboard.write([item]).then(function(){socialStatus('soc-post-status','\u2705 Poster in Zwischenablage!',true);}).catch(function(){socialShareViaDownload(files,msg);});}catch(e){socialShareViaDownload(files,msg);}}else{socialShareViaDownload(files,msg);}setTimeout(function(){window.open('https://wa.me/?text='+encodeURIComponent(msg||''),'_blank');},300);}
  function socialShareFiles(files,msg,hasMt){var canShareFiles=false;if(navigator.share&&navigator.canShare){try{canShareFiles=navigator.canShare({files:files});}catch(e){}}if(canShareFiles){if(msg){try{navigator.clipboard.writeText(msg);}catch(e){}}navigator.share({files:files.length>1?[files[0]]:files}).then(function(){socialStatus('soc-post-status','\u2705 Poster geteilt!',true);}).catch(function(err){if(err.name==='AbortError')return;socialShareViaClipboard(files,msg);});socialStatus('soc-post-status','Poster wird geteilt...',true);return;}if(socialIsMobile()){socialShareViaClipboard(files,msg);return;}if(msg){try{navigator.clipboard.writeText(msg);}catch(e){}socialStatus('soc-post-status','\uD83D\uDCCB Bestelltext kopiert!',true);}socialFallbackDownloadFiles(files);}

  function canvasToFiles(canvases,selected,titel,freitext){
    var files=[];
    canvases.forEach(function(c){
      var dataUrl;try{dataUrl=c.canvas.toDataURL('image/png');}catch(e){var cc=document.createElement('canvas');var cx=cc.getContext('2d');var mtI=selected.filter(function(p){return p.kategorie==='Mittagessen';});var otherI=selected.filter(function(p){return p.kategorie!=='Mittagessen';});if(mtI.length>0&&otherI.length>0){var tD=document.createElement('canvas');socialDrawPoster(tD,tD.getContext('2d'),600,otherI,titel,freitext,{},2);var tM=document.createElement('canvas');socialDrawMealPosterAuto(tM,tM.getContext('2d'),600,mtI,{},2);cc.width=1200;cc.height=tD.height+tM.height;cx.drawImage(tD,0,0);cx.drawImage(tM,0,tD.height);}else if(mtI.length>0){socialDrawMealPosterAuto(cc,cx,600,mtI,{},2);}else{socialDrawPoster(cc,cx,600,otherI,titel,freitext,{},2);}dataUrl=cc.toDataURL('image/png');}
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
    if(!canvases.length){var mtI=selected.filter(function(p){return p.kategorie==='Mittagessen';});var otherI=selected.filter(function(p){return p.kategorie!=='Mittagessen';});var fc=document.createElement('canvas');var fx=fc.getContext('2d');if(mtI.length>0&&otherI.length>0){var tD=document.createElement('canvas');socialDrawPoster(tD,tD.getContext('2d'),600,otherI,titel,freitext,{},2);var tM=document.createElement('canvas');socialDrawMealPosterAuto(tM,tM.getContext('2d'),600,mtI,{},2);fc.width=1200;fc.height=tD.height+tM.height;fx.drawImage(tD,0,0);fx.drawImage(tM,0,tD.height);}else if(mtI.length>0){socialDrawMealPosterAuto(fc,fx,600,mtI,{},2);}else{socialDrawPoster(fc,fx,600,otherI,titel,freitext,{},2);}canvases.push({canvas:fc,name:'dorfladen-post.png'});}
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

  // --- Save post ---
  function socialSavePost(titel,freitext,items){fetch(API+'/social-post',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({titel:titel,freitext:freitext,items:items.map(function(p){return{id:p.id,name:p.name,kategorie:p.kategorie,preis:p.preis};})})}).catch(function(){});}

  // --- Verlauf ---
  window._socialVerlaufLoaded=false;
  function socialLoadVerlauf(){
    var list=document.getElementById('social-verlauf-list');if(!list)return;list.innerHTML='<p style="color:#9ca3af;font-size:12px">Laden...</p>';
    fetch(API+'/social-post').then(function(r){return r.json();}).then(function(res){window._socialVerlaufLoaded=true;var posts=res.items||[];if(!posts.length){list.innerHTML='<p style="color:#9ca3af;font-size:12px;font-style:italic">Noch keine Posts erstellt.</p>';return;}
      var html='';posts.forEach(function(p){html+='<div style="padding:8px 10px;border-bottom:1px solid #f3f4f6"><div style="font-weight:600;font-size:13px">'+M.esc(p.titel||'Post')+'</div><div style="font-size:11px;color:#6b7280">'+M.esc(p.datum||'')+(p.items?' \u2022 '+p.items.length+' Produkte':'')+'</div></div>';});
      list.innerHTML=html;
    }).catch(function(e){list.innerHTML='<p style="color:#dc2626;font-size:12px">Fehler: '+M.esc(e.message)+'</p>';});
  }

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
  window.waKatalogDelete=function(retailerId){if(!confirm('Produkt "'+retailerId+'" l\u00F6schen?'))return;socialStatus('wa-katalog-status','\u23F3 L\u00F6sche...',true);fetch(API+'/meta-catalog?retailer_id='+encodeURIComponent(retailerId),{method:'DELETE'}).then(function(r){return r.json();}).then(function(res){if(res.success){socialStatus('wa-katalog-status','\u2705 Gel\u00F6scht',true);waKatalogLoad();}else{socialStatus('wa-katalog-status','\u274C '+JSON.stringify(res.response||res),false);}}).catch(function(e){socialStatus('wa-katalog-status','\u274C '+e.message,false);});};
  window.waKatalogDeleteAll=function(){if(!confirm('ALLE Produkte l\u00F6schen?'))return;socialStatus('wa-katalog-status','\u23F3 Lade...',true);fetch(API+'/meta-catalog').then(function(r){return r.json();}).then(function(res){var products=res.products||[];if(!products.length){socialStatus('wa-katalog-status','Bereits leer.',true);return;}socialStatus('wa-katalog-status','\u23F3 L\u00F6sche '+products.length+'...',true);Promise.all(products.map(function(p){return fetch(API+'/meta-catalog?retailer_id='+encodeURIComponent(p.retailer_id||''),{method:'DELETE'}).then(function(r){return r.json();});})).then(function(results){var ok=results.filter(function(r){return r.success;}).length;socialStatus('wa-katalog-status','\u2705 '+ok+'/'+products.length+' gel\u00F6scht',ok===products.length);waKatalogLoad();});}).catch(function(e){socialStatus('wa-katalog-status','\u274C '+e.message,false);});};
  window.waKatalogUpload=function(){socialStatus('wa-katalog-status','\u23F3 Lade heutige Mittagessen...',true);var todayMeals=M.socialGetTodayMeals();if(!todayMeals.length){socialStatus('wa-katalog-status','\u274C Keine Mittagessen f\u00FCr heute gefunden.',false);return;}var _socMtBilder=M._socMtBilder();
    M.socialLoadMtBilder(function(){var meals=todayMeals.map(function(m){var hasImg=!!(_socMtBilder[m.gericht]&&_socMtBilder[m.gericht].bild_url);return{gericht:m.gericht,preis:m.preis,has_image:hasImg};});socialStatus('wa-katalog-status','\u23F3 Sende '+meals.length+' Gerichte...',true);fetch(API+'/meta-catalog',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({meals:meals})}).then(function(r){return r.json();}).then(function(res){if(res.error){socialStatus('wa-katalog-status','\u274C '+res.error,false);return;}socialStatus('wa-katalog-status','\u2705 '+res.succeeded+'/'+res.total+' aktualisiert',res.failed===0);waKatalogLoad();}).catch(function(e){socialStatus('wa-katalog-status','\u274C '+e.message,false);});});};
  window.socialSyncMetaCatalog=function(){var selected=socialGatherSelected();var mtItems=selected.filter(function(p){return p.kategorie==='Mittagessen';});if(!mtItems.length){socialStatus('soc-post-status','Keine Mittagessen ausgew\u00e4hlt',false);return;}socialStatus('soc-post-status','\u23F3 Sende...',true);var _socMtBilder=M._socMtBilder();var meals=mtItems.map(function(m){return{gericht:m.name,preis:m.preis,has_image:!!(_socMtBilder[m.name]&&_socMtBilder[m.name].bild_url)};});fetch(API+'/meta-catalog',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({meals:meals})}).then(function(r){return r.json();}).then(function(res){if(res.error){socialStatus('soc-post-status','\u274C '+res.error,false);return;}socialStatus('soc-post-status','\u2705 '+res.succeeded+'/'+res.total+' aktualisiert',res.failed===0);}).catch(function(e){socialStatus('soc-post-status','\u274C '+e.message,false);});};

  // Expose socialLoadMtBilder on window for CMS wochenplan usage
  window.socialLoadMtBilder = M.socialLoadMtBilder || function(){};
})();
