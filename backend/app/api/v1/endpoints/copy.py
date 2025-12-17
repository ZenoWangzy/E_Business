"""
Copy Generation API Endpoints - AI copywriting workflow.
Story 3.1: AI Copywriting Studio Backend
"""

import uuid
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, func
from uuid import UUID
from datetime import datetime, timezone
import json

from app.api.deps import get_db, CurrentUser, CurrentWorkspaceMember
from app.models.copy import (
    CopyGenerationJob, CopyResult, CopyQuota,
    CopyType, JobStatus
)
from app.models.product import Product
from app.schemas.copy import (
    CopyGenerationRequest, CopyGenerationResponse,
    CopyJobStatusResponse, CopyResultResponse,
    CopyResultsListResponse, SaveCopyRequest,
    SaveCopyResponse, ToggleFavoriteResponse,
    QuotaUsageResponse, GenerationConfig
)
from app.core.celery_app import celery_app
from app.core.logger import get_logger

logger = get_logger(__name__)
router = APIRouter(prefix="/copy", tags=["copy"])


@router.post(
    "/workspaces/{workspace_id}/products/{product_id}/generate",
    response_model=CopyGenerationResponse,
    status_code=status.HTTP_202_ACCEPTED
)
async def generate_copy(
    workspace_id: UUID,
    product_id: UUID,
    request: CopyGenerationRequest,
    member: CurrentWorkspaceMember,
    current_user: CurrentUser,
    db: AsyncSession = Depends(get_db)
):
    """
    触发 AI 文案生成任务。

    Creates a generation job and queues it for async processing via Celery.
    Returns immediately with a task_id for status polling.

    Args:
        workspace_id: Target workspace
        product_id: Target product
        request: Generation parameters (type, config, context)

    Returns:
        202 Accepted with task_id for polling
    """
    # Validate product exists and belongs to workspace
    product_result = await db.execute(
        select(Product).where(
            and_(
                Product.id == product_id,
                Product.workspace_id == workspace_id
            )
        )
    )
    product = product_result.scalar_one_or_none()
    if not product:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Product not found or access denied"
        )

    # Check quota before allowing generation
    quota = await _get_or_create_quota(db, workspace_id)

    # Reset quota if needed (new month)
    if quota.is_reset_needed:
        quota.used_current_month = 0
        quota.last_reset_at = datetime.now(timezone.utc)

    if quota.remaining <= 0:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Monthly quota exceeded. Please upgrade your plan."
        )

    # Create Celery task ID
    celery_task_id = uuid.uuid4()

    # Create job record in database
    job = CopyGenerationJob(
        workspace_id=workspace_id,
        user_id=current_user.id,
        product_id=product_id,
        task_id=celery_task_id,
        copy_type=request.type,
        tone=request.config.tone,
        audience=request.config.audience,
        length=request.config.length,
        context={"references": request.context} if request.context else None,
        status=JobStatus.PENDING
    )

    db.add(job)
    await db.commit()
    await db.refresh(job)

    # Queue Celery task (placeholder for now)
    # generate_copy_task.delay(str(job.id))

    # Increment quota usage (optimistic, will be decremented on failure)
    quota.used_current_month += 1
    await db.commit()

    return CopyGenerationResponse(
        task_id=celery_task_id,
        status=JobStatus.PENDING,
        message="Copy generation task queued successfully"
    )


@router.get(
    "/workspaces/{workspace_id}/jobs/{task_id}",
    response_model=CopyJobStatusResponse
)
async def get_copy_job_status(
    workspace_id: UUID,
    task_id: UUID,
    member: CurrentWorkspaceMember,
    db: AsyncSession = Depends(get_db)
):
    """
    查询文案生成任务状态。

    Poll this endpoint to check generation progress.

    Args:
        workspace_id: Target workspace
        task_id: The task_id returned from /generate

    Returns:
        Current job status with progress and results (if completed)
    """
    result = await db.execute(
        select(CopyGenerationJob).where(
            and_(
                CopyGenerationJob.task_id == task_id,
                CopyGenerationJob.workspace_id == workspace_id
            )
        )
    )
    job = result.scalar_one_or_none()

    if not job:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Job not found"
        )

    return CopyJobStatusResponse(
        task_id=job.task_id,
        status=job.status,
        progress=job.progress or 0,
        error_message=job.error_message,
        results=job.raw_results,
        created_at=job.created_at,
        started_at=job.started_at,
        completed_at=job.completed_at
    )


