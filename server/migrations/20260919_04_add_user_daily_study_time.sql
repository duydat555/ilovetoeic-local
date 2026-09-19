-- Migration: 20260919_04_add_user_daily_study_time.sql
-- Purpose: Track daily study time per user for weekly progress charts and cross-activity streaks

CREATE TABLE IF NOT EXISTS user_daily_study_time (
    user_id CHAR(36) NOT NULL,
    study_date DATE NOT NULL,
    total_seconds INT NOT NULL DEFAULT 0,
    PRIMARY KEY (user_id, study_date),
    CONSTRAINT fk_daily_study_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
