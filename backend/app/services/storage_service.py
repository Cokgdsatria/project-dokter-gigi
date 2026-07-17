import re
import uuid
from pathlib import Path
from typing import Optional

import anyio
from supabase import create_client

from app.core.config import settings


def _get_storage_client():
    if not settings.SUPABASE_URL or not settings.SUPABASE_SERVICE_ROLE_KEY:
        raise RuntimeError("Supabase Storage belum dikonfigurasi")

    return create_client(settings.SUPABASE_URL, settings.SUPABASE_SERVICE_ROLE_KEY)


def _safe_file_name(filename: str) -> str:
    path = Path(filename or "rontgen.jpg")
    stem = re.sub(r"[^a-zA-Z0-9_-]+", "-", path.stem).strip("-") or "rontgen"
    suffix = path.suffix.lower() if path.suffix else ".jpg"

    return f"{stem}{suffix}"


def _upload_scan_image_sync(
    image_bytes: bytes,
    filename: str,
    content_type: Optional[str],
    doctor_id: str,
) -> str:
    client = _get_storage_client()
    safe_filename = _safe_file_name(filename)
    object_path = f"rontgen/{doctor_id}/{uuid.uuid4().hex}-{safe_filename}"

    client.storage.from_(settings.SUPABASE_BUCKET).upload(
        path=object_path,
        file=image_bytes,
        file_options={
            "content-type": content_type or "image/jpeg",
            "upsert": "false",
        },
    )

    return client.storage.from_(settings.SUPABASE_BUCKET).get_public_url(object_path)


async def upload_scan_image(
    image_bytes: bytes,
    filename: str,
    content_type: Optional[str],
    doctor_id: str,
) -> str:
    return await anyio.to_thread.run_sync(
        _upload_scan_image_sync,
        image_bytes,
        filename,
        content_type,
        doctor_id,
    )
