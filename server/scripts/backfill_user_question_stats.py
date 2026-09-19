import sys
import io
if sys.platform == "win32":
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8")
from app.db import db

def backfill_all_users():
    """Recalculates total_questions_answered and total_correct_answers for all users.
    
    Formula:
      - user_question_activity (all practice & exam questions)
      - user_grammar_question_activity (all grammar practice questions)
      - test_attempts (legacy exam tests where attempt_id is not in user_question_activity)
    """
    print("=== BACKFILLING USER QUESTION STATS ===")
    with db.transaction() as conn:
        with conn.cursor() as cursor:
            cursor.execute("""
                UPDATE users u
                LEFT JOIN (
                    WITH answer_events AS (
                        SELECT user_id, COUNT(*) AS question_count, SUM(is_correct) AS correct_count
                        FROM user_question_activity
                        GROUP BY user_id
                        UNION ALL
                        SELECT user_id, COUNT(*) AS question_count, SUM(is_correct) AS correct_count
                        FROM user_grammar_question_activity
                        GROUP BY user_id
                        UNION ALL
                        SELECT ta.user_id, SUM(ta.answered_questions), SUM(ta.correct_answers)
                        FROM test_attempts ta
                        WHERE ta.mode = 'exam'
                          AND NOT EXISTS (
                              SELECT 1 FROM user_question_activity uqa
                              WHERE uqa.user_id = ta.user_id AND uqa.attempt_id = ta.id
                          )
                        GROUP BY ta.user_id
                    )
                    SELECT user_id, SUM(question_count) AS total_q, SUM(correct_count) AS total_c
                    FROM answer_events
                    GROUP BY user_id
                ) agg ON agg.user_id = u.id
                SET u.total_questions_answered = COALESCE(agg.total_q, 0),
                    u.total_correct_answers = COALESCE(agg.total_c, 0)
            """)
            print(f"Updated {cursor.rowcount} users in database.")

    rows = db.fetch_all("""
        SELECT id, full_name, total_questions_answered, total_correct_answers, xp
        FROM users
        WHERE role = 'student' AND approval_status = 'approved'
        ORDER BY xp DESC, total_questions_answered DESC
    """, use_cache=False)
    print("\nVerified User Question Stats:")
    for r in rows:
        print(f"  {r['full_name']}: total_q={r['total_questions_answered']}, total_c={r['total_correct_answers']}, xp={r['xp']}")

if __name__ == "__main__":
    backfill_all_users()
