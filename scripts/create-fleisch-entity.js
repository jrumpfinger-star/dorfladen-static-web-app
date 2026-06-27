/**
 * Script to create the dl_fleischbestellung entity in Dataverse
 * via the Dataverse Web API (EntityDefinitions).
 * 
 * Usage: node scripts/create-fleisch-entity.js
 * 
 * Requires environment variables:
 *   DV_TENANT_ID, DV_CLIENT_ID, DV_CLIENT_SECRET, DV_DEFAULT_URL
 * Or uses defaults from the API code.
 */
const https = require('https');
const http = require('http');

// ── Config ──
const TENANT_ID = process.env.DV_TENANT_ID || 'acfaedd4-c403-43b7-9544-fdb2b150124e';
const CLIENT_ID = process.env.DV_CLIENT_ID || '137b2df6-be83-459a-ac89-9efd0bdf51c4';
const CLIENT_SECRET = process.env.DV_CLIENT_SECRET || '';
const DV_URL = process.env.DV_DEFAULT_URL || 'https://orgab4e2f00.crm16.dynamics.com';
const SOLUTION = 'DorfladenOberornau';

if (!CLIENT_SECRET) {
  console.error('ERROR: DV_CLIENT_SECRET is required. Set it as environment variable.');
  process.exit(1);
}

// ── Get OAuth token ──
async function getToken() {
  const tokenUrl = `https://login.microsoftonline.com/${TENANT_ID}/oauth2/v2.0/token`;
  const body = new URLSearchParams({
    grant_type: 'client_credentials',
    client_id: CLIENT_ID,
    client_secret: CLIENT_SECRET,
    scope: `${DV_URL}/.default`
  }).toString();

  return new Promise((resolve, reject) => {
    const url = new URL(tokenUrl);
    const req = https.request({
      hostname: url.hostname,
      path: url.pathname,
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'Content-Length': Buffer.byteLength(body) }
    }, res => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => {
        try {
          const j = JSON.parse(data);
          if (j.access_token) resolve(j.access_token);
          else reject(new Error('No access_token: ' + data));
        } catch (e) { reject(e); }
      });
    });
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

// ── Dataverse API call ──
async function dvRequest(method, path, payload, extraHeaders) {
  const url = new URL(path, DV_URL);
  const bodyStr = payload ? JSON.stringify(payload) : '';
  const headers = {
    'Authorization': `Bearer ${await getToken()}`,
    'OData-MaxVersion': '4.0',
    'OData-Version': '4.0',
    'Accept': 'application/json',
    'Content-Type': 'application/json; charset=utf-8',
    ...(extraHeaders || {})
  };
  if (bodyStr) headers['Content-Length'] = Buffer.byteLength(bodyStr);

  return new Promise((resolve, reject) => {
    const req = https.request({
      hostname: url.hostname,
      path: url.pathname + url.search,
      method,
      headers
    }, res => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => resolve({ status: res.statusCode, body: data, headers: res.headers }));
    });
    req.on('error', reject);
    if (bodyStr) req.write(bodyStr);
    req.end();
  });
}

