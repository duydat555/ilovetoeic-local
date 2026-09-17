-- Migration: Add passage_sentence_pairs JSON column to passages table
-- Stores structured [{ sentence_id, en, vi, question_numbers, type, doc_index }] pairs
-- Generated at translation time to eliminate client-side heuristic guessing & DP alignment.

DELIMITER $$

DROP PROCEDURE IF EXISTS add_passage_sentence_pairs_column$$

CREATE PROCEDURE add_passage_sentence_pairs_column()
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = DATABASE()
          AND table_name = 'passages'
          AND column_name = 'passage_sentence_pairs'
    ) THEN
        ALTER TABLE passages
            ADD COLUMN passage_sentence_pairs JSON NULL AFTER passage_text_3_vi_html;
    END IF;
END$$

CALL add_passage_sentence_pairs_column()$$
DROP PROCEDURE add_passage_sentence_pairs_column$$

DELIMITER ;
