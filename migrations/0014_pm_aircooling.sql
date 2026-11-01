-- PM Air Cooling Management Schema
CREATE TABLE IF NOT EXISTS pm_aircooling_units (
  id TEXT PRIMARY KEY,
  dept TEXT NOT NULL DEFAULT '',
  id_tag TEXT NOT NULL DEFAULT '',
  line TEXT NOT NULL DEFAULT '',
  location TEXT NOT NULL DEFAULT '',
  brand TEXT NOT NULL DEFAULT '',
  power REAL NOT NULL DEFAULT 0,
  serial TEXT NOT NULL DEFAULT '',
  details TEXT NOT NULL DEFAULT '',
  note TEXT NOT NULL DEFAULT '',
  last_clean_date TEXT NOT NULL DEFAULT '',
  next_clean_date TEXT NOT NULL DEFAULT '',
  image_url TEXT NOT NULL DEFAULT '',
  drive_file_id TEXT NOT NULL DEFAULT '',
  report_status TEXT NOT NULL DEFAULT '',
  report_info TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT (DATETIME('now', '+7 hours')),
  updated_at TEXT NOT NULL DEFAULT (DATETIME('now', '+7 hours'))
);

CREATE INDEX IF NOT EXISTS idx_pm_aircooling_dept ON pm_aircooling_units(dept);
CREATE INDEX IF NOT EXISTS idx_pm_aircooling_line ON pm_aircooling_units(line);
CREATE INDEX IF NOT EXISTS idx_pm_aircooling_id_tag ON pm_aircooling_units(id_tag);
CREATE INDEX IF NOT EXISTS idx_pm_aircooling_next_clean ON pm_aircooling_units(next_clean_date);
CREATE INDEX IF NOT EXISTS idx_pm_aircooling_brand ON pm_aircooling_units(brand);
CREATE INDEX IF NOT EXISTS idx_pm_aircooling_report_status ON pm_aircooling_units(report_status);
