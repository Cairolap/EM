-- User Management & Granular Permissions Migration
ALTER TABLE app_users ADD COLUMN user_type TEXT NOT NULL DEFAULT 'permanent';
ALTER TABLE app_users ADD COLUMN expires_at TEXT;
ALTER TABLE app_users ADD COLUMN permissions_json TEXT NOT NULL DEFAULT '{}';
ALTER TABLE app_users ADD COLUMN force_password_change INTEGER NOT NULL DEFAULT 0;

-- Update existing default administrator to have full permissions
UPDATE app_users 
SET permissions_json = '{"machines":"write","parts":"write","bom":"write","users":"admin","can_delete":true}'
WHERE username = 'admin';
