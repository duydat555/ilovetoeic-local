-- Migration: 20260919_02_add_level_column_to_test_attempts.sql
-- Purpose: Normalize level column on test_attempts for fast index-based lookups and cascade deletions

ALTER TABLE test_attempts
    ADD COLUMN level INT NULL AFTER part;

CREATE INDEX idx_attempts_user_mode_part_level
    ON test_attempts (user_id, mode, part, level);
