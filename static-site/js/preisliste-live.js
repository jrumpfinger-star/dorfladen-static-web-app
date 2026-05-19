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
    html+='<p>'+data.total+' Artikel in '+data.warengruppen+' Warengruppen &mdash; Live-Daten</p>';
    html+='<div class="so-legend">';
    html+='<span class="so-filter-btn" data-filter="rp"><span class="so-dot-rp"></span> Roter Punkt &ndash; g&uuml;nstiger als UVP <small>('+rpCount+')</small></span>';
    html+='<span class="so-filter-btn" data-filter="ang"><span class="so-star-ang">&#9733;</span> Sonderangebot <small>('+angCount+')</small></span>';
    html+='</div></div>';

    // Search
    html+='<div class="so-search"><span class="so-search-icon">&#128269;</span>';
    html+='<input type="text" id="soSearch" placeholder="Artikel suchen&hellip;" autocomplete="off"></div>';
    html+='<div class="so-noresult" id="soNoResult" style="display:none">Kein Artikel gefunden.</div>';

    // Groups
    wgNames.forEach(function(wg){
      var items=groups[wg];
      var wgRp=0,wgAng=0,wgDiscSum=0,wgDiscCount=0;
      var rows='';

      // Table header
      rows+='<tr class="so-thead"><th class="so-th-name">ARTIKEL</th><th class="so-th-vk">VK DORF</th><th class="so-th-uvp">UVP</th><th class="so-th-save">ERSPARNIS</th></tr>';

      items.forEach(function(item){
        var cls='';
        var nameHtml=esc(item.bezeichnung);
        var vkHtml=fmtPrice(item.vk)+'&nbsp;&euro;';
        var uvpHtml='&mdash;';
        var saveHtml='';

        // Roter Punkt: use backend flag
        if(item.rp){
          cls='so-row-rp';
          nameHtml='<span class="so-dot-rp" title="Roter Punkt"></span> '+esc(item.bezeichnung);
          wgRp++;
          if(item.uvp){
            uvpHtml='<span class="so-uvp-strike">'+fmtPrice(item.uvp)+'&nbsp;&euro;</span>';
          }
          if(item.discount>0){
            saveHtml='<span class="so-save-badge">-'+item.discount+'%</span>';
            wgDiscSum+=item.discount;
            wgDiscCount++;
          }
        } else if(item.uvp && item.uvp>0){
          uvpHtml=fmtPrice(item.uvp)+'&nbsp;&euro;';
        }

        // Sonderangebot: use backend flag
        if(item.angebot){
          cls+=(cls?' ':'')+'so-row-ang';
          nameHtml='<span class="so-star-ang">&#9733;</span> '+esc(item.bezeichnung);
          wgAng++;
          if(item.angebot_statt && item.angebot_preis){
            vkHtml='<span class="so-price-old">'+fmtPrice(item.angebot_statt)+'&nbsp;&euro;</span> <span class="so-price-new">'+fmtPrice(item.angebot_preis)+'&nbsp;&euro;</span>';
          } else if(item.angebot_preis){
            vkHtml='<span class="so-price-new">'+fmtPrice(item.angebot_preis)+'&nbsp;&euro;</span>';
          }
        }

        rows+='<tr data-art="'+esc(item.bezeichnung.toLowerCase())+'" class="'+cls.trim()+'">';
        rows+='<td class="so-name">'+nameHtml+'</td>';
        rows+='<td class="so-vk">'+vkHtml+'</td>';
        rows+='<td class="so-uvp">'+uvpHtml+'</td>';
        rows+='<td class="so-save">'+saveHtml+'</td></tr>';
      });

      // Group header with badges
      var avgDisc=wgDiscCount>0?Math.round(wgDiscSum/wgDiscCount):0;
      html+='<div class="so-group" data-wg="'+esc(wg.toLowerCase())+'">';
      html+='<button class="so-toggle" aria-expanded="false">';
      if(wgRp>0) html+='<span class="so-dot-rp"></span> ';
      html+='<span class="so-wg-name">'+esc(wg)+'</span>';
      html+='<span class="so-count" data-total="'+items.length+'">'+items.length+' Artikel</span>';
      if(avgDisc>0) html+=' <span class="so-wg-disc">&Oslash; -'+avgDisc+'%</span>';
      html+='<span class="so-arrow">&#9660;</span></button>';
      html+='<div class="so-panel" style="display:none"><table class="so-table"><tbody>'+rows+'</tbody></table></div></div>';
    });

    html+='<div class="so-foot"><p>Stand: '+data.generated.substring(0,10)+'</p></div>';
    wrap.innerHTML=html;

    // Init filter & search after render
    initFilterSearch();
  }).catch(function(e){
    wrap.innerHTML='<p style="color:#c00;text-align:center;padding:40px">Preisliste konnte nicht geladen werden.</p>';
    console.error('Preisliste load failed',e);
  });

  function fmtPrice(p){if(p===null||p===undefined)return '0,00';return p.toFixed(2).replace('.',',');}
  function esc(s){var d=document.createElement('div');d.textContent=s;return d.innerHTML;}

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
        var badge=g.querySelector('.so-count');
        if(badge)badge.textContent=(q||activeFilter)?vis:badge.getAttribute('data-total');
        var panel=g.querySelector('.so-panel');
        if((q||activeFilter)&&vis>0){panel.style.display='block';g.querySelector('.so-arrow').innerHTML='&#9650;';}
        else if(!q&&!activeFilter){panel.style.display='none';g.querySelector('.so-arrow').innerHTML='&#9660;';}
      });
      noRes.style.display=any?'none':'block';
    }

    input.addEventListener('input',applyFilter);

    // Legend filter buttons
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
