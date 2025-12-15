"""
Image Generation Schemas - Pydantic models for image generation API validation.
Story 2.1: Style Selection & Generation Trigger
"""

from enum import Enum
from typing import Optional, List
from uuid import UUID
from datetime import datetime

from pydantic import BaseModel, Field


class StyleType(str, Enum):
    """Available visual style types for image generation."""
    MODERN = "modern"
    LUXURY = "luxury"
    FRESH = "fresh"
    TECH = "tech"
    WARM = "warm"
    BUSINESS = "business"


class JobStatus(str, Enum):
    """Image generation job status enum."""
    PENDING = "pending"
    PROCESSING = "processing"
    COMPLETED = "completed"
    FAILED = "failed"


class ImageGenerationRequest(BaseModel):
    """Request schema for image generation endpoint."""
    style_id: StyleType = Field(
        ...,
        description="Visual style for generation"
    )
    category_id: str = Field(
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
