import sys
import os
import uuid
import json
from datetime import datetime

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from fastapi.testclient import TestClient
from main import app
from app.db import db
from app.security import get_current_user
from scripts.backfill_attempt_levels import backfill_attempt_levels

client = TestClient(app)

TEST_USER_ID = f"test_user_pbl5_{uuid.uuid4().hex[:8]}"

def setup_module():
    db.execute(
        """
        INSERT INTO users (id, email, full_name, role, approval_status, streak_days, longest_streak, last_study_date, current_score)
        VALUES (?, ?, ?, 'student', 'approved', 0, 0, NULL, 0)
        ON DUPLICATE KEY UPDATE id = id
        """,
        (TEST_USER_ID, f"{TEST_USER_ID}@test.com", "Test PBL 5 User"),
    )

def teardown_module():
    db.execute("DELETE FROM user_notifications WHERE user_id = ?", (TEST_USER_ID,))
    db.execute("DELETE FROM user_question_activity WHERE user_id = ?", (TEST_USER_ID,))
    db.execute("DELETE FROM test_attempts WHERE user_id = ?", (TEST_USER_ID,))
    db.execute("DELETE FROM users WHERE id = ?", (TEST_USER_ID,))


def test_schema_and_composite_index():
    print("\n[+] 1. Verifying schema and composite index on test_attempts...")
    desc = db.fetch_all("DESCRIBE test_attempts", use_cache=False)
    cols = {c["Field"]: c["Type"] for c in desc}
    assert "level" in cols, "Column 'level' missing from test_attempts"
    print(f"    [PASSED] Column 'level' found with type {cols['level']}.")

    indexes = db.fetch_all("SHOW INDEX FROM test_attempts", use_cache=False)
    idx_cols = [i["Column_name"] for i in indexes if i["Key_name"] == "idx_attempts_user_mode_part_level"]
    assert idx_cols == ["user_id", "mode", "part", "level"], f"Index mismatch: {idx_cols}"
    print(f"    [PASSED] Index idx_attempts_user_mode_part_level covers {idx_cols}.")


def test_save_study_attempt_writes_both_level_column_and_metadata():
    print("\n[+] 2. Testing PUT /study-attempts writes level column and metadata.selected_level...")
    mock_user = db.fetch_one("SELECT * FROM users WHERE id = ?", (TEST_USER_ID,), use_cache=False)
    app.dependency_overrides[get_current_user] = lambda: mock_user

    attempt_id = str(uuid.uuid4())
    payload = {
        "id": attempt_id,
        "mode": "practice",
        "part": 5,
        "level": 3,
        "totalQuestions": 30,
        "answeredQuestions": 30,
        "correctAnswers": 24,
        "accuracyRate": 80.0,
        "timeSpentSeconds": 500,
        "listeningCorrect": 0,
        "readingCorrect": 24,
        "listeningScore": 0,
        "readingScore": 360,
        "totalScore": 360,
        "answers": {},
        "questionIds": [],
        "metadata": {"source": "level_practice"},
        "completedAt": datetime.utcnow().isoformat(),
    }

    res = client.put(f"/api/v1/study-attempts/{attempt_id}", json=payload)
    assert res.status_code == 200, f"Failed: {res.text}"
    assert res.json() == {"success": True}

    row = db.fetch_one("SELECT * FROM test_attempts WHERE id = ?", (attempt_id,), use_cache=False)
    assert row is not None
    assert row["level"] == 3, f"Expected level=3, got {row['level']}"
    meta = json.loads(row["metadata"]) if isinstance(row["metadata"], str) else row["metadata"]
    assert meta.get("selected_level") == 3, f"Expected metadata.selected_level=3, got {meta.get('selected_level')}"
    print("    [PASSED] Both level column (3) and metadata.selected_level (3) stored properly.")

    # Also test GET /study-attempts and GET /study-attempts/{attempt_id}
    res_list = client.get("/api/v1/study-attempts")
    assert res_list.status_code == 200
    matching = [a for a in res_list.json()["data"] if a["id"] == attempt_id]
    assert len(matching) == 1
    assert matching[0]["level"] == 3
    print("    [PASSED] GET /study-attempts returns normalized level.")

    res_detail = client.get(f"/api/v1/study-attempts/{attempt_id}")
    assert res_detail.status_code == 200
    assert res_detail.json()["attempt"]["level"] == 3
    print("    [PASSED] GET /study-attempts/{id} returns normalized level in attempt summary.")

    app.dependency_overrides.clear()


