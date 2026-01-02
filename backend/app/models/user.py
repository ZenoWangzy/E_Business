"""
[IDENTITY]: User & Workspace Domain Models
Core IAM (Identity & Access Management) and Tenancy models.
Includes User, Workspace, Memberships, Invites, and Subscription data.

[INPUT]:
- SQLAlchemy Models representing 'users', 'workspaces', 'workspace_members', 'workspace_invites', 'workspace_billing'.

[LINK]:
- Base -> ../db/base.py
- Enums -> Standard Logic (UserRole, InviteStatus, SubscriptionTier)

[OUTPUT]: ORM Entities (User, Workspace, etc.)
[POS]: /backend/app/models/user.py

[PROTOCOL]:
1. User-Workspace relationship is Many-to-Many via `WorkspaceMember` with 'role'.
2. `WorkspaceBilling` is One-to-One with Workspace.
3. Be careful with circular imports; this file is the root of most relationships.
"""
import uuid
from datetime import datetime, timedelta, timezone
from typing import Optional
from sqlalchemy import String, DateTime, ForeignKey, Enum as SQLEnum, Boolean, Integer, Text, UniqueConstraint, Index
from sqlalchemy.dialects.postgresql import JSON
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.dialects.postgresql import UUID
import enum

from app.db.base import Base


class UserRole(str, enum.Enum):
    """User roles within a workspace with hierarchical permissions.
    
    Hierarchy: OWNER > ADMIN > MEMBER > VIEWER
    """
    OWNER = "owner"      # Full control: add/remove members, change roles, delete workspace
    ADMIN = "admin"      # Manage members and settings (cannot delete workspace or remove Owner)
    MEMBER = "member"    # Read/write access to workspace content
    VIEWER = "viewer"    # Read-only access


class InviteStatus(str, enum.Enum):
    """Status of workspace invitation."""
    PENDING = "pending"
    ACCEPTED = "accepted"
    EXPIRED = "expired"
    CANCELLED = "cancelled"


class SubscriptionTier(str, enum.Enum):
    """Subscription tiers for billing and quota management.
    
    Tiers:
    - FREE: 1 Workspace, 50 Credits/Month, Standard Speed
    - PRO: 5 Workspaces, 1000 Credits/Month, Fast Speed  
    - ENTERPRISE: Unlimited Workspaces, Custom Credits, Priority Speed
    """
    FREE = "free"
    PRO = "pro"
    ENTERPRISE = "enterprise"


class User(Base):
    """User model for authentication and profile."""
    __tablename__ = "users"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True, nullable=False)
    hashed_password: Mapped[str] = mapped_column(String(255), nullable=True)  # Nullable for OAuth
    name: Mapped[str] = mapped_column(String(100), nullable=True)
    is_active: Mapped[bool] = mapped_column(default=True)
    is_superuser: Mapped[bool] = mapped_column(default=False, index=True)  # System-level admin access
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc)
    )

    # Relationships
    workspaces: Mapped[list["WorkspaceMember"]] = relationship(
        back_populates="user", cascade="all, delete-orphan"
    )
    image_generation_jobs: Mapped[list["ImageGenerationJob"]] = relationship(
        back_populates="user", cascade="all, delete-orphan"
    )
    copy_generation_jobs: Mapped[list["CopyGenerationJob"]] = relationship(
        back_populates="user", cascade="all, delete-orphan"
    )
    video_projects: Mapped[list["VideoProject"]] = relationship(
        back_populates="user", cascade="all, delete-orphan"
    )
    video_generation_jobs: Mapped[list["VideoGenerationJob"]] = relationship(
        back_populates="user", cascade="all, delete-orphan"
    )
    videos: Mapped[list["Video"]] = relationship(
        back_populates="user", cascade="all, delete-orphan"
    )


class Workspace(Base):
    """Workspace model for multi-tenancy.
    
    Supports role-based access control with configurable member limits.
    """
    __tablename__ = "workspaces"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )
    name: Mapped[str] = mapped_column(String(50), nullable=False)  # 3-50 characters
    slug: Mapped[str] = mapped_column(String(100), unique=True, index=True, nullable=False)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)  # Max 500 characters
    max_members: Mapped[int] = mapped_column(Integer, default=100)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc)
    )

    # Relationships
    members: Mapped[list["WorkspaceMember"]] = relationship(
        back_populates="workspace", cascade="all, delete-orphan"
    )
    invites: Mapped[list["WorkspaceInvite"]] = relationship(
        back_populates="workspace", cascade="all, delete-orphan"
    )
    assets: Mapped[list["Asset"]] = relationship(
        back_populates="workspace", cascade="all, delete-orphan"
    )
    products: Mapped[list["Product"]] = relationship(
        back_populates="workspace", cascade="all, delete-orphan"
    )
    image_generation_jobs: Mapped[list["ImageGenerationJob"]] = relationship(
        back_populates="workspace", cascade="all, delete-orphan"
    )
    copy_generation_jobs: Mapped[list["CopyGenerationJob"]] = relationship(
        back_populates="workspace", cascade="all, delete-orphan"
    )
    video_projects: Mapped[list["VideoProject"]] = relationship(
        back_populates="workspace", cascade="all, delete-orphan"
    )
    video_generation_jobs: Mapped[list["VideoGenerationJob"]] = relationship(
        back_populates="workspace", cascade="all, delete-orphan"
    )
    videos: Mapped[list["Video"]] = relationship(
        back_populates="workspace", cascade="all, delete-orphan"
    )
    video_audio_tracks: Mapped[list["VideoAudioTrack"]] = relationship(
        back_populates="workspace", cascade="all, delete-orphan"
    )
    copy_results: Mapped[list["CopyResult"]] = relationship(
        back_populates="workspace", cascade="all, delete-orphan"
    )
    copy_quota: Mapped[Optional["CopyQuota"]] = relationship(
        back_populates="workspace", uselist=False
    )
    billing: Mapped[Optional["WorkspaceBilling"]] = relationship(
        back_populates="workspace", uselist=False
    )


