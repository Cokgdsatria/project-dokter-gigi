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
    ENVIRONMENT: str = os.getenv("ENVIRONMENT", "development").strip().lower()
    SECRET_KEY: str = os.getenv("SECRET_KEY", "super-secret-key-ganti-di-production")
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "15"))
    REFRESH_TOKEN_EXPIRE_DAYS: int = int(os.getenv("REFRESH_TOKEN_EXPIRE_DAYS", "30"))
    SESSION_ABSOLUTE_EXPIRE_HOURS: int = int(
        os.getenv("SESSION_ABSOLUTE_EXPIRE_HOURS", "8")
    )

    ROBOFLOW_API_KEY: str = os.getenv("ROBOFLOW_API_KEY", "")
    ROBOFLOW_API_URL: str = os.getenv("ROBOFLOW_API_URL", "https://serverless.roboflow.com")
    ROBOFLOW_MODEL_ID: str = os.getenv("ROBOFLOW_MODEL_ID", "new-dental-dataset-3o8vv/6")
    ROBOFLOW_TIMEOUT_SECONDS: float = float(os.getenv("ROBOFLOW_TIMEOUT_SECONDS", "45"))
    ROBOFLOW_RETRY_ATTEMPTS: int = int(os.getenv("ROBOFLOW_RETRY_ATTEMPTS", "2"))
    ROBOFLOW_RETRY_BACKOFF_SECONDS: float = float(
        os.getenv("ROBOFLOW_RETRY_BACKOFF_SECONDS", "1")
    )
    ROBOFLOW_CONFIDENCE_THRESHOLD: float = float(
        os.getenv("ROBOFLOW_CONFIDENCE_THRESHOLD", "0.50")
    )
    ROBOFLOW_OVERLAP_THRESHOLD: float = float(
        os.getenv("ROBOFLOW_OVERLAP_THRESHOLD", "0.42")
    )
    ROBOFLOW_RESPONSE_MASK_FORMAT: str = os.getenv(
        "ROBOFLOW_RESPONSE_MASK_FORMAT", "polygon"
    ).strip().lower()
    DIAGNOSIS_ASYNC_ENABLED: bool = env_bool("DIAGNOSIS_ASYNC_ENABLED")
    DIAGNOSIS_WORKER_POLL_SECONDS: float = float(
        os.getenv("DIAGNOSIS_WORKER_POLL_SECONDS", "2")
    )
    DIAGNOSIS_STALE_MINUTES: int = int(
        os.getenv("DIAGNOSIS_STALE_MINUTES", "10")
    )
    AUTH_RATE_LIMIT_PER_MINUTE: int = int(
        os.getenv("AUTH_RATE_LIMIT_PER_MINUTE", "10")
    )
    DIAGNOSIS_RATE_LIMIT_PER_MINUTE: int = int(
        os.getenv("DIAGNOSIS_RATE_LIMIT_PER_MINUTE", "5")
    )

    SUPABASE_URL: str = os.getenv("SUPABASE_URL", "")
    SUPABASE_SERVICE_ROLE_KEY: str = os.getenv("SUPABASE_SERVICE_ROLE_KEY", "")
    SUPABASE_BUCKET: str = os.getenv("SUPABASE_BUCKET", "dental-images")
    SIGNED_URL_EXPIRE_SECONDS: int = int(
        os.getenv("SIGNED_URL_EXPIRE_SECONDS", "900")
    )

    MAX_UPLOAD_BYTES: int = int(os.getenv("MAX_UPLOAD_BYTES", str(10 * 1024 * 1024)))
    MAX_IMAGE_PIXELS: int = int(os.getenv("MAX_IMAGE_PIXELS", "40000000"))
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

    @property
    def ALLOWED_HOSTS(self) -> List[str]:
        raw = os.getenv("ALLOWED_HOSTS", "*").strip()
        if raw == "*":
            return ["*"]
        return [host.strip() for host in raw.split(",") if host.strip()]

    @property
    def IS_PRODUCTION(self) -> bool:
        return self.ENVIRONMENT == "production"


