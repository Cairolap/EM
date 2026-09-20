-- Built-in Username & Password Authentication Tables
CREATE TABLE IF NOT EXISTS app_users (
  id TEXT PRIMARY KEY,
  username TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  password_salt TEXT NOT NULL,
  display_name TEXT NOT NULL,
  role TEXT NOT NULL CHECK(role IN ('admin', 'editor', 'viewer')),
  is_active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_users_username ON app_users(username);

CREATE TABLE IF NOT EXISTS app_sessions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES app_users(id),
  token_hash TEXT NOT NULL UNIQUE,
  expires_at INTEGER NOT NULL,
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_sessions_token_hash ON app_sessions(token_hash);
CREATE INDEX IF NOT EXISTS idx_sessions_expires_at ON app_sessions(expires_at);

-- Initial default administrator account: username: admin / password: admin1234
INSERT OR IGNORE INTO app_users (
  id, username, password_hash, password_salt, display_name, role, is_active, created_at, updated_at
) VALUES (
  'usr-admin-default',
  'admin',
  '4dae822a046c8869e2f7f5dffe685656ea2ca1aa4f60bea43fc0239f3aa316f6',
  '04e8cd1857324d22a021cdd1b3e22ca0',
  'Administrator',
  'admin',
  1,
  '2026-09-20T00:00:00.000Z',
  '2026-09-20T00:00:00.000Z'
);
