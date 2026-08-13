-- Per-question activity for unfinished Grammar TOEIC practice sessions.
-- Grammar questions live outside the regular TOEIC question table, so they
-- use a dedicated activity table while contributing to Part 5 statistics.
CREATE TABLE IF NOT EXISTS user_grammar_question_activity (
    user_id CHAR(36) NOT NULL,
    attempt_id CHAR(36) NOT NULL,
    membership_id VARCHAR(220) NOT NULL,
    question_id VARCHAR(100) NOT NULL,
    selected_answer VARCHAR(5) NOT NULL,
    is_correct TINYINT(1) NOT NULL DEFAULT 0,
    answered_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (user_id, attempt_id, membership_id),
    CONSTRAINT fk_grammar_activity_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT fk_grammar_activity_membership FOREIGN KEY (membership_id) REFERENCES grammar_question_memberships(id) ON DELETE CASCADE,
    CONSTRAINT fk_grammar_activity_question FOREIGN KEY (question_id) REFERENCES grammar_questions(id) ON DELETE CASCADE,
    INDEX idx_grammar_activity_user_date (user_id, answered_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
