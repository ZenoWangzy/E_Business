"""
[IDENTITY]: Request ID Middleware
Generates and tracks unique request IDs for observability.

[INPUT]:
- Incoming HTTP request (optional X-Request-ID header)

[LINK]:
- Logger -> ../../core/logger.py (context binding)
- Main -> ../../main.py (middleware registration)

[OUTPUT]: Request with bound request_id, response with X-Request-ID header.
[POS]: /backend/app/api/middleware/request_id.py

[PROTOCOL]:
1. If X-Request-ID header exists, use it; otherwise generate UUID
2. Bind request_id to request.state for downstream access
3. Add X-Request-ID to response headers
4. Bind to structlog context for tracing
"""
import uuid
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import Response

import structlog


class RequestIDMiddleware(BaseHTTPMiddleware):
    """Middleware to add request ID tracking to all requests."""
    
    async def dispatch(self, request: Request, call_next) -> Response:
        """
        Process request with request ID tracking.
        
        Args:
            request: Incoming Starlette request
            call_next: Next middleware/handler in chain
            
        Returns:
            Response with X-Request-ID header
        """
        # Get or generate request ID
        request_id = request.headers.get("X-Request-ID", str(uuid.uuid4()))
        
        # Store in request state for downstream access
        request.state.request_id = request_id
        
        # Bind to structlog context for all log messages in this request
        structlog.contextvars.clear_contextvars()
        structlog.contextvars.bind_contextvars(request_id=request_id)
        
        # Process request
        response = await call_next(request)
        
        # Add request ID to response headers
        response.headers["X-Request-ID"] = request_id
        
        return response


def get_request_id(request: Request) -> str:
    """
    Get request ID from request state.
    
    Args:
        request: FastAPI request object
        
    Returns:
        Request ID string
    """
    return getattr(request.state, "request_id", "unknown")
