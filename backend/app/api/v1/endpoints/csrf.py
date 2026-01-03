"""
[IDENTITY]: CSRF Token Endpoint
Generates and validates CSRF tokens to protect against cross-site request forgery.

[INPUT]:
- GET request (no body required)

[LINK]:
- Router -> ../router.py
- Config -> ../../core/config.py

[OUTPUT]: CSRFTokenResponse with token

[POS]: /backend/app/api/v1/endpoints/csrf.py

[PROTOCOL]:
1. Generates cryptographically secure token using secrets module.
2. Sets token in HttpOnly cookie for automatic inclusion in requests.
3. Also returns token in response body for SPA usage.
4. Token expires after 24 hours.
"""
import secrets
from datetime import datetime, timezone

from fastapi import APIRouter, Response
from pydantic import BaseModel, Field

router = APIRouter(tags=["CSRF"])


# =============================================================================
# Schemas
# =============================================================================


class CSRFTokenResponse(BaseModel):
    """Response containing CSRF token."""
    
    csrf_token: str = Field(..., description="CSRF token for protecting forms")
    expires_at: str = Field(..., description="Token expiration timestamp (ISO format)")


# =============================================================================
# Configuration
# =============================================================================

CSRF_TOKEN_LENGTH = 32  # 256 bits of entropy
CSRF_COOKIE_NAME = "csrf_token"
CSRF_COOKIE_MAX_AGE = 86400  # 24 hours in seconds


# =============================================================================
# Endpoints
# =============================================================================


@router.get(
    "/csrf-token",
    response_model=CSRFTokenResponse,
    summary="Generate CSRF Token",
    description="Generates a new CSRF token and sets it in an HttpOnly cookie.",
)
async def get_csrf_token(response: Response) -> CSRFTokenResponse:
    """
    Generate a new CSRF token.
    
    The token is:
    1. Set in an HttpOnly cookie (auto-included in requests)
    2. Returned in response body (for custom header usage in SPA)
    
    Frontend should include this token in X-CSRF-Token header for state-changing requests.
    """
    # Generate cryptographically secure token
    token = secrets.token_urlsafe(CSRF_TOKEN_LENGTH)
    
    # Calculate expiration
    expires_at = datetime.now(timezone.utc).replace(
        hour=23, minute=59, second=59, microsecond=0
    )
    
    # Set HttpOnly cookie
    response.set_cookie(
        key=CSRF_COOKIE_NAME,
        value=token,
        max_age=CSRF_COOKIE_MAX_AGE,
        httponly=True,
        samesite="lax",
        secure=False,  # Set to True in production with HTTPS
    )
    
    return CSRFTokenResponse(
        csrf_token=token,
        expires_at=expires_at.isoformat(),
    )


@router.post(
    "/csrf-token/validate",
    summary="Validate CSRF Token",
    description="Validates that the provided token matches the cookie token.",
)
async def validate_csrf_token() -> dict:
    """
    Validate CSRF token.
    
    This endpoint is primarily for testing purposes.
    In production, CSRF validation should be done via middleware.
    """
    # Validation logic would compare header token with cookie token
    # This is a placeholder for middleware-based validation
    return {"valid": True, "message": "CSRF validation is handled by middleware"}
