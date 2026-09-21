import logging
import time
from typing import Any, Dict, Literal
from fastapi import APIRouter, Depends, HTTPException, Query, Response
from app.db import db
from app.security import get_current_user
from app.services.cache_service import cache_service

logger = logging.getLogger("practice_router")

router = APIRouter(prefix="/api/v1", tags=["Practice"])

# L0 In-process short-lived cache (5s) to buffer flash-crowd bursts before hitting Redis
_L0_CACHE: Dict[str, Any] = {}
_L0_TIMESTAMPS: Dict[str, float] = {}

L0_TTL = 5                  # 5 seconds
LEVEL_CACHE_TTL = 600       # 10 minutes
FULL_TEST_CACHE_TTL = 1800  # 30 minutes


def clear_practice_caches():
    """Invalidate practice caches globally across all workers via Redis, plus clear local L0."""
    try:
        cache_service.delete("practice:summary")
        cache_service.delete_pattern("practice:questions:*")
        cache_service.delete_pattern("practice:full_test:*")
        cache_service.delete_pattern("practice:test_part:*")
    except Exception as err:
        logger.warning(f"Error clearing practice caches in Redis: {err}")

    _L0_CACHE.clear()
    _L0_TIMESTAMPS.clear()


@router.get("/practice-by-level/summary")
def get_practice_by_level_summary(response: Response):
    now = time.time()
    cache_key = "practice:summary"

    # 1. L0 In-process cache (< 0.01ms)
    if cache_key in _L0_CACHE and (now - _L0_TIMESTAMPS.get(cache_key, 0) < L0_TTL):
        response.headers["Cache-Control"] = "public, max-age=180, stale-while-revalidate=300"
        return _L0_CACHE[cache_key]

    # 2. Redis Shared Cache (< 1ms)
    try:
        cached_data = cache_service.get(cache_key)
        if cached_data:
            _L0_CACHE[cache_key] = cached_data
            _L0_TIMESTAMPS[cache_key] = now
            response.headers["Cache-Control"] = "public, max-age=180, stale-while-revalidate=300"
            return cached_data
    except Exception as err:
        logger.warning(f"Error reading Redis cache for {cache_key}: {err}")

    # 3. Fallback: MySQL aggregation query
    rows = db.fetch_all("""
        SELECT q.part, q.difficulty_level, COUNT(*) AS question_count
        FROM questions q
        JOIN tests t ON t.id = q.test_id
        WHERE q.part BETWEEN 1 AND 7
          AND q.difficulty_level BETWEEN 1 AND 5
          AND t.is_hidden = 0
        GROUP BY q.part, q.difficulty_level
        ORDER BY q.part ASC, q.difficulty_level ASC
    """)
    result = {
        "success": True,
        "data": [
            {
                "part": int(row["part"]),
                "level": int(row["difficulty_level"]),
                "question_count": int(row["question_count"]),
            }
            for row in rows
        ],
    }

    # 4. Store in Redis and L0
    try:
        cache_service.set(cache_key, result, ttl_seconds=LEVEL_CACHE_TTL)
    except Exception as err:
        logger.warning(f"Error setting Redis cache for {cache_key}: {err}")

    _L0_CACHE[cache_key] = result
    _L0_TIMESTAMPS[cache_key] = now
    response.headers["Cache-Control"] = "public, max-age=180, stale-while-revalidate=300"
    return result


