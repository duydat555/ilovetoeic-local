-- Migration: Add index on created_at to avoid MySQL Error 1038 Out of sort memory
SET NAMES utf8mb4;

SET @index_exists = (
    SELECT COUNT(*) 
    FROM information_schema.statistics 
    WHERE table_schema = DATABASE() 
      AND table_name = 'user_feedback' 
      AND index_name = 'idx_feedback_created_at'
);

SET @sql = IF(@index_exists = 0, 'ALTER TABLE user_feedback ADD INDEX idx_feedback_created_at (created_at DESC)', 'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
