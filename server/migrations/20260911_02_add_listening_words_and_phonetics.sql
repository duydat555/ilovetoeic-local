-- Migration: 20260911_02_add_listening_words_and_phonetics.sql
-- Description: Thêm trường words (timestamps từng từ phục vụ karaoke), phonetic_us, và group_index cho listening_sentences

ALTER TABLE listening_sentences
    ADD COLUMN words JSON NULL AFTER text,
    ADD COLUMN phonetic_us VARCHAR(500) NULL AFTER translation_vi,
    ADD COLUMN group_index INT NOT NULL DEFAULT 1 AFTER order_index,
    ADD INDEX idx_listening_sentences_group (set_id, group_index);
