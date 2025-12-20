"""
Billing API Endpoints for subscription and credit management.

Story 5.2: User Usage Dashboard
"""
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import (
    CurrentUser,
    CurrentWorkspaceMember,
    get_db,
)
from app.models.user import WorkspaceBilling, SubscriptionTier
from app.schemas.billing import SubscriptionDetailsResponse, CreditUsage
from app.services.billing_service import BillingService
from app.core.billing_config import BillingConfig
from app.core.logger import get_logger

logger = get_logger(__name__)
router = APIRouter(prefix="/billing", tags=["billing"])


@router.get(
    "/workspaces/{workspace_id}/subscription",
    response_model=SubscriptionDetailsResponse,
    summary="Get subscription details",
    description="Returns current subscription tier, credit usage, and billing information for the workspace."
)
async def get_subscription_details(
    workspace_id: UUID,
    member: CurrentWorkspaceMember,
    current_user: CurrentUser,
    db: AsyncSession = Depends(get_db),
) -> SubscriptionDetailsResponse:
    """
    获取工作空间的订阅详情和信用额度使用情况。
    
    Get subscription details and credit usage for a workspace.
    
    Args:
        workspace_id: Target workspace UUID (from path).
        member: Current workspace member (validates access).
        current_user: Authenticated user.
        db: Database session.
        
    Returns:
        SubscriptionDetailsResponse with tier, credits, and period information.
        
    Raises:
        HTTPException: 404 if billing not configured for workspace.
    """
    # Query billing record for workspace
    result = await db.execute(
        select(WorkspaceBilling)
        .where(WorkspaceBilling.workspace_id == workspace_id)
        .where(WorkspaceBilling.is_active == True)
    )
    billing = result.scalar_one_or_none()
    
    if not billing:
        # Create default billing record if not exists
        billing_service = BillingService(db)
        try:
            billing = await billing_service._create_default_billing(workspace_id)
        except Exception as e:
            logger.error(f"Failed to create billing for workspace {workspace_id}: {e}")
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Billing information not found for this workspace"
            )
    
    # Calculate used credits
    used_credits = billing.credits_limit - billing.credits_remaining
    
    # Get tier features
    try:
        tier_enum = SubscriptionTier(billing.tier)
        features = BillingConfig.get_all_features(tier_enum)
    except (ValueError, KeyError):
        features = []
    
    return SubscriptionDetailsResponse(
        tier=billing.tier.upper(),
        credits=CreditUsage(
            total=billing.credits_limit,
            used=used_credits,
            remaining=billing.credits_remaining,
        ),
        period_end=billing.reset_date,
        renewal_date=billing.reset_date,
        features=features,
    )


@router.get(
    "/workspaces/{workspace_id}/credits",
    summary="Get current credit balance",
    description="Returns the current credit balance for the workspace."
)
async def get_credit_balance(
    workspace_id: UUID,
    member: CurrentWorkspaceMember,
    db: AsyncSession = Depends(get_db),
) -> dict:
    """
    获取工作空间的当前信用余额。
    
    Get current credit balance for a workspace.
    
    Args:
        workspace_id: Target workspace UUID (from path).
        member: Current workspace member (validates access).
        db: Database session.
        
    Returns:
        Dict with remaining credits.
    """
    billing_service = BillingService(db)
    credits = await billing_service.get_credits(str(workspace_id))
    
    return {
        "remaining_credits": credits,
        "workspace_id": str(workspace_id),
    }

