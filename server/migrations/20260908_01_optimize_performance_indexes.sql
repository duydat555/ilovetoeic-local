-- Migration: Add composite indexes for high-concurrency optimization
-- Covers: Practice by Level, Mock Tests, and Grammar catalogs
SET NAMES utf8mb4;

-- 1. Index on questions (part, difficulty_level) for Practice by Level summary & question queries
SET @idx_part_level = (
    SELECT COUNT(*) 
    FROM information_schema.statistics 
    WHERE table_schema = DATABASE() 
      AND table_name = 'questions' 
      AND index_name = 'idx_questions_part_level'
);
SET @sql_part_level = IF(@idx_part_level = 0, 'ALTER TABLE questions ADD INDEX idx_questions_part_level (part, difficulty_level)', 'SELECT 1');
PREPARE stmt1 FROM @sql_part_level;
EXECUTE stmt1;
DEALLOCATE PREPARE stmt1;

-- 2. Index on questions (test_id, order_index, question_number) for Full Test & Part queries
SET @idx_test_order = (
    SELECT COUNT(*) 
    FROM information_schema.statistics 
    WHERE table_schema = DATABASE() 
      AND table_name = 'questions' 
      AND index_name = 'idx_questions_test_order'
);
SET @sql_test_order = IF(@idx_test_order = 0, 'ALTER TABLE questions ADD INDEX idx_questions_test_order (test_id, order_index, question_number)', 'SELECT 1');
PREPARE stmt2 FROM @sql_test_order;
EXECUTE stmt2;
DEALLOCATE PREPARE stmt2;

-- 3. Index on tests (is_hidden, year, name) for test list filtering
SET @idx_tests_hidden_year = (
    SELECT COUNT(*) 
    FROM information_schema.statistics 
    WHERE table_schema = DATABASE() 
      AND table_name = 'tests' 
      AND index_name = 'idx_tests_hidden_year'
);
SET @sql_tests_hidden_year = IF(@idx_tests_hidden_year = 0, 'ALTER TABLE tests ADD INDEX idx_tests_hidden_year (is_hidden, year, name)', 'SELECT 1');
PREPARE stmt3 FROM @sql_tests_hidden_year;
EXECUTE stmt3;
DEALLOCATE PREPARE stmt3;

-- 4. Composite indexes on grammar_question_memberships for catalog aggregations
SET @idx_gqm_mode_topic = (
    SELECT COUNT(*) 
    FROM information_schema.statistics 
    WHERE table_schema = DATABASE() 
      AND table_name = 'grammar_question_memberships' 
      AND index_name = 'idx_gqm_mode_topic'
);
SET @sql_gqm_mode_topic = IF(@idx_gqm_mode_topic = 0, 'ALTER TABLE grammar_question_memberships ADD INDEX idx_gqm_mode_topic (source_mode, topic_id)', 'SELECT 1');
PREPARE stmt4 FROM @sql_gqm_mode_topic;
EXECUTE stmt4;
DEALLOCATE PREPARE stmt4;

SET @idx_gqm_mode_bank = (
    SELECT COUNT(*) 
    FROM information_schema.statistics 
    WHERE table_schema = DATABASE() 
      AND table_name = 'grammar_question_memberships' 
      AND index_name = 'idx_gqm_mode_bank'
);
SET @sql_gqm_mode_bank = IF(@idx_gqm_mode_bank = 0, 'ALTER TABLE grammar_question_memberships ADD INDEX idx_gqm_mode_bank (source_mode, bank_set_id)', 'SELECT 1');
PREPARE stmt5 FROM @sql_gqm_mode_bank;
EXECUTE stmt5;
DEALLOCATE PREPARE stmt5;
