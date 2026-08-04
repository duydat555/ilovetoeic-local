import json
from datetime import date, datetime
from typing import List, Literal

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field, field_validator, model_validator

from app.db import db
from app.security import get_current_user


router = APIRouter(prefix="/api/v1/homework", tags=["Homework"])


class HomeworkPayload(BaseModel):
    id: str = Field(min_length=1, max_length=100)
    classIds: List[str] = Field(min_length=1)
    testId: str = Field(min_length=1, max_length=100)
    scope: Literal["full", "parts"]
    selectedParts: List[int] = Field(default_factory=list)
    title: str = Field(min_length=1, max_length=255)
    description: str = Field(default="", max_length=2000)
    deadline: date
    allowLate: bool = False
    createdAt: datetime
    submittedStudentIds: List[str] = Field(default_factory=list)
    lateStudentIds: List[str] = Field(default_factory=list)

    @field_validator("id", "testId", "title")
    @classmethod
    def validate_required_text(cls, value: str):
        normalized = value.strip()
        if not normalized:
            raise ValueError("Giá trị không được để trống.")
        return normalized

    @field_validator("classIds", "submittedStudentIds", "lateStudentIds")
    @classmethod
    def deduplicate_ids(cls, values: List[str]):
        return list(dict.fromkeys(value.strip() for value in values if value.strip()))

    @field_validator("selectedParts")
    @classmethod
    def validate_parts(cls, values: List[int]):
        normalized = sorted(set(values))
        if any(part < 1 or part > 7 for part in normalized):
            raise ValueError("Part phải nằm trong khoảng từ 1 đến 7.")
        return normalized

    @model_validator(mode="after")
    def validate_scope(self):
        if not self.classIds:
            raise ValueError("Cần chọn ít nhất một lớp.")
        if self.scope == "full":
            self.selectedParts = []
        elif not self.selectedParts:
            raise ValueError("Cần chọn ít nhất một Part.")
        return self


def require_admin(user=Depends(get_current_user)):
    if user.get("role") != "admin":
        raise HTTPException(
            status_code=403,
            detail="Chỉ giáo viên mới có thể quản lý bài tập.",
        )
    return user


def parse_json_list(value):
    if isinstance(value, list):
        return value
    if not value:
        return []
    try:
        parsed = json.loads(value)
        return parsed if isinstance(parsed, list) else []
    except (TypeError, json.JSONDecodeError):
        return []


def iso_date(value):
    if isinstance(value, (date, datetime)):
        return value.isoformat()[:10]
    return str(value or "")[:10]


def iso_datetime(value):
    if isinstance(value, datetime):
        return value.replace(tzinfo=None).isoformat(timespec="milliseconds") + "Z"
    normalized = str(value or "")
    return normalized if normalized.endswith("Z") else normalized + "Z"


def homework_response(row):
    return {
        "id": row["id"],
        "classIds": parse_json_list(row.get("class_ids")),
        "testId": row.get("test_id") or "",
        "scope": row.get("scope") or "full",
        "selectedParts": parse_json_list(row.get("selected_parts")),
        "title": row.get("title") or "",
        "description": row.get("description") or "",
        "deadline": iso_date(row.get("deadline")),
        "allowLate": bool(row.get("allow_late")),
        "createdAt": iso_datetime(row.get("created_at")),
        "submittedStudentIds": parse_json_list(row.get("submitted_student_ids")),
        "lateStudentIds": parse_json_list(row.get("late_student_ids")),
    }


def payload_values(payload: HomeworkPayload, created_by: str, created_at=None):
    normalized_created_at = created_at or payload.createdAt.replace(tzinfo=None)
    return (
        payload.id,
        json.dumps(payload.classIds, ensure_ascii=False),
        payload.testId,
        payload.scope,
        json.dumps(payload.selectedParts),
        payload.title,
        payload.description.strip(),
        payload.deadline,
        payload.allowLate,
        json.dumps(payload.submittedStudentIds, ensure_ascii=False),
        json.dumps(payload.lateStudentIds, ensure_ascii=False),
        created_by,
        normalized_created_at,
    )


@router.get("")
def get_homework_assignments(user=Depends(get_current_user)):
    rows = db.fetch_all(
        "SELECT * FROM homework_assignments ORDER BY created_at DESC",
        use_cache=False,
    )
    assignments = [homework_response(row) for row in rows]
    if user.get("role") != "admin":
        memberships = db.fetch_all(
            "SELECT class_id FROM class_memberships WHERE user_id = ?",
            (user["id"],),
            use_cache=False,
        )
        class_ids = {row["class_id"] for row in memberships}
        assignments = [
            assignment
            for assignment in assignments
            if class_ids.intersection(assignment["classIds"])
        ]
    return {"success": True, "data": assignments}


@router.post("", status_code=201)
def create_homework_assignment(
    payload: HomeworkPayload,
    user=Depends(require_admin),
):
    if db.fetch_one(
        "SELECT id FROM homework_assignments WHERE id = ?",
        (payload.id,),
        use_cache=False,
    ):
        raise HTTPException(status_code=409, detail="Mã bài tập đã tồn tại.")

    db.execute(
        """
        INSERT INTO homework_assignments (
            id, class_ids, test_id, scope, selected_parts, title, description,
            deadline, allow_late, submitted_student_ids, late_student_ids,
            created_by, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """,
        payload_values(payload, user["id"]),
    )
    row = db.fetch_one(
        "SELECT * FROM homework_assignments WHERE id = ?",
        (payload.id,),
        use_cache=False,
    )
    return {"success": True, "data": homework_response(row)}


@router.put("/{assignment_id}")
def update_homework_assignment(
    assignment_id: str,
    payload: HomeworkPayload,
    user=Depends(require_admin),
):
    if assignment_id != payload.id:
        raise HTTPException(status_code=400, detail="Mã bài tập không khớp.")

    existing = db.fetch_one(
        "SELECT created_at FROM homework_assignments WHERE id = ?",
        (assignment_id,),
        use_cache=False,
    )
    created_at = existing.get("created_at") if existing else None
    db.execute(
        """
        INSERT INTO homework_assignments (
            id, class_ids, test_id, scope, selected_parts, title, description,
            deadline, allow_late, submitted_student_ids, late_student_ids,
            created_by, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE
            class_ids = VALUES(class_ids),
            test_id = VALUES(test_id),
            scope = VALUES(scope),
            selected_parts = VALUES(selected_parts),
            title = VALUES(title),
            description = VALUES(description),
            deadline = VALUES(deadline),
            allow_late = VALUES(allow_late),
            submitted_student_ids = VALUES(submitted_student_ids),
            late_student_ids = VALUES(late_student_ids),
            created_by = VALUES(created_by)
        """,
        payload_values(payload, user["id"], created_at=created_at),
    )
    row = db.fetch_one(
        "SELECT * FROM homework_assignments WHERE id = ?",
        (assignment_id,),
        use_cache=False,
    )
    return {"success": True, "data": homework_response(row)}


@router.delete("/{assignment_id}")
def delete_homework_assignment(
    assignment_id: str,
    _user=Depends(require_admin),
):
    existing = db.fetch_one(
        "SELECT submitted_student_ids FROM homework_assignments WHERE id = ?",
        (assignment_id,),
        use_cache=False,
    )
    if existing and parse_json_list(existing.get("submitted_student_ids")):
        raise HTTPException(
            status_code=409,
            detail="Không thể huỷ bài tập đã có học sinh nộp.",
        )
    db.execute("DELETE FROM homework_assignments WHERE id = ?", (assignment_id,))
    return {"success": True}
