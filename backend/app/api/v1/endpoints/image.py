"""
Image Generation API Endpoints - AI image generation workflow.
Story 2.1: Style Selection & Generation Trigger
Story 2.4: Reference Image Attachment
"""

import uuid
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from uuid import UUID

from app.api.deps import get_db, CurrentUser, CurrentWorkspaceMember, check_image_quota
from app.services.billing_service import BillingService
from app.models.image import ImageGenerationJob, JobStatus
from app.models.product import Product
from app.models.asset import Asset
from app.schemas.image import (
    ImageGenerationRequest, 
    ImageGenerationResponse, 
    JobStatusResponse,
    StyleType
)
from app.tasks.image_generation import generate_images_task

router = APIRouter(prefix="/images", tags=["images"])


@router.post(
    "/workspaces/{workspace_id}/generate",
    response_model=ImageGenerationResponse,
    status_code=status.HTTP_202_ACCEPTED,
    dependencies=[Depends(check_image_quota)]
)
async def generate_images(
    workspace_id: UUID,
    request: ImageGenerationRequest,
    member: CurrentWorkspaceMember,
    current_user: CurrentUser,
    db: AsyncSession = Depends(get_db)
):
    """
    触发 AI 图像生成任务。
    
    Creates a generation job and queues it for async processing via Celery.
    Returns immediately with a task_id for status polling.
    
    Args:
        workspace_id: Target workspace
        request: Generation parameters (style_id, category_id, asset_id, product_id)
        
    Returns:
        202 Accepted with task_id for polling
    """
    # Validate product exists and belongs to workspace
    product_result = await db.execute(
        select(Product).where(
            Product.id == request.product_id,
            Product.workspace_id == workspace_id
        )
    )
    product = product_result.scalar_one_or_none()
    if not product:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Product not found or access denied"
        )
    
    # Validate style_id enum
    try:
        StyleType(request.style_id)
    except ValueError:
        valid_styles = [s.value for s in StyleType]
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid style_id. Must be one of: {valid_styles}"
        )

    # Story 2.4: Validate reference image if provided
    reference_image = None
    if request.reference_image_id:
        reference_result = await db.execute(
            select(Asset).where(
                Asset.id == request.reference_image_id,
                Asset.workspace_id == workspace_id
            )
        )
        reference_image = reference_result.scalar_one_or_none()
        if not reference_image:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Reference image not found or access denied"
            )
        # Validate that it's an image file
        if not reference_image.mime_type.startswith('image/'):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Reference file must be an image"
            )
    
    # Create Celery task ID
    celery_task_id = uuid.uuid4()
    
    # Create job record in database
    job = ImageGenerationJob(
        workspace_id=workspace_id,
        user_id=current_user.id,
        product_id=request.product_id,
        reference_image_id=request.reference_image_id,  # Story 2.4
        task_id=celery_task_id,
        style_id=request.style_id.value,
        status=JobStatus.PENDING
    )
    
    db.add(job)
    await db.commit()
    await db.refresh(job)
    
    # Queue Celery task
    generate_images_task.delay(str(job.id))

    # Deduct billing credits (AC2: Credit deduction after action)
    billing_service = BillingService(db)
    await billing_service.deduct_credits(str(workspace_id), 5)  # Image = 5 credits
    
    return ImageGenerationResponse(
        task_id=celery_task_id,
        status=JobStatus.PENDING,
        message="Generation task queued successfully"
    )


@router.get(
    "/workspaces/{workspace_id}/jobs/{task_id}",
    response_model=JobStatusResponse
)
async def get_job_status(
    workspace_id: UUID,
    task_id: UUID,
    member: CurrentWorkspaceMember,
    db: AsyncSession = Depends(get_db)
):
    """
    查询图像生成任务状态。
    
    Poll this endpoint to check generation progress.
    
    Args:
        workspace_id: Target workspace
        task_id: The task_id returned from /generate
        
    Returns:
        Current job status with progress and results (if completed)
    """
    result = await db.execute(
        select(ImageGenerationJob).where(
            ImageGenerationJob.task_id == task_id,
            ImageGenerationJob.workspace_id == workspace_id
        )
    )
    job = result.scalar_one_or_none()
    
    if not job:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Job not found"
        )
    
    return JobStatusResponse(
        task_id=job.task_id,
        status=job.status,
        progress=job.progress or 0,
        error_message=job.error_message,
        result_urls=job.result_urls,
        created_at=job.created_at,
        started_at=job.started_at,
        completed_at=job.completed_at
    )
