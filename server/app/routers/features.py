from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from app.db import db
from app.security import get_current_user
from app.services.arena_service import rollout_allowed


router = APIRouter(prefix="/api/v1/features", tags=["Feature management"])

FEATURE_KEYS = (
    "arena",
    "dashboard",
    "mock_test",
    "vocabulary",
    "grammar",
    "listening",
    "history",
    "ranking",
    "profile",
    "settings",
    "feedback",
    "ai_voice",
    "national_day_theme",
)
# Off until the teacher switches them on.
DEFAULT_OFF_FEATURES = ("national_day_theme", "arena", "ai_voice")
CORE_FEATURES = {"dashboard", "profile", "settings"}


class FeatureTogglePayload(BaseModel):
    enabled: bool
    confirmed: bool = True


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
    for feature_key in FEATURE_KEYS:
        default_val = 0 if feature_key in DEFAULT_OFF_FEATURES else 1
        db.execute(
            """
            INSERT INTO feature_flags (feature_key, is_enabled)
            VALUES (?, ?)
            ON DUPLICATE KEY UPDATE feature_key = VALUES(feature_key)
            """,
            (feature_key, default_val),
            invalidate_cache=False,
        )


def global_flags():
    ensure_feature_rows()
    rows = db.fetch_all(
        "SELECT feature_key, is_enabled FROM feature_flags",
        use_cache=False,
    )
    values = {row["feature_key"]: bool(row.get("is_enabled")) for row in rows}
    
    # Auto-activation between August 30 and September 3 if flag row was not set manually
    now = datetime.now()
    is_national_day_period = (now.month == 8 and now.day >= 30) or (now.month == 9 and now.day <= 3)
    if "national_day_theme" not in values:
        values["national_day_theme"] = is_national_day_period

    for feature_key in FEATURE_KEYS:
        if feature_key != "national_day_theme":
            values.setdefault(feature_key, feature_key not in DEFAULT_OFF_FEATURES)
    for feature_key in CORE_FEATURES:
        values[feature_key] = True
    return values


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
    if feature_key in CORE_FEATURES or feature_key == "grammar":
        return 0

    if feature_key == "ranking":
        if class_id and class_id != "all":
            row = db.fetch_one(
                "SELECT COUNT(*) AS total FROM class_memberships cm JOIN users u ON u.id = cm.user_id WHERE cm.class_id = ? AND u.role = 'student'",
                (class_id,),
                use_cache=False,
            )
        else:
            row = db.fetch_one(
                "SELECT COUNT(*) AS total FROM users WHERE role = 'student'",
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

    if feature_key == "listening":
        row = db.fetch_one(
            "SELECT COUNT(*) AS total FROM user_listening_progress",
            use_cache=False,
        )
        return int((row or {}).get("total") or 0)

    if feature_key in {"mock_test", "history"}:
        condition = ""
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

    ranking_rows = db.fetch_all(
        "SELECT cm.class_id, COUNT(cm.user_id) AS total FROM class_memberships cm JOIN users u ON u.id = cm.user_id WHERE u.role = 'student' GROUP BY cm.class_id",
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
        SELECT COUNT(*) AS total
        FROM test_attempts
        """,
        use_cache=False,
    ) or {}
    global_counts["mock_test"] = int(attempt_total.get("total") or 0)
    global_counts["history"] = global_counts["mock_test"]
    attempt_rows = db.fetch_all(
        """
        SELECT
            cm.class_id,
            COUNT(*) AS total
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

    listening_total = db.fetch_one(
        "SELECT COUNT(*) AS total FROM user_listening_progress",
        use_cache=False,
    ) or {}
    global_counts["listening"] = int(listening_total.get("total") or 0)

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
            log.previous_enabled,
            log.new_enabled,
            log.created_at,
            COALESCE(actor.full_name, actor.email, 'Tài khoản đã xoá') AS actor_name,
            actor.email AS actor_email
        FROM feature_flag_audit_logs log
        LEFT JOIN users actor ON actor.id = log.actor_id
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
    flags['arena'] = bool(flags.get('arena')) and rollout_allowed(user)
    sources = {feature_key: "global" for feature_key in FEATURE_KEYS}
    for feature_key in CORE_FEATURES:
        flags[feature_key] = True
        sources[feature_key] = "core"
    return {
        "success": True,
        "data": {"flags": flags, "sources": sources},
    }


@router.get("/admin")
def get_admin_feature_configuration(user=Depends(require_admin)):
    flags = global_flags()
    global_impacts = {
        feature_key: feature_impact_count(feature_key)
        for feature_key in FEATURE_KEYS
    }
    return {
        "success": True,
        "data": {
            "globalFlags": flags,
            "history": audit_log_rows(),
            "impactCounts": {"global": global_impacts},
        },
    }


def reject_unconfirmed_disable(feature_key: str, class_id: str, payload: FeatureTogglePayload):
    # Admin toggle changes are authorized; disabling a feature flag hides it from students without deleting data.
    return


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
                (1 if payload.enabled else 0, user["id"], feature_key),
            )
            cursor.execute(
                """
                INSERT INTO feature_flag_audit_logs (
                    feature_key, scope_type, previous_enabled, new_enabled, actor_id
                ) VALUES (%s, 'global', %s, %s, %s)
                """,
                (feature_key, 1 if previous else 0, 1 if payload.enabled else 0, user["id"]),
            )
    return {"success": True, "data": {"enabled": payload.enabled, "changed": True}}
