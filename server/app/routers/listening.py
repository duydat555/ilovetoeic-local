import json
import math
import random
import re
import time
from typing import Any, Dict, List, Optional
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, Query, Response
from pydantic import BaseModel, Field

from app.db import db
from app.security import get_current_user, get_optional_current_user


router = APIRouter(prefix="/api/v1/listening", tags=["Listening Practice"])

# Scoped in-memory cache for categories to prevent DB load
_CATEGORIES_CACHE: Dict[str, Any] = {"data": None, "timestamp": 0}
CATEGORIES_CACHE_TTL = 300  # 5 minutes


class ProgressUpdateRequest(BaseModel):
    set_id: str
    mode: str = "dictation"
    sentence_id: str
    sentence_index: int = 0
    completed: bool = True
    score: int = 10
    hint_count: int = 0


class SaveNoteRequest(BaseModel):
    sentence_id: Optional[str] = None
    word: str = Field(min_length=1, max_length=200)
    note: str = Field(min_length=1, max_length=1000)


def check_is_pro_user(user: Optional[Dict[str, Any]]) -> bool:
    # Hệ thống mở khóa toàn bộ tính năng cho mọi người dùng
    return True


@router.get("/categories")
def get_listening_categories(response: Response):
    """Lấy danh sách các category luyện nghe động từ DB."""
    now = time.time()
    if _CATEGORIES_CACHE["data"] and (now - _CATEGORIES_CACHE["timestamp"] < CATEGORIES_CACHE_TTL):
        response.headers["Cache-Control"] = "public, max-age=180, stale-while-revalidate=300"
        return _CATEGORIES_CACHE["data"]

    categories = db.fetch_all("""
        SELECT c.id, c.name, c.description, c.icon, c.order_index,
               COUNT(s.id) AS set_count
        FROM listening_categories c
        LEFT JOIN listening_sets s ON s.category_id = c.id
        GROUP BY c.id, c.name, c.description, c.icon, c.order_index
        ORDER BY c.order_index ASC
    """)

    # Tổng số bộ đề cho category "all"
    total_sets = db.fetch_one("SELECT COUNT(*) AS total FROM listening_sets")
    total_count = int(total_sets["total"]) if total_sets else 0

    for cat in categories:
        if cat["id"] == "all":
            cat["set_count"] = total_count
        else:
            cat["set_count"] = int(cat.get("set_count") or 0)

    result = {
        "success": True,
        "categories": categories,
    }
    _CATEGORIES_CACHE["data"] = result
    _CATEGORIES_CACHE["timestamp"] = now
    return result


@router.get("/tests-summary")
def get_listening_tests_summary(
    year: int = Query(2026),
    user: Optional[Dict[str, Any]] = Depends(get_optional_current_user),
):
    """
    Lấy danh sách 10 đề thi ETS của năm (mặc định 2026) kèm thống kê số bài,
    số câu, phân bổ theo Part, và tiến độ hoàn thành của người dùng.
    """
    user_id = user["id"] if user else None
    category_id = f"ets-{year}"

    sql = """
        SELECT 
            CAST(SUBSTRING_INDEX(SUBSTRING_INDEX(s.id, '-t', -1), '-', 1) AS UNSIGNED) AS test_number,
            COUNT(s.id) AS set_count,
            COALESCE(SUM(s.sentence_count), 0) AS sentence_count,
            SUM(CASE WHEN s.part = 'Part 1' THEN 1 ELSE 0 END) AS part1_count,
            SUM(CASE WHEN s.part = 'Part 2' THEN 1 ELSE 0 END) AS part2_count,
            SUM(CASE WHEN s.part = 'Part 3' THEN 1 ELSE 0 END) AS part3_count,
            SUM(CASE WHEN s.part = 'Part 4' THEN 1 ELSE 0 END) AS part4_count,
            COUNT(CASE WHEN p.completion_rate >= 100 THEN 1 END) AS completed_sets,
            ROUND(AVG(COALESCE(p.completion_rate, 0)), 1) AS completion_rate
        FROM listening_sets s
        LEFT JOIN user_listening_progress p 
            ON p.set_id = s.id AND p.user_id = ? AND p.mode = 'dictation'
        WHERE s.category_id = ?
        GROUP BY test_number
        ORDER BY test_number ASC
    """
    rows = db.fetch_all(sql, (user_id or "ANONYMOUS_USER", category_id), use_cache=False)

    tests = []
    for r in rows:
        test_num = int(r["test_number"])
        tests.append({
            "testNumber": test_num,
            "title": f"Test {test_num}",
            "year": year,
            "setCount": int(r["set_count"]),
            "sentenceCount": int(r["sentence_count"]),
            "partCounts": {
                "part1": int(r["part1_count"]),
                "part2": int(r["part2_count"]),
                "part3": int(r["part3_count"]),
                "part4": int(r["part4_count"]),
            },
            "completedSets": int(r["completed_sets"]),
            "completionRate": float(r["completion_rate"] or 0.0),
        })

    return {
        "success": True,
        "year": year,
        "tests": tests,
    }


