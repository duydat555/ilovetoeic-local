import sys
import io
if sys.platform == "win32":
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8")
from pathlib import Path
from app.db import db

def apply_migration(migration_file: str):
    file_path = Path(__file__).resolve().parent.parent / "migrations" / migration_file
    if not file_path.exists():
        print(f"Error: Migration file {file_path} does not exist.")
        sys.exit(1)
        
    print(f"Applying migration: {migration_file}...")
    with db.transaction() as conn:
        with conn.cursor() as cursor:
            # Check and add columns
            cursor.execute("""
                SELECT COUNT(*) FROM information_schema.COLUMNS
                WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users' AND COLUMN_NAME = 'total_questions_answered'
            """)
            row_col = cursor.fetchone()
            has_col = list(row_col.values())[0] if row_col else 0
            if not has_col:
                print("Adding total_questions_answered and total_correct_answers to users...")
                cursor.execute("""
                    ALTER TABLE users 
                    ADD COLUMN total_questions_answered INT NOT NULL DEFAULT 0 AFTER current_score,
                    ADD COLUMN total_correct_answers INT NOT NULL DEFAULT 0 AFTER total_questions_answered
                """)
            else:
                print("Columns total_questions_answered / total_correct_answers already exist.")

            # Check and add index
            cursor.execute("""
                SELECT COUNT(*) FROM information_schema.STATISTICS
                WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users' AND INDEX_NAME = 'idx_users_ranking'
            """)
            row_idx = cursor.fetchone()
            has_idx = list(row_idx.values())[0] if row_idx else 0
            if not has_idx:
                print("Adding index idx_users_ranking...")
                cursor.execute("""
                    ALTER TABLE users ADD INDEX idx_users_ranking (xp DESC, total_questions_answered DESC, streak_days DESC)
                """)
            else:
                print("Index idx_users_ranking already exists.")

            # Run backfill
            print("Running backfill from activity tables...")
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
            print(f"Backfilled {cursor.rowcount} users.")
            
    # Verify
    rows = db.fetch_all("""
        SELECT id, full_name, total_questions_answered, total_correct_answers
        FROM users
        WHERE role = 'student' AND approval_status = 'approved'
    """, use_cache=False)
    print("\nVerification of users question stats:")
    for r in rows:
        print(f"  User {r['full_name']}: total_q={r['total_questions_answered']}, total_c={r['total_correct_answers']}")
        
    print("\nMigration applied and verified successfully.")

if __name__ == "__main__":
    apply_migration("20260920_01_materialize_user_question_stats.sql")
