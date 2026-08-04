import json
import re
import uuid
from datetime import date, datetime
from typing import List

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field, field_validator
from pymysql.err import IntegrityError

from app.db import db
from app.notifications import create_notification
from app.security import active_streak_days, get_current_user, get_dicebear_avatar


router = APIRouter(prefix="/api/v1/classes", tags=["Class management"])
CLASS_CODE_PATTERN = re.compile(r"^[A-Z0-9][A-Z0-9-]{1,18}[A-Z0-9]$")


class ClassPayload(BaseModel):
    name: str = Field(min_length=2, max_length=255)
    code: str = Field(min_length=3, max_length=20)
    description: str = Field(default="", max_length=1000)
    targetScore: int = Field(default=750, ge=10, le=990)
    studentIds: List[str] = Field(default_factory=list, max_length=500)
    isActive: bool = True

    @field_validator("name")
    @classmethod
    def normalize_name(cls, value: str):
        normalized = " ".join(value.strip().split())
        if len(normalized) < 2:
            raise ValueError("Tên lớp phải có ít nhất 2 ký tự.")
        return normalized

    @field_validator("code")
    @classmethod
    def normalize_code(cls, value: str):
        normalized = value.strip().upper()
        if not CLASS_CODE_PATTERN.match(normalized):
            raise ValueError("Mã lớp chỉ gồm chữ in hoa, số và dấu gạch nối.")
        return normalized

    @field_validator("studentIds")
    @classmethod
    def deduplicate_students(cls, values: List[str]):
        return list(dict.fromkeys(value.strip() for value in values if value.strip()))


def require_admin(user=Depends(get_current_user)):
    if user.get("role") != "admin":
        raise HTTPException(
            status_code=403,
            detail="Chỉ Giáo viên mới có thể quản lý lớp học.",
        )
    return user


def iso_datetime(value):
    if isinstance(value, datetime):
        return value.replace(tzinfo=None).isoformat(timespec="milliseconds") + "Z"
    normalized = str(value or "")
    return normalized if normalized.endswith("Z") else normalized + "Z"


def validate_student_ids(student_ids: List[str]):
    if not student_ids:
        return
    placeholders = ", ".join("?" for _ in student_ids)
    rows = db.fetch_all(
        f"SELECT id FROM users WHERE role = 'student' AND id IN ({placeholders})",
        tuple(student_ids),
        use_cache=False,
    )
    valid_ids = {row["id"] for row in rows}
    if len(valid_ids) != len(student_ids):
        raise HTTPException(
            status_code=422,
            detail="Danh sách có tài khoản không phải Học sinh hoặc không còn tồn tại.",
        )


def class_rows(admin_id: str, class_id: str = ""):
    where = "c.created_by = ?"
    params = [admin_id]
    if class_id:
        where += " AND c.id = ?"
        params.append(class_id)
    rows = db.fetch_all(
        f"""
        SELECT
            c.*,
            COUNT(cm.user_id) AS student_count,
            COALESCE(ROUND(AVG(
                CASE
                    WHEN u.target_score > 0
                    THEN LEAST(100, (u.current_score / u.target_score) * 100)
                    ELSE 0
                END
            )), 0) AS average_progress
        FROM learning_classes c
        LEFT JOIN class_memberships cm ON cm.class_id = c.id
        LEFT JOIN users u ON u.id = cm.user_id
        WHERE {where}
        GROUP BY c.id
        ORDER BY c.created_at DESC, c.name ASC
        """,
        tuple(params),
        use_cache=False,
    )
    if not rows:
        return []
    ids = [row["id"] for row in rows]
    placeholders = ", ".join("?" for _ in ids)
    memberships = db.fetch_all(
        f"""
        SELECT class_id, user_id
        FROM class_memberships
        WHERE class_id IN ({placeholders})
        ORDER BY joined_at ASC
        """,
        tuple(ids),
        use_cache=False,
    )
    student_ids_by_class = {item_id: [] for item_id in ids}
    for membership in memberships:
        student_ids_by_class[membership["class_id"]].append(membership["user_id"])
    return [serialize_class(row, student_ids_by_class[row["id"]]) for row in rows]


def serialize_class(row, student_ids):
    return {
        "id": row["id"],
        "name": row.get("name") or "",
        "code": row.get("code") or "",
        "description": row.get("description") or "",
        "targetScore": int(row.get("target_score") or 750),
        "studentIds": student_ids,
        "studentCount": int(row.get("student_count") or len(student_ids)),
        "averageProgress": int(row.get("average_progress") or 0),
        "isActive": bool(row.get("is_active")),
        "createdAt": iso_datetime(row.get("created_at")),
        "updatedAt": iso_datetime(row.get("updated_at")),
    }


def student_response(row):
    created_at = row.get("created_at")
    if isinstance(created_at, (date, datetime)):
        created_at = created_at.isoformat()
    name = row.get("full_name") or "Học viên TOEIC"
    return {
        "id": row["id"],
        "name": name,
        "email": row.get("email") or "",
        "avatar": row.get("avatar_url") or get_dicebear_avatar(name or row["id"]),
        "currentScore": int(row.get("current_score") or 0),
        "targetScore": int(row.get("target_score") or 750),
        "streakDays": active_streak_days(row),
        "lastStudyDate": (
            row.get("last_study_date").isoformat()
            if isinstance(row.get("last_study_date"), (date, datetime))
            else str(row.get("last_study_date") or "")
        ),
        "createdAt": str(created_at or ""),
    }


