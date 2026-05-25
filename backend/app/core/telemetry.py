import os
import json
import time
import urllib.request
from pathlib import Path
from typing import Dict, Any, Optional

BASE_DIR = Path(__file__).resolve().parent.parent.parent
DEBUG_RUN_ID = os.getenv("DEBUG_RUN_ID", "pre")

def _dbg_env() -> Dict[str, str]:
    candidates = [
        BASE_DIR / ".dbg" / "diagnose-500-error.env",
        Path.cwd() / ".dbg" / "diagnose-500-error.env",
    ]
    for p in candidates:
        try:
            if p.exists():
                content = p.read_text(encoding="utf-8")
                out: Dict[str, str] = {}
                for line in content.splitlines():
                    if "=" in line:
                        k, v = line.split("=", 1)
                        out[k.strip()] = v.strip()
                if out: 
                    return out
        except Exception:
            continue
    return {}

_DBG_ENV = _dbg_env()
DEBUG_SERVER_URL = os.getenv("DEBUG_SERVER_URL") or _DBG_ENV.get("DEBUG_SERVER_URL", "")
DEBUG_SESSION_ID = os.getenv("DEBUG_SESSION_ID") or _DBG_ENV.get("DEBUG_SESSION_ID", "diagnose-500-error")

def dbg_emit(*, hypothesis_id: str, location: str, msg: str, data: Dict[str, Any], trace_id: Optional[str] = None) -> None:
    if not DEBUG_SERVER_URL:
        return
    payload = {
        "sessionId": DEBUG_SESSION_ID,
        "runId": DEBUG_RUN_ID,
        "hypothesisId": hypothesis_id,
        "location": location,
        "msg": f"[DEBUG] {msg}",
        "data": data,
        "ts": int(time.time() * 1000),
        "traceId": trace_id,
    }
    try:
        urllib.request.urlopen(
            urllib.request.Request(
                DEBUG_SERVER_URL,
                data=json.dumps(payload, ensure_ascii=False).encode("utf-8"),
                headers={"Content-Type": "application/json"},
                method="POST",
            ), timeout=1.5
        ).read()
    except Exception:
        pass