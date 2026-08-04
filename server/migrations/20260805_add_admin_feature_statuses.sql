SET NAMES utf8mb4 COLLATE utf8mb4_unicode_ci;

SET NAMES utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS admin_feature_statuses (
    route VARCHAR(120) PRIMARY KEY,
    status ENUM('ready', 'coming_soon') NOT NULL DEFAULT 'ready',
    title VARCHAR(120) NOT NULL,
    description VARCHAR(500) NOT NULL,
    icon_key VARCHAR(40) NOT NULL DEFAULT 'wrench',
    action_label VARCHAR(100) NULL,
    action_path VARCHAR(120) NULL,
    sort_order INT NOT NULL DEFAULT 0,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO admin_feature_statuses (
    route, status, title, description, icon_key, action_label, action_path, sort_order
) VALUES
    ('/admin/overview', 'coming_soon', 'Thống kê hệ thống', 'Trang Thống kê hệ thống sẽ sớm ra mắt với các báo cáo chi tiết về hiệu suất học tập toàn hệ thống.', 'chart', NULL, NULL, 10),
    ('/admin/classes', 'ready', 'Quản lý lớp học', 'Quản lý lớp học và học viên.', 'school', NULL, NULL, 20),
    ('/admin/homework', 'ready', 'Bài tập về nhà', 'Tạo và theo dõi bài tập về nhà.', 'clipboard', NULL, NULL, 30),
    ('/admin/accounts', 'ready', 'Quản lý tài khoản', 'Quản lý tài khoản học viên.', 'users', NULL, NULL, 40),
    ('/admin/features', 'ready', 'Quản lý tính năng', 'Kiểm soát các trang học sinh được phép truy cập.', 'wrench', NULL, NULL, 50),
    ('/profile', 'ready', 'Hồ sơ cá nhân', 'Quản lý hồ sơ Giáo viên.', 'user', NULL, NULL, 60),
    ('/settings', 'ready', 'Cài đặt', 'Tuỳ chỉnh trải nghiệm ứng dụng.', 'settings', NULL, NULL, 70)
ON DUPLICATE KEY UPDATE
    status = VALUES(status),
    title = VALUES(title),
    description = VALUES(description),
    icon_key = VALUES(icon_key),
    action_label = VALUES(action_label),
    action_path = VALUES(action_path),
    sort_order = VALUES(sort_order);
