"""
Audit logging service for tracking sensitive workspace operations.

Usage:
    from app.services.audit import audit_service

    await audit_service.log(
        db=db,
        actor_id=current_user.id,
        workspace_id=workspace.id,
        action=AuditAction.MEMBER_ADDED,
        resource_type="member",
        resource_id=new_member.id,
        target_user_id=new_member.user_id,
        ip_address=request.client.host,
        metadata={"role": "member"}
    )
"""
from typing import Optional
from uuid import UUID
from datetime import datetime, timezone

from sqlalchemy import select, desc
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.audit import AuditLog, AuditAction


class AuditService:
    """Service for creating and querying audit logs."""
    
    async def log(
        self,
        db: AsyncSession,
        *,
        actor_id: UUID,
        workspace_id: UUID,
        action: AuditAction,
        resource_type: str,
        resource_id: Optional[UUID] = None,
        target_user_id: Optional[UUID] = None,
        ip_address: Optional[str] = None,
        user_agent: Optional[str] = None,
        extra_data: Optional[dict] = None,
    ) -> AuditLog:
        """Create an audit log entry.
        
        Args:
            db: Database session
            actor_id: ID of user performing the action
            workspace_id: ID of the workspace context
            action: The action being performed
            resource_type: Type of resource affected (e.g., "workspace", "member", "invite")
            resource_id: ID of the affected resource
            target_user_id: ID of the target user (for member operations)
            ip_address: Client IP address
            user_agent: Client user agent string
            extra_data: Additional context as JSON
            
        Returns:
            The created AuditLog entry
        """
        audit_log = AuditLog(
            actor_id=actor_id,
            workspace_id=workspace_id,
            action=action,
            resource_type=resource_type,
            resource_id=resource_id,
            target_user_id=target_user_id,
            ip_address=ip_address,
            user_agent=user_agent,
            extra_data=extra_data,
        )
        db.add(audit_log)
        await db.flush()  # Flush to get ID without committing
        return audit_log
    
    async def list_by_workspace(
        self,
        db: AsyncSession,
        workspace_id: UUID,
        *,
        skip: int = 0,
        limit: int = 50,
        action_filter: Optional[AuditAction] = None,
        actor_id: Optional[UUID] = None,
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None,
    ) -> list[AuditLog]:
        """List audit logs for a workspace with optional filters.
        
        Args:
            db: Database session
            workspace_id: ID of the workspace
            skip: Offset for pagination
            limit: Max number of results
            action_filter: Filter by specific action
            actor_id: Filter by actor
            start_date: Filter logs after this date
            end_date: Filter logs before this date
            
        Returns:
            List of audit log entries, ordered by most recent first
        """
        query = select(AuditLog).where(AuditLog.workspace_id == workspace_id)
        
        if action_filter:
            query = query.where(AuditLog.action == action_filter)
        if actor_id:
            query = query.where(AuditLog.actor_id == actor_id)
        if start_date:
            query = query.where(AuditLog.created_at >= start_date)
        if end_date:
            query = query.where(AuditLog.created_at <= end_date)
        
        query = query.order_by(desc(AuditLog.created_at)).offset(skip).limit(limit)
        
        result = await db.execute(query)
        return list(result.scalars().all())
    
    async def get_by_id(
        self,
        db: AsyncSession,
        audit_log_id: UUID,
    ) -> Optional[AuditLog]:
        """Get a specific audit log entry by ID."""
        result = await db.execute(
            select(AuditLog).where(AuditLog.id == audit_log_id)
        )
        return result.scalar_one_or_none()


# Singleton instance
audit_service = AuditService()
