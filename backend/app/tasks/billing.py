"""
[IDENTITY]: Billing Tasks
Monthly quota management and credit reconciliation.

[INPUT]:
- Triggered by Celery Beat (Scheduled).

[LINK]:
- BillingService -> ../services/billing_service.py
- WorkspaceBilling -> ../models/user.py

[OUTPUT]: Side Effects (Database updates, Redis cache invalidation).
[POS]: /backend/app/tasks/billing.py

[PROTOCOL]:
1. `reset_monthly_quotas` must be idempotent (safe to run twice).
2. Use batch processing to avoid blocking DB/Redis.
"""
import asyncio
import logging
from datetime import datetime, timezone

import redis.asyncio as aioredis
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.celery_app import celery_app
from app.core.config import get_settings
from app.db.base import get_async_db
from app.models.user import WorkspaceBilling
from app.services.billing_service import BillingService

settings = get_settings()
logger = logging.getLogger(__name__)


@celery_app.task(
    name="app.tasks.billing.reset_monthly_quotas",
    bind=True,
    max_retries=3,
    default_retry_delay=300,  # 5 minutes
)
def reset_monthly_quotas(self):
    """Reset monthly quotas for all workspaces.
    
    Runs on the 1st of each month at 00:05 UTC.
    """
    loop = asyncio.new_event_loop()
    asyncio.set_event_loop(loop)

    try:
        loop.run_until_complete(_reset_quotas_async())
        logger.info("Monthly quota reset completed successfully")
    except Exception as exc:
        logger.error(f"Monthly quota reset failed: {exc}")
        # Retry with exponential backoff
        countdown = min(self.request.retries * 300, 3600)  # Max 1 hour
        raise self.retry(exc=exc, countdown=countdown)
    finally:
        loop.close()


async def _reset_quotas_async():
    """Async implementation of quota reset."""
    async for db in get_async_db():
        billing_service = BillingService(db)

        try:
            # Get all active billing records
            result = await db.execute(
                select(WorkspaceBilling.workspace_id)
                .where(WorkspaceBilling.is_active == True)
            )
            workspace_ids = [str(row[0]) for row in result.all()]

            logger.info(f"Resetting quotas for {len(workspace_ids)} workspaces")

            # Reset quotas in batches to avoid overwhelming Redis
            batch_size = 50
            for i in range(0, len(workspace_ids), batch_size):
                batch = workspace_ids[i:i + batch_size]
                tasks = [billing_service.reset_monthly_quota(wid) for wid in batch]
                await asyncio.gather(*tasks, return_exceptions=True)
                
                logger.info(f"Reset batch {i // batch_size + 1} ({len(batch)} workspaces)")

        finally:
            await billing_service.close()


@celery_app.task(
    name="app.tasks.billing.cleanup_redis_cache",
    bind=True,
)
def cleanup_redis_cache(self):
    """Clean up expired Redis cache entries.
    
    Runs daily at 02:00 UTC to ensure TTLs are set.
    """
    loop = asyncio.new_event_loop()
    asyncio.set_event_loop(loop)

    try:
        loop.run_until_complete(_cleanup_cache_async())
        logger.info("Redis cache cleanup completed successfully")
    except Exception as exc:
        logger.error(f"Redis cache cleanup failed: {exc}")
        # Don't retry - this is a maintenance task
    finally:
        loop.close()


async def _cleanup_cache_async():
    """Async implementation of cache cleanup."""
    redis_client = await aioredis.from_url(
        settings.redis_url,
        encoding="utf-8",
        decode_responses=True
    )

    try:
        # Find all billing cache keys
        pattern = "billing:workspace:*:credits"
        keys = []
        
        async for key in redis_client.scan_iter(match=pattern, count=100):
            keys.append(key)

        logger.info(f"Found {len(keys)} billing cache keys")

        if keys:
            # Ensure all keys have TTL set
            for key in keys:
                ttl = await redis_client.ttl(key)
                if ttl == -1:  # No expiration set
                    await redis_client.expire(key, 86400)  # Set 24h TTL
                    logger.debug(f"Set TTL for key: {key}")

    finally:
        await redis_client.close()


@celery_app.task(
    name="app.tasks.billing.refund_credits",
    bind=True,
    max_retries=2,
)
def refund_credits(self, workspace_id: str, amount: int, reason: str = "task_failed"):
    """Refund credits for failed task.
    
    Args:
        workspace_id: Workspace UUID as string.
        amount: Number of credits to refund.
        reason: Reason for refund (for audit logging).
    """
    loop = asyncio.new_event_loop()
    asyncio.set_event_loop(loop)

    try:
        loop.run_until_complete(_refund_async(workspace_id, amount, reason))
        logger.info(f"Refunded {amount} credits to workspace {workspace_id}: {reason}")
    except Exception as exc:
        logger.error(f"Credit refund failed for {workspace_id}: {exc}")
        # Retry once more
        if self.request.retries < 2:
            raise self.retry(exc=exc, countdown=60)
    finally:
        loop.close()


async def _refund_async(workspace_id: str, amount: int, reason: str):
    """Async implementation of credit refund."""
    from uuid import UUID
    
    async for db in get_async_db():
        billing_service = BillingService(db)

        try:
            # Get current billing record
            workspace_uuid = UUID(workspace_id)
            result = await db.execute(
                select(WorkspaceBilling)
                .where(WorkspaceBilling.workspace_id == workspace_uuid)
                .where(WorkspaceBilling.is_active == True)
            )
            billing = result.scalar_one_or_none()

            if not billing:
                logger.warning(f"No billing record found for workspace {workspace_id}")
                return

            # Add credits back
            new_credits = billing.credits_remaining + amount
            
            from sqlalchemy import update
            await db.execute(
                update(WorkspaceBilling)
                .where(WorkspaceBilling.id == billing.id)
                .values(credits_remaining=new_credits)
            )
            await db.commit()

            # Update Redis cache
            redis = await billing_service._get_redis()
            redis_key = billing_service._get_redis_key(workspace_id)
            await redis.setex(redis_key, billing_service.DEFAULT_TTL, new_credits)

        finally:
            await billing_service.close()
