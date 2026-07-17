import os
from pathlib import Path
from dotenv import load_dotenv
from typing import Set, List

BASE_DIR = Path(__file__).resolve().parent.parent.parent
load_dotenv(dotenv_path=BASE_DIR / ".env")


def env_bool(name: str, default: bool = False) -> bool:
    raw = os.getenv(name)
    if raw is None:
        return default
    return raw.strip().lower() in {"1", "true", "yes", "on"}


class Settings:
    PROJECT_TITLE: str = "Dental Lesion Detection API"
    SECRET_KEY : str = os.getenv("SECRET_KEY", "super-secret-key-ganti-di-production")
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 7

    ROBOFLOW_API_KEY: str = os.getenv("ROBOFLOW_API_KEY", "")
    ROBOFLOW_API_URL: str = os.getenv("ROBOFLOW_API_URL", "https://serverless.roboflow.com")
    ROBOFLOW_MODEL_ID: str = os.getenv("ROBOFLOW_MODEL_ID", "new-dental-dataset-3o8vv/6")

    SUPABASE_URL: str = os.getenv("SUPABASE_URL", "")
    SUPABASE_SERVICE_ROLE_KEY: str = os.getenv("SUPABASE_SERVICE_ROLE_KEY", "")
    SUPABASE_BUCKET: str = os.getenv("SUPABASE_BUCKET", "dental-images")

    MAX_UPLOAD_BYTES: int = int(os.getenv("MAX_UPLOAD_BYTES", str(10 * 1024 * 1024)))
    DEBUG: bool = env_bool("DEBUG")
    CONNECT_DB_ON_STARTUP: bool = env_bool("CONNECT_DB_ON_STARTUP")
    REQUIRE_DB_ON_STARTUP: bool = env_bool("REQUIRE_DB_ON_STARTUP")
    DB_CONNECT_TIMEOUT_SECONDS: float = float(os.getenv("DB_CONNECT_TIMEOUT_SECONDS", "5"))

    @property
    def ALLOWED_IMAGE_MIME(self) -> Set[str]:
        return {m.strip().lower() for m in os.getenv("ALLOWED_IMAGE_MIME", "image/jpeg,image/png").split(",") if m.strip()}
    
    @property
    def CORS_ORIGINS(self) -> List[str]:
        raw = os.getenv("CORS_ORIGINS", "*").strip()
        if raw == "*":
            return ["*"]
        return [o.strip() for o in raw.split(",") if o.strip()]
    
settings = Settings()