import json
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from app.db import db
from app.security import get_current_user


router = APIRouter(prefix="/api/v1/features", tags=["Feature management"])

FEATURE_KEYS = (
    "dashboard",
    "learning_path",
    "mock_test",
    "vocabulary",
    "grammar",
    "mistake_notebook",
    "history",
    "homework",
    "ranking",
    "profile",
    "settings",
)
CORE_FEATURES = {"dashboard", "profile", "settings"}


class FeatureTogglePayload(BaseModel):
    enabled: bool
    confirmed: bool = False


def require_admin(user=Depends(get_current_user)):
    if user.get("role") != "admin":
        raise HTTPException(
            status_code=403,
            detail="Chỉ Giáo viên mới có thể quản lý tính năng.",
        )
    return user


def validate_feature_key(feature_key: str):
    if feature_key not in FEATURE_KEYS:
        raise HTTPException(status_code=404, detail="Tính năng không tồn tại.")
    return feature_key


def ensure_feature_rows():
    db.executemany(
        """
        INSERT INTO feature_flags (feature_key, is_enabled)
        VALUES (?, 1)
        ON DUPLICATE KEY UPDATE feature_key = VALUES(feature_key)
        """,
        [(feature_key,) for feature_key in FEATURE_KEYS],
    )


def global_flags():
    ensure_feature_rows()
    rows = db.fetch_all(
        "SELECT feature_key, is_enabled FROM feature_flags",
        use_cache=False,
    )
    values = {row["feature_key"]: bool(row.get("is_enabled")) for row in rows}
    for feature_key in FEATURE_KEYS:
        values.setdefault(feature_key, True)
    for feature_key in CORE_FEATURES:
        values[feature_key] = True
    return values


def parse_json_list(value):
    if isinstance(value, list):
        return value
    try:
        parsed = json.loads(value or "[]")
        return parsed if isinstance(parsed, list) else []
    except (TypeError, json.JSONDecodeError):
        return []


def class_or_404(class_id: str, admin_id: str):
    row = db.fetch_one(
        """
        SELECT id, name, code, is_active
        FROM learning_classes
        WHERE id = ? AND created_by = ?
        """,
        (class_id, admin_id),
        use_cache=False,
    )
    if not row:
        raise HTTPException(status_code=404, detail="Lớp học không tồn tại.")
    return row


def feature_impact_count(feature_key: str, class_id: str = ""):
    if feature_key in CORE_FEATURES or feature_key in {"learning_path", "grammar"}:
        return 0

    if feature_key == "homework":
        rows = db.fetch_all(
            "SELECT class_ids FROM homework_assignments WHERE deadline >= CURDATE()",
            use_cache=False,
        )
        if not class_id:
            return len(rows)
        return sum(class_id in parse_json_list(row.get("class_ids")) for row in rows)

    if feature_key == "ranking":
        if class_id:
            row = db.fetch_one(
                "SELECT COUNT(*) AS total FROM leaderboard_members WHERE class_id = ?",
                (class_id,),
                use_cache=False,
            )
        else:
            row = db.fetch_one(
                "SELECT COUNT(*) AS total FROM leaderboard_members",
                use_cache=False,
            )
        return int((row or {}).get("total") or 0)

    if feature_key == "vocabulary":
        if class_id:
            row = db.fetch_one(
                """
                SELECT COUNT(*) AS total
                FROM user_vocabulary uv
                JOIN class_memberships cm ON cm.user_id = uv.user_id
                WHERE cm.class_id = ?
                """,
                (class_id,),
                use_cache=False,
            )
        else:
            row = db.fetch_one(
                "SELECT COUNT(*) AS total FROM user_vocabulary",
                use_cache=False,
            )
        return int((row or {}).get("total") or 0)

    if feature_key in {"mock_test", "history", "mistake_notebook"}:
        condition = " AND ta.total_questions > ta.correct_answers" if feature_key == "mistake_notebook" else ""
        if class_id:
            row = db.fetch_one(
                f"""
                SELECT COUNT(*) AS total
                FROM test_attempts ta
                JOIN class_memberships cm ON cm.user_id = ta.user_id
                WHERE cm.class_id = ?{condition}
                """,
                (class_id,),
                use_cache=False,
            )
        else:
            row = db.fetch_one(
                f"SELECT COUNT(*) AS total FROM test_attempts ta WHERE 1 = 1{condition}",
                use_cache=False,
            )
        return int((row or {}).get("total") or 0)

    return 0


