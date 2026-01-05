"""
[IDENTITY]: Secure File Transfer API (MinIO Integration)
Generates Presigned URLs for Direct-to-Cloud Uploads/Downloads.

[INPUT]:
- File Metadata (Name, Size, Type).

[LINK]:
- Service_Storage -> ../../../services/storage_service.py
- Service_TransactionalUpload -> ../../../services/transactional_upload.py
- Model_Asset -> ../../../models/asset.py

[OUTPUT]: Signed URLs (Upload/Download).
[POS]: /backend/app/api/v1/endpoints/storage.py

[PROTOCOL]:
1. **Two-Phase Commit**: Uses TransactionalUploadService for prepare/confirm.
2. **TTL Protection**: Pending uploads have Redis TTL for auto-cleanup.
3. **State Machine**: Asset status flows `PENDING` -> `UPLOADING` -> `UPLOADED`.
4. **Verification**: `confirm_upload` step is MANDATORY for data integrity.
5. **Security**: URLs expire automatically (15-60 min).
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
from app.services.transactional_upload import (
    get_transactional_upload_service,
    TransactionalUploadService,
)

router = APIRouter(
    prefix="/workspaces/{workspace_id}/assets",
    tags=["Storage"],
)


def get_storage() -> StorageService:
    """Dependency to get storage service."""
    return get_storage_service()


def get_transactional_upload() -> TransactionalUploadService:
    """Dependency to get transactional upload service."""
    return get_transactional_upload_service()


# =============================================================================
# Presigned URL Endpoints (AC: 1-6)
# =============================================================================


@router.post(
    "/upload/presigned",
    response_model=PresignedUploadResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Get presigned URL for file upload",
    description="Generate a presigned URL for direct client-to-MinIO upload. Creates an asset record in pending state with TTL protection.",
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
    upload_service: Annotated[
        TransactionalUploadService,
        Depends(get_transactional_upload),
    ],
) -> PresignedUploadResponse:
    """
    Generate presigned URL for file upload (Two-Phase Commit - Phase 1).

    Flow:
    1. Create asset record with PENDING_UPLOAD status + Redis TTL
    2. Generate presigned PUT URL for MinIO
    3. Update status to UPLOADING
    4. Return URL and asset ID for client upload

    TTL Protection: Pending uploads are automatically cleaned up if not confirmed.
    Multi-tenancy: Asset is associated with workspace_id (AC: 5-6).
    """
    # Use TransactionalUploadService for two-phase commit
    result = await upload_service.prepare_upload(
        db=db,
        workspace_id=workspace.id,
        user_id=current_user.id,
        filename=request.filename,
        content_type=request.content_type,
        file_size=request.file_size,
        checksum=request.checksum,
        expires_minutes=request.expires_minutes,  # 支持动态过期时间
    )

    return PresignedUploadResponse(
        upload_url=result["upload_url"],
        asset_id=result["asset_id"],
        storage_path=result["storage_path"],
        expires_in=result["expires_in"],
    )


@router.post(
    "/confirm",
    response_model=AssetConfirmationResponse,
    summary="Confirm upload completion",
    description="Called after successful MinIO upload to verify and update asset status. This operation is idempotent.",
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
    upload_service: Annotated[
        TransactionalUploadService,
        Depends(get_transactional_upload),
    ],
) -> AssetConfirmationResponse:
    """
    Confirm that a file was successfully uploaded to MinIO (Two-Phase Commit - Phase 2).

    This operation is **idempotent**: if the asset is already UPLOADED, 
    it returns success without re-verification.

    Flow:
    1. Verify file exists in MinIO
    2. Validate file size matches
    3. Update asset status to UPLOADED
    4. Clear Redis TTL tracking

    Multi-tenancy: Validates asset belongs to workspace (AC: 10-11).
    """
    try:
        result = await upload_service.confirm_upload(
            db=db,
            workspace_id=workspace.id,
            asset_id=request.asset_id,
            actual_file_size=request.actual_file_size,
            actual_checksum=request.actual_checksum,
        )

        return AssetConfirmationResponse(
            asset_id=result["asset_id"],
            verified=result["verified"],
            storage_status=result["storage_status"],
            file_size=result["file_size"],
        )

    except ValueError as e:
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