@router.get("/practice-by-level/questions")
def get_practice_by_level_questions(
    response: Response,
    part: int = Query(..., ge=1, le=7),
    level: int = Query(..., ge=1, le=5),
    response_format: Literal["v1", "v2"] = Query(
        default="v1",
        description="v1=embedded passage in each question (legacy), v2=normalized passages map (deduplicated)"
    ),
):
    cache_key = f"practice:questions:{part}:{level}:{response_format}"
    now = time.time()

    # 1. L0 In-process cache (< 0.01ms)
    if cache_key in _L0_CACHE and (now - _L0_TIMESTAMPS.get(cache_key, 0) < L0_TTL):
        response.headers["Cache-Control"] = "public, max-age=180, stale-while-revalidate=300"
        return _L0_CACHE[cache_key]

    # 2. Redis Shared Cache (< 1ms)
    try:
        cached_data = cache_service.get(cache_key)
        if cached_data:
            _L0_CACHE[cache_key] = cached_data
            _L0_TIMESTAMPS[cache_key] = now
            response.headers["Cache-Control"] = "public, max-age=180, stale-while-revalidate=300"
            return cached_data
    except Exception as err:
        logger.warning(f"Error reading Redis cache for {cache_key}: {err}")

    # 3. Fallback: MySQL composite query
    questions = db.fetch_all("""
        SELECT q.id, q.test_id, q.passage_id, q.part, q.section,
               q.question_number, COALESCE(q.audio_url, p.audio_url) AS audio_url,
               COALESCE(q.image_url, p.image_url) AS image_url, q.question_text,
               q.option_a, q.option_b, q.option_c, q.option_d, q.correct_answer,
               q.explanation_vi, q.explanation_en, q.dich_nghia, q.tu_vung,
               q.dich_nghia_dap_an, q.difficulty_level, q.order_index,
               p.passage_text, p.passage_text_2, p.passage_text_3,
               p.transcript, p.format_status, p.passage_text_vi_html,
               p.passage_text_2_vi_html, p.passage_text_3_vi_html,
               p.passage_sentence_pairs
        FROM questions q
        LEFT JOIN passages p ON p.id = q.passage_id AND p.test_id = q.test_id
        JOIN tests t ON t.id = q.test_id
        WHERE q.part = ? AND q.difficulty_level = ? AND t.is_hidden = 0
        ORDER BY q.test_id ASC, q.order_index ASC, q.question_number ASC
    """, (part, level))

    if not questions:
        raise HTTPException(status_code=404, detail="Không có câu hỏi phù hợp với Part và Level đã chọn.")

    if response_format == "v2":
        passages_map: Dict[str, Any] = {}
        deduped_questions = []
        passage_fields = (
            "passage_text", "passage_text_2", "passage_text_3",
            "transcript", "format_status", "passage_text_vi_html",
            "passage_text_2_vi_html", "passage_text_3_vi_html",
            "passage_sentence_pairs"
        )
        for q in questions:
            q_dict = dict(q)
            pid = q_dict.get("passage_id")
            if pid:
                if pid not in passages_map:
                    passages_map[pid] = {
                        field: q_dict.get(field)
                        for field in passage_fields
                    }
                for field in passage_fields:
                    q_dict.pop(field, None)
            deduped_questions.append(q_dict)

        result = {
            "success": True,
            "part": part,
            "level": level,
            "total_questions": len(questions),
            "passages": passages_map,
            "questions": deduped_questions,
        }
    else:
        result = {
            "success": True,
            "part": part,
            "level": level,
            "questions": questions,
            "total_questions": len(questions),
        }

    # 4. Store in Redis and L0
    try:
        cache_service.set(cache_key, result, ttl_seconds=LEVEL_CACHE_TTL)
    except Exception as err:
        logger.warning(f"Error setting Redis cache for {cache_key}: {err}")

    _L0_CACHE[cache_key] = result
    _L0_TIMESTAMPS[cache_key] = now
    response.headers["Cache-Control"] = "public, max-age=180, stale-while-revalidate=300"
    return result


