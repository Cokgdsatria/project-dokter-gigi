import argparse
import asyncio
from urllib.parse import unquote, urlparse

from prisma import Prisma

from app.core.config import settings
from app.services.storage_service import create_signed_image_url


def extract_object_path(image_url: str) -> str:
    parsed = urlparse(image_url)
    path = unquote(parsed.path)
    bucket = settings.SUPABASE_BUCKET
    prefixes = (
        f"/storage/v1/object/public/{bucket}/",
        f"/storage/v1/object/sign/{bucket}/",
        f"/storage/v1/object/authenticated/{bucket}/",
    )

    for prefix in prefixes:
        if path.startswith(prefix):
            object_path = path[len(prefix):].strip("/")
            if object_path:
                return object_path

    raise ValueError("URL tidak menunjuk ke bucket Supabase yang dikonfigurasi")


async def backfill(apply_changes: bool) -> int:
    db = Prisma()
    await db.connect()
    updated = 0
    failed = 0

    try:
        items = await db.scanhistory.find_many(
            where={
                "imageObjectPath": None,
                "imageUrl": {"not": None},
            },
            order={"createdAt": "asc"},
        )

        print(f"Mode: {'APPLY' if apply_changes else 'DRY-RUN'}")
        print(f"Riwayat legacy ditemukan: {len(items)}")

        for item in items:
            try:
                object_path = extract_object_path(item.imageUrl or "")
                await create_signed_image_url(object_path)

                if apply_changes:
                    await db.scanhistory.update(
                        where={"id": item.id},
                        data={
                            "imageObjectPath": object_path,
                            "imageUrl": None,
                        },
                    )

                updated += 1
                print(f"[OK] {item.id}: {object_path}")
            except Exception as exc:
                failed += 1
                print(f"[FAILED] {item.id}: {type(exc).__name__}: {exc}")
    finally:
        await db.disconnect()

    print(f"Siap/diperbarui: {updated}; gagal: {failed}")
    return 1 if failed else 0


def parse_args():
    parser = argparse.ArgumentParser(
        description="Backfill imageObjectPath dari URL Supabase legacy.",
    )
    parser.add_argument(
        "--apply",
        action="store_true",
        help="Terapkan perubahan. Tanpa flag ini hanya melakukan dry-run.",
    )
    return parser.parse_args()


if __name__ == "__main__":
    args = parse_args()
    raise SystemExit(asyncio.run(backfill(args.apply)))
