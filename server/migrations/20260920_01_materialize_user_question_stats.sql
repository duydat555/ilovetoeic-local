-- Migration: 20260920_01_materialize_user_question_stats.sql
-- Description: Add total_questions_answered and total_correct_answers to users, add ranking index, and backfill.

DROP PROCEDURE IF EXISTS add_users_materialized_question_columns;
DELIMITER $$
CREATE PROCEDURE add_users_materialized_question_columns()
BEGIN
    -- 1. Add total_questions_answered column
    IF NOT EXISTS (
        SELECT * FROM information_schema.COLUMNS
        WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users' AND COLUMN_NAME = 'total_questions_answered'
    ) THEN
        ALTER TABLE users ADD COLUMN total_questions_answered INT NOT NULL DEFAULT 0 AFTER current_score;
    END IF;

    -- 2. Add total_correct_answers column
    IF NOT EXISTS (
        SELECT * FROM information_schema.COLUMNS
        WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users' AND COLUMN_NAME = 'total_correct_answers'
    ) THEN
        ALTER TABLE users ADD COLUMN total_correct_answers INT NOT NULL DEFAULT 0 AFTER total_questions_answered;
    END IF;

    -- 3. Add composite ranking index for zero-cost ordering
    IF NOT EXISTS (
        SELECT * FROM information_schema.STATISTICS
        WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users' AND INDEX_NAME = 'idx_users_ranking'
    ) THEN
        ALTER TABLE users ADD INDEX idx_users_ranking (xp DESC, total_questions_answered DESC, streak_days DESC);
    END IF;
END$$
DELIMITER ;
CALL add_users_materialized_question_columns();
DROP PROCEDURE IF EXISTS add_users_materialized_question_columns;

-- 4. Initial backfill from existing activity tables
UPDATE users u
LEFT JOIN (
    WITH answer_events AS (
        SELECT user_id, COUNT(*) AS question_count, SUM(is_correct) AS correct_count
        FROM user_question_activity
        GROUP BY user_id
        UNION ALL
        SELECT user_id, COUNT(*) AS question_count, SUM(is_correct) AS correct_count
        FROM user_grammar_question_activity
        GROUP BY user_id
        UNION ALL
        SELECT ta.user_id, SUM(ta.answered_questions), SUM(ta.correct_answers)
        FROM test_attempts ta
        WHERE ta.mode = 'exam'
          AND NOT EXISTS (
              SELECT 1 FROM user_question_activity uqa
              WHERE uqa.user_id = ta.user_id AND uqa.attempt_id = ta.id
          )
        GROUP BY ta.user_id
    )
    SELECT user_id, SUM(question_count) AS total_q, SUM(correct_count) AS total_c
    FROM answer_events
    GROUP BY user_id
) agg ON agg.user_id = u.id
SET u.total_questions_answered = COALESCE(agg.total_q, 0),
    u.total_correct_answers = COALESCE(agg.total_c, 0);
