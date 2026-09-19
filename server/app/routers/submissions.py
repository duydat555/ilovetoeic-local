import json
import uuid
from datetime import date, datetime, timedelta
from fastapi import APIRouter, HTTPException
from app.db import db
from app.models import TestSubmissionRequest, TestSubmissionResponse, QuestionResult
from app.notifications import create_notification
from app.services.study_progress_service import record_study_activity
from app.services.xp_service import award_test_completion_xp

router = APIRouter(prefix="/api/v1", tags=["Submissions"])

@router.post("/tests/{test_id}/submit", response_model=TestSubmissionResponse)
def submit_test(test_id: str, payload: TestSubmissionRequest):
    # Verify test exists and fetch metadata (fallback if not found in DB)
    test = db.fetch_one("SELECT id, name, year FROM tests WHERE id = ?", (test_id,))
    test_name = test.get("name") if test else "Test TOEIC"
    test_year = test.get("year") if test else None

    # Get questions (scoped if question_ids provided, otherwise entire test)
    if payload.question_ids:
        placeholders = ", ".join("?" for _ in payload.question_ids)
        questions = db.fetch_all(f"""
            SELECT id, question_number, part, section, correct_answer, explanation_vi, dich_nghia, tu_vung, dich_nghia_dap_an
            FROM questions
            WHERE id IN ({placeholders})
            ORDER BY question_number ASC
        """, tuple(payload.question_ids))
    else:
        questions = db.fetch_all("""
            SELECT id, question_number, part, section, correct_answer, explanation_vi, dich_nghia, tu_vung, dich_nghia_dap_an
            FROM questions
            WHERE test_id = ?
            ORDER BY question_number ASC
        """, (test_id,))

    user_answers_map = {}
    if payload.answers:
        for a in payload.answers:
            if a.question_id and a.selected_option:
                user_answers_map[a.question_id] = str(a.selected_option).strip().upper()

    listening_correct = 0
    reading_correct = 0
    total_listening_qs = 0
    total_reading_qs = 0
    results = []

    part_stats_map = {}

    for q in questions or []:
        q_id = q["id"]
        correct_ans = (q.get("correct_answer") or "").strip().upper()
        user_ans = user_answers_map.get(q_id)

        is_correct = (user_ans == correct_ans) if user_ans else False

        q_part = int(q.get("part") or 1)
        q_sec = (q.get("section") or "").lower()
        is_listening = q_sec == "listening" or q_part <= 4

        if is_listening:
            total_listening_qs += 1
            if is_correct:
                listening_correct += 1
        else:
            total_reading_qs += 1
            if is_correct:
                reading_correct += 1

        if q_part not in part_stats_map:
            part_stats_map[q_part] = {
                "part": q_part,
                "total": 0,
                "answered": 0,
                "correct": 0,
                "wrong": 0,
                "skipped": 0,
            }
        part_stats_map[q_part]["total"] += 1
        if not user_ans:
            part_stats_map[q_part]["skipped"] += 1
        elif is_correct:
            part_stats_map[q_part]["answered"] += 1
            part_stats_map[q_part]["correct"] += 1
        else:
            part_stats_map[q_part]["answered"] += 1
            part_stats_map[q_part]["wrong"] += 1

        results.append(QuestionResult(
            question_id=q_id,
            question_number=q.get("question_number") or 1,
            part=q_part,
            user_answer=user_ans,
            correct_answer=correct_ans,
            is_correct=is_correct,
            explanation_vi=q.get("explanation_vi"),
            dich_nghia=q.get("dich_nghia"),
            tu_vung=q.get("tu_vung")
        ))

    total_correct = listening_correct + reading_correct
    total_qs = len(questions) or 1
    accuracy_rate = round((total_correct / float(total_qs)) * 100, 2)
    selected_parts = sorted(list(part_stats_map.keys()))
    is_partial = total_qs < 200 or len(selected_parts) < 7

    # Calculate TOEIC scores using conversion table or proportional formula
    if not is_partial and total_listening_qs == 100 and total_reading_qs == 100:
        l_row = db.fetch_one("SELECT listening_score FROM toeic_score_conversion WHERE correct_count = ?", (listening_correct,))
        r_row = db.fetch_one("SELECT reading_score FROM toeic_score_conversion WHERE correct_count = ?", (reading_correct,))
        listening_score = int(l_row["listening_score"]) if l_row else int((listening_correct / 100.0) * 495)
        reading_score = int(r_row["reading_score"]) if r_row else int((reading_correct / 100.0) * 495)
        total_score = listening_score + reading_score
    else:
        listening_score = int((listening_correct / float(total_listening_qs or 100)) * 495) if listening_correct > 0 else 5
        reading_score = int((reading_correct / float(total_reading_qs or 100)) * 495) if reading_correct > 0 else 5
        total_score = (listening_score + reading_score) if not is_partial else 0

    attempt_id = str(uuid.uuid4())
    now_dt = datetime.now()

    # If submitted by an authenticated user, persist attempt and activities directly to database
    user_id = payload.user_id
    if user_id and user_id != "guest":
        user_row = db.fetch_one("SELECT id, last_study_date, streak_days, longest_streak FROM users WHERE id = ?", (user_id,))
        if user_row:
            metadata = {
                "test_name": test_name,
                "test_year": test_year,
                "is_partial": is_partial,
                "selected_parts": selected_parts,
                "part_breakdown": [
                    {"part": f"Part {p}", "correct": stats["correct"], "total": stats["total"]}
                    for p, stats in sorted(part_stats_map.items())
                ],
                "partStats": [part_stats_map[p] for p in sorted(part_stats_map.keys())],
            }

            db.execute("""
                INSERT INTO test_attempts (
                    id, user_id, test_id, mode, part, total_questions, answered_questions,
                    correct_answers, accuracy_rate, time_spent_seconds, listening_correct,
                    reading_correct, listening_score, reading_score, total_score, answers,
                    question_ids, metadata, completed_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                ON DUPLICATE KEY UPDATE
                    test_id = VALUES(test_id), mode = VALUES(mode), part = VALUES(part),
                    total_questions = VALUES(total_questions), answered_questions = VALUES(answered_questions),
                    correct_answers = VALUES(correct_answers), accuracy_rate = VALUES(accuracy_rate),
                    time_spent_seconds = VALUES(time_spent_seconds), listening_correct = VALUES(listening_correct),
                    reading_correct = VALUES(reading_correct), listening_score = VALUES(listening_score),
                    reading_score = VALUES(reading_score), total_score = VALUES(total_score),
                    answers = VALUES(answers), question_ids = VALUES(question_ids),
                    metadata = VALUES(metadata), completed_at = VALUES(completed_at)
            """, (
                attempt_id,
                user_id,
                test_id,
                payload.mode or "exam",
                selected_parts[0] if len(selected_parts) == 1 else None,
                len(questions),
                len(user_answers_map),
                total_correct,
                accuracy_rate,
                payload.time_spent_seconds or 0,
                listening_correct,
                reading_correct,
                listening_score,
                reading_score,
                total_score,
                json.dumps(user_answers_map, ensure_ascii=False),
                json.dumps([q["id"] for q in questions], ensure_ascii=False),
                json.dumps(metadata, ensure_ascii=False),
                now_dt,
            ))

            # Record question activity and wrong questions in batch
            activity_values = []
            wrong_values = []
            for q in questions:
                q_id = q["id"]
                u_ans = user_answers_map.get(q_id)
                if u_ans:
                    c_ans = (q.get("correct_answer") or "").strip().upper()
                    is_corr = 1 if u_ans == c_ans else 0
                    activity_values.append((
                        user_id, attempt_id, q_id, int(q.get("part") or 1),
                        u_ans, is_corr, now_dt
                    ))
                    if not is_corr:
                        wrong_values.append((
                            user_id, q_id, "test", test_id, int(q.get("part") or 1),
                            now_dt, now_dt
                        ))

            if activity_values:
                with db.transaction() as conn:
                    with conn.cursor() as cursor:
                        q_ids = [v[2] for v in activity_values]
                        q_placeholders = ", ".join("%s" for _ in q_ids)
                        cursor.execute(
                            f"""
                            SELECT question_id, is_correct
                            FROM user_question_activity
                            WHERE user_id = %s AND attempt_id = %s AND question_id IN ({q_placeholders})
                            """,
                            (user_id, attempt_id, *q_ids),
                        )
                        prev_rows = cursor.fetchall()
                        prev_map = {
                            list(r.values())[0]: bool(list(r.values())[1])
                            for r in prev_rows
                        } if prev_rows else {}

                        delta_answered = 0
                        delta_correct = 0
                        for v in activity_values:
                            qid = v[2]
                            is_c = v[5]
                            if qid not in prev_map:
                                delta_answered += 1
                                if is_c:
                                    delta_correct += 1
                            else:
                                prev_c = 1 if prev_map[qid] else 0
                                delta_correct += (is_c - prev_c)

                        cursor.executemany("""
                            INSERT INTO user_question_activity (
                                user_id, attempt_id, question_id, part, selected_answer, is_correct, answered_at
                            ) VALUES (%s, %s, %s, %s, %s, %s, %s)
                            ON DUPLICATE KEY UPDATE
                                selected_answer = VALUES(selected_answer),
                                is_correct = VALUES(is_correct),
                                answered_at = VALUES(answered_at)
                        """, activity_values)
                        if delta_answered or delta_correct:
                            cursor.execute(
                                """
                                UPDATE users
                                SET total_questions_answered = GREATEST(0, total_questions_answered + %s),
                                    total_correct_answers = GREATEST(0, total_correct_answers + %s)
                                WHERE id = %s
                                """,
                                (delta_answered, delta_correct, user_id),
                            )
                        if wrong_values:
                            cursor.executemany("""
                                INSERT INTO user_wrong_questions (
                                    user_id, question_id, source_type, test_id, part, first_wrong_at, last_wrong_at
                                ) VALUES (%s, %s, %s, %s, %s, %s, %s)
                                ON DUPLICATE KEY UPDATE
                                    wrong_count = wrong_count + 1,
                                    last_wrong_at = VALUES(last_wrong_at)
                            """, wrong_values)

            # Update streak and study time
            record_study_activity(
                user_id=user_id,
                seconds_spent=payload.time_spent_seconds or 0,
                source="full_test_submission",
            )

            score_row = db.fetch_one("""
                SELECT COALESCE(MAX(total_score), 0) AS best_score
                FROM test_attempts
                WHERE user_id = ?
                  AND mode = 'exam'
                  AND total_questions = 200
                  AND answered_questions = 200
                  AND part IS NULL
                  AND COALESCE(JSON_UNQUOTE(JSON_EXTRACT(metadata, '$.is_partial')), 'false') <> 'true'
            """, (user_id,), use_cache=False)
            new_score = int((score_row or {}).get("best_score") or 0)

            db.execute("""
                UPDATE users
                SET current_score = ?
                WHERE id = ?
            """, (new_score, user_id))

            create_notification(
                user_id,
                "achievement",
                "Đã hoàn thành đề thi",
                f"{test_name}: đúng {total_correct}/{len(questions)} câu, độ chính xác {round(accuracy_rate)}%.",
                action_url=f"/results?attemptId={attempt_id}",
                dedupe_key=f"study-attempt:{attempt_id}",
            )

            award_test_completion_xp(
                user_id=user_id,
                attempt_id=attempt_id,
                total_score=total_score,
                is_partial=is_partial,
                test_name=test_name,
            )

    return TestSubmissionResponse(
        attempt_id=attempt_id,
        test_id=test_id,
        test_name=test_name,
        test_year=test_year,
        listening_correct=listening_correct,
        reading_correct=reading_correct,
        total_correct=total_correct,
        listening_score=listening_score,
        reading_score=reading_score,
        total_score=total_score,
        results=results
    )
