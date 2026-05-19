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
    if(angCount>0) html+='<span class="so-filter-btn" data-filter="ang">&#9733; Sonderangebot ('+angCount+')</span>';
    html+='</div></div>';

    // Search
    html+='<div class="so-search"><span class="so-search-icon">&#128269;</span>';
    html+='<input type="text" id="soSearch" placeholder="Artikel suchen&hellip;" autocomplete="off"></div>';
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
        if(item.rp){
          cls='so-row-rp';
          wgRp++;
          if(item.discount>0 && item.uvp){
            extraHtml='<span class="so-discount">-'+item.discount+'%</span>';
          }
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

        rows+='<tr data-art="'+esc(item.bezeichnung.toLowerCase())+'" class="'+cls.trim()+'">';
        rows+='<td class="so-td-name">'+nameHtml+'</td>';
        rows+='<td class="so-td-price">'+vkStr+'&nbsp;&euro;'+extraHtml+'</td></tr>';
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
