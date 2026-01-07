"""
[IDENTITY]: Asset Management API
Secure File Upload & Metadata Registry.

[INPUT]:
- Multipart File, Workspace Context.

[LINK]:
- Model_Asset -> ../../../models/asset.py
- Validation -> ALLOWED_MIME_TYPES (Inline)
- RateLimitDep -> ../../deps/rate_limit.py

[OUTPUT]: Asset Metadata (DB Record).
[POS]: /backend/app/api/v1/endpoints/assets.py

[PROTOCOL]:
1. Strict Validation: Whitelisted MIME types and Max Size (10MB).
2. Workspace Isolation: Assets are strictly bound to a workspace.
3. **Streaming Validation**: File size validated via streaming to prevent DoS.
   - Never loads entire file into memory at once.
   - Reads in 8KB chunks, fails fast if size exceeded.
"""
import uuid
from typing import Annotated, Optional

from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Form, Request
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
import structlog

logger = structlog.get_logger(__name__)

from app.api.deps import (
    CurrentUser,
    get_db,
    get_current_workspace,
    get_current_workspace_member,
    require_workspace_role
)
from app.models.user import Workspace, WorkspaceMember, UserRole
from app.models.asset import Asset
from app.schemas.asset import AssetRead, AssetBrief, AssetUploadResponse, AssetListResponse
from app.api.deps.rate_limit import rate_limit_upload

# File validation constants (AC: 22-25)
ALLOWED_MIME_TYPES = {
    # Images
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp',
    # Documents
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'text/plain',
    # Spreadsheets
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
}

MAX_FILE_SIZE = 10 * 1024 * 1024  # 10MB (AC: 22-25)
STREAMING_CHUNK_SIZE = 8192  # 8KB chunks for streaming validation

router = APIRouter(prefix="/workspaces/{workspace_id}/assets", tags=["Assets"])


# =============================================================================
# Streaming File Validation (DoS Prevention)
# =============================================================================


async def validate_file_size_streaming(
    file: UploadFile,
    max_size: int = MAX_FILE_SIZE,
) -> int:
    """
    Validate file size using streaming to prevent DoS attacks.
    
    This function reads the file in small chunks instead of loading
    the entire file into memory at once. This prevents memory exhaustion
    attacks from oversized uploads.
    
    Args:
        file: The uploaded file to validate
        max_size: Maximum allowed file size in bytes (default: 10MB)
    
    Returns:
        int: The actual file size in bytes
    
    Raises:
        HTTPException: 413 if file exceeds max_size
        HTTPException: 500 if file read/seek fails
    """
    size = 0
    
    try:
        while True:
            try:
                chunk = await file.read(STREAMING_CHUNK_SIZE)
            except (IOError, OSError) as e:
                logger.error(
                    "file_read_error",
                    filename=file.filename,
                    error=str(e),
                    error_type=type(e).__name__
                )
                raise HTTPException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    detail="Failed to read file. Please try again."
                )
            
            if not chunk:
                break
            size += len(chunk)
            
            # Fail fast: stop reading as soon as limit exceeded
            if size > max_size:
                raise HTTPException(
                    status_code=status.HTTP_413_CONTENT_TOO_LARGE,
                    detail=f"File size exceeds maximum allowed ({max_size // (1024*1024)}MB)"
                )
    finally:
        # Reset file position for subsequent reads (e.g., storage upload)
        try:
            await file.seek(0)
        except (IOError, OSError) as e:
            logger.warning(
                "file_seek_failed",
                filename=file.filename,
                error=str(e)
            )
    
    return size


# =============================================================================
# Asset CRUD
# =============================================================================

