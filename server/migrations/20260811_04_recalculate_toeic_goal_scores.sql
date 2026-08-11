-- TOEIC goal progress only uses the best fully answered 200-question exam.
-- Practice, level practice, incomplete exams, and single-Part exams are excluded.
-- Safe to rerun: current_score is derived entirely from qualifying attempts.
UPDATE users AS u
LEFT JOIN (
    SELECT user_id, MAX(total_score) AS best_score
    FROM test_attempts
    WHERE mode = 'exam'
      AND total_questions = 200
      AND answered_questions = 200
      AND part IS NULL
      AND COALESCE(
          JSON_UNQUOTE(JSON_EXTRACT(metadata, '$.is_partial')),
          'false'
      ) <> 'true'
    GROUP BY user_id
) AS qualifying_scores ON qualifying_scores.user_id = u.id
SET u.current_score = COALESCE(qualifying_scores.best_score, 0);