// ── Create Entity ──
async function createEntity() {
  console.log('Creating entity dl_fleischbestellung...');
  
  const entityDef = {
    "@odata.type": "Microsoft.Dynamics.CRM.EntityMetadata",
    "SchemaName": "dl_fleischbestellung",
    "DisplayName": {
      "@odata.type": "Microsoft.Dynamics.CRM.Label",
      "LocalizedLabels": [{ "@odata.type": "Microsoft.Dynamics.CRM.LocalizedLabel", "Label": "Fleischbestellung", "LanguageCode": 1031 }]
    },
    "DisplayCollectionName": {
      "@odata.type": "Microsoft.Dynamics.CRM.Label",
      "LocalizedLabels": [{ "@odata.type": "Microsoft.Dynamics.CRM.LocalizedLabel", "Label": "Fleischbestellungen", "LanguageCode": 1031 }]
    },
    "Description": {
      "@odata.type": "Microsoft.Dynamics.CRM.Label",
      "LocalizedLabels": [{ "@odata.type": "Microsoft.Dynamics.CRM.LocalizedLabel", "Label": "Fleisch- und Wurstwaren Vorbestellungen", "LanguageCode": 1031 }]
    },
    "HasActivities": false,
    "HasNotes": false,
    "OwnershipType": "UserOwned",
    "IsActivity": false,
    "PrimaryNameAttribute": "dl_bestellnummer",
    "Attributes": [
      {
        "@odata.type": "Microsoft.Dynamics.CRM.StringAttributeMetadata",
        "SchemaName": "dl_bestellnummer",
        "DisplayName": { "@odata.type": "Microsoft.Dynamics.CRM.Label", "LocalizedLabels": [{ "@odata.type": "Microsoft.Dynamics.CRM.LocalizedLabel", "Label": "Bestellnummer", "LanguageCode": 1031 }] },
        "Description": { "@odata.type": "Microsoft.Dynamics.CRM.Label", "LocalizedLabels": [{ "@odata.type": "Microsoft.Dynamics.CRM.LocalizedLabel", "Label": "FM-YYYYMMDD-XXXX", "LanguageCode": 1031 }] },
        "RequiredLevel": { "Value": "ApplicationRequired", "CanBeChanged": true },
        "MaxLength": 100,
        "AttributeType": "String",
        "FormatName": { "Value": "Text" },
        "IsPrimaryName": true
      }
    ]
  };

  const res = await dvRequest('POST', `/api/data/v9.2/EntityDefinitions?MSCRM.SolutionUniqueName=${SOLUTION}`, entityDef);
  if (res.status === 204 || res.status === 201) {
    console.log('✅ Entity created successfully!');
  } else {
    console.log(`Entity creation: ${res.status}`);
    console.log(res.body.substring(0, 500));
    if (res.status === 400 && res.body.includes('already exists')) {
      console.log('Entity already exists, continuing with attributes...');
    } else if (res.status !== 204 && res.status !== 201) {
      // Try to continue anyway
    }
  }
}

// ── Add attributes ──
async function addStringAttribute(schemaName, label, maxLength = 200) {
  console.log(`  Adding ${schemaName}...`);
  const attrDef = {
    "@odata.type": "Microsoft.Dynamics.CRM.StringAttributeMetadata",
    "SchemaName": schemaName,
    "DisplayName": { "@odata.type": "Microsoft.Dynamics.CRM.Label", "LocalizedLabels": [{ "@odata.type": "Microsoft.Dynamics.CRM.LocalizedLabel", "Label": label, "LanguageCode": 1031 }] },
    "RequiredLevel": { "Value": "None", "CanBeChanged": true },
    "MaxLength": maxLength,
    "AttributeType": "String",
    "FormatName": { "Value": "Text" }
  };
  const res = await dvRequest('POST', `/api/data/v9.2/EntityDefinitions(LogicalName='dl_fleischbestellung')/Attributes?MSCRM.SolutionUniqueName=${SOLUTION}`, attrDef);
  if (res.status === 204 || res.status === 201) console.log(`  ✅ ${schemaName}`);
  else console.log(`  ⚠️ ${schemaName}: ${res.status} ${res.body.substring(0, 200)}`);
}

async function addMemoAttribute(schemaName, label) {
  console.log(`  Adding ${schemaName} (Memo)...`);
  const attrDef = {
    "@odata.type": "Microsoft.Dynamics.CRM.MemoAttributeMetadata",
    "SchemaName": schemaName,
    "DisplayName": { "@odata.type": "Microsoft.Dynamics.CRM.Label", "LocalizedLabels": [{ "@odata.type": "Microsoft.Dynamics.CRM.LocalizedLabel", "Label": label, "LanguageCode": 1031 }] },
    "RequiredLevel": { "Value": "None", "CanBeChanged": true },
    "AttributeType": "Memo",
    "MaxLength": 100000,
    "Format": "Text"
  };
  const res = await dvRequest('POST', `/api/data/v9.2/EntityDefinitions(LogicalName='dl_fleischbestellung')/Attributes?MSCRM.SolutionUniqueName=${SOLUTION}`, attrDef);
  if (res.status === 204 || res.status === 201) console.log(`  ✅ ${schemaName}`);
  else console.log(`  ⚠️ ${schemaName}: ${res.status} ${res.body.substring(0, 200)}`);
}

