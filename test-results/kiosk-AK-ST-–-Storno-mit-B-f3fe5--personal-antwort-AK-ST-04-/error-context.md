# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: kiosk.spec.js >> AK-ST – Storno mit Begründung >> T-ST-10 CMS sendet storno_grund statt personal_antwort (AK-ST-04)
- Location: tests\kiosk.spec.js:1831:3

# Error details

```
Error: expect(received).toContain(expected) // indexOf

Expected substring: "storno_grund"
Received string:    "<!DOCTYPE html><html lang=\"de\" style=\"border: 4px solid rgb(229, 62, 62) !important;\"><head>
<meta charset=\"UTF-8\">
<meta name=\"viewport\" content=\"width=device-width, initial-scale=1.0\">
<title>Dorfladen CMS</title>
<script src=\"https://cdn.jsdelivr.net/npm/@azure/msal-browser@2.38.0/lib/msal-browser.min.js\"></script><style>#hilfe-overlay{position:fixed;inset:0;z-index:99999;background:rgba(0,0,0,.6);
display:none;align-items:flex-start;justify-content:center;box-sizing:border-box;}
#hilfe-overlay.open{display:flex;}
#hilfe-dialog-inner{position:relative;margin:24px auto;width:min(94vw,980px);
max-height:calc(100vh - 48px);background:#fff;border-radius:14px;
box-shadow:0 24px 80px rgba(0,0,0,.35);display:flex;flex-direction:column;
overflow:hidden;animation:hilfeSlideUp .25s ease-out;box-sizing:border-box;}
@keyframes hilfeSlideUp{from{opacity:0;transform:translateY(30px)}to{opacity:1;transform:translateY(0)}}
#hilfe-dialog-topbar{display:flex;align-items:center;gap:10px;
padding:14px 18px;background:#2d5016;color:#fff;flex-shrink:0;}
#hilfe-dialog-topbar h2{flex:1;font-size:1.05em;font-weight:700;margin:0;}
#hilfe-close-btn{background:rgba(255,255,255,.15);border:none;color:#fff;
width:44px;height:44px;border-radius:8px;font-size:1.3em;
cursor:pointer;display:flex;align-items:center;justify-content:center;
-webkit-tap-highlight-color:transparent;touch-action:manipulation;}
#hilfe-close-btn:hover{background:rgba(255,255,255,.3);}
#hilfe-close-btn:active{background:rgba(255,255,255,.45);}
#hilfe-dialog-frame{flex:1;border:none;overflow:auto;min-height:0;}
@media(max-width:768px){
#hilfe-dialog-inner{margin:0!important;width:100vw!important;max-width:none!important;
height:100vh!important;height:100dvh!important;max-height:none!important;border-radius:0;}
#hilfe-dialog-frame{width:100%!important;min-height:0;}}</style></head>
<body style=\"border-top-width: medium; border-top-style: none; border-top-color: currentcolor; padding-top: 28px;\">
<!-- Dorfladen CMS - Power Pages Web Template -->
<!-- Deploy: python deploy-cms-template.py -->
<script>
// MSAL optional - load only if needed for SharePoint images
window.msalLoaded = false;
var msalScript = document.createElement('script');
msalScript.src = 'https://cdn.jsdelivr.net/npm/@azure/msal-browser@2.38.0/lib/msal-browser.min.js';
msalScript.onload = function() { window.msalLoaded = true; };
msalScript.onerror = function() { console.warn('MSAL script failed to load - SharePoint images will not work'); };
document.head.appendChild(msalScript);
</script>
<style>
  html,body{overflow-x:hidden;max-width:100vw}
  :root {
    --c-m-bg: #faf9f6;
    --c-m-pri: #1e463a;
    --c-m-pri-light: #f0f4f1;
    --c-m-sec: #bd8b5c;
    --c-m-sec-light: #f7f3ed;
    --c-m-text: #1f2521;
    --c-m-muted: #5c6660;
  }
  body {
    background: var(--c-m-bg);
    color: var(--c-m-text);
  }
  .cms-wrap{font-family:\"Segoe UI\",system-ui,-apple-system,sans-serif;max-width:1000px;margin:0 auto;padding:16px;box-sizing:border-box}
  .cms-wrap input,.cms-wrap textarea,.cms-wrap select,.cms-wrap button,.cms-modal input,.cms-modal textarea,.cms-modal select,.cms-modal button,.cms-modal-bg input,.cms-modal-bg textarea,.cms-modal-bg select,.cms-modal-bg button,.cms-btn,.cms-input{font-family:\"Segoe UI\",system-ui,-apple-system,sans-serif}
  .cms-tabs-wrap{margin-bottom:20px}
  .cms-tabs{display:flex;gap:4px;border-bottom:2px solid #e5e7eb;flex-wrap:wrap}
  .cms-tab{padding:10px 18px;font-size:13px;font-weight:700;color:var(--c-m-muted);border:none;background:none;cursor:pointer;border-bottom:3px solid transparent;margin-bottom:-2px;transition:all 0.15s ease-in-out;text-transform:uppercase;letter-spacing:0.5px;white-space:nowrap;flex-shrink:0}
  .cms-tab.active{color:var(--c-m-pri);border-bottom-color:var(--c-m-pri)}
  .cms-tab:hover{color:var(--c-m-pri)}
  .cms-card{background:#fff;border:1px solid rgba(0,0,0,0.04);border-radius:12px;overflow:hidden;box-shadow:0 4px 12px rgba(0,0,0,.02);margin-bottom:12px}
  .cms-card-header{padding:12px 16px;font-weight:750;font-size:13px;color:#fff;display:flex;align-items:center;gap:8px;text-transform:uppercase;letter-spacing:0.5px;background:var(--c-m-pri)!important}
  .cms-card-body{padding:14px 16px}
  .cms-btn{padding:8px 16px;border-radius:8px;font-size:12px;font-weight:700;border:none;cursor:pointer;display:inline-flex;align-items:center;gap:6px;transition:all 0.15s ease-in-out;text-transform:uppercase;letter-spacing:0.3px}
  .cms-btn-primary{background:var(--c-m-pri);color:#fff}.cms-btn-primary:hover{background:#15352c}
  .cms-btn-sm{padding:5px 10px;font-size:11px;border-radius:6px}
  .cms-btn-danger{background:#fdf2f2;color:var(--m-red,#a8242a)}.cms-btn-danger:hover{background:#fce8e8}
  .cms-btn-trash{width:28px;height:28px;padding:0;border-radius:6px;border:1px solid #fca5a5;background:#fff5f5;color:#a8242a;display:inline-flex;align-items:center;justify-content:center;cursor:pointer;transition:all 0.15s}
  .cms-btn-trash:hover{background:#ffe4e6;border-color:#fda4af}
  .cms-btn-trash svg{width:14px;height:14px;fill:currentColor}
  .cms-btn-gray{background:#ffffff;color:var(--c-m-text);border:1px solid #e5e7eb;box-shadow:0 2px 6px rgba(0,0,0,0.02)}.cms-btn-gray:hover{background:var(--c-m-primary-light,#f0f4f1);border-color:var(--c-m-pri)}
  .cms-btn[disabled]{opacity:.6;cursor:not-allowed;pointer-events:none}
  @keyframes cms-spin{to{transform:rotate(360deg)}}
  .cms-btn .cms-btn-spinner{display:inline-block;width:14px;height:14px;border:2px solid rgba(255,255,255,.4);border-top-color:#fff;border-radius:50%;animation:cms-spin .6s linear infinite;margin-right:2px}
  .cms-rte-btn{background:#fff;border:1px solid #e5e7eb;border-radius:6px;width:28px;height:28px;cursor:pointer;font-size:13px;display:inline-flex;align-items:center;justify-content:center;font-family:inherit;transition:all 0.12s}
  .cms-rte-btn:hover{background:var(--c-m-primary-light);border-color:var(--c-m-pri)}
  .cms-input{width:100%;padding:8px 12px;border:1px solid #e5e7eb;border-radius:8px;font-size:13px;font-family:inherit;background:#fff;transition:all 0.15s;color:var(--c-m-text)}
  .cms-input::placeholder{color:#a1a1aa}
  .cms-input:focus{outline:none;border-color:var(--c-m-pri);box-shadow:0 0 0 3px rgba(30,70,58,0.12)}
  .cms-grid{display:grid;grid-template-columns:repeat(5,minmax(180px,1fr));gap:12px}
  .cms-meal{border:1px solid rgba(0,0,0,0.04);border-radius:12px;background:#fff;overflow:hidden;box-shadow:0 4px 12px rgba(0,0,0,0.015)}
  .cms-meal-hdr{padding:10px 14px;color:#fff;font-weight:750;font-size:12px;text-transform:uppercase;letter-spacing:0.5px;background:var(--c-m-pri)!important}
  .cms-meal-body{padding:10px 14px;min-height:60px}
  .cms-meal-item{font-size:12px;color:var(--c-m-text);padding:6px 0;display:flex;justify-content:space-between;align-items:flex-start;gap:8px;border-bottom:1px solid rgba(0,0,0,0.03)}
  .cms-meal-item:last-child {border-bottom:none}
  .cms-meal-item .price{color:var(--c-m-pri);font-weight:750;font-size:12px;white-space:nowrap}
  .cms-meal-actions{display:none;gap:4px;margin-top:6px}
  .cms-meal:hover .cms-meal-actions{display:flex}
  .cms-meal-actions .cms-btn-trash{margin-left:auto}
  .cms-empty{text-align:center;padding:40px;color:var(--c-m-muted);font-size:13px;font-weight:600}
  .cms-flex{display:flex;align-items:center;gap:8px;flex-wrap:wrap}
  .cms-between{justify-content:space-between}
  .cms-mb{margin-bottom:16px}
  .cms-toast{position:fixed;top:80px;right:16px;z-index:9999;padding:10px 16px;border-radius:10px;color:#fff;font-size:13px;font-weight:700;box-shadow:0 8px 24px rgba(0,0,0,.12);animation:cmsFadeIn .3s}
  .cms-confirm-overlay{position:fixed;inset:0;z-index:10000;background:rgba(0,0,0,.45);backdrop-filter:blur(4px);display:flex;align-items:center;justify-content:center;animation:cmsFadeIn .2s}
  .cms-confirm-box{background:#fff;border-radius:16px;box-shadow:0 20px 60px rgba(0,0,0,.25);max-width:380px;width:calc(100% - 32px);overflow:hidden;animation:cmsSlideUp .25s ease-out}
  .cms-confirm-icon{text-align:center;padding:24px 24px 8px;font-size:40px}
  .cms-confirm-msg{padding:0 24px 20px;text-align:center;font-size:14px;line-height:1.5;color:#1f2937;white-space:pre-line;word-break:break-word}
  .cms-confirm-btns{display:flex;border-top:1px solid #e5e7eb}
  .cms-confirm-btns button{flex:1;padding:14px;border:none;font-size:14px;font-weight:700;cursor:pointer;transition:background .15s}
  .cms-confirm-btn-cancel{background:#f9fafb;color:#6b7280;border-right:1px solid #e5e7eb!important}
  .cms-confirm-btn-cancel:hover{background:#f3f4f6}
  .cms-confirm-btn-ok{background:#fff;color:#a51d2d}
  .cms-confirm-btn-ok:hover{background:#fef2f2}
  .cms-confirm-btn-ok.cms-confirm-warn{color:#dc2626}
  @keyframes cmsSlideUp{from{opacity:0;transform:translateY(30px)}to{opacity:1;transform:translateY(0)}}
  .cms-btn-wa{background:#25D366;color:#fff;border:none;border-radius:8px;padding:8px 14px;font-size:12px;font-weight:700;cursor:pointer;display:inline-flex;align-items:center;gap:6px;text-transform:uppercase;letter-spacing:0.3px}
  .cms-btn-wa:hover{background:#1da851}
  .cms-btn-wa svg{width:14px;height:14px;fill:#fff}
  .cms-btn-preview{background:#6b7280;color:#fff;border:none;border-radius:8px;padding:8px 14px;font-size:12px;font-weight:700;cursor:pointer;display:inline-flex;align-items:center;gap:6px;text-transform:uppercase;letter-spacing:0.3px}
  .cms-btn-preview:hover{background:#4b5563}
  .cms-btn-preview svg{width:14px;height:14px;fill:#fff}
  @keyframes cmsFadeIn{from{opacity:0;transform:translateX(40px)}to{opacity:1;transform:translateX(0)}}
  .cms-modal-bg{position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(26,34,30,0.4);backdrop-filter:blur(6px);-webkit-backdrop-filter:blur(6px);z-index:9998;display:flex;align-items:center;justify-content:center;padding:20px}
  .cms-modal{background:#fff;border-radius:16px;box-shadow:0 24px 64px rgba(0,0,0,.15);width:100%;max-width:1000px;max-height:92vh;display:flex;flex-direction:column;overflow-y:auto;padding:24px;animation:cmsFadeIn .2s;font-family:inherit;border:1px solid rgba(0,0,0,0.03)}
  .cms-modal h3{font-size:16px;font-weight:800;margin:0 0 16px;color:var(--c-m-pri);letter-spacing:-.2px;text-transform:uppercase;letter-spacing:0.5px}
  .cms-modal-header{display:flex;align-items:center;justify-content:space-between;padding:14px 20px;background:#f9fafb;border-bottom:1px solid #e5e7eb;flex-shrink:0;box-sizing:border-box}
  .cms-modal-header h3{margin:0;font-size:15px}
  .cms-modal-footer{display:flex;gap:8px;justify-content:flex-end;padding:14px 20px;border-top:1px solid #e5e7eb;flex-shrink:0;box-sizing:border-box;flex-wrap:wrap}
  .cms-modal-close{position:absolute;top:10px;right:12px;background:none;border:none;font-size:22px;cursor:pointer;color:#6b7280;line-height:1;padding:4px 8px;z-index:10;border-radius:6px;transition:all 0.15s}
  .cms-modal-close:hover{background:#f3f4f6;color:#111}
  .cms-btn-save{background:var(--c-m-pri);color:#fff;font-weight:700}.cms-btn-save:hover{background:#15352c}
  .cms-btn-del{background:#dc2626;color:#fff;font-weight:700}.cms-btn-del:hover{background:#b91c1c}
  .cms-hours-row{display:flex;align-items:center;gap:8px;padding:8px 16px;flex-wrap:wrap;border-bottom:1px solid #f3f4f6}
  .cms-hours-row:last-child{border-bottom:none}
  .cms-hours-day{width:32px;font-weight:750;font-size:12px;color:var(--c-m-text)}
  .cms-hours-time{padding:6px 10px;border:1px solid #e5e7eb;border-radius:6px;font-size:12px;width:120px;font-family:inherit;background:#fff;transition:all 0.12s}
  .cms-hours-time:focus{outline:none;border-color:var(--c-m-pri);box-shadow:0 0 0 3px rgba(30,70,58,0.1)}
  .cms-hours-label{font-size:11px;color:var(--c-m-muted);font-weight:600}
  .cms-hours-top{display:flex;align-items:center;gap:8px}
  .cms-hours-times{display:flex;align-items:center;gap:8px;flex-wrap:wrap}
  .cms-hours-block{display:flex;align-items:center;gap:4px}
  .cms-akt-row{background:#fff;border:1px solid rgba(0,0,0,0.03);border-radius:12px;padding:12px 16px;display:flex;align-items:center;justify-content:space-between;gap:8px;margin-bottom:6px;box-shadow:0 2px 6px rgba(0,0,0,0.015)}
  .cms-akt-row:hover{box-shadow:0 4px 12px rgba(0,0,0,.03)}
  .cms-akt-info{min-width:0}
  .cms-akt-title{font-weight:750;font-size:13px;color:var(--c-m-text);margin-bottom:2px}
  .cms-akt-meta{font-size:11px;color:var(--c-m-muted);letter-spacing:.2px;font-weight:600}
  .cms-akt-btns{display:flex;gap:4px;flex-shrink:0}
  .cms-akt-btns .cms-btn-trash{margin-left:10px}
  .cms-ang-meta{font-size:12px;color:var(--c-m-muted);margin-top:3px;font-weight:600}
  .cms-ang-items{padding:10px 12px 14px;display:flex;flex-direction:column;gap:8px;overflow:hidden;transition:max-height .3s ease,padding .3s ease}
  .cms-ang-items.collapsed{max-height:0!important;padding-top:0;padding-bottom:0}
  .cms-ang-toggle{cursor:pointer;user-select:none;transition:background .15s}
  .cms-ang-toggle:hover{background:#f9fafb}
  .cms-ang-chevron{display:inline-block;transition:transform .3s ease;font-size:14px;color:#9ca3af;margin-left:6px}
  .cms-ang-chevron.collapsed{transform:rotate(-90deg)}
  .cms-ang-item{border:1px solid #e5e7eb;border-radius:9px;background:#fff;padding:8px 10px;display:grid;grid-template-columns:minmax(0,1fr) auto;grid-template-areas:'name price' 'old old';column-gap:12px;row-gap:2px}
  .cms-ang-name{grid-area:name;font-size:13px;font-weight:750;color:var(--c-m-text);line-height:1.25}
  .cms-ang-price{grid-area:price;font-size:13px;font-weight:800;color:var(--c-m-pri);white-space:nowrap}
  .cms-ang-old{grid-area:old;font-size:11px;color:var(--c-m-muted);font-weight:500}
  .cms-akt-header-grid{display:grid;grid-template-columns:2fr 1fr 1fr;gap:12px;margin-bottom:16px;align-items:end}
  .cms-akt-header-grid label{display:block;font-size:10px;font-weight:700;color:var(--c-m-muted);text-transform:uppercase;letter-spacing:.5px;margin-bottom:4px}
  .cms-akt-header-grid .cms-input{width:100%;box-sizing:border-box}
  .cms-ang-row{background:var(--c-m-pri-light);border:1px solid rgba(30,70,58,0.08);border-left:3px solid var(--c-m-pri);border-radius:10px;padding:6px 8px 6px 8px;margin-bottom:6px;position:relative;flex-shrink:0;transition:box-shadow .15s;overflow:visible}
  .cms-ang-row:hover{box-shadow:0 4px 12px rgba(30,70,58,.08)}
  .cms-ang-row-num{position:absolute;top:-8px;left:10px;background:var(--c-m-pri);color:#fff;font-size:9px;font-weight:800;padding:2px 8px;border-radius:8px;line-height:12px;letter-spacing:.3px;text-transform:uppercase}
  .cms-ang-drag{position:absolute;top:50%;left:-2px;transform:translateY(-50%);cursor:grab;color:#b0b8c1;font-size:16px;line-height:1;padding:4px 2px;user-select:none;transition:color .15s}
  .cms-ang-drag:hover{color:var(--c-m-pri)}
  .cms-ang-row[draggable=\"true\"]:active .cms-ang-drag{cursor:grabbing}
  .cms-ang-row-close{position:absolute;top:2px;right:4px;background:none;border:none;color:#a1a1aa;cursor:pointer;font-size:15px;line-height:1;transition:color .15s;z-index:1}
  .cms-ang-row-close:hover{color:var(--m-red)}
  .cms-ang-fields{display:grid;grid-template-columns:auto minmax(180px, 2.5fr) minmax(120px, 1.5fr) 60px 60px 120px;align-items:center;gap:8px;width:100%}
  .cms-ang-fields > *{min-width:0;box-sizing:border-box}
  .cms-ang-fields .cms-input{padding:4px 6px;font-size:12px;height:30px;width:100%;box-sizing:border-box}
  .cms-ang-fields .cms-art-wrap{width:100%;min-width:0}
  .cms-ang-fields [data-f=\"details\"]{width:100%;min-width:0}
  .cms-ang-fields .cms-price{text-align:right;width:100%}
  .cms-ang-fields [data-f=\"artikelnummer\"]{font-size:11px;width:100%}
  .cms-ang-row-img{display:flex;align-items:center;gap:4px;flex-shrink:0}
  .cms-ang-row-img input{flex:1}
  .cms-ang-img-row{display:flex;align-items:center;gap:8px;margin-top:6px}
  .cms-ang-img-btn{display:inline-flex;align-items:center;gap:4px;padding:3px 10px;font-size:11px;color:var(--c-m-muted);background:#fff;border:1px dashed #d1d5db;border-radius:6px;cursor:pointer;transition:all .15s}
  .cms-ang-img-btn:hover{border-color:var(--c-m-pri);color:var(--c-m-pri)}
  .cms-ang-img-btn svg{width:14px;height:14px;fill:currentColor}
  .cms-ang-img-preview{width:48px;height:36px;object-fit:contain;border-radius:4px;border:1px solid #e5e7eb;background:#fff}
  .cms-ang-img-remove{font-size:14px;color:#9ca3af;cursor:pointer;line-height:1;padding:2px}
  .cms-ang-img-remove:hover{color:#ef4444}
  .cms-ang-fields-2{display:none}
  .cms-news-tbl{width:100%;border-collapse:separate;border-spacing:0;font-size:13px;max-width:860px}
  .cms-news-tbl th{text-align:left;font-size:10px;font-weight:800;color:var(--c-m-muted);padding:8px 10px;border-bottom:2px solid #e5e7eb;text-transform:uppercase;letter-spacing:.5px;background:#f9fafb}
  .cms-news-tbl td{padding:10px 10px;border-bottom:1px solid #e5e7eb;vertical-align:middle}
  .cms-news-tbl tbody tr{transition:background .1s}
  .cms-news-tbl tbody tr:nth-child(even){background:#fafbfc}
  .cms-news-tbl tbody tr:hover{background:var(--c-m-pri-light)}
  .cms-news-date{font-size:11px;color:var(--c-m-muted);white-space:nowrap;font-variant-numeric:tabular-nums;font-weight:600}
  .cms-news-title{font-weight:750;color:var(--c-m-text);font-size:13px;line-height:1.35}
  .cms-news-desc{font-size:11px;color:var(--c-m-muted);line-height:1.3;margin-top:2px;font-weight:500}
  .cms-news-badge{font-size:10px;font-weight:750;padding:2px 8px;border-radius:10px;background:#fecaca;color:#7f1d1d;white-space:nowrap;display:inline-block;text-transform:uppercase;letter-spacing:0.3px}
  .cms-news-badge.active{background:#dcfce7;color:#166534}
  .cms-news-actions{text-align:right;white-space:nowrap}
  @media(max-width:767px){.cms-news-act-col{display:none}.cms-news-tbl tbody tr:active{background:#dcfce7}}
  .cms-news-abtn{background:#ffffff;border:1px solid #d1d5db;cursor:pointer;font-size:12px;padding:4px 8px;border-radius:6px;transition:all .12s;margin-left:2px;color:var(--c-m-text);font-weight:600}
  .cms-news-abtn:hover{background:var(--c-m-primary-light);border-color:var(--c-m-pri)}
  .cms-news-del:hover{background:#fdf2f2;border-color:#fca5a5;color:var(--m-red)}
  .cms-news-lbl{font-size:10px;font-weight:800;color:var(--c-m-muted);display:block;margin:12px 0 4px;text-transform:uppercase;letter-spacing:.5px}
  .cms-rte-toolbar{display:flex;gap:2px;padding:4px 6px;background:#f9fafb;border:1px solid #e5e7eb;border-bottom:none;border-radius:8px 8px 0 0;flex-wrap:wrap}
  .cms-subtab{padding:8px 18px;font-size:12px;font-weight:700;border:none;background:none;cursor:pointer;border-bottom:2px solid transparent;margin-bottom:-2px;color:var(--c-m-muted);text-transform:uppercase;letter-spacing:0.5px;transition:all 0.15s}
  .cms-subtab.active{color:var(--c-m-pri);border-bottom-color:var(--c-m-pri)}
  .cms-subtab:hover{color:var(--c-m-pri)}
  .cms-rte-editor{border:1px solid #e5e7eb;border-radius:0 0 8px 8px;min-height:160px;max-height:300px;overflow-y:auto;padding:10px 12px;font-size:13px;line-height:1.5;color:#1f2937;outline:none;background:#fff;font-family:'Segoe UI',system-ui,-apple-system,sans-serif}
  .cms-rte-editor:focus{border-color:#22c55e;box-shadow:0 0 0 2px rgba(34,197,94,.15)}
  .cms-rte-editor img{max-width:100%;height:auto;border-radius:4px;margin:6px 0}
  .cms-news-img-row{display:flex;align-items:center;gap:8px;margin-top:4px}
  .cms-news-img-preview{width:80px;height:60px;object-fit:cover;border-radius:6px;border:1px solid #e5e7eb}
  .cms-art-wrap{position:relative;width:100%;min-width:0;overflow:visible}
  .cms-art-wrap .cms-input{width:100%;box-sizing:border-box;overflow:hidden;text-overflow:ellipsis}
  .cms-meal-grid{overflow:visible}
  .cms-meal-grid>*{min-width:0;box-sizing:border-box}
  .cms-art-input{position:relative}
  .cms-art-dd{display:none;position:fixed;z-index:99999;background:#fff;border:1px solid #d1d5db;border-radius:8px;box-shadow:0 8px 24px rgba(0,0,0,.18);max-height:50vh;min-height:0;overflow-y:auto;font-family:\"Segoe UI\",system-ui,-apple-system,sans-serif;min-width:280px}
  .cms-art-dd.open{display:block}
  .cms-art-opt{padding:10px 14px;cursor:pointer;border-bottom:1px solid #f3f4f6;font-size:13px;font-family:\"Segoe UI\",system-ui,-apple-system,sans-serif;transition:background .12s;display:flex;align-items:center;gap:8px}
  .cms-art-opt:last-child{border-bottom:none}
  .cms-art-opt:hover{background:#f0fdf4}
  .cms-art-opt-del{margin-left:auto;flex-shrink:0;width:22px;height:22px;border-radius:50%;border:none;background:#fee2e2;color:#dc2626;font-size:14px;line-height:22px;text-align:center;cursor:pointer;opacity:.6;transition:opacity .15s}
  .cms-art-opt-del:hover{opacity:1;background:#fecaca}
  .cms-art-opt-name{font-weight:600;color:#1f2937;font-family:\"Segoe UI\",system-ui,-apple-system,sans-serif}
  .cms-art-opt-meta{font-size:11px;color:#6b7280;font-family:\"Segoe UI\",system-ui,-apple-system,sans-serif;margin-top:2px}
  .cms-art-spinner{position:absolute;right:10px;top:50%;transform:translateY(-50%);color:#16a34a;font-size:12px;display:none}
  .cms-art-spinner.on{display:inline}
  .cms-week-nav{display:flex;align-items:center;gap:6px;flex-wrap:nowrap}
  .cms-week-btn{width:30px;height:30px;border:1px solid #d1d5db;border-radius:8px;background:#fff;cursor:pointer;font-size:16px;display:flex;align-items:center;justify-content:center;color:#6b7280;flex-shrink:0}
  .cms-week-btn:hover{background:#f3f4f6}
  .cms-week-quick{padding:3px 8px;border:1px solid #d1d5db;border-radius:8px;background:#fff;cursor:pointer;font-size:11px;font-weight:600;color:#4b5563;white-space:nowrap;flex-shrink:0}
  .cms-week-quick:hover{background:#f0fdf4;border-color:#16a34a;color:#16a34a}
  .cms-week-quick.active{background:#16a34a;border-color:#16a34a;color:#fff}
  .cms-wp-preview-grid{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:8px;margin-top:8px}
  .cms-wp-preview-grid-home{grid-template-columns:repeat(4,minmax(0,1fr))}
  .cms-wp-preview{border:1px solid #d1d5db;border-radius:8px;background:#fff;cursor:pointer;padding:6px;display:flex;flex-direction:column;gap:6px;transition:.15s all}
  .cms-wp-preview:hover{border-color:#16a34a;box-shadow:0 2px 8px rgba(22,163,74,.14)}
  .cms-wp-preview.active{border-color:#16a34a;box-shadow:0 0 0 2px rgba(22,163,74,.18) inset}
  .cms-wp-preview-name{font-size:10px;font-weight:700;color:#374151;line-height:1.2;text-align:center}
  .cms-wp-thumb{height:56px;border:1px solid #e5e7eb;border-radius:6px;overflow:hidden;position:relative;background:#fff}
  .cms-wp-thumb-h{height:10px}
  .cms-wp-thumb-b{padding:3px 4px;display:flex;flex-direction:column;gap:3px}
  .cms-wp-thumb-line{height:4px;background:#d1d5db;border-radius:3px}
  .cms-wp-thumb-line.s{width:55%}
  .cms-wp-thumb-line.m{width:75%}
  .cms-wp-thumb-line.l{width:92%}
  .cms-wp-thumb-classic .cms-wp-thumb-h{background:linear-gradient(90deg,#5ea88a,#4a8e73)}
  .cms-wp-thumb-min .cms-wp-thumb-h{background:#f3f4f6}
  .cms-wp-thumb-min .cms-wp-thumb-b{gap:2px}
  .cms-wp-thumb-dark{background:#0f172a;border-color:#334155}
  .cms-wp-thumb-dark .cms-wp-thumb-h{background:linear-gradient(90deg,#0ea5e9,#0369a1)}
  .cms-wp-thumb-dark .cms-wp-thumb-line{background:#475569}
  .cms-wp-thumb-organic{background:#f6efe1;border-color:#ddcfbc}
  .cms-wp-thumb-organic .cms-wp-thumb-h{background:#efe3cf}
  .cms-wp-thumb-organic .cms-wp-thumb-line{background:#c8b89e}
  .cms-wp-thumb-poster .cms-wp-thumb-h{background:linear-gradient(90deg,#ef4444,#ea580c)}
  .cms-wp-thumb-poster .cms-wp-thumb-b{display:grid;grid-template-columns:1fr 1fr;gap:3px}
  .cms-wp-thumb-poster .cms-wp-thumb-line{width:100%}
  .cms-wp-thumb-mag{background:#f5f3ff;border-color:#ddd6fe}
  .cms-wp-thumb-mag .cms-wp-thumb-h{background:linear-gradient(90deg,#8b5cf6,#6366f1)}
  .cms-wp-thumb-mag .cms-wp-thumb-b{display:grid;grid-template-columns:1.2fr .8fr;gap:3px}
  .cms-wp-thumb-mag .cms-wp-thumb-line{width:100%}
  .cms-wp-thumb-time{background:#eef2ff;border-color:#c7d2fe}
  .cms-wp-thumb-time .cms-wp-thumb-h{background:linear-gradient(90deg,#2563eb,#1d4ed8)}
  .cms-wp-thumb-time .cms-wp-thumb-b{position:relative;padding-left:10px}
  .cms-wp-thumb-time .cms-wp-thumb-b:before{content:'';position:absolute;left:4px;top:2px;bottom:2px;width:2px;background:#93c5fd;border-radius:2px}
  .cms-wp-thumb-chip{background:#ecfeff;border-color:#a5f3fc}
  .cms-wp-thumb-chip .cms-wp-thumb-h{background:linear-gradient(90deg,#0891b2,#0e7490)}
  .cms-wp-thumb-chip .cms-wp-thumb-b{display:flex;flex-direction:row;flex-wrap:wrap;gap:3px;padding:4px}
  .cms-wp-thumb-chip .cms-wp-thumb-line{height:8px;width:42%;border-radius:999px;background:#67e8f9}
  .cms-wp-thumb-bento{background:#fff7ed;border-color:#fed7aa}
  .cms-wp-thumb-bento .cms-wp-thumb-h{background:linear-gradient(90deg,#f97316,#ea580c)}
  .cms-wp-thumb-bento .cms-wp-thumb-b{display:grid;grid-template-columns:1fr 1fr;gap:3px}
  .cms-wp-thumb-bento .cms-wp-thumb-line{height:10px;width:100%;border-radius:4px;background:#fdba74}
  .cms-wp-thumb-rail{background:#ecfeff;border-color:#a5f3fc}
  .cms-wp-thumb-rail .cms-wp-thumb-h{background:linear-gradient(90deg,#0e7490,#155e75)}
  .cms-wp-thumb-rail .cms-wp-thumb-b{position:relative;padding-left:11px}
  .cms-wp-thumb-rail .cms-wp-thumb-b:before{content:'';position:absolute;left:5px;top:3px;bottom:3px;width:2px;background:#22d3ee;border-radius:2px}
  .cms-wp-thumb-rail .cms-wp-thumb-line{height:5px;background:#99f6e4}
  .cms-wp-thumb-news{background:#fafaf9;border-color:#e7e5e4}
  .cms-wp-thumb-news .cms-wp-thumb-h{background:linear-gradient(90deg,#57534e,#78716c)}
  .cms-wp-thumb-news .cms-wp-thumb-b{display:grid;grid-template-columns:1fr 1fr;gap:4px}
  .cms-wp-thumb-news .cms-wp-thumb-line{height:4px;width:100%;background:#a8a29e}
  .cms-wp-thumb-flyermag{background:#eef4ea;border-color:#d7e5d5}
  .cms-wp-thumb-flyermag .cms-wp-thumb-h{background:linear-gradient(90deg,#95a98e,#7f9478)}
  .cms-wp-thumb-flyermag .cms-wp-thumb-b{position:relative;padding:4px}
  .cms-wp-thumb-flyermag .cms-wp-thumb-b:before{content:'';position:absolute;left:4px;top:4px;width:30px;height:30px;border-radius:50%;background:#dfeadd;border:1px solid #c7d8c5}
  .cms-wp-thumb-flyermag .cms-wp-thumb-line{height:5px;background:#9aae93;width:60%;margin-left:auto;border-radius:6px}
  .cms-savings-preview{margin-top:10px;padding:10px;border:1px solid #e5e7eb;border-radius:10px;background:#fff}
  .cms-savings-preview-title{font-size:11px;font-weight:700;color:#6b7280;text-transform:uppercase;letter-spacing:.5px;margin-bottom:6px}
  .cms-savings-preview-canvas{width:100%;height:auto;display:block;border:1px solid #f3f4f6;border-radius:8px;background:linear-gradient(180deg,#fff,#fafafa)}
  #cms-panel-cfg .cms-card{margin-bottom:8px}
  #cms-panel-cfg .cms-card-header{padding:9px 12px;font-size:13px}
  #cms-panel-cfg .cms-card-body{padding:10px 12px}
  #cms-panel-cfg .cms-card-body label{font-size:11.5px!important;line-height:1.25}
  #cms-panel-cfg .cms-card-body .cms-input{padding:6px 10px;font-size:12px;border-radius:6px}
  #cms-panel-cfg .cms-card-body input[type=\"color\"]{height:24px!important}
  #cms-panel-cfg .cms-card-body input[type=\"range\"]{height:16px}
  #cms-panel-cfg .cms-btn-sm{padding:3px 8px;font-size:11px}
  #cms-panel-cfg .cms-wp-preview{padding:4px;gap:4px}
  #cms-panel-cfg .cms-wp-thumb{height:48px}
  #cms-panel-cfg .cms-wp-preview-name{font-size:9px}
  #cms-panel-cfg .cms-savings-preview{padding:8px;margin-top:8px}
  #cms-panel-cfg .cms-savings-preview-canvas{max-height:72px}
  #cms-panel-cfg .cms-subtab{padding:6px 12px!important;font-size:12px!important}
  #cms-panel-cfg p[style*=\"font-size:12px\"]{font-size:11px!important;line-height:1.35!important;margin-bottom:10px!important}
  #cms-panel-cfg [style*=\"grid-template-columns:1fr 1fr;gap:12px\"]{gap:10px!important}
  #cms-panel-cfg .cms-card[style*=\"margin-top:14px\"],
  #cms-panel-cfg .cms-card[style*=\"margin-top:12px\"]{margin-top:8px!important}
  #cms-panel-cfg .cms-card-body[style*=\"flex-direction:column;gap:10px\"]{gap:7px!important}
  #cms-panel-cfg .cms-card-body label[style*=\"font-size:12px\"]{margin-bottom:1px}
  #cms-panel-cfg .cms-card-body [style*=\"margin-top:6px\"]{margin-top:4px!important}
  #cms-panel-cfg .cms-card-body [style*=\"margin-top:16px\"]{margin-top:10px!important}
  #cms-panel-cfg .cms-card-body [style*=\"margin-top:14px\"]{margin-top:8px!important}
  #cms-panel-cfg .cms-card-body [style*=\"display:flex;align-items:center;gap:8px\"]{gap:6px!important}
  #cms-panel-cfg .cms-card-body span[id$='-val']{font-size:12px!important;min-width:36px!important}
  #cms-panel-cfg.cms-compact-on .cms-card-header{padding:7px 10px;font-size:12px}
  #cms-panel-cfg.cms-compact-on .cms-card-body{padding:8px 10px}
  #cms-panel-cfg.cms-compact-on .cms-card-body label{font-size:11px!important;line-height:1.2}
  #cms-panel-cfg.cms-compact-on .cms-card-body .cms-input{padding:5px 8px;font-size:11.5px}
  #cms-panel-cfg.cms-compact-on .cms-card-body input[type=\"color\"]{height:20px!important}
  #cms-panel-cfg.cms-compact-on .cms-card-body input[type=\"range\"]{height:14px}
  #cms-panel-cfg.cms-compact-on .cms-wp-preview{padding:3px;gap:3px}
  #cms-panel-cfg.cms-compact-on .cms-wp-thumb{height:42px}
  #cms-panel-cfg.cms-compact-on .cms-wp-preview-name{font-size:8.5px}
  #cms-panel-cfg.cms-compact-on .cms-savings-preview{padding:6px}
  #cms-panel-cfg.cms-compact-on .cms-savings-preview-canvas{max-height:60px}
  .feat-slider{background:#e5e7eb !important}
  .feat-slider:before{position:absolute;content:\"\";height:20px;width:20px;left:3px;bottom:3px;background:#fff;border-radius:50%;transition:.25s;box-shadow:0 1px 3px rgba(0,0,0,.2)}
  .feat-slider:after{position:absolute;content:\"AUS\";font-size:8px;font-weight:700;color:#fff;right:6px;top:50%;transform:translateY(-50%);letter-spacing:.3px}
  input:checked+.feat-slider{background:#22c55e !important}
  input:checked+.feat-slider:after{content:\"AN\";right:auto;left:7px}
  input:checked+.feat-slider:before{transform:translateX(22px)}
  .cms-switch{display:inline-flex;align-items:center;gap:6px;font-size:11px;color:#6b7280;user-select:none;cursor:pointer}
  .cms-switch input{margin:0}
  @media(max-width:960px){.cms-grid{grid-template-columns:repeat(3,1fr)}.cms-hours-row{flex-wrap:wrap}}
  @media(max-width:960px){.cms-wp-preview-grid{grid-template-columns:repeat(3,minmax(0,1fr))}.cms-wp-preview-grid-home{grid-template-columns:repeat(3,minmax(0,1fr))}}
  @media(max-width:640px){.cms-grid{grid-template-columns:1fr 1fr}}
  @media(max-width:640px){.cms-wp-preview-grid{grid-template-columns:repeat(2,minmax(0,1fr))}.cms-wp-preview-grid-home{grid-template-columns:repeat(2,minmax(0,1fr))}}
  @media(max-width:480px){.cms-grid{grid-template-columns:1fr}}
  /* ── Config sub-tab 2-col grid, stack on mobile ── */
  .cms-cfg-grid{display:grid;grid-template-columns:1fr 1fr;gap:12px}
  @media(max-width:700px){.cms-cfg-grid{grid-template-columns:1fr}}
  @media(max-width:500px){.cms-subtab{padding:8px 10px!important;font-size:12px!important}}
  /* ── Section Nav (Plakat/Flyer/Gemeinsam) ── */
  .cfg-section-btn{transition:all .15s ease}
  .cfg-section-btn:hover{color:var(--c-m-pri)!important;background:#f0fdf4}
  .cfg-section-btn.active{color:var(--c-m-pri)!important;border-bottom-color:var(--c-m-pri)!important}
  @media(max-width:500px){
    .cfg-section-btn{padding:6px 8px!important;font-size:10px!important;letter-spacing:0!important}
    .cfg-section-nav{gap:0!important}
  }
  /* ── Arrow-cross anchor control ── */
  .anchor-cross{display:inline-grid;grid-template-columns:32px 32px 32px;grid-template-rows:32px 32px 32px;gap:2px;user-select:none}
  .anchor-cross button{width:32px;height:32px;border:1px solid #d1d5db;border-radius:6px;background:#f9fafb;cursor:pointer;font-size:16px;line-height:1;padding:0;color:#374151;display:flex;align-items:center;justify-content:center;transition:background .1s}
  .anchor-cross button:hover{background:#e5e7eb}
  .anchor-cross button:active{background:#d1d5db}
  .anchor-cross .ac-center{background:#fff;border-color:#e5e7eb;cursor:default;font-size:11px;font-weight:700;color:#9ca3af}
  .anchor-cross .ac-center:hover{background:#fff}
  .anchor-pad{display:flex;align-items:center;gap:12px}
  .anchor-vals{font-size:11px;color:#6b7280;line-height:1.6}
  /* ── Split-Panel: Settings left (scrollable), Live-Preview right (fixed) ── */
  .cfg-split{display:flex;gap:16px;align-items:stretch;height:calc(100vh - 260px);min-height:400px}
  .cfg-split-left{flex:1;min-width:0;overflow-y:auto;padding-right:4px}
  .cfg-split-right{width:320px;flex-shrink:0;overflow-y:auto}
  .cfg-split-right .cfg-lp-inner{border:1px solid #e5e7eb;border-radius:10px;background:#fff;padding:10px;box-shadow:0 2px 8px rgba(0,0,0,.08);position:sticky;top:0}
  .cfg-split-right .cfg-lp-inner img{max-width:100%;border-radius:6px;cursor:pointer}
  @media(max-width:900px){
    .cfg-split{flex-direction:column;height:auto;min-height:0}
    .cfg-split-left{overflow-y:visible;padding-right:0}
    .cfg-split-right{width:100%;overflow-y:visible}
    .cfg-split-right .cfg-lp-inner{position:static}
  }
  /* ── Mobile: Aktionen-Liste ── */
  @media(max-width:600px){
    .cms-akt-row{flex-direction:column;align-items:stretch;gap:6px}
    .cms-akt-btns{flex-wrap:wrap;justify-content:flex-start}
    .cms-akt-meta{display:block;margin-left:0!important;margin-top:2px}
    /* ── Mobile: Aktion Modal ── */
    .cms-modal{padding:16px 12px;max-width:100%!important}
    .cms-modal-bg{padding:8px}
    .cms-modal .cms-akt-header-grid{grid-template-columns:1fr!important;gap:8px!important}
    /* ── Mobile: Artikel-Felder hochauflösend & benutzbar ── */
    .cms-ang-fields {
      display: grid !important;
      grid-template-columns: 1fr 1fr !important;
      gap: 10px !important;
      width: 100% !important;
    }
    .cms-ang-fields .cms-ang-row-img {
      grid-column: 1 / -1 !important;
      display: flex !important;
      align-items: center !important;
      gap: 12px !important;
      background: rgba(30,70,58,0.04) !important;
      padding: 6px 10px !important;
      border-radius: 8px !important;
      width: 100% !important;
      box-sizing: border-box !important;
    }
    .cms-ang-fields .cms-art-wrap {
      grid-column: 1 / -1 !important;
      width: 100% !important;
    }
    .cms-ang-fields .cms-art-input {
      font-size: 14px !important;
      height: 38px !important;
      padding: 6px 12px !important;
    }
    .cms-ang-fields [data-f=\"details\"] {
      grid-column: 1 / -1 !important;
      font-size: 13px !important;
      height: 36px !important;
      padding: 6px 10px !important;
    }
    .cms-ang-fields [data-f=\"preis\"] {
      grid-column: 1 / 2 !important;
      font-size: 13px !important;
      height: 36px !important;
      text-align: left !important;
      padding: 6px 10px !important;
    }
    .cms-ang-fields [data-f=\"statt_preis\"] {
      grid-column: 2 / 3 !important;
      font-size: 13px !important;
      height: 36px !important;
      text-align: left !important;
      padding: 6px 10px !important;
    }
    .cms-ang-fields [data-f=\"artikelnummer\"] {
      grid-column: 1 / -1 !important;
      font-size: 12px !important;
      height: 34px !important;
      padding: 6px 10px !important;
    }
    .cms-ang-row{padding:14px 10px 10px 10px !important}
    .cms-ang-img-row{flex-wrap:wrap}
    /* ── Mobile: Tabs ── */
    .cms-tabs{gap:2px}
    .cms-tab{padding:6px 8px;font-size:11px}
    .cms-tab[style*=\"margin-left:auto\"]{margin-left:0!important}
    /* ── Mobile: Flex header ── */
    .cms-flex.cms-between{flex-direction:column;align-items:flex-start;gap:8px}
    /* ── Mobile: Wochenplan button bar ── */
    .cms-flex.cms-between>div[style*=\"display:flex\"]{flex-wrap:wrap;gap:6px!important}
    .cms-btn-preview,.cms-btn-wa{padding:6px 10px;font-size:12px}
    .cms-btn-wa svg,.cms-btn-preview svg{width:14px;height:14px}
    .cms-week-nav{gap:4px}
    .cms-week-quick{padding:3px 6px;font-size:10px}
    /* ── Mobile: Öffnungszeiten ── */
    .cms-hours-row{flex-direction:column;align-items:flex-start;gap:6px;padding:10px 12px}
    .cms-hours-row .cms-hours-day{width:auto;font-size:14px;font-weight:700}
    .cms-hours-top{display:flex;align-items:center;gap:8px;width:100%}
    .cms-hours-times{display:flex;flex-direction:column;gap:4px;width:100%}
    .cms-hours-block{display:flex;align-items:center;gap:4px;background:#f9fafb;border:1px solid #e5e7eb;border-radius:6px;padding:4px 8px;width:100%}
    .cms-hours-block .cms-hours-label{min-width:28px;font-weight:600;color:#6b7280;font-size:12px}
    .cms-hours-time{width:100px;font-size:12px;padding:4px 6px}
    /* ── Mobile: Meal modal grid ── */
    .cms-modal .cms-meal-grid{grid-template-columns:1fr!important}
    /* ── Mobile: Back button ── */
    div[style*=\"position: absolute\"][style*=\"top: 18px\"]{position:static!important;padding:8px 12px!important}
    div[style*=\"position: absolute\"][style*=\"top: 18px\"] a{font-size:12px!important;padding:5px 12px!important}
    /* ── Mobile: CMS header ── */
    .cms-wrap{padding:8px!important}
    .cms-wrap>.cms-flex.cms-between.cms-mb{gap:4px}
    .cms-wrap>.cms-flex.cms-between.cms-mb h2{font-size:14px!important}
  }
  /* ── Mobile: Social Media Tab ── */
  @media(max-width:600px){
    /* Sub-tabs */
    #cms-panel-social .cms-btn[id^=\"social-subtab\"]{padding:7px 4px!important;font-size:11px!important}
    /* Katalog: add-form stacks vertically */
    #social-panel-katalog .cms-card-body>div:first-child{flex-direction:column!important;gap:8px!important}
    #social-panel-katalog .cms-card-body>div:first-child>div{width:100%!important;min-width:0!important;flex:none!important}
    #social-panel-katalog .cms-card-body>div:first-child>button{width:100%!important;padding:10px!important;font-size:13px!important}
    #soc-kat-paste-zone{padding:10px!important}
    #soc-kat-paste-hint{font-size:11px!important}
    /* Katalog table: convert to stacked cards on mobile */
    #soc-kat-list table{display:block!important}
    #soc-kat-list table tr.soc-kat-item{display:flex!important;flex-wrap:wrap!important;align-items:center!important;gap:6px!important;padding:10px!important;border-bottom:1px solid #f3f4f6!important}
    #soc-kat-list table tr.soc-kat-item td{display:block!important;padding:2px!important;border:none!important;width:auto!important}
    #soc-kat-list table tr.soc-kat-item td:first-child{flex-shrink:0}
    #soc-kat-list table tr.soc-kat-item td:nth-child(2){flex:1;min-width:0;font-size:14px!important}
    #soc-kat-list table tr.soc-kat-item td:nth-child(2) span{font-size:14px!important}
    #soc-kat-list table tr.soc-kat-item td:nth-child(3){font-size:13px!important}
    #soc-kat-list table tr.soc-kat-item td:nth-child(4){display:flex!important;gap:8px!important}
    #soc-kat-list table tr.soc-kat-item td:nth-child(4) button{padding:6px 12px!important;font-size:13px!important}
    /* Edit row on mobile */
    #soc-kat-list table tr.soc-kat-edit-tr{display:block!important}
    #soc-kat-list table tr.soc-kat-edit-tr td{display:block!important;padding:10px!important}
    /* Inline edit row */
    .soc-kat-edit-row{flex-direction:column!important;gap:6px!important;padding:10px!important}
    .soc-kat-edit-row input,.soc-kat-edit-row select{width:100%!important;font-size:14px!important;padding:8px!important;box-sizing:border-box!important}
    .soc-kat-edit-btns{display:flex;gap:6px;width:100%}
    .soc-kat-edit-btns button{flex:1!important;padding:8px!important;font-size:12px!important}
    /* Post-Builder: thumbnail focus for paste */
    .soc-pick-thumb:focus{outline:2px solid #2563eb;outline-offset:1px;border-radius:4px}
    /* Post-Builder: canvas */
    #soc-post-canvas,#soc-post-canvas-meal{max-width:100%!important;height:auto!important}
    /* Post-Builder: titel + text */
    #soc-post-titel,#soc-post-text{font-size:14px!important;padding:10px!important}
    /* Post-Builder: share buttons stack */
    .soc-share-bar{flex-direction:column!important;gap:8px!important}
    .soc-share-bar .cms-btn,.soc-share-bar button{width:100%!important;min-width:0!important;padding:14px!important;font-size:14px!important;justify-content:center;box-sizing:border-box!important}
    /* Free-entry form */
    #soc-free-form>div:first-child{flex-direction:column!important;gap:8px!important}
    #soc-free-form>div:first-child>div{width:100%!important;min-width:0!important;flex:none!important}
    #soc-free-form input,#soc-free-form select{font-size:14px!important;padding:8px 10px!important}
    #soc-free-form>div:nth-child(2){flex-wrap:wrap!important}
    #soc-free-form>div:nth-child(2) button{flex:1!important;padding:10px!important;font-size:13px!important}
    /* Mittagessen meals: bigger touch targets */
    .soc-post-wp{width:22px!important;height:22px!important}
    .soc-post-wp+span,.soc-post-wp~span{font-size:13px!important}
    /* Pick grid – mobile card layout */
    #soc-pick-grid{max-height:50vh!important;-webkit-overflow-scrolling:touch;padding:6px!important}
    #soc-pick-grid .soc-pick-row{padding:10px!important;gap:10px!important;min-height:auto!important;align-items:flex-start!important;border-radius:10px!important;margin-bottom:4px!important}
    #soc-pick-grid .soc-pick-row input[type=checkbox]{width:24px!important;height:24px!important;margin-top:6px!important}
    #soc-pick-grid .soc-pick-thumb-wrap{width:48px!important;height:48px!important}
    #soc-pick-grid .soc-pick-thumb img,#soc-pick-grid .soc-pick-thumb>div{width:48px!important;height:48px!important;border-radius:8px!important}
    #soc-pick-grid .soc-pick-cam{width:26px!important;height:26px!important;font-size:14px!important;bottom:-4px!important;right:-4px!important}
    #soc-pick-grid .soc-pick-name{font-size:14px!important;line-height:1.35!important}
    #soc-pick-grid .soc-pick-ab{min-height:32px!important;font-size:12px!important;padding:4px 8px!important}
    /* Cat chips larger touch targets */
    .soc-cat-chip{padding:8px 14px!important;font-size:12px!important;min-height:36px!important}
    /* Selected tags */
    #soc-pick-selected{padding:10px!important}
    #soc-pick-tags span{font-size:12px!important;padding:4px 10px!important}
    /* Search */
    #soc-pick-search{font-size:15px!important;padding:12px 14px!important}
    /* Free items */
    .soc-free-item{padding:8px 10px!important;gap:8px!important;flex-wrap:wrap!important}
    .soc-free-item span{font-size:13px!important}
    .soc-free-item button{padding:4px 10px!important;font-size:16px!important;min-width:36px!important;min-height:36px!important}
    /* Verlauf */
    #soc-verlauf-list .cms-card{margin-bottom:12px}
  }
  /* Touch-friendly defaults for Social section */
  #cms-panel-social input[type=\"checkbox\"]{min-width:18px;min-height:18px}
  #cms-panel-social label{-webkit-tap-highlight-color:transparent}·
  .cms-login-box{max-width:360px;margin:80px auto;padding:32px;background:#fff;border-radius:16px;box-shadow:0 8px 32px rgba(0,0,0,.12);text-align:center}
  .cms-login-box h2{font-size:20px;font-weight:700;color:#1f2937;margin:0 0 4px}
  .cms-login-box p{font-size:13px;color:#6b7280;margin:0 0 20px}
  .cms-login-box input{width:100%;padding:10px 14px;border:1px solid #d1d5db;border-radius:8px;font-size:14px;margin-bottom:12px;box-sizing:border-box}
  .cms-login-box input:focus{outline:none;border-color:#16a34a;box-shadow:0 0 0 3px rgba(22,163,74,.15)}
  .cms-login-box .cms-btn-login{width:100%;padding:10px;background:#16a34a;color:#fff;border:none;border-radius:8px;font-size:14px;font-weight:600;cursor:pointer}
  .cms-login-box .cms-btn-login:hover{background:#15803d}
  .cms-login-err{color:#ef4444;font-size:12px;margin-top:-8px;margin-bottom:8px;display:none}
  .cms-pw-wrap{position:relative}
  .cms-pw-wrap input{padding-right:40px}
  .cms-pw-toggle{position:absolute;right:10px;top:50%;transform:translateY(-50%);background:none;border:none;cursor:pointer;color:#9ca3af;font-size:18px;padding:4px;line-height:1}
</style>·
<div id=\"cms-login\" class=\"cms-wrap\" lang=\"de\" style=\"\">
  <div class=\"cms-login-box\">
    <h2>Dorfladen CMS</h2>
    <p>Bitte Passwort eingeben</p>
    <div class=\"cms-pw-wrap\"><input type=\"password\" id=\"cms-login-pw\" placeholder=\"Passwort\" autocomplete=\"current-password\"><button type=\"button\" class=\"cms-pw-toggle\" id=\"cms-pw-eye\" title=\"Passwort anzeigen\">👁</button></div>
    <div class=\"cms-login-err\" id=\"cms-login-err\">Falsches Passwort</div>
    <button class=\"cms-btn-login\" id=\"cms-login-btn\">Anmelden</button>
  </div>
</div>
<script id=\"cms-pw-hash\" type=\"application/json\">\"d324fb3c8c3a1ef449e1f776b2f29fd718d00e7967adbb0bbe8326c2452bea93\"</script>·
<div class=\"cms-wrap\" id=\"cms-app\" lang=\"de\" style=\"display:none\">
  <div class=\"cms-flex cms-between cms-mb\" style=\"align-items: center; border-bottom: 1px solid rgba(0,0,0,0.04); padding-bottom: 14px; margin-bottom: 18px;\">
    <div style=\"display:flex;align-items:center;gap:12px;cursor:pointer;\" onclick=\"location.href='/index.html'\" title=\"Zurück zur Website\">
      <img id=\"cms-header-logo\" src=\"data:image/webp;base64,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\" alt=\"Dorfladen Oberornau\" style=\"height:52px;width:auto;flex-shrink:0;border-radius:6px; transition: opacity 0.15s ease;\" onmouseover=\"this.style.opacity='0.8'\" onmouseout=\"this.style.opacity='1'\">
      <h2 style=\"font-size:18px;font-weight:800;color:var(--c-m-pri);margin:0; transition: color 0.15s ease;\" onmouseover=\"this.style.color='var(--c-m-sec)'\" onmouseout=\"this.style.color='var(--c-m-pri)'\">Dorfladen CMS</h2>
    </div>
    <div style=\"display:flex;align-items:center;gap:16px;\">
      <span id=\"cms-status\" style=\"font-size:11px;color:var(--c-m-muted);font-weight:700;text-transform:uppercase;letter-spacing:0.3px;\">Lade...</span>
      <span id=\"cms-version\" style=\"font-size:10px;color:var(--c-m-muted);opacity:0.5;font-weight:600;\">v1.5.0 (Build 500)</span>
      <a href=\"/index.html\" class=\"cms-btn cms-btn-gray\" style=\"font-size: 11px; font-weight: 700; padding: 6px 12px; border-radius: 8px; text-decoration: none; box-shadow: none; border: 1px solid #e5e7eb; background: #ffffff; color: var(--c-m-text); display: inline-flex; align-items: center; gap: 6px; transition: all 0.15s ease-in-out; text-transform: uppercase; letter-spacing: 0.3px;\">
        <svg width=\"12\" height=\"12\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2.5\" stroke-linecap=\"round\" stroke-linejoin=\"round\" style=\"color: var(--c-m-muted);\"><line x1=\"19\" y1=\"12\" x2=\"5\" y2=\"12\"></line><polyline points=\"12 19 5 12 12 5\"></polyline></svg>
        Website
      </a>
    </div>
  </div>·
  <div class=\"cms-tabs-wrap\">
  <div class=\"cms-tabs\" id=\"cms-tabs-scroll\">
    <button class=\"cms-tab active\" data-action=\"tab\" data-id=\"wp\" id=\"cms-tab-wp\">
      <svg width=\"14\" height=\"14\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2.5\" stroke-linecap=\"round\" stroke-linejoin=\"round\" style=\"vertical-align:middle;margin-right:4px;\"><rect width=\"18\" height=\"18\" x=\"3\" y=\"4\" rx=\"2\" ry=\"2\"></rect><line x1=\"16\" x2=\"16\" y1=\"2\" y2=\"6\"></line><line x1=\"8\" x2=\"8\" y1=\"2\" y2=\"6\"></line><line x1=\"3\" x2=\"21\" y1=\"10\" y2=\"10\"></line></svg> Wochenplan
    </button>
    <button class=\"cms-tab\" data-action=\"tab\" data-id=\"hours\" id=\"cms-tab-hours\">
      <svg width=\"14\" height=\"14\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2.5\" stroke-linecap=\"round\" stroke-linejoin=\"round\" style=\"vertical-align:middle;margin-right:4px;\"><circle cx=\"12\" cy=\"12\" r=\"10\"></circle><polyline points=\"12 6 12 12 16 14\"></polyline></svg> Öffnungszeiten
    </button>
    <button class=\"cms-tab\" data-action=\"tab\" data-id=\"ang\" id=\"cms-tab-ang\">
      <svg width=\"14\" height=\"14\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2.5\" stroke-linecap=\"round\" stroke-linejoin=\"round\" style=\"vertical-align:middle;margin-right:4px;\"><path d=\"m3 11 18-5v12L3 14v-3Z\"></path><path d=\"M11.6 16.8a3 3 0 1 1-5.8-1.6\"></path></svg> Angebote
    </button>
    <button class=\"cms-tab\" data-action=\"tab\" data-id=\"hp\" id=\"cms-tab-hp\">
      <svg width=\"14\" height=\"14\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2.5\" stroke-linecap=\"round\" stroke-linejoin=\"round\" style=\"vertical-align:middle;margin-right:4px;\"><path d=\"m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z\"></path><polyline points=\"9 22 9 12 15 12 15 22\"></polyline></svg> Homepage
    </button>
    <button class=\"cms-tab\" data-action=\"tab\" data-id=\"news\" id=\"cms-tab-news\">
      <svg width=\"14\" height=\"14\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\" style=\"vertical-align:middle;margin-right:4px;\"><path d=\"M4 22h16a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2H8a2 2 0 0 0-2 2v16a2 2 0 0 1-2 2Zm0 0a2 2 0 0 1-2-2v-9c0-1.1.9-2 2-2h2\"></path><path d=\"M18 14h-8\"></path><path d=\"M15 18h-5\"></path><path d=\"M10 6h8v4h-8V6Z\"></path></svg> Aktuelles
    </button>
    <button class=\"cms-tab\" data-action=\"tab\" data-id=\"sort\" id=\"cms-tab-sort\">
      <svg width=\"14\" height=\"14\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2.5\" stroke-linecap=\"round\" stroke-linejoin=\"round\" style=\"vertical-align:middle;margin-right:4px;\"><circle cx=\"8\" cy=\"21\" r=\"1\"></circle><circle cx=\"19\" cy=\"21\" r=\"1\"></circle><path d=\"M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 1.95-1.57l1.65-7.43H5.12\"></path></svg> Sortiment
    </button>
    <button class=\"cms-tab\" data-action=\"tab\" data-id=\"gallery\" id=\"cms-tab-gallery\">
      <svg width=\"14\" height=\"14\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2.5\" stroke-linecap=\"round\" stroke-linejoin=\"round\" style=\"vertical-align:middle;margin-right:4px;\"><rect width=\"18\" height=\"18\" x=\"3\" y=\"3\" rx=\"2\" ry=\"2\"></rect><circle cx=\"9\" cy=\"9\" r=\"2\"></circle><path d=\"m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21\"></path></svg> Impressionen
    </button>
    <button class=\"cms-tab\" data-action=\"tab\" data-id=\"push\" id=\"cms-tab-push\" style=\"color:#7c3aed;\">
      <svg width=\"14\" height=\"14\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2.5\" stroke-linecap=\"round\" stroke-linejoin=\"round\" style=\"vertical-align:middle;margin-right:4px;\"><path d=\"M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9\"></path><path d=\"M10.3 21a1.94 1.94 0 0 0 3.4 0\"></path></svg> Push
    </button>
    <button class=\"cms-tab\" data-action=\"tab\" data-id=\"settings\" id=\"cms-tab-settings\" style=\"color:#6366f1;\">
      <svg width=\"14\" height=\"14\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2.5\" stroke-linecap=\"round\" stroke-linejoin=\"round\" style=\"vertical-align:middle;margin-right:4px;\"><path d=\"M12 20h9\"></path><path d=\"M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z\"></path></svg> Settings
    </button>
    <button class=\"cms-tab\" data-action=\"tab\" data-id=\"cfg\" id=\"cms-tab-cfg\" style=\"color:#bd8b5c;\">
      <svg width=\"14\" height=\"14\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2.5\" stroke-linecap=\"round\" stroke-linejoin=\"round\" style=\"vertical-align:middle;margin-right:4px;\"><path d=\"M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.1a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z\"></path><circle cx=\"12\" cy=\"12\" r=\"3\"></circle></svg> Design
    </button>
    <button class=\"cms-tab\" data-action=\"tab\" data-id=\"stats\" id=\"cms-tab-stats\" style=\"color:#0ea5e9;\">
      <svg width=\"14\" height=\"14\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2.5\" stroke-linecap=\"round\" stroke-linejoin=\"round\" style=\"vertical-align:middle;margin-right:4px;\"><path d=\"M3 3v18h18\"></path><path d=\"m19 9-5 5-4-4-3 3\"></path></svg> Statistik
    </button>
    <button class=\"cms-tab\" data-action=\"tab\" data-id=\"orders\" id=\"cms-tab-orders\" style=\"color:#d97706;\">
      <svg width=\"14\" height=\"14\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2.5\" stroke-linecap=\"round\" stroke-linejoin=\"round\" style=\"vertical-align:middle;margin-right:4px;\"><path d=\"M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z\"></path><line x1=\"3\" x2=\"21\" y1=\"6\" y2=\"6\"></line><path d=\"M16 10a4 4 0 0 1-8 0\"></path></svg> Bestellungen
    </button>
    <button class=\"cms-tab\" data-action=\"tab\" data-id=\"metzger\" id=\"cms-tab-metzger\" style=\"color:#991b1b;\">
      <svg width=\"14\" height=\"14\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2.5\" stroke-linecap=\"round\" stroke-linejoin=\"round\" style=\"vertical-align:middle;margin-right:4px;\"><path d=\"M15.5 2.5c-1 .3-1.8 1-2.3 1.9a4 4 0 0 0-.2 3.3c.4 1 1.3 1.7 2.3 2 1 .2 2.1 0 3-.6.9-.7 1.4-1.7 1.4-2.8 0-1.1-.5-2.2-1.4-2.9a4 4 0 0 0-2.8-.9Z\"></path><path d=\"M8 14.5c0-1.3.5-2.4 1.4-3.2C10.3 10.5 11.6 10 13 10s2.7.5 3.6 1.3c.9.8 1.4 2 1.4 3.2V22H8v-7.5Z\"></path></svg> Metzger
    </button>
    <button class=\"cms-tab\" data-action=\"tab\" data-id=\"social\" id=\"cms-tab-social\" style=\"color:#2e7d4f;\">
      <svg width=\"14\" height=\"14\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2.5\" stroke-linecap=\"round\" stroke-linejoin=\"round\" style=\"vertical-align:middle;margin-right:4px;\"><path d=\"M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z\"></path><polyline points=\"22,6 12,13 2,6\"></polyline></svg> Social
    </button>
    <button class=\"cms-tab\" data-action=\"tab\" data-id=\"help\" id=\"cms-tab-help\" style=\"color:#16a34a;\">
      <svg width=\"14\" height=\"14\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2.5\" stroke-linecap=\"round\" stroke-linejoin=\"round\" style=\"vertical-align:middle;margin-right:4px;\"><circle cx=\"12\" cy=\"12\" r=\"10\"></circle><path d=\"M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3\"></path><line x1=\"12\" y1=\"17\" x2=\"12.01\" y2=\"17\"></line></svg> Hilfe
    </button>
  </div>
  </div>·
  <!-- Wochenplan -->
  <div id=\"cms-panel-wp\">
    <div class=\"cms-flex cms-between cms-mb\">
      <div class=\"cms-week-nav\">
        <button class=\"cms-week-btn\" data-action=\"weekPrev\">←</button>
        <div>
          <div id=\"cms-wp-title\" style=\"font-weight:700;font-size:15px;color:#1f2937\">KW --</div>
          <div id=\"cms-wp-range\" style=\"font-size:12px;color:#6b7280\"></div>
        </div>
        <button class=\"cms-week-btn\" data-action=\"weekNext\">→</button>
        <button class=\"cms-week-quick\" data-action=\"weekThis\">Diese Woche</button>
        <button class=\"cms-week-quick\" data-action=\"weekNxt\">Nächste Woche</button>
      </div>
      <div style=\"display:flex;gap:8px\"><button class=\"cms-btn-preview\" data-action=\"previewWP\"><svg viewBox=\"0 0 24 24\"><path d=\"M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z\"></path></svg>Vorschau</button><button class=\"cms-btn cms-btn-gray\" data-action=\"printWP\" style=\"padding:4px 10px;font-size:11px\">🖨️ Drucken</button><button class=\"cms-btn-wa\" data-action=\"shareWP\"><svg viewBox=\"0 0 24 24\"><path d=\"M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.654-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z\"></path></svg>Teilen</button><button class=\"cms-btn cms-btn-primary\" data-action=\"openAddMeal\">+ Gericht</button><button class=\"cms-btn cms-btn-gray\" onclick=\"cmsTab('help'); cmsSwitchHelpTopic('wp-help')\" title=\"Wochenplan Hilfe\" style=\"padding:4px 10px;font-size:14px;background:#e8f5e9;color:#16a34a;border-color:#c8e6c9\">❓</button></div>
    </div>
    <div id=\"cms-wp-loading\" style=\"display:none;text-align:center;padding:40px 0\">
      <div style=\"display:inline-block;width:32px;height:32px;border:3px solid #e5e7eb;border-top-color:#2e7d32;border-radius:50%;animation:cms-spin 0.8s linear infinite\"></div>
      <div style=\"margin-top:10px;color:#6b7280;font-size:14px\">Wochenplan wird geladen…</div>
    </div>
    <div class=\"cms-grid\" id=\"cms-wp-grid\"></div>
    <div class=\"cms-empty\" id=\"cms-wp-empty\" style=\"display:none\">Keine Gerichte für diese Woche</div>
  </div>·
  <!-- Öffnungszeiten -->
  <div id=\"cms-panel-hours\" style=\"display:none\">
    <div class=\"cms-flex cms-between cms-mb\">
      <h3 style=\"font-size:15px;font-weight:700;color:#1f2937;margin:0;display:flex;align-items:center;gap:6px\">Öffnungszeiten verwalten <span onclick=\"cmsTab('help'); cmsSwitchHelpTopic('hours-help')\" title=\"Hilfe anzeigen\" style=\"cursor:pointer;font-size:11px;background:#e8f5e9;color:#16a34a;width:18px;height:18px;border-radius:50%;display:inline-flex;align-items:center;justify-content:center;font-weight:700\">?</span></h3>
      <button class=\"cms-btn cms-btn-primary\" id=\"cms-save-hours\" data-action=\"saveHours\" style=\"display:none\">Speichern</button>
    </div>
    <div id=\"cms-hours-container\"></div>
  </div>
  <!-- Angebote -->
  <div id=\"cms-panel-ang\" style=\"display:none\">
    <div class=\"cms-flex cms-between cms-mb\">
      <h3 style=\"font-size:15px;font-weight:700;color:#1f2937;margin:0;display:flex;align-items:center;gap:6px\">Sonderangebote <span onclick=\"cmsTab('help'); cmsSwitchHelpTopic('ang-help')\" title=\"Hilfe anzeigen\" style=\"cursor:pointer;font-size:11px;background:#e8f5e9;color:#16a34a;width:18px;height:18px;border-radius:50%;display:inline-flex;align-items:center;justify-content:center;font-weight:700\">?</span></h3>
      <button class=\"cms-btn cms-btn-primary\" data-action=\"openNewAktion\">+ Neue Aktion erstellen</button>
    </div>
    <div id=\"cms-ang-week-nav\" style=\"display:flex;gap:6px;margin-bottom:12px\">
      <button class=\"cms-btn cms-btn-sm cms-btn-primary\" data-week=\"this\" onclick=\"cmsFilterWeek('this')\">Diese Woche</button>
      <button class=\"cms-btn cms-btn-sm cms-btn-gray\" data-week=\"next\" onclick=\"cmsFilterWeek('next')\">Nächste Woche</button>
      <button class=\"cms-btn cms-btn-sm cms-btn-gray\" data-week=\"all\" onclick=\"cmsFilterWeek('all')\">Alle</button>
    </div>
    <div id=\"cms-ang-loading\" style=\"text-align: center; padding: 40px 0px; display: none;\">
      <div style=\"display:inline-block;width:32px;height:32px;border:3px solid #e5e7eb;border-top-color:#2e7d32;border-radius:50%;animation:cms-spin 0.8s linear infinite\"></div>
      <div style=\"margin-top:10px;color:#6b7280;font-size:14px\">Angebote werden geladen…</div>
    </div>
    <div id=\"cms-akt-list\"><div class=\"cms-card\"><div class=\"cms-flex cms-between cms-ang-toggle\" style=\"padding:12px 12px 10px 12px\" data-action=\"toggleAngItems\"><div style=\"display:flex;align-items:center\"><div><div style=\"font-weight:700;color:#1f2937\">Sonderangebote KW27</div><div class=\"cms-ang-meta\">2026-06-29 bis 2026-07-04 · 6 Artikel</div></div><span class=\"cms-ang-chevron collapsed\">▼</span></div><div style=\"display:flex;gap:6px;flex-wrap:wrap;justify-content:flex-end\"><button class=\"cms-btn cms-btn-sm cms-btn-gray\" data-action=\"editAktion\" data-id=\"AKT-1782659663495\">Bearbeiten</button><button class=\"cms-btn-preview\" data-action=\"previewAktion\" data-id=\"AKT-1782659663495\"><svg viewBox=\"0 0 24 24\"><path d=\"M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z\"></path></svg>Vorschau</button><button class=\"cms-btn-wa\" data-action=\"shareAktion\" data-id=\"AKT-1782659663495\"><svg viewBox=\"0 0 24 24\"><path d=\"M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.654-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347\"></path></svg>Teilen</button><button class=\"cms-btn-trash\" data-action=\"deleteAktion\" data-id=\"AKT-1782659663495\" title=\"Löschen\"><svg viewBox=\"0 0 24 24\"><path d=\"M9 3h6l1 2h4v2H4V5h4l1-2zm1 6h2v9h-2V9zm4 0h2v9h-2V9zM7 9h2v9H7V9z\"></path></svg></button></div></div><div class=\"cms-ang-items collapsed\"><div class=\"cms-ang-item\"><div class=\"cms-ang-name\">Almighurt 500g</div><div class=\"cms-ang-price\">1,65 €</div><div class=\"cms-ang-old\">statt 2,39 €</div></div><div class=\"cms-ang-item\"><div class=\"cms-ang-name\">Bern. Nockerlgriess 250g</div><div class=\"cms-ang-price\">1,39 €</div><div class=\"cms-ang-old\">statt 1,79 €</div></div><div class=\"cms-ang-item\"><div class=\"cms-ang-name\">Meggle Streichzart 250g</div><div class=\"cms-ang-price\">2,09 €</div><div class=\"cms-ang-old\">statt 2,59 €</div></div><div class=\"cms-ang-item\"><div class=\"cms-ang-name\">Nippon Häppchen 200g</div><div class=\"cms-ang-price\">2,19 €</div><div class=\"cms-ang-old\">statt 2,69 €</div></div><div class=\"cms-ang-item\"><div class=\"cms-ang-name\">Schockocroissant</div><div class=\"cms-ang-price\">1,50 €</div><div class=\"cms-ang-old\">statt 2,00 €</div></div><div class=\"cms-ang-item\"><div class=\"cms-ang-name\">Paprikawurst</div><div class=\"cms-ang-price\">1,39 €</div><div class=\"cms-ang-old\">statt 1,69 €</div></div></div></div></div>
    <div class=\"cms-empty\" id=\"cms-ang-empty\" style=\"display:none\">Noch keine Angebote. Erstellen Sie eine neue Aktion mit Sonderangeboten.</div>
  </div>
  <!-- Aktuelles / News -->
  <div id=\"cms-panel-news\" style=\"display:none\">
    <div class=\"cms-flex cms-between cms-mb\">
      <h3 style=\"font-size:15px;font-weight:700;color:#1f2937;margin:0\">Aktuelles verwalten</h3>
      <button class=\"cms-btn cms-btn-primary\" data-action=\"openNewNews\">+ Neuer Beitrag</button>
    </div>
    <p style=\"font-size:12px;color:#6b7280;margin:0 0 12px\">Beiträge erscheinen auf der Startseite unter „Aktuelles“. Inaktive Beiträge sind ausgeblendet.</p>
    <div id=\"cms-news-list\"></div>
    <div class=\"cms-empty\" id=\"cms-news-empty\" style=\"display:none\">Noch keine Beiträge. Erstellen Sie einen neuen Beitrag.</div>
  </div>
  <!-- Homepage -->
  <div id=\"cms-panel-hp\" style=\"display:none\">
    <div class=\"cms-flex cms-between cms-mb\">
      <h3 style=\"font-size:15px;font-weight:700;color:#1f2937;margin:0\">Homepage-Texte bearbeiten</h3>
      <button class=\"cms-btn cms-btn-primary\" id=\"cms-save-hp\" data-action=\"saveHP\">Speichern</button>
      <button class=\"cms-btn cms-btn-gray\" onclick=\"cmsAddHpField()\" style=\"margin-left:6px\">+ Neues Feld</button>
    </div>
    <p style=\"font-size:12px;color:#6b7280;margin:0 0 8px\">Änderungen werden sofort auf der Startseite sichtbar (nach Cache-Aktualisierung).</p>
    <p style=\"font-size:12px;color:#6b7280;margin:0 0 16px\"><strong>Wochenplan-Layout:</strong> im Tab <strong>Design → Wochenplan</strong> bei <strong>„Wochenplan-Layout (Homepage Karte)“</strong>.</p>
    <!-- Logo Upload -->
    <div class=\"cms-card\" style=\"margin-bottom:16px\">
      <div class=\"cms-card-header\" style=\"font-size:13px\">🎨 Logo</div>
      <div class=\"cms-card-body\" style=\"padding:12px 16px\">
        <p style=\"font-size:11px;color:#9ca3af;margin:0 0 8px\">Logo im Header der Website. Hintergrund wird automatisch entfernt.</p>
        <div style=\"display:flex;align-items:center;gap:16px;flex-wrap:wrap\">
          <div id=\"cms-logo-preview\" style=\"background:repeating-conic-gradient(#e5e7eb 0% 25%,#fff 0% 50%) 0 0/16px 16px;border:1px dashed #d1d5db;border-radius:8px;padding:12px;min-width:160px;min-height:50px;display:flex;align-items:center;justify-content:center\">
            <span style=\"color:#9ca3af;font-size:12px\">Kein Logo</span>
          </div>
          <div style=\"display:flex;flex-direction:column;gap:6px\">
            <label class=\"cms-btn cms-btn-primary cms-btn-sm\" style=\"cursor:pointer\">
              📷 Logo hochladen
              <input type=\"file\" id=\"cms-logo-file\" accept=\"image/png,image/jpeg,image/svg+xml,image/webp\" style=\"display:none\" data-action=\"logoUpload\">
            </label>
            <button class=\"cms-btn cms-btn-gray cms-btn-sm\" data-action=\"logoRemove\" style=\"font-size:11px\">✕ Logo entfernen</button>
          </div>
        </div>
      </div>
    </div>
    <div id=\"cms-hp-fields\" style=\"display:flex;flex-direction:column;gap:16px\"></div>
    <div class=\"cms-empty\" id=\"cms-hp-empty\" style=\"display:none\">Keine bearbeitbaren Felder gefunden.</div>
    <!-- Seiteninhalte (Unterseiten) -->
    <div style=\"margin-top:24px;border-top:2px solid #e5e7eb;padding-top:16px\">
      <h3 style=\"font-size:15px;font-weight:700;color:#1f2937;margin:0 0 8px\">📄 Seiteninhalte (Unterseiten)</h3>
      <p style=\"font-size:12px;color:#6b7280;margin:0 0 12px\">Texte der Unterseiten bearbeiten. Klicken Sie auf eine Seite, um den Inhalt zu öffnen.</p>
      <div id=\"cms-seiten-fields\" style=\"display:flex;flex-direction:column;gap:4px\"></div>
    </div>
  </div>
  <!-- Sortiment-Texte -->
  <div id=\"cms-panel-sort\" style=\"display:none\">
    <div class=\"cms-flex cms-between\" style=\"margin-bottom:12px\">
      <h3 style=\"font-size:15px;font-weight:700;color:#1f2937;margin:0;display:flex;align-items:center;gap:6px\">Sortiment-Seite <span onclick=\"cmsTab('help'); cmsSwitchHelpTopic('sort-help')\" title=\"Hilfe anzeigen\" style=\"cursor:pointer;font-size:11px;background:#e8f5e9;color:#16a34a;width:18px;height:18px;border-radius:50%;display:inline-flex;align-items:center;justify-content:center;font-weight:700\">?</span></h3>
      <button class=\"cms-btn cms-btn-gray\" id=\"sort-edit-toggle\" onclick=\"sortToggleEdit()\">✏️ Bearbeiten</button>
    </div>·
    <!-- === VIEW MODE (rendered HTML) === -->
    <div id=\"sort-view-mode\">
      <div class=\"cms-card\">
        <div class=\"cms-card-header\" style=\"background:#2d7a5e\">Einleitungstext</div>
        <div class=\"cms-card-body\" id=\"sort-view-intro\" style=\"font-size:14px;line-height:1.6\"></div>
      </div>
      <div class=\"cms-card\">
        <div class=\"cms-card-header\" style=\"background:#2d7a5e\">Highlights</div>
        <div class=\"cms-card-body\" id=\"sort-view-highlights\" style=\"font-size:14px;line-height:1.7\"></div>
      </div>
      <div class=\"cms-card\">
        <div class=\"cms-card-header\" style=\"background:#7d6608\">Hinweisbox</div>
        <div class=\"cms-card-body\" id=\"sort-view-eco\" style=\"font-size:14px;line-height:1.6;text-align:center;background:#fef9e7;color:#7d6608\"></div>
      </div>
    </div>·
    <!-- === EDIT MODE (hidden by default) === -->
    <style>
    .rte-wrap{border:1px solid #d1d5db;border-radius:8px;overflow:hidden;margin-bottom:12px}
    .rte-toolbar{display:flex;gap:2px;padding:4px 6px;background:#f3f4f6;border-bottom:1px solid #e5e7eb;flex-wrap:wrap}
    .rte-btn{background:none;border:1px solid transparent;border-radius:4px;padding:3px 7px;cursor:pointer;font-size:13px;color:#374151;line-height:1.2;transition:all .15s}
    .rte-btn:hover{background:#e5e7eb;border-color:#d1d5db}
    .rte-btn.active{background:#dbeafe;border-color:#93c5fd;color:#1d4ed8}
    .rte-editor{min-height:60px;padding:10px 12px;font-size:14px;line-height:1.6;outline:none;font-family:\"Segoe UI\",system-ui,-apple-system,sans-serif;color:#1f2937}
    .rte-editor:focus{box-shadow:inset 0 0 0 2px #93c5fd}
    .rte-editor p{margin:4px 0}
    .rte-editor a{color:#2563eb;text-decoration:underline}
    .rte-sep{width:1px;background:#d1d5db;margin:2px 4px;align-self:stretch}
    </style>
    <div id=\"sort-edit-mode\" style=\"display:none\">·
      <div class=\"cms-card\">
        <div class=\"cms-card-header\" style=\"background:#2d7a5e\">Einleitungstext</div>
        <div class=\"cms-card-body\">
          <div class=\"rte-wrap\">
            <div class=\"rte-toolbar\" data-rte=\"sort-rte-intro\">
              <button class=\"rte-btn\" onclick=\"sortRteCmd('sort-rte-intro','bold')\" title=\"Fett\"><b>F</b></button>
              <button class=\"rte-btn\" onclick=\"sortRteCmd('sort-rte-intro','italic')\" title=\"Kursiv\"><i>K</i></button>
              <span class=\"rte-sep\"></span>
              <button class=\"rte-btn\" onclick=\"sortRteLink('sort-rte-intro')\" title=\"Link einfügen\">🔗</button>
              <button class=\"rte-btn\" onclick=\"sortRteUnlink('sort-rte-intro')\" title=\"Link entfernen\">🚫</button>
            </div>
            <div class=\"rte-editor\" id=\"sort-rte-intro\" contenteditable=\"true\"></div>
          </div>
        </div>
      </div>·
      <div class=\"cms-card\">
        <div class=\"cms-card-header\" style=\"background:#2d7a5e\">Highlights</div>
        <div class=\"cms-card-body\">
          <div id=\"sort-rte-lines\"></div>
          <button class=\"cms-btn cms-btn-gray\" style=\"margin-top:8px\" onclick=\"sortAddLine()\">+ Zeile hinzufügen</button>
        </div>
      </div>·
      <div class=\"cms-card\">
        <div class=\"cms-card-header\" style=\"background:#7d6608\">Hinweisbox (gelbe Box)</div>
        <div class=\"cms-card-body\">
          <div class=\"rte-wrap\">
            <div class=\"rte-toolbar\" data-rte=\"sort-rte-eco\">
              <button class=\"rte-btn\" onclick=\"sortRteCmd('sort-rte-eco','bold')\" title=\"Fett\"><b>F</b></button>
              <button class=\"rte-btn\" onclick=\"sortRteCmd('sort-rte-eco','italic')\" title=\"Kursiv\"><i>K</i></button>
              <span class=\"rte-sep\"></span>
              <button class=\"rte-btn\" onclick=\"sortRteLink('sort-rte-eco')\" title=\"Link einfügen\">🔗</button>
            </div>
            <div class=\"rte-editor\" id=\"sort-rte-eco\" contenteditable=\"true\"></div>
          </div>
        </div>
      </div>·
      <div style=\"position:sticky;bottom:0;z-index:100;background:#fff;border-top:1px solid #e5e7eb;padding:10px 0;margin-top:14px;display:flex;flex-wrap:wrap;gap:8px;align-items:center\">
        <button class=\"cms-btn cms-btn-primary\" onclick=\"sortSave()\">💾 Speichern</button>
        <button class=\"cms-btn cms-btn-gray\" onclick=\"sortToggleEdit()\">Abbrechen</button>
        <span id=\"sort-cms-status\" style=\"font-size:12px;color:#6b7280;line-height:32px\"></span>
      </div>
    </div>
  </div>·
  <!-- Impressionen / Galerie -->
  <div id=\"cms-panel-gallery\" style=\"display:none\">
    <div class=\"cms-flex cms-between cms-mb\">
      <h3 style=\"font-size:15px;font-weight:700;color:#1f2937;margin:0\">Impressionen verwalten</h3>
      <div class=\"cms-flex\" style=\"gap:6px\">
        <button class=\"cms-btn cms-btn-gray\" onclick=\"loadGalleryAdmin()\" title=\"Neu laden\">↻ Aktualisieren</button>
      </div>
    </div>
    <!-- Folder Management -->
    <div class=\"cms-card\" style=\"margin-bottom:12px\">
      <div class=\"cms-card-header\">
        <svg width=\"16\" height=\"16\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><path d=\"M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z\"></path></svg>
        Kategorien / Ordner
      </div>
      <div class=\"cms-card-body\">
        <div style=\"display:flex;gap:8px;align-items:center;flex-wrap:wrap\">
          <input id=\"gal-folder-name\" class=\"cms-input\" placeholder=\"Neuer Ordnername...\" style=\"flex:1;min-width:180px\">
          <button class=\"cms-btn cms-btn-primary cms-btn-sm\" onclick=\"galCreateFolder()\">+ Ordner anlegen</button>
        </div>
        <div id=\"gal-folder-list\" style=\"margin-top:10px;display:flex;flex-wrap:wrap;gap:6px\"></div>
      </div>
    </div>
    <!-- Upload Area -->
    <div class=\"cms-card\" style=\"margin-bottom:16px\">
      <div class=\"cms-card-header\">
        <svg width=\"16\" height=\"16\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><path d=\"M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4\"></path><polyline points=\"17 8 12 3 7 8\"></polyline><line x1=\"12\" x2=\"12\" y1=\"3\" y2=\"15\"></line></svg>
        Bilder hochladen
      </div>
      <div class=\"cms-card-body\">
        <div style=\"display:flex;gap:12px;align-items:flex-end;flex-wrap:wrap\">
          <div style=\"flex:1;min-width:200px\">
            <label style=\"font-size:11px;font-weight:700;color:var(--c-m-muted);text-transform:uppercase;letter-spacing:.5px;display:block;margin-bottom:4px\">Kategorie</label>
            <select id=\"gal-upload-cat\" class=\"cms-input\" style=\"width:100%\">
              <option value=\"\">-- Kategorie wählen --</option>
            </select>
          </div>
          <div style=\"flex:1;min-width:200px\">
            <label style=\"font-size:11px;font-weight:700;color:var(--c-m-muted);text-transform:uppercase;letter-spacing:.5px;display:block;margin-bottom:4px\">Untertitel (optional)</label>
            <input id=\"gal-upload-desc\" class=\"cms-input\" placeholder=\"Wird unter dem Bild angezeigt...\" style=\"width:100%\">
          </div>
          <div style=\"flex:2;min-width:260px\">
            <label style=\"font-size:11px;font-weight:700;color:var(--c-m-muted);text-transform:uppercase;letter-spacing:.5px;display:block;margin-bottom:4px\">Bilder auswählen</label>
            <div style=\"display:flex;gap:8px;align-items:center\">
              <input type=\"file\" id=\"gal-upload-files\" accept=\"image/*\" multiple=\"\" class=\"cms-input\" style=\"flex:1\" onchange=\"galPreviewFiles(this)\">
              <button class=\"cms-btn cms-btn-primary\" id=\"gal-upload-btn\" onclick=\"galUpload()\">
                <svg width=\"14\" height=\"14\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><path d=\"M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4\"></path><polyline points=\"17 8 12 3 7 8\"></polyline><line x1=\"12\" x2=\"12\" y1=\"3\" y2=\"15\"></line></svg>
                Hochladen
              </button>
            </div>
          </div>
        </div>
        <div id=\"gal-upload-preview\" style=\"margin-top:10px;display:none\">
          <div style=\"font-size:11px;font-weight:700;color:var(--c-m-muted);text-transform:uppercase;letter-spacing:.5px;margin-bottom:6px\">Vorschau</div>
          <div id=\"gal-upload-thumbs\" style=\"display:flex;flex-wrap:wrap;gap:8px\"></div>
        </div>
        <div id=\"gal-upload-progress\" style=\"margin-top:10px;display:none\">
          <div style=\"background:#e5e7eb;border-radius:8px;height:6px;overflow:hidden\">
            <div id=\"gal-upload-bar\" style=\"background:var(--c-m-pri);height:100%;width:0%;transition:width .3s\"></div>
          </div>
          <div id=\"gal-upload-status\" style=\"font-size:12px;color:var(--c-m-muted);margin-top:4px\"></div>
        </div>
      </div>
    </div>
    <!-- Gallery Grid -->
    <div id=\"gal-admin-grid\"></div>
    <div class=\"cms-empty\" id=\"gal-admin-empty\" style=\"display:none\">Noch keine Impressionen in der Galerie.</div>
  </div>·
  <!-- Push-Benachrichtigungen -->
  <div id=\"cms-panel-push\" style=\"display:none\">
    <h3 style=\"font-size:15px;font-weight:700;color:#1f2937;margin:0 0 12px;display:flex;align-items:center;gap:6px\">🔔 Push-Benachrichtigungen <span onclick=\"cmsTab('help'); cmsSwitchHelpTopic('push-help')\" title=\"Hilfe anzeigen\" style=\"cursor:pointer;font-size:11px;background:#e8f5e9;color:#16a34a;width:18px;height:18px;border-radius:50%;display:inline-flex;align-items:center;justify-content:center;font-weight:700\">?</span></h3>
    <p style=\"font-size:13px;color:#6b7280;margin:0 0 16px\">Senden Sie Push-Nachrichten an alle Nutzer, die Benachrichtigungen aktiviert haben.</p>·
    <div class=\"cms-card\" style=\"margin-bottom:16px\">
      <div class=\"cms-card-header\" style=\"background:#7c3aed\">Schnell-Vorlagen</div>
      <div class=\"cms-card-body\" style=\"display:flex;flex-wrap:wrap;gap:8px\">
        <button class=\"cms-btn\" onclick=\"pushTemplate('mittagstisch')\" style=\"background:#f0fdf4;color:#2d5016;border:1px solid #bbf7d0;font-size:13px\">🍽 Mittagstisch</button>
        <button class=\"cms-btn\" onclick=\"pushTemplate('angebote')\" style=\"background:#fef3c7;color:#92400e;border:1px solid #fde68a;font-size:13px\">🎁 Neue Angebote</button>
        <button class=\"cms-btn\" onclick=\"pushTemplate('news')\" style=\"background:#eff6ff;color:#1e40af;border:1px solid #bfdbfe;font-size:13px\">📰 Neuigkeit</button>
      </div>
    </div>·
    <div class=\"cms-card\" style=\"margin-bottom:16px\">
      <div class=\"cms-card-header\">Nachricht verfassen</div>
      <div class=\"cms-card-body\">
        <div style=\"margin-bottom:10px\">
          <label style=\"font-size:12px;font-weight:600;color:#374151;display:block;margin-bottom:4px\">Titel</label>
          <input type=\"text\" id=\"push-title\" class=\"cms-input\" value=\"Dorfladen Oberornau\" style=\"width:100%\">
        </div>
        <div style=\"margin-bottom:10px\">
          <label style=\"font-size:12px;font-weight:600;color:#374151;display:block;margin-bottom:4px\">Nachricht</label>
          <textarea id=\"push-message\" class=\"cms-input\" rows=\"3\" style=\"width:100%;resize:vertical\" placeholder=\"z.B. Heute: Schweinebraten mit Knödel und Salat!\"></textarea>
        </div>
        <div style=\"margin-bottom:10px\">
          <label style=\"font-size:12px;font-weight:600;color:#374151;display:block;margin-bottom:4px\">Bild (optional, wird auf Android/Chrome angezeigt)</label>
          <div style=\"display:flex;gap:8px;align-items:center\">
            <label class=\"cms-btn cms-btn-gray\" style=\"cursor:pointer;font-size:12px;padding:6px 12px\">
              📷 Bild wählen
              <input type=\"file\" id=\"push-image-file\" accept=\"image/*\" style=\"display:none\" onchange=\"pushImagePreview(this)\">
            </label>
            <span id=\"push-image-name\" style=\"font-size:12px;color:#6b7280\">Kein Bild</span>
            <button id=\"push-image-remove\" style=\"display:none;background:none;border:none;color:#dc2626;cursor:pointer;font-size:14px\" onclick=\"pushImageRemove()\">×</button>
          </div>
          <div id=\"push-image-preview\" style=\"display:none;margin-top:8px\">
            <img id=\"push-image-thumb\" style=\"max-width:200px;max-height:120px;border-radius:6px;border:1px solid #e5e7eb\">
          </div>
          <input type=\"hidden\" id=\"push-image-url\" value=\"\">
        </div>
        <div style=\"margin-bottom:10px\">
          <label style=\"font-size:12px;font-weight:600;color:#374151;display:block;margin-bottom:4px\">Kategorie (nur Nutzer mit dieser Auswahl erhalten die Nachricht)</label>
          <select id=\"push-category\" class=\"cms-input\" style=\"width:100%\">
            <option value=\"\">Alle Abonnenten</option>
            <option value=\"mittagstisch\">🍽 Mittagstisch</option>
            <option value=\"angebote\">🎁 Angebote</option>
            <option value=\"news\">📰 News / Aktuelles</option>
          </select>
        </div>
        <div style=\"margin-bottom:10px\">
          <label style=\"font-size:12px;font-weight:600;color:#374151;display:block;margin-bottom:4px\">Link (optional)</label>
          <select id=\"push-url\" class=\"cms-input\" style=\"width:100%\">
            <option value=\"/\">Startseite</option>
            <option value=\"/essen-im-dorfladen\">Mittagstisch</option>
            <option value=\"/aktuelles\">Aktuelles</option>
            <option value=\"/sortiment\">Sortiment</option>
            <option value=\"/roter-punkt\">Roter Punkt</option>
          </select>
        </div>
        <div style=\"display:flex;gap:8px;align-items:center;flex-wrap:wrap\">
          <button class=\"cms-btn cms-btn-primary\" id=\"push-send-btn\" onclick=\"pushSendNow()\" style=\"background:#7c3aed\">🔔 Sofort senden</button>
          <button class=\"cms-btn\" id=\"push-queue-btn\" onclick=\"pushAddToQueue()\" style=\"background:#f3f4f6;color:#374151;border:1px solid #d1d5db\">📋 Zur Warteschlange</button>
          <span id=\"push-status\" style=\"font-size:13px;color:#6b7280\"></span>
        </div>
      </div>
    </div>·
    <div class=\"cms-card\" id=\"push-queue-card\" style=\"margin-bottom:16px;display:none\">
      <div class=\"cms-card-header\" style=\"background:#4f46e5\">📋 Warteschlange <span id=\"push-queue-count\" style=\"background:rgba(255,255,255,.25);padding:1px 8px;border-radius:10px;font-size:12px;margin-left:6px\">0</span></div>
      <div class=\"cms-card-body\">
        <div id=\"push-queue-list\" style=\"margin-bottom:12px\"></div>
        <div id=\"push-queue-preview\" style=\"display:none;background:#f9fafb;border:1px solid #e5e7eb;border-radius:8px;padding:12px;margin-bottom:12px\">
          <div style=\"font-size:11px;font-weight:600;color:#6b7280;margin-bottom:6px\">VORSCHAU: Kombinierte Nachricht</div>
          <div style=\"font-weight:700;font-size:14px;color:#1f2937\" id=\"push-queue-preview-title\"></div>
          <div style=\"font-size:13px;color:#374151;white-space:pre-line;margin-top:4px\" id=\"push-queue-preview-body\"></div>
        </div>
        <div style=\"display:flex;gap:8px;align-items:center;flex-wrap:wrap\">
          <button class=\"cms-btn cms-btn-primary\" onclick=\"pushSendQueue()\" style=\"background:#4f46e5\">🔔 Alle gesammelt senden</button>
          <button class=\"cms-btn\" onclick=\"pushClearQueue()\" style=\"background:#fee2e2;color:#dc2626;border:1px solid #fecaca;font-size:12px\">🗑 Leeren</button>
          <span id=\"push-queue-status\" style=\"font-size:13px;color:#6b7280\"></span>
        </div>
      </div>
    </div>·
    <div class=\"cms-card\" style=\"margin-bottom:16px\">
      <div class=\"cms-card-header\" style=\"background:#059669\">👥 Subscriber <span id=\"push-sub-count\" style=\"background:rgba(255,255,255,.25);padding:1px 8px;border-radius:10px;font-size:12px;margin-left:6px\">-</span></div>
      <div class=\"cms-card-body\">
        <div style=\"display:flex;gap:8px;margin-bottom:12px\">
          <button class=\"cms-btn\" onclick=\"pushLoadSubscribers()\" style=\"background:#f0fdf4;color:#059669;border:1px solid #bbf7d0;font-size:12px\">🔄 Aktualisieren</button>
        </div>
        <div id=\"push-sub-list\" style=\"font-size:13px;color:#6b7280\">Klicke „Aktualisieren“ um Subscriber zu laden.</div>
      </div>
    </div>·
    <div class=\"cms-card\">
      <div class=\"cms-card-header\">📊 Info</div>
      <div class=\"cms-card-body\">
        <p style=\"font-size:12px;color:#6b7280;margin:0\">Push-Benachrichtigungen werden an alle Nutzer gesendet, die auf der Dorfladen-Webseite oder in der App „Benachrichtigungen aktivieren“ geklickt haben. Abgelaufene Abonnements werden automatisch entfernt.</p>
      </div>
    </div>
  </div>·
  <!-- Settings / Feature-Flags -->
  <div id=\"cms-panel-settings\" style=\"display:none\">
    <h3 style=\"font-size:15px;font-weight:700;color:#1f2937;margin:0 0 6px\">⚙ Feature-Einstellungen</h3>
    <p style=\"font-size:13px;color:#6b7280;margin:0 0 18px\">Funktionen für alle Besucher der Website ein- oder ausschalten. Änderungen werden sofort wirksam.</p>·
    <div id=\"settings-status\" style=\"display:none;padding:10px 14px;border-radius:8px;font-size:.85rem;margin-bottom:14px\"></div>·
    <div class=\"cms-card\">
      <div class=\"cms-card-header\" style=\"background:#6366f1!important\">⚙ Features</div>
      <div class=\"cms-card-body\" style=\"display:flex;flex-direction:column;gap:0\">·
        <div style=\"display:flex;align-items:center;justify-content:space-between;padding:14px 0;border-bottom:1px solid #f3f4f6\">
          <div>
            <div style=\"font-weight:700;font-size:.9rem;color:#1f2937\">🔔 Push-Benachrichtigungen</div>
            <div style=\"font-size:.78rem;color:#6b7280;margin-top:2px\">Zeigt den „Benachrichtigungen aktivieren“-Button im Menü an</div>
          </div>
          <label style=\"position:relative;display:inline-block;width:48px;height:26px;flex-shrink:0\">
            <input type=\"checkbox\" id=\"feat-push\" checked=\"\" style=\"opacity:0;width:0;height:0\">
            <span style=\"position:absolute;cursor:pointer;inset:0;background:#cbd5e1;border-radius:26px;transition:.25s\" class=\"feat-slider\"></span>
          </label>
        </div>·
        <div style=\"display:flex;align-items:center;justify-content:space-between;padding:14px 0;border-bottom:1px solid #f3f4f6\">
          <div>
            <div style=\"font-weight:700;font-size:.9rem;color:#1f2937\">📷 Barcode-Scanner</div>
            <div style=\"font-size:.78rem;color:#6b7280;margin-top:2px\">Zeigt den Barcode-Scan-Button in Preisliste &amp; Sortiment an</div>
          </div>
          <label style=\"position:relative;display:inline-block;width:48px;height:26px;flex-shrink:0\">
            <input type=\"checkbox\" id=\"feat-scanner\" checked=\"\" style=\"opacity:0;width:0;height:0\">
            <span style=\"position:absolute;cursor:pointer;inset:0;background:#cbd5e1;border-radius:26px;transition:.25s\" class=\"feat-slider\"></span>
          </label>
        </div>·
        <div style=\"display:flex;align-items:center;justify-content:space-between;padding:14px 0;border-bottom:1px solid #f3f4f6\">
          <div>
            <div style=\"font-weight:700;font-size:.9rem;color:#1f2937\">📦 Bestellungen</div>
            <div style=\"font-size:.78rem;color:#6b7280;margin-top:2px\">Zeigt den Menüpunkt „Bestellungen“ und die Shop-Admin-Bestelloberfläche an</div>
          </div>
          <label style=\"position:relative;display:inline-block;width:48px;height:26px;flex-shrink:0\">
            <input type=\"checkbox\" id=\"feat-orders\" style=\"opacity:0;width:0;height:0\">
            <span style=\"position:absolute;cursor:pointer;inset:0;background:#cbd5e1;border-radius:26px;transition:.25s\" class=\"feat-slider\"></span>
          </label>
        </div>·
        <div style=\"display:flex;align-items:center;justify-content:space-between;padding:14px 0;border-bottom:1px solid #f3f4f6\">
          <div>
            <div style=\"font-weight:700;font-size:.9rem;color:#1f2937\">🍽 Mittagstisch bestellen</div>
            <div style=\"font-size:.78rem;color:#6b7280;margin-top:2px\">Zeigt „Jetzt bestellen“-Buttons im Wochenplan und ermöglicht Online-Bestellung des Mittagessens</div>
          </div>
          <label style=\"position:relative;display:inline-block;width:48px;height:26px;flex-shrink:0\">
            <input type=\"checkbox\" id=\"feat-mittagstisch\" style=\"opacity:0;width:0;height:0\">
            <span style=\"position:absolute;cursor:pointer;inset:0;background:#cbd5e1;border-radius:26px;transition:.25s\" class=\"feat-slider\"></span>
          </label>
        </div>·
        <div style=\"display:flex;align-items:center;justify-content:space-between;padding:14px 0;border-bottom:1px solid #f3f4f6\">
          <div>
            <div style=\"font-weight:700;font-size:.9rem;color:#1f2937\">🖼️ Bilder im Wochenplan</div>
            <div style=\"font-size:.78rem;color:#6b7280;margin-top:2px\">Zeigt Produktbilder neben den Gerichten in der Wochenplan-Übersicht an</div>
          </div>
          <label style=\"position:relative;display:inline-block;width:48px;height:26px;flex-shrink:0\">
            <input type=\"checkbox\" id=\"feat-wp-images\" style=\"opacity:0;width:0;height:0\">
            <span style=\"position:absolute;cursor:pointer;inset:0;background:#cbd5e1;border-radius:26px;transition:.25s\" class=\"feat-slider\"></span>
          </label>
        </div>·
        <div style=\"display:flex;align-items:center;justify-content:space-between;padding:14px 0;border-bottom:1px solid #f3f4f6\">
          <div>
            <div style=\"font-weight:700;font-size:.9rem;color:#1f2937\">🖼️ Bilder im Social-Post</div>
            <div style=\"font-size:.78rem;color:#6b7280;margin-top:2px\">Zeigt Produktbilder im generierten Social-Media-Poster an (falls vorhanden)</div>
          </div>
          <label style=\"position:relative;display:inline-block;width:48px;height:26px;flex-shrink:0\">
            <input type=\"checkbox\" id=\"feat-post-images\" checked=\"\" style=\"opacity:0;width:0;height:0\">
            <span style=\"position:absolute;cursor:pointer;inset:0;background:#cbd5e1;border-radius:26px;transition:.25s\" class=\"feat-slider\"></span>
          </label>
        </div>·
        <div style=\"display:flex;align-items:center;justify-content:space-between;padding:14px 0\">
          <div>
            <div style=\"font-weight:700;font-size:.9rem;color:#1f2937\">📰 TagesInfo immer anzeigen</div>
            <div style=\"font-size:.78rem;color:#6b7280;margin-top:2px\">TagesInfo wird auch nach Ladenschluss angezeigt (zum Testen). Normalerweise 30 Min vor Schluss ausgeblendet.</div>
          </div>
          <label style=\"position:relative;display:inline-block;width:48px;height:26px;flex-shrink:0\">
            <input type=\"checkbox\" id=\"feat-tagesinfo-immer\" style=\"opacity:0;width:0;height:0\">
            <span style=\"position:absolute;cursor:pointer;inset:0;background:#cbd5e1;border-radius:26px;transition:.25s\" class=\"feat-slider\"></span>
          </label>
        </div>·
      </div>
    </div>·
    <div style=\"margin-top:14px;display:flex;gap:8px\">
      <button class=\"cms-btn cms-btn-primary\" id=\"settings-save\" data-action=\"settingsSave\">💾 Speichern</button>
      <span id=\"settings-saved-hint\" style=\"display:none;font-size:.82rem;color:#16a34a;font-weight:600;align-self:center\">✅ Gespeichert!</span>
    </div>·
    <!-- Kontaktdaten / Laden-Stammdaten -->
    <div class=\"cms-card\" style=\"margin-top:18px\">
      <div class=\"cms-card-header\" style=\"background:#059669!important\">🏪 Kontaktdaten &amp; Laden-Info</div>
      <div class=\"cms-card-body\" style=\"display:flex;flex-direction:column;gap:10px\">
        <p style=\"font-size:12px;color:#6b7280;margin:0\">Diese Daten werden in E-Mails, im Footer und auf der Website verwendet.</p>·
        <div style=\"display:grid;grid-template-columns:1fr 1fr;gap:10px\">
          <div>
            <label style=\"font-size:11px;font-weight:700;color:#374151;display:block;margin-bottom:2px\">Laden-Name</label>
            <input type=\"text\" id=\"kontakt-name\" class=\"cms-input\" placeholder=\"Dorfladen Oberornau\">
          </div>
          <div>
            <label style=\"font-size:11px;font-weight:700;color:#374151;display:block;margin-bottom:2px\">Slogan</label>
            <input type=\"text\" id=\"kontakt-slogan\" class=\"cms-input\" placeholder=\"Ihr Nahversorger\">
          </div>
        </div>·
        <div>
          <label style=\"font-size:11px;font-weight:700;color:#374151;display:block;margin-bottom:2px\">Adresse</label>
          <input type=\"text\" id=\"kontakt-adresse\" class=\"cms-input\" placeholder=\"Dorfplatz 1 · 84419 Obertaufkirchen\">
        </div>·
        <div style=\"display:grid;grid-template-columns:1fr 1fr;gap:10px\">
          <div>
            <label style=\"font-size:11px;font-weight:700;color:#374151;display:block;margin-bottom:2px\">Telefon (Anzeige)</label>
            <input type=\"text\" id=\"kontakt-telefon\" class=\"cms-input\" placeholder=\"08082 / 622 99 91\">
          </div>
          <div>
            <label style=\"font-size:11px;font-weight:700;color:#374151;display:block;margin-bottom:2px\">Telefon (Link)</label>
            <input type=\"text\" id=\"kontakt-telefon-link\" class=\"cms-input\" placeholder=\"+4980826229991\">
          </div>
        </div>·
        <div style=\"display:grid;grid-template-columns:1fr 1fr;gap:10px\">
          <div>
            <label style=\"font-size:11px;font-weight:700;color:#374151;display:block;margin-bottom:2px\">E-Mail (Kontakt)</label>
            <input type=\"text\" id=\"kontakt-email\" class=\"cms-input\" placeholder=\"bestellung@dorfladen-oberornau.de\">
          </div>
          <div>
            <label style=\"font-size:11px;font-weight:700;color:#374151;display:block;margin-bottom:2px\">E-Mail (Reply-To)</label>
            <input type=\"text\" id=\"kontakt-reply-to\" class=\"cms-input\" placeholder=\"bestellung@dorfladen-oberornau.de\">
          </div>
        </div>·
        <div style=\"display:grid;grid-template-columns:1fr 1fr;gap:10px\">
          <div>
            <label style=\"font-size:11px;font-weight:700;color:#374151;display:block;margin-bottom:2px\">Website</label>
            <input type=\"text\" id=\"kontakt-website\" class=\"cms-input\" placeholder=\"www.dorfladen-oberornau.de\">
          </div>
          <div>
            <label style=\"font-size:11px;font-weight:700;color:#374151;display:block;margin-bottom:2px\">Website URL</label>
            <input type=\"text\" id=\"kontakt-website-url\" class=\"cms-input\" placeholder=\"https://www.dorfladen-oberornau.de\">
          </div>
        </div>·
        <div style=\"display:grid;grid-template-columns:1fr 1fr;gap:10px\">
          <div>
            <label style=\"font-size:11px;font-weight:700;color:#374151;display:block;margin-bottom:2px\">Shop URL</label>
            <input type=\"text\" id=\"kontakt-shop-url\" class=\"cms-input\" placeholder=\"https://www.dorfladen-oberornau.de/shop.html\">
          </div>
          <div>
            <label style=\"font-size:11px;font-weight:700;color:#374151;display:block;margin-bottom:2px\">Logo URL</label>
            <input type=\"text\" id=\"kontakt-logo-url\" class=\"cms-input\" placeholder=\"https://www.dorfladen-oberornau.de/images/dorfladen-logo.png\">
          </div>
        </div>·
        <div>
          <label style=\"font-size:11px;font-weight:700;color:#374151;display:block;margin-bottom:2px\">M365 Postfach (Absender)</label>
          <input type=\"text\" id=\"kontakt-mailbox\" class=\"cms-input\" placeholder=\"info@dorfladenoberornau.onmicrosoft.com\">
        </div>·
        <div style=\"display:flex;gap:8px;margin-top:4px\">
          <button class=\"cms-btn cms-btn-primary\" data-action=\"kontaktSave\">💾 Kontaktdaten speichern</button>
          <span id=\"kontakt-saved-hint\" style=\"display:none;font-size:.82rem;color:#16a34a;font-weight:600;align-self:center\">✅ Gespeichert!</span>
        </div>
      </div>
    </div>
  </div>·
  <!-- Statistik / Analytics -->
  <div id=\"cms-panel-stats\" style=\"display:none\">
    <div class=\"cms-flex cms-between cms-mb\">
      <h3 style=\"font-size:15px;font-weight:700;color:#1f2937;margin:0\">📊 Website-Statistik</h3>
      <div class=\"cms-flex\" style=\"gap:6px\">
        <select id=\"stats-period\" class=\"cms-input\" style=\"width:auto;padding:6px 10px;font-size:12px\" onchange=\"statsLoad()\">
          <option value=\"7\">Letzte 7 Tage</option>
          <option value=\"30\" selected=\"\">Letzte 30 Tage</option>
          <option value=\"90\">Letzte 90 Tage</option>
        </select>
        <button class=\"cms-btn cms-btn-gray\" onclick=\"statsLoad()\">↻ Aktualisieren</button>
      </div>
    </div>·
    <!-- KPI Cards -->
    <div style=\"display:grid;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));gap:12px;margin-bottom:16px\">
      <div class=\"cms-card\" style=\"margin-bottom:0\">
        <div class=\"cms-card-body\" style=\"text-align:center;padding:16px\">
          <div style=\"font-size:11px;font-weight:700;color:#6b7280;text-transform:uppercase;letter-spacing:.5px\">Heute</div>
          <div id=\"stats-today-views\" style=\"font-size:28px;font-weight:800;color:#0ea5e9;margin:4px 0\">-</div>
          <div style=\"font-size:11px;color:#9ca3af\">Seitenaufrufe</div>
        </div>
      </div>
      <div class=\"cms-card\" style=\"margin-bottom:0\">
        <div class=\"cms-card-body\" style=\"text-align:center;padding:16px\">
          <div style=\"font-size:11px;font-weight:700;color:#6b7280;text-transform:uppercase;letter-spacing:.5px\">Heute</div>
          <div id=\"stats-today-visitors\" style=\"font-size:28px;font-weight:800;color:#10b981;margin:4px 0\">-</div>
          <div style=\"font-size:11px;color:#9ca3af\">Besucher</div>
        </div>
      </div>
      <div class=\"cms-card\" style=\"margin-bottom:0\">
        <div class=\"cms-card-body\" style=\"text-align:center;padding:16px\">
          <div style=\"font-size:11px;font-weight:700;color:#6b7280;text-transform:uppercase;letter-spacing:.5px\">Zeitraum</div>
          <div id=\"stats-total-views\" style=\"font-size:28px;font-weight:800;color:#6366f1;margin:4px 0\">-</div>
          <div style=\"font-size:11px;color:#9ca3af\">Seitenaufrufe</div>
        </div>
      </div>
      <div class=\"cms-card\" style=\"margin-bottom:0\">
        <div class=\"cms-card-body\" style=\"text-align:center;padding:16px\">
          <div style=\"font-size:11px;font-weight:700;color:#6b7280;text-transform:uppercase;letter-spacing:.5px\">Zeitraum</div>
          <div id=\"stats-total-visitors\" style=\"font-size:28px;font-weight:800;color:#f59e0b;margin:4px 0\">-</div>
          <div style=\"font-size:11px;color:#9ca3af\">Unique Besucher</div>
        </div>
      </div>
    </div>·
    <!-- Timeline Chart -->
    <div class=\"cms-card\">
      <div class=\"cms-card-header\" style=\"background:#0ea5e9!important\">📈 Verlauf</div>
      <div class=\"cms-card-body\" style=\"padding:12px\">
        <canvas id=\"stats-chart\" style=\"width:100%;height:220px\"></canvas>
      </div>
    </div>·
    <!-- Hourly + Devices row -->
    <div style=\"display:grid;grid-template-columns:1fr 1fr;gap:12px\">
      <div class=\"cms-card\">
        <div class=\"cms-card-header\" style=\"background:#6366f1!important\">🕔 Uhrzeiten</div>
        <div class=\"cms-card-body\" style=\"padding:12px\">
          <canvas id=\"stats-hourly-chart\" style=\"width:100%;height:160px\"></canvas>
        </div>
      </div>
      <div class=\"cms-card\">
        <div class=\"cms-card-header\" style=\"background:#f59e0b!important\">📱 Geräte</div>
        <div class=\"cms-card-body\" style=\"padding:12px\">
          <canvas id=\"stats-device-chart\" style=\"width:100%;height:160px\"></canvas>
        </div>
      </div>
    </div>·
    <!-- Top Pages + Referrers -->
    <div style=\"display:grid;grid-template-columns:1fr 1fr;gap:12px\">
      <div class=\"cms-card\">
        <div class=\"cms-card-header\" style=\"background:#10b981!important\">📄 Top Seiten</div>
        <div class=\"cms-card-body\" id=\"stats-top-pages\" style=\"padding:0\">
          <div class=\"cms-empty\">Lade...</div>
        </div>
      </div>
      <div class=\"cms-card\">
        <div class=\"cms-card-header\" style=\"background:#8b5cf6!important\">🔗 Herkunft</div>
        <div class=\"cms-card-body\" id=\"stats-referrers\" style=\"padding:0\">
          <div class=\"cms-empty\">Lade...</div>
        </div>
      </div>
      <div class=\"cms-card\" style=\"grid-column:1/-1\">
        <div class=\"cms-card-header\" style=\"background:#e53e3e!important\">📍 Standorte</div>
        <div class=\"cms-card-body\" id=\"stats-locations\" style=\"padding:0 0 8px\">
          <div class=\"cms-empty\">Lade...</div>
        </div>
      </div>
    </div>·
    <div id=\"stats-loading\" style=\"text-align:center;padding:40px;display:none\">
      <div style=\"display:inline-block;width:24px;height:24px;border:3px solid #e5e7eb;border-top-color:#0ea5e9;border-radius:50%;animation:cms-spin .6s linear infinite\"></div>
      <div style=\"font-size:13px;color:#6b7280;margin-top:8px\">Statistik wird geladen...</div>
    </div>
  </div>·
  <!-- Design-Einstellungen mit Sub-Tabs -->
  <div id=\"cms-panel-cfg\" style=\"display:none\">
    <div class=\"cms-flex cms-between\" style=\"margin-bottom:12px\">
      <h3 style=\"font-size:15px;font-weight:700;color:#1f2937;margin:0;display:flex;align-items:center;gap:6px\">⚙ Design-Einstellungen <span onclick=\"cmsTab('help'); cmsSwitchHelpTopic('editor-help')\" title=\"Hilfe anzeigen\" style=\"cursor:pointer;font-size:11px;background:#e8f5e9;color:#16a34a;width:18px;height:18px;border-radius:50%;display:inline-flex;align-items:center;justify-content:center;font-weight:700\">?</span></h3>
      <label class=\"cms-switch\" title=\"Kompaktere Darstellung im Design-Tab\">
        <input type=\"checkbox\" id=\"cfg-compactMode\" data-action=\"toggleCfgCompact\"> Kompaktmodus
      </label>
    </div>
    <!-- Sub-Tab Navigation -->
    <div style=\"display:flex;gap:0;border-bottom:2px solid #e5e7eb;margin-bottom:16px\">
      <button class=\"cms-subtab active\" data-action=\"cfgSubTab\" data-id=\"cfg-hp\" style=\"padding:8px 18px;font-size:13px;font-weight:600;border:none;background:none;cursor:pointer;border-bottom:2px solid #5ea88a;margin-bottom:-2px;color:#5ea88a\">🏠 Homepage</button>
      <button class=\"cms-subtab\" data-action=\"cfgSubTab\" data-id=\"cfg-wp\" style=\"padding:8px 18px;font-size:13px;font-weight:600;border:none;background:none;cursor:pointer;border-bottom:2px solid transparent;margin-bottom:-2px;color:#6b7280\">🍽 Wochenplan</button>
      <button class=\"cms-subtab\" data-action=\"cfgSubTab\" data-id=\"cfg-plakat\" style=\"padding:8px 18px;font-size:13px;font-weight:600;border:none;background:none;cursor:pointer;border-bottom:2px solid transparent;margin-bottom:-2px;color:#6b7280\">🖼 Plakate &amp; Flyer</button>
      <button class=\"cms-subtab\" data-action=\"cfgSubTab\" data-id=\"cfg-hpang\" style=\"padding:8px 18px;font-size:13px;font-weight:600;border:none;background:none;cursor:pointer;border-bottom:2px solid transparent;margin-bottom:-2px;color:#6b7280\">🏷 HP-Sonderangebote</button>
    </div>
    <!-- ============ SUB-TAB: Homepage ============ -->
    <div id=\"cms-cfg-hp\">
      <p style=\"font-size:12px;color:#6b7280;margin:0 0 14px\">Farben, Schriften und Sichtbarkeit der Startseite. Werden lokal gespeichert und beim nächsten Besuch angewendet.</p>
      <div class=\"cms-cfg-grid\">
        <div>
          <div class=\"cms-card\">
            <div class=\"cms-card-header\">🎨 Farben</div>
            <div class=\"cms-card-body\" style=\"display:flex;flex-direction:column;gap:8px\">
              <div class=\"hcfg-grad-row\" data-key=\"priColor\">
                <div style=\"display:flex;align-items:center;gap:6px\">
                  <span style=\"font-size:12px;font-weight:600;color:#374151;flex:1\">Primärfarbe (Grün)</span>
                  <label style=\"font-size:10px;color:#6b7280;cursor:pointer;white-space:nowrap\"><input type=\"checkbox\" class=\"hcfg-grad-toggle\" data-key=\"priColor\" style=\"margin-right:2px\">Verlauf</label>
                </div>
                <div style=\"display:flex;gap:4px;align-items:center\">
                  <input type=\"color\" id=\"hcfg-priColor\" value=\"#5ea88a\" style=\"flex:1;height:30px;border:1px solid #d1d5db;border-radius:6px;cursor:pointer\">
                  <input type=\"color\" id=\"hcfg-priColor2\" value=\"#4a8e73\" style=\"flex:1;height:30px;border:1px solid #d1d5db;border-radius:6px;cursor:pointer;display:none\" class=\"hcfg-grad-c2\">
                </div>
                <div class=\"hcfg-grad-opts\" style=\"display:none;margin-top:4px;padding:6px;background:#f3f4f6;border-radius:6px\">
                  <div style=\"display:flex;gap:6px;align-items:center;flex-wrap:wrap\">
                    <span style=\"font-size:10px;color:#6b7280\">Richtung:</span>
                    <select id=\"hcfg-priColorDir\" class=\"cms-input\" style=\"font-size:10px;padding:2px 4px;width:auto;min-width:0\">
                      <option value=\"to bottom\">↓ nach unten</option>
                      <option value=\"to right\">→ nach rechts</option>
                      <option value=\"to bottom right\">↘ diagonal</option>
                      <option value=\"135deg\">↘ 135°</option>
                    </select>
                    <span style=\"font-size:10px;color:#6b7280\">Mitte: <span id=\"hcfg-priColorPct-val\">50</span>%</span>
                    <input type=\"range\" id=\"hcfg-priColorPct\" min=\"10\" max=\"90\" value=\"50\" style=\"width:60px\" oninput=\"document.getElementById('hcfg-priColorPct-val').textContent=this.value\">
                  </div>
                  <div class=\"hcfg-grad-preview\" id=\"hcfg-priColor-preview\" style=\"height:18px;border-radius:4px;margin-top:4px;border:1px solid #d1d5db\"></div>
                </div>
              </div>
              <div class=\"hcfg-grad-row\" data-key=\"priHover\">
                <div style=\"display:flex;align-items:center;gap:6px\">
                  <span style=\"font-size:12px;font-weight:600;color:#374151;flex:1\">Primärfarbe Hover</span>
                  <label style=\"font-size:10px;color:#6b7280;cursor:pointer;white-space:nowrap\"><input type=\"checkbox\" class=\"hcfg-grad-toggle\" data-key=\"priHover\" style=\"margin-right:2px\">Verlauf</label>
                </div>
                <div style=\"display:flex;gap:4px;align-items:center\">
                  <input type=\"color\" id=\"hcfg-priHover\" value=\"#4a8e73\" style=\"flex:1;height:30px;border:1px solid #d1d5db;border-radius:6px;cursor:pointer\">
                  <input type=\"color\" id=\"hcfg-priHover2\" value=\"#3a7e63\" style=\"flex:1;height:30px;border:1px solid #d1d5db;border-radius:6px;cursor:pointer;display:none\" class=\"hcfg-grad-c2\">
                </div>
                <div class=\"hcfg-grad-opts\" style=\"display:none;margin-top:4px;padding:6px;background:#f3f4f6;border-radius:6px\">
                  <div style=\"display:flex;gap:6px;align-items:center;flex-wrap:wrap\">
                    <span style=\"font-size:10px;color:#6b7280\">Richtung:</span>
                    <select id=\"hcfg-priHoverDir\" class=\"cms-input\" style=\"font-size:10px;padding:2px 4px;width:auto;min-width:0\">
                      <option value=\"to bottom\">↓ nach unten</option>
                      <option value=\"to right\">→ nach rechts</option>
                      <option value=\"to bottom right\">↘ diagonal</option>
                      <option value=\"135deg\">↘ 135°</option>
                    </select>
                    <span style=\"font-size:10px;color:#6b7280\">Mitte: <span id=\"hcfg-priHoverPct-val\">50</span>%</span>
                    <input type=\"range\" id=\"hcfg-priHoverPct\" min=\"10\" max=\"90\" value=\"50\" style=\"width:60px\" oninput=\"document.getElementById('hcfg-priHoverPct-val').textContent=this.value\">
                  </div>
                  <div class=\"hcfg-grad-preview\" id=\"hcfg-priHover-preview\" style=\"height:18px;border-radius:4px;margin-top:4px;border:1px solid #d1d5db\"></div>
                </div>
              </div>
              <div class=\"hcfg-grad-row\" data-key=\"accColor\">
                <div style=\"display:flex;align-items:center;gap:6px\">
                  <span style=\"font-size:12px;font-weight:600;color:#374151;flex:1\">Akzentfarbe (Rot)</span>
                  <label style=\"font-size:10px;color:#6b7280;cursor:pointer;white-space:nowrap\"><input type=\"checkbox\" class=\"hcfg-grad-toggle\" data-key=\"accColor\" style=\"margin-right:2px\">Verlauf</label>
                </div>
                <div style=\"display:flex;gap:4px;align-items:center\">
                  <input type=\"color\" id=\"hcfg-accColor\" value=\"#d32f2f\" style=\"flex:1;height:30px;border:1px solid #d1d5db;border-radius:6px;cursor:pointer\">
                  <input type=\"color\" id=\"hcfg-accColor2\" value=\"#b71c1c\" style=\"flex:1;height:30px;border:1px solid #d1d5db;border-radius:6px;cursor:pointer;display:none\" class=\"hcfg-grad-c2\">
                </div>
                <div class=\"hcfg-grad-opts\" style=\"display:none;margin-top:4px;padding:6px;background:#f3f4f6;border-radius:6px\">
                  <div style=\"display:flex;gap:6px;align-items:center;flex-wrap:wrap\">
                    <span style=\"font-size:10px;color:#6b7280\">Richtung:</span>
                    <select id=\"hcfg-accColorDir\" class=\"cms-input\" style=\"font-size:10px;padding:2px 4px;width:auto;min-width:0\">
                      <option value=\"to bottom\">↓ nach unten</option>
                      <option value=\"to right\">→ nach rechts</option>
                      <option value=\"to bottom right\">↘ diagonal</option>
                      <option value=\"135deg\">↘ 135°</option>
                    </select>
                    <span style=\"font-size:10px;color:#6b7280\">Mitte: <span id=\"hcfg-accColorPct-val\">50</span>%</span>
                    <input type=\"range\" id=\"hcfg-accColorPct\" min=\"10\" max=\"90\" value=\"50\" style=\"width:60px\" oninput=\"document.getElementById('hcfg-accColorPct-val').textContent=this.value\">
                  </div>
                  <div class=\"hcfg-grad-preview\" id=\"hcfg-accColor-preview\" style=\"height:18px;border-radius:4px;margin-top:4px;border:1px solid #d1d5db\"></div>
                </div>
              </div>
              <div class=\"hcfg-grad-row\" data-key=\"bgColor\">
                <div style=\"display:flex;align-items:center;gap:6px\">
                  <span style=\"font-size:12px;font-weight:600;color:#374151;flex:1\">Hintergrund</span>
                  <label style=\"font-size:10px;color:#6b7280;cursor:pointer;white-space:nowrap\"><input type=\"checkbox\" class=\"hcfg-grad-toggle\" data-key=\"bgColor\" style=\"margin-right:2px\">Verlauf</label>
                </div>
                <div style=\"display:flex;gap:4px;align-items:center\">
                  <input type=\"color\" id=\"hcfg-bgColor\" value=\"#f4f6f4\" style=\"flex:1;height:30px;border:1px solid #d1d5db;border-radius:6px;cursor:pointer\">
                  <input type=\"color\" id=\"hcfg-bgColor2\" value=\"#e8ece8\" style=\"flex:1;height:30px;border:1px solid #d1d5db;border-radius:6px;cursor:pointer;display:none\" class=\"hcfg-grad-c2\">
                </div>
                <div class=\"hcfg-grad-opts\" style=\"display:none;margin-top:4px;padding:6px;background:#f3f4f6;border-radius:6px\">
                  <div style=\"display:flex;gap:6px;align-items:center;flex-wrap:wrap\">
                    <span style=\"font-size:10px;color:#6b7280\">Richtung:</span>
                    <select id=\"hcfg-bgColorDir\" class=\"cms-input\" style=\"font-size:10px;padding:2px 4px;width:auto;min-width:0\">
                      <option value=\"to bottom\">↓ nach unten</option>
                      <option value=\"to right\">→ nach rechts</option>
                      <option value=\"to bottom right\">↘ diagonal</option>
                      <option value=\"135deg\">↘ 135°</option>
                    </select>
                    <span style=\"font-size:10px;color:#6b7280\">Mitte: <span id=\"hcfg-bgColorPct-val\">50</span>%</span>
                    <input type=\"range\" id=\"hcfg-bgColorPct\" min=\"10\" max=\"90\" value=\"50\" style=\"width:60px\" oninput=\"document.getElementById('hcfg-bgColorPct-val').textContent=this.value\">
                  </div>
                  <div class=\"hcfg-grad-preview\" id=\"hcfg-bgColor-preview\" style=\"height:18px;border-radius:4px;margin-top:4px;border:1px solid #d1d5db\"></div>
                </div>
              </div>
              <div class=\"hcfg-grad-row\" data-key=\"textColor\">
                <div style=\"display:flex;align-items:center;gap:6px\">
                  <span style=\"font-size:12px;font-weight:600;color:#374151;flex:1\">Textfarbe</span>
                </div>
                <input type=\"color\" id=\"hcfg-textColor\" value=\"#16162a\" style=\"width:100%;height:30px;border:1px solid #d1d5db;border-radius:6px;cursor:pointer\">
              </div>
              <button class=\"cms-btn cms-btn-primary cms-btn-sm\" data-action=\"saveHPCfgSection\" style=\"margin-top:4px\">💾 Farben speichern</button>
            </div>
          </div>
          <div class=\"cms-card\" style=\"margin-top:14px\">
            <div class=\"cms-card-header\" style=\"background:#1e40af\">📷 Hero-Banner</div>
            <div class=\"cms-card-body\" style=\"display:flex;flex-direction:column;gap:10px\">
              <label style=\"font-size:12px;font-weight:600;color:#374151\">Hero Overlay-Abdunklung: <span id=\"hcfg-heroOverlay-val\">50</span>%
                <input type=\"range\" id=\"hcfg-heroOverlay\" min=\"0\" max=\"100\" value=\"50\" style=\"width:100%\" oninput=\"document.getElementById('hcfg-heroOverlay-val').textContent=this.value\">
              </label>
              <label style=\"font-size:12px;font-weight:600;color:#374151\">Überschrift-Schriftgröße: <span id=\"hcfg-heroFontSize-val\">2</span>rem
                <input type=\"range\" id=\"hcfg-heroFontSize\" min=\"1.2\" max=\"3.5\" step=\"0.1\" value=\"2\" style=\"width:100%\" oninput=\"document.getElementById('hcfg-heroFontSize-val').textContent=this.value\">
              </label>
              <button class=\"cms-btn cms-btn-primary cms-btn-sm\" data-action=\"saveHPCfgSection\" style=\"margin-top:4px\">💾 Hero speichern</button>
            </div>
          </div>
        </div>
        <div>
          <div class=\"cms-card\">
            <div class=\"cms-card-header\" style=\"background:#7c3aed\">👁 Sektionen anzeigen</div>
            <div class=\"cms-card-body\" style=\"display:flex;flex-direction:column;gap:10px\">
              <label style=\"font-size:12px;font-weight:600;color:#374151\">
                <input type=\"checkbox\" id=\"hcfg-showTopbar\" checked=\"\"> Kontaktleiste (oben)
              </label>
              <label style=\"font-size:12px;font-weight:600;color:#374151\">
                <input type=\"checkbox\" id=\"hcfg-showPromoBar\" checked=\"\"> Promo-Leiste (Sonderangebote/Roter Punkt)
              </label>
              <label style=\"font-size:12px;font-weight:600;color:#374151\">
                <input type=\"checkbox\" id=\"hcfg-showMeatPromo\" checked=\"\"> Fleisch-Rabatt-Banner
              </label>
              <label style=\"font-size:12px;font-weight:600;color:#374151\">
                <input type=\"checkbox\" id=\"hcfg-showDoGehIHi\" checked=\"\"> „Do geh i hi“-Infografik
              </label>
              <label style=\"font-size:12px;font-weight:600;color:#374151\">
                <input type=\"checkbox\" id=\"hcfg-showInfoCards\" checked=\"\"> Info-Karten (Konzept, Genossenschaft etc.)
              </label>
              <label style=\"font-size:12px;font-weight:600;color:#374151\">
                <input type=\"checkbox\" id=\"hcfg-showWhatsApp\" checked=\"\"> WhatsApp-Button (floating)
              </label>
              <label style=\"font-size:12px;font-weight:600;color:#374151\">
                <input type=\"checkbox\" id=\"hcfg-showCookie\" checked=\"\"> Cookie-Banner
              </label>
              <button class=\"cms-btn cms-btn-primary cms-btn-sm\" data-action=\"saveHPCfgSection\" style=\"margin-top:4px\">💾 Sektionen speichern</button>
            </div>
          </div>
          <div class=\"cms-card\" style=\"margin-top:14px\">
            <div class=\"cms-card-header\" style=\"background:#b45309\">📝 Schriften</div>
            <div class=\"cms-card-body\" style=\"display:flex;flex-direction:column;gap:10px\">
              <label style=\"font-size:12px;font-weight:600;color:#374151\">Basis-Schriftgröße: <span id=\"hcfg-baseFontSize-val\">15</span>px
                <input type=\"range\" id=\"hcfg-baseFontSize\" min=\"12\" max=\"20\" value=\"15\" style=\"width:100%\" oninput=\"document.getElementById('hcfg-baseFontSize-val').textContent=this.value\">
              </label>
              <label style=\"font-size:12px;font-weight:600;color:#374151\">Eckenradius: <span id=\"hcfg-borderRadius-val\">12</span>px
                <input type=\"range\" id=\"hcfg-borderRadius\" min=\"0\" max=\"24\" value=\"12\" style=\"width:100%\" oninput=\"document.getElementById('hcfg-borderRadius-val').textContent=this.value\">
              </label>
              <button class=\"cms-btn cms-btn-primary cms-btn-sm\" data-action=\"saveHPCfgSection\" style=\"margin-top:4px\">💾 Schriften speichern</button>
            </div>
          </div>
        </div>
      </div>
      <div style=\"margin-top:16px;display:flex;gap:8px;flex-wrap:wrap\">
        <button class=\"cms-btn cms-btn-primary\" data-action=\"saveHPCfg\">💾 Alles speichern</button>
        <button class=\"cms-btn cms-btn-gray\" data-action=\"resetHPCfg\">↺ Auf Default zurücksetzen</button>
      </div>
      <div style=\"display:flex;gap:6px;flex-wrap:wrap;margin-top:6px\">
        <button class=\"cms-btn cms-btn-gray\" onclick=\"hpSaveAsDefault()\" title=\"Aktuelle HP-Werte als neuen Standard definieren\" style=\"font-size:11px\">★ Als Standard speichern</button>
        <button class=\"cms-btn cms-btn-gray\" onclick=\"hpClearCustomDefault()\" title=\"Eigene HP-Standards löschen\" style=\"font-size:11px;color:#dc2626\">✕ Werkseinstellungen</button>
      </div>
    </div>
    <!-- ============ SUB-TAB: Wochenplan (REDESIGNED) ============ -->
    <div id=\"cms-cfg-wp\" style=\"display:none\">
      <p style=\"font-size:12px;color:#6b7280;margin:0 0 10px\">Farben, Layout und Sichtbarkeit der Wochenplan-Karte auf der Startseite und im Flyer/Druck.</p>
      <!-- Hidden inputs for backward compat (synced from template colors) -->
      <input type=\"hidden\" id=\"hcfg-wpHeaderFrom\" value=\"#5ea88a\">
      <input type=\"hidden\" id=\"hcfg-wpHeaderTo\" value=\"#4a8e73\">
      <input type=\"hidden\" id=\"hcfg-wpDishColor\" value=\"#1a1a1a\">
      <input type=\"hidden\" id=\"hcfg-wpPriceColor\" value=\"#2d7a5e\">
      <input type=\"hidden\" id=\"hcfg-wpStripeColor\" value=\"#f0f7f0\">
      <input type=\"hidden\" id=\"hcfg-wpDayColor\" value=\"#5ea88a\">·
      <!-- ── Section Navigation ── -->
      <div class=\"cfg-section-nav\" style=\"display:flex;gap:0;border-bottom:2px solid #e5e7eb;margin-bottom:16px;flex-wrap:wrap\">
        <button class=\"cfg-section-btn active\" data-action=\"wpCfgSection\" data-id=\"wp-sec-home\" style=\"padding:8px 16px;font-size:12px;font-weight:700;border:none;background:none;cursor:pointer;border-bottom:2px solid var(--c-m-pri);margin-bottom:-2px;color:var(--c-m-pri);text-transform:uppercase;letter-spacing:.3px\">🏠 Homepage-Layout</button>
        <button class=\"cfg-section-btn\" data-action=\"wpCfgSection\" data-id=\"wp-sec-flyer\" style=\"padding:8px 16px;font-size:12px;font-weight:700;border:none;background:none;cursor:pointer;border-bottom:2px solid transparent;margin-bottom:-2px;color:#6b7280;text-transform:uppercase;letter-spacing:.3px\">📄 Flyer / Druck</button>
      </div>·
      <div class=\"cfg-split\">
      <div class=\"cfg-split-left\">·
      <!-- ════════════════════════════════════════════════ -->
      <!--  WP SECTION 1: HOMEPAGE-LAYOUT                  -->
      <!-- ════════════════════════════════════════════════ -->
      <div id=\"wp-sec-home\">
        <div style=\"background:linear-gradient(135deg,#f0f4f1,#e8ece8);border:1px solid #d1d5db;border-radius:12px;padding:16px;margin-bottom:12px\">
          <div style=\"display:flex;align-items:center;gap:8px;margin-bottom:12px\">
            <span style=\"font-size:18px\">🏠</span>
            <div>
              <div style=\"font-size:14px;font-weight:800;color:var(--c-m-pri)\">Homepage-Wochenplan</div>
              <div style=\"font-size:11px;color:#6b7280\">Template &amp; Farben für die Wochenplan-Karte auf der Startseite</div>
            </div>
          </div>·
          <!-- Template Selection -->
          <div class=\"cms-card\" style=\"margin-bottom:8px\">
            <div class=\"cms-card-header\" style=\"background:#5ea88a\">🎨 Template</div>
            <div class=\"cms-card-body\" style=\"display:flex;flex-direction:column;gap:8px\">
              <label style=\"font-size:12px;font-weight:600;color:#374151\">Homepage-Layout
                <select id=\"hcfg-wpHomeTemplate\" class=\"cms-input\" style=\"margin-top:4px\">
                  <option value=\"classic-red\">Klassik (Rot/Beige)</option>
                  <option value=\"clean-white\">Clean White</option>
                  <option value=\"dark-modern\">Dark Modern</option>
                  <option value=\"tafel\">Tafel (Kreide)</option>
                  <option value=\"bento\">Bento (2-Spalten)</option>
                  <option value=\"timeline\">Timeline</option>
                  <option value=\"zeitung\">Zeitung</option>
                </select>
              </label>
              <div style=\"display:flex;justify-content:flex-end\">
                <button type=\"button\" class=\"cms-btn cms-btn-gray cms-btn-sm\" data-action=\"previewWpTpl\" data-target=\"home-live\">Live-Vorschau</button>
              </div>
              <div id=\"hcfg-wpHomeTemplate-preview\" class=\"cms-wp-preview-grid cms-wp-preview-grid-home\">
                <button type=\"button\" class=\"cms-wp-preview\" data-action=\"pickWpHomeTpl\" data-value=\"classic-red\" title=\"Klassik – Rot/Beige Tabelle\">
                  <div class=\"cms-wp-thumb\" style=\"background:#fdf8f0;border:1px solid #fecdd3\"><div style=\"height:8px;background:#9f1239;border-radius:3px 3px 0 0\"></div><div style=\"padding:4px\"><div style=\"height:3px;background:#9f1239;width:50%;border-radius:2px;margin-bottom:3px\"></div><div style=\"height:2px;background:#e5e7eb;width:90%;margin-bottom:2px\"></div><div style=\"height:2px;background:#e5e7eb;width:80%;margin-bottom:2px\"></div><div style=\"height:2px;background:#e5e7eb;width:90%\"></div></div></div>
                  <div class=\"cms-wp-preview-name\">Klassik</div>
                </button>
                <button type=\"button\" class=\"cms-wp-preview\" data-action=\"pickWpHomeTpl\" data-value=\"clean-white\" title=\"Clean White – Minimalistisch\">
                  <div class=\"cms-wp-thumb\" style=\"background:#ffffff;border:1px solid #e5e7eb\"><div style=\"height:8px;background:#f3f4f6;border-radius:3px 3px 0 0\"></div><div style=\"padding:4px\"><div style=\"height:3px;background:#111827;width:55%;border-radius:2px;margin-bottom:3px\"></div><div style=\"height:2px;background:#e5e7eb;width:90%;margin-bottom:2px\"></div><div style=\"height:2px;background:#e5e7eb;width:85%;margin-bottom:2px\"></div><div style=\"height:2px;background:#e5e7eb;width:90%\"></div></div></div>
                  <div class=\"cms-wp-preview-name\">Clean</div>
                </button>
                <button type=\"button\" class=\"cms-wp-preview\" data-action=\"pickWpHomeTpl\" data-value=\"dark-modern\" title=\"Dark Modern – Dunkler Hintergrund\">
                  <div class=\"cms-wp-thumb\" style=\"background:#0f172a;border:1px solid #334155\"><div style=\"height:8px;background:#1e40af;border-radius:3px 3px 0 0\"></div><div style=\"padding:4px\"><div style=\"height:3px;background:#f1f5f9;width:55%;border-radius:2px;margin-bottom:3px\"></div><div style=\"height:2px;background:#334155;width:90%;margin-bottom:2px\"></div><div style=\"height:2px;background:#334155;width:80%;margin-bottom:2px\"></div><div style=\"height:2px;background:#334155;width:90%\"></div></div></div>
                  <div class=\"cms-wp-preview-name\">Dark</div>
                </button>
                <button type=\"button\" class=\"cms-wp-preview\" data-action=\"pickWpHomeTpl\" data-value=\"tafel\" title=\"Tafel – Kreidetafel-Look\">
                  <div class=\"cms-wp-thumb\" style=\"background:#1a3c28;border:2px solid #8b7355\"><div style=\"padding:4px\"><div style=\"height:3px;background:#ffffff;width:55%;border-radius:2px;margin-bottom:3px\"></div><div style=\"height:2px;background:rgba(255,255,255,0.2);width:90%;margin-bottom:2px\"></div><div style=\"height:2px;background:rgba(255,255,255,0.15);width:85%;margin-bottom:2px\"></div><div style=\"height:2px;background:rgba(255,255,255,0.2);width:90%\"></div></div></div>
                  <div class=\"cms-wp-preview-name\">Tafel</div>
                </button>
                <button type=\"button\" class=\"cms-wp-preview\" data-action=\"pickWpHomeTpl\" data-value=\"bento\" title=\"Bento – 2-Spalten Karten\">
                  <div class=\"cms-wp-thumb\" style=\"background:#f8fafc;border:1px solid #e2e8f0\"><div style=\"padding:4px;display:grid;grid-template-columns:1fr 1fr;gap:3px\"><div style=\"background:#fff;border-radius:3px;padding:2px\"><div style=\"height:2px;background:#2563eb;width:70%;border-radius:2px;margin-bottom:2px\"></div><div style=\"height:2px;background:#e5e7eb;width:90%\"></div></div><div style=\"background:#fff;border-radius:3px;padding:2px\"><div style=\"height:2px;background:#059669;width:70%;border-radius:2px;margin-bottom:2px\"></div><div style=\"height:2px;background:#e5e7eb;width:90%\"></div></div><div style=\"background:#fff;border-radius:3px;padding:2px\"><div style=\"height:2px;background:#d97706;width:70%;border-radius:2px;margin-bottom:2px\"></div><div style=\"height:2px;background:#e5e7eb;width:90%\"></div></div><div style=\"background:#fff;border-radius:3px;padding:2px\"><div style=\"height:2px;background:#dc2626;width:70%;border-radius:2px;margin-bottom:2px\"></div><div style=\"height:2px;background:#e5e7eb;width:90%\"></div></div></div></div>
                  <div class=\"cms-wp-preview-name\">Bento</div>
                </button>
                <button type=\"button\" class=\"cms-wp-preview\" data-action=\"pickWpHomeTpl\" data-value=\"timeline\" title=\"Timeline – Vertikale Leiste\">
                  <div class=\"cms-wp-thumb\" style=\"background:#f0f9ff;border:1px solid #bae6fd\"><div style=\"padding:4px;display:flex;gap:3px\"><div style=\"width:4px;background:#0284c7;border-radius:2px;position:relative\"><div style=\"width:6px;height:6px;background:#0284c7;border-radius:50%;position:absolute;top:2px;left:-1px\"></div><div style=\"width:6px;height:6px;background:#0284c7;border-radius:50%;position:absolute;top:14px;left:-1px\"></div></div><div style=\"flex:1\"><div style=\"background:#fff;border-radius:3px;padding:2px;margin-bottom:3px\"><div style=\"height:2px;background:#0369a1;width:50%;border-radius:2px;margin-bottom:2px\"></div><div style=\"height:2px;background:#e5e7eb;width:80%\"></div></div><div style=\"background:#fff;border-radius:3px;padding:2px\"><div style=\"height:2px;background:#0369a1;width:60%;border-radius:2px;margin-bottom:2px\"></div><div style=\"height:2px;background:#e5e7eb;width:75%\"></div></div></div></div></div>
                  <div class=\"cms-wp-preview-name\">Timeline</div>
                </button>
                <button type=\"button\" class=\"cms-wp-preview\" data-action=\"pickWpHomeTpl\" data-value=\"zeitung\" title=\"Zeitung – 2-Spalten elegant\">
                  <div class=\"cms-wp-thumb\" style=\"background:#fafaf9;border:1px solid #d6d3d1\"><div style=\"border-top:2px solid #292524;border-bottom:1px solid #292524;padding:2px 0;margin:0 4px\"><div style=\"height:3px;background:#1c1917;width:50%;margin:0 auto;border-radius:2px\"></div></div><div style=\"padding:3px 4px;display:grid;grid-template-columns:1fr 1px 1fr;gap:2px\"><div><div style=\"height:2px;background:#44403c;width:70%;margin-bottom:2px\"></div><div style=\"height:2px;background:#d6d3d1;width:90%;margin-bottom:2px\"></div><div style=\"height:2px;background:#d6d3d1;width:80%\"></div></div><div style=\"background:#d6d3d1\"></div><div><div style=\"height:2px;background:#44403c;width:65%;margin-bottom:2px\"></div><div style=\"height:2px;background:#d6d3d1;width:85%;margin-bottom:2px\"></div><div style=\"height:2px;background:#d6d3d1;width:90%\"></div></div></div></div>
                  <div class=\"cms-wp-preview-name\">Zeitung</div>
                </button>
              </div>
            </div>
          </div>·
          <!-- Homepage Colors -->
          <div class=\"cms-card\" style=\"margin-bottom:8px\">
            <div class=\"cms-card-header\" style=\"background:#5ea88a\">🎨 Farben anpassen</div>
            <div class=\"cms-card-body\">
              <div id=\"hcfg-wpHome-colors\" style=\"padding:0\">
                <div style=\"display:grid;grid-template-columns:1fr 1fr;gap:6px\">
                  <label style=\"font-size:11px;color:#374151\">Header-Gradient Start<input type=\"color\" id=\"hcfg-wpTpl-home-wpHeaderFrom\" class=\"wpTpl-grad-input\" data-kind=\"home\" style=\"width:100%;height:24px;border:1px solid #d1d5db;border-radius:4px;cursor:pointer\"></label>
                  <label style=\"font-size:11px;color:#374151\">Header-Gradient Ende<input type=\"color\" id=\"hcfg-wpTpl-home-wpHeaderTo\" class=\"wpTpl-grad-input\" data-kind=\"home\" style=\"width:100%;height:24px;border:1px solid #d1d5db;border-radius:4px;cursor:pointer\"></label>
                  <label style=\"font-size:11px;color:#374151;grid-column:1/-1\">Verlaufsrichtung
                    <select id=\"hcfg-wpTpl-home-wpHeaderDir\" class=\"cms-input wpTpl-grad-input\" data-kind=\"home\" style=\"font-size:11px;padding:4px 6px;margin-top:2px\">
                      <option value=\"135deg\">↘ 135° (diagonal)</option>
                      <option value=\"to right\">→ nach rechts</option>
                      <option value=\"to bottom\">↓ nach unten</option>
                      <option value=\"to bottom right\">↘ nach rechts-unten</option>
                      <option value=\"45deg\">↗ 45°</option>
                      <option value=\"90deg\">→ 90°</option>
                      <option value=\"180deg\">↓ 180°</option>
                    </select>
                  </label>
                  <div style=\"grid-column:1/-1;height:20px;border-radius:4px;border:1px solid #d1d5db\" id=\"hcfg-wpTpl-home-gradPreview\"></div>
                  <label style=\"font-size:11px;color:#374151\">Gericht-Textfarbe<input type=\"color\" id=\"hcfg-wpTpl-home-wpDishColor\" style=\"width:100%;height:24px;border:1px solid #d1d5db;border-radius:4px;cursor:pointer\"></label>
                  <label style=\"font-size:11px;color:#374151\">Preis-Farbe<input type=\"color\" id=\"hcfg-wpTpl-home-wpPriceColor\" style=\"width:100%;height:24px;border:1px solid #d1d5db;border-radius:4px;cursor:pointer\"></label>
                  <label style=\"font-size:11px;color:#374151\">Zebrastreifen<input type=\"color\" id=\"hcfg-wpTpl-home-wpStripeColor\" style=\"width:100%;height:24px;border:1px solid #d1d5db;border-radius:4px;cursor:pointer\"></label>
                  <label style=\"font-size:11px;color:#374151\">Wochentag-Farbe<input type=\"color\" id=\"hcfg-wpTpl-home-wpDayColor\" style=\"width:100%;height:24px;border:1px solid #d1d5db;border-radius:4px;cursor:pointer\"></label>
                  <label style=\"font-size:11px;color:#374151\">Wochentag-Hintergrund<input type=\"color\" id=\"hcfg-wpTpl-home-wpDayBg\" style=\"width:100%;height:24px;border:1px solid #d1d5db;border-radius:4px;cursor:pointer\"></label>
                  <label style=\"font-size:11px;color:#374151\">Hintergrund<input type=\"color\" id=\"hcfg-wpTpl-home-wpBgColor\" style=\"width:100%;height:24px;border:1px solid #d1d5db;border-radius:4px;cursor:pointer\"></label>
                  <button type=\"button\" class=\"cms-btn cms-btn-gray cms-btn-sm\" data-action=\"resetWpTplColors\" data-kind=\"home\" style=\"font-size:10px;padding:2px 6px\">Farben zurücksetzen</button>
                </div>
              </div>
            </div>
          </div>·
          <!-- Sichtbarkeit (Homepage-Elemente) -->
          <div class=\"cms-card\" style=\"margin-bottom:8px\">
            <div class=\"cms-card-header\" style=\"background:#5ea88a\">👁 Sichtbarkeit</div>
            <div class=\"cms-card-body\" style=\"display:flex;flex-direction:column;gap:10px\">
              <label style=\"font-size:12px;font-weight:600;color:#374151\">
                <input type=\"checkbox\" id=\"hcfg-wpShowCard\" checked=\"\"> Wochenplan anzeigen
              </label>
              <label style=\"font-size:12px;font-weight:600;color:#374151\">
                <input type=\"checkbox\" id=\"hcfg-wpShowOeko\" checked=\"\"> Öko-Rabatt-Hinweis
              </label>
              <label style=\"font-size:12px;font-weight:600;color:#374151\">
                <input type=\"checkbox\" id=\"hcfg-wpShowVorbestell\" checked=\"\"> Vorbestell-Hinweis
              </label>
              <label style=\"font-size:12px;font-weight:600;color:#374151\">
                <input type=\"checkbox\" id=\"hcfg-wpShowPhone\" checked=\"\"> Telefonnummer im Footer
              </label>
              <label style=\"font-size:12px;font-weight:600;color:#374151\">
                <input type=\"checkbox\" id=\"hcfg-wpShowWaShare\" checked=\"\"> WhatsApp-Teilen Button
              </label>
              <label style=\"font-size:12px;font-weight:600;color:#374151\">
                <input type=\"checkbox\" id=\"hcfg-wpShowWaInfo\" checked=\"\"> WhatsApp-Info Box (unter Plan)
              </label>
            </div>
          </div>·
          <!-- Schriften (Homepage HTML) -->
          <div class=\"cms-card\" style=\"margin-bottom:8px\">
            <div class=\"cms-card-header\" style=\"background:#5ea88a\">📝 Schriftgrößen</div>
            <div class=\"cms-card-body\" style=\"display:flex;flex-direction:column;gap:10px\">
              <label style=\"font-size:12px;font-weight:600;color:#374151\">Gericht-Schriftgröße: <span id=\"hcfg-wpDishFontSize-val\">14</span>px
                <input type=\"range\" id=\"hcfg-wpDishFontSize\" min=\"10\" max=\"24\" step=\"1\" value=\"14\" style=\"width:100%\" oninput=\"document.getElementById('hcfg-wpDishFontSize-val').textContent=this.value\">
              </label>
              <label style=\"font-size:12px;font-weight:600;color:#374151\">Preis-Schriftgröße: <span id=\"hcfg-wpPriceFontSize-val\">14</span>px
                <input type=\"range\" id=\"hcfg-wpPriceFontSize\" min=\"10\" max=\"24\" step=\"1\" value=\"14\" style=\"width:100%\" oninput=\"document.getElementById('hcfg-wpPriceFontSize-val').textContent=this.value\">
              </label>
            </div>
          </div>·
          <!-- Actions -->
          <div style=\"display:flex;gap:8px;flex-wrap:wrap\">
            <button class=\"cms-btn cms-btn-primary\" data-action=\"saveHPCfg\">💾 Speichern</button>
            <button class=\"cms-btn cms-btn-gray\" data-action=\"wpRevertSection\" data-kind=\"home\">↺ Verwerfen</button>
            <button class=\"cms-btn cms-btn-gray\" style=\"font-size:11px\" data-action=\"resetWpTplColors\" data-kind=\"home\">Auf Defaults zurücksetzen</button>
          </div>·
          <!-- Vorlagen -->
          <div style=\"margin-top:10px;padding:10px;background:#f9fafb;border:1px solid #e5e7eb;border-radius:8px\">
            <div style=\"display:flex;align-items:center;justify-content:space-between;margin-bottom:6px\">
              <span style=\"font-size:11px;font-weight:700;color:#6b7280;text-transform:uppercase;letter-spacing:.3px\">📂 Vorlagen</span>
              <button class=\"cms-btn cms-btn-gray cms-btn-sm\" data-action=\"wpPresetSave\" data-section=\"wp-home\" title=\"Aktuelle Einstellungen als Vorlage speichern\">+ Vorlage speichern</button>
            </div>
            <div id=\"wp-presets-home\" style=\"display:flex;flex-direction:column;gap:4px\">
              <span style=\"font-size:11px;color:#9ca3af;font-style:italic\">Noch keine Vorlagen gespeichert.</span>
            </div>
          </div>
        </div>
      </div>·
      <!-- ════════════════════════════════════════════════ -->
      <!--  WP SECTION 2: FLYER / DRUCK                    -->
      <!-- ════════════════════════════════════════════════ -->
      <div id=\"wp-sec-flyer\" style=\"display:none\">
        <div style=\"background:linear-gradient(135deg,#eef2ff,#e0e7ff);border:1px solid #c7d2fe;border-radius:12px;padding:16px;margin-bottom:12px\">
          <div style=\"display:flex;align-items:center;gap:8px;margin-bottom:12px\">
            <span style=\"font-size:18px\">📄</span>
            <div>
              <div style=\"font-size:14px;font-weight:800;color:#4338ca\">Flyer / Druck-Layout</div>
              <div style=\"font-size:11px;color:#6b7280\">Template &amp; Farben für Vorschau, Teilen und Drucken des Wochenplans</div>
            </div>
          </div>·
          <!-- Template Selection -->
          <div class=\"cms-card\" style=\"margin-bottom:8px\">
            <div class=\"cms-card-header\" style=\"background:#4338ca\">🎨 Template</div>
            <div class=\"cms-card-body\" style=\"display:flex;flex-direction:column;gap:8px\">
              <label style=\"font-size:12px;font-weight:600;color:#374151\">Flyer/Druck-Layout
                <select id=\"hcfg-wpFlyerTemplate\" class=\"cms-input\" style=\"margin-top:4px\">
                  <option value=\"classic-red\">Klassik (Rot/Beige)</option>
                  <option value=\"clean-white\">Clean White</option>
                  <option value=\"dark-modern\">Dark Modern</option>
                  <option value=\"tafel\">Tafel (Kreide)</option>
                  <option value=\"bento\">Bento (2-Spalten)</option>
                  <option value=\"timeline\">Timeline</option>
                  <option value=\"zeitung\">Zeitung</option>
                </select>
              </label>
              <div style=\"display:flex;justify-content:flex-end\">
                <button type=\"button\" class=\"cms-btn cms-btn-gray cms-btn-sm\" data-action=\"previewWpTpl\" data-target=\"flyer\">Live-Vorschau</button>
              </div>
              <div id=\"hcfg-wpFlyerTemplate-preview\" class=\"cms-wp-preview-grid\">
                <button type=\"button\" class=\"cms-wp-preview\" data-action=\"pickWpFlyerTpl\" data-value=\"classic-red\" title=\"Klassik – Rot/Beige\">
                  <div class=\"cms-wp-thumb\" style=\"background:#fdf8f0;border:1px solid #fecdd3\"><div style=\"height:8px;background:#9f1239;border-radius:3px 3px 0 0\"></div><div style=\"padding:4px\"><div style=\"height:2px;background:#e5e7eb;width:90%;margin-bottom:2px\"></div><div style=\"height:2px;background:#e5e7eb;width:80%\"></div></div></div>
                  <div class=\"cms-wp-preview-name\">Klassik</div>
                </button>
                <button type=\"button\" class=\"cms-wp-preview\" data-action=\"pickWpFlyerTpl\" data-value=\"clean-white\" title=\"Clean White\">
                  <div class=\"cms-wp-thumb\" style=\"background:#ffffff;border:1px solid #e5e7eb\"><div style=\"height:8px;background:#f3f4f6;border-radius:3px 3px 0 0\"></div><div style=\"padding:4px\"><div style=\"height:2px;background:#e5e7eb;width:90%;margin-bottom:2px\"></div><div style=\"height:2px;background:#e5e7eb;width:85%\"></div></div></div>
                  <div class=\"cms-wp-preview-name\">Clean</div>
                </button>
                <button type=\"button\" class=\"cms-wp-preview\" data-action=\"pickWpFlyerTpl\" data-value=\"dark-modern\" title=\"Dark Modern\">
                  <div class=\"cms-wp-thumb\" style=\"background:#0f172a;border:1px solid #334155\"><div style=\"height:8px;background:#1e40af;border-radius:3px 3px 0 0\"></div><div style=\"padding:4px\"><div style=\"height:2px;background:#334155;width:90%;margin-bottom:2px\"></div><div style=\"height:2px;background:#334155;width:80%\"></div></div></div>
                  <div class=\"cms-wp-preview-name\">Dark</div>
                </button>
                <button type=\"button\" class=\"cms-wp-preview\" data-action=\"pickWpFlyerTpl\" data-value=\"tafel\" title=\"Tafel – Kreide\">
                  <div class=\"cms-wp-thumb\" style=\"background:#1a3c28;border:2px solid #8b7355\"><div style=\"padding:4px\"><div style=\"height:2px;background:rgba(255,255,255,0.2);width:90%;margin-bottom:2px\"></div><div style=\"height:2px;background:rgba(255,255,255,0.15);width:85%\"></div></div></div>
                  <div class=\"cms-wp-preview-name\">Tafel</div>
                </button>
                <button type=\"button\" class=\"cms-wp-preview\" data-action=\"pickWpFlyerTpl\" data-value=\"bento\" title=\"Bento – 2-Spalten\">
                  <div class=\"cms-wp-thumb\" style=\"background:#f8fafc;border:1px solid #e2e8f0\"><div style=\"padding:4px;display:grid;grid-template-columns:1fr 1fr;gap:2px\"><div style=\"background:#fff;border-radius:2px;height:10px;border-top:2px solid #2563eb\"></div><div style=\"background:#fff;border-radius:2px;height:10px;border-top:2px solid #059669\"></div></div></div>
                  <div class=\"cms-wp-preview-name\">Bento</div>
                </button>
                <button type=\"button\" class=\"cms-wp-preview\" data-action=\"pickWpFlyerTpl\" data-value=\"timeline\" title=\"Timeline\">
                  <div class=\"cms-wp-thumb\" style=\"background:#f0f9ff;border:1px solid #bae6fd\"><div style=\"padding:4px;display:flex;gap:3px\"><div style=\"width:3px;background:#0284c7;border-radius:2px\"></div><div style=\"flex:1\"><div style=\"background:#fff;border-radius:2px;height:8px;margin-bottom:2px\"></div><div style=\"background:#fff;border-radius:2px;height:8px\"></div></div></div></div>
                  <div class=\"cms-wp-preview-name\">Timeline</div>
                </button>
                <button type=\"button\" class=\"cms-wp-preview\" data-action=\"pickWpFlyerTpl\" data-value=\"zeitung\" title=\"Zeitung\">
                  <div class=\"cms-wp-thumb\" style=\"background:#fafaf9;border:1px solid #d6d3d1\"><div style=\"border-top:2px solid #292524;margin:0 4px\"></div><div style=\"padding:3px 4px;display:grid;grid-template-columns:1fr 1px 1fr;gap:2px\"><div><div style=\"height:2px;background:#d6d3d1;width:90%\"></div></div><div style=\"background:#d6d3d1\"></div><div><div style=\"height:2px;background:#d6d3d1;width:85%\"></div></div></div></div>
                  <div class=\"cms-wp-preview-name\">Zeitung</div>
                </button>
              </div>
            </div>
          </div>·
          <!-- Flyer Colors -->
          <div class=\"cms-card\" style=\"margin-bottom:8px\">
            <div class=\"cms-card-header\" style=\"background:#4338ca\">🎨 Farben anpassen</div>
            <div class=\"cms-card-body\">
              <div id=\"hcfg-wpFlyer-colors\" style=\"padding:0\">
                <div style=\"display:grid;grid-template-columns:1fr 1fr;gap:6px\">
                  <label style=\"font-size:11px;color:#374151\">Header-Gradient Start<input type=\"color\" id=\"hcfg-wpTpl-flyer-wpHeaderFrom\" class=\"wpTpl-grad-input\" data-kind=\"flyer\" style=\"width:100%;height:24px;border:1px solid #d1d5db;border-radius:4px;cursor:pointer\"></label>
                  <label style=\"font-size:11px;color:#374151\">Header-Gradient Ende<input type=\"color\" id=\"hcfg-wpTpl-flyer-wpHeaderTo\" class=\"wpTpl-grad-input\" data-kind=\"flyer\" style=\"width:100%;height:24px;border:1px solid #d1d5db;border-radius:4px;cursor:pointer\"></label>
                  <label style=\"font-size:11px;color:#374151;grid-column:1/-1\">Verlaufsrichtung
                    <select id=\"hcfg-wpTpl-flyer-wpHeaderDir\" class=\"cms-input wpTpl-grad-input\" data-kind=\"flyer\" style=\"font-size:11px;padding:4px 6px;margin-top:2px\">
                      <option value=\"135deg\">↘ 135° (diagonal)</option>
                      <option value=\"to right\">→ nach rechts</option>
                      <option value=\"to bottom\">↓ nach unten</option>
                      <option value=\"to bottom right\">↘ nach rechts-unten</option>
                      <option value=\"45deg\">↗ 45°</option>
                      <option value=\"90deg\">→ 90°</option>
                      <option value=\"180deg\">↓ 180°</option>
                    </select>
                  </label>
                  <div style=\"grid-column:1/-1;height:20px;border-radius:4px;border:1px solid #d1d5db\" id=\"hcfg-wpTpl-flyer-gradPreview\"></div>
                  <label style=\"font-size:11px;color:#374151\">Gericht-Textfarbe<input type=\"color\" id=\"hcfg-wpTpl-flyer-wpDishColor\" style=\"width:100%;height:24px;border:1px solid #d1d5db;border-radius:4px;cursor:pointer\"></label>
                  <label style=\"font-size:11px;color:#374151\">Preis-Farbe<input type=\"color\" id=\"hcfg-wpTpl-flyer-wpPriceColor\" style=\"width:100%;height:24px;border:1px solid #d1d5db;border-radius:4px;cursor:pointer\"></label>
                  <label style=\"font-size:11px;color:#374151\">Zebrastreifen<input type=\"color\" id=\"hcfg-wpTpl-flyer-wpStripeColor\" style=\"width:100%;height:24px;border:1px solid #d1d5db;border-radius:4px;cursor:pointer\"></label>
                  <label style=\"font-size:11px;color:#374151\">Wochentag-Farbe<input type=\"color\" id=\"hcfg-wpTpl-flyer-wpDayColor\" style=\"width:100%;height:24px;border:1px solid #d1d5db;border-radius:4px;cursor:pointer\"></label>
                  <label style=\"font-size:11px;color:#374151\">Wochentag-Hintergrund<input type=\"color\" id=\"hcfg-wpTpl-flyer-wpDayBg\" style=\"width:100%;height:24px;border:1px solid #d1d5db;border-radius:4px;cursor:pointer\"></label>
                  <label style=\"font-size:11px;color:#374151\">Hintergrund<input type=\"color\" id=\"hcfg-wpTpl-flyer-wpBgColor\" style=\"width:100%;height:24px;border:1px solid #d1d5db;border-radius:4px;cursor:pointer\"></label>
                  <button type=\"button\" class=\"cms-btn cms-btn-gray cms-btn-sm\" data-action=\"resetWpTplColors\" data-kind=\"flyer\" style=\"font-size:10px;padding:2px 6px\">Farben zurücksetzen</button>
                </div>
              </div>
            </div>
          </div>·
          <!-- Schriften (Bild/Canvas) -->
          <div class=\"cms-card\" style=\"margin-bottom:8px\">
            <div class=\"cms-card-header\" style=\"background:#4338ca\">🎨 Schriften (Bild / Vorschau)</div>
            <div class=\"cms-card-body\" style=\"display:flex;flex-direction:column;gap:10px\">
              <label style=\"font-size:12px;font-weight:600;color:#374151\">Wochentag: <span id=\"hcfg-wpCanvasDaySize-val\">15</span>px
                <input type=\"range\" id=\"hcfg-wpCanvasDaySize\" min=\"10\" max=\"22\" step=\"1\" value=\"15\" style=\"width:100%\" oninput=\"document.getElementById('hcfg-wpCanvasDaySize-val').textContent=this.value\">
              </label>
              <label style=\"font-size:12px;font-weight:600;color:#374151\">Gericht: <span id=\"hcfg-wpCanvasDishSize-val\">15</span>px
                <input type=\"range\" id=\"hcfg-wpCanvasDishSize\" min=\"10\" max=\"22\" step=\"1\" value=\"15\" style=\"width:100%\" oninput=\"document.getElementById('hcfg-wpCanvasDishSize-val').textContent=this.value\">
              </label>
              <label style=\"font-size:12px;font-weight:600;color:#374151\">Preis: <span id=\"hcfg-wpCanvasPriceSize-val\">16</span>px
                <input type=\"range\" id=\"hcfg-wpCanvasPriceSize\" min=\"10\" max=\"22\" step=\"1\" value=\"16\" style=\"width:100%\" oninput=\"document.getElementById('hcfg-wpCanvasPriceSize-val').textContent=this.value\">
              </label>
            </div>
          </div>·
          <!-- Transparenz -->
          <div class=\"cms-card\" style=\"margin-bottom:8px\">
            <div class=\"cms-card-header\" style=\"background:#4338ca\">👁 Hinweis &amp; Footer</div>
            <div class=\"cms-card-body\" style=\"display:flex;flex-direction:column;gap:10px\">
              <div style=\"display:grid;grid-template-columns:1fr 1fr;gap:6px\">
                <label style=\"font-size:11px;color:#374151\">Hinweistext-Farbe<input type=\"color\" id=\"hcfg-wpHintColor\" value=\"#9ca3af\" style=\"width:100%;height:24px;border:1px solid #d1d5db;border-radius:4px;cursor:pointer\"></label>
                <label style=\"font-size:11px;color:#374151\">Footer-Textfarbe<input type=\"color\" id=\"hcfg-wpFooterColor\" value=\"#6b7280\" style=\"width:100%;height:24px;border:1px solid #d1d5db;border-radius:4px;cursor:pointer\"></label>
              </div>
              <label style=\"font-size:12px;font-weight:600;color:#374151\">Hinweistext-Deckkraft: <span id=\"hcfg-wpHintOpacity-val\">40</span>%
                <input type=\"range\" id=\"hcfg-wpHintOpacity\" min=\"10\" max=\"100\" step=\"5\" value=\"40\" style=\"width:100%\" oninput=\"document.getElementById('hcfg-wpHintOpacity-val').textContent=this.value\">
              </label>
              <label style=\"font-size:12px;font-weight:600;color:#374151\">Footer-Deckkraft: <span id=\"hcfg-wpFooterOpacity-val\">50</span>%
                <input type=\"range\" id=\"hcfg-wpFooterOpacity\" min=\"10\" max=\"100\" step=\"5\" value=\"50\" style=\"width:100%\" oninput=\"document.getElementById('hcfg-wpFooterOpacity-val').textContent=this.value\">
              </label>
            </div>
          </div>·
          <!-- Actions -->
          <div style=\"display:flex;gap:8px;flex-wrap:wrap\">
            <button class=\"cms-btn cms-btn-primary\" data-action=\"saveHPCfg\">💾 Speichern</button>
            <button class=\"cms-btn cms-btn-gray\" data-action=\"wpRevertSection\" data-kind=\"flyer\">↺ Verwerfen</button>
            <button class=\"cms-btn cms-btn-gray\" style=\"font-size:11px\" data-action=\"resetWpTplColors\" data-kind=\"flyer\">Auf Defaults zurücksetzen</button>
          </div>·
          <!-- Vorlagen -->
          <div style=\"margin-top:10px;padding:10px;background:#f9fafb;border:1px solid #e5e7eb;border-radius:8px\">
            <div style=\"display:flex;align-items:center;justify-content:space-between;margin-bottom:6px\">
              <span style=\"font-size:11px;font-weight:700;color:#6b7280;text-transform:uppercase;letter-spacing:.3px\">📂 Vorlagen</span>
              <button class=\"cms-btn cms-btn-gray cms-btn-sm\" data-action=\"wpPresetSave\" data-section=\"wp-flyer\" title=\"Aktuelle Einstellungen als Vorlage speichern\">+ Vorlage speichern</button>
            </div>
            <div id=\"wp-presets-flyer\" style=\"display:flex;flex-direction:column;gap:4px\">
              <span style=\"font-size:11px;color:#9ca3af;font-style:italic\">Noch keine Vorlagen gespeichert.</span>
            </div>
          </div>
        </div>
      </div>·
      </div><!-- /cfg-split-left (WP) -->·
      <div class=\"cfg-split-right\">
        <div class=\"cfg-lp-inner\">
          <div style=\"font-size:12px;font-weight:700;color:#374151;margin-bottom:8px;text-align:center\">👁 Live-Vorschau</div>
          <div id=\"wp-home-live-preview\" style=\"min-height:80px;display:flex;align-items:center;justify-content:center;background:#f9fafb;border-radius:6px\">
            <span style=\"font-size:11px;color:#9ca3af;text-align:center;padding:8px\">Vorschau wird beim Ändern automatisch aktualisiert</span>
          </div>
          <div id=\"wp-flyer-live-preview\" style=\"min-height:80px;display:none;align-items:center;justify-content:center;background:#f9fafb;border-radius:6px\">
            <span style=\"font-size:11px;color:#9ca3af;text-align:center;padding:8px\">Vorschau wird beim Ändern automatisch aktualisiert</span>
          </div>
          <div style=\"display:flex;gap:6px;justify-content:center;margin-top:8px;flex-wrap:wrap\">
            <button type=\"button\" class=\"cms-btn cms-btn-gray cms-btn-sm\" id=\"wp-lp-refresh-btn\" data-action=\"wpLivePreview\" data-kind=\"home\">🔄 Aktualisieren</button>
            <label style=\"font-size:11px;color:#6b7280;display:flex;align-items:center;gap:4px;cursor:pointer\"><input type=\"checkbox\" id=\"cfg-live-auto-wp-home\" checked=\"\" style=\"margin:0\"> Auto</label>
            <input type=\"checkbox\" id=\"cfg-live-auto-wp-flyer\" checked=\"\" style=\"display:none\">
          </div>
        </div>
      </div><!-- /cfg-split-right (WP) -->·
      </div><!-- /cfg-split (WP) -->
    </div>
    <!-- ============ SUB-TAB: Plakate & Flyer (REDESIGNED) ============ -->
    <div id=\"cms-cfg-plakat\" style=\"display:none\">
      <p style=\"font-size:12px;color:#6b7280;margin:0 0 10px\">Änderungen werden erst nach Klick auf „Speichern“ übernommen.</p>
      <!-- Hidden fields for backward compat -->
      <input type=\"hidden\" id=\"cfg-bgColor\" value=\"#f4f1ea\">
      <input type=\"hidden\" id=\"cfg-titleColor\" value=\"#a51d2d\">·
      <!-- ── Section Navigation ── -->
      <div class=\"cfg-section-nav\" style=\"display:flex;gap:0;border-bottom:2px solid #e5e7eb;margin-bottom:16px;flex-wrap:wrap\">
        <button class=\"cfg-section-btn active\" data-action=\"cfgSection\" data-id=\"sec-plakat\" style=\"padding:8px 16px;font-size:12px;font-weight:700;border:none;background:none;cursor:pointer;border-bottom:2px solid var(--c-m-pri);margin-bottom:-2px;color:var(--c-m-pri);text-transform:uppercase;letter-spacing:.3px\">📄 Plakat</button>
        <button class=\"cfg-section-btn\" data-action=\"cfgSection\" data-id=\"sec-flyer\" style=\"padding:8px 16px;font-size:12px;font-weight:700;border:none;background:none;cursor:pointer;border-bottom:2px solid transparent;margin-bottom:-2px;color:#6b7280;text-transform:uppercase;letter-spacing:.3px\">📄 Einzelflyer</button>
        <button class=\"cfg-section-btn\" data-action=\"cfgSection\" data-id=\"sec-shared\" style=\"padding:8px 16px;font-size:12px;font-weight:700;border:none;background:none;cursor:pointer;border-bottom:2px solid transparent;margin-bottom:-2px;color:#6b7280;text-transform:uppercase;letter-spacing:.3px\">⚙ Gemeinsame Einstellungen</button>
      </div>·
      <div class=\"cfg-split\">
      <div class=\"cfg-split-left\">·
      <!-- ════════════════════════════════════════════════ -->
      <!--  SECTION 1: PLAKAT                              -->
      <!-- ════════════════════════════════════════════════ -->
      <div id=\"cfg-sec-plakat\">
        <div style=\"background:linear-gradient(135deg,#f0f4f1,#e8ece8);border:1px solid #d1d5db;border-radius:12px;padding:16px;margin-bottom:12px\">
          <div style=\"display:flex;align-items:center;gap:8px;margin-bottom:12px\">
            <span style=\"font-size:18px\">📄</span>
            <div>
              <div style=\"font-size:14px;font-weight:800;color:var(--c-m-pri)\">Plakat-Design</div>
              <div style=\"font-size:11px;color:#6b7280\">Template, Farben &amp; Schrift für Plakate (A4/A3)</div>
            </div>
          </div>·
          <!-- Template Selection -->
          <div class=\"cms-card\" style=\"margin-bottom:8px\">
            <div class=\"cms-card-header\">🎨 Template</div>
            <div class=\"cms-card-body\" style=\"display:flex;flex-direction:column;gap:8px\">
              <label style=\"font-size:12px;font-weight:600;color:#374151\">Plakat-Template
                <select id=\"cfg-plakatTemplate\" class=\"cms-input\" style=\"margin-top:4px\">
                  <option value=\"classic-red\">Classic Red (aktuell)</option>
                  <option value=\"minimal-clean\">Minimal Clean</option>
                  <option value=\"dark-modern\">Dark Modern</option>
                  <option value=\"organic-market\">Organic Market</option>
                  <option value=\"bold-poster\">Bold Poster</option>
                  <option value=\"modern-magazine\">Modern Magazine</option>
                  <option value=\"modern-mag-fresh\">Mag Fresh (Türkis)</option>
                  <option value=\"modern-mag-bold\">Mag Bold (Violett)</option>
                  <option value=\"modern-mag-xl\">Mag XL (Großbild)</option>
                </select>
              </label>
              <div style=\"display:flex;justify-content:flex-end\">
                <button type=\"button\" class=\"cms-btn cms-btn-gray cms-btn-sm\" data-action=\"previewOfferTpl\" data-target=\"plakat\">Live-Vorschau</button>
              </div>
              <div id=\"cfg-plakatTemplate-preview\" class=\"cms-wp-preview-grid\">
                <button type=\"button\" class=\"cms-wp-preview\" data-action=\"pickPlakatTpl\" data-value=\"classic-red\" title=\"Classic Red\">
                  <div class=\"cms-wp-thumb cms-wp-thumb-classic\"><div class=\"cms-wp-thumb-h\"></div><div class=\"cms-wp-thumb-b\"><div class=\"cms-wp-thumb-line l\"></div><div class=\"cms-wp-thumb-line m\"></div><div class=\"cms-wp-thumb-line s\"></div></div></div>
                  <div class=\"cms-wp-preview-name\">Classic</div>
                </button>
                <button type=\"button\" class=\"cms-wp-preview\" data-action=\"pickPlakatTpl\" data-value=\"minimal-clean\" title=\"Minimal Clean\">
                  <div class=\"cms-wp-thumb cms-wp-thumb-min\"><div class=\"cms-wp-thumb-h\"></div><div class=\"cms-wp-thumb-b\"><div class=\"cms-wp-thumb-line l\"></div><div class=\"cms-wp-thumb-line l\"></div><div class=\"cms-wp-thumb-line m\"></div></div></div>
                  <div class=\"cms-wp-preview-name\">Minimal</div>
                </button>
                <button type=\"button\" class=\"cms-wp-preview\" data-action=\"pickPlakatTpl\" data-value=\"dark-modern\" title=\"Dark Modern\">
                  <div class=\"cms-wp-thumb cms-wp-thumb-dark\"><div class=\"cms-wp-thumb-h\"></div><div class=\"cms-wp-thumb-b\"><div class=\"cms-wp-thumb-line l\"></div><div class=\"cms-wp-thumb-line m\"></div><div class=\"cms-wp-thumb-line s\"></div></div></div>
                  <div class=\"cms-wp-preview-name\">Dark</div>
                </button>
                <button type=\"button\" class=\"cms-wp-preview\" data-action=\"pickPlakatTpl\" data-value=\"organic-market\" title=\"Organic Market\">
                  <div class=\"cms-wp-thumb cms-wp-thumb-organic\"><div class=\"cms-wp-thumb-h\"></div><div class=\"cms-wp-thumb-b\"><div class=\"cms-wp-thumb-line l\"></div><div class=\"cms-wp-thumb-line m\"></div><div class=\"cms-wp-thumb-line s\"></div></div></div>
                  <div class=\"cms-wp-preview-name\">Organic</div>
                </button>
                <button type=\"button\" class=\"cms-wp-preview\" data-action=\"pickPlakatTpl\" data-value=\"bold-poster\" title=\"Bold Poster\">
                  <div class=\"cms-wp-thumb cms-wp-thumb-poster\"><div class=\"cms-wp-thumb-h\"></div><div class=\"cms-wp-thumb-b\"><div class=\"cms-wp-thumb-line\"></div><div class=\"cms-wp-thumb-line\"></div><div class=\"cms-wp-thumb-line\"></div><div class=\"cms-wp-thumb-line\"></div></div></div>
                  <div class=\"cms-wp-preview-name\">Poster</div>
                </button>
                <button type=\"button\" class=\"cms-wp-preview\" data-action=\"pickPlakatTpl\" data-value=\"modern-magazine\" title=\"Modern Magazine\">
                  <div class=\"cms-wp-thumb cms-wp-thumb-flyermag\"><div class=\"cms-wp-thumb-h\"></div><div class=\"cms-wp-thumb-b\"><div class=\"cms-wp-thumb-line\"></div><div class=\"cms-wp-thumb-line\"></div><div class=\"cms-wp-thumb-line\"></div></div></div>
                  <div class=\"cms-wp-preview-name\">Mag</div>
                </button>
                <button type=\"button\" class=\"cms-wp-preview\" data-action=\"pickPlakatTpl\" data-value=\"modern-mag-fresh\" title=\"Mag Fresh (Türkis)\">
                  <div class=\"cms-wp-thumb cms-wp-thumb-flyermag\" style=\"background:#e8f6f8\"><div class=\"cms-wp-thumb-h\" style=\"background:#cffafe;border-color:#06b6d4\"></div><div class=\"cms-wp-thumb-b\"><div class=\"cms-wp-thumb-line\"></div><div class=\"cms-wp-thumb-line\"></div><div class=\"cms-wp-thumb-line\"></div></div></div>
                  <div class=\"cms-wp-preview-name\">Fresh</div>
                </button>
                <button type=\"button\" class=\"cms-wp-preview\" data-action=\"pickPlakatTpl\" data-value=\"modern-mag-bold\" title=\"Mag Bold (Violett)\">
                  <div class=\"cms-wp-thumb cms-wp-thumb-flyermag\" style=\"background:#faf5ff\"><div class=\"cms-wp-thumb-h\" style=\"background:#ede9fe;border-color:#8b5cf6\"></div><div class=\"cms-wp-thumb-b\"><div class=\"cms-wp-thumb-line\"></div><div class=\"cms-wp-thumb-line\"></div><div class=\"cms-wp-thumb-line\"></div></div></div>
                  <div class=\"cms-wp-preview-name\">Bold</div>
                </button>
                <button type=\"button\" class=\"cms-wp-preview\" data-action=\"pickPlakatTpl\" data-value=\"modern-mag-xl\" title=\"Mag XL (Großbild)\">
                  <div class=\"cms-wp-thumb cms-wp-thumb-flyermag\" style=\"background:#f0f4f8\"><div class=\"cms-wp-thumb-h\" style=\"background:#dbeafe;border-color:#3b82f6;height:60%\"></div><div class=\"cms-wp-thumb-b\"><div class=\"cms-wp-thumb-line\"></div><div class=\"cms-wp-thumb-line\"></div></div></div>
                  <div class=\"cms-wp-preview-name\">XL</div>
                </button>
              </div>
            </div>
          </div>·
          <!-- Plakat Colors -->
          <div class=\"cms-card\" style=\"margin-bottom:8px\">
            <div class=\"cms-card-header\">🎨 Plakat-Farben</div>
            <div class=\"cms-card-body\">
              <div id=\"cfg-tpl-plakat-colors\" style=\"padding:0\">
                <div style=\"display:grid;grid-template-columns:1fr 1fr;gap:6px\">
                  <div class=\"cfg-tpl-grad-row\" data-kind=\"plakat\" data-key=\"bgColor\">
                    <div style=\"display:flex;align-items:center;gap:4px\"><span style=\"font-size:11px;color:#374151;flex:1\">Hintergrund</span><label style=\"font-size:9px;color:#6b7280;cursor:pointer;white-space:nowrap\"><input type=\"checkbox\" class=\"cfg-tpl-grad-toggle\" data-kind=\"plakat\" data-key=\"bgColor\" style=\"margin-right:2px\">Verlauf</label></div>
                    <div style=\"display:flex;gap:3px\"><input type=\"color\" id=\"cfg-tpl-plakat-bgColor\" style=\"flex:1;height:24px;border:1px solid #d1d5db;border-radius:4px;cursor:pointer\"><input type=\"color\" id=\"cfg-tpl-plakat-bgColor_c2\" class=\"cfg-tpl-grad-c2\" style=\"flex:1;height:24px;border:1px solid #d1d5db;border-radius:4px;cursor:pointer;display:none\"></div>
                    <div class=\"cfg-tpl-grad-opts\" style=\"display:none;margin-top:3px;padding:4px;background:#f3f4f6;border-radius:4px\"><div style=\"display:flex;gap:4px;align-items:center;flex-wrap:wrap\"><span style=\"font-size:9px;color:#6b7280\">Richtung:</span><select id=\"cfg-tpl-plakat-bgColor_dir\" class=\"cms-input\" style=\"font-size:9px;padding:1px 3px;width:auto;min-width:0\"><option value=\"to bottom\">↓ unten</option><option value=\"to right\">→ rechts</option><option value=\"to bottom right\">↘ diagonal</option><option value=\"135deg\">135°</option></select><span style=\"font-size:9px;color:#6b7280\"><span id=\"cfg-tpl-plakat-bgColor_pct-val\">50</span>%</span><input type=\"range\" id=\"cfg-tpl-plakat-bgColor_pct\" min=\"10\" max=\"90\" value=\"50\" style=\"width:50px\"></div><div class=\"cfg-tpl-grad-preview\" id=\"cfg-tpl-plakat-bgColor-preview\" style=\"height:14px;border-radius:3px;margin-top:3px;border:1px solid #d1d5db\"></div></div>
                  </div>
                  <label style=\"font-size:11px;color:#374151\">Titel<input type=\"color\" id=\"cfg-tpl-plakat-titleColor\" style=\"width:100%;height:24px;border:1px solid #d1d5db;border-radius:4px;cursor:pointer\"></label>
                  <label style=\"font-size:11px;color:#374151\">Preisschild<input type=\"color\" id=\"cfg-tpl-plakat-tagColor\" style=\"width:100%;height:24px;border:1px solid #d1d5db;border-radius:4px;cursor:pointer\"></label>
                  <label style=\"font-size:11px;color:#374151\">Karte<input type=\"color\" id=\"cfg-tpl-plakat-cardBg\" style=\"width:100%;height:24px;border:1px solid #d1d5db;border-radius:4px;cursor:pointer\"></label>
                  <label style=\"font-size:11px;color:#374151\">Kartenrahmen<input type=\"color\" id=\"cfg-tpl-plakat-cardBorder\" style=\"width:100%;height:24px;border:1px solid #d1d5db;border-radius:4px;cursor:pointer\"></label>
                  <label style=\"font-size:11px;color:#374151\">Text<input type=\"color\" id=\"cfg-tpl-plakat-textColor\" style=\"width:100%;height:24px;border:1px solid #d1d5db;border-radius:4px;cursor:pointer\"></label>
                  <label style=\"font-size:11px;color:#374151\">Details<input type=\"color\" id=\"cfg-tpl-plakat-detailsColor\" style=\"width:100%;height:24px;border:1px solid #d1d5db;border-radius:4px;cursor:pointer\"></label>
                  <div class=\"cfg-tpl-grad-row\" data-kind=\"plakat\" data-key=\"imgBg\">
                    <div style=\"display:flex;align-items:center;gap:4px\"><span style=\"font-size:11px;color:#374151;flex:1\">Bild-HG</span><label style=\"font-size:9px;color:#6b7280;cursor:pointer;white-space:nowrap\"><input type=\"checkbox\" class=\"cfg-tpl-grad-toggle\" data-kind=\"plakat\" data-key=\"imgBg\" style=\"margin-right:2px\">Verlauf</label></div>
                    <div style=\"display:flex;gap:3px\"><input type=\"color\" id=\"cfg-tpl-plakat-imgBg\" style=\"flex:1;height:24px;border:1px solid #d1d5db;border-radius:4px;cursor:pointer\"><input type=\"color\" id=\"cfg-tpl-plakat-imgBg_c2\" class=\"cfg-tpl-grad-c2\" style=\"flex:1;height:24px;border:1px solid #d1d5db;border-radius:4px;cursor:pointer;display:none\"></div>
                    <div class=\"cfg-tpl-grad-opts\" style=\"display:none;margin-top:3px;padding:4px;background:#f3f4f6;border-radius:4px\"><div style=\"display:flex;gap:4px;align-items:center;flex-wrap:wrap\"><span style=\"font-size:9px;color:#6b7280\">Richtung:</span><select id=\"cfg-tpl-plakat-imgBg_dir\" class=\"cms-input\" style=\"font-size:9px;padding:1px 3px;width:auto;min-width:0\"><option value=\"to bottom\">↓ unten</option><option value=\"to right\">→ rechts</option><option value=\"to bottom right\">↘ diagonal</option><option value=\"135deg\">135°</option></select><span style=\"font-size:9px;color:#6b7280\"><span id=\"cfg-tpl-plakat-imgBg_pct-val\">50</span>%</span><input type=\"range\" id=\"cfg-tpl-plakat-imgBg_pct\" min=\"10\" max=\"90\" value=\"50\" style=\"width:50px\"></div><div class=\"cfg-tpl-grad-preview\" id=\"cfg-tpl-plakat-imgBg-preview\" style=\"height:14px;border-radius:3px;margin-top:3px;border:1px solid #d1d5db\"></div></div>
                  </div>
                  <button type=\"button\" class=\"cms-btn cms-btn-gray cms-btn-sm\" data-action=\"resetTplColors\" data-kind=\"plakat\" style=\"font-size:10px;padding:2px 6px\">Farben zurücksetzen</button>
                </div>
              </div>
            </div>
          </div>·
          <!-- Plakat-specific settings -->
          <div class=\"cms-card\" style=\"margin-bottom:8px\">
            <div class=\"cms-card-header\">💵 Plakat-Preisschild</div>
            <div class=\"cms-card-body\" style=\"display:flex;flex-direction:column;gap:8px\">
              <label style=\"font-size:12px;font-weight:600;color:#374151\">Preis-Schriftgröße
                <div style=\"display:flex;align-items:center;gap:8px\">
                  <input type=\"range\" id=\"cfg-priceFontPlakat\" min=\"24\" max=\"54\" value=\"36\" style=\"flex:1\">
                  <span id=\"cfg-priceFontPlakat-val\" style=\"font-size:13px;min-width:32px;text-align:right\">36px</span>
                </div>
              </label>
              <label style=\"font-size:12px;font-weight:600;color:#374151\">Ersparnis-Marker Größe
                <div style=\"display:flex;align-items:center;gap:8px\">
                  <input type=\"range\" id=\"cfg-savingsScalePlakat\" min=\"80\" max=\"170\" value=\"95\" style=\"flex:1\">
                  <span id=\"cfg-savingsScalePlakat-val\" style=\"font-size:13px;min-width:42px;text-align:right\">95%</span>
                </div>
              </label>
            </div>
          </div>·
          <!-- Plakat Preisschild-Form -->
          <div class=\"cms-card\" style=\"margin-bottom:8px\">
            <div class=\"cms-card-header\">💵 Preisschild-Form</div>
            <div class=\"cms-card-body\" style=\"display:flex;flex-direction:column;gap:10px\">
              <label style=\"font-size:12px;font-weight:600;color:#374151\">Preisschild-Vorlage
                <select id=\"cfg-plakat-tagPreset\" class=\"cms-input cfg-persec-ctl\" data-sec=\"plakat\" style=\"margin-top:4px\">
                  <option value=\"\">— Manuell —</option>
                  <option value=\"classic-red-rect\">Classic Rot (Rechteck)</option>
                  <option value=\"green-rounded\">Naturgrün (Abgerundet)</option>
                  <option value=\"dark-pill\">Dark Elegance (Pill)</option>
                  <option value=\"gold-banner\">Gold Banner (Fahne)</option>
                  <option value=\"blue-circle\">Ocean Badge (Kreis)</option>
                  <option value=\"orange-star\">Sunrise Stern</option>
                  <option value=\"purple-hexagon\">Berry Hexagon</option>
                  <option value=\"teal-ticket\">Teal Coupon (Ticket)</option>
                  <option value=\"rose-diamond\">Rosé Diamant</option>
                  <option value=\"copper-explosion\">Copper Burst (Explosion)</option>
                </select>
              </label>
              <label style=\"font-size:12px;font-weight:600;color:#374151\">Preisschild-Form
                <select id=\"cfg-plakat-tagShape\" class=\"cms-input cfg-persec-ctl\" data-sec=\"plakat\" style=\"margin-top:4px\">
                  <option value=\"rect\">Rechteck</option>
                  <option value=\"rounded\">Abgerundet</option>
                  <option value=\"pill\">Pill / Oval</option>
                  <option value=\"circle\">Kreis / Badge</option>
                  <option value=\"banner\">Fahne / Banner</option>
                  <option value=\"star\">Stern</option>
                  <option value=\"hexagon\">Hexagon</option>
                  <option value=\"diamond\">Diamant / Raute</option>
                  <option value=\"ticket\">Ticket / Coupon</option>
                  <option value=\"explosion\">Explosion / Burst</option>
                  <option value=\"trapez\">Trapez</option>
                </select>
              </label>
              <label style=\"font-size:12px;font-weight:600;color:#374151\">Ecken-Rundung
                <div style=\"display:flex;align-items:center;gap:8px\">
                  <input type=\"range\" id=\"cfg-plakat-tagRadius\" min=\"0\" max=\"40\" value=\"0\" class=\"cfg-persec-ctl\" data-sec=\"plakat\" style=\"flex:1\">
                  <span id=\"cfg-plakat-tagRadius-val\" style=\"font-size:13px;min-width:32px;text-align:right\">0px</span>
                </div>
              </label>
              <label style=\"font-size:12px;font-weight:600;color:#374151\">Preisschild-Neigung
                <div style=\"display:flex;align-items:center;gap:8px\">
                  <input type=\"range\" id=\"cfg-plakat-tagSkew\" min=\"0\" max=\"30\" value=\"18\" class=\"cfg-persec-ctl\" data-sec=\"plakat\" style=\"flex:1\">
                  <span id=\"cfg-plakat-tagSkew-val\" style=\"font-size:13px;min-width:32px;text-align:right\">18%</span>
                </div>
              </label>
              <label style=\"font-size:12px;font-weight:600;color:#374151\">Preisschild-Größe
                <div style=\"display:flex;align-items:center;gap:8px\">
                  <input type=\"range\" id=\"cfg-plakat-tagScale\" min=\"50\" max=\"150\" value=\"100\" class=\"cfg-persec-ctl\" data-sec=\"plakat\" style=\"flex:1\">
                  <span id=\"cfg-plakat-tagScale-val\" style=\"font-size:13px;min-width:32px;text-align:right\">100%</span>
                </div>
              </label>
              <label style=\"font-size:12px;font-weight:600;color:#374151\">Bildgröße
                <div style=\"display:flex;align-items:center;gap:8px\">
                  <input type=\"range\" id=\"cfg-plakat-imgScale\" min=\"50\" max=\"200\" value=\"100\" class=\"cfg-persec-ctl\" data-sec=\"plakat\" style=\"flex:1\">
                  <span id=\"cfg-plakat-imgScale-val\" style=\"font-size:13px;min-width:32px;text-align:right\">100%</span>
                </div>
              </label>
            </div>
          </div>·
          <!-- Plakat Dekoration -->
          <div class=\"cms-card\" style=\"margin-bottom:8px\">
            <div class=\"cms-card-header\">🌿 Dekoration</div>
            <div class=\"cms-card-body\" style=\"display:flex;flex-direction:column;gap:10px\">
              <div style=\"padding:10px;background:#f9fafb;border:1px solid #e5e7eb;border-radius:8px\">
                <div style=\"font-size:11px;font-weight:700;color:#6b7280;margin-bottom:6px\">🎨 Deko-Farben</div>
                <div style=\"display:grid;grid-template-columns:1fr 1fr;gap:6px\">
                  <label style=\"font-size:11px;color:#374151\">Blatt/Icon-Grün<input type=\"color\" id=\"cfg-plakat-decoLeafColor\" value=\"#4a7c3f\" class=\"cfg-persec-ctl\" data-sec=\"plakat\" style=\"width:100%;height:24px;border:1px solid #d1d5db;border-radius:4px;cursor:pointer\"></label>
                  <label style=\"font-size:11px;color:#374151\">Titel-Farbe<input type=\"color\" id=\"cfg-plakat-decoTitleColor\" value=\"#a51d2d\" class=\"cfg-persec-ctl\" data-sec=\"plakat\" style=\"width:100%;height:24px;border:1px solid #d1d5db;border-radius:4px;cursor:pointer\"></label>
                  <label style=\"font-size:11px;color:#374151\">Hintergrund<input type=\"color\" id=\"cfg-plakat-decoBgColor\" value=\"#f4f1ea\" class=\"cfg-persec-ctl\" data-sec=\"plakat\" style=\"width:100%;height:24px;border:1px solid #d1d5db;border-radius:4px;cursor:pointer\"></label>
                  <label style=\"font-size:11px;color:#374151\">Footer-Farbe<input type=\"color\" id=\"cfg-plakat-decoFooterColor\" value=\"#8aad7e\" class=\"cfg-persec-ctl\" data-sec=\"plakat\" style=\"width:100%;height:24px;border:1px solid #d1d5db;border-radius:4px;cursor:pointer\"></label>
                  <label style=\"font-size:11px;color:#374151\">*Vorrat-Text<input type=\"color\" id=\"cfg-plakat-vorratColor\" value=\"#888888\" class=\"cfg-persec-ctl\" data-sec=\"plakat\" style=\"width:100%;height:24px;border:1px solid #d1d5db;border-radius:4px;cursor:pointer\"></label>
                </div>
              </div>
              <label style=\"font-size:12px;font-weight:600;color:#374151\">
                <input type=\"checkbox\" id=\"cfg-plakat-showLeaf\" class=\"cfg-persec-ctl\" data-sec=\"plakat\"> Blatt-Deko anzeigen
              </label>
              <label style=\"font-size:12px;font-weight:600;color:#374151\">Blatt-Größe
                <div style=\"display:flex;align-items:center;gap:8px\">
                  <input type=\"range\" id=\"cfg-plakat-leafSize\" min=\"16\" max=\"50\" value=\"34\" class=\"cfg-persec-ctl\" data-sec=\"plakat\" style=\"flex:1\">
                  <span id=\"cfg-plakat-leafSize-val\" style=\"font-size:13px;min-width:32px;text-align:right\">34px</span>
                </div>
              </label>
              <label style=\"font-size:12px;font-weight:600;color:#374151\">
                <input type=\"checkbox\" id=\"cfg-plakat-showBag\" class=\"cfg-persec-ctl\" data-sec=\"plakat\"> Einkaufstaschen anzeigen
              </label>
              <label style=\"font-size:12px;font-weight:600;color:#374151\">
                <input type=\"checkbox\" id=\"cfg-plakat-showTexture\" checked=\"\" class=\"cfg-persec-ctl\" data-sec=\"plakat\"> Papier-Textur anzeigen
              </label>
            </div>
          </div>·
          <!-- Plakat Action Buttons -->
          <div style=\"display:flex;gap:6px;flex-wrap:wrap;margin-top:8px\">
            <button class=\"cms-btn cms-btn-primary\" data-action=\"saveCfg\">💾 Speichern</button>
            <button class=\"cms-btn cms-btn-gray\" data-action=\"cfgRevertUnsaved\" title=\"Ungespeicherte Änderungen verwerfen\">↺ Verwerfen</button>
            <button class=\"cms-btn cms-btn-gray\" data-action=\"resetCfg\">↺ Auf Default zurücksetzen</button>
          </div>
          <div style=\"display:flex;gap:6px;flex-wrap:wrap;margin-top:6px\">
            <button class=\"cms-btn cms-btn-gray\" onclick=\"cmsSaveAsDefault()\" title=\"Aktuelle Werte als neuen Standard definieren\" style=\"font-size:11px\">★ Als Standard speichern</button>
            <button class=\"cms-btn cms-btn-gray\" onclick=\"cmsClearCustomDefault()\" title=\"Eigene Standards löschen\" style=\"font-size:11px;color:#dc2626\">✕ Werkseinstellungen</button>
          </div>
          <!-- Vorlagen -->
          <div style=\"margin-top:10px;padding:10px;background:#f9fafb;border:1px solid #e5e7eb;border-radius:8px\">
            <div style=\"display:flex;align-items:center;justify-content:space-between;margin-bottom:6px\">
              <span style=\"font-size:11px;font-weight:700;color:#6b7280;text-transform:uppercase;letter-spacing:.3px\">📂 Vorlagen</span>
              <button class=\"cms-btn cms-btn-gray cms-btn-sm\" data-action=\"cfgPresetSave\" data-section=\"plakat\" title=\"Aktuelle Einstellungen als Vorlage speichern\">+ Vorlage speichern</button>
            </div>
            <div id=\"cfg-presets-plakat\" style=\"display:flex;flex-direction:column;gap:4px\">
              <span style=\"font-size:11px;color:#9ca3af;font-style:italic\">Noch keine Vorlagen gespeichert.</span>
            </div>
          </div>
        </div>
      </div>·
      <!-- ════════════════════════════════════════════════ -->
      <!--  SECTION 2: EINZELFLYER                         -->
      <!-- ════════════════════════════════════════════════ -->
      <div id=\"cfg-sec-flyer\" style=\"display:none\">
        <div style=\"background:linear-gradient(135deg,#f3f0f8,#ece8f4);border:1px solid #d1d5db;border-radius:12px;padding:16px;margin-bottom:12px\">
          <div style=\"display:flex;align-items:center;gap:8px;margin-bottom:12px\">
            <span style=\"font-size:18px\">📄</span>
            <div>
              <div style=\"font-size:14px;font-weight:800;color:#6d28d9\">Einzelflyer-Design</div>
              <div style=\"font-size:11px;color:#6b7280\">Template, Farben &amp; Schrift für Einzelflyer</div>
            </div>
          </div>·
          <!-- Template Selection -->
          <div class=\"cms-card\" style=\"margin-bottom:8px\">
            <div class=\"cms-card-header\" style=\"background:#6d28d9\">🎨 Template</div>
            <div class=\"cms-card-body\" style=\"display:flex;flex-direction:column;gap:8px\">
              <label style=\"font-size:12px;font-weight:600;color:#374151\">Einzelflyer-Template
                <select id=\"cfg-flyerTemplate\" class=\"cms-input\" style=\"margin-top:4px\">
                  <option value=\"classic-red\">Classic Red (aktuell)</option>
                  <option value=\"minimal-clean\">Minimal Clean</option>
                  <option value=\"dark-modern\">Dark Modern</option>
                  <option value=\"organic-market\">Organic Market</option>
                  <option value=\"bold-poster\">Bold Poster</option>
                  <option value=\"modern-magazine\">Modern Magazine</option>
                  <option value=\"modern-mag-fresh\">Mag Fresh (Türkis)</option>
                  <option value=\"modern-mag-bold\">Mag Bold (Violett)</option>
                  <option value=\"modern-mag-xl\">Mag XL (Großbild)</option>
                </select>
              </label>
              <div style=\"display:flex;justify-content:flex-end\">
                <button type=\"button\" class=\"cms-btn cms-btn-gray cms-btn-sm\" data-action=\"previewOfferTpl\" data-target=\"flyer\">Live-Vorschau</button>
              </div>
              <div id=\"cfg-flyerTemplate-preview\" class=\"cms-wp-preview-grid\">
                <button type=\"button\" class=\"cms-wp-preview\" data-action=\"pickFlyerTpl\" data-value=\"classic-red\" title=\"Classic Red\">
                  <div class=\"cms-wp-thumb cms-wp-thumb-classic\"><div class=\"cms-wp-thumb-h\"></div><div class=\"cms-wp-thumb-b\"><div class=\"cms-wp-thumb-line l\"></div><div class=\"cms-wp-thumb-line m\"></div><div class=\"cms-wp-thumb-line s\"></div></div></div>
                  <div class=\"cms-wp-preview-name\">Classic</div>
                </button>
                <button type=\"button\" class=\"cms-wp-preview\" data-action=\"pickFlyerTpl\" data-value=\"minimal-clean\" title=\"Minimal Clean\">
                  <div class=\"cms-wp-thumb cms-wp-thumb-min\"><div class=\"cms-wp-thumb-h\"></div><div class=\"cms-wp-thumb-b\"><div class=\"cms-wp-thumb-line l\"></div><div class=\"cms-wp-thumb-line l\"></div><div class=\"cms-wp-thumb-line m\"></div></div></div>
                  <div class=\"cms-wp-preview-name\">Minimal</div>
                </button>
                <button type=\"button\" class=\"cms-wp-preview\" data-action=\"pickFlyerTpl\" data-value=\"dark-modern\" title=\"Dark Modern\">
                  <div class=\"cms-wp-thumb cms-wp-thumb-dark\"><div class=\"cms-wp-thumb-h\"></div><div class=\"cms-wp-thumb-b\"><div class=\"cms-wp-thumb-line l\"></div><div class=\"cms-wp-thumb-line m\"></div><div class=\"cms-wp-thumb-line s\"></div></div></div>
                  <div class=\"cms-wp-preview-name\">Dark</div>
                </button>
                <button type=\"button\" class=\"cms-wp-preview\" data-action=\"pickFlyerTpl\" data-value=\"organic-market\" title=\"Organic Market\">
                  <div class=\"cms-wp-thumb cms-wp-thumb-organic\"><div class=\"cms-wp-thumb-h\"></div><div class=\"cms-wp-thumb-b\"><div class=\"cms-wp-thumb-line l\"></div><div class=\"cms-wp-thumb-line m\"></div><div class=\"cms-wp-thumb-line s\"></div></div></div>
                  <div class=\"cms-wp-preview-name\">Organic</div>
                </button>
                <button type=\"button\" class=\"cms-wp-preview\" data-action=\"pickFlyerTpl\" data-value=\"bold-poster\" title=\"Bold Poster\">
                  <div class=\"cms-wp-thumb cms-wp-thumb-poster\"><div class=\"cms-wp-thumb-h\"></div><div class=\"cms-wp-thumb-b\"><div class=\"cms-wp-thumb-line\"></div><div class=\"cms-wp-thumb-line\"></div><div class=\"cms-wp-thumb-line\"></div><div class=\"cms-wp-thumb-line\"></div></div></div>
                  <div class=\"cms-wp-preview-name\">Poster</div>
                </button>
                <button type=\"button\" class=\"cms-wp-preview\" data-action=\"pickFlyerTpl\" data-value=\"modern-magazine\" title=\"Modern Magazine\">
                  <div class=\"cms-wp-thumb cms-wp-thumb-flyermag\"><div class=\"cms-wp-thumb-h\"></div><div class=\"cms-wp-thumb-b\"><div class=\"cms-wp-thumb-line\"></div><div class=\"cms-wp-thumb-line\"></div><div class=\"cms-wp-thumb-line\"></div></div></div>
                  <div class=\"cms-wp-preview-name\">Mag</div>
                </button>
                <button type=\"button\" class=\"cms-wp-preview\" data-action=\"pickFlyerTpl\" data-value=\"modern-mag-fresh\" title=\"Mag Fresh (Türkis)\">
                  <div class=\"cms-wp-thumb cms-wp-thumb-flyermag\" style=\"background:#e8f6f8\"><div class=\"cms-wp-thumb-h\" style=\"background:#cffafe;border-color:#06b6d4\"></div><div class=\"cms-wp-thumb-b\"><div class=\"cms-wp-thumb-line\"></div><div class=\"cms-wp-thumb-line\"></div><div class=\"cms-wp-thumb-line\"></div></div></div>
                  <div class=\"cms-wp-preview-name\">Fresh</div>
                </button>
                <button type=\"button\" class=\"cms-wp-preview\" data-action=\"pickFlyerTpl\" data-value=\"modern-mag-bold\" title=\"Mag Bold (Violett)\">
                  <div class=\"cms-wp-thumb cms-wp-thumb-flyermag\" style=\"background:#faf5ff\"><div class=\"cms-wp-thumb-h\" style=\"background:#ede9fe;border-color:#8b5cf6\"></div><div class=\"cms-wp-thumb-b\"><div class=\"cms-wp-thumb-line\"></div><div class=\"cms-wp-thumb-line\"></div><div class=\"cms-wp-thumb-line\"></div></div></div>
                  <div class=\"cms-wp-preview-name\">Bold</div>
                </button>
                <button type=\"button\" class=\"cms-wp-preview\" data-action=\"pickFlyerTpl\" data-value=\"modern-mag-xl\" title=\"Mag XL (Großbild)\">
                  <div class=\"cms-wp-thumb cms-wp-thumb-flyermag\" style=\"background:#f0f4f8\"><div class=\"cms-wp-thumb-h\" style=\"background:#dbeafe;border-color:#3b82f6;height:60%\"></div><div class=\"cms-wp-thumb-b\"><div class=\"cms-wp-thumb-line\"></div><div class=\"cms-wp-thumb-line\"></div></div></div>
                  <div class=\"cms-wp-preview-name\">XL</div>
                </button>
              </div>
            </div>
          </div>·
          <!-- Flyer Colors -->
          <div class=\"cms-card\" style=\"margin-bottom:8px\">
            <div class=\"cms-card-header\" style=\"background:#6d28d9\">🎨 Flyer-Farben</div>
            <div class=\"cms-card-body\">
              <div id=\"cfg-tpl-flyer-colors\" style=\"padding:0\">
                <div style=\"display:grid;grid-template-columns:1fr 1fr;gap:6px\">
                  <div class=\"cfg-tpl-grad-row\" data-kind=\"flyer\" data-key=\"bgColor\">
                    <div style=\"display:flex;align-items:center;gap:4px\"><span style=\"font-size:11px;color:#374151;flex:1\">Hintergrund</span><label style=\"font-size:9px;color:#6b7280;cursor:pointer;white-space:nowrap\"><input type=\"checkbox\" class=\"cfg-tpl-grad-toggle\" data-kind=\"flyer\" data-key=\"bgColor\" style=\"margin-right:2px\">Verlauf</label></div>
                    <div style=\"display:flex;gap:3px\"><input type=\"color\" id=\"cfg-tpl-flyer-bgColor\" style=\"flex:1;height:24px;border:1px solid #d1d5db;border-radius:4px;cursor:pointer\"><input type=\"color\" id=\"cfg-tpl-flyer-bgColor_c2\" class=\"cfg-tpl-grad-c2\" style=\"flex:1;height:24px;border:1px solid #d1d5db;border-radius:4px;cursor:pointer;display:none\"></div>
                    <div class=\"cfg-tpl-grad-opts\" style=\"display:none;margin-top:3px;padding:4px;background:#f3f4f6;border-radius:4px\"><div style=\"display:flex;gap:4px;align-items:center;flex-wrap:wrap\"><span style=\"font-size:9px;color:#6b7280\">Richtung:</span><select id=\"cfg-tpl-flyer-bgColor_dir\" class=\"cms-input\" style=\"font-size:9px;padding:1px 3px;width:auto;min-width:0\"><option value=\"to bottom\">↓ unten</option><option value=\"to right\">→ rechts</option><option value=\"to bottom right\">↘ diagonal</option><option value=\"135deg\">135°</option></select><span style=\"font-size:9px;color:#6b7280\"><span id=\"cfg-tpl-flyer-bgColor_pct-val\">50</span>%</span><input type=\"range\" id=\"cfg-tpl-flyer-bgColor_pct\" min=\"10\" max=\"90\" value=\"50\" style=\"width:50px\"></div><div class=\"cfg-tpl-grad-preview\" id=\"cfg-tpl-flyer-bgColor-preview\" style=\"height:14px;border-radius:3px;margin-top:3px;border:1px solid #d1d5db\"></div></div>
                  </div>
                  <label style=\"font-size:11px;color:#374151\">Titel<input type=\"color\" id=\"cfg-tpl-flyer-titleColor\" style=\"width:100%;height:24px;border:1px solid #d1d5db;border-radius:4px;cursor:pointer\"></label>
                  <label style=\"font-size:11px;color:#374151\">Preisschild<input type=\"color\" id=\"cfg-tpl-flyer-tagColor\" style=\"width:100%;height:24px;border:1px solid #d1d5db;border-radius:4px;cursor:pointer\"></label>
                  <label style=\"font-size:11px;color:#374151\">Karte<input type=\"color\" id=\"cfg-tpl-flyer-cardBg\" style=\"width:100%;height:24px;border:1px solid #d1d5db;border-radius:4px;cursor:pointer\"></label>
                  <label style=\"font-size:11px;color:#374151\">Kartenrahmen<input type=\"color\" id=\"cfg-tpl-flyer-cardBorder\" style=\"width:100%;height:24px;border:1px solid #d1d5db;border-radius:4px;cursor:pointer\"></label>
                  <label style=\"font-size:11px;color:#374151\">Text<input type=\"color\" id=\"cfg-tpl-flyer-textColor\" style=\"width:100%;height:24px;border:1px solid #d1d5db;border-radius:4px;cursor:pointer\"></label>
                  <label style=\"font-size:11px;color:#374151\">Details<input type=\"color\" id=\"cfg-tpl-flyer-detailsColor\" style=\"width:100%;height:24px;border:1px solid #d1d5db;border-radius:4px;cursor:pointer\"></label>
                  <div class=\"cfg-tpl-grad-row\" data-kind=\"flyer\" data-key=\"imgBg\">
                    <div style=\"display:flex;align-items:center;gap:4px\"><span style=\"font-size:11px;color:#374151;flex:1\">Bild-HG</span><label style=\"font-size:9px;color:#6b7280;cursor:pointer;white-space:nowrap\"><input type=\"checkbox\" class=\"cfg-tpl-grad-toggle\" data-kind=\"flyer\" data-key=\"imgBg\" style=\"margin-right:2px\">Verlauf</label></div>
                    <div style=\"display:flex;gap:3px\"><input type=\"color\" id=\"cfg-tpl-flyer-imgBg\" style=\"flex:1;height:24px;border:1px solid #d1d5db;border-radius:4px;cursor:pointer\"><input type=\"color\" id=\"cfg-tpl-flyer-imgBg_c2\" class=\"cfg-tpl-grad-c2\" style=\"flex:1;height:24px;border:1px solid #d1d5db;border-radius:4px;cursor:pointer;display:none\"></div>
                    <div class=\"cfg-tpl-grad-opts\" style=\"display:none;margin-top:3px;padding:4px;background:#f3f4f6;border-radius:4px\"><div style=\"display:flex;gap:4px;align-items:center;flex-wrap:wrap\"><span style=\"font-size:9px;color:#6b7280\">Richtung:</span><select id=\"cfg-tpl-flyer-imgBg_dir\" class=\"cms-input\" style=\"font-size:9px;padding:1px 3px;width:auto;min-width:0\"><option value=\"to bottom\">↓ unten</option><option value=\"to right\">→ rechts</option><option value=\"to bottom right\">↘ diagonal</option><option value=\"135deg\">135°</option></select><span style=\"font-size:9px;color:#6b7280\"><span id=\"cfg-tpl-flyer-imgBg_pct-val\">50</span>%</span><input type=\"range\" id=\"cfg-tpl-flyer-imgBg_pct\" min=\"10\" max=\"90\" value=\"50\" style=\"width:50px\"></div><div class=\"cfg-tpl-grad-preview\" id=\"cfg-tpl-flyer-imgBg-preview\" style=\"height:14px;border-radius:3px;margin-top:3px;border:1px solid #d1d5db\"></div></div>
                  </div>
                  <button type=\"button\" class=\"cms-btn cms-btn-gray cms-btn-sm\" data-action=\"resetTplColors\" data-kind=\"flyer\" style=\"font-size:10px;padding:2px 6px\">Farben zurücksetzen</button>
                </div>
              </div>
            </div>
          </div>·
          <!-- Flyer-specific settings -->
          <div class=\"cms-card\" style=\"margin-bottom:8px\">
            <div class=\"cms-card-header\" style=\"background:#6d28d9\">💵 Flyer-Preisschild</div>
            <div class=\"cms-card-body\" style=\"display:flex;flex-direction:column;gap:8px\">
              <label style=\"font-size:12px;font-weight:600;color:#374151\">Preis-Schriftgröße
                <div style=\"display:flex;align-items:center;gap:8px\">
                  <input type=\"range\" id=\"cfg-priceFontFlyer\" min=\"40\" max=\"90\" value=\"72\" style=\"flex:1\">
                  <span id=\"cfg-priceFontFlyer-val\" style=\"font-size:13px;min-width:32px;text-align:right\">72px</span>
                </div>
              </label>
              <label style=\"font-size:12px;font-weight:600;color:#374151\">Ersparnis-Marker Größe
                <div style=\"display:flex;align-items:center;gap:8px\">
                  <input type=\"range\" id=\"cfg-savingsScaleFlyer\" min=\"80\" max=\"170\" value=\"120\" style=\"flex:1\">
                  <span id=\"cfg-savingsScaleFlyer-val\" style=\"font-size:13px;min-width:42px;text-align:right\">120%</span>
                </div>
              </label>
            </div>
          </div>·
          <!-- Flyer Preisschild-Form -->
          <div class=\"cms-card\" style=\"margin-bottom:8px\">
            <div class=\"cms-card-header\" style=\"background:#6d28d9\">💵 Preisschild-Form</div>
            <div class=\"cms-card-body\" style=\"display:flex;flex-direction:column;gap:10px\">
              <label style=\"font-size:12px;font-weight:600;color:#374151\">Preisschild-Vorlage
                <select id=\"cfg-flyer-tagPreset\" class=\"cms-input cfg-persec-ctl\" data-sec=\"flyer\" style=\"margin-top:4px\">
                  <option value=\"\">— Manuell —</option>
                  <option value=\"classic-red-rect\">Classic Rot (Rechteck)</option>
                  <option value=\"green-rounded\">Naturgrün (Abgerundet)</option>
                  <option value=\"dark-pill\">Dark Elegance (Pill)</option>
                  <option value=\"gold-banner\">Gold Banner (Fahne)</option>
                  <option value=\"blue-circle\">Ocean Badge (Kreis)</option>
                  <option value=\"orange-star\">Sunrise Stern</option>
                  <option value=\"purple-hexagon\">Berry Hexagon</option>
                  <option value=\"teal-ticket\">Teal Coupon (Ticket)</option>
                  <option value=\"rose-diamond\">Rosé Diamant</option>
                  <option value=\"copper-explosion\">Copper Burst (Explosion)</option>
                </select>
              </label>
              <label style=\"font-size:12px;font-weight:600;color:#374151\">Preisschild-Form
                <select id=\"cfg-flyer-tagShape\" class=\"cms-input cfg-persec-ctl\" data-sec=\"flyer\" style=\"margin-top:4px\">
                  <option value=\"rect\">Rechteck</option>
                  <option value=\"rounded\">Abgerundet</option>
                  <option value=\"pill\">Pill / Oval</option>
                  <option value=\"circle\">Kreis / Badge</option>
                  <option value=\"banner\">Fahne / Banner</option>
                  <option value=\"star\">Stern</option>
                  <option value=\"hexagon\">Hexagon</option>
                  <option value=\"diamond\">Diamant / Raute</option>
                  <option value=\"ticket\">Ticket / Coupon</option>
                  <option value=\"explosion\">Explosion / Burst</option>
                  <option value=\"trapez\">Trapez</option>
                </select>
              </label>
              <label style=\"font-size:12px;font-weight:600;color:#374151\">Ecken-Rundung
                <div style=\"display:flex;align-items:center;gap:8px\">
                  <input type=\"range\" id=\"cfg-flyer-tagRadius\" min=\"0\" max=\"40\" value=\"0\" class=\"cfg-persec-ctl\" data-sec=\"flyer\" style=\"flex:1\">
                  <span id=\"cfg-flyer-tagRadius-val\" style=\"font-size:13px;min-width:32px;text-align:right\">0px</span>
                </div>
              </label>
              <label style=\"font-size:12px;font-weight:600;color:#374151\">Preisschild-Neigung
                <div style=\"display:flex;align-items:center;gap:8px\">
                  <input type=\"range\" id=\"cfg-flyer-tagSkew\" min=\"0\" max=\"30\" value=\"18\" class=\"cfg-persec-ctl\" data-sec=\"flyer\" style=\"flex:1\">
                  <span id=\"cfg-flyer-tagSkew-val\" style=\"font-size:13px;min-width:32px;text-align:right\">18%</span>
                </div>
              </label>
              <label style=\"font-size:12px;font-weight:600;color:#374151\">Preisschild-Größe
                <div style=\"display:flex;align-items:center;gap:8px\">
                  <input type=\"range\" id=\"cfg-flyer-tagScale\" min=\"50\" max=\"150\" value=\"100\" class=\"cfg-persec-ctl\" data-sec=\"flyer\" style=\"flex:1\">
                  <span id=\"cfg-flyer-tagScale-val\" style=\"font-size:13px;min-width:32px;text-align:right\">100%</span>
                </div>
              </label>
              <label style=\"font-size:12px;font-weight:600;color:#374151\">Bildgröße
                <div style=\"display:flex;align-items:center;gap:8px\">
                  <input type=\"range\" id=\"cfg-flyer-imgScale\" min=\"50\" max=\"200\" value=\"100\" class=\"cfg-persec-ctl\" data-sec=\"flyer\" style=\"flex:1\">
                  <span id=\"cfg-flyer-imgScale-val\" style=\"font-size:13px;min-width:32px;text-align:right\">100%</span>
                </div>
              </label>
            </div>
          </div>·
          <!-- Flyer Bild- & Preis-Anker -->
          <div class=\"cms-card\" style=\"margin-bottom:8px\">
            <div class=\"cms-card-header\" style=\"background:#0d9488\">📌 Bild- &amp; Preis-Position</div>
            <div class=\"cms-card-body\" style=\"display:flex;flex-direction:column;gap:14px\">
              <!-- Image width -->
              <label style=\"font-size:12px;font-weight:600;color:#374151\">Bildbreite
                <div style=\"display:flex;align-items:center;gap:8px\">
                  <input type=\"range\" id=\"cfg-flyer-imgWidthPct\" min=\"20\" max=\"80\" value=\"50\" class=\"cfg-persec-ctl\" data-sec=\"flyer\" style=\"flex:1\">
                  <span id=\"cfg-flyer-imgWidthPct-val\" style=\"font-size:13px;min-width:32px;text-align:right\">50%</span>
                </div>
              </label>
              <hr style=\"border:none;border-top:1px solid #e5e7eb;margin:2px 0\">
              <!-- Image anchor (bottom-left) -->
              <div style=\"font-size:12px;font-weight:600;color:#374151;margin-bottom:2px\">🖼️ Bild-Position <span style=\"font-weight:400;font-size:11px;color:#9ca3af\">(Anker: unten links)</span></div>
              <div class=\"anchor-pad\">
                <div class=\"anchor-cross\">
                  <span></span>
                  <button type=\"button\" onclick=\"cfgAnchorStep('flyer','imgAnchor',0,-10)\" title=\"nach oben\">▲</button>
                  <span></span>
                  <button type=\"button\" onclick=\"cfgAnchorStep('flyer','imgAnchor',-10,0)\" title=\"nach links\">◀</button>
                  <div class=\"ac-center\">◎</div>
                  <button type=\"button\" onclick=\"cfgAnchorStep('flyer','imgAnchor',10,0)\" title=\"nach rechts\">▶</button>
                  <span></span>
                  <button type=\"button\" onclick=\"cfgAnchorStep('flyer','imgAnchor',0,10)\" title=\"nach unten\">▼</button>
                  <span></span>
                </div>
                <div class=\"anchor-vals\">
                  <div>→ <span id=\"cfg-flyer-imgAnchorX-val\">10px</span></div>
                  <div>↑ <span id=\"cfg-flyer-imgAnchorY-val\">10px</span></div>
                </div>
                <input type=\"hidden\" id=\"cfg-flyer-imgAnchorX\" value=\"10\" class=\"cfg-persec-ctl\" data-sec=\"flyer\">
                <input type=\"hidden\" id=\"cfg-flyer-imgAnchorY\" value=\"10\" class=\"cfg-persec-ctl\" data-sec=\"flyer\">
              </div>
              <hr style=\"border:none;border-top:1px solid #e5e7eb;margin:2px 0\">
              <!-- Price block anchor (top-right) -->
              <div style=\"font-size:12px;font-weight:600;color:#374151;margin-bottom:2px\">💰 Preis-Position <span style=\"font-weight:400;font-size:11px;color:#9ca3af\">(Anker: oben rechts)</span></div>
              <div class=\"anchor-pad\">
                <div class=\"anchor-cross\">
                  <span></span>
                  <button type=\"button\" onclick=\"cfgAnchorStep('flyer','priceAnchor',0,-10)\" title=\"nach oben\">▲</button>
                  <span></span>
                  <button type=\"button\" onclick=\"cfgAnchorStep('flyer','priceAnchor',10,0)\" title=\"nach links\">◀</button>
                  <div class=\"ac-center\">◎</div>
                  <button type=\"button\" onclick=\"cfgAnchorStep('flyer','priceAnchor',-10,0)\" title=\"nach rechts\">▶</button>
                  <span></span>
                  <button type=\"button\" onclick=\"cfgAnchorStep('flyer','priceAnchor',0,10)\" title=\"nach unten\">▼</button>
                  <span></span>
                </div>
                <div class=\"anchor-vals\">
                  <div>← <span id=\"cfg-flyer-priceAnchorX-val\">10px</span></div>
                  <div>↓ <span id=\"cfg-flyer-priceAnchorY-val\">10px</span></div>
                </div>
                <input type=\"hidden\" id=\"cfg-flyer-priceAnchorX\" value=\"10\" class=\"cfg-persec-ctl\" data-sec=\"flyer\">
                <input type=\"hidden\" id=\"cfg-flyer-priceAnchorY\" value=\"10\" class=\"cfg-persec-ctl\" data-sec=\"flyer\">
              </div>
            </div>
          </div>·
          <!-- Flyer Dekoration -->
          <div class=\"cms-card\" style=\"margin-bottom:8px\">
            <div class=\"cms-card-header\" style=\"background:#6d28d9\">🌿 Dekoration</div>
            <div class=\"cms-card-body\" style=\"display:flex;flex-direction:column;gap:10px\">
              <div style=\"padding:10px;background:#f9fafb;border:1px solid #e5e7eb;border-radius:8px\">
                <div style=\"font-size:11px;font-weight:700;color:#6b7280;margin-bottom:6px\">🎨 Deko-Farben</div>
                <div style=\"display:grid;grid-template-columns:1fr 1fr;gap:6px\">
                  <label style=\"font-size:11px;color:#374151\">Blatt/Icon-Grün<input type=\"color\" id=\"cfg-flyer-decoLeafColor\" value=\"#4a7c3f\" class=\"cfg-persec-ctl\" data-sec=\"flyer\" style=\"width:100%;height:24px;border:1px solid #d1d5db;border-radius:4px;cursor:pointer\"></label>
                  <label style=\"font-size:11px;color:#374151\">Titel-Farbe<input type=\"color\" id=\"cfg-flyer-decoTitleColor\" value=\"#a51d2d\" class=\"cfg-persec-ctl\" data-sec=\"flyer\" style=\"width:100%;height:24px;border:1px solid #d1d5db;border-radius:4px;cursor:pointer\"></label>
                  <label style=\"font-size:11px;color:#374151\">Hintergrund<input type=\"color\" id=\"cfg-flyer-decoBgColor\" value=\"#f4f1ea\" class=\"cfg-persec-ctl\" data-sec=\"flyer\" style=\"width:100%;height:24px;border:1px solid #d1d5db;border-radius:4px;cursor:pointer\"></label>
                  <label style=\"font-size:11px;color:#374151\">Footer-Farbe<input type=\"color\" id=\"cfg-flyer-decoFooterColor\" value=\"#8aad7e\" class=\"cfg-persec-ctl\" data-sec=\"flyer\" style=\"width:100%;height:24px;border:1px solid #d1d5db;border-radius:4px;cursor:pointer\"></label>
                  <label style=\"font-size:11px;color:#374151\">*Vorrat-Text<input type=\"color\" id=\"cfg-flyer-vorratColor\" value=\"#888888\" class=\"cfg-persec-ctl\" data-sec=\"flyer\" style=\"width:100%;height:24px;border:1px solid #d1d5db;border-radius:4px;cursor:pointer\"></label>
                </div>
              </div>
              <label style=\"font-size:12px;font-weight:600;color:#374151\">
                <input type=\"checkbox\" id=\"cfg-flyer-showLeaf\" class=\"cfg-persec-ctl\" data-sec=\"flyer\"> Blatt-Deko anzeigen
              </label>
              <label style=\"font-size:12px;font-weight:600;color:#374151\">Blatt-Größe
                <div style=\"display:flex;align-items:center;gap:8px\">
                  <input type=\"range\" id=\"cfg-flyer-leafSize\" min=\"16\" max=\"50\" value=\"34\" class=\"cfg-persec-ctl\" data-sec=\"flyer\" style=\"flex:1\">
                  <span id=\"cfg-flyer-leafSize-val\" style=\"font-size:13px;min-width:32px;text-align:right\">34px</span>
                </div>
              </label>
              <label style=\"font-size:12px;font-weight:600;color:#374151\">
                <input type=\"checkbox\" id=\"cfg-flyer-showBag\" class=\"cfg-persec-ctl\" data-sec=\"flyer\"> Einkaufstaschen anzeigen
              </label>
              <label style=\"font-size:12px;font-weight:600;color:#374151\">
                <input type=\"checkbox\" id=\"cfg-flyer-showTexture\" checked=\"\" class=\"cfg-persec-ctl\" data-sec=\"flyer\"> Papier-Textur anzeigen
              </label>
              <div style=\"margin-top:8px;padding-top:8px;border-top:1px solid #e5e7eb\">
                <div style=\"font-size:11px;font-weight:700;color:#6b7280;margin-bottom:6px\">🖼️ Rahmen</div>
                <div style=\"display:grid;grid-template-columns:1fr 1fr;gap:6px;align-items:end\">
                  <label style=\"font-size:11px;color:#374151\">Rahmen-Breite
                    <div style=\"display:flex;align-items:center;gap:6px\">
                      <input type=\"range\" id=\"cfg-flyer-borderWidth\" min=\"0\" max=\"20\" value=\"0\" class=\"cfg-persec-ctl\" data-sec=\"flyer\" style=\"flex:1\">
                      <span id=\"cfg-flyer-borderWidth-val\" style=\"font-size:12px;min-width:28px;text-align:right\">0px</span>
                    </div>
                  </label>
                  <label style=\"font-size:11px;color:#374151\">Rahmen-Farbe<input type=\"color\" id=\"cfg-flyer-borderColor\" value=\"#2e7d32\" class=\"cfg-persec-ctl\" data-sec=\"flyer\" style=\"width:100%;height:24px;border:1px solid #d1d5db;border-radius:4px;cursor:pointer\"></label>
                </div>
              </div>
            </div>
          </div>·
          <!-- Flyer Action Buttons -->
          <div style=\"display:flex;gap:6px;flex-wrap:wrap;margin-top:8px\">
            <button class=\"cms-btn cms-btn-primary\" data-action=\"saveCfg\">💾 Speichern</button>
            <button class=\"cms-btn cms-btn-gray\" data-action=\"cfgRevertUnsaved\" title=\"Ungespeicherte Änderungen verwerfen\">↺ Verwerfen</button>
            <button class=\"cms-btn cms-btn-gray\" data-action=\"resetCfg\">↺ Auf Default zurücksetzen</button>
          </div>
          <div style=\"display:flex;gap:6px;flex-wrap:wrap;margin-top:6px\">
            <button class=\"cms-btn cms-btn-gray\" onclick=\"cmsSaveAsDefault()\" title=\"Aktuelle Werte als neuen Standard definieren\" style=\"font-size:11px\">★ Als Standard speichern</button>
            <button class=\"cms-btn cms-btn-gray\" onclick=\"cmsClearCustomDefault()\" title=\"Eigene Standards löschen\" style=\"font-size:11px;color:#dc2626\">✕ Werkseinstellungen</button>
          </div>
          <!-- Vorlagen -->
          <div style=\"margin-top:10px;padding:10px;background:#f9fafb;border:1px solid #e5e7eb;border-radius:8px\">
            <div style=\"display:flex;align-items:center;justify-content:space-between;margin-bottom:6px\">
              <span style=\"font-size:11px;font-weight:700;color:#6b7280;text-transform:uppercase;letter-spacing:.3px\">📂 Vorlagen</span>
              <button class=\"cms-btn cms-btn-gray cms-btn-sm\" data-action=\"cfgPresetSave\" data-section=\"flyer\" title=\"Aktuelle Einstellungen als Vorlage speichern\">+ Vorlage speichern</button>
            </div>
            <div id=\"cfg-presets-flyer\" style=\"display:flex;flex-direction:column;gap:4px\">
              <span style=\"font-size:11px;color:#9ca3af;font-style:italic\">Noch keine Vorlagen gespeichert.</span>
            </div>
          </div>
        </div>
      </div>·
      <!-- ════════════════════════════════════════════════ -->
      <!--  SECTION 3: GEMEINSAME EINSTELLUNGEN            -->
      <!-- ════════════════════════════════════════════════ -->
      <div id=\"cfg-sec-shared\" style=\"display:none\">
        <div style=\"background:linear-gradient(135deg,#fef3c7,#fde68a33);border:1px solid #d1d5db;border-radius:12px;padding:16px;margin-bottom:12px\">
          <div style=\"display:flex;align-items:center;gap:8px;margin-bottom:12px\">
            <span style=\"font-size:18px\">⚙</span>
            <div>
              <div style=\"font-size:14px;font-weight:800;color:#92400e\">Gemeinsame Einstellungen</div>
              <div style=\"font-size:11px;color:#6b7280\">Gelten für <strong>Plakat + Einzelflyer</strong> gleichermaßen</div>
            </div>
          </div>·
          <div class=\"cms-cfg-grid\">
            <div>
              <!-- Globale Farben -->
              <div class=\"cms-card\" style=\"margin-bottom:8px\">
                <div class=\"cms-card-header\" style=\"background:#92400e\">🎨 Globale Farben</div>
                <div class=\"cms-card-body\" style=\"display:flex;flex-direction:column;gap:10px\">
                  <p style=\"font-size:11px;color:#6b7280;margin:0\">Diese Farben gelten als Basis für Plakat &amp; Flyer. Individuelle Farben können pro Template oben angepasst werden.</p>
                  <label style=\"font-size:12px;font-weight:600;color:#374151\">Blatt/Icon-Grün
                    <input type=\"color\" id=\"cfg-leafColor\" value=\"#4a7c3f\" style=\"width:100%;height:32px;border:1px solid #d1d5db;border-radius:6px;cursor:pointer\">
                  </label>
                  <label style=\"font-size:12px;font-weight:600;color:#374151\">Preisschild-Farbe
                    <input type=\"color\" id=\"cfg-tagColor\" value=\"#a51d2d\" style=\"width:100%;height:32px;border:1px solid #d1d5db;border-radius:6px;cursor:pointer\">
                  </label>
                  <label style=\"font-size:12px;font-weight:600;color:#374151\">Statt-Preis Farbe
                    <input type=\"color\" id=\"cfg-stattColor\" value=\"#555555\" style=\"width:100%;height:32px;border:1px solid #d1d5db;border-radius:6px;cursor:pointer\">
                  </label>
                </div>
              </div>·
              <!-- Bild-Effekte -->
              <div class=\"cms-card\" style=\"margin-bottom:8px\">
                <div class=\"cms-card-header\" style=\"background:#92400e\">🖼 Bild-Effekte</div>
                <div class=\"cms-card-body\" style=\"display:flex;flex-direction:column;gap:10px\">
                  <label style=\"font-size:12px;font-weight:600;color:#374151\">Bild-Drehung
                    <div style=\"display:flex;align-items:center;gap:8px\">
                      <input type=\"range\" id=\"cfg-imgRotation\" min=\"0\" max=\"45\" value=\"15\" style=\"flex:1\">
                      <span id=\"cfg-imgRotation-val\" style=\"font-size:13px;min-width:32px;text-align:right\">15°</span>
                    </div>
                  </label>
                  <label style=\"font-size:12px;font-weight:600;color:#374151\">
                    <input type=\"checkbox\" id=\"cfg-imgFreistellen\" checked=\"\"> Weißen Hintergrund entfernen
                  </label>
                  <label style=\"font-size:12px;font-weight:600;color:#374151\">Freistell-Schwelle (heller = mehr entfernt)
                    <div style=\"display:flex;align-items:center;gap:8px\">
                      <input type=\"range\" id=\"cfg-imgThreshold\" min=\"200\" max=\"252\" value=\"230\" style=\"flex:1\">
                      <span id=\"cfg-imgThreshold-val\" style=\"font-size:13px;min-width:32px;text-align:right\">230</span>
                    </div>
                  </label>
                  <label style=\"font-size:12px;font-weight:600;color:#374151\">Max. Bild-Skalierung
                    <div style=\"display:flex;align-items:center;gap:8px\">
                      <input type=\"range\" id=\"cfg-imgMaxScale\" min=\"1\" max=\"6\" step=\"0.5\" value=\"4\" style=\"flex:1\">
                      <span id=\"cfg-imgMaxScale-val\" style=\"font-size:13px;min-width:32px;text-align:right\">4x</span>
                    </div>
                  </label>
                </div>
              </div>
            </div>
            <div>
              <!-- Preisschild-Form (Fallback / Legacy – per-section controls exist in Plakat + Flyer) -->
              <div class=\"cms-card\" style=\"margin-bottom:8px;opacity:0.6\">
                <div class=\"cms-card-header\" style=\"background:#92400e\">💵 Preisschild-Form <span style=\"font-size:9px;font-weight:400;opacity:0.8\">(Fallback – bitte oben pro Sektion einstellen)</span></div>
                <div class=\"cms-card-body\" style=\"display:flex;flex-direction:column;gap:10px\">
                  <label style=\"font-size:12px;font-weight:600;color:#374151\">Preisschild-Vorlage
                    <select id=\"cfg-tagPreset\" class=\"cms-input\" style=\"margin-top:4px\">
                      <option value=\"\">— Manuell —</option>
                      <option value=\"classic-red-rect\">Classic Rot (Rechteck)</option>
                      <option value=\"green-rounded\">Naturgrün (Abgerundet)</option>
                      <option value=\"dark-pill\">Dark Elegance (Pill)</option>
                      <option value=\"gold-banner\">Gold Banner (Fahne)</option>
                      <option value=\"blue-circle\">Ocean Badge (Kreis)</option>
                      <option value=\"orange-star\">Sunrise Stern</option>
                      <option value=\"purple-hexagon\">Berry Hexagon</option>
                      <option value=\"teal-ticket\">Teal Coupon (Ticket)</option>
                      <option value=\"rose-diamond\">Rosé Diamant</option>
                      <option value=\"copper-explosion\">Copper Burst (Explosion)</option>
                    </select>
                  </label>
                  <label style=\"font-size:12px;font-weight:600;color:#374151\">Preisschild-Form
                    <select id=\"cfg-tagShape\" class=\"cms-input\" style=\"margin-top:4px\">
                      <option value=\"rect\">Rechteck</option>
                      <option value=\"rounded\">Abgerundet</option>
                      <option value=\"pill\">Pill / Oval</option>
                      <option value=\"circle\">Kreis / Badge</option>
                      <option value=\"banner\">Fahne / Banner</option>
                      <option value=\"star\">Stern</option>
                      <option value=\"hexagon\">Hexagon</option>
                      <option value=\"diamond\">Diamant / Raute</option>
                      <option value=\"ticket\">Ticket / Coupon</option>
                      <option value=\"explosion\">Explosion / Burst</option>
                      <option value=\"trapez\">Trapez</option>
                    </select>
                  </label>
                  <label style=\"font-size:12px;font-weight:600;color:#374151\">Ecken-Rundung
                    <div style=\"display:flex;align-items:center;gap:8px\">
                      <input type=\"range\" id=\"cfg-tagRadius\" min=\"0\" max=\"40\" value=\"0\" style=\"flex:1\">
                      <span id=\"cfg-tagRadius-val\" style=\"font-size:13px;min-width:32px;text-align:right\">0px</span>
                    </div>
                  </label>
                  <label style=\"font-size:12px;font-weight:600;color:#374151\">Preisschild-Neigung
                    <div style=\"display:flex;align-items:center;gap:8px\">
                      <input type=\"range\" id=\"cfg-tagSkew\" min=\"0\" max=\"30\" value=\"18\" style=\"flex:1\">
                      <span id=\"cfg-tagSkew-val\" style=\"font-size:13px;min-width:32px;text-align:right\">18%</span>
                    </div>
                  </label>
                </div>
              </div>·
              <!-- Dekoration (Fallback / Legacy – per-section controls exist in Plakat + Flyer) -->
              <div class=\"cms-card\" style=\"margin-bottom:8px;opacity:0.6\">
                <div class=\"cms-card-header\" style=\"background:#92400e\">🌿 Dekoration <span style=\"font-size:9px;font-weight:400;opacity:0.8\">(Fallback – bitte oben pro Sektion einstellen)</span></div>
                <div class=\"cms-card-body\" style=\"display:flex;flex-direction:column;gap:10px\">
                  <div style=\"padding:10px;background:#f9fafb;border:1px solid #e5e7eb;border-radius:8px\">
                    <div style=\"font-size:11px;font-weight:700;color:#6b7280;margin-bottom:6px\">🎨 Deko-Farben</div>
                    <div style=\"display:grid;grid-template-columns:1fr 1fr;gap:6px\">
                      <label style=\"font-size:11px;color:#374151\">Blatt/Icon-Grün<input type=\"color\" id=\"cfg-decoLeafColor\" value=\"#4a7c3f\" style=\"width:100%;height:24px;border:1px solid #d1d5db;border-radius:4px;cursor:pointer\"></label>
                      <label style=\"font-size:11px;color:#374151\">Titel-Farbe<input type=\"color\" id=\"cfg-decoTitleColor\" value=\"#a51d2d\" style=\"width:100%;height:24px;border:1px solid #d1d5db;border-radius:4px;cursor:pointer\"></label>
                      <label style=\"font-size:11px;color:#374151\">Hintergrund<input type=\"color\" id=\"cfg-decoBgColor\" value=\"#f4f1ea\" style=\"width:100%;height:24px;border:1px solid #d1d5db;border-radius:4px;cursor:pointer\"></label>
                      <label style=\"font-size:11px;color:#374151\">Footer-Farbe<input type=\"color\" id=\"cfg-decoFooterColor\" value=\"#8aad7e\" style=\"width:100%;height:24px;border:1px solid #d1d5db;border-radius:4px;cursor:pointer\"></label>
                    </div>
                  </div>
                  <label style=\"font-size:12px;font-weight:600;color:#374151\">
                    <input type=\"checkbox\" id=\"cfg-showLeaf\"> Blatt-Deko anzeigen
                  </label>
                  <label style=\"font-size:12px;font-weight:600;color:#374151\">Blatt-Größe
                    <div style=\"display:flex;align-items:center;gap:8px\">
                      <input type=\"range\" id=\"cfg-leafSize\" min=\"16\" max=\"50\" value=\"34\" style=\"flex:1\">
                      <span id=\"cfg-leafSize-val\" style=\"font-size:13px;min-width:32px;text-align:right\">34px</span>
                    </div>
                  </label>
                  <label style=\"font-size:12px;font-weight:600;color:#374151\">
                    <input type=\"checkbox\" id=\"cfg-showBag\"> Einkaufstaschen-Icon anzeigen
                  </label>
                  <label style=\"font-size:12px;font-weight:600;color:#374151\">
                    <input type=\"checkbox\" id=\"cfg-showTexture\" checked=\"\"> Papier-Textur anzeigen
                  </label>
                </div>
              </div>·
              <!-- Ersparnis-Marker -->
              <div class=\"cms-card\" style=\"margin-bottom:8px\">
                <div class=\"cms-card-header\" style=\"background:#92400e\">⭐ Ersparnis-Marker</div>
                <div class=\"cms-card-body\" style=\"display:flex;flex-direction:column;gap:10px\">
                  <label style=\"font-size:12px;font-weight:600;color:#374151\">Ersparnis-Stern Stil
                    <select id=\"cfg-savingsStarStyle\" class=\"cms-input\" style=\"margin-top:6px\">
                      <option value=\"harmonie\">Harmonie (Grün, Standard)</option>
                      <option value=\"classic-red\">Classic Red (SALE Rot)</option>
                      <option value=\"warm-copper\">Warm Copper (Edel)</option>
                      <option value=\"berry-purple\">Berry Purple</option>
                      <option value=\"ocean-blue\">Ocean Blue</option>
                      <option value=\"sunset-orange\">Sunset Orange</option>
                      <option value=\"fresh-lime\">Fresh Lime</option>
                      <option value=\"deep-rose\">Deep Rose</option>
                      <option value=\"midnight-gold\">Midnight Gold</option>
                      <option value=\"arctic-teal\">Arctic Teal</option>
                    </select>
                  </label>
                  <label style=\"font-size:12px;font-weight:600;color:#374151\">Ersparnis-Marker Typ
                    <select id=\"cfg-savingsMarkerType\" class=\"cms-input\" style=\"margin-top:6px\">
                      <option value=\"starburst\">Stern (Zacken)</option>
                      <option value=\"badge\">Badge (rund)</option>
                      <option value=\"pill\">Pill (oval)</option>
                      <option value=\"flag\">Flag (schräg)</option>
                      <option value=\"hexburst\">Hex-Burst (6-Zacken)</option>
                      <option value=\"diamond\">Diamant</option>
                      <option value=\"shield\">Schild / Shield</option>
                      <option value=\"ribbon\">Ribbon / Band</option>
                      <option value=\"explosion\">Explosion (viele Zacken)</option>
                      <option value=\"heart\">Herz</option>
                    </select>
                  </label>
                  <label style=\"font-size:12px;font-weight:600;color:#374151\">Ersparnis-Farbwelt
                    <select id=\"cfg-savingsPalette\" class=\"cms-input\" style=\"margin-top:6px\">
                      <option value=\"harmonie\">Harmonie Grün</option>
                      <option value=\"classic-red\">Classic SALE Rot</option>
                      <option value=\"warm-copper\">Warm Copper</option>
                      <option value=\"berry-purple\">Berry Purple</option>
                      <option value=\"ocean-blue\">Ocean Blue</option>
                      <option value=\"sunset-orange\">Sunset Orange</option>
                      <option value=\"fresh-lime\">Fresh Lime</option>
                      <option value=\"deep-rose\">Deep Rose</option>
                      <option value=\"midnight-gold\">Midnight Gold</option>
                      <option value=\"arctic-teal\">Arctic Teal</option>
                    </select>
                  </label>
                  <div class=\"cms-savings-preview\">
                    <div class=\"cms-savings-preview-title\">Vorschau</div>
                    <canvas id=\"cfg-savingsPreviewCanvas\" class=\"cms-savings-preview-canvas\" width=\"280\" height=\"72\"></canvas>
                  </div>
                </div>
              </div>
            </div>
          </div>·
          <!-- Shared Action Buttons -->
          <div style=\"display:flex;gap:6px;flex-wrap:wrap;margin-top:8px\">
            <button class=\"cms-btn cms-btn-primary\" data-action=\"saveCfg\">💾 Alle Einstellungen speichern</button>
            <button class=\"cms-btn cms-btn-gray\" data-action=\"cfgRevertUnsaved\" title=\"Ungespeicherte Änderungen verwerfen\">↺ Verwerfen</button>
            <button class=\"cms-btn cms-btn-gray\" data-action=\"resetCfg\">Auf Defaults zurücksetzen</button>
          </div>
          <!-- Vorlagen -->
          <div style=\"margin-top:10px;padding:10px;background:#f9fafb;border:1px solid #e5e7eb;border-radius:8px\">
            <div style=\"display:flex;align-items:center;justify-content:space-between;margin-bottom:6px\">
              <span style=\"font-size:11px;font-weight:700;color:#6b7280;text-transform:uppercase;letter-spacing:.3px\">📂 Vorlagen</span>
              <button class=\"cms-btn cms-btn-gray cms-btn-sm\" data-action=\"cfgPresetSave\" data-section=\"shared\" title=\"Aktuelle gemeinsame Einstellungen als Vorlage speichern\">+ Vorlage speichern</button>
            </div>
            <div id=\"cfg-presets-shared\" style=\"display:flex;flex-direction:column;gap:4px\">
              <span style=\"font-size:11px;color:#9ca3af;font-style:italic\">Noch keine Vorlagen gespeichert.</span>
            </div>
          </div>
        </div>
      </div>
      </div><!-- /cfg-split-left -->·
      <div class=\"cfg-split-right\">
        <div class=\"cfg-lp-inner\">
          <div style=\"font-size:12px;font-weight:700;color:#374151;margin-bottom:8px;text-align:center\">👁 Live-Vorschau</div>
          <div id=\"cfg-live-preview-plakat\" style=\"min-height:80px;display:flex;align-items:center;justify-content:center;background:#f9fafb;border-radius:6px\">
            <span style=\"font-size:11px;color:#9ca3af;text-align:center;padding:8px\">Vorschau wird beim Ändern automatisch aktualisiert</span>
          </div>
          <div id=\"cfg-live-preview-flyer\" style=\"min-height:80px;display:none;align-items:center;justify-content:center;background:#f9fafb;border-radius:6px\">
            <span style=\"font-size:11px;color:#9ca3af;text-align:center;padding:8px\">Vorschau wird beim Ändern automatisch aktualisiert</span>
          </div>
          <div style=\"display:flex;gap:6px;justify-content:center;margin-top:8px;flex-wrap:wrap\">
            <button type=\"button\" class=\"cms-btn cms-btn-gray cms-btn-sm\" id=\"cfg-lp-refresh-btn\" data-action=\"cfgLivePreview\" data-target=\"plakat\">🔄 Aktualisieren</button>
            <label style=\"font-size:11px;color:#6b7280;display:flex;align-items:center;gap:4px;cursor:pointer\"><input type=\"checkbox\" id=\"cfg-live-auto-plakat\" checked=\"\" style=\"margin:0\"> Auto</label>
            <input type=\"checkbox\" id=\"cfg-live-auto-flyer\" checked=\"\" style=\"display:none\">
          </div>
        </div>
      </div><!-- /cfg-split-right -->·
      </div><!-- /cfg-split -->
      <div style=\"margin-top:14px;display:flex;gap:8px;flex-wrap:wrap\">
        <button class=\"cms-btn cms-btn-primary\" id=\"cfg-plakat-save\" data-action=\"savePlakatCfg\">💾 Speichern</button>
        <span id=\"cfg-plakat-saved-hint\" style=\"display:none;font-size:.82rem;color:#16a34a;font-weight:600;align-self:center\">✅ Gespeichert!</span>
      </div>
    </div>·
    <!-- ============ SUB-TAB: HP-Sonderangebote ============ -->
    <div id=\"cms-cfg-hpang\" style=\"display:none\">
      <p style=\"font-size:12px;color:#6b7280;margin:0 0 14px\">Gestalte die Sonderangebote-Kacheln, wie sie auf der <strong>Startseite</strong> für Besucher angezeigt werden.</p>·
      <!-- Live Preview -->
      <div style=\"background:#fff;border:1px solid #e5e7eb;border-radius:12px;overflow:hidden;margin-bottom:16px\">
        <div style=\"display:flex;align-items:center;justify-content:space-between;padding:10px 14px;background:#f9fafb;border-bottom:1px solid #e5e7eb\">
          <span style=\"font-size:13px;font-weight:700;color:#374151\">👁 Live-Vorschau</span>
          <div style=\"display:flex;gap:4px;background:#e5e7eb;border-radius:6px;padding:2px\">
            <button class=\"cms-btn cms-btn-sm hpang-view-btn active\" data-action=\"hpangView\" data-mode=\"desktop\" style=\"font-size:10px;padding:3px 10px;border-radius:4px;border:none;cursor:pointer;font-weight:600\">🖥 Desktop</button>
            <button class=\"cms-btn cms-btn-sm hpang-view-btn\" data-action=\"hpangView\" data-mode=\"mobile\" style=\"font-size:10px;padding:3px 10px;border-radius:4px;border:none;cursor:pointer;font-weight:600;background:transparent;color:#6b7280\">📱 Mobil</button>
          </div>
        </div>
        <div id=\"hpang-preview-wrap\" style=\"padding:16px;background:#f4f1ea;transition:all .3s ease;overflow-x:auto\">
          <div id=\"hpang-preview\" style=\"margin:0 auto;transition:all .3s ease\">
            <!-- Preview gets rendered by JS -->
          </div>
        </div>
      </div>·
      <!-- Design Controls -->
      <div class=\"cms-cfg-grid\">
        <!-- Card Farben -->
        <div>
          <div class=\"cms-card\">
            <div class=\"cms-card-header\">🎨 Kachel-Farben</div>
            <div class=\"cms-card-body\" style=\"display:flex;flex-direction:column;gap:8px\">
              <div style=\"display:flex;align-items:center;gap:8px\">
                <label style=\"font-size:11px;font-weight:600;color:#374151;min-width:100px\">Hintergrund</label>
                <input type=\"color\" id=\"hpang-gridBg\" value=\"#f4f1ea\" class=\"hpang-ctl\" style=\"width:32px;height:24px;border:1px solid #d1d5db;border-radius:4px;cursor:pointer\">
              </div>
              <div style=\"display:flex;align-items:center;gap:8px\">
                <label style=\"font-size:11px;font-weight:600;color:#374151;min-width:100px\">Karten-BG</label>
                <input type=\"color\" id=\"hpang-cardBg\" value=\"#ffffff\" class=\"hpang-ctl\" style=\"width:32px;height:24px;border:1px solid #d1d5db;border-radius:4px;cursor:pointer\">
              </div>
              <div style=\"display:flex;align-items:center;gap:8px\">
                <label style=\"font-size:11px;font-weight:600;color:#374151;min-width:100px\">Rahmen</label>
                <input type=\"color\" id=\"hpang-cardBorder\" value=\"#e8e5de\" class=\"hpang-ctl\" style=\"width:32px;height:24px;border:1px solid #d1d5db;border-radius:4px;cursor:pointer\">
              </div>
              <div style=\"display:flex;align-items:center;gap:8px\">
                <label style=\"font-size:11px;font-weight:600;color:#374151;min-width:100px\">Produktname</label>
                <input type=\"color\" id=\"hpang-nameColor\" value=\"#111111\" class=\"hpang-ctl\" style=\"width:32px;height:24px;border:1px solid #d1d5db;border-radius:4px;cursor:pointer\">
              </div>
              <div style=\"display:flex;align-items:center;gap:8px\">
                <label style=\"font-size:11px;font-weight:600;color:#374151;min-width:100px\">Details</label>
                <input type=\"color\" id=\"hpang-detColor\" value=\"#555555\" class=\"hpang-ctl\" style=\"width:32px;height:24px;border:1px solid #d1d5db;border-radius:4px;cursor:pointer\">
              </div>
            </div>
          </div>
        </div>
        <!-- Preis-Tag -->
        <div>
          <div class=\"cms-card\">
            <div class=\"cms-card-header\">🏷 Preis-Tag</div>
            <div class=\"cms-card-body\" style=\"display:flex;flex-direction:column;gap:8px\">
              <div style=\"display:flex;align-items:center;gap:8px\">
                <label style=\"font-size:11px;font-weight:600;color:#374151;min-width:100px\">Tag-Farbe</label>
                <input type=\"color\" id=\"hpang-tagBg\" value=\"#a51d2d\" class=\"hpang-ctl\" style=\"width:32px;height:24px;border:1px solid #d1d5db;border-radius:4px;cursor:pointer\">
              </div>
              <div style=\"display:flex;align-items:center;gap:8px\">
                <label style=\"font-size:11px;font-weight:600;color:#374151;min-width:100px\">Tag-Text</label>
                <input type=\"color\" id=\"hpang-tagText\" value=\"#ffffff\" class=\"hpang-ctl\" style=\"width:32px;height:24px;border:1px solid #d1d5db;border-radius:4px;cursor:pointer\">
              </div>
              <div style=\"display:flex;align-items:center;gap:8px\">
                <label style=\"font-size:11px;font-weight:600;color:#374151;min-width:100px\">Badge-Farbe</label>
                <input type=\"color\" id=\"hpang-badgeBg\" value=\"#a51d2d\" class=\"hpang-ctl\" style=\"width:32px;height:24px;border:1px solid #d1d5db;border-radius:4px;cursor:pointer\">
              </div>
              <div style=\"display:flex;align-items:center;gap:8px\">
                <label style=\"font-size:11px;font-weight:600;color:#374151;min-width:100px\">Statt-Preis</label>
                <input type=\"color\" id=\"hpang-stattColor\" value=\"#666666\" class=\"hpang-ctl\" style=\"width:32px;height:24px;border:1px solid #d1d5db;border-radius:4px;cursor:pointer\">
              </div>
              <div style=\"display:flex;align-items:center;gap:8px\">
                <label style=\"font-size:11px;font-weight:600;color:#374151;min-width:100px\">Tag-Neigung</label>
                <input type=\"range\" id=\"hpang-tagSkew\" value=\"-4\" min=\"-10\" max=\"10\" step=\"1\" class=\"hpang-ctl\" style=\"flex:1\">
                <span id=\"hpang-tagSkew-val\" style=\"font-size:10px;color:#6b7280;min-width:28px;text-align:right\">-4°</span>
              </div>
              <div style=\"display:flex;align-items:center;gap:8px\">
                <label style=\"font-size:11px;font-weight:600;color:#374151;min-width:100px\">Tag-Rundung</label>
                <input type=\"range\" id=\"hpang-tagRadius\" value=\"5\" min=\"0\" max=\"20\" step=\"1\" class=\"hpang-ctl\" style=\"flex:1\">
                <span id=\"hpang-tagRadius-val\" style=\"font-size:10px;color:#6b7280;min-width:28px;text-align:right\">5px</span>
              </div>
            </div>
          </div>
        </div>
        <!-- Header -->
        <div>
          <div class=\"cms-card\">
            <div class=\"cms-card-header\">🖌 Header-Bereich</div>
            <div class=\"cms-card-body\" style=\"display:flex;flex-direction:column;gap:8px\">
              <div style=\"display:flex;align-items:center;gap:8px\">
                <label style=\"font-size:11px;font-weight:600;color:#374151;min-width:100px\">Header-BG</label>
                <input type=\"color\" id=\"hpang-headerBg\" value=\"#c62828\" class=\"hpang-ctl\" style=\"width:32px;height:24px;border:1px solid #d1d5db;border-radius:4px;cursor:pointer\">
              </div>
              <div style=\"display:flex;align-items:center;gap:8px\">
                <label style=\"font-size:11px;font-weight:600;color:#374151;min-width:100px\">Header-Text</label>
                <input type=\"color\" id=\"hpang-headerText\" value=\"#ffffff\" class=\"hpang-ctl\" style=\"width:32px;height:24px;border:1px solid #d1d5db;border-radius:4px;cursor:pointer\">
              </div>
            </div>
          </div>
        </div>
        <!-- Layout -->
        <div>
          <div class=\"cms-card\">
            <div class=\"cms-card-header\">🛠 Layout</div>
            <div class=\"cms-card-body\" style=\"display:flex;flex-direction:column;gap:8px\">
              <div style=\"display:flex;align-items:center;gap:8px\">
                <label style=\"font-size:11px;font-weight:600;color:#374151;min-width:100px\">Karten-Rundung</label>
                <input type=\"range\" id=\"hpang-cardRadius\" value=\"16\" min=\"0\" max=\"30\" step=\"1\" class=\"hpang-ctl\" style=\"flex:1\">
                <span id=\"hpang-cardRadius-val\" style=\"font-size:10px;color:#6b7280;min-width:28px;text-align:right\">16px</span>
              </div>
              <div style=\"display:flex;align-items:center;gap:8px\">
                <label style=\"font-size:11px;font-weight:600;color:#374151;min-width:100px\">Bild-Größe</label>
                <input type=\"range\" id=\"hpang-imgSize\" value=\"95\" min=\"60\" max=\"140\" step=\"5\" class=\"hpang-ctl\" style=\"flex:1\">
                <span id=\"hpang-imgSize-val\" style=\"font-size:10px;color:#6b7280;min-width:28px;text-align:right\">95px</span>
              </div>
              <div style=\"display:flex;align-items:center;gap:8px\">
                <label style=\"font-size:11px;font-weight:600;color:#374151;min-width:100px\">Blatt-Icon</label>
                <input type=\"checkbox\" id=\"hpang-showLeaf\" checked=\"\" class=\"hpang-ctl\">
              </div>
              <div style=\"display:flex;align-items:center;gap:8px\">
                <label style=\"font-size:11px;font-weight:600;color:#374151;min-width:100px\">Warenkorb-Icon</label>
                <input type=\"checkbox\" id=\"hpang-showBasket\" checked=\"\" class=\"hpang-ctl\">
              </div>
            </div>
          </div>
        </div>
      </div>·
      <!-- Actions -->
      <div style=\"display:flex;gap:8px;flex-wrap:wrap;margin-top:12px\">
        <button class=\"cms-btn cms-btn-primary\" data-action=\"hpangSave\">💾 Speichern</button>
        <button class=\"cms-btn cms-btn-gray\" data-action=\"hpangRevert\">↺ Verwerfen</button>
        <button class=\"cms-btn cms-btn-gray\" data-action=\"hpangReset\">Auf Defaults zurücksetzen</button>
      </div>
    </div>·
  </div>·
  <!-- Bestellungen-Bereich -->
  <div id=\"cms-panel-orders\" style=\"display:none\">
    <div class=\"cms-card\">
      <div class=\"cms-card-header\">🛍 Bestellungen verwalten</div>
      <div class=\"cms-card-body\">
        <div style=\"display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px;margin-bottom:12px\">
          <div style=\"display:flex;gap:6px;flex-wrap:wrap\">
            <select id=\"cms-orders-filter\" style=\"padding:6px 10px;border:1px solid #e5e7eb;border-radius:6px;font-size:12px;font-family:inherit\">
              <option value=\"all\">Alle Status</option>
              <option value=\"0\" selected=\"\">Neu</option>
              <option value=\"1\">In Bearbeitung</option>
              <option value=\"2\">Abholbereit</option>
              <option value=\"3\">Abgeholt</option>
              <option value=\"4\">Storniert</option>
            </select>
            <button class=\"cms-btn cms-btn-primary cms-btn-sm\" onclick=\"cmsLoadOrders()\">🔄 Aktualisieren</button>
          </div>
          <div style=\"display:flex;gap:6px;flex-wrap:wrap\">
            <a href=\"/shop.html\" target=\"_blank\" class=\"cms-btn cms-btn-sm\" style=\"background:#fff7ed;color:#9a3412;border:1px solid #fed7aa;text-decoration:none\">🛒 Shop öffnen</a>
            <button class=\"cms-btn cms-btn-sm\" style=\"background:#f0fdf4;color:#166534;border:1px solid #bbf7d0\" onclick=\"cmsPrintOrders()\">🖨 Kommissionierliste drucken</button>
          </div>
        </div>
        <div id=\"cms-orders-list\" style=\"font-size:13px\">
          <p style=\"color:#6b7280;text-align:center;padding:20px\">Klicken Sie \"Aktualisieren\" um Bestellungen zu laden</p>
        </div>
      </div>
    </div>
    <div class=\"cms-card\">
      <div class=\"cms-card-header\">👥 Registrierte Kunden</div>
      <div class=\"cms-card-body\">
        <div style=\"margin-bottom:12px\"><button class=\"cms-btn cms-btn-primary cms-btn-sm\" onclick=\"cmsLoadKunden()\">🔄 Kunden laden</button></div>
        <div id=\"cms-kunden-list\" style=\"font-size:13px\">
          <p style=\"color:#6b7280;text-align:center;padding:20px\">Klicken Sie \"Kunden laden\" um die Kundenliste anzuzeigen</p>
        </div>
      </div>
    </div>
  </div>·
  <!-- Metzger (Fleisch-Vorbestellung) -->
  <div id=\"cms-panel-metzger\" style=\"display:none\">
    <div class=\"cms-card\">
      <div class=\"cms-card-header\" style=\"background:#7f1d1d!important\">Konfiguration</div>
      <div class=\"cms-card-body\">
        <div style=\"display:flex;align-items:center;gap:12px;margin-bottom:16px;padding:8px 12px;background:#fef2f2;border:1px solid #fecaca;border-radius:8px\">
          <label style=\"font-size:13px;font-weight:700;display:flex;align-items:center;gap:6px;cursor:pointer;color:#991b1b\"><input type=\"checkbox\" id=\"fm-cfg-aktiv\" checked=\"\"> Vorbestellung aktiviert</label>
        </div>
        <div class=\"cms-flex\" style=\"gap:16px;flex-wrap:wrap;margin-bottom:16px\">
          <div style=\"flex:1;min-width:200px\">
            <label class=\"cms-label\">Rabatt (%)</label>
            <input class=\"cms-input\" type=\"number\" id=\"fm-cfg-rabatt\" value=\"15\" min=\"0\" max=\"50\" step=\"1\">
          </div>
          <div style=\"flex:1;min-width:200px\">
            <label class=\"cms-label\">Mindestmenge (kg)</label>
            <input class=\"cms-input\" type=\"number\" id=\"fm-cfg-mindestmenge\" value=\"1\" min=\"0.5\" max=\"10\" step=\"0.5\">
          </div>
          <div style=\"flex:1;min-width:200px\">
            <label class=\"cms-label\">Bestellschluss (Uhrzeit)</label>
            <input class=\"cms-input\" type=\"number\" id=\"fm-cfg-bestellschluss\" value=\"10\" min=\"0\" max=\"23\" step=\"1\">
          </div>
        </div>
        <div class=\"cms-flex\" style=\"gap:16px;flex-wrap:wrap;margin-bottom:16px\">
          <div style=\"flex:1;min-width:200px\">
            <label class=\"cms-label\">Liefertage</label>
            <div style=\"display:flex;gap:8px;flex-wrap:wrap\">
              <label style=\"font-size:13px;display:flex;align-items:center;gap:4px\"><input type=\"checkbox\" id=\"fm-cfg-lt-mo\" checked=\"\"> Mo</label>
              <label style=\"font-size:13px;display:flex;align-items:center;gap:4px\"><input type=\"checkbox\" id=\"fm-cfg-lt-di\"> Di</label>
              <label style=\"font-size:13px;display:flex;align-items:center;gap:4px\"><input type=\"checkbox\" id=\"fm-cfg-lt-mi\"> Mi</label>
              <label style=\"font-size:13px;display:flex;align-items:center;gap:4px\"><input type=\"checkbox\" id=\"fm-cfg-lt-do\" checked=\"\"> Do</label>
              <label style=\"font-size:13px;display:flex;align-items:center;gap:4px\"><input type=\"checkbox\" id=\"fm-cfg-lt-fr\"> Fr</label>
              <label style=\"font-size:13px;display:flex;align-items:center;gap:4px\"><input type=\"checkbox\" id=\"fm-cfg-lt-sa\"> Sa</label>
            </div>
          </div>
        </div>
        <div style=\"display:flex;gap:8px\">
          <button class=\"cms-btn cms-btn-primary\" onclick=\"cmsSaveFleischConfig()\" id=\"fm-cfg-save-btn\">Konfiguration speichern</button>
          <span id=\"fm-cfg-status\" style=\"font-size:12px;color:#2e7d4f;align-self:center\"></span>
        </div>
      </div>
    </div>
    <div class=\"cms-card\" style=\"margin-top:16px\">
      <div class=\"cms-card-header\" style=\"background:#7f1d1d!important\">Bestellungen</div>
      <div class=\"cms-card-body\">
        <div style=\"display:flex;gap:8px;margin-bottom:12px;flex-wrap:wrap\">
          <button class=\"cms-btn\" onclick=\"cmsLoadFleischOrders('offen')\" id=\"fm-orders-btn-offen\" style=\"font-size:12px;background:#fef2f2;color:#991b1b;border:1px solid #fecaca\">Offene</button>
          <button class=\"cms-btn\" onclick=\"cmsLoadFleischOrders('alle')\" id=\"fm-orders-btn-alle\" style=\"font-size:12px\">Alle</button>
          <button class=\"cms-btn\" onclick=\"cmsLoadFleischOrders('heute')\" id=\"fm-orders-btn-heute\" style=\"font-size:12px\">Heute Liefertag</button>
          <button class=\"cms-btn\" onclick=\"cmsLoadFleischOrders('sammel')\" id=\"fm-orders-btn-sammel\" style=\"font-size:12px;background:#f0fdf4;color:#166534;border:1px solid #bbf7d0\">Sammelbestellung</button>
        </div>
        <div id=\"fm-orders-list\" style=\"font-size:13px;color:#6b7280\">Klicken Sie auf einen Filter um Bestellungen zu laden.</div>
      </div>
    </div>
  </div>·
  <!-- Social Media -->
  <div id=\"cms-panel-social\" style=\"display:none\">
    <div class=\"cms-flex cms-between cms-mb\">
      <h3 style=\"font-size:15px;font-weight:700;color:#1f2937;margin:0\"><i data-lucide=\"share-2\" style=\"width:16px;height:16px;vertical-align:middle\"></i> Social Media – Tagespost</h3>
    </div>
    <p style=\"font-size:12px;color:#6b7280;margin:0 0 14px\">Tägliche Angebote zusammenstellen und auf WhatsApp &amp; Instagram teilen. Pflegen Sie Ihren Produktkatalog und erstellen Sie ansprechende Posts.</p>·
    <!-- Sub-Tabs: Neuer Post | Katalog -->
    <div style=\"display:flex;gap:4px;background:#f3f4f6;border-radius:8px;padding:3px;margin-bottom:16px\">
      <button class=\"cms-btn\" id=\"social-subtab-post\" onclick=\"socialSubTab('post')\" style=\"flex:1;border:none;border-radius:6px;padding:8px;font-size:12px;font-weight:700;background:#fff;color:#2e7d4f;box-shadow:0 1px 3px rgba(0,0,0,.08)\"><i data-lucide=\"plus-circle\" style=\"width:14px;height:14px;vertical-align:middle\"></i> Neuer Post</button>
      <button class=\"cms-btn\" id=\"social-subtab-katalog\" onclick=\"socialSubTab('katalog')\" style=\"flex:1;border:none;border-radius:6px;padding:8px;font-size:12px;font-weight:700;background:transparent;color:#6b7280\"><i data-lucide=\"book-open\" style=\"width:14px;height:14px;vertical-align:middle\"></i> Katalog</button>
    </div>·
    <!-- ========== SUB: KATALOG ========== -->
    <div id=\"social-panel-katalog\" style=\"display:none\">
      <div class=\"cms-card\" style=\"margin-bottom:14px\">
        <div class=\"cms-card-header\" style=\"background:#2e7d4f\"><i data-lucide=\"plus\" style=\"width:16px;height:16px;vertical-align:middle\"></i> Neues Produkt zum Katalog hinzufügen</div>
        <div class=\"cms-card-body\">
          <div style=\"display:flex;gap:10px;flex-wrap:wrap;align-items:flex-end\">
            <div style=\"flex:2;min-width:160px\">
              <label style=\"font-size:11px;font-weight:700;color:#6b7280;display:block;margin-bottom:3px\">Name *</label>
              <input id=\"soc-kat-name\" class=\"cms-input\" placeholder=\"z.B. Geschnetzeltes mit Champignonrahm\" style=\"width:100%\">
            </div>
            <div style=\"flex:1;min-width:120px\">
              <label style=\"font-size:11px;font-weight:700;color:#6b7280;display:block;margin-bottom:3px\">Kategorie *</label>
              <select id=\"soc-kat-kategorie\" class=\"cms-input\" style=\"width:100%\">
                <!-- dynamisch bef&#252;llt via cms.js -->
              </select>
            </div>
            <div style=\"width:80px\">
              <label style=\"font-size:11px;font-weight:700;color:#6b7280;display:block;margin-bottom:3px\">Preis €</label>
              <input id=\"soc-kat-preis\" class=\"cms-input\" type=\"text\" inputmode=\"decimal\" placeholder=\"9,80\" style=\"width:100%\">
            </div>
            <div style=\"min-width:160px\">
              <label style=\"font-size:11px;font-weight:700;color:#6b7280;display:block;margin-bottom:3px\">Bild</label>
              <input id=\"soc-kat-bild\" type=\"file\" accept=\"image/*\" style=\"display:none\">
              <input id=\"soc-kat-bild-cam\" type=\"file\" accept=\"image/*\" capture=\"environment\" style=\"display:none\">
              <div style=\"display:flex;gap:6px;align-items:center\">
                <button type=\"button\" class=\"cms-btn cms-btn-gray\" onclick=\"document.getElementById('soc-kat-bild-cam').click()\" style=\"padding:8px 12px;font-size:12px;display:inline-flex;align-items:center;gap:4px\" title=\"Foto mit Kamera aufnehmen\"><i data-lucide=\"camera\" style=\"width:16px;height:16px\"></i> Kamera</button>
                <button type=\"button\" class=\"cms-btn cms-btn-gray\" onclick=\"document.getElementById('soc-kat-bild').click()\" style=\"padding:8px 12px;font-size:12px;display:inline-flex;align-items:center;gap:4px\" title=\"Bild aus Dateien wählen\"><i data-lucide=\"image\" style=\"width:16px;height:16px\"></i> Datei</button>
              </div>
            </div>
          </div>
          <button class=\"cms-btn cms-btn-primary\" onclick=\"socialKatAdd()\" style=\"white-space:nowrap;margin-top:10px;width:100%\"><i data-lucide=\"plus-circle\" style=\"width:16px;height:16px;vertical-align:middle\"></i> Hinzufügen</button>
          <!-- Paste-Zone -->
          <div id=\"soc-kat-paste-zone\" tabindex=\"0\" style=\"margin-top:8px;border:2px dashed #d1d5db;border-radius:10px;padding:14px;text-align:center;cursor:pointer;transition:border-color .2s,background .2s;background:#fafbfc;outline:none\" onclick=\"document.getElementById('soc-kat-bild').click()\" title=\"Klicken zum Datei wählen oder Strg+V zum Einfügen\">
            <div id=\"soc-kat-paste-hint\" style=\"color:#9ca3af;font-size:12px\">
              <i data-lucide=\"clipboard-paste\" style=\"width:16px;height:16px;vertical-align:middle\"></i> <strong>Strg+V</strong> zum Einfügen oder <strong>klicken</strong> zum Datei wählen
            </div>
            <div id=\"soc-kat-bild-preview\" style=\"display:none;margin-top:6px\">
              <img id=\"soc-kat-bild-thumb\" style=\"max-width:120px;max-height:120px;border-radius:8px;border:1px solid #e5e7eb\">
              <button onclick=\"event.stopPropagation();socialClearBild()\" style=\"display:block;margin:6px auto 0;background:none;border:none;color:#dc2626;font-size:11px;cursor:pointer;text-decoration:underline\">✕ Bild entfernen</button>
            </div>
          </div>
        </div>
      </div>
      <div id=\"soc-kat-status\" style=\"display:none;padding:8px 12px;border-radius:8px;font-size:13px;margin-bottom:12px\"></div>
      <div id=\"soc-kat-loading\" style=\"display:none;text-align:center;padding:30px 0\">
        <div style=\"display:inline-block;width:28px;height:28px;border:3px solid #e5e7eb;border-top-color:#2e7d4f;border-radius:50%;animation:cms-spin 0.8s linear infinite\"></div>
        <div style=\"margin-top:8px;color:#6b7280;font-size:13px\">Katalog wird geladen…</div>
      </div>
      <div id=\"soc-kat-list\"></div>
      <div class=\"cms-empty\" id=\"soc-kat-empty\" style=\"display:none\">Noch keine Produkte im Katalog. Fügen Sie oben Ihr erstes Produkt hinzu.</div>
    </div>·
    <!-- ========== SUB: NEUER POST ========== -->
    <div id=\"social-panel-post\">
      <div class=\"cms-card\" style=\"margin-bottom:14px\">
        <div class=\"cms-card-header\" style=\"background:#25D366\"><i data-lucide=\"file-text\" style=\"width:16px;height:16px;vertical-align:middle\"></i> Tagespost zusammenstellen</div>
        <div class=\"cms-card-body\">
          <div style=\"margin-bottom:12px\">
            <label style=\"font-size:11px;font-weight:700;color:#6b7280;display:block;margin-bottom:3px\">Titel</label>
            <select id=\"soc-post-titel-sel\" class=\"cms-input\" onchange=\"socialTitelChange()\" style=\"width:100%\">
            <option value=\"Heute im Dorfladen – Dienstag\">Heute im Dorfladen – Dienstag</option><option value=\"Aktuelles\">Aktuelles</option><option value=\"Wochenangebot\">Wochenangebot</option><option value=\"Frisch eingetroffen\">Frisch eingetroffen</option><option value=\"Mittagstisch – Dienstag\">Mittagstisch – Dienstag</option><option value=\"Sonderangebot\">Sonderangebot</option><option value=\"_custom\">✏️ Eigenen Titel eingeben...</option></select>
            <input id=\"soc-post-titel\" class=\"cms-input\" placeholder=\"Eigenen Titel eingeben...\" style=\"width:100%;margin-top:4px;display:none\">
          </div>
          <script>
          (function(){
            var tage=['Sonntag','Montag','Dienstag','Mittwoch','Donnerstag','Freitag','Samstag'];
            var tag=tage[new Date().getDay()];
            var sel=document.getElementById('soc-post-titel-sel');
            if(!sel)return;
            var opts=[
              'Heute im Dorfladen \\u2013 '+tag,
              'Aktuelles',
              'Wochenangebot',
              'Frisch eingetroffen',
              'Mittagstisch \\u2013 '+tag,
              'Sonderangebot',
              '_custom'
            ];
            var labels={
              '_custom':'\\u270F\\uFE0F Eigenen Titel eingeben...'
            };
            opts.forEach(function(o){
              var op=document.createElement('option');
              op.value=o;
              op.textContent=labels[o]||o;
              sel.appendChild(op);
            });
            // Sync hidden input with default
            var inp=document.getElementById('soc-post-titel');
            if(inp) inp.value=opts[0];
          })();
          window.socialTitelChange=function(){
            var sel=document.getElementById('soc-post-titel-sel');
            var inp=document.getElementById('soc-post-titel');
            if(!sel||!inp)return;
            if(sel.value==='_custom'){
              inp.style.display='';
              inp.value='';
              inp.focus();
            } else {
              inp.style.display='none';
              inp.value=sel.value;
            }
          };
          </script>
          <div style=\"margin-bottom:12px\">
            <label style=\"font-size:11px;font-weight:700;color:#6b7280;display:block;margin-bottom:3px\">Freitext (optional)</label>
            <textarea id=\"soc-post-text\" class=\"cms-input\" rows=\"2\" placeholder=\"z.B. Frisch aus der Küche! Heute als Dessert: Erdbeer-Sahne-Torte 🍰\" style=\"width:100%;resize:vertical\"></textarea>
          </div>
          <p style=\"font-size:12px;font-weight:700;color:#374151;margin:0 0 8px\">Produkte auswählen:</p>
          <div id=\"soc-post-items\" style=\"display:flex;flex-direction:column;gap:6px\">
            <p style=\"color:#9ca3af;font-size:12px;font-style:italic\">Laden Sie zuerst den Katalog...</p>
          </div>
        </div>
      </div>·
      <!-- Vorschau -->
      <div class=\"cms-card\" style=\"margin-bottom:14px\">
        <div class=\"cms-card-header\"><i data-lucide=\"eye\" style=\"width:16px;height:16px;vertical-align:middle\"></i> Vorschau</div>
        <div class=\"cms-card-body\" style=\"text-align:center;padding:16px\">
          <div id=\"soc-preview-label-meal\" style=\"display:none;font-size:11px;font-weight:700;color:#f57f17;margin-bottom:4px\">🍽 MITTAGESSEN-POSTER</div>
          <canvas id=\"soc-post-canvas-meal\" width=\"540\" height=\"540\" style=\"display:none;max-width:100%;border-radius:10px;border:1px solid #e5e7eb;background:#faf9f6;margin-bottom:12px\"></canvas>
          <div id=\"soc-preview-label-daily\" style=\"display:none;font-size:11px;font-weight:700;color:#2e7d32;margin-bottom:4px\">📦 TAGESÜBERSICHT</div>
          <canvas id=\"soc-post-canvas\" width=\"540\" height=\"540\" style=\"display:none;max-width:100%;border-radius:10px;border:1px solid #e5e7eb;background:#faf9f6\"></canvas>
          <div style=\"margin-top:10px;display:flex;gap:8px;justify-content:center;flex-wrap:wrap\">
            <button class=\"cms-btn cms-btn-primary\" onclick=\"socialGenPreview()\" style=\"background:#2e7d4f\"><i data-lucide=\"refresh-cw\" style=\"width:14px;height:14px;vertical-align:middle\"></i> Vorschau aktualisieren</button>
          </div>
        </div>
      </div>·
      <!-- Teilen -->
      <div class=\"soc-share-bar\" style=\"display:flex;gap:10px;flex-wrap:wrap\">
        <button class=\"cms-btn cms-btn-primary\" onclick=\"socialShareWhatsApp()\" style=\"background:#25D366;flex:1;min-width:140px;padding:12px;font-size:14px\">
          <svg width=\"18\" height=\"18\" viewBox=\"0 0 24 24\" fill=\"currentColor\" style=\"vertical-align:middle;margin-right:6px\"><path d=\"M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z\"></path></svg>
          Auf WhatsApp teilen
        </button>
        <button class=\"cms-btn cms-btn-primary\" onclick=\"socialShareInstagram()\" style=\"background:linear-gradient(135deg,#f09433,#e6683c,#dc2743,#cc2366,#bc1888);flex:1;min-width:140px;padding:12px;font-size:14px\">
          <svg width=\"18\" height=\"18\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\" style=\"vertical-align:middle;margin-right:6px\"><rect width=\"20\" height=\"20\" x=\"2\" y=\"2\" rx=\"5\" ry=\"5\"></rect><path d=\"M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z\"></path><line x1=\"17.5\" x2=\"17.51\" y1=\"6.5\" y2=\"6.5\"></line></svg>
          Auf Instagram teilen
        </button>
        <button class=\"cms-btn cms-btn-gray\" onclick=\"socialDownloadPoster()\" style=\"min-width:100px;padding:12px;font-size:14px\"><i data-lucide=\"download\" style=\"width:16px;height:16px;vertical-align:middle\"></i> Bild speichern</button>
      </div>
      <div id=\"soc-meal-posters\" style=\"display:none;margin-top:12px;padding:12px;background:#fffbeb;border:1px solid #fde68a;border-radius:10px\">
        <div style=\"font-size:12px;font-weight:700;color:#92400e;margin-bottom:8px\">🍴 Einzel-Poster pro Gericht</div>
        <div id=\"soc-meal-poster-list\" style=\"display:flex;gap:8px;flex-wrap:wrap\"></div>
      </div>
      <div style=\"border-top:1px solid #e5e7eb;padding-top:12px;margin-top:12px\">
        <button class=\"cms-btn\" onclick=\"socialPublishTagesinfo()\" style=\"width:100%;padding:12px;font-size:14px;font-weight:700;background:#f0fdf4;border:2px solid #16a34a;border-radius:10px;color:#16a34a;display:flex;align-items:center;justify-content:center;gap:8px;cursor:pointer\">
          <i data-lucide=\"file-text\" style=\"width:16px;height:16px\"></i>
          Nur als Tagesinfo veröffentlichen
        </button>
        <div style=\"font-size:11px;color:#9ca3af;margin-top:5px;text-align:center\">Erscheint auf der Homepage – ohne WhatsApp/Instagram</div>
      </div>
      <div id=\"soc-post-status\" style=\"display:none;padding:8px 12px;border-radius:8px;font-size:13px;margin-top:10px\"></div>
      <div id=\"soc-today-posts\" style=\"display:none;margin-top:12px;background:#f9fafb;border:1px solid #e5e7eb;border-radius:10px;padding:10px 14px\">
        <div style=\"font-size:11px;font-weight:700;color:#6b7280;margin-bottom:6px\"><i data-lucide=\"clock\" style=\"width:12px;height:12px;vertical-align:middle\"></i> Heute bereits gepostet</div>
        <div id=\"soc-today-posts-list\"></div>
      </div>
    </div>
  </div>·
  <!-- Hilfe-Bereich -->
  <div id=\"cms-panel-help\" style=\"display:none\">·
    <!-- Kopfbereich -->
    <div style=\"background:#e8f5e9;border:1px solid #c8e6c9;border-radius:12px;padding:14px 16px;margin-bottom:14px;display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:10px\">
      <div>
        <h3 style=\"margin:0 0 3px;font-size:15px;color:#1b5e20\">📚 CMS-Handbuch – direkt lesbar</h3>
        <p style=\"margin:0;font-size:12px;color:#388e3c\">Alle Themen, Schritt-für-Schritt-Anleitungen und FAQ direkt hier – oder als PDF herunterladen.</p>
      </div>
      <div style=\"display:flex;gap:8px;flex-wrap:wrap\">
        <a href=\"handbuch/anwenderhandbuch.pdf\" target=\"_blank\" class=\"cms-btn cms-btn-primary\" style=\"background:#1b5e20;text-decoration:none;font-size:11px\">📥 CMS-PDF</a>
        <a href=\"handbuch/homepage-anwenderhandbuch.pdf\" target=\"_blank\" class=\"cms-btn cms-btn-gray\" style=\"text-decoration:none;font-size:11px\">📥 Homepage-PDF</a>
        <a href=\"handbuch/hilfe.html\" target=\"_blank\" class=\"cms-btn cms-btn-gray\" style=\"text-decoration:none;font-size:11px\">🌐 Online-Hilfe öffnen</a>
      </div>
    </div>·
    <!-- Suchfeld -->
    <div style=\"margin-bottom:14px;position:relative\">
      <span style=\"position:absolute;left:12px;top:50%;transform:translateY(-50%);font-size:15px;pointer-events:none\">🔍</span>
      <input type=\"text\" id=\"help-search-inp\" placeholder=\"Hilfe durchsuchen… z.B. „Bild freistellen“, „Drucken“, „Push“\" autocomplete=\"off\" style=\"width:100%;padding:10px 36px 10px 38px;border:1px solid #e5e7eb;border-radius:10px;font-size:13px;font-family:inherit;background:#fff;outline:none;transition:border-color .15s;box-sizing:border-box\" oninput=\"cmsHelpSearch(this.value)\">
      <button id=\"help-search-clear\" onclick=\"cmsHelpClearSearch()\" title=\"Löschen\" style=\"position:absolute;right:10px;top:50%;transform:translateY(-50%);background:none;border:none;cursor:pointer;color:#9ca3af;font-size:16px;display:none\">✕</button>
    </div>·
    <!-- Suchergebnis-Container -->
    <div id=\"help-search-results\" style=\"display:none;margin-bottom:12px\"></div>·
    <!-- Haupt-Layout -->
    <div id=\"help-main-layout\" style=\"display:grid;grid-template-columns:200px 1fr;gap:14px;align-items:start\">·
      <!-- Sidebar -->
      <div class=\"cms-card\" style=\"position:sticky;top:16px\">
        <div class=\"cms-card-header\" style=\"font-size:11px\">📌 Themen</div>
        <div style=\"display:flex;flex-direction:column\" id=\"help-tabs-container\">
          <button class=\"cms-subtab active\" onclick=\"cmsSwitchHelpTopic('wp-help')\" id=\"tab-wp-help\" style=\"text-align:left;border:none;border-bottom:1px solid #f3f4f6;padding:9px 12px;background:none;cursor:pointer;font-weight:600;font-size:12px;color:#1b5e20\">🍳 Wochenplan</button>
          <button class=\"cms-subtab\" onclick=\"cmsSwitchHelpTopic('hours-help')\" id=\"tab-hours-help\" style=\"text-align:left;border:none;border-bottom:1px solid #f3f4f6;padding:9px 12px;background:none;cursor:pointer;font-weight:600;font-size:12px;color:#4b5563\">🕐 Öffnungszeiten</button>
          <button class=\"cms-subtab\" onclick=\"cmsSwitchHelpTopic('ang-help')\" id=\"tab-ang-help\" style=\"text-align:left;border:none;border-bottom:1px solid #f3f4f6;padding:9px 12px;background:none;cursor:pointer;font-weight:600;font-size:12px;color:#4b5563\">🎁 Sonderangebote</button>
          <button class=\"cms-subtab\" onclick=\"cmsSwitchHelpTopic('news-help')\" id=\"tab-news-help\" style=\"text-align:left;border:none;border-bottom:1px solid #f3f4f6;padding:9px 12px;background:none;cursor:pointer;font-weight:600;font-size:12px;color:#4b5563\">📰 Aktuelles</button>
          <button class=\"cms-subtab\" onclick=\"cmsSwitchHelpTopic('hp-help')\" id=\"tab-hp-help\" style=\"text-align:left;border:none;border-bottom:1px solid #f3f4f6;padding:9px 12px;background:none;cursor:pointer;font-weight:600;font-size:12px;color:#4b5563\">🏠 Homepage</button>
          <button class=\"cms-subtab\" onclick=\"cmsSwitchHelpTopic('editor-help')\" id=\"tab-editor-help\" style=\"text-align:left;border:none;border-bottom:1px solid #f3f4f6;padding:9px 12px;background:none;cursor:pointer;font-weight:600;font-size:12px;color:#4b5563\">🎨 Kachel-Editor</button>
          <button class=\"cms-subtab\" onclick=\"cmsSwitchHelpTopic('design-help')\" id=\"tab-design-help\" style=\"text-align:left;border:none;border-bottom:1px solid #f3f4f6;padding:9px 12px;background:none;cursor:pointer;font-weight:600;font-size:12px;color:#4b5563\">🖌 Design</button>
          <button class=\"cms-subtab\" onclick=\"cmsSwitchHelpTopic('push-help')\" id=\"tab-push-help\" style=\"text-align:left;border:none;border-bottom:1px solid #f3f4f6;padding:9px 12px;background:none;cursor:pointer;font-weight:600;font-size:12px;color:#4b5563\">🔔 Push</button>
          <button class=\"cms-subtab\" onclick=\"cmsSwitchHelpTopic('sort-help')\" id=\"tab-sort-help\" style=\"text-align:left;border:none;border-bottom:1px solid #f3f4f6;padding:9px 12px;background:none;cursor:pointer;font-weight:600;font-size:12px;color:#4b5563\">📦 Sortiment</button>
          <button class=\"cms-subtab\" onclick=\"cmsSwitchHelpTopic('gallery-help')\" id=\"tab-gallery-help\" style=\"text-align:left;border:none;border-bottom:1px solid #f3f4f6;padding:9px 12px;background:none;cursor:pointer;font-weight:600;font-size:12px;color:#4b5563\">🖼️ Impressionen</button>
          <button class=\"cms-subtab\" onclick=\"cmsSwitchHelpTopic('howto-help')\" id=\"tab-howto-help\" style=\"text-align:left;border:none;border-bottom:1px solid #f3f4f6;padding:9px 12px;background:none;cursor:pointer;font-weight:600;font-size:12px;color:#4b5563\">💡 Problemlöser</button>
          <button class=\"cms-subtab\" onclick=\"cmsSwitchHelpTopic('faq-help')\" id=\"tab-faq-help\" style=\"text-align:left;border:none;padding:9px 12px;background:none;cursor:pointer;font-weight:600;font-size:12px;color:#4b5563\">❓ FAQ</button>
        </div>
      </div>·
      <!-- Inhaltsbereich -->
      <div id=\"help-content-area\">·
        <!-- WOCHENPLAN -->
        <div id=\"help-wp-help\" class=\"cms-card help-content-section\">
          <div class=\"cms-card-header\">🍳 Wochenplan (Mittagstisch)</div>
          <div class=\"cms-card-body\" style=\"font-size:13px;line-height:1.65;color:#374151\">
            <p style=\"margin:0 0 10px\">Mit dem Wochenplan pflegen Sie den täglichen Mittagstisch. Alle Änderungen sind sofort live auf der Website sichtbar.</p>
            <h4 style=\"margin:0 0 6px;color:#1b5e20\">Schaltflächen &amp; Funktionen</h4>
            <table style=\"width:100%;border-collapse:collapse;font-size:12px;margin-bottom:12px\">
              <thead><tr style=\"background:#f1f5f9\"><th style=\"padding:6px 10px;text-align:left;border:1px solid #e2e8f0\">Button</th><th style=\"padding:6px 10px;text-align:left;border:1px solid #e2e8f0\">Funktion</th></tr></thead>
              <tbody>
                <tr><td style=\"padding:6px 10px;border:1px solid #e2e8f0\"><code>← / →</code></td><td style=\"padding:6px 10px;border:1px solid #e2e8f0\">Woche zurück / vor blättern</td></tr>
                <tr style=\"background:#f8fafc\"><td style=\"padding:6px 10px;border:1px solid #e2e8f0\"><code>Diese Woche / Nächste Woche</code></td><td style=\"padding:6px 10px;border:1px solid #e2e8f0\">Direktsprung zur aktuellen bzw. nächsten KW</td></tr>
                <tr><td style=\"padding:6px 10px;border:1px solid #e2e8f0\"><code>+ Gericht</code></td><td style=\"padding:6px 10px;border:1px solid #e2e8f0\">Neues Tagesgericht anlegen (Wochentag, Titel, Beschreibung, Preis)</td></tr>
                <tr style=\"background:#f8fafc\"><td style=\"padding:6px 10px;border:1px solid #e2e8f0\"><code>💾 Speichern</code></td><td style=\"padding:6px 10px;border:1px solid #e2e8f0\">Alle Änderungen dauerhaft in Dataverse sichern</td></tr>
                <tr><td style=\"padding:6px 10px;border:1px solid #e2e8f0\"><code>↩ Verwerfen</code></td><td style=\"padding:6px 10px;border:1px solid #e2e8f0\">Ungespeicherte Entwürfe verwerfen, letzten gespeicherten Stand laden</td></tr>
                <tr style=\"background:#f8fafc\"><td style=\"padding:6px 10px;border:1px solid #e2e8f0\"><code>🖨️ Drucken</code></td><td style=\"padding:6px 10px;border:1px solid #e2e8f0\">Druckfertiges A4-Plakat erzeugen</td></tr>
                <tr><td style=\"padding:6px 10px;border:1px solid #e2e8f0\"><code>📲 Teilen</code></td><td style=\"padding:6px 10px;border:1px solid #e2e8f0\">PNG herunterladen + WhatsApp-Link mit vorformuliertem Text</td></tr>
              </tbody>
            </table>
            <div style=\"background:#fff3e0;border-left:4px solid #ff9800;padding:10px 14px;border-radius:4px;font-size:12px\">⚠️ <strong>Wichtig:</strong> Zuerst <strong>Speichern</strong> klicken, bevor die Woche gewechselt wird – ungespeicherte Gerichte gehen sonst verloren.</div>
          </div>
        </div>·
        <!-- OEFFNUNGSZEITEN -->
        <div id=\"help-hours-help\" class=\"cms-card help-content-section\" style=\"display:none\">
          <div class=\"cms-card-header\">🕐 Öffnungszeiten</div>
          <div class=\"cms-card-body\" style=\"font-size:13px;line-height:1.65;color:#374151\">
            <p style=\"margin:0 0 10px\">Die hier gepflegten Zeiten steuern das Live-Öffnungsstatus-Widget auf der Homepage (grüner/roter Punkt mit Countdown).</p>
            <h4 style=\"margin:0 0 6px;color:#1b5e20\">Zeitformat</h4>
            <ul style=\"margin:0 0 12px;padding-left:20px\">
              <li>Einfaches Intervall: <code>07:30 - 18:00</code></li>
              <li>Mittagspause: <code>07:30 - 12:30; 14:00 - 18:00</code> (Semikolon als Trenner)</li>
              <li>Ruhetag: Feld leer lassen oder <code>geschlossen</code> eintragen</li>
            </ul>
            <h4 style=\"margin:0 0 6px;color:#1b5e20\">Feiertage</h4>
            <p style=\"margin:0 0 10px\">Das System erkennt alle bayerischen gesetzlichen Feiertage automatisch. An Feiertagen wird auf der Homepage automatisch <em>„Geschlossen – Feiertag“</em> angezeigt.</p>
          </div>
        </div>·
        <!-- ANGEBOTE -->
        <div id=\"help-ang-help\" class=\"cms-card help-content-section\" style=\"display:none\">
          <div class=\"cms-card-header\">🎁 Sonderangebote &amp; Aktionen</div>
          <div class=\"cms-card-body\" style=\"font-size:13px;line-height:1.65;color:#374151\">
            <p style=\"margin:0 0 10px\">Erstellen Sie wöchentliche Aktionen mit Artikeln, Preisen und Produktfotos. Das System berechnet Rabatte automatisch.</p>
            <h4 style=\"margin:0 0 6px;color:#1b5e20\">Neue Aktion erstellen</h4>
            <ol style=\"margin:0 0 12px;padding-left:20px\">
              <li>Klicken Sie auf <strong>+ Neue Aktion erstellen</strong>.</li>
              <li>Titel, Start- und Enddatum eingeben.</li>
              <li>Artikel über <strong>+ Zeile</strong> hinzufügen: Name, Aktionspreis, Statt-Preis.</li>
              <li>Optional Produktfoto hochladen (PNG/JPG/WebP, max. 5 MB).</li>
              <li><strong>💾 Speichern</strong> – sofort live auf der Homepage.</li>
            </ol>
            <h4 style=\"margin:0 0 6px;color:#1b5e20\">Schaltflächen</h4>
            <table style=\"width:100%;border-collapse:collapse;font-size:12px;margin-bottom:12px\">
              <thead><tr style=\"background:#f1f5f9\"><th style=\"padding:6px 10px;text-align:left;border:1px solid #e2e8f0\">Button</th><th style=\"padding:6px 10px;text-align:left;border:1px solid #e2e8f0\">Funktion</th></tr></thead>
              <tbody>
                <tr><td style=\"padding:6px 10px;border:1px solid #e2e8f0\"><code>✏️ Bearbeiten</code></td><td style=\"padding:6px 10px;border:1px solid #e2e8f0\">Bestehende Aktion öffnen und ändern</td></tr>
                <tr style=\"background:#f8fafc\"><td style=\"padding:6px 10px;border:1px solid #e2e8f0\"><code>👁 Vorschau</code></td><td style=\"padding:6px 10px;border:1px solid #e2e8f0\">Fertig gestaltetes Plakat in neuem Tab anzeigen</td></tr>
                <tr><td style=\"padding:6px 10px;border:1px solid #e2e8f0\"><code>📲 Teilen</code></td><td style=\"padding:6px 10px;border:1px solid #e2e8f0\">Aktionsflyer als PNG herunterladen + WhatsApp-Link</td></tr>
                <tr style=\"background:#f8fafc\"><td style=\"padding:6px 10px;border:1px solid #e2e8f0\"><code>🎨 Kachel bearbeiten</code></td><td style=\"padding:6px 10px;border:1px solid #e2e8f0\">Kachel-Editor für einzelne Produktkachel öffnen</td></tr>
                <tr><td style=\"padding:6px 10px;border:1px solid #e2e8f0\"><code>🗑 Löschen</code></td><td style=\"padding:6px 10px;border:1px solid #e2e8f0\">Aktion dauerhaft entfernen (Bestätigung erforderlich)</td></tr>
              </tbody>
            </table>
            <div style=\"background:#e8f5e9;border-left:4px solid #4ade80;padding:10px 14px;border-radius:4px;font-size:12px\">💡 <strong>Tipp:</strong> Zukünftiges Startdatum setzen, um Aktionen vorzubereiten – sie erscheinen erst ab dem eingetragenen Datum.</div>
          </div>
        </div>·
        <!-- NEWS -->
        <div id=\"help-news-help\" class=\"cms-card help-content-section\" style=\"display:none\">
          <div class=\"cms-card-header\">📰 Aktuelles (News-Beiträge)</div>
          <div class=\"cms-card-body\" style=\"font-size:13px;line-height:1.65;color:#374151\">
            <p style=\"margin:0 0 10px\">Veröffentlichen Sie Neuigkeiten, die auf der Startseite als Karten und im Laufband-Ticker erscheinen.</p>
            <h4 style=\"margin:0 0 6px;color:#1b5e20\">Neuen Beitrag anlegen</h4>
            <ol style=\"margin:0 0 12px;padding-left:20px\">
              <li>Klicken Sie auf <strong>+ Neuer Beitrag</strong>.</li>
              <li>Titel, Inhalt (Rich-Text-Editor) und optionales Bild eingeben.</li>
              <li>Status auf <strong>Aktiv</strong> setzen → sofort auf der Homepage sichtbar.</li>
              <li><strong>💾 Speichern</strong>.</li>
            </ol>
            <div style=\"background:#fff3e0;border-left:4px solid #ff9800;padding:10px 14px;border-radius:4px;font-size:12px\">⚠️ Gelöschte Beiträge können nicht wiederhergestellt werden. Nutzen Sie stattdessen <strong>Status → Entwurf</strong>, um einen Beitrag temporär auszublenden.</div>
          </div>
        </div>·
        <!-- HOMEPAGE -->
        <div id=\"help-hp-help\" class=\"cms-card help-content-section\" style=\"display:none\">
          <div class=\"cms-card-header\">🏠 Homepage-Texte &amp; Logo</div>
          <div class=\"cms-card-body\" style=\"font-size:13px;line-height:1.65;color:#374151\">
            <p style=\"margin:0 0 10px\">Bearbeiten Sie den statischen Inhalt der Startseite: Begrüßungstext, Untertitel, Tagline sowie das Laden-Logo.</p>
            <h4 style=\"margin:0 0 6px;color:#1b5e20\">Logo hochladen</h4>
            <ol style=\"margin:0 0 12px;padding-left:20px\">
              <li>Klicken Sie auf <strong>Logo auswählen / ändern</strong>.</li>
              <li>PNG mit transparentem Hintergrund empfohlen, max. 10 MB.</li>
              <li>Das Logo erscheint in Header, Flyern und Plakaten.</li>
              <li><strong>💾 Speichern</strong> nicht vergessen.</li>
            </ol>
          </div>
        </div>·
        <!-- KACHEL-EDITOR -->
        <div id=\"help-editor-help\" class=\"cms-card help-content-section\" style=\"display:none\">
          <div class=\"cms-card-header\">🎨 Kachel- &amp; Flyer-Editor</div>
          <div class=\"cms-card-body\" style=\"font-size:13px;line-height:1.65;color:#374151\">
            <p style=\"margin:0 0 10px\">Der Kachel-Editor ermöglicht pixelgenaues Gestalten von Produktkacheln und Werbeplyakaten.</p>
            <h4 style=\"margin:0 0 6px;color:#1b5e20\">Grundprinzip</h4>
            <ul style=\"margin:0 0 12px;padding-left:20px\">
              <li><strong>Element anklicken:</strong> Klick auf Bild, Preis oder Text aktiviert es (gestrichelter Rahmen). Das Element liegt ganz oben.</li>
              <li><strong>Verschieben:</strong> Drag &amp; Drop oder D-Pad (Pfeilkreuz).</li>
              <li><strong>Größe:</strong> Schieberegler <code>Größe</code> skaliert das aktive Element.</li>
              <li><strong>Rotation:</strong> Regler <code>🔄 Drehung</code> dreht −180° bis +180°. <code>⬀ 0°</code> setzt zurück.</li>
              <li><strong>Deckkraft:</strong> Regler <code>Opacity</code> für Transparenz (0–100%).</li>
            </ul>
            <h4 style=\"margin:0 0 6px;color:#1b5e20\">Schaltflächen</h4>
            <table style=\"width:100%;border-collapse:collapse;font-size:12px;margin-bottom:12px\">
              <thead><tr style=\"background:#f1f5f9\"><th style=\"padding:6px 10px;text-align:left;border:1px solid #e2e8f0\">Button</th><th style=\"padding:6px 10px;text-align:left;border:1px solid #e2e8f0\">Funktion</th></tr></thead>
              <tbody>
                <tr><td style=\"padding:6px 10px;border:1px solid #e2e8f0\"><code>💾 Speichern</code></td><td style=\"padding:6px 10px;border:1px solid #e2e8f0\">Layout dauerhaft sichern</td></tr>
                <tr style=\"background:#f8fafc\"><td style=\"padding:6px 10px;border:1px solid #e2e8f0\"><code>↩ Verwerfen</code></td><td style=\"padding:6px 10px;border:1px solid #e2e8f0\">Editor schließen, alle Änderungen verwerfen</td></tr>
                <tr><td style=\"padding:6px 10px;border:1px solid #e2e8f0\"><code>👻 Ghost AN/AUS</code></td><td style=\"padding:6px 10px;border:1px solid #e2e8f0\">Geister-Schattenkopie des Hauptbildes erzeugen/entfernen</td></tr>
                <tr style=\"background:#f8fafc\"><td style=\"padding:6px 10px;border:1px solid #e2e8f0\"><code>+ 📝 Duplikat</code></td><td style=\"padding:6px 10px;border:1px solid #e2e8f0\">Kopie des aktiven Elements erstellen</td></tr>
                <tr><td style=\"padding:6px 10px;border:1px solid #e2e8f0\"><code>🖼️ Bild hochladen</code></td><td style=\"padding:6px 10px;border:1px solid #e2e8f0\">Neues Produktfoto für diese Kachel hochladen</td></tr>
                <tr style=\"background:#f8fafc\"><td style=\"padding:6px 10px;border:1px solid #e2e8f0\"><code>⋯ Overlay hochladen</code></td><td style=\"padding:6px 10px;border:1px solid #e2e8f0\">Zusätzliches Bild (Siegel, Logo) als Overlay einfügen</td></tr>
                <tr><td style=\"padding:6px 10px;border:1px solid #e2e8f0\"><code>🖨️ Drucken / PNG</code></td><td style=\"padding:6px 10px;border:1px solid #e2e8f0\">Druckdialog öffnen oder PNG-Export herunterladen</td></tr>
              </tbody>
            </table>
            <div style=\"background:#fff3e0;border-left:4px solid #ff9800;padding:10px 14px;border-radius:4px;font-size:12px\">⚠️ Der rote Banner <code>⚠️ UNGESPEICHERT</code> bedeutet: Änderungen noch nicht gesichert. Vor dem Schließen <strong>Speichern</strong> oder <strong>Verwerfen</strong> klicken.</div>
          </div>
        </div>·
        <!-- DESIGN -->
        <div id=\"help-design-help\" class=\"cms-card help-content-section\" style=\"display:none\">
          <div class=\"cms-card-header\">🖌 Design-Editor (Farben &amp; Templates)</div>
          <div class=\"cms-card-body\" style=\"font-size:13px;line-height:1.65;color:#374151\">
            <p style=\"margin:0 0 10px\">Im Design-Tab passen Sie Farben, Schriften und Templates für Plakate, Flyer und die Homepage an.</p>
            <h4 style=\"margin:0 0 6px;color:#1b5e20\">Unterreiter</h4>
            <ul style=\"margin:0 0 12px;padding-left:20px\">
              <li><strong>Homepage:</strong> Hintergrundfarbe, Akzentfarben, Hero-Gradient der Startseite.</li>
              <li><strong>Plakate &amp; Flyer:</strong> Template-Auswahl, Hintergrundfarbe, Schriftfarben, Bildfreistellung.</li>
              <li><strong>Angebote:</strong> Farben für Preisbadges, Kachel-Hintergrund, Rabatt-Badge.</li>
            </ul>
            <h4 style=\"margin:0 0 6px;color:#1b5e20\">Schaltflächen</h4>
            <table style=\"width:100%;border-collapse:collapse;font-size:12px;margin-bottom:10px\">
              <thead><tr style=\"background:#f1f5f9\"><th style=\"padding:6px 10px;text-align:left;border:1px solid #e2e8f0\">Button</th><th style=\"padding:6px 10px;text-align:left;border:1px solid #e2e8f0\">Funktion</th></tr></thead>
              <tbody>
                <tr><td style=\"padding:6px 10px;border:1px solid #e2e8f0\"><code>💾 Alles speichern</code></td><td style=\"padding:6px 10px;border:1px solid #e2e8f0\">Alle Designänderungen dauerhaft speichern</td></tr>
                <tr style=\"background:#f8fafc\"><td style=\"padding:6px 10px;border:1px solid #e2e8f0\"><code>↶ Auf Default zurücksetzen</code></td><td style=\"padding:6px 10px;border:1px solid #e2e8f0\">Zu gespeichertem Standard-Design zurückspringen</td></tr>
                <tr><td style=\"padding:6px 10px;border:1px solid #e2e8f0\"><code>★ Als Standard speichern</code></td><td style=\"padding:6px 10px;border:1px solid #e2e8f0\">Aktuelles Design als persönlichen Standard hinterlegen</td></tr>
                <tr style=\"background:#f8fafc\"><td style=\"padding:6px 10px;border:1px solid #e2e8f0\"><code>✕ Werkseinstellungen</code></td><td style=\"padding:6px 10px;border:1px solid #e2e8f0\">Persönlichen Standard löschen, Original-Werksvorgaben laden</td></tr>
              </tbody>
            </table>
          </div>
        </div>·
        <!-- PUSH -->
        <div id=\"help-push-help\" class=\"cms-card help-content-section\" style=\"display:none\">
          <div class=\"cms-card-header\">🔔 Push-Benachrichtigungen</div>
          <div class=\"cms-card-body\" style=\"font-size:13px;line-height:1.65;color:#374151\">
            <p style=\"margin:0 0 10px\">Senden Sie Direktnachrichten an alle registrierten Smartphone- und Desktop-Abonnenten.</p>
            <div style=\"background:#f3e8ff;border-left:4px solid #9333ea;padding:10px 14px;border-radius:4px;font-size:12px;margin-bottom:12px\">ℹ️ <strong>Testphase:</strong> Push befindet sich noch in der optionalen Testphase.</div>
            <h4 style=\"margin:0 0 6px;color:#1b5e20\">Nachricht senden</h4>
            <ol style=\"margin:0 0 12px;padding-left:20px\">
              <li>Tab <strong>Push</strong> öffnen.</li>
              <li>Schnellvorlage wählen oder eigenen Text schreiben.</li>
              <li><strong>📨 Senden</strong> – alle aktiven Abonnenten erhalten die Benachrichtigung sofort.</li>
            </ol>
            <h4 style=\"margin:0 0 6px;color:#1b5e20\">Abonnenten verwalten</h4>
            <p style=\"margin:0 0 10px\">Unterreiter <strong>Subscriber</strong> → <strong>Aktualisieren</strong>: Zeigt alle aktiven Geräte-IDs. Einzelne Abonnenten können über <code>🗑</code> entfernt werden.</p>
            <div style=\"background:#e8f5e9;border-left:4px solid #4ade80;padding:10px 14px;border-radius:4px;font-size:12px\">💡 Max. 1–2 Nachrichten pro Woche senden – sonst drohen Abmeldungen.</div>
          </div>
        </div>·
        <!-- SORTIMENT -->
        <div id=\"help-sort-help\" class=\"cms-card help-content-section\" style=\"display:none\">
          <div class=\"cms-card-header\">📦 Sortiment &amp; Preisliste</div>
          <div class=\"cms-card-body\" style=\"font-size:13px;line-height:1.65;color:#374151\">
            <p style=\"margin:0 0 10px\">Pflegen Sie das gesamte Warenangebot des Ladens, gegliedert in Warengruppen. Kunden können die Preisliste auf der Website durchsuchen.</p>
            <h4 style=\"margin:0 0 6px;color:#1b5e20\">Produkt hinzufügen</h4>
            <ol style=\"margin:0 0 12px;padding-left:20px\">
              <li>Warengruppe wählen oder neue anlegen.</li>
              <li><strong>+ Zeile hinzufügen</strong> klicken.</li>
              <li>Produktname, Menge/Einheit, Preis und optional UVP eintragen.</li>
              <li><strong>💾 Speichern</strong>.</li>
            </ol>
          </div>
        </div>·
        <!-- GALERIE -->
        <div id=\"help-gallery-help\" class=\"cms-card help-content-section\" style=\"display:none\">
          <div class=\"cms-card-header\">🖼️ Impressionen (Foto-Galerie)</div>
          <div class=\"cms-card-body\" style=\"font-size:13px;line-height:1.65;color:#374151\">
            <p style=\"margin:0 0 10px\">Verwalten Sie die öffentliche Foto-Galerie des Ladens. Besucher sehen sie unter dem Menüpunkt <em>Impressionen</em>.</p>
            <h4 style=\"margin:0 0 6px;color:#1b5e20\">Foto hochladen</h4>
            <ol style=\"margin:0 0 12px;padding-left:20px\">
              <li>Tab <strong>Impressionen</strong> öffnen → <strong>+ Bilder hochladen</strong>.</li>
              <li>JPG/PNG/WebP auswählen (max. 5 MB pro Bild).</li>
              <li>Optional <strong>Kategorie</strong> vergeben (z.B. <code>Team</code>, <code>Laden</code>, <code>Produkte</code>).</li>
              <li>Bilder erscheinen sofort in der öffentlichen Galerie.</li>
            </ol>
            <div style=\"background:#e8f5e9;border-left:4px solid #4ade80;padding:10px 14px;border-radius:4px;font-size:12px\">💡 Filter-Tabs erscheinen auf der Website erst ab mindestens <strong>zwei verschiedenen Kategorien</strong>.</div>
          </div>
        </div>·
        <!-- PROBLEMLOSER -->
        <div id=\"help-howto-help\" class=\"cms-card help-content-section\" style=\"display:none\">
          <div class=\"cms-card-header\">💡 Problemlöser – Schritt-für-Schritt</div>
          <div class=\"cms-card-body\" style=\"font-size:13px;line-height:1.65;color:#374151\">·
            <div style=\"background:#f9fafb;border:1px solid #e5e7eb;border-radius:8px;padding:12px;margin-bottom:10px\">
              <strong style=\"color:#b91c1c\">📌 Produktbild hat weißen Hintergrund</strong>
              <ol style=\"margin:6px 0 0;padding-left:20px;font-size:12px\">
                <li>Tab <strong>Design</strong> → <strong>Plakate &amp; Flyer</strong> → <strong>⚙️ Gemeinsame Einstellungen</strong>.</li>
                <li>Kontrollkästchen <strong>„Bilder freistellen“</strong> aktivieren → weißer Hintergrund wird entfernt.</li>
              </ol>
            </div>·
            <div style=\"background:#f9fafb;border:1px solid #e5e7eb;border-radius:8px;padding:12px;margin-bottom:10px\">
              <strong style=\"color:#b91c1c\">📌 Wochenplan-Eingaben rückgängig machen</strong>
              <ol style=\"margin:6px 0 0;padding-left:20px;font-size:12px\">
                <li>Nicht auf <strong>Speichern</strong> klicken.</li>
                <li>Schaltfläche <strong>„↩ Verwerfen“</strong> klicken → letzter gespeicherter Stand wird wiederhergestellt.</li>
              </ol>
            </div>·
            <div style=\"background:#f9fafb;border:1px solid #e5e7eb;border-radius:8px;padding:12px;margin-bottom:10px\">
              <strong style=\"color:#b91c1c\">📌 Artikelfoto überlagert Preis auf Kachel</strong>
              <ol style=\"margin:6px 0 0;padding-left:20px;font-size:12px\">
                <li>Kachel-Editor öffnen → auf das überlagernde Bild klicken (gestrichelter Rahmen).</li>
                <li>Per D-Pad verschieben oder Größenregler verkleinern.</li>
              </ol>
            </div>·
            <div style=\"background:#f9fafb;border:1px solid #e5e7eb;border-radius:8px;padding:12px;margin-bottom:10px\">
              <strong style=\"color:#b91c1c\">📌 Siegel schräg auf Produktbild legen</strong>
              <ol style=\"margin:6px 0 0;padding-left:20px;font-size:12px\">
                <li>Kachel-Editor → Rechtsklick → <strong>„Overlay-Bild hochladen“</strong>.</li>
                <li>Drehung-Slider auf z.B. <code>−15°</code> ziehen.</li>
                <li>Per D-Pad an gewünschte Position schieben.</li>
              </ol>
            </div>·
            <div style=\"background:#f9fafb;border:1px solid #e5e7eb;border-radius:8px;padding:12px;margin-bottom:10px\">
              <strong style=\"color:#b91c1c\">📌 Plastischen Bildschatten (Ghost) erzeugen</strong>
              <ol style=\"margin:6px 0 0;padding-left:20px;font-size:12px\">
                <li>Kachel-Editor → <strong>👻 Ghost: AUS</strong> klicken (wechselt auf AN).</li>
                <li>Geist anklicken → Größenregler vergrößern → Opacity auf ca. <code>30%</code> senken.</li>
              </ol>
            </div>·
            <div style=\"background:#f9fafb;border:1px solid #e5e7eb;border-radius:8px;padding:12px;margin-bottom:10px\">
              <strong style=\"color:#b91c1c\">📌 iPhone erhält keine Push-Nachrichten</strong>
              <ol style=\"margin:6px 0 0;padding-left:20px;font-size:12px\">
                <li>iOS benötigt PWA-Installation: Safari → Teilen 📤 → <strong>„Zum Home-Bildschirm“</strong>.</li>
                <li>App vom Startbildschirm öffnen → Menü → <strong>„Benachrichtigungen aktivieren“</strong> → Erlauben.</li>
              </ol>
            </div>·
            <div style=\"background:#f9fafb;border:1px solid #e5e7eb;border-radius:8px;padding:12px;margin-bottom:10px\">
              <strong style=\"color:#b91c1c\">📌 Angebot auf Homepage nicht sichtbar</strong>
              <ol style=\"margin:6px 0 0;padding-left:20px;font-size:12px\">
                <li>Startdatum der Aktion prüfen – zukünftige Aktionen sind ausgeblendet.</li>
                <li>Enddatum prüfen – abgelaufene Aktionen verschwinden automatisch.</li>
                <li>Hard-Refresh: <kbd>Strg</kbd>+<kbd>Shift</kbd>+<kbd>R</kbd>.</li>
              </ol>
            </div>·
            <div style=\"background:#f9fafb;border:1px solid #e5e7eb;border-radius:8px;padding:12px;margin-bottom:10px\">
              <strong style=\"color:#b91c1c\">📌 Design-Farben versehentlich geändert – Reset</strong>
              <ol style=\"margin:6px 0 0;padding-left:20px;font-size:12px\">
                <li>Tab <strong>Design</strong> → <strong>„✕ Werkseinstellungen“</strong> klicken → bestätigen.</li>
                <li><strong>„💾 Alles speichern“</strong> klicken um Reset dauerhaft zu übernehmen.</li>
              </ol>
            </div>·
            <div style=\"background:#f9fafb;border:1px solid #e5e7eb;border-radius:8px;padding:12px;margin-bottom:10px\">
              <strong style=\"color:#b91c1c\">📌 Artikel-Bild erscheint nicht in der Kachel</strong>
              <ol style=\"margin:6px 0 0;padding-left:20px;font-size:12px\">
                <li>Kachel-Editor öffnen → Schaltfläche <strong>🔍 Bild suchen</strong> neben der Artikelzeile klicken.</li>
                <li>Falls kein Bild gefunden: Bild manuell über <strong>📁 Hochladen</strong> einfügen.</li>
                <li>Bild-Auflösung mind. 400×400 px für scharfe Darstellung.</li>
              </ol>
            </div>·
            <div style=\"background:#f9fafb;border:1px solid #e5e7eb;border-radius:8px;padding:12px;margin-bottom:10px\">
              <strong style=\"color:#b91c1c\">📌 News-Beitrag erscheint nicht auf der Homepage</strong>
              <ol style=\"margin:6px 0 0;padding-left:20px;font-size:12px\">
                <li>Tab <strong>Aktuelles</strong> → Status des Beitrags prüfen: muss <strong>Veröffentlicht</strong> sein.</li>
                <li>Datum prüfen – Beiträge mit zukünftigem Datum werden noch nicht angezeigt.</li>
                <li>Hard-Refresh: <kbd>Strg</kbd>+<kbd>Shift</kbd>+<kbd>R</kbd>.</li>
              </ol>
            </div>·
            <div style=\"background:#f9fafb;border:1px solid #e5e7eb;border-radius:8px;padding:12px;margin-bottom:10px\">
              <strong style=\"color:#b91c1c\">📌 Logo wird auf der Homepage nicht angezeigt</strong>
              <ol style=\"margin:6px 0 0;padding-left:20px;font-size:12px\">
                <li>Tab <strong>Homepage</strong> → Abschnitt <strong>Logo</strong> → prüfen ob ein Bild hochgeladen ist.</li>
                <li>Dateiformat muss PNG oder JPG sein, max. 2 MB.</li>
                <li>Nach dem Speichern Seite neu laden (F5).</li>
              </ol>
            </div>·
            <div style=\"background:#f9fafb;border:1px solid #e5e7eb;border-radius:8px;padding:12px;margin-bottom:10px\">
              <strong style=\"color:#b91c1c\">📌 Preisliste zeigt keine Artikel</strong>
              <ol style=\"margin:6px 0 0;padding-left:20px;font-size:12px\">
                <li>Seite neu laden → Daten kommen direkt aus dem Warenwirtschaftssystem.</li>
                <li>Falls nach 30 Sekunden noch leer: Internetverbindung prüfen.</li>
                <li>Roter-Punkt-Liste wird nur befüllt wenn Artikel in den letzten 6 Wochen verkauft wurden.</li>
              </ol>
            </div>·
            <div style=\"background:#f9fafb;border:1px solid #e5e7eb;border-radius:8px;padding:12px;margin-bottom:10px\">
              <strong style=\"color:#b91c1c\">📌 Öffnungszeiten-Eintrag lässt sich nicht speichern</strong>
              <ol style=\"margin:6px 0 0;padding-left:20px;font-size:12px\">
                <li>Uhrzeiten im Format <code>HH:MM</code> (z.B. <code>08:00</code>) eintragen.</li>
                <li>Mehrere Zeiträume mit Semikolon trennen: <code>08:00–12:00;14:00–18:00</code>.</li>
                <li>Sonderzeichen prüfen – keine Anführungszeichen oder Schrägstriche.</li>
              </ol>
            </div>·
            <div style=\"background:#f9fafb;border:1px solid #e5e7eb;border-radius:8px;padding:12px;margin-bottom:10px\">
              <strong style=\"color:#b91c1c\">📌 Wochenplan-Plakat hat falsches Datum</strong>
              <ol style=\"margin:6px 0 0;padding-left:20px;font-size:12px\">
                <li>Tab <strong>Wochenplan</strong> → Woche mit den Pfeil-Schaltflächen wählen.</li>
                <li>Sicherstellen dass die richtige KW ausgewählt ist, bevor das Plakat gedruckt wird.</li>
              </ol>
            </div>·
            <div style=\"background:#f9fafb;border:1px solid #e5e7eb;border-radius:8px;padding:12px;margin-bottom:10px\">
              <strong style=\"color:#b91c1c\">📌 Push-Nachricht kommt nicht bei Android an</strong>
              <ol style=\"margin:6px 0 0;padding-left:20px;font-size:12px\">
                <li>Systemeinstellungen → Apps → Chrome/Browser → Benachrichtigungen → <strong>Erlaubt</strong>.</li>
                <li>Energiesparmodus deaktivieren – dieser kann Push blockieren.</li>
                <li>Im CMS: Tab <strong>Push → Subscriber</strong> → prüfen ob das Gerät eingetragen ist.</li>
              </ol>
            </div>·
            <div style=\"background:#f9fafb;border:1px solid #e5e7eb;border-radius:8px;padding:12px;margin-bottom:10px\">
              <strong style=\"color:#b91c1c\">📌 Kachel-Text lässt sich nicht klicken / bearbeiten</strong>
              <ol style=\"margin:6px 0 0;padding-left:20px;font-size:12px\">
                <li>Ein Bild liegt möglicherweise über dem Textfeld → Bild zuerst verschieben oder verkleinern.</li>
                <li>Kachel-Editor scrollt nach oben → ggf. Zoom des Browsers reduzieren (<kbd>Strg</kbd>+<kbd>−</kbd>).</li>
              </ol>
            </div>·
            <div style=\"background:#f9fafb;border:1px solid #e5e7eb;border-radius:8px;padding:12px;margin-bottom:10px\">
              <strong style=\"color:#b91c1c\">📌 Flyer-Vorschau weicht vom Ausdruck ab</strong>
              <ol style=\"margin:6px 0 0;padding-left:20px;font-size:12px\">
                <li>Im Druckdialog <strong>„Hintergrundgrafiken drucken“</strong> aktivieren.</li>
                <li>Skalierung auf <strong>100%</strong> belassen – keine Auto-Anpassung.</li>
                <li>Chrome/Edge liefert genauere Druckergebnisse als Firefox.</li>
              </ol>
            </div>·
            <div style=\"background:#f9fafb;border:1px solid #e5e7eb;border-radius:8px;padding:12px;margin-bottom:10px\">
              <strong style=\"color:#b91c1c\">📌 Aktion hat falschen Zeitraum nach dem Speichern</strong>
              <ol style=\"margin:6px 0 0;padding-left:20px;font-size:12px\">
                <li>Tab <strong>Sonderangebote</strong> → Aktion → <strong>Bearbeiten</strong>.</li>
                <li><strong>Gültig von</strong> und <strong>Gültig bis</strong> korrigieren.</li>
                <li>Auf <strong>💾 Speichern</strong> klicken → Homepage per Hard-Refresh prüfen.</li>
              </ol>
            </div>·
            <div style=\"background:#f9fafb;border:1px solid #e5e7eb;border-radius:8px;padding:12px;margin-bottom:10px\">
              <strong style=\"color:#b91c1c\">📌 Galerie-Bild wird in falscher Kategorie angezeigt</strong>
              <ol style=\"margin:6px 0 0;padding-left:20px;font-size:12px\">
                <li>Tab <strong>Impressionen</strong> → Bild anklicken → Kategorie-Dropdown ändern.</li>
                <li>Speichern → kurz warten bis die Galerie aktualisiert ist.</li>
              </ol>
            </div>·
            <div style=\"background:#f9fafb;border:1px solid #e5e7eb;border-radius:8px;padding:12px;margin-bottom:10px\">
              <strong style=\"color:#b91c1c\">📌 CMS-Passwort vergessen</strong>
              <ol style=\"margin:6px 0 0;padding-left:20px;font-size:12px\">
                <li>Das Passwort steht im Dorfladen-Betreiberhandbuch (bei der Einrichtung ausghändigt).</li>
                <li>Zur Zurücksetzung: technischen Betreuer kontaktieren.</li>
              </ol>
            </div>·
            <div style=\"background:#f9fafb;border:1px solid #e5e7eb;border-radius:8px;padding:12px;margin-bottom:10px\">
              <strong style=\"color:#b91c1c\">📌 Beitrag im „Aktuelles“-Ticker läuft zu schnell / zu langsam</strong>
              <ol style=\"margin:6px 0 0;padding-left:20px;font-size:12px\">
                <li>Die Geschwindigkeit hängt von der Textlänge ab – kürzere Texte = schnellerer Durchlauf.</li>
                <li>Sehr kurze Meldungen ruhig etwas länger formulieren für eine angenehme Lesegeschwindigkeit.</li>
              </ol>
            </div>·
            <div style=\"background:#f9fafb;border:1px solid #e5e7eb;border-radius:8px;padding:12px;\">
              <strong style=\"color:#b91c1c\">📌 WhatsApp-Teilen sendet falschen Link / Text</strong>
              <ol style=\"margin:6px 0 0;padding-left:20px;font-size:12px\">
                <li>Der Teilen-Button erzeugt den Text automatisch aus Titel und Gültigkeitszeitraum der Aktion.</li>
                <li>Titel und Datum der Aktion korrigieren → danach erneut auf <strong>Teilen</strong> klicken.</li>
              </ol>
            </div>·
          </div>
        </div>·
        <!-- FAQ -->
        <div id=\"help-faq-help\" class=\"cms-card help-content-section\" style=\"display:none\">
          <div class=\"cms-card-header\">❓ Häufige Fragen (FAQ)</div>
          <div class=\"cms-card-body\" style=\"font-size:13px;line-height:1.65;color:#374151\">·
            <details style=\"border-bottom:1px solid #f3f4f6;padding:10px 0\"><summary style=\"cursor:pointer;font-weight:600;color:#1b5e20\">Warum wird mein Bild unscharf dargestellt?</summary>
              <p style=\"margin:8px 0 0;font-size:12px\">Das CMS komprimiert Bilder auf 500×500 px. Für A4-Druck Originalbilder mit mind. 800×800 px verwenden.</p>
            </details>·
            <details style=\"border-bottom:1px solid #f3f4f6;padding:10px 0\"><summary style=\"cursor:pointer;font-weight:600;color:#1b5e20\">Der Rotations-Slider springt auf 0° zurück</summary>
              <p style=\"margin:8px 0 0;font-size:12px\">Der Slider wirkt auf das <em>selektierte</em> Element. Zuerst das gewünschte Element anklicken (gestrichelter Rahmen), dann den Slider bewegen.</p>
            </details>·
            <details style=\"border-bottom:1px solid #f3f4f6;padding:10px 0\"><summary style=\"cursor:pointer;font-weight:600;color:#1b5e20\">CMS zeigt „Verbindungsfehler“</summary>
              <p style=\"margin:8px 0 0;font-size:12px\">Internetverbindung prüfen, Seite mit F5 neu laden. Passwort auf Groß-/Kleinschreibung prüfen.</p>
            </details>·
            <details style=\"border-bottom:1px solid #f3f4f6;padding:10px 0\"><summary style=\"cursor:pointer;font-weight:600;color:#1b5e20\">Kann ich CMS auf mehreren Geräten gleichzeitig nutzen?</summary>
              <p style=\"margin:8px 0 0;font-size:12px\">Ja – aber bei gleichzeitiger Bearbeitung gewinnt die zuletzt gespeicherte Version. Bitte Bearbeitung im Team koordinieren.</p>
            </details>·
            <details style=\"border-bottom:1px solid #f3f4f6;padding:10px 0\"><summary style=\"cursor:pointer;font-weight:600;color:#1b5e20\">Was bedeutet „Als Standard speichern“ vs. „Werkseinstellungen“?</summary>
              <p style=\"margin:8px 0 0;font-size:12px\"><strong>★ Als Standard speichern</strong> hinterlegt Ihre aktuellen Einstellungen. <strong>✕ Werkseinstellungen</strong> löscht diesen Standard und kehrt zu Original-Werksvorgaben zurück.</p>
            </details>·
            <details style=\"border-bottom:1px solid #f3f4f6;padding:10px 0\"><summary style=\"cursor:pointer;font-weight:600;color:#1b5e20\">Wochenplan-Plakat wird beim Drucken abgeschnitten</summary>
              <p style=\"margin:8px 0 0;font-size:12px\">Im Druckdialog: Papierformat A4, Seitenränder Keine/Minimal, Option <strong>„Hintergrundgrafiken drucken“</strong> aktivieren.</p>
            </details>·
            <details style=\"border-bottom:1px solid #f3f4f6;padding:10px 0\"><summary style=\"cursor:pointer;font-weight:600;color:#1b5e20\">Das CMS lädt sehr langsam</summary>
              <p style=\"margin:8px 0 0;font-size:12px\">Mind. 5 Mbit/s empfohlen. Browser-Cache leeren. Aktuellen Chrome/Edge/Firefox verwenden. Bilder vor Upload komprimieren.</p>
            </details>·
            <details style=\"padding:10px 0\"><summary style=\"cursor:pointer;font-weight:600;color:#1b5e20\">Wie finde ich die Anzahl aktiver Push-Abonnenten?</summary>
              <p style=\"margin:8px 0 0;font-size:12px\">Tab <strong>Push</strong> → Unterreiter <strong>Subscriber</strong> → <strong>Aktualisieren</strong>. Die Gesamtzahl wird oben angezeigt.</p>
            </details>·
          </div>
        </div>·
      </div><!-- end #help-content-area -->
    </div><!-- end grid -->
  </div><!-- end cms-panel-help -->·
  <script>
  function cmsSwitchHelpTopic(topicId) {
    document.querySelectorAll('.help-content-section').forEach(function(d){ d.style.display='none'; });
    var t = document.getElementById('help-'+topicId);
    if (t) t.style.display='';
    var c = document.getElementById('help-tabs-container');
    if (c) c.querySelectorAll('.cms-subtab').forEach(function(b){ b.style.color='#4b5563'; b.classList.remove('active'); });
    var a = document.getElementById('tab-'+topicId);
    if (a) { a.style.color='#1b5e20'; a.classList.add('active'); }
  }·
  var HELP_IDX = [
    {id:'wp-help',      kw:'wochenplan mittagstisch gericht speisen essen drucken teilen verwerfen speichern'},
    {id:'hours-help',   kw:'öffnungszeiten zeiten offen geschlossen feiertag pause semikolon ruhetag'},
    {id:'ang-help',     kw:'angebote aktion sonderangebot rabatt preis kachel plakat teilen vorschau löschen'},
    {id:'news-help',    kw:'aktuelles news beitrag neuigkeit ticker laufband entwurf status löschen'},
    {id:'hp-help',      kw:'homepage logo texte begrüßung speichern hochladen'},
    {id:'editor-help',  kw:'kachel editor drag drop rotation drehung ghost geist deckkraft opacity dpad verschieben bild overlay duplikat'},
    {id:'design-help',  kw:'design farben template flyer plakat farbe standard werkseinstellungen speichern'},
    {id:'push-help',    kw:'push benachrichtigung abonnent subscriber senden vorlage mittagstisch angebote'},
    {id:'sort-help',    kw:'sortiment preisliste warengruppe produkt artikel zeile eintrag'},
    {id:'gallery-help', kw:'galerie impressionen foto bild lightbox kategorie filter hochladen'},
    {id:'howto-help',   kw:'problemlöser freistellen weißer hintergrund verwerfen undo kachel überlager siegel ghost push iphone angebot farbe reset artikelbild news logo preisliste öffnungszeiten wochenplan datum android kachel text flyer drucken aktion zeitraum galerie kategorie passwort ticker whatsapp teilen'},
    {id:'faq-help',     kw:'faq fragen verbindungsfehler unscharf bild rotation drucken langsam abonnent standard werkseinstellungen'},
  ];·
  function cmsHelpSearch(q) {
    var clrBtn = document.getElementById('help-search-clear');
    if (clrBtn) clrBtn.style.display = q.trim() ? 'block' : 'none';
    var res = document.getElementById('help-search-results');
    var layout = document.getElementById('help-main-layout');
    if (!q.trim()) {
      res.style.display = 'none';
      layout.style.display = '';
      return;
    }
    layout.style.display = 'none';
    var tokens = q.toLowerCase().split(/\\s+/).filter(function(t){ return t.length > 1; });
    var hits = HELP_IDX.filter(function(item){
      var hay = item.kw;
      return tokens.every(function(t){ return hay.indexOf(t) >= 0; });
    });
    if (!hits.length) {
      res.innerHTML = '<div style=\"text-align:center;padding:32px;color:#6b7280;font-size:13px\">&#128270; Keine Treffer f&#252;r &#8222;'+q.replace(/</g,'&lt;')+'&#8220; &#8211; anderes Stichwort versuchen.</div>';
    } else {
      var labels = {'wp-help':'Wochenplan','hours-help':'&#214;ffnungszeiten','ang-help':'Sonderangebote','news-help':'Aktuelles','hp-help':'Homepage','editor-help':'Kachel-Editor','design-help':'Design','push-help':'Push','sort-help':'Sortiment','gallery-help':'Impressionen','howto-help':'Probleml&#246;ser','faq-help':'FAQ'};
      res.innerHTML = hits.map(function(h){
        return '<div onclick=\"cmsHelpSearchOpen(\\''+h.id+'\\')\" style=\"background:#fff;border:1px solid #e5e7eb;border-left:4px solid #1b5e20;border-radius:8px;padding:10px 14px;margin-bottom:8px;cursor:pointer;transition:box-shadow .15s\" onmouseover=\"this.style.boxShadow=\\'0 2px 8px rgba(0,0,0,.1)\\'\" onmouseout=\"this.style.boxShadow=\\'\\'\"><span style=\"background:#e8f5e9;color:#1b5e20;font-size:11px;font-weight:700;padding:2px 8px;border-radius:20px\">'+(labels[h.id]||h.id)+'</span><div style=\"font-weight:600;font-size:13px;margin-top:5px\">'+h.kw.split(' ').slice(0,6).join(' &middot; ')+'</div></div>';
      }).join('');
    }
    res.style.display = 'block';
  }·
  function cmsHelpSearchOpen(topicId) {
    cmsHelpClearSearch();
    cmsSwitchHelpTopic(topicId);
  }·
  function cmsHelpClearSearch() {
    var inp = document.getElementById('help-search-inp');
    if (inp) inp.value = '';
    var clrBtn = document.getElementById('help-search-clear');
    if (clrBtn) clrBtn.style.display = 'none';
    var res = document.getElementById('help-search-results');
    if (res) { res.innerHTML=''; res.style.display='none'; }
    var layout = document.getElementById('help-main-layout');
    if (layout) layout.style.display = '';
  }
  </script>
</div>·
<!-- Modal -->
<div id=\"cms-modal-wrap\" style=\"display:none;font-family:'Segoe UI',system-ui,-apple-system,sans-serif\"></div>·
<script id=\"cms-artikel-data\" type=\"application/json\">
[]</script>·
<script src=\"hilfe-popup.js\"></script>
<script src=\"https://unpkg.com/lucide@latest/dist/umd/lucide.min.js\"></script>
<script src=\"cms.js\"></script>
<script src=\"/js/env-banner.js\"></script><div id=\"env-banner\" style=\"position: fixed; top: 0px; left: 0px; right: 0px; z-index: 99999; background: rgb(229, 62, 62); color: rgb(255, 255, 255); text-align: center; padding: 4px 0px; font-size: 13px; font-weight: 700; letter-spacing: 1px;\">⚠ TEST-UMGEBUNG – Nicht die Live-Seite!</div>···
</body></html>"
```

# Page snapshot

```yaml
- generic [active] [ref=e1]:
  - generic [ref=e3]:
    - heading "Dorfladen CMS" [level=2] [ref=e4]
    - paragraph [ref=e5]: Bitte Passwort eingeben
    - generic [ref=e6]:
      - textbox "Passwort" [ref=e7]
      - button "👁" [ref=e8] [cursor=pointer]
    - button "Anmelden" [ref=e9] [cursor=pointer]
  - text: AN AN AUS AUS AUS AN AUS
  - generic [ref=e10]: ⚠ TEST-UMGEBUNG – Nicht die Live-Seite!
```

# Test source

```ts
  1735 | test.describe('Bestellstatus – Lucide Icons', () => {
  1736 |   test('T-29-16 Bestellstatus laedt Lucide Script (AK-FLEISCH-29)', async ({ page }) => {
  1737 |     await page.goto(`${BASE}/bestellstatus`);
  1738 |     await page.waitForTimeout(3000);
  1739 |     const hasLucide = await page.evaluate(() => typeof window.lucide !== 'undefined' && typeof window.lucide.createIcons === 'function');
  1740 |     expect(hasLucide).toBe(true);
  1741 |   });
  1742 | 
  1743 |   test('T-29-17 Bestellstatus hat Lucide Icons statt Emojis (AK-FLEISCH-29)', async ({ page }) => {
  1744 |     await page.goto(`${BASE}/bestellstatus`);
  1745 |     await page.waitForTimeout(3000);
  1746 |     const svgIcons = await page.locator('svg.lucide').count();
  1747 |     expect(svgIcons).toBeGreaterThan(0);
  1748 |   });
  1749 | });
  1750 | 
  1751 | // ═══════════════════════════════════════════════════════════
  1752 | // AK-ST – Storno mit Begründung
  1753 | // ═══════════════════════════════════════════════════════════
  1754 | test.describe('AK-ST – Storno mit Begründung', () => {
  1755 |   test('T-ST-01 Kiosk Shop-Storno ruft showShopStornoDialog auf (AK-ST-02)', async ({ page }) => {
  1756 |     await page.goto(KIOSK_URL);
  1757 |     await page.waitForTimeout(3000);
  1758 |     const content = await page.content();
  1759 |     expect(content).toContain('showShopStornoDialog');
  1760 |     expect(content).toContain('SHOP_STORNO_REASONS');
  1761 |     expect(content).toContain('Stornierungsgrund (Pflichtfeld)');
  1762 |   });
  1763 | 
  1764 |   test('T-ST-02 Kiosk Metzger-Storno ruft showMetzgerStornoDialog auf (AK-ST-03)', async ({ page }) => {
  1765 |     await page.goto(KIOSK_URL);
  1766 |     await page.waitForTimeout(3000);
  1767 |     const content = await page.content();
  1768 |     expect(content).toContain('showMetzgerStornoDialog');
  1769 |     expect(content).toContain('METZGER_STORNO_REASONS');
  1770 |   });
  1771 | 
  1772 |   test('T-ST-03 Kiosk Shop-Storno: Button disabled ohne Grund (AK-ST-02)', async ({ page }) => {
  1773 |     await page.goto(KIOSK_URL);
  1774 |     await page.waitForTimeout(3000);
  1775 |     // Verify that the confirm button starts disabled in the dialog template
  1776 |     const content = await page.content();
  1777 |     expect(content).toContain('storno-shop-confirm');
  1778 |     expect(content).toContain('disabled>Stornieren');
  1779 |   });
  1780 | 
  1781 |   test('T-ST-04 Kiosk Metzger-Storno: Button disabled ohne Grund (AK-ST-03)', async ({ page }) => {
  1782 |     await page.goto(KIOSK_URL);
  1783 |     await page.waitForTimeout(3000);
  1784 |     const content = await page.content();
  1785 |     expect(content).toContain('storno-fm-confirm');
  1786 |     expect(content).toContain('disabled>Stornieren');
  1787 |   });
  1788 | 
  1789 |   test('T-ST-05 Shop-Kundenansicht: Storno hat Pflicht-Grund-Textfeld (AK-ST-07)', async ({ page }) => {
  1790 |     await page.goto(`${BASE}/shop.html`);
  1791 |     await page.waitForTimeout(3000);
  1792 |     const content = await page.content();
  1793 |     expect(content).toContain('data-cancel-reason');
  1794 |     expect(content).toContain('Grund f\u00fcr Stornierung (Pflichtfeld)');
  1795 |   });
  1796 | 
  1797 |   test('T-ST-06 Bestellstatus Fleisch-Storno: prompt mit Begründung (AK-ST-08)', async ({ page }) => {
  1798 |     await page.goto(`${BASE}/bestellstatus`);
  1799 |     await page.waitForTimeout(3000);
  1800 |     const content = await page.content();
  1801 |     expect(content).toContain('Bitte geben Sie einen Grund an');
  1802 |     expect(content).toContain('Stornierungsgrund');
  1803 |   });
  1804 | 
  1805 |   test('T-ST-07 CMS Shop-Storno: cmsShowShopStornoDialog (AK-ST-05)', async ({ page }) => {
  1806 |     await page.goto(`${BASE}/cms.html`);
  1807 |     await page.waitForTimeout(2000);
  1808 |     const content = await page.content();
  1809 |     expect(content).toContain('cmsShowShopStornoDialog');
  1810 |     expect(content).toContain('CMS_SHOP_STORNO_REASONS');
  1811 |   });
  1812 | 
  1813 |   test('T-ST-08 CMS Metzger-Storno: Dialog mit Gründen (AK-ST-06)', async ({ page }) => {
  1814 |     await page.goto(`${BASE}/cms.html`);
  1815 |     await page.waitForTimeout(2000);
  1816 |     const content = await page.content();
  1817 |     expect(content).toContain('CMS_FM_STORNO_REASONS');
  1818 |     expect(content).toContain('data-fm-storno');
  1819 |   });
  1820 | 
  1821 |   test('T-ST-09 Kiosk sendet storno_grund statt personal_antwort (AK-ST-04)', async ({ page }) => {
  1822 |     await page.goto(KIOSK_URL);
  1823 |     await page.waitForTimeout(3000);
  1824 |     const content = await page.content();
  1825 |     // Shop und Metzger setShopStatus/setMetzgerStatus sollen storno_grund nutzen
  1826 |     expect(content).toContain('payload.storno_grund');
  1827 |     // Sicherstellen, dass personal_antwort NICHT für Storno verwendet wird
  1828 |     expect(content).not.toContain('payload.personal_antwort = grund');
  1829 |   });
  1830 | 
  1831 |   test('T-ST-10 CMS sendet storno_grund statt personal_antwort (AK-ST-04)', async ({ page }) => {
  1832 |     await page.goto(`${BASE}/cms.html`);
  1833 |     await page.waitForTimeout(2000);
  1834 |     const content = await page.content();
> 1835 |     expect(content).toContain('storno_grund');
       |                     ^ Error: expect(received).toContain(expected) // indexOf
  1836 |   });
  1837 | });
  1838 | 
```