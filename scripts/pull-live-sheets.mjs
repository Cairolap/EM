import {writeFile} from 'node:fs/promises';

const CONFIG = {
  machines: '1x08c0h6iuPKLc4CSGChW1c6XmHXLBSoF1Kx8pPXbwBw',
  parts: '1fnLyZPTjMnQna1QJ_lw5oABhTF3ZE4HNHqa3xxN8I9w',
  departments: {
    CC: {name: 'ฝาจีบ', id: '1A-f2MLXRE1vPNCib_AbW7r-z_oGSrvp_2dbHBAYoOpA'},
    PP: {name: 'ฝาเกลียว', id: '1D9Iqgvlfn5djuelTClIoveodaekC36IzS1zyHJFHL4k'},
    MX: {name: 'ฝาแม็กซี่', id: '1j-kn4cIWPN514aTTGQUyG4TXFvsV3x8eNBjpeoln3Jk'},
    PC: {name: 'ฝาพลาสติก', id: '1BLT14dffnwKFWc2sFRj4ATayWOYX1xRGNItf47wgyw0'},
    PR: {name: 'งานพิมพ์', id: '1wa78VhSPCvn4y2R6htP6emNzBzlsGh4VO_RVETr94gY'},
    OT: {name: 'อื่นๆ', id: '1cJaHDOIrF8F6PnDVogibparw4BGVt4tTcTBk3Swp9do'}
  }
};

function parseCsv(text) {
  const rows = [];
  let row = [], field = '', inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (i + 1 < text.length && text[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += c;
      }
    } else {
      if (c === '"') {
        inQuotes = true;
      } else if (c === ',') {
        row.push(field.trim());
        field = '';
      } else if (c === '\n' || c === '\r') {
        if (c === '\r' && i + 1 < text.length && text[i + 1] === '\n') i++;
        row.push(field.trim());
        if (row.some(x => x !== '')) rows.push(row);
        row = [];
        field = '';
      } else {
        field += c;
      }
    }
  }
  if (field || row.length > 0) {
    row.push(field.trim());
    if (row.some(x => x !== '')) rows.push(row);
  }
  if (rows.length === 0) return [];
  const headers = rows[0].map(h => h.replace(/^"(.*)"$/, '$1').trim());
  return rows.slice(1).map(r => {
    const obj = {};
    headers.forEach((h, idx) => {
      if (h) {
        const val = r[idx] ?? '';
        obj[h] = val.replace(/^"(.*)"$/, '$1');
      }
    });
    return obj;
  });
}

