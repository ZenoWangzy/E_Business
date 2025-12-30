"""
Quota checking dependencies for API endpoints.

Provides middleware for enforcing credit-based usage limits with Redis caching.
"""
from __future__ import annotations

from typing import Annotated, TYPE_CHECKING
from uuid import UUID

from fastapi import Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.base import get_db
from app.services.billing_service import BillingService

if TYPE_CHECKING:
    from app.models.user import WorkspaceMember


class QuotaChecker:
    """Dependency class for checking quotas with Redis caching.
    
    Usage:
        @router.post("/generate", dependencies=[Depends(check_copy_quota)])
        async def generate_copy(...): ...
    """

    def __init__(self, cost: int = 0):
        """Initialize quota checker with specified credit cost.
        
        Args:
            cost: Number of credits required for the action.
        """
        self.cost = cost

    async def __call__(
        self,
        workspace_id: UUID,
        db: Annotated[AsyncSession, Depends(get_db)],
    ) -> None:
        """Check if workspace has sufficient credits for the action.
        
        Args:
            workspace_id: Workspace UUID from path parameter.
            db: Database session.
            
        Raises:
            HTTPException: 402 if insufficient credits.
        """
        if self.cost == 0:
            return

        billing_service = BillingService(db)

        # Check credits with concurrency safety
        remaining = await billing_service.get_credits(str(workspace_id))

        if remaining < self.cost:
            raise HTTPException(
                status_code=402,
                detail={
                    "error": "INSUFFICIENT_CREDITS",
                    "message": "Not enough credits to perform this action",
                    "required": self.cost,
                    "remaining": remaining,
                    "upgrade_url": "/billing/upgrade",
                },
                headers={"X-Quota-Remaining": str(remaining)},
            )


def require_credits(cost: int) -> QuotaChecker:
    """Create a quota checker dependency for specified cost.
    
    Args:
        cost: Number of credits required.
        
    Returns:
        QuotaChecker instance configured with the cost.
    """
    return QuotaChecker(cost)


# Pre-configured quota checkers for common actions
check_copy_quota = require_credits(1)      # Copy generation: 1 credit
check_image_quota = require_credits(5)     # Image generation: 5 credits
check_video_quota = require_credits(20)    # Video generation: 20 credits
