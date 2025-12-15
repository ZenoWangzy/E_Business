"""
Workspace management endpoints.
"""
from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status, Path, Request
from sqlalchemy import select, func, and_
from sqlalchemy.orm import selectinload
from sqlalchemy.ext.asyncio import AsyncSession

from app.services.audit import audit_service
from app.models.audit import AuditAction
from app.services.rate_limiter import (
    rate_limiter, 
    RATE_LIMITS, 
    get_invite_rate_limit_key, 
    get_workspace_invite_rate_limit_key
)

from app.api.deps import (
    CurrentUser, 
    get_db, 
    get_current_workspace, 
    get_current_workspace_member, 
    require_workspace_role
)
from app.models.user import User, Workspace, WorkspaceMember, UserRole, WorkspaceInvite, InviteStatus
from app.schemas.workspace import (
    WorkspaceCreate, 
    WorkspaceUpdate, 
    WorkspaceRead,
    WorkspaceMemberRead,
    WorkspaceMemberUpdate,
    WorkspaceInviteCreate,
    WorkspaceInviteRead,
    WorkspaceInvitePreview,
)

router = APIRouter(prefix="/workspaces", tags=["Workspaces"])


# =============================================================================
# Workspace CRUD
# =============================================================================

@router.post(
    "/",
    response_model=WorkspaceRead,
    status_code=status.HTTP_201_CREATED,
    summary="Create a new workspace",
    description="Create a new workspace and assign the creator as OWNER."
)
async def create_workspace(
    workspace_in: WorkspaceCreate,
    request: Request,
    current_user: CurrentUser,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> Workspace:
    """Create a new workspace."""
    # Check if slug is taken (if slug logic exists, but currently slug is auto-generated or derived?
    # The model has 'slug' field which is unique. 
    # For now, let's assume slug = name.lower().replace(" ", "-") + random? 
    # Or just require slug in input? Schema has name and description. 
    # Looking at model: `slug: Mapped[str] = mapped_column(String(100), unique=True, index=True, nullable=False)`
    # Looking at schema: `WorkspaceCreate` doesn't seem to have slug? Let's check schema/model again.
    # Actually, I updated the model to use ID as PK. Slug is useful for URLs.
    # Let's generate a simple slug for now.
    
    import secrets
    slug_candidate = workspace_in.name.lower().replace(" ", "-")[:40]
    # Simple uniqueness handling (not robust for high concurrency but okay for MVP)
    # Append random suffix
    suffix = secrets.token_hex(4)
    slug = f"{slug_candidate}-{suffix}"
    
    workspace = Workspace(
        name=workspace_in.name,
        description=workspace_in.description,
        slug=slug,
        # owner_id=current_user.id  # Model logic relies on WorkspaceMember table
    )
    
    db.add(workspace)
    await db.commit()
    await db.refresh(workspace)
    
    # Add creator as OWNER
    member = WorkspaceMember(
        user_id=current_user.id,
        workspace_id=workspace.id,
        role=UserRole.OWNER
    )
    db.add(member)
    
    # Audit log: workspace created
    client_host = request.client.host if request.client else None
    await audit_service.log(
        db=db,
        actor_id=current_user.id,
        workspace_id=workspace.id,
        action=AuditAction.WORKSPACE_CREATED,
        resource_type="workspace",
        resource_id=workspace.id,
        ip_address=client_host,
        user_agent=request.headers.get("user-agent"),
    )
    
    await db.commit()
    
    return workspace


@router.get(
    "/",
    response_model=list[WorkspaceRead],
    summary="List my workspaces",
    description="List all workspaces where the current user is a member."
)
async def list_workspaces(
    current_user: CurrentUser,
    db: Annotated[AsyncSession, Depends(get_db)],
    skip: int = 0,
    limit: int = 100,
) -> dict:
    """List workspaces for current user."""
    stmt = (
        select(Workspace)
        .join(WorkspaceMember, Workspace.id == WorkspaceMember.workspace_id)
        .where(
            WorkspaceMember.user_id == current_user.id,
            Workspace.is_active == True
        )
        .options(selectinload(Workspace.members))
        .offset(skip)
        .limit(limit)
    )
    
    result = await db.execute(stmt)
    workspaces = result.scalars().all()
    
    return workspaces


@router.get(
    "/{workspace_id}",
    response_model=WorkspaceRead,
    summary="Get workspace details",
    description="Get details of a specific workspace. Requires membership."
)
async def get_workspace(
    # get_current_workspace validates membership automatically via get_current_workspace_member
    workspace: Annotated[Workspace, Depends(get_current_workspace)],
) -> dict:
    return workspace


@router.put(
    "/{workspace_id}",
    response_model=WorkspaceRead,
    summary="Update workspace",
    description="Update workspace details. Requires ADMIN or OWNER role."
)
async def update_workspace(
    workspace_in: WorkspaceUpdate,
    request: Request,
    workspace: Annotated[Workspace, Depends(get_current_workspace)],
    db: Annotated[AsyncSession, Depends(get_db)],
    # Role check: ADMIN or OWNER
    requester: Annotated[WorkspaceMember, Depends(require_workspace_role([UserRole.ADMIN, UserRole.OWNER]))]
) -> dict:
    old_name = workspace.name
    if workspace_in.name:
        workspace.name = workspace_in.name
    if workspace_in.description is not None:
        workspace.description = workspace_in.description
    if workspace_in.max_members is not None:
        workspace.max_members = workspace_in.max_members
    if workspace_in.is_active is not None:
        workspace.is_active = workspace_in.is_active
    
    # Audit log: workspace updated
    client_host = request.client.host if request.client else None
    await audit_service.log(
        db=db,
        actor_id=requester.user_id,
        workspace_id=workspace.id,
        action=AuditAction.WORKSPACE_UPDATED,
        resource_type="workspace",
        resource_id=workspace.id,
        ip_address=client_host,
        user_agent=request.headers.get("user-agent"),
        extra_data={"old_name": old_name, "new_name": workspace.name} if old_name != workspace.name else None,
    )
        
    await db.commit()
    await db.refresh(workspace)
    return workspace


@router.delete(
    "/{workspace_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete workspace",
    description="Delete a workspace. Requires OWNER role."
)
async def delete_workspace(
    request: Request,
    workspace: Annotated[Workspace, Depends(get_current_workspace)],
    db: Annotated[AsyncSession, Depends(get_db)],
    requester: Annotated[WorkspaceMember, Depends(require_workspace_role([UserRole.OWNER]))]
) -> None:
    workspace_id = workspace.id
    workspace_name = workspace.name
    
    # Audit log: workspace deleted (log before delete)
    client_host = request.client.host if request.client else None
    await audit_service.log(
        db=db,
        actor_id=requester.user_id,
        workspace_id=workspace_id,
        action=AuditAction.WORKSPACE_DELETED,
        resource_type="workspace",
        resource_id=workspace_id,
        ip_address=client_host,
        user_agent=request.headers.get("user-agent"),
        extra_data={"workspace_name": workspace_name},
    )
    await db.flush()
    
    await db.delete(workspace)
    await db.commit()
    return None


# =============================================================================
# Member Management
# =============================================================================

@router.get(
    "/{workspace_id}/members",
    response_model=list[WorkspaceMemberRead],
    summary="List workspace members",
    description="List all members of the workspace."
)
async def list_workspace_members(
    workspace_id: UUID,  # Just for path matching, used by dependency
    workspace: Annotated[Workspace, Depends(get_current_workspace)],
    db: Annotated[AsyncSession, Depends(get_db)],
    skip: int = 0,
    limit: int = 100,
) -> dict:
    # Query members with User info
    stmt = (
        select(WorkspaceMember)
        .where(WorkspaceMember.workspace_id == workspace.id)
        .options(selectinload(WorkspaceMember.user))
        .offset(skip)
        .limit(limit)
    )
    result = await db.execute(stmt)
    members = result.scalars().all()
    
    return members


@router.put(
    "/{workspace_id}/members/{user_id}",
    response_model=WorkspaceMemberRead,
    summary="Update member role",
    description="Update a member's role. Requires ADMIN or OWNER. Cannot change OWNER's role."
)
async def update_member_role(
    workspace_id: UUID,
    user_id: UUID,
    member_in: WorkspaceMemberUpdate,
    request: Request,
    workspace: Annotated[Workspace, Depends(get_current_workspace)],
    db: Annotated[AsyncSession, Depends(get_db)],
    # Requester must be Admin/Owner
    requester: Annotated[WorkspaceMember, Depends(require_workspace_role([UserRole.ADMIN, UserRole.OWNER]))]
) -> dict:
    # Find target member
    stmt = select(WorkspaceMember).where(
        WorkspaceMember.workspace_id == workspace.id,
        WorkspaceMember.user_id == user_id
    )
    result = await db.execute(stmt)
    target_member = result.scalar_one_or_none()
    
    if not target_member:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Member not found"
        )
        
    # Validation:
    if target_member.role == UserRole.OWNER:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Cannot modify workspace owner"
        )
        
    if requester.role == UserRole.ADMIN and target_member.role in [UserRole.ADMIN, UserRole.OWNER]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admins cannot modify other Admins or Owner"
        )
    
    if member_in.role == UserRole.OWNER:
        if requester.role != UserRole.OWNER:
             raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Only Owner can transfer ownership"
            )
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot assign OWNER role directly. Use transfer ownership."
        )

    old_role = target_member.role
    target_member.role = member_in.role
    
    # Audit log: member role changed
    client_host = request.client.host if request.client else None
    await audit_service.log(
        db=db,
        actor_id=requester.user_id,
        workspace_id=workspace.id,
        action=AuditAction.MEMBER_ROLE_CHANGED,
        resource_type="member",
        resource_id=target_member.id,
        target_user_id=user_id,
        ip_address=client_host,
        user_agent=request.headers.get("user-agent"),
        extra_data={"old_role": old_role.value, "new_role": member_in.role.value},
    )
    
    await db.commit()
    await db.refresh(target_member)
    return target_member