def validate_runtime_settings() -> None:
    errors = []

    model_project, separator, model_version = settings.ROBOFLOW_MODEL_ID.rpartition("/")
    if (
        separator != "/"
        or not model_project.strip()
        or not model_version.isdigit()
        or int(model_version) <= 0
    ):
        errors.append("ROBOFLOW_MODEL_ID harus berformat 'project/version'")
    if not 0.0 <= settings.ROBOFLOW_CONFIDENCE_THRESHOLD <= 1.0:
        errors.append("ROBOFLOW_CONFIDENCE_THRESHOLD harus antara 0 dan 1")

    if not 0.0 <= settings.ROBOFLOW_OVERLAP_THRESHOLD <= 1.0:
        errors.append("ROBOFLOW_OVERLAP_THRESHOLD harus antara 0 dan 1")

    if settings.ROBOFLOW_RESPONSE_MASK_FORMAT not in {"polygon", "rle"}:
        errors.append("ROBOFLOW_RESPONSE_MASK_FORMAT harus 'polygon' atau 'rle'")
    if settings.IS_PRODUCTION:
        if (
            settings.SECRET_KEY == "super-secret-key-ganti-di-production"
            or len(settings.SECRET_KEY) < 32
        ):
            errors.append("SECRET_KEY production wajib acak dan minimal 32 karakter")
        if settings.CORS_ORIGINS == ["*"]:
            errors.append("CORS_ORIGINS production tidak boleh '*'")
        if settings.ALLOWED_HOSTS == ["*"]:
            errors.append("ALLOWED_HOSTS production tidak boleh '*'")
        if not settings.ROBOFLOW_API_KEY:
            errors.append("ROBOFLOW_API_KEY wajib di environment production")

    if settings.ACCESS_TOKEN_EXPIRE_MINUTES <= 0:
        errors.append("ACCESS_TOKEN_EXPIRE_MINUTES harus lebih dari 0")
    if settings.REFRESH_TOKEN_EXPIRE_DAYS <= 0:
        errors.append("REFRESH_TOKEN_EXPIRE_DAYS harus lebih dari 0")
    if settings.SESSION_ABSOLUTE_EXPIRE_HOURS <= 0:
        errors.append("SESSION_ABSOLUTE_EXPIRE_HOURS harus lebih dari 0")
    if (
        settings.SESSION_ABSOLUTE_EXPIRE_HOURS
        > settings.REFRESH_TOKEN_EXPIRE_DAYS * 24
    ):
        errors.append(
            "SESSION_ABSOLUTE_EXPIRE_HOURS tidak boleh melebihi umur refresh token"
        )
    if settings.ROBOFLOW_RETRY_ATTEMPTS <= 0:
        errors.append("ROBOFLOW_RETRY_ATTEMPTS harus lebih dari 0")
    if settings.DIAGNOSIS_WORKER_POLL_SECONDS <= 0:
        errors.append("DIAGNOSIS_WORKER_POLL_SECONDS harus lebih dari 0")
    if settings.DIAGNOSIS_STALE_MINUTES <= 0:
        errors.append("DIAGNOSIS_STALE_MINUTES harus lebih dari 0")
    if settings.MAX_IMAGE_PIXELS <= 0:
        errors.append("MAX_IMAGE_PIXELS harus lebih dari 0")
    if settings.AUTH_RATE_LIMIT_PER_MINUTE <= 0:
        errors.append("AUTH_RATE_LIMIT_PER_MINUTE harus lebih dari 0")
    if settings.DIAGNOSIS_RATE_LIMIT_PER_MINUTE <= 0:
        errors.append("DIAGNOSIS_RATE_LIMIT_PER_MINUTE harus lebih dari 0")

    if errors:
        raise RuntimeError("; ".join(errors))


settings = Settings()
