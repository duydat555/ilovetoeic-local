import logging
from datetime import date, datetime, timedelta
from typing import Any, Dict, List, Optional

from app.db import db
from app.notifications import create_notification
from app.security import normalize_date
from app.services.xp_service import award_daily_goal_xp, award_streak_milestone_xp

logger = logging.getLogger(__name__)


def record_study_activity(
    user_id: str,
    seconds_spent: int = 0,
    source: str = "practice",
    user_dict: Optional[Dict[str, Any]] = None,
) -> Dict[str, Any]:
    """Record study activity for a user:
    1. Accumulate daily study seconds in user_daily_study_time.
    2. Recalculate streak_days and longest_streak on users table.
    3. Update user_dict in-place if provided (e.g. current request session).

    Idempotent and safe: capped at 7200s per call to prevent abuse/overflow.
    """
    if not user_id or user_id == "guest":
        return {"success": False, "reason": "guest_user"}

    today = date.today()
    safe_seconds = max(0, min(int(seconds_spent or 0), 7200))

    try:
        # 1. Accumulate seconds in user_daily_study_time
        if safe_seconds > 0:
            db.execute(
                """
                INSERT INTO user_daily_study_time (user_id, study_date, total_seconds)
                VALUES (?, ?, ?)
                ON DUPLICATE KEY UPDATE total_seconds = total_seconds + VALUES(total_seconds)
                """,
                (user_id, today, safe_seconds),
            )

        # 2. Fetch current streak data for user
        user_row = db.fetch_one(
            "SELECT id, last_study_date, streak_days, longest_streak FROM users WHERE id = ?",
            (user_id,),
            use_cache=False,
        )
        if not user_row:
            return {"success": False, "reason": "user_not_found"}

        last_date = normalize_date(user_row.get("last_study_date"))
        current_streak = int(user_row.get("streak_days") or 0)
        longest = int(user_row.get("longest_streak") or 0)

        if last_date == today:
            streak = max(current_streak, 1)
        elif last_date == today - timedelta(days=1):
            streak = current_streak + 1
        else:
            streak = 1

        longest = max(longest, streak)

        # Update users table if streak or study date changed
        streak_changed = streak != current_streak
        if last_date != today or streak_changed or longest != int(user_row.get("longest_streak") or 0):
            db.execute(
                """
                UPDATE users
                SET streak_days = ?, longest_streak = ?, last_study_date = ?
                WHERE id = ?
                """,
                (streak, longest, today, user_id),
            )

        if streak_changed and streak in {3, 7, 14, 30, 60, 100, 200, 365}:
            create_notification(
                user_id,
                "achievement",
                f"Chuỗi học đạt {streak} ngày",
                "Bạn đã duy trì nhịp học đều đặn. Hoàn thành một hoạt động vào ngày mai để nối dài chuỗi.",
                action_url="/dashboard",
                dedupe_key=f"streak-milestone:{streak}",
            )
            award_streak_milestone_xp(user_id, streak)

        # Check daily goal achievement for bonus XP
        if safe_seconds > 0:
            goal_row = db.fetch_one(
                "SELECT daily_goal_minutes FROM user_study_goals WHERE user_id = ?",
                (user_id,),
                use_cache=False,
            )
            daily_goal = int((goal_row or {}).get("daily_goal_minutes") or 30)
            today_row = db.fetch_one(
                "SELECT total_seconds FROM user_daily_study_time WHERE user_id = ? AND study_date = ?",
                (user_id, today),
                use_cache=False,
            )
            if today_row and int(today_row.get("total_seconds") or 0) >= daily_goal * 60:
                award_daily_goal_xp(user_id, str(today))

        # Sync user_dict in memory if supplied
        if user_dict is not None and isinstance(user_dict, dict):
            user_dict["last_study_date"] = today
            user_dict["streak_days"] = streak
            user_dict["longest_streak"] = longest

        return {
            "success": True,
            "streak_days": streak,
            "longest_streak": longest,
            "study_date": str(today),
            "seconds_added": safe_seconds,
            "source": source,
        }
    except Exception as exc:
        logger.warning(f"Failed to record study activity for user {user_id}: {exc}")
        return {"success": False, "error": str(exc)}


def get_today_study_seconds(user_id: str) -> int:
    """Return total study seconds accumulated for today."""
    if not user_id or user_id == "guest":
        return 0
    today = date.today()
    row = db.fetch_one(
        "SELECT total_seconds FROM user_daily_study_time WHERE user_id = ? AND study_date = ?",
        (user_id, today),
        use_cache=False,
    )
    return int((row or {}).get("total_seconds") or 0)


