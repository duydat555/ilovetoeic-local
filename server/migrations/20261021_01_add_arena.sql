-- Additive, manual migration. Back up production before applying. No question seeds.
-- Requires existing users.xp and user_xp_ledger from the XP migration.
CREATE TABLE IF NOT EXISTS arena_control (
    id INT PRIMARY KEY
) ENGINE=InnoDB;
INSERT IGNORE INTO arena_control (id) VALUES (1);

CREATE TABLE IF NOT EXISTS arena_matches (
    id CHAR(36) PRIMARY KEY,
    code CHAR(6) NOT NULL UNIQUE,
    mode VARCHAR(24) NOT NULL,
    wager INT NOT NULL,
    status VARCHAR(16) NOT NULL,
    host_id CHAR(36) NOT NULL,
    round_index INT NOT NULL DEFAULT 0,
    round_started DOUBLE NULL,
    expires_at DOUBLE NOT NULL,
    questions JSON NOT NULL,
    winner_id CHAR(36) NULL,
    created_at DOUBLE NOT NULL,
    finished_at DOUBLE NULL,
    INDEX idx_arena_queue (status, mode, wager, created_at),
    INDEX idx_arena_expiry (status, expires_at),
    FOREIGN KEY (host_id) REFERENCES users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS arena_players (
    match_id CHAR(36) NOT NULL,
    user_id CHAR(36) NOT NULL,
    active_user_id CHAR(36) NULL UNIQUE,
    ready TINYINT NOT NULL DEFAULT 0,
    score INT NOT NULL DEFAULT 0,
    xp_delta INT NOT NULL DEFAULT 0,
    answers JSON NOT NULL,
    last_seen DOUBLE NOT NULL,
    PRIMARY KEY (match_id, user_id),
    INDEX idx_arena_user_history (user_id, match_id),
    FOREIGN KEY (match_id) REFERENCES arena_matches(id),
    FOREIGN KEY (user_id) REFERENCES users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS arena_stats (
    user_id CHAR(36) PRIMARY KEY,
    wins INT NOT NULL DEFAULT 0,
    losses INT NOT NULL DEFAULT 0,
    draws INT NOT NULL DEFAULT 0,
    earned_xp BIGINT NOT NULL DEFAULT 0,
    INDEX idx_arena_leaders (earned_xp DESC, wins DESC, user_id),
    FOREIGN KEY (user_id) REFERENCES users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO feature_flags (feature_key, is_enabled) VALUES ('arena', 0)
ON DUPLICATE KEY UPDATE feature_key = VALUES(feature_key);
