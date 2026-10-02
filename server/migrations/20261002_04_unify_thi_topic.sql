-- Migration: Unify 'Thì' topic on systems where topic_thi exists
-- Date: 2026-10-02

UPDATE grammar_topics
SET title_vi = 'Thì',
    title_en = 'Tenses',
    description_vi = 'Các thì cơ bản và nâng cao trong tiếng Anh',
    order_index = 1,
    icon = 'Clock'
WHERE id = 'topic_thi';

UPDATE grammar_subtopics
SET topic_id = 'topic_thi'
WHERE id = 'subtopic_book_key_01'
  AND EXISTS (SELECT 1 FROM (SELECT id FROM grammar_topics WHERE id = 'topic_thi') AS t);

UPDATE grammar_question_memberships
SET topic_id = 'topic_thi'
WHERE subtopic_id = 'subtopic_book_key_01'
  AND EXISTS (SELECT 1 FROM (SELECT id FROM grammar_topics WHERE id = 'topic_thi') AS t);

DELETE FROM grammar_topics
WHERE id = 'topic_key_01'
  AND EXISTS (SELECT 1 FROM (SELECT id FROM grammar_topics WHERE id = 'topic_thi') AS t);
