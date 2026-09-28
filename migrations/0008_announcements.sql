PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS announcements (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  media_type TEXT NOT NULL CHECK(media_type IN('image','video')),
  file_id TEXT NOT NULL DEFAULT '',
  file_name TEXT NOT NULL DEFAULT '',
  file_url TEXT NOT NULL DEFAULT '',
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_active INTEGER NOT NULL DEFAULT 1 CHECK(is_active IN(0,1)),
  created_at TEXT NOT NULL,
  created_by TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  updated_by TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS announcement_settings (
  id TEXT PRIMARY KEY DEFAULT 'main',
  company_last_incident TEXT NOT NULL DEFAULT '2023-10-28',
  company_target_days INTEGER NOT NULL DEFAULT 1200,
  dept_last_incident TEXT NOT NULL DEFAULT '2016-09-12',
  dept_target_days INTEGER NOT NULL DEFAULT 3802,
  slide_interval_seconds INTEGER NOT NULL DEFAULT 60,
  show_clock INTEGER NOT NULL DEFAULT 1 CHECK(show_clock IN(0,1)),
  show_safety INTEGER NOT NULL DEFAULT 1 CHECK(show_safety IN(0,1)),
  updated_at TEXT NOT NULL
);

INSERT OR IGNORE INTO announcement_settings (id, company_last_incident, company_target_days, dept_last_incident, dept_target_days, slide_interval_seconds, show_clock, show_safety, updated_at)
VALUES ('main', '2023-10-28', 1200, '2016-09-12', 3802, 60, 1, 1, CURRENT_TIMESTAMP);
