/* dl-confirm.js – Global confirm dialog (standalone, no dependencies) */
(function(){
  function _esc(s){var d=document.createElement('div');d.textContent=s==null?'':String(s);return d.innerHTML;}
  function _iconHtml(icon){
    var map={
      warn:'alert-triangle',
      warning:'alert-triangle',
      danger:'alert-triangle',
      info:'info',
      success:'check-circle',
      question:'circle-help',
      help:'circle-help',
      delete:'trash-2',
      trash:'trash-2'
    };
    if(!icon) return '<i data-lucide="circle-help" style="width:36px;height:36px" aria-hidden="true"></i>';
    if(icon.indexOf('<')!==-1) return icon;
    var key=String(icon).toLowerCase();
    if(map[key]) return '<i data-lucide="'+map[key]+'" style="width:36px;height:36px" aria-hidden="true"></i>';
    if(key.indexOf('lucide:')===0) return '<i data-lucide="'+_esc(key.substring(7))+'" style="width:36px;height:36px" aria-hidden="true"></i>';
    if(/^[a-z0-9-]+$/.test(key)) return '<i data-lucide="'+_esc(key)+'" style="width:36px;height:36px" aria-hidden="true"></i>';
    return _esc(icon);
  }
  window.dlConfirm=function(opts,onConfirm){
    var existing=document.getElementById('dl-confirm-overlay');
    if(existing) existing.remove();
    opts=opts||{};
    var icon=_iconHtml(opts.icon||'question');
    var title=opts.title||'Bestätigen';
    var msg=opts.msg||'';
    var okText=opts.ok||'OK';
    var cancelText=opts.cancel||'Abbrechen';
    var color=opts.color||'#dc2626';
    var prevFocus=document.activeElement;
    var prevOverflow=document.body.style.overflow;
    var ov=document.createElement('div');
    ov.id='dl-confirm-overlay';
    ov.className='dlc-overlay';
    ov.innerHTML='<div class="dlc-dialog" role="dialog" aria-modal="true" aria-labelledby="dl-confirm-title" aria-describedby="dl-confirm-msg" tabindex="-1">'
      +'<div class="dlc-icon">'+icon+'</div>'
      +'<div id="dl-confirm-title" class="dlc-title">'+_esc(title)+'</div>'
      +(msg?'<div id="dl-confirm-msg" class="dlc-msg">'+_esc(msg)+'</div>':'<div id="dl-confirm-msg" class="dlc-msg-empty"></div>')
      +'<div class="dlc-actions">'
      +'<button id="dl-confirm-cancel" class="dlc-btn dlc-cancel">'+_esc(cancelText)+'</button>'
      +'<button id="dl-confirm-ok" class="dlc-btn dlc-ok" style="background:'+color+'">'+_esc(okText)+'</button>'
      +'</div></div>';
    document.body.appendChild(ov);
    var dialog=ov.firstElementChild;
    var cancelBtn=document.getElementById('dl-confirm-cancel');
    var okBtn=document.getElementById('dl-confirm-ok');
    document.body.style.overflow='hidden';
    function close(){
      document.body.style.overflow=prevOverflow;
      ov.remove();
      if(prevFocus&&prevFocus.focus) prevFocus.focus();
    }
    ov.addEventListener('click',function(e){if(e.target===ov)close();});
    cancelBtn.addEventListener('click',close);
    okBtn.addEventListener('click',function(){close();if(onConfirm)onConfirm();});
    ov.addEventListener('keydown',function(e){
      if(e.key==='Escape'){e.preventDefault();close();return;}
      if(e.key==='Tab'){
        var first=cancelBtn,last=okBtn;
        if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus();}
        else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus();}
      }
    });
    if(window.lucide&&window.lucide.createIcons) window.lucide.createIcons({nameAttr:'data-lucide'});
    setTimeout(function(){(opts.focusOk?okBtn:cancelBtn).focus();},0);
    if(dialog&&dialog.focus) dialog.focus();
  };
  if(!document.getElementById('dl-confirm-style')){
    var sty=document.createElement('style');sty.id='dl-confirm-style';
    sty.textContent=[
      '@keyframes dlcFadeIn{from{opacity:0}to{opacity:1}}',
      '@keyframes dlcSlideUp{from{transform:translateY(20px);opacity:0}to{transform:translateY(0);opacity:1}}',
      '.dlc-overlay{position:fixed;inset:0;background:rgba(0,0,0,.45);z-index:10000;display:flex;align-items:center;justify-content:center;padding:16px;animation:dlcFadeIn .15s ease}',
      '.dlc-dialog{background:var(--dlc-bg,#fff);border-radius:16px;max-width:420px;width:100%;padding:24px;box-shadow:0 16px 48px rgba(0,0,0,.35);animation:dlcSlideUp .2s ease;border:1px solid var(--dlc-brd,transparent)}',
      '.dlc-icon{text-align:center;color:var(--dlc-icon,#374151);margin-bottom:8px}',
      '.dlc-title{text-align:center;font-size:18px;font-weight:800;color:var(--dlc-title,#1f2937);margin-bottom:6px}',
      '.dlc-msg{text-align:center;font-size:15px;color:var(--dlc-msg,#4b5563);line-height:1.5;margin-bottom:20px}',
      '.dlc-msg-empty{margin-bottom:20px}',
      '.dlc-actions{display:flex;gap:10px}',
      '.dlc-btn{flex:1;padding:12px 16px;border:none;border-radius:12px;font-size:15px;font-weight:700;cursor:pointer;transition:background .15s}',
      '.dlc-cancel{background:var(--dlc-cancel-bg,#f3f4f6);color:var(--dlc-cancel-fg,#6b7280)}',
      '.dlc-ok{color:#fff}',
      '.dlc-btn:focus-visible{outline:3px solid var(--dlc-focus,#2563eb);outline-offset:2px}',
      /* Dark mode (folgt /js/theme.js) */
      'html[data-theme="dark"]{--dlc-bg:#1b2228;--dlc-brd:rgba(255,255,255,.10);--dlc-icon:#cbd5d1;--dlc-title:#e6eae8;--dlc-msg:#b7c0bb;--dlc-cancel-bg:#2a333a;--dlc-cancel-fg:#cbd5d1;--dlc-focus:#5cb85f}',
      /* System-Kontrast / Windows High Contrast */
      '@media (forced-colors: active){.dlc-dialog{border:2px solid CanvasText}.dlc-btn{border:1px solid CanvasText}}',
      '@media (prefers-contrast: more){.dlc-dialog{border:2px solid currentColor}}'
    ].join('');
    document.head.appendChild(sty);
  }
})();
