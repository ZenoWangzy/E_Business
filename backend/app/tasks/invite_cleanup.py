"""
[IDENTITY]: Invite Cleanup Task
Async task to expire pending invites that have passed their expiration time.

[INPUT]:
- Database: WorkspaceInvite entries with status=PENDING
- Current Time: UTC now

[LINK]:
- Model -> app.models.user.WorkspaceInvite
- Schedule -> app.core.celery_app (Beat)

[OUTPUT]:
- Dict with count of expired invites

[POS]: /backend/app/tasks/invite_cleanup.py

[PROTOCOL]:
1. Runs daily via Celery Beat.
2. Uses Async SQLAlchemy session.
3. Batch updates status to EXPIRED.
"""
import asyncio
from datetime import datetime, timezone

from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker

from app.core.celery_app import celery_app
from app.core.config import get_settings
from app.models.user import WorkspaceInvite, InviteStatus


def get_async_session():
    """Create async session for Celery tasks."""
    settings = get_settings()
    engine = create_async_engine(settings.database_url)
    async_session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
    return async_session


async def _cleanup_expired_invites() -> dict:
    """Async implementation of invite cleanup."""
    async_session = get_async_session()
    
    async with async_session() as db:
        now = datetime.now(timezone.utc)
        
        # Find and update expired pending invites
        stmt = (
            update(WorkspaceInvite)
            .where(
                WorkspaceInvite.status == InviteStatus.PENDING,
                WorkspaceInvite.expires_at < now,
            )
            .values(status=InviteStatus.EXPIRED)
            .returning(WorkspaceInvite.id)
        )
        
        result = await db.execute(stmt)
        expired_ids = list(result.scalars().all())
        await db.commit()
        
        return {
            "expired_count": len(expired_ids),
            "expired_ids": [str(id) for id in expired_ids[:100]],  # Limit for logging
            "timestamp": now.isoformat(),
        }


@celery_app.task(
    name="app.tasks.invite_cleanup.cleanup_expired_invites",
    bind=True,
    max_retries=3,
    default_retry_delay=300,  # 5 minutes
)
def cleanup_expired_invites(self) -> dict:
    """
    Celery task to cleanup expired invites.
    
    Marks all PENDING invites with expires_at < now as EXPIRED.
    Runs daily via Celery Beat scheduler.
    
    Returns:
        dict with expired_count and timestamp
    """
    try:
        result = asyncio.run(_cleanup_expired_invites())
        return result
    except Exception as exc:
        # Retry on failure
        raise self.retry(exc=exc)


@celery_app.task(name="app.tasks.invite_cleanup.cleanup_expired_invites_now")
def cleanup_expired_invites_now() -> dict:
    """
    Manual trigger for invite cleanup (without retry logic).
    Can be called via: celery call app.tasks.invite_cleanup.cleanup_expired_invites_now
    """
    return asyncio.run(_cleanup_expired_invites())
