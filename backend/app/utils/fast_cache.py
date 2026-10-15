import time
import threading
from typing import Any, Callable, Optional, Tuple

class SimpleMemoryCache:
    """
    Thread-safe, lightweight in-memory TTL cache.
    Eliminates redundant database queries under high concurrency
    for public, read-mostly resources like PG details, facilities, gallery, and public room listings.
    """
    def __init__(self, default_ttl_seconds: int = 15):
        self._default_ttl = default_ttl_seconds
        self._cache: dict[str, Tuple[float, Any]] = {}
        self._lock = threading.Lock()

    def get(self, key: str) -> Optional[Any]:
        now = time.time()
        with self._lock:
            item = self._cache.get(key)
            if item:
                expiry, val = item
                if now < expiry:
                    return val
                del self._cache[key]
        return None

    def set(self, key: str, value: Any, ttl_seconds: Optional[int] = None) -> None:
        ttl = ttl_seconds if ttl_seconds is not None else self._default_ttl
        expiry = time.time() + ttl
        with self._lock:
            self._cache[key] = (expiry, value)

    def invalidate(self, prefix: str = "") -> None:
        """Invalidate all keys matching prefix, or entire cache if prefix is empty."""
        with self._lock:
            if not prefix:
                self._cache.clear()
            else:
                keys_to_del = [k for k in self._cache if k.startswith(prefix)]
                for k in keys_to_del:
                    del self._cache[k]

# Global shared application cache
app_cache = SimpleMemoryCache(default_ttl_seconds=15)
