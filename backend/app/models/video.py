"""
Video Generation Models - SQLAlchemy models for video script and storyboard generation.
Story 4.2: Script & Storyboard AI Service
"""

import uuid
from datetime import datetime, timezone
from enum import Enum as PyEnum
from typing import TYPE_CHECKING, Optional, List, Dict

from sqlalchemy import String, DateTime, ForeignKey, Enum, Integer, Float, Text, JSON
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.dialects.postgresql import UUID

from app.db.base import Base
from app.models.image import JobStatus


if TYPE_CHECKING:
    from app.models.user import User, Workspace
    from app.models.product import Product


class VideoMode(str, PyEnum):
    """Video generation modes."""
    CREATIVE_AD = "creative_ad"
    FUNCTIONAL_INTRO = "functional_intro"


class VideoProjectStatus(str, PyEnum):
    """Video project status."""
    PENDING = "pending"
    PROCESSING = "processing"
    SCRIPT_READY = "script_ready"
    COMPLETED = "completed"
    FAILED = "failed"


class VideoStatus(str, PyEnum):
    """Video rendering status (Story 4.4)."""
    PENDING = "pending"
    PROCESSING = "processing"
    COMPLETED = "completed"
    FAILED = "failed"


class VideoQuality(str, PyEnum):
    """Video quality presets (Story 4.4)."""
    HD_720 = "720p"
    HD_1080 = "1080p"
    UHD_4K = "4K"



