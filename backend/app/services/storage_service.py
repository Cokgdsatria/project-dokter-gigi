import re
import uuid
from pathlib import Path
from typing import Dict, List, Optional

import anyio
from supabase import create_client

from app.core.config import settings


MIME_EXTENSIONS = {
    "image/jpeg": ".jpg",
    "image/png": ".png",
}


def _get_storage_client():
    if not settings.SUPABASE_URL or not settings.SUPABASE_SERVICE_ROLE_KEY:
        raise RuntimeError("Supabase Storage belum dikonfigurasi")

    return create_client(settings.SUPABASE_URL, settings.SUPABASE_SERVICE_ROLE_KEY)


def _safe_file_name(filename: str, content_type: Optional[str]) -> str:
    path = Path(filename or "rontgen.jpg")
    stem = re.sub(r"[^a-zA-Z0-9_-]+", "-", path.stem).strip("-") or "rontgen"
    normalized_content_type = (content_type or "").lower()
    suffix = MIME_EXTENSIONS.get(normalized_content_type, ".jpg")

    return f"{stem}{suffix}"


def _slugify_storage_segment(value: str) -> str:
    return re.sub(r"[^a-z0-9]+", "-", value.lower()).strip("-")


def _safe_doctor_storage_folder(doctor_email: str, doctor_id: str) -> str:
    normalized_id = (doctor_id or "").strip()
    safe_doctor_id = re.sub(
        r"[^a-zA-Z0-9_-]+",
        "-",
        normalized_id,
    ).strip("-")
    if not safe_doctor_id:
        raise ValueError("Doctor ID kosong")

    normalized_email = (doctor_email or "").strip().lower()
    local_part, separator, domain_part = normalized_email.rpartition("@")
    if separator and local_part and domain_part:
        local_slug = _slugify_storage_segment(local_part)
        domain_slug = _slugify_storage_segment(domain_part)
        email_slug = (
            f"{local_slug}-at-{domain_slug}"
            if local_slug and domain_slug
            else _slugify_storage_segment(normalized_email)
        )
    else:
        email_slug = _slugify_storage_segment(normalized_email)

    # Limit the human-readable prefix while preserving the immutable doctor ID.
    email_slug = email_slug[:120].strip("-") or "doctor"
    return f"{email_slug}--{safe_doctor_id}"


def _build_scan_object_path(
    filename: str,
    content_type: Optional[str],
    doctor_id: str,
    doctor_email: str,
) -> str:
    safe_filename = _safe_file_name(filename, content_type)
    doctor_folder = _safe_doctor_storage_folder(doctor_email, doctor_id)
    return f"rontgen/{doctor_folder}/{uuid.uuid4().hex}-{safe_filename}"


def _upload_scan_image_sync(
    image_bytes: bytes,
    filename: str,
    content_type: Optional[str],
    doctor_id: str,
    doctor_email: str,
) -> str:
    client = _get_storage_client()
    object_path = _build_scan_object_path(
        filename=filename,
        content_type=content_type,
        doctor_id=doctor_id,
        doctor_email=doctor_email,
    )

    client.storage.from_(settings.SUPABASE_BUCKET).upload(
        path=object_path,
        file=image_bytes,
        file_options={
            "content-type": content_type or "image/jpeg",
            "upsert": "false",
        },
    )

    return object_path


async def upload_scan_image(
    image_bytes: bytes,
    filename: str,
    content_type: Optional[str],
    doctor_id: str,
    doctor_email: str,
) -> str:
    return await anyio.to_thread.run_sync(
        _upload_scan_image_sync,
        image_bytes,
        filename,
        content_type,
        doctor_id,
        doctor_email,
    )


def _move_scan_image_sync(source_path: str, destination_path: str) -> None:
    client = _get_storage_client()
    client.storage.from_(settings.SUPABASE_BUCKET).move(
        source_path,
        destination_path,
    )


async def move_scan_image(source_path: str, destination_path: str) -> None:
    if not source_path or not destination_path:
        raise ValueError("Source dan destination object path wajib diisi")
    if source_path == destination_path:
        return

    await anyio.to_thread.run_sync(
        _move_scan_image_sync,
        source_path,
        destination_path,
    )


def _extract_signed_url(response: object) -> str:
    if not isinstance(response, dict):
        raise RuntimeError("Response signed URL tidak valid")

    signed_url = (
        response.get("signedURL")
        or response.get("signedUrl")
        or response.get("signed_url")
    )

    if not isinstance(signed_url, str) or not signed_url:
        raise RuntimeError("Signed URL tidak ditemukan")

    return signed_url


def _create_signed_image_url_sync(object_path: str) -> str:
    client = _get_storage_client()
    response = (
        client.storage
        .from_(settings.SUPABASE_BUCKET)
        .create_signed_url(
            object_path,
            settings.SIGNED_URL_EXPIRE_SECONDS,
        )
    )

    return _extract_signed_url(response)


async def create_signed_image_url(object_path: str) -> str:
    if not object_path:
        raise ValueError("Object path gambar kosong")

    return await anyio.to_thread.run_sync(
        _create_signed_image_url_sync,
        object_path,
    )


def _create_signed_image_urls_sync(object_paths: List[str]) -> Dict[str, str]:
    unique_paths = list(dict.fromkeys(path for path in object_paths if path))
    if not unique_paths:
        return {}

    client = _get_storage_client()
    responses = (
        client.storage
        .from_(settings.SUPABASE_BUCKET)
        .create_signed_urls(
            unique_paths,
            settings.SIGNED_URL_EXPIRE_SECONDS,
        )
    )

    signed_urls: Dict[str, str] = {}
    for response in responses:
        if not isinstance(response, dict):
            continue

        object_path = response.get("path")
        if not isinstance(object_path, str) or not object_path:
            continue

        try:
            signed_urls[object_path] = _extract_signed_url(response)
        except RuntimeError:
            continue

    return signed_urls


async def create_signed_image_urls(object_paths: List[str]) -> Dict[str, str]:
    return await anyio.to_thread.run_sync(
        _create_signed_image_urls_sync,
        object_paths,
    )


def _download_scan_image_sync(object_path: str) -> bytes:
    client = _get_storage_client()
    content = client.storage.from_(settings.SUPABASE_BUCKET).download(object_path)
    if not isinstance(content, bytes) or not content:
        raise RuntimeError("Object gambar tidak dapat diunduh")
    return content


async def download_scan_image(object_path: str) -> bytes:
    if not object_path:
        raise ValueError("Object path gambar kosong")

    return await anyio.to_thread.run_sync(
        _download_scan_image_sync,
        object_path,
    )


def _delete_scan_image_sync(object_path: str) -> None:
    client = _get_storage_client()
    client.storage.from_(settings.SUPABASE_BUCKET).remove([object_path])


async def delete_scan_image(object_path: str) -> None:
    if not object_path:
        return

    await anyio.to_thread.run_sync(
        _delete_scan_image_sync,
        object_path,
    )
