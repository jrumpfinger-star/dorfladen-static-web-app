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
        var mengeHtml=item.menge?'<span class="so-menge">'+esc(item.menge)+'</span>':'';
        rows+='<tr data-art="'+esc(item.bezeichnung.toLowerCase())+'" data-barcode="'+esc(bc)+'" class="'+cls.trim()+'">';
        rows+='<td class="so-td-bc">'+(bc?esc(bc):'')+'</td>';
        rows+='<td class="so-td-name">'+nameHtml+mengeHtml+'</td>';
        rows+='<td class="so-td-disc">'+discHtml+'</td>';
        rows+='<td class="so-td-price">'+vkStr+'&nbsp;&euro;</td></tr>'
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
  /* inject so-menge style once */
  (function(){
    if(document.getElementById('so-menge-style'))return;
    var s=document.createElement('style');s.id='so-menge-style';
    s.textContent='.so-menge{display:inline-block;margin-left:6px;padding:1px 7px;background:#e8f5e9;color:#2e7d32;border-radius:10px;font-size:.72rem;font-weight:600;white-space:nowrap}';
    document.head.appendChild(s);
  })();
  function esc(s){var d=document.createElement('div');d.textContent=s;return d.innerHTML;}

  function initBarcodeScanner(data){
    var scanBtn=document.getElementById('soBarcodeBtn');
    var scannerDiv=document.getElementById('soBarcodeScanner');
    var readerDiv=document.getElementById('soBarcodeReader');
    var closeBtn=document.getElementById('soBarcodeClose');
    var resultDiv=document.getElementById('soBarcodeResult');
    if(!scanBtn||!scannerDiv)return;
    if(window._dlFeatScanner===false){scanBtn.style.display='none';return;}
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
        var savingsHtml='';
        var disc=it.discount||0;
        if(it.uvp&&it.uvp>0&&it.vk>0&&!disc) disc=Math.round((it.uvp-it.vk)/it.uvp*100);
        if(it.uvp&&it.uvp>0&&disc>5&&disc<=70){
          var saving=(it.uvp-it.vk);
          savingsHtml='<div style="margin-top:4px;display:flex;align-items:center;gap:6px;flex-wrap:wrap">';
          savingsHtml+='<span style="background:#c62828;color:#fff;padding:1px 6px;border-radius:6px;font-size:.72rem;font-weight:700">-'+disc+'%</span>';
          savingsHtml+='<span style="color:#999;font-size:.78rem;text-decoration:line-through">UVP '+fmtPrice(it.uvp)+'&nbsp;&euro;</span>';
          if(saving>0.004) savingsHtml+='<span style="color:#2e7d32;font-size:.78rem;font-weight:600">Sie sparen '+fmtPrice(saving)+'&nbsp;&euro;</span>';
          savingsHtml+='</div>';
        }
        var badges='';
        if(it.angebot) badges+='<span style="background:#ff6f00;color:#fff;padding:1px 6px;border-radius:6px;font-size:.72rem;font-weight:700;margin-right:4px">\u2B50 Angebot</span>';
        if(disc>5&&disc<=70) badges+='<span style="background:#2e7d32;color:#fff;padding:1px 6px;border-radius:6px;font-size:.72rem;font-weight:700">\uD83D\uDCB0 Ersparnis</span>';
        var badgesHtml=badges?'<div style="margin-top:3px">'+badges+'</div>':'';
        h+='<tr><td class="so-td-name">'+esc(it.bezeichnung)+'<br><small style="color:#888">'+esc(m.wg)+'</small>'+badgesHtml+savingsHtml+'</td>';
        var preisCell=fmtPrice(preis)+'&nbsp;&euro;';
        if(it.angebot&&it.angebot_preis&&it.vk&&it.angebot_preis<it.vk) preisCell+='<br><span style="text-decoration:line-through;color:#999;font-size:.75rem;font-weight:400">'+fmtPrice(it.vk)+'&nbsp;&euro;</span>';
        h+='<td class="so-td-price">'+preisCell+'</td></tr>';
      });
      h+='</table></div>';
      resultDiv.innerHTML=h;
      resultDiv.style.display='block';
    }

    var _scanActive=false;
    function stopScanner(){
      if(_scanActive){
        Quagga.stop();
        _scanActive=false;
      }
      readerDiv.innerHTML='';
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
            d.results.forEach(function(r){apiMatches.push({wg:r.warengruppe,item:{bezeichnung:r.bezeichnung,vk:r.vk,strichcode:r.strichcode,uvp:r.uvp||0,discount:r.discount||0,rp:r.rp,angebot:r.angebot,angebot_preis:r.angebot_preis}});});
            showResult(code,apiMatches);
          }else{showResult(code,[]);}
        }).catch(function(){showResult(code,[]);});
    }

    scanBtn.addEventListener('click',function(){
      if(typeof Quagga==='undefined'){alert('Barcode-Scanner Library nicht geladen.');return;}
      resultDiv.style.display='none';
      resultDiv.innerHTML='';
      scannerDiv.style.display='block';
      Quagga.init({
        inputStream:{name:'Live',type:'LiveStream',target:readerDiv,
          constraints:{facingMode:'environment',width:{ideal:1280},height:{ideal:720}}},
        locator:{patchSize:'medium',halfSample:true},
        decoder:{readers:['ean_reader','ean_8_reader','upc_reader','upc_e_reader','code_128_reader']},
        locate:true,
        frequency:15
      },function(err){
        if(err){stopScanner();alert('Kamera konnte nicht ge\u00f6ffnet werden.\n'+err);return;}
        Quagga.start();
        _scanActive=true;
      });
      Quagga.offDetected();
      Quagga.onDetected(function(result){
        if(!result||!result.codeResult||!result.codeResult.code)return;
        // Confidence check: reject low-quality reads
        var errs=result.codeResult.decodedCodes;
        if(errs&&errs.length){
          var sumErr=0,cnt=0;
          errs.forEach(function(d){if(typeof d.error==='number'){sumErr+=d.error;cnt++;}});
          if(cnt>0&&(sumErr/cnt)>0.15)return; // avg error > 15% → skip
        }
        stopScanner();
        onBarcodeScanned(result.codeResult.code);
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
