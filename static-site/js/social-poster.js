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
    var hasAnyImg=Object.keys(loadedImgs).filter(function(k){return k!=='_tainted';}).length>0;
    var IMG_SIZE=hasAnyImg?48:0;
    var ITEM_H=hasAnyImg?Math.max(54,22):22;
    var cats={};selected.forEach(function(p){var c=p.kategorie||'Sonstiges';if(!cats[c])cats[c]=[];cats[c].push(p);});
    var catKeys=Object.keys(cats);
    // Canvas cannot render SVG/Lucide – use emoji fallbacks (allowed per conventions §3 for print/poster)
    var _iconToEmoji={'utensils':'\uD83C\uDF5D','cake-slice':'\uD83C\uDF70','apple':'\uD83C\uDF4E','jar':'\uD83E\uDD57','salad':'\uD83E\uDD57','coffee':'\u2615','beef':'\uD83E\uDD69','fish':'\uD83D\uDC1F','pizza':'\uD83C\uDF55','sandwich':'\uD83E\uDD6A','cookie':'\uD83C\uDF6A','ice-cream-cone':'\uD83C\uDF66','wine':'\uD83C\uDF77','beer':'\uD83C\uDF7A','cherry':'\uD83C\uDF52','grape':'\uD83C\uDF47','carrot':'\uD83E\uDD55','wheat':'\uD83C\uDF3E','leaf':'\uD83C\uDF3F','tag':'\uD83C\uDFF7\uFE0F'};
    var catIcons={};
    var kats=window._socKategorien_ref?window._socKategorien_ref():[];
    kats.forEach(function(k){catIcons[k.name]=_iconToEmoji[k.icon]||'';});
    if(!catIcons['Mittagessen'])catIcons['Mittagessen']='\uD83C\uDF5D';
    if(!catIcons['Kuchen'])catIcons['Kuchen']='\uD83C\uDF70';
    var freitextLines=[];
    if(freitext){ctx.font='14px "Segoe UI",system-ui,sans-serif';freitextLines=socialWrapText(ctx,freitext,W-60);}
    var contentH=100;contentH+=freitextLines.length*18+(freitext?8:0);
    catKeys.forEach(function(cat,ci){contentH+=ci===0?4:20;contentH+=28;cats[cat].forEach(function(p){contentH+=p.ab_uhr?Math.max(ITEM_H,38):ITEM_H;});});
    contentH+=20;var H=Math.max(160,contentH);
    canvas.width=W*SCALE;canvas.height=H*SCALE;ctx.setTransform(SCALE,0,0,SCALE,0,0);
    ctx.fillStyle='#faf9f6';ctx.fillRect(0,0,W,H);
    ctx.fillStyle='#2e7d32';ctx.fillRect(0,0,W,60);
    ctx.fillStyle='#fff';ctx.font='bold 22px "Segoe UI",system-ui,sans-serif';ctx.textAlign='center';ctx.fillText(titel||'Heute im Dorfladen',W/2,40);
    var now=new Date();var days=['Sonntag','Montag','Dienstag','Mittwoch','Donnerstag','Freitag','Samstag'];
    var dateStr=days[now.getDay()]+', '+now.getDate()+'.'+(now.getMonth()+1)+'.'+now.getFullYear();
    ctx.fillStyle='#6b7280';ctx.font='13px "Segoe UI",system-ui,sans-serif';ctx.fillText(dateStr,W/2,80);
    var y=100;
    if(freitextLines.length){ctx.fillStyle='#374151';ctx.font='14px "Segoe UI",system-ui,sans-serif';ctx.textAlign='center';freitextLines.forEach(function(line){ctx.fillText(line,W/2,y);y+=18;});y+=8;}
    ctx.textAlign='left';
    catKeys.forEach(function(cat,ci){
      y+=ci===0?4:20;ctx.fillStyle='#e1306c';ctx.font='bold 16px "Segoe UI",system-ui,sans-serif';ctx.fillText((catIcons[cat]||'')+' '+cat,24,y);y+=6;ctx.strokeStyle='#e1306c';ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(24,y);ctx.lineTo(W-24,y);ctx.stroke();y+=12;
      cats[cat].forEach(function(p){
        var itemImg=loadedImgs[p.id];var textX=28;var textY=y;
        if(hasAnyImg){
          if(itemImg){var ix=28,iy=y-4;ctx.save();ctx.beginPath();ctx.moveTo(ix+4,iy);ctx.lineTo(ix+IMG_SIZE-4,iy);ctx.quadraticCurveTo(ix+IMG_SIZE,iy,ix+IMG_SIZE,iy+4);ctx.lineTo(ix+IMG_SIZE,iy+IMG_SIZE-4);ctx.quadraticCurveTo(ix+IMG_SIZE,iy+IMG_SIZE,ix+IMG_SIZE-4,iy+IMG_SIZE);ctx.lineTo(ix+4,iy+IMG_SIZE);ctx.quadraticCurveTo(ix,iy+IMG_SIZE,ix,iy+IMG_SIZE-4);ctx.lineTo(ix,iy+4);ctx.quadraticCurveTo(ix,iy,ix+4,iy);ctx.closePath();ctx.clip();ctx.drawImage(itemImg,ix,iy,IMG_SIZE,IMG_SIZE);ctx.restore();ctx.strokeStyle='#e5e7eb';ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(ix+4,iy);ctx.lineTo(ix+IMG_SIZE-4,iy);ctx.quadraticCurveTo(ix+IMG_SIZE,iy,ix+IMG_SIZE,iy+4);ctx.lineTo(ix+IMG_SIZE,iy+IMG_SIZE-4);ctx.quadraticCurveTo(ix+IMG_SIZE,iy+IMG_SIZE,ix+IMG_SIZE-4,iy+IMG_SIZE);ctx.lineTo(ix+4,iy+IMG_SIZE);ctx.quadraticCurveTo(ix,iy+IMG_SIZE,ix,iy+IMG_SIZE-4);ctx.lineTo(ix,iy+4);ctx.quadraticCurveTo(ix,iy,ix+4,iy);ctx.closePath();ctx.stroke();}
          textX=28+IMG_SIZE+10;textY=y+IMG_SIZE/2-6;
        }
        ctx.fillStyle='#1f2937';ctx.font='14px "Segoe UI",system-ui,sans-serif';var maxNameW=W-textX-80;var dispName=p.name;while(ctx.measureText(dispName).width>maxNameW&&dispName.length>10)dispName=dispName.substring(0,dispName.length-1);if(dispName!==p.name)dispName+='\u2026';ctx.fillText(dispName,textX,textY+14);
        if(p.ab_uhr){ctx.fillStyle='#9ca3af';ctx.font='italic 11px "Segoe UI",system-ui,sans-serif';ctx.fillText('ab '+p.ab_uhr,textX,textY+28);}
        if(p.preis){ctx.fillStyle='#2e7d32';ctx.font='bold 14px "Segoe UI",system-ui,sans-serif';ctx.textAlign='right';var dp=parseFloat(p.preis);ctx.fillText((dp&&isFinite(dp)?dp.toFixed(2):p.preis)+' \u20AC',W-28,textY+14);ctx.textAlign='left';}
        y+=p.ab_uhr?Math.max(ITEM_H,38):ITEM_H;
      });y+=10;
    });
    if(!selected.length){ctx.fillStyle='#9ca3af';ctx.font='italic 14px "Segoe UI",system-ui,sans-serif';ctx.textAlign='center';ctx.fillText('Bitte Produkte oben auswaehlen...',W/2,H/2);}
  }

  function socialDrawMealPosterAuto(canvas,ctx,W,mtItems,loadedImgs,SCALE){
    SCALE=SCALE||1;var tmpC=document.createElement('canvas');tmpC.width=W;tmpC.height=10;var tmpX=tmpC.getContext('2d');
    var calcH=24+28+32+30;tmpX.font='bold 18px "Segoe UI",system-ui,sans-serif';
    mtItems.forEach(function(meal){calcH+=22;var nl=socialWrapText(tmpX,meal.name,W-50);calcH+=nl.length*22;calcH+=meal.preis?20:8;calcH+=6;});calcH+=10;
    canvas.width=W*SCALE;canvas.height=calcH*SCALE;ctx=canvas.getContext('2d');ctx.setTransform(SCALE,0,0,SCALE,0,0);
    ctx.fillStyle='#faf5ef';ctx.fillRect(0,0,W,calcH);
    var ty=24;ctx.textAlign='center';ctx.fillStyle='#6b8c42';ctx.font='10px "Segoe UI",system-ui,sans-serif';ctx.fillText('\uD83C\uDF3F FRISCH \u2022 REGIONAL \u2022 NACHHALTIG \uD83C\uDF3F',W/2,ty);
    ty+=28;ctx.fillStyle='#5b7a3a';ctx.font='italic bold 30px Georgia,"Times New Roman",serif';ctx.fillText('Mittagessen',W/2,ty);
    var now=new Date();var days=['SONNTAG','MONTAG','DIENSTAG','MITTWOCH','DONNERSTAG','FREITAG','SAMSTAG'];ty+=32;ctx.fillStyle='#374151';ctx.font='bold 20px "Segoe UI",system-ui,sans-serif';ctx.fillText(days[now.getDay()],W/2,ty);
    ty+=30;mtItems.forEach(function(meal,idx){ctx.fillStyle='rgba(107,140,66,0.18)';ctx.beginPath();ctx.ellipse(W/2,ty-6,70,16,0,0,Math.PI*2);ctx.fill();ctx.fillStyle='#2e7d32';ctx.font='bold 15px "Segoe UI",system-ui,sans-serif';ctx.textAlign='center';ctx.fillText('Men\u00fc '+(idx+1),W/2,ty);ty+=22;ctx.fillStyle='#1a1a1a';ctx.font='bold 18px "Segoe UI",system-ui,sans-serif';var nameLines=socialWrapText(ctx,meal.name,W-50);nameLines.forEach(function(line){ctx.fillText(line,W/2,ty);ty+=22;});if(meal.preis){var mp=parseFloat(meal.preis);ctx.fillStyle='#6b7280';ctx.font='12px "Segoe UI",system-ui,sans-serif';ctx.fillText((mp&&isFinite(mp)?mp.toFixed(2):meal.preis)+' \u20AC',W/2,ty);ty+=20;}else{ty+=8;}ty+=6;});
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
  function socialShareFiles(files,msg,hasMt){var canShareFiles=false;if(navigator.share&&navigator.canShare){try{canShareFiles=navigator.canShare({files:files});}catch(e){}}if(canShareFiles){var shareData={files:files.length>1?[files[0]]:files};if(msg)shareData.text=msg;navigator.share(shareData).then(function(){socialStatus('soc-post-status','\u2705 Poster geteilt!',true);}).catch(function(err){if(err.name==='AbortError')return;socialShareViaClipboard(files,msg);});socialStatus('soc-post-status','Poster wird geteilt...',true);return;}if(socialIsMobile()){socialShareViaClipboard(files,msg);return;}if(msg){try{navigator.clipboard.writeText(msg);}catch(e){}socialStatus('soc-post-status','\uD83D\uDCCB Bestelltext kopiert!',true);}socialFallbackDownloadFiles(files);}

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

  // --- Ziel-Datum berechnen (heute oder morgen) ---
  function socialGetZielDatum(){
    if(window._socSelectedDay==='morgen'){
      var d=new Date(Date.now()+86400000);
      return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');
    }
    return '';
  }

  // --- Save post ---
  function socialSavePost(titel,freitext,items){var body={titel:titel,freitext:freitext,items:items.map(function(p){var o={id:p.id,name:p.name,kategorie:p.kategorie,preis:p.preis};if(p.bild_url)o.bild_url=p.bild_url;return o;})};var zd=socialGetZielDatum();if(zd)body.ziel_datum=zd;fetch(API+'/social-post',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)}).catch(function(){});}

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
    var body={titel:titel,freitext:freitext,items:selected.map(function(p){var o={id:p.id,name:p.name,kategorie:p.kategorie,preis:p.preis};if(p.bild_url)o.bild_url=p.bild_url;return o;})};var zd=socialGetZielDatum();if(zd)body.ziel_datum=zd;
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

  // --- Geplante Posts laden (heute + morgen) ---
  window.socialLoadTodayPosts=function(){
    var wrap=document.getElementById('soc-today-posts');
    var list=document.getElementById('soc-today-posts-list');
    if(!wrap||!list)return;
    var today=new Date();var td=today.getFullYear()+'-'+String(today.getMonth()+1).padStart(2,'0')+'-'+String(today.getDate()).padStart(2,'0');
    var tom=new Date(Date.now()+86400000);var tmr=tom.getFullYear()+'-'+String(tom.getMonth()+1).padStart(2,'0')+'-'+String(tom.getDate()).padStart(2,'0');
    fetch(API+'/social-post').then(function(r){return r.json();}).then(function(res){
      var all=res.items||[];
      var todayPosts=all.filter(function(p){return p.datum&&p.datum.substring(0,10)===td;});
      var tomorrowPosts=all.filter(function(p){return p.datum&&p.datum.substring(0,10)===tmr;});
      if(!todayPosts.length&&!tomorrowPosts.length){wrap.style.display='none';return;}
      wrap.style.display='';
      var html='';
      function renderGroup(posts,label,color){
        if(!posts.length)return;
        html+='<div style="font-size:10px;font-weight:700;color:'+color+';margin:6px 0 2px;text-transform:uppercase">'+M.esc(label)+'</div>';
        posts.forEach(function(p){
          var cnt=p.items?p.items.length:0;
          html+='<div style="padding:3px 0;font-size:12px;display:flex;justify-content:space-between;align-items:center">';
          html+='<span style="font-weight:600;color:#374151">'+M.esc(p.titel||'Post')+'</span>';
          html+='<span style="color:#6b7280">'+cnt+' Produkt'+(cnt!==1?'e':'')+'</span>';
          html+='</div>';
        });
      }
      renderGroup(todayPosts,'Heute','#16a34a');
      renderGroup(tomorrowPosts,'Morgen','#2563eb');
      list.innerHTML=html;
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
  window.waKatalogDelete=function(retailerId){if(!confirm('Produkt "'+retailerId+'" l\u00F6schen?'))return;socialStatus('wa-katalog-status','\u23F3 L\u00F6sche...',true);fetch(API+'/meta-catalog?retailer_id='+encodeURIComponent(retailerId),{method:'DELETE'}).then(function(r){return r.json();}).then(function(res){if(res.success){socialStatus('wa-katalog-status','\u2705 Gel\u00F6scht',true);waKatalogLoad();}else{socialStatus('wa-katalog-status','\u274C '+JSON.stringify(res.response||res),false);}}).catch(function(e){socialStatus('wa-katalog-status','\u274C '+e.message,false);});};
  window.waKatalogDeleteAll=function(){if(!confirm('ALLE Produkte l\u00F6schen?'))return;socialStatus('wa-katalog-status','\u23F3 Lade...',true);fetch(API+'/meta-catalog').then(function(r){return r.json();}).then(function(res){var products=res.products||[];if(!products.length){socialStatus('wa-katalog-status','Bereits leer.',true);return;}socialStatus('wa-katalog-status','\u23F3 L\u00F6sche '+products.length+'...',true);Promise.all(products.map(function(p){return fetch(API+'/meta-catalog?retailer_id='+encodeURIComponent(p.retailer_id||''),{method:'DELETE'}).then(function(r){return r.json();});})).then(function(results){var ok=results.filter(function(r){return r.success;}).length;socialStatus('wa-katalog-status','\u2705 '+ok+'/'+products.length+' gel\u00F6scht',ok===products.length);waKatalogLoad();});}).catch(function(e){socialStatus('wa-katalog-status','\u274C '+e.message,false);});};
  window.waKatalogUpload=function(){socialStatus('wa-katalog-status','\u23F3 Lade heutige Mittagessen...',true);var todayMeals=M.socialGetTodayMeals();if(!todayMeals.length){socialStatus('wa-katalog-status','\u274C Keine Mittagessen f\u00FCr heute gefunden.',false);return;}var _socMtBilder=M._socMtBilder();
    M.socialLoadMtBilder(function(){var meals=todayMeals.map(function(m){var hasImg=!!(_socMtBilder[m.gericht]&&_socMtBilder[m.gericht].bild_url);return{gericht:m.gericht,preis:m.preis,has_image:hasImg};});socialStatus('wa-katalog-status','\u23F3 Sende '+meals.length+' Gerichte...',true);fetch(API+'/meta-catalog',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({meals:meals})}).then(function(r){return r.json();}).then(function(res){if(res.error){socialStatus('wa-katalog-status','\u274C '+res.error,false);return;}socialStatus('wa-katalog-status','\u2705 '+res.succeeded+'/'+res.total+' aktualisiert',res.failed===0);waKatalogLoad();}).catch(function(e){socialStatus('wa-katalog-status','\u274C '+e.message,false);});});};
  window.socialSyncMetaCatalog=function(){var selected=socialGatherSelected();var mtItems=selected.filter(function(p){return p.kategorie==='Mittagessen';});if(!mtItems.length){socialStatus('soc-post-status','Keine Mittagessen ausgew\u00e4hlt',false);return;}socialStatus('soc-post-status','\u23F3 Sende...',true);var _socMtBilder=M._socMtBilder();var meals=mtItems.map(function(m){return{gericht:m.name,preis:m.preis,has_image:!!(_socMtBilder[m.name]&&_socMtBilder[m.name].bild_url)};});fetch(API+'/meta-catalog',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({meals:meals})}).then(function(r){return r.json();}).then(function(res){if(res.error){socialStatus('soc-post-status','\u274C '+res.error,false);return;}socialStatus('soc-post-status','\u2705 '+res.succeeded+'/'+res.total+' aktualisiert',res.failed===0);}).catch(function(e){socialStatus('soc-post-status','\u274C '+e.message,false);});};

  // Expose socialLoadMtBilder on window for CMS wochenplan usage
  window.socialLoadMtBilder = M.socialLoadMtBilder || function(){};
})();
