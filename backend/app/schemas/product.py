"""
Product Schemas - Pydantic models for Product API validation.
"""

from pydantic import BaseModel, Field
from datetime import datetime
from uuid import UUID


class ProductBase(BaseModel):
    """Base schema for Product data."""
    name: str = Field(..., min_length=1, max_length=255)
    category: str = Field(..., description="Product category enum value")


class ProductCreate(ProductBase):
    """Schema for creating a new Product."""
    original_asset_id: UUID


class ProductUpdate(BaseModel):
    """Schema for updating a Product."""
    name: str | None = Field(None, min_length=1, max_length=255)
    category: str | None = None


class ProductResponse(ProductBase):
    """Schema for Product API responses."""
    id: UUID
    workspace_id: UUID
    original_asset_id: UUID
    status: str
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}
