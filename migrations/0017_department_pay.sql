-- Migration: 0017_department_pay.sql
-- Purpose: 12-Month Department Expense Planning (ค่าใช้จ่ายแผนก / Department Pay)

CREATE TABLE IF NOT EXISTS department_pay_settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

INSERT OR IGNORE INTO department_pay_settings (key, value)
VALUES ('default_monthly_budget', '8000');

CREATE TABLE IF NOT EXISTS department_pay_budgets (
  year_month TEXT PRIMARY KEY,
  budget_amount REAL NOT NULL DEFAULT 8000,
  note TEXT NOT NULL DEFAULT '',
  updated_by TEXT NOT NULL DEFAULT '',
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS department_pay_items (
  id TEXT PRIMARY KEY,
  year_month TEXT NOT NULL,
  description TEXT NOT NULL,
  brand TEXT NOT NULL DEFAULT '',
  price REAL NOT NULL DEFAULT 0,
  lead_time TEXT NOT NULL DEFAULT '',
  file_url TEXT NOT NULL DEFAULT '',
  is_urgent INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'PLANNED',
  sort_order INTEGER NOT NULL DEFAULT 0,
  remark TEXT NOT NULL DEFAULT '',
  created_by TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_dept_pay_items_month
  ON department_pay_items(year_month, is_urgent DESC, sort_order ASC, created_at ASC);
