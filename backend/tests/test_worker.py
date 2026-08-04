from types import SimpleNamespace
from unittest import IsolatedAsyncioTestCase
from unittest.mock import AsyncMock, patch

from app.worker import claim_next_scan


class WorkerClaimTests(IsolatedAsyncioTestCase):
    async def test_claim_returns_scan_after_atomic_update(self):
        candidate = SimpleNamespace(id="scan-1")
        claimed_scan = SimpleNamespace(id="scan-1", status="PROCESSING")
        actions = SimpleNamespace(
            find_first=AsyncMock(return_value=candidate),
            update_many=AsyncMock(return_value=1),
            find_unique=AsyncMock(return_value=claimed_scan),
        )

        with patch("app.worker.db", SimpleNamespace(scanhistory=actions)):
            result = await claim_next_scan()

        self.assertEqual(result, claimed_scan)
        self.assertEqual(actions.update_many.await_args.kwargs["where"]["id"], "scan-1")
        self.assertIn("OR", actions.update_many.await_args.kwargs["where"])
        self.assertEqual(
            actions.update_many.await_args.kwargs["data"]["status"],
            "PROCESSING",
        )

    async def test_lost_claim_is_not_processed(self):
        actions = SimpleNamespace(
            find_first=AsyncMock(return_value=SimpleNamespace(id="scan-2")),
            update_many=AsyncMock(return_value=0),
            find_unique=AsyncMock(),
        )

        with patch("app.worker.db", SimpleNamespace(scanhistory=actions)):
            result = await claim_next_scan()

        self.assertIsNone(result)
        actions.find_unique.assert_not_awaited()
