/* Live Preisliste - loads from /api/preisliste */
(function(){
  var API='https://dorfladen-cms-v4.azurewebsites.net/api/preisliste';
  var wrap=document.getElementById('preisliste-live');
  if(!wrap)return;
  wrap.innerHTML='<p style="text-align:center;padding:40px;color:#888">Preisliste wird geladen&hellip;</p>';

  fetch(API).then(function(r){return r.json()}).then(function(data){
    if(data.error){wrap.innerHTML='<p style="color:#c00">Fehler: '+data.error+'</p>';return;}

    var groups=data.groups||{};
    var wgNames=Object.keys(groups).sort();
    var html='';

    // Header
    html+='<div class="so-header"><h2>Preisliste</h2>';
    html+='<p>'+data.total+' Artikel in '+data.warengruppen+' Warengruppen &mdash; Live-Daten</p>';
    html+='<div class="so-legend">';
    html+='<span class="so-filter-btn" data-filter="rp">&#x1F534; Roter Punkt &ndash; g&uuml;nstiger als UVP</span>';
    html+='<span class="so-filter-btn" data-filter="ang"><span style="color:#e65100;font-size:1.1em">&#9733;</span> Sonderangebot</span>';
    html+='</div></div>';

    // Search
    html+='<div class="so-search"><span class="so-search-icon">&#128269;</span>';
    html+='<input type="text" id="soSearch" placeholder="Artikel suchen&hellip;" autocomplete="off"></div>';
    html+='<div class="so-noresult" id="soNoResult" style="display:none">Kein Artikel gefunden.</div>';

    // Groups
    wgNames.forEach(function(wg){
      var items=groups[wg];
      var rows='';
      items.forEach(function(item){
        var cls='';
        var namePrefix='';
        var vkHtml=fmtPrice(item.vk)+'&nbsp;&euro;';
        var uvpHtml='';
        var saveHtml='';

        if(item.uvp && item.vk < item.uvp){
          var disc=Math.round((item.uvp-item.vk)/item.uvp*100);
          if(disc>5 && disc<=60){
            cls='so-row-rp';
            namePrefix='<span class="so-rp-dot" title="Roter Punkt">&#x1F534;</span> ';
            uvpHtml='<span style="text-decoration:line-through;color:#999">'+fmtPrice(item.uvp)+'&nbsp;&euro;</span>';
            saveHtml='<span class="rp-badge" style="background:#c62828;color:#fff;padding:2px 7px;border-radius:8px;font-weight:700;font-size:.72rem">-'+disc+'%</span>';
          }
        }
        if(item.angebot){
          cls='so-row-ang';
          namePrefix='<span style="color:#e65100;font-size:.9em">&#9733;</span> ';
          if(item.angebot_statt){
            vkHtml='<span style="text-decoration:line-through;color:#999;font-size:.75rem;margin-right:4px">'+fmtPrice(item.angebot_statt)+'&nbsp;&euro;</span> '+fmtPrice(item.angebot_preis)+'&nbsp;&euro;';
          }
        }

        rows+='<tr data-art="'+esc(item.bezeichnung.toLowerCase())+'" class="'+cls+'">';
        rows+='<td class="so-name">'+namePrefix+esc(item.bezeichnung)+'</td>';
        rows+='<td class="so-vk">'+vkHtml+'</td>';
        rows+='<td class="so-uvp">'+uvpHtml+'</td>';
        rows+='<td class="so-save">'+saveHtml+'</td></tr>';
      });

      html+='<div class="so-group" data-wg="'+esc(wg.toLowerCase())+'">';
      html+='<button class="so-toggle" aria-expanded="false">';
      html+='<span class="so-wg-name">'+esc(wg)+'</span>';
      html+='<span class="so-count" data-total="'+items.length+'">'+items.length+'</span>';
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

  function fmtPrice(p){return p.toFixed(2).replace('.',',');}
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
      el.style.cursor='pointer';
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