@router.get("/sets")
def get_listening_sets(
    view_mode: str = Query("study", pattern="^(study|difficulty|needs_review|progress)$"),
    category_id: Optional[str] = Query(None),
    test_number: Optional[int] = Query(None),
    part: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    uncompleted_only: bool = Query(False),
    page: int = Query(1, ge=1),
    page_size: int = Query(12, ge=1, le=100),
    user: Optional[Dict[str, Any]] = Depends(get_optional_current_user),
):
    """
    Lấy danh sách các bộ đề luyện nghe theo bộ lọc, chế độ xem và tiến độ của học viên (có phân trang).
    """
    user_id = user["id"] if user else None

    # Base WHERE clauses
    where_clauses = ["1=1"]
    where_params: List[Any] = []

    # Filter category
    if category_id and category_id != "all":
        if category_id == "part1-photographs":
            where_clauses.append("(s.category_id = ? OR s.part = 'Part 1')")
            where_params.append(category_id)
        elif category_id == "part2-q-and-a":
            where_clauses.append("(s.category_id = ? OR s.part = 'Part 2')")
            where_params.append(category_id)
        elif category_id == "part3-conversations":
            where_clauses.append("(s.category_id = ? OR s.part = 'Part 3')")
            where_params.append(category_id)
        elif category_id == "part4-talks":
            where_clauses.append("(s.category_id = ? OR s.part = 'Part 4')")
            where_params.append(category_id)
        else:
            where_clauses.append("s.category_id = ?")
            where_params.append(category_id)

    # Filter test number (e.g. Test 1 to Test 10)
    if test_number is not None:
        where_clauses.append("s.id LIKE ?")
        where_params.append(f"set-%-t{test_number}-%")

    # Filter part (Part 1, Part 2, Part 3, Part 4)
    if part and part != "all":
        where_clauses.append("s.part = ?")
        where_params.append(part)

    # Filter search
    if search and search.strip():
        term = f"%{search.strip()}%"
        where_clauses.append("(s.title LIKE ? OR s.description LIKE ?)")
        where_params.extend([term, term])

    # Filter uncompleted_only
    if uncompleted_only:
        where_clauses.append("(p.completion_rate IS NULL OR p.completion_rate < 100)")

    # Filter by view mode
    if view_mode == "needs_review":
        if user_id:
            where_clauses.append("(p.completion_rate > 0 AND (p.completion_rate < 100 OR p.last_studied_at < DATE_SUB(NOW(), INTERVAL 3 DAY)))")
        else:
            where_clauses.append("s.difficulty IN ('medium', 'hard')")

    where_sql = " AND ".join(where_clauses)
    base_join = """
        FROM listening_sets s
        JOIN listening_categories c ON c.id = s.category_id
        LEFT JOIN user_listening_progress p 
          ON p.set_id = s.id AND p.user_id = ? AND p.mode = 'dictation'
    """
    count_params = [user_id or "ANONYMOUS_USER"] + where_params

    # 1. Count query for total matched items
    count_sql = f"SELECT COUNT(*) AS total {base_join} WHERE {where_sql}"
    total_row = db.fetch_one(count_sql, tuple(count_params))
    total_count = int(total_row["total"]) if total_row else 0

    # 2. Sorting
    if view_mode == "difficulty":
        order_sql = " ORDER BY s.difficulty_level ASC, s.order_index ASC"
    elif view_mode == "progress":
        order_sql = " ORDER BY COALESCE(p.completion_rate, 0) DESC, s.order_index ASC"
    elif view_mode == "needs_review":
        order_sql = " ORDER BY COALESCE(p.completion_rate, 0) ASC, p.last_studied_at ASC, s.order_index ASC"
    else:  # 'study' default
        order_sql = " ORDER BY s.order_index ASC, s.created_at DESC"

    # 3. Data query with LIMIT and OFFSET
    offset = (page - 1) * page_size
    data_sql = f"""
        SELECT s.id, s.category_id, s.title, s.description, s.part, s.difficulty,
               s.difficulty_level, s.audio_url,
               s.is_pro, s.has_video, s.video_source_type, s.cover_image,
               s.sentence_count, s.order_index, s.created_at,
               c.name AS category_name,
               COALESCE(p.completion_rate, 0) AS completion_rate,
               COALESCE(p.current_sentence_index, 0) AS last_sentence_index,
               p.total_score,
               p.last_studied_at,
               CASE
                   WHEN p.completion_rate >= 100 THEN 'completed'
                   WHEN p.completion_rate > 0 THEN 'in_progress'
                   ELSE 'not_started'
               END AS progress_status,
               CASE 
                   WHEN p.notes IS NOT NULL THEN JSON_LENGTH(p.notes)
                   ELSE 0
               END AS notes_count
        {base_join}
        WHERE {where_sql}
        {order_sql}
        LIMIT ? OFFSET ?
    """
    data_params = [user_id or "ANONYMOUS_USER"] + where_params + [page_size, offset]
    sets = db.fetch_all(data_sql, tuple(data_params))

    # Format output
    formatted = []
    for row in sets:
        formatted.append({
            "id": row["id"],
            "categoryId": row["category_id"],
            "categoryName": row["category_name"],
            "title": row["title"],
            "description": row["description"] or "",
            "part": row["part"],
            "difficulty": row["difficulty"],
            "difficultyLevel": int(row.get("difficulty_level") or 3),
            "audioUrl": row.get("audio_url") or "",
            "isPro": False,
            "isLocked": False,
            "hasVideo": bool(row["has_video"]),
            "videoSourceType": row["video_source_type"],
            "coverImage": row["cover_image"] or "",
            "sentenceCount": int(row["sentence_count"]),
            "orderIndex": int(row["order_index"]),
            "completionRate": round(float(row.get("completion_rate") or 0), 1),
            "lastSentenceIndex": int(row.get("last_sentence_index") or 0),
            "progressStatus": row.get("progress_status") or "not_started",
            "notesCount": int(row.get("notes_count") or 0),
            "lastStudiedAt": row["last_studied_at"].isoformat() if isinstance(row.get("last_studied_at"), datetime) else str(row.get("last_studied_at") or "") or None,
        })

    total_pages = math.ceil(total_count / page_size) if page_size > 0 else 1
    total_pages = max(1, total_pages)

    return {
        "success": True,
        "viewMode": view_mode,
        "total": total_count,
        "page": page,
        "pageSize": page_size,
        "totalPages": total_pages,
        "sets": formatted,
    }


