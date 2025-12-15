"""
Upload Queue Service with Retry Mechanism (AC: 17-22)

Provides:
- Queue for failed uploads with exponential backoff retry
- Dead letter handling for permanently failed uploads
- Status tracking and error logging
"""

import asyncio
import logging
from dataclasses import dataclass, field
from datetime import datetime, timezone
from enum import Enum
from typing import Callable, Optional, Dict, Any
from uuid import UUID
import random

logger = logging.getLogger(__name__)


class RetryStatus(str, Enum):
    """Status of a retry attempt."""
    PENDING = "pending"
    RETRYING = "retrying"
    SUCCEEDED = "succeeded"
    FAILED = "failed"
    DEAD_LETTER = "dead_letter"


@dataclass
class RetryConfig:
    """Configuration for retry behavior."""
    max_retries: int = 3
    base_delay_seconds: float = 1.0
    max_delay_seconds: float = 60.0
    exponential_base: float = 2.0
    jitter: bool = True


@dataclass
class UploadTask:
    """A single upload task in the queue."""
    task_id: str
    asset_id: UUID
    workspace_id: UUID
    filename: str
    retry_count: int = 0
    status: RetryStatus = RetryStatus.PENDING
    last_error: Optional[str] = None
    created_at: datetime = field(default_factory=lambda: datetime.now(timezone.utc))
    last_attempted_at: Optional[datetime] = None
    metadata: Dict[str, Any] = field(default_factory=dict)


def calculate_delay(
    retry_count: int,
    config: RetryConfig,
) -> float:
    """
    Calculate delay with exponential backoff and optional jitter.
    
    Args:
        retry_count: Current retry attempt number
        config: Retry configuration
    
    Returns:
        Delay in seconds
    """
    delay = min(
        config.base_delay_seconds * (config.exponential_base ** retry_count),
        config.max_delay_seconds
    )
    
    if config.jitter:
        # Add up to 25% random jitter
        jitter_range = delay * 0.25
        delay += random.uniform(-jitter_range, jitter_range)
    
    return max(0, delay)


class UploadQueue:
    """
    In-memory upload queue with retry mechanism.
    
    For production, consider using Celery or Redis Queue.
    """
    
    def __init__(self, config: Optional[RetryConfig] = None):
        self.config = config or RetryConfig()
        self._queue: Dict[str, UploadTask] = {}
        self._dead_letter: Dict[str, UploadTask] = {}
        self._callbacks: Dict[str, Callable] = {}
        self._lock = asyncio.Lock()
        self._running = False
    
    async def add_task(
        self,
        asset_id: UUID,
        workspace_id: UUID,
        filename: str,
        upload_callback: Callable,
        metadata: Optional[Dict[str, Any]] = None,
    ) -> UploadTask:
        """
        Add a new upload task to the queue.
        
        Args:
            asset_id: UUID of the asset
            workspace_id: UUID of the workspace
            filename: Original filename
            upload_callback: Async function to call for upload
            metadata: Optional metadata
        
        Returns:
            Created UploadTask
        """
        task_id = f"{asset_id}-{datetime.now().timestamp()}"
        
        task = UploadTask(
            task_id=task_id,
            asset_id=asset_id,
            workspace_id=workspace_id,
            filename=filename,
            metadata=metadata or {},
        )
        
        async with self._lock:
            self._queue[task_id] = task
            self._callbacks[task_id] = upload_callback
        
        logger.info(f"Added upload task {task_id} to queue")
        return task
    
    async def retry_task(self, task_id: str) -> bool:
        """
        Retry a failed task.
        
        Args:
            task_id: ID of the task to retry
        
        Returns:
            True if retry was initiated
        """
        async with self._lock:
            task = self._queue.get(task_id)
            if not task:
                return False
            
            if task.retry_count >= self.config.max_retries:
                await self._move_to_dead_letter(task)
                return False
            
            task.status = RetryStatus.RETRYING
            task.retry_count += 1
            task.last_attempted_at = datetime.now(timezone.utc)
        
        # Calculate delay with exponential backoff
        delay = calculate_delay(task.retry_count, self.config)
        logger.info(f"Retrying task {task_id} in {delay:.2f}s (attempt {task.retry_count})")
        
        await asyncio.sleep(delay)
        
        try:
            callback = self._callbacks.get(task_id)
            if callback:
                await callback()
                
            async with self._lock:
                task.status = RetryStatus.SUCCEEDED
                del self._queue[task_id]
                del self._callbacks[task_id]
            
            logger.info(f"Task {task_id} succeeded on retry {task.retry_count}")
            return True
            
        except Exception as e:
            async with self._lock:
                task.status = RetryStatus.FAILED
                task.last_error = str(e)
            
            logger.warning(f"Task {task_id} failed: {e}")
            
            # Auto-retry if under limit
            if task.retry_count < self.config.max_retries:
                asyncio.create_task(self.retry_task(task_id))
            else:
                await self._move_to_dead_letter(task)
            
            return False
    
    async def _move_to_dead_letter(self, task: UploadTask) -> None:
        """Move task to dead letter queue after max retries exceeded."""
        async with self._lock:
            task.status = RetryStatus.DEAD_LETTER
            self._dead_letter[task.task_id] = task
            
            if task.task_id in self._queue:
                del self._queue[task.task_id]
            if task.task_id in self._callbacks:
                del self._callbacks[task.task_id]
        
        logger.error(
            f"Task {task.task_id} moved to dead letter queue after "
            f"{task.retry_count} retries. Last error: {task.last_error}"
        )
    
    def get_task(self, task_id: str) -> Optional[UploadTask]:
        """Get a task by ID."""
        return self._queue.get(task_id) or self._dead_letter.get(task_id)
    
    def get_pending_tasks(self) -> list[UploadTask]:
        """Get all pending tasks."""
        return [t for t in self._queue.values() if t.status == RetryStatus.PENDING]
    
    def get_dead_letter_tasks(self) -> list[UploadTask]:
        """Get all dead letter tasks."""
        return list(self._dead_letter.values())
    
    def get_queue_stats(self) -> Dict[str, int]:
        """Get queue statistics."""
        status_counts = {}
        for task in self._queue.values():
            status_counts[task.status.value] = status_counts.get(task.status.value, 0) + 1
        
        return {
            "total_queued": len(self._queue),
            "dead_letter": len(self._dead_letter),
            **status_counts,
        }
    
    async def clear_dead_letter(self) -> int:
        """Clear all dead letter tasks. Returns count cleared."""
        async with self._lock:
            count = len(self._dead_letter)
            self._dead_letter.clear()
            return count


# Global queue instance
_upload_queue: Optional[UploadQueue] = None


def get_upload_queue() -> UploadQueue:
    """Get or create the global upload queue."""
    global _upload_queue
    if _upload_queue is None:
        _upload_queue = UploadQueue()
    return _upload_queue


def reset_upload_queue() -> None:
    """Reset the global upload queue (for testing)."""
    global _upload_queue
    _upload_queue = None
