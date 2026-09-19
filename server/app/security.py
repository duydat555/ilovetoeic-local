import base64
import hashlib
import hmac
import json
import re
import secrets
import time
from datetime import date, datetime, timedelta
from typing import Optional
from urllib.parse import quote_plus

from fastapi import Depends, HTTPException
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from app import config
from app.db import db
from app.services.cache_service import cache_service


def get_dicebear_avatar(seed_text: str) -> str:
    clean_seed = quote_plus(str(seed_text or "student").strip())
    return f"https://api.dicebear.com/7.x/avataaars/svg?seed={clean_seed}"


PASSWORD_ITERATIONS = 310_000
bearer_scheme = HTTPBearer(auto_error=False)
STUDENT_RANKING_NAME_PATTERN = re.compile(r"^([^\s_]+)_K([1-9]\d{0,2})$", re.IGNORECASE)


def parse_student_ranking_name(value: str):
    """Return the canonical ranking name and cohort code, or None when invalid."""
    match = STUDENT_RANKING_NAME_PATTERN.fullmatch(str(value or "").strip())
    if not match:
        return None
    given_name, cohort_number = match.groups()
    cohort_code = f"K{int(cohort_number)}"
    return f"{given_name}_{cohort_code}", cohort_code


def hash_password(password: str) -> str:
    salt = secrets.token_bytes(16)
    digest = hashlib.pbkdf2_hmac(
        "sha256",
        password.encode("utf-8"),
        salt,
        PASSWORD_ITERATIONS,
    )
    return (
        f"pbkdf2_sha256${PASSWORD_ITERATIONS}$"
        f"{base64.urlsafe_b64encode(salt).decode()}$"
        f"{base64.urlsafe_b64encode(digest).decode()}"
    )


def verify_password(password: str, encoded: Optional[str]) -> bool:
    if not encoded:
        return False
    try:
        algorithm, iterations, salt_value, digest_value = encoded.split("$", 3)
        if algorithm != "pbkdf2_sha256":
            return False
        salt = base64.urlsafe_b64decode(salt_value.encode())
        expected = base64.urlsafe_b64decode(digest_value.encode())
        actual = hashlib.pbkdf2_hmac(
            "sha256",
            password.encode("utf-8"),
            salt,
            int(iterations),
        )
        return hmac.compare_digest(actual, expected)
    except (TypeError, ValueError):
        return False


def token_hash(token: str) -> str:
    return hashlib.sha256(token.encode("utf-8")).hexdigest()


def create_session(user_id: str, remember: bool = True) -> str:
    raw_token = secrets.token_urlsafe(48)
    # Duy trì phiên đăng nhập lâu dài (10 năm / 3650 ngày), chỉ kết thúc khi chọn Đăng xuất
    expires_at = datetime.utcnow() + timedelta(days=3650)
    db.execute(
        """
        INSERT INTO user_sessions (token_hash, user_id, expires_at)
        VALUES (?, ?, ?)
        """,
        (token_hash(raw_token), user_id, expires_at),
    )
    return raw_token


def revoke_session(token: str):
    th = token_hash(token)
    db.execute("DELETE FROM user_sessions WHERE token_hash = ?", (th,))
    cache_service.invalidate_token(th)


def invalidate_user_session(user_id: str):
    """Purge all cached sessions for a given user across all workers via Redis."""
    cache_service.invalidate_user(user_id)


_user_last_active_cache = {}


def get_session_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(bearer_scheme),
):
    if not credentials or credentials.scheme.lower() != "bearer":
        raise HTTPException(status_code=401, detail="Bạn cần đăng nhập để tiếp tục.")

    th = token_hash(credentials.credentials)

    # 1. Kiểm tra cache trước (Redis / Memory) để giảm 90% query xác thực
    user = cache_service.get_session(th)

    if not user:
        # 2. Cache miss: Query database
        user = db.fetch_one(
            """
            SELECT u.*
            FROM user_sessions s
            JOIN users u ON u.id = s.user_id
            WHERE s.token_hash = ?
            """,
            (th,),
            use_cache=False,
        )
        if not user:
            raise HTTPException(status_code=401, detail="Phiên đăng nhập đã hết hạn.")

        # Lưu session vào Redis (shared giữa 2 workers, TTL 60s)
        cache_service.set_session(th, user, ttl_seconds=60)

    if is_access_expired(user):
        db.execute("DELETE FROM user_sessions WHERE user_id = ?", (user["id"],))
        cache_service.invalidate_user(user["id"])
        raise HTTPException(
            status_code=401,
            detail="Thời hạn sử dụng tài khoản đã kết thúc. Vui lòng liên hệ Giảng viên.",
        )

    # Cập nhật thời điểm hoạt động (last_active_at) có throttling (tối đa 1 lần / 2 phút / user)
    # và KHÔNG làm xoá bộ nhớ đệm truy vấn RAM của toàn server (invalidate_cache=False)
    now_ts = time.time()
    user_id = user["id"]
    if now_ts - _user_last_active_cache.get(user_id, 0) > 120:
        _user_last_active_cache[user_id] = now_ts
        try:
            db.execute(
                "UPDATE users SET last_active_at = UTC_TIMESTAMP() WHERE id = ?",
                (user_id,),
                invalidate_cache=False,
            )
        except Exception:
            pass

    return user


