"""
[IDENTITY]: Business Exception Classes
Unified exception handling for E_Business platform.

[INPUT]:
- Error context: message, code, status_code

[LINK]:
- ErrorHandler -> ../api/middleware/error_handler.py
- Main -> ../main.py (exception registration)

[OUTPUT]: Standardized exception classes for consistent error responses.
[POS]: /backend/app/core/exceptions.py

[PROTOCOL]:
1. All business exceptions inherit from EBusinessException
2. Each exception defines: message, code, status_code
3. Use specific exception classes instead of generic HTTPException
"""
from datetime import datetime, timezone


class EBusinessException(Exception):
    """Base exception for all business logic errors."""
    
    def __init__(
        self, 
        message: str, 
        code: str = "INTERNAL_ERROR", 
        status_code: int = 500
    ):
        self.message = message
        self.code = code
        self.status_code = status_code
        self.timestamp = datetime.now(timezone.utc).isoformat()
        super().__init__(self.message)


# =============================================================================
# 404 Not Found Exceptions
# =============================================================================

class AssetNotFoundException(EBusinessException):
    """Raised when an asset is not found."""
    
    def __init__(self, asset_id: str):
        super().__init__(
            message=f"Asset {asset_id} not found",
            code="ASSET_NOT_FOUND",
            status_code=404
        )


class WorkspaceNotFoundException(EBusinessException):
    """Raised when a workspace is not found."""
    
    def __init__(self, workspace_id: str):
        super().__init__(
            message=f"Workspace {workspace_id} not found",
            code="WORKSPACE_NOT_FOUND",
            status_code=404
        )


class ProductNotFoundException(EBusinessException):
    """Raised when a product is not found."""
    
    def __init__(self, product_id: str):
        super().__init__(
            message=f"Product {product_id} not found",
            code="PRODUCT_NOT_FOUND",
            status_code=404
        )


class JobNotFoundException(EBusinessException):
    """Raised when a job is not found."""
    
    def __init__(self, job_id: str):
        super().__init__(
            message=f"Job {job_id} not found",
            code="JOB_NOT_FOUND",
            status_code=404
        )


# =============================================================================
# 400 Bad Request Exceptions
# =============================================================================

class ValidationException(EBusinessException):
    """Raised for validation errors."""
    
    def __init__(self, message: str, field: str = None):
        code = f"VALIDATION_ERROR_{field.upper()}" if field else "VALIDATION_ERROR"
        super().__init__(
            message=message,
            code=code,
            status_code=400
        )


class InvalidFileTypeException(EBusinessException):
    """Raised when file type is not allowed."""
    
    def __init__(self, mime_type: str, allowed_types: list[str]):
        super().__init__(
            message=f"Unsupported file type: {mime_type}. Allowed: {', '.join(allowed_types)}",
            code="INVALID_FILE_TYPE",
            status_code=415
        )


# =============================================================================
# 402/429 Resource Limit Exceptions
# =============================================================================

class InsufficientCreditsException(EBusinessException):
    """Raised when workspace has insufficient credits."""
    
    def __init__(self, required: int, available: int):
        super().__init__(
            message=f"Insufficient credits. Required: {required}, Available: {available}",
            code="INSUFFICIENT_CREDITS",
            status_code=402
        )


class RateLimitExceededException(EBusinessException):
    """Raised when rate limit is exceeded."""
    
    def __init__(self, limit_type: str, retry_after: int = 60):
        super().__init__(
            message=f"Rate limit exceeded for {limit_type}. Retry after {retry_after} seconds.",
            code="RATE_LIMIT_EXCEEDED",
            status_code=429
        )
        self.retry_after = retry_after


# =============================================================================
# 403 Forbidden Exceptions
# =============================================================================

class AccessDeniedException(EBusinessException):
    """Raised when access is denied."""
    
    def __init__(self, resource: str = "resource"):
        super().__init__(
            message=f"Access denied to {resource}",
            code="ACCESS_DENIED",
            status_code=403
        )


class FeatureNotAvailableException(EBusinessException):
    """Raised when a feature is not available for the subscription tier."""
    
    def __init__(self, feature: str, current_tier: str):
        super().__init__(
            message=f"Feature '{feature}' is not available for {current_tier} tier",
            code="FEATURE_NOT_AVAILABLE",
            status_code=403
        )
