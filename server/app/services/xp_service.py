import logging
from typing import Any, Dict, List, Optional

from app.db import db
from app.notifications import create_notification
from app.services.cache_service import cache_service

logger = logging.getLogger(__name__)

LEVEL_CACHE_KEY = "system:level_definitions"
LEVEL_CACHE_TTL = 3600  # 1 hour


def get_level_definitions() -> List[Dict[str, Any]]:
    """Fetch all level definitions from cache or DB ordered by level ASC."""
    cached = cache_service.get(LEVEL_CACHE_KEY)
    if cached and isinstance(cached, list):
        return cached

    rows = db.fetch_all(
        "SELECT level, xp_required, title, badge_icon, color FROM level_definitions ORDER BY level ASC",
        use_cache=False,
    )
    if not rows:
        # Fallback in case table is empty
        fallback = [
            {"level": 1, "xp_required": 0, "title": "Tập sự TOEIC", "badge_icon": "sprout", "color": "emerald"},
            {"level": 2, "xp_required": 100, "title": "Khởi động TOEIC", "badge_icon": "footprints", "color": "teal"},
        ]
        return fallback

    cache_service.set(LEVEL_CACHE_KEY, rows, ttl_seconds=LEVEL_CACHE_TTL)
    return rows


def calculate_user_level(total_xp: int) -> Dict[str, Any]:
    """Calculate current level, next level threshold, progress percentage from total XP."""
    levels = get_level_definitions()
    safe_xp = max(0, int(total_xp or 0))

    current_level_info = levels[0]
    next_level_info = None

    for idx, lvl in enumerate(levels):
        if safe_xp >= lvl["xp_required"]:
            current_level_info = lvl
            next_level_info = levels[idx + 1] if idx + 1 < len(levels) else None
        else:
            break

    curr_req = current_level_info["xp_required"]
    if next_level_info:
        next_req = next_level_info["xp_required"]
        xp_in_level = safe_xp - curr_req
        needed_for_next = next_req - curr_req
        progress_pct = min(100, max(0, int((xp_in_level / needed_for_next) * 100)))
        remaining_xp = max(0, next_req - safe_xp)
    else:
        progress_pct = 100
        remaining_xp = 0

    return {
        "currentLevel": current_level_info["level"],
        "title": current_level_info["title"],
        "badgeIcon": current_level_info["badge_icon"],
        "color": current_level_info["color"],
        "currentXp": safe_xp,
        "currentLevelXp": curr_req,
        "nextLevel": next_level_info["level"] if next_level_info else None,
        "nextLevelXp": next_level_info["xp_required"] if next_level_info else None,
        "progressPercent": progress_pct,
        "xpRemaining": remaining_xp,
    }


def award_xp(
    user_id: str,
    xp_amount: int,
    activity_type: str,
    dedupe_key: str,
    description: Optional[str] = None,
) -> Dict[str, Any]:
    """Award XP through the ledger idempotently.
    - If dedupe_key already exists, no XP is awarded (prevents duplicate double-dipping).
    - If inserted, user's xp and level are atomically incremented and checked.
    """
    if not user_id or user_id == "guest":
        return {"awarded": False, "reason": "guest_user"}

    safe_xp = max(1, min(int(xp_amount or 0), 50000))

    try:
        # 1. Attempt idempotent insert into user_xp_ledger
        inserted = db.execute(
            """
            INSERT IGNORE INTO user_xp_ledger
            (user_id, xp_amount, activity_type, dedupe_key, description, created_at)
            VALUES (?, ?, ?, ?, ?, NOW())
            """,
            (user_id, safe_xp, activity_type, dedupe_key, description or activity_type),
        )

        if not inserted or inserted == 0:
            return {"awarded": False, "reason": "duplicate_event", "dedupe_key": dedupe_key}

        # 2. Increment user total XP
        db.execute(
            "UPDATE users SET xp = xp + ? WHERE id = ?",
            (safe_xp, user_id),
        )

        # 3. Check for level up
        user_row = db.fetch_one(
            "SELECT id, xp, level FROM users WHERE id = ?",
            (user_id,),
            use_cache=False,
        )
        if not user_row:
            return {"awarded": True, "xp_added": safe_xp}

        total_xp = int(user_row.get("xp") or 0)
        old_level = int(user_row.get("level") or 1)
        level_calc = calculate_user_level(total_xp)
        new_level = level_calc["currentLevel"]

        level_up = new_level > old_level
        if level_up:
            db.execute(
                "UPDATE users SET level = ? WHERE id = ?",
                (new_level, user_id),
            )
            create_notification(
                user_id=user_id,
                notification_type="achievement",
                title=f"Chúc mừng bạn đạt Cấp {new_level}: {level_calc['title']}!",
                message=f"Bạn đã mở khóa cấp độ mới! Tiếp tục duy trì phong độ để leo lên các danh hiệu cao hơn.",
                action_url="/dashboard",
                dedupe_key=f"level-up:{user_id}:{new_level}",
            )

        return {
            "awarded": True,
            "xp_added": safe_xp,
            "total_xp": total_xp,
            "level": new_level,
            "level_up": level_up,
            "level_info": level_calc,
        }
    except Exception as exc:
        logger.warning(f"Failed to award XP to user {user_id}: {exc}")
        return {"awarded": False, "error": str(exc)}