def get_weekly_study_time(user_id: str) -> Dict[str, Any]:
    """Retrieve 7-day rolling study time with daily goals for charting."""
    today = date.today()
    start_date = today - timedelta(days=6)

    # 1. Fetch daily goal from user_study_goals or default to 30 minutes
    goal_row = db.fetch_one(
        "SELECT daily_goal_minutes FROM user_study_goals WHERE user_id = ?",
        (user_id,),
        use_cache=False,
    )
    daily_goal_minutes = int((goal_row or {}).get("daily_goal_minutes") or 30)

    # 2. Fetch recorded study time within last 7 days
    rows = db.fetch_all(
        """
        SELECT study_date, total_seconds
        FROM user_daily_study_time
        WHERE user_id = ? AND study_date >= ? AND study_date <= ?
        ORDER BY study_date ASC
        """,
        (user_id, start_date, today),
        use_cache=False,
    )
    records_by_date = {}
    for r in rows or []:
        d = normalize_date(r.get("study_date"))
        if d:
            records_by_date[str(d)] = int(r.get("total_seconds") or 0)

    # 3. Assemble complete 7 days sequence
    day_labels = ["T2", "T3", "T4", "T5", "T6", "T7", "CN"]  # Mon=0..Sun=6 in VN
    weekly_data: List[Dict[str, Any]] = []
    total_weekly_seconds = 0
    today_seconds = 0

    for i in range(7):
        current_day = start_date + timedelta(days=i)
        d_str = str(current_day)
        sec = records_by_date.get(d_str, 0)
        total_weekly_seconds += sec
        if current_day == today:
            today_seconds = sec

        minutes = round(sec / 60, 1)
        weekday_idx = current_day.weekday()  # Monday is 0, Sunday is 6
        day_label = day_labels[weekday_idx]

        weekly_data.append({
            "date": d_str,
            "dayOfWeek": day_label,
            "seconds": sec,
            "minutes": minutes,
            "goalMinutes": daily_goal_minutes,
            "isGoalReached": minutes >= daily_goal_minutes,
            "isToday": current_day == today,
        })

    return {
        "days": weekly_data,
        "dailyGoalMinutes": daily_goal_minutes,
        "todaySeconds": today_seconds,
        "todayMinutes": round(today_seconds / 60, 1),
        "weeklyTotalSeconds": total_weekly_seconds,
        "weeklyTotalMinutes": round(total_weekly_seconds / 60, 1),
    }


def update_daily_goal(user_id: str, daily_goal_minutes: int) -> int:
    """Update or insert daily study goal in minutes (bounded 5 - 360)."""
    bounded_minutes = max(5, min(int(daily_goal_minutes or 30), 360))
    db.execute(
        """
        INSERT INTO user_study_goals (user_id, daily_goal_minutes)
        VALUES (?, ?)
        ON DUPLICATE KEY UPDATE daily_goal_minutes = VALUES(daily_goal_minutes)
        """,
        (user_id, bounded_minutes),
    )
    return bounded_minutes


PART_METADATA = {
    1: {"name": "Part 1: Mô tả tranh", "short": "Part 1", "section": "listening", "tips": "Quan sát kỹ các chi tiết hành động và đồ vật trong tranh, tránh bẫy đồng âm."},
    2: {"name": "Part 2: Hỏi & Đáp", "short": "Part 2", "section": "listening", "tips": "Chú ý từ để hỏi (Who/Where/When/Why/How) và các câu trả lời gián tiếp."},
    3: {"name": "Part 3: Đoạn hội thoại", "short": "Part 3", "section": "listening", "tips": "Đọc trước câu hỏi và các lựa chọn trước khi audio phát để bắt keywords."},
    4: {"name": "Part 4: Bài nói ngắn", "short": "Part 4", "section": "listening", "tips": "Nắm bắt ngữ cảnh bài nói (thông báo sân bay, tin nhắn thoại, bản tin)."},
    5: {"name": "Part 5: Hoàn thành câu", "short": "Part 5", "section": "reading", "tips": "Phân loại câu hỏi ngữ pháp (từ loại, thì, mệnh đề) hay từ vựng để áp dụng mẹo giải nhanh."},
    6: {"name": "Part 6: Điền đoạn văn", "short": "Part 6", "section": "reading", "tips": "Đọc câu trước và sau chỗ trống để nắm liên kết ý và câu điền cả câu."},
    7: {"name": "Part 7: Đọc hiểu văn bản", "short": "Part 7", "section": "reading", "tips": "Rèn luyện kỹ năng Skimming & Scanning, chú ý các đoạn văn kép và ba."},
}


