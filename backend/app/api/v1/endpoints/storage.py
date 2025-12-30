"""
[IDENTITY]: Secure File Transfer API (MinIO Integration)
Generates Presigned URLs for Direct-to-Cloud Uploads/Downloads.

[INPUT]:
- File Metadata (Name, Size, Type).

[LINK]:
- Service_Storage -> ../../../services/storage_service.py
- Model_Asset -> ../../../models/asset.py

[OUTPUT]: Signed URLs (Upload/Download).
[POS]: /backend/app/api/v1/endpoints/storage.py

[PROTOCOL]:
1. **State Machine**: Asset status flows `PENDING` -> `UPLOADING` -> `UPLOADED`.
2. **Verification**: `confirm_upload` step is MANDATORY for data integrity.
3. **Security**: URLs expire automatically (15-60 min).
"""

import uuid
from datetime import datetime, timezone
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import (
    CurrentUser,
    get_db,
    get_current_workspace,
    require_workspace_role,
)
from app.models.user import Workspace, WorkspaceMember, UserRole
from app.models.asset import Asset, StorageStatus
from app.schemas.storage import (
    PresignedUploadRequest,
    PresignedUploadResponse,
    AssetConfirmation,
    AssetConfirmationResponse,
    PresignedDownloadResponse,
    BatchDownloadRequest,
    BatchDownloadResponse,
    BatchDownloadResponseItem,
    StorageHealthResponse,
)
from app.services.storage_service import get_storage_service, StorageService

router = APIRouter(
    prefix="/workspaces/{workspace_id}/assets",
    tags=["Storage"],
)


def get_storage() -> StorageService:
    """Dependency to get storage service."""
    return get_storage_service()


# =============================================================================
# Presigned URL Endpoints (AC: 1-6)
# =============================================================================


@router.post(
    "/upload/presigned",
    response_model=PresignedUploadResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Get presigned URL for file upload",
    description="Generate a presigned URL for direct client-to-MinIO upload. Creates an asset record in pending state.",
)
async def get_presigned_upload_url(
    workspace_id: uuid.UUID,
    request: PresignedUploadRequest,
    workspace: Annotated[Workspace, Depends(get_current_workspace)],
    current_user: CurrentUser,
    db: Annotated[AsyncSession, Depends(get_db)],
    member: Annotated[
        WorkspaceMember,
        Depends(require_workspace_role([UserRole.MEMBER, UserRole.ADMIN, UserRole.OWNER])),
    ],
    storage: Annotated[StorageService, Depends(get_storage)],
) -> PresignedUploadResponse:
    """
    Generate presigned URL for file upload.

    Flow:
    1. Create asset record with PENDING_UPLOAD status
    2. Generate presigned PUT URL for MinIO
    3. Return URL and asset ID for client upload

    Multi-tenancy: Asset is associated with workspace_id (AC: 5-6).
    """
    # Create asset record in pending state
    asset = Asset(
        workspace_id=workspace.id,
        name=request.filename,
        mime_type=request.content_type,
        size=request.file_size,
        storage_status=StorageStatus.PENDING_UPLOAD,
        uploaded_by=current_user.id,
        file_checksum=request.checksum,
    )

    db.add(asset)
    await db.commit()
    await db.refresh(asset)

    # Generate presigned upload URL
    upload_info = storage.generate_upload_url(
        workspace_id=str(workspace.id),
        asset_id=str(asset.id),
        filename=request.filename,
        expires_minutes=60,  # 1 hour for uploads
    )

    # Update asset with storage path
    asset.storage_path = upload_info["storage_path"]
    asset.storage_status = StorageStatus.UPLOADING
    await db.commit()

    return PresignedUploadResponse(
        upload_url=upload_info["upload_url"],
        asset_id=str(asset.id),
        storage_path=upload_info["storage_path"],
        expires_in=upload_info["expires_in"],
    )


@router.post(
    "/confirm",
    response_model=AssetConfirmationResponse,
    summary="Confirm upload completion",
    description="Called after successful MinIO upload to verify and update asset status.",
)
async def confirm_upload(
    workspace_id: uuid.UUID,
    request: AssetConfirmation,
    workspace: Annotated[Workspace, Depends(get_current_workspace)],
    current_user: CurrentUser,
    db: Annotated[AsyncSession, Depends(get_db)],
    member: Annotated[
        WorkspaceMember,
        Depends(require_workspace_role([UserRole.MEMBER, UserRole.ADMIN, UserRole.OWNER])),
    ],
    storage: Annotated[StorageService, Depends(get_storage)],
) -> AssetConfirmationResponse:
    """
    Confirm that a file was successfully uploaded to MinIO.

    Flow:
    1. Verify file exists in MinIO
    2. Validate file size matches
    3. Update asset status to UPLOADED

    Multi-tenancy: Validates asset belongs to workspace (AC: 10-11).
    """
    # Find asset
    stmt = select(Asset).where(
        Asset.id == uuid.UUID(request.asset_id),
        Asset.workspace_id == workspace.id,
    )
    result = await db.execute(stmt)
    asset = result.scalar_one_or_none()

    if not asset:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Asset not found",
        )

    if asset.storage_status not in (StorageStatus.PENDING_UPLOAD, StorageStatus.UPLOADING):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Asset is not pending upload. Current status: {asset.storage_status}",
        )

    # Verify upload in MinIO
    try:
        verification = storage.verify_upload(
            workspace_id=str(workspace.id),
            asset_id=str(asset.id),
            filename=asset.name,
            expected_size=request.actual_file_size,
        )

        # Update asset status
        asset.storage_status = StorageStatus.UPLOADED
        asset.size = verification["size"]
        if request.actual_checksum:
            asset.file_checksum = request.actual_checksum
        asset.updated_at = datetime.now(timezone.utc)

        await db.commit()
        await db.refresh(asset)

        return AssetConfirmationResponse(
            asset_id=str(asset.id),
            verified=True,
            storage_status=asset.storage_status.value,
            file_size=asset.size,
        )

    except ValueError as e:
        # Upload verification failed
        asset.storage_status = StorageStatus.FAILED
        asset.error_message = str(e)
        await db.commit()

        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        )