@router.get("/tests/{test_id}/full")
def get_full_test(test_id: str, response: Response):
    cache_key = f"practice:full_test:{test_id}"
    now = time.time()

    # 1. L0 In-process cache
    if cache_key in _L0_CACHE and (now - _L0_TIMESTAMPS.get(cache_key, 0) < L0_TTL):
        response.headers["Cache-Control"] = "public, max-age=300, stale-while-revalidate=600"
        return _L0_CACHE[cache_key]

    # 2. Redis Shared Cache
    try:
        cached_data = cache_service.get(cache_key)
        if cached_data:
            _L0_CACHE[cache_key] = cached_data
            _L0_TIMESTAMPS[cache_key] = now
            response.headers["Cache-Control"] = "public, max-age=300, stale-while-revalidate=600"
            return cached_data
    except Exception as err:
        logger.warning(f"Error reading Redis cache for {cache_key}: {err}")

    # 3. Fallback: MySQL query
    test = db.fetch_one("SELECT * FROM tests WHERE id = ?", (test_id,))
    if not test:
        raise HTTPException(status_code=404, detail="Test not found")

    passages = db.fetch_all("SELECT * FROM passages WHERE test_id = ? ORDER BY order_index ASC", (test_id,))
    passages_dict = {p["id"]: dict(p) for p in passages}
    for p in passages_dict.values():
        p["questions"] = []

    questions = db.fetch_all("""
        SELECT id, test_id, passage_id, part, section, question_number, audio_url, image_url,
               question_text, option_a, option_b, option_c, option_d, correct_answer,
               explanation_vi, explanation_en, dich_nghia, tu_vung, dich_nghia_dap_an, difficulty_level, order_index
        FROM questions 
        WHERE test_id = ? 
        ORDER BY question_number ASC
    """, (test_id,))

    standalone_questions = []
    for q in questions:
        q_dict = dict(q)
        passage_id = q_dict.get("passage_id")
        if passage_id and passage_id in passages_dict:
            passages_dict[passage_id]["questions"].append(q_dict)
        else:
            standalone_questions.append(q_dict)

    result = {
        "success": True,
        "test": test,
        "passages": list(passages_dict.values()),
        "standalone_questions": standalone_questions,
        "total_questions": len(questions)
    }

    try:
        cache_service.set(cache_key, result, ttl_seconds=FULL_TEST_CACHE_TTL)
    except Exception as err:
        logger.warning(f"Error setting Redis cache for {cache_key}: {err}")

    _L0_CACHE[cache_key] = result
    _L0_TIMESTAMPS[cache_key] = now
    response.headers["Cache-Control"] = "public, max-age=300, stale-while-revalidate=600"
    return result


@router.get("/tests/{test_id}/parts/{part_num}")
def get_test_part(test_id: str, part_num: int, response: Response):
    if part_num < 1 or part_num > 7:
        raise HTTPException(status_code=400, detail="Invalid part number. Must be between 1 and 7.")

    cache_key = f"practice:test_part:{test_id}:{part_num}"
    now = time.time()

    # 1. L0 In-process cache
    if cache_key in _L0_CACHE and (now - _L0_TIMESTAMPS.get(cache_key, 0) < L0_TTL):
        response.headers["Cache-Control"] = "public, max-age=300, stale-while-revalidate=600"
        return _L0_CACHE[cache_key]

    # 2. Redis Shared Cache
    try:
        cached_data = cache_service.get(cache_key)
        if cached_data:
            _L0_CACHE[cache_key] = cached_data
            _L0_TIMESTAMPS[cache_key] = now
            response.headers["Cache-Control"] = "public, max-age=300, stale-while-revalidate=600"
            return cached_data
    except Exception as err:
        logger.warning(f"Error reading Redis cache for {cache_key}: {err}")

    # 3. Fallback: MySQL query
    test = db.fetch_one("SELECT id, name, year FROM tests WHERE id = ?", (test_id,))
    if not test:
        raise HTTPException(status_code=404, detail="Test not found")

    passages = db.fetch_all("SELECT * FROM passages WHERE test_id = ? AND part = ? ORDER BY order_index ASC", (test_id, part_num))
    passages_dict = {p["id"]: dict(p) for p in passages}
    for p in passages_dict.values():
        p["questions"] = []

    questions = db.fetch_all("""
        SELECT id, test_id, passage_id, part, section, question_number, audio_url, image_url,
               question_text, option_a, option_b, option_c, option_d, correct_answer,
               explanation_vi, explanation_en, dich_nghia, tu_vung, dich_nghia_dap_an, difficulty_level, order_index
        FROM questions 
        WHERE test_id = ? AND part = ? 
        ORDER BY question_number ASC
    """, (test_id, part_num))

    standalone_questions = []
    for q in questions:
        q_dict = dict(q)
        passage_id = q_dict.get("passage_id")
        if passage_id and passage_id in passages_dict:
            passages_dict[passage_id]["questions"].append(q_dict)
        else:
            standalone_questions.append(q_dict)

    result = {
        "success": True,
        "test_id": test_id,
        "part": part_num,
        "passages": list(passages_dict.values()),
        "standalone_questions": standalone_questions,
        "total_questions": len(questions)
    }

    try:
        cache_service.set(cache_key, result, ttl_seconds=FULL_TEST_CACHE_TTL)
    except Exception as err:
        logger.warning(f"Error setting Redis cache for {cache_key}: {err}")

    _L0_CACHE[cache_key] = result
    _L0_TIMESTAMPS[cache_key] = now
    response.headers["Cache-Control"] = "public, max-age=300, stale-while-revalidate=600"
    return result


