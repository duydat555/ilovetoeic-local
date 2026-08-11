CREATE TABLE IF NOT EXISTS user_wrong_questions (
    user_id CHAR(36) NOT NULL,
    question_id VARCHAR(100) NOT NULL,
    source_type ENUM('test', 'level') NOT NULL,
    test_id VARCHAR(100) NULL,
    part INT NOT NULL,
    level INT NULL,
    wrong_count INT NOT NULL DEFAULT 1,
    first_wrong_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    last_wrong_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (user_id, question_id, source_type),
    CONSTRAINT fk_wrong_questions_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT fk_wrong_questions_question FOREIGN KEY (question_id) REFERENCES questions(id) ON DELETE CASCADE,
    CONSTRAINT fk_wrong_questions_test FOREIGN KEY (test_id) REFERENCES tests(id) ON DELETE CASCADE,
    INDEX idx_wrong_questions_test (user_id, source_type, test_id),
    INDEX idx_wrong_questions_level (user_id, source_type, part, level)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
