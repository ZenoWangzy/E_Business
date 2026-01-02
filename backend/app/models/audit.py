"""
[IDENTITY]: Audit Log Model
Records sensitive operations (Security, Member Management) for compliance.

[INPUT]:
- SQLAlchemy Model representing 'audit_logs' table.

[LINK]:
- Base -> ../db/base.py
- User -> ./user.py

[OUTPUT]: AuditLog Entity
[POS]: /backend/app/models/audit.py

[PROTOCOL]:
1. Indices on `workspace_id` and `created_at` are critical for history queries.
2. `extra_data` (JSONB) should store context specific to the Action.
"""
import uuid
from datetime import datetime, timezone
from typing import Optional
import enum

from sqlalchemy import String, DateTime, ForeignKey, Enum as SQLEnum, Text, Index
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.dialects.postgresql import UUID, JSONB

from app.db.base import Base


class AuditAction(str, enum.Enum):
    """Enumeration of auditable actions."""
    # Workspace operations
    WORKSPACE_CREATED = "workspace.created"
    WORKSPACE_UPDATED = "workspace.updated"
    WORKSPACE_DELETED = "workspace.deleted"
    
    # Member operations
    MEMBER_ADDED = "member.added"
    MEMBER_REMOVED = "member.removed"
    MEMBER_ROLE_CHANGED = "member.role_changed"
    
    # Invite operations
    INVITE_CREATED = "invite.created"
    INVITE_ACCEPTED = "invite.accepted"
    INVITE_CANCELLED = "invite.cancelled"
    
    # User management operations (Story 5.4)
    USER_DEACTIVATED = "user.deactivated"
    USER_REACTIVATED = "user.reactivated"
    USER_PROMOTED_SUPERUSER = "user.promoted_superuser"
    USER_DEMOTED_SUPERUSER = "user.demoted_superuser"
    
    # Task operations (Story 5.4)
    TASK_RETRIED = "task.retried"


class AuditLog(Base):
    """Audit log for tracking sensitive workspace operations.
    
    Records:
    - actor_id: The user who performed the action
    - target_user_id: The affected user (if applicable)
    - action: The type of action performed
    - resource_type: The type of resource affected
    - resource_id: The ID of the affected resource
    - workspace_id: The workspace context
    - ip_address: The IP address of the request
    - metadata: Additional JSON metadata about the action
    """
    __tablename__ = "audit_logs"
    __table_args__ = (
        Index('ix_audit_logs_workspace', 'workspace_id'),
        Index('ix_audit_logs_actor', 'actor_id'),
        Index('ix_audit_logs_action', 'action'),
        Index('ix_audit_logs_created', 'created_at'),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )
    
    # Who performed the action
    actor_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), 
        ForeignKey("users.id", ondelete="SET NULL"), 
        nullable=True
    )
    
    # The workspace context
    workspace_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), 
        ForeignKey("workspaces.id", ondelete="CASCADE"), 
        nullable=False
    )
    
    # Action details
    action: Mapped[AuditAction] = mapped_column(
        SQLEnum(
            AuditAction, 
            values_callable=lambda x: [e.value for e in x],
            name='auditaction',
            create_type=False  # Don't create type since it already exists
        ), 
        nullable=False
    )
    
    # Resource affected
    resource_type: Mapped[str] = mapped_column(String(50), nullable=False)  # e.g., "workspace", "member", "invite"
    resource_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), nullable=True)
    
    # Target user (for member operations)
    target_user_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True), 
        ForeignKey("users.id", ondelete="SET NULL"), 
        nullable=True
    )
    
    # Request metadata
    ip_address: Mapped[Optional[str]] = mapped_column(String(45), nullable=True)  # IPv6 max length
    user_agent: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    
    # Additional context (renamed from 'metadata' to avoid SQLAlchemy reserved name)
    extra_data: Mapped[Optional[dict]] = mapped_column(JSONB, nullable=True)
    
    # Timestamps (use naive UTC datetime to match database column type)
    created_at: Mapped[datetime] = mapped_column(
        DateTime, 
        default=lambda: datetime.utcnow(),
        nullable=False
    )

    # Relationships (optional, for convenience)
    actor: Mapped[Optional["User"]] = relationship(foreign_keys=[actor_id])
    target_user: Mapped[Optional["User"]] = relationship(foreign_keys=[target_user_id])


# Avoid circular import
from typing import TYPE_CHECKING
if TYPE_CHECKING:
    from app.models.user import User