def feature_impact_counts(class_ids):
    global_counts = {feature_key: 0 for feature_key in FEATURE_KEYS}
    class_counts = {
        class_id: {feature_key: 0 for feature_key in FEATURE_KEYS}
        for class_id in class_ids
    }

    homework_rows = db.fetch_all(
        "SELECT class_ids FROM homework_assignments WHERE deadline >= CURDATE()",
        use_cache=False,
    )
    global_counts["homework"] = len(homework_rows)
    known_class_ids = set(class_ids)
    for row in homework_rows:
        for class_id in known_class_ids.intersection(parse_json_list(row.get("class_ids"))):
            class_counts[class_id]["homework"] += 1

    ranking_rows = db.fetch_all(
        "SELECT class_id, COUNT(*) AS total FROM leaderboard_members GROUP BY class_id",
        use_cache=False,
    )
    for row in ranking_rows:
        total = int(row.get("total") or 0)
        global_counts["ranking"] += total
        if row.get("class_id") in class_counts:
            class_counts[row["class_id"]]["ranking"] = total

    vocabulary_total = db.fetch_one(
        "SELECT COUNT(*) AS total FROM user_vocabulary",
        use_cache=False,
    )
    global_counts["vocabulary"] = int((vocabulary_total or {}).get("total") or 0)
    vocabulary_rows = db.fetch_all(
        """
        SELECT cm.class_id, COUNT(*) AS total
        FROM user_vocabulary uv
        JOIN class_memberships cm ON cm.user_id = uv.user_id
        GROUP BY cm.class_id
        """,
        use_cache=False,
    )
    for row in vocabulary_rows:
        if row.get("class_id") in class_counts:
            class_counts[row["class_id"]]["vocabulary"] = int(row.get("total") or 0)

    attempt_total = db.fetch_one(
        """
        SELECT
            COUNT(*) AS total,
            SUM(CASE WHEN total_questions > correct_answers THEN 1 ELSE 0 END) AS mistakes
        FROM test_attempts
        """,
        use_cache=False,
    ) or {}
    global_counts["mock_test"] = int(attempt_total.get("total") or 0)
    global_counts["history"] = global_counts["mock_test"]
    global_counts["mistake_notebook"] = int(attempt_total.get("mistakes") or 0)
    attempt_rows = db.fetch_all(
        """
        SELECT
            cm.class_id,
            COUNT(*) AS total,
            SUM(CASE WHEN ta.total_questions > ta.correct_answers THEN 1 ELSE 0 END) AS mistakes
        FROM test_attempts ta
        JOIN class_memberships cm ON cm.user_id = ta.user_id
        GROUP BY cm.class_id
        """,
        use_cache=False,
    )
    for row in attempt_rows:
        class_id = row.get("class_id")
        if class_id not in class_counts:
            continue
        total = int(row.get("total") or 0)
        class_counts[class_id]["mock_test"] = total
        class_counts[class_id]["history"] = total
        class_counts[class_id]["mistake_notebook"] = int(row.get("mistakes") or 0)

    return global_counts, class_counts


def iso_datetime(value):
    if isinstance(value, datetime):
        return value.replace(tzinfo=None).isoformat(timespec="seconds") + "Z"
    normalized = str(value or "")
    return normalized if normalized.endswith("Z") else normalized + "Z"


