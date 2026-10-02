import os
import sys
import unittest
import uuid

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from fastapi.testclient import TestClient
from app.db import db
from app.security import get_current_user
from main import app


class DeleteHistoryEndpointTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.client = TestClient(app)
        user = db.fetch_one("SELECT * FROM users LIMIT 1", use_cache=False)
        cls.user = user
        cls.user_id = user["id"]
        app.dependency_overrides[get_current_user] = lambda: cls.user

        real_test = db.fetch_one("SELECT id FROM tests LIMIT 1", use_cache=False)
        cls.test_id = real_test["id"]

    @classmethod
    def tearDownClass(cls):
        app.dependency_overrides.clear()

    def test_delete_single_attempt(self):
        attempt_id = str(uuid.uuid4())
        db.execute(
            "INSERT INTO test_attempts (id, user_id, test_id, mode, completed_at) VALUES (?, ?, ?, 'exam', NOW())",
            (attempt_id, self.user_id, self.test_id),
        )
        res = self.client.delete(f"/api/v1/study-attempts/{attempt_id}")
        self.assertEqual(res.status_code, 200)
        self.assertTrue(res.json().get("success"))

        rem = db.fetch_one("SELECT * FROM test_attempts WHERE id = ?", (attempt_id,), use_cache=False)
        self.assertIsNone(rem)

    def test_delete_single_attempt_nonexistent_is_safe(self):
        nonexistent_id = str(uuid.uuid4())
        res = self.client.delete(f"/api/v1/study-attempts/{nonexistent_id}")
        self.assertEqual(res.status_code, 200)
        self.assertTrue(res.json().get("success"))

    def test_delete_test_attempts_bulk(self):
        attempt_id_1 = str(uuid.uuid4())
        attempt_id_2 = str(uuid.uuid4())
        db.execute(
            "INSERT INTO test_attempts (id, user_id, test_id, mode, completed_at) VALUES (?, ?, ?, 'exam', NOW())",
            (attempt_id_1, self.user_id, self.test_id),
        )
        db.execute(
            "INSERT INTO test_attempts (id, user_id, test_id, mode, completed_at) VALUES (?, ?, ?, 'exam', NOW())",
            (attempt_id_2, self.user_id, self.test_id),
        )

        res = self.client.delete(f"/api/v1/study-attempts?source_type=test&test_id={self.test_id}")
        self.assertEqual(res.status_code, 200)
        self.assertTrue(res.json().get("success"))
        self.assertGreaterEqual(res.json().get("deletedCount", 0), 2)

        rem1 = db.fetch_one("SELECT * FROM test_attempts WHERE id = ?", (attempt_id_1,), use_cache=False)
        rem2 = db.fetch_one("SELECT * FROM test_attempts WHERE id = ?", (attempt_id_2,), use_cache=False)
        self.assertIsNone(rem1)
        self.assertIsNone(rem2)

    def test_delete_test_missing_test_id_fails_400(self):
        res = self.client.delete("/api/v1/study-attempts?source_type=test")
        self.assertEqual(res.status_code, 400)


if __name__ == "__main__":
    unittest.main()
