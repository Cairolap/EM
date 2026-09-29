-- Add force_media_id, force_timestamp, and current_media_id for real-time display control
ALTER TABLE announcement_settings ADD COLUMN force_media_id TEXT DEFAULT '';
ALTER TABLE announcement_settings ADD COLUMN force_timestamp INTEGER DEFAULT 0;
ALTER TABLE announcement_settings ADD COLUMN current_media_id TEXT DEFAULT '';
