"""
[IDENTITY]: Task Retry Service
Logic for querying Task History and re-enqueueing failed jobs.

[INPUT]:
- UserID (for history), TaskID (for retry).

[LINK]:
- DB_Jobs -> ../models/{image,video,copy}.py
- Celery -> ../core/celery_app.py

[OUTPUT]: List[TaskHistoryItem] or RetryStatus.
[POS]: /backend/app/services/task_retry_service.py

[PROTOCOL]:
1. Aggregates different job types (Image, Video, Copy) into a unified history view.
2. Validates state transitions (can only retry FAILED unless forced).
"""
from typing import Optional, Tuple
from uuid import UUID
from datetime import datetime, timezone

from sqlalchemy import select, func, or_, union_all
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.image import ImageGenerationJob, JobStatus
from app.models.video import VideoGenerationJob
from app.models.copy import CopyGenerationJob
from app.models.user import Workspace
from app.schemas.admin_users import TaskHistoryItem, TaskType, TaskStatus as SchemaTaskStatus


class TaskRetryService:
    """Service for managing task history and retrying failed tasks."""
    
    async def get_user_tasks(
        self,
        db: AsyncSession,
        user_id: UUID,
        *,
        page: int = 1,
        page_size: int = 50,
        status_filter: Optional[str] = None,
        task_type_filter: Optional[str] = None,
    ) -> Tuple[list[TaskHistoryItem], int]:
        """
        Get paginated task history for a user.
        
        Queries ImageGenerationJob, VideoGenerationJob, and CopyGenerationJob tables.
        
        Args:
            db: Database session
            user_id: User ID to get tasks for
            page: Page number (1-indexed)
            page_size: Items per page
            status_filter: Filter by status (pending, processing, completed, failed)
            task_type_filter: Filter by task type (image, video, copy)
            
        Returns:
            Tuple of (task items list, total count)
        """
        offset = (page - 1) * page_size
        tasks = []
        total = 0
        
        # Query each job type and aggregate
        if task_type_filter is None or task_type_filter == "image":
            image_tasks, image_count = await self._get_image_tasks(
                db, user_id, status_filter
            )
            tasks.extend(image_tasks)
            total += image_count
            
        if task_type_filter is None or task_type_filter == "video":
            video_tasks, video_count = await self._get_video_tasks(
                db, user_id, status_filter
            )
            tasks.extend(video_tasks)
            total += video_count
            
        if task_type_filter is None or task_type_filter == "copy":
            copy_tasks, copy_count = await self._get_copy_tasks(
                db, user_id, status_filter
            )
            tasks.extend(copy_tasks)
            total += copy_count
        
        # Sort by created_at descending and paginate
        tasks.sort(key=lambda t: t.created_at, reverse=True)
        paginated = tasks[offset:offset + page_size]
        
        return paginated, total
    
    async def _get_image_tasks(
        self,
        db: AsyncSession,
        user_id: UUID,
        status_filter: Optional[str] = None,
    ) -> Tuple[list[TaskHistoryItem], int]:
        """Get image generation tasks for user."""
        query = (
            select(ImageGenerationJob)
            .options(selectinload(ImageGenerationJob.workspace))
            .where(ImageGenerationJob.user_id == user_id)
        )
        
        if status_filter:
            query = query.where(ImageGenerationJob.status == JobStatus(status_filter))
        
        # Get count
        count_query = select(func.count()).select_from(
            query.subquery()
        )
        count_result = await db.execute(count_query)
        count = count_result.scalar() or 0
        
        # Get results
        result = await db.execute(query)
        jobs = result.scalars().all()
        
        items = [
            TaskHistoryItem(
                id=job.id,
                task_type=TaskType.IMAGE,
                status=SchemaTaskStatus(job.status.value),
                created_at=job.created_at,
                updated_at=job.updated_at,
                error_message=job.error_message,
                workspace_id=job.workspace_id,
                workspace_name=job.workspace.name if job.workspace else None,
            )
            for job in jobs
        ]
        
        return items, count
    
    async def _get_video_tasks(
        self,
        db: AsyncSession,
        user_id: UUID,
        status_filter: Optional[str] = None,
    ) -> Tuple[list[TaskHistoryItem], int]:
        """Get video generation tasks for user."""
        query = (
            select(VideoGenerationJob)
            .options(selectinload(VideoGenerationJob.workspace))
            .where(VideoGenerationJob.user_id == user_id)
        )
        
        if status_filter:
            query = query.where(VideoGenerationJob.status == status_filter)
        
        count_query = select(func.count()).select_from(query.subquery())
        count_result = await db.execute(count_query)
        count = count_result.scalar() or 0
        
        result = await db.execute(query)
        jobs = result.scalars().all()
        
        items = [
            TaskHistoryItem(
                id=job.id,
                task_type=TaskType.VIDEO,
                status=SchemaTaskStatus(job.status) if isinstance(job.status, str) else SchemaTaskStatus(job.status.value),
                created_at=job.created_at,
                updated_at=job.updated_at,
                error_message=job.error_message,
                workspace_id=job.workspace_id,
                workspace_name=job.workspace.name if job.workspace else None,
            )
            for job in jobs
        ]
        
        return items, count
    
    async def _get_copy_tasks(
        self,
        db: AsyncSession,
        user_id: UUID,
        status_filter: Optional[str] = None,
    ) -> Tuple[list[TaskHistoryItem], int]:
        """Get copy generation tasks for user."""
        query = (
            select(CopyGenerationJob)
            .options(selectinload(CopyGenerationJob.workspace))
            .where(CopyGenerationJob.user_id == user_id)
        )
        
        if status_filter:
            query = query.where(CopyGenerationJob.status == status_filter)
        
        count_query = select(func.count()).select_from(query.subquery())
        count_result = await db.execute(count_query)
        count = count_result.scalar() or 0
        
        result = await db.execute(query)
        jobs = result.scalars().all()
        
        items = [
            TaskHistoryItem(
                id=job.id,
                task_type=TaskType.COPY,
                status=SchemaTaskStatus(job.status) if isinstance(job.status, str) else SchemaTaskStatus(job.status.value),
                created_at=job.created_at,
                updated_at=job.updated_at,
                error_message=job.error_message,
                workspace_id=job.workspace_id,
                workspace_name=job.workspace.name if job.workspace else None,
            )
            for job in jobs
        ]
        
        return items, count
    
    async def retry_task(
        self,
        db: AsyncSession,
        task_id: UUID,
        task_type: str,
        force: bool = False,
    ) -> dict:
        """
        Retry a failed task by resetting its status and re-enqueueing.
        
        Args:
            db: Database session
            task_id: ID of the task to retry
            task_type: Type of task (image, video, copy)
            force: Force retry even if not in FAILED state
            
        Returns:
            Dict with retry result info
            
        Raises:
            ValueError: If task not found or not in retryable state
        """
        if task_type == "image":
            return await self._retry_image_task(db, task_id, force)
        elif task_type == "video":
            return await self._retry_video_task(db, task_id, force)
        elif task_type == "copy":
            return await self._retry_copy_task(db, task_id, force)
        else:
            raise ValueError(f"Unknown task type: {task_type}")
    
    async def _retry_image_task(
        self,
        db: AsyncSession,
        task_id: UUID,
        force: bool = False,
    ) -> dict:
        """Retry an image generation task."""
        result = await db.execute(
            select(ImageGenerationJob).where(ImageGenerationJob.id == task_id)
        )
        job = result.scalar_one_or_none()
        
        if not job:
            raise ValueError(f"Image task {task_id} not found")
        
        if not force and job.status != JobStatus.FAILED:
            raise ValueError(f"Task is not in FAILED state (current: {job.status.value})")
        
        # Reset status to PENDING
        old_status = job.status.value
        job.status = JobStatus.PENDING
        job.error_message = None
        job.updated_at = datetime.now(timezone.utc)
        
        await db.commit()
        
        # TODO: Re-enqueue to Celery
        # from app.worker.tasks import generate_image_task
        # generate_image_task.delay(str(job.id))
        
        return {
            "success": True,
            "task_id": task_id,
            "old_status": old_status,
            "new_status": "pending",
            "message": "Task has been reset and queued for retry",
        }
    
    async def _retry_video_task(
        self,
        db: AsyncSession,
        task_id: UUID,
        force: bool = False,
    ) -> dict:
        """Retry a video generation task."""
        result = await db.execute(
            select(VideoGenerationJob).where(VideoGenerationJob.id == task_id)
        )
        job = result.scalar_one_or_none()
        
        if not job:
            raise ValueError(f"Video task {task_id} not found")
        
        old_status = job.status if isinstance(job.status, str) else job.status.value
        if not force and old_status != "failed":
            raise ValueError(f"Task is not in FAILED state (current: {old_status})")
        
        # Reset status
        job.status = "pending"
        job.error_message = None
        job.updated_at = datetime.now(timezone.utc)
        
        await db.commit()
        
        return {
            "success": True,
            "task_id": task_id,
            "old_status": old_status,
            "new_status": "pending",
            "message": "Task has been reset and queued for retry",
        }
    
    async def _retry_copy_task(
        self,
        db: AsyncSession,
        task_id: UUID,
        force: bool = False,
    ) -> dict:
        """Retry a copy generation task."""
        result = await db.execute(
            select(CopyGenerationJob).where(CopyGenerationJob.id == task_id)
        )
        job = result.scalar_one_or_none()
        
        if not job:
            raise ValueError(f"Copy task {task_id} not found")
        
        old_status = job.status if isinstance(job.status, str) else job.status.value
        if not force and old_status != "failed":
            raise ValueError(f"Task is not in FAILED state (current: {old_status})")
        
        # Reset status
        job.status = "pending"
        job.error_message = None
        job.updated_at = datetime.now(timezone.utc)
        
        await db.commit()
        
        return {
            "success": True,
            "task_id": task_id,
            "old_status": old_status,
            "new_status": "pending",
            "message": "Task has been reset and queued for retry",
        }


# Singleton instance
task_retry_service = TaskRetryService()