@router.get("/mix-random")
def get_mix_random(
    count: int = Query(6, ge=2, le=20),
    video_ratio: float = Query(0.5, ge=0.0, le=1.0),
    exclude_ids: Optional[str] = Query(None),
    user: Optional[Dict[str, Any]] = Depends(get_optional_current_user),
):
    """
    Tạo tổ hợp bộ đề ngẫu nhiên theo tỉ lệ video/audio cấu hình được và hỗ trợ đổi bộ khác không lặp.
    """
    exclude_list = [x.strip() for x in exclude_ids.split(",") if x.strip()] if exclude_ids else []
    
    target_video = int(round(count * video_ratio))
    target_audio = count - target_video

    is_pro = check_is_pro_user(user)

    def fetch_pool(has_video: int, limit: int, exclude: List[str]):
        query = """
            SELECT s.id, s.category_id, s.title, s.description, s.part, s.difficulty,
                   s.difficulty_level, s.audio_url,
                   s.is_pro, s.has_video, s.video_source_type, s.cover_image,
                   s.sentence_count, s.order_index, c.name AS category_name
            FROM listening_sets s
            JOIN listening_categories c ON c.id = s.category_id
            WHERE s.has_video = ?
        """
        p: List[Any] = [has_video]
        if exclude:
            placeholders = ",".join(["?"] * len(exclude))
            query += f" AND s.id NOT IN ({placeholders})"
            p.extend(exclude)
        query += " ORDER BY RAND() LIMIT ?"
        p.append(limit)
        return db.fetch_all(query, tuple(p))

    # Try to fetch with exclusion first
    video_sets = fetch_pool(1, target_video, exclude_list)
    audio_sets = fetch_pool(0, target_audio, exclude_list)

    # If not enough due to exclusion, fallback without exclusion to fill quota
    if len(video_sets) < target_video:
        extra_v = fetch_pool(1, target_video - len(video_sets), [s["id"] for s in video_sets])
        video_sets.extend(extra_v)

    if len(audio_sets) < target_audio:
        extra_a = fetch_pool(0, target_audio - len(audio_sets), [s["id"] for s in audio_sets])
        audio_sets.extend(extra_a)

    combined = video_sets + audio_sets
    random.shuffle(combined)

    formatted = []
    for row in combined:
        formatted.append({
            "id": row["id"],
            "categoryId": row["category_id"],
            "categoryName": row["category_name"],
            "title": row["title"],
            "description": row["description"] or "",
            "part": row["part"],
            "difficulty": row["difficulty"],
            "difficultyLevel": int(row.get("difficulty_level") or 3),
            "audioUrl": row.get("audio_url") or "",
            "isPro": False,
            "isLocked": False,
            "hasVideo": bool(row["has_video"]),
            "videoSourceType": row["video_source_type"],
            "coverImage": row["cover_image"] or "",
            "sentenceCount": int(row["sentence_count"]),
            "orderIndex": int(row["order_index"]),
            "completionRate": 0,
            "progressStatus": "not_started",
        })

    return {
        "success": True,
        "total": len(formatted),
        "videoCount": len([s for s in formatted if s["hasVideo"]]),
        "audioCount": len([s for s in formatted if not s["hasVideo"]]),
        "sets": formatted,
    }


