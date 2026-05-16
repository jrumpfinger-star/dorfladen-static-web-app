/* Live Roter Punkt - loads from /api/roterpunkt */
(function(){
  var API='https://dorfladen-cms-v4.azurewebsites.net/api';
  var wrap=document.getElementById('roterpunkt-live');
  if(!wrap)return;
  wrap.innerHTML='<p style="text-align:center;padding:40px;color:#888">Roter-Punkt-Artikel werden geladen&hellip;</p>';

  fetch(API+'/roterpunkt').then(function(r){return r.json()}).then(function(data){
    if(data.error){wrap.innerHTML='<p style="color:#c00">Fehler: '+data.error+'</p>';return;}

    var groups=data.groups||{};
    var wgNames=Object.keys(groups).sort();
    var html='';

    // Dezenter Banner - rechts unten, weniger prominent
    html+='<div style="text-align:right;padding:12px 16px;background:#fff5f5;border:1px solid #e8c8c8;border-radius:8px;margin-bottom:16px;font-size:.9rem">';
    html+='<span style="font-size:1.1rem">&#x1F534;</span> ';
    html+='<span style="font-weight:700;color:#c62828">Roter Punkt &ndash; G&uuml;nstiger als UVP</span> ';
    html+='<span style="color:#666">('+data.total+' Artikel, '+data.warengruppen+' Warengruppen)</span>';
    html+='</div>';

    // Info
    html+='<div style="background:#fff5f5;border-left:4px solid #c62828;padding:12px 16px;border-radius:0 8px 8px 0;margin-bottom:20px;font-size:.85rem;line-height:1.5;color:#444">';
    html+='<strong>Roter Punkt</strong> bedeutet: Der Dorfladen-Preis liegt <strong>dauerhaft unter der UVP</strong>. ';
    html+='Kein Sonderangebot, sondern unser Beitrag zu fairen Preisen.</div>';

    // Search
    html+='<div class="so-search"><span class="so-search-icon">&#128269;</span>';
    html+='<input type="text" id="rpSearch" placeholder="Artikel suchen&hellip;" autocomplete="off"></div>';
    html+='<div id="rpNoResult" style="display:none;text-align:center;padding:20px;color:#999;font-size:.88rem">Kein Artikel gefunden.</div>';

    // Groups
    wgNames.forEach(function(wg){
      var items=groups[wg];
      var avgDisc=0;
      items.forEach(function(i){avgDisc+=i.discount});
      avgDisc=Math.round(avgDisc/items.length);

      var rows='';
      items.forEach(function(item){
        rows+='<tr data-art="'+esc(item.bezeichnung.toLowerCase())+'">';
        rows+='<td class="rp-name">'+esc(item.bezeichnung)+'</td>';
        rows+='<td class="rp-vk">'+fmtPrice(item.vk)+'&nbsp;&euro;</td>';
        rows+='<td class="rp-uvp" style="text-decoration:line-through;color:#999">'+fmtPrice(item.uvp)+'&nbsp;&euro;</td>';
        rows+='<td class="rp-disc"><span style="background:#c62828;color:#fff;padding:2px 7px;border-radius:8px;font-weight:700;font-size:.72rem">-'+Math.round(item.discount)+'%</span></td></tr>';
      });

      html+='<div class="rp-group">';
      html+='<button class="rp-toggle" aria-expanded="false">';
      html+='<span class="rp-dot">&#x1F534;</span>';
      html+='<span class="rp-wg-name">'+esc(wg)+'</span>';
      html+='<span class="rp-count" data-total="'+items.length+'">'+items.length+' Artikel</span>';
      html+='<span class="rp-avg">&Oslash; -'+avgDisc+'%</span>';
      html+='<span class="rp-arrow">&#9660;</span></button>';
      html+='<div class="rp-panel" style="display:none"><table class="rp-table"><thead><tr><th>Artikel</th><th>VK Dorf</th><th>UVP</th><th>Ersparnis</th></tr></thead><tbody>'+rows+'</tbody></table></div></div>';
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

  function fmtPrice(p){return p===null?'—':p.toFixed(2).replace('.',',');}
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
