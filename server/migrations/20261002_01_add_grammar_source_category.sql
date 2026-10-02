-- Migration: Add source_category to grammar_subtopics and grammar_question_memberships
-- Date: 2026-10-02
-- Purpose: Support separating questions into "Trong sách" ('book') and "Bổ sung" ('supplementary')

ALTER TABLE grammar_subtopics
  ADD COLUMN source_category VARCHAR(30) NOT NULL DEFAULT 'supplementary';

ALTER TABLE grammar_question_memberships
  ADD COLUMN source_category VARCHAR(30) NOT NULL DEFAULT 'supplementary',
  ADD INDEX idx_grammar_memberships_cat (source_mode, source_category, topic_id, subtopic_id);

-- Ensure all existing records are marked as 'supplementary'
UPDATE grammar_subtopics SET source_category = 'supplementary' WHERE source_category IS NULL OR source_category = '';
UPDATE grammar_question_memberships SET source_category = 'supplementary' WHERE source_category IS NULL OR source_category = '';