@router.delete(
    "/{workspace_id}/members/{user_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Remove member",
    description="Remove a user from workspace. Requires ADMIN or OWNER."
)
async def remove_member(
    workspace_id: UUID,
    user_id: UUID,
    request: Request,
    workspace: Annotated[Workspace, Depends(get_current_workspace)],
    db: Annotated[AsyncSession, Depends(get_db)],
    requester: Annotated[WorkspaceMember, Depends(require_workspace_role([UserRole.ADMIN, UserRole.OWNER]))]
) -> None:
    stmt = select(WorkspaceMember).where(
        WorkspaceMember.workspace_id == workspace.id,
        WorkspaceMember.user_id == user_id
    )
    result = await db.execute(stmt)
    target_member = result.scalar_one_or_none()
    
    if not target_member:
        raise HTTPException(status_code=404, detail="Member not found")
        
    if target_member.role == UserRole.OWNER:
        raise HTTPException(status_code=403, detail="Cannot remove workspace owner")
        
    if requester.user_id != target_member.user_id:
        if requester.role == UserRole.ADMIN and target_member.role in [UserRole.ADMIN, UserRole.OWNER]:
             raise HTTPException(status_code=403, detail="Admins cannot remove other Admins")

    member_id = target_member.id
    
    # Audit log: member removed
    client_host = request.client.host if request.client else None
    await audit_service.log(
        db=db,
        actor_id=requester.user_id,
        workspace_id=workspace.id,
        action=AuditAction.MEMBER_REMOVED,
        resource_type="member",
        resource_id=member_id,
        target_user_id=user_id,
        ip_address=client_host,
        user_agent=request.headers.get("user-agent"),
    )

    await db.delete(target_member)
    await db.commit()
    return None


