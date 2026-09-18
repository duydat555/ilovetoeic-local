-- Migration: 20260919_03_add_user_level_stats.sql
-- Purpose: Precompute and store max level achieved per part for fast average level calculation

CREATE TABLE IF NOT EXISTS user_level_stats (
    user_id CHAR(36) NOT NULL,
    part INT NOT NULL,
    max_level_achieved INT NOT NULL,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (user_id, part),
    CONSTRAINT fk_user_level_stats_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
