-- Transfer the single administrator role to quyenrmy@gmail.com.
-- Safe to rerun: the old account is removed only when the target exists.
START TRANSACTION;

SET @new_admin_id = (
    SELECT id
    FROM users
    WHERE LOWER(email) = LOWER('quyenrmy@gmail.com')
    LIMIT 1
);

SET @old_admin_id = (
    SELECT id
    FROM users
    WHERE LOWER(email) = LOWER('admin@ilovetoeic.vn')
    LIMIT 1
);

-- Preserve ownership of current administrative configuration before the old
-- account is deleted. Historical audit actors intentionally remain historical
-- and follow their foreign-key ON DELETE SET NULL rule.
UPDATE learning_classes
SET created_by = @new_admin_id
WHERE created_by = @old_admin_id
AND @new_admin_id IS NOT NULL;

UPDATE feature_flags
SET updated_by = @new_admin_id
WHERE updated_by = @old_admin_id
AND @new_admin_id IS NOT NULL;

UPDATE class_feature_overrides
SET updated_by = @new_admin_id
WHERE updated_by = @old_admin_id
AND @new_admin_id IS NOT NULL;

DELETE FROM users
WHERE id = @old_admin_id
  AND id <> @new_admin_id
  AND @new_admin_id IS NOT NULL;

-- The schema enforces a single-admin unique key, so promote the new account
-- only after the old administrator row has been removed in this transaction.
UPDATE users
SET role = 'admin',
    approval_status = 'approved',
    approved_at = COALESCE(approved_at, CURRENT_TIMESTAMP),
    is_frozen = 0,
    frozen_at = NULL
WHERE id = @new_admin_id;

COMMIT;
