/* Live Roter Punkt - loads from /api/roterpunkt */
(function(){
  var API='/api';
  var DISC_MIN=5, DISC_MAX=60;
  var wrap=document.getElementById('roterpunkt-live');
  if(!wrap)return;
  wrap.innerHTML='<p style="text-align:center;padding:40px;color:#888">Roter-Punkt-Artikel werden geladen&hellip;</p>';

  fetch(API+'/roterpunkt').then(function(r){return r.json()}).then(function(data){
    if(data.error){wrap.innerHTML='<p style="color:#c00">Fehler: '+data.error+'</p>';return;}

    var groups=data.groups||{};
    var wgNames=Object.keys(groups).sort();
    var html='';

    // Banner + Info compact (Modern Country & Sage red theme)
    html+='<div style="background:#fef2f2;border-left:4px solid #b91c1c;padding:12px 16px;border-radius:12px;margin-bottom:16px;font-size:.9rem;line-height:1.5;color:#1f2521;font-weight:600;display:flex;align-items:center;gap:10px">';
    html+='<svg width="14" height="14" viewBox="0 0 24 24" fill="#b91c1c" stroke="none"><circle cx="12" cy="12" r="10"/></svg>';
    html+='<span><strong style="color:#b91c1c">'+data.total+' Artikel</strong> dauerhaft g&uuml;nstiger als UVP</span>';
    html+='</div>';

    // Search
    html+='<div class="so-search" style="margin-bottom:16px"><span class="so-search-icon">&#128269;</span>';
    html+='<input type="text" id="rpSearch" placeholder="Artikel suchen&hellip;" autocomplete="off"></div>';
    html+='<div id="rpNoResult" style="display:none;text-align:center;padding:20px;color:#999;font-size:.88rem">Kein Artikel gefunden.</div>';

    // Groups
    wgNames.forEach(function(wg){
      var items=groups[wg];
      var avgDisc=0;
      var validItems=0;
      items.forEach(function(i){
        if(i.discount>=5&&i.discount<=70){
          avgDisc+=i.discount;
          validItems++;
        }
      });
      avgDisc=validItems>0?Math.round(avgDisc/validItems):0;

      // HIDE GROUPS WITH 0% SAVINGS
      if (avgDisc === 0) return;

      var rows='';
      items.forEach(function(item){
        if(item.discount<DISC_MIN||item.discount>DISC_MAX) return;
        var saving=item.uvp&&item.uvp>0&&item.vk>0?(item.uvp-item.vk):0;
        var mengeHtml=item.menge?'<span class="rp-menge">'+esc(item.menge)+'</span>':'';
        rows+='<tr data-art="'+esc(item.bezeichnung.toLowerCase())+'">';
        rows+='<td class="rp-name">'+esc(item.bezeichnung)+mengeHtml+'</td>';
        rows+='<td class="rp-uvp">'+fmtPrice(item.uvp)+'&nbsp;&euro;</td>';
        rows+='<td class="rp-vk">'+fmtPrice(item.vk)+'&nbsp;&euro;</td>';
        rows+='<td class="rp-disc"><span class="rp-badge">-'+Math.round(item.discount)+'%</span>';
        if(saving>0.004) rows+='<span class="rp-saving">('+ fmtPrice(saving)+'&nbsp;&euro;)</span>';
        rows+='</td></tr>';
      });

      html+='<div class="rp-group">';
      html+='<button class="rp-toggle" aria-expanded="false">';
      html+='<span class="rp-wg-name">'+esc(wg)+'</span>';
      html+='<span class="rp-count" data-total="'+items.length+'">'+items.length+' Artikel</span>';
      html+='<span class="rp-avg">im Schnitt -'+avgDisc+'%</span>';
      html+='<span class="rp-arrow">&#9660;</span></button>';
      html+='<div class="rp-panel" style="display:none"><table class="rp-table"><thead><tr>';
      html+='<th class="rp-th-name">Artikel</th>';
      html+='<th class="rp-th-uvp">UVP</th>';
      html+='<th class="rp-th-vk">Unser Preis</th>';
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
  /* inject rp-menge style once */
  (function(){
    if(document.getElementById('rp-menge-style'))return;
    var s=document.createElement('style');s.id='rp-menge-style';
    s.textContent='.rp-menge{display:inline-block;margin-left:6px;padding:1px 7px;background:#e8f5e9;color:#2e7d32;border-radius:10px;font-size:.72rem;font-weight:600;white-space:nowrap}';
    document.head.appendChild(s);
  })();

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
