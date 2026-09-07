CREATE TABLE IF NOT EXISTS system_vocabulary_sets (
    id VARCHAR(64) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT NULL,
    cover_url VARCHAR(500) NULL,
    category VARCHAR(50) NOT NULL DEFAULT 'toeic',
    source VARCHAR(100) NULL,
    order_index INT NOT NULL DEFAULT 0,
    visibility VARCHAR(50) NOT NULL DEFAULT 'public',
    total_tests INT NOT NULL DEFAULT 0,
    total_words INT NOT NULL DEFAULT 0,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_sys_vocab_sets_order (order_index)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS system_vocabulary_topics (
    id VARCHAR(64) PRIMARY KEY,
    set_id VARCHAR(64) NOT NULL,
    name VARCHAR(255) NOT NULL,
    order_index INT NOT NULL DEFAULT 0,
    total_words INT NOT NULL DEFAULT 0,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_sys_vocab_topics_set (set_id, order_index),
    CONSTRAINT fk_sys_vocab_topics_set FOREIGN KEY (set_id) REFERENCES system_vocabulary_sets(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS system_vocabulary_words (
    id VARCHAR(64) PRIMARY KEY,
    set_id VARCHAR(64) NOT NULL,
    topic_id VARCHAR(64) NOT NULL,
    part_id VARCHAR(64) NOT NULL,
    word VARCHAR(255) NOT NULL,
    ipa VARCHAR(255) NULL,
    cefr VARCHAR(20) NULL,
    part_of_speech VARCHAR(50) NULL,
    meaning_vi TEXT NOT NULL,
    definition_en TEXT NULL,
    example_en TEXT NULL,
    example_vi TEXT NULL,
    example_toeic JSON NULL,
    audio_us VARCHAR(500) NULL,
    audio_uk VARCHAR(500) NULL,
    image_url VARCHAR(500) NULL,
    synonyms JSON NULL,
    antonyms JSON NULL,
    phrases JSON NULL,
    confusables JSON NULL,
    word_family JSON NULL,
    audio_voices JSON NULL,
    note_vi TEXT NULL,
    toeic_topic VARCHAR(100) NULL,
    difficulty_level INT NOT NULL DEFAULT 1,
    order_index INT NOT NULL DEFAULT 0,
    INDEX idx_sys_vocab_words_topic (topic_id, order_index),
    INDEX idx_sys_vocab_words_set (set_id),
    INDEX idx_sys_vocab_words_word (word),
    CONSTRAINT fk_sys_vocab_words_topic FOREIGN KEY (topic_id) REFERENCES system_vocabulary_topics(id) ON DELETE CASCADE,
    CONSTRAINT fk_sys_vocab_words_set FOREIGN KEY (set_id) REFERENCES system_vocabulary_sets(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
