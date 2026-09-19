-- Migration: 20260919_05_add_user_study_goals.sql
-- Purpose: Store daily study goal in minutes and target exam date per user

CREATE TABLE IF NOT EXISTS user_study_goals (
    user_id CHAR(36) PRIMARY KEY,
    target_score INT NOT NULL DEFAULT 750,
    target_date DATE NULL,
    daily_goal_minutes INT NOT NULL DEFAULT 30,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_study_goals_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
