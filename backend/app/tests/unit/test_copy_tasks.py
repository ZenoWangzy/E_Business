"""
Unit tests for Copy Generation Celery Tasks.
"""

import pytest
import uuid
from unittest.mock import AsyncMock, MagicMock, patch
from datetime import datetime, timezone

from celery.exceptions import Retry

from app.tasks.copy_tasks import (
    generate_copy_task,
    save_copy_result_task,
    cleanup_old_copy_jobs_task,
    get_job_async,
    update_job_status_async
)
from app.models.copy import (
    CopyGenerationJob,
    CopyType,
    Tone,
    Audience,
    Length,
    JobStatus
)


class TestCopyTasks:
    """Test cases for copy generation Celery tasks."""

    @pytest.fixture
    def sample_job_id(self):
        """Create a sample job ID."""
        return str(uuid.uuid4())

    @pytest.fixture
    def sample_user_id(self):
        """Create a sample user ID."""
        return str(uuid.uuid4())

    @pytest.fixture
    def sample_workspace_id(self):
        """Create a sample workspace ID."""
        return str(uuid.uuid4())

    @pytest.fixture
    def sample_request_data(self):
        """Create sample request data."""
        return {
            "type": "titles",
            "config": {
                "tone": "professional",
                "audience": "b2b",
                "length": "medium"
            },
            "context": {
                "category": "electronics"
            }
        }

    @pytest.mark.asyncio
    async def test_get_job_async_success(self):
        """Test successful async job retrieval."""
        # Arrange
        job_id = uuid.uuid4()
        mock_job = MagicMock(spec=CopyGenerationJob)
        mock_job.id = job_id

        with patch('app.tasks.copy_tasks.get_async_session') as mock_get_session:
            mock_session = AsyncMock()
            mock_session.get.return_value = mock_job
            mock_get_session.return_value.__aenter__.return_value = mock_session

            # Act
            result = await get_job_async(str(job_id))

            # Assert
            assert result == mock_job
            mock_session.get.assert_called_once_with(CopyGenerationJob, str(job_id))

    @pytest.mark.asyncio
    async def test_update_job_status_async_processing(self):
        """Test updating job status to processing."""
        # Arrange
        job_id = uuid.uuid4()
        mock_job = MagicMock(spec=CopyGenerationJob)
        mock_job.started_at = None

        with patch('app.tasks.copy_tasks.get_async_session') as mock_get_session:
            mock_session = AsyncMock()
            mock_session.get.return_value = mock_job
            mock_get_session.return_value.__aenter__.return_value = mock_session

            # Act
            await update_job_status_async(
                str(job_id),
                JobStatus.PROCESSING
            )

            # Assert
            assert mock_job.status == JobStatus.PROCESSING
            assert mock_job.started_at is not None
            mock_session.commit.assert_called_once()

    @pytest.mark.asyncio
    async def test_update_job_status_async_completed(self):
        """Test updating job status to completed."""
        # Arrange
        job_id = uuid.uuid4()
        mock_job = MagicMock(spec=CopyGenerationJob)

        with patch('app.tasks.copy_tasks.get_async_session') as mock_get_session:
            mock_session = AsyncMock()
            mock_session.get.return_value = mock_job
            mock_get_session.return_value.__aenter__.return_value = mock_session

            # Act
            await update_job_status_async(
                str(job_id),
                JobStatus.COMPLETED,
                progress=100
            )

            # Assert
            assert mock_job.status == JobStatus.COMPLETED
            assert mock_job.progress == 100
            assert mock_job.completed_at is not None
            mock_session.commit.assert_called_once()

    @patch('app.tasks.copy_tasks.get_async_session')
    @patch('app.tasks.copy_tasks.update_job_status_async')
    def test_generate_copy_task_success(
        self,
        mock_update_status,
        mock_get_session,
        sample_job_id,
        sample_user_id,
        sample_workspace_id,
        sample_request_data
    ):
        """Test successful copy generation task execution."""
        # Arrange
        mock_service = AsyncMock()
        mock_service.process_generation.return_value = {
            "status": "completed",
            "results": ["Title 1", "Title 2"],
            "job_id": sample_job_id,
            "copy_type": "titles"
        }

        mock_session = AsyncMock()
        mock_session.__aenter__.return_value = mock_session
        mock_get_session.return_value = mock_session

        with patch('app.tasks.copy_tasks.CopyGenerationService', return_value=mock_service):
            # Act
            result = generate_copy_task(
                sample_job_id,
                sample_user_id,
                sample_workspace_id,
                sample_request_data
            )

            # Assert
            mock_update_status.assert_called_once_with(sample_job_id, JobStatus.PROCESSING)
            mock_service.process_generation.assert_called_once_with(sample_job_id, sample_request_data)
            assert result["status"] == "completed"
            assert len(result["results"]) == 2

    @patch('app.tasks.copy_tasks.update_job_status_async')
    @patch('app.tasks.copy_tasks.get_async_session')
    def test_generate_copy_task_failure_with_retry(
        self,
        mock_get_session,
        mock_update_status,
        sample_job_id,
        sample_user_id,
        sample_workspace_id,
        sample_request_data
    ):
        """Test copy generation task failure with retry."""
        # Arrange
        mock_service = AsyncMock()
        mock_service.process_generation.side_effect = Exception("API Error")

        mock_session = AsyncMock()
        mock_session.__aenter__.return_value = mock_session
        mock_get_session.return_value = mock_session

        task = generate_copy_task
        task.request = MagicMock()
        task.request.retries = 0
        task.request.id = str(uuid.uuid4())
        task.max_retries = 3
        task.retry = MagicMock(side_effect=Retry("Retrying..."))

        with patch('app.tasks.copy_tasks.CopyGenerationService', return_value=mock_service):
            # Act & Assert
            with pytest.raises(Retry):
                task(
                    sample_job_id,
                    sample_user_id,
                    sample_workspace_id,
                    sample_request_data
                )

            # Verify error handling
            mock_update_status.assert_called_once_with(
                sample_job_id,
                JobStatus.FAILED,
                error_message="Copy generation failed: API Error"
            )
            task.retry.assert_called_once()

    @patch('app.tasks.copy_tasks.get_async_session')
    def test_save_copy_result_task_success(
        self,
        mock_get_session,
        sample_job_id,
        sample_workspace_id
    ):
        """Test successful copy result saving task."""
        # Arrange
        content = "Premium Quality Product"
        copy_type = "titles"
        tone = "professional"
        audience = "b2b"
        length = "medium"
        product_id = str(uuid.uuid4())

        mock_service = AsyncMock()
        mock_result = MagicMock()
        mock_result.id = uuid.uuid4()
        mock_service.save_copy_result.return_value = mock_result

        mock_session = AsyncMock()
        mock_session.__aenter__.return_value = mock_session
        mock_get_session.return_value = mock_session

        task = save_copy_result_task
        task.request = MagicMock()
        task.request.id = str(uuid.uuid4())

        with patch('app.tasks.copy_tasks.CopyGenerationService', return_value=mock_service):
            # Act
            result = task(
                sample_job_id,
                content,
                copy_type,
                tone,
                audience,
                length,
                sample_workspace_id,
                product_id
            )

            # Assert
            assert result == str(mock_result.id)
            mock_service.save_copy_result.assert_called_once_with(
                job_id=uuid.UUID(sample_job_id),
                content=content,
                copy_type=CopyType.TITLES,
                tone=Tone.PROFESSIONAL,
                audience=Audience.B2B,
                length=Length.MEDIUM,
                workspace_id=uuid.UUID(sample_workspace_id),
                product_id=uuid.UUID(product_id)
            )

    @patch('app.tasks.copy_tasks.get_async_session')
    def test_cleanup_old_copy_jobs_task_success(
        self,
        mock_get_session
    ):
        """Test successful cleanup of old copy jobs."""
        # Arrange
        days_old = 30
        cutoff_date = datetime.now(timezone.utc)

        old_job_ids = [uuid.uuid4(), uuid.uuid4(), uuid.uuid4()]

        # Mock database queries
        mock_session = AsyncMock()
        mock_session.__aenter__.return_value = mock_session

        # Mock select query for old jobs
        with patch('app.tasks.copy_tasks.select') as mock_select, \
             patch('app.tasks.copy_tasks.delete') as mock_delete, \
             patch('app.tasks.copy_tasks.timedelta') as mock_timedelta:

            mock_timedelta.return_value = cutoff_date - cutoff_date  # Mock timedelata

            mock_query = AsyncMock()
            mock_query.where.return_value = mock_query
            mock_select.return_value = mock_query

            # Mock scalars().all() to return old job IDs
            mock_scalars = AsyncMock()
            mock_scalars.all.return_value = old_job_ids
            mock_query.scalars.return_value = mock_scalars

            # Mock delete queries
            mock_delete_query = AsyncMock()
            mock_delete.return_value = mock_delete_query
            mock_session.execute.return_value = mock_delete_query

            task = cleanup_old_copy_jobs_task
            task.request = MagicMock()
            task.request.id = str(uuid.uuid4())

            # Act
            result = task(days_old)

            # Assert
            assert result == 3  # Number of cleaned jobs
            assert mock_session.execute.call_count == 2  # Two delete operations
            mock_session.commit.assert_called_once()

    @patch('app.tasks.copy_tasks.get_async_session')
    def test_cleanup_old_copy_jobs_task_no_jobs(
        self,
        mock_get_session
    ):
        """Test cleanup task when no old jobs exist."""
        # Arrange
        days_old = 30

        # Mock database queries
        mock_session = AsyncMock()
        mock_session.__aenter__.return_value = mock_session

        with patch('app.tasks.copy_tasks.select') as mock_select, \
             patch('app.tasks.copy_tasks.delete'):

            mock_query = AsyncMock()
            mock_query.where.return_value = mock_query
            mock_select.return_value = mock_query

            # Mock empty result
            mock_scalars = AsyncMock()
            mock_scalars.all.return_value = []
            mock_query.scalars.return_value = mock_scalars

            task = cleanup_old_copy_jobs_task
            task.request = MagicMock()
            task.request.id = str(uuid.uuid4())

            # Act
            result = task(days_old)

            # Assert
            assert result == 0  # No jobs cleaned
            mock_session.commit.assert_not_called()  # No commits needed