@router.get("/sets/{set_id}")
def get_listening_set_detail(
    set_id: str,
    user: Optional[Dict[str, Any]] = Depends(get_optional_current_user),
):
    """
    Lấy thông tin chi tiết bộ đề và danh sách toàn bộ các câu trong bộ đề.
    Kiểm tra quyền truy cập Pro nếu bộ đề là Pro-only.
    """
    set_data = db.fetch_one("""
        SELECT s.*, c.name AS category_name
        FROM listening_sets s
        JOIN listening_categories c ON c.id = s.category_id
        WHERE s.id = ?
    """, (set_id,))

    if not set_data:
        raise HTTPException(status_code=404, detail="Không tìm thấy bộ đề luyện nghe này.")

    # Lấy danh sách câu
    sentences_raw = db.fetch_all("""
        SELECT id, order_index, group_index, audio_url, image_url, video_url, start_time, end_time,
               text, words, words_to_fill, translation_vi, phonetic_us, distractors, check_options
        FROM listening_sentences
        WHERE set_id = ?
        ORDER BY order_index ASC
    """, (set_id,))

    sentences = []
    for s in sentences_raw:
        words_fill = json.loads(s["words_to_fill"]) if isinstance(s["words_to_fill"], str) else (s["words_to_fill"] or [])
        word_timestamps = json.loads(s["words"]) if isinstance(s.get("words"), str) else (s.get("words") or [])
        distractors = json.loads(s["distractors"]) if isinstance(s["distractors"], str) else (s["distractors"] or [])
        check_opts = json.loads(s["check_options"]) if isinstance(s["check_options"], str) else (s["check_options"] or {})

        # Defensive sanitize of option letter prefix from text and words
        raw_text = s["text"] or ""
        clean_text = re.sub(r'^(?:\([A-D]\)|\[[A-D]\]|[A-D][\.\:\)])\s*', '', raw_text, flags=re.IGNORECASE).strip()

        clean_words = word_timestamps
        if clean_words and re.match(r'^(?:\([A-D]\)|\[[A-D]\]|[A-D][\.\:\)]?)$', clean_words[0].get("word", "").strip(), re.IGNORECASE):
            clean_words = clean_words[1:]

        if check_opts and "display_text" in check_opts:
            check_opts["display_text"] = re.sub(r'^(?:\([A-D]\)|\[[A-D]\]|[A-D][\.\:\)])\s*', '', check_opts["display_text"], flags=re.IGNORECASE).strip()

        sentences.append({
            "id": s["id"],
            "orderIndex": int(s["order_index"]),
            "groupIndex": int(s.get("group_index") or 1),
            "audioUrl": s.get("audio_url") or set_data.get("audio_url") or "",
            "imageUrl": s.get("image_url") or set_data.get("cover_image") or "",
            "videoUrl": s["video_url"],
            "startTime": float(s.get("start_time") or 0.0),
            "endTime": float(s["end_time"]) if s.get("end_time") is not None else None,
            "text": clean_text,
            "words": clean_words,
            "wordsToFill": words_fill,
            "translationVi": s["translation_vi"],
            "phoneticUs": s.get("phonetic_us") or "",
            "distractors": distractors,
            "checkOptions": check_opts,
        })

    # Lấy tiến độ của user nếu đã đăng nhập
    user_progress = {}
    if user:
        progress_rows = db.fetch_all("""
            SELECT mode, current_sentence_index, completed_sentences, sentence_scores,
                   completion_rate, total_score, total_hints_used, notes, last_studied_at
            FROM user_listening_progress
            WHERE user_id = ? AND set_id = ?
        """, (user["id"], set_id))

        for p in progress_rows:
            completed = json.loads(p["completed_sentences"]) if isinstance(p["completed_sentences"], str) else (p["completed_sentences"] or [])
            scores = json.loads(p["sentence_scores"]) if isinstance(p["sentence_scores"], str) else (p["sentence_scores"] or {})
            notes = json.loads(p["notes"]) if isinstance(p["notes"], str) else (p["notes"] or [])

            user_progress[p["mode"]] = {
                "currentSentenceIndex": int(p["current_sentence_index"]),
                "completedSentences": completed,
                "sentenceScores": scores,
                "completionRate": round(float(p["completion_rate"]), 1),
                "totalScore": int(p["total_score"]),
                "totalHintsUsed": int(p["total_hints_used"]),
                "notes": notes,
                "lastStudiedAt": p["last_studied_at"].isoformat() if isinstance(p["last_studied_at"], datetime) else str(p["last_studied_at"]),
            }

    return {
        "success": True,
        "set": {
            "id": set_data["id"],
            "categoryId": set_data["category_id"],
            "categoryName": set_data["category_name"],
            "title": set_data["title"],
            "description": set_data["description"] or "",
            "part": set_data["part"],
            "difficulty": set_data["difficulty"],
            "difficultyLevel": int(set_data.get("difficulty_level") or 3),
            "audioUrl": set_data.get("audio_url") or "",
            "isPro": False,
            "hasVideo": bool(set_data["has_video"]),
            "videoSourceType": set_data["video_source_type"],
            "coverImage": set_data["cover_image"] or "",
            "sentenceCount": len(sentences),
        },
        "sentences": sentences,
        "progress": user_progress,
    }


