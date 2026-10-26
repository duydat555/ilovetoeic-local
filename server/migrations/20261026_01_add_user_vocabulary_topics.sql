-- Add personal vocabulary topics table so custom vocabulary sets sync across devices (web, tablet, mobile)

CREATE TABLE IF NOT EXISTS user_vocabulary_topics (
    id VARCHAR(100) NOT NULL,
    user_id CHAR(36) NOT NULL,
    name VARCHAR(255) NOT NULL,
    icon VARCHAR(50) NOT NULL DEFAULT 'briefcase',
    description TEXT NULL,
    word_ids JSON NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (user_id, id),
    CONSTRAINT fk_vocab_topics_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_vocab_topics_user_created (user_id, created_at DESC)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Backfill custom topics from existing user_vocabulary records so previously created sets on any device appear everywhere
INSERT IGNORE INTO user_vocabulary_topics (id, user_id, name, icon, description, word_ids, created_at)
SELECT
    v.topic_id AS id,
    v.user_id AS user_id,
    MAX(v.topic_name) AS name,
    'briefcase' AS icon,
    '' AS description,
    JSON_ARRAYAGG(v.id) AS word_ids,
    MIN(v.created_at) AS created_at
FROM user_vocabulary v
WHERE v.topic_id IS NOT NULL
  AND v.topic_id NOT IN ('ai', 'my-words', 'saved', 'notebook', 'all', 'starter-unit-1', 'system-office', 'system-business')
  AND v.topic_id NOT LIKE 'system-%'
GROUP BY v.user_id, v.topic_id;
