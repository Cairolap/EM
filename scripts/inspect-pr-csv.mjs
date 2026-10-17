import fs from 'node:fs';

function parseCsv(content) {
  const lines = content.split(/\r?\n/).filter(l => l.trim().length > 0);
  const header = parseCsvLine(lines[0]);
  const rows = [];
  for (let i = 1; i < lines.length; i++) {
    const vals = parseCsvLine(lines[i]);
    if (vals.length > 0) {
      const obj = {};
      header.forEach((h, idx) => {
        obj[h] = vals[idx] !== undefined ? vals[idx].trim() : '';
      });
      rows.push(obj);
    }
  }
  return { header, rows };
}

function parseCsvLine(text) {
  const result = [];
  let cur = '';
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (c === '"') {
      if (inQuotes && text[i+1] === '"') {
        cur += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (c === ',' && !inQuotes) {
      result.push(cur);
      cur = '';
    } else {
      cur += c;
    }
  }
  result.push(cur);
  return result.map(s => s.replace(/^"+|"+$/g, '').trim());
}

const file1 = 'D:/Wep Local/EM/tests/purchase-requisition-2026-10-17.csv';
const file2 = 'D:/Wep Local/EM/tests/purchase-requisition-2026-10-17 (1).csv';

const { header: h1, rows: rows1 } = parseCsv(fs.readFileSync(file1, 'utf8'));
const { header: h2, rows: rows2 } = parseCsv(fs.readFileSync(file2, 'utf8'));

console.log('Header 1:', h1);
console.log('Header 2:', h2);
console.log('File 1 count:', rows1.length);
console.log('File 2 count:', rows2.length);

console.log('\n--- Sample row from File 1 ---');
console.log(rows1[0]);

console.log('\n--- Sample row from File 2 ---');
console.log(rows2[0]);

// Collect unique areas
const areas = new Set([...rows1.map(r => r['พื้นที่']), ...rows2.map(r => r['พื้นที่'])]);
console.log('\nAll unique areas found:', Array.from(areas));

// Check overlap
function getRowKey(r) {
  // Key based on order, description, and doc
  return `${r['ORDER']}###${r['Description'].toLowerCase().replace(/\s+/g, ' ')}###${r['Qty']}`;
}

const map = new Map();
let duplicates = 0;

rows1.forEach((r, idx) => {
  const k = getRowKey(r);
  map.set(k, { file: 1, idx, row: r });
});

const prValues = new Set();
const allRows = [...rows1, ...rows2];
allRows.forEach(r => {
  const v = r['PR / เบิกสโตร์'];
  if (v) prValues.add(v);
});
console.log('\nAll PR / เบิกสโตร์ values count:', prValues.size);
console.log(Array.from(prValues));