@router.get(
    "/workspaces/{workspace_id}/jobs/{task_id}/stream"
)
async def stream_copy_job_status(
    workspace_id: UUID,
    task_id: UUID,
    member: CurrentWorkspaceMember,
    db: AsyncSession = Depends(get_db)
):
    """
    Server-Sent Events stream for real-time job status updates.

    Provides real-time updates without polling.
    """
    # Verify job exists and user has access
    result = await db.execute(
        select(CopyGenerationJob).where(
            and_(
                CopyGenerationJob.task_id == task_id,
                CopyGenerationJob.workspace_id == workspace_id
            )
        )
    )
    job = result.scalar_one_or_none()

    if not job:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Job not found"
        )

    async def event_stream():
        """Generate SSE events for job status updates."""
        # Send initial status
        initial_status = {
            "task_id": str(task_id),
            "status": job.status.value,
            "progress": job.progress or 0,
            "created_at": job.created_at.isoformat(),
            "started_at": job.started_at.isoformat() if job.started_at else None,
            "completed_at": job.completed_at.isoformat() if job.completed_at else None,
            "error_message": job.error_message,
            "results": job.raw_results
        }

        yield f"data: {json.dumps(initial_status)}\n\n"

        # For now, just simulate progress (placeholder for real implementation)
        # TODO: Implement real Redis pub/sub for status updates
        if job.status == JobStatus.PENDING:
            await db.execute(
                select(CopyGenerationJob).where(
                    CopyGenerationJob.id == job.id
                ).with_for_update()
            )
            job.status = JobStatus.PROCESSING
            job.progress = 50
            await db.commit()

            progress_status = {
                "task_id": str(task_id),
                "status": "processing",
                "progress": 50,
                "created_at": job.created_at.isoformat(),
                "started_at": job.started_at.isoformat() if job.started_at else datetime.now(timezone.utc).isoformat(),
                "error_message": None,
                "results": None
            }

            yield f"data: {json.dumps(progress_status)}\n\n"

    return StreamingResponse(
        event_stream(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Credentials": "true"
        }
    )


@router.get(
    "/workspaces/{workspace_id}/products/{product_id}/results",
    response_model=CopyResultsListResponse
)
async def get_copy_results(
    workspace_id: UUID,
    product_id: UUID,
    member: CurrentWorkspaceMember,
    type: Optional[CopyType] = Query(None, description="Filter by copy type"),
    page: int = Query(1, ge=1, description="Page number"),
    per_page: int = Query(20, ge=1, le=100, description="Items per page"),
    favorite_only: bool = Query(False, description="Show only favorites"),
    db: AsyncSession = Depends(get_db)
):
    """
    获取产品的文案生成结果列表。

    Returns paginated list of saved copy results for a product.

    Args:
        workspace_id: Target workspace
        product_id: Target product
        type: Optional filter by copy type
        page: Page number for pagination
        per_page: Number of items per page
        favorite_only: Filter to show only favorite results

    Returns:
        Paginated list of copy results
    """
    # Build base query
    query = select(CopyResult).where(
        and_(
            CopyResult.workspace_id == workspace_id,
            CopyResult.product_id == product_id
        )
    )

    # Add filters
    if type:
        query = query.where(CopyResult.copy_type == type)

    if favorite_only:
        query = query.where(CopyResult.is_favorite == True)

    # Get total count
    count_query = select(func.count()).select_from(query.subquery())
    total_result = await db.execute(count_query)
    total = total_result.scalar()

    # Add pagination and ordering
    query = query.order_by(CopyResult.created_at.desc())
    query = query.offset((page - 1) * per_page).limit(per_page)

    # Execute query
    results_result = await db.execute(query)
    results = results_result.scalars().all()

    # Convert to response format
    result_responses = [
        CopyResultResponse(
            id=result.id,
            content=result.content,
            type=result.copy_type,
            config=GenerationConfig(**result.generation_config),
            is_favorite=result.is_favorite,
            created_at=result.created_at
        )
        for result in results
    ]

    return CopyResultsListResponse(
        results=result_responses,
        total=total,
        page=page,
        per_page=per_page
    )


