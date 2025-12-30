"""
[IDENTITY]: Superuser Dashboard & System Management API
Restricted Endpoints for System Observability and User Control.

[INPUT]:
- Superuser Credentials, Admin Mod Actions.

[LINK]:
- Service_Audit -> ../../../services/audit.py
- Service_Retry -> ../../../services/task_retry_service.py
- Model_Log -> ../../../models/system_log.py

[OUTPUT]: System Stats, Logs, User Audit Trails.
[POS]: /backend/app/api/v1/endpoints/admin.py

[PROTOCOL]:
1. **Access Control**: STRICTLY `CurrentSuperuser` only.
2. **Rate Limiting**: Aggressive limits (`10-30/min`) to prevent DOS.
3. **Audit**: Critical actions (Ban/Promote) MUST be logged permanently.
"""
import json
from datetime import datetime, timezone, timedelta
from typing import Optional, Literal
from uuid import UUID

from fastapi import APIRouter, Depends, Query, HTTPException, Request
from pydantic import BaseModel, Field
from sqlalchemy import select, func, text
from sqlalchemy.ext.asyncio import AsyncSession
from slowapi import Limiter
from slowapi.util import get_remote_address

from app.db.base import get_db
from app.api.deps_auth import get_current_superuser, CurrentSuperuser
from app.models.system_log import SystemLog, SystemLogLevel
from app.models.user import Workspace, WorkspaceBilling


# Rate limiter for admin endpoints
limiter = Limiter(key_func=get_remote_address)

router = APIRouter(prefix="/admin", tags=["admin"])


# ============ Response Schemas ============

class AdminStatsResponse(BaseModel):
    """System statistics response."""
    active_workspaces: int = Field(..., description="Total active workspaces")
    generations_today: int = Field(..., description="Total generations today (image + copy + video)")
    error_rate_24h: float = Field(..., description="Error rate in last 24 hours (percentage)")
    estimated_mrr: float = Field(..., description="Estimated monthly recurring revenue")
    last_updated: datetime = Field(..., description="When stats were last computed")


class SystemLogItem(BaseModel):
    """Single system log entry."""
    id: int
    level: str
    message: str
    component: str
    trace_id: Optional[str] = None
    stack_trace: Optional[str] = None
    created_at: datetime


class LogsResponse(BaseModel):
    """Paginated logs response."""
    items: list[SystemLogItem]
    total: int
    page: int
    page_size: int
    has_more: bool


# ============ Admin Stats Endpoint ============

@router.get("/stats", response_model=AdminStatsResponse)
@limiter.limit("30/minute")
async def get_admin_stats(
    request: Request,  # Required for rate limiter
    _: CurrentSuperuser,  # Require superuser
    db: AsyncSession = Depends(get_db),
) -> AdminStatsResponse:
    """
    Get system statistics for admin dashboard.
    
    Requires superuser access.
    
    Returns:
        AdminStatsResponse with key metrics.
    """
    now = datetime.now(timezone.utc)
    today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
    last_24h = now - timedelta(hours=24)
    
    # Count active workspaces
    active_workspaces_result = await db.execute(
        select(func.count(Workspace.id)).where(Workspace.is_active == True)
    )
    active_workspaces = active_workspaces_result.scalar() or 0
    
    # Count generations today (from image_generation_jobs, copy_generation_jobs, video_generation_jobs)
    # Use dynamic queries to handle missing tables gracefully
    generations_today = 0
    try:
        # Try to count from each generation table
        for table_name in ['image_generation_jobs', 'copy_generation_jobs', 'video_generation_jobs']:
            try:
                result = await db.execute(
                    text(f"SELECT COUNT(*) FROM {table_name} WHERE created_at >= :today_start"),
                    {"today_start": today_start}
                )
                generations_today += result.scalar() or 0
            except Exception:
                continue
    except Exception:
        pass
    
    # Calculate error rate from system logs
    total_logs_24h_result = await db.execute(
        select(func.count(SystemLog.id)).where(SystemLog.created_at >= last_24h)
    )
    total_logs = total_logs_24h_result.scalar() or 0
    
    error_logs_24h_result = await db.execute(
        select(func.count(SystemLog.id)).where(
            SystemLog.created_at >= last_24h,
            SystemLog.level == SystemLogLevel.ERROR
        )
    )
    error_logs = error_logs_24h_result.scalar() or 0
    
    error_rate = (error_logs / total_logs * 100) if total_logs > 0 else 0.0
    
    # Calculate estimated MRR from active subscriptions
    mrr_result = await db.execute(
        select(func.count(WorkspaceBilling.id)).where(
            WorkspaceBilling.is_active == True,
            WorkspaceBilling.tier != 'free'
        )
    )
    paid_subscriptions = mrr_result.scalar() or 0
    
    # Rough estimate: PRO = $29/month, ENTERPRISE = $99/month
    # For now, assume all paid are PRO
    estimated_mrr = paid_subscriptions * 29.0
    
    return AdminStatsResponse(
        active_workspaces=active_workspaces,
        generations_today=generations_today,
        error_rate_24h=round(error_rate, 2),
        estimated_mrr=estimated_mrr,
        last_updated=now
    )


