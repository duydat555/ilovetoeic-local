import os
from pathlib import Path
from dotenv import load_dotenv

BASE_DIR = Path(__file__).resolve().parent.parent
ENV_FILE = BASE_DIR / ".env"

# Do not depend on the process working directory. Termux services and process
# managers commonly start the backend outside the `server` directory.
# Load deployment values before constructing the shared MySQL connection.
# Restart the API process after changing database credentials.
load_dotenv(dotenv_path=ENV_FILE, override=True)

DB_HOST = os.getenv("DB_HOST", "127.0.0.1")
DB_PORT = int(os.getenv("DB_PORT", "3306"))
DB_USER = os.getenv("DB_USER", "root")
DB_PASSWORD = os.getenv("DB_PASSWORD", "")
DB_NAME = os.getenv("DB_NAME", "toeic_db")

# Point MEDIA_DIR to local downloads folder containing all 4,050 MP3 audio files
LOCAL_DOWNLOADS = Path("c:/android-server/dautoeic/mock_test_data/downloads")
if LOCAL_DOWNLOADS.exists():
    MEDIA_DIR = LOCAL_DOWNLOADS
else:
    MEDIA_DIR = BASE_DIR / "static" / "media"

HOST = os.getenv("HOST", "0.0.0.0")
PORT = int(os.getenv("PORT", "8000"))

# Translation API Configuration (DeepL, Gemini, Google Cloud Translation)
DEEPL_API_KEY = os.getenv("DEEPL_API_KEY", "")
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "")
GEMINI_MODEL = os.getenv("GEMINI_MODEL", "gemini-3.5-flash-lite")
GOOGLE_CLOUD_PROJECT = os.getenv("GOOGLE_CLOUD_PROJECT", "")
GOOGLE_APPLICATION_CREDENTIALS = os.getenv("GOOGLE_APPLICATION_CREDENTIALS", "")
GOOGLE_TRANSLATE_API_KEY = os.getenv("GOOGLE_TRANSLATE_API_KEY", "")

# Authentication and Google OAuth
APP_SECRET = os.getenv("APP_SECRET", "change-this-secret-in-production")
PUBLIC_API_URL = os.getenv("PUBLIC_API_URL", f"http://127.0.0.1:{os.getenv('PORT', '8000')}")
CLIENT_URL = os.getenv("CLIENT_URL", "http://localhost:5173").rstrip("/")
GOOGLE_CLIENT_ID = os.getenv("GOOGLE_CLIENT_ID", "")
GOOGLE_CLIENT_SECRET = os.getenv("GOOGLE_CLIENT_SECRET", "")
GOOGLE_REDIRECT_URI = os.getenv(
    "GOOGLE_REDIRECT_URI",
    f"{PUBLIC_API_URL.rstrip('/')}/api/v1/auth/google/callback",
)

# Cloudflare R2 (S3-compatible media storage)
R2_ACCOUNT_ID = os.getenv("R2_ACCOUNT_ID", "")
R2_ACCESS_KEY_ID = os.getenv("R2_ACCESS_KEY_ID", "")
R2_SECRET_ACCESS_KEY = os.getenv("R2_SECRET_ACCESS_KEY", "")
R2_BUCKET_NAME = os.getenv("R2_BUCKET_NAME", "")
R2_PUBLIC_BASE_URL = os.getenv("R2_PUBLIC_BASE_URL", "").rstrip("/")

# Performance & Concurrency Tuning for Samsung A50 Termux Server
MAX_GEMINI_CONCURRENCY = int(os.getenv("MAX_GEMINI_CONCURRENCY", "10"))
RAM_CACHE_MAX_SIZE = int(os.getenv("RAM_CACHE_MAX_SIZE", "2000"))

# Redis Session & Shared Cache Configuration
REDIS_ENABLED = os.getenv("REDIS_ENABLED", "true").lower() in ("true", "1", "yes")
REDIS_HOST = os.getenv("REDIS_HOST", "127.0.0.1")
REDIS_PORT = int(os.getenv("REDIS_PORT", "6379"))
REDIS_PASSWORD = os.getenv("REDIS_PASSWORD") or None
REDIS_DB = int(os.getenv("REDIS_DB", "0"))
L0_CACHE_MAX_SIZE = int(os.getenv("L0_CACHE_MAX_SIZE", "1000"))


