"""
[IDENTITY]: Storage Cleanup Task
Async tasks to reconcile pending uploads and cleanup orphaned/failed asset records.

[INPUT]:
- Database: Asset entries with storage_status in (PENDING_UPLOAD, UPLOADING, FAILED)
- MinIO: Storage verification via StorageService
- Redis: TTL tracking for pending uploads

[LINK]:
- Model -> app.models.asset.Asset, StorageStatus
- Service -> app.services.transactional_upload.TransactionalUploadService
- StorageService -> app.services.storage_service.StorageService
- Schedule -> app.core.celery_app (Beat)

[OUTPUT]:
- Dict with count of reconciled/cleaned assets

[POS]: /backend/app/tasks/storage_cleanup.py

[PROTOCOL]:
1. Runs periodically via Celery Beat (e.g., every 10 minutes).
2. Uses TransactionalUploadService.cleanup_expired_assets() for reconciliation.
3. Separate task for cleaning up old FAILED records (daily).
4. All operations are idempotent and safe to retry.
"""
import asyncio
from datetime import datetime, timedelta, timezone
import logging

from sqlalchemy import select, delete
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker

from app.core.celery_app import celery_app
from app.core.config import get_settings
from app.models.asset import Asset, StorageStatus
from app.services.transactional_upload import get_transactional_upload_service

logger = logging.getLogger(__name__)


def get_async_session():
    """Create async session for Celery tasks."""
    settings = get_settings()
    engine = create_async_engine(settings.database_url)
    async_session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
    return async_session


# =============================================================================
# Reconcile Pending Uploads Task
# =============================================================================


async def _reconcile_pending_uploads() -> dict:
    """
    Async implementation of pending upload reconciliation.
    
    Uses TransactionalUploadService to:
    1. Find stale PENDING_UPLOAD or UPLOADING assets (older than threshold)
    2. Verify if file exists in MinIO
    3. If file exists -> Mark as UPLOADED
    4. If file missing -> Mark as FAILED
    """
    async_session = get_async_session()
    upload_service = get_transactional_upload_service()
    
    async with async_session() as db:
        result = await upload_service.cleanup_expired_assets(db)
        return result


@celery_app.task(
    name="app.tasks.storage_cleanup.reconcile_pending_uploads",
    bind=True,
    max_retries=3,
    default_retry_delay=60,  # 1 minute
)
def reconcile_pending_uploads(self) -> dict:
    """
    Celery task to reconcile stale pending uploads.
    
    This task:
    1. Finds assets stuck in PENDING_UPLOAD or UPLOADING for too long
    2. Verifies if corresponding file exists in MinIO
    3. Updates status accordingly (UPLOADED if exists, FAILED if not)
    
    Runs periodically via Celery Beat scheduler (recommended: every 10 minutes).
    
    Returns:
        dict with reconciled_count, failed_count, and timestamp
    """
    try:
        result = asyncio.run(_reconcile_pending_uploads())
        logger.info(
            f"Reconciliation completed: {result.get('reconciled_count', 0)} reconciled, "
            f"{result.get('failed_count', 0)} marked failed"
        )
        return result
    except Exception as exc:
        logger.error(f"Reconciliation task failed: {exc}")
        raise self.retry(exc=exc)


# =============================================================================
# Cleanup Failed/Old Assets Task
# =============================================================================


async def _cleanup_failed_assets(max_age_days: int = 7) -> dict:
    """
    Async implementation to cleanup old FAILED assets.
    
    Assets marked as FAILED for more than max_age_days are deleted from DB.
    Note: This does NOT delete files from MinIO (those are already missing/invalid).
    """
    async_session = get_async_session()
    
    async with async_session() as db:
        now = datetime.now(timezone.utc)
        cutoff_time = now - timedelta(days=max_age_days)
        
        # Find and delete old FAILED assets
        stmt = (
            delete(Asset)
            .where(
                Asset.storage_status == StorageStatus.FAILED,
                Asset.updated_at < cutoff_time,
            )
            .returning(Asset.id)
        )
        
        result = await db.execute(stmt)
        deleted_ids = list(result.scalars().all())
        await db.commit()
        
        logger.info(f"Cleaned up {len(deleted_ids)} old FAILED assets")
        
        return {
            "deleted_count": len(deleted_ids),
            "deleted_ids": [str(id) for id in deleted_ids[:50]],  # Limit for logging
            "max_age_days": max_age_days,
            "timestamp": now.isoformat(),
        }


@celery_app.task(
    name="app.tasks.storage_cleanup.cleanup_failed_assets",
    bind=True,
    max_retries=2,
    default_retry_delay=300,  # 5 minutes
)
def cleanup_failed_assets(self, max_age_days: int = 7) -> dict:
    """
    Celery task to cleanup old FAILED asset records.
    
    Deletes Asset records that have been in FAILED status for more than max_age_days.
    This helps prevent database bloat from accumulating failed upload attempts.
    
    Runs daily via Celery Beat scheduler.
    
    Args:
        max_age_days: Delete FAILED assets older than this many days (default: 7)
    
    Returns:
        dict with deleted_count and timestamp
    """
    try:
        result = asyncio.run(_cleanup_failed_assets(max_age_days))
        return result
    except Exception as exc:
        logger.error(f"Failed assets cleanup task failed: {exc}")
        raise self.retry(exc=exc)


# =============================================================================
# Manual Trigger Tasks (for admin use)
# =============================================================================


@celery_app.task(name="app.tasks.storage_cleanup.reconcile_pending_uploads_now")
def reconcile_pending_uploads_now() -> dict:
    """
    Manual trigger for pending upload reconciliation (without retry logic).
    
    Usage: celery call app.tasks.storage_cleanup.reconcile_pending_uploads_now
    """
    return asyncio.run(_reconcile_pending_uploads())


@celery_app.task(name="app.tasks.storage_cleanup.cleanup_failed_assets_now")
def cleanup_failed_assets_now(max_age_days: int = 7) -> dict:
    """
    Manual trigger for failed assets cleanup (without retry logic).
    
    Usage: celery call app.tasks.storage_cleanup.cleanup_failed_assets_now --kwargs='{"max_age_days": 7}'
    """
    return asyncio.run(_cleanup_failed_assets(max_age_days))
