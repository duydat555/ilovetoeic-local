from datetime import datetime
from fastapi import APIRouter
from app.db import db

router = APIRouter(prefix="/api/v1", tags=["Status"])

@router.get("/status")
def get_status():
    return {
        "success": db.is_connected,
        "service": "TOEIC REST API Server",
        "database_backend": "MySQL",
        "database": {
            "connected": db.is_connected,
        },
        "timestamp": datetime.now().isoformat(),
        "endpoints": {
            "test_sets": "/api/v1/test-sets",
            "tests": "/api/v1/tests",
            "test_detail": "/api/v1/tests/{test_id}",
            "practice_full": "/api/v1/tests/{test_id}/full",
            "practice_part": "/api/v1/tests/{test_id}/parts/{part_num}",
            "submit_test": "/api/v1/tests/{test_id}/submit"
        }
    }
