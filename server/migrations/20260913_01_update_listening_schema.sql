-- Migration: Update listening schema for ETS 2026 and phone signal difficulty
-- Date: 2026-09-13

-- 1. Drop audio_url from listening_sentences (audio is defined at set level)
ALTER TABLE listening_sentences DROP COLUMN audio_url;

-- 2. Add audio_url and difficulty_level to listening_sets
ALTER TABLE listening_sets 
    ADD COLUMN audio_url VARCHAR(1000) NULL AFTER cover_image,
    ADD COLUMN difficulty_level TINYINT NOT NULL DEFAULT 3 AFTER difficulty;

-- 3. Add ETS 2026 category if not exists
INSERT IGNORE INTO listening_categories (id, name, description, icon, order_index)
VALUES ('ets-2026', 'Đề ETS 2026', 'Trích xuất bài luyện nghe ETS 2026 định dạng mới', 'Sparkles', 5);
