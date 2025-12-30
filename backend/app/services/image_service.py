"""
[IDENTITY]: Image Generation Service
Core Business Logic for Image Generation (DALL-E / Stable Diffusion Wrapper).

[INPUT]:
- Prompt parameters (Style, Count).

[LINK]:
- DB_Image -> ../models/image.py
- CeleryTask -> ../tasks/image_generation.py

[OUTPUT]: List of Image URLs (Local or Remote).
[POS]: /backend/app/services/image_service.py

[PROTOCOL]:
1. `_save_images` creates database records for generated assets.
2. Uses `redis` to publish fine-grained progress updates.
"""
import json
import time
import uuid
from datetime import datetime, timezone
from typing import Dict, List, Optional

import redis
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.core.logger import get_logger, log_task_event
from app.models.image import ImageGenerationJob, JobStatus, Image

settings = get_settings()
logger = get_logger(__name__)

# Redis client for publishing status updates
redis_client = redis.from_url(settings.redis_url)


class ImageGenerationError(Exception):
    """Custom exception for image generation errors."""
    pass


class ImageService:
    """Service for handling AI image generation."""

    def __init__(self, db: Session):
        """Initialize the service with database session."""
        self.db = db

    def process_generation(self, job_id: str, params: Dict) -> Dict:
        """Process an image generation request.

        Args:
            job_id: The generation job ID
            params: Generation parameters including prompt, style, count

        Returns:
            Dict with generation results including image URLs

        Raises:
            ImageGenerationError: If generation fails
        """
        log_task_event(logger, job_id, "started", f"Starting image generation with params: {params}")

        # Fetch the job
        job = self.db.query(ImageGenerationJob).filter(
            ImageGenerationJob.id == job_id
        ).first()

        if not job:
            log_task_event(logger, job_id, "error", "Job not found")
            raise ImageGenerationError(f"Job {job_id} not found")

        try:
            # Update job status to processing
            job.status = JobStatus.PROCESSING
            job.started_at = datetime.now(timezone.utc)
            self.db.commit()

            # Generate images based on mode
            if settings.ai_mock_mode:
                result_urls = self._generate_mock_images(job_id, params)
            else:
                result_urls = self._generate_real_images(params)

            # Save images to database
            self._save_images(job, result_urls)

            # Update job status
            job.status = JobStatus.COMPLETED
            job.completed_at = datetime.now(timezone.utc)
            job.result_urls = result_urls
            job.progress = 100
            self.db.commit()

            # Publish completion
            self._publish_progress(str(job.task_id), 100, "Completed")

            log_task_event(logger, job_id, "completed", f"Generated {len(result_urls)} images")
            return {
                "status": "completed",
                "images": result_urls,
                "job_id": job_id
            }

        except Exception as e:
            # Handle error
            job.status = JobStatus.FAILED
            job.error_message = str(e)
            self.db.commit()

            # Publish failure
            self._publish_progress(str(job.task_id), 0, f"Failed: {str(e)}")

            log_task_event(logger, job_id, "failed", f"Generation failed: {str(e)}")
            raise ImageGenerationError(f"Generation failed: {str(e)}")

    def _generate_mock_images(self, job_id: str, params: Dict) -> List[str]:
        """Generate mock images for development/testing.

        Simulates the AI generation process with progress updates.
        """
        count = params.get("count", 4)
        style = params.get("style", "modern")

        # Simulate processing with progress updates
        progress_steps = [10, 30, 50, 70, 90, 100]

        for progress in progress_steps[:-1]:
            self._publish_progress(job_id, progress, f"Processing... {progress}%")
            time.sleep(1)  # Simulate work

        # Generate mock URLs
        base_url = "https://mock-image-service.com"
        result_urls = []

        for i in range(count):
            # Generate unique mock image URL
            image_id = uuid.uuid4()
            url = f"{base_url}/{style}/{image_id}.jpg"
            result_urls.append(url)

        return result_urls

    def _generate_real_images(self, params: Dict) -> List[str]:
        """Generate real images using AI service.

        This is a placeholder for real AI service integration.
        In production, this would call services like:
        - OpenAI DALL-E
        - Midjourney
        - Stable Diffusion
        - etc.
        """
        # TODO: Implement real AI service integration
        # For now, raise an error indicating real mode is not implemented
        raise ImageGenerationError(
            "Real AI generation not implemented. Please set AI_MOCK_MODE=true for testing."
        )

    def _save_images(self, job: ImageGenerationJob, urls: List[str]) -> None:
        """Save generated image URLs to database.

        Args:
            job: The generation job
            urls: List of image URLs to save
        """
        for url in urls:
            # Extract filename from URL
            filename = url.split("/")[-1]

            # Create image record
            image = Image(
                workspace_id=job.workspace_id,
                generation_job_id=job.id,
                filename=filename,
                original_url=url,
                processed_url=url,  # Same for now
                format=filename.split(".")[-1] if "." in filename else "jpg"
            )

            self.db.add(image)

        self.db.commit()

    def _publish_progress(self, task_id: str, progress: int, message: str) -> None:
        """Publish progress update to Redis.

        Args:
            task_id: Celery task ID
            progress: Progress percentage (0-100)
            message: Status message
        """
        channel = f"task_updates:{task_id}"
        payload = {
            "status": "processing" if progress < 100 else "completed",
            "progress": progress,
            "message": message,
            "timestamp": datetime.now(timezone.utc).isoformat()
        }

        try:
            redis_client.publish(channel, json.dumps(payload))
        except Exception as e:
            logger.warning(f"Failed to publish progress to Redis: {e}")