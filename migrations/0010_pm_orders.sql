-- PM (Preventive Maintenance) Cycles and Machine Order Numbers for PR
CREATE TABLE IF NOT EXISTS pm_cycles (
  id TEXT PRIMARY KEY,
  department_id TEXT NOT NULL REFERENCES departments(id),
  line_id TEXT NOT NULL,
  year INTEGER NOT NULL,
  round_no INTEGER NOT NULL CHECK(round_no >= 1 AND round_no <= 5),
  target_month TEXT NOT NULL DEFAULT '',
  plan_date TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK(status IN('ACTIVE', 'CLOSED', 'ARCHIVED')),
  notes TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL,
  created_by TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  updated_by TEXT NOT NULL,
  UNIQUE(line_id, year, round_no)
);

CREATE INDEX IF NOT EXISTS idx_pm_cycles_line_year ON pm_cycles(line_id, year);

CREATE TABLE IF NOT EXISTS pm_machine_orders (
  id TEXT PRIMARY KEY,
  cycle_id TEXT NOT NULL REFERENCES pm_cycles(id) ON DELETE CASCADE,
  machine_id TEXT NOT NULL REFERENCES machines(id),
  order_no TEXT NOT NULL DEFAULT '',
  pr_no TEXT NOT NULL DEFAULT '',
  pr_status TEXT NOT NULL DEFAULT 'PENDING' CHECK(pr_status IN('PENDING', 'ORDER_ASSIGNED', 'PR_OPENED', 'COMPLETED')),
  notes TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL,
  created_by TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  updated_by TEXT NOT NULL,
  UNIQUE(cycle_id, machine_id)
);

CREATE INDEX IF NOT EXISTS idx_pm_machine_orders_cycle ON pm_machine_orders(cycle_id);
CREATE INDEX IF NOT EXISTS idx_pm_machine_orders_machine ON pm_machine_orders(machine_id);
