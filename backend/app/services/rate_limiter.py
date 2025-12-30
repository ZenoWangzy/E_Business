"""
[IDENTITY]: Rate Limiting Service
Redis-based Sliding Window Rate Limiter.

[INPUT]:
- Key (Identifier), Limit (Count), Window (Seconds).

[LINK]:
- Config -> ../core/config.py
- Redis -> app.core.redis

[OUTPUT]: Boolean (IsLimited), Remaining Count.
[POS]: /backend/app/services/rate_limiter.py

[PROTOCOL]:
1. Uses Redis Sorted Sets (ZSET) for precise sliding window tracking.
2. Auto-expires keys to prevent memory leaks.
"""
from datetime import datetime, timezone
from typing import Optional
from uuid import UUID

import redis.asyncio as redis

from app.core.config import get_settings


class RateLimiter:
    """Redis-based rate limiter using sliding window algorithm."""
    
    def __init__(self):
        self._redis: Optional[redis.Redis] = None
    
    async def get_redis(self) -> redis.Redis:
        """Get or create Redis connection."""
        if self._redis is None:
            settings = get_settings()
            self._redis = redis.from_url(settings.redis_url, decode_responses=True)
        return self._redis
    
    async def is_rate_limited(
        self,
        key: str,
        max_requests: int,
        window_seconds: int,
    ) -> tuple[bool, int]:
        """Check if a key is rate limited.
        
        Args:
            key: The rate limit key (e.g., "invite:workspace_{id}:user_{id}")
            max_requests: Maximum requests allowed in the window
            window_seconds: Window size in seconds
            
        Returns:
            Tuple of (is_limited, remaining_requests)
        """
        r = await self.get_redis()
        now = datetime.now(timezone.utc).timestamp()
        window_start = now - window_seconds
        
        pipe = r.pipeline()
        
        # Remove old entries outside the window
        pipe.zremrangebyscore(key, 0, window_start)
        
        # Count current entries in window
        pipe.zcard(key)
        
        # Add current request with timestamp as score
        pipe.zadd(key, {str(now): now})
        
        # Set expiry on the key
        pipe.expire(key, window_seconds)
        
        results = await pipe.execute()
        current_count = results[1]  # zcard result
        
        remaining = max(0, max_requests - current_count - 1)
        is_limited = current_count >= max_requests
        
        if is_limited:
            # Remove the entry we just added since we're rejecting
            await r.zrem(key, str(now))
        
        return is_limited, remaining
    
    async def get_remaining(
        self,
        key: str,
        max_requests: int,
        window_seconds: int,
    ) -> int:
        """Get remaining requests for a key."""
        r = await self.get_redis()
        now = datetime.now(timezone.utc).timestamp()
        window_start = now - window_seconds
        
        # Clean and count
        await r.zremrangebyscore(key, 0, window_start)
        current_count = await r.zcard(key)
        
        return max(0, max_requests - current_count)
    
    async def reset(self, key: str) -> None:
        """Reset rate limit for a key."""
        r = await self.get_redis()
        await r.delete(key)
    
    async def close(self) -> None:
        """Close Redis connection."""
        if self._redis:
            await self._redis.close()
            self._redis = None


# Rate limit configurations
RATE_LIMITS = {
    # Max 10 invites per hour per user per workspace
    "invite_create": {"max_requests": 10, "window_seconds": 3600},
    # Max 50 invites per day per workspace
    "invite_workspace_daily": {"max_requests": 50, "window_seconds": 86400},
}


def get_invite_rate_limit_key(workspace_id: UUID, user_id: UUID) -> str:
    """Generate rate limit key for invite creation."""
    return f"ratelimit:invite:ws:{workspace_id}:user:{user_id}"


def get_workspace_invite_rate_limit_key(workspace_id: UUID) -> str:
    """Generate rate limit key for workspace-level invite limits."""
    return f"ratelimit:invite:ws:{workspace_id}:daily"


# Singleton instance
rate_limiter = RateLimiter()
