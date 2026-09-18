import sys
import os

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.db import db
from fastapi.testclient import TestClient
from main import app

client = TestClient(app)

def test_covering_index_existence():
    print("[*] Verifying index idx_questions_part_level_order...")
    indexes = db.fetch_all("SHOW INDEX FROM questions")
    index_names = {i["Key_name"] for i in indexes}
    
    assert "idx_questions_part_level_order" in index_names, "Expected idx_questions_part_level_order to exist on questions"
    assert "idx_questions_part_level" not in index_names, "Expected redundant idx_questions_part_level to be dropped"

    # Verify column order of composite index
    cols = [i["Column_name"] for i in indexes if i["Key_name"] == "idx_questions_part_level_order"]
    expected_cols = ["part", "difficulty_level", "test_id", "order_index", "question_number"]
    assert cols == expected_cols, f"Expected {expected_cols}, got {cols}"
    print("[+] Covering index columns match exactly!")


def test_assembler_query_no_filesort():
    print("[*] Verifying EXPLAIN plan has no filesort...")
    query = """
        EXPLAIN SELECT q.id FROM questions q
        LEFT JOIN passages p ON p.id = q.passage_id AND p.test_id = q.test_id
        JOIN tests t ON t.id = q.test_id
        WHERE q.part = 5 AND q.difficulty_level = 3 AND t.is_hidden = 0
        ORDER BY q.test_id ASC, q.order_index ASC, q.question_number ASC
    """
    rows = db.fetch_all(query)
    q_row = next(r for r in rows if r["table"] == "q")
    
    assert q_row["key"] == "idx_questions_part_level_order", f"Expected key idx_questions_part_level_order, got {q_row['key']}"
    extra = q_row.get("Extra") or ""
    assert "Using filesort" not in extra, f"Expected no 'Using filesort' in Extra, got {extra}"
    print(f"[+] Assembler query uses index without filesort! (Extra: '{extra}')")


def test_summary_query_covering_index():
    print("[*] Verifying EXPLAIN plan for summary query uses covering index...")
    query = """
        EXPLAIN SELECT q.part, q.difficulty_level, COUNT(*) AS question_count
        FROM questions q
        JOIN tests t ON t.id = q.test_id
        WHERE q.part BETWEEN 1 AND 7
          AND q.difficulty_level BETWEEN 1 AND 5
          AND t.is_hidden = 0
        GROUP BY q.part, q.difficulty_level
    """
    rows = db.fetch_all(query)
    q_row = next(r for r in rows if r["table"] == "q")
    assert q_row["key"] == "idx_questions_part_level_order"
    extra = q_row.get("Extra") or ""
    assert "Using index" in extra, f"Expected 'Using index' in Extra, got {extra}"
    print(f"[+] Summary query uses covering index! (Extra: '{extra}')")


def test_api_endpoints_work():
    print("[*] Testing API endpoints response integrity...")
    res_summary = client.get("/api/v1/practice-by-level/summary")
    assert res_summary.status_code == 200
    assert res_summary.json()["success"] is True

    res_q = client.get("/api/v1/practice-by-level/questions?part=5&level=3")
    assert res_q.status_code == 200
    assert res_q.json()["success"] is True
    assert len(res_q.json()["questions"]) > 0
    print("[+] All API endpoints return valid data with new index!")


if __name__ == "__main__":
    test_covering_index_existence()
    test_assembler_query_no_filesort()
    test_summary_query_covering_index()
    test_api_endpoints_work()
    print("[SUCCESS] All Phase 2 covering index tests passed cleanly!")