@router.post(
    "",
    response_model=AssetUploadResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Upload a file to workspace",
    description="Upload a file with optional extracted content. Requires MEMBER role or higher.",
    dependencies=[Depends(rate_limit_upload)]
)
async def upload_asset(
    workspace_id: uuid.UUID,
    file: Annotated[UploadFile, File(description="File to upload")],
    workspace: Annotated[Workspace, Depends(get_current_workspace)],
    current_user: CurrentUser,
    db: Annotated[AsyncSession, Depends(get_db)],
    member: Annotated[WorkspaceMember, Depends(require_workspace_role([
        UserRole.MEMBER, UserRole.ADMIN, UserRole.OWNER
    ]))],
    content: Annotated[Optional[str], Form(description="Extracted text content")] = None,
    preview: Annotated[Optional[str], Form(description="Preview text")] = None,
) -> Asset:
    """
    Upload a file to the workspace.
    
    Performs server-side validation for:
    - MIME type whitelist (AC: 22-25)
    - File size limit (10MB)
    
    Multi-tenancy: File is associated with workspace_id (AC: 26-30).
    """
    # 日志记录上传开始
    logger.info(
        "asset_upload_start",
        workspace_id=str(workspace_id),
        user_id=str(current_user.id),
        filename=file.filename,
        content_type=file.content_type,
    )
    
    # Validate MIME type
    if file.content_type not in ALLOWED_MIME_TYPES:
        raise HTTPException(
            status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
            detail=f"Unsupported file type: {file.content_type}. Allowed: {', '.join(ALLOWED_MIME_TYPES)}"
        )
    
    # Validate file size using streaming (DoS prevention)
    # This reads in chunks rather than loading entire file to memory
    file_size = await validate_file_size_streaming(file, MAX_FILE_SIZE)
    
    # Create asset record
    asset = Asset(
        workspace_id=workspace.id,
        name=file.filename or "unnamed",
        mime_type=file.content_type or "application/octet-stream",
        size=file_size,
        content=content,
        preview=preview,
    )
    
    db.add(asset)
    
    try:
        await db.commit()
        await db.refresh(asset)
    except Exception as db_error:
        logger.error(
            "database_commit_failed",
            workspace_id=str(workspace_id),
            user_id=str(current_user.id),
            filename=file.filename,
            error=str(db_error),
            error_type=type(db_error).__name__,
        )
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to save asset. Please try again."
        )
    
    # Upload file to MinIO storage
    from app.services.storage_service import get_storage_service
    from app.models.asset import StorageStatus

    storage_service = get_storage_service()

    # Read file content for upload
    file_content = await file.read()

    try:
        # Upload to MinIO using the storage service
        upload_result = storage_service.upload_asset(
            workspace_id=str(workspace_id),
            asset_id=str(asset.id),
            filename=asset.name,
            file_data=file_content,
            content_type=asset.mime_type,
        )

        # Update asset with storage information
        asset.storage_status = StorageStatus.UPLOADED
        asset.storage_path = upload_result["storage_path"]

        await db.commit()
        await db.refresh(asset)

        logger.info(
            "asset_upload_minio_success",
            asset_id=str(asset.id),
            storage_path=upload_result["storage_path"],
            size=upload_result["size"],
        )

    except Exception as storage_error:
        logger.error(
            "asset_upload_minio_failed",
            asset_id=str(asset.id),
            error=str(storage_error),
            error_type=type(storage_error).__name__,
        )
        # Mark as failed but keep the DB record
        asset.storage_status = StorageStatus.FAILED
        await db.commit()

        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"File upload to storage failed: {str(storage_error)}"
        )

    return asset


@router.get(
    "",
    response_model=AssetListResponse,
    summary="List workspace assets",
    description="List all assets in the workspace with pagination. Requires membership."
)
async def list_assets(
    workspace_id: uuid.UUID,
    workspace: Annotated[Workspace, Depends(get_current_workspace)],
    db: Annotated[AsyncSession, Depends(get_db)],
    skip: int = 0,
    limit: int = 20,
) -> AssetListResponse:
    """
    List all assets in the workspace with pagination.
    
    Multi-tenancy: Only returns assets for the current workspace (AC: 26-30).
    """
    # Get total count
    count_stmt = (
        select(func.count(Asset.id))
        .where(Asset.workspace_id == workspace.id)
    )
    total = await db.scalar(count_stmt) or 0
    
    # Get paginated data
    stmt = (
        select(Asset)
        .where(Asset.workspace_id == workspace.id)
        .order_by(Asset.created_at.desc())
        .offset(skip)
        .limit(limit)
    )
    
    result = await db.execute(stmt)
    assets = result.scalars().all()
    
    # Calculate pagination info
    page = skip // limit + 1 if limit > 0 else 1
    
    return AssetListResponse(
        data=[AssetBrief.model_validate(a) for a in assets],
        total=total,
        page=page,
        page_size=limit,
        has_next=skip + limit < total,
        has_prev=page > 1
    )


@router.get(
    "/{asset_id}",
    response_model=AssetRead,
    summary="Get asset details",
    description="Get details of a specific asset. Requires membership.",
    name="get_asset"
)
async def get_asset(
    workspace_id: uuid.UUID,
    asset_id: uuid.UUID,
    workspace: Annotated[Workspace, Depends(get_current_workspace)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> Asset:
    """
    Get asset details by ID.
    
    Multi-tenancy: Validates asset belongs to workspace (AC: 26-30).
    """
    stmt = select(Asset).where(
        Asset.id == asset_id,
        Asset.workspace_id == workspace.id
    )
    
    result = await db.execute(stmt)
    asset = result.scalar_one_or_none()
    
    if not asset:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Asset not found"
        )
    
    return asset


@router.delete(
    "/{asset_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete an asset",
    description="Delete an asset from workspace. Requires MEMBER role or higher.",
    name="delete_asset"
)
async def delete_asset(
    workspace_id: uuid.UUID,
    asset_id: uuid.UUID,
    workspace: Annotated[Workspace, Depends(get_current_workspace)],
    db: Annotated[AsyncSession, Depends(get_db)],
    member: Annotated[WorkspaceMember, Depends(require_workspace_role([
        UserRole.MEMBER, UserRole.ADMIN, UserRole.OWNER
    ]))],
) -> None:
    """
    Delete an asset.
    
    Multi-tenancy: Validates asset belongs to workspace before deletion (AC: 26-30).
    """
    stmt = select(Asset).where(
        Asset.id == asset_id,
        Asset.workspace_id == workspace.id
    )
    
    result = await db.execute(stmt)
    asset = result.scalar_one_or_none()
    
    if not asset:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Asset not found"
        )
    
    # TODO: In production, also delete from MinIO/S3
    # await file_storage_service.delete(asset.id)
    
    await db.delete(asset)
    await db.commit()
    
    return None