def owned_class_or_404(class_id: str, admin_id: str):
    row = db.fetch_one(
        "SELECT id FROM learning_classes WHERE id = ? AND created_by = ?",
        (class_id, admin_id),
        use_cache=False,
    )
    if not row:
        raise HTTPException(status_code=404, detail="Lớp học không tồn tại.")
    return row


def assignment_uses_class(class_id: str):
    rows = db.fetch_all(
        "SELECT class_ids FROM homework_assignments",
        use_cache=False,
    )
    for row in rows:
        value = row.get("class_ids")
        try:
            ids = value if isinstance(value, list) else json.loads(value or "[]")
        except (TypeError, json.JSONDecodeError):
            ids = []
        if class_id in ids:
            return True
    return False


def notify_student_added(student_id: str, class_id: str, name: str, code: str):
    try:
        create_notification(
            student_id,
            "system",
            f"Bạn đã tham gia lớp {name}",
            f"Mã lớp {code}. Giáo viên sẽ giao bài và theo dõi tiến độ tại lớp này.",
            action_url="/dashboard",
            dedupe_key=f"class-membership:{class_id}:{student_id}",
        )
    except Exception as error:
        print(f"[!] Cannot create class membership notification: {error}")


@router.get("")
def get_classes(user=Depends(require_admin)):
    return {"success": True, "data": class_rows(user["id"])}


@router.get("/students")
def get_available_students(_user=Depends(require_admin)):
    rows = db.fetch_all(
        """
        SELECT id, full_name, email, avatar_url, current_score, target_score,
               streak_days, last_study_date, created_at
        FROM users
        WHERE role = 'student'
        ORDER BY full_name ASC, email ASC
        """,
        use_cache=False,
    )
    return {"success": True, "data": [student_response(row) for row in rows]}


@router.post("", status_code=201)
def create_class(payload: ClassPayload, user=Depends(require_admin)):
    validate_student_ids(payload.studentIds)
    class_id = f"class-{uuid.uuid4().hex[:20]}"
    try:
        with db.transaction() as conn:
            with conn.cursor() as cursor:
                cursor.execute(
                    """
                    INSERT INTO learning_classes (
                        id, name, code, description, target_score,
                        is_public, is_active, created_by
                    ) VALUES (%s, %s, %s, %s, %s, 0, %s, %s)
                    """,
                    (
                        class_id,
                        payload.name,
                        payload.code,
                        payload.description.strip(),
                        payload.targetScore,
                        payload.isActive,
                        user["id"],
                    ),
                )
                if payload.studentIds:
                    cursor.executemany(
                        "INSERT INTO class_memberships (class_id, user_id) VALUES (%s, %s)",
                        [(class_id, student_id) for student_id in payload.studentIds],
                    )
    except IntegrityError as error:
        raise HTTPException(status_code=409, detail="Mã lớp này đã được sử dụng.") from error

    for student_id in payload.studentIds:
        notify_student_added(student_id, class_id, payload.name, payload.code)
    return {"success": True, "data": class_rows(user["id"], class_id)[0]}


@router.put("/{class_id}")
def update_class(
    class_id: str,
    payload: ClassPayload,
    user=Depends(require_admin),
):
    owned_class_or_404(class_id, user["id"])
    validate_student_ids(payload.studentIds)
    existing_memberships = db.fetch_all(
        "SELECT user_id FROM class_memberships WHERE class_id = ?",
        (class_id,),
        use_cache=False,
    )
    existing_ids = {row["user_id"] for row in existing_memberships}
    new_ids = set(payload.studentIds) - existing_ids
    try:
        with db.transaction() as conn:
            with conn.cursor() as cursor:
                cursor.execute(
                    """
                    UPDATE learning_classes
                    SET name = %s, code = %s, description = %s,
                        target_score = %s, is_active = %s
                    WHERE id = %s AND created_by = %s
                    """,
                    (
                        payload.name,
                        payload.code,
                        payload.description.strip(),
                        payload.targetScore,
                        payload.isActive,
                        class_id,
                        user["id"],
                    ),
                )
                cursor.execute(
                    "DELETE FROM class_memberships WHERE class_id = %s",
                    (class_id,),
                )
                if payload.studentIds:
                    cursor.executemany(
                        "INSERT INTO class_memberships (class_id, user_id) VALUES (%s, %s)",
                        [(class_id, student_id) for student_id in payload.studentIds],
                    )
    except IntegrityError as error:
        raise HTTPException(status_code=409, detail="Mã lớp này đã được sử dụng.") from error

    for student_id in new_ids:
        notify_student_added(student_id, class_id, payload.name, payload.code)
    return {"success": True, "data": class_rows(user["id"], class_id)[0]}


@router.delete("/{class_id}")
def delete_class(class_id: str, user=Depends(require_admin)):
    owned_class_or_404(class_id, user["id"])
    if assignment_uses_class(class_id):
        raise HTTPException(
            status_code=409,
            detail="Không thể xóa lớp đã được dùng để giao bài. Hãy lưu trữ lớp thay thế.",
        )
    db.execute(
        "DELETE FROM learning_classes WHERE id = ? AND created_by = ?",
        (class_id, user["id"]),
    )
    return {"success": True}
