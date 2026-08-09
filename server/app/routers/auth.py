import json
import re
import uuid
from datetime import date, datetime, timedelta
from urllib.parse import quote, urlencode, urlparse

import httpx
from fastapi import APIRouter, Depends, HTTPException, Query, Request
from fastapi.responses import RedirectResponse
from pydantic import BaseModel, Field
from pymysql.err import IntegrityError

from app import config
from app.db import db
from app.notifications import create_notification
from app.security import (
    active_streak_days,
    bearer_scheme,
    create_session,
    decode_oauth_state,
    encode_oauth_state,
    get_current_user,
    get_session_user,
    hash_password,
    is_access_expired,
    normalize_date,
    revoke_session,
    user_payload,
    verify_password,
)


router = APIRouter(prefix="/api/v1/auth", tags=["Authentication"])
EMAIL_PATTERN = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")


class LoginRequest(BaseModel):
    email: str
    password: str
    remember: bool = True


class RegisterRequest(LoginRequest):
    name: str = Field(min_length=1, max_length=100)
    target_score: int = Field(default=750, ge=10, le=990)


class ProfileRequest(BaseModel):
    name: str = Field(min_length=1, max_length=100)
    email: str
    avatar: str = Field(default="", max_length=2048)
    target_score: int = Field(default=750, ge=10, le=990)
    exam_date: str = ""


class AccountAccessRequest(BaseModel):
    action: str
    duration_months: int | None = Field(default=None, ge=0, le=24)


class PasswordRequest(BaseModel):
    current_password: str = ""
    new_password: str = Field(min_length=8, max_length=128)


def normalize_email(value: str) -> str:
    email = value.strip().lower()
    if not EMAIL_PATTERN.match(email):
        raise HTTPException(status_code=422, detail="Địa chỉ email không hợp lệ.")
    return email


def auth_response(user, token):
    return {"token": token, "user": user_payload(user)}


@router.post("/register")
def register(payload: RegisterRequest):
    email = normalize_email(payload.email)
    if len(payload.password) < 8:
        raise HTTPException(status_code=422, detail="Mật khẩu phải có ít nhất 8 ký tự.")
    if db.fetch_one("SELECT id FROM users WHERE email = ?", (email,), use_cache=False):
        raise HTTPException(status_code=409, detail="Email này đã được đăng ký.")

    user_id = str(uuid.uuid4())
    db.execute(
        """
        INSERT INTO users (id, email, password_hash, full_name, target_score, auth_provider)
        VALUES (?, ?, ?, ?, ?, 'email')
        """,
        (
            user_id,
            email,
            hash_password(payload.password),
            payload.name.strip(),
            payload.target_score,
        ),
    )
    user = db.fetch_one("SELECT * FROM users WHERE id = ?", (user_id,), use_cache=False)
    return auth_response(user, create_session(user_id, payload.remember))


@router.post("/login")
def login(payload: LoginRequest):
    email = normalize_email(payload.email)
    user = db.fetch_one("SELECT * FROM users WHERE email = ?", (email,), use_cache=False)
    if not user or not verify_password(payload.password, user.get("password_hash")):
        raise HTTPException(status_code=401, detail="Email hoặc mật khẩu không chính xác.")
    if is_access_expired(user):
        db.execute("DELETE FROM user_sessions WHERE user_id = ?", (user["id"],))
        raise HTTPException(status_code=403, detail="Tài khoản đã hết thời hạn sử dụng. Vui lòng liên hệ Giảng viên.")
    return auth_response(user, create_session(user["id"], payload.remember))


@router.get("/me")
def me(user=Depends(get_session_user)):
    return {"user": user_payload(user)}


def require_admin(user=Depends(get_current_user)):
    if user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Chỉ Giảng viên mới có thể phê duyệt tài khoản.")
    return user


@router.get("/approval-requests")
def approval_requests(_admin=Depends(require_admin)):
    rows = db.fetch_all(
        """
        SELECT * FROM users
        WHERE role = 'student'
        ORDER BY CASE approval_status WHEN 'pending' THEN 0 ELSE 1 END, created_at DESC
        """,
        use_cache=False,
    )
    return {"data": [user_payload(row) | {
        "createdAt": row.get("created_at").isoformat() if isinstance(row.get("created_at"), datetime) else str(row.get("created_at") or ""),
    } for row in rows]}


