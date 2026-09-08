-- Migration: Optimize recent active students index
-- Covers: Dashboard recent active students query
SET NAMES utf8mb4;

-- 1. Ensure last_active_at has fallback values
UPDATE users 
SET last_active_at = COALESCE(last_active_at, updated_at, created_at) 
WHERE last_active_at IS NULL;

-- 2. Add composite index on users (role, last_active_at DESC)
SET @idx_student_active = (
    SELECT COUNT(*) 
    FROM information_schema.statistics 
    WHERE table_schema = DATABASE() 
      AND table_name = 'users' 
      AND index_name = 'idx_users_student_active'
);
SET @sql_student_active = IF(
    @idx_student_active = 0, 
    'ALTER TABLE users ADD INDEX idx_users_student_active (role, last_active_at DESC)', 
    'SELECT 1'
);
PREPARE stmt_student_active FROM @sql_student_active;
EXECUTE stmt_student_active;
DEALLOCATE PREPARE stmt_student_active;