# =============================================================================
# Invites
# =============================================================================

@router.post(
    "/{workspace_id}/invites",
    response_model=WorkspaceInviteRead,
    summary="Create invite",
    description="Invite a user by email. Requires ADMIN or OWNER."
)
async def create_invite(
    workspace_id: UUID,
    invite_in: WorkspaceInviteCreate,
    request: Request,
    current_user: CurrentUser,
    workspace: Annotated[Workspace, Depends(get_current_workspace)],
    db: Annotated[AsyncSession, Depends(get_db)],
    requester: Annotated[WorkspaceMember, Depends(require_workspace_role([UserRole.ADMIN, UserRole.OWNER]))]
) -> WorkspaceInvite:
    # Rate limiting check
    try:
        user_rate_key = get_invite_rate_limit_key(workspace.id, current_user.id)
        user_limited, user_remaining = await rate_limiter.is_rate_limited(
            user_rate_key,
            RATE_LIMITS["invite_create"]["max_requests"],
            RATE_LIMITS["invite_create"]["window_seconds"],
        )
        if user_limited:
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail="Rate limit exceeded. You can send a maximum of 10 invites per hour."
            )
        
        ws_rate_key = get_workspace_invite_rate_limit_key(workspace.id)
        ws_limited, ws_remaining = await rate_limiter.is_rate_limited(
            ws_rate_key,
            RATE_LIMITS["invite_workspace_daily"]["max_requests"],
            RATE_LIMITS["invite_workspace_daily"]["window_seconds"],
        )
        if ws_limited:
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail="Workspace invite limit exceeded. Maximum 50 invites per day."
            )
    except HTTPException:
        raise
    except Exception:
        # If Redis is unavailable, allow the request but log warning
        pass
    
    # Check max members limit
    member_count_stmt = select(func.count(WorkspaceMember.id)).where(WorkspaceMember.workspace_id == workspace.id)
    count_res = await db.execute(member_count_stmt)
    count = count_res.scalar_one()
    
    if count >= workspace.max_members:
        raise HTTPException(status_code=400, detail="Workspace member limit reached")

    # Check for existing pending invite for this email
    stmt = select(WorkspaceInvite).where(
        WorkspaceInvite.workspace_id == workspace.id,
        WorkspaceInvite.invited_email == invite_in.invited_email,
        WorkspaceInvite.status == InviteStatus.PENDING
    )
    existing = (await db.execute(stmt)).scalar_one_or_none()
    if existing:
        if existing.is_expired:
            existing.status = InviteStatus.EXPIRED
            db.add(existing)
        else:
            raise HTTPException(status_code=400, detail="Active invite already exists for this email")

    # Check if user already member
    existing_user_stmt = select(User).where(User.email == invite_in.invited_email)
    existing_user = (await db.execute(existing_user_stmt)).scalar_one_or_none()
    
    if existing_user:
        member_check = select(WorkspaceMember).where(
            WorkspaceMember.workspace_id == workspace.id,
            WorkspaceMember.user_id == existing_user.id
        )
        if (await db.execute(member_check)).scalar_one_or_none():
             raise HTTPException(status_code=400, detail="User is already a member")
    
    # Create invite
    import uuid
    from datetime import datetime, timedelta, timezone
    
    expires_at = datetime.now(timezone.utc) + timedelta(hours=24)
    
    invite = WorkspaceInvite(
        workspace_id=workspace.id,
        invited_email=invite_in.invited_email,
        role=invite_in.role or UserRole.MEMBER,
        token=uuid.uuid4(),
        expires_at=expires_at,
        inviter_id=current_user.id,
        status=InviteStatus.PENDING
    )
    
    db.add(invite)
    await db.flush()
    
    # Audit log: invite created
    client_host = request.client.host if request.client else None
    await audit_service.log(
        db=db,
        actor_id=current_user.id,
        workspace_id=workspace.id,
        action=AuditAction.INVITE_CREATED,
        resource_type="invite",
        resource_id=invite.id,
        ip_address=client_host,
        user_agent=request.headers.get("user-agent"),
        extra_data={"invited_email": invite_in.invited_email, "role": invite_in.role.value if invite_in.role else "member"},
    )
    
    await db.commit()
    await db.refresh(invite)
    
    return invite


