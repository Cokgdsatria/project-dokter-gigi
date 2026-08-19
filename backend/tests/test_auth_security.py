import os
from datetime import datetime, timedelta, timezone
from types import SimpleNamespace
from unittest import IsolatedAsyncioTestCase, TestCase
from unittest.mock import AsyncMock, patch

from jose import JWTError, jwt

from app.core.config import settings, validate_runtime_settings
from app.core.security import (
    create_access_token,
    decode_access_token,
    generate_refresh_token,
    hash_refresh_token,
)
from app.services.auth_service import RefreshTokenError, rotate_refresh_token


class AccessTokenTests(TestCase):
    def test_access_token_has_required_claims(self):
        token = create_access_token({"sub": "doctor-1"}, timedelta(minutes=5))

        payload = decode_access_token(token)

        self.assertEqual(payload["sub"], "doctor-1")
        self.assertEqual(payload["type"], "access")
        self.assertIn("jti", payload)
        self.assertIn("iat", payload)
        self.assertIn("exp", payload)

    def test_refresh_jwt_cannot_be_used_as_access_token(self):
        token = jwt.encode(
            {
                "sub": "doctor-1",
                "type": "refresh",
                "exp": datetime.now(timezone.utc) + timedelta(minutes=5),
            },
            settings.SECRET_KEY,
            algorithm=settings.ALGORITHM,
        )

        with self.assertRaises(JWTError):
            decode_access_token(token)

    def test_refresh_token_is_opaque_and_only_hash_is_stored(self):
        token = generate_refresh_token()
        token_hash = hash_refresh_token(token)

        self.assertGreaterEqual(len(token), 64)
        self.assertEqual(len(token_hash), 64)
        self.assertNotEqual(token, token_hash)
        self.assertEqual(token_hash, hash_refresh_token(token))


class ProductionConfigTests(TestCase):
    def test_production_rejects_wildcard_network_settings(self):
        with (
            patch.object(settings, "ENVIRONMENT", "production"),
            patch.object(settings, "SECRET_KEY", "x" * 48),
            patch.dict(
                os.environ,
                {"CORS_ORIGINS": "*", "ALLOWED_HOSTS": "*"},
                clear=False,
            ),
        ):
            with self.assertRaises(RuntimeError):
                validate_runtime_settings()

    def test_rejects_invalid_roboflow_model_id(self):
        with patch.object(settings, "ROBOFLOW_MODEL_ID", "model-without-version"):
            with self.assertRaisesRegex(RuntimeError, "ROBOFLOW_MODEL_ID"):
                validate_runtime_settings()


class FakeTransactionContext:
    def __init__(self, transaction):
        self.transaction = transaction
        self.exit_exception_type = object()

    async def __aenter__(self):
        return self.transaction

    async def __aexit__(self, exc_type, exc, traceback):
        self.exit_exception_type = exc_type
        return False


class FakeDatabase:
    def __init__(self, context):
        self.context = context

    def tx(self, timeout):
        return self.context


class RefreshRotationTests(IsolatedAsyncioTestCase):
    async def test_reuse_revocation_commits_before_error_is_raised(self):
        stored = SimpleNamespace(
            id="token-1",
            familyId="family-1",
            userId="doctor-1",
            user=SimpleNamespace(id="doctor-1"),
            revokedAt=datetime.now(timezone.utc),
            expiresAt=datetime.now(timezone.utc) + timedelta(days=1),
        )
        token_client = SimpleNamespace(
            find_unique=AsyncMock(return_value=stored),
            update_many=AsyncMock(return_value=1),
            update=AsyncMock(),
            create=AsyncMock(),
        )
        transaction = SimpleNamespace(refreshtoken=token_client)
        context = FakeTransactionContext(transaction)

        with patch("app.services.auth_service.db", FakeDatabase(context)):
            with self.assertRaises(RefreshTokenError):
                await rotate_refresh_token("used-refresh-token")

        self.assertIsNone(context.exit_exception_type)
        token_client.update_many.assert_awaited_once_with(
            where={"familyId": "family-1", "revokedAt": None},
            data={"revokedAt": token_client.update_many.await_args.kwargs["data"]["revokedAt"]},
        )