def award_practice_answer_xp(
    user_id: str,
    attempt_id: str,
    question_id: str,
    is_correct: bool,
) -> Dict[str, Any]:
    """+5 XP for correct answer, +1 XP for effort if incorrect."""
    xp = 5 if is_correct else 1
    desc = f"Trả lời {'đúng' if is_correct else 'chưa đúng'} câu hỏi luyện tập"
    return award_xp(
        user_id=user_id,
        xp_amount=xp,
        activity_type="practice_question",
        dedupe_key=f"xp:q:{attempt_id}:{question_id}",
        description=desc,
    )


def award_test_completion_xp(
    user_id: str,
    attempt_id: str,
    total_score: int,
    is_partial: bool,
    test_name: Optional[str] = None,
) -> Dict[str, Any]:
    """Full test: +100 XP + total_score//10 XP. Partial/practice: +30 XP."""
    if is_partial:
        xp = 30
        desc = f"Hoàn thành phần thi: {test_name or 'Bài luyện tập'}"
    else:
        bonus = max(0, int((total_score or 0) // 10))
        xp = 100 + bonus
        desc = f"Hoàn thành đề thi full: {test_name or 'Đề TOEIC'} (+{xp} XP)"

    return award_xp(
        user_id=user_id,
        xp_amount=xp,
        activity_type="test_completion",
        dedupe_key=f"xp:test:{attempt_id}",
        description=desc,
    )


def award_daily_goal_xp(user_id: str, study_date: str) -> Dict[str, Any]:
    """Award +25 XP when daily study time reaches the configured goal."""
    return award_xp(
        user_id=user_id,
        xp_amount=25,
        activity_type="daily_goal",
        dedupe_key=f"xp:daily_goal:{user_id}:{study_date}",
        description=f"Đạt mục tiêu học tập ngày {study_date}",
    )


def award_streak_milestone_xp(user_id: str, streak: int) -> Dict[str, Any]:
    """Award bonus XP at streak milestones."""
    milestones = {
        3: 50,
        7: 100,
        14: 200,
        30: 500,
        60: 1000,
        100: 2000,
        200: 3000,
        365: 5000,
    }
    xp = milestones.get(streak)
    if not xp:
        return {"awarded": False, "reason": "not_a_milestone"}

    return award_xp(
        user_id=user_id,
        xp_amount=xp,
        activity_type="streak_milestone",
        dedupe_key=f"xp:streak:{user_id}:{streak}",
        description=f"Đạt mốc chuỗi học {streak} ngày liên tiếp",
    )


def get_user_xp_history(user_id: str, limit: int = 20) -> List[Dict[str, Any]]:
    """Retrieve recent XP ledger transactions for audit / user display."""
    if not user_id or user_id == "guest":
        return []
    safe_limit = max(1, min(limit, 100))
    rows = db.fetch_all(
        """
        SELECT id, xp_amount, activity_type, description, created_at
        FROM user_xp_ledger
        WHERE user_id = ?
        ORDER BY id DESC
        LIMIT ?
        """,
        (user_id, safe_limit),
        use_cache=False,
    )
    return [
        {
            "id": r["id"],
            "xpAmount": r["xp_amount"],
            "activityType": r["activity_type"],
            "description": r["description"],
            "createdAt": str(r["created_at"]),
        }
        for r in (rows or [])
    ]
