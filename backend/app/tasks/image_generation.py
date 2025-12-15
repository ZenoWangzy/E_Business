"""
Image Generation Celery Task - Background worker for AI image generation.
Story 2.1: Style Selection & Generation Trigger

Stub implementation: waits 5 seconds and marks job as completed.
Real AI integration will be added in future stories.
"""
import asyncio
import uuid
from datetime import datetime, timezone

from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker

from app.core.celery_app import celery_app
from app.core.config import get_settings
from app.models.image import ImageGenerationJob, JobStatus


def get_async_session():
    """Create async session for Celery tasks."""
    settings = get_settings()
    engine = create_async_engine(settings.database_url)
    async_session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
    return async_session


async def _generate_images(job_id: str) -> dict:
    """
    Async implementation of image generation (stub).
    
    Args:
        job_id: UUID string of the ImageGenerationJob in database
        
    Returns:
        dict with task_id, status, and result_urls
    """
    import asyncio as aio
    
    async_session = get_async_session()
    
    async with async_session() as db:
        # Get job from database
        result = await db.execute(
            select(ImageGenerationJob).where(
                ImageGenerationJob.id == uuid.UUID(job_id)
            )
        )
        job = result.scalar_one_or_none()
        
        if not job:
            return {"error": "Job not found", "task_id": job_id}
        
        # Update status to processing
        job.status = JobStatus.PROCESSING
        job.started_at = datetime.now(timezone.utc)
        job.progress = 10
        await db.commit()
        
        # Stub: Simulate AI processing (5 seconds)
        await aio.sleep(5)
        
        # Update progress to 50%
        await db.refresh(job)
        job.progress = 50
        await db.commit()
        
        # Stub: Generate fake result URLs
        result_urls = [
            f"/generated/{job.style_id}/image_1.png",
            f"/generated/{job.style_id}/image_2.png",
            f"/generated/{job.style_id}/image_3.png",
        ]
        
        # Mark as completed
        await db.refresh(job)
        job.status = JobStatus.COMPLETED
        job.progress = 100
        job.result_urls = result_urls
        job.completed_at = datetime.now(timezone.utc)
        await db.commit()
        
        return {
            "task_id": str(job.task_id),
            "status": "completed",
            "result_urls": result_urls
        }


@celery_app.task(
    name="app.tasks.image_generation.generate_images_task",
    bind=True,
    max_retries=3,
    default_retry_delay=60,
)
def generate_images_task(self, job_id: str) -> dict:
    """
    Celery task for AI image generation.
    
    Args:
        job_id: UUID string of the ImageGenerationJob
        
    Returns:
        dict with task_id, status, and result_urls
    """
    try:
        result = asyncio.run(_generate_images(job_id))
        return result
    except Exception as exc:
        # Mark job as failed and retry
        try:
            asyncio.run(_mark_job_failed(job_id, str(exc)))
        except Exception:
            pass  # Best effort
        raise self.retry(exc=exc)


async def _mark_job_failed(job_id: str, error_message: str) -> None:
    """Mark a job as failed in the database."""
    async_session = get_async_session()
    
    async with async_session() as db:
        result = await db.execute(
            select(ImageGenerationJob).where(
                ImageGenerationJob.id == uuid.UUID(job_id)
            )
        )
        job = result.scalar_one_or_none()
        
        if job:
            job.status = JobStatus.FAILED
            job.error_message = error_message
            await db.commit()
