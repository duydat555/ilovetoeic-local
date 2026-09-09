import asyncio
from fastapi import APIRouter, HTTPException, Query, BackgroundTasks
from pydantic import BaseModel, Field
from typing import List, Literal, Optional, Dict, Any


from app.services.gemini_service import gemini_service

router = APIRouter(prefix="/api/v1/translate", tags=["Gemini Translation API"])

class TranslationRequest(BaseModel):
    text: str = Field(..., min_length=1, max_length=100, example="accommodate", description="Từ vựng hoặc đoạn văn cần dịch")
    source_lang: Optional[str] = Field("en", example="en", description="Mã ngôn ngữ nguồn")
    target_lang: Optional[str] = Field("vi", example="vi", description="Mã ngôn ngữ đích")
    context: Optional[str] = Field("toeic", example="toeic", description="Ngữ cảnh dịch thuật")

class BatchTranslationRequest(BaseModel):
    items: List[str] = Field(..., example=["budget", "schedule", "proposal"], description="Danh sách các từ/câu cần dịch")
    source_lang: Optional[str] = "en"
    target_lang: Optional[str] = "vi"
    context: Optional[str] = "toeic"

class TranslationDetailRequest(BaseModel):
    text: str = Field(..., min_length=1, max_length=100)
    section: Literal["collocations", "examples", "synonyms", "wordFamily"]
    source_lang: Optional[str] = "en"
    target_lang: Optional[str] = "vi"
    context: Optional[str] = "toeic"

@router.post("", summary="Dịch từ vựng / câu (Tối ưu hóa Cache 2 lớp & Concurrency)")
async def translate_single(req: TranslationRequest):
    if not req.text or not req.text.strip():
        raise HTTPException(status_code=400, detail="Nội dung 'text' không được để trống.")
    
    result = await gemini_service.translate_text(
        text=req.text.strip(),
        src_lang=req.source_lang,
        target_lang=req.target_lang,
        context=req.context
    )
    if result.get("cache_source") == "error":
        raise HTTPException(status_code=503, detail=result.get("error", "Dịch vụ Gemini tạm thời không khả dụng."))
    return result

@router.post("/batch", summary="Dịch theo lô (Batch translation cho danh sách từ vựng)")
async def translate_batch(req: BatchTranslationRequest):
    if not req.items:
        raise HTTPException(status_code=400, detail="Danh sách 'items' không được để trống.")
    
    if len(req.items) > 50:
        raise HTTPException(status_code=400, detail="Một batch tối đa chỉ hỗ trợ 50 từ/câu.")

    tasks = [
        gemini_service.translate_text(
            text=item.strip(),
            src_lang=req.source_lang,
            target_lang=req.target_lang,
            context=req.context
        )
        for item in req.items if item and item.strip()
    ]

    results = await asyncio.gather(*tasks)
    return {
        "count": len(results),
        "data": results
    }

@router.post("/details", summary="Tải chi tiết từ điển theo từng tab")
async def translate_detail(req: TranslationDetailRequest):
    result = await gemini_service.get_dictionary_detail(
        text=req.text.strip(),
        section=req.section,
        context=req.context or "TOEIC",
    )
    if result.get("cache_source") == "error":
        raise HTTPException(status_code=503, detail=result.get("error", "Không thể tải dữ liệu từ Gemini."))
    return result

@router.get("/passage/{passage_id}", summary="Lấy trước từ vựng cho bài đọc (Passage Vocabulary Pre-warming)")
async def get_passage_vocabulary(passage_id: str):
    if not passage_id or not passage_id.strip():
        raise HTTPException(status_code=400, detail="passage_id không được để trống.")
    return await asyncio.to_thread(gemini_service.get_passage_vocabulary, passage_id.strip())

@router.get("/cache-stats", summary="Thống kê hiệu quả bộ nhớ Cache & Tải hệ thống")
def get_cache_stats():
    return gemini_service.get_cache_stats()
