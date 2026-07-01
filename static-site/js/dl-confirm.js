/* dl-confirm.js – Global confirm dialog (standalone, no dependencies) */
(function(){
  function _esc(s){var d=document.createElement('div');d.textContent=s==null?'':String(s);return d.innerHTML;}
  window.dlConfirm=function(opts,onConfirm){
    var existing=document.getElementById('dl-confirm-overlay');
    if(existing) existing.remove();
    var icon=opts.icon||'❓';
    var title=opts.title||'Bestätigen';
    var msg=opts.msg||'';
    var okText=opts.ok||'OK';
    var cancelText=opts.cancel||'Abbrechen';
    var color=opts.color||'#dc2626';
    var ov=document.createElement('div');
    ov.id='dl-confirm-overlay';
    ov.style.cssText='position:fixed;inset:0;background:rgba(0,0,0,.45);z-index:10000;display:flex;align-items:center;justify-content:center;padding:16px;animation:dlcFadeIn .15s ease';
    ov.innerHTML='<div style="background:#fff;border-radius:16px;max-width:360px;width:100%;padding:24px;box-shadow:0 16px 48px rgba(0,0,0,.2);animation:dlcSlideUp .2s ease">'
      +'<div style="text-align:center;font-size:40px;margin-bottom:8px">'+icon+'</div>'
      +'<div style="text-align:center;font-size:17px;font-weight:800;color:#1f2937;margin-bottom:6px">'+_esc(title)+'</div>'
      +(msg?'<div style="text-align:center;font-size:14px;color:#6b7280;line-height:1.5;margin-bottom:20px">'+_esc(msg)+'</div>':'<div style="margin-bottom:20px"></div>')
      +'<div style="display:flex;gap:10px">'
      +'<button id="dl-confirm-cancel" style="flex:1;padding:12px 16px;border:none;border-radius:12px;font-size:15px;font-weight:700;cursor:pointer;background:#f3f4f6;color:#6b7280;transition:background .15s">'+_esc(cancelText)+'</button>'
      +'<button id="dl-confirm-ok" style="flex:1;padding:12px 16px;border:none;border-radius:12px;font-size:15px;font-weight:700;cursor:pointer;color:#fff;background:'+color+';transition:background .15s">'+_esc(okText)+'</button>'
      +'</div></div>';
    document.body.appendChild(ov);
    function close(){ov.remove();}
    ov.addEventListener('click',function(e){if(e.target===ov)close();});
    document.getElementById('dl-confirm-cancel').addEventListener('click',close);
    document.getElementById('dl-confirm-ok').addEventListener('click',function(){close();if(onConfirm)onConfirm();});
  };
  if(!document.getElementById('dl-confirm-style')){
    var sty=document.createElement('style');sty.id='dl-confirm-style';
    sty.textContent='@keyframes dlcFadeIn{from{opacity:0}to{opacity:1}}@keyframes dlcSlideUp{from{transform:translateY(20px);opacity:0}to{transform:translateY(0);opacity:1}}';
    document.head.appendChild(sty);
  }
})();
