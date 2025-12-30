"""
[IDENTITY]: Copy Generation Tasks
Async executors for AI Text Generation.

[INPUT]:
- CopyGenerationJob ID and Params (via Celery).

[LINK]:
- CopyService -> ../services/copy_service.py
- JobModel -> ../models/copy.py

[OUTPUT]: Database Status Updates (JobStatus.COMPLETED/FAILED).
[POS]: /backend/app/tasks/copy_tasks.py

[PROTOCOL]:
1. Wraps `CopyService` calls ensuring status updates even on crash.
2. Supports retry with exponential backoff.
"""

import asyncio
import uuid
from datetime import datetime, timezone
from typing import Dict, Any, Optional

from celery import Task
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.celery_app import celery_app
from app.core.logger import get_logger, log_task_event
from app.db.session import AsyncSessionLocal
from app.models.copy import CopyGenerationJob, JobStatus
from app.services.copy_service import CopyGenerationService, CopyGenerationError

logger = get_logger(__name__)


def _run_async(maybe_coro):
    """Run a coroutine if needed.

    This keeps Celery task bodies synchronous while allowing async implementations.
    Also helps in unit tests where patched functions may not return coroutines.
    """
    if asyncio.iscoroutine(maybe_coro):
        return asyncio.run(maybe_coro)
    return maybe_coro


def get_async_session() -> AsyncSession:
    """Get an AsyncSession (async context manager)."""
    return AsyncSessionLocal()


class DatabaseTask(Task):
    """Base task class with database session management."""

    def on_failure(self, exc, task_id, args, kwargs, einfo):
        """Handle task failure."""
        log_task_event(
            logger,
            task_id,
            "failed",
            f"Task failed: {str(exc)}"
        )

    def on_success(self, retval, task_id, args, kwargs):
        """Handle task success."""
        log_task_event(
            logger,
            task_id,
            "completed",
            "Task completed successfully"
        )


async def get_job_async(job_id: str) -> Optional[CopyGenerationJob]:
    """Asynchronously get a copy generation job."""
    async with get_async_session() as db:
        result = await db.get(CopyGenerationJob, job_id)
        return result


async def update_job_status_async(
    job_id: str,
    status: JobStatus,
    error_message: Optional[str] = None,
    progress: Optional[int] = None
) -> None:
    """Asynchronously update job status."""
    async with get_async_session() as db:
        job = await db.get(CopyGenerationJob, job_id)
        if job:
            job.status = status
            if error_message:
                job.error_message = error_message
            if progress is not None:
                job.progress = progress

            if status == JobStatus.PROCESSING and not job.started_at:
                job.started_at = datetime.now(timezone.utc)
            elif status in [JobStatus.COMPLETED, JobStatus.FAILED]:
                job.completed_at = datetime.now(timezone.utc)

            await db.commit()


@celery_app.task(bind=True, base=DatabaseTask, max_retries=3)
def generate_copy_task(
    self,
    job_id: str,
    user_id: str,
    workspace_id: str,
    request_data: Dict[str, Any]
):
    """
    Celery task for AI copy generation.

    Args:
        job_id: CopyGenerationJob database ID
        user_id: User ID who initiated the request
        workspace_id: Workspace ID for multi-tenant isolation
        request_data: Copy generation parameters
    """
    task_id = self.request.id

    log_task_event(
        logger,
        task_id,
        "started",
        f"Copy generation task started for job {job_id}"
    )

    try:
        # Update job status to processing
        _run_async(update_job_status_async(job_id, JobStatus.PROCESSING))

        async def _run_generation():
            async with get_async_session() as db:
                service = CopyGenerationService(db)
                return await service.process_generation(job_id, request_data)

        # Initialize service and process generation
        result = asyncio.run(_run_generation())

        log_task_event(
            logger,
            task_id,
            "completed",
            f"Copy generation completed: {result}"
        )

        return result

    except Exception as exc:
        # Handle error with retry logic
        error_msg = f"Copy generation failed: {str(exc)}"

        # Update job status to failed
        _run_async(update_job_status_async(
            job_id,
            JobStatus.FAILED,
            error_message=error_msg
        ))

        log_task_event(
            logger,
            task_id,
            "failed",
            error_msg
        )

        # Retry if we haven't exceeded max retries
        if self.request.retries < self.max_retries:
            # Exponential backoff: 2^retry_count seconds (max 60 seconds)
            countdown = min(2 ** self.request.retries, 60)

            log_task_event(
                logger,
                task_id,
                "retrying",
                f"Retrying in {countdown} seconds (attempt {self.request.retries + 1}/{self.max_retries})"
            )

            raise self.retry(countdown=countdown, exc=exc)

        # No more retries, re-raise the exception
        raise CopyGenerationError(error_msg)


