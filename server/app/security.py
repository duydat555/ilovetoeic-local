import base64
import hashlib
import hmac
import json
import secrets
from datetime import date, datetime, timedelta
from typing import Optional
from urllib.parse import quote_plus

from fastapi import Depends, HTTPException
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from app import config
from app.db import db


def get_dicebear_avatar(seed_text: str) -> str:
    clean_seed = quote_plus(str(seed_text or "student").strip())
    return f"https://api.dicebear.com/7.x/avataaars/svg?seed={clean_seed}"


PASSWORD_ITERATIONS = 310_000
bearer_scheme = HTTPBearer(auto_error=False)


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


def create_session(user_id: str, remember: bool) -> str:
    raw_token = secrets.token_urlsafe(48)
    expires_at = datetime.utcnow() + (timedelta(days=30) if remember else timedelta(hours=12))
    db.execute(
        """
        INSERT INTO user_sessions (token_hash, user_id, expires_at)
        VALUES (?, ?, ?)
        """,
        (token_hash(raw_token), user_id, expires_at),
    )
    return raw_token


def revoke_session(token: str):
    db.execute("DELETE FROM user_sessions WHERE token_hash = ?", (token_hash(token),))


def get_current_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(bearer_scheme),
):
    if not credentials or credentials.scheme.lower() != "bearer":
        raise HTTPException(status_code=401, detail="Bạn cần đăng nhập để tiếp tục.")
    user = db.fetch_one(
        """
        SELECT u.*
        FROM user_sessions s
        JOIN users u ON u.id = s.user_id
        WHERE s.token_hash = ? AND s.expires_at > UTC_TIMESTAMP()
        """,
        (token_hash(credentials.credentials),),
        use_cache=False,
    )
    if not user:
        raise HTTPException(status_code=401, detail="Phiên đăng nhập đã hết hạn.")
    return user


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
    return {
        "id": user["id"],
        "name": user.get("full_name") or "Học viên TOEIC",
        "email": user.get("email") or "",
        "role": role,
        "avatar": user.get("avatar_url") or get_dicebear_avatar(user.get("full_name") or user.get("id")),
        "targetScore": int(user.get("target_score") or 750),
        "currentScore": int(user.get("current_score") or 0),
        "examDate": exam_date or "",
        "streakDays": active_streak_days(user),
        "longestStreak": int(user.get("longest_streak") or 0),
        "lastStudyDate": last_study_date,
        "totalStudyMinutes": 0,
        "questionsAnswered": 0,
        "accuracyRate": 0,
        "authProvider": user.get("auth_provider") or "email",
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
