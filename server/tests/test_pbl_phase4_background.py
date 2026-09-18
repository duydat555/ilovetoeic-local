import sys
import os
import uuid
from datetime import date, datetime, timedelta

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from fastapi.testclient import TestClient
from main import app
from app.db import db
from app.security import get_current_user
from app.routers.user_data import (
    record_practice_streak,
    _handle_study_attempt_side_effects,
)

client = TestClient(app)

TEST_USER_ID = f"test_user_pbl4_{uuid.uuid4().hex[:8]}"

def setup_module():
    # Insert test user
    db.execute(
        """
        INSERT INTO users (id, email, full_name, role, approval_status, streak_days, longest_streak, last_study_date, current_score)
        VALUES (?, ?, ?, 'student', 'approved', 0, 0, NULL, 0)
        ON DUPLICATE KEY UPDATE id = id
        """,
        (TEST_USER_ID, f"{TEST_USER_ID}@test.com", "Test PBL User"),
    )

def teardown_module():
    # Clean up test user and artifacts
    db.execute("DELETE FROM user_notifications WHERE user_id = ?", (TEST_USER_ID,))
    db.execute("DELETE FROM user_question_activity WHERE user_id = ?", (TEST_USER_ID,))
    db.execute("DELETE FROM test_attempts WHERE user_id = ?", (TEST_USER_ID,))
    db.execute("DELETE FROM users WHERE id = ?", (TEST_USER_ID,))

def test_early_exit_in_record_practice_streak():
    print("\n[+] 1. Testing early-exit in record_practice_streak...")
    today = date.today()
    
    # Set user's last_study_date to today
    db.execute(
        "UPDATE users SET streak_days = 5, longest_streak = 5, last_study_date = ? WHERE id = ?",
        (today, TEST_USER_ID),
    )
    user = db.fetch_one("SELECT * FROM users WHERE id = ?", (TEST_USER_ID,), use_cache=False)
    assert user["last_study_date"] == today
    assert user["streak_days"] == 5

    # Calling record_practice_streak when already studied today should early-exit
    record_practice_streak(user)

    # Streak should remain untouched (5)
    updated_user = db.fetch_one("SELECT * FROM users WHERE id = ?", (TEST_USER_ID,), use_cache=False)
    assert updated_user["streak_days"] == 5
    print("    [PASSED] Early-exit successfully skipped redundant UPDATE.")

def test_streak_increment_when_yesterday_studied():
    print("\n[+] 2. Testing streak increment when yesterday was studied...")
    yesterday = date.today() - timedelta(days=1)
    db.execute(
        "UPDATE users SET streak_days = 3, longest_streak = 3, last_study_date = ? WHERE id = ?",
        (yesterday, TEST_USER_ID),
    )
    user = db.fetch_one("SELECT * FROM users WHERE id = ?", (TEST_USER_ID,), use_cache=False)
    assert user["streak_days"] == 3

    record_practice_streak(user)

    updated_user = db.fetch_one("SELECT * FROM users WHERE id = ?", (TEST_USER_ID,), use_cache=False)
    assert updated_user["streak_days"] == 4
    assert updated_user["longest_streak"] == 4
    assert updated_user["last_study_date"] == date.today()
    print("    [PASSED] Streak incremented correctly from 3 to 4.")

def test_save_study_attempt_background_side_effects():
    print("\n[+] 3. Testing PUT /study-attempts/{attempt_id} with BackgroundTasks...")
    mock_user = db.fetch_one("SELECT * FROM users WHERE id = ?", (TEST_USER_ID,), use_cache=False)
    app.dependency_overrides[get_current_user] = lambda: mock_user

    attempt_id = str(uuid.uuid4())
    payload = {
        "id": attempt_id,
        "mode": "practice",
        "part": 5,
        "totalQuestions": 30,
        "answeredQuestions": 30,
        "correctAnswers": 25,
        "accuracyRate": 83.33,
        "timeSpentSeconds": 600,
        "listeningCorrect": 0,
        "readingCorrect": 25,
        "listeningScore": 0,
        "readingScore": 380,
        "totalScore": 380,
        "answers": {},
        "questionIds": [],
        "metadata": {"source": "level_practice", "selected_level": 3, "selected_part": 5},
        "completedAt": datetime.utcnow().isoformat(),
    }

    res = client.put(f"/api/v1/study-attempts/{attempt_id}", json=payload)
    assert res.status_code == 200, f"Failed: {res.text}"
    assert res.json() == {"success": True}

    # Verify attempt is saved in DB
    saved_attempt = db.fetch_one("SELECT * FROM test_attempts WHERE id = ?", (attempt_id,), use_cache=False)
    assert saved_attempt is not None
    assert saved_attempt["correct_answers"] == 25

    # Verify notification created by background task
    notif = db.fetch_one(
        "SELECT * FROM user_notifications WHERE user_id = ? AND dedupe_key = ?",
        (TEST_USER_ID, f"study-attempt:{attempt_id}"),
        use_cache=False,
    )
    assert notif is not None
    assert "đúng 25/30 câu" in notif["message"]
    print("    [PASSED] Primary attempt persisted and background notification generated cleanly.")

    app.dependency_overrides.clear()

def test_save_question_activity_batch_endpoint():
    print("\n[+] 4. Testing POST /user-question-activity/batch alias and execution...")
    # Find a valid question in DB to use in payload
    q_row = db.fetch_one("SELECT id, test_id, part, difficulty_level FROM questions LIMIT 1", use_cache=False)
    assert q_row is not None, "Need at least one question in DB"

    mock_user = db.fetch_one("SELECT * FROM users WHERE id = ?", (TEST_USER_ID,), use_cache=False)
    app.dependency_overrides[get_current_user] = lambda: mock_user

    attempt_id = str(uuid.uuid4())
    payload = {
        "attemptId": attempt_id,
        "sourceType": "test",
        "testId": str(q_row["test_id"]),
        "answers": [
            {
                "questionId": str(q_row["id"]),
                "selectedAnswer": "A",
                "answeredAt": datetime.utcnow().isoformat(),
            }
        ],
        "answeredAt": datetime.utcnow().isoformat(),
    }

    # Test calling the new endpoint alias /user-question-activity/batch
    res = client.post("/api/v1/user-question-activity/batch", json=payload)
    assert res.status_code == 200, f"Batch endpoint failed: {res.text}"
    data = res.json()
    assert data["success"] is True
    assert data["saved"] == 1
    print("    [PASSED] POST /user-question-activity/batch responded successfully with BackgroundTasks.")

    app.dependency_overrides.clear()


if __name__ == "__main__":
    setup_module()
    try:
        test_early_exit_in_record_practice_streak()
        test_streak_increment_when_yesterday_studied()
        test_save_study_attempt_background_side_effects()
        test_save_question_activity_batch_endpoint()
        print("\n=======================================================")
        print("[+] ALL PHASE 4 VERIFICATION TESTS PASSED CLEANLY!")
        print("=======================================================")
    finally:
        teardown_module()
