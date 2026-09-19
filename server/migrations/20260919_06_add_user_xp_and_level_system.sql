-- Migration: 20260919_06_add_user_xp_and_level_system.sql
-- Description: Add xp and level columns to users, create level_definitions and user_xp_ledger tables

-- 1. Add xp and level to users table idempotently
DROP PROCEDURE IF EXISTS add_users_xp_level;
DELIMITER $$
CREATE PROCEDURE add_users_xp_level()
BEGIN
    IF NOT EXISTS (
        SELECT * FROM information_schema.COLUMNS 
        WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users' AND COLUMN_NAME = 'xp'
    ) THEN
        ALTER TABLE users 
            ADD COLUMN xp INT NOT NULL DEFAULT 0,
            ADD COLUMN level INT NOT NULL DEFAULT 1,
            ADD INDEX idx_users_xp (xp),
            ADD INDEX idx_users_level (level);
    END IF;
END$$
DELIMITER ;
CALL add_users_xp_level();
DROP PROCEDURE IF EXISTS add_users_xp_level;

-- 2. Create level_definitions table
CREATE TABLE IF NOT EXISTS level_definitions (
    level INT PRIMARY KEY,
    xp_required INT NOT NULL,
    title VARCHAR(100) NOT NULL,
    badge_icon VARCHAR(100) NOT NULL DEFAULT 'sprout',
    color VARCHAR(50) NOT NULL DEFAULT 'emerald'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3. Seed level definitions
INSERT INTO level_definitions (level, xp_required, title, badge_icon, color) VALUES
(1, 0, 'Tập sự TOEIC', 'sprout', 'emerald'),
(2, 100, 'Khởi động TOEIC', 'footprints', 'teal'),
(3, 300, 'Bứt phá sơ cấp', 'compass', 'sky'),
(4, 600, 'Tăng tốc từ vựng', 'book-open', 'blue'),
(5, 1000, 'Chiến binh ngữ pháp', 'shield', 'indigo'),
(6, 1500, 'Chuyên cần Part 5-6', 'zap', 'amber'),
(7, 2200, 'Tai nghe thính nhạy', 'headphones', 'orange'),
(8, 3000, 'Kỳ thủ đọc hiểu', 'glasses', 'rose'),
(9, 4000, 'Thợ săn bẫy đề', 'crosshair', 'red'),
(10, 5200, 'Chiến tướng TOEIC', 'swords', 'purple'),
(11, 6600, 'Chinh phục 650+', 'medal', 'violet'),
(12, 8200, 'Cao thủ 750+', 'award', 'pink'),
(13, 10000, 'Đại kiện tướng 850+', 'trophy', 'yellow'),
(14, 12500, 'Huyền thoại 900+', 'crown', 'amber'),
(15, 15500, 'Bậc thầy TOEIC 950+', 'gem', 'cyan'),
(16, 19000, 'Vua TOEIC 990', 'sparkles', 'emerald')
ON DUPLICATE KEY UPDATE
    xp_required = VALUES(xp_required),
    title = VALUES(title),
    badge_icon = VALUES(badge_icon),
    color = VALUES(color);

-- 4. Create user_xp_ledger table for idempotent tracking
CREATE TABLE IF NOT EXISTS user_xp_ledger (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id CHAR(36) NOT NULL,
    xp_amount INT NOT NULL,
    activity_type VARCHAR(50) NOT NULL,
    dedupe_key VARCHAR(150) UNIQUE,
    description VARCHAR(255) NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_xp_user_id (user_id),
    INDEX idx_xp_activity_type (activity_type),
    INDEX idx_xp_created_at (created_at),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
