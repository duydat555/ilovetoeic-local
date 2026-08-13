-- Permanently remove the retired class-management feature and its data.
DELETE FROM admin_feature_statuses WHERE route = '/admin/classes';
DELETE FROM feature_flag_audit_logs WHERE scope_type = 'class';

DROP TABLE IF EXISTS leaderboard_stats;
DROP TABLE IF EXISTS leaderboard_members;
DROP TABLE IF EXISTS class_feature_overrides;
DROP TABLE IF EXISTS class_memberships;

SET @drop_class_fk = IF(
    EXISTS(
        SELECT 1 FROM information_schema.TABLE_CONSTRAINTS
        WHERE CONSTRAINT_SCHEMA = DATABASE()
          AND TABLE_NAME = 'feature_flag_audit_logs'
          AND CONSTRAINT_NAME = 'fk_feature_flag_logs_class'
    ),
    'ALTER TABLE feature_flag_audit_logs DROP FOREIGN KEY fk_feature_flag_logs_class',
    'SELECT 1'
);
PREPARE drop_class_fk_statement FROM @drop_class_fk;
EXECUTE drop_class_fk_statement;
DEALLOCATE PREPARE drop_class_fk_statement;

SET @drop_class_id = IF(
    EXISTS(
        SELECT 1 FROM information_schema.COLUMNS
        WHERE TABLE_SCHEMA = DATABASE()
          AND TABLE_NAME = 'feature_flag_audit_logs'
          AND COLUMN_NAME = 'class_id'
    ),
    'ALTER TABLE feature_flag_audit_logs DROP COLUMN class_id',
    'SELECT 1'
);
PREPARE drop_class_id_statement FROM @drop_class_id;
EXECUTE drop_class_id_statement;
DEALLOCATE PREPARE drop_class_id_statement;

ALTER TABLE feature_flag_audit_logs
    MODIFY COLUMN scope_type ENUM('global') NOT NULL;

DROP TABLE IF EXISTS learning_classes;
