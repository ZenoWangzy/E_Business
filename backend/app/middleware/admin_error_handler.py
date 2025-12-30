"""
[IDENTITY]: Admin Error Handler Middleware
ASGI Middleware for intercepting exceptions in `/api/v1/admin`.
Ensures logs become `SystemLog` entries for Dashboard visibility.

[INPUT]:
- HTTP Request (FastAPI/Starlette).

[LINK]:
- DB_SystemLog -> ../models/system_log.py
- LogConfig -> ../core/logger.py

[OUTPUT]: HTTP Response (500 Generic Error) or pass-through.
[POS]: /backend/app/middleware/admin_error_handler.py

[PROTOCOL]:
1. Must re-raise `HTTPException` (4xx) so FastAPI handles them normally.
2. Only intercepts 500s to create `SystemLog` via the Logger adapter.
"""
import traceback
import uuid
import logging
from typing import Callable

from fastapi import Request, HTTPException
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware


logger = logging.getLogger(__name__)


class AdminErrorHandlerMiddleware(BaseHTTPMiddleware):
    """
    Middleware to catch and log unhandled exceptions in admin endpoints.
    
    Logs errors to the system_logs table with trace IDs for debugging.
    Returns generic error responses to clients to avoid leaking internals.
    """

    async def dispatch(self, request: Request, call_next: Callable):
        # Only apply to admin routes
        if not request.url.path.startswith("/api/v1/admin"):
            return await call_next(request)

        error_id = str(uuid.uuid4())[:8]
        
        try:
            response = await call_next(request)
            return response
            
        except HTTPException:
            # Re-raise HTTP exceptions (they have proper status codes)
            raise
            
        except Exception as exc:
            # Log full error details
            logger.error(
                "Unhandled admin endpoint error",
                extra={
                    "error_id": error_id,
                    "path": request.url.path,
                    "method": request.method,
                    "user_id": getattr(request.state, "user_id", None),
                    "error": str(exc),
                    "trace_id": error_id,
                    "component": "admin",
                },
                exc_info=True
            )
            
            # Return generic error response
            return JSONResponse(
                status_code=500,
                content={
                    "detail": "Internal server error",
                    "error_id": error_id,
                }
            )


def setup_admin_error_handler(app):
    """
    Add admin error handler middleware to FastAPI app.
    
    Args:
        app: FastAPI application instance
    """
    app.add_middleware(AdminErrorHandlerMiddleware)
