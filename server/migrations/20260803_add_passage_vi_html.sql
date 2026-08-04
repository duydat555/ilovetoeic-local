-- Adds formatted Vietnamese passage HTML without modifying the approved
-- plain-text translation source.

DELIMITER $$

DROP PROCEDURE IF EXISTS add_passage_format_columns$$

CREATE PROCEDURE add_passage_format_columns()
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = DATABASE()
          AND table_name = 'passages'
          AND column_name = 'passage_text_vi_html'
    ) THEN
        ALTER TABLE passages
            ADD COLUMN passage_text_vi_html LONGTEXT NULL AFTER passage_text_3;
    END IF;

    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = DATABASE()
          AND table_name = 'passages'
          AND column_name = 'passage_text_2_vi_html'
    ) THEN
        ALTER TABLE passages
            ADD COLUMN passage_text_2_vi_html LONGTEXT NULL AFTER passage_text_vi_html;
    END IF;

    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = DATABASE()
          AND table_name = 'passages'
          AND column_name = 'passage_text_3_vi_html'
    ) THEN
        ALTER TABLE passages
            ADD COLUMN passage_text_3_vi_html LONGTEXT NULL AFTER passage_text_2_vi_html;
    END IF;

    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = DATABASE()
          AND table_name = 'passages'
          AND column_name = 'format_status'
    ) THEN
        ALTER TABLE passages
            ADD COLUMN format_status ENUM('pending', 'done', 'error')
            NOT NULL DEFAULT 'pending' AFTER passage_text_3_vi_html;
    END IF;

    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.statistics
        WHERE table_schema = DATABASE()
          AND table_name = 'passages'
          AND index_name = 'idx_passages_format_status'
    ) THEN
        ALTER TABLE passages
            ADD INDEX idx_passages_format_status (format_status);
    END IF;
END$$

CALL add_passage_format_columns()$$
DROP PROCEDURE add_passage_format_columns$$

DELIMITER ;
