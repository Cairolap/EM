-- PR and Store Requisition Tracker Schema
CREATE TABLE IF NOT EXISTS pr_tracker_items (
  id TEXT PRIMARY KEY,
  created_date TEXT NOT NULL,
  doc_type TEXT NOT NULL DEFAULT 'PR' CHECK(doc_type IN('PR', 'STORE')),
  doc_no TEXT NOT NULL DEFAULT '',
  department_id TEXT NOT NULL DEFAULT '',
  line_id TEXT NOT NULL DEFAULT '',
  machine_id TEXT DEFAULT '',
  machine_code TEXT NOT NULL DEFAULT '',
  order_no TEXT NOT NULL DEFAULT '',
  description TEXT NOT NULL,
  qty REAL NOT NULL DEFAULT 1,
  unit TEXT NOT NULL DEFAULT 'ชิ้น',
  price REAL DEFAULT NULL,
  po_no TEXT NOT NULL DEFAULT '',
  delivery_date TEXT NOT NULL DEFAULT '',
  is_archived INTEGER NOT NULL DEFAULT 0,
  archived_at TEXT DEFAULT NULL,
  archived_by TEXT DEFAULT '',
  notes TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL,
  created_by TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  updated_by TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_pr_tracker_date ON pr_tracker_items(created_date DESC);
CREATE INDEX IF NOT EXISTS idx_pr_tracker_dept ON pr_tracker_items(department_id);
CREATE INDEX IF NOT EXISTS idx_pr_tracker_line ON pr_tracker_items(line_id);
CREATE INDEX IF NOT EXISTS idx_pr_tracker_machine ON pr_tracker_items(machine_code);
CREATE INDEX IF NOT EXISTS idx_pr_tracker_order ON pr_tracker_items(order_no);
CREATE INDEX IF NOT EXISTS idx_pr_tracker_doc_no ON pr_tracker_items(doc_no);
CREATE INDEX IF NOT EXISTS idx_pr_tracker_po_no ON pr_tracker_items(po_no);
CREATE INDEX IF NOT EXISTS idx_pr_tracker_archived ON pr_tracker_items(is_archived);