# =============================================================================
# Download URL Endpoints (AC: 7-11)
# =============================================================================


@router.get(
    "/{asset_id}/url",
    response_model=PresignedDownloadResponse,
    summary="Get presigned URL for file download",
    description="Generate a presigned URL for downloading a file from MinIO.",
)
async def get_presigned_download_url(
    workspace_id: uuid.UUID,
    asset_id: uuid.UUID,
    workspace: Annotated[Workspace, Depends(get_current_workspace)],
    db: Annotated[AsyncSession, Depends(get_db)],
    storage: Annotated[StorageService, Depends(get_storage)],
    expires_minutes: int = 15,
) -> PresignedDownloadResponse:
    """
    Generate presigned URL for file download.

    Multi-tenancy: Validates asset belongs to workspace (AC: 10-11).
    """
    # Find asset
    stmt = select(Asset).where(
        Asset.id == asset_id,
        Asset.workspace_id == workspace.id,
    )
    result = await db.execute(stmt)
    asset = result.scalar_one_or_none()

    if not asset:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Asset not found",
        )

    if asset.storage_status != StorageStatus.UPLOADED:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Asset is not available for download. Status: {asset.storage_status}",
        )

    # Generate presigned download URL
    download_info = storage.generate_download_url(
        workspace_id=str(workspace.id),
        asset_id=str(asset.id),
        filename=asset.name,
        expires_minutes=min(expires_minutes, 60),  # Cap at 60 minutes
    )

    return PresignedDownloadResponse(
        download_url=download_info["download_url"],
        expires_in=download_info["expires_in"],
        filename=asset.name,
        content_type=asset.mime_type,
        file_size=asset.size,
    )


@router.post(
    "/batch-download",
    response_model=BatchDownloadResponse,
    summary="Get presigned URLs for multiple files",
    description="Generate presigned URLs for downloading multiple files at once.",
)
async def get_batch_download_urls(
    workspace_id: uuid.UUID,
    request: BatchDownloadRequest,
    workspace: Annotated[Workspace, Depends(get_current_workspace)],
    db: Annotated[AsyncSession, Depends(get_db)],
    storage: Annotated[StorageService, Depends(get_storage)],
) -> BatchDownloadResponse:
    """
    Generate presigned URLs for multiple files.

    Multi-tenancy: Only returns URLs for assets in the workspace (AC: 10-11).
    """
    items = []
    expires_minutes = min(request.expires_minutes, 60)

    for asset_id_str in request.asset_ids:
        try:
            asset_uuid = uuid.UUID(asset_id_str)
        except ValueError:
            items.append(
                BatchDownloadResponseItem(
                    asset_id=asset_id_str,
                    download_url=None,
                    filename="",
                    error="Invalid asset ID format",
                )
            )
            continue

        # Find asset
        stmt = select(Asset).where(
            Asset.id == asset_uuid,
            Asset.workspace_id == workspace.id,
        )
        result = await db.execute(stmt)
        asset = result.scalar_one_or_none()

        if not asset:
            items.append(
                BatchDownloadResponseItem(
                    asset_id=asset_id_str,
                    download_url=None,
                    filename="",
                    error="Asset not found",
                )
            )
            continue

        if asset.storage_status != StorageStatus.UPLOADED:
            items.append(
                BatchDownloadResponseItem(
                    asset_id=asset_id_str,
                    download_url=None,
                    filename=asset.name,
                    error=f"Asset not available. Status: {asset.storage_status}",
                )
            )
            continue

        # Generate download URL
        try:
            download_info = storage.generate_download_url(
                workspace_id=str(workspace.id),
                asset_id=str(asset.id),
                filename=asset.name,
                expires_minutes=expires_minutes,
            )
            items.append(
                BatchDownloadResponseItem(
                    asset_id=asset_id_str,
                    download_url=download_info["download_url"],
                    filename=asset.name,
                    error=None,
                )
            )
        except Exception as e:
            items.append(
                BatchDownloadResponseItem(
                    asset_id=asset_id_str,
                    download_url=None,
                    filename=asset.name,
                    error=str(e),
                )
            )

    return BatchDownloadResponse(
        items=items,
        expires_in=expires_minutes * 60,
    )


# =============================================================================
# Health Check
# =============================================================================


@router.get(
    "/storage/health",
    response_model=StorageHealthResponse,
    summary="Check storage health",
    description="Check if MinIO storage service is accessible.",
)
async def check_storage_health(
    workspace_id: uuid.UUID,
    workspace: Annotated[Workspace, Depends(get_current_workspace)],
    storage: Annotated[StorageService, Depends(get_storage)],
) -> StorageHealthResponse:
    """
    Check storage service health.
    """
    return StorageHealthResponse(
        healthy=storage.check_health(),
        bucket=storage.client.bucket_name,
        timestamp=datetime.now(timezone.utc),
    )