class WorkspaceMember(Base):
    """Association table for User-Workspace many-to-many with role."""
    __tablename__ = "workspace_members"
    __table_args__ = (
        UniqueConstraint('user_id', 'workspace_id', name='uq_workspace_member'),
        Index('ix_workspace_members_workspace', 'workspace_id'),
        Index('ix_workspace_members_user', 'user_id'),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False
    )
    workspace_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("workspaces.id", ondelete="CASCADE"), nullable=False
    )
    role: Mapped[UserRole] = mapped_column(SQLEnum(UserRole), default=UserRole.MEMBER)
    joined_at: Mapped[datetime] = mapped_column(DateTime, default=lambda: datetime.now(timezone.utc))

    # Relationships
    user: Mapped["User"] = relationship(back_populates="workspaces")
    workspace: Mapped["Workspace"] = relationship(back_populates="members")


def _default_invite_expires() -> datetime:
    """Generate default expiration time (24 hours from now)."""
    return datetime.now(timezone.utc) + timedelta(hours=24)


class WorkspaceInvite(Base):
    """Workspace invitation model for secure member onboarding.
    
    Features:
    - UUID-based one-time use tokens
    - 24-hour expiration (configurable)
    - Role assignment for invitees
    - Status tracking
    """
    __tablename__ = "workspace_invites"
    __table_args__ = (
        Index('ix_workspace_invites_workspace', 'workspace_id'),
        Index('ix_workspace_invites_token', 'token'),
        Index('ix_workspace_invites_status', 'status'),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )
    workspace_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("workspaces.id", ondelete="CASCADE"), nullable=False
    )
    invited_email: Mapped[str] = mapped_column(String(255), nullable=False)
    role: Mapped[UserRole] = mapped_column(SQLEnum(UserRole), default=UserRole.MEMBER)
    token: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), unique=True, default=uuid.uuid4, index=True
    )
    expires_at: Mapped[datetime] = mapped_column(DateTime, default=_default_invite_expires)
    status: Mapped[InviteStatus] = mapped_column(
        SQLEnum(InviteStatus), default=InviteStatus.PENDING
    )
    inviter_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )
    created_at: Mapped[datetime] = mapped_column(DateTime, default=lambda: datetime.now(timezone.utc))
    accepted_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)

    # Relationships
    workspace: Mapped["Workspace"] = relationship(back_populates="invites")
    inviter: Mapped[Optional["User"]] = relationship(foreign_keys=[inviter_id])

    @property
    def is_valid(self) -> bool:
        """Check if invitation is still valid (pending and not expired)."""
        return (
            self.status == InviteStatus.PENDING
            and datetime.now(timezone.utc) < self.expires_at.replace(tzinfo=timezone.utc)
        )

    @property
    def is_expired(self) -> bool:
        """Check if invitation has expired."""
        return datetime.now(timezone.utc) >= self.expires_at.replace(tzinfo=timezone.utc)


def _default_billing_reset_date() -> datetime:
    """Generate default reset date (first day of next month)."""
    now = datetime.now(timezone.utc)
    if now.month == 12:
        return datetime(now.year + 1, 1, 1, tzinfo=timezone.utc)
    return datetime(now.year, now.month + 1, 1, tzinfo=timezone.utc)


class WorkspaceBilling(Base):
    """Workspace billing model for subscription management.
    
    Tracks subscription tier, credit usage, and monthly quota resets.
    Uses Redis caching for high-performance credit checks.
    """
    __tablename__ = "workspace_billing"
    __table_args__ = (
        Index('idx_workspace_billing_workspace', 'workspace_id'),
        Index('idx_workspace_billing_reset', 'reset_date'),
        Index('idx_workspace_billing_active_tier', 'is_active', 'tier'),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )
    workspace_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("workspaces.id", ondelete="CASCADE"), nullable=False, unique=True
    )
    tier: Mapped[str] = mapped_column(
        String(20), nullable=False, default=SubscriptionTier.FREE.value
    )
    credits_remaining: Mapped[int] = mapped_column(Integer, nullable=False, default=50)
    credits_limit: Mapped[int] = mapped_column(Integer, nullable=False, default=50)
    reset_date: Mapped[datetime] = mapped_column(DateTime, nullable=False, default=_default_billing_reset_date)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    features: Mapped[Optional[dict]] = mapped_column(JSON, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc)
    )

    # Relationships
    workspace: Mapped["Workspace"] = relationship(back_populates="billing")
