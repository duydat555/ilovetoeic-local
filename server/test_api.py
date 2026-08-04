import sys
from fastapi.testclient import TestClient
from main import app

client = TestClient(app)

print("[+] Testing GET /api/v1/status...")
res = client.get("/api/v1/status")
assert res.status_code == 200
print("   Response:", res.json())

print("\n[+] Testing GET /api/v1/test-sets...")
res = client.get("/api/v1/test-sets")
assert res.status_code == 200
test_sets = res.json()["data"]
print(f"   Fetched {len(test_sets)} test sets. Sample:", test_sets[0] if test_sets else None)

print("\n[+] Testing GET /api/v1/tests...")
res = client.get("/api/v1/tests")
assert res.status_code == 200
tests = res.json()["data"]
print(f"   Fetched {len(tests)} tests. Sample:", tests[0]["name"] if tests else None)

if tests:
    first_test_id = tests[0]["id"]
    print(f"\n[+] Testing GET /api/v1/tests/{first_test_id}...")
    res = client.get(f"/api/v1/tests/{first_test_id}")
    assert res.status_code == 200
    print("   Test Detail:", res.json()["data"]["name"])

    print(f"\n[+] Testing GET /api/v1/tests/{first_test_id}/parts/5...")
    res = client.get(f"/api/v1/tests/{first_test_id}/parts/5")
    assert res.status_code == 200
    part5_data = res.json()
    print(f"   Fetched Part 5 questions count: {part5_data['total_questions']}")

    print(f"\n[+] Testing POST /api/v1/tests/{first_test_id}/submit...")
    payload = {
        "user_id": "test_user_1",
        "time_spent_seconds": 1200,
        "answers": [
            {"question_id": part5_data["standalone_questions"][0]["id"], "selected_option": "A"}
        ]
    }
    res = client.post(f"/api/v1/tests/{first_test_id}/submit", json=payload)
    assert res.status_code == 200
    submit_res = res.json()
    print(f"   Submitted! Listening Correct: {submit_res['listening_correct']}, Reading Correct: {submit_res['reading_correct']}, Total Score: {submit_res['total_score']}")

print("\n[+] All REST API tests passed cleanly!")
