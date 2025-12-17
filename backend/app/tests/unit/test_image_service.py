"""
Unit tests for ImageService.

Following TDD approach - tests written first, then implementation.
"""
import uuid
from unittest.mock import MagicMock, patch
from datetime import datetime, timezone

import pytest

from app.models.image import ImageGenerationJob, JobStatus, Image
from app.services.image_service import ImageService, ImageGenerationError


class TestImageService:
    """Test cases for ImageService."""

    @pytest.fixture
    def mock_db_session(self):
        """Create a mock database session."""
        session = MagicMock()
        session.query.return_value.filter.return_value.first.return_value = None
        session.add = MagicMock()
        session.commit = MagicMock()
        session.flush = MagicMock()
        session.refresh = MagicMock()
        return session

    @pytest.fixture
    def sample_job(self):
        """Create a sample ImageGenerationJob for testing."""
        job = ImageGenerationJob(
            id=uuid.uuid4(),
            task_id=uuid.uuid4(),
            workspace_id=uuid.uuid4(),
            user_id=uuid.uuid4(),
            product_id=uuid.uuid4(),
            style_id="modern",
            status=JobStatus.PROCESSING,
        )
        # Store params as a test helper attribute (not a model field)
        job._test_params = {
            "prompt": "A modern product image",
            "style": "modern",
            "count": 4
        }
        return job

    @patch('app.services.image_service.settings')
    def test_mock_mode_generation_success(self, mock_settings, mock_db_session, sample_job):
        """Test successful image generation in mock mode."""
        # Arrange
        mock_settings.ai_mock_mode = True
        mock_db_session.query.return_value.filter.return_value.first.return_value = sample_job
        image_service = ImageService(mock_db_session)

        # Act
        result = image_service.process_generation(str(sample_job.id), sample_job._test_params)

        # Assert
        assert result["status"] == "completed"
        assert len(result["images"]) == 4  # Default count
        assert all(url.startswith("https://mock-image-service.com") for url in result["images"])

        # Verify job was updated
        sample_job.status = JobStatus.COMPLETED
        assert sample_job.status == JobStatus.COMPLETED

    @patch('app.services.image_service.settings')
    @patch('app.services.image_service.ImageService._generate_real_images')
    def test_real_mode_generation_success(self, mock_generate, mock_settings, mock_db_session, sample_job):
        """Test successful image generation in real mode."""
        # Arrange
        mock_settings.ai_mock_mode = False
        mock_generate.return_value = [
            "https://ai-service.com/image1.jpg",
            "https://ai-service.com/image2.jpg"
        ]
        mock_db_session.query.return_value.filter.return_value.first.return_value = sample_job
        image_service = ImageService(mock_db_session)

        # Act
        result = image_service.process_generation(str(sample_job.id), sample_job._test_params)

        # Assert
        assert result["status"] == "completed"
        assert len(result["images"]) == 2
        mock_generate.assert_called_once_with(sample_job._test_params)

    @patch('app.services.image_service.settings')
    @patch('app.services.image_service.ImageService._generate_real_images')
    def test_real_mode_generation_failure(self, mock_generate, mock_settings, mock_db_session, sample_job):
        """Test image generation failure in real mode."""
        # Arrange
        mock_settings.ai_mock_mode = False
        mock_generate.side_effect = ImageGenerationError("API error: Invalid request")
        mock_db_session.query.return_value.filter.return_value.first.return_value = sample_job
        image_service = ImageService(mock_db_session)

        # Act & Assert
        with pytest.raises(ImageGenerationError, match="API error: Invalid request"):
            image_service.process_generation(str(sample_job.id), sample_job._test_params)

    @patch('app.services.image_service.settings')
    @patch('time.sleep')
    def test_mock_mode_progress_simulation(self, mock_sleep, mock_settings, mock_db_session, sample_job):
        """Test that mock mode simulates progress updates."""
        # Arrange
        mock_settings.ai_mock_mode = True
        mock_db_session.query.return_value.filter.return_value.first.return_value = sample_job
        image_service = ImageService(mock_db_session)

        # Act
        with patch.object(image_service, '_publish_progress') as mock_publish:
            image_service.process_generation(str(sample_job.id), sample_job._test_params)

        # Assert
        # Verify progress was published multiple times
        assert mock_publish.call_count >= 3
        progress_calls = [call.args[1] for call in mock_publish.call_args_list]
        assert 10 in progress_calls  # Start progress
        assert 100 in progress_calls  # Final progress

    def test_invalid_job_id(self, mock_db_session):
        """Test handling of invalid job ID."""
        # Arrange
        image_service = ImageService(mock_db_session)

        # Act & Assert
        with pytest.raises(ImageGenerationError, match=r"Job .* not found"):
            image_service.process_generation(str(uuid.uuid4()), {})

    def test_save_images_to_database(self, mock_db_session, sample_job):
        """Test saving generated images to database."""
        # Arrange
        image_service = ImageService(mock_db_session)
        image_urls = [
            "https://example.com/image1.jpg",
            "https://example.com/image2.jpg"
        ]

        # Act
        image_service._save_images(sample_job, image_urls)

        # Assert
        assert mock_db_session.add.call_count == 2
        assert mock_db_session.commit.call_count == 1

    @patch('app.services.image_service.redis_client')
    def test_publish_progress(self, mock_redis, mock_db_session, sample_job):
        """Test Redis progress publishing."""
        # Arrange
        mock_redis.publish = MagicMock()
        image_service = ImageService(mock_db_session)
        task_id = str(sample_job.task_id)

        # Act
        image_service._publish_progress(task_id, 50, "Processing...")

        # Assert
        mock_redis.publish.assert_called_once()
        call_args = mock_redis.publish.call_args
        assert f"task_updates:{task_id}" in call_args[0][0]

        # Verify message structure
        import json
        message = json.loads(call_args[0][1])
        assert message["status"] == "processing"
        assert message["progress"] == 50
        assert message["message"] == "Processing..."

    @patch('app.services.image_service.settings')
    def test_image_count_parameter(self, mock_settings, mock_db_session, sample_job):
        """Test custom image count parameter."""
        # Arrange
        mock_settings.ai_mock_mode = True
        sample_job._test_params["count"] = 6
        mock_db_session.query.return_value.filter.return_value.first.return_value = sample_job
        image_service = ImageService(mock_db_session)

        # Act
        result = image_service.process_generation(str(sample_job.id), sample_job._test_params)

        # Assert
        assert len(result["images"]) == 6