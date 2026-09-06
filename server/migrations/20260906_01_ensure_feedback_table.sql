-- Migration: Ensure user_feedback table exists without foreign key collation friction
SET NAMES utf8mb4;

CREATE TABLE IF NOT EXISTS user_feedback (
    id CHAR(36) PRIMARY KEY,
    user_id CHAR(36) NOT NULL,
    type ENUM('feature_request', 'suggestion') NOT NULL DEFAULT 'feature_request',
    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    images JSON NULL,
    status ENUM('pending', 'in_progress', 'resolved', 'rejected') NOT NULL DEFAULT 'pending',
    admin_response TEXT NULL,
    responded_at DATETIME NULL,
    responded_by CHAR(36) NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_feedback_user_created (user_id, created_at),
    INDEX idx_feedback_status_created (status, created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

INSERT INTO admin_feature_statuses (
    route, status, title, description, icon_key, action_label, action_path, sort_order
) VALUES (
    '/admin/feedback', 'ready', 'Quản lý Góp ý', 'Xem và phản hồi ý kiến, đóng góp từ học viên.', 'message-square', NULL, NULL, 45
) ON DUPLICATE KEY UPDATE
    title = VALUES(title),
    description = VALUES(description),
    status = VALUES(status),
    icon_key = VALUES(icon_key);

INSERT INTO feature_flags (feature_key, is_enabled) VALUES ('feedback', 1)
ON DUPLICATE KEY UPDATE feature_key = VALUES(feature_key);
