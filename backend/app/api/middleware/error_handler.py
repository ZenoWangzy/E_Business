"""
[IDENTITY]: Global Exception Handler
Captures all EBusinessException and returns standardized JSON responses.

[INPUT]:
- EBusinessException instances from any endpoint

[LINK]:
- Exceptions -> ../../core/exceptions.py
- Main -> ../../main.py (handler registration)

[OUTPUT]: Standardized JSON error response format.
[POS]: /backend/app/api/middleware/error_handler.py

[PROTOCOL]:
1. All errors return consistent JSON format with: code, message, timestamp
2. Unknown exceptions return 500 with INTERNAL_ERROR code
3. Rate limit exceptions include Retry-After header
"""
from fastapi import Request
from fastapi.responses import JSONResponse

from app.core.exceptions import EBusinessException, RateLimitExceededException


async def ebusiness_exception_handler(
    request: Request, 
    exc: EBusinessException
) -> JSONResponse:
    """
    Handle EBusinessException and return standardized JSON response.
    
    Args:
        request: FastAPI request object
        exc: The caught EBusinessException
        
    Returns:
        JSONResponse with standardized error format
    """
    headers = {}
    
    # Add Retry-After header for rate limit exceptions
    if isinstance(exc, RateLimitExceededException):
        headers["Retry-After"] = str(exc.retry_after)
    
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "error": {
                "code": exc.code,
                "message": exc.message,
                "timestamp": exc.timestamp
            }
        },
        headers=headers
    )


async def generic_exception_handler(
    request: Request, 
    exc: Exception
) -> JSONResponse:
    """
    Handle unexpected exceptions as 500 Internal Server Error.
    
    Args:
        request: FastAPI request object
        exc: The caught exception
        
    Returns:
        JSONResponse with generic error format
    """
    from datetime import datetime, timezone
    
    return JSONResponse(
        status_code=500,
        content={
            "error": {
                "code": "INTERNAL_ERROR",
                "message": "An unexpected error occurred",
                "timestamp": datetime.now(timezone.utc).isoformat()
            }
        }
    )
