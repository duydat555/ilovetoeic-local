-- Migration: Add covering index for Practice by Level assembler query
-- Eliminates 'Using filesort' by indexing (part, difficulty_level, test_id, order_index, question_number)
SET NAMES utf8mb4;

-- 1. Create covering composite index if not exists
SET @idx_part_level_order = (
    SELECT COUNT(*) 
    FROM information_schema.statistics 
    WHERE table_schema = DATABASE() 
      AND table_name = 'questions' 
      AND index_name = 'idx_questions_part_level_order'
);

SET @sql_part_level_order = IF(
    @idx_part_level_order = 0,
    'ALTER TABLE questions ADD INDEX idx_questions_part_level_order (part, difficulty_level, test_id, order_index, question_number)',
    'SELECT 1'
);

PREPARE stmt1 FROM @sql_part_level_order;
EXECUTE stmt1;
DEALLOCATE PREPARE stmt1;

-- 2. Drop redundant legacy index (part, difficulty_level) as it is fully covered by the leftmost prefix of the new index
SET @idx_old_part_level = (
    SELECT COUNT(*) 
    FROM information_schema.statistics 
    WHERE table_schema = DATABASE() 
      AND table_name = 'questions' 
      AND index_name = 'idx_questions_part_level'
);

SET @sql_drop_old = IF(
    @idx_old_part_level > 0,
    'ALTER TABLE questions DROP INDEX idx_questions_part_level',
    'SELECT 1'
);

PREPARE stmt2 FROM @sql_drop_old;
EXECUTE stmt2;
DEALLOCATE PREPARE stmt2;
