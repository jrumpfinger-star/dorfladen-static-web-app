/* Live Preisliste - loads from /api/preisliste */
(function(){
  var API='/api/preisliste';
  var wrap=document.getElementById('preisliste-live');
  if(!wrap)return;
  wrap.innerHTML='<p style="text-align:center;padding:40px;color:#888">Preisliste wird geladen&hellip;</p>';

  fetch(API).then(function(r){return r.json()}).then(function(data){
    if(data.error){wrap.innerHTML='<p style="color:#c00">Fehler: '+data.error+'</p>';return;}

    var groups=data.groups||{};
    var wgNames=Object.keys(groups).sort();
    var rpCount=data.rp_count||0;
    var angCount=data.ang_count||0;
    var html='';

    // Header
    html+='<div class="so-header"><h2>Preisliste</h2>';
    html+='<p class="so-subtitle">'+data.total+' Artikel in '+data.warengruppen+' Warengruppen &mdash; Stand '+data.generated.substring(0,10)+'</p>';
    // Filter buttons
    html+='<div class="so-filters">';
    html+='<span class="so-filter-btn" data-filter="rp">&#x1F534; G&uuml;nstiger als UVP ('+rpCount+')</span>';
    html+='<span class="so-filter-btn" data-filter="ang">&#9733; Sonderangebot ('+angCount+')</span>';
    html+='</div></div>';

    // Search + Barcode
    html+='<div class="so-search"><span class="so-search-icon">&#128269;</span>';
    html+='<input type="text" id="soSearch" placeholder="Artikel suchen&hellip;" autocomplete="off">';
    html+='<button type="button" id="soBarcodeBtn" class="so-barcode-btn" title="Barcode scannen">&#x1F4F7;</button></div>';
    html+='<div id="soBarcodeScanner" style="display:none"><div id="soBarcodeReader"></div><button type="button" id="soBarcodeClose" class="so-barcode-close">&times; Scanner schlie&szlig;en</button></div>';
    html+='<div id="soBarcodeResult" class="so-barcode-result" style="display:none"></div>';
    html+='<div class="so-noresult" id="soNoResult" style="display:none">Kein Artikel gefunden.</div>';

    // Groups
    wgNames.forEach(function(wg){
      var items=groups[wg];
      var wgRp=0,wgAng=0;
      var rows='';

      items.forEach(function(item){
        var cls='';
        var nameHtml=esc(item.bezeichnung);
        var vkStr=fmtPrice(item.vk);
        var extraHtml='';

        // Roter Punkt
        var disc = item.discount || 0;
        if(item.uvp && item.uvp > 0 && item.vk > 0 && !disc){
          disc = Math.round((item.uvp - item.vk) / item.uvp * 100);
        }
        var is_rp = item.rp && disc >= 5 && disc <= 70;
        if(is_rp){
          cls='so-row-rp';
          wgRp++;
          extraHtml='<span class="so-discount">-'+disc+'%</span>';
          extraHtml+='<span class="so-statt">UVP '+fmtPrice(item.uvp)+'&nbsp;&euro;</span>';
        }

        // Sonderangebot
        if(item.angebot){
          cls+=(cls?' ':'')+'so-row-ang';
          wgAng++;
          if(item.angebot_statt && item.angebot_preis){
            vkStr=fmtPrice(item.angebot_preis);
            extraHtml='<span class="so-statt">statt '+fmtPrice(item.angebot_statt)+'&nbsp;&euro;</span>';
          } else if(item.angebot_preis){
            vkStr=fmtPrice(item.angebot_preis);
          }
        }

        var discHtml=extraHtml||'&nbsp;';
        var bc=item.strichcode||'';
        rows+='<tr data-art="'+esc(item.bezeichnung.toLowerCase())+'" data-barcode="'+esc(bc)+'" class="'+cls.trim()+'">';
        rows+='<td class="so-td-name">'+nameHtml+'</td>';
        rows+='<td class="so-td-disc">'+discHtml+'</td>';
        rows+='<td class="so-td-price">'+vkStr+'&nbsp;&euro;</td></tr>';
      });

      // Group header — clean, no markers
      html+='<div class="so-group" data-wg="'+esc(wg.toLowerCase())+'">';
      html+='<button class="so-toggle" aria-expanded="false">';
      html+='<span class="so-wg-name">'+esc(wg)+'</span>';
      html+='<span class="so-wg-meta">'+items.length+'</span>';
      html+='<span class="so-arrow">&#9660;</span></button>';
      html+='<div class="so-panel" style="display:none"><table class="so-table"><tbody>'+rows+'</tbody></table></div></div>';
    });

    wrap.innerHTML=html;
    initFilterSearch();
    initBarcodeScanner(data);
  }).catch(function(e){
    wrap.innerHTML='<p style="color:#c00;text-align:center;padding:40px">Preisliste konnte nicht geladen werden.</p>';
    console.error('Preisliste load failed',e);
  });

  function fmtPrice(p){if(p===null||p===undefined)return '0,00';return p.toFixed(2).replace('.',',');}
  function esc(s){var d=document.createElement('div');d.textContent=s;return d.innerHTML;}

  function initBarcodeScanner(data){
    var scanBtn=document.getElementById('soBarcodeBtn');
    var scannerDiv=document.getElementById('soBarcodeScanner');
    var readerDiv=document.getElementById('soBarcodeReader');
    var closeBtn=document.getElementById('soBarcodeClose');
    var resultDiv=document.getElementById('soBarcodeResult');
    if(!scanBtn||!scannerDiv)return;
    var scanner=null;
    var allItems=[];
    var gs=data.groups||{};
    Object.keys(gs).forEach(function(wg){
      gs[wg].forEach(function(it){allItems.push({wg:wg,item:it});});
    });

    function findByBarcode(code){
      code=code.trim();
      var found=[];
      allItems.forEach(function(entry){
        var bc=entry.item.strichcode||'';
        if(bc&&bc.indexOf(code)!==-1)found.push(entry);
      });
      return found;
    }

    function showResult(code,matches){
      if(!matches.length){
        resultDiv.innerHTML='<div class="so-bc-notfound">&#x26A0; Artikel mit EAN <b>'+esc(code)+'</b> nicht im Sortiment gefunden.</div>';
        resultDiv.style.display='block';
        return;
      }
      var h='<div class="so-bc-found"><p>&#x2705; '+matches.length+' Artikel f&uuml;r EAN <b>'+esc(code)+'</b> gefunden:</p><table class="so-table">';
      matches.forEach(function(m){
        var it=m.item;
        var preis=it.angebot&&it.angebot_preis?it.angebot_preis:it.vk;
        h+='<tr><td class="so-td-name">'+esc(it.bezeichnung)+'<br><small style="color:#888">'+esc(m.wg)+'</small></td>';
        h+='<td class="so-td-price">'+fmtPrice(preis)+'&nbsp;&euro;</td></tr>';
      });
      h+='</table></div>';
      resultDiv.innerHTML=h;
      resultDiv.style.display='block';
    }

    function stopScanner(){
      if(scanner){
        scanner.stop().then(function(){scanner.clear();}).catch(function(){});
        scanner=null;
      }
      scannerDiv.style.display='none';
    }

    function onBarcodeScanned(code){
      var matches=findByBarcode(code);
      if(matches.length){showResult(code,matches);return;}
      // Fallback: API lookup (bypasses 6-month filter)
      resultDiv.innerHTML='<div style="text-align:center;padding:14px;color:#666">Suche EAN '+esc(code)+' in Datenbank...</div>';
      resultDiv.style.display='block';
      fetch('/api/preisliste?barcode='+encodeURIComponent(code))
        .then(function(r){return r.json();})
        .then(function(d){
          if(d.results&&d.results.length){
            var apiMatches=[];
            d.results.forEach(function(r){apiMatches.push({wg:r.warengruppe,item:{bezeichnung:r.bezeichnung,vk:r.vk,strichcode:r.strichcode}});});
            showResult(code,apiMatches);
          }else{showResult(code,[]);}
        }).catch(function(){showResult(code,[]);});
    }

    scanBtn.addEventListener('click',function(){
      if(typeof Html5Qrcode==='undefined'){alert('Barcode-Scanner Library nicht geladen.');return;}
      resultDiv.style.display='none';
      resultDiv.innerHTML='';
      scannerDiv.style.display='block';
      scanner=new Html5Qrcode('soBarcodeReader');
      scanner.start(
        {facingMode:'environment'},
        {fps:10,qrbox:{width:280,height:150},formatsToSupport:[0,1,2,3,4,5,6,7,8,9,10,11,12,13,14,15]},
        function(decodedText){
          stopScanner();
          onBarcodeScanned(decodedText);
        },
        function(){}
      ).catch(function(err){
        stopScanner();
        alert('Kamera konnte nicht ge\u00f6ffnet werden.\n'+err);
      });
    });

    closeBtn.addEventListener('click',function(){stopScanner();});
  }

  function initFilterSearch(){
    var input=document.getElementById('soSearch');
    var groups=document.querySelectorAll('.so-group');
    var noRes=document.getElementById('soNoResult');
    if(!input||!groups.length)return;

    var activeFilter='';

    // Toggle accordion
    groups.forEach(function(g){
      var btn=g.querySelector('.so-toggle');
      if(btn)btn.addEventListener('click',function(){
        var p=g.querySelector('.so-panel');
        var a=g.querySelector('.so-arrow');
        var open=p.style.display==='none';
        p.style.display=open?'block':'none';
        a.innerHTML=open?'&#9650;':'&#9660;';
        btn.setAttribute('aria-expanded',open?'true':'false');
      });
    });

    function applyFilter(){
      var q=input.value.trim().toLowerCase(),any=false;
      groups.forEach(function(g){
        var rows=g.querySelectorAll('tr[data-art]'),vis=0;
        rows.forEach(function(r){
          var matchQ=!q||r.getAttribute('data-art').indexOf(q)!==-1;
          var matchF=!activeFilter||(activeFilter==='rp'&&r.classList.contains('so-row-rp'))||(activeFilter==='ang'&&r.classList.contains('so-row-ang'));
          var show=matchQ&&matchF;
          r.style.display=show?'':'none';
          if(show)vis++;
        });
        g.style.display=(vis>0||(!q&&!activeFilter))?'':'none';
        if(vis>0||(!q&&!activeFilter))any=true;
        // Update count in header
        var meta=g.querySelector('.so-wg-meta');
        if(meta){
          var total=g.querySelectorAll('tr[data-art]').length;
          meta.firstChild.textContent=(q||activeFilter)?vis:total;
        }
        var panel=g.querySelector('.so-panel');
        if((q||activeFilter)&&vis>0){panel.style.display='block';g.querySelector('.so-arrow').innerHTML='&#9650;';}
        else if(!q&&!activeFilter){panel.style.display='none';g.querySelector('.so-arrow').innerHTML='&#9660;';}
      });
      noRes.style.display=any?'none':'block';
    }

    input.addEventListener('input',applyFilter);

    // Filter buttons
    document.querySelectorAll('.so-filter-btn').forEach(function(el){
      var type=el.getAttribute('data-filter');
      if(!type)return;
      el.addEventListener('click',function(){
        if(activeFilter===type){
          activeFilter='';this.classList.remove('so-filter-active');
        }else{
          document.querySelectorAll('.so-filter-btn').forEach(function(s){s.classList.remove('so-filter-active')});
          activeFilter=type;this.classList.add('so-filter-active');
        }
        applyFilter();
      });
    });
  }
})();
