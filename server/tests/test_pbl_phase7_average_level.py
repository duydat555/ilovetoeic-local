import sys
import os
import uuid
from datetime import datetime

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from fastapi.testclient import TestClient
from main import app
from app.db import db
from app.security import get_current_user
from app.services.cache_service import cache_service

client = TestClient(app)

TEST_USER_ID = f"test_user_pbl7_{uuid.uuid4().hex[:8]}"

def setup_module():
    db.execute(
        """
        INSERT INTO users (id, email, full_name, role, approval_status, streak_days, longest_streak, last_study_date, current_score)
        VALUES (?, ?, ?, 'student', 'approved', 0, 0, NULL, 0)
        ON DUPLICATE KEY UPDATE id = id
        """,
        (TEST_USER_ID, f"{TEST_USER_ID}@test.com", "Test PBL 7 User"),
    )

def teardown_module():
    cache_service.delete(f"user:level_stats:{TEST_USER_ID}")
    db.execute("DELETE FROM user_level_stats WHERE user_id = ?", (TEST_USER_ID,))
    db.execute("DELETE FROM user_notifications WHERE user_id = ?", (TEST_USER_ID,))
    db.execute("DELETE FROM test_attempts WHERE user_id = ?", (TEST_USER_ID,))
    db.execute("DELETE FROM users WHERE id = ?", (TEST_USER_ID,))


def test_initial_empty_stats():
    print("\n[+] 1. Testing GET /practice-by-level/stats for new user...")
    mock_user = db.fetch_one("SELECT * FROM users WHERE id = ?", (TEST_USER_ID,), use_cache=False)
    app.dependency_overrides[get_current_user] = lambda: mock_user

    res = client.get("/api/v1/practice-by-level/stats")
    assert res.status_code == 200, f"Failed: {res.text}"
    data = res.json()
    assert data["success"] is True
    assert data["average_level"] is None
    assert data["parts"] == []
    print("    [PASSED] New user has average_level: None and parts: [].")

    app.dependency_overrides.clear()


def test_qualifying_attempt_increments_level_stats():
    print("\n[+] 2. Testing qualifying attempt (>= 70%) increments user_level_stats...")
    mock_user = db.fetch_one("SELECT * FROM users WHERE id = ?", (TEST_USER_ID,), use_cache=False)
    app.dependency_overrides[get_current_user] = lambda: mock_user

    # Submit Part 5 Level 2 attempt at the exact 70% threshold
    att1_id = str(uuid.uuid4())
    payload = {
        "id": att1_id,
        "mode": "practice",
        "part": 5,
        "level": 2,
        "totalQuestions": 20,
        "answeredQuestions": 20,
        "correctAnswers": 14,
        "accuracyRate": 70.0,
        "timeSpentSeconds": 300,
        "listeningCorrect": 0,
        "readingCorrect": 14,
        "listeningScore": 0,
        "readingScore": 240,
        "totalScore": 240,
        "answers": {},
        "questionIds": [],
        "metadata": {"source": "level_practice", "selected_level": 2, "selected_part": 5},
        "completedAt": datetime.utcnow().isoformat(),
    }

    res = client.put(
        f"/api/v1/study-attempts/{att1_id}",
        json=payload,
        headers={"x-test-force-sync": "1"},
    )
    assert res.status_code == 200

    # Query /practice-by-level/stats
    res_stats = client.get("/api/v1/practice-by-level/stats")
    assert res_stats.status_code == 200
    stats = res_stats.json()
    assert stats["average_level"] == 2.0
    assert stats["parts"] == [{"part": 5, "max_level": 2}]
    print(f"    [PASSED] Exact 70% threshold updated stats: average_level={stats['average_level']}, parts={stats['parts']}")

    app.dependency_overrides.clear()


def test_rounded_up_accuracy_does_not_bump_level():
    print("\n[+] 3. Testing exact ratio below 70% is not rounded up into a pass...")
    mock_user = db.fetch_one("SELECT * FROM users WHERE id = ?", (TEST_USER_ID,), use_cache=False)
    app.dependency_overrides[get_current_user] = lambda: mock_user

    attempt_id = str(uuid.uuid4())
    payload = {
        "id": attempt_id,
        "mode": "practice",
        "part": 6,
        "level": 5,
        "totalQuestions": 23,
        "answeredQuestions": 23,
        "correctAnswers": 16,
        "accuracyRate": 70.0,
        "timeSpentSeconds": 300,
        "listeningCorrect": 0,
        "readingCorrect": 16,
        "listeningScore": 0,
        "readingScore": 0,
        "totalScore": 0,
        "answers": {},
        "questionIds": [],
        "metadata": {"source": "level_practice", "selected_level": 5, "selected_part": 6},
        "completedAt": datetime.utcnow().isoformat(),
    }

    res = client.put(
        f"/api/v1/study-attempts/{attempt_id}",
        json=payload,
        headers={"x-test-force-sync": "1"},
    )
    assert res.status_code == 200
    cache_service.delete(f"user:level_stats:{TEST_USER_ID}")
    stats = client.get("/api/v1/practice-by-level/stats").json()
    assert stats["parts"] == [{"part": 5, "max_level": 2}]
    print("    [PASSED] 16/23 remained below the exact 70% threshold.")

    app.dependency_overrides.clear()


