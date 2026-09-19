-- Migration: 20260920_02_add_system_announcements.sql
-- Description: Create system_announcements and user_announcement_reads tables for admin announcement popups

CREATE TABLE IF NOT EXISTS system_announcements (
    id VARCHAR(36) PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    type VARCHAR(32) NOT NULL DEFAULT 'info',
    action_url VARCHAR(255) NULL,
    action_label VARCHAR(100) NULL,
    is_active TINYINT(1) NOT NULL DEFAULT 1,
    show_popup TINYINT(1) NOT NULL DEFAULT 1,
    created_by CHAR(36) NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_announcements_active (is_active, show_popup, created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS user_announcement_reads (
    user_id CHAR(36) NOT NULL,
    announcement_id VARCHAR(36) NOT NULL,
    read_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (user_id, announcement_id),
    CONSTRAINT fk_announcement_reads_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT fk_announcement_reads_announcement FOREIGN KEY (announcement_id) REFERENCES system_announcements(id) ON DELETE CASCADE,
    INDEX idx_announcement_reads_user (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
