-- Additive per-question activity log for live dashboard contribution data.
-- Safe to run repeatedly; existing test_attempts/history data is untouched.
CREATE TABLE IF NOT EXISTS user_question_activity (
    user_id CHAR(36) NOT NULL,
    attempt_id CHAR(36) NOT NULL,
    question_id VARCHAR(100) NOT NULL,
    part INT NOT NULL,
    selected_answer VARCHAR(5) NOT NULL,
    is_correct TINYINT(1) NOT NULL DEFAULT 0,
    answered_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (user_id, attempt_id, question_id),
    CONSTRAINT fk_question_activity_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT fk_question_activity_question FOREIGN KEY (question_id) REFERENCES questions(id) ON DELETE CASCADE,
    INDEX idx_question_activity_user_date (user_id, answered_at),
    INDEX idx_question_activity_user_part_date (user_id, part, answered_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