def test_incomplete_and_retry_attempts_do_not_bump_level():
    print("\n[+] 4. Testing incomplete and retry attempts are excluded...")
    mock_user = db.fetch_one("SELECT * FROM users WHERE id = ?", (TEST_USER_ID,), use_cache=False)
    app.dependency_overrides[get_current_user] = lambda: mock_user

    invalid_attempts = [
        {
            "part": 6,
            "level": 4,
            "totalQuestions": 20,
            "answeredQuestions": 10,
            "correctAnswers": 10,
            "accuracyRate": 100.0,
            "metadata": {"source": "level_practice", "selected_level": 4, "selected_part": 6},
        },
        {
            "part": 7,
            "level": 5,
            "totalQuestions": 4,
            "answeredQuestions": 4,
            "correctAnswers": 4,
            "accuracyRate": 100.0,
            "metadata": {
                "source": "wrong_practice",
                "is_wrong_retry": True,
                "wrong_source": "level",
                "selected_level": 5,
                "selected_part": 7,
            },
        },
    ]
    for values in invalid_attempts:
        attempt_id = str(uuid.uuid4())
        payload = {
            "id": attempt_id,
            "mode": "practice",
            "timeSpentSeconds": 60,
            "listeningCorrect": 0,
            "readingCorrect": values["correctAnswers"],
            "listeningScore": 0,
            "readingScore": 0,
            "totalScore": 0,
            "answers": {},
            "questionIds": [],
            "completedAt": datetime.utcnow().isoformat(),
            **values,
        }
        res = client.put(
            f"/api/v1/study-attempts/{attempt_id}",
            json=payload,
            headers={"x-test-force-sync": "1"},
        )
        assert res.status_code == 200

    # Remove the precomputed rows to exercise the lazy backfill path as well.
    db.execute("DELETE FROM user_level_stats WHERE user_id = ?", (TEST_USER_ID,))
    cache_service.delete(f"user:level_stats:{TEST_USER_ID}")
    stats = client.get("/api/v1/practice-by-level/stats").json()
    assert stats["parts"] == [{"part": 5, "max_level": 2}]
    print("    [PASSED] Incremental update and lazy backfill both excluded incomplete/retry attempts.")

    app.dependency_overrides.clear()


def test_failing_attempt_does_not_bump_level():
    print("\n[+] 5. Testing failing attempt (< 70%) does not bump level...")
    mock_user = db.fetch_one("SELECT * FROM users WHERE id = ?", (TEST_USER_ID,), use_cache=False)
    app.dependency_overrides[get_current_user] = lambda: mock_user

    # Submit Part 5 Level 4 attempt with 50% accuracy (failed)
    att2_id = str(uuid.uuid4())
    payload = {
        "id": att2_id,
        "mode": "practice",
        "part": 5,
        "level": 4,
        "totalQuestions": 20,
        "answeredQuestions": 20,
        "correctAnswers": 10,
        "accuracyRate": 50.0,
        "timeSpentSeconds": 300,
        "listeningCorrect": 0,
        "readingCorrect": 10,
        "listeningScore": 0,
        "readingScore": 150,
        "totalScore": 150,
        "answers": {},
        "questionIds": [],
        "metadata": {"source": "level_practice", "selected_level": 4, "selected_part": 5},
        "completedAt": datetime.utcnow().isoformat(),
    }

    res = client.put(
        f"/api/v1/study-attempts/{att2_id}",
        json=payload,
        headers={"x-test-force-sync": "1"},
    )
    assert res.status_code == 200

    # Stats should still have Part 5 at Level 2
    res_stats = client.get("/api/v1/practice-by-level/stats")
    stats = res_stats.json()
    assert stats["average_level"] == 2.0
    assert stats["parts"] == [{"part": 5, "max_level": 2}]
    print("    [PASSED] Failing attempt did not update max_level.")

    app.dependency_overrides.clear()


