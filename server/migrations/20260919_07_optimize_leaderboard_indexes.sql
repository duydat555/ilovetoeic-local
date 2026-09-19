-- Migration: 20260919_07_optimize_leaderboard_indexes.sql
-- Description: Add composite index on users(current_score, streak_days) to accelerate leaderboard queries

DROP PROCEDURE IF EXISTS add_users_score_streak_index;
DELIMITER $$
CREATE PROCEDURE add_users_score_streak_index()
BEGIN
    IF NOT EXISTS (
        SELECT * FROM information_schema.STATISTICS
        WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users' AND INDEX_NAME = 'idx_users_score_streak'
    ) THEN
        ALTER TABLE users ADD INDEX idx_users_score_streak (current_score, streak_days);
    END IF;
END$$
DELIMITER ;
CALL add_users_score_streak_index();
DROP PROCEDURE IF EXISTS add_users_score_streak_index;
