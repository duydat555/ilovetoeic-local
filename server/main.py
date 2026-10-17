import uvicorn
from pathlib import Path
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from fastapi.staticfiles import StaticFiles

from app import config
from app.routers import (
    admin_feature_status,
    audio_proxy,
    auth,
    community_chat,
    feedback,
    features,
    grammar,
    gemini,
    ranking,
    notifications,
    practice,
    status,
    submissions,
    tests,
    user_data,
    exam_notes,
    system_vocabulary,
    listening,
    study_time,
    gamification,
    announcements,
    classes,
)

from contextlib import asynccontextmanager
from app.services.gemini_service import gemini_service

@asynccontextmanager
async def lifespan(app: FastAPI):
    gemini_service.start_background_flush_task()
    yield
    await gemini_service.shutdown()

app = FastAPI(
    title="TOEIC Practice REST API Server",
    description="REST API Server cho Website/App Học TOEIC dùng MySQL",
    version="2.0.0",
    lifespan=lifespan,
)

# Enable GZip Compression (Giảm dung lượng response truyền qua LAN/Internet)
app.add_middleware(GZipMiddleware, minimum_size=1000)

# Enable CORS for cross-origin requests from Web/App clients on LAN
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Static file serving for audio MP3 and images with 1-year browser caching & CORS headers
config.MEDIA_DIR.mkdir(parents=True, exist_ok=True)

class CachedStaticFiles(StaticFiles):
    async def get_response(self, path: str, scope):
        response = await super().get_response(path, scope)
        response.headers["Cache-Control"] = "public, max-age=31536000, immutable"
        response.headers["Access-Control-Allow-Origin"] = "*"
        return response

app.mount("/media", CachedStaticFiles(directory=str(config.MEDIA_DIR)), name="media")

# Include API Routers
app.include_router(status.router)
app.include_router(admin_feature_status.router)
app.include_router(tests.router)
app.include_router(practice.router)
app.include_router(submissions.router)
app.include_router(audio_proxy.router)
app.include_router(gemini.router)
app.include_router(auth.router)
app.include_router(feedback.router)
app.include_router(features.router)
app.include_router(grammar.router)
app.include_router(user_data.router)
app.include_router(exam_notes.router)
app.include_router(system_vocabulary.router)
app.include_router(ranking.router)
app.include_router(notifications.router)
app.include_router(community_chat.router)
app.include_router(listening.router)
app.include_router(study_time.router)
app.include_router(gamification.router)
app.include_router(announcements.router)
app.include_router(classes.router)




@app.get("/")
def root():
    return {
        "message": "Chào mừng tới TOEIC Practice REST API Server!",
        "documentation": "/docs",
        "status_endpoint": "/api/v1/status"
    }

if __name__ == "__main__":
    print("=" * 60)
    print("TOEIC REST API SERVER - STARTING")
    print(f"Server host: {config.HOST}:{config.PORT}")
    print(f"Swagger API Docs: http://127.0.0.1:{config.PORT}/docs")
    print("=" * 60)
    uvicorn.run("main:app", host=config.HOST, port=config.PORT, reload=True)
