import os
from pathlib import Path
from dotenv import load_dotenv
from typing import Set, List

BASE_DIR = Path(__file__).resolve().parent.parent.parent
load_dotenv(dotenv_path=BASE_DIR / ".env")

class Settings:
    PROJECT_TITLE: str = "Dental Lesion Detection API"
    SECRET_KEY : str = os.getenv("SECRET_KEY", "super-secret-key-ganti-di-production")
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 7

    ROBOFLOW_API_KEY: str = os.getenv("ROBOFLOW_API_KEY", "")
    ROBOFLOW_API_URL: str = os.getenv("ROBOFLOW_API_URL", "https://serverless.roboflow.com")
    ROBOFLOW_MODEL_ID: str = os.getenv("ROBOFLOW_MODEL_ID", "new-dental-dataset-3o8vv/6")

    MAX_UPLOAD_BYTES: int = int(os.getenv("MAX_UPLOAD_BYTES", str(10 * 1024 * 1024)))
    DEBUG: bool = os.getenv("DEBUG", "").lower() in {"1", "true", "yes"}

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
