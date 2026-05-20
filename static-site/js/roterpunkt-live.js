/* Live Roter Punkt - loads from /api/roterpunkt */
(function(){
  var API='/api';
  var wrap=document.getElementById('roterpunkt-live');
  if(!wrap)return;
  wrap.innerHTML='<p style="text-align:center;padding:40px;color:#888">Roter-Punkt-Artikel werden geladen&hellip;</p>';

  fetch(API+'/roterpunkt').then(function(r){return r.json()}).then(function(data){
    if(data.error){wrap.innerHTML='<p style="color:#c00">Fehler: '+data.error+'</p>';return;}

    var groups=data.groups||{};
    var wgNames=Object.keys(groups).sort();
    var html='';

    // Banner + Info compact
    html+='<div style="background:#fff5f5;border-left:4px solid #c62828;padding:10px 14px;border-radius:0 8px 8px 0;margin-bottom:10px;font-size:.88rem;line-height:1.5;color:#444">';
    html+='<span style="font-size:1rem">&#x1F534;</span> ';
    html+='<strong style="color:#c62828">'+data.total+' Artikel</strong> dauerhaft g&uuml;nstiger als UVP';
    html+='</div>';

    // Search
    html+='<div class="so-search"><span class="so-search-icon">&#128269;</span>';
    html+='<input type="text" id="rpSearch" placeholder="Artikel suchen&hellip;" autocomplete="off"></div>';
    html+='<div id="rpNoResult" style="display:none;text-align:center;padding:20px;color:#999;font-size:.88rem">Kein Artikel gefunden.</div>';

    // Groups
    wgNames.forEach(function(wg){
      var items=groups[wg];
      var avgDisc=0;
      var validItems=0;
      items.forEach(function(i){
        if(i.discount>0){
          avgDisc+=i.discount;
          validItems++;
        }
      });
      avgDisc=validItems>0?Math.round(avgDisc/validItems):0;

      var rows='';
      items.forEach(function(item){
        var saving=item.uvp&&item.uvp>0&&item.vk>0?(item.uvp-item.vk):0;
        rows+='<tr data-art="'+esc(item.bezeichnung.toLowerCase())+'">';
        rows+='<td class="rp-name">'+esc(item.bezeichnung)+'</td>';
        rows+='<td class="rp-vk">'+fmtPrice(item.vk)+'&nbsp;&euro;</td>';
        rows+='<td class="rp-uvp">'+fmtPrice(item.uvp)+'&nbsp;&euro;</td>';
        rows+='<td class="rp-disc"><span class="rp-badge">-'+Math.round(item.discount)+'%</span>';
        if(saving>0.004) rows+='<span class="rp-saving">('+ fmtPrice(saving)+'&nbsp;&euro;)</span>';
        rows+='</td></tr>';
      });

      html+='<div class="rp-group">';
      html+='<button class="rp-toggle" aria-expanded="false">';
      html+='<span class="rp-dot">&#x1F534;</span>';
      html+='<span class="rp-wg-name">'+esc(wg)+'</span>';
      html+='<span class="rp-count" data-total="'+items.length+'">'+items.length+' Artikel</span>';
      html+='<span class="rp-avg">&Oslash; -'+avgDisc+'%</span>';
      html+='<span class="rp-arrow">&#9660;</span></button>';
      html+='<div class="rp-panel" style="display:none"><table class="rp-table"><thead><tr>';
      html+='<th class="rp-th-name">Artikel</th>';
      html+='<th class="rp-th-vk">Unser Preis</th>';
      html+='<th class="rp-th-uvp">UVP</th>';
      html+='<th class="rp-th-disc">Ersparnis</th>';
      html+='</tr></thead><tbody>'+rows+'</tbody></table></div></div>';
    });

    html+='<div style="text-align:center;margin-top:24px;font-size:.82rem;color:#aaa">';
    html+='<p>Stand: '+data.generated.substring(0,10)+' &mdash; Live-Daten</p>';
    html+='<p><a href="/">&larr; Zur&uuml;ck zur Startseite</a></p></div>';

    wrap.innerHTML=html;
    initRP();
  }).catch(function(e){
    wrap.innerHTML='<p style="color:#c00;text-align:center;padding:40px">Roter-Punkt-Daten konnten nicht geladen werden.</p>';
    console.error('RP load failed',e);
  });

  function fmtPrice(p){return p===null||p===undefined?'—':p.toFixed(2).replace('.',',');}
  function esc(s){var d=document.createElement('div');d.textContent=s;return d.innerHTML;}

  function initRP(){
    var input=document.getElementById('rpSearch');
    var groups=document.querySelectorAll('.rp-group');
    var noRes=document.getElementById('rpNoResult');
    if(!input||!groups.length)return;

    // Toggle accordion
    groups.forEach(function(g){
      var btn=g.querySelector('.rp-toggle');
      if(btn)btn.addEventListener('click',function(){
        var p=g.querySelector('.rp-panel');
        var a=g.querySelector('.rp-arrow');
        var open=p.style.display==='none';
        p.style.display=open?'block':'none';
        a.innerHTML=open?'&#9650;':'&#9660;';
      });
    });

    // Search
    input.addEventListener('input',function(){
      var q=this.value.trim().toLowerCase(),any=false;
      groups.forEach(function(g){
        var rows=g.querySelectorAll('tr[data-art]'),vis=0;
        rows.forEach(function(r){
          var show=!q||r.getAttribute('data-art').indexOf(q)!==-1;
          r.style.display=show?'':'none';
          if(show)vis++;
        });
        g.style.display=vis>0||!q?'':'none';
        if(vis>0||!q)any=true;
        var badge=g.querySelector('.rp-count');
        if(badge)badge.textContent=q?vis+' Artikel':badge.getAttribute('data-total')+' Artikel';
        var panel=g.querySelector('.rp-panel');
        if(q&&vis>0){panel.style.display='block';g.querySelector('.rp-arrow').innerHTML='&#9650;';}
        else if(!q){panel.style.display='none';g.querySelector('.rp-arrow').innerHTML='&#9660;';}
      });
      noRes.style.display=any?'none':'block';
    });
  }
})();