def audit_log_rows():
    rows = db.fetch_all(
        """
        SELECT
            log.id,
            log.feature_key,
            log.scope_type,
            log.class_id,
            log.previous_enabled,
            log.new_enabled,
            log.created_at,
            COALESCE(actor.full_name, actor.email, 'Tài khoản đã xoá') AS actor_name,
            actor.email AS actor_email,
            class_item.name AS class_name
        FROM feature_flag_audit_logs log
        LEFT JOIN users actor ON actor.id = log.actor_id
        LEFT JOIN learning_classes class_item ON class_item.id = log.class_id
        ORDER BY log.created_at DESC, log.id DESC
        LIMIT 150
        """,
        use_cache=False,
    )
    return [
        {
            "id": str(row["id"]),
            "featureKey": row["feature_key"],
            "scopeType": row["scope_type"],
            "classId": row.get("class_id"),
            "className": row.get("class_name"),
            "previousEnabled": bool(row.get("previous_enabled")),
            "newEnabled": bool(row.get("new_enabled")),
            "actorName": row.get("actor_name") or "Giáo viên",
            "actorEmail": row.get("actor_email") or "",
            "createdAt": iso_datetime(row.get("created_at")),
        }
        for row in rows
    ]


@router.get("/effective")
def get_effective_features(user=Depends(get_current_user)):
    flags = global_flags()
    class_ids = []
    sources = {feature_key: "global" for feature_key in FEATURE_KEYS}
    if user.get("role") == "student":
        memberships = db.fetch_all(
            "SELECT class_id FROM class_memberships WHERE user_id = ?",
            (user["id"],),
            use_cache=False,
        )
        class_ids = [row["class_id"] for row in memberships]
        if class_ids:
            placeholders = ", ".join("?" for _ in class_ids)
            overrides = db.fetch_all(
                f"""
                SELECT class_id, feature_key, is_enabled
                FROM class_feature_overrides
                WHERE class_id IN ({placeholders})
                """,
                tuple(class_ids),
                use_cache=False,
            )
            values_by_feature = {}
            for override in overrides:
                values_by_feature.setdefault(override["feature_key"], []).append(
                    bool(override.get("is_enabled"))
                )
            for feature_key, values in values_by_feature.items():
                # When a student belongs to multiple classes, the restrictive
                # override wins. This avoids exposing a feature disabled by any class.
                flags[feature_key] = all(values)
                sources[feature_key] = "class"
    for feature_key in CORE_FEATURES:
        flags[feature_key] = True
        sources[feature_key] = "core"
    return {
        "success": True,
        "data": {"flags": flags, "classIds": class_ids, "sources": sources},
    }


@router.get("/admin")
def get_admin_feature_configuration(user=Depends(require_admin)):
    flags = global_flags()
    classes = db.fetch_all(
        """
        SELECT id, name, code, is_active
        FROM learning_classes
        WHERE created_by = ?
        ORDER BY is_active DESC, name ASC
        """,
        (user["id"],),
        use_cache=False,
    )
    class_ids = [row["id"] for row in classes]
    override_rows = []
    if class_ids:
        placeholders = ", ".join("?" for _ in class_ids)
        override_rows = db.fetch_all(
            f"""
            SELECT class_id, feature_key, is_enabled
            FROM class_feature_overrides
            WHERE class_id IN ({placeholders})
            """,
            tuple(class_ids),
            use_cache=False,
        )
    overrides = {}
    for row in override_rows:
        overrides.setdefault(row["class_id"], {})[row["feature_key"]] = bool(
            row.get("is_enabled")
        )

    global_impacts, class_impacts = feature_impact_counts(class_ids)
    return {
        "success": True,
        "data": {
            "globalFlags": flags,
            "classOverrides": overrides,
            "classes": [
                {
                    "id": row["id"],
                    "name": row.get("name") or "",
                    "code": row.get("code") or "",
                    "isActive": bool(row.get("is_active")),
                }
                for row in classes
            ],
            "history": audit_log_rows(),
            "impactCounts": {
                "global": global_impacts,
                "classes": class_impacts,
            },
        },
    }