class VideoProject(Base):
    """
    Video project model for storing video generation context and results.

    Each project belongs to a workspace (multi-tenant isolation)
    and is linked to a product and user.
    """
    __tablename__ = "video_projects"

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
        nullable=False,
        index=True
    )
    product_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("products.id", ondelete="CASCADE"),
        nullable=False,
        index=True
    )

    # Video configuration
    mode: Mapped[VideoMode] = mapped_column(
        Enum(VideoMode),
        nullable=False
    )
    target_duration: Mapped[int] = mapped_column(
        Integer,
        nullable=False  # 15 or 30 seconds
    )

    # Generated content storage
    script: Mapped[Optional[List[Dict]]] = mapped_column(
        JSON,
        nullable=True
    )
    storyboard: Mapped[Optional[List[Dict]]] = mapped_column(
        JSON,
        nullable=True
    )

    # Status tracking
    status: Mapped[VideoProjectStatus] = mapped_column(
        Enum(VideoProjectStatus),
        default=VideoProjectStatus.PENDING,
        nullable=False,
        index=True
    )

    # Generation metadata
    model_used: Mapped[Optional[str]] = mapped_column(
        String(100),
        nullable=True
    )
    token_usage: Mapped[Optional[Dict]] = mapped_column(
        JSON,
        nullable=True
    )

    # Error handling
    error_message: Mapped[Optional[str]] = mapped_column(
        Text,
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
    workspace: Mapped["Workspace"] = relationship(back_populates="video_projects")
    user: Mapped["User"] = relationship(back_populates="video_projects")
    product: Mapped["Product"] = relationship(back_populates="video_projects")
    generation_jobs: Mapped[List["VideoGenerationJob"]] = relationship(
        back_populates="video_project",
        cascade="all, delete-orphan"
    )
    videos: Mapped[List["Video"]] = relationship(
        back_populates="video_project",
        cascade="all, delete-orphan"
    )

    def __repr__(self) -> str:
        return f"<VideoProject {self.id} ({self.mode.value}, {self.status.value})>"


class VideoGenerationJob(Base):
    """
    Video generation job model for tracking async video generation tasks.

    Each job belongs to a workspace (multi-tenant isolation)
    and is linked to a video project and user.
    """
    __tablename__ = "video_generation_jobs"

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
        nullable=False,
        index=True
    )
    video_project_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("video_projects.id", ondelete="CASCADE"),
        nullable=False,
        index=True
    )
    task_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        unique=True,
        nullable=False,
        index=True
    )

    # Job tracking (reusing JobStatus from image models)
    status: Mapped[JobStatus] = mapped_column(
        Enum(JobStatus),
        default=JobStatus.PENDING,
        nullable=False,
        index=True
    )
    progress: Mapped[int] = mapped_column(
        Integer,
        default=0
    )
    error_message: Mapped[Optional[str]] = mapped_column(
        Text,
        nullable=True
    )

    # Generation configuration
    generation_config: Mapped[Dict] = mapped_column(
        JSON,
        nullable=False
    )

    # Raw results from AI service
    raw_results: Mapped[Optional[List[Dict]]] = mapped_column(
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
    workspace: Mapped["Workspace"] = relationship(back_populates="video_generation_jobs")
    user: Mapped["User"] = relationship(back_populates="video_generation_jobs")
    video_project: Mapped["VideoProject"] = relationship(back_populates="generation_jobs")

    def __repr__(self) -> str:
        return f"<VideoGenerationJob {self.task_id} ({self.status.value})>"


class Video(Base):
    """
    Video model for storing rendered video files (Story 4.4).

    Represents the final rendered MP4 with URL, duration, and file info.
    Each video belongs to a workspace and is linked to a video project.
    """
    __tablename__ = "videos"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )
    project_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("video_projects.id", ondelete="CASCADE"),
        nullable=False,
        index=True
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
        nullable=False,
        index=True
    )

    # Video metadata
    title: Mapped[str] = mapped_column(
        String(255),
        nullable=False
    )
    status: Mapped[VideoStatus] = mapped_column(
        Enum(VideoStatus),
        default=VideoStatus.PENDING,
        nullable=False,
        index=True
    )
    video_url: Mapped[Optional[str]] = mapped_column(
        Text,
        nullable=True  # MinIO URL
    )
    duration: Mapped[Optional[float]] = mapped_column(
        Float,  # Duration in seconds
        nullable=True
    )
    file_size: Mapped[Optional[int]] = mapped_column(
        Integer,  # File size in bytes
        nullable=True
    )
    quality: Mapped[VideoQuality] = mapped_column(
        Enum(VideoQuality),
        default=VideoQuality.HD_1080,
        nullable=False
    )

    # Task tracking
    task_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True),
        nullable=True,
        index=True  # Celery task ID
    )
    progress: Mapped[int] = mapped_column(
        Integer,
        default=0  # 0-100
    )
    error_message: Mapped[Optional[str]] = mapped_column(
        Text,
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

    # Relationships
    workspace: Mapped["Workspace"] = relationship(back_populates="videos")
    user: Mapped["User"] = relationship(back_populates="videos")
    video_project: Mapped["VideoProject"] = relationship(back_populates="videos")
    audio_tracks: Mapped[List["VideoAudioTrack"]] = relationship(
        back_populates="video",
        cascade="all, delete-orphan"
    )

    def __repr__(self) -> str:
        return f"<Video {self.id} ({self.status.value})>"


class VideoAudioTrack(Base):
    """
    Video audio track model for TTS regeneration (Story 4.4).

    Stores different versions of audio tracks for the same video.
    Allows users to regenerate voiceover without re-rendering visuals.
    """
    __tablename__ = "video_audio_tracks"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )
    video_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("videos.id", ondelete="CASCADE"),
        nullable=False,
        index=True
    )
    workspace_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("workspaces.id", ondelete="CASCADE"),
        nullable=False,
        index=True
    )

    # Audio configuration
    voice_id: Mapped[str] = mapped_column(
        String(100),
        nullable=False  # e.g., "nova", "alloy", "echo"
    )
    speed: Mapped[float] = mapped_column(
        Float,  # Speed multiplier (0.5 - 2.0)
        default=1.0,
        nullable=False
    )
    volume: Mapped[Optional[float]] = mapped_column(
        Float,  # Volume level (0.0 - 1.0)
        default=1.0,
        nullable=True
    )

    # Audio file info
    audio_url: Mapped[Optional[str]] = mapped_column(
        Text,
        nullable=True  # MinIO URL for audio file
    )
    duration: Mapped[Optional[float]] = mapped_column(
        Float,  # Duration in seconds
        nullable=True
    )
    file_size: Mapped[Optional[int]] = mapped_column(
        Integer,  # File size in bytes
        nullable=True
    )

    # Generation metadata
    provider: Mapped[str] = mapped_column(
        String(50),
        default="openai",  # "openai", "edge-tts", etc.
        nullable=False
    )
    cost: Mapped[Optional[float]] = mapped_column(
        Float,  # API cost in USD (not cents, as Float supports decimals)
        nullable=True
    )

    # Timestamps
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc)
    )

    # Relationships
    workspace: Mapped["Workspace"] = relationship(back_populates="video_audio_tracks")
    video: Mapped["Video"] = relationship(back_populates="audio_tracks")

    def __repr__(self) -> str:
        return f"<VideoAudioTrack {self.id} (voice={self.voice_id})>"