def get_user_skills_radar(user_id: str) -> Dict[str, Any]:
    """Calculates accuracy and mastery across TOEIC Parts 1-7 for Spider/Radar Chart."""
    import json

    # 1. Query user_question_activity (using idx_question_activity_user_part_date)
    rows = db.fetch_all(
        """
        SELECT part, COUNT(*) AS total_count, COALESCE(SUM(is_correct), 0) AS correct_count
        FROM user_question_activity
        WHERE user_id = ? AND part BETWEEN 1 AND 7
        GROUP BY part
        """,
        (user_id,),
        use_cache=False,
    )

    stats_by_part = {
        int(r["part"]): {"total": int(r["total_count"]), "correct": int(r["correct_count"])}
        for r in (rows or [])
    }

    # 2. If user_question_activity has few entries, complement from test_attempts metadata
    total_q_count = sum(s["total"] for s in stats_by_part.values())
    if total_q_count < 10:
        attempts = db.fetch_all(
            "SELECT metadata FROM test_attempts WHERE user_id = ? ORDER BY completed_at DESC LIMIT 10",
            (user_id,),
            use_cache=False,
        )
        for att in (attempts or []):
            raw_meta = att.get("metadata")
            if not raw_meta:
                continue
            meta = json.loads(raw_meta) if isinstance(raw_meta, str) else raw_meta
            for ps in meta.get("partStats", []):
                p = ps.get("part")
                if p and 1 <= p <= 7:
                    stats_by_part.setdefault(p, {"total": 0, "correct": 0})
                    stats_by_part[p]["total"] += int(ps.get("total") or 0)
                    stats_by_part[p]["correct"] += int(ps.get("correct") or 0)

    radar_data = []
    listening_correct = 0
    listening_total = 0
    reading_correct = 0
    reading_total = 0

    strongest = None
    weakest = None

    for part_num in range(1, 8):
        meta = PART_METADATA[part_num]
        p_stat = stats_by_part.get(part_num, {"total": 0, "correct": 0})
        total = p_stat["total"]
        correct = p_stat["correct"]
        accuracy = round((correct / total) * 100, 1) if total > 0 else 0.0

        if meta["section"] == "listening":
            listening_total += total
            listening_correct += correct
        else:
            reading_total += total
            reading_correct += correct

        mastery = "Chưa có dữ liệu"
        if total > 0:
            if accuracy >= 85:
                mastery = "Xuất sắc"
            elif accuracy >= 70:
                mastery = "Khá"
            elif accuracy >= 50:
                mastery = "Trung bình"
            else:
                mastery = "Cần cải thiện"

        item = {
            "part": f"Part {part_num}",
            "partNumber": part_num,
            "fullName": meta["name"],
            "section": meta["section"],
            "accuracy": accuracy,
            "target": 80,
            "totalAnswered": total,
            "totalCorrect": correct,
            "mastery": mastery,
            "tip": meta["tips"],
        }
        radar_data.append(item)

        if total >= 3:
            if strongest is None or accuracy > strongest["accuracy"]:
                strongest = item
            if weakest is None or accuracy < weakest["accuracy"]:
                weakest = item

    listening_acc = round((listening_correct / listening_total) * 100, 1) if listening_total > 0 else 0.0
    reading_acc = round((reading_correct / reading_total) * 100, 1) if reading_total > 0 else 0.0

    return {
        "radarData": radar_data,
        "listeningAccuracy": listening_acc,
        "readingAccuracy": reading_acc,
        "strongestPart": strongest,
        "weakestPart": weakest,
        "totalAnswered": listening_total + reading_total,
    }


def update_user_target_goal(
    user_id: str,
    target_score: Optional[int] = None,
    target_date: Optional[str] = None,
    daily_goal_minutes: Optional[int] = None,
) -> Dict[str, Any]:
    """Updates user_study_goals and syncs target_score/exam_date to users table."""
    user_row = db.fetch_one("SELECT target_score, exam_date FROM users WHERE id = ?", (user_id,), use_cache=False)
    current_target = int(user_row.get("target_score") or 750) if user_row else 750

    new_target = max(100, min(int(target_score or current_target), 990)) if target_score is not None else current_target
    new_date = target_date if target_date else None

    # Upsert user_study_goals
    db.execute(
        """
        INSERT INTO user_study_goals (user_id, target_score, target_date, daily_goal_minutes)
        VALUES (?, ?, ?, COALESCE(?, 30))
        ON DUPLICATE KEY UPDATE
            target_score = VALUES(target_score),
            target_date = COALESCE(VALUES(target_date), target_date),
            daily_goal_minutes = COALESCE(VALUES(daily_goal_minutes), daily_goal_minutes)
        """,
        (user_id, new_target, new_date, daily_goal_minutes),
    )

    # Sync to users table
    db.execute(
        """
        UPDATE users
        SET target_score = ?, exam_date = COALESCE(?, exam_date)
        WHERE id = ?
        """,
        (new_target, new_date, user_id),
    )

    return {
        "success": True,
        "targetScore": new_target,
        "targetDate": new_date,
    }


