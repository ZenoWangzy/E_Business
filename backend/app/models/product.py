"""
Product Model - Core Business Entity for Product Management
Stores product metadata with category classification for AI generation context.
"""

import uuid
from datetime import datetime, timezone
from enum import Enum as PyEnum
from typing import TYPE_CHECKING

from sqlalchemy import String, DateTime, ForeignKey, Enum
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.dialects.postgresql import UUID

from app.db.base import Base

if TYPE_CHECKING:
    from app.models.user import Workspace
    from app.models.asset import Asset
    from app.models.image_generation_job import ImageGenerationJob


class ProductCategory(str, PyEnum):
    """产品分类枚举 - Product category enum for AI context."""
    CLOTHING = "clothing"
    ELECTRONICS = "electronics"
    BEAUTY = "beauty"
    HOME = "home"
    FOOD = "food"
    SPORTS = "sports"
    TOYS = "toys"
    BOOKS = "books"
    AUTOMOTIVE = "automotive"
    HEALTH = "health"
    OTHER = "other"


class ProductStatus(str, PyEnum):
    """产品状态枚举 - Product lifecycle status."""
    DRAFT = "draft"
    READY = "ready"
    PROCESSING = "processing"
    COMPLETED = "completed"
    ARCHIVED = "archived"


class Product(Base):
    """
    Product model for categorized content generation.
    
    Each product belongs to a workspace (multi-tenant isolation)
    and is linked to an original asset (uploaded file).
    """
    __tablename__ = "products"

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
    category: Mapped[ProductCategory] = mapped_column(
        Enum(ProductCategory),
        nullable=False
    )
    original_asset_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("assets.id", ondelete="CASCADE"),
        nullable=False
    )
    status: Mapped[ProductStatus] = mapped_column(
        Enum(ProductStatus),
        default=ProductStatus.DRAFT,
        nullable=False
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime,
        default=lambda: datetime.now(timezone.utc)
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime,
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc)
    )

    # Relationships
    workspace: Mapped["Workspace"] = relationship(back_populates="products")
    original_asset: Mapped["Asset"] = relationship(back_populates="products")
    image_generation_jobs: Mapped[list["ImageGenerationJob"]] = relationship(
        back_populates="product", cascade="all, delete-orphan"
    )
    copy_generation_jobs: Mapped[list["CopyGenerationJob"]] = relationship(
        back_populates="product", cascade="all, delete-orphan"
    )
    copy_results: Mapped[list["CopyResult"]] = relationship(
        backref="product", cascade="all, delete-orphan"
    )

    def __repr__(self) -> str:
        return f"<Product {self.name} ({self.category.value}) in workspace {self.workspace_id}>"
