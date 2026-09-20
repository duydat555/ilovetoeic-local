import logging
from typing import Optional
from fastapi import APIRouter, Depends, Query

from app.security import get_current_user
from app.services.study_progress_service import (
    get_ai_score_prediction,
    get_user_skills_radar,
    update_user_target_goal,
)
from app.services.xp_service import (
    calculate_user_level,
    get_level_definitions,
    get_user_xp_history,
)
from pydantic import BaseModel, Field

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1/gamification", tags=["Gamification & Levels"])


@router.get("/level-info", summary="Thông tin cấp độ và tiến trình XP hiện tại của học viên")
def get_user_level_info(
    user=Depends(get_current_user),
):
    """Returns level progress, badge icon, title, and XP required for next level."""
    total_xp = int(user.get("xp") or 0)
    info = calculate_user_level(total_xp)
    return {
        "success": True,
        "data": info,
    }


@router.get("/level-definitions", summary="Danh sách toàn bộ các cấp độ và danh hiệu")
def get_all_levels():
    """Returns all 16 levels and requirements for public reference."""
    levels = get_level_definitions()
    return {
        "success": True,
        "data": levels,
    }


@router.get("/xp-history", summary="Lịch sử giao dịch sổ cái XP (Audit Ledger)")
def get_xp_history(
    limit: int = Query(default=20, ge=1, le=100),
    user=Depends(get_current_user),
):
    """Returns recent XP ledger entries for user."""
    history = get_user_xp_history(user["id"], limit=limit)
    return {
        "success": True,
        "data": history,
    }


@router.get("/skills-radar", summary="Phân tích kỹ năng 7 Part dạng biểu đồ Radar")
def get_skills_radar_endpoint(
    user=Depends(get_current_user),
):
    """Returns 7-part mastery, accuracy rates, and AI recommendations for spider chart."""
    radar_data = get_user_skills_radar(user["id"])
    return {
        "success": True,
        "data": radar_data,
    }


class TargetGoalPayload(BaseModel):
    targetScore: Optional[int] = Field(default=None, ge=100, le=990, description="Mục tiêu điểm số TOEIC (100-990)")
    examDate: Optional[str] = Field(default=None, description="Ngày dự kiến thi (YYYY-MM-DD)")
    targetDate: Optional[str] = Field(default=None, description="Ngày dự kiến thi (YYYY-MM-DD) - tương thích ngược")


@router.get("/prediction", summary="Dự đoán điểm TOEIC và xác suất đạt mục tiêu từ AI")
def get_prediction_endpoint(
    user=Depends(get_current_user),
):
    prediction = get_ai_score_prediction(user["id"])
    return {
        "success": True,
        "data": prediction,
    }


@router.put("/goal", summary="Cập nhật mục tiêu điểm TOEIC và ngày thi")
def update_target_goal_endpoint(
    payload: TargetGoalPayload,
    user=Depends(get_current_user),
):
    chosen_date = payload.examDate or payload.targetDate
    res = update_user_target_goal(
        user_id=user["id"],
        target_score=payload.targetScore,
        exam_date=chosen_date,
    )
    return res


