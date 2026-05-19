/* Logo loader — works on all pages (homepage + subpages) */
(function(){
  var el=document.querySelector('.nv-logo');
  if(!el) return;
  var fb=el.querySelector('span');
  var api=(window.API_BASE||'/api')+'/logo';

  function showFallback(){if(fb)fb.style.visibility='visible';}

  fetch(api)
    .then(function(r){return r.json();})
    .then(function(res){
      if(!res.success||!res.logo){showFallback();return;}
      if(fb)fb.style.display='none';
      el.innerHTML='<img src="'+res.logo+'" alt="Dorfladen Oberornau" style="height:36px;width:auto">';
    })
    .catch(showFallback);
})();
