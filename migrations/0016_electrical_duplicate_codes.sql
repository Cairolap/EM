-- Allow duplicate node_code (Tag Code) for sub-panels and outgoing circuits
ALTER TABLE electrical_nodes RENAME TO electrical_nodes_v1_backup;

CREATE TABLE electrical_nodes (
  id TEXT PRIMARY KEY,
  node_code TEXT NOT NULL,
  name TEXT NOT NULL DEFAULT '',
  node_type TEXT NOT NULL DEFAULT 'DB',
  parent_id TEXT DEFAULT NULL,
  current_rating REAL NOT NULL DEFAULT 0,
  voltage TEXT NOT NULL DEFAULT '400V 3P4W',
  location TEXT NOT NULL DEFAULT '',
  remark TEXT NOT NULL DEFAULT '',
  image_url TEXT NOT NULL DEFAULT '',
  drive_file_id TEXT NOT NULL DEFAULT '',
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (DATETIME('now', '+7 hours')),
  updated_at TEXT NOT NULL DEFAULT (DATETIME('now', '+7 hours'))
);

INSERT INTO electrical_nodes (
  id, node_code, name, node_type, parent_id,
  current_rating, voltage, location, remark,
  image_url, drive_file_id, sort_order, is_active, created_at, updated_at
)
SELECT
  id, node_code, name, node_type, parent_id,
  current_rating, voltage, location, remark,
  image_url, drive_file_id, sort_order, is_active, created_at, updated_at
FROM electrical_nodes_v1_backup;

DROP INDEX IF EXISTS idx_electrical_nodes_type;
DROP INDEX IF EXISTS idx_electrical_nodes_parent;
DROP INDEX IF EXISTS idx_electrical_nodes_code;
DROP INDEX IF EXISTS idx_electrical_nodes_location;

CREATE INDEX IF NOT EXISTS idx_electrical_nodes_type ON electrical_nodes(node_type);
CREATE INDEX IF NOT EXISTS idx_electrical_nodes_parent ON electrical_nodes(parent_id);
CREATE INDEX IF NOT EXISTS idx_electrical_nodes_code ON electrical_nodes(node_code);
CREATE INDEX IF NOT EXISTS idx_electrical_nodes_location ON electrical_nodes(location);
