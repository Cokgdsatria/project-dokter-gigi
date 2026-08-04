from unittest import IsolatedAsyncioTestCase, TestCase
from unittest.mock import AsyncMock, patch

from app.core.rate_limit import InMemoryRateLimiter
from app.core.config import settings
from app.main import app, rate_limiter
from fastapi.testclient import TestClient


class RateLimitTests(IsolatedAsyncioTestCase):
    async def test_blocks_requests_over_limit(self):
        limiter = InMemoryRateLimiter(window_seconds=60)

        self.assertEqual(await limiter.check("login:ip", 2), (True, 0))
        self.assertEqual(await limiter.check("login:ip", 2), (True, 0))
        allowed, retry_after = await limiter.check("login:ip", 2)

        self.assertFalse(allowed)
        self.assertGreaterEqual(retry_after, 1)

    async def test_allows_request_after_window(self):
        limiter = InMemoryRateLimiter(window_seconds=60)
        with patch("app.core.rate_limit.time.monotonic", side_effect=[0, 61]):
            self.assertEqual(await limiter.check("diagnose:ip", 1), (True, 0))
            self.assertEqual(await limiter.check("diagnose:ip", 1), (True, 0))


class RateLimitMiddlewareTests(TestCase):
    def test_rate_limit_response_keeps_cors_and_security_headers(self):
        rate_limiter._requests.clear()
        with (
            patch.object(settings, "AUTH_RATE_LIMIT_PER_MINUTE", 1),
            patch("app.main.connect_db", new=AsyncMock()),
            TestClient(app) as client,
        ):
            headers = {"Origin": "https://example.test"}
            client.post("/api/v1/auth/login", headers=headers)
            response = client.post("/api/v1/auth/login", headers=headers)

        rate_limiter._requests.clear()
        self.assertEqual(response.status_code, 429)
        self.assertEqual(response.headers["access-control-allow-origin"], "*")
        self.assertEqual(response.headers["x-content-type-options"], "nosniff")
        self.assertIn("retry-after", response.headers)
