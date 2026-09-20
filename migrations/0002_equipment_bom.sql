-- Equipment BOM schema for machine components and operational ledger
CREATE TABLE equipment_records (
  id TEXT PRIMARY KEY,
  equipment_id TEXT NOT NULL,
  machine_id TEXT NOT NULL REFERENCES machines(id),
  part_id TEXT NOT NULL REFERENCES parts(id),
  label TEXT NOT NULL DEFAULT '',
  quantity INTEGER NOT NULL CHECK(quantity > 0),
  installed_at TEXT NOT NULL DEFAULT '',
  due_mode TEXT NOT NULL CHECK(due_mode IN('PART_LIFE', 'MANUAL')),
  manual_expiry_date TEXT NOT NULL DEFAULT '',
  notes TEXT NOT NULL DEFAULT '',
  record_status TEXT NOT NULL CHECK(record_status IN('ACTIVE', 'REPLACED', 'REMOVED', 'HISTORY')),
  ended_at TEXT NOT NULL DEFAULT '',
  previous_record_id TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL,
  created_by TEXT NOT NULL DEFAULT '',
  updated_at TEXT NOT NULL,
  updated_by TEXT NOT NULL DEFAULT '',
  version INTEGER NOT NULL CHECK(version > 0),
  operation_id TEXT NOT NULL
);

CREATE INDEX idx_equipment_machine_status ON equipment_records(machine_id, record_status);
CREATE INDEX idx_equipment_part ON equipment_records(part_id);
CREATE INDEX idx_equipment_equipment_id ON equipment_records(equipment_id);

CREATE TABLE equipment_operations (
  id TEXT PRIMARY KEY,
  fingerprint TEXT NOT NULL,
  machine_id TEXT NOT NULL,
  status TEXT NOT NULL CHECK(status IN('PREPARED', 'COMMITTED', 'FAILED')),
  plan_json TEXT NOT NULL,
  result_json TEXT NOT NULL,
  created_at TEXT NOT NULL,
  session_ref TEXT NOT NULL DEFAULT ''
);

CREATE INDEX idx_operations_machine ON equipment_operations(machine_id);