def reject_unconfirmed_disable(feature_key: str, class_id: str, payload: FeatureTogglePayload):
    if payload.enabled or payload.confirmed:
        return
    impact_count = feature_impact_count(feature_key, class_id)
    if impact_count > 0:
        raise HTTPException(
            status_code=409,
            detail={
                "code": "FEATURE_DISABLE_CONFIRMATION_REQUIRED",
                "message": "Tính năng đang có dữ liệu học sinh. Cần xác nhận trước khi tắt.",
                "impactCount": impact_count,
            },
        )


@router.put("/global/{feature_key}")
def update_global_feature(
    feature_key: str,
    payload: FeatureTogglePayload,
    user=Depends(require_admin),
):
    validate_feature_key(feature_key)
    if feature_key in CORE_FEATURES and not payload.enabled:
        raise HTTPException(status_code=422, detail="Không thể tắt tính năng bắt buộc.")
    ensure_feature_rows()
    current = db.fetch_one(
        "SELECT is_enabled FROM feature_flags WHERE feature_key = ?",
        (feature_key,),
        use_cache=False,
    )
    previous = bool((current or {}).get("is_enabled", True))
    reject_unconfirmed_disable(feature_key, "", payload)
    if previous == payload.enabled:
        return {"success": True, "data": {"enabled": payload.enabled, "changed": False}}

    with db.transaction() as conn:
        with conn.cursor() as cursor:
            cursor.execute(
                """
                UPDATE feature_flags
                SET is_enabled = %s, updated_by = %s
                WHERE feature_key = %s
                """,
                (payload.enabled, user["id"], feature_key),
            )
            cursor.execute(
                """
                INSERT INTO feature_flag_audit_logs (
                    feature_key, scope_type, class_id, previous_enabled,
                    new_enabled, actor_id
                ) VALUES (%s, 'global', NULL, %s, %s, %s)
                """,
                (feature_key, previous, payload.enabled, user["id"]),
            )
    return {"success": True, "data": {"enabled": payload.enabled, "changed": True}}


@router.put("/classes/{class_id}/{feature_key}")
def update_class_feature(
    class_id: str,
    feature_key: str,
    payload: FeatureTogglePayload,
    user=Depends(require_admin),
):
    validate_feature_key(feature_key)
    class_or_404(class_id, user["id"])
    if feature_key in CORE_FEATURES and not payload.enabled:
        raise HTTPException(status_code=422, detail="Không thể tắt tính năng bắt buộc.")
    flags = global_flags()
    current = db.fetch_one(
        """
        SELECT is_enabled
        FROM class_feature_overrides
        WHERE class_id = ? AND feature_key = ?
        """,
        (class_id, feature_key),
        use_cache=False,
    )
    previous = bool(current["is_enabled"]) if current else flags[feature_key]
    reject_unconfirmed_disable(feature_key, class_id, payload)
    if current and previous == payload.enabled:
        return {"success": True, "data": {"enabled": payload.enabled, "changed": False}}

    with db.transaction() as conn:
        with conn.cursor() as cursor:
            cursor.execute(
                """
                INSERT INTO class_feature_overrides (
                    class_id, feature_key, is_enabled, updated_by
                ) VALUES (%s, %s, %s, %s)
                ON DUPLICATE KEY UPDATE
                    is_enabled = VALUES(is_enabled),
                    updated_by = VALUES(updated_by)
                """,
                (class_id, feature_key, payload.enabled, user["id"]),
            )
            cursor.execute(
                """
                INSERT INTO feature_flag_audit_logs (
                    feature_key, scope_type, class_id, previous_enabled,
                    new_enabled, actor_id
                ) VALUES (%s, 'class', %s, %s, %s, %s)
                """,
                (feature_key, class_id, previous, payload.enabled, user["id"]),
            )
    return {"success": True, "data": {"enabled": payload.enabled, "changed": True}}
