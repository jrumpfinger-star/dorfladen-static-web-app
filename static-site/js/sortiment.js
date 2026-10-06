/* Sortiment Filter, Search & Lightbox */
(function(){
  if(!document.querySelector('.so-wrap'))return;
  var input=document.getElementById("soSearch"),groups=document.querySelectorAll(".so-group"),noRes=document.getElementById("soNoResult");
  if(!input||!groups.length)return;
  var activeFilter='';
  function getRowType(r){
    if(r.classList.contains("so-row-rp"))return"rp";
    if(r.classList.contains("so-row-ang"))return"ang";
    return"";
  }
  function applyFilter(){
    var q=input.value.trim().toLowerCase(),any=false;
    groups.forEach(function(g){
      var rows=g.querySelectorAll("tr[data-art]"),vis=0;
      rows.forEach(function(r){
        var matchQ=!q||r.getAttribute("data-art").indexOf(q)!==-1;
        var matchF=!activeFilter||getRowType(r)===activeFilter;
        var show=matchQ&&matchF;
        r.classList.toggle("so-hidden",!show);
        if(show)vis++;
      });
      g.style.display=(vis>0||(!q&&!activeFilter))?"":"none";
      if(vis>0||(!q&&!activeFilter))any=true;
      var badge=g.querySelector(".so-count");
      if(badge)badge.textContent=(q||activeFilter)?vis:badge.getAttribute("data-total");
      var panel=g.querySelector(".so-panel");
      if((q||activeFilter)&&vis>0){panel.style.display="block";g.querySelector(".so-arrow").innerHTML="&#9650;";}
      else if(!q&&!activeFilter){panel.style.display="none";g.querySelector(".so-arrow").innerHTML="&#9660;";}
    });
    noRes.style.display=any?"none":"block";
  }
  input.addEventListener("input",applyFilter);
  groups.forEach(function(g){var b=g.querySelector(".so-count");if(b)b.setAttribute("data-total",b.textContent);});
  // Legend filter
  var legend=document.querySelector(".so-legend");
  if(legend){
    var spans=legend.querySelectorAll("span");
    spans.forEach(function(el){
      var txt=el.textContent.toLowerCase();
      var type=null;
      if(txt.indexOf("roter punkt")!==-1)type="rp";
      else if(txt.indexOf("sonderangebot")!==-1)type="ang";
      if(!type)return;
      el.style.cursor="pointer";
      el.addEventListener("click",function(){
        if(activeFilter===type){activeFilter='';this.classList.remove("so-filter-active");}
        else{spans.forEach(function(s){s.classList.remove("so-filter-active")});activeFilter=type;this.classList.add("so-filter-active");}
        applyFilter();
      });
    });
  }
  // Accordion toggle for groups
  groups.forEach(function(g){
    var hdr=g.querySelector(".so-hdr");
    if(hdr)hdr.addEventListener("click",function(){
      var panel=g.querySelector(".so-panel"),arrow=g.querySelector(".so-arrow");
      if(panel.style.display==="block"){panel.style.display="none";arrow.innerHTML="&#9660;";}
      else{panel.style.display="block";arrow.innerHTML="&#9650;";}
    });
  });
  // Lightbox for gallery images
  var lb=document.getElementById("soLightbox"),lbImg=lb?lb.querySelector("img"):null;
  document.querySelectorAll(".sort-gallery img").forEach(function(img){
    img.style.cursor="zoom-in";
    img.addEventListener("click",function(){if(lb){lbImg.src=this.src;lb.classList.add("so-lb-open");}});
  });
  if(lb)lb.addEventListener("click",function(){this.classList.remove("so-lb-open");lbImg.src="";});
})();
