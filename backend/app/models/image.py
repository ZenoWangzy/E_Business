"""
Image Generation Model - SQLAlchemy model for image generation jobs.
Story 2.1: Style Selection & Generation Trigger
Story 2.4: Reference Image Attachment
"""

import uuid
from datetime import datetime, timezone
from enum import Enum as PyEnum
from typing import TYPE_CHECKING, Optional, List

from sqlalchemy import String, DateTime, ForeignKey, Enum, Integer, Text, JSON
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.dialects.postgresql import UUID

from app.db.base import Base


if TYPE_CHECKING:
    from app.models.user import User, Workspace
    from app.models.product import Product
    from app.models.asset import Asset


class StyleType(str, PyEnum):
    """Visual style types for image generation."""
    MODERN = "modern"
    LUXURY = "luxury"
    FRESH = "fresh"
    TECH = "tech"
    WARM = "warm"
    BUSINESS = "business"


class JobStatus(str, PyEnum):
    """Image generation job status."""
    PENDING = "pending"
    PROCESSING = "processing"
    COMPLETED = "completed"
    FAILED = "failed"


class ImageGenerationJob(Base):
    """
    Image generation job model for tracking AI generation tasks.
    
    Each job belongs to a workspace (multi-tenant isolation)
    and is linked to a product and user.
    """
    __tablename__ = "image_generation_jobs"

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
    # Story 2.4: Reference image attachment
    reference_image_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("assets.id", ondelete="SET NULL"),
        nullable=True,
        index=True
    )
    task_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        unique=True,
        nullable=False,
        index=True
    )
    style_id: Mapped[str] = mapped_column(
        String(20),
        nullable=False
    )
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
    result_urls: Mapped[Optional[List[str]]] = mapped_column(
        JSON,
        nullable=True
    )
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
    workspace: Mapped["Workspace"] = relationship(back_populates="image_generation_jobs")
    user: Mapped["User"] = relationship(back_populates="image_generation_jobs")
    product: Mapped["Product"] = relationship(back_populates="image_generation_jobs")
    # Story 2.4: Reference image relationship
    reference_image: Mapped[Optional["Asset"]] = relationship(
        foreign_keys=[reference_image_id],
        post_update=True
    )

    def __repr__(self) -> str:
        return f"<ImageGenerationJob {self.task_id} ({self.status.value})>"


class Image(Base):
    """
    Image model for storing generated image results.

    Each image is linked to a generation job and belongs to a workspace.
    """
    __tablename__ = "images"

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
    generation_job_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("image_generation_jobs.id", ondelete="CASCADE"),
        nullable=False,
        index=True
    )
    filename: Mapped[str] = mapped_column(
        String(255),
        nullable=False
    )
    original_url: Mapped[Optional[str]] = mapped_column(
        String(1024),
        nullable=True
    )
    processed_url: Mapped[Optional[str]] = mapped_column(
        String(1024),
        nullable=True
    )
    thumbnail_url: Mapped[Optional[str]] = mapped_column(
        String(1024),
        nullable=True
    )
    file_size: Mapped[Optional[int]] = mapped_column(
        Integer,
        nullable=True
    )
    width: Mapped[Optional[int]] = mapped_column(
        Integer,
        nullable=True
    )
    height: Mapped[Optional[int]] = mapped_column(
        Integer,
        nullable=True
    )
    format: Mapped[Optional[str]] = mapped_column(
        String(10),
        nullable=True
    )
    image_metadata: Mapped[Optional[dict]] = mapped_column(
        JSON,
        nullable=True
    )
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
    generation_job: Mapped["ImageGenerationJob"] = relationship(backref="images")
    workspace: Mapped["Workspace"] = relationship(backref="images")

    def __repr__(self) -> str:
        return f"<Image {self.filename} (Job: {self.generation_job_id})>"
