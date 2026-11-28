#!/usr/bin/env node
'use strict';
const fs = require('fs');
const http = require('http');
const path = require('path');
const { spawn, spawnSync } = require('child_process');
const root = path.resolve(__dirname, '..');

function git(...args) {
  const result = spawnSync('git', args, { cwd: root, encoding: 'utf8' });
  if (result.error || result.status !== 0) throw new Error('Git-Abfrage fehlgeschlagen: ' + (result.error?.message || result.stderr));
  return result.stdout.split(/\r?\n/).filter(Boolean);
}
function matches(pattern, file) {
  return new RegExp('^' + pattern.replace(/[.+^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '[^/]*') + '$').test(file);
}
function select(files, mapping, available) {
  const specs = new Set(), missing = [];
  for (const [pattern, names] of Object.entries(mapping)) {
    if (!Array.isArray(names) || names.some((name) => !available.includes(name.endsWith('.spec.js') ? name : name + '.spec.js'))) {
      throw new Error('Ungültige Testzuordnung: ' + pattern);
    }
  }
  for (const file of files) {
    if (/^tests\/.+\.spec\.js$/.test(file)) { specs.add(path.basename(file)); continue; }
    if (!/^(static-site|api)\//.test(file)) continue;
    let found = false;
    for (const [pattern, names] of Object.entries(mapping)) {
      if (!matches(pattern, file)) continue;
      names.forEach((name) => specs.add(name.endsWith('.spec.js') ? name : name + '.spec.js')); found = true;
    }
    if (!found) missing.push(file);
  }
  if (missing.length) throw new Error('Keine Testzuordnung für:\n' + missing.join('\n') + '\nBitte tools/test-zuordnung.json ergänzen.');
  return [...specs].sort();
}
async function server(directory) {
  const types = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
    '.css': 'text/css; charset=utf-8', '.json': 'application/json', '.png': 'image/png',
    '.jpg': 'image/jpeg', '.svg': 'image/svg+xml', '.webmanifest': 'application/manifest+json' };
  const instance = http.createServer((req, res) => {
    let pathname;
    try { pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname); }
    catch { res.writeHead(400); res.end(); return; }
    const file = path.resolve(directory, '.' + pathname + (pathname.endsWith('/') ? 'index.html' : ''));
    const relative = path.relative(directory, file);
    if (relative.startsWith('..') || path.isAbsolute(relative)) { res.writeHead(403); res.end(); return; }
    fs.stat(file, (error, stat) => {
      if (error || !stat.isFile()) { res.writeHead(404); res.end(); return; }
      const stream = fs.createReadStream(file);
      stream.on('error', (err) => { console.error('Testserver:', err.message); res.destroy(err); });
      res.writeHead(200, { 'Content-Type': types[path.extname(file)] || 'application/octet-stream' }); stream.pipe(res);
    });
  });
  await new Promise((resolve, reject) => {
    instance.once('error', reject); instance.listen(0, '127.0.0.1', resolve);
  });
  return { instance, url: 'http://127.0.0.1:' + instance.address().port };
}
function run(args, env) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, args, { cwd: root, env, stdio: 'inherit' });
    child.once('error', reject); child.once('exit', (code) => resolve(code === null ? 1 : code));
  });
}
async function main(args) {
  const [level, ...rest] = args;
  if (!['geaendert', 'schnell', 'voll'].includes(level)) throw new Error('Aufruf: node tools/test-lauf.js geaendert|schnell|voll [--alle-ansichten] [Playwright-Argumente]');
  const all = level === 'voll' || rest.includes('--alle-ansichten');
  const forwarded = rest.filter((value) => value !== '--alle-ansichten' && !value.startsWith('--seit='));
  const project = forwarded.some((value) => value === '--project' || value.startsWith('--project='));
  const tests = [];
  if (level === 'geaendert') {
    const since = (rest.find((value) => value.startsWith('--seit=')) || '').slice(7);
    const files = [...new Set([...(since ? git('diff', '--name-only', since + '...HEAD') : []),
      ...git('diff', '--name-only', 'HEAD'), ...git('ls-files', '--others', '--exclude-standard')])];
    const mapping = JSON.parse(fs.readFileSync(path.join(__dirname, 'test-zuordnung.json'), 'utf8'));
    const available = fs.readdirSync(path.join(root, 'tests')).filter((name) => name.endsWith('.spec.js'));
    tests.push(...select(files, mapping, available));
    console.log(files.length + ' geänderte Dateien -> ' + tests.length + ' Testdateien: ' + tests.join(', '));
    if (!tests.length) { console.log('Keine UI-/API-Verhaltensänderungen mit Playwright-Testbedarf.'); return 0; }
  }
  const env = { ...process.env };
  let local;
  try {
    if (!env.TEST_URL) {
      local = await server(path.join(root, 'static-site')); env.TEST_URL = local.url;
      const response = await fetch(local.url + '/angebote.html');
      if (!response.ok) throw new Error('Der lokale Testserver ist nicht bereit.');
    }
    if (all) env.ALLE_ANSICHTEN = '1';
    console.log('Ansichten: ' + (project ? 'explizite Projektauswahl' : all ? 'vier für UI; @ohne-layout einmal' : 'Desktop') + ' · ' + env.TEST_URL);
    return await run([path.join(root, 'node_modules', '@playwright', 'test', 'cli.js'), 'test',
      ...tests, ...(!all && !project ? ['--project=desktop'] : []), ...forwarded], env);
  } finally { if (local) await new Promise((resolve) => local.instance.close(resolve)); }
}
module.exports = { matches, select, server, run, main };
if (require.main === module) main(process.argv.slice(2)).then((code) => { process.exitCode = code; })
  .catch((error) => { console.error(error.message); process.exitCode = 1; });
