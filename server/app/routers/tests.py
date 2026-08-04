from typing import Optional
from fastapi import APIRouter, HTTPException, Query
from app.db import db

router = APIRouter(prefix="/api/v1", tags=["Tests"])

@router.get("/test-sets")
def get_test_sets():
    query = "SELECT id, name, year, order_index FROM test_sets ORDER BY order_index ASC, year DESC"
    results = db.fetch_all(query)
    return {
        "success": True,
        "count": len(results),
        "data": results
    }

@router.get("/tests")
def get_tests(
    set_id: Optional[str] = Query(None, description="Filter by test set ID"),
    year: Optional[int] = Query(None, description="Filter by year"),
    difficulty: Optional[int] = Query(None, description="Filter by difficulty level")
):
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
    return {
        "success": True,
        "count": len(results),
        "data": results
    }

@router.get("/tests/{test_id}")
def get_test_detail(test_id: str):
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
    return {
        "success": True,
        "data": test
    }