@router.put("/approval-requests/{user_id}")
def update_approval(user_id: str, payload: dict, admin=Depends(require_admin)):
    status = str(payload.get("status") or "").strip().lower()
    if status != "approved":
        raise HTTPException(status_code=422, detail="Trạng thái phê duyệt không hợp lệ.")
    target = db.fetch_one(
        "SELECT id FROM users WHERE id = ? AND role = 'student'",
        (user_id,),
        use_cache=False,
    )
    if not target:
        raise HTTPException(status_code=404, detail="Không tìm thấy tài khoản Học sinh.")
    db.execute(
        """
        UPDATE users
        SET approval_status = ?,
            approved_at = UTC_TIMESTAMP(),
            approved_by = ?
        WHERE id = ?
        """,
        (status, admin["id"], user_id),
    )
    updated = db.fetch_one("SELECT * FROM users WHERE id = ?", (user_id,), use_cache=False)
    return {"user": user_payload(updated)}


@router.delete("/approval-requests/{user_id}")
def reject_approval(user_id: str, _admin=Depends(require_admin)):
    target = db.fetch_one(
        """
        SELECT id FROM users
        WHERE id = ? AND role = 'student' AND approval_status = 'pending'
        """,
        (user_id,),
        use_cache=False,
    )
    if not target:
        raise HTTPException(status_code=404, detail="Không tìm thấy tài khoản đang chờ phê duyệt.")
    # Related sessions and student-owned data use ON DELETE CASCADE. The
    # transaction ensures the account is either removed completely or retained.
    with db.transaction() as conn:
        with conn.cursor() as cursor:
            cursor.execute("DELETE FROM users WHERE id = %s", (user_id,))
    return {"success": True, "deleted_user_id": user_id}


@router.put("/accounts/{user_id}/access")
def update_account_access(user_id: str, payload: AccountAccessRequest, _admin=Depends(require_admin)):
    target = db.fetch_one(
        "SELECT * FROM users WHERE id = ? AND role = 'student' AND approval_status = 'approved'",
        (user_id,),
        use_cache=False,
    )
    if not target:
        raise HTTPException(status_code=404, detail="Không tìm thấy tài khoản Học sinh đã phê duyệt.")
    action = payload.action.strip().lower()
    if action == "freeze":
        db.execute(
            "UPDATE users SET is_frozen = 1, frozen_at = COALESCE(frozen_at, UTC_TIMESTAMP()) WHERE id = ?",
            (user_id,),
        )
    elif action == "unfreeze":
        db.execute(
            """
            UPDATE users
            SET access_expires_at = CASE
                    WHEN access_expires_at IS NOT NULL AND frozen_at IS NOT NULL
                    THEN TIMESTAMPADD(SECOND, TIMESTAMPDIFF(SECOND, frozen_at, UTC_TIMESTAMP()), access_expires_at)
                    ELSE access_expires_at
                END,
                is_frozen = 0,
                frozen_at = NULL
            WHERE id = ?
            """,
            (user_id,),
        )
    elif action == "set_duration":
        months = payload.duration_months
        if months is None:
            raise HTTPException(status_code=422, detail="Vui lòng chọn thời hạn sử dụng.")
        db.execute(
            """
            UPDATE users
            SET access_expires_at = CASE
                    WHEN ? = 0 THEN NULL
                    ELSE TIMESTAMPADD(MONTH, ?, UTC_TIMESTAMP())
                END,
                frozen_at = CASE
                    WHEN is_frozen = 1 THEN UTC_TIMESTAMP()
                    ELSE frozen_at
                END
            WHERE id = ?
            """,
            (months, months, user_id),
        )
    else:
        raise HTTPException(status_code=422, detail="Thao tác tài khoản không hợp lệ.")
    updated = db.fetch_one("SELECT * FROM users WHERE id = ?", (user_id,), use_cache=False)
    return {"user": user_payload(updated)}


