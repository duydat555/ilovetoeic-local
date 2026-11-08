-- Voice mode conversation history. Only adds tables and one feature flag row; touches no existing data.
-- Back up the database before applying (see docs/agents/database.md).

CREATE TABLE IF NOT EXISTS ai_conversations (
    id CHAR(36) NOT NULL,
    user_id CHAR(36) NOT NULL,
    mode VARCHAR(20) NOT NULL DEFAULT 'assistant',
    persona VARCHAR(20) NOT NULL DEFAULT 'friendly',
    server_label VARCHAR(40) NOT NULL DEFAULT '',
    duration_seconds INT NOT NULL DEFAULT 0,
    turns INT NOT NULL DEFAULT 0,
    summary JSON NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    CONSTRAINT fk_ai_conversations_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_ai_conversations_user_created (user_id, created_at DESC)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS ai_messages (
    id BIGINT NOT NULL AUTO_INCREMENT,
    conversation_id CHAR(36) NOT NULL,
    seq INT NOT NULL,
    role ENUM('user', 'assistant') NOT NULL,
    content TEXT NOT NULL,
    PRIMARY KEY (id),
    CONSTRAINT fk_ai_messages_conversation FOREIGN KEY (conversation_id) REFERENCES ai_conversations(id) ON DELETE CASCADE,
    INDEX idx_ai_messages_conversation (conversation_id, seq)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO feature_flags (feature_key, is_enabled) VALUES ('ai_voice', 0)
ON DUPLICATE KEY UPDATE feature_key = VALUES(feature_key);