def get_current_user(user=Depends(get_session_user)):
    if user.get("role") != "admin" and user.get("approval_status") != "approved":
        raise HTTPException(
            status_code=403,
            detail="Tài khoản của bạn đang chờ Giảng viên phê duyệt.",
        )
    if user.get("role") != "admin" and bool(user.get("is_frozen")):
        raise HTTPException(
            status_code=403,
            detail="Tài khoản đang được bảo lưu. Vui lòng liên hệ Giảng viên để mở lại.",
        )
    return user


def get_optional_current_user(credentials: Optional[HTTPAuthorizationCredentials] = Depends(bearer_scheme)):
    if not credentials or not credentials.credentials:
        return None
    try:
        user = get_session_user(credentials)
        if user.get("role") != "admin" and user.get("approval_status") != "approved":
            return None
        if user.get("role") != "admin" and bool(user.get("is_frozen")):
            return None
        return user
    except Exception:
        return None


def is_access_expired(user) -> bool:
    # A frozen account is preserving its remaining access time. Its original
    # deadline is shifted forward by the frozen duration when it is reopened.
    if bool(user.get("is_frozen")):
        return False
    expires_at = user.get("access_expires_at")
    if not expires_at:
        return False
    if isinstance(expires_at, str):
        try:
            expires_at = datetime.fromisoformat(expires_at.replace("Z", "+00:00")).replace(tzinfo=None)
        except ValueError:
            return False
    return expires_at <= datetime.utcnow()


def normalize_date(val):
    if not val:
        return None
    if isinstance(val, datetime):
        return val.date()
    if isinstance(val, date):
        return val
    if isinstance(val, str):
        try:
            return datetime.strptime(val[:10], "%Y-%m-%d").date()
        except ValueError:
            return None
    return None


def active_streak_days(user):
    last_study = normalize_date(user.get("last_study_date"))
    if not last_study:
        return 0
    today = date.today()
    if last_study < today - timedelta(days=1):
        return 0
    return int(user.get("streak_days") or 0)


def user_payload(user):
    exam_date = user.get("exam_date")
    last_study_date = user.get("last_study_date")
    if isinstance(exam_date, (date, datetime)):
        exam_date = exam_date.isoformat()[:10]
    if isinstance(last_study_date, (date, datetime)):
        last_study_date = last_study_date.isoformat()[:10]
    role = "admin" if user.get("role") == "admin" else "student"
    ranking_identity = parse_student_ranking_name(user.get("full_name") or "")
    return {
        "id": user["id"],
        "name": user.get("full_name") or "Học viên TOEIC",
        "familyMiddleName": user.get("family_middle_name") or "",
        "cohortCode": ranking_identity[1] if ranking_identity else None,
        "hasValidRankingName": role == "admin" or bool(ranking_identity),
        "email": user.get("email") or "",
        "role": role,
        "approvalStatus": "approved" if role == "admin" else (user.get("approval_status") or "pending"),
        "approvedAt": user.get("approved_at").isoformat() if isinstance(user.get("approved_at"), datetime) else (str(user.get("approved_at") or "") or None),
        "isFrozen": bool(user.get("is_frozen")),
        "frozenAt": user.get("frozen_at").isoformat() if isinstance(user.get("frozen_at"), datetime) else (str(user.get("frozen_at") or "") or None),
        "accessExpiresAt": user.get("access_expires_at").isoformat() if isinstance(user.get("access_expires_at"), datetime) else (str(user.get("access_expires_at") or "") or None),
        "avatar": user.get("avatar_url") or get_dicebear_avatar(user.get("full_name") or user.get("id")),
        "targetScore": int(user.get("target_score") or 750),
        "currentScore": int(user.get("current_score") or 0),
        "examDate": exam_date or "",
        "streakDays": active_streak_days(user),
        "longestStreak": int(user.get("longest_streak") or 0),
        "lastStudyDate": last_study_date,
        "xp": int(user.get("xp") or 0),
        "level": int(user.get("level") or 1),
        "totalStudyMinutes": 0,
        "questionsAnswered": 0,
        "accuracyRate": 0,
        "authProvider": user.get("auth_provider") or "email",
        "isPro": role == "admin" or bool(user.get("is_pro")),
    }


def encode_oauth_state(payload: dict) -> str:
    data = {**payload, "expires": int((datetime.utcnow() + timedelta(minutes=10)).timestamp())}
    encoded = base64.urlsafe_b64encode(
        json.dumps(data, separators=(",", ":")).encode("utf-8")
    ).decode().rstrip("=")
    signature = hmac.new(
        config.APP_SECRET.encode("utf-8"),
        encoded.encode("utf-8"),
        hashlib.sha256,
    ).hexdigest()
    return f"{encoded}.{signature}"


def decode_oauth_state(value: str) -> dict:
    try:
        encoded, signature = value.split(".", 1)
        expected = hmac.new(
            config.APP_SECRET.encode("utf-8"),
            encoded.encode("utf-8"),
            hashlib.sha256,
        ).hexdigest()
        if not hmac.compare_digest(signature, expected):
            raise ValueError("invalid signature")
        padded = encoded + "=" * (-len(encoded) % 4)
        payload = json.loads(base64.urlsafe_b64decode(padded).decode("utf-8"))
        if int(payload["expires"]) < int(datetime.utcnow().timestamp()):
            raise ValueError("expired")
        return payload
    except Exception as error:
        raise HTTPException(status_code=400, detail="OAuth state không hợp lệ.") from error
