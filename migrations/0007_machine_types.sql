-- Migration 0007: Machine Types Directory
CREATE TABLE machine_types (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  normalized_name TEXT NOT NULL UNIQUE,
  is_active INTEGER NOT NULL CHECK(is_active IN(0, 1)),
  version INTEGER NOT NULL DEFAULT 1
);

INSERT OR IGNORE INTO machine_types (id, name, normalized_name, is_active, version) VALUES
  ('MT-PRESS', 'Press', 'press', 1, 1),
  ('MT-PRINTING', 'Printing', 'printing', 1, 1),
  ('MT-PACKING', 'Packing', 'packing', 1, 1),
  ('MT-OTHER', 'อื่นๆ', 'อื่นๆ', 1, 1);
