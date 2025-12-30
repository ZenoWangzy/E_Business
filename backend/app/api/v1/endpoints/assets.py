"""
[IDENTITY]: Asset Management API
Secure File Upload & Metadata Registry.

[INPUT]:
- Multipart File, Workspace Context.

[LINK]:
- Model_Asset -> ../../../models/asset.py
- Validation -> ALLOWED_MIME_TYPES (Inline)

[OUTPUT]: Asset Metadata (DB Record).
[POS]: /backend/app/api/v1/endpoints/assets.py

[PROTOCOL]:
1. Strict Validation: Whitelisted MIME types and Max Size (10MB).
2. Workspace Isolation: Assets are strictly bound to a workspace.
"""
import uuid
from typing import Annotated, Optional

from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Form, Request
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import (
    CurrentUser,
    get_db,
    get_current_workspace,
    get_current_workspace_member,
    require_workspace_role
)
from app.models.user import Workspace, WorkspaceMember, UserRole
from app.models.asset import Asset
from app.schemas.asset import AssetRead, AssetBrief, AssetUploadResponse

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

router = APIRouter(prefix="/workspaces/{workspace_id}/assets", tags=["Assets"])


# =============================================================================
# Asset CRUD
# =============================================================================

@router.post(
    "/",
    response_model=AssetUploadResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Upload a file to workspace",
    description="Upload a file with optional extracted content. Requires MEMBER role or higher."
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
    # Validate MIME type
    if file.content_type not in ALLOWED_MIME_TYPES:
        raise HTTPException(
            status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
            detail=f"Unsupported file type: {file.content_type}. Allowed: {', '.join(ALLOWED_MIME_TYPES)}"
        )
    
    # Read file to validate size
    file_content = await file.read()
    file_size = len(file_content)
    
    if file_size > MAX_FILE_SIZE:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail=f"File size ({file_size} bytes) exceeds maximum allowed ({MAX_FILE_SIZE} bytes)"
        )
    
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
    await db.commit()
    await db.refresh(asset)
    
    # TODO: In production, also store file to MinIO/S3
    # await file_storage_service.upload(asset.id, file_content)
    
    return asset


@router.get(
    "/",
    response_model=list[AssetBrief],
    summary="List workspace assets",
    description="List all assets in the workspace. Requires membership."
)
async def list_assets(
    workspace_id: uuid.UUID,
    workspace: Annotated[Workspace, Depends(get_current_workspace)],
    db: Annotated[AsyncSession, Depends(get_db)],
    skip: int = 0,
    limit: int = 100,
) -> list[Asset]:
    """
    List all assets in the workspace.
    
    Multi-tenancy: Only returns assets for the current workspace (AC: 26-30).
    """
    stmt = (
        select(Asset)
        .where(Asset.workspace_id == workspace.id)
        .order_by(Asset.created_at.desc())
        .offset(skip)
        .limit(limit)
    )
    
    result = await db.execute(stmt)
    assets = result.scalars().all()
    
    return list(assets)


@router.get(
    "/{asset_id}",
    response_model=AssetRead,
    summary="Get asset details",
    description="Get details of a specific asset. Requires membership."
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
    description="Delete an asset from workspace. Requires MEMBER role or higher."
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
