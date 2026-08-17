// Load DV_CLIENT_SECRET from api/local.settings.json and run create-fleisch-entity.js
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const settingsPath = path.join(__dirname, '..', 'api', 'local.settings.json');
if (!fs.existsSync(settingsPath)) {
  console.error('ERROR: api/local.settings.json not found');
  process.exit(1);
}

const settings = JSON.parse(fs.readFileSync(settingsPath, 'utf8'));
const vals = settings.Values || {};

// Set env vars from local.settings.json
const env = { ...process.env };
for (const [k, v] of Object.entries(vals)) {
  env[k] = v;
}

console.log('DV_CLIENT_SECRET found:', env.DV_CLIENT_SECRET ? 'YES (' + env.DV_CLIENT_SECRET.length + ' chars)' : 'NO');
console.log('DV_DEFAULT_URL:', env.DV_DEFAULT_URL || '(not set, using default)');
console.log('DV_TENANT_ID:', env.DV_TENANT_ID || '(not set, using default)');
console.log('DV_CLIENT_ID:', env.DV_CLIENT_ID || '(not set, using default)');

if (!env.DV_CLIENT_SECRET) {
  console.error('ERROR: DV_CLIENT_SECRET not found in local.settings.json');
  process.exit(1);
}

console.log('\nRunning create-fleisch-entity.js...\n');
try {
  execSync('node ' + path.join(__dirname, 'create-fleisch-entity.js'), { 
    env, 
    stdio: 'inherit',
    cwd: path.join(__dirname, '..')
  });
} catch (e) {
  process.exit(e.status || 1);
}
