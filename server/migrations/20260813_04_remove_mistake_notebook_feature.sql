-- Remove the retired standalone Mistake Notebook feature.
-- Wrong-answer records remain because per-Part and per-group retry still uses them.
DELETE FROM feature_flag_audit_logs WHERE feature_key = 'mistake_notebook';
DELETE FROM feature_flags WHERE feature_key = 'mistake_notebook';