@router.post("/progress")
def update_listening_progress(
    payload: ProgressUpdateRequest,
    user: Dict[str, Any] = Depends(get_current_user),
):
    """
    Cập nhật tiến độ hoàn thành câu cho từng chế độ luyện tập.
    """
    user_id = user["id"]

    # Lấy tổng số câu của bộ đề
    set_row = db.fetch_one("SELECT sentence_count FROM listening_sets WHERE id = ?", (payload.set_id,))
    if not set_row:
        raise HTTPException(status_code=404, detail="Không tìm thấy bộ đề.")
    total_sentences = max(1, int(set_row["sentence_count"]))

    # Lấy tiến độ hiện tại
    existing = db.fetch_one("""
        SELECT id, completed_sentences, sentence_scores, total_score, total_hints_used
        FROM user_listening_progress
        WHERE user_id = ? AND set_id = ? AND mode = ?
    """, (user_id, payload.set_id, payload.mode))

    if existing:
        completed_list = json.loads(existing["completed_sentences"]) if isinstance(existing["completed_sentences"], str) else (existing["completed_sentences"] or [])
        scores_map = json.loads(existing["sentence_scores"]) if isinstance(existing["sentence_scores"], str) else (existing["sentence_scores"] or {})
        total_score = int(existing.get("total_score") or 0)
        total_hints = int(existing.get("total_hints_used") or 0)
    else:
        completed_list = []
        scores_map = {}
        total_score = 0
        total_hints = 0

    if payload.completed:
        if payload.sentence_id not in completed_list:
            completed_list.append(payload.sentence_id)
        scores_map[payload.sentence_id] = {
            "score": payload.score,
            "hints": payload.hint_count,
            "completedAt": datetime.utcnow().isoformat(),
        }
        total_score += payload.score
        total_hints += payload.hint_count
    else:
        # Reset / Xoá làm lại: gỡ câu khỏi danh sách đã hoàn thành
        if payload.sentence_id in completed_list:
            completed_list.remove(payload.sentence_id)
        prev_data = scores_map.pop(payload.sentence_id, None)
        if prev_data:
            total_score = max(0, total_score - int(prev_data.get("score", 0)))
            total_hints = max(0, total_hints - int(prev_data.get("hints", 0)))

    completion_rate = min(100.0, (len(completed_list) / total_sentences) * 100.0)
    progress_id = f"{user_id}_{payload.set_id}_{payload.mode}"

    db.execute("""
        INSERT INTO user_listening_progress (
            id, user_id, set_id, mode, current_sentence_index,
            completed_sentences, sentence_scores, completion_rate,
            total_score, total_hints_used
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE
            current_sentence_index = VALUES(current_sentence_index),
            completed_sentences = VALUES(completed_sentences),
            sentence_scores = VALUES(sentence_scores),
            completion_rate = VALUES(completion_rate),
            total_score = VALUES(total_score),
            total_hints_used = VALUES(total_hints_used),
            last_studied_at = UTC_TIMESTAMP()
    """, (
        progress_id,
        user_id,
        payload.set_id,
        payload.mode,
        payload.sentence_index,
        json.dumps(completed_list, ensure_ascii=False),
        json.dumps(scores_map, ensure_ascii=False),
        completion_rate,
        total_score,
        total_hints,
    ))

    return {
        "success": True,
        "mode": payload.mode,
        "completedCount": len(completed_list),
        "totalSentences": total_sentences,
        "completionRate": round(completion_rate, 1),
        "totalScore": total_score,
        "totalHintsUsed": total_hints,
        "currentSentenceIndex": payload.sentence_index,
    }


