"""
[IDENTITY]: Asset Model - File Storage Metadata
Stores metadata for uploaded files (Images/Videos) in workspaces.
Serves as the source of truth for file location and integrity.

[INPUT]:
- SQLAlchemy Model representing 'assets' table.

[LINK]:
- Base -> ../db/base.py
- Workspace -> ./user.py
- Product -> ./product.py

[OUTPUT]: Asset Entity
[POS]: /backend/app/models/asset.py

[PROTOCOL]:
1. `storage_path` must match the MinIO key structure: `workspaces/{id}/assets/...`
2. `storage_status` tracks the async upload lifecycle (PENDING -> UPLOADED).
"""

import uuid
import enum
from datetime import datetime, timezone
from typing import Optional, TYPE_CHECKING
from sqlalchemy import String, Integer, DateTime, ForeignKey, Text, Enum
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.dialects.postgresql import UUID

from app.db.base import Base

if TYPE_CHECKING:
    from app.models.workspace import Workspace
    from app.models.product import Product
    from app.models.user import User


class StorageStatus(enum.Enum):
    """Storage status for asset files in MinIO."""
    PENDING_UPLOAD = "pending_upload"
    UPLOADING = "uploading"
    UPLOADED = "uploaded"
    FAILED = "failed"
    DELETED = "deleted"


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
    
    # MinIO storage fields (Story 1.5)
    storage_path: Mapped[Optional[str]] = mapped_column(
        String(512), 
        nullable=True, 
        index=True,
        comment='Full path in MinIO: workspaces/{workspace_id}/assets/{asset_id}/{filename}'
    )
    file_checksum: Mapped[Optional[str]] = mapped_column(
        String(64), 
        nullable=True,
        comment='MD5 checksum for data integrity verification'
    )
    storage_status: Mapped[StorageStatus] = mapped_column(
        Enum(StorageStatus, name='storagestatus', create_type=False),
        nullable=False,
        default=StorageStatus.PENDING_UPLOAD,
        index=True,
        comment='Current storage status in MinIO'
    )
    uploaded_by: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
        comment='User who uploaded the file'
    )
    error_message: Mapped[Optional[str]] = mapped_column(
        Text,
        nullable=True,
        comment='Error details if storage_status is FAILED'
    )
    
    created_at: Mapped[datetime] = mapped_column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, 
        default=lambda: datetime.now(timezone.utc), 
        onupdate=lambda: datetime.now(timezone.utc)
    )
    
    # Relationship
    workspace: Mapped["Workspace"] = relationship(back_populates="assets")
    products: Mapped[list["Product"]] = relationship(back_populates="original_asset")
    uploader: Mapped[Optional["User"]] = relationship("User", foreign_keys=[uploaded_by])

    def __repr__(self):
        return f"<Asset {self.name} in workspace {self.workspace_id}>"

