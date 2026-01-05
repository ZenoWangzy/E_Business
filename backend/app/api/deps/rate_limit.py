"""
[IDENTITY]: Rate Limit Dependencies
FastAPI dependencies for rate limiting API endpoints.

[INPUT]:
- Request context, user/workspace identifiers

[LINK]:
- RateLimiter -> ../../services/rate_limiter.py
- Exceptions -> ../../core/exceptions.py

[OUTPUT]: None (raises RateLimitExceededException if limited).
[POS]: /backend/app/api/deps/rate_limit.py

[PROTOCOL]:
1. Use as FastAPI Depends() in endpoint definitions
2. Always check rate limit before processing request
"""
from uuid import UUID

from fastapi import Request, Depends

from app.services.rate_limiter import rate_limiter, RATE_LIMITS
from app.core.exceptions import RateLimitExceededException
from app.api.deps import CurrentUser


async def rate_limit_upload(
    current_user: CurrentUser,
) -> None:
    """
    Rate limit dependency for file uploads.
    
    Args:
        current_user: Current authenticated user
        
    Raises:
        RateLimitExceededException: If rate limit exceeded
    """
    config = RATE_LIMITS["upload"]
    key = f"ratelimit:upload:user:{current_user.id}"
    
    is_limited, remaining = await rate_limiter.is_rate_limited(
        key=key,
        max_requests=config["max_requests"],
        window_seconds=config["window_seconds"]
    )
    
    if is_limited:
        raise RateLimitExceededException(
            limit_type="upload",
            retry_after=config["window_seconds"]
        )


async def rate_limit_generate(
    current_user: CurrentUser,
) -> None:
    """
    Rate limit dependency for AI generation requests.
    
    Args:
        current_user: Current authenticated user
        
    Raises:
        RateLimitExceededException: If rate limit exceeded
    """
    config = RATE_LIMITS["generate"]
    key = f"ratelimit:generate:user:{current_user.id}"
    
    is_limited, remaining = await rate_limiter.is_rate_limited(
        key=key,
        max_requests=config["max_requests"],
        window_seconds=config["window_seconds"]
    )
    
    if is_limited:
        raise RateLimitExceededException(
            limit_type="generate",
            retry_after=config["window_seconds"]
        )
