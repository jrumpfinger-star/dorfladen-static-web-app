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

  // Teller-Icon fuer Mittagessen-Menues (Poster-Platzhalter, wenn kein Foto)
  var _socMealIcon=new Image();
  _socMealIcon.src='/images/mittagessen-icon.png';
  function _socMealIconReady(){return _socMealIcon.complete&&_socMealIcon.naturalWidth>0;}
  var _socMealIconPromise=new Promise(function(res){
    if(_socMealIcon.complete){res();return;}
    _socMealIcon.onload=function(){res();};_socMealIcon.onerror=function(){res();};
  });

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
  // Umbruch inkl. hartem Trennen zu langer Einzelwoerter (die sonst ueberlaufen)
  function socialWrapHard(ctx,text,maxW){
    var words=(text||'').trim().split(/\s+/),lines=[],cur='';
    words.forEach(function(w){
      if(ctx.measureText(w).width>maxW){
        if(cur){lines.push(cur);cur='';}
        var piece='';
        for(var k=0;k<w.length;k++){var t=piece+w[k];if(ctx.measureText(t).width>maxW&&piece){lines.push(piece);piece=w[k];}else{piece=t;}}
        cur=piece;
      }else{
        var test=cur?cur+' '+w:w;
        if(ctx.measureText(test).width>maxW){if(cur)lines.push(cur);cur=w;}else{cur=test;}
      }
    });
    if(cur)lines.push(cur);
    return lines.length?lines:[''];
  }
  // Waehlt die groesste Schrift, bei der der Name in <=maxLines passt (sonst kuerzt).
  function socialFitName(ctx,text,maxW,maxLines,sizes,weight){
    weight=weight||'700';
    for(var i=0;i<sizes.length;i++){
      ctx.font=weight+' '+sizes[i]+'px "Segoe UI",system-ui,sans-serif';
      var lines=socialWrapHard(ctx,text,maxW);
      if(lines.length<=maxLines)return {lines:lines,size:sizes[i]};
    }
    var last=sizes[sizes.length-1];ctx.font=weight+' '+last+'px "Segoe UI",system-ui,sans-serif';
    var ls=socialWrapHard(ctx,text,maxW);
    if(ls.length>maxLines){ls=ls.slice(0,maxLines);var l=ls[maxLines-1];while(ctx.measureText(l+'\u2026').width>maxW&&l.length>1)l=l.slice(0,-1);ls[maxLines-1]=l+'\u2026';}
    return {lines:ls,size:last};
  }

  // Ziel-Datum des Posters: heute, oder MORGEN wenn im Wizard "Morgen" gewaehlt ist.
  // Damit stimmen Wochentag/Datum im Poster mit dem tatsaechlichen Post-Tag ueberein
  // (z.B. "Morgen im Dorfladen - Mittwoch" -> Datumszeile/Kategorie zeigen Mittwoch).
  function socialPosterDate(){var d=new Date();if(window._socSelectedDay==='morgen'){d=new Date(d.getTime()+86400000);}return d;}

  function socialDrawPoster(canvas,ctx,W,selected,titel,freitext,loadedImgs,SCALE,hideFooter,hideHeader){
    SCALE=SCALE||1;
    var PAD=16, GAP=12, CARD_R=16, CARD_PAD=14;
    var IMG_W=W-PAD*2, IMG_H=Math.round(IMG_W*0.55);
    var cats={};selected.forEach(function(p){var c=p.kategorie||'Sonstiges';if(!cats[c])cats[c]=[];cats[c].push(p);});
    var catKeys=Object.keys(cats);
    var catIcons={'Mittagessen':'\uD83C\uDF5D','Kuchen':'\uD83C\uDF70','Obst & Gemuese':'\uD83E\uDD66','Aufstriche':'\uD83E\uDD57'};
    var mc=document.createElement('canvas'),mx=mc.getContext('2d');
    var freitextLines=[];if(freitext&&!hideHeader){mx.font='15px "Segoe UI",system-ui,sans-serif';freitextLines=socialWrapText(mx,freitext,W-PAD*2-8);}
    var HEADER_H=hideHeader?8:92;var contentH=HEADER_H+(freitextLines.length?(10+freitextLines.length*20+6):8);var layout=[];
    catKeys.forEach(function(cat,ci){
      contentH+=ci===0?4:20;layout.push({type:'cat',cat:cat,y:contentH});contentH+=34;
      cats[cat].forEach(function(p){
        if(loadedImgs[p.id]){mx.font='bold 30px "Segoe UI",system-ui,sans-serif';var nl=socialWrapText(mx,p.name,IMG_W-CARD_PAD*2);if(nl.length>2)nl=nl.slice(0,2);var cardH=IMG_H+CARD_PAD+nl.length*38+(p.ab_uhr?28:0)+(p.preis?40:0)+CARD_PAD;layout.push({type:'card',p:p,y:contentH,hasImg:true,nl:nl,cardH:cardH});contentH+=cardH+GAP;}
        else{var cardH2=(p.ab_uhr?80:66);layout.push({type:'card',p:p,y:contentH,hasImg:false,cardH:cardH2});contentH+=cardH2+GAP;}
      });
    });
    contentH+=8;var H=Math.max(200,contentH);
    canvas.width=W*SCALE;canvas.height=H*SCALE;ctx.setTransform(SCALE,0,0,SCALE,0,0);
    ctx.fillStyle='#faf9f6';ctx.fillRect(0,0,W,H);
    if(!hideHeader){
    var grad=ctx.createLinearGradient(0,0,W,HEADER_H);grad.addColorStop(0,'#2e7d4f');grad.addColorStop(1,'#245f3d');ctx.fillStyle=grad;ctx.fillRect(0,0,W,HEADER_H);
    ctx.fillStyle='#fff';ctx.textAlign='center';ctx.font='900 30px "Segoe UI",system-ui,sans-serif';ctx.fillText(titel||'Heute im Dorfladen',W/2,50);
    var now=socialPosterDate();var days=['Sonntag','Montag','Dienstag','Mittwoch','Donnerstag','Freitag','Samstag'];var months=['Januar','Februar','Maerz','April','Mai','Juni','Juli','August','September','Oktober','November','Dezember'];
    ctx.font='600 15px "Segoe UI",system-ui,sans-serif';ctx.fillStyle='rgba(255,255,255,0.92)';ctx.fillText(days[now.getDay()]+' \u00b7 '+now.getDate()+'. '+months[now.getMonth()],W/2,76);
    if(freitextLines.length){ctx.fillStyle='#374151';ctx.font='15px "Segoe UI",system-ui,sans-serif';ctx.textAlign='center';var fty=HEADER_H+24;freitextLines.forEach(function(line){ctx.fillText(line,W/2,fty);fty+=20;});}
    }
    function roundRect(x,y,w,h,r){ctx.beginPath();ctx.moveTo(x+r,y);ctx.arcTo(x+w,y,x+w,y+h,r);ctx.arcTo(x+w,y+h,x,y+h,r);ctx.arcTo(x,y+h,x,y,r);ctx.arcTo(x,y,x+w,y,r);ctx.closePath();}
    function roundTop(x,y,w,h,r){ctx.beginPath();ctx.moveTo(x+r,y);ctx.lineTo(x+w-r,y);ctx.arcTo(x+w,y,x+w,y+r,r);ctx.lineTo(x+w,y+h);ctx.lineTo(x,y+h);ctx.lineTo(x,y+r);ctx.arcTo(x,y,x+r,y,r);ctx.closePath();}
    function drawCover(img,x,y,w,h){var iw=img.width,ih=img.height;var s=Math.max(w/iw,h/ih);var sw=w/s,sh=h/s;var sx=(iw-sw)/2,sy=(ih-sh)/2;ctx.drawImage(img,sx,sy,sw,sh,x,y,w,h);}
    function timeBadge(x,topY,time){var label='\u23F0 ab '+time+' Uhr';ctx.font='bold 13px "Segoe UI",system-ui,sans-serif';var tw=ctx.measureText(label).width;var padX=9,bh=23,bw=tw+padX*2;ctx.save();roundRect(x,topY,bw,bh,7);ctx.fillStyle='#fef2f2';ctx.fill();ctx.strokeStyle='#dc2626';ctx.lineWidth=1.5;ctx.stroke();ctx.fillStyle='#dc2626';ctx.textAlign='left';ctx.textBaseline='middle';ctx.fillText(label,x+padX,topY+bh/2+1);ctx.restore();ctx.textBaseline='alphabetic';}
    layout.forEach(function(it){
      if(it.type==='cat'){ctx.textAlign='left';ctx.fillStyle='#2e7d4f';ctx.font='900 24px "Segoe UI",system-ui,sans-serif';var label=(catIcons[it.cat]||'')+' '+it.cat;ctx.fillText(label,PAD,it.y+20);var tw=ctx.measureText(label).width;ctx.strokeStyle='rgba(46,125,79,0.25)';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(PAD+tw+12,it.y+14);ctx.lineTo(W-PAD,it.y+14);ctx.stroke();return;}
      var p=it.p,cx=PAD,cy=it.y,cw=IMG_W,ch=it.cardH;
      ctx.save();roundRect(cx,cy,cw,ch,CARD_R);ctx.fillStyle='#fff';ctx.fill();ctx.strokeStyle='#eee';ctx.lineWidth=1;ctx.stroke();ctx.restore();
      if(it.hasImg){
        ctx.save();roundTop(cx,cy,cw,IMG_H,CARD_R);ctx.clip();drawCover(loadedImgs[p.id],cx,cy,cw,IMG_H);ctx.restore();
        var tx=cx+CARD_PAD,tyy=cy+IMG_H+CARD_PAD;ctx.textAlign='left';ctx.fillStyle='#1f2937';ctx.font='bold 30px "Segoe UI",system-ui,sans-serif';
        it.nl.forEach(function(line){ctx.fillText(line,tx,tyy+26);tyy+=38;});
        if(p.ab_uhr){timeBadge(tx,tyy,p.ab_uhr);tyy+=28;}
        if(p.preis){ctx.fillStyle='#2e7d4f';ctx.font='900 32px "Segoe UI",system-ui,sans-serif';var dp=parseFloat(p.preis);ctx.fillText((dp&&isFinite(dp)?dp.toFixed(2):p.preis)+' \u20AC',tx,tyy+30);}
      } else {
        var tx2=cx+CARD_PAD,midY=cy+ch/2;ctx.textAlign='left';ctx.fillStyle='#1f2937';ctx.font='bold 25px "Segoe UI",system-ui,sans-serif';
        var nm=p.name,maxNameW=cw-CARD_PAD*2-110;while(ctx.measureText(nm).width>maxNameW&&nm.length>8)nm=nm.substring(0,nm.length-1);if(nm!==p.name)nm+='\u2026';
        ctx.fillText(nm,tx2,p.ab_uhr?midY-2:midY+9);
        if(p.ab_uhr){timeBadge(tx2,midY+5,p.ab_uhr);}
        if(p.preis){ctx.textAlign='right';ctx.fillStyle='#2e7d4f';ctx.font='900 28px "Segoe UI",system-ui,sans-serif';var dp2=parseFloat(p.preis);ctx.fillText((dp2&&isFinite(dp2)?dp2.toFixed(2):p.preis)+' \u20AC',cx+cw-CARD_PAD,midY+9);ctx.textAlign='left';}
      }
    });
    if(!selected.length){ctx.fillStyle='#9ca3af';ctx.font='italic 16px "Segoe UI",system-ui,sans-serif';ctx.textAlign='center';ctx.fillText('Bitte Produkte oben auswaehlen...',W/2,H/2);}
  }

  // ── Kompakt-Grafik (EIN Bild, ~4:5) fuer WhatsApp ──────────────────────────
  // Header + bis zu 3 Quer-Kacheln (links Foto, rechts grosser Text). Passt
  // komplett in WhatsApps 4:5-Vorschau, daher kein Aufteilen/Umsortieren noetig.
  var SOC_COMPACT_ICONS={'Mittagessen':'\uD83C\uDF7D\uFE0F','Kuchen':'\uD83C\uDF70','Obst & Gemuese':'\uD83E\uDD66','Aufstriche':'\uD83E\uDD57','Salate':'\uD83E\uDD57','Sonstiges':'\uD83D\uDED2','Fleisch':'\uD83E\uDD69','Brot':'\uD83C\uDF5E'};
  function socialRoundLeft(ctx,x,y,w,h,r){ctx.beginPath();ctx.moveTo(x+r,y);ctx.lineTo(x+w,y);ctx.lineTo(x+w,y+h);ctx.lineTo(x+r,y+h);ctx.arcTo(x,y+h,x,y+h-r,r);ctx.lineTo(x,y+r);ctx.arcTo(x,y,x+r,y,r);ctx.closePath();}
  function socialDrawCompact(canvas,ctx,W,selected,titel,loadedImgs,SCALE){
    SCALE=SCALE||2;
    var items=selected.slice(0,(window.SOC_MAX_ITEMS||3));
    var PAD=16, GAP=12, HEADER_H=92, TILE_R=20, INNER=13;
    var n=Math.max(1,items.length);
    var tw=W-PAD*2;
    var photoW=Math.round(tw*0.46);
    var bx=PAD+photoW+22, bw=tw-photoW-22-18;
    var maxLines=(n>=3?2:3);
    var priceSize=(n>=3?28:31);
    // 1) Mess-Durchlauf: nur den Textblock je Kachel bestimmen (fuer vertikale
    //    Zentrierung). Die Kachelhoehe selbst wird danach GLEICH GROSS verteilt.
    var meas=items.map(function(p){
      var fit=socialFitName(ctx,p.name,bw,maxLines,[26,24,22,20],'700');
      var lh=Math.round(fit.size*1.16);
      var catH=25, nameH=fit.size+(fit.lines.length-1)*lh;
      var badgeBlock=p.ab_uhr?(25+8):0;
      var priceBlock=p.preis?(priceSize+2):0;
      var blockH=catH+nameH+badgeBlock+priceBlock;
      return {p:p,fit:fit,lh:lh,catH:catH,nameH:nameH,blockH:blockH};
    });
    // GLEICH GROSSE Kacheln + volle WhatsApp-Hoehe: Zielformat 4:5 (Hochkant,
    // das groesste Format, das WhatsApp ohne Beschnitt in voller Hoehe anzeigt).
    // Die verfuegbare Hoehe wird gleichmaessig auf alle Kacheln verteilt -> die
    // Fotos werden groesser und dadurch vollstaendiger dargestellt.
    var topAfterHeader=HEADER_H+GAP;
    var targetH=Math.round(W*(n>=2?1.25:0.66));
    var minContentH=0;meas.forEach(function(m){minContentH=Math.max(minContentH,m.blockH+INNER*2);});
    var availH=targetH-topAfterHeader-(n-1)*GAP-GAP;
    var tileH=Math.max(minContentH,Math.floor(availH/n));
    meas.forEach(function(m){m.tileH=tileH;});
    var tilesH=tileH*n;
    var H=topAfterHeader+tilesH+(n-1)*GAP+GAP;
    canvas.width=W*SCALE;canvas.height=H*SCALE;ctx.setTransform(SCALE,0,0,SCALE,0,0);
    ctx.fillStyle='#faf9f6';ctx.fillRect(0,0,W,H);
    // Kopf
    var grad=ctx.createLinearGradient(0,0,W,HEADER_H);grad.addColorStop(0,'#2e7d4f');grad.addColorStop(1,'#245f3d');ctx.fillStyle=grad;ctx.fillRect(0,0,W,HEADER_H);
    ctx.fillStyle='#fff';ctx.textAlign='center';ctx.textBaseline='alphabetic';
    var _htitle=titel||'Heute im Dorfladen';var _hsize=34;ctx.font='800 '+_hsize+'px "Segoe UI",system-ui,sans-serif';while(_hsize>22&&ctx.measureText(_htitle).width>W-44){_hsize-=1;ctx.font='800 '+_hsize+'px "Segoe UI",system-ui,sans-serif';}ctx.fillText(_htitle,W/2,50);
    var now=socialPosterDate();var days=['Sonntag','Montag','Dienstag','Mittwoch','Donnerstag','Freitag','Samstag'];var months=['Januar','Februar','Maerz','April','Mai','Juni','Juli','August','September','Oktober','November','Dezember'];
    ctx.font='600 16px "Segoe UI",system-ui,sans-serif';ctx.fillStyle='rgba(255,255,255,0.90)';ctx.fillText(days[now.getDay()]+' \u00b7 '+now.getDate()+'. '+months[now.getMonth()],W/2,76);
    // 2) Kacheln zeichnen
    var tx=PAD, ty=topAfterHeader;
    meas.forEach(function(m){
      var p=m.p;var th=m.tileH;
      // Karte
      ctx.save();socialRoundRect(ctx,tx,ty,tw,th,TILE_R);ctx.fillStyle='#fff';ctx.fill();ctx.strokeStyle='#ececec';ctx.lineWidth=1;ctx.stroke();ctx.restore();
      // Foto links (oder Platzhalter)
      var cat=p.kategorie||'Sonstiges';var emoji=SOC_COMPACT_ICONS[cat]||'\uD83D\uDED2';
      ctx.save();socialRoundLeft(ctx,tx,ty,photoW,th,TILE_R);ctx.clip();
      var img=loadedImgs&&loadedImgs[p.id];var iw=img?(img.naturalWidth||img.width):0,ih=img?(img.naturalHeight||img.height):0;
      if(img&&iw&&ih){
        // Ratio des Bildes beibehalten (contain). Randbereiche je nach Modus:
        // 'blur' = unscharfe formatfuellende Version, 'plain' = weiss,
        // 'tint' = heller Grauton-Verlauf (Default). 'cover' = beschnitten.
        var _fill=window.SOC_PHOTO_FILL||'tint';
        if(_fill==='cover'){
          var cs2=Math.max(photoW/iw,th/ih);var c2dw=iw*cs2,c2dh=ih*cs2;
          ctx.drawImage(img,tx+(photoW-c2dw)/2,ty+(th-c2dh)/2,c2dw,c2dh);
        }else{
          // Hintergrundfarbe (fuer Fade referenziert)
          var _bgTop='#eef1ef',_bgBot='#dde3df';
          if(_fill==='blur'){
            var cs=Math.max(photoW/iw,th/ih);var cdw=iw*cs,cdh=ih*cs;
            ctx.save();try{ctx.filter='blur(18px)';}catch(e){}
            ctx.drawImage(img,tx+(photoW-cdw)/2,ty+(th-cdh)/2,cdw,cdh);
            ctx.restore();
            ctx.fillStyle='rgba(255,255,255,0.10)';ctx.fillRect(tx,ty,photoW,th);
          }else if(_fill==='tint'){
            var _tc=window.SOC_TINT_GRAD||[['#f1f3f1',0],['#e0e5e2',1]];
            _bgTop=_tc[0][0];_bgBot=_tc[_tc.length-1][0];
            var tg=ctx.createLinearGradient(tx,ty,tx+photoW,ty+th);
            _tc.forEach(function(st){tg.addColorStop(st[1],st[0]);});
            ctx.fillStyle=tg;ctx.fillRect(tx,ty,photoW,th);
          }else{
            _bgTop=_bgBot='#ffffff';
            ctx.fillStyle='#fff';ctx.fillRect(tx,ty,photoW,th);
          }
          var s=Math.min(photoW/iw,th/ih);var dw=iw*s,dh=ih*s;
          var dx=tx+(photoW-dw)/2,dy=ty+(th-dh)/2;
          ctx.drawImage(img,dx,dy,dw,dh);
          // Weiches Auslaufen der Bildkanten in den Hintergrund (kein harter Cut):
          // an jeder Kante ein schmaler Verlauf von Hintergrundfarbe -> transparent.
          if(_fill!=='blur'){
            // Dezentere Kantenweichzeichnung (weniger extrem als bisher)
            var fade=Math.round(Math.min(dw,dh)*0.08);if(fade>22)fade=22;if(fade<4)fade=4;
            var hexA=function(hex,a){var h=hex.replace('#','');var r=parseInt(h.substr(0,2),16),g2=parseInt(h.substr(2,2),16),b=parseInt(h.substr(4,2),16);return 'rgba('+r+','+g2+','+b+','+a+')';};
            // nur ueberlappende Bereiche mit Foto abdecken
            var ix0=Math.max(dx,tx),ix1=Math.min(dx+dw,tx+photoW),iy0=Math.max(dy,ty),iy1=Math.min(dy+dh,ty+th);
            var iwR=ix1-ix0,ihR=iy1-iy0;
            // oben
            var gT=ctx.createLinearGradient(0,dy,0,dy+fade);gT.addColorStop(0,hexA(_bgTop,1));gT.addColorStop(1,hexA(_bgTop,0));ctx.fillStyle=gT;ctx.fillRect(ix0,dy,iwR,fade);
            // unten
            var gB=ctx.createLinearGradient(0,dy+dh,0,dy+dh-fade);gB.addColorStop(0,hexA(_bgBot,1));gB.addColorStop(1,hexA(_bgBot,0));ctx.fillStyle=gB;ctx.fillRect(ix0,dy+dh-fade,iwR,fade);
            // links
            var gL=ctx.createLinearGradient(dx,0,dx+fade,0);gL.addColorStop(0,hexA(_bgTop,1));gL.addColorStop(1,hexA(_bgTop,0));ctx.fillStyle=gL;ctx.fillRect(dx,iy0,fade,ihR);
            // rechts
            var gR=ctx.createLinearGradient(dx+dw,0,dx+dw-fade,0);gR.addColorStop(0,hexA(_bgBot,1));gR.addColorStop(1,hexA(_bgBot,0));ctx.fillStyle=gR;ctx.fillRect(dx+dw-fade,iy0,fade,ihR);
          }
        }
      }
      else{var g=ctx.createLinearGradient(tx,ty,tx,ty+th);g.addColorStop(0,'#f2efe8');g.addColorStop(1,'#e6dfd2');ctx.fillStyle=g;ctx.fillRect(tx,ty,photoW,th);
        if(cat==='Mittagessen'&&_socMealIconReady()){var _iw=_socMealIcon.naturalWidth,_ih=_socMealIcon.naturalHeight,_box=Math.min(photoW-40,th-24,170),_s=Math.min(_box/_iw,_box/_ih),_dw=_iw*_s,_dh=_ih*_s;ctx.globalAlpha=.9;ctx.drawImage(_socMealIcon,tx+photoW/2-_dw/2,ty+(th-_dh)/2,_dw,_dh);ctx.globalAlpha=1;}
        else{ctx.fillStyle='rgba(0,0,0,.5)';ctx.textAlign='center';ctx.textBaseline='middle';ctx.font=Math.round(Math.min(th,photoW)*0.34)+'px "Segoe UI Emoji","Apple Color Emoji",sans-serif';ctx.globalAlpha=.85;ctx.fillText(emoji,tx+photoW/2,ty+th/2);ctx.globalAlpha=1;}}
      ctx.restore();ctx.textBaseline='alphabetic';
      // Text rechts (vertikal zentriert)
      var sy=ty+Math.max(10,Math.round((th-m.blockH)/2));
      ctx.textAlign='left';ctx.textBaseline='alphabetic';ctx.fillStyle='#2e7d4f';ctx.font='700 17px "Segoe UI",system-ui,sans-serif';
      ctx.fillText(emoji+' '+cat, bx, sy+17);
      ctx.fillStyle='#233';ctx.font='700 '+m.fit.size+'px "Segoe UI",system-ui,sans-serif';
      var nameTop=sy+m.catH;m.fit.lines.forEach(function(line,i){ctx.fillText(line,bx,nameTop+m.fit.size+i*m.lh);});
      var cy2=nameTop+m.nameH+10;
      if(p.ab_uhr){var label='\u23F0 ab '+p.ab_uhr+' Uhr';ctx.font='600 13px "Segoe UI",system-ui,sans-serif';var lw=ctx.measureText(label).width;var padX=9,bwb=lw+padX*2,badgeBH=25;ctx.save();socialRoundRect(ctx,bx,cy2,bwb,badgeBH,8);ctx.fillStyle='#fef2f2';ctx.fill();ctx.strokeStyle='#dc2626';ctx.lineWidth=1.3;ctx.stroke();ctx.fillStyle='#dc2626';ctx.textAlign='left';ctx.textBaseline='middle';ctx.fillText(label,bx+padX,cy2+badgeBH/2+1);ctx.restore();ctx.textBaseline='alphabetic';cy2+=badgeBH+8;}
      if(p.preis){ctx.fillStyle='#2e7d4f';ctx.font='700 '+priceSize+'px "Segoe UI",system-ui,sans-serif';ctx.fillText(socialFmtPrice(p.preis)+' \u20AC', bx, cy2+priceSize-4);}
      ty+=th+GAP;
    });
    return {W:W,H:H};
  }
  M.socialDrawCompact=socialDrawCompact;

  function socialDrawMealPosterAuto(canvas,ctx,W,mtItems,loadedImgs,SCALE,headerOpts){
    // Zeichnet das Mittagessen im GLEICHEN Kartenstil wie die Artikel
    // (socialDrawPoster): gruene Kategorie-Kopfzeile + weisse Karten mit Bild
    // oben (bzw. Teller-Icon als Platzhalter), Name fett, Preis gross gruen.
    // headerOpts (optional): {titel,freitext} -> zeichnet den grossen gruenen
    // Titel-Kopf oben (wenn Mittagessen an erster Stelle im Poster steht).
    SCALE=SCALE||1;
    var PAD=16, GAP=12, CARD_R=16, CARD_PAD=14;
    var IMG_W=W-PAD*2, IMG_H=Math.round(IMG_W*0.55);
    var multi=mtItems.length>1;
    var days=['Sonntag','Montag','Dienstag','Mittwoch','Donnerstag','Freitag','Samstag'];
    var months=['Januar','Februar','Maerz','April','Mai','Juni','Juli','August','September','Oktober','November','Dezember'];
    var headLabel='\uD83C\uDF7D\uFE0F Mittagessen \u00b7 '+days[socialPosterDate().getDay()];
    var mc=document.createElement('canvas'),mx=mc.getContext('2d');
    // Optionaler grosser Titel-Kopf oben
    var HEADER_H=92;
    var freitextLines=[];
    if(headerOpts&&headerOpts.freitext){mx.font='15px "Segoe UI",system-ui,sans-serif';freitextLines=socialWrapText(mx,headerOpts.freitext,W-PAD*2-8);}
    var topOffset=headerOpts?(HEADER_H+(freitextLines.length?(10+freitextLines.length*20+6):8)):0;
    // Mess-Durchlauf
    var contentH=topOffset+12+34;var layout=[];
    mtItems.forEach(function(meal,idx){
      var hasImg=!!(loadedImgs&&loadedImgs[meal.id]);
      mx.font='bold 30px "Segoe UI",system-ui,sans-serif';
      var nl=socialWrapText(mx,meal.name||'',IMG_W-CARD_PAD*2);if(nl.length>2)nl=nl.slice(0,2);
      var imgAreaH=IMG_H; // Mittagessen-Kachel gleich gross wie Artikel-Karten
      var cardH=imgAreaH+CARD_PAD+(multi?24:0)+nl.length*38+(meal.ab_uhr?28:0)+(meal.preis?40:0)+CARD_PAD;
      layout.push({meal:meal,idx:idx,hasImg:hasImg,nl:nl,cardH:cardH,imgAreaH:imgAreaH});
      contentH+=cardH+GAP;
    });
    contentH+=8;var H=Math.max(200,contentH);
    canvas.width=W*SCALE;canvas.height=H*SCALE;ctx=canvas.getContext('2d');ctx.setTransform(SCALE,0,0,SCALE,0,0);
    ctx.fillStyle='#faf9f6';ctx.fillRect(0,0,W,H);
    function roundRect(x,y,w,h,r){ctx.beginPath();ctx.moveTo(x+r,y);ctx.arcTo(x+w,y,x+w,y+h,r);ctx.arcTo(x+w,y+h,x,y+h,r);ctx.arcTo(x,y+h,x,y,r);ctx.arcTo(x,y,x+w,y,r);ctx.closePath();}
    function roundTop(x,y,w,h,r){ctx.beginPath();ctx.moveTo(x+r,y);ctx.lineTo(x+w-r,y);ctx.arcTo(x+w,y,x+w,y+r,r);ctx.lineTo(x+w,y+h);ctx.lineTo(x,y+h);ctx.lineTo(x,y+r);ctx.arcTo(x,y,x+r,y,r);ctx.closePath();}
    function drawCover(img,x,y,w,h){var iw=img.width,ih=img.height;var s=Math.max(w/iw,h/ih);var sw=w/s,sh=h/s;var sx=(iw-sw)/2,sy=(ih-sh)/2;ctx.drawImage(img,sx,sy,sw,sh,x,y,w,h);}
    function timeBadge(x,topY,time){var label='\u23F0 ab '+time+' Uhr';ctx.font='bold 13px "Segoe UI",system-ui,sans-serif';var tw=ctx.measureText(label).width;var padX=9,bh=23,bw=tw+padX*2;ctx.save();roundRect(x,topY,bw,bh,7);ctx.fillStyle='#fef2f2';ctx.fill();ctx.strokeStyle='#dc2626';ctx.lineWidth=1.5;ctx.stroke();ctx.fillStyle='#dc2626';ctx.textAlign='left';ctx.textBaseline='middle';ctx.fillText(label,x+padX,topY+bh/2+1);ctx.restore();ctx.textBaseline='alphabetic';}
    // Optionaler grosser gruener Titel-Kopf (identisch zu socialDrawPoster)
    if(headerOpts){
      var grad=ctx.createLinearGradient(0,0,W,HEADER_H);grad.addColorStop(0,'#2e7d4f');grad.addColorStop(1,'#245f3d');ctx.fillStyle=grad;ctx.fillRect(0,0,W,HEADER_H);
      ctx.fillStyle='#fff';ctx.textAlign='center';ctx.font='900 30px "Segoe UI",system-ui,sans-serif';ctx.fillText(headerOpts.titel||'Heute im Dorfladen',W/2,50);
      var hnow=socialPosterDate();ctx.font='600 15px "Segoe UI",system-ui,sans-serif';ctx.fillStyle='rgba(255,255,255,0.92)';ctx.fillText(days[hnow.getDay()]+' \u00b7 '+hnow.getDate()+'. '+months[hnow.getMonth()],W/2,76);
      if(freitextLines.length){ctx.fillStyle='#374151';ctx.font='15px "Segoe UI",system-ui,sans-serif';ctx.textAlign='center';var fty=HEADER_H+24;freitextLines.forEach(function(line){ctx.fillText(line,W/2,fty);fty+=20;});}
    }
    // Kategorie-Kopfzeile (identisch zum Artikel-Stil)
    var hy=topOffset+12;ctx.textAlign='left';ctx.fillStyle='#2e7d4f';ctx.font='900 24px "Segoe UI",system-ui,sans-serif';
    ctx.fillText(headLabel,PAD,hy+20);var htw=ctx.measureText(headLabel).width;
    ctx.strokeStyle='rgba(46,125,79,0.25)';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(PAD+htw+12,hy+14);ctx.lineTo(W-PAD,hy+14);ctx.stroke();
    var y=topOffset+12+34;
    layout.forEach(function(it){
      var meal=it.meal,cx=PAD,cy=y,cw=IMG_W,ch=it.cardH;
      ctx.save();roundRect(cx,cy,cw,ch,CARD_R);ctx.fillStyle='#fff';ctx.fill();ctx.strokeStyle='#eee';ctx.lineWidth=1;ctx.stroke();ctx.restore();
      // Bild oben bzw. Teller-Icon-Platzhalter
      if(it.hasImg){ctx.save();roundTop(cx,cy,cw,it.imgAreaH,CARD_R);ctx.clip();drawCover(loadedImgs[meal.id],cx,cy,cw,it.imgAreaH);ctx.restore();}
      else{ctx.save();roundTop(cx,cy,cw,it.imgAreaH,CARD_R);var g=ctx.createLinearGradient(cx,cy,cx,cy+it.imgAreaH);g.addColorStop(0,'#f2efe8');g.addColorStop(1,'#e6dfd2');ctx.fillStyle=g;ctx.fill();ctx.clip();if(_socMealIconReady()){var _iw=_socMealIcon.naturalWidth,_ih=_socMealIcon.naturalHeight,_box=Math.min(it.imgAreaH-56,240),_s=Math.min(_box/_iw,_box/_ih),_dw=_iw*_s,_dh=_ih*_s;ctx.drawImage(_socMealIcon,cx+cw/2-_dw/2,cy+(it.imgAreaH-_dh)/2,_dw,_dh);}else{ctx.fillStyle='#c8b79b';ctx.font='72px "Segoe UI Emoji","Segoe UI Symbol","Segoe UI",system-ui,sans-serif';ctx.textAlign='center';ctx.fillText('\uD83C\uDF7D',cx+cw/2,cy+it.imgAreaH/2+24);}ctx.restore();}
      var tx=cx+CARD_PAD,tyy=cy+it.imgAreaH+CARD_PAD;
      if(multi){ctx.textAlign='left';ctx.fillStyle='#2e7d4f';ctx.font='900 15px "Segoe UI",system-ui,sans-serif';ctx.fillText('MEN\u00dc '+(it.idx+1),tx,tyy+14);tyy+=24;}
      ctx.textAlign='left';ctx.fillStyle='#1f2937';ctx.font='bold 30px "Segoe UI",system-ui,sans-serif';
      it.nl.forEach(function(line){ctx.fillText(line,tx,tyy+26);tyy+=38;});
      if(meal.ab_uhr){timeBadge(tx,tyy,meal.ab_uhr);tyy+=28;}
      if(meal.preis){ctx.fillStyle='#2e7d4f';ctx.font='900 34px "Segoe UI",system-ui,sans-serif';var dp=parseFloat(meal.preis);ctx.fillText((dp&&isFinite(dp)?dp.toFixed(2):meal.preis)+' \u20AC',tx,tyy+32);}
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
    return Promise.all(promises.concat([_socMealIconPromise])).then(function(){
      var mealCanvas=document.getElementById('soc-post-canvas-meal');var mealLabel=document.getElementById('soc-preview-label-meal');var dailyLabel=document.getElementById('soc-preview-label-daily');if(mealCanvas)mealCanvas.style.display='none';if(mealLabel)mealLabel.style.display='none';if(dailyLabel)dailyLabel.style.display='none';
      // Kompakt-Grafik (EIN Bild, ~4:5): identisch zu dem, was geteilt wird (WYSIWYG).
      if(selected.length>0){canvas.style.display='block';socialDrawCompact(canvas,canvas.getContext('2d'),540,selected,titel||'Heute im Dorfladen',loadedImgs,SCALE);}
      else{canvas.style.display='none';}
      window._socLoadedImgs=loadedImgs;
    });
  };

  // --- WhatsApp message builder ---
  function socialBuildWhatsAppMsg(selected){
    var hasMittagessen=selected.some(function(p){return (p.kategorie||'Sonstiges')==='Mittagessen';});
    if(hasMittagessen){
      var origin=window.location.origin||'';
      // Taeglich wechselnder Parameter: zwingt WhatsApp, die Link-Vorschau NEU zu
      // laden (statt die alte, gecachte grosse Bild-Karte zu zeigen). Die Seite
      // ignoriert den Parameter - der Link funktioniert normal. Da die Seite keine
      // og:*/twitter:*-Tags mehr hat, erscheint keine grosse Vorschau-Karte.
      var d=new Date();var stamp=''+d.getFullYear()+String(d.getMonth()+1).padStart(2,'0')+String(d.getDate()).padStart(2,'0');
      return '\uD83D\uDC49 Mittagessen vorbestellen:\n'+origin+'/tagesinfo?d='+stamp;
    }
    return '';
  }

  function socialIsMobile(){return /Android|iPhone|iPad|iPod|webOS|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);}
  // Firefox fuer Android unterstuetzt KEIN Teilen von Dateien via Web-Share-API
  // (nur Text/Links). Bilder koennen daher nicht direkt an WhatsApp uebergeben werden.
  function socialIsFirefox(){return /Firefox|FxiOS/i.test(navigator.userAgent);}
  function socialFallbackDownloadFiles(files){files.forEach(function(f){var url=URL.createObjectURL(f);var a=document.createElement('a');a.href=url;a.download=f.name;document.body.appendChild(a);a.click();document.body.removeChild(a);setTimeout(function(){URL.revokeObjectURL(url);},2000);});socialStatus('soc-post-status','\u2705 '+files.length+' Poster heruntergeladen',true);}
  function socialShareViaDownload(files,msg){socialFallbackDownloadFiles(files);setTimeout(function(){window.open('https://wa.me/?text='+encodeURIComponent(msg||''),'_blank');},500);}
  function socialShareViaClipboard(files,msg){var blob=files[0];if(navigator.clipboard&&navigator.clipboard.write&&typeof ClipboardItem!=='undefined'){try{var item=new ClipboardItem({'image/png':blob});navigator.clipboard.write([item]).then(function(){socialStatus('soc-post-status','\u2705 Poster in Zwischenablage!',true);}).catch(function(){socialShareViaDownload(files,msg);});}catch(e){socialShareViaDownload(files,msg);}}else{socialShareViaDownload(files,msg);}setTimeout(function(){window.open('https://wa.me/?text='+encodeURIComponent(msg||''),'_blank');},300);}
  // Text zuverlässig in die Zwischenablage kopieren (mit execCommand-Fallback)
  function socialCopyTextFallback(text){try{var ta=document.createElement('textarea');ta.value=text;ta.style.position='fixed';ta.style.top='-1000px';ta.style.opacity='0';document.body.appendChild(ta);ta.focus();ta.select();var ok=document.execCommand('copy');document.body.removeChild(ta);return ok;}catch(e){return false;}}
  function socialCopyText(text){return new Promise(function(resolve){if(navigator.clipboard&&navigator.clipboard.writeText){navigator.clipboard.writeText(text).then(function(){resolve(true);},function(){resolve(socialCopyTextFallback(text));});}else{resolve(socialCopyTextFallback(text));}});}
  function socialShareFiles(files,msg,hasMt){
    var isMobile=socialIsMobile();
    // Alle Bilder als Serie teilen; falls das nicht unterstuetzt wird, das erste Bild.
    var shareSet=files,canShareFiles=false;
    if(navigator.share&&navigator.canShare){
      try{canShareFiles=navigator.canShare({files:files});}catch(e){}
      if(!canShareFiles){try{if(navigator.canShare({files:[files[0]]})){shareSet=[files[0]];canShareFiles=true;}}catch(e){}}
    }
    // WICHTIG: KEIN navigator.clipboard.writeText() VOR navigator.share() aufrufen!
    // Auf Android verbraucht der Clipboard-Schreibzugriff die transiente Nutzeraktivierung,
    // wodurch navigator.share() mit NotAllowedError fehlschlaegt und die App in den
    // Download-Fallback faellt (Bild wird nicht geteilt, nur Text via wa.me). Der Text wird
    // ueber shareData.text uebergeben und erst NACH erfolgreichem Teilen als Backup kopiert.
    // Bevorzugt: natives Teilen mit Datei (oeffnet die System-Auswahl inkl. WhatsApp) - Mobil UND Desktop.
    if(canShareFiles){
      // In Build-Reihenfolge teilen: WhatsApp zeigt die Serie in Sende-Reihenfolge
      // (oben = zuerst gesendet). Reihenfolge: Artikel (mit Kopf) -> Mittagessen.
      // Bei MEHREREN Bildern eine Dummy-Caption ("-") mitgeben: dadurch stellt
      // WhatsApp die Bilder EINZELN dar (statt sie zu einer Galerie/Album
      // zusammenzufassen). Der echte Bestell-Link wird NICHT als Caption gesetzt
      // (wuerde sonst unter jedem Bild stehen), sondern in die Zwischenablage
      // kopiert und als eigene Nachricht eingefuegt. Bei EINEM Bild darf der
      // Link direkt als Caption mitgehen.
      var singleImg=shareSet.length===1;
      var shareFiles=shareSet;
      var shareData={files:shareFiles};
      // Bestell-Link nur auf MOBILE als Text/Caption mitgeben. Am DESKTOP nicht -
      // dort wird mit Strg-V gearbeitet, der Link kommt nur in die Zwischenablage
      // (sonst erscheint er als eigene Nachricht oben im Chat).
      if(singleImg){ if(msg&&isMobile)shareData.text=msg; }
      else { shareData.text='-'; }
      // Bestell-Link SYNCHRON vor navigator.share() in die Zwischenablage schreiben
      // (fire-and-forget, KEIN await): So bleibt die Nutzer-Aktivierung fuer share()
      // erhalten UND das Clipboard enthaelt den vollstaendigen Text inkl.
      // "Mittagessen vorbestellen". Wuerde writeText erst NACH share() im .then()
      // laufen, ist die Aktivierung auf Android verbraucht -> nur die URL bliebe.
      // Ausnahme: Mobile + Einzelbild -> Link geht bereits als Caption mit.
      if(msg&&!(singleImg&&isMobile)){try{if(navigator.clipboard&&navigator.clipboard.writeText){navigator.clipboard.writeText(msg).catch(function(){});}}catch(e){}}
      navigator.share(shareData).then(function(){
        if(msg){try{if(navigator.clipboard&&navigator.clipboard.writeText){navigator.clipboard.writeText(msg).catch(function(){});}}catch(e){}}
        socialStatus('soc-post-status', singleImg?(msg?(isMobile?'\u2705 Geteilt \u00B7 Bestell-Link angeh\u00e4ngt':'\u2705 Bild geteilt \u00B7 Bestell-Link ist in der Zwischenablage (Strg-V)'):'\u2705 Bild geteilt!'):(msg?'\u2705 Bilder einzeln geteilt \u00B7 Bestell-Text (mit Link) ist kopiert \u2013 als eigene Nachricht einf\u00fcgen (langes Tippen \u2192 Einf\u00fcgen)':'\u2705 Bilder einzeln geteilt!'),true);
      }).catch(function(err){
        if(err.name==='AbortError')return;
        // Mehrfach-Datei-Teilen fehlgeschlagen -> mit EINEM Bild erneut versuchen
        // (manche Android/WhatsApp-Versionen lehnen mehrere Dateien ab). So wird zumindest
        // ein Bild via WhatsApp geteilt statt in den Download-Dialog zu fallen.
        if(shareFiles.length>1){
          var oneData={files:[files[0]]};
          navigator.share(oneData).then(function(){
            if(msg){try{if(navigator.clipboard&&navigator.clipboard.writeText){navigator.clipboard.writeText(msg).catch(function(){});}}catch(e){}}
            socialStatus('soc-post-status', msg?'\u2705 Bild geteilt \u00B7 Bestell-Link ist kopiert \u2013 im Chat einf\u00fcgen':'\u2705 Bild geteilt',true);
          }).catch(function(err2){
            if(err2.name==='AbortError')return;
            if(isMobile){socialShareViaClipboard(files,msg);}
            else{socialFallbackDownloadFiles(files);window.open('https://wa.me/?text='+encodeURIComponent(msg||''),'_blank');}
          });
          return;
        }
        if(isMobile){socialShareViaClipboard(files,msg);}
        else{socialFallbackDownloadFiles(files);window.open('https://wa.me/?text='+encodeURIComponent(msg||''),'_blank');}
      });
      socialStatus('soc-post-status','Wird geteilt\u2026',true);
      return;
    }
    // Kein natives Teilen mit Datei verfuegbar (z.B. Firefox fuer Android):
    if(isMobile){
      if(socialIsFirefox()){
        // Firefox Android kann keine Dateien teilen -> Bilder speichern, WhatsApp mit
        // Text/Link oeffnen und klar anleiten, die Bilder aus der Galerie anzuhaengen.
        if(msg){try{if(navigator.clipboard&&navigator.clipboard.writeText){navigator.clipboard.writeText(msg).catch(function(){});}}catch(e){}}
        socialFallbackDownloadFiles(files);
        socialStatus('soc-post-status','\u2705 '+files.length+' Bild(er) gespeichert \u00B7 WhatsApp \u00f6ffnet \u2013 \u00fcber \uD83D\uDCCE die Bilder aus der Galerie anh\u00e4ngen. Tipp: In Chrome werden die Bilder direkt geteilt.',true);
        setTimeout(function(){window.open('https://wa.me/?text='+encodeURIComponent(msg||''),'_blank');},400);
        return;
      }
      socialShareViaClipboard(files,msg);return;
    }
    // Desktop-Browser ohne Web-Share: Poster herunterladen, dann WhatsApp Web OHNE
    // vorgefuellten Text oeffnen. Der Bestell-Link wird NICHT als Nachricht mitgegeben
    // (wuerde sonst oben im Chat als Text-Nachricht erscheinen), sondern nur in die
    // Zwischenablage kopiert - am Desktop wird ohnehin mit Strg-V gearbeitet.
    if(msg){socialCopyText(msg);}
    socialFallbackDownloadFiles(files);
    socialStatus('soc-post-status', msg?'\u2705 Poster gespeichert \u00B7 WhatsApp wird ge\u00f6ffnet \u2013 Poster anh\u00e4ngen (\uD83D\uDCCE). Bestell-Link ist in der Zwischenablage (Strg-V)':'\u2705 Poster gespeichert \u00B7 WhatsApp wird ge\u00f6ffnet \u2013 bitte Poster anh\u00e4ngen',true);
    window.open('https://web.whatsapp.com/','_blank');
  }

  function canvasToFiles(canvases,selected,titel,freitext){
    var files=[];
    canvases.forEach(function(c){
      var dataUrl;try{dataUrl=c.canvas.toDataURL('image/png');}catch(e){var cc=document.createElement('canvas');var cx=cc.getContext('2d');var mtI=selected.filter(function(p){return p.kategorie==='Mittagessen';});var otherI=selected.filter(function(p){return p.kategorie!=='Mittagessen';});if(mtI.length>0&&otherI.length>0){var tM=document.createElement('canvas');socialDrawMealPosterAuto(tM,tM.getContext('2d'),600,mtI,{},2,{titel:titel,freitext:freitext});var tD=document.createElement('canvas');socialDrawPoster(tD,tD.getContext('2d'),600,otherI,titel,freitext,{},2,true,true);cc.width=1200;cc.height=tM.height+tD.height;cx.drawImage(tM,0,0);cx.drawImage(tD,0,tM.height);}else if(mtI.length>0){socialDrawMealPosterAuto(cc,cx,600,mtI,{},2,{titel:titel,freitext:freitext});}else{socialDrawPoster(cc,cx,600,otherI,titel,freitext,{},2);}dataUrl=cc.toDataURL('image/png');}
      if(dataUrl){var parts=dataUrl.split(',');var mime=parts[0].match(/:(.*?);/)[1];var bstr=atob(parts[1]);var u8=new Uint8Array(bstr.length);for(var i=0;i<bstr.length;i++)u8[i]=bstr.charCodeAt(i);files.push(new File([new Blob([u8],{type:mime})],c.name,{type:'image/png'}));}
    });return files;
  }

  // ── WhatsApp-Aufteilung: Post in mehrere Bilder (max. ~4:5) aufteilen ──
  // WhatsApp beschneidet die Chat-Vorschau bei hohen Bildern (~4:5). Daher wird
  // der Post in mehrere Seiten aufgeteilt, jede bleibt unter dem Grenz-Verhaeltnis
  // und wird als Bild-Serie geteilt. So kommen alle Infos vollstaendig an.
  var SOC_PAGE_W=720, SOC_PAGE_MAXH=750, SOC_PAGE_RESERVE=100;

  // Teilt items so in Bloecke, dass jeder gerendert <= (maxH-reserve) hoch ist.
  function socialChunkItems(items,renderSub,maxH,reserve,SCALE){
    var eff=maxH-(reserve||0),chunks=[],i=0;
    while(i<items.length){
      var best=1;
      for(var count=1;count<=items.length-i;count++){
        var cv=renderSub(items.slice(i,i+count));
        if(cv.height/SCALE<=eff){best=count;}else{break;}
      }
      chunks.push(items.slice(i,i+best));i+=best;
    }
    return chunks;
  }

  // Baut die Seiten-Canvases (jede <= ~4:5). Reihenfolge: Artikel zuerst (mit
  // grossem Kopf), Mittagessen zuletzt. Der Bestell-Link folgt als Text am Ende.
  function socialBuildPages(selected,titel,freitext,loadedImgs,SCALE){
    SCALE=SCALE||2;var W=SOC_PAGE_W,maxH=SOC_PAGE_MAXH,reserve=SOC_PAGE_RESERVE;
    var mt=selected.filter(function(p){return p.kategorie==='Mittagessen';});
    var others=selected.filter(function(p){return p.kategorie!=='Mittagessen';});
    var blocks=[];
    // 1) Artikel zuerst (nach Kategorie gruppiert)
    var seen={},order=[];others.forEach(function(p){var c=p.kategorie||'Sonstiges';if(!seen[c]){seen[c]=[];order.push(c);}seen[c].push(p);});
    order.forEach(function(c){
      var achunks=socialChunkItems(seen[c],function(sub){var cv=document.createElement('canvas');socialDrawPoster(cv,cv.getContext('2d'),W,sub,titel,freitext,loadedImgs,SCALE,true,true);return cv;},maxH,reserve,SCALE);
      achunks.forEach(function(sub){blocks.push({kind:'cat',cat:c,items:sub});});
    });
    // 2) Mittagessen zuletzt
    if(mt.length){
      var mchunks=socialChunkItems(mt,function(sub){var cv=document.createElement('canvas');socialDrawMealPosterAuto(cv,cv.getContext('2d'),W,sub,loadedImgs,SCALE);return cv;},maxH,reserve,SCALE);
      mchunks.forEach(function(sub){blocks.push({kind:'meal',items:sub});});
    }
    if(!blocks.length)return [];
    // Bloecke rendern (erster Block erhaelt den grossen gruenen Kopf)
    var rendered=blocks.map(function(b,i){
      var withHeader=(i===0),cv=document.createElement('canvas');
      if(b.kind==='meal'){socialDrawMealPosterAuto(cv,cv.getContext('2d'),W,b.items,loadedImgs,SCALE,withHeader?{titel:titel,freitext:freitext}:null);}
      else{socialDrawPoster(cv,cv.getContext('2d'),W,b.items,titel,freitext,loadedImgs,SCALE,true,!withHeader);}
      return {cv:cv,h:cv.height/SCALE};
    });
    // Bloecke auf Seiten packen (<= maxH)
    var pages=[],cur=[],curH=0;
    rendered.forEach(function(r){if(cur.length&&curH+r.h>maxH){pages.push(cur);cur=[];curH=0;}cur.push(r);curH+=r.h;});
    if(cur.length)pages.push(cur);
    var total=pages.length;
    return pages.map(function(secs,pi){return socialComposePage(secs,pi+1,total,W,SCALE);});
  }

  // Stapelt die Bloecke einer Seite zu einem Canvas + kleine Seiten-Nummer (oben rechts).
  function socialComposePage(secs,pageNo,total,W,SCALE){
    var dw=W*SCALE;
    var bodyDev=secs.reduce(function(a,s){return a+s.cv.height;},0);
    var pc=document.createElement('canvas');pc.width=dw;pc.height=bodyDev;
    var x=pc.getContext('2d');
    x.fillStyle='#faf9f6';x.fillRect(0,0,dw,pc.height);
    var y=0;secs.forEach(function(s){x.drawImage(s.cv,0,y);y+=s.cv.height;});
    // Kleine Seiten-Nummer "n/N" als dezentes Badge oben rechts (nur bei mehreren
    // Bildern). WhatsApp kann die Reihenfolge bei 4+ Einzelbildern umsortieren -
    // die Nummer macht die richtige Reihenfolge fuer den Empfaenger erkennbar.
    if(total>1){
      x.save();
      var fs=Math.round(15*SCALE);
      x.font='bold '+fs+'px "Segoe UI",system-ui,sans-serif';
      var label=pageNo+'/'+total;
      var padX=Math.round(9*SCALE),padY=Math.round(5*SCALE);
      var tw=x.measureText(label).width;
      var bw=tw+padX*2,bh=fs+padY*2;
      var m=Math.round(10*SCALE);
      var bx=dw-bw-m,by=m,r=Math.round(7*SCALE);
      x.beginPath();x.moveTo(bx+r,by);x.arcTo(bx+bw,by,bx+bw,by+bh,r);x.arcTo(bx+bw,by+bh,bx,by+bh,r);x.arcTo(bx,by+bh,bx,by,r);x.arcTo(bx,by,bx+bw,by,r);x.closePath();
      x.fillStyle='rgba(255,255,255,0.92)';x.fill();
      x.strokeStyle='#2e7d4f';x.lineWidth=Math.max(1,Math.round(1.5*SCALE));x.stroke();
      x.fillStyle='#2e7d4f';x.textAlign='center';x.textBaseline='middle';
      x.fillText(label,bx+bw/2,by+bh/2+1);
      x.restore();
    }
    return pc;
  }

  function socialCanvasToFile(cv,name){var dataUrl=cv.toDataURL('image/png');var parts=dataUrl.split(',');var mime=parts[0].match(/:(.*?);/)[1];var bstr=atob(parts[1]);var u8=new Uint8Array(bstr.length);for(var i=0;i<bstr.length;i++)u8[i]=bstr.charCodeAt(i);return new File([new Blob([u8],{type:mime})],name,{type:'image/png'});}
  function socialPagesToFiles(pages){var now=new Date();var ds=now.getFullYear()+'-'+String(now.getMonth()+1).padStart(2,'0')+'-'+String(now.getDate()).padStart(2,'0');return pages.map(function(cv,i){var pageNum=pages.length>1?('-'+String(i+1).padStart(String(pages.length).length,'0')):'';return socialCanvasToFile(cv,'dorfladen-'+ds+pageNum+'.png');});}
  M.socialBuildPages=socialBuildPages;

  // WhatsApp-Teilen: EINE Kompakt-Grafik (~4:5) mit bis zu 3 Kacheln. Passt
  // vollstaendig in WhatsApps Vorschau -> kein Aufteilen, kein Umsortieren.
  // Bestell-Link (nur bei Mittagessen): auf MOBILE direkt als Bild-Caption,
  // am DESKTOP in die Zwischenablage (Strg-V).
  window.socialShareWhatsApp=function(){
    try{
    var titel=(document.getElementById('soc-post-titel').value||'').trim()||'Heute im Dorfladen';var selected=socialGatherSelected();
    if(!selected.length){socialStatus('soc-post-status','Bitte Produkte ausw\u00e4hlen',false);return;}
    var msg=socialBuildWhatsAppMsg(selected);var hasMt=selected.some(function(p){return p.kategorie==='Mittagessen';});
    // WICHTIG: Datei SYNCHRON aus den bereits (per Vorschau) geladenen Bildern erzeugen.
    // KEIN await auf socialGenPreview() vor navigator.share() - sonst verfaellt auf Android
    // die transiente Nutzeraktivierung und navigator.share() schlaegt mit NotAllowedError fehl.
    var loaded=window._socLoadedImgs||{};
    var cv=document.createElement('canvas');
    try{socialDrawCompact(cv,cv.getContext('2d'),540,selected,titel,loaded,2);}
    catch(e){try{socialDrawCompact(cv,cv.getContext('2d'),540,selected,titel,{},2);}catch(e2){socialStatus('soc-post-status','Poster-Export fehlgeschlagen',false);return;}}
    var now=new Date();var ds=now.getFullYear()+'-'+String(now.getMonth()+1).padStart(2,'0')+'-'+String(now.getDate()).padStart(2,'0');
    var files=[socialCanvasToFile(cv,'dorfladen-'+ds+'.png')];
    socialSavePost(titel,'',selected);
    socialShareFiles(files,msg,hasMt);
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

  // Tagesinfo-Bestueckung: Checkbox 'soc-tagesinfo' (Default AN). Ist sie
  // abgewaehlt (Test-Modus), wird der Post NICHT auf der oeffentlichen
  // /tagesinfo-Seite angezeigt (tagesinfo_hidden=true), bleibt aber unter
  // 'Posts & Entwuerfe' sichtbar und teilbar.
  function socialTagesinfoHidden(){
    var cb=document.getElementById('soc-tagesinfo');
    if(!cb) return false; // kein Toggle => Standardverhalten (sichtbar)
    return !cb.checked;
  }

  // --- Save post ---
  function socialSavePost(titel,freitext,items){
    var body={titel:titel,freitext:freitext,items:items.map(function(p){var o={id:p.id,name:p.name,kategorie:p.kategorie,preis:p.preis};if(p.bild_url)o.bild_url=p.bild_url;if(p.ab_uhr)o.ab_uhr=p.ab_uhr;return o;})};
    var zd=socialGetZielDatum();if(zd)body.ziel_datum=zd;
    var nb=document.getElementById('soc-notify');body.notify=!!(nb&&nb.checked);
    body.tagesinfo_hidden=socialTagesinfoHidden();
    var hidden=body.tagesinfo_hidden;
    // keepalive: Beim WhatsApp-Teilen wird die Seite in den Hintergrund gedraengt
    // (WhatsApp uebernimmt den Fokus). Ohne keepalive bricht der Browser den noch
    // laufenden Speicher-Request ab -> der Post wird still NICHT gespeichert.
    var _opt={method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)};
    try{ if(_opt.body.length<60000) _opt.keepalive=true; }catch(_e){}
    fetch(API+'/social-post',_opt)
      .then(function(r){if(!r.ok)throw new Error('HTTP '+r.status);return r.json();})
      .then(function(res){
        if(res&&res.success===false)throw new Error(res.error||'Speichern fehlgeschlagen');
        socialStatus('soc-post-status',hidden?'✅ Grafik geteilt · Post gespeichert (Test-Modus – nicht auf der Tagesinfo)':'✅ Grafik geteilt · Post gespeichert – erscheint unter „Posts & Entwürfe" und auf der Tagesinfo',true);
        if(typeof socialLoadTodayPosts==='function')socialLoadTodayPosts();
      })
      .catch(function(e){
        socialStatus('soc-post-status','⚠️ Grafik geteilt, aber Speichern fehlgeschlagen ('+(e&&e.message?e.message:'Netzwerk')+'). Bitte „Tagesinfo veröffentlichen" nutzen, damit der Post erhalten bleibt.',false);
      });
    if(nb)nb.checked=false;
  }

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
    var body={titel:titel,freitext:freitext,items:selected.map(function(p){var o={id:p.id,name:p.name,kategorie:p.kategorie,preis:p.preis};if(p.bild_url)o.bild_url=p.bild_url;if(p.ab_uhr)o.ab_uhr=p.ab_uhr;return o;})};var zd=socialGetZielDatum();if(zd)body.ziel_datum=zd;var nb=document.getElementById('soc-notify');body.notify=!!(nb&&nb.checked);body.tagesinfo_hidden=socialTagesinfoHidden();if(nb)nb.checked=false;
    fetch(API+'/social-post',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)})
    .then(function(r){if(!r.ok)throw new Error('Fehler ('+r.status+')');return r.json();})
    .then(function(){
      var hidden=body.tagesinfo_hidden;var msg=hidden?'✅ Test-Post gespeichert – NICHT auf der Tagesinfo veröffentlicht (Test-Modus)':(zd?'✅ Tagesinfo für morgen geplant – erscheint ab heute Abend auf der Homepage':'✅ Tagesinfo veröffentlicht – erscheint auf der Homepage');socialStatus('soc-post-status',msg,true);
      btns.forEach(function(b){b.innerHTML='<span style="vertical-align:middle;margin-right:6px">✅</span> '+(hidden?'Test gespeichert':'Veröffentlicht!');b.style.opacity='1';b.style.background='#dcfce7';b.style.borderColor='#16a34a';b.style.color='#166534';});
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

  // --- Post (erneut) als Tagesinfo-Push senden ---
  window.socialRepush=function(postId,btn){
    var doPush=function(){
      var _orig=btn?btn.innerHTML:'';
      if(btn){btn.disabled=true;btn.style.opacity='.6';btn.innerHTML='\u23F3 Sende\u2026';}
      fetch(API+'/social-post',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({_action:'push',id:postId})})
        .then(function(r){if(!r.ok)throw new Error('Fehler ('+r.status+')');return r.json();})
        .then(function(res){
          var sent=(typeof res.sent==='number')?res.sent:null;
          var msg=sent!==null?('\u2705 Push gesendet ('+sent+' Empf\u00e4nger'+(res.failed?', '+res.failed+' fehlgeschlagen':'')+')'):'\u2705 Push ausgel\u00f6st';
          socialStatus('soc-post-status',msg,true);
          if(typeof socialLoadTodayPosts==='function')socialLoadTodayPosts();
        })
        .catch(function(e){socialStatus('soc-post-status','\u274C '+e.message,false);if(btn){btn.disabled=false;btn.style.opacity='';btn.innerHTML=_orig;}});
    };
    if(typeof dlConfirm==='function'){
      dlConfirm({icon:'bell-ring',title:'Tagesinfo-Push senden?',msg:'Alle Tagesinfo-Abonnenten erhalten eine Push-Benachrichtigung f\u00fcr diesen Post.',ok:'Push senden',cancel:'Abbrechen',color:'#7c3aed'},doPush);
    } else { doPush(); }
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
        var pushCount=parseInt(p.push_count||0,10)||0;
        var lastPush=timeStr(p.last_push_at)||'';
        // Card container
        html+='<div style="border-left:3px solid '+borderColor+';border-radius:8px;padding:8px 10px;margin-bottom:6px;background:#fff;box-shadow:0 1px 3px rgba(0,0,0,.06);transition:box-shadow .15s" onmouseenter="this.style.boxShadow=\'0 2px 8px rgba(0,0,0,.1)\'" onmouseleave="this.style.boxShadow=\'0 1px 3px rgba(0,0,0,.06)\'">';
        // Header row: status icon + title + time + actions
        html+='<div style="display:flex;align-items:center;gap:6px">';
        if(isDraft) html+='<span title="Entwurf" style="flex-shrink:0">'+lucideIcon('file-edit',14,'#f59e0b')+'</span>';
        else html+='<span title="Ver\u00f6ffentlicht" style="flex-shrink:0">'+lucideIcon('check-circle',14,'#22c55e')+'</span>';
        html+='<span style="font-weight:600;font-size:12px;color:#1f2937;flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">'+M.esc(p.titel||'Post')+'</span>';
        if(zeit) html+='<span style="font-size:10px;color:#9ca3af;white-space:nowrap">'+M.esc(zeit)+'</span>';
        html+='</div>';
        // Push-Status Badge
        if(!isDraft){
          html+='<div style="margin-top:5px">';
          if(pushCount>0){
            html+='<span title="Als Tagesinfo-Push gesendet'+(lastPush?' um '+M.esc(lastPush):'')+'" style="display:inline-flex;align-items:center;gap:3px;font-size:10px;font-weight:600;background:#f0fdf4;color:#16a34a;border:1px solid #bbf7d0;padding:1px 7px;border-radius:10px">'+lucideIcon('bell',11,'#16a34a')+' gepusht'+(pushCount>1?' \u00d7'+pushCount:'')+(lastPush?' \u00b7 '+M.esc(lastPush):'')+'</span>';
          } else {
            html+='<span title="Wurde noch nicht als Push gesendet" style="display:inline-flex;align-items:center;gap:3px;font-size:10px;font-weight:600;background:#f9fafb;color:#9ca3af;border:1px solid #e5e7eb;padding:1px 7px;border-radius:10px">'+lucideIcon('bell-off',11,'#9ca3af')+' nicht gepusht</span>';
          }
          html+='</div>';
        }
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
        } else {
          var pushLabel=pushCount>0?'Erneut pushen':'Push senden';
          html+='<button onclick="socialRepush(\''+pid+'\',this)" title="Tagesinfo-Push an Abonnenten senden" style="display:inline-flex;align-items:center;gap:3px;font-size:10px;padding:3px 8px;background:#f5f3ff;border:1px solid #ddd6fe;border-radius:6px;cursor:pointer;color:#7c3aed;font-weight:600">'+lucideIcon('bell-ring',12)+' '+pushLabel+'</button>';
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
      var now=socialPosterDate();var days=['SONNTAG','MONTAG','DIENSTAG','MITTWOCH','DONNERSTAG','FREITAG','SAMSTAG'];ty2+=38;ctx.fillStyle='#374151';ctx.font='bold 22px "Segoe UI",system-ui,sans-serif';ctx.fillText(days[now.getDay()],W/2,ty2);
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
