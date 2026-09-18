import sys
import os
import uuid
from datetime import datetime

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from fastapi.testclient import TestClient
from main import app
from app.db import db
from app.security import get_current_user

client = TestClient(app)

TEST_USER_ID = f"test_user_pbl6_{uuid.uuid4().hex[:8]}"

def setup_module():
    db.execute(
        """
        INSERT INTO users (id, email, full_name, role, approval_status, streak_days, longest_streak, last_study_date, current_score)
        VALUES (?, ?, ?, 'student', 'approved', 0, 0, NULL, 0)
        ON DUPLICATE KEY UPDATE id = id
        """,
        (TEST_USER_ID, f"{TEST_USER_ID}@test.com", "Test PBL 6 User"),
    )

def teardown_module():
    db.execute("DELETE FROM user_question_activity WHERE user_id = ?", (TEST_USER_ID,))
    db.execute("DELETE FROM users WHERE id = ?", (TEST_USER_ID,))


def test_batch_limit_exceeded_returns_400():
    print("\n[+] 1. Testing batch size limit > 50 items returns 400 Bad Request...")
    mock_user = db.fetch_one("SELECT * FROM users WHERE id = ?", (TEST_USER_ID,), use_cache=False)
    app.dependency_overrides[get_current_user] = lambda: mock_user

    attempt_id = str(uuid.uuid4())
    # Create 51 items (exceeds MAX_QUESTION_ACTIVITY_BATCH_SIZE = 50)
    items_51 = [
        {"questionId": f"fake_q_{i}", "selectedAnswer": "A", "answeredAt": datetime.utcnow().isoformat()}
        for i in range(51)
    ]
    payload = {
        "attemptId": attempt_id,
        "sourceType": "level",
        "level": 3,
        "answers": items_51,
        "answeredAt": datetime.utcnow().isoformat(),
    }

    # Test on POST /user-question-activity/batch
    res_post = client.post("/api/v1/user-question-activity/batch", json=payload)
    assert res_post.status_code == 400, f"Expected 400, got {res_post.status_code}: {res_post.text}"
    err_detail = res_post.json().get("detail", "")
    assert "tối đa 50" in err_detail
    assert "chia nhỏ" in err_detail
    print(f"    [PASSED] POST /user-question-activity/batch returned 400 with detail: '{err_detail}'")

    # Test on PUT /study-activity/questions
    res_put = client.put("/api/v1/study-activity/questions", json=payload)
    assert res_put.status_code == 400, f"Expected 400, got {res_put.status_code}: {res_put.text}"
    print("    [PASSED] PUT /study-activity/questions also returned 400 Bad Request.")

    app.dependency_overrides.clear()


def test_batch_within_limit_passes_validation():
    print("\n[+] 2. Testing batch size <= 50 items passes validation...")
    mock_user = db.fetch_one("SELECT * FROM users WHERE id = ?", (TEST_USER_ID,), use_cache=False)
    app.dependency_overrides[get_current_user] = lambda: mock_user

    # Fetch 1 real question
    q_row = db.fetch_one("SELECT id, test_id, part, difficulty_level FROM questions WHERE difficulty_level = 3 LIMIT 1", use_cache=False)
    if not q_row:
        q_row = db.fetch_one("SELECT id, test_id, part, difficulty_level FROM questions LIMIT 1", use_cache=False)
    assert q_row is not None

    attempt_id = str(uuid.uuid4())
    payload = {
        "attemptId": attempt_id,
        "sourceType": "test",
        "testId": str(q_row["test_id"]),
        "answers": [
            {
                "questionId": str(q_row["id"]),
                "selectedAnswer": "B",
                "answeredAt": datetime.utcnow().isoformat(),
            }
        ],
        "answeredAt": datetime.utcnow().isoformat(),
    }

    res = client.post("/api/v1/user-question-activity/batch", json=payload)
    assert res.status_code == 200, f"Expected 200, got {res.status_code}: {res.text}"
    assert res.json()["success"] is True
    assert res.json()["saved"] == 1
    print("    [PASSED] Valid batch of 1 item processed successfully.")

    app.dependency_overrides.clear()


if __name__ == "__main__":
    setup_module()
    try:
        test_batch_limit_exceeded_returns_400()
        test_batch_within_limit_passes_validation()
        print("\n=======================================================")
        print("[+] ALL PHASE 6 ACCEPTANCE CRITERIA PASSED CLEANLY!")
        print("=======================================================")
    finally:
        teardown_module()
