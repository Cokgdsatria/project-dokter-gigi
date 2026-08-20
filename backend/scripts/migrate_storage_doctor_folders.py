import argparse
import asyncio
import os
from urllib.parse import urlparse

from prisma import Prisma

from app.services.storage_service import (
    _safe_doctor_storage_folder,
    move_scan_image,
)


def validate_supabase_target(expected_project_ref: str | None = None) -> str:
    supabase_url = os.getenv("SUPABASE_URL", "").strip()
    hostname = (urlparse(supabase_url).hostname or "").lower()
    if not hostname.endswith(".supabase.co"):
        raise RuntimeError("SUPABASE_URL tidak valid atau belum diisi")

    project_ref = hostname.removesuffix(".supabase.co")
    if not project_ref:
        raise RuntimeError("Project ref tidak ditemukan dari SUPABASE_URL")

    if expected_project_ref and project_ref != expected_project_ref.strip().lower():
        raise RuntimeError(
            "Project ref aktual tidak sama dengan --expected-project-ref"
        )

    for variable_name in ("DATABASE_URL", "DIRECT_URL"):
        database_url = os.getenv(variable_name, "").strip().lower()
        if not database_url:
            raise RuntimeError(f"{variable_name} belum diisi")
        if project_ref not in database_url:
            raise RuntimeError(
                f"{variable_name} tidak menunjuk project yang sama dengan SUPABASE_URL"
            )

    return project_ref


def build_destination_path(
    source_path: str,
    doctor_email: str,
    doctor_id: str,
) -> str | None:
    prefix = "rontgen/"
    if not source_path.startswith(prefix):
        raise ValueError("Object path berada di luar folder rontgen")

    relative_path = source_path[len(prefix):]
    source_folder, separator, filename = relative_path.partition("/")
    if not separator or not source_folder or not filename or "/" in filename:
        raise ValueError("Format object path tidak didukung")

    destination_folder = _safe_doctor_storage_folder(doctor_email, doctor_id)
    if source_folder == destination_folder:
        return None

    # Only move known legacy folders or a previous email slug for the same ID.
    if source_folder != doctor_id and not source_folder.endswith(f"--{doctor_id}"):
        raise ValueError("Folder sumber tidak cocok dengan doctorId")

    return f"{prefix}{destination_folder}/{filename}"


async def migrate(
    apply_changes: bool,
    expected_project_ref: str | None = None,
) -> int:
    project_ref = validate_supabase_target(expected_project_ref)
    db = Prisma()
    await db.connect()
    migrated = 0
    skipped = 0
    failed = 0

    try:
        items = await db.scanhistory.find_many(
            include={"doctor": True},
            order={"createdAt": "asc"},
        )

        print(f"Target Supabase: {project_ref}")
        print(f"Mode: {'APPLY' if apply_changes else 'DRY-RUN'}")
        print(f"ScanHistory diperiksa: {len(items)}")

        for item in items:
            source_path = item.imageObjectPath
            doctor = item.doctor
            if not source_path or doctor is None:
                skipped += 1
                print(f"[SKIP] {item.id}: object path atau doctor tidak tersedia")
                continue

            try:
                destination_path = build_destination_path(
                    source_path=source_path,
                    doctor_email=doctor.email,
                    doctor_id=item.doctorId,
                )
                if destination_path is None:
                    skipped += 1
                    print(f"[SKIP] {item.id}: folder sudah sesuai")
                    continue

                if apply_changes:
                    await move_scan_image(source_path, destination_path)
                    try:
                        await db.scanhistory.update(
                            where={"id": item.id},
                            data={"imageObjectPath": destination_path},
                        )
                    except Exception:
                        await move_scan_image(destination_path, source_path)
                        raise

                migrated += 1
                print(f"[OK] {item.id}: {source_path} -> {destination_path}")
            except Exception as exc:
                failed += 1
                print(f"[FAILED] {item.id}: {type(exc).__name__}: {exc}")
    finally:
        await db.disconnect()

    print(f"Siap/dipindahkan: {migrated}; dilewati: {skipped}; gagal: {failed}")
    return 1 if failed else 0


def parse_args():
    parser = argparse.ArgumentParser(
        description=(
            "Pindahkan gambar ke folder email-slug--doctorId dan perbarui "
            "ScanHistory.imageObjectPath."
        ),
    )
    parser.add_argument(
        "--apply",
        action="store_true",
        help="Terapkan perubahan. Tanpa flag ini hanya melakukan dry-run.",
    )
    parser.add_argument(
        "--expected-project-ref",
        help=(
            "Project ref Supabase yang wajib cocok dengan semua target. "
            "Wajib digunakan bersama --apply."
        ),
    )
    args = parser.parse_args()
    if args.apply and not args.expected_project_ref:
        parser.error("--expected-project-ref wajib digunakan bersama --apply")
    return args


if __name__ == "__main__":
    args = parse_args()
    raise SystemExit(
        asyncio.run(
            migrate(
                apply_changes=args.apply,
                expected_project_ref=args.expected_project_ref,
            )
        )
    )
