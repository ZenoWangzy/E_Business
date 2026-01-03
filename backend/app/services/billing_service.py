"""
[IDENTITY]: Billing Service
Logic for Credits, Quotas, and Subscription checks.

[INPUT]:
- WorkspaceBilling Model.

[LINK]:
- DB_Billing -> ../models/user.py
- Config -> ../core/billing_config.py

[OUTPUT]: Boolean (Eligibility) or New Credit Balance.
[POS]: /backend/app/services/billing_service.py

[PROTOCOL]:
1. Prioritizes Redis cache for reads, falls back to DB.
2. Uses DB Row Locking (`with_for_update`) for credit deduction to prevent race conditions.
"""
import asyncio
import logging
from datetime import datetime, timezone
from typing import Optional
from uuid import UUID

import redis.asyncio as aioredis
from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.billing_config import BillingConfig, ActionType
from app.core.config import get_settings
from app.models.user import WorkspaceBilling, SubscriptionTier

settings = get_settings()
logger = logging.getLogger(__name__)


class BillingService:
    """Service for handling billing operations with Redis caching.
    
    Features:
    - Redis caching with 1-hour TTL for performance
    - Database transaction with row-level locking for atomic credit deduction
    - Database fallback for cache misses
    - Monthly quota reset support
    """

    REDIS_KEY_PREFIX = "billing:workspace"
    DEFAULT_TTL = 3600  # 1 hour

    def __init__(self, db: AsyncSession):
        """Initialize billing service.
        
        Args:
            db: Database session for fallback operations.
        """
        self.db = db
        self._redis_client: Optional[aioredis.Redis] = None

    async def _get_redis(self) -> aioredis.Redis:
        """Get or create Redis client (lazy initialization)."""
        if self._redis_client is None:
            self._redis_client = await aioredis.from_url(
                settings.redis_url,
                encoding="utf-8",
                decode_responses=True
            )
        return self._redis_client

    def _get_redis_key(self, workspace_id: str) -> str:
        """Generate Redis key for workspace credits.
        
        Args:
            workspace_id: Workspace UUID as string.
            
        Returns:
            Redis key string.
        """
        return f"{self.REDIS_KEY_PREFIX}:{workspace_id}:credits"

    async def get_credits(self, workspace_id: str) -> int:
        """Get remaining credits with Redis cache fallback.
        
        Args:
            workspace_id: Workspace UUID as string.
            
        Returns:
            Number of remaining credits.
        """
        redis = await self._get_redis()
        redis_key = self._get_redis_key(workspace_id)

        # Try Redis first
        try:
            cached = await redis.get(redis_key)
            if cached is not None:
                return int(cached)
        except Exception as e:
            logger.warning(f"Redis get failed for {workspace_id}: {e}")

        # Fallback to database
        try:
            workspace_uuid = UUID(workspace_id)
        except ValueError:
            logger.error(f"Invalid workspace_id format: {workspace_id}")
            return 0

        result = await self.db.execute(
            select(WorkspaceBilling.credits_remaining)
            .where(WorkspaceBilling.workspace_id == workspace_uuid)
            .where(WorkspaceBilling.is_active == True)
        )
        billing = result.scalar_one_or_none()

        if billing is None:
            # Create default billing for workspace
            billing = await self._create_default_billing(workspace_uuid)
            credits = billing.credits_remaining
        else:
            credits = billing

        # Cache in Redis with TTL
        try:
            await redis.setex(redis_key, self.DEFAULT_TTL, credits)
        except Exception as e:
            logger.warning(f"Redis setex failed for {workspace_id}: {e}")

        return credits

    async def deduct_credits(self, workspace_id: str, amount: int) -> bool:
        """Deduct credits with database transaction.
        
        Args:
            workspace_id: Workspace UUID as string.
            amount: Number of credits to deduct.
            
        Returns:
            True if deduction successful, False if insufficient credits.
        """
        try:
            workspace_uuid = UUID(workspace_id)
        except ValueError:
            logger.error(f"Invalid workspace_id format: {workspace_id}")
            return False

        # Use database transaction with row-level locking
        async with self.db.begin_nested():
            result = await self.db.execute(
                select(WorkspaceBilling)
                .where(WorkspaceBilling.workspace_id == workspace_uuid)
                .where(WorkspaceBilling.is_active == True)
                .with_for_update()
            )
            billing = result.scalar_one_or_none()

            if billing is None or billing.credits_remaining < amount:
                return False

            # Deduct credits
            new_credits = billing.credits_remaining - amount
            await self.db.execute(
                update(WorkspaceBilling)
                .where(WorkspaceBilling.id == billing.id)
                .values(credits_remaining=new_credits)
            )

            # Update Redis cache
            redis = await self._get_redis()
            redis_key = self._get_redis_key(workspace_id)
            try:
                await redis.setex(redis_key, self.DEFAULT_TTL, new_credits)
            except Exception as e:
                logger.warning(f"Redis cache update failed: {e}")

            await self.db.commit()
            return True

    async def check_eligibility(self, workspace_id: str, feature: str) -> bool:
        """Check if workspace can access a feature.
        
        Args:
            workspace_id: Workspace UUID as string.
            feature: Feature name to check.
            
        Returns:
            True if workspace tier has access to feature.
        """
        try:
            workspace_uuid = UUID(workspace_id)
        except ValueError:
            return False

        result = await self.db.execute(
            select(WorkspaceBilling.tier)
            .where(WorkspaceBilling.workspace_id == workspace_uuid)
            .where(WorkspaceBilling.is_active == True)
        )
        tier_str = result.scalar_one_or_none()

        if not tier_str:
            return False

        return BillingConfig.can_access_feature(tier_str, feature)

    async def reset_monthly_quota(self, workspace_id: str) -> None:
        """Reset monthly quota for a workspace.
        
        Args:
            workspace_id: Workspace UUID as string.
        """
        try:
            workspace_uuid = UUID(workspace_id)
        except ValueError:
            logger.error(f"Invalid workspace_id format: {workspace_id}")
            return

        result = await self.db.execute(
            select(WorkspaceBilling)
            .where(WorkspaceBilling.workspace_id == workspace_uuid)
            .where(WorkspaceBilling.is_active == True)
        )
        billing = result.scalar_one_or_none()

        if not billing:
            return

        # Get tier configuration
        monthly_credits = BillingConfig.get_monthly_credits(billing.tier)

        if monthly_credits == -1:  # Unlimited for enterprise
            return

        # Calculate next reset date
        now = datetime.now(timezone.utc)
        if now.month == 12:
            next_reset = datetime(now.year + 1, 1, 1, tzinfo=timezone.utc)
        else:
            next_reset = datetime(now.year, now.month + 1, 1, tzinfo=timezone.utc)

        # Update database
        await self.db.execute(
            update(WorkspaceBilling)
            .where(WorkspaceBilling.workspace_id == workspace_uuid)
            .values(
                credits_remaining=monthly_credits,
                reset_date=next_reset
            )
        )
        await self.db.commit()

        # Update Redis cache
        redis = await self._get_redis()
        redis_key = self._get_redis_key(workspace_id)
        try:
            await redis.setex(redis_key, self.DEFAULT_TTL, monthly_credits)
        except Exception as e:
            logger.warning(f"Redis cache update failed: {e}")

    async def _create_default_billing(self, workspace_id: UUID) -> WorkspaceBilling:
        """Create default billing record for new workspace.
        
        Args:
            workspace_id: Workspace UUID.
            
        Returns:
            Created WorkspaceBilling instance.
        """
        monthly_credits = BillingConfig.get_monthly_credits(SubscriptionTier.FREE)
        features = BillingConfig.get_all_features(SubscriptionTier.FREE)

        # Calculate next reset date
        now = datetime.now(timezone.utc)
        if now.month == 12:
            next_reset = datetime(now.year + 1, 1, 1, tzinfo=timezone.utc)
        else:
            next_reset = datetime(now.year, now.month + 1, 1, tzinfo=timezone.utc)

        billing = WorkspaceBilling(
            workspace_id=workspace_id,
            tier=SubscriptionTier.FREE.value,
            credits_remaining=monthly_credits,
            credits_limit=monthly_credits,
            reset_date=next_reset,
            features={"features": features},
        )

        self.db.add(billing)
        await self.db.commit()
        await self.db.refresh(billing)

        return billing

    async def rollback_transaction(
        self, 
        workspace_id: str, 
        amount: int, 
        reason: str,
        original_transaction_id: str | None = None
    ) -> bool:
        """Rollback a credit deduction by refunding credits.
        
        Used when an operation fails after credits were already deducted.
        Implements atomic credit addition with row-level locking.
        
        Args:
            workspace_id: Workspace UUID as string.
            amount: Number of credits to refund.
            reason: Human-readable reason for the rollback (for audit log).
            original_transaction_id: Optional ID of the original transaction being rolled back.
            
        Returns:
            True if rollback successful, False otherwise.
        """
        if amount <= 0:
            logger.warning(f"Invalid rollback amount: {amount}")
            return False
            
        try:
            workspace_uuid = UUID(workspace_id)
        except ValueError:
            logger.error(f"Invalid workspace_id format: {workspace_id}")
            return False

        # Use database transaction with row-level locking
        async with self.db.begin_nested():
            result = await self.db.execute(
                select(WorkspaceBilling)
                .where(WorkspaceBilling.workspace_id == workspace_uuid)
                .where(WorkspaceBilling.is_active == True)
                .with_for_update()
            )
            billing = result.scalar_one_or_none()

            if billing is None:
                logger.error(f"No billing record found for workspace: {workspace_id}")
                return False

            # Add credits back
            new_credits = billing.credits_remaining + amount
            
            # Ensure we don't exceed the limit
            if billing.credits_limit > 0 and new_credits > billing.credits_limit:
                new_credits = billing.credits_limit
                logger.warning(
                    f"Rollback capped to limit for workspace {workspace_id}: "
                    f"requested {amount}, actual refund {new_credits - billing.credits_remaining}"
                )

            await self.db.execute(
                update(WorkspaceBilling)
                .where(WorkspaceBilling.id == billing.id)
                .values(credits_remaining=new_credits)
            )

            # Log the rollback for audit purposes
            logger.info(
                f"Credit rollback: workspace={workspace_id}, amount={amount}, "
                f"reason={reason}, new_balance={new_credits}"
                + (f", original_tx={original_transaction_id}" if original_transaction_id else "")
            )

            # Update Redis cache
            redis = await self._get_redis()
            redis_key = self._get_redis_key(workspace_id)
            try:
                await redis.setex(redis_key, self.DEFAULT_TTL, new_credits)
            except Exception as e:
                logger.warning(f"Redis cache update failed during rollback: {e}")

            await self.db.commit()
            return True

    async def close(self):

        """Close Redis connection."""
        if self._redis_client is not None:
            await self._redis_client.close()
