"""
[IDENTITY]: Image Generation Schemas
DTOs for AI Image Generation interactions.

[INPUT]:
- ImageGenerationRequest (Style, Category, Asset, Product).

[LINK]:
- ImageRouter -> ../api/v1/endpoints/image.py
- ImageModel -> ../models/image.py

[OUTPUT]: ImageGenerationResponse (Async Task ID).
[POS]: /backend/app/schemas/image.py

[PROTOCOL]:
1. `reference_image_id` is optional; serves as "img2img" input source.
"""

from typing import Optional, List
from uuid import UUID
from datetime import datetime

from pydantic import BaseModel, Field

# Import enums from models to avoid duplication (DRY)
from app.models.image import StyleType, JobStatus
from app.models.product import ProductCategory


class ImageGenerationRequest(BaseModel):
    """Request schema for image generation endpoint."""
    style_id: StyleType = Field(
        ...,
        description="Visual style for generation"
    )
    category_id: ProductCategory = Field(
        ...,
        description="Product category from previous step"
    )
    asset_id: UUID = Field(
        ...,
        description="Original asset ID"
    )
    product_id: UUID = Field(
        ...,
        description="Product ID from category selection step"
    )
    # Story 2.4: Reference image attachment
    reference_image_id: Optional[UUID] = Field(
        default=None,
        description="Optional reference image ID to guide generation"
    )


class ImageGenerationResponse(BaseModel):
    """Response schema for image generation request (202 Accepted)."""
    task_id: UUID = Field(..., description="Celery task ID for status polling")
    status: JobStatus = Field(default=JobStatus.PENDING)
    message: Optional[str] = Field(
        default="Generation task queued successfully",
        description="User-friendly status message"
    )

    model_config = {"from_attributes": True}


class JobStatusResponse(BaseModel):
    """Response schema for job status query."""
    task_id: UUID
    status: JobStatus
    progress: int = Field(default=0, ge=0, le=100)
    error_message: Optional[str] = None
    result_urls: Optional[List[str]] = None
    created_at: datetime
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None

    model_config = {"from_attributes": True}


class GenerationErrorResponse(BaseModel):
    """Error response schema for generation failures."""
    detail: str
    error_code: str