@router.get("/sets/{set_id}/notes")
def get_set_notes(
    set_id: str,
    user: Dict[str, Any] = Depends(get_current_user),
):
    """Lấy danh sách ghi chú từ vựng đã lưu khi luyện bộ đề này."""
    user_id = user["id"]
    row = db.fetch_one("""
        SELECT notes FROM user_listening_progress
        WHERE user_id = ? AND set_id = ? AND notes IS NOT NULL
        LIMIT 1
    """, (user_id, set_id))

    if not row or not row.get("notes"):
        return {"success": True, "notes": []}

    notes = json.loads(row["notes"]) if isinstance(row["notes"], str) else (row["notes"] or [])
    return {"success": True, "notes": notes}


@router.post("/sets/{set_id}/notes")
def add_set_note(
    set_id: str,
    payload: SaveNoteRequest,
    user: Dict[str, Any] = Depends(get_current_user),
):
    """Lưu thêm một ghi chú từ vựng mới khi luyện bộ đề này."""
    user_id = user["id"]
    row = db.fetch_one("""
        SELECT id, notes FROM user_listening_progress
        WHERE user_id = ? AND set_id = ? AND mode = 'dictation'
    """, (user_id, set_id))

    existing_notes = []
    if row and row.get("notes"):
        existing_notes = json.loads(row["notes"]) if isinstance(row["notes"], str) else (row["notes"] or [])

    new_note = {
        "id": f"note_{int(time.time() * 1000)}",
        "sentenceId": payload.sentence_id,
        "word": payload.word.strip(),
        "note": payload.note.strip(),
        "createdAt": datetime.utcnow().isoformat(),
    }
    existing_notes.append(new_note)
    progress_id = f"{user_id}_{set_id}_dictation"

    db.execute("""
        INSERT INTO user_listening_progress (
            id, user_id, set_id, mode, completed_sentences, sentence_scores, notes
        ) VALUES (?, ?, ?, 'dictation', '[]', '{}', ?)
        ON DUPLICATE KEY UPDATE
            notes = VALUES(notes),
            last_studied_at = UTC_TIMESTAMP()
    """, (
        progress_id,
        user_id,
        set_id,
        json.dumps(existing_notes, ensure_ascii=False),
    ))

    return {
        "success": True,
        "note": new_note,
        "totalNotes": len(existing_notes),
    }


@router.delete("/sets/{set_id}/progress")
def reset_set_progress(
    set_id: str,
    mode: Optional[str] = Query(None),
    user: Dict[str, Any] = Depends(get_current_user),
):
    """Xóa tiến độ luyện nghe của bộ đề để học viên làm lại từ đầu."""
    user_id = user["id"]
    if mode:
        db.execute("""
            DELETE FROM user_listening_progress
            WHERE user_id = ? AND set_id = ? AND mode = ?
        """, (user_id, set_id, mode))
    else:
        db.execute("""
            DELETE FROM user_listening_progress
            WHERE user_id = ? AND set_id = ?
        """, (user_id, set_id))

    return {
        "success": True,
        "message": "Đã làm mới tiến độ của bộ đề thành công.",
    }


