import argparse
import asyncio
from datetime import datetime, timedelta, timezone

from app.database.db import db


async def purge(retention_days: int) -> int:
    cutoff = datetime.now(timezone.utc) - timedelta(days=retention_days)
    await db.connect()
    try:
        return await db.refreshtoken.delete_many(
            where={
                "OR": [
                    {"expiresAt": {"lt": cutoff}},
                    {
                        "revokedAt": {"not": None},
                        "createdAt": {"lt": cutoff},
                    },
                ]
            }
        )
    finally:
        await db.disconnect()


def main() -> None:
    parser = argparse.ArgumentParser(description="Hapus refresh token lama")
    parser.add_argument("--retention-days", type=int, default=30)
    args = parser.parse_args()
    if args.retention_days < 1:
        raise SystemExit("--retention-days minimal 1")

    deleted = asyncio.run(purge(args.retention_days))
    print(f"Deleted refresh tokens: {deleted}")


if __name__ == "__main__":
    main()
