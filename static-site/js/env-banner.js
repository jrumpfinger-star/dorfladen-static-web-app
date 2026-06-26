// === DEV/TEST ENVIRONMENT BANNER ===
// Include this script on ANY page to show a red warning banner on non-production environments.
(function(){
  var h=location.hostname;
  if(h.indexOf('proud-dune')!==-1||h.indexOf('witty-island')!==-1||h.indexOf('dorfladen-test')!==-1){
    var b=document.createElement('div');
    b.id='env-banner';
    b.style.cssText='position:fixed;top:0;left:0;right:0;z-index:99999;background:#e53e3e;color:#fff;text-align:center;padding:4px 0;font-size:13px;font-weight:700;letter-spacing:1px;';
    b.textContent='\u26A0 TEST-UMGEBUNG \u2013 Nicht die Live-Seite!';
    document.body.appendChild(b);
    document.body.style.borderTop='none';
    document.documentElement.style.cssText+='border:4px solid #e53e3e !important;';
    document.body.style.paddingTop=(parseInt(getComputedStyle(document.body).paddingTop)||0)+28+'px';
  }
})();
