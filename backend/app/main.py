import asyncio
import uuid

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from starlette.middleware.trustedhost import TrustedHostMiddleware

from app.api.v1 import diagnose, auth, history, patients, homebases, profile
from app.core.config import settings, validate_runtime_settings
from app.core.rate_limit import InMemoryRateLimiter
from app.core.telemetry import dbg_emit
from app.database.db import connect_db, disconnect_db

validate_runtime_settings()

app = FastAPI(
    title=settings.PROJECT_TITLE,
    docs_url=None if settings.IS_PRODUCTION else "/docs",
    redoc_url=None if settings.IS_PRODUCTION else "/redoc",
)

app.include_router(homebases.router, prefix="/api/v1", tags=["Homebases"])

async def add_security_headers(request: Request, call_next):
    request_id = request.headers.get("X-Request-ID") or str(uuid.uuid4())
    response = await call_next(request)
    response.headers["X-Request-ID"] = request_id
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["Referrer-Policy"] = "no-referrer"
    if request.url.path.startswith("/api/"):
        response.headers["Cache-Control"] = "no-store"
    if settings.IS_PRODUCTION:
        response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
    return response


rate_limiter = InMemoryRateLimiter()


@app.middleware("http")
async def ensure_database_for_api(request: Request, call_next):
    if request.url.path.startswith("/api/"):
        trace_id = str(uuid.uuid4())
        try:
            await connect_db()
        except Exception as e:
            dbg_emit(
                hypothesis_id="A",
                location="main.py",
                msg="request.db_connect_failed",
                data={"path": request.url.path, "error": str(e)},
                trace_id=trace_id,
            )
            return JSONResponse(
                status_code=503,
                content={"detail": "Database is not available"},
            )

    return await call_next(request)


@app.middleware("http")
async def enforce_rate_limits(request: Request, call_next):
    if request.method == "OPTIONS":
        return await call_next(request)

    auth_paths = {
        "/api/v1/auth/login",
        "/api/v1/auth/register",
        "/api/v1/auth/refresh",
    }
    if request.url.path in auth_paths:
        limit = settings.AUTH_RATE_LIMIT_PER_MINUTE
        category = "auth"
    elif request.url.path == "/api/v1/diagnose":
        limit = settings.DIAGNOSIS_RATE_LIMIT_PER_MINUTE
        category = "diagnose"
    else:
        return await call_next(request)

    client_ip = request.client.host if request.client else "unknown"
    allowed, retry_after = await rate_limiter.check(
        f"{category}:{client_ip}",
        limit,
    )
    if not allowed:
        return JSONResponse(
            status_code=429,
            content={"detail": "Terlalu banyak permintaan. Coba lagi nanti."},
            headers={"Retry-After": str(retry_after)},
        )
    return await call_next(request)


if settings.ALLOWED_HOSTS != ["*"]:
    app.add_middleware(
        TrustedHostMiddleware,
        allowed_hosts=settings.ALLOWED_HOSTS,
    )

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type", "X-Request-ID"],
    expose_headers=["X-Request-ID", "Retry-After"],
)
app.middleware("http")(add_security_headers)


# Registrasi Router
app.include_router(auth.router, prefix="/api/v1/auth", tags=["Auth"])
app.include_router(diagnose.router, prefix="/api/v1", tags=["Diagnosis"])
app.include_router(history.router, prefix="/api/v1", tags=["History"])
app.include_router(patients.router, prefix="/api/v1", tags=["Patients"])
app.include_router(profile.router, prefix="/api/v1", tags=["Profile"])


@app.get("/health")
async def health_check():
    return {"status": "ok", "service": settings.PROJECT_TITLE}


@app.get("/ready")
async def readiness_check():
    trace_id = str(uuid.uuid4())
    try:
        await asyncio.wait_for(connect_db(), timeout=settings.DB_CONNECT_TIMEOUT_SECONDS)
    except Exception as e:
        dbg_emit(
            hypothesis_id="A",
            location="main.py",
            msg="ready.db_connect_failed",
            data={"error": str(e)},
            trace_id=trace_id,
        )
        return JSONResponse(
            status_code=503,
            content={"status": "not_ready", "database": "unavailable"},
        )

    return {"status": "ready", "database": "connected"}


@app.on_event("startup")
async def startup():
    trace_id = str(uuid.uuid4())
    dbg_emit(hypothesis_id="A", location="main.py", msg="startup.begin", data={}, trace_id=trace_id)

    if not settings.CONNECT_DB_ON_STARTUP:
        dbg_emit(hypothesis_id="A", location="main.py", msg="startup.db_connect_skipped", data={}, trace_id=trace_id)
        return

    try:
        await asyncio.wait_for(connect_db(), timeout=settings.DB_CONNECT_TIMEOUT_SECONDS)
        dbg_emit(hypothesis_id="A", location="main.py", msg="startup.db_connected", data={}, trace_id=trace_id)
    except Exception as e:
        dbg_emit(hypothesis_id="A", location="main.py", msg="startup.db_connect_failed", data={"error": str(e)}, trace_id=trace_id)
        if settings.REQUIRE_DB_ON_STARTUP:
            raise


@app.on_event("shutdown")
async def shutdown():
    await disconnect_db()
