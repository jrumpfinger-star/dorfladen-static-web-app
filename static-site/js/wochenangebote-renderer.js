window.WochenangeboteRenderer = (function () {
  'use strict';
  var priceFontPromise;
  function loadPriceFont() {
    if (!priceFontPromise) {
      priceFontPromise = new FontFace('Anton', 'url("/fonts/Anton-Regular.ttf")').load().then(function (font) {
        document.fonts.add(font);
      }, function (error) {
        priceFontPromise = null; throw error;
      });
    }
    return priceFontPromise;
  }
  var TAG_PRESETS={
    'classic-red-rect':{tagColor:'#a51d2d',tagShape:'rect',tagRadius:0},
    'green-rounded':{tagColor:'#3d7a4a',tagShape:'rounded',tagRadius:16},
    'dark-pill':{tagColor:'#1e293b',tagShape:'pill',tagRadius:0},
    'gold-banner':{tagColor:'#b8860b',tagShape:'banner',tagRadius:0},
    'blue-circle':{tagColor:'#1d4ed8',tagShape:'circle',tagRadius:0},
    'orange-star':{tagColor:'#ea580c',tagShape:'star',tagRadius:0},
    'purple-hexagon':{tagColor:'#7c3aed',tagShape:'hexagon',tagRadius:0},
    'teal-ticket':{tagColor:'#0d9488',tagShape:'ticket',tagRadius:0},
    'rose-diamond':{tagColor:'#e11d48',tagShape:'diamond',tagRadius:0},
    'copper-explosion':{tagColor:'#b45309',tagShape:'explosion',tagRadius:0},
    'price-image':{tagColor:'#ed1c24',tagShape:'price-image',tagRadius:0}
  };
  function drawPriceImage(ctx, element, item, layout) {
    var euros = Math.floor(item.price_cents / 100) + '.', cents = String(item.price_cents % 100).padStart(2, '0');
    var comparison = item.old_price_cents > item.price_cents;
    var font = '"Anton"';
    ctx.save(); ctx.beginPath(); ctx.rect(0, 0, element.w, element.h); ctx.clip();
    var decoration=layout.decoration||{},skew=(decoration.price_skew||0)/100;
    ctx.translate(element.w/2,element.h/2);ctx.scale(element.w/(element.w+Math.abs(skew)*element.h),1);
    ctx.transform(1,0,-skew,1,0,0);ctx.translate(-element.w/2,-element.h/2);
    ctx.font = '160px ' + font;
    var euroWidth = ctx.measureText(euros).width;
    ctx.font = '82px ' + font;
    var centsX = euroWidth - 4;
    var width = centsX + ctx.measureText(cents).width + 16, height = comparison ? 218 : 164;
    var fit = Math.min(element.w / width, element.h / height, element.font_size / 160);
    var left = element.align === 'right' ? element.w - width * fit : element.align === 'center' ? (element.w - width * fit) / 2 : 0;
    ctx.translate(left, (element.h - height * fit) / 2); ctx.scale(fit, fit);
    ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic'; ctx.lineJoin = 'round';
    ctx.strokeStyle = layout.price_outline_color || '#ffffff'; ctx.lineWidth = 10;
    ctx.fillStyle = layout.color || '#ed1c24';
    ctx.font = '160px ' + font;
    ctx.strokeText(euros, 8, 150); ctx.fillText(euros, 8, 150);
    ctx.font = '82px ' + font;
    ctx.strokeText(cents, centsX, 84); ctx.fillText(cents, centsX, 84);
    if (comparison) {
      ctx.fillStyle = layout.price_background || '#fff000';
      ctx.beginPath();
      if(decoration.price_radius)ctx.roundRect(4,168,width-8,50,Math.min(25,decoration.price_radius));
      else {ctx.moveTo(12,174);ctx.lineTo(width-4,168);ctx.lineTo(width-12,212);ctx.lineTo(4,218);ctx.closePath();}
      ctx.fill();
      var old = (item.old_price_cents / 100).toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' €';
      font = '"' + element.font + '"';
      ctx.font = 'bold 32px ' + font;
      var oldSize = Math.min(32, 32 * (width - 36) / ctx.measureText(old).width);
      ctx.font = 'bold ' + oldSize + 'px ' + font; ctx.textAlign = 'center';
      ctx.fillStyle = layout.old_price_color || '#000000';
      ctx.fillText(old, width / 2, 204);
      ctx.strokeStyle = layout.price_strike_color || '#ed1c24'; ctx.lineWidth = 5;
      ctx.beginPath(); ctx.moveTo(18, 182); ctx.lineTo(width - 18, 210); ctx.stroke();
    }
    ctx.restore();
  }
  function drawCmsPriceImage(ctx,item,cfg,x,y,w,h,rotation){
    if(cfg.tagShape!=='price-image')return false;
    ctx.save();ctx.translate(x+w/2,y+h/2);ctx.rotate((rotation||0)*Math.PI/180);ctx.translate(-w/2,-h/2);
    drawPriceImage(ctx,{w:w,h:h,font:'Arial',font_size:160,align:'center'},{
      price_cents:Math.round(Number(item.preis)*100),old_price_cents:Math.round(Number(item.statt_preis)*100)
    },{
      color:cfg.priceImageColor,price_outline_color:cfg.priceOutlineColor,
      price_background:cfg.priceStripColor,old_price_color:cfg.priceOldColor,price_strike_color:cfg.priceStrikeColor,
      decoration:{price_skew:cfg.tagSkew,price_radius:cfg.tagRadius}
    });
    ctx.restore();return true;
  }
  function drawLeafDecoration(ctx,x,y,size,color,lineWidth){
    ctx.save();ctx.translate(x,y);ctx.rotate(-0.4);ctx.fillStyle=color;ctx.globalAlpha=1;
    ctx.beginPath();ctx.moveTo(0,0);
    ctx.bezierCurveTo(size*0.3,-size*0.6,size*0.7,-size*0.6,size,0);
    ctx.bezierCurveTo(size*0.7,size*0.6,size*0.3,size*0.6,0,0);ctx.fill();
    ctx.strokeStyle=color;ctx.lineWidth=lineWidth||1;ctx.globalAlpha=0.6;
    ctx.beginPath();ctx.moveTo(0,0);ctx.lineTo(size*0.9,0);ctx.stroke();ctx.restore();
  }
  var CFG_DEFAULTS={
    bgColor:'#f4f1ea',tagColor:'#a51d2d',leafColor:'#4a7c3f',titleColor:'#a51d2d',decoFooterColor:'#8aad7e',
    imgRotation:15,imgFreistellen:true,imgThreshold:230,imgMaxScale:4,
    priceFontFlyer:72,priceFontPlakat:36,stattColor:'#555555',tagSkew:18,tagShape:'rect',tagRadius:0,tagPreset:'',
    showLeaf:false,leafSize:34,showBag:false,showTexture:true,
    savingsMarkerType:'starburst',savingsPalette:'harmonie',
    savingsScalePlakat:95,savingsScaleFlyer:120,
    plakatTemplate:'classic-red',flyerTemplate:'classic-red',
    plakat_inline:{},flyer_inline:{},
    plakat_nameFont:'Arial',plakat_nameSize:0,plakat_nameColor:'#1a1a1a',
    flyer_nameFont:'Arial',flyer_nameSize:0,flyer_nameColor:'#1a1a1a',
    plakat_tagPreset:'',plakat_tagShape:'rect',plakat_tagRadius:0,plakat_tagSkew:18,plakat_tagScale:100,
    plakat_priceImageColor:'#ed1c24',plakat_priceOutlineColor:'#ffffff',plakat_priceStripColor:'#fff000',plakat_priceOldColor:'#000000',plakat_priceStrikeColor:'#ed1c24',
    plakat_decoLeafColor:'#4a7c3f',plakat_decoTitleColor:'#a51d2d',plakat_decoBgColor:'#f4f1ea',plakat_decoFooterColor:'#8aad7e',plakat_vorratColor:'#888888',
    plakat_showLeaf:false,plakat_leafSize:34,plakat_showBag:false,plakat_showTexture:true,plakat_imgScale:100,
    flyer_tagPreset:'',flyer_tagShape:'rect',flyer_tagRadius:0,flyer_tagSkew:18,flyer_tagScale:100,
    flyer_priceImageColor:'#ed1c24',flyer_priceOutlineColor:'#ffffff',flyer_priceStripColor:'#fff000',flyer_priceOldColor:'#000000',flyer_priceStrikeColor:'#ed1c24',
    flyer_decoLeafColor:'#4a7c3f',flyer_decoTitleColor:'#a51d2d',flyer_decoBgColor:'#f4f1ea',flyer_decoFooterColor:'#8aad7e',flyer_vorratColor:'#888888',
    flyer_showLeaf:false,flyer_leafSize:34,flyer_showBag:false,flyer_showTexture:true,flyer_imgScale:100,
    flyer_imgAnchorX:10,flyer_imgAnchorY:10,flyer_priceAnchorX:10,flyer_priceAnchorY:10,
    flyer_imgWidthPct:50,
    plakat_borderWidth:0,plakat_borderColor:'#2e7d32',
    flyer_borderWidth:0,flyer_borderColor:'#2e7d32'
  };

  var PERSEC_COLORS=['decoLeafColor','decoTitleColor','decoBgColor','decoFooterColor','vorratColor','borderColor',
    'priceImageColor','priceOutlineColor','priceStripColor','priceOldColor','priceStrikeColor','nameColor'];

  var PERSEC_RANGES=['tagRadius','tagSkew','leafSize','tagScale','imgScale','imgAnchorX','imgAnchorY','priceAnchorX','priceAnchorY','imgWidthPct','borderWidth','nameSize'];

  var PERSEC_CHECKS=['showLeaf','showBag','showTexture'];

  var PERSEC_SELECTS=['tagPreset','tagShape','nameFont'];

  var PERSEC_COLOR_MAP={decoLeafColor:'leafColor',decoTitleColor:'titleColor',decoBgColor:'bgColor',decoFooterColor:'decoFooterColor'};

  var TPL_COLOR_DEFAULTS={
    'classic-red':{bgColor:'#f4f1ea',titleColor:'#a51d2d',tagColor:'#a51d2d',cardBg:'#ffffff',cardBorder:'#eeeeee',textColor:'#1a1a1a',detailsColor:'#444444',imgBg:'#faf9f6'},
    'minimal-clean':{bgColor:'#ffffff',titleColor:'#111827',tagColor:'#047857',cardBg:'#ffffff',cardBorder:'#e5e7eb',textColor:'#1a1a1a',detailsColor:'#444444',imgBg:'#f9fafb'},
    'dark-modern':{bgColor:'#0f172a',titleColor:'#e5e7eb',tagColor:'#0ea5e9',cardBg:'#f5f5f5',cardBorder:'#94a3b8',textColor:'#111827',detailsColor:'#334155',imgBg:'#e2e8f0'},
    'organic-market':{bgColor:'#f7f2e7',titleColor:'#355e3b',tagColor:'#8b1e3f',cardBg:'#fffdf8',cardBorder:'#e9dfcf',textColor:'#2f3d2f',detailsColor:'#6b5b48',imgBg:'#faf5eb'},
    'bold-poster':{bgColor:'#fff7ed',titleColor:'#b91c1c',tagColor:'#ea580c',cardBg:'#fffaf2',cardBorder:'#fdba74',textColor:'#7c2d12',detailsColor:'#9a3412',imgBg:'#fff5e6'},
    'modern-magazine':{bgColor:'#edf4ea',titleColor:'#5e7057',tagColor:'#6f835f',cardBg:'#f6fbf5',cardBorder:'#d2e0cf',textColor:'#2c3a2a',detailsColor:'#5b6d54',imgBg:'#eef5eb'},
    'modern-mag-fresh':{bgColor:'#e8f6f8',titleColor:'#0e7490',tagColor:'#0891b2',cardBg:'#f0fdfa',cardBorder:'#a7f3d0',textColor:'#134e4a',detailsColor:'#4d7c6e',imgBg:'#ecfdf5'},
    'modern-mag-bold':{bgColor:'#faf5ff',titleColor:'#7c3aed',tagColor:'#db2777',cardBg:'#fefcff',cardBorder:'#e9d5ff',textColor:'#1e1b4b',detailsColor:'#6b21a8',imgBg:'#f5f3ff'},
    'modern-mag-xl':{bgColor:'#f0f4f8',titleColor:'#1e40af',tagColor:'#2563eb',cardBg:'#ffffff',cardBorder:'#bfdbfe',textColor:'#1e293b',detailsColor:'#475569',imgBg:'#eff6ff'}
  };

  var TPL_COLOR_KEYS=['bgColor','titleColor','tagColor','cardBg','cardBorder','textColor','detailsColor','imgBg'];

  var TPL_GRAD_KEYS=['bgColor','imgBg'];

  function create(env) {
    var cfgGet=env.cfgGet, flyerArtOverrideGet=env.flyerArtOverrideGet;
    var plakatArtOverrideGet=env.plakatArtOverrideGet;
    function logoElement() {
      return env.logo ? {src:env.logo} : document.querySelector('#cms-app img[src^="data:image"]');
    }
  function cfgForKind(cfg,kind){
    if(!kind)return cfg;
    var c=Object.assign({},cfg);
    PERSEC_COLORS.forEach(function(k){var v=c[kind+'_'+k];if(v!=null)c[PERSEC_COLOR_MAP[k]||k]=v;});
    PERSEC_RANGES.forEach(function(k){var v=c[kind+'_'+k];if(v!=null)c[k]=v;});
    PERSEC_CHECKS.forEach(function(k){var v=c[kind+'_'+k];if(v!=null)c[k]=v;});
    PERSEC_SELECTS.forEach(function(k){var v=c[kind+'_'+k];if(v!=null)c[k]=v;});
    return c;
  }

  function getOfferTemplate(kind,cfg){
    var raw=kind==='flyer'?(cfg.flyerTemplate||'classic-red'):(cfg.plakatTemplate||'classic-red');
    var tpl=(raw||'classic-red').toLowerCase();
    var ok={
      'classic-red':1,
      'minimal-clean':1,
      'dark-modern':1,
      'organic-market':1,
      'bold-poster':1,
      'modern-magazine':1,
      'modern-mag-fresh':1,
      'modern-mag-bold':1,
      'modern-mag-xl':1
    };
    return ok[tpl]?tpl:'classic-red';
  }

  function getTplColors(tplName,cfg,kind){
    var defaults=TPL_COLOR_DEFAULTS[tplName]||TPL_COLOR_DEFAULTS['classic-red'];
    // Look up kind-prefixed key first (e.g. 'plakat:classic-red'), fall back to legacy non-prefixed key
    var tc=cfg.tplColors||{};
    var overrides=(kind&&tc[kind+':'+tplName])||tc[tplName]||{};
    var result={};
    TPL_COLOR_KEYS.forEach(function(k){result[k]=overrides[k]||defaults[k];});
    TPL_GRAD_KEYS.forEach(function(k){
      result[k+'_grad']=overrides[k+'_grad']||false;
      result[k+'_c2']=overrides[k+'_c2']||defaults[k];
      result[k+'_dir']=overrides[k+'_dir']||'to bottom';
      result[k+'_pct']=overrides[k+'_pct']!=null?overrides[k+'_pct']:50;
    });
    return result;
  }

  function tplGradFill(ctx,theme,key,x,y,w,h){
    if(!theme[key+'_grad'])return theme[key];
    var dir=theme[key+'_dir']||'to bottom',c1=theme[key],c2=theme[key+'_c2']||c1,pct=theme[key+'_pct']!=null?theme[key+'_pct']:50;
    var x0=x,y0=y,x1=x,y1=y+h;
    if(dir==='to right'){x1=x+w;y1=y;}
    else if(dir==='to bottom right'||dir==='135deg'){x1=x+w;y1=y+h;}
    var g=ctx.createLinearGradient(x0,y0,x1,y1);
    g.addColorStop(0,c1);g.addColorStop(pct/100,c1);g.addColorStop(1,c2);
    return g;
  }

  function getOfferTheme(kind,cfg){
    var tpl=getOfferTemplate(kind,cfg);
    var colors=getTplColors(tpl,cfg,kind);
    var base={
      tpl:tpl,
      bgColor:colors.bgColor,
      titleColor:colors.titleColor,
      titleFont:'900 60px Arial Black, Arial, sans-serif',
      titleY:72,
      dateColor:'#1a1a1a',
      dateFont:'900 22px Arial, sans-serif',
      cardBg:colors.cardBg,
      cardBorder:colors.cardBorder,
      cardRadius:kind==='flyer'?32:28,
      textColor:colors.textColor,
      detailsColor:colors.detailsColor,
      footerColor:cfg.decoFooterColor||'#1a1a1a',
      tagColor:colors.tagColor,
      imgBg:colors.imgBg||colors.cardBg,
      bgColor_grad:colors.bgColor_grad,bgColor_c2:colors.bgColor_c2,bgColor_dir:colors.bgColor_dir,bgColor_pct:colors.bgColor_pct,
      imgBg_grad:colors.imgBg_grad,imgBg_c2:colors.imgBg_c2,imgBg_dir:colors.imgBg_dir,imgBg_pct:colors.imgBg_pct,
      showTexture:cfg.showTexture,
      // Extended theme keys for full configurability
      headerBg:null, headerAccent:null, dividerColor:null,
      priceBarBg:null, priceBarBorder:null, stattColor:null,
      borderWidth:cfg.borderWidth||0, borderColor:cfg.borderColor||'#000000',
      vorratColor:cfg.vorratColor||'#888888'
    };
    if(tpl==='minimal-clean'){
      base.dateColor='#374151';base.cardRadius=kind==='flyer'?20:18;
      base.showTexture=false;base.titleFont='900 54px Arial Black, Arial, sans-serif';
    }else if(tpl==='dark-modern'){
      base.dateColor='#93c5fd';base.footerColor='#e5e7eb';
      base.showTexture=false;base.titleFont='900 56px Arial Black, Arial, sans-serif';
    }else if(tpl==='organic-market'){
      base.dateColor='#7a6a55';base.footerColor='#6b5b48';
      base.cardRadius=kind==='flyer'?36:30;base.titleFont='900 58px Arial, sans-serif';
    }else if(tpl==='bold-poster'){
      base.dateColor='#7c2d12';base.footerColor='#7c2d12';
      base.cardRadius=kind==='flyer'?24:22;base.titleFont='900 62px Arial Black, Arial, sans-serif';
    }else if(tpl==='modern-magazine'){
      base.dateColor='#4b5f45';base.footerColor='#4e5f47';
      base.cardRadius=kind==='flyer'?34:30;base.titleFont='900 56px Arial Black, Arial, sans-serif';
      base.showTexture=false;
      base.headerBg='#d6e5d0';base.headerAccent='#8aad7e';
      base.dividerColor='#e2eade';
      base.priceBarBg='#eaf3e6';base.priceBarBorder='#c5dbbe';
      base.stattColor='#8a9e80';
    }else if(tpl==='modern-mag-fresh'){
      base.dateColor='#155e75';base.footerColor='#0e7490';
      base.cardRadius=kind==='flyer'?34:30;base.titleFont='900 56px Arial Black, Arial, sans-serif';
      base.showTexture=false;
      base.headerBg='#cffafe';base.headerAccent='#06b6d4';
      base.dividerColor='#a5f3fc';
      base.priceBarBg='#ecfeff';base.priceBarBorder='#67e8f9';
      base.stattColor='#0891b2';
    }else if(tpl==='modern-mag-bold'){
      base.dateColor='#581c87';base.footerColor='#7c3aed';
      base.cardRadius=kind==='flyer'?34:30;base.titleFont='900 56px Arial Black, Arial, sans-serif';
      base.showTexture=false;
      base.headerBg='#ede9fe';base.headerAccent='#8b5cf6';
      base.dividerColor='#ddd6fe';
      base.priceBarBg='#f5f3ff';base.priceBarBorder='#c4b5fd';
      base.stattColor='#7c3aed';
    }else if(tpl==='modern-mag-xl'){
      base.dateColor='#1e3a5f';base.footerColor='#1e40af';
      base.cardRadius=kind==='flyer'?34:30;base.titleFont='900 56px Arial Black, Arial, sans-serif';
      base.showTexture=false;
      base.headerBg='#dbeafe';base.headerAccent='#3b82f6';
      base.dividerColor='#bfdbfe';
      base.priceBarBg='#eff6ff';base.priceBarBorder='#93c5fd';
      base.stattColor='#2563eb';
      base.imgZonePct=0.65;
    }
    // ── Apply per-section deco color overrides on top of template defaults ──
    // cfg already has per-section values merged by cfgForKind, check against per-section defaults
    var secPfx=kind?kind+'_':'';
    var rawBg=cfg[secPfx+'decoBgColor']||cfg.bgColor;
    var rawTitle=cfg[secPfx+'decoTitleColor']||cfg.titleColor;
    var rawFooter=cfg[secPfx+'decoFooterColor']||cfg.decoFooterColor;
    var defBg=CFG_DEFAULTS[secPfx+'decoBgColor']||CFG_DEFAULTS.bgColor;
    var defTitle=CFG_DEFAULTS[secPfx+'decoTitleColor']||CFG_DEFAULTS.titleColor;
    var defFooter=CFG_DEFAULTS[secPfx+'decoFooterColor']||CFG_DEFAULTS.decoFooterColor;
    if(rawBg && rawBg!==defBg){base.bgColor=rawBg;if(base.headerBg)base.headerBg=rawBg;}
    if(rawTitle && rawTitle!==defTitle) base.titleColor=rawTitle;
    if(cfg.leafColor) base.leafColor=cfg.leafColor;
    if(rawFooter && rawFooter!==defFooter){
      base.footerColor=rawFooter;
      if(base.headerAccent) base.headerAccent=rawFooter;
    }
    return base;
  }

  function wrapTextCMS(ctx,text,maxW){
    if(!text)return[''];
    var words=text.split(' '),lines=[],line='';
    words.forEach(function(w){var test=line?line+' '+w:w;if(ctx.measureText(test).width>maxW&&line){lines.push(line);line=w;}else{line=test;}});
    if(line)lines.push(line);return lines;
  }

  function drawNameGroup(ctx,item,cfg,x,y,w,fontSize,detailSize,override,metadata){
    var ov=override||{},size=cfg.nameSize||fontSize,font='"'+(cfg.nameFont||'Arial')+'"',step=size*1.2;
    ctx.save();ctx.font='900 '+size+'px '+font;
    var names=wrapTextCMS(ctx,item.produkt||'Produkt',w);
    ctx.font='600 '+detailSize+'px '+font;
    var details=item.details?wrapTextCMS(ctx,item.details,w):[];
    var h=names.length*step+(details.length?4+details.length*detailSize*1.2:0),top=y-size;
    var scale=(ov.nameScale||100)/100,dx=ov.nameDx||0,dy=ov.nameDy||0;
    ctx.translate(x+w/2+dx,top+h/2+dy);ctx.rotate((ov.nameRot||0)*Math.PI/180);ctx.scale(scale,scale);ctx.translate(-w/2,-h/2);
    ctx.textAlign='left';ctx.textBaseline='alphabetic';ctx.fillStyle=cfg.nameColor||'#1a1a1a';ctx.font='900 '+size+'px '+font;
    names.forEach(function(line,index){ctx.fillText(line,0,size+index*step);});
    ctx.font='600 '+detailSize+'px '+font;
    details.forEach(function(line,index){ctx.fillText(line,0,names.length*step+4+detailSize+index*detailSize*1.2);});
    ctx.restore();
    metadata.push({id:'name',itemKey:item.key,label:'Bezeichnung und Zusatztext',ovKey:'name',
      x:x+dx+w*(1-scale)/2,y:top+dy+h*(1-scale)/2,w:w*scale,h:h*scale});
    return y+h;
  }
  function drawTagShapePath(ctx,w,h,shape,radius){
    var hw=w/2,hh=h/2,r=Math.min(radius,hw,hh);
    ctx.beginPath();
    if(shape==='circle'){
      var cr=Math.max(hw,hh);
      ctx.arc(0,0,cr,0,Math.PI*2);
    }else if(shape==='pill'){
      var pr=hh;
      ctx.moveTo(-hw+pr,   -hh);ctx.lineTo(hw-pr, -hh);
      ctx.arc(hw-pr, 0, pr, -Math.PI/2, Math.PI/2);
      ctx.lineTo(-hw+pr, hh);
      ctx.arc(-hw+pr, 0, pr, Math.PI/2, -Math.PI/2);
    }else if(shape==='banner'){
      var notch=hw*0.12;
      ctx.moveTo(-hw,-hh);ctx.lineTo(hw,-hh);ctx.lineTo(hw,hh);
      ctx.lineTo(0,hh-notch);ctx.lineTo(-hw,hh);
    }else if(shape==='star'){
      var spikes=5,outerR=Math.max(hw,hh),innerR=outerR*0.5;
      var rot=Math.PI/2*3,step=Math.PI/spikes;
      ctx.moveTo(0,-outerR);
      for(var si=0;si<spikes;si++){
        ctx.lineTo(Math.cos(rot)*outerR,Math.sin(rot)*outerR);rot+=step;
        ctx.lineTo(Math.cos(rot)*innerR,Math.sin(rot)*innerR);rot+=step;
      }
    }else if(shape==='hexagon'){
      for(var hi=0;hi<6;hi++){
        var ha=Math.PI/3*hi-Math.PI/6;
        var hx=hw*Math.cos(ha),hy=hh*Math.sin(ha);
        if(hi===0)ctx.moveTo(hx,hy);else ctx.lineTo(hx,hy);
      }
    }else if(shape==='diamond'){
      ctx.moveTo(0,-hh);ctx.lineTo(hw,0);ctx.lineTo(0,hh);ctx.lineTo(-hw,0);
    }else if(shape==='ticket'){
      var tn=hh*0.22;
      ctx.moveTo(-hw,-hh);ctx.lineTo(hw,-hh);ctx.lineTo(hw,-tn);
      ctx.arc(hw,0,tn,Math.PI*1.5,Math.PI*0.5,true);
      ctx.lineTo(hw,hh);ctx.lineTo(-hw,hh);ctx.lineTo(-hw,tn);
      ctx.arc(-hw,0,tn,Math.PI*0.5,Math.PI*1.5,true);
    }else if(shape==='explosion'){
      var eSpikes=12,eOuter=Math.max(hw,hh),eInner=eOuter*0.72;
      var eRot=-Math.PI/2,eStep=Math.PI/eSpikes;
      ctx.moveTo(Math.cos(eRot)*eOuter,Math.sin(eRot)*eOuter);
      for(var ei=0;ei<eSpikes;ei++){
        eRot+=eStep;ctx.lineTo(Math.cos(eRot)*eInner,Math.sin(eRot)*eInner);
        eRot+=eStep;ctx.lineTo(Math.cos(eRot)*eOuter,Math.sin(eRot)*eOuter);
      }
    }else if(shape==='trapez'){
      var tInset=hw*0.22;
      ctx.moveTo(-hw,-hh);ctx.lineTo(hw,-hh);ctx.lineTo(hw-tInset,hh);ctx.lineTo(-hw+tInset,hh);
    }else if(shape==='rounded'||r>0){
      var rr=shape==='rounded'?Math.min(radius||16,hw,hh):r;
      ctx.moveTo(-hw+rr,-hh);ctx.lineTo(hw-rr,-hh);ctx.quadraticCurveTo(hw,-hh,hw,-hh+rr);
      ctx.lineTo(hw,hh-rr);ctx.quadraticCurveTo(hw,hh,hw-rr,hh);
      ctx.lineTo(-hw+rr,hh);ctx.quadraticCurveTo(-hw,hh,-hw,hh-rr);
      ctx.lineTo(-hw,-hh+rr);ctx.quadraticCurveTo(-hw,-hh,-hw+rr,-hh);
    }else{
      ctx.rect(-hw,-hh,w,h);
    }
    ctx.closePath();
  }

  function fillTagShape(ctx,w,h,cfg){
    drawTagShapePath(ctx,w,h,cfg.tagShape||'rect',cfg.tagRadius||0);
    ctx.fill();
  }
  function drawPriceBackground(ctx,cfg,x,y,w,h){
    var skew=(cfg.tagSkew||0)/100;
    ctx.save();ctx.translate(x+w/2,y+h/2);ctx.scale(w/(w+Math.abs(skew)*h),1);ctx.transform(1,0,-skew,1,0,0);
    ctx.fillStyle=cfg.priceStripColor;ctx.strokeStyle=cfg.priceOutlineColor;ctx.lineWidth=1;
    var square=['circle','star','explosion'].indexOf(cfg.tagShape)>=0,side=Math.min(w,h);
    drawTagShapePath(ctx,square?side:w,square?side:h,cfg.tagShape,cfg.tagRadius);ctx.fill();ctx.stroke();ctx.restore();
  }

  function _freistellCanvas(imgEl, cfg){
    var ofc=document.createElement('canvas');ofc.width=imgEl.width;ofc.height=imgEl.height;
    var ox=ofc.getContext('2d');ox.drawImage(imgEl,0,0);
    if(cfg.imgFreistellen){
      try{var id=ox.getImageData(0,0,ofc.width,ofc.height),d=id.data;
      var thr=cfg.imgThreshold,fade=30;
      for(var pi=0;pi<d.length;pi+=4){var mn=Math.min(d[pi],d[pi+1],d[pi+2]);if(mn>thr)d[pi+3]=0;else if(mn>thr-fade)d[pi+3]=Math.round(255*(thr-mn)/fade);}
      ox.putImageData(id,0,0);}catch(e){}
    }
    return ofc;
  }

  function flyerArtOverrideDefault(){
    return {imgDx:0,imgDy:0,imgScale:100,imgRot:0,priceDx:0,priceDy:0,priceScale:100,discountDx:0,discountDy:0,discountScale:100,discountRot:0,old_priceDx:0,old_priceDy:0,old_priceScale:100,old_priceRot:0,ghostMode:'auto',ghostDx:150,ghostDy:-120,ghostAlpha:0.45,ghostScale:100,ghostRot:0,dupDx:-150,dupDy:100,dupOn:false,dupScale:100,dupRot:0,copies:[],customImg:null,customImgDx:0,customImgDy:0,customImgScale:100,customImgAlpha:100,customImgRot:0};
  }

  function plakatArtOverrideDefault(){
    return {imgDx:0,imgDy:0,imgScale:100,imgRot:0,priceDx:0,priceDy:0,discountDx:0,discountDy:0,discountScale:100,discountRot:0,old_priceDx:0,old_priceDy:0,old_priceScale:100,old_priceRot:0,ghostMode:'off',ghostDx:80,ghostDy:-60,ghostAlpha:0.50,ghostScale:100,ghostRot:0,dupOn:false,dupDx:-70,dupDy:50,dupScale:100,dupRot:0,copies:[]};
  }

  function drawExtraCopies(ctx,copies,ofc,imgX,imgY,iw,ih,baseRotRad,clipFn){
    if(!copies||!copies.length)return;
    copies.forEach(function(cp){
      var sc=(cp.scale||100)/100;var cw=iw*sc,ch=ih*sc;
      var cx2=imgX+(cp.dx||0),cy2=imgY+(cp.dy||0);
      var cRot=baseRotRad+((cp.rot||0)*Math.PI/180);
      ctx.save();
      if(clipFn)clipFn();
      if(cp.type==='ghost')ctx.globalAlpha=cp.alpha!=null?cp.alpha:0.35;
      if(cRot){ctx.translate(cx2+cw/2,cy2+ch/2);ctx.rotate(cRot);ctx.drawImage(ofc,-cw/2,-ch/2,cw,ch);}
      else{ctx.drawImage(ofc,cx2,cy2,cw,ch);}
      ctx.globalAlpha=1.0;ctx.restore();
    });
  }

  function drawExtraCopiesCenter(ctx,copies,ofc,imgCX,imgCY,iw,ih,baseRotRad,clipFn){
    if(!copies||!copies.length)return;
    copies.forEach(function(cp){
      var sc=(cp.scale||100)/100;var cw=iw*sc,ch=ih*sc;
      var cx2=imgCX+(cp.dx||0),cy2=imgCY+(cp.dy||0);
      var cRot=baseRotRad+((cp.rot||0)*Math.PI/180);
      ctx.save();
      if(clipFn)clipFn();
      if(cp.type==='ghost')ctx.globalAlpha=cp.alpha!=null?cp.alpha:0.35;
      ctx.translate(cx2,cy2);ctx.rotate(cRot);
      ctx.drawImage(ofc,-cw/2,-ch/2,cw,ch);
      ctx.globalAlpha=1.0;ctx.restore();
    });
  }

  function hdKontext(c,S){
    var ctx=c.getContext('2d');
    ctx.setTransform(S,0,0,S,0,0);
    if(S!==1){
      ['shadowBlur','shadowOffsetX','shadowOffsetY'].forEach(function(p){
        var d=Object.getOwnPropertyDescriptor(CanvasRenderingContext2D.prototype,p);
        if(!d||!d.set)return;
        Object.defineProperty(ctx,p,{
          get:function(){return d.get.call(ctx)/S;},
          set:function(v){d.set.call(ctx,v*S);},
          configurable:true
        });
      });
    }
    return ctx;
  }

  function hdLogoSrc(S){
    if(env.logo)return env.logo;
    if(S>1)return '/images/dorfladen-logo.png';
    var hdr=logoElement();
    return hdr?hdr.src:'/Logo-sm-64.png';
  }

  function truncText(ctx,text,maxW){
    if(ctx.measureText(text).width<=maxW)return text;
    while(text.length>0&&ctx.measureText(text+'...').width>maxW)text=text.slice(0,-1);
    return text+'...';
  }

  function loadItemImage(bildData){
    return new Promise(function(resolve){
      if(!bildData){resolve(null);return;}
      var img=new Image();
      if(bildData.indexOf('data:')!==0)img.crossOrigin='anonymous';
      img.onload=function(){resolve(img);};
      img.onerror=function(){resolve(null);};
      img.src=bildData;
    });
  }

  function getSavingsPercent(item){
    var preis=Number(item&&item.preis),statt=Number(item&&item.statt_preis);
    if(!isFinite(preis)||!isFinite(statt)||statt<=0||preis<=0||preis>=statt)return null;
    var pct=Math.round((1-(preis/statt))*100);
    return pct>0?pct:null;
  }

  function getSavingsBurstTheme(cfgOverride){
    var style='harmonie';
    try{
      var cfg=cfgOverride||cfgGet();
      style=(cfg&&cfg.savingsPalette?cfg.savingsPalette:(cfg&&cfg.savingsStarStyle?cfg.savingsStarStyle:'harmonie')).toLowerCase();
    }catch(e){
      style='harmonie';
    }
    if(style==='classic-red'||style==='red'||style==='classic'){
      return {name:'classic-red',g1:'#ff4b3a',g2:'#e11d1d',stroke:'rgba(255,255,255,0.65)',text:'#ffffff',textStroke:'rgba(0,0,0,0.3)'};
    }
    if(style==='warm-copper'||style==='copper'||style==='warm'){
      return {name:'warm-copper',g1:'#c77b3e',g2:'#9a5a2c',stroke:'rgba(255,244,220,0.7)',text:'#fff7ea',textStroke:'rgba(56,31,17,0.35)'};
    }
    if(style==='berry-purple'||style==='purple'||style==='berry'){
      return {name:'berry-purple',g1:'#8b5cf6',g2:'#6d28d9',stroke:'rgba(243,232,255,0.8)',text:'#ffffff',textStroke:'rgba(49,18,107,0.35)'};
    }
    if(style==='ocean-blue'||style==='blue'||style==='ocean'){
      return {name:'ocean-blue',g1:'#38bdf8',g2:'#0369a1',stroke:'rgba(224,242,254,0.8)',text:'#ffffff',textStroke:'rgba(8,47,73,0.38)'};
    }
    if(style==='sunset-orange'||style==='orange'||style==='sunset'){
      return {name:'sunset-orange',g1:'#fb923c',g2:'#c2410c',stroke:'rgba(255,237,213,0.8)',text:'#ffffff',textStroke:'rgba(67,20,7,0.35)'};
    }
    if(style==='fresh-lime'||style==='lime'||style==='fresh'){
      return {name:'fresh-lime',g1:'#a3e635',g2:'#4d7c0f',stroke:'rgba(236,252,203,0.8)',text:'#ffffff',textStroke:'rgba(26,46,5,0.38)'};
    }
    if(style==='deep-rose'||style==='rose'||style==='deep'){
      return {name:'deep-rose',g1:'#fb7185',g2:'#be123c',stroke:'rgba(255,228,230,0.8)',text:'#ffffff',textStroke:'rgba(76,5,25,0.35)'};
    }
    if(style==='midnight-gold'||style==='gold'||style==='midnight'){
      return {name:'midnight-gold',g1:'#fbbf24',g2:'#b45309',stroke:'rgba(254,243,199,0.8)',text:'#ffffff',textStroke:'rgba(69,26,3,0.4)'};
    }
    if(style==='arctic-teal'||style==='teal'||style==='arctic'){
      return {name:'arctic-teal',g1:'#2dd4bf',g2:'#0f766e',stroke:'rgba(204,251,241,0.8)',text:'#ffffff',textStroke:'rgba(4,47,46,0.38)'};
    }
    return {name:'harmonie',g1:'#72b38b',g2:'#3e7f61',stroke:'rgba(255,255,255,0.65)',text:'#ffffff',textStroke:'rgba(0,0,0,0.28)'};
  }

  function getSavingsMarkerType(cfgOverride){
    try{var c=cfgOverride||cfgGet();return (c&&c.savingsMarkerType?c.savingsMarkerType:'starburst');}catch(e){return 'starburst';}
  }

  function drawSavingsBurst(ctx,cx,cy,outerR,innerR,text,contextType,cfgOverride){
    var th=getSavingsBurstTheme(cfgOverride);
    var markerType=getSavingsMarkerType(cfgOverride);
    var scaleFactor=1;
    try{
      var c=cfgOverride||cfgGet();
      var key=(contextType==='flyer')?'savingsScaleFlyer':'savingsScalePlakat';
      scaleFactor=Math.max(0.8,Math.min(1.8,(Number(c[key])||100)/100));
    }catch(e){}
    outerR*=scaleFactor;innerR*=scaleFactor;
    // Textgröße bleibt; der Marker wächst, bis der ganze Text (z. B. "−12%") hineinpasst.
    var label=String(text||'');
    if(label.charAt(0)==='-') label='−'+label.slice(1); // typografisches Minus
    if(label.charAt(0)!=='−') label='−'+label;
    var textR=outerR,fontPx=Math.round(textR*0.74);
    ctx.save();
    ctx.font='900 '+fontPx+'px Arial Black, Arial, sans-serif';
    var textW=ctx.measureText(label).width+Math.max(2,Math.round(textR*0.11))+Math.round(textR*0.12);
    ctx.restore();
    var usable={badge:1.7,pill:2.1,flag:1.95,hexburst:1.5,diamond:1.0,shield:1.4,ribbon:2.15,explosion:1.5,heart:1.4}[markerType]||1.35;
    var grow=Math.max(1,Math.min(2.2,textW/(usable*outerR)));
    outerR*=grow;innerR*=grow;
    var spikes=10;
    var rot=-Math.PI/2;
    var step=Math.PI/spikes;
    ctx.save();
    if(markerType==='badge'){
      ctx.beginPath();ctx.arc(cx,cy,outerR,0,Math.PI*2);ctx.closePath();
    }else if(markerType==='pill'){
      var pw=outerR*2.3,ph=outerR*1.15,pr=ph/2;
      ctx.beginPath();
      ctx.moveTo(cx-pw/2+pr,cy-ph/2);
      ctx.lineTo(cx+pw/2-pr,cy-ph/2);
      ctx.quadraticCurveTo(cx+pw/2,cy-ph/2,cx+pw/2,cy-ph/2+pr);
      ctx.lineTo(cx+pw/2,cy+ph/2-pr);
      ctx.quadraticCurveTo(cx+pw/2,cy+ph/2,cx+pw/2-pr,cy+ph/2);
      ctx.lineTo(cx-pw/2+pr,cy+ph/2);
      ctx.quadraticCurveTo(cx-pw/2,cy+ph/2,cx-pw/2,cy+ph/2-pr);
      ctx.lineTo(cx-pw/2,cy-ph/2+pr);
      ctx.quadraticCurveTo(cx-pw/2,cy-ph/2,cx-pw/2+pr,cy-ph/2);
      ctx.closePath();
    }else if(markerType==='flag'){
      var fw=outerR*2.2,fh=outerR*1.25;
      ctx.translate(cx,cy);ctx.rotate(-0.14);
      ctx.beginPath();
      ctx.moveTo(-fw/2,-fh/2);
      ctx.lineTo(fw/2-10,-fh/2);
      ctx.lineTo(fw/2,0);
      ctx.lineTo(fw/2-10,fh/2);
      ctx.lineTo(-fw/2,fh/2);
      ctx.closePath();
      cx=0;cy=0;
    }else if(markerType==='hexburst'){
      var hSpikes=6,hRot=-Math.PI/2,hStep=Math.PI/hSpikes,hInner=outerR*0.7;
      ctx.beginPath();
      for(var hi=0;hi<hSpikes;hi++){
        ctx.lineTo(cx+Math.cos(hRot)*outerR,cy+Math.sin(hRot)*outerR);hRot+=hStep;
        ctx.lineTo(cx+Math.cos(hRot)*hInner,cy+Math.sin(hRot)*hInner);hRot+=hStep;
      }
      ctx.closePath();
    }else if(markerType==='diamond'){
      ctx.beginPath();
      ctx.moveTo(cx,cy-outerR);ctx.lineTo(cx+outerR*0.75,cy);
      ctx.lineTo(cx,cy+outerR);ctx.lineTo(cx-outerR*0.75,cy);
      ctx.closePath();
    }else if(markerType==='shield'){
      ctx.beginPath();
      ctx.moveTo(cx-outerR*0.8,cy-outerR*0.85);
      ctx.lineTo(cx+outerR*0.8,cy-outerR*0.85);
      ctx.lineTo(cx+outerR*0.8,cy+outerR*0.15);
      ctx.quadraticCurveTo(cx+outerR*0.8,cy+outerR*0.7,cx,cy+outerR);
      ctx.quadraticCurveTo(cx-outerR*0.8,cy+outerR*0.7,cx-outerR*0.8,cy+outerR*0.15);
      ctx.closePath();
    }else if(markerType==='ribbon'){
      var rw=outerR*2.4,rh=outerR*1.1,rNotch=outerR*0.25;
      ctx.translate(cx,cy);
      ctx.beginPath();
      ctx.moveTo(-rw/2,  -rh/2);
      ctx.lineTo( rw/2,  -rh/2);
      ctx.lineTo( rw/2,   rh/2);
      ctx.lineTo( 0,      rh/2-rNotch);
      ctx.lineTo(-rw/2,   rh/2);
      ctx.closePath();
      cx=0;cy=0;
    }else if(markerType==='explosion'){
      var eSpikes=16,eRot=-Math.PI/2,eStep=Math.PI/eSpikes,eInner=outerR*0.78;
      ctx.beginPath();
      for(var ei=0;ei<eSpikes;ei++){
        ctx.lineTo(cx+Math.cos(eRot)*outerR,cy+Math.sin(eRot)*outerR);eRot+=eStep;
        ctx.lineTo(cx+Math.cos(eRot)*eInner,cy+Math.sin(eRot)*eInner);eRot+=eStep;
      }
      ctx.closePath();
    }else if(markerType==='heart'){
      ctx.translate(cx,cy);
      var hs=outerR;
      ctx.beginPath();
      ctx.moveTo(0,-hs*0.45);
      ctx.bezierCurveTo(-hs*0.15,-hs*0.95,-hs,-hs,-hs,-hs*0.35);
      ctx.bezierCurveTo(-hs,hs*0.15,-hs*0.4,hs*0.5,0,hs*0.95);
      ctx.bezierCurveTo(hs*0.4,hs*0.5,hs,hs*0.15,hs,-hs*0.35);
      ctx.bezierCurveTo(hs,-hs,hs*0.15,-hs*0.95,0,-hs*0.45);
      ctx.closePath();
      cx=0;cy=0;
    }else{
      ctx.beginPath();
      for(var i=0;i<spikes;i++){
        var x1=cx+Math.cos(rot)*outerR, y1=cy+Math.sin(rot)*outerR;
        ctx.lineTo(x1,y1);rot+=step;
        var x2=cx+Math.cos(rot)*innerR, y2=cy+Math.sin(rot)*innerR;
        ctx.lineTo(x2,y2);rot+=step;
      }
      ctx.closePath();
    }
    var g=ctx.createLinearGradient(cx-outerR,cy-outerR,cx+outerR,cy+outerR);
    g.addColorStop(0,th.g1);
    g.addColorStop(1,th.g2);
    ctx.fillStyle=g;
    ctx.shadowColor='rgba(0,0,0,0.18)';ctx.shadowBlur=3;ctx.shadowOffsetX=2;ctx.shadowOffsetY=3;
    ctx.fill();
    // feiner Rand für bessere Lesbarkeit
    ctx.lineWidth=Math.max(1,Math.round(outerR*0.08));
    ctx.strokeStyle=th.stroke;
    ctx.stroke();
    ctx.shadowColor='transparent';
    var label2=label;
    ctx.fillStyle=th.text;
    ctx.textAlign='center';
    ctx.font='900 '+fontPx+'px Arial Black, Arial, sans-serif';
    var ty=cy+Math.round(textR*0.26);
    ctx.lineWidth=Math.max(2,Math.round(textR*0.11));
    ctx.strokeStyle=th.textStroke;
    ctx.strokeText(label2,cx,ty);
    ctx.fillText(label2,cx,ty);
    ctx.restore();
  }

  async function generateEinzelflyer(item,data,cfgOverride,opts){
    if(cfgForKind(cfgOverride||cfgGet(),'flyer').tagShape==='price-image')await loadPriceFont();
    return new Promise(function(resolve){
      var S=(opts&&opts.scale)||1;
      var W=794,H=1123;
      var _elMeta=[];
      var cfg=cfgForKind(cfgOverride||cfgGet(),'flyer');
      var theme=getOfferTheme('flyer',cfg);
      var c=document.createElement('canvas');c.width=Math.round(W*S);c.height=Math.round(H*S);
      var ctx=hdKontext(c,S);
      // ── Papier-Hintergrund (gleicher Stil wie Plakat) ──
      ctx.fillStyle=tplGradFill(ctx,theme,'bgColor',0,0,W,H);ctx.fillRect(0,0,W,H);
      if(theme.showTexture){ctx.globalAlpha=0.04;
      for(var ty=0;ty<1123;ty+=3){for(var tx=0;tx<794;tx+=3){
        if(Math.random()>0.5){ctx.fillStyle=Math.random()>0.5?'#000':'#fff';ctx.fillRect(tx,ty,2,2);}
      }}}
      ctx.globalAlpha=1.0;
      // ── Hilfsfunktion runde Ecken ──
      function rrect(rx,ry,rw,rh,r){
        ctx.beginPath();ctx.moveTo(rx+r,ry);ctx.lineTo(rx+rw-r,ry);ctx.quadraticCurveTo(rx+rw,ry,rx+rw,ry+r);
        ctx.lineTo(rx+rw,ry+rh-r);ctx.quadraticCurveTo(rx+rw,ry+rh,rx+rw-r,ry+rh);
        ctx.lineTo(rx+r,ry+rh);ctx.quadraticCurveTo(rx,ry+rh,rx,ry+rh-r);
        ctx.lineTo(rx,ry+r);ctx.quadraticCurveTo(rx,ry,rx+r,ry);ctx.closePath();
      }
      // ── Blatt-Deko ──
      function drawLeaf(lx,ly,sz){
        drawLeafDecoration(ctx,lx,ly,sz,cfg.leafColor,1);
      }
      var von=data.von?new Date(data.von).toLocaleDateString('de-DE',{day:'2-digit',month:'2-digit',year:'2-digit'}):'';
      var bis=data.bis?new Date(data.bis).toLocaleDateString('de-DE',{day:'2-digit',month:'2-digit',year:'2-digit'}):'';
      var logoLoaded=Promise.resolve();

      // ── Border helper (drawn last, on top of everything) ──
      function drawFlyerBorder(){
        var bw=theme.borderWidth;
        if(bw&&bw>0){
          ctx.save();ctx.strokeStyle=theme.borderColor||'#000';ctx.lineWidth=bw;
          ctx.strokeRect(bw/2,bw/2,W-bw,H-bw);ctx.restore();
        }
      }
      var artOv=Object.assign({},flyerArtOverrideDefault(),cfg.flyer_inline,flyerArtOverrideGet(item));
      var isMagLayout=theme.tpl==='modern-magazine'||theme.tpl==='modern-mag-fresh'||theme.tpl==='modern-mag-bold'||theme.tpl==='modern-mag-xl';
      if(isMagLayout){
        // ── Modern Magazine Einzelflyer: clean centered card layout ──
        ctx.fillStyle=tplGradFill(ctx,theme,'bgColor',0,0,W,H);ctx.fillRect(0,0,W,H);
        // Header bar
        ctx.fillStyle=theme.headerBg||'#d6e5d0';ctx.fillRect(0,0,W,140);
        ctx.fillStyle=theme.headerAccent||'#8aad7e';ctx.fillRect(0,138,W,3);

        // Date right (draw first so we know its width)
        ctx.fillStyle=theme.dateColor;ctx.font='900 24px Arial Black, Arial, sans-serif';
        var dateStr=von+' \u2013 '+bis;
        var dateW=ctx.measureText(dateStr).width;
        var dateRight=W-42;
        ctx.textAlign='right';
        ctx.fillText(dateStr,dateRight,82);
        ctx.font='700 18px Arial, sans-serif';
        ctx.fillText('Gültig:',dateRight,52);
        ctx.textAlign='left';
        var dateLeftEdge=dateRight-Math.max(dateW,ctx.measureText('Gültig:').width)-16;

        // Logo + 'Angebote' dominant (capped to not overlap date)
        var mgLogoEl=logoElement();
        var mgLogoP=new Promise(function(rl){
          if(!mgLogoEl){rl();return;}
          var li=new Image();li.onload=function(){
            var lh=80,lw=lh*(li.width/li.height);
            var maxLogoW=180;
            if(lw>maxLogoW){lh=lh*(maxLogoW/lw);lw=maxLogoW;}
            ctx.drawImage(li,28,30,lw,lh);
            // 'Angebote' dominant next to logo, capped before date
            var titleX=28+lw+16;
            ctx.fillStyle=theme.titleColor;ctx.textAlign='left';
            var fontSize=44;
            ctx.font='900 '+fontSize+'px Arial Black, Arial, sans-serif';
            while(fontSize>24&&titleX+ctx.measureText('Angebote').width>dateLeftEdge){
              fontSize-=2;ctx.font='900 '+fontSize+'px Arial Black, Arial, sans-serif';
            }
            ctx.fillText('Angebote',titleX,78);
            rl();
          };li.onerror=function(){rl();};li.src=(S>1)?hdLogoSrc(S):mgLogoEl.src;
        });

        // ── Main product card ──
        var cardMX=40, cardMY=170, cardMW=W-80, cardMH=H-170-80;
        var cardMR=20;
        function mgFlyerRR(rx,ry,rw,rh,r){
          ctx.beginPath();ctx.moveTo(rx+r,ry);ctx.lineTo(rx+rw-r,ry);ctx.quadraticCurveTo(rx+rw,ry,rx+rw,ry+r);
          ctx.lineTo(rx+rw,ry+rh-r);ctx.quadraticCurveTo(rx+rw,ry+rh,rx+rw-r,ry+rh);
          ctx.lineTo(rx+r,ry+rh);ctx.quadraticCurveTo(rx,ry+rh,rx,ry+rh-r);
          ctx.lineTo(rx,ry+r);ctx.quadraticCurveTo(rx,ry,rx+r,ry);ctx.closePath();
        }
        // Card shadow + fill
        ctx.save();ctx.shadowColor='rgba(0,0,0,0.1)';ctx.shadowBlur=12;ctx.shadowOffsetY=6;
        ctx.fillStyle=theme.cardBg;mgFlyerRR(cardMX,cardMY,cardMW,cardMH,cardMR);ctx.fill();ctx.restore();
        ctx.strokeStyle=theme.cardBorder;ctx.lineWidth=1;mgFlyerRR(cardMX,cardMY,cardMW,cardMH,cardMR);ctx.stroke();

        // Image area (top portion of card) – fill with imgBg color
        var imgZoneH=Math.floor(cardMH*(theme.imgZonePct||0.55));
        ctx.save();mgFlyerRR(cardMX+2,cardMY+2,cardMW-4,imgZoneH,cardMR);ctx.clip();
        ctx.fillStyle=tplGradFill(ctx,theme,'imgBg',cardMX,cardMY,cardMW,imgZoneH);ctx.fillRect(cardMX,cardMY,cardMW,imgZoneH);ctx.restore();
        var mgImgPromise=Promise.resolve();
        if(item.bild_data){
          mgImgPromise=new Promise(function(resImg){
            var img=new Image();
            img.onload=function(){
              var ofc=_freistellCanvas(img,cfg);
              var fImgSc=(cfg.imgScale||100)/100*((artOv.imgScale||100)/100);
              var maxIW=cardMW-40, maxIH=imgZoneH-20;
              var scI=Math.min(maxIW/ofc.width,maxIH/ofc.height,cfg.imgMaxScale||3)*fImgSc;
              var iw=ofc.width*scI,ih=ofc.height*scI;
              var imgX=cardMX+cardMW/2-iw/2+(artOv.imgDx||0), imgY=cardMY+10+(imgZoneH-ih)/2+(artOv.imgDy||0);
              var mgImgRotRad=(artOv.imgRot||0)*Math.PI/180;
              ctx.save();mgFlyerRR(cardMX+2,cardMY+2,cardMW-4,imgZoneH,cardMR);ctx.clip();
              if(mgImgRotRad){ctx.translate(imgX+iw/2,imgY+ih/2);ctx.rotate(mgImgRotRad);ctx.drawImage(ofc,-iw/2,-ih/2,iw,ih);}
              else{ctx.drawImage(ofc,imgX,imgY,iw,ih);}
              ctx.restore();
              _elMeta.push({id:'img',label:'\ud83d\uddbc Bild',x:imgX,y:imgY,w:iw,h:ih,ovKey:'img'});
              // Ghost overlay (behind main image)
              if(artOv.ghostMode==='on'){
                var gSc=(artOv.ghostScale||100)/100;var giw=iw*gSc,gih=ih*gSc;
                var gx=imgX+(artOv.ghostDx||0),gy=imgY+(artOv.ghostDy||0);
                var gRot=mgImgRotRad+((artOv.ghostRot||0)*Math.PI/180);
                ctx.save();mgFlyerRR(cardMX+2,cardMY+2,cardMW-4,imgZoneH,cardMR);ctx.clip();
                ctx.globalAlpha=artOv.ghostAlpha||0.35;
                if(gRot){ctx.translate(gx+giw/2,gy+gih/2);ctx.rotate(gRot);ctx.drawImage(ofc,-giw/2,-gih/2,giw,gih);}
                else{ctx.drawImage(ofc,gx,gy,giw,gih);}
                ctx.globalAlpha=1.0;ctx.restore();
                _elMeta.push({id:'ghost',label:'\ud83d\udc7b Ghost',x:gx,y:gy,w:giw,h:gih,ovKey:'ghost'});
              }
              // Duplicate overlay (behind main image)
              if(artOv.dupOn){
                var dSc=(artOv.dupScale||100)/100;var diw=iw*dSc,dih=ih*dSc;
                var dx2=imgX+(artOv.dupDx||0),dy2=imgY+(artOv.dupDy||0);
                var dRot=mgImgRotRad+((artOv.dupRot||0)*Math.PI/180);
                ctx.save();mgFlyerRR(cardMX+2,cardMY+2,cardMW-4,imgZoneH,cardMR);ctx.clip();
                if(dRot){ctx.translate(dx2+diw/2,dy2+dih/2);ctx.rotate(dRot);ctx.drawImage(ofc,-diw/2,-dih/2,diw,dih);}
                else{ctx.drawImage(ofc,dx2,dy2,diw,dih);}
                ctx.restore();
                _elMeta.push({id:'dup',label:'\ud83d\udcdd Duplikat',x:dx2,y:dy2,w:diw,h:dih,ovKey:'dup'});
              }
              // Extra copies (multi-ghost/dup)
              drawExtraCopies(ctx,artOv.copies,ofc,imgX,imgY,iw,ih,mgImgRotRad,function(){mgFlyerRR(cardMX+2,cardMY+2,cardMW-4,imgZoneH,cardMR);ctx.clip();});
              if(artOv.copies&&artOv.copies.length){artOv.copies.forEach(function(cp,ci){
                var sc=(cp.scale||100)/100;var cw=iw*sc,ch=ih*sc;
                _elMeta.push({id:'copy-'+ci,label:(cp.type==='ghost'?'\ud83d\udc7b':'\ud83d\udcdd')+' Kopie '+(ci+1),x:imgX+(cp.dx||0),y:imgY+(cp.dy||0),w:cw,h:ch,ovKey:'copy',copyIdx:ci});
              });}
              resImg();
            };img.onerror=function(){resImg();};img.src=item.bild_data;
          });
        }

        // Custom image overlay
        var ciPromise=Promise.resolve();
        if(artOv.customImg){
          ciPromise=new Promise(function(resCI){
            var ci=new Image();ci.onload=function(){
              var ciOfc=document.createElement('canvas');ciOfc.width=ci.width;ciOfc.height=ci.height;
              var cio=ciOfc.getContext('2d');cio.drawImage(ci,0,0);
              if(cfg.imgFreistellen){
                try{var id=cio.getImageData(0,0,ciOfc.width,ciOfc.height),d=id.data;
                var thr=cfg.imgThreshold,fade=30;
                for(var pi=0;pi<d.length;pi+=4){var mn=Math.min(d[pi],d[pi+1],d[pi+2]);if(mn>thr)d[pi+3]=0;else if(mn>thr-fade)d[pi+3]=Math.round(255*(thr-mn)/fade);}
                cio.putImageData(id,0,0);}catch(e){}
              }
              var ciSc=(artOv.customImgScale||100)/100;
              var maxCIW=cardMW-40, maxCIH=imgZoneH-20;
              var ciScI=Math.min(maxCIW/ciOfc.width,maxCIH/ciOfc.height,cfg.imgMaxScale||3)*ciSc;
              var ciW=ciOfc.width*ciScI,ciH=ciOfc.height*ciScI;
              var ciX=cardMX+cardMW/2-ciW/2+(artOv.customImgDx||0),ciY=cardMY+10+(imgZoneH-ciH)/2+(artOv.customImgDy||0);
              var ciRotRad=(artOv.customImgRot||0)*Math.PI/180;
              ctx.save();mgFlyerRR(cardMX+2,cardMY+2,cardMW-4,imgZoneH,cardMR);ctx.clip();
              ctx.globalAlpha=(artOv.customImgAlpha!=null?artOv.customImgAlpha:100)/100;
              if(ciRotRad){ctx.translate(ciX+ciW/2,ciY+ciH/2);ctx.rotate(ciRotRad);ctx.drawImage(ciOfc,-ciW/2,-ciH/2,ciW,ciH);}
              else{ctx.drawImage(ciOfc,ciX,ciY,ciW,ciH);}
              ctx.globalAlpha=1.0;ctx.restore();
              _elMeta.push({id:'customImg',label:'\ud83d\uddbc Eigenes Bild',x:ciX,y:ciY,w:ciW,h:ciH,ovKey:'customImg'});
              resCI();
            };ci.onerror=function(){resCI();};ci.src=artOv.customImg;
          });
        }

        Promise.all([mgImgPromise,ciPromise]).then(function(){
          // Savings badge top-right (eigenes Element: Position/Größe/Drehung)
          var savePct=getSavingsPercent(item);
          if(savePct){
            var bR=34;
            var dScF=(artOv.discountScale||100)/100;
            var dXF=cardMX+cardMW-28-bR+(artOv.discountDx||0),dYF=cardMY+28+bR+(artOv.discountDy||0);
            var dRF=Math.round(bR*dScF),dRiF=Math.round(bR*.62*dScF);
            _elMeta.push({id:'marker',label:'Ersparnis-Marker',x:dXF-dRF*1.2,y:dYF-dRF*1.2,w:dRF*2.4,h:dRF*2.4,ovKey:'discount'});
            if(artOv.discountRot){ctx.save();ctx.translate(dXF,dYF);ctx.rotate(artOv.discountRot*Math.PI/180);drawSavingsBurst(ctx,0,0,dRF,dRiF,'-'+savePct+'%','flyer',cfg);ctx.restore();}
            else drawSavingsBurst(ctx,dXF,dYF,dRF,dRiF,'-'+savePct+'%','flyer',cfg);
            ctx.textAlign='left';
          }

          // Divider line
          var divY=cardMY+imgZoneH+4;
          ctx.strokeStyle=theme.dividerColor||'#e2eade';ctx.lineWidth=1;
          ctx.beginPath();ctx.moveTo(cardMX+24,divY);ctx.lineTo(cardMX+cardMW-24,divY);ctx.stroke();

          // Text area
          var tPad=32, tY=divY+36;

          tY=drawNameGroup(ctx,item,cfg,cardMX+tPad,tY,cardMW-tPad*2,42,24,artOv,_elMeta);

          // Price section at bottom of card
          var pDx=artOv.priceDx||0, pDy=artOv.priceDy||0;
          var priceBarY=cardMY+cardMH-100+pDy;
          var priceBarX=cardMX+24+pDx;
          var priceScale=(artOv.priceScale||100)/100*(cfg.tagScale||100)/100;
          ctx.save();ctx.translate(priceBarX+(cardMW-48)/2,priceBarY+36);
          ctx.rotate((artOv.priceRot||0)*Math.PI/180);ctx.scale(priceScale,priceScale);
          ctx.translate(-priceBarX-(cardMW-48)/2,-priceBarY-36);
          if(cfg.tagShape!=='price-image'){
            drawPriceBackground(ctx,cfg,priceBarX,priceBarY,cardMW-48,72);
          }
          _elMeta.push({id:'price',label:'\ud83c\udff7 Preis',x:priceBarX+(cardMW-48)*(1-priceScale)/2,y:priceBarY+36*(1-priceScale),w:(cardMW-48)*priceScale,h:72*priceScale,ovKey:'price'});

          if(item.preis&&!drawCmsPriceImage(ctx,item,cfg,priceBarX,priceBarY,cardMW-48,72)){
            var pp=Number(item.preis).toFixed(2).split('.');
            ctx.fillStyle=cfg.priceImageColor;ctx.font='900 52px Arial Black, Arial, sans-serif';
            ctx.fillText(pp[0]+','+pp[1],priceBarX+16,priceBarY+52);
            var mw=ctx.measureText(pp[0]+','+pp[1]).width;
            ctx.font='700 30px Arial, sans-serif';
            ctx.fillText('\u20AC',priceBarX+16+mw+6,priceBarY+48);
          }
          if(item.statt_preis&&cfg.tagShape!=='price-image'){
            var uvp='statt '+Number(item.statt_preis).toFixed(2).replace('.',',')+' \u20AC';
            var stc=cfg.priceOldColor;
            var oldScF=(artOv.old_priceScale||100)/100;
            var oldXF=cardMX+cardMW-40+pDx+(artOv.old_priceDx||0),oldYF=priceBarY+48+(artOv.old_priceDy||0);
            ctx.save();
            ctx.translate(oldXF,oldYF);ctx.rotate((artOv.old_priceRot||0)*Math.PI/180);ctx.scale((artOv.old_priceScale||100)/100,(artOv.old_priceScale||100)/100);
            ctx.textAlign='right';ctx.fillStyle=stc;ctx.font='600 24px Arial, sans-serif';
            ctx.fillText(uvp,0,0);
            var uvpW=ctx.measureText(uvp).width;
            ctx.strokeStyle=cfg.priceStrikeColor;ctx.lineWidth=2;
            ctx.beginPath();ctx.moveTo(-uvpW,-8);ctx.lineTo(0,-8);ctx.stroke();
            ctx.restore();
            ctx.textAlign='left';
            _elMeta.push({id:'oldprice',label:'Stattpreis',x:oldXF-uvpW*oldScF,y:oldYF-24*oldScF,w:uvpW*oldScF,h:28*oldScF,ovKey:'old_price'});
          }

          // Footer
          ctx.fillStyle=theme.footerColor||theme.headerAccent||'#8aad7e';ctx.fillRect(0,H-36,W,36);
          ctx.fillStyle='#ffffff';ctx.textAlign='center';ctx.font='600 14px Arial, sans-serif';
          ctx.fillText('*Solange Vorrat reicht \u00b7 \u00c4nderungen vorbehalten',W/2,H-24);
          ctx.textAlign='left';

          ctx.restore();
          return mgLogoP.then(function(){return logoLoaded;});
        }).then(function(){
          drawFlyerBorder();
          c._elMeta=_elMeta;
          resolve(c);
        });
        return;
      }
      // ── Header: ANGEBOT + Datum + Logo (default templates only) ──
      ctx.textAlign='left';
      ctx.fillStyle=theme.titleColor;ctx.font=theme.titleFont;
      ctx.fillText('ANGEBOT',40,theme.titleY);
      ctx.fillStyle=theme.dateColor;ctx.font=theme.dateFont;
      ctx.fillText(von+' \u2013 '+bis,44,104);
      // Logo oben rechts (capped width to avoid overlap with title)
      var logoImg=new Image();
      logoLoaded=new Promise(function(resLogo){
        logoImg.onload=function(){
          var lh=90,lw=lh*(logoImg.width/logoImg.height);
          var maxLw=W*0.35;
          if(lw>maxLw){lh=lh*(maxLw/lw);lw=maxLw;}
          ctx.drawImage(logoImg,W-lw-30,14,lw,lh);resLogo();
        };
        logoImg.onerror=function(){resLogo();};
        logoImg.src=hdLogoSrc(S);
      });
      // ── Weisse Karte (grosser Bereich für Produkt) ──
      var cardX=30,cardY=130,cardW=W-60,cardH=H-130-60;
      ctx.save();
      ctx.shadowColor='rgba(0,0,0,0.06)';ctx.shadowBlur=2;ctx.shadowOffsetX=8;ctx.shadowOffsetY=8;
      ctx.fillStyle=theme.cardBg;rrect(cardX,cardY,cardW,cardH,theme.cardRadius);ctx.fill();ctx.restore();
      ctx.strokeStyle=theme.cardBorder;ctx.lineWidth=1;rrect(cardX,cardY,cardW,cardH,theme.cardRadius);ctx.stroke();
      // Blatt-Deko oben rechts auf Karte
      if(cfg.showLeaf) drawLeaf(cardX+cardW-60,cardY+36,36);
      // ── Produktname + Details auf Karte ──
      var pad=36;
      var textY=cardY+pad+28;
      textY=drawNameGroup(ctx,item,cfg,cardX+pad,textY,cardW-pad*2-40,48,28,artOv,_elMeta);
      // ── Bild + Preisschild: Bild zuerst (volle Fläche), dann Tag darüber ──
      var imgAreaTop=textY+6;
      var imgAreaH=cardH-(imgAreaTop-cardY)-pad-10;
      // Ensure image area is at least 55% of card height
      var minImgH=Math.round(cardH*0.55);
      if(imgAreaH<minImgH){imgAreaTop=cardY+cardH-pad-10-minImgH;imgAreaH=minImgH;}
      // Fill image area with imgBg color
      ctx.save();rrect(cardX,imgAreaTop,cardW,imgAreaH+pad,theme.cardRadius);ctx.clip();
      ctx.fillStyle=tplGradFill(ctx,theme,'imgBg',cardX,imgAreaTop,cardW,imgAreaH+pad);ctx.fillRect(cardX,imgAreaTop,cardW,imgAreaH+pad);ctx.restore();
      // ── Anchor-based layout: image bottom-left, price block top-right ──
      var artOv=Object.assign({},flyerArtOverrideDefault(),cfg.flyer_inline,flyerArtOverrideGet(item));
      var imgAncX=cfg.imgAnchorX||10, imgAncY=cfg.imgAnchorY||10;
      var priceAncX=cfg.priceAnchorX||10, priceAncY=cfg.priceAnchorY||10;
      var imgAreaBot=imgAreaTop+imgAreaH;
      var tagSc=(cfg.tagScale||100)/100*((artOv.priceScale||100)/100);
      var tagW=Math.round(280*tagSc),tagH=Math.round(130*tagSc);
      // Price block anchor + per-article offset
      var tagCX=cardX+cardW-priceAncX-tagW/2+(artOv.priceDx||0);
      var tagCY=imgAreaTop+priceAncY+tagH/2+(artOv.priceDy||0);
      // Image: scale to imgWidthPct% of card width, anchor bottom-left
      var imgWidthFrac=(cfg.imgWidthPct||50)/100;
      var imgPromise;
      if(item.bild_data){
        imgPromise=new Promise(function(resImg){
          var img=new Image();
          img.onload=function(){
            var imgSc=(cfg.imgScale||100)/100*((artOv.imgScale||100)/100);
            var targetImgW=cardW*imgWidthFrac*imgSc;
            var scale=targetImgW/img.width;
            // Clamp height so image stays in image area
            if(img.height*scale>imgAreaH*0.92){scale=imgAreaH*0.92/img.height;}
            scale=Math.min(scale,cfg.imgMaxScale);
            var iw=img.width*scale,ih=img.height*scale;
            // Anchor: bottom-left corner of image + per-article offset
            var imgLeft=cardX+imgAncX+(artOv.imgDx||0);
            var imgBot=imgAreaBot-imgAncY+(artOv.imgDy||0);
            // Freistellen: weissen Hintergrund entfernen (soft-edge feathering)
            var ofc=_freistellCanvas(img,cfg);
            // Clip to card so image does not overflow
            ctx.save();rrect(cardX,cardY,cardW,cardH,theme.cardRadius);ctx.clip();
            var rotRad=(cfg.imgRotation+(artOv.imgRot||0))*Math.PI/180;
            var cx=imgLeft+iw/2, cy=imgBot-ih/2;
            var aspectRatio=img.width/img.height;
            // ── Ghost: auto (flat images) or manual ──
            var gm=artOv.ghostMode||'auto';
            var _ghostActive=false;
            if(gm==='on'||(gm==='auto'&&aspectRatio>1.8&&ih<imgAreaH*0.45)){
              _ghostActive=true;
              var gAlpha=(artOv.ghostAlpha!=null)?artOv.ghostAlpha:0.45;
              var gSc=(artOv.ghostScale||100)/100;var giw=iw*gSc,gih=ih*gSc;
              var ghostCx,ghostCy;
              if(gm==='on'){ghostCx=cx+(artOv.ghostDx||0);ghostCy=cy+(artOv.ghostDy||0);}
              else{ghostCx=cx+iw*0.20;ghostCy=cy-ih*0.55;}
              if(ghostCy-gih/2<imgAreaTop) ghostCy=imgAreaTop+gih/2+4;
              var ghostRotRad=(artOv.ghostRot||0)*Math.PI/180;
              ctx.save();ctx.globalAlpha=gAlpha;
              ctx.translate(ghostCx,ghostCy);ctx.rotate(-rotRad*0.6-ghostRotRad);
              ctx.drawImage(ofc,-giw/2,-gih/2,giw,gih);
              ctx.restore();
              _elMeta.push({id:'ghost',label:'\ud83d\udc7b Ghost',x:ghostCx-giw/2,y:ghostCy-gih/2,w:giw,h:gih,ovKey:'ghost'});
            }
            // ── Full duplicate (100% opacity) ──
            if(artOv.dupOn){
              var dSc=(artOv.dupScale||100)/100;var diw=iw*dSc,dih=ih*dSc;
              var dupCx=cx+(artOv.dupDx||0), dupCy=cy+(artOv.dupDy||0);
              var dupRotRad=(artOv.dupRot||0)*Math.PI/180;
              ctx.save();ctx.globalAlpha=1.0;
              ctx.translate(dupCx,dupCy);ctx.rotate(-rotRad-dupRotRad);
              ctx.drawImage(ofc,-diw/2,-dih/2,diw,dih);
              ctx.restore();
              _elMeta.push({id:'dup',label:'\ud83d\udcdd Duplikat',x:dupCx-diw/2,y:dupCy-dih/2,w:diw,h:dih,ovKey:'dup'});
            }
            // Extra copies (multi-ghost/dup)
            drawExtraCopiesCenter(ctx,artOv.copies,ofc,cx,cy,iw,ih,-rotRad,null);
            if(artOv.copies&&artOv.copies.length){artOv.copies.forEach(function(cp,ci){
              var sc=(cp.scale||100)/100;var cw=iw*sc,ch=ih*sc;
              var cpx=cx+(cp.dx||0),cpy=cy+(cp.dy||0);
              _elMeta.push({id:'copy-'+ci,label:(cp.type==='ghost'?'\ud83d\udc7b':'\ud83d\udcdd')+' Kopie '+(ci+1),x:cpx-cw/2,y:cpy-ch/2,w:cw,h:ch,ovKey:'copy',copyIdx:ci});
            });}
            // Draw main image
            ctx.translate(cx,cy);ctx.rotate(-rotRad);
            ctx.drawImage(ofc,-iw/2,-ih/2,iw,ih);ctx.restore();
            _elMeta.push({id:'img',label:'\ud83d\uddbc Bild',x:imgLeft,y:imgBot-ih,w:iw,h:ih,ovKey:'img'});
            resImg();
          };
          img.onerror=function(){resImg();};img.src=item.bild_data;
        });
      }else{imgPromise=Promise.resolve();}
      // Price block OVER the image (anchored top-right in image area)
      imgPromise.then(function(){
      if(item.preis&&cfg.tagShape==='price-image'){
        drawCmsPriceImage(ctx,item,cfg,tagCX-tagW/2,tagCY-tagH/2,tagW,tagH,artOv.priceRot);
        _elMeta.push({id:'price',label:'Preis',x:tagCX-tagW/2,y:tagCY-tagH/2,w:tagW,h:tagH,ovKey:'price'});
        var imageSavings=getSavingsPercent(item);
        if(imageSavings){
          var dScI=(artOv.discountScale||100)/100;
          var dXI=tagCX-tagW/2+(artOv.discountDx||0),dYI=tagCY-tagH/2-14+(artOv.discountDy||0);
          var dRI=Math.round(36*dScI),dRiI=Math.round(22*dScI);
          _elMeta.push({id:'marker',label:'Ersparnis-Marker',x:dXI-dRI*1.2,y:dYI-dRI*1.2,w:dRI*2.4,h:dRI*2.4,ovKey:'discount'});
          if(artOv.discountRot){ctx.save();ctx.translate(dXI,dYI);ctx.rotate(artOv.discountRot*Math.PI/180);drawSavingsBurst(ctx,0,0,dRI,dRiI,'-'+imageSavings+'%','flyer',cfg);ctx.restore();}
          else drawSavingsBurst(ctx,dXI,dYI,dRI,dRiI,'-'+imageSavings+'%','flyer',cfg);
        }
      }else if(item.preis){
        var savingsPct=getSavingsPercent(item);
        var preisStr=Number(item.preis).toFixed(2).split('.');
        var skewVal=cfg.tagSkew/100;
        ctx.save();
        ctx.translate(tagCX,tagCY);
        ctx.rotate(-0.05+(artOv.priceRot||0)*Math.PI/180);ctx.transform(1,-skewVal,0,1,0,0);
        ctx.shadowColor='rgba(100,0,0,0.4)';ctx.shadowBlur=3;ctx.shadowOffsetX=8;ctx.shadowOffsetY=8;
        ctx.fillStyle=cfg.priceStripColor;fillTagShape(ctx,tagW,tagH,cfg);
        ctx.restore();
        // Glanz + Preis-Text
        ctx.save();
        ctx.translate(tagCX,tagCY);
        ctx.rotate(-0.05+(artOv.priceRot||0)*Math.PI/180);ctx.transform(1,-skewVal,0,1,0,0);
        var glanz=ctx.createLinearGradient(-tagW/2,-tagH/2,tagW/2,tagH/2);
        glanz.addColorStop(0,'rgba(255,255,255,0.12)');glanz.addColorStop(0.5,'rgba(255,255,255,0)');
        ctx.fillStyle=glanz;fillTagShape(ctx,tagW,tagH,cfg);
        ctx.fillStyle=cfg.priceImageColor;ctx.textAlign='left';
        ctx.transform(1,skewVal,0,1,0,0);
        var fs=cfg.priceFontFlyer*((artOv.priceScale||100)/100),cs=Math.round(fs*0.55),es=Math.round(fs*0.35);
        var mainStr=preisStr[0]+',';var centStr=preisStr[1];
        ctx.font='900 '+fs+'px Arial Black, Arial, sans-serif';var mw=ctx.measureText(mainStr).width;
        ctx.font='900 '+cs+'px Arial Black, Arial, sans-serif';var cw=ctx.measureText(centStr).width;
        ctx.font='bold '+es+'px Arial, sans-serif';var ew=ctx.measureText('\u20AC').width;
        var tw=mw+cw+ew+4;
        if(tw>tagW-40){var sc2=(tagW-40)/tw;fs=Math.round(fs*sc2);cs=Math.round(cs*sc2);es=Math.round(es*sc2);
          ctx.font='900 '+fs+'px Arial Black, Arial, sans-serif';mw=ctx.measureText(mainStr).width;
          ctx.font='900 '+cs+'px Arial Black, Arial, sans-serif';cw=ctx.measureText(centStr).width;
          ctx.font='bold '+es+'px Arial, sans-serif';ew=ctx.measureText('\u20AC').width;tw=mw+cw+ew+4;}
        var px=-tw/2,py=fs*0.35;
        ctx.font='900 '+fs+'px Arial Black, Arial, sans-serif';ctx.fillText(mainStr,px,py);
        ctx.font='900 '+cs+'px Arial Black, Arial, sans-serif';ctx.fillText(centStr,px+mw+2,py-fs*0.3);
        ctx.font='bold '+es+'px Arial, sans-serif';ctx.fillText('\u20AC',px+mw+cw+4,py-fs*0.28);
        ctx.restore();
        _elMeta.push({id:'price',label:'\ud83c\udff7 Preis',x:tagCX-tagW/2,y:tagCY-tagH/2,w:tagW,h:tagH,ovKey:'price'});
        // Statt-Preis unter dem Tag (eigenes Element: Position/Größe/Drehung)
        if(item.statt_preis){
          var stattStr=Number(item.statt_preis).toFixed(2).replace('.',',')+' \u20AC';
          var tagBottom=cfg.tagShape==='explosion'?Math.max(tagW/2,tagH/2):tagH/2;
          var oldSc2=(artOv.old_priceScale||100)/100;
          var stFs2=Math.round(26*tagSc*oldSc2);
          var oldX2=tagCX+(artOv.old_priceDx||0),oldY2=tagCY+tagBottom+Math.round(42*tagSc)+(artOv.old_priceDy||0);
          ctx.save();
          ctx.translate(oldX2,oldY2);ctx.rotate((artOv.old_priceRot||0)*Math.PI/180);
          ctx.fillStyle=cfg.priceOldColor;ctx.font='bold '+stFs2+'px Arial, sans-serif';ctx.textAlign='center';
          ctx.fillText(stattStr,0,0);
          var stW2=ctx.measureText(stattStr).width;
          ctx.strokeStyle=cfg.priceStrikeColor;ctx.lineWidth=2.5;
          ctx.beginPath();ctx.moveTo(-stW2/2-4,-Math.round(7*tagSc*oldSc2));ctx.lineTo(stW2/2+4,-Math.round(7*tagSc*oldSc2));ctx.stroke();
          ctx.restore();
          ctx.textAlign='center';
          _elMeta.push({id:'oldprice',label:'Stattpreis',x:oldX2-stW2/2,y:oldY2-stFs2,w:stW2,h:stFs2*1.5,ovKey:'old_price'});
        }
        if(savingsPct){
          // Savings burst: top-left of the price tag, clamped inside image area
          var burstX=tagCX-tagW/2+8;
          var burstY=Math.max(tagCY-tagH/2-Math.round(14*tagSc), imgAreaTop+Math.round(16*tagSc));
          var dSc2=(artOv.discountScale||100)/100;
          var dX2=burstX+(artOv.discountDx||0),dY2=burstY+(artOv.discountDy||0);
          var dR2=Math.round(36*tagSc*dSc2),dRi2=Math.round(22*tagSc*dSc2);
          _elMeta.push({id:'marker',label:'Ersparnis-Marker',x:dX2-dR2*1.2,y:dY2-dR2*1.2,w:dR2*2.4,h:dR2*2.4,ovKey:'discount'});
          if(artOv.discountRot){ctx.save();ctx.translate(dX2,dY2);ctx.rotate(artOv.discountRot*Math.PI/180);drawSavingsBurst(ctx,0,0,dR2,dRi2,'-'+savingsPct+'%','flyer',cfg);ctx.restore();}
          else drawSavingsBurst(ctx,dX2,dY2,dR2,dRi2,'-'+savingsPct+'%','flyer',cfg);
        }
      }
        ctx.textAlign='left';
        // ── Custom overlay image ──
        var ciPromise;
        if(artOv.customImg){
          ciPromise=new Promise(function(resCI){
            var ci=new Image();ci.onload=function(){
              var ciOfc=_freistellCanvas(ci,cfg);
              var ciSc=(artOv.customImgScale||100)/100;
              var ciW=ciOfc.width*ciSc,ciH=ciOfc.height*ciSc;
              if(ciW>W*0.8){var f2=W*0.8/ciW;ciW*=f2;ciH*=f2;}
              if(ciH>H*0.6){var f3=H*0.6/ciH;ciW*=f3;ciH*=f3;}
              var ciX=W/2-ciW/2+(artOv.customImgDx||0);
              var ciY=H/2-ciH/2+(artOv.customImgDy||0);
              var ciRotRad=(artOv.customImgRot||0)*Math.PI/180;
              ctx.save();ctx.globalAlpha=(artOv.customImgAlpha!=null?artOv.customImgAlpha:100)/100;
              ctx.translate(ciX+ciW/2,ciY+ciH/2);ctx.rotate(ciRotRad);
              ctx.drawImage(ciOfc,-ciW/2,-ciH/2,ciW,ciH);ctx.restore();
              _elMeta.push({id:'customImg',label:'\ud83d\uddbc Eigenes Bild',x:ciX,y:ciY,w:ciW,h:ciH,ovKey:'customImg'});
              resCI();
            };ci.onerror=function(){resCI();};ci.src=artOv.customImg;
          });
        }else{ciPromise=Promise.resolve();}
        return ciPromise.then(function(){
        // Footer
        ctx.fillStyle=theme.vorratColor||'#888888';ctx.globalAlpha=1.0;ctx.font='600 14px Arial, sans-serif';ctx.textAlign='center';
        ctx.fillText('*Solange Vorrat reicht',W/2,H-24);
        ctx.textAlign='left';
        return logoLoaded;
        });
      }).then(function(){drawFlyerBorder();c._elMeta=_elMeta;resolve(c);});
    });
  }

  // Nur Startseite: halbfette statt fetter Schrift (filigraner). Der CMS-Druck bleibt unveraendert.
  var SEMIBOLD_STACK='"Segoe UI", system-ui, -apple-system, Roboto, "Helvetica Neue", Arial, sans-serif';
  function semibold(ctx){
    var proto=Object.getPrototypeOf(ctx),desc=Object.getOwnPropertyDescriptor(proto,'font');
    if(!desc||!desc.set)return;
    Object.defineProperty(ctx,'font',{configurable:true,
      get:function(){return desc.get.call(ctx);},
      set:function(value){
        desc.set.call(ctx,String(value).replace(/^\s*(?:bold|[6-9]00)\s+(\d+(?:\.\d+)?px)\s+.*$/,'600 $1 '+SEMIBOLD_STACK));
      }});
  }

  function drawAngebotPlakat(data,items,images,callback,cfgOverride,opts){
    var S=(opts&&opts.scale)||1;
    var cols=2,maxRows=3,perPage=maxRows*cols;
    var W=794,H=1123;
    var cfg=cfgForKind(cfgOverride||cfgGet(),'plakat');
    var theme=getOfferTheme('plakat',cfg);
    var headerH=130,footerH=36,cardGap=18,cardPad=22;
    var gridTop=headerH+10,gridBot=H-footerH-10;
    var gridW=W-40,gridH=gridBot-gridTop;
    var cellW=Math.floor((gridW-cardGap)/cols);
    var cellH=Math.floor((gridH-(maxRows-1)*cardGap)/maxRows);
    var c=document.createElement('canvas');c.width=Math.round(W*S);c.height=Math.round(H*S);
    c._offerCards=[];
    c._elMeta=[];
    var ctx=hdKontext(c,S);
    if(opts&&opts.semibold)semibold(ctx);
    // Bei Speichermangel (z. B. aelteres iPad) eine Stufe kleiner erneut versuchen.
    var _cb=callback;
    callback=function(blob){
      if(!blob&&S>1){drawAngebotPlakat(data,items,images,_cb,cfgOverride,{scale:S-1,semibold:opts&&opts.semibold});return;}
      _cb(blob);
    };
    var isMagPlakat=theme.tpl==='modern-magazine'||theme.tpl==='modern-mag-fresh'||theme.tpl==='modern-mag-bold'||theme.tpl==='modern-mag-xl';
    if(isMagPlakat){
      // ── Modern Magazine: Clean grid card layout ──
      ctx.fillStyle=tplGradFill(ctx,theme,'bgColor',0,0,W,H);ctx.fillRect(0,0,W,H);

      // Header bar
      ctx.fillStyle=theme.headerBg||'#d6e5d0';ctx.fillRect(0,0,W,140);
      // Thin accent line
      ctx.fillStyle=theme.headerAccent||'#8aad7e';ctx.fillRect(0,138,W,3);

      // Date right (draw first so we know its width)
      var vonTxt=data.von?new Date(data.von).toLocaleDateString('de-DE',{day:'2-digit',month:'2-digit',year:'2-digit'}):'';
      var bisTxt=data.bis?new Date(data.bis).toLocaleDateString('de-DE',{day:'2-digit',month:'2-digit',year:'2-digit'}):'';
      ctx.fillStyle=theme.dateColor;ctx.font='900 24px Arial Black, Arial, sans-serif';
      var mgDateStr=vonTxt+' \u2013 '+bisTxt;
      var mgDateW=ctx.measureText(mgDateStr).width;
      var mgDateRight=W-30;
      ctx.textAlign='right';
      ctx.fillText(mgDateStr,mgDateRight,82);
      ctx.font='700 18px Arial, sans-serif';
      ctx.fillText('G\u00fcltig:',mgDateRight,52);
      ctx.textAlign='left';
      var mgDateLeftEdge=mgDateRight-Math.max(mgDateW,ctx.measureText('G\u00fcltig:').width)-16;

      // Logo + store name left (capped to not overlap date)
      var logoEl=logoElement();
      var logoP=new Promise(function(rl){
        if(!logoEl){rl();return;}
        var li=new Image();li.onload=function(){
          var lh=80,lw=lh*(li.width/li.height);
          var maxLogoW=180;
          if(lw>maxLogoW){lh=lh*(maxLogoW/lw);lw=maxLogoW;}
          ctx.drawImage(li,28,30,lw,lh);
          // 'Angebote' dominant next to logo, capped before date
          var titleX=28+lw+16;
          ctx.fillStyle=theme.titleColor;ctx.textAlign='left';
          var fontSize=44;
          ctx.font='900 '+fontSize+'px Arial Black, Arial, sans-serif';
          while(fontSize>24&&titleX+ctx.measureText('Angebote').width>mgDateLeftEdge){
            fontSize-=2;ctx.font='900 '+fontSize+'px Arial Black, Arial, sans-serif';
          }
          ctx.fillText('Angebote',titleX,78);
          rl();
        };
        li.onerror=function(){rl();};
        li.src=(S>1)?hdLogoSrc(S):logoEl.src;
      });

      // ── Prepare items (sort by savings, max 6) ──
      var renderPairs=(items||[]).map(function(it,idx){
        var sp=getSavingsPercent(it);
        return {it:it,img:(images&&images[idx])?images[idx]:null,sp:(sp==null?-1:sp),idx:idx};
      });
      renderPairs.sort(function(a,b){return b.sp!==a.sp?b.sp-a.sp:a.idx-b.idx;});
      renderPairs=renderPairs.slice(0,6);
      var renderItems=renderPairs.map(function(p){return p.it;});
      var renderImages=renderPairs.map(function(p){return p.img;});

      // ── 2x3 Grid cards ──
      var mgCols=2, mgRows=3;
      var mgGap=16, mgPadX=24, mgPadTop=156, mgPadBot=50;
      var mgCellW=Math.floor((W-mgPadX*2-mgGap)/mgCols);
      var mgCellH=Math.floor((H-mgPadTop-mgPadBot-(mgRows-1)*mgGap)/mgRows);
      var mgRad=16;

      function mgRRect(rx,ry,rw,rh,r){
        ctx.beginPath();ctx.moveTo(rx+r,ry);ctx.lineTo(rx+rw-r,ry);ctx.quadraticCurveTo(rx+rw,ry,rx+rw,ry+r);
        ctx.lineTo(rx+rw,ry+rh-r);ctx.quadraticCurveTo(rx+rw,ry+rh,rx+rw-r,ry+rh);
        ctx.lineTo(rx+r,ry+rh);ctx.quadraticCurveTo(rx,ry+rh,rx,ry+rh-r);
        ctx.lineTo(rx,ry+r);ctx.quadraticCurveTo(rx,ry,rx+r,ry);ctx.closePath();
      }

      var _ciPromises=[];
      for(var ci=0;ci<Math.min(mgCols*mgRows,renderItems.length);ci++){
        var col=ci%mgCols, row=Math.floor(ci/mgCols);
        var cx=mgPadX+col*(mgCellW+mgGap);
        var cy=mgPadTop+row*(mgCellH+mgGap);
        c._offerCards.push({x:cx,y:cy,w:mgCellW,h:mgCellH});
        var it=renderItems[ci], img=renderImages[ci];

        // Card shadow
        ctx.save();ctx.shadowColor='rgba(0,0,0,0.08)';ctx.shadowBlur=8;ctx.shadowOffsetY=4;
        ctx.fillStyle=theme.cardBg;mgRRect(cx,cy,mgCellW,mgCellH,mgRad);ctx.fill();ctx.restore();
        // Card border
        ctx.strokeStyle=theme.cardBorder;ctx.lineWidth=1;mgRRect(cx,cy,mgCellW,mgCellH,mgRad);ctx.stroke();

        var cardPadI=14;
        // Image area (top half of card) – fill with imgBg
        var imgAreaH=Math.floor(mgCellH*0.48);
        ctx.save();mgRRect(cx+2,cy+2,mgCellW-4,imgAreaH,mgRad);ctx.clip();
        ctx.fillStyle=tplGradFill(ctx,theme,'imgBg',cx,cy,mgCellW,imgAreaH);ctx.fillRect(cx,cy,mgCellW,imgAreaH);ctx.restore();
        // Per-card overrides
        var pOv=Object.assign({},plakatArtOverrideDefault(),cfg.plakat_inline,plakatArtOverrideGet(it));
        console.log('[drawAngebotPlakat] card',ci,it.produkt,'pOv.customImg:',pOv.customImg?'YES ('+pOv.customImg.length+' chars)':'NO','keys:',Object.keys(pOv).join(','));
        if(img){
          var ofc=_freistellCanvas(img,cfg);
          var fImgSc2=(cfg.imgScale||100)/100*((pOv.imgScale||100)/100);
          var maxIW=mgCellW-cardPadI*2, maxIH=imgAreaH-10;
          var scI=Math.min(maxIW/ofc.width,maxIH/ofc.height,cfg.imgMaxScale||3)*fImgSc2;
          var iw=ofc.width*scI,ih=ofc.height*scI;
          var imgX=cx+mgCellW/2-iw/2+(pOv.imgDx||0), imgY=cy+cardPadI+(imgAreaH-ih)/2+(pOv.imgDy||0);
          var pRotRad=(pOv.imgRot||0)*Math.PI/180;
          c._elMeta.push({id:'img',itemKey:it.key,label:'Produktbild',x:imgX,y:imgY,w:iw,h:ih,ovKey:'img'});
          // Ghost overlay
          if(pOv.ghostMode==='on'){
            var gSc3=(pOv.ghostScale||100)/100;var giw3=iw*gSc3,gih3=ih*gSc3;
            var gx=imgX+(pOv.ghostDx||0),gy=imgY+(pOv.ghostDy||0);
            var gRot=pRotRad+((pOv.ghostRot||0)*Math.PI/180);
            ctx.save();mgRRect(cx+2,cy+2,mgCellW-4,imgAreaH,mgRad);ctx.clip();
            ctx.globalAlpha=pOv.ghostAlpha||0.35;
            if(gRot){ctx.translate(gx+giw3/2,gy+gih3/2);ctx.rotate(gRot);ctx.drawImage(ofc,-giw3/2,-gih3/2,giw3,gih3);}
            else{ctx.drawImage(ofc,gx,gy,giw3,gih3);}
            ctx.globalAlpha=1.0;ctx.restore();
            c._elMeta.push({id:'ghost',itemKey:it.key,label:'Ghost',x:gx,y:gy,w:giw3,h:gih3,ovKey:'ghost'});
          }
          // Duplicate overlay
          if(pOv.dupOn){
            var dSc3=(pOv.dupScale||100)/100;var diw3=iw*dSc3,dih3=ih*dSc3;
            var dx2=imgX+(pOv.dupDx||0),dy2=imgY+(pOv.dupDy||0);
            var dRot=pRotRad+((pOv.dupRot||0)*Math.PI/180);
            ctx.save();mgRRect(cx+2,cy+2,mgCellW-4,imgAreaH,mgRad);ctx.clip();
            if(dRot){ctx.translate(dx2+diw3/2,dy2+dih3/2);ctx.rotate(dRot);ctx.drawImage(ofc,-diw3/2,-dih3/2,diw3,dih3);}
            else{ctx.drawImage(ofc,dx2,dy2,diw3,dih3);}
            ctx.restore();
            c._elMeta.push({id:'dup',itemKey:it.key,label:'Duplikat',x:dx2,y:dy2,w:diw3,h:dih3,ovKey:'dup'});
          }
          // Extra copies (multi-ghost/dup)
          drawExtraCopies(ctx,pOv.copies,ofc,imgX,imgY,iw,ih,pRotRad,function(){mgRRect(cx+2,cy+2,mgCellW-4,imgAreaH,mgRad);ctx.clip();});
          (pOv.copies||[]).forEach(function(cp,cpi){var cps=(cp.scale||100)/100;c._elMeta.push({id:'copy-'+cpi,itemKey:it.key,label:(cp.type==='ghost'?'Ghost':'Duplikat')+'-Kopie '+(cpi+1),x:imgX+(cp.dx||0),y:imgY+(cp.dy||0),w:iw*cps,h:ih*cps,ovKey:'copy',copyIdx:cpi});});
          // Main image
          ctx.save();mgRRect(cx+2,cy+2,mgCellW-4,imgAreaH,mgRad);ctx.clip();
          if(pRotRad){ctx.translate(imgX+iw/2,imgY+ih/2);ctx.rotate(pRotRad);ctx.drawImage(ofc,-iw/2,-ih/2,iw,ih);}
          else{ctx.drawImage(ofc,imgX,imgY,iw,ih);}
          ctx.restore();
          // Custom image overlay (collected as promise for async rendering)
          if(pOv.customImg){
            _ciPromises.push((function(_pOv,_cx,_cy,_mgCellW,_imgAreaH,_cardPadI,_mgRad,_it){
              return new Promise(function(resCI){
                var ci=new Image();ci.onload=function(){
                  var ciOfc=document.createElement('canvas');ciOfc.width=ci.width;ciOfc.height=ci.height;
                  var cio=ciOfc.getContext('2d');cio.drawImage(ci,0,0);
                  if(cfg.imgFreistellen){
                    try{var id=cio.getImageData(0,0,ciOfc.width,ciOfc.height),d=id.data;
                    var thr=cfg.imgThreshold,fade=30;
                    for(var pi=0;pi<d.length;pi+=4){var mn=Math.min(d[pi],d[pi+1],d[pi+2]);if(mn>thr)d[pi+3]=0;else if(mn>thr-fade)d[pi+3]=Math.round(255*(thr-mn)/fade);}
                    cio.putImageData(id,0,0);}catch(e){}
                  }
                  var ciSc=(_pOv.customImgScale||100)/100;
                  var maxCIW=_mgCellW-_cardPadI*2, maxCIH=_imgAreaH-10;
                  var ciScI=Math.min(maxCIW/ciOfc.width,maxCIH/ciOfc.height,cfg.imgMaxScale||3)*ciSc;
                  var ciW=ciOfc.width*ciScI,ciH=ciOfc.height*ciScI;
                  var ciX=_cx+_mgCellW/2-ciW/2+(_pOv.customImgDx||0),ciY=_cy+_cardPadI+(_imgAreaH-ciH)/2+(_pOv.customImgDy||0);
                  var ciRotRad=(_pOv.customImgRot||0)*Math.PI/180;
                  ctx.save();mgRRect(_cx+2,_cy+2,_mgCellW-4,_imgAreaH,_mgRad);ctx.clip();
                  ctx.globalAlpha=(_pOv.customImgAlpha!=null?_pOv.customImgAlpha:100)/100;
                  if(ciRotRad){ctx.translate(ciX+ciW/2,ciY+ciH/2);ctx.rotate(ciRotRad);ctx.drawImage(ciOfc,-ciW/2,-ciH/2,ciW,ciH);}
                  else{ctx.drawImage(ciOfc,ciX,ciY,ciW,ciH);}
                  ctx.globalAlpha=1.0;ctx.restore();
                  c._elMeta.push({id:'customImg',itemKey:_it.key,label:'Eigenes Bild',x:ciX,y:ciY,w:ciW,h:ciH,ovKey:'customImg'});resCI();
                };ci.onerror=function(){resCI();};ci.src=_pOv.customImg;
              });
            })(pOv,cx,cy,mgCellW,imgAreaH,cardPadI,mgRad,it));
          }
        }

        // Savings badge top-right (eigenes Element: Position/Größe/Drehung)
        var sp=getSavingsPercent(it);
        if(sp){
          var badgeR=22;
          var dScM=(pOv.discountScale||100)/100;
          var dXM=cx+mgCellW-cardPadI-badgeR+4+(pOv.discountDx||0),dYM=cy+cardPadI+badgeR-4+(pOv.discountDy||0);
          var dRM=Math.round(badgeR*dScM),dRiM=Math.round(badgeR*.62*dScM);
          c._elMeta.push({id:'marker',itemKey:it.key,label:'Ersparnis-Marker',x:dXM-dRM*1.2,y:dYM-dRM*1.2,w:dRM*2.4,h:dRM*2.4,ovKey:'discount'});
          if(pOv.discountRot){ctx.save();ctx.translate(dXM,dYM);ctx.rotate(pOv.discountRot*Math.PI/180);drawSavingsBurst(ctx,0,0,dRM,dRiM,'-'+sp+'%','plakat',cfg);ctx.restore();}
          else drawSavingsBurst(ctx,dXM,dYM,dRM,dRiM,'-'+sp+'%','plakat',cfg);
          ctx.textAlign='left';
        }

        // Text area (bottom half)
        var textTop=cy+imgAreaH+8;

        drawNameGroup(ctx,it,cfg,cx+cardPadI,textTop+20,mgCellW-cardPadI*2,20,15,pOv,c._elMeta);

        // Price area at bottom of card (with override offsets)
        var ppDx=pOv.priceDx||0,ppDy=pOv.priceDy||0;
        var priceY=cy+mgCellH-cardPadI;
        if(it&&it.preis!=null){
          var p=Number(it.preis);
          if(isFinite(p)){
            var pp=p.toFixed(2).split('.');
            var priceScale=(pOv.priceScale||100)/100*(cfg.tagScale||100)/100, priceWidth=mgCellW-cardPadI*2+8;
            var priceX=cx+cardPadI-4+ppDx,priceTop=priceY-42+ppDy;
            c._elMeta.push({id:'price',itemKey:it.key,label:'Preis',x:priceX+priceWidth*(1-priceScale)/2,y:priceTop+23*(1-priceScale),w:priceWidth*priceScale,h:46*priceScale,ovKey:'price'});
            ctx.save();ctx.translate(priceX+priceWidth/2,priceTop+23);ctx.rotate((pOv.priceRot||0)*Math.PI/180);
            ctx.scale(priceScale,priceScale);ctx.translate(-priceX-priceWidth/2,-priceTop-23);
            if(!drawCmsPriceImage(ctx,it,cfg,priceX,priceTop,priceWidth,46)){
            // Price tag area
            drawPriceBackground(ctx,cfg,priceX,priceTop,priceWidth,46);
            // Main price
            ctx.fillStyle=cfg.priceImageColor;ctx.font='900 34px Arial Black, Arial, sans-serif';
            ctx.fillText(pp[0]+','+pp[1],cx+cardPadI+4+ppDx,priceY-6+ppDy);
            ctx.font='700 20px Arial, sans-serif';
            var mw=ctx.measureText(pp[0]+','+pp[1]).width;
            ctx.fillText('\u20AC',cx+cardPadI+4+mw+4+ppDx,priceY-8+ppDy);
            // Statt-Preis right-aligned (eigenes Element: Position/Größe/Drehung)
            if(it.statt_preis!=null){
              var uvp=Number(it.statt_preis).toFixed(2).replace('.',',')+' \u20AC';
              var stcP=cfg.priceOldColor;
              var oldScP=(pOv.old_priceScale||100)/100*(pOv.priceScale||100)/100;
              var oldXP=cx+mgCellW-cardPadI+(pOv.old_priceDx||0),oldYP=priceY-18+ppDy+(pOv.old_priceDy||0);
              ctx.save();
              ctx.translate(oldXP,oldYP);ctx.rotate((pOv.old_priceRot||0)*Math.PI/180);ctx.scale((pOv.old_priceScale||100)/100,(pOv.old_priceScale||100)/100);
              ctx.textAlign='right';ctx.fillStyle=stcP;ctx.font='600 17px Arial, sans-serif';
              ctx.fillText('statt '+uvp,0,0);
              var uvpW=ctx.measureText('statt '+uvp).width;
              ctx.strokeStyle=cfg.priceStrikeColor;ctx.lineWidth=1.5;
              ctx.beginPath();ctx.moveTo(-uvpW,-5);ctx.lineTo(0,-5);ctx.stroke();
              ctx.restore();
              ctx.textAlign='left';
              c._elMeta.push({id:'oldprice',itemKey:it.key,label:'Stattpreis',x:oldXP-uvpW*oldScP,y:oldYP-17*oldScP,w:uvpW*oldScP,h:22*oldScP,ovKey:'old_price'});
            }
            }
            ctx.restore();
          }
        }
      }

      // Footer
      ctx.fillStyle=theme.footerColor||theme.headerAccent||'#8aad7e';ctx.fillRect(0,H-36,W,36);
      ctx.fillStyle='#ffffff';ctx.textAlign='center';ctx.font='600 14px Arial, sans-serif';
      ctx.fillText('*Solange Vorrat reicht \u00b7 \u00c4nderungen vorbehalten',W/2,H-24);
      ctx.textAlign='left';

      Promise.all([logoP].concat(_ciPromises)).then(function(){if(opts&&opts.returnCanvas)callback(c);else c.toBlob(function(blob){callback(blob);},'image/png');});
      return;
    }
    // ── Papier-Hintergrund (warm beige) ──
    ctx.fillStyle=tplGradFill(ctx,theme,'bgColor',0,0,W,H);ctx.fillRect(0,0,W,H);
    // Subtile Papierstruktur simulieren
    if(theme.showTexture){ctx.globalAlpha=0.04;
    for(var ty=0;ty<H;ty+=3){for(var tx=0;tx<W;tx+=3){
      if(Math.random()>0.5){ctx.fillStyle=Math.random()>0.5?'#000':'#fff';ctx.fillRect(tx,ty,2,2);}
    }}}
    ctx.globalAlpha=1.0;
    // ── ANGEBOT Titel (rot, gross, links) ──
    ctx.textAlign='left';
    ctx.fillStyle=theme.titleColor;ctx.font=theme.titleFont;
    ctx.fillText('ANGEBOT',30,68);
    // Datum darunter
    var von=data.von?new Date(data.von).toLocaleDateString('de-DE',{day:'2-digit',month:'2-digit',year:'2-digit'}):'';
    var bis=data.bis?new Date(data.bis).toLocaleDateString('de-DE',{day:'2-digit',month:'2-digit',year:'2-digit'}):'';
    ctx.fillStyle=theme.dateColor;ctx.font=theme.dateFont;
    ctx.fillText(von+' \u2013 '+bis,34,100);
    // ── Logo oben rechts (capped width to avoid overlap with title) ──
    var logoImg=new Image();
    var logoLoaded=new Promise(function(res){
      logoImg.onload=function(){
        var lh=90,lw=lh*(logoImg.width/logoImg.height);
        var maxLw=W*0.35;
        if(lw>maxLw){lh=lh*(maxLw/lw);lw=maxLw;}
        ctx.drawImage(logoImg,W-lw-30,14,lw,lh);res();
      };
      logoImg.onerror=function(){res();};
      logoImg.src=hdLogoSrc(S);
    });
    ctx.textAlign='left';
    // ── Hilfsfunktion: Runde-Ecken Rechteck ──
    function roundRect(rx,ry,rw,rh,r){
      ctx.beginPath();
      ctx.moveTo(rx+r,ry);ctx.lineTo(rx+rw-r,ry);ctx.quadraticCurveTo(rx+rw,ry,rx+rw,ry+r);
      ctx.lineTo(rx+rw,ry+rh-r);ctx.quadraticCurveTo(rx+rw,ry+rh,rx+rw-r,ry+rh);
      ctx.lineTo(rx+r,ry+rh);ctx.quadraticCurveTo(rx,ry+rh,rx,ry+rh-r);
      ctx.lineTo(rx,ry+r);ctx.quadraticCurveTo(rx,ry,rx+r,ry);ctx.closePath();
    }
    // ── Hilfsfunktion: Blatt-Deko ──
    function drawLeaf(lx,ly,sz){
      drawLeafDecoration(ctx,lx,ly,sz,cfg.leafColor,1.5);
    }
    // ── Produktkarten ──
    var _clCiPromises=[];
    items.forEach(function(item,i){
      if(i>=perPage) return;
      var col=i%cols,row=Math.floor(i/cols);
      var cx=20+col*(cellW+cardGap);
      var cy=gridTop+row*(cellH+cardGap);
      c._offerCards.push({x:cx,y:cy,w:cellW,h:cellH});
      // Weisse Karte mit runden Ecken + Schatten
      ctx.save();
      ctx.shadowColor='rgba(0,0,0,0.06)';ctx.shadowBlur=2;ctx.shadowOffsetX=8;ctx.shadowOffsetY=8;
      ctx.fillStyle=theme.cardBg;
      roundRect(cx,cy,cellW,cellH,theme.cardRadius);ctx.fill();ctx.restore();
      // Rand
      ctx.strokeStyle=theme.cardBorder;ctx.lineWidth=1;roundRect(cx,cy,cellW,cellH,theme.cardRadius);ctx.stroke();
      // Blatt-Deko oben rechts
      if(cfg.showLeaf) drawLeaf(cx+cellW-45,cy+30,cfg.leafSize);
      // ── Produktname + Details oben (fixed height: 2 lines name + 1 line details) ──
      var textX=cx+cardPad,textY=cy+cardPad+20;
      var fixedTextH=28*2+26; // 2 name lines (28px each) + 1 detail line (26px)
      var pOv=Object.assign({},plakatArtOverrideDefault(),cfg.plakat_inline,plakatArtOverrideGet(item));
      var nameBottom=drawNameGroup(ctx,item,cfg,textX,textY,cellW-cardPad*2-30,24,16,pOv,c._elMeta);
      fixedTextH=Math.max(fixedTextH,nameBottom-(cy+cardPad));
      // ── Bild links (freigestellt, gedreht, geclippt) ──
      var img=images[i];
      var imgAreaTop=cy+cardPad+fixedTextH+8;
      var imgAreaH=cellH-fixedTextH-cardPad*2-8;
      // Fill image area with imgBg color
      ctx.save();roundRect(cx,imgAreaTop,cellW,imgAreaH+cardPad,theme.cardRadius);ctx.clip();
      ctx.fillStyle=tplGradFill(ctx,theme,'imgBg',cx,imgAreaTop,cellW,imgAreaH+cardPad);ctx.fillRect(cx,imgAreaTop,cellW,imgAreaH+cardPad);ctx.restore();
      // Per-card overrides
      if(img){
        var pImgSc=(cfg.imgScale||100)/100*((pOv.imgScale||100)/100);
        var maxImgW=cellW*0.52,maxImgH=imgAreaH*0.88;
        var scale=Math.min(maxImgW/img.width,maxImgH/img.height,cfg.imgMaxScale)*pImgSc;
        var iw=img.width*scale,ih=img.height*scale;
        var imgCX=cx+cardPad+maxImgW*0.45+(pOv.imgDx||0);
        var imgCY=imgAreaTop+imgAreaH*0.5+(pOv.imgDy||0);
        c._elMeta.push({id:'img',itemKey:item.key,label:'Produktbild',x:imgCX-iw/2,y:imgCY-ih/2,w:iw,h:ih,ovKey:'img'});
        // Freistellen: weissen Hintergrund entfernen
        var ofc=_freistellCanvas(img,cfg);
        // Clip auf Karte, drehen, zeichnen
        var pRotRad=cfg.imgRotation*Math.PI/180*0.85+(pOv.imgRot||0)*Math.PI/180;
        // Ghost overlay
        if(pOv.ghostMode==='on'){
          var gSc4=(pOv.ghostScale||100)/100;var giw4=iw*gSc4,gih4=ih*gSc4;
          var gx=imgCX+(pOv.ghostDx||0),gy=imgCY+(pOv.ghostDy||0);
          var gRot=-pRotRad+((pOv.ghostRot||0)*Math.PI/180);
          ctx.save();roundRect(cx,cy,cellW,cellH,theme.cardRadius);ctx.clip();
          ctx.globalAlpha=pOv.ghostAlpha||0.35;
          ctx.translate(gx,gy);ctx.rotate(gRot);
          ctx.drawImage(ofc,-giw4/2,-gih4/2,giw4,gih4);ctx.globalAlpha=1.0;ctx.restore();
          c._elMeta.push({id:'ghost',itemKey:item.key,label:'Ghost',x:gx-giw4/2,y:gy-gih4/2,w:giw4,h:gih4,ovKey:'ghost'});
        }
        // Duplicate overlay
        if(pOv.dupOn){
          var dSc4=(pOv.dupScale||100)/100;var diw4=iw*dSc4,dih4=ih*dSc4;
          var dx2=imgCX+(pOv.dupDx||0),dy2=imgCY+(pOv.dupDy||0);
          var dRot=-pRotRad+((pOv.dupRot||0)*Math.PI/180);
          ctx.save();roundRect(cx,cy,cellW,cellH,theme.cardRadius);ctx.clip();
          ctx.translate(dx2,dy2);ctx.rotate(dRot);
          ctx.drawImage(ofc,-diw4/2,-dih4/2,diw4,dih4);ctx.restore();
          c._elMeta.push({id:'dup',itemKey:item.key,label:'Duplikat',x:dx2-diw4/2,y:dy2-dih4/2,w:diw4,h:dih4,ovKey:'dup'});
        }
        // Extra copies (multi-ghost/dup)
        drawExtraCopiesCenter(ctx,pOv.copies,ofc,imgCX,imgCY,iw,ih,-pRotRad,function(){roundRect(cx,cy,cellW,cellH,theme.cardRadius);ctx.clip();});
        (pOv.copies||[]).forEach(function(cp,cpi){var cps=(cp.scale||100)/100;c._elMeta.push({id:'copy-'+cpi,itemKey:item.key,label:(cp.type==='ghost'?'Ghost':'Duplikat')+'-Kopie '+(cpi+1),x:imgCX+(cp.dx||0)-iw*cps/2,y:imgCY+(cp.dy||0)-ih*cps/2,w:iw*cps,h:ih*cps,ovKey:'copy',copyIdx:cpi});});
        // Main image
        ctx.save();roundRect(cx,cy,cellW,cellH,theme.cardRadius);ctx.clip();
        ctx.translate(imgCX,imgCY);ctx.rotate(-pRotRad);
        ctx.drawImage(ofc,-iw/2,-ih/2,iw,ih);ctx.restore();
      }
      // Custom image overlay (classic layout)
      if(pOv.customImg){
        _clCiPromises.push((function(_pOv,_cx,_cy,_cellW,_cellH,_imgAreaTop,_imgAreaH,_cardPad,_item){
          return new Promise(function(resCI){
            var ci=new Image();ci.onload=function(){
              var ciOfc=_freistellCanvas(ci,cfg);
              var ciSc=(_pOv.customImgScale||100)/100;
              var maxCIW=_cellW-_cardPad*2, maxCIH=_imgAreaH*0.88;
              var ciScI=Math.min(maxCIW/ciOfc.width,maxCIH/ciOfc.height,cfg.imgMaxScale||3)*ciSc;
              var ciW=ciOfc.width*ciScI,ciH=ciOfc.height*ciScI;
              var ciX=_cx+_cardPad+maxCIW*0.45-ciW/2+(_pOv.customImgDx||0);
              var ciY=_imgAreaTop+_imgAreaH*0.5-ciH/2+(_pOv.customImgDy||0);
              var ciRotRad=(_pOv.customImgRot||0)*Math.PI/180;
              ctx.save();roundRect(_cx,_cy,_cellW,_cellH,theme.cardRadius);ctx.clip();
              ctx.globalAlpha=(_pOv.customImgAlpha!=null?_pOv.customImgAlpha:100)/100;
              if(ciRotRad){ctx.translate(ciX+ciW/2,ciY+ciH/2);ctx.rotate(-ciRotRad);ctx.drawImage(ciOfc,-ciW/2,-ciH/2,ciW,ciH);}
              else{ctx.drawImage(ciOfc,ciX,ciY,ciW,ciH);}
              ctx.globalAlpha=1.0;ctx.restore();
              c._elMeta.push({id:'customImg',itemKey:_item.key,label:'Eigenes Bild',x:ciX,y:ciY,w:ciW,h:ciH,ovKey:'customImg'});resCI();
            };ci.onerror=function(){resCI();};ci.src=_pOv.customImg;
          });
        })(pOv,cx,cy,cellW,cellH,imgAreaTop,imgAreaH,cardPad,item));
      }
      // ── Schräges rotes Preisschild rechts (with override offsets) ──
      var clPDx=pOv.priceDx||0,clPDy=pOv.priceDy||0;
      if(item.preis){
        var cardSavingsPct=getSavingsPercent(item);
        var preisStr=Number(item.preis).toFixed(2).split('.');
        var tagSc=(cfg.tagScale||100)/100*((pOv.priceScale||100)/100);
        var tagW=Math.round(130*tagSc),tagH=Math.round(58*tagSc);
        var tagCX=cx+cellW-cardPad-tagW/2-10+clPDx;
        var tagCY=imgAreaTop+imgAreaH*0.4+clPDy;
        c._elMeta.push({id:'price',itemKey:item.key,label:'Preis',x:tagCX-tagW/2,y:tagCY-tagH/2,w:tagW,h:tagH,ovKey:'price'});
        if(!drawCmsPriceImage(ctx,item,cfg,tagCX-tagW/2,tagCY-tagH/2,tagW,tagH,pOv.priceRot)){
        ctx.save();
        ctx.translate(tagCX,tagCY);
        var pSkew=cfg.tagSkew/100;
        ctx.rotate(-0.05+(pOv.priceRot||0)*Math.PI/180);ctx.transform(1,-pSkew,0,1,0,0);
        // Dunkler Schatten
        ctx.shadowColor='rgba(100,0,0,0.4)';ctx.shadowBlur=2;ctx.shadowOffsetX=6;ctx.shadowOffsetY=6;
        ctx.fillStyle=cfg.priceStripColor;
        fillTagShape(ctx,tagW,tagH,cfg);
        ctx.restore();
        // Glanz-Overlay
        ctx.save();
        ctx.translate(tagCX,tagCY);
        ctx.rotate(-0.05+(pOv.priceRot||0)*Math.PI/180);ctx.transform(1,-pSkew,0,1,0,0);
        var glanz=ctx.createLinearGradient(-tagW/2,-tagH/2,tagW/2,tagH/2);
        glanz.addColorStop(0,'rgba(255,255,255,0.12)');glanz.addColorStop(0.5,'rgba(255,255,255,0)');
        ctx.fillStyle=glanz;fillTagShape(ctx,tagW,tagH,cfg);
        // Preis-Text im gedrehten Kontext
        ctx.fillStyle=cfg.priceImageColor;ctx.textAlign='left';
        // Skew rückgängig für lesbaren Text
        ctx.transform(1,pSkew,0,1,0,0);
        var fs=cfg.priceFontPlakat*((pOv.priceScale||100)/100),cs=Math.round(fs*0.55),es=Math.round(fs*0.35);
        ctx.font='900 '+fs+'px Arial Black, Arial, sans-serif';
        var mainStr=preisStr[0]+',';var mw=ctx.measureText(mainStr).width;
        ctx.font='900 '+cs+'px Arial Black, Arial, sans-serif';
        var centStr=preisStr[1];var cw=ctx.measureText(centStr).width;
        ctx.font='bold '+es+'px Arial, sans-serif';
        var ew=ctx.measureText('\u20AC').width;
        var tw=mw+cw+ew+3;
        if(tw>tagW-20){var sc2=(tagW-20)/tw;fs=Math.round(fs*sc2);cs=Math.round(cs*sc2);es=Math.round(es*sc2);
          ctx.font='900 '+fs+'px Arial Black, Arial, sans-serif';mw=ctx.measureText(mainStr).width;
          ctx.font='900 '+cs+'px Arial Black, Arial, sans-serif';cw=ctx.measureText(centStr).width;
          ctx.font='bold '+es+'px Arial, sans-serif';ew=ctx.measureText('\u20AC').width;tw=mw+cw+ew+3;}
        var px=-tw/2,py=fs*0.35;
        ctx.font='900 '+fs+'px Arial Black, Arial, sans-serif';ctx.fillText(mainStr,px,py);
        ctx.font='900 '+cs+'px Arial Black, Arial, sans-serif';ctx.fillText(centStr,px+mw+2,py-fs*0.3);
        ctx.font='bold '+es+'px Arial, sans-serif';ctx.fillText('\u20AC',px+mw+cw+3,py-fs*0.28);
        ctx.restore();
        // Statt-Preis unter dem Tag (eigenes Element: Position/Größe/Drehung)
        if(item.statt_preis){
          var stattStr=Number(item.statt_preis).toFixed(2).replace('.',',')+' \u20AC';
          var tagBottom=cfg.tagShape==='explosion'?Math.max(tagW/2,tagH/2):tagH/2;
          var oldSc=(pOv.old_priceScale||100)/100;
          var stFs=Math.round(16*tagSc*oldSc);
          var oldX=tagCX+(pOv.old_priceDx||0),oldY=tagCY+tagBottom+Math.round(30*tagSc)+(pOv.old_priceDy||0);
          ctx.save();
          ctx.translate(oldX,oldY);ctx.rotate((pOv.old_priceRot||0)*Math.PI/180);
          ctx.fillStyle=cfg.priceOldColor;ctx.font='bold '+stFs+'px Arial, sans-serif';ctx.textAlign='center';
          ctx.fillText(stattStr,0,0);
          var stW=ctx.measureText(stattStr).width;
          ctx.strokeStyle=theme.tagColor;ctx.lineWidth=1.5;ctx.beginPath();
          ctx.moveTo(-stW/2-2,-Math.round(5*tagSc*oldSc));ctx.lineTo(stW/2+2,-Math.round(5*tagSc*oldSc));ctx.stroke();
          ctx.restore();
          ctx.textAlign='center';
          c._elMeta.push({id:'oldprice',itemKey:item.key,label:'Stattpreis',x:oldX-stW/2,y:oldY-stFs,w:stW,h:stFs*1.5,ovKey:'old_price'});
        }
        }
        if(cardSavingsPct){
          var dSc=(pOv.discountScale||100)/100;
          var dX=tagCX-tagW/2+6+(pOv.discountDx||0),dY=tagCY-tagH/2-12+(pOv.discountDy||0);
          var dR=Math.round(24*tagSc*dSc),dRi=Math.round(15*tagSc*dSc);
          c._elMeta.push({id:'marker',itemKey:item.key,label:'Ersparnis-Marker',x:dX-dR*1.2,y:dY-dR*1.2,w:dR*2.4,h:dR*2.4,ovKey:'discount'});
          if(pOv.discountRot){ctx.save();ctx.translate(dX,dY);ctx.rotate(pOv.discountRot*Math.PI/180);drawSavingsBurst(ctx,0,0,dR,dRi,'-'+cardSavingsPct+'%','plakat',cfg);ctx.restore();}
          else drawSavingsBurst(ctx,dX,dY,dR,dRi,'-'+cardSavingsPct+'%','plakat',cfg);
        }
      }
      // Einkaufstaschen-Deko unten rechts
      if(cfg.showBag){ctx.save();ctx.globalAlpha=1.0;ctx.font='36px Arial, sans-serif';ctx.textAlign='right';
      ctx.fillStyle=cfg.leafColor;ctx.fillText('\uD83D\uDECD',cx+cellW-cardPad+4,cy+cellH-cardPad+2);ctx.restore();}
      ctx.textAlign='left';
    });
    // Footer removed per user request
    ctx.textAlign='left';
    Promise.all([logoLoaded].concat(_clCiPromises)).then(function(){if(opts&&opts.returnCanvas)callback(c);else c.toBlob(function(blob){callback(blob);},'image/png');});
  }

    return {
      drawPriceImage:drawPriceImage,
      loadPriceFont:loadPriceFont,
      cfgForKind:cfgForKind,
      getOfferTemplate:getOfferTemplate,
      getTplColors:getTplColors,
      tplGradFill:tplGradFill,
      getOfferTheme:getOfferTheme,
      wrapTextCMS:wrapTextCMS,
      drawTagShapePath:drawTagShapePath,
      fillTagShape:fillTagShape,
      _freistellCanvas:_freistellCanvas,
      flyerArtOverrideDefault:flyerArtOverrideDefault,
      plakatArtOverrideDefault:plakatArtOverrideDefault,
      drawExtraCopies:drawExtraCopies,
      drawExtraCopiesCenter:drawExtraCopiesCenter,
      hdKontext:hdKontext,
      hdLogoSrc:hdLogoSrc,
      truncText:truncText,
      loadItemImage:loadItemImage,
      getSavingsPercent:getSavingsPercent,
      getSavingsBurstTheme:getSavingsBurstTheme,
      getSavingsMarkerType:getSavingsMarkerType,
      drawSavingsBurst:drawSavingsBurst,
      semibold:semibold,
      generateEinzelflyer:generateEinzelflyer,
      drawAngebotPlakat:drawAngebotPlakat
    };
  }
  return {
    create:create,
    drawPriceImage:drawPriceImage,
    loadPriceFont:loadPriceFont,
    TAG_PRESETS:TAG_PRESETS,
    drawLeafDecoration:drawLeafDecoration,
    CFG_DEFAULTS:CFG_DEFAULTS,
    PERSEC_COLORS:PERSEC_COLORS,
    PERSEC_RANGES:PERSEC_RANGES,
    PERSEC_CHECKS:PERSEC_CHECKS,
    PERSEC_SELECTS:PERSEC_SELECTS,
    PERSEC_COLOR_MAP:PERSEC_COLOR_MAP,
    TPL_COLOR_DEFAULTS:TPL_COLOR_DEFAULTS,
    TPL_COLOR_KEYS:TPL_COLOR_KEYS,
    TPL_GRAD_KEYS:TPL_GRAD_KEYS
  };
})();