@router.get(
    "/{workspace_id}/invites",
    response_model=list[WorkspaceInviteRead],
    summary="List invites",
    description="List pending invites."
)
async def list_invites(
    workspace_id: UUID,
    workspace: Annotated[Workspace, Depends(get_current_workspace)],
    db: Annotated[AsyncSession, Depends(get_db)],
    _: Annotated[WorkspaceMember, Depends(require_workspace_role([UserRole.ADMIN, UserRole.OWNER]))]
) -> dict:
    stmt = select(WorkspaceInvite).where(
        WorkspaceInvite.workspace_id == workspace.id,
        WorkspaceInvite.status == InviteStatus.PENDING
    )
    invites = (await db.execute(stmt)).scalars().all()
    # Filter expired? Or let frontend see them? 
    # Logic property `is_expired` exists. 
    # Let's clean up expired ones or show them?
    # Showing them allows re-sending.
    
    return invites


@router.delete(
    "/{workspace_id}/invites/{invite_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Cancel invite",
)
async def cancel_invite(
    workspace_id: UUID,
    invite_id: UUID,
    request: Request,
    workspace: Annotated[Workspace, Depends(get_current_workspace)],
    db: Annotated[AsyncSession, Depends(get_db)],
    requester: Annotated[WorkspaceMember, Depends(require_workspace_role([UserRole.ADMIN, UserRole.OWNER]))]
) -> None:
    stmt = select(WorkspaceInvite).where(
        WorkspaceInvite.id == invite_id,
        WorkspaceInvite.workspace_id == workspace.id
    )
    invite = (await db.execute(stmt)).scalar_one_or_none()
    if not invite:
        raise HTTPException(status_code=404, detail="Invite not found")
    
    # Audit log: invite cancelled
    client_host = request.client.host if request.client else None
    await audit_service.log(
        db=db,
        actor_id=requester.user_id,
        workspace_id=workspace.id,
        action=AuditAction.INVITE_CANCELLED,
        resource_type="invite",
        resource_id=invite.id,
        ip_address=client_host,
        user_agent=request.headers.get("user-agent"),
        extra_data={"invited_email": invite.invited_email},
    )
        
    invite.status = InviteStatus.CANCELLED
    await db.commit()
    return None

