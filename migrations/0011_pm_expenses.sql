-- PM Expenses and Line Budgets Schema
CREATE TABLE IF NOT EXISTS pm_expenses (
  id TEXT PRIMARY KEY,
  plant TEXT NOT NULL DEFAULT '1200',
  gl_account TEXT NOT NULL DEFAULT '',
  cost_center TEXT NOT NULL DEFAULT '',
  machine_code TEXT NOT NULL,
  machine_id TEXT,
  department_id TEXT DEFAULT '',
  line_id TEXT DEFAULT '',
  pm_order_no TEXT NOT NULL DEFAULT '',
  doc_date TEXT NOT NULL,
  doc_no TEXT NOT NULL DEFAULT '',
  movement_type TEXT NOT NULL DEFAULT '261',
  material_no TEXT NOT NULL DEFAULT '',
  description TEXT NOT NULL DEFAULT '',
  quantity REAL NOT NULL DEFAULT 0,
  uom TEXT NOT NULL DEFAULT 'EA',
  unit_price REAL NOT NULL DEFAULT 0,
  amount REAL NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'THB',
  order_type TEXT NOT NULL DEFAULT '1PMO',
  po_no TEXT NOT NULL DEFAULT '',
  functional_loc TEXT NOT NULL DEFAULT '',
  work_center TEXT NOT NULL DEFAULT '',
  notes TEXT NOT NULL DEFAULT '',
  imported_at TEXT NOT NULL,
  imported_by TEXT NOT NULL,
  created_at TEXT NOT NULL,
  created_by TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  updated_by TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_pm_expenses_date ON pm_expenses(doc_date DESC);
CREATE INDEX IF NOT EXISTS idx_pm_expenses_machine ON pm_expenses(machine_code);
CREATE INDEX IF NOT EXISTS idx_pm_expenses_line ON pm_expenses(line_id);
CREATE INDEX IF NOT EXISTS idx_pm_expenses_dept ON pm_expenses(department_id);
CREATE INDEX IF NOT EXISTS idx_pm_expenses_order ON pm_expenses(pm_order_no);

-- PM Line Budgets Table (for Dashboard)
CREATE TABLE IF NOT EXISTS pm_line_budgets (
  id TEXT PRIMARY KEY,
  line_id TEXT NOT NULL,
  department_id TEXT NOT NULL,
  year INTEGER NOT NULL,
  budget_amount REAL NOT NULL DEFAULT 0,
  notes TEXT NOT NULL DEFAULT '',
  updated_at TEXT NOT NULL,
  updated_by TEXT NOT NULL,
  UNIQUE(line_id, year)
);
