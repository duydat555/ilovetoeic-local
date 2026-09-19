import logging
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field

from app.security import get_current_user
from app.services.study_progress_service import (
    get_today_study_seconds,
    get_weekly_study_time,
    record_study_activity,
    update_daily_goal,
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1/study-time", tags=["Study Time Tracking"])


class StudyPingPayload(BaseModel):
    seconds: int = Field(default=30, ge=1, le=60, description="Active study seconds in current interval (1-60s)")
    source: str = Field(default="heartbeat", max_length=50)


@router.post("/ping", summary="Ghi nhận thời gian học thực tế (Heartbeat)")
def ping_study_time(
    payload: StudyPingPayload,
    user=Depends(get_current_user),
):
    """Client calls this periodically (every 30-60s) when the tab is actively visible.
    Accumulates time into user_daily_study_time and keeps the study streak up to date.
    """
    res = record_study_activity(
        user_id=user["id"],
        seconds_spent=payload.seconds,
        source=payload.source,
        user_dict=user,
    )
    if not res.get("success"):
        raise HTTPException(status_code=500, detail="Không thể ghi nhận thời gian học.")

    today_sec = get_today_study_seconds(user["id"])
    return {
        "success": True,
        "secondsAdded": payload.seconds,
        "todaySeconds": today_sec,
        "todayMinutes": round(today_sec / 60, 1),
        "streakDays": res.get("streak_days", user.get("streak_days", 0)),
    }


@router.get("/weekly", summary="Thống kê thời gian học 7 ngày gần nhất")
def get_weekly_study_stats(
    user=Depends(get_current_user),
):
    """Returns 7-day study time history with daily goals for progress bar chart."""
    data = get_weekly_study_time(user["id"])
    return {
        "success": True,
        "data": data,
    }


@router.get("/today", summary="Thời gian học hôm nay")
def get_today_study_stats(
    user=Depends(get_current_user),
):
    today_sec = get_today_study_seconds(user["id"])
    return {
        "success": True,
        "todaySeconds": today_sec,
        "todayMinutes": round(today_sec / 60, 1),
    }


class UpdateGoalPayload(BaseModel):
    dailyGoalMinutes: int = Field(default=30, ge=5, le=360, description="Mục tiêu học mỗi ngày tính bằng phút (5-360)")


@router.put("/goal", summary="Cập nhật mục tiêu học mỗi ngày")
def update_study_goal_endpoint(
    payload: UpdateGoalPayload,
    user=Depends(get_current_user),
):
    saved_goal = update_daily_goal(user["id"], payload.dailyGoalMinutes)
    return {
        "success": True,
        "dailyGoalMinutes": saved_goal,
    }

