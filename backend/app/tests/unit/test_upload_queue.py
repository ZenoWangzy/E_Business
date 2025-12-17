"""
Unit tests for upload queue service with retry mechanism.
"""

import pytest
import asyncio
from unittest.mock import AsyncMock, Mock
from uuid import uuid4
from datetime import datetime, timezone

from app.services.upload_queue import (
    UploadQueue,
    UploadTask,
    RetryConfig,
    RetryStatus,
    calculate_delay,
    get_upload_queue,
    reset_upload_queue,
)


class TestCalculateDelay:
    """Tests for exponential backoff delay calculation."""

    def test_first_retry_uses_base_delay(self):
        """First retry should use base delay."""
        config = RetryConfig(base_delay_seconds=1.0, jitter=False)
        delay = calculate_delay(0, config)
        assert delay == 1.0

    def test_delay_increases_exponentially(self):
        """Delay should increase with each retry."""
        config = RetryConfig(base_delay_seconds=1.0, exponential_base=2.0, jitter=False)
        
        delay_0 = calculate_delay(0, config)
        delay_1 = calculate_delay(1, config)
        delay_2 = calculate_delay(2, config)
        
        assert delay_0 == 1.0
        assert delay_1 == 2.0
        assert delay_2 == 4.0

    def test_delay_capped_at_max(self):
        """Delay should not exceed max_delay_seconds."""
        config = RetryConfig(
            base_delay_seconds=10.0,
            max_delay_seconds=30.0,
            exponential_base=2.0,
            jitter=False
        )
        
        delay = calculate_delay(10, config)  # Would be 10240 without cap
        assert delay == 30.0

    def test_jitter_adds_randomness(self):
        """Jitter should add variation to delay."""
        config = RetryConfig(base_delay_seconds=10.0, jitter=True)
        
        delays = [calculate_delay(1, config) for _ in range(10)]
        # With jitter, delays should not all be identical
        assert len(set(delays)) > 1


class TestUploadTask:
    """Tests for UploadTask dataclass."""

    def test_task_creation_with_defaults(self):
        """Task should be created with sensible defaults."""
        task = UploadTask(
            task_id="test-123",
            asset_id=uuid4(),
            workspace_id=uuid4(),
            filename="test.pdf",
        )
        
        assert task.retry_count == 0
        assert task.status == RetryStatus.PENDING
        assert task.last_error is None
        assert task.metadata == {}

    def test_task_metadata(self):
        """Task should store custom metadata."""
        metadata = {"custom_field": "value"}
        task = UploadTask(
            task_id="test-123",
            asset_id=uuid4(),
            workspace_id=uuid4(),
            filename="test.pdf",
            metadata=metadata,
        )
        
        assert task.metadata == metadata


class TestUploadQueue:
    """Tests for UploadQueue service."""

    @pytest.fixture
    def queue(self):
        """Create a fresh queue for each test."""
        reset_upload_queue()
        return UploadQueue(RetryConfig(max_retries=3, base_delay_seconds=0.01))

    @pytest.mark.asyncio
    async def test_add_task(self, queue):
        """Should add task to queue."""
        asset_id = uuid4()
        workspace_id = uuid4()
        callback = AsyncMock()
        
        task = await queue.add_task(
            asset_id=asset_id,
            workspace_id=workspace_id,
            filename="test.pdf",
            upload_callback=callback,
        )
        
        assert task.asset_id == asset_id
        assert task.workspace_id == workspace_id
        assert task.status == RetryStatus.PENDING
        assert len(queue._queue) == 1

    @pytest.mark.asyncio
    async def test_retry_task_success(self, queue):
        """Should mark task as succeeded on successful retry."""
        callback = AsyncMock()
        
        task = await queue.add_task(
            asset_id=uuid4(),
            workspace_id=uuid4(),
            filename="test.pdf",
            upload_callback=callback,
        )
        
        result = await queue.retry_task(task.task_id)
        
        assert result is True
        callback.assert_called_once()
        assert task.task_id not in queue._queue

    @pytest.mark.asyncio
    async def test_retry_task_failure_increments_count(self, queue):
        """Should increment retry count on failure."""
        callback = AsyncMock(side_effect=Exception("Upload failed"))
        
        task = await queue.add_task(
            asset_id=uuid4(),
            workspace_id=uuid4(),
            filename="test.pdf",
            upload_callback=callback,
        )
        
        # Directly call retry and wait for it
        result = await queue.retry_task(task.task_id)
        
        # Should fail due to exception
        assert result is False
        
        # Task should still exist with error recorded
        retrieved_task = queue.get_task(task.task_id)
        assert retrieved_task is not None
        assert retrieved_task.retry_count >= 1
        assert "Upload failed" in (retrieved_task.last_error or "")

    @pytest.mark.asyncio
    async def test_task_moves_to_dead_letter_after_max_retries(self, queue):
        """Should move to dead letter after max retries exceeded."""
        queue.config.max_retries = 1
        callback = AsyncMock(side_effect=Exception("Permanent failure"))
        
        task = await queue.add_task(
            asset_id=uuid4(),
            workspace_id=uuid4(),
            filename="test.pdf",
            upload_callback=callback,
        )
        
        # First retry
        await queue.retry_task(task.task_id)
        await asyncio.sleep(0.05)
        
        # Second attempt should trigger dead letter
        await queue.retry_task(task.task_id)
        
        assert task.task_id not in queue._queue
        assert task.task_id in queue._dead_letter

    @pytest.mark.asyncio
    async def test_get_queue_stats(self, queue):
        """Should return accurate queue statistics."""
        callback = AsyncMock()
        
        await queue.add_task(uuid4(), uuid4(), "file1.pdf", callback)
        await queue.add_task(uuid4(), uuid4(), "file2.pdf", callback)
        
        stats = queue.get_queue_stats()
        
        assert stats["total_queued"] == 2
        assert stats["dead_letter"] == 0

    @pytest.mark.asyncio
    async def test_get_pending_tasks(self, queue):
        """Should return only pending tasks."""
        callback = AsyncMock()
        
        await queue.add_task(uuid4(), uuid4(), "file1.pdf", callback)
        await queue.add_task(uuid4(), uuid4(), "file2.pdf", callback)
        
        pending = queue.get_pending_tasks()
        
        assert len(pending) == 2
        assert all(t.status == RetryStatus.PENDING for t in pending)

    @pytest.mark.asyncio
    async def test_clear_dead_letter(self, queue):
        """Should clear dead letter queue."""
        queue.config.max_retries = 0
        callback = AsyncMock(side_effect=Exception("Fail"))
        
        task = await queue.add_task(uuid4(), uuid4(), "test.pdf", callback)
        await queue.retry_task(task.task_id)
        
        assert len(queue._dead_letter) == 1
        
        count = await queue.clear_dead_letter()
        
        assert count == 1
        assert len(queue._dead_letter) == 0


class TestGlobalQueue:
    """Tests for global queue singleton."""

    def test_get_upload_queue_returns_same_instance(self):
        """Should return the same queue instance."""
        reset_upload_queue()
        queue1 = get_upload_queue()
        queue2 = get_upload_queue()
        
        assert queue1 is queue2

    def test_reset_upload_queue_clears_instance(self):
        """Should create new instance after reset."""
        queue1 = get_upload_queue()
        reset_upload_queue()
        queue2 = get_upload_queue()
        
        assert queue1 is not queue2
