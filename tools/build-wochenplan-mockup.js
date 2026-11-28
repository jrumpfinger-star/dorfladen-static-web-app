const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.resolve(__dirname, '..');
const configUrl = 'https://kind-pebble-072605b03-15.westeurope.7.azurestaticapps.net/api/cms-config';

function between(source, start, end) {
  const first = source.indexOf(start);
  const last = source.indexOf(end, first + start.length);
  if (first < 0 || last < 0 || source.indexOf(start, first + start.length) !== -1) {
    throw new Error('CMS-Renderer konnte nicht eindeutig gelesen werden: ' + start);
  }
  return source.slice(first, last);
}

function sources() {
  const cms = fs.readFileSync(path.join(root, 'static-site', 'cms.js'), 'utf8');
  const weekly = fs.readFileSync(path.join(root, 'static-site', 'js', 'wochenangebote-renderer.js'), 'utf8');
  const defaults = between(cms, '  var HPCFG_DEFAULTS=', '  // Wochenplan template color defaults');
  return {
    defaults: vm.runInNewContext(defaults + '\nHPCFG_DEFAULTS;'),
    colors: between(cms, '  var WP_TPL_COLOR_DEFAULTS=', '  var HPCFG_CUSTOM_DEFAULTS_KEY='),
    render: between(cms, '  function generateMenuImage(', '  window.cmsShareWP='),
    context: between(weekly, '  function hdKontext(', '  function hdLogoSrc(')
  };
}

async function build() {
  const response = await fetch(configUrl);
  if (!response.ok) throw new Error('CMS-Design lesen: HTTP ' + response.status);
  const result = await response.json();
  const saved = result.data && result.data.hp_design_config;
  if (!result.success || !saved || typeof saved !== 'object' || Array.isArray(saved)) {
    throw new Error('Das gespeicherte CMS-Design fehlt. Kein Ersatzdesign erzeugt.');
  }
  const source = sources();
  const config = Object.fromEntries(Object.entries({ ...source.defaults, ...saved }).filter(([key]) => key.startsWith('wp')));
  const logo = 'data:image/png;base64,' + fs.readFileSync(path.join(root, 'static-site', 'images', 'dorfladen-logo.png')).toString('base64');
  const bundle = '// Generiert mit node tools\\build-wochenplan-mockup.js; CMS-Zeichencode unveraendert.\n'
    + '(function () {\n"use strict";\nconst config = ' + JSON.stringify(config) + ';\n'
    + 'function hpCfgGet() { return config; }\n'
    + 'function hdLogoSrc() { return ' + JSON.stringify(logo) + '; }\n'
    + source.colors + source.context + source.render
    + 'window.WochenplanMockup = { config, render(rows, header) {\n'
    + 'const flyer = config.wpFlyerTemplate || "classic-red", home = config.wpHomeTemplate || "classic-red";\n'
    + 'const template = flyer !== "classic-red" ? flyer : home !== "classic-red" ? home : flyer;\n'
    + 'const kind = flyer !== "classic-red" ? "flyer" : "home";\n'
    + 'return new Promise((resolve, reject) => generateMenuImage(rows, header, blob => {\n'
    + 'if (blob) resolve(blob); else reject(new Error("Die Wochenplan-Grafik konnte nicht erzeugt werden."));\n'
    + '}, template, kind, { scale: 3 }));\n'
    + '} };\n})();\n';
  const target = path.join(root, 'mockups', 'cms-wochenplan-vorschau.js');
  fs.writeFileSync(target, bundle);
  console.log('CMS-Zeichencode und gespeichertes Design nur lesend uebernommen: ' + path.relative(root, target));
}

module.exports = { sources };
if (require.main === module) build().catch(error => { console.error(error.message); process.exitCode = 1; });