# ============ Admin Logs Endpoint ============

@router.get("/logs", response_model=LogsResponse)
@limiter.limit("10/minute")  # More restrictive to prevent log table abuse
async def get_admin_logs(
    request: Request,  # Required for rate limiter
    _: CurrentSuperuser,  # Require superuser
    db: AsyncSession = Depends(get_db),
    page: int = Query(1, ge=1, description="Page number"),
    page_size: int = Query(50, ge=10, le=100, description="Items per page"),
    level: Optional[Literal["error", "warning", "info"]] = Query(None, description="Filter by log level"),
    component: Optional[str] = Query(None, description="Filter by component"),
    start_date: Optional[datetime] = Query(None, description="Filter logs after this date"),
    end_date: Optional[datetime] = Query(None, description="Filter logs before this date"),
) -> LogsResponse:
    """
    Get paginated system logs.
    
    Requires superuser access.
    
    Args:
        page: Page number (1-indexed)
        page_size: Number of items per page (10-100)
        level: Filter by log level (error, warning, info)
        component: Filter by component name
        start_date: Filter logs after this date
        end_date: Filter logs before this date
        
    Returns:
        LogsResponse with paginated log entries.
    """
    # Build query with filters
    query = select(SystemLog)
    count_query = select(func.count(SystemLog.id))
    
    # Apply filters
    if level:
        level_enum = SystemLogLevel(level)
        query = query.where(SystemLog.level == level_enum)
        count_query = count_query.where(SystemLog.level == level_enum)
    
    if component:
        query = query.where(SystemLog.component == component)
        count_query = count_query.where(SystemLog.component == component)
    
    if start_date:
        query = query.where(SystemLog.created_at >= start_date)
        count_query = count_query.where(SystemLog.created_at >= start_date)
    
    if end_date:
        query = query.where(SystemLog.created_at <= end_date)
        count_query = count_query.where(SystemLog.created_at <= end_date)
    
    # Get total count
    total_result = await db.execute(count_query)
    total = total_result.scalar() or 0
    
    # Apply pagination and ordering
    offset = (page - 1) * page_size
    query = query.order_by(SystemLog.created_at.desc()).offset(offset).limit(page_size)
    
    # Execute query
    result = await db.execute(query)
    logs = result.scalars().all()
    
    # Convert to response items
    items = [
        SystemLogItem(
            id=log.id,
            level=log.level.value,
            message=log.message,
            component=log.component,
            trace_id=log.trace_id,
            stack_trace=log.stack_trace,
            created_at=log.created_at
        )
        for log in logs
    ]
    
    return LogsResponse(
        items=items,
        total=total,
        page=page,
        page_size=page_size,
        has_more=(offset + len(items)) < total
    )