def get_ai_score_prediction(user_id: str) -> Dict[str, Any]:
    """Generates an AI-assisted TOEIC score prediction based on exam attempts, accuracy, and study pace."""
    user_row = db.fetch_one(
        "SELECT target_score, current_score, exam_date FROM users WHERE id = ?",
        (user_id,),
        use_cache=False,
    )
    goal_row = db.fetch_one(
        "SELECT target_score, target_date, daily_goal_minutes FROM user_study_goals WHERE user_id = ?",
        (user_id,),
        use_cache=False,
    )

    target_score = int((goal_row or {}).get("target_score") or (user_row or {}).get("target_score") or 750)
    current_score = int((user_row or {}).get("current_score") or 0)
    target_date_raw = (goal_row or {}).get("target_date") or (user_row or {}).get("exam_date")
    target_date_str = str(target_date_raw) if target_date_raw else None

    # Calculate days remaining
    days_remaining = None
    if target_date_raw:
        d = normalize_date(target_date_raw)
        if d:
            days_remaining = max(0, (d - date.today()).days)

    # Fetch skills radar to evaluate listening vs reading accuracy
    radar_info = get_user_skills_radar(user_id)
    listening_acc = radar_info["listeningAccuracy"]
    reading_acc = radar_info["readingAccuracy"]
    weakest = radar_info["weakestPart"]

    # Calculate predicted score
    if current_score > 0:
        baseline = current_score
        pred_listening = int((listening_acc / 100.0) * 495) if listening_acc > 0 else (baseline // 2)
        pred_reading = int((reading_acc / 100.0) * 495) if reading_acc > 0 else (baseline // 2)
        pred_total = max(baseline, min(990, (pred_listening + pred_reading) if (listening_acc > 0 and reading_acc > 0) else baseline))
    else:
        if listening_acc > 0 or reading_acc > 0:
            pred_listening = int((listening_acc / 100.0) * 495) if listening_acc > 0 else 250
            pred_reading = int((reading_acc / 100.0) * 495) if reading_acc > 0 else 250
            pred_total = min(990, max(100, pred_listening + pred_reading))
        else:
            pred_listening = 300
            pred_reading = 280
            pred_total = 580

    pred_listening = (pred_listening // 5) * 5
    pred_reading = (pred_reading // 5) * 5
    pred_total = (pred_total // 5) * 5

    pred_min = max(10, pred_total - 30)
    pred_max = min(990, pred_total + 35)

    score_gap = target_score - pred_total
    if score_gap <= 0:
        probability = 92
    elif days_remaining is not None:
        if days_remaining >= 30 and score_gap <= 80:
            probability = 82
        elif days_remaining >= 14 and score_gap <= 50:
            probability = 75
        elif days_remaining < 7 and score_gap > 50:
            probability = 35
        else:
            probability = max(20, min(80, int(100 - (score_gap * 0.6) + (days_remaining * 0.3))))
    else:
        probability = max(30, min(85, int(100 - score_gap * 0.5)))

    suggested_mins = 45 if score_gap > 50 else (30 if score_gap > 0 else 20)

    if score_gap <= 0:
        summary = f"Phong độ hiện tại ({pred_total} điểm) đã vượt mục tiêu {target_score}! Hãy tiếp tục luyện đề thực tế để làm quen áp lực phòng thi."
    else:
        weak_text = f", đặc biệt là {weakest['part']}" if weakest else ""
        days_text = f" trong {days_remaining} ngày tới" if days_remaining is not None else ""
        summary = f"Dự đoán phong độ hiện tại đạt ~{pred_total} điểm (khoảng {pred_min} - {pred_max}). Để cán mốc {target_score}{days_text}, hãy tập trung tối ưu phần còn yếu{weak_text} và duy trì {suggested_mins} phút học mỗi ngày."

    return {
        "predictedScore": pred_total,
        "predictedRange": [pred_min, pred_max],
        "predictedListening": pred_listening,
        "predictedReading": pred_reading,
        "targetScore": target_score,
        "targetDate": target_date_str,
        "daysRemaining": days_remaining,
        "probability": probability,
        "suggestedDailyMinutes": suggested_mins,
        "aiSummary": summary,
    }



