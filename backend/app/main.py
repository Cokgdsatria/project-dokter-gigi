import asyncio
import uuid

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.api.v1 import diagnose, auth, history, patients
from app.core.config import settings
from app.core.telemetry import dbg_emit
from app.database.db import connect_db, disconnect_db

app = FastAPI(title=settings.PROJECT_TITLE)

app.add_middleware(
    CORSMiddleware, 
    allow_origins=settings.CORS_ORIGINS,
    allow_methods=["*"],
    allow_headers=["*"],
)


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


# Registrasi Router
app.include_router(auth.router, prefix="/api/v1/auth", tags=["Auth"])
app.include_router(diagnose.router, prefix="/api/v1", tags=["Diagnosis"])
app.include_router(history.router, prefix="/api/v1", tags=["History"])
app.include_router(patients.router, prefix="/api/v1", tags=["Patients"])


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