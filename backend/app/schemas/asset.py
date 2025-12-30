"""
[IDENTITY]: Asset Schemas
DTOs for File Management (Upload/Download metadata).

[INPUT]:
- AssetCreate (Metadata only; file binary handled via multipart).

[LINK]:
- AssetRouter -> ../api/v1/endpoints/assets.py
- AssetModel -> ../models/asset.py

[OUTPUT]: AssetRead, AssetUploadResponse.
[POS]: /backend/app/schemas/asset.py

[PROTOCOL]:
1. `AssetUploadResponse` confirms successful MinIO metadata creation, not necessarily file completion (async).
"""
from datetime import datetime
from typing import Optional
from uuid import UUID

from pydantic import BaseModel, Field, ConfigDict


def to_camel(string: str) -> str:
    """Convert snake_case to camelCase for JSON output."""
    components = string.split('_')
    return components[0] + ''.join(x.title() for x in components[1:])


class CamelCaseModel(BaseModel):
    """Base model that outputs camelCase JSON keys."""
    model_config = ConfigDict(
        from_attributes=True,
        populate_by_name=True,
        alias_generator=to_camel,
    )


# =============================================================================
# Read Schemas (Output)
# =============================================================================

class AssetRead(CamelCaseModel):
    """Schema for reading asset information."""
    
    id: UUID
    workspace_id: UUID
    name: str
    mime_type: str
    size: int
    content: Optional[str] = None
    preview: Optional[str] = None
    created_at: datetime
    updated_at: datetime


class AssetBrief(CamelCaseModel):
    """Brief asset info for list responses."""
    
    id: UUID
    name: str
    mime_type: str
    size: int
    created_at: datetime


# =============================================================================
# Create Schemas (Input)
# =============================================================================

class AssetCreate(BaseModel):
    """Schema for asset metadata (file is multipart)."""
    content: Optional[str] = Field(None, description="Extracted text content from file")
    preview: Optional[str] = Field(None, description="Preview text or thumbnail path")


# =============================================================================
# Response Wrappers
# =============================================================================

class AssetListResponse(BaseModel):
    """Response for listing assets."""
    data: list[AssetBrief]
    total: int


# =============================================================================
# Upload Response
# =============================================================================

class AssetUploadResponse(CamelCaseModel):
    """Response after successful file upload."""
    
    id: UUID
    name: str
    mime_type: str
    size: int
    status: str = "uploaded"
    message: str = "File uploaded successfully"
