-- Migration: Add invalid_selections table to isolate garbage/proper nouns from dictionary
-- Purpose: Prevent meaningless strings and proper nouns from polluting community_translations
SET NAMES utf8mb4;

CREATE TABLE IF NOT EXISTS invalid_selections (
    id INT AUTO_INCREMENT PRIMARY KEY,
    word VARCHAR(100) NOT NULL,
    word_type VARCHAR(30) NOT NULL DEFAULT 'invalid_selection',
    translated_text TEXT NULL,
    hit_count INT NOT NULL DEFAULT 1,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uq_invalid_word (word),
    INDEX idx_word_type (word_type)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
