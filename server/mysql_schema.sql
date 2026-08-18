-- TOEIC Master - MySQL 8 / MariaDB 10.6 schema
-- Run with: mysql -u <user> -p < mysql_schema.sql

CREATE TABLE IF NOT EXISTS test_sets (
    id VARCHAR(100) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    year INT NOT NULL,
    order_index INT NOT NULL DEFAULT 0
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS tests (
    id VARCHAR(100) PRIMARY KEY,
    set_id VARCHAR(100) NULL,
    name VARCHAR(255) NOT NULL,
    source VARCHAR(100) NULL,
    year INT NOT NULL,
    difficulty_level INT NOT NULL DEFAULT 2,
    total_questions INT NOT NULL DEFAULT 200,
    listening_duration_seconds INT NOT NULL DEFAULT 2700,
    reading_duration_seconds INT NOT NULL DEFAULT 4500,
    is_free TINYINT(1) NOT NULL DEFAULT 1,
    is_hidden TINYINT(1) NOT NULL DEFAULT 0,
    media_folder VARCHAR(255) NULL,
    media_version VARCHAR(50) NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_tests_set FOREIGN KEY (set_id) REFERENCES test_sets(id) ON DELETE SET NULL,
    INDEX idx_tests_set_id (set_id),
    INDEX idx_tests_year (year)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS passages (
    id VARCHAR(100) PRIMARY KEY,
    test_id VARCHAR(100) NOT NULL,
    part INT NOT NULL,
    passage_type VARCHAR(100) NULL,
    title VARCHAR(255) NULL,
    passage_text MEDIUMTEXT NULL,
    passage_text_2 MEDIUMTEXT NULL,
    passage_text_3 MEDIUMTEXT NULL,
    passage_text_vi_html LONGTEXT NULL,
    passage_text_2_vi_html LONGTEXT NULL,
    passage_text_3_vi_html LONGTEXT NULL,
    format_status ENUM('pending', 'done', 'error') NOT NULL DEFAULT 'pending',
    audio_url TEXT NULL,
    image_url TEXT NULL,
    transcript MEDIUMTEXT NULL,
    order_index INT NOT NULL DEFAULT 0,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_passages_test FOREIGN KEY (test_id) REFERENCES tests(id) ON DELETE CASCADE,
    INDEX idx_passages_test_id (test_id),
    INDEX idx_passages_test_part (test_id, part),
    INDEX idx_passages_format_status (format_status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS questions (
    id VARCHAR(100) PRIMARY KEY,
    test_id VARCHAR(100) NOT NULL,
    passage_id VARCHAR(100) NULL,
    part INT NOT NULL,
    section VARCHAR(20) NOT NULL DEFAULT 'listening',
    question_number INT NOT NULL,
    audio_url TEXT NULL,
    image_url TEXT NULL,
    question_text MEDIUMTEXT NULL,
    option_a TEXT NULL,
    option_b TEXT NULL,
    option_c TEXT NULL,
    option_d TEXT NULL,
    correct_answer VARCHAR(5) NULL,
    explanation_vi MEDIUMTEXT NULL,
    explanation_en MEDIUMTEXT NULL,
    dich_nghia MEDIUMTEXT NULL,
    tu_vung MEDIUMTEXT NULL,
    dich_nghia_dap_an MEDIUMTEXT NULL,
    difficulty_level INT NOT NULL DEFAULT 2,
    order_index INT NOT NULL DEFAULT 0,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_questions_test FOREIGN KEY (test_id) REFERENCES tests(id) ON DELETE CASCADE,
    CONSTRAINT fk_questions_passage FOREIGN KEY (passage_id) REFERENCES passages(id) ON DELETE SET NULL,
    INDEX idx_questions_test_id (test_id),
    INDEX idx_questions_part (part),
    INDEX idx_questions_passage_id (passage_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS toeic_score_conversion (
    correct_count INT PRIMARY KEY,
    listening_score INT NOT NULL,
    reading_score INT NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS users (
    id CHAR(36) PRIMARY KEY,
    email VARCHAR(255) NOT NULL,
    password_hash VARCHAR(255) NULL,
    full_name VARCHAR(100) NOT NULL,
    family_middle_name VARCHAR(100) NOT NULL DEFAULT '',
    role ENUM('student', 'admin') NOT NULL DEFAULT 'student',
    approval_status ENUM('pending', 'approved', 'rejected') NOT NULL DEFAULT 'pending',
    approved_at DATETIME NULL,
    approved_by CHAR(36) NULL,
    is_frozen TINYINT(1) NOT NULL DEFAULT 0,
    frozen_at DATETIME NULL,
    access_expires_at DATETIME NULL,
    admin_guard TINYINT GENERATED ALWAYS AS (
        CASE WHEN role = 'admin' THEN 1 ELSE NULL END
    ) STORED,
    avatar_url TEXT NULL,
    target_score INT NOT NULL DEFAULT 750,
    current_score INT NOT NULL DEFAULT 0,
    exam_date DATE NULL,
    streak_days INT NOT NULL DEFAULT 0,
    longest_streak INT NOT NULL DEFAULT 0,
    last_study_date DATE NULL,
    auth_provider VARCHAR(20) NOT NULL DEFAULT 'email',
    google_sub VARCHAR(255) NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uq_users_email (email),
    UNIQUE KEY uq_users_google_sub (google_sub),
    UNIQUE KEY uq_users_single_admin (admin_guard)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS user_sessions (
    token_hash CHAR(64) PRIMARY KEY,
    user_id CHAR(36) NOT NULL,
    expires_at DATETIME NOT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_sessions_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_sessions_user (user_id),
    INDEX idx_sessions_expires (expires_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS user_notifications (
    id CHAR(36) PRIMARY KEY,
    user_id CHAR(36) NOT NULL,
    type VARCHAR(32) NOT NULL DEFAULT 'system',
    title VARCHAR(180) NOT NULL,
    message VARCHAR(600) NOT NULL,
    action_url VARCHAR(255) NULL,
    dedupe_key VARCHAR(190) NULL,
    read_at DATETIME NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_notifications_user
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE KEY uq_notifications_user_dedupe (user_id, dedupe_key),
    INDEX idx_notifications_user_created (user_id, created_at),
    INDEX idx_notifications_user_unread (user_id, read_at, created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS notification_preferences (
    user_id CHAR(36) PRIMARY KEY,
    study_reminders TINYINT(1) NOT NULL DEFAULT 1,
    reminder_time TIME NOT NULL DEFAULT '20:00:00',
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_notification_preferences_user
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS test_attempts (
    id CHAR(36) PRIMARY KEY,
    user_id CHAR(36) NOT NULL,
    test_id VARCHAR(100) NULL,
    mode VARCHAR(20) NOT NULL DEFAULT 'exam',
    part INT NULL,
    total_questions INT NOT NULL DEFAULT 0,
    answered_questions INT NOT NULL DEFAULT 0,
    correct_answers INT NOT NULL DEFAULT 0,
    accuracy_rate DECIMAL(5,2) NOT NULL DEFAULT 0,
    time_spent_seconds INT NOT NULL DEFAULT 0,
    listening_correct INT NOT NULL DEFAULT 0,
    reading_correct INT NOT NULL DEFAULT 0,
    listening_score INT NOT NULL DEFAULT 5,
    reading_score INT NOT NULL DEFAULT 5,
    total_score INT NOT NULL DEFAULT 10,
    answers JSON NULL,
    question_ids JSON NULL,
    metadata JSON NULL,
    completed_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_attempts_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT fk_attempts_test FOREIGN KEY (test_id) REFERENCES tests(id) ON DELETE SET NULL,
    INDEX idx_attempts_user_completed (user_id, completed_at),
    INDEX idx_attempts_test_completed (test_id, completed_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

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

CREATE TABLE IF NOT EXISTS user_vocabulary (
    id CHAR(36) PRIMARY KEY,
    user_id CHAR(36) NOT NULL,
    word VARCHAR(255) NOT NULL,
    phonetic VARCHAR(255) NULL,
    part_of_speech VARCHAR(50) NULL,
    meaning_vi TEXT NOT NULL,
    definition_en TEXT NULL,
    example_en TEXT NULL,
    example_vi TEXT NULL,
    synonyms JSON NULL,
    personal_note TEXT NULL,
    ai_source VARCHAR(20) NOT NULL DEFAULT 'gemini',
    topic_id VARCHAR(100) NOT NULL DEFAULT 'ai',
    topic_name VARCHAR(255) NOT NULL DEFAULT 'Từ đã tra bằng AI',
    difficulty VARCHAR(20) NOT NULL DEFAULT 'medium',
    remembered TINYINT(1) NOT NULL DEFAULT 0,
    bookmarked TINYINT(1) NOT NULL DEFAULT 1,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_vocabulary_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE KEY uq_vocabulary_user_word (user_id, word),
    INDEX idx_vocabulary_user_created (user_id, created_at),
    INDEX idx_vocabulary_user_topic (user_id, topic_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS user_vocabulary_topic_overrides (
    user_id CHAR(36) NOT NULL,
    word_key VARCHAR(255) NOT NULL,
    topic_id VARCHAR(100) NOT NULL,
    topic_name VARCHAR(255) NOT NULL,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (user_id, word_key),
    CONSTRAINT fk_topic_overrides_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS translation_cache (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    hash CHAR(64) NOT NULL,
    source_text TEXT NOT NULL,
    translated_text TEXT NOT NULL,
    phonetic VARCHAR(255) NULL,
    part_of_speech VARCHAR(50) NULL,
    definition_en TEXT NULL,
    examples JSON NULL,
    synonyms JSON NULL,
    source_lang VARCHAR(10) NOT NULL DEFAULT 'en',
    target_lang VARCHAR(10) NOT NULL DEFAULT 'vi',
    hit_count INT NOT NULL DEFAULT 1,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uq_translation_hash (hash)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

SET NAMES utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS admin_feature_statuses (
    route VARCHAR(120) PRIMARY KEY,
    status ENUM('ready', 'coming_soon') NOT NULL DEFAULT 'ready',
    title VARCHAR(120) NOT NULL,
    description VARCHAR(500) NOT NULL,
    icon_key VARCHAR(40) NOT NULL DEFAULT 'wrench',
    action_label VARCHAR(100) NULL,
    action_path VARCHAR(120) NULL,
    sort_order INT NOT NULL DEFAULT 0,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO admin_feature_statuses (
    route, status, title, description, icon_key, action_label, action_path, sort_order
) VALUES
    ('/admin/overview', 'coming_soon', 'Thống kê hệ thống', 'Trang Thống kê hệ thống sẽ sớm ra mắt với các báo cáo chi tiết về hiệu suất học tập toàn hệ thống.', 'chart', NULL, NULL, 10),
    ('/admin/accounts', 'ready', 'Quản lý tài khoản', 'Quản lý tài khoản học viên.', 'users', NULL, NULL, 40),
    ('/admin/features', 'ready', 'Quản lý tính năng', 'Kiểm soát các trang học sinh được phép truy cập.', 'wrench', NULL, NULL, 50),
    ('/profile', 'ready', 'Hồ sơ cá nhân', 'Quản lý hồ sơ Giáo viên.', 'user', NULL, NULL, 60),
    ('/settings', 'ready', 'Cài đặt', 'Tuỳ chỉnh trải nghiệm ứng dụng.', 'settings', NULL, NULL, 70)
ON DUPLICATE KEY UPDATE
    status = VALUES(status),
    title = VALUES(title),
    description = VALUES(description),
    icon_key = VALUES(icon_key),
    action_label = VALUES(action_label),
    action_path = VALUES(action_path),
    sort_order = VALUES(sort_order);

-- Feature visibility configuration for student-facing pages.

CREATE TABLE IF NOT EXISTS feature_flags (
    feature_key VARCHAR(64) PRIMARY KEY,
    is_enabled TINYINT(1) NOT NULL DEFAULT 1,
    updated_by CHAR(36) NULL,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_feature_flags_updated_by
        FOREIGN KEY (updated_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS feature_flag_audit_logs (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    feature_key VARCHAR(64) NOT NULL,
    scope_type ENUM('global') NOT NULL,
    previous_enabled TINYINT(1) NOT NULL,
    new_enabled TINYINT(1) NOT NULL,
    actor_id CHAR(36) NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_feature_flag_logs_actor
        FOREIGN KEY (actor_id) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_feature_flag_logs_created (created_at),
    INDEX idx_feature_flag_logs_feature (feature_key, created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO feature_flags (feature_key, is_enabled) VALUES
    ('dashboard', 1),
    ('mock_test', 1),
    ('vocabulary', 1),
    ('grammar', 1),
    ('history', 1),
    ('ranking', 1),
    ('profile', 1),
    ('settings', 1)
ON DUPLICATE KEY UPDATE feature_key = VALUES(feature_key);

-- Grammar library imported from grammar_questions_flat.csv. Questions are
-- normalized separately from memberships because a question can appear in both
-- the bank and difficulty views.
CREATE TABLE IF NOT EXISTS grammar_topics (
    id VARCHAR(100) PRIMARY KEY,
    title_en VARCHAR(255) NULL,
    title_vi VARCHAR(255) NOT NULL,
    description_en TEXT NULL,
    description_vi TEXT NULL,
    order_index INT NOT NULL DEFAULT 0,
    icon VARCHAR(80) NULL,
    access_level VARCHAR(40) NULL,
    is_hidden TINYINT(1) NOT NULL DEFAULT 0,
    created_at DATETIME NULL,
    updated_at DATETIME NULL,
    INDEX idx_grammar_topics_order (is_hidden, order_index)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS grammar_subtopics (
    id VARCHAR(100) PRIMARY KEY,
    topic_id VARCHAR(100) NOT NULL,
    title_en VARCHAR(255) NULL,
    title_vi VARCHAR(255) NOT NULL,
    description_en TEXT NULL,
    description_vi TEXT NULL,
    order_index INT NOT NULL DEFAULT 0,
    level INT NULL,
    access_level VARCHAR(40) NULL,
    is_hidden TINYINT(1) NOT NULL DEFAULT 0,
    created_at DATETIME NULL,
    updated_at DATETIME NULL,
    CONSTRAINT fk_grammar_subtopics_topic FOREIGN KEY (topic_id)
        REFERENCES grammar_topics(id) ON DELETE CASCADE,
    INDEX idx_grammar_subtopics_topic_order (topic_id, is_hidden, order_index)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS grammar_bank_sets (
    set_id VARCHAR(100) PRIMARY KEY,
    set_name VARCHAR(255) NOT NULL,
    year INT NULL,
    order_index INT NOT NULL DEFAULT 0,
    test_count INT NOT NULL DEFAULT 0,
    total_count INT NOT NULL DEFAULT 0,
    grammar_count INT NOT NULL DEFAULT 0,
    access_level VARCHAR(40) NULL,
    INDEX idx_grammar_bank_order (order_index, year)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS grammar_difficulty_levels (
    level INT PRIMARY KEY,
    name_vi VARCHAR(100) NOT NULL,
    source_url TEXT NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS grammar_questions (
    id VARCHAR(100) PRIMARY KEY,
    source_table VARCHAR(100) NOT NULL,
    question_text TEXT NOT NULL,
    option_a TEXT NULL,
    option_b TEXT NULL,
    option_c TEXT NULL,
    option_d TEXT NULL,
    correct_answer VARCHAR(5) NOT NULL,
    explanation_en TEXT NULL,
    explanation_vi TEXT NULL,
    translation_vi TEXT NULL,
    answer_translation_vi TEXT NULL,
    vocabulary TEXT NULL,
    difficulty_level INT NULL,
    prefer_ai_explanation TINYINT(1) NOT NULL DEFAULT 0,
    created_at DATETIME NULL,
    updated_at DATETIME NULL,
    INDEX idx_grammar_questions_difficulty (difficulty_level)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS grammar_question_memberships (
    id VARCHAR(220) PRIMARY KEY,
    question_id VARCHAR(100) NOT NULL,
    source_mode ENUM('topic', 'bank', 'difficulty') NOT NULL,
    topic_id VARCHAR(100) NULL,
    subtopic_id VARCHAR(100) NULL,
    bank_set_id VARCHAR(100) NULL,
    test_id VARCHAR(100) NULL,
    test_name VARCHAR(255) NULL,
    difficulty_level INT NULL,
    question_number INT NULL,
    order_index INT NOT NULL DEFAULT 0,
    source_url TEXT NOT NULL,
    CONSTRAINT fk_grammar_membership_question FOREIGN KEY (question_id)
        REFERENCES grammar_questions(id) ON DELETE CASCADE,
    CONSTRAINT fk_grammar_membership_topic FOREIGN KEY (topic_id)
        REFERENCES grammar_topics(id) ON DELETE CASCADE,
    CONSTRAINT fk_grammar_membership_subtopic FOREIGN KEY (subtopic_id)
        REFERENCES grammar_subtopics(id) ON DELETE CASCADE,
    CONSTRAINT fk_grammar_membership_bank FOREIGN KEY (bank_set_id)
        REFERENCES grammar_bank_sets(set_id) ON DELETE CASCADE,
    INDEX idx_grammar_memberships_question (question_id),
    INDEX idx_grammar_memberships_mode (source_mode),
    INDEX idx_grammar_memberships_topic (source_mode, topic_id, subtopic_id, order_index),
    INDEX idx_grammar_memberships_bank (source_mode, bank_set_id, test_id, order_index),
    INDEX idx_grammar_memberships_difficulty (source_mode, difficulty_level, order_index)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

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

CREATE TABLE IF NOT EXISTS user_practice_sessions (
    user_id CHAR(36) NOT NULL,
    session_key VARCHAR(190) NOT NULL,
    attempt_id CHAR(36) NOT NULL,
    source_type VARCHAR(20) NOT NULL DEFAULT 'test',
    test_id VARCHAR(100) NULL,
    level INT NULL,
    part_scope VARCHAR(50) NOT NULL DEFAULT 'all',
    current_group_index INT NOT NULL DEFAULT 0,
    seconds_spent INT NOT NULL DEFAULT 0,
    answers JSON NULL,
    checked_group_ids JSON NULL,
    notes JSON NULL,
    annotations JSON NULL,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (user_id, session_key),
    CONSTRAINT fk_practice_sessions_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_practice_sessions_user_updated (user_id, updated_at),
    INDEX idx_practice_sessions_test (user_id, test_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
