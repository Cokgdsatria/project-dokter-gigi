from datetime import datetime, timezone
from io import BytesIO
from types import SimpleNamespace
from unittest import IsolatedAsyncioTestCase, TestCase
from unittest.mock import AsyncMock, patch

from fastapi import HTTPException
from PIL import Image

from app.api.v1.diagnose import validate_image_content
from app.api.v1.history import serialize_history_items
from app.services.storage_service import _extract_signed_url, _safe_file_name


def make_image_bytes(image_format: str) -> bytes:
    buffer = BytesIO()
    Image.new("RGB", (4, 4), color="white").save(buffer, format=image_format)
    return buffer.getvalue()


def make_history_item(**overrides):
    patient = SimpleNamespace(
        id="patient-1",
        medicalId="RM001",
        name="Budi",
        age=30,
        gender="LAKI_LAKI",
        doctorId="doctor-1",
    )
    values = {
        "id": "scan-1",
        "resultNumber": "CG-20260804-ABC123",
        "status": "DONE",
        "resultLabel": "Granuloma",
        "resultConfidence": 0.95,
        "imageUrl": None,
        "imageObjectPath": "rontgen/doctor-1/image.jpg",
        "filename": "image.jpg",
        "mimeType": "image/jpeg",
        "fileSize": 128,
        "homebaseType": "KLINIK",
        "homebaseName": "Klinik CekGigi",
        "patient": patient,
        "createdAt": datetime.now(timezone.utc),
        "processedAt": datetime.now(timezone.utc),
        "errorMessage": None,
    }
    values.update(overrides)
    return SimpleNamespace(**values)


class ImageValidationTests(TestCase):
    def test_accepts_valid_jpeg(self):
        image_bytes = make_image_bytes("JPEG")

        self.assertEqual(
            validate_image_content(image_bytes, "image/jpeg"),
            "image/jpeg",
        )

    def test_rejects_invalid_image_content(self):
        with self.assertRaises(HTTPException) as context:
            validate_image_content(b"not-an-image", "image/jpeg")

        self.assertEqual(context.exception.status_code, 400)

    def test_rejects_mime_mismatch(self):
        image_bytes = make_image_bytes("PNG")

        with self.assertRaises(HTTPException) as context:
            validate_image_content(image_bytes, "image/jpeg")

        self.assertEqual(context.exception.status_code, 400)

    @patch("app.api.v1.diagnose.settings.MAX_IMAGE_PIXELS", 4)
    def test_rejects_excessive_pixel_count(self):
        image_bytes = make_image_bytes("JPEG")

        with self.assertRaises(HTTPException) as context:
            validate_image_content(image_bytes, "image/jpeg")

        self.assertEqual(context.exception.status_code, 400)

    def test_storage_filename_uses_verified_mime_extension(self):
        self.assertEqual(
            _safe_file_name("rontgen.exe", "image/png"),
            "rontgen.png",
        )

    def test_extracts_signed_url_from_sdk_response(self):
        self.assertEqual(
            _extract_signed_url({"signedURL": "https://example.test/signed"}),
            "https://example.test/signed",
        )


class HistorySerializationTests(IsolatedAsyncioTestCase):
    @patch("app.api.v1.history.create_signed_image_urls", new_callable=AsyncMock)
    async def test_private_item_uses_signed_url_without_exposing_object_path(
        self,
        create_signed_urls_mock,
    ):
        item = make_history_item()
        create_signed_urls_mock.return_value = {
            item.imageObjectPath: "https://example.test/signed"
        }

        serialized = await serialize_history_items([item])

        self.assertEqual(serialized[0]["imageUrl"], "https://example.test/signed")
        self.assertNotIn("imageObjectPath", serialized[0])
        self.assertNotIn("doctorId", serialized[0]["patient"])
        create_signed_urls_mock.assert_awaited_once_with([item.imageObjectPath])

    @patch("app.api.v1.history.create_signed_image_urls", new_callable=AsyncMock)
    async def test_public_image_url_is_never_returned(
        self,
        create_signed_urls_mock,
    ):
        item = make_history_item(imageUrl="https://example.test/public")
        create_signed_urls_mock.return_value = {}

        serialized = await serialize_history_items([item])

        self.assertIsNone(serialized[0]["imageUrl"])
        create_signed_urls_mock.assert_awaited_once_with([item.imageObjectPath])
