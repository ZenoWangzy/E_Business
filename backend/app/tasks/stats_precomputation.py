"""
[IDENTITY]: Stats Precomputation Tasks
Admin dashboard statistics precomputation and log archival for performance optimization.

[INPUT]:
- Database: Workspace, SystemLog, WorkspaceBilling tables
- Trigger: Celery Beat scheduled tasks

[LINK]:
- Admin Dashboard -> Story 5.3: Stats & Logs
- Models -> app.models.user.Workspace, app.models.system_log.SystemLog
- Redis -> settings.redis_url (cache storage)

[OUTPUT]:
- Redis Cache: Precomputed admin statistics
- Database: Archived/deleted old logs

[POS]: /backend/app/tasks/stats_precomputation.py

[PROTOCOL]:
1. **Precomputation**: Run hourly to cache expensive queries
2. **Log Archival**: Delete logs older than 90 days weekly
3. **Async Execution**: All tasks use asyncio.run() for async operations
4. **Cache TTL**: Statistics expire after 1 hour (3600 seconds)
"""
import asyncio
import json
import logging
from datetime import datetime, timezone, timedelta

import redis.asyncio as aioredis
from sqlalchemy import select, func, text
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.celery_app import celery_app
from app.core.config import get_settings
from app.db.base import get_async_db
from app.models.user import Workspace, WorkspaceBilling
from app.models.system_log import SystemLog, SystemLogLevel

settings = get_settings()
logger = logging.getLogger(__name__)


# Cache key for admin stats
ADMIN_STATS_CACHE_KEY = "admin:stats:precomputed"
STATS_CACHE_TTL = 3600  # 1 hour


@celery_app.task(
    name="app.tasks.stats_precomputation.precompute_admin_stats",
    bind=True,
    max_retries=2,
)
def precompute_admin_stats(self):
    """Pre-compute admin statistics and cache in Redis.
    
    Runs every hour to keep stats fresh while avoiding expensive queries
    on every dashboard load.
    """
    loop = asyncio.new_event_loop()
    asyncio.set_event_loop(loop)

    try:
        loop.run_until_complete(_precompute_stats_async())
        logger.info("Admin stats precomputation completed successfully")
    except Exception as exc:
        logger.error(f"Admin stats precomputation failed: {exc}")
        if self.request.retries < 2:
            raise self.retry(exc=exc, countdown=300)
    finally:
        loop.close()


async def _precompute_stats_async():
    """Async implementation of stats precomputation."""
    async for db in get_async_db():
        try:
            now = datetime.now(timezone.utc)
            today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
            last_24h = now - timedelta(hours=24)
            
            # Count active workspaces
            active_workspaces_result = await db.execute(
                select(func.count(Workspace.id)).where(Workspace.is_active == True)
            )
            active_workspaces = active_workspaces_result.scalar() or 0
            
            # Count generations today (from all generation tables)
            generations_today = 0
            for table_name in ['image_generation_jobs', 'copy_generation_jobs', 'video_generation_jobs']:
                try:
                    result = await db.execute(
                        text(f"SELECT COUNT(*) FROM {table_name} WHERE created_at >= :today_start"),
                        {"today_start": today_start}
                    )
                    generations_today += result.scalar() or 0
                except Exception:
                    continue
            
            # Calculate error rate from system logs
            total_logs_result = await db.execute(
                select(func.count(SystemLog.id)).where(SystemLog.created_at >= last_24h)
            )
            total_logs = total_logs_result.scalar() or 0
            
            error_logs_result = await db.execute(
                select(func.count(SystemLog.id)).where(
                    SystemLog.created_at >= last_24h,
                    SystemLog.level == SystemLogLevel.ERROR
                )
            )
            error_logs = error_logs_result.scalar() or 0
            
            error_rate = (error_logs / total_logs * 100) if total_logs > 0 else 0.0
            
            # Calculate estimated MRR
            mrr_result = await db.execute(
                select(func.count(WorkspaceBilling.id)).where(
                    WorkspaceBilling.is_active == True,
                    WorkspaceBilling.tier != 'free'
                )
            )
            paid_subscriptions = mrr_result.scalar() or 0
            estimated_mrr = paid_subscriptions * 29.0  # Assuming $29/month for PRO
            
            # Build stats object
            stats = {
                "active_workspaces": active_workspaces,
                "generations_today": generations_today,
                "error_rate_24h": round(error_rate, 2),
                "estimated_mrr": estimated_mrr,
                "last_updated": now.isoformat(),
                "precomputed": True
            }
            
            # Store in Redis
            redis_client = await aioredis.from_url(
                settings.redis_url,
                encoding="utf-8",
                decode_responses=True
            )
            
            try:
                await redis_client.setex(
                    ADMIN_STATS_CACHE_KEY,
                    STATS_CACHE_TTL,
                    json.dumps(stats)
                )
                logger.info(f"Cached admin stats: {stats}")
            finally:
                await redis_client.close()
                
        except Exception as e:
            logger.error(f"Error precomputing stats: {e}")
            raise


@celery_app.task(
    name="app.tasks.stats_precomputation.archive_old_logs",
    bind=True,
)
def archive_old_logs(self):
    """Archive system logs older than 90 days.
    
    Runs weekly to keep the system_logs table performant.
    """
    loop = asyncio.new_event_loop()
    asyncio.set_event_loop(loop)

    try:
        loop.run_until_complete(_archive_logs_async())
        logger.info("Log archival completed successfully")
    except Exception as exc:
        logger.error(f"Log archival failed: {exc}")
    finally:
        loop.close()


async def _archive_logs_async():
    """Async implementation of log archival."""
    async for db in get_async_db():
        try:
            cutoff_date = datetime.now(timezone.utc) - timedelta(days=90)
            
            # Count logs to archive
            count_result = await db.execute(
                select(func.count(SystemLog.id)).where(SystemLog.created_at < cutoff_date)
            )
            count = count_result.scalar() or 0
            
            if count > 0:
                logger.info(f"Archiving {count} logs older than 90 days")
                
                # Delete old logs (in production, would archive to cold storage first)
                await db.execute(
                    text("DELETE FROM system_logs WHERE created_at < :cutoff"),
                    {"cutoff": cutoff_date}
                )
                await db.commit()
                
                logger.info(f"Archived {count} old log entries")
            else:
                logger.info("No logs to archive")
                
        except Exception as e:
            logger.error(f"Error archiving logs: {e}")
            raise
