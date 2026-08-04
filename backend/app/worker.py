import asyncio
import logging
import uuid
from datetime import datetime, timedelta, timezone

from prisma import Json

from app.core.config import settings, validate_runtime_settings
from app.database.db import connect_db, db, disconnect_db
from app.services.dental_service import process_inference
from app.services.storage_service import download_scan_image

logger = logging.getLogger(__name__)


def _claimable_where(stale_before: datetime):
    return {
        "OR": [
            {"status": "UPLOADED"},
            {
                "status": "PROCESSING",
                "updatedAt": {"lt": stale_before},
            },
        ]
    }


async def claim_next_scan():
    stale_before = datetime.now(timezone.utc) - timedelta(
        minutes=settings.DIAGNOSIS_STALE_MINUTES
    )
    candidate = await db.scanhistory.find_first(
        where=_claimable_where(stale_before),
        order={"createdAt": "asc"},
    )
    if candidate is None:
        return None

    claimed = await db.scanhistory.update_many(
        where={
            "id": candidate.id,
            **_claimable_where(stale_before),
        },
        data={
            "status": "PROCESSING",
            "errorMessage": None,
            "processedAt": None,
        },
    )
    if claimed != 1:
        return None

    return await db.scanhistory.find_unique(where={"id": candidate.id})


async def process_scan(scan) -> None:
    trace_id = str(uuid.uuid4())
    try:
        image_bytes = await download_scan_image(scan.imageObjectPath)
        status, predictions, label, confidence, error_message = await process_inference(
            image_bytes,
            scan.filename,
            trace_id,
        )
        await db.scanhistory.update(
            where={"id": scan.id},
            data={
                "status": status,
                "predictions": Json(predictions),
                "resultLabel": label,
                "resultConfidence": confidence,
                "errorMessage": error_message,
                "processedAt": datetime.now(timezone.utc),
            },
        )
        logger.info(
            "worker.scan_finished scan_id=%s status=%s trace_id=%s",
            scan.id,
            status,
            trace_id,
        )
    except Exception:
        logger.exception(
            "worker.scan_failed scan_id=%s trace_id=%s",
            scan.id,
            trace_id,
        )
        await db.scanhistory.update(
            where={"id": scan.id},
            data={
                "status": "FAILED",
                "errorMessage": "Diagnosis gagal diproses oleh worker",
                "processedAt": datetime.now(timezone.utc),
            },
        )


async def run_worker() -> None:
    validate_runtime_settings()
    await connect_db()
    logger.info("diagnosis worker started")
    try:
        while True:
            scan = await claim_next_scan()
            if scan is None:
                await asyncio.sleep(settings.DIAGNOSIS_WORKER_POLL_SECONDS)
                continue
            await process_scan(scan)
    finally:
        await disconnect_db()


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    asyncio.run(run_worker())