async function addDecimalAttribute(schemaName, label) {
  console.log(`  Adding ${schemaName} (Decimal)...`);
  const attrDef = {
    "@odata.type": "Microsoft.Dynamics.CRM.DecimalAttributeMetadata",
    "SchemaName": schemaName,
    "DisplayName": { "@odata.type": "Microsoft.Dynamics.CRM.Label", "LocalizedLabels": [{ "@odata.type": "Microsoft.Dynamics.CRM.LocalizedLabel", "Label": label, "LanguageCode": 1031 }] },
    "RequiredLevel": { "Value": "None", "CanBeChanged": true },
    "AttributeType": "Decimal",
    "Precision": 2,
    "MinValue": -999999999,
    "MaxValue": 999999999
  };
  const res = await dvRequest('POST', `/api/data/v9.2/EntityDefinitions(LogicalName='dl_fleischbestellung')/Attributes?MSCRM.SolutionUniqueName=${SOLUTION}`, attrDef);
  if (res.status === 204 || res.status === 201) console.log(`  ✅ ${schemaName}`);
  else console.log(`  ⚠️ ${schemaName}: ${res.status} ${res.body.substring(0, 200)}`);
}

async function addIntegerAttribute(schemaName, label) {
  console.log(`  Adding ${schemaName} (Integer)...`);
  const attrDef = {
    "@odata.type": "Microsoft.Dynamics.CRM.IntegerAttributeMetadata",
    "SchemaName": schemaName,
    "DisplayName": { "@odata.type": "Microsoft.Dynamics.CRM.Label", "LocalizedLabels": [{ "@odata.type": "Microsoft.Dynamics.CRM.LocalizedLabel", "Label": label, "LanguageCode": 1031 }] },
    "RequiredLevel": { "Value": "None", "CanBeChanged": true },
    "AttributeType": "Integer",
    "MinValue": -2147483648,
    "MaxValue": 2147483647,
    "Format": "None"
  };
  const res = await dvRequest('POST', `/api/data/v9.2/EntityDefinitions(LogicalName='dl_fleischbestellung')/Attributes?MSCRM.SolutionUniqueName=${SOLUTION}`, attrDef);
  if (res.status === 204 || res.status === 201) console.log(`  ✅ ${schemaName}`);
  else console.log(`  ⚠️ ${schemaName}: ${res.status} ${res.body.substring(0, 200)}`);
}

// ── Publish ──
async function publishEntity() {
  console.log('Publishing customizations...');
  const xml = `<importexportxml><entities><entity>dl_fleischbestellung</entity></entities></importexportxml>`;
  const res = await dvRequest('POST', '/api/data/v9.2/PublishXml', { ParameterXml: xml });
  if (res.status === 204 || res.status === 200) console.log('✅ Published!');
  else console.log(`Publish: ${res.status} ${res.body.substring(0, 200)}`);
}

// ── Main ──
async function main() {
  try {
    // 1. Create entity with primary name attribute
    await createEntity();

    // 2. Add additional attributes
    console.log('\nAdding attributes...');
    await addStringAttribute('dl_name', 'Name', 200);
    await addStringAttribute('dl_telefon', 'Telefon', 50);
    await addStringAttribute('dl_email', 'E-Mail', 200);
    await addStringAttribute('dl_liefertag', 'Liefertag', 20);
    await addStringAttribute('dl_bestelldatum', 'Bestelldatum', 100);
    await addMemoAttribute('dl_positionen_json', 'Positionen (JSON)');
    await addDecimalAttribute('dl_gesamtsumme', 'Gesamtsumme');
    await addDecimalAttribute('dl_rabatt_summe', 'Rabatt-Summe');
    await addIntegerAttribute('dl_status', 'Status');
    await addMemoAttribute('dl_anmerkung', 'Anmerkung');
    await addMemoAttribute('dl_kunde_kommentar', 'Kunde Kommentar');
    await addMemoAttribute('dl_personal_antwort', 'Personal Antwort');

    // 3. Publish
    await publishEntity();

    console.log('\n🎉 Entity dl_fleischbestellung created with all attributes!');
    console.log('EntitySet name: dl_fleischbestellungs');
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  }
}

main();