@celery_app.task(bind=True, base=DatabaseTask)
def save_copy_result_task(
    self,
    job_id: str,
    content: str,
    copy_type: str,
    tone: str,
    audience: str,
    length: str,
    workspace_id: str,
    product_id: str
):
    """
    Celery task for saving individual copy results.

    Args:
        job_id: CopyGenerationJob database ID
        content: Generated copy content
        copy_type: Type of copy (titles, selling_points, etc.)
        tone: Tone of the copy
        audience: Target audience
        length: Length preference
        workspace_id: Workspace ID
        product_id: Product ID
    """
    task_id = self.request.id

    try:
        from app.models.copy import CopyType, Tone, Audience, Length

        # Convert string enums to actual enum values
        copy_type_enum = CopyType(copy_type)
        tone_enum = Tone(tone)
        audience_enum = Audience(audience)
        length_enum = Length(length)

        async def _run_save():
            async with get_async_session() as db:
                service = CopyGenerationService(db)

                result = await service.save_copy_result(
                    job_id=uuid.UUID(job_id),
                    content=content,
                    copy_type=copy_type_enum,
                    tone=tone_enum,
                    audience=audience_enum,
                    length=length_enum,
                    workspace_id=uuid.UUID(workspace_id),
                    product_id=uuid.UUID(product_id)
                )

                log_task_event(
                    logger,
                    task_id,
                    "completed",
                    f"Copy result saved: {result.id}"
                )

                return str(result.id)

        return asyncio.run(_run_save())

    except Exception as exc:
        error_msg = f"Failed to save copy result: {str(exc)}"
        log_task_event(logger, task_id, "failed", error_msg)
        raise


@celery_app.task(bind=True, base=DatabaseTask)
def cleanup_old_copy_jobs_task(self, days_old: int = 30):
    """
    Cleanup old copy generation jobs.

    Args:
        days_old: Delete jobs older than this many days
    """
    task_id = self.request.id

    try:
        from sqlalchemy import select, delete
        from datetime import timedelta

        cutoff_date = datetime.now(timezone.utc) - timedelta(days=days_old)

        async def _run_cleanup() -> int:
            async with get_async_session() as db:
                # Delete old copy results first (due to foreign key constraint)
                from app.models.copy import CopyGenerationJob, CopyResult

                # Get old job IDs
                old_jobs_query = select(CopyGenerationJob.id).where(
                    CopyGenerationJob.created_at < cutoff_date
                )
                old_jobs_result = await db.execute(old_jobs_query)
                old_job_ids = old_jobs_result.scalars().all()

                if old_job_ids:
                    # Delete associated copy results
                    delete_results_query = delete(CopyResult).where(
                        CopyResult.generation_job_id.in_(old_job_ids)
                    )
                    await db.execute(delete_results_query)

                    # Delete the jobs
                    delete_jobs_query = delete(CopyGenerationJob).where(
                        CopyGenerationJob.id.in_(old_job_ids)
                    )
                    await db.execute(delete_jobs_query)

                    await db.commit()

                    log_task_event(
                        logger,
                        task_id,
                        "completed",
                        f"Cleaned up {len(old_job_ids)} old copy jobs"
                    )

                    return len(old_job_ids)

                log_task_event(
                    logger,
                    task_id,
                    "completed",
                    "No old copy jobs to clean up"
                )

                return 0

        return asyncio.run(_run_cleanup())

    except Exception as exc:
        error_msg = f"Failed to cleanup old copy jobs: {str(exc)}"
        log_task_event(logger, task_id, "failed", error_msg)
        raise