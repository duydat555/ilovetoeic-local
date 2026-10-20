-- Back up the target database before applying. Additive; does not touch exam/session data.
CREATE TABLE IF NOT EXISTS user_exam_annotations (
    user_id CHAR(36) NOT NULL,
    document_key CHAR(64) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
    document JSON NOT NULL,
    revision INT UNSIGNED NOT NULL,
    mutation_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (user_id, document_key),
    CONSTRAINT fk_exam_annotations_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
