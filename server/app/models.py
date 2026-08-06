from typing import List, Optional
from pydantic import BaseModel

class UserAnswer(BaseModel):
    question_id: str
    selected_option: Optional[str] = None  # 'A', 'B', 'C', 'D' or None if skipped

class TestSubmissionRequest(BaseModel):
    user_id: Optional[str] = "guest"
    time_spent_seconds: Optional[int] = 0
    answers: List[UserAnswer]

class QuestionResult(BaseModel):
    question_id: str
    question_number: int
    part: int
    user_answer: Optional[str]
    correct_answer: str
    is_correct: bool
    explanation_vi: Optional[str]
    dich_nghia: Optional[str]
    tu_vung: Optional[str]

class TestSubmissionResponse(BaseModel):
    attempt_id: str
    test_id: str
    test_name: Optional[str] = None
    test_year: Optional[int] = None
    listening_correct: int
    reading_correct: int
    total_correct: int
    listening_score: int
    reading_score: int
    total_score: int
    results: List[QuestionResult]