# ============ Log Detail Endpoint ============

@router.get("/logs/{log_id}", response_model=SystemLogItem)
async def get_log_detail(
    log_id: int,
    _: CurrentSuperuser,  # Require superuser
    db: AsyncSession = Depends(get_db),
) -> SystemLogItem:
    """
    Get detailed information for a specific log entry.
    
    Requires superuser access.
    
    Args:
        log_id: The log entry ID
        
    Returns:
        SystemLogItem with full log details including stack trace.
        
    Raises:
        HTTPException: 404 if log not found.
    """
    result = await db.execute(select(SystemLog).where(SystemLog.id == log_id))
    log = result.scalar_one_or_none()
    
    if not log:
        raise HTTPException(status_code=404, detail="Log entry not found")
    
    return SystemLogItem(
        id=log.id,
        level=log.level.value,
        message=log.message,
        component=log.component,
        trace_id=log.trace_id,
        stack_trace=log.stack_trace,
        created_at=log.created_at
    )


# ============ User Management Endpoints (Story 5.4) ============

from app.models.user import User, WorkspaceMember
from app.schemas.admin_users import (
    AdminUserListResponse, AdminUserListItem, AdminUserDetail,
    AdminUserUpdate, TaskHistoryResponse, TaskRetryRequest, TaskRetryResponse,
    WorkspaceBrief
)
from app.services.task_retry_service import task_retry_service
from app.services.audit import audit_service
from app.models.audit import AuditAction


@router.get("/users", response_model=AdminUserListResponse)
@limiter.limit("30/minute")
async def list_users(
    request: Request,
    _: CurrentSuperuser,
    db: AsyncSession = Depends(get_db),
    page: int = Query(1, ge=1, description="Page number"),
    page_size: int = Query(50, ge=10, le=100, description="Items per page"),
    search: Optional[str] = Query(None, description="Search by email or name"),
    is_superuser: Optional[bool] = Query(None, description="Filter by superuser status"),
    is_active: Optional[bool] = Query(None, description="Filter by active status"),
) -> AdminUserListResponse:
    """
    List all platform users with pagination and filtering.
    
    Requires superuser access.
    
    Args:
        page: Page number (1-indexed)
        page_size: Items per page
        search: Search term for email/name
        is_superuser: Filter by superuser status
        is_active: Filter by active status
        
    Returns:
        Paginated list of users with workspace counts.
    """
    # Build query
    query = select(User)
    count_query = select(func.count(User.id))
    
    # Apply filters
    if search:
        search_pattern = f"%{search}%"
        query = query.where(
            (User.email.ilike(search_pattern)) | (User.name.ilike(search_pattern))
        )
        count_query = count_query.where(
            (User.email.ilike(search_pattern)) | (User.name.ilike(search_pattern))
        )
    
    if is_superuser is not None:
        query = query.where(User.is_superuser == is_superuser)
        count_query = count_query.where(User.is_superuser == is_superuser)
    
    if is_active is not None:
        query = query.where(User.is_active == is_active)
        count_query = count_query.where(User.is_active == is_active)
    
    # Get total count
    total_result = await db.execute(count_query)
    total = total_result.scalar() or 0
    
    # Apply pagination
    offset = (page - 1) * page_size
    query = query.order_by(User.created_at.desc()).offset(offset).limit(page_size)
    
    # Execute query
    result = await db.execute(query)
    users = result.scalars().all()
    
    # Get workspace counts for each user
    items = []
    for user in users:
        workspace_count_result = await db.execute(
            select(func.count(WorkspaceMember.id)).where(WorkspaceMember.user_id == user.id)
        )
        workspace_count = workspace_count_result.scalar() or 0
        
        items.append(AdminUserListItem(
            id=user.id,
            email=user.email,
            name=user.name,
            is_active=user.is_active,
            is_superuser=user.is_superuser,
            created_at=user.created_at,
            updated_at=user.updated_at,
            workspace_count=workspace_count,
        ))
    
    return AdminUserListResponse(
        items=items,
        total=total,
        page=page,
        page_size=page_size,
        has_more=(offset + len(items)) < total,
    )


