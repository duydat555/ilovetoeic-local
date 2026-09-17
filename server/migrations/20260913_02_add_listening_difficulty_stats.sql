-- Migration: Add listening difficulty stats table and indexes
-- Date: 2026-09-13

CREATE TABLE IF NOT EXISTS listening_difficulty_stats (
    id VARCHAR(50) PRIMARY KEY,
    total_practice_attempts INT NOT NULL DEFAULT 0,
    total_questions_evaluated INT NOT NULL DEFAULT 0,
    update_frequency VARCHAR(50) NOT NULL DEFAULT 'daily',
    level_distribution JSON NULL,
    last_calculated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

ALTER TABLE listening_sets
    ADD COLUMN error_rate FLOAT NULL AFTER difficulty_level,
    ADD COLUMN total_attempts INT NOT NULL DEFAULT 0 AFTER error_rate,
    ADD INDEX idx_listening_sets_level_part (difficulty_level, part);
