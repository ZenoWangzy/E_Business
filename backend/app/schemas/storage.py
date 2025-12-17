"""
Storage API Schemas - Pydantic models for storage endpoints
Implements camelCase JSON output as per project_context.md (AC: 1-6, 7-11)
"""

from datetime import datetime
from typing import Optional
from pydantic import BaseModel, Field, ConfigDict
from uuid import UUID


def to_camel(string: str) -> str:
    """Convert snake_case to camelCase."""
    components = string.split("_")
    return components[0] + "".join(x.title() for x in components[1:])


class StorageBaseSchema(BaseModel):
    """Base schema with camelCase alias configuration."""

    model_config = ConfigDict(
        populate_by_name=True,
        alias_generator=to_camel,
    )


class PresignedUploadRequest(StorageBaseSchema):
    """
    Request to generate a presigned upload URL.
    Frontend sends this to initiate file upload flow.
    """

    filename: str = Field(..., min_length=1, max_length=255, description="Original filename")
    file_size: int = Field(..., gt=0, le=52428800, description="File size in bytes (max 50MB)")
    content_type: str = Field(..., min_length=1, max_length=100, description="MIME type of the file")
    checksum: Optional[str] = Field(None, max_length=64, description="Optional MD5 checksum for verification")


class PresignedUploadResponse(StorageBaseSchema):
    """
    Response containing presigned URL for direct MinIO upload.
    """

    upload_url: str = Field(..., description="Presigned PUT URL for direct MinIO upload")
    asset_id: str = Field(..., description="UUID of the created asset record")
    storage_path: str = Field(..., description="Full storage path in MinIO")
    expires_in: int = Field(..., description="URL expiration time in seconds")


class AssetConfirmation(StorageBaseSchema):
    """
    Request to confirm upload completion.
    Frontend calls this after successful MinIO upload.
    """

    asset_id: str = Field(..., description="UUID of the asset to confirm")
    actual_file_size: int = Field(..., gt=0, description="Actual uploaded file size in bytes")
    actual_checksum: Optional[str] = Field(None, max_length=64, description="MD5 checksum of uploaded file")


class AssetConfirmationResponse(StorageBaseSchema):
    """
    Response after confirming upload.
    """

    asset_id: str = Field(..., description="UUID of the confirmed asset")
    verified: bool = Field(..., description="Whether the upload was verified successfully")
    storage_status: str = Field(..., description="Current storage status")
    file_size: int = Field(..., description="Confirmed file size in bytes")


class PresignedDownloadRequest(StorageBaseSchema):
    """
    Request to generate a presigned download URL.
    """

    expires_minutes: int = Field(15, ge=1, le=60, description="URL expiration in minutes (1-60)")


class PresignedDownloadResponse(StorageBaseSchema):
    """
    Response containing presigned URL for file download.
    """

    download_url: str = Field(..., description="Presigned GET URL for file download")
    expires_in: int = Field(..., description="URL expiration time in seconds")
    filename: str = Field(..., description="Original filename")
    content_type: str = Field(..., description="MIME type of the file")
    file_size: int = Field(..., description="File size in bytes")


class BatchDownloadRequest(StorageBaseSchema):
    """
    Request to generate multiple download URLs.
    """

    asset_ids: list[str] = Field(..., min_length=1, max_length=20, description="List of asset UUIDs (max 20)")
    expires_minutes: int = Field(15, ge=1, le=60, description="URL expiration in minutes")


class BatchDownloadResponseItem(StorageBaseSchema):
    """
    Single item in batch download response.
    """

    asset_id: str = Field(..., description="UUID of the asset")
    download_url: Optional[str] = Field(None, description="Presigned download URL (null if error)")
    filename: str = Field(..., description="Original filename")
    error: Optional[str] = Field(None, description="Error message if URL generation failed")


class BatchDownloadResponse(StorageBaseSchema):
    """
    Response containing multiple download URLs.
    """

    items: list[BatchDownloadResponseItem] = Field(..., description="List of download URL results")
    expires_in: int = Field(..., description="URL expiration time in seconds")


class StorageHealthResponse(StorageBaseSchema):
    """
    Storage service health check response.
    """

    healthy: bool = Field(..., description="Whether MinIO is accessible")
    bucket: str = Field(..., description="Configured bucket name")
    timestamp: datetime = Field(..., description="Health check timestamp")


class AssetStorageInfo(StorageBaseSchema):
    """
    Asset storage information for admin/debug purposes.
    """

    asset_id: str = Field(..., description="UUID of the asset")
    workspace_id: str = Field(..., description="UUID of the workspace")
    filename: str = Field(..., description="Original filename")
    storage_path: Optional[str] = Field(None, description="Full path in MinIO")
    storage_status: str = Field(..., description="Current storage status")
    file_size: int = Field(..., description="File size in bytes")
    content_type: str = Field(..., description="MIME type")
    checksum: Optional[str] = Field(None, description="MD5 checksum")
    created_at: datetime = Field(..., description="Creation timestamp")
    updated_at: datetime = Field(..., description="Last update timestamp")
