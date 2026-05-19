/* Logo loader — works on all pages (homepage + subpages) */
(function(){
  var el=document.querySelector('.nv-logo');
  if(!el) return;
  var fb=el.querySelector('span');
  var api=(window.API_BASE||'/api')+'/logo';
  fetch(api)
    .then(function(r){return r.json();})
    .then(function(res){
      if(!res.success||!res.logo){if(fb)fb.style.display='';return;}
      if(fb)fb.style.display='none';
      el.innerHTML='<img src="'+res.logo+'" alt="Dorfladen Oberornau" style="height:36px;width:auto">';
    })
    .catch(function(){if(fb)fb.style.display='';});
})();
