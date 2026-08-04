from unittest import IsolatedAsyncioTestCase
from unittest.mock import patch

from app.services.dental_service import process_inference


class AiRetryTests(IsolatedAsyncioTestCase):
    async def test_transient_failure_is_retried(self):
        successful_result = {
            "predictions": [
                {
                    "class": "Granuloma",
                    "confidence": 0.91,
                }
            ]
        }

        with (
            patch(
                "app.services.dental_service._infer_sync",
                side_effect=[RuntimeError("temporary"), successful_result],
            ) as infer,
            patch(
                "app.services.dental_service.settings.ROBOFLOW_RETRY_ATTEMPTS",
                2,
            ),
            patch(
                "app.services.dental_service.settings.ROBOFLOW_RETRY_BACKOFF_SECONDS",
                0,
            ),
        ):
            status, predictions, label, confidence, error = await process_inference(
                b"image",
                "image.jpg",
                "trace-test",
            )

        self.assertEqual(infer.call_count, 2)
        self.assertEqual(status, "DONE")
        self.assertEqual(predictions, successful_result)
        self.assertEqual(label, "Granuloma")
        self.assertEqual(confidence, 0.91)
        self.assertIsNone(error)
