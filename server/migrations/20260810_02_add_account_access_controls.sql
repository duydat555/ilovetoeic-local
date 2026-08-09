ALTER TABLE users
    ADD COLUMN is_frozen TINYINT(1) NOT NULL DEFAULT 0 AFTER approved_by,
    ADD COLUMN frozen_at DATETIME NULL AFTER is_frozen,
    ADD COLUMN access_expires_at DATETIME NULL AFTER frozen_at,
    ADD INDEX idx_users_access_expires_at (access_expires_at);