@router.get("/difficulty-overview")
def get_difficulty_overview():
    """
    Lấy thông tin tổng quan 5 cấp độ luyện nghe theo tỷ lệ trả lời sai thực tế.
    Bao gồm tổng lượt luyện tập đã phân tích, timestamp lần cập nhật gần nhất,
    và số lượng bài theo từng Part trong mỗi cấp độ.
    """
    stats_row = db.fetch_one("""
        SELECT total_practice_attempts, total_questions_evaluated,
               update_frequency, level_distribution, last_calculated_at
        FROM listening_difficulty_stats
        WHERE id = 'current'
        LIMIT 1
    """)

    if not stats_row:
        # Fallback or run initial calculation
        from scripts.recalculate_difficulty import recalculate_listening_difficulty
        data = recalculate_listening_difficulty()
        stats_row = db.fetch_one("""
            SELECT total_practice_attempts, total_questions_evaluated,
                   update_frequency, level_distribution, last_calculated_at
            FROM listening_difficulty_stats
            WHERE id = 'current'
            LIMIT 1
        """)

    level_dist = json.loads(stats_row["level_distribution"]) if isinstance(stats_row["level_distribution"], str) else (stats_row.get("level_distribution") or {})
    
    levels_list = []
    for lvl in range(1, 6):
        lvl_key = str(lvl)
        d = level_dist.get(lvl_key, {
            "level": lvl,
            "name": f"Cấp {lvl}",
            "description": "",
            "totalSets": 0,
            "totalSentences": 0,
            "partCounts": {"all": 0, "Part 1": 0, "Part 2": 0, "Part 3": 0, "Part 4": 0}
        })
        levels_list.append(d)

    last_calc = stats_row["last_calculated_at"]
    last_calc_iso = last_calc.isoformat() if isinstance(last_calc, datetime) else str(last_calc or "")

    return {
        "success": True,
        "totalPracticeAttempts": int(stats_row["total_practice_attempts"] or 0),
        "totalQuestionsEvaluated": int(stats_row["total_questions_evaluated"] or 0),
        "updateFrequency": stats_row.get("update_frequency") or "Mỗi đêm lúc 02:00",
        "lastCalculatedAt": last_calc_iso,
        "levels": levels_list,
    }


@router.get("/difficulty-sets")
def get_difficulty_sets(
    level: int = Query(1, ge=1, le=5),
    part: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    uncompleted_only: bool = Query(False),
    page: int = Query(1, ge=1),
    page_size: int = Query(12, ge=1, le=100),
    user: Optional[Dict[str, Any]] = Depends(get_optional_current_user),
):
    """
    Lấy danh sách các bài luyện nghe thuộc một cấp độ cụ thể (1-5),
    có thể lọc tiếp theo Part (Part 1, 2, 3, 4 hoặc Tất cả) kèm phân trang.
    """
    user_id = user["id"] if user else None

    where_clauses = ["s.difficulty_level = ?"]
    where_params: List[Any] = [level]

    # Filter Part
    if part and part.strip() and part.lower() != "all":
        where_clauses.append("s.part = ?")
        where_params.append(part.strip())

    # Filter search
    if search and search.strip():
        term = f"%{search.strip()}%"
        where_clauses.append("(s.title LIKE ? OR s.description LIKE ?)")
        where_params.extend([term, term])

    # Filter uncompleted_only
    if uncompleted_only:
        where_clauses.append("(p.completion_rate IS NULL OR p.completion_rate < 100)")

    where_sql = " AND ".join(where_clauses)
    base_join = """
        FROM listening_sets s
        JOIN listening_categories c ON c.id = s.category_id
        LEFT JOIN user_listening_progress p 
          ON p.set_id = s.id AND p.user_id = ? AND p.mode = 'dictation'
    """
    count_params = [user_id or "ANONYMOUS_USER"] + where_params

    # 1. Total count
    count_sql = f"SELECT COUNT(*) AS total {base_join} WHERE {where_sql}"
    total_row = db.fetch_one(count_sql, tuple(count_params))
    total_count = int(total_row["total"]) if total_row else 0

    # 2. Paginated data query
    offset = (page - 1) * page_size
    data_sql = f"""
        SELECT s.id, s.category_id, s.title, s.description, s.part, s.difficulty,
               s.difficulty_level, s.error_rate, s.total_attempts, s.audio_url,
               s.is_pro, s.has_video, s.video_source_type, s.cover_image,
               s.sentence_count, s.order_index, s.created_at,
               c.name AS category_name,
               COALESCE(p.completion_rate, 0) AS completion_rate,
               COALESCE(p.current_sentence_index, 0) AS last_sentence_index,
               p.total_score,
               p.last_studied_at,
               CASE
                   WHEN p.completion_rate >= 100 THEN 'completed'
                   WHEN p.completion_rate > 0 THEN 'in_progress'
                   ELSE 'not_started'
               END AS progress_status,
               CASE 
                   WHEN p.notes IS NOT NULL THEN JSON_LENGTH(p.notes)
                   ELSE 0
               END AS notes_count
        {base_join}
        WHERE {where_sql}
        ORDER BY s.order_index ASC
        LIMIT ? OFFSET ?
    """
    data_params = [user_id or "ANONYMOUS_USER"] + where_params + [page_size, offset]
    rows = db.fetch_all(data_sql, tuple(data_params))

    formatted = []
    for row in rows:
        formatted.append({
            "id": row["id"],
            "categoryId": row["category_id"],
            "categoryName": row["category_name"],
            "title": row["title"],
            "description": row["description"] or "",
            "part": row["part"],
            "difficulty": row["difficulty"],
            "difficultyLevel": int(row.get("difficulty_level") or level),
            "errorRate": round(float(row.get("error_rate") or 0.0), 3) if row.get("error_rate") is not None else None,
            "totalAttempts": int(row.get("total_attempts") or 0),
            "audioUrl": row.get("audio_url") or "",
            "isPro": False,
            "isLocked": False,
            "hasVideo": bool(row["has_video"]),
            "videoSourceType": row["video_source_type"],
            "coverImage": row["cover_image"] or "",
            "sentenceCount": int(row["sentence_count"]),
            "orderIndex": int(row["order_index"]),
            "completionRate": round(float(row.get("completion_rate") or 0), 1),
            "lastSentenceIndex": int(row.get("last_sentence_index") or 0),
            "progressStatus": row.get("progress_status") or "not_started",
            "notesCount": int(row.get("notes_count") or 0),
            "lastStudiedAt": row["last_studied_at"].isoformat() if isinstance(row.get("last_studied_at"), datetime) else str(row.get("last_studied_at") or "") or None,
        })

    total_pages = math.ceil(total_count / page_size) if page_size > 0 else 1
    total_pages = max(1, total_pages)

    return {
        "success": True,
        "level": level,
        "part": part or "all",
        "total": total_count,
        "page": page,
        "pageSize": page_size,
        "totalPages": total_pages,
        "sets": formatted,
    }


