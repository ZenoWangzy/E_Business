"""
Image Generation Celery Task - Background worker for AI image generation.
Story 2.2: AI Generation Worker (Celery/Redis)
Story 2.4: Reference Image Attachment

Enhanced implementation with ImageService integration and Redis status updates.
"""
from celery.exceptions import SoftTimeLimitExceeded
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.celery_app import celery_app
from app.core.config import get_settings
from app.core.logger import get_logger, log_task_event
from app.db.session import get_db_context
from app.models.image import ImageGenerationJob, JobStatus
from app.models.asset import Asset
from app.services.image_service import ImageService, ImageGenerationError
from app.services.storage_service import get_asset_download_url

settings = get_settings()
logger = get_logger(__name__)


@celery_app.task(
    name="app.tasks.image_generation.generate_images_task",
    bind=True,
    autoretry_for=(ImageGenerationError,),
    retry_backoff=True,
    retry_jitter=True,
    max_retries=3,
    retry_backoff_max=300,  # 5 minutes max backoff
)
def generate_images_task(self, job_id: str) -> dict:
    """
    Celery task for AI image generation.

    Enhanced with:
    - SoftTimeLimitExceeded handling
    - Redis status publishing
    - ImageService integration
    - Database context management

    Args:
        job_id: UUID string of the ImageGenerationJob

    Returns:
        dict with task_id, status, and result_urls
    """
    task_id = self.request.id
    log_task_event(logger, task_id, "started", f"Starting image generation for job {job_id}")

    try:
        with get_db_context() as db:
            # Fetch the job with its parameters
            job = db.query(ImageGenerationJob).filter(
                ImageGenerationJob.id == job_id
            ).first()

            if not job:
                log_task_event(logger, task_id, "error", f"Job {job_id} not found")
                return {
                    "task_id": task_id,
                    "status": "failed",
                    "error": f"Job {job_id} not found"
                }

            # Update initial status
            job.status = JobStatus.PROCESSING
            job.progress = 10
            db.commit()

            # Publish initial progress
            _publish_status(str(job.task_id), "processing", 10, "Starting generation...")

            # Story 2.4: Get reference image URL if provided
            reference_image_url = None
            if job.reference_image_id:
                # Get reference image from database
                reference_result = db.execute(
                    select(Asset).where(Asset.id == job.reference_image_id)
                )
                reference_asset = reference_result.scalar_one_or_none()

                if reference_asset:
                    # Generate presigned URL for the reference image
                    # In a real implementation, you would use the storage service
                    # For now, we'll construct the URL
                    reference_image_url = f"/api/v1/workspaces/{job.workspace_id}/assets/{reference_asset.id}/url"
                    logger.info(f"Using reference image: {reference_asset.name} for job {job_id}")

            # Create ImageService and process generation
            image_service = ImageService(db)
            params = {
                "prompt": getattr(job, 'prompt', 'Product image'),
                "style": job.style_id,
                "count": 4,  # Default count
                "reference_image_url": reference_image_url  # Story 2.4
            }

            result = image_service.process_generation(job_id, params)

            log_task_event(logger, task_id, "completed", f"Successfully generated images for job {job_id}")
            return result

    except SoftTimeLimitExceeded:
        # Handle soft timeout gracefully
        log_task_event(logger, task_id, "timeout", "Task timed out, marking as failed")
        _handle_timeout(job_id, task_id)
        raise ImageGenerationError("Task timed out after 5 minutes")

    except ImageGenerationError as exc:
        # Log the error
        log_task_event(logger, task_id, "failed", f"Image generation failed: {str(exc)}")

        # Mark job as failed in database
        _mark_job_failed(job_id, str(exc))

        # Re-raise to trigger retry if applicable
        raise exc

    except Exception as exc:
        # Handle unexpected errors
        log_task_event(logger, task_id, "error", f"Unexpected error: {str(exc)}")

        # Mark job as failed
        _mark_job_failed(job_id, f"Unexpected error: {str(exc)}")

        # Wrap in ImageGenerationError for retry
        raise ImageGenerationError(f"Unexpected error: {str(exc)}")


def _handle_timeout(job_id: str, task_id: str) -> None:
    """Handle timeout by marking job as failed."""
    try:
        with get_db_context() as db:
            job = db.query(ImageGenerationJob).filter(
                ImageGenerationJob.id == job_id
            ).first()

            if job:
                job.status = JobStatus.FAILED
                job.error_message = "Task timed out after 5 minutes"
                db.commit()

                # Publish timeout status
                _publish_status(str(job.task_id), "failed", 0, "Task timed out")
    except Exception as e:
        logger.error(f"Failed to handle timeout for job {job_id}: {e}")


def _mark_job_failed(job_id: str, error_message: str) -> None:
    """Mark a job as failed in the database."""
    try:
        with get_db_context() as db:
            job = db.query(ImageGenerationJob).filter(
                ImageGenerationJob.id == job_id
            ).first()

            if job:
                job.status = JobStatus.FAILED
                job.error_message = error_message
                job.progress = 0
                db.commit()

                # Publish failure status
                _publish_status(str(job.task_id), "failed", 0, f"Failed: {error_message}")

    except Exception as e:
        logger.error(f"Failed to mark job {job_id} as failed: {e}")


# Module-level Redis client for status publishing (connection reuse)
_redis_client = None


def _get_redis_client():
    """Get or create Redis client for status publishing."""
    global _redis_client
    if _redis_client is None:
        import redis
        _redis_client = redis.from_url(settings.redis_url)
    return _redis_client


def _publish_status(task_id: str, status: str, progress: int, message: str) -> None:
    """
    Publish status update to Redis.

    This function exists for backward compatibility and to handle
    status updates outside of ImageService.
    """
    try:
        import json
        from datetime import datetime, timezone

        redis_client = _get_redis_client()
        channel = f"task_updates:{task_id}"

        payload = {
            "status": status,
            "progress": progress,
            "message": message,
            "timestamp": datetime.now(timezone.utc).isoformat()
        }

        redis_client.publish(channel, json.dumps(payload))
    except Exception as e:
        logger.warning(f"Failed to publish status to Redis: {e}")