@router.get("/users/{user_id}", response_model=AdminUserDetail)
async def get_user_detail(
    user_id: UUID,
    _: CurrentSuperuser,
    db: AsyncSession = Depends(get_db),
) -> AdminUserDetail:
    """
    Get detailed information for a specific user.
    
    Requires superuser access.
    
    Args:
        user_id: User ID to retrieve
        
    Returns:
        User details including workspace memberships.
        
    Raises:
        HTTPException: 404 if user not found.
    """
    # Get user
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Get user's workspaces
    workspace_result = await db.execute(
        select(WorkspaceMember, Workspace)
        .join(Workspace, WorkspaceMember.workspace_id == Workspace.id)
        .where(WorkspaceMember.user_id == user_id)
        .order_by(WorkspaceMember.joined_at.desc())
    )
    workspace_rows = workspace_result.all()
    
    workspaces = [
        WorkspaceBrief(
            id=ws.id,
            name=ws.name,
            slug=ws.slug,
            role=member.role.value,
            joined_at=member.joined_at,
        )
        for member, ws in workspace_rows
    ]
    
    return AdminUserDetail(
        id=user.id,
        email=user.email,
        name=user.name,
        is_active=user.is_active,
        is_superuser=user.is_superuser,
        created_at=user.created_at,
        updated_at=user.updated_at,
        workspaces=workspaces,
    )


@router.patch("/users/{user_id}", response_model=AdminUserDetail)
async def update_user(
    user_id: UUID,
    user_update: AdminUserUpdate,
    request: Request,
    current_superuser: CurrentSuperuser,
    db: AsyncSession = Depends(get_db),
) -> AdminUserDetail:
    """
    Update user status (activate/deactivate, promote/demote superuser).
    
    Requires superuser access.
    
    Args:
        user_id: User ID to update
        user_update: Update data
        
    Returns:
        Updated user details.
        
    Raises:
        HTTPException: 404 if user not found, 400 for invalid operations.
    """
    # Get user
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Prevent self-demotion
    if user.id == current_superuser.id and user_update.is_superuser is False:
        raise HTTPException(
            status_code=400,
            detail="Cannot demote yourself from superuser"
        )
    
    # Track changes for audit logging
    changes = {}
    
    # Update is_active
    if user_update.is_active is not None and user_update.is_active != user.is_active:
        old_value = user.is_active
        user.is_active = user_update.is_active
        changes["is_active"] = {"old": old_value, "new": user_update.is_active}
        
        # Log deactivation/reactivation
        action = AuditAction.USER_REACTIVATED if user_update.is_active else AuditAction.USER_DEACTIVATED
        # Note: User management is system-level, so we use a placeholder workspace_id
        # In production, consider creating a system workspace or modifying audit log schema
        if user.workspaces:
            workspace_id = user.workspaces[0].workspace_id
        else:
            # Create a temporary system context - this should be handled better in production
            workspace_id = UUID("00000000-0000-0000-0000-000000000000")
        
        await audit_service.log(
            db=db,
            actor_id=current_superuser.id,
            workspace_id=workspace_id,
            action=action,
            resource_type="user",
            resource_id=user.id,
            target_user_id=user.id,
            ip_address=request.client.host if request.client else None,
            user_agent=request.headers.get("user-agent"),
            extra_data={"email": user.email},
        )
    
    # Update is_superuser
    if user_update.is_superuser is not None and user_update.is_superuser != user.is_superuser:
        old_value = user.is_superuser
        user.is_superuser = user_update.is_superuser
        changes["is_superuser"] = {"old": old_value, "new": user_update.is_superuser}
        
        # Log promotion/demotion
        action = AuditAction.USER_PROMOTED_SUPERUSER if user_update.is_superuser else AuditAction.USER_DEMOTED_SUPERUSER
        if user.workspaces:
            workspace_id = user.workspaces[0].workspace_id
        else:
            workspace_id = UUID("00000000-0000-0000-0000-000000000000")
        
        await audit_service.log(
            db=db,
            actor_id=current_superuser.id,
            workspace_id=workspace_id,
            action=action,
            resource_type="user",
            resource_id=user.id,
            target_user_id=user.id,
            ip_address=request.client.host if request.client else None,
            user_agent=request.headers.get("user-agent"),
            extra_data={"email": user.email, "promoted_by": current_superuser.email},
        )
    
    user.updated_at = datetime.now(timezone.utc)
    await db.commit()
    await db.refresh(user)
    
    # Return updated user detail
    return await get_user_detail(user_id, current_superuser, db)


