import sys
import io
if sys.platform == "win32":
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8")
from app.db import db

def val(query, args=None):
    row = db.fetch_one(query, args, use_cache=False)
    if not row:
        return 0
    return list(row.values())[0]

def main():
    print("=== AUDIT RANKING OVERLAP ===")
    
    # 1. Row counts
    uqa_count = val("SELECT COUNT(*) FROM user_question_activity")
    ugqa_count = val("SELECT COUNT(*) FROM user_grammar_question_activity")
    ta_count = val("SELECT COUNT(*) FROM test_attempts")
    users_count = val("SELECT COUNT(*) FROM users WHERE role = 'student' AND approval_status = 'approved'")
    
    print(f"user_question_activity: {uqa_count}")
    print(f"user_grammar_question_activity: {ugqa_count}")
    print(f"test_attempts: {ta_count}")
    print(f"Active approved students: {users_count}")
    
    # 2. test_attempts with matching uqa vs without
    ta_with_uqa = val("""
        SELECT COUNT(*) FROM test_attempts ta
        WHERE EXISTS (SELECT 1 FROM user_question_activity uqa WHERE uqa.attempt_id = ta.id)
    """)
    ta_without_uqa = val("""
        SELECT COUNT(*) FROM test_attempts ta
        WHERE NOT EXISTS (SELECT 1 FROM user_question_activity uqa WHERE uqa.attempt_id = ta.id)
    """)
    print(f"test_attempts WITH matching uqa attempt_id: {ta_with_uqa}")
    print(f"test_attempts WITHOUT matching uqa attempt_id: {ta_without_uqa}")
    
    # 3. Check modes and metadata of test_attempts without uqa
    modes_without_uqa = db.fetch_all("""
        SELECT mode, COUNT(*) as cnt, COALESCE(SUM(answered_questions), 0) as total_answered, COALESCE(SUM(correct_answers), 0) as total_correct
        FROM test_attempts ta
        WHERE NOT EXISTS (SELECT 1 FROM user_question_activity uqa WHERE uqa.attempt_id = ta.id)
        GROUP BY mode
    """, use_cache=False)
    print("\ntest_attempts WITHOUT uqa grouped by mode:")
    for row in modes_without_uqa:
        print(f"  mode='{row['mode']}': {row['cnt']} attempts, answered={row['total_answered']}, correct={row['total_correct']}")
        
    # 4. Check if uqa has NULL or empty attempt_id
    uqa_null_attempt = val("SELECT COUNT(*) FROM user_question_activity WHERE attempt_id IS NULL OR attempt_id = ''")
    print(f"\nuqa with null/empty attempt_id: {uqa_null_attempt}")
    
    # 5. Check if grammar attempts ever touch test_attempts
    grammar_in_ta = val("""
        SELECT COUNT(*) FROM test_attempts
        WHERE JSON_UNQUOTE(JSON_EXTRACT(metadata, '$.source')) = 'grammar'
           OR mode = 'grammar'
    """)
    print(f"Grammar attempts in test_attempts: {grammar_in_ta}")
    
    # 6. Sample of test_attempts with matching uqa
    sample_matching = db.fetch_all("""
        SELECT ta.id, ta.user_id, ta.mode, ta.answered_questions, ta.correct_answers,
               COUNT(*) as uqa_count, SUM(uqa.is_correct) as uqa_correct
        FROM test_attempts ta
        JOIN user_question_activity uqa ON uqa.attempt_id = ta.id
        GROUP BY ta.id, ta.user_id, ta.mode, ta.answered_questions, ta.correct_answers
        LIMIT 5
    """, use_cache=False)
    print("\nSample test_attempts matched with uqa:")
    for s in sample_matching:
        print(f"  attempt {s['id'][:8]}... mode={s['mode']}: ta_answered={s['answered_questions']}, uqa_count={s['uqa_count']}, ta_corr={s['correct_answers']}, uqa_corr={s['uqa_correct']}")
        
    # 7. Check if any user has difference between formulas
    # Formula Old (ranking.py current WITH NOT EXISTS):
    comparison = db.fetch_all("""
        WITH answer_events_old AS (
            SELECT user_id, COUNT(*) AS question_count, SUM(is_correct) AS correct_count
            FROM user_question_activity GROUP BY user_id
            UNION ALL
            SELECT user_id, COUNT(*) AS question_count, SUM(is_correct) AS correct_count
            FROM user_grammar_question_activity GROUP BY user_id
            UNION ALL
            SELECT ta.user_id, SUM(ta.answered_questions), SUM(ta.correct_answers)
            FROM test_attempts ta
            WHERE NOT EXISTS (
                SELECT 1 FROM user_question_activity uqa
                WHERE uqa.user_id = ta.user_id AND uqa.attempt_id = ta.id
            )
            GROUP BY ta.user_id
        ), old_totals AS (
            SELECT user_id, SUM(question_count) AS total_q, SUM(correct_count) AS total_c
            FROM answer_events_old GROUP BY user_id
        ), answer_events_naive_union AS (
            -- If someone did UNION ALL without WHERE NOT EXISTS
            SELECT user_id, COUNT(*) AS question_count, SUM(is_correct) AS correct_count
            FROM user_question_activity GROUP BY user_id
            UNION ALL
            SELECT user_id, COUNT(*) AS question_count, SUM(is_correct) AS correct_count
            FROM user_grammar_question_activity GROUP BY user_id
            UNION ALL
            SELECT ta.user_id, SUM(ta.answered_questions), SUM(ta.correct_answers)
            FROM test_attempts ta
            GROUP BY ta.user_id
        ), naive_totals AS (
            SELECT user_id, SUM(question_count) AS total_q, SUM(correct_count) AS total_c
            FROM answer_events_naive_union GROUP BY user_id
        ), pure_activity_totals AS (
            -- Only uqa + ugqa
            SELECT user_id, COUNT(*) AS total_q, SUM(is_correct) AS total_c
            FROM (
                SELECT user_id, is_correct FROM user_question_activity
                UNION ALL
                SELECT user_id, is_correct FROM user_grammar_question_activity
            ) combined GROUP BY user_id
        )
        SELECT u.id, u.full_name,
               COALESCE(o.total_q, 0) as old_with_not_exists_q,
               COALESCE(n.total_q, 0) as naive_without_not_exists_q,
               COALESCE(p.total_q, 0) as pure_activity_q,
               COALESCE(o.total_q, 0) - COALESCE(p.total_q, 0) as legacy_ta_q
        FROM users u
        LEFT JOIN old_totals o ON o.user_id = u.id
        LEFT JOIN naive_totals n ON n.user_id = u.id
        LEFT JOIN pure_activity_totals p ON p.user_id = u.id
        WHERE u.role = 'student' AND u.approval_status = 'approved'
          AND (COALESCE(o.total_q, 0) > 0 OR COALESCE(n.total_q, 0) > 0)
        ORDER BY o.total_q DESC
        LIMIT 10
    """, use_cache=False)
    
    print("\nTop 10 users comparison across formulas:")
    for c in comparison:
        print(f"  User {c['full_name'][:20]}: Current ranking.py={c['old_with_not_exists_q']} | Naive Union (without NOT EXISTS)={c['naive_without_not_exists_q']} | Pure activity (uqa+ugqa)={c['pure_activity_q']} | Legacy ta={c['legacy_ta_q']}")

if __name__ == "__main__":
    main()
