-- Feature visibility configuration for student-facing pages.

SET NAMES utf8mb4 COLLATE utf8mb4_unicode_ci;

SET NAMES utf8mb4 COLLATE utf8mb4_unicode_ci;

SET NAMES utf8mb4 COLLATE utf8mb4_unicode_ci;

SET NAMES utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS feature_flags (
    feature_key VARCHAR(64) PRIMARY KEY,
    is_enabled TINYINT(1) NOT NULL DEFAULT 1,
    updated_by CHAR(36) NULL,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_feature_flags_updated_by
        FOREIGN KEY (updated_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS class_feature_overrides (
    class_id VARCHAR(100) NOT NULL,
    feature_key VARCHAR(64) NOT NULL,
    is_enabled TINYINT(1) NOT NULL DEFAULT 1,
    updated_by CHAR(36) NULL,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (class_id, feature_key),
    CONSTRAINT fk_class_feature_overrides_class
        FOREIGN KEY (class_id) REFERENCES learning_classes(id) ON DELETE CASCADE,
    CONSTRAINT fk_class_feature_overrides_actor
        FOREIGN KEY (updated_by) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_class_feature_overrides_feature (feature_key, is_enabled)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS feature_flag_audit_logs (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    feature_key VARCHAR(64) NOT NULL,
    scope_type ENUM('global', 'class') NOT NULL,
    class_id VARCHAR(100) NULL,
    previous_enabled TINYINT(1) NOT NULL,
    new_enabled TINYINT(1) NOT NULL,
    actor_id CHAR(36) NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_feature_flag_logs_class
        FOREIGN KEY (class_id) REFERENCES learning_classes(id) ON DELETE SET NULL,
    CONSTRAINT fk_feature_flag_logs_actor
        FOREIGN KEY (actor_id) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_feature_flag_logs_created (created_at),
    INDEX idx_feature_flag_logs_feature (feature_key, created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO feature_flags (feature_key, is_enabled) VALUES
    ('dashboard', 1),
    ('learning_path', 1),
    ('mock_test', 1),
    ('vocabulary', 1),
    ('grammar', 1),
    ('mistake_notebook', 1),
    ('history', 1),
    ('homework', 1),
    ('ranking', 1),
    ('profile', 1),
    ('settings', 1)
ON DUPLICATE KEY UPDATE feature_key = VALUES(feature_key);
