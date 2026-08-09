-- Remove the retired Homework module while leaving shared feature tables intact.
START TRANSACTION;

DELETE FROM class_feature_overrides WHERE feature_key = 'homework';
DELETE FROM feature_flag_audit_logs WHERE feature_key = 'homework';
DELETE FROM feature_flags WHERE feature_key = 'homework';
DELETE FROM admin_feature_statuses WHERE route = '/admin/homework';
DELETE FROM user_notifications WHERE type = 'homework';

COMMIT;

DROP TABLE IF EXISTS homework_assignments;