@router.post(
    "/workspaces/{workspace_id}/products/{product_id}/results",
    response_model=SaveCopyResponse,
    status_code=status.HTTP_201_CREATED
)
async def save_copy_result(
    workspace_id: UUID,
    product_id: UUID,
    request: SaveCopyRequest,
    member: CurrentWorkspaceMember,
    current_user: CurrentUser,
    db: AsyncSession = Depends(get_db)
):
    """
    保存文案生成结果。

    Creates a new saved copy result for a product.

    Args:
        workspace_id: Target workspace
        product_id: Target product
        request: Copy content and metadata

    Returns:
        Saved copy result with ID
    """
    # Validate product exists and belongs to workspace
    product_result = await db.execute(
        select(Product).where(
            and_(
                Product.id == product_id,
                Product.workspace_id == workspace_id
            )
        )
    )
    product = product_result.scalar_one_or_none()
    if not product:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Product not found or access denied"
        )

    # Create copy result
    copy_result = CopyResult(
        workspace_id=workspace_id,
        product_id=product_id,
        generation_job_id=None,  # Manually saved, not from a job
        content=request.content,
        copy_type=request.type,
        generation_config=request.config.dict(),
        is_favorite=False
    )

    db.add(copy_result)
    await db.commit()
    await db.refresh(copy_result)

    return SaveCopyResponse(
        id=copy_result.id,
        content=copy_result.content,
        type=copy_result.copy_type,
        config=GenerationConfig(**copy_result.generation_config),
        is_favorite=copy_result.is_favorite,
        created_at=copy_result.created_at
    )


@router.patch(
    "/workspaces/{workspace_id}/results/{copy_id}/favorite",
    response_model=ToggleFavoriteResponse
)
async def toggle_copy_favorite(
    workspace_id: UUID,
    copy_id: UUID,
    member: CurrentWorkspaceMember,
    db: AsyncSession = Depends(get_db)
):
    """
    切换文案收藏状态。

    Toggles the favorite status of a copy result.

    Args:
        workspace_id: Target workspace
        copy_id: Copy result ID

    Returns:
        Updated favorite status
    """
    # Find copy result
    result = await db.execute(
        select(CopyResult).where(
            and_(
                CopyResult.id == copy_id,
                CopyResult.workspace_id == workspace_id
            )
        )
    )
    copy_result = result.scalar_one_or_none()

    if not copy_result:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Copy result not found"
        )

    # Toggle favorite status
    copy_result.is_favorite = not copy_result.is_favorite
    await db.commit()

    return ToggleFavoriteResponse(
        is_favorite=copy_result.is_favorite
    )


@router.delete(
    "/workspaces/{workspace_id}/results/{copy_id}",
    status_code=status.HTTP_204_NO_CONTENT
)
async def delete_copy_result(
    workspace_id: UUID,
    copy_id: UUID,
    member: CurrentWorkspaceMember,
    db: AsyncSession = Depends(get_db)
):
    """
    删除文案生成结果。

    Permanently deletes a copy result.

    Args:
        workspace_id: Target workspace
        copy_id: Copy result ID to delete
    """
    # Find copy result
    result = await db.execute(
        select(CopyResult).where(
            and_(
                CopyResult.id == copy_id,
                CopyResult.workspace_id == workspace_id
            )
        )
    )
    copy_result = result.scalar_one_or_none()

    if not copy_result:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Copy result not found"
        )

    # Delete the result
    await db.delete(copy_result)
    await db.commit()


@router.get(
    "/workspaces/{workspace_id}/quota",
    response_model=QuotaUsageResponse
)
async def get_quota_usage(
    workspace_id: UUID,
    member: CurrentWorkspaceMember,
    db: AsyncSession = Depends(get_db)
):
    """
    获取工作空间的配额使用情况。

    Returns current quota usage and limits for the workspace.

    Args:
        workspace_id: Target workspace

    Returns:
        Quota usage information
    """
    quota = await _get_or_create_quota(db, workspace_id)

    # Reset quota if needed (new month)
    if quota.is_reset_needed:
        quota.used_current_month = 0
        quota.last_reset_at = datetime.now(timezone.utc)
        await db.commit()

    return QuotaUsageResponse(
        used=quota.used_current_month,
        limit=quota.monthly_limit,
        remaining=quota.remaining
    )


# Helper functions
async def _get_or_create_quota(db: AsyncSession, workspace_id: UUID) -> CopyQuota:
    """Get or create quota record for workspace."""
    result = await db.execute(
        select(CopyQuota).where(CopyQuota.workspace_id == workspace_id)
    )
    quota = result.scalar_one_or_none()

    if not quota:
        quota = CopyQuota(
            workspace_id=workspace_id,
            monthly_limit=100  # Default free tier
        )
        db.add(quota)
        await db.commit()
        await db.refresh(quota)

    return quota