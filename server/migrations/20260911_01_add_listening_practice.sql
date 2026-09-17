-- Migration: 20260911_01_add_listening_practice.sql
-- Description: Thêm bảng và cấu trúc cho tính năng Luyện nghe TOEIC (Listening Practice)

-- 1. Bảng Danh mục Luyện nghe (Dynamic Categories)
CREATE TABLE IF NOT EXISTS listening_categories (
    id VARCHAR(100) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT NULL,
    icon VARCHAR(80) NULL,
    order_index INT NOT NULL DEFAULT 0,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2. Bảng Bộ đề Luyện nghe (Listening Sets)
CREATE TABLE IF NOT EXISTS listening_sets (
    id VARCHAR(100) PRIMARY KEY,
    category_id VARCHAR(100) NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT NULL,
    part VARCHAR(50) NOT NULL DEFAULT 'Part 1',
    difficulty ENUM('easy', 'medium', 'hard') NOT NULL DEFAULT 'medium',
    is_pro TINYINT(1) NOT NULL DEFAULT 0,
    has_video TINYINT(1) NOT NULL DEFAULT 0,
    video_source_type VARCHAR(50) NOT NULL DEFAULT 'audio_only',
    cover_image VARCHAR(500) NULL,
    sentence_count INT NOT NULL DEFAULT 0,
    order_index INT NOT NULL DEFAULT 0,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_listening_sets_category FOREIGN KEY (category_id)
        REFERENCES listening_categories(id) ON DELETE CASCADE,
    INDEX idx_listening_sets_category_order (category_id, order_index),
    INDEX idx_listening_sets_difficulty (difficulty),
    INDEX idx_listening_sets_is_pro (is_pro)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3. Bảng Câu luyện nghe chi tiết (Listening Sentences)
CREATE TABLE IF NOT EXISTS listening_sentences (
    id VARCHAR(100) PRIMARY KEY,
    set_id VARCHAR(100) NOT NULL,
    order_index INT NOT NULL DEFAULT 1,
    audio_url VARCHAR(1000) NOT NULL,
    video_url VARCHAR(1000) NULL,
    start_time FLOAT NOT NULL DEFAULT 0.0,
    end_time FLOAT NULL,
    text TEXT NOT NULL,
    words_to_fill JSON NOT NULL,
    translation_vi TEXT NOT NULL,
    distractors JSON NULL,
    check_options JSON NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_listening_sentences_set FOREIGN KEY (set_id)
        REFERENCES listening_sets(id) ON DELETE CASCADE,
    INDEX idx_listening_sentences_set_order (set_id, order_index)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 4. Bảng Tiến độ luyện nghe của người dùng (User Listening Progress)
CREATE TABLE IF NOT EXISTS user_listening_progress (
    id VARCHAR(100) PRIMARY KEY,
    user_id CHAR(36) NOT NULL,
    set_id VARCHAR(100) NOT NULL,
    mode VARCHAR(50) NOT NULL DEFAULT 'dictation',
    current_sentence_index INT NOT NULL DEFAULT 0,
    completed_sentences JSON NOT NULL,
    sentence_scores JSON NOT NULL,
    completion_rate FLOAT NOT NULL DEFAULT 0.0,
    total_score INT NOT NULL DEFAULT 0,
    total_hints_used INT NOT NULL DEFAULT 0,
    notes JSON NULL,
    last_studied_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_user_listening_user FOREIGN KEY (user_id)
        REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT fk_user_listening_set FOREIGN KEY (set_id)
        REFERENCES listening_sets(id) ON DELETE CASCADE,
    UNIQUE KEY uk_user_listening_set_mode (user_id, set_id, mode),
    INDEX idx_user_listening_user_studied (user_id, last_studied_at),
    INDEX idx_user_listening_set_rate (set_id, completion_rate)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 5. Bật feature flag 'listening'
INSERT INTO feature_flags (feature_key, is_enabled)
VALUES ('listening', 1)
ON DUPLICATE KEY UPDATE is_enabled = VALUES(is_enabled);

