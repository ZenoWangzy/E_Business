"""
Copy Generation Models - SQLAlchemy models for AI copywriting generation.
Story 3.1: AI Copywriting Studio Backend
"""

import uuid
from datetime import datetime, timezone
from enum import Enum as PyEnum
from typing import TYPE_CHECKING, Optional, List, Dict

from sqlalchemy import String, DateTime, ForeignKey, Enum, Integer, Text, JSON, Boolean
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.dialects.postgresql import UUID

from app.db.base import Base

if TYPE_CHECKING:
    from app.models.user import User, Workspace
    from app.models.product import Product


class CopyType(str, PyEnum):
    """文案类型枚举 - Copy type categories."""
    TITLES = "titles"           # 标题
    SELLING_POINTS = "selling_points"  # 卖点
    FAQ = "faq"               # 常见问题
    DESCRIPTIONS = "descriptions"      # 描述


class Tone(str, PyEnum):
    """语气风格枚举 - Tone style options."""
    PROFESSIONAL = "professional"
    CASUAL = "casual"
    PLAYFUL = "playful"
    LUXURY = "luxury"


class Audience(str, PyEnum):
    """目标受众枚举 - Target audience types."""
    B2B = "b2b"
    B2C = "b2c"
    TECHNICAL = "technical"


class Length(str, PyEnum):
    """文案长度枚举 - Content length options."""
    SHORT = "short"
    MEDIUM = "medium"
    LONG = "long"


class JobStatus(str, PyEnum):
    """生成任务状态枚举 - Job status for copy generation."""
    PENDING = "pending"
    PROCESSING = "processing"
    COMPLETED = "completed"
    FAILED = "failed"


class CopyGenerationJob(Base):
    """
    Copy generation job model for tracking AI copywriting tasks.

    Each job belongs to a workspace (multi-tenant isolation)
    and is linked to a product and user.
    """
    __tablename__ = "copy_generation_jobs"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )
    workspace_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("workspaces.id", ondelete="CASCADE"),
        nullable=False,
        index=True
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False
    )
    product_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("products.id", ondelete="CASCADE"),
        nullable=False
    )
    task_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        unique=True,
        nullable=False,
        index=True
    )

    # Generation parameters
    copy_type: Mapped[CopyType] = mapped_column(
        Enum(CopyType),
        nullable=False
    )
    tone: Mapped[Tone] = mapped_column(
        Enum(Tone),
        nullable=False
    )
    audience: Mapped[Audience] = mapped_column(
        Enum(Audience),
        nullable=False
    )
    length: Mapped[Length] = mapped_column(
        Enum(Length),
        nullable=False
    )

    # Additional context as JSON
    context: Mapped[Optional[Dict]] = mapped_column(
        JSON,
        nullable=True
    )

    # Status tracking
    status: Mapped[JobStatus] = mapped_column(
        Enum(JobStatus),
        default=JobStatus.PENDING,
        nullable=False
    )
    progress: Mapped[int] = mapped_column(
        Integer,
        default=0
    )
    error_message: Mapped[Optional[str]] = mapped_column(
        Text,
        nullable=True
    )

    # AI generation results (temporary storage)
    raw_results: Mapped[Optional[List[str]]] = mapped_column(
        JSON,
        nullable=True
    )

    # Timestamps
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc)
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc)
    )
    started_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True),
        nullable=True
    )
    completed_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True),
        nullable=True
    )

    # Relationships
    workspace: Mapped["Workspace"] = relationship(back_populates="copy_generation_jobs")
    user: Mapped["User"] = relationship(back_populates="copy_generation_jobs")
    product: Mapped["Product"] = relationship(back_populates="copy_generation_jobs")
    copy_results: Mapped[List["CopyResult"]] = relationship(
        back_populates="generation_job",
        cascade="all, delete-orphan"
    )

    def __repr__(self) -> str:
        return f"<CopyGenerationJob {self.task_id} ({self.status.value})>"


class CopyResult(Base):
    """
    Copy result model for storing generated copy content.

    Each result is linked to a generation job and belongs to a workspace.
    Users can save, favorite, and manage individual results.
    """
    __tablename__ = "copy_results"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )
    workspace_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("workspaces.id", ondelete="CASCADE"),
        nullable=False,
        index=True
    )
    generation_job_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("copy_generation_jobs.id", ondelete="SET NULL"),
        nullable=True,  # Allow NULL for manually saved results
        index=True
    )
    product_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("products.id", ondelete="CASCADE"),
        nullable=False,
        index=True
    )

    # Content
    content: Mapped[str] = mapped_column(
        Text,
        nullable=False
    )

    # Metadata
    copy_type: Mapped[CopyType] = mapped_column(
        Enum(CopyType),
        nullable=False
    )
    generation_config: Mapped[Dict] = mapped_column(
        JSON,
        nullable=False  # Stores tone, audience, length
    )

    # User interaction
    is_favorite: Mapped[bool] = mapped_column(
        Boolean,
        default=False,
        nullable=False
    )

    # Timestamps
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc)
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc)
    )

    # Relationships
    generation_job: Mapped["CopyGenerationJob"] = relationship(back_populates="copy_results")
    workspace: Mapped["Workspace"] = relationship(back_populates="copy_results")
    product: Mapped["Product"] = relationship(back_populates="copy_results")

    def __repr__(self) -> str:
        return f"<CopyResult {self.id[:8]}... ({self.copy_type.value})>"


class CopyQuota(Base):
    """
    Copy generation quota tracking per workspace.

    Implements usage limits for free/paid tiers.
    """
    __tablename__ = "copy_quotas"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )
    workspace_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("workspaces.id", ondelete="CASCADE"),
        nullable=False,
        unique=True,
        index=True
    )

    # Quota limits
    monthly_limit: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
        default=100  # Default free tier limit
    )

    # Usage tracking
    used_current_month: Mapped[int] = mapped_column(
        Integer,
        default=0
    )

    # Reset tracking
    last_reset_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc)
    )

    # Timestamps
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc)
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc)
    )

    # Relationships
    workspace: Mapped["Workspace"] = relationship(back_populates="copy_quota")

    @property
    def remaining(self) -> int:
        """Calculate remaining quota for current month."""
        return max(0, self.monthly_limit - self.used_current_month)

    @property
    def is_reset_needed(self) -> bool:
        """Check if quota needs to be reset (new month)."""
        now = datetime.now(timezone.utc)
        return (now.year > self.last_reset_at.year or
                now.month > self.last_reset_at.month)

    def __repr__(self) -> str:
        return f"<CopyQuota {self.used_current_month}/{self.monthly_limit}>"