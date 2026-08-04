import asyncio
import time
from collections import deque
from typing import Deque, Dict, Tuple


class InMemoryRateLimiter:
    def __init__(self, window_seconds: int = 60, max_keys: int = 10000):
        self.window_seconds = window_seconds
        self.max_keys = max_keys
        self._requests: Dict[str, Deque[float]] = {}
        self._lock = asyncio.Lock()

    async def check(self, key: str, limit: int) -> Tuple[bool, int]:
        now = time.monotonic()
        cutoff = now - self.window_seconds

        async with self._lock:
            if key not in self._requests and len(self._requests) >= self.max_keys:
                self._remove_inactive_keys(cutoff)
                if len(self._requests) >= self.max_keys:
                    self._requests.pop(next(iter(self._requests)), None)

            timestamps = self._requests.setdefault(key, deque())
            while timestamps and timestamps[0] <= cutoff:
                timestamps.popleft()

            if len(timestamps) >= limit:
                retry_after = max(1, int(self.window_seconds - (now - timestamps[0])))
                return False, retry_after

            timestamps.append(now)
            return True, 0

    def _remove_inactive_keys(self, cutoff: float) -> None:
        inactive = [
            key
            for key, timestamps in self._requests.items()
            if not timestamps or timestamps[-1] <= cutoff
        ]
        for key in inactive:
            self._requests.pop(key, None)
