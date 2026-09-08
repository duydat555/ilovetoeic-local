import time
from typing import Dict, Any, Optional
from fastapi import APIRouter, HTTPException, Query, Response
from app.db import db

router = APIRouter(prefix="/api/v1", tags=["Tests"])

_TEST_SETS_CACHE: Dict[str, Any] = {"data": None, "timestamp": 0}
_TESTS_LIST_CACHE: Dict[str, Any] = {}
_TEST_DETAIL_CACHE: Dict[str, Any] = {}
TESTS_CACHE_TTL = 300  # 5 minutes


def clear_tests_caches():
    _TEST_SETS_CACHE["data"] = None
    _TEST_SETS_CACHE["timestamp"] = 0
    _TESTS_LIST_CACHE.clear()
    _TEST_DETAIL_CACHE.clear()


@router.get("/test-sets")
def get_test_sets(response: Response):
    now = time.time()
    if _TEST_SETS_CACHE["data"] and (now - _TEST_SETS_CACHE["timestamp"] < TESTS_CACHE_TTL):
        response.headers["Cache-Control"] = "public, max-age=180, stale-while-revalidate=300"
        return _TEST_SETS_CACHE["data"]

    query = "SELECT id, name, year, order_index FROM test_sets ORDER BY order_index ASC, year DESC"
    results = db.fetch_all(query)
    data = {
        "success": True,
        "count": len(results),
        "data": results
    }
    _TEST_SETS_CACHE["data"] = data
    _TEST_SETS_CACHE["timestamp"] = now
    response.headers["Cache-Control"] = "public, max-age=180, stale-while-revalidate=300"
    return data


@router.get("/tests")
def get_tests(
    response: Response,
    set_id: Optional[str] = Query(None, description="Filter by test set ID"),
    year: Optional[int] = Query(None, description="Filter by year"),
    difficulty: Optional[int] = Query(None, description="Filter by difficulty level")
):
    cache_key = f"{set_id}:{year}:{difficulty}"
    now = time.time()
    cached = _TESTS_LIST_CACHE.get(cache_key)
    if cached and (now - cached["timestamp"] < TESTS_CACHE_TTL):
        response.headers["Cache-Control"] = "public, max-age=180, stale-while-revalidate=300"
        return cached["data"]

    query = "SELECT * FROM tests WHERE is_hidden = 0"
    params = []

    if set_id:
        query += " AND set_id = ?"
        params.append(set_id)
    if year:
        query += " AND year = ?"
        params.append(year)
    if difficulty:
        query += " AND difficulty_level = ?"
        params.append(difficulty)

    query += " ORDER BY year DESC, name ASC"
    results = db.fetch_all(query, tuple(params))
    data = {
        "success": True,
        "count": len(results),
        "data": results
    }
    _TESTS_LIST_CACHE[cache_key] = {"data": data, "timestamp": now}
    response.headers["Cache-Control"] = "public, max-age=180, stale-while-revalidate=300"
    return data


@router.get("/tests/{test_id}")
def get_test_detail(test_id: str, response: Response):
    now = time.time()
    cached = _TEST_DETAIL_CACHE.get(test_id)
    if cached and (now - cached["timestamp"] < TESTS_CACHE_TTL):
        response.headers["Cache-Control"] = "public, max-age=180, stale-while-revalidate=300"
        return cached["data"]

    query = "SELECT * FROM tests WHERE id = ?"
    test = db.fetch_one(query, (test_id,))

    if not test:
        raise HTTPException(status_code=404, detail="Test not found")

    # Get question count per part
    part_counts_query = """
        SELECT part, COUNT(*) as question_count 
        FROM questions 
        WHERE test_id = ? 
        GROUP BY part 
        ORDER BY part ASC
    """
    part_counts = db.fetch_all(part_counts_query, (test_id,))

    test["part_summary"] = part_counts
    data = {
        "success": True,
        "data": test
    }
    _TEST_DETAIL_CACHE[test_id] = {"data": data, "timestamp": now}
    response.headers["Cache-Control"] = "public, max-age=180, stale-while-revalidate=300"
    return data