def test_higher_qualifying_attempt_and_multiple_parts():
    print("\n[+] 4. Testing higher qualifying attempt (Level 4) and multi-part Average Level...")
    mock_user = db.fetch_one("SELECT * FROM users WHERE id = ?", (TEST_USER_ID,), use_cache=False)
    app.dependency_overrides[get_current_user] = lambda: mock_user

    # Submit Part 5 Level 4 attempt with 90% accuracy (passed!)
    att3_id = str(uuid.uuid4())
    payload3 = {
        "id": att3_id,
        "mode": "practice",
        "part": 5,
        "level": 4,
        "totalQuestions": 20,
        "answeredQuestions": 20,
        "correctAnswers": 18,
        "accuracyRate": 90.0,
        "timeSpentSeconds": 300,
        "listeningCorrect": 0,
        "readingCorrect": 18,
        "listeningScore": 0,
        "readingScore": 270,
        "totalScore": 270,
        "answers": {},
        "questionIds": [],
        "metadata": {"source": "level_practice", "selected_level": 4, "selected_part": 5},
        "completedAt": datetime.utcnow().isoformat(),
    }
    client.put(
        f"/api/v1/study-attempts/{att3_id}",
        json=payload3,
        headers={"x-test-force-sync": "1"},
    )

    # Submit Part 6 Level 2 attempt with 85% accuracy (passed!)
    att4_id = str(uuid.uuid4())
    payload4 = {
        "id": att4_id,
        "mode": "practice",
        "part": 6,
        "level": 2,
        "totalQuestions": 16,
        "answeredQuestions": 16,
        "correctAnswers": 14,
        "accuracyRate": 87.5,
        "timeSpentSeconds": 240,
        "listeningCorrect": 0,
        "readingCorrect": 14,
        "listeningScore": 0,
        "readingScore": 210,
        "totalScore": 210,
        "answers": {},
        "questionIds": [],
        "metadata": {"source": "level_practice", "selected_level": 2, "selected_part": 6},
        "completedAt": datetime.utcnow().isoformat(),
    }
    client.put(
        f"/api/v1/study-attempts/{att4_id}",
        json=payload4,
        headers={"x-test-force-sync": "1"},
    )

    # Average level should be (4 + 2) / 2 = 3.0
    res_stats = client.get("/api/v1/practice-by-level/stats")
    stats = res_stats.json()
    assert stats["average_level"] == 3.0
    assert stats["parts"] == [{"part": 5, "max_level": 4}, {"part": 6, "max_level": 2}]
    print(f"    [PASSED] Multi-part Average Level precomputed correctly: {stats['average_level']}")

    app.dependency_overrides.clear()


def test_cascade_deletion_recomputes_stats():
    print("\n[+] 5. Testing cascade deletion recomputes level stats...")
    mock_user = db.fetch_one("SELECT * FROM users WHERE id = ?", (TEST_USER_ID,), use_cache=False)
    app.dependency_overrides[get_current_user] = lambda: mock_user

    # Delete Part 5 Level 4 attempts
    del_res = client.delete("/api/v1/study-attempts?source_type=level&part=5&level=4")
    assert del_res.status_code == 200

    # Part 5 should now fall back to Level 2 (from att1)
    # Average level should now be (2 + 2) / 2 = 2.0
    res_stats = client.get("/api/v1/practice-by-level/stats")
    stats = res_stats.json()
    assert stats["average_level"] == 2.0
    assert stats["parts"] == [{"part": 5, "max_level": 2}, {"part": 6, "max_level": 2}]
    print(f"    [PASSED] After deleting Level 4, Part 5 fell back to Level 2 and avg={stats['average_level']}")

    app.dependency_overrides.clear()


def test_single_attempt_deletion_recomputes_level_stats():
    print("\n[+] 6. Testing single-attempt deletion recomputes the affected Part...")
    mock_user = db.fetch_one("SELECT * FROM users WHERE id = ?", (TEST_USER_ID,), use_cache=False)
    app.dependency_overrides[get_current_user] = lambda: mock_user

    attempt_id = str(uuid.uuid4())
    payload = {
        "id": attempt_id,
        "mode": "practice",
        "part": 5,
        "level": 5,
        "totalQuestions": 10,
        "answeredQuestions": 10,
        "correctAnswers": 8,
        "accuracyRate": 80.0,
        "timeSpentSeconds": 180,
        "listeningCorrect": 0,
        "readingCorrect": 8,
        "listeningScore": 0,
        "readingScore": 0,
        "totalScore": 0,
        "answers": {},
        "questionIds": [],
        "metadata": {"source": "level_practice", "selected_level": 5, "selected_part": 5},
        "completedAt": datetime.utcnow().isoformat(),
    }
    res = client.put(
        f"/api/v1/study-attempts/{attempt_id}",
        json=payload,
        headers={"x-test-force-sync": "1"},
    )
    assert res.status_code == 200
    assert client.get("/api/v1/practice-by-level/stats").json()["parts"][0] == {"part": 5, "max_level": 5}

    delete_res = client.delete(f"/api/v1/study-attempts/{attempt_id}")
    assert delete_res.status_code == 200
    stats = client.get("/api/v1/practice-by-level/stats").json()
    assert {"part": 5, "max_level": 5} not in stats["parts"]
    assert {"part": 5, "max_level": 2} in stats["parts"]
    print("    [PASSED] Single deletion fell back to the next valid Level and cleared cache.")

    app.dependency_overrides.clear()


if __name__ == "__main__":
    setup_module()
    try:
        test_initial_empty_stats()
        test_qualifying_attempt_increments_level_stats()
        test_rounded_up_accuracy_does_not_bump_level()
        test_incomplete_and_retry_attempts_do_not_bump_level()
        test_failing_attempt_does_not_bump_level()
        test_higher_qualifying_attempt_and_multiple_parts()
        test_cascade_deletion_recomputes_stats()
        test_single_attempt_deletion_recomputes_level_stats()
        print("\n=======================================================")
        print("[+] ALL PHASE 7 ACCEPTANCE CRITERIA PASSED CLEANLY!")
        print("=======================================================")
    finally:
        teardown_module()
