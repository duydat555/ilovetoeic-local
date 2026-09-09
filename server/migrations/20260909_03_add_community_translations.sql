-- Migration: Add community_translations table for self-healing translation cache
-- Purpose: Safely cache contextual Gemini translations for words/phrases outside system dictionary
SET NAMES utf8mb4;

CREATE TABLE IF NOT EXISTS community_translations (
    id INT AUTO_INCREMENT PRIMARY KEY,
    word VARCHAR(100) NOT NULL,
    context_hash VARCHAR(64) NOT NULL,
    context_text TEXT NULL,
    translated_text TEXT NOT NULL,
    phonetic VARCHAR(100) NULL,
    phonetic_us VARCHAR(100) NULL,
    phonetic_uk VARCHAR(100) NULL,
    audio_us VARCHAR(500) NULL,
    audio_uk VARCHAR(500) NULL,
    part_of_speech VARCHAR(50) NULL,
    definition_en TEXT NULL,
    examples JSON NULL,
    synonyms JSON NULL,
    hit_count INT NOT NULL DEFAULT 1,
    source_lang VARCHAR(10) NOT NULL DEFAULT 'en',
    target_lang VARCHAR(10) NOT NULL DEFAULT 'vi',
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uq_word_context_hash (word, context_hash),
    INDEX idx_context_hash (context_hash),
    INDEX idx_word (word)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Migrate existing translation_cache records into community_translations if applicable
INSERT IGNORE INTO community_translations (
    word, context_hash, translated_text, phonetic, part_of_speech,
    definition_en, examples, synonyms, source_lang, target_lang, hit_count, created_at
)
SELECT 
    LOWER(TRIM(source_text)), 
    hash, 
    translated_text, 
    phonetic, 
    part_of_speech,
    definition_en, 
    examples, 
    synonyms, 
    source_lang, 
    target_lang, 
    hit_count, 
    created_at
FROM translation_cache
WHERE source_text IS NOT NULL AND source_text != '';
