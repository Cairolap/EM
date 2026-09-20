import {spawnSync} from 'node:child_process';
import {writeFile} from 'node:fs/promises';

const seedSql = `
-- Initial seed data for local development & testing
INSERT OR IGNORE INTO user_roles (email, role) VALUES
  ('admin@example.com', 'admin'),
  ('editor@example.com', 'editor'),
  ('viewer@example.com', 'viewer');

INSERT OR IGNORE INTO departments (id, name, is_active) VALUES
  ('CC', 'ฝาจีบ', 1),
  ('PP', 'ฝาเกลียว', 1),
  ('MX', 'ฝาแม็กซี่', 1),
  ('PC', 'ฝาพลาสติก', 1),
  ('PR', 'งานพิมพ์', 1),
  ('OT', 'อื่นๆ', 1);

INSERT OR IGNORE INTO lines (id, department_id, name, is_active, remark) VALUES
  ('L-CC01', 'CC', 'Line CC 1', 1, 'สายการผลิตฝาจีบ 1'),
  ('L-PP01', 'PP', 'Line PP 1', 1, 'สายการผลิตฝาเกลียว 1'),
  ('L-MX01', 'MX', 'Line MX 1', 1, 'สายการผลิตฝาแม็กซี่ 1'),
  ('L-PC01', 'PC', 'Line PC 1', 1, 'สายการผลิตฝาพลาสติก 1'),
  ('L-PR01', 'PR', 'Line PR 1', 1, 'สายการผลิตงานพิมพ์ 1');

INSERT OR IGNORE INTO brands (id, name, normalized_name, is_active, version) VALUES
  ('B001', 'ABB', 'abb', 1, 1),
  ('B002', 'Schneider Electric', 'schneider electric', 1, 1),
  ('B003', 'Omron', 'omron', 1, 1),
  ('B004', 'Mitsubishi', 'mitsubishi', 1, 1),
  ('B005', 'Siemens', 'siemens', 1, 1);

INSERT OR IGNORE INTO machines (
  id, code, normalized_code, name, department_id, line_id,
  manufacturer, model, serial_no, machine_type,
  install_date, criticality, status, location_detail,
  photo_file_id, photo_file_name, manual_url, remark,
  created_at, created_by, updated_at, updated_by,
  is_active, version, request_id
) VALUES
  ('M000001', 'MC-CC-01', 'mc-cc-01', 'Press Machine 1', 'CC', 'L-CC01', 'Minster', 'P2-100', 'SN-98231', 'Press', '2020-01-15', 'สูง', 'ใช้งาน', 'Zone A', '', '', '', 'เครื่องหลัก', '2026-01-01T00:00:00.000Z', 'system', '2026-01-01T00:00:00.000Z', 'system', 1, 1, 'seed-req-1'),
  ('M000002', 'MC-PP-01', 'mc-pp-01', 'Capping Machine 1', 'PP', 'L-PP01', 'Arol', 'Euro PK', 'SN-44321', 'Capper', '2021-03-20', 'กลาง', 'ใช้งาน', 'Zone B', '', '', '', '', '2026-01-01T00:00:00.000Z', 'system', '2026-01-01T00:00:00.000Z', 'system', 1, 1, 'seed-req-2'),
  ('M000003', 'MC-MX-01', 'mc-mx-01', 'Lining Machine 1', 'MX', 'L-MX01', 'SACMI', 'PMV-200', 'SN-77123', 'Liner', '2019-11-10', 'สูง', 'ใช้งาน', 'Zone C', '', '', '', '', '2026-01-01T00:00:00.000Z', 'system', '2026-01-01T00:00:00.000Z', 'system', 1, 1, 'seed-req-3');

INSERT OR IGNORE INTO parts (
  id, part_number, description, brand_id, legacy_brand_name,
  price_minor, store_code, lifespan_years, notes,
  picture_source, thumbnail_source,
  created_at, updated_at, version, request_id
) VALUES
  ('PART-000001', 'E2B-M12KS04-WP-B1', 'Inductive Proximity Sensor M12 PNP NO', 'B003', 'Omron', 85000, 'ST-0012', 3.0, 'ใช้กับเครื่องจักรฝาจีบและฝาเกลียว', '', '', '2026-01-01T00:00:00.000Z', '2026-01-01T00:00:00.000Z', 1, 'seed-req-4'),
  ('PART-000002', 'LC1D09M7', 'TeSys D contactor 3P 9A AC-3 220V', 'B002', 'Schneider Electric', 62000, 'ST-0045', 5.0, 'Contactor คุมมอเตอร์', '', '', '2026-01-01T00:00:00.000Z', '2026-01-01T00:00:00.000Z', 1, 'seed-req-5'),
  ('PART-000003', 'FR-D720-0.75K', 'Inverter 0.75kW 3-Phase 200V', 'B004', 'Mitsubishi', 540000, 'ST-0110', 7.0, 'Inverter สายพานลำเลียง', '', '', '2026-01-01T00:00:00.000Z', '2026-01-01T00:00:00.000Z', 1, 'seed-req-6');

INSERT OR IGNORE INTO equipment_records (
  id, equipment_id, machine_id, part_id, label, quantity, installed_at, due_mode, manual_expiry_date, notes, record_status, ended_at, previous_record_id, created_at, created_by, updated_at, updated_by, version, operation_id
) VALUES
  ('EQ-REC-001', 'EQ-001', 'M000001', 'PART-000001', 'SENSOR-IN', 1, '2024-01-15', 'PART_LIFE', '', 'เซนเซอร์จับแผ่นเหล็กเข้า', 'ACTIVE', '', '', '2026-01-01T00:00:00.000Z', 'seed', '2026-01-01T00:00:00.000Z', 'seed', 1, 'seed-op-1'),
  ('EQ-REC-002', 'EQ-002', 'M000001', 'PART-000001', 'SENSOR-OUT', 1, '2024-02-01', 'PART_LIFE', '', 'เซนเซอร์จับแผ่นเหล็กออก', 'ACTIVE', '', '', '2026-01-01T00:00:00.000Z', 'seed', '2026-01-01T00:00:00.000Z', 'seed', 1, 'seed-op-1'),
  ('EQ-REC-003', 'EQ-003', 'M000001', 'PART-000002', 'KM-MAIN', 1, '2022-05-10', 'PART_LIFE', '', 'Contactor คุมมอเตอร์หลัก', 'ACTIVE', '', '', '2026-01-01T00:00:00.000Z', 'seed', '2026-01-01T00:00:00.000Z', 'seed', 1, 'seed-op-1'),
  ('EQ-REC-004', 'EQ-004', 'M000001', 'PART-000003', 'INV-FEEDER', 1, '2020-01-15', 'PART_LIFE', '', 'Inverter ฟีดเดอร์', 'ACTIVE', '', '', '2026-01-01T00:00:00.000Z', 'seed', '2026-01-01T00:00:00.000Z', 'seed', 1, 'seed-op-1');

UPDATE id_counters SET value = 3 WHERE kind = 'machines' AND value < 3;
UPDATE id_counters SET value = 3 WHERE kind = 'parts' AND value < 3;
`;

import {mkdir} from 'node:fs/promises';

await mkdir(new URL('../data/', import.meta.url), {recursive: true});
const seedPath = new URL('../data/seed.sql', import.meta.url);
await writeFile(seedPath, seedSql.trim() + '\n', 'utf8');
console.log('Generated data/seed.sql');

if (process.argv.includes('--apply')) {
  console.log('Applying seed data to local D1 via wrangler...');
  const res = spawnSync('wrangler', ['d1', 'execute', 'DB', '--local', '--file=data/seed.sql', '-y'], {
    stdio: 'inherit',
    shell: true
  });
  if (res.status !== 0) {
    console.warn('Wrangler local D1 execution exited with code:', res.status);
  } else {
    console.log('Local seed data applied successfully.');
  }
}