# =============================================================================
# Public Invite Actions
# =============================================================================

@router.get(
    "/invites/{token}",
    response_model=WorkspaceInvitePreview,
    summary="Preview invite",
    description="Get basic invite info (workspace name, inviter) for public preview."
)
async def preview_invite(
    token: UUID,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> dict:
    stmt = (
        select(WorkspaceInvite)
        .where(
            WorkspaceInvite.token == token,
            WorkspaceInvite.status == InviteStatus.PENDING
        )
        .options(selectinload(WorkspaceInvite.workspace), selectinload(WorkspaceInvite.inviter))
    )
    invite = (await db.execute(stmt)).scalar_one_or_none()
    
    if not invite or invite.is_expired:
        raise HTTPException(status_code=404, detail="Invite invalid or expired")
        
    return {
        "workspace_name": invite.workspace.name,
        "workspace_description": invite.workspace.description,
        "inviter_name": invite.inviter.name if invite.inviter else "Someone",
        "role": invite.role,
        "expires_at": invite.expires_at,
        "is_valid": invite.is_valid
    }


@router.post(
    "/invites/{token}/accept",
    response_model=WorkspaceRead,
    summary="Accept invite",
    description="Accept an invite and join workspace."
)
async def accept_invite(
    token: UUID,
    request: Request,
    current_user: CurrentUser,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> Workspace:
    # 1. Find invite
    stmt = (
        select(WorkspaceInvite)
        .where(
            WorkspaceInvite.token == token,
            WorkspaceInvite.status == InviteStatus.PENDING
        )
        .options(selectinload(WorkspaceInvite.workspace))
    )
    invite = (await db.execute(stmt)).scalar_one_or_none()
    
    if not invite:
        raise HTTPException(status_code=404, detail="Invite not found")
        
    if invite.is_expired:
        invite.status = InviteStatus.EXPIRED
        await db.commit()
        raise HTTPException(status_code=400, detail="Invite expired")
        
    # 2. Check if email matches current user
    if invite.invited_email.lower() != current_user.email.lower():
         raise HTTPException(
             status_code=403, 
             detail=f"This invite is for {invite.invited_email}, but you are logged in as {current_user.email}"
         )
         
    # 3. Add to workspace
    existing_member = await db.execute(
        select(WorkspaceMember).where(
            WorkspaceMember.workspace_id == invite.workspace_id,
            WorkspaceMember.user_id == current_user.id
        )
    )
    if existing_member.scalar_one_or_none():
        invite.status = InviteStatus.ACCEPTED
        invite.accepted_at = func.now()
        await db.commit()
        return invite.workspace

    # Create member
    member = WorkspaceMember(
        user_id=current_user.id,
        workspace_id=invite.workspace_id,
        role=invite.role
    )
    db.add(member)
    await db.flush()
    
    # Audit log: member added via invite
    client_host = request.client.host if request.client else None
    await audit_service.log(
        db=db,
        actor_id=current_user.id,
        workspace_id=invite.workspace_id,
        action=AuditAction.MEMBER_ADDED,
        resource_type="member",
        resource_id=member.id,
        target_user_id=current_user.id,
        ip_address=client_host,
        user_agent=request.headers.get("user-agent"),
        extra_data={"via": "invite", "role": invite.role.value},
    )
    
    # Audit log: invite accepted
    await audit_service.log(
        db=db,
        actor_id=current_user.id,
        workspace_id=invite.workspace_id,
        action=AuditAction.INVITE_ACCEPTED,
        resource_type="invite",
        resource_id=invite.id,
        ip_address=client_host,
        user_agent=request.headers.get("user-agent"),
    )
    
    # Update invite
    invite.status = InviteStatus.ACCEPTED
    invite.accepted_at = func.now()
    
    await db.commit()
    await db.refresh(invite.workspace)
    return invite.workspace