@router.post("/logout")
def logout(credentials=Depends(bearer_scheme)):
    if credentials:
        revoke_session(credentials.credentials)
    return {"success": True}


@router.put("/profile")
def update_profile(payload: ProfileRequest, user=Depends(get_current_user)):
    email = normalize_email(payload.email)
    exam_date = None
    if payload.exam_date:
        try:
            exam_date = date.fromisoformat(payload.exam_date)
        except ValueError as error:
            raise HTTPException(status_code=422, detail="Ngày thi dự kiến không hợp lệ.") from error
    new_avatar = payload.avatar.strip() if payload.avatar and payload.avatar.strip() else (user.get("avatar_url") or "")
    try:
        db.execute(
            """
            UPDATE users
            SET email = ?, full_name = ?, avatar_url = ?, target_score = ?, exam_date = ?
            WHERE id = ?
            """,
            (
                email,
                payload.name.strip(),
                new_avatar,
                payload.target_score,
                exam_date,
                user["id"],
            ),
        )
    except IntegrityError as error:
        raise HTTPException(status_code=409, detail="Email này đã được sử dụng.") from error
    updated = db.fetch_one("SELECT * FROM users WHERE id = ?", (user["id"],), use_cache=False)
    return {"user": user_payload(updated), "email_confirmation_required": False}


@router.put("/password")
def update_password(payload: PasswordRequest, user=Depends(get_current_user)):
    if user.get("password_hash") and not verify_password(
        payload.current_password,
        user["password_hash"],
    ):
        raise HTTPException(status_code=400, detail="Mật khẩu hiện tại không đúng.")
    if user.get("password_hash") and verify_password(payload.new_password, user["password_hash"]):
        raise HTTPException(status_code=400, detail="Mật khẩu mới phải khác mật khẩu hiện tại.")
    db.execute(
        """
        UPDATE users
        SET password_hash = ?,
            auth_provider = CASE
                WHEN google_sub IS NULL THEN 'email'
                ELSE 'email,google'
            END
        WHERE id = ?
        """,
        (hash_password(payload.new_password), user["id"]),
    )
    return {"success": True}


@router.post("/activity")
def record_activity(user=Depends(get_current_user)):
    today = date.today()
    last_date = normalize_date(user.get("last_study_date"))
    current_streak = active_streak_days(user)
    if last_date == today:
        streak = max(current_streak, 1)
    elif last_date == today - timedelta(days=1):
        streak = current_streak + 1
    else:
        streak = 1
    longest = max(int(user.get("longest_streak") or 0), streak)
    db.execute(
        """
        UPDATE users
        SET streak_days = ?, longest_streak = ?, last_study_date = ?
        WHERE id = ?
        """,
        (streak, longest, today, user["id"]),
    )
    updated = db.fetch_one("SELECT * FROM users WHERE id = ?", (user["id"],), use_cache=False)
    if streak in {3, 7, 14, 30, 60, 100, 200, 365}:
        create_notification(
            user["id"],
            "achievement",
            f"Chuỗi học đạt {streak} ngày",
            "Bạn đã duy trì nhịp học đều đặn. Hoàn thành một hoạt động vào ngày mai để nối dài chuỗi.",
            action_url="/dashboard",
            dedupe_key=f"streak-milestone:{streak}",
        )
    return {"user": user_payload(updated)}


def validate_frontend_origin(origin: str, request: Request) -> str:
    parsed = urlparse(origin)
    configured = urlparse(config.CLIENT_URL)
    if parsed.scheme not in ("http", "https") or not parsed.hostname:
        return config.CLIENT_URL
    if parsed.hostname in {request.url.hostname, configured.hostname, "localhost", "127.0.0.1"}:
        return f"{parsed.scheme}://{parsed.netloc}"
    return config.CLIENT_URL