@router.get("/practice-by-level/stats")
def get_user_level_stats(
    user=Depends(get_current_user),
):
    """Retrieve precomputed Part levels and Average Level for the current user."""
    user_id = user["id"]
    cache_key = f"user:level_stats:{user_id}"

    # 1. Redis cache lookup (< 1ms)
    try:
        cached = cache_service.get(cache_key)
        if cached is not None:
            return cached
    except Exception as err:
        logger.warning(f"Error reading Redis level stats for {user_id}: {err}")

    # 2. Query user_level_stats
    rows = db.fetch_all(
        "SELECT part, max_level_achieved FROM user_level_stats WHERE user_id = ? ORDER BY part ASC",
        (user_id,),
        use_cache=False,
    )

    # 3. Lazy backfill if user_level_stats is empty for this user
    if not rows:
        db.execute(
            """
            INSERT INTO user_level_stats (user_id, part, max_level_achieved, updated_at)
            SELECT user_id, part, MAX(level), NOW()
            FROM test_attempts
            WHERE user_id = ?
              AND mode = 'practice'
              AND JSON_UNQUOTE(JSON_EXTRACT(metadata, '$.source')) = 'level_practice'
              AND COALESCE(JSON_UNQUOTE(JSON_EXTRACT(metadata, '$.is_wrong_retry')), 'false') NOT IN ('true', '1')
              AND JSON_EXTRACT(metadata, '$.wrong_source') IS NULL
              AND JSON_EXTRACT(metadata, '$.review_attempt_id') IS NULL
              AND level BETWEEN 1 AND 5
              AND part BETWEEN 1 AND 7
              AND total_questions > 0
              AND answered_questions = total_questions
              AND correct_answers BETWEEN 0 AND total_questions
              AND correct_answers * 100 >= total_questions * 70
            GROUP BY user_id, part
            ON DUPLICATE KEY UPDATE
                max_level_achieved = VALUES(max_level_achieved),
                updated_at = NOW()
            """,
            (user_id,),
        )
        rows = db.fetch_all(
            "SELECT part, max_level_achieved FROM user_level_stats WHERE user_id = ? ORDER BY part ASC",
            (user_id,),
            use_cache=False,
        )

    parts = [
        {"part": int(r["part"]), "max_level": int(r["max_level_achieved"])}
        for r in rows
    ]
    avg_level = (
        round(sum(p["max_level"] for p in parts) / len(parts), 2)
        if parts
        else None
    )

    data = {
        "success": True,
        "parts": parts,
        "average_level": avg_level,
    }

    # 4. Cache in Redis
    try:
        cache_service.set(cache_key, data, ttl_seconds=300)
    except Exception as err:
        logger.warning(f"Error saving Redis level stats for {user_id}: {err}")

    return data
