-- Migration: Create learning_classes and class_memberships tables
-- Date: 2026-10-02

CREATE TABLE IF NOT EXISTS learning_classes (
    id VARCHAR(50) NOT NULL,
    name VARCHAR(255) NOT NULL,
    code VARCHAR(20) NOT NULL,
    description TEXT NOT NULL,
    target_score INT NOT NULL DEFAULT 750,
    is_public TINYINT(1) NOT NULL DEFAULT 0,
    is_active TINYINT(1) NOT NULL DEFAULT 1,
    created_by CHAR(36) NOT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uq_learning_classes_code (code),
    INDEX idx_learning_classes_created (created_by, is_active),
    CONSTRAINT fk_learning_classes_created_by FOREIGN KEY (created_by) REFERENCES users (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS class_memberships (
    class_id VARCHAR(50) NOT NULL,
    user_id CHAR(36) NOT NULL,
    joined_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (class_id, user_id),
    INDEX idx_class_memberships_user (user_id),
    CONSTRAINT fk_class_memberships_class FOREIGN KEY (class_id) REFERENCES learning_classes (id) ON DELETE CASCADE,
    CONSTRAINT fk_class_memberships_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO admin_feature_statuses (route, status, title, description, icon_key, sort_order)
VALUES (
    '/admin/classes',
    'ready',
    'Quản lý lớp học',
    'Tạo nhóm lớp, phân bổ học viên và theo dõi tiến độ luyện thi TOEIC theo mục tiêu.',
    'graduation-cap',
    42
)
ON DUPLICATE KEY UPDATE
    status = VALUES(status),
    title = VALUES(title),
    description = VALUES(description),
    icon_key = VALUES(icon_key),
    sort_order = VALUES(sort_order);