@router.get("/google/start")
def google_start(
    request: Request,
    remember: bool = Query(True),
    frontend_origin: str = Query(""),
):
    if not config.GOOGLE_CLIENT_ID or not config.GOOGLE_CLIENT_SECRET:
        raise HTTPException(status_code=503, detail="Google OAuth chưa được cấu hình trên máy chủ.")
    origin = validate_frontend_origin(frontend_origin or config.CLIENT_URL, request)
    state = encode_oauth_state({"origin": origin, "remember": remember})
    query = urlencode({
        "client_id": config.GOOGLE_CLIENT_ID,
        "redirect_uri": config.GOOGLE_REDIRECT_URI,
        "response_type": "code",
        "scope": "openid email profile",
        "access_type": "offline",
        "prompt": "select_account",
        "state": state,
    })
    return RedirectResponse(f"https://accounts.google.com/o/oauth2/v2/auth?{query}")


@router.get("/google/callback")
async def google_callback(code: str = "", state: str = "", error: str = ""):
    callback_url = f"{config.CLIENT_URL.rstrip('/')}/auth/callback"
    state_data = {}
    try:
        if state:
            state_data = decode_oauth_state(state) or {}
            origin = state_data.get("origin")
            if origin:
                callback_url = f"{origin.rstrip('/')}/auth/callback"
    except Exception:
        pass

    if error or not code:
        return RedirectResponse(f"{callback_url}#error={quote(error or 'Google không trả về mã đăng nhập.')}")

    try:
        async with httpx.AsyncClient(timeout=20) as client:
            token_response = await client.post(
                "https://oauth2.googleapis.com/token",
                data={
                    "code": code,
                    "client_id": config.GOOGLE_CLIENT_ID,
                    "client_secret": config.GOOGLE_CLIENT_SECRET,
                    "redirect_uri": config.GOOGLE_REDIRECT_URI,
                    "grant_type": "authorization_code",
                },
            )
            token_response.raise_for_status()
            access_token = token_response.json()["access_token"]
            profile_response = await client.get(
                "https://openidconnect.googleapis.com/v1/userinfo",
                headers={"Authorization": f"Bearer {access_token}"},
            )
            profile_response.raise_for_status()
            profile = profile_response.json()

        email = normalize_email(profile.get("email", ""))
        google_sub = str(profile.get("sub", ""))
        if not google_sub:
            raise ValueError("Google profile is missing sub")
        user = db.fetch_one(
            "SELECT * FROM users WHERE google_sub = ? OR email = ? LIMIT 1",
            (google_sub, email),
            use_cache=False,
        )
        google_pic = (profile.get("picture") or "").strip()
        if user:
            existing_pic = (user.get("avatar_url") or "").strip()
            final_pic = google_pic if (google_pic and (not existing_pic or "googleusercontent.com" in existing_pic)) else (existing_pic or google_pic)
            db.execute(
                """
                UPDATE users
                SET google_sub = ?, full_name = ?, avatar_url = ?,
                    auth_provider = CASE
                        WHEN password_hash IS NULL THEN 'google'
                        ELSE 'email,google'
                    END
                WHERE id = ?
                """,
                (
                    google_sub,
                    profile.get("name") or user.get("full_name"),
                    final_pic,
                    user["id"],
                ),
            )
            user_id = user["id"]
        else:
            user_id = str(uuid.uuid4())
            db.execute(
                """
                INSERT INTO users (
                    id, email, full_name, avatar_url, auth_provider, google_sub
                ) VALUES (?, ?, ?, ?, 'google', ?)
                """,
                (
                    user_id,
                    email,
                    profile.get("name") or email.split("@")[0],
                    google_pic,
                    google_sub,
                ),
            )
        session_user = db.fetch_one("SELECT * FROM users WHERE id = ?", (user_id,), use_cache=False)
        if session_user and is_access_expired(session_user):
            db.execute("DELETE FROM user_sessions WHERE user_id = ?", (user_id,))
            raise ValueError("Tài khoản đã hết thời hạn sử dụng. Vui lòng liên hệ Giảng viên.")
        session_token = create_session(user_id, remember=True)
        fragment = urlencode({
            "token": session_token,
            "remember": "1",
        })
        return RedirectResponse(f"{callback_url}#{fragment}")
    except Exception as callback_error:
        message = quote(str(callback_error)[:240] or "Không thể hoàn tất đăng nhập Google.")
        return RedirectResponse(f"{callback_url}#error={message}")
