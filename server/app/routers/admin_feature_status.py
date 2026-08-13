from fastapi import APIRouter, Depends, HTTPException

from app.db import db
from app.security import get_current_user


router = APIRouter(prefix="/api/v1/admin/feature-status", tags=["Admin feature status"])


@router.get("")
def get_admin_feature_statuses(user=Depends(get_current_user)):
    if user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Chỉ Giáo viên được xem trạng thái tính năng.")
    rows = db.fetch_all(
        """
        SELECT route, status, title, description, icon_key, action_label, action_path
        FROM admin_feature_statuses
        WHERE route NOT IN ('/admin/homework', '/admin/overview')
        ORDER BY sort_order, route
        """,
        use_cache=False,
    )
    return {"data": rows}