@router.get("/difficulty-random")
def get_difficulty_random(
    level: int = Query(1, ge=1, le=5),
    part: Optional[str] = Query(None),
    count: int = Query(1, ge=1, le=20),
    user: Optional[Dict[str, Any]] = Depends(get_optional_current_user),
):
    """
    Lấy ngẫu nhiên các bộ đề thuộc một cấp độ cụ thể (và Part tùy chọn)
    để phục vụ tính năng 'Luyện ngẫu nhiên'.
    """
    sql = """
        SELECT s.id, s.category_id, s.title, s.description, s.part, s.difficulty,
               s.difficulty_level, s.audio_url, s.has_video, s.video_source_type,
               s.cover_image, s.sentence_count, s.order_index, c.name AS category_name
        FROM listening_sets s
        JOIN listening_categories c ON c.id = s.category_id
        WHERE s.difficulty_level = ?
    """
    params: List[Any] = [level]

    if part and part.strip() and part.lower() != "all":
        sql += " AND s.part = ?"
        params.append(part.strip())

    sql += " ORDER BY RAND() LIMIT ?"
    params.append(count)

    rows = db.fetch_all(sql, tuple(params))
    formatted = []
    for r in rows:
        formatted.append({
            "id": r["id"],
            "categoryId": r["category_id"],
            "categoryName": r["category_name"],
            "title": r["title"],
            "description": r["description"] or "",
            "part": r["part"],
            "difficulty": r["difficulty"],
            "difficultyLevel": int(r.get("difficulty_level") or level),
            "audioUrl": r.get("audio_url") or "",
            "isPro": False,
            "isLocked": False,
            "hasVideo": bool(r["has_video"]),
            "videoSourceType": r["video_source_type"],
            "coverImage": r["cover_image"] or "",
            "sentenceCount": int(r["sentence_count"]),
            "orderIndex": int(r["order_index"]),
            "completionRate": 0,
            "progressStatus": "not_started",
        })

    return {
        "success": True,
        "level": level,
        "part": part or "all",
        "count": len(formatted),
        "sets": formatted,
    }


@router.post("/recalculate-difficulty")
def trigger_recalculate_difficulty(
    user: Dict[str, Any] = Depends(get_current_user),
):
    """
    Kích hoạt tính toán lại độ khó theo tỷ lệ làm sai thực tế của học viên.
    Thường được chạy tự động mỗi đêm qua cron job.
    """
    from scripts.recalculate_difficulty import recalculate_listening_difficulty
    result = recalculate_listening_difficulty()
    return result
