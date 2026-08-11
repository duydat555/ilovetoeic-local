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
