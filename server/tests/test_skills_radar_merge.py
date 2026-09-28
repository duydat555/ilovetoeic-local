import os
import sys
import unittest
from unittest.mock import patch

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.services.study_progress_service import get_user_skills_radar


class SkillsRadarMergeTests(unittest.TestCase):
    def test_new_listening_activity_does_not_hide_legacy_reading_history(self):
        activity_rows = [
            {
                "attempt_id": "listening-live",
                "question_id": f"l-{index}",
                "part": 1,
                "is_correct": 1,
            }
            for index in range(12)
        ]
        reading_ids = [f"r-{index}" for index in range(437)]
        attempts = [{
            "id": "legacy-reading",
            "part": None,
            "answered_questions": 437,
            "correct_answers": 400,
            "answers": {question_id: "A" for question_id in reading_ids},
            "question_ids": reading_ids,
            "metadata": {},
        }]
        reading_questions = [
            {"id": question_id, "part": 5, "correct_answer": "A"}
            for question_id in reading_ids
        ]

        with patch("app.services.study_progress_service.db.fetch_all") as fetch_all:
            fetch_all.side_effect = [activity_rows, attempts, reading_questions]
            result = get_user_skills_radar("user-1")

        part_1 = next(item for item in result["radarData"] if item["partNumber"] == 1)
        part_5 = next(item for item in result["radarData"] if item["partNumber"] == 5)
        self.assertEqual(part_1["totalAnswered"], 12)
        self.assertEqual(part_5["totalAnswered"], 437)
        self.assertEqual(part_5["totalCorrect"], 437)
        self.assertEqual(result["totalAnswered"], 449)

    def test_activity_and_attempt_snapshot_are_deduplicated_per_question(self):
        activity_rows = [{
            "attempt_id": "attempt-1",
            "question_id": "q-1",
            "part": 5,
            "is_correct": 1,
        }]
        attempts = [{
            "id": "attempt-1",
            "part": 5,
            "answered_questions": 2,
            "correct_answers": 2,
            "answers": {"q-1": "A", "q-2": "B"},
            "question_ids": ["q-1", "q-2"],
            "metadata": {},
        }]
        question_rows = [{"id": "q-2", "part": 5, "correct_answer": "B"}]

        with patch("app.services.study_progress_service.db.fetch_all") as fetch_all:
            fetch_all.side_effect = [activity_rows, attempts, question_rows]
            result = get_user_skills_radar("user-1")

        part_5 = next(item for item in result["radarData"] if item["partNumber"] == 5)
        self.assertEqual(part_5["totalAnswered"], 2)
        self.assertEqual(part_5["totalCorrect"], 2)

    def test_partial_activity_sync_does_not_hide_legacy_part_stats(self):
        activity_rows = [{
            "attempt_id": "legacy-mixed",
            "question_id": "new-listening-1",
            "part": 1,
            "is_correct": 1,
        }]
        attempts = [{
            "id": "legacy-mixed",
            "part": None,
            "answered_questions": 438,
            "correct_answers": 401,
            "answers": {},
            "question_ids": [],
            "metadata": {
                "partStats": [
                    {"part": 1, "answered": 1, "correct": 1},
                    {"part": 5, "answered": 437, "correct": 400},
                ]
            },
        }]

        with patch("app.services.study_progress_service.db.fetch_all") as fetch_all:
            fetch_all.side_effect = [activity_rows, attempts]
            result = get_user_skills_radar("user-1")

        part_1 = next(item for item in result["radarData"] if item["partNumber"] == 1)
        part_5 = next(item for item in result["radarData"] if item["partNumber"] == 5)
        self.assertEqual(part_1["totalAnswered"], 1)
        self.assertEqual(part_5["totalAnswered"], 437)
        self.assertEqual(part_5["totalCorrect"], 400)

    def test_legacy_single_part_attempt_without_snapshots_still_counts(self):
        attempts = [{
            "id": "legacy-part-7",
            "part": 7,
            "answered_questions": 25,
            "correct_answers": 20,
            "answers": {},
            "question_ids": [],
            "metadata": {},
        }]

        with patch("app.services.study_progress_service.db.fetch_all") as fetch_all:
            fetch_all.side_effect = [[], attempts]
            result = get_user_skills_radar("user-1")

        part_7 = next(item for item in result["radarData"] if item["partNumber"] == 7)
        self.assertEqual(part_7["totalAnswered"], 25)
        self.assertEqual(part_7["totalCorrect"], 20)


if __name__ == "__main__":
    unittest.main()
