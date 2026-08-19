from io import BytesIO
from unittest import IsolatedAsyncioTestCase, TestCase
from unittest.mock import patch

from PIL import Image

from app.services.dental_service import get_prediction_image_size, process_inference


def make_jpeg(width: int = 120, height: int = 180) -> bytes:
    buffer = BytesIO()
    Image.new("RGB", (width, height), color="white").save(buffer, format="JPEG")
    return buffer.getvalue()


class PredictionImageSizeTests(TestCase):
    def test_requires_real_image_metadata(self):
        prediction_without_metadata = {
            "predictions": [
                {
                    "x": 60,
                    "y": 90,
                    "width": 20,
                    "height": 30,
                    "points": [{"x": 50, "y": 75}, {"x": 70, "y": 105}],
                }
            ]
        }

        self.assertEqual(
            get_prediction_image_size(prediction_without_metadata),
            {"width": None, "height": None},
        )


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
                make_jpeg(),
                "image.jpg",
                "trace-test",
            )

        self.assertEqual(infer.call_count, 2)
        self.assertEqual(status, "DONE")
        self.assertEqual(predictions["predictions"], successful_result["predictions"])
        self.assertEqual(predictions["image"], {"width": 120, "height": 180})
        self.assertNotIn("image", successful_result)
        self.assertEqual(label, "Granuloma")
        self.assertEqual(confidence, 0.91)
        self.assertIsNone(error)
