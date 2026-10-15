import time
import threading
from typing import Dict, List, Tuple
from fastapi import Request, HTTPException, status

class InMemoryRateLimiter:
    """
    Lightweight, thread-safe in-memory rate limiter to protect sensitive
    endpoints (like /api/auth/login, /api/auth/register) from brute-force attacks.
    """
    def __init__(self, max_requests: int = 10, window_seconds: int = 60):
        self.max_requests = max_requests
        self.window_seconds = window_seconds
        self._records: Dict[str, List[float]] = {}
        self._lock = threading.Lock()
        self._last_cleanup = time.time()

    def _cleanup_old_records(self, now: float):
        """Periodically prune stale IPs to prevent memory leaks."""
        if now - self._last_cleanup < 300:  # Cleanup every 5 minutes
            return
        self._last_cleanup = now
        cutoff = now - self.window_seconds
        keys_to_delete = []
        for key, timestamps in self._records.items():
            valid = [ts for ts in timestamps if ts > cutoff]
            if not valid:
                keys_to_delete.append(key)
            else:
                self._records[key] = valid
        for k in keys_to_delete:
            del self._records[k]

    def check(self, key: str, max_requests: int = None, window_seconds: int = None) -> Tuple[bool, int]:
        max_req = max_requests or self.max_requests
        window = window_seconds or self.window_seconds
        now = time.time()
        cutoff = now - window

        with self._lock:
            self._cleanup_old_records(now)
            timestamps = self._records.get(key, [])
            timestamps = [ts for ts in timestamps if ts > cutoff]

            if len(timestamps) >= max_req:
                oldest_in_window = timestamps[0]
                retry_after = max(1, int(window - (now - oldest_in_window)))
                self._records[key] = timestamps
                return False, retry_after

            timestamps.append(now)
            self._records[key] = timestamps
            return True, 0

    def reset(self, key: str):
        with self._lock:
            if key in self._records:
                del self._records[key]


auth_rate_limiter = InMemoryRateLimiter(max_requests=10, window_seconds=60)

def get_client_ip(request: Request) -> str:
    """Extract real client IP considering reverse proxy headers safely."""
    forwarded = request.headers.get("X-Forwarded-For")
    if forwarded:
        # First IP in the list is the client IP
        return forwarded.split(",")[0].strip()
    return request.client.host if request.client else "unknown"

def enforce_rate_limit(
    request: Request,
    key_prefix: str = "auth",
    max_requests: int = 10,
    window_seconds: int = 60
):
    """
    Enforces a rate limit for the given request and raises HTTP 429 when exceeded.
    """
    ip = get_client_ip(request)
    key = f"{key_prefix}:{ip}"
    allowed, retry_after = auth_rate_limiter.check(key, max_requests, window_seconds)
    if not allowed:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail=f"Too many requests from your IP address. Please wait {retry_after} seconds before trying again.",
            headers={"Retry-After": str(retry_after)}
        )
