import uuid
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings
from app.core.telemetry import dbg_emit
from app.database.db import db
from app.api.v1 import diagnose, auth

app = FastAPI(title=settings.PROJECT_TITLE)

app.add_middleware(
    CORSMiddleware, 
    allow_origins=settings.CORS_ORIGINS,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Registrasi Router
app.include_router(auth.router, prefix="/api/v1/auth", tags=["Auth"])
app.include_router(diagnose.router, prefix="/api/v1", tags=["Diagnosis"])

@app.on_event("startup")
async def startup():
    trace_id = str(uuid.uuid4())
    dbg_emit(hypothesis_id="A", location="main.py", msg="startup.begin", data={}, trace_id=trace_id)
    try:
        await db.connect()
        dbg_emit(hypothesis_id="A", location="main.py", msg="startup.db_connected", data={}, trace_id=trace_id)
    except Exception as e:
        dbg_emit(hypothesis_id="A", location="main.py", msg="startup.db_connect_failed", data={"error": str(e)}, trace_id=trace_id)
        raise

@app.on_event("shutdown")
async def shutdown():
    await db.disconnect()