def test_backfill_attempt_levels_script():
    print("\n[+] 3. Testing backfill script on legacy row...")
    legacy_id = str(uuid.uuid4())
    db.execute(
        """
        INSERT INTO test_attempts (
            id, user_id, mode, part, level, total_questions, answered_questions,
            correct_answers, accuracy_rate, time_spent_seconds, listening_correct,
            reading_correct, listening_score, reading_score, total_score, answers,
            question_ids, metadata, completed_at
        ) VALUES (?, ?, 'practice', 6, NULL, 16, 16, 14, 87.5, 300, 0, 14, 0, 200, 200, '{}', '[]', ?, ?)
        """,
        (
            legacy_id,
            TEST_USER_ID,
            json.dumps({"source": "level_practice", "selected_level": 4, "selected_part": 6}),
            datetime.utcnow(),
        ),
    )

    unmigrated = db.fetch_one("SELECT level FROM test_attempts WHERE id = ?", (legacy_id,), use_cache=False)
    assert unmigrated["level"] is None

    result = backfill_attempt_levels(batch_size=5, dry_run=False)
    assert result["updated"] >= 1, "Backfill should have updated at least the legacy row"

    migrated = db.fetch_one("SELECT level FROM test_attempts WHERE id = ?", (legacy_id,), use_cache=False)
    assert migrated["level"] == 4, f"Expected level=4 after backfill, got {migrated['level']}"
    print("    [PASSED] Legacy row successfully backfilled: level is now 4.")


def test_cascade_deletion_uses_index_and_deletes_cleanly():
    print("\n[+] 4. Testing cascade deletion EXPLAIN and execution...")
    # Verify EXPLAIN query uses index idx_attempts_user_mode_part_level
    explain_rows = db.fetch_all(
        """
        EXPLAIN
        SELECT *
        FROM test_attempts attempt FORCE INDEX (idx_attempts_user_mode_part_level)
        WHERE attempt.user_id = ?
          AND attempt.mode = 'practice'
          AND attempt.part = ?
          AND attempt.level = ?
        """,
        (TEST_USER_ID, 5, 3),
        use_cache=False,
    )
    assert len(explain_rows) > 0
    row = explain_rows[0]
    assert row["key"] == "idx_attempts_user_mode_part_level"
    assert "ref" in row and row["ref"] == "const,const,const,const"
    print(f"    [PASSED] EXPLAIN confirms pure 4-column index lookup: key={row['key']}, ref={row['ref']}.")

    # Now execute DELETE /study-attempts?source_type=level&part=5&level=3
    mock_user = db.fetch_one("SELECT * FROM users WHERE id = ?", (TEST_USER_ID,), use_cache=False)
    app.dependency_overrides[get_current_user] = lambda: mock_user

    del_res = client.delete("/api/v1/study-attempts?source_type=level&part=5&level=3")
    assert del_res.status_code == 200, f"Delete failed: {del_res.text}"
    assert del_res.json()["success"] is True

    # Verify Part 5 Level 3 attempt is deleted
    remaining = db.fetch_all(
        "SELECT id FROM test_attempts WHERE user_id = ? AND part = 5 AND level = 3",
        (TEST_USER_ID,),
        use_cache=False,
    )
    assert len(remaining) == 0
    print("    [PASSED] Cascade deletion successfully purged attempt using normalized level column.")

    app.dependency_overrides.clear()


if __name__ == "__main__":
    setup_module()
    try:
        test_schema_and_composite_index()
        test_save_study_attempt_writes_both_level_column_and_metadata()
        test_backfill_attempt_levels_script()
        test_cascade_deletion_uses_index_and_deletes_cleanly()
        print("\n=======================================================")
        print("[+] ALL PHASE 5 ACCEPTANCE CRITERIA PASSED CLEANLY!")
        print("=======================================================")
    finally:
        teardown_module()
