ALTER TABLE users
    ADD COLUMN approval_status ENUM('pending', 'approved', 'rejected') NOT NULL DEFAULT 'pending' AFTER role,
    ADD COLUMN approved_at DATETIME NULL AFTER approval_status,
    ADD COLUMN approved_by CHAR(36) NULL AFTER approved_at,
    ADD INDEX idx_users_approval_status (approval_status);

UPDATE users
SET approval_status = 'approved',
    approved_at = COALESCE(approved_at, created_at)
WHERE role = 'admin' OR created_at < UTC_TIMESTAMP();
