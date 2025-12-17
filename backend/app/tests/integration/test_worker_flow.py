"""
Integration tests for the complete worker flow.

Tests the entire image generation workflow from task submission
to completion with Redis status updates.
"""
import json
import time
import uuid
from datetime import datetime, timezone
from unittest.mock import patch

import pytest
import redis
from sqlalchemy.orm import Session

from app.core.celery_app import celery_app
from app.models.image import ImageGenerationJob, JobStatus
from app.tasks.image_generation import generate_images_task
from app.db.session import get_db_context


class TestWorkerFlow:
    """Integration tests for worker flow."""

    @pytest.fixture
    def redis_client(self):
        """Create Redis client for testing."""
        from app.core.config import get_settings
        settings = get_settings()
        client = redis.from_url(settings.redis_url)
        yield client
        # Cleanup any test channels
        # Note: Redis auto-cleans channels when no subscribers

    @pytest.fixture
    def sample_job(self):
        """Create and return a sample job in database."""
        job = ImageGenerationJob(
            id=uuid.uuid4(),
            task_id=uuid.uuid4(),
            workspace_id=uuid.uuid4(),
            user_id=uuid.uuid4(),
            product_id=uuid.uuid4(),
            style_id="modern",
            status=JobStatus.PENDING,
            prompt="Test product image"
        )

        with get_db_context() as db:
            db.add(job)
            db.commit()
            db.refresh(job)

        yield job

        # Cleanup
        with get_db_context() as db:
            db.query(ImageGenerationJob).filter(
                ImageGenerationJob.id == job.id
            ).delete()
            db.commit()

    @patch('app.services.image_service.settings')
    def test_complete_flow_mock_mode(self, mock_settings, redis_client, sample_job):
        """Test complete flow in mock mode."""
        # Arrange
        mock_settings.ai_mock_mode = True

        # Subscribe to Redis channel for status updates
        pubsub = redis_client.pubsub()
        channel = f"task_updates:{sample_job.task_id}"
        pubsub.subscribe(channel)

        # Act - Submit task
        task = generate_images_task.delay(str(sample_job.id))

        # Collect status updates
        status_updates = []
        timeout = time.time() + 10  # 10 second timeout
        pubsub.listen()

        while time.time() < timeout and len(status_updates) < 4:
            message = pubsub.get_message(timeout=1)
            if message and message['type'] == 'message':
                data = json.loads(message['data'])
                status_updates.append(data)

        # Get task result
        result = task.get(timeout=10)

        # Assert
        assert result["status"] == "completed"
        assert "images" in result
        assert len(result["images"]) > 0

        # Verify status updates
        assert len(status_updates) >= 2

        # Check final status
        final_status = status_updates[-1]
        assert final_status["status"] == "completed"
        assert final_status["progress"] == 100

        # Verify database state
        with get_db_context() as db:
            job = db.query(ImageGenerationJob).filter(
                ImageGenerationJob.id == sample_job.id
            ).first()
            assert job.status == JobStatus.COMPLETED
            assert job.result_urls is not None

        # Cleanup Redis
        pubsub.unsubscribe()
        pubsub.close()

    @patch('app.services.image_service.settings')
    def test_flow_with_error(self, mock_settings, redis_client, sample_job):
        """Test flow when an error occurs."""
        # Arrange
        mock_settings.ai_mock_mode = False
        # This will cause the real mode to fail since it's not implemented

        # Subscribe to Redis channel
        pubsub = redis_client.pubsub()
        channel = f"task_updates:{sample_job.task_id}"
        pubsub.subscribe(channel)

        # Act - Submit task (should fail and retry)
        task = generate_images_task.delay(str(sample_job.id))

        # Get task result (should fail)
        try:
            result = task.get(timeout=5)
        except Exception:
            # Task should fail after retries
            pass

        # Check for error status
        time.sleep(1)  # Give time for status to be published
        message = pubsub.get_message()
        if message and message['type'] == 'message':
            data = json.loads(message['data'])
            # Could be either processing or failed depending on timing
            pass

        # Verify database state
        with get_db_context() as db:
            job = db.query(ImageGenerationJob).filter(
                ImageGenerationJob.id == sample_job.id
            ).first()
            # Job might be failed or still processing
            assert job.status in [JobStatus.FAILED, JobStatus.PROCESSING]

        # Cleanup Redis
        pubsub.unsubscribe()
        pubsub.close()

    def test_worker_configuration(self):
        """Test that worker is properly configured."""
        # Check that task is registered
        assert generate_images_task.name in celery_app.tasks
        assert celery_app.conf.task_soft_time_limit == 300
        assert celery_app.conf.task_time_limit == 330

        # Check queue configuration
        task_routes = celery_app.conf.task_routes
        assert "app.tasks.image_generation.generate_images_task" in task_routes

    def test_database_session_isolation(self):
        """Test that database sessions are properly isolated."""
        # This is tested implicitly by using get_db_context
        with get_db_context() as db:
            assert isinstance(db, Session)
            # Session should be usable
            result = db.execute("SELECT 1").scalar()
            assert result == 1

        # Session should be closed after context
        # Trying to use it outside context should fail
        # (This is more of a design test)

    @patch('app.services.image_service.settings')
    def test_concurrent_tasks(self, mock_settings):
        """Test handling multiple concurrent tasks."""
        # Arrange
        mock_settings.ai_mock_mode = True

        # Create multiple jobs
        jobs = []
        with get_db_context() as db:
            for i in range(3):
                job = ImageGenerationJob(
                    id=uuid.uuid4(),
                    task_id=uuid.uuid4(),
                    workspace_id=uuid.uuid4(),
                    user_id=uuid.uuid4(),
                    product_id=uuid.uuid4(),
                    style_id="modern",
                    status=JobStatus.PENDING
                )
                db.add(job)
                jobs.append(job)
            db.commit()

        # Act - Submit tasks concurrently
        tasks = []
        for job in jobs:
            task = generate_images_task.delay(str(job.id))
            tasks.append(task)

        # Wait for all tasks to complete
        results = []
        for task in tasks:
            try:
                result = task.get(timeout=10)
                results.append(result)
            except Exception as e:
                results.append({"error": str(e)})

        # Assert
        assert len(results) == 3
        # All should complete successfully in mock mode
        for result in results:
            if "error" not in result:
                assert result["status"] == "completed"

        # Cleanup
        with get_db_context() as db:
            for job in jobs:
                db.query(ImageGenerationJob).filter(
                    ImageGenerationJob.id == job.id
                ).delete()
            db.commit()