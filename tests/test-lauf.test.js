const { test } = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { select, server, run } = require('../tools/test-lauf');

test('TC-F37-01: genaue Zuordnung statt stiller Null-Laeufe', () => {
  const mapping = { 'static-site/js/angebote-*.js': ['angebote-flyer'] };
  const available = ['angebote-flyer.spec.js', 'cms-angebote-ablauf.spec.js'];
  assert.deepEqual(select(['static-site/js/angebote-kunden.js', 'tests/cms-angebote-ablauf.spec.js'], mapping, available), available);
  assert.throws(() => select(['static-site/js/unbekannt.js'], mapping, available), /Keine Testzuordnung/);
  assert.throws(() => select([], { '*': ['fehlt'] }, available), /Ungültige Testzuordnung/);
});
test('TC-F37-02: Node-Server antwortet auch waehrend eines Kindprozesses', async () => {
  const local = await server(path.resolve(__dirname, '..', 'static-site'));
  try {
    const { spawn } = require('node:child_process');
    const code = await new Promise((resolve, reject) => {
      const child = spawn(process.execPath, ['-e', `fetch(${JSON.stringify(local.url + '/angebote.html')}).then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(2))`]);
      child.once('error', reject); child.once('exit', resolve);
    });
    assert.equal(code, 0);
    assert.equal((await fetch(local.url + '/fehlt.html')).status, 404);
  } finally { await new Promise((resolve) => local.instance.close(resolve)); }
  await assert.rejects(fetch(local.url));
  assert.equal(await run(['-e', 'process.exit(7)'], process.env), 7);
});
