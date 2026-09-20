import {readFile, writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {spawnSync} from 'node:child_process';

const snapshotFile = process.argv[2];
if (!snapshotFile) {
  console.log('Usage: node scripts/import-snapshot.mjs <path-to-snapshot.json> [--apply]');
  process.exit(1);
}

const raw = await readFile(snapshotFile, 'utf8');
const hash = createHash('sha256').update(raw).digest('hex');
const data = JSON.parse(raw);

const departments = data.departments || [];
const lines = data.lines || [];
const brands = data.brands || [];
const machines = data.machines || [];
const parts = data.parts || [];
const equipment = data.equipment || data.equipment_records || [];

console.log(`Analyzing snapshot (${hash.slice(0, 12)})...`);
console.log(`- Departments: ${departments.length}`);
console.log(`- Lines: ${lines.length}`);
console.log(`- Brands: ${brands.length}`);
console.log(`- Machines: ${machines.length}`);
console.log(`- Parts: ${parts.length}`);
console.log(`- Equipment Records: ${equipment.length}`);

// Validation & Reconcile
const deptIds = new Set(departments.map(d => d.id || d.DeptID));
const lineMap = new Map(lines.map(l => [l.id || l.LineID, l.department_id || l.DeptID]));
const brandIds = new Set(brands.map(b => b.id || b.BrandID));

const errors = [];
let maxMachineNum = 0;
let maxPartNum = 0;

function esc(val) {
  if (val == null) return 'NULL';
  return "'" + String(val).replace(/'/g, "''") + "'";
}

const sqlStatements = [
  '-- Migration snapshot import generated at ' + new Date().toISOString(),
  'PRAGMA foreign_keys = OFF; -- Disable temporarily for bulk snapshot loading'
];

// 1. Departments
for (const d of departments) {
  const id = d.id || d.DeptID;
  const name = d.name || d.DeptName;
  const isActive = (d.is_active != null ? d.is_active : (d.IsActive === false ? 0 : 1)) ? 1 : 0;
  sqlStatements.push(`INSERT OR REPLACE INTO departments (id, name, is_active) VALUES (${esc(id)}, ${esc(name)}, ${isActive});`);
}

// 2. Lines
for (const l of lines) {
  const id = l.id || l.LineID;
  const deptId = l.department_id || l.DeptID;
  const name = l.name || l.LineName;
  const isActive = (l.is_active != null ? l.is_active : (l.IsActive === false ? 0 : 1)) ? 1 : 0;
  const remark = l.remark || l.Remark || '';
  if (!deptIds.has(deptId)) errors.push(`Line ${id} references unknown department ${deptId}`);
  sqlStatements.push(`INSERT OR REPLACE INTO lines (id, department_id, name, is_active, remark) VALUES (${esc(id)}, ${esc(deptId)}, ${esc(name)}, ${isActive}, ${esc(remark)});`);
}

// 3. Brands
for (const b of brands) {
  const id = b.id || b.BrandID || b['Brand ID'];
  const name = b.name || b.Name;
  const normalized = (b.normalized_name || name || '').toLowerCase().trim();
  const isActive = (b.is_active != null ? b.is_active : (b.Active === false ? 0 : 1)) ? 1 : 0;
  const version = Number(b.version) || 1;
  sqlStatements.push(`INSERT OR REPLACE INTO brands (id, name, normalized_name, is_active, version) VALUES (${esc(id)}, ${esc(name)}, ${esc(normalized)}, ${isActive}, ${version});`);
}

// 4. Machines
const seenCodes = new Set();
for (const m of machines) {
  const id = m.id || m.MachineID;
  let code = m.code || m.MachineCode || id;
  let normalizedCode = (m.normalized_code || code || '').toLowerCase().trim();
  const name = m.name || m.MachineName;
  const deptId = m.department_id || m.DeptID;
  const lineId = m.line_id || m.LineID;

  if (seenCodes.has(normalizedCode)) {
    code = `${code}-${id}`;
    normalizedCode = code.toLowerCase().trim();
  }
  seenCodes.add(normalizedCode);

  const mMatch = id?.match(/^M(\d+)$/);
  if (mMatch) maxMachineNum = Math.max(maxMachineNum, parseInt(mMatch[1], 10));

  sqlStatements.push(`INSERT OR REPLACE INTO machines (
    id, code, normalized_code, name, department_id, line_id,
    manufacturer, model, serial_no, machine_type,
    install_date, criticality, status, location_detail,
    photo_file_id, photo_file_name, manual_url, remark,
    created_at, created_by, updated_at, updated_by,
    is_active, version, request_id
  ) VALUES (
    ${esc(id)}, ${esc(code)}, ${esc(normalizedCode)}, ${esc(name)},
    ${esc(deptId)}, ${esc(lineId)},
    ${esc(m.manufacturer || m.Manufacturer || '')},
    ${esc(m.model || m.Model || '')},
    ${esc(m.serial_no || m.SerialNo || '')},
    ${esc(m.machine_type || m.MachineType || '')},
    ${esc(m.install_date || m.InstallDate || '')},
    ${esc(m.criticality || m.Criticality || 'ปกติ')},
    ${esc(m.status || m.Status || 'ใช้งาน')},
    ${esc(m.location_detail || m.LocationDetail || '')},
    ${esc(m.photo_file_id || m.PhotoFileID || '')},
    ${esc(m.photo_file_name || m.PhotoFileName || '')},
    ${esc(m.manual_url || m.ManualURL || '')},
    ${esc(m.remark || m.Remark || '')},
    ${esc(m.created_at || m.CreatedAt || new Date().toISOString())},
    ${esc(m.created_by || m.CreatedBy || 'migration')},
    ${esc(m.updated_at || m.UpdatedAt || new Date().toISOString())},
    ${esc(m.updated_by || m.UpdatedBy || 'migration')},
    ${(m.is_active != null ? m.is_active : (m.IsActive === false ? 0 : 1)) ? 1 : 0},
    ${Number(m.version || m.Version) || 1},
    ${esc(m.request_id || m.RequestID || ('import-' + hash.slice(0, 8)))}
  );`);
}

// 5. Parts
for (const p of parts) {
  const id = p.id || p.ID;
  const partNumber = p.part_number || p['Part number'] || '';
  const description = p.description || p.Description || '';
  const brandId = p.brand_id || null;
  const legacyBrand = p.legacy_brand_name || p.Brand || '';

  const rawPrice = p.price != null ? p.price : (p.Price != null ? p.Price : null);
  let priceMinor = null;
  if (rawPrice !== null && rawPrice !== '' && !isNaN(Number(rawPrice))) {
    priceMinor = Math.round(Number(rawPrice) * 100);
  }

  const pMatch = id?.match(/^PART-(\d+)$/);
  if (pMatch) maxPartNum = Math.max(maxPartNum, parseInt(pMatch[1], 10));

  const lifespan = p.lifespan_years != null ? p.lifespan_years : (p['อายุอุปกรณ์ (ปี)'] != null && p['อายุอุปกรณ์ (ปี)'] !== '' ? Number(p['อายุอุปกรณ์ (ปี)']) : null);

  sqlStatements.push(`INSERT OR REPLACE INTO parts (
    id, part_number, description, brand_id, legacy_brand_name,
    price_minor, store_code, lifespan_years, notes,
    picture_source, thumbnail_source,
    created_at, updated_at, version, request_id
  ) VALUES (
    ${esc(id)}, ${esc(partNumber)}, ${esc(description)},
    ${brandId ? esc(brandId) : 'NULL'}, ${esc(legacyBrand)},
    ${priceMinor !== null ? priceMinor : 'NULL'},
    ${esc(p.store_code || p['Store code'] || '')},
    ${lifespan !== null && !isNaN(lifespan) ? lifespan : 'NULL'},
    ${esc(p.notes || p.Notes || '')},
    ${esc(p.picture_source || p.Picture || '')},
    ${esc(p.thumbnail_source || p.Thumbnail || '')},
    ${esc(p.created_at || p['Created at'] || new Date().toISOString())},
    ${esc(p.updated_at || p['Updated at'] || new Date().toISOString())},
    ${Number(p.version || p.Version) || 1},
    ${esc(p.request_id || p['Request ID'] || ('import-' + hash.slice(0, 8)))}
  );`);
}

// 6. Equipment records (BOM)
for (const e of equipment) {
  const id = e.id || e.RecordID;
  const eqId = e.equipment_id || e.EquipmentID || id;
  const machineId = e.machine_id || e.MachineID;
  const partId = e.part_id || e.PartID;
  const label = e.label || e.Label || '';
  const quantity = Number(e.quantity || e.Quantity) || 1;
  const installedAt = e.installed_at || e.InstalledAt || '';
  const dueMode = e.due_mode || e.DueMode || 'PART_LIFE';
  const manualExpiryDate = e.manual_expiry_date || e.ManualExpiryDate || '';
  const notes = e.notes || e.Notes || '';
  const recordStatus = e.record_status || e.RecordStatus || 'ACTIVE';
  const endedAt = e.ended_at || e.EndedAt || '';
  const previousRecordId = e.previous_record_id || e.PreviousRecordID || '';
  const createdAt = e.created_at || e.CreatedAt || new Date().toISOString();
  const createdBy = e.created_by || e.CreatedBy || 'import';
  const updatedAt = e.updated_at || e.UpdatedAt || new Date().toISOString();
  const updatedBy = e.updated_by || e.UpdatedBy || 'import';
  const version = Number(e.version || e.Version) || 1;
  const operationId = e.operation_id || e.OperationID || ('import-' + hash.slice(0, 8));

  sqlStatements.push(`INSERT OR REPLACE INTO equipment_records (
    id, equipment_id, machine_id, part_id, label, quantity,
    installed_at, due_mode, manual_expiry_date, notes, record_status,
    ended_at, previous_record_id, created_at, created_by, updated_at,
    updated_by, version, operation_id
  ) VALUES (
    ${esc(id)},
    ${esc(eqId)},
    ${esc(machineId)},
    ${esc(partId)},
    ${esc(label)},
    ${quantity},
    ${esc(installedAt)},
    ${esc(dueMode)},
    ${esc(manualExpiryDate)},
    ${esc(notes)},
    ${esc(recordStatus)},
    ${esc(endedAt)},
    ${esc(previousRecordId)},
    ${esc(createdAt)},
    ${esc(createdBy)},
    ${esc(updatedAt)},
    ${esc(updatedBy)},
    ${version},
    ${esc(operationId)}
  );`);
}

// 7. Update ID counters & Migration Runs
sqlStatements.push(`UPDATE id_counters SET value = MAX(value, ${maxMachineNum}) WHERE kind = 'machines';`);
sqlStatements.push(`UPDATE id_counters SET value = MAX(value, ${maxPartNum}) WHERE kind = 'parts';`);
sqlStatements.push(`INSERT OR REPLACE INTO migration_runs (id, snapshot_hash, imported_at, report_json) VALUES (
  ${esc('run-' + hash.slice(0, 12))},
  ${esc(hash)},
  ${esc(new Date().toISOString())},
  ${esc(JSON.stringify({
    departments: departments.length,
    lines: lines.length,
    brands: brands.length,
    machines: machines.length,
    parts: parts.length,
    equipment: equipment.length,
    maxMachineNum,
    maxPartNum,
    errorsCount: errors.length
  }))}
);`);
sqlStatements.push('PRAGMA foreign_keys = ON;');

if (errors.length) {
  console.warn(`Encountered ${errors.length} validation errors:`);
  errors.slice(0, 10).forEach(e => console.warn('  ! ' + e));
  if (errors.length > 10) console.warn(`  ... and ${errors.length - 10} more.`);
}

const outSqlPath = new URL(`../migrations/import_${hash.slice(0, 8)}.sql`, import.meta.url);
await writeFile(outSqlPath, sqlStatements.join('\n') + '\n', 'utf8');
console.log(`Generated migration SQL at migrations/import_${hash.slice(0, 8)}.sql`);
