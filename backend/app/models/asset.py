"""
Asset Model - File Storage Metadata
Stores metadata for uploaded files in workspaces (AC: 154-159)
"""

import uuid
from datetime import datetime, timezone
from typing import Optional
from sqlalchemy import String, Integer, DateTime, ForeignKey, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.dialects.postgresql import UUID

from app.db.base import Base


class Asset(Base):
    """
    Asset model for storing file metadata
    Each asset belongs to a workspace for multi-tenant isolation (AC: 26-30)
    """
    __tablename__ = "assets"

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
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    mime_type: Mapped[str] = mapped_column(String(100), nullable=False)
    size: Mapped[int] = mapped_column(Integer, nullable=False)  # bytes
    content: Mapped[Optional[str]] = mapped_column(Text, nullable=True)  # extracted text
    preview: Mapped[Optional[str]] = mapped_column(Text, nullable=True)  # preview text
    created_at: Mapped[datetime] = mapped_column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, 
        default=lambda: datetime.now(timezone.utc), 
        onupdate=lambda: datetime.now(timezone.utc)
    )
    
    # Relationship
    workspace: Mapped["Workspace"] = relationship(back_populates="assets")

    def __repr__(self):
        return f"<Asset {self.name} in workspace {self.workspace_id}>"