@router.get("/users/{user_id}/tasks", response_model=TaskHistoryResponse)
async def get_user_tasks(
    user_id: UUID,
    _: CurrentSuperuser,
    db: AsyncSession = Depends(get_db),
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=10, le=100),
    status: Optional[str] = Query(None, description="Filter by status"),
    task_type: Optional[str] = Query(None, description="Filter by task type (image, video, copy)"),
) -> TaskHistoryResponse:
    """
    Get task history for a specific user.
    
    Requires superuser access.
    
    Args:
        user_id: User ID to get tasks for
        page: Page number
        page_size: Items per page
        status: Filter by status
        task_type: Filter by task type
        
    Returns:
        Paginated task history.
    """
    # Verify user exists
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Get tasks using service
    items, total = await task_retry_service.get_user_tasks(
        db=db,
        user_id=user_id,
        page=page,
        page_size=page_size,
        status_filter=status,
        task_type_filter=task_type,
    )
    
    return TaskHistoryResponse(
        items=items,
        total=total,
        page=page,
        page_size=page_size,
        has_more=(page * page_size) < total,
    )


@router.post("/tasks/{task_id}/retry", response_model=TaskRetryResponse)
async def retry_task(
    task_id: UUID,
    retry_request: TaskRetryRequest,
    request: Request,
    current_superuser: CurrentSuperuser,
    db: AsyncSession = Depends(get_db),
    task_type: str = Query(..., description="Task type: image, video, or copy"),
) -> TaskRetryResponse:
    """
    Retry a failed task.
    
    Requires superuser access.
    
    Args:
        task_id: Task ID to retry
        task_type: Type of task (image, video, copy)
        retry_request: Optional retry parameters
        
    Returns:
        Retry operation result.
        
    Raises:
        HTTPException: 400 if task cannot be retried, 404 if not found.
    """
    try:
        result = await task_retry_service.retry_task(
            db=db,
            task_id=task_id,
            task_type=task_type,
            force=retry_request.force,
        )
        
        # Log retry action
        # Use a system workspace context
        workspace_id = UUID("00000000-0000-0000-0000-000000000000")
        
        await audit_service.log(
            db=db,
            actor_id=current_superuser.id,
            workspace_id=workspace_id,
            action=AuditAction.TASK_RETRIED,
            resource_type=f"task_{task_type}",
            resource_id=task_id,
            ip_address=request.client.host if request and request.client else None,
            user_agent=request.headers.get("user-agent") if request else None,
            extra_data={
                "task_type": task_type,
                "old_status": result.get("old_status"),
                "new_status": result.get("new_status"),
            },
        )
        
        return TaskRetryResponse(
            success=result["success"],
            task_id=task_id,
            new_task_id=None,  # We reuse the same task ID
            message=result["message"],
            status=result["new_status"],
        )
    
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to retry task: {str(e)}")
