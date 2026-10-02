from collections import defaultdict
from datetime import date, datetime
from typing import List, Optional
import re
import uuid

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field, field_validator
from pymysql.err import IntegrityError

from app.db import db
from app.notifications import create_notification
from app.security import active_streak_days, get_current_user, get_dicebear_avatar


router = APIRouter(prefix="/api/v1/classes", tags=["Class management"])
CLASS_CODE_PATTERN = re.compile(r"^[A-Z0-9][A-Z0-9-]{1,18}[A-Z0-9]$")
COHORT_PATTERN = re.compile(r"_K([1-9]\d{0,3})(?:\b|$)", re.IGNORECASE)


def extract_cohort_code(full_name: str) -> Optional[str]:
    """Extract cohort code like 'K35' from student full_name like 'Dũng_K35' or 'Nguyễn Văn Đạt_K38'."""
    match = COHORT_PATTERN.search(str(full_name or "").strip())
    if not match:
        return None
    return f"K{int(match.group(1))}"


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
    raw_name = row.get("full_name") or "Học viên TOEIC"
    family_middle = row.get("family_middle_name") or ""
    display_name = f"{family_middle} {raw_name}".strip() if family_middle else raw_name
    return {
        "id": row["id"],
        "name": display_name,
        "rawName": raw_name,
        "familyMiddleName": family_middle,
        "cohortCode": extract_cohort_code(raw_name),
        "email": row.get("email") or "",
        "avatar": row.get("avatar_url") or get_dicebear_avatar(raw_name or row["id"]),
        "currentScore": int(row.get("current_score") or 0),
        "targetScore": int(row.get("target_score") or 750),
        "streakDays": active_streak_days(row),
        "lastStudyDate": (
            row.get("last_study_date").isoformat()
            if isinstance(row.get("last_study_date"), (date, datetime))
            else str(row.get("last_study_date") or "")
        ),
        "xp": int(row.get("xp") or 0),
        "level": int(row.get("level") or 1),
        "totalQuestions": int(row.get("total_questions_answered") or 0),
        "correctQuestions": int(row.get("total_correct_answers") or 0),
        "createdAt": str(created_at or ""),
    }


def get_dynamic_classes():
    """Dynamically aggregate classes from student accounts based on name suffix (e.g. _K35, _K38)."""
    rows = db.fetch_all(
        """
        SELECT id, full_name, family_middle_name, email, avatar_url,
               current_score, target_score, streak_days, last_study_date,
               xp, level, total_questions_answered, total_correct_answers,
               created_at, updated_at
        FROM users
        WHERE role = 'student' AND approval_status = 'approved'
        ORDER BY full_name ASC, created_at ASC
        """,
        use_cache=False,
    )

    cohort_groups = defaultdict(list)
    for row in rows:
        cohort_code = extract_cohort_code(row.get("full_name") or "")
        key = cohort_code if cohort_code else "KHAC"
        cohort_groups[key].append(row)

    classes = []
    for key, student_rows in cohort_groups.items():
        is_named = key != "KHAC"
        code = key
        name = f"Lớp {key}" if is_named else "Lớp Chưa phân loại"
        description = (
            f"Lớp học TOEIC khóa {key} được bóc tách tự động từ định danh học viên."
            if is_named
            else "Nhóm học viên chưa có định danh khóa (ví dụ: _K35, _K38)."
        )

        student_ids = [s["id"] for s in student_rows]
        student_count = len(student_rows)

        target_scores = [int(s.get("target_score") or 750) for s in student_rows if s.get("target_score")]
        avg_target = round(sum(target_scores) / len(target_scores)) if target_scores else 750

        progresses = []
        for s in student_rows:
            target = int(s.get("target_score") or 750)
            current = int(s.get("current_score") or 0)
            if target > 0:
                progresses.append(min(100, round((current / target) * 100)))
            else:
                progresses.append(0)
        avg_progress = round(sum(progresses) / len(progresses)) if progresses else 0

        total_xp = sum(int(s.get("xp") or 0) for s in student_rows)
        total_questions = sum(int(s.get("total_questions_answered") or 0) for s in student_rows)

        created_dates = [s.get("created_at") for s in student_rows if s.get("created_at")]
        earliest_created = min(created_dates) if created_dates else datetime.now()
        latest_updated = max(created_dates) if created_dates else datetime.now()

        classes.append({
            "id": code,
            "name": name,
            "code": code,
            "description": description,
            "targetScore": avg_target,
            "studentIds": student_ids,
            "studentCount": student_count,
            "averageProgress": avg_progress,
            "totalXp": total_xp,
            "totalQuestions": total_questions,
            "students": [student_response(s) for s in student_rows],
            "isActive": True,
            "createdAt": iso_datetime(earliest_created),
            "updatedAt": iso_datetime(latest_updated),
        })

    def sort_key(c):
        m = re.match(r"^K(\d+)$", c["code"], re.IGNORECASE)
        if m:
            return (0, int(m.group(1)))
        return (1, c["code"])

    classes.sort(key=sort_key)
    return classes


@router.get("")
def get_classes(_user=Depends(require_admin)):
    classes = get_dynamic_classes()
    return {"success": True, "data": classes}


@router.get("/students")
def get_available_students(_user=Depends(require_admin)):
    rows = db.fetch_all(
        """
        SELECT id, full_name, family_middle_name, email, avatar_url, current_score, target_score,
               streak_days, last_study_date, xp, level, total_questions_answered, total_correct_answers, created_at
        FROM users
        WHERE role = 'student' AND approval_status = 'approved'
        ORDER BY full_name ASC, email ASC
        """,
        use_cache=False,
    )
    return {"success": True, "data": [student_response(row) for row in rows]}


@router.get("/{class_id}")
def get_class(class_id: str, _user=Depends(require_admin)):
    classes = get_dynamic_classes()
    for c in classes:
        if c["id"].upper() == class_id.upper() or c["code"].upper() == class_id.upper():
            return {"success": True, "data": c}
    raise HTTPException(status_code=404, detail="Không tìm thấy lớp học.")


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
    db.execute(
        "DELETE FROM learning_classes WHERE id = ? AND created_by = ?",
        (class_id, user["id"]),
    )
    return {"success": True}
