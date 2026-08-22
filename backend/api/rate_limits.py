import asyncio
from collections import defaultdict, deque
from datetime import timedelta
from time import monotonic

from api.errors import AppError


class SlidingWindowRateLimiter:
    def __init__(self, limit: int, window: timedelta) -> None:
        self.limit = limit
        self.window_seconds = window.total_seconds()
        self._attempts: defaultdict[str, deque[float]] = defaultdict(deque)
        self._lock = asyncio.Lock()

    async def consume(self, key: str) -> None:
        now = monotonic()
        cutoff = now - self.window_seconds
        async with self._lock:
            attempts = self._attempts[key]
            while attempts and attempts[0] <= cutoff:
                attempts.popleft()
            if len(attempts) >= self.limit:
                raise AppError(
                    429,
                    "pairing_rate_limited",
                    "Too many pairing attempts. Try again later.",
                )
            attempts.append(now)

    async def reset(self) -> None:
        async with self._lock:
            self._attempts.clear()


pairing_redemption_limiter = SlidingWindowRateLimiter(
    limit=10,
    window=timedelta(minutes=10),
)
