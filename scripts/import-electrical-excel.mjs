import { readFileSync, writeFileSync } from 'node:fs';

const rawJson = readFileSync('data/parsed_excel.json', 'utf8').replace(/^\uFEFF/, '');
const allRows = JSON.parse(rawJson);
const dataRows = allRows.slice(1);

console.log(`Processing ${dataRows.length} rows from Excel...`);

// 1. Identify distinct root transformers mentioned as parents
const rootTransformers = new Set();
dataRows.forEach(r => {
  const p = (r.H || '').trim();
  if (p.startsWith('TR')) rootTransformers.add(p);
});

console.log('Transformers to add as primary roots:', Array.from(rootTransformers));

// 2. Prepare items
const nodes = [];
let seq = 1;

// First, add the Transformer roots
const trMap = new Map();
for (const trTag of Array.from(rootTransformers).sort()) {
  const id = 'EL-' + String(seq++).padStart(6, '0');
  const node = {
    id,
    nodeCode: trTag,
    name: 'หม้อแปลงไฟฟ้า ' + trTag,
    nodeType: 'DV',
    parentId: null,
    currentRating: 0,
    voltage: '22kV/400V',
    location: 'ลานหม้อแปลง / หม้อแปลงหลัก',
    remark: 'หม้อแปลงไฟฟ้าแรงสูงจ่ายให้ MDB',
    imageUrl: '',
    driveFileId: '',
    rawParentTag: '',
    rawParentName: ''
  };
  nodes.push(node);
  trMap.set(trTag, node);
}

// Map each Excel row
const tagCounts = new Map();
dataRows.forEach(r => {
  const t = (r.B || '').trim().toUpperCase();
  if (t) tagCounts.set(t, (tagCounts.get(t) || 0) + 1);
});

const usedCodes = new Set(nodes.map(n => n.nodeCode));
const tagInstanceCounter = new Map();

for (const r of dataRows) {
  let tag = (r.B || '').trim().toUpperCase();
  if (!tag) continue;

  const rawName = (r.C || '').trim();
  const rawType = (r.D || '').trim().toUpperCase();
  const rawParentTag = (r.H || '').trim().toUpperCase();
  const rawParentName = (r.I || '').trim();
  const location = (r.J || '').trim();
  const details = (r.K || '').trim();
  const note = (r.L || '').trim();
  const status = (r.F || '').trim();
  const statusDesc = (r.G || '').trim();
  const imageUrl = (r.N || '').trim();

  // Disambiguate duplicate tags if any
  let nodeCode = tag;
  if (usedCodes.has(nodeCode)) {
    const count = (tagInstanceCounter.get(tag) || 1) + 1;
    tagInstanceCounter.set(tag, count);
    if (rawParentTag) {
      nodeCode = `${tag} (${rawParentTag})`;
    } else {
      nodeCode = `${tag}-${count}`;
    }
    // If still duplicate, add index
    if (usedCodes.has(nodeCode)) {
      nodeCode = `${tag}-${count}`;
    }
  }
  usedCodes.add(nodeCode);

  let currentRating = 0;
  if (details) {
    const m = details.match(/(\d+(?:\.\d+)?)/);
    if (m) currentRating = parseFloat(m[1]) || 0;
  }

  let nodeType = 'DB';
  if (['MDB', 'DB', 'LP', 'MC', 'DV'].includes(rawType)) {
    nodeType = rawType;
  } else if (rawType.includes('MC') || rawType.includes('เครื่อง')) {
    nodeType = 'MC';
  } else if (rawType.includes('LP') || rawType.includes('LOAD')) {
    nodeType = 'LP';
  } else if (rawType.includes('MDB')) {
    nodeType = 'MDB';
  }

  let voltage = '400V 3P4W';
  if (nodeType === 'LP' && currentRating <= 100) voltage = '230V 1P';
  if (details.includes('230V')) voltage = '230V 1P';

  let remark = note;
  if (status && status !== 'ON') {
    remark = (remark ? remark + ' | ' : '') + `สถานะ: ${status} (${statusDesc || status})`;
  }

  let driveFileId = '';
  if (imageUrl) {
    const match = imageUrl.match(/\/d\/([\w-]+)/);
    if (match) driveFileId = match[1];
  }

  const id = 'EL-' + String(seq++).padStart(6, '0');
  nodes.push({
    id,
    nodeCode,
    originalTag: tag,
    name: rawName || nodeCode,
    nodeType,
    parentId: null,
    currentRating,
    voltage,
    location,
    remark,
    imageUrl,
    driveFileId,
    rawParentTag,
    rawParentName
  });
}

console.log(`Created ${nodes.length} total node objects (including transformers).`);

// 3. Resolve parent links
const nodeByCode = new Map();
const nodesByOriginalTag = new Map();

nodes.forEach(n => {
  nodeByCode.set(n.nodeCode, n);
  const orig = n.originalTag || n.nodeCode;
  if (!nodesByOriginalTag.has(orig)) nodesByOriginalTag.set(orig, []);
  nodesByOriginalTag.get(orig).push(n);
});

let linkedCount = 0;
for (const n of nodes) {
  if (!n.rawParentTag) continue;

  let targetParent = null;

  // Try exact nodeCode first
  if (nodeByCode.has(n.rawParentTag)) {
    targetParent = nodeByCode.get(n.rawParentTag);
  } else if (nodesByOriginalTag.has(n.rawParentTag)) {
    const candidates = nodesByOriginalTag.get(n.rawParentTag);
    if (candidates.length === 1) {
      targetParent = candidates[0];
    } else if (n.rawParentName) {
      // Disambiguate using parent name
      targetParent = candidates.find(c => c.name.includes(n.rawParentName) || n.rawParentName.includes(c.name)) || candidates[0];
    } else {
      targetParent = candidates[0];
    }
  }

  if (targetParent && targetParent.id !== n.id) {
    n.parentId = targetParent.id;
    linkedCount++;
  }
}

console.log(`Resolved parent links for ${linkedCount} / ${nodes.length} nodes.`);

// Generate SQL insert batch
function esc(str) {
  if (str === null || str === undefined) return "''";
  return "'" + String(str).replace(/'/g, "''") + "'";
}

const sqlLines = [
  '-- Seed electrical nodes from Excel backup',
  'DELETE FROM electrical_nodes;'
];

const now = new Date(Date.now() + 7 * 3600 * 1000).toISOString().replace('T', ' ').substring(0, 19);

for (const n of nodes) {
  const pId = n.parentId ? esc(n.parentId) : 'NULL';
  sqlLines.push(
    `INSERT INTO electrical_nodes (id, node_code, name, node_type, parent_id, current_rating, voltage, location, remark, image_url, drive_file_id, sort_order, is_active, created_at, updated_at) VALUES (${esc(n.id)}, ${esc(n.nodeCode)}, ${esc(n.name)}, ${esc(n.nodeType)}, ${pId}, ${n.currentRating}, ${esc(n.voltage)}, ${esc(n.location)}, ${esc(n.remark)}, ${esc(n.imageUrl)}, ${esc(n.driveFileId)}, 0, 1, ${esc(now)}, ${esc(now)});`
  );
}

writeFileSync('data/import_electrical.sql', sqlLines.join('\n'), 'utf8');
console.log(`Generated data/import_electrical.sql with ${sqlLines.length - 2} INSERT statements.`);
