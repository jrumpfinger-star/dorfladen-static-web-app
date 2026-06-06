/**
 * Shared image loading from SharePoint via /api/werbebilder.
 * Used by shop.html and shop-freigabe.html to avoid duplicate logic.
 *
 * Usage:
 *   ShopImages.loadBatch(articleInfos, opts)
 *
 *   articleInfos: Array of {artikelnummer, edeka_nr, strichcode}
 *   opts.apiBase:     API base path, default '/api'
 *   opts.cacheKey:    function(info) returning the key used for caching & DOM lookup (e.g. info.artikelnummer or info.strichcode)
 *   opts.onImage:     function(key, src) called when an image is resolved
 *   opts.batchSize:   number of articles per batch, default 24
 *   opts.runCheck:    function() returning false to abort (for run-id invalidation)
 */
var ShopImages=(function(){
  'use strict';

  function _fetchBatch(batch, keyMap, opts){
    var apiBase=opts.apiBase||'/api';
    return fetch(apiBase+'/werbebilder?sharepoint=1',{
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body:JSON.stringify({articles:batch})
    }).then(function(r){return r.json();}).then(function(data){
      (data||[]).forEach(function(row){
        var respNr=(row.dl_artikelnummer||'').toString().trim();
        if(!respNr) return;
        var key=keyMap[respNr]||respNr;
        var src='';
        if(row.dl_bild_base64){
          src=row.dl_bild_base64.startsWith('data:')?row.dl_bild_base64:'data:image/jpeg;base64,'+row.dl_bild_base64;
        }
        if(!src) return;
        if(opts.onImage) opts.onImage(key, src);
      });
    });
  }

  function loadBatch(articleInfos, opts){
    opts=opts||{};
    var cacheKeyFn=opts.cacheKey||function(info){return info.artikelnummer;};
    var batchSize=opts.batchSize||24;
    var runCheck=opts.runCheck||function(){return true;};

    (async function(){
      for(var i=0;i<articleInfos.length;i+=batchSize){
        if(!runCheck()) return;
        var batch=articleInfos.slice(i,i+batchSize);
        // Build reverse map: any identifier → cacheKey
        var keyMap={};
        batch.forEach(function(info){
          var k=cacheKeyFn(info);
          keyMap[k]=k;
          if(info.artikelnummer) keyMap[info.artikelnummer]=k;
          if(info.strichcode) keyMap[info.strichcode]=k;
          if(info.edeka_nr) keyMap[info.edeka_nr]=k;
        });
        try{
          await _fetchBatch(batch, keyMap, opts);
        }catch(err){
          console.warn('[ShopImages] batch error',err);
        }
        await new Promise(function(resolve){setTimeout(resolve,20);});
      }
    })();
  }

  return {loadBatch:loadBatch};
})();