async function fetchSheetCsv(spreadsheetId, sheetName) {
  const url = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(sheetName)}`;
  try {
    const res = await fetch(url);
    if (!res.ok) return [];
    const text = await res.text();
    if (text.includes('<!DOCTYPE html>') || text.includes('Google Docs - Error')) return [];
    return parseCsv(text);
  } catch (e) {
    console.warn(`Failed to fetch ${sheetName}: ${e.message}`);
    return [];
  }
}

console.log('=== 1. Fetching Registry (Departments, Lines, Machines) ===');
const rawDepts = await fetchSheetCsv(CONFIG.machines, 'Departments');
const rawLines = await fetchSheetCsv(CONFIG.machines, 'Lines');
const rawMachines = await fetchSheetCsv(CONFIG.machines, 'Machines');

const departments = rawDepts.map(d => ({
  id: d.DeptID || d.id,
  name: d.DeptName || d.name,
  is_active: String(d.IsActive || d.is_active).toUpperCase() === 'TRUE' ? 1 : 0
}));

const lines = rawLines.map(l => ({
  id: l.LineID || l.id,
  department_id: l.DeptID || l.department_id,
  name: l.LineName || l.name,
  is_active: String(l.IsActive || l.is_active).toUpperCase() === 'TRUE' ? 1 : 0,
  remark: l.Remark || l.remark || ''
}));

const machines = rawMachines.map(m => ({
  id: m.MachineID || m.id,
  code: m.MachineCode || m.code,
  name: m.MachineName || m.name,
  department_id: m.DeptID || m.department_id,
  line_id: m.LineID || m.line_id,
  manufacturer: m.Manufacturer || m.manufacturer || '',
  model: m.Model || m.model || '',
  serial_no: m.SerialNo || m.serial_no || '',
  machine_type: m.MachineType || m.machine_type || '',
  install_date: m.InstallDate || m.install_date || '',
  criticality: m.Criticality || m.criticality || 'กลาง',
  status: m.Status || m.status || 'ใช้งาน',
  location_detail: m.LocationDetail || m.location_detail || '',
  photo_file_id: m.PhotoFileID || m.photo_file_id || '',
  photo_file_name: m.PhotoFileName || m.photo_file_name || '',
  manual_url: m.ManualURL || m.manual_url || '',
  remark: m.Remark || m.remark || '',
  created_at: m.CreatedAt || m.created_at || new Date().toISOString(),
  created_by: m.CreatedBy || m.created_by || 'import',
  updated_at: m.UpdatedAt || m.updated_at || new Date().toISOString(),
  updated_by: m.UpdatedBy || m.updated_by || 'import',
  is_active: String(m.IsActive || m.is_active).toUpperCase() === 'TRUE' ? 1 : 0,
  version: Number(m.Version || m.version) || 1,
  request_id: m.RequestID || m.request_id || 'import-init'
}));

console.log(`Fetched ${departments.length} departments, ${lines.length} lines, ${machines.length} machines`);

console.log('=== 2. Fetching Master Parts & Brands ===');
const rawParts = await fetchSheetCsv(CONFIG.parts, 'Parts');
const rawBrands = await fetchSheetCsv(CONFIG.parts, 'Brands');

const brands = rawBrands.map(b => ({
  id: b['Brand ID'] || b.id || b.BrandID || ('BR-' + (b.Name || b.name)),
  name: b.Name || b.name,
  active: String(b.Active || b.active || b.IsActive).toUpperCase() === 'TRUE' ? 1 : 0,
  version: Number(b.Version || b.version) || 1
}));

const parts = rawParts.map(p => {
  const priceRaw = p.Price || p.price;
  const price = priceRaw !== '' && priceRaw != null && !isNaN(Number(priceRaw)) ? Number(priceRaw) : null;
  const lifeRaw = p['อายุอุปกรณ์ (ปี)'] || p['อายุอุปกรณ์'] || p.lifespan;
  const lifespan = lifeRaw !== '' && lifeRaw != null && !isNaN(Number(lifeRaw)) ? Number(lifeRaw) : null;
  return {
    id: p.ID || p.id,
    part_number: p['Part number'] || p.part_number || '',
    description: p.Description || p.description || '',
    brand: p.Brand || p.brand || '',
    price: price,
    store_code: p['Store code'] || p.store_code || '',
    lifespan: lifespan,
    notes: p.Notes || p.notes || '',
    picture: p.Picture || p.picture || '',
    thumbnail: p.Thumbnail || p.thumbnail || '',
    created_at: p['Created at'] || p.created_at || new Date().toISOString(),
    updated_at: p['Updated at'] || p.updated_at || new Date().toISOString(),
    version: Number(p.Version || p.version) || 1,
    request_id: p['Request ID'] || p.request_id || 'import-init'
  };
});

console.log(`Fetched ${parts.length} parts, ${brands.length} brands`);

console.log('=== 3. Fetching Equipment BOM Records across All Departments ===');
const equipment = [];
for (const line of lines) {
  const deptCode = line.department_id;
  const dept = CONFIG.departments[deptCode];
  if (!dept) continue;
  const sheetName = 'LINE_' + line.id;
  const rows = await fetchSheetCsv(dept.id, sheetName);
  if (rows.length > 0) {
    console.log(`  -> Found ${rows.length} BOM records in [${deptCode}] ${sheetName}`);
    for (const r of rows) {
      const recId = r.RecordID || r.recordId || r.id;
      const partId = r.PartID || r.partId;
      const label = r.Label || r.label;
      if (recId || partId || label) {
        equipment.push({
          id: recId || crypto.randomUUID(),
          equipment_id: r.EquipmentID || r.equipmentId || recId || crypto.randomUUID(),
          machine_id: r.MachineID || r.machineId || '',
          part_id: partId || '',
          label: label || '',
          quantity: Number(r.Quantity != null ? r.Quantity : (r.quantity != null ? r.quantity : 1)) || 1,
          installed_at: r.InstalledAt || r.installedAt || '',
          due_mode: r.DueMode || r.dueMode || 'PART_LIFE',
          manual_expiry_date: r.ManualExpiryDate || r.manualExpiryDate || '',
          notes: r.Notes || r.notes || '',
          record_status: r.RecordStatus || r.recordStatus || 'ACTIVE',
          ended_at: r.EndedAt || r.endedAt || '',
          previous_record_id: r.PreviousRecordID || r.previousRecordId || '',
          created_at: r.CreatedAt || r.createdAt || new Date().toISOString(),
          created_by: r.CreatedBy || r.createdBy || 'import',
          updated_at: r.UpdatedAt || r.updatedAt || new Date().toISOString(),
          updated_by: r.UpdatedBy || r.updatedBy || 'import',
          version: Number(r.Version || r.version) || 1,
          operation_id: r.OperationID || r.operationId || 'import-init'
        });
      }
    }
  }
}

console.log(`Total Equipment BOM records fetched: ${equipment.length}`);

const snapshot = {
  exportedAt: new Date().toISOString(),
  source: 'Google Sheets Live Extraction',
  departments,
  lines,
  brands,
  machines,
  parts,
  equipment
};

const outPath = new URL('../data/snapshot_production.json', import.meta.url);
await writeFile(outPath, JSON.stringify(snapshot, null, 2), 'utf8');
console.log('✅ Successfully wrote data/snapshot_production.json');
