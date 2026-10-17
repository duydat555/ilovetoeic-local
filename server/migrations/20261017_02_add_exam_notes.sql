-- Back up before applying. Independent of attempt/session/history deletion.
-- Empty documents are revisioned tombstones; no note-count quota.
CREATE TABLE IF NOT EXISTS user_exam_notes (
    user_id CHAR(36) NOT NULL,
    note_key CHAR(64) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
    group_key CHAR(64) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
    question_id VARCHAR(150) NOT NULL,
    question_number INT UNSIGNED NOT NULL,
    part TINYINT UNSIGNED NOT NULL,
    document JSON NOT NULL,
    revision INT UNSIGNED NOT NULL,
    mutation_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (user_id, note_key),
    KEY ix_exam_notes_group (user_id, group_key),
    CONSTRAINT fk_exam_notes_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
